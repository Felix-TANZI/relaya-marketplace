// Types partagés par les domaines de la SourceRelais. Règles de fond (PR-02, v6 D12 à D15, DP-63, DP-65) :
// - instants en millisecondes (heure de Yaoundé à l'affichage), jours civils « AAAA-MM-JJ » ; montants en francs CFA
//   entiers, calculés et figés par le serveur (src/calculs pour la démonstration) : l'écran les affiche ;
// - ANONYMAT (GEN-01) : JAMAIS de nom, de téléphone ni d'adresse d'un client ou d'un vendeur dans un type du relais.
//   Seule exception : `porteurDesigne`, le nom du porteur désigné par le client, pour la vérification de sa pièce. Le
//   client se nomme par « prénom et initiale » (`ClientVu`) seulement là où un écran en a besoin (remise au comptoir) ;
//   un vendeur par le nom de sa boutique seulement pour un départ (destination d'un retour) ;
// - le gérant ne voit JAMAIS un code de retrait ni un code de dépôt : il saisit ou scanne ce qu'on lui présente ;
// - toute action métier part avec une CLÉ D'IDEMPOTENCE et son ORIGINE (heure et position du téléphone) : rejouée hors
//   connexion, elle n'a jamais d'effet deux fois ; signée du PIN personnel du membre quand elle change la garde (GEN-09).
export type Francs = number
export type Instant = number
export type Jour = string
export type CleIdempotence = string
/** Identifiant d'une photo prise par l'application (compressée, OFF-04) ; « file-<clé> » tant qu'elle est en file. */
export type Photo = string

/** Résultat d'un geste : réussi, ou refusé avec une raison que l'écran met en mots. */
export type Resultat<T = object, R extends string = string> = ({ ok: true } & T) | { ok: false; raison: R; detail?: string }

export interface Position {
  lat: number
  lng: number
  precisionM: number | null
}
/** Heure et position du téléphone au moment du geste (validation hors connexion, preuves). */
export interface Origine {
  cle: CleIdempotence
  heure: Instant
  position: Position | null
}

/** Classes admises en relais (RELAIS-PLACES) ; XL et hors gabarit vont à domicile (LIV-XL-RELAIS), DP-20 : aucun refus. */
export type ClasseColis = 'S' | 'M' | 'L'

/** Le client tel que le relais le nomme, quand un écran en a besoin : « Awa N. » (prénom et initiale), jamais plus. */
export interface ClientVu {
  prenomInitiale: string
}

/** Qui a fait un geste au relais : un membre (initiales), le livreur, BelivaY ou le système. */
export interface Acteur {
  type: 'membre' | 'livreur' | 'belivay' | 'systeme' | 'client'
  /** Membre : « RM » ; livreur : « Serge A. » ; sinon null. */
  nom: string | null
  membreId: string | null
}

/** Ligne de journal signée (GEN-09) : qui, quand, quoi ; jamais un code ni un montant de rémunération pour l'employé. */
export interface EntreeJournal {
  le: Instant
  action: string
  par: Acteur
  /** Signée du PIN personnel du membre. */
  signe: boolean
  detail: string | null
  /** Clé d'idempotence du geste (rejeu sans double effet). */
  cle: string | null
}
