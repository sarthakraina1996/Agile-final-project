import React from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Building2,
  CalendarCheck,
  Clock3,
  Wallet,
  TrendingUp,
  BedDouble,
  BarChart3,
  Download,
  ChevronRight,
  Star,
} from 'lucide-react';
import { Kpi, Panel, Table, Status, Avatar, Button, Empty } from './ui';
import { RevenueChart, Donut } from './charts';
import { money, percent, difference, dateFormat, canFinance, canDesk } from './lib';
export default function Dashboard({ data, go, onBooking, onReservation, onDrill }) {
  const { metrics: m, previous: p, today, reservations, byProperty } = data;
  const arrivals = reservations.filter((r) => r.arrival === today && r.status === 'Confirmed'),
    departures = reservations.filter((r) => r.departure === today && r.status === 'In house'),
    inhouse = reservations.filter((r) => r.status === 'In house');
  const finances = canFinance(data.user);
  return (
    <>
      <div className="h-page-title">
        <div>
          <div className="h-eyebrow">YOUR PORTFOLIO, IN PERSPECTIVE</div>
          <h1>
            Executive dashboard
            <span className="h-title-dot" />
          </h1>
          <p>A clear view of your properties. Confidence in every decision.</p>
        </div>
        <div className="h-title-meta">
          <span>
            <i /> Live from your local hub
          </span>
          <small>Updated just now</small>
        </div>
      </div>
      <div className="h-kpis">
        {finances && (
          <Kpi
            label="Operating revenue"
            value={money(m.revenue)}
            icon={Wallet}
            previous={difference(m.revenue, p.revenue)}
            onClick={() => onDrill('All')}
          />
        )}
        <Kpi
          label="Occupancy"
          value={percent(m.occupancy)}
          icon={BedDouble}
          tone="teal"
          previous={difference(m.occupancy, p.occupancy)}
          onClick={() => go('rooms')}
        />
        {finances && (
          <>
            <Kpi
              label="Average daily rate"
              value={money(m.adr)}
              icon={TrendingUp}
              previous={difference(m.adr, p.adr)}
              onClick={() => onDrill('Rooms')}
            />
            <Kpi
              label="RevPAR"
              value={money(m.revpar)}
              icon={BarChart3}
              tone="purple"
              previous={difference(m.revpar, p.revpar)}
              onClick={() => onDrill('Rooms')}
            />
          </>
        )}
        <Kpi
          label="Arrivals today"
          value={arrivals.length}
          icon={CalendarCheck}
          tone="amber"
          note="Expected arrivals · selected properties"
          onClick={() => go('frontdesk')}
        />
        <Kpi
          label="Guests in house"
          value={inhouse.length}
          icon={Building2}
          tone="teal"
          note={`${departures.length} departures expected today`}
          onClick={() => go('frontdesk')}
        />
      </div>
      <div className="h-dashboard-charts">
        <Panel
          title={finances ? 'Revenue performance' : 'Your operational snapshot'}
          subtitle={
            finances
              ? 'Posted net revenue across the selected period'
              : 'Current room occupancy and readiness'
          }
          action={
            <span className="h-subtle-label">
              {dateFormat(m.from)} –{' '}
              {dateFormat(new Date(Date.parse(m.to) - 86400000).toISOString().slice(0, 10))}
            </span>
          }
        >
          {finances ? (
            <RevenueChart data={m.trend} />
          ) : (
            <div className="h-readiness-large">
              {['Inspected', 'Clean', 'Dirty', 'Cleaning'].map((s) => (
                <div key={s}>
                  <Status>{s}</Status>
                  <strong>{data.rooms.filter((r) => r.cleaning === s).length}</strong>
                  <span>rooms</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel
          title={finances ? 'Revenue by department' : 'At a glance'}
          subtitle={
            finances ? 'Every contribution, in context.' : 'Today’s front-office priorities.'
          }
          action={
            <button
              className="h-icon-button"
              aria-label="View financial sources"
              onClick={() => (finances ? onDrill('All') : go('frontdesk'))}
            >
              <ArrowUpRight size={17} />
            </button>
          }
        >
          {finances ? (
            <Donut data={m.departments} />
          ) : (
            <div className="h-ops-summary">
              {[
                [arrivals.length, 'Expected arrivals'],
                [departures.length, 'Due departures'],
                [
                  data.tasks.filter((t) => t.status !== 'Completed').length,
                  'Open housekeeping tasks',
                ],
              ].map(([value, label]) => (
                <div key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      <div className="h-dashboard-lower">
        <Panel
          title="Your properties, connected"
          subtitle="A shared standard. An individual story."
          action={
            <button className="h-text-button" onClick={() => go('properties')}>
              View portfolio <ArrowUpRight size={13} />
            </button>
          }
        >
          <Table
            headers={[
              'Property',
              'Rooms',
              'Occupancy',
              ...(finances ? ['Net revenue'] : []),
              'Performance',
            ]}
          >
            {byProperty.map((property, i) => (
              <tr key={property.id} onClick={() => go('properties')} className="h-clickable">
                <td>
                  <div className="h-property-cell">
                    <span className={'h-property-initial pi' + i}>
                      <Building2 size={18} />
                    </span>
                    <div>
                      <b>{property.name}</b>
                      <small>
                        {data.properties.find((p) => p.id === property.id)?.city} <i>·</i> India
                      </small>
                    </div>
                  </div>
                </td>
                <td>{property.roomCount}</td>
                <td>{percent(property.occupancy)}</td>
                {finances && (
                  <td>
                    <b>{money(property.revenue)}</b>
                  </td>
                )}
                <td>
                  <div className="h-mini-bars" aria-label="Selected-period occupancy">
                    <span style={{ width: Math.min(100, property.occupancy || 0) + '%' }} />
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <div className="h-panel-foot">
            <span>
              {byProperty.length} properties <i>·</i> {m.roomCount} rooms across the portfolio
            </span>
            <span>All figures from fictional demo records</span>
          </div>
        </Panel>
        <Panel
          title="The day ahead"
          subtitle="A little preparation. A warmer welcome."
          action={<span className="h-count">TODAY</span>}
        >
          <div className="h-arrivals-list">
            {arrivals.slice(0, 4).map((r) => (
              <button key={r.id} onClick={() => onReservation(r)}>
                <Avatar name={r.guest_name} />
                <span>
                  <b>
                    {r.guest_name}
                    {r.vip === 1 && <Star size={10} />}
                  </b>
                  <small>
                    {r.type_name} · Room {r.room_number}
                  </small>
                </span>
                <time>14:00</time>
                <ChevronRight size={14} />
              </button>
            ))}
            {!arrivals.length && (
              <Empty title="A moment of calm" text="No arrivals pending today in this view." />
            )}
          </div>
          <button className="h-full-link" onClick={() => go('frontdesk')}>
            Open front desk <ArrowRight size={14} />
          </button>
        </Panel>
      </div>
      <div className="h-bottom-strip">
        <span>
          <span className="h-mini-emblem">✦</span> Intelligence for Hospitality. Control for Growth.
        </span>
        <span>
          <i /> All systems local <b>·</b> Demo workspace
        </span>
      </div>
    </>
  );
}
