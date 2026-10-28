// Registre des connecteurs de l'espace entreprise : pour chaque méthode de la SourceEntreprise (« domaine.methode »), la
// route du serveur qui la sert (/api/company/…, kit backend-kit/apps/entreprise_*) et son état. Une seule vérité, lue par
// backend-kit/outils/generer-openapi.mts (contrat openapi.yaml, étiquette « Espace entreprise »), outils/connecteurs.mjs
// (tableau de CONNECTEURS-ENTREPRISE.md) et src/api/connecteurs.test.ts. Une entrée par domaine : src/api/routes/<domaine>.ts.
import { ROUTES_SESSION } from './routes/session'
import { ROUTES_COMPTE } from './routes/compte'
import { ROUTES_TABLEAU } from './routes/tableau'
import { ROUTES_CONTRAT } from './routes/contrat'
import { ROUTES_ZONES } from './routes/zones'
import { ROUTES_FLOTTE } from './routes/flotte'
import { ROUTES_LIVREURS } from './routes/livreurs'
import { ROUTES_EQUIPE } from './routes/equipe'
import { ROUTES_VEHICULES } from './routes/vehicules'
import { ROUTES_PRIX } from './routes/prix'
import { ROUTES_PAQUETS } from './routes/paquets'
import { ROUTES_AFFECTATION } from './routes/affectation'
import { ROUTES_MISSIONS } from './routes/missions'
import { ROUTES_CARTE } from './routes/carte'
import { ROUTES_INCIDENTS } from './routes/incidents'
import { ROUTES_COLIS } from './routes/colis'
import { ROUTES_PREUVES } from './routes/preuves'
import { ROUTES_LITIGES } from './routes/litiges'
import { ROUTES_REGLEMENTS } from './routes/reglements'
import { ROUTES_RELEVES } from './routes/releves'
import { ROUTES_SCORE } from './routes/score'
import { ROUTES_EMBALLAGES } from './routes/emballages'
import { ROUTES_MESSAGES } from './routes/messages'
import { ROUTES_NOTIFICATIONS } from './routes/notifications'
import { ROUTES_PARAMETRES } from './routes/parametres'
import { ROUTES_RAPPORTS } from './routes/rapports'
import { ROUTES_INTEGRATIONS } from './routes/integrations'
import type { Connecteur, MethodeEntreprise } from './routes/types'

export type { Connecteur, EtatConnecteur, MethodeEntreprise } from './routes/types'

export const CONNECTEURS_ENTREPRISE: Record<MethodeEntreprise, Connecteur> = {
  ...ROUTES_SESSION,
  ...ROUTES_COMPTE,
  ...ROUTES_TABLEAU,
  ...ROUTES_CONTRAT,
  ...ROUTES_ZONES,
  ...ROUTES_FLOTTE,
  ...ROUTES_LIVREURS,
  ...ROUTES_EQUIPE,
  ...ROUTES_VEHICULES,
  ...ROUTES_PRIX,
  ...ROUTES_PAQUETS,
  ...ROUTES_AFFECTATION,
  ...ROUTES_MISSIONS,
  ...ROUTES_CARTE,
  ...ROUTES_INCIDENTS,
  ...ROUTES_COLIS,
  ...ROUTES_PREUVES,
  ...ROUTES_LITIGES,
  ...ROUTES_REGLEMENTS,
  ...ROUTES_RELEVES,
  ...ROUTES_SCORE,
  ...ROUTES_EMBALLAGES,
  ...ROUTES_MESSAGES,
  ...ROUTES_NOTIFICATIONS,
  ...ROUTES_PARAMETRES,
  ...ROUTES_RAPPORTS,
  ...ROUTES_INTEGRATIONS,
}
