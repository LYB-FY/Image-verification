import mysql from "mysql2/promise";
import { createDbConnection, getDbConfig } from "../app/utils/db.js";

async function checkDatabase() {
  let connection;
  try {
    console.log("正在连接数据库...");
    const config = getDbConfig();
    console.log(
      `连接信息: ${config.host}:${config.port}, 数据库: ${config.database}, 用户: ${config.user}\n`
    );

    connection = await createDbConnection();

    console.log("✅ 数据库连接成功！\n");

    // 获取所有表
    const [tables] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'demo'"
    );

    console.log(`📊 数据库 'demo' 中共有 ${tables.length} 个表：\n`);

    // 遍历每个表，获取表结构
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      console.log(`\n📋 表名: ${tableName}`);
      console.log("─".repeat(50));

      // 获取表的列信息
      const [columns] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT,
          COLUMN_KEY,
          EXTRA,
          COLUMN_COMMENT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'demo' AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION`,
        [tableName]
      );

      console.log("列信息：");
      console.log("  列名\t\t类型\t\t可空\t默认值\t键\t额外\t注释");
      console.log("  " + "─".repeat(80));

      for (const column of columns) {
        console.log(
          `  ${column.COLUMN_NAME.padEnd(15)}\t${column.DATA_TYPE.padEnd(
            15
          )}\t${column.IS_NULLABLE}\t${column.COLUMN_DEFAULT || "NULL"}\t${
            column.COLUMN_KEY || ""
          }\t${column.EXTRA || ""}\t${column.COLUMN_COMMENT || ""}`
        );
      }

      // 获取表的索引信息
      const [indexes] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT 
          INDEX_NAME,
          COLUMN_NAME,
          NON_UNIQUE,
          SEQ_IN_INDEX
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = 'demo' AND TABLE_NAME = ?
        ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
        [tableName]
      );

      if (indexes.length > 0) {
        console.log("\n索引信息：");
        const indexMap = new Map<string, string[]>();
        for (const index of indexes) {
          if (!indexMap.has(index.INDEX_NAME)) {
            indexMap.set(index.INDEX_NAME, []);
          }
          indexMap.get(index.INDEX_NAME)!.push(index.COLUMN_NAME);
        }
        for (const [indexName, columns] of indexMap) {
          const unique =
            indexes.find((i) => i.INDEX_NAME === indexName)?.NON_UNIQUE === 0
              ? "UNIQUE"
              : "";
          console.log(`  ${indexName} ${unique}: ${columns.join(", ")}`);
        }
      }
    }

    console.log("\n✅ 表结构读取完成！");
  } catch (error: any) {
    console.error("❌ 数据库连接或查询错误:");
    if (error.code) {
      console.error(`  错误代码: ${error.code}`);
    }
    if (error.message) {
      console.error(`  错误信息: ${error.message}`);
    }
    if (error.sqlMessage) {
      console.error(`  SQL错误: ${error.sqlMessage}`);
    }
    console.error("\n完整错误信息:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabase().catch(console.error);
