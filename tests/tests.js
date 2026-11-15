// Kør: python3 -m http.server 8000  →  åbn http://localhost:8000/tests/
import { computeIncome, requiredExtraJobGross, summarize, taxOn, toMonthly, advice } from '../js/domain/calc.js';
import { createBudgetFromProfile } from '../js/domain/templates.js';
import { activeBudget } from '../js/domain/model.js';
import { createRepository, memoryAdapter, migrate, STORAGE_KEY } from '../js/data/storage.js';
import { budgetFromJson, budgetToCsv, budgetToJson } from '../js/data/exporters.js';
import { createStore } from '../js/ui/store.js';

const results = [];
const test = (name, fn) => {
  try { fn(); results.push('ok   ' + name); } catch (e) { results.push('FAIL ' + name + ' — ' + e.message); }
};
const eq = (a, b, msg = '') => { if (a !== b) throw new Error(`${msg} forventede ${b}, fik ${a}`); };
const near = (a, b, tol = 0.5) => { if (Math.abs(a - b) > tol) throw new Error(`forventede ≈${b}, fik ${a}`); };
const TAX = { taxRate: 0.4, monthlyAllowance: 4000, amRate: 0.08 };
const make = (over = {}) => {
  const b = createBudgetFromProfile({ housing: 'shared', city: 'aarhus', hasCar: false, jobGross: 0, ...over });
  b.tax = { ...TAX };
  return b;
};

test('toMonthly omregner perioder og afviser skrald', () => {
  eq(toMonthly(1200, 'halfyear'), 200); eq(toMonthly(1200, 'year'), 100); eq(toMonthly(900, 'quarter'), 300);
  eq(toMonthly(-5), 0); eq(toMonthly('abc'), 0); eq(toMonthly(NaN), 0);
});
test('skat: SU bruger fradraget, løn betaler AM-bidrag', () => {
  const t = taxOn(7000, 5000, TAX);
  near(t.suTax, 1200); near(t.am, 400); near(t.jobTax, 1840);
});
test('skat: SU under fradraget giver resten af fradraget til lønnen', () => {
  const t = taxOn(3000, 5000, TAX);
  eq(t.suTax, 0); near(t.jobTax, (3000 + 4600 - 4000) * 0.4);
});
test('indtægt: netto pr. række og i alt', () => {
  const b = make({ jobGross: 5000 });
  b.incomes.find((i) => i.type === 'su').amount = 7000;
  const inc = computeIncome(b);
  near(inc.suNet, 5800); near(inc.totalNet, 5800 + 5000 - 400 - 1840); near(inc.otherNet, 2760);
});
test('indtægt: "efter skat" og slåede-fra rækker', () => {
  const b = make();
  const su = b.incomes.find((i) => i.type === 'su');
  su.beforeTax = false; su.amount = 6000;
  near(computeIncome(b).totalNet, 6000);
  su.enabled = false;
  eq(computeIncome(b).totalNet, 0);
});
test('ekstra løn: det fundne beløb dækker præcis hullet', () => {
  const g = requiredExtraJobGross(2000, 7000, 0, TAX);
  near(g, 2000 / (0.92 * 0.6), 1);
  eq(requiredExtraJobGross(0, 7000, 0, TAX), 0);
});
test('opsummering: balance, behov ud over SU, kategorier summer til total', () => {
  const b = make();
  const s = summarize(b);
  near(s.byCategory.reduce((a, c) => a + c.total, 0), s.expensesTotal, 0.01);
  near(s.byKind.fixed + s.byKind.variable + s.byKind.savings, s.expensesTotal, 0.01);
  near(s.balance, s.income.totalNet - s.expensesTotal, 0.01);
  near(s.needBeyondSu, s.expensesTotal - s.income.suNet, 0.01);
  if (!(s.shortfall > 0 && s.extraHoursPerMonth > 0)) throw new Error('forventede underskud på ren SU');
  eq(advice(b, s)[0].level, 'bad');
});
test('skabelon: bil slår bilposter til og offentlig transport fra', () => {
  const car = make({ hasCar: true });
  const on = (b, re) => b.expenses.filter((e) => re.test(e.label) && e.enabled).length;
  eq(on(car, /Bilforsikring/), 1); eq(on(car, /Bus, tog/), 0); eq(on(make(), /Bilforsikring/), 0);
  if (summarize(car).expensesTotal <= summarize(make()).expensesTotal) throw new Error('bil bør koste mere');
});
test('lager: gem/indlæs rundtur og robust mod skrald', () => {
  const a = memoryAdapter();
  const repo = createRepository(a);
  eq(repo.load().budgets.length, 0);
  const store = createStore(repo);
  const b = make();
  store.update((s) => { s.budgets.push(b); s.activeBudgetId = b.id; });
  const again = createRepository(a).load();
  eq(activeBudget(again).id, b.id); eq(again.budgets[0].expenses.length, b.expenses.length);
  a.setItem(STORAGE_KEY, '{ikke json');
  eq(createRepository(a).load().budgets.length, 0);
  eq(migrate({ budgets: [{ id: 1 }, b] }).budgets.length, 1);
});
test('eksport: CSV i dansk Excel-format, JSON-rundtur', () => {
  const b = make();
  b.expenses[0].label = 'Husleje; "stor"';
  const csv = budgetToCsv(b);
  if (!csv.startsWith('﻿Type;Kategori;Post')) throw new Error('mangler BOM/overskrift');
  if (!csv.includes('"Husleje; ""stor"""')) throw new Error('escaping fejler');
  if (!/Til overs;;;-?\d+(,\d+)?\r\n/.test(csv)) throw new Error('mangler resultatlinje');
  const back = budgetFromJson(budgetToJson(b));
  if (back.id === b.id) throw new Error('import skal give nyt id');
  eq(back.expenses.length, b.expenses.length);
  let threw = false; try { budgetFromJson('{"x":1}'); } catch { threw = true; }
  eq(threw, true);
});

const failed = results.filter((r) => r.startsWith('FAIL')).length;
document.getElementById('out').textContent = results.join('\n') + `\n\nRESULT: ${results.length - failed}/${results.length} bestået`;
document.title = failed ? 'FAIL' : 'PASS';
