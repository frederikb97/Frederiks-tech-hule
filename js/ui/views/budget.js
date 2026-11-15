import { CATEGORIES, INCOME_TYPES, PERIOD_LABELS, activeBudget, uid } from '../../domain/model.js';
import { summarize } from '../../domain/calc.js';
import { esc, kr, num, options } from '../util.js';

/** Hvilke kategorier der er foldet ud. Huskes mens siden er åben. */
const open = new Set(['bolig', 'mad']);

const at = (list, item, field) =>
  `data-list="${list}" data-id="${esc(item.id)}" data-field="${field}" data-fid="${esc(item.id)}:${field}"`;

const rowMain = (list, item) => `
  <div class="row-main">
    <fluent-checkbox ${item.enabled ? 'checked' : ''} ${at(list, item, 'enabled')} aria-label="Medregn ${esc(item.label)}" title="Tæl med i budgettet"></fluent-checkbox>
    <fluent-text-field class="label" appearance="filled" value="${esc(item.label)}" maxlength="80" ${at(list, item, 'label')} aria-label="Navn"></fluent-text-field>
    <fluent-text-field class="amount" appearance="filled" type="number" min="0" value="${Number(item.amount) || 0}" ${at(list, item, 'amount')} aria-label="Beløb for ${esc(item.label)}"><span slot="end">kr.</span></fluent-text-field>
    <fluent-select class="period" ${at(list, item, 'period')} aria-label="Periode">${options(PERIOD_LABELS, item.period)}</fluent-select>
    <fluent-button class="icon" appearance="stealth" data-action="remove" data-list="${list}" data-id="${esc(item.id)}" aria-label="Fjern ${esc(item.label)}" title="Fjern">✕</fluent-button>
  </div>`;

const netText = (i, net) => (i.enabled ? `≈ ${kr(net)} udbetalt pr. md.` : 'tæller ikke med');

function incomeRow(i, net) {
  const taxable = INCOME_TYPES[i.type]?.taxable;
  return `
    <div class="row${i.enabled ? '' : ' off'}" data-row="${esc(i.id)}">
      ${rowMain('incomes', i)}
      <div class="row-sub">
        <fluent-select class="type" ${at('incomes', i, 'type')} aria-label="Type">${options(INCOME_TYPES, i.type)}</fluent-select>
        ${taxable ? `<fluent-checkbox ${i.beforeTax ? 'checked' : ''} ${at('incomes', i, 'beforeTax')}>Beløbet er før skat</fluent-checkbox>` : ''}
        <span class="muted" data-net="${esc(i.id)}">${netText(i, net)}</span>
      </div>
    </div>`;
}

const expenseRow = (e) => `
  <div class="row${e.enabled ? '' : ' off'}" data-row="${esc(e.id)}">
    ${rowMain('expenses', e)}
    ${e.hint ? `<div class="row-sub"><span class="muted">${esc(e.hint)}</span></div>` : ''}
  </div>`;

export function render(state) {
  const b = activeBudget(state);
  const s = summarize(b);
  const net = new Map(s.income.rows.map((r) => [r.id, r.net]));
  return `
    <h1 class="page-title">${esc(b.name)}</h1>
    <p class="muted intro">Ret tallene, så de passer til dig. Fjern fluebenet ved det, du ikke har. Alt gemmes automatisk på din enhed.</p>
    <section class="card">
      <header class="card-head"><h2><span class="chip">💵</span> Indtægter</h2><strong class="pos" data-sum="income">${kr(s.income.totalNet)}</strong></header>
      ${b.incomes.map((i) => incomeRow(i, net.get(i.id) ?? 0)).join('')}
      <fluent-button class="add" appearance="outline" data-action="add-income">+ Tilføj indtægt</fluent-button>
    </section>
    <h2 class="section-title">Udgifter</h2>
    <section class="card flush">
      <fluent-accordion expand-mode="multi">
        ${CATEGORIES.map((c) => `
          <fluent-accordion-item data-cat="${c.id}" ${open.has(c.id) ? 'expanded' : ''}>
            <span slot="start" class="chip">${c.icon}</span>
            <span slot="heading">${esc(c.label)}</span>
            <strong slot="end" data-cat-total="${c.id}">${kr(s.byCategory.find((x) => x.id === c.id).total)}</strong>
            ${b.expenses.filter((e) => e.categoryId === c.id).map(expenseRow).join('')}
            <fluent-button class="add" appearance="outline" data-action="add-expense" data-cat="${c.id}">+ Tilføj udgift</fluent-button>
          </fluent-accordion-item>`).join('')}
      </fluent-accordion>
    </section>
    <div class="sumbar" role="status">
      <div class="sumbar-inner">
        <div><small>Ind (efter skat)</small><strong data-sum="income">${kr(s.income.totalNet)}</strong></div>
        <div><small>Ud</small><strong data-sum="expenses">${kr(s.expensesTotal)}</strong></div>
        <div><small>Til overs</small><strong data-sum="balance" class="${s.balance < 0 ? 'neg' : 'pos'}">${kr(s.balance)}</strong></div>
        <fluent-anchor appearance="accent" href="#overview">Se overblik</fluent-anchor>
      </div>
    </div>`;
}

/** Opdaterer kun tal og rækkernes udseende, så feltet man skriver i, beholder fokus. */
function refresh(root, state) {
  const b = activeBudget(state);
  const s = summarize(b);
  const set = (sel, text) => root.querySelectorAll(sel).forEach((el) => (el.textContent = text));
  set('[data-sum="income"]', kr(s.income.totalNet));
  set('[data-sum="expenses"]', kr(s.expensesTotal));
  set('[data-sum="balance"]', kr(s.balance));
  root.querySelectorAll('.sumbar [data-sum="balance"]').forEach((el) => (el.className = s.balance < 0 ? 'neg' : 'pos'));
  for (const c of s.byCategory) set(`[data-cat-total="${c.id}"]`, kr(c.total));
  const net = new Map(s.income.rows.map((r) => [r.id, r.net]));
  for (const i of b.incomes) set(`[data-net="${CSS.escape(i.id)}"]`, netText(i, net.get(i.id) ?? 0));
  for (const item of [...b.incomes, ...b.expenses]) {
    root.querySelector(`[data-row="${CSS.escape(item.id)}"]`)?.classList.toggle('off', !item.enabled);
  }
}

export function handle(type, ev, store, root) {
  const el = ev.target;
  if (type === 'click') {
    const btn = el.closest('[data-action]');
    if (!btn) return;
    const { action, list, id, cat } = btn.dataset;
    store.update((s) => {
      const b = activeBudget(s);
      if (action === 'remove') b[list] = b[list].filter((x) => x.id !== id);
      if (action === 'add-income') {
        b.incomes.push({ id: uid(), type: 'other', label: 'Ny indtægt', amount: 0, period: 'month', beforeTax: false, enabled: true });
      }
      if (action === 'add-expense') {
        b.expenses.push({ id: uid(), categoryId: cat, label: 'Ny udgift', amount: 0, period: 'month', kind: cat === 'opsparing' ? 'savings' : 'variable', enabled: true, hint: '' });
      }
    });
    return;
  }
  if (type === 'change' && el.matches?.('fluent-accordion-item')) {
    el.expanded ? open.add(el.dataset.cat) : open.delete(el.dataset.cat);
    return;
  }
  const { list, id, field } = el.dataset ?? {};
  if (!field) return;
  // Tekstfelter gemmes mens man skriver ('input'); flueben og valg, når de ændres ('change').
  const isText = el.matches('fluent-text-field');
  if ((type === 'input') !== isText) return;
  const item = activeBudget(store.get())[list]?.find((x) => x.id === id);
  if (!item) return;
  const value = el.matches('fluent-checkbox') ? !!el.checked : field === 'amount' ? num(el.value) : el.value;
  if (item[field] === value || value === undefined || value === null) return;
  const rerender = field === 'type'; // skifter, om "før skat" giver mening
  store.update(() => {
    item[field] = value;
    if (field === 'type') item.beforeTax = !!INCOME_TYPES[value]?.taxable;
  }, { silent: !rerender });
  if (!rerender) refresh(root, store.get());
}
