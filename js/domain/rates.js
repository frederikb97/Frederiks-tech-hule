// Satser og vejledende beløb. Alt her er STARTVÆRDIER, som brugeren kan rette.
// Opdatér denne fil én gang om året (satserne reguleres hver 1. januar).

export const RATES = {
  year: 2026,
  /** SU til udeboende på videregående uddannelse, kr./md. før skat. */
  suUdeboendeGross: 7426,
  /** Grundsats for 18-19-årige på ungdomsuddannelse, kr./md. før skat. Tillæg afhænger af forældrenes indkomst. */
  suUngdomUnder20Gross: 1154,
  /** Laveste fribeløb, videregående uddannelse, kr./md. */
  fribeloebMonthly: 20749,
  /** Laveste fribeløb, ungdomsuddannelse, kr./md. */
  fribeloebUngdomMonthly: 15297,
  /** SU-lån, kr./md. – ca.-beløb, tjek su.dk. */
  suLoanMonthly: 3799,
  tax: {
    taxRate: 0.37, // typisk trækprocent – står på skattekortet
    monthlyAllowance: 4500, // ca. personfradrag pr. måned
    amRate: 0.08, // arbejdsmarkedsbidrag af løn (ikke af SU)
  },
  defaultHourlyWage: 140,
  sources: [
    { label: 'SU-satser (su.dk)', url: 'https://www.su.dk/satser' },
    { label: 'Fribeløb (su.dk)', url: 'https://www.su.dk/su/saa-meget-maa-du-tjene-fribeloeb' },
    { label: 'Dit skattekort (skat.dk)', url: 'https://skat.dk' },
    { label: 'Boligstøtte (borger.dk)', url: 'https://www.borger.dk/bolig-og-flytning/Boligstoette-oversigt' },
  ],
};

/** Vejledende husleje pr. måned – grove skøn, varierer meget. */
export const RENT_GUIDE = {
  kbh: { alone: 8500, shared: 5500, dorm: 4000 },
  aarhus: { alone: 7000, shared: 4500, dorm: 3500 },
  storby: { alone: 5500, shared: 3800, dorm: 3000 },
  other: { alone: 4800, shared: 3300, dorm: 2800 },
};
