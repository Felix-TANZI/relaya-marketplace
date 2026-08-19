// frontend/src/features/payments/shared/index.ts
// Point d'entree unique des composants partages.

export { default as ApprovalDialog } from './ApprovalDialog';
export { default as EmptyState } from './EmptyState';
export { default as FinanceTable } from './FinanceTable';
export { default as FinancialAlert } from './FinancialAlert';
export { default as FinancialTimeline } from './FinancialTimeline';
export { default as MaturityBar } from './MaturityBar';
export { default as Money } from './Money';
export { default as StatusBadge } from './StatusBadge';
export { default as TransactionReference } from './TransactionReference';
export { formatXaf, MATURITY_COLORS } from './format';
export { FT, NUM } from './tokens';

export type { ApprovalField } from './ApprovalDialog';
export type { Column } from './FinanceTable';
export type { MaturitySegment } from './MaturityBar';
export type { MoneyTone } from './Money';
export type { TimelineStep } from './FinancialTimeline';