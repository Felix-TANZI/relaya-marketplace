// Le temps d'une connexion (DP-53) : la méthode choisie (Google, Apple) et l'écran où revenir ensuite.
// Gardés dans la session de l'onglet : les liens internes des écrans de connexion ne les portent pas.
const METHODE = 'blv_connexion_methode'
export const retenir = (m: 'google' | 'apple') => () => {
  try {
    sessionStorage.setItem(METHODE, m)
  } catch {
    // Stockage refusé : Google par défaut.
  }
}
const SUITE = 'blv_connexion_suite'
export const garderSuite = (v: string | null) => {
  try {
    if (v) sessionStorage.setItem(SUITE, v)
    else sessionStorage.removeItem(SUITE)
  } catch {
    // Stockage refusé : retour à l'accueil.
  }
}
export const lireSuite = (): string => {
  try {
    return sessionStorage.getItem(SUITE) || '/'
  } catch {
    return '/'
  }
}
export const methode = (): 'google' | 'apple' => {
  try {
    return sessionStorage.getItem(METHODE) === 'apple' ? 'apple' : 'google'
  } catch {
    return 'google'
  }
}

// Après une connexion sans page demandée (accueil par défaut) : un compte diaspora arrive dans son espace diaspora
// (DP-54), quel que soit le moyen (Google, Apple, e-mail, numéro).
export const versApresConnexion = (s: { typeCompte?: 'standard' | 'diaspora' }, vers: string): string => (s.typeCompte === 'diaspora' && (vers === '/' || vers === '') ? '/espace-diaspora' : vers)
