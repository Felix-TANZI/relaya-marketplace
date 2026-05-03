// frontend/src/features/admin/SettingsPage.tsx
// Paramètres plateforme BelivaY — admin
// Sections : Frais livraison · Commission · Paiements · Emails · Maintenance

import { useEffect, useState, useCallback } from 'react';
import {
  Save, RefreshCw, Plus, Trash2, AlertTriangle,
  Truck, DollarSign, CreditCard, Mail, Shield,
  CheckCircle, Clock, Smartphone,
} from 'lucide-react';
import { adminApi, type PlatformSettings } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, T }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  T: ReturnType<typeof useAdminTheme>;
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
        <Icon size={14} style={{ color: T.red }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</span>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#9CA3AF' }}>{children}</span>
      {hint && <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label, description, T }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  T: ReturnType<typeof useAdminTheme>;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 p-4 rounded-xl cursor-pointer transition-all"
      style={{ background: checked ? T.red + '08' : T.cardAlt, border: `1px solid ${checked ? T.red + '30' : T.border}` }}
      onClick={() => onChange(!checked)}
    >
      <div>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{label}</p>
        {description && <p style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{description}</p>}
      </div>
      {/* Toggle switch */}
      <div style={{
        width: 44, height: 24, borderRadius: 12, flexShrink: 0,
        background: checked ? T.red : T.border,
        position: 'relative', transition: 'background 0.2s ease',
        cursor: 'pointer',
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3,
          left: checked ? 23 : 3,
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [dirty,    setDirty]    = useState(false);

  // Formulaire
  const [form, setForm] = useState({
    platform_commission_percent: '10.00',
    minimum_order_amount_xaf:    5000,
    default_delivery_days:       3,
    mtn_momo_enabled:            true,
    orange_money_enabled:        true,
    admin_email:                 'admin@belivay.cm',
    support_email:               'support@belivay.cm',
    maintenance_mode:            false,
    maintenance_message:         '',
  });

  // Frais de livraison par ville
  const [fees,    setFees]    = useState<Record<string, number>>({});
  const [newCity, setNewCity] = useState('');
  const [newFee,  setNewFee]  = useState('');

  // ── Chargement ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getSettings();
      setSettings(data);
      setForm({
        platform_commission_percent: data.platform_commission_percent,
        minimum_order_amount_xaf:    data.minimum_order_amount_xaf,
        default_delivery_days:       data.default_delivery_days,
        mtn_momo_enabled:            data.mtn_momo_enabled,
        orange_money_enabled:        data.orange_money_enabled,
        admin_email:                 data.admin_email,
        support_email:               data.support_email,
        maintenance_mode:            data.maintenance_mode,
        maintenance_message:         data.maintenance_message,
      });
      setFees(data.delivery_fees ?? {});
      setDirty(false);
    } catch {
      showToast('Erreur chargement des paramètres', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const addCity = () => {
    const city = newCity.trim();
    const fee  = parseInt(newFee, 10);
    if (!city || isNaN(fee) || fee < 0) {
      showToast('Renseignez un nom de ville et un montant valide', 'error');
      return;
    }
    setFees(prev => ({ ...prev, [city]: fee }));
    setNewCity(''); setNewFee('');
    setDirty(true);
  };

  const removeCity = (city: string) => {
    setFees(prev => { const f = { ...prev }; delete f[city]; return f; });
    setDirty(true);
  };

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateSettings({ ...form, delivery_fees: fees });
      showToast('Paramètres sauvegardés', 'success');
      await load();
    } catch {
      showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Input style ───────────────────────────────────────────────────────────
  const inp: React.CSSProperties = {
    background: T.input, color: T.text,
    border: `1px solid ${T.inputBorder}`,
    borderRadius: 12, padding: '10px 14px',
    fontSize: 13.5, outline: 'none', width: '100%',
    fontFamily: "'Plus Jakarta Sans',sans-serif",
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Paramètres Plateforme
          </h1>
          {settings && (
            <p style={{ fontSize: 12.5, color: T.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={12} />
              Dernière modification : {fmtDate(settings.updated_at)}
              {settings.updated_by_name && ` par ${settings.updated_by_name}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => load()}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || !dirty}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
            style={{
              background: dirty ? 'linear-gradient(135deg,#DC2626,#991B1B)' : T.border,
              opacity: saving ? 0.7 : 1,
              cursor: dirty ? 'pointer' : 'not-allowed',
              boxShadow: dirty ? '0 4px 16px rgba(220,38,38,0.35)' : 'none',
            }}>
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Alerte maintenance active */}
      {form.maintenance_mode && (
        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle size={18} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#EF4444' }}>Mode maintenance actif</p>
            <p style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>La plateforme est inaccessible aux visiteurs. Désactivez dès que les travaux sont terminés.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── COLONNE GAUCHE ─────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Frais de livraison */}
            <Section title="Frais de livraison par ville" icon={Truck} T={T}>
              {Object.keys(fees).length === 0 ? (
                <p style={{ fontSize: 13, color: T.muted, textAlign: 'center', padding: '12px 0' }}>
                  Aucune ville configurée
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {Object.entries(fees).sort(([a], [b]) => a.localeCompare(b)).map(([city, amount]) => (
                    <div
                      key={city}
                      className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.12)' }}>
                          <Truck size={13} style={{ color: '#3B82F6' }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{city}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                          {new Intl.NumberFormat('fr-FR').format(amount)} FCFA
                        </span>
                        <button
                          onClick={() => removeCity(city)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ajouter une ville */}
              <div>
                <Label>Ajouter une ville</Label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCity}
                    onChange={e => setNewCity(e.target.value)}
                    placeholder="Ex : Bafoussam"
                    style={{ ...inp, flex: 1 }}
                    onFocus={e => (e.target.style.borderColor = T.red)}
                    onBlur={e  => (e.target.style.borderColor = T.inputBorder)}
                    onKeyDown={e => { if (e.key === 'Enter') addCity(); }}
                  />
                  <input
                    type="number"
                    value={newFee}
                    onChange={e => setNewFee(e.target.value)}
                    placeholder="FCFA"
                    style={{ ...inp, width: 110 }}
                    onFocus={e => (e.target.style.borderColor = T.red)}
                    onBlur={e  => (e.target.style.borderColor = T.inputBorder)}
                    onKeyDown={e => { if (e.key === 'Enter') addCity(); }}
                  />
                  <button
                    onClick={addCity}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#DC2626,#991B1B)' }}>
                    <Plus size={14} /> Ajouter
                  </button>
                </div>
              </div>
            </Section>

            {/* Commission & Montants */}
            <Section title="Commission & Montants" icon={DollarSign} T={T}>
              <div>
                <Label hint="Pourcentage prélevé sur chaque vente. Ne s'applique qu'aux nouvelles commandes.">
                  Commission plateforme (%)
                </Label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={form.platform_commission_percent}
                    onChange={e => set('platform_commission_percent', e.target.value)}
                    style={inp}
                    onFocus={e => (e.target.style.borderColor = T.red)}
                    onBlur={e  => (e.target.style.borderColor = T.inputBorder)}
                  />
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: T.muted, fontSize: 13 }}>%</span>
                </div>
              </div>

              <div>
                <Label hint="Montant minimum qu'un client doit commander. En dessous, la commande est bloquée.">
                  Montant minimum de commande (FCFA)
                </Label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={form.minimum_order_amount_xaf}
                  onChange={e => set('minimum_order_amount_xaf', Number(e.target.value))}
                  style={inp}
                  onFocus={e => (e.target.style.borderColor = T.red)}
                  onBlur={e  => (e.target.style.borderColor = T.inputBorder)}
                />
              </div>

              <div>
                <Label hint="Délai affiché au client pour estimer la date de livraison.">
                  Délai de livraison par défaut (jours)
                </Label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={form.default_delivery_days}
                  onChange={e => set('default_delivery_days', Number(e.target.value))}
                  style={inp}
                  onFocus={e => (e.target.style.borderColor = T.red)}
                  onBlur={e  => (e.target.style.borderColor = T.inputBorder)}
                />
              </div>
            </Section>
          </div>

          {/* ── COLONNE DROITE ─────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Méthodes de paiement */}
            <Section title="Méthodes de paiement Mobile Money" icon={CreditCard} T={T}>
              <Toggle
                checked={form.mtn_momo_enabled}
                onChange={v => set('mtn_momo_enabled', v)}
                label="MTN Mobile Money"
                description="Activer/désactiver les paiements via MTN MoMo"
                T={T}
              />
              <Toggle
                checked={form.orange_money_enabled}
                onChange={v => set('orange_money_enabled', v)}
                label="Orange Money"
                description="Activer/désactiver les paiements via Orange Money"
                T={T}
              />
              {!form.mtn_momo_enabled && !form.orange_money_enabled && (
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertTriangle size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: '#EF4444' }}>Aucune méthode de paiement active — les clients ne pourront pas passer de commandes.</p>
                </div>
              )}
            </Section>

            {/* Emails de contact */}
            <Section title="Emails de contact" icon={Mail} T={T}>
              <div>
                <Label hint="Email des notifications système et des alertes admin.">
                  Email administrateur
                </Label>
                <input
                  type="email"
                  value={form.admin_email}
                  onChange={e => set('admin_email', e.target.value)}
                  style={inp}
                  onFocus={e => (e.target.style.borderColor = T.red)}
                  onBlur={e  => (e.target.style.borderColor = T.inputBorder)}
                />
              </div>

              <div>
                <Label hint="Email visible par les clients pour les demandes de support.">
                  Email support client
                </Label>
                <input
                  type="email"
                  value={form.support_email}
                  onChange={e => set('support_email', e.target.value)}
                  style={inp}
                  onFocus={e => (e.target.style.borderColor = T.red)}
                  onBlur={e  => (e.target.style.borderColor = T.inputBorder)}
                />
              </div>
            </Section>

            {/* Maintenance */}
            <Section title="Mode Maintenance" icon={Shield} T={T}>
              <Toggle
                checked={form.maintenance_mode}
                onChange={v => set('maintenance_mode', v)}
                label="Activer le mode maintenance"
                description="La plateforme sera inaccessible aux visiteurs — à utiliser avec précaution."
                T={T}
              />

              {form.maintenance_mode && (
                <div>
                  <Label hint="Message affiché sur la page de maintenance.">
                    Message aux visiteurs
                  </Label>
                  <textarea
                    value={form.maintenance_message}
                    onChange={e => { set('maintenance_message', e.target.value); }}
                    rows={3}
                    placeholder="Ex : BelivaY est en maintenance. Retour prévu dans 1 heure."
                    style={{ ...inp, resize: 'vertical' }}
                    onFocus={e => (e.target.style.borderColor = T.red)}
                    onBlur={e  => (e.target.style.borderColor = T.inputBorder)}
                  />
                </div>
              )}
            </Section>

            {/* Récapitulatif config actuelle */}
            {settings && (
              <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 12 }}>
                  Configuration actuelle
                </p>
                <div className="space-y-2.5">
                  {[
                    { label: 'Commission',      value: `${settings.platform_commission_percent}%`,                          icon: DollarSign,   color: T.red },
                    { label: 'Commande min.',   value: `${new Intl.NumberFormat('fr-FR').format(settings.minimum_order_amount_xaf)} FCFA`, icon: Shield, color: '#3B82F6' },
                    { label: 'Délai livraison', value: `${settings.default_delivery_days} jour(s)`,                         icon: Truck,        color: '#F47920' },
                    { label: 'MTN MoMo',        value: settings.mtn_momo_enabled ? 'Actif' : 'Inactif',                     icon: Smartphone,   color: settings.mtn_momo_enabled ? '#10B981' : '#EF4444' },
                    { label: 'Orange Money',    value: settings.orange_money_enabled ? 'Actif' : 'Inactif',                  icon: Smartphone,   color: settings.orange_money_enabled ? '#10B981' : '#EF4444' },
                    { label: 'Maintenance',     value: settings.maintenance_mode ? 'ACTIVÉE' : 'Désactivée',                 icon: settings.maintenance_mode ? AlertTriangle : CheckCircle, color: settings.maintenance_mode ? '#EF4444' : '#10B981' },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon size={12} style={{ color: item.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12.5, color: T.muted }}>{item.label}</span>
                        </div>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: item.color }}>{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bouton flottant si dirty */}
      {dirty && !loading && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[13.5px] font-semibold text-white shadow-2xl"
            style={{ background: 'linear-gradient(135deg,#DC2626,#991B1B)', boxShadow: '0 8px 30px rgba(220,38,38,0.5)' }}>
            {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Sauvegarde…' : 'Sauvegarder les modifications'}
          </button>
        </div>
      )}
    </div>
  );
}