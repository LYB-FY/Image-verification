# 环境变量配置示例

## 创建 .env 文件

在 `serves` 目录下创建 `.env` 文件（已在 `.gitignore` 中，不会被提交）：

```bash
# 数据库配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=demo

# 服务器配置（可选）
PORT=7001
NODE_ENV=development
```

## 配置说明

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `DB_HOST` | 数据库主机地址 | 127.0.0.1 | localhost, 192.168.1.100 |
| `DB_PORT` | 数据库端口 | 3306 | 3306, 3307 |
| `DB_USER` | 数据库用户名 | root | root, admin |
| `DB_PASSWORD` | 数据库密码 | root | your_secure_password |
| `DB_DATABASE` | 数据库名称 | demo | demo, myapp |

## 不同环境的配置

### 开发环境 (.env.development)

```bash
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=demo
NODE_ENV=development
```

### 测试环境 (.env.test)

```bash
DB_HOST=test-db.example.com
DB_PORT=3306
DB_USER=test_user
DB_PASSWORD=test_password
DB_DATABASE=demo_test
NODE_ENV=test
```

### 生产环境 (.env.production)

```bash
DB_HOST=prod-db.example.com
DB_PORT=3306
DB_USER=prod_user
DB_PASSWORD=strong_secure_password
DB_DATABASE=demo_prod
NODE_ENV=production
```

## 使用方法

### 方式 1：使用 dotenv 包（推荐）

安装依赖：

```bash
npm install dotenv
```

在应用启动时加载：

```typescript
// 在入口文件最顶部
import "dotenv/config";
```

或者：

```typescript
import dotenv from "dotenv";
dotenv.config();
```

### 方式 2：直接设置环境变量

**Linux/macOS:**

```bash
export DB_HOST=127.0.0.1
export DB_PORT=3306
export DB_USER=root
export DB_PASSWORD=root
export DB_DATABASE=demo
```

**Windows CMD:**

```cmd
set DB_HOST=127.0.0.1
set DB_PORT=3306
set DB_USER=root
set DB_PASSWORD=root
set DB_DATABASE=demo
```

**Windows PowerShell:**

```powershell
$env:DB_HOST="127.0.0.1"
$env:DB_PORT="3306"
$env:DB_USER="root"
$env:DB_PASSWORD="root"
$env:DB_DATABASE="demo"
```

### 方式 3：在 package.json 中设置

```json
{
  "scripts": {
    "dev": "NODE_ENV=development node --loader ts-node/esm app.ts",
    "prod": "NODE_ENV=production node dist/app.js"
  }
}
```

## 安全注意事项

1. ⚠️ **永远不要** 提交 `.env` 文件到 Git
2. ✅ 使用 `.env.example` 作为模板
3. ✅ 在 `.gitignore` 中添加 `.env`
4. ✅ 生产环境使用强密码
5. ✅ 定期更换密码
6. ✅ 使用密钥管理服务（如 AWS Secrets Manager）

## 验证配置

创建一个测试脚本 `test-env.ts`：

```typescript
import { getDbConfig } from "./app/utils/db.js";

console.log("当前数据库配置：");
const config = getDbConfig();
console.log(`主机: ${config.host}`);
console.log(`端口: ${config.port}`);
console.log(`用户: ${config.user}`);
console.log(`数据库: ${config.database}`);
console.log(`密码: ${"*".repeat(config.password.length)}`);
```

运行测试：

```bash
tsx test-env.ts
```

## 故障排查

### 问题 1：环境变量未生效

**原因：** 环境变量未正确加载

**解决：**
1. 确保 `.env` 文件在正确的位置
2. 确保已安装并导入 `dotenv`
3. 在代码最顶部加载环境变量

### 问题 2：配置使用默认值

**原因：** 环境变量名称不正确

**解决：**
1. 检查环境变量名称拼写
2. 确保使用正确的前缀（`DB_`）
3. 重启应用

### 问题 3：连接被拒绝

**原因：** 数据库配置错误或数据库未运行

**解决：**
1. 检查数据库服务状态
2. 验证主机地址和端口
3. 确认防火墙设置

## 示例项目结构

```
serves/
├── .env                 # 本地环境变量（不提交）
├── .env.example         # 环境变量模板（提交）
├── ENV-EXAMPLE.md       # 本文档
├── DATABASE-CONFIG.md   # 数据库配置文档
├── app/
│   └── utils/
│       └── db.ts        # 数据库工具类
├── config/
│   ├── config.default.ts  # 默认配置
│   ├── config.local.ts    # 本地配置
│   └── config.prod.ts     # 生产配置
└── scripts/             # 各种脚本
```

## 总结

使用环境变量的优势：

✅ **安全性** - 敏感信息不提交到代码库  
✅ **灵活性** - 不同环境使用不同配置  
✅ **便捷性** - 无需修改代码即可更改配置  
✅ **标准化** - 遵循 12-Factor App 原则  

记住：**永远不要在代码中硬编码敏感信息！**

