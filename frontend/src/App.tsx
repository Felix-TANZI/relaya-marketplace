// frontend/src/App.tsx
// Point d'entrée du routeur React — BelivaY Marketplace.
//
// Architecture :
//   AppLayout    → pages publiques + auth + commandes client + profil
//   SellerLayout → toutes les pages /seller/*
//   AdminLayout  → toutes les pages /admin/* (guard AdminRoute = is_staff requis)

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ── Layouts ──────────────────────────────────────────────────────────────────
import AppLayout    from './app/layout/AppLayout';
import SellerLayout from './app/layout/SellerLayout';
import AdminLayout  from './features/admin/AdminLayout';

// ── Guards ───────────────────────────────────────────────────────────────────
import ProtectedRoute from './components/auth/ProtectedRoute';
import PublicRoute    from './components/auth/PublicRoute';
import AdminRoute     from './components/auth/AdminRoute';

// ── Pages publiques ───────────────────────────────────────────────────────────
import HomePage          from './features/home/HomePage';
import SearchPage        from './features/search/SearchPage';
import ProductDetailPage from './features/catalog/ProductDetailPage';
import CartPage          from './features/cart/CartPage';
import HelpPage          from './features/help/HelpPage';
import ContactPage       from './features/contact/ContactPage';
import AboutPage         from './features/about/AboutPage';
import PublicShopPage    from './features/catalog/PublicShopPage';

// ── Auth ──────────────────────────────────────────────────────────────────────
import LoginPage    from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';

// ── Pages client (authentifié) ────────────────────────────────────────────────
import CheckoutPage      from './features/checkout/CheckoutPage';
import OrdersHistoryPage from './features/orders/OrdersHistoryPage';
import OrderDetailPage   from './features/orders/OrderDetailPage';
import ProfilePage       from './features/profile/ProfilePage';
import BecomeSellerPage  from './features/vendors/BecomeSellerPage';

// ── Espace vendeur ────────────────────────────────────────────────────────────
import SellerDashboardPage      from './features/vendors/SellerDashboardPage';
import SellerProductsPage       from './features/vendors/SellerProductsPage';
import ProductFormPage          from './features/vendors/ProductFormPage';
import SellerOrdersPage         from './features/vendors/SellerOrdersPage';
import SellerOrderDetailPage    from './features/vendors/SellerOrderDetailPage';
import SellerPaymentsPage       from './features/vendors/SellerPaymentsPage';
import SellerDisputesPage       from './features/vendors/SellerDisputesPage';
import SellerShopPage           from './features/vendors/SellerShopPage';
import SellerAnalyticsPage      from './features/vendors/SellerAnalyticsPage';
import SellerBoostPage          from './features/vendors/SellerBoostPage';
import SellerCertificationsPage from './features/vendors/SellerCertificationsPage';
import SellerPlansPage          from './features/vendors/SellerPlansPage';
import SellerWalletPage         from './features/vendors/SellerWalletPage';
import SellerSettingsPage       from './features/vendors/SellerSettingsPage';

// ── Espace admin — Layout ─────────────────────────────────────────────────────
// Shared stub pour les pages non encore implémentées
import AdminStub from './features/admin/_AdminStub';

// ── Espace admin — Overview ───────────────────────────────────────────────────
import AdminDashboardPage from './features/admin/AdminDashboardPage';

// ── Espace admin — Client Management ─────────────────────────────────────────
// Ces pages remplacent UsersManagementPage / UserDetailPage
import UsersManagementPage from './features/admin/UsersManagementPage';
import UserDetailPage      from './features/admin/UserDetailPage';
import UserCreatePage      from './features/admin/customers/UserCreatePage';
import DeliveriesListPage  from './features/admin/deliveries/DeliveriesListPage';
import DeliveriesZonesPage from './features/admin/deliveries/DeliveriesZonesPage';
import DeliveriesPerformancePage from './features/admin/deliveries/DeliveriesPerformancePage';

// ── Espace admin — Vendor Management ─────────────────────────────────────────
import VendorsManagementPage from './features/admin/VendorsManagementPage';

// ── Espace admin — Operations ─────────────────────────────────────────────────
import OrdersManagementPage  from './features/admin/OrdersManagementPage';
import AdminOrderDetailPage  from './features/admin/OrderDetailPage';
import DisputesManagementPage from './features/admin/DisputesManagementPage';
import DisputeDetailPage     from './features/admin/DisputeDetailPage';
import ProductsManagementPage from './features/admin/ProductsManagementPage';
import MasterProductsPage from '@/features/admin/operations/MasterProductsPage';

// ── Espace admin — System ─────────────────────────────────────────────────────
import SettingsPage from './features/admin/SettingsPage';

// ─────────────────────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ══════════════════════════════════════════════════════════════════
            LAYOUT PUBLIC + CLIENT
        ══════════════════════════════════════════════════════════════════ */}
        <Route path="/" element={<AppLayout />}>

          {/* Pages publiques */}
          <Route index element={<HomePage />} />
          <Route path="search"       element={<SearchPage />} />
          <Route path="product/:id"  element={<ProductDetailPage />} />
          <Route path="cart"         element={<CartPage />} />
          <Route path="help"         element={<HelpPage />} />
          <Route path="contact"      element={<ContactPage />} />
          <Route path="about"        element={<AboutPage />} />
          <Route path="boutique/:slug" element={<PublicShopPage />} />

          {/* Auth */}
          <Route path="login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

          {/* Pages client */}
          <Route path="checkout"   element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="orders"     element={<ProtectedRoute><OrdersHistoryPage /></ProtectedRoute>} />
          <Route path="orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
          <Route path="profile"    element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          {/* Funnel vendeur */}
          <Route path="become-seller" element={<ProtectedRoute><BecomeSellerPage /></ProtectedRoute>} />

        </Route>

        {/* ══════════════════════════════════════════════════════════════════
            ESPACE VENDEUR
        ══════════════════════════════════════════════════════════════════ */}
        <Route path="seller" element={<ProtectedRoute><SellerLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/seller/dashboard" replace />} />

          <Route path="dashboard"         element={<SellerDashboardPage />} />
          <Route path="orders"            element={<SellerOrdersPage />} />
          <Route path="orders/:id"        element={<SellerOrderDetailPage />} />
          <Route path="payments"          element={<SellerPaymentsPage />} />
          <Route path="disputes"          element={<SellerDisputesPage />} />
          <Route path="products"          element={<SellerProductsPage />} />
          <Route path="products/new"      element={<ProductFormPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />
          <Route path="shop"              element={<SellerShopPage />} />
          <Route path="certifications"    element={<SellerCertificationsPage />} />
          <Route path="plans"             element={<SellerPlansPage />} />
          <Route path="analytics"         element={<SellerAnalyticsPage />} />
          <Route path="boost"             element={<SellerBoostPage />} />
          <Route path="wallet"            element={<SellerWalletPage />} />
          <Route path="settings"          element={<SellerSettingsPage />} />
        </Route>

        {/* ══════════════════════════════════════════════════════════════════
            ESPACE ADMIN — guard AdminRoute (is_staff requis)
        ══════════════════════════════════════════════════════════════════ */}
        <Route path="admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />

          {/* ── Overview ── */}
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="live"      element={<AdminStub titleKey="live_users" />} />

          {/* ── Client Management ── */}
          <Route path="customers/overview"  element={<UsersManagementPage />} />
          <Route path="customers"           element={<UsersManagementPage />} />
          <Route path="customers/create"    element={<UserCreatePage />} />
          <Route path="customers/:id"       element={<UserDetailPage />} />
          <Route path="customers/loyalty"   element={<AdminStub titleKey="customers_loyalty" />} />
          <Route path="customers/broadcast" element={<AdminStub titleKey="customers_broadcast" />} />

          {/* ── Vendor Management ── */}
          <Route path="vendors/overview"       element={<VendorsManagementPage />} />
          <Route path="vendors"                element={<VendorsManagementPage />} />
          <Route path="vendors/:id"            element={<AdminStub titleKey="vendors_list" />} />
          <Route path="vendors/map"            element={<AdminStub titleKey="vendors_map" />} />
          <Route path="vendors/kyc"            element={<AdminStub titleKey="vendors_kyc" />} />
          <Route path="vendors/withdrawals"    element={<AdminStub titleKey="vendors_withdrawals" />} />
          <Route path="vendors/subscriptions"  element={<AdminStub titleKey="vendors_subscriptions" />} />
          <Route path="vendors/certifications" element={<AdminStub titleKey="vendors_certifications" />} />
          <Route path="vendors/modifications"  element={<AdminStub titleKey="vendors_modifications" />} />

          {/* ── Delivery Management ── */}
          <Route path="deliveries/overview"    element={<AdminStub titleKey="section_deliveries" />} />
          <Route path="deliveries"             element={<DeliveriesListPage />} />
          <Route path="deliveries/zones"       element={<DeliveriesZonesPage />} />
          <Route path="deliveries/performance" element={<DeliveriesPerformancePage />} />

          {/* ── Operations ── */}
          <Route path="orders"               element={<OrdersManagementPage />} />
          <Route path="orders/map"           element={<AdminStub titleKey="orders_map" />} />
          <Route path="orders/:id"           element={<AdminOrderDetailPage />} />
          <Route path="disputes"             element={<DisputesManagementPage />} />
          <Route path="disputes/:id"         element={<DisputeDetailPage />} />
          <Route path="catalogue"            element={<ProductsManagementPage />} />
          <Route path="catalogue/categories" element={<AdminStub titleKey="categories" />} />
          <Route path="catalogue/reviews"    element={<AdminStub titleKey="reviews" />} />
          <Route path="catalogue/masters"    element={<MasterProductsPage />} />

          {/* ── Finances ── */}
          <Route path="finances" element={<AdminStub titleKey="finances" />} />
          <Route path="account"  element={<AdminStub titleKey="account" />} />
          <Route path="plans"    element={<AdminStub titleKey="plans" />} />

          {/* ── Growth (stub) ── */}
          <Route path="analytics" element={<AdminStub titleKey="analytics" />} />
          <Route path="boost"     element={<AdminStub titleKey="boost" />} />
          <Route path="marketing" element={<AdminStub titleKey="marketing" />} />
          <Route path="ia"        element={<AdminStub titleKey="ia" />} />

          {/* ── Security (stub) ── */}
          <Route path="security" element={<AdminStub titleKey="security" />} />

          {/* ── System ── */}
          <Route path="notifications" element={<AdminStub titleKey="notifications" />} />
          <Route path="support"       element={<AdminStub titleKey="support" />} />
          <Route path="audit"         element={<AdminStub titleKey="audit" />} />
          <Route path="logs"          element={<AdminStub titleKey="logs" />} />
          <Route path="settings"      element={<SettingsPage />} />

        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
