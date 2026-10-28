// Domaine « litiges » (ENT-P17), selon DP-35 seule (DP-62, QUESTIONS L-01) : un litige = un dossier (ENT-P17R-03).
// Étapes : ouvert (réponse de l'entreprise sous delai_reponse_litige ; sans réponse, BelivaY arbitre sur les preuves),
// en examen (BelivaY tranche au plus LIT-DECISION-H après l'échéance ; un arrangement proposé attend la réponse de
// l'autre partie LIT-ARRANG-REPONSE-J jours, sans réponse le dossier revient en examen), décidé (décision motivée ;
// recours une fois sous LIT-RECOURS-H, élément nouveau obligatoire, examiné par une autre personne, le médiateur senior ;
// définitive ensuite). La retenue et l'effet sur le Trust Score ne s'appliquent qu'à la décision définitive (DED-09) ;
// transporteur en tort : article (plafonné par le palier), livraison remboursée, trajet retour, en lignes distinctes
// (DED-10). Preuves de la chaîne jointes d'office (DED-09). Qui fait quoi (L-02) : le répartiteur prépare la réponse
// et joint la déclaration du livreur, le propriétaire l'envoie et fait le recours, le comptable lit ; le répartiteur
// ne voit aucun montant. Un dossier n'est jamais supprimé (conservé ENT-CONSERV-PREUVES jours).
// API : GET /api/company/disputes?stage= ; POST …/{id}/draft, …/{id}/response, …/{id}/complement, …/{id}/appeal.
import type { Francs, Instant, LivreurCourt, Resultat } from '../communs'

export type EtapeLitige = 'ouvert' | 'examen' | 'decide'
export type GenreReponse = 'accepter' | 'contester' | 'arrangement'
export type PartieEnTort = 'entreprise' | 'vendeur' | 'client' | 'aucune'

export interface PreuveDossier {
  maillon: 'C1' | 'C2' | 'C3' | 'C4' | 'transport'
  genre: 'photo' | 'qr' | 'code' | 'position' | 'appel' | 'incident'
  libelle: string // « Photo au ramassage (vendeur → livreur) »
  le: Instant
  par: string // « Junior T. », « Gérant du relais »
}

export interface ReponseLitige {
  genre: GenreReponse
  texte: string
  piece: string | null // déclaration du livreur, horodatée par le serveur
  le: Instant
  par: string
}

export interface DecisionLitige {
  le: Instant
  par: string // « Médiatrice BelivaY · Clarisse N. »
  enTort: PartieEnTort
  motif: string
  retenues: { libelle: string; montant: Francs | null }[] // montants null pour le répartiteur
  effetTrust: string | null // appliqué à la décision définitive seulement
  definitiveLe: Instant // fin du délai de recours (ou réponse au recours)
}

export interface RecoursLitige {
  le: Instant
  par: string
  element: string
  statut: 'en_cours' | 'confirme' | 'reforme'
  examinePar: string // une autre personne que l'auteur de la décision
}

export interface Litige {
  id: string // « LT-031 »
  paquetId: string
  missionId: string
  commande: string // référence de la commande, sans aucune donnée du client
  livreur: LivreurCourt | null
  ouvertPar: 'client' | 'vendeur' | 'relais'
  etape: EtapeLitige
  motif: string
  description: string
  montantEnJeu: Francs | null // null pour le répartiteur
  ouvertLe: Instant
  repondreAvant: Instant // échéance de la réponse de l'entreprise
  decisionAvant: Instant // échéance + LIT-DECISION-H
  preuves: PreuveDossier[]
  brouillon: ReponseLitige | null // préparé, pas encore envoyé (L-02)
  reponse: ReponseLitige | null
  arrangement: { reponseAvant: Instant; statut: 'attente' | 'accepte' | 'refuse' | 'sans_reponse' } | null
  complements: { le: Instant; par: string; texte: string }[]
  decision: DecisionLitige | null
  recours: RecoursLitige | null
  journal: { le: Instant; quoi: string; par: string }[]
}

export type RefusLitige = 'texte' | 'delai' | 'etape' | 'recours_utilise' | 'element'

export interface DomaineLitiges {
  liste(etape?: EtapeLitige): Promise<Litige[]>
  /** Préparer (répartiteur ou propriétaire) : la réponse reste un brouillon, que le propriétaire envoie. */
  preparer(id: string, genre: GenreReponse, texte: string, piece: string | null): Promise<Resultat<object, RefusLitige>>
  /** Envoyer la réponse (propriétaire) : 409 DISPUTE_DEADLINE_PASSED après l'échéance ; 422 TEXT_TOO_SHORT. */
  repondre(id: string, genre: GenreReponse, texte: string, piece: string | null): Promise<Resultat<object, RefusLitige>>
  /** Compléter le dossier pendant l'examen (élément nouveau). */
  completer(id: string, texte: string): Promise<Resultat<object, RefusLitige>>
  /** Recours (propriétaire), une fois, élément nouveau obligatoire : 409 APPEAL_ALREADY_USED ensuite. */
  recours(id: string, element: string): Promise<Resultat<object, RefusLitige>>
}
