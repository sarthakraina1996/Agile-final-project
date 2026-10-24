import React, { useState, useRef } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Modal, Button } from './ui';
import { dateAdd, money } from './lib';
export function BookingForm({ workspace, onClose, onSave, initial = {} }) {
  const defaults = workspace.properties[0]?.id;
  const [values, setValues] = useState({
    property_id: initial.property_id || defaults,
    guest_name: '',
    email: '',
    phone: '',
    room_id: initial.room_id || '',
    arrival: initial.arrival || workspace.today,
    departure: initial.departure || dateAdd(workspace.today, 2),
    adults: 2,
    children: 0,
    source: 'Direct',
    notes: '',
    consent: false,
    rate_plan_id: '',
  });
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const set = (key, value) =>
    setValues((v) => ({
      ...v,
      [key]: value,
      ...(key === 'property_id' ? { room_id: '', rate_plan_id: '' } : {}),
    }));
  const rooms = workspace.rooms.filter(
    (r) => r.property_id === values.property_id && r.maintenance === 'Good',
  );
  const selected = rooms.find((r) => r.id === values.room_id);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        ...values,
        adults: Number(values.adults),
        children: Number(values.children),
        request_id: requestId.current,
        rate_plan_id: values.rate_plan_id || values.property_id + 'bar',
      });
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Create a reservation"
      subtitle="A thoughtful stay starts with the details."
      onClose={onClose}
      wide
    >
      <form className="h-form" onSubmit={submit}>
        <div className="h-form-section">STAY DETAILS</div>
        <div className="h-fields">
          <label>
            Property
            <select
              aria-label="Property"
              value={values.property_id}
              onChange={(e) => set('property_id', e.target.value)}
            >
              {workspace.properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Room
            <select
              aria-label="Room"
              required
              value={values.room_id}
              onChange={(e) => set('room_id', e.target.value)}
            >
              <option value="">Select a room</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.number} · {r.type_name} · {money(r.base_rate)}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Rate plan
            <select
              aria-label="Rate plan"
              value={values.rate_plan_id || values.property_id + 'bar'}
              onChange={(e) => set('rate_plan_id', e.target.value)}
            >
              {workspace.ratePlans
                ?.filter((p) => p.property_id === values.property_id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.includes_breakfast ? ' · breakfast included' : ''}
                    {selected
                      ? ' · ' +
                        money(Math.round((selected.base_rate * p.multiplier) / 10000)) +
                        '/night'
                      : ''}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Arrival
            <input
              aria-label="Arrival"
              required
              type="date"
              value={values.arrival}
              onChange={(e) => set('arrival', e.target.value)}
            />
          </label>
          <label>
            Departure
            <input
              aria-label="Departure"
              required
              type="date"
              value={values.departure}
              min={dateAdd(values.arrival, 1)}
              onChange={(e) => set('departure', e.target.value)}
            />
          </label>
          <label>
            Adults
            <input
              required
              type="number"
              min="1"
              max={selected?.adults || 4}
              value={values.adults}
              onChange={(e) => set('adults', e.target.value)}
            />
          </label>
          <label>
            Children
            <input
              required
              type="number"
              min="0"
              max={selected?.children || 2}
              value={values.children}
              onChange={(e) => set('children', e.target.value)}
            />
          </label>
        </div>
        <div className="h-form-section">LEAD GUEST</div>
        <div className="h-fields">
          <label>
            Full name
            <input
              aria-label="Full name"
              required
              value={values.guest_name}
              onChange={(e) => set('guest_name', e.target.value)}
              placeholder="Guest’s full name"
            />
          </label>
          <label>
            Email address
            <input
              aria-label="Email address"
              type="email"
              value={values.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="guest@example.com"
            />
          </label>
          <label>
            Phone
            <input
              value={values.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="Include country code"
            />
          </label>
          <label>
            Booking source
            <select
              aria-label="Booking source"
              value={values.source}
              onChange={(e) => set('source', e.target.value)}
            >
              {[
                'Direct',
                'Website',
                'Booking.com',
                'Expedia',
                'Corporate',
                'Travel agent',
                'Walk-in',
                'Group',
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="full">
            Special requests
            <textarea
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="Anything we should know?"
            />
          </label>
        </div>
        <label className="h-checkbox">
          <input
            type="checkbox"
            checked={values.consent}
            onChange={(e) => set('consent', e.target.checked)}
          />
          Guest has provided contact-data consent
        </label>
        <div className="h-info">
          The room-type rate is used. Availability and capacity are validated by the server before
          confirmation.
        </div>
        {error && (
          <div className="h-error" role="alert">
            {error}
          </div>
        )}
        <footer>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" icon={Check} disabled={busy}>
            {busy ? 'Confirming…' : 'Confirm reservation'}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
export function PostingForm({ reservation, kind, onClose, onSave, entry }) {
  const [values, setValues] = useState({
      description:
        kind === 'payment'
          ? 'Stay settlement'
          : kind === 'reversal'
            ? 'Correction: '
            : 'Room charge',
      department: 'Rooms',
      method: 'Cash',
      amount: kind === 'payment' ? (reservation.balance / 100).toFixed(2) : '',
    }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        ...values,
        amount: Math.round(Number(values.amount) * 100),
        kind,
        reversal_of: entry?.id,
        request_id: requestId.current,
      });
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        kind === 'payment'
          ? 'Record a payment'
          : kind === 'reversal'
            ? 'Reverse a posting'
            : 'Post a charge'
      }
      subtitle={reservation.guest_name + ' · ' + reservation.id}
      onClose={onClose}
    >
      <form className="h-form" onSubmit={submit}>
        <div className="h-fields">
          <label className="full">
            {kind === 'reversal' ? 'Reason for reversal' : 'Description'}
            <input
              aria-label="Description"
              required
              value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
            />
          </label>
          {kind !== 'reversal' && (
            <label>
              Amount (INR{kind === 'charge' ? ', before tax' : ''})
              <input
                aria-label="Amount"
                required
                type="number"
                min="0.01"
                step="0.01"
                value={values.amount}
                onChange={(e) => setValues({ ...values, amount: e.target.value })}
              />
            </label>
          )}
          {kind === 'charge' && (
            <label>
              Department
              <select
                aria-label="Department"
                value={values.department}
                onChange={(e) => setValues({ ...values, department: e.target.value })}
              >
                {['Rooms', 'F&B', 'Spa', 'Banquets', 'Other'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          )}
          {kind === 'payment' && (
            <label>
              Payment method
              <select
                aria-label="Payment method"
                value={values.method}
                onChange={(e) => setValues({ ...values, method: e.target.value })}
              >
                {['Cash', 'UPI', 'Bank transfer', 'Recorded external payment'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="h-info">
          {kind === 'payment'
            ? 'Records a payment already received. No bank transfer is initiated and no card credentials are collected.'
            : kind === 'reversal'
              ? 'The original stays immutable. A linked, opposite entry will be added.'
              : 'Property demonstration tax configuration is applied. This is not a jurisdiction-certified tax invoice.'}
        </div>
        {error && (
          <div className="h-error" role="alert">
            {error}
          </div>
        )}
        <footer>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" icon={Check} disabled={busy}>
            {busy ? 'Saving…' : 'Save posting'}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
export function MoveForm({ reservation, rooms, onClose, onSave }) {
  const [room, setRoom] = useState(reservation.room_id),
    [arrival, setArrival] = useState(reservation.arrival),
    [departure, setDeparture] = useState(reservation.departure),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({ room_id: room, arrival, departure });
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Move or amend a stay"
      subtitle="Changes are checked against live room inventory."
      onClose={onClose}
    >
      <form className="h-form" onSubmit={submit}>
        <div className="h-fields">
          <label className="full">
            Room
            <select aria-label="New room" value={room} onChange={(e) => setRoom(e.target.value)}>
              {rooms
                .filter(
                  (r) =>
                    r.property_id === reservation.property_id && r.type_id === reservation.type_id,
                )
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.number} · {r.type_name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Arrival
            <input
              type="date"
              required
              value={arrival}
              onChange={(e) => setArrival(e.target.value)}
            />
          </label>
          <label>
            Departure
            <input
              type="date"
              required
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
            />
          </label>
        </div>
        {error && (
          <div className="h-error" role="alert">
            {error}
          </div>
        )}
        <footer>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy} icon={Check}>
            Save changes
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
export function MasterForm({ kind, record, onClose, onSave }) {
  const property = kind === 'property';
  const [values, setValues] = useState(
    property
      ? {
          name: record.name,
          legal_entity: record.legal_entity,
          city: record.city,
          tax_rate: record.tax_rate / 100,
          check_in_time: record.check_in_time,
          check_out_time: record.check_out_time,
        }
      : { base_rate: record.base_rate / 100 },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const fields = property
    ? [
        ['name', 'Property name'],
        ['legal_entity', 'Legal entity'],
        ['city', 'City'],
        ['tax_rate', 'Demonstration tax rate (%)', 'number'],
        ['check_in_time', 'Check-in time', 'time'],
        ['check_out_time', 'Checkout time', 'time'],
      ]
    : [['base_rate', 'Base nightly rate (INR)', 'number']];
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave(
        property
          ? { ...values, tax_rate: Math.round(Number(values.tax_rate) * 100) }
          : { base_rate: Math.round(Number(values.base_rate) * 100) },
      );
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={property ? 'Property configuration' : 'Update room-type rate'}
      subtitle={property ? record.name : record.name + ' · Applies to future bookings'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="h-form">
        <div className="h-fields">
          {fields.map(([key, label, type = 'text']) => (
            <label key={key} className={!property ? 'full' : ''}>
              {label}
              <input
                required
                aria-label={label}
                type={type}
                step={type === 'number' ? '0.01' : undefined}
                min={type === 'number' ? '0' : undefined}
                value={values[key]}
                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <div className="h-info">
          {property
            ? 'Currency and timezone remain INR / Asia-Kolkata for this foundation release. Property tax is a configurable demonstration rule, not statutory certification.'
            : 'Existing bookings keep their agreed nightly rate. The breakfast plan applies a 12% rate supplement.'}
        </div>
        {error && (
          <div className="h-error" role="alert">
            {error}
          </div>
        )}
        <footer>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={Check} type="submit" disabled={busy}>
            Save configuration
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
