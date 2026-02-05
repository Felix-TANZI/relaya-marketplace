// frontend/src/features/vendors/VendorOrdersPage.tsx
// Page de gestion des commandes pour les vendeurs

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Eye, Filter, ChevronDown } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { vendorsApi, type VendorOrder } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';

const STATUS_OPTIONS = [
  { value: '', label: 'Toutes' },
  { value: 'PENDING_PAYMENT', label: 'En attente paiement' },
  { value: 'PAID', label: 'Payée' },
  { value: 'CANCELLED', label: 'Annulée' },
];

export default function VendorOrdersPage() {
  const { showToast } = useToast();
  
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await vendorsApi.getOrders(statusFilter || undefined);
      setOrders(data);
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
      showToast('Erreur de chargement des commandes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return { variant: 'warning' as const, text: 'En attente' };
      case 'PAID':
        return { variant: 'success' as const, text: 'Payée' };
      case 'CANCELLED':
        return { variant: 'error' as const, text: 'Annulée' };
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
              Gérez vos commandes et leurs statuts
            </p>
          </div>
          <Link to="/seller/dashboard">
            <Button variant="secondary">
              Retour au dashboard
            </Button>
          </Link>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <Filter className="text-dark-text-tertiary" size={20} />
            <div className="relative flex-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none glass border border-white/10 rounded-xl px-4 py-3 pr-10 text-dark-text outline-none cursor-pointer hover:border-white/20 transition-all w-full md:w-64"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-text-tertiary pointer-events-none" size={18} />
            </div>
            <p className="text-dark-text-secondary text-sm">
              {orders.length} commande{orders.length > 1 ? 's' : ''}
            </p>
          </div>
        </Card>

        {/* Liste des commandes */}
        {orders.length === 0 ? (
          <Card className="text-center py-12">
            <Package className="text-dark-text-tertiary mx-auto mb-4" size={48} />
            <p className="text-dark-text-secondary mb-2">Aucune commande pour le moment</p>
            <p className="text-dark-text-tertiary text-sm">
              Les commandes contenant vos produits apparaîtront ici
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusBadge = getStatusBadge(order.status);
              return (
                <Card key={order.id} className="hover:border-holo-cyan transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-display font-semibold text-xl text-dark-text">
                          Commande #{order.id}
                        </h3>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.text}
                        </Badge>
                      </div>

                      {/* Infos client */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-dark-text-tertiary mb-1">Client</p>
                          <p className="text-dark-text font-medium">{order.customer_name}</p>
                          <p className="text-sm text-dark-text-secondary">{order.customer_phone}</p>
                        </div>
                        <div>
                          <p className="text-sm text-dark-text-tertiary mb-1">Livraison</p>
                          <p className="text-dark-text">{order.city}</p>
                          <p className="text-sm text-dark-text-secondary">{order.address}</p>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="mb-4">
                        <p className="text-sm text-dark-text-tertiary mb-2">
                          Vos produits ({order.items.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="glass border border-white/10 rounded-lg px-3 py-2 text-sm"
                            >
                              <span className="text-dark-text">{item.product_title}</span>
                              <span className="text-dark-text-tertiary"> × {item.qty}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Total */}
                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="text-sm text-dark-text-secondary">
                          {formatDate(order.created_at)}
                        </div>
                        <div>
                          <span className="text-sm text-dark-text-tertiary mr-2">Votre total :</span>
                          <span className="font-display font-bold text-xl text-gradient animate-gradient-bg">
                            {order.vendor_total.toLocaleString()} XAF
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="ml-6">
                      <Link to={`/seller/orders/${order.id}`}>
                        <Button variant="secondary" size="sm">
                          <Eye size={18} />
                          Détails
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