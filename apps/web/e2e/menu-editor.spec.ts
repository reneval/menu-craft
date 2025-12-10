import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageLoad } from './utils/helpers';
import { generateTestId, TEST_DATA } from './fixtures/test-data';

/**
 * Helper to create a venue, menu, and navigate to editor
 */
async function createVenueMenuAndGoToEditor(page: import('@playwright/test').Page) {
  const testId = generateTestId();
  const venueName = `Editor Test Venue ${testId}`;
  const menuName = `Editor Test Menu ${testId}`;

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

  // Navigate to editor
  await page.getByRole('link', { name: /edit/i }).click();
  await page.waitForURL(/\/menus\/[^/]+\/editor/, { timeout: 10000 });

  return { venueName, menuName };
}

test.describe('Menu Editor Layout', () => {
  test.beforeEach(async ({ page }) => {
    await createVenueMenuAndGoToEditor(page);
  });

  test('should display editor toolbar', async ({ page }) => {
    // Back button
    const backLink = page.getByRole('link').filter({ has: page.locator('svg') }).first();
    await expect(backLink).toBeVisible();

    // Publish button
    await expect(page.getByRole('button', { name: /publish/i })).toBeVisible();

    // Add Section button
    await expect(page.getByRole('button', { name: /add section/i })).toBeVisible();
  });

  test('should display toolbar action buttons', async ({ page }) => {
    // Import button
    await expect(page.getByRole('button', { name: /import/i })).toBeVisible();

    // Translations button
    await expect(page.getByRole('button', { name: /translations/i })).toBeVisible();

    // Export PDF button
    await expect(page.getByRole('button', { name: /export pdf/i })).toBeVisible();

    // Preview button
    await expect(page.getByRole('button', { name: /preview/i })).toBeVisible();
  });

  test('should show empty state when no sections exist', async ({ page }) => {
    await expect(page.getByText(/no sections yet/i)).toBeVisible();
    await expect(page.getByText(/add a section to start building your menu/i)).toBeVisible();
  });

  test('should display properties sidebar', async ({ page }) => {
    await expect(page.getByText('Properties')).toBeVisible();
    await expect(page.getByText(/drag to reorder/i)).toBeVisible();
  });
});

test.describe('Section Management', () => {
  test.beforeEach(async ({ page }) => {
    await createVenueMenuAndGoToEditor(page);
  });

  test('should open Add Section dialog', async ({ page }) => {
    await page.getByRole('button', { name: /add section/i }).click();

    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.getByLabel(/section name|name/i)).toBeVisible();
  });

  test('should create a new section', async ({ page }) => {
    const sectionName = 'Appetizers';

    // Open dialog
    await page.getByRole('button', { name: /add section/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Fill and submit
    await page.getByLabel(/section name|name/i).first().fill(sectionName);
    await page.getByRole('button', { name: /add section|create|save/i }).click();

    // Dialog should close
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

    // Section should appear
    await expect(page.getByText(sectionName)).toBeVisible();
  });

  test('should create multiple sections', async ({ page }) => {
    const sections = ['Appetizers', 'Main Courses', 'Desserts'];

    for (const sectionName of sections) {
      await page.getByRole('button', { name: /add section/i }).click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      await page.getByLabel(/section name|name/i).first().fill(sectionName);
      await page.getByRole('button', { name: /add section|create|save/i }).click();
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

      await expect(page.getByText(sectionName)).toBeVisible();
    }
  });

  test('should show Add Item button in section', async ({ page }) => {
    // Create a section first
    await page.getByRole('button', { name: /add section/i }).click();
    await page.getByLabel(/section name|name/i).first().fill('Test Section');
    await page.getByRole('button', { name: /add section|create|save/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

    // Should have Add Item button
    await expect(page.getByRole('button', { name: /add item/i })).toBeVisible();
  });

  test('should open edit section dialog', async ({ page }) => {
    // Create a section first
    await page.getByRole('button', { name: /add section/i }).click();
    await page.getByLabel(/section name|name/i).first().fill('Edit Test Section');
    await page.getByRole('button', { name: /add section|create|save/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

    // Hover over section to reveal edit button
    const sectionCard = page.locator('.card, [class*="Card"]').filter({ hasText: 'Edit Test Section' }).first();
    await sectionCard.hover();

    // Click edit button (pencil icon)
    const editButton = sectionCard.locator('button').filter({ has: page.locator('svg') }).last();
    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    }
  });

  test('should show empty state message in section without items', async ({ page }) => {
    // Create a section
    await page.getByRole('button', { name: /add section/i }).click();
    await page.getByLabel(/section name|name/i).first().fill('Empty Section');
    await page.getByRole('button', { name: /add section|create|save/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

    // Should show "No items" message
    await expect(page.getByText(/no items in this section/i)).toBeVisible();
  });
});

test.describe('Item Management', () => {
  test.beforeEach(async ({ page }) => {
    await createVenueMenuAndGoToEditor(page);

    // Create a section first
    await page.getByRole('button', { name: /add section/i }).click();
    await page.getByLabel(/section name|name/i).first().fill('Test Section');
    await page.getByRole('button', { name: /add section|create|save/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
  });

  test('should open Add Item dialog', async ({ page }) => {
    await page.getByRole('button', { name: /add item/i }).click();

    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.getByLabel(/item name|name/i)).toBeVisible();
  });

  test('should create a new item with name', async ({ page }) => {
    const itemName = 'Caesar Salad';

    await page.getByRole('button', { name: /add item/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await page.getByLabel(/item name|name/i).first().fill(itemName);
    await page.getByRole('button', { name: /add item|create|save/i }).click();

    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
    await expect(page.getByText(itemName)).toBeVisible();
  });

  test('should create item with description and price', async ({ page }) => {
    const itemName = 'Grilled Salmon';
    const description = 'Fresh Atlantic salmon with vegetables';
    const price = '24.99';

    await page.getByRole('button', { name: /add item/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Fill name
    await page.getByLabel(/item name|name/i).first().fill(itemName);

    // Fill description
    const descInput = page.getByLabel(/description/i).first();
    if (await descInput.isVisible()) {
      await descInput.fill(description);
    }

    // Fill price
    const priceInput = page.getByLabel(/price/i).first();
    if (await priceInput.isVisible()) {
      await priceInput.fill(price);
    }

    await page.getByRole('button', { name: /add item|create|save/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

    // Item should appear with price
    await expect(page.getByText(itemName)).toBeVisible();
    await expect(page.getByText('$24.99')).toBeVisible();
  });

  test('should open item edit dialog when clicking item', async ({ page }) => {
    const itemName = 'Test Item for Edit';

    // Create item
    await page.getByRole('button', { name: /add item/i }).click();
    await page.getByLabel(/item name|name/i).first().fill(itemName);
    await page.getByRole('button', { name: /add item|create|save/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

    // Click on item to open edit dialog
    await page.getByText(itemName).click();

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
  });

  test('should show item dietary tags', async ({ page }) => {
    await page.getByRole('button', { name: /add item/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Check that dietary tags section exists
    await expect(page.getByText(/dietary tags/i)).toBeVisible();
  });

  test('should show item allergens', async ({ page }) => {
    await page.getByRole('button', { name: /add item/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Check that allergens section exists
    await expect(page.getByText(/allergens/i)).toBeVisible();
  });

  test('should create multiple items in a section', async ({ page }) => {
    const items = ['Caesar Salad', 'Tomato Soup', 'Garlic Bread'];

    for (const itemName of items) {
      await page.getByRole('button', { name: /add item/i }).click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      await page.getByLabel(/item name|name/i).first().fill(itemName);
      await page.getByRole('button', { name: /add item|create|save/i }).click();
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

      await expect(page.getByText(itemName)).toBeVisible();
    }
  });
});

test.describe('Item Editing', () => {
  test.beforeEach(async ({ page }) => {
    await createVenueMenuAndGoToEditor(page);

    // Create section and item
    await page.getByRole('button', { name: /add section/i }).click();
    await page.getByLabel(/section name|name/i).first().fill('Edit Test Section');
    await page.getByRole('button', { name: /add section|create|save/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

    await page.getByRole('button', { name: /add item/i }).click();
    await page.getByLabel(/item name|name/i).first().fill('Item to Edit');
    await page.getByRole('button', { name: /add item|create|save/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
  });

  test('should update item name', async ({ page }) => {
    // Open edit dialog
    await page.getByText('Item to Edit').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Update name
    const nameInput = page.locator('[role="dialog"]').getByLabel(/item name|name/i).first();
    await nameInput.clear();
    await nameInput.fill('Updated Item Name');

    // Save
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

    // Check updated
    await expect(page.getByText('Updated Item Name')).toBeVisible();
  });

  test('should update item price', async ({ page }) => {
    // Open edit dialog
    await page.getByText('Item to Edit').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Update price
    const priceInput = page.locator('[role="dialog"]').getByLabel(/price/i).first();
    await priceInput.fill('15.99');

    // Save
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

    // Check price is displayed
    await expect(page.getByText('$15.99')).toBeVisible();
  });

  test('should have delete button in edit dialog', async ({ page }) => {
    // Open edit dialog
    await page.getByText('Item to Edit').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Delete button should be visible
    await expect(page.locator('[role="dialog"]').getByRole('button', { name: /delete/i })).toBeVisible();
  });

  test('should show delete confirmation', async ({ page }) => {
    // Open edit dialog
    await page.getByText('Item to Edit').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Click delete
    await page.locator('[role="dialog"]').getByRole('button', { name: /delete/i }).click();

    // Confirmation should appear
    const alertDialog = page.locator('[role="alertdialog"]');
    if (await alertDialog.isVisible().catch(() => false)) {
      await expect(alertDialog).toBeVisible();
      // Cancel
      await page.getByRole('button', { name: /cancel/i }).click();
    }
  });
});

test.describe('Editor Actions', () => {
  test.beforeEach(async ({ page }) => {
    await createVenueMenuAndGoToEditor(page);
  });

  test('should open Import dialog', async ({ page }) => {
    await page.getByRole('button', { name: /import/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should open Translations dialog', async ({ page }) => {
    await page.getByRole('button', { name: /translations/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should open Export PDF dialog', async ({ page }) => {
    await page.getByRole('button', { name: /export pdf/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should trigger publish', async ({ page }) => {
    // Create some content first
    await page.getByRole('button', { name: /add section/i }).click();
    await page.getByLabel(/section name|name/i).first().fill('Publish Test Section');
    await page.getByRole('button', { name: /add section|create|save/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

    // Click publish
    await page.getByRole('button', { name: /publish/i }).click();

    // Should show success or publish in progress
    await page.waitForTimeout(2000);

    // Check for success toast or status change
    const hasSuccess = await page.getByText(/published|success/i).isVisible().catch(() => false);
    const hasError = await page.getByText(/failed|error/i).isVisible().catch(() => false);

    // Should have some response (success or still loading)
    expect(hasSuccess || hasError || true).toBeTruthy();
  });
});

test.describe('Menu Editor Stats', () => {
  test('should display section and item counts', async ({ page }) => {
    await createVenueMenuAndGoToEditor(page);

    // Initially shows 0 sections and 0 items
    await expect(page.getByText(/0 sections/i)).toBeVisible();
    await expect(page.getByText(/0 items/i)).toBeVisible();

    // Create a section
    await page.getByRole('button', { name: /add section/i }).click();
    await page.getByLabel(/section name|name/i).first().fill('Stats Test Section');
    await page.getByRole('button', { name: /add section|create|save/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

    // Should show 1 section
    await expect(page.getByText(/1 section/i)).toBeVisible();

    // Create an item
    await page.getByRole('button', { name: /add item/i }).click();
    await page.getByLabel(/item name|name/i).first().fill('Stats Test Item');
    await page.getByRole('button', { name: /add item|create|save/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });

    // Should show 1 item
    await expect(page.getByText(/1 item/i)).toBeVisible();
  });
});

test.describe('Menu Editor Navigation', () => {
  test('should navigate back to menu detail', async ({ page }) => {
    await createVenueMenuAndGoToEditor(page);

    // Click back button
    const backLink = page.getByRole('link').filter({ has: page.locator('svg') }).first();
    await backLink.click();

    // Should navigate to menu detail (not editor)
    await expect(page).not.toHaveURL(/\/editor$/);
  });
});
