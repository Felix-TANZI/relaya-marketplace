import { useEffect, useMemo, useState } from 'react';
import { Bike, CheckCircle2, Edit3, LoaderCircle, MapPin, RefreshCw, Search, Trash2, Truck, X } from 'lucide-react';
import { adminApi, type AdminCourier, type UpdateCourierPayload } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';

const vehicleLabels: Record<AdminCourier['vehicle_type'], string> = {
  MOTORBIKE: 'Moto',
  CAR: 'Voiture',
  BIKE: 'Velo',
  TRICYCLE: 'Tricycle',
  VAN: 'Camionnette',
};

function toEditForm(courier: AdminCourier): Required<Pick<UpdateCourierPayload, 'phone' | 'city' | 'zones' | 'vehicle_type' | 'id_card' | 'is_active' | 'is_approved' | 'is_online'>> {
  return {
    phone: courier.phone,
    city: courier.city,
    zones: courier.zones,
    vehicle_type: courier.vehicle_type,
    id_card: courier.id_card,
    is_active: courier.is_active,
    is_approved: courier.is_approved,
    is_online: courier.is_online,
  };
}

export default function DeliveriesListPage() {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const [couriers, setCouriers] = useState<AdminCourier[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ReturnType<typeof toEditForm> | null>(null);

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

  const startEdit = (courier: AdminCourier) => {
    setEditingId(courier.id);
    setEditForm(toEditForm(courier));
  };

  const updateField = <K extends keyof NonNullable<typeof editForm>>(key: K, value: NonNullable<typeof editForm>[K]) => {
    setEditForm((current) => current ? { ...current, [key]: value } : current);
  };

  const saveCourier = async (courier: AdminCourier) => {
    if (!editForm) return;
    setSavingId(courier.id);
    try {
      const updated = await adminApi.updateCourier(courier.id, editForm);
      setCouriers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditingId(null);
      setEditForm(null);
      showToast('Livreur mis a jour', 'success');
    } catch {
      showToast('Modification du livreur impossible', 'error');
    } finally {
      setSavingId(null);
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
            Tous les livreurs
          </h1>
          <p style={{ color: T.muted, fontSize: 13 }}>
            Liste, modification et suppression des comptes livreurs.
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
          ) : filtered.map((courier) => {
            const editing = editingId === courier.id && editForm;
            return (
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
                    <button type="button" onClick={() => startEdit(courier)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ color: T.text, background: T.card, border: `1px solid ${T.border}` }} aria-label="Modifier">
                      <Edit3 size={14} />
                    </button>
                    <button type="button" onClick={() => deleteCourier(courier)} disabled={deletingId === courier.id} className="inline-flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-50" style={{ color: T.red, background: `${T.red}14`, border: `1px solid ${T.red}30` }} aria-label="Supprimer">
                      {deletingId === courier.id ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>

                {editing ? (
                  <div className="mt-4 grid gap-3">
                    {[
                      ['phone', 'Telephone'],
                      ['city', 'Ville'],
                      ['id_card', 'Piece identite'],
                    ].map(([key, label]) => (
                      <label key={key} className="text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: T.muted }}>
                        {label}
                        <input value={String(editForm[key as 'phone' | 'city' | 'id_card'])} onChange={(event) => updateField(key as 'phone' | 'city' | 'id_card', event.target.value)} className="mt-1 w-full rounded-xl px-3 py-2 text-[13px] outline-none" style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }} />
                      </label>
                    ))}
                    <label className="text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: T.muted }}>
                      Vehicule
                      <select value={editForm.vehicle_type} onChange={(event) => updateField('vehicle_type', event.target.value as AdminCourier['vehicle_type'])} className="mt-1 w-full rounded-xl px-3 py-2 text-[13px] outline-none" style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}>
                        {Object.entries(vehicleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label className="text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: T.muted }}>
                      Zones
                      <input value={editForm.zones.join(', ')} onChange={(event) => updateField('zones', event.target.value.split(',').map((zone) => zone.trim()).filter(Boolean))} className="mt-1 w-full rounded-xl px-3 py-2 text-[13px] outline-none" style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }} />
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ['is_active', 'Actif'],
                        ['is_approved', 'Approuve'],
                        ['is_online', 'En ligne'],
                      ].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold" style={{ color: T.text, background: T.card, border: `1px solid ${T.border}` }}>
                          <input type="checkbox" checked={Boolean(editForm[key as 'is_active' | 'is_approved' | 'is_online'])} onChange={(event) => updateField(key as 'is_active' | 'is_approved' | 'is_online', event.target.checked)} />
                          {label}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => saveCourier(courier)} disabled={savingId === courier.id} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold text-white disabled:opacity-60" style={{ background: T.red }}>
                        {savingId === courier.id ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Enregistrer
                      </button>
                      <button type="button" onClick={() => { setEditingId(null); setEditForm(null); }} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold" style={{ color: T.text, background: T.card, border: `1px solid ${T.border}` }}>
                        <X size={14} /> Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 flex items-center gap-2 text-[12px]" style={{ color: T.muted }}>
                      <Truck size={13} /> {vehicleLabels[courier.vehicle_type]}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {courier.zones.map((zone) => (
                        <span key={zone} className="rounded-full px-2 py-1 text-[10px] font-bold" style={{ color: T.red, background: `${T.red}14` }}>{zone}</span>
                      ))}
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
