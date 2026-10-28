// Domaine « notifications » (LIV-P28 ; LIV-10-R18 à R20, LIV-P28R-01 à R04, LIV-02-R117/R118, DED-32).
// - Quatre rubriques dans un ordre fixe calculé par le serveur : 1 Sécurité et incidents, 2 Tournée, 3 Compte (pièces,
//   certification), 4 Messages ; peu de notifications, toutes utiles ; aucune promotion, aucune publicité.
// - Aucune donnée sensible : ni code, ni numéro, ni adresse ; un message reçu s'annonce « Message · <boutique> » sans
//   son texte, jamais le nom d'un client.
// - Une notification de tournée non lue en LIV-NOTIF-RAPPEL-MIN minutes est rappelée une fois ; l'entreprise voit si
//   elle a été lue (accusé read_at). Chacune ouvre directement l'écran concerné (route et paramètres).
import type { Instant } from '../communs'

export type Rubrique = 'securite' | 'tournee' | 'compte' | 'messages'
export interface Notification {
  id: string
  rubrique: Rubrique
  priorite: 'haute' | 'normale' // haute : sécurité, incidents et tournée
  titre: string
  texte: string
  route: string | null // écran qui la règle
  params?: Record<string, string>
  quand: Instant
  lue: boolean
  lueA: Instant | null
  rappeleeA: Instant | null
}

export interface DomaineNotifications {
  liste(): Promise<Notification[]>
  marquerLue(id: string): Promise<void>
  toutMarquerLu(): Promise<void>
}
