import { Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { fmtMedium, fmtTime } from '../domain/dates';
import { estimateMinutes } from '../domain/plan';
import type { LocalDate, Session, Template } from '../domain/types';
import { activeSession, AppState, completedSessions, discardActiveSession, getState, startWorkout } from '../data/store';
import { navigate } from '../nav/router';
import { Sheet } from '../ui/components';

export function completedFor(app: AppState, date: LocalDate, templateId: string): Session | null {
  return completedSessions(app).filter((s) => s.scheduledDate === date && s.templateId === templateId).sort((a, b) => b.startedAt - a.startedAt)[0] ?? null;
}

export function templateMeta(t: Template, restSec: number): string {
  return `${estimateMinutes(t, restSec)} min · ${t.exercises.length} exercise${t.exercises.length === 1 ? '' : 's'}`;
}

export function draftDescription(s: Session): string {
  const sets = s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0);
  return `${s.title} · started ${fmtTime(s.startedAt)}${s.scheduledDate ? ` (${fmtMedium(s.startDate)})` : ''} · ${sets} set${sets === 1 ? '' : 's'} logged`;
}

/**
 * Starting a workout always goes through here: it resumes the matching draft, or asks before
 * replacing a different one, so there is only ever one resumable session.
 */
export function useStartWorkout() {
  const [conflict, setConflict] = useState<{ templateId: string; date: LocalDate; draft: Session } | null>(null);
  const start = (templateId: string, date: LocalDate) => {
    const draft = activeSession();
    if (draft && (draft.templateId !== templateId || draft.scheduledDate !== date)) { setConflict({ templateId, date, draft }); return; }
    startWorkout(templateId, date);
    navigate('/session');
  };
  const sheet = conflict && (
    <Sheet title="Workout in progress" onClose={() => setConflict(null)}>
      <p>You already have an unfinished workout:</p>
      <p className="panel pad" style={{ fontWeight: 600 }}>{draftDescription(conflict.draft)}</p>
      <p className="muted small">Only one workout can be in progress. Discarding deletes its unsaved sets.</p>
      <div className="actions">
        <button type="button" className="btn" data-autofocus onClick={() => { setConflict(null); navigate('/session'); }}>
          <RotateCcw size={20} aria-hidden /> Resume {conflict.draft.title}
        </button>
        <button type="button" className="btn danger" onClick={async () => {
          const c = conflict; setConflict(null);
          await discardActiveSession();
          startWorkout(c.templateId, c.date);
          navigate('/session');
        }}>
          <Play size={20} aria-hidden /> Discard it and start {getState().templates[conflict.templateId]?.name}
        </button>
        <button type="button" className="btn ghost" onClick={() => setConflict(null)}>Cancel</button>
      </div>
    </Sheet>
  );
  return { start, sheet };
}
