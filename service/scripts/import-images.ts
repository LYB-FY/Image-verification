import mysql from "mysql2/promise";
import { readdir, readFile, stat } from "fs/promises";
import { join, extname } from "path";
import { createHash } from "crypto";
import { createDbConnection } from "../app/utils/db.js";

// 文件类型映射：根据扩展名映射到 smallint
const FILE_TYPE_MAP: Record<string, number> = {
  ".png": 1,
  ".jpg": 2,
  ".jpeg": 2,
  ".JPG": 2,
  ".gif": 3,
  ".webp": 4,
};

// 获取文件类型
function getFileType(ext: string): number {
  const normalizedExt = ext.toLowerCase();
  return FILE_TYPE_MAP[normalizedExt] || 0;
}

// 计算文件的 MD5 值
async function calculateMD5(filePath: string): Promise<string> {
  const fileBuffer = await readFile(filePath);
  return createHash("md5").update(fileBuffer).digest("hex");
}

// 生成 bigint 类型的 id（使用时间戳 + 随机数）
function generateId(): bigint {
  const timestamp = BigInt(Date.now());
  const random = BigInt(Math.floor(Math.random() * 1000000));
  return timestamp * BigInt(1000000) + random;
}

async function importImages() {
  const imgDir = join(process.cwd(), "app", "public", "img");
  let connection;

  try {
    console.log("正在连接数据库...");
    connection = await createDbConnection();

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
        const filePath = join(imgDir, fileName);
        const ext = extname(fileName);

        // 计算 MD5
        console.log(`处理文件: ${fileName}...`);
        const md5 = await calculateMD5(filePath);

        // 生成 id
        const id = generateId();

        // 构建 URL：https://assets.ecaisys.com/similarity/{文件名}.{扩展名}
        const url = `https://assets.ecaisys.com/similarity/${fileName}`;

        // 获取文件类型
        const fileType = getFileType(ext);

        // 插入数据库
        await connection.execute(
          "INSERT INTO tb_image (id, md5, url, file_type) VALUES (?, ?, ?, ?)",
          [id.toString(), md5, url, fileType]
        );

        console.log(`  ✅ 插入成功 - ID: ${id}, MD5: ${md5}, URL: ${url}\n`);
        successCount++;
      } catch (error: any) {
        console.error(`  ❌ 处理文件 ${fileName} 时出错:`, error.message);
        errorCount++;
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
    if (connection) {
      await connection.end();
    }
  }
}

importImages().catch(console.error);
