// frontend/src/features/orders/OrdersHistoryPage.tsx
// Page d'historique des commandes de l'utilisateur
// Affiche la liste des commandes passées par l'utilisateur connecté

import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  ShoppingBag,
  AlertCircle,
  Calendar,
  MapPin,
} from "lucide-react";
import { Button, Card } from "@/components/ui";
import { ordersApi, type Order } from "@/services/api/orders";

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-500/10 text-green-400 border-green-500/30";
      case "PENDING_PAYMENT":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "CANCELLED":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PAID":
        return t("orders.status_paid");
      case "PENDING_PAYMENT":
        return t("orders.status_pending");
      case "CANCELLED":
        return t("orders.status_cancelled");
      default:
        return status;
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
            {t("catalog.retry")}
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
              {t("cart.explore")}
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
          {orders.map((order) => (
            <Card key={order.id} padding="none">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-display font-bold text-xl text-dark-text">
                        {t("orders.order_number")} #{order.id}
                      </h3>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}
                      >
                        {getStatusLabel(order.status)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-dark-text-secondary">
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

                {/* Items */}
                <div className="space-y-2 mb-4">
                  {order.items.map((item) => (
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
                        {t("common.currency")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Address */}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-dark-text-secondary">
                    <span className="font-medium text-dark-text">
                      {t("checkout.address_label")}:
                    </span>{" "}
                    {order.address}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-end">
                <Link to={`/orders/${order.id}`}>
                  <Button variant="secondary" size="sm">
                    {t("orders.view_details")}
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
