// Connecteurs des domaines : un fichier par domaine, src/api/domaines/<domaine>.ts, exportant
// `domaine<Nom>(api: ClientApi): SourceRelais['<domaine>']` (même patron que espace-livreur/src/api/domaines/).
// Le type SourceRelais garantit qu'aucune méthode n'est oubliée.
import type { ClientApi } from '@client/api/client'
import type { SourceRelais } from '../../donnees/source'
import { domaineAcces } from './acces'
import { domaineAide } from './aide'
import { domaineArgent } from './argent'
import { domaineAujourdhui } from './aujourdhui'
import { domaineDeparts } from './departs'
import { domaineFermeture } from './fermeture'
import { domaineHistorique } from './historique'
import { domaineHorsligne } from './horsligne'
import { domaineIncidents } from './incidents'
import { domaineMessages } from './messages'
import { domaineNotifications } from './notifications'
import { domaineQualite } from './qualite'
import { domaineReception } from './reception'
import { domaineRelais } from './relais'
import { domaineRetrait } from './retrait'
import { domaineSession } from './session'
import { domaineStock } from './stock'

export const BRANCHES = (api: ClientApi): SourceRelais => ({
  session: domaineSession(api),
  acces: domaineAcces(api),
  aujourdhui: domaineAujourdhui(api),
  reception: domaineReception(api),
  retrait: domaineRetrait(api),
  stock: domaineStock(api),
  departs: domaineDeparts(api),
  incidents: domaineIncidents(api),
  fermeture: domaineFermeture(api),
  historique: domaineHistorique(api),
  notifications: domaineNotifications(api),
  messages: domaineMessages(api),
  aide: domaineAide(api),
  argent: domaineArgent(api),
  qualite: domaineQualite(api),
  relais: domaineRelais(api),
  horsligne: domaineHorsligne(api),
})
