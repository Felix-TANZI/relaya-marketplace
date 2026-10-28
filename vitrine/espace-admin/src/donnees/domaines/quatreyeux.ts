// Domaine « quatreyeux » (ADM-01 § 12 ; tenu par S1, page « quatreyeux ») : les décisions qui exigent un second
// validateur, d'un AUTRE compte que le premier (jamais le même agent, même sous un autre rôle). Le socle fournit
// DecisionMotivee (feuille : motif, preuves, avertissement) et CarteQuatreYeux (contresigner, refuser).
import type { EtatDecision, Instant, Resultat, Role } from '../communs'

export interface Preuve {
  id: string
  libelle: string // « Photo du colis au comptoir · 23 sept. 17 h 15 »
  route?: string // page où la voir
  params?: Record<string, string>
}

export interface DemandeDecision {
  action: string // « remboursement.executer », « kyc.valider », « parametre.changer »…
  objet: string // « RB-0031 »
  resume: string // phrase française : « Rembourser 180 280 F au client de BLV-52107 »
  motif: string
  preuves: Preuve[]
  montant?: number | null
  quatreYeux: boolean // le serveur le décide aussi : seuil, paramètre critique, sanction lourde
  rolesSecond: Role[] // rôles qui peuvent contresigner
}

export interface DecisionQuatreYeux {
  id: string // « QY-0007 »
  action: string
  objet: string
  resume: string
  motif: string
  preuves: Preuve[]
  montant: number | null
  premier: { agentId: string; agent: string; role: Role; le: Instant }
  second: { agentId: string; agent: string; role: Role; le: Instant; motif: string } | null
  rolesSecond: Role[]
  etat: EtatDecision
  expireLe: Instant
}

export type RaisonQuatreYeux = 'meme_compte' | 'role_non_permis' | 'deja_traitee' | 'motif_court'

export interface DomaineQuatreYeux {
  /** Applique tout de suite, ou crée une demande à contresigner (quatre yeux). */
  decider(d: DemandeDecision): Promise<Resultat<{ etat: EtatDecision; id: string }, 'motif_court' | 'role_non_permis'>>
  enAttente(): Promise<DecisionQuatreYeux[]>
  /** Décisions tranchées (contresignées, refusées, échues) visibles du rôle, les plus récentes d'abord. */
  historique(): Promise<DecisionQuatreYeux[]>
  contresigner(id: string, motif: string): Promise<Resultat<{ etat: EtatDecision }, RaisonQuatreYeux>>
  refuser(id: string, motif: string): Promise<Resultat<{ etat: EtatDecision }, RaisonQuatreYeux>>
}
