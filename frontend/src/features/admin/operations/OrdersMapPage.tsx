// frontend/src/features/admin/operations/OrdersMapPage.tsx
// Carte des commandes admin — BelivaY
// Commandes en cours · récentes · livrées · légende · info livreur

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  RefreshCw, Package, Truck, CheckCircle, Clock,
  ArrowLeft, MapPin, Phone, User, ExternalLink,
} from 'lucide-react';
import { adminApi, type AdminOrder } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';

// ─────────────────────────────────────────────────────────────────────────────
// LEAFLET FIX
// ─────────────────────────────────────────────────────────────────────────────

interface LeafletIconDefault extends L.Icon.Default { _getIconUrl?: unknown; }
delete (L.Icon.Default.prototype as LeafletIconDefault)._getIconUrl;

// ─────────────────────────────────────────────────────────────────────────────
// CITY COORDS (Cameroun)
// ─────────────────────────────────────────────────────────────────────────────

const CITY_COORDS: Record<string, [number, number]> = {
  yaoundé:   [3.8480, 11.5021],
  yaounde:   [3.8480, 11.5021],
  douala:    [4.0511, 9.7679],
  bafoussam: [5.4781, 10.4140],
  garoua:    [9.3000, 13.3990],
  maroua:    [10.5900, 14.3200],
  bamenda:   [5.9597, 10.1459],
  ngaoundéré:[7.3236, 13.5836],
  ngaoundere:[7.3236, 13.5836],
  bertoua:   [4.5753, 13.6840],
  ebolowa:   [2.9000, 11.1500],
  edéa:      [3.7947, 10.1297],
  edea:      [3.7947, 10.1297],
  limbe:     [4.0167, 9.2000],
  kumba:     [4.6333, 9.4500],
  kribi:     [2.9395, 9.9088],
};

function getCityCoords(city: string): [number, number] | null {
  const key = city.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [k, v] of Object.entries(CITY_COORDS)) {
    const normKey = k.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (normKey.startsWith(key) || key.startsWith(normKey)) return v;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUTS CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; markerColor: string; icon: React.ElementType; group: string }> = {
  // Commandes récentes (viennent d'être passées)
  CREATED:             { label: 'Nouvelles',           color: '#F9FAFB', bg: 'rgba(249,250,251,0.12)', markerColor: '#6B7280', icon: Clock,        group: 'recent' },
  PAID_IN_ESCROW:      { label: 'En escrow',           color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', markerColor: '#F59E0B', icon: Clock,         group: 'recent' },
  VENDOR_ACKNOWLEDGED: { label: 'Confirmées vendeur',  color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', markerColor: '#3B82F6', icon: Package,       group: 'recent' },
  PREPARING:           { label: 'En préparation',      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', markerColor: '#8B5CF6', icon: Package,       group: 'recent' },
  // En cours
  READY_FOR_PICKUP:    { label: 'Prête à enlever',     color: '#F47920', bg: 'rgba(244,121,32,0.12)', markerColor: '#F47920', icon: Package,       group: 'active' },
  DRIVER_ASSIGNED:     { label: 'Livreur assigné',     color: '#06B6D4', bg: 'rgba(6,182,212,0.12)',  markerColor: '#06B6D4', icon: Truck,         group: 'active' },
  PICKED_UP:           { label: 'Enlevée',             color: '#EC4899', bg: 'rgba(236,72,153,0.12)', markerColor: '#EC4899', icon: Truck,         group: 'active' },
  OUT_FOR_DELIVERY:    { label: 'En livraison',        color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  markerColor: '#EF4444', icon: Truck,         group: 'active' },
  // Livrées
  DELIVERED:           { label: 'Livrée',              color: '#10B981', bg: 'rgba(16,185,129,0.12)', markerColor: '#10B981', icon: CheckCircle,   group: 'delivered' },
  BUYER_CONFIRMED:     { label: 'Confirmée acheteur',  color: '#10B981', bg: 'rgba(16,185,129,0.12)', markerColor: '#059669', icon: CheckCircle,   group: 'delivered' },
  AUTO_CONFIRMED:      { label: 'Auto-confirmée',      color: '#10B981', bg: 'rgba(16,185,129,0.12)', markerColor: '#059669', icon: CheckCircle,   group: 'delivered' },
  RELEASED_TO_VENDOR:  { label: 'Fonds libérés',       color: '#10B981', bg: 'rgba(16,185,129,0.12)', markerColor: '#047857', icon: CheckCircle,   group: 'delivered' },
  // Autres
  DISPUTED:            { label: 'Litige',              color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', markerColor: '#D97706', icon: Clock,         group: 'other' },
  CANCELLED:           { label: 'Annulée',             color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', markerColor: '#6B7280', icon: Clock,        group: 'other' },
  REFUNDED:            { label: 'Remboursée',          color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', markerColor: '#6B7280', icon: Clock,        group: 'other' },
  // Compat frontend (anciens labels)
  PENDING:             { label: 'En attente',          color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', markerColor: '#F59E0B', icon: Clock,        group: 'recent' },
  PROCESSING:          { label: 'En cours',            color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', markerColor: '#3B82F6', icon: Package,       group: 'active' },
  SHIPPED:             { label: 'Expédiée',            color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', markerColor: '#8B5CF6', icon: Truck,         group: 'active' },
};

const GROUP_LABELS: Record<string, string> = {
  recent:    'Commandes récentes',
  active:    'En cours de livraison',
  delivered: 'Livrées',
  other:     'Autres',
};

const GROUP_COLORS: Record<string, string> = {
  recent:    '#F59E0B',
  active:    '#EF4444',
  delivered: '#10B981',
  other:     '#9CA3AF',
};

// ─────────────────────────────────────────────────────────────────────────────
// MARKER FACTORY
// ─────────────────────────────────────────────────────────────────────────────

function makeOrderIcon(color: string, count: number) {
  return new L.DivIcon({
    html: `
      <div style="
        position:relative;
        width:38px;height:38px;
        border-radius:50%;
        border:3px solid rgba(255,255,255,0.9);
        background:${color};
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 14px rgba(0,0,0,0.3);
      ">
        <span style="
          font-size:12px;font-weight:800;color:#fff;
          text-shadow:0 1px 3px rgba(0,0,0,0.5);
        ">${count}</span>
        ${count > 1 ? `<div style="
          position:absolute;
          top:-4px;right:-4px;
          width:14px;height:14px;
          border-radius:50%;
          background:#fff;
          border:2px solid ${color};
          font-size:8px;font-weight:800;
          color:${color};
          display:flex;align-items:center;justify-content:center;
        ">+</div>` : ''}
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    className: '',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP FIT
// ─────────────────────────────────────────────────────────────────────────────

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions.map(p => [p[0], p[1]]) as [number, number][], { padding: [40, 40] });
    }
  }, [positions.length]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtXaf  = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });

// ─────────────────────────────────────────────────────────────────────────────
// CITY GROUP
// ─────────────────────────────────────────────────────────────────────────────

interface CityGroup {
  city:    string;
  coords:  [number, number];
  orders:  AdminOrder[];
}

function groupByCity(orders: AdminOrder[]): CityGroup[] {
  const map = new Map<string, CityGroup>();
  for (const o of orders) {
    const city   = o.city || 'Inconnue';
    const coords = getCityCoords(city);
    if (!coords) continue;
    if (!map.has(city)) {
      map.set(city, { city, coords, orders: [] });
    }
    map.get(city)!.orders.push(o);
  }
  return Array.from(map.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

type FilterGroup = 'all' | 'recent' | 'active' | 'delivered';

export default function OrdersMapPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();

  const [orders,  setOrders]  = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<FilterGroup>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.listOrders();
      setOrders(data);
    } catch {
      showToast('Erreur chargement des commandes', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filtrage
  const filtered = orders.filter(o => {
    const cfg = STATUS_CFG[o.fulfillment_status];
    if (!cfg) return filter === 'all';
    if (filter === 'all') return true;
    return cfg.group === filter;
  });

  const cityGroups = groupByCity(filtered);
  const allPositions: [number, number][] = cityGroups.map(g => g.coords);

  // Compteurs
  const counts = {
    all:       orders.length,
    recent:    orders.filter(o => STATUS_CFG[o.fulfillment_status]?.group === 'recent').length,
    active:    orders.filter(o => STATUS_CFG[o.fulfillment_status]?.group === 'active').length,
    delivered: orders.filter(o => STATUS_CFG[o.fulfillment_status]?.group === 'delivered').length,
  };

  const FILTER_TABS: { key: FilterGroup; label: string; color: string; count: number; icon: React.ElementType }[] = [
    { key: 'all',       label: 'Toutes',          color: '#F9FAFB', count: counts.all,       icon: MapPin      },
    { key: 'recent',    label: 'Récentes',        color: '#F59E0B', count: counts.recent,    icon: Clock       },
    { key: 'active',    label: 'En cours',        color: '#EF4444', count: counts.active,    icon: Truck       },
    { key: 'delivered', label: 'Livrées',         color: '#10B981', count: counts.delivered, icon: CheckCircle },
  ];

  return (
    <div className="space-y-5">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Carte des Commandes
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            Vue géographique des commandes — cliquez sur un marqueur pour les détails
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/orders" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
            style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
            <ArrowLeft size={13} /> Liste
          </Link>
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
            style={{ background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {/* ── Filtres / KPIs ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FILTER_TABS.map(tab => {
          const Icon     = tab.icon;
          const isActive = filter === tab.key;
          return (
            <button key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
              style={{
                background: isActive ? tab.color + '15' : T.card,
                border: `2px solid ${isActive ? tab.color : T.border}`,
              }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: tab.color + '20' }}>
                <Icon size={16} style={{ color: tab.color }} />
              </div>
              <div>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: isActive ? tab.color : T.text }}>
                  {loading ? '…' : tab.count}
                </p>
                <p style={{ fontSize: 11, color: T.muted }}>{tab.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Carte + Légende ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* Carte */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden"
          style={{ height: 540, border: `1px solid ${T.border}`, position: 'relative' }}>
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center"
              style={{ background: T.card }}>
              <RefreshCw size={28} className="animate-spin" style={{ color: T.red }} />
            </div>
          )}
          <MapContainer
            center={[4.5, 11.0]}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />
            {allPositions.length > 0 && <FitBounds positions={allPositions} />}
            {cityGroups.map(group => {
              const dominantStatus = (() => {
                const counts: Record<string, number> = {};
                for (const o of group.orders) {
                  const g = STATUS_CFG[o.fulfillment_status]?.group ?? 'other';
                  counts[g] = (counts[g] ?? 0) + 1;
                }
                if (counts.active   > 0) return 'active';
                if (counts.recent   > 0) return 'recent';
                if (counts.delivered> 0) return 'delivered';
                return 'other';
              })();
              const markerColor = GROUP_COLORS[dominantStatus];
              const icon = makeOrderIcon(markerColor, group.orders.length);

              return (
                <Marker key={group.city} position={group.coords} icon={icon}>
                  <Popup maxWidth={320} minWidth={260}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", maxHeight: 340, overflowY: 'auto' }}>
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8, color: '#111827' }}>
                        <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {group.city} — {group.orders.length} commande{group.orders.length > 1 ? 's' : ''}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {group.orders.map(o => {
                          const cfg   = STATUS_CFG[o.fulfillment_status];
                          const isDelivered = cfg?.group === 'delivered';
                          return (
                            <div key={o.id}
                              style={{
                                padding: '8px 10px',
                                borderRadius: 10,
                                background: cfg?.bg ?? 'rgba(0,0,0,0.05)',
                                border: `1px solid ${cfg?.color ?? '#ccc'}30`,
                              }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontWeight: 800, fontSize: 13, color: '#111' }}>
                                  #{o.id}
                                </span>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: cfg?.bg, color: cfg?.color }}>
                                  {cfg?.label ?? o.fulfillment_status}
                                </span>
                              </div>
                              <div style={{ fontSize: 11.5, color: '#374151', marginBottom: 3 }}>
                                {fmtXaf(o.total_xaf)}
                              </div>
                              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: isDelivered && o.courier_info ? 6 : 0 }}>
                                {fmtDate(o.created_at)}
                              </div>
                              {isDelivered && o.courier_info && (
                                <div style={{
                                  marginTop: 6, padding: '5px 8px', borderRadius: 7,
                                  background: 'rgba(16,185,129,0.08)',
                                  border: '1px solid rgba(16,185,129,0.2)',
                                }}>
                                  {o.courier_info.courier_name && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                                      <User size={11} style={{ color: '#10B981' }} />
                                      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#065F46' }}>
                                        {o.courier_info.courier_name}
                                      </span>
                                    </div>
                                  )}
                                  {o.courier_info.courier_phone && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <Phone size={11} style={{ color: '#10B981' }} />
                                      <span style={{ fontSize: 11.5, color: '#065F46' }}>
                                        {o.courier_info.courier_phone}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                              <a href={`/admin/orders/${o.id}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 6, fontSize: 11, color: '#DC2626', fontWeight: 600, textDecoration: 'none' }}>
                                Voir détail <ExternalLink size={9} />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Légende */}
        <div className="space-y-4">

          {/* Légende groupes */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>Légende</p>
            </div>
            <div className="p-4 space-y-5">
              {(['recent', 'active', 'delivered', 'other'] as const).map(group => {
                const statusesInGroup = Object.entries(STATUS_CFG)
                  .filter(([, v]) => v.group === group)
                  .filter(([k], i, arr) => arr.findIndex(([, v]) => v.label === STATUS_CFG[k].label) === i);
                return (
                  <div key={group}>
                    <div className="flex items-center gap-2 mb-2">
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: GROUP_COLORS[group], flexShrink: 0 }} />
                      <p style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{GROUP_LABELS[group]}</p>
                    </div>
                    <div className="space-y-1.5 pl-4">
                      {statusesInGroup.map(([key, cfg]) => (
                        <div key={key} className="flex items-center gap-2">
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.markerColor, flexShrink: 0 }} />
                          <p style={{ fontSize: 11.5, color: T.muted }}>{cfg.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info livraison */}
          <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-3">
              <Truck size={13} style={{ color: '#10B981' }} />
              <p style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>Livraisons effectuées</p>
            </div>
            <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
              Pour les commandes livrées, cliquez sur le marqueur pour voir le <strong style={{ color: T.text }}>nom</strong> et le <strong style={{ color: T.text }}>numéro du livreur</strong> associé.
            </p>
          </div>

          {/* Résumé par ville */}
          {cityGroups.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>Répartition par ville</p>
              </div>
              <div className="p-4 space-y-2" style={{ maxHeight: 200, overflowY: 'auto', scrollbarWidth: 'thin' }}>
                {cityGroups
                  .sort((a, b) => b.orders.length - a.orders.length)
                  .map(g => {
                    const max = Math.max(...cityGroups.map(x => x.orders.length));
                    const pct = (g.orders.length / max) * 100;
                    const dom = (() => {
                      const c: Record<string, number> = {};
                      for (const o of g.orders) {
                        const gr = STATUS_CFG[o.fulfillment_status]?.group ?? 'other';
                        c[gr] = (c[gr] ?? 0) + 1;
                      }
                      if (c.active > 0)    return 'active';
                      if (c.recent > 0)    return 'recent';
                      if (c.delivered > 0) return 'delivered';
                      return 'other';
                    })();
                    return (
                      <div key={g.city}>
                        <div className="flex items-center justify-between mb-1">
                          <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{g.city}</span>
                          <span style={{ fontSize: 11, color: T.muted }}>{g.orders.length}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 99, background: T.border }}>
                          <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: GROUP_COLORS[dom], transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tableau récapitulatif ─────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
              Commandes affichées ({filtered.length})
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: T.cardAlt }}>
                  {['#', 'Statut', 'Ville', 'Montant', 'Livreur', 'Date'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: T.muted, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((o, i) => {
                  const cfg         = STATUS_CFG[o.fulfillment_status];
                  const isDelivered = cfg?.group === 'delivered';
                  return (
                    <tr key={o.id}
                      style={{ borderTop: `1px solid ${T.border}`, background: i % 2 === 0 ? 'transparent' : T.cardAlt + '50' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: T.red, whiteSpace: 'nowrap' }}>
                        <a href={`/admin/orders/${o.id}`} style={{ color: T.red, textDecoration: 'none' }}>#{o.id}</a>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                          background: cfg?.bg ?? 'rgba(0,0,0,0.05)',
                          color: cfg?.color ?? T.muted,
                        }}>
                          {cfg?.label ?? o.fulfillment_status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12.5, color: T.text }}>{o.city}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12.5, color: T.text, whiteSpace: 'nowrap' }}>{fmtXaf(o.total_xaf)}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {isDelivered && o.courier_info ? (
                          <div>
                            {o.courier_info.courier_name && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <User size={11} style={{ color: '#10B981' }} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{o.courier_info.courier_name}</span>
                              </div>
                            )}
                            {o.courier_info.courier_phone && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Phone size={11} style={{ color: '#10B981' }} />
                                <span style={{ fontSize: 11.5, color: T.muted }}>{o.courier_info.courier_phone}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: T.muted }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: T.muted, whiteSpace: 'nowrap' }}>
                        {fmtDate(o.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
