// frontend/src/app/routes/router.tsx
// Routeur principal BelivaY.
// Architecture :
//   AppLayout    → pages publiques + auth + client
//   SellerLayout → /seller/*
//   AdminLayout  → /admin/* (AdminRoute = ProtectedRoute + is_staff check)

import { createBrowserRouter, Navigate } from 'react-router-dom';

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
import HomePage               from '@/features/home/HomePage';
import CatalogPage            from '@/features/catalog/CatalogPage';
import CategoriesPage         from '@/features/categories/CategoriesPage';
import ProductDetailPage      from '@/features/catalog/ProductDetailPage';
import CartPage               from '@/features/cart/CartPage';
import CheckoutPage           from '@/features/checkout/CheckoutPage';
import CheckoutConfirmPage    from '@/features/checkout/CheckoutConfirmPage';
import OrdersHistoryPage      from '@/features/orders/OrdersHistoryPage';
import OrderDetailPage        from '@/features/orders/OrderDetailPage';
import WishlistPage           from '@/features/wishlist/WishlistPage';
import ProfilePage            from '@/features/profile/ProfilePage';
import NotificationsPage      from '@/features/notifications/NotificationsPage';
import SearchPage             from '@/features/search/SearchPage';
import ContactPage            from '@/features/contact/ContactPage';
import HelpPage               from '@/features/help/HelpPage';
import AboutPage              from '@/features/about/AboutPage';
import BecomeSellerPage       from '@/features/vendors/BecomeSellerPage';
import NotFoundPage           from '@/features/system/NotFoundPage';
import PromotionsPage         from '@/features/promotions/PromotionsPage';
import DriverApp              from '@/features/driver/DriverApp';

// ─────────────────────────────────────────────────────────────────────────────
// AUTH PAGES
// ─────────────────────────────────────────────────────────────────────────────
import LoginPage    from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';

// ─────────────────────────────────────────────────────────────────────────────
// SELLER PAGES
// ─────────────────────────────────────────────────────────────────────────────
import SellerDashboardPage      from '@/features/vendors/SellerDashboardPage';
import SellerProductsPage       from '@/features/vendors/SellerProductsPage';
import ProductFormPage          from '@/features/vendors/ProductFormPage';
import SellerOrdersPage         from '@/features/vendors/SellerOrdersPage';
import SellerOrderDetailPage    from '@/features/vendors/SellerOrderDetailPage';
import SellerPaymentsPage       from '@/features/vendors/SellerPaymentsPage';
import SellerDisputesPage       from '@/features/vendors/SellerDisputesPage';
import SellerShopPage           from '@/features/vendors/SellerShopPage';
import SellerAnalyticsPage      from '@/features/vendors/SellerAnalyticsPage';
import SellerBoostPage          from '@/features/vendors/SellerBoostPage';
import SellerCertificationsPage from '@/features/vendors/SellerCertificationsPage';
import SellerPlansPage          from '@/features/vendors/SellerPlansPage';
import SellerSettingsPage       from '@/features/vendors/SellerSettingsPage';
import SellerWalletPage         from '@/features/vendors/SellerWalletPage';

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — PARTAGÉ
// ─────────────────────────────────────────────────────────────────────────────
import AdminDashboardPage      from '@/features/admin/AdminDashboardPage';
import AdminStub               from '@/features/admin/_AdminStub';

// ── Finances ─────────────────────────────────────────────────────────────────
import FinancesPage            from '@/features/admin/finances/FinancesPage';
import AccountPage             from '@/features/admin/finances/AccountPage';
import PlansPage               from '@/features/admin/finances/PlansPage';
import CommissionsPage         from '@/features/admin/finances/CommissionsPage';

// ── Vendeurs ─────────────────────────────────────────────────────────────────
import VendorsListPage         from '@/features/admin/vendors/VendorsListPage';
import VendorDetailPage        from '@/features/admin/vendors/VendorDetailPage';
import KYCPage                 from '@/features/admin/vendors/KYCPage';
import WithdrawalsPage         from '@/features/admin/vendors/WithdrawalsPage';
import ModificationsPage       from '@/features/admin/vendors/ModificationsPage';
import CertificationsPage      from '@/features/admin/vendors/CertificationsPage';
import SubscriptionsPage       from '@/features/admin/vendors/SubscriptionsPage';
import VendorsOverviewPage     from '@/features/admin/vendors/VendorsOverviewPage';
import OrdersMapPage           from '@/features/admin/operations/OrdersMapPage';
import VendorsMapPage          from '@/features/admin/vendors/VendorsMapPage';

// ── Clients ──────────────────────────────────────────────────────────────────
import CustomersListPage       from '@/features/admin/customers/CustomersListPage';
import CustomerDetailPage      from '@/features/admin/customers/CustomerDetailPage';
import CustomersOverviewPage   from '@/features/admin/customers/CustomersOverviewPage';
import CustomersBroadcastPage  from '@/features/admin/customers/CustomersBroadcastPage';
import CustomersLoyaltyPage    from '@/features/admin/customers/CustomersLoyaltyPage';

// ── Opérations ───────────────────────────────────────────────────────────────
import OrdersListPage          from '@/features/admin/operations/OrdersListPage';
import AdminOrderDetailPage    from '@/features/admin/operations/OrderDetailPage';
import DisputesListPage        from '@/features/admin/operations/DisputesListPage';
import AdminDisputeDetailPage  from '@/features/admin/operations/DisputeDetailPage';
import DeliveriesListPage from '@/features/admin/deliveries/DeliveriesListPage';
import DeliveriesZonesPage from '@/features/admin/deliveries/DeliveriesZonesPage';
import DeliveriesPerformancePage from '@/features/admin/deliveries/DeliveriesPerformancePage';
import CataloguePage           from '@/features/admin/operations/CataloguePage';
import AdminCategoriesPage     from '@/features/admin/operations/CategoriesPage';
import ReviewsPage             from '@/features/admin/operations/ReviewsPage';

// ── Système ──────────────────────────────────────────────────────────────────
import AuditPage               from '@/features/admin/system/AuditPage';
import NotificationsAdminPage  from '@/features/admin/system/NotificationsPage';
import LogsPage                from '@/features/admin/system/LogsPage';
import SettingsPage            from '@/features/admin/SettingsPage';
import UserCreatePage from '@/features/admin/customers/UserCreatePage';

// ── Live ─────────────────────────────────────────────────────────────────────
import LiveUsersPage           from '@/features/admin/LiveUsersPage';
import LiveMapPage             from '@/features/admin/LiveMapPage';

// ── Utilisateurs ─────────────────────────────────────────────────────────────
import UsersManagementPage     from '@/features/admin/UsersManagementPage';
import UserDetailPage          from '@/features/admin/UserDetailPage';

// ─────────────────────────────────────────────────────────────────────────────
// STUBS — icônes pour les pages à venir
// ─────────────────────────────────────────────────────────────────────────────
import {
  Megaphone, Truck, TrendingUp,
  Zap, Bot, Shield, HeadphonesIcon,
} from 'lucide-react';

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
      { index: true, element: <HomePage /> },

      // Public
      { path: 'catalog',         element: <CatalogPage /> },
      { path: 'categories',      element: <CategoriesPage /> },
      { path: 'product/:id',     element: <ProductDetailPage /> },
      { path: 'cart',            element: <CartPage /> },
      { path: 'search',          element: <SearchPage /> },
      { path: 'promotions',      element: <PromotionsPage /> },
      { path: 'contact',         element: <ContactPage /> },
      { path: 'help',            element: <HelpPage /> },
      { path: 'about',           element: <AboutPage /> },
      { path: 'become-seller',   element: <BecomeSellerPage /> },

      // Auth
      { path: 'login',    element: <PublicRoute><LoginPage /></PublicRoute> },
      { path: 'register', element: <PublicRoute><RegisterPage /></PublicRoute> },

      // Protected (client)
      { path: 'checkout',         element: <ProtectedRoute><CheckoutPage /></ProtectedRoute> },
      { path: 'checkout/confirm', element: <ProtectedRoute><CheckoutConfirmPage /></ProtectedRoute> },
      { path: 'orders',           element: <ProtectedRoute><OrdersHistoryPage /></ProtectedRoute> },
      { path: 'orders/:id',       element: <ProtectedRoute><OrderDetailPage /></ProtectedRoute> },
      { path: 'wishlist',         element: <ProtectedRoute><WishlistPage /></ProtectedRoute> },
      { path: 'notifications',    element: <ProtectedRoute><NotificationsPage /></ProtectedRoute> },
      { path: 'profile',          element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },

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
      { path: 'payments',          element: <SellerPaymentsPage /> },
      { path: 'disputes',          element: <SellerDisputesPage /> },
      { path: 'shop',              element: <SellerShopPage /> },
      { path: 'analytics',         element: <SellerAnalyticsPage /> },
      { path: 'boost',             element: <SellerBoostPage /> },
      { path: 'certifications',    element: <SellerCertificationsPage /> },
      { path: 'plans',             element: <SellerPlansPage /> },
      { path: 'settings',          element: <SellerSettingsPage /> },
      { path: 'wallet',            element: <SellerWalletPage /> },
    ],
  },

  // Espace livreur
  {
    path: '/courier',
    element: <ProtectedRoute><RoleRoute role="courier"><DriverApp /></RoleRoute></ProtectedRoute>,
  },
  {
    path: '/driver/*',
    element: <ProtectedRoute><RoleRoute role="courier"><DriverApp /></RoleRoute></ProtectedRoute>,
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

      // ── OPERATIONS ────────────────────────────────────────────────────────
      { path: 'orders',               element: <OrdersListPage /> },
      { path: 'orders/:id',           element: <AdminOrderDetailPage /> },
      { path: 'orders/map',           element: <OrdersMapPage /> },
      { path: 'disputes',             element: <DisputesListPage /> },
      { path: 'disputes/:id',         element: <AdminDisputeDetailPage /> },
      { path: 'catalogue',            element: <CataloguePage /> },
      { path: 'catalogue/categories', element: <AdminCategoriesPage /> },
      { path: 'catalogue/reviews',    element: <ReviewsPage /> },

      // ── FINANCES ────────────────────────────────────────────────────────
      { path: 'finances', element: <FinancesPage /> },
      { path: 'account',  element: <AccountPage /> },
      { path: 'plans',    element: <PlansPage /> },
      { path: 'commissions', element: <CommissionsPage /> },

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
    ],
  },
]);
