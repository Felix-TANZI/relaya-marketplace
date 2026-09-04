import { useTranslation } from "react-i18next";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, Lock, MapPin, Package, ShieldCheck, Store, Truck, X, XCircle } from "lucide-react";
import { ordersApi } from "@/services/api/orders";
import { getResilientOrders } from "@/data/mockOrders";
import type { Order, PaymentStatus, FulfillmentStatus } from "@/types/order";
import { PfShellStyles } from "@/styles/pfShell";
import { OperatorLogo } from "@/features/payments/OperatorLogo";
import PaymentSheet from "@/features/payments/PaymentSheet";

const TrackingMap = lazy(() =>
  import("@/components/TrackingMap").catch(() => ({
    default: (() => (
      <div style={{ height: "100%", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 18, background: "var(--pf-s3)", fontSize: 13, color: "var(--pf-muted)" }}>
        Carte indisponible
      </div>
    )) as (typeof import("@/components/TrackingMap"))["default"],
  }))
);

type TabKey = "all" | "to_pay" | "in_delivery" | "preparing" | "delivered" | "cancelled";

const PREPARING: FulfillmentStatus[] = ["CREATED", "PAID_IN_ESCROW", "VENDOR_ACKNOWLEDGED", "PREPARING", "READY_FOR_PICKUP", "DRIVER_ASSIGNED", "PICKED_UP", "PENDING", "PROCESSING"];
const DELIVERED: FulfillmentStatus[] = ["DELIVERED", "BUYER_CONFIRMED", "AUTO_CONFIRMED", "RELEASED_TO_VENDOR"];
const SHIPPING: FulfillmentStatus[] = ["OUT_FOR_DELIVERY", "SHIPPED"];
const CLOSED: FulfillmentStatus[] = ["CANCELLED", "REFUNDED"];
const LIVE: FulfillmentStatus[] = ["OUT_FOR_DELIVERY", "SHIPPED", "PICKED_UP", "DRIVER_ASSIGNED"];

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "to_pay", label: "À payer" },
  { key: "in_delivery", label: "En livraison" },
  { key: "preparing", label: "En cours" },
  { key: "delivered", label: "Livrées" },
  { key: "cancelled", label: "Annulées" },
];

const FULFILLMENT_LABELS: Record<string, string> = {
  OUT_FOR_DELIVERY: "En livraison", SHIPPED: "En livraison",
  READY_FOR_PICKUP: "Prête au retrait", DRIVER_ASSIGNED: "Prise en charge", PICKED_UP: "Prise en charge",
  DELIVERED: "Livrée", BUYER_CONFIRMED: "Livrée", AUTO_CONFIRMED: "Livrée",
  RELEASED_TO_VENDOR: "Terminée", DISPUTED: "Litige", CANCELLED: "Annulée", REFUNDED: "Remboursée",
};

const PAYMENT_LABELS: Record<PaymentStatus, { label: string; tone: "ok" | "wait" | "err" | "mut" }> = {
  PAID: { label: "Payé", tone: "ok" },
  PENDING: { label: "À payer", tone: "wait" },
  FAILED: { label: "Paiement échoué", tone: "err" },
  REFUNDED: { label: "Remboursé", tone: "mut" },
};

// Flux de retention a l'annulation — Addendum Decisions v1.0 §5.1
type CancelReasonCode = "CHEAPER_ELSEWHERE" | "CHANGED_MIND" | "TOO_SLOW" | "ORDER_MISTAKE" | "PAYMENT_ISSUE" | "OTHER";
type CancelStep = "reason" | "alternative" | "confirm";

const CANCEL_REASONS: { key: CancelReasonCode; label: string }[] = [
  { key: "CHEAPER_ELSEWHERE", label: "Trouvé moins cher ailleurs" },
  { key: "CHANGED_MIND", label: "Changement d'avis" },
  { key: "TOO_SLOW", label: "Délai trop long" },
  { key: "ORDER_MISTAKE", label: "Erreur de commande" },
  { key: "PAYMENT_ISSUE", label: "Problème de paiement" },
  { key: "OTHER", label: "Autre raison" },
];

const CANCEL_ALTERNATIVES: Record<CancelReasonCode, { title: string; body: string; cta?: string } | null> = {
  CHEAPER_ELSEWHERE: {
    title: "Votre argent est protégé",
    body: "Le paiement reste bloqué en séquestre et n'est jamais versé au vendeur avant que vous ayez confirmé la réception. Rien ne presse à annuler pour ce motif.",
  },
  CHANGED_MIND: {
    title: "Votre argent est protégé",
    body: "Le montant reste sous séquestre jusqu'à confirmation de réception : vous ne risquez rien à laisser la commande suivre son cours si vous hésitez encore.",
  },
  TOO_SLOW: {
    title: "Vérifiez le délai réel",
    body: "Consultez le suivi détaillé pour voir l'heure estimée d'arrivée actuelle. Vous pouvez aussi basculer vers un retrait en point relais, souvent plus rapide.",
    cta: "Voir le suivi détaillé",
  },
  ORDER_MISTAKE: {
    title: "Une erreur sur la commande ?",
    body: "Contactez le support avant d'annuler : une correction (adresse, article, quantité) est souvent possible sans perdre votre place dans le circuit de préparation.",
    cta: "Contacter le support",
  },
  PAYMENT_ISSUE: {
    title: "Un souci de paiement ?",
    body: "Le support peut vérifier votre transaction et régulariser sans qu'il soit nécessaire d'annuler la commande.",
    cta: "Contacter le support",
  },
  OTHER: null,
};

export default function OrdersHistoryPage() {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [cancelCandidate, setCancelCandidate] = useState<Order | null>(null);
  const [cancelStep, setCancelStep] = useState<CancelStep>("reason");
  const [cancelReason, setCancelReason] = useState<CancelReasonCode>("OTHER");
  const [cancelFeedback, setCancelFeedback] = useState("");
  const [payTarget, setPayTarget] = useState<Order | null>(null);

  const load = () => {
    ordersApi.getMyOrders()
      .then((data) => setOrders(getResilientOrders(data)))
      .catch(() => {
        setOrders([]);
        setError("Nous n'arrivons pas à charger vos commandes pour le moment. Réessayez dans un instant.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
  const fmt = (n: number) => `${Math.round(n).toLocaleString(locale)} FCFA`;
  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));

  const isUnpaid = (o: Order) =>
    (o.payment_status === "PENDING" || o.payment_status === "FAILED") && !CLOSED.includes(o.fulfillment_status);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { all: orders.length, to_pay: 0, in_delivery: 0, preparing: 0, delivered: 0, cancelled: 0 };
    for (const o of orders) {
      if (isUnpaid(o)) c.to_pay++;
      if (SHIPPING.includes(o.fulfillment_status)) c.in_delivery++;
      else if (PREPARING.includes(o.fulfillment_status)) c.preparing++;
      else if (DELIVERED.includes(o.fulfillment_status)) c.delivered++;
      else if (CLOSED.includes(o.fulfillment_status)) c.cancelled++;
    }
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    switch (activeTab) {
      case "to_pay": return orders.filter(isUnpaid);
      case "in_delivery": return orders.filter((o) => SHIPPING.includes(o.fulfillment_status));
      case "preparing": return orders.filter((o) => PREPARING.includes(o.fulfillment_status));
      case "delivered": return orders.filter((o) => DELIVERED.includes(o.fulfillment_status));
      case "cancelled": return orders.filter((o) => CLOSED.includes(o.fulfillment_status));
      default: return orders;
    }
  }, [orders, activeTab]);

  const activeDeliveries = useMemo(() => orders.filter((o) => SHIPPING.includes(o.fulfillment_status)), [orders]);
  const escrowTotal = orders.filter((o) => o.payment_status === "PAID" && !DELIVERED.includes(o.fulfillment_status))
    .reduce((s, o) => s + o.total_xaf, 0);

  // Annulation gratuite uniquement tant qu'aucun colis n'a ete ramasse —
  // Addendum Decisions v1.0 §5.1. Au-dela, ca passe par le parcours de retour.
  const NOT_YET_PICKED_UP: FulfillmentStatus[] = ["CREATED", "PAID_IN_ESCROW", "VENDOR_ACKNOWLEDGED", "PREPARING", "READY_FOR_PICKUP", "DRIVER_ASSIGNED", "PENDING"];
  const canCancel = (o: Order) => NOT_YET_PICKED_UP.includes(o.fulfillment_status);

  const confirmCancel = async () => {
    if (!cancelCandidate) return;
    const order = cancelCandidate;
    setCancelCandidate(null);
    try {
      const cancelled = await ordersApi.cancel(order.id, cancelReason);
      setOrders((cur) => cur.map((i) => (i.id === order.id ? cancelled : i)));
      setCancelFeedback(`Commande #${order.id} annulée. Remboursement intégral en cours.`);
      window.dispatchEvent(new Event("belivay-new-notification"));
    } catch {
      setCancelFeedback("Impossible d'annuler cette commande pour le moment.");
    } finally {
      setCancelStep("reason");
      setCancelReason("OTHER");
    }
  };

  if (loading) {
    return (
      <>
        <PfShellStyles />
        <div className="pf-root pf-page">
          <div className="pf-wrap" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="pf-glass-panel" style={{ height: 148, opacity: .55 }} />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PfShellStyles />
        <div className="pf-root pf-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="pf-glass-panel" style={{ maxWidth: 420, textAlign: "center" }}>
            <span className="pf-notif-ic" style={{ margin: "0 auto 14px", background: "rgba(217,45,32,.12)", color: "#d92d20" }}>
              <AlertCircle size={22} />
            </span>
            <div className="pf-panel-title">{t("orders.error")}</div>
            <p className="pf-panel-sub">{error}</p>
            <button className="pf-btn-accent" style={{ marginTop: 18 }} onClick={() => window.location.reload()}>Réessayer</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PfShellStyles />
      <div className="pf-root pf-page">
        <div className="pf-wrap">

          {/* En-tête */}
          <div className="pf-ident pf-anim">
            <span className="pf-notif-ic"><Package size={20} /></span>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="pf-k">Espace client</div>
              <div className="pf-name" style={{ fontSize: 21, marginTop: 2 }}>Mes commandes</div>
              <div className="pf-meta">
                <span>{orders.length} commande{orders.length > 1 ? "s" : ""}</span>
                {counts.to_pay > 0 && <span style={{ color: "var(--pf-accent)", fontWeight: 700 }}>{counts.to_pay} à payer</span>}
                {escrowTotal > 0 && <span>{fmt(escrowTotal)} sous séquestre</span>}
              </div>
            </div>
          </div>

          {cancelFeedback && (
            <div className="pf-info-note" style={{ marginTop: 14 }}>
              <span className="pf-info-ic"><AlertCircle size={15} /></span>
              <div className="pf-muted-sm" style={{ flex: 1 }}>{cancelFeedback}</div>
              <button className="pf-x" style={{ width: 28, height: 28 }} onClick={() => setCancelFeedback("")} aria-label="Fermer"><X size={14} /></button>
            </div>
          )}

          {orders.length === 0 ? (
            <div className="pf-glass-panel pf-anim" style={{ marginTop: 20, textAlign: "center", padding: 32 }}>
              <span className="pf-notif-ic" style={{ margin: "0 auto 16px", width: 60, height: 60, borderRadius: 20 }}><Package size={26} /></span>
              <div className="pf-panel-title">{t("orders.no_orders")}</div>
              <p className="pf-panel-sub" style={{ maxWidth: 380, margin: "8px auto 0" }}>{t("orders.no_orders_desc")}</p>
              <Link to="/catalog"><button className="pf-btn-accent" style={{ marginTop: 20 }}><Package size={15} />Explorer le catalogue</button></Link>
            </div>
          ) : (
            <>
              {/* Bandeau de reprise de paiement */}
              {counts.to_pay > 0 && (
                <div className="pf-hero pf-anim" style={{ marginTop: 16 }}>
                  <i />
                  <div className="pf-hero-k">Paiement en attente</div>
                  <div className="pf-hero-v" style={{ fontSize: 28 }}>
                    {counts.to_pay} commande{counts.to_pay > 1 ? "s" : ""}<span>à régler</span>
                  </div>
                  <div style={{ position: "relative", marginTop: 12, fontSize: 12, lineHeight: 1.6, opacity: .9 }}>
                    Les articles restent réservés une heure. Aucun montant n'a été débité.
                  </div>
                  <button
                    onClick={() => setActiveTab("to_pay")}
                    style={{ position: "relative", marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.22)", border: "1px solid rgba(255,255,255,.35)", color: "#fff", padding: "9px 16px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    <Lock size={14} />Voir les commandes à payer
                  </button>
                </div>
              )}

              {/* Livraisons en cours */}
              {activeDeliveries.length > 0 && (
                <section className="pf-card pf-anim" style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "14px 18px", borderBottom: "1px solid var(--pf-border)" }}>
                    <span className="pf-order-ic"><Truck size={16} /></span>
                    <div className="pf-card-title">Livraisons en cours</div>
                    <span className="pf-badge-soft" style={{ marginLeft: "auto" }}>{activeDeliveries.length}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.05fr) minmax(0,.95fr)", gap: 16, padding: 16 }}>
                    <Suspense fallback={<div style={{ height: 260, borderRadius: 18, background: "var(--pf-s3)" }} />}>
                      {(() => {
                        const mapOrder = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) : activeDeliveries[0];
                        return (
                          <TrackingMap
                            className="rounded-none border-0"
                            height={260}
                            destinationAddress={mapOrder?.address}
                            destinationCity={mapOrder?.city}
                            destinationLabel={mapOrder ? `${mapOrder.address}, ${mapOrder.city}` : undefined}
                          />
                        );
                      })()}
                    </Suspense>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {activeDeliveries.slice(0, 3).map((o) => {
                        const sel = (selectedOrderId ?? activeDeliveries[0]?.id) === o.id;
                        return (
                          <button key={o.id} type="button" onClick={() => setSelectedOrderId(o.id)}
                            className={`pf-addr${sel ? " def" : ""}`}
                            style={{ textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                            <div className="pf-addr-label">
                              <span className="pf-addr-ic"><Truck size={14} /></span>
                              Commande #{o.id}
                              <span className="pf-badge-soft">{FULFILLMENT_LABELS[o.fulfillment_status] ?? "En préparation"}</span>
                            </div>
                            <div className="pf-addr-line">
                              {o.items.length} article{o.items.length > 1 ? "s" : ""} · {fmt(o.total_xaf)} · {o.city}
                            </div>
                          </button>
                        );
                      })}
                      <Link to={`/orders/${selectedOrderId ?? activeDeliveries[0]?.id}`}>
                        <button className="pf-btn-ghost pf-btn-block" style={{ marginTop: 0 }}><MapPin size={14} />Suivre en détail</button>
                      </Link>
                    </div>
                  </div>
                </section>
              )}

              {/* Onglets */}
              <div className="pf-type-toggle" style={{ marginTop: 18, flexWrap: "wrap" }}>
                {TABS.map((tab) => (
                  <button key={tab.key} type="button"
                    className={`pf-type-btn${activeTab === tab.key ? " on" : ""}`}
                    onClick={() => setActiveTab(tab.key)}>
                    {tab.label}
                    <span style={{ marginLeft: 7, opacity: .7, fontVariantNumeric: "tabular-nums" }}>{counts[tab.key]}</span>
                  </button>
                ))}
              </div>

              {/* Liste */}
              {filtered.length === 0 ? (
                <div className="pf-glass-panel" style={{ marginTop: 16, padding: 34, textAlign: "center" }}>
                  <Package size={28} style={{ margin: "0 auto 10px", color: "var(--pf-muted)" }} />
                  <div className="pf-muted-sm">Aucune commande dans cette catégorie</div>
                </div>
              ) : (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                  {filtered.map((order) => {
                    const pb = PAYMENT_LABELS[order.payment_status];
                    const unpaid = isUnpaid(order);
                    const extra = order.items.length - 2;
                    const live = LIVE.includes(order.fulfillment_status);
                    return (
                      <article key={order.id} className="pf-card pf-anim">
                        <div className="pf-row-between" style={{ flexWrap: "wrap", gap: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                            <span className="pf-order-ic"><Package size={16} /></span>
                            <div style={{ minWidth: 0 }}>
                              <div className="pf-order-id">Commande #{order.id}</div>
                              <div className="pf-muted-sm">{fmtDate(order.created_at)}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span className={`pf-badge-state ${pb.tone}`}>{pb.label}</span>
                            <span className="pf-chip">
                              {live && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pf-accent)" }} />}
                              {FULFILLMENT_LABELS[order.fulfillment_status] ?? "En préparation"}
                            </span>
                          </div>
                        </div>

                        <div className="pf-meta" style={{ marginTop: 12 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            {order.delivery_mode === "PICKUP" ? <Store size={12} /> : <Truck size={12} />}
                            {order.delivery_mode === "PICKUP" ? "Retrait" : "Livraison"}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><MapPin size={12} />{order.city}</span>
                          {order.payment_status === "PAID" && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <OperatorLogo provider="MTN_MOMO" size={18} />Mobile Money
                            </span>
                          )}
                        </div>

                        <div style={{ marginTop: 14, padding: 13, borderRadius: 14, background: "var(--pf-s3)", border: "1px solid var(--pf-border)" }}>
                          {order.items.slice(0, 2).map((it) => (
                            <div key={it.id} className="pf-summary-row">
                              <span className="pf-muted-sm" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title_snapshot}</span>
                              <span className="pf-summary-v">×{it.qty}</span>
                            </div>
                          ))}
                          {extra > 0 && (
                            <div className="pf-k" style={{ marginTop: 6 }}>+ {extra} autre{extra > 1 ? "s" : ""} article{extra > 1 ? "s" : ""}</div>
                          )}
                        </div>

                        <div className="pf-row-between" style={{ marginTop: 14, flexWrap: "wrap", gap: 12 }}>
                          <div>
                            <div className="pf-k">{unpaid ? "Reste à payer" : "Total"}</div>
                            <div className="pf-total-row"><b style={{ fontSize: 20 }}>{fmt(order.total_xaf)}</b></div>
                          </div>
                          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                            {canCancel(order) && (
                              <button className="pf-btn-danger" onClick={() => { setCancelStep("reason"); setCancelReason("OTHER"); setCancelCandidate(order); }}>Annuler</button>
                            )}
                            {unpaid && (
                              <button className="pf-btn-accent" onClick={() => setPayTarget(order)}>
                                <Lock size={14} />Reprendre le paiement
                              </button>
                            )}
                            <Link to={`/orders/${order.id}`}>
                              <button className={unpaid ? "pf-btn-ghost" : "pf-btn-accent"}>Détails</button>
                            </Link>
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
      </div>

      {/* Modale d'annulation — flux en 3 etapes (Addendum Decisions v1.0 §5.1) */}
      {cancelCandidate && (
        <div className="pf-root">
          <div className="pf-backdrop">
            <div className="pf-sheet" style={{ maxWidth: 480 }}>
              <div style={{ display: "flex", gap: 14, marginBottom: 4 }}>
                <span className="pf-notif-ic" style={{ background: "rgba(217,45,32,.12)", color: "#d92d20" }}><XCircle size={22} /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="pf-k" style={{ color: "#d92d20" }}>Annulation</div>
                  <div className="pf-panel-title" style={{ fontSize: 19, marginTop: 3 }}>Commande #{cancelCandidate.id}</div>
                  <p className="pf-panel-sub">
                    {cancelStep === "reason" && "Pourquoi souhaitez-vous annuler cette commande ?"}
                    {cancelStep === "alternative" && "Avant de confirmer, voici une piste qui pourrait vous éviter d'annuler."}
                    {cancelStep === "confirm" && "Cette commande passera dans la rubrique annulée. Les articles ne seront plus traités pour la livraison."}
                  </p>
                </div>
              </div>

              {cancelStep === "reason" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                  {CANCEL_REASONS.map((r) => (
                    <button key={r.key} type="button" className="pf-addr" style={{ textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
                      onClick={() => {
                        setCancelReason(r.key);
                        setCancelStep(CANCEL_ALTERNATIVES[r.key] ? "alternative" : "confirm");
                      }}>
                      <div className="pf-addr-label">{r.label}</div>
                    </button>
                  ))}
                  <button className="pf-btn-ghost pf-btn-block" style={{ marginTop: 6 }} onClick={() => setCancelCandidate(null)}>Garder la commande</button>
                </div>
              )}

              {cancelStep === "alternative" && cancelReason && CANCEL_ALTERNATIVES[cancelReason] && (
                <div style={{ marginTop: 14 }}>
                  <div className="pf-card" style={{ display: "flex", gap: 12 }}>
                    <span className="pf-notif-ic" style={{ background: "rgba(16,185,129,.12)", color: "#10b981", flexShrink: 0 }}><ShieldCheck size={18} /></span>
                    <div>
                      <div className="pf-support-t">{CANCEL_ALTERNATIVES[cancelReason]!.title}</div>
                      <p className="pf-panel-sub" style={{ marginTop: 4 }}>{CANCEL_ALTERNATIVES[cancelReason]!.body}</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                    {CANCEL_ALTERNATIVES[cancelReason]!.cta && (
                      <Link to={`/orders/${cancelCandidate.id}`}>
                        <button className="pf-btn-accent pf-btn-block" onClick={() => setCancelCandidate(null)}>
                          {CANCEL_ALTERNATIVES[cancelReason]!.cta}
                        </button>
                      </Link>
                    )}
                    <button className="pf-btn-ghost pf-btn-block" onClick={() => setCancelCandidate(null)}>Garder la commande</button>
                    <button className="pf-btn-danger pf-btn-block" onClick={() => setCancelStep("confirm")}>Continuer l'annulation</button>
                    <button type="button" onClick={() => setCancelStep("reason")}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center", background: "none", border: "none", color: "var(--pf-muted)", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", padding: 4 }}>
                      <ArrowLeft size={13} />Changer de motif
                    </button>
                  </div>
                </div>
              )}

              {cancelStep === "confirm" && (
                <>
                  <div className="pf-card" style={{ marginTop: 16 }}>
                    <div className="pf-support-t">{cancelCandidate.items[0]?.title_snapshot ?? "Commande"}</div>
                    <div className="pf-total-row" style={{ marginTop: 6 }}><b>{fmt(cancelCandidate.total_xaf)}</b></div>
                  </div>
                  <p className="pf-panel-sub" style={{ marginTop: 10 }}>
                    L'annulation est définitive. Remboursement intégral vers votre moyen de paiement d'origine.
                  </p>
                  <button className="pf-btn-ghost pf-btn-block" style={{ marginTop: 8 }} onClick={() => setCancelCandidate(null)}>Garder la commande</button>
                  <button className="pf-btn-danger pf-btn-block" onClick={() => void confirmCancel()}>Confirmer l'annulation</button>
                  {CANCEL_ALTERNATIVES[cancelReason] && (
                    <button type="button" onClick={() => setCancelStep("alternative")}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center", background: "none", border: "none", color: "var(--pf-muted)", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", padding: 4, marginTop: 4, width: "100%" }}>
                      <ArrowLeft size={13} />Retour
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {payTarget && (
        <PaymentSheet
          orderId={payTarget.id}
          amountXaf={payTarget.total_xaf}
          defaultPhone={payTarget.customer_phone}
          onClose={() => { setPayTarget(null); load(); }}
          onSuccess={() => { setPayTarget(null); load(); }}
        />
      )}
    </>
  );
}
