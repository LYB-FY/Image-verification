import { defineConfig } from "egg";

export default defineConfig({
  // 禁用 CSRF 保护（API 服务通常不需要）
  security: {
    csrf: {
      enable: false,
    },
  },
});
