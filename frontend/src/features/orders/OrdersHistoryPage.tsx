import { useTranslation } from "react-i18next";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CreditCard,
  MapPin,
  Package,
  Store,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui";
import { ordersApi } from "@/services/api/orders";
import { getResilientOrders } from "@/data/mockOrders";
import type { Order, PaymentStatus, FulfillmentStatus } from "@/types/order";

const TrackingMap = lazy(() =>
  import("@/components/TrackingMap").catch(() => ({
    default: (() => (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-400 dark:bg-gray-800">
        Carte indisponible
      </div>
    )) as (typeof import("@/components/TrackingMap"))["default"],
  }))
);

type TabKey = "all" | "in_delivery" | "preparing" | "delivered" | "cancelled";

const TABS: { key: TabKey; label: string; statuses: FulfillmentStatus[] }[] = [
  { key: "all", label: "Toutes", statuses: [] },
  { key: "in_delivery", label: "En livraison", statuses: ["OUT_FOR_DELIVERY", "SHIPPED"] },
  { key: "preparing", label: "En cours", statuses: ["CREATED", "PAID_IN_ESCROW", "VENDOR_ACKNOWLEDGED", "PREPARING", "READY_FOR_PICKUP", "DRIVER_ASSIGNED", "PICKED_UP", "PENDING", "PROCESSING"] },
  { key: "delivered", label: "Livrées", statuses: ["DELIVERED", "BUYER_CONFIRMED", "AUTO_CONFIRMED", "RELEASED_TO_VENDOR"] },
  { key: "cancelled", label: "Annulées", statuses: ["CANCELLED", "REFUNDED"] },
];

const PREPARING_STATUSES: FulfillmentStatus[] = ["CREATED", "PAID_IN_ESCROW", "VENDOR_ACKNOWLEDGED", "PREPARING", "READY_FOR_PICKUP", "DRIVER_ASSIGNED", "PICKED_UP", "PENDING", "PROCESSING"];

function getFulfillmentBadge(status: FulfillmentStatus) {
  const green = { cls: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300", dot: "bg-green-500" };
  const blue = { cls: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300", dot: "bg-blue-500" };
  const orange = { cls: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300", dot: "bg-orange-500" };
  const gray = { cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", dot: "bg-gray-400" };

  const map: Record<string, { label: string; cls: string; dot: string }> = {
    OUT_FOR_DELIVERY: { label: "En livraison", ...orange },
    SHIPPED: { label: "En livraison", ...orange },
    READY_FOR_PICKUP: { label: "Prête au retrait", ...blue },
    DRIVER_ASSIGNED: { label: "Prise en charge", ...blue },
    PICKED_UP: { label: "Prise en charge", ...blue },
    DELIVERED: { label: "Livrée", ...green },
    BUYER_CONFIRMED: { label: "Livrée", ...green },
    AUTO_CONFIRMED: { label: "Livrée", ...green },
    RELEASED_TO_VENDOR: { label: "Terminée", ...green },
    DISPUTED: { label: "Litige", cls: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300", dot: "bg-red-500" },
    CANCELLED: { label: "Annulée", ...gray },
    REFUNDED: { label: "Remboursée", ...gray },
  };
  return map[status] ?? { label: "En préparation", cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300", dot: "bg-amber-500" };
}

function getPaymentBadge(status: PaymentStatus) {
  const map: Record<PaymentStatus, { label: string; cls: string }> = {
    PAID: { label: "Payé", cls: "text-green-600 dark:text-green-400" },
    PENDING: { label: "Paiement en attente", cls: "text-amber-600 dark:text-amber-400" },
    FAILED: { label: "Paiement échoué", cls: "text-red-600 dark:text-red-400" },
    REFUNDED: { label: "Remboursé", cls: "text-gray-500 dark:text-gray-400" },
  };
  return map[status];
}

const ACTIVE_STATUSES: FulfillmentStatus[] = ["OUT_FOR_DELIVERY", "SHIPPED", "PICKED_UP", "DRIVER_ASSIGNED"];

export default function OrdersHistoryPage() {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [cancelCandidate, setCancelCandidate] = useState<Order | null>(null);
  const [cancelFeedback, setCancelFeedback] = useState("");

  useEffect(() => {
    ordersApi
      .getMyOrders()
      .then((data) => {
        setOrders(getResilientOrders(data));
      })
      .catch(() => {
        setOrders([]);
        setError("Nous n'arrivons pas à charger vos commandes pour le moment. Réessayez dans un instant.");
      })
      .finally(() => setLoading(false));
  }, []);

  const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
  const fmt = (n: number) => `${Math.round(n).toLocaleString(locale)} FCFA`;
  const formatDate = (d: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));

  const filteredOrders = useMemo(() => {
    const tab = TABS.find((tabItem) => tabItem.key === activeTab);
    if (!tab || tab.statuses.length === 0) return orders;
    return orders.filter((order) => tab.statuses.includes(order.fulfillment_status));
  }, [orders, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { all: orders.length, in_delivery: 0, preparing: 0, delivered: 0, cancelled: 0 };
    for (const order of orders) {
      if (["OUT_FOR_DELIVERY", "SHIPPED"].includes(order.fulfillment_status)) counts.in_delivery++;
      else if (PREPARING_STATUSES.includes(order.fulfillment_status)) counts.preparing++;
      else if (["DELIVERED", "BUYER_CONFIRMED", "AUTO_CONFIRMED", "RELEASED_TO_VENDOR"].includes(order.fulfillment_status)) counts.delivered++;
      else if (["CANCELLED", "REFUNDED"].includes(order.fulfillment_status)) counts.cancelled++;
    }
    return counts;
  }, [orders]);

  const stats = {
    total: orders.length,
    inProgress: tabCounts.in_delivery + tabCounts.preparing,
    delivered: tabCounts.delivered,
  };

  const activeDeliveries = useMemo(
    () => orders.filter((order) => ["OUT_FOR_DELIVERY", "SHIPPED"].includes(order.fulfillment_status)),
    [orders],
  );

  const canCancelOrder = (order: Order) =>
    !["DELIVERED", "BUYER_CONFIRMED", "AUTO_CONFIRMED", "RELEASED_TO_VENDOR", "CANCELLED", "REFUNDED"].includes(order.fulfillment_status);

  const handleCancelOrder = (order: Order) => {
    setCancelCandidate(order);
    setCancelFeedback("");
  };

  const confirmCancelOrder = async () => {
    if (!cancelCandidate) return;
    const order = cancelCandidate;
    setCancelCandidate(null);

    try {
      const cancelled = await ordersApi.cancel(order.id);
      setOrders((current) => current.map((item) => (item.id === order.id ? cancelled : item)));
      setCancelFeedback(`Commande #${order.id} annulée.`);
      window.dispatchEvent(new Event("belivay-new-notification"));
    } catch {
      setCancelFeedback("Impossible d'annuler cette commande pour le moment.");
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f5f1] px-3 pb-24 pt-4 dark:bg-gray-950 sm:px-4 sm:py-8">
        <div className="mx-auto max-w-3xl space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/70 dark:bg-gray-900/70" />
          ))}
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f5f1] px-4 py-10 dark:bg-gray-950">
        <div className="mx-auto max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm dark:border-red-900/30 dark:bg-gray-900">
          <AlertCircle size={32} className="mx-auto mb-4 text-red-500" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t("orders.error")}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <Button variant="primary" className="mt-5 rounded-2xl" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5f1] px-3 pb-24 pt-4 dark:bg-gray-950 sm:px-4 sm:py-8">
      <div className="mx-auto max-w-3xl">
        {/* ══════════ EN-TÊTE ══════════ */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package size={20} />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold text-gray-900 dark:text-white sm:text-xl">Mes commandes</h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">Suivez et gérez tous vos achats</p>
            </div>
          </div>

          {orders.length > 0 && (
            <div className="flex gap-2">
              {[
                { value: stats.total, label: "Total", cls: "text-gray-900 dark:text-white" },
                { value: stats.inProgress, label: "En cours", cls: "text-amber-600 dark:text-amber-400" },
                { value: stats.delivered, label: "Livrées", cls: "text-green-600 dark:text-green-400" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-white px-3 py-1.5 text-center shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
                  <div className={`text-base font-black leading-none ${item.cls}`}>{item.value}</div>
                  <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-400">{item.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cancelFeedback && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
            <AlertCircle size={15} className="flex-shrink-0 text-primary" />
            <span className="min-w-0 flex-1">{cancelFeedback}</span>
            <button type="button" onClick={() => setCancelFeedback("")} className="flex-shrink-0 text-gray-400 hover:text-gray-600" aria-label="Fermer">
              <X size={15} />
            </button>
          </div>
        )}

        {orders.length === 0 ? (
          /* ══════════ AUCUNE COMMANDE ══════════ */
          <div className="rounded-[1.75rem] border border-orange-100 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-primary dark:bg-primary/10">
              <Package size={28} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">{t("orders.no_orders")}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">{t("orders.no_orders_desc")}</p>
            <Link to="/catalog" className="mt-6 inline-flex">
              <Button variant="primary" size="lg">
                <Package size={18} />
                Explorer le catalogue
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* ══════════ LIVRAISONS EN COURS ══════════ */}
            {activeDeliveries.length > 0 && (
              <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-2 border-b border-gray-50 px-4 py-3 dark:border-gray-800">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Truck size={16} />
                  </span>
                  <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Livraisons en cours</h3>
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                    {activeDeliveries.length}
                  </span>
                </div>
                <div className="grid gap-4 p-4 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="min-w-0">
                    <Suspense fallback={<div className="h-[220px] animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800 lg:h-[300px]" />}>
                      {(() => {
                        const mapOrder = selectedOrderId
                          ? orders.find((order) => order.id === selectedOrderId)
                          : activeDeliveries[0];
                        return (
                          <TrackingMap
                            className="h-[220px] w-full overflow-hidden rounded-2xl lg:h-[300px]"
                            destinationAddress={mapOrder?.address}
                            destinationCity={mapOrder?.city}
                            destinationLabel={mapOrder ? `${mapOrder.address}, ${mapOrder.city}` : undefined}
                          />
                        );
                      })()}
                    </Suspense>
                  </div>

                  <div className="min-w-0 space-y-2">
                    {activeDeliveries.slice(0, 3).map((o) => {
                      const b = getFulfillmentBadge(o.fulfillment_status);
                      const current = selectedOrderId ?? activeDeliveries[0]?.id;
                      const isSel = current === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setSelectedOrderId(o.id)}
                          className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                            isSel
                              ? "border-primary bg-orange-50 dark:border-primary/50 dark:bg-primary/10"
                              : "border-gray-100 bg-gray-50 hover:border-primary/30 dark:border-gray-800 dark:bg-gray-800"
                          }`}
                        >
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Truck size={14} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-bold text-gray-900 dark:text-white">Commande #{o.id}</span>
                            <span className="block truncate text-[10px] text-gray-400">
                              {o.items.length} article{o.items.length > 1 ? "s" : ""} · {fmt(o.total_xaf)} · {o.city}
                            </span>
                          </span>
                          <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${b.cls}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${b.dot} animate-pulse`} />
                            {b.label}
                          </span>
                        </button>
                      );
                    })}
                    <Link
                      to={`/orders/${selectedOrderId ?? activeDeliveries[0]?.id}`}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-white px-4 py-2.5 text-[12px] font-bold text-primary transition hover:bg-orange-50 dark:border-primary/30 dark:bg-gray-900 dark:hover:bg-primary/10"
                    >
                      <MapPin size={13} />
                      Suivre en détail
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ ONGLETS (scrollable) ══════════ */}
            <div className="-mx-3 mb-4 flex gap-2 overflow-x-auto scrollbar-hide px-3 sm:mx-0 sm:flex-wrap sm:px-0">
              {TABS.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold transition ${
                      active
                        ? "bg-primary text-white shadow-sm"
                        : "border border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                    }`}
                  >
                    {tab.label}
                    <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {tabCounts[tab.key]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ══════════ LISTE ══════════ */}
            {filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
                <Package size={30} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Aucune commande dans cette catégorie</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => {
                  const fb = getFulfillmentBadge(order.fulfillment_status);
                  const pb = getPaymentBadge(order.payment_status);
                  const isActive = ACTIVE_STATUSES.includes(order.fulfillment_status);
                  const extra = order.items.length - 2;
                  return (
                    <article
                      key={order.id}
                      className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className={`h-1 w-full ${fb.dot}`} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Package size={15} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-extrabold text-gray-900 dark:text-white">Commande #{order.id}</p>
                              <p className="text-[11px] text-gray-400">{formatDate(order.created_at)}</p>
                            </div>
                          </div>
                          <span className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${fb.cls}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${fb.dot} ${isActive ? "animate-pulse" : ""}`} />
                            {fb.label}
                          </span>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            {order.delivery_mode === "PICKUP" ? <Store size={12} /> : <Truck size={12} />}
                            {order.delivery_mode === "PICKUP" ? "Retrait" : "Livraison"}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} />
                            {order.city}
                          </span>
                          <span className={`inline-flex items-center gap-1 font-semibold ${pb.cls}`}>
                            <CreditCard size={12} />
                            {pb.label}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1.5 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                          {order.items.slice(0, 2).map((it) => (
                            <div key={it.id} className="flex items-center justify-between gap-2 text-[12px]">
                              <span className="truncate text-gray-700 dark:text-gray-200">{it.title_snapshot}</span>
                              <span className="flex-shrink-0 font-semibold text-gray-400">×{it.qty}</span>
                            </div>
                          ))}
                          {extra > 0 && (
                            <p className="text-[11px] font-semibold text-primary">
                              + {extra} autre{extra > 1 ? "s" : ""} article{extra > 1 ? "s" : ""}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Total</p>
                            <p className="text-[15px] font-black text-primary">{fmt(order.total_xaf)}</p>
                          </div>
                          <div className="flex flex-shrink-0 gap-2">
                            {canCancelOrder(order) && (
                              <button
                                type="button"
                                onClick={() => handleCancelOrder(order)}
                                className="rounded-full border border-gray-200 px-3 py-2 text-[12px] font-bold text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-red-900/20"
                              >
                                Annuler
                              </button>
                            )}
                            <Link
                              to={`/orders/${order.id}`}
                              className="rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-white transition hover:bg-primary-dark"
                            >
                              Détails
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════ MODALE D'ANNULATION ══════════ */}
      {cancelCandidate && (
        <div className="fixed inset-0 z-[1300] flex items-end bg-black/50 p-0 sm:items-center sm:justify-center sm:p-4">
          <div className="w-full rounded-t-[2rem] bg-white p-5 shadow-2xl dark:bg-gray-900 sm:max-w-md sm:rounded-[2rem] sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300">
                <XCircle size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500">Annulation</p>
                <h2 className="mt-1 text-xl font-extrabold text-gray-900 dark:text-white">
                  Commande #{cancelCandidate.id}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Cette commande passera dans la rubrique annulée. Les articles ne seront plus traités pour la livraison.
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {cancelCandidate.items[0]?.title_snapshot ?? "Commande"}
              </p>
              <p className="mt-1 text-lg font-black text-primary">
                {cancelCandidate.total_xaf.toLocaleString("fr-FR")} XAF
              </p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCancelCandidate(null)}
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Garder la commande
              </button>
              <button
                type="button"
                onClick={() => void confirmCancelOrder()}
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700"
              >
                Annuler la commande
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}