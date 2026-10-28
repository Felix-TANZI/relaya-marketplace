// Domaine « moi » (LIV-P29, LIV-P31 ; LIV-10-R23 à R32, LIV-ENT-03/04, LIV-P29R-01 à R03, DED-21, DED-31) : identité,
// certification, véhicule et zones (lecture seule : l'entreprise les change dans son portail), pièces avec leur échéance,
// préférences du compte, demande de départ (DP-66), données personnelles (loi n° 2024/017).
// - Une pièce qui expire dans LIV-PIECE-ALERTE-J jours est signalée ; expirée, l'accès est restreint automatiquement le
//   jour même (plus de nouveau paquet, missions en cours terminées) : ce n'est pas une sanction.
// - Le numéro d'une pièce n'est jamais renvoyé à l'application ; l'entreprise voit le statut, jamais l'image.
// - La photo est l'identité vérifiée (le vendeur et le gérant le reconnaissent avec) : elle ne change que par une
//   nouvelle vérification demandée par l'entreprise (selfie « demandé ») ; aucun changement à volonté (DP-66).
// - Une pièce ne se renvoie que si elle est refusée, demandée par l'entreprise (relance), expirée ou bientôt expirée
//   (« renvoyable ») ; jamais à volonté (DP-66). Le serveur refuse le reste (non_demandee).
// - Nouvelle photo (DP-67) : état dédié « reverification » (pas « refusée ») tant que le selfie demandé n'est pas envoyé ;
//   il garde PHOTO-REVERIF-J jours (demandee.jusqua) et continue de travailler ; passé ce délai, plus aucune nouvelle
//   mission jusqu'à la validation (photoBloquee). Envoyé : « en_verification », la demande reste jusqu'à la validation.
// - Départ (DP-66, DP-67) : une DEMANDE avec motif, sans effet immédiat, annulable tant qu'elle n'est pas close ; préavis
//   DEPART-PREAVIS-J pendant lequel il travaille normalement, des paquets jusqu'à la veille du dernier jour
//   (affectationJusqua) ; « hors service » sans aucun point de Trust Score perdu ; l'entreprise clôture quand aucune
//   mission, aucun colis sous garde et le kit constaté (restitué, ou incomplet avec retenue plafonnée à KIT-VALEUR-F,
//   contestable), même avant la fin du préavis d'un commun accord ; l'administrateur clôture en secours après le
//   préavis, « kit non contesté » sans retenue si l'entreprise n'a rien constaté dans DEPART-KIT-CONSTAT-H. Le livreur ne
//   clôture jamais. Dernier versement le vendredi suivant, en Mobile Money (deux SMS : clôture, versement fait).
import type { ClasseColis, Francs, Instant, Origine, Resultat } from '../communs'

export type IdPiece = 'cni' | 'selfie' | 'permis' | 'carte_grise' | 'photo_vehicule' | 'assurance'
export type EtatPiece = 'a_jour' | 'expire_bientot' | 'expiree' | 'en_verification' | 'refusee' | 'reverification'
export interface Piece {
  id: IdPiece
  etat: EtatPiece
  expireLe: Instant | null // null : pièce sans date de validité
  rectoVerso: boolean
  envoyeeA: Instant | null // dernière pièce envoyée (vérification en cours)
  motifRefus: string | null // jamais un rejet sans motif (LIV-P02R-02)
  // L'entreprise la redemande (relance, nouvelle vérification) ; « jusqua » : fin du délai PHOTO-REVERIF-J (selfie
  // seulement). Gardée tant que la nouvelle pièce n'est pas validée.
  demandee: { le: Instant; motif: string; jusqua: Instant | null } | null
  renvoyable: boolean // refusée, demandée, expirée ou bientôt expirée : seul cas où l'envoi est ouvert
}

/** Motifs de départ proposés (liste courte, moteurs/belivay_moteurs/depart.py MOTIFS) ; texte libre facultatif. */
export type MotifDepart = 'autre_emploi' | 'horaires' | 'remuneration' | 'demenagement' | 'sante' | 'personnel' | 'autre'
export const MOTIFS_DEPART: MotifDepart[] = ['autre_emploi', 'horaires', 'remuneration', 'demenagement', 'sante', 'personnel', 'autre']
/** Dernier versement (moteurs/belivay_moteurs/depart.py dernier_versement) : estimé à ce jour pendant le préavis, figé à
 * la clôture. Montants en francs ; « du » et « verse » null quand l'entreprise n'affiche pas de tarif (compteur seul). */
export interface DernierVersement {
  du: Francs | null // toutes les missions validées
  missions: number
  retenuLitiges: Francs // missions liées à un litige ouvert : au plus le montant contesté, versé dès le litige réglé
  litiges: number
  retenueKit: Francs // retenue définitive du kit incomplet
  kitDeCote: Francs // retenue contestée : mise de côté jusqu'à la décision de BelivaY
  verse: Francs | null // versé le vendredi qui suit la clôture, en Mobile Money
  faitLe: Instant | null // versement Mobile Money fait (SMS au livreur)
}
/** Demande de départ (DP-66, DP-67) : « demande » pendant le préavis, « close » une fois clôturée (entreprise ou admin). */
export interface Depart {
  id: string
  /** « livreur » : il a demandé à partir ; « entreprise » : fin de contrat décidée par son employeur. */
  initiative: 'livreur' | 'entreprise'
  demandeLe: Instant
  motif: MotifDepart
  texte: string | null
  preavisJusqua: Instant // demandeLe + DEPART-PREAVIS-J jours
  affectationJusqua: Instant // début (0 h Yaoundé) du dernier jour du préavis : plus aucune nouvelle mission ensuite
  etat: 'demande' | 'close'
  conditions: { missionEnCours: boolean; colisSousGarde: number; kitConstate: boolean; litigesOuverts: number }
  // Constat du kit par l'entreprise (au plus tard constatJusqua = fin du préavis + DEPART-KIT-CONSTAT-H) ; incomplet :
  // éléments manquants et retenue plafonnée à KIT-VALEUR-F ; le livreur peut la contester, BelivaY décide.
  kit: {
    constat: 'restitue' | 'incomplet' | null
    manquants: string[]
    retenue: Francs
    constatJusqua: Instant
    contestation: { le: Instant; motif: string; decision: 'maintenue' | 'annulee' | null; decideLe: Instant | null } | null
  }
  kitNonConteste: boolean // clôturé par BelivaY sans constat dans le délai : aucune retenue
  versement: DernierVersement
  closLe: Instant | null
  closPar: 'entreprise' | 'admin' | null
  versementLe: Instant | null // vendredi qui suit la clôture : dernier relevé versé
}
export interface Profil {
  activeLe: Instant
  numeroMasque: string // le numéro du livreur lui-même, partiellement masqué (LIV-UIX-09)
  certification: { reussieLe: Instant; valableJusqua: Instant; note: string; seuil: string }
  vehicule: { type: string; immatriculation: string; classes: ClasseColis[]; capacite: string }
  zones: { code: string; nom: string; principale: boolean }[]
  pieces: Piece[]
  alerteJours: number // LIV-PIECE-ALERTE-J
  verification: { autoMin: number; revueH: number } // KYC-AUTO-MIN, KYC-REVUE-H (heures ouvrées)
  restreint: boolean // une pièce exigée ou la certification a expiré : plus de nouveau paquet
  selfieEnVerification: boolean
  photoBloquee: boolean // nouvelle photo demandée, délai PHOTO-REVERIF-J passé, pas encore validée : plus de nouvelle mission
  depart: Depart | null
  demandesDonnees: { type: 'export' | 'effacement'; le: Instant; etat: 'en_preparation' | 'prete' }[]
}

/** Préférences du COMPTE (la langue, la lecture vocale, l'envoi des photos) ; thème et taille restent sur l'appareil. */
export interface PreferencesCompte {
  langue: 'fr' | 'en'
  lectureVocale: boolean
  envoiPhotos: 'immediat' | 'wifi'
}

/** Ce que l'employeur a décidé pour son emploi (DP-66 : son employeur est l'entreprise ; il voit, il ne décide pas) :
 * suspension par l'entreprise en cours, avertissements écrits, zones et horaires de travail (null : ceux de
 * l'entreprise), issue de la période d'essai, fin de contrat décidée par l'entreprise (préavis). */
export interface EmploiVu {
  suspension: { motif: string; depuis: Instant; jusqua: Instant | null } | null
  avertissements: { id: string; rang: number; le: Instant; motif: string }[]
  zones: string[] | null
  horaires: { jour: number; de: string; a: string }[] | null
  essai: { issue: 'confirme' | 'prolonge' | 'rompu'; le: Instant; jusqua: Instant | null } | null
  finContrat: { id: string; motif: string; le: Instant; preavisJusqua: Instant } | null
}

export interface DomaineMoi {
  profil(): Promise<Profil>
  /** Son emploi tel que l'entreprise l'a décidé (bandeau de la coque, Moi, planning). */
  emploi(): Promise<EmploiVu>
  /** Nouvelle pièce (seulement si « renvoyable ») : recto (et verso) pris par l'appareil photo de l'application, date
   * d'expiration lue sur la pièce. Le selfie demandé par l'entreprise passe aussi par ici (preuve de vie). */
  envoyerPiece(id: IdPiece, d: { recto: boolean; verso: boolean; expireLe: Instant | null }, origine: Origine): Promise<Resultat<object, 'photo_manquante' | 'date_passee' | 'non_demandee'>>
  preferences(): Promise<PreferencesCompte>
  reglerPreference(p: Partial<PreferencesCompte>, origine: Origine, enLigne: boolean): Promise<Resultat>
  /** Demander à quitter l'entreprise (DP-66) : aucun effet immédiat ; l'entreprise est prévenue ; préavis ouvert. */
  demanderDepart(d: { motif: MotifDepart; texte: string | null }, origine: Origine): Promise<Resultat<{ preavisJusqua: Instant }, 'deja_demande' | 'motif_inconnu'>>
  /** Annuler sa demande tant qu'elle n'est pas close. */
  annulerDepart(origine: Origine): Promise<Resultat<object, 'aucune_demande' | 'deja_close'>>
  /** Contester la retenue du kit incomplet (DP-67), pendant le préavis ou après la clôture : BelivaY décide ; le montant
   * est mis de côté d'ici là. */
  contesterKit(motif: string, origine: Origine): Promise<Resultat<object, 'aucune_retenue' | 'deja_contestee' | 'motif'>>
  /** Données personnelles : un code SMS est demandé avant l'export ou l'effacement (DED-31). */
  demanderCodeDonnees(): Promise<Resultat<{ renvoiPossibleA: Instant }>>
  demanderDonnees(type: 'export' | 'effacement', code: string, origine: Origine): Promise<Resultat<object, 'code_faux' | 'deja_demande'>>
}
