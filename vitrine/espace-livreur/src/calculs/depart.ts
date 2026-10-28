// Départ du livreur (DP-66, DP-67), portage de moteurs/belivay_moteurs/depart.py (le serveur applique les mêmes règles ;
// l'application les affiche) :
// - préavis DEPART-PREAVIS-J : il continue de travailler normalement ; l'entreprise peut lui confier des paquets jusqu'à
//   la veille du dernier jour du préavis (jour, à Yaoundé, où il prend fin) ; plus aucune nouvelle mission ce jour-là ;
// - constat du kit par l'entreprise au plus tard DEPART-KIT-CONSTAT-H après la fin du préavis ; un kit incomplet donne
//   une retenue plafonnée à KIT-VALEUR-F (et à ce qui reste dû) ; contestée, elle est mise de côté jusqu'à la décision ;
// - dernier versement le vendredi qui suit la clôture, en Mobile Money, pour toutes les missions validées ; seuls les
//   montants liés à un litige ouvert sont retenus, au plus le montant contesté.
// Paramètres : PARAMETRES.livreur (registre), jamais en dur.
import { JOUR, HEURE, debutDuJour, jourDe, jourSemaine, ajouterJours, type Jour } from './temps'

/** Fin du préavis : DEPART-PREAVIS-J jours calendaires après la demande. */
export function finPreavis(demandeLe: number, jours: number): number {
  if (jours < 0) throw new RangeError('préavis négatif')
  return demandeLe + jours * JOUR
}

/** Dernier jour du préavis (Yaoundé) : plus aucune nouvelle mission ce jour-là. */
export const dernierJour = (demandeLe: number, jours: number): Jour => jourDe(finPreavis(demandeLe, jours))

/** Début (0 h, Yaoundé) du dernier jour du préavis : il reçoit des paquets jusqu'à cet instant (exclu). */
export const affectationJusqua = (demandeLe: number, jours: number): number => debutDuJour(dernierJour(demandeLe, jours))

/** DP-67 (1) : pendant le préavis, des paquets jusqu'à la veille du dernier jour ; ensuite, plus rien. */
export const affectationPermise = (demandeLe: number, maintenant: number, jours: number) => jourDe(maintenant) < dernierJour(demandeLe, jours)

export const preavisEchu = (demandeLe: number, maintenant: number, jours: number) => maintenant >= finPreavis(demandeLe, jours)

/** Limite du constat du kit : DEPART-KIT-CONSTAT-H heures après la fin du préavis. */
export function constatJusqua(demandeLe: number, jours: number, constatH: number): number {
  if (constatH < 0) throw new RangeError('délai de constat négatif')
  return finPreavis(demandeLe, jours) + constatH * HEURE
}

export const constatEchu = (demandeLe: number, maintenant: number, jours: number, constatH: number) => maintenant >= constatJusqua(demandeLe, jours, constatH)

/** Versement du dernier relevé : le vendredi qui suit le jour de la clôture (un vendredi : le suivant), à 0 h. */
export function vendrediSuivant(t: number): number {
  const j = jourDe(t)
  return debutDuJour(ajouterJours(j, (4 - jourSemaine(j) + 7) % 7 || 7))
}

/** Retenue d'un kit incomplet : jamais plus que la valeur du kit au registre (KIT-VALEUR-F). */
export function retenuePlafonnee(montant: number, kitValeur: number): number {
  if (montant < 0 || kitValeur < 0) throw new RangeError('montant négatif')
  return Math.min(montant, kitValeur)
}

/** Missions liées à un litige encore ouvert : leurs gains et le montant contesté ; retenu au plus le montant contesté. */
export interface LitigeOuvert {
  gains: number
  conteste: number
}
export const retenuLitige = (l: LitigeOuvert) => Math.min(l.gains, l.conteste)

export interface Versement {
  du: number | null // gains des missions validées (null : l'entreprise n'affiche pas de tarif, compteur seul)
  retenuLitiges: number // versé dès le litige réglé
  retenueKit: number // retenue définitive du kit incomplet
  kitDeCote: number // retenue du kit contestée : mise de côté jusqu'à la décision
  verse: number | null // versé le vendredi suivant la clôture, en Mobile Money
}

/** Dernier relevé du livreur qui part (depart.py dernier_versement). */
export function dernierVersement(gainsValides: number | null, litiges: LitigeOuvert[] = [], retenueKit = 0, kitValeur = 0, kitConteste = false): Versement {
  if (gainsValides !== null && gainsValides < 0) throw new RangeError('gains négatifs')
  if (litiges.some((l) => l.gains < 0 || l.conteste < 0)) throw new RangeError('montant négatif')
  const retenu = litiges.reduce((s, l) => s + retenuLitige(l), 0)
  if (gainsValides !== null && retenu > gainsValides) throw new RangeError('litiges : plus de gains liés que de gains validés')
  let kit = retenuePlafonnee(retenueKit, kitValeur)
  if (gainsValides === null) return { du: null, retenuLitiges: retenu, retenueKit: kitConteste ? 0 : kit, kitDeCote: kitConteste ? kit : 0, verse: null }
  kit = Math.min(kit, gainsValides - retenu)
  return { du: gainsValides, retenuLitiges: retenu, retenueKit: kitConteste ? 0 : kit, kitDeCote: kitConteste ? kit : 0, verse: gainsValides - retenu - kit }
}
