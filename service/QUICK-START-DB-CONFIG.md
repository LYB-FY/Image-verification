# 快速开始：数据库配置

## 🚀 5分钟配置指南

### 步骤 1：检查默认配置（可选）

默认配置已经设置好了：
- 主机：`127.0.0.1`
- 端口：`3306`
- 用户：`root`
- 密码：`root`
- 数据库：`demo`

如果你的数据库配置和默认一致，**无需任何修改**，直接使用即可！

### 步骤 2：自定义配置（如果需要）

如果你的数据库配置不同，有两种方式：

#### 方式 A：使用环境变量（推荐）

在 `serves` 目录创建 `.env` 文件：

```bash
# serves/.env
DB_HOST=你的主机地址
DB_PORT=你的端口
DB_USER=你的用户名
DB_PASSWORD=你的密码
DB_DATABASE=你的数据库名
```

#### 方式 B：修改配置文件

编辑 `config/config.local.ts`：

```typescript
export default defineConfig({
  mysql: {
    host: "你的主机地址",
    port: 你的端口,
    user: "你的用户名",
    password: "你的密码",
    database: "你的数据库名",
  },
});
```

### 步骤 3：验证配置

运行检查脚本：

```bash
cd serves
npm run check-db
```

或者：

```bash
tsx scripts/check-db.ts
```

看到 "✅ 数据库连接成功！" 就表示配置正确了。

## ✅ 完成！

现在你可以正常使用应用了：

```bash
# 启动开发服务器
npm run dev

# 运行其他脚本
tsx scripts/import-images.ts
tsx scripts/query-images.ts
```

## 🔧 常见问题

### Q: 连接被拒绝怎么办？

**A:** 检查以下几点：
1. MySQL 服务是否运行？
2. 主机地址和端口是否正确？
3. 用户名和密码是否正确？
4. 数据库是否存在？

### Q: 配置没有生效？

**A:** 
1. 如果使用 `.env` 文件，确保它在 `serves` 目录下
2. 重启应用
3. 检查环境变量名称拼写

### Q: 在哪里看详细文档？

**A:** 查看以下文档：
- [DATABASE-CONFIG.md](./DATABASE-CONFIG.md) - 完整配置文档
- [ENV-EXAMPLE.md](./ENV-EXAMPLE.md) - 环境变量指南
- [REFACTOR-SUMMARY.md](./REFACTOR-SUMMARY.md) - 重构说明

## 💡 提示

- ✅ `.env` 文件已在 `.gitignore` 中，不会被提交
- ✅ 默认配置适用于本地开发
- ✅ 生产环境记得修改为生产数据库配置
- ✅ 使用强密码保护生产数据库

## 🎉 就这么简单！

如果使用默认配置，你甚至不需要做任何修改。所有脚本和服务会自动使用配置文件中的设置。

---

**需要帮助？** 查看完整文档或联系开发团队。

