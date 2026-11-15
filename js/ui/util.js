const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

const nf = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 });
export const kr = (n) => nf.format(Math.round(n) || 0) + ' kr.';

export const options = (map, selected) =>
  Object.entries(map)
    .map(([v, l]) => `<option value="${esc(v)}"${v === selected ? ' selected' : ''}>${esc(typeof l === 'string' ? l : l.label)}</option>`)
    .join('');

export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9æøå]+/g, '-').replace(/^-|-$/g, '') || 'budget';
