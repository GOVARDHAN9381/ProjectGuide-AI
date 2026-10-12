import { test, expect } from '@playwright/test';
import { faculty, installBackendMocks, signIn } from './helpers.js';

test('faculty reviews the cohort and broadcasts an announcement', async ({ page }) => {
  const pageErrors = [];
  let announcement;
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await installBackendMocks(page, { loginUser: faculty });
  await page.route('http://127.0.0.1:8000/faculty/broadcast', async (route) => {
    announcement = route.request().postDataJSON();
    await route.fulfill({ json: { status: 'sent' } });
  });
  await signIn(page, faculty);

  await expect(page.getByText('All Students (0)')).toBeVisible();
  await page.getByRole('button', { name: 'Broadcast', exact: true }).click();
  await page.getByPlaceholder('e.g. Mid-Semester Checkpoint Reminder').fill('E2E milestone reminder');
  await page.getByPlaceholder('Write your message to all students here...').fill(
    'Please submit your milestone updates by Friday.'
  );
  await page.getByRole('button', { name: /Send Announcement/ }).click();

  await expect(page.getByText('E2E milestone reminder')).toBeVisible();
  expect(announcement).toMatchObject({
    title: 'E2E milestone reminder',
    message: 'Please submit your milestone updates by Friday.',
    author_email: faculty.email,
  });
  expect(pageErrors).toEqual([]);
});
