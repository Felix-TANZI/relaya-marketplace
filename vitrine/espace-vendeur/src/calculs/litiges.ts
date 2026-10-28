// Litiges, retours, remplacement et libération, côté vendeur : portage fidèle de moteurs/belivay_moteurs/litiges.py
// (CL-09, CL-11 ; CAL-27 à CAL-29 ; CLT-24, CCY-23, CIF-17 ; RET-04, DCS-03 ; DP-01, DP-10, DP-27, DP-28, DP-35 ;
// DP-56 : Q-26, Q-27 ; DP-57 : L-4). Instants en millisecondes (heure de Yaoundé), jours civils « AAAA-MM-JJ ».
//
// - Remboursement automatique sous le seuil du palier du client : payé par BelivaY, le vendeur est payé (CCY-23).
// - Le vendeur répond sous LIT-VENDEUR-H ; BelivaY décide au plus tard LIT-DECISION-H après ; un recours, une fois,
//   sous 48 h après la décision ; un arrangement attend la réponse du client 5 jours (DP-35).
// - Gel pendant le recours (DCS-03, Q-26, L-4) : après la décision, l'argent reste gelé jusqu'à la fin du délai de
//   recours, ou jusqu'à la réponse au recours déposé dans ce délai.
// - Trajet retour RET-TRAJET (500 F) à la charge de la partie en tort. Dû du vendeur en tort (RET-04, Q-27) : trajet +
//   livraison remboursée, pris d'abord sur le montant gelé de la commande, le reste sur ses versements suivants,
//   comme une reprise (Q-11, versements.appliquerReprise).
// - La part de livraison d'un colis (F(commande) − F(commande sans ce colis), Off conservé) vient du moteur des frais
//   du client, au serveur : elle est passée ici telle quelle (INTEGRATION.md).
// - Libération = fermeture du retour + LIB-STD (Bronze, Argent) ou LIB-OR (Or, Platine) ; carte : LIB-CARTE ; un
//   litige suspend. Une seule source (audit V3) : ces fonctions appellent celles de versements.ts.
import type { Palier, ParametresLitiges } from './registre'
import { DECALAGE_YAOUNDE_MS, HEURE, JOUR, type Jour } from './temps'
import { dateDeLiberation, fermetureDuRetour, vendrediDeVersement } from './versements'

// ── Remboursement automatique ───────────────────────────────────────────────────────────────────────────

export type PalierIFA = 'Élevé' | 'Standard' | 'À instruire' | 'Plafonné'

export const seuilAutomatique = (palier: PalierIFA, p: ParametresLitiges): number =>
  palier === 'Élevé' ? p.autoEleve : palier === 'Standard' ? p.autoStandard : 0

/** Sous le seuil du palier : remboursé tout de suite par BelivaY, sans dossier (CAL-27, CCY-23, CLT-24). */
export const remboursementAutomatique = (montant: number, palier: PalierIFA, p: ParametresLitiges) => montant > 0 && montant <= seuilAutomatique(palier, p)

// ── Échéances d'un litige ───────────────────────────────────────────────────────────────────────────────

export interface Echeances {
  reponseVendeur: number
  decisionAuPlusTard: number
}

/** LIT-3042 ouvert mer. 23 à 17 h 15 : vendeur jusqu'au ven. 25 à 17 h 15, décision au plus tard sam. 26 à 17 h 15. */
export function echeances(ouverture: number, p: ParametresLitiges): Echeances {
  const vendeur = ouverture + p.vendeurHeures * HEURE
  return { reponseVendeur: vendeur, decisionAuPlusTard: vendeur + p.decisionHeures * HEURE }
}

export const recoursPossible = (decision: number, maintenant: number, recoursDejaFait: boolean, p: ParametresLitiges) =>
  !recoursDejaFait && maintenant <= decision + p.recoursHeures * HEURE

/** Gel pendant le recours (DCS-03, Q-26 ; L-4 pour un retour contesté) : jusqu'à la fin du délai de recours (48 h) ; si
 * un recours est déposé dans ce délai, jusqu'à la réponse. null : toujours gelé (recours en attente de réponse). La
 * libération se calcule ensuite avec versements.liberationApresLitige(date prévue, fin du gel) (Q-60). Décision sam. 26
 * à 17 h 15, sans recours : gel jusqu'au lun. 28 à 17 h 15. */
export function finDuGel(decision: number, recoursDepose: number | null, reponseAuRecours: number | null, p: ParametresLitiges): number | null {
  const finDuDelai = decision + p.recoursHeures * HEURE
  if (recoursDepose === null || recoursDepose > finDuDelai) return finDuDelai // un recours hors délai n'est pas reçu
  return reponseAuRecours
}

/** Sans réponse du client à cette date, le dossier revient en examen (DP-35). */
export const finReponseArrangement = (proposition: number, p: ParametresLitiges) => proposition + p.arrangementJours * JOUR

// ── Retour ──────────────────────────────────────────────────────────────────────────────────────────────

export type Motif = 'non conforme' | 'abîmé' | 'contrefaçon' | 'défaut caché' | 'vice caché'

/** retour : dans la fenêtre ; litige normal : défaut caché découvert après RET-DEFAUT-H (DP-35) ; vice caché : jusqu'à
 * RET-VICE, hors escrow, même après « Tout est en ordre » (DP-27). */
export type Voie = 'retour' | 'litige normal' | 'vice caché' | 'aucune'

/** Quelle voie s'ouvre pour un problème signalé après le retrait (CAL-28, DP-27, DP-35). */
export function voieDeRetour(motif: Motif | null, retrait: number, signalement: number, toutEnOrdre: boolean, p: ParametresLitiges): Voie {
  if (motif === null) return 'aucune' // pas de retour sans motif au lancement (DP-35)
  const depuis = signalement - retrait
  if (motif === 'vice caché') return depuis <= p.viceCacheJours * JOUR ? 'vice caché' : 'aucune'
  if (toutEnOrdre || depuis > p.fenetreRetourJours * JOUR) return 'aucune'
  if (motif === 'défaut caché' && depuis > p.defautCacheHeures * HEURE) return 'litige normal'
  return 'retour'
}

export type PartieEnTort = 'client' | 'vendeur' | 'transporteur'

export interface RemboursementRetour {
  articles: number
  livraison: number // part de livraison du colis, remboursée si le vendeur ou le transporteur est en tort
  trajetRetenu: number // trajet retour retenu si le client est en tort
  montant: number
  trajetALaChargeDe: PartieEnTort
}

/** Remboursement d'un retour accepté, après réception et inspection (CL-11, DP-10, DP-35). Client en tort : 23 000 − 500
 * = 22 500 F. Vendeur ou transporteur en tort : articles + part de livraison du colis (`livraisonDuColis`, calculée au
 * serveur par le moteur des frais : 900 F pour BLV-51702). */
export function rembourserRetour(prixDesArticles: number, enTort: PartieEnTort, p: ParametresLitiges, livraisonDuColis = 0): RemboursementRetour {
  if (enTort === 'client') {
    const retenu = Math.min(p.trajetRetour, prixDesArticles)
    return { articles: prixDesArticles, livraison: 0, trajetRetenu: retenu, montant: prixDesArticles - retenu, trajetALaChargeDe: enTort }
  }
  if (livraisonDuColis < 0) throw new RangeError('part de livraison négative')
  return { articles: prixDesArticles, livraison: livraisonDuColis, trajetRetenu: 0, montant: prixDesArticles + livraisonDuColis, trajetALaChargeDe: enTort }
}

/** Ce que doit le vendeur en tort sur un retour (RET-04, DP-35, DP-56 Q-27). */
export interface DuDuVendeur {
  trajet: number // trajet retour (RET-TRAJET)
  livraison: number // part de livraison remboursée au client
  total: number
  prisSurLaCommande: number // retenu sur le montant gelé de la commande
  reporte: number // reste : déduit des versements suivants comme une reprise (Q-11)
}

/** Vendeur en tort : il paie le trajet retour (500 F) et la livraison remboursée au client, pris sur la commande gelée,
 * sinon sur ses versements suivants (Q-27, Q-11). Client ou transporteur en tort : le vendeur ne doit rien. BLV-51702,
 * vendeur en tort : 500 + 900 = 1 400 F ; rien de gelé : 1 400 F reportés. */
export function duDuVendeur(r: RemboursementRetour, geleSurLaCommande: number, p: ParametresLitiges): DuDuVendeur {
  if (geleSurLaCommande < 0) throw new RangeError('montant gelé négatif')
  if (r.trajetALaChargeDe !== 'vendeur') return { trajet: 0, livraison: 0, total: 0, prisSurLaCommande: 0, reporte: 0 }
  const total = p.trajetRetour + r.livraison
  const pris = Math.min(total, geleSurLaCommande)
  return { trajet: p.trajetRetour, livraison: r.livraison, total, prisSurLaCommande: pris, reporte: total - pris }
}

/** Sans réponse du vendeur à cette heure, le remboursement part automatiquement. */
export const finInspection = (reception: number, p: ParametresLitiges) => reception + p.inspectionHeures * HEURE

/** RET-REMPL-DELAI heures ouvrées, le dimanche ne compte pas (heure de Yaoundé) : au-delà, sans expédition, remboursement. */
export function echeanceRemplacement(debut: number, p: ParametresLitiges): number {
  let reste = p.remplacementHeuresOuvrees * HEURE
  let t = debut + DECALAGE_YAOUNDE_MS // heure murale de Yaoundé, lue en UTC
  while (reste > 0) {
    const minuit = Math.floor(t / JOUR) * JOUR + JOUR
    if (new Date(t).getUTCDay() === 0) {
      t = minuit // dimanche : on saute au lundi 0 h
      continue
    }
    const pas = Math.min(minuit - t, reste)
    t += pas
    reste -= pas
  }
  return t - DECALAGE_YAOUNDE_MS
}

// ── Libération du vendeur ───────────────────────────────────────────────────────────────────────────────

/** Fermeture = 7 jours après le retrait, ou le jour où le client touche « Tout est en ordre » (CAL-29) :
 * versements.fermetureDuRetour, en jours civils. */
export const fermetureDuRetourJour = (retrait: Jour, toutEnOrdreLe: Jour | null, p: ParametresLitiges): Jour => fermetureDuRetour(retrait, toutEnOrdreLe, p.versements)

/** [date de libération, vendredi du versement] ; null tant qu'un litige suspend (CAL-29). Carte : 14 j ; Or et Platine :
 * 1 j ; sinon 3 j ; arrêté le jeudi à 23 h 59 : libéré un vendredi, versé le vendredi suivant (Q-59). Une seule source :
 * versements.dateDeLiberation et versements.vendrediDeVersement (audit V3). */
export function liberation(fermeture: Jour, palier: Palier, payeeParCarte: boolean, litigeEnCours: boolean, p: ParametresLitiges): [Jour, Jour] | null {
  if (litigeEnCours) return null
  const libre = dateDeLiberation(fermeture, palier, payeeParCarte, p.versements)
  return [libre, vendrediDeVersement(libre, p.versements)]
}
