// frontend/src/features/admin/vendors/VendorsMapPage.tsx
// Carte des boutiques — distribution géographique des vendeurs

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, RefreshCw, Store, Award,
  TrendingUp, AlertTriangle, Phone,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';
import { offsetPosition, OpenStreetMap, resolveCameroonPosition, type OpenStreetMapMarker } from '@/components/maps/OpenStreetMap';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface CityData {
  city:     string;
  count:    number;
  approved: number;
  pending:  number;
  gmv:      number;
  lat:      number;
  lng:      number;
}

interface VendorLocation {
  id:                number;
  business_name:     string;
  city:              string;
  status:            string;
  certification_tier:'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  total_revenue:     number;
}

interface VendorShopLocation {
  id: number | string;
  vendor_id: number;
  business_name: string;
  location_name: string;
  address: string;
  city: string;
  phone: string;
  representative_name: string;
  representative_phone: string;
  status: string;
  certification_tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  latitude: number | null;
  longitude: number | null;
  is_geocoded: boolean;
  is_profile_fallback: boolean;
}

interface MapData {
  cities:  CityData[];
  vendors: VendorLocation[];
  locations?: VendorShopLocation[];
  total_approved: number;
  total_cities:   number;
  total_locations?: number;
  geocoded_locations?: number;
  pending_geo_locations?: number;
  top_city:       string;
}

const TIER_COLORS = {
  BRONZE:  '#CD7F32',
  SILVER:  '#8B909A',
  GOLD:    '#C8A000',
  DIAMOND: '#2563EB',
};

const STATUS_COLORS = {
  APPROVED:  '#10B981',
  PENDING:   '#F59E0B',
  REJECTED:  '#EF4444',
  SUSPENDED: '#9CA3AF',
};

const fmtXaf = (n: number) => n >= 1_000_000
  ? `${(n / 1_000_000).toFixed(1)}M FCFA`
  : n >= 1_000
    ? `${(n / 1_000).toFixed(0)}k FCFA`
    : `${n} FCFA`;

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function VendorsMapPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [data,        setData]        = useState<MapData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | string | null>(null);
  const [filterStatus,setFilterStatus]= useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await http<MapData>('/api/vendors/admin/vendors/map/', { headers: authHeader() });
      setData(result);
    } catch {
      toastRef.current('Erreur chargement de la carte', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredLocations = (data?.locations ?? []).filter((location) =>
    filterStatus === 'all' || location.status === filterStatus
  );
  const selectedLocation = filteredLocations.find((location) => location.id === selectedLocationId) ?? filteredLocations[0] ?? null;
  const locationMarkers: OpenStreetMapMarker[] = filteredLocations.map((location, index) => ({
    id: location.id,
    position: location.latitude !== null && location.longitude !== null
      ? [location.latitude, location.longitude]
      : offsetPosition(resolveCameroonPosition(location.address, location.city, location.location_name), index + location.vendor_id, 0.006),
    title: location.location_name,
    subtitle: `${location.business_name} · ${location.city || 'Ville à compléter'}`,
    color: location.id === selectedLocation?.id
      ? T.red
      : location.is_geocoded
        ? '#F47920'
        : '#F59E0B',
    iconHtml: location.is_geocoded
      ? `<span style="font-size:12px;font-weight:900">${location.business_name.slice(0, 1).toUpperCase()}</span>`
      : `<span style="font-size:13px;font-weight:900">!</span>`,
    popup: (
      <button type="button" onClick={() => setSelectedLocationId(location.id)} className="block min-w-[250px] text-left">
        <div className="text-sm font-black text-slate-950">{location.location_name}</div>
        <div className="mt-1 text-xs font-semibold text-slate-600">{location.business_name}</div>
        <div className="mt-2 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
          {location.address || location.city || 'Adresse à compléter'}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg bg-orange-50 px-2 py-1 font-bold text-orange-700">{location.status}</span>
          <span className="rounded-lg bg-slate-100 px-2 py-1 font-bold text-slate-700">{location.certification_tier}</span>
          {!location.is_geocoded && (
            <span className="rounded-lg bg-amber-50 px-2 py-1 font-bold text-amber-700">GPS à compléter</span>
          )}
        </div>
      </button>
    ),
  }));

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Carte des Boutiques
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {data?.total_approved ?? '—'} boutiques approuvées dans {data?.total_cities ?? '—'} villes
            <span> · {data?.total_locations ?? 0} emplacement{(data?.total_locations ?? 0) > 1 ? 's' : ''}</span>
            {data?.top_city && (
              <span> · Principale : <strong style={{ color: T.text }}>{data.top_city}</strong></span>
            )}
          </p>
        </div>
        <button onClick={() => load()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
          style={{ background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.1)')}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Carte OSM (2/3) */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden relative"
            style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <div className="flex items-center gap-2">
                <MapPin size={14} style={{ color: T.red }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Emplacements physiques des boutiques</span>
              </div>
              <div className="flex items-center gap-4">
                {[
                  { color: '#F47920', label: 'GPS précis' },
                  { color: '#F59E0B', label: 'À géolocaliser' },
                  { color: T.red, label: 'Sélection' },
                ].map((l, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }} />
                    <span style={{ fontSize: 11, color: T.muted }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <OpenStreetMap markers={locationMarkers} height={430} className="rounded-none" />

              {/* Fiche emplacement sélectionné */}
              {selectedLocation && (
                <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-64 rounded-2xl p-4"
                  style={{ background: T.card, border: `1px solid ${T.red}40`, boxShadow: '0 8px 30px rgba(0,0,0,0.25)', zIndex: 10 }}>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={14} style={{ color: T.red }} />
                    <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: T.text }}>{selectedLocation.location_name}</span>
                  </div>
                  {[
                    { label: 'Boutique', value: selectedLocation.business_name },
                    { label: 'Adresse', value: selectedLocation.address || selectedLocation.city || 'À compléter' },
                    { label: 'Responsable', value: selectedLocation.representative_name || 'À compléter' },
                    { label: 'Téléphone', value: selectedLocation.phone || 'À compléter', accent: T.red },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5"
                      style={{ borderBottom: i < 3 ? `1px solid ${T.border}` : 'none' }}>
                      <span style={{ fontSize: 12, color: T.muted }}>{r.label}</span>
                      <span className="max-w-[140px] truncate text-right" style={{ fontSize: 12.5, fontWeight: 700, color: r.accent ?? T.text }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Colonne droite : statut GPS + liste vendeurs */}
          <div className="space-y-5">

            <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                <MapPin size={14} style={{ color: T.red }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Couverture boutiques</span>
              </div>
              <div className="grid grid-cols-3 gap-2 p-4">
                {[
                  { label: 'Total', value: data?.total_locations ?? 0, color: T.text },
                  { label: 'GPS OK', value: data?.geocoded_locations ?? 0, color: '#10B981' },
                  { label: 'À corriger', value: data?.pending_geo_locations ?? 0, color: '#F59E0B' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}>
                    <p style={{ fontSize: 18, fontWeight: 900, color: item.color }}>{item.value}</p>
                    <p style={{ fontSize: 10.5, fontWeight: 700, color: T.muted }}>{item.label}</p>
                  </div>
                ))}
              </div>
              {(data?.pending_geo_locations ?? 0) > 0 && (
                <div className="mx-4 mb-4 flex items-start gap-2 rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <AlertTriangle size={15} className="mt-0.5 text-amber-600" />
                  <p className="text-[11.5px] font-semibold leading-5" style={{ color: T.text }}>
                    Les marqueurs jaunes utilisent une position estimée. Le vendeur doit compléter latitude et longitude dans ses emplacements.
                  </p>
                </div>
              )}
            </div>

            {/* Top villes */}
            <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                <TrendingUp size={14} style={{ color: T.red }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Classement villes</span>
              </div>
              <div className="divide-y" style={{ borderColor: T.border }}>
                {(data?.cities ?? []).slice(0, 8).map((c, i) => (
                  <div key={c.city} className="flex items-center justify-between px-5 py-2.5"
                    style={{ background: hoveredCity === c.city ? T.cardAlt : 'transparent', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredCity(c.city)}
                    onMouseLeave={() => setHoveredCity(null)}>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black"
                        style={{ background: i < 3 ? T.red + '20' : T.border, color: i < 3 ? T.red : T.muted }}>
                        {i + 1}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.city}</p>
                        <p style={{ fontSize: 10.5, color: '#10B981' }}>{c.approved} approuvée{c.approved > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p style={{ fontSize: 13, fontWeight: 700, color: T.red }}>{c.count}</p>
                      <p style={{ fontSize: 10.5, color: T.muted }}>{fmtXaf(c.gmv)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filtre statut + liste vendeurs */}
            <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                <div className="flex items-center gap-2">
                  <Store size={14} style={{ color: T.red }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Emplacements</span>
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="text-[12px] rounded-lg px-2 py-1 outline-none"
                  style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}>
                  <option value="all">Toutes</option>
                  <option value="APPROVED">Approuvées</option>
                  <option value="PENDING">En attente</option>
                  <option value="SUSPENDED">Suspendues</option>
                </select>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y" style={{ borderColor: T.border, scrollbarWidth: 'thin' }}>
                {filteredLocations.slice(0, 30).map(location => (
                  <button key={location.id} type="button" className="flex w-full items-center justify-between px-4 py-2.5 text-left"
                    onClick={() => setSelectedLocationId(location.id)}
                    onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: (location.is_geocoded ? (TIER_COLORS[location.certification_tier] ?? '#9CA3AF') : '#F59E0B') + '20' }}>
                        {location.is_geocoded
                          ? <Award size={11} style={{ color: TIER_COLORS[location.certification_tier] ?? '#9CA3AF' }} />
                          : <AlertTriangle size={11} style={{ color: '#F59E0B' }} />}
                      </div>
                      <div className="min-w-0">
                        <Link to={`/admin/vendors/${location.vendor_id}`}
                          style={{ fontSize: 12.5, fontWeight: 600, color: '#F47920', display: 'block' }}
                          className="truncate">
                          {location.location_name}
                        </Link>
                        <p style={{ fontSize: 10.5, color: T.muted }}>{location.business_name} · {location.city || 'Ville à compléter'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {location.phone && <Phone size={11} style={{ color: T.muted }} />}
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: (STATUS_COLORS[location.status as keyof typeof STATUS_COLORS] ?? '#9CA3AF') + '18', color: STATUS_COLORS[location.status as keyof typeof STATUS_COLORS] ?? '#9CA3AF' }}>
                        {location.status === 'APPROVED' ? 'OK' : location.status === 'PENDING' ? 'PEND.' : location.status.slice(0, 4)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
