/**
 * Test data fixtures for E2E tests
 *
 * These utilities help create consistent test data across E2E tests.
 * Uses randomized suffixes to avoid conflicts between test runs.
 */

/**
 * Generate a unique test ID for this test run
 */
export function generateTestId(): string {
  return Math.random().toString(36).substring(2, 8);
}

/**
 * Test venue data
 */
export interface TestVenue {
  name: string;
  slug: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
}

/**
 * Create test venue data with unique identifiers
 */
export function createTestVenueData(suffix?: string): TestVenue {
  const id = suffix || generateTestId();
  return {
    name: `Test Venue ${id}`,
    slug: `test-venue-${id}`,
    address: '123 Test Street',
    city: 'Test City',
    country: 'US',
    timezone: 'America/New_York',
  };
}

/**
 * Test menu data
 */
export interface TestMenu {
  name: string;
  slug: string;
  description?: string;
}

/**
 * Create test menu data with unique identifiers
 */
export function createTestMenuData(suffix?: string): TestMenu {
  const id = suffix || generateTestId();
  return {
    name: `Test Menu ${id}`,
    slug: `test-menu-${id}`,
    description: 'A test menu for E2E testing',
  };
}

/**
 * Test section data
 */
export interface TestSection {
  name: string;
  description?: string;
}

/**
 * Create test section data
 */
export function createTestSectionData(name?: string): TestSection {
  return {
    name: name || 'Test Section',
    description: 'A test section for E2E testing',
  };
}

/**
 * Test item data
 */
export interface TestItem {
  name: string;
  description?: string;
  price?: string;
  dietaryTags?: string[];
  allergens?: string[];
}

/**
 * Create test item data
 */
export function createTestItemData(name?: string): TestItem {
  return {
    name: name || 'Test Item',
    description: 'A delicious test item',
    price: '12.99',
    dietaryTags: [],
    allergens: [],
  };
}

/**
 * Predefined test data sets for common scenarios
 */
export const TEST_DATA = {
  venues: {
    restaurant: {
      name: 'Test Restaurant',
      slug: 'test-restaurant',
      address: '123 Main St',
      city: 'New York',
      country: 'US',
      timezone: 'America/New_York',
    },
    cafe: {
      name: 'Test Cafe',
      slug: 'test-cafe',
      address: '456 Coffee Ave',
      city: 'Seattle',
      country: 'US',
      timezone: 'America/Los_Angeles',
    },
  },
  menus: {
    lunch: {
      name: 'Lunch Menu',
      slug: 'lunch-menu',
      description: 'Available Monday-Friday 11am-3pm',
    },
    dinner: {
      name: 'Dinner Menu',
      slug: 'dinner-menu',
      description: 'Available daily 5pm-10pm',
    },
  },
  sections: {
    appetizers: {
      name: 'Appetizers',
      description: 'Start your meal right',
    },
    mains: {
      name: 'Main Courses',
      description: 'Hearty entrees',
    },
    desserts: {
      name: 'Desserts',
      description: 'Sweet endings',
    },
    beverages: {
      name: 'Beverages',
      description: 'Drinks and refreshments',
    },
  },
  items: {
    caesarSalad: {
      name: 'Caesar Salad',
      description: 'Crisp romaine lettuce with classic Caesar dressing',
      price: '12.99',
      dietaryTags: ['vegetarian'],
      allergens: ['dairy', 'eggs'],
    },
    grilledSalmon: {
      name: 'Grilled Salmon',
      description: 'Fresh Atlantic salmon with seasonal vegetables',
      price: '24.99',
      dietaryTags: ['gluten-free'],
      allergens: ['fish'],
    },
    chocolateCake: {
      name: 'Chocolate Cake',
      description: 'Rich chocolate layer cake with ganache',
      price: '8.99',
      dietaryTags: ['vegetarian'],
      allergens: ['dairy', 'eggs', 'gluten'],
    },
    veganBurger: {
      name: 'Vegan Burger',
      description: 'Plant-based patty with all the fixings',
      price: '16.99',
      dietaryTags: ['vegan', 'vegetarian'],
      allergens: ['soy'],
    },
  },
} as const;

/**
 * Full menu structure for comprehensive testing
 */
export const COMPLETE_MENU_DATA = {
  venue: TEST_DATA.venues.restaurant,
  menu: TEST_DATA.menus.lunch,
  sections: [
    {
      ...TEST_DATA.sections.appetizers,
      items: [TEST_DATA.items.caesarSalad],
    },
    {
      ...TEST_DATA.sections.mains,
      items: [TEST_DATA.items.grilledSalmon, TEST_DATA.items.veganBurger],
    },
    {
      ...TEST_DATA.sections.desserts,
      items: [TEST_DATA.items.chocolateCake],
    },
  ],
};
