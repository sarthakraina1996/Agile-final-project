import { toLocalDate } from './dates';
import { FINISHER_TOTAL_SEC } from './finisher';
import { canonicalUnit, cmToDisplay, kgToDisplay, metricUnit, round } from './units';
import type { Measurement, Session, Settings } from './types';

function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
const iso = (ms: number | null) => (ms == null ? '' : new Date(ms).toISOString());
const localTime = (ms: number | null) => {
  if (ms == null) return '';
  const d = new Date(ms);
  return `${toLocalDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function workoutsCsv(sessions: Session[]): string {
  const done = sessions.filter((s) => s.status === 'completed').sort((a, b) => a.startedAt - b.startedAt);
  return toCsv(
    ['session_id', 'date', 'started_local', 'started_utc', 'workout', 'routine_type', 'template_id', 'template_version', 'active_duration_sec', 'active_duration_min', 'exercises_performed', 'sets_logged', 'finisher_status', 'finisher_sec', 'notes'],
    done.map((s) => {
      const performed = s.exercises.filter((e) => e.sets.some((x) => x.done));
      return [
        s.id, s.startDate, localTime(s.startedAt), iso(s.startedAt), s.title, s.category, s.templateId, s.templateVersion,
        s.activeSec ?? '', s.activeSec != null ? round(s.activeSec / 60, 1) : '', performed.length,
        performed.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0),
        s.finisher ? s.finisher.status : 'not_started', s.finisher?.actualSec ?? '', s.notes,
      ];
    }),
  );
}

export function setsCsv(sessions: Session[], settings: Settings): string {
  const rows: unknown[][] = [];
  const unit = settings.loadUnit;
  for (const s of sessions.filter((x) => x.status === 'completed').sort((a, b) => a.startedAt - b.startedAt)) {
    for (const ex of s.exercises) {
      ex.sets.forEach((set, i) => {
        if (!set.done) return;
        const weighted = ex.mode === 'weighted' && set.loadKg != null;
        rows.push([
          s.id, s.startDate, s.title, ex.exerciseId, ex.name, i + 1, ex.mode,
          weighted ? (ex.loadConvention === 'perHand' ? 'per_hand' : 'total') : '',
          weighted ? round(kgToDisplay(set.loadKg!, unit), 1) : '', weighted ? unit : '',
          weighted ? round(set.loadKg!, 4) : '', weighted ? 'kg' : '',
          set.reps ?? '', set.seconds ?? '', localTime(set.completedAt),
        ]);
      });
    }
  }
  return toCsv(['session_id', 'date', 'workout', 'exercise_id', 'exercise', 'set_number', 'mode', 'load_convention', 'load', 'load_unit', 'load_stored', 'stored_unit', 'reps', 'seconds', 'completed_local'], rows);
}

export function finishersCsv(sessions: Session[]): string {
  const rows = sessions
    .filter((s) => s.status === 'completed' && s.finisher)
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((s) => [s.id, s.startDate, s.title, s.finisher!.status, s.finisher!.status === 'completed' ? 'yes' : 'no', s.finisher!.actualSec ?? '', 'sec', FINISHER_TOTAL_SEC, round(s.finisher!.skippedMs / 1000, 0), localTime(s.finisher!.startedAt), localTime(s.finisher!.endedAt)]);
  return toCsv(['session_id', 'date', 'workout', 'status', 'completed', 'actual_time', 'time_unit', 'planned_time_sec', 'skipped_sec', 'started_local', 'ended_local'], rows);
}

export function measurementsCsv(list: Measurement[], settings: Settings): string {
  const rows = [...list]
    .sort((a, b) => a.date.localeCompare(b.date) || a.metric.localeCompare(b.metric))
    .map((m) => {
      const display = m.metric === 'weight' ? kgToDisplay(m.value, settings.loadUnit) : m.metric === 'waist' ? cmToDisplay(m.value, settings.lengthUnit) : m.value;
      return [m.id, m.date, m.metric, round(display, 1).toFixed(1), metricUnit(m.metric, settings.loadUnit, settings.lengthUnit), round(m.value, 4), canonicalUnit(m.metric), m.note];
    });
  return toCsv(['entry_id', 'date', 'metric', 'value', 'unit', 'value_stored', 'stored_unit', 'note'], rows);
}
