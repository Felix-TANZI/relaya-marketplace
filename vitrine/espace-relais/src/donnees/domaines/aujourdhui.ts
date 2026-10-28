// Domaine « aujourdhui » (possédé par PR-04 Guichet 1) : l'écran Aujourd'hui, servi par UNE requête (GET /relay/today,
// PR-04 « Pour le développeur »). Livreur en approche (héros), lots du jour, compteurs (prêts, dernier jour, à faire
// partir, places libres), « À faire maintenant » trié par urgence (ACC-03, ACC-04), gains de la semaine et caisse du
// jour (gérant seul : null pour un employé, ACC-05, ARL-06), Trust Score et avis, liste du premier jour (VID-02), file
// hors ligne. Tous les nombres sont de vrais comptes du serveur (démonstration : modèle central colis.ts) ; l'écran
// les affiche sans les recalculer (ACC-07 : l'état du versement est celui que renvoie le serveur).
import type { Francs, Instant } from '../communs'

export interface LotEnApproche {
  lot: string // « PQ-Z1-261013-003 »
  entreprise: string
  livreur: string // « Serge A. »
  /** Arrivée estimée ; « en approche » à PR-NTF-APPROCHE-MIN minutes. */
  arriveeEstimee: Instant | null
  suivi: 'prevu' | 'en_route' | 'en_approche' | 'arrive' | 'depose' | 'non_depose'
  colis: number
  placesNecessaires: number
  /** « Il manque n places : préparez les départs d'abord » (placesManquantes, PR-RC-16) ; 0 s'il y a la place. */
  placesManquantes: number
  /** Colis à reprendre au même passage (départs). */
  aReprendre: number
}

/** Une ligne de « À faire maintenant » : seulement des actions (ACC-03), dans l'ordre de ACC-04. */
export type TacheDuJour =
  | { type: 'collecte'; collecte: string; heure: Instant | null; colis: number; motifs: { renvoi: number; retour: number; transfert: number; refus: number } }
  | { type: 'a_faire_partir'; colis: number } // à faire partir sans collecte prévue
  | { type: 'dernier_jour'; clients: number; colis: number; rappelA: Instant | null; fermeA: string | null }
  | { type: 'constat'; id: string; colis: string; aCompleter: boolean }
  | { type: 'groupage'; colis: number; jusquau: string | null }
  | { type: 'lot_a_confirmer'; lot: string; valideA: Instant; alerteSupport: boolean }
  | { type: 'code_bloque'; jusqua: Instant }
  | { type: 'non_prevenu'; colis: number; relanceA: Instant | null } // PR-RC-18
  | { type: 'expirees'; n: number } // OFF-05 : à refaire
  | { type: 'dette'; montant: Francs } // ARL-05, gérant seul

export interface PremierJour {
  formation: { faits: number; total: number }
  /** Numéro de versement : vérifié ou non ; masqué (gérant seul, null pour un employé). */
  numero: { verifie: boolean; masque: string | null }
  /** Premiers gains : part d'une première remise (petit colis), lue au registre. */
  premiereRemise: Francs
}

export interface Aujourdhui {
  maintenant: Instant
  ouvert: boolean
  fermeA: string | null
  rouvreLe: Instant | null
  prochainLot: LotEnApproche | null
  lots: LotEnApproche[]
  compteurs: {
    prets: number // colis remettables aujourd'hui (ACC-01)
    dernierJour: number
    aFairePartir: number
    motifsAFairePartir: { renvoi: number; retour: number; transfert: number; refus: number }
    constats: number
    groupage: number
    retraitsFaits: number
    placesLibres: number
    placesDeclarees: number
    placesOccupees: number
    tauxOccupation: number
    saturation: boolean // PR-SATURATION atteint
  }
  taches: TacheDuJour[]
  /** Espèces de garde encaissées aujourd'hui (tous les membres) ; null pour un employé. */
  caisseDuJour: { total: Francs; partRelais: Francs; partBelivay: Francs } | null
  /** Semaine en cours (gérant seul) : gains, colis remis, jours de garde facturés, prochain versement (ACC-07). */
  semaine: { gains: Francs; colisRemis: number; joursGarde: number; versementLe: Instant; versement: Francs; statut: 'prevu' | 'envoye' | 'credite' | 'refuse' | 'suspendu' } | null
  trust: { score: number | null; palier: string; alerte: { seuil: number; sens: 'montee' | 'descente' } | null }
  avis: { note: number | null; nombre: number; jours: number }
  /** Relais neuf (aucune remise encore) : la liste « Votre premier jour » remplace « À faire maintenant » (VID-02). */
  premierJour: PremierJour | null
  enAttenteEnvoi: number
  regles: {
    herosFenetreMin: number // PR-HEROS-FENETRE-MIN
    approcheMin: number // PR-NTF-APPROCHE-MIN
    saturationPct: number // PR-SATURATION
    lotConfirmMin: number // PR-LOT-CONFIRM-MIN (support alerté sans confirmation du livreur)
  }
}

export interface DomaineAujourdhui {
  aujourdhui(): Promise<Aujourdhui>
}
