import { activeBudget, uid } from '../../domain/model.js';
import { summarizeMoveIn } from '../../domain/calc.js';
import { esc, kr, num } from '../util.js';

const status = (m) => {
  if (m.missing === 0) return m.total > 0 ? 'Du har sparet nok op. ✅' : 'Ingen udgifter endnu.';
  if (m.months === null) return 'Skriv, hvad du kan lægge til side om måneden, så regner vi ud, hvornår du er klar.';
  return `Lægger du ${kr(m.monthlySaving)} til side om måneden, er du klar om ca. ${m.months} ${m.months === 1 ? 'måned' : 'måneder'}.`;
};
const pct = (m) => (m.total > 0 ? Math.min(100, Math.round((m.saved / m.total) * 100)) : 0);

export function render(state) {
  const b = activeBudget(state);
  const m = summarizeMoveIn(b);
  const at = (i, field) => `data-id="${esc(i.id)}" data-field="${field}" data-fid="mi:${esc(i.id)}:${field}"`;
  return `
    <h1 class="page-title">Inden du flytter</h1>
    <p class="muted intro">Det koster en klump penge at flytte ind – én gang. De skal være sparet op, <em>før</em> du får nøglen. De er ikke en del af månedsbudgettet.</p>
    <section class="card">
      <h2>Har du pengene?</h2>
      <div class="stats">
        <div class="stat"><small>Koster i alt</small><strong data-mi="total">${kr(m.total)}</strong></div>
        <div class="stat"><small>Opsparet</small><strong data-mi="saved">${kr(m.saved)}</strong></div>
        <div class="stat"><small>Mangler</small><strong data-mi="missing" class="${m.missing > 0 ? 'neg' : 'pos'}">${kr(m.missing)}</strong></div>
      </div>
      <fluent-progress class="goal" min="0" max="100" value="${pct(m)}" aria-label="Andel sparet op"></fluent-progress>
      <p data-mi="status">${esc(status(m))}</p>
      <div class="settings">
        <fluent-text-field appearance="filled" type="number" min="0" value="${m.saved}" data-setting="saved" data-fid="mi:saved">Det har jeg sparet op<span slot="end">kr.</span></fluent-text-field>
        <fluent-text-field appearance="filled" type="number" min="0" value="${m.monthlySaving}" data-setting="monthlySaving" data-fid="mi:monthlySaving">Det kan jeg lægge til side pr. måned<span slot="end">kr.</span></fluent-text-field>
      </div>
    </section>
    <section class="card">
      <header class="card-head"><h2><span class="chip">📦</span> Engangsudgifter</h2><strong data-mi="total">${kr(m.total)}</strong></header>
      ${b.moveIn.items.map((i) => `
        <div class="row${i.enabled ? '' : ' off'}" data-row="${esc(i.id)}">
          <div class="row-main once">
            <fluent-checkbox ${i.enabled ? 'checked' : ''} ${at(i, 'enabled')} aria-label="Medregn ${esc(i.label)}"></fluent-checkbox>
            <fluent-text-field class="label" appearance="filled" value="${esc(i.label)}" maxlength="80" ${at(i, 'label')} aria-label="Navn"></fluent-text-field>
            <fluent-text-field class="amount" appearance="filled" type="number" min="0" value="${Number(i.amount) || 0}" ${at(i, 'amount')} aria-label="Beløb for ${esc(i.label)}"><span slot="end">kr.</span></fluent-text-field>
            <fluent-button class="icon" appearance="stealth" data-action="remove" data-id="${esc(i.id)}" aria-label="Fjern ${esc(i.label)}" title="Fjern">✕</fluent-button>
          </div>
          ${i.hint ? `<div class="row-sub"><span class="muted">${esc(i.hint)}</span></div>` : ''}
        </div>`).join('')}
      <fluent-button class="add" appearance="outline" data-action="add">+ Tilføj udgift</fluent-button>
    </section>
    <section class="card">
      <h2>Gode råd</h2>
      <ul class="tips">
        <li><span class="chip">📸</span><span><strong>Tag billeder ved indflytning.</strong> Fotografér alle skader og ridser, og send dem til udlejer inden 14 dage. Det beskytter dit depositum.</span></li>
        <li><span class="chip">✍️</span><span><strong>Betal aldrig depositum kontant</strong> eller før du har set boligen og fået en underskrevet lejekontrakt.</span></li>
        <li><span class="chip">🏦</span><span><strong>Spørg om lån til depositum.</strong> Nogle kommuner tilbyder beboerindskudslån til almene boliger.</span></li>
        <li><span class="chip">♻️</span><span><strong>Køb brugt.</strong> Møbler og køkkenting kan ofte fås gratis eller billigt fra familie, genbrug og byttegrupper.</span></li>
      </ul>
    </section>`;
}

function refresh(root, state) {
  const b = activeBudget(state);
  const m = summarizeMoveIn(b);
  const set = (key, text) => root.querySelectorAll(`[data-mi="${key}"]`).forEach((el) => (el.textContent = text));
  set('total', kr(m.total));
  set('saved', kr(m.saved));
  set('missing', kr(m.missing));
  set('status', status(m));
  root.querySelectorAll('[data-mi="missing"]').forEach((el) => (el.className = m.missing > 0 ? 'neg' : 'pos'));
  root.querySelector('fluent-progress.goal')?.setAttribute('value', pct(m));
  for (const i of b.moveIn.items) root.querySelector(`[data-row="${CSS.escape(i.id)}"]`)?.classList.toggle('off', !i.enabled);
}

export function handle(type, ev, store, root) {
  const el = ev.target;
  if (type === 'click') {
    const btn = el.closest('[data-action]');
    if (!btn) return;
    store.update((s) => {
      const m = activeBudget(s).moveIn;
      if (btn.dataset.action === 'remove') m.items = m.items.filter((i) => i.id !== btn.dataset.id);
      if (btn.dataset.action === 'add') m.items.push({ id: uid(), label: 'Ny udgift', amount: 0, enabled: true, hint: '' });
    });
    return;
  }
  const { id, field, setting } = el.dataset ?? {};
  if (!field && !setting) return;
  const isText = el.matches('fluent-text-field');
  if ((type === 'input') !== isText) return;
  const m = activeBudget(store.get()).moveIn;
  const target = setting ? m : m.items.find((i) => i.id === id);
  const key = setting ?? field;
  if (!target) return;
  const value = el.matches('fluent-checkbox') ? !!el.checked : key === 'label' ? el.value : num(el.value);
  if (target[key] === value) return;
  store.update(() => void (target[key] = value), { silent: true });
  refresh(root, store.get());
}
