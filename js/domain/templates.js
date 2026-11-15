// Bygger et første budget ud fra få svar, så man ikke starter på et tomt ark.
import { uid } from './model.js';
import { RATES, RENT_GUIDE } from './rates.js';

const byHousing = (alone, shared, dorm) => (p) => ({ alone, shared, dorm })[p.housing];
const car = (p) => p.hasCar;
const noCar = (p) => !p.hasCar;

/** amount/enabled kan være et tal/boolean eller en funktion af profilen. */
const EXPENSE_TEMPLATE = [
  // Bolig
  { categoryId: 'bolig', label: 'Husleje', kind: 'fixed', amount: (p) => RENT_GUIDE[p.city][p.housing],
    hint: 'Din største udgift. Brug det rigtige tal fra lejekontrakten.' },
  { categoryId: 'bolig', label: 'El, vand og varme', kind: 'fixed', amount: byHousing(600, 400, 250),
    hint: 'Tjek om det er med i huslejen (a conto). Ellers betaler du selv.' },
  // Mad
  { categoryId: 'mad', label: 'Mad og dagligvarer', kind: 'variable', amount: byHousing(2600, 2400, 2400),
    hint: 'Ca. 80 kr. om dagen. Madplan og tilbud kan spare meget.' },
  { categoryId: 'mad', label: 'Rengøring, toiletpapir m.m.', kind: 'variable', amount: 150 },
  // Abonnementer
  { categoryId: 'abonnementer', label: 'Internet', kind: 'fixed', amount: byHousing(250, 100, 80),
    hint: 'Deler I, så del regningen. På kollegier er det ofte billigt eller inkluderet.' },
  { categoryId: 'abonnementer', label: 'Mobilabonnement', kind: 'fixed', amount: 120 },
  { categoryId: 'abonnementer', label: 'Streaming og musik', kind: 'fixed', amount: 150,
    hint: 'Små abonnementer løber hurtigt op – tæl dem alle med.' },
  // Forsikring
  { categoryId: 'forsikring', label: 'Indboforsikring', kind: 'fixed', amount: 130,
    hint: 'Dækker dine ting ved brand, tyveri og vandskade – og ansvar, hvis du skader andres ting. Vigtig!' },
  { categoryId: 'forsikring', label: 'Ulykkesforsikring', kind: 'fixed', amount: 100,
    hint: 'Udbetaler erstatning, hvis du får varige mén.' },
  { categoryId: 'forsikring', label: 'A-kasse / fagforening', kind: 'fixed', amount: 0, enabled: false,
    hint: 'A-kasse er typisk gratis for studerende under 30 år.' },
  // Transport
  { categoryId: 'transport', label: 'Cykel (vedligehold og lygter)', kind: 'variable', amount: 75 },
  { categoryId: 'transport', label: 'Bus, tog og metro', kind: 'variable', amount: 400, enabled: noCar,
    hint: 'Pendler du fast, så se på Ungdomskort.' },
  // Bil
  { categoryId: 'bil', label: 'Billån / opsparing til ny bil', kind: 'fixed', amount: 1500, enabled: car },
  { categoryId: 'bil', label: 'Bilforsikring', kind: 'fixed', amount: 800, enabled: car,
    hint: 'Unge bilister betaler ofte meget – indhent flere tilbud.' },
  { categoryId: 'bil', label: 'Grøn ejerafgift', kind: 'fixed', amount: 1800, period: 'halfyear', enabled: car,
    hint: 'Betales et par gange om året – derfor står den pr. halvår.' },
  { categoryId: 'bil', label: 'Brændstof / opladning', kind: 'variable', amount: 1000, enabled: car },
  { categoryId: 'bil', label: 'Værksted, dæk og syn', kind: 'variable', amount: 6000, period: 'year', enabled: car },
  { categoryId: 'bil', label: 'Parkering', kind: 'fixed', amount: 0, enabled: false },
  // Personligt
  { categoryId: 'personligt', label: 'Tøj og sko', kind: 'variable', amount: 400 },
  { categoryId: 'personligt', label: 'Frisør', kind: 'variable', amount: 150 },
  { categoryId: 'personligt', label: 'Personlig pleje', kind: 'variable', amount: 200 },
  { categoryId: 'personligt', label: 'Medicin, tandlæge og briller', kind: 'variable', amount: 150 },
  // Fornøjelser
  { categoryId: 'fornoejelser', label: 'Byture, café og takeaway', kind: 'variable', amount: 600 },
  { categoryId: 'fornoejelser', label: 'Sport og fritid', kind: 'fixed', amount: 250,
    hint: 'Fitness, klubkontingent, hobby.' },
  { categoryId: 'fornoejelser', label: 'Gaver', kind: 'variable', amount: 150 },
  { categoryId: 'fornoejelser', label: 'Ferie og rejser', kind: 'variable', amount: 300 },
  // Studie
  { categoryId: 'studie', label: 'Bøger og materialer', kind: 'variable', amount: 250,
    hint: 'Køb brugt, eller lån på biblioteket.' },
  // Opsparing
  { categoryId: 'opsparing', label: 'Opsparing (buffer)', kind: 'savings', amount: 500,
    hint: 'Sæt det til side den dag, pengene kommer – ikke det, der er tilbage sidst på måneden.' },
  { categoryId: 'opsparing', label: 'Uforudsete udgifter', kind: 'variable', amount: 300,
    hint: 'Cyklen punkterer, telefonen går i stykker. Det sker altid.' },
];

const resolve = (v, profile, fallback) =>
  typeof v === 'function' ? v(profile) : v ?? fallback;

/**
 * @param {{name?: string, housing: string, city: string, hasCar: boolean, jobGross?: number}} input
 * @returns {import('./model.js').Budget}
 */
export function createBudgetFromProfile(input) {
  const profile = {
    housing: input.housing,
    city: input.city,
    hasCar: !!input.hasCar,
    hourlyWage: RATES.defaultHourlyWage,
  };
  const now = new Date().toISOString();
  const income = (type, label, amount, enabled, beforeTax = false) => ({
    id: uid(), type, label, amount, period: 'month', beforeTax, enabled,
  });
  const jobGross = Math.max(0, Number(input.jobGross) || 0);
  return {
    id: uid(),
    name: input.name?.trim() || 'Mit budget',
    createdAt: now,
    updatedAt: now,
    profile,
    tax: { ...RATES.tax },
    incomes: [
      income('su', 'SU (udeboende)', RATES.suUdeboendeGross, true, true),
      income('job', 'Studiejob', jobGross, jobGross > 0, true),
      income('boligstotte', 'Boligstøtte', 0, false),
      income('su_loan', 'SU-lån', RATES.suLoanMonthly, false),
      income('parents', 'Hjælp hjemmefra', 0, false),
    ],
    expenses: EXPENSE_TEMPLATE.map((t) => ({
      id: uid(),
      categoryId: t.categoryId,
      label: t.label,
      amount: resolve(t.amount, profile, 0),
      period: t.period ?? 'month',
      kind: t.kind,
      enabled: resolve(t.enabled, profile, true),
      hint: t.hint ?? '',
    })),
  };
}
