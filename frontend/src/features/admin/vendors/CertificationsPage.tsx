// frontend/src/features/admin/vendors/CertificationsPage.tsx
// Certifications vendeurs — tableau de bord admin BelivaY
// Vue globale des tiers BRONZE→DIAMOND + classement + seuils

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Award, RefreshCw, ExternalLink, TrendingUp } from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface CertifiedVendor {
  id:                number;
  business_name:     string;
  user_username:     string;
  certification_tier:'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  total_points:      number;
  city:              string;
  status:            string;
}

interface CertStats {
  by_tier: Record<string, number>;
  total_approved: number;
  avg_points: number;
  top_vendors: CertifiedVendor[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const TIER_CFG: Record<string, {
  labelKey: string; threshold: number; color: string; bg: string;
  gradient: string; benefitKeys: string[];
}> = {
  BRONZE:  {
    labelKey: 'ad4_certifications.tier.bronze', threshold: 0,    color: '#CD7F32', bg: 'rgba(205,127,50,0.12)',
    gradient: 'linear-gradient(135deg,#CD7F32,#8B5E2D)',
    benefitKeys: ['ad4_certifications.benefit.catalog_access', 'ad4_certifications.benefit.qr_code', 'ad4_certifications.benefit.standard_support'],
  },
  SILVER:  {
    labelKey: 'ad4_certifications.tier.silver', threshold: 500,  color: '#8B909A', bg: 'rgba(139,144,154,0.12)',
    gradient: 'linear-gradient(135deg,#8B909A,#5A5F6A)',
    benefitKeys: ['ad4_certifications.benefit.silver_badge', 'ad4_certifications.benefit.commission_minus_1', 'ad4_certifications.benefit.boosts_2_per_month'],
  },
  GOLD:    {
    labelKey: 'ad4_certifications.tier.gold',     threshold: 1000, color: '#C8A000', bg: 'rgba(200,160,0,0.12)',
    gradient: 'linear-gradient(135deg,#C8A000,#8B6E00)',
    benefitKeys: ['ad4_certifications.benefit.gold_badge', 'ad4_certifications.benefit.commission_minus_2', 'ad4_certifications.benefit.boosts_5_per_month', 'ad4_certifications.benefit.highlighted'],
  },
  DIAMOND: {
    labelKey: 'ad4_certifications.tier.diamond',threshold: 2000, color: '#2563EB', bg: 'rgba(37,99,235,0.12)',
    gradient: 'linear-gradient(135deg,#2563EB,#1D4ED8)',
    benefitKeys: ['ad4_certifications.benefit.diamond_badge', 'ad4_certifications.benefit.commission_minus_3', 'ad4_certifications.benefit.unlimited_boosts', 'ad4_certifications.benefit.vip_24_7'],
  },
};

const TIER_ORDER = ['DIAMOND', 'GOLD', 'SILVER', 'BRONZE'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CertificationsPage() {
  const { t }          = useTranslation();
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [stats,       setStats]     = useState<CertStats | null>(null);
  const [vendors,     setVendors]   = useState<CertifiedVendor[]>([]);
  const [loading,     setLoading]   = useState(true);
  const [filterTier,  setFilterTier]= useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await http<{ stats: CertStats; vendors: CertifiedVendor[] }>(
        '/api/vendors/admin/certifications/',
        { headers: authHeader() }
      );
      setStats(data.stats);
      setVendors(data.vendors);
    } catch {
      toastRef.current(t('ad4_certifications.load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filterTier === 'all'
    ? vendors
    : vendors.filter(v => v.certification_tier === filterTier);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            {t('ad4_certifications.title')}
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {stats ? t('ad4_certifications.summary', { approved: stats.total_approved, avg: stats.avg_points.toFixed(0) }) : '—'}
          </p>
        </div>
        <button onClick={() => load()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
          style={{ background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.1)')}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{t('ad4_certifications.refresh')}</span>
        </button>
      </div>

      {/* Tiers overview — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TIER_ORDER.map(tier => {
          const cfg   = TIER_CFG[tier];
          const count = stats?.by_tier[tier] ?? 0;
          const active = filterTier === tier;
          return (
            <button key={tier}
              onClick={() => setFilterTier(active ? 'all' : tier)}
              className="rounded-2xl p-4 text-left transition-all"
              style={{
                background: active ? cfg.bg : T.card,
                border: `2px solid ${active ? cfg.color + '60' : T.border}`,
              }}>
              {/* Icône tier */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: cfg.gradient }}>
                <Award size={18} style={{ color: '#fff' }} />
              </div>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                {t(cfg.labelKey)}
              </p>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: loading ? T.muted : T.text, lineHeight: 1, marginBottom: 6 }}>
                {loading ? '—' : count}
              </p>
              <p style={{ fontSize: 10.5, color: cfg.color, fontWeight: 600 }}>
                {t('ad4_certifications.threshold_pts', { count: cfg.threshold })}
              </p>
            </button>
          );
        })}
      </div>

      {/* Seuils & Avantages */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
          <TrendingUp size={14} style={{ color: T.red }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t('ad4_certifications.thresholds_title')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                {[t('ad4_certifications.col_tier'), t('ad4_certifications.col_min_threshold'), t('ad4_certifications.col_benefits'), t('ad4_certifications.col_active_vendors')].map((h, i) => (
                  <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIER_ORDER.map((tier, i) => {
                const cfg   = TIER_CFG[tier];
                const count = stats?.by_tier[tier] ?? 0;
                return (
                  <tr key={tier}
                    style={{ borderBottom: i < TIER_ORDER.length - 1 ? `1px solid ${T.border}` : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 16px' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: cfg.gradient }}>
                          <Award size={14} style={{ color: '#fff' }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: cfg.color }}>{t(cfg.labelKey)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                        {cfg.threshold === 0 ? t('ad4_certifications.free') : t('ad4_certifications.threshold_pts', { count: cfg.threshold })}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {cfg.benefitKeys.map((bKey, j) => (
                          <span key={j} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: cfg.bg, color: cfg.color }}>
                            {t(bKey)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => setFilterTier(filterTier === tier ? 'all' : tier)}
                        style={{ fontSize: 14, fontWeight: 800, color: cfg.color }}>
                        {loading ? '—' : count}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Classement vendeurs */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
          <div className="flex items-center gap-2">
            <Award size={14} style={{ color: T.red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
              {t('ad4_certifications.ranking_title', { tier: filterTier !== 'all' ? t(TIER_CFG[filterTier]?.labelKey) : t('ad4_certifications.all_tiers') })}
            </span>
            <span style={{ fontSize: 11, color: T.muted }}>({filtered.length})</span>
          </div>
          {filterTier !== 'all' && (
            <button onClick={() => setFilterTier('all')} style={{ fontSize: 12, color: T.red, fontWeight: 600 }}>
              {t('ad4_certifications.see_all')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Award size={32} style={{ color: T.muted }} />
            <p style={{ fontSize: 14, color: T.muted }}>{t('ad4_certifications.no_vendor_in_tier')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                  {['#', t('ad4_certifications.col_shop'), t('ad4_certifications.col_tier'), t('ad4_certifications.col_points'), t('ad4_certifications.col_city'), ''].map((h, i) => (
                    <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => {
                  const cfg = TIER_CFG[v.certification_tier];
                  return (
                    <tr key={v.id}
                      style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {/* Rang */}
                      <td style={{ padding: '12px 14px' }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-black"
                          style={{ background: i < 3 ? cfg?.gradient : T.border, color: i < 3 ? '#fff' : T.muted }}>
                          {i + 1}
                        </div>
                      </td>
                      {/* Boutique */}
                      <td style={{ padding: '12px 14px' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{v.business_name}</p>
                        <p style={{ fontSize: 11, color: T.muted }}>@{v.user_username}</p>
                      </td>
                      {/* Tier */}
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: cfg?.gradient }}>
                            <Award size={12} style={{ color: '#fff' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: cfg?.color }}>{cfg ? t(cfg.labelKey) : v.certification_tier}</span>
                        </div>
                      </td>
                      {/* Points */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: cfg?.color }}>
                          {v.total_points.toLocaleString('fr-FR')}
                        </span>
                        <span style={{ fontSize: 11, color: T.muted, marginLeft: 3 }}>{t('ad4_certifications.pts_suffix')}</span>
                      </td>
                      {/* Ville */}
                      <td style={{ padding: '12px 14px', fontSize: 12.5, color: T.muted }}>{v.city || '—'}</td>
                      {/* Lien */}
                      <td style={{ padding: '12px 14px' }}>
                        <Link to={`/admin/vendors/${v.id}`}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.text; (e.currentTarget as HTMLElement).style.borderColor = T.red + '40'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.muted; (e.currentTarget as HTMLElement).style.borderColor = T.border; }}>
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}