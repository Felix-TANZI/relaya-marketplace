// frontend/src/features/admin/deliveries/DeliveriesZonesPage.tsx
// Zones & Couverture géographique des livreurs

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, RefreshCw, Bike, Wifi, Users, Map } from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';
import { offsetPosition, OpenStreetMap, resolveCameroonPosition, type OpenStreetMapMarker } from '@/components/maps/OpenStreetMap';

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

const authH = () => ({
  'Content-Type': 'application/json',
  Authorization:  `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function DeliveriesZonesPage() {
  const T             = useAdminTheme();
  const { t }          = useTranslation();
  const { showToast } = useToast();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [couriers, setCouriers] = useState<CourierZone[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await http<CourierZone[]>('/api/auth/admin/couriers/', { headers: authH() });
      setCouriers(Array.isArray(data) ? data : []);
    } catch {
      toastRef.current(t('ad6_del_zones.toast_error_load'), 'error');
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

  const markers: OpenStreetMapMarker[] = couriers.map((courier) => {
    const position = offsetPosition(resolveCameroonPosition(courier.city, courier.zones?.join(" ")), courier.id, 0.018);
    const color = courier.is_online ? '#10B981' : T.red;
    return {
      id: courier.id,
      position,
      title: courier.full_name || courier.username,
      subtitle: `${courier.city || t('ad6_del_zones.city_to_define')} · ${courier.vehicle_type}`,
      color,
      iconHtml: `<span style="font-size:12px;font-weight:900">${(courier.full_name[0] || courier.username[0] || 'L').toUpperCase()}</span>`,
      popup: (
        <div className="min-w-[220px]">
          <div className="text-sm font-black text-slate-950">@{courier.username}</div>
          <div className="mt-1 text-xs font-semibold text-slate-600">{courier.phone}</div>
          <div className="mt-2 text-xs text-slate-600">{courier.zones?.slice(0, 4).join(', ') || courier.city || t('ad6_del_zones.zone_to_define')}</div>
          <div className="mt-2 inline-flex rounded-full px-2 py-1 text-xs font-black" style={{ background: `${color}18`, color }}>
            {courier.is_online ? t('ad6_del_zones.online') : t('ad6_del_zones.offline')}
          </div>
        </div>
      ),
    };
  });

  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            {t('ad6_del_zones.title')}
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {t('ad6_del_zones.subtitle', { cities: cities.length, zones: sortedZones.length, couriers: couriers.length })}
          </p>
        </div>
        <button onClick={() => load()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)', cursor: 'pointer' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> {t('ad6_del_zones.refresh')}
        </button>
      </div>

      {/* KPIs rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('ad6_del_zones.kpi_covered_cities'),   value: cities.length,                             accent: '#3B82F6',  icon: Map   },
          { label: t('ad6_del_zones.kpi_active_zones'),      value: sortedZones.length,                        accent: '#10B981',  icon: MapPin },
          { label: t('ad6_del_zones.kpi_online'),           value: couriers.filter(c => c.is_online).length,  accent: '#F47920',  icon: Wifi  },
          { label: t('ad6_del_zones.kpi_active_couriers'),    value: couriers.filter(c => c.is_active).length,  accent: T.text,     icon: Users },
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
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t('ad6_del_zones.coverage_map_title')}</span>
            <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-1.5">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
                <span style={{ fontSize: 11, color: T.muted }}>{t('ad6_del_zones.online')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.red }} />
                <span style={{ fontSize: 11, color: T.muted }}>{t('ad6_del_zones.offline')}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center" style={{ height: 460 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <OpenStreetMap markers={markers} height={460} className="rounded-none" />
          )}
        </div>

        {/* Panneau zones */}
        <div className="space-y-4">

          {/* Zones par ville */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <MapPin size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t('ad6_del_zones.zones_by_city')}</span>
            </div>
            <div className="p-4 max-h-60 overflow-y-auto space-y-3" style={{ scrollbarWidth: 'thin' }}>
              {loading ? (
                <p style={{ fontSize: 12.5, color: T.muted }}>{t('ad6_del_zones.loading')}</p>
              ) : cities.length === 0 ? (
                <p style={{ fontSize: 12.5, color: T.muted }}>{t('ad6_del_zones.no_active_courier')}</p>
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
                        <span style={{ fontSize: 10.5, color: T.muted }}>{cityCouriers.length} {t(cityCouriers.length !== 1 ? 'ad6_del_zones.courier_plural' : 'ad6_del_zones.courier')}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {zones.length === 0 ? (
                        <span style={{ fontSize: 10.5, color: T.muted }}>{t('ad6_del_zones.no_zone_defined')}</span>
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
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t('ad6_del_zones.best_covered_zones')}</span>
            </div>
            <div className="p-4 space-y-2.5">
              {sortedZones.slice(0, 8).map(([zone, count], i) => {
                const max = sortedZones[0]?.[1] ?? 1;
                return (
                  <div key={zone}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 12.5, color: T.text }}>{zone}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.red }}>{count} {t(count !== 1 ? 'ad6_del_zones.courier_plural' : 'ad6_del_zones.courier')}</span>
                    </div>
                    <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round(count / max * 100)}%`, background: i === 0 ? T.red : T.red + '80', borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
              {sortedZones.length === 0 && (
                <p style={{ fontSize: 12.5, color: T.muted }}>{t('ad6_del_zones.no_zone_configured')}</p>
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
