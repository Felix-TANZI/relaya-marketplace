// Trust Score du relais, paliers, alerte « seuil proche » et contestation : PORTAGE FIDÈLE de moteurs/belivay_moteurs/
// relais.py (critere, satisfaction, anciennete, trust_relais, evolution_palier, alerte_de_seuil, alerte_a_envoyer,
// contestation) ; mêmes exemples que moteurs/tests/test_relais.py (le moteur Python calcule en Decimal, celui-ci en
// nombres : mêmes valeurs à 1e-9 près, même arrondi affiché). TRU-01 à TRU-07, PAL-01 à PAL-06 ; ARL-14 (score jamais
// montré au client), ARL-15, ARL-132, ARL-134 ; PR-RC-27.
import type { Instant } from '../donnees/communs'
import type { NomCritere, ParametresTrustRelais } from './parametres-moteurs'
import { HEURE, ajouterJours, debutDuJour, ecartJours, jourDe, jourSemaine, type Jour } from './temps'

export type CritereAEvenements = 'Ponctualité' | 'Sécurité du stockage' | 'Litiges'
export type GraviteTrust = 'succès' | 'g1' | 'g2' | 'g3'
export interface EvenementTrust {
  critere: CritereAEvenements
  gravite: GraviteTrust
  ageJours: number
  dossierEnCours?: boolean // jamais pénalisé tant qu'il n'est pas tranché (TRU-03)
}
export interface AvisClient {
  etoiles: number // 1 à 5
  ageJours: number
}

const poids = (age: number, pt: ParametresTrustRelais) => 0.5 ** (age / pt.demiVieJours)

/** Critère sur 100 lissé vers le neutre (ARL-132) : (k × µ + Σ poids × 100 × succès) ÷ (k + Σ poids × unités). */
export function critereTrust(evenements: readonly EvenementTrust[], c: CritereAEvenements, pt: ParametresTrustRelais): number {
  let num = 0
  let den = 0
  for (const e of evenements) {
    if (e.ageJours < 0) throw new Error('âge négatif')
    if (e.critere !== c || e.dossierEnCours) continue
    const w = poids(e.ageJours, pt)
    if (e.gravite === 'succès') {
      num += w * 100
      den += w
    } else den += w * pt.gravites[e.gravite]
  }
  return (pt.k * pt.neutre + num) / (pt.k + den)
}

/** Borne basse de Wilson de la part d'avis satisfaits (4 étoiles ou plus), avis pondérés par leur âge ; µ sans avis. */
export function satisfaction(avis: readonly AvisClient[], pt: ParametresTrustRelais): number {
  if (avis.some((a) => a.etoiles < 1 || a.etoiles > 5 || a.ageJours < 0)) throw new Error('avis : 1 à 5 étoiles, âge positif')
  const n = avis.reduce((s, a) => s + poids(a.ageJours, pt), 0)
  if (!n) return pt.neutre
  const pos = avis.filter((a) => a.etoiles >= pt.avisPositifEtoiles).reduce((s, a) => s + poids(a.ageJours, pt), 0)
  const z2 = pt.wilsonZ * pt.wilsonZ
  const ph = pos / n
  return ((ph + z2 / (2 * n) - pt.wilsonZ * Math.sqrt((ph * (1 - ph)) / n + z2 / (4 * n * n))) / (1 + z2 / n)) * 100
}

/** 50 × min(1 ; mois ÷ 12) + 50 × min(1 ; remises ÷ 500). */
export function anciennete(mois: number, remises: number, pt: ParametresTrustRelais): number {
  if (mois < 0 || remises < 0) throw new Error('mois et remises positifs ou nuls')
  return pt.anciennetePoints * Math.min(1, mois / pt.ancienneteMois) + pt.anciennetePoints * Math.min(1, remises / pt.ancienneteRemises)
}

export interface TrustRelais {
  criteres: Record<NomCritere, number>
  calcule: number // somme pondérée (TRU-01)
  score: number // baisse limitée, gel
  affiche: number // à l'entier, moitié vers le haut
  gele: boolean
  baisseLimitee: boolean
}
/** Trust Score recalculé chaque nuit : somme pondérée sans veto ; baisse de PR-TS-VARIATION-NUIT points au plus ; gelé
 * après PR-TS-GEL-J jours sans activité. */
export function trustRelais(evenements: readonly EvenementTrust[], avis: readonly AvisClient[], mois: number, remises: number, pt: ParametresTrustRelais, o: { precedent?: number | null; joursSansActivite?: number } = {}): TrustRelais {
  const sans = o.joursSansActivite ?? 0
  if (sans < 0) throw new Error('jours sans activité négatifs')
  const criteres: Record<NomCritere, number> = {
    Ponctualité: critereTrust(evenements, 'Ponctualité', pt),
    'Sécurité du stockage': critereTrust(evenements, 'Sécurité du stockage', pt),
    Satisfaction: satisfaction(avis, pt),
    Litiges: critereTrust(evenements, 'Litiges', pt),
    Ancienneté: anciennete(mois, remises, pt),
  }
  const calcule = (Object.keys(pt.poids) as NomCritere[]).reduce((s, c) => s + criteres[c] * pt.poids[c], 0) / 100
  const precedent = o.precedent ?? null
  let score = calcule
  let gele = false
  let baisseLimitee = false
  if (precedent !== null && sans >= pt.gelJours) [score, gele] = [precedent, true]
  else if (precedent !== null && calcule < precedent - pt.baisseMax) [score, baisseLimitee] = [precedent - pt.baisseMax, true]
  // Moitié vers le haut, à l'abri des 41,499999… des nombres à virgule.
  return { criteres, calcule, score, affiche: Math.floor(score + 0.5 + 1e-9), gele, baisseLimitee }
}

export type PalierRelais = 'Starter' | 'Confirmé' | 'Premium'
export const ORDRE_PALIERS: readonly PalierRelais[] = ['Starter', 'Confirmé', 'Premium']
const seuil = (p: Exclude<PalierRelais, 'Starter'>, pt: ParametresTrustRelais) => pt.seuils[p]

export interface EvolutionPalier {
  palier: PalierRelais
  descenteProposee: PalierRelais | null // proposée à une personne, jamais automatique (PAL-02)
  joursTenus: number // « 9 sur 14 »
  seuilSuivant: number | null
}
/** Montée tenue PR-PAL-TENUE-J jours ; descente d'un palier proposée à PR-PAL-MARGE points sous le seuil pendant
 * PR-PAL-TENUE-J jours. Scores du plus ancien au plus récent. */
export function evolutionPalier(palier: PalierRelais, scores: readonly number[], pt: ParametresTrustRelais): EvolutionPalier {
  const derniers = scores.slice(-pt.tenueJours)
  const tenu = derniers.length === pt.tenueJours
  const rang = ORDRE_PALIERS.indexOf(palier)
  let nouveau = palier
  for (const suivant of ORDRE_PALIERS.slice(rang + 1) as Exclude<PalierRelais, 'Starter'>[]) if (tenu && derniers.every((s) => s >= seuil(suivant, pt))) nouveau = suivant
  let descente: PalierRelais | null = null
  if (nouveau === palier && palier !== 'Starter' && tenu && derniers.every((s) => s < seuil(palier, pt) - pt.hysteresisPoints)) descente = ORDRE_PALIERS[rang - 1]
  const rangNouveau = ORDRE_PALIERS.indexOf(nouveau)
  if (rangNouveau + 1 === ORDRE_PALIERS.length) return { palier: nouveau, descenteProposee: descente, joursTenus: 0, seuilSuivant: null }
  const s = seuil(ORDRE_PALIERS[rangNouveau + 1] as Exclude<PalierRelais, 'Starter'>, pt)
  let jours = 0
  for (let i = scores.length - 1; i >= 0 && scores[i] >= s; i--) jours++
  return { palier: nouveau, descenteProposee: descente, joursTenus: jours, seuilSuivant: s }
}

export interface AlerteSeuil {
  sens: 'montée' | 'descente'
  seuil: number
  palier: PalierRelais
  ecart: number // points exacts (72,5 → 2,5)
}
/** ARL-15, ARL-134 : à PR-TRUST-ALERTE points ou moins au-dessus (descente) ou en dessous (montée) d'un seuil ; le plus
 * proche l'emporte, la montée à égalité. Pas de « Contester » (PAL-06). */
export function alerteDeSeuil(score: number, pt: ParametresTrustRelais): AlerteSeuil | null {
  const candidates: [number, number, AlerteSeuil][] = []
  for (const palier of ['Confirmé', 'Premium'] as const) {
    const s = seuil(palier, pt)
    const ecart = score - s
    if (-ecart > 0 && -ecart <= pt.alertePoints) candidates.push([-ecart, 0, { sens: 'montée', seuil: s, palier, ecart: -ecart }])
    else if (ecart >= 0 && ecart <= pt.alertePoints) candidates.push([ecart, 1, { sens: 'descente', seuil: s, palier, ecart }])
  }
  candidates.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  return candidates.length ? candidates[0][2] : null
}
/** Une fois par seuil et par PR-TRUST-ALERTE-J jours (PAL-06). */
export const alerteAEnvoyer = (a: AlerteSeuil | null, dernierePourCeSeuil: Jour | null, jour: Jour, pt: ParametresTrustRelais) =>
  a !== null && (dernierePourCeSeuil === null || ecartJours(dernierePourCeSeuil, jour) >= pt.alerteFrequenceJours)

/** Échéance après `heures` heures ouvrées : le dimanche et les fériés ne comptent pas (activation.echeance_ouvree). */
export function echeanceOuvree(debut: Instant, heures: number, feries: readonly Jour[] = []): Instant {
  if (heures < 0) throw new Error('durée négative')
  let t = debut
  let reste = heures * HEURE
  for (let k = 0; k < 3660; k++) {
    const jour = jourDe(t)
    const minuit = debutDuJour(ajouterJours(jour, 1))
    if (jourSemaine(jour) !== 6 && !feries.includes(jour)) {
      if (reste <= minuit - t) return t + reste
      reste -= minuit - t
    }
    t = minuit
  }
  throw new Error('aucun jour ouvré sur dix ans : calendrier des fériés à vérifier')
}

export interface Contestation {
  possible: boolean
  motif: 'deja_contestee' | 'decision_close' | 'rien_a_contester' | null
  reponseAvant: Instant | null // réponse motivée sous PR-CONTESTATION-H heures ouvrées
}
/** Une seule contestation par décision (sanction, descente, événement du Trust), par le gérant (TRU-07). */
export function contestation(dejaContestee: boolean, maintenant: Instant, pt: ParametresTrustRelais, o: { decisionClose?: boolean; alerte?: boolean; feries?: readonly Jour[] } = {}): Contestation {
  if (o.alerte) return { possible: false, motif: 'rien_a_contester', reponseAvant: null }
  if (o.decisionClose) return { possible: false, motif: 'decision_close', reponseAvant: null }
  if (dejaContestee) return { possible: false, motif: 'deja_contestee', reponseAvant: null }
  return { possible: true, motif: null, reponseAvant: echeanceOuvree(maintenant, pt.contestationHeures, o.feries ?? []) }
}
