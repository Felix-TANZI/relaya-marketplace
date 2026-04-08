// frontend/src/app/routes/router.tsx
// Routeur principal de l'application BelivaY.
// Architecture :
//   / → AppLayout (site client)
//   /seller/* → SellerLayout (espace vendeur, auth requise)
//   /admin/* → AdminLayout (espace admin, auth + staff)

import { createBrowserRouter, Navigate } from "react-router-dom";

// ── Layouts ──
import AppLayout from "@/app/layout/AppLayout";
import SellerLayout from "@/app/layout/SellerLayout";

// ── Pages client ──
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
import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";
import ContactPage from "@/features/contact/ContactPage";
import HelpPage from "@/features/help/HelpPage";
import AboutPage from "@/features/about/AboutPage";
import ProfilePage from "@/features/profile/ProfilePage";
import BecomeSellerPage from "@/features/vendors/BecomeSellerPage";
import VendorsShowcasePage from '@/features/vendors/VendorsShowcasePage';
import NotFoundPage from "@/features/system/NotFoundPage";

// ── Pages vendeur (existantes) ──
import SellerDashboardPage from "@/features/vendors/SellerDashboardPage";
import SellerProductsPage from "@/features/vendors/SellerProductsPage";
import ProductFormPage from "@/features/vendors/ProductFormPage";
import VendorOrdersPage from "@/features/vendors/SellerOrdersPage";
import VendorOrderDetailPage from "@/features/vendors/SellerOrderDetailPage";

// ── Pages vendeur (nouvelles — stubs à compléter) ──
import SellerPaymentsPage from "@/features/vendors/SellerPaymentsPage";
import SellerDisputesPage from "@/features/vendors/SellerDisputesPage";
import SellerShopPage from "@/features/vendors/SellerShopPage";
import SellerAnalyticsPage from "@/features/vendors/SellerAnalyticsPage";
import SellerBoostPage from "@/features/vendors/SellerBoostPage";
import SellerCertificationsPage from "@/features/vendors/SellerCertificationsPage";
import SellerPlansPage from "@/features/vendors/SellerPlansPage";
import SellerSettingsPage from "@/features/vendors/SellerSettingsPage";
import SellerWalletPage from "@/features/vendors/SellerWalletPage";
import SearchPage from "@/features/search/SearchPage";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PublicRoute from "@/components/auth/PublicRoute";

export const router = createBrowserRouter([
  // ══════════════════════════════════════════
  // ESPACE CLIENT — AppLayout
  // ══════════════════════════════════════════
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "catalog",
        element: (
          <ProtectedRoute>
            <CatalogPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "categories",
        element: (
          <ProtectedRoute>
            <CategoriesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "product/:id",
        element: (
          <ProtectedRoute>
            <ProductDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "cart",
        element: (
          <ProtectedRoute>
            <CartPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "checkout",
        element: (
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "checkout/confirm",
        element: (
          <ProtectedRoute>
            <CheckoutConfirmPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "orders",
        element: (
          <ProtectedRoute>
            <OrdersHistoryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "orders/:id",
        element: (
          <ProtectedRoute>
            <OrderDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "search",
        element: (
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "wishlist",
        element: (
          <ProtectedRoute>
            <WishlistPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "notifications",
        element: (
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "login",
        element: (
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        ),
      },
      {
        path: "register",
        element: (
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "contact",
        element: (
          <ProtectedRoute>
            <ContactPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "help",
        element: (
          <ProtectedRoute>
            <HelpPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "about",
        element: (
          <ProtectedRoute>
            <AboutPage />
          </ProtectedRoute>
        ),
      },
      // Page de candidature vendeur (dans AppLayout, pas SellerLayout)
      {
        path: "become-seller",
        element: <BecomeSellerPage />,
      },
      {
        path: 'vendors',
        element: (
          <ProtectedRoute>
            <VendorsShowcasePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'vendors',
        element: (
          <ProtectedRoute>
            <VendorsShowcasePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },

  // ══════════════════════════════════════════
  // ESPACE VENDEUR — SellerLayout
  // L'auth check + vendor check sont gérés
  // directement dans SellerLayout
  // ══════════════════════════════════════════
  {
    path: "/seller",
    element: <SellerLayout />,
    children: [
      // Redirection /seller → /seller/dashboard
      {
        index: true,
        element: <Navigate to="/seller/dashboard" replace />,
      },

      // ── Tableau de bord ──
      {
        path: "dashboard",
        element: <SellerDashboardPage />,
      },

      // ── Produits ──
      {
        path: "products",
        element: <SellerProductsPage />,
      },
      {
        path: "products/new",
        element: <ProductFormPage />,
      },
      {
        path: "products/:id/edit",
        element: <ProductFormPage />,
      },

      // ── Commandes ──
      {
        path: "orders",
        element: <VendorOrdersPage />,
      },
      {
        path: "orders/:id",
        element: <VendorOrderDetailPage />,
      },

      // ── Paiements ──
      {
        path: "payments",
        element: <SellerPaymentsPage />,
      },

      // ── Litiges ──
      {
        path: "disputes",
        element: <SellerDisputesPage />,
      },

      // ── Boutique ──
      {
        path: "shop",
        element: <SellerShopPage />,
      },

      // ── Analytiques ──
      {
        path: "analytics",
        element: <SellerAnalyticsPage />,
      },

      // ── Boost & Publicité ──
      {
        path: "boost",
        element: <SellerBoostPage />,
      },

      // ── Certifications ──
      {
        path: "certifications",
        element: <SellerCertificationsPage />,
      },

      // ── Plans & Abonnements ──
      {
        path: "plans",
        element: <SellerPlansPage />,
      },

      // ── Paramètres ──
      {
        path: "settings",
        element: <SellerSettingsPage />,
      },

      // ── Compte BelivaY (Wallet) ──
      {
        path: "wallet",
        element: <SellerWalletPage />,
      },
    ],
  },
]);

