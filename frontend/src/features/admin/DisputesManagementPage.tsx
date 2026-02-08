// frontend/src/features/admin/DisputesManagementPage.tsx
// Gestion des litiges par l'administration

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Search,
  Filter,
  Eye,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { adminApi, type AdminDispute, type DisputeFilters, type DisputeStats } from '@/services/api/admin';
import { useToast } from '@/context/ToastContext';

export default function DisputesManagementPage() {
  const { showToast } = useToast();

  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<DisputeFilters>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [disputesData, statsData] = await Promise.all([
        adminApi.listDisputes(filters),
        adminApi.getDisputeStats(),
      ]);
      setDisputes(disputesData);
      setStats(statsData);
    } catch (error) {
      console.error('Erreur chargement litiges:', error);
      showToast('Erreur de chargement des litiges', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchQuery }));
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

  const getStatusBadge = (status: string) => {
    const variants = {
      OPEN: { variant: 'warning' as const, text: 'Ouvert', icon: AlertCircle },
      IN_PROGRESS: { variant: 'default' as const, text: 'En cours', icon: Clock },
      RESOLVED: { variant: 'success' as const, text: 'Résolu', icon: CheckCircle },
      CLOSED: { variant: 'default' as const, text: 'Fermé', icon: XCircle },
    };
    return variants[status as keyof typeof variants] || variants.OPEN;
  };

  const getReasonLabel = (reason: string) => {
    const labels = {
      NOT_RECEIVED: 'Non reçu',
      DAMAGED: 'Endommagé',
      WRONG_ITEM: 'Mauvais article',
      NOT_AS_DESCRIBED: 'Non conforme',
      REFUND_REQUEST: 'Remboursement',
      OTHER: 'Autre',
    };
    return labels[reason as keyof typeof labels] || reason;
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
            <span className="text-gradient animate-gradient-bg">Gestion Litiges</span>
          </h1>
          <p className="text-dark-text-secondary">
            Arbitrage et résolution des litiges clients-vendeurs
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-text-tertiary text-sm mb-1">Total Litiges</p>
                  <p className="font-display font-bold text-3xl">{stats.total_disputes}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-holo-cyan/10 flex items-center justify-center">
                  <AlertCircle className="text-holo-cyan" size={24} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-text-tertiary text-sm mb-1">Ouverts</p>
                  <p className="font-display font-bold text-3xl text-yellow-400">
                    {stats.open_disputes}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <AlertCircle className="text-yellow-400" size={24} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-text-tertiary text-sm mb-1">En cours</p>
                  <p className="font-display font-bold text-3xl text-holo-purple">
                    {stats.in_progress_disputes}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-holo-purple/10 flex items-center justify-center">
                  <Clock className="text-holo-purple" size={24} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-text-tertiary text-sm mb-1">Résolus</p>
                  <p className="font-display font-bold text-3xl text-green-400">
                    {stats.resolved_disputes}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="text-green-400" size={24} />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filtres */}
        <Card className="mb-6">
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Filter className="text-holo-purple" size={20} />
            Filtres
          </h3>

          {/* Recherche */}
          <div className="mb-4">
            <label className="block text-sm text-dark-text-tertiary mb-2">
              Recherche (ID Litige, ID Commande, Email)
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-tertiary"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Rechercher..."
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
                Rechercher
              </button>
            </div>
          </div>

          {/* Filtres rapides */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-dark-text-tertiary mb-2">Statut</label>
              <select
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value || undefined }))
                }
                className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-purple transition-all"
              >
                <option value="">Tous</option>
                <option value="OPEN">Ouverts</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="RESOLVED">Résolus</option>
                <option value="CLOSED">Fermés</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-dark-text-tertiary mb-2">Motif</label>
              <select
                value={filters.reason || ''}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, reason: e.target.value || undefined }))
                }
                className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-purple transition-all"
              >
                <option value="">Tous</option>
                <option value="NOT_RECEIVED">Non reçu</option>
                <option value="DAMAGED">Endommagé</option>
                <option value="WRONG_ITEM">Mauvais article</option>
                <option value="NOT_AS_DESCRIBED">Non conforme</option>
                <option value="REFUND_REQUEST">Remboursement</option>
                <option value="OTHER">Autre</option>
              </select>
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
              Réinitialiser
            </button>
          </div>
        </Card>

        {/* Liste Litiges */}
        <Card>
          <div className="overflow-x-auto">
            {disputes.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-dark-text-tertiary mx-auto mb-4" />
                <p className="text-dark-text-secondary">Aucun litige trouvé</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      #
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Commande
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Client
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Ouvert par
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Motif
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Messages
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Statut
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
                  {disputes.map((dispute) => {
                    const statusBadge = getStatusBadge(dispute.status);

                    return (
                      <tr
                        key={dispute.id}
                        className="border-b border-white/5 hover:bg-dark-bg-tertiary transition-all"
                      >
                        <td className="py-3 px-4 font-mono text-sm">#{dispute.id}</td>
                        <td className="py-3 px-4">
                          <Link
                            to={`/admin/orders/${dispute.order_id}`}
                            className="text-holo-cyan hover:underline"
                          >
                            #{dispute.order_id}
                          </Link>
                        </td>
                        <td className="py-3 px-4">{dispute.customer_name}</td>
                        <td className="py-3 px-4 text-sm">{dispute.opened_by_name}</td>
                        <td className="py-3 px-4">
                          <Badge variant="default">{getReasonLabel(dispute.reason)}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <MessageSquare size={16} className="text-dark-text-tertiary" />
                            <span className="font-bold">{dispute.messages_count}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={statusBadge.variant}>{statusBadge.text}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-dark-text-tertiary">
                          {formatDate(dispute.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link to={`/admin/disputes/${dispute.id}`}>
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