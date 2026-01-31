// frontend/src/features/profile/ProfilePage.tsx
// Page de profil utilisateur - consultation et modification des informations

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Edit2, Save, X, ShoppingBag } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { authApi, type User as UserType } from '@/services/api/auth';
import { useToast } from '@/context/ToastContext';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulaire d'édition
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
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
        });
      } catch (error) {
        console.error('Erreur chargement profil:', error);
        showToast('Erreur de chargement du profil', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [showToast]);

  // Sauvegarder les modifications
  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedUser = await authApi.updateProfile(formData);
      setUser(updatedUser);
      setIsEditing(false);
      showToast('Profil mis à jour avec succès', 'success');
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      showToast('Erreur lors de la mise à jour', 'error');
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
      });
    }
    setIsEditing(false);
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
          <p className="text-dark-text-secondary">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-4xl lg:text-5xl mb-2">
            <span className="text-gradient animate-gradient-bg">Mon Profil</span>
          </h1>
          <p className="text-dark-text-secondary">
            Gérez vos informations personnelles et vos préférences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Stats */}
          <div className="space-y-6">
            {/* Avatar */}
            <Card>
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-holographic flex items-center justify-center text-white font-display font-bold text-3xl">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <h2 className="font-display font-bold text-xl text-dark-text mb-1">
                  {user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user.username}
                </h2>
                <p className="text-dark-text-secondary text-sm">@{user.username}</p>
              </div>
            </Card>

            {/* Quick Stats */}
            <Card>
              <h3 className="font-semibold text-dark-text mb-4">Statistiques</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/orders')}
                  className="w-full flex items-center justify-between p-3 rounded-lg glass border border-white/10 hover:border-holo-cyan transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="text-holo-cyan" size={20} />
                    <span className="text-dark-text">Mes commandes</span>
                  </div>
                  <span className="text-dark-text-tertiary">→</span>
                </button>
              </div>
            </Card>

            {/* Member Since */}
            <Card>
              <div className="flex items-center gap-3 text-dark-text-secondary text-sm">
                <Calendar size={18} />
                <div>
                  <p className="text-dark-text-tertiary">Membre depuis</p>
                  <p className="text-dark-text font-medium">{formatDate(user.date_joined)}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content - Profile Info */}
          <div className="lg:col-span-2">
            <Card>
              {/* Header avec bouton Edit */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-bold text-2xl text-dark-text">
                  Informations personnelles
                </h2>
                {!isEditing ? (
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 size={18} />
                    Modifier
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={handleCancel}>
                      <X size={18} />
                      Annuler
                    </Button>
                    <Button
                      variant="gradient"
                      size="sm"
                      onClick={handleSave}
                      isLoading={saving}
                    >
                      <Save size={18} />
                      Enregistrer
                    </Button>
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Username (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    Nom d'utilisateur
                  </label>
                  <div className="flex items-center gap-3 p-3 rounded-xl glass border border-white/10">
                    <User className="text-dark-text-tertiary" size={20} />
                    <span className="text-dark-text">{user.username}</span>
                    <span className="ml-auto text-xs text-dark-text-tertiary">Non modifiable</span>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    Email
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

                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    Prénom
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="Votre prénom"
                      className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl glass border border-white/10">
                      <span className="text-dark-text">{user.first_name || 'Non renseigné'}</span>
                    </div>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    Nom
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Votre nom"
                      className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl glass border border-white/10">
                      <span className="text-dark-text">{user.last_name || 'Non renseigné'}</span>
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