// Domaine « messages » : une conversation par commande, anonyme dans les deux sens (le vendeur lit « Client de
// BLV-… », MSG-01), fermée à la fin du délai de litige (MSG-02) ou, pour un litige, à la clôture du dossier (Q-70) ;
// numéros, e-mails, liens et réseaux sociaux retirés avant l'envoi, des deux côtés (VD11-R59, GEN-08) ; réponses
// rapides (VD11-R60) ; une conversation « Support BelivaY » hors commandes, en plus du WhatsApp d'aide (Q-49).
// Chaque message du vendeur est signé par le membre qui l'écrit (EQU-03). La conversation est une preuve.
// API : GET /threads, POST /threads/{id}/messages, POST /threads/{id}/read, POST /threads/support, GET /quick-replies
// (VD-02 p12, Q-92).
import type { Instant, ReferenceCommande } from '../communs'

export interface Message {
  id: string
  de: 'vendeur' | 'client' | 'support' // le client n'a pas de nom ici
  auteur: string | null // prénom du membre qui a écrit (vendeur), signé
  texte: string
  a: Instant
  filtre: boolean // un numéro, un e-mail, un lien ou un réseau social a été retiré
}

export type TypeFil = 'commande' | 'litige' | 'support'

export interface Fil {
  id: string
  type: TypeFil
  ref: ReferenceCommande | null
  sujet: string // « Client de BLV-00008 », « Support BelivaY »
  nonLus: number
  dernier: Message | null
  ferme: boolean
  // Carte de la commande en tête de conversation (article, étape, échéance) ; jamais rien du client.
  commande: { titre: string; variante: string; dessin: string; etape: string; echeance: Instant | null } | null
}

export interface DomaineMessages {
  fils(): Promise<Fil[]>
  fil(id: string): Promise<{ fil: Fil; messages: Message[] } | null>
  /** Envoie un message filtré ; refusé sur une conversation fermée (Error « ferme ») ou un texte vide. */
  envoyer(id: string, texte: string): Promise<Message>
  lire(id: string): Promise<void>
  /** Ce que le filtre retirerait, avant l'envoi (même règle que le serveur). */
  filtrer(texte: string): { propre: string; filtre: boolean }
  /** Écrit dans la conversation « Support BelivaY » (créée au besoin), avec la référence d'une commande s'il y en a une. */
  ecrireAuSupport(texte: string, ref?: ReferenceCommande | null): Promise<{ fil: string }>
  reponsesRapides(type: TypeFil): Promise<string[]>
  /** La conversation d'une commande (litige compris), créée au besoin (REP-03 : « Relire les messages de la commande »). */
  ouvrirFil(ref: ReferenceCommande): Promise<{ fil: string } | null>
}
