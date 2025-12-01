import { createDbConnection } from "../app/utils/db.js";
import { Client } from "pg";

async function queryImages() {
  let client: Client | undefined;
  try {
    console.log("正在连接数据库...");
    client = await createDbConnection();

    console.log("✅ 数据库连接成功！\n");

    // 查询前 5 条记录
    const rowsResult = await client.query(
      "SELECT id::text as id, url FROM ecai.tb_image ORDER BY id DESC LIMIT 5"
    );

    console.log(`📊 前 5 条记录：\n`);
    for (const row of rowsResult.rows) {
      console.log(`ID: ${row.id}`);
      console.log(`URL: ${row.url}`);
      console.log("─".repeat(60));
    }

    // 查询总数
    const countResult = await client.query(
      "SELECT COUNT(*) as total FROM ecai.tb_image"
    );
    console.log(`\n📊 数据库中共有 ${countResult.rows[0].total} 条记录`);
  } catch (error: any) {
    console.error("❌ 错误:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

queryImages().catch(console.error);
