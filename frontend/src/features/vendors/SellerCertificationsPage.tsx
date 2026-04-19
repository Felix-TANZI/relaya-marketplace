// frontend/src/features/vendors/SellerCertificationsPage.tsx
// Page Certifications — espace vendeur BelivaY.

import { useEffect, useState, useCallback } from 'react';
import { Award, RefreshCw, Star, TrendingUp, ShoppingBag, Clock, Shield, ChevronRight } from 'lucide-react';
import { vendorsApi, type CertificationData, type CertificationTierInfo } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';

const T = {
  orange: '#F47920', orangeL: '#FFF3E8', orangeB: 'rgba(244,121,32,0.12)',
  cream: '#F5F0E8', creamAlt: '#EDE7DC',
  white: '#FFFFFF', border: '#E8E2D9',
  text: '#1A1209', muted: '#7C6E5A', mutedL: '#B8A898',
  green: '#16A34A', greenL: 'rgba(22,163,74,0.10)',
  violet: '#7C3AED', violetL: 'rgba(124,58,237,0.10)',
};

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  BRONZE:  { bg: 'rgba(205,127,50,0.12)',  text: '#CD7F32', border: 'rgba(205,127,50,0.3)'  },
  SILVER:  { bg: 'rgba(168,169,173,0.15)', text: '#7C8490', border: 'rgba(168,169,173,0.35)' },
  GOLD:    { bg: 'rgba(255,215,0,0.15)',   text: '#C8A000', border: 'rgba(255,215,0,0.35)'  },
  DIAMOND: { bg: 'rgba(37,99,235,0.12)',   text: '#2563EB', border: 'rgba(37,99,235,0.3)'   },
};

const TIER_ICONS: Record<string, string> = {
  BRONZE: '🥉', SILVER: '🥈', GOLD: '🥇', DIAMOND: '💎',
};

const HOW_ICONS: Record<string, React.ComponentType<React.ComponentProps<typeof ChevronRight>>> = {
  'Vendre un produit':               ShoppingBag,
  'Recevoir un avis 5 etoiles':      Star,
  'Recevoir un avis 4 etoiles':      Star,
  'Anciennete (chaque mois)':        Clock,
  '0 litige sur 30 jours':           Shield,
  'Taux livraison >= 95% (30 jours)':TrendingUp,
  'Taux livraison >= 85% (30 jours)':TrendingUp,
};

function TierCard({ tier, isCurrent }: { tier: CertificationTierInfo; isCurrent: boolean }) {
  const colors = TIER_COLORS[tier.code] || TIER_COLORS.BRONZE;
  return (
    <div className="rounded-2xl p-5 space-y-3 transition-all"
      style={{
        background:  isCurrent ? T.white : T.cream,
        border:      `2px solid ${isCurrent ? colors.border : T.border}`,
        boxShadow:   isCurrent ? `0 4px 20px ${colors.border}` : 'none',
        opacity:     tier.is_unlocked ? 1 : 0.5,
      }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{TIER_ICONS[tier.code]}</span>
          <div>
            <p className="font-black text-[15px]" style={{ color: colors.text, fontFamily: 'Poppins,sans-serif' }}>
              {tier.label}
            </p>
            <p className="text-[11px]" style={{ color: T.muted }}>
              {tier.threshold === 0 ? 'Dès le départ' : `À partir de ${tier.threshold} pts`}
            </p>
          </div>
        </div>
        {isCurrent && (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: colors.bg, color: colors.text }}>
            Niveau actuel
          </span>
        )}
        {!tier.is_unlocked && (
          <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: T.creamAlt, color: T.muted }}>
            Verrouillé
          </span>
        )}
      </div>
      <ul className="space-y-1.5">
        {tier.benefits.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: T.muted }}>
            <span className="flex-shrink-0 mt-0.5" style={{ color: colors.text }}>✓</span>
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SellerCertificationsPage() {
  const { showToast } = useToast();
  const [data,    setData]    = useState<CertificationData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setLoading(true); setData(await vendorsApi.getCertifications()); }
    catch { showToast('Erreur de chargement', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin" style={{ color: T.orange }}/>
    </div>
  );

  if (!data) return null;

  const tierColors = TIER_COLORS[data.current_tier] || TIER_COLORS.BRONZE;

  return (
    <div className="space-y-6 pb-10 max-w-4xl mx-auto">

      {/* EN-TÊTE */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2 font-black text-[22px]"
            style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            <Award size={20} style={{ color: T.orange }}/> Certifications BelivaY
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>
            Progressez pour débloquer visibilité et avantages
          </p>
        </div>
        <button type="button" onClick={load}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold"
          style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
          <RefreshCw size={13}/> Actualiser
        </button>
      </div>

      {/* PROGRESSION */}
      <div className="rounded-2xl p-6 space-y-4"
        style={{ background: T.white, border: `2px solid ${tierColors.border}`, boxShadow: `0 4px 24px ${tierColors.border}` }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{TIER_ICONS[data.current_tier]}</span>
            <div>
              <p className="font-black text-[22px]" style={{ color: tierColors.text, fontFamily: 'Poppins,sans-serif' }}>
                {data.current_tier_label}
              </p>
              <p className="text-[13px]" style={{ color: T.muted }}>
                {data.total_points} points accumulés
              </p>
            </div>
          </div>
          {data.next_tier && (
            <div className="flex items-center gap-2 text-[12.5px]" style={{ color: T.muted }}>
              <span>{data.points_remaining} pts pour atteindre</span>
              <span className="text-xl">{TIER_ICONS[data.next_tier]}</span>
              <span className="font-bold" style={{ color: TIER_COLORS[data.next_tier]?.text }}>
                {data.next_tier_label}
              </span>
            </div>
          )}
        </div>

        {/* Barre de progression */}
        {data.next_tier && (
          <div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: T.creamAlt }}>
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${data.progress_pct}%`,
                  background: `linear-gradient(90deg, ${tierColors.text}, ${TIER_COLORS[data.next_tier]?.text || T.orange})`,
                }}/>
            </div>
            <div className="flex justify-between mt-1.5 text-[11px]" style={{ color: T.mutedL }}>
              <span>{data.total_points} pts</span>
              <span className="font-bold" style={{ color: tierColors.text }}>{data.progress_pct}%</span>
              <span>{data.next_threshold} pts</span>
            </div>
          </div>
        )}
      </div>

      {/* DÉTAIL DES POINTS */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: T.white, border: `1px solid ${T.border}` }}>
        <div className="px-5 py-4" style={{ background: T.cream, borderBottom: `1px solid ${T.border}` }}>
          <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            Détail de vos points
          </p>
        </div>
        <div className="divide-y" style={{ borderColor: T.border }}>
          {Object.entries(data.breakdown).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between px-5 py-3.5">
              <p className="text-[12.5px]" style={{ color: T.muted }}>{val.detail}</p>
              <span className="font-bold text-[13px]" style={{ color: val.points > 0 ? T.green : T.mutedL }}>
                +{val.points} pts
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-3.5" style={{ background: T.orangeL }}>
            <p className="font-bold text-[13.5px]" style={{ color: T.text }}>Total</p>
            <span className="font-black text-[16px]" style={{ color: T.orange }}>{data.total_points} pts</span>
          </div>
        </div>
      </div>

      {/* GRILLE DES TIERS */}
      <div>
        <h2 className="font-bold text-[15px] mb-4" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
          Niveaux de certification
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.tiers.map(tier => (
            <TierCard key={tier.code} tier={tier} isCurrent={tier.is_current}/>
          ))}
        </div>
      </div>

      {/* COMMENT GAGNER DES POINTS */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: T.white, border: `1px solid ${T.border}` }}>
        <div className="px-5 py-4" style={{ background: T.orangeL, borderBottom: `1px solid ${T.orangeB}` }}>
          <p className="font-bold text-[14px]" style={{ color: T.orange, fontFamily: 'Poppins,sans-serif' }}>
            Comment gagner des points ?
          </p>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.how_to_earn.map((item, i) => {
            const Icon = HOW_ICONS[item.action] || ChevronRight;
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: T.cream }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.orangeB }}>
                  <Icon size={14} style={{ color: T.orange }}/>
                </div>
                <div>
                  <p className="text-[12.5px] font-semibold" style={{ color: T.text }}>{item.action}</p>
                  <p className="text-[11.5px] font-bold" style={{ color: T.orange }}>{item.points}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
