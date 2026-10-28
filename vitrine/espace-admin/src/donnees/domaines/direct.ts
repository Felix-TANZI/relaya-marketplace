// Domaine « direct » (page ajoutée « Vue d'ensemble » et « Rechercher partout » ; tenu par S1) : la plateforme en direct,
// pour le rôle et ses zones, et la recherche transversale. Chaque chiffre mène à sa liste (route et paramètres) ; aucun
// montant n'est montré à un rôle qui n'a pas l'argent ; la source filtre (rôle, périmètre) avant l'envoi.
import type { CodeZone, Francs, Instant } from '../communs'

export interface IndicateurDirect {
  id: string
  libelle: string // « Commandes payées aujourd'hui »
  valeur: number
  unite: 'nombre' | 'francs' | 'pourcent'
  sous: string // précision d'une ligne
  ton: 'ok' | 'alerte' | 'neutre'
  route: string
  params?: Record<string, string>
}

export interface RelaisDirect {
  nom: string
  zone: CodeZone
  colis: number
  capacite: number
  statut: string
}

export interface VueDirecte {
  le: Instant
  indicateurs: IndicateurDirect[]
  zones: { code: CodeZone; nom: string; exploitee: boolean; commandes: number; enRetard: number; relaisSatures: number }[]
  relais: RelaisDirect[]
  incidents: { id: string; quoi: string; zone: CodeZone | null; le: Instant; route: string; params?: Record<string, string> }[]
  sante: { nom: string; etat: 'ok' | 'lent' | 'panne' }[] | null // null : rôle sans accès à la santé
  escrow: Francs | null
  /** Ce qui vient de se passer dans les cinq espaces (journal du serveur ; démonstration : le pont), le plus récent d'abord. */
  activite: ActiviteDirecte[]
}
export interface ActiviteDirecte {
  cle: string
  le: Instant
  espace: 'client' | 'vendeur' | 'entreprise' | 'livreur' | 'relais' | 'admin'
  quoi: string
  route: string | null
  params?: Record<string, string>
}

export interface ResultatRecherche {
  genre: 'commande' | 'etiquette' | 'paquet' | 'litige' | 'vendeur' | 'relais' | 'entreprise' | 'livreur' | 'client' | 'kyc' | 'remboursement' | 'ticket'
  id: string
  titre: string
  sous: string
  route: string
  params?: Record<string, string>
}

export interface DomaineDirect {
  vue(): Promise<VueDirecte>
  /** Recherche (commande, étiquette, paquet, acteur…) : seulement ce que le rôle ouvre, dans son périmètre. */
  chercher(q: string): Promise<ResultatRecherche[]>
}
