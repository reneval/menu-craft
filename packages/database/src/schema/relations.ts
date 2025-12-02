import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { users, organizationUsers } from './users';
import { venues } from './venues';
import { menus } from './menus';
import { menuSections } from './menu-sections';
import { menuItems } from './menu-items';
import { menuItemOptions } from './menu-item-options';
import { menuSchedules } from './menu-schedules';
import { menuVersions } from './menu-versions';
import { subscriptions } from './subscriptions';
import { plans } from './plans';
import { qrCodes } from './qr-codes';
import { menuViews } from './menu-views';
import { customDomains } from './custom-domains';

// Organization relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  organizationUsers: many(organizationUsers),
  venues: many(venues),
  menus: many(menus),
  subscriptions: many(subscriptions),
  qrCodes: many(qrCodes),
}));

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  organizationUsers: many(organizationUsers),
}));

// OrganizationUser relations
export const organizationUsersRelations = relations(organizationUsers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationUsers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationUsers.userId],
    references: [users.id],
  }),
}));

// Venue relations
export const venuesRelations = relations(venues, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [venues.organizationId],
    references: [organizations.id],
  }),
  menus: many(menus),
  customDomains: many(customDomains),
}));

// Menu relations
export const menusRelations = relations(menus, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [menus.organizationId],
    references: [organizations.id],
  }),
  venue: one(venues, {
    fields: [menus.venueId],
    references: [venues.id],
  }),
  sections: many(menuSections),
  schedules: many(menuSchedules),
  versions: many(menuVersions),
}));

// MenuSection relations
export const menuSectionsRelations = relations(menuSections, ({ one, many }) => ({
  menu: one(menus, {
    fields: [menuSections.menuId],
    references: [menus.id],
  }),
  items: many(menuItems),
}));

// MenuItem relations
export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  section: one(menuSections, {
    fields: [menuItems.sectionId],
    references: [menuSections.id],
  }),
  options: many(menuItemOptions),
}));

// MenuItemOption relations
export const menuItemOptionsRelations = relations(menuItemOptions, ({ one }) => ({
  item: one(menuItems, {
    fields: [menuItemOptions.menuItemId],
    references: [menuItems.id],
  }),
}));

// MenuSchedule relations
export const menuSchedulesRelations = relations(menuSchedules, ({ one }) => ({
  menu: one(menus, {
    fields: [menuSchedules.menuId],
    references: [menus.id],
  }),
}));

// Subscription relations
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  plan: one(plans, {
    fields: [subscriptions.planId],
    references: [plans.id],
  }),
}));

// Plan relations
export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

// MenuView relations
export const menuViewsRelations = relations(menuViews, ({ one }) => ({
  venue: one(venues, {
    fields: [menuViews.venueId],
    references: [venues.id],
  }),
  menu: one(menus, {
    fields: [menuViews.menuId],
    references: [menus.id],
  }),
}));

// CustomDomain relations
export const customDomainsRelations = relations(customDomains, ({ one }) => ({
  organization: one(organizations, {
    fields: [customDomains.organizationId],
    references: [organizations.id],
  }),
  venue: one(venues, {
    fields: [customDomains.venueId],
    references: [venues.id],
  }),
}));

// MenuVersion relations
export const menuVersionsRelations = relations(menuVersions, ({ one }) => ({
  menu: one(menus, {
    fields: [menuVersions.menuId],
    references: [menus.id],
  }),
  organization: one(organizations, {
    fields: [menuVersions.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [menuVersions.createdBy],
    references: [users.id],
  }),
}));
