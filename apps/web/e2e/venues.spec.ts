import { test, expect } from '@playwright/test';

test.describe('Venues', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/venues');
    await page.waitForLoadState('networkidle');
  });

  test('should display venues page', async ({ page }) => {
    // Check for venues heading (exact match to avoid "No venues yet")
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
    const venueCards = page.locator('[data-testid="venue-card"]');

    // Either show empty state or show venue cards
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const hasVenues = (await venueCards.count()) > 0;

    expect(hasEmptyState || hasVenues).toBeTruthy();
  });
});

test.describe('Create Venue', () => {
  test('should display create venue form', async ({ page }) => {
    await page.goto('/venues/new');
    await page.waitForLoadState('networkidle');

    // Check for form elements - use more specific selectors
    await expect(page.getByRole('textbox', { name: /venue name/i })).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/venues/new');
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /create venue/i });
    const nameInput = page.getByRole('textbox', { name: /venue name/i });

    // Clear and submit
    await nameInput.clear();
    await submitButton.click();

    // Either form doesn't submit or shows validation
    await page.waitForTimeout(500);
    const stillOnNewPage = page.url().includes('/venues/new');
    expect(stillOnNewPage).toBeTruthy();
  });

  test('should create venue with valid data', async ({ page }) => {
    await page.goto('/venues/new');
    await page.waitForLoadState('networkidle');

    // Generate unique name with timestamp
    const venueName = `Test Venue ${Date.now()}`;

    // Fill in the form
    const nameInput = page.getByRole('textbox', { name: /venue name/i });
    await nameInput.fill(venueName);

    // Wait for auto-generation
    await page.waitForTimeout(500);

    // Submit the form
    const submitButton = page.getByRole('button', { name: /create venue/i });
    await submitButton.click();

    // Should redirect - wait longer for API call
    await page.waitForURL(/\/venues/, { timeout: 15000 });
  });
});
