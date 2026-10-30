// DONNÉES DE DÉMONSTRATION — la source de démonstration : un objet par domaine. Tout le dossier src/demo se supprime
// d'un bloc quand la source API sera complète (VITE_SOURCE=api).
import type { SourceEntreprise } from '../donnees/source'
import { demoAffectation } from './affectation'
import { demoCompte } from './compte'
import { demoFlotte } from './flotte'
import { demoIncidents } from './incidents'
import './pont-livreur' // le pont avec l'espace livreur (même appareil)
import { demoCarte, demoColis, demoContrat, demoPreuves, demoPrix, demoVehicules } from './lectures'
import { demoEmballages } from './emballages'
import { demoEquipe } from './equipe'
import { demoIntegrations } from './integrations'
import { demoParametres } from './parametres'
import { demoRapports } from './rapports'
import { demoReglements } from './reglements'
import { demoReleves } from './releves'
import { demoScore } from './score'
import { demoLitiges } from './litiges'
import { demoLivreurs } from './livreurs'
import { demoMessages } from './messages'
import { demoMissions } from './missions'
import { demoNotifications } from './notifications'
import { demoPaquets } from './paquets'
import { demoSession } from './session'
import { demoTableau } from './tableau'
import { demoZones } from './zones'

export const sourceDemo: SourceEntreprise = {
  session: demoSession,
  compte: demoCompte,
  tableau: demoTableau,
  contrat: demoContrat,
  zones: demoZones,
  flotte: demoFlotte,
  livreurs: demoLivreurs,
  equipe: demoEquipe,
  vehicules: demoVehicules,
  prix: demoPrix,
  paquets: demoPaquets,
  affectation: demoAffectation,
  missions: demoMissions,
  carte: demoCarte,
  incidents: demoIncidents,
  colis: demoColis,
  preuves: demoPreuves,
  litiges: demoLitiges,
  reglements: demoReglements,
  releves: demoReleves,
  score: demoScore,
  emballages: demoEmballages,
  messages: demoMessages,
  notifications: demoNotifications,
  parametres: demoParametres,
  rapports: demoRapports,
  integrations: demoIntegrations,
}
