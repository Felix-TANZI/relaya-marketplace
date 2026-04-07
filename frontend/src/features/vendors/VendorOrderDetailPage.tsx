// frontend/src/features/vendors/VendorOrderDetailPage.tsx
// Page de détail d'une commande pour le vendeur avec gestion séparée des statuts

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Truck,
  CreditCard
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { vendorsApi, type VendorOrder } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import type { PaymentStatus, FulfillmentStatus } from '@/types/order';

export default function VendorOrderDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [updatingFulfillment, setUpdatingFulfillment] = useState(false);

  const loadOrder = useCallback(async (orderId: number) => {
    try {
      setLoading(true);
      const data = await vendorsApi.getOrderDetail(orderId);
      setOrder(data);
    } catch (error) {
      console.error('Erreur chargement commande:', error);
      showToast(t('vendor.errorLoadingOrder'), 'error');
      navigate('/seller/orders');
    } finally {
      setLoading(false);
    }
  }, [showToast, navigate, t]);

  useEffect(() => {
    if (id) {
      loadOrder(parseInt(id));
    }
  }, [id, loadOrder]);

  const handlePaymentStatusChange = async (newStatus: PaymentStatus) => {
    if (!order) return;

    const confirmed = await confirm({
      title: t('vendor.confirmPaymentStatusChange'),
      message: t('vendor.confirmPaymentStatusChangeMessage', { status: getPaymentStatusLabel(newStatus) }),
      type: 'warning',
      confirmText: t('vendor.confirm'),
      cancelText: t('vendor.cancel'),
    });

    if (!confirmed) return;

    try {
      setUpdatingPayment(true);
      const updatedOrder = await vendorsApi.updatePaymentStatus(order.id, {
        payment_status: newStatus
      });
      setOrder(updatedOrder);
      showToast(t('vendor.paymentStatusUpdated'), 'success');
    } catch (error) {
      console.error('Erreur mise à jour statut paiement:', error);
      showToast(t('vendor.errorUpdatingPaymentStatus'), 'error');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleFulfillmentStatusChange = async (newStatus: FulfillmentStatus) => {
    if (!order) return;

    if (!order.is_paid && newStatus !== 'CANCELLED') {
      showToast(t('vendor.orderMustBePaid'), 'error');
      return;
    }

    const confirmed = await confirm({
      title: t('vendor.confirmFulfillmentStatusChange'),
      message: t('vendor.confirmFulfillmentStatusChangeMessage', { status: getFulfillmentStatusLabel(newStatus) }),
      type: newStatus === 'CANCELLED' ? 'danger' : 'success',
      confirmText: t('vendor.confirm'),
      cancelText: t('vendor.cancel'),
    });

    if (!confirmed) return;

    try {
      setUpdatingFulfillment(true);
      const updatedOrder = await vendorsApi.updateFulfillmentStatus(order.id, {
        fulfillment_status: newStatus
      });
      setOrder(updatedOrder);
      showToast(t('vendor.fulfillmentStatusUpdated'), 'success');
    } catch (error) {
      console.error('Erreur mise à jour statut livraison:', error);
      showToast(t('vendor.errorUpdatingFulfillmentStatus'), 'error');
    } finally {
      setUpdatingFulfillment(false);
    }
  };

  const getPaymentStatusLabel = (status: PaymentStatus): string => {
    switch (status) {
      case 'PENDING':
        return t('vendor.paymentPending');
      case 'PAID':
        return t('vendor.paymentPaid');
      case 'FAILED':
        return t('vendor.paymentFailed');
      case 'REFUNDED':
        return t('vendor.paymentRefunded');
      default:
        return status;
    }
  };

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'PENDING':
        return { variant: 'warning' as const, text: t('vendor.paymentPending') };
      case 'PAID':
        return { variant: 'success' as const, text: t('vendor.paymentPaid') };
      case 'FAILED':
        return { variant: 'error' as const, text: t('vendor.paymentFailed') };
      case 'REFUNDED':
        return { variant: 'default' as const, text: t('vendor.paymentRefunded') };
      default:
        return { variant: 'default' as const, text: status };
    }
  };

  const getFulfillmentStatusLabel = (status: FulfillmentStatus): string => {
    switch (status) {
      case 'PENDING':
        return t('vendor.fulfillmentPending');
      case 'PROCESSING':
        return t('vendor.fulfillmentProcessing');
      case 'SHIPPED':
        return t('vendor.fulfillmentShipped');
      case 'DELIVERED':
        return t('vendor.fulfillmentDelivered');
      case 'CANCELLED':
        return t('vendor.fulfillmentCancelled');
      default:
        return status;
    }
  };

  const getFulfillmentStatusBadge = (status: FulfillmentStatus) => {
    switch (status) {
      case 'PENDING':
        return { variant: 'warning' as const, text: t('vendor.fulfillmentPending') };
      case 'PROCESSING':
        return { variant: 'default' as const, text: t('vendor.fulfillmentProcessing') };
      case 'SHIPPED':
        return { variant: 'success' as const, text: t('vendor.fulfillmentShipped') };
      case 'DELIVERED':
        return { variant: 'success' as const, text: t('vendor.fulfillmentDelivered') };
      case 'CANCELLED':
        return { variant: 'error' as const, text: t('vendor.fulfillmentCancelled') };
      default:
        return { variant: 'default' as const, text: status };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} XAF`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin mb-4" />
          <p className="text-dark-text-secondary">{t('vendor.loadingOrder')}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <Card className="max-w-md text-center">
          <AlertCircle className="text-red-400 mx-auto mb-4" size={48} />
          <h2 className="font-bold text-xl text-dark-text mb-2">{t('vendor.orderNotFound')}</h2>
          <p className="text-dark-text-secondary mb-6">
            {t('vendor.orderNotFoundMessage')}
          </p>
          <Link to="/seller/orders">
            <Button variant="secondary">
              <ArrowLeft size={20} className="mr-2" />
              {t('vendor.backToOrders')}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const paymentBadge = getPaymentStatusBadge(order.payment_status);
  const fulfillmentBadge = getFulfillmentStatusBadge(order.fulfillment_status);

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Link to="/seller/orders">
            <Button variant="secondary" className="mb-4">
              <ArrowLeft size={20} className="mr-2" />
              {t('vendor.backToOrders')}
            </Button>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-3xl mb-2">
                {t('vendor.order')} <span className="text-gradient">#{order.id}</span>
              </h1>
              <p className="text-dark-text-secondary">
                {t('vendor.placedOn')} {formatDate(order.created_at)}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Badge variant={paymentBadge.variant}>
                <CreditCard size={16} className="mr-1" />
                {paymentBadge.text}
              </Badge>
              <Badge variant={fulfillmentBadge.variant}>
                <Truck size={16} className="mr-1" />
                {fulfillmentBadge.text}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Articles */}
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <Package className="text-holo-cyan" size={24} />
                <h2 className="font-display font-bold text-xl">{t('vendor.orderedItems')}</h2>
              </div>

              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-dark-accent/30"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-dark-text mb-1">
                        {item.product_title}
                      </p>
                      <p className="text-sm text-dark-text-secondary">
                        {formatPrice(item.product_price)} × {item.qty}
                      </p>
                    </div>
                    <p className="font-semibold text-holo-cyan">
                      {formatPrice(item.line_total_xaf)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Actions de paiement */}
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="text-holo-purple" size={24} />
                <h2 className="font-display font-bold text-xl">{t('vendor.paymentManagement')}</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-dark-text-secondary">{t('vendor.currentStatus')}</span>
                  <Badge variant={paymentBadge.variant}>{paymentBadge.text}</Badge>
                </div>

                {order.payment_status === 'PENDING' && (
                  <Button
                    variant="primary"
                    onClick={() => handlePaymentStatusChange('PAID')}
                    disabled={updatingPayment}
                    className="w-full"
                  >
                    {updatingPayment ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        {t('vendor.updating')}
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} className="mr-2" />
                        {t('vendor.markAsPaid')}
                      </>
                    )}
                  </Button>
                )}

                <p className="text-xs text-dark-text-secondary">
                  {t('vendor.paymentStatusNote')}
                </p>
              </div>
            </Card>

            {/* Actions de livraison */}
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <Truck className="text-holo-cyan" size={24} />
                <h2 className="font-display font-bold text-xl">{t('vendor.deliveryManagement')}</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-dark-text-secondary">{t('vendor.currentStatus')}</span>
                  <Badge variant={fulfillmentBadge.variant}>{fulfillmentBadge.text}</Badge>
                </div>

                {!order.is_paid && order.fulfillment_status !== 'CANCELLED' && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-sm text-yellow-400">
                      {t('vendor.orderMustBePaidWarning')}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {order.fulfillment_status === 'PENDING' && order.is_paid && (
                    <Button
                      variant="secondary"
                      onClick={() => handleFulfillmentStatusChange('PROCESSING')}
                      disabled={updatingFulfillment}
                      className="col-span-2"
                    >
                      {t('vendor.takeInCharge')}
                    </Button>
                  )}

                  {order.fulfillment_status === 'PROCESSING' && (
                    <Button
                      variant="primary"
                      onClick={() => handleFulfillmentStatusChange('SHIPPED')}
                      disabled={updatingFulfillment}
                      className="col-span-2"
                    >
                      {t('vendor.markAsShipped')}
                    </Button>
                  )}

                  {order.fulfillment_status === 'SHIPPED' && (
                    <Button
                      variant="primary"
                      onClick={() => handleFulfillmentStatusChange('DELIVERED')}
                      disabled={updatingFulfillment}
                      className="col-span-2"
                    >
                      {t('vendor.markAsDelivered')}
                    </Button>
                  )}

                  {order.fulfillment_status !== 'CANCELLED' && order.fulfillment_status !== 'DELIVERED' && (
                    <Button
                      variant="secondary"
                      onClick={() => handleFulfillmentStatusChange('CANCELLED')}
                      disabled={updatingFulfillment}
                      className="col-span-2"
                    >
                      {t('vendor.cancel')}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Colonne latérale */}
          <div className="space-y-6">
            {/* Informations client */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <User className="text-holo-purple" size={20} />
                <h3 className="font-display font-bold">{t('vendor.customer')}</h3>
              </div>

              <div className="space-y-3 text-sm">
                {order.customer_email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-dark-text-secondary" />
                    <span>{order.customer_email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-dark-text-secondary" />
                  <span>{order.customer_phone}</span>
                </div>
              </div>
            </Card>

            {/* Informations de livraison */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="text-holo-cyan" size={20} />
                <h3 className="font-display font-bold">{t('vendor.delivery')}</h3>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium">{order.city}</p>
                <p className="text-dark-text-secondary">{order.address}</p>
                {order.note && (
                  <div className="mt-3 p-2 rounded bg-dark-accent/30">
                    <p className="text-xs text-dark-text-secondary">{t('vendor.note')} :</p>
                    <p className="text-sm">{order.note}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Résumé financier */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="text-holo-cyan" size={20} />
                <h3 className="font-display font-bold">{t('vendor.summary')}</h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-text-secondary">{t('vendor.subtotal')}</span>
                  <span>{formatPrice(order.subtotal_xaf)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-text-secondary">{t('vendor.deliveryFee')}</span>
                  <span>{formatPrice(order.delivery_fee_xaf)}</span>
                </div>
                <div className="h-px bg-dark-accent/50" />
                <div className="flex justify-between font-bold text-lg">
                  <span>{t('vendor.total')}</span>
                  <span className="text-holo-cyan">{formatPrice(order.total_xaf)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
