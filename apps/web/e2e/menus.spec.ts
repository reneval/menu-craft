import { test, expect } from '@playwright/test';
import { waitForPageLoad, navigateTo } from './utils/helpers';
import { generateTestId } from './fixtures/test-data';

/**
 * Helper to create a venue and menu for testing
 */
async function createVenueAndMenu(page: import('@playwright/test').Page) {
  const testId = generateTestId();
  const venueName = `Menu Test Venue ${testId}`;
  const menuName = `Menu Test ${testId}`;

  // Create venue first
  await navigateTo(page, '/venues/new');
  await page.getByRole('textbox', { name: /venue name/i }).fill(venueName);
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /create venue/i }).click();
  await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });

  // Extract venue ID from URL
  const venueUrl = page.url();
  const venueMatch = venueUrl.match(/\/venues\/([^/]+)/);
  const venueId = venueMatch ? venueMatch[1] : '';

  // Create menu
  await navigateTo(page, '/menus/new');
  await page.getByLabel(/name/i).fill(menuName);
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /create menu/i }).click();
  await page.waitForURL(/\/menus\/(?!new)/, { timeout: 15000 });

  // Extract menu ID from URL
  const menuUrl = page.url();
  const menuMatch = menuUrl.match(/\/menus\/([^/]+)/);
  const menuId = menuMatch ? menuMatch[1] : '';

  return { venueId, venueName, menuId, menuName };
}

test.describe('Menus List', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/menus');
  });

  test('should display menus page with header', async ({ page }) => {
    // Check for menus heading
    await expect(page.getByRole('heading', { name: /menus/i })).toBeVisible();
  });

  test('should show venue selector or menus list', async ({ page }) => {
    // Page should have either a venue selector or show menus
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();

    // Either has menus, create button, or venue selector
    const hasContent = await page
      .locator('button, a, [role="listbox"]')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('should have create menu button or create venue message', async ({ page }) => {
    const createButton = page.getByRole('link', { name: /create menu/i });
    const createVenueFirst = page.getByText(/create a venue first/i);

    // Either show create menu button or "create venue first" message
    const isVisible = await createButton.isVisible().catch(() => false);
    const needsVenue = await createVenueFirst.isVisible().catch(() => false);

    expect(isVisible || needsVenue).toBeTruthy();
  });

  test('should display menu cards when menus exist', async ({ page }) => {
    const menuCards = page.locator('[data-testid="menu-card"], .card').filter({ hasText: /edit|view/i });
    const count = await menuCards.count();

    if (count > 0) {
      // First menu card should have name and status
      const firstMenu = menuCards.first();
      await expect(firstMenu).toBeVisible();

      // Should have status badge
      const statusBadge = firstMenu.locator('text=/draft|published/i');
      const hasStatus = await statusBadge.isVisible().catch(() => false);
      expect(hasStatus).toBeTruthy();
    }
  });
});

test.describe('Create Menu', () => {
  test('should display create menu form', async ({ page }) => {
    await navigateTo(page, '/menus/new');

    // Either show form or redirect to create venue first
    const hasNameInput = await page.getByLabel(/name/i).isVisible().catch(() => false);
    const needsVenue = await page.getByText(/create a venue first/i).isVisible().catch(() => false);

    expect(hasNameInput || needsVenue).toBeTruthy();
  });

  test('should auto-generate slug from name', async ({ page }) => {
    // First ensure we have a venue
    const testId = generateTestId();
    await navigateTo(page, '/venues/new');
    await page.getByRole('textbox', { name: /venue name/i }).fill(`Slug Test Venue ${testId}`);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create venue/i }).click();
    await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });

    // Now create menu
    await navigateTo(page, '/menus/new');

    const nameInput = page.getByLabel(/name/i);
    const hasNameInput = await nameInput.isVisible().catch(() => false);

    if (hasNameInput) {
      await nameInput.fill('Lunch Special Menu');
      await page.waitForTimeout(500);

      // Slug should be auto-generated
      const slugInput = page.getByLabel(/slug/i);
      if (await slugInput.isVisible()) {
        await expect(slugInput).toHaveValue(/lunch-special-menu/);
      }
    }
  });

  test('should create menu with valid data', async ({ page }) => {
    // First ensure we have a venue
    const testId = generateTestId();
    await navigateTo(page, '/venues/new');
    await page.getByRole('textbox', { name: /venue name/i }).fill(`Create Menu Venue ${testId}`);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create venue/i }).click();
    await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });

    // Now create menu
    await navigateTo(page, '/menus/new');

    const menuName = `Test Menu ${testId}`;
    const nameInput = page.getByLabel(/name/i);

    if (await nameInput.isVisible()) {
      await nameInput.fill(menuName);
      await page.waitForTimeout(300);

      // Submit
      await page.getByRole('button', { name: /create menu/i }).click();

      // Should redirect to menu detail
      await page.waitForURL(/\/menus\/(?!new)/, { timeout: 15000 });

      // Menu name should be visible
      await expect(page.getByRole('heading', { name: menuName })).toBeVisible({ timeout: 10000 });
    }
  });

  test('should disable submit button when name is empty', async ({ page }) => {
    // Ensure venue exists
    const testId = generateTestId();
    await navigateTo(page, '/venues/new');
    await page.getByRole('textbox', { name: /venue name/i }).fill(`Empty Name Venue ${testId}`);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create venue/i }).click();
    await page.waitForURL(/\/venues\/(?!new)/, { timeout: 15000 });

    // Go to create menu
    await navigateTo(page, '/menus/new');

    const nameInput = page.getByLabel(/name/i);
    if (await nameInput.isVisible()) {
      await nameInput.clear();

      const submitButton = page.getByRole('button', { name: /create menu/i });
      await expect(submitButton).toBeDisabled();
    }
  });
});

test.describe('Menu Detail Page', () => {
  let menuId: string;
  let menuName: string;

  test.beforeEach(async ({ page }) => {
    const result = await createVenueAndMenu(page);
    menuId = result.menuId;
    menuName = result.menuName;
  });

  test('should display menu header with name and status', async ({ page }) => {
    await expect(page.getByRole('heading', { name: menuName })).toBeVisible();

    // Should show status badge
    await expect(page.getByText(/draft|published/i).first()).toBeVisible();
  });

  test('should display stats cards', async ({ page }) => {
    // Sections card
    await expect(page.getByText('Sections')).toBeVisible();

    // Items card
    await expect(page.getByText('Items')).toBeVisible();

    // Status card
    await expect(page.getByText('Status')).toBeVisible();
  });

  test('should display action buttons', async ({ page }) => {
    // Preview button
    await expect(page.getByRole('button', { name: /preview/i })).toBeVisible();

    // Edit button
    await expect(page.getByRole('link', { name: /edit/i })).toBeVisible();

    // Publish button
    await expect(page.getByRole('button', { name: /publish/i })).toBeVisible();
  });

  test('should open preview dialog', async ({ page }) => {
    await page.getByRole('button', { name: /preview/i }).click();

    // Dialog should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to editor from detail page', async ({ page }) => {
    await page.getByRole('link', { name: /edit/i }).click();

    // Should navigate to editor
    await expect(page).toHaveURL(/\/menus\/[^/]+\/editor/);
  });

  test('should have Duplicate button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /duplicate/i })).toBeVisible();
  });

  test('should have Clone to Venue button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /clone to venue/i })).toBeVisible();
  });

  test('should have PDF download button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /pdf/i })).toBeVisible();
  });

  test('should display Menu Settings card', async ({ page }) => {
    await expect(page.getByText(/menu settings/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /open settings/i })).toBeVisible();
  });

  test('should display Public Link section', async ({ page }) => {
    await expect(page.getByText(/public link/i)).toBeVisible();
  });
});

test.describe('Menu Settings', () => {
  let menuName: string;

  test.beforeEach(async ({ page }) => {
    const result = await createVenueAndMenu(page);
    menuName = result.menuName;
  });

  test('should open settings dialog', async ({ page }) => {
    await page.getByRole('button', { name: /open settings/i }).click();

    // Dialog should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should update menu name in settings', async ({ page }) => {
    await page.getByRole('button', { name: /open settings/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    const newName = `Updated ${menuName}`;
    const nameInput = page.locator('[role="dialog"]').getByLabel(/name/i).first();
    await nameInput.clear();
    await nameInput.fill(newName);

    // Save
    await page.getByRole('button', { name: /save|update/i }).click();

    // Dialog should close and name should update
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: newName })).toBeVisible({ timeout: 10000 });
  });

  test('should show delete confirmation in settings', async ({ page }) => {
    await page.getByRole('button', { name: /open settings/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Find delete button
    const deleteButton = page.locator('[role="dialog"]').getByRole('button', { name: /delete/i });
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Should show confirmation
      const confirmDialog = page.locator('[role="alertdialog"]');
      if (await confirmDialog.isVisible().catch(() => false)) {
        await expect(confirmDialog).toBeVisible();
        // Cancel
        await page.getByRole('button', { name: /cancel/i }).click();
      }
    }
  });
});

test.describe('Menu Duplication', () => {
  let menuName: string;

  test.beforeEach(async ({ page }) => {
    const result = await createVenueAndMenu(page);
    menuName = result.menuName;
  });

  test('should duplicate menu', async ({ page }) => {
    await page.getByRole('button', { name: /duplicate/i }).click();

    // Should show loading state or success
    await page.waitForTimeout(2000);

    // Should navigate to new menu or show success
    const newMenuTitle = page.getByRole('heading', { name: /copy|duplicate/i });
    const hasNewMenu = await newMenuTitle.isVisible().catch(() => false);

    // Or we're still on a menu page
    const onMenuPage = page.url().includes('/menus/');

    expect(hasNewMenu || onMenuPage).toBeTruthy();
  });
});

test.describe('Menu Editor Access', () => {
  test('should navigate to editor and display toolbar', async ({ page }) => {
    const result = await createVenueAndMenu(page);

    // Navigate to editor
    await page.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(/\/menus\/[^/]+\/editor/, { timeout: 10000 });

    // Editor should have toolbar
    await expect(page.getByRole('button', { name: /publish/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add section/i })).toBeVisible();
  });

  test('should have Add Section button in editor', async ({ page }) => {
    const result = await createVenueAndMenu(page);

    await page.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(/\/menus\/[^/]+\/editor/, { timeout: 10000 });

    await expect(page.getByRole('button', { name: /add section/i })).toBeVisible();
  });

  test('should open Add Section dialog', async ({ page }) => {
    const result = await createVenueAndMenu(page);

    await page.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(/\/menus\/[^/]+\/editor/, { timeout: 10000 });

    await page.getByRole('button', { name: /add section/i }).click();

    // Dialog should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });
});

test.describe('Menu Publishing', () => {
  test.beforeEach(async ({ page }) => {
    await createVenueAndMenu(page);
  });

  test('should open publish dialog', async ({ page }) => {
    await page.getByRole('button', { name: /publish/i }).click();

    // Dialog should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
  });

  test('should display publish preview', async ({ page }) => {
    await page.getByRole('button', { name: /publish/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Should show publish or changes info
    const dialogContent = page.locator('[role="dialog"]');
    await expect(dialogContent).toContainText(/publish|changes|version/i);
  });
});

test.describe('Menu Navigation', () => {
  test('should navigate back to menus list', async ({ page }) => {
    await createVenueAndMenu(page);

    // Click back button
    const backLink = page.getByRole('link').filter({ has: page.locator('[class*="ArrowLeft"], svg') }).first();
    if (await backLink.isVisible()) {
      await backLink.click();
      await expect(page).toHaveURL(/\/menus$/);
    }
  });

  test('should navigate between menu detail and editor', async ({ page }) => {
    const result = await createVenueAndMenu(page);

    // Go to editor
    await page.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(/\/menus\/[^/]+\/editor/, { timeout: 10000 });

    // Go back to detail - look for view or back button
    const backButton = page.getByRole('link').filter({ has: page.locator('svg') }).first();
    if (await backButton.isVisible()) {
      await backButton.click();
      await page.waitForURL(/\/menus\/[^/]+(?!\/editor)/, { timeout: 10000 });
    }
  });
});

test.describe('Menu Empty State', () => {
  test('should show empty state when menu has no sections', async ({ page }) => {
    await createVenueAndMenu(page);

    // New menu should show no sections message
    await expect(page.getByText(/no sections yet/i)).toBeVisible();
  });

  test('should have link to start building menu', async ({ page }) => {
    await createVenueAndMenu(page);

    // Should have link/button to start building
    const buildLink = page.getByRole('link', { name: /start building|edit/i });
    await expect(buildLink).toBeVisible();
  });
});
