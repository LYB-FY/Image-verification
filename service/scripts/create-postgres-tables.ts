import { readFile } from "fs/promises";
import { createPostgresConnection, getPostgresConfig } from "../app/utils/db.js";

async function createPostgresTables() {
  let client;
  try {
    console.log("正在连接 PostgreSQL 数据库...");
    const config = getPostgresConfig();
    console.log(
      `连接信息: ${config.host}:${config.port}, 数据库: ${config.database}, 用户: ${config.user}\n`
    );

    client = await createPostgresConnection();

    console.log("✅ PostgreSQL 数据库连接成功！\n");

    // 读取 SQL 文件
    const sql = await readFile("scripts/create-postgres-tables.sql", "utf-8");

    // 执行 SQL（按分号分割，但保留函数定义）
    // PostgreSQL 的函数定义中可能包含分号，需要特殊处理
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement);
          console.log("✅ 执行成功");
        } catch (error: any) {
          // 忽略已存在的错误（如表已存在）
          if (error.code === "42P07" || error.message.includes("already exists")) {
            console.log("⚠️  对象已存在，跳过");
          } else {
            throw error;
          }
        }
      }
    }

    console.log("\n✅ 表创建成功！\n");

    // 验证表结构
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tb_image', 'tb_hsx_img_value')
      ORDER BY table_name
    `);

    console.log("📋 已创建的表：");
    console.log("─".repeat(50));
    for (const row of tablesResult.rows) {
      console.log(`  ✅ ${row.table_name}`);
    }

    // 显示表结构
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      console.log(`\n📋 表结构: ${tableName}`);
      console.log("─".repeat(50));

      const columnsResult = await client.query(
        `
        SELECT 
          column_name,
          data_type,
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
        console.log(
          `  ${column.column_name.padEnd(25)} ${column.data_type.padEnd(20)} ${column.is_nullable.padEnd(5)} ${column.column_default || "NULL"}`
        );
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

createPostgresTables().catch(console.error);
