import { BedDouble, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Layers, Pencil } from 'lucide-react';
import { useState } from 'react';
import { setUi, useApp } from '../data/store';
import { addDays, daysBetween, fmtShort, startOfWeek, todayLocal, weekDates, WEEKDAY_SHORT } from '../domain/dates';
import { templateIdFor } from '../domain/plan';
import { navigate } from '../nav/router';
import { DateSheet, ListRow, useScrollRestore } from '../ui/components';
import { completedFor } from './shared';

export function PlanScreen() {
  const app = useApp();
  useScrollRestore();
  const today = todayLocal();
  const weekStart = app.ui.planWeekStart ?? startOfWeek(today);
  const [pickOpen, setPickOpen] = useState(false);
  const planStart = startOfWeek(app.plan?.createdOn ?? today);
  const weekNo = Math.floor(daysBetween(planStart, weekStart) / 7) + 1;
  const days = weekDates(weekStart).map((d) => ({ date: d, tid: templateIdFor(app.plan, d) }));
  const scheduled = days.filter((d) => d.tid);
  const rest = days.filter((d) => !d.tid);
  const sel = scheduled.find((d) => d.date === app.ui.planSelectedDate) ?? scheduled.find((d) => d.date >= today) ?? scheduled[0];
  const setWeek = (ws: string) => setUi({ planWeekStart: ws });

  return (
    <>
      <h1 className="h1">Weekly plan</h1>
      <div className="week-nav">
        <button type="button" className="icon-btn" onClick={() => setWeek(addDays(weekStart, -7))} aria-label="Previous week"><ChevronLeft aria-hidden /></button>
        <button type="button" className="label" onClick={() => setPickOpen(true)} aria-label={`Week ${weekNo}, ${fmtShort(weekStart)} to ${fmtShort(addDays(weekStart, 6))}. Choose a week`}>
          <span>{weekNo >= 1 ? `Week ${weekNo}` : fmtShort(weekStart)}</span><ChevronDown size={18} aria-hidden />
        </button>
        <button type="button" className="icon-btn" onClick={() => setWeek(addDays(weekStart, 7))} aria-label="Next week"><ChevronRight aria-hidden /></button>
      </div>
      <p className="muted small mt0 center" aria-live="polite">{fmtShort(weekStart)} – {fmtShort(addDays(weekStart, 6))}{weekStart === startOfWeek(today) ? ' · this week' : ''}</p>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="Scheduled workouts">
        {scheduled.map(({ date, tid }) => {
          const t = app.templates[tid!];
          const done = completedFor(app, date, tid!);
          const i = weekDates(weekStart).indexOf(date);
          return (
            <li key={date} className={`plan-day${sel?.date === date ? ' selected' : ''}`}>
              <div className="day"><b><CalendarDays size={16} aria-hidden /> {WEEKDAY_SHORT[i]}</b><span className="small muted">{fmtShort(date)}{date === today ? ' · today' : ''}</span></div>
              <button type="button" className="main" onClick={() => { setUi({ planSelectedDate: date }); navigate(`/plan/day/${date}`); }}
                aria-label={`${WEEKDAY_SHORT[i]} ${fmtShort(date)}: ${t?.name}${done ? ', completed' : ''}. Open preview`}>
                <span className="t">{t?.name}</span>
                {done && <span className="pill sage"><Check size={14} aria-hidden /> Done</span>}
                <ChevronRight aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      {!scheduled.length && <p className="muted">No workouts scheduled this week.</p>}
      <p className="row muted mt16"><BedDouble aria-hidden /> Rest days: {rest.length ? rest.map((d) => WEEKDAY_SHORT[weekDates(weekStart).indexOf(d.date)]).join(', ') : 'none'}</p>

      <div className="list mt16">
        {sel && <ListRow icon={<Pencil aria-hidden />} label="Edit workout" sub={`${app.templates[sel.tid!]?.name} · changes apply to future workouts`} onClick={() => navigate(`/plan/day/${sel.date}/edit/${sel.tid}`)} />}
        <ListRow icon={<Layers aria-hidden />} label="Exercise library" onClick={() => navigate('/plan/library')} />
      </div>
      <p className="muted small">To move a session, open it and choose Move. You can change one date or the weekly schedule.</p>
      {pickOpen && <DateSheet title="Go to week" value={weekStart} onClose={() => setPickOpen(false)} onSelect={(d) => { setWeek(startOfWeek(d)); setPickOpen(false); }} />}
    </>
  );
}
