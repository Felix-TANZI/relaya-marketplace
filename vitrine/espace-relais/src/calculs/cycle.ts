// Cycle de vie d'un colis au relais (PR-02 « Cycle de vie », v2.0, aligné sur v6 et DP-20, DP-24, DP-26) : machine
// d'états pure. Chaque transition dit d'où elle part, où elle mène, et ce qu'elle exige : photo (v6 D15 : une photo à
// chaque changement de main, prise par le professionnel ; l'étape est REFUSÉE sans elle), PIN du membre (GEN-09),
// encaissement de la garde en espèces confirmé (GARDE-ESPECES), paiement Mobile Money confirmé (commande payable au
// retrait), contrôle « Tout est en ordre ». Les jours (J7 dernier jour, J8 à renvoyer) avancent seuls : etatDuJour().
import type { EtatColis } from '../donnees/domaines/colis'
import type { ParametresRelais } from './registre'

export type EvenementCycle =
  // Réception d'un lot (code de dépôt du livreur), colis par colis, puis validation (le livreur confirme)
  | 'resultat_ok'
  | 'resultat_reserve'
  | 'resultat_refus'
  | 'resultat_absent'
  | 'en_trop'
  | 'mise_en_groupage'
  | 'valider_lot'
  // Garde (automatiques, au changement de jour à Yaoundé)
  | 'debut_dernier_jour'
  | 'debut_renvoi'
  // Comptoir
  | 'remettre'
  | 'un_probleme' // constat au comptoir, garde et renvoi suspendus
  | 'refus_motive' // refus avec motif : constat
  | 'refus_sans_motif' // commande payable au retrait refusée sans motif : annulée (DP-24)
  | 'transfert' // le client change de relais après l'arrivée (TRANSFERT-RELAIS)
  | 'liberation_groupage'
  | 'decision_remettre' // décision du constat : le colis revient en stock
  | 'decision_faire_partir' // décision du constat : il repart (retour au vendeur)
  | 'depot_retour' // retour client au motif validé (scellé + photos), hors capacité
  | 'sortie' // confié au livreur, confirmé par lui

export interface Transition {
  de: readonly (EtatColis | null)[] // null : le colis n'existait pas au relais (en trop, retour déposé)
  vers: EtatColis
  photos: 'aucune' | 'une' | 'constat' | 'retour'
  /** Geste signé du PIN personnel du membre (GEN-09) ; les résultats colis par colis sont signés à la validation du lot. */
  pin: boolean
  automatique?: boolean
}

const EN_GARDE: EtatColis[] = ['en_stock', 'dernier_jour']
const A_FAIRE_PARTIR: EtatColis[] = ['a_renvoyer', 'a_faire_partir', 'refuse_comptoir', 'transfert_demande', 'retour_depose']

export const TRANSITIONS: Record<EvenementCycle, Transition> = {
  resultat_ok: { de: ['attendu'], vers: 'recu', photos: 'aucune', pin: false },
  resultat_reserve: { de: ['attendu'], vers: 'recu_reserve', photos: 'une', pin: false },
  resultat_refus: { de: ['attendu'], vers: 'refuse_reception', photos: 'une', pin: false },
  resultat_absent: { de: ['attendu'], vers: 'absent', photos: 'aucune', pin: false },
  en_trop: { de: [null], vers: 'recu_reserve', photos: 'une', pin: false },
  mise_en_groupage: { de: ['recu', 'recu_reserve'], vers: 'en_groupage', photos: 'aucune', pin: false },
  valider_lot: { de: ['recu', 'recu_reserve'], vers: 'en_stock', photos: 'une', pin: true },
  debut_dernier_jour: { de: ['en_stock'], vers: 'dernier_jour', photos: 'aucune', pin: false, automatique: true },
  debut_renvoi: { de: EN_GARDE, vers: 'a_renvoyer', photos: 'aucune', pin: false, automatique: true },
  remettre: { de: EN_GARDE, vers: 'remis', photos: 'une', pin: true },
  un_probleme: { de: EN_GARDE, vers: 'en_constat', photos: 'constat', pin: true },
  refus_motive: { de: EN_GARDE, vers: 'en_constat', photos: 'constat', pin: true },
  refus_sans_motif: { de: EN_GARDE, vers: 'refuse_comptoir', photos: 'aucune', pin: true },
  transfert: { de: EN_GARDE, vers: 'transfert_demande', photos: 'aucune', pin: false }, // demandé par le client (serveur)
  liberation_groupage: { de: ['en_groupage'], vers: 'en_stock', photos: 'aucune', pin: false },
  decision_remettre: { de: ['en_constat'], vers: 'en_stock', photos: 'aucune', pin: false }, // décision de BelivaY
  decision_faire_partir: { de: ['en_constat'], vers: 'a_faire_partir', photos: 'aucune', pin: false }, // décision de BelivaY
  depot_retour: { de: [null, 'remis'], vers: 'retour_depose', photos: 'retour', pin: true }, // remis : retiré ici, rapporté
  sortie: { de: A_FAIRE_PARTIR, vers: 'parti', photos: 'une', pin: true },
}

/** Ce que le geste apporte (les preuves et confirmations du comptoir). */
export interface ContexteGeste {
  photos?: number
  pinOk?: boolean
  scelle?: 'intact' | 'casse' | null // retour déposé : scellé du retour
  controle?: 'en_ordre' | 'probleme' | null // remise : « Tout est en ordre » / « Un problème »
  gardeDue?: number // espèces à encaisser (remise)
  encaissementConfirme?: boolean
  payableAuRetrait?: boolean
  paiementConfirme?: boolean
  codeBloque?: boolean
  formationOk?: boolean // DRO-01 : un employé ne remet qu'après les modules obligatoires
  enLigne?: boolean
  /** Remises déjà faites hors connexion aujourd'hui (A-VALIDER ARL-03 : au plus PR-HL-REMISES). */
  remisesHorsLigneDuJour?: number
}

export type RefusCycle =
  | 'transition_interdite'
  | 'photo_manquante'
  | 'pin_requis'
  | 'scelle_requis'
  | 'controle_requis'
  | 'probleme_signale' // « Un problème » : pas de remise, un constat
  | 'encaissement_non_confirme'
  | 'paiement_non_confirme'
  | 'code_bloque'
  | 'formation_incomplete'
  | 'reseau_requis' // OFF-02 : le paiement Mobile Money exige le réseau
  | 'plafond_hors_ligne' // ARL-03 : trop de remises hors connexion aujourd'hui

export const photosExigees = (t: Transition, p: Pick<ParametresRelais, 'constatPhotosMin' | 'retourPhotos'>) => (t.photos === 'aucune' ? 0 : t.photos === 'une' ? 1 : t.photos === 'constat' ? p.constatPhotosMin : p.retourPhotos)

/** Vérifie une transition : l'état d'arrivée, ou la raison du refus (l'écran la met en mots). Pures règles : la
 * démonstration et le serveur l'appliquent avant d'écrire. */
export function transition(de: EtatColis | null, ev: EvenementCycle, ctx: ContexteGeste, p: Pick<ParametresRelais, 'constatPhotosMin' | 'retourPhotos' | 'horsLigneRemisesParJour'>): { ok: true; vers: EtatColis } | { ok: false; raison: RefusCycle } {
  const t = TRANSITIONS[ev]
  const non = (raison: RefusCycle) => ({ ok: false as const, raison })
  if (!t.de.includes(de)) return non('transition_interdite')
  if (ev === 'remettre') {
    if (ctx.codeBloque) return non('code_bloque')
    if (ctx.formationOk === false) return non('formation_incomplete')
    if (ctx.payableAuRetrait && !ctx.paiementConfirme) return non(ctx.enLigne === false ? 'reseau_requis' : 'paiement_non_confirme')
    // ARL-03 : hors connexion, la remise est permise quand seule la garde en espèces est due, dans la limite du jour.
    if (ctx.enLigne === false && (ctx.remisesHorsLigneDuJour ?? 0) >= p.horsLigneRemisesParJour) return non('plafond_hors_ligne')
    if ((ctx.gardeDue ?? 0) > 0 && !ctx.encaissementConfirme) return non('encaissement_non_confirme')
    if (!ctx.controle) return non('controle_requis')
    if (ctx.controle === 'probleme') return non('probleme_signale')
  }
  if (ev === 'depot_retour' && !ctx.scelle) return non('scelle_requis')
  if ((ctx.photos ?? 0) < photosExigees(t, p)) return non('photo_manquante')
  if (t.pin && !ctx.pinOk) return non('pin_requis')
  return { ok: true, vers: t.vers }
}

/** État d'un colis en garde selon son rang du jour : J7 « dernier jour », au-delà « à renvoyer » (PR-02 ; le rang
 * vient de garde.ts, jours fermés et suspendus compris dans le rang, jamais facturés). */
export function etatDuJour(e: EtatColis, rangDuJour: number | null, estDernierJour: boolean, renvoiAtteint: boolean): EtatColis {
  if (e !== 'en_stock' && e !== 'dernier_jour') return e
  if (renvoiAtteint) return 'a_renvoyer'
  if (estDernierJour && rangDuJour !== null) return 'dernier_jour'
  return e
}

/** États où le colis est physiquement au relais (occupation : les retours déposés sont comptés à part). */
export const PRESENTS: readonly EtatColis[] = ['recu', 'recu_reserve', 'en_stock', 'dernier_jour', 'a_renvoyer', 'en_constat', 'en_groupage', 'transfert_demande', 'refuse_comptoir', 'a_faire_partir', 'retour_depose']
/** États à faire partir (sorties confiées au livreur). */
export const A_FAIRE_PARTIR_ETATS: readonly EtatColis[] = A_FAIRE_PARTIR
/** États où le colis peut être remis au client (si son groupe est complet et son code présenté). */
export const REMETTABLES: readonly EtatColis[] = EN_GARDE
/** Gestes permis hors connexion (OFF-01, OFF-02) ; le paiement Mobile Money ne l'est jamais. */
export const HORS_LIGNE_PERMIS: readonly EvenementCycle[] = ['resultat_ok', 'resultat_reserve', 'resultat_refus', 'resultat_absent', 'en_trop', 'valider_lot', 'remettre', 'un_probleme', 'refus_motive', 'depot_retour', 'sortie']
