import { readFile } from "fs/promises";
import {
  createPostgresConnection,
  getPostgresConfig,
} from "../app/utils/db.js";

async function createPostgresVectorTable() {
  let client;
  try {
    console.log("正在连接 PostgreSQL 数据库...");
    const config = getPostgresConfig();
    console.log(
      `连接信息: ${config.host}:${config.port}, 数据库: ${config.database}, 用户: ${config.user}\n`
    );

    client = await createPostgresConnection();

    console.log("✅ PostgreSQL 数据库连接成功！\n");

    // 检查 pgvector 扩展是否可用
    try {
      const extResult = await client.query(
        "SELECT * FROM pg_extension WHERE extname = 'vector'"
      );
      if (extResult.rows.length === 0) {
        console.log("⚠️  pgvector 扩展未安装，正在尝试安装...");
        await client.query("CREATE EXTENSION IF NOT EXISTS vector");
        console.log("✅ pgvector 扩展安装成功！\n");
      } else {
        console.log("✅ pgvector 扩展已安装\n");
      }
    } catch (error: any) {
      console.error("❌ 无法安装 pgvector 扩展:", error.message);
      console.error("   请确保已安装 pgvector 扩展：");
      console.error("   https://github.com/pgvector/pgvector");
      throw error;
    }

    // 读取 SQL 文件
    const sql = await readFile(
      "scripts/create-postgres-vector-table.sql",
      "utf-8"
    );

    // 智能分割 SQL 语句，正确处理函数定义（$$...$$）
    const statements: string[] = [];
    let currentStatement = "";
    let inDollarQuote = false;
    let dollarTag = "";

    // 移除注释行
    const sqlWithoutComments = sql
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");

    const lines = sqlWithoutComments.split("\n");

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const trimmedLine = line.trim();

      // 跳过空行
      if (!trimmedLine) {
        if (currentStatement) {
          currentStatement += "\n";
        }
        continue;
      }

      // 检查美元引号（用于函数体）
      if (!inDollarQuote) {
        // 查找美元引号开始：$tag$ 或 $$
        const dollarStartMatch = trimmedLine.match(/\$(\w*)\$/);
        if (dollarStartMatch) {
          inDollarQuote = true;
          dollarTag = dollarStartMatch[1] || "";
          currentStatement += line + "\n";
          continue;
        }
      } else {
        // 在美元引号块内，查找结束标记
        const dollarEndPattern = dollarTag ? `\\$${dollarTag}\\$` : "\\$\\$";
        const dollarEndMatch = trimmedLine.match(new RegExp(dollarEndPattern));
        if (dollarEndMatch) {
          currentStatement += line;
          inDollarQuote = false;
          dollarTag = "";
          // 如果这行以分号结尾，完成语句
          if (trimmedLine.endsWith(";")) {
            const stmt = currentStatement.trim();
            if (stmt) {
              statements.push(stmt.slice(0, -1)); // 移除末尾分号
            }
            currentStatement = "";
          }
          continue;
        }
      }

      // 如果在美元引号块内，直接添加整行（包括其中的分号）
      if (inDollarQuote) {
        currentStatement += line + "\n";
        continue;
      }

      // 普通 SQL 语句：添加当前行
      currentStatement += line;

      // 如果行以分号结尾，完成一个语句
      if (trimmedLine.endsWith(";")) {
        const stmt = currentStatement.trim();
        if (stmt) {
          statements.push(stmt.slice(0, -1)); // 移除末尾分号
        }
        currentStatement = "";
      } else {
        // 否则添加换行，继续下一行
        currentStatement += "\n";
      }
    }

    // 添加最后一个语句（如果有，且不以分号结尾）
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    // 执行每个 SQL 语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;

      try {
        console.log(`执行语句 ${i + 1}/${statements.length}...`);
        await client.query(statement);
        console.log("✅ 执行成功");
      } catch (error: any) {
        // 忽略已存在的错误（如表已存在、索引已存在等）
        if (
          error.code === "42P07" ||
          error.code === "42710" ||
          error.code === "42723" || // 函数已存在
          error.message.includes("already exists") ||
          error.message.includes("does not exist") // DROP IF EXISTS 时对象不存在
        ) {
          console.log("⚠️  对象已存在或不存在，跳过");
        } else {
          console.error(`❌ SQL 语句执行失败:`);
          console.error(`   语句: ${statement.substring(0, 100)}...`);
          console.error(`   错误: ${error.message}`);
          throw error;
        }
      }
    }

    console.log("\n✅ 表创建成功！\n");

    // 验证表结构
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'tb_hsx_img_value'
    `);

    if (tablesResult.rows.length > 0) {
      console.log("📋 已创建的表：");
      console.log("─".repeat(50));
      console.log(`  ✅ ${tablesResult.rows[0].table_name}`);

      // 显示表结构
      const tableName = tablesResult.rows[0].table_name;
      console.log(`\n📋 表结构: ${tableName}`);
      console.log("─".repeat(50));

      const columnsResult = await client.query(
        `
        SELECT 
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `,
        [tableName]
      );

      console.log("列信息：");
      for (const column of columnsResult.rows) {
        const typeInfo = column.udt_name || column.data_type;
        console.log(
          `  ${column.column_name.padEnd(25)} ${typeInfo.padEnd(
            20
          )} ${column.is_nullable.padEnd(5)} ${column.column_default || "NULL"}`
        );
      }

      // 显示索引信息
      const indexesResult = await client.query(
        `
        SELECT
          i.relname AS index_name,
          am.amname AS index_type
        FROM pg_class t
        JOIN pg_namespace n ON t.relnamespace = n.oid
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_am am ON i.relam = am.oid
        WHERE t.relkind = 'r'
          AND n.nspname = 'public'
          AND t.relname = $1
        ORDER BY i.relname
      `,
        [tableName]
      );

      if (indexesResult.rows.length > 0) {
        console.log("\n索引信息：");
        for (const index of indexesResult.rows) {
          console.log(`  ${index.index_name} (${index.index_type})`);
        }
      }
    }
  } catch (error: any) {
    console.error("❌ 错误:", error);
    if (error.code) {
      console.error(`  错误代码: ${error.code}`);
    }
    if (error.message) {
      console.error(`  错误信息: ${error.message}`);
    }
    if (error.hint) {
      console.error(`  提示: ${error.hint}`);
    }
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

createPostgresVectorTable().catch(console.error);
