import type { Application } from "egg";
import { ImageFeatureService } from "./app/module/bar/service/ImageFeatureService.js";

/**
 * 应用启动时的初始化逻辑
 * 在应用启动完成后预加载 MobileNet 模型
 */
export default class AppBootHook {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  /**
   * 应用启动完成后的钩子
   * 在这里预加载模型，确保后续请求无需等待模型加载
   */
  async didReady() {
    const logger = this.app.logger;
    logger.info("[AppBootHook] 应用启动完成，开始预加载 MobileNet 模型...");

    try {
      // 获取 ImageFeatureService 实例
      // 使用 Egg.js 的 getEggObject 方法获取 tegg 服务实例
      const imageFeatureService = await (this.app as any).getEggObject(
        ImageFeatureService
      );

      if (imageFeatureService) {
        // 在后台预加载模型（不阻塞应用启动）
        imageFeatureService.preloadModel().catch((error: any) => {
          logger.error(
            "[AppBootHook] 模型预加载失败（不影响服务启动）:",
            error
          );
          logger.warn("[AppBootHook] 模型将在首次使用时尝试加载");
        });
      } else {
        logger.warn(
          "[AppBootHook] 无法获取 ImageFeatureService 实例，模型将在首次使用时加载"
        );
      }
    } catch (error: any) {
      logger.error("[AppBootHook] 预加载模型时出错:", error);
      logger.warn("[AppBootHook] 模型将在首次使用时尝试加载，服务可以正常启动");
    }
  }
}
