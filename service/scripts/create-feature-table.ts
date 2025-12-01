import { readFile } from "fs/promises";
import {
  createPostgresConnection,
  getPostgresConfig,
} from "../app/utils/db.js";

/**
 * 创建特征向量表（PostgreSQL 版本）
 * 注意：此脚本已更新为使用 PostgreSQL
 * 推荐使用：npm run create-postgres-vector-table（使用 vector 类型）
 */
async function createFeatureTable() {
  let client;
  try {
    console.log("正在连接 PostgreSQL 数据库...");
    const config = getPostgresConfig();
    console.log(
      `连接信息: ${config.host}:${config.port}, 数据库: ${config.database}\n`
    );

    client = await createPostgresConnection();

    console.log("✅ PostgreSQL 数据库连接成功！\n");

    console.log("⚠️  注意：建议使用 create-postgres-vector-table.ts");
    console.log("    该脚本使用 PostgreSQL vector 类型，性能更好\n");
    console.log("    运行命令: npm run create-postgres-vector-table\n");

    // 读取 SQL 文件（PostgreSQL 版本）
    const sql = await readFile("scripts/create-postgres-tables.sql", "utf-8");

    // 分割并执行 SQL 语句
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement);
        } catch (error: any) {
          // 忽略已存在的错误
          if (
            error.code === "42P07" ||
            error.message.includes("already exists")
          ) {
            console.log("⚠️  表已存在，跳过");
          } else {
            throw error;
          }
        }
      }
    }

    console.log("✅ 表 tb_hsx_img_value 创建成功！\n");

    // 验证表结构
    const columnsResult = await client.query(
      `SELECT column_name, data_type, udt_name, is_nullable, column_default
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'tb_hsx_img_value'
       ORDER BY ordinal_position`
    );

    if (columnsResult.rows.length > 0) {
      console.log("📋 表结构：");
      console.log("─".repeat(80));
      for (const col of columnsResult.rows) {
        const typeInfo = col.udt_name || col.data_type;
        console.log(
          `${col.column_name.padEnd(20)} ${typeInfo.padEnd(
            15
          )} ${col.is_nullable.padEnd(5)} ${(col.column_default || "NULL")
            .substring(0, 15)
            .padEnd(15)}`
        );
      }
    } else {
      console.log("⚠️  表不存在或创建失败");
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

createFeatureTable().catch(console.error);
