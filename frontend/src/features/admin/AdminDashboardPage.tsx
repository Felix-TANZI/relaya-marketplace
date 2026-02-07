// frontend/src/features/admin/AdminDashboardPage.tsx
// Dashboard admin avec graphiques interactifs

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Store,
  Activity,
  Award,
  Percent,
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, Badge } from '@/components/ui';
import {
  adminApi,
  type AdminDashboardStats,
  type AdminAnalytics,
} from '@/services/api/admin';
import { useToast } from '@/context/ToastContext';

export default function AdminDashboardPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, analyticsData] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getAnalytics(),
      ]);
      setStats(statsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      showToast('Erreur de chargement du dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Couleurs pour les graphiques
  const COLORS = {
    cyan: '#00D9FF',
    purple: '#A855F7',
    pink: '#FF006E',
    green: '#10B981',
    yellow: '#FBBF24',
    red: '#EF4444',
    blue: '#3B82F6',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats || !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold mb-2">Erreur de chargement</h2>
          <p className="text-dark-text-secondary mb-6">
            Impossible de charger les statistiques
          </p>
          <button
            onClick={loadData}
            className="px-6 py-2 bg-holo-cyan text-dark-bg font-medium rounded-xl hover:bg-holo-cyan/90 transition-all"
          >
            Réessayer
          </button>
        </Card>
      </div>
    );
  }

  // Données pour graphique circulaire statuts commandes
  const orderStatusData = [
    { name: 'En attente', value: stats.pending_orders, color: COLORS.yellow },
    { name: 'En préparation', value: stats.processing_orders, color: COLORS.blue },
    { name: 'Expédiées', value: stats.shipped_orders, color: COLORS.purple },
    { name: 'Livrées', value: stats.delivered_orders, color: COLORS.green },
  ];

  // Données pour graphique circulaire paiements
  const paymentStatusData = [
    { name: 'Payés', value: stats.paid_orders, color: COLORS.green },
    { name: 'En attente', value: stats.unpaid_orders, color: COLORS.yellow },
    { name: 'Échoués', value: stats.failed_payments, color: COLORS.red },
  ];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-4xl mb-2">
            <span className="text-gradient animate-gradient-bg">Dashboard Admin</span>
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
                <p className="text-dark-text-tertiary text-sm mb-1">Revenu Total</p>
                <p className="font-display font-bold text-2xl text-holo-cyan">
                  {formatCurrency(stats.revenue_total)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-holo-cyan/20 flex items-center justify-center">
                <DollarSign className="text-holo-cyan" size={24} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {analytics.total_revenue_growth >= 0 ? (
                <TrendingUp className="text-green-400" size={16} />
              ) : (
                <TrendingDown className="text-red-400" size={16} />
              )}
              <span
                className={
                  analytics.total_revenue_growth >= 0 ? 'text-green-400' : 'text-red-400'
                }
              >
                {analytics.total_revenue_growth > 0 ? '+' : ''}
                {analytics.total_revenue_growth}% vs mois dernier
              </span>
            </div>
          </Card>

          {/* Revenu Aujourd'hui */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">Aujourd'hui</p>
                <p className="font-display font-bold text-2xl">
                  {formatCurrency(stats.revenue_today)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="text-green-400" size={24} />
              </div>
            </div>
          </Card>

          {/* Panier Moyen */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">Panier Moyen</p>
                <p className="font-display font-bold text-2xl">
                  {formatCurrency(analytics.average_order_value)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-holo-purple/10 flex items-center justify-center">
                <ShoppingCart className="text-holo-purple" size={24} />
              </div>
            </div>
          </Card>

          {/* Taux de Conversion */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">Taux Conversion</p>
                <p className="font-display font-bold text-2xl">
                  {analytics.conversion_rate}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-holo-pink/10 flex items-center justify-center">
                <Percent className="text-holo-pink" size={24} />
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
                  <p className="text-dark-text-tertiary text-sm mb-1">Utilisateurs</p>
                  <p className="font-display font-bold text-3xl">{stats.total_users}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-holo-cyan/10 flex items-center justify-center">
                  <Users className="text-holo-cyan" size={24} />
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-text-tertiary">Aujourd'hui:</span>
                  <span className="text-green-400">+{stats.new_users_today}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-text-tertiary">Cette semaine:</span>
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
                  <p className="text-dark-text-tertiary text-sm mb-1">Vendeurs</p>
                  <p className="font-display font-bold text-3xl">{stats.total_vendors}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-holo-purple/10 flex items-center justify-center">
                  <Store className="text-holo-purple" size={24} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="warning">{stats.pending_vendors} en attente</Badge>
                <Badge variant="success">{stats.approved_vendors} actifs</Badge>
              </div>
            </Card>
          </Link>

          {/* Produits */}
          <Link to="/admin/products">
            <Card className="hover:border-holo-pink transition-all cursor-pointer h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-dark-text-tertiary text-sm mb-1">Produits</p>
                  <p className="font-display font-bold text-3xl">{stats.total_products}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-holo-pink/10 flex items-center justify-center">
                  <Package className="text-holo-pink" size={24} />
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-text-tertiary">Actifs:</span>
                  <span className="text-green-400">{stats.active_products}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-text-tertiary">Inactifs:</span>
                  <span className="text-red-400">{stats.inactive_products}</span>
                </div>
              </div>
            </Card>
          </Link>

          {/* Commandes */}
          <Link to="/admin/orders">
            <Card className="hover:border-holo-cyan transition-all cursor-pointer h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-dark-text-tertiary text-sm mb-1">Commandes</p>
                  <p className="font-display font-bold text-3xl">{stats.total_orders}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-holo-cyan/10 flex items-center justify-center">
                  <ShoppingCart className="text-holo-cyan" size={24} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="default">{stats.pending_orders} en attente</Badge>
                <Badge variant="success">{stats.delivered_orders} livrées</Badge>
              </div>
            </Card>
          </Link>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Graphique Revenus */}
          <Card>
            <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
              <TrendingUp className="text-holo-cyan" size={24} />
              Revenus - 30 derniers jours
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.revenue_chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#888"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  stroke="#888"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(label) => formatDate(String(label))}
                  formatter={(value) => [formatCurrency(Number(value)), 'Revenu']}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={COLORS.cyan}
                  strokeWidth={3}
                  dot={{ fill: COLORS.cyan, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Graphiques Circulaires */}
          <div className="grid grid-cols-1 gap-6">
            {/* Statuts Commandes */}
            <Card>
              <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                <ShoppingCart className="text-holo-purple" size={24} />
                Statuts Commandes
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                    }
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Statuts Paiements */}
            <Card>
              <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                <DollarSign className="text-holo-pink" size={24} />
                Statuts Paiements
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                    }
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>

        {/* Top Produits & Top Vendeurs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top 5 Produits */}
          <Card>
            <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
              <Award className="text-holo-cyan" size={24} />
              Top 5 Produits
            </h3>
            <div className="space-y-3">
              {analytics.top_products.map((product, index) => (
                <div
                  key={product.product_id}
                  className="flex items-center justify-between p-3 rounded-xl bg-dark-bg-tertiary hover:bg-dark-bg-secondary transition-all"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-holo-cyan/10 text-holo-cyan font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium truncate">{product.product_title}</p>
                      <p className="text-sm text-dark-text-tertiary">
                        {product.total_quantity} vendus
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-holo-cyan">
                      {formatCurrency(product.total_revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top 5 Vendeurs */}
          <Card>
            <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
              <Store className="text-holo-purple" size={24} />
              Top 5 Vendeurs
            </h3>
            <div className="space-y-3">
              {analytics.top_vendors.map((vendor, index) => (
                <div
                  key={vendor.vendor_id}
                  className="flex items-center justify-between p-3 rounded-xl bg-dark-bg-tertiary hover:bg-dark-bg-secondary transition-all"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-holo-purple/10 text-holo-purple font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium truncate">{vendor.business_name}</p>
                      <p className="text-sm text-dark-text-tertiary">
                        {vendor.total_orders} commandes
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-holo-purple">
                      {formatCurrency(vendor.total_revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Alertes & Activité Récente */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <span>{stats.pending_vendors} vendeur(s) en attente</span>
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
                      <span>{stats.cancelled_orders} commande(s) annulée(s)</span>
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

          {/* Activité Récente */}
          <Card>
            <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
              <Activity className="text-holo-cyan" size={24} />
              Activité Récente
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {analytics.recent_activity.map((activity, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl bg-dark-bg-tertiary hover:bg-dark-bg-secondary transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.type === 'order'
                          ? 'bg-holo-cyan/10'
                          : activity.type === 'vendor'
                          ? 'bg-holo-purple/10'
                          : 'bg-holo-pink/10'
                      }`}
                    >
                      {activity.type === 'order' ? (
                        <ShoppingCart
                          className={
                            activity.type === 'order' ? 'text-holo-cyan' : ''
                          }
                          size={16}
                        />
                      ) : activity.type === 'vendor' ? (
                        <Store className="text-holo-purple" size={16} />
                      ) : (
                        <Package className="text-holo-pink" size={16} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-dark-text-tertiary">
                        {activity.user && <span>{activity.user}</span>}
                        <span>•</span>
                        <span>{formatDateTime(activity.timestamp)}</span>
                      </div>
                      {activity.amount && (
                        <p className="text-sm font-bold text-holo-cyan mt-1">
                          {formatCurrency(activity.amount)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}