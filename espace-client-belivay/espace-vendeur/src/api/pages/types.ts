// Domaines servis par le kit pour les pages ajoutées (DP-58 : AJ-B), le tableau « Votre activité » (VD-04) et les
// échanges avec les autres interfaces (INTERFACES.md), qui n'ont pas encore de domaine dans la SourceVendeur : les
// écrans lisent aujourd'hui la démonstration ou recomposent des routes existantes (INTEGRATION-API.md § 6 à 8). Les
// connecteurs (./source.ts) sont prêts ; un écran les prend en remplaçant sa lecture locale. Lus aussi par
// backend-kit/outils/generer-openapi.mts (contrat). Les pages AJ-A ont leurs types (src/pages/AJ-A/donnees/types.ts).
import type { Francs, Instant, ReferenceCommande, Resultat } from '../../donnees/communs'
import type { CentreBelivay } from '../../donnees/domaines/boutique'
import type { Profil } from '../../donnees/domaines/compte'
import type { Remise } from '../../donnees/domaines/remise'
import type { EntreeJournal } from '../../donnees/domaines/commandes'

/** Centre de formation (AJ-B Apprendre) : étapes faites « fiche:étape », par membre. */
export interface DomaineApprendre {
  faites(): Promise<string[]>
  cocher(fiche: string, etape: number, fait: boolean): Promise<string[]>
  recommencer(fiche: string): Promise<string[]>
}

/** Mon profil (AJ-B) : présentation facultative, 160 signes, sans coordonnées (GEN-08), sans code. */
export interface DomaineProfilAJB {
  changerBio(texte: string): Promise<Resultat<{ profil: Profil & { bio: string } }, 'long' | 'coordonnees'>>
}

export interface ResultatRecherche {
  cle: string
  vers: string // route de l'écran
  icone?: string
  titre: string
  sous: string
  exact?: boolean // référence exacte : en tête
}

/** Rechercher partout (AJ-B) : jamais une donnée du client ; versements pour le propriétaire seulement. */
export interface DomaineRecherche {
  chercher(q: string): Promise<{ q: string; resultats: ResultatRecherche[] }>
}

export type LigneActivite = EntreeJournal & { ref: ReferenceCommande | null }

export interface ObjectifDuMois {
  mois: string // AAAA-MM
  montant: Francs | null
  atteint: Francs // gardé du mois (montants figés au paiement)
  majA: Instant | null
}

export interface TableauActivite {
  periode: '7d' | '30d' | '12m'
  serie: { jour: string; garde: Francs; commandes: number }[] // un jour, ou le premier du mois (12m)
  total: Francs
  commandes: number
  chaleur: number[][] // 7 jours (lundi = 0) × 24 heures : commandes payées
  objectif: ObjectifDuMois
  luA: Instant
}

/** Activité de la boutique (AJ-B, journal signé), Ramassages (AJ-B), Votre activité et objectif (VD-04). */
export interface DomaineActivite {
  journal(): Promise<LigneActivite[]>
  ramassages(de: Instant, a: Instant): Promise<Remise[]>
  tableau(periode: '7d' | '30d' | '12m'): Promise<TableauActivite>
  objectif(): Promise<ObjectifDuMois>
  fixerObjectif(montant: Francs): Promise<Resultat<{ objectif: ObjectifDuMois }, 'montant'>>
}

/** Un événement du flux (src/donnees/echanges.ts) : « de » pour un entrant, « vers » pour un sortant. */
export interface EvenementFlux {
  id: string
  a: Instant
  de?: string
  vers?: string
  type: string
  canal: string
  [champ: string]: unknown
}

export interface DomaineEchanges {
  /** Événements depuis un curseur (rejouables sans doublon), selon les droits du membre ; montant null pour un employé. */
  evenements(depuis?: string | null): Promise<{ evenements: EvenementFlux[]; curseur: string }>
  /** Colis pas prêt au passage du livreur : ramassage au créneau suivant (P-6). */
  colisNonPret(ref: ReferenceCommande, raison: 'en_cours' | 'rupture' | 'boutique_fermee'): Promise<Resultat<{ remise: Remise; prochainCreneau: boolean }, 'etat'>>
}

/** Centres BelivaY (relais et centres des zones exploitées) : déjà joints à boutique.lieux() ; seuls ici pour une carte. */
export interface DomaineCentres {
  liste(): Promise<CentreBelivay[]>
}

export interface SourcePages {
  centres: DomaineCentres
  apprendre: DomaineApprendre
  profilAJB: DomaineProfilAJB
  recherche: DomaineRecherche
  activite: DomaineActivite
  echanges: DomaineEchanges
}
