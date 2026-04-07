// frontend/src/features/admin/OrdersManagementPage.tsx
// Gestion des commandes par l'administration

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart,
  Search,
  Filter,
  Eye,
  XCircle,
  Download,
  DollarSign,
  CheckCircle,
  Clock,
  Truck,
  PackageCheck,
  Ban,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { adminApi, type AdminOrder, type OrderFilters } from '@/services/api/admin';
import { useToast } from '@/context/ToastContext';

export default function OrdersManagementPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<OrderFilters>({});

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.listOrders(filters);
      setOrders(data);
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
      showToast(t('admin.orders_load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast, t]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchQuery }));
  };

  const handleExportCSV = () => {
    const url = adminApi.exportOrdersCSV(filters);
    window.open(url, '_blank');
    showToast(t('admin.exporting_csv'), 'success');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants = {
      PENDING: { variant: 'warning' as const, text: t('admin.pending'), icon: Clock },
      PAID: { variant: 'success' as const, text: t('admin.paid'), icon: CheckCircle },
      FAILED: { variant: 'error' as const, text: t('admin.failed'), icon: XCircle },
      REFUNDED: { variant: 'default' as const, text: t('admin.refunded'), icon: DollarSign },
    };
    return variants[status as keyof typeof variants] || variants.PENDING;
  };

  const getFulfillmentStatusBadge = (status: string) => {
    const variants = {
      PENDING: { variant: 'warning' as const, text: t('admin.pending'), icon: Clock },
      PROCESSING: { variant: 'default' as const, text: t('admin.processing'), icon: PackageCheck },
      SHIPPED: { variant: 'default' as const, text: t('admin.shipped'), icon: Truck },
      DELIVERED: { variant: 'success' as const, text: t('admin.delivered_status'), icon: CheckCircle },
      CANCELLED: { variant: 'error' as const, text: t('admin.cancelled'), icon: Ban },
    };
    return variants[status as keyof typeof variants] || variants.PENDING;
  };

  // Stats calculées
  const stats = {
    total: orders.length,
    pending_payment: orders.filter((o) => o.payment_status === 'PENDING').length,
    paid: orders.filter((o) => o.payment_status === 'PAID').length,
    pending_fulfillment: orders.filter((o) => o.fulfillment_status === 'PENDING').length,
    delivered: orders.filter((o) => o.fulfillment_status === 'DELIVERED').length,
    total_revenue: orders
      .filter((o) => o.payment_status === 'PAID')
      .reduce((sum, o) => sum + o.total_xaf, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-4xl mb-2">
            <span className="text-gradient animate-gradient-bg">{t('admin.orders_management')}</span>
          </h1>
          <p className="text-dark-text-secondary">
            {t('admin.orders_subtitle')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">{t('admin.total_orders')}</p>
                <p className="font-display font-bold text-3xl">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-holo-cyan/10 flex items-center justify-center">
                <ShoppingCart className="text-holo-cyan" size={24} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">{t('admin.total_revenue')}</p>
                <p className="font-display font-bold text-2xl text-green-400">
                  {formatCurrency(stats.total_revenue)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <DollarSign className="text-green-400" size={24} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">{t('admin.pending_payment')}</p>
                <p className="font-display font-bold text-3xl text-yellow-400">
                  {stats.pending_payment}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Clock className="text-yellow-400" size={24} />
              </div>
            </div>
          </Card>
        </div>

        {/* Filtres Avancés */}
        <Card className="mb-6">
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Filter className="text-holo-purple" size={20} />
            {t('admin.advanced_filters')}
          </h3>

          {/* Ligne 1 : Recherche */}
          <div className="mb-4">
            <label className="block text-sm text-dark-text-tertiary mb-2">
              {t('admin.search_label')}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-tertiary"
                  size={20}
                />
                <input
                  type="text"
                  placeholder={t('admin.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text placeholder-dark-text-tertiary focus:outline-none focus:border-holo-cyan transition-all"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-holo-cyan text-dark-bg font-medium rounded-xl hover:bg-holo-cyan/90 transition-all"
              >
                {t('admin.search')}
              </button>
            </div>
          </div>

          {/* Ligne 2 : Statuts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-dark-text-tertiary mb-2">
                {t('admin.payment_status')}
              </label>
              <select
                value={filters.payment_status || ''}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, payment_status: e.target.value || undefined }))
                }
                className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-purple transition-all"
              >
                <option value="">{t('admin.all')}</option>
                <option value="PENDING">{t('admin.pending')}</option>
                <option value="PAID">{t('admin.paid')}</option>
                <option value="FAILED">{t('admin.failed')}</option>
                <option value="REFUNDED">{t('admin.refunded')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-dark-text-tertiary mb-2">
                {t('admin.delivery_status')}
              </label>
              <select
                value={filters.fulfillment_status || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    fulfillment_status: e.target.value || undefined,
                  }))
                }
                className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-purple transition-all"
              >
                <option value="">{t('admin.all')}</option>
                <option value="PENDING">{t('admin.pending')}</option>
                <option value="PROCESSING">{t('admin.processing')}</option>
                <option value="SHIPPED">{t('admin.shipped')}</option>
                <option value="DELIVERED">{t('admin.delivered_status')}</option>
                <option value="CANCELLED">{t('admin.cancelled')}</option>
              </select>
            </div>
          </div>

          {/* Ligne 3 : Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-dark-text-tertiary mb-2">{t('admin.date_from')}</label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, date_from: e.target.value || undefined }))
                }
                className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-pink transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-dark-text-tertiary mb-2">{t('admin.date_to')}</label>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, date_to: e.target.value || undefined }))
                }
                className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-pink transition-all"
              />
            </div>
          </div>

          {/* Ligne 4 : Montants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-dark-text-tertiary mb-2">
                {t('admin.min_amount')}
              </label>
              <input
                type="number"
                value={filters.min_amount || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    min_amount: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
                placeholder="0"
                className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-cyan transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-dark-text-tertiary mb-2">
                {t('admin.max_amount')}
              </label>
              <input
                type="number"
                value={filters.max_amount || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    max_amount: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
                placeholder="999999"
                className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-cyan transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-white/10">
            <button
              onClick={() => {
                setFilters({});
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl hover:border-white/20 transition-all"
            >
              {t('admin.reset')}
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-holo-purple text-white rounded-xl hover:bg-holo-purple/90 transition-all flex items-center gap-2"
            >
              <Download size={16} />
              {t('admin.export_csv')}
            </button>
          </div>
        </Card>

        {/* Liste Commandes */}
        <Card>
          <div className="overflow-x-auto">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-dark-text-tertiary mx-auto mb-4" />
                <p className="text-dark-text-secondary">{t('admin.no_orders')}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      #
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      {t('admin.client')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      {t('admin.city')}
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      {t('admin.items')}
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      {t('admin.total')}
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      {t('admin.payment')}
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      {t('admin.delivery')}
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Date
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const paymentBadge = getPaymentStatusBadge(order.payment_status);
                    const fulfillmentBadge = getFulfillmentStatusBadge(order.fulfillment_status);

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-white/5 hover:bg-dark-bg-tertiary transition-all"
                      >
                        <td className="py-3 px-4 font-mono text-sm">#{order.id}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{order.customer_name}</p>
                            <p className="text-sm text-dark-text-tertiary">
                              {order.customer_email || order.customer_phone}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="default">{order.city}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-bold">{order.items_count}</td>
                        <td className="py-3 px-4 text-right font-bold text-holo-cyan">
                          {formatCurrency(order.total_xaf)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={paymentBadge.variant}>{paymentBadge.text}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={fulfillmentBadge.variant}>
                            {fulfillmentBadge.text}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-dark-text-tertiary">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link to={`/admin/orders/${order.id}`}>
                              <button
                                className="p-2 rounded-lg glass border border-white/10 hover:border-holo-cyan transition-all"
                                title="Voir détails"
                              >
                                <Eye size={16} />
                              </button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
