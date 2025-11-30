import type { EggLogger } from "egg";
import { SingletonProto, AccessLevel, Inject } from "@eggjs/tegg";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import { createCanvas, loadImage } from "canvas";
import axios from "axios";
import mysql from "mysql2/promise";
import { readFile } from "fs/promises";
import { join } from "path";
import { createDbConnection } from "../../../utils/db.js";

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class ImageFeatureService {
  @Inject()
  private logger: EggLogger;

  private model: mobilenet.MobileNet | null = null;
  private modelLoading: Promise<void> | null = null;
  private fetchInitialized: boolean = false;

  // 初始化 fetch（如果需要）
  private async ensureFetch(): Promise<void> {
    if (this.fetchInitialized) {
      return;
    }

    // Node.js 18+ 应该有内置的 fetch
    if (typeof globalThis.fetch === "undefined") {
      this.logger.warn(
        "[ImageFeatureService] 全局 fetch 未定义，尝试加载 node-fetch..."
      );
      try {
        // 动态导入 node-fetch
        const nodeFetch = await import("node-fetch");
        // @ts-ignore
        globalThis.fetch = nodeFetch.default || nodeFetch;
        this.logger.info("[ImageFeatureService] 已配置 node-fetch");
      } catch (error) {
        this.logger.error(
          "[ImageFeatureService] 无法加载 node-fetch，请安装: npm install node-fetch"
        );
        throw new Error(
          "fetch 未定义且无法加载 node-fetch。请确保 Node.js 版本 >= 18 或安装 node-fetch 包"
        );
      }
    } else {
      this.logger.info("[ImageFeatureService] 使用 Node.js 内置 fetch");
    }
    this.fetchInitialized = true;
  }

  // 初始化并加载 MobileNetV2 模型
  private async loadModel(): Promise<void> {
    if (this.model) {
      return;
    }

    if (this.modelLoading) {
      return this.modelLoading;
    }

    this.modelLoading = (async () => {
      try {
        this.logger.info("[ImageFeatureService] 开始加载 MobileNetV2 模型...");

        // 确保 fetch 可用
        await this.ensureFetch();

        // 配置模型加载选项
        this.model = await mobilenet.load({
          version: 2,
          alpha: 1.0,
        });

        this.logger.info("[ImageFeatureService] MobileNetV2 模型加载成功");
      } catch (error: any) {
        this.logger.error("[ImageFeatureService] 模型加载失败:", error);
        this.logger.error("[ImageFeatureService] 错误详情:", {
          message: error.message,
          stack: error.stack,
          cause: error.cause,
        });

        // 提供更详细的错误信息
        if (error.message && error.message.includes("fetch failed")) {
          this.logger.error("[ImageFeatureService] 网络请求失败，可能的原因：");
          this.logger.error("  1. 网络连接问题，无法访问模型 CDN");
          this.logger.error("  2. 防火墙或代理设置阻止了请求");
          this.logger.error("  3. 需要配置代理或使用镜像源");
          this.logger.error("  建议：检查网络连接，或考虑使用本地模型文件");
        }

        this.modelLoading = null;
        throw error;
      }
    })();

    return this.modelLoading;
  }

  // 验证图片 Buffer 是否有效
  private validateImageBuffer(buffer: Buffer): void {
    if (!buffer || buffer.length === 0) {
      throw new Error("图片数据为空");
    }

    // 检查文件头，验证是否为有效的图片格式
    const header = buffer.slice(0, 8);
    const isPNG =
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47;
    const isJPEG = header[0] === 0xff && header[1] === 0xd8;
    const isGIF =
      header[0] === 0x47 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x38;

    if (!isPNG && !isJPEG && !isGIF) {
      this.logger.warn(
        "[ImageFeatureService] 图片格式可能不受支持，但继续尝试加载"
      );
    }
  }

  // 从 URL 或本地路径加载图片
  private async loadImageFromSource(source: string): Promise<Buffer> {
    let buffer: Buffer;

    if (source.startsWith("http://") || source.startsWith("https://")) {
      // 尝试从本地文件读取（如果 URL 指向本地文件）
      // URL 格式: https://assets.ecaisys.com/similarity/{文件名}
      const urlParts = source.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const localPath = join(process.cwd(), "app", "public", "img", fileName);

      try {
        // 先尝试从本地读取
        this.logger.info(
          `[ImageFeatureService] 尝试从本地文件读取: ${localPath}`
        );
        buffer = await readFile(localPath);
      } catch (error) {
        // 如果本地文件不存在，从 URL 下载
        this.logger.info(
          `[ImageFeatureService] 本地文件不存在，从 URL 下载图片: ${source}`
        );
        try {
          const response = await axios.get(source, {
            responseType: "arraybuffer",
            timeout: 30000,
          });
          buffer = Buffer.from(response.data);
        } catch (error: any) {
          this.logger.error(
            `[ImageFeatureService] 从 URL 下载图片失败: ${error.message}`
          );
          throw new Error(`无法下载图片: ${error.message}`);
        }
      }
    } else {
      // 从本地文件读取
      this.logger.info(`[ImageFeatureService] 从本地文件读取: ${source}`);
      try {
        buffer = await readFile(source);
      } catch (error: any) {
        this.logger.error(
          `[ImageFeatureService] 读取本地文件失败: ${error.message}`
        );
        throw new Error(`无法读取图片文件: ${error.message}`);
      }
    }

    // 验证图片数据
    try {
      this.validateImageBuffer(buffer);
    } catch (error: any) {
      this.logger.error(`[ImageFeatureService] 图片验证失败: ${error.message}`);
      throw error;
    }

    return buffer;
  }

  // 加载图片并转换为 Canvas（Node.js 环境中 TensorFlow.js 可识别）
  private async loadImageFromBuffer(imageBuffer: Buffer): Promise<any> {
    try {
      // 加载图片
      const img = await loadImage(imageBuffer);

      // 验证图片尺寸
      if (!img || !img.width || !img.height) {
        throw new Error("图片尺寸无效");
      }

      if (img.width === 0 || img.height === 0) {
        throw new Error("图片尺寸为 0");
      }

      this.logger.info(
        `[ImageFeatureService] 图片尺寸: ${img.width}x${img.height}`
      );

      // 创建 Canvas 并绘制图片
      // Node.js 环境中 TensorFlow.js 需要 Canvas 对象而不是 Image 对象
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      return canvas;
    } catch (error: any) {
      this.logger.error("[ImageFeatureService] 图片加载失败:", error);

      // 检查是否是 libpng 错误
      if (error.message && error.message.includes("libpng")) {
        this.logger.error("[ImageFeatureService] libpng 错误，可能的原因：");
        this.logger.error("  1. 图片文件损坏或不完整");
        this.logger.error("  2. 图片格式不标准");
        this.logger.error("  3. 内存不足");
        this.logger.error("  建议：检查图片文件是否完整，或尝试使用其他图片");
      }

      throw new Error(`无法加载图片: ${error.message}`);
    }
  }

  // 从 Buffer 计算图片的特征向量（简化版，类似前端处理方式）
  // 注意：Node.js 环境中使用 Canvas 包装图片，浏览器环境使用 HTMLImageElement
  async computeFeatureVectorFromBuffer(imageBuffer: Buffer): Promise<number[]> {
    await this.loadModel();

    if (!this.model) {
      throw new Error("模型未加载");
    }

    try {
      // 验证图片数据
      this.validateImageBuffer(imageBuffer);

      // 加载图片并转换为 Canvas（Node.js 环境中 TensorFlow.js 可识别）
      const canvas = await this.loadImageFromBuffer(imageBuffer);

      // 使用 MobileNet 直接处理 Canvas（逻辑与前端一致）
      // MobileNet 的 infer 方法第二个参数为 true 时返回特征向量（embedding）而不是分类结果
      const activation = this.model.infer(canvas, true) as tf.Tensor;

      // 确保返回一维张量（与 demo 保持一致）
      const features = activation.flatten() as tf.Tensor1D;

      // 转换为数组
      const featureArray = await features.data();
      const featureVector = Array.from(featureArray);

      // 清理张量
      activation.dispose();
      features.dispose();

      this.logger.info(
        `[ImageFeatureService] 特征向量计算完成，维度: ${featureVector.length}`
      );

      return featureVector;
    } catch (error) {
      this.logger.error("[ImageFeatureService] 计算特征向量失败:", error);
      throw error;
    }
  }

  // 计算图片的特征向量
  async computeFeatureVector(imageSource: string): Promise<number[]> {
    await this.loadModel();

    if (!this.model) {
      throw new Error("模型未加载");
    }

    try {
      // 加载图片
      const imageBuffer = await this.loadImageFromSource(imageSource);

      return await this.computeFeatureVectorFromBuffer(imageBuffer);
    } catch (error) {
      this.logger.error("[ImageFeatureService] 计算特征向量失败:", error);
      throw error;
    }
  }

  // 处理单个图片：读取数据库、计算特征、保存
  async processImage(imageId: bigint): Promise<void> {
    let connection;
    try {
      // 连接数据库
      connection = await createDbConnection();

      // 查询图片信息 - 使用字符串比较避免精度丢失
      const imageIdStr = imageId.toString();
      const [images] = await connection.execute<mysql.RowDataPacket[]>(
        "SELECT CAST(id AS CHAR) as id, url FROM tb_image WHERE CAST(id AS CHAR) = ?",
        [imageIdStr]
      );

      if (images.length === 0) {
        throw new Error(`图片 ID ${imageId} 不存在`);
      }

      const image = images[0];
      this.logger.info(
        `[ImageFeatureService] 处理图片 ID: ${imageId}, URL: ${image.url}`
      );

      // 检查是否已经计算过特征 - 使用字符串比较
      const [existing] = await connection.execute<mysql.RowDataPacket[]>(
        "SELECT id FROM tb_hsx_img_value WHERE CAST(image_id AS CHAR) = ?",
        [imageIdStr]
      );

      if (existing.length > 0) {
        this.logger.info(
          `[ImageFeatureService] 图片 ID ${imageId} 的特征向量已存在，跳过`
        );
        return;
      }

      // 计算特征向量
      const featureVector = await this.computeFeatureVector(image.url);

      // 保存到数据库
      await connection.execute(
        `INSERT INTO tb_hsx_img_value 
         (image_id, feature_vector, vector_dimension, model_version) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         feature_vector = VALUES(feature_vector),
         vector_dimension = VALUES(vector_dimension),
         update_time = CURRENT_TIMESTAMP`,
        [
          imageId.toString(),
          JSON.stringify(featureVector),
          featureVector.length,
          "MobileNetV2",
        ]
      );

      this.logger.info(
        `[ImageFeatureService] 图片 ID ${imageId} 的特征向量已保存`
      );
    } catch (error) {
      this.logger.error(`[ImageFeatureService] 处理图片失败:`, error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // 批量处理图片
  // limit 为 undefined 或 null 时，处理所有未处理的图片
  async processImages(
    limit?: number
  ): Promise<{ success: number; failed: number }> {
    let connection;
    try {
      connection = await createDbConnection();

      // 查询未处理过的图片 - 使用 CAST 确保 BIGINT 作为字符串返回
      // 如果 limit 未指定，则处理所有未处理的图片
      let query: string;
      let params: any[];

      if (limit !== undefined && limit !== null) {
        query = `SELECT CAST(i.id AS CHAR) as id, i.url 
                 FROM tb_image i
                 LEFT JOIN tb_hsx_img_value f ON CAST(i.id AS CHAR) = CAST(f.image_id AS CHAR)
                 WHERE f.id IS NULL
                 LIMIT ?`;
        params = [limit];
      } else {
        query = `SELECT CAST(i.id AS CHAR) as id, i.url 
                 FROM tb_image i
                 LEFT JOIN tb_hsx_img_value f ON CAST(i.id AS CHAR) = CAST(f.image_id AS CHAR)
                 WHERE f.id IS NULL`;
        params = [];
      }

      const [images] = await connection.execute<mysql.RowDataPacket[]>(
        query,
        params
      );

      this.logger.info(
        `[ImageFeatureService] 找到 ${images.length} 张未处理的图片${
          limit ? `（限制 ${limit} 条）` : "（处理所有数据）"
        }`
      );

      let success = 0;
      let failed = 0;

      for (const image of images) {
        try {
          // image.id 现在已经是字符串，直接转换为 BigInt
          await this.processImage(BigInt(image.id));
          success++;
        } catch (error) {
          this.logger.error(
            `[ImageFeatureService] 处理图片 ${image.id} 失败:`,
            error
          );
          failed++;
        }
      }

      return { success, failed };
    } catch (error) {
      this.logger.error("[ImageFeatureService] 批量处理失败:", error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // 使用 TensorFlow.js 计算两个向量的余弦相似度
  private cosineSimilarity(vec1: tf.Tensor1D, vec2: tf.Tensor1D): number {
    // 计算点积
    const dotProduct = vec1.dot(vec2).dataSync()[0];

    // 计算向量的模
    const norm1 = vec1.norm().dataSync()[0];
    const norm2 = vec2.norm().dataSync()[0];

    // 计算余弦相似度（范围 [-1, 1]，但对于图像特征通常在 [0, 1]）
    const similarity = dotProduct / (norm1 * norm2);

    // 直接返回余弦相似度，确保在 [0, 1] 范围内
    // 对于 MobileNet 特征向量，余弦相似度通常不会是负数
    return Math.max(0, Math.min(1, similarity));
  }

  // 根据图片ID搜索相似图片
  async searchSimilarImagesByImageId(
    imageId: string,
    similarityThreshold: number = 0.8
  ): Promise<
    Array<{
      imageId: string;
      url: string;
      similarity: number;
      md5?: string;
      fileType?: number;
    }>
  > {
    let connection;
    try {
      connection = await createDbConnection();

      // 查询指定图片的特征向量
      const [features] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT feature_vector 
         FROM tb_hsx_img_value 
         WHERE CAST(image_id AS CHAR) = ?`,
        [imageId]
      );

      if (features.length === 0) {
        throw new Error(`图片 ID ${imageId} 的特征向量不存在，请先处理该图片`);
      }

      // 解析特征向量
      const featureVector =
        typeof features[0].feature_vector === "string"
          ? JSON.parse(features[0].feature_vector)
          : features[0].feature_vector;

      const queryTensor = tf.tensor1d(featureVector);

      // 查询所有其他图片的特征向量
      const [allFeatures] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT 
          CAST(f.image_id AS CHAR) as image_id,
          f.feature_vector,
          i.url,
          i.md5,
          i.file_type
         FROM tb_hsx_img_value f
         INNER JOIN tb_image i ON CAST(f.image_id AS CHAR) = CAST(i.id AS CHAR)
         WHERE CAST(f.image_id AS CHAR) != ?
         ORDER BY f.image_id`,
        [imageId]
      );

      this.logger.info(
        `[ImageFeatureService] 找到 ${allFeatures.length} 个特征向量，开始计算相似度...`
      );

      if (allFeatures.length === 0) {
        queryTensor.dispose();
        return [];
      }

      // 计算相似度并筛选
      const similarImages: Array<{
        imageId: string;
        url: string;
        similarity: number;
        md5?: string;
        fileType?: number;
      }> = [];

      for (const row of allFeatures) {
        try {
          // 解析特征向量
          const vector =
            typeof row.feature_vector === "string"
              ? JSON.parse(row.feature_vector)
              : row.feature_vector;

          // 转换为 Tensor
          const dbTensor = tf.tensor1d(vector);

          // 计算相似度
          const similarity = this.cosineSimilarity(queryTensor, dbTensor);

          // 清理 Tensor
          dbTensor.dispose();

          // 如果相似度大于阈值，添加到结果中
          if (similarity >= similarityThreshold) {
            similarImages.push({
              imageId: row.image_id,
              url: row.url,
              similarity: Math.round(similarity * 10000) / 100, // 保留两位小数，百分比形式
              md5: row.md5,
              fileType: row.file_type,
            });
          }
        } catch (error: any) {
          this.logger.warn(
            `[ImageFeatureService] 计算图片 ${row.image_id} 相似度失败: ${error.message}`
          );
        }
      }

      // 清理查询 Tensor
      queryTensor.dispose();

      // 按相似度降序排序
      similarImages.sort((a, b) => b.similarity - a.similarity);

      this.logger.info(
        `[ImageFeatureService] 找到 ${
          similarImages.length
        } 张相似图片（相似度 >= ${(similarityThreshold * 100).toFixed(0)}%）`
      );

      return similarImages;
    } catch (error) {
      this.logger.error(
        "[ImageFeatureService] 根据图片ID搜索相似图片失败:",
        error
      );
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // 根据图片URL搜索相似图片
  async searchSimilarImagesByUrl(
    imageUrl: string,
    similarityThreshold: number = 0.8
  ): Promise<
    Array<{
      imageId: string;
      url: string;
      similarity: number;
      md5?: string;
      fileType?: number;
    }>
  > {
    try {
      this.logger.info(
        `[ImageFeatureService] 从 URL 加载图片并计算特征向量: ${imageUrl}`
      );

      // 从 URL 加载图片
      const imageBuffer = await this.loadImageFromSource(imageUrl);

      // 使用现有的 searchSimilarImages 方法
      return await this.searchSimilarImages(imageBuffer, similarityThreshold);
    } catch (error) {
      this.logger.error(
        "[ImageFeatureService] 根据URL搜索相似图片失败:",
        error
      );
      throw error;
    }
  }

  // 搜索相似图片：接收图片 Buffer，返回相似度大于阈值的图片信息
  async searchSimilarImages(
    imageBuffer: Buffer,
    similarityThreshold: number = 0.8
  ): Promise<
    Array<{
      imageId: string;
      url: string;
      similarity: number;
      md5?: string;
      fileType?: number;
    }>
  > {
    let connection;
    try {
      // 计算上传图片的特征向量
      this.logger.info("[ImageFeatureService] 开始计算上传图片的特征向量...");
      const queryFeatureVector = await this.computeFeatureVectorFromBuffer(
        imageBuffer
      );
      const queryTensor = tf.tensor1d(queryFeatureVector);

      // 连接数据库
      connection = await createDbConnection();

      // 查询所有特征向量和对应的图片信息
      const [features] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT 
          CAST(f.image_id AS CHAR) as image_id,
          f.feature_vector,
          i.url,
          i.md5,
          i.file_type
         FROM tb_hsx_img_value f
         INNER JOIN tb_image i ON CAST(f.image_id AS CHAR) = CAST(i.id AS CHAR)
         ORDER BY f.image_id`
      );

      this.logger.info(
        `[ImageFeatureService] 找到 ${features.length} 个特征向量，开始计算相似度...`
      );

      if (features.length === 0) {
        queryTensor.dispose();
        return [];
      }

      // 计算相似度并筛选
      const similarImages: Array<{
        imageId: string;
        url: string;
        similarity: number;
        md5?: string;
        fileType?: number;
      }> = [];

      for (const row of features) {
        try {
          // 解析特征向量
          const vector =
            typeof row.feature_vector === "string"
              ? JSON.parse(row.feature_vector)
              : row.feature_vector;

          // 转换为 Tensor
          const dbTensor = tf.tensor1d(vector);

          // 计算相似度
          const similarity = this.cosineSimilarity(queryTensor, dbTensor);

          // 清理 Tensor
          dbTensor.dispose();

          // 如果相似度大于阈值，添加到结果中
          if (similarity >= similarityThreshold) {
            similarImages.push({
              imageId: row.image_id,
              url: row.url,
              similarity: Math.round(similarity * 10000) / 100, // 保留两位小数，百分比形式
              md5: row.md5,
              fileType: row.file_type,
            });
          }
        } catch (error: any) {
          this.logger.warn(
            `[ImageFeatureService] 计算图片 ${row.image_id} 相似度失败: ${error.message}`
          );
        }
      }

      // 清理查询 Tensor
      queryTensor.dispose();

      // 按相似度降序排序
      similarImages.sort((a, b) => b.similarity - a.similarity);

      this.logger.info(
        `[ImageFeatureService] 找到 ${
          similarImages.length
        } 张相似图片（相似度 >= ${(similarityThreshold * 100).toFixed(0)}%）`
      );

      return similarImages;
    } catch (error) {
      this.logger.error("[ImageFeatureService] 搜索相似图片失败:", error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // 获取两个图片之间的相似度（从相似度矩阵中）
  private getSimilarity(
    similarityMatrix: Map<string, Map<string, number>>,
    imageId1: string,
    imageId2: string
  ): number {
    if (imageId1 === imageId2) {
      return 1.0;
    }

    if (imageId1 < imageId2) {
      const simMap = similarityMatrix.get(imageId1);
      return simMap?.get(imageId2) || 0;
    } else {
      const simMap = similarityMatrix.get(imageId2);
      return simMap?.get(imageId1) || 0;
    }
  }

  // 计算组内平均相似度
  private calculateGroupAverageSimilarity(
    similarityMatrix: Map<string, Map<string, number>>,
    group: string[]
  ): number {
    if (group.length < 2) {
      return 1.0;
    }

    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const similarity = this.getSimilarity(
          similarityMatrix,
          group[i],
          group[j]
        );
        totalSimilarity += similarity;
        pairCount++;
      }
    }

    return pairCount > 0 ? totalSimilarity / pairCount : 0;
  }

  // 计算组内最小相似度
  private calculateGroupMinSimilarity(
    similarityMatrix: Map<string, Map<string, number>>,
    group: string[]
  ): number {
    if (group.length < 2) {
      return 1.0;
    }

    let minSimilarity = 1.0;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const similarity = this.getSimilarity(
          similarityMatrix,
          group[i],
          group[j]
        );
        minSimilarity = Math.min(minSimilarity, similarity);
      }
    }

    return minSimilarity;
  }

  // 批量计算相似度，将相似的图片分组到二维数组中
  // 使用基于clique的聚类算法，确保组内所有图片两两相似度 >= similarityThreshold
  // 注意：算法使用 TensorFlow.js 计算余弦相似度，返回值范围是 [0, 1]
  // similarityThreshold: 相似度阈值（0-1之间），默认0.9
  //   - 只要组内任意两张图片的相似度 >= threshold，就可以分为一组
  //   - 不要求平均相似度高于阈值
  // minGroupSimilarity: 已废弃，保留用于向后兼容
  async findSimilarImages(
    similarityThreshold: number = 0.9,
    _minGroupSimilarity?: number // 未使用，保留用于向后兼容
  ): Promise<string[][]> {
    let connection;
    try {
      connection = await createDbConnection();

      // 查询所有特征向量
      const [features] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT CAST(image_id AS CHAR) as image_id, feature_vector 
         FROM tb_hsx_img_value 
         ORDER BY image_id`
      );

      this.logger.info(
        `[ImageFeatureService] 找到 ${features.length} 个特征向量，开始计算相似度...`
      );

      if (features.length === 0) {
        return [];
      }

      // 解析特征向量并转换为 Tensor
      const imageFeatures: Array<{
        imageId: string;
        vector: number[];
        tensor: tf.Tensor1D;
      }> = features.map((row: mysql.RowDataPacket) => {
        const vector =
          typeof row.feature_vector === "string"
            ? JSON.parse(row.feature_vector)
            : row.feature_vector;
        return {
          imageId: row.image_id,
          vector,
          tensor: tf.tensor1d(vector),
        };
      });

      // 计算所有图片对的相似度矩阵
      this.logger.info(
        `[ImageFeatureService] 计算相似度矩阵（共 ${imageFeatures.length} 张图片）...`
      );
      const similarityMatrix: Map<string, Map<string, number>> = new Map();

      for (let i = 0; i < imageFeatures.length; i++) {
        const image1 = imageFeatures[i];
        const similarities = new Map<string, number>();

        for (let j = i + 1; j < imageFeatures.length; j++) {
          const image2 = imageFeatures[j];
          try {
            const similarity = this.cosineSimilarity(
              image1.tensor,
              image2.tensor
            );
            similarities.set(image2.imageId, similarity);
          } catch (error: any) {
            this.logger.warn(
              `[ImageFeatureService] 计算图片 ${image1.imageId} 和 ${image2.imageId} 相似度失败: ${error.message}`
            );
          }
        }
        similarityMatrix.set(image1.imageId, similarities);
      }

      // 清理 Tensor 内存
      imageFeatures.forEach((feature) => {
        feature.tensor.dispose();
      });

      // 用于记录已经分组的图片ID
      const grouped = new Set<string>();
      // 结果二维数组
      const similarGroups: string[][] = [];

      // 优化的分组算法：使用基于密度的严格聚类
      // 策略：构建完全互相似的紧密组（clique-based clustering）
      for (let i = 0; i < imageFeatures.length; i++) {
        const seedImage = imageFeatures[i];

        // 如果已经分组，跳过
        if (grouped.has(seedImage.imageId)) {
          continue;
        }

        // 找到所有与种子图片相似的候选图片
        const seedSimilarities =
          similarityMatrix.get(seedImage.imageId) || new Map();
        const candidates: string[] = [];

        for (const [candidateId, similarity] of seedSimilarities.entries()) {
          if (!grouped.has(candidateId) && similarity >= similarityThreshold) {
            candidates.push(candidateId);
          }
        }

        // 如果没有候选图片，跳过
        if (candidates.length === 0) {
          continue;
        }

        // 构建完全互相似的紧密组（clique）
        // 要求组内任意两张图片的相似度都 >= similarityThreshold
        const clique: string[] = [seedImage.imageId];

        // 对每个候选图片，检查它是否与当前clique内所有图片都相似
        for (const candidateId of candidates) {
          let isCliqueMember = true;

          // 检查候选图片是否与clique内所有图片的相似度都 >= threshold
          for (const cliqueMember of clique) {
            const similarity = this.getSimilarity(
              similarityMatrix,
              candidateId,
              cliqueMember
            );

            if (similarity < similarityThreshold) {
              isCliqueMember = false;
              break;
            }
          }

          if (isCliqueMember) {
            clique.push(candidateId);
          }
        }

        // 如果clique只有一张图片，跳过（至少需要2张图片才算一组）
        if (clique.length === 1) {
          continue;
        }

        // 计算统计信息用于日志记录
        const minSimilarity = this.calculateGroupMinSimilarity(
          similarityMatrix,
          clique
        );
        const avgSimilarity = this.calculateGroupAverageSimilarity(
          similarityMatrix,
          clique
        );

        // 标记所有图片为已分组
        clique.forEach((id) => grouped.add(id));
        similarGroups.push(clique);

        this.logger.info(
          `[ImageFeatureService] 找到相似图片组，包含 ${clique.length} 张图片，` +
            `平均相似度: ${(avgSimilarity * 100).toFixed(2)}%，` +
            `最小相似度: ${(minSimilarity * 100).toFixed(2)}%`
        );
      }

      this.logger.info(
        `[ImageFeatureService] 相似度计算完成，找到 ${similarGroups.length} 组相似图片`
      );

      return similarGroups;
    } catch (error) {
      this.logger.error("[ImageFeatureService] 批量计算相似度失败:", error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // 查找相似图片分组（带完整图片信息，供前端使用）
  async findSimilarImagesWithDetails(
    similarityThreshold: number = 0.9
  ): Promise<
    Array<{
      groupId: number;
      imageCount: number;
      images: Array<{
        id: string;
        url: string;
        fileType: number;
        md5: string;
        createTime: string;
      }>;
    }>
  > {
    let connection;
    try {
      connection = await createDbConnection();

      // 先调用现有方法获取图片ID分组
      const imageIdGroups = await this.findSimilarImages(similarityThreshold);

      if (imageIdGroups.length === 0) {
        return [];
      }

      // 获取所有相似图片的ID列表
      const allImageIds = imageIdGroups.flat();

      // 批量查询图片详细信息
      const placeholders = allImageIds.map(() => "?").join(",");
      const [imageRows] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT 
          CAST(id AS CHAR) as id,
          url,
          file_type,
          md5,
          create_time
         FROM tb_image 
         WHERE id IN (${placeholders})`,
        allImageIds
      );

      // 构建 imageId -> imageInfo 的映射
      const imageMap = new Map<
        string,
        {
          id: string;
          url: string;
          fileType: number;
          md5: string;
          createTime: string;
        }
      >();

      imageRows.forEach((row: mysql.RowDataPacket) => {
        imageMap.set(row.id, {
          id: row.id,
          url: row.url,
          fileType: row.file_type,
          md5: row.md5,
          createTime: row.create_time,
        });
      });

      // 构建带完整信息的分组结果
      const result = imageIdGroups
        .map((group, index) => {
          const images = group
            .map((imageId) => imageMap.get(imageId))
            .filter((img) => img !== undefined); // 过滤掉可能找不到的图片

          return {
            groupId: index + 1,
            imageCount: images.length,
            images,
          };
        })
        .filter((group) => group.images.length > 0); // 过滤掉空分组

      this.logger.info(
        `[ImageFeatureService] 找到 ${result.length} 组相似图片（阈值: ${similarityThreshold}）`
      );

      return result;
    } catch (error: any) {
      this.logger.error(
        "[ImageFeatureService] 查找相似图片分组（带详情）失败:",
        error
      );
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
}
