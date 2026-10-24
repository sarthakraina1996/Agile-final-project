import { addDays, nights, financialRoles } from './utils.js';
const sum = (xs, key) => xs.reduce((n, x) => n + Number(x[key] || 0), 0);
export function metrics(db, ids, from, to, role) {
  const params = JSON.stringify(ids);
  const reservations = db
    .prepare(
      "SELECT * FROM reservations WHERE property_id IN (SELECT value FROM json_each(?)) AND status IN ('In house','Checked out') AND arrival<? AND departure>?",
    )
    .all(params, to, from);
  const roomCount = db
    .prepare(
      'SELECT COUNT(*) AS n FROM rooms WHERE property_id IN (SELECT value FROM json_each(?))',
    )
    .get(params).n;
  const blocks = db
    .prepare(
      'SELECT * FROM room_blocks WHERE property_id IN (SELECT value FROM json_each(?)) AND start_date<? AND end_date>?',
    )
    .all(params, to, from);
  const soldNights = reservations.reduce(
    (s, r) => s + nights(r.arrival < from ? from : r.arrival, r.departure > to ? to : r.departure),
    0,
  );
  const blockedNights = blocks.reduce(
      (s, r) =>
        s + nights(r.start_date < from ? from : r.start_date, r.end_date > to ? to : r.end_date),
      0,
    ),
    availableNights = Math.max(0, roomCount * nights(from, to) - blockedNights);
  const financial = financialRoles.includes(role);
  const entries = financial
    ? db
        .prepare(
          'SELECT * FROM folio_entries WHERE property_id IN (SELECT value FROM json_each(?)) AND business_date>=? AND business_date<?',
        )
        .all(params, from, to)
    : [];
  const revenue = sum(entries, 'net'),
    roomRevenue = sum(
      entries.filter((e) => e.department === 'Rooms'),
      'net',
    );
  const departments = ['Rooms', 'F&B', 'Spa', 'Banquets', 'Other'].map((name) => ({
    name,
    value: sum(
      entries.filter((e) => e.department === name),
      'net',
    ),
  }));
  const trend = [];
  const bucket = Math.max(1, Math.ceil(nights(from, to) / 12));
  for (let d = from; d < to; d = addDays(d, bucket)) {
    const end = addDays(d, bucket);
    trend.push({
      date: d,
      ...Object.fromEntries(
        departments.map(({ name }) => [
          name,
          sum(
            entries.filter(
              (e) => e.department === name && e.business_date >= d && e.business_date < end,
            ),
            'net',
          ),
        ]),
      ),
    });
  }
  return {
    from,
    to,
    roomCount,
    soldNights,
    availableNights,
    occupancy: availableNights ? (soldNights / availableNights) * 100 : null,
    financial,
    revenue: financial ? revenue : null,
    roomRevenue: financial ? roomRevenue : null,
    adr: financial && soldNights ? roomRevenue / soldNights : null,
    revpar: financial && availableNights ? roomRevenue / availableNights : null,
    trevpar: financial && availableNights ? revenue / availableNights : null,
    departments,
    trend,
    entryCount: entries.length,
  };
}
