import express from 'express';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { openDatabase, hashPassword, dateKey } from './database.js';
const id = () => randomBytes(10).toString('hex');
const safeUser = (u) => ({ id: u.id, employeeId: u.employeeId, email: u.email, role: u.role });
const kinds = [
  'leave',
  'job',
  'candidate',
  'event',
  'expense',
  'goal',
  'asset',
  'journey',
  'announcement',
  'document',
  'course',
  'benefit',
  'learning',
  'enrollment',
  'ticket',
];
const validDate = (v) =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
const clean = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export function createApp({ dbPath = ':memory:', demo = true, secureCookies = false } = {}) {
  const db = openDatabase(dbPath, demo);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', (req, res, next) => {
    req.body ??= {};
    if (
      ['POST', 'PATCH', 'PUT'].includes(req.method) &&
      (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
    )
      return res.status(400).json({ error: 'A JSON request body is required.' });
    next();
  });
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'same-origin');
    res.set('X-Frame-Options', 'DENY');
    if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
      try {
        if (new URL(req.headers.origin).host !== req.headers.host)
          return res.status(403).json({ error: 'Cross-origin request blocked.' });
      } catch {
        return res.status(403).json({ error: 'Invalid origin.' });
      }
    }
    next();
  });
  const sessions = db.prepare(
    "SELECT users.* FROM sessions JOIN users ON users.id=sessions.userId JOIN employees ON employees.id=users.employeeId WHERE sessions.token=? AND sessions.expires>? AND employees.status!='Inactive'",
  );
  app.use('/api', (req, res, next) => {
    const token = (req.headers.cookie || '')
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('brainadz_session='))
      ?.slice(17);
    req.user = token ? sessions.get(token, Date.now()) : null;
    req.token = token;
    next();
  });
  const auth = (req, res, next) =>
    req.user ? next() : res.status(401).json({ error: 'Please sign in to continue.' });
  const manager = (req, res, next) =>
    ['admin', 'hr'].includes(req.user?.role)
      ? next()
      : res.status(403).json({ error: 'This action requires HR or administrator access.' });
  const audit = (u, action) =>
    db.prepare('INSERT INTO audit(actor,action) VALUES(?,?)').run(u.email, action);
  const attempts = new Map();
  app.get('/api/auth/config', (_, res) => res.json({ demo }));
  app.post('/api/auth/login', (req, res) => {
    const key = req.ip;
    const a = attempts.get(key) || { count: 0, until: Date.now() + 900000 };
    if (a.until < Date.now()) {
      a.count = 0;
      a.until = Date.now() + 900000;
    }
    if (a.count >= 20)
      return res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' });
    const u = db
      .prepare('SELECT * FROM users WHERE email=?')
      .get(clean(req.body.email).toLowerCase());
    let valid = false;
    if (u && typeof req.body.password === 'string' && req.body.password.length <= 128) {
      const [salt, hash] = u.hash.split(':');
      valid = timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(req.body.password, salt, 64));
    }
    if (
      u &&
      ((!demo && ['u1', 'u2', 'u3'].includes(u.id)) ||
        db.prepare('SELECT status FROM employees WHERE id=?').get(u.employeeId)?.status ===
          'Inactive')
    )
      valid = false;
    if (!valid) {
      a.count++;
      attempts.set(key, a);
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    attempts.delete(key);
    db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(token, u.id, Date.now() + 8 * 3600000);
    res.cookie('brainadz_session', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: secureCookies,
      maxAge: 8 * 3600000,
      path: '/',
    });
    audit(u, 'Signed in');
    res.json({ user: safeUser(u) });
  });
  app.post('/api/auth/logout', auth, (req, res) => {
    db.prepare('DELETE FROM sessions WHERE token=?').run(req.token);
    res.clearCookie('brainadz_session', { path: '/' });
    res.json({ ok: true });
  });
  app.get('/api/bootstrap', auth, (req, res) => {
    const isManager = req.user.role !== 'employee';
    const employees = db
      .prepare('SELECT * FROM employees ORDER BY id')
      .all()
      .map((e) => {
        if (!isManager && e.id !== req.user.employeeId) {
          const { salary, email, ...publicEmployee } = e;
          return publicEmployee;
        }
        return e;
      });
    let records = db
      .prepare('SELECT * FROM records ORDER BY createdAt DESC,rowid DESC')
      .all()
      .map((r) => ({ ...r, ...JSON.parse(r.data), data: undefined }));
    if (!isManager)
      records = records.filter(
        (r) =>
          ['event', 'announcement', 'document', 'course', 'benefit'].includes(r.kind) ||
          r.employeeId === req.user.employeeId,
      );
    res.json({
      user: safeUser(req.user),
      employees,
      records,
      settings: JSON.parse(db.prepare('SELECT data FROM settings WHERE id=1').get().data),
      accounts:
        req.user.role === 'admin'
          ? db.prepare('SELECT id,employeeId,email,role FROM users ORDER BY email').all()
          : [],
      audit: isManager ? db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 30').all() : [],
      today: dateKey(),
      demo,
    });
  });
  app.post('/api/employees', auth, manager, (req, res) => {
    const b = req.body;
    const name = clean(b.name),
      email = clean(b.email).toLowerCase();
    if (
      !name ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      !['Marketing', 'Exhibits', 'Live'].includes(b.division)
    )
      return res.status(400).json({ error: 'Enter a name, valid email and division.' });
    if (db.prepare('SELECT id FROM employees WHERE email=?').get(email))
      return res.status(409).json({ error: 'An employee with this email already exists.' });
    if (b.joined && !validDate(b.joined))
      return res.status(400).json({ error: 'Choose a valid joining date.' });
    const salary = Number(b.salary || 0);
    if (!Number.isFinite(salary) || salary < 0)
      return res.status(400).json({ error: 'Salary must be a positive number.' });
    const empId =
      'BA' +
      String(
        (db.prepare('SELECT MAX(CAST(SUBSTR(id,3) AS INTEGER)) AS n FROM employees').get().n || 0) +
          1,
      ).padStart(3, '0');
    db.prepare('INSERT INTO employees VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(
      empId,
      name,
      email,
      clean(b.title),
      b.division,
      clean(b.department),
      clean(b.location),
      'Full-time',
      clean(b.joined) || dateKey(),
      salary,
      clean(b.manager),
      'Active',
    );
    audit(req.user, `Added employee ${name}`);
    res.status(201).json({ id: empId });
  });
  app.patch('/api/employees/:id', auth, manager, (req, res) => {
    const e = db.prepare('SELECT * FROM employees WHERE id=?').get(req.params.id);
    if (!e) return res.status(404).json({ error: 'Employee not found.' });
    const fields = [
      'name',
      'email',
      'title',
      'division',
      'department',
      'location',
      'joined',
      'salary',
      'manager',
    ];
    const updated = { ...e };
    for (const field of fields)
      if (req.body[field] !== undefined)
        updated[field] = field === 'salary' ? Number(req.body[field]) : clean(req.body[field]);
    updated.email = updated.email.toLowerCase();
    if (
      !updated.name ||
      !/^\S+@\S+\.\S+$/.test(updated.email) ||
      !['Marketing', 'Exhibits', 'Live'].includes(updated.division) ||
      !validDate(updated.joined) ||
      !Number.isFinite(updated.salary) ||
      updated.salary < 0
    )
      return res
        .status(400)
        .json({ error: 'Enter valid employee details, joining date and salary.' });
    if (db.prepare('SELECT id FROM employees WHERE email=? AND id!=?').get(updated.email, e.id))
      return res.status(409).json({ error: 'An employee with this email already exists.' });
    const status = req.body.status === undefined ? e.status : clean(req.body.status);
    if (!['Active', 'On leave', 'Inactive'].includes(status))
      return res.status(400).json({ error: 'Invalid employee status.' });
    if (status === 'Inactive') {
      if (e.id === req.user.employeeId)
        return res.status(400).json({ error: 'You cannot deactivate your own employee record.' });
      if (
        req.user.role !== 'admin' &&
        db.prepare("SELECT id FROM users WHERE employeeId=? AND role='admin'").get(e.id)
      )
        return res
          .status(403)
          .json({ error: 'Only an administrator can deactivate another administrator.' });
      db.prepare(
        'DELETE FROM sessions WHERE userId IN (SELECT id FROM users WHERE employeeId=?)',
      ).run(e.id);
    }
    db.prepare(
      'UPDATE employees SET name=?,email=?,title=?,division=?,department=?,location=?,joined=?,salary=?,manager=?,status=? WHERE id=?',
    ).run(...fields.map((f) => updated[f]), status, e.id);
    audit(req.user, `Updated employee ${e.name} (${status})`);
    res.json({ ok: true });
  });
  app.post('/api/accounts', auth, (req, res) => {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Only administrators can manage account access.' });
    const b = req.body,
      email = clean(b.email).toLowerCase();
    if (
      !db.prepare('SELECT id FROM employees WHERE id=?').get(clean(b.employeeId)) ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      !['admin', 'hr', 'employee'].includes(b.role) ||
      typeof b.password !== 'string' ||
      b.password.length < 12 ||
      b.password.length > 128
    )
      return res
        .status(400)
        .json({ error: 'Select an employee, valid email, role and a 12–128 character password.' });
    if (db.prepare('SELECT id FROM users WHERE email=?').get(email))
      return res.status(409).json({ error: 'An account with this email already exists.' });
    db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(
      id(),
      b.employeeId,
      email,
      hashPassword(b.password),
      b.role,
    );
    audit(req.user, 'Created account ' + email);
    res.status(201).json({ ok: true });
  });
  app.patch('/api/accounts/:id', auth, (req, res) => {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Only administrators can change access roles.' });
    if (req.params.id === req.user.id)
      return res.status(400).json({ error: 'You cannot change your own administrator role.' });
    if (!['admin', 'hr', 'employee'].includes(req.body.role))
      return res.status(400).json({ error: 'Invalid account role.' });
    const account = db.prepare('SELECT id,email FROM users WHERE id=?').get(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found.' });
    db.prepare('UPDATE users SET role=? WHERE id=?').run(req.body.role, account.id);
    db.prepare('DELETE FROM sessions WHERE userId=?').run(account.id);
    audit(req.user, 'Updated account access for ' + account.email);
    res.json({ ok: true });
  });
  app.post('/api/attendance', auth, (req, res) => {
    const today = dateKey();
    const current = db
      .prepare(
        "SELECT * FROM records WHERE kind='attendance' AND employeeId=? AND json_extract(data,'$.date')=?",
      )
      .get(req.user.employeeId, today);
    const time = new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
    });
    if (current) {
      const data = JSON.parse(current.data);
      if (data.checkOut)
        return res.status(409).json({ error: 'You have already checked out today.' });
      data.checkOut = time;
      db.prepare('UPDATE records SET data=? WHERE id=?').run(JSON.stringify(data), current.id);
      audit(req.user, 'Checked out');
      res.json({ message: 'Checked out. Have a lovely evening!' });
    } else {
      db.prepare('INSERT INTO records(id,kind,employeeId,data) VALUES(?,?,?,?)').run(
        id(),
        'attendance',
        req.user.employeeId,
        JSON.stringify({ date: today, checkIn: time, checkOut: null, status: 'Present' }),
      );
      audit(req.user, 'Checked in');
      res.status(201).json({ message: 'You’re checked in. Let’s make today count!' });
    }
  });
  app.post('/api/records/:kind', auth, (req, res) => {
    const kind = req.params.kind,
      b = req.body,
      isManager = req.user.role !== 'employee';
    if (!kinds.includes(kind)) return res.status(404).json({ error: 'Unknown module.' });
    if (
      !isManager &&
      !['leave', 'expense', 'goal', 'learning', 'enrollment', 'ticket'].includes(kind)
    )
      return res.status(403).json({ error: 'This action requires HR access.' });
    const employeeId =
      kind === 'leave' ||
      kind === 'expense' ||
      kind === 'goal' ||
      kind === 'asset' ||
      kind === 'journey' ||
      ['learning', 'enrollment', 'ticket'].includes(kind)
        ? isManager && b.employeeId
          ? clean(b.employeeId)
          : req.user.employeeId
        : null;
    if (employeeId && !db.prepare('SELECT id FROM employees WHERE id=?').get(employeeId))
      return res.status(400).json({ error: 'Select a valid employee.' });
    let data;
    if (kind === 'learning' || kind === 'enrollment') {
      const catalogueKind = kind === 'learning' ? 'course' : 'benefit';
      const parent = db
        .prepare('SELECT * FROM records WHERE id=? AND kind=?')
        .get(clean(b.catalogueId), catalogueKind);
      if (!parent)
        return res.status(400).json({ error: 'Choose an available ' + catalogueKind + '.' });
      if (
        db
          .prepare(
            "SELECT id FROM records WHERE kind=? AND employeeId=? AND json_extract(data,'$.catalogueId')=?",
          )
          .get(kind, employeeId, parent.id)
      )
        return res.status(409).json({ error: 'You have already submitted this request.' });
      data = {
        catalogueId: parent.id,
        title: JSON.parse(parent.data).title,
        status: kind === 'learning' ? 'In progress' : 'Pending',
        date: dateKey(),
      };
    } else if (kind === 'ticket') {
      if (!clean(b.title) || !clean(b.description))
        return res.status(400).json({ error: 'Enter a subject and describe how we can help.' });
      data = {
        title: clean(b.title),
        description: clean(b.description, 5000),
        category: clean(b.category),
        priority: clean(b.priority) || 'Normal',
        status: 'Open',
        date: dateKey(),
        response: '',
      };
    } else if (kind === 'course') {
      if (!clean(b.title) || !clean(b.content))
        return res.status(400).json({ error: 'Enter a course title and learning material.' });
      data = {
        title: clean(b.title),
        content: clean(b.content, 50000),
        description: clean(b.description, 2000),
        duration: clean(b.duration) || 'Self-paced',
        division: clean(b.division) || 'All divisions',
        category: 'Self-paced learning',
      };
    } else if (kind === 'benefit') {
      if (!clean(b.title) || !clean(b.description))
        return res.status(400).json({ error: 'Enter a benefit title and description.' });
      data = {
        title: clean(b.title),
        description: clean(b.description, 5000),
        subtitle: clean(b.subtitle),
        category: clean(b.category) || 'Employee benefit',
      };
    } else if (kind === 'leave') {
      if (
        ![
          'Annual leave',
          'Sick leave',
          'Personal leave',
          'Parental leave',
          'Unpaid leave',
        ].includes(b.type) ||
        !validDate(b.start) ||
        !validDate(b.end) ||
        b.start > b.end ||
        !clean(b.reason)
      )
        return res.status(400).json({ error: 'Choose a leave type, valid date range and reason.' });
      const overlap = db
        .prepare(
          "SELECT id FROM records WHERE kind='leave' AND employeeId=? AND json_extract(data,'$.status')!='Rejected' AND json_extract(data,'$.start')<=? AND json_extract(data,'$.end')>=?",
        )
        .get(employeeId, b.end, b.start);
      if (overlap)
        return res.status(409).json({ error: 'These dates overlap an existing leave request.' });
      data = {
        type: b.type,
        start: b.start,
        end: b.end,
        reason: clean(b.reason, 2000),
        status: 'Pending',
      };
    } else if (kind === 'expense') {
      if (!clean(b.title) || !Number.isFinite(Number(b.amount)) || Number(b.amount) <= 0)
        return res
          .status(400)
          .json({ error: 'Enter a description and an amount greater than zero.' });
      data = {
        title: clean(b.title),
        category: clean(b.category),
        amount: Number(b.amount),
        date: dateKey(),
        status: 'Pending',
      };
    } else if (kind === 'goal') {
      if (!clean(b.title)) return res.status(400).json({ error: 'Enter a goal title.' });
      data = {
        title: clean(b.title),
        progress: 0,
        cycle: clean(b.cycle) || 'Q4 2026',
        status: 'On track',
      };
    } else if (kind === 'job') {
      if (!clean(b.title) || !['Marketing', 'Exhibits', 'Live'].includes(b.division))
        return res.status(400).json({ error: 'Enter a job title and division.' });
      data = {
        title: clean(b.title),
        division: b.division,
        location: clean(b.location),
        department: clean(b.department),
        applicants: 0,
        status: 'Open',
        employment: 'Full-time',
      };
    } else if (kind === 'candidate') {
      if (!clean(b.name) || !clean(b.position) || !/^\S+@\S+\.\S+$/.test(b.email))
        return res.status(400).json({ error: 'Enter a name, position and valid email.' });
      data = {
        name: clean(b.name),
        email: clean(b.email),
        position: clean(b.position),
        division: clean(b.division),
        stage: 'Applied',
      };
    } else if (kind === 'event') {
      if (!clean(b.title) || !validDate(b.date))
        return res.status(400).json({ error: 'Enter an event name and date.' });
      data = {
        title: clean(b.title),
        date: b.date,
        time: clean(b.time) || '10:00',
        division: clean(b.division) || 'All divisions',
        type: clean(b.type) || 'Team event',
      };
    } else if (kind === 'announcement') {
      if (!clean(b.title) || !clean(b.body))
        return res.status(400).json({ error: 'Enter a title and message.' });
      data = {
        title: clean(b.title),
        body: clean(b.body, 5000),
        author: 'People & Culture',
        tag: clean(b.tag) || 'Company update',
        date: dateKey(),
      };
    } else if (kind === 'document') {
      if (!clean(b.title) || !clean(b.content))
        return res.status(400).json({ error: 'Enter a document title and content.' });
      data = {
        title: clean(b.title),
        content: clean(b.content, 50000),
        category: clean(b.category) || 'General',
        version: '1.0',
        date: dateKey(),
      };
    } else if (kind === 'asset') {
      if (!clean(b.name) || !clean(b.serial))
        return res.status(400).json({ error: 'Enter asset name and serial number.' });
      data = {
        name: clean(b.name),
        serial: clean(b.serial),
        category: clean(b.category),
        status: 'Assigned',
      };
    } else if (kind === 'journey') {
      if (!clean(b.title)) return res.status(400).json({ error: 'Enter a journey title.' });
      const leaving = b.type === 'Offboarding';
      data = {
        title: clean(b.title),
        type: leaving ? 'Offboarding' : 'Onboarding',
        progress: 0,
        tasks: (leaving
          ? [
              'Confirm last working day',
              'Complete knowledge transfer',
              'Return equipment',
              'Revoke system access',
              'Complete exit interview',
            ]
          : [
              'Complete personal details',
              'Submit identity documents',
              'Collect equipment',
              'Meet your team',
              'Complete policy orientation',
            ]
        ).map((title) => ({ title, done: false })),
      };
    }
    const recordId = id();
    db.prepare('INSERT INTO records(id,kind,employeeId,data) VALUES(?,?,?,?)').run(
      recordId,
      kind,
      employeeId,
      JSON.stringify(data),
    );
    audit(req.user, `Created ${kind}: ${data.title || data.name || employeeId}`);
    res.status(201).json({ id: recordId });
  });
  app.patch('/api/records/:id', auth, (req, res) => {
    const record = db.prepare('SELECT * FROM records WHERE id=?').get(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    const isManager = req.user.role !== 'employee',
      data = JSON.parse(record.data),
      b = req.body;
    if (
      !isManager &&
      !(
        record.employeeId === req.user.employeeId &&
        ['goal', 'journey', 'learning'].includes(record.kind)
      )
    )
      return res.status(403).json({ error: 'This action requires HR access.' });
    if (['leave', 'expense', 'enrollment'].includes(record.kind)) {
      if (!['Approved', 'Rejected'].includes(b.status) || data.status !== 'Pending')
        return res
          .status(400)
          .json({ error: 'Only pending requests can be approved or rejected.' });
      data.status = b.status;
      data.reviewedBy = req.user.email;
    } else if (record.kind === 'learning') {
      if (b.status !== 'Completed')
        return res.status(400).json({ error: 'Invalid course status.' });
      data.status = 'Completed';
      data.completedAt = dateKey();
    } else if (record.kind === 'ticket') {
      if (!['Open', 'In progress', 'Resolved'].includes(b.status))
        return res.status(400).json({ error: 'Invalid ticket status.' });
      if (b.status === 'Resolved' && !clean(b.response))
        return res.status(400).json({ error: 'Add a response before resolving a request.' });
      data.status = b.status;
      data.response = clean(b.response, 5000);
    } else if (record.kind === 'candidate') {
      if (!['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'].includes(b.stage))
        return res.status(400).json({ error: 'Invalid hiring stage.' });
      data.stage = b.stage;
    } else if (record.kind === 'job') {
      if (!['Open', 'Closed'].includes(b.status))
        return res.status(400).json({ error: 'Invalid job status.' });
      data.status = b.status;
    } else if (record.kind === 'goal') {
      const n = Number(b.progress);
      if (!Number.isFinite(n) || n < 0 || n > 100)
        return res.status(400).json({ error: 'Progress must be between 0 and 100.' });
      data.progress = n;
      data.status = n === 100 ? 'Completed' : 'On track';
    } else if (record.kind === 'journey') {
      const i = Number(b.task);
      if (!Number.isInteger(i) || !data.tasks[i])
        return res.status(400).json({ error: 'Task not found.' });
      data.tasks[i].done = !data.tasks[i].done;
      data.progress = Math.round(
        (data.tasks.filter((t) => t.done).length / data.tasks.length) * 100,
      );
    } else if (record.kind === 'asset') {
      if (!['Assigned', 'Returned', 'Maintenance'].includes(b.status))
        return res.status(400).json({ error: 'Invalid asset status.' });
      data.status = b.status;
    } else return res.status(400).json({ error: 'This record cannot be updated here.' });
    db.prepare('UPDATE records SET data=? WHERE id=?').run(JSON.stringify(data), record.id);
    audit(req.user, `Updated ${record.kind}: ${data.title || data.name || record.employeeId}`);
    res.json({ ok: true });
  });
  app.post('/api/payroll', auth, manager, (req, res) => {
    const month = clean(req.body.month);
    if (!/^\d{4}-\d{2}$/.test(month))
      return res.status(400).json({ error: 'Choose a valid payroll month.' });
    if (
      db
        .prepare("SELECT id FROM records WHERE kind='payroll' AND json_extract(data,'$.month')=?")
        .get(month)
    )
      return res.status(409).json({ error: 'Payroll records already exist for this month.' });
    db.exec('BEGIN');
    try {
      for (const e of db.prepare("SELECT * FROM employees WHERE status!='Inactive'").all()) {
        const deductions = Math.round(e.salary * 0.12),
          data = {
            month,
            gross: e.salary,
            deductions,
            net: e.salary - deductions,
            status: 'Generated',
            note: 'Illustrative deductions. Not statutory payroll or a bank payment.',
          };
        db.prepare('INSERT INTO records(id,kind,employeeId,data) VALUES(?,?,?,?)').run(
          id(),
          'payroll',
          e.id,
          JSON.stringify(data),
        );
      }
      audit(req.user, `Generated illustrative payroll for ${month}`);
      db.exec('COMMIT');
      res.status(201).json({ ok: true });
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  });
  app.get('/api/payslips/:id', auth, (req, res) => {
    const r = db.prepare("SELECT * FROM records WHERE id=? AND kind='payroll'").get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Payslip not found.' });
    if (req.user.role === 'employee' && r.employeeId !== req.user.employeeId)
      return res.status(403).json({ error: 'Access denied.' });
    const e = db.prepare('SELECT * FROM employees WHERE id=?').get(r.employeeId),
      d = JSON.parse(r.data);
    res.set(
      'Content-Disposition',
      `attachment; filename="BrainADZ-payslip-${e.id}-${d.month}.txt"`,
    );
    res
      .type('text')
      .send(
        `BRAINADZ PEOPLE — ILLUSTRATIVE PAYSLIP\n\nEmployee: ${e.name} (${e.id})\nDivision: ${e.division}\nPeriod: ${d.month}\nGross: INR ${d.gross}\nIllustrative deductions: INR ${d.deductions}\nNet: INR ${d.net}\n\nDemonstration record. Not proof of payment. Deductions are not statutory calculations.`,
      );
  });
  app.get('/api/documents/:id', auth, (req, res) => {
    const r = db.prepare("SELECT * FROM records WHERE id=? AND kind='document'").get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Document not found.' });
    const d = JSON.parse(r.data);
    res.set('Content-Disposition', `attachment; filename="BrainADZ-document-${r.id}.txt"`);
    res
      .type('text')
      .send(
        `BRAINADZ PEOPLE\n${d.title}\nVersion ${d.version}\n\n${d.content}\n\nSample workspace policy. Verify approved company policies before use.`,
      );
  });
  app.patch('/api/settings', auth, manager, (req, res) => {
    const current = JSON.parse(db.prepare('SELECT data FROM settings WHERE id=1').get().data);
    const company = clean(req.body.company);
    if (!company) return res.status(400).json({ error: 'Company name is required.' });
    const days = Number(req.body.leaveDays);
    if (!Number.isInteger(days) || days < 0 || days > 365)
      return res.status(400).json({ error: 'Annual leave must be between 0 and 365 days.' });
    const data = { ...current, company, leaveDays: days };
    db.prepare('UPDATE settings SET data=? WHERE id=1').run(JSON.stringify(data));
    audit(req.user, 'Updated workspace settings');
    res.json({ ok: true });
  });
  app.post('/api/auth/password', auth, (req, res) => {
    const { currentPassword, password } = req.body;
    if (typeof password !== 'string' || password.length < 12 || password.length > 128)
      return res.status(400).json({ error: 'Use a password between 12 and 128 characters.' });
    const [salt, hash] = req.user.hash.split(':');
    if (
      typeof currentPassword !== 'string' ||
      !timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(currentPassword, salt, 64))
    )
      return res.status(400).json({ error: 'Current password is incorrect.' });
    db.prepare('UPDATE users SET hash=? WHERE id=?').run(hashPassword(password), req.user.id);
    db.prepare('DELETE FROM sessions WHERE userId=? AND token!=?').run(req.user.id, req.token);
    audit(req.user, 'Changed password');
    res.json({ ok: true });
  });
  app.use('/api', (_, res) => res.status(404).json({ error: 'API endpoint not found.' }));
  app.use((err, req, res, next) => {
    console.error(err.message);
    res.status(err.status || 500).json({
      error: err.status === 400 ? 'Invalid request.' : 'Something went wrong. Please try again.',
    });
  });
  app.locals.db = db;
  return app;
}
