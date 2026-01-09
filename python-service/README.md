# 图片特征向量提取服务（Python + GPU）

使用MobileNetV2模型和GPU对图片进行向量初始化的Python服务。

## 功能特性

- ✅ 使用MobileNetV2模型提取图片特征向量
- ✅ 支持GPU加速（自动检测并使用GPU）
- ✅ 支持从URL、本地文件、上传文件提取特征
- ✅ 自动保存特征向量到PostgreSQL数据库
- ✅ 提供REST API接口
- ✅ 支持批量处理图片

## 环境要求

- Python 3.8+
- CUDA（如果使用GPU）
- cuDNN（如果使用GPU）
- PostgreSQL数据库

## 安装步骤

### 1. 安装Python依赖

```bash
cd python-service
pip install -r requirements.txt
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置数据库连接信息等。

### 3. 验证GPU（可选）

如果使用GPU，确保已安装CUDA和cuDNN：

```bash
python -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"
```

如果输出显示GPU设备，说明GPU配置成功。

## 运行服务

### 开发模式

```bash
python app.py
```

或使用uvicorn：

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### 生产模式

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4
```

服务启动后，访问：
- API文档：http://localhost:8000/docs
- 健康检查：http://localhost:8000/health

## API接口

### 1. 健康检查

```bash
GET /health
```

### 2. 从URL提取特征向量

```bash
POST /extract/url?image_url=https://example.com/image.jpg
```

### 3. 从上传文件提取特征向量

```bash
POST /extract/upload
Content-Type: multipart/form-data

file: <图片文件>
```

### 4. 处理单张图片（提取并保存）

```bash
POST /process/image
Content-Type: application/json

{
  "image_id": "123456",
  "image_url": "https://example.com/image.jpg"  // 可选
}
```

### 5. 批量处理图片

```bash
POST /process/batch
Content-Type: application/json

["123456", "789012", "345678"]
```

### 6. 处理所有图片（从数据库读取）

```bash
POST /process/all
Content-Type: application/json

{
  "limit": 100,           // 可选，限制处理数量，不传则处理所有
  "skip_processed": true, // 可选，是否跳过已处理的图片（默认true）
  "force_reprocess": false // 可选，是否强制重新处理（默认false）
}
```

**说明**：
- 该接口会从 `ecai.tb_image` 表读取所有图片
- 提取特征向量并保存到 `tb_hsx_img_value` 表
- `skip_processed=true` 时只处理未处理的图片
- `force_reprocess=true` 时会重新处理已存在的图片

## 使用示例

### Python示例

```python
import requests

# 从URL提取特征
response = requests.post(
    "http://localhost:8000/extract/url",
    params={"image_url": "https://example.com/image.jpg"}
)
features = response.json()["feature_vector"]

# 处理单张图片
response = requests.post(
    "http://localhost:8000/process/image",
    json={
        "image_id": "123456",
        "image_url": "https://example.com/image.jpg"
    }
)
```

### cURL示例

```bash
# 提取特征向量
curl -X POST "http://localhost:8000/extract/url?image_url=https://example.com/image.jpg"

# 处理图片
curl -X POST "http://localhost:8000/process/image" \
  -H "Content-Type: application/json" \
  -d '{"image_id": "123456", "image_url": "https://example.com/image.jpg"}'
```

## 配置说明

### GPU配置

- `GPU_MEMORY_GROWTH=true`: 允许GPU内存动态增长（推荐）
- `GPU_DEVICE`: 指定使用的GPU设备索引，留空表示自动选择

### 模型配置

- `MODEL_INPUT_SIZE=224`: MobileNetV2输入图片尺寸
- `MODEL_ALPHA=1.0`: MobileNetV2的alpha参数（控制模型大小）

## 性能优化

1. **GPU加速**: 确保安装了CUDA和cuDNN，服务会自动使用GPU
2. **批量处理**: 使用 `/process/batch` 接口批量处理图片
3. **连接池**: 数据库连接使用连接池，提高并发性能

## 故障排查

### GPU未使用

1. 检查CUDA和cuDNN是否正确安装
2. 运行 `nvidia-smi` 查看GPU状态
3. 检查TensorFlow是否检测到GPU：`python -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"`

### 模型加载失败

1. 确保网络连接正常（首次运行需要下载模型）
2. 检查磁盘空间是否充足
3. 查看日志获取详细错误信息

### 数据库连接失败

1. 检查 `.env` 文件中的数据库配置
2. 确保数据库服务正在运行
3. 检查网络连接和防火墙设置

## 与Node.js服务的区别

- **性能**: Python服务使用原生TensorFlow，GPU性能更好
- **模型**: 使用Keras预训练模型，无需下载额外文件
- **部署**: 可以作为独立服务运行，也可以与Node.js服务配合使用

## 许可证

MIT
