// frontend/src/features/payments/api/wallet.api.ts
// Wallet du client — feuille de route D16, spec v2.1 R03.
//
// Ferme tant que r_wallet_ouvert = 0 : chaque action repond 403
// { code: "wallet_ferme" } ; `GET me/wallet/` dit seulement `ouvert: false`.
// Les montants, frais et plafonds viennent du serveur, jamais d'ici.

import { api } from '@/services/api/client';

const BASE = '/api/payments/v2';

export interface WalletMouvement {
  id: string;
  sorte: 'RECHARGE' | 'PAIEMENT' | 'REMBOURSEMENT' | 'GESTE' | 'RETRAIT' | 'RETRAIT_ANNULE';
  libelle: string;
  montant_xaf: number;
  part_geste_xaf: number;
  frais_xaf: number;
  intent: string;
  le: string;
  client?: string;
}

export interface MonWallet {
  ouvert: boolean;
  solde_xaf: number;
  /** Rechargé ou remboursé : peut repartir vers le numéro qui a rechargé (R03.4). */
  retirable_xaf: number;
  /** Gestes commerciaux : servent seulement à acheter (R03.6). */
  geste_xaf: number;
  code_defini: boolean;
  /** Trop de codes faux : bloqué jusqu'à cette date (réinitialisable par SMS). */
  code_bloque_jusqua: string | null;
  plafond_xaf: number;
  code_des_xaf: number;
  retrait_min_xaf: number;
  mouvements: WalletMouvement[];
}

export interface DevisRetrait {
  montant: number;
  frais: number;
  recu: number;
  retirable: number;
  minimum: number;
  numeros: string[];
}

export interface WalletGeste {
  id: number;
  client: string;
  /** R25.1 : commande du geste, dont il ne dépasse jamais la commission. */
  commande: number | null;
  montant_xaf: number;
  motif: string;
  statut: 'EN_ATTENTE' | 'CREDITE' | 'REFUSE';
  demande_par: string;
  decide_par: string | null;
  le: string;
}

export interface SuiviWallet {
  ouvert: boolean;
  wallets: number;
  retirable_xaf: number;
  geste_xaf: number;
  retraits_inconnus_xaf: number;
  grand_livre_2050_xaf: number;
  /** Doit rester à 0 : grand livre = somme des Wallets + retraits à issue inconnue. */
  ecart_xaf: number;
  gestes_en_attente: number;
  mouvements: WalletMouvement[];
  gestes: WalletGeste[];
}

export const walletApi = {
  moi: () => api.get<MonWallet>(`${BASE}/me/wallet/`),
  recharger: (montant_xaf: number, payer_msisdn: string, payer_operator: string, cle: string) =>
    api.post<{ reference: string; status: string; message: string }>(
      `${BASE}/me/wallet/topups/`, { montant_xaf, payer_msisdn, payer_operator, cle }),
  definirCode: (code: string, ancien = '') => api.post(`${BASE}/me/wallet/code/`, { code, ancien }),
  /** Code oublié ou bloqué : un code part par SMS au numéro vérifié du compte. */
  codeOublie: () => api.post(`${BASE}/me/wallet/code/oublie/`, {}),
  reinitialiserCode: (code_sms: string, code: string) =>
    api.post(`${BASE}/me/wallet/code/reinitialiser/`, { code_sms, code }),
  devisRetrait: (montant_xaf: number) =>
    api.get<DevisRetrait>(`${BASE}/me/wallet/withdrawal-quote/`, { params: { montant_xaf } }),
  retirer: (montant_xaf: number, numero: string, cle: string) =>
    api.post<WalletMouvement>(`${BASE}/me/wallet/withdrawals/`, { montant_xaf, numero, cle }),
  payerCommande: (reference: string, code = '') =>
    api.post<{ reference: string; status: string }>(`${BASE}/me/payments/${reference}/pay-with-wallet/`, { code }),

  // ── Administration (habilitation finance) ──────────────────────────────
  suivi: () => api.get<SuiviWallet>(`${BASE}/admin/wallet/`),
  demanderGeste: (client_id: number, order_id: number, montant_xaf: number, motif: string) =>
    api.post<WalletGeste>(`${BASE}/admin/wallet/gestes/`, { client_id, order_id, montant_xaf, motif }),
  deciderGeste: (id: number, accepte: boolean) =>
    api.post<WalletGeste>(`${BASE}/admin/wallet/gestes/${id}/decision/`, { accepte }),
};
