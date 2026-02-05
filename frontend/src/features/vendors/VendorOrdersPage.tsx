// frontend/src/features/vendors/VendorOrdersPage.tsx
// Page de gestion des commandes pour les vendeurs avec filtres de statuts

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Eye, Filter, CreditCard, Truck } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { vendorsApi, type VendorOrder, type VendorOrderFilters } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import type { PaymentStatus, FulfillmentStatus } from '@/types/order';

export default function VendorOrdersPage() {
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
      showToast('Erreur de chargement des commandes', 'error');
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
        return { variant: 'warning' as const, text: 'En attente' };
      case 'PAID':
        return { variant: 'success' as const, text: 'Payé' };
      case 'FAILED':
        return { variant: 'error' as const, text: 'Échec' };
      case 'REFUNDED':
        return { variant: 'default' as const, text: 'Remboursé' };
      default:
        return { variant: 'default' as const, text: status };
    }
  };

  const getFulfillmentStatusBadge = (status: FulfillmentStatus) => {
    switch (status) {
      case 'PENDING':
        return { variant: 'warning' as const, text: 'En attente' };
      case 'PROCESSING':
        return { variant: 'default' as const, text: 'En préparation' };
      case 'SHIPPED':
        return { variant: 'success' as const, text: 'Expédié' };
      case 'DELIVERED':
        return { variant: 'success' as const, text: 'Livré' };
      case 'CANCELLED':
        return { variant: 'error' as const, text: 'Annulé' };
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
          <p className="text-dark-text-secondary">Chargement des commandes...</p>
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
              <span className="text-gradient animate-gradient-bg">Mes Commandes</span>
            </h1>
            <p className="text-dark-text-secondary">
              Gérez vos commandes et leur statut de livraison
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter size={20} className="mr-2" />
            Filtres
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
                  Statut de paiement
                </label>
                <select
                  value={filters.payment_status || ''}
                  onChange={(e) => handlePaymentFilterChange(e.target.value as PaymentStatus | '')}
                  className="w-full px-4 py-2 rounded-lg bg-dark-accent text-dark-text border border-dark-accent focus:border-holo-cyan focus:outline-none"
                >
                  <option value="">Tous</option>
                  <option value="PENDING">En attente</option>
                  <option value="PAID">Payé</option>
                  <option value="FAILED">Échec</option>
                  <option value="REFUNDED">Remboursé</option>
                </select>
              </div>

              {/* Filtre statut de livraison */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Truck size={16} className="text-holo-cyan" />
                  Statut de livraison
                </label>
                <select
                  value={filters.fulfillment_status || ''}
                  onChange={(e) => handleFulfillmentFilterChange(e.target.value as FulfillmentStatus | '')}
                  className="w-full px-4 py-2 rounded-lg bg-dark-accent text-dark-text border border-dark-accent focus:border-holo-cyan focus:outline-none"
                >
                  <option value="">Tous</option>
                  <option value="PENDING">En attente</option>
                  <option value="PROCESSING">En préparation</option>
                  <option value="SHIPPED">Expédié</option>
                  <option value="DELIVERED">Livré</option>
                  <option value="CANCELLED">Annulé</option>
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
                  Réinitialiser les filtres
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
              Aucune commande
            </h2>
            <p className="text-dark-text-secondary">
              {activeFilterCount > 0
                ? 'Aucune commande ne correspond aux filtres sélectionnés'
                : 'Vous n\'avez pas encore reçu de commandes'}
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
                          Commande <span className="text-holo-cyan">#{order.id}</span>
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
                        <span>{order.items.length} article(s)</span>
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
                          Voir détails
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