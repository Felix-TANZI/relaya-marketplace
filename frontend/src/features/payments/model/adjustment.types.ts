// frontend/src/features/payments/model/adjustment.types.ts

export type AdjustmentDirection = 'CREDIT' | 'DEBIT';

export type AdjustmentStatus =
  | 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'APPLIED'
  | 'REJECTED' | 'CANCELLED';

/**
 * Penalite ou compensation.
 *
 * Le MOTIF est toujours expose : une retenue sans explication est
 * contractuellement indefendable, et c'est la premiere source de litige
 * avec un partenaire.
 */
export interface Adjustment {
  reference: string;
  direction: AdjustmentDirection;
  direction_label: string;
  category: string;
  category_label: string;
  amount_xaf: number;
  remaining_xaf: number;
  reason: string;
  status: AdjustmentStatus;
  created_at: string;
}

export type ParcelSize = 'SMALL' | 'STANDARD' | 'LARGE' | 'BULKY';

/**
 * Une ligne de la grille tarifaire d'un point relais — son contrat rendu
 * lisible. Un encombrant n'occupe pas la meme place qu'un petit colis.
 */
export interface RelayTariffLine {
  parcel_size: ParcelSize;
  parcel_size_label: string;
  amount_xaf: number;
  /** Faux si ce relais refuse cette categorie : un local exigu la refuse. */
  is_accepted: boolean;
  contract_reference: string;
  /** Vrai si le tarif vient d'un contrat propre, faux s'il vient du general. */
  is_negotiated: boolean;
}