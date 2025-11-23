# 数据库配置说明

## 概述

数据库连接配置已经统一提取到公共配置模块中，所有服务和脚本都使用统一的数据库配置。

## 配置文件

### 1. 默认配置

默认配置位于 `config/config.default.ts`：

```typescript
const mysql = {
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "root",
  database: "demo",
  supportBigNumbers: true,
  bigNumberStrings: true,
  charset: "utf8mb4",
};
```

### 2. 本地开发配置

本地配置位于 `config/config.local.ts`，会覆盖默认配置。

### 3. 生产环境配置

生产配置位于 `config/config.prod.ts`，在生产环境中使用。

## 使用方法

### 方式一：使用环境变量（推荐）

创建 `.env` 文件（已在 `.gitignore` 中）：

```bash
# .env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=demo
```

环境变量会自动覆盖默认配置，优先级最高。

### 方式二：修改配置文件

直接修改 `config/config.local.ts` 或 `config/config.prod.ts`：

```typescript
export default defineConfig({
  mysql: {
    host: "your-host",
    port: 3306,
    user: "your-user",
    password: "your-password",
    database: "your-database",
  },
});
```

## 数据库工具类

### 位置

`app/utils/db.ts`

### 主要方法

#### 1. `getDbConfig()`

获取当前数据库配置。

```typescript
import { getDbConfig } from "../app/utils/db.js";

const config = getDbConfig();
console.log(`连接到: ${config.host}:${config.port}/${config.database}`);
```

#### 2. `createDbConnection()`

创建单个数据库连接。

```typescript
import { createDbConnection } from "../app/utils/db.js";

const connection = await createDbConnection();
// 使用连接...
await connection.end();
```

也可以临时覆盖配置：

```typescript
const connection = await createDbConnection({
  host: "other-host",
  database: "other-db",
});
```

#### 3. `createDbPool()`

创建数据库连接池（适用于高并发场景）。

```typescript
import { createDbPool } from "../app/utils/db.js";

const pool = createDbPool();
const connection = await pool.getConnection();
// 使用连接...
connection.release();
```

## 已更新的文件

### 服务层

- ✅ `app/module/bar/service/ImageFeatureService.ts`

所有数据库连接已统一使用 `createDbConnection()`。

### 脚本文件

- ✅ `scripts/import-images.ts` - 导入图片
- ✅ `scripts/query-images.ts` - 查询图片
- ✅ `scripts/check-db.ts` - 检查数据库
- ✅ `scripts/create-feature-table.ts` - 创建特征表
- ✅ `scripts/test-api.ts` - 测试 API

所有脚本都使用统一的数据库配置。

## 配置优先级

配置的优先级从高到低：

1. **环境变量** (`process.env.DB_*`)
2. **Egg 应用配置** (`app.config.mysql`)
3. **默认配置** (`defaultConfig`)

## 示例

### 示例 1：在服务中使用

```typescript
import { createDbConnection } from "../../../utils/db.js";
import mysql from "mysql2/promise";

class MyService {
  async queryData() {
    let connection;
    try {
      connection = await createDbConnection();
      const [rows] = await connection.execute<mysql.RowDataPacket[]>(
        "SELECT * FROM my_table"
      );
      return rows;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
}
```

### 示例 2：在脚本中使用

```typescript
import { createDbConnection } from "../app/utils/db.js";

async function myScript() {
  const connection = await createDbConnection();
  try {
    // 执行数据库操作
  } finally {
    await connection.end();
  }
}

myScript().catch(console.error);
```

### 示例 3：使用连接池

```typescript
import { createDbPool } from "../app/utils/db.js";

const pool = createDbPool();

// 在不同的请求中复用连接池
app.get("/api/data", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute("SELECT * FROM data");
    res.json(rows);
  } finally {
    connection.release();
  }
});
```

## 数据库配置接口

```typescript
interface DbConfig {
  host: string; // 数据库主机地址
  port: number; // 端口号
  user: string; // 用户名
  password: string; // 密码
  database: string; // 数据库名
  supportBigNumbers?: boolean; // 支持大数字
  bigNumberStrings?: boolean; // 大数字转字符串
  charset?: string; // 字符集
}
```

## 安全建议

1. ✅ **不要提交** `.env` 文件到版本控制
2. ✅ 使用**环境变量**管理敏感信息
3. ✅ 生产环境使用**强密码**
4. ✅ 限制数据库用户**权限**
5. ✅ 定期**备份**数据库

## 故障排查

### 连接失败

1. 检查数据库服务是否运行
2. 验证主机地址和端口
3. 确认用户名和密码正确
4. 检查数据库是否存在

### 配置未生效

1. 确认环境变量已设置
2. 重启应用以加载新配置
3. 检查配置文件语法

### 查看当前配置

运行以下命令查看当前配置：

```bash
npm run check-db
```

或在代码中：

```typescript
import { getDbConfig } from "../app/utils/db.js";
console.log(getDbConfig());
```

## 迁移指南

如果你有其他文件使用了硬编码的数据库配置，请按以下步骤迁移：

### 步骤 1：导入工具类

```typescript
import { createDbConnection } from "../path/to/utils/db.js";
```

### 步骤 2：替换连接代码

**之前：**

```typescript
const connection = await mysql.createConnection({
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "root",
  database: "demo",
});
```

**之后：**

```typescript
const connection = await createDbConnection();
```

### 步骤 3：测试

确保功能正常后，删除旧的硬编码配置。

## 总结

通过统一的数据库配置管理，我们实现了：

- ✅ 配置集中管理
- ✅ 环境隔离（开发/测试/生产）
- ✅ 安全性提升（敏感信息不提交）
- ✅ 代码复用（避免重复配置）
- ✅ 易于维护（一处修改，全局生效）

