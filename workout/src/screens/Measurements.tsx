import { ArrowDown, ArrowUp, CalendarDays, ChevronRight, Minus, Plus, Ruler, Scale, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { deleteMeasurement, saveMeasurement, setUi, showToast, useApp } from '../data/store';
import { daysBetween, fmtLong, fmtShort, fmtWithYear, todayLocal } from '../domain/dates';
import { measurementSeries, RANGE_LABEL, rangeStart, splitSegments } from '../domain/progress';
import {
  canonicalUnit, fmtFixed, measurementFromDisplay, measurementToDisplay, METRIC_BOUNDS, METRIC_LABEL, metricUnit, parseDecimal, round,
} from '../domain/units';
import type { Measurement, MetricKind, RangeKey } from '../domain/types';
import { back, navigate } from '../nav/router';
import { DateSheet, Empty, LineChart, revealOnFocus, Segmented, Sheet, TopBar, useScrollRestore } from '../ui/components';

const METRICS: MetricKind[] = ['weight', 'waist', 'bodyfat'];

export function MeasurementsScreen() {
  const app = useApp();
  useScrollRestore();
  const metric = app.ui.measurementMetric ?? 'weight';
  const range: RangeKey = app.ui.measurementRange ?? '12w';
  const { loadUnit, lengthUnit } = app.settings;
  const unit = metricUnit(metric, loadUnit, lengthUnit);
  const today = todayLocal();
  const from = rangeStart(range, today);
  const all = app.measurements.filter((m) => m.metric === metric).sort((a, b) => b.date.localeCompare(a.date));
  const series = measurementSeries(app.measurements, metric, from);
  const disp = (v: number) => measurementToDisplay(metric, v, loadUnit, lengthUnit);
  const latest = all[0] ?? null;
  const first = series[0];
  const last = series.at(-1);
  const change = first && last && first.id !== last.id ? disp(last.value) - disp(first.value) : null;
  const points = series.map((m) => ({ date: m.date, value: round(disp(m.value), 2), label: `${fmtFixed(disp(m.value))} ${unit}` }));
  const older = all.length - series.length;

  return (
    <div className="with-footer">
      <TopBar title="" />
      <h1 className="h1" style={{ marginTop: 0 }}>Measurements</h1>
      <Segmented label="Measurement" value={metric} onChange={(v) => setUi({ measurementMetric: v })} options={METRICS.map((m) => ({ value: m, label: METRIC_LABEL[m] }))} />
      {latest ? (
        <>
          <p className="big-stat mt16" aria-label={`Latest ${METRIC_LABEL[metric]} ${fmtFixed(disp(latest.value))} ${unit} on ${fmtShort(latest.date)}`}>
            {fmtFixed(disp(latest.value))} <span style={{ fontSize: '.6em' }}>{unit}</span>
          </p>
          <p className="mt0 muted small">Latest · {fmtWithYear(latest.date)}</p>
          <p className="delta mt0" aria-live="polite">
            {change === null ? <><Minus size={18} aria-hidden /> Need two entries in {RANGE_LABEL[range]} to show change</>
              : <>{change < 0 ? <ArrowDown size={18} aria-hidden /> : change > 0 ? <ArrowUp size={18} aria-hidden /> : <Minus size={18} aria-hidden />}
                {change > 0 ? '+' : change < 0 ? '−' : '±'}{fmtFixed(Math.abs(change))} {unit} ({RANGE_LABEL[range]})</>}
          </p>
        </>
      ) : null}
      <div className="mt16"><Segmented label="Chart range" value={range} onChange={(v) => setUi({ measurementRange: v })} options={(['4w', '12w', '1y'] as RangeKey[]).map((r) => ({ value: r, label: RANGE_LABEL[r] }))} /></div>
      <div className="mt16">
        {points.length ? (
          <LineChart title={`${METRIC_LABEL[metric]} in ${unit}, ${RANGE_LABEL[range]}`} points={points} segments={splitSegments(points)} unitLabel={unit} from={from} to={today} />
        ) : (
          <Empty icon={metric === 'waist' ? <Ruler aria-hidden /> : <Scale aria-hidden />} title={all.length ? `No ${METRIC_LABEL[metric].toLowerCase()} entries in ${RANGE_LABEL[range]}` : `No ${METRIC_LABEL[metric].toLowerCase()} entries yet`}>
            <p className="muted small">{metric === 'bodyfat' ? 'Body fat is optional. Enter a reading from your own scale or test.' : 'Add your first entry to start the chart.'}</p>
          </Empty>
        )}
        {points.length > 1 && <p className="muted small">Gaps longer than three weeks are left unconnected.</p>}
      </div>
      <h2 className="h2">{metric === 'weight' ? 'Weigh-ins' : 'Entries'}</h2>
      {series.length ? (
        <ul className="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[...series].reverse().map((m) => (
            <li key={m.id}>
              <button type="button" className="list-row" onClick={() => navigate(`/progress/measurements/log/${m.id}`)} aria-label={`${fmtLong(m.date)}: ${fmtFixed(disp(m.value))} ${unit}${m.note ? `, note: ${m.note}` : ''}. Edit`}>
                <span className="lead"><CalendarDays size={20} aria-hidden /></span>
                <span className="label">{fmtShort(m.date)}{m.note && <span className="sub">{m.note}</span>}</span>
                <span className="value ink">{fmtFixed(disp(m.value))} {unit}</span>
                <ChevronRight className="chev" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="muted">No entries in this range.</p>}
      {older > 0 && <p className="muted small">{older} older entr{older === 1 ? 'y is' : 'ies are'} outside {RANGE_LABEL[range]}. <button type="button" className="link-btn" onClick={() => setUi({ measurementRange: '1y' })}>Show 1 year</button></p>}
      <div className="footer">
        <button type="button" className="btn big" onClick={() => navigate('/progress/measurements/log/new')}><Plus aria-hidden /> Add measurement</button>
      </div>
    </div>
  );
}

export function LogMeasurement({ entryId }: { entryId: string }) {
  const app = useApp();
  const { loadUnit, lengthUnit } = app.settings;
  const existing = entryId !== 'new' ? app.measurements.find((m) => m.id === entryId) ?? null : null;
  const [metric, setMetric] = useState<MetricKind>(existing?.metric ?? app.ui.measurementMetric ?? 'weight');
  const defaultUnit = (m: MetricKind) => metricUnit(m, loadUnit, lengthUnit);
  const [unit, setUnit] = useState(defaultUnit(existing?.metric ?? metric));
  const [value, setValue] = useState(existing ? fmtFixed(measurementToDisplay(existing.metric, existing.value, loadUnit, lengthUnit), 1) : '');
  const [date, setDate] = useState(existing?.date ?? todayLocal());
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState('');
  const [dateOpen, setDateOpen] = useState(false);
  const [conflict, setConflict] = useState<Measurement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (entryId !== 'new' && !existing) return <><TopBar title="" /><p>Entry not found.</p></>;
  const units = metric === 'weight' ? ['kg', 'lb'] : metric === 'waist' ? ['cm', 'in'] : ['%'];

  const finish = (rec: Measurement) => {
    const days = daysBetween(rec.date, todayLocal());
    const range: RangeKey = days < 28 ? (app.ui.measurementRange ?? '12w') : days < 84 ? (app.ui.measurementRange === '1y' ? '1y' : '12w') : '1y';
    setUi({ measurementMetric: rec.metric, measurementRange: range });
    showToast(`${METRIC_LABEL[rec.metric]} saved: ${fmtFixed(measurementToDisplay(rec.metric, rec.value, loadUnit, lengthUnit))} ${defaultUnit(rec.metric)} on ${fmtShort(rec.date)}`);
    back('/progress/measurements');
  };

  const submit = async (overwriteId?: string) => {
    const v = parseDecimal(value);
    if (value.trim() === '' || Number.isNaN(v)) { setError('Enter a number, for example 82.5'); document.getElementById('mval')?.focus(); return; }
    const canonical = measurementFromDisplay(metric, v, unit);
    const [lo, hi] = METRIC_BOUNDS[metric];
    if (canonical < lo || canonical > hi) {
      const loD = measurementToDisplay(metric, lo, unit as never, unit as never); const hiD = measurementToDisplay(metric, hi, unit as never, unit as never);
      setError(`${METRIC_LABEL[metric]} must be between ${fmtFixed(loD, 0)} and ${fmtFixed(hiD, 0)} ${unit}.`);
      return;
    }
    if (date > todayLocal()) { setError('The date cannot be in the future.'); return; }
    const clash = app.measurements.find((m) => m.metric === metric && m.date === date && m.id !== (overwriteId ?? existing?.id));
    if (clash && !overwriteId) { setConflict(clash); return; }
    const targetId = overwriteId ?? existing?.id;
    // Editing an entry onto a date that already had one: keep the other record (the user chose to update it) and remove this one.
    if (overwriteId && existing && overwriteId !== existing.id) await deleteMeasurement(existing.id);
    const rec = await saveMeasurement({ id: targetId, metric, value: canonical, date, note: note.trim() });
    finish(rec);
  };

  return (
    <form className="with-footer" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
      <TopBar title="" />
      <h1 className="h1" style={{ marginTop: 0 }}>{existing ? 'Edit measurement' : 'Log measurement'}</h1>
      <Segmented label="Metric" value={metric} onChange={(m) => { setMetric(m); setUnit(defaultUnit(m)); setError(''); setConflict(null); }} options={METRICS.map((m) => ({ value: m, label: METRIC_LABEL[m] }))} />
      <div className="field mt16">
        <label htmlFor="mval">Value</label>
        <div className={`input-wrap${error ? ' input-invalid' : ''}`} style={{ minHeight: 84 }}>
          <input id="mval" inputMode="decimal" enterKeyHint="done" autoComplete="off" value={value} placeholder="0.0" onFocus={revealOnFocus}
            onChange={(e) => { setValue(e.target.value); setError(''); }} aria-invalid={!!error} aria-describedby={error ? 'merr' : 'munit-hint'}
            style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: '3rem', minHeight: 80 }} />
          <label htmlFor="munit" className="sr-only">Unit</label>
          <select id="munit" value={unit} onChange={(e) => setUnit(e.target.value)} disabled={units.length === 1} style={{ flex: 'none', width: 'auto', fontWeight: 700, fontSize: '1.2rem' }}>
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <p id="munit-hint" className="muted small">Stored as {canonicalUnit(metric)}; shown in your chosen units.</p>
        {error && <p className="error" id="merr" role="alert">⚠ {error}</p>}
      </div>
      <div className="field">
        <span className="field-label">Date</span>
        <button type="button" className="input-wrap" style={{ width: '100%' }} onClick={() => setDateOpen(true)} aria-label={`Date: ${fmtLong(date)}. Change`}>
          <CalendarDays aria-hidden /><span className="grow" style={{ textAlign: 'left' }}>{date === todayLocal() ? 'Today' : fmtLong(date)}</span><ChevronRight aria-hidden />
        </button>
      </div>
      <div className="field">
        <label htmlFor="mnote">Notes (optional)</label>
        <textarea id="mnote" className="input" placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} onFocus={revealOnFocus} />
      </div>
      {existing && <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}><Trash2 size={18} aria-hidden /> Delete entry</button>}
      <div className="footer"><button type="submit" className="btn big">Save entry</button></div>

      {dateOpen && <DateSheet title="Measurement date" value={date} max={todayLocal()} onClose={() => setDateOpen(false)} onSelect={(d) => { setDate(d); setDateOpen(false); setConflict(null); setError(''); }} />}
      {conflict && (
        <Sheet title="Entry already exists" onClose={() => setConflict(null)}>
          <p className="mt0">{METRIC_LABEL[metric]} for {fmtLong(date)} is already logged:</p>
          <div className="panel pad between"><span>{fmtShort(conflict.date)}{conflict.note ? ` · ${conflict.note}` : ''}</span><strong className="display-num" style={{ fontSize: '1.5rem' }}>{fmtFixed(measurementToDisplay(metric, conflict.value, loadUnit, lengthUnit))} {defaultUnit(metric)}</strong></div>
          <p className="small muted">Updating replaces it with {value} {unit}. There is one entry per metric per day.</p>
          <div className="actions">
            <button type="button" className="btn" data-autofocus onClick={() => { const c = conflict; setConflict(null); void submit(c.id); }}>Update existing entry</button>
            <button type="button" className="btn secondary" onClick={() => { setConflict(null); setDateOpen(true); }}>Choose another date</button>
            <button type="button" className="btn ghost" onClick={() => setConflict(null)}>Cancel</button>
          </div>
        </Sheet>
      )}
      {confirmDelete && existing && (
        <Sheet title="Delete entry?" onClose={() => setConfirmDelete(false)}>
          <p className="mt0">{METRIC_LABEL[existing.metric]} on {fmtLong(existing.date)} will be removed.</p>
          <div className="actions">
            <button type="button" className="btn danger" onClick={async () => { setConfirmDelete(false); await deleteMeasurement(existing.id); showToast('Entry deleted'); back('/progress/measurements'); }}>Delete</button>
            <button type="button" className="btn ghost" data-autofocus onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        </Sheet>
      )}
    </form>
  );
}
