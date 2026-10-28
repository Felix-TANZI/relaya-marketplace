// Domaine « paquets » (ENT-P10, ENT-P11) : paquets publiés à accepter dans le délai (ENT-T-ACCEPT), fenêtre de
// priorité du premier rang, détail (arrêts, colis, rémunération figée à l'acceptation, échéances), accepter, ignorer,
// rendre. Le comptable ne peut ni voir ni accepter (AccesRefuse, ENT-02-R64). API : GET /api/company/packages?status=
// published, /packages/{id} ; POST …/accept (409 PACKAGE_TAKEN, 410 EXPIRED, 422 CAPACITY_FULL | ABOVE_VALUE_CAP),
// …/ignore, …/return (409 ALREADY_COLLECTED) ; PATCH /api/company/me/alerts (son et notification par zone).
// DP-63 (l'emporte) : BelivaY n'affecte JAMAIS un livreur. La commande est publiée à l'entreprise par zone :
// GROUPÉE vers les relais (tournée), INDIVIDUELLE à domicile (une seule commande par paquet, aucun groupage à domicile
// au lancement) ; l'entreprise la prend, puis affecte SON livreur (domaine affectation). Promesse domicile < 5 h.
// Avant l'acceptation, l'API n'envoie ni nom de boutique ni adresse ni client (ENT-P10R-02) : nom = null ; un colis
// au-dessus du plafond du palier n'est jamais envoyé (ENT-PAL-01) ; la valeur est celle du COLIS (ENT-02-R16).
import type { ClasseColis, CodeZone, Francs, Instant, LivreurCourt, Resultat } from '../communs'
import type { CodeLigne } from './prix'

export type StatutPaquet = 'publie' | 'accepte' | 'affecte' | 'en_cours' | 'incident' | 'depose' | 'clos' | 'rendu' | 'expire' | 'pris' | 'ignore'
export type GenrePaquet = 'tournee_relais' | 'domicile' | 'collecte' | 'retour' | 'transfert' | 'mixte'

export interface Arret {
  ordre: number
  type: 'boutique' | 'relais' | 'domicile' | 'stockage'
  sens: 'ramassage' | 'depot' | 'remise'
  nom: string | null // null avant l'acceptation (boutique) et toujours pour un domicile
  zone: CodeZone
  quartier: string
  colis: number
  c4: boolean // audit C4 tiré sur cet arrêt
  fait: Instant | null
}

export interface ColisDuPaquet {
  etiquette: string | null // posée au ramassage (C1) ; null : prévue
  arret: number
  classe: ClasseColis
  valeurDeclaree: Francs | null // propriétaire et répartiteur seulement
  fragile: boolean
  payableAuRetrait: boolean
}

export interface Paquet {
  id: string // « PQ-Z3-261013-009 » : PQ + zone + AAMMJJ + rang du jour (ENT-PQS-06)
  genre: GenrePaquet
  commandes: number // toujours 1 à domicile (DP-63)
  statut: StatutPaquet
  zone: CodeZone
  relais: string | null // relais de dépôt (visible avant acceptation)
  colis: { nombre: number; classes: ClasseColis[]; valeurMax: Francs | null; valeurTotale: Francs | null }
  remuneration: Francs | null // null pour le répartiteur (montants masqués)
  arrets: Arret[]
  distanceKm: number
  dureeMin: number
  publieLe: Instant
  accepterAvant: Instant
  premierRang: boolean
  prioriteJusqua: Instant | null
  heureLimite: Instant // < 5 h depuis le plus ancien « C'est prêt »
  accepteLe: Instant | null
  acceptePar: string | null
  ramassageAvant: Instant | null
  livreur: LivreurCourt | null
  modifie: boolean // une commande annulée a changé le paquet (ENT-RG-R86)
}

/** Ligne de rémunération d'un paquet, figée à l'acceptation (ENT-P09R-03) : code de la ligne de grille, classe,
 *  quantité, prix unitaire de la grille et montant payé (écrêté au plafond de la classe : DP-62, A-01). */
export interface LigneRemuneration {
  code: CodeLigne
  classe: ClasseColis | null
  quantite: number
  unitaire: Francs
  montant: Francs
  ecrete: boolean
}

export interface DetailPaquet extends Paquet {
  lignes: LigneRemuneration[] // vide pour le répartiteur (montants masqués)
  versionGrille: string
  kit: { format: string; nombre: number }[]
  colisDetail: ColisDuPaquet[]
  journal: { le: Instant; quoi: string; par: string | null }[]
  ramasse: boolean // premier code de remise validé : plus de « rendre », transfert seulement
}

export interface Capacite {
  zone: CodeZone
  nom: string
  capacite: number
  acceptes: number
}

export interface Disponibles {
  paquets: Paquet[]
  capacites: Capacite[]
  rendus7j: number
  prioritePerdueJusqua: Instant | null
}

export type RefusAcceptation = 'pris' | 'expire' | 'capacite' | 'plafond' | 'aucun_livreur'
export interface ReglageAlerte {
  zone: CodeZone
  son: boolean
  notification: boolean
}

export interface DomainePaquets {
  disponibles(): Promise<Disponibles>
  paquet(id: string): Promise<DetailPaquet | null>
  accepter(id: string): Promise<Resultat<{ paquet: DetailPaquet }, RefusAcceptation>>
  ignorer(id: string): Promise<Resultat>
  rendre(id: string): Promise<Resultat<object, 'deja_ramasse' | 'statut'>>
  alertes(): Promise<ReglageAlerte[]>
  reglerAlerte(zone: CodeZone, quoi: 'son' | 'notification', on: boolean): Promise<void>
}
