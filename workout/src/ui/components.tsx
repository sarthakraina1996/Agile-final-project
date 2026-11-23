import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react';
import { ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { addDays, fmtShort, parseLocal, startOfWeek, toLocalDate, todayLocal, WEEKDAY_LETTER } from '../domain/dates';
import { back, rememberScroll, savedScroll, useNav } from '../nav/router';

/* ---------- Hooks ---------- */

/**
 * Re-renders on an interval and returns the current time. Timers derive their value from stored
 * timestamps, so the tick only drives repainting; reading Date.now() at render avoids showing a
 * stale value right after a pause/resume or when the page becomes visible again.
 */
export function useNow(intervalMs = 250, active = true): number {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    setTick((t) => t + 1);
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    const vis = () => setTick((t) => t + 1);
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [intervalMs, active]);
  return Date.now();
}

/** Restore this screen's scroll position when returning to it. */
export function useScrollRestore(ready = true) {
  const nav = useNav();
  const path = nav.path;
  useLayoutEffect(() => {
    if (!ready) return;
    const y = nav.direction === 'forward' ? 0 : savedScroll(path);
    window.scrollTo(0, y);
    let t: number | undefined;
    const onScroll = () => { window.clearTimeout(t); t = window.setTimeout(rememberScroll, 80); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ready]);
}

const memo = new Map<string, unknown>();
/** Component state that survives navigating away and back within this browser session. */
export function useStickyState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    if (memo.has(key)) return memo.get(key) as T;
    try { const raw = sessionStorage.getItem(`wt.s.${key}`); if (raw) return JSON.parse(raw) as T; } catch { /* ignore */ }
    return initial;
  });
  const set = (next: T) => {
    memo.set(key, next);
    try { sessionStorage.setItem(`wt.s.${key}`, JSON.stringify(next)); } catch { /* ignore */ }
    setV(next);
  };
  return [v, set];
}

/** Track the on-screen keyboard (visualViewport) so fixed action bars stay above it on iOS. */
export function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb', `${inset > 80 ? inset : 0}px`);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);
}

/** Keep a focused input clear of the sticky footer and keyboard. */
export function revealOnFocus(e: React.FocusEvent<HTMLElement>) {
  const el = e.currentTarget;
  setTimeout(() => {
    const footer = document.querySelector('.footer') as HTMLElement | null;
    const r = el.getBoundingClientRect();
    const vvH = window.visualViewport?.height ?? window.innerHeight;
    const bottomLimit = (footer ? footer.getBoundingClientRect().top : vvH) - 12;
    if (r.bottom > bottomLimit || r.top < 60) window.scrollBy({ top: r.bottom - bottomLimit + (r.top < 60 ? -(60 - r.top) : 0), behavior: 'auto' });
  }, 250);
}

/* ---------- Layout pieces ---------- */

export function TopBar({ title, onBack, backLabel = 'Back', trailing, left }: { title?: ReactNode; onBack?: () => void; backLabel?: string; trailing?: ReactNode; left?: boolean }) {
  return (
    <header className="topbar">
      <button type="button" className="icon-btn" onClick={onBack ?? (() => back())} aria-label={backLabel}>
        <ChevronLeft size={28} aria-hidden />
      </button>
      {title !== undefined ? <div className={`title${left ? ' left' : ''}`}>{title}</div> : <div className="grow" />}
      <div className="trailing">{trailing ?? <span className="spacer" />}</div>
    </header>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange, label, large, className }: {
  options: { value: T; label: ReactNode; aria?: string }[]; value: T; onChange: (v: T) => void; label: string; large?: boolean; className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`segmented${large ? ' large' : ''}${className ? ` ${className}` : ''}`}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} aria-label={o.aria} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <span className="switch-wrap">
      <span className="switch-state" aria-hidden>{checked ? 'On' : 'Off'}</span>
      <button type="button" role="switch" className="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} />
    </span>
  );
}

export function ListRow({ icon, label, sub, value, onClick, chevron = true, valueInk, ariaLabel }: {
  icon?: ReactNode; label: ReactNode; sub?: ReactNode; value?: ReactNode; onClick?: () => void; chevron?: boolean; valueInk?: boolean; ariaLabel?: string;
}) {
  const body = (
    <>
      {icon && <span className="lead" aria-hidden>{icon}</span>}
      <span className="label">{label}{sub && <span className="sub">{sub}</span>}</span>
      {value !== undefined && <span className={`value${valueInk ? ' ink' : ''}`}>{value}</span>}
      {onClick && chevron && <ChevronRight className="chev" size={22} aria-hidden />}
    </>
  );
  return onClick ? <button type="button" className="list-row" onClick={onClick} aria-label={ariaLabel}>{body}</button> : <div className="list-row">{body}</div>;
}

/* ---------- Sheet ---------- */

export function Sheet({ title, onClose, children, labelledBy }: { title: ReactNode; onClose: () => void; children: ReactNode; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const headingId = labelledBy ?? `${id}-title`;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    const focusables = () => [...el.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')];
    (el.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0] ?? el).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1)!.focus(); }
        else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; prev?.focus?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={headingId} ref={ref} tabIndex={-1}>
        <div className="grab" aria-hidden />
        <div className="sheet-head">
          <h2 id={headingId}>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={24} aria-hidden /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 999, label, format }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; label: string; format?: (v: number) => string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="icon-btn boxed" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} aria-label={`Decrease ${label}`}><Minus aria-hidden /></button>
      <output className="v" aria-live="polite">{format ? format(value) : value}</output>
      <button type="button" className="icon-btn boxed" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} aria-label={`Increase ${label}`}><Plus aria-hidden /></button>
    </div>
  );
}

/** Month calendar date picker sheet. */
export function DateSheet({ title, value, onSelect, onClose, max, min }: { title: string; value: string; onSelect: (d: string) => void; onClose: () => void; max?: string; min?: string }) {
  const [month, setMonth] = useState(() => value.slice(0, 7));
  const first = parseLocal(`${month}-01`);
  const gridStart = startOfWeek(toLocalDate(first));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = todayLocal();
  const shift = (n: number) => { const d = new Date(first); d.setMonth(d.getMonth() + n); setMonth(toLocalDate(d).slice(0, 7)); };
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="between">
        <button type="button" className="icon-btn boxed" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft aria-hidden /></button>
        <strong aria-live="polite">{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
        <button type="button" className="icon-btn boxed" onClick={() => shift(1)} aria-label="Next month"><ChevronRight aria-hidden /></button>
      </div>
      <div className="cal mt8">
        {WEEKDAY_LETTER.map((w, i) => <div key={i} className="wd" aria-hidden>{w}</div>)}
        {days.map((d) => (
          <button
            key={d} type="button" aria-pressed={d === value} className={d === today ? 'today' : ''}
            disabled={(max && d > max) || (min && d < min) || !d.startsWith(month) ? true : false}
            aria-label={`${parseLocal(d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${d === today ? ', today' : ''}`}
            onClick={() => onSelect(d)}
          >
            {d.startsWith(month) ? Number(d.slice(8)) : ''}
          </button>
        ))}
      </div>
      <div className="actions">
        {(!max || today <= max) && <button type="button" className="btn secondary" onClick={() => onSelect(today)}>Today</button>}
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

/* ---------- Exercise image ---------- */
export function ExerciseImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />;
}

/* ---------- Line chart ---------- */

export interface ChartPoint { date: string; value: number; label: string }

/** Time-scaled line chart. Segments break across long gaps so missing dates are not interpolated. */
export function LineChart({ points, segments, unitLabel, from, to, title, decimals = 1 }: {
  points: ChartPoint[]; segments: ChartPoint[][]; unitLabel: string; from: string; to: string; title: string; decimals?: number;
}) {
  const W = 340, H = 190, L = 36, R = 12, T = 12, B = 26;
  const t0 = parseLocal(from).getTime();
  const t1 = Math.max(parseLocal(to).getTime(), t0 + 86400000);
  const vals = points.map((p) => p.value);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (lo === hi) { lo -= Math.max(1, Math.abs(lo) * 0.05); hi += Math.max(1, Math.abs(hi) * 0.05); }
  const pad = (hi - lo) * 0.15; lo -= pad; hi += pad;
  const ticks = niceTicks(lo, hi, 5);
  lo = Math.min(lo, ticks[0]); hi = Math.max(hi, ticks.at(-1)!);
  const x = (d: string) => L + ((parseLocal(d).getTime() - t0) / (t1 - t0)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const xticks = Array.from({ length: 4 }, (_, i) => toLocalDate(new Date(t0 + ((t1 - t0) * i) / 3)));
  const fmt = (v: number) => (Math.abs(v) >= 100 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(decimals));
  const summary = points.map((p) => `${fmtShort(p.date)}: ${p.label}`).join('; ');
  return (
    <figure style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${points.length} ${points.length === 1 ? 'entry' : 'entries'}. ${summary}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
            <text x={L - 6} y={y(t) + 4} textAnchor="end">{fmt(t)}</text>
          </g>
        ))}
        {xticks.map((d, i) => <text key={d + i} x={x(d)} y={H - 6} textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}>{fmtShort(d)}</text>)}
        {segments.filter((s) => s.length > 1).map((s, i) => <polyline key={i} className="line" points={s.map((p) => `${x(p.date)},${y(p.value)}`).join(' ')} />)}
        {points.map((p, i) => <circle key={p.date + i} className={`pt${i === points.length - 1 ? ' last' : ''}`} cx={x(p.date)} cy={y(p.value)} r={5}><title>{`${fmtShort(p.date)}: ${p.label}`}</title></circle>)}
      </svg>
      <figcaption className="sr-only">{unitLabel}</figcaption>
    </figure>
  );
}

function niceTicks(lo: number, hi: number, n: number): number[] {
  const span = hi - lo;
  const raw = span / (n - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + step * 0.5 && out.length < 8; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ico" aria-hidden>{icon}</div>
      <p style={{ fontWeight: 700, margin: '0 0 4px' }}>{title}</p>
      {children}
    </div>
  );
}
