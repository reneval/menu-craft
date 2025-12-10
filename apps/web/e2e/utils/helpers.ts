/**
 * E2E Test Helpers
 *
 * Common utilities for Playwright E2E tests.
 * These helpers reduce boilerplate and ensure consistent test patterns.
 */

import { Page, expect, Locator } from '@playwright/test';
import { createTestVenueData, createTestMenuData, generateTestId } from '../fixtures/test-data';

/**
 * Wait for the page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Extra wait for React hydration
  await page.waitForTimeout(300);
}

/**
 * Navigate to a page and wait for it to load
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForPageLoad(page);
}

/**
 * Create a venue via the UI
 * @returns The name of the created venue
 */
export async function createVenue(
  page: Page,
  options?: {
    name?: string;
    address?: string;
  }
): Promise<string> {
  const testData = createTestVenueData();
  const name = options?.name || testData.name;

  await navigateTo(page, '/venues/new');

  // Fill venue name
  const nameInput = page.getByRole('textbox', { name: /venue name/i });
  await nameInput.fill(name);

  // Optionally fill address
  if (options?.address) {
    const addressInput = page.getByLabel(/address/i);
    if (await addressInput.isVisible()) {
      await addressInput.fill(options.address);
    }
  }

  // Wait for auto-generation of slug
  await page.waitForTimeout(500);

  // Submit
  await page.getByRole('button', { name: /create venue/i }).click();

  // Wait for redirect
  await page.waitForURL(/\/venues(?!\/new)/, { timeout: 15000 });

  return name;
}

/**
 * Create a menu via the UI
 * @returns The name of the created menu
 */
export async function createMenu(
  page: Page,
  options?: {
    name?: string;
    venueId?: string;
  }
): Promise<string> {
  const testData = createTestMenuData();
  const name = options?.name || testData.name;

  await navigateTo(page, '/menus/new');

  // Check if we need to create a venue first
  const needsVenue = await page.getByText(/create a venue first/i).isVisible().catch(() => false);
  if (needsVenue) {
    throw new Error('Cannot create menu: no venues exist. Create a venue first.');
  }

  // Fill menu name
  const nameInput = page.getByLabel(/name/i);
  await nameInput.fill(name);

  // Wait for auto-generation of slug
  await page.waitForTimeout(500);

  // Submit
  await page.getByRole('button', { name: /create menu/i }).click();

  // Wait for redirect to menu editor or list
  await page.waitForURL(/\/menus\/(?!new)/, { timeout: 15000 });

  return name;
}

/**
 * Navigate to the menu editor for a specific menu
 * If menuId is not provided, it will click the first Edit link found
 */
export async function navigateToMenuEditor(page: Page, menuId?: string): Promise<boolean> {
  if (menuId) {
    await navigateTo(page, `/menus/${menuId}/edit`);
    return true;
  }

  // Go to menus list and find first menu to edit
  await navigateTo(page, '/menus');

  const editLink = page.getByRole('link', { name: /edit/i }).first();
  const hasEditLink = await editLink.isVisible().catch(() => false);

  if (!hasEditLink) {
    return false;
  }

  await editLink.click();
  await waitForPageLoad(page);
  return true;
}

/**
 * Add a section to the current menu in the editor
 */
export async function addSection(page: Page, sectionName: string): Promise<void> {
  // Click add section button
  await page.getByRole('button', { name: /add section/i }).click();

  // Wait for dialog
  await page.waitForSelector('[role="dialog"]');

  // Fill section name
  const nameInput = page.getByLabel(/section name|name/i).first();
  await nameInput.fill(sectionName);

  // Submit
  await page.getByRole('button', { name: /add section|create|save/i }).click();

  // Wait for dialog to close
  await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
}

/**
 * Add an item to a section in the menu editor
 */
export async function addItem(
  page: Page,
  sectionName: string,
  itemData: {
    name: string;
    description?: string;
    price?: string;
  }
): Promise<void> {
  // Find the section and its add item button
  const section = page.locator(`[data-testid="section-${sectionName}"], :text("${sectionName}")`).first();
  const addItemButton = section.getByRole('button', { name: /add item/i });

  // If we can't find a specific section, use the first add item button
  const buttonToClick = (await addItemButton.isVisible().catch(() => false))
    ? addItemButton
    : page.getByRole('button', { name: /add item/i }).first();

  await buttonToClick.click();

  // Wait for dialog
  await page.waitForSelector('[role="dialog"]');

  // Fill item name
  await page.getByLabel(/item name|name/i).first().fill(itemData.name);

  // Fill description if provided
  if (itemData.description) {
    const descInput = page.getByLabel(/description/i).first();
    if (await descInput.isVisible()) {
      await descInput.fill(itemData.description);
    }
  }

  // Fill price if provided
  if (itemData.price) {
    const priceInput = page.getByLabel(/price/i).first();
    if (await priceInput.isVisible()) {
      await priceInput.fill(itemData.price);
    }
  }

  // Submit
  await page.getByRole('button', { name: /add item|create|save/i }).click();

  // Wait for dialog to close
  await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
}

/**
 * Open the edit dialog for an item
 */
export async function openItemEditDialog(page: Page, itemName: string): Promise<void> {
  // Find the item by name and click on it or its edit button
  const itemLocator = page.locator(`text="${itemName}"`).first();
  await itemLocator.click();

  // Wait for dialog
  await page.waitForSelector('[role="dialog"]');
}

/**
 * Delete an item from the menu editor
 */
export async function deleteItem(page: Page, itemName: string): Promise<void> {
  await openItemEditDialog(page, itemName);

  // Click delete button
  await page.getByRole('button', { name: /delete/i }).click();

  // Confirm in alert dialog if present
  const confirmButton = page.getByRole('button', { name: /delete|confirm/i }).last();
  if (await confirmButton.isVisible()) {
    await confirmButton.click();
  }

  // Wait for dialog to close
  await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
}

/**
 * Publish the current menu
 */
export async function publishMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: /publish/i }).click();

  // Wait for publish confirmation or dialog
  await page.waitForTimeout(1000);

  // If there's a confirmation dialog, confirm it
  const confirmButton = page.getByRole('button', { name: /publish|confirm/i }).last();
  if (await confirmButton.isVisible()) {
    await confirmButton.click();
  }

  // Wait for success
  await expect(page.getByText(/published|success/i)).toBeVisible({ timeout: 10000 });
}

/**
 * Check if a toast notification appears with the expected message
 */
export async function expectToast(page: Page, message: string | RegExp): Promise<void> {
  const toast = page.locator('[role="status"], [data-sonner-toast], .toast');
  await expect(toast.filter({ hasText: message })).toBeVisible({ timeout: 5000 });
}

/**
 * Get current URL path
 */
export function getCurrentPath(page: Page): string {
  const url = new URL(page.url());
  return url.pathname;
}

/**
 * Wait for navigation to complete
 */
export async function waitForNavigation(page: Page, urlPattern: string | RegExp): Promise<void> {
  await page.waitForURL(urlPattern, { timeout: 15000 });
  await waitForPageLoad(page);
}

/**
 * Check if an element exists (doesn't throw if not found)
 */
export async function elementExists(locator: Locator): Promise<boolean> {
  return locator.isVisible().catch(() => false);
}

/**
 * Fill a form field by label
 */
export async function fillFormField(
  page: Page,
  label: string | RegExp,
  value: string
): Promise<void> {
  const input = page.getByLabel(label);
  await input.fill(value);
}

/**
 * Get all form validation errors
 */
export async function getFormErrors(page: Page): Promise<string[]> {
  const errorElements = page.locator('[data-error], .error-message, [role="alert"]');
  const count = await errorElements.count();
  const errors: string[] = [];

  for (let i = 0; i < count; i++) {
    const text = await errorElements.nth(i).textContent();
    if (text) {
      errors.push(text.trim());
    }
  }

  return errors;
}

/**
 * Select an option from a dropdown/select
 */
export async function selectOption(
  page: Page,
  label: string | RegExp,
  optionText: string
): Promise<void> {
  // Click the trigger
  await page.getByLabel(label).click();

  // Wait for options and select
  await page.getByRole('option', { name: optionText }).click();
}

/**
 * Toggle a checkbox by label
 */
export async function toggleCheckbox(page: Page, label: string | RegExp): Promise<void> {
  await page.getByLabel(label).click();
}

/**
 * Click a button and wait for navigation
 */
export async function clickAndNavigate(
  page: Page,
  buttonText: string | RegExp,
  urlPattern: string | RegExp
): Promise<void> {
  await page.getByRole('button', { name: buttonText }).click();
  await waitForNavigation(page, urlPattern);
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `e2e/screenshots/${name}.png` });
}

/**
 * Ensure user is on the dashboard (authenticated)
 */
export async function ensureOnDashboard(page: Page): Promise<boolean> {
  await navigateTo(page, '/');

  // Check if we're redirected to sign-in
  const currentUrl = page.url();
  if (currentUrl.includes('sign-in') || currentUrl.includes('clerk')) {
    return false;
  }

  // Check for dashboard elements
  const sidebar = page.locator('aside, [data-testid="sidebar"], nav').first();
  return sidebar.isVisible().catch(() => false);
}

/**
 * Cleanup: Delete all test data created during tests
 * Note: This requires proper cleanup endpoints or UI
 */
export async function cleanupTestData(_page: Page): Promise<void> {
  // This is a placeholder - actual cleanup would depend on:
  // 1. Having cleanup endpoints in the API
  // 2. Or deleting via the UI
  // For now, tests should use unique identifiers
  console.log('Cleanup not implemented - ensure tests use unique identifiers');
}
