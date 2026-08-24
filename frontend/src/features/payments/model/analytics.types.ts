// frontend/src/features/payments/model/analytics.types.ts
// Pilotage financier — series et tendances.

export interface DailyCollection {
  date: string;
  collected_xaf: number;
  count: number;
  /** Sur la MEME echelle : un pic d'encaissement suivi d'un pic de
   *  remboursement n'est pas une bonne semaine. */
  refunded_xaf: number;
}

export interface DailyPayout {
  date: string;
  paid_xaf: number;
  count: number;
}

export interface PeriodTotals {
  collected_xaf: number;
  count: number;
  average_xaf: number;
}

export interface CollectionsSummary {
  period_days: number;
  current: PeriodTotals;
  previous: PeriodTotals;
  /** `null` quand la periode precedente etait a zero : une hausse depuis
   *  zero n'a pas de sens, et « +∞ % » n'informe personne. */
  change_percent: {
    collected: number | null;
    count: number | null;
  };
}

export interface ConversionFunnel {
  period_days: number;
  total: number;
  succeeded: number;
  failed: number;
  expired: number;
  pending: number;
  success_rate: number;
  /** Le prestataire a refuse : c'est un incident. */
  failure_rate: number;
  /** L'acheteur n'a pas compose son code : c'est un abandon. Les
   *  confondre masquerait une vraie panne. */
  abandon_rate: number;
  by_status: Record<string, number>;
}

export interface OperatorStats {
  operator: string;
  total: number;
  succeeded: number;
  amount_xaf: number;
  success_rate: number;
}

export interface TopPayee {
  payee_code: string;
  payee_type: string;
  display_label: string;
  total_xaf: number;
  count: number;
}

export interface RevenueBreakdown {
  period_days: number;
  revenue_total_xaf: number;
  psp_fees_collect_xaf: number;
  psp_fees_payout_xaf: number;
  psp_fees_total_xaf: number;
  /** Les frais prestataire sont une CHARGE de BelivaY, jamais une retenue
   *  sur le partenaire. */
  net_margin_xaf: number;
}

export interface AgingBucket {
  label: string;
  max_days: number | null;
  count: number;
  total_xaf: number;
}

export interface DisputeStats {
  period_days: number;
  disputes_opened: number;
  refunds_from_disputes: number;
  orders_with_escrow: number;
  dispute_rate: number;
}

export interface FinanceAnalytics {
  generated_at: string;
  period_days: number;
  summary: CollectionsSummary;
  collections: DailyCollection[];
  payouts: DailyPayout[];
  funnel: ConversionFunnel;
  failure_reasons: Array<{ error_code: string; count: number }>;
  operators: OperatorStats[];
  top_payees: TopPayee[];
  revenue: RevenueBreakdown;
  escrow_aging: AgingBucket[];
  disputes: DisputeStats;
}