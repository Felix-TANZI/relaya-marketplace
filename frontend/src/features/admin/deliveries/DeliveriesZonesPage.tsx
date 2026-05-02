// frontend/src/features/admin/deliveries/DeliveriesZonesPage.tsx
// Zones & Couverture géographique des livreurs

import { useEffect, useState, useCallback, useRef } from 'react';
import { MapPin, RefreshCw, Bike, Wifi, Users, Map } from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface CourierZone {
  id:          number;
  username:    string;
  full_name:   string;
  phone:       string;
  city:        string;
  zones:       string[];
  vehicle_type:string;
  is_online:   boolean;
  is_approved: boolean;
  is_active:   boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Positions pseudo-géo des villes camerounaises sur un canvas 100x100
// ─────────────────────────────────────────────────────────────────────────────

const CITY_POSITIONS: Record<string, { x: number; y: number }> = {
  'Yaoundé':    { x: 52, y: 58 },
  'Douala':     { x: 35, y: 60 },
  'Bafoussam':  { x: 40, y: 50 },
  'Bamenda':    { x: 34, y: 40 },
  'Garoua':     { x: 60, y: 28 },
  'Maroua':     { x: 68, y: 18 },
  'Ngaoundéré': { x: 62, y: 38 },
  'Bertoua':    { x: 68, y: 58 },
  'Ebolowa':    { x: 50, y: 72 },
  'Kribi':      { x: 44, y: 74 },
  'Limbé':      { x: 30, y: 63 },
};

const authH = () => ({
  'Content-Type': 'application/json',
  Authorization:  `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function DeliveriesZonesPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [couriers, setCouriers] = useState<CourierZone[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [hovered,  setHovered]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await http<CourierZone[]>('/api/auth/admin/couriers/', { headers: authH() });
      setCouriers(Array.isArray(data) ? data : []);
    } catch {
      toastRef.current('Erreur chargement zones', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Grouper par ville
  const cities = Array.from(new Set(couriers.map(c => c.city).filter(Boolean)));
  const byCity: Record<string, CourierZone[]> = {};
  cities.forEach(city => {
    byCity[city] = couriers.filter(c => c.city === city);
  });

  // Toutes les zones uniques avec compte de couverture
  const allZones: Record<string, number> = {};
  couriers.forEach(c => {
    (c.zones ?? []).forEach(z => {
      allZones[z] = (allZones[z] ?? 0) + 1;
    });
  });
  const sortedZones = Object.entries(allZones).sort((a, b) => b[1] - a[1]);

  // Markers pour la carte
  const markers = couriers
    .filter(c => CITY_POSITIONS[c.city])
    .map(c => ({
      courier: c,
      x: CITY_POSITIONS[c.city].x + (Math.sin(c.id * 2.3) * 3),
      y: CITY_POSITIONS[c.city].y + (Math.cos(c.id * 1.7) * 3),
    }));

  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Zones & Couverture
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {cities.length} ville{cities.length !== 1 ? 's' : ''} couvertes · {sortedZones.length} zones actives · {couriers.length} livreurs
          </p>
        </div>
        <button onClick={() => load()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)', cursor: 'pointer' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      {/* KPIs rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Villes couvertes',   value: cities.length,                             accent: '#3B82F6',  icon: Map   },
          { label: 'Zones actives',      value: sortedZones.length,                        accent: '#10B981',  icon: MapPin },
          { label: 'En ligne',           value: couriers.filter(c => c.is_online).length,  accent: '#F47920',  icon: Wifi  },
          { label: 'Livreurs actifs',    value: couriers.filter(c => c.is_active).length,  accent: T.text,     icon: Users },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{k.label}</span>
                <Icon size={12} style={{ color: k.accent }} />
              </div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: k.accent, lineHeight: 1 }}>
                {loading ? '—' : k.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Carte + panneau */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Carte visuelle */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden relative" style={{ background: T.card, border: `1px solid ${T.border}`, minHeight: 520 }}>
          <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
            <Map size={14} style={{ color: T.red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Carte de couverture — Cameroun</span>
            <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-1.5">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
                <span style={{ fontSize: 11, color: T.muted }}>En ligne</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.red }} />
                <span style={{ fontSize: 11, color: T.muted }}>Hors ligne</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center" style={{ height: 460 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div className="relative" style={{ height: 460, overflow: 'hidden' }}>
              {/* Fond carte stylisé */}
              <div style={{ position: 'absolute', inset: 24, borderRadius: 28, background: 'linear-gradient(135deg,#E0F2FE,#DCFCE7 52%,#FEF3C7)', opacity: 0.85 }} />
              <div style={{ position: 'absolute', inset: 36, border: '1.5px solid rgba(255,255,255,0.7)', borderRadius: 26 }} />
              {/* Contours intérieurs */}
              <div style={{ position: 'absolute', left: '26%', top: '14%', width: '48%', height: '64%', borderRadius: '48%', border: '2px solid rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.18)' }} />
              <div style={{ position: 'absolute', bottom: '16%', left: '15%', width: '60%', height: '36%', borderRadius: '45%', border: '1px solid rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.08)' }} />

              {/* Noms des villes */}
              {cities.map(city => {
                const pos = CITY_POSITIONS[city];
                if (!pos) return null;
                const cityCouriers = byCity[city] ?? [];
                const hasOnline = cityCouriers.some(c => c.is_online);
                return (
                  <div key={city}
                    style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y - 8}%`, transform: 'translate(-50%, -100%)', background: hasOnline ? '#10B981' : T.red, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                    {city} ({cityCouriers.length})
                  </div>
                );
              })}

              {/* Marqueurs livreurs */}
              {markers.map(({ courier, x, y }) => (
                <button key={courier.id} type="button"
                  onMouseEnter={() => setHovered(courier.username)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', cursor: 'pointer', zIndex: hovered === courier.username ? 20 : 10 }}>
                  {/* Pulse */}
                  <span style={{ position: 'absolute', inset: 0, width: 36, height: 36, borderRadius: '50%', background: courier.is_online ? 'rgba(16,185,129,0.35)' : 'rgba(220,38,38,0.25)', animation: 'liveRipple 2s ease-out infinite', transform: 'translate(-12%, -12%)' }} />
                  {/* Icône */}
                  <span style={{ position: 'relative', display: 'flex', width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: courier.is_online ? '#10B981' : T.red, color: '#fff', boxShadow: '0 3px 10px rgba(0,0,0,0.25)', border: '2px solid #fff', fontSize: 11, fontWeight: 800 }}>
                    {(courier.full_name[0] || courier.username[0] || 'L').toUpperCase()}
                  </span>
                  {/* Tooltip */}
                  {hovered === courier.username && (
                    <div style={{ position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.88)', color: '#fff', padding: '8px 10px', borderRadius: 10, whiteSpace: 'nowrap', fontSize: 11.5, zIndex: 30, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
                      <p style={{ fontWeight: 700, marginBottom: 2 }}>@{courier.username}</p>
                      <p style={{ opacity: 0.75 }}>{courier.phone}</p>
                      <p style={{ opacity: 0.75, marginTop: 2 }}>{courier.zones?.slice(0, 3).join(', ')}{(courier.zones?.length ?? 0) > 3 ? '…' : ''}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Panneau zones */}
        <div className="space-y-4">

          {/* Zones par ville */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <MapPin size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Zones par ville</span>
            </div>
            <div className="p-4 max-h-60 overflow-y-auto space-y-3" style={{ scrollbarWidth: 'thin' }}>
              {loading ? (
                <p style={{ fontSize: 12.5, color: T.muted }}>Chargement…</p>
              ) : cities.length === 0 ? (
                <p style={{ fontSize: 12.5, color: T.muted }}>Aucun livreur actif.</p>
              ) : cities.map(city => {
                const cityCouriers = byCity[city] ?? [];
                const zones = Array.from(new Set(cityCouriers.flatMap(c => c.zones ?? [])));
                const onlineCount = cityCouriers.filter(c => c.is_online).length;
                return (
                  <div key={city} className="rounded-xl p-3" style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <strong style={{ fontSize: 13, color: T.text }}>{city}</strong>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 10.5, color: '#10B981', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Wifi size={9} /> {onlineCount}
                        </span>
                        <span style={{ fontSize: 10.5, color: T.muted }}>{cityCouriers.length} livreur{cityCouriers.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {zones.length === 0 ? (
                        <span style={{ fontSize: 10.5, color: T.muted }}>Aucune zone définie</span>
                      ) : zones.map(zone => (
                        <span key={zone} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, color: T.red, background: T.red + '14' }}>
                          {zone}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top zones les plus couvertes */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <Bike size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Zones les mieux couvertes</span>
            </div>
            <div className="p-4 space-y-2.5">
              {sortedZones.slice(0, 8).map(([zone, count], i) => {
                const max = sortedZones[0]?.[1] ?? 1;
                return (
                  <div key={zone}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 12.5, color: T.text }}>{zone}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.red }}>{count} livreur{count !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round(count / max * 100)}%`, background: i === 0 ? T.red : T.red + '80', borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
              {sortedZones.length === 0 && (
                <p style={{ fontSize: 12.5, color: T.muted }}>Aucune zone configurée.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin       { to { transform: rotate(360deg); } }
        @keyframes liveRipple { 0%{transform:scale(0.9) translate(-12%,-12%);opacity:0.8} 100%{transform:scale(1.8) translate(-12%,-12%);opacity:0} }
      `}</style>
    </div>
  );
}