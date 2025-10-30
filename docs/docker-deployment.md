# Docker 部署指南

智谱AI实时对话应用的Docker容器化部署指南。

## 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 1GB 可用磁盘空间

### 一键部署

```bash
# 克隆项目
git clone <your-repo-url>
cd realtime-chat

# 执行部署脚本
./scripts/deploy.sh deploy

# 访问应用
# http://localhost:3000
```

## 详细部署步骤

### 1. 构建镜像

```bash
# 手动构建Docker镜像
docker build -t realtime-chat .

# 或者使用Docker Compose构建
docker-compose build
```

### 2. 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 3. 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除卷
docker-compose down -v
```

## 部署脚本使用

项目提供了便捷的部署脚本 `scripts/deploy.sh`。

### 基本命令

```bash
# 部署应用
./scripts/deploy.sh deploy

# 清理并部署
./scripts/deploy.sh deploy --clean

# 查看日志
./scripts/deploy.sh logs

# 查看状态
./scripts/deploy.sh status

# 停止服务
./scripts/deploy.sh stop

# 重启服务
./scripts/deploy.sh restart

# 显示帮助
./scripts/deploy.sh help
```

### 脚本功能

- ✅ Docker环境检查
- ✅ 自动构建镜像
- ✅ 健康检查
- ✅ 日志管理
- ✅ 服务状态监控
- ✅ 错误处理和回滚

## 配置说明

### 环境变量

在 `docker-compose.yml` 中可以配置以下环境变量：

```yaml
environment:
  - NODE_ENV=production
  # - API_BASE_URL=https://your-api-server.com
  # - WS_BASE_URL=wss://your-websocket-server.com
```

### 端口配置

默认端口映射：

- `3000:80` - 前端应用端口
- 如需修改端口，编辑 `docker-compose.yml`：

```yaml
ports:
  - "你的端口:80"
```

### nginx配置

nginx配置文件位于 `nginx.conf`，主要配置包括：

- **Gzip压缩**: 自动压缩静态资源
- **缓存策略**: 静态资源长期缓存
- **SPA路由支持**: 支持前端路由
- **安全头**: 添加安全相关HTTP头
- **健康检查**: `/health` 端点

如需自定义配置，修改 `nginx.conf` 后重新构建镜像。

## 生产环境优化

### 1. 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  realtime-frontend:
    # ... 其他配置
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### 2. 健康检查优化

调整健康检查参数：

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### 3. 日志管理

配置日志轮转：

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   lsof -i :3000

   # 修改docker-compose.yml中的端口映射
   ```

2. **构建失败**
   ```bash
   # 清理Docker缓存
   docker system prune -a

   # 重新构建
   docker-compose build --no-cache
   ```

3. **容器启动失败**
   ```bash
   # 查看详细日志
   docker-compose logs realtime-frontend

   # 检查容器状态
   docker-compose ps
   ```

4. **健康检查失败**
   ```bash
   # 手动检查健康端点
   curl http://localhost:3000/health

   # 查看nginx错误日志
   docker-compose exec realtime-frontend cat /var/log/nginx/error.log
   ```

### 调试命令

```bash
# 进入容器调试
docker-compose exec realtime-frontend sh

# 查看实时日志
docker-compose logs -f

# 查看容器资源使用
docker stats

# 查看容器详细信息
docker inspect realtime-chat_realtime-frontend_1
```

## 更新部署

### 应用更新

```bash
# 拉取最新代码
git pull

# 重新部署
./scripts/deploy.sh deploy --clean
```

### 版本回滚

```bash
# 查看镜像历史
docker images | grep realtime-chat

# 使用指定镜像版本
docker tag realtime-chat:old realtime-chat:latest
docker-compose up -d
```

## 监控和备份

### 监控

- **容器状态**: `docker-compose ps`
- **资源使用**: `docker stats`
- **日志监控**: `docker-compose logs -f`
- **健康检查**: `curl http://localhost:3000/health`

### 备份

```bash
# 导出镜像
docker save realtime-chat > realtime-chat-backup.tar

# 导入镜像
docker load < realtime-chat-backup.tar
```

## 安全建议

1. **使用最小权限用户运行容器**
2. **定期更新基础镜像**
3. **配置防火墙规则**
4. **启用HTTPS**（生产环境）
5. **定期备份数据和配置**

## 支持和反馈

如遇到部署问题，请：

1. 查看本文档的故障排除部分
2. 检查GitHub Issues
3. 提交新的Issue并包含：
   - Docker版本信息
   - 完整的错误日志
   - 系统环境信息
   - 详细的复现步骤