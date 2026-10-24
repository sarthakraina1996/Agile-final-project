import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  MapPin,
  BedDouble,
  Star,
  Check,
  Clock3,
  ClipboardCheck,
  Search,
  Building2,
  ShieldCheck,
  Mail,
  Phone,
  FileText,
} from 'lucide-react';
import { Panel, Table, Status, SearchField, Avatar, Button, Tabs, Empty, Modal } from './ui';
import { money, dateFormat, canDesk, canClean, canFinance, download } from './lib';
export function ReservationList({ data, frontdesk = false, onSelect, onCreate }) {
  const [q, setQ] = useState(''),
    [tab, setTab] = useState(frontdesk ? 'Arrivals' : 'All reservations'),
    [page, setPage] = useState(0),
    [sort, setSort] = useState('arrival');
  const filtered = data.reservations
    .filter(
      (r) =>
        (r.guest_name + ' ' + r.id + ' ' + r.room_number).toLowerCase().includes(q.toLowerCase()) &&
        (tab === 'Arrivals'
          ? r.arrival === data.today && r.status === 'Confirmed'
          : tab === 'Departures'
            ? r.departure === data.today && r.status === 'In house'
            : tab === 'In house'
              ? r.status === 'In house'
              : tab === 'Confirmed'
                ? r.status === 'Confirmed'
                : tab === 'Cancelled'
                  ? r.status === 'Cancelled'
                  : true),
    )
    .sort((a, b) => String(a[sort]).localeCompare(String(b[sort])));
  return (
    <Panel>
      <div className="h-table-toolbar">
        <Tabs
          tabs={
            frontdesk
              ? ['Arrivals', 'Departures', 'In house', 'All reservations']
              : ['All reservations', 'Confirmed', 'In house', 'Cancelled']
          }
          value={tab}
          onChange={(t) => {
            setTab(t);
            setPage(0);
          }}
        />
        <div className="h-table-tools">
          <SearchField
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(0);
            }}
            label="Search reservations"
            placeholder="Guest, room or booking…"
          />
          <select
            aria-label="Sort reservations"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="arrival">Arrival date</option>
            <option value="guest_name">Guest name</option>
            <option value="room_number">Room number</option>
          </select>
        </div>
      </div>
      <Table
        headers={['Guest', 'Reservation', 'Room', 'Stay dates', 'Source', 'Status', '']}
        empty={!filtered.length}
      >
        {filtered.slice(page * 12, (page + 1) * 12).map((r) => (
          <tr key={r.id}>
            <td>
              <button className="h-person" onClick={() => onSelect(r)}>
                <Avatar name={r.guest_name} />
                <span>
                  <b>
                    {r.guest_name}
                    {r.vip === 1 && <Star size={10} />}
                  </b>
                  <small>
                    {r.adults} adult{r.adults > 1 ? 's' : ''}
                    {r.children > 0 ? ` · ${r.children} child` : ''}
                  </small>
                </span>
              </button>
            </td>
            <td>
              <span className="h-mono">{r.id}</span>
            </td>
            <td>
              <b>{r.room_number}</b>
              <small className="h-cell-small">{r.type_name}</small>
            </td>
            <td>
              {dateFormat(r.arrival)} – {dateFormat(r.departure)}
            </td>
            <td>
              <span className="h-source">{r.source}</span>
            </td>
            <td>
              <Status>{r.status}</Status>
            </td>
            <td>
              <button className="h-small-action" onClick={() => onSelect(r)}>
                {frontdesk && r.status === 'Confirmed' ? 'Check in' : 'View stay'}
                <ArrowUpRight size={12} />
              </button>
            </td>
          </tr>
        ))}
      </Table>
      <div className="h-pagination">
        <span>
          {filtered.length} reservations <i>·</i> Showing up to 12 per page
        </span>
        <div>
          <Button
            variant="text"
            icon={Download}
            onClick={() =>
              download(
                'hospitality-reservations',
                filtered.map(
                  ({ id, guest_name, room_number, arrival, departure, source, status }) => ({
                    id,
                    guest_name,
                    room_number,
                    arrival,
                    departure,
                    source,
                    status,
                  }),
                ),
              )
            }
          >
            Export CSV
          </Button>
          <button
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            aria-label="Next page"
            disabled={(page + 1) * 12 >= filtered.length}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </Panel>
  );
}
export function RoomList({ data, onSelect, onEditRate }) {
  const [q, setQ] = useState(''),
    [roomTab, setRoomTab] = useState('Room inventory'),
    [status, setStatus] = useState('All rooms'),
    [page, setPage] = useState(0);
  const filtered = data.rooms.filter(
    (r) =>
      (r.number + ' ' + r.type_name + ' ' + r.property_name)
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (status === 'All rooms' ||
        (status === 'Available' &&
          !r.occupied_by &&
          r.cleaning === 'Inspected' &&
          r.maintenance === 'Good') ||
        (status === 'Occupied' && r.occupied_by) ||
        status === r.cleaning ||
        status === r.maintenance),
  );
  return (
    <>
      <Tabs tabs={['Room inventory', 'Room types & rates']} value={roomTab} onChange={setRoomTab} />
      {roomTab === 'Room types & rates' ? (
        <Panel
          title="Room-type rates"
          subtitle="Base rates affect new bookings. Existing reservations retain their agreed rate."
        >
          <Table headers={['Property', 'Room type', 'Capacity', 'Base nightly rate', 'Actions']}>
            {data.types.map((t) => (
              <tr key={t.id}>
                <td>{data.properties.find((p) => p.id === t.property_id)?.name}</td>
                <td>{t.name}</td>
                <td>
                  {t.adults} adults · {t.children} children
                </td>
                <td>{money(t.base_rate)}</td>
                <td>
                  {['owner', 'gm'].includes(data.user.role) && (
                    <button className="h-small-action" onClick={() => onEditRate(t)}>
                      Edit rate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </Panel>
      ) : (
        <>
          <div className="h-room-stats">
            {[
              ['All rooms', data.rooms.length, BedDouble],
              [
                'Available',
                data.rooms.filter(
                  (r) => !r.occupied_by && r.cleaning === 'Inspected' && r.maintenance === 'Good',
                ).length,
                Check,
              ],
              ['Occupied', data.rooms.filter((r) => r.occupied_by).length, Building2],
              ['Dirty', data.rooms.filter((r) => r.cleaning === 'Dirty').length, Clock3],
            ].map(([label, n, Icon]) => (
              <button
                key={label}
                className={status === label ? 'active' : ''}
                onClick={() => {
                  setStatus(label);
                  setPage(0);
                }}
              >
                <span>
                  <Icon size={19} />
                </span>
                <div>
                  <b>{n}</b>
                  <small>{label}</small>
                </div>
              </button>
            ))}
          </div>
          <Panel>
            <div className="h-room-toolbar">
              <div>
                <h2>Room inventory</h2>
                <p>Every room, thoughtfully managed.</p>
              </div>
              <SearchField
                value={q}
                onChange={(v) => {
                  setQ(v);
                  setPage(0);
                }}
                placeholder="Find room, type or property…"
                label="Search rooms"
              />
            </div>
            <div className="h-rooms-grid">
              {filtered.slice(page * 12, (page + 1) * 12).map((r) => (
                <button className="h-room-card" key={r.id} onClick={() => onSelect(r)}>
                  <div className="h-room-image">
                    <img
                      src="/hospitality/deluxe-room.png"
                      alt="Illustrative contemporary hotel bedroom"
                    />
                    <span>
                      {r.occupied_by
                        ? 'Occupied'
                        : r.maintenance !== 'Good'
                          ? 'Out of order'
                          : 'Vacant'}
                    </span>
                    <b>{r.number}</b>
                  </div>
                  <div className="h-room-card-info">
                    <div>
                      <h3>{r.type_name}</h3>
                      <ArrowUpRight size={17} />
                    </div>
                    <p>{r.property_name}</p>
                    <div className="h-room-meta">
                      <span>
                        <BedDouble size={12} />
                        {r.bed}
                      </span>
                      <span>{r.area} m²</span>
                    </div>
                    <footer>
                      <Status>{r.cleaning}</Status>
                      <span>
                        {money(r.base_rate)} <small>/ night</small>
                      </span>
                    </footer>
                  </div>
                </button>
              ))}
            </div>
            {!filtered.length && <Empty />}
            <div className="h-pagination">
              <span>{filtered.length} physical rooms · Illustrative demo photography</span>
              <div>
                <button
                  aria-label="Previous rooms page"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  aria-label="Next rooms page"
                  disabled={(page + 1) * 12 >= filtered.length}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
export function RoomDetail({ room, data, onBack, onBooking, onMaintenance, onFolio }) {
  const [tab, setTab] = useState('Overview');
  const stays = data.reservations.filter((r) => r.room_id === room.id);
  return (
    <>
      <div className="h-detail-heading">
        <button onClick={onBack} className="h-back">
          <ChevronLeft size={16} />
          Room inventory
        </button>
        <h1>
          Room {room.number} <span>{room.type_name}</span>
          <Status>{room.occupied_by ? 'In house' : room.cleaning}</Status>
        </h1>
        <p>
          {room.property_name} <i>·</i> {room.building} <i>·</i> {room.floor}
        </p>
      </div>
      <Tabs tabs={['Overview', 'Amenities', 'Stay history']} value={tab} onChange={setTab} />
      {tab === 'Overview' ? (
        <div className="h-room-detail-grid">
          <section className="h-room-photos">
            <img src="/hospitality/deluxe-room.png" alt="Illustrative deluxe hotel bedroom" />
            <div className="h-photo-caption">
              <span>YOUR SPACE, THOUGHTFULLY CONSIDERED.</span>
              <small>Illustrative demo room photography</small>
            </div>
          </section>
          <Panel title="Room information">
            <dl className="h-definition">
              {[
                ['Room number', room.number],
                ['Room type', room.type_name],
                ['Building', room.building],
                ['Floor', room.floor],
                ['Area', `${room.area} m² · ${Math.round(room.area * 10.764)} sq ft`],
                ['Bed configuration', room.bed],
                ['Capacity', `${room.adults} adults · ${room.children} children`],
                ['View', room.view],
                ['Smoking policy', 'Non-smoking'],
                ['Standard rate', money(room.base_rate)],
                ['Occupancy', room.occupied_by ? 'Occupied' : 'Vacant'],
              ].map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Readiness & actions" className="h-room-actions">
            <div>
              <span>Housekeeping</span>
              <Status>{room.cleaning}</Status>
            </div>
            <div>
              <span>Maintenance</span>
              <Status>{room.maintenance}</Status>
            </div>
            <div className="h-room-info-note">
              <ShieldCheck size={19} />
              <p>
                Room readiness requires a supervisor’s inspection. Cleaning completion alone does
                not release the room.
              </p>
            </div>
            {canDesk(data.user) && (
              <Button
                icon={Plus}
                onClick={() => onBooking({ room_id: room.id, property_id: room.property_id })}
              >
                Create reservation
              </Button>
            )}
            {room.occupied_by && canDesk(data.user) && (
              <Button
                variant="secondary"
                icon={FileText}
                onClick={() => onFolio(data.reservations.find((r) => r.id === room.occupied_by))}
              >
                Open guest folio
              </Button>
            )}
            {['owner', 'gm'].includes(data.user.role) && (
              <Button
                variant="secondary"
                onClick={() => onMaintenance(room.maintenance === 'Good' ? 'Out of order' : 'Good')}
              >
                {room.maintenance === 'Good' ? 'Mark out of order' : 'Restore maintenance status'}
              </Button>
            )}
          </Panel>
        </div>
      ) : tab === 'Amenities' ? (
        <Panel
          title="Room-type amenities"
          subtitle="Standard amenities inherited from the room type."
        >
          <div className="h-amenities">
            {JSON.parse(room.amenities).map((a) => (
              <span key={a}>
                <Check size={15} />
                {a}
              </span>
            ))}
          </div>
          <div className="h-info">
            Room-specific exceptions, warranty and asset registers will be added in a later
            development cycle.
          </div>
        </Panel>
      ) : (
        <Panel title="Reservation history" subtitle="Stays in the loaded reporting window">
          <Table headers={['Guest', 'Arrival', 'Departure', 'Status', '']} empty={!stays.length}>
            {stays.map((r) => (
              <tr key={r.id}>
                <td>{r.guest_name}</td>
                <td>{dateFormat(r.arrival)}</td>
                <td>{dateFormat(r.departure)}</td>
                <td>
                  <Status>{r.status}</Status>
                </td>
                <td>
                  <button className="h-text-button" onClick={() => onFolio(r)}>
                    View stay
                    <ArrowUpRight size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        </Panel>
      )}
    </>
  );
}
export function Housekeeping({ data, onAction, onCreate }) {
  const [q, setQ] = useState(''),
    [tab, setTab] = useState('Open tasks');
  const tasks = data.tasks.filter(
    (t) =>
      (t.room_number + ' ' + t.attendant + ' ' + t.title).toLowerCase().includes(q.toLowerCase()) &&
      (tab === 'All tasks' ||
        (tab === 'Open tasks' && t.status !== 'Completed') ||
        (tab === 'Awaiting inspection' && t.status === 'Awaiting inspection') ||
        (tab === 'Completed' && t.status === 'Completed')),
  );
  return (
    <>
      <div className="h-housekeeping-stats">
        {[
          ['Pending', 'amber', Clock3],
          ['In progress', 'blue', Clock3],
          ['Awaiting inspection', 'purple', ClipboardCheck],
          ['Completed', 'green', Check],
        ].map(([s, tone, Icon]) => (
          <div key={s}>
            <span className={tone}>
              <Icon size={20} />
            </span>
            <div>
              <b>{data.tasks.filter((t) => t.status === s).length}</b>
              <small>{s}</small>
            </div>
          </div>
        ))}
      </div>
      <Panel>
        <div className="h-table-toolbar">
          <Tabs
            tabs={['Open tasks', 'Awaiting inspection', 'Completed', 'All tasks']}
            value={tab}
            onChange={setTab}
          />
          <SearchField
            value={q}
            onChange={setQ}
            placeholder="Room or attendant…"
            label="Search housekeeping"
          />
        </div>
        <Table
          headers={['Room', 'Task', 'Attendant', 'Priority', 'Room state', 'Task status', 'Action']}
          empty={!tasks.length}
        >
          {tasks.map((t) => (
            <tr key={t.id}>
              <td>
                <b>{t.room_number}</b>
                <small className="h-cell-small">
                  {data.properties.find((p) => p.id === t.property_id)?.code}
                </small>
              </td>
              <td>{t.title}</td>
              <td>
                <div className="h-person">
                  <Avatar name={t.attendant} />
                  <span>{t.attendant}</span>
                </div>
              </td>
              <td>
                <span className={'h-priority ' + (t.priority === 'High' ? 'high' : '')}>
                  {t.priority}
                </span>
              </td>
              <td>
                <Status>{t.cleaning}</Status>
              </td>
              <td>
                <Status>{t.status}</Status>
              </td>
              <td>
                {t.status === 'Pending' && (
                  <button className="h-small-action" onClick={() => onAction(t, 'start')}>
                    Start cleaning
                  </button>
                )}
                {t.status === 'In progress' && (
                  <button className="h-small-action" onClick={() => onAction(t, 'complete')}>
                    Finish cleaning
                  </button>
                )}
                {t.status === 'Awaiting inspection' &&
                  (['owner', 'gm'].includes(data.user.role) ? (
                    <button className="h-small-action green" onClick={() => onAction(t, 'inspect')}>
                      Inspect & release
                    </button>
                  ) : (
                    <span className="h-subtle-label">Manager inspection needed</span>
                  ))}
                {t.status === 'Completed' && (
                  <span className="h-subtle-label">Inspection recorded</span>
                )}
              </td>
            </tr>
          ))}
        </Table>
        <div className="h-panel-foot">
          Inspection-required property policy is enforced by the server.
        </div>
      </Panel>
    </>
  );
}
export function Guests({ data, onSelect }) {
  const [q, setQ] = useState(''),
    [page, setPage] = useState(0);
  const guests = data.guests.filter((g) =>
    (g.name + ' ' + (g.email || '')).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <Panel
      title="Guest directory"
      subtitle="Thoughtful service starts with knowing your guests."
      action={
        <SearchField
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(0);
          }}
          placeholder="Search your guests…"
          label="Search guests"
        />
      }
    >
      <Table headers={['Guest', 'Contact', 'Preferences', 'Consent', '']} empty={!guests.length}>
        {guests.slice(page * 15, (page + 1) * 15).map((g) => (
          <tr key={g.id}>
            <td>
              <button className="h-person" onClick={() => onSelect(g)}>
                <Avatar name={g.name} />
                <span>
                  <b>
                    {g.name}
                    {g.vip === 1 && <Star size={11} />}
                  </b>
                  <small>{g.country}</small>
                </span>
              </button>
            </td>
            <td>
              {g.email || 'Restricted'}
              <small className="h-cell-small">{g.phone}</small>
            </td>
            <td>{g.preferences || 'No preferences recorded'}</td>
            <td>
              <span className="h-source">{g.consent ? 'Recorded' : 'Not recorded'}</span>
            </td>
            <td>
              <button
                className="h-icon-button"
                aria-label={'View ' + g.name}
                onClick={() => onSelect(g)}
              >
                <ArrowUpRight size={16} />
              </button>
            </td>
          </tr>
        ))}
      </Table>
      <div className="h-pagination">
        <span>{guests.length} guests visible to your properties</span>
        <div>
          <button
            aria-label="Previous guests"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            aria-label="Next guests"
            disabled={(page + 1) * 15 >= guests.length}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </Panel>
  );
}
export function PropertyPortfolio({ data, onProperty, onEdit }) {
  return (
    <div className="h-properties-grid">
      {data.properties.map((p, i) => {
        const rooms = data.rooms.filter((r) => r.property_id === p.id),
          report = data.byProperty.find((r) => r.id === p.id);
        return (
          <Panel key={p.id} className="h-property-card">
            <div className={'h-property-art art' + i}>
              <span className="h-property-art-code">{p.code}</span>
              <Building2 size={60} strokeWidth={1} />
              <span>{p.city.toUpperCase()}</span>
            </div>
            <div className="h-property-body">
              <span className="h-eyebrow">{p.code} · INDIA COLLECTION</span>
              <h2>{p.name}</h2>
              <p>
                <MapPin size={13} />
                {p.city}, {p.country}
              </p>
              <div className="h-property-totals">
                <span>
                  <b>{report?.roomCount ?? rooms.length}</b>
                  <small>Physical rooms</small>
                </span>
                <span>
                  <b>{report?.occupancy?.toFixed(1) || '0'}%</b>
                  <small>Occupancy</small>
                </span>
                <span>
                  <b>{p.currency}</b>
                  <small>Currency</small>
                </span>
              </div>
              <div className="h-property-policies">
                <span>
                  Check-in <b>{p.check_in_time}</b>
                </span>
                <span>
                  Checkout <b>{p.check_out_time}</b>
                </span>
                <span>
                  Timezone <b>{p.timezone}</b>
                </span>
              </div>
              {canFinance(data.user) && ['owner', 'gm'].includes(data.user.role) && (
                <Button variant="secondary" onClick={() => onEdit(p)}>
                  Property settings
                </Button>
              )}
              <Button variant="secondary" icon={ArrowUpRight} onClick={() => onProperty(p.id)}>
                Explore property
              </Button>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
export function Finance({ data, onFolio }) {
  const [dept, setDept] = useState('All'),
    [q, setQ] = useState('');
  const entries = data.entries.filter(
    (e) =>
      (dept === 'All' || e.department === dept) &&
      (e.guest_name + ' ' + e.description + ' ' + e.id).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="h-info prominent">
        <ShieldCheck size={20} />
        <div>
          <b>Operational ledger · Foundation release</b>
          <p>
            Append-only guest postings reconcile to dashboard revenue. Full general ledger,
            OPEX/CAPEX, GOP, tax invoices and statutory reporting are scheduled for the accounting
            phase.
          </p>
        </div>
      </div>
      <Panel
        title="Revenue & folio source records"
        subtitle={`Latest ${data.entries.length} entries of ${data.metrics.entryCount} in the selected period. Amounts in INR; revenue excludes tax.`}
        action={
          <Button
            variant="secondary"
            icon={Download}
            onClick={() => download('hospitality-folio-ledger', entries)}
          >
            Export visible entries
          </Button>
        }
      >
        <div className="h-ledger-filters">
          <SearchField
            value={q}
            onChange={setQ}
            label="Search financial entries"
            placeholder="Description, guest or reference…"
          />
          <select
            aria-label="Ledger department"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
          >
            {['All', 'Rooms', 'F&B', 'Spa', 'Banquets', 'Other', 'Front office'].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <Table
          headers={[
            'Date',
            'Reference',
            'Description',
            'Department',
            'Debit',
            'Credit',
            'Net revenue',
            '',
          ]}
          empty={!entries.length}
        >
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{dateFormat(e.business_date)}</td>
              <td className="h-mono">{e.id}</td>
              <td>
                <b>{e.description}</b>
                <small className="h-cell-small">
                  {e.guest_name} · Room {e.room_number}
                </small>
              </td>
              <td>{e.department}</td>
              <td>{e.debit ? money(e.debit) : '—'}</td>
              <td>{e.credit ? money(e.credit) : '—'}</td>
              <td>{e.net ? money(e.net) : '—'}</td>
              <td>
                <button
                  className="h-icon-button"
                  aria-label="Open source folio"
                  onClick={() => onFolio({ id: e.reservation_id, guest_name: e.guest_name })}
                >
                  <ArrowUpRight size={15} />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
