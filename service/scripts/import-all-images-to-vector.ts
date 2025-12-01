import {
  createPostgresConnection,
  getPostgresConfig,
} from "../app/utils/db.js";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import { createCanvas, loadImage } from "canvas";
import axios from "axios";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * 从 ecai.tb_image 读取所有图片，计算向量并存入向量表
 */
async function importAllImagesToVector() {
  let client;
  let model: mobilenet.MobileNet | null = null;

  try {
    console.log("正在连接 PostgreSQL 数据库...");
    const config = getPostgresConfig();
    console.log(
      `连接信息: ${config.host}:${config.port}, 数据库: ${config.database}, 用户: ${config.user}\n`
    );

    client = await createPostgresConnection();
    console.log("✅ PostgreSQL 数据库连接成功！\n");

    // 加载 MobileNet 模型
    console.log("正在加载 MobileNetV2 模型...");
    model = await mobilenet.load({
      version: 2,
      alpha: 1.0,
    });
    console.log("✅ MobileNetV2 模型加载成功！\n");

    // 查询所有图片
    console.log("正在查询 ecai.tb_image 表中的所有图片...");
    const imagesResult = await client.query(
      `SELECT 
        i.id::text as id, 
        i.url,
        CASE 
          WHEN f.id IS NOT NULL THEN true 
          ELSE false 
        END as has_vector
       FROM ecai.tb_image i
       LEFT JOIN tb_hsx_img_value f ON i.id::text = f.image_id::text
       ORDER BY i.id`
    );

    const totalImages = imagesResult.rows.length;
    const alreadyProcessed = imagesResult.rows.filter(
      (r) => r.has_vector
    ).length;
    const needProcess = totalImages - alreadyProcessed;

    console.log(`📊 统计信息:`);
    console.log(`   总图片数: ${totalImages}`);
    console.log(`   已处理: ${alreadyProcessed}`);
    console.log(`   待处理: ${needProcess}\n`);

    if (needProcess === 0) {
      console.log("✅ 所有图片都已处理完成！");
      return;
    }

    // 加载图片的函数（支持 URL 和本地文件）
    const loadImageFromSource = async (source: string): Promise<Buffer> => {
      if (source.startsWith("http://") || source.startsWith("https://")) {
        // 尝试从本地文件读取（如果 URL 指向本地文件）
        const urlParts = source.split("/");
        const fileName = urlParts[urlParts.length - 1];
        const localPath = join(process.cwd(), "app", "public", "img", fileName);

        try {
          // 先尝试从本地读取
          return await readFile(localPath);
        } catch (error) {
          // 如果本地文件不存在，从 URL 下载
          try {
            const response = await axios.get(source, {
              responseType: "arraybuffer",
              timeout: 30000,
            });
            return Buffer.from(response.data);
          } catch (error: any) {
            throw new Error(`无法下载图片: ${error.message}`);
          }
        }
      } else {
        // 从本地文件读取
        try {
          return await readFile(source);
        } catch (error: any) {
          throw new Error(`无法读取图片文件: ${error.message}`);
        }
      }
    };

    // 计算特征向量的函数
    const computeFeatureVector = async (
      imageSource: string
    ): Promise<number[]> => {
      // 加载图片 Buffer
      const imageBuffer = await loadImageFromSource(imageSource);

      // 验证图片数据
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error("图片数据为空");
      }

      // 加载图片到 canvas
      const img = await loadImage(imageBuffer);

      // 验证图片尺寸
      if (
        !img ||
        !img.width ||
        !img.height ||
        img.width === 0 ||
        img.height === 0
      ) {
        throw new Error("图片尺寸无效");
      }

      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      // 使用 MobileNet 提取特征
      const activation = model!.infer(canvas as any, true) as tf.Tensor;

      // 确保返回一维张量
      const features = activation.flatten() as tf.Tensor1D;

      // 转换为数组
      const featureArray = await features.data();
      const featureVector = Array.from(featureArray);

      // 清理张量
      activation.dispose();
      features.dispose();

      return featureVector;
    };

    // 处理每张图片
    let success = 0;
    let failed = 0;
    const failedImages: Array<{ id: string; url: string; error: string }> = [];

    console.log(`\n开始处理 ${needProcess} 张图片...\n`);

    for (let i = 0; i < imagesResult.rows.length; i++) {
      const image = imagesResult.rows[i];

      // 跳过已处理的图片
      if (image.has_vector) {
        continue;
      }

      const progress = `[${i + 1}/${totalImages}]`;

      try {
        console.log(`${progress} 处理图片 ID: ${image.id}, URL: ${image.url}`);

        // 计算特征向量
        const featureVector = await computeFeatureVector(image.url);

        // 保存到数据库 - 使用 vector 类型格式：'[1,2,3,...]'
        const vectorString = `[${featureVector.join(",")}]`;
        await client.query(
          `INSERT INTO tb_hsx_img_value 
           (image_id, feature_vector, vector_dimension, model_version) 
           VALUES ($1, $2::vector, $3, $4)
           ON CONFLICT (image_id) DO UPDATE 
           SET feature_vector = EXCLUDED.feature_vector,
               vector_dimension = EXCLUDED.vector_dimension,
               update_time = CURRENT_TIMESTAMP`,
          [image.id, vectorString, featureVector.length, "MobileNetV2"]
        );

        success++;
        console.log(`  ✅ 成功 (${success}/${needProcess})\n`);
      } catch (error: any) {
        failed++;
        const errorMsg = error.message || String(error);
        failedImages.push({
          id: image.id,
          url: image.url,
          error: errorMsg,
        });
        console.error(`  ❌ 失败: ${errorMsg}\n`);
      }
    }

    // 输出结果统计
    console.log("\n" + "=".repeat(80));
    console.log("📊 处理完成统计:");
    console.log("=".repeat(80));
    console.log(`✅ 成功: ${success}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`📈 成功率: ${((success / needProcess) * 100).toFixed(2)}%\n`);

    if (failedImages.length > 0) {
      console.log("❌ 失败的图片列表:");
      console.log("-".repeat(80));
      for (const failed of failedImages) {
        console.log(`  ID: ${failed.id}`);
        console.log(`  URL: ${failed.url}`);
        console.log(`  错误: ${failed.error}`);
        console.log("");
      }
    }

    console.log("✅ 导入完成！");
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
    // 清理资源
    if (model) {
      // TensorFlow.js 模型不需要显式清理
      tf.disposeVariables();
    }
    if (client) {
      await client.end();
    }
  }
}

importAllImagesToVector().catch(console.error);
