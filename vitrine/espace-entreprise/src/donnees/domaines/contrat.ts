// Domaine « contrat » (ENT-P03) : « une fiche, des pièces, un contrat, une grille » (ENT-03-R18). Contrat type et
// lettre d'engagement (versions, signataires), pièces de l'entreprise (statut, motif, expiration), fiche légale,
// chaîne d'activation (6 étapes, ENT-RG-R16). Signer, envoyer une pièce, modifier la fiche : propriétaire seulement
// (403 ROLE_FORBIDDEN) ; pièces d'identité visibles du propriétaire seulement (ENT-P03R-03). La grille et le palier
// sont fixés par BelivaY (ENT-03-R24) : l'entreprise demande une révision, elle ne modifie rien.
// API : GET /api/company/compliance ; POST …/pieces/{type} (PDF ≤ taille_max_piece Mo ou image, 422 illisible) ;
// PATCH /api/company/profile (nom, RCCM, NIU → en vérification) ; GET · POST /api/company/contract,
// /contract/{version}/accept. La demande de révision de la grille passe par le domaine « prix »
// (POST /api/company/price-grid/revision-requests, une seule route).
import type { Instant, Resultat } from '../communs'

export interface VersionContrat {
  id: string
  genre: 'contrat' | 'lettre_engagement' | 'grille'
  version: string
  statut: 'a_signer' | 'signe' | 'remplace'
  signeLe: Instant | null
  signataires: string[]
  /** Clauses principales appliquées par le portail (ENT-RG-R15), affichées à la lecture. */
  clauses?: string[]
}

export type StatutPiece = 'manquante' | 'en_revue' | 'valide' | 'refusee' | 'expire_bientot' | 'expiree' | 'non_exigee'
export interface Piece {
  type: string // « rccm », « niu », « assurance », « identite_gerant »…
  libelle: string
  statut: StatutPiece
  motif: string | null
  expireLe: Instant | null
  reserveeProprietaire: boolean
  /** Ce que la pièce prouve (une phrase). */
  prouve?: string
  requise?: boolean
  envoyeeLe?: Instant | null
  verifieeLe?: Instant | null
  /** En vérification : réponse au plus tard (revue humaine). */
  revueAvant?: Instant | null
  fichier?: { nom: string; taille: number; type: string } | null
  /** Écran qui gère la pièce ailleurs (assurance des véhicules → véhicules). */
  route?: string | null
}

export interface FicheEntreprise {
  nomLegal: string
  rccm: string
  niu: string
  responsable: string
  adresse: string
  agence: string
  stockageNuit: string
  telephone: string
  referenceContrat: string
  /** Champs repassés en vérification après une modification (ENT-P03R-02). */
  enVerification: ('nomLegal' | 'rccm' | 'niu')[]
}
export type ChampFiche = 'nomLegal' | 'rccm' | 'niu' | 'responsable' | 'adresse' | 'agence' | 'stockageNuit' | 'telephone'

export type IdEtape = 'conformite' | 'zones' | 'flotte' | 'grille' | 'reglement' | 'activation'
/** Étape de la chaîne d'activation (ENT-RG-R16) : faite ou non, ce qui manque, l'écran qui la traite. */
export interface EtapeActivation {
  id: IdEtape
  fait: boolean
  detail: string
  route: string
  params?: Record<string, string>
  bloquant?: string | null // motif d'une pièce rejetée (ENT-RG-R40)
  par?: string | null // opérateur BelivaY qui a activé (ENT-ACT-03)
  le?: Instant | null
}

/** Fichier choisi pour une pièce : l'écran a vérifié l'aperçu (lisible) avant l'envoi. */
export interface FichierPiece {
  nom: string
  taille: number // octets
  type: string // type MIME
  lisible: boolean
}

export interface DomaineContrat {
  contrat(): Promise<{ versions: VersionContrat[]; pieces: Piece[] }>
  accepter(versionId: string): Promise<Resultat>
  fiche(): Promise<FicheEntreprise>
  modifierFiche(champs: Partial<Record<ChampFiche, string>>): Promise<Resultat<{ enVerification: ChampFiche[] }, 'vide' | 'telephone'>>
  envoyerPiece(type: string, fichier: FichierPiece): Promise<Resultat<{ piece: Piece }, 'illisible' | 'taille' | 'format' | 'statut'>>
  activation(): Promise<EtapeActivation[]>
}
