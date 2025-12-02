-- Row-Level Security Policies for Multi-Tenancy
-- These policies ensure data isolation between organizations

-- Note: RLS policies are applied after tables are created by Drizzle migrations
-- This file serves as documentation and can be run manually or via a post-migration script

-- Example RLS policy template for tenant tables:
--
-- ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE table_name FORCE ROW LEVEL SECURITY;
--
-- CREATE POLICY tenant_isolation_policy ON table_name
--   USING (organization_id = current_organization_id())
--   WITH CHECK (organization_id = current_organization_id());

-- Tables requiring RLS (organization_id column):
-- - venues
-- - menus
-- - menu_sections
-- - menu_items
-- - menu_item_options
-- - menu_schedules
-- - translations
-- - qr_codes
-- - subscriptions

-- Tables NOT requiring RLS (global or cross-tenant):
-- - organizations (accessed by ID directly)
-- - users (synced from Clerk, accessed via organization_users)
-- - organization_users (join table with its own access patterns)
-- - plans (global pricing plans)

-- The API sets the tenant context at request start:
-- SET app.current_organization_id = 'uuid-here';
