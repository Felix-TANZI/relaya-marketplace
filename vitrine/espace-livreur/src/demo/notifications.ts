// DONNÉES DE DÉMONSTRATION — domaine « notifications » : celles de Serge le mardi 13 octobre. Le rappel unique d'une
// notification de tournée non lue se calcule à la lecture (tâche du serveur à LIV-NOTIF-RAPPEL-MIN minutes).
import type { DomaineNotifications, Notification } from '../donnees/domaines/notifications'
import { maintenant } from './horloge'
import { h } from './jeu-essai'
import { magasin, repondre } from './stockage'

const n = (x: Omit<Notification, 'lue' | 'lueA' | 'rappeleeA'> & Partial<Notification>): Notification => ({ lue: false, lueA: null, rappeleeA: null, ...x })

export const etatNotifications = magasin<Notification[]>('notifications', () => [
  n({ id: 'N1', rubrique: 'tournee', priorite: 'haute', titre: 'Arrêt 2 à faire avant 14 h 30', texte: 'Maison Ngono, Bastos : 2 colis à contrôler.', route: 'tournee', quand: h(14, 0), rappeleeA: h(14, 5) }),
  n({ id: 'N2', rubrique: 'tournee', priorite: 'haute', titre: 'Paquet hors connexion prêt', texte: 'Cartes et consignes du paquet PQ-Z1-261013-003 enregistrées sur le téléphone.', route: 'synchronisation', quand: h(12, 50) }),
  n({ id: 'N9', rubrique: 'tournee', priorite: 'haute', titre: 'Nouveau paquet affecté', texte: 'PQ-Z1-261013-013 · Z1 Centre-ville · 2 arrêts. Rien à accepter : Yafé Express vous l’a affecté.', route: 'paquet', params: { id: 'PQ-Z1-261013-013' }, quand: h(14, 4), lue: true, lueA: h(14, 4) }),
  n({ id: 'N8', rubrique: 'tournee', priorite: 'haute', titre: 'Nouveau paquet affecté', texte: 'PQ-Z1-261013-012 · Z1 Centre-ville · 2 arrêts. Rien à accepter : Yafé Express vous l’a affecté.', route: 'paquet', params: { id: 'PQ-Z1-261013-012' }, quand: h(14, 3), lue: true, lueA: h(14, 4) }),
  n({ id: 'N7', rubrique: 'tournee', priorite: 'haute', titre: 'Paquet modifié : à relire', texte: 'PQ-Z1-261013-007 · repère de Sapeur Mode précisé. Relisez-le avant de partir.', route: 'paquet', params: { id: 'PQ-Z1-261013-007' }, quand: h(14, 1), lue: true, lueA: h(14, 2) }),
  n({ id: 'N6', rubrique: 'tournee', priorite: 'haute', titre: 'Nouveau paquet affecté', texte: 'PQ-Z1-261013-011 · Z1 Centre-ville · 6 arrêts. Rien à accepter : Yafé Express vous l’a affecté.', route: 'paquet', params: { id: 'PQ-Z1-261013-011' }, quand: h(13, 49), lue: true, lueA: h(13, 52) }),
  n({ id: 'N5', rubrique: 'tournee', priorite: 'haute', titre: 'Nouveau paquet affecté', texte: 'PQ-Z1-261013-003 · Z1 Centre-ville · 4 arrêts. Rien à accepter : Yafé Express vous l’a affecté.', route: 'tournee', quand: h(12, 41), lue: true, lueA: h(12, 43) }),
  n({ id: 'N12', rubrique: 'tournee', priorite: 'normale', titre: 'Paquet clos', texte: 'PQ-Z1-261013-010 · retour rendu à Chez Mama Ewondo, code de réception validé.', route: 'historique', quand: h(12, 10), lue: true, lueA: h(12, 15) }),
  n({ id: 'N11', rubrique: 'tournee', priorite: 'normale', titre: 'Paquet clos', texte: 'PQ-Z1-261013-001 · 4 colis déposés au Relais Bastos Carrefour, lot confirmé par la gérante.', route: 'historique', quand: h(11, 10), lue: true, lueA: h(11, 12) }),
  n({ id: 'N10', rubrique: 'compte', priorite: 'normale', titre: 'Trust Score : +1 en ponctualité', texte: 'Ramassage chez Tech Bastos dans le créneau annoncé.', route: 'trust', quand: h(13, 24), lue: true, lueA: h(13, 40) }),
  n({ id: 'N3', rubrique: 'compte', priorite: 'normale', titre: 'Vos pièces sont à jour', texte: 'CNI, permis et assurance vérifiés : l’assurance vaut jusqu’au 14 mars 2027. Rappel 30 jours avant chaque échéance.', route: 'moi', quand: h(8, 0) }),
  n({ id: 'N4', rubrique: 'messages', priorite: 'normale', titre: 'Message · Yafé Express', texte: 'Ouvrez le fil pour lire le message.', route: 'messages', params: { fil: 'F1' }, quand: h(13, 58) }),
])

export const demoNotifications: DomaineNotifications = {
  liste: () => repondre(etatNotifications.lire()),
  async marquerLue(id) {
    if (!etatNotifications.lire().some((x) => x.id === id && !x.lue)) return
    const t = maintenant()
    etatNotifications.ecrire((l) => l.forEach((x) => x.id === id && ((x.lue = true), (x.lueA = t))))
  },
  async toutMarquerLu() {
    const t = maintenant()
    etatNotifications.ecrire((l) => l.forEach((x) => !x.lue && ((x.lue = true), (x.lueA = t))))
  },
}
