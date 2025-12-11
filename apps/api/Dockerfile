# Build stage
FROM node:20-slim AS builder

# Install build dependencies for native modules (canvas)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.4 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config-typescript/package.json ./packages/config-typescript/
COPY packages/config-eslint/package.json ./packages/config-eslint/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api ./apps/api
COPY packages/database ./packages/database
COPY packages/shared-types ./packages/shared-types
COPY packages/config-typescript ./packages/config-typescript
COPY packages/config-eslint ./packages/config-eslint

# Build API
RUN pnpm --filter @menucraft/api build

# Production stage
FROM node:20-slim AS runner

# Install runtime dependencies for native modules (canvas)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm and tsx globally
RUN corepack enable && corepack prepare pnpm@9.14.4 --activate
RUN npm install -g tsx

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config-typescript/package.json ./packages/config-typescript/

# Install all dependencies (tsx needs TypeScript to compile workspace packages)
RUN pnpm install --frozen-lockfile

# Copy built API
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy package source files (they export TypeScript directly)
COPY --from=builder /app/packages/database/src ./packages/database/src
COPY --from=builder /app/packages/database/drizzle.config.ts ./packages/database/
COPY --from=builder /app/packages/shared-types/src ./packages/shared-types/src
COPY --from=builder /app/packages/config-typescript ./packages/config-typescript

# Copy migrations if they exist
COPY --from=builder /app/packages/database/src/migrations ./packages/database/src/migrations

# Set working directory to api
WORKDIR /app/apps/api

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["tsx", "dist/index.js"]
