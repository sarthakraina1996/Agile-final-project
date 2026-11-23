import { CalendarDays, ChevronRight, History } from 'lucide-react';
import { completedSessions, setUi, useApp } from '../data/store';
import { fmtMinutes, fmtWithYear } from '../domain/dates';
import type { RoutineCategory } from '../domain/types';
import { navigate } from '../nav/router';
import { Empty, TopBar, useScrollRestore } from '../ui/components';

const FILTERS: { value: 'all' | RoutineCategory; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'upper', label: 'Upper' }, { value: 'lower', label: 'Lower' }, { value: 'full', label: 'Full body' }, { value: 'custom', label: 'Custom' },
];

export function HistoryScreen() {
  const app = useApp();
  useScrollRestore();
  const filter = app.ui.historyFilter ?? 'all';
  const all = completedSessions(app).sort((a, b) => b.startedAt - a.startedAt);
  const present = new Set(all.map((s) => s.category));
  const filters = FILTERS.filter((f) => f.value === 'all' || present.has(f.value as RoutineCategory) || f.value === filter);
  const list = filter === 'all' ? all : all.filter((s) => s.category === filter);
  return (
    <>
      <TopBar title="" />
      <h1 className="h1" style={{ marginTop: 0 }}>Workout history</h1>
      {all.length > 0 && (
        <div className="chips" role="group" aria-label="Filter by routine type">
          {filters.map((f) => <button key={f.value} type="button" className="chip" aria-pressed={filter === f.value} onClick={() => setUi({ historyFilter: f.value })}>{f.label}</button>)}
        </div>
      )}
      {all.length === 0 ? (
        <Empty icon={<History aria-hidden />} title="No workouts saved yet">
          <p className="muted small">Finish and save a session and it will appear here.</p>
          <button type="button" className="btn" onClick={() => navigate('/today')}>Go to Today</button>
        </Empty>
      ) : list.length === 0 ? (
        <Empty icon={<History aria-hidden />} title="No workouts of this type"><button type="button" className="btn secondary" onClick={() => setUi({ historyFilter: 'all' })}>Show all</button></Empty>
      ) : (
        <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {list.map((s) => (
            <li key={s.id}>
              <button type="button" className="list-row card" onClick={() => navigate(`/progress/history/record/${s.id}`)} aria-label={`${fmtWithYear(s.startDate)}, ${s.title}, ${fmtMinutes(s.activeSec ?? 0)}. Open summary`} style={{ minHeight: 76 }}>
                <span className="lead"><CalendarDays size={26} aria-hidden /></span>
                <span className="label"><span className="sub" style={{ color: 'var(--ink)' }}>{fmtWithYear(s.startDate)}</span><span style={{ fontFamily: 'var(--display)', fontSize: '1.45rem', fontWeight: 700 }}>{s.title}</span></span>
                <span className="value ink">{fmtMinutes(s.activeSec ?? 0)}</span>
                <ChevronRight className="chev" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
