// Eksport/import: CSV som Excel kan åbne direkte, og JSON som backup.
import { CATEGORIES, INCOME_TYPES, KIND_LABELS, PERIOD_LABELS, uid } from '../domain/model.js';
import { summarize, summarizeMoveIn, toMonthly } from '../domain/calc.js';
import { ensureMoveIn } from '../domain/templates.js';
import { isBudget } from './storage.js';

const num = (n) => (Math.round(n * 100) / 100).toString().replace('.', ',');
const cell = (v) => {
  let s = String(v ?? '');
  // Undgå at Excel tolker tekst som formel – men lad rigtige (negative) tal være.
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(,\d+)?$/.test(s)) s = "'" + s;
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

/** Dansk Excel-format: semikolon som skilletegn, komma som decimaltegn, BOM for æøå. */
export function budgetToCsv(budget) {
  const s = summarize(budget);
  const catLabel = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
  const rows = [['Type', 'Kategori', 'Post', 'Beløb', 'Periode', 'Kr. pr. måned', 'Medregnet']];
  const netById = new Map(s.income.rows.map((r) => [r.id, r.net]));
  for (const i of budget.incomes) {
    const label = i.label + (i.beforeTax && INCOME_TYPES[i.type]?.taxable ? ' (før skat)' : '');
    rows.push(['Indtægt', INCOME_TYPES[i.type]?.label ?? '', label, num(i.amount), PERIOD_LABELS[i.period],
      num(i.enabled ? netById.get(i.id) ?? 0 : 0), i.enabled ? 'ja' : 'nej']);
  }
  for (const e of budget.expenses) {
    rows.push([KIND_LABELS[e.kind], catLabel[e.categoryId] ?? '', e.label, num(e.amount), PERIOD_LABELS[e.period],
      num(e.enabled ? toMonthly(e.amount, e.period) : 0), e.enabled ? 'ja' : 'nej']);
  }
  rows.push([], ['Resultat', '', 'Indtægter efter skat', '', '', num(s.income.totalNet)],
    ['Resultat', '', 'Udgifter i alt', '', '', num(s.expensesTotal)],
    ['Resultat', '', 'Til overs', '', '', num(s.balance)],
    ['Resultat', '', 'Behov ud over SU', '', '', num(s.needBeyondSu)]);
  const mi = summarizeMoveIn(budget);
  rows.push([], ['Indflytning (engangsudgifter)', '', 'Post', 'Beløb', '', '', 'Medregnet']);
  for (const i of budget.moveIn?.items ?? []) rows.push(['Indflytning', '', i.label, num(i.amount), 'én gang', '', i.enabled ? 'ja' : 'nej']);
  rows.push(['Indflytning', '', 'I alt', num(mi.total)], ['Indflytning', '', 'Opsparet', num(mi.saved)], ['Indflytning', '', 'Mangler', num(mi.missing)]);
  return '\uFEFF' + rows.map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
}

export const budgetToJson = (budget) => JSON.stringify({ format: 'budgetmodel', budget }, null, 2);

/** Læser en backup-fil. Får nyt id, så den ikke overskriver et eksisterende budget. */
export function budgetFromJson(text) {
  const data = JSON.parse(text);
  const budget = data?.budget ?? data;
  if (!isBudget(budget)) throw new Error('Filen ligner ikke et budget fra denne app.');
  return ensureMoveIn({ ...budget, id: uid(), updatedAt: new Date().toISOString() });
}

export function download(filename, content, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
