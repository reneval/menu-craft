/**
 * Test data factories for API unit tests
 */

import { randomUUID } from 'crypto';

// Test IDs
export const TEST_ORG_ID = 'org_test_123';
export const TEST_USER_ID = 'user_test_123';
export const TEST_VENUE_ID = randomUUID();
export const TEST_MENU_ID = randomUUID();
export const TEST_SECTION_ID = randomUUID();
export const TEST_ITEM_ID = randomUUID();

/**
 * Generate unique test ID
 */
export function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a test organization
 */
export function createTestOrganization(overrides: Partial<TestOrganization> = {}): TestOrganization {
  const id = generateTestId();
  return {
    id: `org_${id}`,
    clerkId: `clerk_org_${id}`,
    name: `Test Organization ${id}`,
    slug: `test-org-${id}`,
    planId: 'free',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    trialEndsAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export interface TestOrganization {
  id: string;
  clerkId: string;
  name: string;
  slug: string;
  planId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a test venue
 */
export function createTestVenue(overrides: Partial<TestVenue> = {}): TestVenue {
  const id = randomUUID();
  const slug = `test-venue-${Date.now()}`;
  return {
    id,
    organizationId: TEST_ORG_ID,
    name: `Test Venue ${id.substring(0, 8)}`,
    slug,
    description: 'A test venue for unit tests',
    address: '123 Test Street',
    city: 'Test City',
    country: 'US',
    timezone: 'America/New_York',
    currency: 'USD',
    logoUrl: null,
    coverImageUrl: null,
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

export interface TestVenue {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  timezone: string;
  currency: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Create a test menu
 */
export function createTestMenu(overrides: Partial<TestMenu> = {}): TestMenu {
  const id = randomUUID();
  const slug = `test-menu-${Date.now()}`;
  return {
    id,
    venueId: TEST_VENUE_ID,
    organizationId: TEST_ORG_ID,
    name: `Test Menu ${id.substring(0, 8)}`,
    slug,
    description: 'A test menu for unit tests',
    isActive: true,
    isPublished: false,
    publishedAt: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

export interface TestMenu {
  id: string;
  venueId: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  isPublished: boolean;
  publishedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Create a test section
 */
export function createTestSection(overrides: Partial<TestSection> = {}): TestSection {
  const id = randomUUID();
  return {
    id,
    menuId: TEST_MENU_ID,
    name: `Test Section ${id.substring(0, 8)}`,
    description: 'A test section',
    sortOrder: 0,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export interface TestSection {
  id: string;
  menuId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a test menu item
 */
export function createTestItem(overrides: Partial<TestItem> = {}): TestItem {
  const id = randomUUID();
  return {
    id,
    sectionId: TEST_SECTION_ID,
    menuId: TEST_MENU_ID,
    name: `Test Item ${id.substring(0, 8)}`,
    description: 'A delicious test item',
    price: 1299, // cents
    imageUrl: null,
    sortOrder: 0,
    isAvailable: true,
    dietaryTags: [],
    allergens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export interface TestItem {
  id: string;
  sectionId: string;
  menuId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  sortOrder: number;
  isAvailable: boolean;
  dietaryTags: string[];
  allergens: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a test QR code
 */
export function createTestQRCode(overrides: Partial<TestQRCode> = {}): TestQRCode {
  const id = randomUUID();
  return {
    id,
    venueId: TEST_VENUE_ID,
    menuId: TEST_MENU_ID,
    organizationId: TEST_ORG_ID,
    code: `qr_${id.substring(0, 8)}`,
    scanCount: 0,
    lastScannedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export interface TestQRCode {
  id: string;
  venueId: string;
  menuId: string | null;
  organizationId: string;
  code: string;
  scanCount: number;
  lastScannedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create mock Fastify request context
 */
export function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    params: {},
    query: {},
    body: {},
    headers: {
      'content-type': 'application/json',
    },
    user: {
      id: TEST_USER_ID,
      orgId: TEST_ORG_ID,
    },
    organizationId: TEST_ORG_ID,
    ...overrides,
  };
}

/**
 * Create mock Fastify reply
 */
export function createMockReply() {
  const reply = {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
  };
  return reply;
}

// Import vi for mocking
import { vi } from 'vitest';
