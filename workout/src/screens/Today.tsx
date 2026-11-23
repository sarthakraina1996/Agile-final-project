import { BedDouble, CalendarDays, Check, ChevronRight, Eye, Play, RotateCcw } from 'lucide-react';
import { activeSession, completedSessions, setUi, useApp } from '../data/store';
import { addDays, fmtLong, fmtMedium, fmtShort, startOfWeek, todayLocal, weekDates, WEEKDAY_LETTER, WEEKDAY_LONG, weekdayOf } from '../domain/dates';
import { getExercise } from '../domain/exercises';
import { nextScheduled, targetFor, templateIdFor } from '../domain/plan';
import { completedInWeek } from '../domain/progress';
import { navigate } from '../nav/router';
import { useScrollRestore } from '../ui/components';
import { completedFor, draftDescription, templateMeta, useStartWorkout } from './shared';

export function TodayScreen() {
  const app = useApp();
  useScrollRestore();
  const { start, sheet } = useStartWorkout();
  const today = todayLocal();
  const weekStart = startOfWeek(today);
  const selected = app.ui.todaySelectedDate && startOfWeek(app.ui.todaySelectedDate) === weekStart ? app.ui.todaySelectedDate : today;
  const tid = templateIdFor(app.plan, selected);
  const template = tid ? app.templates[tid] : null;
  const draft = activeSession(app);
  const done = template ? completedFor(app, selected, template.id) : null;
  const weekDone = completedInWeek(completedSessions(app), weekStart).length;
  const target = targetFor(app.profile, today);
  const isDone = (d: string, t: string) => !!completedFor(app, d, t);
  const upNext = nextScheduled(app.plan, selected, isDone);
  const draftMatches = draft && template && draft.templateId === template.id && draft.scheduledDate === selected;

  return (
    <>
      <h1 className="h1">Today</h1>
      <div className="week-strip" role="group" aria-label={`Week of ${fmtShort(weekStart)}`}>
        {weekDates(weekStart).map((d, i) => {
          const t = templateIdFor(app.plan, d);
          const completed = t ? isDone(d, t) : false;
          const label = `${WEEKDAY_LONG[i]} ${fmtShort(d)}${d === today ? ', today' : ''}: ${t ? app.templates[t]?.name : 'rest day'}${completed ? ', completed' : ''}`;
          return (
            <button key={d} type="button" className={`day-btn${d === today ? ' is-today' : ''}`} aria-pressed={d === selected} aria-label={label} onClick={() => setUi({ todaySelectedDate: d })}>
              <span aria-hidden>{WEEKDAY_LETTER[i]}</span>
              <span className="num" aria-hidden>{Number(d.slice(8))}</span>
              {completed ? <span className="mark" aria-hidden><Check size={11} strokeWidth={3.5} /></span> : <span className="tdot" aria-hidden style={{ visibility: t ? 'visible' : 'hidden' }} />}
            </button>
          );
        })}
      </div>

      {draft && !draftMatches && (
        <div className="banner info" role="status">
          <RotateCcw size={18} aria-hidden />
          <span className="grow small">In progress: {draftDescription(draft)}</span>
          <button type="button" className="btn small" onClick={() => navigate('/session')}>Resume</button>
        </div>
      )}

      <p className="muted small mt0" aria-live="polite">{selected === today ? 'Today' : fmtLong(selected)}</p>
      {template ? (
        <section className="hero" aria-label={`${template.name} workout`}>
          <img src={getExercise(template.exercises[0]?.exerciseId ?? 'bench-press').image} alt={getExercise(template.exercises[0]?.exerciseId ?? 'bench-press').alt} />
          {done && <span className="badge pill lime"><Check size={14} aria-hidden /> Completed</span>}
          <div className="hero-body">
            <h2 className="hero-title">{template.name}</h2>
            <p className="hero-meta">{templateMeta(template, app.settings.defaultRestSec)}{template.finisher ? ' · + 5 min abs' : ''}</p>
            {draftMatches ? (
              <button type="button" className="btn big" onClick={() => navigate('/session')}><RotateCcw aria-hidden /> Resume workout</button>
            ) : done ? (
              <div className="btn-row">
                <button type="button" className="btn secondary" onClick={() => navigate(`/today/record/${done.id}`)}><Eye size={20} aria-hidden /> View summary</button>
                <button type="button" className="btn" onClick={() => start(template.id, selected)}><Play size={20} aria-hidden /> Again</button>
              </div>
            ) : (
              <div className="btn-row">
                <button type="button" className="btn big" onClick={() => start(template.id, selected)}><Play fill="currentColor" aria-hidden /> Start workout</button>
              </div>
            )}
            <button type="button" className="link-btn" style={{ color: '#fff' }} onClick={() => navigate(`/today/day/${selected}`)}>Preview exercises</button>
          </div>
        </section>
      ) : (
        <section className="rest-card" aria-label="Rest day">
          <div className="row"><BedDouble size={28} aria-hidden /><h2 className="h2" style={{ margin: 0 }}>Rest day</h2></div>
          <p className="muted">Recover today. {upNext ? `Next up is ${app.templates[upNext.templateId]?.name} on ${fmtMedium(upNext.date)}.` : 'No workouts are scheduled in the next three weeks.'}</p>
          <div className="stack">
            {upNext && <button type="button" className="btn" onClick={() => (startOfWeek(upNext.date) === weekStart ? setUi({ todaySelectedDate: upNext.date }) : navigate(`/today/day/${upNext.date}`))}>Show next workout</button>}
            <button type="button" className="btn secondary" onClick={() => navigate('/plan')}><CalendarDays size={20} aria-hidden /> Browse plan</button>
          </div>
        </section>
      )}

      <section aria-labelledby="week-h">
        <div className="between">
          <h2 className="h2" id="week-h">This week</h2>
          <span className="mt16" style={{ fontWeight: 600 }}>{weekDone} of {target} sessions{weekDone >= target && target > 0 ? ' ✓' : ''}</span>
        </div>
        <div className="progress-bars" role="img" aria-label={`${weekDone} of ${target} sessions completed this week`}>
          {Array.from({ length: Math.max(target, weekDone) }, (_, i) => <span key={i} className={i < weekDone ? 'on' : ''} />)}
        </div>
      </section>

      <section aria-labelledby="next-h">
        <h2 className="h2" id="next-h">Up next</h2>
        {upNext ? (
          <div className="list">
            <button type="button" className="list-row" onClick={() => navigate(`/today/day/${upNext.date}`)}>
              <span className="lead"><CalendarDays aria-hidden /></span>
              <span className="label">{app.templates[upNext.templateId]?.name}<span className="sub">{upNext.date === addDays(today, 1) ? 'Tomorrow' : WEEKDAY_LONG[weekdayOf(upNext.date)]} · {fmtShort(upNext.date)}</span></span>
              <ChevronRight className="chev" aria-hidden />
            </button>
          </div>
        ) : (
          <p className="muted">Nothing scheduled. <button type="button" className="link-btn" onClick={() => navigate('/plan')}>Open plan</button></p>
        )}
      </section>
      {sheet}
    </>
  );
}
