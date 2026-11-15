const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

const nf = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 });
export const kr = (n) => nf.format(Math.round(n) || 0) + ' kr.';

const labelOf = (l) => (typeof l === 'string' ? l : l.label);

/** <fluent-option>-liste til et <fluent-select>. */
export const options = (map, selected) =>
  Object.entries(map)
    .map(([v, l]) => `<fluent-option value="${esc(v)}"${v === selected ? ' selected' : ''}>${esc(labelOf(l))}</fluent-option>`)
    .join('');

/** <fluent-radio>-liste til en <fluent-radio-group>. */
export const radios = (map) =>
  Object.entries(map).map(([v, l]) => `<fluent-radio value="${esc(v)}">${esc(labelOf(l))}</fluent-radio>`).join('');

export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9æøå]+/g, '-').replace(/^-|-$/g, '') || 'budget';

/** Tal fra et felt: aldrig negativt, aldrig NaN. */
export const num = (v) => Math.max(0, Number(String(v).replace(',', '.')) || 0);
