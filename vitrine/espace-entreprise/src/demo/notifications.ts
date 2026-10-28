// DONNÉES DE DÉMONSTRATION — domaine « notifications » (ENT-P23) : alertes du début du pilote, chacune liée à l'écran
// concerné. Canaux selon la règle (src/calculs/ent08.ts) : SMS seulement pour le litige ouvert et le versement refusé.
import type { DomaineNotifications, Notification } from '../donnees/domaines/notifications'
import type { Canal, TypeAlerte } from '../calculs/ent08'
import { OUTILS } from '../calculs/ent08'
import { roleCourant } from './acces'
import { T } from './jeu-essai'
import { J } from './prestations'
import { magasin, repondre } from './stockage'

const canaux = (type: TypeAlerte): Canal[] => [...OUTILS.canauxParDefaut, ...(OUTILS.typesSms.includes(type) ? (['sms'] as Canal[]) : [])]
const n = (id: string, type: TypeAlerte, priorite: Notification['priorite'], titre: string, texte: string, le: number, lue: boolean, route: string, params: Record<string, string> = {}): Notification => ({ id, type, priorite, titre, texte, le, lue, canaux: canaux(type), route, params })

export const notificationsDemo = magasin('notifications', () => ({
  notifications: [
    n('NT-1', 'paquet', 'critique', 'Nouveau paquet publié', 'PQ-Z1-261013-004 · Bastos · 1 colis M · à accepter dans le délai', T(-1), false, 'paquet', { id: 'PQ-Z1-261013-004' }),
    n('NT-2', 'incident', 'maintenant', 'Incident à valider', 'Boutique fermée · Hugo M. · IN-121', T(-6), false, 'incidents', { id: 'IN-121' }),
    n('NT-3', 'litige', 'critique', 'Litige ouvert', 'LT-031 · réponse attendue avant l’échéance', J(-1, 17, 5), false, 'litiges', { id: 'LT-031' }),
    n('NT-4', 'litige', 'a_valider', 'Décision rendue', 'LT-029 · transporteur en tort · recours possible', J(-1, 17, 40), true, 'litiges', { id: 'LT-029' }),
    n('NT-5', 'vente_flash', 'info', 'Vente flash annoncée', 'Melen (Z6) · samedi 17 oct. · environ 60 colis attendus', J(0, 8, 0), true, 'zones'),
    n('NT-6', 'document', 'info', 'Pièce bientôt expirée', 'Assurance responsabilité civile · à renouveler', J(-1, 13, 30), true, 'contrat'),
    // Démonstration étoffée (M12) : une vingtaine d'alertes de types, priorités et jours variés.
    n('NT-7', 'non_affecte', 'maintenant', 'Paquet sans livreur', 'PQ-Z3-261013-002 · Mokolo · accepté il y a 40 min, aucun livreur affecté', T(-40), false, 'affectation'),
    n('NT-8', 'depart', 'maintenant', 'Départ absent', 'Tournée relais Bastos · départ prévu à 13 h 30, pas encore parti', T(-30), false, 'missions'),
    n('NT-9', 'versement_refuse', 'critique', 'Versement refusé', 'Versement du vendredi · numéro Mobile Money refusé par l’opérateur', T(-95), false, 'reglements'),
    n('NT-10', 'incident', 'a_valider', 'Incident déclaré', 'Colis abîmé au ramassage · Paul E. · photo jointe', T(-150), true, 'incidents'),
    n('NT-11', 'paquet', 'info', 'Paquet accepté', 'PQ-Z1-261013-001 · 4 colis · tournée relais de 15 h', T(-200), true, 'paquets'),
    n('NT-12', 'document', 'a_valider', 'Pièce à renouveler', 'Carte grise de la moto LT 452 · expire dans 12 jours', T(-260), true, 'vehicules'),
    n('NT-13', 'vente_flash', 'info', 'Vente flash confirmée', 'Mokolo (Z3) · vendredi 16 oct. · environ 40 colis attendus', T(-300), true, 'zones'),
    n('NT-14', 'paquet', 'info', 'Nouveau paquet publié', 'PQ-Z3-261012-006 · Mokolo · 2 colis S', J(-1, 9, 10), true, 'paquets'),
    n('NT-15', 'incident', 'info', 'Incident clos', 'Destinataire absent · deuxième passage réussi', J(-1, 11, 45), true, 'incidents'),
    n('NT-16', 'non_affecte', 'info', 'Paquet affecté', 'PQ-Z1-261012-003 · confié à Junior T.', J(-1, 12, 20), true, 'affectation'),
    n('NT-17', 'depart', 'info', 'Départ confirmé', 'Tournée relais Mvog-Mbi · partie à 8 h 05', J(-1, 8, 5), true, 'missions'),
    n('NT-18', 'versement_refuse', 'info', 'Versement relancé', 'Versement de la semaine 41 · envoyé sur le numéro vérifié', J(-2, 10, 0), true, 'reglements'),
    n('NT-19', 'litige', 'info', 'Litige clos', 'LT-027 · aucune faute retenue · dossier fermé', J(-3, 16, 30), true, 'litiges'),
    n('NT-20', 'document', 'info', 'Pièce acceptée', 'Attestation d’assurance · vérifiée par BelivaY', J(-4, 9, 15), true, 'contrat'),
    n('NT-21', 'paquet', 'info', 'Paquet clos', 'PQ-Z2-261009-002 · 6 colis remis, preuves complètes', J(-4, 18, 40), true, 'preuves'),
    n('NT-22', 'incident', 'info', 'Incident validé', 'Retard de 20 min · pluie · sans pénalité', J(-5, 15, 0), true, 'incidents'),
  ] as Notification[],
}))

/** Notifications d'un rôle (ENT-RG-R25) : le comptable ne reçoit que l'argent, les litiges et les documents ; le
 * répartiteur tout sauf les versements. Le compteur de la cloche lit la même liste. */
const POUR_LE_COMPTABLE = new Set(['litige', 'versement_refuse', 'document'])
export function notificationsDuRole(): Notification[] {
  const r = roleCourant()
  return notificationsDemo.lire().notifications.filter((n) => (r === 'comptable' ? POUR_LE_COMPTABLE.has(n.type) : r === 'repartiteur' || r === 'gerant' ? n.type !== 'versement_refuse' : true))
}

export const demoNotifications: DomaineNotifications = {
  async liste() {
    return repondre([...notificationsDuRole()].sort((a, b) => b.le - a.le))
  },
  async lire(id) {
    if (notificationsDemo.lire().notifications.find((x) => x.id === id)?.lue !== false) return
    notificationsDemo.ecrire((s) => void (s.notifications.find((x) => x.id === id)!.lue = true))
  },
  async marquerLues() {
    notificationsDemo.ecrire((s) => s.notifications.forEach((x) => (x.lue = true)))
  },
}
