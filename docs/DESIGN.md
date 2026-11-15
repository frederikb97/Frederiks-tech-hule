# Design: Flyt hjemmefra – budgetmodel

## Formål

Hjælpe unge, der skal flytte hjemmefra og ikke kender til privatøkonomi, med at

1. se **hvad det koster** at bo for sig selv (husleje, mad, forsikringer, tøj, fornøjelser, frisør, opsparing, internet, telefon, bil …),
2. se **hvad de skal bruge ud over deres SU** – og hvor mange timers arbejde det svarer til,
3. **lære at lave et budget** og selv rette det til, også i Excel.

Princip: man starter aldrig på et tomt ark. Fem spørgsmål giver et udfyldt budget med vejledende beløb, som man retter.

## Arkitektur

Statisk webapp uden build-trin og uden server: HTML, CSS og JavaScript-moduler. Data ligger i brugerens egen browser.

```
┌──────────────────────────── Browser ────────────────────────────┐
│  UI (js/ui)                                                      │
│   app.js      routing via #hash, tegner den aktive visning       │
│   views/      start · budget · movein · overview · learn         │
│   store.js    én tilstand; gemmer ved hver ændring               │
│   fluent.js   registrerer Fluent UI-komponenter og tema          │
│        │ læser/ændrer                    │ kalder                │
│        ▼                                 ▼                       │
│  Datalag (js/data)                 Domæne (js/domain)            │
│   storage.js   repository +         model.js     typer, kategorier│
│                migrering            rates.js     satser pr. år   │
│   exporters.js CSV / JSON           templates.js startbudget     │
│        │                            calc.js      alle beregninger│
│        ▼                                                         │
│   localStorage ("budgetmodel")                                   │
└──────────────────────────────────────────────────────────────────┘
```

Afhængigheder går kun nedad: `ui → data → domain`. Domænet er rene funktioner uden DOM og lagring, så det kan testes isoleret og genbruges, hvis der senere kommer en server eller en mobilapp.

**Brugerflade:** Fluent UI Web Components v2 (`<fluent-button>`, `<fluent-text-field>`, `<fluent-select>`, `<fluent-checkbox>`, `<fluent-accordion>` m.fl.). Biblioteket ligger i `vendor/fluent/` og indlæses som et almindeligt modul, så der stadig ikke er noget build-trin. Sidens egne farver bruger Fluents design-tokens, så lyst og mørkt tema følger enheden.

**Hvorfor sådan?**

- *Ingen server, ingen login:* økonomidata er private, og målgruppen skal i gang på et minut. Kan hostes gratis på GitHub Pages.
- *Intet build-trin:* kan redigeres og køres med en teksteditor og `python3 -m http.server`.
- *Repository med adapter:* `createRepository(adapter)` kræver kun `getItem`/`setItem`. Skal data senere synkroniseres til en server, skiftes adapteren – resten af appen er uændret.

## Datamodel

```
AppState
 ├─ schemaVersion : number          (til migrering af gemte data)
 ├─ activeBudgetId: string | null
 └─ budgets : Budget[]

Budget
 ├─ id, name, createdAt, updatedAt
 ├─ profile : Profile       education (vu|uu|uu_u20|none), housing (alone|shared|dorm), city (kbh|aarhus|storby|other),
 │                          hasCar, hourlyWage
 ├─ tax     : TaxSettings   taxRate, monthlyAllowance, amRate
 ├─ incomes : Income[]      id, type (su|job|su_loan|boligstotte|parents|other),
 │                          label, amount, period, beforeTax, enabled
 ├─ expenses: Expense[]     id, categoryId, label, amount, period,
 │                          kind (fixed|variable|savings), enabled, hint
 └─ moveIn  : MoveIn        items[] (id, label, amount, enabled, hint),
                            saved, monthlySaving
```

- **Period** (`month|quarter|halfyear|year`): beløb gemmes, som de står på regningen, og omregnes til måned ved beregning.
- **enabled**: poster kan slås fra uden at blive slettet – så kan man se, hvad man *kunne* have af udgifter (fx bil).
- **Kategorier** er en fast liste i `model.js` (bolig, mad, abonnementer, forsikring, transport, bil, personligt, fornøjelser, studie, opsparing). Udgifter peger på dem med `categoryId`.
- **moveIn** er engangsudgifter ved indflytning (depositum, forudbetalt leje, møbler). De holdes adskilt fra månedsbudgettet og skønnes ud fra huslejen. Kom til i skemaversion 2; ældre data og backups får den tilføjet ved indlæsning.
- Præcise typer står som JSDoc i `js/domain/model.js`.

## Beregninger (`calc.js`)

| Tal | Formel |
|---|---|
| Månedsbeløb | `beløb / antal måneder i perioden` |
| AM-bidrag | `løn × 8 %` (ikke af SU) |
| Skat | `max(0, SU + løn − AM − fradrag) × trækprocent`; SU bruger fradraget først |
| Til overs | `indtægter efter skat − udgifter` |
| **Behov ud over SU** | `max(0, udgifter − SU efter skat)` |
| Ekstra løn før skat | det lønbeløb, der efter AM og skat dækker underskuddet |
| Timer pr. måned | `ekstra løn / timeløn` |
| Indflytning mangler | `max(0, sum af engangsudgifter − opsparet)` |
| Måneder til klar | `mangler / månedlig opsparing`, rundet op |

Skatten er et bevidst forenklet skøn (uden beskæftigelsesfradrag m.m.). Brugeren kan rette trækprocent og fradrag eller indtaste beløb efter skat.

## Satser og vejledende beløb

Ligger samlet i `js/domain/rates.js` og `templates.js` og skal opdateres årligt. De er **startværdier**, ikke facit – især huslejen varierer meget.

## Test

- `tests/index.html` – beregninger, lager og eksport.
- `tests/e2e.html` – klikker appen igennem i en iframe (**rydder gemte data** på samme adresse).

## Mulige næste skridt

- Opfølgning: faktisk forbrug mod budget, måned for måned.
- Ægte `.xlsx`-eksport med formler; synkronisering mellem enheder.
