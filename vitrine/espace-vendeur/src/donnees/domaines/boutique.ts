// Domaine « boutique » : identité interne (ce que voit le client : « Vendeur certifié Bronze · Trust Score 63 », rien
// d'autre, BOU-01, VD11-R07), vitrine INTERNE (photo de la devanture, logo, description : pour vous, l'agent de zone et
// le livreur, jamais montrées au client, VD11-R11), horaires, « Fermer aujourd'hui » jusqu'à la prochaine ouverture
// réelle, pause de 30 jours au plus, fermetures programmées par jours entiers 48 h à l'avance et écourtables (Q-39),
// emplacement (point vérifié, repère ; au-delà de 200 m : nouvelle vérification, VD11-R21), avis reçus et réponse
// privée transmise par le support (VD11-R56, VD11-R57).
// Emplacements (demande du porteur, 6 oct.) : un lieu PRINCIPAL (le point d'origine du ramassage et de la zone, celui
// que décrivent `position`, `point`, `repere`, `zone` ci-dessous) et d'autres lieux (entrepôt, deuxième boutique, point
// de collecte…), chacun avec son point OpenStreetMap + GPS, son adresse, son repère, ses horaires et son statut
// (« À vérifier » s'il est déplacé de plus de 200 m, l'ancien point servant jusqu'au passage de l'agent : Q-91) ; le
// principal se change (code SMS, lieu vérifié seulement) ; les centres BelivaY (relais, centres des zones exploitées)
// sont proposés en un geste. Tout reste INTERNE : jamais montré au client (VD11-R11).
// Demandes de modification (sécurité de la boutique) : nom, informations officielles (RCCM, NIU), titulaire ne
// changent que sur demande validée par BelivaY (motif, pièces, code SMS ; en attente → acceptée / refusée, historique) ;
// le numéro de versement suit son propre parcours (deux codes, 7 jours de revue, Q-19, écran numero_versement) ;
// description, photos, horaires, repère : libres. CHAMPS_BOUTIQUE dit, pour chaque champ, ce qu'il en est.
// API : GET/PUT /shop, PUT /shop/hours, POST /shop/closed-today, POST /shop/pause, POST/DELETE/PATCH /shop/closures,
// PUT /shop/location, GET /reviews, POST /reviews/{id}/private-reply (VD-02 p12, Q-92).
// Accès Préparation (Q-18) : « Fermer aujourd'hui » et rouvrir le jour même ; le reste est refusé par le serveur
// (ReserveAuProprietaire, comme le 403 owner_only), l'écran le montre en lecture seule.
import type { Instant, Jour, Palier, ReferenceCommande, Resultat } from '../communs'

export interface Position {
  lat: number
  lon: number
}

/** Ce qu'il en est de chaque champ de la boutique (sécurité de la boutique). */
export type Modifiable = 'libre' | 'sur_demande' | 'jamais'

export type TypeLieu = 'boutique' | 'deuxieme_boutique' | 'entrepot' | 'collecte' | 'autre'

/** Un lieu de la boutique. Le principal est l'origine du ramassage (coût total livré, zone). */
export interface Lieu {
  id: string
  nom: string // « Boutique de Mvog-Ada », « Entrepôt d'Essos »
  type: TypeLieu
  principal: boolean
  position: Position // point en service (l'ancien, tant qu'un déplacement attend l'agent)
  zone: string | null // « Z10 » : calculée par le serveur à partir du point ; null hors des zones servies
  quartier: string | null
  adresse: string // texte libre (rue, immeuble)
  repere: string // pour le livreur
  horaires: Horaire[] | null // null : ceux de la boutique
  statut: 'verifie' | 'a_verifier'
  point: { poseLe: Jour; verifieLe: Jour | null; enAttente: (Position & { a: Instant }) | null }
  centre: string | null // centre BelivaY choisi (relais, centre de zone) : vérifié d'office
}

/** Centre BelivaY proposé en un geste : relais ou centre d'une zone exploitée (GET /hubs). */
export interface CentreBelivay {
  id: string
  nom: string
  type: 'relais' | 'centre_zone'
  zone: string
  quartier: string
  position: Position
  horaires: string // « Lun – sam 07 h – 20 h »
  exploitee: boolean // zone exploitée (ramassages groupés)
}

export interface Lieux {
  lieux: Lieu[] // le principal d'abord
  max: number
  centres: CentreBelivay[]
}

export interface NouveauLieu {
  nom: string
  type: TypeLieu
  adresse: string
  repere: string
  horaires: Horaire[] | null
  position: Position
  precision: number // mètres (GPS) ; 0 pour un centre BelivaY
  centre: string | null
}

// officiel : RCCM et NIU (devenir entreprise, ou les corriger) ; autre : décrit dans le motif.
export type ChampBoutique = 'nom' | 'titulaire' | 'officiel' | 'autre'

/** Demande de modification d'un champ protégé, examinée par BelivaY. */
export interface DemandeModification {
  id: string
  champ: ChampBoutique
  avant: string | null
  valeur: string // nouvelle valeur demandée
  motif: string
  pieces: { nom: string; taille: number }[]
  statut: 'en_attente' | 'acceptee' | 'refusee' | 'annulee'
  creeeLe: Instant
  reponseAvant: Instant // 72 h ouvrées (VD-CONTESTATION-REPONSE)
  historique: { a: Instant; texte: string; par: 'vous' | 'belivay' }[]
  motifRefus: string | null
}

export interface Horaire {
  jour: number // lundi = 0
  ouvert: boolean
  de: string
  a: string
}

export interface Fermeture {
  id: string
  du: Jour
  au: Jour
  motif: string // interne, jamais montré au client
  annonceeLe: Instant
}

export interface Vitrine {
  photo: string | null // photo de la devanture (data: ou adresse du serveur), pour l'agent de zone et le livreur
  logo: string | null // logo rogné, vu dans votre espace seulement
  description: string // ce que vous vendez, pour BelivaY (saisie assistée, agent de zone)
}

export interface Boutique {
  nom: string
  titulaire: string
  identifiant: string // « @Penga12 »
  statut: 'particulier' | 'entreprise'
  creeLe: Jour
  approuveLe: Jour | null
  zone: string
  quartier: string // quartier de la BOUTIQUE (pas du client)
  repere: string
  position: { lat: number; lon: number }
  // « Vérifié » ou « À vérifier » : un point déplacé de plus de 200 m attend l'agent de zone ; l'ancien sert jusque-là (Q-91).
  point: { poseLe: Jour; verifieLe: Jour | null; enAttente: { lat: number; lon: number; a: Instant } | null }
  horaires: Horaire[]
  passageLivreur: { jours: string; de: string; a: string }[]
  societeLivraison: string // « Yafé Express »
  fermeeAujourdhui: boolean
  fermeeJusqua: Instant | null // prochaine ouverture réelle (Q-39)
  fermeeLe: Jour | null // jour où « Fermer aujourd'hui » a été touché (l'employé rouvre le jour même)
  pause: { depuis: Instant; jusqua: Instant } | null // 30 jours au plus (Q-39)
  fermetures: Fermeture[]
  vitrine: Vitrine
  apercuClient: { palier: Palier; trustScore: number } // seule chose que voit le client (VD11-R07, R08)
}

export interface Avis {
  id: string
  ref: ReferenceCommande
  note: number // 1 à 5
  commentaire: string | null
  a: Instant
  verifie: boolean // achat vérifié : payé et retiré
  journal: { etape: 'prete' | 'ramassage' | 'tournee'; texte: string }[]
  reponse: { a: Instant; texte: string; fil: string } | null // réponse privée, passée par le support
  limiteReponse: Instant // date de l'avis + 30 jours (Q-88)
}

export interface ResumeAvis {
  note: number | null // moyenne, une décimale ; null sans avis
  nombre: number
  poidsPourCent: number // part de la Satisfaction dans le Trust Score (20 %)
  liste: Avis[] // le plus récent d'abord
}

export interface DomaineBoutique {
  boutique(): Promise<Boutique>
  fermerAujourdhui(fermee: boolean): Promise<Boutique>
  changerHoraires(horaires: Horaire[]): Promise<Resultat<{ boutique: Boutique }, 'ordre'>>
  mettreEnPause(jours: number): Promise<Resultat<{ boutique: Boutique }, 'duree'>>
  reprendre(): Promise<Boutique>
  programmerFermeture(du: Jour, au: Jour, motif: string): Promise<Resultat<{ boutique: Boutique }, 'preavis_48h' | 'dates' | 'chevauche'>>
  ecourterFermeture(id: string, au: Jour): Promise<Resultat<{ boutique: Boutique }, 'dates'>>
  annulerFermeture(id: string): Promise<Boutique>
  replacer(position: { lat: number; lon: number }): Promise<Resultat<{ boutique: Boutique; nouvelleVerification: boolean; metres: number; a: Instant }>>
  changerRepere(repere: string): Promise<Resultat<{ boutique: Boutique }, 'vide' | 'long'>>
  modifierVitrine(champs: Partial<Vitrine>): Promise<Resultat<{ boutique: Boutique }, 'long'>>
  lieux(): Promise<Lieux>
  ajouterLieu(lieu: NouveauLieu): Promise<Resultat<{ lieu: Lieu }, 'plein' | 'nom' | 'repere' | 'position' | 'hors_zone' | 'ordre'>>
  modifierLieu(id: string, champs: Partial<Pick<Lieu, 'nom' | 'adresse' | 'repere' | 'horaires'>>): Promise<Resultat<{ lieu: Lieu }, 'nom' | 'repere' | 'ordre' | 'introuvable'>>
  replacerLieu(id: string, position: Position): Promise<Resultat<{ lieu: Lieu; nouvelleVerification: boolean; metres: number }, 'introuvable'>>
  /** Code SMS envoyé au propriétaire avant de changer le lieu principal. */
  demanderCodePrincipal(): Promise<{ masque: string }>
  rendrePrincipal(id: string, code: string): Promise<Resultat<{ lieux: Lieux }, 'code' | 'a_verifier' | 'introuvable'>>
  retirerLieu(id: string): Promise<Resultat<{ lieux: Lieux }, 'principal' | 'introuvable'>>
  /** Demandes de modification des champs protégés (nom, titulaire, statut, RCCM, NIU), la plus récente d'abord. */
  demandes(): Promise<DemandeModification[]>
  /** Code SMS au propriétaire avant d'envoyer une demande. */
  demanderCodeModification(): Promise<{ masque: string }>
  demanderModification(d: { champ: ChampBoutique; valeur: string; rccm?: string; niu?: string; motif: string; pieces: { nom: string; taille: number }[] }, code: string): Promise<Resultat<{ demande: DemandeModification }, 'code' | 'valeur' | 'motif' | 'pieces' | 'deja' | 'rccm' | 'niu'>>
  annulerDemande(id: string): Promise<Resultat<{ demande: DemandeModification }, 'introuvable' | 'etat'>>
  avis(): Promise<ResumeAvis>
  repondreAvis(id: string, texte: string): Promise<Resultat<{ fil: string }, 'trop_court' | 'delai_depasse' | 'deja_repondu' | 'coordonnees'>>
}
