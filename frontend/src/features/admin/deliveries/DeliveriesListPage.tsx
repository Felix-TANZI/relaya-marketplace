// frontend/src/features/admin/deliveries/DeliveriesListPage.tsx
// Gestion complète des livreurs — admin BelivaY

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Truck, RefreshCw, Search, Plus, Edit2, Trash2,
  CheckCircle, XCircle, Wifi, WifiOff,
  MapPin, Phone, Shield, Star, Package,
  X, Save, AlertTriangle,
  Users,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface AdminCourierFull {
  id:            number;
  user_id:       number;
  username:      string;
  full_name:     string;
  email:         string;
  phone:         string;
  city:          string;
  zones:         string[];
  vehicle_type:  'MOTORBIKE' | 'CAR' | 'BIKE' | 'TRICYCLE' | 'VAN';
  id_card:       string;
  preferred_language?: string;
  gps_permission_granted?:    boolean;
  camera_permission_granted?: boolean;
  is_active:     boolean;
  is_approved:   boolean;
  is_online:     boolean;
  created_at:    string;
  updated_at:    string;
  // Stats
  total_deliveries:   number;
  failed_deliveries:  number;
  active_shipments:   number;
  success_rate:       number;
  total_earnings_xaf: number;
  sos_open:           number;
}

interface SOSAlert {
  id:           number;
  courier_id:   number;
  courier_name: string;
  courier_phone:string;
  status:       'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  message:      string;
  location:     string;
  created_at:   string;
}

interface CourierFormData {
  username:     string;
  email:        string;
  password:     string;
  first_name:   string;
  last_name:    string;
  phone:        string;
  city:         string;
  zones:        string;
  vehicle_type: string;
  id_card:      string;
  is_approved:  boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const VEHICLE_CFG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  MOTORBIKE: { label: 'Moto',     emoji: '🏍️', color: '#F47920', bg: 'rgba(244,121,32,0.12)' },
  CAR:       { label: 'Voiture',  emoji: '🚗', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  BIKE:      { label: 'Vélo',     emoji: '🚲', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  TRICYCLE:  { label: 'Tricycle', emoji: '🛺', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  VAN:       { label: 'Fourgon',  emoji: '🚐', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
};

const CITIES = [
  'Yaoundé', 'Douala', 'Bafoussam', 'Bamenda', 'Garoua',
  'Maroua', 'Ngaoundéré', 'Bertoua', 'Ebolowa', 'Kribi', 'Limbé',
];

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtXaf = (n: number) =>
  `${n.toLocaleString('fr-FR')} FCFA`;

const authH = () => ({
  'Content-Type': 'application/json',
  Authorization:  `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function DeliveriesListPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [couriers,  setCouriers]  = useState<AdminCourierFull[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
  const [loading,   setLoading]   = useState(true);

  // Filtres
  const [search,    setSearch]    = useState('');
  const [fApp,      setFApp]      = useState('');
  const [fAct,      setFAct]      = useState('');
  const [fOnline,   setFOnline]   = useState('');
  const [fVeh,      setFVeh]      = useState('');
  const [fCity,     setFCity]     = useState('');

  // Modals
  const [showForm,    setShowForm]    = useState(false);
  const [editTarget,  setEditTarget]  = useState<AdminCourierFull | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [deleteTarget,setDeleteTarget]= useState<AdminCourierFull | null>(null);
  const [deleting,    setDeleting]    = useState(false);
  const [showSOS,     setShowSOS]     = useState(false);

  // Formulaire
  const emptyForm: CourierFormData = {
    username: '', email: '', password: '', first_name: '', last_name: '',
    phone: '', city: '', zones: '', vehicle_type: 'MOTORBIKE', id_card: '', is_approved: true,
  };
  const [form, setForm] = useState<CourierFormData>(emptyForm);
  const fld = (k: keyof CourierFormData, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  // ─── Chargement ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)  params.append('search',       search);
      if (fApp)    params.append('is_approved',  fApp);
      if (fAct)    params.append('is_active',    fAct);
      if (fOnline) params.append('is_online',    fOnline);
      if (fVeh)    params.append('vehicle_type', fVeh);
      if (fCity)   params.append('city',         fCity);

      const [data, sosData] = await Promise.all([
        http<AdminCourierFull[]>(`/api/auth/admin/couriers/?${params}`, { headers: authH() }),
        http<{ alerts: SOSAlert[] }>('/api/auth/admin/couriers/sos/?status=OPEN', { headers: authH() }),
      ]);
      setCouriers(Array.isArray(data) ? data : []);
      setSosAlerts(sosData?.alerts ?? []);
    } catch {
      toastRef.current('Erreur chargement des livreurs', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, fApp, fAct, fOnline, fVeh, fCity]);

  useEffect(() => { load(); }, [load]);

  // ─── KPIs ────────────────────────────────────────────────────────────────

  const total      = couriers.length;
  const approved   = couriers.filter(c => c.is_approved).length;
  const active     = couriers.filter(c => c.is_active).length;
  const online     = couriers.filter(c => c.is_online).length;
  const avgSuccess = total > 0
    ? Math.round(couriers.reduce((s, c) => s + c.success_rate, 0) / total)
    : 0;
  const totalDeliveries = couriers.reduce((s, c) => s + c.total_deliveries, 0);
  const openSOS    = sosAlerts.length;

  // ─── Toggle champ ────────────────────────────────────────────────────────

  const toggleField = async (c: AdminCourierFull, field: 'is_approved' | 'is_active') => {
    try {
      await http(`/api/auth/admin/couriers/${c.id}/update/`, {
        method: 'PATCH', headers: authH(),
        body: JSON.stringify({ [field]: !c[field] }),
      });
      setCouriers(cs => cs.map(x => x.id === c.id ? { ...x, [field]: !x[field] } : x));
      toastRef.current(`Statut mis à jour.`, 'success');
    } catch {
      toastRef.current('Erreur mise à jour statut.', 'error');
    }
  };

  // ─── Résoudre SOS ────────────────────────────────────────────────────────

  const resolveSOSItem = async (sos: SOSAlert, newStatus: 'ACKNOWLEDGED' | 'RESOLVED') => {
    try {
      await http(`/api/auth/admin/couriers/sos/${sos.id}/`, {
        method: 'PATCH', headers: authH(),
        body: JSON.stringify({ status: newStatus }),
      });
      setSosAlerts(a => a.filter(x => x.id !== sos.id));
      toastRef.current(`Alerte #${sos.id} marquée ${newStatus}.`, 'success');
    } catch {
      toastRef.current('Erreur résolution SOS.', 'error');
    }
  };

  // ─── Ouvrir formulaire ───────────────────────────────────────────────────

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (c: AdminCourierFull) => {
    setEditTarget(c);
    setForm({
      username:    c.username,
      email:       c.email,
      password:    '',
      first_name:  c.full_name.split(' ')[0] ?? '',
      last_name:   c.full_name.split(' ').slice(1).join(' ') ?? '',
      phone:       c.phone,
      city:        c.city,
      zones:       (c.zones ?? []).join(', '),
      vehicle_type:c.vehicle_type,
      id_card:     c.id_card,
      is_approved: c.is_approved,
    });
    setShowForm(true);
  };

  // ─── Submit form ─────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.username || (!editTarget && !form.password) || !form.phone || !form.city) {
      toastRef.current('Remplissez les champs obligatoires (*).', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const zones = form.zones.split(',').map(z => z.trim()).filter(Boolean);

      if (editTarget) {
        const payload: Record<string, unknown> = {
          email: form.email, first_name: form.first_name, last_name: form.last_name,
          phone: form.phone, city: form.city, zones,
          vehicle_type: form.vehicle_type, id_card: form.id_card,
          is_approved: form.is_approved,
        };
        if (form.password) payload.password = form.password;

        await http(`/api/auth/admin/couriers/${editTarget.id}/update/`, {
          method: 'PATCH', headers: authH(), body: JSON.stringify(payload),
        });
        toastRef.current('Livreur mis à jour.', 'success');
      } else {
        await http('/api/auth/admin/couriers/create/', {
          method: 'POST', headers: authH(),
          body: JSON.stringify({
            username: form.username, email: form.email, password: form.password,
            first_name: form.first_name, last_name: form.last_name,
            phone: form.phone, city: form.city, zones,
            vehicle_type: form.vehicle_type, id_card: form.id_card,
            is_approved: form.is_approved,
          }),
        });
        toastRef.current('Livreur créé.', 'success');
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.slice(0, 150) : 'Erreur serveur.';
      toastRef.current(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Suppression ─────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await http(`/api/auth/admin/couriers/${deleteTarget.id}/`, {
        method: 'DELETE', headers: authH(),
      });
      toastRef.current(`Livreur @${deleteTarget.username} supprimé.`, 'success');
      setDeleteTarget(null);
      load();
    } catch {
      toastRef.current('Erreur lors de la suppression.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = search || fApp || fAct || fOnline || fVeh || fCity;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Gestion des Livreurs
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {total} livreur{total !== 1 ? 's' : ''} · {online} en ligne · Taux succès moyen :
            <strong style={{ color: '#10B981', marginLeft: 4 }}>{avgSuccess}%</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {openSOS > 0 && (
            <button onClick={() => setShowSOS(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold animate-pulse"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1.5px solid rgba(239,68,68,0.4)' }}>
              <AlertTriangle size={13} />
              {openSOS} SOS ouverte{openSOS > 1 ? 's' : ''}
            </button>
          )}
          <button onClick={() => load()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: T.red, color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Plus size={14} /> Nouveau livreur
          </button>
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total',       value: total,           accent: T.text,    icon: Users       },
          { label: 'Approuvés',   value: approved,        accent: '#10B981', icon: CheckCircle },
          { label: 'Actifs',      value: active,          accent: '#3B82F6', icon: Shield      },
          { label: 'En ligne',    value: online,          accent: '#F47920', icon: Wifi        },
          { label: 'Livraisons',  value: totalDeliveries, accent: '#8B5CF6', icon: Package     },
          { label: 'Taux succès', value: `${avgSuccess}%`,accent: avgSuccess >= 85 ? '#10B981' : '#F59E0B', icon: Star },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{k.label}</span>
                <Icon size={12} style={{ color: k.accent }} />
              </div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: k.accent, lineHeight: 1 }}>
                {loading ? '—' : k.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Filtres ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Nom, username, téléphone…"
              style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 10, padding: '9px 12px 9px 32px', fontSize: 12.5, outline: 'none' }} />
          </div>
          {[
            { val: fApp,    set: setFApp,    opts: [['', 'Approbation'], ['true', 'Approuvés'], ['false', 'En attente']] },
            { val: fAct,    set: setFAct,    opts: [['', 'Activité'], ['true', 'Actifs'], ['false', 'Inactifs']] },
            { val: fOnline, set: setFOnline, opts: [['', 'Connexion'], ['true', 'En ligne'], ['false', 'Hors ligne']] },
            { val: fVeh,    set: setFVeh,    opts: [['', 'Véhicule'], ...Object.entries(VEHICLE_CFG).map(([k, v]) => [k, `${v.emoji} ${v.label}` as string])] },
            { val: fCity,   set: setFCity,   opts: [['', 'Ville'], ...CITIES.map(c => [c, c])] },
          ].map(({ val, set, opts }, i) => (
            <select key={i} value={val} onChange={e => set(e.target.value)}
              style={{ background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none' }}>
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          {hasFilters && (
            <button onClick={() => { setSearch(''); setFApp(''); setFAct(''); setFOnline(''); setFVeh(''); setFCity(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Tableau livreurs ────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 120px 90px 120px 140px 120px', padding: '10px 20px', borderBottom: `1px solid ${T.border}`, background: T.cardAlt, gap: 12 }}>
          {['Livreur', 'Ville', 'Véhicule', 'Livr.', 'Succès', 'Statuts', 'Actions'].map((h, i) => (
            <span key={i} style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div style={{ width: 34, height: 34, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : couriers.length === 0 ? (
          <div className="flex flex-col items-center py-14 gap-3">
            <Truck size={32} style={{ color: T.muted }} />
            <p style={{ fontSize: 14, color: T.muted }}>Aucun livreur trouvé</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: T.border }}>
            {couriers.map(c => {
              const vc   = VEHICLE_CFG[c.vehicle_type] ?? VEHICLE_CFG.MOTORBIKE;
              const sc   = c.success_rate >= 90 ? '#10B981' : c.success_rate >= 70 ? '#F59E0B' : '#EF4444';
              const hasSOS = c.sos_open > 0;

              return (
                <div key={c.id}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 110px 120px 90px 120px 140px 120px', padding: '12px 20px', gap: 12, alignItems: 'center', borderLeft: hasSOS ? '3px solid #EF4444' : '3px solid transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                  {/* Livreur */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg,${vc.color},${vc.color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff' }}>
                        {(c.full_name[0] || c.username[0] || '?').toUpperCase()}
                      </div>
                      {/* Point vert si en ligne */}
                      <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: c.is_online ? '#10B981' : '#6B7280', border: `1.5px solid ${T.card}` }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.full_name}
                        </p>
                        {hasSOS && (
                          <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                            SOS
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 11, color: T.muted }}>@{c.username}</span>
                        <span style={{ fontSize: 10.5, color: T.muted }}>· {c.phone}</span>
                      </div>
                      <p style={{ fontSize: 10.5, color: T.muted, marginTop: 1 }}>
                        Inscrit le {fmtDate(c.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Ville */}
                  <div>
                    <div className="flex items-center gap-1">
                      <MapPin size={10} style={{ color: T.muted, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, color: T.text }}>{c.city || '—'}</span>
                    </div>
                    {c.zones?.length > 0 && (
                      <p style={{ fontSize: 10, color: T.muted, marginTop: 1 }} className="truncate">
                        {c.zones.slice(0, 2).join(', ')}{c.zones.length > 2 ? '…' : ''}
                      </p>
                    )}
                  </div>

                  {/* Véhicule */}
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: 15 }}>{vc.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: vc.color }}>{vc.label}</span>
                  </div>

                  {/* Livraisons */}
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{c.total_deliveries}</p>
                    {c.active_shipments > 0 && (
                      <p style={{ fontSize: 10, color: '#F47920', fontWeight: 600 }}>{c.active_shipments} en cours</p>
                    )}
                    {c.failed_deliveries > 0 && (
                      <p style={{ fontSize: 10, color: '#EF4444' }}>{c.failed_deliveries} échoué{c.failed_deliveries > 1 ? 'es' : 'e'}</p>
                    )}
                  </div>

                  {/* Taux succès */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: sc }}>{c.success_rate}%</span>
                    </div>
                    <div style={{ height: 5, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${c.success_rate}%`, background: `linear-gradient(90deg,${sc},${sc}aa)`, borderRadius: 3, transition: 'width 0.5s ease' }} />
                    </div>
                    <p style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                      {fmtXaf(c.total_earnings_xaf)}
                    </p>
                  </div>

                  {/* Statuts toggles */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Approuvé */}
                    <button onClick={() => toggleField(c, 'is_approved')}
                      title={c.is_approved ? 'Révoquer l\'approbation' : 'Approuver ce livreur'}
                      style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.is_approved ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)', border: `1px solid ${c.is_approved ? '#10B98140' : '#EF444430'}`, cursor: 'pointer' }}>
                      {c.is_approved ? <CheckCircle size={14} color="#10B981" /> : <XCircle size={14} color="#EF4444" />}
                    </button>
                    {/* Actif */}
                    <button onClick={() => toggleField(c, 'is_active')}
                      title={c.is_active ? 'Désactiver' : 'Activer'}
                      style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.is_active ? 'rgba(59,130,246,0.12)' : T.cardAlt, border: `1px solid ${c.is_active ? '#3B82F630' : T.border}`, cursor: 'pointer' }}>
                      <Shield size={13} color={c.is_active ? '#3B82F6' : T.muted} />
                    </button>
                    {/* En ligne (read-only) */}
                    <div title={c.is_online ? 'En ligne (géré par le livreur)' : 'Hors ligne'}
                      style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.is_online ? 'rgba(16,185,129,0.1)' : T.cardAlt, border: `1px solid ${c.is_online ? '#10B98125' : T.border}` }}>
                      {c.is_online ? <Wifi size={13} color="#10B981" /> : <WifiOff size={13} color={T.muted} />}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(c)}
                      title="Modifier"
                      style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}`, cursor: 'pointer' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = T.text)}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = T.muted)}>
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => setDeleteTarget(c)}
                      title="Supprimer"
                      style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal formulaire (création / édition) ───────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowForm(false)}>
          <div className="rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
              <div>
                <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: T.text }}>
                  {editTarget ? `Modifier @${editTarget.username}` : 'Nouveau livreur'}
                </h2>
                <p style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                  {editTarget ? 'Modifiez les informations du livreur' : 'Créer un compte livreur BelivaY'}
                </p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ color: T.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            {/* Corps */}
            <div className="p-6 space-y-4">

              {/* Section compte */}
              <p style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '.08em' }}>Compte</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>
                    Username <span style={{ color: T.red }}>*</span>
                  </label>
                  <input value={form.username} onChange={e => fld('username', e.target.value)}
                    disabled={!!editTarget} placeholder="jean_livreur"
                    style={{ width: '100%', background: editTarget ? T.border + '40' : T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', opacity: editTarget ? 0.6 : 1 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Email</label>
                  <input type="email" value={form.email} onChange={e => fld('email', e.target.value)}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Prénom</label>
                  <input value={form.first_name} onChange={e => fld('first_name', e.target.value)}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Nom</label>
                  <input value={form.last_name} onChange={e => fld('last_name', e.target.value)}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>
                  {editTarget ? 'Nouveau mot de passe (vide = inchangé)' : <>Mot de passe <span style={{ color: T.red }}>*</span></>}
                </label>
                <input type="password" value={form.password} onChange={e => fld('password', e.target.value)}
                  placeholder={editTarget ? 'Laisser vide pour conserver' : 'Mot de passe'}
                  style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
              </div>

              {/* Section livraison */}
              <p style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 8 }}>Livraison</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>
                    Téléphone <span style={{ color: T.red }}>*</span>
                  </label>
                  <input value={form.phone} onChange={e => fld('phone', e.target.value)}
                    placeholder="+237 6XX XXX XXX"
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>
                    Ville <span style={{ color: T.red }}>*</span>
                  </label>
                  <select value={form.city} onChange={e => fld('city', e.target.value)}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}>
                    <option value="">-- Choisir --</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>
                  Zones <span style={{ fontSize: 10.5, color: T.muted }}>(virgule-séparées)</span>
                </label>
                <input value={form.zones} onChange={e => fld('zones', e.target.value)}
                  placeholder="Bastos, Melen, Nlongkak, Centre-ville"
                  style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Type de véhicule</label>
                  <select value={form.vehicle_type} onChange={e => fld('vehicle_type', e.target.value)}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}>
                    {Object.entries(VEHICLE_CFG).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>N° CNI / pièce d'identité</label>
                  <input value={form.id_card} onChange={e => fld('id_card', e.target.value)}
                    placeholder="CNI-1234567890"
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
              </div>

              {/* Approbation */}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}>
                <input type="checkbox" id="chk_approved" checked={form.is_approved}
                  onChange={e => fld('is_approved', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: T.red, cursor: 'pointer' }} />
                <label htmlFor="chk_approved" style={{ fontSize: 13, color: T.text, cursor: 'pointer' }}>
                  Approuver immédiatement — le livreur peut recevoir des livraisons
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: `1px solid ${T.border}` }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: T.red, color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {submitting ? 'Sauvegarde…' : editTarget ? 'Mettre à jour' : 'Créer le livreur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal suppression ───────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setDeleteTarget(null)}>
          <div className="rounded-2xl p-6 w-full max-w-sm"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <Trash2 size={20} style={{ color: '#EF4444' }} />
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: T.text }}>
                Supprimer ce livreur ?
              </h3>
            </div>
            <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.6, marginBottom: 8 }}>
              Le compte <strong style={{ color: T.text }}>@{deleteTarget.username}</strong> et toutes ses données seront définitivement supprimés.
            </p>
            {deleteTarget.total_deliveries > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg mb-4"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <AlertTriangle size={13} color="#F59E0B" />
                <p style={{ fontSize: 12, color: '#F59E0B' }}>
                  Ce livreur a {deleteTarget.total_deliveries} livraison{deleteTarget.total_deliveries > 1 ? 's' : ''} dans l'historique.
                </p>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#EF4444', color: '#fff', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {deleting ? 'Suppression…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal SOS ───────────────────────────────────────────────────── */}
      {showSOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowSOS(false)}>
          <div className="rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
            style={{ background: T.card, border: '2px solid rgba(239,68,68,0.4)' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${T.border}`, background: 'rgba(239,68,68,0.06)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.2)' }}>
                  <AlertTriangle size={16} color="#EF4444" />
                </div>
                <div>
                  <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: T.text }}>
                    Alertes SOS Actives
                  </h2>
                  <p style={{ fontSize: 12, color: '#EF4444' }}>{sosAlerts.length} alerte{sosAlerts.length > 1 ? 's' : ''} non traitée{sosAlerts.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => setShowSOS(false)} style={{ color: T.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            {/* Liste alertes */}
            <div className="divide-y p-4 space-y-3" style={{ borderColor: T.border }}>
              {sosAlerts.length === 0 ? (
                <p style={{ fontSize: 13, color: T.muted, textAlign: 'center', padding: '16px 0' }}>
                  Aucune alerte SOS ouverte.
                </p>
              ) : sosAlerts.map(sos => (
                <div key={sos.id} className="rounded-xl p-4"
                  style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#EF4444' }}>SOS #{sos.id}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>OPEN</span>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{sos.courier_name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span style={{ fontSize: 11.5, color: T.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={10} /> {sos.courier_phone}
                        </span>
                        {sos.location && (
                          <span style={{ fontSize: 11.5, color: T.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={10} /> {sos.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>
                      {new Date(sos.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {sos.message && (
                    <p style={{ fontSize: 12.5, color: T.text, padding: '8px 10px', borderRadius: 8, background: T.cardAlt, marginBottom: 12, lineHeight: 1.5 }}>
                      "{sos.message}"
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <button onClick={() => resolveSOSItem(sos, 'ACKNOWLEDGED')}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer' }}>
                      Prise en charge
                    </button>
                    <button onClick={() => resolveSOSItem(sos, 'RESOLVED')}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer' }}>
                      Résoudre
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}