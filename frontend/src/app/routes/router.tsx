import { createBrowserRouter } from "react-router-dom";
import AppLayout from "@/app/layout/AppLayout";
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
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import ContactPage from '@/features/contact/ContactPage';
import HelpPage from '@/features/help/HelpPage';
import AboutPage from '@/features/about/AboutPage';
import ProfilePage from '@/features/profile/ProfilePage';
import NotFoundPage from '@/features/system/NotFoundPage';
import SearchPage from '@/features/search/SearchPage';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PublicRoute from '@/components/auth/PublicRoute';

export const router = createBrowserRouter([
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
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
