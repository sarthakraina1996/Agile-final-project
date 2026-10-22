import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Award,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  Download,
  Ellipsis,
  FileCheck2,
  FileText,
  Flag,
  Globe2,
  GraduationCap,
  LayoutDashboard,
  Leaf,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Monitor,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import './styles.css';
const icons = {
  dashboard: LayoutDashboard,
  people: Users,
  attendance: Clock3,
  leave: CalendarDays,
  payroll: Wallet,
  recruitment: BriefcaseBusiness,
  performance: Target,
  expenses: CreditCard,
  journeys: UserPlus,
  assets: Monitor,
  documents: FileText,
  reports: TrendingUp,
  announcements: Bell,
  settings: Settings2,
  learning: GraduationCap,
  benefits: ShieldCheck,
  support: CircleHelp,
};
const labels = {
  dashboard: 'Overview',
  people: 'People directory',
  attendance: 'Attendance',
  leave: 'Leave management',
  payroll: 'Payroll',
  recruitment: 'Recruitment',
  performance: 'Performance',
  expenses: 'Expenses',
  journeys: 'Employee journeys',
  assets: 'Assets',
  documents: 'Documents',
  reports: 'Reports & insights',
  announcements: 'Announcements',
  settings: 'Settings',
  learning: 'Learning & growth',
  benefits: 'Benefits',
  support: 'HR helpdesk',
};
const subtitles = {
  people: 'The people behind every possibility.',
  attendance: 'A little structure for a productive day.',
  leave: 'Time to recharge. Space to do your best.',
  payroll: 'Clarity and confidence, every pay cycle.',
  recruitment: 'Find the next brilliant mind for your team.',
  performance: 'Big ambitions. Meaningful progress.',
  expenses: 'Business expenses, without the busywork.',
  journeys: 'Make every beginning—and goodbye—matter.',
  assets: 'The right tools in the right hands.',
  documents: 'Everything your people need, in one place.',
  reports: 'Turn your people data into perspective.',
  announcements: 'Keep everyone in the loop.',
  settings: 'Make this workspace work for you.',
  learning: 'Curiosity is where great things begin.',
  benefits: 'A little care for every chapter of life.',
  support: 'Your People team, a little closer.',
};
const divisionColors = { Marketing: 'orange', Exhibits: 'green', Live: 'blue' };
const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);
const fmt = (d, opts = { day: 'numeric', month: 'short' }) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('en-IN', opts) : '—';
const initials = (n) =>
  (n || '')
    .split(' ')
    .map((x) => x[0])
    .slice(0, 2)
    .join('');
const daysBetween = (s, e) => Math.round((new Date(e) - new Date(s)) / 86400000) + 1;
const prettyRole = (r) =>
  r === 'admin' ? 'Administrator' : r === 'hr' ? 'HR manager' : 'Employee';
async function api(url, method = 'GET', body) {
  const r = await fetch('/api' + url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}
function Avatar({ name, size = 'normal', color }) {
  const colors = ['peach', 'lavender', 'mint', 'sky', 'sand'];
  return (
    <span className={'avatar ' + size + ' ' + (color || colors[(name || '').charCodeAt(0) % 5])}>
      {initials(name)}
    </span>
  );
}
function Brand({ light = false }) {
  return (
    <div className={'brand ' + (light ? 'light' : '')}>
      <span className="brand-icon">
        B<span>•</span>
      </span>
      <div>
        <strong>
          BrainADZ<span className="brand-dot">®</span>
        </strong>
        <span className="brand-people">People</span>
      </div>
    </div>
  );
}
function Badge({ children, tone }) {
  const t =
    tone ||
    {
      Approved: 'green',
      Present: 'green',
      Active: 'green',
      Open: 'green',
      Completed: 'green',
      Hired: 'green',
      'On track': 'green',
      Pending: 'orange',
      Interview: 'orange',
      Screening: 'blue',
      Remote: 'blue',
      Generated: 'blue',
      Offer: 'purple',
      Rejected: 'red',
      Closed: 'gray',
      Inactive: 'gray',
      Returned: 'gray',
      'On leave': 'purple',
    }[children] ||
    'gray';
  return (
    <span className={'badge ' + t}>
      <i />
      {children}
    </span>
  );
}
function Empty({
  title = 'Nothing here just yet',
  text = 'New records will appear here.',
  action,
}) {
  return (
    <div className="empty">
      <span>
        <FileCheck2 size={27} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Button({ children, icon: Icon = Plus, secondary = false, ...props }) {
  return (
    <button className={secondary ? 'button secondary' : 'button'} {...props}>
      {Icon && <Icon size={16} />} {children}
    </button>
  );
}
function Modal({ title, description, onClose, children, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current;
    el?.querySelector('input,select,textarea,button')?.focus();
    const key = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const focus = [...el.querySelectorAll('button,input,select,textarea,a[href]')].filter(
          (x) => !x.disabled,
        );
        const first = focus[0],
          last = focus.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      prev?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={'modal ' + (wide ? 'wide' : '')}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function Login({ onLogin }) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [demo, setDemo] = useState(false);
  useEffect(() => {
    api('/auth/config').then((d) => setDemo(d.demo));
  }, []);
  async function login(e, role) {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/login', 'POST', {
        email: role ? `${role}@brainadz.com` : email,
        password: role ? 'Brainadz@123' : password,
      });
      await onLogin();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-story">
        <Brand />
        <div className="login-copy">
          <span className="eyebrow">
            <span /> ONE TEAM. ENDLESS POSSIBILITIES.
          </span>
          <h1>
            Great work starts
            <br />
            with <em>great people.</em>
          </h1>
          <p>
            Three bold verticals. One connected workplace.
            <br />
            Welcome to your space to grow, create, and belong.
          </p>
          <div className="login-art">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-center">
              B<span>✦</span>
            </div>
            <div className="floating-card fc-one">
              <span className="mini-symbol orange">
                <Zap size={20} />
              </span>
              <div>
                <b>Marketing</b>
                <small>Ideas that move brands.</small>
              </div>
            </div>
            <div className="floating-card fc-two">
              <span className="mini-symbol green">
                <Leaf size={20} />
              </span>
              <div>
                <b>Exhibits</b>
                <small>Experiences that connect.</small>
              </div>
            </div>
            <div className="floating-card fc-three">
              <span className="mini-symbol blue">
                <Monitor size={20} />
              </span>
              <div>
                <b>Live</b>
                <small>Technology that inspires.</small>
              </div>
            </div>
          </div>
        </div>
        <footer>
          © {new Date().getFullYear()} BrainADZ. Made for our people.
          <span>Smart thinking. Human connections.</span>
        </footer>
      </div>
      <div className="login-form-side">
        <div className="login-mobile-brand">
          <Brand />
        </div>
        <div className="login-form">
          <span className="login-wave">✦</span>
          <h2>
            Your people.
            <br />
            Your possibilities.
          </h2>
          <p>Sign in to your BrainADZ workspace.</p>
          <form onSubmit={login}>
            <label>
              Work email
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@brainadz.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </label>
            <div className="login-note">
              <ShieldCheck size={14} /> Secure access to your workplace
            </div>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <Button type="submit" disabled={busy} icon={ArrowRight}>
              {busy ? 'Signing you in…' : 'Sign in to workspace'}
            </Button>
          </form>
          {demo && (
            <div className="demo-box">
              <span>TAKE A LOOK AROUND</span>
              <p>Explore with sample data. Choose your view.</p>
              <div>
                {[
                  ['admin', 'Admin'],
                  ['hr', 'HR manager'],
                  ['employee', 'Employee'],
                ].map(([r, t]) => (
                  <button key={r} disabled={busy} onClick={(e) => login(e, r)}>
                    {t}
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
              <small>Demo password: Brainadz@123</small>
            </div>
          )}
          <p className="login-help">Need access? Contact your People & Culture team.</p>
        </div>
        <span className="login-bottom">
          <Globe2 size={14} /> One workplace. Wherever you work.
        </span>
      </div>
    </div>
  );
}
function FormModal({ type, onClose, onSave, employees, defaultEmployee, today, initialValues }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const empField = ['employeeId', 'Employee', 'select', employees.map((e) => [e.id, e.name])];
  const division = ['division', 'Division', 'select', ['Marketing', 'Exhibits', 'Live']];
  const definitions = {
    account: {
      title: 'Give your people access',
      desc: 'Create a login and share the password through a secure company channel.',
      fields: [
        ['employeeId', 'Employee', 'select', employees.map((e) => [e.id, e.name])],
        ['email', 'Login email', 'email'],
        [
          'role',
          'Access role',
          'select',
          [
            ['employee', 'Employee'],
            ['hr', 'HR manager'],
            ['admin', 'Administrator'],
          ],
        ],
        ['password', 'Initial password (12+ characters)', 'password'],
      ],
    },
    ticket: {
      title: 'Let’s work through it together',
      desc: 'Share your request with the People team.',
      fields: [
        ['title', 'Subject'],
        [
          'category',
          'Category',
          'select',
          [
            'Employee records',
            'Payroll',
            'Benefits',
            'Leave & attendance',
            'Workplace concern',
            'Other',
          ],
        ],
        ['priority', 'Priority', 'select', ['Normal', 'Urgent']],
        ['description', 'How can we help?', 'textarea'],
      ],
    },
    course: {
      title: 'Make room for learning',
      fields: [
        ['title', 'Course title'],
        ['description', 'Course summary'],
        ['division', 'For', 'select', ['All divisions', 'Marketing', 'Exhibits', 'Live']],
        ['duration', 'Estimated duration'],
        ['content', 'Learning material', 'textarea'],
      ],
    },
    benefit: {
      title: 'Add a little more support',
      fields: [
        ['title', 'Benefit name'],
        ['subtitle', 'Short description'],
        ['category', 'Category'],
        ['description', 'Details and eligibility', 'textarea'],
      ],
    },
    employee: {
      title: 'Welcome a new person',
      desc: 'The next great chapter starts here.',
      fields: [
        ['name', 'Full name'],
        ['email', 'Work email', 'email'],
        ['title', 'Job title'],
        division,
        ['department', 'Department'],
        ['location', 'Office', 'select', ['Mumbai', 'Delhi', 'Dubai']],
        ['joined', 'Joining date', 'date'],
        ['salary', 'Monthly gross salary (INR)', 'number'],
        ['manager', 'Reporting manager'],
      ],
    },
    leave: {
      title: 'A little time for you',
      desc: 'Your request will be sent to the People team.',
      fields: [
        empField,
        [
          'type',
          'Leave type',
          'select',
          ['Annual leave', 'Sick leave', 'Personal leave', 'Parental leave', 'Unpaid leave'],
        ],
        ['start', 'Start date', 'date'],
        ['end', 'End date', 'date'],
        ['reason', 'Reason', 'textarea'],
      ],
    },
    expense: {
      title: 'Submit an expense',
      desc: 'Keep your receipt for Finance verification.',
      fields: [
        empField,
        ['title', 'What was this for?'],
        ['category', 'Category', 'select', ['Travel', 'Meals', 'Software', 'Office', 'Other']],
        ['amount', 'Amount (INR)', 'number'],
      ],
    },
    job: {
      title: 'Find your next great teammate',
      fields: [
        ['title', 'Position title'],
        division,
        ['department', 'Department'],
        ['location', 'Office', 'select', ['Mumbai', 'Delhi', 'Dubai']],
      ],
    },
    candidate: {
      title: 'Add a candidate',
      fields: [
        ['name', 'Full name'],
        ['email', 'Email', 'email'],
        ['position', 'Position applied for'],
        division,
      ],
    },
    goal: {
      title: 'Set something in motion',
      fields: [empField, ['title', 'What would you like to achieve?'], ['cycle', 'Review cycle']],
    },
    event: {
      title: 'Bring your people together',
      fields: [
        ['title', 'Event name'],
        ['date', 'Date', 'date'],
        ['time', 'Time (IST)', 'time'],
        ['division', 'For', 'select', ['All divisions', 'Marketing', 'Exhibits', 'Live']],
        ['type', 'Event type', 'select', ['Team event', 'Town hall', 'Learning', 'Onboarding']],
      ],
    },
    asset: {
      title: 'Assign an asset',
      fields: [
        empField,
        ['name', 'Asset name'],
        ['category', 'Category', 'select', ['Laptop', 'Monitor', 'Tablet', 'Phone', 'Other']],
        ['serial', 'Serial / asset number'],
      ],
    },
    journey: {
      title: 'A thoughtful employee journey',
      fields: [
        empField,
        ['title', 'Journey name'],
        ['type', 'Journey type', 'select', ['Onboarding', 'Offboarding']],
      ],
    },
    document: {
      title: 'Create a workspace document',
      desc: 'Write a policy or guide your team can read and download.',
      fields: [
        ['title', 'Document title'],
        ['category', 'Category', 'select', ['Policy', 'Finance', 'General', 'IT']],
        ['content', 'Content', 'textarea'],
      ],
    },
    announcement: {
      title: 'Share something with your people',
      fields: [
        ['title', 'Headline'],
        [
          'tag',
          'Category',
          'select',
          ['Company update', 'Celebrating our people', 'Wellbeing', 'Learning'],
        ],
        ['body', 'Your message', 'textarea'],
      ],
    },
  };
  const def =
    type === 'editEmployee'
      ? {
          ...definitions.employee,
          title: 'Update employee details',
          desc: 'Keep your people’s records up to date.',
        }
      : definitions[type];
  const [values, setValues] = useState({
    employeeId: defaultEmployee,
    division: 'Marketing',
    location: 'Mumbai',
    joined: today,
    start: today,
    end: today,
    date: today,
    time: '10:00',
    type: type === 'leave' ? 'Annual leave' : type === 'journey' ? 'Onboarding' : 'Team event',
    category:
      type === 'expense'
        ? 'Travel'
        : type === 'asset'
          ? 'Laptop'
          : type === 'ticket'
            ? 'Employee records'
            : type === 'benefit'
              ? 'Wellbeing'
              : 'Policy',
    cycle: 'Q4 2026',
    tag: 'Company update',
    priority: 'Normal',
    role: 'employee',
    ...initialValues,
  });
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(type, values);
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <Modal title={def.title} description={def.desc} onClose={onClose}>
      <form onSubmit={submit} className="record-form">
        <div className="form-fields">
          {def.fields.map(([key, label, field = 'text', options]) => (
            <label key={key} className={field === 'textarea' ? 'span-two' : ''}>
              {label}
              {field === 'select' ? (
                <select
                  aria-label={label}
                  value={values[key] || ''}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                  required
                >
                  {(options || []).map((o) => (
                    <option key={Array.isArray(o) ? o[0] : o} value={Array.isArray(o) ? o[0] : o}>
                      {Array.isArray(o) ? o[1] : o}
                    </option>
                  ))}
                </select>
              ) : field === 'textarea' ? (
                <textarea
                  aria-label={label}
                  required
                  rows={4}
                  value={values[key] || ''}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                />
              ) : (
                <input
                  aria-label={label}
                  minLength={field === 'password' ? 12 : undefined}
                  autoComplete={field === 'password' ? 'new-password' : undefined}
                  type={field}
                  step={field === 'number' ? '0.01' : undefined}
                  min={field === 'number' ? 0 : undefined}
                  maxLength={200}
                  required={!['salary', 'manager'].includes(key)}
                  value={values[key] || ''}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                />
              )}
            </label>
          ))}
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <footer>
          <Button type="button" secondary icon={null} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} icon={Check} type="submit">
            {busy ? 'Saving…' : type === 'leave' ? 'Send request' : 'Save changes'}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
function App() {
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(location.hash.slice(1) || 'dashboard'),
    [division, setDivision] = useState('All divisions'),
    [menu, setMenu] = useState(false),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(null),
    [search, setSearch] = useState(''),
    [searchOpen, setSearchOpen] = useState(false),
    [notify, setNotify] = useState(false),
    [help, setHelp] = useState(false);
  const timer = useRef();
  async function load() {
    try {
      const d = await api('/bootstrap');
      setData(d);
    } catch (e) {
      setData(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const hash = () => setPage(location.hash.slice(1) || 'dashboard');
    window.addEventListener('hashchange', hash);
    return () => window.removeEventListener('hashchange', hash);
  }, []);
  function go(p) {
    setPage(p);
    location.hash = p;
    setMenu(false);
    setSearchOpen(false);
    setSearch('');
    window.scrollTo(0, 0);
  }
  function message(text, error = false) {
    setToast({ text, error });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4500);
  }
  async function mutate(url, method, body, success) {
    try {
      const result = await api(url, method, body);
      await load();
      message(success || result.message || 'Changes saved.');
      return result;
    } catch (e) {
      message(e.message, true);
      throw e;
    }
  }
  const act = (url, method, body, success) => mutate(url, method, body, success).catch(() => {});
  if (loading)
    return (
      <div className="loading-screen">
        <Brand />
        <span className="loader" />
        <p>Connecting your workplace…</p>
      </div>
    );
  if (!data) return <Login onLogin={load} />;
  const { user, employees, records, today, settings } = data;
  const isManager = user.role !== 'employee';
  const me = employees.find((e) => e.id === user.employeeId) || employees[0];
  const employee = (id) =>
    employees.find((e) => e.id === id) || { name: 'Former employee', division: 'Marketing' };
  const visiblePeople = employees.filter(
    (e) => division === 'All divisions' || e.division === division,
  );
  const all = (kind) => records.filter((r) => r.kind === kind);
  const list = (kind) =>
    all(kind).filter(
      (r) =>
        division === 'All divisions' ||
        r.division === division ||
        r.division === 'All divisions' ||
        (r.employeeId && employee(r.employeeId).division === division) ||
        ['document', 'announcement', 'course', 'benefit'].includes(kind),
    );
  const pending = [...list('leave'), ...list('expense')].filter((r) => r.status === 'Pending');
  const attendance = list('attendance').filter((r) => r.date === today),
    currentAttendance = all('attendance').find(
      (r) => r.date === today && r.employeeId === user.employeeId,
    );
  const modalForm = (t) => setModal({ type: t });
  const navGroups = [
    { label: 'WORKSPACE', pages: ['dashboard', 'people', 'attendance', 'leave'] },
    {
      label: 'PEOPLE OPERATIONS',
      pages: [
        'payroll',
        ...(isManager ? ['recruitment'] : []),
        'performance',
        'expenses',
        'journeys',
        'assets',
        'learning',
        'benefits',
      ],
    },
    {
      label: 'ORGANIZATION',
      pages: ['documents', ...(isManager ? ['reports'] : []), 'announcements', 'support'],
    },
  ];
  const profile = (e) => setModal({ type: 'profile', employee: e });
  const month = new Date(today + 'T12:00:00').toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
  function personCell(id) {
    const e = employee(id);
    return (
      <button className="person-cell" onClick={() => profile(e)}>
        <Avatar name={e.name} />
        <span>
          <b>{e.name}</b>
          <small>{e.title}</small>
        </span>
      </button>
    );
  }
  function divisionBadge(d) {
    return (
      <span className={'division-badge ' + divisionColors[d]}>
        <span />
        {d}
      </span>
    );
  }
  function exportCsv(name, rows) {
    if (!rows.length) {
      message('No records to export yet.');
      return;
    }
    const keys = Object.keys(rows[0]);
    const escape = (v) =>
      '"' +
      String(v ?? '')
        .replace(/^[=+@\-]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const csv = [
      keys.map(escape).join(','),
      ...rows.map((r) => keys.map((k) => escape(r[k])).join(',')),
    ].join('\r\n');
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = name + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('Your export is ready.');
  }
  const stat = (label, value, Icon, foot, tone = 'orange') => (
    <article className="stat-card">
      <div className="stat-head">
        <span>{label}</span>
        <span className={'stat-icon ' + tone}>
          <Icon size={18} />
        </span>
      </div>
      <strong>{value}</strong>
      <div className="stat-foot">{foot}</div>
    </article>
  );
  const table = (headers, rows, emptyText) => (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
      {!rows.length && <Empty text={emptyText || 'No records match this view.'} />}
    </div>
  );
  function approvalRow(r) {
    const e = employee(r.employeeId);
    return (
      <div className="approval-row" key={r.id}>
        <Avatar name={e.name} />
        <div>
          <b>{e.name}</b>
          <small>{r.kind === 'leave' ? r.type : r.title}</small>
          <span>
            {r.kind === 'leave'
              ? `${fmt(r.start)} – ${fmt(r.end)} · ${daysBetween(r.start, r.end)} day${daysBetween(r.start, r.end) > 1 ? 's' : ''}`
              : money(r.amount)}
          </span>
        </div>
        {isManager ? (
          <div className="approval-actions">
            <button
              title="Reject request"
              aria-label={'Reject ' + e.name + ' request'}
              onClick={() =>
                act('/records/' + r.id, 'PATCH', { status: 'Rejected' }, 'Request rejected.')
              }
            >
              <X size={15} />
            </button>
            <button
              className="approve"
              title="Approve request"
              aria-label={'Approve ' + e.name + ' request'}
              onClick={() =>
                act('/records/' + r.id, 'PATCH', { status: 'Approved' }, 'Request approved.')
              }
            >
              <Check size={16} />
            </button>
          </div>
        ) : (
          <Badge>{r.status}</Badge>
        )}
      </div>
    );
  }
  const workforce = (
    <div className="workforce-chart">
      <div className="chart-y">
        <span>12</span>
        <span>9</span>
        <span>6</span>
        <span>3</span>
        <span>0</span>
      </div>
      <div className="chart-plot">
        <div className="chart-grid">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        {['Marketing', 'Exhibits', 'Live']
          .filter((d) => division === 'All divisions' || d === division)
          .map((d) => {
            const count = visiblePeople.filter((e) => e.division === d).length;
            return (
              <div className="bar-column" key={d}>
                <div className="bar-value">{count}</div>
                <div
                  className={'chart-bar ' + divisionColors[d]}
                  style={{ height: Math.max(8, (count / 12) * 160) }}
                />
                <span>{d}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
  function Dashboard() {
    const leaveToday = list('leave').filter(
      (r) => r.status === 'Approved' && r.start <= today && r.end >= today,
    ).length;
    return (
      <>
        <div className="greeting">
          <div>
            <div className="eyebrow muted">YOUR WORKPLACE, AT A GLANCE</div>
            <h1>
              Good{' '}
              {Number(
                new Intl.DateTimeFormat('en-GB', {
                  timeZone: 'Asia/Kolkata',
                  hour: '2-digit',
                  hourCycle: 'h23',
                }).format(new Date()),
              ) < 12
                ? 'morning'
                : 'afternoon'}
              , {me.name.split(' ')[0]} <Sun size={29} className="sun" />
            </h1>
            <p>Here’s what’s happening with your people today.</p>
          </div>
          <span className="date-chip">
            <CalendarDays size={15} />
            {fmt(today, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="hero-grid">
          <section className="hero-banner">
            <div className="hero-copy">
              <span>
                <span className="tiny-star">✦</span> MANY TALENTS. ONE TEAM.
              </span>
              <h2>
                Great people.
                <br />
                Extraordinary possibilities.
              </h2>
              <p>A connected home for the minds that make BrainADZ.</p>
              <button onClick={() => go('people')}>
                Meet your people <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="hero-circle hc1" />
              <div className="hero-circle hc2" />
              <div className="hero-circle hc3" />
              <span className="hero-spark">✦</span>
              <div className="hero-stem" />
            </div>
            <div className="vertical-tags">
              <span>
                <i className="dot orange" />
                MARKETING
              </span>
              <span>
                <i className="dot green" />
                EXHIBITS
              </span>
              <span>
                <i className="dot blue" />
                LIVE
              </span>
            </div>
          </section>
          <section className="workday">
            <div>
              <span className="eyebrow">MAKE TODAY COUNT</span>
              <span className="live-pill">
                <i />{' '}
                {currentAttendance?.checkOut
                  ? 'DAY COMPLETE'
                  : currentAttendance
                    ? 'CHECKED IN'
                    : 'YOUR WORKDAY'}
              </span>
            </div>
            <Clock3 size={30} strokeWidth={1.5} />
            <h3>
              {currentAttendance?.checkOut
                ? 'A good day, well done.'
                : currentAttendance
                  ? 'You’re right on time.'
                  : 'A fresh start awaits.'}
            </h3>
            <p>
              {currentAttendance
                ? `Checked in at ${currentAttendance.checkIn} IST`
                : 'Check in and get your day going.'}
            </p>
            <button
              disabled={!!currentAttendance?.checkOut}
              onClick={() => act('/attendance', 'POST', {}, '')}
            >
              {currentAttendance?.checkOut
                ? 'See you tomorrow'
                : currentAttendance
                  ? 'Check out'
                  : 'Check in'}
              <ArrowRight size={16} />
            </button>
          </section>
        </div>
        <div className="stats-grid">
          {stat(
            'Total employees',
            visiblePeople.length,
            Users,
            <>
              <span className="trend">
                <ArrowUpRight size={12} />
                {visiblePeople.filter((e) => e.joined >= today.slice(0, 7) + '-01').length} new
              </span>
              <span>this month</span>
            </>,
          )}
          {stat(
            'Present today',
            attendance.length,
            UserPlus,
            <>
              <span className="green-text">
                {Math.round((attendance.length / (visiblePeople.length || 1)) * 100)}%
              </span>
              <span>of your workforce</span>
            </>,
            'green',
          )}
          {stat(
            'On leave today',
            leaveToday,
            CalendarDays,
            <>
              <span className="stacked-dots">
                <i />
                <i />
                <i />
              </span>
              <span>Well-deserved time off</span>
            </>,
            'purple',
          )}
          {stat(
            'Open positions',
            isManager ? list('job').filter((r) => r.status === 'Open').length : '—',
            BriefcaseBusiness,
            <button className="text-link" onClick={() => go(isManager ? 'recruitment' : 'people')}>
              {isManager ? 'Let’s grow the team' : 'Meet your teammates'}
              <ArrowUpRight size={12} />
            </button>,
            'blue',
          )}
        </div>
        <div className="dashboard-middle">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>
                  Your people, connected <span className="small-count">{visiblePeople.length}</span>
                </h2>
                <p>A little perspective across our verticals.</p>
              </div>
              <span className="subtle-label">By division</span>
            </div>
            {workforce}
            <div className="chart-legend">
              {['Marketing', 'Exhibits', 'Live'].map((d) => (
                <span key={d}>
                  <i className={'dot ' + divisionColors[d]} />
                  {d}
                </span>
              ))}
            </div>
          </section>
          <section className="panel approvals-panel">
            <div className="panel-header">
              <div>
                <h2>
                  {isManager ? 'Needs your attention' : 'Your requests'}
                  <span className="small-count orange-count">{pending.length}</span>
                </h2>
                <p>
                  {isManager
                    ? 'A few quick decisions make a big difference.'
                    : 'We’ll keep you posted on your requests.'}
                </p>
              </div>
              <span className="pulse-dot" />
            </div>
            <div className="approval-list">
              {pending.length ? (
                pending.slice(0, 3).map(approvalRow)
              ) : (
                <Empty title="All caught up" text="No pending requests. A little breathing room." />
              )}
            </div>
            <button className="panel-bottom-link" onClick={() => go('leave')}>
              View all requests <ArrowRight size={14} />
            </button>
          </section>
        </div>
        <div className="dashboard-bottom">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>
                  The BrainADZ buzz <span className="buzz-icon">✧</span>
                </h2>
                <p>Good things worth sharing.</p>
              </div>
              <button className="text-link" onClick={() => go('announcements')}>
                View all <ArrowUpRight size={14} />
              </button>
            </div>
            {list('announcement')
              .slice(0, 1)
              .map((a) => (
                <div className="announcement-feature" key={a.id}>
                  <div className="celebration-art" aria-hidden="true">
                    <span>✦</span>
                    <i />
                    <b>
                      BRILLIANT
                      <br />
                      TOGETHER.
                    </b>
                    <em>✦</em>
                  </div>
                  <div>
                    <span className="eyebrow orange-text">{a.tag}</span>
                    <h3>{a.title}</h3>
                    <p>{a.body}</p>
                    <div className="post-author">
                      <Avatar name="People Culture" size="small" />
                      <span>
                        {a.author} <small>· {fmt(a.date)}</small>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </section>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>On the horizon</h2>
                <p>A few dates for your diary.</p>
              </div>
              <button
                className="icon-button"
                aria-label="Add an event"
                onClick={() => (isManager ? modalForm('event') : go('announcements'))}
              >
                <Plus size={18} />
              </button>
            </div>
            <div className="event-list">
              {list('event')
                .filter((e) => e.date >= today)
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 3)
                .map((e) => (
                  <div className="event-row" key={e.id}>
                    <div className="event-date">
                      <b>{fmt(e.date, { day: '2-digit' })}</b>
                      <span>{fmt(e.date, { month: 'short' })}</span>
                    </div>
                    <div>
                      <h4>{e.title}</h4>
                      <p>
                        <Clock3 size={11} />
                        {e.time} IST <i /> {e.division}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
            <button className="panel-bottom-link" onClick={() => go('announcements')}>
              Explore company events
              <ArrowRight size={14} />
            </button>
          </section>
        </div>
        <div className="dashboard-footer">
          <span>
            <span className="tiny-star">✦</span> Different strengths. Shared possibilities.
          </span>
          <span>Made for the people of BrainADZ.</span>
        </div>
      </>
    );
  }
  function People() {
    const [q, setQ] = useState(''),
      [status, setStatus] = useState('All statuses');
    const people = visiblePeople.filter(
      (e) =>
        (e.name + ' ' + e.title + ' ' + e.department).toLowerCase().includes(q.toLowerCase()) &&
        (status === 'All statuses' || e.status === status),
    );
    return (
      <>
        <div className="stats-grid compact">
          {stat('Our people', visiblePeople.length, Users, 'Across three connected verticals')}
          {stat(
            'Marketing',
            visiblePeople.filter((e) => e.division === 'Marketing').length,
            Zap,
            'Ideas that move brands',
          )}
          {stat(
            'Exhibits',
            visiblePeople.filter((e) => e.division === 'Exhibits').length,
            Leaf,
            'Experiences that connect',
            'green',
          )}
          {stat(
            'Live',
            visiblePeople.filter((e) => e.division === 'Live').length,
            Monitor,
            'Technology that inspires',
            'blue',
          )}
        </div>
        <section className="panel">
          <div className="table-toolbar">
            <div className="tabs">
              <button className="active">
                All people <span>{people.length}</span>
              </button>
            </div>
            <div className="table-tools">
              <div className="inline-search">
                <Search size={15} />
                <input
                  aria-label="Search employees"
                  placeholder="Search your people…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <select
                aria-label="Employee status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {['All statuses', 'Active', 'On leave', 'Inactive'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          {table(
            ['Employee', 'Division', 'Department', 'Location', 'Status', ''],
            people.map((e) => (
              <tr key={e.id}>
                <td>{personCell(e.id)}</td>
                <td>{divisionBadge(e.division)}</td>
                <td>{e.department}</td>
                <td>
                  <span className="with-icon">
                    <MapPin size={13} />
                    {e.location}
                  </span>
                </td>
                <td>
                  <Badge>{e.status}</Badge>
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={'View ' + e.name}
                    onClick={() => profile(e)}
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </td>
              </tr>
            )),
          )}
          <div className="table-footer">
            <span>Showing {people.length} people</span>
            <button
              className="text-link"
              onClick={() =>
                exportCsv(
                  'BrainADZ-people',
                  people.map(({ id, name, title, division, department, location, status }) => ({
                    id,
                    name,
                    title,
                    division,
                    department,
                    location,
                    status,
                  })),
                )
              }
            >
              <Download size={14} /> Export directory
            </button>
          </div>
        </section>
      </>
    );
  }
  function Attendance() {
    return (
      <>
        <div className="stats-grid compact">
          {stat(
            'Checked in today',
            attendance.length,
            CheckCheck,
            'Working together, wherever we are',
            'green',
          )}
          {stat(
            'In the office',
            attendance.filter((a) => a.status === 'Present').length,
            BriefcaseBusiness,
            'Present and connected',
          )}
          {stat(
            'Working remotely',
            attendance.filter((a) => a.status === 'Remote').length,
            Monitor,
            'Great work knows no boundaries',
            'blue',
          )}
          {stat(
            'Your check-in',
            currentAttendance?.checkIn || 'Not yet',
            Clock3,
            currentAttendance?.checkOut
              ? 'Checked out at ' + currentAttendance.checkOut
              : 'Times shown in IST',
            'purple',
          )}
        </div>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Today’s attendance</h2>
              <p>
                {fmt(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} ·
                India Standard Time
              </p>
            </div>
            <Button
              icon={Clock3}
              disabled={!!currentAttendance?.checkOut}
              onClick={() => act('/attendance', 'POST', {}, '')}
            >
              {currentAttendance?.checkOut
                ? 'Day complete'
                : currentAttendance
                  ? 'Check out'
                  : 'Check in'}
            </Button>
          </div>
          {table(
            ['Employee', 'Division', 'Date', 'Check-in', 'Check-out', 'Status'],
            attendance.map((r) => (
              <tr key={r.id}>
                <td>{personCell(r.employeeId)}</td>
                <td>{divisionBadge(employee(r.employeeId).division)}</td>
                <td>{fmt(r.date)}</td>
                <td>{r.checkIn} IST</td>
                <td>{r.checkOut ? `${r.checkOut} IST` : '—'}</td>
                <td>
                  <Badge>{r.status}</Badge>
                </td>
              </tr>
            )),
          )}
        </section>
      </>
    );
  }
  function Leave() {
    const [tab, setTab] = useState('All requests');
    const leaves = list('leave').filter((r) => tab === 'All requests' || r.status === tab);
    const ownLeave = all('leave')
      .filter(
        (l) =>
          l.employeeId === user.employeeId &&
          l.status === 'Approved' &&
          l.start.slice(0, 4) === today.slice(0, 4) &&
          l.type === 'Annual leave',
      )
      .reduce((s, r) => s + daysBetween(r.start, r.end), 0);
    return (
      <>
        <div className="leave-banner">
          <span className="leave-sun">☀</span>
          <div>
            <span className="eyebrow">REST IS PRODUCTIVE, TOO.</span>
            <h2>A little time away. A fresh perspective.</h2>
            <p>
              You have <b>{Math.max(0, settings.leaveDays - ownLeave)} days</b> of your annual leave
              allowance remaining.
            </p>
            <small>Sample allowance; calendar days shown. Confirm local policy with HR.</small>
          </div>
          <Button secondary onClick={() => modalForm('leave')}>
            Request leave
          </Button>
        </div>
        <section className="panel">
          <div className="table-toolbar">
            <div className="tabs">
              {['All requests', 'Pending', 'Approved', 'Rejected'].map((t) => (
                <button className={tab === t ? 'active' : ''} key={t} onClick={() => setTab(t)}>
                  {t}
                  {t === 'Pending' && (
                    <span>{list('leave').filter((r) => r.status === 'Pending').length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          {table(
            [
              'Employee',
              'Leave type',
              'Dates',
              'Duration',
              'Status',
              isManager ? 'Actions' : 'Reason',
            ],
            leaves.map((r) => (
              <tr key={r.id}>
                <td>{personCell(r.employeeId)}</td>
                <td>
                  {r.type}
                  <small className="cell-note">{r.reason}</small>
                </td>
                <td>
                  {fmt(r.start)} – {fmt(r.end)}
                </td>
                <td>{daysBetween(r.start, r.end)} day(s)</td>
                <td>
                  <Badge>{r.status}</Badge>
                </td>
                <td>
                  {isManager && r.status === 'Pending' ? (
                    <div className="row-actions">
                      <button
                        onClick={() =>
                          act(
                            '/records/' + r.id,
                            'PATCH',
                            { status: 'Approved' },
                            'Leave approved.',
                          )
                        }
                        className="approve-text"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        aria-label="Reject leave"
                        onClick={() =>
                          act(
                            '/records/' + r.id,
                            'PATCH',
                            { status: 'Rejected' },
                            'Leave rejected.',
                          )
                        }
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : r.reviewedBy ? (
                    <small>Reviewed</small>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            )),
          )}
        </section>
      </>
    );
  }
  function Payroll() {
    const [monthFilter, setMonthFilter] = useState(today.slice(0, 7)),
      [running, setRunning] = useState(false);
    const pays = list('payroll').filter((r) => r.month === monthFilter);
    async function generate() {
      setRunning(true);
      await act(
        '/payroll',
        'POST',
        { month: monthFilter },
        'Illustrative payslips generated. No bank payments were sent.',
      );
      setRunning(false);
    }
    return (
      <>
        <div className="info-banner">
          <ShieldCheck size={20} />
          <div>
            <b>Payroll records, clearly labelled.</b>
            <p>
              This workspace uses illustrative 12% deductions. Statutory calculations, tax filings
              and bank transfers need a payroll integration.
            </p>
          </div>
        </div>
        <div className="stats-grid three">
          {stat(
            'Gross payroll',
            money(pays.reduce((s, r) => s + r.gross, 0)),
            Wallet,
            'For the selected period',
          )}
          {stat(
            'Net payable',
            money(pays.reduce((s, r) => s + r.net, 0)),
            CreditCard,
            'Illustrative amount only',
            'green',
          )}
          {stat(
            'Payslips generated',
            pays.length,
            FileCheck2,
            'Securely scoped by employee',
            'blue',
          )}
        </div>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Payroll register</h2>
              <p>Monthly records for your people.</p>
            </div>
            <div className="row-actions">
              <input
                aria-label="Payroll month"
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              />
              {isManager && (
                <Button icon={Wallet} disabled={running || !!pays.length} onClick={generate}>
                  {running
                    ? 'Generating…'
                    : pays.length
                      ? 'Records generated'
                      : 'Generate payslips'}
                </Button>
              )}
            </div>
          </div>
          {table(
            ['Employee', 'Month', 'Gross', 'Deductions', 'Net pay', 'Payslip'],
            pays.map((r) => (
              <tr key={r.id}>
                <td>{personCell(r.employeeId)}</td>
                <td>{r.month}</td>
                <td>{money(r.gross)}</td>
                <td>{money(r.deductions)}</td>
                <td>
                  <b>{money(r.net)}</b>
                </td>
                <td>
                  <a className="download-link" href={'/api/payslips/' + r.id} download>
                    <Download size={15} /> Download
                  </a>
                </td>
              </tr>
            )),
          )}
        </section>
      </>
    );
  }
  function Recruitment() {
    const [tab, setTab] = useState('Open positions');
    return (
      <>
        <div className="stats-grid three">
          {stat(
            'Open positions',
            list('job').filter((j) => j.status === 'Open').length,
            BriefcaseBusiness,
            'Room for more brilliant minds',
          )}
          {stat(
            'Candidates in pipeline',
            list('candidate').filter((c) => !['Rejected', 'Hired'].includes(c.stage)).length,
            Users,
            'Real people. New possibilities.',
            'blue',
          )}
          {stat(
            'Offers made',
            list('candidate').filter((c) => c.stage === 'Offer').length,
            Award,
            'Almost part of the family',
            'green',
          )}
        </div>
        <div className="section-tabs">
          <div className="tabs">
            {['Open positions', 'Candidate pipeline'].map((t) => (
              <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>
          <Button secondary onClick={() => modalForm('candidate')}>
            Add candidate
          </Button>
        </div>
        {tab === 'Open positions' ? (
          <div className="card-grid">
            {list('job').map((j) => (
              <article className="panel job-card" key={j.id}>
                <div className="flex-between">
                  {divisionBadge(j.division)}
                  <Badge>{j.status}</Badge>
                </div>
                <h3>{j.title}</h3>
                <p>{j.department}</p>
                <div className="job-meta">
                  <span>
                    <MapPin size={14} />
                    {j.location}
                  </span>
                  <span>
                    <Clock3 size={14} />
                    {j.employment}
                  </span>
                </div>
                <footer>
                  <span>
                    <Users size={15} />
                    {j.applicants} seeded applications
                  </span>
                  <button
                    className="text-link"
                    onClick={() =>
                      act(
                        '/records/' + j.id,
                        'PATCH',
                        { status: j.status === 'Open' ? 'Closed' : 'Open' },
                        'Position updated.',
                      )
                    }
                  >
                    {j.status === 'Open' ? 'Close role' : 'Reopen role'}
                    <ArrowUpRight size={14} />
                  </button>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <section className="panel">
            {table(
              ['Candidate', 'Position', 'Division', 'Hiring stage'],
              list('candidate').map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="person-cell">
                      <Avatar name={c.name} />
                      <span>
                        <b>{c.name}</b>
                        <small>{c.email}</small>
                      </span>
                    </div>
                  </td>
                  <td>{c.position}</td>
                  <td>{divisionBadge(c.division)}</td>
                  <td>
                    <select
                      aria-label={'Hiring stage for ' + c.name}
                      value={c.stage}
                      onChange={(e) =>
                        act(
                          '/records/' + c.id,
                          'PATCH',
                          { stage: e.target.value },
                          'Candidate stage updated.',
                        )
                      }
                    >
                      {['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'].map(
                        (s) => (
                          <option key={s}>{s}</option>
                        ),
                      )}
                    </select>
                  </td>
                </tr>
              )),
            )}
          </section>
        )}
      </>
    );
  }
  function Performance() {
    const [progress, setProgress] = useState({});
    return (
      <>
        <div className="section-intro">
          <div className="intro-icon">
            <Target size={32} />
          </div>
          <div>
            <h2>Small steps. Remarkable growth.</h2>
            <p>Give your ambitions a direction, and celebrate every milestone.</p>
          </div>
          <span className="date-chip">
            <Flag size={14} /> Q4 2026 review cycle
          </span>
        </div>
        <div className="card-grid">
          {list('goal').map((g) => (
            <article className="panel goal-card" key={g.id}>
              <div className="flex-between">
                <span className="subtle-label">{g.cycle}</span>
                <Badge>{g.status}</Badge>
              </div>
              <h3>{g.title}</h3>
              {personCell(g.employeeId)}
              <div className="progress-label">
                <span>Goal progress</span>
                <b>{progress[g.id] ?? g.progress}%</b>
              </div>
              <input
                className="goal-range"
                aria-label={'Progress for ' + g.title}
                type="range"
                min="0"
                max="100"
                value={progress[g.id] ?? g.progress}
                onChange={(e) => setProgress({ ...progress, [g.id]: Number(e.target.value) })}
              />
              <footer>
                <span>Every step counts.</span>
                <button
                  className="text-link"
                  onClick={() =>
                    act(
                      '/records/' + g.id,
                      'PATCH',
                      { progress: progress[g.id] ?? g.progress },
                      'Progress updated. Keep going!',
                    )
                  }
                >
                  Save progress <Check size={14} />
                </button>
              </footer>
            </article>
          ))}
          {!list('goal').length && (
            <Empty title="Make room for growth" text="Set a goal to start your next chapter." />
          )}
        </div>
      </>
    );
  }
  function Expenses() {
    return (
      <>
        <div className="stats-grid three">
          {stat(
            'Awaiting review',
            list('expense').filter((e) => e.status === 'Pending').length,
            Clock3,
            'A few things to take care of',
          )}
          {stat(
            'Approved expenses',
            money(
              list('expense')
                .filter((e) => e.status === 'Approved')
                .reduce((s, e) => s + e.amount, 0),
            ),
            CheckCheck,
            'Approved records, not bank payments',
            'green',
          )}
          {stat(
            'Total submitted',
            money(list('expense').reduce((s, e) => s + e.amount, 0)),
            CreditCard,
            'Across all expense categories',
            'blue',
          )}
        </div>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Expense claims</h2>
              <p>All the details, without the paper trail.</p>
            </div>
            <span className="subtle-label">Amounts in INR</span>
          </div>
          {table(
            ['Employee', 'Expense', 'Category', 'Amount', 'Status', 'Actions'],
            list('expense').map((r) => (
              <tr key={r.id}>
                <td>{personCell(r.employeeId)}</td>
                <td>
                  {r.title}
                  <small className="cell-note">{fmt(r.date)}</small>
                </td>
                <td>{r.category}</td>
                <td>
                  <b>{money(r.amount)}</b>
                </td>
                <td>
                  <Badge>{r.status}</Badge>
                </td>
                <td>
                  {isManager && r.status === 'Pending' ? (
                    <div className="row-actions">
                      <button
                        className="approve-text"
                        onClick={() =>
                          act(
                            '/records/' + r.id,
                            'PATCH',
                            { status: 'Approved' },
                            'Expense approved.',
                          )
                        }
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        aria-label="Reject expense"
                        onClick={() =>
                          act(
                            '/records/' + r.id,
                            'PATCH',
                            { status: 'Rejected' },
                            'Expense rejected.',
                          )
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            )),
          )}
        </section>
      </>
    );
  }
  function Journeys() {
    return (
      <div className="card-grid two">
        {list('journey').map((j) => (
          <section className="panel journey-card" key={j.id}>
            <div className="flex-between">
              <span className={'category-tag ' + (j.type === 'Onboarding' ? 'green' : 'orange')}>
                {j.type}
              </span>
              <span className="subtle-label">{j.progress}% complete</span>
            </div>
            <h3>{j.title}</h3>
            {personCell(j.employeeId)}
            <div className="progress-track">
              <span style={{ width: j.progress + '%' }} />
            </div>
            <div className="checklist">
              {j.tasks.map((t, i) => (
                <button
                  key={i}
                  onClick={() =>
                    act(
                      '/records/' + j.id,
                      'PATCH',
                      { task: i },
                      t.done ? 'Task reopened.' : 'Another step complete!',
                    )
                  }
                  className={t.done ? 'done' : ''}
                >
                  <span>{t.done && <Check size={13} />}</span>
                  {t.title}
                </button>
              ))}
            </div>
          </section>
        ))}
        {!list('journey').length && (
          <Empty
            title="Your journey is up to date"
            text="Employee onboarding and offboarding checklists will appear here."
          />
        )}
      </div>
    );
  }
  function Assets() {
    return (
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Equipment & assets</h2>
            <p>A clear view of the tools that power your team.</p>
          </div>
          <span className="small-count">{list('asset').length} assets</span>
        </div>
        {table(
          ['Asset', 'Serial number', 'Assigned to', 'Division', 'Status'],
          list('asset').map((a) => (
            <tr key={a.id}>
              <td>
                <div className="asset-name">
                  <span className="mini-symbol blue">
                    <Monitor size={19} />
                  </span>
                  <span>
                    <b>{a.name}</b>
                    <small>{a.category}</small>
                  </span>
                </div>
              </td>
              <td>
                <code>{a.serial}</code>
              </td>
              <td>{personCell(a.employeeId)}</td>
              <td>{divisionBadge(employee(a.employeeId).division)}</td>
              <td>
                {isManager ? (
                  <select
                    aria-label={'Status of ' + a.name}
                    value={a.status}
                    onChange={(e) =>
                      act(
                        '/records/' + a.id,
                        'PATCH',
                        { status: e.target.value },
                        'Asset status updated.',
                      )
                    }
                  >
                    {['Assigned', 'Returned', 'Maintenance'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <Badge>{a.status}</Badge>
                )}
              </td>
            </tr>
          )),
        )}
      </section>
    );
  }
  function Documents() {
    const [q, setQ] = useState('');
    return (
      <>
        <div className="document-intro">
          <div>
            <span className="eyebrow">A LITTLE CLARITY GOES A LONG WAY</span>
            <h2>Your workplace knowledge, together.</h2>
            <p>Policies, guides and the answers you’re looking for.</p>
          </div>
          <BookOpen size={62} strokeWidth={1} />
        </div>
        <div className="inline-search document-search">
          <Search size={16} />
          <input
            aria-label="Search documents"
            placeholder="Find a policy or guide…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="card-grid">
          {list('document')
            .filter((d) => d.title.toLowerCase().includes(q.toLowerCase()))
            .map((d) => (
              <article className="panel document-card" key={d.id}>
                <div className="flex-between">
                  <span className="document-icon">
                    <FileText size={24} />
                  </span>
                  <span className="category-tag">{d.category}</span>
                </div>
                <h3>{d.title}</h3>
                <p>
                  Version {d.version} · Updated {fmt(d.date)}
                </p>
                <footer>
                  <button
                    className="text-link"
                    onClick={() => setModal({ type: 'readDocument', document: d })}
                  >
                    Read document
                    <ArrowUpRight size={14} />
                  </button>
                  <a
                    className="icon-button"
                    aria-label={'Download ' + d.title}
                    href={'/api/documents/' + d.id}
                    download
                  >
                    <Download size={16} />
                  </a>
                </footer>
              </article>
            ))}
        </div>
      </>
    );
  }
  function Reports() {
    return (
      <>
        <div className="stats-grid compact">
          {stat(
            'Total workforce',
            visiblePeople.length,
            Users,
            'People across your selected divisions',
          )}
          {stat(
            'Attendance rate',
            Math.round((attendance.length / (visiblePeople.length || 1)) * 100) + '%',
            Activity,
            'Based on today’s check-ins',
            'green',
          )}
          {stat('Pending requests', pending.length, Clock3, 'Leave and expense claims', 'purple')}
          {stat(
            'Open positions',
            list('job').filter((j) => j.status === 'Open').length,
            BriefcaseBusiness,
            'Hiring across your organization',
            'blue',
          )}
        </div>
        <div className="dashboard-middle">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Workforce by division</h2>
                <p>Everyone brings something different.</p>
              </div>
            </div>
            {workforce}
            <div className="chart-legend">
              {['Marketing', 'Exhibits', 'Live'].map((d) => (
                <span key={d}>
                  <i className={'dot ' + divisionColors[d]} />
                  {d}
                </span>
              ))}
            </div>
          </section>
          <section className="panel location-panel">
            <div className="panel-header">
              <div>
                <h2>Connected across offices</h2>
                <p>Different places. One team.</p>
              </div>
              <Globe2 size={19} />
            </div>
            {['Mumbai', 'Delhi', 'Dubai'].map((l, i) => {
              const n = visiblePeople.filter((e) => e.location === l).length;
              return (
                <div className="location-row" key={l}>
                  <span className={'location-icon ' + ['orange', 'green', 'blue'][i]}>
                    <MapPin size={19} />
                  </span>
                  <div>
                    <b>{l}</b>
                    <div className="progress-track">
                      <span style={{ width: (n / (visiblePeople.length || 1)) * 100 + '%' }} />
                    </div>
                  </div>
                  <strong>{n}</strong>
                </div>
              );
            })}
          </section>
        </div>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Take your insights with you</h2>
              <p>Export current workspace records for further analysis.</p>
            </div>
          </div>
          <div className="export-options">
            {[
              ['People directory', Users, visiblePeople],
              ['Attendance records', Clock3, list('attendance')],
              ['Leave requests', CalendarDays, list('leave')],
              ['Expense claims', CreditCard, list('expense')],
            ].map(([name, Icon, rows]) => (
              <button
                key={name}
                onClick={() =>
                  exportCsv(
                    name,
                    rows.map((r) => {
                      const { data, ...rest } = r;
                      return rest;
                    }),
                  )
                }
              >
                <Icon size={21} />
                <span>
                  <b>{name}</b>
                  <small>{rows.length} records · CSV</small>
                </span>
                <Download size={17} />
              </button>
            ))}
          </div>
        </section>
      </>
    );
  }
  function Announcements() {
    return (
      <div className="dashboard-middle">
        <div className="announcement-feed">
          {list('announcement').map((a) => (
            <article className="panel feed-card" key={a.id}>
              <div className="flex-between">
                <div className="person-cell">
                  <Avatar name={a.author} />
                  <span>
                    <b>{a.author}</b>
                    <small>{fmt(a.date, { day: 'numeric', month: 'long', year: 'numeric' })}</small>
                  </span>
                </div>
                <span className="category-tag orange">{a.tag}</span>
              </div>
              <h2>{a.title}</h2>
              <p>{a.body}</p>
              <footer>
                <span className="with-icon">
                  <Globe2 size={13} /> Shared with everyone
                </span>
                <span className="tiny-star">✦</span>
              </footer>
            </article>
          ))}
        </div>
        <section className="panel events-full">
          <div className="panel-header">
            <div>
              <h2>Coming together</h2>
              <p>Your company calendar.</p>
            </div>
            {isManager && (
              <button
                className="icon-button"
                aria-label="Add event"
                onClick={() => modalForm('event')}
              >
                <Plus size={18} />
              </button>
            )}
          </div>
          <div className="event-list">
            {list('event')
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((e) => (
                <div className="event-row" key={e.id}>
                  <div className="event-date">
                    <b>{fmt(e.date, { day: '2-digit' })}</b>
                    <span>{fmt(e.date, { month: 'short' })}</span>
                  </div>
                  <div>
                    <h4>{e.title}</h4>
                    <p>
                      {e.time} IST · {e.division}
                    </p>
                    <span className="subtle-label">{e.type}</span>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    );
  }
  function Learning() {
    const own = all('learning').filter((l) => l.employeeId === user.employeeId);
    return (
      <>
        <div className="learning-banner">
          <span className="learning-art">✦</span>
          <div>
            <span className="eyebrow">STAY CURIOUS. KEEP GROWING.</span>
            <h2>A little learning. A world of possibility.</h2>
            <p>Your next great idea could start right here.</p>
          </div>
          <div className="learning-complete">
            <strong>{own.filter((c) => c.status === 'Completed').length}</strong>
            <span>courses completed</span>
          </div>
        </div>
        <div className="card-grid">
          {list('course').map((c, i) => {
            const enrollment = own.find((l) => l.catalogueId === c.id);
            return (
              <article className="panel course-card" key={c.id}>
                <div className={'course-illustration ' + (divisionColors[c.division] || 'purple')}>
                  <span>{['✦', '✦', '◈', '◎'][i % 4]}</span>
                  <small>{c.division.toUpperCase()}</small>
                </div>
                <div className="course-body">
                  <div className="flex-between">
                    <span className="subtle-label">
                      <Clock3 size={11} /> {c.duration}
                    </span>
                    {enrollment ? (
                      <Badge>{enrollment.status}</Badge>
                    ) : (
                      <span className="category-tag">Self-paced</span>
                    )}
                  </div>
                  <h3>{c.title}</h3>
                  <p>{c.description}</p>
                  <button
                    className="text-link"
                    onClick={async () => {
                      if (!enrollment) {
                        await act(
                          '/records/learning',
                          'POST',
                          { catalogueId: c.id },
                          'Your learning journey starts here.',
                        );
                      }
                      setModal({ type: 'courseReader', course: c });
                    }}
                  >
                    {enrollment?.status === 'Completed'
                      ? 'Revisit course'
                      : enrollment
                        ? 'Continue learning'
                        : 'Start learning'}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </>
    );
  }
  function Benefits() {
    const own = all('enrollment').filter((r) => r.employeeId === user.employeeId);
    return (
      <>
        <div className="info-banner">
          <ShieldCheck size={20} />
          <div>
            <b>Good support starts with clear expectations.</b>
            <p>
              These are sample benefits. Requests go to HR for verification; submitting or approving
              a request does not activate insurance or transfer funds.
            </p>
          </div>
        </div>
        <div className="card-grid">
          {list('benefit').map((b, i) => {
            const enrollment = own.find((e) => e.catalogueId === b.id);
            const Icon = [ShieldCheck, GraduationCap, Sun][i % 3];
            return (
              <article className="panel benefit-card" key={b.id}>
                <span className={'benefit-icon ' + ['green', 'blue', 'orange'][i % 3]}>
                  <Icon size={28} />
                </span>
                <span className="eyebrow muted">{b.category}</span>
                <h3>{b.title}</h3>
                <b className="benefit-subtitle">{b.subtitle}</b>
                <p>{b.description}</p>
                <footer>
                  {enrollment ? (
                    <Badge>{enrollment.status}</Badge>
                  ) : (
                    <Button
                      secondary
                      icon={ArrowRight}
                      onClick={() =>
                        act(
                          '/records/enrollment',
                          'POST',
                          { catalogueId: b.id },
                          'Request sent. HR will confirm eligibility and next steps.',
                        )
                      }
                    >
                      Request access
                    </Button>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
        {isManager && (
          <section className="panel benefit-requests">
            <div className="panel-header">
              <div>
                <h2>Benefit requests</h2>
                <p>Help your people access the support they need.</p>
              </div>
            </div>
            {table(
              ['Employee', 'Benefit', 'Requested', 'Status', 'Review'],
              list('enrollment').map((r) => (
                <tr key={r.id}>
                  <td>{personCell(r.employeeId)}</td>
                  <td>{r.title}</td>
                  <td>{fmt(r.date)}</td>
                  <td>
                    <Badge>{r.status}</Badge>
                  </td>
                  <td>
                    {r.status === 'Pending' ? (
                      <div className="row-actions">
                        <button
                          className="approve-text"
                          onClick={() =>
                            act(
                              '/records/' + r.id,
                              'PATCH',
                              { status: 'Approved' },
                              'Request approved for HR follow-up.',
                            )
                          }
                        >
                          <Check size={13} />
                          Approve
                        </button>
                        <button
                          aria-label="Reject benefit request"
                          onClick={() =>
                            act(
                              '/records/' + r.id,
                              'PATCH',
                              { status: 'Rejected' },
                              'Request rejected.',
                            )
                          }
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )),
            )}
          </section>
        )}
      </>
    );
  }
  function Support() {
    return (
      <>
        <div className="support-intro">
          <span className="support-spark">✦</span>
          <div>
            <span className="eyebrow">WE’RE HERE FOR YOU</span>
            <h2>A question. A concern. A conversation.</h2>
            <p>Send a request to your People team and follow it through.</p>
          </div>
        </div>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{isManager ? 'People support inbox' : 'Your support requests'}</h2>
              <p>Requests are visible to the employee and authorized HR staff.</p>
            </div>
            <span className="small-count">{list('ticket').length}</span>
          </div>
          {table(
            ['Employee', 'Request', 'Priority', 'Status', ''],
            list('ticket').map((t) => (
              <tr key={t.id}>
                <td>{personCell(t.employeeId)}</td>
                <td>
                  <b>{t.title}</b>
                  <small className="cell-note">
                    {t.category} · {fmt(t.date)}
                  </small>
                </td>
                <td>
                  <Badge tone={t.priority === 'Urgent' ? 'orange' : 'gray'}>{t.priority}</Badge>
                </td>
                <td>
                  <Badge>{t.status}</Badge>
                </td>
                <td>
                  <button
                    className="text-link"
                    onClick={() => setModal({ type: 'ticketView', ticket: t })}
                  >
                    View request <ArrowUpRight size={13} />
                  </button>
                </td>
              </tr>
            )),
          )}
        </section>
      </>
    );
  }

  function Settings() {
    const [company, setCompany] = useState(settings.company),
      [leaveDays, setLeaveDays] = useState(settings.leaveDays),
      [error, setError] = useState(''),
      [saved, setSaved] = useState(false);
    async function save(e) {
      e.preventDefault();
      try {
        await mutate(
          '/settings',
          'PATCH',
          { company, leaveDays: Number(leaveDays) },
          'Workspace settings updated.',
        );
        setSaved(true);
      } catch (e) {
        setError(e.message);
      }
    }
    return (
      <div className="settings-grid">
        <div>
          <section className="panel settings-panel">
            <div className="panel-header">
              <div>
                <h2>Your profile</h2>
                <p>Here’s how you show up at work.</p>
              </div>
              <ShieldCheck size={20} />
            </div>
            <div className="settings-profile">
              <Avatar name={me.name} size="large" />
              <div>
                <h3>{me.name}</h3>
                <p>{user.email}</p>
                <Badge tone="purple">{prettyRole(user.role)}</Badge>
              </div>
              <Button secondary icon={ShieldCheck} onClick={() => setModal({ type: 'password' })}>
                Change password
              </Button>
            </div>
          </section>
          {isManager && (
            <section className="panel settings-panel">
              <div className="panel-header">
                <div>
                  <h2>Workspace preferences</h2>
                  <p>A few details that make this space yours.</p>
                </div>
              </div>
              <form className="settings-form" onSubmit={save}>
                <div className="form-fields">
                  <label>
                    Organization name
                    <input required value={company} onChange={(e) => setCompany(e.target.value)} />
                  </label>
                  <label>
                    Annual leave allowance (days)
                    <input
                      type="number"
                      required
                      min="0"
                      max="365"
                      value={leaveDays}
                      onChange={(e) => setLeaveDays(e.target.value)}
                    />
                  </label>
                  <label>
                    Reporting currency
                    <input value="INR · Indian rupee" disabled />
                  </label>
                  <label>
                    Workspace timezone
                    <input value="Asia/Kolkata · IST" disabled />
                  </label>
                </div>
                <p className="field-hint">
                  International offices share the workspace’s reporting currency and timezone. Local
                  statutory payroll requires integration.
                </p>
                {error && <p className="form-error">{error}</p>}
                <Button type="submit" icon={Check}>
                  Save preferences
                </Button>
              </form>
            </section>
          )}
          {user.role === 'admin' && (
            <section className="panel settings-panel">
              <div className="panel-header">
                <div>
                  <h2>Account access</h2>
                  <p>The right access, for the right people.</p>
                </div>
                <Button secondary onClick={() => modalForm('account')}>
                  Create login
                </Button>
              </div>
              <div className="account-list">
                {(data.accounts || []).map((a) => (
                  <div key={a.id}>
                    <Avatar name={employee(a.employeeId).name} size="small" />
                    <span>
                      <b>{employee(a.employeeId).name}</b>
                      <small>{a.email}</small>
                    </span>
                    <select
                      aria-label={'Access role for ' + a.email}
                      disabled={a.id === user.id}
                      value={a.role}
                      onChange={(e) =>
                        act(
                          '/accounts/' + a.id,
                          'PATCH',
                          { role: e.target.value },
                          'Role updated. Previous sessions were revoked.',
                        )
                      }
                    >
                      <option value="admin">Administrator</option>
                      <option value="hr">HR manager</option>
                      <option value="employee">Employee</option>
                    </select>
                  </div>
                ))}
              </div>
            </section>
          )}
          {isManager && (
            <section className="panel settings-panel">
              <div className="panel-header">
                <div>
                  <h2>Activity log</h2>
                  <p>A clear trail of workspace changes.</p>
                </div>
              </div>
              <div className="audit-list">
                {data.audit.slice(0, 10).map((a) => (
                  <div key={a.id}>
                    <span className="audit-dot" />
                    <div>
                      <b>{a.action}</b>
                      <small>{a.actor}</small>
                    </div>
                    <time>
                      {new Date(a.createdAt.replace(' ', 'T') + 'Z').toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="panel security-panel">
          <span className="security-icon">
            <ShieldCheck size={30} />
          </span>
          <h3>Your workspace, protected.</h3>
          <p>Access is tailored to your role. Your data stays in the workspace database.</p>
          <ul>
            <li>
              <Check size={15} /> Password-protected access
            </li>
            <li>
              <Check size={15} /> Server-enforced permissions
            </li>
            <li>
              <Check size={15} /> Private session cookies
            </li>
            <li>
              <Check size={15} /> Logged HR actions
            </li>
          </ul>
          <span className="category-tag">
            {data.demo ? 'Demonstration workspace' : 'Company workspace'}
          </span>
          {data.demo && (
            <p className="field-hint">
              Sample data and shared demo accounts are enabled. Configure company authentication
              before adding real employee data.
            </p>
          )}
        </aside>
      </div>
    );
  }
  const actions = {
    support: ['New request', 'ticket'],
    learning: ['Create course', 'course'],
    benefits: ['Add benefit', 'benefit'],
    people: ['Add employee', 'employee'],
    leave: ['Request leave', 'leave'],
    recruitment: ['Create position', 'job'],
    performance: ['Create goal', 'goal'],
    expenses: ['Submit expense', 'expense'],
    journeys: ['Create journey', 'journey'],
    assets: ['Assign asset', 'asset'],
    documents: ['Create document', 'document'],
    announcements: ['New announcement', 'announcement'],
  };
  const allowedAction =
    actions[page] && (isManager || ['leave', 'performance', 'expenses', 'support'].includes(page));
  const pages = {
    dashboard: Dashboard,
    people: People,
    attendance: Attendance,
    leave: Leave,
    payroll: Payroll,
    recruitment: Recruitment,
    performance: Performance,
    expenses: Expenses,
    journeys: Journeys,
    assets: Assets,
    documents: Documents,
    reports: Reports,
    announcements: Announcements,
    settings: Settings,
    learning: Learning,
    benefits: Benefits,
    support: Support,
  };
  const Page = pages[page] || Dashboard;
  const availablePages = Object.keys(labels).filter(
    (p) => isManager || !['recruitment', 'reports'].includes(p),
  );
  return (
    <div className="app-shell">
      {menu && <div className="mobile-overlay" onClick={() => setMenu(false)} />}
      <aside className={'sidebar ' + (menu ? 'open' : '')}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="mobile-close icon-button"
            onClick={() => setMenu(false)}
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>
        <button className="workspace-switch" onClick={() => go('settings')}>
          <span className="workspace-avatar">B</span>
          <span>
            <b>BrainADZ workspace</b>
            <small>One team. All possibilities.</small>
          </span>
          <ChevronDown size={13} />
        </button>
        <nav>
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.pages.map((p) => {
                const Icon = icons[p];
                return (
                  <button
                    className={'nav-item ' + (page === p ? 'active' : '')}
                    key={p}
                    onClick={() => go(p)}
                  >
                    <Icon size={18} strokeWidth={1.7} />
                    <span>{labels[p]}</span>
                    {p === 'leave' && pending.filter((r) => r.kind === 'leave').length > 0 && (
                      <span className="nav-count">
                        {pending.filter((r) => r.kind === 'leave').length}
                      </span>
                    )}
                    {p === 'dashboard' && page === p && <span className="active-dot" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span>Good people. Great support.</span>
            <button onClick={() => setHelp(true)}>
              We’re here for you
              <ArrowUpRight size={14} />
            </button>
            <span className="help-spark">✦</span>
          </div>
          <button
            className={'nav-item ' + (page === 'settings' ? 'active' : '')}
            onClick={() => go('settings')}
          >
            <Settings2 size={18} />
            Settings
          </button>
          <div className="user-block">
            <Avatar name={me.name} />
            <button onClick={() => go('settings')}>
              <b>{me.name}</b>
              <small>{prettyRole(user.role)}</small>
            </button>
            <button
              title="Sign out"
              aria-label="Sign out"
              className="icon-button"
              onClick={async () => {
                try {
                  await api('/auth/logout', 'POST');
                  setData(null);
                  setPage('dashboard');
                  location.hash = 'dashboard';
                } catch (e) {
                  message(e.message, true);
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={21} />
            </button>
            <span className="desktop-label">Workspace</span>
            <ChevronRight size={13} className="desktop-label" />
            <b>{labels[page] || 'Overview'}</b>
          </div>
          <div className="topbar-right">
            <button className="global-search" onClick={() => setSearchOpen(true)}>
              <Search size={16} />
              <span>Search anything…</span>
              <kbd>⌕</kbd>
            </button>
            <div className="topbar-divider" />
            <button
              className="icon-button help-button"
              aria-label="Help and support"
              onClick={() => setHelp(true)}
            >
              <CircleHelp size={19} />
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => setNotify(true)}
            >
              <Bell size={19} />
              {pending.length > 0 && <i />}
            </button>
            <button className="avatar-button" aria-label="Your profile" onClick={() => profile(me)}>
              <Avatar name={me.name} size="small" />
            </button>
          </div>
        </header>
        <main>
          <div className="workspace-bar">
            <span>
              <span className="workspace-status" />{' '}
              {data.demo ? 'YOUR BRAINADZ DEMO WORKSPACE' : 'YOUR BRAINADZ WORKSPACE'}
            </span>
            <div className="division-select">
              <span>Viewing</span>
              <select
                aria-label="Filter by division"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
              >
                {['All divisions', 'Marketing', 'Exhibits', 'Live'].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
              <ChevronDown size={13} />
            </div>
          </div>
          {page !== 'dashboard' && (
            <div className="page-heading">
              <div>
                <div className="eyebrow muted">
                  {['documents', 'reports', 'announcements', 'settings'].includes(page)
                    ? 'YOUR ORGANIZATION'
                    : 'YOUR PEOPLE, SUPPORTED'}
                </div>
                <h1>{labels[page] || 'Overview'}</h1>
                <p>{subtitles[page]}</p>
              </div>
              {allowedAction && (
                <Button onClick={() => modalForm(actions[page][1])}>{actions[page][0]}</Button>
              )}
            </div>
          )}
          {!isManager && ['recruitment', 'reports'].includes(page) ? (
            <Empty
              title="This space is for your People team"
              text="Your personal workspace is ready to explore."
              action={
                <Button icon={ArrowRight} onClick={() => go('dashboard')}>
                  Go to overview
                </Button>
              }
            />
          ) : (
            <Page />
          )}
        </main>
        <footer className="app-footer">
          <span>
            BrainADZ People <span>·</span> Your people, connected.
          </span>
          <span>
            <ShieldCheck size={12} />{' '}
            {data.demo ? 'Sample data · Demo workspace' : 'Secure workspace'}
          </span>
        </footer>
      </div>
      {modal &&
        [
          'employee',
          'editEmployee',
          'leave',
          'expense',
          'job',
          'candidate',
          'goal',
          'event',
          'asset',
          'journey',
          'document',
          'announcement',
          'ticket',
          'course',
          'benefit',
          'account',
        ].includes(modal.type) && (
          <FormModal
            key={modal.type}
            type={modal.type}
            today={today}
            defaultEmployee={user.employeeId}
            initialValues={modal.employee}
            employees={isManager ? employees : [me]}
            onClose={() => setModal(null)}
            onSave={async (type, values) => {
              await mutate(
                type === 'editEmployee'
                  ? '/employees/' + modal.employee.id
                  : type === 'employee'
                    ? '/employees'
                    : type === 'account'
                      ? '/accounts'
                      : '/records/' + type,
                type === 'editEmployee' ? 'PATCH' : 'POST',
                values,
                type === 'leave'
                  ? 'Leave request sent. Time for a little recharge.'
                  : 'Saved. A little more connected.',
              );
            }}
          />
        )}
      {modal?.type === 'profile' && (
        <Modal title="Your people, a little closer" onClose={() => setModal(null)}>
          <div className="profile-sheet">
            <Avatar name={modal.employee.name} size="xlarge" />
            <h2>{modal.employee.name}</h2>
            <p>{modal.employee.title}</p>
            {divisionBadge(modal.employee.division)}
            <div className="profile-details">
              {[
                ['Employee ID', modal.employee.id],
                ['Department', modal.employee.department],
                ['Work email', modal.employee.email || 'Available to HR'],
                ['Office', modal.employee.location],
                ['Reporting manager', modal.employee.manager],
                [
                  'Joined',
                  fmt(modal.employee.joined, { day: 'numeric', month: 'long', year: 'numeric' }),
                ],
                ['Employment', modal.employee.employment],
                ['Status', modal.employee.status],
              ].map(([k, v]) => (
                <div key={k}>
                  <span>{k}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>
            {isManager && (
              <Button
                secondary
                icon={Settings2}
                onClick={() => setModal({ type: 'editEmployee', employee: modal.employee })}
              >
                Edit employee details
              </Button>
            )}
            {isManager && (
              <label className="profile-status">
                Employment status
                <select
                  aria-label="Change employment status"
                  value={
                    employees.find((e) => e.id === modal.employee.id)?.status ||
                    modal.employee.status
                  }
                  onChange={async (e) => {
                    try {
                      await mutate(
                        '/employees/' + modal.employee.id,
                        'PATCH',
                        { status: e.target.value },
                        'Employee status updated.',
                      );
                      setModal(null);
                    } catch {}
                  }}
                >
                  {['Active', 'On leave', 'Inactive'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </Modal>
      )}
      {modal?.type === 'readDocument' && (
        <Modal
          title={modal.document.title}
          description={'Version ' + modal.document.version + ' · ' + modal.document.category}
          onClose={() => setModal(null)}
        >
          <div className="document-reader">
            {modal.document.content.split('\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <div className="info-banner">
              Sample workspace policy. Verify company-approved policies before use.
            </div>
            <a className="button" href={'/api/documents/' + modal.document.id} download>
              <Download size={16} />
              Download document
            </a>
          </div>
        </Modal>
      )}
      {modal?.type === 'courseReader' && (
        <Modal
          title={modal.course.title}
          description={modal.course.duration + ' · ' + modal.course.division}
          onClose={() => setModal(null)}
        >
          <div className="document-reader">
            <span className="category-tag">Self-paced learning</span>
            {modal.course.content.split('\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <div className="info-banner">
              Take a moment to reflect on what you learned. Completion records are self-reported.
            </div>
            <Button
              icon={CheckCheck}
              disabled={
                all('learning').find(
                  (l) => l.catalogueId === modal.course.id && l.employeeId === user.employeeId,
                )?.status === 'Completed'
              }
              onClick={async () => {
                const enrollment = all('learning').find(
                  (l) => l.catalogueId === modal.course.id && l.employeeId === user.employeeId,
                );
                if (enrollment) {
                  await act(
                    '/records/' + enrollment.id,
                    'PATCH',
                    { status: 'Completed' },
                    'Another milestone. Course complete!',
                  );
                  setModal(null);
                }
              }}
            >
              Mark as complete
            </Button>
          </div>
        </Modal>
      )}
      {modal?.type === 'ticketView' && (
        <TicketModal
          ticket={records.find((r) => r.id === modal.ticket.id) || modal.ticket}
          isManager={isManager}
          employee={employee(modal.ticket.employeeId)}
          onClose={() => setModal(null)}
          onSave={async (body) => {
            await mutate('/records/' + modal.ticket.id, 'PATCH', body, 'Response saved.');
            setModal(null);
          }}
        />
      )}
      {modal?.type === 'password' && (
        <PasswordModal
          onClose={() => setModal(null)}
          onSave={async (b) => {
            await mutate(
              '/auth/password',
              'POST',
              b,
              'Password updated. Other sessions have been signed out.',
            );
            setModal(null);
          }}
        />
      )}
      {searchOpen && (
        <Modal
          title="Find your way around"
          description="Search people or jump to a workspace."
          onClose={() => setSearchOpen(false)}
        >
          <div className="search-dialog">
            <div className="inline-search">
              <Search size={19} />
              <input
                autoFocus
                placeholder="Try a name, team or page…"
                aria-label="Global search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="eyebrow muted">WORKSPACES</span>
            {availablePages
              .filter((p) => labels[p].toLowerCase().includes(search.toLowerCase()))
              .slice(0, 5)
              .map((p) => {
                const Icon = icons[p];
                return (
                  <button className="search-result" key={p} onClick={() => go(p)}>
                    <Icon size={17} />
                    <span>{labels[p]}</span>
                    <ArrowUpRight size={14} />
                  </button>
                );
              })}
            <span className="eyebrow muted">PEOPLE</span>
            {employees
              .filter((e) => (e.name + ' ' + e.title).toLowerCase().includes(search.toLowerCase()))
              .slice(0, 5)
              .map((e) => (
                <button
                  className="search-result"
                  key={e.id}
                  onClick={() => {
                    setSearchOpen(false);
                    profile(e);
                  }}
                >
                  <Avatar name={e.name} size="small" />
                  <span>
                    {e.name}
                    <small>{e.title}</small>
                  </span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
          </div>
        </Modal>
      )}
      {notify && (
        <Modal
          title="A little heads-up"
          description="What needs your attention, all in one place."
          onClose={() => setNotify(false)}
        >
          <div className="notifications-list">
            {pending.length ? (
              pending.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setNotify(false);
                    go(r.kind === 'leave' ? 'leave' : 'expenses');
                  }}
                >
                  <span className="mini-symbol orange">
                    {r.kind === 'leave' ? <CalendarDays size={20} /> : <CreditCard size={20} />}
                  </span>
                  <div>
                    <b>{employee(r.employeeId).name}</b>
                    <p>{r.kind === 'leave' ? r.type + ' request' : r.title} · Pending review</p>
                  </div>
                  <ChevronRight size={17} />
                </button>
              ))
            ) : (
              <Empty title="You’re all caught up" text="New requests will appear here." />
            )}
          </div>
        </Modal>
      )}
      {help && (
        <Modal
          title="People first. Always."
          description="A little help when you need it."
          onClose={() => setHelp(false)}
        >
          <div className="help-content">
            <span className="help-illustration">✦</span>
            <h3>Your People & Culture team is here.</h3>
            <p>
              For access, benefits, leave or a confidential conversation, contact your
              organization’s HR administrator.
            </p>
            <button
              className="button"
              onClick={() => {
                setHelp(false);
                go('documents');
              }}
            >
              <BookOpen size={16} />
              Explore policies & guides
            </button>
            <div className="info-banner">
              {data.demo
                ? 'This is an interactive demo with sample data. Demo sign-in password: Brainadz@123.'
                : 'Visit your employee directory to find your People team.'}
            </div>
          </div>
        </Modal>
      )}
      {toast && (
        <div role="status" className={'toast ' + (toast.error ? 'error' : '')}>
          <span>{toast.error ? <X size={17} /> : <Check size={17} />}</span>
          {toast.text}
          <button aria-label="Dismiss notification" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
function TicketModal({ ticket, isManager, employee, onClose, onSave }) {
  const [response, setResponse] = useState(ticket.response || ''),
    [status, setStatus] = useState(ticket.status),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({ status, response });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={ticket.title}
      description={ticket.category + ' · ' + employee.name}
      onClose={onClose}
    >
      <div className="ticket-content">
        <div className="flex-between">
          <Badge>{ticket.status}</Badge>
          <span className="subtle-label">Submitted {fmt(ticket.date)}</span>
        </div>
        <p>{ticket.description}</p>
        {isManager ? (
          <form onSubmit={submit}>
            <label>
              Request status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {['Open', 'In progress', 'Resolved'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Your response
              <textarea
                rows={4}
                required={status === 'Resolved'}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Share an update or explain the resolution…"
              />
            </label>
            {error && <div className="form-error">{error}</div>}
            <Button disabled={busy} icon={Check}>
              Save response
            </Button>
          </form>
        ) : (
          <div className="ticket-response">
            <span className="eyebrow muted">PEOPLE TEAM RESPONSE</span>
            <p>
              {ticket.response ||
                'Your request is with the People team. An update will appear here.'}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function PasswordModal({ onClose, onSave }) {
  const [currentPassword, setCurrent] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Your new passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await onSave({ currentPassword, password });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Keep your account yours"
      description="Use a unique password with at least 12 characters."
      onClose={onClose}
    >
      <form className="password-form" onSubmit={submit}>
        <label>
          Current password
          <input
            required
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label>
          New password
          <input
            required
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          Confirm new password
          <input
            required
            type="password"
            autoComplete="new-password"
            minLength={12}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <Button disabled={busy} icon={ShieldCheck}>
          {busy ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </Modal>
  );
}

createRoot(document.getElementById('root')).render(<App />);
