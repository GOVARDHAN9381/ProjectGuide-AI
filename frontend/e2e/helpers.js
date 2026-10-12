import { expect } from '@playwright/test';

export const student = {
  id: 'e2e-student',
  email: 'e2e.student@example.test',
  name: 'E2E Student',
  role: 'student',
  skills: { python: 3 },
  domains: ['web'],
  hasCompletedProfile: true,
};

export const faculty = {
  id: 'e2e-faculty',
  email: 'e2e.faculty@example.test',
  name: 'E2E Faculty',
  role: 'faculty',
  skills: {},
  domains: [],
  hasCompletedProfile: true,
};

export async function installBackendMocks(page, { loginUser = student, loginStatus = 200 } = {}) {
  await page.route('http://127.0.0.1:8000/**', async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();
    const corsHeaders = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': '*',
      'access-control-allow-headers': '*',
    };

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      if (loginStatus !== 200) {
        await route.fulfill({
          status: loginStatus,
          headers: corsHeaders,
          json: { detail: loginStatus === 404 ? 'Account not found.' : 'Incorrect password.' },
        });
        return;
      }
      await route.fulfill({
        headers: corsHeaders,
        json: { status: 'authenticated', user: loginUser, hasCompletedProfile: true },
      });
      return;
    }

    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = request.postDataJSON();
      await route.fulfill({
        headers: corsHeaders,
        json: {
          status: 'registered',
          user: { ...student, name: body.name, email: body.email },
          hasCompletedProfile: false,
        },
      });
      return;
    }

    if (pathname === '/api/ideas' && method === 'GET') {
      await route.fulfill({ json: [] });
      return;
    }

    if (pathname === '/submit-idea' && method === 'POST') {
      await route.fulfill({
        json: { idea_id: 'e2e-project-1', status: 'pending_review', feasibility_score: 88, tech_stack: [] },
      });
      return;
    }

    if (pathname === '/api/feasibility-check' && method === 'POST') {
      await route.fulfill({
        json: {
          overallScore: 88,
          verdict: 'Highly Feasible',
          metrics: { technical: 88, timeline: 85, resource: 90, skillMatch: 89 },
          strengths: ['Clear project objectives', 'Manageable scope'],
          bottlenecks: ['Validate data availability'],
          filesAnalyzed: [],
          aiGenerated: false,
        },
      });
      return;
    }

    if (pathname === '/faculty/cohort') {
      await route.fulfill({ json: [] });
      return;
    }
    if (pathname === '/faculty/analytics') {
      await route.fulfill({ json: {} });
      return;
    }
    if (pathname === '/faculty/activity') {
      await route.fulfill({ json: { events: [] } });
      return;
    }
    if (pathname === '/faculty/announcements') {
      await route.fulfill({ json: { announcements: [] } });
      return;
    }

    await route.fulfill({ json: {} });
  });
}

export async function signIn(page, user = student) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill('correct-test-password');
  await page.getByRole('button', { name: 'Sign In to Workspace' }).click();
  await expect(page).toHaveURL(user.role === 'faculty' ? /faculty-dashboard/ : /dashboard/);
}
