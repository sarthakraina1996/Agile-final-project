import {
  uid,
  text,
  validDate,
  nights,
  problem,
  transaction,
  audit,
  today,
  digest,
} from './utils.js';
export function scope(user, property) {
  if (!JSON.parse(user.property_ids).includes(property))
    problem('You do not have access to this property.', 403);
}
export function getReservation(db, user, id) {
  const r = db.prepare('SELECT * FROM reservations WHERE id=?').get(id);
  if (!r) problem('Reservation not found.', 404);
  scope(user, r.property_id);
  return r;
}
export function createReservation(db, user, b) {
  scope(user, b.property_id);
  if (
    !validDate(b.arrival) ||
    !validDate(b.departure) ||
    nights(b.arrival, b.departure) < 1 ||
    nights(b.arrival, b.departure) > 365
  )
    problem('Choose valid arrival and departure dates (1–365 nights).');
  const room = db
    .prepare(
      'SELECT r.*,t.adults AS max_adults,t.children AS max_children,t.base_rate FROM rooms r JOIN room_types t ON t.id=r.type_id WHERE r.id=?',
    )
    .get(text(b.room_id));
  if (!room || room.property_id !== b.property_id) problem('Select a room in the chosen property.');
  if (room.maintenance !== 'Good') problem('This room is unavailable for maintenance.', 409);
  const adults = Number(b.adults ?? 2),
    children = Number(b.children ?? 0);
  if (
    !Number.isInteger(adults) ||
    adults < 1 ||
    adults > room.max_adults ||
    !Number.isInteger(children) ||
    children < 0 ||
    children > room.max_children
  )
    problem('The guest count exceeds this room’s capacity.');
  const plan = db
    .prepare('SELECT * FROM rate_plans WHERE id=? AND property_id=?')
    .get(text(b.rate_plan_id) || b.property_id + 'bar', b.property_id);
  if (!plan) problem('Select a valid property rate plan.');
  const rate =
    b.rate === undefined ? Math.round((room.base_rate * plan.multiplier) / 10000) : Number(b.rate);
  if (!Number.isSafeInteger(rate) || rate < 0 || rate > 100000000)
    problem('Enter a valid nightly rate.');
  if (
    ![
      'Direct',
      'Website',
      'Booking.com',
      'Expedia',
      'Corporate',
      'Travel agent',
      'Walk-in',
      'Group',
    ].includes(b.source)
  )
    problem('Select a booking source.');
  const payload = b;
  const requestId = text(b.request_id, 100);
  if (requestId.length < 8) problem('A unique request ID is required.');
  return transaction(db, () => {
    const existing = db.prepare('SELECT * FROM reservations WHERE request_id=?').get(requestId);
    if (existing) {
      if (existing.request_hash !== digest(payload))
        problem('This request ID was already used for another booking.', 409);
      scope(user, existing.property_id);
      return existing;
    }
    let guestId = text(b.guest_id);
    if (!guestId) {
      if (!text(b.guest_name)) problem('Enter the lead guest’s name.');
      if (b.email && !/^\S+@\S+\.\S+$/.test(b.email)) problem('Enter a valid guest email.');
      guestId = uid('g');
      db.prepare(
        'INSERT INTO guests(id,name,email,phone,country,preferences,consent) VALUES(?,?,?,?,?,?,?)',
      ).run(
        guestId,
        text(b.guest_name),
        text(b.email),
        text(b.phone),
        'India',
        text(b.preferences),
        b.consent ? 1 : 0,
      );
    } else if (
      !db
        .prepare(
          'SELECT g.id FROM guests g JOIN reservations r ON r.guest_id=g.id WHERE g.id=? AND r.property_id IN (SELECT value FROM json_each(?))',
        )
        .get(guestId, user.property_ids)
    )
      problem('Select an accessible guest.');
    const property = db.prepare('SELECT * FROM properties WHERE id=?').get(room.property_id),
      id = uid('RES-');
    db.prepare(
      'INSERT INTO reservations(id,property_id,guest_id,room_id,type_id,arrival,departure,adults,children,rate,tax_rate,status,source,notes,request_id,request_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    ).run(
      id,
      b.property_id,
      guestId,
      room.id,
      room.type_id,
      b.arrival,
      b.departure,
      adults,
      children,
      rate,
      property.tax_rate,
      'Confirmed',
      b.source,
      text(b.notes),
      requestId,
      digest(payload),
    );
    db.prepare('UPDATE reservations SET rate_plan_id=? WHERE id=?').run(plan.id, id);
    audit(db, user, b.property_id, 'Created reservation', id);
    return db.prepare('SELECT * FROM reservations WHERE id=?').get(id);
  });
}
export function updateReservation(db, user, id, b) {
  return transaction(db, () => {
    const r = getReservation(db, user, id);
    if (['Checked out', 'Cancelled'].includes(r.status))
      problem('This reservation is closed. Historical stays cannot be moved.');
    if (b.action === 'cancel') {
      if (r.status !== 'Confirmed') problem('Only confirmed bookings can be cancelled.');
      const balance = db
        .prepare(
          'SELECT COALESCE(SUM(debit-credit),0) AS value FROM folio_entries WHERE reservation_id=?',
        )
        .get(id).value;
      if (balance !== 0) problem('Settle or reverse the folio before cancelling.');
      db.prepare("UPDATE reservations SET status='Cancelled' WHERE id=?").run(id);
      audit(db, user, r.property_id, 'Cancelled reservation', id);
      return;
    }
    const arrival = b.arrival ?? r.arrival,
      departure = b.departure ?? r.departure;
    const room = db
      .prepare('SELECT * FROM rooms WHERE id=? AND property_id=?')
      .get(text(b.room_id) || r.room_id, r.property_id);
    if (!room || room.type_id !== r.type_id)
      problem('Choose a room of the same type in this property.');
    if (room.maintenance !== 'Good') problem('This room is under maintenance.', 409);
    if (
      !validDate(arrival) ||
      !validDate(departure) ||
      nights(arrival, departure) < 1 ||
      nights(arrival, departure) > 365
    )
      problem('Choose a valid stay interval.');
    if (r.status === 'In house' && (arrival !== r.arrival || room.id !== r.room_id))
      problem(
        'An in-house room change requires the dedicated room-change workflow (not available in this cycle).',
      );
    db.prepare('UPDATE reservations SET room_id=?,arrival=?,departure=? WHERE id=?').run(
      room.id,
      arrival,
      departure,
      id,
    );
    audit(db, user, r.property_id, 'Changed room or stay dates', id);
  });
}
export function checkIn(db, user, id) {
  return transaction(db, () => {
    const r = getReservation(db, user, id),
      p = db.prepare('SELECT * FROM properties WHERE id=?').get(r.property_id),
      businessDate = today(p.timezone);
    if (r.status !== 'Confirmed') problem('Only confirmed reservations can check in.');
    if (r.arrival !== businessDate) problem('Check-in is available on the arrival business date.');
    const room = db.prepare('SELECT * FROM rooms WHERE id=?').get(r.room_id);
    if (
      room.maintenance !== 'Good' ||
      !(p.requires_inspection
        ? room.cleaning === 'Inspected'
        : ['Clean', 'Inspected'].includes(room.cleaning))
    )
      problem('The room must be clean and supervisor-inspected before check-in.', 409);
    if (
      db
        .prepare("SELECT id FROM reservations WHERE room_id=? AND status='In house' AND id!=?")
        .get(room.id, id)
    )
      problem('The room is still occupied.', 409);
    db.prepare("UPDATE reservations SET status='In house' WHERE id=?").run(id);
    db.prepare("UPDATE rooms SET cleaning='Clean' WHERE id=?").run(room.id);
    audit(db, user, r.property_id, 'Checked guest in', id);
  });
}
export function checkOut(db, user, id) {
  return transaction(db, () => {
    const r = getReservation(db, user, id);
    if (r.status !== 'In house') problem('Only in-house guests can check out.');
    const balance = db
      .prepare(
        'SELECT COALESCE(SUM(debit-credit),0) AS balance FROM folio_entries WHERE reservation_id=?',
      )
      .get(id).balance;
    if (balance !== 0) problem('Settle the folio to a zero balance before checkout.', 409);
    db.prepare("UPDATE reservations SET status='Checked out' WHERE id=?").run(id);
    db.prepare("UPDATE rooms SET cleaning='Dirty' WHERE id=?").run(r.room_id);
    if (
      !db
        .prepare("SELECT id FROM housekeeping_tasks WHERE room_id=? AND status!='Completed'")
        .get(r.room_id)
    )
      db.prepare(
        'INSERT INTO housekeeping_tasks(id,property_id,room_id,title,attendant,priority) VALUES(?,?,?,?,?,?)',
      ).run(
        uid('HK-'),
        r.property_id,
        r.room_id,
        'Departure clean & supervisor inspection',
        'Unassigned',
        'High',
      );
    audit(db, user, r.property_id, 'Checked out; room marked dirty', id);
  });
}
