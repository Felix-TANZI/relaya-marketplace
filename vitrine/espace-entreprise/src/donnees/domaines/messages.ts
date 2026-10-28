// Domaine « messages » (ENT-P22) : messagerie interne supervisée, jamais d'échange avec un client, un vendeur ou un
// gérant (ENT-ANO-01 ; ceux-là passent par la page Appel de la mission, DP-61). Fils : BelivaY (support, rattaché à un
// dossier, sans objet libre), vos livreurs, notes d'incident. Numéros, e-mails et identifiants sociaux masqués à
// l'enregistrement (ENT-P22R-02, masked: true). Fil lié à une mission : fermé à l'expiration du délai de litige, lisible
// par la console (ENT-P22R-01). Pièces : images et PDF ≤ taille_max_piece Mo, jamais une preuve de mission. Support :
// première réponse sous 2 h, 7 h – 21 h, 7 j/7 (DP-62, O-11). Envoi suspendu hors connexion.
// API : GET /api/company/threads?group=belivay|couriers|incidents ; POST …/{id}/messages (Idempotency-Key).
import type { Instant, Resultat } from '../communs'

export type GroupeFil = 'belivay' | 'livreurs' | 'incidents'

export interface Message {
  id: string
  de: 'moi' | 'belivay' | 'livreur' | 'systeme'
  auteur: string // « Gaëlle W. », « Équipe partenaires BelivaY », « Junior T. »
  texte: string
  le: Instant
  masque: boolean
  piece: { nom: string; type: 'image' | 'pdf' } | null
}

export interface Fil {
  id: string
  groupe: GroupeFil
  titre: string
  dossier: { genre: 'litige' | 'incident' | 'paquet' | 'versement' | 'releve' | 'compte'; ref: string; route: string; params: Record<string, string> } | null
  dernier: string
  le: Instant
  nonLus: number
  ferme: boolean
  messages: Message[]
}

export type SujetSupport = 'litige' | 'paquet' | 'versement' | 'releve' | 'compte'

export interface DomaineMessages {
  fils(groupe?: GroupeFil): Promise<Fil[]>
  lire(id: string): Promise<void>
  envoyer(id: string, texte: string, piece: Message['piece']): Promise<Resultat<{ masque: boolean }, 'vide' | 'ferme' | 'piece'>>
  /** Nouveau fil du support BelivaY, rattaché à un dossier. */
  nouveauSupport(sujet: SujetSupport, ref: string, texte: string): Promise<Resultat<{ id: string }, 'vide' | 'ref'>>
}
