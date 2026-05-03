// frontend/src/features/vendors/VendorOrdersPage.tsx
// Page de gestion des commandes pour les vendeurs avec filtres de statuts

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, Eye, Filter, CreditCard, Truck } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import {
  vendorsApi,
  type FulfillmentStatus,
  type PaymentStatus,
  type VendorOrder,
  type VendorOrderFilters,
} from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';

export default function VendorOrdersPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<VendorOrderFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await vendorsApi.getOrders(filters);
      setOrders(data);
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
      showToast(t('vendor.errorLoadingOrders'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentFilterChange = (status: PaymentStatus | '') => {
    setFilters((prev: VendorOrderFilters) => ({
      ...prev,
      payment_status: status || undefined
    }));
  };

  const handleFulfillmentFilterChange = (status: FulfillmentStatus | '') => {
    setFilters((prev: VendorOrderFilters) => ({
      ...prev,
      fulfillment_status: status || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
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

  const getFulfillmentStatusBadge = (status: FulfillmentStatus) => {
    switch (status) {
      case 'CREATED':
        return { variant: 'warning' as const, text: 'Creee' };
      case 'PAID_IN_ESCROW':
        return { variant: 'warning' as const, text: 'Payee' };
      case 'VENDOR_ACKNOWLEDGED':
        return { variant: 'default' as const, text: 'Confirmee' };
      case 'PREPARING':
        return { variant: 'default' as const, text: t('vendor.fulfillmentProcessing') };
      case 'READY_FOR_PICKUP':
        return { variant: 'success' as const, text: 'Prete' };
      case 'DRIVER_ASSIGNED':
        return { variant: 'default' as const, text: 'Livreur assigne' };
      case 'PICKED_UP':
        return { variant: 'default' as const, text: 'Recuperee' };
      case 'OUT_FOR_DELIVERY':
        return { variant: 'default' as const, text: 'En livraison' };
      case 'DELIVERED':
        return { variant: 'success' as const, text: t('vendor.fulfillmentDelivered') };
      case 'BUYER_CONFIRMED':
        return { variant: 'success' as const, text: 'Confirmee par acheteur' };
      case 'AUTO_CONFIRMED':
        return { variant: 'success' as const, text: 'Confirmee automatiquement' };
      case 'RELEASED_TO_VENDOR':
        return { variant: 'success' as const, text: 'Fonds liberes' };
      case 'DISPUTED':
        return { variant: 'error' as const, text: 'Litige' };
      case 'CANCELLED':
        return { variant: 'error' as const, text: t('vendor.fulfillmentCancelled') };
      case 'REFUNDED':
        return { variant: 'default' as const, text: t('vendor.paymentRefunded') };
      default:
        return { variant: 'default' as const, text: status };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
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
          <p className="text-dark-text-secondary">{t('vendor.loadingOrders')}</p>
        </div>
      </div>
    );
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display font-bold text-4xl mb-2">
              <span className="text-gradient animate-gradient-bg">{t('vendor.myOrders')}</span>
            </h1>
            <p className="text-dark-text-secondary">
              {t('vendor.manageOrdersAndStatus')}
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter size={20} className="mr-2" />
            {t('vendor.filters')}
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-holo-cyan text-dark-bg text-xs flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Filtres */}
        {showFilters && (
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Filtre statut de paiement */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-3">
                  <CreditCard size={16} className="text-holo-purple" />
                  {t('vendor.paymentStatusLabel')}
                </label>
                <select
                  value={filters.payment_status || ''}
                  onChange={(e) => handlePaymentFilterChange(e.target.value as PaymentStatus | '')}
                  className="w-full px-4 py-2 rounded-lg bg-dark-accent text-dark-text border border-dark-accent focus:border-holo-cyan focus:outline-none"
                >
                  <option value="">{t('vendor.all')}</option>
                  <option value="PENDING">{t('vendor.paymentPending')}</option>
                  <option value="PAID">{t('vendor.paymentPaid')}</option>
                  <option value="FAILED">{t('vendor.paymentFailed')}</option>
                  <option value="REFUNDED">{t('vendor.paymentRefunded')}</option>
                </select>
              </div>

              {/* Filtre statut de livraison */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Truck size={16} className="text-holo-cyan" />
                  {t('vendor.fulfillmentStatusLabel')}
                </label>
                <select
                  value={filters.fulfillment_status || ''}
                  onChange={(e) => handleFulfillmentFilterChange(e.target.value as FulfillmentStatus | '')}
                  className="w-full px-4 py-2 rounded-lg bg-dark-accent text-dark-text border border-dark-accent focus:border-holo-cyan focus:outline-none"
                >
                  <option value="">{t('vendor.all')}</option>
                  <option value="CREATED">Creee</option>
                  <option value="PAID_IN_ESCROW">Payee</option>
                  <option value="VENDOR_ACKNOWLEDGED">Confirmee</option>
                  <option value="PREPARING">{t('vendor.fulfillmentProcessing')}</option>
                  <option value="READY_FOR_PICKUP">Prete</option>
                  <option value="DRIVER_ASSIGNED">Livreur assigne</option>
                  <option value="PICKED_UP">Recuperee</option>
                  <option value="OUT_FOR_DELIVERY">En livraison</option>
                  <option value="DELIVERED">{t('vendor.fulfillmentDelivered')}</option>
                  <option value="BUYER_CONFIRMED">Confirmee par acheteur</option>
                  <option value="AUTO_CONFIRMED">Confirmee automatiquement</option>
                  <option value="RELEASED_TO_VENDOR">Fonds liberes</option>
                  <option value="DISPUTED">Litige</option>
                  <option value="CANCELLED">{t('vendor.fulfillmentCancelled')}</option>
                  <option value="REFUNDED">{t('vendor.paymentRefunded')}</option>
                </select>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="mt-4 pt-4 border-t border-dark-accent/50">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearFilters}
                >
                  {t('vendor.resetFilters')}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Liste des commandes */}
        {orders.length === 0 ? (
          <Card className="text-center py-12">
            <Package className="text-dark-text-secondary mx-auto mb-4" size={48} />
            <h2 className="font-bold text-xl text-dark-text mb-2">
              {t('vendor.noOrders')}
            </h2>
            <p className="text-dark-text-secondary">
              {activeFilterCount > 0
                ? t('vendor.noOrdersMatchingFilters')
                : t('vendor.noOrdersYet')}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const paymentBadge = getPaymentStatusBadge(order.payment_status);
              const fulfillmentBadge = getFulfillmentStatusBadge(order.fulfillment_status);

              return (
                <Card key={order.id} className="hover:border-holo-cyan/50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Informations de base */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-display font-bold text-xl">
                          {t('vendor.order')} <span className="text-holo-cyan">#{order.id}</span>
                        </h3>
                        <div className="flex gap-2">
                          <Badge variant={paymentBadge.variant}>
                            <CreditCard size={14} className="mr-1" />
                            {paymentBadge.text}
                          </Badge>
                          <Badge variant={fulfillmentBadge.variant}>
                            <Truck size={14} className="mr-1" />
                            {fulfillmentBadge.text}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-dark-text-secondary">
                        <span>{formatDate(order.created_at)}</span>
                        <span>•</span>
                        <span>{t('vendor.itemCount', { count: order.items.length })}</span>
                        <span>•</span>
                        <span>{order.city}</span>
                      </div>
                    </div>

                    {/* Prix et action */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-holo-cyan">
                          {formatPrice(order.total_xaf)}
                        </p>
                      </div>

                      <Link to={`/seller/orders/${order.id}`}>
                        <Button variant="primary">
                          <Eye size={20} className="mr-2" />
                          {t('vendor.viewDetails')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
