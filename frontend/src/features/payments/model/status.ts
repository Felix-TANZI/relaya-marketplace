// frontend/src/features/payments/model/status.ts
// La semantique des etats, au meme endroit.
//
// ─────────────────────────────────────────────────────────────────────────
// UN STATUT N'EST PAS QU'UNE COULEUR
//
// `UNKNOWN` sur un versement ne veut pas dire « erreur » : il veut dire
// « on ignore si l'argent est parti, ne jamais retenter ».
//
// Sans ce fichier, deux ecrans traduiraient le meme etat differemment — et
// c'est exactement le genre d'incoherence qui fait perdre confiance dans une
// interface financiere.
//
// L'API renvoie deja ces phrases dans son champ `guidance`. Ce fichier sert
// de REPLI quand elles ne sont pas fournies, jamais de source concurrente.
// ─────────────────────────────────────────────────────────────────────────

import type { TFunction } from 'i18next';

export type ToneKey =
  | 'success' | 'progress' | 'waiting' | 'danger' | 'neutral' | 'held';

/** Une teinte, deux modes. Seul le point est colore — jamais le texte. */
export const TONE: Record<ToneKey, { dot: string; text: string }> = {
  success:  { dot: '#1D9E75', text: '#0F6E56' },
  progress: { dot: '#F0997B', text: '#993C1D' },
  waiting:  { dot: '#EF9F27', text: '#854F0B' },
  danger:   { dot: '#E24B4A', text: '#A32D2D' },
  held:     { dot: '#85B7EB', text: '#185FA5' },
  neutral:  { dot: '#B4B2A9', text: '#5F5E5A' },
};

export interface StatusMeta {
  label: string;
  tone: ToneKey;
  meaning: string;
  action?: string;
}

interface StatusMetaKeys {
  labelKey: string;
  tone: ToneKey;
  meaningKey: string;
  actionKey?: string;
}

const PAYOUT_STATUS_KEYS: Record<string, StatusMetaKeys> = {
  DRAFT: { labelKey: 'cl7_payment_status.payout_draft_label', tone: 'neutral', meaningKey: 'cl7_payment_status.payout_draft_meaning' },
  PENDING_APPROVAL: {
    labelKey: 'cl7_payment_status.payout_pending_approval_label', tone: 'waiting',
    meaningKey: 'cl7_payment_status.payout_pending_approval_meaning',
    actionKey: 'cl7_payment_status.payout_pending_approval_action',
  },
  APPROVED: {
    labelKey: 'cl7_payment_status.payout_approved_label', tone: 'progress',
    meaningKey: 'cl7_payment_status.payout_approved_meaning',
  },
  PROCESSING: {
    labelKey: 'cl7_payment_status.payout_processing_label', tone: 'progress',
    meaningKey: 'cl7_payment_status.payout_processing_meaning',
  },
  PAID: { labelKey: 'cl7_payment_status.payout_paid_label', tone: 'success', meaningKey: 'cl7_payment_status.payout_paid_meaning' },
  FAILED: {
    labelKey: 'cl7_payment_status.payout_failed_label', tone: 'danger',
    meaningKey: 'cl7_payment_status.payout_failed_meaning',
    actionKey: 'cl7_payment_status.payout_failed_action',
  },
  UNKNOWN: {
    labelKey: 'cl7_payment_status.payout_unknown_label', tone: 'danger',
    meaningKey: 'cl7_payment_status.payout_unknown_meaning',
    actionKey: 'cl7_payment_status.payout_unknown_action',
  },
  REJECTED: { labelKey: 'cl7_payment_status.payout_rejected_label', tone: 'neutral', meaningKey: 'cl7_payment_status.payout_rejected_meaning' },
  CANCELLED: { labelKey: 'cl7_payment_status.payout_cancelled_label', tone: 'neutral', meaningKey: 'cl7_payment_status.payout_cancelled_meaning' },
  REVERSED: { labelKey: 'cl7_payment_status.payout_reversed_label', tone: 'neutral', meaningKey: 'cl7_payment_status.payout_reversed_meaning' },
};

const ESCROW_STATUS_KEYS: Record<string, StatusMetaKeys> = {
  PENDING: { labelKey: 'cl7_payment_status.escrow_pending_label', tone: 'neutral', meaningKey: 'cl7_payment_status.escrow_pending_meaning' },
  HELD: {
    labelKey: 'cl7_payment_status.escrow_held_label', tone: 'held',
    meaningKey: 'cl7_payment_status.escrow_held_meaning',
  },
  RELEASE_SCHEDULED: {
    labelKey: 'cl7_payment_status.escrow_release_scheduled_label', tone: 'progress',
    meaningKey: 'cl7_payment_status.escrow_release_scheduled_meaning',
  },
  RELEASED: {
    labelKey: 'cl7_payment_status.escrow_released_label', tone: 'success',
    meaningKey: 'cl7_payment_status.escrow_released_meaning',
  },
  FROZEN: {
    labelKey: 'cl7_payment_status.escrow_frozen_label', tone: 'danger',
    meaningKey: 'cl7_payment_status.escrow_frozen_meaning',
    actionKey: 'cl7_payment_status.escrow_frozen_action',
  },
  REFUNDED: {
    labelKey: 'cl7_payment_status.escrow_refunded_label', tone: 'neutral',
    meaningKey: 'cl7_payment_status.escrow_refunded_meaning',
  },
  PARTIALLY_REFUNDED: {
    labelKey: 'cl7_payment_status.escrow_partially_refunded_label', tone: 'progress',
    meaningKey: 'cl7_payment_status.escrow_partially_refunded_meaning',
  },
  CANCELLED: { labelKey: 'cl7_payment_status.escrow_cancelled_label', tone: 'neutral', meaningKey: 'cl7_payment_status.escrow_cancelled_meaning' },
};

const REFUND_STATUS_KEYS: Record<string, StatusMetaKeys> = {
  PENDING_APPROVAL: {
    labelKey: 'cl7_payment_status.refund_pending_approval_label', tone: 'waiting',
    meaningKey: 'cl7_payment_status.refund_pending_approval_meaning',
    actionKey: 'cl7_payment_status.refund_pending_approval_action',
  },
  APPROVED: { labelKey: 'cl7_payment_status.refund_approved_label', tone: 'progress', meaningKey: 'cl7_payment_status.refund_approved_meaning' },
  PROCESSING: { labelKey: 'cl7_payment_status.refund_processing_label', tone: 'progress', meaningKey: 'cl7_payment_status.refund_processing_meaning' },
  PAID: {
    labelKey: 'cl7_payment_status.refund_paid_label', tone: 'success',
    meaningKey: 'cl7_payment_status.refund_paid_meaning',
  },
  FAILED: {
    labelKey: 'cl7_payment_status.refund_failed_label', tone: 'danger',
    meaningKey: 'cl7_payment_status.refund_failed_meaning',
    actionKey: 'cl7_payment_status.refund_failed_action',
  },
  UNKNOWN: {
    labelKey: 'cl7_payment_status.refund_unknown_label', tone: 'danger',
    meaningKey: 'cl7_payment_status.refund_unknown_meaning',
    actionKey: 'cl7_payment_status.refund_unknown_action',
  },
  REJECTED: {
    labelKey: 'cl7_payment_status.refund_rejected_label', tone: 'neutral',
    meaningKey: 'cl7_payment_status.refund_rejected_meaning',
  },
};

const SETTLEMENT_STATUS_KEYS: Record<string, StatusMetaKeys> = {
  DRAFT: { labelKey: 'cl7_payment_status.settlement_draft_label', tone: 'neutral', meaningKey: 'cl7_payment_status.settlement_draft_meaning' },
  CONFIRMED: { labelKey: 'cl7_payment_status.settlement_confirmed_label', tone: 'progress', meaningKey: 'cl7_payment_status.settlement_confirmed_meaning' },
  PAYOUT_REQUESTED: {
    labelKey: 'cl7_payment_status.settlement_payout_requested_label', tone: 'waiting',
    meaningKey: 'cl7_payment_status.settlement_payout_requested_meaning',
  },
  PAID: { labelKey: 'cl7_payment_status.settlement_paid_label', tone: 'success', meaningKey: 'cl7_payment_status.settlement_paid_meaning' },
  FAILED: { labelKey: 'cl7_payment_status.settlement_failed_label', tone: 'danger', meaningKey: 'cl7_payment_status.settlement_failed_meaning' },
  CANCELLED: { labelKey: 'cl7_payment_status.settlement_cancelled_label', tone: 'neutral', meaningKey: 'cl7_payment_status.settlement_cancelled_meaning' },
};

const TABLES: Record<string, Record<string, StatusMetaKeys>> = {
  payout: PAYOUT_STATUS_KEYS,
  escrow: ESCROW_STATUS_KEYS,
  refund: REFUND_STATUS_KEYS,
  settlement: SETTLEMENT_STATUS_KEYS,
};

export type StatusDomain = keyof typeof TABLES;

export function statusMeta(domain: StatusDomain, status: string, t: TFunction): StatusMeta {
  const entry = TABLES[domain]?.[status];
  if (!entry) {
    return { label: '—', tone: 'neutral', meaning: '' };
  }
  return {
    label: t(entry.labelKey),
    tone: entry.tone,
    meaning: t(entry.meaningKey),
    action: entry.actionKey ? t(entry.actionKey) : undefined,
  };
}

/** Gravite d'un signal -> teinte. */
export const SEVERITY_TONE: Record<string, ToneKey> = {
  CRITIQUE: 'danger',
  ALERTE: 'danger',
  ATTENTION: 'waiting',
  NORMAL: 'success',
};
