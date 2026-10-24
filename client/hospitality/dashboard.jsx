import React from 'react';
import { ArrowUpRight, ArrowRight, Plus, ChevronRight, Star } from 'lucide-react';
import { Kpi, Panel, Table, Status, Avatar, Button, Empty } from './ui';
import { RevenueChart, DepartmentMix } from './charts';
import { money, percent, difference, dateFormat, canFinance, canDesk, canClean } from './lib';

export default function Dashboard({ data, go, onBooking, onReservation, onDrill }) {
  const { metrics: m, previous: p, today, reservations, byProperty } = data;
  const arrivals = reservations.filter((r) => r.arrival === today && r.status === 'Confirmed');
  const departures = reservations.filter((r) => r.departure === today && r.status === 'In house');
  const inhouse = reservations.filter((r) => r.status === 'In house');
  const finances = canFinance(data.user);
  const desk = canDesk(data.user) || data.user.role === 'finance';
  const readiness = ['Inspected', 'Clean', 'Cleaning', 'Dirty'].map((state) => ({
    state,
    count: data.rooms.filter((r) => r.cleaning === state).length,
  }));
  const ready = data.rooms.filter(
    (r) => !r.occupied_by && r.cleaning === 'Inspected' && r.maintenance === 'Good',
  ).length;
  const awaitingInspection = data.tasks.filter((t) => t.status === 'Awaiting inspection').length;

  return (
    <div className="h-overview">
      <div className="h-page-title">
        <div>
          <h1>Executive dashboard</h1>
          <p>
            {dateFormat(today, { weekday: 'long', day: 'numeric', month: 'long' })}
            <span className="h-copy-divider">/</span>
            {byProperty.length} {byProperty.length === 1 ? 'property' : 'properties'}
            <span className="h-copy-divider">/</span>
            {m.roomCount} rooms
          </p>
        </div>
        {canDesk(data.user) && (
          <Button icon={Plus} onClick={() => onBooking()}>
            New reservation
          </Button>
        )}
      </div>
      <div className={'h-kpis ' + (!finances ? 'operational' : '')}>
        {finances && (
          <Kpi
            label="Operating revenue"
            value={money(m.revenue)}
            previous={difference(m.revenue, p.revenue)}
            onClick={() => onDrill('All')}
          />
        )}
        <Kpi
          label="Occupancy"
          value={percent(m.occupancy)}
          previous={difference(m.occupancy, p.occupancy)}
          onClick={() => go('rooms')}
        />
        {finances ? (
          <>
            <Kpi
              label="Average daily rate"
              value={money(m.adr)}
              previous={difference(m.adr, p.adr)}
              onClick={() => onDrill('Rooms')}
            />
            <Kpi
              label="RevPAR"
              value={money(m.revpar)}
              previous={difference(m.revpar, p.revpar)}
              onClick={() => onDrill('Rooms')}
            />
          </>
        ) : (
          <>
            <Kpi
              label="Ready to assign"
              value={ready}
              note="Vacant, inspected rooms"
              onClick={() => go('rooms')}
            />
            <Kpi
              label="Guests in house"
              value={inhouse.length}
              note="Across selected properties"
              onClick={() => go(desk ? 'frontdesk' : 'rooms')}
            />
          </>
        )}
      </div>
      <div className="h-overview-grid">
        <Panel
          className="h-performance-panel"
          title={finances ? 'Revenue performance' : 'Room readiness'}
          subtitle={
            finances
              ? 'Posted revenue, excluding tax'
              : 'Current housekeeping status across selected properties'
          }
          action={
            <span className="h-report-dates">
              {dateFormat(m.from)} —{' '}
              {dateFormat(new Date(Date.parse(m.to) - 86400000).toISOString().slice(0, 10))}
            </span>
          }
        >
          {finances ? (
            <>
              <RevenueChart data={m.trend} />
              <DepartmentMix data={m.departments} onSelect={onDrill} />
            </>
          ) : (
            <div className="h-readiness-detail">
              {readiness.map(({ state, count }) => (
                <div key={state}>
                  <Status>{state}</Status>
                  <div className="h-readiness-track">
                    <span
                      className={state.toLowerCase()}
                      style={{
                        width: `${data.rooms.length ? (count / data.rooms.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel
          className="h-desk-panel"
          title={desk ? 'Front desk today' : 'Housekeeping today'}
          action={<span className="h-date-tag">{dateFormat(today)}</span>}
        >
          <div className="h-daily-counts">
            {(desk
              ? [
                  [arrivals.length, 'Arrivals'],
                  [departures.length, 'Departures'],
                  [inhouse.length, 'In house'],
                ]
              : [
                  [data.tasks.filter((t) => t.status === 'Pending').length, 'Pending'],
                  [data.tasks.filter((t) => t.status === 'In progress').length, 'In progress'],
                  [awaitingInspection, 'To inspect'],
                ]
            ).map(([value, label]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          {desk ? (
            <>
              <div className="h-list-caption">
                <span>Expected arrivals</span>
                <span>Room</span>
              </div>
              <div className="h-arrivals-list">
                {arrivals.slice(0, 4).map((r) => (
                  <button key={r.id} onClick={() => onReservation(r)}>
                    <Avatar name={r.guest_name} />
                    <span>
                      <b>
                        {r.guest_name}
                        {r.vip === 1 && <Star size={11} />}
                      </b>
                      <small>{data.properties.find((p) => p.id === r.property_id)?.name}</small>
                    </span>
                    <span className="h-arrival-room">{r.room_number}</span>
                    <ChevronRight size={14} />
                  </button>
                ))}
                {!arrivals.length && (
                  <Empty
                    title="No arrivals pending"
                    text="All expected arrivals are checked in, or there are none today."
                  />
                )}
              </div>
            </>
          ) : (
            <div className="h-shift-note">
              <strong>{awaitingInspection} rooms awaiting inspection</strong>
              <p>A manager must inspect these rooms before they can be assigned to a guest.</p>
            </div>
          )}
          <button className="h-full-link" onClick={() => go(desk ? 'frontdesk' : 'housekeeping')}>
            {desk ? `View all ${arrivals.length} arrivals` : 'Open housekeeping'}
            <ArrowRight size={15} />
          </button>
        </Panel>
        <Panel
          className="h-portfolio-panel"
          title="Property performance"
          action={
            <button className="h-text-button" onClick={() => go('properties')}>
              Manage properties <ArrowUpRight size={14} />
            </button>
          }
        >
          <Table headers={['Property', 'Rooms', 'Occupancy', ...(finances ? ['Net revenue'] : [])]}>
            {byProperty.map((property) => (
              <tr key={property.id}>
                <td>
                  <button className="h-property-cell" onClick={() => go('properties')}>
                    <span className="h-property-code">
                      {data.properties.find((p) => p.id === property.id)?.code}
                    </span>
                    <span>
                      <b>{property.name}</b>
                      <small>{data.properties.find((p) => p.id === property.id)?.city}</small>
                    </span>
                  </button>
                </td>
                <td>{property.roomCount}</td>
                <td>
                  <div className="h-occupancy-cell">
                    <span>{percent(property.occupancy)}</span>
                    <div className="h-mini-bars">
                      <span style={{ width: Math.min(100, property.occupancy || 0) + '%' }} />
                    </div>
                  </div>
                </td>
                {finances && (
                  <td>
                    <b>{money(property.revenue)}</b>
                  </td>
                )}
              </tr>
            ))}
          </Table>
          <div className="h-panel-foot">
            <span>
              {m.roomCount} rooms across {byProperty.length}{' '}
              {byProperty.length === 1 ? 'property' : 'properties'}
            </span>
            <span>Selected reporting period</span>
          </div>
        </Panel>
        <Panel
          className="h-readiness-panel"
          title="Rooms at a glance"
          action={
            <button
              className="h-icon-button"
              aria-label="View room inventory"
              onClick={() => go('rooms')}
            >
              <ArrowUpRight size={17} />
            </button>
          }
        >
          <div className="h-ready-total">
            <strong>{ready}</strong>
            <div>
              <b>Ready to assign</b>
              <span>Vacant, inspected & in service</span>
            </div>
          </div>
          <div className="h-readiness-detail">
            {readiness.map(({ state, count }) => (
              <div key={state}>
                <Status>{state}</Status>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
          <div className={'h-readiness-note ' + (awaitingInspection === 0 ? 'clear' : '')}>
            <span className="h-attention-dot" />
            <span>
              {awaitingInspection
                ? `${awaitingInspection} awaiting manager inspection`
                : 'No rooms awaiting inspection'}
            </span>
          </div>
          <button
            className="h-full-link"
            onClick={() => go(canClean(data.user) ? 'housekeeping' : 'rooms')}
          >
            {canClean(data.user) ? 'Open housekeeping' : 'View room inventory'}
            <ArrowRight size={15} />
          </button>
        </Panel>
      </div>
      <div className="h-overview-foot">
        <span>Revenue excludes tax. Payments are recorded separately.</span>
        <span>Demonstration data</span>
      </div>
    </div>
  );
}
