// Connecteurs du domaine « litiges » (backend-kit/apps/console : formes_ventes.py ; décisions litige-client,
// litige-escalader, litige-complement).
import { c, type ConnecteursDe } from './types'

const D = 'Litiges'

export const ROUTES_LITIGES: ConnecteursDe<'litiges'> = {
  'litiges.liste': c(D, 'branche', 'GET /api/console/vues/litiges', '→ LitigeCourt[]', 'aftersales.Litige ; niveau 2 = recours du client ; litiges.contenu (pas la finance)'),
  'litiges.litige': c(D, 'branche', 'GET /api/console/vues/litiges/{id}', '→ LitigeDossier ; 404 → null', 'croisement des parties, proposition de la règle (vendeur qui accepte ou se tait), compléments demandés (poste) ; partager et transporteur : non permis (le catalogue du kit tranche rembourser, remplacer, débouter)'),
  'litiges.decider': c(D, 'branche', 'POST /api/console/decisions {action: litige-client, donnees: {litige, issue: rembourse|remplace|refuse}} (Idempotency-Key)', '→ {ok, etat, id} ; 202 au-delà de REMB-CONTROLE-SEUIL (quatre yeux) ; 409 state_changed → deja_decide', 'rembourser → rembourse, remplacer → remplace, debouter → refuse ; partager et transporteur → non_permise'),
  'litiges.escalader': c(D, 'branche', 'POST /api/console/decisions {action: litige-escalader, donnees: {litige}} (Idempotency-Key)', '→ {ok} ; 422 deja_niveau_2, deja_decide, lecture_seule', 'passe le litige en médiation (niveau 2) ; journalisé (dispute.escalated)'),
  'litiges.demanderComplement': c(D, 'branche', 'POST /api/console/decisions {action: litige-complement, donnees: {litige, partie}} (Idempotency-Key)', '→ {ok}', 'au client : le silence de LIT-CLIENT-SILENCE-J jours court depuis la demande (R70) ; la partie est prévenue'),
}
