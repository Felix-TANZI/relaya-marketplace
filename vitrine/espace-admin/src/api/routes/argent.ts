// Connecteurs du domaine « argent » (backend-kit/apps/console : formes_ventes.py, finances.py).
import { c, type ConnecteursDe } from './types'

const D = 'Argent'

export const ROUTES_ARGENT: ConnecteursDe<'argent'> = {
  'argent.escrow': c(D, 'branche', 'GET /api/console/vues/escrow', '→ VueEscrow', 'commandes payées (pickup.MontantsCommande), commissions figées (vendeur_core.CommandeVendeur), écritures du grand livre et soldes, versement ; l’argent ne bouge que par les règles (retrait, retour, litige, gel de fraude) : gestes manuels non offerts, raison écrite ; Opérations : ses zones'),
  'argent.wallet': c(D, 'partiel', 'GET /api/console/vues/wallet', '→ VueWallet', 'gel des retraits et gestes commerciaux du Wallet : prestataire de paiement (paiements hors du serveur sûr) ; finances.lire'),
  'argent.remboursements': c(D, 'partiel', 'GET /api/console/vues/remboursements', '→ VueRemboursements', 'décomposition livraison, retenues et frais rendus : registre du prestataire de paiement ; tentatives relevées chez l’opérateur ; vendeursEnControle []'),
  'argent.releverStatut': c(D, 'branche', 'POST /api/console/vues/remboursements/{id}/relever', '→ {ok, etat} ; 409 etat ; 404 inconnu', 'statut du remboursement chez l’opérateur (paiements.Remboursement, conclu par sa notification) ; Finance, Direction'),
  'argent.executer': c(D, 'branche', 'POST /api/console/decisions {action: litige-client, donnees: {litige, issue: rembourse}} (Idempotency-Key)', '→ {ok, etat: decide | a_contresigner}', 'motif écrit par le connecteur (« Remboursement exécuté depuis la console ») ; au-delà de REMB-CONTROLE-SEUIL : quatre yeux (202)'),
  'argent.versements': c(D, 'partiel', 'GET /api/console/vues/versements', '→ VueVersements', 'frais par lot (R43, payés par le bénéficiaire) ; plan d’apurement : geste de paiement (prestataire) ; livreurs payés par leur entreprise'),
  'argent.rapprochement': c(D, 'branche', 'GET /api/console/vues/rapprochement', '→ VueRapprochement', 'revenus (commissions figées, frais de livraison des commandes payées), rapprochements d’hier et du jour (finances.rapprocher), écarts, dernier relevé importé, clôture du mois précédent et ses exports (FIN-MIN-PERCEPTION), frais (PAY-CAMPAY-FRAIS), SMS du jour'),
  'argent.importerReleve': c(D, 'branche', 'POST /api/console/vues/rapprochement/releve {nom, contenu} (Idempotency-Key)', '→ {ok, lignes, ecarts} | vide, forme', 'relevé « reference;montant;statut » (entrées du jour) rapproché avec le registre ; journalisé'),
  'argent.ouvrirCarte': c(D, 'branche', 'POST /api/console/vues/cartes-finance {objet, texte} (Idempotency-Key)', '→ {ok, id} | deja', 'carte de la File d’action (file « cartes_finance »)'),
  'argent.transmettreComptable': c(D, 'branche', 'POST /api/console/vues/cloture/transmettre {mois} (Idempotency-Key)', '→ {ok} | deja', 'clôture du mois précédent, une fois ; journalisée'),
  'argent.commissions': c(D, 'partiel', 'GET /api/console/vues/commissions', '→ VueCommissions', 'commission et garde figées au paiement (vendeur_core.CommandeVendeur) ; frais de versement, remise du plan, essai et échec de paiement de l’abonnement du vendeur : prestataire de paiement (paiements hors du serveur sûr) ; relevés émis []'),
  'argent.grandLivre': c(D, 'branche', 'GET /api/console/finances/export?du=&au=&sortie=jsonl', '→ LigneExport[] (lignes JSON Lines après l’en-tête)', 'export.comptable ; journalisé (accounting.exported)'),
}
