// Connecteurs des domaines (vague 3) : un fichier par domaine, src/api/domaines/<domaine>.ts, exportant
// `domaine<Nom>(api: ClientApi): SourceVendeur['<domaine>']` (même patron que site/src/api/domaines/). Le type
// SourceVendeur garantit qu'aucune méthode n'est oubliée.
import type { ClientApi } from '@client/api/client'
import type { SourceVendeur } from '../../donnees/source'
import { domaineAccueil } from './accueil'
import { domaineAide } from './aide'
import { domaineArgent } from './argent'
import { domaineBoutique } from './boutique'
import { domaineCommandes } from './commandes'
import { domaineCompte } from './compte'
import { domaineEquipe } from './equipe'
import { domaineLitiges } from './litiges'
import { domaineMessages } from './messages'
import { domaineNotifications } from './notifications'
import { domaineOffres } from './offres'
import { domainePaliers } from './paliers'
import { domainePlans } from './plans'
import { domainePublicite } from './publicite'
import { domainePreparation } from './preparation'
import { domaineProduits } from './produits'
import { domaineRemise } from './remise'
import { domaineRetours } from './retours'
import { domaineSession } from './session'
import { domaineTrust } from './trust'
import { domaineVersements } from './versements'

export const BRANCHES = (api: ClientApi): SourceVendeur => ({
  session: domaineSession(api),
  accueil: domaineAccueil(api),
  commandes: domaineCommandes(api),
  preparation: domainePreparation(api),
  remise: domaineRemise(api),
  litiges: domaineLitiges(api),
  retours: domaineRetours(api),
  produits: domaineProduits(api),
  offres: domaineOffres(api),
  argent: domaineArgent(api),
  versements: domaineVersements(api),
  trust: domaineTrust(api),
  paliers: domainePaliers(api),
  plans: domainePlans(api),
  boutique: domaineBoutique(api),
  compte: domaineCompte(api),
  equipe: domaineEquipe(api),
  messages: domaineMessages(api),
  notifications: domaineNotifications(api),
  aide: domaineAide(api),
  publicite: domainePublicite(api),
})
