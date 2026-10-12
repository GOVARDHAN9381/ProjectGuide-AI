import { test, expect } from '@playwright/test';
import { faculty, installBackendMocks, signIn } from './helpers.js';

test('shows a clear error for a rejected password', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await installBackendMocks(page, { loginStatus: 401 });

  await page.goto('/login');
  await page.locator('input[type="email"]').fill('unknown@example.test');
  await page.locator('input[type="password"]').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign In to Workspace' }).click();

  await expect(page.locator('.auth-alert-banner')).toContainText(
    'Incorrect password. Please verify and try again.'
  );
  expect(pageErrors).toEqual([]);
});

test('registers a student and redirects to profile setup', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await installBackendMocks(page);

  await page.goto('/login');
  await page.getByRole('button', { name: 'Create Account', exact: true }).click({ force: true });
  await page.getByPlaceholder('e.g. Arjun Sharma').fill('New E2E Student');
  await page.locator('input[type="email"]').fill('new.e2e@example.test');
  await page.locator('input[type="password"]').fill('valid-test-password');
  await page.getByRole('button', { name: 'Create Account & Begin' }).click();

  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText('New E2E Student')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('faculty signs in and can end the session', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await installBackendMocks(page, { loginUser: faculty });
  await signIn(page, faculty);

  await expect(page.getByRole('button', { name: 'Broadcast', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(pageErrors).toEqual([]);
});
