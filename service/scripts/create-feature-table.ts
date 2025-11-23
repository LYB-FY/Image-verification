import mysql from "mysql2/promise";
import { readFile } from "fs/promises";
import { createDbConnection } from "../app/utils/db.js";

async function createFeatureTable() {
  let connection;
  try {
    console.log("正在连接数据库...");
    connection = await createDbConnection();

    console.log("✅ 数据库连接成功！\n");

    // 读取 SQL 文件
    const sql = await readFile("scripts/create-feature-table.sql", "utf-8");

    // 执行 SQL（可能需要分割多个语句）
    const statements = sql.split(";").filter((s) => s.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
      }
    }

    console.log("✅ 表 tb_hsx_img_value 创建成功！\n");

    // 验证表结构
    const [columns] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = 'demo' AND TABLE_NAME = 'tb_hsx_img_value'
       ORDER BY ORDINAL_POSITION`
    );

    console.log("📋 表结构：");
    console.log("─".repeat(80));
    for (const col of columns) {
      console.log(
        `${col.COLUMN_NAME.padEnd(20)} ${col.DATA_TYPE.padEnd(
          15
        )} ${col.IS_NULLABLE.padEnd(5)} ${(col.COLUMN_DEFAULT || "NULL").padEnd(
          15
        )} ${col.COLUMN_COMMENT || ""}`
      );
    }
  } catch (error: any) {
    console.error("❌ 错误:", error);
    if (error.code) {
      console.error(`  错误代码: ${error.code}`);
    }
    if (error.message) {
      console.error(`  错误信息: ${error.message}`);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createFeatureTable().catch(console.error);
