// frontend/src/features/orders/OrderDetailPage.tsx
// Page de détail d'une commande spécifique
// Affiche les informations détaillées d'une commande passée par l'utilisateur

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, MapPin, Calendar, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { ordersApi, type Order } from '@/services/api/orders';

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'text-green-400';
      case 'PENDING_PAYMENT':
        return 'text-yellow-400';
      case 'CANCELLED':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID':
        return t('orders.status_paid');
      case 'PENDING_PAYMENT':
        return t('orders.status_pending');
      case 'CANCELLED':
        return t('orders.status_cancelled');
      default:
        return status;
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
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-display font-bold text-3xl lg:text-4xl text-dark-text mb-2">
                {t('orders.order_number')} #{order.id}
              </h1>
              <p className="text-dark-text-secondary">
                {t('orders.placed_on')} {formatDate(order.created_at)}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-full glass border border-white/10 font-medium ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </div>
          </div>

          {/* Timeline */}
          <Card>
            <div className="flex items-center justify-between relative">
              {/* Progress Line */}
              <div className="absolute top-6 left-0 right-0 h-0.5 bg-white/10" />
              <div
                className={`absolute top-6 left-0 h-0.5 bg-gradient-holographic transition-all duration-500`}
                style={{ width: order.status === 'PAID' ? '100%' : '50%' }}
              />

              {/* Steps */}
              <div className="flex-1 flex items-center justify-between relative z-10">
                {/* Pending */}
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    order.status === 'PENDING_PAYMENT' || order.status === 'PAID'
                      ? 'bg-gradient-holographic'
                      : 'glass border border-white/10'
                  }`}>
                    <Package className="text-white" size={20} />
                  </div>
                  <span className="text-xs text-dark-text-secondary text-center">
                    {t('orders.status_pending')}
                  </span>
                </div>

                {/* Paid */}
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    order.status === 'PAID'
                      ? 'bg-gradient-holographic'
                      : 'glass border border-white/10'
                  }`}>
                    <CheckCircle className="text-white" size={20} />
                  </div>
                  <span className="text-xs text-dark-text-secondary text-center">
                    {t('orders.status_paid')}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <Card>
              <h2 className="font-display font-bold text-xl text-dark-text mb-4">
                {t('checkout.summary')}
              </h2>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                    <div className="flex-1">
                      <h3 className="font-medium text-dark-text mb-1">
                        {item.title_snapshot}
                      </h3>
                      <p className="text-sm text-dark-text-tertiary">
                        {item.price_xaf_snapshot.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} {t('common.currency')} × {item.qty}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-dark-text">
                        {item.line_total_xaf.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} {t('common.currency')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Delivery Info */}
            <Card>
              <h2 className="font-display font-bold text-xl text-dark-text mb-4 flex items-center gap-2">
                <MapPin className="text-holo-cyan" size={20} />
                {t('orders.delivery_info')}
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-dark-text-secondary mb-1">{t('checkout.city')}</p>
                  <p className="text-dark-text font-medium">{order.city}</p>
                </div>
                <div>
                  <p className="text-sm text-dark-text-secondary mb-1">{t('checkout.address')}</p>
                  <p className="text-dark-text font-medium">{order.address}</p>
                </div>
                <div>
                  <p className="text-sm text-dark-text-secondary mb-1">{t('checkout.phone')}</p>
                  <p className="text-dark-text font-medium">{order.customer_phone}</p>
                </div>
                {order.note && (
                  <div>
                    <p className="text-sm text-dark-text-secondary mb-1">Note</p>
                    <p className="text-dark-text">{order.note}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Order Summary */}
            <Card className="sticky top-24">
              <h2 className="font-display font-bold text-xl text-dark-text mb-4">
                {t('orders.order_summary')}
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-dark-text-secondary">
                  <span>{t('cart.subtotal')}</span>
                  <span className="font-medium text-dark-text">
                    {order.subtotal_xaf.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} {t('common.currency')}
                  </span>
                </div>

                <div className="flex justify-between text-dark-text-secondary">
                  <span>{t('cart.shipping')}</span>
                  <span className="font-medium text-dark-text">
                    {order.delivery_fee_xaf.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} {t('common.currency')}
                  </span>
                </div>

                <div className="pt-3 border-t border-white/10">
                  <div className="flex justify-between">
                    <span className="font-display font-bold text-lg text-dark-text">
                      {t('cart.total')}
                    </span>
                    <span className="font-display font-bold text-2xl text-gradient animate-gradient-bg">
                      {order.total_xaf.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} {t('common.currency')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="pt-6 border-t border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard className="text-holo-purple" size={20} />
                  <h3 className="font-semibold text-dark-text">{t('orders.payment_info')}</h3>
                </div>
                <p className="text-sm text-dark-text-secondary">
                  {t('orders.mobile_money')}
                </p>
              </div>

              {/* Order Date */}
              <div className="pt-6 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <Calendar className="text-holo-cyan" size={20} />
                  <div>
                    <p className="text-sm text-dark-text-secondary">{t('orders.date')}</p>
                    <p className="text-dark-text font-medium">{formatDate(order.created_at)}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}