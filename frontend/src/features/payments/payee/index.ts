// frontend/src/features/payments/payee/index.ts
// Ecrans financiers partages par les trois espaces partenaires.
//
// Vendeur, entreprise de livraison et point relais consomment LES MEMES
// pages : ce sont le meme acteur financier. Seul `basePath` change.

export { default as AdjustmentsPage } from './AdjustmentsPage';
export { default as EscrowsPage } from './EscrowsPage';
export { default as SettlementDetailPage } from './SettlementDetailPage';
export { default as SettlementOverviewPage } from './SettlementOverviewPage';
export { default as SettlementsPage } from './SettlementsPage';

export { default as AmountDueCard } from './components/AmountDueCard';
export { default as BlockersNotice } from './components/BlockersNotice';
export { default as EscrowCard } from './components/EscrowCard';
export { default as SettlementBreakdown } from './components/SettlementBreakdown';
export { default as SettlementRow } from './components/SettlementRow';