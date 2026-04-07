import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock3,
  CreditCard,
  MapPin,
  MessageCircleMore,
  Phone,
  ShieldCheck,
  Truck,
  UserCircle2,
  XCircle,
} from "lucide-react";
import { ordersApi } from "@/services/api/orders";
import { customerApi, type Shipment } from "@/services/api/customer";
import type { FulfillmentStatus, Order, PaymentStatus } from "@/types/order";

export default function OrderDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    }
  }

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await ordersApi.get(parseInt(id, 10));
        setOrder(data);
        try {
          const shipment = await customerApi.getOrderTracking(parseInt(id, 10));
          setTracking(shipment);
        } catch {
          setTracking(null);
        }
      } catch (fetchError) {
        console.error("Error loading order:", fetchError);
        setError(t('order.detail.error_load'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, t]);

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
  const timelineSteps = tracking?.events?.length
    ? tracking.events.map((event) => ({
        time: new Date(event.created_at).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        label: event.message || event.status,
      }))
    : [
        { time: "10:15", label: t('order.detail.timeline.received') },
        { time: "14:30", label: t('order.detail.timeline.processing') },
        { time: "14:45", label: t('order.detail.timeline.shipped') },
        { time: "ETA", label: order.fulfillment_status === "DELIVERED" ? t('order.detail.timeline.delivered') : t('order.detail.timeline.eta') },
      ];

  const handleConfirmReceipt = async () => {
    if (!id) return;
    try {
      const updatedOrder = await customerApi.confirmReceipt(parseInt(id, 10));
      setOrder(updatedOrder);
      const shipment = await customerApi.getOrderTracking(parseInt(id, 10));
      setTracking(shipment);
    } catch (actionError) {
      console.error("Erreur confirmation reception:", actionError);
    }
  };

  const handleOpenDispute = async () => {
    if (!id) return;
    const description = window.prompt(t('order.detail.dispute_prompt'));
    if (!description) return;

    try {
      await customerApi.createOrderDispute(parseInt(id, 10), {
        reason: "OTHER",
        description,
      });
    } catch (actionError) {
      console.error("Erreur ouverture litige:", actionError);
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
                <Truck size={16} />
                {fulfillment.label}
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
                    {t('order.detail.in_delivery', { id: order.id })}
                  </p>
                </div>
              </div>

              <div className="mb-6 h-56 rounded-[1.75rem] bg-gradient-to-br from-[#fff6ee] via-white to-[#f7f7f7] p-5 ring-1 ring-orange-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 dark:ring-gray-800">
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>{t('order.detail.city_label')}: {order.city}</span>
                    <span>{t('order.detail.area_label')}</span>
                  </div>
                  <div className="flex items-center justify-center gap-6 text-5xl">
                    <span>📍</span>
                    <span>🛵</span>
                    <span>🏠</span>
                  </div>
                  <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm font-medium text-gray-700 shadow-sm dark:bg-gray-800/90 dark:text-gray-200">
                    {t('order.detail.delivery_address')} : {order.address}
                  </div>
                </div>
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
                  disabled={!tracking?.courier_phone}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Truck size={18} />
                  {t('order.detail.contact_courier')}
                </button>
                <button
                  onClick={handleOpenDispute}
                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-orange-50 hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  <MessageCircleMore size={18} />
                  {t('order.detail.open_dispute')}
                </button>
                {order.fulfillment_status !== "DELIVERED" && (
                  <button
                    onClick={handleConfirmReceipt}
                    className="inline-flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-semibold text-green-700 transition-all hover:bg-green-100 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300"
                  >
                    <CheckCircle size={18} />
                    {t('order.detail.confirm_receipt')}
                  </button>
                )}
              </div>
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
                  <span>{t('order.detail.delivery_fee')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {order.delivery_fee_xaf.toLocaleString()} FCFA
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
                  <MapPin size={18} className="mt-0.5 text-primary" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{order.city}</p>
                    <p>{order.address}</p>
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
