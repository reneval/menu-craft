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

## Commands

```bash
pnpm install          # Install all dependencies
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps
pnpm lint             # Lint all packages
pnpm typecheck        # Type check all packages

# Database
pnpm db:generate      # Generate Drizzle migrations
pnpm db:push          # Push schema to database
pnpm db:studio        # Open Drizzle Studio

# Docker
docker-compose up -d  # Start PostgreSQL + services
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

Copy `.env.example` to `.env` and fill in values:

```bash
DATABASE_URL=postgres://menucraft:secret@localhost:5432/menucraft
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

## Key Patterns

- **Multi-tenancy**: Row-Level Security with organization_id
- **API Response**: `{ success: true, data: T }` or `{ success: false, error: {...} }`
- **State Management**: React Query for server state, Zustand for UI state
- **Routing**: TanStack Router with file-based routes
