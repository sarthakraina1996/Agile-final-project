/** Local calendar date, `YYYY-MM-DD`. Always derived from the device's local time zone. */
export type LocalDate = string;

export type LoadUnit = 'kg' | 'lb';
export type LengthUnit = 'cm' | 'in';
export type Goal = 'strength' | 'muscle' | 'fitness';
export type SessionLength = '30-45' | '45-60' | '60-75' | '75-90';
export type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core';
export type Equipment = 'Barbell' | 'Dumbbells' | 'Dumbbell' | 'Cable' | 'Machine' | 'Kettlebell' | 'Bodyweight' | 'Pull-up bar' | 'Dip bars';

/**
 * How an exercise is measured.
 * - `weighted`: external load + reps. `loadConvention` says whether the load is per hand or total.
 * - `bodyweight`: reps only.
 * - `timed`: seconds only.
 */
export type ExerciseMode = 'weighted' | 'bodyweight' | 'timed';
export type LoadConvention = 'total' | 'perHand';

export interface Exercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  /** Primary muscles in plain language, for the detail screen. */
  muscles: string;
  equipment: Equipment;
  mode: ExerciseMode;
  loadConvention: LoadConvention;
  image: string;
  alt: string;
  cues: string[];
}

export interface TargetSpec {
  /** Stable row id inside a template, so reorder / replace keep identity. */
  key: string;
  exerciseId: string;
  sets: number;
  reps?: number;
  seconds?: number;
}

export type RoutineCategory = 'upper' | 'lower' | 'full' | 'custom';

export interface Template {
  id: string;
  name: string;
  category: RoutineCategory;
  exercises: TargetSpec[];
  finisher: boolean;
  version: number;
  updatedAt: number;
}

/** Immutable snapshot of a template as it was at a given version. */
export interface TemplateVersion {
  id: string; // `${templateId}@${version}`
  templateId: string;
  version: number;
  snapshot: Template;
  createdAt: number;
}

/** Weekday index Monday = 0 … Sunday = 6. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type WeekSchedule = Record<Weekday, string | null>;

/** A recurring schedule that applies from `effectiveFrom` until a later version replaces it. */
export interface ScheduleVersion {
  effectiveFrom: LocalDate;
  days: WeekSchedule;
  createdAt: number;
}

export interface Plan {
  createdOn: LocalDate;
  schedules: ScheduleVersion[];
  /** One-date changes. `null` means rest that day. */
  overrides: Record<LocalDate, string | null>;
}

export interface TargetHistoryEntry {
  /** Monday of the first week this target applies to. */
  effectiveFrom: LocalDate;
  sessionsPerWeek: number;
}

export interface Profile {
  name: string;
  goal: Goal;
  sessionLength: SessionLength;
  targets: TargetHistoryEntry[];
  createdAt: number;
}

export interface Settings {
  loadUnit: LoadUnit;
  lengthUnit: LengthUnit;
  defaultRestSec: number;
  timerSound: boolean;
  haptics: boolean;
}

export interface SetEntry {
  id: string;
  /** Canonical kilograms, full precision. For per-hand loads this is the load in ONE hand. */
  loadKg: number | null;
  reps: number | null;
  seconds: number | null;
  done: boolean;
  completedAt: number | null;
  /** Raw text the user is typing (in display units) so drafts survive reloads. */
  loadInput: string;
  repsInput: string;
  secondsInput: string;
}

export interface SessionExercise {
  key: string;
  exerciseId: string;
  name: string;
  mode: ExerciseMode;
  loadConvention: LoadConvention;
  targetSets: number;
  targetReps?: number;
  targetSeconds?: number;
  restSec: number;
  sets: SetEntry[];
}

export interface RestTimer {
  startedAt: number;
  durationSec: number;
  exerciseIndex: number;
  setIndex: number;
}

export type FinisherStatus = 'running' | 'paused' | 'completed' | 'ended';

export interface FinisherState {
  startedAt: number;
  /** Total milliseconds spent paused so far. */
  pausedMs: number;
  /** When paused, the timestamp of the pause. */
  pausedAt: number | null;
  /** Milliseconds jumped forward by Skip (not counted as actual time). */
  skippedMs: number;
  status: FinisherStatus;
  /** Real time spent in the finisher, set when it finishes or ends. */
  actualSec: number | null;
  endedAt: number | null;
}

export interface Session {
  id: string;
  status: 'draft' | 'completed';
  templateId: string;
  templateVersion: number;
  title: string;
  category: RoutineCategory;
  scheduledDate: LocalDate;
  startedAt: number;
  /** Local date the session started on; used for grouping and weekly goals. */
  startDate: LocalDate;
  exercises: SessionExercise[];
  currentIndex: number;
  /** Index of the set selected for editing in the current exercise. */
  selectedSet: number;
  rest: RestTimer | null;
  finisherEnabled: boolean;
  finisher: FinisherState | null;
  /** Set when the user moves to the review screen. */
  endedAt: number | null;
  activeSec: number | null;
  notes: string;
  savedAt: number | null;
  updatedAt: number;
}

export type MetricKind = 'weight' | 'waist' | 'bodyfat';

export interface Measurement {
  id: string;
  metric: MetricKind;
  /** Canonical: kg for weight, cm for waist, % for body fat. */
  value: number;
  date: LocalDate;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export interface UiState {
  todaySelectedDate?: LocalDate;
  planWeekStart?: LocalDate;
  planSelectedDate?: LocalDate;
  progressRange?: RangeKey;
  progressExerciseId?: string;
  measurementMetric?: MetricKind;
  measurementRange?: RangeKey;
  historyFilter?: 'all' | RoutineCategory;
}

export type RangeKey = '4w' | '12w' | '1y';
