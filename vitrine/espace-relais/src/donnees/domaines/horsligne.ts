// Domaine « horsligne » (possédé par le SOCLE ; PR-02 OFF-01 à OFF-06, A-VALIDER ARL-03) : la file des gestes faits sans
// réseau au comptoir.
// - Réception, remise (garde seule due, ARL-03), dépôt de retour, sortie et constat marchent hors ligne : l'action et
//   ses photos sont écrites dans la file avec leur clé d'idempotence et leur origine, puis envoyées au retour du réseau
//   (reprise automatique) ; les délais d'un constat fait hors ligne partent de sa réception par le serveur (OFF-01).
// - Le paiement Mobile Money au comptoir exige le réseau : jamais mis en file (OFF-02).
// - Une action en file depuis plus de PR-OFF-EXPIRATION-H heures est « expirée » : jamais envoyée, jamais effacée ;
//   il faut refaire le geste (OFF-05). Rien ne se perd ; pas d'action « vider la file ».
// - L'accueil dit l'état : « Connecté · aucune opération en attente » / « Hors ligne · n opérations en attente » (OFF-03).
// - Chaque élément porte sa CHARGE : l'appel exact du geste, rejoué tel quel (le serveur décide, motif mot pour mot).
import type { Instant, Origine, Resultat } from '../communs'

export type TypeAction = 'reception' | 'validation_lot' | 'remise' | 'encaissement' | 'controle' | 'constat' | 'retour' | 'sortie' | 'deplacement' | 'fermeture' | 'message' | 'reglage' | 'photo'

/** L'appel d'un geste, tel que le serveur le reçoit au rejeu (source.<domaine>.<méthode>(...arguments)). */
export interface ChargeGeste {
  domaine: string
  methode: string
  args: unknown[]
}

export interface ActionEnFile {
  type: TypeAction
  objet: string // colis, lot, constat, fil visé
  origine: Origine
  /** « expiree » : en file depuis plus de PR-OFF-EXPIRATION-H heures, jamais envoyée (OFF-05). */
  etat: 'en_attente' | 'envoyee' | 'refusee' | 'expiree'
  motif: string | null // motif du refus du serveur, mot pour mot
  photos: number
  recu: Instant | null // heure du serveur à la réception
  expireA: Instant
  charge?: ChargeGeste
  appliquee?: boolean // déjà appliquée à la copie locale (rejouée avec la même clé)
}

export interface FileHorsLigne {
  actions: ActionEnFile[]
  horsLigneDepuis: Instant | null
  dernierEnvoi: { a: Instant; envoyees: number; refusees: number } | null
  /** Remises faites hors connexion aujourd'hui (ARL-03 : au plus PR-HL-REMISES). */
  remisesHorsLigneDuJour: number
  /** Mode papier déclenché par une diffusion de panne hors système (OFF-06). */
  modePapier: { depuis: Instant; reference: string } | null
}

/** Règles lues dans le registre (aucune valeur dans l'écran). */
export interface ReglesFile {
  expirationH: number // PR-OFF-EXPIRATION-H
  photoMaxKo: number // PHOTO-MAX-KO
  remisesHorsLigneParJour: number // PR-HL-REMISES
  papierSaisieH: number // PR-PAPIER-SAISIE-H
}

export interface DomaineHorsLigne {
  file(): Promise<FileHorsLigne>
  regles(): Promise<ReglesFile>
  mettreEnFile(type: TypeAction, objet: string, origine: Origine, details?: { photos?: number; charge?: ChargeGeste; appliquee?: boolean }): Promise<ActionEnFile>
  /** Rejoue la file dans l'ordre des heures d'origine ; les éléments expirés ne partent pas. */
  envoyerFile(): Promise<FileHorsLigne['dernierEnvoi']>
  noterReseau(depuis: Instant): Promise<void>
  /** Une action expirée a été refaite : elle reste au journal, marquée « refaite ». */
  marquerRefaite(cle: string): Promise<Resultat<object, 'introuvable'>>
}
