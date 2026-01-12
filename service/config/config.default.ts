import { defineConfigFactory, type PartialEggConfig } from "egg";

export default defineConfigFactory((appInfo) => {
  const config = {
    // use for cookie sign key, should change to your own and keep security
    keys: appInfo.name + "_{{keys}}",

    // add your egg config in here
    middleware: [] as string[],

    // change multipart mode to file
    // @see https://github.com/eggjs/multipart/blob/master/src/config/config.default.ts#L104
    multipart: {
      mode: "file" as const,
      fileSize: "50mb", // 设置上传文件的最大尺寸
      whitelist: [".jpg", ".jpeg", ".png", ".gif", ".webp"], // 允许上传的文件类型
      // 清理临时文件的定时任务配置
      cleanSchedule: {
        cron: "0 30 4 * * *", // 每天凌晨 4:30 清理临时文件（需要启用 schedule 插件）
        disable: true, // 暂时禁用清理任务，避免需要 schedule 插件
      },
    },

    // cors configuration
    cors: {
      origin: "*", // 允许所有域名访问，生产环境请修改为特定域名
      allowMethods: "GET,HEAD,PUT,POST,DELETE,PATCH",
    },

    // 禁用 CSRF 保护（API 服务通常不需要）
    security: {
      csrf: {
        enable: false,
      },
    },
  } as PartialEggConfig;

  // add your special config in here
  // Usage: `app.config.bizConfig.sourceUrl`
  const bizConfig = {
    sourceUrl: `https://github.com/eggjs/examples/tree/master/${appInfo.name}`,
  };

  // PostgreSQL database config
  const postgres = {
    host: "47.96.138.112",
    port: 15432,
    user: "postgres",
    password: "EerwkVA@m-e9*CNW",
    database: "postgres",
  };

  // the return config will combines to EggAppConfig
  return {
    ...config,
    bizConfig,
    postgres,
  };
});
