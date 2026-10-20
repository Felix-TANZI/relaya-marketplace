// Montants (CRD-12, CCH-31, CPY-57) : le serveur renvoie des francs entiers ; une seule fonction les écrit,
// comme F() du prototype : milliers séparés par une espace insécable U+00A0, vrai signe moins.
// En anglais, t() convertit ensuite « 30 000 F » en « 30,000 F » (i18n/texte.ts).
//
// Devise d'affichage (DP-54, comptes diaspora seulement) : F CFA par défaut ; un compte diaspora peut choisir
// l'euro (parité fixe 1 € = 655,957 F) ou le dollar US (taux du jour du prestataire, figé au paiement ; taux de
// démonstration TAUX_DOLLAR_DEMO). F() écrit alors la devise d'abord, puis le franc CFA, qui reste la monnaie
// de la commande : « 45,73 € · 30 000 » suivi du « F » de l'écran → « 45,73 € · 30 000 F ». Les autres comptes
// et les tests gardent le franc CFA seul. La devise est posée par la session (session.tsx : reglerDevise).
import { NB } from './texte'

export type Devise = 'XAF' | 'EUR' | 'USD'
export const PARITE_EURO = 655.957 // parité fixe franc CFA / euro (BEAC)
export const TAUX_DOLLAR_DEMO = 603.5 // dollar US : taux du jour du prestataire en production ; valeur de démonstration

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
  const v = Math.abs(n) / (d === 'EUR' ? PARITE_EURO : TAUX_DOLLAR_DEMO)
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
  return devise === 'XAF' ? FCFA(n) : enDevise(n, devise) + ' · ' + FCFA(n)
}

// Badges : masqués à 0, « 99+ » au-delà de 99 (CNV-07, NOT-BADGE-MAX).
export function badge(n: number): string | null {
  if (!n || n <= 0) return null
  return n > 99 ? '99+' : String(n)
}
