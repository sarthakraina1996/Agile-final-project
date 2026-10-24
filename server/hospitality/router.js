import express from 'express';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { openHotelDatabase } from './database.js';
import {
  today,
  addDays,
  validDate,
  nights,
  text,
  problem,
  transaction,
  audit,
  uid,
  financialRoles,
  deskRoles,
} from './utils.js';
import {
  scope,
  createReservation,
  updateReservation,
  checkIn,
  checkOut,
  getReservation,
} from './reservations.js';
import { postFolio, getFolio } from './folios.js';
import { metrics } from './metrics.js';
export function createHotelRouter({
  dbPath = ':memory:',
  demo = true,
  secureCookies = false,
} = {}) {
  const db = openHotelDatabase(dbPath, demo),
    router = express.Router();
  router.db = db;
  router.use(express.json({ limit: '1mb' }));
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    req.body ??= {};
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
      try {
        if (new URL(req.headers.origin).host !== req.headers.host)
          problem('Cross-origin request blocked.', 403);
      } catch (e) {
        return res.status(403).json({ error: 'Cross-origin request blocked.' });
      }
    }
    const token = (req.headers.cookie || '')
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('hospitality_session='))
      ?.slice(20);
    req.hotelToken = token;
    req.hotelUser = token
      ? db
          .prepare(
            'SELECT u.* FROM hotel_sessions s JOIN hotel_users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?',
          )
          .get(token, Date.now())
      : null;
    next();
  });
  const auth = (req, res, next) =>
    req.hotelUser ? next() : res.status(401).json({ error: 'Sign in to Hospitality OS.' });
  const allow = (roles) => (req, res, next) =>
    roles.includes(req.hotelUser.role)
      ? next()
      : res.status(403).json({ error: 'Your role does not have permission for this action.' });
  const limits = new Map();
  router.get('/health', (_, res) =>
    res.json({
      ok: db.prepare('SELECT 1 AS ok').get().ok === 1,
      demo,
      product: 'BrainADZ Hospitality OS',
    }),
  );
  router.post('/login', (req, res) => {
    const key = req.ip,
      attempt = limits.get(key) || { count: 0, until: Date.now() + 900000 };
    if (attempt.until < Date.now()) {
      attempt.count = 0;
      attempt.until = Date.now() + 900000;
    }
    if (attempt.count >= 20) problem('Too many attempts. Try again in 15 minutes.', 429);
    const u = db
      .prepare('SELECT * FROM hotel_users WHERE email=?')
      .get(text(req.body.email).toLowerCase());
    let valid = false;
    if (u && demo && typeof req.body.password === 'string' && req.body.password.length <= 128) {
      const [salt, hash] = u.hash.split(':');
      valid = timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(req.body.password, salt, 64));
    }
    if (!valid) {
      attempt.count++;
      limits.set(key, attempt);
      problem('Email or password is incorrect.', 401);
    }
    limits.delete(key);
    const token = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM hotel_sessions WHERE expires<?').run(Date.now());
    db.prepare('INSERT INTO hotel_sessions VALUES(?,?,?)').run(
      token,
      u.id,
      Date.now() + 8 * 3600000,
    );
    res.cookie('hospitality_session', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: secureCookies,
      maxAge: 8 * 3600000,
      path: '/',
    });
    res.json({ ok: true });
  });
  router.post('/logout', auth, (req, res) => {
    db.prepare('DELETE FROM hotel_sessions WHERE token=?').run(req.hotelToken);
    res.clearCookie('hospitality_session', { path: '/' });
    res.json({ ok: true });
  });
  router.get('/workspace', auth, (req, res) => {
    const u = req.hotelUser,
      access = JSON.parse(u.property_ids),
      selected =
        req.query.property && req.query.property !== 'all' ? String(req.query.property) : null;
    if (selected) scope(u, selected);
    const ids = selected ? [selected] : access,
      json = JSON.stringify(ids),
      now = today();
    const from = String(req.query.from || now.slice(0, 7) + '-01'),
      to = String(req.query.to || addDays(now, 1));
    if (!validDate(from) || !validDate(to) || nights(from, to) < 1 || nights(from, to) > 366)
      problem('Select a reporting period between 1 and 366 days.');
    const properties = db
      .prepare('SELECT * FROM properties WHERE id IN (SELECT value FROM json_each(?))')
      .all(JSON.stringify(access));
    const rooms = db
      .prepare(
        "SELECT r.*,t.name AS type_name,t.base_rate,t.area,t.bed,t.adults,t.children,t.amenities,b.name AS building,f.name AS floor,p.name AS property_name,(SELECT id FROM reservations x WHERE x.room_id=r.id AND x.status='In house' LIMIT 1) AS occupied_by FROM rooms r JOIN room_types t ON t.id=r.type_id JOIN properties p ON p.id=r.property_id LEFT JOIN buildings b ON b.id=r.building_id LEFT JOIN floors f ON f.id=r.floor_id WHERE r.property_id IN (SELECT value FROM json_each(?)) ORDER BY r.property_id,r.number",
      )
      .all(json);
    const requestedStart = validDate(req.query.calendar_from)
        ? req.query.calendar_from
        : addDays(now, -7),
      requestedEnd = validDate(req.query.calendar_to) ? req.query.calendar_to : addDays(now, 35);
    const calendarStart = from < requestedStart ? from : requestedStart,
      calendarEnd = to > requestedEnd ? to : requestedEnd;
    const reservations = db
      .prepare(
        "SELECT r.*,g.name AS guest_name,g.email AS guest_email,g.vip,m.number AS room_number,t.name AS type_name,p.name AS property_name,COALESCE((SELECT SUM(debit-credit) FROM folio_entries f WHERE f.reservation_id=r.id),0) AS balance FROM reservations r JOIN guests g ON g.id=r.guest_id JOIN rooms m ON m.id=r.room_id JOIN room_types t ON t.id=r.type_id JOIN properties p ON p.id=r.property_id WHERE r.property_id IN (SELECT value FROM json_each(?)) AND ((r.arrival<? AND r.departure>?) OR r.status='In house') ORDER BY r.arrival DESC",
      )
      .all(json, calendarEnd, calendarStart);
    const guests = db
      .prepare(
        'SELECT DISTINCT g.* FROM guests g JOIN reservations r ON r.guest_id=g.id WHERE r.property_id IN (SELECT value FROM json_each(?)) ORDER BY g.name',
      )
      .all(json);
    const tasks = db
      .prepare(
        "SELECT t.*,r.number AS room_number,r.cleaning,r.maintenance,r.occupied_by FROM housekeeping_tasks t JOIN (SELECT rooms.*,(SELECT id FROM reservations x WHERE x.room_id=rooms.id AND x.status='In house' LIMIT 1) AS occupied_by FROM rooms) r ON r.id=t.room_id WHERE t.property_id IN (SELECT value FROM json_each(?)) ORDER BY t.created_at DESC",
      )
      .all(json);
    const current = metrics(db, ids, from, to, u.role),
      length = nights(from, to),
      previous = metrics(db, ids, addDays(from, -length), from, u.role);
    const byProperty = ids.map((id) => ({
      ...metrics(db, [id], from, to, u.role),
      id,
      name: properties.find((p) => p.id === id)?.name,
    }));
    const recent = financialRoles.includes(u.role)
      ? db
          .prepare(
            'SELECT f.*,g.name AS guest_name,r.number AS room_number FROM folio_entries f JOIN reservations a ON a.id=f.reservation_id JOIN guests g ON g.id=a.guest_id JOIN rooms r ON r.id=a.room_id WHERE f.property_id IN (SELECT value FROM json_each(?)) AND f.business_date>=? AND f.business_date<? ORDER BY f.business_date DESC,f.rowid DESC LIMIT 250',
          )
          .all(json, from, to)
      : [];
    res.json({
      user: { id: u.id, name: u.name, email: u.email, role: u.role, property_ids: access },
      demo,
      today: now,
      properties,
      rooms: u.role === 'housekeeping' ? rooms.map(({ base_rate, ...r }) => r) : rooms,
      guests: u.role === 'housekeeping' ? [] : guests,
      reservations:
        u.role === 'housekeeping'
          ? reservations.map(({ rate, tax_rate, balance, guest_email, ...r }) => r)
          : reservations,
      tasks,
      roomBlocks: db
        .prepare('SELECT * FROM room_blocks WHERE property_id IN (SELECT value FROM json_each(?))')
        .all(json),
      types: db
        .prepare('SELECT * FROM room_types WHERE property_id IN (SELECT value FROM json_each(?))')
        .all(json)
        .map((t) => (u.role === 'housekeeping' ? { ...t, base_rate: undefined } : t)),
      ratePlans: db
        .prepare('SELECT * FROM rate_plans WHERE property_id IN (SELECT value FROM json_each(?))')
        .all(json),
      metrics: current,
      previous,
      byProperty,
      entries: recent,
      audit: db
        .prepare(
          'SELECT * FROM audit_events WHERE property_id IN (SELECT value FROM json_each(?)) ORDER BY id DESC LIMIT 25',
        )
        .all(json),
    });
  });
  router.patch('/properties/:id', auth, allow(['owner', 'gm']), (req, res) => {
    scope(req.hotelUser, req.params.id);
    const property = db.prepare('SELECT * FROM properties WHERE id=?').get(req.params.id);
    if (!property) problem('Property not found.', 404);
    const b = req.body;
    const name = text(b.name),
      legal = text(b.legal_entity),
      city = text(b.city),
      rate = Number(b.tax_rate);
    if (
      !name ||
      !legal ||
      !city ||
      !Number.isInteger(rate) ||
      rate < 0 ||
      rate > 5000 ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.check_in_time) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.check_out_time)
    )
      problem('Enter property details, valid times and tax between 0% and 50%.');
    db.prepare(
      'UPDATE properties SET name=?,legal_entity=?,city=?,tax_rate=?,check_in_time=?,check_out_time=? WHERE id=?',
    ).run(name, legal, city, rate, b.check_in_time, b.check_out_time, property.id);
    audit(db, req.hotelUser, property.id, 'Updated property configuration', property.id);
    res.json({ ok: true });
  });
  router.patch('/room-types/:id', auth, allow(['owner', 'gm']), (req, res) => {
    const type = db.prepare('SELECT * FROM room_types WHERE id=?').get(req.params.id);
    if (!type) problem('Room type not found.', 404);
    scope(req.hotelUser, type.property_id);
    const amount = Number(req.body.base_rate);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000)
      problem('Enter a positive base rate.');
    db.prepare('UPDATE room_types SET base_rate=? WHERE id=?').run(amount, type.id);
    audit(db, req.hotelUser, type.property_id, 'Updated base rate for future bookings', type.id);
    res.json({ ok: true });
  });
  router.post('/reservations', auth, allow(deskRoles), (req, res) =>
    res.status(201).json(createReservation(db, req.hotelUser, req.body)),
  );
  router.patch('/reservations/:id', auth, allow(deskRoles), (req, res) => {
    updateReservation(db, req.hotelUser, req.params.id, req.body);
    res.json({ ok: true });
  });
  router.post('/reservations/:id/check-in', auth, allow(deskRoles), (req, res) => {
    checkIn(db, req.hotelUser, req.params.id);
    res.json({ ok: true });
  });
  router.post('/reservations/:id/check-out', auth, allow(deskRoles), (req, res) => {
    checkOut(db, req.hotelUser, req.params.id);
    res.json({ ok: true });
  });
  router.get('/folios/:id', auth, allow([...deskRoles, 'finance']), (req, res) =>
    res.json(getFolio(db, req.hotelUser, req.params.id)),
  );
  router.post('/folios/:id', auth, allow([...deskRoles, 'finance']), (req, res) =>
    res.status(201).json(postFolio(db, req.hotelUser, req.params.id, req.body)),
  );
  router.get('/folios/:id/statement', auth, allow([...deskRoles, 'finance']), (req, res) => {
    const f = getFolio(db, req.hotelUser, req.params.id),
      format = (n) => (n / 100).toFixed(2);
    res
      .type('text')
      .set('Content-Disposition', `attachment; filename="${f.reservation.id}-statement.txt"`)
      .send(
        `BRAINADZ HOSPITALITY OS\nDEMONSTRATION ACCOUNT STATEMENT — NOT A TAX INVOICE\n\n${f.property.name}\nGuest: ${f.guest.name}\nReservation: ${f.reservation.id}\nCurrency: ${f.property.currency}\n\nDate\tDescription\tDebit\tCredit\n${f.entries.map((e) => [e.business_date, e.description, format(e.debit), format(e.credit)].join('\t')).join('\n')}\n\nBalance: ${format(f.balance)}\n\nPayments are recorded manually; no payment gateway or bank transfer has been executed.`,
      );
  });
  router.post('/housekeeping', auth, allow(['owner', 'gm', 'housekeeping']), (req, res) => {
    const room = db.prepare('SELECT * FROM rooms WHERE id=?').get(text(req.body.room_id));
    if (!room) problem('Room not found.', 404);
    scope(req.hotelUser, room.property_id);
    if (
      db
        .prepare("SELECT id FROM housekeeping_tasks WHERE room_id=? AND status!='Completed'")
        .get(room.id)
    )
      problem('A task is already open for this room.', 409);
    const id = uid('HK-');
    db.prepare(
      'INSERT INTO housekeeping_tasks(id,property_id,room_id,title,attendant,priority) VALUES(?,?,?,?,?,?)',
    ).run(
      id,
      room.property_id,
      room.id,
      text(req.body.title) || 'Room clean & inspection',
      text(req.body.attendant) || 'Unassigned',
      req.body.priority === 'High' ? 'High' : 'Normal',
    );
    audit(db, req.hotelUser, room.property_id, 'Created housekeeping task', id);
    res.status(201).json({ id });
  });
  router.patch('/housekeeping/:id', auth, allow(['owner', 'gm', 'housekeeping']), (req, res) => {
    transaction(db, () => {
      const task = db.prepare('SELECT * FROM housekeeping_tasks WHERE id=?').get(req.params.id);
      if (!task) problem('Task not found.', 404);
      scope(req.hotelUser, task.property_id);
      if (req.body.action === 'start') {
        if (task.status !== 'Pending') problem('Only pending tasks can start.');
        db.prepare(
          "UPDATE housekeeping_tasks SET status='In progress',started_at=CURRENT_TIMESTAMP WHERE id=?",
        ).run(task.id);
        db.prepare("UPDATE rooms SET cleaning='Cleaning' WHERE id=?").run(task.room_id);
      } else if (req.body.action === 'complete') {
        if (task.status !== 'In progress') problem('Start cleaning before marking it complete.');
        db.prepare(
          "UPDATE housekeeping_tasks SET status='Awaiting inspection',completed_at=CURRENT_TIMESTAMP WHERE id=?",
        ).run(task.id);
        db.prepare("UPDATE rooms SET cleaning='Clean' WHERE id=?").run(task.room_id);
      } else if (req.body.action === 'inspect') {
        if (!['owner', 'gm'].includes(req.hotelUser.role))
          problem('A manager must inspect the room.', 403);
        if (task.status !== 'Awaiting inspection')
          problem('The room must finish cleaning before inspection.');
        db.prepare(
          "UPDATE housekeeping_tasks SET status='Completed',inspected_by=? WHERE id=?",
        ).run(req.hotelUser.email, task.id);
        db.prepare("UPDATE rooms SET cleaning='Inspected' WHERE id=?").run(task.room_id);
      } else problem('Choose a valid task action.');
      audit(db, req.hotelUser, task.property_id, 'Housekeeping ' + req.body.action, task.id);
    });
    res.json({ ok: true });
  });
  router.patch('/rooms/:id', auth, allow(['owner', 'gm']), (req, res) => {
    const room = db.prepare('SELECT * FROM rooms WHERE id=?').get(req.params.id);
    if (!room) problem('Room not found.', 404);
    scope(req.hotelUser, room.property_id);
    if (!['Good', 'Out of order'].includes(req.body.maintenance))
      problem('Choose a valid maintenance status.');
    db.prepare('UPDATE rooms SET maintenance=? WHERE id=?').run(req.body.maintenance, room.id);
    audit(db, req.hotelUser, room.property_id, 'Changed maintenance status', room.id);
    res.json({ ok: true });
  });
  router.use((err, req, res, next) => {
    if (!err.status || err.status >= 500) console.error('Hospitality:', err.message);
    res.status(err.status || 500).json({
      error: err.status ? err.message : 'The request could not be completed. Please retry.',
    });
  });
  return router;
}
