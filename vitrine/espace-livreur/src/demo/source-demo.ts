// DONNÉES DE DÉMONSTRATION — la source de démonstration : un objet par domaine (src/demo/<domaine>.ts). Tout le dossier
// src/demo se supprime d'un bloc quand la source API sera complète.
import type { SourceLivreur } from '../donnees/source'
import './pont-entreprise' // le pont avec l'espace entreprise (même appareil)
import { demoAcces } from './acces'
import { demoActivite, etatActivite, releveEnCours } from './activite'
import { demoAide } from './aide'
import { demoAujourdhui } from './aujourdhui'
import { PREAVIS, demoDisponibilite } from './disponibilite'
import { demoHistorique } from './historique'
import { demoHorsLigne } from './horsligne'
import { demoIncidents } from './incidents'
import { demoJournee } from './journee'
import { demoKit } from './kit'
import { demoMessages } from './messages'
import { RELEVE, demoMoi, preavisEnCours } from './moi'
import { demoNotifications } from './notifications'
import { demoPaquets } from './paquets'
import { demoRamassage } from './ramassage'
import { demoRemises } from './remises'
import { demoSession } from './session'
import { demoTournee } from './tournee'
import { demoTrust } from './trust'

// Liens entre domaines (DP-67), posés ici pour éviter les imports croisés : « Mon statut » lit le préavis en cours
// (hors service sans point de Trust Score perdu) ; le dernier versement estimé lit le relevé de la semaine en cours.
PREAVIS.jusqua = preavisEnCours
RELEVE.enCours = releveEnCours
RELEVE.tarifMission = () => (etatActivite.lire().affichage === 'tarif' ? etatActivite.lire().tarifs.depot : null)

export const sourceDemo: SourceLivreur = {
  session: demoSession,
  acces: demoAcces,
  aujourdhui: demoAujourdhui,
  disponibilite: demoDisponibilite,
  paquets: demoPaquets,
  kit: demoKit,
  tournee: demoTournee,
  ramassage: demoRamassage,
  remises: demoRemises,
  incidents: demoIncidents,
  horsligne: demoHorsLigne,
  journee: demoJournee,
  historique: demoHistorique,
  activite: demoActivite,
  trust: demoTrust,
  messages: demoMessages,
  notifications: demoNotifications,
  moi: demoMoi,
  aide: demoAide,
}
