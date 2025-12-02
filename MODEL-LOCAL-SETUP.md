# 本地模型文件配置说明

## 概述

代码已配置为优先从本地文件加载 MobileNetV2 模型。如果本地文件不存在，会自动回退到从网络加载。

## 模型文件结构

MobileNetV2 模型需要以下文件结构：

```
models/
└── mobilenet_v2_1.0_224/
    ├── model.json
    ├── weights_manifest.json
    └── group1-shard*.bin (多个权重文件)
```

## 下载模型文件

### 方法一：使用脚本下载（推荐）

项目已包含下载脚本，直接运行即可：

**后端模型下载：**
```bash
cd service
npm run download-model
```

**前端模型下载：**
```bash
cd web
npm run download-model
```

脚本会自动：
- 创建必要的目录
- 下载所有必需的模型文件
- 显示下载进度
- 跳过已存在的文件

### 方法二：手动下载（如果脚本失败）

```javascript
const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_BASE_URL = 'https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224';
const MODEL_DIR = path.join(__dirname, 'models', 'mobilenet_v2_1.0_224');

// 创建目录
if (!fs.existsSync(MODEL_DIR)) {
  fs.mkdirSync(MODEL_DIR, { recursive: true });
}

// 需要下载的文件列表
const files = [
  'model.json',
  'weights_manifest.json',
  'group1-shard1of5.bin',
  'group1-shard2of5.bin',
  'group1-shard3of5.bin',
  'group1-shard4of5.bin',
  'group1-shard5of5.bin',
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function downloadModel() {
  console.log('开始下载 MobileNetV2 模型文件...');
  
  for (const file of files) {
    const url = `${MODEL_BASE_URL}/${file}`;
    const dest = path.join(MODEL_DIR, file);
    console.log(`下载: ${file}...`);
    try {
      await downloadFile(url, dest);
      console.log(`✅ ${file} 下载完成`);
    } catch (error) {
      console.error(`❌ ${file} 下载失败:`, error.message);
    }
  }
  
  console.log('模型下载完成！');
}

downloadModel();
```

运行脚本：

```bash
node download-model.js
```

### 方法二：手动下载

1. 访问模型 URL：
   - 默认 CDN: `https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/`
   - 中国镜像: `https://www.gstaticcnapps.cn/tfjs-models/savedmodel/mobilenet_v2_1.0_224/`

2. 下载以下文件到对应目录：
   - `model.json`
   - `weights_manifest.json`
   - `group1-shard1of5.bin` 到 `group1-shard5of5.bin` (5个权重文件)

3. 将文件放置在：
   - **后端**: `service/models/mobilenet_v2_1.0_224/`
   - **前端**: `web/public/models/mobilenet_v2_1.0_224/`

## 配置路径

### 后端服务（Node.js）

默认路径：`service/models/mobilenet_v2_1.0_224/model.json`

可以通过环境变量自定义：

```bash
export MOBILENET_MODEL_PATH=/path/to/models/mobilenet_v2_1.0_224/model.json
```

### 前端（Next.js）

默认路径：`web/public/models/mobilenet_v2_1.0_224/model.json`

可以通过环境变量自定义（在 `.env.local` 文件中）：

```bash
NEXT_PUBLIC_MOBILENET_MODEL_URL=/models/mobilenet_v2_1.0_224/model.json
```

或者使用完整 URL：

```bash
NEXT_PUBLIC_MOBILENET_MODEL_URL=http://localhost:3000/models/mobilenet_v2_1.0_224/model.json
```

## 验证安装

### 后端

启动服务后，查看日志：

- 成功从本地加载：`MobileNetV2 模型从本地文件加载成功`
- 回退到网络：`本地模型文件不存在，尝试从网络加载`

### 前端

打开浏览器控制台，查看日志：

- 成功从本地加载：`MobileNetV2 模型从本地文件加载成功`
- 回退到网络：`从本地文件加载失败，尝试从网络加载`

## 文件大小

模型文件总大小约为 14-15 MB：

- `model.json`: ~50 KB
- `weights_manifest.json`: ~5 KB
- `group1-shard*.bin`: 每个约 2.8 MB (共 5 个文件)

## 注意事项

1. **路径正确性**：确保所有文件都在正确的目录下，且路径正确
2. **文件完整性**：确保所有文件都已下载，缺少任何文件都会导致加载失败
3. **网络回退**：如果本地文件不存在或损坏，代码会自动尝试从网络加载
4. **CORS 问题**：前端从本地文件加载时，确保 Next.js 正确配置了静态文件服务

## 故障排查

### 问题：模型加载失败

1. **检查文件是否存在**：
   ```bash
   # 后端
   ls -la service/models/mobilenet_v2_1.0_224/
   
   # 前端
   ls -la web/public/models/mobilenet_v2_1.0_224/
   ```

2. **检查文件权限**：确保文件可读

3. **检查路径配置**：确认环境变量或默认路径正确

4. **查看错误日志**：检查具体的错误信息

### 问题：前端无法加载模型

1. 确保文件在 `web/public/` 目录下（Next.js 的静态文件目录）
2. 检查 Next.js 开发服务器是否正常运行
3. 检查浏览器控制台的网络请求，确认文件路径正确

### 问题：后端无法加载模型

1. 确保文件路径使用绝对路径或相对于 `process.cwd()` 的正确路径
2. 检查 Node.js 文件系统权限
3. 确认 `tf.io.fileSystem()` 可以访问文件

## 使用 Docker

如果使用 Docker 部署，需要：

1. 在 Dockerfile 中复制模型文件：
   ```dockerfile
   COPY models/ /app/models/
   ```

2. 或者在 docker-compose.yml 中挂载卷：
   ```yaml
   volumes:
     - ./models:/app/models
   ```
