"""
图片特征提取服务
使用MobileNetV2模型提取图片特征向量，支持GPU加速
"""
import os
import logging
import numpy as np
import tensorflow as tf
from PIL import Image
import requests
from io import BytesIO
from typing import List, Optional, Union, Tuple
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from config import settings

logger = logging.getLogger(__name__)


class ImageFeatureExtractor:
    """图片特征提取器"""
    
    def __init__(self):
        self.model: Optional[tf.keras.Model] = None
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
                if settings.gpu_memory_growth:
                    try:
                        for gpu in gpus:
                            tf.config.experimental.set_memory_growth(gpu, True)
                        logger.info("已启用GPU内存动态增长")
                    except RuntimeError as e:
                        # 如果设备已经初始化，这个设置会失败，但不影响使用
                        logger.warning(f"无法设置GPU内存增长（设备可能已初始化）: {e}")
                
                # 如果指定了GPU设备，设置可见设备
                if settings.gpu_device:
                    try:
                        tf.config.set_visible_devices(
                            [gpus[int(settings.gpu_device)]], 
                            'GPU'
                        )
                        self.gpu_device = f'/GPU:{settings.gpu_device}'
                        logger.info(f"使用GPU设备: {self.gpu_device}")
                    except (ValueError, IndexError) as e:
                        logger.warning(f"指定的GPU设备无效，使用默认设备: {e}")
                        self.gpu_device = '/GPU:0'
                else:
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
        """加载MobileNetV2模型"""
        try:
            device_info = "GPU" if self.use_gpu else "CPU"
            logger.info(f"开始加载MobileNetV2模型（使用{device_info}）...")
            
            # 在指定设备上加载模型
            with tf.device(self.gpu_device):
                # 加载预训练的MobileNetV2模型
                # include_top=False 表示不包含顶层分类器，只使用特征提取部分
                base_model = tf.keras.applications.MobileNetV2(
                    input_shape=(settings.model_input_size, settings.model_input_size, 3),
                    alpha=settings.model_alpha,
                    include_top=False,
                    weights='imagenet',
                    pooling='avg'  # 全局平均池化，输出一维特征向量
                )
                
                # 构建特征提取模型
                # 输入：图片张量
                # 输出：特征向量（1280维，对于alpha=1.0）
                self.model = base_model
                
                # 预热模型（首次推理通常较慢）
                logger.info(f"预热模型（使用{device_info}）...")
                dummy_input = np.random.random((1, settings.model_input_size, settings.model_input_size, 3))
                _ = self.model.predict(dummy_input, verbose=0)
            
            logger.info(f"MobileNetV2模型加载完成（使用{device_info}）")
            
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
    
    def _load_image_from_path(self, path: Union[str, Path]) -> Image.Image:
        """从本地路径加载图片"""
        try:
            logger.info(f"从本地路径加载图片: {path}")
            image = Image.open(path)
            return image
        except Exception as e:
            logger.error(f"从本地路径加载图片失败: {e}")
            raise
    
    def _preprocess_image(self, image: Image.Image) -> np.ndarray:
        """预处理图片"""
        # 转换为RGB（处理RGBA等格式）
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # 调整大小到模型输入尺寸
        image = image.resize((settings.model_input_size, settings.model_input_size))
        
        # 转换为numpy数组并归一化到[0, 1]
        img_array = np.array(image, dtype=np.float32) / 255.0
        
        # 添加batch维度
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
    
    def extract_features_from_url(self, url: str) -> List[float]:
        """从URL提取特征向量"""
        image = self._load_image_from_url(url)
        return self.extract_features_from_image(image)
    
    def extract_features_from_path(self, path: Union[str, Path]) -> List[float]:
        """从本地路径提取特征向量"""
        image = self._load_image_from_path(path)
        return self.extract_features_from_image(image)
    
    def extract_features_from_bytes(self, image_bytes: bytes) -> List[float]:
        """从字节数据提取特征向量"""
        image = Image.open(BytesIO(image_bytes))
        return self.extract_features_from_image(image)
    
    def extract_features_from_image(self, image: Image.Image) -> List[float]:
        """从PIL Image对象提取特征向量"""
        if self.model is None:
            raise RuntimeError("模型未加载")
        
        try:
            # 预处理图片
            img_array = self._preprocess_image(image)
            
            # 在指定设备上提取特征（明确使用GPU）
            with tf.device(self.gpu_device):
                # 提取特征
                features = self.model.predict(img_array, verbose=0)
            
            # 转换为列表并归一化（L2归一化，用于余弦相似度计算）
            feature_vector = features[0]
            feature_vector = feature_vector / (np.linalg.norm(feature_vector) + 1e-8)
            
            return feature_vector.tolist()
            
        except Exception as e:
            logger.error(f"特征提取失败: {e}")
            raise
    
    def get_feature_dimension(self) -> int:
        """获取特征向量维度"""
        if self.model is None:
            return 0
        return int(self.model.output_shape[1])
    
    def _preprocess_images_batch(self, images: List[Image.Image]) -> np.ndarray:
        """批量预处理图片"""
        img_arrays = []
        for image in images:
            # 转换为RGB（处理RGBA等格式）
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # 调整大小到模型输入尺寸
            image = image.resize((settings.model_input_size, settings.model_input_size))
            
            # 转换为numpy数组并归一化到[0, 1]
            img_array = np.array(image, dtype=np.float32) / 255.0
            img_arrays.append(img_array)
        
        # 堆叠成批次
        return np.stack(img_arrays, axis=0)
    
    def extract_features_batch(self, images: List[Image.Image]) -> List[List[float]]:
        """批量提取特征向量
        
        Args:
            images: PIL Image对象列表
            
        Returns:
            特征向量列表，每个元素是一个特征向量
        """
        if self.model is None:
            raise RuntimeError("模型未加载")
        
        if not images:
            return []
        
        try:
            # 批量预处理图片
            img_batch = self._preprocess_images_batch(images)
            
            # 在指定设备上批量提取特征
            with tf.device(self.gpu_device):
                # 批量推理
                features = self.model.predict(img_batch, verbose=0, batch_size=len(images))
            
            # 转换为列表并归一化（L2归一化，用于余弦相似度计算）
            feature_vectors = []
            for feature_vector in features:
                normalized = feature_vector / (np.linalg.norm(feature_vector) + 1e-8)
                feature_vectors.append(normalized.tolist())
            
            return feature_vectors
            
        except Exception as e:
            logger.error(f"批量特征提取失败: {e}")
            raise
    
    def _download_image_safe(self, url: str) -> Optional[Image.Image]:
        """安全下载图片，失败返回None"""
        try:
            response = requests.get(
                url, 
                timeout=30,
                proxies={
                    'http': None,
                    'https': None
                },
                verify=True
            )
            response.raise_for_status()
            image = Image.open(BytesIO(response.content))
            return image
        except Exception as e:
            logger.warning(f"从URL加载图片失败 {url}: {e}")
            return None
    
    def download_images_parallel(self, urls: List[str], max_workers: Optional[int] = None) -> List[Optional[Image.Image]]:
        """并行下载多张图片
        
        Args:
            urls: 图片URL列表
            max_workers: 最大并发数，None表示使用配置值
            
        Returns:
            图片列表，失败的位置为None
        """
        if max_workers is None:
            max_workers = settings.download_workers
        
        images = [None] * len(urls)
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # 提交所有下载任务
            future_to_index = {
                executor.submit(self._download_image_safe, url): idx 
                for idx, url in enumerate(urls)
            }
            
            # 收集结果
            for future in as_completed(future_to_index):
                idx = future_to_index[future]
                try:
                    images[idx] = future.result()
                except Exception as e:
                    logger.warning(f"下载图片失败 (索引 {idx}): {e}")
                    images[idx] = None
        
        return images
    
    def extract_features_from_urls_batch(self, urls: List[str], batch_size: Optional[int] = None) -> List[Optional[List[float]]]:
        """批量从URL提取特征向量（带并行下载和批量推理）
        
        Args:
            urls: 图片URL列表
            batch_size: GPU批量推理的批次大小，None表示使用配置值
            
        Returns:
            特征向量列表，失败的位置为None
        """
        if batch_size is None:
            batch_size = settings.batch_size
        
        if not urls:
            return []
        
        # 并行下载所有图片
        logger.info(f"开始并行下载 {len(urls)} 张图片...")
        images = self.download_images_parallel(urls)
        
        # 过滤出成功下载的图片，记录索引
        valid_data = [(idx, img) for idx, img in enumerate(images) if img is not None]
        
        if not valid_data:
            logger.warning("没有成功下载任何图片")
            return [None] * len(urls)
        
        logger.info(f"成功下载 {len(valid_data)}/{len(urls)} 张图片，开始批量提取特征...")
        
        # 批量提取特征
        valid_indices, valid_images = zip(*valid_data)
        all_features = []
        
        # 分批处理
        for i in range(0, len(valid_images), batch_size):
            batch_images = valid_images[i:i+batch_size]
            batch_features = self.extract_features_batch(list(batch_images))
            all_features.extend(batch_features)
            logger.debug(f"已处理 {min(i+batch_size, len(valid_images))}/{len(valid_images)} 张图片")
        
        # 构建完整的结果列表（包含失败的位置）
        result = [None] * len(urls)
        for idx, features in zip(valid_indices, all_features):
            result[idx] = features
        
        logger.info(f"批量特征提取完成：成功 {len(all_features)}/{len(urls)}")
        return result


# 全局特征提取器实例
_feature_extractor: Optional[ImageFeatureExtractor] = None


def get_feature_extractor() -> ImageFeatureExtractor:
    """获取特征提取器单例"""
    global _feature_extractor
    if _feature_extractor is None:
        _feature_extractor = ImageFeatureExtractor()
    return _feature_extractor
