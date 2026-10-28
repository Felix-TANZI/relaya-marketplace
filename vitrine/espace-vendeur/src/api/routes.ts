// Registre des connecteurs de l'espace vendeur : pour chaque méthode de la SourceVendeur (« domaine.methode »), la route
// du serveur qui la sert (/api/vendors/…, kit backend-kit/apps/vendeur_*) et son état. Une seule vérité, lue par :
// - backend-kit/outils/generer-openapi.mts (contrat openapi.yaml, étiquette « Espace vendeur ») ;
// - outils/connecteurs.mjs (tableau de CONNECTEURS-VENDEUR.md) ;
// - tests/connecteurs.spec.ts (chaque méthode de la source a son connecteur).
// Une entrée par domaine, dans src/api/routes/<domaine>.ts.
import { ROUTES_ACCUEIL } from './routes/accueil'
import { ROUTES_AIDE } from './routes/aide'
import { ROUTES_ARGENT } from './routes/argent'
import { ROUTES_BOUTIQUE } from './routes/boutique'
import { ROUTES_COMMANDES } from './routes/commandes'
import { ROUTES_COMPTE } from './routes/compte'
import { ROUTES_EQUIPE } from './routes/equipe'
import { ROUTES_LITIGES } from './routes/litiges'
import { ROUTES_MESSAGES } from './routes/messages'
import { ROUTES_NOTIFICATIONS } from './routes/notifications'
import { ROUTES_OFFRES } from './routes/offres'
import { ROUTES_PALIERS } from './routes/paliers'
import { ROUTES_PLANS } from './routes/plans'
import { ROUTES_PUBLICITE } from './routes/publicite'
import { ROUTES_PREPARATION } from './routes/preparation'
import { ROUTES_PRODUITS } from './routes/produits'
import { ROUTES_REMISE } from './routes/remise'
import { ROUTES_RETOURS } from './routes/retours'
import { ROUTES_SESSION } from './routes/session'
import { ROUTES_TRUST } from './routes/trust'
import { ROUTES_VERSEMENTS } from './routes/versements'
import type { Connecteur, MethodeVendeur } from './routes/types'

export type { Connecteur, EtatConnecteur, MethodeVendeur } from './routes/types'
export { ROUTES_PAGES as CONNECTEURS_PAGES, TYPES_PAGES } from './routes/pages'

export const CONNECTEURS_VENDEUR: Record<MethodeVendeur, Connecteur> = {
  ...ROUTES_SESSION,
  ...ROUTES_ACCUEIL,
  ...ROUTES_COMMANDES,
  ...ROUTES_PREPARATION,
  ...ROUTES_REMISE,
  ...ROUTES_LITIGES,
  ...ROUTES_RETOURS,
  ...ROUTES_PRODUITS,
  ...ROUTES_OFFRES,
  ...ROUTES_ARGENT,
  ...ROUTES_VERSEMENTS,
  ...ROUTES_TRUST,
  ...ROUTES_PALIERS,
  ...ROUTES_PLANS,
  ...ROUTES_BOUTIQUE,
  ...ROUTES_COMPTE,
  ...ROUTES_EQUIPE,
  ...ROUTES_MESSAGES,
  ...ROUTES_NOTIFICATIONS,
  ...ROUTES_AIDE,
  ...ROUTES_PUBLICITE,
}
