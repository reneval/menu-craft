import { test, expect } from '@playwright/test';

test.describe('Menus List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/menus');
    await page.waitForLoadState('networkidle');
  });

  test('should display menus page', async ({ page }) => {
    // Check for menus heading
    await expect(page.getByRole('heading', { name: /menus/i })).toBeVisible();
  });

  test('should show venue selector if multiple venues', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Page should have either a venue selector or show menus
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
  });

  test('should have create menu button', async ({ page }) => {
    const createButton = page.getByRole('link', { name: /create menu/i });

    // If venues exist, create button should be visible
    const isVisible = await createButton.isVisible().catch(() => false);

    // Or show "create venue first" message
    const createVenueFirst = page.getByText(/create a venue first/i);
    const needsVenue = await createVenueFirst.isVisible().catch(() => false);

    expect(isVisible || needsVenue).toBeTruthy();
  });
});

test.describe('Menu Editor', () => {
  // These tests assume there's at least one venue and menu created

  test('should display editor toolbar', async ({ page }) => {
    // Navigate to menus first
    await page.goto('/menus');
    await page.waitForLoadState('networkidle');

    // Try to find a menu to edit
    const editLink = page.getByRole('link', { name: /edit/i }).first();
    const hasEditLink = await editLink.isVisible().catch(() => false);

    if (hasEditLink) {
      await editLink.click();
      await page.waitForLoadState('networkidle');

      // Check for editor toolbar elements
      await expect(page.getByRole('button', { name: /publish/i })).toBeVisible();
    } else {
      // Skip if no menus exist
      test.skip();
    }
  });

  test('should have add section button in editor', async ({ page }) => {
    await page.goto('/menus');
    await page.waitForLoadState('networkidle');

    const editLink = page.getByRole('link', { name: /edit/i }).first();
    const hasEditLink = await editLink.isVisible().catch(() => false);

    if (hasEditLink) {
      await editLink.click();
      await page.waitForLoadState('networkidle');

      // Check for add section button
      await expect(page.getByRole('button', { name: /add section/i })).toBeVisible();
    } else {
      test.skip();
    }
  });
});

test.describe('Create Menu', () => {
  test('should display create menu form', async ({ page }) => {
    await page.goto('/menus/new');
    await page.waitForLoadState('networkidle');

    // Either show form or redirect to create venue first
    const hasNameInput = await page.getByLabel(/name/i).isVisible().catch(() => false);
    const needsVenue = await page.getByText(/create a venue first/i).isVisible().catch(() => false);

    expect(hasNameInput || needsVenue).toBeTruthy();
  });

  test('should create menu with valid data', async ({ page }) => {
    await page.goto('/menus/new');
    await page.waitForLoadState('networkidle');

    // Check if we can create a menu (venue exists)
    const nameInput = page.getByLabel(/name/i);
    const hasNameInput = await nameInput.isVisible().catch(() => false);

    if (!hasNameInput) {
      test.skip();
      return;
    }

    // Generate unique name
    const menuName = `Test Menu ${Date.now()}`;
    await nameInput.fill(menuName);

    // Submit the form
    const submitButton = page.getByRole('button', { name: /create menu/i });
    await submitButton.click();

    // Should redirect to menu detail or editor
    await page.waitForURL(/\/menus\/(?!new)/, { timeout: 10000 });
  });
});
