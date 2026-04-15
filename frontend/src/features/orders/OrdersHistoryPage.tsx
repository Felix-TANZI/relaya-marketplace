import { useTranslation } from "react-i18next";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  CreditCard,
  Filter,
  MapPin,
  Package,
  Store,
  Truck,
  X,
} from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { ordersApi } from "@/services/api/orders";
import type { Order, PaymentStatus, FulfillmentStatus } from "@/types/order";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TrackingMap = lazy(() =>
  import("@/components/TrackingMap").catch(() => ({
    default: () => (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-400 dark:bg-gray-800">
        Carte indisponible
      </div>
    ),
  })) as any
);

type TabKey = "all" | "in_delivery" | "preparing" | "delivered" | "cancelled";

export default function OrdersHistoryPage() {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  useEffect(() => {
    ordersApi
      .getMyOrders()
      .then((data) => setOrders(data))
      .catch(() => setError(t("orders.error_message")))
      .finally(() => setLoading(false));
  }, [t]);

  /* ── Tabs config ── */
  const tabs: { key: TabKey; label: string; emoji: string; statuses: FulfillmentStatus[] }[] = [
    { key: "all", label: "Toutes", emoji: "", statuses: [] },
    { key: "in_delivery", label: "En livraison", emoji: "🚚", statuses: ["SHIPPED"] },
    { key: "preparing", label: "En cours", emoji: "📦", statuses: ["PENDING", "PROCESSING"] },
    { key: "delivered", label: "Livrées", emoji: "✅", statuses: ["DELIVERED"] },
    { key: "cancelled", label: "Annulées", emoji: "❌", statuses: ["CANCELLED"] },
  ];

  const filteredOrders = useMemo(() => {
    const tab = tabs.find((t) => t.key === activeTab);
    if (!tab || tab.statuses.length === 0) return orders;
    return orders.filter((o) => tab.statuses.includes(o.fulfillment_status));
  }, [orders, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { all: orders.length, in_delivery: 0, preparing: 0, delivered: 0, cancelled: 0 };
    for (const o of orders) {
      if (o.fulfillment_status === "SHIPPED") counts.in_delivery++;
      else if (["PENDING", "PROCESSING"].includes(o.fulfillment_status)) counts.preparing++;
      else if (o.fulfillment_status === "DELIVERED") counts.delivered++;
      else if (o.fulfillment_status === "CANCELLED") counts.cancelled++;
    }
    return counts;
  }, [orders]);

  const stats = useMemo(() => ({
    totalSpent: orders.reduce((s, o) => s + o.total_xaf, 0),
    delivered: orders.filter((o) => o.fulfillment_status === "DELIVERED").length,
    inProgress: orders.filter((o) => ["PENDING", "PROCESSING", "SHIPPED"].includes(o.fulfillment_status)).length,
  }), [orders]);

  const activeDeliveries = useMemo(
    () => orders.filter((o) => ["SHIPPED", "PROCESSING"].includes(o.fulfillment_status)),
    [orders],
  );

  /* ── Badge helpers ── */
  const getPaymentBadge = (s: PaymentStatus) => {
    const map: Record<PaymentStatus, { v: "warning" | "success" | "error" | "default"; t: string }> = {
      PENDING: { v: "warning", t: "En attente" },
      PAID: { v: "success", t: "Payé" },
      FAILED: { v: "error", t: "Échec" },
      REFUNDED: { v: "default", t: "Remboursé" },
    };
    return map[s];
  };
  const getFulfillmentBadge = (s: FulfillmentStatus) => {
    const map: Record<string, { v: "warning" | "success" | "error" | "default"; t: string; icon: typeof Package }> = {
      PENDING: { v: "warning", t: "En attente", icon: Package },
      PROCESSING: { v: "default", t: "En préparation", icon: Package },
      SHIPPED: { v: "success", t: "En livraison", icon: Truck },
      DELIVERED: { v: "success", t: "Livré", icon: Package },
      CANCELLED: { v: "error", t: "Annulé", icon: AlertCircle },
    };
    return map[s] || { v: "default" as const, t: s, icon: Package };
  };

  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat(i18n.language === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-36 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950">
        <div className="mx-auto max-w-md rounded-2xl border border-red-100 bg-white p-10 text-center shadow-sm dark:border-red-900/30 dark:bg-gray-900">
          <AlertCircle size={34} className="mx-auto mb-4 text-red-500" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("orders.error")}</h1>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <Button variant="primary" className="mt-5 rounded-2xl" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  /* ── Empty state ── */
  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950">
        <div className="mx-auto max-w-md rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Package size={40} className="mx-auto mb-4 text-primary" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("orders.no_orders")}</h1>
          <p className="mt-2 text-sm text-gray-500">{t("orders.no_orders_desc")}</p>
          <Link to="/catalog" className="mt-5 inline-flex">
            <Button variant="primary" className="rounded-2xl">Explorer le catalogue</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-6">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Mes Commandes</h1>
          <p className="mt-1 text-sm text-gray-500">Suivez et gérez toutes vos commandes</p>
        </div>

        {/* Tabs (V8 style) */}
        <div className="mb-5 flex gap-0 overflow-x-auto rounded-xl border border-gray-100 bg-gray-50 p-1 scrollbar-hide dark:border-gray-800 dark:bg-gray-900">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex min-w-[80px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-white text-primary shadow-sm dark:bg-gray-800"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              {tab.emoji && <span>{tab.emoji}</span>}
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                activeTab === tab.key
                  ? "bg-primary/10 text-primary"
                  : "bg-gray-200 text-gray-500 dark:bg-gray-700"
              }`}>
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Split layout: Map + Orders */}
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">

          {/* Left: Tracking Map */}
          <div className="order-2 lg:order-1">
            <div className="sticky top-20 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 flex items-center gap-2">
                <Truck size={16} className="text-primary" />
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                  Livraisons en cours
                </h3>
                {activeDeliveries.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {activeDeliveries.length}
                  </span>
                )}
              </div>
              <Suspense fallback={<div className="h-[300px] animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />}>
                <TrackingMap className="h-[300px] lg:h-[400px]" />
              </Suspense>
              {activeDeliveries.length > 0 && (
                <div className="mt-3 space-y-2">
                  {activeDeliveries.slice(0, 3).map((o) => (
                    <div
                      key={o.id}
                      onClick={() => setSelectedOrderId(o.id)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-all ${
                        selectedOrderId === o.id
                          ? "border border-primary bg-orange-50 dark:bg-primary/10"
                          : "border border-gray-100 bg-gray-50 hover:border-primary/30 dark:border-gray-800 dark:bg-gray-800"
                      }`}
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Truck size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-gray-900 dark:text-white">
                          Commande #{o.id}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {o.items.length} article{o.items.length > 1 ? "s" : ""} · {o.total_xaf.toLocaleString()} XAF
                        </p>
                      </div>
                      <div className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-green-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Orders list */}
          <div className="order-1 space-y-3 lg:order-2">
            {filteredOrders.map((order) => {
              const pBadge = getPaymentBadge(order.payment_status);
              const fBadge = getFulfillmentBadge(order.fulfillment_status);
              const isActive = ["SHIPPED", "PROCESSING"].includes(order.fulfillment_status);

              return (
                <article
                  key={order.id}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md dark:bg-gray-900 ${
                    isActive
                      ? "border-l-[3px] border-l-primary border-t-gray-100 border-r-gray-100 border-b-gray-100 dark:border-t-gray-800 dark:border-r-gray-800 dark:border-b-gray-800"
                      : order.fulfillment_status === "DELIVERED"
                      ? "border-l-[3px] border-l-green-500 border-t-gray-100 border-r-gray-100 border-b-gray-100 dark:border-t-gray-800 dark:border-r-gray-800 dark:border-b-gray-800"
                      : order.fulfillment_status === "CANCELLED"
                      ? "border-l-[3px] border-l-red-500 border-t-gray-100 border-r-gray-100 border-b-gray-100 dark:border-t-gray-800 dark:border-r-gray-800 dark:border-b-gray-800"
                      : "border-gray-100 dark:border-gray-800"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3 dark:border-gray-800">
                    <div>
                      <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                        #{order.id}
                      </p>
                      <p className="text-[11px] text-gray-400">{fmtDate(order.created_at)}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge variant={fBadge.v} className="text-[10px]">
                        {fBadge.t}
                      </Badge>
                      <Badge variant={pBadge.v} className="text-[10px]">
                        {pBadge.t}
                      </Badge>
                    </div>
                  </div>

                  {/* Live delivery banner */}
                  {order.fulfillment_status === "SHIPPED" && (
                    <div className="mx-4 my-2 flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 dark:bg-gray-800">
                      <div className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-green-400" />
                      <p className="flex-1 text-xs text-white">Livraison en cours vers {order.city || "votre adresse"}</p>
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        className="flex-shrink-0 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-white"
                      >
                        Voir sur la carte
                      </button>
                    </div>
                  )}

                  {/* Items */}
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    {order.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-lg dark:border-gray-700 dark:bg-gray-800">
                          <Package size={16} className="text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-[150px] truncate text-xs font-bold text-gray-900 dark:text-white">
                            {item.title_snapshot}
                          </p>
                          <p className="text-[10px] text-gray-400">Qté {item.qty}</p>
                        </div>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-[11px] font-bold text-gray-400">+{order.items.length - 3} autre{order.items.length - 3 > 1 ? "s" : ""}</span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                    <p className="text-[15px] font-extrabold text-primary">
                      {order.total_xaf.toLocaleString("fr-FR")} XAF
                    </p>
                    <div className="flex gap-2">
                      <Link to={`/orders/${order.id}`}>
                        <Button variant="primary" className="rounded-lg px-4 py-2 text-xs">
                          Détails
                        </Button>
                      </Link>
                      {order.fulfillment_status === "DELIVERED" && (
                        <Button variant="ghost" className="rounded-lg px-4 py-2 text-xs">
                          Laisser un avis
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            {filteredOrders.length === 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
                <Package size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-bold text-gray-500">Aucune commande dans cette catégorie</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
