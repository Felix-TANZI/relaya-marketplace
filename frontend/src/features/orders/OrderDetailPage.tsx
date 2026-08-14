import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import {
  AlertCircle, AlertTriangle, ArrowLeft, CheckCircle, Clock3, MapPin, MessageCircleMore,
  Package, Phone, Scale, Send, ShieldCheck, Store, Truck, UserCircle2, Warehouse,
} from "lucide-react";
import { ordersApi } from "@/services/api/orders";
import { customerApi, type Dispute, type Shipment, type OrderChatMessage } from "@/services/api/customer";
import TrackingMap from "@/components/TrackingMap";
import type { FulfillmentStatus, Order } from "@/types/order";
import { formatRemainingDisputeTime, getDisputeEligibility } from "@/lib/orderDisputes";
import { useAuth } from "@/context/AuthContext";
import { PfShellStyles } from "@/styles/pfShell";
import { OrderPaymentPanel } from "@/features/payments/OrderPaymentPanel";

const DISPUTE_REASONS = [
  "Produit non conforme à la description",
  "Produit défectueux ou endommagé",
  "Colis non reçu",
  "Commande incomplète",
  "Suspicion de contrefaçon",
  "Autre motif",
];

export default function OrderDetailPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activeDisputeId, setActiveDisputeId] = useState<number | null>(null);
  const [showDisputeComposer, setShowDisputeComposer] = useState(false);
  const [disputeReason, setDisputeReason] = useState(DISPUTE_REASONS[0]);
  const [disputeDraft, setDisputeDraft] = useState("");
  const [disputeReply, setDisputeReply] = useState("");
  const [showCourierChat, setShowCourierChat] = useState(false);
  const [courierMessages, setCourierMessages] = useState<OrderChatMessage[]>([]);
  const [courierChatDraft, setCourierChatDraft] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const disputeSectionRef = useRef<HTMLElement | null>(null);
  const courierChatEndRef = useRef<HTMLDivElement | null>(null);

  const reloadOrder = async () => {
    if (!id) return;
    try { setOrder(await ordersApi.get(parseInt(id, 10))); } catch { /* silencieux */ }
  };

  function getFulfillmentInfo(status: FulfillmentStatus) {
    switch (status) {
      case "PENDING": return { label: t('order.detail.fulfillment_received'), step: 0 };
      case "PROCESSING": return { label: t('order.detail.fulfillment_processing'), step: 1 };
      case "SHIPPED": return { label: t('order.detail.fulfillment_shipped'), step: 2 };
      case "DELIVERED": return { label: t('order.detail.fulfillment_delivered'), step: 3 };
      case "CANCELLED": return { label: t('order.detail.fulfillment_cancelled'), step: -1 };
      default: return { label: t('order.detail.fulfillment_processing'), step: 0 };
    }
  }

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      const orderId = parseInt(id, 10);
      try {
        setLoading(true);
        setError(null);
        setOrder(await ordersApi.get(orderId));
        try { setTracking(await customerApi.getOrderTracking(orderId)); } catch { setTracking(null); }
      } catch {
        setError(t('order.detail.error_load'));
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, t]);

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    const fetchDisputes = () => {
      customerApi.getOrderDisputes(order.id).then((data) => {
        if (!cancelled) { setDisputes(data); setActiveDisputeId((c) => c ?? data[0]?.id ?? null); }
      }).catch(() => {});
    };
    fetchDisputes();
    const interval = window.setInterval(fetchDisputes, 12000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [order]);

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    const fetchMessages = () => {
      customerApi.getOrderChatMessages(order.id)
        .then((msgs) => { if (!cancelled) setCourierMessages(msgs); })
        .catch(() => {});
    };
    fetchMessages();
    const interval = window.setInterval(fetchMessages, showCourierChat ? 4000 : 12000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [order, showCourierChat]);

  useEffect(() => {
    if (!showCourierChat) return;
    const el = courierChatEndRef.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [courierMessages, showCourierChat]);

  const disputeEligibility = useMemo(() => getDisputeEligibility(order), [order]);
  const activeDispute = disputes.find((d) => d.id === activeDisputeId) ?? disputes[0] ?? null;
  const canSeeDisputeArea = ["DELIVERED", "BUYER_CONFIRMED", "AUTO_CONFIRMED", "RELEASED_TO_VENDOR"]
    .includes(order?.fulfillment_status ?? "");

  if (loading) {
    return (
      <>
        <PfShellStyles />
        <div className="pf-root pf-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div className="pf-flow-ic spin" style={{ width: 44, height: 44, margin: "0 auto" }} />
            <p className="pf-muted-sm" style={{ marginTop: 14 }}>{t('order.detail.loading')}</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <PfShellStyles />
        <div className="pf-root pf-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="pf-glass-panel" style={{ maxWidth: 420, textAlign: "center" }}>
            <span className="pf-notif-ic" style={{ margin: "0 auto 14px", background: "rgba(217,45,32,.12)", color: "#d92d20" }}>
              <AlertCircle size={22} />
            </span>
            <div className="pf-panel-title">{t('order.detail.error_title')}</div>
            <p className="pf-panel-sub">{error}</p>
            <button className="pf-btn-accent" style={{ marginTop: 18 }} onClick={() => navigate("/orders")}>
              {t('order.detail.error_button')}
            </button>
          </div>
        </div>
      </>
    );
  }

  const fulfillment = getFulfillmentInfo(order.fulfillment_status);
  const trackingEvents = Array.isArray(tracking?.events)
    ? tracking.events
        .filter((e): e is NonNullable<Shipment["events"]>[number] => Boolean(e))
        .map((e) => ({
          time: e.created_at ? new Date(e.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "ETA",
          label: e.message || e.status || t('order.detail.timeline.processing'),
        }))
        .filter((e) => Boolean(e.label))
    : [];

  const timelineSteps = trackingEvents.length ? trackingEvents : [
    { time: "10:15", label: t('order.detail.timeline.received') },
    { time: "14:30", label: t('order.detail.timeline.processing') },
    { time: "14:45", label: t('order.detail.timeline.shipped') },
    { time: "ETA", label: order.fulfillment_status === "DELIVERED" ? t('order.detail.timeline.delivered') : t('order.detail.timeline.eta') },
  ];

  const handleConfirmReceipt = async () => {
    try {
      setOrder(await customerApi.confirmReceipt(order.id));
      setTracking(await customerApi.getOrderTracking(order.id));
    } catch { /* silencieux */ }
  };

  const handleOpenDispute = () => {
    if (activeDispute) {
      disputeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setShowDisputeComposer(true);
  };

  const handleCreateDispute = async () => {
    if (!disputeDraft.trim()) return;
    try {
      await customerApi.createOrderDispute(order.id, { reason: "OTHER", description: disputeDraft.trim() });
      const data = await customerApi.getOrderDisputes(order.id);
      setDisputes(data);
      setActiveDisputeId(data[0]?.id ?? null);
    } catch { /* silencieux */ }
    setShowDisputeComposer(false);
    setDisputeDraft("");
  };

  const handleSendDisputeReply = async () => {
    if (!activeDispute || !disputeReply.trim()) return;
    const text = disputeReply.trim();
    setDisputeReply("");
    try {
      await customerApi.addDisputeMessage(activeDispute.id, text);
      setDisputes(await customerApi.getOrderDisputes(order.id));
    } catch { setDisputeReply(text); }
  };

  const handleSendCourierMessage = async () => {
    if (!courierChatDraft.trim() || chatSending) return;
    const text = courierChatDraft.trim();
    setCourierChatDraft("");
    setChatSending(true);
    const optimistic: OrderChatMessage = {
      id: -Date.now(), shipment: tracking?.id ?? order.id, channel: "CLIENT", sender_role: "CLIENT",
      sender_name: user?.first_name || user?.username || "Vous", message: text, created_at: new Date().toISOString(),
    };
    setCourierMessages((prev) => [...prev, optimistic]);
    try {
      const msg = await customerApi.sendOrderChatMessage(order.id, text);
      setCourierMessages((prev) => prev.map((i) => (i.id === optimistic.id ? msg : i)));
    } catch {
      setCourierChatDraft(text);
      setCourierMessages((prev) => prev.filter((i) => i.id !== optimistic.id));
    } finally {
      setChatSending(false);
    }
  };

  return (
    <>
      <PfShellStyles />
      <div className="pf-root pf-page">
        <div className="pf-wrap">

          <Link to="/orders">
            <button className="pf-link" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
              <ArrowLeft size={16} />{t('order.detail.back_link')}
            </button>
          </Link>

          {/* En-tête */}
          <div className="pf-ident pf-anim">
            <span className="pf-notif-ic">
              {order.delivery_mode === "PICKUP" ? <Store size={20} /> : <Truck size={20} />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pf-k">{t('order.detail.breadcrumb')}</div>
              <div className="pf-name" style={{ fontSize: 22 }}>{t('order.detail.order_title', { id: order.id })}</div>
              <div className="pf-meta">
                <span>{t('order.detail.placed_on', { date: new Date(order.created_at).toLocaleDateString("fr-FR") })}</span>
                <span>{order.items.length} article{order.items.length > 1 ? "s" : ""}</span>
                <span>{order.city}</span>
              </div>
            </div>
            <span className="pf-chip">
              {order.delivery_mode === "PICKUP" ? <Package size={14} /> : <Truck size={14} />}
              {order.delivery_mode === "PICKUP" ? "Retrait en boutique" : fulfillment.label}
            </span>
          </div>

          <div className="pf-flex" style={{ marginTop: 22 }}>
            <div className="pf-main">

              {/* Suivi */}
              <section className="pf-card pf-anim">
                <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 18 }}>
                  <span className="pf-notif-ic"><MapPin size={20} /></span>
                  <div>
                    <div className="pf-t">{t('order.detail.tracking_title')}</div>
                    <div className="pf-sub">
                      {order.delivery_mode === "PICKUP"
                        ? `Commande #${order.id} en préparation pour retrait`
                        : t('order.detail.in_delivery', { id: order.id })}
                    </div>
                  </div>
                </div>

                <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid var(--pf-border)", marginBottom: 22 }}>
                  {order.delivery_mode === "PICKUP" ? (
                    <div style={{ height: 224, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", background: "var(--pf-s3)" }}>
                      <div className="pf-row-between pf-muted-sm">
                        <span>{t('order.detail.city_label')} : {order.city}</span>
                        <span>Point de retrait</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 26, color: "var(--pf-accent)" }}>
                        <Package size={42} strokeWidth={1.6} />
                        <Store size={42} strokeWidth={1.6} style={{ color: "var(--pf-muted)" }} />
                        <Warehouse size={42} strokeWidth={1.6} />
                      </div>
                      <div className="pf-addr-line" style={{ padding: "12px 16px", borderRadius: 14, background: "var(--pf-glass)", border: "1px solid var(--pf-glass-border)" }}>
                        Retrait en boutique : {order.city}
                      </div>
                    </div>
                  ) : (
                    <div style={{ position: "relative" }}>
                      <TrackingMap
                        destinationAddress={order.address}
                        destinationCity={order.city}
                        destinationLabel={`Adresse de livraison : ${order.address}`}
                        originLabel={tracking?.courier_name ? `Livreur : ${tracking.courier_name}` : "Position livreur"}
                        height={280}
                        className="rounded-none border-0"
                      />
                      <div style={{ position: "absolute", left: 12, top: 12, zIndex: 500, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span className="pf-tag" style={{ background: "rgba(255,255,255,.94)", color: "#1a1420", fontWeight: 700 }}>Ville : {order.city}</span>
                        <span className="pf-tag" style={{ background: "rgba(255,255,255,.94)", color: "#1a1420", fontWeight: 700 }}>Zone suivie</span>
                      </div>
                      <div className="pf-addr-line" style={{ padding: "12px 16px", borderTop: "1px solid var(--pf-border)" }}>
                        Adresse de livraison : {order.address}
                      </div>
                    </div>
                  )}
                </div>

                {/* Timeline livraison */}
                {timelineSteps.map((step, index) => {
                  const isActive = fulfillment.step >= index;
                  const last = index === timelineSteps.length - 1;
                  return (
                    <div key={`${step.label}-${index}`} style={{ display: "flex", gap: 16 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 26, flexShrink: 0 }}>
                        <span className={`pf-d ${isActive ? "done" : "todo"}`}>
                          {isActive
                            ? <CheckCircle size={12} strokeWidth={3} color="#fff" />
                            : <Clock3 size={12} style={{ color: "var(--pf-muted)" }} />}
                        </span>
                        {!last && <span style={{ flex: 1, width: 2, minHeight: 26, margin: "5px 0", background: isActive ? "var(--pf-aring)" : "var(--pf-border)" }} />}
                      </div>
                      <div style={{ paddingBottom: last ? 0 : 18, flex: 1 }}>
                        <div className="pf-muted-sm" style={{ fontWeight: 700, letterSpacing: ".14em", fontSize: 10.5 }}>{step.time}</div>
                        <div className="pf-support-t" style={{ marginTop: 3 }}>{step.label}</div>
                      </div>
                    </div>
                  );
                })}

                {/* Garanties */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginTop: 22 }}>
                  {[
                    { ic: <ShieldCheck size={14} />, k: "Preuves BelivaY", d: "Scan, horodatage et traces de livraison sont conservés par BelivaY pour protéger le client." },
                    { ic: <Store size={14} />, k: "Point relais", d: tracking?.relay_point ? `Relais prévu : ${tracking.relay_point}.` : "Si un relais est choisi, son code de retrait apparaîtra ici après dépôt." },
                    { ic: <Scale size={14} />, k: "Litige protégé", d: "En cas de problème, le paiement reste piloté par l'escrow et le litige est arbitré par BelivaY." },
                  ].map((b) => (
                    <div key={b.k} style={{ borderRadius: 16, padding: 14, background: "var(--pf-s3)", border: "1px solid var(--pf-border)" }}>
                      <div className="pf-k" style={{ display: "flex", alignItems: "center", gap: 7 }}>{b.ic}{b.k}</div>
                      <p className="pf-muted-sm" style={{ marginTop: 8, lineHeight: 1.55 }}>{b.d}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
                  <button className="pf-btn-accent" onClick={() => setShowCourierChat((c) => !c)}>
                    <Truck size={15} />{t('order.detail.contact_courier')}
                  </button>
                  {canSeeDisputeArea && (
                    <button className="pf-btn-ghost" onClick={handleOpenDispute} disabled={!activeDispute && !disputeEligibility.eligible}>
                      <MessageCircleMore size={15} />{activeDispute ? "Voir le litige" : t('order.detail.open_dispute')}
                    </button>
                  )}
                  {order.fulfillment_status === "DELIVERED" && (
                    <button className="pf-btn-ghost" onClick={handleConfirmReceipt}>
                      <CheckCircle size={15} />{t('order.detail.confirm_receipt')}
                    </button>
                  )}
                </div>

                {/* Chat livreur */}
                {showCourierChat && (
                  <div style={{ marginTop: 18, borderRadius: 18, padding: 16, background: "var(--pf-s3)", border: "1px solid var(--pf-border)" }}>
                    <div className="pf-row-between pf-mb">
                      <div>
                        <div className="pf-support-t">Chat avec le livreur</div>
                        <div className="pf-muted-sm">Le livreur peut répondre directement à ces messages.</div>
                      </div>
                      {tracking?.courier_name && <span className="pf-tag">{tracking.courier_name}</span>}
                    </div>
                    <div style={{ maxHeight: 288, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: 12, borderRadius: 14, background: "var(--pf-glass)" }}>
                      {courierMessages.length > 0 ? courierMessages.map((m) => (
                        <div key={m.id} style={{
                          maxWidth: "86%", padding: "11px 14px", fontSize: 12.5, lineHeight: 1.55,
                          ...(m.sender_role === "CLIENT"
                            ? { marginLeft: "auto", borderRadius: "16px 16px 6px 16px", background: "linear-gradient(135deg,var(--pf-accent2),var(--pf-accent))", color: "#fff" }
                            : { borderRadius: "16px 16px 16px 6px", background: "var(--pf-s3)", color: "var(--pf-text2)", border: "1px solid var(--pf-border)" }),
                        }}>
                          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", opacity: .7, marginBottom: 5 }}>
                            {m.sender_name} · {new Date(m.created_at).toLocaleString("fr-FR")}
                          </div>
                          {m.message}
                        </div>
                      )) : (
                        <div className="pf-muted-sm" style={{ padding: 18, textAlign: "center", border: "1px dashed var(--pf-bstrong)", borderRadius: 14 }}>
                          Aucun message. Lancez la conversation avec le livreur.
                        </div>
                      )}
                      <div ref={courierChatEndRef} />
                    </div>
                    <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                      <input
                        className="pf-input"
                        value={courierChatDraft}
                        onChange={(e) => setCourierChatDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSendCourierMessage(); }}
                        disabled={chatSending}
                        placeholder="Votre message au livreur…"
                      />
                      <button className="pf-btn-accent" onClick={handleSendCourierMessage} disabled={chatSending || !courierChatDraft.trim()} aria-label="Envoyer">
                        <Send size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Articles */}
              <section className="pf-card pf-anim">
                <div className="pf-card-title pf-mb">{t('order.detail.items_title')}</div>
                {order.items.map((item) => (
                  <div key={item.id} className="pf-order-line">
                    <span className="pf-order-ic"><Package size={16} /></span>
                    <div className="pf-order-mid">
                      <div className="pf-order-id">{item.title_snapshot}</div>
                      <div className="pf-muted-sm">{item.qty} × {item.price_xaf_snapshot.toLocaleString("fr-FR")} FCFA</div>
                    </div>
                    <div className="pf-order-total">{item.line_total_xaf.toLocaleString("fr-FR")} FCFA</div>
                  </div>
                ))}
              </section>

              {/* Litige */}
              {canSeeDisputeArea && (
                <section ref={disputeSectionRef} className="pf-card pf-anim">
                  <div className="pf-panel-head">
                    <div>
                      <div className="pf-k">Litige commande</div>
                      <div className="pf-panel-title" style={{ fontSize: 17, marginTop: 4 }}>Chat de médiation</div>
                      <p className="pf-panel-sub" style={{ maxWidth: 520 }}>
                        Le litige se déclenche depuis la commande reçue. Vous avez 24h après réception pour ouvrir la discussion.
                      </p>
                    </div>
                    <span className="pf-chip" style={disputeEligibility.eligible ? undefined : { color: "#b45309", background: "rgba(180,83,9,.12)", borderColor: "rgba(180,83,9,.28)" }}>
                      {disputeEligibility.eligible
                        ? `Fenêtre ouverte · ${formatRemainingDisputeTime(disputeEligibility.remainingMs)} restantes`
                        : disputeEligibility.message}
                    </span>
                  </div>

                  {disputes.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,280px) minmax(0,1fr)", gap: 14 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {disputes.map((d) => (
                          <button key={d.id} type="button" onClick={() => setActiveDisputeId(d.id)}
                            className={`pf-addr${activeDispute?.id === d.id ? " def" : ""}`}
                            style={{ textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                            <div className="pf-k">{`Commande #${d.order}`}</div>
                            <div className="pf-support-t" style={{ marginTop: 6 }}>{d.reason}</div>
                            <div className="pf-muted-sm" style={{ marginTop: 6 }}>{d.messages[d.messages.length - 1]?.message}</div>
                          </button>
                        ))}
                      </div>

                      <div style={{ borderRadius: 18, padding: 16, background: "var(--pf-s3)", border: "1px solid var(--pf-border)" }}>
                        {activeDispute && (
                          <>
                            <div style={{ paddingBottom: 14, borderBottom: "1px solid var(--pf-border)" }}>
                              <div className="pf-support-t" style={{ fontSize: 15 }}>{`Commande #${activeDispute.order}`} · {activeDispute.reason}</div>
                              <div className="pf-muted-sm" style={{ marginTop: 3 }}>Conversation de médiation ouverte pour cette commande.</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                              {activeDispute.messages.map((m) => (
                                <div key={m.id} style={{
                                  maxWidth: "88%", padding: "11px 14px", fontSize: 12.5, lineHeight: 1.55,
                                  ...(m.sender === user?.id
                                    ? { marginLeft: "auto", borderRadius: "16px 16px 6px 16px", background: "var(--pf-asoft)", border: "1px solid var(--pf-aring)", color: "var(--pf-text)" }
                                    : { borderRadius: "16px 16px 16px 6px", background: "var(--pf-glass)", border: "1px solid var(--pf-border)", color: "var(--pf-text2)" }),
                                }}>
                                  <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--pf-muted)", marginBottom: 5 }}>
                                    {m.sender_name} · {new Date(m.created_at).toLocaleString("fr-FR")}
                                  </div>
                                  {m.message}
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--pf-border)", display: "flex", gap: 10 }}>
                              <input className="pf-input" value={disputeReply} onChange={(e) => setDisputeReply(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleSendDisputeReply(); }} placeholder="Répondre au litige…" />
                              <button className="pf-btn-accent" onClick={handleSendDisputeReply} aria-label="Envoyer"><Send size={15} /></button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ) : !showDisputeComposer ? (
                    <div className="pf-muted-sm" style={{ padding: 18, borderRadius: 16, border: "1px dashed var(--pf-bstrong)", background: "var(--pf-s3)" }}>
                      Aucun litige ouvert sur cette commande.{" "}
                      {disputeEligibility.eligible ? "Utilisez le bouton ci-dessus pour démarrer la médiation." : "La fenêtre d'ouverture n'est plus disponible."}
                    </div>
                  ) : null}
                </section>
              )}
            </div>

            {/* Colonne droite */}
            <aside className="pf-side" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <OrderPaymentPanel order={order} onPaid={reloadOrder} />

              <section className="pf-glass-panel pf-anim">
                <div className="pf-card-title pf-mb">{t('order.detail.summary_title')}</div>
                <div className="pf-summary-row"><span className="pf-muted-sm">{t('order.detail.subtotal')}</span><span className="pf-summary-v">{order.subtotal_xaf.toLocaleString("fr-FR")} FCFA</span></div>
                <div className="pf-summary-row">
                  <span className="pf-muted-sm">{order.delivery_mode === "PICKUP" ? "Retrait boutique" : t('order.detail.delivery_fee')}</span>
                  <span className="pf-summary-v">{order.delivery_fee_xaf === 0 ? "Gratuit" : `${order.delivery_fee_xaf.toLocaleString("fr-FR")} FCFA`}</span>
                </div>
                <div style={{ margin: "12px 0", borderTop: "1px dashed var(--pf-border)" }} />
                <div className="pf-total-row">
                  <span className="pf-muted-sm">{t('order.detail.total')}</span>
                  <b>{order.total_xaf.toLocaleString("fr-FR")} FCFA</b>
                </div>
              </section>

              <section className="pf-glass-panel pf-anim">
                <div className="pf-card-title pf-mb">{t('order.detail.shipping_title')}</div>
                {[
                  { ic: order.delivery_mode === "PICKUP" ? <Store size={16} /> : <MapPin size={16} />, t: order.city, d: order.delivery_mode === "PICKUP" ? "Retrait en boutique partenaire" : order.address },
                  { ic: <Phone size={16} />, t: t('order.detail.shipping_phone_label'), d: order.customer_phone },
                  { ic: <UserCircle2 size={16} />, t: t('order.detail.shipping_courier_label'), d: `${tracking?.courier_name || t('order.detail.shipping_courier_pending')}${tracking?.courier_phone ? ` · ${tracking.courier_phone}` : ""}` },
                ].map((row, i) => (
                  <div key={i} className="pf-order-line">
                    <span className="pf-order-ic">{row.ic}</span>
                    <div className="pf-order-mid">
                      <div className="pf-order-id">{row.t}</div>
                      <div className="pf-muted-sm">{row.d}</div>
                    </div>
                  </div>
                ))}
              </section>
            </aside>
          </div>
        </div>
      </div>

      {/* Modale d'ouverture de litige */}
      {showDisputeComposer && !activeDispute && (
        <div className="pf-root">
          <div className="pf-backdrop">
            <div className="pf-sheet" style={{ maxWidth: 520 }}>
              <div className="pf-row-between pf-mb">
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <span className="pf-notif-ic"><Scale size={20} /></span>
                  <div>
                    <div className="pf-panel-title" style={{ fontSize: 18 }}>Ouvrir un litige</div>
                    <div className="pf-muted-sm">Commande #{order.id} · {order.total_xaf.toLocaleString("fr-FR")} FCFA</div>
                  </div>
                </div>
              </div>

              <div className="pf-field">
                <label className="pf-label">Motif du litige</label>
                <select className="pf-input" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}>
                  {DISPUTE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="pf-field" style={{ marginTop: 14 }}>
                <label className="pf-label">Description</label>
                <textarea className="pf-input pf-textarea" value={disputeDraft} onChange={(e) => setDisputeDraft(e.target.value)}
                  placeholder="Décrivez précisément le problème constaté." />
              </div>

              <div className="pf-info-note">
                <span className="pf-info-ic"><AlertTriangle size={15} /></span>
                <div className="pf-muted-sm">L'équipe BelivaY examinera votre demande et pourra contacter le vendeur ou le livreur.</div>
              </div>

              <button className="pf-btn-accent pf-btn-block" onClick={handleCreateDispute} disabled={!disputeDraft.trim()}>
                <AlertTriangle size={16} />Ouvrir le litige
              </button>
              <button className="pf-btn-ghost pf-btn-block" onClick={() => setShowDisputeComposer(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
