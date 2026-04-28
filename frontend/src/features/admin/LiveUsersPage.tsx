// frontend/src/features/admin/LiveUsersPage.tsx
// Utilisateurs connectés en temps réel — polling 30s

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio, RefreshCw, Users, Store, User, Clock,
  Monitor, Smartphone, Globe, MapPin, ExternalLink,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface LiveUser {
  id:          number;
  username:    string;
  full_name:   string;
  role:        'admin' | 'vendor' | 'buyer';
  city:        string | null;
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
  admin:  { label: 'Admin',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  vendor: { label: 'Vendeur',  color: '#F47920', bg: 'rgba(244,121,32,0.12)' },
  buyer:  { label: 'Acheteur', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
};

const DEVICE_ICONS = {
  desktop: Monitor,
  mobile:  Smartphone,
  tablet:  Smartphone,
};

const REFRESH_INTERVAL = 30_000;

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function LiveUsersPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [stats,     setStats]     = useState<LiveStats | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [countdown, setCountdown] = useState(30);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await http<LiveStats>('/api/vendors/admin/live/users/', { headers: authHeader() });
      setStats(data);
      setCountdown(30);
    } catch {
      if (!silent) toastRef.current('Erreur chargement des utilisateurs connectés', 'error');
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

  const desktopCount = stats?.by_device?.find(d => d.device === 'desktop')?.count ?? 0;
  const mobileCount  = stats?.by_device?.find(d => d.device === 'mobile' || d.device === 'tablet')
    ? (stats?.by_device?.filter(d => d.device !== 'desktop').reduce((s, d) => s + d.count, 0) ?? 0)
    : 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text }}>
              Utilisateurs Connectés
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981' }}>LIVE</span>
            </div>
          </div>
          <p style={{ fontSize: 12.5, color: T.muted }}>
            Actualisation dans <strong style={{ color: T.text }}>{countdown}s</strong>
            {stats?.last_updated && <span> · MàJ {fmtTime(stats.last_updated)}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Bouton carte */}
          <Link to="/admin/live/map"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
            style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}>
            <MapPin size={13} />
            <span className="hidden sm:inline">Voir la carte</span>
          </Link>
          <button onClick={() => load(false)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
            style={{ background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-20">
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : stats ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'En ligne',  value: stats.total_online, accent: '#10B981', icon: Radio   },
              { label: 'Acheteurs', value: stats.buyers,       accent: '#3B82F6', icon: Users   },
              { label: 'Vendeurs',  value: stats.vendors,      accent: '#F47920', icon: Store   },
              { label: 'Admins',    value: stats.admins,       accent: '#EF4444', icon: User    },
            ].map((k, i) => {
              const Icon = k.icon;
              return (
                <div key={i} className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{k.label}</span>
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: k.accent + '18' }}>
                      <Icon size={13} style={{ color: k.accent }} />
                    </div>
                  </div>
                  <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: k.accent, lineHeight: 1 }}>
                    {k.value}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Device breakdown */}
          {(desktopCount + mobileCount > 0) && (
            <div className="rounded-2xl p-4 flex items-center gap-6" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-2">
                <Monitor size={14} style={{ color: T.muted }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{desktopCount}</span>
                <span style={{ fontSize: 12, color: T.muted }}>desktop</span>
              </div>
              <div style={{ flex: 1, height: 6, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(desktopCount / (desktopCount + mobileCount) * 100)}%`, background: '#3B82F6', borderRadius: 3 }} />
              </div>
              <div className="flex items-center gap-2">
                <Smartphone size={14} style={{ color: T.muted }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{mobileCount}</span>
                <span style={{ fontSize: 12, color: T.muted }}>mobile</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Sessions actives */}
            <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                <div className="flex items-center gap-2">
                  <Users size={14} style={{ color: T.red }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Sessions actives ({stats.users.length})</span>
                </div>
                <Link to="/admin/live/map"
                  style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} /> Carte complète
                </Link>
              </div>
              {stats.users.length === 0 ? (
                <div className="flex flex-col items-center py-14 gap-3">
                  <Radio size={30} style={{ color: T.muted }} />
                  <p style={{ fontSize: 14, color: T.muted }}>Aucun utilisateur connecté</p>
                  <p style={{ fontSize: 12, color: T.muted, maxWidth: 280, textAlign: 'center', lineHeight: 1.6 }}>
                    Les utilisateurs apparaissent ici dès qu'ils font une requête API (navigation, panier, commandes…)
                  </p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: T.border }}>
                  {stats.users.map(u => {
                    const cfg     = ROLE_CFG[u.role] ?? ROLE_CFG.buyer;
                    const DevIcon = DEVICE_ICONS[u.device] ?? Monitor;
                    return (
                      <div key={u.id} className="flex items-center gap-3 px-5 py-3"
                        onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {u.username[0]?.toUpperCase()}
                        </div>
                        {/* Infos */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <Link to={`/admin/users/${u.id}`}
                              style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                              @{u.username}
                            </Link>
                            <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: cfg.bg, color: cfg.color }}>
                              {cfg.label}
                            </span>
                            <span className="flex items-center gap-1" style={{ fontSize: 11, color: T.muted }}>
                              <DevIcon size={10} /> {u.device}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1" style={{ fontSize: 11.5, color: T.muted }}>
                              <Globe size={10} />
                              <span className="truncate max-w-[180px]">{u.page}</span>
                            </span>
                            {u.city && (
                              <span className="flex items-center gap-1" style={{ fontSize: 11.5, color: T.muted }}>
                                <MapPin size={10} /> {u.city}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Temps */}
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center justify-end gap-1" style={{ fontSize: 11.5, color: T.muted }}>
                            <Clock size={11} /> {u.session_min}min
                          </div>
                          <p style={{ fontSize: 10.5, color: T.muted }}>{fmtTime(u.last_seen)}</p>
                        </div>
                        {/* Lien fiche */}
                        <Link to={`/admin/users/${u.id}`}
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.text; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.muted; }}>
                          <ExternalLink size={11} />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Colonne droite */}
            <div className="space-y-4">

              {/* Pages actives */}
              <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                  <Globe size={14} style={{ color: T.red }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Pages actives</span>
                </div>
                <div className="p-4 space-y-2.5">
                  {stats.by_page.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: T.muted, textAlign: 'center', padding: '8px 0' }}>—</p>
                  ) : stats.by_page.map((p, i) => {
                    const max = stats.by_page[0]?.count ?? 1;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span style={{ fontSize: 12, color: T.text }} className="truncate max-w-[160px]">{p.page}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.red, flexShrink: 0, marginLeft: 8 }}>{p.count}</span>
                        </div>
                        <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.round(p.count / max * 100)}%`, background: T.red, borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Par ville */}
              <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                  <MapPin size={14} style={{ color: T.red }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Par ville</span>
                </div>
                <div className="p-4 space-y-2">
                  {stats.by_city.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: T.muted, textAlign: 'center', padding: '8px 0' }}>—</p>
                  ) : stats.by_city.map((c, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5"
                      style={{ borderBottom: i < stats.by_city.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                      <span style={{ fontSize: 12.5, color: T.text }}>{c.city}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6' }}>{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}