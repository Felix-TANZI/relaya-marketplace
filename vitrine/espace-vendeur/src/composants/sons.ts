// Sons de l'espace vendeur : la marque sonore BelivaY (marque-sonore.ts, la même dans les cinq applications ; couleur
// du vendeur : un ton au-dessus du client) branchée sur les gestes et les arrivées. Tableau : logique-metier/SONS.md.
// - Gestes : chaque écran nomme son action (sonner('cestPret'), sonner('remiseLivreur')…) ou un son commun
//   (jouer('valide'), jouer('envoi'), jouer('code')…).
// - Arrivées (compteurs de la session qui montent, sonsDesBadges) : nouvelle commande (le son le plus marquant : des
//   pièces puis une cloche) ; message reçu ; notification, dont le son dit l'objet : versement reçu, avis reçu,
//   commande à préparer en retard ou litige (alerte), autre (notification discrète).
// - Silence la nuit (Paramètres, notifications) : ni commande ni notification discrète ne sonnent ; un litige près de
//   l'échéance sonne toujours (Q-48). « Son distinct » coupé : une commande sonne comme une notification.
import { source } from '../donnees/source'
import type { Notification } from '../donnees/domaines/notifications'
import { reglerCalme, sonner, type Action } from './marque-sonore'

/** Minutes depuis minuit, heure de Yaoundé (UTC+1, sans heure d'été). */
const minutesYaounde = (t: number) => {
  const d = new Date(t + 3600 * 1000)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}
const enMinutes = (h: string) => {
  const [a, b] = h.split(':').map(Number)
  return a * 60 + (b || 0)
}
/** Dans la plage de silence (qui peut passer minuit : 21:00 → 07:00). */
export function dansLeSilence(t: number, plage: [string, string] | null): boolean {
  if (!plage) return false
  const m = minutesYaounde(t)
  const [de, a] = plage.map(enMinutes)
  return de <= a ? m >= de && m < a : m >= de || m < a
}

let distinct = true
let horloge = () => Date.now()
/** Silence la nuit et « son distinct » (réglages des notifications) ; maintenant : heure de la session. */
export function reglerSilence(plage: [string, string] | null, sonDistinct = true, maintenant?: () => number) {
  distinct = sonDistinct
  if (maintenant) horloge = maintenant
  reglerCalme(plage ? () => dansLeSilence(horloge(), plage) : null, ['discret', 'arrivee'])
}

// Le son d'une notification : ce qu'elle annonce.
const SON_NOTIFICATION: Partial<Record<Notification['type'], Action>> = {
  versement: 'versementRecu',
  avis: 'avisRecu',
  preparer: 'commandeEnRetard',
  litige: 'commandeEnRetard',
  sanction: 'commandeEnRetard',
  securite: 'commandeEnRetard',
  message: 'messageRecu',
}
const ORDRE: Action[] = ['commandeEnRetard', 'versementRecu', 'avisRecu', 'messageRecu', 'notification']

/** Compteurs de la session [notifications, commandes, messages] qui montent : un seul son, le plus parlant. */
export function sonsDesBadges(avant: number[], apres: number[]) {
  const [n0, c0, m0] = avant
  const [n1, c1, m1] = apres
  if (c1 > c0) return void sonner(distinct ? 'nouvelleCommande' : 'notification')
  if (n1 > n0)
    return void source.notifications
      .liste('tout')
      .then((l) => {
        const nouvelles = l.filter((x) => !x.lu).slice(0, n1 - n0)
        const sons = nouvelles.map((x) => SON_NOTIFICATION[x.type] ?? 'notification')
        sonner(ORDRE.find((s) => sons.includes(s)) ?? 'notification')
      })
      .catch(() => sonner('notification'))
  if (m1 > m0) sonner('messageRecu')
}
