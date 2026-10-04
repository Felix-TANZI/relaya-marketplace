// frontend/src/features/vendors/v2/argent/VersementsPage.tsx
// VD-09 §Argent et versements — écrans "Versements" (fig. 7) et "Versements ·
// refus de l'opérateur" (fig. 8).
//
// ADAPTATION ASSUMÉE : la maquette décrit un versement AUTOMATIQUE
// hebdomadaire ("Prochain versement : vendredi 25 septembre, avant 12 h,
// automatique"). Le modèle réel de BelivaY est différent et confirmé par le
// métier : le vendeur RETIRE quand il le décide (vendorsApi.createWithdrawal /
// getWithdrawals — même logique que SellerWalletPage.tsx). Cette page est donc
// réécrite comme un historique de DEMANDES DE RETRAIT et de leur statut
// (PENDING/APPROVED/REJECTED/CANCELLED), pas comme une liste passive de
// prochains versements automatiques. Aucune donnée n'est inventée : mêmes
// endpoints, mêmes champs que vendors.ts (VendorPaymentSummary,
// WithdrawalRequest, PendingWithdrawal).
//
// Fig. 8 (refus opérateur) est repliée ICI comme un ÉTAT plutôt que comme un
// second fichier/route : dès que la demande la plus récente a le statut
// REJECTED, la bannière de refus façon fig. 8 s'affiche en tête de cette même
// page, au-dessus du même historique — ça évite de dupliquer toute la liste
// pour un seul bandeau (voir rapport de livraison pour le détail du choix).

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight, RefreshCw, ShieldAlert, Smartphone, TriangleAlert, Wallet,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import {
  vendorsApi,
  type VendorPaymentSummary,
  type WithdrawalRequest,
  type WithdrawalOperator,
} from '@/services/api/vendors';
import { OperatorLogo } from '@/features/payments/OperatorLogo';
import { fmtDate } from '@/features/vendors/orderUtils';
import { palette } from '../theme';
import ScreenHeader from '../compte/shared/ScreenHeader';
import Collapsible from '../compte/shared/Collapsible';
import { formatXAF, buildWhatsAppSupportLink } from '../compte/shared/format';

type Period = '3m' | '12m' | 'all';

const OP_LABEL: Record<WithdrawalOperator, string> = { MTN_MOMO: 'MTN Mobile Money', ORANGE_MONEY: 'Orange Money' };

function periodCutoff(period: Period): Date | null {
  if (period === 'all') return null;
  const d = new Date();
  d.setMonth(d.getMonth() - (period === '3m' ? 3 : 12));
  return d;
}

function StatusBadge({ status, label, p }: { status: string; label: string; p: ReturnType<typeof palette> }) {
  const cfg: Record<string, { color: string; bg: string }> = {
    PENDING: { color: p.amber, bg: `${p.amber}1A` },
    APPROVED: { color: p.green, bg: `${p.green}1A` },
    REJECTED: { color: p.red, bg: `${p.red}1A` },
    CANCELLED: { color: p.textMuted, bg: p.cardAlt },
  };
  const c = cfg[status] ?? cfg.CANCELLED;
  return (
    <span
      className="inline-block rounded-full font-bold text-center flex-shrink-0"
      style={{ padding: '4px 10px', fontSize: 10.5, color: c.color, background: c.bg }}
    >
      {label}
    </span>
  );
}

export default function VersementsPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();

  const [summary, setSummary] = useState<VendorPaymentSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('3m');

  const load = async () => {
    try {
      setLoading(true);
      const [sum, wds] = await Promise.all([vendorsApi.getPaymentSummary(), vendorsApi.getWithdrawals()]);
      setSummary(sum);
      setWithdrawals(wds);
    } catch {
      // Panne réseau : l'écran reste vide plutôt que d'afficher une fausse donnée.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const cutoff = periodCutoff(period);
    return withdrawals
      .filter((w) => !cutoff || new Date(w.created_at) >= cutoff)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [withdrawals, period]);

  const pendingWd = summary?.pending_withdrawal ?? null;
  const latest = withdrawals.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  const isRefused = !pendingWd && latest?.status === 'REJECTED';

  const approved = withdrawals.filter((w) => w.status === 'APPROVED');
  const totalReceived = approved.reduce((s, w) => s + w.net_amount_xaf, 0);
  const totalFees = approved.reduce((s, w) => s + w.fee_amount_xaf, 0);

  const whatsappReport = buildWhatsAppSupportLink(
    t('sl12_argent.versements_whatsapp_report', { reference: latest?.reference ?? '—' }),
  );

  if (loading) {
    return (
      <div className="pb-24 pt-2">
        <ScreenHeader title={t('sl12_argent.versements_title')} subtitle={t('sl12_argent.versements_subtitle')} />
        <div className="rounded-2xl animate-pulse" style={{ height: 160, background: p.cardAlt }} />
      </div>
    );
  }

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl12_argent.versements_title')} subtitle={t('sl12_argent.versements_subtitle')} />

      {/* ═══ Bannière de refus (fig. 8), affichée seulement si la dernière demande a été refusée ═══ */}
      {isRefused && latest ? (
        <div className="rounded-2xl p-4 mb-3" style={{ background: `${p.red}12`, border: `1.5px solid ${p.red}40` }}>
          <div className="flex items-start gap-2.5">
            <ShieldAlert size={19} color={p.red} className="flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-bold" style={{ fontSize: 13.5, color: p.red }}>
                {t('sl12_argent.refus_title', { operator: OP_LABEL[latest.operator] })}
              </p>
              <p className="mt-1" style={{ fontSize: 12.5, color: p.text, lineHeight: 1.5 }}>
                {t('sl12_argent.refus_reason', { reason: latest.admin_note || t('sl12_argent.refus_reason_unknown') })}
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <p className="flex items-start gap-2" style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.45 }}>
              <TriangleAlert size={14} style={{ color: p.red, flexShrink: 0, marginTop: 2 }} />
              {t('sl12_argent.refus_todo')}
            </p>
            <p className="flex items-start gap-2" style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.45 }}>
              <RefreshCw size={14} style={{ color: p.red, flexShrink: 0, marginTop: 2 }} />
              {t('sl12_argent.refus_no_auto_retry')}
            </p>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/seller/wallet')}
              className="flex items-center justify-center gap-1.5 rounded-xl font-bold text-white"
              style={{ padding: '10px 15px', fontSize: 12.5, background: p.orange }}
            >
              {t('sl12_argent.refus_retry_cta')}<ArrowRight size={14} />
            </button>
            <a
              href={whatsappReport} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl font-bold"
              style={{ padding: '10px 15px', fontSize: 12.5, border: `1.5px solid ${p.border}`, color: p.text }}
            >
              {t('sl12_argent.versements_report_cta')}
            </a>
          </div>
        </div>
      ) : null}

      {/* ═══ Demande en cours (reformulation de "prochain versement") ═══ */}
      {pendingWd ? (
        <div className="rounded-2xl p-4 mb-3 text-white" style={{ background: 'linear-gradient(135deg,#1C1209 0%,#2B1A0C 52%,#3A230D 100%)' }}>
          <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.14em', color: 'rgba(255,255,255,.5)' }}>
            {t('sl12_argent.versements_pending_kicker')}
          </p>
          <p className="font-black mt-1.5" style={{ fontSize: 26, letterSpacing: '-.02em' }}>
            {formatXAF(pendingWd.net_xaf)}
          </p>
          <p className="mt-1" style={{ fontSize: 12, color: 'rgba(255,255,255,.75)' }}>
            {t('sl12_argent.versements_pending_sub', { reference: pendingWd.reference })}
          </p>
          <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,.12)' }}>
            <OperatorLogo provider={pendingWd.operator} size={36} />
            <div className="min-w-0">
              <p className="font-bold" style={{ fontSize: 13 }}>{OP_LABEL[pendingWd.operator]} · {pendingWd.phone}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>{t('sl12_argent.versements_submitted_on', { date: fmtDate(pendingWd.created_at) })}</p>
            </div>
          </div>
        </div>
      ) : !isRefused ? (
        <div className="rounded-2xl p-4 mb-3 text-center" style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}>
          <Wallet size={24} color={p.textMuted} className="mx-auto mb-2" />
          <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl12_argent.versements_no_pending_title')}</p>
          <p className="mt-1" style={{ fontSize: 12, color: p.textMuted }}>{t('sl12_argent.versements_no_pending_sub')}</p>
          <button
            type="button" onClick={() => navigate('/seller/wallet')}
            className="inline-flex items-center gap-1.5 rounded-xl font-bold text-white mt-3"
            style={{ padding: '10px 16px', fontSize: 12.5, background: p.orange }}
          >
            {t('sl12_argent.versements_request_cta')}<ArrowRight size={14} />
          </button>
        </div>
      ) : null}

      {/* ═══ Filtre de période ═══ */}
      <div className="flex gap-2 mb-3">
        {([['3m', t('sl12_argent.period_3m')], ['12m', t('sl12_argent.period_12m')], ['all', t('sl12_argent.period_all')]] as [Period, string][]).map(([key, label]) => (
          <button
            key={key} type="button" onClick={() => setPeriod(key)}
            className="rounded-full font-semibold"
            style={{
              padding: '7px 14px', fontSize: 12,
              background: period === key ? p.orange : p.cardAlt,
              color: period === key ? '#fff' : p.textMuted,
              border: `1px solid ${period === key ? p.orange : p.border}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══ Récapitulatif reçu ═══ */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center justify-between">
          <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl12_argent.versements_received_title')}</p>
          <span className="font-black" style={{ fontSize: 15, color: p.text }}>{formatXAF(totalReceived)}</span>
        </div>
        <p className="mt-1" style={{ fontSize: 11.5, color: p.textMuted }}>
          {t('sl12_argent.versements_received_sub', { count: approved.length, fees: formatXAF(totalFees) })}
        </p>
      </div>

      {/* ═══ Historique des demandes ═══ */}
      <div className="rounded-2xl overflow-hidden mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center justify-between" style={{ padding: '12px 14px', borderBottom: `1px solid ${p.border}` }}>
          <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl12_argent.versements_history_title')}</p>
          <span className="font-bold rounded-full" style={{ fontSize: 10.5, padding: '4px 10px', background: p.cardAlt, color: p.textMuted }}>
            {filtered.length}
          </span>
        </div>
        {filtered.length === 0 ? (
          <p className="text-center" style={{ padding: '28px 16px', fontSize: 12.5, color: p.textMuted }}>
            {t('sl12_argent.versements_history_empty')}
          </p>
        ) : filtered.map((w) => (
          <div key={w.id} className="flex items-center gap-3" style={{ padding: '12px 14px', borderBottom: `1px solid ${p.border}` }}>
            <OperatorLogo provider={w.operator} size={34} />
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate" style={{ fontSize: 12.5, color: p.text }}>{w.reference}</p>
              <p className="truncate" style={{ fontSize: 11, color: p.textMuted }}>{fmtDate(w.created_at)} · {w.phone_number}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-black" style={{ fontSize: 13.5, color: p.text }}>{formatXAF(w.net_amount_xaf)}</p>
              <div className="mt-1"><StatusBadge status={w.status} label={w.status_display} p={p} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Liens utiles ═══ */}
      <div className="rounded-2xl overflow-hidden mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <a
          href={whatsappReport} target="_blank" rel="noreferrer"
          className="flex items-center gap-3"
          style={{ padding: '13px 14px', borderBottom: `1px solid ${p.border}` }}
        >
          <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.orange}1A`, color: p.orange }}>
            <TriangleAlert size={17} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold" style={{ fontSize: 12.5, color: p.text }}>{t('sl12_argent.versements_report_cta')}</span>
            <span className="block" style={{ fontSize: 11, color: p.textMuted }}>{t('sl12_argent.versements_report_sub')}</span>
          </span>
          <ArrowRight size={16} color={p.textMuted} />
        </a>
        <button
          type="button" onClick={() => navigate('/v2/argent/numero')}
          className="flex items-center gap-3 w-full text-left"
          style={{ padding: '13px 14px' }}
        >
          <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.green}1A`, color: p.green }}>
            <Smartphone size={17} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold" style={{ fontSize: 12.5, color: p.text }}>{t('sl12_argent.versements_change_number_cta')}</span>
            <span className="block" style={{ fontSize: 11, color: p.textMuted }}>
              {summary?.default_withdrawal_phone
                ? t('sl12_argent.versements_change_number_sub_registered', { phone: summary.default_withdrawal_phone })
                : t('sl12_argent.versements_change_number_sub_missing')}
            </span>
          </span>
          <ArrowRight size={16} color={p.textMuted} />
        </button>
      </div>

      <Collapsible title={t('sl12_argent.how_it_works_title')}>
        <p>{t('sl12_argent.how_it_works_fees')}</p>
        <p className="mt-2">{t('sl12_argent.how_it_works_reasons')}</p>
        <p className="mt-2">{t('sl12_argent.how_it_works_on_demand')}</p>
      </Collapsible>
    </div>
  );
}
