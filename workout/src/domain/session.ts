import { todayLocal } from './dates';
import { getExercise } from './exercises';
import { uid } from './plan';
import { displayToKg, fmtLoad, fmtNumber, kgToDisplay, loadUnitLabel, parseDecimal } from './units';
import type { LoadUnit, LocalDate, Session, SessionExercise, SetEntry, Template } from './types';

export function blankSet(): SetEntry {
  return { id: uid('set_'), loadKg: null, reps: null, seconds: null, done: false, completedAt: null, loadInput: '', repsInput: '', secondsInput: '' };
}

/** Most recent completed session containing a completed set (or timed entry) for this exercise. */
export function lastPerformance(sessions: Session[], exerciseId: string, excludeId?: string): { session: Session; exercise: SessionExercise } | null {
  let best: { session: Session; exercise: SessionExercise } | null = null;
  for (const s of sessions) {
    if (s.status !== 'completed' || s.id === excludeId) continue;
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId && e.sets.some((x) => x.done));
    if (ex && (!best || s.startedAt > best.session.startedAt)) best = { session: s, exercise: ex };
  }
  return best;
}

export function setSummary(set: Pick<SetEntry, 'loadKg' | 'reps' | 'seconds'>, ex: Pick<SessionExercise, 'mode' | 'loadConvention'>, unit: LoadUnit): string {
  if (ex.mode === 'timed') return `${set.seconds ?? 0} s`;
  if (ex.mode === 'bodyweight') return `${set.reps ?? 0} reps`;
  return `${fmtLoad(set.loadKg ?? 0, unit)} ${ex.loadConvention === 'perHand' ? `${unit}/hand` : unit} × ${set.reps ?? 0}`;
}

function prefillFrom(set: SetEntry, src: Pick<SetEntry, 'loadKg' | 'reps' | 'seconds'> | undefined, ex: SessionExercise, unit: LoadUnit): SetEntry {
  const next = { ...set };
  if (ex.mode === 'weighted') {
    next.loadInput = src?.loadKg != null ? fmtNumber(kgToDisplay(src.loadKg, unit), 2) : '';
    next.repsInput = src?.reps != null ? String(src.reps) : ex.targetReps ? String(ex.targetReps) : '';
  } else if (ex.mode === 'bodyweight') {
    next.repsInput = src?.reps != null ? String(src.reps) : ex.targetReps ? String(ex.targetReps) : '';
  } else {
    next.secondsInput = src?.seconds != null ? String(src.seconds) : ex.targetSeconds ? String(ex.targetSeconds) : '';
  }
  return next;
}

export function createDraft(
  template: Template, scheduledDate: LocalDate, history: Session[], restSec: number, unit: LoadUnit, now = Date.now(),
): Session {
  const exercises: SessionExercise[] = template.exercises.map((row) => {
    const def = getExercise(row.exerciseId);
    const ex: SessionExercise = {
      key: row.key,
      exerciseId: row.exerciseId,
      name: def.name,
      mode: def.mode,
      loadConvention: def.loadConvention,
      targetSets: row.sets,
      targetReps: row.reps,
      targetSeconds: row.seconds,
      restSec,
      sets: [],
    };
    const last = lastPerformance(history, row.exerciseId);
    ex.sets = Array.from({ length: row.sets }, (_, i) => {
      const src = last?.exercise.sets.filter((s) => s.done)[i] ?? last?.exercise.sets.filter((s) => s.done).at(-1);
      return prefillFrom(blankSet(), src, ex, unit);
    });
    return ex;
  });
  return {
    id: uid('ses_'),
    status: 'draft',
    templateId: template.id,
    templateVersion: template.version,
    title: template.name,
    category: template.category,
    scheduledDate,
    startedAt: now,
    startDate: todayLocal(now),
    exercises,
    currentIndex: 0,
    selectedSet: 0,
    rest: null,
    finisherEnabled: template.finisher,
    finisher: null,
    endedAt: null,
    activeSec: null,
    notes: '',
    savedAt: null,
    updatedAt: now,
  };
}

export interface SetErrors { load?: string; reps?: string; seconds?: string }

const intIn = (raw: string, min: number, max: number) => {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return NaN;
  const n = Number(t);
  return n >= min && n <= max ? n : NaN;
};

export function validateSet(set: SetEntry, ex: SessionExercise, unit: LoadUnit): { errors: SetErrors; value?: Pick<SetEntry, 'loadKg' | 'reps' | 'seconds'> } {
  const errors: SetErrors = {};
  let loadKg: number | null = null;
  let reps: number | null = null;
  let seconds: number | null = null;
  if (ex.mode === 'weighted') {
    const v = parseDecimal(set.loadInput);
    const maxDisplay = unit === 'kg' ? 500 : 1100;
    if (set.loadInput.trim() === '') errors.load = `Enter the load in ${loadUnitLabel(unit, ex.loadConvention === 'perHand')}.`;
    else if (Number.isNaN(v) || v < 0 || v > maxDisplay) errors.load = `Load must be a number from 0 to ${maxDisplay}.`;
    else loadKg = displayToKg(v, unit);
  }
  if (ex.mode !== 'timed') {
    reps = intIn(set.repsInput, 1, 200);
    if (Number.isNaN(reps)) { errors.reps = 'Reps must be a whole number from 1 to 200.'; reps = null; }
  } else {
    seconds = intIn(set.secondsInput, 1, 3600);
    if (Number.isNaN(seconds)) { errors.seconds = 'Seconds must be a whole number from 1 to 3600.'; seconds = null; }
  }
  if (Object.keys(errors).length) return { errors };
  return { errors, value: { loadKg, reps, seconds } };
}

function firstOpenSet(ex: SessionExercise): number {
  const i = ex.sets.findIndex((s) => !s.done);
  return i === -1 ? ex.sets.length : i;
}

/** Save the selected set, start rest and select the next open set. Returns null when validation fails. */
export function logSelectedSet(s: Session, unit: LoadUnit, now = Date.now()): { session: Session; errors: SetErrors } {
  const exIndex = s.currentIndex;
  const ex = s.exercises[exIndex];
  const setIndex = s.selectedSet;
  const set = ex.sets[setIndex];
  if (!set) return { session: s, errors: {} };
  const { errors, value } = validateSet(set, ex, unit);
  if (!value) return { session: s, errors };
  const wasDone = set.done;
  const updatedSet: SetEntry = {
    ...set, ...value, done: true, completedAt: set.completedAt ?? now,
    loadInput: value.loadKg != null ? fmtNumber(kgToDisplay(value.loadKg, unit), 2) : set.loadInput,
  };
  let sets = ex.sets.map((x, i) => (i === setIndex ? updatedSet : x));
  // Carry the logged values forward into the next untouched open set.
  const nextOpen = sets.findIndex((x, i) => i > setIndex && !x.done);
  if (nextOpen !== -1 && !wasDone) sets = sets.map((x, i) => (i === nextOpen ? prefillFrom(x, updatedSet, ex, unit) : x));
  const exercises = s.exercises.map((e, i) => (i === exIndex ? { ...e, sets } : e));
  const newEx = exercises[exIndex];
  return {
    errors: {},
    session: {
      ...s,
      exercises,
      selectedSet: firstOpenSet(newEx),
      // Editing an already-logged set does not restart rest.
      rest: wasDone ? s.rest : { startedAt: now, durationSec: ex.restSec, exerciseIndex: exIndex, setIndex },
      updatedAt: now,
    },
  };
}

export function updateSetInput(s: Session, exIndex: number, setIndex: number, patch: Partial<Pick<SetEntry, 'loadInput' | 'repsInput' | 'secondsInput'>>, now = Date.now()): Session {
  return {
    ...s,
    exercises: s.exercises.map((e, i) => (i !== exIndex ? e : { ...e, sets: e.sets.map((x, j) => (j === setIndex ? { ...x, ...patch } : x)) })),
    updatedAt: now,
  };
}

export function addSet(s: Session, unit: LoadUnit, now = Date.now()): Session {
  const ex = s.exercises[s.currentIndex];
  const lastDone = [...ex.sets].reverse().find((x) => x.done) ?? ex.sets.at(-1);
  const set = prefillFrom(blankSet(), lastDone && (lastDone.done ? lastDone : undefined), ex, unit);
  const sets = [...ex.sets, set];
  return {
    ...s,
    exercises: s.exercises.map((e, i) => (i === s.currentIndex ? { ...e, sets } : e)),
    selectedSet: firstOpenSet({ ...ex, sets }),
    updatedAt: now,
  };
}

/** Remove an open (not logged) set. Logged sets are never deleted here. */
export function removeOpenSet(s: Session, setIndex: number, now = Date.now()): Session {
  const ex = s.exercises[s.currentIndex];
  if (!ex.sets[setIndex] || ex.sets[setIndex].done || ex.sets.length <= 1) return s;
  const sets = ex.sets.filter((_, i) => i !== setIndex);
  return { ...s, exercises: s.exercises.map((e, i) => (i === s.currentIndex ? { ...e, sets } : e)), selectedSet: firstOpenSet({ ...ex, sets }), updatedAt: now };
}

export function unlogSet(s: Session, setIndex: number, now = Date.now()): Session {
  const ex = s.exercises[s.currentIndex];
  const sets = ex.sets.map((x, i) => (i === setIndex ? { ...x, done: false, completedAt: null } : x));
  return { ...s, exercises: s.exercises.map((e, i) => (i === s.currentIndex ? { ...e, sets } : e)), selectedSet: setIndex, updatedAt: now };
}

export function goToExercise(s: Session, index: number, now = Date.now()): Session {
  const i = Math.max(0, Math.min(s.exercises.length - 1, index));
  return { ...s, currentIndex: i, selectedSet: firstOpenSet(s.exercises[i]), updatedAt: now };
}

export function selectSet(s: Session, setIndex: number, now = Date.now()): Session {
  return { ...s, selectedSet: setIndex, updatedAt: now };
}

export function setRestDuration(s: Session, exIndex: number, restSec: number, now = Date.now()): Session {
  const sec = Math.max(0, Math.min(600, Math.round(restSec)));
  return { ...s, exercises: s.exercises.map((e, i) => (i === exIndex ? { ...e, restSec: sec } : e)), updatedAt: now };
}

export function restRemaining(s: Session, now: number): number {
  if (!s.rest) return 0;
  return Math.max(0, s.rest.durationSec - (now - s.rest.startedAt) / 1000);
}

export function adjustRest(s: Session, deltaSec: number, now = Date.now()): Session {
  if (!s.rest) return s;
  const elapsed = (now - s.rest.startedAt) / 1000;
  const durationSec = Math.max(Math.ceil(elapsed), s.rest.durationSec + deltaSec);
  return { ...s, rest: { ...s.rest, durationSec }, updatedAt: now };
}

export function skipRest(s: Session, now = Date.now()): Session {
  return { ...s, rest: null, updatedAt: now };
}

export const exerciseCounts = (e: SessionExercise) => e.sets.some((x) => x.done);

/** Active duration = start to review, excluding nothing; finisher time is reported separately but is inside this window. */
export function endSession(s: Session, now = Date.now()): Session {
  if (s.endedAt) return s;
  return { ...s, endedAt: now, activeSec: Math.round((now - s.startedAt) / 1000), rest: null, updatedAt: now };
}

export function reopenSession(s: Session, now = Date.now()): Session {
  return { ...s, endedAt: null, activeSec: null, updatedAt: now };
}

export interface BestSet { exerciseId: string; name: string; text: string }

/** Epley estimate, used only to rank sets of different exercises. */
const e1rm = (kg: number, reps: number) => kg * (1 + reps / 30);

export function bestSet(s: Session, unit: LoadUnit): BestSet | null {
  let best: { score: number; ex: SessionExercise; set: SetEntry } | null = null;
  for (const ex of s.exercises) {
    if (ex.mode !== 'weighted') continue;
    for (const set of ex.sets) {
      if (!set.done || set.loadKg == null || set.reps == null) continue;
      const total = ex.loadConvention === 'perHand' ? set.loadKg * 2 : set.loadKg;
      const score = e1rm(total, set.reps);
      if (!best || score > best.score) best = { score, ex, set };
    }
  }
  if (!best) {
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (!set.done) continue;
        const score = ex.mode === 'timed' ? (set.seconds ?? 0) / 10 : set.reps ?? 0;
        if (!best || score > best.score) best = { score, ex, set };
      }
    }
  }
  if (!best) return null;
  return { exerciseId: best.ex.exerciseId, name: best.ex.name, text: setSummary(best.set, best.ex, unit) };
}

export function sessionStats(s: Session) {
  const performed = s.exercises.filter(exerciseCounts);
  const sets = performed.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0);
  return { exercises: performed.length, sets };
}

export function liveElapsedSec(s: Session, now: number): number {
  return Math.max(0, Math.floor(((s.endedAt ?? now) - s.startedAt) / 1000));
}
