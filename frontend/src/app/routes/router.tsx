import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "@/app/layout/AppLayout";
import ProductListPage from "@/features/catalog/ProductListPage";
import ProductDetailPage from "@/features/catalog/ProductDetailPage";
import CartPage from "@/features/cart/CartPage";
import CheckoutPage from "@/features/checkout/CheckoutPage";
import OrderDetailPage from "@/features/orders/OrderDetailPage";
import { getOrder } from "@/services/api/orders";
import { listPaymentsByOrder } from "@/services/api/payments";
import { trackShipment } from "@/services/api/shipping";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <ProductListPage />,
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
        element: <Navigate to="/checkout" replace />,
      },
      {
        path: "order/:id",
        loader: async ({ params }) => {
          const n = Number(params.id);
          if (!Number.isFinite(n) || n <= 0) {
            throw new Response("Invalid order id", { status: 400 });
          }

          const [order, payments] = await Promise.all([
            getOrder(n),
            listPaymentsByOrder(n),
          ]);

          let shipment = null;
          try {
            shipment = await trackShipment(n);
          } catch {
            shipment = null;
          }

          return { order, payments, shipment };
        },
        element: <OrderDetailPage />,
      },
      {
        path: "*",
        element: (
          <div style={{ padding: 16 }}>
            <h1 style={{ marginTop: 0 }}>404</h1>
            <div style={{ color: "rgb(var(--muted))", marginBottom: 12 }}>
              Page introuvable.
            </div>
            <a href="/" style={{ fontWeight: 800 }}>
              Retour à l’accueil
            </a>
          </div>
        ),
      },
    ],
  },
]);
