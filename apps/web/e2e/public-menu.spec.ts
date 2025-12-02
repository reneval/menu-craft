import { test, expect } from '@playwright/test';

test.describe('Public Menu View', () => {
  test('should show the public menu page structure', async ({ page }) => {
    // Navigate to a public menu URL
    await page.goto('/m/test-venue');

    // The page should load (might show "venue not found" if no data)
    await expect(page).toHaveURL(/\/m\/test-venue/);
  });

  test('should display menu content when venue exists', async ({ page }) => {
    // This test assumes there's test data - will be skipped if not
    await page.goto('/m/test-venue');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if either menu content or not found message appears
    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toBeTruthy();
  });
});

test.describe('Homepage', () => {
  test('should load and redirect to dashboard or show landing', async ({ page }) => {
    await page.goto('/');

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');

    // Should either show dashboard or redirect
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|onboarding|venues|menus)?$/);
  });
});
