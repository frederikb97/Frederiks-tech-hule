import { activeBudget } from '../../domain/model.js';
import { advice, summarize } from '../../domain/calc.js';
import { RATES } from '../../domain/rates.js';
import { budgetFromJson, budgetToCsv, budgetToJson, download } from '../../data/exporters.js';
import { esc, kr, slug } from '../util.js';

const ICON = { bad: '⛔', warn: '⚠️', good: '✅', info: '💡' };

export function render(state) {
  const b = activeBudget(state);
  const s = summarize(b);
  const max = Math.max(1, ...s.byCategory.map((c) => c.total));
  const pct = (n) => (s.expensesTotal > 0 ? Math.round((n / s.expensesTotal) * 100) : 0);
  const cats = s.byCategory.filter((c) => c.total > 0).sort((a, z) => z.total - a.total);
  return `
    <h1 class="page-title">Overblik – ${esc(b.name)}</h1>
    <section class="card result ${s.balance < 0 ? 'is-neg' : 'is-pos'}">
      <div class="result-grid">
        <div><small>Indtægter efter skat</small><strong>${kr(s.income.totalNet)}</strong></div>
        <div><small>Udgifter</small><strong>${kr(s.expensesTotal)}</strong></div>
        <div><small>${s.balance < 0 ? 'Mangler hver måned' : 'Til overs hver måned'}</small><strong class="${s.balance < 0 ? 'neg' : 'pos'}">${kr(Math.abs(s.balance))}</strong></div>
      </div>
    </section>

    <section class="card">
      <h2>Hvad skal du bruge ud over din SU?</h2>
      <p class="big">${kr(s.needBeyondSu)} <span class="muted">om måneden</span></p>
      <p>Din SU giver ca. <strong>${kr(s.income.suNet)}</strong> udbetalt. Dine udgifter er <strong>${kr(s.expensesTotal)}</strong>.
      Forskellen skal komme fra job, boligstøtte, opsparing eller andet.</p>
      <ul class="plain">
        <li>Dine andre indtægter dækker allerede <strong>${kr(Math.min(s.income.otherNet, s.needBeyondSu))}</strong>.</li>
        ${s.shortfall > 0
          ? `<li>Der mangler stadig <strong class="neg">${kr(s.shortfall)}</strong>. Det svarer til ca.
             <strong>${kr(s.extraJobGross)}</strong> mere i løn før skat – omkring
             <strong>${Math.ceil(s.extraHoursPerMonth)} timer om måneden</strong> (${Math.ceil(s.extraHoursPerMonth / 4.33)} timer om ugen).</li>`
          : '<li>Du har dækket hele behovet. 🎉</li>'}
      </ul>
      <label class="field inline">Timeløn før skat
        <input type="number" inputmode="numeric" min="1" step="5" value="${s.hourlyWage}" data-setting="hourlyWage" data-fid="hourlyWage"> kr.
      </label>
    </section>

    <section class="card">
      <h2>Råd til dit budget</h2>
      <ul class="advice">${advice(b, s).map((a) => `<li class="${a.level}"><span aria-hidden="true">${ICON[a.level]}</span> ${esc(a.text)}</li>`).join('')}</ul>
    </section>

    <section class="card">
      <h2>Hvor går pengene hen?</h2>
      ${cats.length ? `<ul class="bars">${cats.map((c) => `
        <li>
          <div class="bar-label"><span>${c.icon} ${esc(c.label)}</span><span>${kr(c.total)} · ${pct(c.total)} %</span></div>
          <div class="bar"><span style="width:${(c.total / max) * 100}%"></span></div>
        </li>`).join('')}</ul>` : '<p class="muted">Ingen udgifter endnu.</p>'}
      <div class="result-grid kinds">
        <div><small>Faste udgifter</small><strong>${kr(s.byKind.fixed)}</strong></div>
        <div><small>Variable udgifter</small><strong>${kr(s.byKind.variable)}</strong></div>
        <div><small>Opsparing</small><strong>${kr(s.byKind.savings)}</strong></div>
      </div>
      <p class="muted">Faste udgifter kommer hver måned, uanset hvad du gør. De variable kan du selv skrue på.</p>
    </section>

    <section class="card">
      <h2>Skat (skøn)</h2>
      <p class="muted">Vi regner skatten forenklet. Find dine egne tal på skattekortet i skat.dk-appen, så bliver det mere præcist.</p>
      <label class="field inline">Trækprocent
        <input type="number" inputmode="decimal" min="0" max="60" step="1" value="${Math.round(b.tax.taxRate * 100)}" data-setting="taxRate" data-fid="taxRate"> %
      </label>
      <label class="field inline">Fradrag pr. måned
        <input type="number" inputmode="numeric" min="0" step="100" value="${b.tax.monthlyAllowance}" data-setting="monthlyAllowance" data-fid="monthlyAllowance"> kr.
      </label>
      <p class="muted">Skat i alt: ca. ${kr(s.income.totalTax)} pr. måned. Satser for ${RATES.year}.</p>
    </section>

    <section class="card no-print">
      <h2>Gem og del</h2>
      <div class="btn-row">
        <button class="btn btn-primary" data-action="csv">Hent til Excel (CSV)</button>
        <button class="btn" data-action="print">Udskriv / gem som PDF</button>
        <button class="btn" data-action="json">Hent backup</button>
        <label class="btn">Indlæs backup<input type="file" accept="application/json,.json" data-action="import" hidden></label>
      </div>
      <p class="muted">Budgettet ligger kun i denne browser. Hent en backup, hvis du vil flytte det til en anden enhed.</p>
    </section>`;
}

export function handle(type, ev, store) {
  const el = ev.target;
  const b = activeBudget(store.get());
  if (type === 'change' && el.dataset.setting) {
    const v = Number(el.value);
    if (!Number.isFinite(v) || v < 0) return;
    store.update((s) => {
      const bud = activeBudget(s);
      if (el.dataset.setting === 'hourlyWage') bud.profile.hourlyWage = Math.max(1, v);
      if (el.dataset.setting === 'taxRate') bud.tax.taxRate = Math.min(60, v) / 100;
      if (el.dataset.setting === 'monthlyAllowance') bud.tax.monthlyAllowance = v;
    });
    return;
  }
  if (type === 'change' && el.dataset.action === 'import' && el.files?.[0]) {
    el.files[0].text().then((text) => {
      const imported = budgetFromJson(text);
      store.update((s) => {
        s.budgets.push(imported);
        s.activeBudgetId = imported.id;
      });
    }).catch((err) => alert('Kunne ikke indlæse filen: ' + err.message));
    return;
  }
  if (type !== 'click') return;
  const action = el.closest('button[data-action]')?.dataset.action;
  if (action === 'csv') download(slug(b.name) + '.csv', budgetToCsv(b), 'text/csv;charset=utf-8');
  if (action === 'json') download(slug(b.name) + '.json', budgetToJson(b), 'application/json');
  if (action === 'print') window.print();
}
