import type { EggLogger } from "egg";
import {
  Inject,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPBody,
} from "@eggjs/tegg";
import { ImageFeatureService } from "../service/ImageFeatureService.js";
import { createDbConnection } from "../../../utils/db.js";

@HTTPController({
  path: "/api",
})
export class TestController {
  @Inject()
  private logger: EggLogger;

  @Inject()
  private imageFeatureService: ImageFeatureService;

  // 批量查询相似图片接口
  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: "/test",
  })
  async test(@HTTPBody() body: { imageIds: string[] }) {
    try {
      // 验证请求参数
      if (!body || !Array.isArray(body.imageIds)) {
        this.logger.warn(
          "[TestController] 请求参数错误，需要提供 imageIds 数组"
        );
        return [];
      }

      const imageIds = body.imageIds;
      if (imageIds.length === 0) {
        return [];
      }

      this.logger.info(
        `[TestController] 开始处理 ${imageIds.length} 个图片ID的相似图片查询`
      );

      // 连接数据库
      const client = await createDbConnection();

      try {
        // 批量查询图片信息（URL）
        const placeholders = imageIds
          .map((_, index) => `$${index + 1}`)
          .join(",");
        const imagesResult = await client.query(
          `SELECT id::text as id, url 
           FROM ecai.tb_image 
           WHERE id::text IN (${placeholders})`,
          imageIds
        );

        // 构建 imageId -> url 的映射
        const imageMap = new Map<string, string>();
        imagesResult.rows.forEach((row) => {
          imageMap.set(row.id, row.url);
        });

        // 处理每个图片ID，查询相似图片
        const results = await Promise.all(
          imageIds.map(async (imageId) => {
            try {
              // 获取图片URL
              const url = imageMap.get(imageId) || "";

              // 如果图片不存在，返回空结果
              if (!url) {
                this.logger.warn(
                  `[TestController] 图片ID ${imageId} 不存在，跳过`
                );
                return {
                  url: "",
                  imageId: imageId,
                  similarities: [],
                };
              }

              // 查询相似图片（限制30个，相似度阈值0.9）
              const similarImages =
                await this.imageFeatureService.searchSimilarImagesByImageId(
                  imageId,
                  0.9, // 相似度阈值
                  30 // 限制最多30个
                );

              // 格式化相似图片列表，返回URL（也可以返回ID，根据需求调整）
              const similarities = similarImages.map((img) => {
                // 返回相似图片的URL
                return img.url;
              });

              return {
                url: url,
                imageId: imageId,
                similarities: similarities,
              };
            } catch (error: any) {
              this.logger.error(
                `[TestController] 处理图片ID ${imageId} 失败:`,
                error
              );
              // 即使某个图片处理失败，也返回结果（相似图片为空）
              return {
                url: imageMap.get(imageId) || "",
                imageId: imageId,
                similarities: [],
              };
            }
          })
        );

        this.logger.info(
          `[TestController] 成功处理 ${results.length} 个图片的相似图片查询`
        );

        return results;
      } finally {
        await client.end();
      }
    } catch (error: any) {
      this.logger.error("[TestController] 批量查询相似图片失败:", error);
      // 返回错误信息，但保持数组格式
      return [];
    }
  }
}
