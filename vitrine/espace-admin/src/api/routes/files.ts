// Connecteurs du domaine « files » (backend-kit/apps/console : files.py, files_admin.py, formes_direct.py).
import { c, type ConnecteursDe } from './types'

const D = 'File d’action'

export const ROUTES_FILES: ConnecteursDe<'files'> = {
  'files.file': c(D, 'branche', 'GET /api/console/vues/cartes', '→ CarteAction[] (élément de file du kit, famille et écran posés par le connecteur)', 'identifiant « file:id » ; montant des cartes d’argent (remboursements, versements) ; « Confiée à » (délégation)'),
  'files.indicateurs': c(D, 'branche', 'GET /api/console/vues/indicateurs', '→ IndicateursFile', 'coût des SMS par commande (sms_prix_unitaire) ; escrow du moment, valeur et revenus du jour : finances.lire'),
  'files.ouvrir': c(D, 'branche', 'POST /api/console/vues/cartes/{file:id}/ouvrir', '→ {ok, verrou} | {ok: false, raison: verrouillee}', 'verrou de ADM-VERROU-MIN minutes (15 par défaut), gardé dans le cache du serveur'),
  'files.liberer': c(D, 'branche', 'POST /api/console/vues/cartes/{file:id}/liberer', '→ {ok}'),
  'files.delegues': c(D, 'branche', 'GET /api/console/vues/delegues', '→ Delegue[]', 'agents actifs, autres que soi ; familles : files du kit que leur rôle voit (delegation.FAMILLE_DE_FILE)'),
  'files.deleguer': c(D, 'branche', 'POST /api/console/vues/cartes-deleguer {ids, agentId, motif} (Idempotency-Key)', '→ {ok, n} | {ok: false, raison: motif_court | inconnu}', 'seules les cartes de sa file que l’autre peut traiter ; « Confiée à » sur la carte ; journal carte.deleguee'),
}
