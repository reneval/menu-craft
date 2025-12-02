# MenuCraft: Complete Technical Implementation Plan

A solo TypeScript developer can ship this B2B restaurant menu SaaS in 12 weeks by following a domain-first approach with proven patterns. This plan prioritizes **shared types and database schema first**, then builds outward to API, frontend, and integrations—exactly how production SaaS should be architected.

---

## 1. Monorepo structure with Turborepo

The foundation of MenuCraft is a well-organized monorepo that maximizes code sharing while keeping clear boundaries between concerns.

### Directory layout

```
menucraft/
├── apps/
│   ├── api/                    # Fastify REST API
│   ├── web/                    # React Dashboard SPA
│   └── public/                 # Public menu pages (optional: separate or same as web)
├── packages/
│   ├── shared-types/           # Zod schemas + TypeScript types
│   ├── api-client/             # Type-safe API client with React Query
│   ├── ui/                     # Shared React components
│   ├── database/               # Drizzle schema and client
│   ├── config-eslint/          # Shared ESLint config
│   └── config-typescript/      # Shared tsconfig files
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

### Turborepo configuration (turbo.json)

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "lint": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "db:generate": { "cache": false },
    "db:push": { "cache": false }
  }
}
```

The `^build` syntax ensures packages build before apps that depend on them. Enable remote caching with `npx turbo login && npx turbo link` to dramatically speed up CI and local rebuilds.

### Shared TypeScript configuration

Create a base configuration in `packages/config-typescript/base.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "ES2022",
    "moduleDetection": "force",
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

Internal packages can use **just-in-time compilation**—export TypeScript source directly and let consuming apps handle transpilation:

```json
{
  "name": "@menucraft/shared-types",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

---

## 2. Database schema design

PostgreSQL with **shared database, tenant_id columns** is the optimal multi-tenant pattern for MenuCraft. This approach costs less, simplifies operations, and scales to thousands of tenants before requiring sharding.

### Multi-tenancy with Row-Level Security

Every tenant table includes `organization_id` as the first column, enabling consistent RLS policies and composite indexes:

```sql
-- Enable RLS helper function
CREATE OR REPLACE FUNCTION current_organization_id() 
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_organization_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- Standard RLS policy (apply to every tenant table)
CREATE POLICY org_isolation ON table_name
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());
```

The API sets the tenant context at the start of each request: `SET app.current_organization_id = 'uuid-here'`.

### Core entity schemas

**Organizations (tenant root)**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Users (synced from Clerk)**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Organization memberships (roles: owner, admin, editor, viewer)**
```sql
CREATE TABLE organization_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'viewer',
  deleted_at TIMESTAMPTZ,
  UNIQUE(organization_id, user_id) WHERE deleted_at IS NULL
);
```

**Venues**
```sql
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  address JSONB DEFAULT '{}',
  logo_url TEXT,
  deleted_at TIMESTAMPTZ,
  UNIQUE(organization_id, slug) WHERE deleted_at IS NULL
);
```

**Menus**
```sql
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status menu_status NOT NULL DEFAULT 'draft', -- draft, published, archived
  theme_config JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  UNIQUE(venue_id, slug) WHERE deleted_at IS NULL
);
```

**Menu sections and items**
```sql
CREATE TABLE menu_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  section_id UUID NOT NULL REFERENCES menu_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_type price_type NOT NULL DEFAULT 'fixed', -- fixed, variable, market_price
  price_amount INTEGER, -- cents
  dietary_tags JSONB NOT NULL DEFAULT '[]',
  allergens JSONB NOT NULL DEFAULT '[]',
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE menu_item_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  option_group TEXT NOT NULL, -- "Size", "Add-ons"
  name TEXT NOT NULL,
  price_modifier INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
```

**Menu schedules (time-based activation)**
```sql
CREATE TABLE menu_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  schedule_type schedule_type NOT NULL, -- always, time_range, day_of_week, date_range
  start_time TIME,
  end_time TIME,
  days_of_week INTEGER[], -- 0=Sun, 6=Sat
  start_date DATE,
  end_date DATE,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);
```

**Translations (polymorphic storage)**
```sql
CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  entity_type TEXT NOT NULL, -- 'menu', 'menu_section', 'menu_item'
  entity_id UUID NOT NULL,
  language_code CHAR(5) NOT NULL, -- 'en', 'es', 'zh-CN'
  translations JSONB NOT NULL DEFAULT '{}', -- {"name": "...", "description": "..."}
  is_auto_translated BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(entity_type, entity_id, language_code)
);
```

**Subscriptions and QR codes**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  status subscription_status NOT NULL,
  current_period_end TIMESTAMPTZ,
  plan_id UUID NOT NULL REFERENCES plans(id)
);

CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('menu', 'venue')),
  target_id UUID NOT NULL,
  code TEXT UNIQUE NOT NULL,
  scan_count INTEGER NOT NULL DEFAULT 0,
  last_scanned_at TIMESTAMPTZ
);
```

### Indexing strategy

Always put `organization_id` first in composite indexes for RLS efficiency:

```sql
CREATE INDEX idx_menus_venue ON menus(organization_id, venue_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_section ON menu_items(organization_id, section_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_dietary ON menu_items USING GIN (dietary_tags jsonb_path_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_schedules_active ON menu_schedules(menu_id, is_active, priority DESC) WHERE is_active = true;
```

### JSONB usage guidelines

| Data Type | Use JSONB? | Reasoning |
|-----------|------------|-----------|
| Theme config | ✓ Yes | Flexible, no relationships |
| Dietary tags | ✓ Yes | Fixed vocabulary, GIN-indexed |
| Translations | ✓ Yes | Polymorphic, varied structure |
| Prices | ✗ No | Financial data needs constraints |
| User roles | ✗ No | Use ENUM for enforcement |

---

## 3. API contract design

### Framework choice: Fastify

Fastify outperforms Express by **2x in throughput** and provides first-class TypeScript support. For a menu platform where public QR-scanned endpoints see traffic spikes, this performance matters.

### RESTful endpoint structure

**Authentication required (dashboard endpoints)**
```
/api/organizations
  GET    /                              List user's organizations
  POST   /                              Create organization
  GET    /:orgId                        Get organization
  PATCH  /:orgId                        Update organization
  GET    /:orgId/members                List members
  POST   /:orgId/members/invite         Invite member

/api/organizations/:orgId/venues
  GET    /                              List venues
  POST   /                              Create venue
  GET    /:venueId                      Get venue
  PATCH  /:venueId                      Update venue
  DELETE /:venueId                      Soft delete venue

/api/organizations/:orgId/venues/:venueId/menus
  GET    /                              List menus
  POST   /                              Create menu
  GET    /:menuId                       Get menu with sections
  PATCH  /:menuId                       Update menu
  DELETE /:menuId                       Soft delete menu
  POST   /:menuId/publish               Publish menu
  POST   /:menuId/duplicate             Clone menu
  PATCH  /:menuId/sections/reorder      Reorder sections

/api/.../menus/:menuId/sections
  GET    /                              List sections
  POST   /                              Create section
  PATCH  /:sectionId                    Update section
  DELETE /:sectionId                    Delete section
  PATCH  /:sectionId/items/reorder      Reorder items

/api/.../sections/:sectionId/items
  GET    /                              List items
  POST   /                              Create item
  PATCH  /:itemId                       Update item
  DELETE /:itemId                       Delete item
  POST   /:itemId/move                  Move to different section
```

**Public endpoints (no auth)**
```
/public/v/:venueSlug                    Get venue info
/public/v/:venueSlug/menu               Get active menu (respects schedules)
/public/qr/:code                        Redirect + track scan
```

### Request/response patterns

**Standard response envelope**
```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  error: {
    code: string;      // 'VALIDATION_ERROR', 'NOT_FOUND', 'FORBIDDEN'
    message: string;
    details?: Record<string, string[]>;
    requestId?: string;
  };
}
```

**Pagination (cursor-based)**
```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}
// Usage: GET /menus?cursor=abc123&limit=20
```

### Clerk middleware integration

```typescript
import { clerkMiddleware, getAuth } from '@clerk/express';

// Authentication middleware chain
app.use(clerkMiddleware());

const requireAuth = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
  next();
};

const requireOrgContext = async (req, res, next) => {
  const { userId, orgId } = getAuth(req);
  const membership = await verifyMembership(userId, req.params.orgId);
  if (!membership) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
  
  // Set RLS context
  await db.execute(sql`SET app.current_organization_id = ${req.params.orgId}`);
  req.tenantContext = { organizationId: req.params.orgId, userId, role: membership.role };
  next();
};
```

### Validation with Zod

```typescript
import { z } from 'zod';

const CreateMenuSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  defaultLanguage: z.string().length(2).default('en'),
});

const validateRequest = (schema) => async (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', details: formatZodErrors(error) }
    });
  }
};
```

---

## 4. Frontend architecture

### React dashboard structure

```
apps/web/src/
├── app/
│   ├── providers.tsx              # Query client, auth, theme
│   └── router.tsx                 # Route definitions
├── features/
│   ├── auth/
│   ├── menu-editor/
│   │   ├── components/
│   │   │   ├── SortableSection.tsx
│   │   │   ├── SortableItem.tsx
│   │   │   └── MenuEditorCanvas.tsx
│   │   ├── hooks/
│   │   │   ├── useMenuEditor.ts
│   │   │   └── useMenuHistory.ts
│   │   └── store.ts
│   ├── venues/
│   └── settings/
├── components/ui/                 # Primitives (Button, Modal, etc.)
├── hooks/                         # Global hooks
├── layouts/
│   └── DashboardLayout.tsx
└── pages/
```

### State management: React Query + Zustand

Use **TanStack Query** for server state (menus, API data) and **Zustand** for client/UI state (selected items, preview mode). This combination provides excellent DevX with minimal boilerplate:

```typescript
// Zustand for editor UI state
export const useEditorStore = create((set) => ({
  selectedItemId: null,
  isPreviewMode: false,
  selectItem: (id) => set({ selectedItemId: id }),
  togglePreview: () => set((s) => ({ isPreviewMode: !s.isPreviewMode })),
}));

// React Query for server state with optimistic updates
export function useReorderSections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reorderSections,
    onMutate: async ({ menuId, sectionIds }) => {
      await queryClient.cancelQueries(['menu', menuId]);
      const previous = queryClient.getQueryData(['menu', menuId]);
      queryClient.setQueryData(['menu', menuId], (old) => ({
        ...old,
        sections: reorderByIds(old.sections, sectionIds)
      }));
      return { previous };
    },
    onError: (_, { menuId }, context) => {
      queryClient.setQueryData(['menu', menuId], context.previous);
    },
  });
}
```

### Drag-and-drop with dnd-kit

The **dnd-kit** library provides accessible, performant drag-and-drop for nested lists:

```tsx
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

function MenuEditor({ sections }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
        {sections.map(section => (
          <SortableSection key={section.id} section={section}>
            <SortableContext items={section.items.map(i => i.id)}>
              {section.items.map(item => (
                <SortableItem key={item.id} item={item} />
              ))}
            </SortableContext>
          </SortableSection>
        ))}
      </SortableContext>
      <DragOverlay>{activeId && <ItemOverlay id={activeId} />}</DragOverlay>
    </DndContext>
  );
}
```

### Undo/redo for menu editing

```typescript
function useMenuHistory<T>(initialState: T, maxHistory = 50) {
  const [state, setState] = useState({ past: [], present: initialState, future: [] });
  
  const set = (newPresent) => setState(current => ({
    past: [...current.past, current.present].slice(-maxHistory),
    present: newPresent,
    future: [],
  }));
  
  const undo = () => setState(current => {
    if (!current.past.length) return current;
    return {
      past: current.past.slice(0, -1),
      present: current.past.at(-1),
      future: [current.present, ...current.future],
    };
  });
  
  const redo = () => setState(current => {
    if (!current.future.length) return current;
    return {
      past: [...current.past, current.present],
      present: current.future[0],
      future: current.future.slice(1),
    };
  });
  
  return { state: state.present, set, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}
```

### Public menu pages with SEO

Add structured data for restaurant menus using JSON-LD:

```tsx
const menuJsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": restaurant.name,
  "hasMenu": {
    "@type": "Menu",
    "name": menu.name,
    "hasMenuSection": menu.sections.map(section => ({
      "@type": "MenuSection",
      "name": section.name,
      "hasMenuItem": section.items.map(item => ({
        "@type": "MenuItem",
        "name": item.name,
        "description": item.description,
        "offers": { "@type": "Offer", "price": item.price, "priceCurrency": "USD" }
      }))
    }))
  }
};

// In component
<script type="application/ld+json">{JSON.stringify(menuJsonLd)}</script>
```

### Theming with CSS variables

```css
:root {
  --color-primary: #3b82f6;
  --color-background: #ffffff;
  --font-family: 'Inter', sans-serif;
  --border-radius: 8px;
}
```

Apply theme config dynamically:
```typescript
function applyTheme(config: ThemeConfig) {
  Object.entries(config).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--${key}`, value);
  });
}
```

---

## 5. TypeScript domain modeling

### Branded types for type-safe IDs

Prevent accidentally passing a `VenueId` where a `MenuId` is expected:

```typescript
declare const __brand: unique symbol;
type Branded<T, B extends string> = T & { [__brand]: B };

export type OrganizationId = Branded<string, 'OrganizationId'>;
export type VenueId = Branded<string, 'VenueId'>;
export type MenuId = Branded<string, 'MenuId'>;
export type MenuItemId = Branded<string, 'MenuItemId'>;

// Constructor functions
export const OrganizationId = (id: string): OrganizationId => id as OrganizationId;
export const MenuId = (id: string): MenuId => id as MenuId;
```

### Discriminated unions for menu item variants

```typescript
const BaseMenuItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  dietary: z.array(z.enum(['vegetarian', 'vegan', 'gluten-free'])).default([]),
});

const StandardItemSchema = BaseMenuItemSchema.extend({ type: z.literal('standard') });
const VariantItemSchema = BaseMenuItemSchema.extend({
  type: z.literal('variant'),
  variants: z.array(z.object({ name: z.string(), priceModifier: z.number() })),
});
const ComboItemSchema = BaseMenuItemSchema.extend({
  type: z.literal('combo'),
  includedItems: z.array(z.string()),
});

export const MenuItemSchema = z.discriminatedUnion('type', [
  StandardItemSchema, VariantItemSchema, ComboItemSchema
]);
export type MenuItem = z.infer<typeof MenuItemSchema>;

// Type-safe handler
function getDisplayPrice(item: MenuItem): string {
  switch (item.type) {
    case 'standard': return `$${item.price}`;
    case 'variant': return `From $${item.price}`;
    case 'combo': return `$${item.price} (combo)`;
  }
}
```

### Database with Drizzle ORM

Drizzle provides instant TypeScript types without a generation step, **7KB bundle size** (vs Prisma's 7MB), and excellent serverless performance:

```typescript
import { pgTable, text, timestamp, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const menuStatusEnum = pgEnum('menu_status', ['draft', 'published', 'archived']);

export const menus = pgTable('menus', {
  id: text('id').primaryKey().$defaultFn(() => `menu_${crypto.randomUUID()}`),
  venueId: text('venue_id').notNull().references(() => venues.id),
  name: text('name').notNull(),
  status: menuStatusEnum('status').notNull().default('draft'),
  themeConfig: jsonb('theme_config').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const menusRelations = relations(menus, ({ one, many }) => ({
  venue: one(venues, { fields: [menus.venueId], references: [venues.id] }),
  sections: many(menuSections),
}));
```

### Type-safe API client with openapi-fetch

Generate types from OpenAPI spec, then use React Query integration:

```typescript
import createFetchClient from 'openapi-fetch';
import createClient from 'openapi-react-query';
import type { paths } from './types';

export const $api = createClient(createFetchClient<paths>({ baseUrl: '/api' }));

// Usage in components - fully typed
const { data } = $api.useQuery('get', '/venues/{venue_id}/menus', {
  params: { path: { venue_id: venueId } }
});
```

---

## 6. Infrastructure and deployment

### Docker multi-stage builds

**API Dockerfile**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
RUN adduser -S menucraft
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
USER menucraft
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**React SPA with nginx**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

### Docker Compose for local development

```yaml
services:
  api:
    build: ./apps/api
    ports: ["3000:3000"]
    volumes: ["./apps/api/src:/app/src"]
    environment:
      DATABASE_URL: postgres://menucraft:secret@db:5432/menucraft
    depends_on: [db]
    
  web:
    build: ./apps/web
    ports: ["5173:5173"]
    volumes: ["./apps/web/src:/app/src"]
    
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: menucraft
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: menucraft
    volumes: [postgres_data:/var/lib/postgresql/data]
    ports: ["5432:5432"]

volumes:
  postgres_data:
```

### VPS deployment with Caddy (automatic SSL)

Use **Caddy** for automatic HTTPS, including on-demand certificates for Pro tier custom domains:

```caddyfile
{
  email admin@menucraft.io
  on_demand_tls {
    ask http://localhost:3000/api/domains/verify
  }
}

app.menucraft.io {
  handle /api/* { reverse_proxy api:3000 }
  handle { reverse_proxy web:80 }
}

# Pro tier custom domains
https:// {
  tls { on_demand }
  reverse_proxy api:3000 {
    header_up X-Custom-Domain {host}
  }
}
```

The API endpoint `/api/domains/verify` validates that the domain belongs to a Pro subscriber before Caddy provisions a certificate.

### Resource requirements

| Stage | vCPU | RAM | Storage | Monthly Cost |
|-------|------|-----|---------|--------------|
| MVP | 2 | 4GB | 80GB | ~$20 (Hetzner) |
| Growth | 4 | 8GB | 160GB | ~$40 |

---

## 7. Third-party integrations

### Clerk multi-tenant setup

Enable Organizations in Clerk Dashboard, then sync to local database via webhooks:

```typescript
// Webhook handler for Clerk events
app.post('/api/webhooks/clerk', async (req, res) => {
  const event = verifyClerkWebhook(req);
  
  switch (event.type) {
    case 'user.created':
      await db.insert(users).values({
        clerkId: event.data.id,
        email: event.data.email_addresses[0]?.email_address,
      });
      break;
    case 'organization.created':
      await db.insert(organizations).values({
        clerkOrgId: event.data.id,
        name: event.data.name,
        slug: event.data.slug,
      });
      break;
    case 'organizationMembership.created':
      await db.insert(organizationUsers).values({
        clerkUserId: event.data.public_user_data.user_id,
        clerkOrgId: event.data.organization.id,
        role: mapClerkRole(event.data.role),
      });
      break;
  }
  res.status(200).json({ received: true });
});
```

### Stripe subscription integration

```typescript
// Create checkout session
app.post('/api/checkout', requireAuth, async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    customer: await getOrCreateStripeCustomer(req.user),
    line_items: [{ price: req.body.priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${APP_URL}/billing?success=true`,
    subscription_data: { metadata: { orgId: req.tenantContext.organizationId } },
  });
  res.json({ url: session.url });
});

// Webhook for subscription updates
app.post('/api/webhooks/stripe', async (req, res) => {
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object;
    await db.update(subscriptions)
      .set({ status: sub.status, currentPeriodEnd: new Date(sub.current_period_end * 1000) })
      .where(eq(subscriptions.stripeSubscriptionId, sub.id));
  }
  res.status(200).send();
});
```

### Translation API (DeepL recommended)

DeepL produces **1.3x more accurate** translations for natural language like menu descriptions:

```typescript
import * as deepl from 'deepl-node';
const translator = new deepl.Translator(process.env.DEEPL_API_KEY);

export async function translateMenuItems(items: { name: string; description: string }[], targetLang: string) {
  const texts = items.flatMap(i => [i.name, i.description]);
  const results = await translator.translateText(texts, null, targetLang);
  
  return items.map((item, i) => ({
    name: results[i * 2].text,
    description: results[i * 2 + 1].text,
  }));
}
```

Cache translations in Redis (TTL 30 days) to reduce API costs.

### QR code generation

```typescript
import QRCode from 'qrcode';

export async function generateQRCode(url: string, options = {}) {
  return QRCode.toBuffer(url, {
    type: 'png',
    width: 400,
    margin: 2,
    errorCorrectionLevel: 'H', // High - allows logo overlay
    color: { dark: options.darkColor || '#000', light: options.lightColor || '#fff' },
  });
}
```

### PDF generation with @react-pdf/renderer

```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';

function MenuPDF({ restaurant, sections }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{restaurant.name}</Text>
        {sections.map(section => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.name}</Text>
            {section.items.map(item => (
              <View key={item.id} style={styles.item}>
                <Text>{item.name}</Text>
                <Text>${(item.price / 100).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

// Generate PDF buffer
const pdf = await renderToBuffer(<MenuPDF {...data} />);
```

### Image storage with Cloudflare R2

R2 has **zero egress fees**—critical for serving menu images:

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_KEY_ID, secretAccessKey: R2_SECRET },
});

export async function uploadMenuImage(file: File, menuId: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  
  // Optimize image
  const optimized = await sharp(buffer)
    .resize(1200, null, { withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  
  const key = `menus/${menuId}/${Date.now()}.webp`;
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: optimized, ContentType: 'image/webp' }));
  
  return `${R2_PUBLIC_URL}/${key}`;
}
```

---

## 8. Week-by-week 12-week timeline

### Phase 1: Foundations (Weeks 1-2)

**Week 1: Project setup and auth**
- Initialize Turborepo monorepo with pnpm
- Set up shared-types, database, ui packages
- Configure Clerk with Organizations enabled
- Implement Clerk webhooks for user/org sync
- Create basic authentication middleware
- **Deliverable**: User can sign up, create organization, invite members

**Week 2: Database and API skeleton**
- Define complete Drizzle schema (all entities)
- Run initial migrations
- Set up Fastify with routing structure
- Implement RLS tenant context middleware
- Create organization and venue CRUD endpoints
- **Deliverable**: API serves organization/venue data with proper isolation

### Phase 2: Core menu system (Weeks 3-4)

**Week 3: Menu data model and CRUD**
- Implement menu, section, item CRUD endpoints
- Add menu_item_options table and endpoints
- Create Zod schemas for all menu entities
- Set up React Query in frontend
- **Deliverable**: Full menu CRUD working via API

**Week 4: Dashboard foundation**
- Build DashboardLayout with sidebar navigation
- Create venue list and detail pages
- Implement menu list page with status badges
- Add basic form handling with React Hook Form + Zod
- **Deliverable**: User can manage venues and view menus in dashboard

### Phase 3: Editor and public menus (Weeks 5-6)

**Week 5: Drag-and-drop menu editor**
- Integrate dnd-kit for section/item reordering
- Implement optimistic updates for reordering
- Add undo/redo with useMenuHistory hook
- Create item edit modal with options support
- **Deliverable**: Visual menu editor with drag-and-drop

**Week 6: Public menu pages**
- Build public menu page component
- Implement JSON-LD structured data for SEO
- Add responsive mobile-first styling
- Create venue slug routing
- Generate and display QR codes
- **Deliverable**: Public menu accessible via QR code

### Phase 4: Polish and scheduling (Weeks 7-8)

**Week 7: Theming system**
- Implement CSS variable-based theming
- Create theme configuration UI
- Add live preview in editor
- Build 3-4 default theme templates
- **Deliverable**: Restaurants can customize menu appearance

**Week 8: Menu scheduling**
- Build schedule CRUD endpoints
- Implement schedule evaluation algorithm
- Add schedule management UI
- Create "active menu" resolution logic
- **Deliverable**: Menus auto-switch based on time/day

### Phase 5: Internationalization (Weeks 9-10)

**Week 9: Multi-language support**
- Implement translations table and endpoints
- Integrate DeepL API for auto-translation
- Add translation caching with Redis
- Build language selector for public menus
- **Deliverable**: Menus available in multiple languages

**Week 10: Dietary filters and allergens**
- Add dietary tag management UI
- Implement allergen tagging system
- Build filter UI for public menus
- Add allergen icons and legends
- **Deliverable**: Diners can filter by dietary needs

### Phase 6: Monetization and distribution (Weeks 11-12)

**Week 11: Stripe billing and embeddable widget**
- Set up Stripe products/prices
- Implement checkout flow
- Add customer portal integration
- Build embeddable iframe widget
- Configure CDN for widget delivery
- **Deliverable**: Paid subscriptions working, widget embeddable

**Week 12: PDF export, polish, and launch prep**
- Implement PDF menu generation
- Create PDF template selection
- Add custom domain verification flow (Pro tier)
- Comprehensive testing and bug fixes
- Write deployment documentation
- **Deliverable**: MVP ready for launch

### Buffer considerations

Each phase includes ~20% buffer. If falling behind:
- Week 7-8: Theming can be simplified to 1-2 templates
- Week 9-10: Auto-translation can be deferred to post-MVP
- Week 11: Custom domains can launch after MVP

---

## 9. Cost estimates

### MVP monthly costs

| Service | Cost |
|---------|------|
| VPS (Hetzner CX22) | $5 |
| Domain | $1 |
| Cloudflare (Free tier) | $0 |
| PostgreSQL (self-hosted) | $0 |
| Email (Resend free tier) | $0 |
| **Total** | **~$6/month** |

### Growth phase (~500 users)

| Service | Cost |
|---------|------|
| VPS (Hetzner CX32) | $9 |
| Managed PostgreSQL (Supabase Pro) | $25 |
| Clerk Pro | $25 |
| DeepL API | ~$70 |
| Cloudflare R2 | ~$5 |
| **Total** | **~$135/month** |

---

## 10. Critical success patterns

**Domain modeling first**: Define Zod schemas in shared-types before writing any implementation. This ensures frontend and backend agree on data shapes.

**RLS from day one**: Never query without tenant context. The RLS pattern prevents accidental data leaks even if application code has bugs.

**Optimistic updates for editor**: Menu editing must feel instant. Update local state immediately, sync to server in background, and roll back on failure.

**Type-safe IDs**: Branded types for IDs catch bugs at compile time that would otherwise cause runtime data corruption.

**Start simple, then optimize**: Begin with synchronous operations, add background jobs only when proven necessary. Many "scaling" problems never materialize at MVP scale.

This implementation plan provides everything needed to build MenuCraft from scratch. The 12-week timeline is aggressive but achievable for a focused solo developer who follows the phased approach and doesn't over-engineer early phases.