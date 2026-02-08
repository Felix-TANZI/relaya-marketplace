// frontend/src/features/admin/SettingsPage.tsx
// Gestion des paramètres système de la plateforme

import { useEffect, useState, useCallback } from 'react';
import {
  DollarSign,
  Truck,
  CreditCard,
  Mail,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  Clock,
} from 'lucide-react';
import { Card} from '@/components/ui';
import { adminApi, type PlatformSettings } from '@/services/api/admin';
import { useToast } from '@/context/ToastContext';

export default function SettingsPage() {
  const { showToast } = useToast();

  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // États formulaire
  const [formData, setFormData] = useState({
    platform_commission_percent: '10.00',
    minimum_order_amount_xaf: 1000,
    default_delivery_days: 3,
    mtn_momo_enabled: true,
    orange_money_enabled: true,
    admin_email: 'admin@relaya.cm',
    support_email: 'support@relaya.cm',
    maintenance_mode: false,
    maintenance_message: '',
  });

  // Frais de livraison par ville
  const [deliveryFees, setDeliveryFees] = useState<Record<string, number>>({});
  const [newCity, setNewCity] = useState('');
  const [newFee, setNewFee] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getSettings();
      setSettings(data);
      setFormData({
        platform_commission_percent: data.platform_commission_percent,
        minimum_order_amount_xaf: data.minimum_order_amount_xaf,
        default_delivery_days: data.default_delivery_days,
        mtn_momo_enabled: data.mtn_momo_enabled,
        orange_money_enabled: data.orange_money_enabled,
        admin_email: data.admin_email,
        support_email: data.support_email,
        maintenance_mode: data.maintenance_mode,
        maintenance_message: data.maintenance_message,
      });
      setDeliveryFees(data.delivery_fees || {});
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
      showToast('Erreur de chargement des paramètres', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await adminApi.updateSettings({
        ...formData,
        delivery_fees: deliveryFees,
      });
      showToast('Paramètres sauvegardés avec succès', 'success');
      loadSettings();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCity = () => {
    if (!newCity.trim() || !newFee) {
      showToast('Veuillez renseigner la ville et le montant', 'error');
      return;
    }

    setDeliveryFees((prev) => ({
      ...prev,
      [newCity.trim()]: parseInt(newFee),
    }));

    setNewCity('');
    setNewFee('');
  };

  const handleRemoveCity = (city: string) => {
    setDeliveryFees((prev) => {
      const updated = { ...prev };
      delete updated[city];
      return updated;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const formatDateTime = (dateStr: string) => {
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

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-4xl mb-2">
            <span className="text-gradient animate-gradient-bg">Paramètres Système</span>
          </h1>
          <p className="text-dark-text-secondary">
            Configuration globale de la plateforme Relaya
          </p>
        </div>

        {/* Dernière modification */}
        {settings && (
          <Card className="mb-6 bg-holo-cyan/5 border-holo-cyan/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="text-holo-cyan" size={20} />
                <div>
                  <p className="text-sm font-medium">Dernière modification</p>
                  <p className="text-xs text-dark-text-tertiary">
                    Par {settings.updated_by_name} • {formatDateTime(settings.updated_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-holo-cyan text-dark-bg font-medium rounded-xl hover:bg-holo-cyan/90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Sauvegarder
              </button>
            </div>
          </Card>
        )}

        <div className="space-y-6">
          {/* Frais de Livraison */}
          <Card>
            <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
              <Truck className="text-holo-cyan" size={24} />
              Frais de Livraison par Ville
            </h3>

            {/* Liste des villes */}
            <div className="space-y-2 mb-4">
              {Object.keys(deliveryFees).length === 0 ? (
                <p className="text-dark-text-tertiary text-center py-6">
                  Aucune ville configurée
                </p>
              ) : (
                Object.entries(deliveryFees).map(([city, fee]) => (
                  <div
                    key={city}
                    className="flex items-center justify-between p-3 rounded-xl bg-dark-bg-tertiary border border-white/10"
                  >
                    <div>
                      <p className="font-medium">{city}</p>
                      <p className="text-sm text-dark-text-tertiary">
                        {formatCurrency(fee)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveCity(city)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Ajouter ville */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nom de la ville"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="flex-1 px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text placeholder-dark-text-tertiary focus:outline-none focus:border-holo-cyan transition-all"
              />
              <input
                type="number"
                placeholder="Montant (FCFA)"
                value={newFee}
                onChange={(e) => setNewFee(e.target.value)}
                className="w-40 px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text placeholder-dark-text-tertiary focus:outline-none focus:border-holo-cyan transition-all"
              />
              <button
                onClick={handleAddCity}
                className="px-4 py-2 bg-holo-cyan text-dark-bg rounded-xl hover:bg-holo-cyan/90 transition-all flex items-center gap-2"
              >
                <Plus size={16} />
                Ajouter
              </button>
            </div>
          </Card>

          {/* Commission & Montants */}
          <Card>
            <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
              <DollarSign className="text-holo-purple" size={24} />
              Commission & Montants
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-dark-text-tertiary mb-2">
                  Commission plateforme (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.platform_commission_percent}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      platform_commission_percent: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-purple transition-all"
                />
                <p className="text-xs text-dark-text-tertiary mt-1">
                  Pourcentage prélevé sur chaque vente
                </p>
              </div>

              <div>
                <label className="block text-sm text-dark-text-tertiary mb-2">
                  Montant minimum de commande (FCFA)
                </label>
                <input
                  type="number"
                  value={formData.minimum_order_amount_xaf}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      minimum_order_amount_xaf: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-purple transition-all"
                />
              </div>

              <div>
                <label className="block text-sm text-dark-text-tertiary mb-2">
                  Délai de livraison par défaut (jours)
                </label>
                <input
                  type="number"
                  value={formData.default_delivery_days}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      default_delivery_days: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-purple transition-all"
                />
              </div>
            </div>
          </Card>

          {/* Méthodes de Paiement */}
          <Card>
            <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
              <CreditCard className="text-holo-pink" size={24} />
              Méthodes de Paiement
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 rounded-xl bg-dark-bg-tertiary border border-white/10 cursor-pointer hover:border-white/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                    <span className="text-2xl">📱</span>
                  </div>
                  <div>
                    <p className="font-medium">MTN Mobile Money</p>
                    <p className="text-sm text-dark-text-tertiary">
                      Paiement via MTN MoMo
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.mtn_momo_enabled}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, mtn_momo_enabled: e.target.checked }))
                  }
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-xl bg-dark-bg-tertiary border border-white/10 cursor-pointer hover:border-white/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <span className="text-2xl">🍊</span>
                  </div>
                  <div>
                    <p className="font-medium">Orange Money</p>
                    <p className="text-sm text-dark-text-tertiary">
                      Paiement via Orange Money
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.orange_money_enabled}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      orange_money_enabled: e.target.checked,
                    }))
                  }
                  className="w-5 h-5"
                />
              </label>
            </div>
          </Card>

          {/* Emails */}
          <Card>
            <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
              <Mail className="text-holo-cyan" size={24} />
              Emails de Contact
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-dark-text-tertiary mb-2">
                  Email administrateur
                </label>
                <input
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, admin_email: e.target.value }))
                  }
                  className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-cyan transition-all"
                />
              </div>

              <div>
                <label className="block text-sm text-dark-text-tertiary mb-2">
                  Email support client
                </label>
                <input
                  type="email"
                  value={formData.support_email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, support_email: e.target.value }))
                  }
                  className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-cyan transition-all"
                />
              </div>
            </div>
          </Card>

          {/* Maintenance */}
          <Card className="border-2 border-yellow-500/30">
            <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
              <AlertTriangle className="text-yellow-400" size={24} />
              Mode Maintenance
            </h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.maintenance_mode}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, maintenance_mode: e.target.checked }))
                  }
                  className="w-5 h-5"
                />
                <div>
                  <p className="font-medium">Activer le mode maintenance</p>
                  <p className="text-sm text-dark-text-tertiary">
                    Le site sera inaccessible aux visiteurs
                  </p>
                </div>
              </label>

              {formData.maintenance_mode && (
                <div>
                  <label className="block text-sm text-dark-text-tertiary mb-2">
                    Message affiché aux visiteurs
                  </label>
                  <textarea
                    value={formData.maintenance_message}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        maintenance_message: e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Site en maintenance, nous revenons bientôt..."
                    className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text placeholder-dark-text-tertiary focus:outline-none focus:border-yellow-500 transition-all resize-none"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Bouton Sauvegarder Final */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-holo-cyan text-dark-bg font-bold rounded-xl hover:bg-holo-cyan/90 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={20} />
              )}
              Sauvegarder les Paramètres
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}