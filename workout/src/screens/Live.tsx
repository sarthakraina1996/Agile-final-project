import { Check, ChevronLeft, ChevronRight, Flame, Info, ListOrdered, Minus, Plus, SkipForward, Timer, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { activeSession, completedSessions, showToast, updateActiveSession, useApp } from '../data/store';
import { fmtClock, fmtShort } from '../domain/dates';
import { getExercise } from '../domain/exercises';
import {
  addSet, adjustRest, endSession, goToExercise, lastPerformance, liveElapsedSec, logSelectedSet, removeOpenSet, restRemaining, selectSet,
  setRestDuration, SetErrors, setSummary, skipRest, unlogSet, updateSetInput,
} from '../domain/session';
import { fmtLoad, loadUnitLabel } from '../domain/units';
import type { SessionExercise, SetEntry } from '../domain/types';
import { back, navigate } from '../nav/router';
import { revealOnFocus, Sheet, Stepper, TopBar, useNow } from '../ui/components';

let audioCtx: AudioContext | null = null;
export function cue(sound: boolean, haptics: boolean, pattern: number[] = [180]) {
  if (haptics && typeof navigator.vibrate === 'function') { try { navigator.vibrate(pattern); } catch { /* unsupported */ } }
  if (!sound) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    audioCtx ??= new AC();
    const ctx = audioCtx;
    void ctx.resume?.();
    pattern.forEach((_, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.25;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.start(t); o.stop(t + 0.2);
    });
  } catch { /* audio unavailable */ }
}

export function LiveWorkout() {
  const app = useApp();
  const s = activeSession(app);
  const now = useNow(250, !!s);
  const [errors, setErrors] = useState<SetErrors>({});
  const [listOpen, setListOpen] = useState(false);
  const [restOpen, setRestOpen] = useState(false);
  const firedFor = useRef<number | null>(null);
  const unit = app.settings.loadUnit;

  const remaining = s ? restRemaining(s, now) : 0;
  // Rest finished: cue once (only if it ends while the app is open), then clear it.
  useEffect(() => {
    if (!s?.rest || remaining > 0) return;
    const endedAgo = now - (s.rest.startedAt + s.rest.durationSec * 1000);
    if (firedFor.current !== s.rest.startedAt) {
      firedFor.current = s.rest.startedAt;
      if (endedAgo < 3000 && document.visibilityState === 'visible') {
        cue(app.settings.timerSound, app.settings.haptics, [180, 120, 180]);
        showToast('Rest over. Next set ready.');
      }
      updateActiveSession((x) => skipRest(x));
    }
  }, [remaining, s?.rest, now, app.settings.timerSound, app.settings.haptics]);

  useEffect(() => { setErrors({}); }, [s?.currentIndex, s?.selectedSet]);

  if (!s) {
    return (
      <>
        <TopBar title="Workout" onBack={() => back('/today')} />
        <p>There is no workout in progress.</p>
        <button type="button" className="btn" onClick={() => navigate('/today', { replace: true })}>Go to Today</button>
      </>
    );
  }

  const ex = s.exercises[s.currentIndex];
  const def = getExercise(ex.exerciseId);
  const isLast = s.currentIndex === s.exercises.length - 1;
  const selected = ex.sets[s.selectedSet] as SetEntry | undefined;
  const allDone = ex.sets.every((x) => x.done);
  const last = lastPerformance(completedSessions(app), ex.exerciseId, s.id);
  const lastSet = last ? (last.exercise.sets.filter((x) => x.done)[s.selectedSet] ?? last.exercise.sets.filter((x) => x.done).at(-1)) : null;
  const perHand = ex.mode === 'weighted' && ex.loadConvention === 'perHand';
  const loadHeader = loadUnitLabel(unit, perHand);

  const log = () => {
    const r = logSelectedSet(s, unit);
    setErrors(r.errors);
    if (r.session !== s) {
      updateActiveSession(() => r.session);
      if (app.settings.haptics) cue(false, true, [40]);
      const wasEdit = selected?.done;
      showToast(wasEdit ? `Set ${s.selectedSet + 1} updated` : `Set ${s.selectedSet + 1} logged · rest ${fmtClock(ex.restSec)}`);
    } else {
      setTimeout(() => (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus(), 0);
    }
  };
  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); log(); } };
  const setInput = (patch: Partial<Pick<SetEntry, 'loadInput' | 'repsInput' | 'secondsInput'>>) => updateActiveSession((x) => updateSetInput(x, x.currentIndex, x.selectedSet, patch));
  const goReview = () => { updateActiveSession((x) => endSession(x)); navigate('/session/review'); };
  const finisherDone = s.finisher && (s.finisher.status === 'completed' || s.finisher.status === 'ended');

  return (
    <div className="with-footer">
      <TopBar
        title={s.title}
        onBack={() => back('/today')}
        backLabel="Leave workout screen. The workout stays in progress"
        trailing={<span className="display-num" style={{ fontSize: '1.6rem', paddingRight: 8 }} role="timer" aria-label={`Elapsed ${fmtClock(liveElapsedSec(s, now))}`}>{fmtClock(liveElapsedSec(s, now))}</span>}
      />
      <div className="ex-nav">
        <button type="button" className="icon-btn boxed" disabled={s.currentIndex === 0} onClick={() => updateActiveSession((x) => goToExercise(x, x.currentIndex - 1))} aria-label="Previous exercise"><ChevronLeft aria-hidden /></button>
        <button type="button" className="btn secondary small grow" onClick={() => setListOpen(true)} aria-label={`Exercise ${s.currentIndex + 1} of ${s.exercises.length}. Show all exercises`}>
          <ListOrdered size={18} aria-hidden /> Exercise {s.currentIndex + 1} of {s.exercises.length}
        </button>
        <button type="button" className="icon-btn boxed" disabled={isLast} onClick={() => updateActiveSession((x) => goToExercise(x, x.currentIndex + 1))} aria-label="Next exercise"><ChevronRight aria-hidden /></button>
      </div>
      <div className="between" style={{ alignItems: 'flex-start' }}>
        <h1 className="ex-title">{ex.name}</h1>
        <button type="button" className="icon-btn" onClick={() => navigate(`/session/exercise/${ex.exerciseId}`)} aria-label={`${ex.name} technique and details`}><Info aria-hidden /></button>
      </div>
      <p className="muted small mt0" style={{ margin: '4px 0 10px' }}>
        Target {ex.targetSeconds ? `${ex.targetSets} × ${ex.targetSeconds} s` : `${ex.targetSets} × ${ex.targetReps} reps`} · {def.equipment}{perHand ? ' · log the weight of one dumbbell' : ''}
      </p>
      <img className="ex-photo" src={def.image} alt={def.alt} />

      <SetTable ex={ex} selectedIndex={s.selectedSet} unit={unit} loadHeader={loadHeader} errors={errors} onKey={onKey} setInput={setInput}
        onSelect={(i) => updateActiveSession((x) => selectSet(x, i))}
        onCheck={(i) => {
          if (ex.sets[i].done) { updateActiveSession((x) => selectSet(x, i)); return; }
          if (i !== s.selectedSet) { updateActiveSession((x) => selectSet(x, i)); setTimeout(() => document.getElementById('log-set')?.focus(), 0); return; }
          log();
        }}
      />
      {(errors.load || errors.reps || errors.seconds) && (
        <div className="error" role="alert" id="set-errors">⚠ {[errors.load, errors.reps, errors.seconds].filter(Boolean).join(' ')}</div>
      )}
      <div className="between mt8">
        <button type="button" className="btn ghost small" onClick={() => updateActiveSession((x) => addSet(x, unit))}><Plus size={18} aria-hidden /> Add set</button>
        {selected && !selected.done && ex.sets.length > 1 && (
          <button type="button" className="btn ghost small" onClick={() => updateActiveSession((x) => removeOpenSet(x, x.selectedSet))}><Trash2 size={18} aria-hidden /> Remove set {s.selectedSet + 1}</button>
        )}
        {selected?.done && (
          <button type="button" className="btn ghost small" onClick={() => updateActiveSession((x) => unlogSet(x, x.selectedSet))}>Mark set {s.selectedSet + 1} not done</button>
        )}
      </div>

      <div className="info-row">
        <span className="muted">Last session{last ? ` · ${fmtShort(last.session.startDate)}` : ''}</span>
        <strong>{lastSet && last ? setSummary(lastSet, last.exercise, unit) : 'No history yet'}</strong>
      </div>

      <div className={`rest-box${s.rest ? ' running' : ''}`} role="group" aria-label="Rest timer">
        <Timer size={22} aria-hidden />
        <span className="small" style={{ fontWeight: 600 }}>{s.rest ? 'Resting' : 'Rest'}</span>
        <button type="button" className="rest-time" onClick={() => setRestOpen(true)} aria-label={s.rest ? `Rest remaining ${fmtClock(remaining)}. Adjust` : `Rest after each set ${fmtClock(ex.restSec)}. Adjust`}>
          {fmtClock(s.rest ? Math.ceil(remaining) : ex.restSec)}
        </button>
        <button type="button" className="icon-btn boxed" aria-label="15 seconds less rest" onClick={() => updateActiveSession((x) => (x.rest ? adjustRest(x, -15) : setRestDuration(x, x.currentIndex, x.exercises[x.currentIndex].restSec - 15)))}><Minus aria-hidden /></button>
        <button type="button" className="icon-btn boxed" aria-label="15 seconds more rest" onClick={() => updateActiveSession((x) => (x.rest ? adjustRest(x, 15) : setRestDuration(x, x.currentIndex, x.exercises[x.currentIndex].restSec + 15)))}><Plus aria-hidden /></button>
        {s.rest && <button type="button" className="icon-btn boxed" aria-label="Skip rest" onClick={() => updateActiveSession((x) => skipRest(x))}><SkipForward aria-hidden /></button>}
      </div>
      <p className="sr-only" aria-live="polite">{s.rest && Math.ceil(remaining) % 30 === 0 ? `${Math.ceil(remaining)} seconds rest left` : ''}</p>

      {isLast && (
        <div className="panel pad mt16">
          <p className="mt0" style={{ fontWeight: 700 }}>Last exercise</p>
          <div className="stack">
            {s.finisherEnabled && (
              <button type="button" className="btn sage" onClick={() => navigate('/session/finisher')}>
                <Flame size={20} aria-hidden /> {finisherDone ? `Abs finisher · ${s.finisher!.status === 'completed' ? 'done ✓' : 'ended early'}` : s.finisher ? 'Return to abs finisher' : 'Start 5-min abs finisher'}
              </button>
            )}
            <button type="button" className="btn secondary" onClick={goReview}>Review session</button>
          </div>
        </div>
      )}

      <div className="footer">
        {selected ? (
          <button type="button" id="log-set" className="btn big" onClick={log}>
            {selected.done ? `Update set ${s.selectedSet + 1}` : `Log set ${s.selectedSet + 1}`}
          </button>
        ) : allDone && !isLast ? (
          <button type="button" className="btn big" onClick={() => updateActiveSession((x) => goToExercise(x, x.currentIndex + 1))}>
            Next: {s.exercises[s.currentIndex + 1].name} <ChevronRight aria-hidden />
          </button>
        ) : (
          <button type="button" className="btn big" onClick={s.finisherEnabled && !s.finisher ? () => navigate('/session/finisher') : goReview}>
            {s.finisherEnabled && !s.finisher ? <><Flame aria-hidden /> Abs finisher</> : 'Review session'}
          </button>
        )}
      </div>

      {listOpen && (
        <Sheet title="Exercises" onClose={() => setListOpen(false)}>
          <div className="list">
            {s.exercises.map((e, i) => {
              const d = e.sets.filter((x) => x.done).length;
              return (
                <button key={e.key} type="button" className="list-row" aria-current={i === s.currentIndex ? 'step' : undefined}
                  onClick={() => { updateActiveSession((x) => goToExercise(x, i)); setListOpen(false); }}>
                  <span className="lead">{d >= e.sets.length ? <Check aria-label="complete" /> : <span className="display-num" aria-hidden>{i + 1}</span>}</span>
                  <span className="label">{e.name}<span className="sub">{d} of {e.sets.length} sets logged{i === s.currentIndex ? ' · current' : ''}</span></span>
                  <ChevronRight className="chev" aria-hidden />
                </button>
              );
            })}
          </div>
          <div className="actions">
            {s.finisherEnabled && <button type="button" className="btn sage" onClick={() => { setListOpen(false); navigate('/session/finisher'); }}><Flame size={20} aria-hidden /> Abs finisher</button>}
            <button type="button" className="btn" onClick={() => { setListOpen(false); goReview(); }}>Finish and review</button>
          </div>
        </Sheet>
      )}
      {restOpen && (
        <RestSheet
          running={!!s.rest}
          current={s.rest ? Math.ceil(remaining) : ex.restSec}
          onClose={() => setRestOpen(false)}
          onApply={(sec, alsoRunning) => {
            updateActiveSession((x) => {
              if (alsoRunning && x.rest) return adjustRest(x, sec - restRemaining(x, Date.now()));
              return setRestDuration(x, x.currentIndex, sec);
            });
            setRestOpen(false);
          }}
          onSkip={() => { updateActiveSession((x) => skipRest(x)); setRestOpen(false); }}
        />
      )}
    </div>
  );
}

function SetTable({ ex, selectedIndex, unit, loadHeader, errors, onKey, setInput, onSelect, onCheck }: {
  ex: SessionExercise; selectedIndex: number; unit: 'kg' | 'lb'; loadHeader: string; errors: SetErrors;
  onKey: (e: React.KeyboardEvent) => void; setInput: (p: Partial<Pick<SetEntry, 'loadInput' | 'repsInput' | 'secondsInput'>>) => void;
  onSelect: (i: number) => void; onCheck: (i: number) => void;
}) {
  const weighted = ex.mode === 'weighted';
  const timed = ex.mode === 'timed';
  const shown = (set: SetEntry, field: 'load' | 'reps' | 'seconds') => {
    if (set.done) return field === 'load' ? fmtLoad(set.loadKg ?? 0, unit) : field === 'reps' ? set.reps : set.seconds;
    const v = field === 'load' ? set.loadInput : field === 'reps' ? set.repsInput : set.secondsInput;
    return v || '–';
  };
  return (
    <table className="set-table">
      <caption className="sr-only">Sets for {ex.name}. Selected row is editable.</caption>
      <thead>
        <tr>
          <th scope="col" className="setno">Set</th>
          {weighted && <th scope="col">{loadHeader}</th>}
          <th scope="col">{timed ? 'Seconds' : 'Reps'}</th>
          <th scope="col" className="check-cell"><Check size={18} aria-label="Done" /></th>
        </tr>
      </thead>
      <tbody>
        {ex.sets.map((set, i) => {
          const sel = i === selectedIndex;
          const rowLabel = `Set ${i + 1}`;
          return (
            <tr key={set.id} className={`${sel ? 'selected' : ''}${set.done ? ' done' : ''}`}>
              <td className="setno">{i + 1}</td>
              {weighted && (
                <td>
                  {sel ? (
                    <input className={`set-input${errors.load ? ' input-invalid' : ''}`} inputMode="decimal" enterKeyHint="done" autoComplete="off"
                      aria-label={`${rowLabel} load in ${loadHeader}`} aria-invalid={!!errors.load} aria-describedby={errors.load ? 'set-errors' : undefined}
                      value={set.loadInput} placeholder="0" onChange={(e) => setInput({ loadInput: e.target.value })} onKeyDown={onKey} onFocus={revealOnFocus} />
                  ) : (
                    <button type="button" className="cell-btn" onClick={() => onSelect(i)} aria-label={`${rowLabel}: ${shown(set, 'load')} ${loadHeader}${set.done ? ', logged. Edit' : '. Select'}`} style={set.done ? undefined : { color: 'var(--muted)' }}>{shown(set, 'load')}</button>
                  )}
                </td>
              )}
              <td>
                {sel ? (
                  <input className={`set-input${errors.reps || errors.seconds ? ' input-invalid' : ''}`} inputMode="numeric" pattern="[0-9]*" enterKeyHint="done" autoComplete="off"
                    aria-label={`${rowLabel} ${timed ? 'seconds' : 'reps'}`} aria-invalid={!!(errors.reps || errors.seconds)} aria-describedby={errors.reps || errors.seconds ? 'set-errors' : undefined}
                    value={timed ? set.secondsInput : set.repsInput} placeholder={String((timed ? ex.targetSeconds : ex.targetReps) ?? '')}
                    onChange={(e) => setInput(timed ? { secondsInput: e.target.value } : { repsInput: e.target.value })} onKeyDown={onKey} onFocus={revealOnFocus} />
                ) : (
                  <button type="button" className="cell-btn" onClick={() => onSelect(i)} aria-label={`${rowLabel}: ${shown(set, timed ? 'seconds' : 'reps')} ${timed ? 'seconds' : 'reps'}${set.done ? ', logged. Edit' : '. Select'}`} style={set.done ? undefined : { color: 'var(--muted)' }}>{shown(set, timed ? 'seconds' : 'reps')}</button>
                )}
              </td>
              <td className="check-cell">
                <button type="button" role="checkbox" className="checkbox" aria-checked={set.done} aria-label={set.done ? `${rowLabel} logged. Edit` : sel ? `Log ${rowLabel.toLowerCase()}` : `Select ${rowLabel.toLowerCase()}`} onClick={() => onCheck(i)}>
                  <span className="box">{set.done && <Check size={20} strokeWidth={3} aria-hidden />}</span>
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const PRESETS = [30, 45, 60, 90, 120, 180];
function RestSheet({ running, current, onClose, onApply, onSkip }: { running: boolean; current: number; onClose: () => void; onApply: (sec: number, alsoRunning: boolean) => void; onSkip: () => void }) {
  const [sec, setSec] = useState(Math.max(0, Math.round(current / 15) * 15 || current));
  return (
    <Sheet title={running ? 'Adjust rest' : 'Rest between sets'} onClose={onClose}>
      <p className="muted small mt0">{running ? 'Changes the time left on this rest.' : 'Applies to this exercise for the rest of this workout. The default for new workouts is in Settings.'}</p>
      <Stepper label="rest seconds" value={sec} onChange={setSec} step={15} min={0} max={600} format={fmtClock} />
      <div className="chips mt8" role="group" aria-label="Presets">
        {PRESETS.map((p) => <button key={p} type="button" className="chip" aria-pressed={p === sec} onClick={() => setSec(p)}>{fmtClock(p)}</button>)}
      </div>
      <div className="actions">
        <button type="button" className="btn" onClick={() => onApply(sec, running)}>Save</button>
        {running && <button type="button" className="btn secondary" onClick={onSkip}><SkipForward size={20} aria-hidden /> Skip rest</button>}
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}
