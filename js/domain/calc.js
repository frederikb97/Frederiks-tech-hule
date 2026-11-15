// Alle beregninger. Rene funktioner: budget ind, tal ud.
import { CATEGORIES, INCOME_TYPES, PERIOD_MONTHS } from './model.js';
import { RATES } from './rates.js';

/** Omregner et beløb til kr. pr. måned. Ugyldige og negative tal tæller som 0. */
export function toMonthly(amount, period = 'month') {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n / (PERIOD_MONTHS[period] ?? 1);
}

/**
 * Forenklet skat pr. måned. SU bruger fradraget først; løn betaler AM-bidrag.
 * Det er et skøn – beskæftigelsesfradrag m.m. er udeladt, så det rammer lidt forsigtigt.
 */
export function taxOn(suGross, jobGross, tax) {
  const am = jobGross * tax.amRate;
  const suTax = Math.max(0, suGross - tax.monthlyAllowance) * tax.taxRate;
  const total = Math.max(0, suGross + jobGross - am - tax.monthlyAllowance) * tax.taxRate;
  return { am, suTax, jobTax: total - suTax };
}

/** @param {import('./model.js').Budget} budget */
export function computeIncome(budget) {
  const active = budget.incomes.filter((i) => i.enabled);
  const isGross = (i) => i.beforeTax && INCOME_TYPES[i.type]?.taxable;
  const monthly = new Map(active.map((i) => [i.id, toMonthly(i.amount, i.period)]));
  const sum = (pred) => active.filter(pred).reduce((s, i) => s + monthly.get(i.id), 0);

  const suGross = sum((i) => i.type === 'su' && isGross(i));
  const jobGross = sum((i) => i.type === 'job' && isGross(i));
  const { am, suTax, jobTax } = taxOn(suGross, jobGross, budget.tax);

  const rows = active.map((i) => {
    const gross = monthly.get(i.id);
    let net = gross;
    if (isGross(i) && i.type === 'su' && suGross > 0) net = gross - suTax * (gross / suGross);
    if (isGross(i) && i.type === 'job' && jobGross > 0) net = gross - (am + jobTax) * (gross / jobGross);
    return { id: i.id, type: i.type, label: i.label, gross, net };
  });
  const netOf = (type) => rows.filter((r) => r.type === type).reduce((s, r) => s + r.net, 0);
  const totalNet = rows.reduce((s, r) => s + r.net, 0);
  return {
    rows,
    suGross,
    jobGross,
    suNet: netOf('su'),
    totalNet,
    otherNet: totalNet - netOf('su'),
    totalTax: am + suTax + jobTax,
  };
}

/** Hvor meget EKSTRA løn før skat skal der til for at få `netNeeded` mere udbetalt? */
export function requiredExtraJobGross(netNeeded, suGross, jobGross, tax) {
  if (netNeeded <= 0) return 0;
  const netFromJob = (g) => {
    const t = taxOn(suGross, g, tax);
    return g - t.am - t.jobTax;
  };
  const base = netFromJob(jobGross);
  let lo = 0;
  let hi = netNeeded * 4 + 1000;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (netFromJob(jobGross + mid) - base < netNeeded) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** @param {import('./model.js').Budget} budget */
export function summarize(budget, rates = RATES) {
  const income = computeIncome(budget);
  const active = budget.expenses.filter((e) => e.enabled);
  const byKind = { fixed: 0, variable: 0, savings: 0 };
  const catTotals = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0]));
  let expensesTotal = 0;
  for (const e of active) {
    const m = toMonthly(e.amount, e.period);
    expensesTotal += m;
    byKind[e.kind] = (byKind[e.kind] ?? 0) + m;
    catTotals[e.categoryId] = (catTotals[e.categoryId] ?? 0) + m;
  }
  const balance = income.totalNet - expensesTotal;
  const shortfall = Math.max(0, -balance);
  const extraJobGross = requiredExtraJobGross(shortfall, income.suGross, income.jobGross, budget.tax);
  const wage = Number(budget.profile.hourlyWage) > 0 ? Number(budget.profile.hourlyWage) : rates.defaultHourlyWage;
  const jobAfterAm = (income.jobGross + extraJobGross) * (1 - budget.tax.amRate);
  return {
    income,
    expensesTotal,
    byKind,
    byCategory: CATEGORIES.map((c) => ({ ...c, total: catTotals[c.id] })),
    balance,
    /** Det, SU'en ikke dækker – svaret på "hvad skal jeg bruge ud over min SU?" */
    needBeyondSu: Math.max(0, expensesTotal - income.suNet),
    shortfall,
    extraJobGross,
    extraHoursPerMonth: extraJobGross / wage,
    hourlyWage: wage,
    fribeloebExceeded: jobAfterAm > rates.fribeloebMonthly,
  };
}

/** Engangsudgifter ved indflytning: hvad koster det, hvad mangler der, og hvor længe skal der spares? */
export function summarizeMoveIn(budget) {
  const m = budget.moveIn ?? { items: [], saved: 0, monthlySaving: 0 };
  const pos = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
  const total = m.items.filter((i) => i.enabled).reduce((s, i) => s + pos(i.amount), 0);
  const saved = pos(m.saved);
  const missing = Math.max(0, total - saved);
  const monthly = pos(m.monthlySaving);
  return { total, saved, missing, monthlySaving: monthly, months: missing === 0 ? 0 : monthly > 0 ? Math.ceil(missing / monthly) : null };
}

/** Konkrete råd ud fra tallene. @returns {{level: 'bad'|'warn'|'good'|'info', text: string}[]} */
export function advice(budget, s) {
  const out = [];
  const kr = (n) => Math.round(n).toLocaleString('da-DK') + ' kr.';
  const on = (pred) => budget.expenses.some((e) => e.enabled && toMonthly(e.amount, e.period) > 0 && pred(e));
  if (s.balance < 0) {
    out.push({ level: 'bad', text: `Der mangler ${kr(-s.balance)} om måneden. Skær i udgifterne, eller find en indtægt mere – ellers ender det i gæld.` });
  } else if (s.balance < 300) {
    out.push({ level: 'warn', text: `Budgettet går lige akkurat op (${kr(s.balance)} til overs). Der er ikke plads til overraskelser.` });
  } else {
    out.push({ level: 'good', text: `Budgettet hænger sammen med ${kr(s.balance)} til overs hver måned. Overvej at sætte noget af det på opsparingen.` });
  }
  const rent = s.byCategory.find((c) => c.id === 'bolig')?.total ?? 0;
  if (s.income.totalNet > 0 && rent / s.income.totalNet > 0.5) {
    out.push({ level: 'warn', text: `Boligen sluger ${Math.round((rent / s.income.totalNet) * 100)} % af din indtægt. Over halvdelen er sårbart – søg boligstøtte, eller se efter noget billigere.` });
  }
  if (!on((e) => e.kind === 'savings')) {
    out.push({ level: 'warn', text: 'Du sparer ikke op. Selv 200 kr. om måneden giver en buffer, når noget går i stykker.' });
  }
  if (!on((e) => /indbo/i.test(e.label))) {
    out.push({ level: 'warn', text: 'Du har ingen indboforsikring. Uden den hæfter du selv ved brand, tyveri, eller hvis du skader andres ting.' });
  }
  if (!budget.incomes.some((i) => i.enabled && i.type === 'boligstotte' && i.amount > 0) && budget.profile.housing !== 'shared') {
    out.push({ level: 'info', text: 'Har du din egen lejebolig med køkken, kan du ofte få boligstøtte. Beregn den på borger.dk, og skriv beløbet ind under indtægter.' });
  }
  if (s.fribeloebExceeded) {
    out.push({ level: 'warn', text: 'Din løn kommer tæt på eller over SU-fribeløbet. Tjener du for meget, skal du betale SU tilbage – tjek su.dk.' });
  }
  if (budget.incomes.some((i) => i.enabled && i.type === 'su_loan' && i.amount > 0)) {
    out.push({ level: 'info', text: 'SU-lån er et lån. Det skal betales tilbage med renter efter studiet, så lån kun det, du har brug for.' });
  }
  return out;
}
