import { useEffect, useMemo, useState } from 'react';
import { Activity, Bike, CheckCircle2, Clock3, RefreshCw, ShieldCheck, type LucideIcon } from 'lucide-react';
import { adminApi, type AdminCourier } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';

export default function DeliveriesPerformancePage() {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const [couriers, setCouriers] = useState<AdminCourier[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setCouriers(await adminApi.listCouriers());
    } catch {
      showToast('Performance livreurs indisponible', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => ({
    total: couriers.length,
    approved: couriers.filter((courier) => courier.is_approved).length,
    active: couriers.filter((courier) => courier.is_active).length,
    online: couriers.filter((courier) => courier.is_online).length,
  }), [couriers]);

  const byVehicle = useMemo(() => {
    return couriers.reduce<Record<string, number>>((acc, courier) => {
      acc[courier.vehicle_type] = (acc[courier.vehicle_type] ?? 0) + 1;
      return acc;
    }, {});
  }, [couriers]);

  const kpis: Array<{ label: string; value: number; Icon: LucideIcon; accent: string }> = [
    { label: 'Livreurs', value: stats.total, Icon: Bike, accent: T.text },
    { label: 'Approuves', value: stats.approved, Icon: ShieldCheck, accent: '#16A34A' },
    { label: 'Actifs', value: stats.active, Icon: CheckCircle2, accent: '#10B981' },
    { label: 'En ligne', value: stats.online, Icon: Activity, accent: T.red },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: T.text }}>Performance livreurs</h1>
          <p style={{ color: T.muted, fontSize: 13 }}>Suivi operationnel des statuts et capacites de livraison.</p>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold" style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {kpis.map(({ label, value, Icon, accent }) => (
          <div key={label} className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-[.08em]" style={{ color: T.muted }}>{label}</div>
              <Icon size={17} style={{ color: accent }} />
            </div>
            <div className="mt-3 text-[28px] font-black" style={{ color: accent }}>{value}</div>
          </div>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <h2 className="mb-4 text-[16px] font-extrabold" style={{ color: T.text }}>Repartition par vehicule</h2>
          <div className="space-y-3">
            {Object.entries(byVehicle).map(([vehicle, count]) => {
              const width = stats.total ? Math.max(8, (count / stats.total) * 100) : 0;
              return (
                <div key={vehicle}>
                  <div className="mb-1 flex justify-between text-[12px]" style={{ color: T.muted }}>
                    <span>{vehicle}</span><span>{count}</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: T.cardAlt }}>
                    <div className="h-2 rounded-full" style={{ width: `${width}%`, background: T.red }} />
                  </div>
                </div>
              );
            })}
            {!Object.keys(byVehicle).length && <div style={{ color: T.muted }}>Aucune donnee.</div>}
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <h2 className="mb-4 flex items-center gap-2 text-[16px] font-extrabold" style={{ color: T.text }}><Clock3 size={17} /> Controle rapide</h2>
          <div className="space-y-2">
            {couriers.slice(0, 8).map((courier) => (
              <div key={courier.id} className="flex items-center justify-between rounded-xl p-3" style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}>
                <div>
                  <div className="font-bold" style={{ color: T.text }}>{courier.phone}</div>
                  <div className="text-[11px]" style={{ color: T.muted }}>{courier.city}</div>
                </div>
                <span className="rounded-full px-2 py-1 text-[10px] font-bold" style={{ color: courier.is_online ? '#16A34A' : T.muted, background: courier.is_online ? 'rgba(22,163,74,.12)' : T.card }}>
                  {courier.is_online ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
