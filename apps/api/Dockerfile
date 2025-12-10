# Build stage
FROM node:20-alpine AS builder

# Install build dependencies for native modules (canvas)
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev libjpeg-turbo-dev giflib-dev librsvg-dev

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

# Build all packages
RUN pnpm --filter @menucraft/shared-types build
RUN pnpm --filter @menucraft/database build
RUN pnpm --filter @menucraft/api build

# Production stage
FROM node:20-alpine AS runner

# Install runtime dependencies for native modules (canvas) and build tools
RUN apk add --no-cache cairo pango libjpeg-turbo giflib librsvg python3 make g++ cairo-dev pango-dev libjpeg-turbo-dev giflib-dev librsvg-dev

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.4 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/drizzle ./packages/database/drizzle
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

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

CMD ["node", "dist/index.js"]
