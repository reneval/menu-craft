import { test, expect } from '@playwright/test';
import { waitForPageLoad } from './utils/helpers';
import { generateTestId } from './fixtures/test-data';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding');
    await waitForPageLoad(page);
  });

  test('should display onboarding page with step indicator', async ({ page }) => {
    // Check for MenuCraft branding
    await expect(page.getByText('MenuCraft').first()).toBeVisible();

    // Check step indicator is present
    await expect(page.getByText('Welcome')).toBeVisible();
    await expect(page.getByText('Venue')).toBeVisible();
    await expect(page.getByText('Menu')).toBeVisible();
    await expect(page.getByText('Done')).toBeVisible();
  });

  test('should show welcome step initially', async ({ page }) => {
    // Welcome step should be visible
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();

    // Should have Get Started button
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible();
  });

  test('should navigate to venue step when clicking Get Started', async ({ page }) => {
    // Click Get Started
    await page.getByRole('button', { name: /get started/i }).click();

    // Should show venue step
    await expect(page.getByRole('heading', { name: /create your first venue/i })).toBeVisible();

    // Should have venue form fields
    await expect(page.getByLabel(/venue name/i)).toBeVisible();
    await expect(page.getByLabel(/url slug/i)).toBeVisible();
    await expect(page.getByLabel(/timezone/i)).toBeVisible();
  });

  test('should auto-generate slug from venue name', async ({ page }) => {
    // Navigate to venue step
    await page.getByRole('button', { name: /get started/i }).click();

    // Type venue name
    await page.getByLabel(/venue name/i).fill('My Test Restaurant');

    // Wait for auto-generation
    await page.waitForTimeout(500);

    // Slug should be auto-generated
    const slugInput = page.getByLabel(/url slug/i);
    await expect(slugInput).toHaveValue('my-test-restaurant');
  });

  test('should show validation when submitting empty venue name', async ({ page }) => {
    // Navigate to venue step
    await page.getByRole('button', { name: /get started/i }).click();

    // Clear the name field and click Create Venue
    const nameInput = page.getByLabel(/venue name/i);
    await nameInput.clear();

    // Create Venue button should be disabled or show error on submit
    const createButton = page.getByRole('button', { name: /create venue/i });

    // Button should be disabled when name is empty
    await expect(createButton).toBeDisabled();
  });

  test('should complete full onboarding flow', async ({ page }) => {
    const testId = generateTestId();
    const venueName = `E2E Venue ${testId}`;
    const menuName = `E2E Menu ${testId}`;

    // Step 1: Welcome
    await page.getByRole('button', { name: /get started/i }).click();

    // Step 2: Create Venue
    await expect(page.getByRole('heading', { name: /create your first venue/i })).toBeVisible();
    await page.getByLabel(/venue name/i).fill(venueName);
    await page.waitForTimeout(300); // Wait for slug generation

    await page.getByRole('button', { name: /create venue/i }).click();

    // Wait for venue creation and step transition
    await expect(page.getByRole('heading', { name: /add your first menu/i })).toBeVisible({
      timeout: 15000,
    });

    // Step 3: Create Menu
    await page.getByLabel(/menu name/i).fill(menuName);
    await page.waitForTimeout(300); // Wait for slug generation

    await page.getByRole('button', { name: /create menu/i }).click();

    // Wait for menu creation and step transition
    await expect(page.getByRole('heading', { name: /you're all set/i })).toBeVisible({
      timeout: 15000,
    });

    // Step 4: Success
    await expect(page.getByText(/success|ready|set/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /go to menu editor|edit menu|start editing/i })).toBeVisible();
  });

  test('should allow skipping menu creation', async ({ page }) => {
    const testId = generateTestId();
    const venueName = `E2E Skip Venue ${testId}`;

    // Step 1: Welcome
    await page.getByRole('button', { name: /get started/i }).click();

    // Step 2: Create Venue
    await page.getByLabel(/venue name/i).fill(venueName);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create venue/i }).click();

    // Wait for menu step
    await expect(page.getByRole('heading', { name: /add your first menu/i })).toBeVisible({
      timeout: 15000,
    });

    // Skip menu creation
    const skipButton = page.getByRole('button', { name: /skip|later/i });
    if (await skipButton.isVisible()) {
      await skipButton.click();

      // Should go to success step
      await expect(page.getByRole('heading', { name: /you're all set/i })).toBeVisible({
        timeout: 10000,
      });
    }
  });

  test('should auto-detect timezone', async ({ page }) => {
    // Navigate to venue step
    await page.getByRole('button', { name: /get started/i }).click();

    // Timezone should be auto-populated
    const timezoneInput = page.getByLabel(/timezone/i);
    const value = await timezoneInput.inputValue();

    // Should have some timezone value (not empty)
    expect(value).toBeTruthy();
    expect(value.length).toBeGreaterThan(0);
  });

  test('should allow editing the auto-generated slug', async ({ page }) => {
    // Navigate to venue step
    await page.getByRole('button', { name: /get started/i }).click();

    // Type venue name
    await page.getByLabel(/venue name/i).fill('My Restaurant');
    await page.waitForTimeout(300);

    // Edit the slug manually
    const slugInput = page.getByLabel(/url slug/i);
    await slugInput.clear();
    await slugInput.fill('custom-slug');

    // Slug should be the custom value
    await expect(slugInput).toHaveValue('custom-slug');
  });

  test('should show URL preview for slug', async ({ page }) => {
    // Navigate to venue step
    await page.getByRole('button', { name: /get started/i }).click();

    // Check URL preview text
    await expect(page.getByText(/menu\.craft\/m\//i)).toBeVisible();
  });
});

test.describe('Onboarding - Menu Step', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate through to menu step
    await page.goto('/onboarding');
    await waitForPageLoad(page);

    const testId = generateTestId();

    // Complete welcome
    await page.getByRole('button', { name: /get started/i }).click();

    // Complete venue step
    await page.getByLabel(/venue name/i).fill(`Test Venue ${testId}`);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create venue/i }).click();

    // Wait for menu step
    await expect(page.getByRole('heading', { name: /add your first menu/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test('should display menu creation form', async ({ page }) => {
    await expect(page.getByLabel(/menu name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create menu/i })).toBeVisible();
  });

  test('should auto-generate menu slug from name', async ({ page }) => {
    await page.getByLabel(/menu name/i).fill('Lunch Specials');
    await page.waitForTimeout(500);

    const slugInput = page.getByLabel(/url slug/i);
    await expect(slugInput).toHaveValue('lunch-specials');
  });

  test('should disable create button when name is empty', async ({ page }) => {
    const nameInput = page.getByLabel(/menu name/i);
    await nameInput.clear();

    const createButton = page.getByRole('button', { name: /create menu/i });
    await expect(createButton).toBeDisabled();
  });
});

test.describe('Onboarding - Success Step', () => {
  test('should show success page after completing all steps', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForPageLoad(page);

    const testId = generateTestId();

    // Complete welcome
    await page.getByRole('button', { name: /get started/i }).click();

    // Complete venue step
    await page.getByLabel(/venue name/i).fill(`Success Test Venue ${testId}`);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create venue/i }).click();

    // Wait for menu step
    await expect(page.getByRole('heading', { name: /add your first menu/i })).toBeVisible({
      timeout: 15000,
    });

    // Complete menu step
    await page.getByLabel(/menu name/i).fill(`Success Test Menu ${testId}`);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create menu/i }).click();

    // Verify success step
    await expect(page.getByRole('heading', { name: /you're all set/i })).toBeVisible({
      timeout: 15000,
    });

    // Should have link to dashboard or menu editor
    const dashboardLink = page.getByRole('link', { name: /dashboard|editor|menu/i }).first();
    await expect(dashboardLink).toBeVisible();
  });

  test('should navigate to menu editor from success page', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForPageLoad(page);

    const testId = generateTestId();

    // Complete all steps
    await page.getByRole('button', { name: /get started/i }).click();

    await page.getByLabel(/venue name/i).fill(`Nav Test Venue ${testId}`);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create venue/i }).click();

    await expect(page.getByRole('heading', { name: /add your first menu/i })).toBeVisible({
      timeout: 15000,
    });

    await page.getByLabel(/menu name/i).fill(`Nav Test Menu ${testId}`);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create menu/i }).click();

    await expect(page.getByRole('heading', { name: /you're all set/i })).toBeVisible({
      timeout: 15000,
    });

    // Click the link to go to editor/dashboard
    const editorLink = page.getByRole('link', { name: /go to menu editor|edit menu|start editing|dashboard/i }).first();
    await editorLink.click();

    // Should navigate away from onboarding
    await page.waitForURL(/(?!\/onboarding)/, { timeout: 10000 });
    expect(page.url()).not.toContain('/onboarding');
  });
});
