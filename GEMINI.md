# MenuCraft v2

B2B SaaS platform for restaurant menu creation and management.

## Tech Stack

- **Monorepo**: Turborepo with pnpm
- **API**: Fastify + Drizzle ORM + PostgreSQL
- **Web**: React + Vite + TanStack Router + Tailwind CSS
- **Auth**: Clerk
- **Billing**: Stripe
- **UI**: shadcn/ui components

## Project Structure

```
menucraft/
├── apps/
│   ├── api/          # Fastify REST API (port 3000)
│   ├── web/          # React Dashboard (port 5173)
│   └── public/       # Public menu pages (port 5174)
├── packages/
│   ├── shared-types/ # Zod schemas + TypeScript types
│   ├── database/     # Drizzle ORM schema + migrations
│   ├── config-eslint/
│   └── config-typescript/
└── infrastructure/
    └── postgres/     # DB init scripts + RLS policies
```

## Quick Start

```bash
git clone <repo-url>
cd menucraft
pnpm setup            # One command setup: installs deps, starts Docker, sets up DB
```

## Commands

```bash
# Setup & Development
pnpm setup            # Complete setup (first time only)
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps

# Database
pnpm db:setup         # Setup database schema and migrations
pnpm db:generate      # Generate Drizzle migrations
pnpm db:studio        # Open Drizzle Studio

# Code Quality
pnpm lint             # Lint all packages
pnpm typecheck        # Type check all packages

# Docker (manual)
docker-compose up -d  # Start PostgreSQL + Redis
docker-compose down   # Stop all services
```

## Development Guidelines

- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Use conventional commits for git messages
- Use best practices for React and Node.js
- Follow separation of concerns principle
- Avoid over-engineering; keep code simple

## Environment Variables

The setup script will copy `.env.example` to `.env` automatically. Fill in your API keys:

```bash
# Required for full functionality
CLERK_PUBLISHABLE_KEY=pk_test_...  # From https://dashboard.clerk.com
CLERK_SECRET_KEY=sk_test_...
STRIPE_SECRET_KEY=sk_test_...      # From https://dashboard.stripe.com
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Database (automatically configured)
DATABASE_URL=postgres://menucraft:menucraft_dev@localhost:5433/menucraft
```

## Troubleshooting

### Database Connection Issues
- Ensure Docker is running: `docker info`
- Restart containers: `docker-compose down && docker-compose up -d`
- Check database status: `docker exec menucraft-db pg_isready -U menucraft -d menucraft`

### Port Conflicts
- PostgreSQL runs on port 5433 (not default 5432) to avoid conflicts
- If port 5433 is busy, edit `docker-compose.yml` to use a different port

### Turbo Dev Issues
- Run `pnpm clean` and try again
- Ensure all dependencies are built: `pnpm build`

## Key Patterns

- **Multi-tenancy**: Row-Level Security with organization_id
- **API Response**: `{ success: true, data: T }` or `{ success: false, error: {...} }`
- **State Management**: React Query for server state, Zustand for UI state
- **Routing**: TanStack Router with file-based routes
