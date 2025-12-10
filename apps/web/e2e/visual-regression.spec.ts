import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageLoad } from './utils/helpers';
import { generateTestId } from './fixtures/test-data';

/**
 * Visual Regression Tests
 *
 * These tests capture screenshots to detect visual changes.
 * Use `pnpm test:e2e:visual` to run only visual tests.
 * Use `pnpm test:e2e --update-snapshots` to update baseline screenshots.
 */

test.describe('Visual Regression @visual', () => {
  // Use only chromium for visual tests to have consistent screenshots
  test.skip(({ browserName }) => browserName !== 'chromium', 'Visual tests run only on Chromium');

  test.describe('Dashboard', () => {
    test('dashboard page should match snapshot', async ({ page }) => {
      await navigateTo(page, '/dashboard');
      await waitForPageLoad(page);

      // Wait for any animations to settle
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dashboard.png', {
        maxDiffPixels: 100,
        fullPage: true,
      });
    });
  });

  test.describe('Venues', () => {
    test('venues list page should match snapshot', async ({ page }) => {
      await navigateTo(page, '/venues');
      await waitForPageLoad(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('venues-list.png', {
        maxDiffPixels: 100,
        fullPage: true,
      });
    });

    test('create venue page should match snapshot', async ({ page }) => {
      await navigateTo(page, '/venues/new');
      await waitForPageLoad(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('venues-create.png', {
        maxDiffPixels: 100,
        fullPage: true,
      });
    });
  });

  test.describe('Menus', () => {
    test('menus list page should match snapshot', async ({ page }) => {
      await navigateTo(page, '/menus');
      await waitForPageLoad(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('menus-list.png', {
        maxDiffPixels: 100,
        fullPage: true,
      });
    });

    test('create menu page should match snapshot', async ({ page }) => {
      await navigateTo(page, '/menus/new');
      await waitForPageLoad(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('menus-create.png', {
        maxDiffPixels: 100,
        fullPage: true,
      });
    });
  });

  test.describe('Settings', () => {
    test('settings page should match snapshot', async ({ page }) => {
      await navigateTo(page, '/settings');
      await waitForPageLoad(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('settings.png', {
        maxDiffPixels: 100,
        fullPage: true,
      });
    });
  });

  test.describe('Public Menu', () => {
    test('public menu 404 should match snapshot', async ({ page }) => {
      await page.goto('/m/non-existent-venue');
      await waitForPageLoad(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('public-menu-404.png', {
        maxDiffPixels: 100,
        fullPage: true,
      });
    });
  });
});

test.describe('Visual Regression - Mobile @visual', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Visual tests run only on Chromium');
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('dashboard mobile should match snapshot', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      maxDiffPixels: 100,
      fullPage: true,
    });
  });

  test('venues list mobile should match snapshot', async ({ page }) => {
    await navigateTo(page, '/venues');
    await waitForPageLoad(page);
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('venues-list-mobile.png', {
      maxDiffPixels: 100,
      fullPage: true,
    });
  });

  test('menus list mobile should match snapshot', async ({ page }) => {
    await navigateTo(page, '/menus');
    await waitForPageLoad(page);
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('menus-list-mobile.png', {
      maxDiffPixels: 100,
      fullPage: true,
    });
  });
});

test.describe('Visual Regression - Dark Mode @visual', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Visual tests run only on Chromium');
  test.use({ colorScheme: 'dark' });

  test('dashboard dark mode should match snapshot', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dashboard-dark.png', {
      maxDiffPixels: 100,
      fullPage: true,
    });
  });
});

test.describe('Visual Regression - Components @visual', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Visual tests run only on Chromium');

  test('dialog should match snapshot', async ({ page }) => {
    const testId = generateTestId();

    // Create venue to get to editor
    await navigateTo(page, '/venues/new');
    await page.getByRole('textbox', { name: /venue name/i }).fill(`Visual Test Venue ${testId}`);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create venue/i }).click();
    await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });

    // Create menu
    await navigateTo(page, '/menus/new');
    await page.getByLabel(/name/i).fill(`Visual Test Menu ${testId}`);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create menu/i }).click();
    await page.waitForURL(/\/menus\/(?!new)/, { timeout: 15000 });

    // Go to editor
    await page.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(/\/menus\/[^/]+\/editor/, { timeout: 10000 });

    // Open add section dialog
    await page.getByRole('button', { name: /add section/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(300);

    // Take screenshot of the dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveScreenshot('add-section-dialog.png', {
      maxDiffPixels: 50,
    });
  });

  test('form validation error should match snapshot', async ({ page }) => {
    await navigateTo(page, '/venues/new');
    await waitForPageLoad(page);

    // Try to submit empty form
    await page.getByRole('button', { name: /create venue/i }).click();
    await page.waitForTimeout(500);

    // Take screenshot showing validation state
    await expect(page).toHaveScreenshot('form-validation-error.png', {
      maxDiffPixels: 100,
      fullPage: true,
    });
  });
});
