import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  ConciergeBell,
  BedDouble,
  Sparkles,
  Users,
  Wallet,
  Building2,
  ChevronDown,
  ChevronRight,
  Search,
  Bell,
  LogOut,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Check,
  ShieldCheck,
  Globe2,
  Menu,
  MoreHorizontal,
  X,
  FileText,
  Download,
  Mail,
  Clock3,
  MoveRight,
  RotateCcw,
  ClipboardCheck,
  CircleHelp,
  Wifi,
} from 'lucide-react';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import {
  request,
  money,
  dateAdd,
  dateFormat,
  canDesk,
  canFinance,
  canClean,
  API,
  download,
} from './lib';
import { Brand, Button, Modal, Avatar, Status, Panel, Table, Empty, Tabs, SearchField } from './ui';
import Dashboard from './dashboard';
import BookingCalendar from './calendar';
import { BookingForm, PostingForm, MoveForm, MasterForm } from './forms';
import {
  ReservationList,
  RoomList,
  RoomDetail,
  Housekeeping,
  Guests,
  PropertyPortfolio,
  Finance,
} from './operations';
import './styles.css';
import './workspace.css';
const navigation = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['reservations', 'Reservations', BookOpen],
  ['calendar', 'Calendar', CalendarDays],
  ['frontdesk', 'Front Desk', ConciergeBell],
  ['rooms', 'Rooms', BedDouble],
  ['housekeeping', 'Housekeeping', Sparkles],
  ['guests', 'Guests', Users],
  ['finance', 'Finance', Wallet],
  ['properties', 'Multi-Property', Building2],
];
const titles = {
  reservations: ['Reservations', 'Search bookings, review stays and manage room assignments.'],
  calendar: ['Booking calendar', 'Room availability and reservations across your properties.'],
  frontdesk: ['Front desk', 'Today’s arrivals, departures and guests in house.'],
  rooms: ['Rooms & spaces', 'Room inventory, availability and maintenance status.'],
  housekeeping: [
    'Housekeeping management',
    'Cleaning assignments, room status and supervisor inspections.',
  ],
  guests: ['Your guests', 'Guest profiles, contact details and stay history.'],
  finance: [
    'Financial source records',
    'Guest charges, payments and the records behind your revenue.',
  ],
  properties: [
    'Your property collection',
    'Property settings, room counts and operating policies.',
  ],
};
function Login({ onLogin }) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [demo, setDemo] = useState(false);
  useEffect(() => {
    request('/health')
      .then((d) => setDemo(d.demo))
      .catch(() => setError('The local hub is not responding. Start the server and retry.'));
  }, []);
  async function login(e, role) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await request('/login', 'POST', {
        email: role ? `${role}@brainadz.com` : email,
        password: role ? 'Brainadz@123' : password,
      });
      await onLogin();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <div className="h-login">
      <section className="h-login-story">
        <Brand />
        <div className="h-login-story-copy">
          <span className="h-eyebrow">BRAINADZ HOSPITALITY OS</span>
          <h1>
            Your properties.
            <br />
            One workspace.
          </h1>
          <p>
            Reservations, rooms and the people who keep
            <br />
            your properties running.
          </p>
          <div className="h-login-photo">
            <img src="/hospitality/deluxe-room.png" alt="Illustrative contemporary hotel room" />
            <span>Property operations, from arrival to checkout.</span>
          </div>
        </div>
        <footer>
          BrainADZ Group<span>Hospitality operations</span>
        </footer>
      </section>
      <section className="h-login-form-side">
        <div className="h-login-form">
          <div className="h-login-mobile-brand">
            <Brand />
          </div>
          <div className="h-eyebrow">YOUR WORKSPACE</div>
          <h2>Welcome back</h2>
          <p>Sign in with your work account to continue.</p>
          <form onSubmit={login}>
            <label>
              Work email
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourhotel.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </label>
            {error && (
              <div className="h-error" role="alert">
                {error}
              </div>
            )}
            <Button type="submit" disabled={busy} icon={ArrowRight}>
              {busy ? 'Connecting…' : 'Sign in to workspace'}
            </Button>
          </form>
          {demo && (
            <div className="h-demo-logins">
              <span className="h-eyebrow">TRY A DEMO ACCOUNT</span>
              <p>Explore five sample properties with a role below.</p>
              <div>
                {[
                  ['owner', 'Group owner'],
                  ['manager', 'General manager'],
                  ['frontdesk', 'Front desk'],
                  ['housekeeping', 'Housekeeping'],
                ].map(([role, label]) => (
                  <button key={role} onClick={(e) => login(e, role)} disabled={busy}>
                    {label}
                    <ArrowUpRight size={12} />
                  </button>
                ))}
              </div>
              <small>Sample data only · Demo password: Brainadz@123</small>
            </div>
          )}
          <a className="h-login-hr" href="/hr">
            Looking for the People & HR workspace?
            <ArrowUpRight size={12} />
          </a>
        </div>
        <span className="h-login-security">
          <ShieldCheck size={14} /> BrainADZ Hospitality OS
        </span>
      </section>
    </div>
  );
}
function FolioView({ reservation, onClose, onRefresh, onNotice, onMutate, user, onMove }) {
  const [folio, setFolio] = useState(null),
    [error, setError] = useState(''),
    [posting, setPosting] = useState(null),
    [tab, setTab] = useState('Folio');
  async function load() {
    try {
      setFolio(await request('/folios/' + reservation.id));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, [reservation.id]);
  async function action(kind) {
    try {
      await onMutate(
        '/reservations/' + reservation.id + '/' + kind,
        'POST',
        {},
        kind === 'check-in'
          ? 'Welcome in. The guest is checked in.'
          : 'Checkout complete. A housekeeping task is ready.',
      );
      await load();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <Modal
      title={folio ? 'Guest folio · ' + folio.guest.name : 'Reservation details'}
      subtitle={reservation.id + ' · Private to your property access'}
      onClose={onClose}
      wide
    >
      {error && (
        <div className="h-error" role="alert">
          {error}
        </div>
      )}
      {!folio && !error ? (
        <div className="h-loading-inline">Loading guest folio…</div>
      ) : (
        folio && (
          <>
            <div className="h-folio-summary">
              <div>
                <Avatar name={folio.guest.name} size="large" />
                <div>
                  <h3>{folio.guest.name}</h3>
                  <p>
                    {dateFormat(folio.reservation.arrival)} –{' '}
                    {dateFormat(folio.reservation.departure)} <i>·</i> {folio.property.name}
                  </p>
                  <Status>{folio.reservation.status}</Status>
                </div>
              </div>
              <div>
                <span>OUTSTANDING BALANCE</span>
                <strong className={folio.balance > 0 ? 'due' : ''}>
                  {money(folio.balance, folio.property.currency)}
                </strong>
                <small>Includes posted taxes</small>
              </div>
            </div>
            <Tabs tabs={['Folio', 'Stay details']} value={tab} onChange={setTab} />
            {tab === 'Stay details' ? (
              <dl className="h-definition h-stay-details">
                {[
                  ['Guest email', folio.guest.email || 'Not provided'],
                  ['Phone', folio.guest.phone || 'Not provided'],
                  ['Booking source', folio.reservation.source],
                  ['Nightly rate', money(folio.reservation.rate)],
                  [
                    'Occupants',
                    `${folio.reservation.adults} adults · ${folio.reservation.children} children`,
                  ],
                  ['Special requests', folio.reservation.notes || 'None'],
                  ['Contact-data consent', folio.guest.consent ? 'Recorded' : 'Not recorded'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <Table
                headers={['Date', 'Description', 'Department', 'Debit', 'Credit', '']}
                empty={!folio.entries.length}
              >
                {folio.entries.map((e) => (
                  <tr key={e.id}>
                    <td>{dateFormat(e.business_date)}</td>
                    <td>
                      <b>{e.description}</b>
                      <small className="h-cell-small">
                        {e.id}
                        {e.reversal_of ? ' · Reversal' : ''}
                      </small>
                    </td>
                    <td>{e.department}</td>
                    <td>{e.debit ? money(e.debit) : '—'}</td>
                    <td>{e.credit ? money(e.credit) : '—'}</td>
                    <td>
                      {canFinance(user) &&
                        !['Checked out', 'Cancelled'].includes(folio.reservation.status) &&
                        e.kind !== 'reversal' &&
                        !folio.entries.some((x) => x.reversal_of === e.id) && (
                          <button
                            className="h-icon-button"
                            aria-label={'Reverse ' + e.description}
                            onClick={() => setPosting({ kind: 'reversal', entry: e })}
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
            {canDesk(user) && folio.reservation.status === 'Confirmed' && (
              <div className="h-reservation-tools">
                <Button
                  variant="secondary"
                  icon={MoveRight}
                  onClick={() => onMove({ ...folio.reservation, guest_name: folio.guest.name })}
                >
                  Amend stay / room
                </Button>
                <CancelReservation
                  onCancel={async () => {
                    try {
                      await onMutate(
                        '/reservations/' + reservation.id,
                        'PATCH',
                        { action: 'cancel' },
                        'Reservation cancelled.',
                      );
                      await load();
                    } catch (e) {
                      setError(e.message);
                    }
                  }}
                />
              </div>
            )}
            <div className="h-folio-actions">
              <div>
                {canDesk(user) && folio.reservation.status === 'Confirmed' && (
                  <Button icon={Check} onClick={() => action('check-in')}>
                    Check in
                  </Button>
                )}
                {['In house', 'Confirmed'].includes(folio.reservation.status) && (
                  <>
                    {folio.reservation.status === 'In house' && (
                      <Button
                        variant="secondary"
                        icon={Plus}
                        onClick={() => setPosting({ kind: 'charge' })}
                      >
                        Post charge
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      icon={Wallet}
                      disabled={folio.balance <= 0}
                      onClick={() => setPosting({ kind: 'payment' })}
                    >
                      Record payment
                    </Button>
                  </>
                )}
                {canDesk(user) && folio.reservation.status === 'In house' && (
                  <Button icon={ArrowRight} onClick={() => action('check-out')}>
                    Check out
                  </Button>
                )}
              </div>
              <a
                href={API + '/folios/' + reservation.id + '/statement'}
                download
                className="h-download"
              >
                <Download size={14} /> Statement
              </a>
            </div>
            <div className="h-info h-statement-note">
              Payments are manual records. Statements are demonstrations, not certified tax
              invoices. Charges and payments cannot be silently edited.
            </div>
            {posting && (
              <PostingForm
                reservation={{
                  ...reservation,
                  balance: folio.balance,
                  guest_name: folio.guest.name,
                }}
                {...posting}
                onClose={() => setPosting(null)}
                onSave={async (b) => {
                  await onMutate('/folios/' + reservation.id, 'POST', b, 'Folio posting saved.');
                  await load();
                }}
              />
            )}
          </>
        )
      )}
    </Modal>
  );
}
function App() {
  const now = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [page, setPage] = useState(location.hash.slice(1) || 'dashboard'),
    [property, setProperty] = useState('all'),
    [period, setPeriod] = useState('Month to date'),
    [from, setFrom] = useState(now.slice(0, 7) + '-01'),
    [to, setTo] = useState(dateAdd(now, 1)),
    [calendarRange, setCalendarRange] = useState(null),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(null),
    [busy, setBusy] = useState(false),
    [room, setRoom] = useState(null),
    [search, setSearch] = useState(''),
    [menu, setMenu] = useState(false),
    [online, setOnline] = useState(navigator.onLine);
  const timer = useRef(),
    version = useRef(0);
  async function load() {
    const sequence = ++version.current;
    try {
      const params = new URLSearchParams({
        property,
        from,
        to,
        ...(calendarRange
          ? { calendar_from: calendarRange.from, calendar_to: calendarRange.to }
          : {}),
      });
      const d = await request('/workspace?' + params);
      if (sequence === version.current) {
        setData(d);
        setError('');
      }
    } catch (e) {
      if (sequence === version.current) {
        if (e.status === 401) setData(null);
        else setError(e.message);
      }
    } finally {
      if (sequence === version.current) setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [property, from, to, calendarRange?.from, calendarRange?.to]);
  useEffect(() => {
    const hash = () => {
      setPage(location.hash.slice(1) || 'dashboard');
      setRoom(null);
    };
    const on = () => setOnline(navigator.onLine);
    const shortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setModal({ type: 'search' });
      }
    };
    window.addEventListener('keydown', shortcut);
    window.addEventListener('hashchange', hash);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      window.removeEventListener('hashchange', hash);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
      window.removeEventListener('keydown', shortcut);
    };
  }, []);
  function notice(text, error = false) {
    setToast({ text, error });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 5000);
  }
  function go(p) {
    setPage(p);
    location.hash = p;
    setRoom(null);
    setMenu(false);
    window.scrollTo(0, 0);
  }
  async function mutate(url, method, body, message) {
    setBusy(true);
    try {
      const result = await request(url, method, body);
      await load();
      notice(message || 'Changes saved.');
      return result;
    } catch (e) {
      notice(e.message, true);
      throw e;
    } finally {
      setBusy(false);
    }
  }
  const action = (...args) => mutate(...args).catch(() => {});
  function selectPeriod(value) {
    setPeriod(value);
    let start = now,
      end = dateAdd(now, 1);
    if (value === 'Yesterday') {
      start = dateAdd(now, -1);
      end = now;
    }
    if (value === 'Last 7 days') start = dateAdd(now, -6);
    if (value === 'Last 30 days') start = dateAdd(now, -29);
    if (value === 'Month to date') start = now.slice(0, 7) + '-01';
    if (value === 'Year to date') start = now.slice(0, 4) + '-01-01';
    if (value === 'Custom') return;
    setFrom(start);
    setTo(end);
  }
  function createBooking(initial = {}) {
    setModal({
      type: 'booking',
      initial: { property_id: property !== 'all' ? property : undefined, ...initial },
    });
  }
  function showFolio(r) {
    setModal({ type: 'folio', reservation: r });
  }
  if (loading)
    return (
      <div className="h-loading">
        <Brand />
        <span />
        <p>Loading workspace…</p>
      </div>
    );
  if (!data)
    return error ? (
      <div className="h-loading">
        <Brand />
        <div className="h-error">{error}</div>
        <Button onClick={load}>Retry connection</Button>
      </div>
    ) : (
      <Login onLogin={load} />
    );
  const user = data.user,
    visibleNav = navigation
      .filter(([id]) => id !== 'finance' || canFinance(user))
      .filter(([id]) => id !== 'housekeeping' || canClean(user))
      .filter(
        ([id]) =>
          !['reservations', 'frontdesk', 'guests'].includes(id) ||
          canDesk(user) ||
          user.role === 'finance',
      );
  const selectedRoom = room ? data.rooms.find((r) => r.id === room.id) : null;
  return (
    <div className="hospitality-app">
      <header className="h-global-header">
        <div className="h-global-top">
          <Brand />
          <div className="h-header-context">
            <span className="h-header-label">WORKSPACE</span>
            <span>BrainADZ Group</span>
          </div>
          <div className="h-header-tools">
            <button className="h-global-search" onClick={() => setModal({ type: 'search' })}>
              <Search size={15} />
              <span>Search your workspace</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button
              className="h-icon-button h-notification"
              aria-label="Notifications"
              onClick={() => setModal({ type: 'notifications' })}
            >
              <Bell size={19} />
              <i />
            </button>
            <span className="h-header-rule" />
            <button className="h-user-profile" onClick={() => setModal({ type: 'account' })}>
              <Avatar name={user.name} />
              <span>
                <b>{user.name}</b>
                <small>
                  {
                    {
                      owner: 'Group owner',
                      gm: 'General manager',
                      frontdesk: 'Front office',
                      housekeeping: 'Housekeeping',
                      finance: 'Finance manager',
                    }[user.role]
                  }
                </small>
              </span>
              <ChevronDown size={13} />
            </button>
            <button
              className="h-icon-button h-mobile-nav-button"
              aria-label="Open module navigation"
              aria-expanded={menu}
              aria-controls="hospitality-modules"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
        <div className={'h-nav-strip ' + (menu ? 'open' : '')}>
          <nav id="hospitality-modules" aria-label="Hospitality modules">
            {visibleNav.map(([id, label, Icon]) => (
              <button
                key={id}
                className={page === id ? 'active' : ''}
                aria-current={page === id ? 'page' : undefined}
                onClick={() => go(id)}
              >
                <Icon size={14} />
                {label}
                {id === 'frontdesk' && (
                  <i>
                    {
                      data.reservations.filter(
                        (r) => r.arrival === data.today && r.status === 'Confirmed',
                      ).length
                    }
                  </i>
                )}
              </button>
            ))}
            <button onClick={() => setModal({ type: 'roadmap' })}>
              <MoreHorizontal size={15} />
              More
              <ChevronDown size={11} />
            </button>
          </nav>
          <span className="h-nav-demo">
            <i /> Demo workspace
          </span>
        </div>
      </header>
      <main className="h-main">
        <div className="h-context-bar">
          <div className="h-breadcrumb">
            <span>Hospitality</span>
            <ChevronRight size={10} />
            <b>{page === 'dashboard' ? 'Group overview' : titles[page]?.[0] || 'Overview'}</b>
          </div>
          <div className="h-global-filters">
            <div className="h-property-select">
              <Building2 size={14} />
              <select
                aria-label="Select property"
                value={property}
                onChange={(e) => {
                  setProperty(e.target.value);
                  setRoom(null);
                }}
              >
                <option value="all">All properties</option>
                {data.properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} />
            </div>
            <div className="h-date-select">
              <CalendarDays size={14} />
              <select
                aria-label="Reporting period"
                value={period}
                onChange={(e) => selectPeriod(e.target.value)}
              >
                {[
                  'Today',
                  'Yesterday',
                  'Last 7 days',
                  'Last 30 days',
                  'Month to date',
                  'Year to date',
                  'Custom',
                ].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <ChevronDown size={12} />
            </div>
            <span className="h-period-comparison">Compare: previous period</span>
          </div>
        </div>
        {period === 'Custom' && (
          <div className="h-custom-period">
            <label>
              From
              <input
                type="date"
                aria-label="Period start"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Through
              <input
                type="date"
                aria-label="Period end"
                value={dateAdd(to, -1)}
                onChange={(e) => setTo(dateAdd(e.target.value, 1))}
              />
            </label>
          </div>
        )}
        {!online && (
          <div className="h-info">
            Internet is unavailable. The local server can still operate while connected to this
            computer or LAN. Device-side disconnected writes and central sync are not implemented.
          </div>
        )}
        {error && (
          <div className="h-error" role="alert">
            {error}
            <button onClick={load}>Retry</button>
          </div>
        )}
        {page !== 'dashboard' && !selectedRoom && (
          <div className="h-page-title">
            <div>
              <h1>{titles[page]?.[0] || 'Overview'}</h1>
              <p>{titles[page]?.[1]}</p>
            </div>
            {['reservations', 'calendar', 'frontdesk'].includes(page) && canDesk(user) && (
              <Button variant="red" icon={Plus} onClick={() => createBooking()} disabled={busy}>
                New reservation
              </Button>
            )}
            {page === 'housekeeping' && canClean(user) && (
              <Button icon={Plus} onClick={() => setModal({ type: 'task' })}>
                New cleaning task
              </Button>
            )}
          </div>
        )}
        {page === 'dashboard' && (
          <Dashboard
            data={data}
            go={go}
            onBooking={createBooking}
            onReservation={showFolio}
            onDrill={(department) => setModal({ type: 'drill', department })}
          />
        )}{' '}
        {(page === 'reservations' || page === 'frontdesk') &&
          (canDesk(user) || user.role === 'finance') && (
            <ReservationList
              data={data}
              frontdesk={page === 'frontdesk'}
              onSelect={showFolio}
              onCreate={createBooking}
            />
          )}{' '}
        {page === 'calendar' && (
          <BookingCalendar
            data={data}
            onSelect={(r) =>
              canDesk(user) || user.role === 'finance'
                ? showFolio(r)
                : notice('Folio access is restricted to front office and finance.')
            }
            onCreate={createBooking}
            onRangeChange={setCalendarRange}
            onMove={(r, body) =>
              action(
                '/reservations/' + r.id,
                'PATCH',
                body,
                'Reservation moved. Inventory revalidated.',
              )
            }
          />
        )}{' '}
        {page === 'rooms' &&
          (selectedRoom ? (
            <RoomDetail
              room={selectedRoom}
              data={data}
              onBack={() => setRoom(null)}
              onBooking={createBooking}
              onFolio={showFolio}
              onMaintenance={(maintenance) =>
                action(
                  '/rooms/' + selectedRoom.id,
                  'PATCH',
                  { maintenance },
                  'Maintenance state updated.',
                )
              }
            />
          ) : (
            <RoomList
              data={data}
              onSelect={setRoom}
              onEditRate={(r) => setModal({ type: 'rate', record: r })}
            />
          ))}{' '}
        {page === 'housekeeping' && canClean(user) && (
          <Housekeeping
            data={data}
            onAction={(task, act) =>
              action(
                '/housekeeping/' + task.id,
                'PATCH',
                { action: act },
                act === 'inspect' ? 'Room inspected and released.' : 'Housekeeping task updated.',
              )
            }
            onCreate={() => setModal({ type: 'task' })}
          />
        )}{' '}
        {page === 'guests' && (canDesk(user) || user.role === 'finance') && (
          <Guests data={data} onSelect={(guest) => setModal({ type: 'guest', guest })} />
        )}{' '}
        {page === 'properties' && (
          <PropertyPortfolio
            data={data}
            onEdit={(r) => setModal({ type: 'property', record: r })}
            onProperty={(id) => {
              setProperty(id);
              go('rooms');
            }}
          />
        )}{' '}
        {page === 'finance' && canFinance(user) && <Finance data={data} onFolio={showFolio} />}{' '}
        {!navigation.some(([id]) => id === page) && (
          <Empty
            title="Find your way back"
            action={<Button onClick={() => go('dashboard')}>Open dashboard</Button>}
          />
        )}
      </main>
      <footer className="h-app-footer">
        <span>
          © {new Date().getFullYear()} BrainADZ Live <i>·</i> Hospitality OS
        </span>
        <span>
          <ShieldCheck size={11} /> Local hub · Fictional demonstration data
          <a href="/hr">
            People & HR <ArrowUpRight size={11} />
          </a>
        </span>
      </footer>
      {busy && <div className="h-progress-line" />}
      {['property', 'rate'].includes(modal?.type) && (
        <MasterForm
          kind={modal.type}
          record={modal.record}
          onClose={() => setModal(null)}
          onSave={(b) =>
            mutate(
              (modal.type === 'property' ? '/properties/' : '/room-types/') + modal.record.id,
              'PATCH',
              b,
              'Configuration updated.',
            )
          }
        />
      )}
      {modal?.type === 'booking' && (
        <BookingForm
          workspace={data}
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSave={(b) =>
            mutate('/reservations', 'POST', b, 'Reservation confirmed. A great stay awaits.')
          }
        />
      )}{' '}
      {modal?.type === 'folio' && (
        <FolioView
          reservation={modal.reservation}
          user={user}
          onClose={() => setModal(null)}
          onMutate={mutate}
          onMove={(r) => setModal({ type: 'move', reservation: r })}
        />
      )}{' '}
      {modal?.type === 'move' && (
        <MoveForm
          reservation={modal.reservation}
          rooms={data.rooms}
          onClose={() => setModal(null)}
          onSave={(b) =>
            mutate(
              '/reservations/' + modal.reservation.id,
              'PATCH',
              b,
              'Stay updated. Inventory revalidated.',
            )
          }
        />
      )}{' '}
      {modal?.type === 'guest' && (
        <Modal
          title={modal.guest.name}
          subtitle="Guest profile · Fictional demonstration data"
          onClose={() => setModal(null)}
        >
          <div className="h-guest-profile">
            <Avatar name={modal.guest.name} size="large" />
            <h3>{modal.guest.name}</h3>
            <p>{modal.guest.email}</p>
            <p>{modal.guest.phone}</p>
            <div className="h-info">{modal.guest.preferences || 'No preferences recorded.'}</div>
            <span className="h-eyebrow">STAYS IN THE LOADED REPORTING WINDOW</span>
            {data.reservations
              .filter((r) => r.guest_id === modal.guest.id)
              .slice(0, 8)
              .map((r) => (
                <button className="h-guest-stay" key={r.id} onClick={() => showFolio(r)}>
                  <div>
                    <b>
                      {r.property_name} · Room {r.room_number}
                    </b>
                    <small>
                      {dateFormat(r.arrival)} – {dateFormat(r.departure)}
                    </small>
                  </div>
                  <Status>{r.status}</Status>
                  <ArrowUpRight size={13} />
                </button>
              ))}
          </div>
        </Modal>
      )}{' '}
      {modal?.type === 'drill' && (
        <Modal
          title={
            modal.department === 'All'
              ? 'Operating revenue sources'
              : modal.department + ' revenue sources'
          }
          subtitle={`Latest matching records · ${data.metrics.entryCount} total period entries · Net of tax`}
          wide
          onClose={() => setModal(null)}
        >
          <Table
            headers={['Business date', 'Description', 'Department', 'Net revenue', 'Guest']}
            empty={
              !data.entries.filter(
                (e) => e.net && (modal.department === 'All' || e.department === modal.department),
              ).length
            }
          >
            {data.entries
              .filter(
                (e) => e.net && (modal.department === 'All' || e.department === modal.department),
              )
              .slice(0, 60)
              .map((e) => (
                <tr key={e.id}>
                  <td>{dateFormat(e.business_date)}</td>
                  <td>{e.description}</td>
                  <td>{e.department}</td>
                  <td>{money(e.net)}</td>
                  <td>
                    <button
                      className="h-text-button"
                      onClick={() => showFolio({ id: e.reservation_id })}
                    >
                      {e.guest_name}
                      <ArrowUpRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
          </Table>
          <div className="h-modal-bottom">
            <Button
              variant="secondary"
              onClick={() => {
                setModal(null);
                go('finance');
              }}
            >
              Open financial sources
            </Button>
          </div>
        </Modal>
      )}{' '}
      {modal?.type === 'task' && (
        <TaskForm
          data={data}
          onClose={() => setModal(null)}
          onSave={(b) => mutate('/housekeeping', 'POST', b, 'Cleaning task created.')}
        />
      )}{' '}
      {modal?.type === 'search' && (
        <Modal
          title="Find your next detail"
          subtitle="Search accessible guests, rooms and modules."
          onClose={() => {
            setModal(null);
            setSearch('');
          }}
        >
          <div className="h-search-dialog">
            <SearchField
              label="Search workspace"
              value={search}
              onChange={setSearch}
              placeholder="Try a guest, room or workspace…"
            />
            {visibleNav
              .filter(([, label]) => label.toLowerCase().includes(search.toLowerCase()))
              .map(([id, label, Icon]) => (
                <button
                  key={id}
                  onClick={() => {
                    setModal(null);
                    go(id);
                  }}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  <ArrowUpRight size={13} />
                </button>
              ))}
            {data.rooms
              .filter((r) =>
                (r.number + ' ' + r.type_name).toLowerCase().includes(search.toLowerCase()),
              )
              .slice(0, 4)
              .map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setModal(null);
                    go('rooms');
                    setRoom(r);
                  }}
                >
                  <BedDouble size={16} />
                  <span>
                    Room {r.number} · {r.property_name}
                  </span>
                  <ArrowUpRight size={13} />
                </button>
              ))}
          </div>
        </Modal>
      )}{' '}
      {modal?.type === 'notifications' && (
        <Modal
          title="Operations updates"
          subtitle="Pending arrivals and room tasks."
          onClose={() => setModal(null)}
        >
          <div className="h-notifications">
            {[
              [
                'frontdesk',
                CalendarDays,
                data.reservations.filter(
                  (r) => r.arrival === data.today && r.status === 'Confirmed',
                ).length + ' arrivals pending today',
              ],
              [
                'housekeeping',
                Sparkles,
                data.tasks.filter((t) => t.status === 'Awaiting inspection').length +
                  ' rooms awaiting inspection',
              ],
              [
                'rooms',
                BedDouble,
                data.rooms.filter((r) => r.maintenance !== 'Good').length + ' rooms out of order',
              ],
            ].map(([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => {
                  setModal(null);
                  go(id);
                }}
              >
                <Icon size={22} />
                <span>{label}</span>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </Modal>
      )}{' '}
      {modal?.type === 'account' && (
        <Modal
          title="Your hospitality workspace"
          subtitle="Access is enforced by your role and property scope."
          onClose={() => setModal(null)}
        >
          <div className="h-account">
            <Avatar name={user.name} size="large" />
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <span className="h-role-pill">{user.role}</span>
            <div className="h-info">
              You have access to {data.properties.length} properties. Demo accounts use shared
              credentials and fictional data.
            </div>
            <Button
              variant="secondary"
              icon={LogOut}
              onClick={async () => {
                try {
                  await request('/logout', 'POST', {});
                  setProperty('all');
                  setCalendarRange(null);
                  setError('');
                  setFrom(now.slice(0, 7) + '-01');
                  setTo(dateAdd(now, 1));
                  setPeriod('Month to date');
                  setModal(null);
                  setData(null);
                  setPage('dashboard');
                  location.hash = 'dashboard';
                } catch (e) {
                  notice(e.message, true);
                }
              }}
            >
              Sign out
            </Button>
          </div>
        </Modal>
      )}{' '}
      {modal?.type === 'roadmap' && (
        <Modal
          title="A foundation for what comes next"
          subtitle="Current release scope · Additional modules are not yet implemented."
          onClose={() => setModal(null)}
        >
          <div className="h-roadmap">
            <div className="h-info">
              Your operational foundation is live with demo data. The following work packages are
              planned; no external integrations are connected.
            </div>
            {[
              ['Restaurant POS & inventory', 'Orders, recipes, kitchen tickets and procurement.'],
              [
                'Enterprise accounting',
                'General ledger, OPEX/CAPEX, GOP, tax invoices and budgets.',
              ],
              [
                'Revenue & distribution',
                'Transparent pricing rules, channel simulation and approved OTA adapters.',
              ],
              ['Enterprise services', 'Banquets, spa, loyalty and corporate contracts.'],
              [
                'Central sync & hardening',
                'Disconnected-device queues, MFA, tenant isolation and certified integrations.',
              ],
            ].map(([title, text]) => (
              <div key={title}>
                <span className="h-roadmap-dot" />
                <section>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </section>
                <span>PLANNED</span>
              </div>
            ))}
            <a className="h-text-button" href="/hr">
              Open the existing People & HR portal
              <ArrowUpRight size={13} />
            </a>
          </div>
        </Modal>
      )}{' '}
      {toast && (
        <div className={'h-toast ' + (toast.error ? 'error' : '')} role="status">
          <span>{toast.error ? <X size={16} /> : <Check size={16} />}</span>
          {toast.text}
          <button aria-label="Dismiss message" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
function CancelReservation({ onCancel }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <Button
      variant="secondary"
      onClick={() => {
        if (confirm) onCancel();
        else setConfirm(true);
      }}
    >
      {confirm ? 'Confirm cancellation' : 'Cancel reservation'}
    </Button>
  );
}
function TaskForm({ data, onClose, onSave }) {
  const [room, setRoom] = useState(data.rooms[0]?.id || ''),
    [attendant, setAttendant] = useState('Anita Singh'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        room_id: room,
        attendant,
        title: 'Room clean & supervisor inspection',
        priority: 'Normal',
      });
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title="New cleaning task"
      subtitle="Create a cleaning and inspection task."
      onClose={onClose}
    >
      <form className="h-form" onSubmit={submit}>
        <div className="h-fields">
          <label className="full">
            Room
            <select aria-label="Task room" value={room} onChange={(e) => setRoom(e.target.value)}>
              {data.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.number} · {r.property_name}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Attendant
            <input
              required
              aria-label="Attendant"
              value={attendant}
              onChange={(e) => setAttendant(e.target.value)}
            />
          </label>
        </div>
        {error && <div className="h-error">{error}</div>}
        <footer>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={Check} type="submit" disabled={busy}>
            Create task
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
createRoot(document.getElementById('root')).render(<App />);
