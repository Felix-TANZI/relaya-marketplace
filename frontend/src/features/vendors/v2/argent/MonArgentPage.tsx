// frontend/src/features/vendors/v2/argent/MonArgentPage.tsx
// Écran "Mon argent" — VD-09 §fig.1 (Argent.html) + §fig.2 (Argent_prep.html).
// Route recommandée : /seller/v2/argent, écran RACINE (même traitement que
// /seller/v2/accueil : le header verre + le dock de navigation sont déjà
// rendus par <SellerLayout> — ajouter ce chemin à V2_ROOT_PATHS). Onglets
// internes "Résumé / Se libère / Gelé / Mes gains" répartis sur 4 routes
// (seul "Résumé" et "Mes gains" sont construits ici : "Se libère" et "Gelé"
// sont construits par un autre lot en parallèle, sur /seller/v2/argent/
// se-libere et /seller/v2/argent/gele — les libellés d'onglets de ce fichier
// réutilisent directement leurs clés i18n, sl12_argent.se_libere_title /
// gele_title, pour rester synchrones sans dupliquer le texte).
//
// DÉCISION PRODUIT APPLIQUÉE ICI (verrouillée pendant ce lot) : le vendeur
// retire son argent QUAND IL VEUT (retrait à la demande, flux déjà réel —
// vendorsApi.createWithdrawal()/SellerWalletPage.tsx), il n'y a PAS de
// versement poussé automatiquement le vendredi. Le mockup source (Argent.html)
// suppose l'inverse ("À verser vendredi 25 sept.", badge "Automatique ·
// vérifié · sans frais") : reformulé ci-dessous en "Disponible à retirer" +
// CTA "Retirer mon argent" qui renvoie vers le vrai formulaire de retrait
// (/seller/wallet, pas encore reconstruit en v2 dans ce lot). Le taux de
// frais de retrait est RÉEL (PlatformSettings.withdrawal_fee_percent via
// vendorsApi.getPaymentSummary()) : on ne répète donc jamais "sans frais"
// comme le fait le mockup.
//
// Pont API : vendorsV2Api.getMoneySummary() (GET /api/vendors/v2/money-summary/,
// voir backend/apps/vendors/views_money_v2.py) donne directement les 4 états
// VD-09 affichés ici (à verser/se libère/en cours/gelé) + le total en
// circulation — mêmes limites documentées dans ce fichier backend (ex. "à
// verser" vs "versé" approximé via WithdrawalRequest, pas de table Payout
// dédiée). vendorsApi.getPaymentSummary() complète avec le taux de frais de
// retrait et le numéro de versement par défaut. "Ce que vous gardez" (ce
// mois-ci) n'a pas d'endpoint dédié : calculé ici à partir de
// vendorsApi.getOrders() filtrées sur escrow_status RELEASED et updated_at
// dans le mois en cours — même proxy "t_fermeture ≈ updated_at" que
// documenté dans views_money_v2.py (limite n°2).
//
// isPrepAccess (rôle "Préparation", Argent_prep.html) : AUCUN rôle distinct
// n'existe encore côté session (même gap que accueil/useAccueilData.ts:58,
// commenté ACC-26) — toujours false aujourd'hui. Le bloc restreint ci-dessous
// est donc du code mort tant que ce rôle n'existe pas côté backend, mais il
// respecte la discipline du reste du dossier v2/ (jamais une branche
// silencieusement supprimée faute de donnée pour l'alimenter).

import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Info, Lock, ShieldCheck, TriangleAlert, Wallet } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette, DARK } from '../theme';
import {
  vendorsApi,
  type VendorOrder,
  type VendorPaymentSummary,
  type VendorProfile,
} from '@/services/api/vendors';
import { vendorsV2Api, type VendorMoneySummary } from '@/services/api/vendorsV2';
import { OperatorLogo } from '@/features/payments/OperatorLogo';
import { formatXaf, formatDaysLeft, isSameMonth } from './format';

const TABS = [
  { path: '/seller/v2/argent', labelKey: 'sl12_argent.resume_tab_label' },
  { path: '/seller/v2/argent/se-libere', labelKey: 'sl12_argent.se_libere_title' },
  { path: '/seller/v2/argent/gele', labelKey: 'sl12_argent.gele_title' },
  { path: '/seller/v2/argent/gains', labelKey: 'sl12_argent.gains_title' },
] as const;

/** Barre de 4 onglets — dupliquée volontairement dans MesGainsPage.tsx (pas
 * de fichier partagé ici : les onglets "Se libère"/"Gelé" sont construits par
 * un autre lot en parallèle dans ce même dossier, voir l'en-tête). */
function ArgentTabs() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex rounded-full p-1 mb-4" style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}>
      {TABS.map((tab) => {
        const active = location.pathname === tab.path
          || (tab.path === '/seller/v2/argent' && location.pathname === '/seller/v2/argent/');
        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(tab.path)}
            className="flex-1 rounded-full font-bold transition-colors"
            style={{
              padding: '9px 6px',
              fontSize: 11.5,
              background: active ? p.card : 'transparent',
              color: active ? p.text : p.textMuted,
              boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : undefined,
            }}
          >
            {t(tab.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

const OP_LABEL: Record<'MTN_MOMO' | 'ORANGE_MONEY', string> = { MTN_MOMO: 'MTN', ORANGE_MONEY: 'Orange' };

function feeRateLabel(ps: VendorPaymentSummary | null): string | null {
  if (!ps) return null;
  const n = parseFloat(String(ps.withdrawal_fee_percent));
  if (Number.isNaN(n)) return null;
  return `${n} %`;
}

export default function MonArgentPage() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const locale = i18n.language.startsWith('en') ? 'en' : 'fr';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [money, setMoney] = useState<VendorMoneySummary | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<VendorPaymentSummary | null>(null);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);

  // Pas de rôle "Préparation" distinct en session aujourd'hui — voir l'en-tête du fichier.
  const isPrepAccess = false;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, ps, prof, ords] = await Promise.all([
        vendorsV2Api.getMoneySummary(),
        vendorsApi.getPaymentSummary().catch(() => null),
        vendorsApi.getProfile().catch(() => null),
        vendorsApi.getOrders().catch(() => [] as VendorOrder[]),
      ]);
      setMoney(m);
      setPaymentSummary(ps);
      setProfile(prof);
      setOrders(ords);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="pb-24 pt-2">
        <ArgentTabs />
        <div className="rounded-3xl animate-pulse mb-4" style={{ height: 190, background: p.cardAlt }} />
        <div className="rounded-2xl animate-pulse mb-4" style={{ height: 160, background: p.cardAlt }} />
        <div className="rounded-2xl animate-pulse" style={{ height: 120, background: p.cardAlt }} />
      </div>
    );
  }

  if (error || !money) {
    return (
      <div className="pb-24 pt-2">
        <ArgentTabs />
        <div className="rounded-2xl p-5 text-center mt-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
          <p className="font-bold mb-2" style={{ fontSize: 14, color: p.text }}>{t('sl12_argent.resume_error_title')}</p>
          {error ? <p className="mb-4" style={{ fontSize: 12.5, color: p.textMuted }}>{error}</p> : null}
          <button
            type="button"
            onClick={() => load()}
            className="rounded-xl font-bold px-5"
            style={{ minHeight: 44, background: p.orange, color: '#fff', fontSize: 13 }}
          >
            {t('sl12_argent.resume_error_retry')}
          </button>
        </div>
      </div>
    );
  }

  // ── Accès Préparation (VD-09 §fig.2) : remplace tout l'écran ────────────
  if (isPrepAccess) {
    return (
      <div className="pb-24 pt-2">
        <h1 className="font-black mb-4" style={{ fontSize: 20, color: p.text }}>{t('sl12_argent.resume_page_title')}</h1>
        <div className="rounded-2xl p-5" style={{ background: p.card, border: `1px solid ${p.border}` }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: p.cardAlt, color: p.textMuted }}>
            <Lock size={24} />
          </div>
          <p className="font-bold mb-1.5" style={{ fontSize: 15, color: p.text }}>{t('sl12_argent.resume_prep_title')}</p>
          <p style={{ fontSize: 12.5, color: p.textMuted, lineHeight: 1.5 }}>
            {t('sl12_argent.resume_prep_body', { name: profile?.business_name ?? '—' })}
          </p>
          <div className="flex items-start gap-2 mt-3.5 pt-3.5" style={{ borderTop: `1px solid ${p.border}` }}>
            <ShieldCheck size={15} color={p.green} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.5 }}>{t('sl12_argent.resume_prep_hint')}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/seller/orders')}
            className="w-full rounded-2xl font-bold text-white mt-4"
            style={{ padding: 13, background: p.orange, fontSize: 13.5 }}
          >
            {t('sl12_argent.resume_prep_cta')}
          </button>
        </div>
      </div>
    );
  }

  // ── Résumé (VD-09 §fig.1) ────────────────────────────────────────────────
  const op = (profile?.default_withdrawal_operator || '') as 'MTN_MOMO' | 'ORANGE_MONEY' | '';
  const phone = profile?.default_withdrawal_phone || '';
  const last4 = phone.replace(/\D/g, '').slice(-4);
  const rate = feeRateLabel(paymentSummary);

  const totalIfReleased = money.to_pay.amount_xaf + money.releasing.amount_xaf;
  const frozenCount = money.frozen.orders.length;

  const segments = [
    { key: 'to_pay', value: money.to_pay.amount_xaf, color: p.green },
    { key: 'releasing', value: money.releasing.amount_xaf, color: p.amber },
    { key: 'in_progress', value: money.in_progress.amount_xaf, color: p.orange },
    { key: 'frozen', value: money.frozen.amount_xaf, color: p.red },
  ];
  const total = Math.max(1, money.in_circulation_xaf);

  // "Ce que vous gardez" (ce mois-ci) : pas d'endpoint dédié — dérivé des
  // commandes RELEASED dont updated_at tombe dans le mois en cours (même
  // proxy "t_fermeture ≈ updated_at" que views_money_v2.py, limite n°2).
  const now = new Date();
  const releasedThisMonth = orders.filter((o) => o.escrow_status === 'RELEASED' && isSameMonth(o.updated_at, now));
  const monthlySalesXaf = releasedThisMonth.reduce((sum, o) => sum + o.vendor_subtotal, 0);
  const monthlyKeptXaf = releasedThisMonth.reduce((sum, o) => sum + o.vendor_net_amount, 0);

  return (
    <div className="pb-24 pt-2">
      <ArgentTabs />
      <h1 className="font-black mb-1" style={{ fontSize: 20, color: p.text }}>{t('sl12_argent.resume_page_title')}</h1>
      <p className="mb-4" style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl12_argent.resume_page_subtitle')}</p>

      {/* Carte nuit — solde réellement retirable MAINTENANT (retrait à la demande). */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: DARK.card, border: `1px solid ${DARK.border}` }}>
        <p className="font-bold uppercase mb-1.5" style={{ fontSize: 10.5, letterSpacing: '.1em', color: 'rgba(255,255,255,.55)' }}>
          {t('sl12_argent.resume_hero_kicker')}
        </p>
        <p className="font-black mb-2" style={{ fontSize: 30, color: '#fff', letterSpacing: '-.02em' }}>
          {formatXaf(money.to_pay.amount_xaf)}
        </p>
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)' }}>
          {money.releasing.amount_xaf > 0
            ? t('sl12_argent.resume_hero_sub_pending', { amount: formatXaf(totalIfReleased) })
            : t('sl12_argent.resume_hero_sub_none')}
        </p>

        <div className="h-px my-3.5" style={{ background: 'rgba(255,255,255,.14)' }} />

        {op && last4 ? (
          <div className="flex items-center gap-3">
            <OperatorLogo provider={op} size={38} />
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate" style={{ fontSize: 13.5, color: '#fff' }}>
                {t('sl12_argent.resume_hero_number_row', { operator: OP_LABEL[op], last4 })}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>
                {rate ? t('sl12_argent.resume_hero_number_sub', { rate }) : null}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5" style={{ color: DARK.amber }}>
            <TriangleAlert size={16} />
            <div>
              <p className="font-bold" style={{ fontSize: 12.5 }}>{t('sl12_argent.resume_hero_number_missing')}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>{t('sl12_argent.resume_hero_number_missing_sub')}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/seller/wallet')}
          className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white mt-4"
          style={{ padding: 13, background: p.orange, fontSize: 13.5 }}
        >
          <Wallet size={15} />
          {op && last4 ? t('sl12_argent.resume_hero_cta_withdraw') : t('sl12_argent.resume_hero_cta_add_number')}
        </button>
      </div>

      {/* Carte "Où est votre argent" — 4 états VD-09, données réelles vendorsV2Api.getMoneySummary(). */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <p className="font-bold mb-3" style={{ fontSize: 14, color: p.text }}>{t('sl12_argent.resume_where_title')}</p>
        <div className="flex gap-0.5 rounded-full overflow-hidden mb-3" style={{ height: 8 }}>
          {segments.map((s) => (
            <span key={s.key} style={{ display: 'block', flex: Math.max(0.01, s.value / total), background: s.color }} />
          ))}
        </div>

        <button type="button" onClick={() => navigate('/seller/wallet')} className="w-full flex items-center gap-3 text-left" style={{ minHeight: 48, borderBottom: `1px solid ${p.border}`, padding: '8px 0' }}>
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.green }} />
          <span className="flex-1 min-w-0">
            <span className="block font-semibold" style={{ fontSize: 13, color: p.text }}>{t('sl12_argent.resume_where_to_pay_label')}</span>
            <span className="block" style={{ fontSize: 11, color: p.textMuted }}>{t('sl12_argent.resume_where_to_pay_sub')}</span>
          </span>
          <span className="font-black flex-shrink-0" style={{ fontSize: 13.5, color: p.text }}>{formatXaf(money.to_pay.amount_xaf)}</span>
        </button>

        <button type="button" onClick={() => navigate('/seller/v2/argent/se-libere')} className="w-full flex items-center gap-3 text-left" style={{ minHeight: 48, borderBottom: `1px solid ${p.border}`, padding: '8px 0' }}>
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.amber }} />
          <span className="flex-1 min-w-0">
            <span className="block font-semibold" style={{ fontSize: 13, color: p.text }}>{t('sl12_argent.resume_where_releasing_label')}</span>
            <span className="block" style={{ fontSize: 11, color: p.textMuted }}>
              {t('sl12_argent.resume_where_releasing_sub', { when: formatDaysLeft(money.releasing.days_left, locale) })}
            </span>
          </span>
          <span className="font-black flex-shrink-0" style={{ fontSize: 13.5, color: p.text }}>{formatXaf(money.releasing.amount_xaf)}</span>
        </button>

        <button type="button" onClick={() => navigate('/seller/orders')} className="w-full flex items-center gap-3 text-left" style={{ minHeight: 48, borderBottom: `1px solid ${p.border}`, padding: '8px 0' }}>
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.orange }} />
          <span className="flex-1 min-w-0">
            <span className="block font-semibold" style={{ fontSize: 13, color: p.text }}>{t('sl12_argent.resume_where_in_progress_label')}</span>
            <span className="block" style={{ fontSize: 11, color: p.textMuted }}>{t('sl12_argent.resume_where_in_progress_sub')}</span>
          </span>
          <span className="font-black flex-shrink-0" style={{ fontSize: 13.5, color: p.text }}>{formatXaf(money.in_progress.amount_xaf)}</span>
        </button>

        <button type="button" onClick={() => navigate('/seller/v2/argent/gele')} className="w-full flex items-center gap-3 text-left" style={{ minHeight: 48, padding: '8px 0' }}>
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.red }} />
          <span className="flex-1 min-w-0">
            <span className="block font-semibold" style={{ fontSize: 13, color: p.text }}>{t('sl12_argent.resume_where_frozen_label')}</span>
            <span className="block" style={{ fontSize: 11, color: p.textMuted }}>
              {t(frozenCount > 1 ? 'sl12_argent.resume_where_frozen_sub_plural' : 'sl12_argent.resume_where_frozen_sub', { count: frozenCount })}
            </span>
          </span>
          <span className="font-black flex-shrink-0" style={{ fontSize: 13.5, color: p.text }}>{formatXaf(money.frozen.amount_xaf)}</span>
        </button>

        <div className="flex items-center justify-between pt-3 mt-1" style={{ borderTop: `1.5px solid ${p.border}` }}>
          <span>
            <span className="block font-semibold" style={{ fontSize: 13.5, color: p.text }}>{t('sl12_argent.resume_where_in_circulation_label')}</span>
            <span className="block" style={{ fontSize: 11, color: p.textMuted }}>{t('sl12_argent.resume_where_in_circulation_sub')}</span>
          </span>
          <span className="font-black" style={{ fontSize: 17, color: p.text, letterSpacing: '-.02em' }}>{formatXaf(money.in_circulation_xaf)}</span>
        </div>
      </div>

      {/* Carte "Ce que vous gardez" — ventes RELEASED du mois en cours (proxy updated_at, voir l'en-tête du fichier). */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <p className="font-bold mb-2" style={{ fontSize: 14, color: p.text }}>{t('sl12_argent.resume_kept_title')}</p>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-semibold" style={{ fontSize: 13, color: p.text }}>{t('sl12_argent.resume_kept_this_month')}</p>
            <p style={{ fontSize: 11.5, color: p.textMuted, marginTop: 2 }}>
              {t('sl12_argent.resume_kept_on_sales', { amount: formatXaf(monthlySalesXaf) })}
            </p>
          </div>
          <p className="font-black" style={{ fontSize: 22, color: p.green, letterSpacing: '-.02em' }}>{formatXaf(monthlyKeptXaf)}</p>
        </div>
        <div className="flex items-start gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${p.border}` }}>
          <Info size={14} color={p.textMuted} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11.5, color: p.textMuted, lineHeight: 1.5 }}>
            {rate ? t('sl12_argent.resume_kept_hint', { rate }) : t('sl12_argent.resume_kept_hint_unknown_rate')}
          </p>
        </div>
      </div>

      {/* "Relevés et versements" — pont vers le vrai historique de retraits (Documents.html VD-09 pas encore reconstruit en v2). */}
      <button
        type="button"
        onClick={() => navigate('/seller/settlements')}
        className="w-full flex items-center gap-3 rounded-2xl mb-4 text-left"
        style={{ padding: '13px 14px', background: p.card, border: `1px solid ${p.border}` }}
      >
        <Info size={17} color={p.textMuted} />
        <span className="flex-1 min-w-0">
          <span className="block font-semibold" style={{ fontSize: 13, color: p.text }}>{t('sl12_argent.resume_documents_row_label')}</span>
          <span className="block" style={{ fontSize: 11, color: p.textMuted }}>{t('sl12_argent.resume_documents_row_sub')}</span>
        </span>
      </button>

      <div className="flex items-start gap-2.5 rounded-2xl p-3.5" style={{ background: `${p.green}14`, border: `1px solid ${p.green}40` }}>
        <ShieldCheck size={16} color={p.green} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: p.text, lineHeight: 1.5 }}>{t('sl12_argent.resume_secret_code_note')}</p>
      </div>
    </div>
  );
}
