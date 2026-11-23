import { Download, FileSpreadsheet, Ruler, Timer, Vibrate, Volume2, Weight } from 'lucide-react';
import { useState } from 'react';
import { showToast, updateSettings, useApp } from '../data/store';
import { finishersCsv, measurementsCsv, setsCsv, workoutsCsv } from '../domain/csv';
import { fmtClock, todayLocal } from '../domain/dates';
import { zipFiles } from '../domain/zip';
import { ListRow, Segmented, Sheet, Stepper, Switch, TopBar, useScrollRestore } from '../ui/components';
import { cue } from './Live';

function download(name: string, data: BlobPart, type: string) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function SettingsScreen() {
  const app = useApp();
  useScrollRestore();
  const s = app.settings;
  const [restOpen, setRestOpen] = useState(false);
  const canVibrate = typeof navigator.vibrate === 'function';
  const canAudio = typeof window.AudioContext === 'function' || 'webkitAudioContext' in window;
  const files = () => [
    { name: 'workouts.csv', text: workoutsCsv(app.sessions) },
    { name: 'sets.csv', text: setsCsv(app.sessions, s) },
    { name: 'finishers.csv', text: finishersCsv(app.sessions) },
    { name: 'measurements.csv', text: measurementsCsv(app.measurements, s) },
  ];
  const stamp = todayLocal();

  return (
    <>
      <TopBar title="" />
      <h1 className="h1" style={{ marginTop: 0 }}>Settings</h1>
      <h2 className="h2">Preferences</h2>
      <div className="list">
        <div className="list-row"><span className="lead"><Weight aria-hidden /></span><span className="label">Weight unit</span>
          <Segmented label="Weight unit" value={s.loadUnit} onChange={(v) => { updateSettings({ loadUnit: v }); showToast(`Showing weights in ${v}. Saved records are unchanged.`); }} options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} className="compact" /></div>
        <div className="list-row"><span className="lead"><Ruler aria-hidden /></span><span className="label">Length unit</span>
          <Segmented label="Length unit" value={s.lengthUnit} onChange={(v) => { updateSettings({ lengthUnit: v }); showToast(`Showing lengths in ${v}. Saved records are unchanged.`); }} options={[{ value: 'cm', label: 'cm' }, { value: 'in', label: 'in' }]} className="compact" /></div>
        <ListRow icon={<Timer aria-hidden />} label="Default rest" sub="For new workouts" value={`${s.defaultRestSec} sec`} onClick={() => setRestOpen(true)} />
        <div className="list-row"><span className="lead"><Volume2 aria-hidden /></span><span className="label">Timer sound{!canAudio && <span className="sub">Not supported in this browser</span>}</span>
          <Switch label="Timer sound" checked={s.timerSound && canAudio} disabled={!canAudio} onChange={(v) => { updateSettings({ timerSound: v }); if (v) cue(true, false, [120]); }} /></div>
        <div className="list-row"><span className="lead"><Vibrate aria-hidden /></span><span className="label">Haptics{!canVibrate && <span className="sub">Not supported on this device (e.g. iPhone Safari)</span>}</span>
          <Switch label="Haptics" checked={s.haptics && canVibrate} disabled={!canVibrate} onChange={(v) => { updateSettings({ haptics: v }); if (v) cue(false, true, [60]); }} /></div>
      </div>
      <p className="muted small">Units change how values are shown and entered. Stored records stay in kg and cm at full precision.</p>

      <button type="button" className="btn big mt16" onClick={() => { download(`workout-data-${stamp}.zip`, zipFiles(files()) as BlobPart, 'application/zip'); showToast('Exported 4 CSV files'); }}>
        <Download aria-hidden /> Export workout data
      </button>
      <p className="muted small">A ZIP with workouts, sets, finisher results and measurements, with dates and unit columns. Or download one file:</p>
      <div className="list">
        {files().map((f) => (
          <ListRow key={f.name} icon={<FileSpreadsheet aria-hidden />} label={f.name} sub={`${Math.max(0, f.text.trim().split('\n').length - 1)} rows`} onClick={() => download(f.name.replace('.csv', `-${stamp}.csv`), f.text, 'text/csv;charset=utf-8')} ariaLabel={`Download ${f.name}`} />
        ))}
      </div>
      {restOpen && <DefaultRestSheet value={s.defaultRestSec} onClose={() => setRestOpen(false)} />}
    </>
  );
}

function DefaultRestSheet({ value, onClose }: { value: number; onClose: () => void }) {
  const [v, setV] = useState(value);
  return (
    <Sheet title="Default rest" onClose={onClose}>
      <Stepper label="default rest" value={v} onChange={setV} step={15} min={15} max={600} format={(x) => `${fmtClock(x)}`} />
      <div className="chips mt8" role="group" aria-label="Presets">
        {[60, 90, 120, 180].map((p) => <button key={p} type="button" className="chip" aria-pressed={v === p} onClick={() => setV(p)}>{p} sec</button>)}
      </div>
      <p className="muted small">Used for workouts you start from now on. A workout in progress keeps its rest times.</p>
      <div className="actions">
        <button type="button" className="btn" onClick={() => { updateSettings({ defaultRestSec: v }); onClose(); }}>Save</button>
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}
