import mysql from "mysql2/promise";
import { createDbConnection } from "../app/utils/db.js";

async function queryImages() {
  let connection;
  try {
    console.log("正在连接数据库...");
    connection = await createDbConnection();

    console.log("✅ 数据库连接成功！\n");

    // 查询前 5 条记录
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT id, md5, url, file_type, create_time FROM tb_image ORDER BY create_time DESC LIMIT 5"
    );

    console.log(`📊 前 5 条记录：\n`);
    for (const row of rows) {
      console.log(`ID: ${row.id}`);
      console.log(`MD5: ${row.md5}`);
      console.log(`URL: ${row.url}`);
      console.log(`文件类型: ${row.file_type}`);
      console.log(`创建时间: ${row.create_time}`);
      console.log("─".repeat(60));
    }

    // 查询总数
    const [countResult] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM tb_image"
    );
    console.log(`\n📊 数据库中共有 ${countResult[0].total} 条记录`);
  } catch (error: any) {
    console.error("❌ 错误:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

queryImages().catch(console.error);
