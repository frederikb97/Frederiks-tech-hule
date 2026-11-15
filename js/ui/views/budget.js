import { CATEGORIES, INCOME_TYPES, PERIOD_LABELS, activeBudget, uid } from '../../domain/model.js';
import { summarize } from '../../domain/calc.js';
import { esc, kr, options } from '../util.js';

const amountInput = (list, item) => `
  <input class="amount" type="number" inputmode="decimal" min="0" step="any" value="${Number(item.amount) || 0}"
    data-list="${list}" data-id="${esc(item.id)}" data-field="amount" data-fid="${esc(item.id)}:amount" aria-label="Beløb for ${esc(item.label)}">
  <select data-list="${list}" data-id="${esc(item.id)}" data-field="period" data-fid="${esc(item.id)}:period" aria-label="Periode">
    ${options(PERIOD_LABELS, item.period)}</select>`;

const rowStart = (list, item) => `
  <input type="checkbox" ${item.enabled ? 'checked' : ''} data-list="${list}" data-id="${esc(item.id)}" data-field="enabled"
    data-fid="${esc(item.id)}:enabled" aria-label="Medregn ${esc(item.label)}" title="Tæl med i budgettet">
  <input class="label" type="text" value="${esc(item.label)}" maxlength="80" data-list="${list}" data-id="${esc(item.id)}"
    data-field="label" data-fid="${esc(item.id)}:label" aria-label="Navn">`;

const removeBtn = (list, item) => `
  <button class="btn btn-ghost icon" data-action="remove" data-list="${list}" data-id="${esc(item.id)}" aria-label="Fjern ${esc(item.label)}" title="Fjern">✕</button>`;

function incomeRow(i, net) {
  const taxable = INCOME_TYPES[i.type]?.taxable;
  return `
    <div class="row${i.enabled ? '' : ' off'}">
      <div class="row-main">${rowStart('incomes', i)}${amountInput('incomes', i)}${removeBtn('incomes', i)}</div>
      <div class="row-sub">
        <select data-list="incomes" data-id="${esc(i.id)}" data-field="type" data-fid="${esc(i.id)}:type" aria-label="Type">${options(INCOME_TYPES, i.type)}</select>
        ${taxable ? `<label class="choice small"><input type="checkbox" ${i.beforeTax ? 'checked' : ''} data-list="incomes" data-id="${esc(i.id)}" data-field="beforeTax" data-fid="${esc(i.id)}:beforeTax"> Beløbet er før skat</label>` : ''}
        <span class="muted" data-net="${esc(i.id)}">${i.enabled ? `≈ ${kr(net)} udbetalt pr. md.` : 'tæller ikke med'}</span>
      </div>
    </div>`;
}

function expenseRow(e) {
  return `
    <div class="row${e.enabled ? '' : ' off'}">
      <div class="row-main">${rowStart('expenses', e)}${amountInput('expenses', e)}${removeBtn('expenses', e)}</div>
      ${e.hint ? `<div class="row-sub"><span class="muted">${esc(e.hint)}</span></div>` : ''}
    </div>`;
}

export function render(state) {
  const b = activeBudget(state);
  const s = summarize(b);
  const net = new Map(s.income.rows.map((r) => [r.id, r.net]));
  return `
    <h1 class="page-title">${esc(b.name)}</h1>
    <p class="muted intro">Ret tallene, så de passer til dig. Fjern fluebenet ved det, du ikke har. Alt gemmes automatisk på din enhed.</p>
    <section class="card">
      <header class="card-head"><h2>💵 Indtægter</h2><strong data-sum="income">${kr(s.income.totalNet)}</strong></header>
      ${b.incomes.map((i) => incomeRow(i, net.get(i.id) ?? 0)).join('')}
      <button class="btn" data-action="add-income">+ Tilføj indtægt</button>
    </section>
    ${CATEGORIES.map((c) => `
      <section class="card">
        <header class="card-head"><h2>${c.icon} ${esc(c.label)}</h2><strong data-cat-total="${c.id}">${kr(s.byCategory.find((x) => x.id === c.id).total)}</strong></header>
        ${b.expenses.filter((e) => e.categoryId === c.id).map(expenseRow).join('')}
        <button class="btn" data-action="add-expense" data-cat="${c.id}">+ Tilføj udgift</button>
      </section>`).join('')}
    <div class="sumbar" role="status">
      <div><small>Ind (efter skat)</small><strong data-sum="income">${kr(s.income.totalNet)}</strong></div>
      <div><small>Ud</small><strong data-sum="expenses">${kr(s.expensesTotal)}</strong></div>
      <div><small>Til overs</small><strong data-sum="balance" class="${s.balance < 0 ? 'neg' : 'pos'}">${kr(s.balance)}</strong></div>
      <a class="btn btn-primary" href="#overview">Se overblik</a>
    </div>`;
}

/** Opdaterer kun tallene, så feltet man skriver i, beholder fokus. */
function refresh(root, state) {
  const s = summarize(activeBudget(state));
  const set = (sel, text) => root.querySelectorAll(sel).forEach((el) => (el.textContent = text));
  set('[data-sum="income"]', kr(s.income.totalNet));
  set('[data-sum="expenses"]', kr(s.expensesTotal));
  set('[data-sum="balance"]', kr(s.balance));
  root.querySelectorAll('[data-sum="balance"]').forEach((el) => (el.className = s.balance < 0 ? 'neg' : 'pos'));
  for (const c of s.byCategory) set(`[data-cat-total="${c.id}"]`, kr(c.total));
  for (const r of s.income.rows) set(`[data-net="${CSS.escape(r.id)}"]`, `≈ ${kr(r.net)} udbetalt pr. md.`);
}

export function handle(type, ev, store, root) {
  const el = ev.target;
  if (type === 'click') {
    const btn = el.closest('button[data-action]');
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
  const { list, id, field } = el.dataset ?? {};
  if (!field) return;
  const structural = el.matches('select, input[type="checkbox"]');
  // Tekst og tal gemmes mens man skriver; valg og flueben tegner siden om.
  if ((type === 'input') === structural) return;
  store.update((s) => {
    const item = activeBudget(s)[list]?.find((x) => x.id === id);
    if (!item) return;
    if (el.type === 'checkbox') item[field] = el.checked;
    else if (field === 'amount') item.amount = Math.max(0, Number(el.value) || 0);
    else item[field] = el.value;
    if (field === 'type') item.beforeTax = item.type === 'su' || item.type === 'job';
  }, { silent: !structural });
  if (!structural) refresh(root, store.get());
}

