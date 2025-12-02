-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types (enums)
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
CREATE TYPE menu_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE price_type AS ENUM ('fixed', 'variable', 'market_price');
CREATE TYPE schedule_type AS ENUM ('always', 'time_range', 'day_of_week', 'date_range');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'incomplete', 'trialing');

-- RLS helper function to get current organization
CREATE OR REPLACE FUNCTION current_organization_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_organization_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO menucraft;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO menucraft;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO menucraft;
