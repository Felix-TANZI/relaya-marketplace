// DONNÉES DE DÉMONSTRATION — compteurs de la coque, lus dans les domaines (aucun écrit) : paquets à accepter, missions
// en cours, incidents à valider, litiges ouverts, demandes des livreurs (départs, absences), notifications et messages non lus, livreurs.
import type { Badges } from '../donnees/domaines/session'
import { paquetsPublies } from './paquets'
import { missionsDemo } from './missions'
import { incidentsDemo } from './incidents'
import { litigesDemo } from './litiges'
import { notificationsDuRole } from './notifications'
import { messagesDemo } from './messages'
import { absencesVues, departsVus, livreursDemo } from './livreurs'
import { roleCourant } from './acces'

export function compteurs(): { badges: Badges; livreurs: number } {
  return {
    badges: {
      paquets: paquetsPublies().length,
      missions: missionsDemo.lire().missions.filter((m) => m.onglet === 'en_cours').length,
      incidents: incidentsDemo.lire().incidents.filter((i) => i.statut === 'a_valider').length,
      litiges: litigesDemo.lire().litiges.filter((l) => l.etape === 'ouvert').length,
      pieces: livreursDemo.lire().livreurs.filter((l) => l.statut !== 'retire').reduce((n, l) => n + l.pieces.filter((p) => p.statut === 'en_revue').length, 0),
      demandes: roleCourant() === 'comptable' ? 0 : departsVus().filter((d) => d.etat === 'demande').length + absencesVues().filter((a) => a.vueLe === null).length,
      notifications: notificationsDuRole().filter((n) => !n.lue).length,
      messages: messagesDemo.lire().fils.reduce((n, f) => n + f.nonLus, 0),
    },
    livreurs: livreursDemo.lire().livreurs.filter((l) => l.statut !== 'retire').length,
  }
}
