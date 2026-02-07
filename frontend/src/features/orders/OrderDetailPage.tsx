// frontend/src/features/orders/OrderDetailPage.tsx
// Page de détail d'une commande avec statuts séparés paiement/livraison

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { ordersApi } from '@/services/api/orders';
import type { Order, PaymentStatus, FulfillmentStatus } from '@/types/order';

export default function OrderDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await ordersApi.get(parseInt(id));
        setOrder(data);
      } catch (err) {
        console.error('Error loading order:', err);
        setError(t('orders.error_message'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, t]);

  const getPaymentStatusInfo = (status: PaymentStatus) => {
    switch (status) {
      case 'PENDING':
        return {
          variant: 'warning' as const,
          text: 'En attente de paiement',
          icon: Clock,
          color: 'text-yellow-400',
        };
      case 'PAID':
        return {
          variant: 'success' as const,
          text: 'Payé',
          icon: CheckCircle,
          color: 'text-green-400',
        };
      case 'FAILED':
        return {
          variant: 'error' as const,
          text: 'Échec du paiement',
          icon: XCircle,
          color: 'text-red-400',
        };
      case 'REFUNDED':
        return {
          variant: 'default' as const,
          text: 'Remboursé',
          icon: CreditCard,
          color: 'text-gray-400',
        };
    }
  };

  const getFulfillmentStatusInfo = (status: FulfillmentStatus) => {
    switch (status) {
      case 'PENDING':
        return {
          variant: 'warning' as const,
          text: 'En attente',
          icon: Clock,
          color: 'text-yellow-400',
          step: 0,
        };
      case 'PROCESSING':
        return {
          variant: 'default' as const,
          text: 'En préparation',
          icon: Package,
          color: 'text-blue-400',
          step: 1,
        };
      case 'SHIPPED':
        return {
          variant: 'success' as const,
          text: 'Expédié',
          icon: Truck,
          color: 'text-purple-400',
          step: 2,
        };
      case 'DELIVERED':
        return {
          variant: 'success' as const,
          text: 'Livré',
          icon: CheckCircle,
          color: 'text-green-400',
          step: 3,
        };
      case 'CANCELLED':
        return {
          variant: 'error' as const,
          text: 'Annulé',
          icon: XCircle,
          color: 'text-red-400',
          step: -1,
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatPrice = (price: number) => {
    return `${price.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} XAF`;
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin mb-4" />
          <p className="text-dark-text-secondary">{t('orders.loading')}</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="text-red-400" size={40} />
          </div>
          <h1 className="font-display font-bold text-2xl text-dark-text mb-4">
            {t('orders.error')}
          </h1>
          <p className="text-dark-text-secondary mb-8">{error}</p>
          <Button variant="gradient" onClick={() => navigate('/orders')}>
            {t('orders.back_to_orders')}
          </Button>
        </div>
      </div>
    );
  }

  const paymentInfo = getPaymentStatusInfo(order.payment_status);
  const fulfillmentInfo = getFulfillmentStatusInfo(order.fulfillment_status);

  // Timeline steps
  const timelineSteps = [
    { label: 'En attente', step: 0 },
    { label: 'En préparation', step: 1 },
    { label: 'Expédié', step: 2 },
    { label: 'Livré', step: 3 },
  ];

  const currentStep = fulfillmentInfo.step;

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Back Button */}
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-dark-text-secondary hover:text-holo-cyan transition-colors mb-8"
        >
          <ArrowLeft size={20} />
          {t('orders.back_to_orders')}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <h1 className="font-display font-bold text-3xl lg:text-4xl text-dark-text mb-2">
                {t('orders.order_number')} #{order.id}
              </h1>
              <p className="text-dark-text-secondary">
                {t('orders.placed_on')} {formatDate(order.created_at)}
              </p>
            </div>
            
            {/* Status Badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant={paymentInfo.variant} className="flex items-center gap-1">
                <paymentInfo.icon size={14} />
                {paymentInfo.text}
              </Badge>
              <Badge variant={fulfillmentInfo.variant} className="flex items-center gap-1">
                <fulfillmentInfo.icon size={14} />
                {fulfillmentInfo.text}
              </Badge>
            </div>
          </div>

          {/* Timeline (si pas annulé) */}
          {order.fulfillment_status !== 'CANCELLED' && (
            <Card>
              <div className="relative">
                {/* Progress Bar */}
                <div className="absolute top-6 left-0 right-0 h-1 bg-white/10 rounded-full" />
                <div
                  className="absolute top-6 left-0 h-1 bg-gradient-holographic rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                />

                {/* Steps */}
                <div className="relative flex items-start justify-between">
                  {timelineSteps.map((step) => {
                    const isActive = currentStep >= step.step;
                    const isCurrent = currentStep === step.step;

                    return (
                      <div key={step.step} className="flex flex-col items-center flex-1">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                            isActive
                              ? 'bg-gradient-holographic shadow-lg shadow-holo-cyan/30'
                              : 'bg-white/10 border-2 border-white/20'
                          }`}
                        >
                          {isActive ? (
                            <CheckCircle className="text-white" size={24} />
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-white/30" />
                          )}
                        </div>
                        <p
                          className={`text-sm text-center ${
                            isCurrent ? 'text-holo-cyan font-medium' : 'text-dark-text-secondary'
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Articles */}
            <Card>
              <h2 className="font-display font-bold text-2xl text-dark-text mb-6 flex items-center gap-2">
                <Package size={24} className="text-holo-cyan" />
                Articles commandés
              </h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 glass rounded-xl border border-white/10"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-dark-text mb-1">
                        {item.title_snapshot}
                      </h3>
                      <p className="text-sm text-dark-text-secondary">
                        {formatPrice(item.price_xaf_snapshot)} × {item.qty}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-lg text-dark-text">
                        {formatPrice(item.line_total_xaf)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Note client */}
            {order.note && (
              <Card>
                <h3 className="font-semibold text-dark-text mb-3">Note</h3>
                <p className="text-dark-text-secondary">{order.note}</p>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Récapitulatif */}
            <Card>
              <h3 className="font-semibold text-dark-text mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-holo-pink" />
                Récapitulatif
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-text-secondary">Sous-total</span>
                  <span className="text-dark-text font-medium">
                    {formatPrice(order.subtotal_xaf)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-text-secondary">Livraison</span>
                  <span className="text-dark-text font-medium">
                    {formatPrice(order.delivery_fee_xaf)}
                  </span>
                </div>
                <div className="pt-3 border-t border-white/10 flex justify-between">
                  <span className="font-semibold text-dark-text">Total</span>
                  <span className="font-display font-bold text-2xl text-gradient animate-gradient-bg">
                    {formatPrice(order.total_xaf)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Livraison */}
            <Card>
              <h3 className="font-semibold text-dark-text mb-4 flex items-center gap-2">
                <MapPin size={20} className="text-holo-purple" />
                Livraison
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-dark-text-tertiary mb-1">Ville</p>
                  <p className="text-dark-text font-medium">{order.city}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-text-tertiary mb-1">Adresse</p>
                  <p className="text-dark-text text-sm">{order.address}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-text-tertiary mb-1 flex items-center gap-1">
                    <Phone size={12} />
                    Téléphone
                  </p>
                  <p className="text-dark-text">{order.customer_phone}</p>
                </div>
                {order.customer_email && (
                  <div>
                    <p className="text-xs text-dark-text-tertiary mb-1 flex items-center gap-1">
                      <Mail size={12} />
                      Email
                    </p>
                    <p className="text-dark-text text-sm">{order.customer_email}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Paiement */}
            <Card>
              <h3 className="font-semibold text-dark-text mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-holo-cyan" />
                Paiement
              </h3>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${paymentInfo.color.replace('text-', 'bg-')}/10`}>
                  <paymentInfo.icon className={paymentInfo.color} size={20} />
                </div>
                <div>
                  <p className="font-medium text-dark-text">{paymentInfo.text}</p>
                  <p className="text-xs text-dark-text-tertiary">Mobile Money</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}