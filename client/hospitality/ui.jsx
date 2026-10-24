import React, { useEffect, useRef } from 'react';
import {
  X,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  Inbox,
  Check,
} from 'lucide-react';
export function Brand({ inverse = false }) {
  return (
    <a
      className={'h-brand ' + (inverse ? 'inverse' : '')}
      href="/"
      aria-label="BrainADZ Hospitality OS"
    >
      <img src="/hospitality/brainadz-live.png" alt="BrainADZ Live — From Vision to Visibility" />
      <span className="h-brand-divider" />
      <span>
        Hospitality OS<span>PROPERTY OPERATIONS</span>
      </span>
    </a>
  );
}
export function Button({ children, icon: Icon, variant = '', ...props }) {
  return (
    <button type="button" className={'h-button ' + variant} {...props}>
      {Icon && <Icon size={15} />} {children}
    </button>
  );
}
export function Avatar({ name, size = '' }) {
  return (
    <span className={'h-avatar ' + size}>
      {(name || '')
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')}
    </span>
  );
}
export function Status({ children }) {
  return (
    <span
      className={
        'h-status ' +
        ({
          Confirmed: 'blue',
          'In house': 'green',
          'Checked out': 'gray',
          Cancelled: 'red',
          Inspected: 'green',
          Clean: 'teal',
          Dirty: 'amber',
          Cleaning: 'blue',
          Good: 'green',
          'Out of order': 'red',
          Pending: 'amber',
          'In progress': 'blue',
          'Awaiting inspection': 'purple',
          Completed: 'green',
        }[children] || 'gray')
      }
    >
      <i />
      {children}
    </span>
  );
}
export function Empty({
  title = 'Nothing to show here',
  text = 'Try a different date or filter.',
  action,
}) {
  return (
    <div className="h-empty">
      <span>
        <Inbox size={26} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={'h-panel ' + className}>
      {(title || action) && (
        <header className="h-panel-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
export function Modal({ title, subtitle, onClose, children, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const before = document.activeElement;
    ref.current?.querySelector('input,select,button')?.focus();
    const key = (e) => {
      if ([...document.querySelectorAll('[role="dialog"]')].at(-1) !== ref.current) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const items = [
          ...ref.current.querySelectorAll('button,a[href],input,select,textarea'),
        ].filter((el) => !el.disabled);
        if (e.shiftKey && document.activeElement === items[0]) {
          e.preventDefault();
          items.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
          e.preventDefault();
          items[0]?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      before?.focus();
    };
  }, []);
  return (
    <div
      className="h-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={'h-modal ' + (wide ? 'wide' : '')}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="h-icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={19} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder = 'Search…',
  label = 'Search records',
}) {
  return (
    <div className="h-search">
      <Search size={15} />
      <input
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
export function Kpi({ label, value, previous, icon: Icon, tone = 'blue', note, onClick }) {
  const growth = previous;
  return (
    <button className={'h-kpi ' + (!onClick ? 'inert' : '')} onClick={onClick} disabled={!onClick}>
      <div>
        <span>{label}</span>
        {Icon && (
          <i className={tone}>
            <Icon size={18} />
          </i>
        )}
      </div>
      <strong>{value}</strong>
      <footer>
        {growth !== null && growth !== undefined ? (
          <span className={growth >= 0 ? 'up' : 'down'}>
            {growth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{' '}
            {growth > 0 ? '+' : ''}
            {growth}% <em>vs previous period</em>
          </span>
        ) : (
          <span>{note || 'Based on selected period'}</span>
        )}
        {onClick && <ArrowUpRight size={12} />}
      </footer>
    </button>
  );
}
export function Table({ headers, children, empty = false }) {
  return (
    <div className="h-table-scroll">
      <table className="h-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th scope="col" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && <Empty />}
    </div>
  );
}
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="h-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          role="tab"
          aria-selected={value === t}
          key={t}
          className={value === t ? 'active' : ''}
          onClick={() => onChange(t)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
