import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, GripVertical } from 'lucide-react';
import { Button, SearchField, Status } from './ui';
import { dateAdd, dateFormat, canDesk } from './lib';
export default function BookingCalendar({ data, onSelect, onCreate, onMove, onRangeChange }) {
  const [start, setStart] = useState(data.today),
    [view, setView] = useState('Week'),
    [type, setType] = useState('All room types'),
    [status, setStatus] = useState('All statuses'),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(0);
  const length = view === 'Day' ? 1 : view === 'Week' ? 7 : 30,
    cell = view === 'Day' ? 500 : view === 'Week' ? 77 : 44;
  const dates = Array.from({ length }, (_, i) => dateAdd(start, i)),
    end = dateAdd(start, length);
  useEffect(() => {
    onRangeChange?.({ from: start, to: end });
  }, [start, length]);
  const rooms = data.rooms.filter(
    (r) =>
      (type === 'All room types' || r.type_name === type) &&
      (r.number + ' ' + r.property_name).toLowerCase().includes(query.toLowerCase()),
  );
  const shown = rooms.slice(page * 20, (page + 1) * 20),
    canEdit = canDesk(data.user);
  function drop(e, room, date) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain'),
      reservation = data.reservations.find((r) => r.id === id);
    if (!reservation) return;
    const duration = Math.round(
      (Date.parse(reservation.departure) - Date.parse(reservation.arrival)) / 86400000,
    );
    onMove(reservation, { room_id: room.id, arrival: date, departure: dateAdd(date, duration) });
  }
  return (
    <section className="h-panel h-calendar-panel">
      <div className="h-calendar-toolbar">
        <div className="h-calendar-dates">
          <button
            className="h-icon-button"
            aria-label="Previous dates"
            onClick={() => {
              setStart(dateAdd(start, -length));
              setPage(0);
            }}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            className="h-icon-button"
            aria-label="Next dates"
            onClick={() => {
              setStart(dateAdd(start, length));
              setPage(0);
            }}
          >
            <ChevronRight size={17} />
          </button>
          <span>
            <CalendarDays size={14} />
            {dateFormat(start)} –{' '}
            {dateFormat(dateAdd(end, -1), { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <input
            className="h-calendar-jump"
            aria-label="Calendar start date"
            type="date"
            value={start}
            onChange={(e) => {
              if (e.target.value) {
                setStart(e.target.value);
                setPage(0);
              }
            }}
          />
          <button className="h-text-button" onClick={() => setStart(data.today)}>
            Today
          </button>
        </div>
        <div className="h-segmented">
          {['Day', 'Week', 'Month'].map((v) => (
            <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="h-calendar-filters">
        <select
          aria-label="Filter calendar room type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(0);
          }}
        >
          {['All room types', ...new Set(data.types.map((t) => t.name))].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          aria-label="Filter booking status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {['All statuses', 'Confirmed', 'In house', 'Checked out', 'Cancelled'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <SearchField
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPage(0);
          }}
          placeholder="Find a room…"
          label="Find a calendar room"
        />
        <span className="h-subtle-label">
          {canEdit
            ? 'Drag a stay to move it · Server validates availability'
            : 'View-only calendar for your role'}
        </span>
      </div>
      <div className="h-calendar-scroll">
        <div style={{ minWidth: 190 + length * cell }}>
          <div className="h-calendar-header">
            <div className="h-room-label">
              ROOMS <span>{rooms.length}</span>
            </div>
            <div
              className="h-date-columns"
              style={{ gridTemplateColumns: `repeat(${length},minmax(${cell}px,1fr))` }}
            >
              {dates.map((d) => (
                <div key={d} className={d === data.today ? 'today' : ''}>
                  <small>{dateFormat(d, { weekday: 'short' })}</small>
                  <b>{dateFormat(d, { day: '2-digit' })}</b>
                  <span>{dateFormat(d, { month: 'short' })}</span>
                </div>
              ))}
            </div>
          </div>
          {shown.map((room, index) => {
            const reservations = data.reservations.filter(
              (r) =>
                r.room_id === room.id &&
                r.arrival < end &&
                r.departure > start &&
                (status === 'All statuses' ? r.status !== 'Cancelled' : r.status === status),
            );
            return (
              <React.Fragment key={room.id}>
                {(index === 0 ||
                  shown[index - 1].type_name !== room.type_name ||
                  shown[index - 1].property_id !== room.property_id) && (
                  <div className="h-room-group">
                    <b>{room.type_name}</b>
                    <span>{room.property_name}</span>
                  </div>
                )}
                <div className="h-calendar-row">
                  <button
                    className="h-room-label"
                    onClick={() =>
                      canEdit &&
                      onCreate({ room_id: room.id, property_id: room.property_id, arrival: start })
                    }
                  >
                    <span>
                      <b>{room.number}</b>
                      <small>{room.floor}</small>
                    </span>
                    <i
                      className={
                        room.occupied_by
                          ? 'occupied'
                          : room.maintenance !== 'Good'
                            ? 'blocked'
                            : 'available'
                      }
                    />
                  </button>
                  <div
                    className="h-calendar-track"
                    style={{ flex: 1, backgroundSize: `${100 / length}% 100%` }}
                  >
                    {dates.map((date, i) => (
                      <div
                        key={date}
                        className={'h-calendar-cell ' + (date === data.today ? 'today' : '')}
                        style={{ left: `${(i / length) * 100}%`, width: `${100 / length}%` }}
                        onDoubleClick={() =>
                          canEdit &&
                          onCreate({
                            room_id: room.id,
                            property_id: room.property_id,
                            arrival: date,
                          })
                        }
                        onDragOver={(e) => {
                          if (canEdit) e.preventDefault();
                        }}
                        onDrop={(e) => drop(e, room, date)}
                      />
                    ))}
                    {reservations.map((r) => {
                      const offset = Math.max(
                          0,
                          Math.round((Date.parse(r.arrival) - Date.parse(start)) / 86400000),
                        ),
                        span = Math.max(
                          1,
                          Math.round(
                            (Date.parse(r.departure > end ? end : r.departure) -
                              Date.parse(r.arrival < start ? start : r.arrival)) /
                              86400000,
                          ),
                        );
                      return (
                        <button
                          key={r.id}
                          draggable={canEdit && r.status === 'Confirmed'}
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', r.id)}
                          onClick={() => onSelect(r)}
                          className={
                            'h-booking-bar ' +
                            {
                              Confirmed: 'confirmed',
                              'In house': 'inhouse',
                              'Checked out': 'departed',
                              Cancelled: 'cancelled',
                            }[r.status]
                          }
                          style={{
                            left: `calc(${(offset / length) * 100}% + 4px)`,
                            width: `calc(${(span / length) * 100}% - 8px)`,
                          }}
                          title={`${r.guest_name} · ${r.status} · ${r.arrival} to ${r.departure}`}
                        >
                          <span>{r.guest_name}</span>
                          <small>
                            {r.adults} adults · {r.source}
                          </small>
                        </button>
                      );
                    })}
                    {data.roomBlocks
                      ?.filter(
                        (b) => b.room_id === room.id && b.start_date < end && b.end_date > start,
                      )
                      .map((b) => {
                        const offset = Math.max(
                            0,
                            (Date.parse(b.start_date) - Date.parse(start)) / 86400000,
                          ),
                          span =
                            (Date.parse(b.end_date > end ? end : b.end_date) -
                              Date.parse(b.start_date < start ? start : b.start_date)) /
                            86400000;
                        return (
                          <div
                            key={b.id}
                            className="h-maintenance-bar"
                            style={{
                              left: `calc(${(offset / length) * 100}% + 4px)`,
                              width: `calc(${(span / length) * 100}% - 8px)`,
                            }}
                          >
                            {b.reason}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <div className="h-calendar-footer">
        <div className="h-calendar-key">
          <span>
            <i className="blue" />
            Confirmed
          </span>
          <span>
            <i className="green" />
            In house
          </span>
          <span>
            <i className="purple" />
            Departed
          </span>
          <span>
            <i className="gray" />
            Maintenance
          </span>
        </div>
        <div>
          <span>
            {rooms.length ? `${page * 20 + 1}–${Math.min((page + 1) * 20, rooms.length)}` : '0'} of{' '}
            {rooms.length} rooms
          </span>
          <button
            aria-label="Previous rooms"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            aria-label="Next rooms"
            disabled={(page + 1) * 20 >= rooms.length}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <div className="h-calendar-note">
        Calendar navigation loads the selected dates from the local hub. Use the global custom date
        range to browse older or later inventory. Double-click an empty date cell to start a
        reservation.
      </div>
    </section>
  );
}
