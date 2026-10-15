// Domaine « Échanges entre clients » (DP-54) : proches, listes suivies, colis payés par l'un pour l'autre, panier
// payé pour un proche, et la boîte « Reçus ».
//
// Vérifié le 14 oct. contre backend/ réel (pas backend-kit, qui n'est qu'un prototype jamais installé dans
// backend/relaya/settings/base.py — seuls client_core/otp/client_accounts/notifications_client en sont tirés) :
// AUCUNE des 14 méthodes de ce domaine n'a de route réelle. Elles dépendent toutes d'apps backend-kit (wishlists,
// recus, extras) qui n'existent nulle part dans backend/ — ni le modèle, ni la table, ni la moindre route. Ce
// n'est pas un champ qui manque sur un écran existant : c'est un système entier (comptes « proches » trouvés par
// numéro, boîte de réception d'envois payés par un tiers, règle « qui paie la livraison / BelivaY ne perd jamais »
// refaite côté serveur) qui n'a jamais été construit.
//
// Décision produit requise avant toute construction : soit porter les apps backend-kit/apps/{wishlists,recus} vers
// backend/ (ce qui touche backend/relaya/settings/base.py, INSTALLED_APPS), soit abandonner la fonctionnalité pour
// le site, soit la redéfinir plus simplement. En attendant : aucune implémentation ici, chaque méthode lève
// NonDisponible (routes.ts : état 'serveur') — l'écran reste honnête (vide/désactivé) plutôt que d'appeler des
// routes qui n'existent pas en production.
import type { Source } from '../../donnees/source'
import type { ClientApi } from '../client'

export function domaineEchanges(_api: ClientApi) {
  return {} satisfies Partial<Source>
}
