import type { FinisherState } from './types';

export interface Interval {
  kind: 'transition' | 'work';
  exerciseId: string;
  label: string;
  round: number; // 1-based
  station: number; // 1-based within the round
  durationSec: number;
  startSec: number;
}

export const FINISHER_ROUNDS = 2;
export const WORK_SEC = 45;
export const TRANSITION_SEC = 5;
export const FINISHER_STATIONS = [
  { exerciseId: 'dead-bug', label: 'Dead bug' },
  { exerciseId: 'side-plank', label: 'Left side plank' },
  { exerciseId: 'side-plank', label: 'Right side plank' },
];

/**
 * 2 rounds × 3 stations × (5 s transition + 45 s work) = 300 s exactly.
 * Each station opens with a labelled 5-second transition so the user can get into position;
 * the sequence ends when the final work interval ends.
 */
export function buildIntervals(): Interval[] {
  const out: Interval[] = [];
  let t = 0;
  for (let r = 1; r <= FINISHER_ROUNDS; r++) {
    FINISHER_STATIONS.forEach((s, i) => {
      out.push({ kind: 'transition', exerciseId: s.exerciseId, label: s.label, round: r, station: i + 1, durationSec: TRANSITION_SEC, startSec: t });
      t += TRANSITION_SEC;
      out.push({ kind: 'work', exerciseId: s.exerciseId, label: s.label, round: r, station: i + 1, durationSec: WORK_SEC, startSec: t });
      t += WORK_SEC;
    });
  }
  return out;
}

export const INTERVALS = buildIntervals();
export const FINISHER_TOTAL_SEC = INTERVALS.reduce((a, i) => a + i.durationSec, 0);

export function startFinisher(now: number): FinisherState {
  return { startedAt: now, pausedMs: 0, pausedAt: null, skippedMs: 0, status: 'running', actualSec: null, endedAt: null };
}

/** Real seconds the finisher has been running (excludes pauses and skipped time). */
export function actualMs(f: FinisherState, now: number): number {
  const end = f.endedAt ?? (f.pausedAt ?? now);
  return Math.max(0, end - f.startedAt - f.pausedMs);
}

/** Position on the 5:00 timeline (includes skipped time). */
export function timelineMs(f: FinisherState, now: number): number {
  return actualMs(f, now) + f.skippedMs;
}

export interface FinisherPosition {
  index: number;
  interval: Interval;
  remainingSec: number;
  intervalElapsedMs: number;
  totalElapsedSec: number;
  finished: boolean;
  next: Interval | null;
}

export function positionAt(f: FinisherState, now: number): FinisherPosition {
  const ms = Math.min(timelineMs(f, now), FINISHER_TOTAL_SEC * 1000);
  const finished = ms >= FINISHER_TOTAL_SEC * 1000;
  let index = INTERVALS.findIndex((iv) => ms < (iv.startSec + iv.durationSec) * 1000);
  if (index === -1) index = INTERVALS.length - 1;
  const interval = INTERVALS[index];
  const intervalElapsedMs = finished ? interval.durationSec * 1000 : ms - interval.startSec * 1000;
  return {
    index,
    interval,
    remainingSec: finished ? 0 : Math.ceil((interval.durationSec * 1000 - intervalElapsedMs) / 1000),
    intervalElapsedMs,
    totalElapsedSec: Math.floor(ms / 1000),
    finished,
    next: INTERVALS[index + 1] ?? null,
  };
}

export function pauseFinisher(f: FinisherState, now: number): FinisherState {
  if (f.status !== 'running') return f;
  return { ...f, status: 'paused', pausedAt: now };
}

export function resumeFinisher(f: FinisherState, now: number): FinisherState {
  if (f.status !== 'paused' || f.pausedAt == null) return f;
  return { ...f, status: 'running', pausedMs: f.pausedMs + (now - f.pausedAt), pausedAt: null };
}

/** Jump to the start of the next interval. Skipping the last interval finishes the circuit. */
export function skipInterval(f: FinisherState, now: number): FinisherState {
  const pos = positionAt(f, now);
  const target = pos.next ? pos.next.startSec * 1000 : FINISHER_TOTAL_SEC * 1000;
  const jump = target - timelineMs(f, now);
  const next = { ...f, skippedMs: f.skippedMs + Math.max(0, jump) };
  return pos.next ? next : completeFinisher(next, now);
}

/** Called when the timeline reaches 5:00. Uses the exact moment the timeline ended, not "now", so late reconciliation is accurate. */
export function completeFinisher(f: FinisherState, now: number): FinisherState {
  if (f.status === 'completed' || f.status === 'ended') return f;
  const pausedNow = f.pausedAt != null ? now - f.pausedAt : 0;
  const over = Math.max(0, timelineMs(f, now) - FINISHER_TOTAL_SEC * 1000);
  const endedAt = now - over;
  const pausedMs = f.pausedMs + pausedNow;
  const done: FinisherState = { ...f, status: 'completed', pausedAt: null, pausedMs, endedAt };
  return { ...done, actualSec: Math.round(actualMs(done, endedAt) / 1000) };
}

export function endFinisherEarly(f: FinisherState, now: number): FinisherState {
  if (f.status === 'completed' || f.status === 'ended') return f;
  const pausedNow = f.pausedAt != null ? now - f.pausedAt : 0;
  const done: FinisherState = { ...f, status: 'ended', pausedAt: null, pausedMs: f.pausedMs + pausedNow, endedAt: now };
  return { ...done, actualSec: Math.round(actualMs(done, now) / 1000) };
}

/** Reconcile after reload or phone lock: if the timeline passed 5:00 while away, mark it completed. */
export function reconcileFinisher(f: FinisherState, now: number): FinisherState {
  if (f.status === 'running' && timelineMs(f, now) >= FINISHER_TOTAL_SEC * 1000) return completeFinisher(f, now);
  return f;
}
