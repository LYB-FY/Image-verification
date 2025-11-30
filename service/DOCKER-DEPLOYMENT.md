# Docker 部署指南

本文档介绍如何使用 Docker 部署 Image Verification 服务。

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+

## 快速开始

### 1. 构建 Docker 镜像

```bash
# 进入 service 目录
cd service

# 构建镜像
docker build -t image-verification-service:latest .
```

### 2. 运行容器

#### 方式一：使用 Docker Compose（推荐）

```bash
# 启动所有服务（应用 + MySQL）
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

#### 方式二：直接使用 Docker

```bash
# 运行 MySQL（如果没有现有数据库）
docker run -d \
  --name image-verification-mysql \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -e MYSQL_DATABASE=image_verification \
  -p 3306:3306 \
  -v mysql-data:/var/lib/mysql \
  mysql:8.0

# 运行应用
docker run -d \
  --name image-verification-service \
  -p 7001:7001 \
  -e NODE_ENV=production \
  -e EGG_SERVER_ENV=prod \
  -e MYSQL_HOST=host.docker.internal \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USER=root \
  -e MYSQL_PASSWORD=your_password \
  -e MYSQL_DATABASE=image_verification \
  -v $(pwd)/logs:/app/logs \
  image-verification-service:latest
```

### 3. 验证部署

```bash
# 检查容器状态
docker ps

# 检查应用健康状态
curl http://localhost:7001

# 查看日志
docker logs -f image-verification-service
```

## 配置说明

### 环境变量

在 `docker-compose.yml` 或运行命令中配置以下环境变量：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| NODE_ENV | Node 环境 | production |
| EGG_SERVER_ENV | Egg.js 环境 | prod |
| MYSQL_HOST | MySQL 主机地址 | mysql |
| MYSQL_PORT | MySQL 端口 | 3306 |
| MYSQL_USER | MySQL 用户名 | root |
| MYSQL_PASSWORD | MySQL 密码 | - |
| MYSQL_DATABASE | 数据库名称 | image_verification |

### 自定义配置

1. 复制环境变量示例文件：
```bash
cp .env.production.example .env.production
```

2. 编辑 `.env.production` 文件，更新您的配置

3. 修改 `docker-compose.yml`，添加环境文件：
```yaml
services:
  app:
    env_file:
      - .env.production
```

## 数据持久化

### 日志持久化

日志文件会挂载到宿主机的 `./logs` 目录：
```bash
./logs/
  ├── serves/
  │   ├── egg-web.log
  │   ├── common-error.log
  │   └── ...
```

### 数据库持久化

MySQL 数据会存储在 Docker 数据卷 `mysql-data` 中。

## 常用命令

```bash
# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps

# 进入容器
docker-compose exec app sh

# 查看实时日志
docker-compose logs -f app

# 重新构建并启动
docker-compose up -d --build

# 清理未使用的资源
docker system prune -a
```

## 镜像优化

当前 Dockerfile 使用多阶段构建，具有以下特点：

1. **分离构建和运行环境**：减小最终镜像大小
2. **使用 Alpine Linux**：更小的基础镜像
3. **只安装生产依赖**：`npm ci --only=production`
4. **包含健康检查**：自动监控容器健康状态

## 生产环境建议

1. **使用外部数据库**：生产环境建议使用独立的 MySQL 服务或云数据库
2. **配置反向代理**：使用 Nginx 或 Traefik 作为反向代理
3. **启用 HTTPS**：配置 SSL 证书
4. **监控和日志**：集成日志收集系统（如 ELK Stack）
5. **资源限制**：在 docker-compose.yml 中设置 CPU 和内存限制：

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## 故障排查

### 容器启动失败

```bash
# 查看详细日志
docker-compose logs app

# 检查配置
docker-compose config
```

### 数据库连接失败

1. 确认 MySQL 容器已启动且健康
2. 检查数据库配置是否正确
3. 确认网络连接正常

### Canvas 相关错误

如果遇到 canvas 库的错误，确保 Dockerfile 中已安装所需的系统依赖：
- cairo-dev
- jpeg-dev
- pango-dev
- giflib-dev

## 安全建议

1. 不要在 `docker-compose.yml` 中硬编码密码
2. 使用 Docker secrets 或环境变量文件
3. 定期更新基础镜像和依赖
4. 使用非 root 用户运行容器（可选）

## 更多信息

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Egg.js 部署文档](https://eggjs.org/zh-cn/core/deployment.html)

