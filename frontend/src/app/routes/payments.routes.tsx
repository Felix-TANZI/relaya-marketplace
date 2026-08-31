// frontend/src/app/routes/payments.routes.tsx
// Routes financieres des espaces partenaires.
//
// ─────────────────────────────────────────────────────────────────────────
// TROIS ESPACES, LES MEMES ECRANS
//
// Vendeur, entreprise de livraison et point relais sont LE MEME acteur
// financier. Les pages `payee/` les servent tous les trois — seul
// `basePath` change, pour que la navigation reste coherente dans chaque
// espace.
//
// Ce fichier est importe par `router.tsx`. Il ne reorganise RIEN du routeur
// existant : melanger les deux chantiers rendrait toute regression
// indemelable.
// ─────────────────────────────────────────────────────────────────────────

import type { RouteObject } from 'react-router-dom';

import {
  AdminAdjustmentsPage, AdminEscrowsPage, AdminRefundsPage,
  AdminSettlementsPage, EscrowDetailPage, FinanceAnalyticsPage,
  FinanceDashboardPage, IntentDetailPage, IntentsPage, PayeesPage,
  PayoutDetailPage, PayoutsPage, ReconciliationPage, RiskPage, SchedulerPage,
} from '@/features/payments/admin';
import {
  PaymentCheckoutPage, PaymentDetailPage, PaymentHistoryPage, RefundsPage,
} from '@/features/payments/buyer';
import FinanceRoute from '@/features/payments/permissions/FinanceRoute';
import {
  AdjustmentsPage, EscrowsPage, SettlementDetailPage,
  SettlementOverviewPage, SettlementsPage,
} from '@/features/payments/payee';

/**
 * Fabrique les routes financieres d'un espace partenaire.
 *
 * @param basePath   racine de l'espace — /seller, /relay-point, …
 * @param profilePath ou envoyer un partenaire dont le dossier bloque le
 *                    versement, typiquement sa page de profil.
 */
export function buildPayeeRoutes(
  basePath: string,
  profilePath?: string,
): RouteObject[] {
  return [
    {
      path: 'wallet',
      element: (
        <SettlementOverviewPage
          basePath={basePath}
          profilePath={profilePath}
        />
      ),
    },
    {
      path: 'payments',
      element: <SettlementsPage basePath={basePath} />,
    },
    {
      path: 'payments/:reference',
      element: <SettlementDetailPage basePath={basePath} />,
    },
    { path: 'adjustments', element: <AdjustmentsPage /> },
    { path: 'escrow', element: <EscrowsPage /> },
  ];
}

/** Routes financieres du vendeur. */
export const sellerPaymentRoutes = buildPayeeRoutes(
  '/seller', '/seller/profile',
);

/** Routes financieres de l'entreprise de livraison. */
export const deliveryPaymentRoutes = buildPayeeRoutes(
  '/delivery-organization', '/delivery-organization/profile',
);

/** Routes financieres du point relais. */
export const relayPaymentRoutes = buildPayeeRoutes(
  '/relay-point', '/relay-point/profile',
);


// ─────────────────────────────────────────────────────────────────────────
// ESPACE ACHETEUR
// ─────────────────────────────────────────────────────────────────────────

/**
 * Routes financieres de l'acheteur.
 *
 * A monter dans l'espace client existant. Le panneau de protection, lui,
 * n'est pas une route : il s'insere dans `OrderDetailPage` — voir
 * `features/payments/embeds/`.
 */
export const buyerPaymentRoutes: RouteObject[] = [
  // L'ecran de paiement reel, ou le tunnel d'achat renvoie.
  { path: 'checkout/payment/:reference', element: <PaymentCheckoutPage /> },
  { path: 'payments', element: <PaymentHistoryPage /> },
  { path: 'payments/:reference', element: <PaymentDetailPage /> },
  { path: 'refunds', element: <RefundsPage /> },
];


// ─────────────────────────────────────────────────────────────────────────
// CENTRE FINANCIER DE L'ADMINISTRATION
// ─────────────────────────────────────────────────────────────────────────

/**
 * Routes du centre financier.
 *
 * Chaque page est enveloppee dans `FinanceRoute` : sans l'habilitation
 * `finance`, l'ecran affiche un message plutot qu'une cascade de 403.
 *
 * Ce n'est PAS un controle d'acces — la verite est cote serveur, ou
 * `IsFinanceStaff` refuse chaque route.
 */
const ECRANS: Array<{ path: string; element: React.ReactNode }> = [
  // Synthese
  { path: 'finance', element: <FinanceDashboardPage /> },
  { path: 'finance/analytics', element: <FinanceAnalyticsPage /> },

  // Ecrans qui AGISSENT sur l'argent
  { path: 'finance/payouts', element: <PayoutsPage /> },
  { path: 'finance/payouts/:reference', element: <PayoutDetailPage /> },
  { path: 'finance/refunds', element: <AdminRefundsPage /> },
  { path: 'finance/escrow', element: <AdminEscrowsPage /> },
  { path: 'finance/escrow/:reference', element: <EscrowDetailPage /> },
  { path: 'finance/adjustments', element: <AdminAdjustmentsPage /> },
  { path: 'finance/settlements', element: <AdminSettlementsPage /> },

  // Consultation et pilotage
  { path: 'finance/intents', element: <IntentsPage /> },
  { path: 'finance/intents/:reference', element: <IntentDetailPage /> },
  { path: 'finance/reconciliation', element: <ReconciliationPage /> },
  { path: 'finance/risk', element: <RiskPage /> },
  { path: 'finance/payees', element: <PayeesPage /> },
  { path: 'finance/scheduler', element: <SchedulerPage /> },
];

export const adminFinanceRoutes: RouteObject[] = ECRANS.map((ecran) => ({
  path: ecran.path,
  element: <FinanceRoute>{ecran.element}</FinanceRoute>,
}));