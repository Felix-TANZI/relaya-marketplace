// Registre des connecteurs de la console : pour chaque méthode de la SourceAdmin (« domaine.methode »), la route du kit
// (/api/console/…, backend-kit/apps/console) qui la sert et son état. Une seule vérité, lue par src/api/refus.ts (refus
// propres), src/api/connecteurs.test.ts (chaque route existe dans routes-console.json) et CONNECTEURS-ADMIN.md. Une
// entrée par domaine : src/api/routes/<domaine>.ts.
import { ROUTES_ACTEURS } from './routes/acteurs'
import { ROUTES_ARGENT } from './routes/argent'
import { ROUTES_CATALOGUE } from './routes/catalogue'
import { ROUTES_COMMANDES } from './routes/commandes'
import { ROUTES_COMMUNICATION } from './routes/communication'
import { ROUTES_DECISIONS } from './routes/decisions'
import { ROUTES_DIRECT } from './routes/direct'
import { ROUTES_EQUIPE } from './routes/equipe'
import { ROUTES_FILES } from './routes/files'
import { ROUTES_GOUVERNANCE } from './routes/gouvernance'
import { ROUTES_LITIGES } from './routes/litiges'
import { ROUTES_LOGISTIQUE } from './routes/logistique'
import { ROUTES_PILOTAGE } from './routes/pilotage'
import { ROUTES_QUATREYEUX } from './routes/quatreyeux'
import { ROUTES_SESSION } from './routes/session'
import { ROUTES_SYSTEME } from './routes/systeme'
import type { Connecteur, MethodeAdmin } from './routes/types'

export type { Connecteur, EtatConnecteur, MethodeAdmin } from './routes/types'

export const CONNECTEURS_ADMIN: Record<MethodeAdmin, Connecteur> = {
  ...ROUTES_SESSION,
  ...ROUTES_DIRECT,
  ...ROUTES_FILES,
  ...ROUTES_QUATREYEUX,
  ...ROUTES_LITIGES,
  ...ROUTES_COMMANDES,
  ...ROUTES_ARGENT,
  ...ROUTES_ACTEURS,
  ...ROUTES_CATALOGUE,
  ...ROUTES_LOGISTIQUE,
  ...ROUTES_PILOTAGE,
  ...ROUTES_COMMUNICATION,
  ...ROUTES_GOUVERNANCE,
  ...ROUTES_SYSTEME,
  ...ROUTES_EQUIPE,
  ...ROUTES_DECISIONS,
}
