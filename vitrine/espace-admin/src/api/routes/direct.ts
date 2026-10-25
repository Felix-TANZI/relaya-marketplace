// Connecteurs du domaine « direct » (backend-kit/apps/console : formes_direct.py).
import { c, type ConnecteursDe } from './types'

const D = 'Vue d’ensemble'

export const ROUTES_DIRECT: ConnecteursDe<'direct'> = {
  'direct.vue': c(D, 'branche', 'GET /api/console/vues/direct', '→ VueDirecte', 'montant payé et escrow du moment : finances.lire seulement (ADM-ROL-04) ; zones[].commandes = colis du jour par zone de ramassage ; santé : superviseur, audit, opérations'),
  'direct.chercher': c(D, 'branche', 'GET /api/console/vues/recherche?q=', '→ ResultatRecherche[]', 'commande (BLV-…), litige (LIT-…), paquet, étiquette, vendeur, relais, entreprise, livreur ; dans le périmètre de l’agent ; client, KYC, ticket : pas de recherche au kit'),
}
