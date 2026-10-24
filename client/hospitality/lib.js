export const API = '/hospitality-api/v1';
export async function request(path, method = 'GET', body) {
  const response = await fetch(API + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}
export const dateAdd = (d, n) => {
  if (!d || !Number.isFinite(Date.parse(d + 'T12:00:00Z'))) return '';
  return new Date(Date.parse(d + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
};
export const dateFormat = (d, options = { day: 'numeric', month: 'short' }) =>
  new Date(d + 'T12:00:00').toLocaleDateString('en-IN', options);
export const money = (minor, currency = 'INR', compact = false) =>
  minor === null || minor === undefined
    ? '—'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
        ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
      }).format(minor / 100);
export const fullNumber = (n) =>
  n === null || n === undefined
    ? '—'
    : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(n);
export const percent = (n) => (n === null || n === undefined ? '—' : fullNumber(n) + '%');
export const difference = (value, previous) =>
  previous ? Math.round(((value - previous) / Math.abs(previous)) * 1000) / 10 : null;
export const download = (title, rows) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const escape = (v) =>
    '"' +
    String(v ?? '')
      .replace(/^[=+@\-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const url = URL.createObjectURL(
    new Blob(
      [
        '\ufeff' +
          [
            keys.map(escape).join(','),
            ...rows.map((r) => keys.map((k) => escape(r[k])).join(',')),
          ].join('\r\n'),
      ],
      { type: 'text/csv;charset=utf-8' },
    ),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = title + '.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
export const canDesk = (u) => ['owner', 'gm', 'frontdesk'].includes(u.role);
export const canFinance = (u) => ['owner', 'gm', 'finance'].includes(u.role);
export const canClean = (u) => ['owner', 'gm', 'housekeeping'].includes(u.role);
