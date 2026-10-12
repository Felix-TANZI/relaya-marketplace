// Paliers du vendeur : portage fidèle de moteurs/belivay_moteurs/paliers.py (VD-10 PAL-01, PAL-02, C4, TRU-07, ACC-15,
// ACC-25, SAN-02 ; DP-21, DP-55 : Q-10 ; DP-57 : A-5, A-6). Le Trust Score vient du service Scores : on le lit (valeur
// exacte, 62,7 et non 63).
// - Un palier demande aussi les conditions des paliers inférieurs (Platine = Or + Trust Score 90 + audit, A-6).
// - Descente : Trust Score sous le seuil du palier (pas « seuil − 5 ») 14 jours de suite, proposée puis validée (A-5).
// - Alerte avant un seuil (ACC-25, SAN-02, VD-ALERTE-SEUIL ; A-5) : à 3 points ou moins du seuil du palier suivant
//   (montée) ou du seuil du palier actuel (descente) ; une fois par seuil et par semaine ; points comptés sur le score
//   arrondi, comme dans Mon palier.
import { Dec } from './argent'
import { PALIERS, type Palier, type ParametresPaliers } from './registre'
import { ajouterMois, ecartJours, type Jour } from './temps'

const rang = (p: Palier) => PALIERS.indexOf(p)

export interface EtatDuJour {
  jour: Jour
  trustScore: Dec // valeur exacte : Dec.de('62.7')
  commandesLivrees: number // livrées et non remboursées (Q-10)
  note: Dec
  visite?: boolean
  audit?: boolean
}

/** Palier le plus haut dont toutes les conditions, et celles des paliers inférieurs, sont tenues ce jour-là. */
export function palierAtteint(e: EtatDuJour, p: ParametresPaliers): Palier {
  let atteint: Palier = 'Bronze'
  for (const palier of PALIERS.slice(1) as ('Argent' | 'Or' | 'Platine')[]) {
    const c = p.conditions[palier]
    if (!(e.trustScore.cmp(c.trustScore) >= 0 && e.commandesLivrees >= c.commandesLivrees && e.note.cmp(c.note) >= 0 && (e.visite || !c.visite) && (e.audit || !c.audit))) break
    atteint = palier
  }
  return atteint
}

export interface Evolution {
  montee: Palier | null // conditions tenues 14 jours de suite (C4)
  descenteProposee: Palier | null // à valider par une personne (TRU-07, DP-21)
}

/** Montée ou descente proposée, d'après les relevés quotidiens qui finissent aujourd'hui (jours consécutifs). */
export function evolution(actuel: Palier, historique: EtatDuJour[], p: ParametresPaliers): Evolution {
  for (let i = 1; i < historique.length; i++) if (ecartJours(historique[i - 1].jour, historique[i].jour) !== 1) throw new RangeError('relevés quotidiens : un jour manque ou se répète')
  let montee: Palier | null = null
  let fenetre = historique.slice(-p.monteeJours)
  if (fenetre.length === p.monteeJours) {
    const tenu = fenetre.map((e) => palierAtteint(e, p)).reduce((a, b) => (rang(b) < rang(a) ? b : a))
    if (rang(tenu) > rang(actuel)) montee = tenu
  }
  let descente: Palier | null = null
  fenetre = historique.slice(-p.descenteJours)
  if (actuel !== 'Bronze' && fenetre.length === p.descenteJours) {
    const seuil = p.conditions[actuel as 'Argent' | 'Or' | 'Platine'].trustScore
    if (fenetre.every((e) => e.trustScore.cmp(seuil) < 0)) descente = palierAtteint(fenetre[fenetre.length - 1], p)
  }
  return { montee, descenteProposee: descente }
}

/** Palier selon les produits actifs, jusqu'à 2 mois après la signature (ACC-15) ; null ensuite. */
export function palierDeLancement(signature: Jour, jour: Jour, produitsActifs: number, p: ParametresPaliers): Palier | null {
  if (jour > ajouterMois(signature, p.lancementMois)) return null
  let lancement: Palier = 'Bronze'
  for (const palier of PALIERS.slice(1) as ('Argent' | 'Or' | 'Platine')[]) if (produitsActifs >= p.lancementProduits[palier]) lancement = palier
  return lancement
}

export interface PaliersEffectifs {
  commission: Palier // multiplicateur de commission : le meilleur des deux (Q-10)
  liberation: Palier // vitesse de libération : le palier du Trust Score seul (Q-10, DP-21)
}

/** Vendeur Bronze avec 45 produits actifs, en lancement : commission au palier Or, libération Bronze à 3 jours. */
export function paliersEffectifs(palierTrust: Palier, signature: Jour, jour: Jour, produitsActifs: number, p: ParametresPaliers): PaliersEffectifs {
  const lancement = palierDeLancement(signature, jour, produitsActifs, p)
  const commission = lancement === null || rang(palierTrust) >= rang(lancement) ? palierTrust : lancement
  return { commission, liberation: palierTrust }
}

/** Palier qui suit (null pour Platine). */
export const palierSuivant = (p: Palier): Palier | null => PALIERS[rang(p) + 1] ?? null

// ── Alerte avant un seuil ───────────────────────────────────────────────────────────────────────────────

/** Carte « près d'un seuil » de l'accueil (ACC-25) et événement score.threshold_near (SAN-02, sans bouton « Contester »). */
export interface Alerte {
  sens: 'montée' | 'descente'
  palierVise: Palier // palier suivant (montée) ; palier actuel à garder (descente)
  seuil: number
  pointsAffiches: number // « Plus que 2 points » : seuil − score arrondi (moitié vers le haut), jamais sous 0
}

/** ACC-25 corrigé par DP-57 (A-5) : montée si 0 < seuil suivant − score ≤ 3 ; descente si 0 ≤ score − seuil du palier ≤ 3.
 * Bronze 62,7 : « Plus que 2 points » pour Argent (65 − 63). Argent 66 : descente possible sous 65. La montée l'emporte
 * si les deux se présentent. */
export function alerteDeSeuil(actuel: Palier, trustScore: Dec, p: ParametresPaliers): Alerte | null {
  const r = rang(actuel)
  const arrondi = trustScore.francs()
  if (r + 1 < PALIERS.length) {
    const suivant = PALIERS[r + 1] as 'Argent' | 'Or' | 'Platine'
    const seuil = p.conditions[suivant].trustScore
    const ecart = Dec.de(seuil).moins(trustScore)
    if (ecart.cmp(0) > 0 && ecart.cmp(p.alerteEcartPoints) <= 0) return { sens: 'montée', palierVise: suivant, seuil, pointsAffiches: Math.max(seuil - arrondi, 0) }
  }
  if (actuel !== 'Bronze') {
    const seuil = p.conditions[actuel].trustScore
    const ecart = trustScore.moins(seuil)
    if (ecart.cmp(0) >= 0 && ecart.cmp(p.alerteEcartPoints) <= 0) return { sens: 'descente', palierVise: actuel, seuil, pointsAffiches: Math.max(arrondi - seuil, 0) }
  }
  return null
}

/** Une fois par seuil et par semaine (SAN-02, VD-ALERTE-SEUIL) : rien si la même alerte (même seuil) est partie il y a
 * moins de 7 jours. */
export function alerteAEnvoyer(alerte: Alerte | null, dernierePourCeSeuil: Jour | null, jour: Jour, p: ParametresPaliers): boolean {
  if (alerte === null) return false
  return dernierePourCeSeuil === null || ecartJours(dernierePourCeSeuil, jour) >= p.alerteFrequenceJours
}
