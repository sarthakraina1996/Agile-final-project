import { ArrowDown, ArrowUp, ChevronRight, Flame, GripVertical, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getState, saveTemplate, setEditDraft, showToast, useApp } from '../data/store';
import { getExercise } from '../domain/exercises';
import { targetLabel, uid } from '../domain/plan';
import type { TargetSpec, Template } from '../domain/types';
import { back, navigate, setGuard, useNav } from '../nav/router';
import { revealOnFocus, Sheet, Stepper, Switch, TopBar, useScrollRestore } from '../ui/components';

const sameTemplate = (a: Template, b: Template) =>
  a.name === b.name && a.finisher === b.finisher && JSON.stringify(a.exercises) === JSON.stringify(b.exercises);

/** Apply a library choice to the template being edited (used by the exercise picker and detail screens). */
export function applyPick(templateId: string, exerciseId: string, mode: 'add' | 'replace', key?: string) {
  const st = getState();
  const base = st.editDrafts[templateId] ?? st.templates[templateId];
  if (!base) return;
  const ex = getExercise(exerciseId);
  const targetFor = (prev?: TargetSpec): Omit<TargetSpec, 'key' | 'exerciseId'> =>
    ex.mode === 'timed' ? { sets: prev?.sets ?? 2, seconds: prev?.seconds ?? 45 } : { sets: prev?.sets ?? 3, reps: prev?.reps ?? 10 };
  let exercises = base.exercises;
  if (mode === 'replace' && key) exercises = exercises.map((r) => (r.key === key ? { key: r.key, exerciseId, ...targetFor(r) } : r));
  else exercises = [...exercises, { key: uid('row_'), exerciseId, ...targetFor() }];
  setEditDraft(templateId, { ...base, exercises });
  showToast(mode === 'replace' ? `Swapped in ${ex.name}` : `Added ${ex.name}`);
}

export function EditWorkout({ templateId }: { templateId: string }) {
  const app = useApp();
  const nav = useNav();
  useScrollRestore();
  const saved = app.templates[templateId];
  const draft = app.editDrafts[templateId] ?? saved;
  const dirty = !!saved && !!app.editDrafts[templateId] && !sameTemplate(app.editDrafts[templateId], saved);
  const [rowSheet, setRowSheet] = useState<string | null>(null);
  const [leave, setLeave] = useState<null | (() => void)>(null);
  const [error, setError] = useState('');
  const path = nav.path;
  const parentPath = nav.stack.at(-2)?.path ?? '/plan';

  useEffect(() => {
    if (!dirty) { setGuard(null); return; }
    setGuard({ within: path, onBlock: (proceed) => setLeave(() => proceed) });
    return () => setGuard(null);
  }, [dirty, path]);

  if (!saved) return <><TopBar title="Edit workout" /><p>Workout not found.</p></>;
  const update = (patch: Partial<Template>) => setEditDraft(templateId, { ...draft, ...patch });
  const move = (from: number, to: number) => {
    if (to < 0 || to >= draft.exercises.length || from === to) return;
    const ex = [...draft.exercises];
    const [r] = ex.splice(from, 1);
    ex.splice(to, 0, r);
    update({ exercises: ex });
  };
  const save = async () => {
    if (!draft.name.trim()) { setError('Give the workout a name.'); document.getElementById('wname')?.focus(); return; }
    if (!draft.exercises.length) { setError('Add at least one exercise.'); return; }
    setGuard(null);
    await saveTemplate({ ...draft, name: draft.name.trim() });
    showToast('Workout saved. Future sessions use the new version.');
    navigate(parentPath, { replace: true, direction: 'back' });
  };
  const row = rowSheet ? draft.exercises.find((r) => r.key === rowSheet) : null;
  const rowIndex = row ? draft.exercises.indexOf(row) : -1;

  return (
    <div className="with-footer">
      <TopBar onBack={() => back()} />
      <h1 className="h1" style={{ marginTop: 0 }}>Edit workout</h1>
      {dirty && <p className="dirty-note" role="status"><Pencil size={16} aria-hidden /> Unsaved changes</p>}
      <div className="field">
        <label htmlFor="wname">Name</label>
        <div className={`input-wrap${error && !draft.name.trim() ? ' input-invalid' : ''}`}>
          <Pencil aria-hidden />
          <input id="wname" value={draft.name} onFocus={revealOnFocus} onChange={(e) => { setError(''); update({ name: e.target.value }); }} maxLength={40} />
        </div>
      </div>
      <h2 className="field-label" id="ex-h">Exercises</h2>
      <p className="muted small mt0">Drag the handle, or select an exercise to move, swap or change targets.</p>
      <ReorderList rows={draft.exercises} onMove={move} onOpen={setRowSheet} />
      <button type="button" className="btn sage mt8" onClick={() => navigate(`${path}/pick/add`)} style={{ justifyContent: 'flex-start' }}><Plus aria-hidden /> Add exercise</button>
      <div className="list mt16">
        <div className="list-row"><span className="lead"><Flame aria-hidden /></span><span className="label">Abs finisher<span className="sub">5 min circuit at the end</span></span>
          <Switch label="Abs finisher" checked={draft.finisher} onChange={(v) => update({ finisher: v })} /></div>
      </div>
      <p className="muted small">Saving creates a new version. Completed sessions keep exactly what you performed.</p>
      {error && <p className="error" role="alert">⚠ {error}</p>}
      <div className="footer"><button type="button" className="btn big" onClick={save}>Save workout</button></div>

      {row && (
        <TargetSheet
          row={row} index={rowIndex} count={draft.exercises.length}
          onClose={() => setRowSheet(null)}
          onChange={(r) => update({ exercises: draft.exercises.map((x) => (x.key === r.key ? r : x)) })}
          onMove={(d) => move(rowIndex, rowIndex + d)}
          onSwap={() => { setRowSheet(null); navigate(`${path}/pick/replace.${row.key}`); }}
          onRemove={() => { setRowSheet(null); update({ exercises: draft.exercises.filter((x) => x.key !== row.key) }); showToast(`Removed ${getExercise(row.exerciseId).name}`); }}
        />
      )}
      {leave && (
        <Sheet title="Unsaved changes" onClose={() => setLeave(null)}>
          <p className="mt0">You changed {draft.name || 'this workout'}. Leave without saving?</p>
          <div className="actions">
            <button type="button" className="btn" data-autofocus onClick={() => setLeave(null)}>Keep editing</button>
            <button type="button" className="btn danger" onClick={() => { const go = leave; setLeave(null); setGuard(null); setEditDraft(templateId, null); go(); }}>Discard edits</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function ReorderList({ rows, onMove, onOpen }: { rows: TargetSpec[]; onMove: (from: number, to: number) => void; onOpen: (key: string) => void }) {
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const [drag, setDrag] = useState<{ key: string; from: number; over: number; dy: number; startY: number } | null>(null);
  const [live, setLive] = useState('');

  const onPointerDown = (e: React.PointerEvent, i: number, key: string) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ key, from: i, over: i, dy: 0, startY: e.clientY });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const y = e.clientY;
    let over = drag.from;
    refs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if (i > drag.from && y > mid) over = i;
      if (i < drag.from && y < mid && over === drag.from) over = i;
    });
    setDrag({ ...drag, over, dy: y - drag.startY });
  };
  const onPointerUp = () => {
    if (!drag) return;
    if (drag.over !== drag.from) { onMove(drag.from, drag.over); setLive(`Moved to position ${drag.over + 1}`); }
    setDrag(null);
  };

  return (
    <>
      <ol className="list" style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-labelledby="ex-h">
        {rows.map((r, i) => {
          const ex = getExercise(r.exerciseId);
          const dragging = drag?.key === r.key;
          const shift = drag && !dragging ? (drag.from < i && i <= drag.over ? -1 : drag.over <= i && i < drag.from ? 1 : 0) : 0;
          return (
            <li key={r.key} ref={(el) => { refs.current[i] = el; }} className={`edit-row${dragging ? ' dragging' : ''}`}
              style={{ transform: dragging ? `translateY(${drag!.dy}px)` : shift ? `translateY(${shift * 100}%)` : undefined, transition: dragging ? 'none' : 'transform .15s' }}>
              <button type="button" className="icon-btn handle" aria-label={`Reorder ${ex.name}, position ${i + 1} of ${rows.length}. Use arrow keys to move`}
                onPointerDown={(e) => onPointerDown(e, i, r.key)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => setDrag(null)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); onMove(i, i - 1); setLive(`${ex.name} moved to position ${i}`); setTimeout(() => (refs.current[i - 1]?.querySelector('.handle') as HTMLElement | null)?.focus(), 0); }
                  if (e.key === 'ArrowDown' && i < rows.length - 1) { e.preventDefault(); onMove(i, i + 1); setLive(`${ex.name} moved to position ${i + 2}`); setTimeout(() => (refs.current[i + 1]?.querySelector('.handle') as HTMLElement | null)?.focus(), 0); }
                }}>
                <GripVertical aria-hidden />
              </button>
              <button type="button" className="name" onClick={() => onOpen(r.key)} aria-label={`${ex.name}, ${targetLabel(r)}${r.seconds ? ' seconds' : ' reps'}. Edit targets, move, swap or remove`}>
                <span>{ex.name}</span><span className="tgt">{targetLabel(r)}</span>
              </button>
              <ChevronRight aria-hidden style={{ flex: 'none' }} />
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">{live}</p>
    </>
  );
}

function TargetSheet({ row, index, count, onClose, onChange, onMove, onSwap, onRemove }: {
  row: TargetSpec; index: number; count: number; onClose: () => void; onChange: (r: TargetSpec) => void; onMove: (d: number) => void; onSwap: () => void; onRemove: () => void;
}) {
  const ex = getExercise(row.exerciseId);
  const [sets, setSets] = useState(row.sets);
  const [amount, setAmount] = useState(row.seconds ?? row.reps ?? 10);
  const timed = ex.mode === 'timed';
  return (
    <Sheet title={ex.name} onClose={onClose}>
      <p className="muted small mt0">{ex.equipment} · position {index + 1} of {count}</p>
      <h3 className="h3">Sets</h3>
      <Stepper label="sets" value={sets} onChange={setSets} min={1} max={10} />
      <h3 className="h3">{timed ? 'Seconds per set' : 'Reps per set'}</h3>
      <Stepper label={timed ? 'seconds' : 'reps'} value={amount} onChange={setAmount} min={timed ? 5 : 1} max={timed ? 600 : 100} step={timed ? 5 : 1} />
      <div className="actions">
        <button type="button" className="btn" onClick={() => { onChange(timed ? { ...row, sets, seconds: amount, reps: undefined } : { ...row, sets, reps: amount, seconds: undefined }); onClose(); }}>Save targets</button>
        <div className="btn-row">
          <button type="button" className="btn secondary" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp size={18} aria-hidden /> Move up</button>
          <button type="button" className="btn secondary" disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown size={18} aria-hidden /> Move down</button>
        </div>
        <button type="button" className="btn secondary" onClick={onSwap}><Repeat size={18} aria-hidden /> Swap exercise</button>
        <button type="button" className="btn danger" onClick={onRemove}><Trash2 size={18} aria-hidden /> Remove from workout</button>
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}
