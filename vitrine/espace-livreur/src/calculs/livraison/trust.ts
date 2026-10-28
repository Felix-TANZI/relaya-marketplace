// Trust Score du livreur et de l'entreprise, et leurs paliers : portage fidèle de moteurs/belivay_moteurs/trust_livraison.py
// (ENT-TSC-01 à 07, LIV-02-R032, ENT-PAL-02 ; DP-62 : O-07, L-03).
//   critère = Σ poids × 100 × succès ÷ Σ poids × unités (sans événement : 50) ; poids = 0,5^(âge ÷ 90)
//   brut    = 0,30 P + 0,25 Q + 0,20 L + 0,15 A + 0,10 F ; Trust = (k µ + n brut) ÷ (k + n), n = missions
//   veto ⇒ 39 au plus ; baisse ≤ 8 points par recalcul ; gelé après 30 jours sans mission (revue à 90 jours)
// Le score sert à l'affichage (entier) et à la décomposition (décimale) : nombres JavaScript, sans montant d'argent.
import { LIVRAISON, type ParametresTrust } from './vigueur'

export type Critere = 'Ponctualité' | 'Qualité' | 'Litiges'
export type Gravite = 'succès' | 'g1' | 'g2' | 'g3' | 'veto'
export interface Evenement {
  critere: Critere
  gravite: Gravite
  ageJours: number
}
const PT = () => LIVRAISON.entreprise.trust

export const poids = (ageJours: number, pt: ParametresTrust = PT()) => 0.5 ** (ageJours / pt.demiVieJours)
const unites = (g: Gravite, pt: ParametresTrust) => (g === 'succès' ? 1 : g === 'veto' ? pt.gravites.g3 : pt.gravites[g])

export function critere(evenements: Evenement[], c: Critere, pt: ParametresTrust = PT()): number {
  let num = 0
  let den = 0
  for (const e of evenements) {
    if (e.ageJours < 0 || !Number.isInteger(e.ageJours)) throw new RangeError(`âge invalide ${e.ageJours}`)
    if (e.critere !== c) continue
    const w = poids(e.ageJours, pt)
    if (e.gravite === 'succès') num += w * 100
    den += w * unites(e.gravite, pt)
  }
  return den ? num / den : pt.neutre
}

export function anciennete(mois: number, missions: number, pt: ParametresTrust = PT()): number {
  if (mois < 0 || missions < 0) throw new RangeError('mois et missions positifs ou nuls')
  return pt.anciennetePoints * Math.min(1, mois / pt.ancienneteMois) + pt.anciennetePoints * Math.min(1, missions / pt.ancienneteMissions)
}

export interface TrustScore {
  criteres: Record<keyof ParametresTrust['poids'], number>
  calcule: number
  score: number
  affiche: number
  veto: boolean
  gele: boolean
  revue: boolean
}

export function trustScore(evenements: Evenement[], mois: number, missions: number, certificationAJour: boolean, o: { precedent?: number | null; joursSansMission?: number } = {}, pt: ParametresTrust = PT()): TrustScore {
  const criteres = {
    Ponctualité: critere(evenements, 'Ponctualité', pt),
    Qualité: critere(evenements, 'Qualité', pt),
    Litiges: critere(evenements, 'Litiges', pt),
    Ancienneté: anciennete(mois, missions, pt),
    Formation: certificationAJour ? 100 : 0,
  }
  const brut = (Object.keys(pt.poids) as (keyof typeof criteres)[]).reduce((t, c) => t + criteres[c] * pt.poids[c], 0) / 100
  const calcule = (pt.k * pt.neutre + missions * brut) / (pt.k + missions)
  const veto = evenements.some((e) => e.gravite === 'veto')
  const precedent = o.precedent ?? null
  const sans = o.joursSansMission ?? 0
  let score = veto ? Math.min(calcule, pt.vetoPlafond) : calcule
  const gele = precedent !== null && sans >= pt.gelJours
  if (gele) score = precedent
  else if (precedent !== null && !veto) score = Math.max(score, precedent - pt.baisseMax)
  return { criteres, calcule, score, affiche: Math.floor(score + 0.5 + 1e-9), veto, gele, revue: sans >= 3 * pt.gelJours }
}

/** Σ (Trust × missions) ÷ Σ missions − pénalités propres, entre 0 et 100 ; sans mission, le neutre. */
export function trustEntreprise(livreurs: [number, number][], penalites: number, pt: ParametresTrust = PT()): number {
  if (penalites < 0 || livreurs.some(([, n]) => n < 0)) throw new RangeError('pénalités et missions positives ou nulles')
  const total = livreurs.reduce((t, [, n]) => t + n, 0)
  const moyenne = total ? livreurs.reduce((t, [s, n]) => t + s * n, 0) / total : pt.neutre
  return Math.min(Math.max(moyenne - penalites, 0), 100)
}

export type PalierLivraison = 'Nouveau' | 'Confirmé' | 'Or'
const ORDRE: PalierLivraison[] = ['Nouveau', 'Confirmé', 'Or']

/** Montée quand le seuil suivant est tenu 14 jours (Or : `conditionsOr`) ; descente proposée à une personne quand le
 * score reste sous le seuil du palier (moins 5 points pour l'entreprise) 14 jours de suite. Scores du plus ancien au plus récent. */
export function evolutionDuPalier(palier: PalierLivraison, scores: number[], o: { entreprise: boolean; conditionsOr?: boolean }, pt: ParametresTrust = PT()) {
  const derniers = scores.slice(-pt.tenueJours)
  const tenu = derniers.length === pt.tenueJours
  const rang = ORDRE.indexOf(palier)
  let nouveau = palier
  for (const suivant of ORDRE.slice(rang + 1)) {
    if (tenu && derniers.every((s) => s >= pt.seuils[suivant as 'Confirmé' | 'Or']) && (suivant !== 'Or' || o.conditionsOr !== false)) nouveau = suivant
  }
  let descenteProposee: PalierLivraison | null = null
  if (nouveau === palier && palier !== 'Nouveau' && tenu) {
    const ecart = o.entreprise ? pt.ecartDescenteEntreprise : pt.ecartDescenteLivreur
    if (derniers.every((s) => s < pt.seuils[palier] - ecart)) descenteProposee = ORDRE[rang - 1]
  }
  return { palier: nouveau, descenteProposee }
}
