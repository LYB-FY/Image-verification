import type { EggLogger, Context } from "egg";
import {
  Inject,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPQuery,
  HTTPBody,
  HTTPContext,
} from "@eggjs/tegg";
import { ImageFeatureService } from "../service/ImageFeatureService.js";
import { readFile } from "fs/promises";

@HTTPController({
  path: "/api/image-feature",
})
export class ImageFeatureController {
  @Inject()
  private logger: EggLogger;

  @Inject()
  private imageFeatureService: ImageFeatureService;

  // 处理单个图片
  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: "/process",
  })
  async processImage(@HTTPBody() body: { imageId: string }) {
    try {
      const imageId = BigInt(body.imageId);
      await this.imageFeatureService.processImage(imageId);

      return {
        success: true,
        message: `图片 ID ${imageId} 的特征向量计算完成`,
      };
    } catch (error: any) {
      this.logger.error("[ImageFeatureController] 处理失败:", error);
      return {
        success: false,
        message: error.message || "处理失败",
      };
    }
  }

  // 批量处理图片
  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: "/batch-process",
  })
  async batchProcess(@HTTPBody() body: { limit?: number }) {
    try {
      // 如果不传 limit 或 limit 为 undefined/null，则处理所有数据
      const limit =
        body.limit !== undefined && body.limit !== null
          ? body.limit
          : undefined;
      const result = await this.imageFeatureService.processImages(limit);

      return {
        success: true,
        message: limit
          ? `批量处理完成（限制 ${limit} 条）`
          : "批量处理完成（处理所有数据）",
        data: result,
      };
    } catch (error: any) {
      this.logger.error("[ImageFeatureController] 批量处理失败:", error);
      return {
        success: false,
        message: error.message || "批量处理失败",
      };
    }
  }

  // 查询特征向量
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: "/query",
  })
  async queryFeature(@HTTPQuery({ name: "imageId" }) imageId: string) {
    try {
      // 这里可以添加查询逻辑，暂时返回简单响应
      return {
        success: true,
        message: "查询功能待实现",
        imageId,
      };
    } catch (error: any) {
      this.logger.error("[ImageFeatureController] 查询失败:", error);
      return {
        success: false,
        message: error.message || "查询失败",
      };
    }
  }

  // 前端专用：查找相似图片分组（包含完整图片信息）
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: "/similar-groups",
  })
  async getSimilarGroupsForFrontend(
    @HTTPQuery({ name: "threshold" }) threshold?: string
  ) {
    try {
      // 相似度阈值，默认0.9（90%）
      const similarityThreshold =
        threshold !== undefined ? parseFloat(threshold) : 0.9;

      if (
        isNaN(similarityThreshold) ||
        similarityThreshold < 0 ||
        similarityThreshold > 1
      ) {
        return {
          success: false,
          message: "相似度阈值必须在0-1之间",
        };
      }

      const similarGroups =
        await this.imageFeatureService.findSimilarImagesWithDetails(
          similarityThreshold
        );

      return {
        success: true,
        message: `找到 ${similarGroups.length} 组相似图片`,
        data: {
          groups: similarGroups,
          groupCount: similarGroups.length,
          totalImages: similarGroups.reduce(
            (sum, group) => sum + group.imageCount,
            0
          ),
          threshold: similarityThreshold,
        },
      };
    } catch (error: any) {
      this.logger.error(
        "[ImageFeatureController] 查找相似图片分组失败:",
        error
      );
      return {
        success: false,
        message: error.message || "查找相似图片分组失败",
      };
    }
  }

  // 批量计算相似度，返回相似的图片分组
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: "/similar",
  })
  async findSimilarImages(
    @HTTPQuery({ name: "threshold" }) threshold?: string
  ) {
    try {
      // 相似度阈值，默认1（对应原 [-1,1] 范围的 1）
      // 注意：新算法使用 TensorFlow.js，返回值范围是 [0, 1]
      const similarityThreshold =
        threshold !== undefined ? parseFloat(threshold) : 1;

      if (
        isNaN(similarityThreshold) ||
        similarityThreshold < 0 ||
        similarityThreshold > 1
      ) {
        return {
          success: false,
          message: "相似度阈值必须在0-1之间",
        };
      }

      const similarGroups = await this.imageFeatureService.findSimilarImages(
        similarityThreshold
      );
      return {
        success: true,
        message: `找到 ${similarGroups.length} 组相似图片`,
        data: {
          groups: similarGroups,
          groupCount: similarGroups.length,
          totalSimilarImages: similarGroups.reduce(
            (sum, group) => sum + group.length,
            0
          ),
          threshold: similarityThreshold,
        },
      };
    } catch (error: any) {
      this.logger.error("[ImageFeatureController] 批量计算相似度失败:", error);
      return {
        success: false,
        message: error.message || "批量计算相似度失败",
      };
    }
  }

  // 搜索相似图片：通过图片ID或URL（使用向量索引优化）
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: "/search-by-id-or-url",
  })
  async searchByIdOrUrl(
    @HTTPQuery({ name: "imageId" }) imageId?: string,
    @HTTPQuery({ name: "imageUrl" }) imageUrl?: string,
    @HTTPQuery({ name: "threshold" }) threshold?: string,
    @HTTPQuery({ name: "limit" }) limit?: string
  ) {
    try {
      // 相似度阈值，默认 0.8（80%）
      const similarityThreshold =
        threshold !== undefined ? parseFloat(threshold) : 0.8;

      // 查询限制，默认 100
      const searchLimit = limit !== undefined ? parseInt(limit, 10) : 100;

      // 验证相似度阈值
      if (
        isNaN(similarityThreshold) ||
        similarityThreshold < 0 ||
        similarityThreshold > 1
      ) {
        return {
          success: false,
          message: "相似度阈值必须在0-1之间",
        };
      }

      // 验证查询限制
      if (isNaN(searchLimit) || searchLimit < 1 || searchLimit > 1000) {
        return {
          success: false,
          message: "查询限制必须在1-1000之间",
        };
      }

      // 验证参数：必须提供 imageId 或 imageUrl 之一
      if (!imageId && !imageUrl) {
        return {
          success: false,
          message: "请提供 imageId 或 imageUrl 参数",
        };
      }

      let similarImages;
      let queryInfo: { type: string; value: string };

      if (imageId) {
        // 根据图片ID搜索（使用向量索引优化）
        this.logger.info(
          `[ImageFeatureController] 根据图片ID搜索相似图片: ${imageId}（限制: ${searchLimit}）`
        );
        similarImages =
          await this.imageFeatureService.searchSimilarImagesByImageId(
            imageId,
            similarityThreshold,
            searchLimit
          );
        queryInfo = { type: "imageId", value: imageId };
      } else {
        // 根据图片URL搜索
        this.logger.info(
          `[ImageFeatureController] 根据图片URL搜索相似图片: ${imageUrl}（限制: ${searchLimit}）`
        );
        similarImages = await this.imageFeatureService.searchSimilarImagesByUrl(
          imageUrl!,
          similarityThreshold,
          searchLimit
        );
        queryInfo = { type: "imageUrl", value: imageUrl! };
      }

      return {
        success: true,
        message: `找到 ${similarImages.length} 张相似图片（相似度 >= ${(
          similarityThreshold * 100
        ).toFixed(0)}%）`,
        data: {
          query: queryInfo,
          count: similarImages.length,
          threshold: similarityThreshold,
          limit: searchLimit,
          images: similarImages,
        },
      };
    } catch (error: any) {
      this.logger.error(
        "[ImageFeatureController] 根据ID或URL搜索相似图片失败:",
        error
      );
      return {
        success: false,
        message: error.message || "搜索相似图片失败",
      };
    }
  }

  // 搜索相似图片：接收图片（base64 字符串或文件上传），返回相似度大于阈值的图片信息（使用向量索引优化）
  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: "/search-similar",
  })
  async searchSimilar(
    @HTTPContext() ctx: Context,
    @HTTPBody() body?: { image?: string; threshold?: number; limit?: number }
  ) {
    try {
      let imageBuffer: Buffer;
      let similarityThreshold: number;
      let searchLimit: number;

      // 优先尝试从文件上传获取图片
      const files = (ctx.request as any).files || {};
      const uploadedFile = Array.isArray(files) ? files[0] : files;

      if (uploadedFile && uploadedFile.filepath) {
        // 从文件上传获取图片
        try {
          imageBuffer = await readFile(uploadedFile.filepath);
          this.logger.info(
            `[ImageFeatureController] 从文件上传获取图片: ${uploadedFile.filename}`
          );
        } catch (error: any) {
          this.logger.error(
            "[ImageFeatureController] 读取上传文件失败:",
            error
          );
          return {
            success: false,
            message: `读取上传文件失败: ${error.message}`,
          };
        }

        // 从查询参数获取阈值和限制（文件上传时通常用查询参数）
        const thresholdParam = ctx.query.threshold as string | undefined;
        const limitParam = ctx.query.limit as string | undefined;
        similarityThreshold =
          thresholdParam !== undefined
            ? parseFloat(thresholdParam)
            : body?.threshold !== undefined && body.threshold !== null
            ? body.threshold
            : 0.8;
        searchLimit =
          limitParam !== undefined
            ? parseInt(limitParam, 10)
            : body?.limit !== undefined && body.limit !== null
            ? body.limit
            : 100;
      } else if (body?.image) {
        // 从 base64 字符串获取图片
        try {
          // 支持 data:image/xxx;base64,xxx 格式和纯 base64 字符串
          let base64Data = body.image;
          if (base64Data.includes(",")) {
            base64Data = base64Data.split(",")[1];
          }
          imageBuffer = Buffer.from(base64Data, "base64");
          this.logger.info("[ImageFeatureController] 从 base64 字符串获取图片");
        } catch (error: any) {
          this.logger.error("[ImageFeatureController] Base64 解码失败:", error);
          return {
            success: false,
            message: "图片数据格式错误，请提供有效的 base64 字符串",
          };
        }

        // 相似度阈值，默认 0.8（80%）
        similarityThreshold =
          body.threshold !== undefined && body.threshold !== null
            ? body.threshold
            : 0.8;
        // 查询限制，默认 100
        searchLimit =
          body.limit !== undefined && body.limit !== null ? body.limit : 100;
      } else {
        return {
          success: false,
          message:
            "请提供图片数据：通过 base64 字符串（body.image）或文件上传（multipart/form-data，字段名：file）",
        };
      }

      // 验证相似度阈值
      if (
        isNaN(similarityThreshold) ||
        similarityThreshold < 0 ||
        similarityThreshold > 1
      ) {
        return {
          success: false,
          message: "相似度阈值必须在0-1之间",
        };
      }

      // 验证查询限制
      if (isNaN(searchLimit) || searchLimit < 1 || searchLimit > 1000) {
        return {
          success: false,
          message: "查询限制必须在1-1000之间",
        };
      }

      // 搜索相似图片（使用向量索引优化）
      const similarImages = await this.imageFeatureService.searchSimilarImages(
        imageBuffer,
        similarityThreshold,
        searchLimit
      );

      return {
        success: true,
        message: `找到 ${similarImages.length} 张相似图片（相似度 >= ${(
          similarityThreshold * 100
        ).toFixed(0)}%）`,
        data: {
          count: similarImages.length,
          threshold: similarityThreshold,
          limit: searchLimit,
          images: similarImages,
        },
      };
    } catch (error: any) {
      this.logger.error("[ImageFeatureController] 搜索相似图片失败:", error);
      return {
        success: false,
        message: error.message || "搜索相似图片失败",
      };
    }
  }
}
