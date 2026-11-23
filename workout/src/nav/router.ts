import { useSyncExternalStore } from 'react';

export type Tab = 'today' | 'plan' | 'progress' | 'profile';
export const TABS: Tab[] = ['today', 'plan', 'progress', 'profile'];

export type Screen =
  | { name: 'today' } | { name: 'plan' } | { name: 'progress' } | { name: 'profile' }
  | { name: 'setup' }
  | { name: 'preview'; date: string }
  | { name: 'edit'; templateId: string }
  | { name: 'pick'; mode: 'add' | 'replace'; key?: string }
  | { name: 'library' }
  | { name: 'exercise'; exerciseId: string }
  | { name: 'record'; sessionId: string }
  | { name: 'history' }
  | { name: 'measurements' }
  | { name: 'log'; entryId: string }
  | { name: 'settings' }
  | { name: 'session' } | { name: 'finisher' } | { name: 'review' };

export interface Entry { screen: Screen; path: string }

/** Parse a path such as `/plan/day/2026-01-05/edit/upper-a/pick/replace.k3` into a stack of screens. */
export function parse(path: string): Entry[] {
  const segs = path.replace(/^#?\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const out: Entry[] = [];
  const root = segs.shift() ?? 'today';
  let acc = `/${root}`;
  if (root === 'setup') return [{ screen: { name: 'setup' }, path: acc }];
  if (root === 'session') out.push({ screen: { name: 'session' }, path: acc });
  else if ((TABS as string[]).includes(root)) out.push({ screen: { name: root as Tab }, path: acc });
  else return [{ screen: { name: 'today' }, path: '/today' }];
  while (segs.length) {
    const t = segs.shift()!;
    const arg = () => { const a = segs.shift() ?? ''; acc += `/${encodeURIComponent(a)}`; return a; };
    acc += `/${t}`;
    let screen: Screen | null = null;
    switch (t) {
      case 'day': screen = { name: 'preview', date: arg() }; break;
      case 'edit': screen = { name: 'edit', templateId: arg() }; break;
      case 'pick': {
        const m = arg();
        screen = m.startsWith('replace.') ? { name: 'pick', mode: 'replace', key: m.slice(8) } : { name: 'pick', mode: 'add' };
        break;
      }
      case 'library': screen = { name: 'library' }; break;
      case 'exercise': screen = { name: 'exercise', exerciseId: arg() }; break;
      case 'record': screen = { name: 'record', sessionId: arg() }; break;
      case 'history': screen = { name: 'history' }; break;
      case 'measurements': screen = { name: 'measurements' }; break;
      case 'log': screen = { name: 'log', entryId: arg() }; break;
      case 'settings': screen = { name: 'settings' }; break;
      case 'finisher': screen = { name: 'finisher' }; break;
      case 'review': screen = { name: 'review' }; break;
      default: break;
    }
    if (!screen) break;
    out.push({ screen, path: acc });
  }
  return out;
}

const SCROLL_KEY = 'wt.scroll';
const TAB_KEY = 'wt.tabPaths';
const safeJson = <T,>(k: string, fallback: T): T => {
  try { return JSON.parse(sessionStorage.getItem(k) ?? '') as T; } catch { return fallback; }
};
const safeSet = (k: string, v: unknown) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

interface NavState { path: string; stack: Entry[]; tab: Tab | null; direction: 'forward' | 'back' | 'none' }

const scroll: Record<string, number> = safeJson(SCROLL_KEY, {});
const tabPaths: Record<string, string> = safeJson(TAB_KEY, {});
let entries: string[] = [];
let idx = 0;
let nav: NavState = make(currentHash(), 'none');
const listeners = new Set<() => void>();

function currentHash() {
  const h = typeof location !== 'undefined' ? location.hash.replace(/^#/, '') : '';
  return h || '/today';
}
function make(path: string, direction: NavState['direction']): NavState {
  const stack = parse(path);
  const root = stack[0].screen.name;
  const tab = (TABS as string[]).includes(root) ? (root as Tab) : null;
  return { path: stack.at(-1)!.path, stack, tab, direction };
}
function emit() { listeners.forEach((l) => l()); }
function commit(next: NavState) {
  rememberScroll();
  nav = next;
  if (nav.tab) { tabPaths[nav.tab] = nav.path; safeSet(TAB_KEY, tabPaths); }
  emit();
}

export function rememberScroll() {
  scroll[nav.path] = window.scrollY;
  safeSet(SCROLL_KEY, scroll);
}
export function savedScroll(path: string): number { return scroll[path] ?? 0; }

/* Guard for screens with unsaved edits. */
type Guard = { within: string; onBlock: (proceed: () => void) => void };
let guard: Guard | null = null;
export function setGuard(g: Guard | null) { guard = g; }
const isWithin = (path: string, base: string) => path === base || path.startsWith(`${base}/`);
function guarded(target: string, run: () => void) {
  if (guard && !isWithin(target, guard.within)) {
    const g = guard;
    g.onBlock(() => { if (guard === g) guard = null; run(); });
    return;
  }
  run();
}

export function initRouter() {
  const path = make(currentHash(), 'none').path;
  entries = [path];
  idx = 0;
  history.replaceState({ wt: idx }, '', `#${path}`);
  nav = make(path, 'none');
  if (nav.tab) tabPaths[nav.tab] = nav.path;
  window.addEventListener('popstate', (e) => {
    const target = currentHash();
    const newIdx = typeof e.state?.wt === 'number' ? e.state.wt : idx;
    if (guard && !isWithin(make(target, 'back').path, guard.within)) {
      // Undo the browser navigation, then ask the screen.
      const stay = nav.path;
      history.pushState({ wt: idx }, '', `#${stay}`);
      entries[idx] = stay;
      guarded(target, () => navigate(target, { replace: true, direction: 'back' }));
      return;
    }
    const direction = newIdx < idx ? 'back' : 'forward';
    idx = newIdx;
    entries[idx] = target;
    commit(make(target, direction));
  });
}

export function navigate(path: string, opts: { replace?: boolean; direction?: NavState['direction'] } = {}) {
  guarded(path, () => {
    const next = make(path, opts.direction ?? 'forward');
    if (opts.replace) {
      history.replaceState({ wt: idx }, '', `#${next.path}`);
      entries[idx] = next.path;
    } else {
      idx += 1;
      entries = entries.slice(0, idx);
      entries[idx] = next.path;
      history.pushState({ wt: idx }, '', `#${next.path}`);
    }
    commit(next);
  });
}

/** Native-feeling back: pops one level. Uses the browser history when the previous entry is the parent. */
export function back(fallback?: string) {
  const parent = nav.stack.length > 1 ? nav.stack.at(-2)!.path : fallback ?? (nav.tab ? `/${nav.tab}` : tabPaths.today ?? '/today');
  guarded(parent, () => {
    if (idx > 0 && entries[idx - 1] === parent) history.back();
    else navigate(parent, { replace: true, direction: 'back' });
  });
}

export function switchTab(tab: Tab) {
  const target = nav.tab === tab ? `/${tab}` : tabPaths[tab] ?? `/${tab}`;
  navigate(target, { direction: 'none' });
}

export function lastTabPath(): string {
  for (const t of ['today', 'plan', 'progress', 'profile'] as Tab[]) if (nav.tab === t) return nav.path;
  return tabPaths.today ?? '/today';
}

export function useNav(): NavState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => nav, () => nav);
}
export function getNav() { return nav; }
