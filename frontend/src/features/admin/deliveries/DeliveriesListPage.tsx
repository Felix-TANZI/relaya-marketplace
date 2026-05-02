import { useEffect, useMemo, useState } from 'react';
import { Bike, CheckCircle2, LoaderCircle, MapPin, Plus, RefreshCw, Search, Trash2, Truck } from 'lucide-react';
import { adminApi, type AdminCourier, type CreateCourierPayload } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';

const initialForm: CreateCourierPayload = {
  username: '',
  email: '',
  password: 'Livreur123!',
  first_name: '',
  last_name: '',
  phone: '',
  city: 'Douala',
  zones: ['Akwa', 'Bonapriso'],
  vehicle_type: 'MOTORBIKE',
  id_card: '',
};

const vehicleLabels: Record<AdminCourier['vehicle_type'], string> = {
  MOTORBIKE: 'Moto',
  CAR: 'Voiture',
  BIKE: 'Velo',
  TRICYCLE: 'Tricycle',
  VAN: 'Camionnette',
};

export default function DeliveriesListPage() {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const [couriers, setCouriers] = useState<AdminCourier[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<CreateCourierPayload>(initialForm);

  const loadCouriers = async () => {
    setLoading(true);
    try {
      setCouriers(await adminApi.listCouriers());
    } catch {
      showToast('Impossible de charger les livreurs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCouriers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return couriers;
    return couriers.filter((courier) =>
      [courier.phone, courier.city, courier.vehicle_type, courier.zones.join(' ')]
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }, [couriers, query]);

  const updateForm = <K extends keyof CreateCourierPayload>(key: K, value: CreateCourierPayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const createCourier = async () => {
    setCreating(true);
    try {
      await adminApi.createCourier(form);
      showToast('Livreur cree et approuve', 'success');
      setForm(initialForm);
      await loadCouriers();
    } catch {
      showToast('Creation du livreur impossible', 'error');
    } finally {
      setCreating(false);
    }
  };

  const deleteCourier = async (courier: AdminCourier) => {
    const confirmed = window.confirm(`Supprimer le livreur ${courier.phone} ? Cette action supprimera aussi son compte.`);
    if (!confirmed) return;

    setDeletingId(courier.id);
    try {
      await adminApi.deleteCourier(courier.id);
      setCouriers((current) => current.filter((item) => item.id !== courier.id));
      showToast('Livreur supprime', 'success');
    } catch {
      showToast('Suppression du livreur impossible', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: T.text }}>
            Livreurs
          </h1>
          <p style={{ color: T.muted, fontSize: 13 }}>
            Creation, activation et suivi des comptes livreurs.
          </p>
        </div>
        <button
          type="button"
          onClick={loadCouriers}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      <section className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="mb-4 flex items-center gap-2" style={{ color: T.text, fontWeight: 800 }}>
          <Plus size={16} style={{ color: T.red }} />
          Creer un livreur
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['username', 'Nom utilisateur'],
            ['email', 'Email'],
            ['password', 'Mot de passe'],
            ['first_name', 'Prenom'],
            ['last_name', 'Nom'],
            ['phone', 'Telephone'],
            ['city', 'Ville'],
            ['id_card', 'Piece identite'],
          ].map(([key, label]) => (
            <label key={key} className="text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: T.muted }}>
              {label}
              <input
                type={key === 'password' ? 'password' : 'text'}
                value={String(form[key as keyof CreateCourierPayload] ?? '')}
                onChange={(event) => updateForm(key as keyof CreateCourierPayload, event.target.value as never)}
                className="mt-1 w-full rounded-xl px-3 py-2 text-[13px] outline-none"
                style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}
              />
            </label>
          ))}
          <label className="text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: T.muted }}>
            Vehicule
            <select
              value={form.vehicle_type}
              onChange={(event) => updateForm('vehicle_type', event.target.value as CreateCourierPayload['vehicle_type'])}
              className="mt-1 w-full rounded-xl px-3 py-2 text-[13px] outline-none"
              style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}
            >
              {Object.entries(vehicleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="md:col-span-2 text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: T.muted }}>
            Zones
            <input
              value={form.zones.join(', ')}
              onChange={(event) => updateForm('zones', event.target.value.split(',').map((zone) => zone.trim()).filter(Boolean))}
              className="mt-1 w-full rounded-xl px-3 py-2 text-[13px] outline-none"
              style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={createCourier}
          disabled={creating}
          className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold text-white"
          style={{ background: T.red, opacity: creating ? 0.7 : 1 }}
        >
          {creating ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Creer et approuver
        </button>
      </section>

      <section className="rounded-2xl" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div style={{ color: T.text, fontWeight: 800 }}>{filtered.length} livreur{filtered.length > 1 ? 's' : ''}</div>
          <div className="relative min-w-[240px]">
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Recherche ville, zone, vehicule..."
              className="w-full rounded-xl py-2 pl-8 pr-3 text-[13px] outline-none"
              style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}
            />
          </div>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div style={{ color: T.muted }}>Chargement...</div>
          ) : filtered.map((courier) => (
            <article key={courier.id} className="rounded-2xl p-4" style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: courier.is_online ? '#10B981' : T.red }}>
                    <Bike size={18} />
                  </div>
                  <div>
                    <div style={{ color: T.text, fontWeight: 800 }}>{courier.phone}</div>
                    <div className="mt-1 flex items-center gap-1 text-[12px]" style={{ color: T.muted }}>
                      <MapPin size={12} /> {courier.city}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full px-2 py-1 text-[10px] font-bold" style={{ color: courier.is_approved ? '#16A34A' : '#F59E0B', background: courier.is_approved ? 'rgba(22,163,74,.12)' : 'rgba(245,158,11,.12)' }}>
                    {courier.is_approved ? 'Approuve' : 'En attente'}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteCourier(courier)}
                    disabled={deletingId === courier.id}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ color: T.red, background: `${T.red}14`, border: `1px solid ${T.red}30` }}
                    title="Supprimer le livreur"
                    aria-label="Supprimer le livreur"
                  >
                    {deletingId === courier.id ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[12px]" style={{ color: T.muted }}>
                <Truck size={13} /> {vehicleLabels[courier.vehicle_type]}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {courier.zones.map((zone) => (
                  <span key={zone} className="rounded-full px-2 py-1 text-[10px] font-bold" style={{ color: T.red, background: `${T.red}14` }}>{zone}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
