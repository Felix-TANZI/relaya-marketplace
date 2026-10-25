// Règles du groupe S3 (ADM-06 et ADM-07 : KYC, vendeurs, paliers et Trust Score, sanctions, catalogue, modération,
// avis, clients et IFA ; page ajoutée « qualite »). Fonctions pures, partagées par les écrans et par la source de
// démonstration (le serveur applique les mêmes : backend-kit/apps/console). AUCUNE valeur écrite ici : chaque délai,
// seuil et montant est lu au registre officiel par src/calculs/registre.ts (les codes proposés par S3 y sont entrés :
// A-VALIDER § 4). Une valeur dont la forme change arrête la lecture (ParametreIllisible) au lieu de deviner.
import { PARAMETRES, REGISTRE, entier, montant, valeur, type Registre } from '../../../calculs/registre'
import { ParametreIllisible } from '../../../calculs/erreurs'
import { HEURE, JOUR } from '../../../calculs/temps'

/** Nombre (entier ou décimal « 0,85 ») trouvé par une expression dans la valeur (groupe n). */
function nombre(r: Registre, code: string, re: RegExp, n = 1): number {
  const m = re.exec(valeur(r, code))
  if (!m || m[n] === undefined) throw new ParametreIllisible(`${code} : « ${valeur(r, code)} » ne suit pas la forme attendue`)
  return Number(m[n].replace(/[\s  ]/g, '').replace(',', '.'))
}

export interface ParametresS3 {
  motifMin: number
  kycRevueH: number
  kycAutoMin: number
  seuilVisage: number
  appareilVendeur: number
  appareilLivreur: number
  paliersVendeur: { argent: number; or: number; platine: number }
  paliersLivreur: { confirme: number; or: number }
  hystJ: number
  hystEcart: number
  baisseMax: number
  veto: number
  gelInactifJ: number
  contestationJ: number
  recoursVendeurH: number
  recoursLivreurJ: number
  mediateurJ: number
  visibiliteJ: number
  suspensionMaxJ: number
  suspensionScore: number
  probatoireJ: number
  probatoireCommandes: number
  ifaMinCmd: number
  payNouveau: number
  payStandard: number
  payFidele: number
  payRefus: number
  autoStandard: number
  autoEleve: number
  ecartMax: number
  prixBarreJours: number
  prixBarreFenetre: number
  conseilCentile: number
  conseilFenetre: number
  fusionTete: number
  fusionRetourJ: number
  ficheDelaiH: number
  fichePrioriteH: number
  avisReponseJ: number
  volumeDiviseur: number
  alerteBaissePoints: number
  alerteSous: number
  plafondDemarrage: number
  plafondDemarrageCommandes: number
  quatreYeuxH: number
}

export function lireS3(r: Registre = REGISTRE): ParametresS3 {
  return {
    motifMin: PARAMETRES.console.motifMin,
    kycRevueH: entier(r, 'KYC-REVUE-H', /^heures ouvrées/),
    kycAutoMin: entier(r, 'KYC-AUTO-MIN', /^minutes/),
    seuilVisage: nombre(r, 'KYC-SEUIL-VISAGE', /^(\d+,\d+)$/),
    appareilVendeur: nombre(r, 'ADM-APPAREIL-COMPTES', /(\d+) vendeur/),
    appareilLivreur: nombre(r, 'ADM-APPAREIL-COMPTES', /(\d+) livreur/),
    paliersVendeur: {
      argent: nombre(r, 'VD-PAL-ARGENT', /^Trust Score (\d+)/),
      or: nombre(r, 'VD-PAL-OR', /^Trust Score (\d+)/),
      platine: nombre(r, 'VD-PAL-PLATINE', /^Trust Score (\d+)/),
    },
    paliersLivreur: { confirme: nombre(r, 'TSC-PALIERS-LIVREUR', /Confirmé ≥ (\d+)/), or: nombre(r, 'TSC-PALIERS-LIVREUR', /Or ≥ (\d+)/) },
    hystJ: entier(r, 'TS-HYST-J', /^jours/),
    hystEcart: entier(r, 'TS-HYST-ECART', /^points/),
    baisseMax: entier(r, 'TS-BAISSE-MAX', /^points/),
    veto: entier(r, 'TS-VETO-PLAFOND', /^points/),
    gelInactifJ: entier(r, 'TS-GEL-INACTIF-J', /^jours/),
    contestationJ: nombre(r, 'contestation_trust_livreur', /sous (\d+) jours/),
    recoursVendeurH: nombre(r, 'LIT-RECOURS-H', /sous (\d+) h/),
    recoursLivreurJ: entier(r, 'LIV-RECOURS-J', /^jours/),
    mediateurJ: entier(r, 'LIT-MEDIATEUR-J', /^jours/),
    visibiliteJ: nombre(r, 'VD-SAN-VISIBILITE', /^(\d+) jours$/),
    suspensionMaxJ: nombre(r, 'VD-SAN-SUSPENSION', /(\d+) jours au plus/),
    suspensionScore: nombre(r, 'VD-SAN-SUSPENSION', /Trust Score de (\d+)/),
    probatoireJ: entier(r, 'periode_probatoire_retour', /^jours/),
    probatoireCommandes: nombre(r, 'VD-PROBATOIRE', /^(\d+) commandes/),
    ifaMinCmd: nombre(r, 'IFA-MIN-CMD', /^(\d+)$/),
    payNouveau: montant(r, 'PAY-CPT-NOUV'),
    payStandard: montant(r, 'PAY-CPT-STD'),
    payFidele: montant(r, 'PAY-CPT-FID'),
    payRefus: nombre(r, 'PAY-CPT-REFUS', /^(\d+)$/),
    autoStandard: nombre(r, 'LIT-AUTO-STD', /([\d  ]+) F$/),
    autoEleve: nombre(r, 'LIT-AUTO-ELEVE', /([\d  ]+) F$/),
    ecartMax: nombre(r, 'MOD-ECART-MAX', /^(\d+)$/) / 100,
    prixBarreJours: nombre(r, 'PRIX-BARRE-JOURS', /^(\d+) jours sur (\d+)$/),
    prixBarreFenetre: nombre(r, 'PRIX-BARRE-JOURS', /^(\d+) jours sur (\d+)$/, 2),
    conseilCentile: nombre(r, 'VD-CONSEIL-PRIX', /^(\d+)e centile/),
    conseilFenetre: nombre(r, 'VD-CONSEIL-PRIX', /sur (\d+) jours/),
    fusionTete: nombre(r, 'CAT-FUSION-TETE', /^(\d+,\d+)$/),
    fusionRetourJ: entier(r, 'CAT-FUSION-RETOUR', /^jours/),
    ficheDelaiH: nombre(r, 'VD-FICHE-DELAI', /^(\d+) h/),
    fichePrioriteH: nombre(r, 'VD-FICHE-DELAI', /(\d+) h en prioritaire/),
    avisReponseJ: entier(r, 'AVIS-REPONSE-J', /^jours/),
    volumeDiviseur: nombre(r, 'LIV-POIDS-VOL', /÷ ([\d  ]+)$/),
    alerteBaissePoints: nombre(r, 'VD-CTRL-RENFORCE', /perd (\d+) points en une semaine/),
    alerteSous: nombre(r, 'VD-CTRL-RENFORCE', /sous (\d+)/),
    plafondDemarrage: nombre(r, 'VD-PLAFOND-DEMARRAGE', /^([\d  ]+) F/),
    plafondDemarrageCommandes: nombre(r, 'VD-PLAFOND-DEMARRAGE', /jusqu’à (\d+) commandes/),
    quatreYeuxH: PARAMETRES.console.quatreYeuxExpireH,
  }
}

/** Paramètres en vigueur du groupe, lus une fois. */
export const P3: ParametresS3 = lireS3()

// ── Délais ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const estDimanche = (t: number) => new Date(t + HEURE).getUTCDay() === 0 // heure de Yaoundé (UTC+1)

/** Échéance en heures ouvrées (lundi à samedi ; le dimanche ne compte pas) : KYC-REVUE-H, VD-FICHE-DELAI. */
export function echeanceOuvree(depuis: number, heures: number): number {
  let t = depuis
  let reste = heures * HEURE
  while (reste > 0) {
    if (estDimanche(t)) {
      t += HEURE
      continue
    }
    const pas = Math.min(reste, HEURE)
    t += pas
    reste -= pas
  }
  return t
}
/** Heures ouvrées restantes jusqu'à une échéance (négatif : dépassée). */
export function heuresOuvreesRestantes(maintenant: number, echeance: number): number {
  if (echeance <= maintenant) return -Math.round((maintenant - echeance) / HEURE)
  let n = 0
  for (let t = maintenant; t < echeance; t += HEURE) if (!estDimanche(t)) n++
  return n
}
/** Fin d'un délai en jours où le jour de départ ne compte pas (ADM-Q-C06) : jour + n, à 23 h 59 (Yaoundé). */
export function finEnJours(depuis: number, jours: number): number {
  const minuit = Math.floor((depuis + HEURE) / JOUR) * JOUR - HEURE
  return minuit + (jours + 1) * JOUR - 60_000
}

// ── KYC (ADM-06-R05, R08 ; ADM-P09R-03 ; A-33) ────────────────────────────────────────────────────────────────────
/** « Approuver » n'est actif que si chaque pièce du dossier a été ouverte par l'opérateur. */
export const approuvable = (pieces: { vue: boolean }[]) => pieces.length > 0 && pieces.every((p) => p.vue)
/** Doublon de CNI entre deux rôles : autorisé seulement si même visage et chaque rôle déclaré (sinon prête-nom). */
export const doublonAutorise = (similarite: number, rolesDeclares: boolean, p = P3) => similarite >= p.seuilVisage && rolesDeclares
/** Comptes par appareil dans les limites d'ADM-APPAREIL-COMPTES. */
export const appareilDansLimites = (vendeurs: number, livreurs: number, p = P3) => vendeurs <= p.appareilVendeur && livreurs <= p.appareilLivreur
/** Conflit d'intérêts (A-33, ADM-CACHEE-24) : un agent ne décide jamais sur un compte d'acteur qu'il tient. */
export const conflitInterets = (agentId: string | null | undefined, lieAgent: string | null | undefined) => !!agentId && !!lieAgent && agentId === lieAgent
/** Motif valable : longueur minimale du registre (motif_min_caracteres, ADM-PRI-03). */
export const motifValable = (m: string, p = P3) => m.trim().length >= p.motifMin

// ── Trust Score et paliers (ADM-TSC-01 à 07, ADM-P11R-01) ────────────────────────────────────────────────────────
export type EspaceTrust = 'vendeur' | 'livreur' | 'entreprise' | 'relais'
export type Palier = 'bronze' | 'argent' | 'or' | 'platine' | 'nouveau' | 'confirme'
/** Palier au Trust Score (hors palier de lancement d'un vendeur). */
export function palierDe(score: number, espace: EspaceTrust, p = P3): Palier {
  if (espace === 'vendeur') return score >= p.paliersVendeur.platine ? 'platine' : score >= p.paliersVendeur.or ? 'or' : score >= p.paliersVendeur.argent ? 'argent' : 'bronze'
  return score >= p.paliersLivreur.or ? 'or' : score >= p.paliersLivreur.confirme ? 'confirme' : 'nouveau'
}
/** Seuil d'entrée d'un palier (null : palier de départ). */
export function seuilDe(palier: Palier, espace: EspaceTrust, p = P3): number | null {
  if (espace === 'vendeur') return palier === 'argent' ? p.paliersVendeur.argent : palier === 'or' ? p.paliersVendeur.or : palier === 'platine' ? p.paliersVendeur.platine : null
  return palier === 'confirme' ? p.paliersLivreur.confirme : palier === 'or' ? p.paliersLivreur.or : null
}
/** Seuil de descente : vendeur, entreprise et relais, TS-HYST-ECART points sous le seuil ; livreur, le seuil (ENT-TRUST-PALIERS). */
export function seuilDescente(palier: Palier, espace: EspaceTrust, p = P3): number | null {
  const s = seuilDe(palier, espace, p)
  if (s === null) return null
  return espace === 'livreur' ? s : s - p.hystEcart
}
/** Jours consécutifs, jusqu'au dernier, sous un seuil (historique quotidien, le plus récent en dernier). */
export function joursSous(historique: number[], seuil: number): number {
  let n = 0
  for (let i = historique.length - 1; i >= 0 && historique[i] < seuil; i--) n++
  return n
}
/** Descente proposée quand le score reste sous le seuil de descente TS-HYST-J jours de suite ; jamais appliquée seule. */
export const descenteProposable = (historique: number[], seuilD: number, p = P3) => joursSous(historique, seuilD) >= p.hystJ
/** Recalcul : la baisse est bornée à TS-BAISSE-MAX points, sauf veto (plafond TS-VETO-PLAFOND). */
export function recalcul(avant: number, calcule: number, veto: boolean, p = P3): number {
  if (veto) return Math.min(calcule, p.veto)
  return Math.max(calcule, avant - p.baisseMax)
}
/** Tendance sur une fenêtre de jours (points gagnés ou perdus). */
export function tendance(historique: number[], jours: number): number {
  if (historique.length < 2) return 0
  const debut = historique[Math.max(0, historique.length - 1 - jours)]
  return Math.round((historique[historique.length - 1] - debut) * 10) / 10
}
/** Alerte de baisse (VD-CTRL-RENFORCE) : perte d'au moins N points en 7 jours, ou score sous le seuil d'alerte. */
export function alerteBaisse(historique: number[], p = P3): 'chute' | 'sous_seuil' | null {
  if (!historique.length) return null
  if (tendance(historique, 7) <= -p.alerteBaissePoints) return 'chute'
  if (historique[historique.length - 1] < p.alerteSous) return 'sous_seuil'
  return null
}

// ── Sanctions (ADM-P12R-01, R-02 ; ADM-RG-R18) ────────────────────────────────────────────────────────────────────
export type Niveau = 1 | 2 | 3 | 4
/** Quatre yeux : exclusion (niveau 4) et levée d'une liste noire. */
export const sanctionQuatreYeux = (niveau: Niveau, levee = false) => niveau === 4 || levee
/** Délai de recours : vendeur LIT-RECOURS-H, livreur LIV-RECOURS-J. */
export const delaiRecours = (espace: string, p = P3) => (espace === 'livreur' ? p.recoursLivreurJ * JOUR : p.recoursVendeurH * HEURE)

// ── Catalogue et modération (ADM-P13R, ADM-P14R) ─────────────────────────────────────────────────────────────────
export function mediane(prix: number[]): number | null {
  if (!prix.length) return null
  const s = [...prix].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}
/** Écart à la médiane du maître : |prix − médiane| ÷ médiane ; au-delà de MOD-ECART-MAX, retenue avant publication. */
export function ecartMediane(prix: number, offres: number[], p = P3): { mediane: number | null; ecart: number | null; retenue: boolean } {
  const m = mediane(offres)
  if (!m) return { mediane: null, ecart: null, retenue: false }
  const ecart = Math.abs(prix - m) / m
  return { mediane: m, ecart, retenue: ecart > p.ecartMax }
}
/** Jours où un prix a été pratiqué dans la fenêtre (historique quotidien de l'offre, le plus récent en dernier). */
export const joursPratiques = (historique: number[], prix: number, p = P3) => historique.slice(-p.prixBarreFenetre).filter((x) => x === prix).length
/** Prix barré valable : pratiqué au moins PRIX-BARRE-JOURS jours sur la fenêtre ; sinon retiré automatiquement. */
export const prixBarreValide = (historique: number[], prixBarre: number, p = P3) => joursPratiques(historique, prixBarre, p) >= p.prixBarreJours
/** Prix conseillé (VD-CONSEIL-PRIX) : centile des prix pratiqués, rang le plus proche. Un conseil, jamais imposé. */
export function prixConseille(prixPratiques: number[], p = P3): number | null {
  if (!prixPratiques.length) return null
  const s = [...prixPratiques].sort((a, b) => a - b)
  return s[Math.max(0, Math.ceil((p.conseilCentile / 100) * s.length) - 1)]
}
/** Poids facturé : max(poids réel ; L × l × h ÷ LIV-POIDS-VOL), en kg. */
export const poidsFacture = (kg: number, [l, w, h]: [number, number, number], p = P3) => Math.round(Math.max(kg, (l * w * h) / p.volumeDiviseur) * 10) / 10
/** Fusion en tête de file au-delà du seuil CAT-FUSION-TETE ; l'IA ne fusionne jamais seule. */
export const fusionEnTete = (similarite: number, p = P3) => similarite >= p.fusionTete
/** Une fusion se défait pendant CAT-FUSION-RETOUR jours. */
export const fusionReversibleJusqua = (le: number, p = P3) => le + p.fusionRetourJ * JOUR
/** Taxonomie sans doublon : une sous-catégorie homonyme d'une autre est refusée (sans casse ni accents). */
export function sousCategorieEnDouble(nom: string, existantes: string[]): string | null {
  const n = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  return existantes.find((x) => n(x) === n(nom)) ?? null
}

// ── Avis (ADM-P15R-02, R-03, R-06) ───────────────────────────────────────────────────────────────────────────────
export type MotifSignalement = 'insulte' | 'donnee_personnelle' | 'hors_sujet' | 'faux_avis' | 'chantage'
/** Masquage possible seulement pour un contenu illicite (insulte, donnée personnelle). */
export const masquagePossible = (m: MotifSignalement) => m === 'insulte' || m === 'donnee_personnelle'
/** Fin du droit de réponse privé du vendeur (le jour de l'avis ne compte pas). */
export const finDroitReponse = (avisLe: number, p = P3) => finEnJours(avisLe, p.avisReponseJ)
/** Un numéro de téléphone dans un texte transmis est masqué. */
export const masquerNumeros = (texte: string) => texte.replace(/(\+?237[\s.]?)?6[\d•\s.]{7,12}\d/g, '[numéro masqué]')

// ── Clients et IFA (ADM-P16R-01 à 08) ────────────────────────────────────────────────────────────────────────────
export type PalierIfa = 'eleve' | 'standard' | 'a_instruire' | 'plafonne'
/** Rétrogradation : jamais avant IFA-MIN-CMD commandes, jamais sans croisement chargé, jamais automatique. */
export function retrogradationPossible(c: { commandes: number; croisementCharge: boolean }, p = P3): 'ok' | 'trop_tot' | 'sans_croisement' {
  if (c.commandes < p.ifaMinCmd) return 'trop_tot'
  if (!c.croisementCharge) return 'sans_croisement'
  return 'ok'
}
/** Plafond du paiement au retrait (ADM-P16R-06/07) : null = prépaiement obligatoire. */
export function plafondRetrait(c: { commandesSansIncident: number; refusRetrait: number; palier: PalierIfa }, p = P3): number | null {
  if (c.refusRetrait >= p.payRefus || c.palier === 'a_instruire' || c.palier === 'plafonne') return null
  if (c.commandesSansIncident === 0) return p.payNouveau
  return c.commandesSansIncident >= p.ifaMinCmd ? p.payFidele : p.payStandard
}
/** Remboursement automatique sans enquête selon le palier (0 : toujours instruit). */
export const seuilRemboursementAuto = (palier: PalierIfa, p = P3) => (palier === 'eleve' ? p.autoEleve : palier === 'standard' ? p.autoStandard : 0)
