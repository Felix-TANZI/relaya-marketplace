// frontend/src/app/routes/router.tsx

import { createBrowserRouter, Navigate } from "react-router-dom";

// ─────────────────────────────
// LAYOUTS
// ─────────────────────────────
import AppLayout from "@/app/layout/AppLayout";
import SellerLayout from "@/app/layout/SellerLayout";

// ─────────────────────────────
// CLIENT PAGES
// ─────────────────────────────
import HomePage from "@/features/home/HomePage";
import CatalogPage from "@/features/catalog/CatalogPage";
import CategoriesPage from "@/features/categories/CategoriesPage";
import ProductDetailPage from "@/features/catalog/ProductDetailPage";
import CartPage from "@/features/cart/CartPage";
import CheckoutPage from "@/features/checkout/CheckoutPage";
import CheckoutConfirmPage from "@/features/checkout/CheckoutConfirmPage";
import NotificationsPage from "@/features/notifications/NotificationsPage";
import OrdersHistoryPage from "@/features/orders/OrdersHistoryPage";
import OrderDetailPage from "@/features/orders/OrderDetailPage";
import WishlistPage from "@/features/wishlist/WishlistPage";
import ProfilePage from "@/features/profile/ProfilePage";
import ContactPage from "@/features/contact/ContactPage";
import HelpPage from "@/features/help/HelpPage";
import AboutPage from "@/features/about/AboutPage";
import SearchPage from "@/features/search/SearchPage";

// ─────────────────────────────
// AUTH PAGES
// ─────────────────────────────
import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";
import PublicRoute from "@/components/auth/PublicRoute";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// ─────────────────────────────
// VENDOR (SELLER) PAGES
// ─────────────────────────────
import SellerDashboardPage from "@/features/vendors/SellerDashboardPage";
import SellerProductsPage from "@/features/vendors/SellerProductsPage";
import ProductFormPage from "@/features/vendors/ProductFormPage";
import VendorOrdersPage from "@/features/vendors/SellerOrdersPage";
import VendorOrderDetailPage from "@/features/vendors/SellerOrderDetailPage";
import SellerPaymentsPage from "@/features/vendors/SellerPaymentsPage";
import SellerDisputesPage from "@/features/vendors/SellerDisputesPage";
import SellerShopPage from "@/features/vendors/SellerShopPage";
import SellerAnalyticsPage from "@/features/vendors/SellerAnalyticsPage";
import SellerBoostPage from "@/features/vendors/SellerBoostPage";
import SellerCertificationsPage from "@/features/vendors/SellerCertificationsPage";
import SellerPlansPage from "@/features/vendors/SellerPlansPage";
import SellerSettingsPage from "@/features/vendors/SellerSettingsPage";
import SellerWalletPage from "@/features/vendors/SellerWalletPage";


// ─────────────────────────────
// AUTRES
// ─────────────────────────────
import BecomeSellerPage from "@/features/vendors/BecomeSellerPage";
import NotFoundPage from "@/features/system/NotFoundPage";



// ─────────────────────────────
// ROUTER
// ─────────────────────────────
export const router = createBrowserRouter([


  // ═══════════════════════════════════════
  // 🔵 CLIENT AREA
  // ═══════════════════════════════════════
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },

      // PUBLIC
      { path: "catalog", element: <CatalogPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "product/:id", element: <ProductDetailPage /> },
      { path: "cart", element: <CartPage /> },
      { path: "search", element: <SearchPage /> },

      // PROTECTED
      {
        path: "checkout",
        element: <ProtectedRoute><CheckoutPage /></ProtectedRoute>,
      },
      {
        path: "checkout/confirm",
        element: <ProtectedRoute><CheckoutConfirmPage /></ProtectedRoute>,
      },
      {
        path: "orders",
        element: <ProtectedRoute><OrdersHistoryPage /></ProtectedRoute>,
      },
      {
        path: "orders/:id",
        element: <ProtectedRoute><OrderDetailPage /></ProtectedRoute>,
      },
      {
        path: "wishlist",
        element: <ProtectedRoute><WishlistPage /></ProtectedRoute>,
      },
      {
        path: "notifications",
        element: <ProtectedRoute><NotificationsPage /></ProtectedRoute>,
      },
      {
        path: "profile",
        element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
      },
      {
        path: "contact",
        element: <ProtectedRoute><ContactPage /></ProtectedRoute>,
      },
      {
        path: "help",
        element: <ProtectedRoute><HelpPage /></ProtectedRoute>,
      },
      {
        path: "about",
        element: <ProtectedRoute><AboutPage /></ProtectedRoute>,
      },

      // AUTH
      {
        path: "login",
        element: <PublicRoute><LoginPage /></PublicRoute>,
      },
      {
        path: "register",
        element: <PublicRoute><RegisterPage /></PublicRoute>,
      },

      // SELLER ENTRY
      { path: "become-seller", element: <BecomeSellerPage /> },

      // FALLBACK
      { path: "*", element: <NotFoundPage /> },
    ],
  },





  // ═══════════════════════════════════════
  // 🟠 SELLER AREA
  // ═══════════════════════════════════════
  {
    path: "/seller",
    element: <SellerLayout />,
    children: [
      { index: true, element: <Navigate to="/seller/dashboard" replace /> },

      // DASHBOARD
      { path: "dashboard", element: <SellerDashboardPage /> },

      // PRODUCTS
      { path: "products", element: <SellerProductsPage /> },
      { path: "products/new", element: <ProductFormPage /> },
      { path: "products/:id/edit", element: <ProductFormPage /> },

      // ORDERS
      { path: "orders", element: <VendorOrdersPage /> },
      { path: "orders/:id", element: <VendorOrderDetailPage /> },

      // PAYMENTS
      { path: "payments", element: <SellerPaymentsPage /> },

      // DISPUTES
      { path: "disputes", element: <SellerDisputesPage /> },

      // SHOP
      { path: "shop", element: <SellerShopPage /> },

      // ANALYTICS
      { path: "analytics", element: <SellerAnalyticsPage /> },

      // BOOST
      { path: "boost", element: <SellerBoostPage /> },

      // CERTIFICATIONS
      { path: "certifications", element: <SellerCertificationsPage /> },

      // PLANS
      { path: "plans", element: <SellerPlansPage /> },

      // SETTINGS
      { path: "settings", element: <SellerSettingsPage /> },

      // WALLET
      { path: "wallet", element: <SellerWalletPage /> },

    
      
    ],
  },
]);