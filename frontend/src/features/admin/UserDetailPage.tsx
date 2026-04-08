// frontend/src/features/admin/UserDetailPage.tsx
// Détail complet d'un utilisateur - Vue Admin Enterprise

import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  ShieldOff,
  Edit2,
  Trash2,
  Activity,
  ShoppingCart,
  DollarSign,
  Package,
  Store,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { adminApi, type AdminUserDetail } from '@/services/api/admin';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

export default function UserDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    is_staff: false,
    is_active: false,
    is_superuser: false,
    first_name: '',
    last_name: '',
    email: '',
  });

  const loadUser = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await adminApi.getUserDetail(parseInt(id));
      setUser(data);
      setEditData({
        is_staff: data.is_staff,
        is_active: data.is_active,
        is_superuser: data.is_superuser,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
      });
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
      showToast(t('admin.user_load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast, t]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleSaveChanges = async () => {
    if (!user) return;

    try {
      await adminApi.updateUser(user.id, editData);
      showToast('Utilisateur mis à jour avec succès', 'success');
      setEditMode(false);
      loadUser();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleBan = async () => {
    if (!user) return;

    const reason = prompt('Raison du bannissement :');
    if (!reason) return;

    try {
      await adminApi.banUser(user.id, reason);
      showToast('Utilisateur banni avec succès', 'success');
      loadUser();
    } catch (error) {
      console.error('Erreur bannissement:', error);
      showToast('Erreur lors du bannissement', 'error');
    }
  };

  const handleUnban = async () => {
    if (!user) return;

    const confirmed = await confirm({
      title: 'Débannir cet utilisateur ?',
      message: `Voulez-vous vraiment débannir ${user.username} ?`,
      type: 'info',
    });

    if (!confirmed) return;

    try {
      await adminApi.unbanUser(user.id);
      showToast('Utilisateur débanni avec succès', 'success');
      loadUser();
    } catch (error) {
      console.error('Erreur débannissement:', error);
      showToast('Erreur lors du débannissement', 'error');
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    const confirmed = await confirm({
      title: 'Supprimer cet utilisateur ?',
      message: `Voulez-vous vraiment supprimer définitivement ${user.username} ? Cette action est irréversible.`,
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await adminApi.deleteUser(user.id);
      showToast('Utilisateur supprimé avec succès', 'success');
      navigate('/admin/users');
    } catch (error) {
      console.error('Erreur suppression:', error);
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return t('admin.never');
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold mb-2">{t('admin.user_not_found')}</h2>
          <p className="text-dark-text-secondary mb-6">{t('admin.user_not_exist')}</p>
          <button
            onClick={() => navigate('/admin/users')}
            className="px-6 py-2 bg-holo-cyan text-dark-bg font-medium rounded-xl hover:bg-holo-cyan/90 transition-all"
          >
            {t('admin.back_to_users')}
          </button>
        </Card>
      </div>
    );
  }

  const isBanned = user.profile?.is_banned || false;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 text-dark-text-secondary hover:text-holo-cyan transition-all mb-4"
          >
            <ArrowLeft size={20} />
            {t('admin.back_to_users')}
          </Link>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display font-bold text-4xl mb-2">
                <span className="text-gradient animate-gradient-bg">{user.username}</span>
              </h1>
              <p className="text-dark-text-secondary">
                {t('admin.member_since')} {formatDateTime(user.date_joined)}
              </p>
            </div>

            <div className="flex gap-2">
              {!editMode ? (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 bg-holo-purple text-white rounded-xl hover:bg-holo-purple/90 transition-all flex items-center gap-2"
                  >
                    <Edit2 size={16} />
                    {t('common.edit')}
                  </button>
                  {isBanned ? (
                    <button
                      onClick={handleUnban}
                      className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all flex items-center gap-2"
                    >
                      <ShieldOff size={16} />
                      {t('admin.unban')}
                    </button>
                  ) : (
                    <button
                      onClick={handleBan}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-all flex items-center gap-2"
                    >
                      <Shield size={16} />
                      {t('admin.ban')}
                    </button>
                  )}
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    {t('common.delete')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all"
                  >
                    {t('common.save')}
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setEditData({
                        is_staff: user.is_staff,
                        is_active: user.is_active,
                        is_superuser: user.is_superuser,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        email: user.email,
                      });
                    }}
                    className="px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl hover:border-white/20 transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Statistiques Utilisateur */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">{t('admin.total_orders')}</p>
                <p className="font-display font-bold text-3xl">{user.stats.total_orders}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-holo-cyan/10 flex items-center justify-center">
                <ShoppingCart className="text-holo-cyan" size={24} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">{t('admin.total_spent')}</p>
                <p className="font-display font-bold text-2xl text-green-400">
                  {formatCurrency(user.stats.total_spent)}
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
                <p className="text-dark-text-tertiary text-sm mb-1">{t('admin.avg_cart')}</p>
                <p className="font-display font-bold text-2xl">
                  {formatCurrency(user.stats.average_order_value)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-holo-purple/10 flex items-center justify-center">
                <TrendingUp className="text-holo-purple" size={24} />
              </div>
            </div>
          </Card>

          {user.is_vendor && (
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-text-tertiary text-sm mb-1">{t('admin.active_products')}</p>
                  <p className="font-display font-bold text-3xl text-holo-pink">
                    {user.stats.active_products || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-holo-pink/10 flex items-center justify-center">
                  <Package className="text-holo-pink" size={24} />
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne Principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informations Personnelles */}
            <Card>
              <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                <User className="text-holo-cyan" size={24} />
                {t('admin.personal_info')}
              </h3>

              {editMode ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-dark-text-tertiary mb-2">
                        {t('admin.first_name')}
                      </label>
                      <input
                        type="text"
                        value={editData.first_name}
                        onChange={(e) =>
                          setEditData((prev) => ({ ...prev, first_name: e.target.value }))
                        }
                        className="w-full px-3 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-cyan transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-text-tertiary mb-2">{t('admin.last_name')}</label>
                      <input
                        type="text"
                        value={editData.last_name}
                        onChange={(e) =>
                          setEditData((prev) => ({ ...prev, last_name: e.target.value }))
                        }
                        className="w-full px-3 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-cyan transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-dark-text-tertiary mb-2">{t('admin.email')}</label>
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) =>
                        setEditData((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-cyan transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editData.is_active}
                        onChange={(e) =>
                          setEditData((prev) => ({ ...prev, is_active: e.target.checked }))
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{t('admin.account_active')}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editData.is_staff}
                        onChange={(e) =>
                          setEditData((prev) => ({ ...prev, is_staff: e.target.checked }))
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{t('admin.admin')}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editData.is_superuser}
                        onChange={(e) =>
                          setEditData((prev) => ({ ...prev, is_superuser: e.target.checked }))
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{t('admin.super_admin')}</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="text-dark-text-tertiary mt-1" size={20} />
                    <div>
                      <p className="text-sm text-dark-text-tertiary">{t('admin.full_name')}</p>
                      <p className="font-medium">
                        {user.first_name || user.last_name
                          ? `${user.first_name} ${user.last_name}`.trim()
                          : t('admin.not_provided')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="text-dark-text-tertiary mt-1" size={20} />
                    <div>
                      <p className="text-sm text-dark-text-tertiary">{t('admin.email')}</p>
                      <p className="font-medium">{user.email}</p>
                    </div>
                  </div>

                  {user.profile?.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="text-dark-text-tertiary mt-1" size={20} />
                      <div>
                        <p className="text-sm text-dark-text-tertiary">{t('admin.phone')}</p>
                        <p className="font-medium">{user.profile.phone}</p>
                      </div>
                    </div>
                  )}

                  {user.profile?.bio && (
                    <div className="p-3 bg-dark-bg-tertiary rounded-xl border border-white/10">
                      <p className="text-sm text-dark-text-tertiary mb-1">{t('admin.bio')}</p>
                      <p className="text-sm">{user.profile.bio}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Profil Vendeur */}
            {user.is_vendor && user.vendor_profile && (
              <Card>
                <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                  <Store className="text-holo-purple" size={24} />
                  {t('admin.vendor_profile')}
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-dark-text-tertiary">{t('admin.business_name')}</p>
                    <p className="font-medium">{user.vendor_profile.business_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-dark-text-tertiary">{t('admin.status')}</p>
                    <Badge
                      variant={
                        user.vendor_profile.status === 'APPROVED'
                          ? 'success'
                          : user.vendor_profile.status === 'PENDING'
                          ? 'warning'
                          : 'error'
                      }
                    >
                      {user.vendor_profile.status}
                    </Badge>
                  </div>
                  <Link
                    to={`/admin/vendors/${user.id}`}
                    className="inline-block mt-4 text-holo-purple hover:underline"
                  >
                    {t('admin.view_vendor_profile')} →
                  </Link>
                </div>
              </Card>
            )}

            {/* Timeline Activité */}
            <Card>
              <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                <Activity className="text-holo-cyan" size={24} />
                {t('admin.activity_timeline')}
              </h3>
              {user.activity_logs.length === 0 ? (
                <p className="text-dark-text-secondary text-center py-6">
                  {t('admin.no_activity')}
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {user.activity_logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-dark-bg-tertiary border border-white/10"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-holo-cyan">{log.action}</p>
                          {log.performed_by_name && (
                            <p className="text-sm text-dark-text-tertiary">
                              {t('admin.by')} <strong>{log.performed_by_name}</strong>
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-dark-text-tertiary">
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>
                      {log.description && (
                        <p className="text-sm text-dark-text-secondary">{log.description}</p>
                      )}
                      {log.ip_address && (
                        <p className="text-xs text-dark-text-tertiary mt-2">
                          IP: {log.ip_address}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Statut Compte */}
            <Card>
              <h3 className="font-display font-bold text-lg mb-4">{t('admin.account_status')}</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-dark-text-tertiary mb-2">{t('admin.state')}</p>
                  {isBanned ? (
                    <Badge variant="error" className="w-full justify-center py-2">
                      <XCircle size={16} className="mr-2" />
                      {t('admin.banned')}
                    </Badge>
                  ) : user.is_active ? (
                    <Badge variant="success" className="w-full justify-center py-2">
                      <CheckCircle size={16} className="mr-2" />
                      {t('admin.active_status')}
                    </Badge>
                  ) : (
                    <Badge variant="default" className="w-full justify-center py-2">
                      <XCircle size={16} className="mr-2" />
                      {t('admin.inactive_status')}
                    </Badge>
                  )}
                </div>

                {isBanned && user.profile && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-sm font-medium text-red-400 mb-1">{t('admin.ban_reason')}</p>
                    <p className="text-sm">{user.profile.ban_reason}</p>
                    <p className="text-xs text-dark-text-tertiary mt-2">
                      {t('admin.banned_on')} {formatDateTime(user.profile.banned_at)}
                    </p>
                    {user.profile.banned_by && (
                      <p className="text-xs text-dark-text-tertiary">
                        {t('admin.by')} {user.profile.banned_by}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {user.is_superuser && <Badge variant="error">{t('admin.super_admin')}</Badge>}
                  {user.is_staff && !user.is_superuser && (
                    <Badge variant="warning">{t('admin.admin')}</Badge>
                  )}
                  {user.is_vendor && <Badge variant="default">{t('admin.vendor')}</Badge>}
                </div>
              </div>
            </Card>

            {/* Dates */}
            <Card>
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <Clock className="text-holo-pink" size={20} />
                {t('admin.dates')}
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-dark-text-tertiary">{t('admin.registration')}</p>
                  <p className="font-medium">{formatDateTime(user.date_joined)}</p>
                </div>
                <div>
                  <p className="text-dark-text-tertiary">{t('admin.last_login')}</p>
                  <p className="font-medium">{formatDateTime(user.last_login)}</p>
                </div>
              </div>
            </Card>

            {/* Actions Rapides */}
            <Card>
              <h3 className="font-display font-bold text-lg mb-4">{t('admin.quick_actions')}</h3>
              <div className="space-y-2">
                <Link
                  to={`/admin/orders?search=${user.email}`}
                  className="block w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl hover:border-holo-cyan transition-all text-center"
                >
                  {t('admin.view_orders')}
                </Link>
                {user.is_vendor && (
                  <Link
                    to={`/admin/products?vendor=${user.id}`}
                    className="block w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl hover:border-holo-purple transition-all text-center"
                  >
                    {t('admin.view_products')}
                  </Link>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
