import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { seedDemo } from './seed.js';
export function openHotelDatabase(path = ':memory:', demo = true) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  if (!db.prepare('SELECT version FROM schema_migrations WHERE version=2').get()) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(readFileSync(new URL('./002_rate_plans.sql', import.meta.url), 'utf8'));
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  if (demo && !db.prepare('SELECT id FROM properties LIMIT 1').get()) seedDemo(db);
  return db;
}
