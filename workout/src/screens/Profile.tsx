import { CalendarDays, Dumbbell, Pencil, Settings as Cog, Timer } from 'lucide-react';
import { useState } from 'react';
import { changeWeeklyTarget, completedSessions, showToast, updateProfile, useApp } from '../data/store';
import { fmtShort, startOfWeek, todayLocal, WEEKDAY_SHORT } from '../domain/dates';
import { FREQUENCY_LAYOUT, GOAL_LABEL, SESSION_LENGTH_LABEL, targetFor } from '../domain/plan';
import type { Goal } from '../domain/types';
import { navigate } from '../nav/router';
import { ListRow, revealOnFocus, Sheet, Stepper, useScrollRestore } from '../ui/components';
import { LengthSheet } from './Setup';

export function ProfileScreen() {
  const app = useApp();
  useScrollRestore();
  const [sheet, setSheet] = useState<null | 'name' | 'goal' | 'target' | 'length'>(null);
  const p = app.profile!;
  const target = targetFor(p, todayLocal());
  const saved = completedSessions(app).length;
  return (
    <>
      <h1 className="h1">Profile</h1>
      <div className="avatar" aria-hidden>{(p.name.trim()[0] ?? '?').toUpperCase()}</div>
      <div className="center">
        <button type="button" className="btn ghost" style={{ width: 'auto', fontFamily: 'var(--display)', fontSize: '2.2rem', color: 'var(--ink)' }} onClick={() => setSheet('name')} aria-label={`Name: ${p.name}. Edit`}>
          {p.name} <Pencil size={18} aria-hidden />
        </button>
        <p className="muted small mt0">{saved} saved workout{saved === 1 ? '' : 's'} on this device</p>
      </div>
      <div className="list mt16">
        <ListRow icon={<Dumbbell aria-hidden />} label="Training goal" value={GOAL_LABEL[p.goal]} onClick={() => setSheet('goal')} />
        <ListRow icon={<CalendarDays aria-hidden />} label="Weekly goal" value={`${target} sessions`} onClick={() => setSheet('target')} />
        <ListRow icon={<Timer aria-hidden />} label="Session length" value={SESSION_LENGTH_LABEL[p.sessionLength]} onClick={() => setSheet('length')} />
      </div>
      <div className="list mt16">
        <ListRow icon={<Cog aria-hidden />} label="Settings" sub="Units, rest timer, sound, export" onClick={() => navigate('/profile/settings')} />
      </div>
      {sheet === 'name' && <NameSheet initial={p.name} onClose={() => setSheet(null)} />}
      {sheet === 'goal' && (
        <Sheet title="Training goal" onClose={() => setSheet(null)}>
          <div role="radiogroup" aria-label="Training goal">
            {(['strength', 'muscle', 'fitness'] as Goal[]).map((g) => (
              <button key={g} type="button" role="radio" className="option" aria-checked={p.goal === g} onClick={() => { updateProfile({ goal: g }); setSheet(null); showToast(`Goal: ${GOAL_LABEL[g]}`); }}>
                <span className="radio" aria-hidden /><span className="grow">{GOAL_LABEL[g]}</span>
              </button>
            ))}
          </div>
          <p className="muted small">Your current workouts are not rewritten. Adjust sets and reps in Plan → Edit workout.</p>
          <div className="actions"><button type="button" className="btn ghost" onClick={() => setSheet(null)}>Cancel</button></div>
        </Sheet>
      )}
      {sheet === 'length' && <LengthSheet value={p.sessionLength} onClose={() => setSheet(null)} onSelect={(l) => { updateProfile({ sessionLength: l }); setSheet(null); showToast(`Session length: ${SESSION_LENGTH_LABEL[l]}`); }} />}
      {sheet === 'target' && <TargetSheet current={target} onClose={() => setSheet(null)} />}
    </>
  );
}

function NameSheet({ initial, onClose }: { initial: string; onClose: () => void }) {
  const [name, setName] = useState(initial);
  const [err, setErr] = useState('');
  return (
    <Sheet title="Name" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) { setErr('Name cannot be empty.'); return; } updateProfile({ name: name.trim() }); onClose(); }}>
        <label htmlFor="pname" className="sr-only">Name</label>
        <div className={`input-wrap${err ? ' input-invalid' : ''}`}><input id="pname" data-autofocus value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} onFocus={revealOnFocus} maxLength={40} autoComplete="given-name" /></div>
        {err && <p className="error" role="alert">⚠ {err}</p>}
        <div className="actions"><button type="submit" className="btn">Save</button><button type="button" className="btn ghost" onClick={onClose}>Cancel</button></div>
      </form>
    </Sheet>
  );
}

function TargetSheet({ current, onClose }: { current: number; onClose: () => void }) {
  const [n, setN] = useState(current);
  const [rebuild, setRebuild] = useState(true);
  const today = todayLocal();
  const days = Object.keys(FREQUENCY_LAYOUT[n] ?? {}).map((d) => WEEKDAY_SHORT[Number(d)]).join(', ');
  return (
    <Sheet title="Weekly goal" onClose={onClose}>
      <Stepper label="sessions per week" value={n} onChange={setN} min={2} max={6} format={(v) => `${v} sessions`} />
      {n !== current && (
        <div className="panel pad mt16" role="status">
          <p className="mt0"><strong>What changes</strong></p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>From the week of {fmtShort(startOfWeek(today))}, your target becomes {n} sessions.</li>
            <li>Earlier weeks keep their original target of the time, and all workout history stays as it is.</li>
            {rebuild && <li>Your recurring schedule changes from today to {n} training days ({days}). One-date moves after today are reset.</li>}
          </ul>
        </div>
      )}
      <button type="button" role="checkbox" aria-checked={rebuild} className="option" onClick={() => setRebuild(!rebuild)}>
        <span className="checkbox" aria-hidden style={{ width: 'auto', height: 'auto' }}><span className="box" style={rebuild ? { background: 'var(--forest)', borderColor: 'var(--forest)', color: '#fff' } : undefined}>{rebuild ? '✓' : ''}</span></span>
        <span className="grow">Also update my weekly schedule</span>
      </button>
      <div className="actions">
        <button type="button" className="btn" disabled={n === current && !rebuild} onClick={() => { changeWeeklyTarget(n, rebuild); onClose(); showToast(`Weekly goal set to ${n} sessions`); }}>Apply</button>
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}
