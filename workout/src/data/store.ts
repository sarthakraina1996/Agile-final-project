import { useSyncExternalStore } from 'react';
import { startOfWeek, todayLocal } from '../domain/dates';
import { applyFrequency, buildStarterTemplates, createPlan, moveOnce, moveRecurring, uid, withTarget } from '../domain/plan';
import { createDraft } from '../domain/session';
import type {
  Goal, LoadUnit, LocalDate, Measurement, Plan, Profile, Session, SessionLength, Settings, Template, TemplateVersion, UiState, Weekday,
} from '../domain/types';
import { commitSession, loadAll, Op, requestPersistence, seedExercises, write } from './db';

export interface AppState {
  ready: boolean;
  loadError: string | null;
  profile: Profile | null;
  settings: Settings;
  plan: Plan | null;
  ui: UiState;
  templates: Record<string, Template>;
  templateVersions: TemplateVersion[];
  sessions: Session[];
  measurements: Measurement[];
  activeSessionId: string | null;
  /** Unsaved template edits, keyed by template id; survives navigating to the exercise picker and reloads. */
  editDrafts: Record<string, Template>;
  saveError: { message: string; retry: () => void } | null;
  toast: { id: number; text: string } | null;
  /** Id of the session committed most recently in this app run (used to show the saved result after a retry). */
  justSavedId: string | null;
}

export const DEFAULT_SETTINGS: Settings = { loadUnit: 'kg', lengthUnit: 'cm', defaultRestSec: 90, timerSound: true, haptics: true };

let state: AppState = {
  ready: false, loadError: null, profile: null, settings: DEFAULT_SETTINGS, plan: null, ui: {}, templates: {}, templateVersions: [],
  sessions: [], measurements: [], activeSessionId: null, editDrafts: {}, saveError: null, toast: null, justSavedId: null,
};
const listeners = new Set<() => void>();

export function getState() { return state; }
function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  listeners.forEach((l) => l());
}
export function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }
export function useApp(): AppState { return useSyncExternalStore(subscribe, getState, getState); }

let toastId = 0;
export function showToast(text: string) {
  const id = ++toastId;
  setState({ toast: { id, text } });
  setTimeout(() => { if (state.toast?.id === id) setState({ toast: null }); }, 3200);
}

/** Write with a visible retry path. The in-memory state is already updated, so nothing typed is lost. */
async function persist(ops: Op[], what: string): Promise<boolean> {
  try {
    await write(ops);
    if (state.saveError) setState({ saveError: null });
    return true;
  } catch (e) {
    console.error(e);
    setState({ saveError: { message: `Couldn't save ${what}. Your changes are kept on screen.`, retry: () => { void persist(ops, what); } } });
    return false;
  }
}

export async function init(): Promise<void> {
  try {
    await seedExercises();
    const snap = await loadAll();
    const kv = snap.kv;
    const sessions = snap.sessions;
    const activeId = (kv.activeSessionId as string | undefined) ?? sessions.find((s) => s.status === 'draft')?.id ?? null;
    setState({
      ready: true,
      profile: (kv.profile as Profile) ?? null,
      settings: { ...DEFAULT_SETTINGS, ...((kv.settings as Settings) ?? {}) },
      plan: (kv.plan as Plan) ?? null,
      ui: (kv.ui as UiState) ?? {},
      editDrafts: (kv.editDrafts as Record<string, Template>) ?? {},
      templates: Object.fromEntries(snap.templates.map((t) => [t.id, t])),
      templateVersions: snap.templateVersions,
      sessions,
      measurements: snap.measurements,
      activeSessionId: activeId && sessions.some((s) => s.id === activeId && s.status === 'draft') ? activeId : null,
    });
    void requestPersistence();
  } catch (e) {
    console.error(e);
    setState({ ready: true, loadError: e instanceof Error ? e.message : String(e) });
  }
}

export const activeSession = (s: AppState = state): Session | null =>
  s.activeSessionId ? s.sessions.find((x) => x.id === s.activeSessionId) ?? null : null;

export const completedSessions = (s: AppState = state) => s.sessions.filter((x) => x.status === 'completed');

/* ---------- Setup, profile, settings ---------- */

export async function completeSetup(input: { name: string; goal: Goal; days: number; sessionLength: SessionLength; loadUnit: LoadUnit }) {
  const now = Date.now();
  const today = todayLocal(now);
  const profile: Profile = {
    name: input.name.trim(), goal: input.goal, sessionLength: input.sessionLength, createdAt: now,
    targets: [{ effectiveFrom: startOfWeek(today), sessionsPerWeek: input.days }],
  };
  const settings: Settings = { ...state.settings, loadUnit: input.loadUnit };
  // Preserve an existing prescribed schedule/templates if present; otherwise create the starter routine.
  const hasTemplates = Object.keys(state.templates).length > 0;
  const templates = hasTemplates ? Object.values(state.templates) : buildStarterTemplates(input.goal, input.sessionLength, now);
  const versions: TemplateVersion[] = hasTemplates ? [] : templates.map((t) => ({ id: `${t.id}@${t.version}`, templateId: t.id, version: t.version, snapshot: t, createdAt: now }));
  const plan = state.plan ?? createPlan(input.days, today, now);
  setState({
    profile, settings, plan,
    templates: Object.fromEntries(templates.map((t) => [t.id, t])),
    templateVersions: [...state.templateVersions, ...versions],
    ui: { ...state.ui, todaySelectedDate: today },
  });
  await persist([
    { store: 'kv', type: 'put', key: 'profile', value: profile },
    { store: 'kv', type: 'put', key: 'settings', value: settings },
    { store: 'kv', type: 'put', key: 'plan', value: plan },
    ...templates.map((t) => ({ store: 'templates' as const, type: 'put' as const, value: t })),
    ...versions.map((v) => ({ store: 'templateVersions' as const, type: 'put' as const, value: v })),
  ], 'your plan');
}

export function updateSettings(patch: Partial<Settings>) {
  const settings = { ...state.settings, ...patch };
  setState({ settings });
  void persist([{ store: 'kv', type: 'put', key: 'settings', value: settings }], 'settings');
}

export function updateProfile(patch: Partial<Omit<Profile, 'targets'>>) {
  if (!state.profile) return;
  const profile = { ...state.profile, ...patch };
  setState({ profile });
  void persist([{ store: 'kv', type: 'put', key: 'profile', value: profile }], 'profile');
}

/**
 * New weekly target from this week on. Past weeks keep their recorded targets.
 * Optionally rebuild the recurring schedule from today forward; completed sessions are never touched.
 */
export function changeWeeklyTarget(sessionsPerWeek: number, rebuildSchedule: boolean) {
  if (!state.profile) return;
  const today = todayLocal();
  const profile = withTarget(state.profile, sessionsPerWeek, startOfWeek(today));
  let plan = state.plan;
  if (rebuildSchedule && plan) plan = applyFrequency(plan, sessionsPerWeek, today);
  setState({ profile, plan });
  void persist([
    { store: 'kv', type: 'put', key: 'profile', value: profile },
    ...(plan ? [{ store: 'kv' as const, type: 'put' as const, key: 'plan', value: plan }] : []),
  ], 'weekly goal');
}

export function setUi(patch: Partial<UiState>) {
  const ui = { ...state.ui, ...patch };
  setState({ ui });
  void write([{ store: 'kv', type: 'put', key: 'ui', value: ui }]).catch(() => undefined);
}

/* ---------- Plan ---------- */

export function moveWorkout(from: LocalDate, to: LocalDate, scope: 'once' | 'recurring', fromDay: Weekday, toDay: Weekday) {
  if (!state.plan) return;
  const today = todayLocal();
  const plan = scope === 'once' ? moveOnce(state.plan, from, to) : moveRecurring(state.plan, fromDay, toDay, from < today ? today : from);
  setState({ plan });
  void persist([{ store: 'kv', type: 'put', key: 'plan', value: plan }], 'the schedule change');
}

/* ---------- Templates ---------- */

export function setEditDraft(templateId: string, draft: Template | null) {
  const editDrafts = { ...state.editDrafts };
  if (draft) editDrafts[templateId] = draft; else delete editDrafts[templateId];
  setState({ editDrafts });
  void write([{ store: 'kv', type: 'put', key: 'editDrafts', value: editDrafts }]).catch(() => undefined);
}

/** Saves a new template version. Completed sessions keep their own snapshot; an in-progress draft is unaffected. */
export async function saveTemplate(t: Template): Promise<Template> {
  const prev = state.templates[t.id];
  const next: Template = { ...t, version: (prev?.version ?? 0) + 1, updatedAt: Date.now() };
  const version: TemplateVersion = { id: `${next.id}@${next.version}`, templateId: next.id, version: next.version, snapshot: next, createdAt: next.updatedAt };
  const editDrafts = { ...state.editDrafts };
  delete editDrafts[t.id];
  setState({ templates: { ...state.templates, [t.id]: next }, templateVersions: [...state.templateVersions, version], editDrafts });
  await persist([
    { store: 'templates', type: 'put', value: next },
    { store: 'templateVersions', type: 'put', value: version },
    { store: 'kv', type: 'put', key: 'editDrafts', value: editDrafts },
  ], 'the workout');
  return next;
}

/* ---------- Live session ---------- */

let pendingSession: Session | null = null;
let writingSession = false;
async function flushSession() {
  if (writingSession) return;
  writingSession = true;
  try {
    while (pendingSession) {
      const s = pendingSession;
      pendingSession = null;
      const ok = await persist([{ store: 'sessions', type: 'put', value: s }], 'the workout in progress');
      if (!ok) break;
    }
  } finally {
    writingSession = false;
  }
}
function persistDraft(s: Session) { pendingSession = s; void flushSession(); }

export function startWorkout(templateId: string, scheduledDate: LocalDate): Session {
  const existing = activeSession();
  if (existing) return existing;
  const t = state.templates[templateId];
  const draft = createDraft(t, scheduledDate, completedSessions(), state.settings.defaultRestSec, state.settings.loadUnit);
  setState({ sessions: [...state.sessions, draft], activeSessionId: draft.id });
  void persist([
    { store: 'sessions', type: 'put', value: draft },
    { store: 'kv', type: 'put', key: 'activeSessionId', value: draft.id },
  ], 'the new workout');
  return draft;
}

export function updateActiveSession(fn: (s: Session) => Session) {
  const cur = activeSession();
  if (!cur) return;
  const next = fn(cur);
  if (next === cur) return;
  setState({ sessions: state.sessions.map((s) => (s.id === next.id ? next : s)) });
  persistDraft(next);
}

export async function discardActiveSession() {
  const cur = activeSession();
  if (!cur) return;
  setState({ sessions: state.sessions.filter((s) => s.id !== cur.id), activeSessionId: null });
  await persist([{ store: 'sessions', type: 'delete', key: cur.id }, { store: 'kv', type: 'delete', key: 'activeSessionId' }], 'the discard');
}

let saving: Promise<Session | null> | null = null;
/** Idempotent: concurrent taps share one promise; the DB transaction refuses a second commit of the same id. */
export function saveActiveSession(): Promise<Session | null> {
  if (saving) return saving;
  const cur = activeSession();
  if (!cur) return Promise.resolve(null);
  const completed: Session = { ...cur, status: 'completed', savedAt: Date.now(), rest: null, updatedAt: Date.now() };
  saving = (async () => {
    try {
      pendingSession = null;
      const result = await commitSession(completed);
      setState({ sessions: state.sessions.map((s) => (s.id === result.id ? result : s)), activeSessionId: null, saveError: null, justSavedId: result.id });
      return result;
    } catch (e) {
      console.error(e);
      setState({ saveError: { message: "Couldn't save the session. Your workout is kept as a draft.", retry: () => { void saveActiveSession(); } } });
      return null;
    } finally {
      saving = null;
    }
  })();
  return saving;
}

/* ---------- Measurements ---------- */

export async function saveMeasurement(m: Omit<Measurement, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Measurement> {
  const now = Date.now();
  const prev = m.id ? state.measurements.find((x) => x.id === m.id) : undefined;
  const rec: Measurement = { ...m, id: m.id ?? uid('m_'), createdAt: prev?.createdAt ?? now, updatedAt: now };
  setState({ measurements: [...state.measurements.filter((x) => x.id !== rec.id), rec] });
  await persist([{ store: 'measurements', type: 'put', value: rec }], 'the measurement');
  return rec;
}

export async function deleteMeasurement(id: string) {
  setState({ measurements: state.measurements.filter((x) => x.id !== id) });
  await persist([{ store: 'measurements', type: 'delete', key: id }], 'the deletion');
}

/** Test/debug hook: lets the verification script simulate a failed write. */
export const __debug = { setState: (p: Partial<AppState>) => setState(p) };
