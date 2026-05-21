import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Bike,
  CheckCircle,
  Clock3,
  CreditCard,
  Home,
  MapPin,
  MessageCircleMore,
  Package,
  Phone,
  ShieldCheck,
  Store,
  Send,
  Scale,
  Truck,
  Warehouse,
  UserCircle2,
  XCircle,
} from "lucide-react";
import { ordersApi } from "@/services/api/orders";
import { customerApi, type Dispute, type Shipment, type OrderChatMessage } from "@/services/api/customer";
import TrackingMap from "@/components/TrackingMap";
import type { FulfillmentStatus, Order, PaymentStatus } from "@/types/order";
import { formatRemainingDisputeTime, getDisputeEligibility } from "@/lib/orderDisputes";
import { useAuth } from "@/context/AuthContext";

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

  function getPaymentInfo(status: PaymentStatus) {
    switch (status) {
      case "PAID":
        return {
          label: t('order.detail.payment_confirmed'),
          color: "text-green-600",
          bg: "bg-green-50 dark:bg-green-900/20",
          icon: CheckCircle,
        };
      case "PENDING":
        return {
          label: t('order.detail.payment_pending'),
          color: "text-yellow-600",
          bg: "bg-yellow-50 dark:bg-yellow-900/20",
          icon: Clock3,
        };
      case "FAILED":
        return {
          label: t('order.detail.payment_failed'),
          color: "text-red-600",
          bg: "bg-red-50 dark:bg-red-900/20",
          icon: XCircle,
        };
      case "REFUNDED":
        return {
          label: t('order.detail.payment_refunded'),
          color: "text-gray-600",
          bg: "bg-gray-100 dark:bg-gray-800",
          icon: CreditCard,
        };
      default:
        return {
          label: t('order.detail.payment_pending'),
          color: "text-gray-600",
          bg: "bg-gray-100 dark:bg-gray-800",
          icon: CreditCard,
        };
    }
  }

  function getFulfillmentInfo(status: FulfillmentStatus) {
    switch (status) {
      case "PENDING":
        return { label: t('order.detail.fulfillment_received'), step: 0 };
      case "PROCESSING":
        return { label: t('order.detail.fulfillment_processing'), step: 1 };
      case "SHIPPED":
        return { label: t('order.detail.fulfillment_shipped'), step: 2 };
      case "DELIVERED":
        return { label: t('order.detail.fulfillment_delivered'), step: 3 };
      case "CANCELLED":
        return { label: t('order.detail.fulfillment_cancelled'), step: -1 };
      default:
        return { label: t('order.detail.fulfillment_processing'), step: 0 };
    }
  }

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      const orderId = parseInt(id, 10);

      try {
        setLoading(true);
        setError(null);
        const data = await ordersApi.get(orderId);
        setOrder(data);
        try {
          const shipment = await customerApi.getOrderTracking(orderId);
          setTracking(shipment);
        } catch {
          setTracking(null);
        }
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
      customerApi.getOrderDisputes(order.id)
        .then((data) => {
          if (!cancelled) {
            setDisputes(data);
            setActiveDisputeId((current) => current ?? data[0]?.id ?? null);
          }
        })
        .catch(() => {});
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
        .catch(() => {/* shipment peut ne pas encore exister */});
    };

    fetchMessages();
    const interval = window.setInterval(fetchMessages, 12000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [order]);

  const disputeEligibility = useMemo(() => getDisputeEligibility(order), [order]);
  const activeDispute =
    disputes.find((dispute) => dispute.id === activeDisputeId) ?? disputes[0] ?? null;
  const canSeeDisputeArea = ["DELIVERED", "BUYER_CONFIRMED", "AUTO_CONFIRMED", "RELEASED_TO_VENDOR"].includes(order?.fulfillment_status ?? "");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {t('order.detail.loading')}
          </p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={40} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('order.detail.error_title')}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={() => navigate("/orders")}
            className="mt-6 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
          >
            {t('order.detail.error_button')}
          </button>
        </div>
      </div>
    );
  }

  const payment = getPaymentInfo(order.payment_status);
  const fulfillment = getFulfillmentInfo(order.fulfillment_status);
  const PaymentIcon = payment.icon;
  const trackingEvents = Array.isArray(tracking?.events)
    ? tracking.events
        .filter((event): event is NonNullable<Shipment["events"]>[number] => Boolean(event))
        .map((event) => ({
          time: event.created_at
            ? new Date(event.created_at).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "ETA",
          label: event.message || event.status || t('order.detail.timeline.processing'),
        }))
        .filter((event) => Boolean(event.label))
    : [];

  const timelineSteps = trackingEvents.length
    ? trackingEvents
    : [
        { time: "10:15", label: t('order.detail.timeline.received') },
        { time: "14:30", label: t('order.detail.timeline.processing') },
        { time: "14:45", label: t('order.detail.timeline.shipped') },
        { time: "ETA", label: order.fulfillment_status === "DELIVERED" ? t('order.detail.timeline.delivered') : t('order.detail.timeline.eta') },
      ];

  const handleConfirmReceipt = async () => {
    if (!order) return;
    try {
      const updatedOrder = await customerApi.confirmReceipt(order.id);
      setOrder(updatedOrder);
      const shipment = await customerApi.getOrderTracking(order.id);
      setTracking(shipment);
    } catch (actionError) {
      // silenced
    }
  };

  const handleOpenDispute = async () => {
    if (activeDispute) {
      disputeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setShowDisputeComposer(true);
    window.setTimeout(() => {
      disputeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  };

  const handleCreateDispute = async () => {
    if (!disputeDraft.trim()) return;
    try {
      await customerApi.createOrderDispute(order.id, {
        reason: "OTHER",
        description: disputeDraft.trim(),
      });
      const data = await customerApi.getOrderDisputes(order.id);
      setDisputes(data);
      setActiveDisputeId(data[0]?.id ?? null);
    } catch {
      // silenced
    }
    setShowDisputeComposer(false);
    setDisputeDraft("");
  };

  const handleSendDisputeReply = async () => {
    if (!activeDispute || !disputeReply.trim()) return;
    const text = disputeReply.trim();
    setDisputeReply("");
    try {
      await customerApi.addDisputeMessage(activeDispute.id, text);
      const data = await customerApi.getOrderDisputes(order.id);
      setDisputes(data);
    } catch {
      setDisputeReply(text);
    }
  };

  const handleSendCourierMessage = async () => {
    if (!order || !courierChatDraft.trim() || chatSending) return;
    const text = courierChatDraft.trim();
    setCourierChatDraft("");
    setChatSending(true);
    try {
      const msg = await customerApi.sendOrderChatMessage(order.id, text);
      setCourierMessages((prev) => [...prev, msg]);
    } catch {
      // Réaffiche le brouillon si l'envoi échoue
      setCourierChatDraft(text);
    } finally {
      setChatSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f5f1] py-10 dark:bg-gray-950">
      <div className="container mx-auto max-w-6xl px-4">
        <Link
          to="/orders"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-primary dark:text-gray-400"
        >
          <ArrowLeft size={18} />
          {t('order.detail.back_link')}
        </Link>

        <div className="mb-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-orange-100 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {t('order.detail.breadcrumb')}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {t('order.detail.order_title', { id: order.id })}
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('order.detail.placed_on', { date: new Date(order.created_at).toLocaleDateString("fr-FR") })}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${payment.bg} ${payment.color}`}
              >
                <PaymentIcon size={16} />
                {payment.label}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-primary dark:bg-primary/10">
                {order.delivery_mode === "PICKUP" ? <Package size={16} /> : <Truck size={16} />}
                {order.delivery_mode === "PICKUP" ? "Retrait en boutique" : fulfillment.label}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MapPin size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t('order.detail.tracking_title')}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {order.delivery_mode === "PICKUP"
                      ? `Votre commande #${order.id} est en préparation pour retrait`
                      : t('order.detail.in_delivery', { id: order.id })}
                  </p>
                </div>
              </div>

              <div className="mb-6 overflow-hidden rounded-[1.75rem] bg-white ring-1 ring-orange-100 dark:bg-gray-900 dark:ring-gray-800">
                {order.delivery_mode === "PICKUP" ? (
                  <div className="flex h-56 flex-col justify-between bg-gradient-to-br from-[#fff6ee] via-white to-[#f7f7f7] p-5 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900">
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>{t('order.detail.city_label')}: {order.city}</span>
                      <span>Point de retrait</span>
                    </div>
                    <div className="flex items-center justify-center gap-6 text-5xl">
                      <Package className="text-primary" size={44} strokeWidth={1.75} />
                      <Store className="text-gray-500 dark:text-gray-400" size={44} strokeWidth={1.75} />
                      <Warehouse className="text-primary" size={44} strokeWidth={1.75} />
                    </div>
                    <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm font-medium text-gray-700 shadow-sm dark:bg-gray-800/90 dark:text-gray-200">
                      Retrait en boutique : {order.city}
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <TrackingMap
                      destinationAddress={order.address}
                      destinationCity={order.city}
                      destinationLabel={`Adresse de livraison : ${order.address}`}
                      originLabel={tracking?.courier_name ? `Livreur : ${tracking.courier_name}` : "Position livreur"}
                      height={280}
                      className="rounded-none border-0"
                    />
                    <div className="absolute left-3 right-3 top-3 z-[500] flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-bold text-gray-700 shadow-sm dark:bg-gray-900/90 dark:text-gray-200">
                        Ville: {order.city}
                      </span>
                      <span className="rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-bold text-gray-700 shadow-sm dark:bg-gray-900/90 dark:text-gray-200">
                        Zone suivie
                      </span>
                    </div>
                    <div className="border-t border-orange-100 bg-white px-4 py-3 text-sm font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
                      Adresse de livraison : {order.address}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {timelineSteps.map((step, index) => {
                  const isActive = fulfillment.step >= index;

                  return (
                    <div key={step.label} className="flex items-start gap-4">
                      <div
                        className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full ${
                          isActive
                            ? "bg-primary text-white"
                            : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                        }`}
                      >
                        {isActive ? <CheckCircle size={18} /> : <Clock3 size={18} />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                          {step.time}
                        </p>
                        <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                          {step.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowCourierChat((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Truck size={18} />
                  {t('order.detail.contact_courier')}
                </button>
                {canSeeDisputeArea && (
                  <button
                    onClick={handleOpenDispute}
                    disabled={!activeDispute && !disputeEligibility.eligible}
                    className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-orange-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-55 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <MessageCircleMore size={18} />
                    {activeDispute ? "Voir le litige" : t('order.detail.open_dispute')}
                  </button>
                )}
                {order.fulfillment_status === "DELIVERED" && (
                  <button
                    onClick={handleConfirmReceipt}
                    className="inline-flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-semibold text-green-700 transition-all hover:bg-green-100 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300"
                  >
                    <CheckCircle size={18} />
                    {t('order.detail.confirm_receipt')}
                  </button>
                )}
              </div>

              {showCourierChat && (
                <div className="mt-5 rounded-[1.6rem] border border-orange-100 bg-[#fffaf5] p-4 dark:border-gray-800 dark:bg-gray-950">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-gray-900 dark:text-white">Chat avec le livreur</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Le livreur peut répondre directement à ces messages.
                      </p>
                    </div>
                    {tracking?.courier_name && (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600 shadow-sm dark:bg-gray-900 dark:text-gray-300">
                        {tracking.courier_name}
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 space-y-3 overflow-y-auto rounded-2xl bg-white p-3 dark:bg-gray-900">
                    {courierMessages.length > 0 ? courierMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                          message.sender_role === "CLIENT"
                            ? "ml-auto bg-primary text-white"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      >
                        <div className={`mb-1 text-[10px] font-black uppercase tracking-[0.14em] ${message.sender_role === "CLIENT" ? "text-white/70" : "text-gray-400"}`}>
                          {message.sender_name} · {new Date(message.created_at).toLocaleString("fr-FR")}
                        </div>
                        {message.message}
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-orange-200 p-5 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                        Aucun message. Lancez la conversation avec le livreur.
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex gap-3">
                    <input
                      value={courierChatDraft}
                      onChange={(event) => setCourierChatDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleSendCourierMessage();
                      }}
                      disabled={chatSending}
                      className="min-w-0 flex-1 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
                      placeholder="Votre message au livreur..."
                    />
                    <button
                      type="button"
                      onClick={handleSendCourierMessage}
                      disabled={chatSending || !courierChatDraft.trim()}
                      className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
                      aria-label="Envoyer au livreur"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
                {t('order.detail.items_title')}
              </h2>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl bg-[#fcfbf8] px-4 py-4 dark:bg-gray-800"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {item.title_snapshot}
                      </p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {item.qty} × {item.price_xaf_snapshot.toLocaleString()} FCFA
                      </p>
                    </div>
                    <p className="text-lg font-bold text-primary">
                      {item.line_total_xaf.toLocaleString()} FCFA
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {canSeeDisputeArea && (
            <section
              ref={disputeSectionRef}
              className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
                    Litige commande
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                    Chat de litige pour cette commande
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                    Le litige se declenche ici, depuis la commande recue. Vous avez 24h apres reception pour ouvrir la discussion de mediation.
                  </p>
                </div>
                <div className={`rounded-full px-4 py-2 text-xs font-bold ${
                  disputeEligibility.eligible
                    ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                }`}>
                  {disputeEligibility.eligible
                    ? `Fenetre ouverte · ${formatRemainingDisputeTime(disputeEligibility.remainingMs)} restantes`
                    : disputeEligibility.message}
                </div>
              </div>

              {showDisputeComposer && !activeDispute ? (
                <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
                  <div className="w-full max-w-xl rounded-t-[2rem] bg-white p-5 shadow-2xl dark:bg-gray-900 sm:rounded-[2rem] sm:p-6">
                    <div className="mb-5 flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-primary dark:bg-primary/10">
                        <Scale size={24} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">Ouvrir un litige</h3>
                        <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">
                          Commande #{order.id} · {order.total_xaf.toLocaleString("fr-FR")} FCFA
                        </p>
                      </div>
                    </div>

                    <label className="mb-2 block text-sm font-bold text-gray-800 dark:text-gray-200">
                      Motif du litige
                    </label>
                    <select
                      value={disputeReason}
                      onChange={(event) => setDisputeReason(event.target.value)}
                      className="w-full rounded-2xl border-2 border-orange-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    >
                      {DISPUTE_REASONS.map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>

                    <label className="mb-2 mt-4 block text-sm font-bold text-gray-800 dark:text-gray-200">
                      Description
                    </label>
                    <textarea
                      value={disputeDraft}
                      onChange={(event) => setDisputeDraft(event.target.value)}
                      className="min-h-[132px] w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-950"
                      placeholder="Décrivez précisément le problème constaté."
                    />

                    <div className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800 dark:bg-primary/10 dark:text-orange-200">
                      L'équipe BelivaY examinera votre demande et pourra contacter le vendeur ou le livreur.
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => void handleCreateDispute()}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-dark"
                      >
                        <AlertTriangle size={17} />
                        Ouvrir le litige
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDisputeComposer(false)}
                        className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {disputes.length > 0 ? (
                <div className="mt-5 grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
                  <div className="space-y-3">
                    {disputes.map((dispute) => (
                      <button
                        type="button"
                        key={dispute.id}
                        onClick={() => setActiveDisputeId(dispute.id)}
                        className={`w-full rounded-[1.4rem] border p-4 text-left transition ${
                          activeDispute?.id === dispute.id
                            ? "border-primary bg-[#fff4eb] dark:bg-primary/10"
                            : "border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/50 dark:border-gray-700 dark:bg-gray-950"
                        }`}
                      >
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                          {`Commande #${dispute.order}`}
                        </p>
                        <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
                          {dispute.reason}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                          {dispute.messages[dispute.messages.length - 1]?.message}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-[1.6rem] border border-gray-200 bg-[#fcfbf8] p-4 dark:border-gray-700 dark:bg-gray-950">
                    {activeDispute ? (
                      <>
                        <div className="mb-4 border-b border-gray-200 pb-4 dark:border-gray-800">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {`Commande #${activeDispute.order}`} · {activeDispute.reason}
                          </p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Conversation de mediation ouverte pour cette commande.
                          </p>
                        </div>

                        <div className="space-y-3">
                          {activeDispute.messages.map((message) => (
                            <div
                              key={message.id}
                              className={`max-w-[88%] rounded-[1.1rem] px-4 py-3 text-sm leading-6 ${
                                message.sender === user?.id
                                  ? "ml-auto bg-[#fff1e5] text-gray-900 dark:bg-primary/10 dark:text-white"
                                  : "bg-white text-gray-600 dark:bg-gray-900 dark:text-gray-300"
                              }`}
                            >
                              <div className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-gray-400">
                                {message.sender_name} · {new Date(message.created_at).toLocaleString("fr-FR")}
                              </div>
                              {message.message}
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
                          <input
                            value={disputeReply}
                            onChange={(event) => setDisputeReply(event.target.value)}
                            className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none ring-0 dark:border-gray-700 dark:bg-gray-900"
                            placeholder="Repondre au litige..."
                          />
                          <button
                            type="button"
                            onClick={() => void handleSendDisputeReply()}
                            className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-white transition hover:bg-primary-dark"
                            aria-label="Envoyer la reponse"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : !showDisputeComposer ? (
                <div className="mt-5 rounded-[1.5rem] border border-dashed border-orange-200 bg-[#fffaf6] p-5 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">
                  Aucun litige ouvert sur cette commande. {disputeEligibility.eligible ? "Utilisez le bouton ci-dessus pour demarrer le chat de mediation." : "La fenetre d'ouverture n'est plus disponible."}
                </div>
              ) : null}
            </section>
            )}
          </div>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                {t('order.detail.summary_title')}
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>{t('order.detail.subtotal')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {order.subtotal_xaf.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>{order.delivery_mode === "PICKUP" ? "Retrait boutique" : t('order.detail.delivery_fee')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {order.delivery_fee_xaf === 0 ? "0 FCFA" : `${order.delivery_fee_xaf.toLocaleString()} FCFA`}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3 font-semibold dark:border-gray-800">
                  <span className="text-gray-900 dark:text-white">{t('order.detail.total')}</span>
                  <span className="text-xl text-primary">{order.total_xaf.toLocaleString()} FCFA</span>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                {t('order.detail.shipping_title')}
              </h2>
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-3">
                  {order.delivery_mode === "PICKUP" ? (
                    <Store size={18} className="mt-0.5 text-primary" />
                  ) : (
                    <MapPin size={18} className="mt-0.5 text-primary" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{order.city}</p>
                    <p>
                      {order.delivery_mode === "PICKUP"
                        ? "Retrait en boutique partenaire"
                        : order.address}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone size={18} className="mt-0.5 text-primary" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{t('order.detail.shipping_phone_label')}</p>
                    <p>{order.customer_phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <UserCircle2 size={18} className="mt-0.5 text-primary" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{t('order.detail.shipping_courier_label')}</p>
                    <p>
                      {tracking?.courier_name || t('order.detail.shipping_courier_pending')}
                      {tracking?.courier_phone ? ` · ${tracking.courier_phone}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-600 dark:bg-green-900/20">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{t('order.detail.secure_payment_title')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('order.detail.secure_payment_subtitle')}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
