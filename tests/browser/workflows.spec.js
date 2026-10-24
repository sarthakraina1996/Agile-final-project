import { test, expect } from '@playwright/test';
async function signIn(page, role = 'Admin') {
  await page.goto('/hr');
  await page.getByRole('button', { name: role, exact: true }).click();
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon)/ })).toBeVisible();
}
test('login, dashboard, search, all modules, and logout', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await signIn(page);
  await page.screenshot({ path: '/tmp/brainadz-desktop.png', fullPage: true });
  for (const label of [
    'People directory',
    'Attendance',
    'Leave management',
    'Payroll',
    'Recruitment',
    'Performance',
    'Expenses',
    'Employee journeys',
    'Assets',
    'Documents',
    'Learning & growth',
    'Benefits',
    'HR helpdesk',
    'Reports & insights',
    'Announcements',
    'Settings',
  ]) {
    if (label === 'Settings')
      await page
        .locator('.sidebar-bottom')
        .getByRole('button', { name: label, exact: true })
        .click();
    else
      await page
        .locator('nav')
        .getByRole('button', { name: new RegExp('^' + label) })
        .click();
    await expect(page.locator('main h1')).toHaveText(label);
  }
  await page.getByRole('button', { name: 'Search anything…' }).click();
  await page.getByRole('textbox', { name: 'Global search' }).fill('Priya');
  await page.getByRole('button', { name: /Priya Nair/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Senior Exhibition Designer');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign in to workspace' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('add an employee and filter the directory', async ({ page }) => {
  await signIn(page);
  await page.locator('nav').getByRole('button', { name: 'People directory' }).click();
  await page.getByRole('button', { name: 'Add employee', exact: true }).click();
  const dialog = page.getByRole('dialog');
  for (const [label, value] of [
    ['Full name', 'Neha Test'],
    ['Work email', 'neha.test@example.com'],
    ['Job title', 'Brand Designer'],
    ['Department', 'Creative'],
    ['Monthly gross salary (INR)', '60000'],
  ])
    await dialog.getByLabel(label, { exact: true }).fill(value);
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('textbox', { name: 'Search employees' }).fill('Neha Test');
  await expect(page.locator('tbody')).toContainText('Neha Test');
  await page.reload();
  await page.getByRole('textbox', { name: 'Search employees' }).fill('Neha Test');
  await expect(page.locator('tbody')).toContainText('Neha Test');
});
test('employee can submit leave, while only HR can approve it', async ({ page }) => {
  await signIn(page, 'Employee');
  await page.locator('nav').getByRole('button', { name: 'Leave management' }).click();
  await page.getByRole('button', { name: 'Request leave', exact: true }).first().click();
  const d = page.getByRole('dialog');
  await d.getByLabel('Start date').fill('2027-08-09');
  await d.getByLabel('End date').fill('2027-08-10');
  await d.getByLabel('Reason').fill('Family visit browser test');
  await d.getByRole('button', { name: 'Send request' }).click();
  await expect(d).toBeHidden();
  await expect(page.locator('tbody')).toContainText('Family visit browser test');
  await expect(page.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'HR manager', exact: true }).click();
  await page.locator('nav').getByRole('button', { name: 'Leave management' }).click();
  const row = page.getByRole('row').filter({ hasText: 'Family visit browser test' });
  await row.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(row).toContainText('Approved');
});
test('payroll and document downloads are real', async ({ page }) => {
  await signIn(page);
  await page.locator('nav').getByRole('button', { name: 'Payroll', exact: true }).click();
  await page.getByRole('button', { name: 'Generate payslips' }).click();
  await expect(page.locator('tbody tr')).not.toHaveCount(0);
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download', exact: true }).first().click();
  expect((await download).suggestedFilename()).toContain('BrainADZ-payslip');
  await page.locator('nav').getByRole('button', { name: 'Documents', exact: true }).click();
  await page.getByRole('button', { name: 'Read document' }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Sample workspace policy');
});
test('mobile navigation and layouts stay within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/hr');
  await page.screenshot({ path: '/tmp/brainadz-login-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon)/ })).toBeVisible();
  await page.screenshot({ path: '/tmp/brainadz-mobile.png', fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.locator('nav').getByRole('button', { name: 'People directory' }).click();
  await expect(page.locator('main h1')).toHaveText('People directory');
  await page.getByRole('button', { name: 'Add employee', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Close dialog' }).click();
});
test('employee completes learning, requests benefits and sends a support request', async ({
  page,
}) => {
  await signIn(page, 'Employee');
  await page.locator('nav').getByRole('button', { name: 'Learning & growth' }).click();
  await page.getByRole('button', { name: 'Start learning', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Mark as complete' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.course-card').filter({ hasText: 'Completed' })).toHaveCount(1);
  await page.locator('nav').getByRole('button', { name: 'Benefits', exact: true }).click();
  await page.getByRole('button', { name: 'Request access', exact: true }).first().click();
  await expect(page.locator('.benefit-card').first()).toContainText('Pending');
  await page.locator('nav').getByRole('button', { name: 'HR helpdesk', exact: true }).click();
  await page.getByRole('button', { name: 'New request' }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('Subject').fill('Learning allowance question');
  await d.getByLabel('How can we help?').fill('How do I access the learning allowance?');
  await d.getByRole('button', { name: 'Save changes' }).click();
  await expect(d).toBeHidden();
  await expect(page.locator('tbody')).toContainText('Learning allowance question');
});
test('administrator creates a working employee login', async ({ page }) => {
  await signIn(page);
  await page
    .locator('.sidebar-bottom')
    .getByRole('button', { name: 'Settings', exact: true })
    .click();
  await page.getByRole('button', { name: 'Create login' }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('Employee', { exact: true }).selectOption('BA003');
  await d.getByLabel('Login email').fill('priya.browser@example.com');
  await d.getByLabel('Initial password (12+ characters)').fill('Browser-Test-Password-123');
  await d.getByRole('button', { name: 'Save changes' }).click();
  await expect(d).toBeHidden();
  await expect(page.locator('.account-list')).toContainText('priya.browser@example.com');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByLabel('Work email', { exact: true }).fill('priya.browser@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Browser-Test-Password-123');
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await page.locator('nav').getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(page.locator('main h1')).toContainText('Priya');
  await expect(
    page.locator('nav').getByRole('button', { name: 'Recruitment', exact: true }),
  ).toHaveCount(0);
});

test('HR can edit employee details and keep them after reload', async ({ page }) => {
  await signIn(page);
  await page.locator('nav').getByRole('button', { name: 'People directory' }).click();
  await page.getByRole('button', { name: 'View Kabir Singh', exact: true }).click();
  await page.getByRole('button', { name: 'Edit employee details' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Job title', { exact: true }).fill('Senior Production Manager');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page.locator('tbody')).toContainText('Senior Production Manager');
});
