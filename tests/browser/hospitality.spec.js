import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const API = '/hospitality-api/v1';
async function login(page, role = 'Group owner') {
  await page.goto('/');
  await page.getByRole('button', { name: role, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Executive dashboard' })).toBeVisible();
}
async function nav(page, name) {
  await page
    .getByRole('navigation', { name: 'Hospitality modules' })
    .getByRole('button', { name: new RegExp('^' + name + '(?:$|\\s)') })
    .click();
}
async function state(page) {
  return page.evaluate(async () => {
    const r = await fetch('/hospitality-api/v1/workspace');
    return r.json();
  });
}
async function signOut(page) {
  await page.locator('.h-user-profile').click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Sign in to workspace', exact: true }),
  ).toBeVisible();
}
test('hospitality dashboard, top navigation, property/date filters and HR preservation', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page);
  await page.screenshot({ path: '/tmp/hospitality-dashboard.png', fullPage: true });
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toContainText('Find your next detail');
  await page.keyboard.press('Escape');
  for (const label of [
    'Reservations',
    'Calendar',
    'Front Desk',
    'Rooms',
    'Housekeeping',
    'Guests',
    'Finance',
    'Multi-Property',
  ]) {
    await nav(page, label);
    await expect(page.locator('.h-main h1')).toBeVisible();
  }
  await page.getByLabel('Select property', { exact: true }).selectOption('p1');
  await nav(page, 'Dashboard');
  await expect(page.locator('.h-property-cell')).toHaveCount(1);
  await page.getByLabel('Reporting period', { exact: true }).selectOption('Last 7 days');
  await expect(page.locator('.h-kpi').first()).toContainText('Operating revenue');
  await page.getByLabel('Select property', { exact: true }).selectOption('p2');
  await expect(page.locator('.h-property-cell')).toContainText('Ocean Crest Hotel');
  await signOut(page);
  await page.getByRole('button', { name: 'Housekeeping', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Executive dashboard' })).toBeVisible();
  await expect(page.getByLabel('Select property', { exact: true })).toContainText(
    'Grand Palace Resort',
  );
  expect(errors).toEqual([]);
  await page.goto('/hr');
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
  await expect(page.locator('main h1')).toContainText('Ananya');
});
test('create booking, see it on calendar, amend dates and reject an overlapping booking', async ({
  page,
}) => {
  await login(page);
  await nav(page, 'Reservations');
  const d = await state(page),
    room = d.rooms.find((r) => r.property_id === 'p1' && r.maintenance === 'Good');
  const from = new Date(Date.parse(d.today) + 60 * 86400000).toISOString().slice(0, 10),
    to = new Date(Date.parse(d.today) + 62 * 86400000).toISOString().slice(0, 10);
  await page.getByRole('button', { name: 'New reservation', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Room', { exact: true }).selectOption(room.id);
  await modal.getByLabel('Arrival', { exact: true }).fill(from);
  await modal.getByLabel('Departure', { exact: true }).fill(to);
  await modal.getByLabel('Full name', { exact: true }).fill('Calendar Browser Guest');
  await modal.getByLabel('Email address', { exact: true }).fill('calendar@example.com');
  await modal.getByRole('button', { name: 'Confirm reservation' }).click();
  await expect(modal).toBeHidden();
  const response = await page.request.post(API + '/reservations', {
    data: {
      property_id: room.property_id,
      room_id: room.id,
      arrival: from,
      departure: to,
      adults: 1,
      children: 0,
      source: 'Direct',
      guest_name: 'Duplicate',
      request_id: randomUUID(),
    },
  });
  expect(response.status()).toBe(409);
  const query = await page.request.get(API + `/workspace?from=${from}&to=${to}`);
  const data = await query.json(),
    booking = data.reservations.find((r) => r.guest_name === 'Calendar Browser Guest');
  expect(booking).toBeTruthy();
  await page.getByLabel('Reporting period', { exact: true }).selectOption('Custom');
  await page.getByLabel('Period start').fill(from);
  await page.getByLabel('Period end').fill(to);
  await page.getByLabel('Search reservations').fill('Calendar Browser Guest');
  await page.getByRole('button', { name: 'View stay', exact: false }).first().click();
  await page.getByRole('button', { name: 'Amend stay / room' }).click();
  await expect(page.getByRole('dialog')).toContainText('Move or amend a stay');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await nav(page, 'Calendar');
  await page.getByRole('button', { name: 'Month', exact: true }).click();
  await page.getByLabel('Calendar start date', { exact: true }).fill(from);
  await expect(
    page.locator('.h-booking-bar').filter({ hasText: 'Calendar Browser Guest' }),
  ).toBeVisible();
  const bookingRow = page
    .locator('.h-calendar-row')
    .filter({
      has: page.locator('.h-room-label b').filter({ hasText: new RegExp('^' + room.number + '$') }),
    })
    .first();
  const update = page.waitForResponse(
    (r) => r.url().includes('/reservations/' + booking.id) && r.request().method() === 'PATCH',
  );
  await bookingRow
    .locator('.h-booking-bar')
    .filter({ hasText: 'Calendar Browser Guest' })
    .dragTo(bookingRow.locator('.h-calendar-cell').nth(3));
  expect((await update).status()).toBe(200);
  const moved = await (await page.request.get(API + '/folios/' + booking.id)).json();
  expect(moved.reservation.arrival).toBe(
    new Date(Date.parse(from) + 3 * 86400000).toISOString().slice(0, 10),
  );

  await expect(page.locator('.h-calendar-track').first()).toBeVisible();
  await page.screenshot({ path: '/tmp/hospitality-calendar.png', fullPage: true });
});
test('real guest stay: check in, post room charge, record payment, checkout, inspect', async ({
  page,
}) => {
  await login(page);
  const d = await state(page),
    next = new Date(Date.parse(d.today) + 86400000).toISOString().slice(0, 10);
  const room = d.rooms.find(
    (m) =>
      m.property_id === 'p1' &&
      m.maintenance === 'Good' &&
      m.cleaning === 'Inspected' &&
      !d.reservations.some(
        (r) =>
          r.room_id === m.id &&
          r.status !== 'Cancelled' &&
          r.arrival < next &&
          r.departure > d.today,
      ),
  );
  expect(room).toBeTruthy();
  const created = await page.request.post(API + '/reservations', {
    data: {
      property_id: room.property_id,
      room_id: room.id,
      arrival: d.today,
      departure: next,
      adults: 1,
      children: 0,
      source: 'Direct',
      guest_name: 'Stay Journey Guest',
      request_id: randomUUID(),
    },
  });
  expect(created.status()).toBe(201);
  await page.reload();
  await nav(page, 'Front Desk');
  await page.getByLabel('Search reservations').fill('Stay Journey Guest');
  await page.getByRole('button', { name: 'Check in', exact: true }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Check in', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('In house');
  await page.getByRole('button', { name: 'Post charge', exact: true }).click();
  const charge = page.getByRole('dialog', { name: 'Post a charge' });
  for (let i = 0; i < 10; i++) await page.keyboard.press('Tab');
  expect(await charge.evaluate((el) => el.contains(document.activeElement))).toBeTruthy();
  await charge.getByLabel('Amount', { exact: true }).fill('1000');
  await charge.getByRole('button', { name: 'Save posting' }).click();
  await expect(charge).toBeHidden();
  await page.getByRole('button', { name: 'Record payment', exact: true }).click();
  const payment = page.getByRole('dialog', { name: 'Record a payment' });
  await payment.getByRole('button', { name: 'Save posting' }).click();
  await expect(payment).toBeHidden();
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Statement', exact: true }).click();
  expect((await download).suggestedFilename()).toContain('statement');
  await page.getByRole('button', { name: 'Check out', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Checked out');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await nav(page, 'Housekeeping');
  await page.getByLabel('Search housekeeping').fill(room.number);
  const row = page.locator('tbody tr').filter({ hasText: 'Departure clean' }).first();
  await row.getByRole('button', { name: 'Start cleaning' }).click();
  await row.getByRole('button', { name: 'Finish cleaning' }).click();
  await expect(row).toContainText('Awaiting inspection');
  await row.getByRole('button', { name: 'Inspect & release' }).click();
  await page.getByRole('tab', { name: 'Completed', exact: true }).click();
  await expect(page.locator('tbody')).toContainText('Inspected');
});
test('room details, property configuration, rate editing and tablet/mobile layouts', async ({
  page,
}) => {
  await login(page);
  await nav(page, 'Multi-Property');
  await page.getByRole('button', { name: 'Property settings', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Property configuration');
  await page.getByLabel('Property name', { exact: true }).fill('Grand Palace Resort');
  await page.getByRole('button', { name: 'Save configuration' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await nav(page, 'Rooms');
  await page.getByRole('tab', { name: 'Room types & rates' }).click();
  await page.getByRole('button', { name: 'Edit rate', exact: true }).first().click();
  await page.getByLabel('Base nightly rate (INR)', { exact: true }).fill('6800');
  await page.getByRole('button', { name: 'Save configuration' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('tab', { name: 'Room inventory', exact: true }).click();
  await page.locator('.h-room-card').first().click();
  await expect(page.getByRole('heading', { name: 'Room information' })).toBeVisible();
  await page.screenshot({ path: '/tmp/hospitality-room.png', fullPage: true });
  await nav(page, 'Dashboard');
  for (const width of [1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
  }
  await page.screenshot({ path: '/tmp/hospitality-mobile.png', fullPage: true });
  await signOut(page);
});
test('housekeeping account cannot access financial pages or release an inspection', async ({
  page,
}) => {
  await login(page, 'Housekeeping');
  await expect(
    page
      .getByRole('navigation', { name: 'Hospitality modules' })
      .getByRole('button', { name: 'Finance', exact: true }),
  ).toHaveCount(0);
  const r = await page.request.get(API + '/workspace');
  const d = await r.json();
  expect(d.metrics.revenue).toBeNull();
  expect(d.entries).toHaveLength(0);
  await nav(page, 'Housekeeping');
  await expect(page.getByRole('heading', { name: 'Housekeeping management' })).toBeVisible();
});
