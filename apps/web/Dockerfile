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
COPY apps/web/package.json ./apps/web/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config-typescript/package.json ./packages/config-typescript/
COPY packages/config-eslint/package.json ./packages/config-eslint/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web ./apps/web
COPY packages/api-client ./packages/api-client
COPY packages/shared-types ./packages/shared-types
COPY packages/config-typescript ./packages/config-typescript
COPY packages/config-eslint ./packages/config-eslint

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_CLERK_PUBLISHABLE_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

# Build
RUN pnpm --filter @menucraft/shared-types build
RUN pnpm --filter @menucraft/api-client build
RUN pnpm --filter @menucraft/web build

# Production stage - serve with nginx
FROM nginx:alpine AS runner

# Copy nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
