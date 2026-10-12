import { test, expect } from '@playwright/test';
import { installBackendMocks, signIn, student } from './helpers.js';

test('submits a project idea, runs feasibility, and keeps the project in browser storage', async ({ page }) => {
  const pageErrors = [];
  let submittedIdea;
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await installBackendMocks(page);
  await page.route('http://127.0.0.1:8000/submit-idea', async (route) => {
    submittedIdea = route.request().postDataJSON();
    await route.fulfill({
      json: { idea_id: 'e2e-project-1', status: 'pending_review', feasibility_score: 88, tech_stack: [] },
    });
  });
  await signIn(page, student);

  await page.getByRole('button', { name: 'Submit Your Project Idea' }).click();
  await expect(page.locator('.modal-header').getByText('Submit New Idea')).toBeVisible();
  await page.getByPlaceholder('e.g. Smart Attendance System').fill('E2E Campus Planner');
  await page.getByPlaceholder('Describe your project idea in detail...').fill(
    'A project planner that helps students organize academic milestones and deadlines.'
  );
  await page.locator('.modal-box form').getByRole('button', { name: /Submit & Run AI Analysis/ }).press('Enter');

  await expect(page.getByText('88%', { exact: true }).first()).toBeVisible();
  expect(submittedIdea).toMatchObject({
    title: 'E2E Campus Planner',
    student_email: student.email,
    domain: 'web',
  });
  const storedProjects = await page.evaluate((email) => (
    JSON.parse(localStorage.getItem(`aip_projects_${email}`) || '[]')
  ), student.email);
  expect(storedProjects[0]).toMatchObject({
    title: 'E2E Campus Planner',
    id: 'e2e-project-1',
    feasibility: 88,
  });
  expect(pageErrors).toEqual([]);
});
