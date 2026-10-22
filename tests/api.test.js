import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
let app, server, base, admin, employee;
const call = async (path, method = 'GET', body, cookie) => {
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
};
before(async () => {
  app = createApp();
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = 'http://127.0.0.1:' + server.address().port;
  admin = (
    await call('/api/auth/login', 'POST', { email: 'admin@brainadz.com', password: 'Brainadz@123' })
  ).cookie;
  employee = (
    await call('/api/auth/login', 'POST', {
      email: 'employee@brainadz.com',
      password: 'Brainadz@123',
    })
  ).cookie;
});
after(() => {
  server.close();
  app.locals.db.close();
});
test('requires authentication and rejects invalid credentials', async () => {
  assert.equal((await call('/api/bootstrap')).status, 401);
  assert.equal(
    (await call('/api/auth/login', 'POST', { email: 'admin@brainadz.com', password: 'incorrect' }))
      .status,
    401,
  );
});
test('bootstrap seeds actual workflow records and keeps other salaries private', async () => {
  const a = await call('/api/bootstrap', 'GET', null, admin),
    e = await call('/api/bootstrap', 'GET', null, employee);
  assert.equal(a.status, 200);
  assert.equal(a.body.employees.length, 12);
  assert.ok(a.body.records.some((r) => r.kind === 'leave'));
  assert.equal(e.body.employees.find((e) => e.id === 'BA003').salary, undefined);
  assert.ok(!e.body.records.some((r) => r.kind === 'expense' && r.employeeId !== 'BA002'));
  assert.equal(e.body.audit.length, 0);
});
test('employee cannot approve, hire or edit settings', async () => {
  assert.equal(
    (await call('/api/records/lv1', 'PATCH', { status: 'Approved' }, employee)).status,
    403,
  );
  assert.equal((await call('/api/employees', 'POST', {}, employee)).status, 403);
  assert.equal(
    (await call('/api/records/job', 'POST', { title: 'Forbidden' }, employee)).status,
    403,
  );
  assert.equal(
    (await call('/api/settings', 'PATCH', { company: 'Forbidden', leaveDays: 20 }, employee))
      .status,
    403,
  );
});
test('leave submission is scoped to employee, checks overlaps, and supports HR review', async () => {
  const body = {
    type: 'Annual leave',
    employeeId: 'BA003',
    start: '2027-06-01',
    end: '2027-06-02',
    reason: 'Family visit',
  };
  const r = await call('/api/records/leave', 'POST', body, employee);
  assert.equal(r.status, 201);
  let state = (await call('/api/bootstrap', 'GET', null, employee)).body;
  const leave = state.records.find((x) => x.id === r.body.id);
  assert.equal(leave.employeeId, 'BA002');
  assert.equal(leave.status, 'Pending');
  assert.equal((await call('/api/records/leave', 'POST', body, employee)).status, 409);
  assert.equal(
    (await call('/api/records/' + r.body.id, 'PATCH', { status: 'Approved' }, admin)).status,
    200,
  );
  assert.equal(
    (await call('/api/records/' + r.body.id, 'PATCH', { status: 'Rejected' }, admin)).status,
    400,
  );
  state = (await call('/api/bootstrap', 'GET', null, employee)).body;
  assert.equal(state.records.find((x) => x.id === r.body.id).status, 'Approved');
});
test('employee creation validates duplicates and persists the full record', async () => {
  const body = {
    name: 'New Colleague',
    email: 'new@example.com',
    title: 'Designer',
    division: 'Marketing',
    department: 'Creative',
    location: 'Mumbai',
    salary: 50000,
    joined: '2026-11-01',
    manager: 'Rohan Mehta',
  };
  const r = await call('/api/employees', 'POST', body, admin);
  assert.equal(r.status, 201);
  assert.equal((await call('/api/employees', 'POST', body, admin)).status, 409);
  const state = (await call('/api/bootstrap', 'GET', null, admin)).body;
  assert.equal(state.employees.find((e) => e.id === r.body.id).salary, 50000);
});
test('payroll creates real payslip downloads and prevents duplicate runs or unauthorized reads', async () => {
  assert.equal((await call('/api/payroll', 'POST', { month: '2026-10' }, employee)).status, 403);
  assert.equal((await call('/api/payroll', 'POST', { month: '2026-10' }, admin)).status, 201);
  assert.equal((await call('/api/payroll', 'POST', { month: '2026-10' }, admin)).status, 409);
  const records = (await call('/api/bootstrap', 'GET', null, admin)).body.records;
  const own = records.find((r) => r.kind === 'payroll' && r.employeeId === 'BA002');
  const other = records.find((r) => r.kind === 'payroll' && r.employeeId === 'BA003');
  assert.equal((await call('/api/payslips/' + own.id, 'GET', null, employee)).status, 200);
  assert.match(
    (await call('/api/payslips/' + own.id, 'GET', null, employee)).body,
    /ILLUSTRATIVE PAYSLIP/,
  );
  assert.equal((await call('/api/payslips/' + other.id, 'GET', null, employee)).status, 403);
});
test('check-out updates once and rejects duplicate check-outs', async () => {
  const first = await call('/api/attendance', 'POST', {}, employee);
  assert.equal(first.status, 200);
  assert.equal((await call('/api/attendance', 'POST', {}, employee)).status, 409);
});
test('expense validation rejects invalid amounts and document downloads work', async () => {
  assert.equal(
    (await call('/api/records/expense', 'POST', { title: 'Bad expense', amount: -100 }, employee))
      .status,
    400,
  );
  assert.equal(
    (
      await call(
        '/api/records/expense',
        'POST',
        { title: 'Travel', amount: 800, category: 'Travel' },
        employee,
      )
    ).status,
    201,
  );
  const d = await call('/api/documents/d1', 'GET', null, employee);
  assert.equal(d.status, 200);
  assert.match(d.body, /Employee handbook/);
});
test('journey task state and goal progress are persisted', async () => {
  assert.equal((await call('/api/records/ob1', 'PATCH', { task: 2 }, admin)).status, 200);
  assert.equal((await call('/api/records/pf1', 'PATCH', { progress: 100 }, employee)).status, 200);
  assert.equal((await call('/api/records/pf2', 'PATCH', { progress: 100 }, employee)).status, 403);
  const state = (await call('/api/bootstrap', 'GET', null, admin)).body;
  assert.equal(state.records.find((r) => r.id === 'ob1').progress, 60);
  assert.equal(state.records.find((r) => r.id === 'pf1').status, 'Completed');
});
test('logout revokes the session on the server', async () => {
  const r = await call('/api/auth/login', 'POST', {
    email: 'hr@brainadz.com',
    password: 'Brainadz@123',
  });
  assert.equal((await call('/api/auth/logout', 'POST', undefined, r.cookie)).status, 200);
  assert.equal((await call('/api/bootstrap', 'GET', null, r.cookie)).status, 401);
});
test('invalid calendar dates and oversized goal progress are rejected', async () => {
  assert.equal(
    (
      await call(
        '/api/records/leave',
        'POST',
        { type: 'Annual leave', start: '2027-02-30', end: '2027-03-01', reason: 'Invalid' },
        employee,
      )
    ).status,
    400,
  );
  assert.equal((await call('/api/records/pf1', 'PATCH', { progress: 101 }, employee)).status, 400);
});
test('learning enrollment is unique, completion is scoped, and benefits need HR review', async () => {
  const r = await call('/api/records/learning', 'POST', { catalogueId: 'course1' }, employee);
  assert.equal(r.status, 201);
  assert.equal(
    (await call('/api/records/learning', 'POST', { catalogueId: 'course1' }, employee)).status,
    409,
  );
  assert.equal(
    (await call('/api/records/' + r.body.id, 'PATCH', { status: 'Completed' }, employee)).status,
    200,
  );
  const b = await call('/api/records/enrollment', 'POST', { catalogueId: 'benefit1' }, employee);
  assert.equal(b.status, 201);
  assert.equal(
    (await call('/api/records/' + b.body.id, 'PATCH', { status: 'Approved' }, employee)).status,
    403,
  );
  assert.equal(
    (await call('/api/records/' + b.body.id, 'PATCH', { status: 'Approved' }, admin)).status,
    200,
  );
});
test('helpdesk protects other employees and stores HR responses', async () => {
  const r = await call(
    '/api/records/ticket',
    'POST',
    {
      title: 'Question about leave',
      description: 'How do I carry over leave?',
      category: 'Leave & attendance',
    },
    employee,
  );
  assert.equal(r.status, 201);
  assert.equal(
    (
      await call(
        '/api/records/' + r.body.id,
        'PATCH',
        { status: 'Resolved', response: 'Ask HR for local policy.' },
        employee,
      )
    ).status,
    403,
  );
  assert.equal(
    (await call('/api/records/' + r.body.id, 'PATCH', { status: 'Resolved' }, admin)).status,
    400,
  );
  assert.equal(
    (
      await call(
        '/api/records/' + r.body.id,
        'PATCH',
        { status: 'Resolved', response: 'Please see the local leave policy.' },
        admin,
      )
    ).status,
    200,
  );
  const state = (await call('/api/bootstrap', 'GET', null, employee)).body;
  assert.equal(
    state.records.find((t) => t.id === r.body.id).response,
    'Please see the local leave policy.',
  );
});
test('only administrators create accounts and an added employee can log in', async () => {
  const b = {
    employeeId: 'BA003',
    email: 'new-login@example.com',
    password: 'Unique-Test-Password-123',
    role: 'employee',
  };
  assert.equal((await call('/api/accounts', 'POST', b, employee)).status, 403);
  assert.equal((await call('/api/accounts', 'POST', b, admin)).status, 201);
  const login = await call('/api/auth/login', 'POST', { email: b.email, password: b.password });
  assert.equal(login.status, 200);
  const state = (await call('/api/bootstrap', 'GET', null, login.cookie)).body;
  assert.equal(state.user.employeeId, 'BA003');
  assert.equal(state.user.role, 'employee');
  assert.equal(state.accounts.length, 0);
  const account = (await call('/api/bootstrap', 'GET', null, admin)).body.accounts.find(
    (a) => a.email === b.email,
  );
  assert.equal(
    (await call('/api/accounts/' + account.id, 'PATCH', { role: 'hr' }, admin)).status,
    200,
  );
  assert.equal((await call('/api/bootstrap', 'GET', null, login.cookie)).status, 401);
});
test('deactivating an employee revokes access and blocks new logins', async () => {
  const signed = await call('/api/auth/login', 'POST', {
    email: 'employee@brainadz.com',
    password: 'Brainadz@123',
  });
  assert.equal(signed.status, 200);
  assert.equal(
    (await call('/api/employees/BA002', 'PATCH', { status: 'Inactive' }, admin)).status,
    200,
  );
  assert.equal((await call('/api/bootstrap', 'GET', null, signed.cookie)).status, 401);
  assert.equal(
    (
      await call('/api/auth/login', 'POST', {
        email: 'employee@brainadz.com',
        password: 'Brainadz@123',
      })
    ).status,
    401,
  );
  assert.equal(
    (await call('/api/employees/BA002', 'PATCH', { status: 'Active' }, admin)).status,
    200,
  );
});

test('employee details can be edited by HR and remain protected from employee changes', async () => {
  assert.equal(
    (
      await call(
        '/api/employees/BA003',
        'PATCH',
        { title: 'Lead Exhibition Designer', salary: 90000 },
        admin,
      )
    ).status,
    200,
  );
  const state = (await call('/api/bootstrap', 'GET', null, admin)).body;
  assert.equal(state.employees.find((e) => e.id === 'BA003').title, 'Lead Exhibition Designer');
  assert.equal(state.employees.find((e) => e.id === 'BA003').salary, 90000);
  const login = await call('/api/auth/login', 'POST', {
    email: 'employee@brainadz.com',
    password: 'Brainadz@123',
  });
  assert.equal(
    (await call('/api/employees/BA003', 'PATCH', { salary: 100 }, login.cookie)).status,
    403,
  );
});
