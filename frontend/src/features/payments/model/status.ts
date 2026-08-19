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

export const PAYOUT_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral', meaning: 'Pas encore soumis.' },
  PENDING_APPROVAL: {
    label: "En attente d'approbation", tone: 'waiting',
    meaning: 'Un tiers doit valider ce versement.',
    action: 'Le demandeur ne peut pas approuver sa propre demande.',
  },
  APPROVED: {
    label: 'Approuvé', tone: 'progress',
    meaning: "L'argent partira au prochain passage de l'ordonnanceur.",
  },
  PROCESSING: {
    label: 'En cours', tone: 'progress',
    meaning: 'Émission en cours auprès du prestataire.',
  },
  PAID: { label: 'Versé', tone: 'success', meaning: "L'argent est parti." },
  FAILED: {
    label: 'Refusé', tone: 'danger',
    meaning: 'Le prestataire a refusé ce versement.',
    action: 'Vérifier le motif, puis créer une NOUVELLE demande.',
  },
  UNKNOWN: {
    label: 'Issue inconnue', tone: 'danger',
    meaning: "On ignore si l'argent est parti.",
    action: 'NE JAMAIS RETENTER. Seule la réconciliation tranche.',
  },
  REJECTED: { label: 'Rejeté', tone: 'neutral', meaning: 'Demande refusée.' },
  CANCELLED: { label: 'Annulé', tone: 'neutral', meaning: 'Demande annulée.' },
  REVERSED: { label: 'Contre-passé', tone: 'neutral', meaning: 'Écriture inversée.' },
};

export const ESCROW_STATUS: Record<string, StatusMeta> = {
  PENDING: { label: 'En attente', tone: 'neutral', meaning: 'Paiement non confirmé.' },
  HELD: {
    label: 'Sous séquestre', tone: 'held',
    meaning: 'Fonds conservés par BelivaY. La commande est vivante.',
  },
  RELEASE_SCHEDULED: {
    label: 'Libération programmée', tone: 'progress',
    meaning: 'Les fonds seront libérés à échéance.',
  },
  RELEASED: {
    label: 'Libéré', tone: 'success',
    meaning: 'La dette est devenue exigible.',
  },
  FROZEN: {
    label: 'Gelé', tone: 'danger',
    meaning: 'Un litige bloque ces fonds.',
    action: 'Seul CE séquestre est gelé — les autres du même paiement ne le sont pas.',
  },
  REFUNDED: {
    label: 'Remboursé', tone: 'neutral',
    meaning: "Cet argent n'ira jamais au partenaire.",
  },
  PARTIALLY_REFUNDED: {
    label: 'Partiellement remboursé', tone: 'progress',
    meaning: 'Une partie a été rendue à l’acheteur.',
  },
  CANCELLED: { label: 'Annulé', tone: 'neutral', meaning: 'Séquestre annulé.' },
};

export const REFUND_STATUS: Record<string, StatusMeta> = {
  PENDING_APPROVAL: {
    label: "En attente d'approbation", tone: 'waiting',
    meaning: 'Un tiers doit valider ce remboursement.',
    action: "Sans cette barrière, ouvrir un litige et le faire trancher suffirait à encaisser.",
  },
  APPROVED: { label: 'Approuvé', tone: 'progress', meaning: 'Le virement part sous peu.' },
  PROCESSING: { label: 'En cours', tone: 'progress', meaning: 'Virement en cours.' },
  PAID: {
    label: 'Remboursé', tone: 'success',
    meaning: "L'argent est retourné sur le numéro qui avait payé.",
  },
  FAILED: {
    label: 'Refusé', tone: 'danger',
    meaning: "Le virement n'a pas abouti.",
    action: 'Créer une NOUVELLE demande.',
  },
  UNKNOWN: {
    label: 'Issue inconnue', tone: 'danger',
    meaning: "On ignore si l'argent est parti.",
    action: 'NE JAMAIS RETENTER.',
  },
  REJECTED: {
    label: 'Rejeté', tone: 'neutral',
    meaning: 'Le séquestre reste gelé : le litige n’est pas tranché pour autant.',
  },
};

export const SETTLEMENT_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral', meaning: 'Lot en préparation.' },
  CONFIRMED: { label: 'Confirmé', tone: 'progress', meaning: 'Montants figés.' },
  PAYOUT_REQUESTED: {
    label: 'Versement demandé', tone: 'waiting',
    meaning: 'En attente de validation.',
  },
  PAID: { label: 'Versé', tone: 'success', meaning: 'Règlement effectué.' },
  FAILED: { label: 'Échoué', tone: 'danger', meaning: 'Le versement a échoué.' },
  CANCELLED: { label: 'Annulé', tone: 'neutral', meaning: 'Lot annulé.' },
};

const TABLES: Record<string, Record<string, StatusMeta>> = {
  payout: PAYOUT_STATUS,
  escrow: ESCROW_STATUS,
  refund: REFUND_STATUS,
  settlement: SETTLEMENT_STATUS,
};

export type StatusDomain = keyof typeof TABLES;

const INCONNU: StatusMeta = { label: '—', tone: 'neutral', meaning: '' };

export function statusMeta(domain: StatusDomain, status: string): StatusMeta {
  return TABLES[domain]?.[status] ?? INCONNU;
}

/** Gravite d'un signal -> teinte. */
export const SEVERITY_TONE: Record<string, ToneKey> = {
  CRITIQUE: 'danger',
  ALERTE: 'danger',
  ATTENTION: 'waiting',
  NORMAL: 'success',
};