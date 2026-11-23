import { Check, ChevronLeft, Pause, Play, SkipForward, Square } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { activeSession, updateActiveSession, useApp } from '../data/store';
import { fmtClock } from '../domain/dates';
import { getExercise } from '../domain/exercises';
import {
  endFinisherEarly, FINISHER_ROUNDS, FINISHER_STATIONS, FINISHER_TOTAL_SEC, pauseFinisher, positionAt, reconcileFinisher, resumeFinisher, skipInterval, startFinisher, TRANSITION_SEC, WORK_SEC,
} from '../domain/finisher';
import { endSession } from '../domain/session';
import { back, navigate } from '../nav/router';
import { useNow } from '../ui/components';
import { cue } from './Live';

export function FinisherScreen() {
  const app = useApp();
  const s = activeSession(app);
  const f = s?.finisher ?? null;
  const now = useNow(200, f?.status === 'running');
  const lastIndex = useRef<number | null>(null);

  // Reconcile after reload / phone lock: intervals that elapsed while away are applied from timestamps.
  useEffect(() => {
    if (f && f.status === 'running') {
      const r = reconcileFinisher(f, Date.now());
      if (r !== f) updateActiveSession((x) => ({ ...x, finisher: r, updatedAt: Date.now() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = f ? positionAt(f, now) : null;

  useEffect(() => {
    if (!f || !pos || f.status !== 'running') return;
    if (pos.finished) {
      cue(app.settings.timerSound, app.settings.haptics, [200, 120, 200, 120, 400]);
      updateActiveSession((x) => (x.finisher ? endSession({ ...x, finisher: reconcileFinisher(x.finisher, Date.now()) }) : x));
      navigate('/session/review', { replace: true });
      return;
    }
    if (lastIndex.current !== null && lastIndex.current !== pos.index && document.visibilityState === 'visible') {
      cue(app.settings.timerSound, app.settings.haptics, pos.interval.kind === 'work' ? [160] : [80]);
    }
    lastIndex.current = pos.index;
  }, [pos?.index, pos?.finished, f?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) {
    return <><p>No workout in progress.</p><button type="button" className="btn lime" onClick={() => navigate('/today', { replace: true })}>Go to Today</button></>;
  }

  const setF = (fn: (x: NonNullable<typeof f>, t: number) => NonNullable<typeof f>) =>
    updateActiveSession((x) => (x.finisher ? { ...x, finisher: fn(x.finisher, Date.now()), updatedAt: Date.now() } : x));

  const header = (
    <header className="topbar">
      <button type="button" className="icon-btn on-dark" onClick={() => back('/session')} aria-label="Back to workout. The finisher keeps its time"><ChevronLeft size={28} aria-hidden /></button>
      <div className="grow" />
      {f && (f.status === 'running' || f.status === 'paused') && (
        <button type="button" className="btn dark-ghost small on-dark" onClick={() => { setF(endFinisherEarly); updateActiveSession((x) => endSession(x)); navigate('/session/review', { replace: true }); }}>
          <Square size={16} aria-hidden /> End early
        </button>
      )}
    </header>
  );

  if (!f || !pos) {
    return (
      <>
        {header}
        <div className="center">
          <h1 className="h1" style={{ marginBottom: 4 }}>Abs finisher</h1>
          <p className="muted mt0">5 min circuit · {FINISHER_ROUNDS} rounds</p>
        </div>
        <ol className="list mt16" style={{ background: 'var(--dark-2)', borderColor: '#2f5544', listStyle: 'none', padding: 0 }}>
          {FINISHER_STATIONS.map((st) => (
            <li key={st.label} className="list-row" style={{ borderColor: '#2f5544' }}>
              <img src={getExercise(st.exerciseId).image} alt={getExercise(st.exerciseId).alt} style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 8 }} />
              <span className="label">{st.label}<span className="sub" style={{ color: '#b9c7bd' }}>{TRANSITION_SEC} s get ready · {WORK_SEC} s work</span></span>
            </li>
          ))}
        </ol>
        <p className="muted small center">Each station: {TRANSITION_SEC} s transition + {WORK_SEC} s work. Total {fmtClock(FINISHER_TOTAL_SEC)}.</p>
        <div className="footer">
          <button type="button" className="btn big lime" onClick={() => updateActiveSession((x) => ({ ...x, finisher: startFinisher(Date.now()), updatedAt: Date.now() }))}>
            <Play fill="currentColor" aria-hidden /> Start circuit
          </button>
          <button type="button" className="btn ghost" style={{ color: '#fff', marginTop: 6 }} onClick={() => { updateActiveSession((x) => endSession(x)); navigate('/session/review', { replace: true }); }}>Skip finisher and review</button>
        </div>
      </>
    );
  }

  if (f.status === 'completed' || f.status === 'ended') {
    return (
      <>
        {header}
        <div className="center mt24">
          <div className="summary-head" style={{ margin: 0, padding: 0, background: 'none' }}><div className="check"><Check size={40} strokeWidth={3} aria-hidden /></div></div>
          <h1 className="h1">{f.status === 'completed' ? 'Finisher complete' : 'Finisher ended'}</h1>
          <p>Time: <strong>{fmtClock(f.actualSec ?? 0)}</strong></p>
        </div>
        <div className="footer"><button type="button" className="btn big lime" onClick={() => { updateActiveSession((x) => endSession(x)); navigate('/session/review', { replace: true }); }}>Review session</button></div>
      </>
    );
  }

  const iv = pos.interval;
  const ex = getExercise(iv.exerciseId);
  const paused = f.status === 'paused';
  const frac = Math.min(1, pos.intervalElapsedMs / (iv.durationSec * 1000));
  const R = 140, C = 2 * Math.PI * R;
  const nextLabel = iv.kind === 'transition' ? `Then ${WORK_SEC} s work` : pos.next ? `Next · ${pos.next.label}` : 'Last interval';

  return (
    <>
      {header}
      <div className="center">
        <h1 className="h2" style={{ margin: '0 0 2px', fontSize: '2rem' }}>Abs finisher</h1>
        <p className="mt0" style={{ margin: 0 }}>5 min circuit · {fmtClock(pos.totalElapsedSec)} of {fmtClock(FINISHER_TOTAL_SEC)}</p>
      </div>
      <div className="ring-wrap">
        <svg viewBox="0 0 320 320" aria-hidden>
          <circle cx="160" cy="160" r={R} fill="none" stroke="#2f5544" strokeWidth="16" />
          <circle cx="160" cy="160" r={R} fill="none" stroke={iv.kind === 'work' ? 'var(--lime)' : '#ffffff'} strokeWidth="16" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * frac} />
        </svg>
        <div className="ring-center">
          <span className={`phase ${paused ? 'paused' : iv.kind}`}>{paused ? <><Pause size={14} aria-hidden /> Paused</> : iv.kind === 'work' ? 'Work' : 'Get ready'}</span>
          <span className="ring-time" role="timer" aria-label={`${pos.remainingSec} seconds left in ${iv.kind === 'work' ? 'work' : 'transition'}`}>{fmtClock(pos.remainingSec)}</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 600 }}>of {fmtClock(iv.durationSec)}</span>
        </div>
      </div>
      <div className="center" aria-live="polite">
        <div className="row" style={{ justifyContent: 'center' }}>
          <img src={ex.image} alt={ex.alt} style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 8 }} />
          <h2 className="fin-name">{iv.kind === 'transition' ? `Get ready: ${iv.label}` : iv.label}</h2>
        </div>
        <p style={{ fontSize: '1.2rem', fontWeight: 600, margin: '4px 0' }}>{nextLabel}</p>
      </div>
      <div className="dots" role="img" aria-label={`Station ${iv.station} of ${FINISHER_STATIONS.length}, round ${iv.round} of ${FINISHER_ROUNDS}`}>
        {FINISHER_STATIONS.map((_, i) => {
          const st = i + 1;
          const done = st < iv.station;
          return <span key={i} className={done ? 'done' : st === iv.station ? 'current' : ''}>{done && <Check size={12} strokeWidth={3.5} aria-hidden />}</span>;
        })}
      </div>
      <p className="center" style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Round {iv.round} of {FINISHER_ROUNDS}</p>
      <div className="footer">
        <div className="row">
          <button type="button" className="btn big lime grow" onClick={() => setF(paused ? resumeFinisher : pauseFinisher)}>
            {paused ? <><Play fill="currentColor" aria-hidden /> Resume</> : <><Pause fill="currentColor" aria-hidden /> Pause</>}
          </button>
          <button type="button" className="icon-btn on-dark" style={{ width: 64, height: 56, background: 'var(--dark-2)', border: '1px solid #2f5544' }} onClick={() => {
            let completed = false;
            updateActiveSession((x) => {
              if (!x.finisher) return x;
              const r = skipInterval(x.finisher, Date.now());
              completed = r.status === 'completed';
              return { ...x, finisher: r, updatedAt: Date.now() };
            });
            if (completed) {
              cue(app.settings.timerSound, app.settings.haptics, [200, 120, 400]);
              updateActiveSession((x) => endSession(x));
              navigate('/session/review', { replace: true });
            }
          }} aria-label={pos.next ? 'Skip to next interval' : 'Skip final interval and finish'}>
            <SkipForward fill="currentColor" aria-hidden />
          </button>
        </div>
      </div>
    </>
  );
}
