# PostgreSQL 数据库迁移完成说明

## 迁移概述

所有数据库操作已从 MySQL 迁移到 PostgreSQL，并使用 `pgvector` 扩展的 `vector` 类型存储特征向量。

## 数据库结构

### 1. ecai 模式（Schema）
- **tb_image** - 图片信息表（已存在）
  - id (BIGINT) - 主键
  - md5 (VARCHAR) - 图片MD5
  - url (VARCHAR) - 图片URL
  - file_type (SMALLINT) - 文件类型
  - create_time (TIMESTAMP) - 创建时间

### 2. public 模式（Schema）
- **tb_hsx_img_value** - 图片特征向量表（新建）
  - id (BIGSERIAL) - 主键
  - image_id (BIGINT) - 关联图片ID（外键引用 ecai.tb_image.id）
  - feature_vector (vector(1280)) - 特征向量（使用 pgvector 类型）
  - vector_dimension (INTEGER) - 向量维度（默认1280）
  - model_version (VARCHAR) - 模型版本（默认 MobileNetV2）
  - create_time (TIMESTAMP) - 创建时间
  - update_time (TIMESTAMP) - 更新时间

## 主要变更

### 1. 数据类型变更
- **JSON → vector(1280)**：特征向量从 JSONB 改为 pgvector 的 vector 类型
- **向量存储格式**：`'[1,2,3,...]'` 字符串格式
- **查询格式**：使用 `feature_vector::text` 转换为文本进行读取

### 2. 表引用变更
- **跨模式引用**：`ecai.tb_image` 位于 ecai 模式
- **外键关系**：`public.tb_hsx_img_value.image_id` → `ecai.tb_image.id`

### 3. 代码变更

#### 插入向量（之前）
```typescript
// JSONB 格式
await client.query(
  `INSERT INTO tb_hsx_img_value (...) VALUES (..., $2::jsonb, ...)`,
  [imageId, JSON.stringify(featureVector), ...]
);
```

#### 插入向量（现在）
```typescript
// vector 格式
const vectorString = `[${featureVector.join(",")}]`;
await client.query(
  `INSERT INTO tb_hsx_img_value (...) VALUES (..., $2::vector, ...)`,
  [imageId, vectorString, ...]
);
```

#### 查询向量（之前）
```typescript
// JSONB 格式
const result = await client.query(
  `SELECT feature_vector FROM tb_hsx_img_value WHERE ...`
);
const vector = JSON.parse(result.rows[0].feature_vector);
```

#### 查询向量（现在）
```typescript
// vector 格式
const result = await client.query(
  `SELECT feature_vector::text as feature_vector FROM tb_hsx_img_value WHERE ...`
);
const vector = JSON.parse(result.rows[0].feature_vector) as number[];
```

## 已更新的文件

### 服务层
1. ✅ **app/module/bar/service/ImageFeatureService.ts**
   - 所有数据库操作使用 PostgreSQL
   - 特征向量使用 vector 类型
   - 所有 tb_image 引用改为 ecai.tb_image
   - 使用 `dataSync()` 同步获取张量数据

### 脚本文件
1. ✅ **scripts/check-db.ts** - 检查数据库（PostgreSQL）
2. ✅ **scripts/create-feature-table.ts** - 创建特征表（PostgreSQL）
3. ✅ **scripts/import-images.ts** - 导入图片（PostgreSQL）
4. ✅ **scripts/query-images.ts** - 查询图片（PostgreSQL）
5. ✅ **scripts/test-api.ts** - API测试（PostgreSQL）
6. ✅ **scripts/test-search-api.ts** - 搜索API测试（PostgreSQL）
7. ✅ **scripts/create-postgres-tables.ts** - 创建表（JSONB版本）
8. ✅ **scripts/create-postgres-vector-table.ts** - 创建表（vector版本）⭐
9. ✅ **scripts/read-postgres-schema.ts** - 读取模式结构
10. ✅ **scripts/import-all-images-to-vector.ts** - 批量导入（Worker版本）
11. ✅ **scripts/import-all-images-to-vector-parallel.ts** - 批量导入（Promise并发版本）⭐

### 工具文件
1. ✅ **app/utils/db.ts**
   - 添加 PostgreSQL 支持
   - `createDbConnection()` 默认使用 PostgreSQL
   - 保留 MySQL 兼容函数（createMySQLConnection 等）

## 性能优化

### pgvector 索引
使用 HNSW 索引加速向量相似度搜索：
```sql
CREATE INDEX idx_hsx_img_value_vector_hnsw 
ON tb_hsx_img_value 
USING hnsw (feature_vector vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### 并发处理
- 使用 Promise 池控制并发
- 自动根据 CPU 核心数调整并发数
- 支持断点续传（跳过已处理的图片）

## 使用指南

### 1. 创建向量表
```bash
npm run create-postgres-vector-table
```

### 2. 导入所有图片向量（并行处理）
```bash
npm run import-all-images-to-vector
```

### 3. 检查数据库结构
```bash
npm run check-db              # 查看所有模式和表
npm run read-postgres-schema  # 查看 ecai 模式详细信息
```

### 4. 测试 API
```bash
npm run test-api              # 测试基本功能
npm run test-search-api       # 测试搜索功能
```

## API 接口

所有 API 接口已自动使用 PostgreSQL，无需修改调用方式：

### 1. 处理单个图片
```
POST /api/image-feature/process
Body: { "imageId": "123" }
```

### 2. 批量处理图片
```
POST /api/image-feature/batch-process
Body: { "limit": 10 }  // 可选，不传则处理所有
```

### 3. 搜索相似图片（根据ID或URL）
```
GET /api/image-feature/search-by-id-or-url?imageId=123&threshold=0.8
GET /api/image-feature/search-by-id-or-url?imageUrl=https://...&threshold=0.9
```

### 4. 搜索相似图片（上传图片）
```
POST /api/image-feature/search-similar
Body: { "image": "base64...", "threshold": 0.8 }
或文件上传 (multipart/form-data)
```

### 5. 查找相似图片分组
```
GET /api/image-feature/similar-groups?threshold=0.9
```

## 注意事项

1. **pgvector 扩展**：确保 PostgreSQL 已安装 pgvector 扩展
2. **跨模式引用**：tb_image 在 ecai 模式，tb_hsx_img_value 在 public 模式
3. **向量格式**：存储为 `vector(1280)` 类型，查询时需转换为 text
4. **并发处理**：建议根据服务器配置调整并发数（默认 = CPU 核心数）
5. **内存管理**：每个并发任务独立加载模型，注意内存占用

## 性能对比

### 使用 vector 类型的优势
1. **存储优化**：相比 JSONB，vector 类型更紧凑
2. **索引支持**：支持 HNSW、IVFFlat 等向量索引
3. **查询加速**：向量相似度搜索可使用索引（当数据量大时）
4. **类型安全**：数据库层面保证向量维度正确

### 并行处理性能
- 单线程：约 1-2 张/秒
- 并行处理（4核）：约 4-8 张/秒
- 实际速度取决于网络、图片大小、CPU性能

## 故障排查

### 问题：pgvector 扩展未安装
```bash
# 解决方案：安装 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;
```

### 问题：无法访问 ecai.tb_image
```bash
# 检查表是否存在
SELECT * FROM ecai.tb_image LIMIT 1;

# 检查权限
GRANT USAGE ON SCHEMA ecai TO postgres;
GRANT SELECT ON ecai.tb_image TO postgres;
```

### 问题：向量格式错误
```bash
# 正确格式：'[1.0,2.0,3.0]'
# 错误格式：'{1,2,3}' 或 '[[1,2,3]]'
```

## 回滚到 MySQL

如需回滚到 MySQL，使用以下函数：
```typescript
import { createMySQLConnection, createMySQLPool } from "../app/utils/db.js";
```

注意：MySQL 版本使用 JSONB 格式存储向量，不支持向量索引。
