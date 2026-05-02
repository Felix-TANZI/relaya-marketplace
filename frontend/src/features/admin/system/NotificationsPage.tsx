// frontend/src/features/admin/system/NotificationsPage.tsx
// Broadcast notifications admin — BelivaY

import { useState, useEffect } from 'react';
import {
  Bell, Send, RefreshCw, Users, Store, CheckCircle, Truck, Search,
  ChevronDown, Globe,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { adminApi, type AdminCourierSimple, type VendorProfile } from '@/services/api/admin';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Audience =
  | 'all_actors'
  | 'all'
  | 'customers'
  | 'vendors'
  | 'active_vendors'
  | 'specific_vendor'
  | 'couriers'
  | 'specific_courier';

interface AudienceCfg {
  key:    Audience;
  label:  string;
  desc:   string;
  icon:   React.ElementType;
  color:  string;
  needsPicker?: 'vendor' | 'courier';
}

const AUDIENCE_CFG: AudienceCfg[] = [
  { key: 'all_actors',       label: 'Tous les acteurs',       desc: 'Clients + Vendeurs + Livreurs', icon: Globe,  color: '#8B5CF6' },
  { key: 'all',              label: 'Clients + Vendeurs',     desc: 'Tous (sans livreurs)',          icon: Users,  color: '#F9FAFB' },
  { key: 'customers',        label: 'Clients uniquement',     desc: 'Acheteurs inscrits',            icon: Users,  color: '#3B82F6' },
  { key: 'vendors',          label: 'Tous les vendeurs',      desc: 'Actifs + En attente',           icon: Store,  color: '#F47920' },
  { key: 'active_vendors',   label: 'Vendeurs approuvés',     desc: 'Boutiques actives',             icon: Store,  color: '#10B981' },
  { key: 'specific_vendor',  label: 'Vendeur spécifique',     desc: 'Cibler un vendeur précis',      icon: Store,  color: '#F59E0B', needsPicker: 'vendor'   },
  { key: 'couriers',         label: 'Tous les livreurs',      desc: 'Ensemble des livreurs actifs',  icon: Truck,  color: '#06B6D4' },
  { key: 'specific_courier', label: 'Livreur spécifique',     desc: 'Cibler un livreur précis',      icon: Truck,  color: '#EC4899', needsPicker: 'courier'  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();

  const [audience,        setAudience]        = useState<Audience>('all_actors');
  const [title,           setTitle]           = useState('');
  const [message,         setMessage]         = useState('');
  const [sending,         setSending]         = useState(false);
  const [sent,            setSent]            = useState(false);

  // Données pour pickers
  const [vendors,         setVendors]         = useState<VendorProfile[]>([]);
  const [couriers,        setCouriers]        = useState<AdminCourierSimple[]>([]);
  const [selectedVendor,  setSelectedVendor]  = useState<VendorProfile | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<AdminCourierSimple | null>(null);
  const [vendorSearch,    setVendorSearch]    = useState('');
  const [courierSearch,   setCourierSearch]   = useState('');
  const [showVDropdown,   setShowVDropdown]   = useState(false);
  const [showCDropdown,   setShowCDropdown]   = useState(false);
  const [loadingPickers,  setLoadingPickers]  = useState(false);

  const cfg = AUDIENCE_CFG.find(a => a.key === audience)!;

  useEffect(() => {
    if (audience === 'specific_vendor' && vendors.length === 0) {
      setLoadingPickers(true);
      adminApi.listVendors?.()
        .then(data => setVendors(Array.isArray(data) ? data : (data as { results?: VendorProfile[] }).results ?? []))
        .catch(() => showToast('Erreur chargement vendeurs', 'error'))
        .finally(() => setLoadingPickers(false));
    }
    if (audience === 'specific_courier' && couriers.length === 0) {
      setLoadingPickers(true);
      adminApi.listCouriersSimple()
        .then(data => setCouriers(data))
        .catch(() => showToast('Erreur chargement livreurs', 'error'))
        .finally(() => setLoadingPickers(false));
    }
  }, [audience]);

  const inp: React.CSSProperties = {
    background: T.input, color: T.text,
    border: `1px solid ${T.inputBorder}`,
    borderRadius: 12, padding: '10px 14px',
    fontSize: 13.5, outline: 'none', width: '100%',
    fontFamily: "'Plus Jakarta Sans',sans-serif",
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      showToast('Titre et message sont obligatoires', 'error');
      return;
    }
    if (audience === 'specific_vendor' && !selectedVendor) {
      showToast('Veuillez sélectionner un vendeur', 'error');
      return;
    }
    if (audience === 'specific_courier' && !selectedCourier) {
      showToast('Veuillez sélectionner un livreur', 'error');
      return;
    }
    setSending(true);
    try {
      const res = await adminApi.broadcastExtended({
        audience,
        title:            title.trim(),
        message:          message.trim(),
        type:             'SYSTEM',
        vendor_user_id:   audience === 'specific_vendor'  ? selectedVendor?.user_id  : undefined,
        courier_user_id:  audience === 'specific_courier' ? selectedCourier?.user_id : undefined,
      });
      showToast(`Notification envoyée à ${res.recipients} destinataire(s)`, 'success');
      setSent(true);
      setTitle('');
      setMessage('');
      setSelectedVendor(null);
      setSelectedCourier(null);
      setTimeout(() => setSent(false), 3000);
    } catch {
      showToast("Erreur lors de l'envoi", 'error');
    } finally {
      setSending(false);
    }
  };

  const filteredVendors  = vendors.filter(v =>
    v.business_name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.username?.toLowerCase().includes(vendorSearch.toLowerCase())
  );
  const filteredCouriers = couriers.filter(c =>
    c.name?.toLowerCase().includes(courierSearch.toLowerCase()) ||
    c.phone?.includes(courierSearch) ||
    c.city?.toLowerCase().includes(courierSearch.toLowerCase())
  );

  const audienceCfg = AUDIENCE_CFG.find(a => a.key === audience)!;

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
          Broadcast Notifications
        </h1>
        <p style={{ fontSize: 13, color: T.muted }}>
          Notifier les acteurs de la plateforme — clients, vendeurs, livreurs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── FORMULAIRE ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Sélection audience */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <Users size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Audience cible</span>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AUDIENCE_CFG.map(a => {
                const Icon    = a.icon;
                const color   = a.color;
                const isActive= audience === a.key;
                return (
                  <button key={a.key}
                    onClick={() => { setAudience(a.key); setSelectedVendor(null); setSelectedCourier(null); }}
                    className="flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                    style={{
                      background: isActive ? color + '15' : T.cardAlt,
                      border: `2px solid ${isActive ? color : T.border}`,
                    }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: color + '20' }}>
                      <Icon size={16} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 13, fontWeight: 700, color: isActive ? color : T.text }}>{a.label}</p>
                      <p style={{ fontSize: 11, color: T.muted }}>{a.desc}</p>
                    </div>
                    {isActive && <CheckCircle size={16} style={{ color, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>

            {/* Picker vendeur */}
            {audience === 'specific_vendor' && (
              <div className="px-5 pb-5">
                <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>
                  Sélectionner un vendeur <span style={{ color: T.red }}>*</span>
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowVDropdown(v => !v)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-left"
                    style={{ background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, fontSize: 13 }}>
                    <span style={{ color: selectedVendor ? T.text : T.muted }}>
                      {selectedVendor ? `${selectedVendor.business_name} (${selectedVendor.username})` : 'Choisir un vendeur…'}
                    </span>
                    <ChevronDown size={14} style={{ color: T.muted, flexShrink: 0 }} />
                  </button>
                  {showVDropdown && (
                    <div className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden shadow-lg"
                      style={{ background: T.card, border: `1px solid ${T.border}`, maxHeight: 260 }}>
                      <div className="p-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: T.cardAlt }}>
                          <Search size={13} style={{ color: T.muted }} />
                          <input
                            autoFocus
                            value={vendorSearch}
                            onChange={e => setVendorSearch(e.target.value)}
                            placeholder="Rechercher un vendeur…"
                            style={{ background: 'transparent', border: 'none', outline: 'none', color: T.text, fontSize: 13, width: '100%' }}
                          />
                        </div>
                      </div>
                      <div style={{ maxHeight: 200, overflowY: 'auto', scrollbarWidth: 'thin' }}>
                        {loadingPickers ? (
                          <div className="flex items-center justify-center py-6">
                            <RefreshCw size={16} className="animate-spin" style={{ color: T.muted }} />
                          </div>
                        ) : filteredVendors.length === 0 ? (
                          <p style={{ fontSize: 13, color: T.muted, padding: '12px 16px' }}>Aucun vendeur trouvé</p>
                        ) : filteredVendors.map(v => (
                          <button key={v.id}
                            onClick={() => { setSelectedVendor(v); setShowVDropdown(false); setVendorSearch(''); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                            style={{ borderBottom: `1px solid ${T.border}` }}
                            onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: '#F4792015' }}>
                              <Store size={12} style={{ color: '#F47920' }} />
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{v.business_name}</p>
                              <p style={{ fontSize: 11, color: T.muted }}>{v.username} · {v.city}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Picker livreur */}
            {audience === 'specific_courier' && (
              <div className="px-5 pb-5">
                <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>
                  Sélectionner un livreur <span style={{ color: T.red }}>*</span>
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowCDropdown(v => !v)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-left"
                    style={{ background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, fontSize: 13 }}>
                    <span style={{ color: selectedCourier ? T.text : T.muted }}>
                      {selectedCourier ? `${selectedCourier.name} — ${selectedCourier.phone}` : 'Choisir un livreur…'}
                    </span>
                    <ChevronDown size={14} style={{ color: T.muted, flexShrink: 0 }} />
                  </button>
                  {showCDropdown && (
                    <div className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden shadow-lg"
                      style={{ background: T.card, border: `1px solid ${T.border}`, maxHeight: 260 }}>
                      <div className="p-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: T.cardAlt }}>
                          <Search size={13} style={{ color: T.muted }} />
                          <input
                            autoFocus
                            value={courierSearch}
                            onChange={e => setCourierSearch(e.target.value)}
                            placeholder="Nom, téléphone ou ville…"
                            style={{ background: 'transparent', border: 'none', outline: 'none', color: T.text, fontSize: 13, width: '100%' }}
                          />
                        </div>
                      </div>
                      <div style={{ maxHeight: 200, overflowY: 'auto', scrollbarWidth: 'thin' }}>
                        {loadingPickers ? (
                          <div className="flex items-center justify-center py-6">
                            <RefreshCw size={16} className="animate-spin" style={{ color: T.muted }} />
                          </div>
                        ) : filteredCouriers.length === 0 ? (
                          <p style={{ fontSize: 13, color: T.muted, padding: '12px 16px' }}>Aucun livreur trouvé</p>
                        ) : filteredCouriers.map(c => (
                          <button key={c.id}
                            onClick={() => { setSelectedCourier(c); setShowCDropdown(false); setCourierSearch(''); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                            style={{ borderBottom: `1px solid ${T.border}` }}
                            onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: '#06B6D415' }}>
                              <Truck size={12} style={{ color: '#06B6D4' }} />
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.name}</p>
                              <p style={{ fontSize: 11, color: T.muted }}>{c.phone} · {c.city}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Contenu du message */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 px-5 py-3.5"
              style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <Bell size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Contenu du message</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>
                  Titre <span style={{ color: T.red }}>*</span>
                </label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Ex : Maintenance prévue ce soir à 22h"
                  maxLength={100} style={inp}
                  onFocus={e => (e.target.style.borderColor = T.red)}
                  onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
                <p style={{ fontSize: 11, color: T.muted, marginTop: 3, textAlign: 'right' }}>{title.length}/100</p>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>
                  Message <span style={{ color: T.red }}>*</span>
                </label>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Votre message pour les destinataires…"
                  rows={5} maxLength={500}
                  style={{ ...inp, resize: 'vertical' }}
                  onFocus={e => (e.target.style.borderColor = T.red)}
                  onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
                <p style={{ fontSize: 11, color: T.muted, marginTop: 3, textAlign: 'right' }}>{message.length}/500</p>
              </div>

              <button onClick={handleSend}
                disabled={sending || !title.trim() || !message.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all"
                style={{
                  background: sent
                    ? 'linear-gradient(135deg,#10B981,#059669)'
                    : (title.trim() && message.trim())
                      ? 'linear-gradient(135deg,#DC2626,#991B1B)'
                      : T.border,
                  boxShadow: (title.trim() && message.trim() && !sent) ? '0 4px 16px rgba(220,38,38,0.35)' : 'none',
                  cursor: sending || !title.trim() || !message.trim() ? 'not-allowed' : 'pointer',
                }}>
                {sending ? <RefreshCw size={16} className="animate-spin" /> : sent ? <CheckCircle size={16} /> : <Send size={16} />}
                {sending ? 'Envoi en cours…' : sent ? 'Notification envoyée !' : 'Envoyer la notification'}
              </button>
            </div>
          </div>
        </div>

        {/* ── COLONNE DROITE ────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Aperçu */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 px-5 py-3.5"
              style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <Bell size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Aperçu</span>
            </div>
            <div className="p-5">
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#DC2626,#991B1B)' }}>
                    <Bell size={15} style={{ color: '#fff' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 12, fontWeight: 800, color: '#F9FAFB', marginBottom: 2 }}>
                      {title || 'Titre de la notification'}
                    </p>
                    <p style={{ fontSize: 11.5, color: 'rgba(249,250,251,0.55)', lineHeight: 1.5 }}>
                      {message || 'Votre message apparaîtra ici…'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 10, color: 'rgba(249,250,251,0.3)' }}>BelivaY · à l'instant</span>
                  <span style={{ fontSize: 10, color: audienceCfg.color, opacity: 0.9 }}>
                    {audienceCfg.label}
                    {audience === 'specific_vendor'  && selectedVendor  && ` · ${selectedVendor.business_name}`}
                    {audience === 'specific_courier' && selectedCourier && ` · ${selectedCourier.name}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Résumé ciblage */}
          <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-3">
              {(() => { const Icon = audienceCfg.icon; return <Icon size={14} style={{ color: audienceCfg.color }} />; })()}
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>Ciblage sélectionné</span>
            </div>
            <div className="p-3 rounded-xl" style={{ background: audienceCfg.color + '12', border: `1px solid ${audienceCfg.color}30` }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: audienceCfg.color }}>{audienceCfg.label}</p>
              <p style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{audienceCfg.desc}</p>
              {audience === 'specific_vendor' && selectedVendor && (
                <p style={{ fontSize: 12, fontWeight: 600, color: audienceCfg.color, marginTop: 4 }}>
                  → {selectedVendor.business_name}
                </p>
              )}
              {audience === 'specific_courier' && selectedCourier && (
                <p style={{ fontSize: 12, fontWeight: 600, color: audienceCfg.color, marginTop: 4 }}>
                  → {selectedCourier.name} ({selectedCourier.phone})
                </p>
              )}
            </div>
          </div>

          {/* Informations */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>Informations</p>
            {[
              'Les notifications apparaissent dans le centre de notifications de chaque utilisateur.',
              'Un livreur ou un vendeur ciblé spécifiquement reçoit uniquement son message.',
              "L'option « Tous les acteurs » couvre clients, vendeurs et livreurs.",
              "L'historique des broadcasts est conservé 90 jours.",
            ].map((info, i) => (
              <div key={i} className="flex items-start gap-2">
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: T.muted, flexShrink: 0, marginTop: 6 }} />
                <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{info}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
