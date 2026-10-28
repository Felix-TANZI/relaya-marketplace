// Connecteurs des domaines : un fichier par domaine, src/api/domaines/<domaine>.ts, exportant
// `domaine<Nom>(api: ClientApi): SourceEntreprise['<domaine>']` (même patron que espace-vendeur/src/api/domaines/).
// Le type SourceEntreprise garantit qu'aucune méthode n'est oubliée.
import type { ClientApi } from '@client/api/client'
import type { SourceEntreprise } from '../../donnees/source'
import { domaineSession } from './session'
import { domaineCompte } from './compte'
import { domaineTableau } from './tableau'
import { domaineContrat } from './contrat'
import { domaineZones } from './zones'
import { domaineFlotte } from './flotte'
import { domaineLivreurs } from './livreurs'
import { domaineEquipe } from './equipe'
import { domaineVehicules } from './vehicules'
import { domainePrix } from './prix'
import { domainePaquets } from './paquets'
import { domaineAffectation } from './affectation'
import { domaineMissions } from './missions'
import { domaineCarte } from './carte'
import { domaineIncidents } from './incidents'
import { domaineColis } from './colis'
import { domainePreuves } from './preuves'
import { domaineLitiges } from './litiges'
import { domaineReglements } from './reglements'
import { domaineReleves } from './releves'
import { domaineScore } from './score'
import { domaineEmballages } from './emballages'
import { domaineMessages } from './messages'
import { domaineNotifications } from './notifications'
import { domaineParametres } from './parametres'
import { domaineRapports } from './rapports'
import { domaineIntegrations } from './integrations'

export const BRANCHES = (api: ClientApi): SourceEntreprise => ({
  session: domaineSession(api),
  compte: domaineCompte(api),
  tableau: domaineTableau(api),
  contrat: domaineContrat(api),
  zones: domaineZones(api),
  flotte: domaineFlotte(api),
  livreurs: domaineLivreurs(api),
  equipe: domaineEquipe(api),
  vehicules: domaineVehicules(api),
  prix: domainePrix(api),
  paquets: domainePaquets(api),
  affectation: domaineAffectation(api),
  missions: domaineMissions(api),
  carte: domaineCarte(api),
  incidents: domaineIncidents(api),
  colis: domaineColis(api),
  preuves: domainePreuves(api),
  litiges: domaineLitiges(api),
  reglements: domaineReglements(api),
  releves: domaineReleves(api),
  score: domaineScore(api),
  emballages: domaineEmballages(api),
  messages: domaineMessages(api),
  notifications: domaineNotifications(api),
  parametres: domaineParametres(api),
  rapports: domaineRapports(api),
  integrations: domaineIntegrations(api),
})
