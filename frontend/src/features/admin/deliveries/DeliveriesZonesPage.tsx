import { useEffect, useMemo, useState } from 'react';
import { Bike, MapPin, RefreshCw } from 'lucide-react';
import { adminApi, type AdminCourier } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';

const CITY_POSITIONS: Record<string, { x: number; y: number }> = {
  douala: { x: 36, y: 68 },
  yaounde: { x: 55, y: 58 },
  yaoundé: { x: 55, y: 58 },
  bafoussam: { x: 41, y: 43 },
  garoua: { x: 62, y: 22 },
  maroua: { x: 71, y: 11 },
  bamenda: { x: 34, y: 35 },
  bertoua: { x: 72, y: 54 },
};

function positionFor(city: string, index: number) {
  const base = CITY_POSITIONS[city.trim().toLowerCase()] ?? { x: 50, y: 52 };
  const offset = (index % 5) - 2;
  return { x: base.x + offset * 2.3, y: base.y + offset * 1.6 };
}

export default function DeliveriesZonesPage() {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const [couriers, setCouriers] = useState<AdminCourier[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setCouriers(await adminApi.listCouriers());
    } catch {
      showToast('Carte livreurs indisponible', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markers = useMemo(
    () => couriers.map((courier, index) => ({ courier, ...positionFor(courier.city, index) })),
    [couriers],
  );

  const online = couriers.filter((courier) => courier.is_online).length;
  const approved = couriers.filter((courier) => courier.is_approved).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: T.text }}>
            Carte des livreurs
          </h1>
          <p style={{ color: T.muted, fontSize: 13 }}>
            Vue operationnelle des livreurs par ville et zone de couverture.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          ['Livreurs', couriers.length, T.red],
          ['Approuves', approved, '#16A34A'],
          ['En ligne', online, '#10B981'],
        ].map(([label, value, accent]) => (
          <div key={label} className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="text-[11px] font-bold uppercase tracking-[.08em]" style={{ color: T.muted }}>{label}</div>
            <div className="mt-2 text-[26px] font-black" style={{ color: String(accent) }}>{String(value)}</div>
          </div>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative min-h-[560px] overflow-hidden rounded-2xl" style={{ background: `linear-gradient(135deg,${T.card},${T.cardAlt})`, border: `1px solid ${T.border}` }}>
          <div className="absolute inset-6 rounded-[28px]" style={{ background: 'linear-gradient(135deg,#E0F2FE,#DCFCE7 52%,#FEF3C7)', opacity: 0.9 }} />
          <div className="absolute inset-10 rounded-[26px] border border-white/70" />
          <div className="absolute left-[28%] top-[16%] h-[62%] w-[46%] rounded-[48%] border-2 border-white/80 bg-white/20" />
          <div className="absolute bottom-[18%] left-[17%] h-[34%] w-[58%] rounded-[45%] border border-white/70 bg-white/10" />
          {markers.map(({ courier, x, y }) => (
            <button
              key={courier.id}
              type="button"
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
              title={`${courier.phone} · ${courier.city}`}
            >
              <span className="absolute inset-0 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full animate-ping" style={{ background: courier.is_online ? 'rgba(16,185,129,.35)' : 'rgba(220,38,38,.25)' }} />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg" style={{ background: courier.is_online ? '#10B981' : T.red }}>
                <Bike size={18} />
              </span>
              <span className="pointer-events-none absolute left-1/2 top-12 hidden w-48 -translate-x-1/2 rounded-xl bg-slate-950 px-3 py-2 text-left text-[11px] text-white shadow-xl group-hover:block">
                <strong>{courier.phone}</strong><br />
                {courier.city} · {courier.zones.join(', ')}
              </span>
            </button>
          ))}
        </div>

        <aside className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="mb-3 flex items-center gap-2" style={{ color: T.text, fontWeight: 800 }}>
            <MapPin size={16} style={{ color: T.red }} />
            Livreurs visibles
          </div>
          <div className="space-y-2">
            {loading ? (
              <div style={{ color: T.muted }}>Chargement...</div>
            ) : couriers.map((courier) => (
              <div key={courier.id} className="rounded-xl p-3" style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}>
                <div className="flex items-center justify-between gap-3">
                  <div style={{ color: T.text, fontWeight: 800 }}>{courier.phone}</div>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: courier.is_online ? '#10B981' : T.red }} />
                </div>
                <div className="mt-1 text-[12px]" style={{ color: T.muted }}>{courier.city}</div>
                <div className="mt-2 text-[11px]" style={{ color: T.muted }}>{courier.zones.join(' · ')}</div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
