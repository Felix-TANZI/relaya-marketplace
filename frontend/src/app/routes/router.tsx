// frontend/src/app/routes/router.tsx
// Routeur principal BelivaY.
// Architecture :
//   AppLayout    → pages publiques + auth + client
//   SellerLayout → /seller/*
//   AdminLayout  → /admin/* (AdminRoute = ProtectedRoute + is_staff check)

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { isDedicatedPortal, portalHomePath } from '@/config/portals';
import PageLoader from '@/components/PageLoader';

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUTS
// ─────────────────────────────────────────────────────────────────────────────
import AppLayout    from '@/app/layout/AppLayout';
import SellerLayout from '@/app/layout/SellerLayout';
import AdminLayout  from '@/features/admin/AdminLayout';

// ─────────────────────────────────────────────────────────────────────────────
// GUARDS
// ─────────────────────────────────────────────────────────────────────────────
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PublicRoute    from '@/components/auth/PublicRoute';
import RoleRoute      from '@/components/auth/RoleRoute';

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT PAGES
// ─────────────────────────────────────────────────────────────────────────────
const HomePage = lazy(() => import('@/features/home/HomePage'));
const CatalogPage = lazy(() => import('@/features/catalog/CatalogPage'));
const CategoriesPage = lazy(() => import('@/features/categories/CategoriesPage'));
const CategoryThemePage = lazy(() => import('@/features/categories/CategoryThemePage'));
const PremiumPage = lazy(() => import('@/features/premium/PremiumPage'));
const SelectionPremiumPage = lazy(() => import('@/features/premium/SelectionPremiumPage'));
const CartPage = lazy(() => import('@/features/cart/CartPage'));
const CheckoutPage = lazy(() => import('@/features/checkout/CheckoutPage'));
const CheckoutConfirmPage = lazy(() => import('@/features/checkout/CheckoutConfirmPage'));
const OrdersHistoryPage = lazy(() => import('@/features/orders/OrdersHistoryPage'));
const OrderDetailPage = lazy(() => import('@/features/orders/OrderDetailPage'));
const WishlistPage = lazy(() => import('@/features/wishlist/WishlistPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'));
const SearchPage = lazy(() => import('@/features/search/SearchPage'));
const ContactPage = lazy(() => import('@/features/contact/ContactPage'));
const HelpPage = lazy(() => import('@/features/help/HelpPage'));
const AboutPage = lazy(() => import('@/features/about/AboutPage'));
const BecomeSellerPage = lazy(() => import('@/features/vendors/BecomeSellerPage'));
const NotFoundPage = lazy(() => import('@/features/system/NotFoundPage'));
const PromotionsPage = lazy(() => import('@/features/promotions/PromotionsPage'));
const FlashDealsPage = lazy(() => import('@/features/flash/FlashDealsPage'));
const DriverApp = lazy(() => import('@/features/driver/DriverApp'));
const FicheDetailPage = lazy(() => import('@/features/catalog/FicheDetailPage'));
const RelayPointPage = lazy(() => import('@/features/relay/RelayPointPage'));
const DeliveryOrganizationPage = lazy(() => import('@/features/delivery-organization/DeliveryOrganizationPage'));
// ─────────────────────────────────────────────────────────────────────────────
// AUTH PAGES
// ─────────────────────────────────────────────────────────────────────────────
const LoginRoute = lazy(() => import('@/features/auth/LoginRoute'));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'));
// ─────────────────────────────────────────────────────────────────────────────
// SELLER PAGES
// ─────────────────────────────────────────────────────────────────────────────
const SellerDashboardPage = lazy(() => import('@/features/vendors/SellerDashboardPage'));
const SellerProductsPage = lazy(() => import('@/features/vendors/SellerProductsPage'));
const ProductFormPage = lazy(() => import('@/features/vendors/ProductFormPage'));
const SellerOrdersPage = lazy(() => import('@/features/vendors/SellerOrdersPage'));
const SellerOrderDetailPage = lazy(() => import('@/features/vendors/SellerOrderDetailPage'));
const SellerDisputesPage = lazy(() => import('@/features/vendors/SellerDisputesPage'));
const SellerReturnsPage = lazy(() => import('@/features/vendors/SellerReturnsPage'));
const SellerShopPage = lazy(() => import('@/features/vendors/SellerShopPage'));
const SellerAnalyticsPage = lazy(() => import('@/features/vendors/SellerAnalyticsPage'));
const SellerBoostPage = lazy(() => import('@/features/vendors/SellerBoostPage'));
const SellerCertificationsPage = lazy(() => import('@/features/vendors/SellerCertificationsPage'));
const SellerPlansPage = lazy(() => import('@/features/vendors/SellerPlansPage'));
const SellerSettingsPage = lazy(() => import('@/features/vendors/SellerSettingsPage'));
const SellerPaymentsPage = lazy(() => import('@/features/vendors/SellerPaymentsPage'));
const SellerWalletPage = lazy(() => import('@/features/vendors/SellerWalletPage'));
const SellerSettlementsPage = lazy(() => import('@/features/vendors/SellerSettlementsPage'));
const SellerPendingFundsPage = lazy(() => import('@/features/vendors/SellerPendingFundsPage'));
const SellerAdjustmentsPage = lazy(() => import('@/features/vendors/SellerAdjustmentsPage'));
// ─────────────────────────────────────────────────────────────────────────────
// ROUTES FINANCIÈRES PARTENAIRES
// ─────────────────────────────────────────────────────────────────────────────
import {
  buyerPaymentRoutes,
  sellerPaymentRoutes,
  deliveryPaymentRoutes,
  relayPaymentRoutes,
  adminFinanceRoutes,
} from './payments.routes';

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — PARTAGÉ
// ─────────────────────────────────────────────────────────────────────────────
const AdminDashboardPage = lazy(() => import('@/features/admin/AdminDashboardPage'));
import AdminStub               from '@/features/admin/_AdminStub';

// ── Finances ─────────────────────────────────────────────────────────────────
const FinancesPage = lazy(() => import('@/features/admin/finances/FinancesPage'));
const AccountPage = lazy(() => import('@/features/admin/finances/AccountPage'));
const PlansPage = lazy(() => import('@/features/admin/finances/PlansPage'));
const CommissionsPage = lazy(() => import('@/features/admin/finances/CommissionsPage'));
// ── Vendeurs ─────────────────────────────────────────────────────────────────
const VendorsListPage = lazy(() => import('@/features/admin/vendors/VendorsListPage'));
const VendorDetailPage = lazy(() => import('@/features/admin/vendors/VendorDetailPage'));
const KYCPage = lazy(() => import('@/features/admin/vendors/KYCPage'));
const WithdrawalsPage = lazy(() => import('@/features/admin/vendors/WithdrawalsPage'));
const ModificationsPage = lazy(() => import('@/features/admin/vendors/ModificationsPage'));
const CertificationsPage = lazy(() => import('@/features/admin/vendors/CertificationsPage'));
const SubscriptionsPage = lazy(() => import('@/features/admin/vendors/SubscriptionsPage'));
const VendorsOverviewPage = lazy(() => import('@/features/admin/vendors/VendorsOverviewPage'));
const OrdersMapPage = lazy(() => import('@/features/admin/operations/OrdersMapPage'));
const VendorsMapPage = lazy(() => import('@/features/admin/vendors/VendorsMapPage'));
// ── Clients ──────────────────────────────────────────────────────────────────
const CustomersListPage = lazy(() => import('@/features/admin/customers/CustomersListPage'));
const CustomerDetailPage = lazy(() => import('@/features/admin/customers/CustomerDetailPage'));
const CustomersOverviewPage = lazy(() => import('@/features/admin/customers/CustomersOverviewPage'));
const CustomersBroadcastPage = lazy(() => import('@/features/admin/customers/CustomersBroadcastPage'));
const CustomersLoyaltyPage = lazy(() => import('@/features/admin/customers/CustomersLoyaltyPage'));
// ── Opérations ───────────────────────────────────────────────────────────────
const OrdersListPage = lazy(() => import('@/features/admin/operations/OrdersListPage'));
const AdminOrderDetailPage = lazy(() => import('@/features/admin/operations/OrderDetailPage'));
const DisputesListPage = lazy(() => import('@/features/admin/operations/DisputesListPage'));
const ReturnsListPage = lazy(() => import('@/features/admin/operations/ReturnsListPage'));
const SupervisionPage = lazy(() => import('@/features/admin/operations/SupervisionPage'));
const AdminDisputeDetailPage = lazy(() => import('@/features/admin/operations/DisputeDetailPage'));
const DeliveriesListPage = lazy(() => import('@/features/admin/deliveries/DeliveriesListPage'));
const DeliveriesZonesPage = lazy(() => import('@/features/admin/deliveries/DeliveriesZonesPage'));
const DeliveriesPerformancePage = lazy(() => import('@/features/admin/deliveries/DeliveriesPerformancePage'));
const DeliveryOrganizationsMapPage = lazy(() => import('@/features/admin/deliveries/DeliveryOrganizationsMapPage'));
const RelayPointsMapPage = lazy(() => import('@/features/admin/deliveries/RelayPointsMapPage'));
const CataloguePage = lazy(() => import('@/features/admin/operations/CataloguePage'));
const AdminCategoriesPage = lazy(() => import('@/features/admin/operations/CategoriesPage'));
const ReviewsPage = lazy(() => import('@/features/admin/operations/ReviewsPage'));
const MasterProductsPage = lazy(() => import('@/features/admin/operations/MasterProductsPage'));
// ── Système ──────────────────────────────────────────────────────────────────
const AuditPage = lazy(() => import('@/features/admin/system/AuditPage'));
const NotificationsAdminPage = lazy(() => import('@/features/admin/system/NotificationsPage'));
const LogsPage = lazy(() => import('@/features/admin/system/LogsPage'));
const SettingsPage = lazy(() => import('@/features/admin/SettingsPage'));
const UserCreatePage = lazy(() => import('@/features/admin/customers/UserCreatePage'));
// ── Live ─────────────────────────────────────────────────────────────────────
const LiveUsersPage = lazy(() => import('@/features/admin/LiveUsersPage'));
const LiveMapPage = lazy(() => import('@/features/admin/LiveMapPage'));
// ── Utilisateurs ─────────────────────────────────────────────────────────────
const UsersManagementPage = lazy(() => import('@/features/admin/UsersManagementPage'));
const UserDetailPage = lazy(() => import('@/features/admin/UserDetailPage'));
// ── Catalogue ─────────────────────────────────────────────────────────────
const AdminVariantsPage = lazy(() => import('@/features/admin/catalog/AdminVariantsPage'));
const AdminBrandsPage = lazy(() => import('@/features/admin/catalog/AdminBrandsPage'));
const AdminAttributesPage = lazy(() => import('@/features/admin/catalog/AdminAttributesPage'));
const AdminColorsPage = lazy(() => import('@/features/admin/catalog/AdminColorsPage'));
const AdminCategPage = lazy(() => import('@/features/admin/catalog/AdminCategPage'));
// ─────────────────────────────────────────────────────────────────────────────
// STUBS — icônes pour les pages à venir
// ─────────────────────────────────────────────────────────────────────────────
import {
  Megaphone, Truck, TrendingUp,
  Zap, Bot, Shield, HeadphonesIcon,
} from 'lucide-react';

// Le portail dedie se decide au chargement du module — `isDedicatedPortal` et
// `portalHomePath` sont des constantes de `@/config/portals`. L'element est
// donc calcule ici plutot que dans un composant : un fichier de routes qui
// declare un composant casse le Fast Refresh (react-refresh/only-export-components).
const portalIndexElement = isDedicatedPortal
  ? <Navigate to={portalHomePath} replace />
  : <HomePage />;

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENT AREA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: portalIndexElement },

      // Public
      { path: 'catalog',         element: <CatalogPage /> },
      { path: 'categories',      element: <CategoriesPage /> },
      { path: 'categorie/:slug', element: <CategoryThemePage /> },
      { path: 'product/:slug', element: <FicheDetailPage /> },
      { path: 'cart',            element: <CartPage /> },
      { path: 'wishlist',        element: <WishlistPage /> },
      { path: 'search',          element: <SearchPage /> },
      { path: 'promotions',      element: <PromotionsPage /> },
      { path: 'flash-deals',     element: <FlashDealsPage /> },
      { path: 'premium',         element: <PremiumPage /> },
      { path: 'selection-premium', element: <SelectionPremiumPage /> },
      { path: 'contact',         element: <ContactPage /> },
      { path: 'help',            element: <HelpPage /> },
      { path: 'about',           element: <AboutPage /> },
      { path: 'become-seller',   element: <BecomeSellerPage /> },

      // Auth
      { path: 'login',    element: <PublicRoute><LoginRoute /></PublicRoute> },
      { path: 'register', element: <PublicRoute><RegisterPage /></PublicRoute> },

      // Protected (client)
      { path: 'checkout',         element: <ProtectedRoute><CheckoutPage /></ProtectedRoute> },
      { path: 'checkout/confirm', element: <ProtectedRoute><CheckoutConfirmPage /></ProtectedRoute> },
      { path: 'orders',           element: <ProtectedRoute><OrdersHistoryPage /></ProtectedRoute> },
      { path: 'orders/:id',       element: <ProtectedRoute><OrderDetailPage /></ProtectedRoute> },
      { path: 'notifications',    element: <ProtectedRoute><NotificationsPage /></ProtectedRoute> },
      { path: 'profile',          element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },
      ...buyerPaymentRoutes,

      // Fallback
      { path: '*', element: <NotFoundPage /> },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SELLER AREA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    path: '/seller',
    element: <ProtectedRoute><RoleRoute role="seller"><SellerLayout /></RoleRoute></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/seller/dashboard" replace /> },
      { path: 'dashboard',         element: <SellerDashboardPage /> },
      { path: 'products',          element: <SellerProductsPage /> },
      { path: 'products/new',      element: <ProductFormPage /> },
      { path: 'products/:id/edit', element: <ProductFormPage /> },
      { path: 'orders',            element: <SellerOrdersPage /> },
      { path: 'orders/:id',        element: <SellerOrderDetailPage /> },
      { path: 'disputes',          element: <SellerDisputesPage /> },
      { path: 'returns',           element: <SellerReturnsPage /> },
      { path: 'shop',              element: <SellerShopPage /> },
      { path: 'analytics',         element: <SellerAnalyticsPage /> },
      { path: 'boost',             element: <SellerBoostPage /> },
      { path: 'certifications',    element: <SellerCertificationsPage /> },
      { path: 'plans',             element: <SellerPlansPage /> },
      { path: 'settings',          element: <SellerSettingsPage /> },

      // Pages financières vendeur. Declarees AVANT `sellerPaymentRoutes` :
      // ce jeu generique expose aussi `wallet`, `payments` et `adjustments`,
      // et React Router retient la premiere correspondance.
      { path: 'wallet',        element: <SellerWalletPage /> },
      { path: 'payments',      element: <SellerPaymentsPage /> },
      { path: 'settlements',   element: <SellerSettlementsPage /> },
      { path: 'pending-funds', element: <SellerPendingFundsPage /> },
      { path: 'adjustments',   element: <SellerAdjustmentsPage /> },

      ...sellerPaymentRoutes,
    ],
  },

  // Espace livreur
  {
    path: '/courier',
    element: <ProtectedRoute><RoleRoute role="courier"><Suspense fallback={<PageLoader />}><DriverApp /></Suspense></RoleRoute></ProtectedRoute>,
  },
  {
    path: '/driver/*',
    element: <ProtectedRoute><RoleRoute role="courier"><Suspense fallback={<PageLoader />}><DriverApp /></Suspense></RoleRoute></ProtectedRoute>,
  },
  {
    path: '/relay-point',
    element: <ProtectedRoute><RoleRoute role="relay_point"><Suspense fallback={<PageLoader />}><RelayPointPage /></Suspense></RoleRoute></ProtectedRoute>,
    children: [
      ...relayPaymentRoutes,
    ],
  },
  {
    path: '/delivery-organization',
    element: <ProtectedRoute><RoleRoute role="delivery_organization"><Suspense fallback={<PageLoader />}><DeliveryOrganizationPage /></Suspense></RoleRoute></ProtectedRoute>,
    children: [
      ...deliveryPaymentRoutes,
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN AREA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    path: '/admin',
    element: <ProtectedRoute><AdminLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },

      // ── OVERVIEW ────────────────────────────────────────────────────────
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'live',      element: <LiveUsersPage /> },
      { path: 'live/map',  element: <LiveMapPage /> },

      // ── CLIENT MANAGEMENT ─────────────────────────────────────────────────
      { path: 'customers/overview', element: <CustomersOverviewPage /> },
      { path: 'customers',           element: <CustomersListPage /> },
      { path: 'customers/:id', element: <CustomerDetailPage /> },
      { path: 'customers/loyalty', element: <CustomersLoyaltyPage /> },
      { path: 'customers/broadcast', element: <CustomersBroadcastPage /> },
      { path: 'customers/create', element: <UserCreatePage /> },

      // ── VENDOR MANAGEMENT ───────────────────────────────────────────────
      { path: 'vendors/overview',       element: <VendorsOverviewPage /> },
      { path: 'vendors',                element: <VendorsListPage /> },
      { path: 'vendors/map',            element: <VendorsMapPage /> },
      { path: 'vendors/kyc',            element: <KYCPage /> },
      { path: 'vendors/withdrawals',    element: <WithdrawalsPage /> },
      { path: 'vendors/subscriptions',  element: <SubscriptionsPage /> },
      { path: 'vendors/certifications', element: <CertificationsPage /> },
      { path: 'vendors/modifications',  element: <ModificationsPage /> },
      { path: 'vendors/:id',            element: <VendorDetailPage /> },

    
      // ── DELIVERY MANAGEMENT ───────────────────────────────────────────────
      {
        path: 'deliveries/overview',
        element: <AdminStub title="Vue d'ensemble — Livreurs" description="Dashboard livreurs en cours de développement. Bientôt disponible." icon={Truck} />,
      },
      {
        path: 'deliveries',
        element: <DeliveriesListPage />,
      },
      {
        path: 'deliveries/zones',
        element: <DeliveriesZonesPage />,
      },
      {
        path: 'deliveries/performance',
        element: <DeliveriesPerformancePage />,
      },
      {
        path: 'deliveries/organization',
        element: <DeliveryOrganizationsMapPage />,
      },
      {
        path: 'deliveries/relay-point',
        element: <RelayPointsMapPage />,
      },

      // ── OPERATIONS ────────────────────────────────────────────────────────
      { path: 'orders',               element: <OrdersListPage /> },
      { path: 'orders/:id',           element: <AdminOrderDetailPage /> },
      { path: 'orders/map',           element: <OrdersMapPage /> },
      { path: 'disputes',             element: <DisputesListPage /> },
      { path: 'disputes/:id',         element: <AdminDisputeDetailPage /> },
      { path: 'returns',              element: <ReturnsListPage /> },
      { path: 'supervision',          element: <SupervisionPage /> },
      { path: 'catalogue',            element: <CataloguePage /> },
      { path: 'catalogue/categories', element: <AdminCategoriesPage /> },
      { path: 'catalogue/reviews',    element: <ReviewsPage /> },
      { path: 'catalogue/masters', element: <MasterProductsPage /> },

      // ── FINANCES ────────────────────────────────────────────────────────
      { path: 'finances', element: <FinancesPage /> },
      { path: 'account',  element: <AccountPage /> },
      { path: 'plans',    element: <PlansPage /> },
      { path: 'commissions', element: <CommissionsPage /> },
      ...adminFinanceRoutes,

      // ── GROWTH (SOON) ───────────────────────────────────────────────────
      { path: 'analytics', element: <AdminStub title="Analytics & Tendances"    description="Bientôt disponible." icon={TrendingUp} /> },
      { path: 'boost',     element: <AdminStub title="Boost & Campagnes"        description="Bientôt disponible." icon={Zap}        /> },
      { path: 'marketing', element: <AdminStub title="Marketing & Communication" description="Bientôt disponible." icon={Megaphone}  /> },
      { path: 'ia',        element: <AdminStub title="IA Conseiller"            description="Bientôt disponible." icon={Bot}        /> },

      // ── SECURITY (SOON) ─────────────────────────────────────────────────
      { path: 'security', element: <AdminStub title="Sécurité & Fraude" description="Bientôt disponible." icon={Shield} /> },

      // ── SYSTEM ──────────────────────────────────────────────────────────
      { path: 'notifications', element: <NotificationsAdminPage /> },
      { path: 'support',       element: <AdminStub title="Support & Tickets" description="Bientôt disponible." icon={HeadphonesIcon} /> },
      { path: 'audit',         element: <AuditPage /> },
      { path: 'logs',          element: <LogsPage /> },
      { path: 'settings',      element: <SettingsPage /> },

      // ── Rétrocompatibilité ───────────────────────────────────────────────
      { path: 'users',     element: <UsersManagementPage /> },
      { path: 'users/:id', element: <UserDetailPage /> },
      { path: 'products',  element: <CataloguePage /> },

      // ── Catalogue ─────────────────────────────────────────────────────────────
      { path: 'catalog/variants', element: <AdminVariantsPage /> },
      { path: 'catalog/brands',   element: <AdminBrandsPage /> },
      { path: 'catalog/attributes', element: <AdminAttributesPage /> },
      { path: 'catalog/colors',     element: <AdminColorsPage /> },
      { path: 'catalog/categories', element: <AdminCategPage /> },
    ],
  },
]);
