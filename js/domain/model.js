// Datamodel for budgetmodellen. Ren data – ingen DOM, ingen lagring.
// Typerne er beskrevet med JSDoc, så editoren kan hjælpe uden et build-trin.

/**
 * @typedef {'month'|'quarter'|'halfyear'|'year'} Period
 * @typedef {'su'|'job'|'su_loan'|'boligstotte'|'parents'|'other'} IncomeType
 * @typedef {'fixed'|'variable'|'savings'} ExpenseKind
 * @typedef {'alone'|'shared'|'dorm'} Housing
 * @typedef {'kbh'|'aarhus'|'storby'|'other'} City
 *
 * @typedef {Object} Profile
 * @property {Housing} housing
 * @property {City} city
 * @property {boolean} hasCar
 * @property {'vu'|'uu'|'uu_u20'|'none'} [education]  Mangler i ældre data = 'vu'
 * @property {number} hourlyWage   Timeløn før skat, bruges til "hvor mange timer skal jeg arbejde"
 *
 * @typedef {Object} TaxSettings
 * @property {number} taxRate           Trækprocent som decimaltal (0.37)
 * @property {number} monthlyAllowance  Månedligt fradrag fra skattekortet
 * @property {number} amRate            Arbejdsmarkedsbidrag (0.08) – kun af løn
 *
 * @typedef {Object} Income
 * @property {string} id
 * @property {IncomeType} type
 * @property {string} label
 * @property {number} amount
 * @property {Period} period
 * @property {boolean} beforeTax  Kun relevant for su/job: er beløbet før skat?
 * @property {boolean} enabled
 *
 * @typedef {Object} Expense
 * @property {string} id
 * @property {string} categoryId
 * @property {string} label
 * @property {number} amount
 * @property {Period} period
 * @property {ExpenseKind} kind
 * @property {boolean} enabled
 * @property {string} [hint]
 *
 * @typedef {Object} MoveInItem
 * @property {string} id
 * @property {string} label
 * @property {number} amount
 * @property {boolean} enabled
 * @property {string} [hint]
 *
 * @typedef {Object} MoveIn  Engangsudgifter ved indflytning
 * @property {MoveInItem[]} items
 * @property {number} saved           Det, man allerede har sparet op
 * @property {number} monthlySaving   Det, man kan lægge til side pr. måned inden flytningen
 *
 * @typedef {Object} Budget
 * @property {string} id
 * @property {string} name
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {Profile} profile
 * @property {TaxSettings} tax
 * @property {Income[]} incomes
 * @property {Expense[]} expenses
 * @property {MoveIn} moveIn
 *
 * @typedef {Object} AppState
 * @property {number} schemaVersion
 * @property {string|null} activeBudgetId
 * @property {Budget[]} budgets
 */

export const SCHEMA_VERSION = 2;

/** Hvor mange måneder en periode dækker. */
export const PERIOD_MONTHS = { month: 1, quarter: 3, halfyear: 6, year: 12 };

export const PERIOD_LABELS = {
  month: 'pr. måned',
  quarter: 'pr. kvartal',
  halfyear: 'pr. halvår',
  year: 'pr. år',
};

export const INCOME_TYPES = {
  su: { label: 'SU', taxable: true },
  job: { label: 'Løn fra job', taxable: true },
  su_loan: { label: 'SU-lån', taxable: false },
  boligstotte: { label: 'Boligstøtte', taxable: false },
  parents: { label: 'Hjælp hjemmefra', taxable: false },
  other: { label: 'Andet', taxable: false },
};

export const KIND_LABELS = {
  fixed: 'Faste udgifter',
  variable: 'Variable udgifter',
  savings: 'Opsparing',
};

export const CATEGORIES = [
  { id: 'bolig', label: 'Bolig', icon: '🏠' },
  { id: 'mad', label: 'Mad og husholdning', icon: '🛒' },
  { id: 'abonnementer', label: 'Internet, telefon og abonnementer', icon: '📱' },
  { id: 'forsikring', label: 'Forsikringer', icon: '🛡️' },
  { id: 'transport', label: 'Transport', icon: '🚲' },
  { id: 'bil', label: 'Bil', icon: '🚗' },
  { id: 'personligt', label: 'Tøj og personlig pleje', icon: '👕' },
  { id: 'fornoejelser', label: 'Fornøjelser og fritid', icon: '🎉' },
  { id: 'studie', label: 'Studie', icon: '📚' },
  { id: 'opsparing', label: 'Opsparing og uforudsete udgifter', icon: '💰' },
];

export const HOUSING_LABELS = {
  alone: 'Egen lejlighed',
  shared: 'Deler lejlighed / bofællesskab',
  dorm: 'Kollegium / ungdomsbolig',
};

export const EDUCATION_LABELS = {
  vu: 'Videregående uddannelse (universitet, professionshøjskole, erhvervsakademi)',
  uu: 'Ungdomsuddannelse, og jeg er fyldt 20 år',
  uu_u20: 'Ungdomsuddannelse, og jeg er 18–19 år',
  none: 'Jeg får ikke SU (i lære med elevløn, eller i arbejde)',
};

export const CITY_LABELS = {
  kbh: 'København',
  aarhus: 'Aarhus',
  storby: 'Odense / Aalborg',
  other: 'Anden by',
};

export function uid() {
  return globalThis.crypto?.randomUUID?.() ??
    'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/** @param {AppState} state @returns {Budget|null} */
export function activeBudget(state) {
  return state.budgets.find((b) => b.id === state.activeBudgetId) ?? state.budgets[0] ?? null;
}
