// Les seize domaines de la SourceAdmin branchés sur le kit (un fichier par domaine).
import type { ClientApi } from '@client/api/client'
import type { SourceAdmin } from '../../donnees/source'
import { domaineActeurs } from './acteurs'
import { domaineArgent } from './argent'
import { domaineCatalogue } from './catalogue'
import { domaineCommandes } from './commandes'
import { domaineCommunication } from './communication'
import { domaineDecisions } from './decisions'
import { domaineDirect } from './direct'
import { domaineEquipe } from './equipe'
import { domaineFiles } from './files'
import { domaineGouvernance } from './gouvernance'
import { domaineLitiges } from './litiges'
import { domaineLogistique } from './logistique'
import { domainePilotage } from './pilotage'
import { domaineQuatreYeux } from './quatreyeux'
import { domaineSession } from './session'
import { domaineSysteme } from './systeme'

export const BRANCHES = (api: ClientApi): SourceAdmin => ({
  session: domaineSession(api),
  direct: domaineDirect(api),
  files: domaineFiles(api),
  quatreyeux: domaineQuatreYeux(api),
  litiges: domaineLitiges(api),
  commandes: domaineCommandes(api),
  argent: domaineArgent(api),
  acteurs: domaineActeurs(api),
  catalogue: domaineCatalogue(api),
  logistique: domaineLogistique(api),
  pilotage: domainePilotage(api),
  communication: domaineCommunication(api),
  gouvernance: domaineGouvernance(api),
  systeme: domaineSysteme(api),
  equipe: domaineEquipe(api),
  decisions: domaineDecisions(api),
})
