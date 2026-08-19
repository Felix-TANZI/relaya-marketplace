// frontend/src/features/payments/admin/index.ts
// Centre financier de l'administration — 13 ecrans.

export { default as AdminAdjustmentsPage } from './adjustments/AdjustmentsPage';
export { default as AdminEscrowsPage } from './escrow/EscrowsPage';
export { default as AdminRefundsPage } from './refunds/RefundsPage';
export { default as AdminSettlementsPage } from './settlements/SettlementsPage';
export { default as EscrowDetailPage } from './escrow/EscrowDetailPage';
export { default as FinanceAnalyticsPage } from './analytics/FinanceAnalyticsPage';
export { default as FinanceDashboardPage } from './dashboard/FinanceDashboardPage';
export { default as IntentDetailPage } from './intents/IntentDetailPage';
export { default as IntentsPage } from './intents/IntentsPage';
export { default as PayeesPage } from './payees/PayeesPage';
export { default as PayoutDetailPage } from './payouts/PayoutDetailPage';
export { default as PayoutsPage } from './payouts/PayoutsPage';
export { default as ReconciliationPage } from './reconciliation/ReconciliationPage';
export { default as RiskPage } from './risk/RiskPage';
export { default as SchedulerPage } from './scheduler/SchedulerPage';

export { default as AdminCard } from './components/AdminCard';
export { default as AdminPageShell } from './components/AdminPageShell';
export { default as PayoutRow } from './components/PayoutRow';
export { default as SectionNav } from './components/SectionNav';
export { default as SignalList } from './components/SignalList';
export { default as TreasuryCard } from './components/TreasuryCard';

export type { NavEntry } from './components/SectionNav';