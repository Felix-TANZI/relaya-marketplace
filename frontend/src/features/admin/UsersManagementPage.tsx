// frontend/src/features/admin/UsersManagementPage.tsx
// Gestion des utilisateurs par l'administration

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      showToast(t('admin.errorLoadingUsers'), 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchQuery }));
  };

  const handleBan = async (user: AdminUser) => {
    const reason = prompt(t('admin.banReason'));
    if (!reason) return;

    try {
      setActionLoading(user.id);
      await adminApi.banUser(user.id, reason);
      showToast(t('admin.userBanned'), 'success');
      loadUsers();
    } catch (error) {
      console.error('Erreur bannissement:', error);
      showToast(t('admin.errorBanning'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnban = async (user: AdminUser) => {
    const confirmed = await confirm({
      title: t('admin.unbanUserTitle'),
      message: t('admin.unbanUserMessage', { username: user.username }),
      type: 'info',
    });

    if (!confirmed) return;

    try {
      setActionLoading(user.id);
      await adminApi.unbanUser(user.id);
      showToast(t('admin.userUnbanned'), 'success');
      loadUsers();
    } catch (error) {
      console.error('Erreur débannissement:', error);
      showToast(t('admin.errorUnbanning'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    const confirmed = await confirm({
      title: t('admin.deleteUserTitle'),
      message: t('admin.deleteUserMessage', { username: user.username }),
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      setActionLoading(user.id);
      await adminApi.deleteUser(user.id);
      showToast(t('admin.userDeleted'), 'success');
      loadUsers();
    } catch (error) {
      console.error('Erreur suppression:', error);
      showToast(t('admin.errorDeletingUser'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportCSV = () => {
    const url = adminApi.exportUsersCSV(filters);
    window.open(url, '_blank');
    showToast(t('admin.exportInProgress'), 'success');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t('admin.never');
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
            <span className="text-gradient animate-gradient-bg">{t('admin.usersManagement')}</span>
          </h1>
          <p className="text-dark-text-secondary">
            {t('admin.usersManagementDescription')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">{t('admin.total')}</p>
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
                <p className="text-dark-text-tertiary text-sm mb-1">{t('admin.activeUsers')}</p>
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
                <p className="text-dark-text-tertiary text-sm mb-1">{t('admin.bannedUsers')}</p>
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
                <p className="text-dark-text-tertiary text-sm mb-1">{t('admin.vendors')}</p>
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
                <p className="text-dark-text-tertiary text-sm mb-1">{t('admin.admins')}</p>
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
            {t('admin.filters')}
          </h3>

          {/* Recherche */}
          <div className="mb-4">
            <label className="block text-sm text-dark-text-tertiary mb-2">
              {t('admin.searchUsernameEmailName')}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-tertiary"
                  size={20}
                />
                <input
                  type="text"
                  placeholder={t('admin.searchPlaceholder')}
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

          {/* Filtres rapides */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-dark-text-tertiary mb-2">{t('admin.role')}</label>
              <select
                value={filters.role || ''}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, role: e.target.value || undefined }))
                }
                className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-purple transition-all"
              >
                <option value="">{t('admin.all')}</option>
                <option value="customer">{t('admin.customers')}</option>
                <option value="vendor">{t('admin.vendors')}</option>
                <option value="admin">{t('admin.admins')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-dark-text-tertiary mb-2">{t('admin.statusLabel')}</label>
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
                <option value="">{t('admin.all')}</option>
                <option value="active">{t('admin.activeStatus')}</option>
                <option value="inactive">{t('admin.inactiveStatus')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-dark-text-tertiary mb-2">{t('admin.banned')}</label>
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
                <option value="">{t('admin.all')}</option>
                <option value="not_banned">{t('admin.notBanned')}</option>
                <option value="banned">{t('admin.bannedStatus')}</option>
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
              {t('admin.reset')}
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-holo-purple text-white rounded-xl hover:bg-holo-purple/90 transition-all flex items-center gap-2"
            >
              <Download size={16} />
              {t('admin.exportCSV')}
            </button>
          </div>
        </Card>

        {/* Liste Utilisateurs */}
        <Card>
          <div className="overflow-x-auto">
            {users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-dark-text-tertiary mx-auto mb-4" />
                <p className="text-dark-text-secondary">{t('admin.noUsersFound')}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      {t('admin.user')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      {t('admin.email')}
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      {t('admin.role')}
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      {t('admin.ordersCount')}
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      {t('admin.totalSpent')}
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      {t('admin.statusLabel')}
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      {t('admin.registration')}
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      {t('admin.actions')}
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
                          {user.is_superuser && <Badge variant="error">{t('admin.superAdmin')}</Badge>}
                          {user.is_staff && !user.is_superuser && (
                            <Badge variant="warning">{t('admin.admin')}</Badge>
                          )}
                          {user.is_vendor && <Badge variant="default">{t('admin.vendorRole')}</Badge>}
                          {!user.is_staff && !user.is_vendor && (
                            <Badge variant="default">{t('admin.customer')}</Badge>
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
                            <Badge variant="error">{t('admin.bannedStatus')}</Badge>
                          ) : user.is_active ? (
                            <Badge variant="success">{t('admin.activeStatus')}</Badge>
                          ) : (
                            <Badge variant="default">{t('admin.inactiveStatus')}</Badge>
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
                              title={t('admin.viewDetails')}
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
                              title={t('admin.unban')}
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
                              title={t('admin.ban')}
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
                            title={t('admin.delete')}
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
