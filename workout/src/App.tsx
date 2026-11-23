import { BarChart3, CalendarDays, Home, RotateCw, User, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from './data/store';
import { navigate, Screen, switchTab, Tab, useNav } from './nav/router';
import { useKeyboardInset } from './ui/components';
import { ExerciseDetail, ExercisesScreen } from './screens/Exercises';
import { EditWorkout } from './screens/Edit';
import { FinisherScreen } from './screens/Finisher';
import { HistoryScreen } from './screens/History';
import { LiveWorkout } from './screens/Live';
import { LogMeasurement, MeasurementsScreen } from './screens/Measurements';
import { PlanScreen } from './screens/Plan';
import { PreviewScreen } from './screens/Preview';
import { ProfileScreen } from './screens/Profile';
import { ProgressScreen } from './screens/Progress';
import { SettingsScreen } from './screens/Settings';
import { SetupScreen } from './screens/Setup';
import { RecordScreen, ReviewScreen } from './screens/Summary';
import { TodayScreen } from './screens/Today';

const TAB_SCREENS = new Set(['today', 'plan', 'progress', 'profile', 'library', 'history', 'measurements']);

function renderScreen(s: Screen) {
  switch (s.name) {
    case 'today': return <TodayScreen />;
    case 'plan': return <PlanScreen />;
    case 'progress': return <ProgressScreen />;
    case 'profile': return <ProfileScreen />;
    case 'setup': return <SetupScreen />;
    case 'preview': return <PreviewScreen date={s.date} />;
    case 'edit': return <EditWorkout templateId={s.templateId} />;
    case 'pick': return <ExercisesScreen mode={s.mode} replaceKey={s.key} />;
    case 'library': return <ExercisesScreen mode="browse" />;
    case 'exercise': return <ExerciseDetail exerciseId={s.exerciseId} />;
    case 'record': return <RecordScreen sessionId={s.sessionId} />;
    case 'history': return <HistoryScreen />;
    case 'measurements': return <MeasurementsScreen />;
    case 'log': return <LogMeasurement entryId={s.entryId} />;
    case 'settings': return <SettingsScreen />;
    case 'session': return <LiveWorkout />;
    case 'finisher': return <FinisherScreen />;
    case 'review': return <ReviewScreen />;
  }
}

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

export function App() {
  const app = useApp();
  const nav = useNav();
  const online = useOnline();
  useKeyboardInset();
  const top = nav.stack.at(-1)!.screen;

  // First use: send everything to setup until a profile exists.
  useEffect(() => {
    if (app.ready && !app.loadError && !app.profile && top.name !== 'setup') navigate('/setup', { replace: true, direction: 'none' });
    if (app.ready && app.profile && top.name === 'setup') navigate('/today', { replace: true, direction: 'none' });
  }, [app.ready, app.profile, app.loadError, top.name]);

  useEffect(() => {
    const titles: Partial<Record<Screen['name'], string>> = { today: 'Today', plan: 'Weekly plan', progress: 'Progress', profile: 'Profile', session: 'Live workout', finisher: 'Abs finisher', review: 'Session summary' };
    document.title = `${titles[top.name] ?? 'Workout'} · Workout Tracker`;
  }, [top.name]);

  if (!app.ready) return <div className="app" aria-busy="true"><div className="screen"><p className="muted">Loading…</p></div></div>;
  if (app.loadError) {
    return (
      <div className="app"><div className="screen">
        <h1 className="h1">Storage unavailable</h1>
        <p>This browser blocked local storage ({app.loadError}). Private browsing modes can do this. Open the app in a normal window to keep your workouts.</p>
        <button type="button" className="btn" onClick={() => location.reload()}><RotateCw aria-hidden /> Retry</button>
      </div></div>
    );
  }
  if (!app.profile && top.name !== 'setup') return <div className="app" />;

  const showTabs = TAB_SCREENS.has(top.name);
  return (
    <div className="app">
      {app.saveError && (
        <div className="banner error error-bar" role="alert">
          <span className="grow">{app.saveError.message}</span>
          <button type="button" className="btn small danger" onClick={app.saveError.retry}><RotateCw size={18} aria-hidden /> Retry</button>
        </div>
      )}
      <main key={nav.path} className={`screen${showTabs ? ' with-tabs' : ''}${top.name === 'finisher' ? ' dark' : ''} anim-${nav.direction}`} id="main">
        {!online && (
          <div className="banner offline" role="status"><WifiOff size={18} aria-hidden /> Offline. Everything still works and saves on this device.</div>
        )}
        {renderScreen(top)}
      </main>
      {showTabs && <TabBar current={nav.tab} />}
      {app.toast && <div className="toast" role="status" aria-live="polite">{app.toast.text}</div>}
    </div>
  );
}

function TabBar({ current }: { current: Tab | null }) {
  const items: { tab: Tab; label: string; icon: typeof Home }[] = [
    { tab: 'today', label: 'Today', icon: Home },
    { tab: 'plan', label: 'Plan', icon: CalendarDays },
    { tab: 'progress', label: 'Progress', icon: BarChart3 },
    { tab: 'profile', label: 'Profile', icon: User },
  ];
  return (
    <nav className="tabbar" aria-label="Primary">
      {items.map(({ tab, label, icon: Icon }) => (
        <button key={tab} type="button" aria-current={current === tab ? 'page' : undefined} onClick={() => switchTab(tab)}>
          <Icon size={24} aria-hidden />
          {label}
          <span className="dot" aria-hidden />
        </button>
      ))}
    </nav>
  );
}
