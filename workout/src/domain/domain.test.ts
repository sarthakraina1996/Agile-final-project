import { describe, expect, it } from 'vitest';
import { addDays, startOfWeek, weekdayOf } from './dates';
import {
  buildIntervals, endFinisherEarly, FINISHER_TOTAL_SEC, pauseFinisher, positionAt, reconcileFinisher, resumeFinisher, skipInterval, startFinisher,
} from './finisher';
import { buildStarterTemplates, createPlan, moveOnce, moveRecurring, targetFor, templateIdFor, withTarget } from './plan';
import { exerciseSeries, splitSegments } from './progress';
import { addSet, bestSet, createDraft, endSession, lastPerformance, logSelectedSet, restRemaining, sessionStats, updateSetInput } from './session';
import { displayToKg, fmtLoad, kgToDisplay, parseDecimal } from './units';
import { measurementsCsv, setsCsv, workoutsCsv } from './csv';
import { zipFiles } from './zip';
import type { Profile, Session, Settings } from './types';

const SETTINGS: Settings = { loadUnit: 'kg', lengthUnit: 'cm', defaultRestSec: 90, timerSound: true, haptics: true };
const T0 = new Date(2026, 0, 5, 9, 0, 0).getTime(); // Monday 5 Jan 2026, 09:00 local

describe('abs finisher', () => {
  it('is 2 rounds × 3 stations × (5 s + 45 s) = exactly 5:00', () => {
    const iv = buildIntervals();
    expect(FINISHER_TOTAL_SEC).toBe(300);
    expect(iv).toHaveLength(12);
    expect(iv.filter((i) => i.kind === 'work').map((i) => i.label)).toEqual(['Dead bug', 'Left side plank', 'Right side plank', 'Dead bug', 'Left side plank', 'Right side plank']);
    expect(iv.every((i) => i.durationSec === (i.kind === 'work' ? 45 : 5))).toBe(true);
  });
  it('pause freezes, resume continues, skip advances exactly one interval', () => {
    let f = startFinisher(T0);
    expect(positionAt(f, T0 + 7000).interval.kind).toBe('work');
    expect(positionAt(f, T0 + 7000).remainingSec).toBe(43);
    f = pauseFinisher(f, T0 + 7000);
    expect(positionAt(f, T0 + 60000).remainingSec).toBe(43);
    f = resumeFinisher(f, T0 + 60000);
    expect(positionAt(f, T0 + 61000).remainingSec).toBe(42);
    f = skipInterval(f, T0 + 61000);
    const p = positionAt(f, T0 + 61000);
    expect(p.index).toBe(2);
    expect(p.interval.kind).toBe('transition');
    expect(p.interval.label).toBe('Left side plank');
  });
  it('records actual time and completion; reconciles time spent away', () => {
    const f = startFinisher(T0);
    const r = reconcileFinisher(f, T0 + 400_000);
    expect(r.status).toBe('completed');
    expect(r.actualSec).toBe(300);
    const e = endFinisherEarly(startFinisher(T0), T0 + 90_000);
    expect(e.status).toBe('ended');
    expect(e.actualSec).toBe(90);
  });
  it('skipping the final interval completes the circuit', () => {
    let f = startFinisher(T0);
    for (let i = 0; i < 12; i++) f = skipInterval(f, T0 + 1000);
    expect(f.status).toBe('completed');
  });
});

describe('plan & schedule', () => {
  const today = '2026-01-07'; // Wednesday
  it('4 days → Mon/Tue/Thu/Sat with rest Wed/Fri/Sun', () => {
    const plan = createPlan(4, today, T0);
    const wk = startOfWeek(today);
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => templateIdFor(plan, addDays(wk, i)))).toEqual(['upper-a', 'lower-a', null, 'upper-b', null, 'lower-b', null]);
  });
  it('one-date move changes only that date; recurring move keeps earlier weeks', () => {
    const plan = createPlan(4, '2025-12-30', T0);
    const thu = '2026-01-08', fri = '2026-01-09';
    const once = moveOnce(plan, thu, fri);
    expect(templateIdFor(once, thu)).toBeNull();
    expect(templateIdFor(once, fri)).toBe('upper-b');
    expect(templateIdFor(once, addDays(fri, 7))).toBeNull();
    const rec = moveRecurring(plan, 3, 4, thu, T0 + 1);
    expect(templateIdFor(rec, fri)).toBe('upper-b');
    expect(templateIdFor(rec, addDays(fri, 7))).toBe('upper-b');
    expect(templateIdFor(rec, '2026-01-01')).toBe('upper-b'); // earlier week (Thu 1 Jan) unchanged
    expect(weekdayOf('2026-01-01')).toBe(3);
  });
  it('weekly targets are versioned by week', () => {
    let p: Profile = { name: 'A', goal: 'strength', sessionLength: '45-60', createdAt: 0, targets: [{ effectiveFrom: '2025-12-29', sessionsPerWeek: 4 }] };
    p = withTarget(p, 3, '2026-01-12');
    expect(targetFor(p, '2026-01-07')).toBe(4);
    expect(targetFor(p, '2026-01-14')).toBe(3);
  });
  it('session length trims exercises; finisher defaults on', () => {
    const t = buildStarterTemplates('strength', '45-60');
    const ua = t.find((x) => x.id === 'upper-a')!;
    expect(ua.exercises.map((e) => e.exerciseId)).toEqual(['bench-press', 'incline-dumbbell-press', 'seated-cable-row', 'lateral-raise', 'face-pull']);
    expect(ua.finisher).toBe(true);
  });
});

function completeSession(s: Session, at: number): Session {
  return { ...endSession(s, at), status: 'completed', savedAt: at };
}

describe('live session', () => {
  const tpl = buildStarterTemplates('strength', '45-60').find((t) => t.id === 'upper-a')!;
  it('logs sets with validation, starts rest, selects next set', () => {
    let s = createDraft(tpl, '2026-01-05', [], 90, 'kg', T0);
    s = { ...s, currentIndex: 1 }; // incline dumbbell press (per hand)
    s = updateSetInput(s, 1, 0, { loadInput: '', repsInput: '10' });
    const bad = logSelectedSet(s, 'kg', T0);
    expect(bad.errors.load).toBeTruthy();
    s = updateSetInput(s, 1, 0, { loadInput: '20', repsInput: '10' });
    s = logSelectedSet(s, 'kg', T0 + 1000).session;
    expect(s.exercises[1].sets[0]).toMatchObject({ done: true, loadKg: 20, reps: 10 });
    expect(s.selectedSet).toBe(1);
    expect(s.rest?.durationSec).toBe(90);
    expect(restRemaining(s, T0 + 31_000)).toBe(60);
    expect(s.exercises[1].sets[1].loadInput).toBe('20'); // carried forward
    s = updateSetInput(s, 1, 1, { loadInput: '22', repsInput: '8' });
    s = logSelectedSet(s, 'kg', T0 + 120_000).session;
    expect(s.exercises[1].sets[1]).toMatchObject({ loadKg: 22, reps: 8, done: true });
    s = addSet(s, 'kg');
    expect(s.exercises[1].sets).toHaveLength(4);
    expect(sessionStats(s)).toEqual({ exercises: 1, sets: 2 });
  });
  it('lb entry is stored as kg at full precision and displays back unchanged', () => {
    let s = createDraft(tpl, '2026-01-05', [], 90, 'lb', T0);
    s = updateSetInput(s, 0, 0, { loadInput: '135', repsInput: '5' });
    s = logSelectedSet(s, 'lb', T0).session;
    const kg = s.exercises[0].sets[0].loadKg!;
    expect(kg).toBeCloseTo(61.235, 3);
    expect(fmtLoad(kg, 'lb')).toBe('135');
    expect(fmtLoad(kg, 'kg')).toBe('61.2');
  });
  it('last session comes from the most recent completed workout containing the exercise', () => {
    let a = createDraft(tpl, '2026-01-05', [], 90, 'kg', T0);
    a = updateSetInput(a, 0, 0, { loadInput: '60', repsInput: '5' });
    a = completeSession(logSelectedSet(a, 'kg', T0).session, T0 + 3_000_000);
    let b = createDraft(tpl, '2026-01-08', [a], 90, 'kg', T0 + 86_400_000 * 3);
    expect(b.exercises[0].sets[0].loadInput).toBe('60'); // prefilled from history
    b = updateSetInput(b, 0, 0, { loadInput: '62.5', repsInput: '5' });
    b = completeSession(logSelectedSet(b, 'kg', T0 + 86_400_000 * 3).session, T0 + 86_400_000 * 3 + 3_000_000);
    expect(lastPerformance([a, b], 'bench-press')!.session.id).toBe(b.id);
    expect(bestSet(b, 'kg')!.text).toBe('62.5 kg × 5');
  });
});

describe('progress', () => {
  it('plots heaviest completed set per session, ties broken by reps; counts only saved sessions', () => {
    const tpl = buildStarterTemplates('strength', '45-60').find((t) => t.id === 'upper-a')!;
    let s = createDraft(tpl, '2026-01-05', [], 90, 'kg', T0);
    for (const [load, reps] of [['80', '3'], ['80', '5'], ['75', '8']]) {
      s = updateSetInput(s, 0, s.selectedSet, { loadInput: load, repsInput: reps });
      s = logSelectedSet(s, 'kg', T0).session;
    }
    const draftOnly = exerciseSeries([s], 'bench-press', '2025-01-01');
    expect(draftOnly).toHaveLength(0);
    const saved = completeSession(s, T0 + 1000);
    const series = exerciseSeries([saved], 'bench-press', '2025-01-01');
    expect(series).toEqual([{ date: '2026-01-05', sessionId: saved.id, value: 80, reps: 5 }]);
  });
  it('breaks lines across long gaps', () => {
    const segs = splitSegments([{ date: '2026-01-01' }, { date: '2026-01-08' }, { date: '2026-03-01' }]);
    expect(segs.map((x) => x.length)).toEqual([2, 1]);
  });
});

describe('units, csv, zip', () => {
  it('parses decimals with comma or dot and rejects junk', () => {
    expect(parseDecimal('93,5')).toBe(93.5);
    expect(parseDecimal('.5')).toBe(0.5);
    expect(Number.isNaN(parseDecimal('9x'))).toBe(true);
    expect(kgToDisplay(displayToKg(205.3, 'lb'), 'lb')).toBeCloseTo(205.3, 9);
  });
  it('exports labelled rows with dates and units, converting only for display', () => {
    const tpl = buildStarterTemplates('strength', '45-60').find((t) => t.id === 'upper-a')!;
    let s = createDraft(tpl, '2026-01-05', [], 90, 'kg', T0);
    s = { ...s, currentIndex: 1, selectedSet: 0 };
    s = updateSetInput(s, 1, 0, { loadInput: '20', repsInput: '10' });
    s = completeSession(logSelectedSet(s, 'kg', T0).session, T0 + 2_880_000);
    const csv = setsCsv([s], { ...SETTINGS, loadUnit: 'lb' });
    const [header, row] = csv.trim().split('\r\n');
    expect(header).toBe('session_id,date,workout,exercise_id,exercise,set_number,mode,load_convention,load,load_unit,load_stored,stored_unit,reps,seconds,completed_local');
    expect(row).toContain(',2026-01-05,Upper body A,incline-dumbbell-press,Incline dumbbell press,1,weighted,per_hand,44.1,lb,20,kg,10,,');
    expect(workoutsCsv([s])).toContain(',48,');
    const m = measurementsCsv([{ id: 'm1', metric: 'waist', value: 81.28, date: '2026-01-05', note: 'a, "b"', createdAt: 0, updatedAt: 0 }], { ...SETTINGS, lengthUnit: 'in' });
    expect(m.trim().split('\r\n')[1]).toBe('m1,2026-01-05,waist,32.0,in,81.28,cm,"a, ""b"""');
  });
  it('builds a valid zip structure', () => {
    const z = zipFiles([{ name: 'a.csv', text: 'x\r\n' }, { name: 'b.csv', text: 'y\r\n' }]);
    const v = new DataView(z.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    expect(v.getUint32(z.length - 22, true)).toBe(0x06054b50);
    expect(v.getUint16(z.length - 22 + 10, true)).toBe(2);
  });
});
