import { activeBudget } from '../../domain/model.js';
import { advice, summarize, summarizeMoveIn } from '../../domain/calc.js';
import { RATES } from '../../domain/rates.js';
import { budgetFromJson, budgetToCsv, budgetToJson, download } from '../../data/exporters.js';
import { esc, kr, num, slug } from '../util.js';

const ICON = { bad: '⛔', warn: '⚠️', good: '✅', info: '💡' };

export function render(state) {
  const b = activeBudget(state);
  const s = summarize(b);
  const mi = summarizeMoveIn(b);
  const max = Math.max(1, ...s.byCategory.map((c) => c.total));
  const pct = (n) => (s.expensesTotal > 0 ? Math.round((n / s.expensesTotal) * 100) : 0);
  const cats = s.byCategory.filter((c) => c.total > 0).sort((a, z) => z.total - a.total);
  const neg = s.balance < 0;
  return `
    <h1 class="page-title">Overblik</h1>
    <p class="muted intro">${esc(b.name)}</p>
    <section class="banner ${neg ? 'is-neg' : 'is-pos'}">
      <small>${neg ? 'Der mangler hver måned' : 'Til overs hver måned'}</small>
      <strong class="banner-num">${kr(Math.abs(s.balance))}</strong>
      <div class="banner-split">
        <span><small>Indtægter efter skat</small><b>${kr(s.income.totalNet)}</b></span>
        <span><small>Udgifter</small><b>${kr(s.expensesTotal)}</b></span>
      </div>
    </section>

    <section class="card">
      <h2>Hvad skal du bruge ud over din SU?</h2>
      <p class="big">${kr(s.needBeyondSu)} <span class="muted">om måneden</span></p>
      <p>Din SU giver ca. <strong>${kr(s.income.suNet)}</strong> udbetalt. Dine udgifter er <strong>${kr(s.expensesTotal)}</strong>
      Forskellen skal komme fra job, boligstøtte, opsparing eller andet.</p>
      <ul class="plain">
        <li>Dine andre indtægter dækker allerede <strong>${kr(Math.min(s.income.otherNet, s.needBeyondSu))}</strong></li>
        ${s.shortfall > 0
          ? `<li>Der mangler stadig <strong class="neg">${kr(s.shortfall)}</strong>. Det svarer til ca.
             <strong>${kr(s.extraJobGross)}</strong> mere i løn før skat – omkring
             <strong>${Math.ceil(s.extraHoursPerMonth)} timer om måneden</strong> (${Math.ceil(s.extraHoursPerMonth / 4.33)} timer om ugen).</li>`
          : '<li>Du har dækket hele behovet. 🎉</li>'}
      </ul>
      <div class="settings">
        <fluent-text-field appearance="filled" type="number" min="1" value="${s.hourlyWage}" data-setting="hourlyWage" data-fid="hourlyWage">Timeløn før skat<span slot="end">kr.</span></fluent-text-field>
      </div>
    </section>

    <section class="card">
      <h2>Inden du flytter</h2>
      <p>Indflytningen koster ca. <strong>${kr(mi.total)}</strong> én gang. ${mi.missing > 0
        ? `Du mangler <strong class="neg">${kr(mi.missing)}</strong>${mi.months ? ` – ca. ${mi.months} måneders opsparing.` : ''}`
        : 'Det har du sparet op til. ✅'}</p>
      <fluent-anchor class="no-print" appearance="outline" href="#movein">Se indflytningsudgifter</fluent-anchor>
    </section>

    <section class="card">
      <h2>Råd til dit budget</h2>
      <ul class="advice">${advice(b, s).map((a) => `<li class="${a.level}"><span class="chip" aria-hidden="true">${ICON[a.level]}</span><span>${esc(a.text)}</span></li>`).join('')}</ul>
    </section>

    <section class="card">
      <h2>Hvor går pengene hen?</h2>
      ${cats.length ? `<ul class="bars">${cats.map((c) => `
        <li>
          <div class="bar-label"><span>${c.icon} ${esc(c.label)}</span><span><b>${kr(c.total)}</b> · ${pct(c.total)} %</span></div>
          <div class="bar"><span style="width:${(c.total / max) * 100}%"></span></div>
        </li>`).join('')}</ul>` : '<p class="muted">Ingen udgifter endnu.</p>'}
      <div class="stats">
        <div class="stat"><small>Faste udgifter</small><strong>${kr(s.byKind.fixed)}</strong></div>
        <div class="stat"><small>Variable udgifter</small><strong>${kr(s.byKind.variable)}</strong></div>
        <div class="stat"><small>Opsparing</small><strong>${kr(s.byKind.savings)}</strong></div>
      </div>
      <p class="muted">Faste udgifter kommer hver måned, uanset hvad du gør. De variable kan du selv skrue på.</p>
    </section>

    <section class="card">
      <h2>Skat (skøn)</h2>
      <p class="muted">Vi regner skatten forenklet. Find dine egne tal på skattekortet i skat.dk-appen, så bliver det mere præcist.</p>
      <div class="settings">
        <fluent-text-field appearance="filled" type="number" min="0" max="60" value="${Math.round(b.tax.taxRate * 100)}" data-setting="taxRate" data-fid="taxRate">Trækprocent<span slot="end">%</span></fluent-text-field>
        <fluent-text-field appearance="filled" type="number" min="0" value="${b.tax.monthlyAllowance}" data-setting="monthlyAllowance" data-fid="monthlyAllowance">Fradrag pr. måned<span slot="end">kr.</span></fluent-text-field>
      </div>
      <p class="muted">Skat i alt: ca. ${kr(s.income.totalTax)} pr. måned. Satser for ${RATES.year}.</p>
    </section>

    <section class="card no-print">
      <h2>Gem og del</h2>
      <div class="btn-row">
        <fluent-button appearance="accent" data-action="csv">Hent til Excel (CSV)</fluent-button>
        <fluent-button appearance="outline" data-action="print">Udskriv / gem som PDF</fluent-button>
        <fluent-button appearance="outline" data-action="json">Hent backup</fluent-button>
        <fluent-button appearance="outline" data-action="import-pick">Indlæs backup</fluent-button>
        <input type="file" accept="application/json,.json" data-action="import" hidden>
      </div>
      <p class="muted">Budgettet ligger kun i denne browser. Hent en backup, hvis du vil flytte det til en anden enhed.</p>
    </section>`;
}

export function handle(type, ev, store, root) {
  const el = ev.target;
  const b = activeBudget(store.get());
  if (type === 'change' && el.dataset?.setting) {
    const v = num(el.value);
    const next = { hourlyWage: Math.max(1, v), taxRate: Math.min(60, v) / 100, monthlyAllowance: v }[el.dataset.setting];
    const target = el.dataset.setting === 'hourlyWage' ? b.profile : b.tax;
    if (next === undefined || target[el.dataset.setting] === next) return;
    store.update(() => void (target[el.dataset.setting] = next));
    return;
  }
  if (type === 'change' && el.dataset?.action === 'import' && el.files?.[0]) {
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
  const action = el.closest('[data-action]')?.dataset.action;
  if (action === 'csv') download(slug(b.name) + '.csv', budgetToCsv(b), 'text/csv;charset=utf-8');
  if (action === 'json') download(slug(b.name) + '.json', budgetToJson(b), 'application/json');
  if (action === 'print') window.print();
  if (action === 'import-pick') root.querySelector('input[data-action="import"]').click();
}
