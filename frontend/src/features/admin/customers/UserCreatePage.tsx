import { useMemo, useState } from 'react';
import { Bike, CheckCircle2, LoaderCircle, Shield, Store, User, Users } from 'lucide-react';
import { adminApi, type AdminCreateUserPayload, type AdminCreateUserRole, type AdminCourier } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';

const roleConfig: Record<AdminCreateUserRole, { label: string; icon: typeof User; desc: string }> = {
  client: { label: 'Client', icon: User, desc: 'Compte acheteur classique.' },
  vendor: { label: 'Vendeur', icon: Store, desc: 'Compte avec boutique vendeur.' },
  courier: { label: 'Livreur', icon: Bike, desc: 'Compte livreur approuve.' },
  admin: { label: 'Admin', icon: Shield, desc: 'Compte administrateur plateforme.' },
};

const initialForm: AdminCreateUserPayload = {
  role: 'client',
  username: '',
  email: '',
  password: 'Belivay123!',
  first_name: '',
  last_name: '',
  phone: '',
  city: 'Douala',
  business_name: '',
  business_description: '',
  address: '',
  id_document: '',
  vendor_status: 'APPROVED',
  zones: ['Akwa', 'Bonapriso'],
  vehicle_type: 'MOTORBIKE',
  id_card: '',
  is_approved: true,
  is_superuser: true,
};

const vehicleLabels: Record<AdminCourier['vehicle_type'], string> = {
  MOTORBIKE: 'Moto',
  CAR: 'Voiture',
  BIKE: 'Velo',
  TRICYCLE: 'Tricycle',
  VAN: 'Camionnette',
};

export default function UserCreatePage() {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const [form, setForm] = useState<AdminCreateUserPayload>(initialForm);
  const [creating, setCreating] = useState(false);

  const activeRole = roleConfig[form.role];
  const roleFields = useMemo(() => ({
    vendor: form.role === 'vendor',
    courier: form.role === 'courier',
    admin: form.role === 'admin',
    needsPhone: form.role === 'vendor' || form.role === 'courier',
  }), [form.role]);

  const update = <K extends keyof AdminCreateUserPayload>(key: K, value: AdminCreateUserPayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const create = async () => {
    setCreating(true);
    try {
      await adminApi.createUser(form);
      showToast('Utilisateur cree', 'success');
      setForm({ ...initialForm, role: form.role });
    } catch {
      showToast('Creation utilisateur impossible', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: T.text }}>Creer un utilisateur</h1>
        <p style={{ color: T.muted, fontSize: 13 }}>Choisis un role, puis remplis les champs adaptes.</p>
      </div>

      <section className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          {(Object.keys(roleConfig) as AdminCreateUserRole[]).map((role) => {
            const cfg = roleConfig[role];
            const Icon = cfg.icon;
            const active = form.role === role;
            return (
              <button key={role} type="button" onClick={() => update('role', role)} className="rounded-2xl p-4 text-left transition" style={{ background: active ? `${T.red}16` : T.cardAlt, border: `1px solid ${active ? T.red : T.border}` }}>
                <Icon size={20} style={{ color: active ? T.red : T.muted }} />
                <div className="mt-3 font-extrabold" style={{ color: T.text }}>{cfg.label}</div>
                <div className="mt-1 text-[12px]" style={{ color: T.muted }}>{cfg.desc}</div>
              </button>
            );
          })}
        </div>

        <div className="mb-4 flex items-center gap-2 text-[13px] font-bold" style={{ color: T.text }}>
          <Users size={16} style={{ color: T.red }} /> Role selectionne : {activeRole.label}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['username', 'Nom utilisateur', true],
            ['email', 'Email', false],
            ['password', 'Mot de passe', true],
            ['first_name', 'Prenom', false],
            ['last_name', 'Nom', false],
          ].map(([key, label]) => (
            <label key={String(key)} className="text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: T.muted }}>
              {label}{key === 'username' || key === 'password' ? ' *' : ''}
              <input type={key === 'password' ? 'password' : 'text'} value={String(form[key as keyof AdminCreateUserPayload] ?? '')} onChange={(event) => update(key as keyof AdminCreateUserPayload, event.target.value as never)} className="mt-1 w-full rounded-xl px-3 py-2 text-[13px] outline-none" style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }} />
            </label>
          ))}

          {roleFields.needsPhone && (
            <label className="text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: T.muted }}>
              Telephone *
              <input value={form.phone ?? ''} onChange={(event) => update('phone', event.target.value)} className="mt-1 w-full rounded-xl px-3 py-2 text-[13px] outline-none" style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }} />
            </label>
          )}

          {(roleFields.vendor || roleFields.courier) && (
            <label className="text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: T.muted }}>
              Ville
              <input value={form.city ?? ''} onChange={(event) => update('city', event.target.value)} className="mt-1 w-full rounded-xl px-3 py-2 text-[13px] outline-none" style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }} />
            </label>
          )}

          {roleFields.vendor && (
            <>
              <label className="text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: T.muted }}>
                Nom boutique
                <input value={form.business_name ?? ''} onChange={(event) => update('business_name', event.target.value)} className="mt-1 w-full rounded-xl px-3 py-2 text-[13px] outline-none" style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }} />
              </label>
              <label className="text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: T.muted }}>
                Adresse boutique
                <input value={form.address ?? ''} onChange={(event) => update('address', event.target.value)} className="mt-1 w-full rounded-xl px-3 py-2 text-[13px] outline-none" style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }} />
              </label>
              <label className="text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: T.muted }}>
                Document ID
                <input value={form.id_document ?? ''} onChange={(event) => update('id_document', event.target.value)} className="mt-1 w-full rounded-xl px-3 py-2 text-[13px] outline-none" style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }} />
              </label>
              <label className="md:col-span-3 text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: T.muted }}>
                Description boutique
                <textarea value={form.business_description ?? ''} onChange={(event) => update('business_description', event.target.value)} className="mt-1 min-h-[86px] w-full rounded-xl px-3 py-2 text-[13px] outline-none" style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }} />
              </label>
            </>
          )}

          {roleFields.courier && (
            <>
              <label className="text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: T.muted }}>
                Vehicule
                <select value={form.vehicle_type} onChange={(event) => update('vehicle_type', event.target.value as AdminCourier['vehicle_type'])} className="mt-1 w-full rounded-xl px-3 py-2 text-[13px] outline-none" style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}>
                  {Object.entries(vehicleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: T.muted }}>
                Piece identite
                <input value={form.id_card ?? ''} onChange={(event) => update('id_card', event.target.value)} className="mt-1 w-full rounded-xl px-3 py-2 text-[13px] outline-none" style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }} />
              </label>
              <label className="md:col-span-3 text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: T.muted }}>
                Zones
                <input value={(form.zones ?? []).join(', ')} onChange={(event) => update('zones', event.target.value.split(',').map((zone) => zone.trim()).filter(Boolean))} className="mt-1 w-full rounded-xl px-3 py-2 text-[13px] outline-none" style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }} />
              </label>
            </>
          )}

          {roleFields.admin && (
            <label className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold md:col-span-3" style={{ color: T.text, background: T.cardAlt, border: `1px solid ${T.border}` }}>
              <input type="checkbox" checked={Boolean(form.is_superuser)} onChange={(event) => update('is_superuser', event.target.checked)} />
              Super administrateur
            </label>
          )}
        </div>

        <button type="button" onClick={create} disabled={creating} className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold text-white disabled:opacity-60" style={{ background: T.red }}>
          {creating ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Creer l'utilisateur
        </button>
      </section>
    </div>
  );
}
