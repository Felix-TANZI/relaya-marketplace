import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock3,
  CreditCard,
  MapPin,
  MessageCircleMore,
  Package,
  Phone,
  ShieldCheck,
  Store,
  Send,
  Scale,
  Star,
  Truck,
  Warehouse,
  UserCircle2,
  XCircle,
  FileUp,
  Paperclip,
  QrCode,
  KeyRound,
} from "lucide-react";
import { ordersApi } from "@/services/api/orders";
import { productsApi } from "@/services/api/products";
import { customerApi, type Dispute, type Shipment, type OrderChatMessage } from "@/services/api/customer";
import TrackingMap from "@/components/TrackingMap";
import QrScanner from "@/components/QrScanner";
import { ensureImagesUnderLimit } from "@/lib/imageCompression";
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

const DISPUTE_REASON_CODES: Record<string, string> = {
  "Produit non conforme à la description": "NOT_AS_DESCRIBED",
  "Produit défectueux ou endommagé": "DAMAGED",
  "Colis non reçu": "NOT_RECEIVED",
  "Commande incomplète": "WRONG_ITEM",
  "Suspicion de contrefaçon": "COUNTERFEIT",
  "Autre motif": "OTHER",
};

const REVIEWABLE_STATUSES: FulfillmentStatus[] = [
  "DELIVERED",
  "BUYER_CONFIRMED",
  "AUTO_CONFIRMED",
  "RELEASED_TO_VENDOR",
  "DISPUTED",
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
  const [disputeOrderItemId, setDisputeOrderItemId] = useState<number | null>(null);
  const [disputeDraft, setDisputeDraft] = useState("");
  const [disputeFiles, setDisputeFiles] = useState<File[]>([]);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState("");
  const [requestFiles, setRequestFiles] = useState<Record<number, File[]>>({});
  const [respondingRequestId, setRespondingRequestId] = useState<number | null>(null);
  const [disputeReply, setDisputeReply] = useState("");
  const [showCourierChat, setShowCourierChat] = useState(false);
  const [courierMessages, setCourierMessages] = useState<OrderChatMessage[]>([]);
  const [courierChatDraft, setCourierChatDraft] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [reviewDrafts, setReviewDrafts] = useState<Record<number, { rating: number; title: string; comment: string }>>({});
  const [reviewStatus, setReviewStatus] = useState<Record<number, "idle" | "saving" | "saved" | "error" | "exists">>({});
  const [showConfirmReceipt, setShowConfirmReceipt] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [receiptCode, setReceiptCode] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [receiptSubmitting, setReceiptSubmitting] = useState(false);
  const disputeSectionRef = useRef<HTMLElement | null>(null);
  const courierChatEndRef = useRef<HTMLDivElement | null>(null);

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
    if (!id || !tracking || ["DELIVERED", "FAILED", "CANCELLED"].includes(tracking.status)) return;
    const orderId = Number(id);
    const interval = window.setInterval(() => {
      customerApi.getOrderTracking(orderId).then(setTracking).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [id, tracking?.status]);

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
    const interval = window.setInterval(fetchMessages, showCourierChat ? 4000 : 12000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [order, showCourierChat]);

  useEffect(() => {
    if (!showCourierChat) return;
    courierChatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [courierMessages, showCourierChat]);

  const disputeEligibility = useMemo(() => getDisputeEligibility(order), [order]);
  const activeDispute =
    disputes.find((dispute) => dispute.id === activeDisputeId) ?? disputes[0] ?? null;
  const canSeeDisputeArea = ["DELIVERED", "BUYER_CONFIRMED", "AUTO_CONFIRMED", "RELEASED_TO_VENDOR", "DISPUTED"].includes(order?.fulfillment_status ?? "");
  const canReviewItems = REVIEWABLE_STATUSES.includes(order?.fulfillment_status ?? "PENDING");

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
          completed: true,
        }))
        .filter((event) => Boolean(event.label))
    : [];

  const timelineSteps = trackingEvents.length
    ? trackingEvents
    : [
        { time: "10:15", label: t('order.detail.timeline.received'), completed: fulfillment.step >= 0 },
        { time: "14:30", label: t('order.detail.timeline.processing'), completed: fulfillment.step >= 1 },
        { time: "14:45", label: t('order.detail.timeline.shipped'), completed: fulfillment.step >= 2 },
        { time: "ETA", label: order.fulfillment_status === "DELIVERED" ? t('order.detail.timeline.delivered') : t('order.detail.timeline.eta'), completed: fulfillment.step >= 3 },
      ];

  const submitReceiptCode = async (code: string) => {
    if (!order) return;
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setReceiptError("Le code fait 6 chiffres. Demande-le à ton livreur.");
      return;
    }
    setReceiptSubmitting(true);
    setReceiptError("");
    try {
      const updatedOrder = await customerApi.confirmReceipt(order.id, trimmed);
      setOrder(updatedOrder);
      const shipment = await customerApi.getOrderTracking(order.id);
      setTracking(shipment);
      setShowConfirmReceipt(false);
      setShowQrScanner(false);
      setReceiptCode("");
    } catch (err) {
      setReceiptError(
        err instanceof Error ? err.message : "Code de confirmation invalide. Demande le code au livreur.",
      );
    } finally {
      setReceiptSubmitting(false);
    }
  };

  const handleQrScanned = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(-6);
    setShowQrScanner(false);
    if (digitsOnly.length === 6) {
      void submitReceiptCode(digitsOnly);
    } else {
      setReceiptError("QR non reconnu comme code de confirmation BelivaY.");
    }
  };

  const handleOpenDispute = async () => {
    if (activeDispute) {
      disputeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setDisputeOrderItemId(order.items[0]?.id ?? null);
    setShowDisputeComposer(true);
    window.setTimeout(() => {
      disputeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  };

  const handleCreateDispute = async () => {
    if (!disputeDraft.trim() || !disputeOrderItemId || disputeSubmitting) return;
    const reasonCode = DISPUTE_REASON_CODES[disputeReason] || "OTHER";
    if (["DAMAGED", "WRONG_ITEM", "NOT_AS_DESCRIBED", "COUNTERFEIT"].includes(reasonCode) && disputeFiles.length === 0) {
      setDisputeError("Ajoutez au moins une photo ou un document pour ce motif.");
      return;
    }
    setDisputeSubmitting(true);
    setDisputeError("");
    try {
      await customerApi.createOrderDispute(order.id, {
        reason: reasonCode,
        description: disputeDraft.trim(),
        order_item: disputeOrderItemId,
        files: disputeFiles,
      });
      const data = await customerApi.getOrderDisputes(order.id);
      setDisputes(data);
      setActiveDisputeId(data[0]?.id ?? null);
      setShowDisputeComposer(false);
      setDisputeDraft("");
      setDisputeFiles([]);
    } catch (caught) {
      setDisputeError(caught instanceof Error ? caught.message : "Impossible d'ouvrir le litige.");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const handleEvidenceResponse = async (requestId: number) => {
    const files = requestFiles[requestId] || [];
    if (!files.length || respondingRequestId) return;
    setRespondingRequestId(requestId);
    try {
      await customerApi.respondToEvidenceRequest(requestId, files, "Preuve complémentaire transmise par le client");
      const data = await customerApi.getOrderDisputes(order.id);
      setDisputes(data);
      setRequestFiles((current) => ({ ...current, [requestId]: [] }));
    } finally {
      setRespondingRequestId(null);
    }
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
    const optimisticMessage: OrderChatMessage = {
      id: -Date.now(),
      shipment: tracking?.id ?? order.id,
      channel: "CLIENT",
      sender_role: "CLIENT",
      sender_name: user?.first_name || user?.username || "Vous",
      message: text,
      created_at: new Date().toISOString(),
    };
    setCourierMessages((prev) => [...prev, optimisticMessage]);
    try {
      const msg = await customerApi.sendOrderChatMessage(order.id, text);
      setCourierMessages((prev) => prev.map((item) => (item.id === optimisticMessage.id ? msg : item)));
    } catch {
      // Réaffiche le brouillon si l'envoi échoue
      setCourierChatDraft(text);
      setCourierMessages((prev) => prev.filter((item) => item.id !== optimisticMessage.id));
    } finally {
      setChatSending(false);
    }
  };

  const updateReviewDraft = (
    itemId: number,
    patch: Partial<{ rating: number; title: string; comment: string }>
  ) => {
    setReviewDrafts((current) => ({
      ...current,
      [itemId]: {
        rating: current[itemId]?.rating ?? 5,
        title: current[itemId]?.title ?? "",
        comment: current[itemId]?.comment ?? "",
        ...patch,
      },
    }));
    setReviewStatus((current) => ({ ...current, [itemId]: "idle" }));
  };

  const handleSubmitReview = async (item: Order["items"][number]) => {
    const draft = reviewDrafts[item.id] ?? { rating: 5, title: "", comment: "" };
    setReviewStatus((current) => ({ ...current, [item.id]: "saving" }));
    try {
      await productsApi.addReview(item.product, {
        order_item: item.id,
        rating: draft.rating,
        title: draft.title.trim(),
        comment: draft.comment.trim(),
      });
      setReviewStatus((current) => ({ ...current, [item.id]: "saved" }));
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      setReviewStatus((current) => ({
        ...current,
        [item.id]: message.includes("existe deja") || message.includes("already") ? "exists" : "error",
      }));
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
                      destinationPrecision={order.address_precision}
                      destinationLabel={`Adresse de livraison : ${order.address}`}
                      originLabel={tracking?.courier_name ? `Livreur : ${tracking.courier_name}` : "Position livreur"}
                      currentLocation={tracking?.latest_location
                        ? [Number(tracking.latest_location.latitude), Number(tracking.latest_location.longitude)]
                        : undefined}
                      locationHistory={(tracking?.location_history || []).map((location) => [
                        Number(location.latitude),
                        Number(location.longitude),
                      ] as [number, number])}
                      height={280}
                      className="rounded-none border-0"
                    />
                    <div className="absolute left-3 right-3 top-3 z-[500] flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-bold text-gray-700 shadow-sm dark:bg-gray-900/90 dark:text-gray-200">
                        Ville: {order.city}
                      </span>
                      <span className="rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-bold text-gray-700 shadow-sm dark:bg-gray-900/90 dark:text-gray-200">
                        {tracking?.latest_location
                          ? `GPS actualisé à ${new Date(tracking.latest_location.captured_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                          : "En attente de la position GPS du livreur"}
                      </span>
                    </div>
                    <div className="border-t border-orange-100 bg-white px-4 py-3 text-sm font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
                      Adresse de livraison : {order.address}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {timelineSteps.map((step) => {
                  const isActive = step.completed;

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

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck size={15} />
                    Preuves BelivaY
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">
                    Scan, horodatage et traces de livraison sont conserves par BelivaY pour proteger le client.
                  </p>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 dark:border-sky-900/30 dark:bg-sky-950/20">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
                    <Store size={15} />
                    Point relais
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">
                    {tracking?.relay_point
                      ? `Relais prevu: ${tracking.relay_point}.`
                      : "Si un relais est choisi, son code de retrait apparaitra ici apres depot."}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                    <Scale size={15} />
                    Litige protege
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">
                    En cas de probleme, le paiement reste pilote par l'escrow et le litige est arbitre par BelivaY.
                  </p>
                </div>
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
                    onClick={() => { setShowConfirmReceipt(true); setReceiptError(""); }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-semibold text-green-700 transition-all hover:bg-green-100 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300"
                  >
                    <CheckCircle size={18} />
                    {t('order.detail.confirm_receipt')}
                  </button>
                )}
              </div>

              {showConfirmReceipt && (
                <div className="mt-4 rounded-2xl border border-green-200 bg-green-50/60 p-4 dark:border-green-900/40 dark:bg-green-900/10">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Confirmer la réception</p>
                  <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">
                    Demande à ton livreur le code affiché sur son téléphone : scanne son QR ou saisis les 6 chiffres.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setShowQrScanner(true)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-gray-900"
                    >
                      <QrCode size={16} /> Scanner le QR
                    </button>
                    <div className="flex flex-1 items-center gap-2">
                      <KeyRound size={16} className="shrink-0 text-gray-400" />
                      <input
                        value={receiptCode}
                        onChange={(event) => setReceiptCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        inputMode="numeric"
                        placeholder="Code à 6 chiffres"
                        maxLength={6}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold tracking-widest outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={receiptCode.length !== 6 || receiptSubmitting}
                      onClick={() => void submitReceiptCode(receiptCode)}
                      className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {receiptSubmitting ? "..." : "Valider"}
                    </button>
                  </div>
                  {receiptError && <p className="mt-2 text-xs font-semibold text-red-600">{receiptError}</p>}
                </div>
              )}

              {showQrScanner && (
                <QrScanner
                  title="Scanner le code du livreur"
                  onScan={handleQrScanned}
                  onClose={() => setShowQrScanner(false)}
                />
              )}

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
                    <div ref={courierChatEndRef} />
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
                {order.items.map((item) => {
                  const draft = reviewDrafts[item.id] ?? { rating: 5, title: "", comment: "" };
                  const status = reviewStatus[item.id] ?? "idle";
                  const reviewDisabled = status === "saving" || status === "saved" || status === "exists";

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-[#fcfbf8] px-4 py-4 dark:bg-gray-800"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {item.title_snapshot}
                          </p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Article #{item.id} · {item.qty} × {item.price_xaf_snapshot.toLocaleString()} FCFA
                          </p>
                        </div>
                        <p className="text-lg font-bold text-primary">
                          {item.line_total_xaf.toLocaleString()} FCFA
                        </p>
                      </div>

                      {canReviewItems ? (
                        <div className="mt-4 rounded-[1.25rem] border border-orange-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-gray-900 dark:text-white">
                                Noter cet article
                              </p>
                              <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                La note est attribuée au produit et améliore le score du vendeur.
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <button
                                  key={rating}
                                  type="button"
                                  disabled={reviewDisabled}
                                  onClick={() => updateReviewDraft(item.id, { rating })}
                                  className="rounded-lg p-1 text-amber-400 transition hover:bg-amber-50 disabled:opacity-60 dark:hover:bg-gray-800"
                                  aria-label={`${rating} etoile${rating > 1 ? "s" : ""}`}
                                >
                                  <Star
                                    size={20}
                                    fill={rating <= draft.rating ? "currentColor" : "none"}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-[0.8fr_1.2fr_auto]">
                            <input
                              value={draft.title}
                              disabled={reviewDisabled}
                              onChange={(event) => updateReviewDraft(item.id, { title: event.target.value })}
                              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950"
                              placeholder="Titre de l'avis"
                            />
                            <input
                              value={draft.comment}
                              disabled={reviewDisabled}
                              onChange={(event) => updateReviewDraft(item.id, { comment: event.target.value })}
                              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950"
                              placeholder="Votre commentaire sur ce produit"
                            />
                            <button
                              type="button"
                              disabled={reviewDisabled}
                              onClick={() => void handleSubmitReview(item)}
                              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {status === "saving" ? "Envoi..." : "Publier"}
                            </button>
                          </div>

                          {status === "saved" && (
                            <p className="mt-3 text-sm font-bold text-emerald-600 dark:text-emerald-300">
                              Avis enregistré comme achat vérifié pour cet article.
                            </p>
                          )}
                          {status === "exists" && (
                            <p className="mt-3 text-sm font-bold text-amber-600 dark:text-amber-300">
                              Cet article de commande a déjà reçu un avis.
                            </p>
                          )}
                          {status === "error" && (
                            <p className="mt-3 text-sm font-bold text-red-600 dark:text-red-300">
                              Impossible d'enregistrer cet avis pour le moment.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-[1.25rem] border border-dashed border-gray-200 bg-white/70 p-4 text-sm font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
                          Vous pourrez noter cet article après livraison ou confirmation de réception.
                        </div>
                      )}
                    </div>
                  );
                })}
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
                    Le litige se déclenche ici, article par article, dans les 7 jours suivant la réception.
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
                      Article concerné
                    </label>
                    <div className="mb-4 grid gap-2">
                      {order.items.map((item) => (
                        <button key={item.id} type="button" onClick={() => setDisputeOrderItemId(item.id)} className={`flex min-h-12 items-center justify-between rounded-lg border px-4 py-3 text-left text-sm ${disputeOrderItemId === item.id ? "border-primary bg-orange-50 dark:bg-primary/10" : "border-gray-200 dark:border-gray-700"}`}>
                          <span className="line-clamp-2 font-bold text-gray-900 dark:text-white">{item.title_snapshot}</span>
                          <span className="ml-3 shrink-0 text-xs text-gray-500">Qté {item.qty}</span>
                        </button>
                      ))}
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

                    <label className="mb-2 mt-4 block text-sm font-bold text-gray-800 dark:text-gray-200">
                      Preuves initiales
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-orange-300 bg-orange-50/60 px-4 py-4 text-sm font-bold text-orange-800 transition hover:bg-orange-50 dark:border-orange-800 dark:bg-primary/10 dark:text-orange-200">
                      <FileUp size={20} />
                      <span>Ajouter des photos, une vidéo ou un PDF</span>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4"
                        className="sr-only"
                        onChange={(event) => {
                          const selected = Array.from(event.target.files || []);
                          void ensureImagesUnderLimit(selected).then(setDisputeFiles);
                        }}
                      />
                    </label>
                    {disputeFiles.length > 0 && (
                      <div className="mt-2 space-y-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {disputeFiles.map((file) => <p key={`${file.name}-${file.size}`}>• {file.name}</p>)}
                      </div>
                    )}
                    {disputeError && <p className="mt-3 text-sm font-bold text-red-600">{disputeError}</p>}

                    <div className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800 dark:bg-primary/10 dark:text-orange-200">
                      L'équipe BelivaY examinera votre demande et pourra contacter le vendeur ou le livreur.
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => void handleCreateDispute()}
                        disabled={disputeSubmitting}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-dark disabled:opacity-60"
                      >
                        <AlertTriangle size={17} />
                        {disputeSubmitting ? "Envoi des preuves..." : "Ouvrir le litige"}
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
                <div className="mt-5 grid gap-4 2xl:grid-cols-[290px_minmax(0,1fr)]">
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

                        {activeDispute.evidence_requests?.length > 0 && (
                          <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-800">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Demandes de preuve</p>
                            {activeDispute.evidence_requests.map((evidenceRequest) => (
                              <div key={evidenceRequest.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-bold text-gray-900 dark:text-white">{evidenceRequest.instructions}</p>
                                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                                      Demandé par {evidenceRequest.requested_by_name}
                                      {evidenceRequest.due_at ? ` · avant le ${new Date(evidenceRequest.due_at).toLocaleString("fr-FR")}` : ""}
                                    </p>
                                  </div>
                                  <span className={`rounded-full px-3 py-1 text-xs font-black ${evidenceRequest.status === "SUBMITTED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>
                                    {evidenceRequest.status === "SUBMITTED" ? "Reçue" : "En attente"}
                                  </span>
                                </div>
                                {evidenceRequest.status === "PENDING" && (
                                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                    <label className="inline-flex min-h-11 flex-1 cursor-pointer items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 text-sm font-bold text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                                      <Paperclip size={16} />
                                      {(requestFiles[evidenceRequest.id] || []).length ? `${requestFiles[evidenceRequest.id].length} fichier(s)` : "Choisir les preuves"}
                                      <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4" className="sr-only" onChange={(event) => {
                                        const selected = Array.from(event.target.files || []);
                                        void ensureImagesUnderLimit(selected).then((compressed) => setRequestFiles((current) => ({ ...current, [evidenceRequest.id]: compressed })));
                                      }} />
                                    </label>
                                    <button type="button" disabled={!(requestFiles[evidenceRequest.id] || []).length || respondingRequestId === evidenceRequest.id} onClick={() => void handleEvidenceResponse(evidenceRequest.id)} className="min-h-11 rounded-xl bg-gray-900 px-4 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-gray-900">
                                      Transmettre
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {activeDispute.evidences?.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {activeDispute.evidences.map((evidence) => (
                              <a key={evidence.id} href={evidence.file_url || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                <Paperclip size={14} /> {evidence.evidence_type.toLowerCase()}
                              </a>
                            ))}
                          </div>
                        )}

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
