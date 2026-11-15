# Flyt hjemmefra – budgetmodel

En lille webapp til unge, der skal flytte hjemmefra: lav et budget på et minut, se hvad du skal bruge ud over din SU, og lær hvordan et budget hænger sammen.

## Kør den

```sh
python3 -m http.server 8000
```

Åbn <http://localhost:8000>. (Filen kan ikke åbnes direkte fra disken – browsere kræver en webserver til JavaScript-moduler.)

Der er intet build-trin og ingen afhængigheder. Data gemmes kun i din egen browser.

## Test

Åbn <http://localhost:8000/tests/> (beregninger og data) og <http://localhost:8000/tests/e2e.html> (klik-igennem – rydder gemte budgetter).

## Mere

Datamodel, arkitektur og beregninger: [docs/DESIGN.md](docs/DESIGN.md). Satser og vejledende beløb rettes i `js/domain/rates.js` og `js/domain/templates.js`.
