import { ChevronRight, Clock, User } from 'lucide-react';
import { useState } from 'react';
import { completeSetup } from '../data/store';
import { GOAL_LABEL, SESSION_LENGTH_LABEL } from '../domain/plan';
import type { Goal, LoadUnit, SessionLength } from '../domain/types';
import { navigate } from '../nav/router';
import { revealOnFocus, Segmented, Sheet } from '../ui/components';

export const LENGTHS: SessionLength[] = ['30-45', '45-60', '60-75', '75-90'];

export function LengthSheet({ value, onSelect, onClose }: { value: SessionLength; onSelect: (v: SessionLength) => void; onClose: () => void }) {
  return (
    <Sheet title="Session length" onClose={onClose}>
      <p className="muted small mt0">Sets how many exercises the starter routines include. 45–60 min is suggested.</p>
      <div role="radiogroup" aria-label="Session length">
        {LENGTHS.map((l) => (
          <button key={l} type="button" role="radio" aria-checked={l === value} className="option" onClick={() => onSelect(l)}>
            <span className="radio" aria-hidden />
            <span className="grow">{SESSION_LENGTH_LABEL[l]}{l === '45-60' && <span className="muted small"> · suggested</span>}</span>
          </button>
        ))}
      </div>
      <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button></div>
    </Sheet>
  );
}

export function SetupScreen() {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<Goal>('strength');
  const [days, setDays] = useState(4);
  const [length, setLength] = useState<SessionLength>('45-60');
  const [unit, setUnit] = useState<LoadUnit>('kg');
  const [lengthOpen, setLengthOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Enter your name so we can personalise your plan.'); document.getElementById('setup-name')?.focus(); return; }
    setBusy(true);
    await completeSetup({ name, goal, days, sessionLength: length, loadUnit: unit });
    navigate('/today', { replace: true, direction: 'none' });
  };

  return (
    <form onSubmit={submit} noValidate className="with-footer">
      <h1 className="h1">Your training</h1>
      <p className="muted mt0">No account needed. Everything is stored on this device.</p>
      <div className="field">
        <label htmlFor="setup-name">Name</label>
        <div className={`input-wrap${error ? ' input-invalid' : ''}`}>
          <User aria-hidden />
          <input id="setup-name" value={name} autoComplete="given-name" onFocus={revealOnFocus} onChange={(e) => { setName(e.target.value); setError(''); }} aria-invalid={!!error} aria-describedby={error ? 'setup-name-err' : undefined} placeholder="Your name" />
        </div>
        {error && <div className="error" id="setup-name-err" role="alert">⚠ {error}</div>}
      </div>
      <div className="field">
        <span className="field-label" id="goal-l">Goal</span>
        <Segmented label="Goal" value={goal} onChange={setGoal} options={(['strength', 'muscle', 'fitness'] as Goal[]).map((g) => ({ value: g, label: GOAL_LABEL[g] }))} />
      </div>
      <div className="field">
        <span className="field-label">Days per week</span>
        <Segmented large label="Days per week" value={days} onChange={setDays} options={[3, 4, 5].map((d) => ({ value: d, label: String(d), aria: `${d} days per week${d === 4 ? ', suggested' : ''}` }))} />
        <p className="muted small">4 days is suggested.</p>
      </div>
      <div className="field">
        <span className="field-label">Session length</span>
        <button type="button" className="input-wrap" style={{ width: '100%', textAlign: 'left' }} onClick={() => setLengthOpen(true)} aria-label={`Session length, ${SESSION_LENGTH_LABEL[length]}. Change`}>
          <Clock aria-hidden /><span className="grow">{SESSION_LENGTH_LABEL[length]}</span><ChevronRight aria-hidden />
        </button>
      </div>
      <div className="field">
        <span className="field-label">Weight unit</span>
        <Segmented large label="Weight unit" value={unit} onChange={setUnit} options={[{ value: 'kg', label: 'KG' }, { value: 'lb', label: 'LB' }]} />
      </div>
      <p className="muted small">Each workout ends with an optional five-minute abs finisher.</p>
      <div className="footer">
        <button type="submit" className="btn big" disabled={busy}>Create my plan</button>
      </div>
      {lengthOpen && <LengthSheet value={length} onSelect={(l) => { setLength(l); setLengthOpen(false); }} onClose={() => setLengthOpen(false)} />}
    </form>
  );
}
