import { activeBudget, uid } from '../../domain/model.js';
import { summarizeMoveIn } from '../../domain/calc.js';
import { esc, kr } from '../util.js';

const status = (m) => {
  if (m.missing === 0) return m.total > 0 ? 'Du har sparet nok op. ✅' : 'Ingen udgifter endnu.';
  if (m.months === null) return 'Skriv, hvad du kan lægge til side om måneden, så regner vi ud, hvornår du er klar.';
  return `Lægger du ${kr(m.monthlySaving)} til side om måneden, er du klar om ca. ${m.months} ${m.months === 1 ? 'måned' : 'måneder'}.`;
};

export function render(state) {
  const b = activeBudget(state);
  const m = summarizeMoveIn(b);
  const attrs = (i, field) => `data-id="${esc(i.id)}" data-field="${field}" data-fid="mi:${esc(i.id)}:${field}"`;
  return `
    <h1 class="page-title">Inden du flytter</h1>
    <p class="muted intro">Det koster en klump penge at flytte ind – én gang. De skal være sparet op, <em>før</em> du får nøglen. De er ikke en del af månedsbudgettet.</p>
    <section class="card">
      <header class="card-head"><h2>📦 Engangsudgifter</h2><strong data-mi="total">${kr(m.total)}</strong></header>
      ${b.moveIn.items.map((i) => `
        <div class="row${i.enabled ? '' : ' off'}">
          <div class="row-main once">
            <input type="checkbox" ${i.enabled ? 'checked' : ''} ${attrs(i, 'enabled')} aria-label="Medregn ${esc(i.label)}">
            <input class="label" type="text" value="${esc(i.label)}" maxlength="80" ${attrs(i, 'label')} aria-label="Navn">
            <input class="amount" type="number" inputmode="decimal" min="0" step="any" value="${Number(i.amount) || 0}" ${attrs(i, 'amount')} aria-label="Beløb for ${esc(i.label)}">
            <button class="btn btn-ghost icon" data-action="remove" data-id="${esc(i.id)}" aria-label="Fjern ${esc(i.label)}" title="Fjern">✕</button>
          </div>
          ${i.hint ? `<div class="row-sub"><span class="muted">${esc(i.hint)}</span></div>` : ''}
        </div>`).join('')}
      <button class="btn" data-action="add">+ Tilføj udgift</button>
    </section>
    <section class="card">
      <h2>Har du pengene?</h2>
      <label class="field inline">Det har jeg sparet op
        <input type="number" inputmode="numeric" min="0" step="500" value="${m.saved}" data-setting="saved" data-fid="mi:saved"> kr.
      </label>
      <label class="field inline">Det kan jeg lægge til side pr. måned
        <input type="number" inputmode="numeric" min="0" step="100" value="${m.monthlySaving}" data-setting="monthlySaving" data-fid="mi:monthlySaving"> kr.
      </label>
      <div class="result-grid">
        <div><small>Koster i alt</small><strong data-mi="total">${kr(m.total)}</strong></div>
        <div><small>Opsparet</small><strong data-mi="saved">${kr(m.saved)}</strong></div>
        <div><small>Mangler</small><strong data-mi="missing" class="${m.missing > 0 ? 'neg' : 'pos'}">${kr(m.missing)}</strong></div>
      </div>
      <p data-mi="status">${esc(status(m))}</p>
    </section>
    <section class="card">
      <h2>Gode råd</h2>
      <ul class="plain">
        <li><strong>Tag billeder ved indflytning.</strong> Fotografér alle skader og ridser, og send dem til udlejer inden 14 dage. Det beskytter dit depositum.</li>
        <li><strong>Betal aldrig depositum kontant</strong> eller før du har set boligen og fået en underskrevet lejekontrakt.</li>
        <li><strong>Spørg om lån til depositum.</strong> Nogle kommuner tilbyder beboerindskudslån til almene boliger.</li>
        <li><strong>Køb brugt.</strong> Møbler og køkkenting kan ofte fås gratis eller billigt fra familie, genbrug og byttegrupper.</li>
      </ul>
    </section>`;
}

function refresh(root, state) {
  const m = summarizeMoveIn(activeBudget(state));
  const set = (key, text) => root.querySelectorAll(`[data-mi="${key}"]`).forEach((el) => (el.textContent = text));
  set('total', kr(m.total));
  set('saved', kr(m.saved));
  set('missing', kr(m.missing));
  set('status', status(m));
  root.querySelectorAll('[data-mi="missing"]').forEach((el) => (el.className = m.missing > 0 ? 'neg' : 'pos'));
}

export function handle(type, ev, store, root) {
  const el = ev.target;
  if (type === 'click') {
    const btn = el.closest('button[data-action]');
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
  const structural = el.type === 'checkbox';
  if ((type === 'input') === structural) return;
  store.update((s) => {
    const m = activeBudget(s).moveIn;
    if (setting) return void (m[setting] = Math.max(0, Number(el.value) || 0));
    const item = m.items.find((i) => i.id === id);
    if (!item) return;
    if (structural) item.enabled = el.checked;
    else item[field] = field === 'amount' ? Math.max(0, Number(el.value) || 0) : el.value;
  }, { silent: !structural });
  if (!structural) refresh(root, store.get());
}
