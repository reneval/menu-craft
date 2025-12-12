# Build stage
FROM node:20-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.4 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/public/package.json ./apps/public/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config-typescript/package.json ./packages/config-typescript/
COPY packages/config-eslint/package.json ./packages/config-eslint/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/public ./apps/public
COPY packages/api-client ./packages/api-client
COPY packages/shared-types ./packages/shared-types
COPY packages/config-typescript ./packages/config-typescript
COPY packages/config-eslint ./packages/config-eslint

# Build arguments for environment variables
ARG VITE_API_URL

ENV VITE_API_URL=$VITE_API_URL

# Build public app
RUN pnpm --filter @menucraft/public build

# Production stage - serve with lightweight static server
FROM node:20-alpine AS runner

RUN npm install -g serve@14

WORKDIR /app

# Copy built files
COPY --from=builder /app/apps/public/dist ./dist

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
