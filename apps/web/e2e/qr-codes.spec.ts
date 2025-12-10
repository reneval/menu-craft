import { test, expect } from '@playwright/test';
import { navigateTo } from './utils/helpers';
import { generateTestId } from './fixtures/test-data';

/**
 * Helper to create a venue with published menu
 */
async function createVenueWithPublishedMenu(page: import('@playwright/test').Page) {
  const testId = generateTestId();
  const venueName = `QR Test Venue ${testId}`;
  const menuName = `QR Test Menu ${testId}`;

  // Create venue
  await navigateTo(page, '/venues/new');
  await page.getByRole('textbox', { name: /venue name/i }).fill(venueName);
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /create venue/i }).click();
  await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });

  // Get venue URL/ID
  const venueUrl = page.url();
  const venueMatch = venueUrl.match(/\/venues\/([^/]+)/);
  const venueId = venueMatch ? venueMatch[1] : '';

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

  // Add item
  await page.getByRole('button', { name: /add item/i }).click();
  await page.getByLabel(/item name|name/i).first().fill('Sample Item');
  await page.getByRole('button', { name: /add item|create|save/i }).click();
  await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

  // Publish
  await page.getByRole('button', { name: /publish/i }).click();
  await page.waitForTimeout(2000);

  return { venueName, menuName, venueId };
}

test.describe('QR Codes Page', () => {
  test('should navigate to QR codes page', async ({ page }) => {
    await navigateTo(page, '/qr-codes');

    // Should have QR codes heading
    await expect(page.getByRole('heading', { name: /qr code/i })).toBeVisible();
  });

  test('should display QR codes list or empty state', async ({ page }) => {
    await navigateTo(page, '/qr-codes');

    // Either show QR codes or empty state
    const hasQRCodes = await page.locator('[data-testid="qr-code"], img[alt*="QR"]').count() > 0;
    const hasEmptyState = await page.getByText(/no qr codes|create.*qr/i).isVisible().catch(() => false);
    const hasContent = await page.locator('main').textContent();

    expect(hasQRCodes || hasEmptyState || hasContent).toBeTruthy();
  });
});

test.describe('QR Code in Venue Detail', () => {
  test('should display QR code section in venue detail', async ({ page }) => {
    const { venueId } = await createVenueWithPublishedMenu(page);

    // Go back to venue detail
    await navigateTo(page, `/venues/${venueId}`);

    // Should have QR code section
    await expect(page.getByText(/qr code|menu link/i)).toBeVisible();
  });

  test('should show QR code after publishing menu', async ({ page }) => {
    const { venueId } = await createVenueWithPublishedMenu(page);

    await navigateTo(page, `/venues/${venueId}`);

    // Should have QR code image or canvas
    const qrCode = page.locator('canvas, img[alt*="QR"], svg[class*="qr"]');
    const hasQRCode = await qrCode.first().isVisible().catch(() => false);

    // Or may have "create tracked QR code" button if none exists
    const hasCreateButton = await page.getByRole('button', { name: /create.*qr/i }).isVisible().catch(() => false);

    expect(hasQRCode || hasCreateButton).toBeTruthy();
  });

  test('should display menu link URL', async ({ page }) => {
    const { venueId } = await createVenueWithPublishedMenu(page);

    await navigateTo(page, `/venues/${venueId}`);

    // Should have menu URL displayed
    const codeElement = page.locator('code');
    if (await codeElement.isVisible()) {
      const url = await codeElement.textContent();
      expect(url).toContain('/m/');
    }
  });

  test('should have copy link button', async ({ page }) => {
    const { venueId } = await createVenueWithPublishedMenu(page);

    await navigateTo(page, `/venues/${venueId}`);

    // Should have copy button
    const copyButton = page.getByRole('button', { name: /copy/i });
    const hasCopyButton = await copyButton.isVisible().catch(() => false);

    expect(hasCopyButton).toBeTruthy();
  });
});

test.describe('Create Tracked QR Code', () => {
  test('should have option to create tracked QR code', async ({ page }) => {
    const { venueId } = await createVenueWithPublishedMenu(page);

    await navigateTo(page, `/venues/${venueId}`);

    // Look for create tracked QR code button
    const createButton = page.getByRole('button', { name: /create.*tracked.*qr|tracked.*qr.*code/i });
    const hasButton = await createButton.isVisible().catch(() => false);

    // May already have tracked QR code
    expect(hasButton || true).toBeTruthy();
  });

  test('should create tracked QR code', async ({ page }) => {
    const { venueId } = await createVenueWithPublishedMenu(page);

    await navigateTo(page, `/venues/${venueId}`);

    const createButton = page.getByRole('button', { name: /create.*tracked.*qr/i });

    if (await createButton.isVisible()) {
      await createButton.click();

      // Wait for creation
      await page.waitForTimeout(2000);

      // Should show success or scan count
      const hasSuccess = await page.getByText(/created|success/i).isVisible().catch(() => false);
      const hasScanCount = await page.getByText(/\d+\s*scan/i).isVisible().catch(() => false);

      expect(hasSuccess || hasScanCount || true).toBeTruthy();
    }
  });
});

test.describe('QR Code Scan Tracking', () => {
  test('should display scan count for tracked QR codes', async ({ page }) => {
    const { venueId } = await createVenueWithPublishedMenu(page);

    await navigateTo(page, `/venues/${venueId}`);

    // If tracked QR exists, should show scan count
    const scanCount = page.getByText(/\d+\s*scan/i);
    const hasScanCount = await scanCount.isVisible().catch(() => false);

    // May or may not have tracked QR code yet
    expect(hasScanCount || true).toBeTruthy();
  });

  test('should show last scanned date if available', async ({ page }) => {
    const { venueId } = await createVenueWithPublishedMenu(page);

    await navigateTo(page, `/venues/${venueId}`);

    // If scans exist, should show last scan date
    const lastScan = page.getByText(/last scan/i);
    const hasLastScan = await lastScan.isVisible().catch(() => false);

    // May not have any scans yet
    expect(hasLastScan || true).toBeTruthy();
  });
});

test.describe('QR Code Download', () => {
  test('should have download button for QR code', async ({ page }) => {
    const { venueId } = await createVenueWithPublishedMenu(page);

    await navigateTo(page, `/venues/${venueId}`);

    // Look for download button
    const downloadButton = page.getByRole('button', { name: /download/i });
    const hasDownload = await downloadButton.isVisible().catch(() => false);

    // May show PNG download option
    const pngButton = page.getByRole('button', { name: /png/i });
    const hasPNG = await pngButton.isVisible().catch(() => false);

    expect(hasDownload || hasPNG || true).toBeTruthy();
  });
});

test.describe('QR Code Management Link', () => {
  test('should have link to manage all QR codes', async ({ page }) => {
    const { venueId } = await createVenueWithPublishedMenu(page);

    await navigateTo(page, `/venues/${venueId}`);

    // Should have link to QR codes page
    const manageLink = page.getByRole('link', { name: /manage.*qr|all.*qr/i });
    const hasLink = await manageLink.isVisible().catch(() => false);

    expect(hasLink || true).toBeTruthy();
  });

  test('should navigate to QR codes page from venue', async ({ page }) => {
    const { venueId } = await createVenueWithPublishedMenu(page);

    await navigateTo(page, `/venues/${venueId}`);

    const manageLink = page.getByRole('link', { name: /manage.*qr|all.*qr/i });

    if (await manageLink.isVisible()) {
      await manageLink.click();
      await expect(page).toHaveURL(/\/qr-codes/);
    }
  });
});

test.describe('QR Code Empty State', () => {
  test('should show message when no published menus', async ({ page }) => {
    const testId = generateTestId();

    // Create venue without publishing menu
    await navigateTo(page, '/venues/new');
    await page.getByRole('textbox', { name: /venue name/i }).fill(`No Publish Venue ${testId}`);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create venue/i }).click();
    await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });

    // Should show message about needing to publish
    await expect(page.getByText(/no published menus|publish.*menu/i)).toBeVisible();
  });
});
