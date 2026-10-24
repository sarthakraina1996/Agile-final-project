import React, { useState } from 'react';
import { money, dateFormat } from './lib';
const colors = ['#1378ed', '#39b5b0', '#ffc668', '#9e8bda', '#e87e8a'];
export function RevenueChart({ data, currency = 'INR' }) {
  const [hover, setHover] = useState(null);
  const w = 760,
    h = 225,
    pad = 35,
    max =
      Math.max(
        1,
        ...data.map(
          (d) =>
            (d.Rooms || 0) + (d['F&B'] || 0) + (d.Spa || 0) + (d.Banquets || 0) + (d.Other || 0),
        ),
      ) * 1.18;
  const point = (v, i) => [
    pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1),
    h - pad - (v / max) * (h - pad * 1.5),
  ];
  const lines = ['Rooms', 'F&B', 'Spa'].map((dept, index) => ({
    dept,
    color: colors[index],
    points: data.map((d, i) => point(d[dept] || 0, i)),
  }));
  const selected = hover === null ? null : data[hover];
  return (
    <div className="h-linechart">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Posted revenue by date and department">
        <defs>
          <linearGradient id="h-revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#187cf0" stopOpacity=".15" />
            <stop offset="100%" stopColor="#187cf0" stopOpacity=".01" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1={pad}
              x2={w - pad}
              y1={point((i * max) / 4, 0)[1]}
              y2={point((i * max) / 4, 0)[1]}
              stroke="#eaf0f6"
              strokeDasharray="3 4"
            />
            <text
              x={pad - 8}
              y={point((i * max) / 4, 0)[1] + 3}
              textAnchor="end"
              fill="#98a6b7"
              fontSize="9"
            >
              {money((i * max) / 4, currency, true)}
            </text>
          </g>
        ))}
        {lines.map(({ dept, color, points }, index) => (
          <g key={dept}>
            {index === 0 && points.length > 1 && (
              <path
                d={`M${pad},${h - pad} L${points.map((p) => p.join(',')).join(' L')} L${w - pad},${h - pad}Z`}
                fill="url(#h-revenue-fill)"
              />
            )}
            <polyline
              points={points.map((p) => p.join(',')).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={index ? 1.8 : 2.5}
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={index ? 2.2 : 3} fill={color} />
            ))}
          </g>
        ))}
        {data.map((d, i) => (
          <g key={i}>
            <rect
              x={point(0, i)[0] - 18}
              y="0"
              width="36"
              height={h - pad}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
            {(data.length < 8 || i % 2 === 0) && (
              <text x={point(0, i)[0]} y={h - 12} textAnchor="middle" fill="#98a6b7" fontSize="9">
                {dateFormat(d.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
      {selected && (
        <div className="h-chart-tooltip">
          {dateFormat(selected.date)}
          <b>{money(selected.Rooms + selected['F&B'] + selected.Spa, currency)}</b>
        </div>
      )}
      <div className="h-chart-legend">
        {lines.map((l) => (
          <span key={l.dept}>
            <i style={{ background: l.color }} />
            {l.dept === 'Rooms' ? 'Room revenue' : l.dept + ' revenue'}
          </span>
        ))}
      </div>
    </div>
  );
}
export function Donut({ data, currency = 'INR', label = 'Operating revenue' }) {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);
  let angle = 0;
  const stops = data.map((d, i) => {
    const start = angle;
    angle += total ? (Math.max(0, d.value) / total) * 100 : 0;
    return `${colors[i % colors.length]} ${start}% ${angle}%`;
  });
  return (
    <div className="h-donut-layout">
      <div
        className="h-donut"
        style={{ background: total ? `conic-gradient(${stops.join(',')})` : '#edf1f6' }}
      >
        <div>
          <span>REVENUE MIX</span>
          <strong>{money(total, currency, true)}</strong>
          <small>Net of tax</small>
        </div>
      </div>
      <div className="h-donut-key">
        {data.map((d, i) => (
          <div key={d.name}>
            <i style={{ background: colors[i % colors.length] }} />
            <span>{d.name}</span>
            <b>{total ? ((Math.max(0, d.value) / total) * 100).toFixed(1) : '0'}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}
