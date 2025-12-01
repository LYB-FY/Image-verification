import { defineConfig } from "egg";

export default defineConfig({
  // PostgreSQL 本地配置（如需覆盖默认配置）
  // postgres: {
  //   host: "localhost",
  //   port: 5432,
  //   user: "postgres",
  //   password: "postgres",
  //   database: "postgres",
  // },

  // 禁用 CSRF 保护（API 服务通常不需要）
  security: {
    csrf: {
      enable: false,
    },
  },
});
