import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { buildStarterTemplates } from '../domain/plan';
import { createDraft } from '../domain/session';
import { commitSession, loadAll, write } from './db';

describe('IndexedDB persistence', () => {
  it('commits a draft exactly once even when Save is sent twice', async () => {
    const tpl = buildStarterTemplates('strength', '45-60')[0];
    const draft = createDraft(tpl, '2026-01-05', [], 90, 'kg', Date.now());
    await write([{ store: 'sessions', type: 'put', value: draft }, { store: 'kv', type: 'put', key: 'activeSessionId', value: draft.id }]);
    const first = { ...draft, status: 'completed' as const, savedAt: 1, notes: 'first' };
    const second = { ...draft, status: 'completed' as const, savedAt: 2, notes: 'second' };
    const [a, b] = await Promise.all([commitSession(first), commitSession(second)]);
    expect(a.notes).toBe('first');
    expect(b.notes).toBe('first');
    const snap = await loadAll();
    expect(snap.sessions.filter((s) => s.id === draft.id)).toHaveLength(1);
    expect(snap.sessions[0].status).toBe('completed');
    expect(snap.kv.activeSessionId).toBeUndefined();
  });
});
