// frontend/src/features/vendors/VendorOrderDetailPage.tsx
// Page de détail d'une commande pour le vendeur avec changement de statut

import { useEffect, useState, useCallback } from 'react';
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
import { useConfirm } from '@/context/ConfirmContext';

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
  const { confirm } = useConfirm();
  
  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // useCallback pour éviter le warning ESLint
  const loadOrder = useCallback(async (orderId: number) => {
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
  }, [showToast, navigate]);

  useEffect(() => {
    if (id) {
      loadOrder(parseInt(id));
    }
  }, [id, loadOrder]);

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;

    // Utiliser la modale custom au lieu du confirm natif
    const confirmed = await confirm({
      title: 'Confirmer le changement de statut',
      message: `Voulez-vous vraiment changer le statut de cette commande vers "${getStatusLabel(newStatus)}" ?`,
      type: newStatus === 'CANCELLED' ? 'danger' : 'success',
      confirmText: 'OK',
      cancelText: 'Annuler',
    });

    if (!confirmed) return;

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

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return 'En attente paiement';
      case 'PAID':
        return 'Payée';
      case 'CANCELLED':
        return 'Annulée';
      default:
        return status;
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

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} XAF`;
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
          <p className="text-dark-text-secondary mb-6">
            Cette commande n'existe pas ou ne contient pas vos produits.
          </p>
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
                <span className="text-gradient bg-gradient-holographic bg-clip-text text-transparent">
                  Commande #{order.id}
                </span>
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
                    {updating ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle size={18} />
                    )}
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
                <Package size={24} className="inline mr-2 text-holo-cyan" />
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
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-dark-bg-secondary flex items-center justify-center">
                        <Package size={24} className="text-dark-text-tertiary" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-dark-text">
                        {item.title_snapshot}
                      </h3>
                      <p className="text-sm text-dark-text-secondary">
                        {formatPrice(item.price_xaf_snapshot)} × {item.qty}
                      </p>
                    </div>

                    {/* Total */}
                    <div className="text-right">
                      <p className="font-bold text-dark-text">
                        {formatPrice(item.line_total_xaf)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total vendeur */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-dark-text-secondary">Votre total :</span>
                  <span className="font-bold text-2xl text-holo-cyan">
                    {formatPrice(order.vendor_total)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Colonne latérale */}
          <div className="space-y-6">
            {/* Infos client */}
            <Card>
              <h3 className="font-display font-bold text-lg text-dark-text mb-4">
                <User size={20} className="inline mr-2 text-holo-purple" />
                Client
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-dark-text-tertiary mb-1">Nom</p>
                  <p className="text-dark-text font-medium">{order.customer_name}</p>
                </div>
                <div>
                  <p className="text-dark-text-tertiary mb-1">
                    <Phone size={14} className="inline mr-1" />
                    Téléphone
                  </p>
                  <p className="text-dark-text font-medium">{order.customer_phone}</p>
                </div>
                {order.customer_email && (
                  <div>
                    <p className="text-dark-text-tertiary mb-1">
                      <Mail size={14} className="inline mr-1" />
                      Email
                    </p>
                    <p className="text-dark-text font-medium break-all">
                      {order.customer_email}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Livraison */}
            <Card>
              <h3 className="font-display font-bold text-lg text-dark-text mb-4">
                <MapPin size={20} className="inline mr-2 text-holo-pink" />
                Livraison
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-dark-text-tertiary mb-1">Ville</p>
                  <p className="text-dark-text font-medium">{order.city}</p>
                </div>
                <div>
                  <p className="text-dark-text-tertiary mb-1">Adresse</p>
                  <p className="text-dark-text font-medium">{order.address}</p>
                </div>
                {order.note && (
                  <div>
                    <p className="text-dark-text-tertiary mb-1">Note</p>
                    <p className="text-dark-text italic">{order.note}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Total commande */}
            <Card>
              <h3 className="font-display font-bold text-lg text-dark-text mb-4">
                <DollarSign size={20} className="inline mr-2 text-green-400" />
                Total commande
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-text-secondary">Sous-total</span>
                  <span className="text-dark-text">{formatPrice(order.subtotal_xaf)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-text-secondary">Frais de livraison</span>
                  <span className="text-dark-text">{formatPrice(order.delivery_fee_xaf)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="font-bold text-dark-text">Total</span>
                  <span className="font-bold text-dark-text">{formatPrice(order.total_xaf)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}