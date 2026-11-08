# Multi-stage Docker build for Report Buddy (Node.js 20 + Vite + SQLite/Supabase)
FROM node:20-slim AS builder

WORKDIR /app

# Install native dependencies required for compiling node addons
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Runner
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=10000

# Install build dependencies for better-sqlite3 native bindings
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

EXPOSE 10000

CMD ["node", "server/index.js"]
