// Navneforslag til budgetter – så man ikke ender med ti budgetter, der alle hedder "Mit budget".

export const NAME_IDEAS = [
  'Fuglen er fløjet',
  'Ud af reden',
  'Operation Egen Hule',
  'Nøglen til friheden',
  'Projekt Voksenliv',
  'Første kapitel',
  'Ny nøgle, nye regler',
  'Mit lille kongerige',
  'Hjemme hos mig selv',
  'Sparegrisen flytter ud',
  'Mor, jeg klarer det selv',
  'Fra SU til sushi',
  'Ramen og regninger',
  'Havregryn og husleje',
  'Rugbrød og regnskab',
  'Pasta-planen',
  'Lejlighed og latte',
  'Plan B(olig)',
  'Budget med udsigt',
  'Kassen stemmer',
  'Pengene på plads',
  'Til overs-klubben',
  'Månedens mission',
  'Flyvefærdig',
  'Kroner og kollegieliv',
  'Den store flytning',
];

/**
 * Henter `count` forskellige tilfældige navne og springer dem over, der allerede er i brug.
 * @param {number} count
 * @param {Iterable<string>} [taken]  Navne, der ikke må foreslås (fx eksisterende budgetter)
 * @param {() => number} [random]     Kan sættes i test for forudsigelige resultater
 */
export function suggestNames(count = 4, taken = [], random = Math.random) {
  const used = new Set([...taken].map((n) => n.trim().toLowerCase()));
  const pool = NAME_IDEAS.filter((n) => !used.has(n.toLowerCase()));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(0, count));
}
