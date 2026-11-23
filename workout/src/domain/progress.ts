import { addDays, daysBetween, todayLocal } from './dates';
import { getExercise } from './exercises';
import type { LocalDate, Measurement, MetricKind, RangeKey, Session } from './types';

export const RANGE_DAYS: Record<RangeKey, number> = { '4w': 28, '12w': 84, '1y': 365 };
export const RANGE_LABEL: Record<RangeKey, string> = { '4w': '4 weeks', '12w': '12 weeks', '1y': '1 year' };

export function rangeStart(range: RangeKey, today: LocalDate = todayLocal()): LocalDate {
  return addDays(today, -RANGE_DAYS[range] + 1);
}

export interface ProgressPoint {
  date: LocalDate;
  sessionId: string;
  /** kg (per hand or total, per the exercise's convention), reps, or seconds. */
  value: number;
  reps: number | null;
}

/**
 * One point per saved session: the session's best completed set for the exercise.
 * - weighted: heaviest load, ties broken by more reps (same load convention only)
 * - bodyweight: most reps
 * - timed: longest hold
 */
export function exerciseSeries(sessions: Session[], exerciseId: string, from: LocalDate): ProgressPoint[] {
  const def = getExercise(exerciseId);
  const points: ProgressPoint[] = [];
  for (const s of sessions) {
    if (s.status !== 'completed' || s.startDate < from) continue;
    let best: ProgressPoint | null = null;
    for (const ex of s.exercises) {
      if (ex.exerciseId !== exerciseId || ex.loadConvention !== def.loadConvention || ex.mode !== def.mode) continue;
      for (const set of ex.sets) {
        if (!set.done) continue;
        if (def.mode === 'weighted') {
          if (set.loadKg == null) continue;
          const p = { date: s.startDate, sessionId: s.id, value: set.loadKg, reps: set.reps };
          if (!best || p.value > best.value + 1e-9 || (Math.abs(p.value - best.value) < 1e-9 && (p.reps ?? 0) > (best.reps ?? 0))) best = p;
        } else if (def.mode === 'bodyweight') {
          const p = { date: s.startDate, sessionId: s.id, value: set.reps ?? 0, reps: set.reps };
          if (!best || p.value > best.value) best = p;
        } else {
          const p = { date: s.startDate, sessionId: s.id, value: set.seconds ?? 0, reps: null };
          if (!best || p.value > best.value) best = p;
        }
      }
    }
    if (best) points.push({ ...best, date: s.startDate, sessionId: s.id });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date) || a.sessionId.localeCompare(b.sessionId));
}

/** Exercises that have at least one completed set in a saved session, most recent first. */
export function loggedExerciseIds(sessions: Session[]): string[] {
  const last = new Map<string, number>();
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    for (const ex of s.exercises) if (ex.sets.some((x) => x.done)) last.set(ex.exerciseId, Math.max(last.get(ex.exerciseId) ?? 0, s.startedAt));
  }
  return [...last.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

export function measurementSeries(list: Measurement[], metric: MetricKind, from: LocalDate): Measurement[] {
  return list.filter((m) => m.metric === metric && m.date >= from).sort((a, b) => a.date.localeCompare(b.date));
}

export function latestMeasurement(list: Measurement[], metric: MetricKind): Measurement | null {
  let best: Measurement | null = null;
  for (const m of list) if (m.metric === metric && (!best || m.date > best.date)) best = m;
  return best;
}

/** Break a line when consecutive entries are further apart than this. */
export const GAP_DAYS = 21;
export function splitSegments<T extends { date: LocalDate }>(points: T[], gapDays = GAP_DAYS): T[][] {
  const out: T[][] = [];
  for (const p of points) {
    const seg = out.at(-1);
    if (seg && daysBetween(seg.at(-1)!.date, p.date) <= gapDays) seg.push(p);
    else out.push([p]);
  }
  return out;
}

/** Saved sessions grouped by local start date and counted for the week starting `weekStart`. */
export function completedInWeek(sessions: Session[], weekStart: LocalDate): Session[] {
  const end = addDays(weekStart, 6);
  return sessions.filter((s) => s.status === 'completed' && s.startDate >= weekStart && s.startDate <= end);
}
