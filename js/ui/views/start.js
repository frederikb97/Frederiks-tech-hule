import { CITY_LABELS, EDUCATION_LABELS, HOUSING_LABELS, activeBudget } from '../../domain/model.js';
import { createBudgetFromProfile } from '../../domain/templates.js';
import { RATES } from '../../domain/rates.js';
import { esc, kr, num, options, radios } from '../util.js';

export function render(state) {
  const current = activeBudget(state);
  const list = state.budgets.length
    ? `<section class="card">
        <h2>Dine budgetter</h2>
        <ul class="budget-list">
          ${state.budgets.map((b) => `
            <li>
              <span><strong>${esc(b.name)}</strong>${b.id === current?.id ? ' <fluent-badge appearance="accent">åbent</fluent-badge>' : ''}<br>
              <small class="muted">${esc(HOUSING_LABELS[b.profile.housing] ?? '')} · ${esc(CITY_LABELS[b.profile.city] ?? '')}</small></span>
              <span class="row-actions">
                <fluent-button appearance="outline" data-action="open" data-id="${esc(b.id)}">Åbn</fluent-button>
                <fluent-button appearance="stealth" data-action="delete" data-id="${esc(b.id)}" aria-label="Slet ${esc(b.name)}">Slet</fluent-button>
              </span>
            </li>`).join('')}
        </ul>
      </section>`
    : '';
  return `
    <section class="hero">
      <p class="eyebrow">Dit første budget</p>
      <h1>Skal du flytte hjemmefra?</h1>
      <p>Få styr på, hvad det koster at bo for sig selv – og hvor mange penge du skal bruge ud over din SU.
      Svar på fem spørgsmål, så laver vi et budget, du kan rette til.</p>
      <ul class="hero-points">
        <li>⏱️ Tager et minut</li><li>🔒 Gemmes kun på din enhed</li><li>📊 Kan hentes til Excel</li>
      </ul>
    </section>
    ${list}
    <section class="card form">
      <h2>${state.budgets.length ? 'Lav et nyt budget' : 'Lav dit første budget'}</h2>
      <fluent-text-field name="name" appearance="filled" placeholder="Mit budget" maxlength="60">Hvad skal budgettet hedde?</fluent-text-field>

      <div class="q"><span class="step">1</span><div>
        <fluent-radio-group name="housing" orientation="vertical" value="shared">
          <label slot="label">Hvordan skal du bo?</label>${radios(HOUSING_LABELS)}
        </fluent-radio-group></div></div>

      <div class="q"><span class="step">2</span><div>
        <label class="q-label" id="city-label">Hvor skal du bo?</label>
        <fluent-select name="city" aria-labelledby="city-label">${options(CITY_LABELS, 'aarhus')}</fluent-select></div></div>

      <div class="q"><span class="step">3</span><div>
        <span class="q-label">Har du bil?</span>
        <fluent-checkbox name="hasCar">Ja, jeg har (eller vil have) bil</fluent-checkbox></div></div>

      <div class="q"><span class="step">4</span><div>
        <fluent-radio-group name="education" orientation="vertical" value="vu">
          <label slot="label">Hvad læser du?</label>${radios(EDUCATION_LABELS)}
        </fluent-radio-group>
        <small class="muted">Det afgør, hvor meget SU du får, og hvor meget du må tjene ved siden af.</small></div></div>

      <div class="q"><span class="step">5</span><div>
        <fluent-text-field name="jobGross" type="number" appearance="filled" placeholder="0" min="0">Hvad tjener du på et job om måneden – før skat?<span slot="end">kr.</span></fluent-text-field>
        <small class="muted">Skriv 0, hvis du ikke har et job. Elevløn og fuldtidsløn skrives også her. Din SU lægger vi selv ind (${kr(RATES.suUdeboendeGross)} før skat for udeboende).</small></div></div>

      <fluent-button class="cta" appearance="accent" data-action="create">Lav mit budget →</fluent-button>
    </section>`;
}

export function handle(type, ev, store, root) {
  if (type !== 'click') return;
  const btn = ev.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === 'create') {
    const val = (name) => root.querySelector(`[name="${name}"]`);
    const budget = createBudgetFromProfile({
      name: val('name').value,
      housing: val('housing').value || 'shared',
      city: val('city').value || 'aarhus',
      hasCar: !!val('hasCar').checked,
      education: val('education').value || 'vu',
      jobGross: num(val('jobGross').value),
    });
    store.update((s) => {
      s.budgets.push(budget);
      s.activeBudgetId = budget.id;
    });
    location.hash = 'budget';
  }
  if (action === 'open') {
    store.update((s) => void (s.activeBudgetId = id));
    location.hash = 'budget';
  }
  if (action === 'delete') {
    const b = store.get().budgets.find((x) => x.id === id);
    if (!b || !confirm(`Vil du slette "${b.name}"? Det kan ikke fortrydes.`)) return;
    store.update((s) => {
      s.budgets = s.budgets.filter((x) => x.id !== id);
      if (s.activeBudgetId === id) s.activeBudgetId = s.budgets[0]?.id ?? null;
    });
  }
}
