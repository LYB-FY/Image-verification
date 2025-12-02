import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";

let model: mobilenet.MobileNet | null = null;
let backendInitialized = false;
let modelLoadingPromise: Promise<mobilenet.MobileNet> | null = null;
let modelLoaded = false;

/**
 * 初始化 TensorFlow.js 后端
 */
async function initializeBackend(): Promise<void> {
  if (backendInitialized) {
    return;
  }

  // 检查是否在浏览器环境中
  if (typeof window === "undefined") {
    throw new Error("TensorFlow.js 需要在浏览器环境中运行");
  }

  try {
    // 首先尝试使用 WebGL 后端（更快）
    const backends = ["cpu", "webgl"];
    let backendSet = false;

    for (const backendName of backends) {
      try {
        await tf.setBackend(backendName);
        await tf.ready();
        console.log(`TensorFlow.js 后端已初始化: ${backendName}`);
        backendSet = true;
        break;
      } catch (err) {
        // 如果这个后端不可用，尝试下一个
        console.log(`无法使用 ${backendName} 后端，尝试下一个...`);
        continue;
      }
    }

    if (!backendSet) {
      // 如果所有后端都失败，尝试默认初始化
      await tf.ready();
      const currentBackend = tf.getBackend();
      if (!currentBackend) {
        throw new Error("无法初始化任何 TensorFlow.js 后端");
      }
      console.log(`TensorFlow.js 使用默认后端: ${currentBackend}`);
    }

    backendInitialized = true;
  } catch (error) {
    console.error("初始化 TensorFlow.js 后端失败:", error);
    throw new Error(
      `无法初始化 TensorFlow.js 后端: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * 获取本地模型 URL
 */
function getLocalModelUrl(): string {
  // 优先使用环境变量指定的 URL
  if (process.env.NEXT_PUBLIC_MOBILENET_MODEL_URL) {
    return process.env.NEXT_PUBLIC_MOBILENET_MODEL_URL;
  }

  // 默认路径：从 public 目录加载
  // Next.js 的 public 目录下的文件可以通过根路径访问
  return "/models/mobilenet_v2_1.0_224/model.json";
}

/**
 * 加载 MobileNet 模型（内部函数）
 */
async function loadModelInternal(): Promise<mobilenet.MobileNet> {
  // 确保后端已初始化
  await initializeBackend();

  if (model) {
    return model;
  }

  // 如果正在加载，等待加载完成
  if (modelLoadingPromise) {
    return modelLoadingPromise;
  }

  // 开始加载模型
  modelLoadingPromise = (async () => {
    // 尝试从本地文件加载
    const localModelUrl = getLocalModelUrl();

    try {
      console.log(`尝试从本地文件加载模型: ${localModelUrl}`);
      model = await mobilenet.load({
        version: 2,
        alpha: 1.0,
        modelUrl: localModelUrl,
      });
      console.log("MobileNetV2 模型从本地文件加载成功");
      modelLoaded = true;
      return model;
    } catch (localError: any) {
      console.warn(`从本地文件加载失败: ${localError.message}，尝试从网络加载`);
      // 如果本地文件不存在或加载失败，尝试从网络加载
      try {
        model = await mobilenet.load({
          version: 2,
          alpha: 1.0,
        });
        console.log("MobileNetV2 模型从网络加载成功");
        modelLoaded = true;
        return model;
      } catch (networkError: any) {
        console.error("模型加载失败:", networkError);
        modelLoadingPromise = null;
        throw new Error(`无法加载模型: ${networkError.message}`);
      }
    }
  })();

  return modelLoadingPromise;
}

/**
 * 加载 MobileNet 模型（公开函数，用于按需加载）
 */
async function loadModel(): Promise<mobilenet.MobileNet> {
  return loadModelInternal();
}

/**
 * 预加载 MobileNet 模型（在应用启动时调用）
 * @returns Promise，模型加载完成后 resolve
 */
export async function preloadModel(): Promise<mobilenet.MobileNet> {
  if (modelLoaded && model) {
    return model;
  }
  return loadModelInternal();
}

/**
 * 检查模型是否已加载
 */
export function isModelLoaded(): boolean {
  return modelLoaded && model !== null;
}

/**
 * 从图片 URL 创建 Image 元素
 */
function createImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 提取图片特征向量
 */
async function extractFeatures(imageSrc: string): Promise<tf.Tensor1D> {
  const model = await loadModel();
  const img = await createImageElement(imageSrc);

  // 使用 MobileNet 进行特征提取
  const activation = model.infer(img, true) as tf.Tensor;

  // 确保返回一维张量
  const features = activation.flatten();

  return features as tf.Tensor1D;
}

/**
 * 计算余弦相似度
 * 注意：MobileNet 特征向量的余弦相似度通常在 [0, 1] 范围内
 */
function cosineSimilarity(vec1: tf.Tensor1D, vec2: tf.Tensor1D): number {
  // 计算点积
  const dotProduct = vec1.dot(vec2).dataSync()[0];

  // 计算向量的模
  const norm1 = vec1.norm().dataSync()[0];
  const norm2 = vec2.norm().dataSync()[0];

  // 计算余弦相似度
  const similarity = dotProduct / (norm1 * norm2);

  // 直接返回余弦相似度，确保在 [0, 1] 范围内
  // 对于 MobileNet 特征向量，余弦相似度通常不会是负数
  return Math.max(0, Math.min(1, similarity));
}

/**
 * 计算两张图片的相似度
 * @param image1Src 第一张图片的 base64 或 URL
 * @param image2Src 第二张图片的 base64 或 URL
 * @returns 相似度分数 (0-1)
 */
export async function calculateSimilarity(
  image1Src: string,
  image2Src: string
): Promise<number> {
  try {
    // 提取两张图片的特征
    const [features1, features2] = await Promise.all([
      extractFeatures(image1Src),
      extractFeatures(image2Src),
    ]);

    // 计算相似度
    const similarity = cosineSimilarity(features1, features2);

    // 清理张量
    features1.dispose();
    features2.dispose();

    return similarity;
  } catch (error) {
    console.error("计算相似度时出错:", error);
    throw new Error("无法计算图片相似度，请确保图片格式正确");
  }
}
