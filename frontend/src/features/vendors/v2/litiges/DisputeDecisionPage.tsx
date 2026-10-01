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
//
// Alignement visuel sur Decision.jpg/Decision_gagne.jpg/Decision_perdu.jpg :
// carte « héro » sombre par issue (neutre en médiation, verte si gagné, rouge
// si perdu), frise horizontale + aperçu « ce qui peut arriver » pendant la
// médiation seulement, motif + effet Trust Score + « Décidé par » regroupés
// dans une seule carte. Écart volontaire : la maquette « gagné » affiche une
// date/mode de versement précis (« versés vendredi 25 septembre vers MTN
// ···· 4217 ») — VendorDisputeDetail n'expose ni date de versement ni moyen
// de paiement masqué, donc ce détail est remplacé par une phrase générique
// (decision_hero_won_body) plutôt que d'inventer une date ou un numéro.

import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Gavel, RefreshCw, Send, XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type VendorDisputeDetail } from '@/services/api/vendors';
import { palette, type VendorPalette } from '../theme';
import {
  Card, CenterState, DarkHero, HERO_ACCENT, OutcomeRow, PageHeader, PrimaryButton, SecondaryButton, Stepper,
} from './ui';
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

  const heroTone: 'neutral' | 'green' | 'red' = issue === 'won' ? 'green' : issue === 'lost' ? 'red' : 'neutral';
  const heroKickerKey = issue === 'mediation' ? 'decision_hero_kicker_mediation'
    : issue === 'won' ? 'decision_hero_kicker_won'
      : issue === 'lost' ? 'decision_hero_kicker_lost'
        : 'decision_hero_kicker_compromise';
  const heroIcon = issue === 'mediation' ? <Send size={13} />
    : issue === 'won' ? <CheckCircle2 size={13} />
      : issue === 'lost' ? <XCircle size={13} />
        : <CheckCircle2 size={13} />;

  const trustKey = issue === 'mediation' ? 'decision_trust_mediation'
    : issue === 'won' ? 'decision_trust_won'
      : issue === 'lost' ? 'decision_trust_lost'
        : 'decision_trust_compromise';
  const trustColor = issue === 'won' ? p.green : issue === 'lost' ? p.red : p.text;

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

      <DarkHero tone={heroTone}>
        <div className="flex items-center justify-between mb-2">
          <span
            className="font-bold flex items-center gap-1.5"
            style={{ fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: HERO_ACCENT[heroTone] }}
          >
            {heroIcon} {t(`sl8_litiges.${heroKickerKey}`)}
          </span>
        </div>

        {issue === 'mediation' ? (
          <>
            <p className="font-black mb-2" style={{ fontSize: 19, color: '#fff', lineHeight: 1.3 }}>
              {t('sl8_litiges.decision_mediation_title')}
            </p>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>
              {t('sl8_litiges.decision_hero_mediation_body')}
            </p>
            <div className="flex items-center justify-between" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.14)' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{t('sl8_litiges.decision_hero_frozen_label')}</span>
              <span className="font-black" style={{ fontSize: 18, color: '#fff' }}>{fmtXAF(dispute.vendor_escrow_amount)}</span>
            </div>
          </>
        ) : issue === 'won' ? (
          <>
            <p className="font-black mb-1" style={{ fontSize: 19, color: '#fff', lineHeight: 1.3 }}>
              {t('sl8_litiges.decision_won_headline')}
            </p>
            <p className="font-black mb-2" style={{ fontSize: 30, color: '#fff' }}>{fmtXAF(kept)}</p>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>
              {t('sl8_litiges.decision_hero_won_body')}
            </p>
          </>
        ) : issue === 'lost' ? (
          <>
            <p className="font-black mb-2" style={{ fontSize: 19, color: '#fff', lineHeight: 1.3 }}>
              {t('sl8_litiges.decision_lost_headline')}
            </p>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5, marginBottom: 4 }}>
              {t('sl8_litiges.decision_hero_lost_body_1')}
            </p>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>
              {t('sl8_litiges.decision_hero_lost_body_2')}
            </p>
          </>
        ) : (
          <>
            <p className="font-black mb-2" style={{ fontSize: 19, color: '#fff', lineHeight: 1.3 }}>
              {t('sl8_litiges.decision_compromise_title')}
            </p>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>
              {t('sl8_litiges.decision_compromise_body', { amount: fmtXAF(refund) })}
            </p>
          </>
        )}
      </DarkHero>

      <Card p={p}>
        <p className="font-bold mb-2" style={{ fontSize: 13, color: p.text }}>{t('sl8_litiges.decision_reason_title')}</p>
        <p style={{ fontSize: 12.5, color: p.textMuted, lineHeight: 1.5 }}>
          {dispute.resolution_note || dispute.resolution || t('sl8_litiges.decision_reason_empty')}
        </p>

        <div style={{ height: 1, background: p.border, margin: '14px 0' }} />
        {issue === 'mediation' ? (
          <p style={{ fontSize: 12.5, color: p.textMuted }}>{t(`sl8_litiges.${trustKey}`)}</p>
        ) : (
          <>
            <InfoRow label={t('sl8_litiges.decision_trust_title')} value={t(`sl8_litiges.${trustKey}`)} valueColor={trustColor} p={p} />
            <div style={{ height: 10 }} />
            <InfoRow
              label={t('sl8_litiges.decision_decided_by_label')}
              value={`${t('sl8_litiges.decision_decided_by_value')} · ${fmtDateTime(dispute.resolved_at, lang)}`}
              bold
              p={p}
            />
          </>
        )}
      </Card>

      {issue === 'mediation' ? (
        <>
          <div style={{ height: 12 }} />
          <Card p={p}>
            <p className="font-bold mb-3" style={{ fontSize: 13, color: p.text }}>{t('sl8_litiges.decision_timeline_title')}</p>
            <Stepper
              p={p}
              steps={[
                { label: t('sl8_litiges.decision_steps_received'), state: 'done' },
                { label: t('sl8_litiges.decision_steps_replied'), state: dispute.vendor_replied_at ? 'done' : 'upcoming' },
                { label: t('sl8_litiges.decision_steps_mediation'), state: 'current' },
                { label: t('sl8_litiges.decision_steps_decision'), state: 'upcoming' },
              ]}
            />
          </Card>

          <div style={{ height: 12 }} />
          <Card p={p}>
            <p className="font-bold mb-1" style={{ fontSize: 13, color: p.text }}>{t('sl8_litiges.decision_outcomes_title')}</p>
            <OutcomeRow
              first
              icon={<CheckCircle2 size={18} color={p.green} />}
              tone="green"
              title={t('sl8_litiges.decision_outcome_won_title')}
              detail={t('sl8_litiges.decision_outcome_won_detail')}
              p={p}
            />
            <OutcomeRow
              icon={<XCircle size={18} color={p.red} />}
              tone="red"
              title={t('sl8_litiges.decision_outcome_lost_title')}
              detail={t('sl8_litiges.decision_outcome_lost_detail')}
              p={p}
            />
            <OutcomeRow
              icon={<Gavel size={18} color={p.amber} />}
              tone="amber"
              title={t('sl8_litiges.decision_outcome_contest_title')}
              detail={t('sl8_litiges.decision_outcome_contest_detail')}
              p={p}
            />
          </Card>
        </>
      ) : null}

      {issue === 'won' ? (
        <>
          <div style={{ height: 12 }} />
          <div className="rounded-xl flex items-start gap-2" style={{ padding: '12px 14px', background: p.cardAlt, border: `1px solid ${p.border}` }}>
            <Gavel size={15} color={p.textMuted} style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.5 }}>{t('sl8_litiges.decision_client_may_contest_note')}</p>
          </div>
        </>
      ) : null}

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

function InfoRow({
  label, value, p, bold, valueColor,
}: { label: string; value: ReactNode; p: VendorPalette; bold?: boolean; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span style={{ fontSize: 12, color: p.textMuted }}>{label}</span>
      <span
        className="text-right"
        style={{ fontSize: 12.5, color: valueColor ?? p.text, fontWeight: bold ? 700 : 600 }}
      >
        {value}
      </span>
    </div>
  );
}
