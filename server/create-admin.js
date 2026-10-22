import { openDatabase, hashPassword, dateKey } from './database.js';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
if (
  !ADMIN_NAME ||
  !/^\S+@\S+\.\S+$/.test(ADMIN_EMAIL || '') ||
  !ADMIN_PASSWORD ||
  ADMIN_PASSWORD.length < 12 ||
  ADMIN_PASSWORD.length > 128
) {
  console.error(
    'Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD (12–128 characters) securely in the process environment.',
  );
  process.exit(1);
}
const db = openDatabase(process.env.DATABASE_PATH || resolve('.data/company.sqlite'), false);
if (db.prepare('SELECT id FROM users WHERE email=?').get(ADMIN_EMAIL.toLowerCase())) {
  console.error('This account already exists. No changes made.');
  db.close();
  process.exit(1);
}
const employeeId =
  'BA' +
  String(
    (db.prepare('SELECT MAX(CAST(SUBSTR(id,3) AS INTEGER)) AS n FROM employees').get().n || 0) + 1,
  ).padStart(3, '0');
db.exec('BEGIN');
try {
  db.prepare('INSERT INTO employees VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(
    employeeId,
    ADMIN_NAME,
    ADMIN_EMAIL.toLowerCase(),
    'Administrator',
    'Marketing',
    'People & Culture',
    'Mumbai',
    'Full-time',
    dateKey(),
    0,
    'Leadership',
    'Active',
  );
  db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(
    randomBytes(10).toString('hex'),
    employeeId,
    ADMIN_EMAIL.toLowerCase(),
    hashPassword(ADMIN_PASSWORD),
    'admin',
  );
  db.exec('COMMIT');
  console.log('Administrator account created. No sample accounts or data were added.');
} catch (e) {
  db.exec('ROLLBACK');
  console.error('Administrator creation failed.');
  process.exitCode = 1;
} finally {
  db.close();
}
