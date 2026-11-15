import { CITY_LABELS, HOUSING_LABELS, activeBudget } from '../../domain/model.js';
import { createBudgetFromProfile } from '../../domain/templates.js';
import { RATES } from '../../domain/rates.js';
import { esc, kr, options } from '../util.js';

export function render(state) {
  const current = activeBudget(state);
  const list = state.budgets.length
    ? `<section class="card">
        <h2>Dine budgetter</h2>
        <ul class="budget-list">
          ${state.budgets.map((b) => `
            <li>
              <span><strong>${esc(b.name)}</strong>${b.id === current?.id ? ' <span class="tag">åbent</span>' : ''}<br>
              <small class="muted">${esc(HOUSING_LABELS[b.profile.housing] ?? '')} · ${esc(CITY_LABELS[b.profile.city] ?? '')}</small></span>
              <span class="row-actions">
                <button class="btn" data-action="open" data-id="${esc(b.id)}">Åbn</button>
                <button class="btn btn-ghost" data-action="delete" data-id="${esc(b.id)}" aria-label="Slet ${esc(b.name)}">Slet</button>
              </span>
            </li>`).join('')}
        </ul>
      </section>`
    : '';
  return `
    <section class="hero">
      <h1>Skal du flytte hjemmefra?</h1>
      <p>Få styr på, hvad det koster at bo for sig selv – og hvor mange penge du skal bruge ud over din SU.
      Svar på fem spørgsmål, så laver vi et første budget, som du kan rette til.</p>
    </section>
    ${list}
    <form class="card" data-action="create">
      <h2>${state.budgets.length ? 'Lav et nyt budget' : 'Lav dit første budget'}</h2>
      <label class="field">Hvad skal budgettet hedde?
        <input name="name" type="text" placeholder="Mit budget" maxlength="60">
      </label>
      <fieldset class="field">
        <legend>1. Hvordan skal du bo?</legend>
        ${Object.entries(HOUSING_LABELS).map(([v, l], i) => `
          <label class="choice"><input type="radio" name="housing" value="${v}"${i === 1 ? ' checked' : ''}> ${esc(l)}</label>`).join('')}
      </fieldset>
      <label class="field">2. Hvor skal du bo?
        <select name="city">${options(CITY_LABELS, 'aarhus')}</select>
      </label>
      <fieldset class="field">
        <legend>3. Har du bil?</legend>
        <label class="choice"><input type="checkbox" name="hasCar"> Ja, jeg har (eller vil have) bil</label>
      </fieldset>
      <fieldset class="field">
        <legend>4. Får du SU?</legend>
        <label class="choice"><input type="radio" name="hasSu" value="yes" checked> Ja, jeg er (eller bliver) studerende</label>
        <label class="choice"><input type="radio" name="hasSu" value="no"> Nej, jeg er i lære eller arbejder</label>
      </fieldset>
      <label class="field">5. Hvad tjener du på et job om måneden – før skat?
        <input name="jobGross" type="number" inputmode="numeric" min="0" step="100" placeholder="0">
        <small class="muted">Skriv 0, hvis du ikke har et job. Elevløn og fuldtidsløn skrives også her. Får du SU, lægger vi ${kr(RATES.suUdeboendeGross)} før skat ind for dig.</small>
      </label>
      <button class="btn btn-primary" type="submit">Lav mit budget</button>
    </form>`;
}

export function handle(type, ev, store) {
  if (type === 'submit') {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const budget = createBudgetFromProfile({
      name: f.get('name'),
      housing: f.get('housing'),
      city: f.get('city'),
      hasCar: f.get('hasCar') === 'on',
      jobGross: f.get('jobGross'),
      hasSu: f.get('hasSu') !== 'no',
    });
    store.update((s) => {
      s.budgets.push(budget);
      s.activeBudgetId = budget.id;
    });
    location.hash = 'budget';
    return;
  }
  if (type !== 'click') return;
  const btn = ev.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === 'open') {
    store.update((s) => void (s.activeBudgetId = id));
    location.hash = 'budget';
  }
  if (btn.dataset.action === 'delete') {
    const b = store.get().budgets.find((x) => x.id === id);
    if (!b || !confirm(`Vil du slette "${b.name}"? Det kan ikke fortrydes.`)) return;
    store.update((s) => {
      s.budgets = s.budgets.filter((x) => x.id !== id);
      if (s.activeBudgetId === id) s.activeBudgetId = s.budgets[0]?.id ?? null;
    });
  }
}
