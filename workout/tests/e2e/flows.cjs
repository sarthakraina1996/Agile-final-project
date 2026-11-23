/*
 * End-to-end verification of the five acceptance flows on a phone-sized viewport.
 *
 *   npm run build && npm run preview      # serves http://127.0.0.1:4173
 *   node tests/e2e/flows.cjs [outDir]     # needs the `playwright` package and a Chromium
 *
 * Set PW_CHROMIUM to a Chromium binary if Playwright's bundled browser is not installed.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = process.env.APP_URL || 'http://127.0.0.1:4173/';
const OUT = path.resolve(process.argv[2] || 'e2e-output');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPhone(browser, size = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, isMobile: true, hasTouch: true, acceptDownloads: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  return { ctx, page };
}
let n = 0;
async function shot(page, name) {
  n += 1;
  await page.screenshot({ path: path.join(OUT, `${String(n).padStart(2, '0')}-${name}.png`) });
}
const tap = (page, role, name, opts = {}) => page.getByRole(role, { name, exact: opts.exact ?? false }).first().click();

async function flow1(page) {
  console.log('\n== Flow 1: setup, edit plan, substitute exercise, Today shows revision');
  await page.goto(BASE);
  await page.waitForSelector('#setup-name');
  await shot(page, 'first-use-setup');
  await tap(page, 'button', 'Create my plan');
  check('Setup validates an empty name', await page.getByRole('alert').isVisible());
  await page.fill('#setup-name', 'Sam');
  await tap(page, 'button', 'Build muscle');
  await tap(page, 'button', 'Create my plan');
  await page.waitForURL(/#\/today$/);
  await shot(page, 'today-after-setup');
  const todayCard = await page.locator('.hero').innerText().catch(() => '');
  check('Today shows the scheduled workout with duration and exercise count', /Upper body A[\s\S]*min · 5 exercises/.test(todayCard), todayCard.replace(/\n/g, ' | '));
  check('Weekly goal starts empty', (await page.getByText('0 of 4 sessions').count()) === 1);

  // Empty states before any data.
  await tap(page, 'button', 'Progress');
  await shot(page, 'progress-empty');
  check('Progress empty state invites logging', await page.getByText(/No .* sessions in 4 weeks/).isVisible());
  await tap(page, 'button', 'Workout history');
  check('History empty state links to Today', await page.getByRole('button', { name: 'Go to Today' }).isVisible());
  await shot(page, 'history-empty');

  // Plan: open Monday, move Thursday's workout to Friday for one date, edit Upper body A.
  await tap(page, 'button', 'Plan');
  await page.waitForURL(/#\/plan/);
  await shot(page, 'weekly-plan');
  check('Plan shows rest days', /Rest days: Wed, Fri, Sun/.test(await page.locator('main').innerText()));
  await page.getByRole('button', { name: /^Thu .*Upper body B/ }).click();
  await tap(page, 'button', 'Move');
  await page.getByRole('radio', { name: /Fri/ }).click();
  await page.getByRole('radio', { name: /This date only/ }).click();
  await shot(page, 'move-sheet');
  await tap(page, 'button', 'Move workout');
  await sleep(300);
  await page.goto(BASE + '#/plan');
  await sleep(300);
  const planText = await page.locator('main').innerText();
  check('One-date move: Friday now has Upper body B, Thursday is rest', /Fri[\s\S]*Upper body B/.test(planText) && /Rest days: Wed, Thu, Sun/.test(planText), planText.split('\n').slice(0, 20).join(' | '));
  await page.getByRole('button', { name: 'Next week' }).click();
  const nextWeek = await page.locator('main').innerText();
  check('One-date move leaves next week unchanged', /Rest days: Wed, Fri, Sun/.test(nextWeek));
  await page.getByRole('button', { name: 'Previous week' }).click();

  await page.getByRole('button', { name: /^Mon .*Upper body A/ }).click();
  await page.waitForURL(/#\/plan\/day\//);
  await shot(page, 'workout-preview');
  await tap(page, 'button', 'Edit');
  await page.waitForURL(/\/edit\//);
  await page.fill('#wname', 'Upper body A');
  await page.getByRole('button', { name: /^Lateral raise, / }).click();
  await shot(page, 'target-sheet');
  await tap(page, 'button', 'Swap exercise');
  await page.waitForURL(/\/pick\/replace\./);
  await page.fill('#exsearch', 'hammer');
  await shot(page, 'replace-picker');
  await tap(page, 'button', 'Use Hammer curl as replacement');
  await page.waitForURL(/\/edit\/upper-a$/);
  // Accessible reorder: move Seated row up one with the keyboard.
  await page.getByRole('button', { name: /^Reorder Seated row/ }).focus();
  await page.keyboard.press('ArrowUp');
  await shot(page, 'edit-workout-dirty');
  const editRows = await page.locator('.edit-row .name span:first-child').allInnerTexts();
  check('Editor shows substitution in the same position and keyboard reorder', editRows.join(',') === 'Bench press,Seated row,Incline dumbbell press,Hammer curl,Face pull', editRows.join(','));
  // Leaving with unsaved changes asks first.
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  check('Leaving with unsaved edits offers Keep editing / Discard', await page.getByRole('button', { name: 'Keep editing' }).isVisible() && await page.getByRole('button', { name: 'Discard edits' }).isVisible());
  await tap(page, 'button', 'Keep editing');
  await tap(page, 'button', 'Save workout');
  await page.waitForURL(/#\/plan\/day\/[\d-]+$/);
  const preview = await page.locator('main').innerText();
  check('Save returns to the originating workout preview with the revision', /Hammer curl/.test(preview) && !/Lateral raise/.test(preview));
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.waitForURL(/#\/plan$/);
  await tap(page, 'button', 'Today');
  await page.waitForURL(/#\/today/);
  await page.getByRole('button', { name: 'Preview exercises' }).click();
  const todayPreview = await page.locator('main').innerText();
  check('Today opens the revised routine', /Hammer curl/.test(todayPreview) && /Seated row[\s\S]*Incline dumbbell press/.test(todayPreview));
  await page.getByRole('button', { name: 'Back', exact: true }).click();
}

async function flow2(page) {
  console.log('\n== Flow 2: two dumbbell sets, reload mid-rest, finisher, double Save');
  await page.waitForURL(/#\/today$/);
  await page.getByRole('button', { name: 'Start workout' }).click();
  await page.waitForURL(/#\/session$/);
  await shot(page, 'live-first-exercise');
  check('Start opens the first exercise', (await page.locator('.ex-title').innerText()) === 'Bench press');
  // Third exercise is now the incline dumbbell press.
  await page.getByRole('button', { name: 'Next exercise' }).click();
  await page.getByRole('button', { name: 'Next exercise' }).click();
  check('Dumbbell load column is labelled kg / hand', (await page.locator('.set-table th').nth(1).innerText()).trim() === 'kg / hand');
  await page.getByLabel('Set 1 load in kg / hand').fill('20');
  await page.getByLabel('Set 1 reps').fill('10');
  await page.getByRole('button', { name: 'Log set 1' }).click();
  await sleep(200);
  await page.getByLabel('Set 2 load in kg / hand').fill('22');
  await page.getByLabel('Set 2 reps').fill('8');
  await shot(page, 'live-editable-set');
  await page.getByRole('button', { name: 'Log set 2' }).click();
  await sleep(1500);
  const before = await page.locator('.rest-time').innerText();
  await shot(page, 'live-resting');
  // Draft for set 3 typed but not logged, then reload mid-rest.
  await page.getByLabel('Set 3 reps').fill('7');
  await sleep(400);
  await page.reload();
  await page.waitForSelector('.ex-title');
  await sleep(600);
  const title = await page.locator('.ex-title').innerText();
  const rest = await page.locator('.rest-time').innerText();
  const [m, s] = rest.split(':').map(Number);
  const remaining = m * 60 + s;
  check('After reload: same exercise', title === 'Incline dumbbell press', title);
  check('After reload: rest timer resumed from timestamps', remaining > 70 && remaining < 90 && (await page.locator('.rest-box.running').count()) === 1, `before ${before}, after ${rest}`);
  const done = await page.locator('.set-table tr.done').count();
  const rows = await page.locator('.set-table tbody tr').allInnerTexts();
  check('After reload: logged values and checks restored', done === 2 && /20\s+10/.test(rows[0]) && /22\s+8/.test(rows[1]), rows.map((r) => r.replace(/\s+/g, ' ')).join(' | '));
  check('After reload: unsent set-3 input restored', (await page.getByLabel('Set 3 reps').inputValue()) === '7');
  await shot(page, 'live-after-reload');

  // Edit a checked row.
  await page.getByRole('checkbox', { name: 'Set 1 logged. Edit' }).click();
  check('Checked row can be selected for editing', await page.getByRole('button', { name: 'Update set 1' }).isVisible());
  await page.getByRole('button', { name: 'Update set 1' }).click();

  // Adjust and skip rest.
  await page.getByRole('button', { name: '15 seconds more rest' }).click();
  await page.getByRole('button', { name: 'Skip rest' }).click();
  check('Rest can be skipped', (await page.locator('.rest-box.running').count()) === 0);

  // Exercise detail from the live session returns to the same exercise and set.
  await page.getByRole('button', { name: /technique and details/ }).click();
  await page.waitForURL(/#\/session\/exercise\//);
  await shot(page, 'exercise-detail-from-session');
  await page.getByRole('button', { name: 'Back to workout' }).click();
  await page.waitForURL(/#\/session$/);
  check('Back from detail returns to the same exercise and unfinished set', (await page.locator('.ex-title').innerText()) === 'Incline dumbbell press' && await page.getByRole('button', { name: 'Log set 3' }).isVisible());

  // Jump to the last exercise.
  await page.getByRole('button', { name: /Show all exercises/ }).click();
  await page.locator('.sheet .list-row').last().click();
  await shot(page, 'live-last-exercise');
  check('Final exercise offers finisher and review', await page.getByRole('button', { name: /Start 5-min abs finisher/ }).isVisible() && await page.getByRole('button', { name: 'Review session' }).isVisible());
  await page.getByRole('button', { name: /Start 5-min abs finisher/ }).click();
  await page.waitForURL(/#\/session\/finisher$/);
  await page.getByRole('button', { name: 'Start circuit' }).click();
  await sleep(2200);
  await shot(page, 'finisher-running');
  const finText = await page.locator('main').innerText();
  check('Finisher shows transition label, countdown, round and next movement', /Get ready: Dead bug/.test(finText) && /Round 1 of 2/.test(finText) && /of 00:05/.test(finText), finText.replace(/\n/g, ' | ').slice(0, 200));
  await page.getByRole('button', { name: 'Pause' }).click();
  const p1 = await page.locator('.ring-time').innerText();
  await sleep(1600);
  const p2 = await page.locator('.ring-time').innerText();
  check('Pause freezes the timer', p1 === p2, `${p1} → ${p2}`);
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.getByRole('button', { name: 'Skip to next interval' }).click();
  const afterSkip = await page.locator('main').innerText();
  check('Skip advances one interval (to Dead bug work)', /WORK/i.test(afterSkip) && /Dead bug/.test(afterSkip) && /of 00:45/.test(afterSkip), afterSkip.replace(/\n/g, ' | ').slice(0, 160));
  await shot(page, 'finisher-work');
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Skip to next interval' }).click();
  await page.getByRole('button', { name: 'Skip final interval and finish' }).click();
  await page.waitForURL(/#\/session\/review$/);
  await shot(page, 'review');
  const review = await page.locator('main').innerText();
  check('Summary counts only exercises with completed sets (1 exercise, 2 sets)', /1\s*exercise\b/.test(review) && /2\s*sets/.test(review), review.replace(/\n/g, ' | ').slice(0, 260));
  check('Summary shows finisher completion and best set', /completed ✓/.test(review) && /22 kg\/hand × 8/.test(review));
  await page.fill('#notes', 'Felt strong');
  const save = page.getByRole('button', { name: 'Save session' });
  await save.evaluate((b) => { b.click(); b.click(); });
  await page.waitForURL(/#\/today\/record\//);
  await shot(page, 'saved-result');
  check('Saved result is shown', await page.getByText('Session saved').isVisible());
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.waitForURL(/#\/progress\/history$/);
  const hist = await page.locator('main li').count();
  check('Double Save produced exactly one History entry', hist === 1, `${hist} rows`);
  await shot(page, 'history-one');
  await tap(page, 'button', 'Today');
  const todayTxt = await page.locator('main').innerText();
  check('Today weekly goal updated to 1 of 4 and card marked completed', /1 of 4 sessions/.test(todayTxt) && /Completed/.test(todayTxt));
  await tap(page, 'button', 'Progress');
  if (!/#\/progress$/.test(page.url())) await tap(page, 'button', 'Progress'); // second tap pops the tab to its root
  await page.selectOption('#exsel', 'incline-dumbbell-press');
  await sleep(200);
  const prog = await page.locator('main').innerText();
  check('Progress plots heaviest set (22 kg / hand × 8) from one session as a point', /22\s*kg \/ hand/.test(prog) && /Best set · 8 reps/.test(prog) && /1 session\b/.test(prog) && (await page.locator('.chart circle').count()) === 1, prog.replace(/\n/g, ' | ').slice(0, 200));
  await shot(page, 'progress-one-point');
  const stored = await page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('workout-tracker');
    r.onsuccess = () => { const q = r.result.transaction('sessions').objectStore('sessions').getAll(); q.onsuccess = () => res(q.result.map((s) => s.status)); };
  }));
  check('IndexedDB holds exactly one completed session and no draft', JSON.stringify(stored) === '["completed"]', JSON.stringify(stored));
}

async function flow3(page) {
  console.log('\n== Flow 3: open saved session, edit template, history unchanged');
  await page.goto(BASE + '#/progress/history');
  await page.locator('main li button').first().click();
  await page.waitForURL(/\/record\//);
  const rec = await page.locator('main').innerText();
  check('Saved session shows both logged sets', /20 kg\/hand × 10/.test(rec) && /22 kg\/hand × 8/.test(rec) && /Felt strong/.test(rec));
  await shot(page, 'record-breakdown');
  // Edit the template: remove the incline press and rename.
  await page.goto(BASE + '#/plan');
  await page.getByRole('button', { name: /^Mon .*Upper body A/ }).click();
  await tap(page, 'button', 'Edit');
  await page.fill('#wname', 'Upper body A v2');
  await page.getByRole('button', { name: /^Incline dumbbell press, / }).click();
  await tap(page, 'button', 'Remove from workout');
  await tap(page, 'button', 'Add exercise');
  await page.getByRole('button', { name: 'Chest', exact: true }).click();
  await page.getByRole('button', { name: /^Push-up, / }).click();
  await shot(page, 'exercise-detail-add');
  await tap(page, 'button', 'Add to workout');
  await page.waitForURL(/\/edit\/upper-a$/);
  await tap(page, 'button', 'Save workout');
  await sleep(300);
  await page.goto(BASE + '#/progress/history');
  await page.locator('main li button').first().click();
  const rec2 = await page.locator('main').innerText();
  check('Historical session still matches what was performed', /Upper body A\b/.test(rec2) && !/v2/.test(rec2) && /Incline dumbbell press/.test(rec2) && /22 kg\/hand × 8/.test(rec2));
  await page.goto(BASE + '#/today');
  const t = await page.locator('main').innerText();
  check('Future workouts use the new template', /Upper body A v2/.test(t));
}

async function flow4(page) {
  console.log('\n== Flow 4: weight & waist, edit, units, export agreement');
  await page.goto(BASE + '#/progress/measurements');
  await shot(page, 'measurements-empty');
  await tap(page, 'button', 'Add measurement');
  await page.fill('#mval', 'abc');
  await tap(page, 'button', 'Save entry');
  check('Invalid value is rejected', await page.getByRole('alert').isVisible());
  await page.fill('#mval', '93.4');
  await page.fill('#mnote', 'Morning');
  await shot(page, 'log-measurement');
  await tap(page, 'button', 'Save entry');
  await page.waitForURL(/#\/progress\/measurements$/);
  // Waist, dated yesterday via the date sheet.
  await tap(page, 'button', 'Add measurement');
  await page.getByRole('button', { name: 'Waist', exact: true }).click();
  await page.fill('#mval', '81.5');
  await page.getByRole('button', { name: /^Date:/ }).click();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yLabel = y.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  if (y.getDate() > new Date().getDate()) await page.getByRole('button', { name: 'Previous month' }).click();
  await page.getByRole('button', { name: yLabel, exact: true }).click();
  await tap(page, 'button', 'Save entry');
  await page.waitForURL(/#\/progress\/measurements$/);
  // Duplicate weight on the same date → offer to update existing.
  await page.getByRole('button', { name: 'Weight', exact: true }).click();
  await tap(page, 'button', 'Add measurement');
  await page.fill('#mval', '93.0');
  await tap(page, 'button', 'Save entry');
  check('Same metric+date shows the existing entry and offers update', await page.getByText('Entry already exists').isVisible() && /93\.4 kg/.test(await page.locator('.sheet').innerText()));
  await shot(page, 'duplicate-entry');
  await tap(page, 'button', 'Update existing entry');
  await page.waitForURL(/#\/progress\/measurements$/);
  // Edit it by tapping the entry.
  await page.locator('main ul.list button').first().click();
  await page.waitForURL(/\/log\/m_/);
  check('Tapping an entry opens it for editing', (await page.inputValue('#mval')) === '93.0');
  await page.fill('#mval', '92.6');
  await tap(page, 'button', 'Save entry');
  await page.waitForURL(/#\/progress\/measurements$/);
  const kgText = await page.locator('main').innerText();
  check('Edited value is visible on the chart screen', /92\.6 kg/.test(kgText) && (await page.locator('main ul.list li').count()) === 1);
  await shot(page, 'measurements-weight-kg');
  // Switch units.
  await page.goto(BASE + '#/profile/settings');
  await page.getByRole('group', { name: 'Weight unit' }).getByRole('button', { name: 'lb' }).click();
  await page.getByRole('group', { name: 'Length unit' }).getByRole('button', { name: 'in' }).click();
  await shot(page, 'settings-lb-in');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download measurements.csv' }).click()]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  fs.writeFileSync(path.join(OUT, 'measurements.csv'), csv);
  const [dlSets] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download sets.csv' }).click()]);
  const setsCsv = fs.readFileSync(await dlSets.path(), 'utf8');
  fs.writeFileSync(path.join(OUT, 'sets.csv'), setsCsv);
  const [dlZip] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export workout data' }).click()]);
  fs.copyFileSync(await dlZip.path(), path.join(OUT, 'workout-data.zip'));
  await page.goto(BASE + '#/progress/measurements');
  await page.getByRole('button', { name: 'Weight', exact: true }).click();
  const lbText = await page.locator('main').innerText();
  const chartLabel = await page.locator('svg.chart').getAttribute('aria-label');
  const weightRow = csv.split('\r\n').find((l) => l.includes(',weight,'));
  check('Weight shows 204.1 lb on screen, chart and CSV; stored value stays 92.6 kg', /204\.1 lb/.test(lbText) && /204\.1 lb/.test(chartLabel) && /,weight,204\.1,lb,92\.6,kg,/.test(weightRow), weightRow);
  await shot(page, 'measurements-weight-lb');
  await page.getByRole('button', { name: 'Waist', exact: true }).click();
  const inText = await page.locator('main').innerText();
  const waistRow = csv.split('\r\n').find((l) => l.includes(',waist,'));
  check('Waist shows 32.1 in on screen and CSV; stored 81.5 cm', /32\.1 in/.test(inText) && /,waist,32\.1,in,81\.5,cm/.test(waistRow), waistRow);
  check('Sets CSV converts loads for display only (44.1 lb, stored 20 kg)', /,per_hand,44\.1,lb,20,kg,10,/.test(setsCsv));
  await page.goto(BASE + '#/progress/history');
  await page.locator('main li button').first().click();
  check('History shows loads in lb after the unit switch', /48\.5 lb\/hand × 8/.test(await page.locator('main').innerText()));
  await page.goto(BASE + '#/profile/settings');
  await page.getByRole('group', { name: 'Weight unit' }).getByRole('button', { name: 'kg' }).click();
  await page.getByRole('group', { name: 'Length unit' }).getByRole('button', { name: 'cm' }).click();
}

async function flow5(browser, page) {
  console.log('\n== Flow 5: rest day, offline, small-phone keyboard');
  await page.goto(BASE + '#/today');
  await page.getByRole('button', { name: /^Wednesday/ }).click();
  await shot(page, 'today-rest-day');
  check('Rest day shows next workout and Browse plan', await page.getByRole('button', { name: 'Browse plan' }).isVisible() && /Next up is/.test(await page.locator('main').innerText()));
  await page.getByRole('button', { name: /^Monday/ }).click();
  await sleep(400);
  // Offline: service worker controls the page, so a reload works with the network off.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.context().setOffline(true);
  await page.reload();
  await page.waitForSelector('.h1');
  await sleep(300);
  const offlineText = await page.locator('main').innerText();
  check('App shell loads offline from the cache with data intact', /Offline/.test(offlineText) && /1 of 4 sessions/.test(offlineText), offlineText.replace(/\n/g, ' | ').slice(0, 160));
  await shot(page, 'offline');
  await page.goto(BASE + '#/plan/library'); // same-document hash navigation, still offline
  await sleep(800);
  const imgOk = await page.evaluate(() => Promise.all([...document.images].filter((i) => i.getBoundingClientRect().top < innerHeight).map((i) => (i.complete ? i.naturalWidth > 0 : new Promise((r) => { i.onload = () => r(true); i.onerror = () => r(false); })))));
  check('Exercise photos load offline', imgOk.length > 0 && imgOk.every(Boolean), `${imgOk.filter(Boolean).length}/${imgOk.length}`);
  await shot(page, 'offline-library');
  await page.context().setOffline(false);

  // Tabs restore their selection and scroll position.
  await page.goto(BASE + '#/progress');
  await page.selectOption('#exsel', 'incline-dumbbell-press');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(300);
  const y0 = await page.evaluate(() => window.scrollY);
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await sleep(200);
  await page.getByRole('button', { name: 'Progress', exact: true }).click();
  await sleep(300);
  const y1 = await page.evaluate(() => window.scrollY);
  check('Returning to a tab restores its selection and scroll position', (await page.inputValue('#exsel')) === 'incline-dumbbell-press' && y0 > 40 && Math.abs(y1 - y0) < 4, `scroll ${y0} → ${y1}`);

  // Small phone: 360×640, then simulate the keyboard by shrinking the viewport.
  const { ctx, page: small } = await newPhone(browser, { width: 360, height: 640 });
  await small.goto(BASE);
  await small.fill('#setup-name', 'Kai');
  await small.getByRole('button', { name: 'Create my plan' }).click();
  await small.waitForURL(/#\/today/);
  await shot(small, 'small-today');
  await small.getByRole('button', { name: 'Start workout' }).click();
  await small.waitForURL(/#\/session/);
  await shot(small, 'small-live');
  const reps = small.getByLabel('Set 1 reps');
  await reps.focus();
  await small.setViewportSize({ width: 360, height: 360 }); // ~280 px keyboard
  await sleep(700);
  const ib = await reps.boundingBox();
  const bb = await small.getByRole('button', { name: 'Log set 1' }).boundingBox();
  check('Keyboard-sized viewport: active input and Log set both visible, not overlapping', ib && bb && ib.y >= 0 && ib.y + ib.height <= bb.y && bb.y + bb.height <= 360, `input ${JSON.stringify(ib)} button ${JSON.stringify(bb)}`);
  await shot(small, 'small-keyboard');
  await small.setViewportSize({ width: 360, height: 640 });

  // A failed save keeps the draft and offers Retry; the retry saves once.
  await reps.blur();
  await small.getByLabel('Set 1 load in kg').fill('40');
  await small.getByRole('button', { name: 'Log set 1' }).click();
  await small.getByRole('button', { name: /Show all exercises/ }).click();
  await small.getByRole('button', { name: 'Finish and review' }).click();
  await small.waitForURL(/#\/session\/review$/);
  await small.evaluate(() => {
    const orig = IDBObjectStore.prototype.put;
    window.__restorePut = () => { IDBObjectStore.prototype.put = orig; };
    IDBObjectStore.prototype.put = function () { throw new DOMException('Simulated quota error', 'QuotaExceededError'); };
  });
  await small.getByRole('button', { name: 'Save session' }).click();
  await sleep(400);
  const alert = small.getByRole('alert');
  check('Failed save shows an error with Retry and keeps the draft', await alert.isVisible() && /kept as a draft/.test(await alert.innerText()) && /#\/session\/review$/.test(small.url()));
  await shot(small, 'save-failed-retry');
  await small.reload();
  await small.waitForSelector('main');
  check('Draft survives a reload after the failed save', /Session complete|Review session/.test(await small.locator('main').innerText()));
  await small.evaluate(() => {
    const orig = IDBObjectStore.prototype.put;
    window.__fail = true;
    IDBObjectStore.prototype.put = function (...a) { if (window.__fail && this.name === 'sessions') { window.__fail = false; throw new DOMException('Simulated', 'QuotaExceededError'); } return orig.apply(this, a); };
  });
  await small.getByRole('button', { name: 'Save session' }).click();
  await sleep(300);
  await small.getByRole('button', { name: 'Retry' }).click();
  await small.waitForURL(/#\/today\/record\//);
  const count = await small.evaluate(() => new Promise((res) => { const r = indexedDB.open('workout-tracker'); r.onsuccess = () => { const q = r.result.transaction('sessions').objectStore('sessions').getAll(); q.onsuccess = () => res(q.result.map((x) => x.status).join(',')); }; }));
  check('Retry commits the session once', count === 'completed', count);

  // Horizontal overflow check across main screens at 360 px.
  const paths = ['#/today', '#/plan', '#/progress', '#/profile', '#/plan/library', '#/progress/measurements', '#/profile/settings', '#/session'];
  const overflow = [];
  for (const p of paths) {
    await small.goto(BASE + p); await sleep(250);
    const w = await small.evaluate(() => document.documentElement.scrollWidth);
    if (w > 360) overflow.push(`${p}:${w}`);
  }
  check('No horizontal overflow at 360 px', overflow.length === 0, overflow.join(', '));
  // Touch targets ≥ 44 px.
  const small44 = [];
  for (const p of paths) {
    await small.goto(BASE + p); await sleep(250);
    const bad = await small.evaluate(() => [...document.querySelectorAll('button, a, input, select, [role=switch]')]
      .filter((e) => e.offsetParent !== null && !e.closest('.sr-only'))
      .map((e) => ({ r: e.getBoundingClientRect(), t: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30) }))
      .filter(({ r }) => r.width > 0 && (r.width < 44 || r.height < 44)).map(({ r, t }) => `${t}(${Math.round(r.width)}×${Math.round(r.height)})`));
    if (bad.length) small44.push(`${p}: ${bad.join('; ')}`);
  }
  check('All visible controls are at least 44×44 px', small44.length === 0, small44.join(' || '));
  // Unlabelled controls.
  const unlabeled = [];
  for (const p of paths) {
    await small.goto(BASE + p); await sleep(250);
    const bad = await small.evaluate(() => [...document.querySelectorAll('button, input, select')].filter((e) => {
      const name = e.getAttribute('aria-label') || e.textContent.trim() || (e.id && document.querySelector(`label[for="${e.id}"]`)?.textContent) || e.getAttribute('aria-labelledby');
      return !name;
    }).map((e) => e.outerHTML.slice(0, 80)));
    if (bad.length) unlabeled.push(`${p}: ${bad.join(' ; ')}`);
  }
  check('Every control has an accessible name', unlabeled.length === 0, unlabeled.join(' || '));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const { page } = await newPhone(browser);
  const steps = [() => flow1(page), () => flow2(page), () => flow3(page), () => flow4(page), () => flow5(browser, page)];
  for (const step of steps) {
    try { await step(); } catch (e) { check('flow crashed', false, e.message.split('\n')[0]); await shot(page, 'crash'); }
  }
  check('No page errors', page.errors.length === 0, page.errors.slice(0, 3).join(' | '));
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots in ${OUT}`);
  process.exit(failed.length ? 1 : 0);
})();
