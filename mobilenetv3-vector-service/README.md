# MobileNetV3-Large 图片向量提取服务

使用 Python + MobileNetV3-Large + GPU 提取图片特征向量的最小可用版本。

## 功能

- 输入图片 URL，输出特征向量
- 支持 GPU 加速（自动检测，无 GPU 时使用 CPU）
- 使用 MobileNetV3-Large 预训练模型
- 输出 L2 归一化的特征向量

## 环境要求

- Python 3.7+
- TensorFlow 2.10.1（支持 GPU）
- CUDA 和 cuDNN（如需使用 GPU）

## 安装

1. 安装依赖：

```bash
pip install -r requirements.txt
```

2. （可选）如果使用 GPU，请确保已安装 CUDA 和 cuDNN，并安装 TensorFlow GPU 版本。

## 使用方法

### 命令行使用

```bash
python vector_extractor.py <图片URL>
```

示例：

```bash
python vector_extractor.py https://example.com/image.jpg
```

### 代码中使用

```python
from vector_extractor import MobileNetV3VectorExtractor

# 创建特征提取器
extractor = MobileNetV3VectorExtractor()

# 从URL提取向量
vector = extractor.extract_vector_from_url("https://example.com/image.jpg")

print(f"向量维度: {len(vector)}")
print(f"向量: {vector}")
```

## 输出说明

- **向量维度**: MobileNetV3-Large 输出 960 维特征向量（使用全局平均池化）
- **向量格式**: L2 归一化的浮点数列表，适合用于余弦相似度计算
- **输出格式**: JSON 格式的向量数组

## 模型信息

- **模型**: MobileNetV3-Large
- **输入尺寸**: 224x224
- **预训练权重**: ImageNet
- **特征维度**: 960

## GPU 支持

程序会自动检测 GPU 设备：
- 如果检测到 GPU，会自动使用 GPU 加速
- 如果未检测到 GPU，会回退到 CPU
- GPU 内存采用动态增长策略，避免内存溢出

## 注意事项

1. 首次运行时会自动下载 MobileNetV3-Large 预训练模型（约 20MB）
2. 确保网络连接正常，能够访问图片 URL
3. 支持的图片格式：JPEG、PNG、GIF 等 PIL 支持的格式
