import { createBrowserRouter } from "react-router-dom";
import AppLayout from "@/app/layout/AppLayout";
import HomePage from "@/features/home/HomePage";
import CatalogPage from "@/features/catalog/CatalogPage";
import ProductDetailPage from "@/features/catalog/ProductDetailPage";
import CartPage from "@/features/cart/CartPage";
import CheckoutPage from "@/features/checkout/CheckoutPage";
import CheckoutConfirmPage from "@/features/checkout/CheckoutConfirmPage";
import OrdersHistoryPage from "@/features/orders/OrdersHistoryPage";
import OrderDetailPage from "@/features/orders/OrderDetailPage";
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import ContactPage from '@/features/contact/ContactPage';
import NotFoundPage from '@/features/system/NotFoundPage';

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
        element: <CatalogPage />,
      },
      {
        path: "product/:id",
        element: <ProductDetailPage />,
      },
      {
        path: "cart",
        element: <CartPage />,
      },
      {
        path: "checkout",
        element: <CheckoutPage />,
      },
      {
        path: "checkout/confirm",
        element: <CheckoutConfirmPage />,
      },
      {
        path: "orders",
        element: <OrdersHistoryPage />,
      },
      {
        path: "orders/:id",
        element: <OrderDetailPage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "register",
        element: <RegisterPage />,
      },
      {
        path: "contact",
        element: <ContactPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);