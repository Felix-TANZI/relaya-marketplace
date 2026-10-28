// Registre des connecteurs de l'espace livreur : pour chaque méthode de la SourceLivreur (« domaine.methode »), la route
// du serveur qui la sert (/api/courier/…, kit backend-kit/apps/livreur_*) et son état. Une seule vérité, lue par
// backend-kit/outils/generer-openapi.mts (contrat openapi.yaml, étiquette « Espace livreur »), outils/connecteurs.mjs
// (tableau de CONNECTEURS-LIVREUR.md) et src/api/connecteurs.test.ts. Une entrée par domaine : src/api/routes/<domaine>.ts.
import { ROUTES_SESSION } from './routes/session'
import { ROUTES_ACCES } from './routes/acces'
import { ROUTES_AUJOURDHUI } from './routes/aujourdhui'
import { ROUTES_DISPONIBILITE } from './routes/disponibilite'
import { ROUTES_PAQUETS } from './routes/paquets'
import { ROUTES_KIT } from './routes/kit'
import { ROUTES_TOURNEE } from './routes/tournee'
import { ROUTES_RAMASSAGE } from './routes/ramassage'
import { ROUTES_REMISES } from './routes/remises'
import { ROUTES_INCIDENTS } from './routes/incidents'
import { ROUTES_HORSLIGNE } from './routes/horsligne'
import { ROUTES_JOURNEE } from './routes/journee'
import { ROUTES_HISTORIQUE } from './routes/historique'
import { ROUTES_ACTIVITE } from './routes/activite'
import { ROUTES_TRUST } from './routes/trust'
import { ROUTES_MESSAGES } from './routes/messages'
import { ROUTES_NOTIFICATIONS } from './routes/notifications'
import { ROUTES_MOI } from './routes/moi'
import { ROUTES_AIDE } from './routes/aide'
import type { Connecteur, MethodeLivreur } from './routes/types'

export type { Connecteur, EtatConnecteur, MethodeLivreur } from './routes/types'

export const CONNECTEURS_LIVREUR: Record<MethodeLivreur, Connecteur> = {
  ...ROUTES_SESSION,
  ...ROUTES_ACCES,
  ...ROUTES_AUJOURDHUI,
  ...ROUTES_DISPONIBILITE,
  ...ROUTES_PAQUETS,
  ...ROUTES_KIT,
  ...ROUTES_TOURNEE,
  ...ROUTES_RAMASSAGE,
  ...ROUTES_REMISES,
  ...ROUTES_INCIDENTS,
  ...ROUTES_HORSLIGNE,
  ...ROUTES_JOURNEE,
  ...ROUTES_HISTORIQUE,
  ...ROUTES_ACTIVITE,
  ...ROUTES_TRUST,
  ...ROUTES_MESSAGES,
  ...ROUTES_NOTIFICATIONS,
  ...ROUTES_MOI,
  ...ROUTES_AIDE,
}
