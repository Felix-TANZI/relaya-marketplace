// frontend/src/features/profile/ProfilePage.tsx
// Page de profil utilisateur - consultation et modification des informations

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Mail, Calendar, Edit2, Save, X, ShoppingBag, Camera, Trash2, Bell, Heart, CircleHelp, Gift } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { authApi, type User as UserType } from '@/services/api/auth';
import { useToast } from '@/context/ToastContext';
import {
  getStoredProfileAvatar,
  getUserDisplayName,
  getUserInitials,
  setStoredProfileAvatar,
} from '@/lib/profileAvatar';

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  // Formulaire d'édition
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
  });

  // Charger le profil
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await authApi.getProfile();
        setUser(data);
        setFormData({
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || '',
        });
        setProfileAvatar(data.avatar_url || getStoredProfileAvatar());
      } catch (error) {
        console.error('Erreur chargement profil:', error);
        showToast(t('profile.load_error'), 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [showToast, t]);

  // Sauvegarder les modifications
  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedUser = await authApi.updateProfile(formData);
      setUser(updatedUser);
      setIsEditing(false);
      showToast(t('profile.update_success'), 'success');
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      showToast(t('profile.update_error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Annuler l'édition
  const handleCancel = () => {
    if (user) {
        setFormData({
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone || '',
        });
    }
    setIsEditing(false);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    authApi.uploadAvatar(file).then((updatedUser) => {
      const avatarUrl = updatedUser.avatar_url || null;
      setUser(updatedUser);
      setProfileAvatar(avatarUrl);
      setStoredProfileAvatar(avatarUrl);
      window.dispatchEvent(new Event('belivay-avatar-updated'));
      showToast(t('profile.avatar_success'), 'success');
    }).catch((error) => {
      console.error('Erreur upload avatar:', error);
      showToast(t('profile.avatar_error'), 'error');
    });
  };

  const handleRemoveAvatar = () => {
    authApi.removeAvatar().then((updatedUser) => {
      setUser(updatedUser);
      setProfileAvatar(null);
      setStoredProfileAvatar(null);
      window.dispatchEvent(new Event('belivay-avatar-updated'));
      showToast(t('profile.avatar_removed'), 'success');
    }).catch((error) => {
      console.error('Erreur suppression avatar:', error);
      showToast(t('profile.avatar_remove_error'), 'error');
    });
  };

  // Formater la date d'inscription
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin mb-4" />
          <p className="text-dark-text-secondary">{t('profile.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = getUserDisplayName(user);
  const userInitials = getUserInitials(user);

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8" data-tutorial="profile-header">
          <h1 className="font-display font-bold text-4xl lg:text-5xl mb-2">
            <span className="text-gradient animate-gradient-bg">{t('profile.title')}</span>
          </h1>
          <p className="text-dark-text-secondary">
            {t('profile.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Stats */}
          <div className="space-y-6">
            {/* Avatar */}
            <Card>
              <div className="text-center">
                <div className="relative mx-auto mb-4 h-28 w-28">
                  <div className="h-28 w-28 overflow-hidden rounded-full bg-gradient-holographic flex items-center justify-center text-white font-display font-bold text-3xl shadow-lg">
                    {profileAvatar ? (
                      <img
                        src={profileAvatar}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      userInitials
                    )}
                  </div>
                  <label className="absolute bottom-1 right-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105">
                    <Camera size={18} />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
                <h2 className="font-display font-bold text-xl text-dark-text mb-1">
                  {displayName}
                </h2>
                <p className="text-dark-text-secondary text-sm">@{user.username}</p>
                <p className="mt-2 text-xs text-dark-text-tertiary">
                  {t('profile.avatar_hint')}
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white transition-all hover:bg-primary-dark">
                    <Camera size={16} />
                    {t('profile.avatar_choose')}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                  {profileAvatar && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      {t('profile.avatar_remove')}
                    </button>
                  )}
                </div>
              </div>
            </Card>

            {/* Quick Stats */}
            <Card>
              <h3 className="font-semibold text-dark-text mb-4">{t('profile.stats_title')}</h3>
              <div className="mb-4 rounded-2xl bg-primary/10 p-4 text-sm">
                <p className="font-semibold text-primary">{t('profile.stats.points', { points: 200, level: 'Bronze' })}</p>
                <p className="mt-1 text-dark-text-secondary">
                  {t('profile.stats.unlock_message')}
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/orders')}
                  className="w-full flex items-center justify-between p-3 rounded-lg glass border border-white/10 hover:border-holo-cyan transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="text-holo-cyan" size={20} />
                    <span className="text-dark-text">{t('profile.menu.orders')}</span>
                  </div>
                  <span className="text-dark-text-tertiary">→</span>
                </button>
                <Link
                  to="/wishlist"
                  className="w-full flex items-center justify-between p-3 rounded-lg glass border border-white/10 hover:border-holo-cyan transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="text-holo-cyan" size={20} />
                    <span className="text-dark-text">{t('profile.menu.favorites')}</span>
                  </div>
                  <span className="text-dark-text-tertiary">→</span>
                </Link>
                <Link
                  to="/notifications"
                  className="w-full flex items-center justify-between p-3 rounded-lg glass border border-white/10 hover:border-holo-cyan transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="text-holo-cyan" size={20} />
                    <span className="text-dark-text">{t('profile.menu.notifications')}</span>
                  </div>
                  <span className="text-dark-text-tertiary">→</span>
                </Link>
              </div>
            </Card>

            {/* Member Since */}
            <Card>
              <div className="flex items-center gap-3 text-dark-text-secondary text-sm">
                <Calendar size={18} />
                <div>
                  <p className="text-dark-text-tertiary">{t('profile.member_since_label')}</p>
                  <p className="text-dark-text font-medium">{formatDate(user.date_joined)}</p>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold text-dark-text mb-4">{t('profile.support_title')}</h3>
              <div className="space-y-3">
                <Link
                  to="/help"
                  className="flex items-center justify-between rounded-xl border border-white/10 p-3 transition-all hover:border-holo-cyan"
                >
                  <div className="flex items-center gap-3">
                    <CircleHelp size={18} className="text-holo-cyan" />
                    <span className="text-dark-text">{t('profile.support.help_center')}</span>
                  </div>
                  <span className="text-dark-text-tertiary">→</span>
                </Link>
                <a
                  href="https://wa.me/2370005568778"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-white/10 p-3 transition-all hover:border-holo-cyan"
                >
                  <div className="flex items-center gap-3">
                    <Gift size={18} className="text-holo-cyan" />
                    <span className="text-dark-text">{t('profile.support.whatsapp')}</span>
                  </div>
                  <span className="text-dark-text-tertiary">→</span>
                </a>
              </div>
            </Card>
          </div>

          {/* Main Content - Profile Info */}
          <div className="lg:col-span-2">
            <Card>
              {/* Header avec bouton Edit */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-bold text-2xl text-dark-text">
                  {t('profile.info_title')}
                </h2>
                {!isEditing ? (
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 size={18} />
                    {t('profile.button.edit')}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={handleCancel}>
                      <X size={18} />
                      {t('profile.button.cancel')}
                    </Button>
                    <Button
                      variant="gradient"
                      size="sm"
                      onClick={handleSave}
                      isLoading={saving}
                    >
                      <Save size={18} />
                      {t('profile.button.save')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Username (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    {t('profile.form.username_label')}
                  </label>
                  <div className="flex items-center gap-3 p-3 rounded-xl glass border border-white/10">
                    <User className="text-dark-text-tertiary" size={20} />
                    <span className="text-dark-text">{user.username}</span>
                    <span className="ml-auto text-xs text-dark-text-tertiary">{t('profile.form.username_readonly')}</span>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    {t('profile.form.email_label')}
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-text-tertiary" size={20} />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl glass border border-white/10">
                      <Mail className="text-dark-text-tertiary" size={20} />
                      <span className="text-dark-text">{user.email}</span>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    {t('profile.form.phone_label')}
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder={t('profile.form.phone_placeholder')}
                      className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl glass border border-white/10">
                      <span className="text-dark-text">{user.phone || t('profile.form.phone_empty')}</span>
                    </div>
                  )}
                </div>

                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    {t('profile.form.firstname_label')}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder={t('profile.form.firstname_placeholder')}
                      className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl glass border border-white/10">
                      <span className="text-dark-text">{user.first_name || t('profile.form.firstname_empty')}</span>
                    </div>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    {t('profile.form.lastname_label')}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder={t('profile.form.lastname_placeholder')}
                      className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl glass border border-white/10">
                      <span className="text-dark-text">{user.last_name || t('profile.form.lastname_empty')}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
