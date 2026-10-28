// Domaine « incidents » (possédé par PR-07 Incidents) : constats du relais, dépôts de retour, dossiers et leur fil.
// Règles (PR-07 LIT-01 à LIT-13, v6 D15 et D18, DP-27, DP-28, DP-35, ARL-17, ARL-22, ARL-39, ARL-40, PR-RC-06, PR-RC-12) :
// - LE RELAIS CONSTATE, BELIVAY DÉCIDE (GEN-06) : le gérant ouvre un constat (motif ARL-17, PR-CONSTAT-PHOTOS-MIN
//   photos prises par l'application, PIN), garde le colis et remet ou fait partir selon la décision. Il ne tranche jamais,
//   ne promet rien, ne retient rien.
// - Constat sur un colis EN GARDE (en stock, dernier jour) : garde et calendrier de renvoi suspendus, sans frais, jusqu'à
//   la décision. Un colis déjà remis ne se constate pas au comptoir : le client signale depuis son application (fenêtre
//   RET-FENETRE, défaut caché RET-DEFAUT-H, vice caché RET-VICE) ; si BelivaY valide un retour, il le dépose ici.
// - Contestation au retrait : le gérant photographie le déballage devant le client (v6 D15), photos seulement.
// - Délais du dossier (DP-35) : vendeur LIT-VENDEUR-H, décision au plus LIT-DECISION-H après son échéance, un recours
//   sous LIT-RECOURS-H ; ils partent de la RÉCEPTION du constat par le serveur (constat fait hors connexion : OFF-01).
// - Fil du dossier (MSG-03, ARL-40) : ouvert avec le dossier, BelivaY peut y demander une photo ; fermé à la clôture
//   définitive (après le délai de recours), lisible PR-PREUVES-CONSERV-J jours.
// - Le relais peut CONTESTER une décision qui le met en cause, UNE fois, sous PR-CONTESTATION-H (ARL-22 : retenue sur la
//   valeur nette, au plus la moitié d'un versement) ; montant de la retenue jamais montré à un employé (champ à null).
// - Dépôt de retour : seul un retour VALIDÉ par BelivaY se dépose (« Retour non validé : ne le prenez pas ») ; scellé du
//   retour + PR-RETOUR-PHOTOS-MIN photos ; jamais facturé, hors capacité, payé au relais comme une remise de sa classe.
// - Anonymat (GEN-01) : aucune identité de client ni de vendeur ; la destination d'un retour est la boutique.
import type { Acteur, ClasseColis, Francs, Instant, Origine, Photo, Resultat } from '../communs'
import type { EtatColis, MotifConstat } from './colis'

/** Motifs d'un dossier : ceux du constat au comptoir (ARL-17), et ceux d'un signalement du client qui concerne le relais. */
export type MotifDossier = MotifConstat | 'defaut_cache' | 'vice_cache' | 'colis_ouvert'
/** Motifs du constat au comptoir (ARL-17 ; « manquant » et « emballage ouvert » se posent à la réception). */
export const MOTIFS_COMPTOIR: readonly MotifConstat[] = ['non_conforme', 'abime', 'contrefacon']

/** Les 5 étapes affichées (LIT-08) ; « clos » après le délai de recours. */
export type EtapeDossier = 'constat' | 'reponse_vendeur' | 'mediation' | 'decision' | 'recours' | 'clos'
export const ETAPES: readonly Exclude<EtapeDossier, 'clos'>[] = ['constat', 'reponse_vendeur', 'mediation', 'decision', 'recours']

export interface MessageDossier {
  id: string
  le: Instant
  de: 'relais' | 'belivay' | 'systeme'
  /** Initiales du membre (relais) ; « BelivaY » pour l'équipe ; null pour le système. */
  par: string | null
  texte: string
  photos: Photo[]
}

export interface Contestation {
  le: Instant
  motif: string
  etat: 'en_examen' | 'maintenue' | 'levee'
  reponse: string | null
}

export interface DecisionDossier {
  le: Instant
  /** Ce que fait le relais du colis encore chez lui (remettre au client, faire partir) ; null : rien à faire. */
  colis: 'remettre' | 'faire_partir' | null
  /** Issue écrite par BelivaY (« remplacement accepté », « remboursement du client »). */
  texte: string
  relaisEnCause: boolean
  /** Retenue proposée sur le versement (ARL-22) ; null pour un employé (DRO-03) ou sans retenue. */
  retenue: Francs | null
  /** Contestation possible jusqu'à (PR-CONTESTATION-H) ; null si le relais n'est pas en cause. */
  contestableJusqua: Instant | null
  contestation: Contestation | null
}

export interface Dossier {
  id: string // constat « CS-2207 »
  litige: string | null // dossier « LT-0931 », donné par le serveur à la réception du constat
  colis: string
  origine: 'relais' | 'client'
  motif: MotifDossier
  photos: Photo[]
  note: string | null
  /** Déballage photographié devant le client (v6 D15). */
  devantLeClient: boolean
  ouvertA: Instant
  par: Acteur
  /** Réception par le serveur : départ des délais ; null tant que le constat attend dans la file. */
  recuServeurA: Instant | null
  etape: EtapeDossier
  /** Échéance de l'étape en cours (vendeur, décision, recours) ; null à la clôture. */
  echeance: Instant | null
  /** Demande de BelivaY (photo, précision), faite dans le fil. */
  demande: { texte: string; le: Instant; photo: boolean; faiteA: Instant | null } | null
  decision: DecisionDossier | null
  closA: Instant | null
  fil: MessageDossier[]
  filFerme: boolean
  /** Fil lisible jusqu'à (clôture + PR-PREUVES-CONSERV-J) ; null tant que le dossier est ouvert. */
  filLisibleJusqua: Instant | null
  /** Garde et renvoi suspendus (colis au relais pendant le dossier, PR-RC-06). */
  gardeSuspendue: boolean
}

/** Ce que l'écran dit d'un colis scanné pour un constat. */
export interface ColisPourConstat {
  colis: string
  etat: EtatColis
  emplacement: string | null
  /** Constat possible : colis en garde au relais. */
  constatable: boolean
  raison: null | 'remis' | 'en_constat' | 'pas_arrive' | 'pas_en_garde'
  /** Jour de garde (1 à 7) pour un colis en garde. */
  rangGarde: number | null
  remisLe: Instant | null
  /** Fin de la fenêtre de signalement du client (remis + RET-FENETRE). */
  fenetreJusqua: Instant | null
  dossier: string | null
}

export interface RetourVu {
  reference: string // « RT-0415 »
  colis: string
  classe: ClasseColis
  /** Validé par BelivaY : seul un retour validé se dépose (LIT-05). */
  valide: boolean
  motif: string | null
  destination: string | null // boutique du vendeur
  attenduAvant: Instant | null
  deposeA: Instant | null
  /** Emplacement proposé (retours rangés à part, hors capacité) ou occupé. */
  emplacement: string | null
}

export type RefusConstat = 'introuvable' | 'non_constatable' | 'motif_requis' | 'photo_manquante' | 'pin_faux' | 'bloque' | 'transition_interdite'
export type RefusRetour = 'introuvable' | 'non_valide' | 'deja_depose' | 'photo_manquante' | 'scelle_requis' | 'pin_faux' | 'bloque'

export interface DomaineIncidents {
  dossiers(): Promise<Dossier[]>
  dossier(id: string): Promise<Dossier | null>
  /** Colis scanné ou saisi (référence du colis, ou de la commande quand elle n'a qu'un colis au relais). */
  colisPourConstat(reference: string): Promise<ColisPourConstat | null>
  ouvrirConstat(c: { colis: string; motif: MotifConstat; photos: Photo[]; note: string | null; devantLeClient: boolean; pin: string }, o: Origine): Promise<Resultat<{ id: string }, RefusConstat>>
  /** Photo demandée par BelivaY (ou ajoutée par le relais) tant que le dossier est ouvert. */
  ajouterPhotos(id: string, photos: Photo[], o: Origine): Promise<Resultat<object, 'introuvable' | 'clos' | 'photo_manquante'>>
  /** Écrit dans le fil du dossier, tant qu'il n'est pas fermé. */
  ecrire(id: string, texte: string, photos: Photo[], o: Origine): Promise<Resultat<{ id: string }, 'introuvable' | 'fil_ferme' | 'vide'>>
  /** Conteste une décision qui met le relais en cause : une fois, dans le délai (gérant seulement). */
  contester(id: string, motif: string, o: Origine): Promise<Resultat<object, 'introuvable' | 'non_contestable' | 'deja_contestee' | 'delai_depasse' | 'vide' | 'droit_refuse'>>
  retours(): Promise<RetourVu[]>
  /** Étiquette scannée : retour validé, non validé (refusé) ou inconnu. */
  verifierRetour(reference: string): Promise<Resultat<{ retour: RetourVu }, 'introuvable' | 'non_valide' | 'deja_depose'>>
  deposerRetour(d: { reference: string; scelle: 'intact'; photos: Photo[]; pin: string }, o: Origine): Promise<Resultat<{ emplacement: string | null }, RefusRetour>>
}
