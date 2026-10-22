import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
test('saved records survive database close and server restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'brainadz-persistence-'));
  let app, server;
  async function start() {
    app = createApp({ dbPath: join(dir, 'hr.sqlite') });
    server = app.listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    return 'http://127.0.0.1:' + server.address().port;
  }
  async function stop() {
    await new Promise((r) => server.close(r));
    app.locals.db.close();
  }
  try {
    let base = await start();
    const login = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@brainadz.com', password: 'Brainadz@123' }),
    });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const saved = await fetch(base + '/api/records/announcement', {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Restart persistence check',
        body: 'This announcement must survive a restart.',
      }),
    });
    assert.equal(saved.status, 201);
    const { id } = await saved.json();
    await stop();
    base = await start();
    const r = await fetch(base + '/api/bootstrap', { headers: { cookie } });
    assert.equal(r.status, 200);
    const state = await r.json();
    assert.equal(state.records.find((r) => r.id === id).title, 'Restart persistence check');
    await stop();
  } finally {
    if (server?.listening) await stop();
    rmSync(dir, { recursive: true, force: true });
  }
});
