// Domaine « aide » (possédé par PR-08 Communication). Règles : AID-01 à AID-05, GEN-08, OFF-06, REC-01, RET-12, CAL-21,
// CAL-10, REC-04, TRU-07, VER-09, PR-RC-19, PR-RC-29, ARL-26, DP-12, DP-26, DP-39.
// - Questions fréquentes : leurs réponses reprennent EXACTEMENT les règles (valeurs lues au registre) et sont éditables
//   en console (AID-02) : le serveur les envoie en français et en anglais. Filtrées selon le rôle : l'employé ne lit rien
//   sur l'argent du relais ni sur la convention (ARL-06).
// - « Convention et partenariat » : le relais VOIT ce que dit la convention et où DEMANDER ; il ne décide jamais
//   (GEN-06, DP-66 appliquée au relais).
// - Fiches de travail du comptoir : recevoir, remettre, garde en espèces, Mobile Money au comptoir, faire partir,
//   constat, fermeture, sans réseau ; chacune ouvre l'écran du geste.
// - Mode papier (AID-04, OFF-06) : déclenché seulement par une diffusion de panne hors système (SMS ou WhatsApp de
//   diffusion, seul usage de WhatsApp côté relais : AID-01) ; registre papier (référence, code donné par le client,
//   pièce d'identité, signature du client, heure) ; seuls les colis SANS MONTANT à payer se remettent ; tout est saisi
//   dans l'application dans les PR-PAPIER-SAISIE-H heures qui suivent la fin de la panne, avec une photo de la page
//   (v6 D15) et le PIN du membre (GEN-09).
import type { Instant, Origine, Photo, Resultat } from '../communs'
import type { Texte } from './notifications'
import type { Droit } from './session'

export interface LienAide {
  libelle: Texte
  route: string
  params?: Record<string, string>
}

export interface QuestionAide {
  id: string
  question: Texte
  reponse: Texte
  /** Règles dont la réponse est la mise en mots (console : AID-02). */
  regles: string[]
  lien: LienAide | null
}

export interface FicheAide {
  id: string
  titre: Texte
  resume: Texte
  etapes: Texte[]
  regles: string[]
  /** Écran du geste (ouvert par « Ouvrir l'écran »). */
  route: string
  icone: string
}

export interface PanneGenerale {
  reference: string // « DIF-0312 » (diffusion de la console)
  canal: 'sms' | 'whatsapp'
  du: Instant
  au: Instant | null // null : panne en cours
  /** Fin du délai de saisie du registre (au + PR-PAPIER-SAISIE-H). */
  saisirAvant: Instant | null
}

export type RefusLigne =
  | 'aucune_panne'
  | 'delai_depasse'
  | 'hors_panne'
  | 'photo_manquante'
  | 'piece_requise'
  | 'signature_requise'
  | 'introuvable'
  | 'code_faux'
  | 'montant_du'
  | 'deja_remis'
  | 'pin_faux'
  | 'bloque'
  | 'transition_interdite'

export interface LigneRegistre {
  id: string
  panne: string
  reference: string
  /** Heure écrite sur le registre (remise faite pendant la panne). */
  heure: Instant
  saisieLe: Instant
  par: string // initiales du membre
  etat: 'remise' | 'refusee'
  motif: RefusLigne | null
}

export interface SaisieLigne {
  panne: string
  reference: string
  /** Code donné par le client et écrit sur le registre (vérifié par le serveur, jamais gardé). */
  code: string
  heure: Instant
  pieceVerifiee: boolean
  signature: boolean
  photo: Photo | null
  pin: string
}

export interface Aide {
  questions: QuestionAide[]
  /** Questions sur la convention (gérant) : voir, demander, jamais décider. */
  convention: QuestionAide[]
  fiches: FicheAide[]
  support: { horaires: Texte; ouvertMaintenant: boolean; delaiH: number }
  /** Colonnes du registre papier (OFF-06). */
  registrePapier: Texte[]
  /** Dernière panne générale annoncée (en cours, ou dont la saisie est encore ouverte), sinon null. */
  panne: PanneGenerale | null
  papierSaisieH: number
}

export interface RegistrePapier {
  panne: PanneGenerale | null
  lignes: LigneRegistre[]
  colonnes: Texte[]
  papierSaisieH: number
}

export interface DomaineAide {
  aide(): Promise<Aide>
  /** Une fiche du comptoir (adresse « aide-fiche?id=… ») ; null si elle n'existe pas ou n'est pas pour ce rôle. */
  fiche(id: string): Promise<FicheAide | null>
  registre(): Promise<RegistrePapier>
  /** Saisit une ligne du registre papier : la remise est rejouée à l'heure écrite si le serveur l'accepte. */
  saisirLigne(l: SaisieLigne, o: Origine): Promise<Resultat<{ ligne: LigneRegistre }, RefusLigne>>
}

/** Droit demandé pour voir une fiche (config/droits.ts : l'employé ne voit que les gestes qui lui sont permis). */
export type DroitFiche = Droit | null
