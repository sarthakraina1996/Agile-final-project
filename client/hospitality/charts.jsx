import React, { useState, useEffect, useRef } from 'react';
import { money, dateFormat } from './lib';
const colors = ['#346a93', '#3b8376', '#b68b43', '#817594', '#b57668'];
const departments = ['Rooms', 'F&B', 'Spa', 'Banquets', 'Other'];
const sum = (d) => departments.reduce((total, dept) => total + (d[dept] || 0), 0);
export function RevenueChart({ data, currency = 'INR' }) {
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  const [w, setWidth] = useState(760);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(280, entry.contentRect.width)),
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const h = 225,
    pad = 42,
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
  const lines = ['Total', 'Rooms', 'F&B'].map((dept, index) => ({
    dept,
    color: index === 0 ? '#142f45' : colors[index - 1],
    points: data.map((d, i) => point(dept === 'Total' ? sum(d) : d[dept] || 0, i)),
  }));
  const selected = hover === null ? null : data[hover];
  return (
    <div className="h-linechart" ref={ref}>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Posted revenue by date and department">
        <defs>
          <linearGradient id="h-revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#346a93" stopOpacity=".09" />
            <stop offset="100%" stopColor="#346a93" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1={pad}
              x2={w - pad}
              y1={point((i * max) / 4, 0)[1]}
              y2={point((i * max) / 4, 0)[1]}
              stroke="#e8ebed"
            />
            <text
              x={pad - 8}
              y={point((i * max) / 4, 0)[1] + 3}
              textAnchor="end"
              fill="#98a6b7"
              fontSize="11"
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
              <circle
                key={i}
                cx={p[0]}
                cy={p[1]}
                r={hover === i ? 4 : index ? 0 : 2.5}
                fill={color}
              />
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
            {i % Math.max(1, Math.ceil(data.length / (w < 450 ? 4 : 7))) === 0 && (
              <text x={point(0, i)[0]} y={h - 12} textAnchor="middle" fill="#687582" fontSize="11">
                {dateFormat(d.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
      {selected && (
        <div className="h-chart-tooltip">
          {dateFormat(selected.date)}
          <b>{money(sum(selected), currency)}</b>
          <span>Total posted revenue</span>
        </div>
      )}
      <div className="h-chart-legend">
        {lines.map((l) => (
          <span key={l.dept}>
            <i style={{ background: l.color }} />
            {l.dept === 'Total' ? 'All departments' : l.dept}
          </span>
        ))}
      </div>
    </div>
  );
}
export function DepartmentMix({ data, onSelect }) {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);
  return (
    <div className="h-department-mix">
      <div className="h-section-caption">Revenue by department</div>
      <div className="h-mix-bar" aria-hidden="true">
        {data.map((d, i) => (
          <span
            key={d.name}
            style={{ flex: Math.max(0, d.value), background: colors[i % colors.length] }}
          />
        ))}
      </div>
      <div className="h-mix-key">
        {data.map((d, i) => (
          <button
            key={d.name}
            onClick={() => onSelect(d.name)}
            aria-label={`View ${d.name} revenue sources`}
          >
            <span>
              <i style={{ background: colors[i % colors.length] }} />
              {d.name}
            </span>
            <b>{total ? ((Math.max(0, d.value) / total) * 100).toFixed(1) : '0'}%</b>
          </button>
        ))}
      </div>
    </div>
  );
}
