// frontend/src/features/admin/vendors/VendorsMapPage.tsx
// Carte des boutiques — distribution géographique des vendeurs
// (Visualisation SVG + stats par ville — sans dépendance externe)

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, RefreshCw, Store, Award,
  TrendingUp,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

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

interface MapData {
  cities:  CityData[];
  vendors: VendorLocation[];
  total_approved: number;
  total_cities:   number;
  top_city:       string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — positions relatives SVG des villes du Cameroun
// Système de coordonnées normalisé pour le SVG (0-400 x 0-480)
// ─────────────────────────────────────────────────────────────────────────────

const CAMEROON_CITIES: Record<string, { x: number; y: number; label: string }> = {
  'Yaoundé':     { x: 210, y: 245, label: 'Yaoundé' },
  'Douala':      { x: 148, y: 240, label: 'Douala'  },
  'Bafoussam':   { x: 175, y: 210, label: 'Bafoussam' },
  'Bamenda':     { x: 158, y: 178, label: 'Bamenda' },
  'Garoua':      { x: 240, y: 128, label: 'Garoua'  },
  'Maroua':      { x: 270, y: 88,  label: 'Maroua'  },
  'Ngaoundéré':  { x: 252, y: 168, label: 'Ngaoundéré' },
  'Bertoua':     { x: 278, y: 242, label: 'Bertoua' },
  'Ebolowa':     { x: 210, y: 298, label: 'Ebolowa' },
  'Kribi':       { x: 190, y: 308, label: 'Kribi'   },
  'Limbé':       { x: 138, y: 262, label: 'Limbé'   },
  'Kumba':       { x: 138, y: 248, label: 'Kumba'   },
  'Edéa':        { x: 172, y: 260, label: 'Edéa'    },
  'Buea':        { x: 150, y: 255, label: 'Buea'    },
  'Nkongsamba':  { x: 162, y: 230, label: 'Nkongsamba' },
};

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

  // Calcul du max pour normaliser les bulles
  const maxCount = Math.max(...(data?.cities.map(c => c.count) ?? [1]), 1);

  const getBubbleRadius = (count: number) =>
    Math.max(8, Math.min(32, 8 + (count / maxCount) * 24));

  const hoveredData = data?.cities.find(c => c.city === hoveredCity);
  const filteredVendors = data?.vendors.filter(v =>
    filterStatus === 'all' || v.status === filterStatus
  ) ?? [];

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

          {/* Carte SVG (2/3) */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden relative"
            style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <div className="flex items-center gap-2">
                <MapPin size={14} style={{ color: T.red }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Distribution géographique</span>
              </div>
              <div className="flex items-center gap-4">
                {[
                  { color: T.red, label: 'Fort' },
                  { color: T.red + '60', label: 'Moyen' },
                  { color: T.red + '25', label: 'Faible' },
                ].map((l, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }} />
                    <span style={{ fontSize: 11, color: T.muted }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SVG Cameroun simplifié */}
            <div className="p-4">
              <svg
                viewBox="100 60 200 300"
                style={{ width: '100%', maxHeight: 420 }}
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Contour simplifié du Cameroun */}
                <path
                  d="M140,70 L160,68 L185,72 L200,80 L225,85 L245,82 L268,90 L285,110 L290,130 
                     L285,155 L278,178 L282,200 L278,225 L272,248 L260,268 L245,285 L230,295 
                     L215,308 L200,315 L185,312 L170,318 L155,310 L145,298 L135,280 L125,260 
                     L118,242 L120,222 L125,205 L130,188 L135,170 L138,155 L140,138 L135,120 
                     L130,105 L132,90 L138,78 Z"
                  fill="none"
                  stroke={T.border}
                  strokeWidth="1.5"
                  style={{ opacity: 0.6 }}
                />
                {/* Fond Cameroun */}
                <path
                  d="M140,70 L160,68 L185,72 L200,80 L225,85 L245,82 L268,90 L285,110 L290,130 
                     L285,155 L278,178 L282,200 L278,225 L272,248 L260,268 L245,285 L230,295 
                     L215,308 L200,315 L185,312 L170,318 L155,310 L145,298 L135,280 L125,260 
                     L118,242 L120,222 L125,205 L130,188 L135,170 L138,155 L140,138 L135,120 
                     L130,105 L132,90 L138,78 Z"
                  fill={T.cardAlt}
                  style={{ opacity: 0.4 }}
                />

                {/* Bulles par ville */}
                {data?.cities.map(city => {
                  const pos = CAMEROON_CITIES[city.city];
                  if (!pos) return null;
                  const r      = getBubbleRadius(city.count);
                  const isHov  = hoveredCity === city.city;
                  const opacity= hoveredCity && !isHov ? 0.5 : 1;

                  return (
                    <g key={city.city}
                      style={{ cursor: 'pointer', opacity, transition: 'opacity 0.2s' }}
                      onMouseEnter={() => setHoveredCity(city.city)}
                      onMouseLeave={() => setHoveredCity(null)}>
                      {/* Halo */}
                      {isHov && (
                        <circle cx={pos.x} cy={pos.y} r={r + 6}
                          fill={T.red} fillOpacity={0.15} />
                      )}
                      {/* Bulle */}
                      <circle cx={pos.x} cy={pos.y} r={r}
                        fill={T.red}
                        fillOpacity={0.7 + (city.count / maxCount) * 0.3}
                        stroke={isHov ? '#fff' : T.card}
                        strokeWidth={isHov ? 2 : 1}
                      />
                      {/* Compte */}
                      <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle"
                        fill="#fff" fontSize={r > 14 ? 10 : 8} fontWeight="bold">
                        {city.count}
                      </text>
                      {/* Label ville */}
                      <text x={pos.x} y={pos.y + r + 8} textAnchor="middle"
                        fill={isHov ? T.text : T.muted} fontSize={8.5}
                        style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                        {pos.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip ville survolée */}
              {hoveredData && (
                <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-64 rounded-2xl p-4"
                  style={{ background: T.card, border: `1px solid ${T.red}40`, boxShadow: '0 8px 30px rgba(0,0,0,0.25)', zIndex: 10 }}>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={14} style={{ color: T.red }} />
                    <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: T.text }}>{hoveredData.city}</span>
                  </div>
                  {[
                    { label: 'Total boutiques',  value: hoveredData.count },
                    { label: 'Approuvées',       value: hoveredData.approved, accent: '#10B981' },
                    { label: 'En attente',       value: hoveredData.pending,  accent: '#F59E0B' },
                    { label: 'GMV total',        value: fmtXaf(hoveredData.gmv), accent: T.red },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5"
                      style={{ borderBottom: i < 3 ? `1px solid ${T.border}` : 'none' }}>
                      <span style={{ fontSize: 12, color: T.muted }}>{r.label}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: r.accent ?? T.text }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Colonne droite : classement villes + liste vendeurs */}
          <div className="space-y-5">

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
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Boutiques</span>
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
                {filteredVendors.slice(0, 20).map(v => (
                  <div key={v.id} className="flex items-center justify-between px-4 py-2.5"
                    onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: (TIER_COLORS[v.certification_tier] ?? '#9CA3AF') + '20' }}>
                        <Award size={11} style={{ color: TIER_COLORS[v.certification_tier] ?? '#9CA3AF' }} />
                      </div>
                      <div className="min-w-0">
                        <Link to={`/admin/vendors/${v.id}`}
                          style={{ fontSize: 12.5, fontWeight: 600, color: '#F47920', display: 'block' }}
                          className="truncate">
                          {v.business_name}
                        </Link>
                        <p style={{ fontSize: 10.5, color: T.muted }}>{v.city}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: (STATUS_COLORS[v.status as keyof typeof STATUS_COLORS] ?? '#9CA3AF') + '18', color: STATUS_COLORS[v.status as keyof typeof STATUS_COLORS] ?? '#9CA3AF' }}>
                        {v.status === 'APPROVED' ? 'OK' : v.status === 'PENDING' ? 'PEND.' : v.status.slice(0, 4)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}