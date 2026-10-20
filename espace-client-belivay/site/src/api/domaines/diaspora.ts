// Domaine « Diaspora et proches » (DP-54) : inscription (deux codes), liens famille (code, invitation, réponse,
// livraison du proche), commander pour un proche (carte, contrôle de cohérence), demandes de panier, proche actif
// (« Pour qui ? »), devise d'affichage.
//
// NON DISPONIBLE EN PRODUCTION — décision produit requise avant de construire quoi que ce soit ici. CONNECTEURS.md
// (3 oct. 2026) annonçait « 19/20 branché », ce qui est trompeur : « branché » n'y signifie que « le site appelle une
// route réelle », pas « la route existe côté relaya-marketplace ». Vérifié contre `backend/apps/` aujourd'hui :
// - `backend-kit/apps/diaspora` (famille du kit qui porte TOUT ce domaine : inscription, family-links, proche actif,
//   commander pour un proche) N'EST PAS dans `backend/apps/` ni dans `INSTALLED_APPS`. Il n'y a tout simplement pas
//   de modèle de compte diaspora, de lien famille ou de commande pour un proche côté serveur.
// - `apps/client_accounts/ProfilClient.type_compte` a bien un choix `DIASPORA`, mais rien dans le code aujourd'hui ne
//   le met à cette valeur (seule `apps.diaspora.inscrireDiaspora`, absente, le ferait) : PATCH /api/me/preferences
//   (reglerDevise) existe réellement (apps.client_accounts.Preferences, installée) mais répondra TOUJOURS
//   403 « hors compte diaspora » tant qu'aucun compte diaspora ne peut naître.
// - Les DEUX seules routes qui répondent vraiment aujourd'hui sont génériques et déjà utilisées ailleurs :
//   POST /api/auth/otp/send {purpose: diaspora} et POST /api/auth/otp/verify {purpose: diaspora} (apps.otp, installée,
//   ne dépend pas de apps.diaspora). Elles peuvent envoyer/vérifier un code, mais ne mènent nulle part : la route
//   d'inscription qui les suit (POST /api/auth/diaspora/register) n'existe pas. Les garder « branchées » seules
//   serait une fonctionnalité inutile (obtenir un code qu'on ne peut jamais utiliser) ; elles sont donc aussi
//   retirées d'ici par cohérence produit.
// - BUG LATENT REPÉRÉ (hors du périmètre de ce fichier, à signaler à l'équipe backend) : `apps/otp/views.py`,
//   purpose=« diaspora-renforce », importe `from apps.diaspora.services import compte as compte_diaspora` ; comme
//   `apps.diaspora` n'est pas installée, tout appel authentifié avec ce purpose lève une ImportError (500) au lieu
//   d'un refus propre.
// Toutes les méthodes sont donc volontairement absentes d'ici : `source-api.ts` les fait lever NonDisponible (voir
// src/api/routes.ts, état « serveur »), l'écran le sait et dit quoi créer plutôt que d'appeler une route qui
// n'existera jamais tant que la décision produit n'est pas prise.
import type { ClientApi } from '../client'

export function domaineDiaspora(_api: ClientApi) {
  return {}
}
