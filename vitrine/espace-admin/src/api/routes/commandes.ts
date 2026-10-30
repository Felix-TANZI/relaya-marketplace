// Connecteurs du domaine « commandes » (backend-kit/apps/console : formes_ventes.py).
import { c, type ConnecteursDe } from './types'

const D = 'Commandes'

export const ROUTES_COMMANDES: ConnecteursDe<'commandes'> = {
  'commandes.liste': c(D, 'branche', 'GET /api/console/vues/commandes', '→ CommandeCourte[]', 'pickup.MontantsCommande (montants figés), sous-commandes, colis, litige ; 300 dernières ; zones de l’agent'),
  'commandes.commande': c(D, 'branche', 'GET /api/console/vues/commandes/{ref}', '→ CommandeFiche ; 404 → null', 'argentDetail : finances.lire ; part du relais (RELAIS-GAIN-COLIS) et du transporteur (paquets) ; messages au client ; palier IFA ; annulable (commande-annuler)'),
  'commandes.demasquer': c(D, 'branche', 'POST /api/console/vues/demasquer {genre: commande, id, champ, motif}', '→ {ok, valeur} ; 400 motif_requis → motif_court', 'journalisé (pii.unmasked) ; donnees.demasquer'),
  'commandes.annuler': c(D, 'branche', 'POST /api/console/decisions {action: commande-annuler, donnees: {commande}} (Idempotency-Key)', '→ {ok, etat, id} ; 409 state_changed → non_annulable (un colis déjà collecté) ; 400 motif_court', 'pickup.services.annuler_commande (CAN-09) : remboursement décidé et enregistré, jamais exécuté par le kit ; au-delà de REMB-CONTROLE-SEUIL : quatre yeux (Finance ou Direction) ; frais de service selon CET-24 (part acquise, comme une annulation avant collecte)'),
}
