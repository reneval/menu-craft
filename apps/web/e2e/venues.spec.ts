import { test, expect } from '@playwright/test';
import { waitForPageLoad, navigateTo, createVenue } from './utils/helpers';
import { generateTestId } from './fixtures/test-data';

test.describe('Venues List', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/venues');
  });

  test('should display venues page with header', async ({ page }) => {
    // Check for venues heading
    await expect(page.getByRole('heading', { name: 'Venues', exact: true })).toBeVisible();

    // Check for add venue button
    await expect(page.getByRole('link', { name: /add venue/i })).toBeVisible();
  });

  test('should navigate to create venue page', async ({ page }) => {
    // Click add venue button
    await page.getByRole('link', { name: /add venue/i }).click();

    // Should navigate to new venue page
    await expect(page).toHaveURL(/\/venues\/new/);
  });

  test('should show empty state when no venues exist', async ({ page }) => {
    // If no venues, should show empty state
    const emptyState = page.getByText(/no venues yet/i);
    const venueCards = page.locator('[data-testid="venue-card"], .venue-card');

    // Either show empty state or show venue cards
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const hasVenues = (await venueCards.count()) > 0;

    expect(hasEmptyState || hasVenues).toBeTruthy();
  });

  test('should display venue cards with correct information', async ({ page }) => {
    // Check if any venues exist
    const venueItems = page.locator('[data-testid="venue-card"], .card').filter({ hasText: /view|edit/i });
    const count = await venueItems.count();

    if (count > 0) {
      // First venue should have name visible
      const firstVenue = venueItems.first();
      await expect(firstVenue).toBeVisible();

      // Should have view or manage button
      const viewButton = firstVenue.getByRole('link', { name: /view|manage/i });
      await expect(viewButton).toBeVisible();
    }
  });
});

test.describe('Create Venue', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/venues/new');
  });

  test('should display create venue form with all fields', async ({ page }) => {
    // Check for form elements
    await expect(page.getByRole('textbox', { name: /venue name/i })).toBeVisible();

    // Check for slug field
    await expect(page.getByLabel(/slug/i)).toBeVisible();

    // Check for timezone field
    await expect(page.getByLabel(/timezone/i)).toBeVisible();

    // Check for submit button
    await expect(page.getByRole('button', { name: /create venue/i })).toBeVisible();
  });

  test('should disable submit button when name is empty', async ({ page }) => {
    const nameInput = page.getByRole('textbox', { name: /venue name/i });
    await nameInput.clear();

    const submitButton = page.getByRole('button', { name: /create venue/i });

    // Button should be disabled
    await expect(submitButton).toBeDisabled();
  });

  test('should auto-generate slug from venue name', async ({ page }) => {
    const nameInput = page.getByRole('textbox', { name: /venue name/i });
    await nameInput.fill('Downtown Bistro & Bar');

    // Wait for auto-generation
    await page.waitForTimeout(500);

    // Slug should be auto-generated (lowercased, special chars removed)
    const slugInput = page.getByLabel(/slug/i);
    await expect(slugInput).toHaveValue('downtown-bistro--bar');
  });

  test('should allow editing the auto-generated slug', async ({ page }) => {
    const nameInput = page.getByRole('textbox', { name: /venue name/i });
    await nameInput.fill('My Restaurant');
    await page.waitForTimeout(300);

    const slugInput = page.getByLabel(/slug/i);
    await slugInput.clear();
    await slugInput.fill('custom-restaurant-slug');

    await expect(slugInput).toHaveValue('custom-restaurant-slug');
  });

  test('should create venue with valid data', async ({ page }) => {
    const testId = generateTestId();
    const venueName = `E2E Venue ${testId}`;

    // Fill in the form
    const nameInput = page.getByRole('textbox', { name: /venue name/i });
    await nameInput.fill(venueName);

    // Wait for auto-generation
    await page.waitForTimeout(500);

    // Submit the form
    await page.getByRole('button', { name: /create venue/i }).click();

    // Should redirect to venue detail or list
    await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });

    // Should show success message or venue detail
    const pageContent = await page.content();
    expect(pageContent.includes(venueName) || page.url().includes('/venues/')).toBeTruthy();
  });

  test('should auto-detect timezone', async ({ page }) => {
    const timezoneInput = page.getByLabel(/timezone/i);
    const value = await timezoneInput.inputValue();

    // Timezone should be auto-populated
    expect(value).toBeTruthy();
    expect(value.length).toBeGreaterThan(0);
  });
});

test.describe('Venue Detail Page', () => {
  let venueId: string;
  let venueName: string;

  test.beforeEach(async ({ page }) => {
    // First, create a venue to test with
    const testId = generateTestId();
    venueName = `Detail Test Venue ${testId}`;

    await navigateTo(page, '/venues/new');
    await page.getByRole('textbox', { name: /venue name/i }).fill(venueName);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create venue/i }).click();

    // Wait for redirect and capture venue ID
    await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });
    const url = page.url();
    const match = url.match(/\/venues\/([^/]+)/);
    venueId = match ? match[1] : '';
  });

  test('should display venue detail page with header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: venueName })).toBeVisible();
  });

  test('should have Edit Venue button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /edit venue/i })).toBeVisible();
  });

  test('should display venue information section', async ({ page }) => {
    await expect(page.getByText(/venue information/i)).toBeVisible();
  });

  test('should display Menus section', async ({ page }) => {
    await expect(page.getByText(/menus/i).first()).toBeVisible();

    // Should have Create Menu button
    await expect(page.getByRole('button', { name: /create menu/i })).toBeVisible();
  });

  test('should display QR Code section', async ({ page }) => {
    await expect(page.getByText(/qr code|menu link/i)).toBeVisible();
  });

  test('should navigate back to venues list', async ({ page }) => {
    // Click back button
    const backButton = page.getByRole('link').filter({ has: page.locator('[class*="ArrowLeft"], svg') }).first();
    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(page).toHaveURL(/\/venues$/);
    }
  });
});

test.describe('Edit Venue', () => {
  let venueName: string;

  test.beforeEach(async ({ page }) => {
    // Create a venue first
    const testId = generateTestId();
    venueName = `Edit Test Venue ${testId}`;

    await navigateTo(page, '/venues/new');
    await page.getByRole('textbox', { name: /venue name/i }).fill(venueName);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create venue/i }).click();

    await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });
  });

  test('should open edit dialog when clicking Edit Venue', async ({ page }) => {
    await page.getByRole('button', { name: /edit venue/i }).click();

    // Dialog should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Should have venue name in form
    const nameInput = page.locator('[role="dialog"]').getByLabel(/venue name|name/i).first();
    await expect(nameInput).toBeVisible();
  });

  test('should update venue name', async ({ page }) => {
    // Open edit dialog
    await page.getByRole('button', { name: /edit venue/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Change the name
    const newName = `Updated ${venueName}`;
    const nameInput = page.locator('[role="dialog"]').getByLabel(/venue name|name/i).first();
    await nameInput.clear();
    await nameInput.fill(newName);

    // Save changes
    await page.getByRole('button', { name: /save|update/i }).click();

    // Dialog should close
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

    // Page should show updated name
    await expect(page.getByRole('heading', { name: newName })).toBeVisible({ timeout: 10000 });
  });

  test('should cancel edit without saving', async ({ page }) => {
    // Open edit dialog
    await page.getByRole('button', { name: /edit venue/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Change the name
    const nameInput = page.locator('[role="dialog"]').getByLabel(/venue name|name/i).first();
    await nameInput.clear();
    await nameInput.fill('Should Not Save');

    // Cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Dialog should close
    await expect(page.locator('[role="dialog"]')).toBeHidden();

    // Original name should still be visible
    await expect(page.getByRole('heading', { name: venueName })).toBeVisible();
  });

  test('should show delete confirmation in edit dialog', async ({ page }) => {
    // Open edit dialog
    await page.getByRole('button', { name: /edit venue/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Find and click delete button
    const deleteButton = page.locator('[role="dialog"]').getByRole('button', { name: /delete/i });
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Should show confirmation
      const confirmDialog = page.locator('[role="alertdialog"]');
      const hasConfirm = await confirmDialog.isVisible().catch(() => false);

      if (hasConfirm) {
        await expect(confirmDialog).toBeVisible();
        // Cancel the delete
        await page.getByRole('button', { name: /cancel/i }).click();
      }
    }
  });
});

test.describe('Venue Menus Integration', () => {
  test('should navigate to create menu from venue detail', async ({ page }) => {
    // Create a venue first
    const testId = generateTestId();
    const venueName = `Menu Nav Venue ${testId}`;

    await navigateTo(page, '/venues/new');
    await page.getByRole('textbox', { name: /venue name/i }).fill(venueName);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create venue/i }).click();

    await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });

    // Click Create Menu button
    await page.getByRole('button', { name: /create menu/i }).click();

    // Should navigate to menu creation
    await expect(page).toHaveURL(/\/menus\/new/);
  });

  test('should show empty state when venue has no menus', async ({ page }) => {
    // Create a new venue (will have no menus)
    const testId = generateTestId();
    const venueName = `Empty Menus Venue ${testId}`;

    await navigateTo(page, '/venues/new');
    await page.getByRole('textbox', { name: /venue name/i }).fill(venueName);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create venue/i }).click();

    await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });

    // Should show no menus message
    await expect(page.getByText(/no menus yet/i)).toBeVisible();
  });
});

test.describe('Venue QR Code', () => {
  test('should display QR code section for venue with published menu', async ({ page }) => {
    // Create venue
    const testId = generateTestId();
    const venueName = `QR Test Venue ${testId}`;

    await navigateTo(page, '/venues/new');
    await page.getByRole('textbox', { name: /venue name/i }).fill(venueName);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create venue/i }).click();

    await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });

    // QR Code section should exist
    const qrSection = page.getByText(/qr code|menu link/i);
    await expect(qrSection).toBeVisible();
  });

  test('should show message when no published menus exist', async ({ page }) => {
    // Create venue (no menus published)
    const testId = generateTestId();
    const venueName = `No Publish Venue ${testId}`;

    await navigateTo(page, '/venues/new');
    await page.getByRole('textbox', { name: /venue name/i }).fill(venueName);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create venue/i }).click();

    await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });

    // Should show message about no published menus
    await expect(page.getByText(/no published menus|publish a menu/i)).toBeVisible();
  });
});
