import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'editor', 'viewer']);

export const menuStatusEnum = pgEnum('menu_status', ['draft', 'published', 'archived']);

export const priceTypeEnum = pgEnum('price_type', ['fixed', 'variable', 'market_price']);

export const scheduleTypeEnum = pgEnum('schedule_type', [
  'always',
  'time_range',
  'day_of_week',
  'date_range',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'trialing',
]);

export const qrTargetTypeEnum = pgEnum('qr_target_type', ['menu', 'venue']);

export const entityTypeEnum = pgEnum('entity_type', ['menu', 'menu_section', 'menu_item', 'menu_item_option']);
