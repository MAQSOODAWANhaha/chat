# 多阶段构建
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM caddy:2-alpine

# 复制Caddyfile配置
COPY Caddyfile /etc/caddy/Caddyfile

# 复制构建产物
COPY --from=builder /app/dist /app/dist

# 暴露端口
EXPOSE 80 443

# 启动caddy
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]