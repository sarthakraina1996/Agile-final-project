import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHotelRouter } from '../server/hospitality/router.js';
import { openHotelDatabase } from '../server/hospitality/database.js';
import { metrics } from '../server/hospitality/metrics.js';
import { today, addDays } from '../server/hospitality/utils.js';
let router, server, base, owner, manager, housekeeper, frontdesk;
const now = today();
async function call(path, method = 'GET', body, cookie = owner) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  return {
    status: r.status,
    body: r.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text,
    cookie: r.headers.get('set-cookie')?.split(';')[0],
  };
}
const booking = (room, from = addDays(now, 60), to = addDays(now, 62)) => ({
  property_id: room.property_id,
  room_id: room.id,
  guest_name: 'Workflow Guest',
  email: 'workflow@example.com',
  arrival: from,
  departure: to,
  adults: 1,
  children: 0,
  source: 'Direct',
  request_id: randomUUID(),
});
function freeRoom() {
  return router.db
    .prepare(
      "SELECT * FROM rooms m WHERE m.property_id='p1' AND m.maintenance='Good' AND m.cleaning='Inspected' AND NOT EXISTS(SELECT id FROM reservations r WHERE r.room_id=m.id AND r.status!='Cancelled' AND r.arrival<? AND r.departure>?) LIMIT 1",
    )
    .get(addDays(now, 1), now);
}
before(async () => {
  router = createHotelRouter();
  const app = express();
  app.use(router);
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = 'http://127.0.0.1:' + server.address().port;
  for (const [role, set] of [
    ['owner', (v) => (owner = v)],
    ['manager', (v) => (manager = v)],
    ['housekeeping', (v) => (housekeeper = v)],
    ['frontdesk', (v) => (frontdesk = v)],
  ]) {
    const result = await call(
      '/login',
      'POST',
      { email: role + '@brainadz.com', password: 'Brainadz@123' },
      null,
    );
    assert.equal(result.status, 200);
    set(result.cookie);
  }
});
after(() => {
  server.close();
  router.db.close();
});
test('hotel authentication is separate and invalid credentials are rejected', async () => {
  assert.equal((await call('/workspace', 'GET', null, null)).status, 401);
  assert.equal(
    (await call('/login', 'POST', { email: 'owner@brainadz.com', password: 'wrong' }, null)).status,
    401,
  );
  assert.equal((await call('/health', 'GET', null, null)).body.ok, true);
});
test('coherent portfolio seed contains 200 rooms, five properties and one year of ledger sources', async () => {
  const d = (await call('/workspace')).body;
  assert.equal(d.properties.length, 5);
  assert.equal(d.rooms.length, 200);
  assert.ok(
    router.db.prepare('SELECT MIN(business_date) AS d FROM folio_entries').get().d <=
      addDays(now, -365),
  );
  assert.equal(
    router.db
      .prepare(
        "SELECT COUNT(*) AS n FROM (SELECT r.id,SUM(f.debit-f.credit) AS balance FROM reservations r JOIN folio_entries f ON f.reservation_id=r.id WHERE r.status='Checked out' GROUP BY r.id HAVING balance!=0)",
      )
      .get().n,
    0,
  );
  assert.equal(
    router.db
      .prepare(
        "SELECT COUNT(*) AS n FROM reservations a JOIN reservations b ON a.id<b.id AND a.room_id=b.room_id AND a.arrival<b.departure AND a.departure>b.arrival WHERE a.status!='Cancelled' AND b.status!='Cancelled'",
      )
      .get().n,
    0,
  );
});
test('property isolation and financial visibility apply on the API', async () => {
  const m = await call('/workspace?property=p1', 'GET', null, manager);
  assert.ok(m.body.rooms.every((r) => r.property_id === 'p1'));
  assert.equal(m.body.properties.length, 1);
  assert.equal((await call('/workspace?property=p2', 'GET', null, manager)).status, 403);
  const h = (await call('/workspace', 'GET', null, housekeeper)).body;
  assert.equal(h.metrics.revenue, null);
  assert.equal(h.entries.length, 0);
  assert.equal(h.guests.length, 0);
  assert.ok(h.rooms.every((r) => r.base_rate === undefined));
  assert.ok(h.reservations.every((r) => r.rate === undefined && r.balance === undefined));
  assert.equal((await call('/reservations', 'POST', booking(h.rooms[0]), housekeeper)).status, 403);
  const other = router.db
    .prepare("SELECT id FROM reservations WHERE property_id='p2' LIMIT 1")
    .get();
  assert.equal((await call('/folios/' + other.id, 'GET', null, manager)).status, 403);
});
test('competing physical-room bookings are serialized and the losing transaction rolls back', async () => {
  const room = router.db
    .prepare("SELECT * FROM rooms WHERE property_id='p1' AND maintenance='Good' LIMIT 1")
    .get();
  const count = router.db.prepare('SELECT COUNT(*) AS n FROM guests').get().n;
  const bodies = [booking(room), booking(room)];
  const results = await Promise.all(bodies.map((b) => call('/reservations', 'POST', b)));
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(router.db.prepare('SELECT COUNT(*) AS n FROM guests').get().n, count + 1);
  const winner = results.find((r) => r.status === 201).body;
  const b = bodies[results.findIndex((r) => r.status === 201)];
  assert.equal((await call('/reservations', 'POST', b)).body.id, winner.id);
  assert.equal(
    (await call('/reservations', 'POST', { ...b, guest_name: 'Different payload' })).status,
    409,
  );
  const boundary = await call(
    '/reservations',
    'POST',
    booking(room, addDays(now, 62), addDays(now, 63)),
  );
  assert.equal(boundary.status, 201);
});
test('booking validation rejects invalid dates, capacity and cross-property movement', async () => {
  const room = router.db.prepare("SELECT * FROM rooms WHERE id='p1r0'").get();
  assert.equal(
    (
      await call('/reservations', 'POST', {
        ...booking(room),
        arrival: '2027-02-30',
        departure: '2027-03-02',
      })
    ).status,
    400,
  );
  assert.equal((await call('/reservations', 'POST', { ...booking(room), adults: 99 })).status, 400);
  assert.equal(
    (await call('/reservations', 'POST', { ...booking(room), property_id: 'p2' }, manager)).status,
    403,
  );
  const r = await call('/reservations', 'POST', booking(room, addDays(now, 70), addDays(now, 72)));
  assert.equal(r.status, 201);
  assert.equal(
    (await call('/reservations/' + r.body.id, 'PATCH', { room_id: 'p2r0' })).status,
    400,
  );
  assert.equal(
    (await call('/reservations/' + r.body.id, 'PATCH', { room_id: 'p1r1' })).status,
    200,
  );
});
test('complete hotel journey, immutable postings, payment idempotency, checkout and inspection gate', async () => {
  const room = freeRoom();
  assert.ok(room);
  const created = await call('/reservations', 'POST', booking(room, now, addDays(now, 1)));
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.equal((await call('/reservations/' + id + '/check-in', 'POST', {})).status, 200);
  const charge = {
    kind: 'charge',
    department: 'Rooms',
    description: 'Room charge',
    amount: 100000,
    request_id: randomUUID(),
  };
  const charged = await call('/folios/' + id, 'POST', charge);
  assert.equal(charged.status, 201);
  assert.equal(charged.body.tax, 12000);
  assert.equal((await call('/folios/' + id, 'POST', charge)).body.id, charged.body.id);
  assert.throws(
    () => router.db.prepare('UPDATE folio_entries SET debit=1 WHERE id=?').run(charged.body.id),
    /immutable/,
  );
  assert.throws(
    () => router.db.prepare('DELETE FROM folio_entries WHERE id=?').run(charged.body.id),
    /immutable/,
  );
  assert.equal((await call('/reservations/' + id + '/check-out', 'POST', {})).status, 409);
  assert.equal(
    (
      await call('/folios/' + id, 'POST', {
        kind: 'payment',
        method: 'Cash',
        description: 'Payment',
        amount: 112001,
        request_id: randomUUID(),
      })
    ).status,
    400,
  );
  const payment = {
    kind: 'payment',
    description: 'Payment received',
    method: 'Cash',
    amount: 112000,
    request_id: randomUUID(),
  };
  assert.equal((await call('/folios/' + id, 'POST', payment)).status, 201);
  assert.equal((await call('/folios/' + id, 'POST', payment)).status, 201);
  const folio = (await call('/folios/' + id)).body;
  assert.equal(folio.balance, 0);
  assert.equal(folio.entries.length, 2);
  assert.match((await call('/folios/' + id + '/statement')).body, /NOT A TAX INVOICE/);
  assert.equal((await call('/reservations/' + id + '/check-out', 'POST', {})).status, 200);
  assert.equal(
    router.db.prepare('SELECT cleaning FROM rooms WHERE id=?').get(room.id).cleaning,
    'Dirty',
  );
  const task = router.db
    .prepare("SELECT * FROM housekeeping_tasks WHERE room_id=? AND status!='Completed'")
    .get(room.id);
  assert.ok(task);
  assert.equal(
    (await call('/housekeeping/' + task.id, 'PATCH', { action: 'start' }, housekeeper)).status,
    200,
  );
  assert.equal(
    (await call('/housekeeping/' + task.id, 'PATCH', { action: 'complete' }, housekeeper)).status,
    200,
  );
  assert.equal(
    router.db.prepare('SELECT cleaning FROM rooms WHERE id=?').get(room.id).cleaning,
    'Clean',
  );
  assert.equal(
    (await call('/housekeeping/' + task.id, 'PATCH', { action: 'inspect' }, housekeeper)).status,
    403,
  );
  assert.equal(
    (await call('/housekeeping/' + task.id, 'PATCH', { action: 'inspect' }, manager)).status,
    200,
  );
  assert.equal(
    router.db.prepare('SELECT cleaning FROM rooms WHERE id=?').get(room.id).cleaning,
    'Inspected',
  );
  assert.equal(
    (await call('/folios/' + id, 'POST', { ...charge, request_id: randomUUID() })).status,
    400,
  );
});
test('reversals are linked and a front desk account cannot reverse financial records', async () => {
  const room = freeRoom(),
    r = await call('/reservations', 'POST', booking(room, now, addDays(now, 1)));
  assert.equal(r.status, 201);
  await call('/reservations/' + r.body.id + '/check-in', 'POST', {});
  const charge = await call('/folios/' + r.body.id, 'POST', {
    kind: 'charge',
    department: 'F&B',
    description: 'Dining',
    amount: 50000,
    request_id: randomUUID(),
  });
  const reverse = {
    kind: 'reversal',
    description: 'Incorrect meal posting',
    reversal_of: charge.body.id,
    request_id: randomUUID(),
  };
  assert.equal((await call('/folios/' + r.body.id, 'POST', reverse, frontdesk)).status, 403);
  const rev = await call('/folios/' + r.body.id, 'POST', reverse);
  assert.equal(rev.status, 201);
  assert.equal(rev.body.net, -50000);
  assert.equal((await call('/folios/' + r.body.id)).body.balance, 0);
  assert.equal(
    (await call('/folios/' + r.body.id, 'POST', { ...reverse, request_id: randomUUID() })).status,
    409,
  );
});
test('weighted metrics reconcile to the posted ledger and exclude taxes/payments', () => {
  const all = metrics(router.db, ['p1', 'p2'], addDays(now, -30), addDays(now, 1), 'owner'),
    one = metrics(router.db, ['p1'], all.from, all.to, 'owner'),
    two = metrics(router.db, ['p2'], all.from, all.to, 'owner');
  assert.equal(all.revenue, one.revenue + two.revenue);
  assert.equal(all.soldNights, one.soldNights + two.soldNights);
  assert.equal(
    all.occupancy,
    ((one.soldNights + two.soldNights) / (one.availableNights + two.availableNights)) * 100,
  );
  const raw = router.db
    .prepare(
      "SELECT SUM(net) AS n FROM folio_entries WHERE property_id IN ('p1','p2') AND business_date>=? AND business_date<?",
    )
    .get(all.from, all.to).n;
  assert.equal(all.revenue, raw);
  assert.equal(all.revpar, all.roomRevenue / all.availableNights);
  assert.ok(all.revenue > 0);
});
test('seed and migrations persist safely across database reopen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hospitality-'));
  try {
    const path = join(dir, 'hub.sqlite');
    let db = openHotelDatabase(path);
    const count = db.prepare('SELECT COUNT(*) AS n FROM reservations').get().n;
    db.close();
    db = openHotelDatabase(path);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM reservations').get().n, count);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get().n, 2);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test('logout invalidates the hotel session', async () => {
  const login = await call(
    '/login',
    'POST',
    { email: 'frontdesk@brainadz.com', password: 'Brainadz@123' },
    null,
  );
  assert.equal((await call('/logout', 'POST', {}, login.cookie)).status, 200);
  assert.equal((await call('/workspace', 'GET', null, login.cookie)).status, 401);
});
test('property and rate configuration require management, and breakfast plans price new bookings', async () => {
  const property = router.db.prepare("SELECT * FROM properties WHERE id='p1'").get();
  const config = { ...property, name: 'Grand Palace Resort', tax_rate: 1200 };
  assert.equal((await call('/properties/p1', 'PATCH', config, frontdesk)).status, 403);
  assert.equal((await call('/properties/p1', 'PATCH', config, manager)).status, 200);
  assert.equal((await call('/properties/p2', 'PATCH', config, manager)).status, 403);
  assert.equal(
    (await call('/room-types/p1t0', 'PATCH', { base_rate: 700000 }, manager)).status,
    200,
  );
  const room = router.db.prepare("SELECT * FROM rooms WHERE id='p1r3'").get();
  const body = {
    ...booking(room, addDays(now, 90), addDays(now, 92)),
    rate_plan_id: 'p1breakfast',
  };
  const result = await call('/reservations', 'POST', body);
  assert.equal(result.status, 201);
  assert.equal(result.body.rate, 784000);
  assert.equal(result.body.rate_plan_id, 'p1breakfast');
  assert.equal(
    (await call('/room-types/p1t0', 'PATCH', { base_rate: 710000 }, manager)).status,
    200,
  );
  assert.equal((await call('/reservations', 'POST', body)).body.rate, 784000);
});
test('migration upgrades an existing v1 hub without changing its agreed room rate', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { readFileSync } = await import('node:fs');
  const dir = mkdtempSync(join(tmpdir(), 'hotel-v1-'));
  const path = join(dir, 'hub.sqlite');
  try {
    let db = new DatabaseSync(path);
    db.exec(readFileSync(new URL('../server/hospitality/schema.sql', import.meta.url), 'utf8'));
    db.prepare(
      'INSERT INTO properties(id,code,name,legal_entity,currency,timezone) VALUES(?,?,?,?,?,?)',
    ).run('old', 'OLD', 'Existing Hotel', 'Existing Ltd', 'INR', 'Asia/Kolkata');
    db.prepare('INSERT INTO room_types(id,property_id,name,base_rate) VALUES(?,?,?,?)').run(
      'oldt',
      'old',
      'Existing King',
      900000,
    );
    db.prepare('INSERT INTO rooms(id,property_id,type_id,number) VALUES(?,?,?,?)').run(
      'oldr',
      'old',
      'oldt',
      '101',
    );
    db.prepare('INSERT INTO guests(id,name) VALUES(?,?)').run('oldg', 'Existing Guest');
    db.prepare(
      'INSERT INTO reservations(id,property_id,guest_id,room_id,type_id,arrival,departure,adults,rate,tax_rate,status,source) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
    ).run(
      'oldstay',
      'old',
      'oldg',
      'oldr',
      'oldt',
      '2027-07-01',
      '2027-07-03',
      1,
      850000,
      1200,
      'Confirmed',
      'Direct',
    );
    db.close();
    db = openHotelDatabase(path, false);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rate_plans').get().n, 2);
    const stay = db.prepare("SELECT * FROM reservations WHERE id='oldstay'").get();
    assert.equal(stay.rate, 850000);
    assert.equal(stay.rate_plan_id, 'oldbar');
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
