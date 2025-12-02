const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

// 配置
const MODEL_BASE_URL =
  process.env.MODEL_DOWNLOAD_URL ||
  "https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224";
const MODEL_DIR = path.join(
  __dirname,
  "..",
  "public",
  "models",
  "mobilenet_v2_1.0_224"
);

// 需要下载的文件列表
// 注意：MobileNet V2 1.0 224 模型使用 4 个 shard 文件，没有 .bin 扩展名
const files = [
  "model.json",
  "group1-shard1of4",
  "group1-shard2of4",
  "group1-shard3of4",
  "group1-shard4of4",
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https:") ? https : http;
    const file = fs.createWriteStream(dest);

    protocol
      .get(url, (response) => {
        // 处理重定向
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          fs.unlinkSync(dest);
          return downloadFile(response.headers.location, dest)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          return reject(
            new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`)
          );
        }

        const totalSize = parseInt(response.headers["content-length"], 10);
        let downloadedSize = 0;

        response.on("data", (chunk) => {
          downloadedSize += chunk.length;
          if (totalSize) {
            const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
            process.stdout.write(
              `\r  进度: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(
                2
              )} MB / ${(totalSize / 1024 / 1024).toFixed(2)} MB)`
            );
          }
        });

        response.pipe(file);
        file.on("finish", () => {
          file.close();
          console.log(""); // 换行
          resolve();
        });
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(dest)) {
          fs.unlinkSync(dest);
        }
        reject(err);
      });
  });
}

async function downloadModel() {
  console.log("=".repeat(60));
  console.log("MobileNetV2 模型下载工具 (前端)");
  console.log("=".repeat(60));
  console.log(`下载源: ${MODEL_BASE_URL}`);
  console.log(`目标目录: ${MODEL_DIR}`);
  console.log("");

  // 创建目录
  if (!fs.existsSync(MODEL_DIR)) {
    console.log(`创建目录: ${MODEL_DIR}`);
    fs.mkdirSync(MODEL_DIR, { recursive: true });
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const url = `${MODEL_BASE_URL}/${file}`;
    const dest = path.join(MODEL_DIR, file);

    // 检查文件是否已存在
    if (fs.existsSync(dest)) {
      console.log(`[${i + 1}/${files.length}] ${file} 已存在，跳过`);
      successCount++;
      continue;
    }

    console.log(`[${i + 1}/${files.length}] 下载: ${file}...`);
    try {
      await downloadFile(url, dest);
      console.log(`✅ ${file} 下载完成`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${file} 下载失败:`, error.message);
      failCount++;
    }
    console.log("");
  }

  console.log("=".repeat(60));
  console.log("下载完成统计:");
  console.log(`✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log("=".repeat(60));

  if (failCount === 0) {
    console.log("\n✅ 所有文件下载成功！");
    console.log(`模型文件位置: ${MODEL_DIR}`);
    console.log(
      "\n模型文件已放置在 public 目录下，可以通过 /models/mobilenet_v2_1.0_224/model.json 访问"
    );
  } else {
    console.log("\n⚠️  部分文件下载失败，请检查网络连接后重试");
    process.exit(1);
  }
}

// 运行下载
downloadModel().catch((error) => {
  console.error("下载过程出错:", error);
  process.exit(1);
});
