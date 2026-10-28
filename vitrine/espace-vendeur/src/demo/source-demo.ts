// DONNÉES DE DÉMONSTRATION — la source de démonstration : un objet par domaine (src/demo/<domaine>.ts). Tout le dossier
// src/demo se supprime d'un bloc quand la source API sera complète (VITE_SOURCE=api).
import type { SourceVendeur } from '../donnees/source'
import { demoAccueil } from './accueil'
import { demoAide } from './aide'
import { demoArgent } from './argent'
import { demoBoutique } from './boutique'
import { demoCommandes } from './commandes'
import { demoCompte } from './compte'
import { demoEquipe } from './equipe'
import { demoLitiges } from './litiges'
import { demoMessages } from './messages'
import { demoNotifications } from './notifications'
import { demoOffres } from './offres'
import { demoPaliers } from './paliers'
import { demoPlans } from './plans'
import { demoPublicite } from './publicite'
import { demoPreparation } from './preparation'
import { demoProduits } from './produits'
import { demoRemise } from './remise'
import { demoRetours } from './retours'
import { demoSession } from './session'
import { demoTrust } from './trust'
import { demoVersements } from './versements'
// Le pont commun des cinq interfaces (src/demo/pont.ts) : présence et journal partagés sur le même appareil.
import './pont'

export const sourceDemo: SourceVendeur = {
  session: demoSession,
  accueil: demoAccueil,
  commandes: demoCommandes,
  preparation: demoPreparation,
  remise: demoRemise,
  litiges: demoLitiges,
  retours: demoRetours,
  produits: demoProduits,
  offres: demoOffres,
  argent: demoArgent,
  versements: demoVersements,
  trust: demoTrust,
  paliers: demoPaliers,
  plans: demoPlans,
  boutique: demoBoutique,
  compte: demoCompte,
  equipe: demoEquipe,
  messages: demoMessages,
  notifications: demoNotifications,
  aide: demoAide,
  publicite: demoPublicite,
}
