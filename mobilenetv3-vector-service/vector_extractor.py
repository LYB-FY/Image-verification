"""
使用 MobileNetV3-Large + GPU 提取图片向量
最小可用版本：输入图片URL，输出特征向量
"""
import os
import logging
import numpy as np
import tensorflow as tf
from PIL import Image
import requests
from io import BytesIO
from typing import List, Optional

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MobileNetV3VectorExtractor:
    """使用 MobileNetV3-Large 提取图片特征向量"""
    
    def __init__(self, input_size: int = 224):
        """
        初始化特征提取器
        
        Args:
            input_size: 模型输入尺寸，默认224
        """
        self.model: Optional[tf.keras.Model] = None
        self.input_size = input_size
        self.use_gpu: bool = False
        self.gpu_device: str = '/GPU:0'
        self._setup_gpu()
        self._load_model()
    
    def _setup_gpu(self):
        """配置GPU设置"""
        try:
            # 检查是否有可用的GPU
            gpus = tf.config.list_physical_devices('GPU')
            
            if gpus:
                logger.info(f"检测到 {len(gpus)} 个GPU设备")
                self.use_gpu = True
                
                # 配置GPU内存增长（必须在设备初始化前设置）
                try:
                    for gpu in gpus:
                        tf.config.experimental.set_memory_growth(gpu, True)
                    logger.info("已启用GPU内存动态增长")
                except RuntimeError as e:
                    # 如果设备已经初始化，这个设置会失败，但不影响使用
                    logger.warning(f"无法设置GPU内存增长（设备可能已初始化）: {e}")
                
                self.gpu_device = '/GPU:0'
                logger.info(f"使用GPU设备: {self.gpu_device}")
            else:
                logger.warning("未检测到GPU设备，将使用CPU")
                self.use_gpu = False
                self.gpu_device = '/CPU:0'
                
        except Exception as e:
            logger.warning(f"GPU配置失败，将使用CPU: {e}")
            self.use_gpu = False
            self.gpu_device = '/CPU:0'
    
    def _load_model(self):
        """加载 MobileNetV3-Large 模型"""
        try:
            device_info = "GPU" if self.use_gpu else "CPU"
            logger.info(f"开始加载 MobileNetV3-Large 模型（使用{device_info}）...")
            
            # 在指定设备上加载模型
            with tf.device(self.gpu_device):
                # 加载预训练的 MobileNetV3-Large 模型
                # include_top=False 表示不包含顶层分类器，只使用特征提取部分
                base_model = tf.keras.applications.MobileNetV3Large(
                    input_shape=(self.input_size, self.input_size, 3),
                    include_top=False,
                    weights='imagenet',
                    pooling='avg'  # 全局平均池化，输出一维特征向量
                )
                
                # 构建特征提取模型
                self.model = base_model
                
                # 预热模型（首次推理通常较慢）
                logger.info(f"预热模型（使用{device_info}）...")
                dummy_input = np.random.random((1, self.input_size, self.input_size, 3))
                _ = self.model.predict(dummy_input, verbose=0)
            
            logger.info(f"MobileNetV3-Large 模型加载完成（使用{device_info}）")
            
            # 打印模型信息
            output_shape = self.model.output_shape
            logger.info(f"模型输出维度: {output_shape}")
            
        except Exception as e:
            logger.error(f"模型加载失败: {e}")
            raise
    
    def _load_image_from_url(self, url: str) -> Image.Image:
        """从URL加载图片"""
        try:
            logger.info(f"从URL加载图片: {url}")
            # 禁用代理，避免代理连接问题
            response = requests.get(
                url, 
                timeout=30,
                proxies={
                    'http': None,
                    'https': None
                },
                verify=True  # 验证SSL证书
            )
            response.raise_for_status()
            image = Image.open(BytesIO(response.content))
            return image
        except Exception as e:
            logger.error(f"从URL加载图片失败: {e}")
            raise
    
    def _preprocess_image(self, image: Image.Image) -> np.ndarray:
        """预处理图片"""
        # 转换为RGB（处理RGBA等格式）
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # 调整大小到模型输入尺寸
        image = image.resize((self.input_size, self.input_size))
        
        # 转换为numpy数组并归一化到[0, 1]
        img_array = np.array(image, dtype=np.float32) / 255.0
        
        # 添加batch维度
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
    
    def extract_vector_from_url(self, url: str) -> List[float]:
        """
        从图片URL提取特征向量
        
        Args:
            url: 图片的URL地址
            
        Returns:
            特征向量列表（L2归一化后的向量）
        """
        if self.model is None:
            raise RuntimeError("模型未加载")
        
        try:
            # 从URL加载图片
            image = self._load_image_from_url(url)
            
            # 预处理图片
            img_array = self._preprocess_image(image)
            
            # 在指定设备上提取特征
            with tf.device(self.gpu_device):
                # 提取特征
                features = self.model.predict(img_array, verbose=0)
            
            # 转换为列表并归一化（L2归一化，用于余弦相似度计算）
            feature_vector = features[0]
            feature_vector = feature_vector / (np.linalg.norm(feature_vector) + 1e-8)
            
            logger.info(f"特征提取成功，向量维度: {len(feature_vector)}")
            return feature_vector.tolist()
            
        except Exception as e:
            logger.error(f"特征提取失败: {e}")
            raise
    
    def get_feature_dimension(self) -> int:
        """获取特征向量维度"""
        if self.model is None:
            return 0
        return int(self.model.output_shape[1])


def main():
    """主函数：演示如何使用"""
    import sys
    
    if len(sys.argv) < 2:
        print("使用方法: python vector_extractor.py <图片URL>")
        print("示例: python vector_extractor.py https://example.com/image.jpg")
        sys.exit(1)
    
    image_url = sys.argv[1]
    
    # 创建特征提取器
    logger.info("初始化特征提取器...")
    extractor = MobileNetV3VectorExtractor()
    
    # 提取特征向量
    logger.info(f"开始提取图片向量: {image_url}")
    vector = extractor.extract_vector_from_url(image_url)
    
    # 输出结果
    print(f"\n特征向量提取成功！")
    print(f"向量维度: {len(vector)}")
    print(f"向量前10个值: {vector[:10]}")
    print(f"向量后10个值: {vector[-10:]}")
    print(f"\n完整向量（JSON格式）:")
    import json
    print(json.dumps(vector, indent=2))


if __name__ == "__main__":
    main()
