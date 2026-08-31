// frontend/src/features/payments/hooks/useFinanceAdmin.ts
// Lectures de l'administration financiere.

import { adminFinanceApi } from '../api/admin-finance.api';
import type { ListParams } from '../api/admin-finance.api';
import type {
  AdminAdjustmentRow, AdminDiscrepancyRow, AdminEscrowDetail, AdminEscrowRow,
  AdminIntentDetail, AdminIntentRow, AdminPayoutDetail, AdminPayoutRow,
  AdminRefundRow, Paginated, TaskHealthEntry,
} from '../model/finance.types';
import type { FinanceAnalytics } from '../model/analytics.types';
import type { SettlementBatch } from '../model/settlement.types';
import { useAsync } from './useAsync';

/**
 * Serialise les filtres en cle stable.
 *
 * Sans ça, un objet recree a chaque rendu relancerait la requete en boucle.
 */
function cle(params: ListParams): string {
  return JSON.stringify(params);
}

export function useAnalytics(days = 30) {
  return useAsync<FinanceAnalytics>(
    () => adminFinanceApi.analytics({ days }), [days],
  );
}

export function useAdminIntents(params: ListParams = {}) {
  return useAsync<Paginated<AdminIntentRow>>(
    () => adminFinanceApi.intents(params), [cle(params)],
  );
}

export function useAdminIntent(reference: string) {
  return useAsync<AdminIntentDetail>(
    () => adminFinanceApi.intent(reference), [reference],
  );
}

export function useAdminEscrow(params: ListParams = {}) {
  return useAsync<Paginated<AdminEscrowRow>>(
    () => adminFinanceApi.escrow(params), [cle(params)],
  );
}

export function useAdminEscrowDetail(reference: string) {
  return useAsync<AdminEscrowDetail>(
    () => adminFinanceApi.escrowDetail(reference), [reference],
  );
}

export function useAdminSettlements(params: ListParams = {}) {
  return useAsync<Paginated<SettlementBatch>>(
    () => adminFinanceApi.settlements(params), [cle(params)],
  );
}

export function useAdminPayouts(params: ListParams = {}) {
  return useAsync<Paginated<AdminPayoutRow>>(
    () => adminFinanceApi.payouts(params), [cle(params)],
  );
}

export function useAdminPayout(reference: string) {
  return useAsync<AdminPayoutDetail>(
    () => adminFinanceApi.payout(reference), [reference],
  );
}

export function useAdminRefunds(params: ListParams = {}) {
  return useAsync<Paginated<AdminRefundRow>>(
    () => adminFinanceApi.refunds(params), [cle(params)],
  );
}

export function useAdminAdjustments(params: ListParams = {}) {
  return useAsync<Paginated<AdminAdjustmentRow>>(
    () => adminFinanceApi.adjustments(params), [cle(params)],
  );
}

export function useAdminDiscrepancies(params: ListParams = {}) {
  return useAsync<Paginated<AdminDiscrepancyRow>>(
    () => adminFinanceApi.discrepancies(params), [cle(params)],
  );
}

export function useTaskHealth() {
  return useAsync<{
    health: TaskHealthEntry[];
    catalog: Array<Record<string, unknown>>;
    schedule: Array<Record<string, unknown>>;
    groups: Record<string, string>;
  }>(() => adminFinanceApi.taskHealth(), []);
}