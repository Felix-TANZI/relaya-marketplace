// frontend/src/features/admin/customers/UserCreatePage.tsx
// Créer un compte utilisateur par rôle — admin BelivaY

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  UserPlus, ChevronLeft, RefreshCw,
  User, Store, Truck, Shield, AlertCircle,
  Eye, EyeOff, Building2, MapPin,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';
import { CAMEROON, detectOperator, formatNational, isValidNationalNumber, toE164, toNationalNumber } from '@/lib/phone';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Role = 'client' | 'vendor' | 'courier' | 'delivery_org' | 'relay_point' | 'admin';

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
  delivery_organization_id: string;
  is_approved:          boolean;
  // Organisation de livraison
  company_name:         string;
  manager_name:         string;
  contract_reference:   string;
  organization_status:  string;
  // Point relais
  relay_point_name:     string;
  relay_code:           string;
  opening_hours:        string;
  storage_capacity:     string;
  relay_status:         string;
  // Admin
  is_superuser:         boolean;
}

interface DeliveryOrganizationOption {
  id: number;
  company_name: string;
  city: string;
  zones: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const ROLES: Array<{ key: Role; labelKey: string; descKey: string; icon: React.ElementType; color: string; gradient: string }> = [
  { key: 'client',  labelKey: 'ad2_user_create.role_client_label',  descKey: 'ad2_user_create.role_client_desc',               icon: User,    color: '#3B82F6', gradient: 'linear-gradient(135deg,#3B82F6,#1D4ED8)' },
  { key: 'vendor',  labelKey: 'ad2_user_create.role_vendor_label',   descKey: 'ad2_user_create.role_vendor_desc',           icon: Store,   color: '#F47920', gradient: 'linear-gradient(135deg,#F47920,#C2590A)' },
  { key: 'courier', labelKey: 'ad2_user_create.role_courier_label',   descKey: 'ad2_user_create.role_courier_desc',     icon: Truck,   color: '#10B981', gradient: 'linear-gradient(135deg,#10B981,#047857)' },
  { key: 'delivery_org', labelKey: 'ad2_user_create.role_delivery_org_label', descKey: 'ad2_user_create.role_delivery_org_desc', icon: Building2, color: '#0891B2', gradient: 'linear-gradient(135deg,#0891B2,#155E75)' },
  { key: 'relay_point', labelKey: 'ad2_user_create.role_relay_point_label', descKey: 'ad2_user_create.role_relay_point_desc', icon: MapPin, color: '#7C3AED', gradient: 'linear-gradient(135deg,#7C3AED,#5B21B6)' },
  { key: 'admin',   labelKey: 'ad2_user_create.role_admin_label',     descKey: 'ad2_user_create.role_admin_desc',      icon: Shield,  color: '#EF4444', gradient: 'linear-gradient(135deg,#EF4444,#B91C1C)' },
];

const CITIES = [
  'Yaoundé', 'Douala', 'Bafoussam', 'Bamenda', 'Garoua',
  'Maroua', 'Ngaoundéré', 'Bertoua', 'Ebolowa', 'Kribi', 'Limbé',
];

const VEHICLES = [
  { key: 'MOTORBIKE', labelKey: 'ad2_user_create.vehicle_motorbike' },
  { key: 'CAR',       labelKey: 'ad2_user_create.vehicle_car'       },
  { key: 'BIKE',      labelKey: 'ad2_user_create.vehicle_bike'      },
  { key: 'TRICYCLE',  labelKey: 'ad2_user_create.vehicle_tricycle'  },
  { key: 'VAN',       labelKey: 'ad2_user_create.vehicle_van'       },
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
  const { t }          = useTranslation();
  const { showToast } = useToast();
  const navigate      = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const [form, setForm] = useState<FormData>({
    role: 'client', username: '', email: '', password: '',
    first_name: '', last_name: '', phone: '', city: '',
    business_name: '', business_description: '', address: '', id_document: '',
    vendor_status: 'APPROVED',
    zones: '', vehicle_type: 'MOTORBIKE', id_card: '', delivery_organization_id: '', is_approved: true,
    company_name: '', manager_name: '', contract_reference: '', organization_status: 'APPROVED',
    relay_point_name: '', relay_code: '', opening_hours: '', storage_capacity: '', relay_status: 'APPROVED',
    is_superuser: false,
  });
  const [deliveryOrganizations, setDeliveryOrganizations] = useState<DeliveryOrganizationOption[]>([]);

  const fld = (k: keyof FormData, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const selectedRole = ROLES.find(r => r.key === form.role)!;

  useEffect(() => {
    if (form.role !== 'courier') return;

    let alive = true;
    http<DeliveryOrganizationOption[]>('/api/auth/admin/delivery-organizations/')
      .then((items) => {
        if (alive) setDeliveryOrganizations(items);
      })
      .catch(() => {
        if (alive) setDeliveryOrganizations([]);
      });

    return () => {
      alive = false;
    };
  }, [form.role]);

  const handleSubmit = async () => {
    setError('');
    if (!form.username.trim() || !form.password.trim()) {
      setError(t('ad2_user_create.error_username_password_required'));
      return;
    }
    if ((form.role === 'vendor' || form.role === 'courier' || form.role === 'delivery_org' || form.role === 'relay_point') && !form.phone.trim()) {
      setError(t('ad2_user_create.error_phone_required'));
      return;
    }
    if (form.role === 'delivery_org' && !form.company_name.trim()) {
      setError(t('ad2_user_create.error_org_name_required'));
      return;
    }
    if (form.role === 'courier' && !form.delivery_organization_id) {
      setError(t('ad2_user_create.error_delivery_org_required'));
      return;
    }
    if (form.role === 'relay_point' && !form.relay_point_name.trim()) {
      setError(t('ad2_user_create.error_relay_name_required'));
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
          company_name:         form.company_name.trim(),
          manager_name:         form.manager_name.trim(),
          relay_point_name:     form.relay_point_name.trim(),
          relay_code:           form.relay_code.trim(),
          opening_hours:        form.opening_hours.trim(),
          storage_capacity:     form.storage_capacity.trim(),
          address:              form.address.trim(),
          id_document:          form.id_document.trim(),
          vendor_status:        form.vendor_status,
          contract_reference:   form.contract_reference.trim(),
          organization_status:  form.organization_status,
          relay_status:         form.relay_status,
          zones,
          vehicle_type:         form.vehicle_type,
          id_card:              form.id_card.trim(),
          delivery_organization_id: form.delivery_organization_id,
          is_approved:          form.is_approved,
          is_superuser:         form.is_superuser,
        }),
      });
      toastRef.current(t('ad2_user_create.toast_account_created', { username: form.username }), 'success');
      // Redirection selon le rôle
      if (form.role === 'courier') navigate('/admin/deliveries');
      else if (form.role === 'delivery_org') navigate('/admin/deliveries/organization');
      else if (form.role === 'relay_point') navigate('/admin/deliveries/relay-point');
      else if (form.role === 'vendor') navigate('/admin/vendors');
      else navigate('/admin/customers');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.slice(0, 200) : t('ad2_user_create.error_server');
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
            {t('ad2_user_create.heading')}
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>{t('ad2_user_create.subtitle')}</p>
        </div>
      </div>

      {/* Sélection rôle */}
      <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>{t('ad2_user_create.role_section_title')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {ROLES.map(role => {
            const Icon   = role.icon;
            const active = form.role === role.key;
            return (
              <button key={role.key} onClick={() => fld('role', role.key)}
                style={{ padding: '14px 12px', borderRadius: 14, textAlign: 'left', cursor: 'pointer', background: active ? role.color + '15' : T.cardAlt, border: `2px solid ${active ? role.color + '50' : T.border}`, transition: 'all 0.15s' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: active ? role.gradient : T.border, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Icon size={15} style={{ color: active ? '#fff' : T.muted }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: active ? role.color : T.text, marginBottom: 2 }}>{t(role.labelKey)}</p>
                <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}>{t(role.descKey)}</p>
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
            <p style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t('ad2_user_create.account_info_title')}</p>
            <p style={{ fontSize: 11.5, color: T.muted }}>{t('ad2_user_create.role_line', { role: t(selectedRole.labelKey) })}</p>
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
                {t('ad2_user_create.label_username')} <span style={{ color: T.red }}>*</span>
              </label>
              <input value={form.username} onChange={e => fld('username', e.target.value)}
                placeholder={t('ad2_user_create.placeholder_username')}
                style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_email')}</label>
              <input type="email" value={form.email} onChange={e => fld('email', e.target.value)}
                placeholder={t('ad2_user_create.placeholder_email')}
                style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_first_name')}</label>
              <input value={form.first_name} onChange={e => fld('first_name', e.target.value)}
                style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_last_name')}</label>
              <input value={form.last_name} onChange={e => fld('last_name', e.target.value)}
                style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>
              {t('ad2_user_create.label_password')} <span style={{ color: T.red }}>*</span>
            </label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => fld('password', e.target.value)}
                placeholder={t('ad2_user_create.placeholder_password')}
                style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 40px 9px 12px', fontSize: 13, outline: 'none' }} />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg"
                style={{ color: T.muted }}
                aria-label={showPassword ? t('ad2_user_create.aria_hide_password') : t('ad2_user_create.aria_show_password')}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Champs communs vendeur + livreur + logistique */}
          {(form.role === 'vendor' || form.role === 'courier' || form.role === 'delivery_org' || form.role === 'relay_point') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>
                  {t('ad2_user_create.label_phone')} <span style={{ color: T.red }}>*</span>
                </label>
                {(() => {
                  const national = toNationalNumber(form.phone);
                  const op = detectOperator(national);
                  const valid = national.length === 0 || isValidNationalNumber(national, CAMEROON);
                  return (
                    <>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 3, fontSize: 12.5, fontWeight: 700, color: T.muted, pointerEvents: 'none' }}>
                          <span style={{ fontSize: 14, lineHeight: 1 }}>{CAMEROON.flag}</span>+237
                        </span>
                        <input value={formatNational(national)} onChange={e => fld('phone', toE164(toNationalNumber(e.target.value)))}
                          type="tel" inputMode="tel" placeholder="6XX XX XX XX"
                          style={{ width: '100%', background: T.input, border: `1px solid ${valid ? T.inputBorder : T.red}`, color: T.text, borderRadius: 8, padding: '9px 12px 9px 68px', fontSize: 13, outline: 'none' }} />
                        {op && valid && (
                          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10.5, fontWeight: 700, color: T.muted, pointerEvents: 'none' }}>{op.name}</span>
                        )}
                      </div>
                      {!valid && (
                        <span style={{ fontSize: 10.5, color: T.red, display: 'block', marginTop: 3 }}>{t('ad2_user_create.phone_invalid')}</span>
                      )}
                    </>
                  );
                })()}
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_city')}</label>
                <select value={form.city} onChange={e => fld('city', e.target.value)}
                  style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}>
                  <option value="">{t('ad2_user_create.select_city_placeholder')}</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Champs spécifiques POINT RELAIS */}
          {form.role === 'relay_point' && (
            <>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>
                  {t('ad2_user_create.label_relay_name')} <span style={{ color: T.red }}>*</span>
                </label>
                <input value={form.relay_point_name} onChange={e => fld('relay_point_name', e.target.value)}
                  placeholder={t('ad2_user_create.placeholder_relay_name')}
                  style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_relay_manager')}</label>
                  <input value={form.manager_name} onChange={e => fld('manager_name', e.target.value)}
                    placeholder={t('ad2_user_create.placeholder_manager_name')}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_relay_code')}</label>
                  <input value={form.relay_code} onChange={e => fld('relay_code', e.target.value)}
                    placeholder={t('ad2_user_create.placeholder_relay_code')}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>
                  {t('ad2_user_create.label_zones_served')} <span style={{ fontSize: 10.5, color: T.muted }}>{t('ad2_user_create.comma_separated')}</span>
                </label>
                <input value={form.zones} onChange={e => fld('zones', e.target.value)}
                  placeholder={t('ad2_user_create.placeholder_relay_zones')}
                  style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_relay_address')}</label>
                  <input value={form.address} onChange={e => fld('address', e.target.value)}
                    placeholder={t('ad2_user_create.placeholder_relay_address')}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_opening_hours')}</label>
                  <input value={form.opening_hours} onChange={e => fld('opening_hours', e.target.value)}
                    placeholder={t('ad2_user_create.placeholder_opening_hours')}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_storage_capacity')}</label>
                  <input type="number" min="0" value={form.storage_capacity} onChange={e => fld('storage_capacity', e.target.value)}
                    placeholder={t('ad2_user_create.placeholder_storage_capacity')}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_relay_status')}</label>
                  <select value={form.relay_status} onChange={e => fld('relay_status', e.target.value)}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}>
                    <option value="APPROVED">{t('ad2_user_create.status_approved')}</option>
                    <option value="PENDING">{t('ad2_user_create.status_pending')}</option>
                    <option value="SUSPENDED">{t('ad2_user_create.status_suspended')}</option>
                  </select>
                </div>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <p style={{ fontSize: 12.5, color: T.text, lineHeight: 1.6 }}>
                  {t('ad2_user_create.relay_info_box')}
                </p>
              </div>
            </>
          )}

          {/* Champs spécifiques ORGANISATION DE LIVRAISON */}
          {form.role === 'delivery_org' && (
            <>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>
                  {t('ad2_user_create.label_org_name')} <span style={{ color: T.red }}>*</span>
                </label>
                <input value={form.company_name} onChange={e => fld('company_name', e.target.value)}
                  placeholder={t('ad2_user_create.placeholder_org_name')}
                  style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_org_manager')}</label>
                  <input value={form.manager_name} onChange={e => fld('manager_name', e.target.value)}
                    placeholder={t('ad2_user_create.placeholder_manager_name')}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_contract_ref')}</label>
                  <input value={form.contract_reference} onChange={e => fld('contract_reference', e.target.value)}
                    placeholder={t('ad2_user_create.placeholder_contract_ref')}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>
                  {t('ad2_user_create.label_zones_covered')} <span style={{ fontSize: 10.5, color: T.muted }}>{t('ad2_user_create.comma_separated')}</span>
                </label>
                <input value={form.zones} onChange={e => fld('zones', e.target.value)}
                  placeholder={t('ad2_user_create.placeholder_org_zones')}
                  style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_org_address')}</label>
                  <input value={form.address} onChange={e => fld('address', e.target.value)}
                    placeholder={t('ad2_user_create.placeholder_org_address')}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_org_status')}</label>
                  <select value={form.organization_status} onChange={e => fld('organization_status', e.target.value)}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}>
                    <option value="APPROVED">{t('ad2_user_create.org_status_approved')}</option>
                    <option value="PENDING">{t('ad2_user_create.org_status_pending')}</option>
                    <option value="SUSPENDED">{t('ad2_user_create.org_status_suspended')}</option>
                  </select>
                </div>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.25)' }}>
                <p style={{ fontSize: 12.5, color: T.text, lineHeight: 1.6 }}>
                  {t('ad2_user_create.org_info_box')}
                </p>
              </div>
            </>
          )}

          {/* Champs spécifiques VENDEUR */}
          {form.role === 'vendor' && (
            <>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_shop_name')}</label>
                <input value={form.business_name} onChange={e => fld('business_name', e.target.value)}
                  placeholder={t('ad2_user_create.placeholder_shop_name')}
                  style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_description')}</label>
                <textarea value={form.business_description} onChange={e => fld('business_description', e.target.value)}
                  rows={2} placeholder={t('ad2_user_create.placeholder_description')}
                  style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', resize: 'vertical' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_address')}</label>
                  <input value={form.address} onChange={e => fld('address', e.target.value)}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_shop_status')}</label>
                  <select value={form.vendor_status} onChange={e => fld('vendor_status', e.target.value)}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}>
                    <option value="APPROVED">{t('ad2_user_create.shop_status_approved')}</option>
                    <option value="PENDING">{t('ad2_user_create.shop_status_pending')}</option>
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
                  {t('ad2_user_create.label_delivery_org')} <span style={{ color: T.red }}>*</span>
                </label>
                <select value={form.delivery_organization_id} onChange={e => fld('delivery_organization_id', e.target.value)}
                  style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}>
                  <option value="">{t('ad2_user_create.select_org_placeholder')}</option>
                  {deliveryOrganizations.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.company_name}{org.city ? ` · ${org.city}` : ''}
                    </option>
                  ))}
                </select>
                {deliveryOrganizations.length === 0 && (
                  <p style={{ marginTop: 6, fontSize: 11.5, color: T.muted }}>
                    {t('ad2_user_create.no_delivery_org_hint')}
                  </p>
                )}
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>
                  {t('ad2_user_create.label_zones')} <span style={{ fontSize: 10.5, color: T.muted }}>{t('ad2_user_create.comma_separated')}</span>
                </label>
                <input value={form.zones} onChange={e => fld('zones', e.target.value)}
                  placeholder={t('ad2_user_create.placeholder_courier_zones')}
                  style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_vehicle')}</label>
                  <select value={form.vehicle_type} onChange={e => fld('vehicle_type', e.target.value)}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}>
                    {VEHICLES.map(v => <option key={v.key} value={v.key}>{t(v.labelKey)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{t('ad2_user_create.label_id_card')}</label>
                  <input value={form.id_card} onChange={e => fld('id_card', e.target.value)}
                    placeholder={t('ad2_user_create.placeholder_id_card')}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}>
                <input type="checkbox" id="is_approved" checked={form.is_approved}
                  onChange={e => fld('is_approved', e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: T.red, cursor: 'pointer' }} />
                <label htmlFor="is_approved" style={{ fontSize: 13, color: T.text, cursor: 'pointer' }}>
                  {t('ad2_user_create.checkbox_approve_immediately')}
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
                {t('ad2_user_create.checkbox_superuser')}
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: `1px solid ${T.border}` }}>
          <button onClick={() => navigate(-1)}
            style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
            {t('ad2_user_create.btn_cancel')}
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: selectedRole.gradient, color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? <RefreshCw size={13} className="animate-spin" /> : <UserPlus size={13} />}
            {submitting ? t('ad2_user_create.btn_creating') : t('ad2_user_create.btn_create', { role: t(selectedRole.labelKey).toLowerCase() })}
          </button>
        </div>
      </div>
    </div>
  );
}
