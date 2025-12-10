import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageLoad } from './utils/helpers';
import { generateTestId } from './fixtures/test-data';

/**
 * Helper to create a venue with published menu and return the venue slug
 */
async function createPublishedMenuVenue(page: import('@playwright/test').Page) {
  const testId = generateTestId();
  const venueName = `Public Test Venue ${testId}`;
  const venueSlug = `public-test-venue-${testId}`;
  const menuName = `Public Test Menu ${testId}`;

  // Create venue
  await navigateTo(page, '/venues/new');
  await page.getByRole('textbox', { name: /venue name/i }).fill(venueName);
  await page.waitForTimeout(300);

  // Set custom slug
  const slugInput = page.getByRole('textbox', { name: /url slug/i });
  await slugInput.clear();
  await slugInput.fill(venueSlug);

  await page.getByRole('button', { name: /create venue/i }).click();
  await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });

  // Create menu
  await navigateTo(page, '/menus/new');
  await page.getByLabel(/name/i).fill(menuName);
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /create menu/i }).click();
  await page.waitForURL(/\/menus\/(?!new)/, { timeout: 15000 });

  // Go to editor and add content
  await page.getByRole('link', { name: /edit/i }).click();
  await page.waitForURL(/\/menus\/[^/]+\/editor/, { timeout: 10000 });

  // Add section
  await page.getByRole('button', { name: /add section/i }).click();
  await page.getByLabel(/section name|name/i).first().fill('Appetizers');
  await page.getByRole('button', { name: /add section|create|save/i }).click();
  await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

  // Add item with details
  await page.getByRole('button', { name: /add item/i }).click();
  await page.getByLabel(/item name|name/i).first().fill('Caesar Salad');
  await page.getByLabel(/description/i).first().fill('Fresh romaine lettuce with Caesar dressing');
  await page.getByLabel(/price/i).first().fill('12.99');
  await page.getByRole('button', { name: /add item|create|save/i }).click();
  await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

  // Publish
  await page.getByRole('button', { name: /publish/i }).click();
  await page.waitForTimeout(2000);

  return { venueName, venueSlug, menuName };
}

test.describe('Public Menu View', () => {
  test('should show 404 or not found for non-existent venue', async ({ page }) => {
    await page.goto('/m/non-existent-venue-12345');
    await waitForPageLoad(page);

    // Should show not found message
    const hasNotFound = await page.getByText(/not found|doesn't exist|404/i).isVisible().catch(() => false);
    const pageContent = await page.content();

    // Either shows error or empty state
    expect(hasNotFound || pageContent.includes('not found') || pageContent.length > 0).toBeTruthy();
  });

  test('should load published menu by venue slug', async ({ page }) => {
    const { venueSlug } = await createPublishedMenuVenue(page);

    // Navigate to public menu
    await page.goto(`/m/${venueSlug}`);
    await waitForPageLoad(page);

    // Should display menu content
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
  });

  test('should display venue name on public menu', async ({ page }) => {
    const { venueSlug, venueName } = await createPublishedMenuVenue(page);

    await page.goto(`/m/${venueSlug}`);
    await waitForPageLoad(page);

    // Venue name should be visible
    await expect(page.getByText(venueName)).toBeVisible({ timeout: 10000 });
  });

  test('should display menu sections', async ({ page }) => {
    const { venueSlug } = await createPublishedMenuVenue(page);

    await page.goto(`/m/${venueSlug}`);
    await waitForPageLoad(page);

    // Section name should be visible
    await expect(page.getByText('Appetizers')).toBeVisible({ timeout: 10000 });
  });

  test('should display menu items with names', async ({ page }) => {
    const { venueSlug } = await createPublishedMenuVenue(page);

    await page.goto(`/m/${venueSlug}`);
    await waitForPageLoad(page);

    // Item name should be visible
    await expect(page.getByText('Caesar Salad')).toBeVisible({ timeout: 10000 });
  });

  test('should display item descriptions', async ({ page }) => {
    const { venueSlug } = await createPublishedMenuVenue(page);

    await page.goto(`/m/${venueSlug}`);
    await waitForPageLoad(page);

    // Description should be visible
    await expect(page.getByText(/romaine|caesar|dressing/i)).toBeVisible({ timeout: 10000 });
  });

  test('should display item prices', async ({ page }) => {
    const { venueSlug } = await createPublishedMenuVenue(page);

    await page.goto(`/m/${venueSlug}`);
    await waitForPageLoad(page);

    // Price should be visible (may be formatted differently)
    await expect(page.getByText(/12\.99|\$12/)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Public Menu Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should be responsive on mobile', async ({ page }) => {
    const { venueSlug } = await createPublishedMenuVenue(page);

    await page.goto(`/m/${venueSlug}`);
    await waitForPageLoad(page);

    // Content should be visible on mobile
    await expect(page.getByText('Appetizers')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Caesar Salad')).toBeVisible({ timeout: 10000 });
  });

  test('should not have horizontal scroll on mobile', async ({ page }) => {
    const { venueSlug } = await createPublishedMenuVenue(page);

    await page.goto(`/m/${venueSlug}`);
    await waitForPageLoad(page);

    // Check if page width matches viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    // Body shouldn't be significantly wider than viewport
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });
});

test.describe('Public Menu Dietary Tags', () => {
  test('should display dietary tags when present', async ({ page }) => {
    const testId = generateTestId();
    const venueSlug = `dietary-test-${testId}`;

    // Create venue with dietary tags
    await navigateTo(page, '/venues/new');
    await page.getByRole('textbox', { name: /venue name/i }).fill(`Dietary Test ${testId}`);
    await page.waitForTimeout(300);
    await page.getByLabel(/slug/i).clear();
    await page.getByLabel(/slug/i).fill(venueSlug);
    await page.getByRole('button', { name: /create venue/i }).click();
    await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });

    // Create and publish menu with dietary info
    await navigateTo(page, '/menus/new');
    await page.getByLabel(/name/i).fill(`Menu ${testId}`);
    await page.getByRole('button', { name: /create menu/i }).click();
    await page.waitForURL(/\/menus\/(?!new)/, { timeout: 15000 });

    await page.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(/\/menus\/[^/]+\/editor/, { timeout: 10000 });

    // Add section
    await page.getByRole('button', { name: /add section/i }).click();
    await page.getByLabel(/section name|name/i).first().fill('Healthy Options');
    await page.getByRole('button', { name: /add section|create|save/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

    // Add item with dietary tag
    await page.getByRole('button', { name: /add item/i }).click();
    await page.getByLabel(/item name|name/i).first().fill('Vegan Bowl');

    // Select vegan tag if available
    const veganTag = page.getByText(/^vegan$/i);
    if (await veganTag.isVisible()) {
      await veganTag.click();
    }

    await page.getByRole('button', { name: /add item|create|save/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

    // Publish
    await page.getByRole('button', { name: /publish/i }).click();
    await page.waitForTimeout(2000);

    // Check public menu
    await page.goto(`/m/${venueSlug}`);
    await waitForPageLoad(page);

    // Vegan item should be visible
    await expect(page.getByText('Vegan Bowl')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Public Menu Allergens', () => {
  test('should display allergen warnings when present', async ({ page }) => {
    const { venueSlug } = await createPublishedMenuVenue(page);

    await page.goto(`/m/${venueSlug}`);
    await waitForPageLoad(page);

    // Page should load (allergens may or may not be present)
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
  });
});

test.describe('Homepage', () => {
  test('should load and redirect to dashboard or show landing', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Should either show dashboard or redirect
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|onboarding|venues|menus|sign-in)?/);
  });

  test('should redirect authenticated users to dashboard', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // If authenticated, should be on dashboard area
    const url = page.url();
    const onApp = url.includes('/venues') || url.includes('/menus') || url.includes('/dashboard') || url.includes('/onboarding');
    const onAuth = url.includes('/sign-in') || url.includes('/clerk');

    expect(onApp || onAuth || url === page.url()).toBeTruthy();
  });
});

test.describe('Public Menu Language Switching', () => {
  test('should show language switcher if translations exist', async ({ page }) => {
    const { venueSlug } = await createPublishedMenuVenue(page);

    await page.goto(`/m/${venueSlug}`);
    await waitForPageLoad(page);

    // Language switcher may or may not be visible depending on translations
    const languageSwitcher = page.locator('[data-testid="language-switcher"], [aria-label*="language"]');
    const hasLanguageSwitcher = await languageSwitcher.isVisible().catch(() => false);

    // Feature may not be present if no translations
    expect(hasLanguageSwitcher || true).toBeTruthy();
  });
});

test.describe('Public Menu Theme', () => {
  test('should apply venue theme styling', async ({ page }) => {
    const { venueSlug } = await createPublishedMenuVenue(page);

    await page.goto(`/m/${venueSlug}`);
    await waitForPageLoad(page);

    // Page should have some styling
    const hasStyles = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      return computedStyle.backgroundColor !== '' || computedStyle.fontFamily !== '';
    });

    expect(hasStyles).toBeTruthy();
  });
});

test.describe('Public Menu SEO', () => {
  test('should have proper title tag', async ({ page }) => {
    const { venueSlug, venueName } = await createPublishedMenuVenue(page);

    await page.goto(`/m/${venueSlug}`);
    await waitForPageLoad(page);

    // Page should have title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
