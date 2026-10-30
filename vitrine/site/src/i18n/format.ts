// Montants (CRD-12, CCH-31, CPY-57) : le serveur renvoie des francs entiers ; une seule fonction les écrit,
// comme F() du prototype : milliers séparés par une espace insécable U+00A0, vrai signe moins.
// En anglais, t() convertit ensuite « 30 000 F » en « 30,000 F » (i18n/texte.ts).
//
// Devise d'affichage (DP-54, comptes diaspora seulement) : F CFA par défaut ; un compte diaspora peut choisir
// l'euro (parité fixe 1 € = 655,957 F) ou le dollar US (taux du jour du prestataire, figé au paiement). F() écrit
// alors la devise d'abord, puis le franc CFA, qui reste la monnaie de la commande : « 45,73 € · 30 000 » suivi du
// « F » de l'écran → « 45,73 € · 30 000 F ». Les autres comptes et les tests gardent le franc CFA seul. La devise
// est posée par la session (session.tsx : reglerDevise).
//
// Le taux du dollar est une donnée du prestataire, pas une règle : en démonstration, celui du jeu d'essai
// (src/demo/valeurs-essai.ts) ; avec l'API, inconnu tant que la session ne l'a pas posé (reglerTauxDollar). Sans
// taux, un montant en dollars s'écrit « — » et F() garde le franc CFA seul : jamais un taux inventé.
import { env } from '../config/env'
import { TAUX_DOLLAR_DEMO } from '../demo/valeurs-essai'
import { NB } from './texte'

export type Devise = 'XAF' | 'EUR' | 'USD'
export const PARITE_EURO = 655.957 // parité fixe franc CFA / euro (BEAC) : une règle, pas une donnée

let taux: number | null = env.source === 'api' ? null : TAUX_DOLLAR_DEMO
/** Taux du jour du dollar US (francs CFA pour 1 $), ou null s'il n'est pas encore connu. */
export const tauxDollar = (): number | null => taux
/** Posé par la session avec l'API : le taux du jour donné par le prestataire. */
export function reglerTauxDollar(t: number | null) {
  taux = t && t > 0 ? t : null
}
/** Montant en dollars à l'anglaise, comme les écrans de paiement depuis l'étranger : « $49.71 » (« $ — » sans taux). */
export function enDollars(n: number): string {
  return taux ? '$' + (n / taux).toFixed(2) : '$' + NB + '—'
}

let devise: Devise = 'XAF'
/** Posée par la session : 'XAF' pour tout compte qui n'est pas diaspora. */
export function reglerDevise(d: Devise) {
  devise = d
  // html[data-devise] : les prix plus longs (deux monnaies) peuvent passer à la ligne (styles/site.css).
  if (typeof document !== 'undefined') {
    if (d === 'XAF') delete document.documentElement.dataset.devise
    else document.documentElement.dataset.devise = d
  }
}
export const deviseAffichee = (): Devise => devise

const milliers = (n: number) => Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NB)

/** Montant en devise étrangère, au centime, à la française : « 45,73 € », « 49,71 $ US ». */
export function enDevise(n: number, d: Exclude<Devise, 'XAF'>): string {
  const diviseur = d === 'EUR' ? PARITE_EURO : taux
  if (!diviseur) return '—' + NB + '$' + NB + 'US'
  const v = Math.abs(n) / diviseur
  const [e, c] = v.toFixed(2).split('.')
  return (n < 0 ? '−' : '') + e.replace(/\B(?=(\d{3})+(?!\d))/g, NB) + ',' + c + NB + (d === 'EUR' ? '€' : '$' + NB + 'US')
}

/** Francs CFA seuls, quelle que soit la devise choisie (textes gardés, comptes, plafonds légaux). */
export function FCFA(n: number): string {
  return (n < 0 ? '−' : '') + milliers(n)
}

/** Nombre groupé par milliers (compteurs, quantités) : jamais converti. */
export const N = (n: number) => FCFA(n)

/** Prix affiché : franc CFA, précédé de la devise choisie par un compte diaspora. */
export function F(n: number): string {
  return devise === 'XAF' || (devise === 'USD' && !taux) ? FCFA(n) : enDevise(n, devise) + ' · ' + FCFA(n)
}

// Badges : masqués à 0, « 99+ » au-delà de 99 (CNV-07, NOT-BADGE-MAX).
export function badge(n: number): string | null {
  if (!n || n <= 0) return null
  return n > 99 ? '99+' : String(n)
}
