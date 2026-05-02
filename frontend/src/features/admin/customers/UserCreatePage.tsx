// frontend/src/features/admin/customers/UserCreatePage.tsx
// Créer un compte utilisateur par rôle — admin BelivaY

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, ChevronLeft, RefreshCw,
  User, Store, Truck, Shield, AlertCircle,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Role = 'client' | 'vendor' | 'courier' | 'admin';

interface FormData {
  role:                 Role;
  username:             string;
  email:                string;
  password:             string;
  first_name:           string;
  last_name:            string;
  phone:                string;
  city:                 string;
  // Vendeur
  business_name:        string;
  business_description: string;
  address:              string;
  id_document:          string;
  vendor_status:        string;
  // Livreur
  zones:                string;
  vehicle_type:         string;
  id_card:              string;
  is_approved:          boolean;
  // Admin
  is_superuser:         boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const ROLES: Array<{ key: Role; label: string; desc: string; icon: React.ElementType; color: string; gradient: string }> = [
  { key: 'client',  label: 'Acheteur',  desc: 'Compte client standard',               icon: User,    color: '#3B82F6', gradient: 'linear-gradient(135deg,#3B82F6,#1D4ED8)' },
  { key: 'vendor',  label: 'Vendeur',   desc: 'Espace boutique sur BelivaY',           icon: Store,   color: '#F47920', gradient: 'linear-gradient(135deg,#F47920,#C2590A)' },
  { key: 'courier', label: 'Livreur',   desc: 'Compte livreur avec accès terrain',     icon: Truck,   color: '#10B981', gradient: 'linear-gradient(135deg,#10B981,#047857)' },
  { key: 'admin',   label: 'Admin',     desc: 'Accès interface d\'administration',      icon: Shield,  color: '#EF4444', gradient: 'linear-gradient(135deg,#EF4444,#B91C1C)' },
];

const CITIES = [
  'Yaoundé', 'Douala', 'Bafoussam', 'Bamenda', 'Garoua',
  'Maroua', 'Ngaoundéré', 'Bertoua', 'Ebolowa', 'Kribi', 'Limbé',
];

const VEHICLES = [
  { key: 'MOTORBIKE', label: '🏍️ Moto'     },
  { key: 'CAR',       label: '🚗 Voiture'   },
  { key: 'BIKE',      label: '🚲 Vélo'      },
  { key: 'TRICYCLE',  label: '🛺 Tricycle'  },
  { key: 'VAN',       label: '🚐 Fourgon'   },
];

const authH = () => ({
  'Content-Type': 'application/json',
  Authorization:  `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function UserCreatePage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const navigate      = useNavigate();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const [form, setForm] = useState<FormData>({
    role: 'client', username: '', email: '', password: '',
    first_name: '', last_name: '', phone: '', city: '',
    business_name: '', business_description: '', address: '', id_document: '',
    vendor_status: 'APPROVED',
    zones: '', vehicle_type: 'MOTORBIKE', id_card: '', is_approved: true,
    is_superuser: false,
  });

  const fld = (k: keyof FormData, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const selectedRole = ROLES.find(r => r.key === form.role)!;

  const handleSubmit = async () => {
    setError('');
    if (!form.username.trim() || !form.password.trim()) {
      setError('Username et mot de passe sont obligatoires.');
      return;
    }
    if ((form.role === 'vendor' || form.role === 'courier') && !form.phone.trim()) {
      setError('Le téléphone est obligatoire pour ce rôle.');
      return;
    }

    setSubmitting(true);
    try {
      const zones = form.zones.split(',').map(z => z.trim()).filter(Boolean);
      await http('/api/auth/admin/users/create/', {
        method: 'POST', headers: authH(),
        body: JSON.stringify({
          role:                 form.role,
          username:             form.username.trim(),
          email:                form.email.trim(),
          password:             form.password,
          first_name:           form.first_name.trim(),
          last_name:            form.last_name.trim(),
          phone:                form.phone.trim(),
          city:                 form.city,
          business_name:        form.business_name.trim(),
          business_description: form.business_description.trim(),
          address:              form.address.trim(),
          id_document:          form.id_document.trim(),
          vendor_status:        form.vendor_status,
          zones,
          vehicle_type:         form.vehicle_type,
          id_card:              form.id_card.trim(),
          is_approved:          form.is_approved,
          is_superuser:         form.is_superuser,
        }),
      });
      toastRef.current(`Compte @${form.username} créé avec succès.`, 'success');
      // Redirection selon le rôle
      if (form.role === 'courier') navigate('/admin/deliveries');
      else if (form.role === 'vendor') navigate('/admin/vendors');
      else navigate('/admin/customers');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.slice(0, 200) : 'Erreur serveur.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-2xl">

      {/* En-tête */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
          <ChevronLeft size={14} />
        </button>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text }}>
            Créer un compte
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>Ajouter un utilisateur manuellement à BelivaY</p>
        </div>
      </div>

      {/* Sélection rôle */}
      <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>Rôle du compte</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ROLES.map(role => {
            const Icon   = role.icon;
            const active = form.role === role.key;
            return (
              <button key={role.key} onClick={() => fld('role', role.key)}
                style={{ padding: '14px 12px', borderRadius: 14, textAlign: 'left', cursor: 'pointer', background: active ? role.color + '15' : T.cardAlt, border: `2px solid ${active ? role.color + '50' : T.border}`, transition: 'all 0.15s' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: active ? role.gradient : T.border, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Icon size={15} style={{ color: active ? '#fff' : T.muted }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: active ? role.color : T.text, marginBottom: 2 }}>{role.label}</p>
                <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}>{role.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Formulaire */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>

        {/* Header section compte */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, background: T.cardAlt, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: selectedRole.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <selectedRole.icon size={14} style={{ color: '#fff' }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Informations du compte</p>
            <p style={{ fontSize: 11.5, color: T.muted }}>Rôle : {selectedRole.label}</p>
          </div>
        </div>

        <div className="p-6 space-y-4">

          {/* Erreur */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertCircle size={14} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: '#EF4444' }}>{error}</p>
            </div>
          )}

          {/* Identifiants */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>
                Username <span style={{ color: T.red }}>*</span>
              </label>
              <input value={form.username} onChange={e => fld('username', e.target.value)}
                placeholder="ex: jean_dupont"
                style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Email</label>
              <input type="email" value={form.email} onChange={e => fld('email', e.target.value)}
                placeholder="email@example.com"
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
              Mot de passe <span style={{ color: T.red }}>*</span>
            </label>
            <input type="password" value={form.password} onChange={e => fld('password', e.target.value)}
              placeholder="Mot de passe initial"
              style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
          </div>

          {/* Champs communs vendeur + livreur */}
          {(form.role === 'vendor' || form.role === 'courier') && (
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
                <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Ville</label>
                <select value={form.city} onChange={e => fld('city', e.target.value)}
                  style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}>
                  <option value="">-- Choisir --</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Champs spécifiques VENDEUR */}
          {form.role === 'vendor' && (
            <>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Nom de la boutique</label>
                <input value={form.business_name} onChange={e => fld('business_name', e.target.value)}
                  placeholder="Ex: Boutique Mode Cameroun"
                  style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Description</label>
                <textarea value={form.business_description} onChange={e => fld('business_description', e.target.value)}
                  rows={2} placeholder="Description de l'activité"
                  style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', resize: 'vertical' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Adresse</label>
                  <input value={form.address} onChange={e => fld('address', e.target.value)}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Statut boutique</label>
                  <select value={form.vendor_status} onChange={e => fld('vendor_status', e.target.value)}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}>
                    <option value="APPROVED">Approuvée</option>
                    <option value="PENDING">En attente</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Champs spécifiques LIVREUR */}
          {form.role === 'courier' && (
            <>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>
                  Zones <span style={{ fontSize: 10.5, color: T.muted }}>(virgule-séparées)</span>
                </label>
                <input value={form.zones} onChange={e => fld('zones', e.target.value)}
                  placeholder="Bastos, Melen, Centre-ville"
                  style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Véhicule</label>
                  <select value={form.vehicle_type} onChange={e => fld('vehicle_type', e.target.value)}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}>
                    {VEHICLES.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>N° CNI</label>
                  <input value={form.id_card} onChange={e => fld('id_card', e.target.value)}
                    placeholder="CNI-XXXXXXXXXX"
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}>
                <input type="checkbox" id="is_approved" checked={form.is_approved}
                  onChange={e => fld('is_approved', e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: T.red, cursor: 'pointer' }} />
                <label htmlFor="is_approved" style={{ fontSize: 13, color: T.text, cursor: 'pointer' }}>
                  Approuver immédiatement (peut recevoir des livraisons)
                </label>
              </div>
            </>
          )}

          {/* Champs spécifiques ADMIN */}
          {form.role === 'admin' && (
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <input type="checkbox" id="is_superuser" checked={form.is_superuser}
                onChange={e => fld('is_superuser', e.target.checked)}
                style={{ width: 15, height: 15, accentColor: T.red, cursor: 'pointer' }} />
              <label htmlFor="is_superuser" style={{ fontSize: 13, color: T.text, cursor: 'pointer' }}>
                Super administrateur — accès complet sans restrictions
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: `1px solid ${T.border}` }}>
          <button onClick={() => navigate(-1)}
            style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: selectedRole.gradient, color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? <RefreshCw size={13} className="animate-spin" /> : <UserPlus size={13} />}
            {submitting ? 'Création…' : `Créer le ${selectedRole.label.toLowerCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}