// frontend/src/features/vendors/VendorOrderDetailPage.tsx
// Page de détail d'une commande pour le vendeur avec changement de statut

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  User, 
  MapPin, 
  Phone, 
  Mail,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { vendorsApi, type VendorOrder } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';

const STATUS_TRANSITIONS = {
  'PENDING_PAYMENT': [
    { value: 'PAID', label: 'Marquer comme payée', color: 'success' },
    { value: 'CANCELLED', label: 'Annuler', color: 'error' },
  ],
  'PAID': [
    { value: 'CANCELLED', label: 'Annuler', color: 'error' },
  ],
  'CANCELLED': [],
};

export default function VendorOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrder(parseInt(id));
    }
  }, [id]);

  const loadOrder = async (orderId: number) => {
    try {
      setLoading(true);
      const data = await vendorsApi.getOrderDetail(orderId);
      setOrder(data);
    } catch (error) {
      console.error('Erreur chargement commande:', error);
      showToast('Erreur de chargement de la commande', 'error');
      navigate('/seller/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!order || !confirm(`Confirmer le changement de statut vers "${newStatus}" ?`)) return;

    try {
      setUpdating(true);
      const updatedOrder = await vendorsApi.updateOrderStatus(order.id, newStatus);
      setOrder(updatedOrder);
      showToast('Statut mis à jour avec succès', 'success');
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return { variant: 'warning' as const, text: 'En attente paiement' };
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
      month: 'long',
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
          <p className="text-dark-text-secondary">Chargement de la commande...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <Card className="max-w-md text-center">
          <AlertCircle className="text-red-400 mx-auto mb-4" size={48} />
          <h2 className="font-bold text-xl text-dark-text mb-2">Commande introuvable</h2>
          <p className="text-dark-text-secondary mb-6">Cette commande n'existe pas ou ne contient pas vos produits.</p>
          <Link to="/seller/orders">
            <Button variant="gradient">
              Retour aux commandes
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const statusBadge = getStatusBadge(order.status);
  const availableActions = STATUS_TRANSITIONS[order.status as keyof typeof STATUS_TRANSITIONS] || [];

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/seller/orders"
            className="inline-flex items-center gap-2 text-dark-text-secondary hover:text-holo-cyan transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            Retour aux commandes
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display font-bold text-4xl mb-2">
                <span className="text-gradient animate-gradient-bg">Commande #{order.id}</span>
              </h1>
              <div className="flex items-center gap-3">
                <Badge variant={statusBadge.variant} className="text-sm">
                  {statusBadge.text}
                </Badge>
                <span className="text-dark-text-tertiary text-sm">
                  <Calendar size={14} className="inline mr-1" />
                  {formatDate(order.created_at)}
                </span>
              </div>
            </div>

            {/* Actions statut */}
            {availableActions.length > 0 && (
              <div className="flex gap-2">
                {availableActions.map((action) => (
                  <Button
                    key={action.value}
                    variant={action.color === 'success' ? 'gradient' : 'secondary'}
                    onClick={() => handleStatusChange(action.value)}
                    disabled={updating}
                    size="sm"
                  >
                    <CheckCircle size={18} />
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Produits */}
            <Card>
              <h2 className="font-display font-bold text-2xl text-dark-text mb-6">
                Vos produits
              </h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 glass rounded-xl border border-white/10"
                  >
                    {/* Image */}
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_title}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-dark-bg-secondary flex items-center justify-center">
                        <Package className="text-dark-text-tertiary" size={24} />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-dark-text mb-1">
                        {item.product_title}
                      </h3>
                      <p className="text-sm text-dark-text-secondary">
                        {item.price_xaf_snapshot.toLocaleString()} XAF × {item.qty}
                      </p>
                    </div>

                    {/* Total */}
                    <div className="text-right">
                      <p className="font-display font-bold text-lg text-dark-text">
                        {item.line_total_xaf.toLocaleString()} XAF
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total vendeur */}
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                <span className="font-semibold text-dark-text">Votre total :</span>
                <span className="font-display font-bold text-3xl text-gradient animate-gradient-bg">
                  {order.vendor_total.toLocaleString()} XAF
                </span>
              </div>
            </Card>

            {/* Note client */}
            {order.note && (
              <Card>
                <h3 className="font-semibold text-dark-text mb-3">Note du client</h3>
                <p className="text-dark-text-secondary">{order.note}</p>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Infos client */}
            <Card>
              <h3 className="font-semibold text-dark-text mb-4 flex items-center gap-2">
                <User size={20} className="text-holo-cyan" />
                Client
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-dark-text-tertiary mb-1">Nom</p>
                  <p className="text-dark-text font-medium">{order.customer_name}</p>
                </div>
                {order.customer_email && (
                  <div>
                    <p className="text-sm text-dark-text-tertiary mb-1 flex items-center gap-1">
                      <Mail size={14} />
                      Email
                    </p>
                    <p className="text-dark-text text-sm">{order.customer_email}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-dark-text-tertiary mb-1 flex items-center gap-1">
                    <Phone size={14} />
                    Téléphone
                  </p>
                  <p className="text-dark-text">{order.customer_phone}</p>
                </div>
              </div>
            </Card>

            {/* Adresse livraison */}
            <Card>
              <h3 className="font-semibold text-dark-text mb-4 flex items-center gap-2">
                <MapPin size={20} className="text-holo-purple" />
                Livraison
              </h3>
              <div className="space-y-2">
                <p className="text-dark-text font-medium">{order.city}</p>
                <p className="text-dark-text-secondary text-sm">{order.address}</p>
              </div>
            </Card>

            {/* Total commande */}
            <Card>
              <h3 className="font-semibold text-dark-text mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-holo-pink" />
                Total commande
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-text-secondary">Sous-total</span>
                  <span className="text-dark-text">{order.subtotal_xaf.toLocaleString()} XAF</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-text-secondary">Livraison</span>
                  <span className="text-dark-text">{order.delivery_fee_xaf.toLocaleString()} XAF</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="font-semibold text-dark-text">Total</span>
                  <span className="font-display font-bold text-xl text-dark-text">
                    {order.total_xaf.toLocaleString()} XAF
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}