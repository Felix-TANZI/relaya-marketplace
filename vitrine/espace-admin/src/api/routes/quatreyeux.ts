// Connecteurs du domaine « quatreyeux » (backend-kit/apps/console : decisions.py, decisions_admin.py, formes_console.py).
import { c, type ConnecteursDe } from './types'

const D = 'Quatre yeux'

export const ROUTES_QUATREYEUX: ConnecteursDe<'quatreyeux'> = {
  'quatreyeux.decider': c(
    D,
    'partiel',
    'POST /api/console/decisions {action, donnees, motif, preuves} (Idempotency-Key)',
    '→ 201 appliquée | 202 à contre-signer ; 400 motif_requis ; 409 state_changed ; 422 code de la règle',
    'gestes de l’appli traduits en actions du catalogue (src/api/domaines/quatreyeux.ts, GESTES) : relais, entreprises, livreurs (suspendre, activer, rétablir), départs, kits, paquets (élargir, priorité, prévenir), versements (contrôle, exception), remboursement, candidatures, journal, fraude, zones (placer, plan, saison), emballages (commander, facturer, justifier), étiquettes (attribuer, invalider). Restent sans action au kit : escrow.* (aucun geste manuel sur l’escrow : la règle libère seule), wallet.geler, remboursement.autre_numero, versement.plan_apurement, registre.regularisation (prestataire de paiement, hors du serveur sûr) ; relais.basculer, attendre, transferer, relancer, apurement, fin_convention (chantier du relais, branche l/relais) ; identifiant.accepter et refuser (aucune demande n’attend la console au kit) : NonBranche',
  ),
  'quatreyeux.enAttente': c(D, 'branche', 'GET /api/console/vues/quatre-yeux?vue=attente', '→ DecisionQuatreYeux[]', 'celles de l’agent, celles qu’il peut contre-signer, celles dont il tient la permission'),
  'quatreyeux.historique': c(D, 'branche', 'GET /api/console/vues/quatre-yeux?vue=historique', '→ DecisionQuatreYeux[]', '100 dernières ; une décision échue ou en échec est « refusee » (statut du kit dans « statut »)'),
  'quatreyeux.contresigner': c(D, 'branche', 'POST /api/console/decisions/{id}/contresigner {accord: true, motif} (Idempotency-Key)', '→ {ok, etat} ; 422 meme_personne → meme_compte ; 422 role_insuffisant → role_non_permis ; 409 state_changed → deja_traitee'),
  'quatreyeux.refuser': c(D, 'branche', 'POST /api/console/decisions/{id}/contresigner {accord: false, motif} (Idempotency-Key)', '→ {ok, etat: refusee}'),
}
