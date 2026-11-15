import { activeBudget } from '../domain/model.js';
import { createRepository } from '../data/storage.js';
import { createStore } from './store.js';
import * as start from './views/start.js';
import * as budget from './views/budget.js';
import * as movein from './views/movein.js';
import * as overview from './views/overview.js';
import * as learn from './views/learn.js';

const VIEWS = { start, budget, movein, overview, learn };
const NEEDS_BUDGET = new Set(['budget', 'movein', 'overview']);
const root = document.getElementById('app');
const store = createStore(createRepository(localStorage));

function viewName() {
  const has = !!activeBudget(store.get());
  const h = location.hash.slice(1);
  if (!VIEWS[h]) return has ? 'budget' : 'start';
  return NEEDS_BUDGET.has(h) && !has ? 'start' : h;
}

let shown = null;
function render() {
  const name = viewName();
  const fid = document.activeElement?.dataset?.fid;
  root.innerHTML = VIEWS[name].render(store.get());
  document.querySelectorAll('nav a').forEach((a) => {
    const on = a.getAttribute('href') === '#' + name;
    a.classList.toggle('active', on);
    on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
  if (fid) root.querySelector(`[data-fid="${CSS.escape(fid)}"]`)?.focus();
  if (shown !== name) window.scrollTo(0, 0);
  shown = name;
}

for (const type of ['click', 'input', 'change', 'submit']) {
  root.addEventListener(type, (ev) => VIEWS[viewName()].handle?.(type, ev, store, root));
}
store.subscribe(render);
window.addEventListener('hashchange', render);
render();
