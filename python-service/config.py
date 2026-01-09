"""
配置文件
支持从环境变量读取配置
"""
import os
from typing import Optional

try:
    from pydantic_settings import BaseSettings
except ImportError:
    # 兼容旧版本的pydantic
    from pydantic import BaseSettings


class Settings(BaseSettings):
    """应用配置"""
    
    # 数据库配置
    postgres_host: str = "47.96.138.112"
    postgres_port: int = 15432
    postgres_user: str = "postgres"
    postgres_password: str = "EerwkVA@m-e9*CNW"
    postgres_database: str = "postgres"
    
    # 服务配置
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # 模型配置
    model_input_size: int = 224  # MobileNetV2输入尺寸
    model_alpha: float = 1.0  # MobileNetV2 alpha参数
    
    # GPU配置
    gpu_memory_growth: bool = True  # 允许GPU内存动态增长
    gpu_device: Optional[str] = None  # 指定GPU设备，None表示自动选择
    
    # 批量处理配置
    batch_size: int = 32  # GPU批量推理的批次大小
    download_workers: int = 8  # 并行下载图片的线程数
    db_batch_size: int = 100  # 批量保存到数据库的批次大小
    process_chunk_size: int = 500  # 每次处理的图片数量（避免一次性处理过多）
    parallel_workers: int = 4  # 并行处理批次的最大线程数
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# 全局配置实例
settings = Settings()
