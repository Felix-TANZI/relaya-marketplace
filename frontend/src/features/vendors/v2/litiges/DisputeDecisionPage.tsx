// frontend/src/features/vendors/v2/litiges/DisputeDecisionPage.tsx
// Écran « Décision et suites » — VD-07 §DCS-01 à 04 (VD-D08.A09).
// Pas de webhook dispute.decided câblé côté frontend (pas de canal temps réel
// disponible dans ce bridge) : l'écran se contente de lire l'état courant via
// vendorsApi.getDisputeDetail au chargement. L'issue (gagné/perdu/arrangement)
// est déduite de refund_amount_xaf vs vendor_escrow_amount (voir
// disputeIssueOf dans helpers.ts) faute de champ `resolution` typé par l'API.
//
// « Contester la décision » (DCS-03/04) n'a pas d'endpoint dédié : on
// bridge sur vendorsApi.sendDisputeMessage pour transmettre la contestation
// dans le fil déjà existant, à remplacer par un vrai POST /disputes/{id}/contest
// quand il existera côté backend.

import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type VendorDisputeDetail } from '@/services/api/vendors';
import { palette } from '../theme';
import { Card, CenterState, PageHeader, PrimaryButton, SecondaryButton } from './ui';
import { disputeIssueOf, fmtDateTime, fmtXAF, type DisputeIssue } from './helpers';

export default function DisputeDecisionPage() {
  const { id } = useParams<{ id: string }>();
  const disputeId = Number(id);
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const lang = i18n.language.startsWith('en') ? 'en' : 'fr';

  const [dispute, setDispute] = useState<VendorDisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contesting, setContesting] = useState(false);
  const [contestText, setContestText] = useState('');
  const [contestSent, setContestSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!disputeId) return;
    vendorsApi.getDisputeDetail(disputeId)
      .then(setDispute)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [disputeId]);

  if (loading) {
    return <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl8_litiges.loading')} p={p} />;
  }
  if (error || !dispute) {
    return <CenterState icon={<AlertTriangle size={22} color={p.red} />} title={error ?? t('sl8_litiges.error_generic')} p={p} />;
  }

  const issue: DisputeIssue = disputeIssueOf(dispute.status, dispute.refund_amount_xaf, dispute.vendor_escrow_amount);
  const refund = dispute.refund_amount_xaf ?? 0;
  const kept = Math.max(0, dispute.vendor_escrow_amount - refund);

  const issueMeta: Record<DisputeIssue, { icon: ReactNode; color: string; titleKey: string; bodyKey: string; amount: string }> = {
    mediation: { icon: <Clock size={20} color={p.amber} />, color: p.amber, titleKey: 'decision_mediation_title', bodyKey: 'decision_mediation_body', amount: fmtXAF(dispute.vendor_escrow_amount) },
    won: { icon: <CheckCircle2 size={20} color={p.green} />, color: p.green, titleKey: 'decision_won_title', bodyKey: 'decision_won_body', amount: fmtXAF(kept) },
    lost: { icon: <XCircle size={20} color={p.red} />, color: p.red, titleKey: 'decision_lost_title', bodyKey: 'decision_lost_body', amount: fmtXAF(refund) },
    compromise: { icon: <CheckCircle2 size={20} color={p.amber} />, color: p.amber, titleKey: 'decision_compromise_title', bodyKey: 'decision_compromise_body', amount: fmtXAF(refund) },
  };
  const meta = issueMeta[issue];

  const trustKey = issue === 'mediation' ? 'decision_trust_mediation'
    : issue === 'won' ? 'decision_trust_won'
      : issue === 'lost' ? 'decision_trust_lost'
        : 'decision_trust_compromise';

  async function handleContestSubmit() {
    if (!contestText.trim()) return;
    setSending(true);
    try {
      await vendorsApi.sendDisputeMessage(disputeId, `${t('sl8_litiges.decision_contest')} — ${contestText.trim()}`);
      setContestSent(true);
      setContesting(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="pb-24 pt-2">
      <PageHeader
        title={t('sl8_litiges.decision_title')}
        subtitle={dispute.order_ref}
        onBack={() => navigate('/seller/v2/litiges')}
        backLabel={t('sl8_litiges.common_back')}
        p={p}
      />

      <Card p={p} accent={meta.color}>
        <div className="flex items-center gap-2 mb-2">
          {meta.icon}
          <p className="font-black" style={{ fontSize: 15, color: p.text }}>{t(`sl8_litiges.${meta.titleKey}`)}</p>
        </div>
        <p style={{ fontSize: 13, color: p.textMuted, lineHeight: 1.5 }}>
          {t(`sl8_litiges.${meta.bodyKey}`, { amount: meta.amount })}
        </p>
      </Card>

      <div style={{ height: 12 }} />
      <Card p={p}>
        <p className="font-bold mb-2" style={{ fontSize: 13, color: p.text }}>{t('sl8_litiges.decision_reason_title')}</p>
        <p style={{ fontSize: 12.5, color: p.textMuted, lineHeight: 1.5 }}>
          {dispute.resolution_note || dispute.resolution || t('sl8_litiges.decision_reason_empty')}
        </p>
      </Card>

      <div style={{ height: 12 }} />
      <Card p={p}>
        <p className="font-bold mb-1" style={{ fontSize: 13, color: p.text }}>{t('sl8_litiges.decision_trust_title')}</p>
        <p style={{ fontSize: 12.5, color: p.textMuted }}>{t(`sl8_litiges.${trustKey}`)}</p>
      </Card>

      <div style={{ height: 12 }} />
      <Card p={p}>
        <p className="font-bold mb-3" style={{ fontSize: 13, color: p.text }}>{t('sl8_litiges.decision_timeline_title')}</p>
        <Timeline p={p} issue={issue} repliedAt={dispute.vendor_replied_at} resolvedAt={dispute.resolved_at} lang={lang} />
      </Card>

      <div style={{ height: 18 }} />
      <PrimaryButton onClick={() => navigate('/seller/v2/litiges')} p={p}>
        {t('sl8_litiges.decision_back')}
      </PrimaryButton>

      {issue === 'lost' && !contestSent ? (
        <div style={{ marginTop: 12 }}>
          {!contesting ? (
            <SecondaryButton onClick={() => setContesting(true)} p={p} danger>
              {t('sl8_litiges.decision_contest')}
            </SecondaryButton>
          ) : (
            <Card p={p}>
              <p style={{ fontSize: 11.5, color: p.textMuted, marginBottom: 8 }}>{t('sl8_litiges.decision_contest_hint')}</p>
              <textarea
                value={contestText}
                onChange={(e) => setContestText(e.target.value)}
                rows={3}
                placeholder={t('sl8_litiges.decision_contest_placeholder')}
                className="w-full rounded-xl resize-none mb-2"
                style={{ padding: '10px 12px', fontSize: 13, color: p.text, background: p.cardAlt, border: `1px solid ${p.border}` }}
              />
              <PrimaryButton onClick={handleContestSubmit} disabled={sending || !contestText.trim()} p={p}>
                {sending ? t('sl8_litiges.saving') : t('sl8_litiges.decision_contest_submit')}
              </PrimaryButton>
            </Card>
          )}
        </div>
      ) : null}
      {contestSent ? (
        <p className="text-center mt-3" style={{ fontSize: 12, color: p.textMuted }}>{t('sl8_litiges.decision_contest_sent')}</p>
      ) : null}
    </div>
  );
}

function Timeline({
  p, issue, repliedAt, resolvedAt, lang,
}: { p: ReturnType<typeof palette>; issue: DisputeIssue; repliedAt: string | null; resolvedAt: string | null; lang: 'fr' | 'en' }) {
  const { t } = useTranslation();
  const steps: { labelKey: string; done: boolean; at: string | null }[] = [
    { labelKey: 'decision_timeline_replied', done: Boolean(repliedAt), at: repliedAt },
    { labelKey: 'decision_timeline_mediation', done: issue !== 'mediation', at: null },
    { labelKey: 'decision_timeline_decided', done: issue !== 'mediation', at: resolvedAt },
  ];
  return (
    <div className="flex flex-col gap-3">
      {steps.map((s) => (
        <div key={s.labelKey} className="flex items-center gap-2.5">
          <span
            className="rounded-full flex-shrink-0"
            style={{ width: 9, height: 9, background: s.done ? p.green : p.border }}
          />
          <div className="min-w-0">
            <p style={{ fontSize: 12.5, color: s.done ? p.text : p.textMuted, fontWeight: s.done ? 700 : 500 }}>
              {t(`sl8_litiges.${s.labelKey}`)}
            </p>
            {s.at ? <p style={{ fontSize: 11, color: p.textMuted }}>{fmtDateTime(s.at, lang)}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
