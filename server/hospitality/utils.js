import { randomBytes, createHash } from 'node:crypto';
export const uid = (prefix = '') => prefix + randomBytes(7).toString('hex');
export const today = (tz = 'Asia/Kolkata') =>
  new Date().toLocaleDateString('en-CA', { timeZone: tz });
export const addDays = (date, n) =>
  new Date(Date.parse(date + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
export const nights = (start, end) => Math.round((Date.parse(end) - Date.parse(start)) / 86400000);
export const text = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const validDate = (v) =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
export const digest = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function problem(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  throw e;
}
export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    if (e.message.includes('room_conflict'))
      problem('That room is already booked for these dates. Choose another room or date.', 409);
    if (e.message.includes('room_blocked'))
      problem('This room has a maintenance block during the stay.', 409);
    if (e.message.includes('room_type_mismatch'))
      problem('The room does not belong to the selected property and room type.');
    throw e;
  }
}
export const audit = (db, user, property, action, entity) =>
  db
    .prepare('INSERT INTO audit_events(property_id,actor,action,entity_id) VALUES(?,?,?,?)')
    .run(property, user.email, action, entity);
export const financialRoles = ['owner', 'gm', 'finance'];
export const deskRoles = ['owner', 'gm', 'frontdesk'];
