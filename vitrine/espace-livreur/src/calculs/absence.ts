// Absences prévenues et nouvelle photo (DP-66, DP-67), portage de moteurs/belivay_moteurs/absence.py (le serveur juge ;
// l'application juge pareil pour répondre tout de suite, même sans réseau) :
// - absence prévue : au moins PLANNING-PREVENIR-H heures avant le premier créneau du premier jour (minuit un jour de
//   repos) ; imprévu (maladie, deuil ou famille, panne de moto) possible le jour même, sans pénalité avant le premier
//   créneau, accepté mais marqué « prévenue après le début du créneau » ensuite ;
// - motif de la liste MOTIFS_ABSENCE, texte facultatif de TEXTE_MAX caractères ; ABSENCE-MAX-J jours au plus ;
// - hors connexion : délai jugé sur l'heure de saisie (heureDeSaisie : jamais après la réception, jamais avant la
//   dernière synchronisation connue) ;
// - nouvelle photo : PHOTO-REVERIF-J jours pour l'envoyer ; passé ce délai, plus de nouvelle mission jusqu'à la validation.
import { HEURE, JOUR, ecartJours, jourDe, type Jour } from './temps'

export const MOTIFS_ABSENCE = ['maladie', 'deuil_famille', 'panne_moto', 'demarches', 'autre'] as const
export type MotifAbsence = (typeof MOTIFS_ABSENCE)[number]
/** Imprévus : prévenus le jour même sans pénalité avant le premier créneau. */
export const IMPREVUS: MotifAbsence[] = ['maladie', 'deuil_famille', 'panne_moto']
/** Texte libre facultatif, en caractères (constante du moteur, pas un paramètre). */
export const TEXTE_MAX = 120

export type RefusAbsence = 'motif' | 'dates_inversees' | 'trop_longue' | 'date_passee' | 'delai'
export type Jugement = { ok: true; imprevu: boolean; apresDebut: boolean } | { ok: false; raison: RefusAbsence }

/** Espaces réduits, TEXTE_MAX caractères au plus. */
export const textePropre = (texte: string | null | undefined) => String(texte ?? '').split(/\s+/).filter(Boolean).join(' ').slice(0, TEXTE_MAX)

export const dureeJours = (du: Jour, au: Jour) => ecartJours(du, au) + 1

/** `premierCreneau` : début du premier créneau du jour `du` (minuit un jour de repos), instant. */
export function juger(motif: string, du: Jour, au: Jour, saisieLe: number, premierCreneau: number, prevenirH: number, maxJ: number): Jugement {
  if (prevenirH < 0 || maxJ < 1) throw new RangeError('paramètres d’absence invalides')
  if (!(MOTIFS_ABSENCE as readonly string[]).includes(motif)) return { ok: false, raison: 'motif' }
  if (au < du) return { ok: false, raison: 'dates_inversees' }
  if (dureeJours(du, au) > maxJ) return { ok: false, raison: 'trop_longue' }
  if (du < jourDe(saisieLe)) return { ok: false, raison: 'date_passee' }
  if (premierCreneau - saisieLe >= prevenirH * HEURE) return { ok: true, imprevu: false, apresDebut: false }
  if (!IMPREVUS.includes(motif as MotifAbsence)) return { ok: false, raison: 'delai' }
  return { ok: true, imprevu: true, apresDebut: saisieLe >= premierCreneau }
}

/** Heure retenue d'une demande faite hors connexion : celle du téléphone, jamais après la réception par le serveur,
 * jamais avant la dernière synchronisation connue (garde-fou contre une heure trafiquée). */
export function heureDeSaisie(saisie: number, recu: number, derniereSynchro: number | null): number {
  const t = Math.min(saisie, recu)
  if (derniereSynchro !== null && t < derniereSynchro) return Math.min(derniereSynchro, recu)
  return t
}

/** Fin du délai pour envoyer la nouvelle photo : PHOTO-REVERIF-J jours après la demande. */
export function photoEcheance(demandeeLe: number, jours: number): number {
  if (jours < 0) throw new RangeError('délai négatif')
  return demandeeLe + jours * JOUR
}

/** Plus de nouvelle mission : délai passé et nouvelle photo pas encore validée (envoyée ou non). */
export const photoBloque = (demandeeLe: number, maintenant: number, jours: number, validee: boolean) => !validee && maintenant >= photoEcheance(demandeeLe, jours)

/** Jours restants avant l'échéance (arrondis au jour supérieur ; 0 une fois passée). */
export const joursRestants = (echeance: number, maintenant: number) => Math.max(0, Math.ceil((echeance - maintenant) / JOUR))
