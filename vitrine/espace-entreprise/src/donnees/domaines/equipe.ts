// Domaine « equipe » : l'entreprise de livraison EMPLOYEUR de ses livreurs contractuels (DP-66, DP-67 : son employeur
// est l'entreprise, pas BelivaY ; le livreur voit ou demande, l'entreprise décide). Registre du personnel et dossier
// d'emploi d'un livreur : contrat et pièces du dossier (CNI, permis, assurance, carte grise, casier judiciaire si
// l'entreprise l'exige), période d'essai (confirmer, prolonger une fois de la même durée, rompre), discipline
// (avertissements écrits numérotés, suspension avec motif et date de fin facultative, réintégration motivée — gestes
// du domaine « livreurs »), horaires et zones de travail, congés accordés (les absences prévenues restent au domaine
// « livreurs »), fin de contrat à l'initiative de l'employeur avec le préavis du registre (DEPART-PREAVIS-J) — elle
// suit ensuite le même chemin que le départ demandé (constat du kit plafonné à KIT-VALEUR-F, dernier versement,
// clôture) —, attestation de travail et historique horodaté (qui, quand, motif).
// Droits (ENT-RG-R25, consigne du porteur) : décisions d'emploi au propriétaire et au gérant, motif écrit obligatoire ;
// horaires et zones aussi au répartiteur ; attestation aussi au comptable, qui lit les retenues ; le répartiteur et le
// comptable ne lisent pas les motifs disciplinaires. Limites : l'entreprise ne touche pas aux règles de BelivaY
// (commissions, Trust Score, plafonds) ni aux données des clients ; une suspension décidée par BelivaY ne se lève pas ici.
// Chaque décision est journalisée (journal signé) et le livreur en est prévenu (événements du pont : emploi_suspendu,
// emploi_retabli, avertissement_ecrit, zones_changees, horaires_changes, essai_conclu, fin_contrat, fin_contrat_annulee).
// API : GET /api/company/staff, GET /api/company/staff/{id} ; POST /api/company/staff/{id}/probation | warnings |
// schedule | zones | leaves | leaves/{congeId}/cancel | record-check | termination | termination/cancel ;
// GET /api/company/staff/{id}/certificate.
import type { CodeZone, Francs, Instant, Jour, LivreurCourt, Resultat } from '../communs'
import type { StatutLivreur, SuspensionLivreur } from './livreurs'

export type TypeContrat = 'cdi' | 'cdd'
export type IssueEssai = 'en_cours' | 'confirme' | 'rompu'
export type DecisionEssai = 'confirme' | 'prolonge' | 'rompu'

/** Période d'essai : durée fixée au contrat ; prolongée une fois au plus, de la même durée. */
export interface EssaiEmploi {
  debut: Instant
  jusqua: Instant
  dureeJours: number
  prolonge: boolean
  issue: IssueEssai
  decideLe: Instant | null
  decidePar: string | null
}

export type PieceDossierId = 'contrat' | 'cni' | 'permis' | 'assurance' | 'carte_grise' | 'casier'
export type EtatPieceDossier = 'valide' | 'a_controler' | 'manquante' | 'expiree' | 'non_exigee'
/** Pièce du dossier d'embauche ; « ou » : où elle se gère (pièces du livreur, véhicule, ou ici). */
export interface PieceDossier {
  id: PieceDossierId
  etat: EtatPieceDossier
  expireLe: Instant | null
  le: Instant | null
  ou: 'pieces' | 'vehicule' | 'equipe'
}

export interface Avertissement {
  id: string
  rang: number // 1er, 2e… avertissement écrit
  le: Instant
  motif: string
  par: string // « Gaëlle Wankeu · propriétaire »
}

/** Créneau de travail d'un jour de la semaine (0 lundi … 6 dimanche ; heures « HH:MM » de Yaoundé). */
export interface CreneauTravail {
  jour: number
  de: string
  a: string
}

export interface CongeEmploi {
  id: string
  du: Jour
  au: Jour // inclus
  motif: string
  le: Instant
  par: string
  annuleLe: Instant | null
}

/** Fin de contrat décidée par l'employeur : préavis du registre, puis le même chemin qu'un départ (kit, versement, clôture). */
export interface FinContrat {
  id: string // identifiant du départ ouvert (file « Départs »)
  motif: string
  decideLe: Instant
  par: string
  preavisJusqua: Instant
  etat: 'preavis' | 'close'
}

export type GenreHistorique = 'embauche' | 'essai' | 'avertissement' | 'suspension' | 'reintegration' | 'horaires' | 'zones' | 'conge' | 'fin_contrat' | 'piece' | 'attestation' | 'depart'
export interface EntreeHistorique {
  le: Instant
  genre: GenreHistorique
  quoi: string // « Avertissement écrit n° 2 »
  motif: string | null
  par: string
}

/** Ce que le rôle connecté voit du dossier (moindre privilège). */
export type VueDossier = 'complete' | 'exploitation' | 'comptable'

export interface DossierEmploi {
  livreur: LivreurCourt & { statut: StatutLivreur }
  vue: VueDossier
  poste: string
  contrat: { type: TypeContrat; debut: Instant | null; fin: Instant | null; signeLe: Instant | null }
  essai: EssaiEmploi | null
  pieces: PieceDossier[]
  casierExige: boolean
  avertissements: Avertissement[] // vide hors vue complète
  suspension: SuspensionLivreur | null
  horaires: CreneauTravail[]
  zones: CodeZone[]
  conges: CongeEmploi[]
  finContrat: FinContrat | null
  departDemande: boolean // le livreur a lui-même demandé à partir (file « Départs »)
  /** Retenue la plus haute possible sur le kit (KIT-VALEUR-F, fixée par BelivaY) ; null pour qui ne voit pas les montants. */
  retenueKitMax: Francs | null
  historique: EntreeHistorique[]
}

/** Ligne du registre du personnel. */
export interface LigneEquipe {
  livreur: LivreurCourt & { statut: StatutLivreur }
  contrat: TypeContrat
  debut: Instant | null
  essai: { jusqua: Instant; prolonge: boolean } | null // en cours seulement
  avertissements: number
  suspension: { par: 'entreprise' | 'belivay'; jusqua: Instant | null } | null
  finContrat: Instant | null // fin du préavis
  departDemande: boolean
  conges: number // en cours ou à venir
  piecesManquantes: number
}

export type RefusEquipe = 'motif' | 'statut' | 'deja_prolonge' | 'creneaux' | 'zones' | 'dates' | 'deja' | 'inconnu' | 'chevauchement'

export interface DomaineEquipe {
  /** Registre du personnel : livreurs rattachés (hors anciens). */
  registre(): Promise<LigneEquipe[]>
  /** Dossier d'emploi d'un livreur, selon le rôle ; null s'il n'est plus rattaché. */
  dossier(id: string): Promise<DossierEmploi | null>
  /** Fin de la période d'essai : confirmer, prolonger une fois (même durée), ou rompre (motif écrit). */
  conclureEssai(id: string, decision: DecisionEssai, motif: string): Promise<Resultat<{ jusqua: Instant | null }, RefusEquipe>>
  /** Avertissement écrit (motif obligatoire) : rang suivant, livreur prévenu. */
  avertir(id: string, motif: string): Promise<Resultat<{ rang: number }, RefusEquipe>>
  /** Horaires de travail de la semaine (créneaux par jour). */
  fixerHoraires(id: string, creneaux: CreneauTravail[]): Promise<Resultat<object, RefusEquipe>>
  /** Zones de travail (zones déclarées de l'entreprise), motif facultatif transmis au livreur. */
  fixerZones(id: string, zones: CodeZone[], motif: string | null): Promise<Resultat<object, RefusEquipe>>
  /** Congé accordé par l'employeur (jours inclus, motif écrit). */
  accorderConge(id: string, c: { du: Jour; au: Jour; motif: string }): Promise<Resultat<{ congeId: string }, RefusEquipe>>
  annulerConge(id: string, congeId: string): Promise<Resultat<object, RefusEquipe>>
  /** Casier judiciaire : exigé ou non par l'entreprise, et reçu (date). */
  casier(id: string, etat: 'recu' | 'a_demander' | 'non_exige'): Promise<Resultat<object, RefusEquipe>>
  /** Fin de contrat à l'initiative de l'employeur : préavis DEPART-PREAVIS-J, motif écrit. */
  finContrat(id: string, motif: string): Promise<Resultat<{ preavisJusqua: Instant }, RefusEquipe>>
  /** Annule la fin de contrat pendant le préavis (motif écrit) : le livreur reste. */
  annulerFinContrat(id: string, motif: string): Promise<Resultat<object, RefusEquipe>>
  /** Attestation de travail (PDF) : délivrance journalisée. */
  attestation(id: string): Promise<Resultat<{ nom: string; contenu: string; type: string }, RefusEquipe>>
}
