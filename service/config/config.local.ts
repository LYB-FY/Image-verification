import { defineConfig } from "egg";

export default defineConfig({
  // 本地数据库配置（覆盖默认配置）
  sequelize: {
    host: "127.0.0.1",
    port: 3306,
    database: "demo",
    username: "root",
    password: "root",
  },
  // 禁用 CSRF 保护（API 服务通常不需要）
  security: {
    csrf: {
      enable: false,
    },
  },
});
