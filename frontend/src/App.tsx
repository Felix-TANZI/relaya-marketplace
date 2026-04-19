// frontend/src/App.tsx
// Point d'entrée du routeur React.
// Architecture :
//   - AppLayout    → pages publiques + auth + commandes client + profil
//   - SellerLayout → toutes les pages /seller/*
//   - AdminLayout  → toutes les pages /admin/*

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ── Layouts ────────────────────────────────────────────────────────────────
import AppLayout    from "./app/layout/AppLayout";
import SellerLayout from "./app/layout/SellerLayout";
import AdminLayout  from "./features/admin/AdminLayout";

// ── Guards ─────────────────────────────────────────────────────────────────
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute    from "./components/auth/PublicRoute";

// ── Pages publiques ────────────────────────────────────────────────────────
import HomePage          from "./features/home/HomePage";
import SearchPage        from "./features/search/SearchPage";
import CatalogPage       from "./features/catalog/CatalogPage";
import ProductDetailPage from "./features/catalog/ProductDetailPage";
import CartPage          from "./features/cart/CartPage";
import CheckoutPage      from "./features/checkout/CheckoutPage";
import LoginPage         from "./features/auth/LoginPage";
import RegisterPage      from "./features/auth/RegisterPage";
import HelpPage          from "./features/help/HelpPage";
import ContactPage       from "./features/contact/ContactPage";
import AboutPage         from "./features/about/AboutPage";

// ── Pages utilisateur (authentifié) ────────────────────────────────────────
import OrdersHistoryPage from "./features/orders/OrdersHistoryPage";
import OrderDetailPage   from "./features/orders/OrderDetailPage";
import ProfilePage       from "./features/profile/ProfilePage";

// ── Espace vendeur — pages principales ────────────────────────────────────
import BecomeSellerPage      from "./features/vendors/BecomeSellerPage";
import SellerDashboardPage   from "./features/vendors/SellerDashboardPage";
import SellerProductsPage    from "./features/vendors/SellerProductsPage";
import ProductFormPage       from "./features/vendors/ProductFormPage";
import SellerOrdersPage      from "./features/vendors/SellerOrdersPage";
import SellerOrderDetailPage from "./features/vendors/SellerOrderDetailPage";
import SellerPaymentsPage    from "./features/vendors/SellerPaymentsPage";
import SellerDisputesPage    from "./features/vendors/SellerDisputesPage";

// ── Espace vendeur — pages stub (à implémenter progressivement) ───────────
import SellerShopPage          from "./features/vendors/SellerShopPage";
import SellerAnalyticsPage     from "./features/vendors/SellerAnalyticsPage";
import SellerBoostPage         from "./features/vendors/SellerBoostPage";
import SellerCertificationsPage from "./features/vendors/SellerCertificationsPage";
import SellerPlansPage         from "./features/vendors/SellerPlansPage";
import SellerWalletPage        from "./features/vendors/SellerWalletPage";
import SellerSettingsPage      from "./features/vendors/SellerSettingsPage";

// ── Espace admin ────────────────────────────────────────────────────────────
import AdminDashboardPage      from "./features/admin/AdminDashboardPage";
import ProductsManagementPage  from "./features/admin/ProductsManagementPage";
import OrdersManagementPage    from "./features/admin/OrdersManagementPage";
import AdminOrderDetailPage    from "./features/admin/OrderDetailPage";
import UsersManagementPage     from "./features/admin/UsersManagementPage";
import UserDetailPage          from "./features/admin/UserDetailPage";
import VendorsManagementPage   from "./features/admin/VendorsManagementPage";
import DisputesManagementPage  from "./features/admin/DisputesManagementPage";
import DisputeDetailPage       from "./features/admin/DisputeDetailPage";
import SettingsPage            from "./features/admin/SettingsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ══════════════════════════════════════════════════════════════════
            LAYOUT PUBLIC + CLIENT (AppLayout)
            Header + Footer standard, sans sidebar
        ══════════════════════════════════════════════════════════════════ */}
        <Route path="/" element={<AppLayout />}>

          {/* Pages publiques */}
          <Route index element={<HomePage />} />
          <Route path="search"      element={<SearchPage />} />
          <Route path="catalog"     element={<Navigate to="/" replace />} />
          <Route path="product/:id" element={<ProductDetailPage />} />
          <Route path="cart"        element={<CartPage />} />
          <Route path="help"        element={<HelpPage />} />
          <Route path="contact"     element={<ContactPage />} />
          <Route path="about"       element={<AboutPage />} />

          {/* Authentification */}
          <Route path="login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

          {/* Pages client (authentifié) */}
          <Route path="checkout"   element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="orders"     element={<ProtectedRoute><OrdersHistoryPage /></ProtectedRoute>} />
          <Route path="orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
          <Route path="profile"    element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          {/* Funnel devenir vendeur */}
          <Route path="become-seller" element={<ProtectedRoute><BecomeSellerPage /></ProtectedRoute>} />

        </Route>

        {/* ══════════════════════════════════════════════════════════════════
            LAYOUT VENDEUR (SellerLayout)
            Sidebar sombre + topbar orange, routes /seller/*
        ══════════════════════════════════════════════════════════════════ */}
        <Route
          path="seller"
          element={<ProtectedRoute><SellerLayout /></ProtectedRoute>}
        >
          <Route index element={<Navigate to="/seller/dashboard" replace />} />

          {/* ── Ventes ── */}
          <Route path="dashboard" element={<SellerDashboardPage />} />
          <Route path="orders"    element={<SellerOrdersPage />} />
          <Route path="orders/:id" element={<SellerOrderDetailPage />} />
          <Route path="payments"  element={<SellerPaymentsPage />} />
          <Route path="disputes"  element={<SellerDisputesPage />} />

          {/* ── Catalogue ── */}
          <Route path="products"          element={<SellerProductsPage />} />
          <Route path="products/new"      element={<ProductFormPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />

          {/* ── Boutique ── */}
          <Route path="shop"          element={<SellerShopPage />} />
          <Route path="certifications" element={<SellerCertificationsPage />} />
          <Route path="plans"         element={<SellerPlansPage />} />

          {/* ── Croissance (Pro) ── */}
          <Route path="analytics" element={<SellerAnalyticsPage />} />
          <Route path="boost"     element={<SellerBoostPage />} />

          {/* ── Mon compte ── */}
          <Route path="wallet"   element={<SellerWalletPage />} />
          <Route path="settings" element={<SellerSettingsPage />} />

        </Route>

        {/* ══════════════════════════════════════════════════════════════════
            LAYOUT ADMIN (AdminLayout)
            Sidebar admin, routes /admin/*
        ══════════════════════════════════════════════════════════════════ */}
        <Route
          path="admin"
          element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard"    element={<AdminDashboardPage />} />
          <Route path="products"     element={<ProductsManagementPage />} />
          <Route path="orders"       element={<OrdersManagementPage />} />
          <Route path="orders/:id"   element={<AdminOrderDetailPage />} />
          <Route path="users"        element={<UsersManagementPage />} />
          <Route path="users/:id"    element={<UserDetailPage />} />
          <Route path="vendors"      element={<VendorsManagementPage />} />
          <Route path="disputes"     element={<DisputesManagementPage />} />
          <Route path="disputes/:id" element={<DisputeDetailPage />} />
          <Route path="settings"     element={<SettingsPage />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;