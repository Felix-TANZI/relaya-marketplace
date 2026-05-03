// frontend/src/features/admin/OrderDetailPage.tsx
// Détail complet d'une commande

import { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Mail,
  Package,
  DollarSign,
  CreditCard,
  Truck,
  History,
  Edit2,
  XCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Download,
} from "lucide-react";
import { Card, Badge } from "@/components/ui";
import {
  adminApi,
  type AdminOrderDetail,
  type AdminOrderUpdate,
} from "@/services/api/admin";

import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";

export default function OrderDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<AdminOrderUpdate>({});

  const loadOrder = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await adminApi.getOrderDetail(parseInt(id));
      setOrder(data);
      setEditData({
        payment_status: data.payment_status,
        fulfillment_status: data.fulfillment_status,
        note: data.note || "",
      });
    } catch (error) {
      console.error("Erreur chargement commande:", error);
      showToast(t("admin.errorLoadingOrder"), "error");
    } finally {
      setLoading(false);
    }
  }, [id, showToast, t]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleSaveChanges = async () => {
    if (!order) return;

    try {
      await adminApi.updateOrder(order.id, editData);
      showToast(t("admin.orderUpdated"), "success");
      setEditMode(false);
      loadOrder();
    } catch (error) {
      console.error("Erreur mise à jour:", error);
      showToast(t("admin.errorUpdating"), "error");
    }
  };

  const handleCancel = async () => {
    if (!order) return;

    const confirmed = await confirm({
      title: t("admin.cancelOrderTitle"),
      message: t("admin.cancelOrderMessage"),
      type: "danger",
    });

    if (!confirmed) return;

    try {
      await adminApi.cancelOrder(order.id);
      showToast(t("admin.orderCancelled"), "success");
      loadOrder();
    } catch (error) {
      console.error("Erreur annulation:", error);
      showToast(t("admin.errorCancelling"), "error");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants = {
      PENDING: { variant: "warning" as const, text: t("admin.paymentPending"), icon: Clock },
      PAID: { variant: "success" as const, text: t("admin.paymentPaid"), icon: CheckCircle },
      FAILED: { variant: "error" as const, text: t("admin.paymentFailed"), icon: XCircle },
      REFUNDED: {
        variant: "default" as const,
        text: t("admin.paymentRefunded"),
        icon: DollarSign,
      },
    };
    return variants[status as keyof typeof variants] || variants.PENDING;
  };

  const getFulfillmentStatusBadge = (status: string) => {
    const variants = {
      PENDING: { variant: "warning" as const, text: t("admin.fulfillmentPending"), icon: Clock },
      PROCESSING: {
        variant: "default" as const,
        text: t("admin.fulfillmentProcessing"),
        icon: Package,
      },
      SHIPPED: { variant: "default" as const, text: t("admin.fulfillmentShipped"), icon: Truck },
      DELIVERED: {
        variant: "success" as const,
        text: t("admin.fulfillmentDelivered"),
        icon: CheckCircle,
      },
      CANCELLED: { variant: "error" as const, text: t("admin.fulfillmentCancelled"), icon: XCircle },
    };
    return variants[status as keyof typeof variants] || variants.PENDING;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold mb-2">
            {t("admin.orderNotFound")}
          </h2>
          <p className="text-dark-text-secondary mb-6">
            {t("admin.orderDoesNotExist")}
          </p>
          <button
            onClick={() => navigate("/admin/orders")}
            className="px-6 py-2 bg-holo-cyan text-dark-bg font-medium rounded-xl hover:bg-holo-cyan/90 transition-all"
          >
            {t("admin.backToOrders")}
          </button>
        </Card>
      </div>
    );
  }

  const paymentBadge = getPaymentStatusBadge(order.payment_status);
  const fulfillmentBadge = getFulfillmentStatusBadge(order.fulfillment_status);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-2 text-dark-text-secondary hover:text-holo-cyan transition-all mb-4"
          >
            <ArrowLeft size={20} />
            {t("admin.backToOrders")}
          </Link>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display font-bold text-4xl mb-2">
                <span className="text-gradient animate-gradient-bg">
                  {t("admin.order")} #{order.id}
                </span>
              </h1>
              <p className="text-dark-text-secondary">
                {t("admin.createdOn")} {formatDateTime(order.created_at)}
              </p>
            </div>

            <div className="flex gap-2">
              {!editMode ? (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 bg-holo-purple text-white rounded-xl hover:bg-holo-purple/90 transition-all flex items-center gap-2"
                  >
                    <Edit2 size={16} />
                    {t("admin.edit")}
                  </button>
                  {order.fulfillment_status !== "CANCELLED" && (
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all flex items-center gap-2"
                    >
                      <XCircle size={16} />
                      {t("admin.cancelAction")}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all"
                  >
                    {t("admin.save")}
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setEditData({
                        payment_status: order.payment_status,
                        fulfillment_status: order.fulfillment_status,
                        note: order.note || "",
                      });
                    }}
                    className="px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl hover:border-white/20 transition-all"
                  >
                    {t("admin.cancelAction")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne Principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informations Client */}
            <Card>
              <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                <User className="text-holo-cyan" size={24} />
                {t("admin.customerInfo")}
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="text-dark-text-tertiary mt-1" size={20} />
                  <div>
                    <p className="text-sm text-dark-text-tertiary">{t("admin.name")}</p>
                    <p className="font-medium">{order.customer_name}</p>
                    {order.user && (
                      <Link
                        to={`/admin/users/${order.user}`}
                        className="text-sm text-holo-cyan hover:underline"
                      >
                        {t("admin.viewProfile")}
                      </Link>
                    )}
                  </div>
                </div>

                {order.customer_email && (
                  <div className="flex items-start gap-3">
                    <Mail className="text-dark-text-tertiary mt-1" size={20} />
                    <div>
                      <p className="text-sm text-dark-text-tertiary">{t("admin.email")}</p>
                      <p className="font-medium">{order.customer_email}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Phone className="text-dark-text-tertiary mt-1" size={20} />
                  <div>
                    <p className="text-sm text-dark-text-tertiary">{t("admin.phone")}</p>
                    <p className="font-medium">{order.customer_phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="text-dark-text-tertiary mt-1" size={20} />
                  <div>
                    <p className="text-sm text-dark-text-tertiary">
                      {t("admin.deliveryAddress")}
                    </p>
                    <p className="font-medium">
                      {order.address}, {order.city}
                    </p>
                  </div>
                </div>

                {order.note && (
                  <div className="p-3 bg-dark-bg-tertiary rounded-xl border border-white/10">
                    <p className="text-sm text-dark-text-tertiary mb-1">
                      {t("admin.deliveryNote")}
                    </p>
                    <p className="text-sm">{order.note}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Produits Commandés */}
            <Card>
              <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                <Package className="text-holo-purple" size={24} />
                {t("admin.orderedProducts")} ({order.items.length})
              </h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-3 rounded-xl bg-dark-bg-tertiary border border-white/10"
                  >
                    {item.product_image && (
                      <img
                        src={item.product_image}
                        alt={item.product_title}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <Link
                        to={`/product/${item.product_id}`}
                        target="_blank"
                        className="font-medium hover:text-holo-cyan transition-all"
                      >
                        {item.product_title}
                      </Link>
                      <p className="text-sm text-dark-text-tertiary">
                        {t("admin.vendor")}:{" "}
                        <span className="text-dark-text">
                          {item.vendor_name}
                        </span>
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span>
                          {t("admin.qty")}: <strong>{item.qty}</strong>
                        </span>
                        <span>
                          {t("admin.unitPrice")}:{" "}
                          <strong>
                            {formatCurrency(item.price_xaf_snapshot)}
                          </strong>
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-holo-cyan">
                        {formatCurrency(item.line_total_xaf)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totaux */}
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <div className="flex justify-between text-dark-text-secondary">
                  <span>{t("admin.subtotal")}</span>
                  <span>{formatCurrency(order.subtotal_xaf)}</span>
                </div>
                <div className="flex justify-between text-dark-text-secondary">
                  <span>{t("admin.deliveryFees")}</span>
                  <span>{formatCurrency(order.delivery_fee_xaf)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-2 border-t border-white/10">
                  <span>{t("admin.total")}</span>
                  <span className="text-holo-cyan">
                    {formatCurrency(order.total_xaf)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Transactions de Paiement */}
            <Card>
              <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                <CreditCard className="text-holo-pink" size={24} />
                {t("admin.paymentTransactions")}
              </h3>
              {order.payment_transactions.length === 0 ? (
                <p className="text-dark-text-secondary text-center py-6">
                  {t("admin.noTransactions")}
                </p>
              ) : (
                <div className="space-y-3">
                  {order.payment_transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-dark-bg-tertiary border border-white/10"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">
                            {t("admin.transaction")} #{tx.id.slice(0, 8)}...
                          </p>
                          <p className="text-sm text-dark-text-tertiary">
                            {tx.provider} • {tx.payer_phone}
                          </p>
                        </div>
                        <Badge
                          variant={
                            tx.status === "SUCCESS"
                              ? "success"
                              : tx.status === "FAILED"
                                ? "error"
                                : "warning"
                          }
                        >
                          {tx.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-dark-text-tertiary">
                          {formatDateTime(tx.created_at)}
                        </span>
                        <span className="font-bold text-holo-pink">
                          {formatCurrency(tx.amount_xaf)}
                        </span>
                      </div>
                      {tx.external_ref && (
                        <p className="text-xs text-dark-text-tertiary mt-2">
                          {t("admin.ref")}: {tx.external_ref}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Historique des Modifications (Audit Log) */}
            <Card>
              <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                <History className="text-holo-cyan" size={24} />
                {t("admin.changeHistory")}
              </h3>
              {order.history.length === 0 ? (
                <p className="text-dark-text-secondary text-center py-6">
                  {t("admin.noChanges")}
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {order.history.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-dark-bg-tertiary border border-white/10"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-holo-cyan">
                            {log.action}
                          </p>
                          <p className="text-sm text-dark-text-tertiary">
                            {t("admin.by")} <strong>{log.user_name}</strong>
                          </p>
                        </div>
                        <span className="text-xs text-dark-text-tertiary">
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>
                      {log.field_name && (
                        <div className="text-sm space-y-1">
                          <p className="text-dark-text-tertiary">
                            {t("admin.field")}: <strong>{log.field_name}</strong>
                          </p>
                          {log.old_value && (
                            <p className="text-red-400">
                              {t("admin.oldValue")}: {log.old_value}
                            </p>
                          )}
                          {log.new_value && (
                            <p className="text-green-400">
                              {t("admin.newValue")}: {log.new_value}
                            </p>
                          )}
                        </div>
                      )}
                      {log.ip_address && (
                        <p className="text-xs text-dark-text-tertiary mt-2">
                          IP: {log.ip_address}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Statuts */}
            <Card>
              <h3 className="font-display font-bold text-lg mb-4">{t("admin.statuses")}</h3>

              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-dark-text-tertiary mb-2">
                      {t("admin.paymentStatus")}
                    </label>
                    <select
                      value={editData.payment_status}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          payment_status: e.target.value as
                            | "PENDING"
                            | "PAID"
                            | "FAILED"
                            | "REFUNDED",
                        }))
                      }
                      className="w-full px-3 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-cyan transition-all"
                    >
                      <option value="PENDING">{t("admin.paymentPending")}</option>
                      <option value="PAID">{t("admin.paymentPaid")}</option>
                      <option value="FAILED">{t("admin.paymentFailed")}</option>
                      <option value="REFUNDED">{t("admin.paymentRefunded")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-dark-text-tertiary mb-2">
                      {t("admin.fulfillmentStatus")}
                    </label>
                    <select
                      value={editData.fulfillment_status}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          fulfillment_status: e.target.value as
                            | "PENDING"
                            | "PROCESSING"
                            | "SHIPPED"
                            | "DELIVERED"
                            | "CANCELLED",
                        }))
                      }
                      className="w-full px-3 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-purple transition-all"
                    >
                      <option value="PENDING">{t("admin.fulfillmentPending")}</option>
                      <option value="PROCESSING">{t("admin.fulfillmentProcessing")}</option>
                      <option value="SHIPPED">{t("admin.fulfillmentShipped")}</option>
                      <option value="DELIVERED">{t("admin.fulfillmentDelivered")}</option>
                      <option value="CANCELLED">{t("admin.fulfillmentCancelled")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-dark-text-tertiary mb-2">
                      {t("admin.internalNote")}
                    </label>
                    <textarea
                      value={editData.note}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          note: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full px-3 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-pink transition-all resize-none"
                      placeholder={t("admin.adminNotePlaceholder")}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-dark-text-tertiary mb-2">
                      {t("admin.payment")}
                    </p>
                    <Badge
                      variant={paymentBadge.variant}
                      className="w-full justify-center py-2"
                    >
                      <paymentBadge.icon size={16} className="mr-2" />
                      {paymentBadge.text}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm text-dark-text-tertiary mb-2">
                      {t("admin.delivery")}
                    </p>
                    <Badge
                      variant={fulfillmentBadge.variant}
                      className="w-full justify-center py-2"
                    >
                      <fulfillmentBadge.icon size={16} className="mr-2" />
                      {fulfillmentBadge.text}
                    </Badge>
                  </div>
                </div>
              )}
            </Card>

            {/* Documents */}
            <Card>
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <FileText className="text-holo-purple" size={20} />
                {t("admin.documents")}
              </h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl hover:border-holo-cyan transition-all flex items-center justify-between">
                  <span className="text-sm">{t("admin.invoice")}</span>
                  <Download size={16} />
                </button>
                <button className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl hover:border-holo-purple transition-all flex items-center justify-between">
                  <span className="text-sm">{t("admin.deliverySlip")}</span>
                  <Download size={16} />
                </button>
                <p className="text-xs text-dark-text-tertiary text-center mt-4">
                  {t("admin.documentGenerationComing")}
                </p>
              </div>
            </Card>

            {/* Dates */}
            <Card>
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <Clock className="text-holo-pink" size={20} />
                {t("admin.dates")}
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-dark-text-tertiary">{t("admin.createdOn")}</p>
                  <p className="font-medium">
                    {formatDateTime(order.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-dark-text-tertiary">{t("admin.updatedOn")}</p>
                  <p className="font-medium">
                    {formatDateTime(order.updated_at)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
