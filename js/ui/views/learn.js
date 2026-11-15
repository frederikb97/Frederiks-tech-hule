import { RATES } from '../../domain/rates.js';
import { esc, kr } from '../util.js';

export function render() {
  return `
    <h1 class="page-title">Sådan laver du et budget</h1>
    <section class="card">
      <p>Et budget er bare en liste over, hvad der kommer ind, og hvad der går ud – pr. måned. Det handler ikke om at spare på alt, men om at vide, hvad du har råd til.</p>
      <ol class="steps">
        <li><strong>Skriv dine indtægter ned.</strong> SU, løn, boligstøtte. Brug det beløb, der faktisk lander på kontoen – altså efter skat.</li>
        <li><strong>Find dine faste udgifter.</strong> Husleje, el, internet, telefon, forsikringer. Kig i din netbank under Betalingsservice.</li>
        <li><strong>Gør alt til månedsbeløb.</strong> En regning på 1.200 kr. hvert halve år koster 200 kr. om måneden. Appen regner om for dig.</li>
        <li><strong>Skøn de variable udgifter.</strong> Mad, tøj, byture. Er du i tvivl, så kig tre måneder tilbage på din konto.</li>
        <li><strong>Læg opsparing ind som en udgift.</strong> Så bliver den betalt først – ikke af det, der måske er tilbage.</li>
        <li><strong>Træk fra.</strong> Indtægter minus udgifter. Er tallet under nul, skal noget ændres: lavere udgifter eller højere indtægt.</li>
        <li><strong>Tjek igen efter en måned.</strong> Passede det? Ret tallene. Et budget bliver først godt, når det har mødt virkeligheden.</li>
      </ol>
    </section>
    <section class="card">
      <h2>Tre gode vaner</h2>
      <ul class="plain">
        <li><strong>Brug to konti.</strong> En budgetkonto til de faste regninger og en forbrugskonto til resten. Overfør et fast beløb til budgetkontoen, når SU'en kommer.</li>
        <li><strong>Tilmeld regninger til Betalingsservice.</strong> Så slipper du for rykkergebyrer.</li>
        <li><strong>Hav en buffer.</strong> Sigt efter en måneds udgifter på en opsparingskonto, før du sparer op til andet.</li>
      </ul>
    </section>
    <section class="card">
      <h2>Ord, du møder</h2>
      <dl class="glossary">
        <dt>SU</dt><dd>Statens Uddannelsesstøtte. Udeboende på en videregående uddannelse får ${kr(RATES.suUdeboendeGross)} om måneden før skat i ${RATES.year}. Er du fyldt 20 år og udeboende på en ungdomsuddannelse, får du det samme. Er du 18–19 år på en ungdomsuddannelse, får du normalt kun en grundsats på ${kr(RATES.suUngdomUnder20Gross)} plus et tillæg, der afhænger af dine forældres indkomst. Du betaler skat af SU.</dd>
        <dt>Fribeløb</dt><dd>Det, du må tjene ved siden af SU'en – som udgangspunkt ${kr(RATES.fribeloebMonthly)} om måneden på en videregående uddannelse og ${kr(RATES.fribeloebUngdomMonthly)} på en ungdomsuddannelse. Tjener du mere, skal du betale SU tilbage.</dd>
        <dt>SU-lån</dt><dd>Et lån fra staten oven i SU'en, ca. ${kr(RATES.suLoanMonthly)} om måneden. Det er billigt, men det er gæld og skal betales tilbage med renter.</dd>
        <dt>Boligstøtte</dt><dd>Tilskud til huslejen, hvis du bor til leje og har eget køkken. Beløbet afhænger af husleje og indkomst.</dd>
        <dt>Depositum og forudbetalt leje</dt><dd>Penge, du betaler udlejer ved indflytning – ofte tre måneders husleje i depositum plus op til tre måneder forudbetalt. Dem skal du have klar, før du flytter.</dd>
        <dt>A conto</dt><dd>Et fast månedligt beløb til fx varme og vand. En gang om året gøres det op, og du får penge tilbage eller en ekstraregning.</dd>
        <dt>Trækprocent og fradrag</dt><dd>Står på dit skattekort. Fradraget er det, du må tjene uden at betale skat. Af resten trækkes trækprocenten.</dd>
        <dt>AM-bidrag</dt><dd>8 % som trækkes af al løn, før resten af skatten beregnes. Du betaler det ikke af SU.</dd>
        <dt>Rådighedsbeløb</dt><dd>Det, du har tilbage, når de faste udgifter er betalt – til mad, tøj og fornøjelser.</dd>
      </dl>
    </section>
    <section class="card">
      <h2>Kilder</h2>
      <p class="muted">Beløbene i appen er vejledende startværdier for ${RATES.year}. Tjek altid de officielle sider:</p>
      <ul class="plain">${RATES.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('')}</ul>
    </section>`;
}
