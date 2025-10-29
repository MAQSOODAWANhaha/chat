# ---- Stage 1: Build Frontend ----
FROM docker.m.daocloud.io/node:18-alpine AS frontend
WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend/ .
RUN npm run build

# ---- Stage 2: Build Backend ----
FROM docker.m.daocloud.io/rust:1.88.0-slim AS backend
WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

# ---- Stage 3: Final Runtime Image ----
FROM docker.m.daocloud.io/debian:bookworm-slim
LABEL maintainer="Codex CLI"
LABEL description="Monolithic container for the language chat platform"

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=backend /app/target/release/chat /app/chat
COPY --from=frontend /app/frontend/dist /app/static

RUN mkdir -p /app/audio

ENV HOST=0.0.0.0
ENV PORT=3000
ENV RUST_LOG=info

EXPOSE 3000

CMD ["/app/chat"]
