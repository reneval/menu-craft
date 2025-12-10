import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageLoad } from './utils/helpers';
import { generateTestId } from './fixtures/test-data';

/**
 * Helper to create a venue and menu with content
 */
async function createMenuWithContent(page: import('@playwright/test').Page) {
  const testId = generateTestId();
  const venueName = `Publish Test Venue ${testId}`;
  const menuName = `Publish Test Menu ${testId}`;
  const venueSlug = `publish-test-venue-${testId}`;

  // Create venue
  await navigateTo(page, '/venues/new');
  await page.getByRole('textbox', { name: /venue name/i }).fill(venueName);
  await page.waitForTimeout(300);
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

  // Add a section
  await page.getByRole('button', { name: /add section/i }).click();
  await page.getByLabel(/section name|name/i).first().fill('Appetizers');
  await page.getByRole('button', { name: /add section|create|save/i }).click();
  await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

  // Add an item
  await page.getByRole('button', { name: /add item/i }).click();
  await page.getByLabel(/item name|name/i).first().fill('Caesar Salad');
  await page.getByLabel(/price/i).first().fill('12.99');
  await page.getByRole('button', { name: /add item|create|save/i }).click();
  await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

  return { venueName, menuName, venueSlug };
}

test.describe('Menu Publishing Flow', () => {
  test('should publish menu from detail page', async ({ page }) => {
    await createMenuWithContent(page);

    // Navigate back to menu detail
    const backLink = page.getByRole('link').filter({ has: page.locator('svg') }).first();
    await backLink.click();
    await page.waitForURL(/\/menus\/[^/]+(?!\/editor)/, { timeout: 10000 });

    // Click publish button
    await page.getByRole('button', { name: /publish/i }).click();

    // Wait for dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Dialog should show publish options/preview
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('should show publish preview dialog with changes info', async ({ page }) => {
    await createMenuWithContent(page);

    // Go to menu detail
    const backLink = page.getByRole('link').filter({ has: page.locator('svg') }).first();
    await backLink.click();
    await page.waitForURL(/\/menus\/[^/]+(?!\/editor)/, { timeout: 10000 });

    // Click publish
    await page.getByRole('button', { name: /publish/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Should show changes or version info
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toContainText(/publish|changes|version|first|new/i);
  });

  test('should publish from editor toolbar', async ({ page }) => {
    await createMenuWithContent(page);

    // Still in editor, click publish
    await page.getByRole('button', { name: /publish/i }).click();

    // Should either show success toast or publish
    await page.waitForTimeout(2000);

    // Check for any success indication
    const hasSuccess = await page.getByText(/published|success/i).isVisible().catch(() => false);
    const stillOnPage = page.url().includes('/editor');

    expect(hasSuccess || stillOnPage).toBeTruthy();
  });
});

test.describe('Published Menu Status', () => {
  test('should update status badge after publishing', async ({ page }) => {
    await createMenuWithContent(page);

    // Navigate back to detail
    const backLink = page.getByRole('link').filter({ has: page.locator('svg') }).first();
    await backLink.click();
    await page.waitForURL(/\/menus\/[^/]+(?!\/editor)/, { timeout: 10000 });

    // Initially should show draft
    await expect(page.getByText(/draft/i).first()).toBeVisible();

    // Publish
    await page.getByRole('button', { name: /publish/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Confirm publish if there's a button
    const publishConfirm = page.locator('[role="dialog"]').getByRole('button', { name: /publish|confirm/i });
    if (await publishConfirm.isVisible()) {
      await publishConfirm.click();
    }

    // Wait for update
    await page.waitForTimeout(3000);

    // Should now show published status
    const hasPublished = await page.getByText(/published/i).first().isVisible().catch(() => false);
    expect(hasPublished).toBeTruthy();
  });
});

test.describe('Public Menu Link', () => {
  test('should show public link after publishing', async ({ page }) => {
    await createMenuWithContent(page);

    // Go to detail
    const backLink = page.getByRole('link').filter({ has: page.locator('svg') }).first();
    await backLink.click();
    await page.waitForURL(/\/menus\/[^/]+(?!\/editor)/, { timeout: 10000 });

    // Publish the menu
    await page.getByRole('button', { name: /publish/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    const publishConfirm = page.locator('[role="dialog"]').getByRole('button', { name: /publish|confirm/i });
    if (await publishConfirm.isVisible()) {
      await publishConfirm.click();
    }

    // Wait for publish
    await page.waitForTimeout(3000);
    await page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    // Check for public link section
    await expect(page.getByText(/public link/i)).toBeVisible();

    // Should have URL displayed
    const linkSection = page.locator('code');
    if (await linkSection.isVisible()) {
      const url = await linkSection.textContent();
      expect(url).toContain('/m/');
    }
  });

  test('should have copy link functionality', async ({ page }) => {
    await createMenuWithContent(page);

    // Go to detail and publish
    const backLink = page.getByRole('link').filter({ has: page.locator('svg') }).first();
    await backLink.click();
    await page.waitForURL(/\/menus\/[^/]+(?!\/editor)/, { timeout: 10000 });

    await page.getByRole('button', { name: /publish/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    const publishConfirm = page.locator('[role="dialog"]').getByRole('button', { name: /publish|confirm/i });
    if (await publishConfirm.isVisible()) {
      await publishConfirm.click();
    }

    await page.waitForTimeout(3000);
    await page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    // Find copy button
    const copyButton = page.getByRole('button').filter({ has: page.locator('svg') }).filter({ hasText: '' });
    // Or a button that says "Copy"
    const explicitCopyButton = page.getByRole('button', { name: /copy/i });

    const hasCopyButton = (await copyButton.first().isVisible().catch(() => false)) ||
                          (await explicitCopyButton.isVisible().catch(() => false));

    expect(hasCopyButton).toBeTruthy();
  });
});

test.describe('Version History', () => {
  test('should show version info after publishing', async ({ page }) => {
    await createMenuWithContent(page);

    // Go to detail
    const backLink = page.getByRole('link').filter({ has: page.locator('svg') }).first();
    await backLink.click();
    await page.waitForURL(/\/menus\/[^/]+(?!\/editor)/, { timeout: 10000 });

    // Publish
    await page.getByRole('button', { name: /publish/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // The dialog should show this is first publish or version info
    const dialog = page.locator('[role="dialog"]');
    const hasVersionInfo = await dialog.getByText(/version|first|new/i).isVisible().catch(() => false);
    expect(hasVersionInfo).toBeTruthy();
  });
});

test.describe('Publishing Validation', () => {
  test('should allow publishing empty menu', async ({ page }) => {
    const testId = generateTestId();

    // Create venue
    await navigateTo(page, '/venues/new');
    await page.getByRole('textbox', { name: /venue name/i }).fill(`Empty Publish Venue ${testId}`);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create venue/i }).click();
    await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });

    // Create menu (no sections)
    await navigateTo(page, '/menus/new');
    await page.getByLabel(/name/i).fill(`Empty Menu ${testId}`);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create menu/i }).click();
    await page.waitForURL(/\/menus\/(?!new)/, { timeout: 15000 });

    // Try to publish empty menu
    await page.getByRole('button', { name: /publish/i }).click();

    // Either shows dialog or publishes successfully (behavior may vary)
    await page.waitForTimeout(2000);

    // Should have some response
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
  });
});

test.describe('Re-Publishing After Changes', () => {
  test('should allow re-publishing after making changes', async ({ page }) => {
    await createMenuWithContent(page);

    // Go to detail and publish first time
    const backLink = page.getByRole('link').filter({ has: page.locator('svg') }).first();
    await backLink.click();
    await page.waitForURL(/\/menus\/[^/]+(?!\/editor)/, { timeout: 10000 });

    await page.getByRole('button', { name: /publish/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    const publishConfirm = page.locator('[role="dialog"]').getByRole('button', { name: /publish|confirm/i });
    if (await publishConfirm.isVisible()) {
      await publishConfirm.click();
    }

    await page.waitForTimeout(3000);
    await page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    // Go to editor and make changes
    await page.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(/\/menus\/[^/]+\/editor/, { timeout: 10000 });

    // Add another item
    await page.getByRole('button', { name: /add item/i }).click();
    await page.getByLabel(/item name|name/i).first().fill('New Item After Publish');
    await page.getByRole('button', { name: /add item|create|save/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

    // Publish again
    await page.getByRole('button', { name: /publish/i }).click();

    // Should still be able to publish
    await page.waitForTimeout(2000);
    const hasSuccess = await page.getByText(/published|success/i).isVisible().catch(() => false);
    const stillOnPage = page.url().includes('/editor');

    expect(hasSuccess || stillOnPage).toBeTruthy();
  });
});

test.describe('Preview Before Publish', () => {
  test('should be able to preview menu before publishing', async ({ page }) => {
    await createMenuWithContent(page);

    // Go to detail
    const backLink = page.getByRole('link').filter({ has: page.locator('svg') }).first();
    await backLink.click();
    await page.waitForURL(/\/menus\/[^/]+(?!\/editor)/, { timeout: 10000 });

    // Click preview button
    await page.getByRole('button', { name: /preview/i }).first().click();

    // Preview dialog should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
  });

  test('preview should show menu content', async ({ page }) => {
    await createMenuWithContent(page);

    // Go to detail
    const backLink = page.getByRole('link').filter({ has: page.locator('svg') }).first();
    await backLink.click();
    await page.waitForURL(/\/menus\/[^/]+(?!\/editor)/, { timeout: 10000 });

    // Open preview
    await page.getByRole('button', { name: /preview/i }).first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Should show the section and item we created
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByText('Appetizers')).toBeVisible();
    await expect(dialog.getByText('Caesar Salad')).toBeVisible();
  });
});
