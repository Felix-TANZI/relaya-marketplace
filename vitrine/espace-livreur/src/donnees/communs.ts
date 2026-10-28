// Types partagés par les domaines de la SourceLivreur. Règles de fond (DP-60, paquet livreur LIV-00 à LIV-10) :
// - instants en millisecondes (heure de Yaoundé à l'affichage), jours civils « AAAA-MM-JJ » ; montants en francs CFA
//   entiers, calculés et figés par le serveur : l'écran les affiche ;
// - CE QUE LE LIVREUR NE VOIT JAMAIS : le contenu d'un colis, son prix, l'identité ou le numéro du client, les données
//   d'un autre livreur, un numéro de téléphone (appels masqués : POST /calls) ni un compte de versement ;
//   tests/squelette.spec.ts vérifie les noms de champs des domaines ;
// - toute action métier part avec une CLÉ D'IDEMPOTENCE et son ORIGINE (heure et position du téléphone, LIV-UIX-10) :
//   rejouée hors connexion, elle n'a jamais d'effet deux fois ; l'état de la garde ne change que côté serveur.
export type Francs = number
export type Instant = number
export type Jour = string
export type CleIdempotence = string

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

/** États du compte (LIV-03-R37) : les sept de la machine du serveur, plus « en vérification » (activation : tout est
 * envoyé, le serveur vérifie). Restreint : actif dans des limites (il travaille, avec un plafond ou un contrôle). */
export type EtatCompte = 'en_activation' | 'en_verification' | 'actif' | 'restreint' | 'suspendu' | 'rattachement_ferme' | 'rattachement_suspendu' | 'retire'
export type Disponibilite = 'disponible' | 'en_pause' | 'hors_service'
export type ClasseColis = 'S' | 'M' | 'L' | 'XL' | 'XXL'

/** Colis tel que le livreur le voit : sa classe et ses consignes, jamais son contenu, son prix ni son destinataire. */
export interface ColisVu {
  id: string // « BLV-00008-1 »
  classe: ClasseColis
  fragile: boolean
  etiquette: string | null // numéro d'étiquette pré-imprimée liée au ramassage
}

export type TypeArret = 'ramassage' | 'relais' | 'domicile' | 'collecte' | 'retour'
