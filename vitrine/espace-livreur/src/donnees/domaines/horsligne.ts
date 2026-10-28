// Domaine « horsligne » (LIV-P22, LIV-08-R36 à R44, LIV-P22R-01 à R04, DED-20) : la file des gestes faits sans réseau.
// - Toute action (photo, scan, code, confirmation, incident, message, clôture) est d'abord écrite dans la file locale
//   chiffrée, avec sa clé d'idempotence, l'heure et la position du téléphone ; elle part aussitôt s'il y a du réseau.
// - Au retour du réseau (ou « Synchroniser maintenant »), la file part dans l'ordre chronologique ; chaque élément
//   reçoit l'heure du serveur en plus de l'heure d'origine (double horodatage) ; la version du serveur l'emporte en cas
//   de conflit (preuves gardées et rattachées, écart signalé).
// - Non envoyé à l'échéance (LIV-FILE-EXPIRATION-H) : « expiré », jamais effacé, entreprise et console alertées ;
//   « Réessayer l'envoi » le relance (reçu en retard, signalé).
// - Jamais d'action « vider la file » ni « supprimer » (LIV-08-R37).
// - Chaque élément porte sa CHARGE : l'appel exact du geste (domaine, méthode, arguments avec l'origine) ; le retour du
//   réseau le rejoue tel quel (POST /api/courier/sync/batch en production), le serveur décide (accepté ou refusé, motif
//   mot pour mot). Un geste déjà appliqué à la copie locale du téléphone (tournée, paquet téléchargé) est rejoué avec la
//   même clé d'idempotence : jamais deux effets.
import type { Instant, Origine, Resultat } from '../communs'

export type TypeAction =
  | 'disponibilite'
  | 'arrivee'
  | 'etiquette'
  | 'code_remise'
  | 'refus'
  | 'depot'
  | 'domicile'
  | 'echec'
  | 'incident'
  | 'cloture'
  | 'message'
  | 'contestation'
  | 'stockage'
  | 'preference'
  | 'depart'
  | 'kit'
  | 'paquet_rendu'
  | 'absence'
  | 'controle'
  | 'audit'
  | 'emballage'
  | 'photo'
  | 'collecte'
  | 'retour'
  | 'appel'
  | 'route'

/** L'appel d'un geste, tel que le serveur le reçoit au rejeu (source.<domaine>.<méthode>(...arguments)). */
export interface ChargeGeste {
  domaine: string
  methode: string
  args: unknown[]
}

export interface ActionEnFile {
  type: TypeAction
  objet: string // arrêt, colis, paquet, incident ou fil visé
  origine: Origine
  etat: 'en_attente' | 'envoyee' | 'refusee'
  motif: string | null // motif du refus du serveur, mot pour mot
  photos?: number // photos jointes (preuves)
  poidsKo?: number // poids après compression (au plus LIV-PHOTO-POIDS-KO par photo)
  recu?: Instant | null // heure du serveur à la réception
  expireA?: Instant // heure d'origine + durée de vie de la file
  tardif?: boolean // reçu après son expiration (« Réessayer l'envoi »)
  charge?: ChargeGeste // le détail du geste, rejoué au retour du réseau
  appliquee?: boolean // déjà appliqué à la copie locale du téléphone (rejoué avec la même clé)
}

/** Écart entre le téléphone et le serveur à la reconnexion : la version du serveur l'emporte. */
export interface Conflit {
  objet: string
  surLeTelephone: string
  surLeServeur: string
  a: Instant
  vu: boolean
}

/** Panne réseau annoncée par BelivaY (console, ADM-P28) : diffusée mot pour mot. */
export interface AnnoncePanne {
  reference: string
  texte: string
  recue: Instant
}

export interface FileHorsLigne {
  actions: ActionEnFile[]
  horsLigneDepuis: Instant | null
  dernierEnvoi: { a: Instant; envoyees: number; refusees: number } | null
  conflits: Conflit[]
  annonce: AnnoncePanne | null
  ecartHorlogeMin: number // écart entre l'heure du téléphone et celle du serveur (réglage « Heure automatique »)
}

/** Règles d'envoi lues dans le registre (aucune valeur dans l'écran). */
export interface ReglesEnvoi {
  expirationH: number // LIV-FILE-EXPIRATION-H
  photoMaxKo: number // LIV-PHOTO-POIDS-KO
  wifiAttenteMaxH: number // LIV-WIFI-ATTENTE-MAX-H
  ecartHorlogeMaxH: number // écart signalé au-delà (LIV-P22R-04)
}

export interface DomaineHorsLigne {
  file(): Promise<FileHorsLigne>
  regles(): Promise<ReglesEnvoi>
  mettreEnFile(type: TypeAction, objet: string, origine: Origine, details?: { photos?: number; poidsKo?: number; charge?: ChargeGeste; appliquee?: boolean }): Promise<ActionEnFile>
  envoyerFile(): Promise<FileHorsLigne['dernierEnvoi']>
  /** Relance un élément expiré (une fois le réseau revenu) ; il est reçu « en retard », jamais effacé. */
  relancer(cle: string): Promise<Resultat<object, 'hors_ligne' | 'introuvable'>>
  /** « Suivre la tournée à jour » : l'écart est lu, la version du serveur s'applique. */
  conflitVu(objet: string): Promise<void>
  noterReseau(depuis: Instant): Promise<void>
}
