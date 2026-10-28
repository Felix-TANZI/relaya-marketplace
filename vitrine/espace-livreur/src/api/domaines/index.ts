// Connecteurs des domaines : un fichier par domaine, src/api/domaines/<domaine>.ts, exportant
// `domaine<Nom>(api: ClientApi): SourceLivreur['<domaine>']` (même patron que espace-vendeur/src/api/domaines/).
// Le type SourceLivreur garantit qu'aucune méthode n'est oubliée.
import type { ClientApi } from '@client/api/client'
import type { SourceLivreur } from '../../donnees/source'
import { domaineSession } from './session'
import { domaineAcces } from './acces'
import { domaineAujourdhui } from './aujourdhui'
import { domaineDisponibilite } from './disponibilite'
import { domainePaquets } from './paquets'
import { domaineKit } from './kit'
import { domaineTournee } from './tournee'
import { domaineRamassage } from './ramassage'
import { domaineRemises } from './remises'
import { domaineIncidents } from './incidents'
import { domaineHorsligne } from './horsligne'
import { domaineJournee } from './journee'
import { domaineHistorique } from './historique'
import { domaineActivite } from './activite'
import { domaineTrust } from './trust'
import { domaineMessages } from './messages'
import { domaineNotifications } from './notifications'
import { domaineMoi } from './moi'
import { domaineAide } from './aide'

export const BRANCHES = (api: ClientApi): SourceLivreur => ({
  session: domaineSession(api),
  acces: domaineAcces(api),
  aujourdhui: domaineAujourdhui(api),
  disponibilite: domaineDisponibilite(api),
  paquets: domainePaquets(api),
  kit: domaineKit(api),
  tournee: domaineTournee(api),
  ramassage: domaineRamassage(api),
  remises: domaineRemises(api),
  incidents: domaineIncidents(api),
  horsligne: domaineHorsligne(api, BRANCHES),
  journee: domaineJournee(api),
  historique: domaineHistorique(api),
  activite: domaineActivite(api),
  trust: domaineTrust(api),
  messages: domaineMessages(api),
  notifications: domaineNotifications(api),
  moi: domaineMoi(api),
  aide: domaineAide(api),
})
