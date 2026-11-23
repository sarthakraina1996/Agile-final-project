import type { LocalDate, Weekday } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalDate(d: Date): LocalDate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayLocal(now: number = Date.now()): LocalDate {
  return toLocalDate(new Date(now));
}
/** Parse at local noon to stay clear of DST edges. */
export function parseLocal(date: LocalDate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}
export function addDays(date: LocalDate, days: number): LocalDate {
  const d = parseLocal(date);
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}
/** Monday = 0 … Sunday = 6 */
export function weekdayOf(date: LocalDate): Weekday {
  return ((parseLocal(date).getDay() + 6) % 7) as Weekday;
}
export function startOfWeek(date: LocalDate): LocalDate {
  return addDays(date, -weekdayOf(date));
}
export function weekDates(weekStart: LocalDate): LocalDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}
export function daysBetween(a: LocalDate, b: LocalDate): number {
  return Math.round((parseLocal(b).getTime() - parseLocal(a).getTime()) / 86400000);
}
export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_LETTER = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const WEEKDAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function fmtShort(date: LocalDate): string {
  return parseLocal(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
export function fmtLong(date: LocalDate): string {
  return parseLocal(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
export function fmtMedium(date: LocalDate): string {
  return parseLocal(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
export function fmtWithYear(date: LocalDate): string {
  return parseLocal(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** mm:ss, or h:mm:ss past an hour. */
export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
}
export function fmtMinutes(totalSec: number): string {
  if (totalSec > 0 && totalSec < 60) return `${Math.round(totalSec)} sec`;
  const m = Math.max(0, Math.round(totalSec / 60));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}
