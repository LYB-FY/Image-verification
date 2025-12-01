import { readdir, stat } from "fs/promises";
import { join } from "path";
import { createDbConnection } from "../app/utils/db.js";
import { Client } from "pg";

// 生成 bigint 类型的 id（使用时间戳 + 随机数）
function generateId(): bigint {
  const timestamp = BigInt(Date.now());
  const random = BigInt(Math.floor(Math.random() * 1000000));
  return timestamp * BigInt(1000000) + random;
}

async function importImages() {
  const imgDir = join(process.cwd(), "app", "public", "img");
  let client: Client | undefined;

  try {
    console.log("正在连接数据库...");
    client = await createDbConnection();

    console.log("✅ 数据库连接成功！\n");

    // 读取图片目录下的所有文件
    console.log(`正在读取目录: ${imgDir}\n`);
    const files = await readdir(imgDir);

    // 过滤出文件（排除目录）
    const imageFiles: string[] = [];
    for (const file of files) {
      const filePath = join(imgDir, file);
      const fileStat = await stat(filePath);
      if (fileStat.isFile()) {
        imageFiles.push(file);
      }
    }

    console.log(`找到 ${imageFiles.length} 个图片文件\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // 处理每个文件
    for (const fileName of imageFiles) {
      try {
        console.log(`处理文件: ${fileName}...`);

        // 生成 id
        const id = generateId();

        // 构建 URL：https://assets.ecaisys.com/similarity/{文件名}
        const url = `https://assets.ecaisys.com/similarity/${fileName}`;

        // 插入数据库 - PostgreSQL 使用 $1, $2 占位符
        await client.query(
          "INSERT INTO ecai.tb_image (id, url) VALUES ($1, $2)",
          [id.toString(), url]
        );

        console.log(`  ✅ 插入成功 - ID: ${id}, URL: ${url}\n`);
        successCount++;
      } catch (error: any) {
        // 如果是唯一约束冲突，跳过
        if (error.code === "23505" || error.message.includes("duplicate")) {
          console.log(`  ⚠️  跳过 - 数据已存在\n`);
          skipCount++;
        } else {
          console.error(`  ❌ 处理文件 ${fileName} 时出错:`, error.message);
          errorCount++;
        }
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("导入完成！");
    console.log(`  成功: ${successCount} 个`);
    console.log(`  跳过: ${skipCount} 个`);
    console.log(`  失败: ${errorCount} 个`);
    console.log("=".repeat(50));
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
    if (client) {
      await client.end();
    }
  }
}

importImages().catch(console.error);
