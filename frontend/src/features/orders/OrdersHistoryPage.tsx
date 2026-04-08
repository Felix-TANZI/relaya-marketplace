import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  CreditCard,
  MapPin,
  Package,
  Truck,
} from "lucide-react";
import { Button, Badge } from "@/components/ui";
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

    void fetchOrders();
  }, [t]);

  const stats = useMemo(() => {
    const totalSpent = orders.reduce((sum, order) => sum + order.total_xaf, 0);
    const delivered = orders.filter(
      (order) => order.fulfillment_status === "DELIVERED",
    ).length;
    const inProgress = orders.filter((order) =>
      ["PENDING", "PROCESSING", "SHIPPED"].includes(order.fulfillment_status),
    ).length;

    return { totalSpent, delivered, inProgress };
  }, [orders]);

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "PENDING":
        return { variant: "warning" as const, text: "En attente paiement", icon: CreditCard };
      case "PAID":
        return { variant: "success" as const, text: "Payé", icon: CreditCard };
      case "FAILED":
        return { variant: "error" as const, text: "Échec", icon: AlertCircle };
      case "REFUNDED":
        return { variant: "default" as const, text: "Remboursé", icon: CreditCard };
    }
  };

  const getFulfillmentStatusBadge = (status: FulfillmentStatus) => {
    switch (status) {
      case "PENDING":
        return { variant: "warning" as const, text: "En attente", icon: Package };
      case "PROCESSING":
        return { variant: "default" as const, text: "En préparation", icon: Package };
      case "SHIPPED":
        return { variant: "success" as const, text: "Expédié", icon: Truck };
      case "DELIVERED":
        return { variant: "success" as const, text: "Livré", icon: Package };
      case "CANCELLED":
        return { variant: "error" as const, text: "Annulé", icon: AlertCircle };
    }
  };

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat(i18n.language === "fr" ? "fr-FR" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(dateString));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f5f1] px-4 py-10 dark:bg-gray-950">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton h-36 rounded-[1.75rem]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f5f1] px-4 py-10 dark:bg-gray-950">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-red-100 bg-white p-10 text-center shadow-sm dark:border-red-900/30 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-900/20">
            <AlertCircle size={34} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("orders.error")}
          </h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <Button variant="primary" className="mt-6 rounded-2xl" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f5f1] px-4 py-10 dark:bg-gray-950">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-gray-100 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 text-primary dark:bg-primary/10">
            <Package size={34} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("orders.no_orders")}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-gray-500 dark:text-gray-400">
            {t("orders.no_orders_desc")}
          </p>
          <Link to="/catalog" className="mt-6 inline-flex">
            <Button variant="primary" className="rounded-2xl">
              Explorer le catalogue
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5f1] px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900" data-tutorial="orders-header">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Commandes
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Historique et suivi
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Suivez vos achats, paiements et livraisons depuis un seul endroit.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#fff7ef] px-4 py-3 dark:bg-gray-800">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Commandes</div>
                <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</div>
              </div>
              <div className="rounded-2xl bg-[#fff7ef] px-4 py-3 dark:bg-gray-800">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">En cours</div>
                <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</div>
              </div>
              <div className="rounded-2xl bg-[#fff7ef] px-4 py-3 dark:bg-gray-800">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Dépensé</div>
                <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                  {stats.totalSpent.toLocaleString("fr-FR")} XAF
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {orders.map((order) => {
            const paymentBadge = getPaymentStatusBadge(order.payment_status);
            const fulfillmentBadge = getFulfillmentStatusBadge(order.fulfillment_status);

            return (
              <article
                key={order.id}
                className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Commande #{order.id}
                      </h2>
                      <Badge variant={paymentBadge.variant} className="text-xs">
                        <paymentBadge.icon size={12} className="mr-1" />
                        {paymentBadge.text}
                      </Badge>
                      <Badge variant={fulfillmentBadge.variant} className="text-xs">
                        <fulfillmentBadge.icon size={12} className="mr-1" />
                        {fulfillmentBadge.text}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-2">
                        <Calendar size={14} />
                        {formatDate(order.created_at)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <MapPin size={14} />
                        {order.city}
                      </span>
                      <span>{order.items.length} article{order.items.length > 1 ? "s" : ""}</span>
                    </div>

                    <div className="mt-4 space-y-2 rounded-[1.25rem] bg-[#fffaf5] p-4 dark:bg-gray-800">
                      {order.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-gray-900 dark:text-white">
                              {item.title_snapshot}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Qté {item.qty}
                            </div>
                          </div>
                          <div className="shrink-0 font-semibold text-primary">
                            {item.line_total_xaf.toLocaleString("fr-FR")} XAF
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-4 xl:max-w-[220px]">
                    <div className="rounded-[1.25rem] bg-[#fff7ef] px-4 py-4 text-left dark:bg-gray-800 xl:text-right">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                        Total
                      </div>
                      <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        {order.total_xaf.toLocaleString("fr-FR")} XAF
                      </div>
                    </div>

                    <Link to={`/orders/${order.id}`}>
                      <Button variant="primary" className="w-full rounded-2xl">
                        {t("orders.view_details")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
