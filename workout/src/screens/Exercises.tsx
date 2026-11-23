import { Check, ChevronRight, Dumbbell, Plus, Repeat, Search, Timer, X } from 'lucide-react';
import { completedSessions, useApp } from '../data/store';
import { fmtShort } from '../domain/dates';
import { getExercise, MUSCLE_GROUPS, searchExercises } from '../domain/exercises';
import { lastPerformance, setSummary } from '../domain/session';
import type { MuscleGroup } from '../domain/types';
import { back, navigate, useNav } from '../nav/router';
import { Empty, TopBar, useScrollRestore, useStickyState } from '../ui/components';
import { applyPick } from './Edit';

function editContext(stack: ReturnType<typeof useNav>['stack']) {
  const edit = [...stack].reverse().find((e) => e.screen.name === 'edit');
  const pick = [...stack].reverse().find((e) => e.screen.name === 'pick');
  if (!edit || edit.screen.name !== 'edit' || !pick || pick.screen.name !== 'pick') return null;
  return { templateId: edit.screen.templateId, editPath: edit.path, mode: pick.screen.mode, key: pick.screen.key };
}

export function ExercisesScreen({ mode, replaceKey }: { mode: 'browse' | 'add' | 'replace'; replaceKey?: string }) {
  const app = useApp();
  const nav = useNav();
  const [query, setQuery] = useStickyState(`exq:${nav.path}`, '');
  const [muscle, setMuscle] = useStickyState<MuscleGroup | 'All'>(`exm:${nav.path}`, 'All');
  useScrollRestore();
  const ctx = editContext(nav.stack);
  const results = searchExercises(query, muscle);
  const replacing = mode === 'replace' && ctx ? app.editDrafts[ctx.templateId]?.exercises.find((r) => r.key === replaceKey) ?? app.templates[ctx.templateId]?.exercises.find((r) => r.key === replaceKey) : null;
  const title = mode === 'add' ? 'Add exercise' : mode === 'replace' ? 'Replace exercise' : 'Exercises';

  const choose = (id: string) => {
    if (mode === 'browse' || !ctx) { navigate(`${nav.path}/exercise/${id}`); return; }
    applyPick(ctx.templateId, id, mode, replaceKey);
    navigate(ctx.editPath, { replace: true, direction: 'back' });
  };

  return (
    <>
      {mode === 'browse' ? <TopBar title="" onBack={() => back('/plan')} /> : <TopBar title="" onBack={() => back()} backLabel="Back to editor" />}
      <h1 className="h1" style={{ marginTop: 0 }}>{title}</h1>
      {replacing && <p className="banner info small">Replacing {getExercise(replacing.exerciseId).name}. Targets are kept.</p>}
      <div className="search" role="search">
        <Search aria-hidden />
        <label htmlFor="exsearch" className="sr-only">Search by movement or equipment</label>
        <input id="exsearch" type="search" placeholder="Search movement or equipment" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" enterKeyHint="search" />
        {query && <button type="button" className="icon-btn" onClick={() => setQuery('')} aria-label="Clear search"><X aria-hidden /></button>}
      </div>
      <div className="chips" role="group" aria-label="Filter by muscle group">
        {(['All', ...MUSCLE_GROUPS] as const).map((m) => <button key={m} type="button" className="chip" aria-pressed={muscle === m} onClick={() => setMuscle(m)}>{m}</button>)}
      </div>
      <p className="sr-only" aria-live="polite">{results.length} exercises</p>
      {results.length === 0 ? (
        <Empty icon={<Search aria-hidden />} title="No exercises match">
          <p className="muted small">Nothing for “{query}”{muscle !== 'All' ? ` in ${muscle}` : ''}.</p>
          <button type="button" className="btn secondary" onClick={() => { setQuery(''); setMuscle('All'); }}>Clear filters</button>
        </Empty>
      ) : (
        <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {results.map((e) => {
            const isCurrent = replacing?.exerciseId === e.id;
            return (
              <li key={e.id} className="row" style={{ gap: 6 }}>
                <button type="button" className="ex-row" onClick={() => navigate(`${nav.path}/exercise/${e.id}`)} aria-label={`${e.name}, ${e.equipment}, ${e.muscle}. Details`}>
                  <img src={e.image} alt={e.alt} loading="lazy" />
                  <span className="grow">
                    <span className="name">{e.name}</span>
                    <span className="equip">{e.mode === 'timed' ? <Timer size={18} aria-hidden /> : <Dumbbell size={18} aria-hidden />} {e.equipment}</span>
                    <span className="small muted">{e.muscle}{isCurrent ? ' · current' : ''}</span>
                  </span>
                  {mode === 'browse' && <ChevronRight aria-hidden />}
                </button>
                {mode !== 'browse' && (
                  <button type="button" className="icon-btn boxed" style={{ width: 52, height: 52, background: 'var(--sage)' }} disabled={isCurrent} onClick={() => choose(e.id)}
                    aria-label={mode === 'add' ? `Add ${e.name}` : `Use ${e.name} as replacement`}>
                    {mode === 'add' ? <Plus aria-hidden /> : <Repeat aria-hidden />}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export function ExerciseDetail({ exerciseId }: { exerciseId: string }) {
  const app = useApp();
  const nav = useNav();
  useScrollRestore();
  const ex = getExercise(exerciseId);
  const ctx = editContext(nav.stack);
  const inSession = nav.stack[0].screen.name === 'session';
  const last = lastPerformance(completedSessions(app), exerciseId);
  const lastBest = last ? last.exercise.sets.filter((s) => s.done).reduce((a, s) => {
    if (!a) return s;
    if (ex.mode === 'weighted') return (s.loadKg ?? 0) > (a.loadKg ?? 0) || ((s.loadKg ?? 0) === (a.loadKg ?? 0) && (s.reps ?? 0) > (a.reps ?? 0)) ? s : a;
    return (ex.mode === 'timed' ? (s.seconds ?? 0) > (a.seconds ?? 0) : (s.reps ?? 0) > (a.reps ?? 0)) ? s : a;
  }, null as null | (typeof last.exercise.sets)[number]) : null;

  return (
    <div className={ctx ? 'with-footer' : ''}>
      <TopBar onBack={() => back(inSession ? '/session' : undefined)} backLabel={inSession ? 'Back to workout' : 'Back'} />
      <h1 className="h1" style={{ marginTop: 0, marginBottom: 4 }}>{ex.name}</h1>
      <p className="mt0" style={{ fontSize: '1.15rem' }}>{ex.muscle} · {ex.equipment}</p>
      <img className="ex-photo square" src={ex.image} alt={ex.alt} />
      <p className="muted small">Works: {ex.muscles}. {ex.mode === 'weighted' ? (ex.loadConvention === 'perHand' ? `Log the weight in one hand (${app.settings.loadUnit} / hand).` : `Log the total load in ${app.settings.loadUnit}.`) : ex.mode === 'timed' ? 'Logged as seconds held.' : 'Logged as bodyweight reps.'}</p>
      <h2 className="h2">Technique</h2>
      <div className="panel pad">
        {ex.cues.map((c) => <div key={c} className="cue"><Check size={20} aria-hidden /><span>{c}</span></div>)}
      </div>
      <div className="info-row" style={{ padding: '14px 16px' }}>
        <span>Last session{last ? ` · ${fmtShort(last.session.startDate)}` : ''}</span>
        <strong className="display-num" style={{ fontSize: '1.4rem' }}>{lastBest && last ? setSummary(lastBest, last.exercise, app.settings.loadUnit) : 'Not logged yet'}</strong>
      </div>
      {ctx && (
        <div className="footer">
          <button type="button" className="btn big" onClick={() => { applyPick(ctx.templateId, exerciseId, ctx.mode, ctx.key); navigate(ctx.editPath, { replace: true, direction: 'back' }); }}>
            {ctx.mode === 'add' ? 'Add to workout' : 'Use replacement'}
          </button>
        </div>
      )}
    </div>
  );
}
