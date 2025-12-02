"use client";

import { useEffect, useState } from "react";
import { preloadModel, isModelLoaded } from "@/utils/imageSimilarity";

/**
 * 模型预加载组件
 * 在应用启动时预加载 MobileNet 模型，确保后续使用无需等待
 */
export default function ModelLoader() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 如果模型已经加载，直接返回
    if (isModelLoaded()) {
      setLoading(false);
      return;
    }

    // 在组件挂载时预加载模型
    const loadModel = async () => {
      try {
        console.log("🚀 开始预加载 MobileNet 模型...");
        await preloadModel();
        console.log("✅ MobileNet 模型预加载完成");
        setLoading(false);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "模型加载失败";
        console.error("❌ 模型预加载失败:", errorMessage);
        setError(errorMessage);
        setLoading(false);
      }
    };

    loadModel();
  }, []);

  // 这个组件不渲染任何 UI，只是后台加载模型
  return null;
}
