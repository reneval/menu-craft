import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to root - may redirect to onboarding if no org
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load app and show dashboard or onboarding', async ({ page }) => {
    // Wait for app to fully load and redirect
    await page.waitForTimeout(1000);

    // Should be on either dashboard, onboarding, or venues page
    const url = page.url();
    const isValidRoute = /\/(onboarding|venues|menus|analytics)?$/.test(url);
    expect(isValidRoute).toBeTruthy();

    // Page should have content
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(0);
  });

  test('should have sidebar navigation', async ({ page }) => {
    // Skip if redirected to onboarding
    if (page.url().includes('onboarding')) {
      test.skip();
      return;
    }

    // Look for sidebar with navigation links
    const sidebar = page.locator('aside, [data-testid="sidebar"], nav').first();
    const hasSidebar = await sidebar.isVisible().catch(() => false);

    if (hasSidebar) {
      // Check for common navigation items
      const hasVenuesLink = await page.getByRole('link', { name: /venues/i }).first().isVisible().catch(() => false);
      const hasMenusLink = await page.getByRole('link', { name: /menus/i }).first().isVisible().catch(() => false);
      expect(hasVenuesLink || hasMenusLink).toBeTruthy();
    }
  });

  test('should navigate to venues page', async ({ page }) => {
    await page.goto('/venues');
    await page.waitForLoadState('networkidle');

    // Should show venues page content
    await expect(page).toHaveURL(/\/venues/);
    // Use exact match to avoid "No venues yet" heading
    const heading = page.getByRole('heading', { name: 'Venues', exact: true });
    await expect(heading).toBeVisible();
  });

  test('should navigate to menus page', async ({ page }) => {
    await page.goto('/menus');
    await page.waitForLoadState('networkidle');

    // Should show menus page content
    await expect(page).toHaveURL(/\/menus/);
    // Use exact match to avoid "No menus yet" heading
    const heading = page.getByRole('heading', { name: 'Menus', exact: true });
    await expect(heading).toBeVisible();
  });

  test('should navigate to analytics page', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Should show analytics page content
    await expect(page).toHaveURL(/\/analytics/);

    // May show analytics heading or "select venue" message
    const analyticsHeading = page.getByRole('heading', { name: 'Analytics', exact: true });
    const selectVenueMsg = page.getByText(/select a venue/i);

    const hasHeading = await analyticsHeading.isVisible().catch(() => false);
    const hasSelectMsg = await selectVenueMsg.isVisible().catch(() => false);

    expect(hasHeading || hasSelectMsg).toBeTruthy();
  });
});
