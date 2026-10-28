// DONNÉES DE DÉMONSTRATION — la source de démonstration : un objet par domaine (src/demo/<domaine>.ts), tous branchés
// sur le modèle central des colis (src/demo/colis.ts). Tout le dossier src/demo se supprime d'un bloc quand la source
// API sera complète.
import type { SourceRelais } from '../donnees/source'
import './pont-livreur' // ce que fait le livreur (même appareil) : lots en route, en approche, déposés
import { demoAcces } from './acces'
import { demoAide } from './aide'
import { demoArgent } from './argent'
import { demoAujourdhui } from './aujourdhui'
import { demoDeparts } from './departs'
import { demoFermeture } from './fermeture'
import { demoHistorique } from './historique'
import { demoHorsLigne } from './horsligne'
import { demoIncidents } from './incidents'
import { demoMessages } from './messages'
import { demoNotifications } from './notifications'
import { demoQualite } from './qualite'
import { demoReception } from './reception'
import { demoRelais } from './relais'
import { demoRetrait } from './retrait'
import { demoSession } from './session'
import { demoStock } from './stock'

export const sourceDemo: SourceRelais = {
  session: demoSession,
  acces: demoAcces,
  aujourdhui: demoAujourdhui,
  reception: demoReception,
  retrait: demoRetrait,
  stock: demoStock,
  departs: demoDeparts,
  incidents: demoIncidents,
  fermeture: demoFermeture,
  historique: demoHistorique,
  notifications: demoNotifications,
  messages: demoMessages,
  aide: demoAide,
  argent: demoArgent,
  qualite: demoQualite,
  relais: demoRelais,
  horsligne: demoHorsLigne,
}
