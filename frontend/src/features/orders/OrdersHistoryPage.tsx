// frontend/src/features/orders/OrdersHistoryPage.tsx
// Page d'historique des commandes de l'utilisateur avec statuts séparés

import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  ShoppingBag,
  AlertCircle,
  Calendar,
  MapPin,
  CreditCard,
  Truck,
} from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";
import { ordersApi } from "@/services/api/orders";
import type { Order, PaymentStatus, FulfillmentStatus } from "@/types/order";

export default function OrdersHistoryPage() {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await ordersApi.getMyOrders();
        setOrders(data);
      } catch (err) {
        console.error("Error loading orders:", err);
        setError(t("orders.error_message"));
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [t]);

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'PENDING':
        return { variant: 'warning' as const, text: 'En attente paiement', icon: CreditCard };
      case 'PAID':
        return { variant: 'success' as const, text: 'Payé', icon: CreditCard };
      case 'FAILED':
        return { variant: 'error' as const, text: 'Échec', icon: AlertCircle };
      case 'REFUNDED':
        return { variant: 'default' as const, text: 'Remboursé', icon: CreditCard };
    }
  };

  const getFulfillmentStatusBadge = (status: FulfillmentStatus) => {
    switch (status) {
      case 'PENDING':
        return { variant: 'warning' as const, text: 'En attente', icon: Package };
      case 'PROCESSING':
        return { variant: 'default' as const, text: 'En préparation', icon: Package };
      case 'SHIPPED':
        return { variant: 'success' as const, text: 'Expédié', icon: Truck };
      case 'DELIVERED':
        return { variant: 'success' as const, text: 'Livré', icon: Package };
      case 'CANCELLED':
        return { variant: 'error' as const, text: 'Annulé', icon: AlertCircle };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(i18n.language === "fr" ? "fr-FR" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin mb-4" />
          <p className="text-dark-text-secondary">{t("orders.loading")}</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="text-red-400" size={40} />
          </div>
          <h1 className="font-display font-bold text-2xl text-dark-text mb-4">
            {t("orders.error")}
          </h1>
          <p className="text-dark-text-secondary mb-8">{error}</p>
          <Button variant="gradient" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  // Empty State
  if (orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
            <ShoppingBag className="text-dark-text-tertiary" size={48} />
          </div>
          <h1 className="font-display font-bold text-3xl text-dark-text mb-4">
            {t("orders.no_orders")}
          </h1>
          <p className="text-dark-text-secondary mb-8">
            {t("orders.no_orders_desc")}
          </p>
          <Link to="/catalog">
            <Button variant="gradient" size="lg">
              <Package size={20} />
              Explorer le catalogue
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-4xl lg:text-5xl mb-2">
            <span className="text-gradient animate-gradient-bg">
              {t("orders.title")}
            </span>
          </h1>
          <p className="text-dark-text-secondary">{t("orders.subtitle")}</p>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.map((order) => {
            const paymentBadge = getPaymentStatusBadge(order.payment_status);
            const fulfillmentBadge = getFulfillmentStatusBadge(order.fulfillment_status);
            
            return (
              <Card key={order.id} padding="none">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-display font-bold text-xl text-dark-text">
                          {t("orders.order_number")} #{order.id}
                        </h3>
                        <Badge variant={paymentBadge.variant} className="text-xs">
                          <paymentBadge.icon size={12} className="mr-1" />
                          {paymentBadge.text}
                        </Badge>
                        <Badge variant={fulfillmentBadge.variant} className="text-xs">
                          <fulfillmentBadge.icon size={12} className="mr-1" />
                          {fulfillmentBadge.text}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-dark-text-secondary flex-wrap">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(order.created_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin size={14} />
                          {order.city}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-display font-bold text-gradient animate-gradient-bg">
                        {order.total_xaf.toLocaleString(
                          i18n.language === "fr" ? "fr-FR" : "en-US",
                        )}{" "}
                        {t("common.currency")}
                      </div>
                      <p className="text-sm text-dark-text-tertiary">
                        {order.items.length} {t("orders.items")}
                      </p>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="space-y-2 mb-4">
                    {order.items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-holo-cyan" />
                          <span className="text-dark-text">
                            {item.title_snapshot}
                          </span>
                          <span className="text-dark-text-tertiary">
                            x{item.qty}
                          </span>
                        </div>
                        <span className="text-dark-text font-medium">
                          {item.line_total_xaf.toLocaleString(
                            i18n.language === "fr" ? "fr-FR" : "en-US",
                          )}{" "}
                          XAF
                        </span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs text-dark-text-tertiary italic">
                        + {order.items.length - 3} autre(s) article(s)
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  <Link to={`/orders/${order.id}`}>
                    <Button variant="secondary" className="w-full">
                      {t("orders.view_details")}
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}