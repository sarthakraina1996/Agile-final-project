import { ChevronRight, Dumbbell, History, LineChart as LineIcon, Ruler, Scale } from 'lucide-react';
import { completedSessions, setUi, useApp } from '../data/store';
import { fmtMinutes, fmtShort, todayLocal } from '../domain/dates';
import { EXERCISES, getExercise } from '../domain/exercises';
import { exerciseSeries, latestMeasurement, loggedExerciseIds, RANGE_LABEL, rangeStart, splitSegments } from '../domain/progress';
import { fmtFixed, fmtLoad, kgToDisplay, measurementToDisplay, metricUnit, round } from '../domain/units';
import type { MetricKind, RangeKey } from '../domain/types';
import { navigate } from '../nav/router';
import { Empty, LineChart, ListRow, Segmented, useScrollRestore } from '../ui/components';

export function ProgressScreen() {
  const app = useApp();
  useScrollRestore();
  const sessions = completedSessions(app);
  const range: RangeKey = app.ui.progressRange ?? '4w';
  const logged = loggedExerciseIds(sessions);
  const exId = app.ui.progressExerciseId ?? logged[0] ?? 'bench-press';
  const ex = getExercise(exId);
  const today = todayLocal();
  const from = rangeStart(range, today);
  const series = exerciseSeries(sessions, exId, from);
  const unit = app.settings.loadUnit;
  const perHand = ex.mode === 'weighted' && ex.loadConvention === 'perHand';
  const unitLabel = ex.mode === 'weighted' ? (perHand ? `${unit} / hand` : unit) : ex.mode === 'timed' ? 's' : 'reps';
  const disp = (v: number) => (ex.mode === 'weighted' ? kgToDisplay(v, unit) : v);
  const best = series.reduce<(typeof series)[number] | null>((a, p) => (!a || p.value > a.value || (p.value === a.value && (p.reps ?? 0) > (a.reps ?? 0)) ? p : a), null);
  const label = (p: (typeof series)[number]) => (ex.mode === 'weighted' ? `${fmtLoad(p.value, unit)} ${unitLabel} × ${p.reps}` : ex.mode === 'timed' ? `${p.value} s` : `${p.value} reps`);
  const points = series.map((p) => ({ date: p.date, value: round(disp(p.value), 2), label: label(p) }));
  const history = [...sessions].sort((a, b) => b.startedAt - a.startedAt);
  const others = EXERCISES.filter((e) => !logged.includes(e.id));

  return (
    <>
      <h1 className="h1">Progress</h1>
      <Segmented label="Time range" value={range} onChange={(v) => setUi({ progressRange: v })} options={(['4w', '12w', '1y'] as RangeKey[]).map((r) => ({ value: r, label: RANGE_LABEL[r] }))} />
      <div className="field mt16" style={{ marginBottom: 8 }}>
        <label htmlFor="exsel" className="sr-only">Exercise</label>
        <div className="input-wrap">
          <Dumbbell aria-hidden />
          <select id="exsel" value={exId} onChange={(e) => setUi({ progressExerciseId: e.target.value })} style={{ fontWeight: 700, fontSize: '1.15rem' }}>
            {logged.length > 0 && <optgroup label="Logged">{logged.map((id) => <option key={id} value={id}>{getExercise(id).name}</option>)}</optgroup>}
            <optgroup label={logged.length ? 'Other exercises' : 'Exercises'}>{others.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>
          </select>
        </div>
      </div>
      {best ? (
        <>
          <p className="big-stat" aria-label={`Best in ${RANGE_LABEL[range]}: ${label(best)}`}>
            {ex.mode === 'weighted' ? <>{fmtLoad(best.value, unit)} <span style={{ fontSize: '.6em' }}>{unitLabel}</span></> : ex.mode === 'timed' ? `${best.value} s` : `${best.value} reps`}
          </p>
          <p className="muted mt0" style={{ color: 'var(--forest)', fontWeight: 600 }}>
            {ex.mode === 'weighted' ? `Best set · ${best.reps} reps` : ex.mode === 'timed' ? 'Longest hold' : 'Most reps in a set'} · {fmtShort(best.date)} · {series.length} session{series.length === 1 ? '' : 's'}
          </p>
          <LineChart title={`${ex.name}, heaviest set per session in ${unitLabel}`} points={points} segments={splitSegments(points)} unitLabel={unitLabel} from={from} to={today} decimals={1} />
        </>
      ) : (
        <Empty icon={<LineIcon aria-hidden />} title={`No ${ex.name.toLowerCase()} sessions in ${RANGE_LABEL[range]}`}>
          <p className="muted small">Log a session that includes {ex.name.toLowerCase()} and your best set will be charted here.</p>
          <button type="button" className="btn" onClick={() => navigate('/today')}>Go to Today</button>
        </Empty>
      )}

      <h2 className="h2">Body measurements</h2>
      <div className="list">
        {(['weight', 'waist', 'bodyfat'] as MetricKind[]).map((m) => {
          const l = latestMeasurement(app.measurements, m);
          if (m === 'bodyfat' && !l) return null;
          const v = l ? `${fmtFixed(measurementToDisplay(m, l.value, unit, app.settings.lengthUnit))} ${metricUnit(m, unit, app.settings.lengthUnit)}` : 'Add';
          return <ListRow key={m} icon={m === 'waist' ? <Ruler aria-hidden /> : <Scale aria-hidden />} label={m === 'weight' ? 'Weight' : m === 'waist' ? 'Waist' : 'Body fat'} sub={l ? fmtShort(l.date) : 'No entries yet'} value={v} valueInk onClick={() => { setUi({ measurementMetric: m }); navigate('/progress/measurements'); }} />;
        })}
      </div>

      <h2 className="h2">Workout history</h2>
      {history.length ? (
        <div className="list">
          {history.slice(0, 3).map((s) => (
            <ListRow key={s.id} icon={<Dumbbell aria-hidden />} label={s.title} sub={fmtShort(s.startDate)} value={fmtMinutes(s.activeSec ?? 0)} valueInk onClick={() => navigate(`/progress/history/record/${s.id}`)} />
          ))}
          <button type="button" className="list-row" onClick={() => navigate('/progress/history')}>
            <span className="lead"><History aria-hidden /></span><span className="label" style={{ color: 'var(--forest)' }}>See all {history.length} workouts</span><ChevronRight className="chev" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="list"><ListRow icon={<History aria-hidden />} label="Workout history" sub="No saved workouts yet" onClick={() => navigate('/progress/history')} /></div>
      )}
    </>
  );
}
