// Types partagés par les domaines de la SourceVendeur. Règles de fond (PLAN-VENDEUR.md) :
// - montants en francs CFA entiers (Francs), calculés et figés par le serveur (GEN-03) : l'écran les affiche ;
// - instants en millisecondes (heure de Yaoundé à l'affichage), jours civils « AAAA-MM-JJ » ;
// - ANONYMAT (GEN-01, CTV-02) : aucun type d'un domaine vendeur ne porte l'identité, le numéro, l'adresse, le
//   quartier, le relais, le mode de livraison ou le total payé du client (tests/squelette vérifie les noms de champs) ;
// - RÔLE (DP-55, VD-02 p8) : l'accès Préparation ne reçoit aucun montant ; côté démonstration, les domaines d'argent
//   refusent l'accès (ReserveAuProprietaire, comme le 403 owner_only du serveur).
export type Francs = number
export type Instant = number
export type Jour = string
export type Palier = 'Bronze' | 'Argent' | 'Or' | 'Platine'
export type Plan = 'Free' | 'Boost' | 'Pro'
// Rôle de session : le propriétaire, ou un ACCÈS EMPLOYÉ (valeur historique « preparation », gardée pour toute
// l'interface). Ce qu'un employé peut faire est dit par ses droits (src/donnees/droits.ts), cochés par le
// propriétaire ; l'argent et les montants ne lui sont jamais ouverts (Q-18).
export type Role = 'proprietaire' | 'preparation'
export type ReferenceCommande = string // « BLV-00008 »

/** Résultat d'un geste : réussi, ou refusé avec une raison que l'écran met en mots. */
export type Resultat<T = object, R extends string = string> = ({ ok: true } & T) | { ok: false; raison: R; detail?: string }

/** Refus du serveur pour l'accès Préparation (403 owner_only, VD-D10.A08). */
export class ReserveAuProprietaire extends Error {
  constructor(quoi: string) {
    super(`${quoi} : réservé au propriétaire de la boutique (owner_only)`)
    this.name = 'ReserveAuProprietaire'
  }
}

/** Article vu par le vendeur (fiche BelivaY + variante de son offre). */
export interface ArticleVendu {
  offreId: string
  titre: string // « ITEL AC52 »
  variante: string // « noir »
  etat: string // « Neuf »
  dessin: string // identifiant d'illustration (src/genere/dessins.json) ou photo remplaçable
  categorie: string // « Électronique » (famille du barème)
}

/** Livreur du créneau (le vendeur voit le livreur, jamais le client). */
export interface Livreur {
  nom: string // « Serge M. »
  societe: string // « Yafé Express »
  creneau: [string, string] // « 14:00 », « 16:00 »
}

export type ClasseColis = 'S' | 'M' | 'L' | 'XL' | 'XXL'

/** Formes du RCCM (« RC-YAO-2026-B-1234 ») et du NIU (« M012345678901A ») : contrat (VD-03) et Ma boutique (DOC-01). */
export const FORME_RCCM = /^[A-Z]{2}-[A-Z]{3}-\d{2,4}-[A-Z]-\d{3,6}$/i
export const FORME_NIU = /^[A-Z]\d{12}[A-Z]$/i
