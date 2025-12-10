/**
 * Authentication helpers for E2E tests
 *
 * These utilities help manage Clerk authentication state in E2E tests.
 * In development/test mode, Clerk allows setting up test sessions.
 */

import { Page, BrowserContext } from '@playwright/test';

/**
 * Storage state file path for authenticated sessions
 */
export const AUTH_STATE_PATH = 'e2e/.auth/user.json';

/**
 * Wait for the app to be fully loaded and authenticated
 */
export async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Wait for React to hydrate
  await page.waitForTimeout(500);
}

/**
 * Check if user is authenticated by looking for dashboard elements
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check for sidebar or dashboard elements that only appear when logged in
  const sidebar = page.locator('aside, [data-testid="sidebar"], nav').first();
  return sidebar.isVisible().catch(() => false);
}

/**
 * Navigate to a page and wait for it to be ready
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForAppReady(page);
}

/**
 * Setup function to ensure user is authenticated
 * This should be called in beforeEach or as a fixture
 */
export async function ensureAuthenticated(page: Page): Promise<void> {
  await page.goto('/');
  await waitForAppReady(page);

  // If redirected to sign-in or onboarding, we need auth
  const currentUrl = page.url();
  if (currentUrl.includes('sign-in') || currentUrl.includes('clerk')) {
    // In test environment, Clerk should auto-login or we need to handle it
    console.warn('User not authenticated - tests may fail');
  }
}

/**
 * Setup for tests that require a clean slate
 * Use this when you need predictable test data
 */
export async function setupTestEnvironment(page: Page): Promise<void> {
  await ensureAuthenticated(page);

  // Check if onboarding is complete
  const url = page.url();
  if (url.includes('onboarding')) {
    console.log('Onboarding required - tests will handle this');
  }
}

/**
 * Get the current organization ID from the URL or storage
 */
export async function getCurrentOrgId(page: Page): Promise<string | null> {
  // Try to get from local storage
  const orgId = await page.evaluate(() => {
    return localStorage.getItem('currentOrgId');
  });
  return orgId;
}

/**
 * Get the current venue ID from the URL or storage
 */
export async function getCurrentVenueId(page: Page): Promise<string | null> {
  const venueId = await page.evaluate(() => {
    return localStorage.getItem('currentVenueId');
  });
  return venueId;
}
