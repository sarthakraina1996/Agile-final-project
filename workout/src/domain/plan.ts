import { addDays, startOfWeek, weekDates, weekdayOf } from './dates';
import { getExercise } from './exercises';
import type {
  Goal, LocalDate, Plan, Profile, RoutineCategory, ScheduleVersion, SessionLength, TargetSpec, Template, Weekday, WeekSchedule,
} from './types';

export const uid = (prefix = '') =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

type Row = [exerciseId: string, sets: number, reps: number | null, seconds?: number];

/** Starter routines. Rows are ordered by priority; session length trims the tail. */
const STARTER: Record<string, { name: string; category: RoutineCategory; rows: Row[] }> = {
  'upper-a': {
    name: 'Upper body A', category: 'upper',
    rows: [['bench-press', 3, 5], ['incline-dumbbell-press', 3, 8], ['seated-cable-row', 3, 10], ['lateral-raise', 2, 12], ['face-pull', 2, 15], ['triceps-pushdown', 2, 12], ['hammer-curl', 2, 12]],
  },
  'lower-a': {
    name: 'Lower body A', category: 'lower',
    rows: [['back-squat', 3, 5], ['romanian-deadlift', 3, 8], ['dumbbell-lunge', 3, 10], ['lying-leg-curl', 2, 12], ['standing-calf-raise', 3, 12], ['plank', 2, null, 45], ['hanging-leg-raise', 2, 10]],
  },
  'upper-b': {
    name: 'Upper body B', category: 'upper',
    rows: [['overhead-press', 3, 6], ['pull-up', 3, 8], ['one-arm-dumbbell-row', 3, 10], ['lat-pulldown', 2, 10], ['dumbbell-curl', 2, 12], ['triceps-dip', 2, 10], ['lateral-raise', 2, 15]],
  },
  'lower-b': {
    name: 'Lower body B', category: 'lower',
    rows: [['deadlift', 3, 5], ['leg-press', 3, 10], ['split-squat', 3, 8], ['hip-thrust', 3, 10], ['standing-calf-raise', 2, 15], ['hanging-leg-raise', 2, 10], ['plank', 2, null, 60]],
  },
  'full-a': {
    name: 'Full body A', category: 'full',
    rows: [['goblet-squat', 3, 10], ['bench-press', 3, 8], ['one-arm-dumbbell-row', 3, 10], ['romanian-deadlift', 3, 10], ['push-up', 2, 12], ['plank', 2, null, 45], ['dumbbell-curl', 2, 12]],
  },
  'full-b': {
    name: 'Full body B', category: 'full',
    rows: [['deadlift', 3, 5], ['overhead-press', 3, 8], ['lat-pulldown', 3, 10], ['dumbbell-lunge', 2, 10], ['face-pull', 2, 15], ['hanging-leg-raise', 2, 10], ['triceps-pushdown', 2, 12]],
  },
  'full-c': {
    name: 'Full body C', category: 'full',
    rows: [['back-squat', 3, 6], ['incline-dumbbell-press', 3, 10], ['seated-cable-row', 3, 10], ['hip-thrust', 3, 10], ['lateral-raise', 2, 12], ['dead-bug', 2, 10], ['hammer-curl', 2, 12]],
  },
};

/** Which starter routines run on which weekdays (Mon = 0). */
export const FREQUENCY_LAYOUT: Record<number, Partial<Record<Weekday, string>>> = {
  2: { 0: 'full-a', 3: 'full-b' },
  3: { 0: 'full-a', 2: 'full-b', 4: 'full-c' },
  4: { 0: 'upper-a', 1: 'lower-a', 3: 'upper-b', 5: 'lower-b' },
  5: { 0: 'upper-a', 1: 'lower-a', 2: 'upper-b', 4: 'lower-b', 5: 'full-a' },
  6: { 0: 'upper-a', 1: 'lower-a', 2: 'full-a', 3: 'upper-b', 4: 'lower-b', 5: 'full-b' },
};

const EXERCISES_FOR_LENGTH: Record<SessionLength, number> = { '30-45': 4, '45-60': 5, '60-75': 6, '75-90': 7 };

export const SESSION_LENGTH_LABEL: Record<SessionLength, string> = {
  '30-45': '30–45 min', '45-60': '45–60 min', '60-75': '60–75 min', '75-90': '75–90 min',
};
export const GOAL_LABEL: Record<Goal, string> = { strength: 'Build strength', muscle: 'Build muscle', fitness: 'Improve fitness' };

/** Rep targets shift with the goal; strength keeps the base prescription. */
function repsForGoal(goal: Goal, reps: number): number {
  if (goal === 'strength') return reps;
  if (goal === 'muscle') return reps <= 6 ? 8 : reps < 12 ? 10 : reps;
  return reps <= 6 ? 10 : Math.max(reps, 12);
}

export function emptySchedule(): WeekSchedule {
  return { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
}

export function buildStarterTemplates(goal: Goal, length: SessionLength, now = Date.now()): Template[] {
  const n = EXERCISES_FOR_LENGTH[length];
  return Object.entries(STARTER).map(([id, def]) => ({
    id,
    name: def.name,
    category: def.category,
    finisher: true,
    version: 1,
    updatedAt: now,
    exercises: def.rows.slice(0, n).map(([exerciseId, sets, reps, seconds], i): TargetSpec => {
      const ex = getExercise(exerciseId);
      return {
        key: `${id}-${i}`,
        exerciseId,
        sets,
        ...(ex.mode === 'timed' ? { seconds: seconds ?? 45 } : { reps: repsForGoal(goal, reps ?? 10) }),
      };
    }),
  }));
}

export function scheduleForFrequency(days: number): WeekSchedule {
  const layout = FREQUENCY_LAYOUT[Math.min(6, Math.max(2, days))];
  const s = emptySchedule();
  for (const [d, t] of Object.entries(layout)) s[Number(d) as Weekday] = t ?? null;
  return s;
}

export function createPlan(days: number, today: LocalDate, now = Date.now()): Plan {
  // Apply from the Monday of this week so the weekday strip is populated, but history only counts saved sessions.
  return { createdOn: today, schedules: [{ effectiveFrom: startOfWeek(today), days: scheduleForFrequency(days), createdAt: now }], overrides: {} };
}

export function scheduleVersionFor(plan: Plan, date: LocalDate): ScheduleVersion | null {
  let best: ScheduleVersion | null = null;
  for (const v of plan.schedules) {
    if (v.effectiveFrom <= date && (!best || v.effectiveFrom > best.effectiveFrom || (v.effectiveFrom === best.effectiveFrom && v.createdAt > best.createdAt))) best = v;
  }
  return best;
}

/** Template id scheduled for a date (after one-date overrides), or null for rest. */
export function templateIdFor(plan: Plan | null, date: LocalDate): string | null {
  if (!plan) return null;
  if (Object.prototype.hasOwnProperty.call(plan.overrides, date)) return plan.overrides[date];
  const v = scheduleVersionFor(plan, date);
  return v ? v.days[weekdayOf(date)] : null;
}

export function weekTemplateIds(plan: Plan | null, weekStart: LocalDate): (string | null)[] {
  return weekDates(weekStart).map((d) => templateIdFor(plan, d));
}

/** Move a scheduled workout for one date only. Swaps with any workout already on the target date. */
export function moveOnce(plan: Plan, from: LocalDate, to: LocalDate): Plan {
  const a = templateIdFor(plan, from);
  const b = templateIdFor(plan, to);
  return { ...plan, overrides: { ...plan.overrides, [from]: b, [to]: a } };
}

/**
 * Move a weekday in the recurring schedule from `effectiveFrom` onward.
 * Earlier weeks keep the previous schedule version, so past plans and history stay intact.
 * Swaps with whatever is on the target weekday.
 */
export function moveRecurring(plan: Plan, fromDay: Weekday, toDay: Weekday, effectiveFrom: LocalDate, now = Date.now()): Plan {
  const current = scheduleVersionFor(plan, effectiveFrom);
  const days = { ...(current?.days ?? emptySchedule()) };
  const a = days[fromDay];
  days[fromDay] = days[toDay];
  days[toDay] = a;
  return withScheduleVersion(plan, days, effectiveFrom, now);
}

export function withScheduleVersion(plan: Plan, days: WeekSchedule, effectiveFrom: LocalDate, now = Date.now()): Plan {
  const schedules = plan.schedules.filter((s) => s.effectiveFrom !== effectiveFrom).concat({ effectiveFrom, days, createdAt: now });
  // Overrides from the effective date onward were based on the old recurring pattern; drop only future ones.
  const overrides = Object.fromEntries(Object.entries(plan.overrides).filter(([d]) => d < effectiveFrom));
  return { ...plan, schedules, overrides };
}

/** Rebuild the recurring days for a new frequency while keeping the routine ids. */
export function applyFrequency(plan: Plan, days: number, effectiveFrom: LocalDate, now = Date.now()): Plan {
  return withScheduleVersion(plan, scheduleForFrequency(days), effectiveFrom, now);
}

export function targetFor(profile: Profile | null, date: LocalDate): number {
  if (!profile) return 0;
  const weekStart = startOfWeek(date);
  const sorted = [...profile.targets].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  if (!sorted.length) return 0;
  // The latest target that had started by this week; weeks before the first target use the first one.
  let best = sorted[0];
  for (const t of sorted) if (t.effectiveFrom <= weekStart) best = t;
  return best.sessionsPerWeek;
}

export function withTarget(profile: Profile, sessionsPerWeek: number, effectiveWeek: LocalDate): Profile {
  const targets = profile.targets.filter((t) => t.effectiveFrom !== effectiveWeek).concat({ effectiveFrom: effectiveWeek, sessionsPerWeek });
  targets.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return { ...profile, targets };
}

/** Rough duration: work + rest per set, plus setup per exercise. Finisher reported separately. */
export function estimateMinutes(t: Pick<Template, 'exercises'>, restSec: number): number {
  let sec = 0;
  for (const row of t.exercises) {
    const work = row.seconds ?? Math.max(30, (row.reps ?? 10) * 4);
    sec += row.sets * work + Math.max(0, row.sets - 1) * restSec + 120;
  }
  sec += 8 * 60; // warm-up
  return Math.max(10, Math.round(sec / 60 / 5) * 5);
}

export function targetLabel(row: { sets: number; reps?: number; seconds?: number }): string {
  return row.seconds ? `${row.sets} × ${row.seconds}s` : `${row.sets} × ${row.reps ?? 0}`;
}

export function nextScheduled(
  plan: Plan | null, after: LocalDate, isDone: (date: LocalDate, templateId: string) => boolean, horizon = 21,
): { date: LocalDate; templateId: string } | null {
  for (let i = 1; i <= horizon; i++) {
    const d = addDays(after, i);
    const t = templateIdFor(plan, d);
    if (t && !isDone(d, t)) return { date: d, templateId: t };
  }
  return null;
}
