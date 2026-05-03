// frontend/src/features/admin/deliveries/DeliveriesPerformancePage.tsx
// Performance des livreurs — classement, métriques, tendances

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  TrendingUp, RefreshCw, Star, Award, Package,
  XCircle, Bike, Trophy,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, RadialBarChart, RadialBar,
} from 'recharts';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface CourierPerf {
  id:                  number;
  username:            string;
  full_name:           string;
  city:                string;
  vehicle_type:        string;
  is_online:           boolean;
  is_approved:         boolean;
  total_deliveries:    number;
  failed_deliveries:   number;
  active_shipments:    number;
  success_rate:        number;
  total_earnings_xaf:  number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const VEHICLE_LABELS: Record<string, string> = {
  MOTORBIKE: '🏍️ Moto',
  CAR:       '🚗 Voiture',
  BIKE:      '🚲 Vélo',
  TRICYCLE:  '🛺 Tricycle',
  VAN:       '🚐 Fourgon',
};

const BADGE_CFG = [
  { min: 95, label: 'Elite',    color: '#C8A000', icon: Trophy   },
  { min: 80, label: 'Expert',   color: '#8B5CF6', icon: Award    },
  { min: 60, label: 'Confirmé', color: '#3B82F6', icon: Star     },
  { min: 0,  label: 'Débutant', color: '#6B7280', icon: Package  },
];

const getBadge = (rate: number) =>
  BADGE_CFG.find(b => rate >= b.min) ?? BADGE_CFG[BADGE_CFG.length - 1];

const fmtXaf = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

const authH = () => ({
  'Content-Type': 'application/json',
  Authorization:  `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function DeliveriesPerformancePage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [couriers, setCouriers] = useState<CourierPerf[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await http<CourierPerf[]>('/api/auth/admin/couriers/', { headers: authH() });
      setCouriers(Array.isArray(data) ? data : []);
    } catch {
      toastRef.current('Erreur chargement performance', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Classement trié par taux de succès
  const ranked = [...couriers]
    .filter(c => c.total_deliveries > 0)
    .sort((a, b) => b.success_rate - a.success_rate || b.total_deliveries - a.total_deliveries);

  // Données graphique livraisons par véhicule
  const byVehicle = Object.entries(
    couriers.reduce<Record<string, number>>((acc, c) => {
      const k = VEHICLE_LABELS[c.vehicle_type] ?? c.vehicle_type;
      acc[k] = (acc[k] ?? 0) + c.total_deliveries;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  // Stats globales
  const totalDeliveries  = couriers.reduce((s, c) => s + c.total_deliveries,  0);
  const totalFailed      = couriers.reduce((s, c) => s + c.failed_deliveries, 0);
  const totalEarnings    = couriers.reduce((s, c) => s + c.total_earnings_xaf, 0);
  const globalSuccessRate = totalDeliveries + totalFailed > 0
    ? Math.round(totalDeliveries / (totalDeliveries + totalFailed) * 100)
    : 0;

  // Données jauge succès global
  const gaugeData = [{ name: 'Succès', value: globalSuccessRate, fill: globalSuccessRate >= 80 ? '#10B981' : globalSuccessRate >= 60 ? '#F59E0B' : '#EF4444' }];

  const COLORS = ['#F47920', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Performance Livreurs
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {ranked.length} livreurs avec activité · {totalDeliveries.toLocaleString('fr-FR')} livraisons au total
          </p>
        </div>
        <button onClick={() => load()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)', cursor: 'pointer' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total livraisons',  value: totalDeliveries,              accent: '#8B5CF6', icon: Package   },
          { label: 'Échouées',          value: totalFailed,                  accent: '#EF4444', icon: XCircle   },
          { label: 'Taux succès global',value: `${globalSuccessRate}%`,      accent: globalSuccessRate >= 80 ? '#10B981' : '#F59E0B', icon: TrendingUp },
          { label: 'Gains cumulés',     value: fmtXaf(totalEarnings),        accent: '#10B981', icon: Award     },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{k.label}</span>
                <Icon size={12} style={{ color: k.accent }} />
              </div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: i === 3 ? 14 : 22, fontWeight: 800, color: k.accent, lineHeight: 1 }}>
                {loading ? '—' : k.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Jauge taux succès global */}
        <div className="rounded-2xl p-5 flex flex-col items-center justify-center" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16, alignSelf: 'flex-start' }}>Taux succès global</p>
          <div style={{ position: 'relative', width: 160, height: 80 }}>
            <ResponsiveContainer width="100%" height={160}>
              <RadialBarChart cx="50%" cy="100%" innerRadius="70%" outerRadius="100%"
                startAngle={180} endAngle={0} data={gaugeData}>
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: T.border }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 900, color: gaugeData[0].fill, lineHeight: 1 }}>
                {globalSuccessRate}%
              </p>
              <p style={{ fontSize: 11, color: T.muted }}>sur {totalDeliveries + totalFailed} courses</p>
            </div>
          </div>
        </div>

        {/* Livraisons par type de véhicule */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Bike size={14} style={{ color: T.red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Livraisons par véhicule</span>
          </div>
          {byVehicle.length === 0 ? (
            <div className="flex items-center justify-center" style={{ height: 130 }}>
              <p style={{ fontSize: 13, color: T.muted }}>Aucune donnée</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={byVehicle} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12 }}
                  formatter={(v: number | undefined) => [v ?? 0, 'livraisons']} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {byVehicle.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Classement livreurs */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
          <Trophy size={14} style={{ color: T.red }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Classement par performance</span>
          <span style={{ fontSize: 11, color: T.muted }}>({ranked.length} livreurs avec activité)</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div style={{ width: 34, height: 34, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : ranked.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-2">
            <TrendingUp size={32} style={{ color: T.muted }} />
            <p style={{ fontSize: 14, color: T.muted }}>Aucune livraison enregistrée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: T.cardAlt, borderBottom: `1px solid ${T.border}` }}>
                  {['#', 'Livreur', 'Badge', 'Ville', 'Véhicule', 'Livraisons', 'Échoués', 'Taux succès', 'Gains estimés'].map((h, i) => (
                    <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranked.map((c, i) => {
                  const badge      = getBadge(c.success_rate);
                  const BadgeIcon  = badge.icon;
                  const scColor    = c.success_rate >= 90 ? '#10B981' : c.success_rate >= 70 ? '#F59E0B' : '#EF4444';
                  const rankColor  = i === 0 ? '#C8A000' : i === 1 ? '#8B909A' : i === 2 ? '#CD7F32' : T.muted;

                  return (
                    <tr key={c.id}
                      style={{ borderBottom: `1px solid ${T.border}` }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = T.cardAlt)}
                      onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                      {/* Rang */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, background: i < 3 ? rankColor + '20' : T.border, color: i < 3 ? rankColor : T.muted }}>
                          {i + 1}
                        </div>
                      </td>
                      {/* Livreur */}
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center gap-2.5">
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: scColor + '20', color: scColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                            {(c.full_name[0] || c.username[0] || '?').toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{c.full_name}</p>
                            <p style={{ fontSize: 11, color: T.muted }}>@{c.username}</p>
                          </div>
                        </div>
                      </td>
                      {/* Badge */}
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center gap-1.5">
                          <BadgeIcon size={13} style={{ color: badge.color }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: badge.color }}>{badge.label}</span>
                        </div>
                      </td>
                      {/* Ville */}
                      <td style={{ padding: '12px 16px', fontSize: 12.5, color: T.text }}>{c.city || '—'}</td>
                      {/* Véhicule */}
                      <td style={{ padding: '12px 16px', fontSize: 12, color: T.muted }}>{VEHICLE_LABELS[c.vehicle_type] ?? c.vehicle_type}</td>
                      {/* Livraisons */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{c.total_deliveries}</span>
                        {c.active_shipments > 0 && (
                          <span style={{ fontSize: 10.5, color: '#F47920', marginLeft: 4 }}>+{c.active_shipments} en cours</span>
                        )}
                      </td>
                      {/* Échoués */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 13, fontWeight: c.failed_deliveries > 0 ? 700 : 400, color: c.failed_deliveries > 0 ? '#EF4444' : T.muted }}>
                          {c.failed_deliveries}
                        </span>
                      </td>
                      {/* Taux succès */}
                      <td style={{ padding: '12px 16px', minWidth: 120 }}>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 13, fontWeight: 700, color: scColor, minWidth: 36 }}>{c.success_rate}%</span>
                          <div style={{ flex: 1, height: 5, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${c.success_rate}%`, background: scColor, borderRadius: 3 }} />
                          </div>
                        </div>
                      </td>
                      {/* Gains */}
                      <td style={{ padding: '12px 16px', fontSize: 12.5, color: '#10B981', fontWeight: 600 }}>
                        {fmtXaf(c.total_earnings_xaf)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Livreurs sans activité */}
        {couriers.filter(c => c.total_deliveries === 0).length > 0 && (
          <div className="flex items-center gap-2 px-5 py-3" style={{ borderTop: `1px solid ${T.border}`, background: T.cardAlt }}>
            <Package size={12} style={{ color: T.muted }} />
            <p style={{ fontSize: 12, color: T.muted }}>
              {couriers.filter(c => c.total_deliveries === 0).length} livreur{couriers.filter(c => c.total_deliveries === 0).length !== 1 ? 's' : ''} sans livraison enregistrée (non affiché{couriers.filter(c => c.total_deliveries === 0).length !== 1 ? 's' : ''} dans le classement)
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}