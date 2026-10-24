import { uid, text, problem, transaction, digest, today, audit } from './utils.js';
import { getReservation } from './reservations.js';
export function postFolio(db, user, id, b) {
  return transaction(db, () => {
    const r = getReservation(db, user, id);
    if (['Checked out', 'Cancelled'].includes(r.status)) problem('This folio is closed.');
    const kind = b.kind;
    if (!['charge', 'payment', 'reversal'].includes(kind)) problem('Select a posting type.');
    const requestId = text(b.request_id, 100);
    if (requestId.length < 8) problem('A unique request ID is required.');
    const payload = digest({ id, ...b });
    const existing = db.prepare('SELECT * FROM folio_entries WHERE request_id=?').get(requestId);
    if (existing) {
      if (existing.request_hash !== payload)
        problem('This request ID belongs to a different posting.', 409);
      if (existing.reservation_id !== id) problem('This request ID belongs to another folio.', 409);
      return existing;
    }
    let debit = 0,
      credit = 0,
      net = 0,
      tax = 0,
      department = text(b.department) || 'Rooms',
      reversal = null;
    if (kind === 'reversal') {
      if (!['owner', 'gm', 'finance'].includes(user.role))
        problem('Only finance or property management can reverse a posting.', 403);
      const original = db
        .prepare('SELECT * FROM folio_entries WHERE id=? AND reservation_id=?')
        .get(text(b.reversal_of), id);
      if (!original || original.kind === 'reversal') problem('Choose an original posting.');
      if (db.prepare('SELECT id FROM folio_entries WHERE reversal_of=?').get(original.id))
        problem('This entry has already been reversed.', 409);
      debit = original.credit;
      credit = original.debit;
      net = -original.net;
      tax = -original.tax;
      department = original.department;
      reversal = original.id;
    } else {
      const amount = Number(b.amount);
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000)
        problem('Enter an amount greater than zero, in minor currency units.');
      if (kind === 'payment') {
        const balance = db
          .prepare(
            'SELECT COALESCE(SUM(debit-credit),0) AS value FROM folio_entries WHERE reservation_id=?',
          )
          .get(id).value;
        if (amount > Math.max(0, balance)) problem('The payment exceeds the outstanding balance.');
        credit = amount;
        department = 'Front office';
        if (!['Cash', 'UPI', 'Recorded external payment', 'Bank transfer'].includes(b.method))
          problem('Choose a payment method. No card details are collected.');
      } else {
        if (r.status !== 'In house')
          problem('Room and ancillary charges require an in-house reservation.');
        if (!['Rooms', 'F&B', 'Spa', 'Banquets', 'Other'].includes(department))
          problem('Choose a valid department.');
        net = amount;
        tax = Math.round((net * r.tax_rate) / 10000);
        debit = net + tax;
      }
    }
    if (!text(b.description)) problem('Enter a posting description or reversal reason.');
    const property = db.prepare('SELECT * FROM properties WHERE id=?').get(r.property_id),
      entryId = uid('F-');
    db.prepare(
      'INSERT INTO folio_entries(id,property_id,reservation_id,business_date,description,department,kind,debit,credit,net,tax,method,actor,request_id,request_hash,reversal_of) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    ).run(
      entryId,
      r.property_id,
      id,
      today(property.timezone),
      text(b.description),
      department,
      kind,
      debit,
      credit,
      net,
      tax,
      text(b.method),
      user.email,
      requestId,
      payload,
      reversal,
    );
    audit(db, user, r.property_id, 'Posted ' + kind + ' to folio', entryId);
    return db.prepare('SELECT * FROM folio_entries WHERE id=?').get(entryId);
  });
}
export function getFolio(db, user, id) {
  const reservation = getReservation(db, user, id),
    guest = db.prepare('SELECT * FROM guests WHERE id=?').get(reservation.guest_id),
    property = db.prepare('SELECT * FROM properties WHERE id=?').get(reservation.property_id),
    entries = db
      .prepare('SELECT * FROM folio_entries WHERE reservation_id=? ORDER BY created_at,rowid')
      .all(id);
  return {
    reservation,
    guest,
    property,
    entries,
    balance: entries.reduce((s, e) => s + e.debit - e.credit, 0),
    charges: entries.reduce((s, e) => s + e.debit, 0),
    credits: entries.reduce((s, e) => s + e.credit, 0),
  };
}
