import { Check, ChevronLeft, Clock, Dumbbell, FileText, Flame, Layers, ListChecks, Timer, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { activeSession, discardActiveSession, saveActiveSession, updateActiveSession, useApp } from '../data/store';
import { fmtClock, fmtLong, fmtMinutes, fmtTime } from '../domain/dates';
import { bestSet, exerciseCounts, reopenSession, sessionStats, setSummary } from '../domain/session';
import type { Session } from '../domain/types';
import { back, navigate } from '../nav/router';
import { revealOnFocus, Sheet, useScrollRestore } from '../ui/components';

let lastSavedId: string | null = null;

function finisherText(s: Session): { label: string; value: string } {
  if (!s.finisherEnabled && !s.finisher) return { label: 'Abs finisher', value: 'Off for this workout' };
  if (!s.finisher) return { label: 'Abs finisher', value: 'Not done' };
  const t = fmtClock(s.finisher.actualSec ?? 0);
  if (s.finisher.status === 'completed') return { label: 'Abs finisher', value: `${t} · completed ✓` };
  if (s.finisher.status === 'ended') return { label: 'Abs finisher', value: `${t} · ended early` };
  return { label: 'Abs finisher', value: 'In progress' };
}

function SummaryBody({ s, editableNotes }: { s: Session; editableNotes: boolean }) {
  const app = useApp();
  const unit = app.settings.loadUnit;
  const stats = sessionStats(s);
  const best = bestSet(s, unit);
  const fin = finisherText(s);
  return (
    <div className="summary-card">
      <h2 className="row" style={{ justifyContent: 'center', margin: '0 0 4px', fontFamily: 'var(--display)', fontWeight: 800, fontSize: '1.9rem' }}>
        <Dumbbell aria-hidden /> {s.title}
      </h2>
      <p className="center muted small mt0">{fmtLong(s.startDate)} · started {fmtTime(s.startedAt)}</p>
      <div className="stats">
        <div><Clock aria-hidden /><div className="num">{fmtMinutes(s.activeSec ?? 0)}</div><div className="small">active</div></div>
        <div><Layers aria-hidden /><div className="num">{stats.exercises}</div><div className="small">exercise{stats.exercises === 1 ? '' : 's'}</div></div>
        <div><ListChecks aria-hidden /><div className="num">{stats.sets}</div><div className="small">set{stats.sets === 1 ? '' : 's'}</div></div>
      </div>
      <div className="list">
        <div className="list-row"><span className="lead"><Timer aria-hidden /></span><span className="label">{fin.label}</span><span className="value ink">{fin.value}</span></div>
      </div>
      <h3 className="h2">Best set</h3>
      <div className="list">
        <div className="list-row"><span className="label">{best ? best.name : 'No sets logged'}</span>{best && <span className="value ink display-num" style={{ fontSize: '1.5rem' }}>{best.text}</span>}</div>
      </div>
      <h3 className="h2">Notes</h3>
      {editableNotes ? (
        <>
          <label htmlFor="notes" className="sr-only">Session notes</label>
          <textarea id="notes" className="input" placeholder="How did it feel? Anything to remember next time?" value={s.notes} onFocus={revealOnFocus}
            onChange={(e) => updateActiveSession((x) => ({ ...x, notes: e.target.value, updatedAt: Date.now() }))} />
        </>
      ) : (
        <div className="panel pad row"><FileText aria-hidden /><span>{s.notes || <span className="muted">No notes</span>}</span></div>
      )}
      <details className="card mt16" open={!editableNotes}>
        <summary className="list-row" style={{ cursor: 'pointer' }}><span className="label">Set-by-set breakdown</span></summary>
        <div className="breakdown">
          {s.exercises.filter(exerciseCounts).map((ex) => (
            <div key={ex.key} className="mt8">
              <strong>{ex.name}</strong>
              <table>
                <thead><tr><th scope="col">Set</th><th scope="col">Result</th></tr></thead>
                <tbody>
                  {ex.sets.map((set, i) => set.done && (
                    <tr key={set.id}><td>{i + 1}</td><td>{setSummary(set, ex, unit)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {stats.exercises === 0 && <p className="muted">No completed sets.</p>}
          {s.finisher && <p className="small mt8"><Flame size={16} aria-hidden /> Abs finisher: {fin.value}</p>}
        </div>
      </details>
    </div>
  );
}

export function ReviewScreen() {
  const app = useApp();
  const s = activeSession(app);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  useScrollRestore();
  // A save completed through the error banner's Retry: show the saved result.
  useEffect(() => {
    if (!s && app.justSavedId) { lastSavedId = app.justSavedId; navigate(`/today/record/${app.justSavedId}`, { replace: true }); }
  }, [s, app.justSavedId]);
  if (!s) {
    return <><p>No workout to review.</p><button type="button" className="btn" onClick={() => navigate('/today', { replace: true })}>Go to Today</button></>;
  }
  const stats = sessionStats(s);
  const empty = stats.sets === 0 && !s.finisher;
  const save = async () => {
    if (saving) return;
    setSaving(true);
    const result = await saveActiveSession();
    setSaving(false);
    if (result) { lastSavedId = result.id; navigate(`/today/record/${result.id}`, { replace: true }); }
  };
  return (
    <div className="with-footer">
      <div className="summary-head">
        <div className="topbar" style={{ margin: '0 -12px' }}>
          <button type="button" className="icon-btn on-dark" onClick={() => { updateActiveSession((x) => reopenSession(x)); back('/session'); }} aria-label="Back to workout"><ChevronLeft size={28} aria-hidden /></button>
        </div>
        <div className="check"><Check size={40} strokeWidth={3} aria-hidden /></div>
        <h1>{empty ? 'Review session' : 'Session complete'}</h1>
      </div>
      <SummaryBody s={s} editableNotes />
      {empty && <p className="banner info mt16">Log at least one set or finisher before saving, or discard this workout.</p>}
      <div className="footer">
        {empty ? (
          <button type="button" className="btn big danger" onClick={() => setConfirmDiscard(true)}><Trash2 aria-hidden /> Discard workout</button>
        ) : (
          <button type="button" className="btn big" onClick={save} disabled={saving} aria-busy={saving}>{saving ? 'Saving…' : 'Save session'}</button>
        )}
      </div>
      {confirmDiscard && (
        <Sheet title="Discard workout?" onClose={() => setConfirmDiscard(false)}>
          <p>{s.title} has no logged sets. Discarding removes it; nothing is added to history.</p>
          <div className="actions">
            <button type="button" className="btn danger" onClick={async () => { setConfirmDiscard(false); await discardActiveSession(); navigate('/today', { replace: true }); }}>Discard</button>
            <button type="button" className="btn ghost" data-autofocus onClick={() => setConfirmDiscard(false)}>Keep it</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

export function RecordScreen({ sessionId }: { sessionId: string }) {
  const app = useApp();
  useScrollRestore();
  const s = app.sessions.find((x) => x.id === sessionId && x.status === 'completed');
  const justSaved = lastSavedId === sessionId;
  if (!s) return <><p>This session could not be found.</p><button type="button" className="btn" onClick={() => back('/progress')}>Back</button></>;
  return (
    <div className="with-footer">
      <div className="summary-head">
        <div className="topbar" style={{ margin: '0 -12px' }}>
          <button type="button" className="icon-btn on-dark" onClick={() => back('/progress/history')} aria-label="Back"><ChevronLeft size={28} aria-hidden /></button>
        </div>
        <div className="check"><Check size={40} strokeWidth={3} aria-hidden /></div>
        <h1>{justSaved ? 'Session saved' : 'Workout record'}</h1>
        {justSaved && <p role="status" style={{ margin: '6px 0 0' }}>Added to your history and progress.</p>}
      </div>
      <SummaryBody s={s} editableNotes={false} />
      {justSaved && (
        <div className="footer">
          <div className="btn-row">
            <button type="button" className="btn secondary" onClick={() => { lastSavedId = null; navigate('/today', { replace: true }); navigate('/progress/history'); }}>History</button>
            <button type="button" className="btn" onClick={() => { lastSavedId = null; navigate('/today', { replace: true, direction: 'back' }); }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
