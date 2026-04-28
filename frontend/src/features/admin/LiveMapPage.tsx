// frontend/src/features/admin/LiveMapPage.tsx
// Carte live des utilisateurs connectés — react-leaflet + GPS exact + design premium

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Radio, RefreshCw, Users, Store, User,
  Monitor, Smartphone, Globe, MapPin, Clock, Navigation,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─── Fix icônes Leaflet (Vite) ────────────────────────────────────────────────
interface LeafletIconDefault extends L.Icon.Default { _getIconUrl?: unknown; }
delete (L.Icon.Default.prototype as LeafletIconDefault)._getIconUrl;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface LiveUser {
  id:          number;
  username:    string;
  full_name:   string;
  role:        'admin' | 'vendor' | 'buyer';
  city:        string | null;
  lat:         number | null;
  lng:         number | null;
  accuracy:    number | null;
  has_gps:     boolean;
  page:        string;
  device:      'desktop' | 'mobile' | 'tablet';
  last_seen:   string;
  session_min: number;
}

interface LiveStats {
  total_online: number;
  buyers:       number;
  vendors:      number;
  admins:       number;
  gps_count:    number;
  by_city:      Array<{ city: string; count: number }>;
  by_page:      Array<{ page: string; count: number }>;
  by_device:    Array<{ device: string; count: number }>;
  users:        LiveUser[];
  last_updated: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_CFG = {
  admin:  { label: 'Admin',    color: '#EF4444', emoji: '👑', gradient: 'linear-gradient(135deg,#EF4444,#B91C1C)' },
  vendor: { label: 'Vendeur',  color: '#F47920', emoji: '🏪', gradient: 'linear-gradient(135deg,#F47920,#C2590A)' },
  buyer:  { label: 'Acheteur', color: '#3B82F6', emoji: '👤', gradient: 'linear-gradient(135deg,#3B82F6,#1D4ED8)' },
};

const CITY_FALLBACK: Record<string, [number, number]> = {
  'Yaoundé': [3.848, 11.502], 'Yaounde': [3.848, 11.502],
  'Douala':  [4.050, 9.768 ],
  'Bafoussam': [5.478, 10.417], 'Bamenda': [5.959, 10.146],
  'Garoua':  [9.301, 13.397], 'Maroua': [10.595, 14.316],
  'Ngaoundéré': [7.323, 13.584], 'Ngaoundere': [7.323, 13.584],
  'Bertoua': [4.578, 13.686], 'Ebolowa': [2.900, 11.150],
  'Kribi':   [2.939, 9.909 ], 'Limbé': [4.024, 9.204 ],
  'Buea':    [4.154, 9.241 ], 'Edéa': [3.800, 10.133],
  'Kumba':   [4.633, 9.433 ], 'Nkongsamba': [4.950, 9.933],
};

const REFRESH_INTERVAL = 30_000;

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// ─────────────────────────────────────────────────────────────────────────────
// Markers premium avec animations CSS
// ─────────────────────────────────────────────────────────────────────────────

const createUserMarker = (user: LiveUser, isGps: boolean) => {
  const cfg   = ROLE_CFG[user.role] ?? ROLE_CFG.buyer;
  const init  = user.username[0]?.toUpperCase() ?? '?';
  const size  = isGps ? 36 : 30;
  const pulse = isGps ? `
    <div style="
      position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%);
      width:${size + 16}px; height:${size + 16}px;
      border-radius:50%;
      background:${cfg.color}22;
      animation:liveRipple 2s ease-out infinite;
    "></div>
    <div style="
      position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%);
      width:${size + 8}px; height:${size + 8}px;
      border-radius:50%;
      background:${cfg.color}15;
      animation:liveRipple 2s ease-out infinite 0.4s;
    "></div>
  ` : '';

  return L.divIcon({
    html: `
      <div style="position:relative;width:${size + 20}px;height:${size + 20}px;display:flex;align-items:center;justify-content:center;">
        ${pulse}
        <div style="
          position:relative;z-index:2;
          width:${size}px; height:${size}px;
          border-radius:50%;
          background:${cfg.gradient};
          border:2.5px solid #fff;
          box-shadow:0 4px 16px ${cfg.color}55, 0 2px 6px rgba(0,0,0,0.25);
          display:flex; align-items:center; justify-content:center;
          font-size:${size > 32 ? 13 : 11}px;
          font-weight:900;
          color:#fff;
          font-family:'Plus Jakarta Sans',sans-serif;
          cursor:pointer;
          transition:transform 0.2s;
        ">${init}</div>
        ${isGps ? `<div style="
          position:absolute; bottom:2px; right:2px; z-index:3;
          width:10px; height:10px; border-radius:50%;
          background:#10B981; border:1.5px solid #fff;
          box-shadow:0 1px 4px rgba(0,0,0,0.3);
        "></div>` : ''}
      </div>`,
    iconSize:   [size + 20, size + 20],
    iconAnchor: [(size + 20) / 2, (size + 20) / 2],
    className:  '',
  });
};

const createCityMarker = (count: number, color: string) => {
  const size = Math.max(36, Math.min(64, 32 + count * 5));
  return L.divIcon({
    html: `
      <div style="position:relative;width:${size + 16}px;height:${size + 16}px;display:flex;align-items:center;justify-content:center;">
        <div style="
          position:absolute;
          width:${size + 16}px; height:${size + 16}px;
          border-radius:50%;
          background:${color}15;
          animation:liveRipple 2.5s ease-out infinite;
        "></div>
        <div style="
          width:${size}px; height:${size}px; border-radius:50%;
          background:${color}; border:3px solid rgba(255,255,255,0.9);
          box-shadow:0 6px 20px ${color}55, 0 2px 8px rgba(0,0,0,0.2);
          display:flex; align-items:center; justify-content:center;
          font-size:${count > 9 ? 13 : 15}px; font-weight:900; color:#fff;
          font-family:'Plus Jakarta Sans',sans-serif;
          position:relative; z-index:2;
        ">${count}</div>
      </div>`,
    iconSize:   [size + 16, size + 16],
    iconAnchor: [(size + 16) / 2, (size + 16) / 2],
    className:  '',
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// AutoFit
// ─────────────────────────────────────────────────────────────────────────────

function AutoFit({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const fittedRef = useRef(false);
  useEffect(() => {
    if (positions.length > 0 && !fittedRef.current) {
      fittedRef.current = true;
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [map, positions]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles CSS globaux pour les animations
// ─────────────────────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  @keyframes liveRipple {
    0%   { transform:scale(0.8); opacity:0.8; }
    100% { transform:scale(1.6); opacity:0; }
  }
  @keyframes livePulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes spin        { to { transform:rotate(360deg); } }

  .leaflet-popup-content-wrapper {
    border-radius:16px !important;
    padding:0 !important;
    box-shadow:0 12px 40px rgba(0,0,0,0.25) !important;
    border:1px solid rgba(255,255,255,0.1) !important;
    overflow:hidden;
  }
  .leaflet-popup-content { margin:0 !important; }
  .leaflet-popup-tip-container { display:none; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function LiveMapPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [stats,        setStats]       = useState<LiveStats | null>(null);
  const [loading,      setLoading]     = useState(true);
  const [countdown,    setCountdown]   = useState(30);
  const [selectedRole, setSelectedRole]= useState<string>('all');
  const [viewMode,     setViewMode]    = useState<'city' | 'user'>('user');
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await http<LiveStats>('/api/vendors/admin/live/users/', { headers: authHeader() });
      setStats(data);
      setCountdown(30);
    } catch {
      if (!silent) toastRef.current('Erreur chargement', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    intervalRef.current  = setInterval(() => load(true), REFRESH_INTERVAL);
    countdownRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => {
      if (intervalRef.current)  clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [load]);

  const filteredUsers = stats?.users.filter(u =>
    selectedRole === 'all' || u.role === selectedRole
  ) ?? [];

  // Résolution des coordonnées : GPS exact > fallback ville
  const resolveCoords = (u: LiveUser): [number, number] | null => {
    if (u.has_gps && u.lat !== null && u.lng !== null) return [u.lat, u.lng];
    const city = u.city || '';
    const cityCoords = CITY_FALLBACK[city]
      ?? Object.entries(CITY_FALLBACK).find(([k]) => k.toLowerCase() === city.toLowerCase())?.[1];
    return cityCoords ?? null;
  };

  // Groupes par ville pour le mode "city"
  type CityGroup = { count: number; color: string; roles: Record<string, number>; users: LiveUser[]; coords: [number, number] };
  const cityGroups: Record<string, CityGroup> = {};
  filteredUsers.forEach(u => {
    const city   = u.city || 'Inconnue';
    const coords = CITY_FALLBACK[city] ?? [5.5, 12.0];
    if (!cityGroups[city]) cityGroups[city] = { count: 0, color: '#3B82F6', roles: {}, users: [], coords };
    cityGroups[city].count++;
    cityGroups[city].roles[u.role] = (cityGroups[city].roles[u.role] ?? 0) + 1;
    cityGroups[city].users.push(u);
    const r = cityGroups[city].roles;
    if ((r.admin ?? 0) >= (r.vendor ?? 0) && (r.admin ?? 0) >= (r.buyer ?? 0)) cityGroups[city].color = '#EF4444';
    else if ((r.vendor ?? 0) >= (r.buyer ?? 0)) cityGroups[city].color = '#F47920';
  });

  const allPositions = filteredUsers.map(resolveCoords).filter((c): c is [number, number] => c !== null);


  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{GLOBAL_CSS}</style>

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/admin/live"
            style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}`, textDecoration: 'none' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = T.text)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = T.muted)}>
            <ArrowLeft size={14} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: T.text, margin: 0 }}>
                Carte Live
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'livePulse 1.5s infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981' }}>LIVE · {countdown}s</span>
              </div>
              {/* Badge GPS */}
              {(stats?.gps_count ?? 0) > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 20, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <Navigation size={10} style={{ color: '#3B82F6' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6' }}>{stats?.gps_count} GPS exact</span>
                </div>
              )}
            </div>
            <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
              {stats?.total_online ?? 0} utilisateur{(stats?.total_online ?? 0) > 1 ? 's' : ''} en ligne
              {stats?.last_updated && <span style={{ marginLeft: 6 }}>· {fmtTime(stats.last_updated)}</span>}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Toggle mode */}
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: `1px solid ${T.border}` }}>
            {[
              { key: 'user', label: 'Individuel' },
              { key: 'city', label: 'Par ville'  },
            ].map(v => (
              <button key={v.key} onClick={() => setViewMode(v.key as 'city' | 'user')}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, background: viewMode === v.key ? T.red : T.cardAlt, color: viewMode === v.key ? '#fff' : T.muted, border: 'none', cursor: 'pointer' }}>
                {v.label}
              </button>
            ))}
          </div>

          {/* Filtre rôle */}
          {(['all', 'buyer', 'vendor', 'admin'] as const).map(role => {
            const cfg = ROLE_CFG[role as keyof typeof ROLE_CFG];
            const active = selectedRole === role;
            return (
              <button key={role} onClick={() => setSelectedRole(role)}
                style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', border: `1px solid ${active ? (cfg?.color ?? T.red) + '50' : T.border}`, background: active ? (cfg?.color ?? T.red) + '18' : T.cardAlt, color: active ? (cfg?.color ?? T.red) : T.muted }}>
                {role === 'all' ? 'Tous' : cfg?.label}
                {role !== 'all' && stats && <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 10 }}>({role === 'buyer' ? stats.buyers : role === 'vendor' ? stats.vendors : stats.admins})</span>}
              </button>
            );
          })}

          <button onClick={() => load(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)', cursor: 'pointer' }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {/* Layout carte + panneau */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>

        {/* Carte */}
        <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.border}`, minHeight: 580 }}>
          {loading && !stats ? (
            <div style={{ height: 580, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.card }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <MapContainer center={[5.5, 12.0]} zoom={6} style={{ height: 580, width: '100%' }} zoomControl={true}>
              {/* Tuiles CartoDB Positron — élégantes, professionnelles */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />

              {allPositions.length > 0 && <AutoFit positions={allPositions} />}

              {/* ── MODE INDIVIDUEL ── */}
              {viewMode === 'user' && filteredUsers.map(u => {
                const coords = resolveCoords(u);
                if (!coords) return null;
                const cfg = ROLE_CFG[u.role] ?? ROLE_CFG.buyer;

                // Léger offset si coordonnées approximatives (ville)
                const jitter: [number, number] = u.has_gps ? coords : [
                  coords[0] + (((u.id * 13) % 40) - 20) * 0.004,
                  coords[1] + (((u.id * 17) % 40) - 20) * 0.004,
                ];

                return (
                  <Marker key={u.id} position={jitter} icon={createUserMarker(u, u.has_gps)}>
                    {/* Cercle d'accuracy si GPS exact */}
                    {u.has_gps && u.accuracy && u.accuracy < 200 && (
                      <Circle center={jitter} radius={u.accuracy}
                        pathOptions={{ color: cfg.color, fillColor: cfg.color, fillOpacity: 0.06, weight: 1, dashArray: '4 4' }} />
                    )}
                    <Popup maxWidth={260} minWidth={220}>
                      <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                        {/* Header popup */}
                        <div style={{ background: cfg.gradient, padding: '16px 16px 12px', color: '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900 }}>
                              {u.username[0]?.toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                @{u.username}
                              </div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{u.full_name}</div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.2)' }}>
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                        {/* Infos */}
                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Globe size={13} color="#9CA3AF" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: 12.5, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.page}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <MapPin size={13} color={u.has_gps ? '#10B981' : '#9CA3AF'} style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: u.has_gps ? '#10B981' : '#6B7280', fontWeight: u.has_gps ? 600 : 400 }}>
                              {u.has_gps
                                ? `GPS exact · ±${u.accuracy ?? '?'}m`
                                : `${u.city || 'Position inconnue'} (approximatif)`
                              }
                            </span>
                          </div>
                          {u.has_gps && u.lat && (
                            <div style={{ fontSize: 10.5, color: '#9CA3AF', fontFamily: 'monospace' }}>
                              {u.lat.toFixed(5)}, {u.lng?.toFixed(5)}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #F3F4F6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Clock size={12} color="#9CA3AF" />
                              <span style={{ fontSize: 12, color: '#6B7280' }}>{u.session_min} min</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              {u.device === 'mobile' ? <Smartphone size={12} color="#9CA3AF" /> : <Monitor size={12} color="#9CA3AF" />}
                              <span style={{ fontSize: 11.5, color: '#9CA3AF' }}>{u.device}</span>
                            </div>
                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{fmtTime(u.last_seen)}</span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* ── MODE PAR VILLE ── */}
              {viewMode === 'city' && Object.entries(cityGroups).map(([city, group]) => (
                <Marker key={city} position={group.coords} icon={createCityMarker(group.count, group.color)}>
                  <Popup maxWidth={280} minWidth={240}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                      <div style={{ background: group.color, padding: '14px 16px', color: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <MapPin size={14} color="rgba(255,255,255,0.9)" />
                          <span style={{ fontSize: 15, fontWeight: 800 }}>{city}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 20, fontWeight: 900 }}>{group.count}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          {Object.entries(group.roles).map(([role, count]) => {
                            const cfg = ROLE_CFG[role as keyof typeof ROLE_CFG];
                            return cfg ? (
                              <span key={role} style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.2)' }}>
                                {cfg.label} {count}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                      <div style={{ padding: '10px 14px', maxHeight: 160, overflowY: 'auto' }}>
                        {group.users.slice(0, 6).map(u => {
                          const cfg = ROLE_CFG[u.role];
                          return (
                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #F3F4F6' }}>
                              <div style={{ width: 22, height: 22, borderRadius: '50%', background: cfg?.color + '20', color: cfg?.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                                {u.username[0]?.toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{u.username}</div>
                                <div style={{ fontSize: 10.5, color: '#9CA3AF' }}>{u.page}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                                {u.has_gps && <Navigation size={9} color="#10B981" />}
                                <span style={{ fontSize: 10.5, color: '#9CA3AF' }}>{u.session_min}m</span>
                              </div>
                            </div>
                          );
                        })}
                        {group.users.length > 6 && (
                          <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', margin: '6px 0 0' }}>
                            +{group.users.length - 6} autre{group.users.length - 6 > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Panneau droit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: 580 }}>

          {/* GPS indicator */}
          {(stats?.gps_count ?? 0) > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Navigation size={14} color="#10B981" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: '#10B981', margin: 0 }}>{stats?.gps_count} position{(stats?.gps_count ?? 0) > 1 ? 's' : ''} exacte{(stats?.gps_count ?? 0) > 1 ? 's' : ''}</p>
                <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>{(stats?.total_online ?? 0) - (stats?.gps_count ?? 0)} approximative{(stats?.total_online ?? 0) - (stats?.gps_count ?? 0) > 1 ? 's' : ''}</p>
              </div>
            </div>
          )}

          {/* Résumé */}
          <div style={{ padding: '14px', borderRadius: 14, background: T.card, border: `1px solid ${T.border}` }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: T.text, marginBottom: 10 }}>Résumé</p>
            {[
              { icon: Radio,      label: 'En ligne',  value: stats?.total_online ?? 0, accent: '#10B981' },
              { icon: Users,      label: 'Acheteurs', value: stats?.buyers        ?? 0, accent: '#3B82F6' },
              { icon: Store,      label: 'Vendeurs',  value: stats?.vendors       ?? 0, accent: '#F47920' },
              { icon: User,       label: 'Admins',    value: stats?.admins        ?? 0, accent: '#EF4444' },
              { icon: Monitor,    label: 'Desktop',   value: stats?.by_device?.find(d => d.device === 'desktop')?.count ?? 0, accent: T.muted },
              { icon: Smartphone, label: 'Mobile',    value: stats?.by_device?.filter(d => d.device !== 'desktop').reduce((s, d) => s + d.count, 0) ?? 0, accent: T.muted },
            ].map(({ icon: Icon, label, value, accent }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderTop: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Icon size={12} style={{ color: accent }} />
                  <span style={{ fontSize: 12, color: T.muted }}>{label}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Pages actives */}
          <div style={{ borderRadius: 14, background: T.card, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}`, background: T.cardAlt, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={13} style={{ color: T.red }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>Pages actives</span>
            </div>
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(stats?.by_page ?? []).length === 0
                ? <p style={{ fontSize: 12, color: T.muted, textAlign: 'center', margin: 0 }}>—</p>
                : (stats?.by_page ?? []).map((p, i) => {
                  const max = stats?.by_page[0]?.count ?? 1;
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11.5, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 175 }}>{p.page}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: T.red, flexShrink: 0, marginLeft: 6 }}>{p.count}</span>
                      </div>
                      <div style={{ height: 3, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round(p.count / max * 100)}%`, background: T.red, borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>

          {/* Sessions */}
          {filteredUsers.length > 0 && (
            <div style={{ borderRadius: 14, background: T.card, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}`, background: T.cardAlt, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} style={{ color: T.red }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>Sessions ({filteredUsers.length})</span>
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', scrollbarWidth: 'thin' }}>
                {filteredUsers.map(u => {
                  const cfg = ROLE_CFG[u.role] ?? ROLE_CFG.buyer;
                  return (
                    <Link key={u.id} to={`/admin/users/${u.id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', textDecoration: 'none', borderBottom: `1px solid ${T.border}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: cfg.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                        {u.username[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{u.username}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {u.has_gps && <Navigation size={9} color="#10B981" />}
                          <span style={{ fontSize: 10.5, color: T.muted }}>{u.city || 'N/A'}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>{u.session_min}m</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}