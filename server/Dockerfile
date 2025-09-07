## Backend Server Dockerfile (build TS -> run JS)

# Base image with system deps for Chromium
FROM node:20-alpine AS base
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    wget

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Builder stage: install all deps, generate Prisma, compile TS
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY server/ ./server/
COPY prisma/ ./prisma/
RUN npx prisma generate
RUN npm run build:server
# Prune devDependencies for runtime
RUN npm prune --omit=dev && npm cache clean --force

# Runtime stage: copy only what we need
FROM base AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma

EXPOSE 3002
RUN addgroup -g 1001 -S nodejs && adduser -S server -u 1001
USER server

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3002/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

CMD ["node", "server/dist/index.js"]
