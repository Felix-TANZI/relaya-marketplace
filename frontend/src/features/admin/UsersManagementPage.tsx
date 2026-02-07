// frontend/src/features/admin/UsersManagementPage.tsx
// Gestion des utilisateurs par l'administration

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Eye,
  Shield,
  ShieldOff,
  Trash2,
  Download,
  UserCheck,
  UserX,
  Store,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { adminApi, type AdminUser, type UserFilters } from '@/services/api/admin';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

export default function UsersManagementPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<UserFilters>({});
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.listUsers(filters);
      setUsers(data);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      showToast('Erreur de chargement des utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchQuery }));
  };

  const handleBan = async (user: AdminUser) => {
    const reason = prompt('Raison du bannissement :');
    if (!reason) return;

    try {
      setActionLoading(user.id);
      await adminApi.banUser(user.id, reason);
      showToast('Utilisateur banni avec succès', 'success');
      loadUsers();
    } catch (error) {
      console.error('Erreur bannissement:', error);
      showToast('Erreur lors du bannissement', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnban = async (user: AdminUser) => {
    const confirmed = await confirm({
      title: 'Débannir cet utilisateur ?',
      message: `Voulez-vous vraiment débannir ${user.username} ?`,
      type: 'info',
    });

    if (!confirmed) return;

    try {
      setActionLoading(user.id);
      await adminApi.unbanUser(user.id);
      showToast('Utilisateur débanni avec succès', 'success');
      loadUsers();
    } catch (error) {
      console.error('Erreur débannissement:', error);
      showToast('Erreur lors du débannissement', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    const confirmed = await confirm({
      title: 'Supprimer cet utilisateur ?',
      message: `Voulez-vous vraiment supprimer définitivement ${user.username} ? Cette action est irréversible.`,
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      setActionLoading(user.id);
      await adminApi.deleteUser(user.id);
      showToast('Utilisateur supprimé avec succès', 'success');
      loadUsers();
    } catch (error) {
      console.error('Erreur suppression:', error);
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportCSV = () => {
    const url = adminApi.exportUsersCSV(filters);
    window.open(url, '_blank');
    showToast('Export CSV en cours...', 'success');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Jamais';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Stats calculées
  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    banned: users.filter((u) => u.is_banned).length,
    vendors: users.filter((u) => u.is_vendor).length,
    admins: users.filter((u) => u.is_staff).length,
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
            <span className="text-gradient animate-gradient-bg">Gestion Utilisateurs</span>
          </h1>
          <p className="text-dark-text-secondary">
            Administration complète de tous les comptes utilisateurs
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">Total</p>
                <p className="font-display font-bold text-3xl">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-holo-cyan/10 flex items-center justify-center">
                <Users className="text-holo-cyan" size={24} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">Actifs</p>
                <p className="font-display font-bold text-3xl text-green-400">{stats.active}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <UserCheck className="text-green-400" size={24} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">Bannis</p>
                <p className="font-display font-bold text-3xl text-red-400">{stats.banned}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <UserX className="text-red-400" size={24} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">Vendeurs</p>
                <p className="font-display font-bold text-3xl text-holo-purple">
                  {stats.vendors}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-holo-purple/10 flex items-center justify-center">
                <Store className="text-holo-purple" size={24} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">Admins</p>
                <p className="font-display font-bold text-3xl text-holo-pink">{stats.admins}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-holo-pink/10 flex items-center justify-center">
                <Shield className="text-holo-pink" size={24} />
              </div>
            </div>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Filter className="text-holo-purple" size={20} />
            Filtres
          </h3>

          {/* Recherche */}
          <div className="mb-4">
            <label className="block text-sm text-dark-text-tertiary mb-2">
              Recherche (Username, Email, Nom)
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-dark-text-tertiary mb-2">Rôle</label>
              <select
                value={filters.role || ''}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, role: e.target.value || undefined }))
                }
                className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-purple transition-all"
              >
                <option value="">Tous</option>
                <option value="customer">Clients</option>
                <option value="vendor">Vendeurs</option>
                <option value="admin">Admins</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-dark-text-tertiary mb-2">Statut</label>
              <select
                value={
                  filters.is_active === undefined
                    ? ''
                    : filters.is_active
                    ? 'active'
                    : 'inactive'
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters((prev) => ({
                    ...prev,
                    is_active:
                      value === '' ? undefined : value === 'active' ? true : false,
                  }));
                }}
                className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-purple transition-all"
              >
                <option value="">Tous</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-dark-text-tertiary mb-2">Banni</label>
              <select
                value={
                  filters.is_banned === undefined
                    ? ''
                    : filters.is_banned
                    ? 'banned'
                    : 'not_banned'
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters((prev) => ({
                    ...prev,
                    is_banned:
                      value === '' ? undefined : value === 'banned' ? true : false,
                  }));
                }}
                className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-purple transition-all"
              >
                <option value="">Tous</option>
                <option value="not_banned">Non bannis</option>
                <option value="banned">Bannis</option>
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
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-holo-purple text-white rounded-xl hover:bg-holo-purple/90 transition-all flex items-center gap-2"
            >
              <Download size={16} />
              Exporter CSV
            </button>
          </div>
        </Card>

        {/* Liste Utilisateurs */}
        <Card>
          <div className="overflow-x-auto">
            {users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-dark-text-tertiary mx-auto mb-4" />
                <p className="text-dark-text-secondary">Aucun utilisateur trouvé</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Utilisateur
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Email
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Rôle
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Commandes
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Total dépensé
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Statut
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Inscription
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-white/5 hover:bg-dark-bg-tertiary transition-all"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{user.username}</p>
                          {(user.first_name || user.last_name) && (
                            <p className="text-sm text-dark-text-tertiary">
                              {user.first_name} {user.last_name}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{user.email}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex gap-1 justify-center">
                          {user.is_superuser && <Badge variant="error">Super Admin</Badge>}
                          {user.is_staff && !user.is_superuser && (
                            <Badge variant="warning">Admin</Badge>
                          )}
                          {user.is_vendor && <Badge variant="default">Vendeur</Badge>}
                          {!user.is_staff && !user.is_vendor && (
                            <Badge variant="default">Client</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        {user.total_orders}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-holo-cyan">
                        {formatCurrency(user.total_spent)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex gap-1 justify-center flex-wrap">
                          {user.is_banned ? (
                            <Badge variant="error">Banni</Badge>
                          ) : user.is_active ? (
                            <Badge variant="success">Actif</Badge>
                          ) : (
                            <Badge variant="default">Inactif</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-dark-text-tertiary">
                        {formatDate(user.date_joined)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Voir */}
                          <Link to={`/admin/users/${user.id}`}>
                            <button
                              className="p-2 rounded-lg glass border border-white/10 hover:border-holo-cyan transition-all"
                              title="Voir détails"
                            >
                              <Eye size={16} />
                            </button>
                          </Link>

                          {/* Bannir/Débannir */}
                          {user.is_banned ? (
                            <button
                              onClick={() => handleUnban(user)}
                              disabled={actionLoading === user.id}
                              className="p-2 rounded-lg glass border border-white/10 hover:border-green-500 hover:text-green-400 transition-all"
                              title="Débannir"
                            >
                              {actionLoading === user.id ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <ShieldOff size={16} />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBan(user)}
                              disabled={actionLoading === user.id}
                              className="p-2 rounded-lg glass border border-white/10 hover:border-yellow-500 hover:text-yellow-400 transition-all"
                              title="Bannir"
                            >
                              {actionLoading === user.id ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Shield size={16} />
                              )}
                            </button>
                          )}

                          {/* Supprimer */}
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={actionLoading === user.id}
                            className="p-2 rounded-lg glass border border-white/10 hover:border-red-500 hover:text-red-400 transition-all"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}