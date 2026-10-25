// Départ d'un livreur de son entreprise (DP-66, DP-67), portage de moteurs/belivay_moteurs/depart.py : le livreur
// DEMANDE à partir (motif de la liste, texte libre facultatif), sans effet immédiat ; préavis DEPART-PREAVIS-J (registre,
// lu par PARAMETRES_FLOTTE) pendant lequel il continue de travailler : l'entreprise peut lui confier des paquets jusqu'à
// la veille du dernier jour du préavis (jour, à Yaoundé, où il prend fin), plus aucun à partir de ce jour-là. Passer
// « hors service » pendant le préavis ne coûte aucun point de Trust Score.
// Clôture (même avant la fin du préavis, d'un commun accord) quand aucune mission n'est en cours, aucun colis sous sa
// garde et le kit constaté (restitué, ou incomplet avec photo et éléments manquants) ; les litiges ouverts suivent leur
// cours. Kit : constat au plus tard DEPART-KIT-CONSTAT-H après la fin du préavis ; incomplet : retenue = valeur des
// éléments manquants (KIT-VALEUR-F), plafonnée ; silence de l'entreprise au-delà : l'administrateur clôture « kit non
// contesté », sans retenue. Dernier versement : le vendredi qui suit la clôture, en Mobile Money, pour toutes les
// missions validées ; seuls les montants liés à un litige ouvert sont retenus, au plus le montant contesté.
import { HEURE, JOUR, jourDe, yaounde } from './temps'
import { PARAMETRES_FLOTTE, type KitValeur, type ParametresFlotte } from './flotte'

/** Motifs proposés au livreur (depart.py MOTIFS), dans l'ordre de la liste. */
export const MOTIFS_DEPART = ['autre_emploi', 'horaires', 'remuneration', 'demenagement', 'sante', 'personnel', 'autre'] as const
export type MotifDepart = (typeof MOTIFS_DEPART)[number]
/** Conditions de clôture, toutes exigées (depart.py CONDITIONS). */
export const CONDITIONS_DEPART = ['sans_mission', 'sans_colis', 'kit_constate'] as const
export type ConditionDepart = (typeof CONDITIONS_DEPART)[number]
/** Constat du kit par l'entreprise (depart.py CONSTATS_KIT). */
export const CONSTATS_KIT = ['restitue', 'incomplet'] as const
export type ConstatKit = (typeof CONSTATS_KIT)[number]

export interface ConditionsDepart {
  missionsEnCours: number
  colisSousGarde: number
  kitConstate: boolean
  litigesOuverts: number // ne bloque pas
}

/** Conditions pas encore remplies, dans l'ordre de CONDITIONS_DEPART. */
export function manquantes(c: ConditionsDepart): ConditionDepart[] {
  const ok: Record<ConditionDepart, boolean> = { sans_mission: c.missionsEnCours === 0, sans_colis: c.colisSousGarde === 0, kit_constate: c.kitConstate }
  return CONDITIONS_DEPART.filter((x) => !ok[x])
}

/** Fin du préavis : DEPART-PREAVIS-J jours calendaires après la demande. */
export const finPreavis = (demandeLe: number, p: ParametresFlotte = PARAMETRES_FLOTTE) => demandeLe + p.preavisDepartJours * JOUR

/** Préavis échu à l'instant (l'administrateur peut alors clôturer). */
export const preavisEchu = (preavisJusqua: number, maintenant: number) => maintenant >= preavisJusqua

/** 0 h (Yaoundé) du jour de l'instant. */
const minuit = (t: number) => {
  const [a, m, j] = jourDe(t).split('-').map(Number)
  return yaounde(a, m, j)
}

/** Dernier jour du préavis (« AAAA-MM-JJ », Yaoundé) : le jour où il prend fin ; plus aucune nouvelle affectation. */
export const dernierJour = (preavisJusqua: number) => jourDe(preavisJusqua)

/** Début (0 h, Yaoundé) du dernier jour du préavis : plus de nouvelle affectation à partir de cet instant. */
export const affectationJusqua = (preavisJusqua: number) => minuit(preavisJusqua)

/** DP-67 (1) : pendant le préavis, il reçoit des paquets jusqu'à la veille du dernier jour ; ensuite, plus rien. */
export const affectationPermise = (preavisJusqua: number, maintenant: number) => jourDe(maintenant) < dernierJour(preavisJusqua)

/** Limite du constat du kit : DEPART-KIT-CONSTAT-H heures après la fin du préavis. */
export const constatJusqua = (preavisJusqua: number, p: ParametresFlotte = PARAMETRES_FLOTTE) => preavisJusqua + p.kitConstatH * HEURE

/** Délai du constat passé (le constat « incomplet » n'est plus reçu ; « restitué » reste possible). */
export const constatEchu = (preavisJusqua: number, maintenant: number, p: ParametresFlotte = PARAMETRES_FLOTTE) => maintenant >= constatJusqua(preavisJusqua, p)

/** Vendredi qui suit le jour de la clôture (un vendredi : le suivant), à 0 h à Yaoundé. */
export function vendrediSuivant(t: number): number {
  const [a, m, j] = jourDe(t).split('-').map(Number)
  const jour = yaounde(a, m, j)
  const semaine = new Date(Date.UTC(a, m - 1, j)).getUTCDay() // 0 dimanche … 5 vendredi
  const ecart = (5 - semaine + 7) % 7 || 7
  return jour + ecart * JOUR
}

// ── Constat du kit ──────────────────────────────────────────────────────────────────────────────────────────────

export type RefusConstat = 'resultat' | 'photo' | 'manquants' | 'element' | 'delai' | 'montant'

/** Retenue d'un kit incomplet : jamais plus que la valeur du kit au registre (KIT-VALEUR-F). */
export function retenuePlafonnee(montant: number, kitValeur: number): number {
  if (montant < 0 || kitValeur < 0) throw new RangeError('montant négatif')
  return Math.min(montant, kitValeur)
}

/** Valeur des éléments manquants (chaque élément une fois). */
export const valeurManquants = (manquants: readonly string[], kit: KitValeur = PARAMETRES_FLOTTE.kit) =>
  kit.elements.filter((e) => manquants.includes(e.libelle)).reduce((n, e) => n + e.valeur, 0)

/**
 * Constat de l'entreprise (depart.py constater_kit). Incomplet : constaté au plus tard DEPART-KIT-CONSTAT-H après la fin
 * du préavis, photo obligatoire, au moins un élément manquant du registre ; retenue = valeur des éléments manquants, ou
 * un montant inférieur choisi par l'entreprise (jamais plus), plafonnée à KIT-VALEUR-F. Restitué : toujours reçu.
 */
export function constaterKit(
  c: { resultat: string; manquants?: readonly string[]; photo: boolean; montant?: number | null },
  preavisJusqua: number,
  maintenant: number,
  p: ParametresFlotte = PARAMETRES_FLOTTE,
): { ok: true; resultat: ConstatKit; manquants: string[]; retenue: number } | { ok: false; raison: RefusConstat } {
  if (!(CONSTATS_KIT as readonly string[]).includes(c.resultat)) return { ok: false, raison: 'resultat' }
  if (c.resultat === 'restitue') return { ok: true, resultat: 'restitue', manquants: [], retenue: 0 }
  if (constatEchu(preavisJusqua, maintenant, p)) return { ok: false, raison: 'delai' }
  if (!c.photo) return { ok: false, raison: 'photo' }
  const manquants = c.manquants ?? []
  if (!manquants.length) return { ok: false, raison: 'manquants' }
  if (manquants.some((m) => !p.kit.elements.some((e) => e.libelle === m))) return { ok: false, raison: 'element' }
  const valeur = valeurManquants(manquants, p.kit)
  const montant = c.montant ?? null
  if (montant !== null && !(Number.isInteger(montant) && montant > 0 && montant <= valeur)) return { ok: false, raison: 'montant' }
  return { ok: true, resultat: 'incomplet', manquants: p.kit.elements.filter((e) => manquants.includes(e.libelle)).map((e) => e.libelle), retenue: retenuePlafonnee(montant ?? valeur, p.kit.total) }
}

// ── Dernier versement ───────────────────────────────────────────────────────────────────────────────────────────

/** Missions liées à un litige encore ouvert : leurs gains et le montant contesté ; retenu : au plus le montant contesté. */
export interface LitigeOuvert {
  gains: number
  conteste: number
}
export const retenuLitige = (l: LitigeOuvert) => Math.min(l.gains, l.conteste)

export interface CalculVersement {
  du: number | null // gains des missions validées (null : pas de tarif par mission affiché, compteur seul)
  retenuLitiges: number // versé dès le litige réglé
  retenueKit: number // retenue définitive du kit incomplet
  kitDeCote: number // retenue du kit contestée : mise de côté jusqu'à la décision de BelivaY
  verse: number | null // versé le vendredi suivant la clôture, en Mobile Money
}

/**
 * Dernier relevé du livreur qui part (depart.py dernier_versement). `gainsValides` : toutes les missions validées, y compris
 * celles liées à un litige ouvert ; de celles-ci, seul le montant contesté est retenu (au plus leurs gains). La retenue
 * du kit est plafonnée à KIT-VALEUR-F et à ce qui reste dû ; contestée, elle est mise de côté (ni versée ni gardée).
 */
export function dernierVersement(gainsValides: number | null, litiges: readonly LitigeOuvert[] = [], retenueKit = 0, kitValeur = PARAMETRES_FLOTTE.kit.total, kitConteste = false): CalculVersement {
  if (gainsValides !== null && gainsValides < 0) throw new RangeError('gains négatifs')
  if (litiges.some((l) => l.gains < 0 || l.conteste < 0)) throw new RangeError('montant négatif')
  const retenu = litiges.reduce((n, l) => n + retenuLitige(l), 0)
  if (gainsValides !== null && retenu > gainsValides) throw new RangeError('litiges : plus de gains liés que de gains validés')
  let kit = retenuePlafonnee(retenueKit, kitValeur)
  if (gainsValides === null) return { du: null, retenuLitiges: retenu, retenueKit: kitConteste ? 0 : kit, kitDeCote: kitConteste ? kit : 0, verse: null }
  kit = Math.min(kit, gainsValides - retenu)
  return { du: gainsValides, retenuLitiges: retenu, retenueKit: kitConteste ? 0 : kit, kitDeCote: kitConteste ? kit : 0, verse: gainsValides - retenu - kit }
}

// ── Nouvelle vérification de la photo (absence.py) ─────────────────────────────────────────────────────────────

/** Fin du délai pour envoyer la nouvelle photo : PHOTO-REVERIF-J jours après la demande. */
export const photoEcheance = (demandeeLe: number, p: ParametresFlotte = PARAMETRES_FLOTTE) => demandeeLe + p.photoReverifJours * JOUR

/** Plus de nouvelle mission : délai passé et nouvelle photo pas encore validée (envoyée ou non). */
export const photoBloque = (demandeeLe: number, maintenant: number, validee: boolean, p: ParametresFlotte = PARAMETRES_FLOTTE) => !validee && maintenant >= photoEcheance(demandeeLe, p)

/** Motifs d'une absence (absence.py MOTIFS), dans l'ordre de la liste montrée au livreur. */
export const MOTIFS_ABSENCE = ['maladie', 'deuil_famille', 'panne_moto', 'demarches', 'autre'] as const
export type MotifAbsence = (typeof MOTIFS_ABSENCE)[number]
