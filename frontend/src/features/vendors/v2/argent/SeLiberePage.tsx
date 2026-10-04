// frontend/src/features/vendors/v2/argent/SeLiberePage.tsx
// Écran « Se libère — quand » — VD-09 fig. 3. Détail par commande du délai de
// sécurité qui doit s'écouler après la confirmation du client avant que les
// fonds deviennent retirables.
//
// Pont API (aucun nouveau endpoint) : vendorsApi.getOrders() + getProfile().
// MANQUE BACKEND : il n'existe pas de champ dédié « buyer_confirmed_at » ou
// « delivered_at » sur VendorOrder — seuls created_at/updated_at existent.
// Comme SellerPendingFundsPage.tsx (v1, cf. ligne 56-61), on utilise
// updated_at comme proxy de l'horodatage du dernier changement de statut.
// C'est une approximation assumée, pas une donnée inventée : le champ existe
// réellement, on choisit juste quel timestamp il représente le mieux.
//
// Règle produit confirmée par le propriétaire (hors mockup) : le versement se
// fait À LA DEMANDE du vendeur, jamais par un virement automatique du
// vendredi. Le mockup SeLibere.html (fig. 3) affiche « Versé vendredi 25
// sept. » et l'étape 5 « Versement : le vendredi qui suit » — cette page NE
// REPREND PAS cette formulation : elle est remplacée par un texte « retrait à
// la demande », qui est la décision produit réellement en vigueur.
//
// Délai de libération par palier : TIER_RELEASE_DAYS (compte/shared/format.ts,
// VD-09 §LIB-01 / VD-10 §PAL-02) — Bronze/Argent 3 j, Or/Platine 1 j.
// Auto-confirmation : 4 jours (Addendum Décisions v1.0 §11, PAS 48 h comme
// l'ancienne constante AUTO_CONFIRM_H de SellerPendingFundsPage.tsx).

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Clock, Lock, Package, ShieldAlert } from 'lucide-react';

import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type VendorOrder } from '@/services/api/vendors';
import { palette, primaryGradient } from '../theme';
import ScreenHeader from '../compte/shared/ScreenHeader';
import Collapsible from '../compte/shared/Collapsible';
import { mapLegacyTier, TIER_RELEASE_DAYS, formatXAF } from '../compte/shared/format';

const AUTO_CONFIRM_H = 96; // 4 jours — Addendum Décisions v1.0 §11.

function orderRef(id: number): string {
  return `BLV-${String(id).padStart(5, '0')}`;
}
function fmtDateTime(iso: string, locale: 'fr' | 'en'): string {
  return new Date(iso).toLocaleString(locale === 'en' ? 'en-US' : 'fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

interface Timed {
  order: VendorOrder;
  deadlineMs: number | null; // null = pas encore de compte à rebours (délai pas commencé)
  startedMs: number | null;
  phase: 'releasing' | 'not_started' | 'auto_confirm';
}

export default function SeLiberePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('en') ? 'en' : 'fr';
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [tier, setTier] = useState<ReturnType<typeof mapLegacyTier>>('BRONZE');
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    Promise.all([vendorsApi.getOrders(), vendorsApi.getProfile()])
      .then(([ords, profile]) => {
        if (cancelled) return;
        setOrders(ords);
        setTier(mapLegacyTier(profile.certification_tier));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const releaseH = TIER_RELEASE_DAYS[tier] * 24;

  const pending = useMemo(
    () => orders.filter((o) => ['BLOCKED', 'RELEASE_PENDING', 'DISPUTED'].includes(o.escrow_status)),
    [orders],
  );
  const frozen = useMemo(
    () => pending.filter((o) => o.escrow_status === 'DISPUTED'),
    [pending],
  );

  const timed: Timed[] = useMemo(() => pending
    .filter((o) => o.escrow_status !== 'DISPUTED')
    .map((o) => {
      const updated = new Date(o.updated_at ?? o.created_at).getTime();
      if (o.escrow_status === 'RELEASE_PENDING') {
        return { order: o, startedMs: updated, deadlineMs: updated + releaseH * 3_600_000, phase: 'releasing' as const };
      }
      if (o.fulfillment_status === 'DELIVERED') {
        return { order: o, startedMs: updated, deadlineMs: updated + (AUTO_CONFIRM_H + releaseH) * 3_600_000, phase: 'auto_confirm' as const };
      }
      return { order: o, startedMs: null, deadlineMs: null, phase: 'not_started' as const };
    })
    .sort((a, b) => (a.deadlineMs ?? Infinity) - (b.deadlineMs ?? Infinity)),
  [pending, releaseH]);

  const featured = timed.find((x) => x.deadlineMs !== null) ?? null;
  const others = timed.filter((x) => x !== featured);

  const tierLabel = t(`sl11_compte.tier_${tier.toLowerCase()}`);

  function remaining(deadlineMs: number) {
    const diff = Math.max(0, deadlineMs - nowMs);
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return { h, m, expired: diff <= 0 };
  }

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader
        title={t('sl12_argent.se_libere_title')}
        subtitle={t('sl12_argent.se_libere_subtitle')}
      />

      {loading ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: p.card, border: `1px solid ${p.border}`, color: p.textMuted, fontSize: 12.5 }}>
          {t('sl12_argent.loading')}
        </div>
      ) : (
        <>
          {featured && featured.deadlineMs !== null ? (
            <div className="rounded-2xl p-5 mb-4" style={{ background: primaryGradient(p) }}>
              <p className="font-bold" style={{ fontSize: 11.5, letterSpacing: 0.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.72)' }}>
                {orderRef(featured.order.id)}
              </p>
              {(() => {
                const r = remaining(featured.deadlineMs!);
                return (
                  <p className="font-black mt-1" style={{ fontSize: 30, color: '#fff', letterSpacing: -0.5 }}>
                    {r.expired
                      ? t('sl12_argent.se_libere_imminent')
                      : t('sl12_argent.se_libere_countdown', { h: r.h, m: r.m })}
                  </p>
                );
              })()}
              {(() => {
                const total = featured.deadlineMs! - (featured.startedMs ?? featured.deadlineMs!);
                const elapsed = nowMs - (featured.startedMs ?? nowMs);
                const pct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 100;
                return (
                  <div className="w-full rounded-full overflow-hidden mt-3 mb-1" style={{ height: 8, background: 'rgba(255,255,255,0.22)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#fff' }} />
                  </div>
                );
              })()}
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.18)' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>{t('sl12_argent.se_libere_you_keep')}</span>
                <span className="font-black" style={{ fontSize: 18, color: '#fff' }}>{formatXAF(featured.order.vendor_net_amount)}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-5 mb-4 text-center" style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}>
              <Lock size={22} color={p.textMuted} className="mx-auto mb-2" />
              <p className="font-bold" style={{ fontSize: 13.5, color: p.text }}>{t('sl12_argent.se_libere_empty_title')}</p>
              <p style={{ fontSize: 12, color: p.textMuted, marginTop: 4 }}>{t('sl12_argent.se_libere_empty_sub')}</p>
            </div>
          )}

          <div className="flex items-start gap-2 mb-4" style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.5 }}>
            <ShieldAlert size={15} color={p.amber} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>
              {TIER_RELEASE_DAYS[tier] === 1
                ? t('sl12_argent.se_libere_tier_hint_singular', { tier: tierLabel, days: TIER_RELEASE_DAYS[tier] })
                : t('sl12_argent.se_libere_tier_hint_plural', { tier: tierLabel, days: TIER_RELEASE_DAYS[tier] })}
            </span>
          </div>

          {others.length > 0 || timed.some((x) => x.phase === 'not_started') ? (
            <>
              <p className="font-bold mb-2" style={{ fontSize: 13, color: p.text }}>{t('sl12_argent.se_libere_in_progress')}</p>
              <div className="rounded-2xl overflow-hidden mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
                {timed.filter((x) => x !== featured).map((x) => (
                  <button
                    key={x.order.id}
                    type="button"
                    onClick={() => navigate(`/seller/orders/${x.order.id}`)}
                    className="w-full flex items-center gap-3 text-left"
                    style={{ padding: '13px 14px', borderBottom: `1px solid ${p.border}` }}
                  >
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: p.cardAlt, color: p.textMuted }}>
                      <Package size={16} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold" style={{ fontSize: 12.5, color: p.orange }}>{orderRef(x.order.id)}</span>
                      <span className="block" style={{ fontSize: 11, color: p.textMuted, marginTop: 2 }}>
                        {x.phase === 'not_started'
                          ? t('sl12_argent.se_libere_not_started')
                          : x.deadlineMs !== null
                            ? (() => {
                              const r = remaining(x.deadlineMs!);
                              return r.expired ? t('sl12_argent.se_libere_imminent') : t('sl12_argent.se_libere_countdown', { h: r.h, m: r.m });
                            })()
                            : t('sl12_argent.se_libere_not_started')}
                      </span>
                    </span>
                    <span className="font-black flex-shrink-0" style={{ fontSize: 13.5, color: p.text }}>
                      {formatXAF(x.order.vendor_net_amount)}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {frozen.length > 0 ? (
            <div
              className="flex items-start gap-2.5 rounded-2xl mb-4"
              style={{ padding: 14, background: `${p.red}14`, border: `1px solid ${p.red}44` }}
            >
              <ShieldAlert size={16} color={p.red} style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: p.text, lineHeight: 1.5 }}>
                {t('sl12_argent.se_libere_frozen_note')}
              </span>
            </div>
          ) : null}

          <Collapsible title={t('sl11_compte.how_it_works')}>
            <p className="mb-1.5">{t('sl12_argent.se_libere_how_1')}</p>
            <p className="mb-1.5">{t('sl12_argent.se_libere_how_2')}</p>
            <p className="mb-1.5">{t('sl12_argent.se_libere_how_3', { days: AUTO_CONFIRM_H / 24 })}</p>
            <p className="mb-1.5">
              {TIER_RELEASE_DAYS[tier] === 1
                ? t('sl12_argent.se_libere_how_4_singular', { days: TIER_RELEASE_DAYS[tier] })
                : t('sl12_argent.se_libere_how_4_plural', { days: TIER_RELEASE_DAYS[tier] })}
            </p>
            <p>{t('sl12_argent.se_libere_how_5')}</p>
          </Collapsible>

          {featured && featured.startedMs ? (
            <p className="mt-3 flex items-center gap-1.5" style={{ fontSize: 10.5, color: p.textMuted }}>
              <Clock size={11} />
              {t('sl12_argent.se_libere_reference_since', { date: fmtDateTime(new Date(featured.startedMs).toISOString(), locale) })}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
