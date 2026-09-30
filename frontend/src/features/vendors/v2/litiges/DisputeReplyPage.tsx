// frontend/src/features/vendors/v2/litiges/DisputeReplyPage.tsx
// Écran « Répondre » — VD-07 §REP-01 à 06 (VD-D08.A05/A06/A07).
// POST /disputes/{id}/answer existe déjà côté bridge : vendorsApi.submitDisputeReply.
// Trois postures (REP-01) : j'accepte / je conteste / arrangement ≥ 40
// caractères (G2). Réponse verrouillée après envoi (REP-02) : ce composant ne
// permet pas de rejouer l'appel une fois vendor_replied=true, il bascule sur
// un récapitulatif en lecture seule et propose « Voir la décision ».
//
// Règle produit non négociable : au-delà de l'échéance, le bandeau dit
// « présomption en faveur du client — BelivaY décide », jamais un texte
// suggérant un remboursement automatique déclenché par le système.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import {
  vendorsApi, type VendorDisputeDetail, type VendorReplyType,
} from '@/services/api/vendors';
import { palette } from '../theme';
import {
  Banner, Card, CenterState, Collapsible, PageHeader, PrimaryButton, RadioOption,
} from './ui';
import { fmtDateTime, fmtXAF, useCountdownFromHours, useOnlineStatus } from './helpers';

const MIN_COMPROMISE_LENGTH = 40;

export default function DisputeReplyPage() {
  const { id } = useParams<{ id: string }>();
  const disputeId = Number(id);
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const online = useOnlineStatus();

  const [dispute, setDispute] = useState<VendorDisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [posture, setPosture] = useState<VendorReplyType | null>(null);
  const [text, setText] = useState('');
  const [proposedAmount, setProposedAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!disputeId) return;
    vendorsApi.getDisputeDetail(disputeId)
      .then(setDispute)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [disputeId]);

  const countdown = useCountdownFromHours(dispute?.hours_remaining);
  const lang = i18n.language.startsWith('en') ? 'en' : 'fr';

  if (loading) {
    return <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl8_litiges.loading')} p={p} />;
  }
  if (error || !dispute) {
    return <CenterState icon={<AlertTriangle size={22} color={p.red} />} title={error ?? t('sl8_litiges.error_generic')} p={p} />;
  }

  const alreadyReplied = dispute.vendor_replied;

  const canSubmit = (() => {
    if (!posture || submitting || !online) return false;
    if (posture === 'CONTEST') return text.trim().length > 0;
    if (posture === 'COMPROMISE') return text.trim().length >= MIN_COMPROMISE_LENGTH;
    return true;
  })();

  async function handleSubmit() {
    if (!posture) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const amount = proposedAmount ? Number(proposedAmount) : undefined;
      await vendorsApi.submitDisputeReply(disputeId, {
        reply_type: posture,
        reply_text: text.trim(),
        ...(amount ? { proposed_amount: amount } : {}),
      });
      navigate(`/seller/v2/litiges/${disputeId}/decision`);
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (alreadyReplied) {
    const postureLabelKey = dispute.vendor_reply_type === 'ACCEPT'
      ? 'reply_locked_posture_accept'
      : dispute.vendor_reply_type === 'CONTEST'
        ? 'reply_locked_posture_contest'
        : 'reply_locked_posture_compromise';
    return (
      <div className="pb-24 pt-2">
        <PageHeader
          title={t('sl8_litiges.reply_title')}
          onBack={() => navigate('/seller/v2/litiges')}
          backLabel={t('sl8_litiges.common_back')}
          p={p}
        />
        <Card p={p}>
          <p className="font-bold mb-2" style={{ fontSize: 14.5, color: p.text }}>{t('sl8_litiges.reply_locked_title')}</p>
          <p style={{ fontSize: 12.5, color: p.textMuted, marginBottom: 10 }}>
            {t('sl8_litiges.reply_locked_body', { date: fmtDateTime(dispute.vendor_replied_at, lang) })}
          </p>
          <p className="font-semibold" style={{ fontSize: 13, color: p.text, marginBottom: 4 }}>{t(`sl8_litiges.${postureLabelKey}`)}</p>
          {dispute.vendor_reply_text ? (
            <p style={{ fontSize: 12.5, color: p.textMuted }}>{dispute.vendor_reply_text}</p>
          ) : null}
        </Card>
        <div style={{ height: 14 }} />
        <PrimaryButton onClick={() => navigate(`/seller/v2/litiges/${disputeId}/decision`)} p={p}>
          {t('sl8_litiges.reply_see_decision')}
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-2">
      <PageHeader
        title={t('sl8_litiges.reply_title')}
        subtitle={dispute.order_ref}
        onBack={() => navigate('/seller/v2/litiges')}
        backLabel={t('sl8_litiges.common_back')}
        p={p}
      />

      <Banner tone={countdown.expired ? 'red' : 'amber'} p={p}>
        {countdown.expired
          ? t('sl8_litiges.reply_deadline_expired')
          : countdown.hours > 0
            ? t('sl8_litiges.list_card_deadline', { h: countdown.hours, m: countdown.minutes })
            : t('sl8_litiges.list_card_deadline_minutes', { m: countdown.minutes })}
      </Banner>

      <Card p={p}>
        <p className="font-bold mb-2" style={{ fontSize: 14, color: p.text }}>{t('sl8_litiges.reply_customer_says_title')}</p>
        <p style={{ fontSize: 12.5, color: p.textMuted, marginBottom: 8 }}>
          <strong style={{ color: p.text }}>{t('sl8_litiges.reply_reason_label')} : </strong>{dispute.reason_display}
        </p>
        {dispute.description ? (
          <p style={{ fontSize: 12.5, color: p.textMuted, marginBottom: 10, lineHeight: 1.5 }}>{dispute.description}</p>
        ) : null}
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 12, color: p.textMuted, fontWeight: 600 }}>{t('sl8_litiges.reply_frozen_amount_label')}</span>
          <span className="font-black" style={{ fontSize: 16, color: p.red }}>{fmtXAF(dispute.vendor_escrow_amount)}</span>
        </div>
      </Card>

      <div style={{ height: 10 }} />
      <Collapsible title={t('sl8_litiges.reply_evidence_title')} p={p}>
        {dispute.evidences.length === 0 ? (
          <p>{t('sl8_litiges.reply_evidence_empty')}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {dispute.evidences.map((ev) => (
              <li key={ev.id}>
                <a href={ev.file_url} target="_blank" rel="noreferrer" style={{ color: p.orange, fontWeight: 600 }}>
                  {ev.description || t('sl8_litiges.reply_evidence_title')}
                </a>
                <span style={{ color: p.textMuted }}> · {fmtDateTime(ev.created_at, lang)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2" style={{ fontStyle: 'italic' }}>{t('sl8_litiges.reply_evidence_note')}</p>
      </Collapsible>

      <div style={{ height: 10 }} />
      <button
        type="button"
        onClick={() => navigate('/seller/v2/messagerie')}
        className="w-full text-left rounded-xl font-semibold"
        style={{ padding: '11px 13px', fontSize: 12.5, color: p.orange, border: `1px solid ${p.border}` }}
      >
        {t('sl8_litiges.reply_reread_messages')}
      </button>

      <div style={{ height: 16 }} />
      <p className="font-bold mb-2" style={{ fontSize: 14, color: p.text }}>{t('sl8_litiges.reply_posture_title')}</p>
      <div className="flex flex-col gap-2">
        <RadioOption
          selected={posture === 'ACCEPT'}
          onSelect={() => setPosture('ACCEPT')}
          title={t('sl8_litiges.reply_posture_accept_title')}
          detail={t('sl8_litiges.reply_posture_accept_detail')}
          p={p}
        />
        <RadioOption
          selected={posture === 'CONTEST'}
          onSelect={() => setPosture('CONTEST')}
          title={t('sl8_litiges.reply_posture_contest_title')}
          detail={t('sl8_litiges.reply_posture_contest_detail')}
          p={p}
        />
        <RadioOption
          selected={posture === 'COMPROMISE'}
          onSelect={() => setPosture('COMPROMISE')}
          title={t('sl8_litiges.reply_posture_compromise_title')}
          detail={t('sl8_litiges.reply_posture_compromise_detail')}
          p={p}
        />
      </div>

      {posture ? (
        <div style={{ marginTop: 14 }}>
          <label className="block font-semibold mb-1.5" style={{ fontSize: 12.5, color: p.text }}>
            {t('sl8_litiges.reply_text_label')}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={t(
              posture === 'ACCEPT'
                ? 'sl8_litiges.reply_text_placeholder_accept'
                : posture === 'CONTEST'
                  ? 'sl8_litiges.reply_text_placeholder_contest'
                  : 'sl8_litiges.reply_text_placeholder_compromise',
            )}
            className="w-full rounded-xl resize-none"
            style={{ padding: '11px 13px', fontSize: 13, color: p.text, background: p.cardAlt, border: `1px solid ${p.border}` }}
          />
          {posture === 'COMPROMISE' ? (
            <p
              className="mt-1"
              style={{ fontSize: 11, color: text.trim().length >= MIN_COMPROMISE_LENGTH ? p.green : p.textMuted }}
            >
              {t('sl8_litiges.reply_char_count', { count: text.trim().length })}
            </p>
          ) : null}

          {posture === 'COMPROMISE' ? (
            <div style={{ marginTop: 10 }}>
              <label className="block font-semibold mb-1.5" style={{ fontSize: 12.5, color: p.text }}>
                {t('sl8_litiges.reply_proposed_amount_label')}
              </label>
              <input
                type="number"
                min={0}
                value={proposedAmount}
                onChange={(e) => setProposedAmount(e.target.value)}
                className="w-full rounded-xl"
                style={{ padding: '11px 13px', fontSize: 13, color: p.text, background: p.cardAlt, border: `1px solid ${p.border}` }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ height: 16 }} />
      {!online ? (
        <Banner tone="amber" p={p}>
          <span className="flex items-center gap-1.5"><WifiOff size={14} /> {t('sl8_litiges.reply_offline')}</span>
        </Banner>
      ) : (
        <p className="text-center mb-2" style={{ fontSize: 11, color: p.textMuted }}>{t('sl8_litiges.reply_network_note')}</p>
      )}
      {submitError ? <p className="text-center mb-2" style={{ fontSize: 12, color: p.red }}>{submitError}</p> : null}

      <PrimaryButton onClick={handleSubmit} disabled={!canSubmit} p={p}>
        {submitting ? t('sl8_litiges.saving') : t('sl8_litiges.reply_submit')}
      </PrimaryButton>
    </div>
  );
}
