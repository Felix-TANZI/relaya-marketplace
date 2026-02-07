// frontend/src/features/admin/AdminDashboardPage.tsx
// Dashboard principal de l'administration

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Store,
} from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { adminApi, type AdminDashboardStats } from "@/services/api/admin";
import { useToast } from "@/context/ToastContext";

export default function AdminDashboardPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error("Erreur chargement stats:", error);
      showToast("Erreur de chargement des statistiques", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold mb-2">
            Erreur de chargement
          </h2>
          <p className="text-dark-text-secondary mb-6">
            Impossible de charger les statistiques
          </p>
          <button
            onClick={loadStats}
            className="px-6 py-2 bg-holo-cyan text-dark-bg font-medium rounded-xl hover:bg-holo-cyan/90 transition-all"
          >
            Réessayer
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-4xl mb-2">
            <span className="text-gradient animate-gradient-bg">
              Dashboard Admin
            </span>
          </h1>
          <p className="text-dark-text-secondary">
            Vue d'ensemble de la plateforme Relaya
          </p>
        </div>

        {/* Stats Cards - Revenus */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Revenu Total */}
          <Card className="bg-gradient-to-br from-holo-cyan/10 to-holo-purple/10 border-holo-cyan/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">
                  Revenu Total
                </p>
                <p className="font-display font-bold text-2xl text-holo-cyan">
                  {formatCurrency(stats.revenue_total)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-holo-cyan/20 flex items-center justify-center">
                <DollarSign className="text-holo-cyan" size={24} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="text-green-400" size={16} />
              <span className="text-green-400">Tous les temps</span>
            </div>
          </Card>

          {/* Revenu Aujourd'hui */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">
                  Aujourd'hui
                </p>
                <p className="font-display font-bold text-2xl">
                  {formatCurrency(stats.revenue_today)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="text-green-400" size={24} />
              </div>
            </div>
          </Card>

          {/* Revenu Semaine */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">
                  Cette semaine
                </p>
                <p className="font-display font-bold text-2xl">
                  {formatCurrency(stats.revenue_week)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-holo-purple/10 flex items-center justify-center">
                <TrendingUp className="text-holo-purple" size={24} />
              </div>
            </div>
          </Card>

          {/* Revenu Mois */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">Ce mois</p>
                <p className="font-display font-bold text-2xl">
                  {formatCurrency(stats.revenue_month)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-holo-pink/10 flex items-center justify-center">
                <DollarSign className="text-holo-pink" size={24} />
              </div>
            </div>
          </Card>
        </div>

        {/* Stats Cards - Utilisateurs & Vendeurs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Utilisateurs */}
          <Link to="/admin/users">
            <Card className="hover:border-holo-cyan transition-all cursor-pointer h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-dark-text-tertiary text-sm mb-1">
                    Utilisateurs
                  </p>
                  <p className="font-display font-bold text-3xl">
                    {stats.total_users}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-holo-cyan/10 flex items-center justify-center">
                  <Users className="text-holo-cyan" size={24} />
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-text-tertiary">Aujourd'hui:</span>
                  <span className="text-green-400">
                    +{stats.new_users_today}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-text-tertiary">
                    Cette semaine:
                  </span>
                  <span>+{stats.new_users_week}</span>
                </div>
              </div>
            </Card>
          </Link>

          {/* Vendeurs */}
          <Link to="/admin/vendors">
            <Card className="hover:border-holo-purple transition-all cursor-pointer h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-dark-text-tertiary text-sm mb-1">
                    Vendeurs
                  </p>
                  <p className="font-display font-bold text-3xl">
                    {stats.total_vendors}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-holo-purple/10 flex items-center justify-center">
                  <Store className="text-holo-purple" size={24} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="warning">
                  {stats.pending_vendors} en attente
                </Badge>
                <Badge variant="success">{stats.approved_vendors} actifs</Badge>
              </div>
            </Card>
          </Link>

          {/* Produits */}
          <Link to="/admin/products">
            <Card className="hover:border-holo-pink transition-all cursor-pointer h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-dark-text-tertiary text-sm mb-1">
                    Produits
                  </p>
                  <p className="font-display font-bold text-3xl">
                    {stats.total_products}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-holo-pink/10 flex items-center justify-center">
                  <Package className="text-holo-pink" size={24} />
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-text-tertiary">Actifs:</span>
                  <span className="text-green-400">
                    {stats.active_products}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-text-tertiary">Inactifs:</span>
                  <span className="text-red-400">
                    {stats.inactive_products}
                  </span>
                </div>
              </div>
            </Card>
          </Link>

          {/* Commandes */}
          <Link to="/admin/orders">
            <Card className="hover:border-holo-cyan transition-all cursor-pointer h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-dark-text-tertiary text-sm mb-1">
                    Commandes
                  </p>
                  <p className="font-display font-bold text-3xl">
                    {stats.total_orders}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-holo-cyan/10 flex items-center justify-center">
                  <ShoppingCart className="text-holo-cyan" size={24} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="default">
                  {stats.pending_orders} en attente
                </Badge>
                <Badge variant="success">
                  {stats.delivered_orders} livrées
                </Badge>
              </div>
            </Card>
          </Link>
        </div>

        {/* Alertes & Actions Rapides */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Alertes */}
          <Card>
            <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
              <AlertCircle className="text-holo-pink" size={24} />
              Alertes
            </h3>
            <div className="space-y-3">
              {stats.pending_vendors > 0 && (
                <Link to="/admin/vendors?status=PENDING">
                  <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:border-yellow-500/40 transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="text-yellow-400" size={20} />
                        <span>
                          {stats.pending_vendors} vendeur(s) en attente
                          d'approbation
                        </span>
                      </div>
                      <Badge variant="warning">{stats.pending_vendors}</Badge>
                    </div>
                  </div>
                </Link>
              )}

              {stats.failed_payments > 0 && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <XCircle className="text-red-400" size={20} />
                      <span>{stats.failed_payments} paiement(s) échoué(s)</span>
                    </div>
                    <Badge variant="error">{stats.failed_payments}</Badge>
                  </div>
                </div>
              )}

              {stats.cancelled_orders > 0 && (
                <div className="p-3 rounded-xl bg-dark-bg-tertiary border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <XCircle className="text-dark-text-tertiary" size={20} />
                      <span>
                        {stats.cancelled_orders} commande(s) annulée(s)
                      </span>
                    </div>
                    <Badge variant="default">{stats.cancelled_orders}</Badge>
                  </div>
                </div>
              )}

              {stats.pending_vendors === 0 && stats.failed_payments === 0 && (
                <div className="p-6 text-center text-dark-text-tertiary">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                  <p>Aucune alerte pour le moment</p>
                </div>
              )}
            </div>
          </Card>

          {/* Statut Commandes */}
          <Card>
            <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
              <ShoppingCart className="text-holo-cyan" size={24} />
              État des Commandes
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-dark-bg-tertiary">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <span>En attente</span>
                </div>
                <span className="font-bold">{stats.pending_orders}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-dark-bg-tertiary">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                  <span>En préparation</span>
                </div>
                <span className="font-bold">{stats.processing_orders}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-dark-bg-tertiary">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                  <span>Expédiées</span>
                </div>
                <span className="font-bold">{stats.shipped_orders}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-dark-bg-tertiary">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span>Livrées</span>
                </div>
                <span className="font-bold">{stats.delivered_orders}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Paiements */}
        <Card>
          <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
            <DollarSign className="text-holo-purple" size={24} />
            Paiements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="text-green-400" size={20} />
                <span className="text-dark-text-tertiary text-sm">Payés</span>
              </div>
              <p className="font-display font-bold text-2xl text-green-400">
                {stats.paid_orders}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="text-yellow-400" size={20} />
                <span className="text-dark-text-tertiary text-sm">
                  En attente
                </span>
              </div>
              <p className="font-display font-bold text-2xl text-yellow-400">
                {stats.unpaid_orders}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="text-red-400" size={20} />
                <span className="text-dark-text-tertiary text-sm">Échoués</span>
              </div>
              <p className="font-display font-bold text-2xl text-red-400">
                {stats.failed_payments}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
