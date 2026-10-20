// Libération et versements du vendeur : portage fidèle de moteurs/belivay_moteurs/versements.py (VD-02 p7, VD-09 p11,
// p25-26, p31, GEN-04, VER-02, VER-04 ; DP-23, DP-55 : Q-11 à Q-13, Q-15, Q-19, Q-58 à Q-60, Q-64, Q-65 ; DP-56 : Q-26 ;
// DP-57 : A-8). Instants en millisecondes, à l'heure de Yaoundé (UTC+1) ; jours civils « AAAA-MM-JJ ».
//
// Une seule source pour la libération (audit V3) : fermetureDuRetour, dateDeLiberation et vendrediDeVersement
// acceptent un jour civil (litiges.ts) ou un instant (espace vendeur) ; litiges.liberation les appelle.
//
//   t_fermeture  = min(« Tout est en ordre » ; retrait + 7 j)                   VD-RET-FENETRE (Q-58)
//   t_libération = t_fermeture + 3 j (Bronze, Argent) · 1 j (Or, Platine) · 14 j (carte, DP-23)
//   après un litige gagné ou un retour refusé : max(date prévue ; fin du gel) (Q-60)
//   versement(V) = Σ gardé libéré non versé et non gelé, t_libération ≤ jeudi 23 h 59, versé le vendredi V avant 12 h
//
// - Gel (LIB-02, GEL-01, GEL-02) : un litige, un retour, un recours possible ou en attente (litiges.finDuGel) ou une
//   vérification anti-fraude gèle la somme aussitôt, même pendant le compte à rebours ; une somme gelée n'a jamais de
//   date de versement et ne part pas le vendredi. Les cinq états de l'argent sont dans argent-vendeur.ts.
// - Reprise jamais payée (A-8, VD-REPRISE-IMPAYEE) : dès la demande Mobile Money restée impayée, ventes bloquées
//   jusqu'au règlement ; 90 jours après la reprise, recouvrement légal proposé, décidé par une personne.
import { pourCentAffiche } from './argent'
import type { Palier, ParametresVersements } from './registre'
import { ajouterJours, debutDuJour, ecartJours, HEURE, JOUR, jourDe, jourSemaine, type Jour } from './temps'

/** Jour civil (litiges, côté client) ou instant en millisecondes (espace vendeur). */
export type Moment = number | Jour

/** Ce que demande la libération : ParametresVersements (VD-*) ou ParametresLitiges (RET-FENETRE, LIB-*), qui concordent. */
export interface DelaisDeLiberation {
  fenetreRetourJours: number
  libStandardJours: number
  libOrJours: number
  libCarteJours: number
}

const plusJours = <M extends Moment>(m: M, jours: number): M => (typeof m === 'string' ? ajouterJours(m, jours) : (m as number) + jours * JOUR) as M

// ── Libération ──────────────────────────────────────────────────────────────────────────────────────────

/** Sans confirmation du client, le retrait + 7 jours fait office de fermeture (Q-58, CAL-29). */
export function fermetureDuRetour<M extends Moment>(retrait: M, toutEnOrdre: M | null, p: DelaisDeLiberation): M {
  const fin = plusJours(retrait, p.fenetreRetourJours)
  return toutEnOrdre === null || fin < toutEnOrdre ? fin : toutEnOrdre
}

/** La seule règle de libération (PAL-02, VD09-R11, DP-23) : carte 14 jours ; Or et Platine 1 jour ; sinon 3 jours, en
 * jours calendaires. BLV-00007 confirmée le vendredi 18 à 18 h, Bronze : libérée le lundi 21 à 18 h. */
export function dateDeLiberation<M extends Moment>(fermeture: M, palier: Palier, carte: boolean, p: DelaisDeLiberation): M {
  const jours = carte ? p.libCarteJours : palier === 'Or' || palier === 'Platine' ? p.libOrJours : p.libStandardJours
  return plusJours(fermeture, jours)
}

/** Litige gagné ou retour refusé : aussitôt si la date prévue est passée, sinon la date prévue (Q-60). */
export const liberationApresLitige = (prevue: number, finDuLitige: number) => Math.max(prevue, finDuLitige)

/** Barre « Se libère » : 63 h 48 sur 72 h = 89 %, entre 0 et 100. */
export function progressionPourCent(fermeture: number, liberation: number, maintenant: number): number {
  const ecoule = Math.min(Math.max(maintenant - fermeture, 0), liberation - fermeture)
  return pourCentAffiche(Math.floor(ecoule / 1000), Math.floor((liberation - fermeture) / 1000))
}

// ── Vendredi du versement ───────────────────────────────────────────────────────────────────────────────

/** Fin de l'arrêté des comptes : jeudi 23 h 59 (la minute comprise), heure de Yaoundé. */
export const arrete = (jourArrete: Jour, p: ParametresVersements) => debutDuJour(jourArrete) + (p.heureArrete[0] * 60 + p.heureArrete[1] + 1) * 60 * 1000

/** Premier vendredi dont l'arrêté (la veille, 23 h 59) suit la libération (Q-59) ; un vendredi férié compte (Q-13). Un
 * jour civil compte dès 0 h, heure de Yaoundé (libéré un jeudi : vendredi ; un vendredi : le suivant). */
export function vendrediDeVersement(liberation: Moment, p: ParametresVersements): Jour {
  const instant = typeof liberation === 'string' ? debutDuJour(liberation) : liberation
  const local = jourDe(instant)
  let jeudi = ajouterJours(local, (((p.jourArrete - jourSemaine(local)) % 7) + 7) % 7)
  if (instant >= arrete(jeudi, p)) jeudi = ajouterJours(jeudi, 7)
  return ajouterJours(jeudi, (((p.jourVersement - p.jourArrete) % 7) + 7) % 7)
}

/** « Versé vendredi avant 12 h » (GEN-04). */
export const heureLimite = (vendredi: Jour, p: ParametresVersements) => debutDuJour(vendredi) + p.heureVersement * HEURE

/** Ce qui peut geler une somme (GEL-02, LIB-02 ; recours : DP-56 Q-26). Un gel est toujours attaché à une commande. */
export type MotifGel = 'litige' | 'retour' | 'recours' | 'vérification anti-fraude' // recours : délai ouvert ou réponse attendue

/** Montant gardé d'une vente, tel que figé au paiement. */
export interface Gain {
  reference: string // BLV-00007
  garde: number
  liberation: number | null // null : pas encore retirée (ou date pas encore connue)
  verse?: boolean
  gel?: MotifGel | null // le gel prime sur tout compte à rebours (LIB-02)
}

/** Σ gardé libéré non versé et non gelé dont l'arrêté tombe au plus tard la veille de ce vendredi, sans minimum (Q-12).
 * Une somme gelée ne part pas, même si sa date de libération est passée (LIB-02, GEL-01). */
export function montantDu(vendredi: Jour, gains: Gain[], p: ParametresVersements): number {
  return gains.filter((g) => !g.verse && !g.gel && g.liberation !== null && vendrediDeVersement(g.liberation, p) <= vendredi).reduce((s, g) => s + g.garde, 0)
}

/** Gel pour vérification anti-fraude (GEL-02, Q-64, VD-GEL-ANTIFRAUDE) : motif écrit au plus tard 48 h après le gel ; le
 * gel lui-même n'a pas d'échéance. */
export const echeanceMotifAntifraude = (debutDuGel: number, p: ParametresVersements) => debutDuGel + p.gelMotifHeures * HEURE

/** Vrai si le motif n'a pas été écrit à temps (alerte de la console, GEL-02). */
export const motifAntifraudeEnRetard = (debutDuGel: number, motifEcrit: number | null, maintenant: number, p: ParametresVersements) =>
  (motifEcrit ?? maintenant) > echeanceMotifAntifraude(debutDuGel, p)

/** Référence annoncée avant le versement et retrouvée dans l'historique (VER-02) : BLV-VS-nnnn, au moins 4 chiffres. */
export function referenceDeVersement(numero: number): string {
  if (typeof numero !== 'number' || !Number.isInteger(numero) || numero < 1) throw new RangeError(`numéro de versement invalide ${String(numero)}`)
  return `BLV-VS-${String(numero).padStart(4, '0')}`
}

// ── Refus, suspension, changement de numéro ─────────────────────────────────────────────────────────────

/** Refusé vendredi 25 : essais samedi 26, dimanche 27 et lundi 28 à la même heure (F7). */
export const essaisApresRefus = (refus: number, p: ParametresVersements) => Array.from({ length: p.essais }, (_, i) => refus + p.intervalleEssaisHeures * (i + 1) * HEURE)

/** Le refus du vendredi, puis l'échec des 3 essais : versements suspendus, le support prend la main. */
export const suspendu = (refusConsecutifs: number, p: ParametresVersements) => refusConsecutifs > p.essais

export const finDeRevue = (changementDeNumero: number, p: ParametresVersements) => changementDeNumero + p.revueNumeroJours * JOUR

/** Reprise automatique (Q-13) : le vendredi après la correction, ou après la revue de 7 jours si le numéro a changé. */
export const premierVersementApresCorrection = (correction: number, numeroChange: boolean, p: ParametresVersements): Jour =>
  vendrediDeVersement(numeroChange ? finDeRevue(correction, p) : correction, p)

// ── Reprise d'un montant déjà libéré ────────────────────────────────────────────────────────────────────

export interface VersementNet {
  verse: number
  repris: number // déduit ce vendredi, ligne « Repris » datée dans Mes gains
  repriseReportee: number // reste à reprendre sur les vendredis suivants
  demandeMobileMoney: boolean // le reste n'est pas couvert après 30 jours (Q-11)
}

/** Reprise de 17 840 F, 10 000 F dus : 0 F versé, 7 840 F reportés (Q-11). */
export function appliquerReprise(du: number, repriseRestante: number, repriseDecideeLe: Jour | null, vendredi: Jour, p: ParametresVersements): VersementNet {
  if (du < 0 || repriseRestante < 0) throw new RangeError('montants négatifs')
  const repris = Math.min(du, repriseRestante)
  const reste = repriseRestante - repris
  const tard = repriseDecideeLe !== null && vendredi > ajouterJours(repriseDecideeLe, p.repriseDemandeJours)
  return { verse: du - repris, repris, repriseReportee: reste, demandeMobileMoney: reste > 0 && tard }
}

// ── Reprise jamais payée (A-8) ──────────────────────────────────────────────────────────────────────────

export type EtatReprise =
  | 'soldée'
  | 'déduite des versements' // le reste est reporté sur les vendredis suivants (Q-11)
  | 'ventes bloquées' // demande Mobile Money impayée : jusqu'au règlement, avec relances
  | 'recouvrement légal proposé' // décidé par une personne, contestable une fois

export interface SuiviReprise {
  etat: EtatReprise
  ventesBloquees: boolean // offres retirées des propositions aux clients, publication fermée
  demandeMobileMoney: boolean
  decisionHumaine: boolean // le recouvrement ne part jamais seul
}

/** DP-57 (A-8) : reprise de 17 840 F décidée le 20 sept. et jamais couverte : déduite des versements jusqu'au 20 oct. ;
 * dès le 21 oct., demande Mobile Money et ventes bloquées jusqu'au règlement ; dès le 20 déc. (au-delà de 90 jours),
 * recouvrement légal proposé, décidé par une personne. Un reste à 0 F lève tout blocage. */
export function suiviReprise(reste: number, repriseDecideeLe: Jour, jour: Jour, p: ParametresVersements): SuiviReprise {
  if (reste < 0) throw new RangeError('reste négatif')
  if (reste === 0) return { etat: 'soldée', ventesBloquees: false, demandeMobileMoney: false, decisionHumaine: false }
  const depuis = ecartJours(repriseDecideeLe, jour)
  if (depuis > p.recouvrementJours) return { etat: 'recouvrement légal proposé', ventesBloquees: true, demandeMobileMoney: true, decisionHumaine: true }
  if (depuis > p.repriseDemandeJours) return { etat: 'ventes bloquées', ventesBloquees: true, demandeMobileMoney: true, decisionHumaine: false }
  return { etat: 'déduite des versements', ventesBloquees: false, demandeMobileMoney: false, decisionHumaine: false }
}
