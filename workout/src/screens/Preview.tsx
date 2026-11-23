import { ArrowRightLeft, BedDouble, Check, ChevronRight, Dumbbell, Eye, Flame, Pencil, Play, RotateCcw, Timer } from 'lucide-react';
import { useState } from 'react';
import { activeSession, moveWorkout, showToast, useApp } from '../data/store';
import { fmtMedium, fmtShort, startOfWeek, todayLocal, weekDates, WEEKDAY_LONG, WEEKDAY_SHORT, weekdayOf } from '../domain/dates';
import { getExercise } from '../domain/exercises';
import { FINISHER_STATIONS, TRANSITION_SEC, WORK_SEC } from '../domain/finisher';
import { targetLabel, templateIdFor } from '../domain/plan';
import type { Weekday } from '../domain/types';
import { back, navigate, useNav } from '../nav/router';
import { Sheet, TopBar, useScrollRestore } from '../ui/components';
import { completedFor, draftDescription, templateMeta, useStartWorkout } from './shared';

export function PreviewScreen({ date }: { date: string }) {
  const app = useApp();
  const nav = useNav();
  useScrollRestore();
  const { start, sheet } = useStartWorkout();
  const [moveOpen, setMoveOpen] = useState(false);
  const [finOpen, setFinOpen] = useState(false);
  const tid = templateIdFor(app.plan, date);
  const t = tid ? app.templates[tid] : null;
  const draft = activeSession(app);
  const base = nav.path;

  if (!t) {
    return (
      <>
        <TopBar title={fmtMedium(date)} />
        <div className="rest-card mt16"><div className="row"><BedDouble aria-hidden /><h1 className="h2" style={{ margin: 0 }}>Rest day</h1></div><p className="muted">Nothing is scheduled for {fmtMedium(date)}.</p>
          <button type="button" className="btn secondary" onClick={() => navigate('/plan')}>Browse plan</button></div>
      </>
    );
  }
  const done = completedFor(app, date, t.id);
  const draftHere = draft && draft.templateId === t.id && draft.scheduledDate === date;
  const hero = getExercise(t.exercises[0]?.exerciseId ?? 'bench-press');

  return (
    <div className="with-footer">
      <TopBar title={t.name} />
      <div className="hero" style={{ minHeight: 220 }}>
        <img src={hero.image} alt={hero.alt} />
        <div className="hero-body">
          <p className="small" style={{ margin: 0, fontWeight: 600 }}>{WEEKDAY_LONG[weekdayOf(date)]}, {fmtShort(date)}{date === todayLocal() ? ' · today' : ''}</p>
          <p className="hero-title" style={{ fontSize: '1.7rem' }}>{templateMeta(t, app.settings.defaultRestSec)}</p>
        </div>
        {done && <span className="badge pill lime"><Check size={14} aria-hidden /> Completed</span>}
      </div>
      <ol className="list mt16" style={{ listStyle: 'none', padding: 0 }} aria-label="Exercises in order">
        {t.exercises.map((row, i) => {
          const ex = getExercise(row.exerciseId);
          return (
            <li key={row.key}>
              <button type="button" className="list-row" onClick={() => navigate(`${base}/exercise/${row.exerciseId}`)} aria-label={`${i + 1}. ${ex.name}, ${targetLabel(row)}${row.seconds ? ' seconds' : ' reps'}. Open guide`}>
                <span className="lead">{ex.mode === 'timed' ? <Timer aria-hidden /> : <Dumbbell aria-hidden />}</span>
                <span className="label">{ex.name}</span>
                <span className="value ink">{targetLabel(row)}</span>
                <ChevronRight className="chev" aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>
      {t.finisher && (
        <button type="button" className="option" style={{ background: 'var(--sage)', borderColor: 'var(--sage)' }} onClick={() => setFinOpen(true)}>
          <Flame aria-hidden /><span className="grow" style={{ fontWeight: 600 }}>5 min abs finisher <span className="muted small">· optional</span></span><ChevronRight aria-hidden />
        </button>
      )}
      <div className="btn-row mt16">
        <button type="button" className="btn secondary" onClick={() => navigate(`${base}/edit/${t.id}`)}><Pencil size={18} aria-hidden /> Edit</button>
        <button type="button" className="btn secondary" onClick={() => setMoveOpen(true)} disabled={date < todayLocal()}><ArrowRightLeft size={18} aria-hidden /> Move</button>
      </div>
      {draft && !draftHere && <p className="banner info mt16 small">Another workout is in progress: {draftDescription(draft)}</p>}
      {draftHere && <p className="banner info mt16 small" role="status">In progress: {draftDescription(draft)}</p>}

      <div className="footer">
        {draftHere ? (
          <button type="button" className="btn big" onClick={() => navigate('/session')}><RotateCcw aria-hidden /> Resume workout</button>
        ) : done ? (
          <div className="btn-row">
            <button type="button" className="btn secondary" onClick={() => navigate(`${base}/record/${done.id}`)}><Eye size={20} aria-hidden /> Summary</button>
            <button type="button" className="btn" onClick={() => start(t.id, date)}><Play size={20} aria-hidden /> Start again</button>
          </div>
        ) : (
          <button type="button" className="btn big" onClick={() => start(t.id, date)}><Play fill="currentColor" aria-hidden /> Start workout</button>
        )}
      </div>
      {sheet}
      {finOpen && (
        <Sheet title="5 min abs finisher" onClose={() => setFinOpen(false)}>
          <p className="mt0">Two rounds, done at the end of the workout. Each station is {TRANSITION_SEC} s to get into position, then {WORK_SEC} s of work.</p>
          <div className="list">
            {FINISHER_STATIONS.map((s) => <div key={s.label} className="list-row"><span className="label">{s.label}</span><span className="value ink">{WORK_SEC} s</span></div>)}
          </div>
          <div className="actions">
            <button type="button" className="btn secondary" onClick={() => { setFinOpen(false); navigate(`${base}/exercise/dead-bug`); }}>Dead bug guide</button>
            <button type="button" className="btn secondary" onClick={() => { setFinOpen(false); navigate(`${base}/exercise/side-plank`); }}>Side plank guide</button>
            <button type="button" className="btn ghost" onClick={() => setFinOpen(false)}>Close</button>
          </div>
        </Sheet>
      )}
      {moveOpen && <MoveSheet date={date} name={t.name} onClose={() => setMoveOpen(false)} onMoved={(to) => { setMoveOpen(false); if (to) navigate(base.replace(`/day/${date}`, `/day/${to}`), { replace: true }); else back(); }} />}
    </div>
  );
}

function MoveSheet({ date, name, onClose, onMoved }: { date: string; name: string; onClose: () => void; onMoved: (to: string | null) => void }) {
  const app = useApp();
  const today = todayLocal();
  const ws = startOfWeek(date);
  const [to, setTo] = useState<string | null>(null);
  const [scope, setScope] = useState<'once' | 'recurring'>('once');
  const fromDay = weekdayOf(date) as Weekday;
  return (
    <Sheet title={`Move ${name}`} onClose={onClose}>
      <p className="mt0 muted small">From {WEEKDAY_LONG[fromDay]}, {fmtShort(date)}. If the new day already has a workout, the two swap. Completed workouts stay in history.</p>
      <div role="radiogroup" aria-label="New day">
        {weekDates(ws).map((d, i) => {
          if (d === date) return null;
          const other = templateIdFor(app.plan, d);
          const past = d < today;
          return (
            <button key={d} type="button" role="radio" className="option" aria-checked={to === d} disabled={past && scope === 'once'} onClick={() => setTo(d)} style={past && scope === 'once' ? { opacity: .45 } : undefined}>
              <span className="radio" aria-hidden />
              <span className="grow"><strong>{WEEKDAY_SHORT[i]} {fmtShort(d)}</strong><span className="muted small"> · {other ? `${app.templates[other]?.name} (swap)` : 'rest day'}{past && scope === 'once' ? ' · past' : ''}</span></span>
            </button>
          );
        })}
      </div>
      <h3 className="h3">Apply to</h3>
      <div role="radiogroup" aria-label="Apply to">
        <button type="button" role="radio" className="option" aria-checked={scope === 'once'} onClick={() => setScope('once')}>
          <span className="radio" aria-hidden /><span className="grow"><strong>This date only</strong><span className="muted small"> · other weeks keep their days</span></span>
        </button>
        <button type="button" role="radio" className="option" aria-checked={scope === 'recurring'} onClick={() => setScope('recurring')}>
          <span className="radio" aria-hidden /><span className="grow"><strong>Every week from {fmtShort(date < today ? today : date)}</strong><span className="muted small"> · earlier weeks unchanged</span></span>
        </button>
      </div>
      <div className="actions">
        <button type="button" className="btn" disabled={!to} onClick={() => {
          if (!to) return;
          moveWorkout(date, to, scope, fromDay, weekdayOf(to) as Weekday);
          showToast(scope === 'once' ? `Moved to ${WEEKDAY_SHORT[weekdayOf(to)]} ${fmtShort(to)} only` : `Moved to ${WEEKDAY_LONG[weekdayOf(to)]}s from now on`);
          onMoved(scope === 'once' || to >= date ? to : null);
        }}>Move workout</button>
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}
