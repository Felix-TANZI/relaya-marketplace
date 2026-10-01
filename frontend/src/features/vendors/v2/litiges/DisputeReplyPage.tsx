// frontend/src/features/vendors/v2/litiges/DisputeReplyPage.tsx
// Écran « Répondre » — VD-07 §REP-01 à 06 (VD-D08.A05/A06/A07).
// POST /disputes/{id}/answer existe déjà côté bridge : vendorsApi.submitDisputeReply.
// Trois postures (REP-01) : j'accepte / je conteste / arrangement ≥ 40
// caractères (G2). Réponse verrouillée après envoi (REP-02) : ce composant ne
// permet pas de rejouer l'appel une fois vendor_replied=true, il bascule sur
// un récapitulatif en lecture seule et propose « Voir la décision ». Ce
// récapitulatif reprend désormais le même contexte (photo/motif client,
// montant gelé) dans le même ordre que l'écran de saisie, avant l'issue
// choisie — cf. Repondre_accepte.jpg/Repondre_arrangement.jpg.
//
// Règle produit non négociable : au-delà de l'échéance, le bandeau dit
// « présomption en faveur du client — BelivaY décide », jamais un texte
// suggérant un remboursement automatique déclenché par le système. La
// maquette Repondre_arrangement.jpg évoque un remplacement « remboursé
// automatiquement » passé 72 h : on reprend la mécanique (le vendeur s'est
// engagé sur un délai de livraison, pas une décision de litige) mais SANS le
// mot « automatique », par prudence sur ce point précis (voir
// reply_compromise_replace_note ci-dessous et le rapport de mission).
//
// Écart connu vs Repondre.jpg/Repondre_accepte.jpg/Repondre_arrangement.jpg :
// aucune photo ni nom produit n'est exposé par VendorDisputeDetail (seulement
// reason/description/order_ref) — la vignette reste générique (ProductThumb).
// Les vignettes de preuves (dispute.evidences[].file_url), elles, sont bien
// de vraies images et sont maintenant affichées en grille plutôt qu'en liens
// texte, avec un ajout de preuve réel quand une evidence_request est PENDING
// (vendorsApi.uploadDisputeEvidence, déjà câblé côté bridge mais jusqu'ici
// jamais utilisé par aucun écran).

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, Camera, Clock, Image as ImageIcon, RefreshCw, WifiOff,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import {
  vendorsApi, type VendorDisputeDetail, type VendorDisputeEvidence, type VendorReplyType,
} from '@/services/api/vendors';
import { palette, type VendorPalette } from '../theme';
import {
  Banner, Card, CenterState, Collapsible, PageHeader, PrimaryButton, ProductThumb, RadioOption,
} from './ui';
import {
  fmtDateTime, fmtXAF, isImageUrl, useCountdownFromHours, useOnlineStatus,
} from './helpers';

const MIN_COMPROMISE_LENGTH = 40;

type CompromiseKind = 'replace' | 'refund';

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
  const [compromiseKind, setCompromiseKind] = useState<CompromiseKind>('replace');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

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
  const pendingRequest = dispute.evidence_requests.find((r) => r.status === 'PENDING') ?? null;

  const canSubmit = (() => {
    if (!posture || submitting || !online) return false;
    if (posture === 'CONTEST') return text.trim().length > 0;
    if (posture === 'COMPROMISE') return text.trim().length >= MIN_COMPROMISE_LENGTH;
    return true;
  })();

  async function handleEvidenceUpload(file: File) {
    if (!pendingRequest) return;
    setUploadingEvidence(true);
    setEvidenceError(null);
    try {
      const ev = await vendorsApi.uploadDisputeEvidence(disputeId, pendingRequest.id, file);
      setDispute((d) => (d ? {
        ...d,
        evidences: [...d.evidences, ev],
        evidence_requests: d.evidence_requests.map((r) => (r.id === pendingRequest.id ? { ...r, status: 'SUBMITTED' } : r)),
      } : d));
    } catch (e) {
      setEvidenceError((e as Error).message);
    } finally {
      setUploadingEvidence(false);
    }
  }

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

        {/* Même contexte, même ordre que l'écran de saisie (motif client puis
            montant gelé) avant l'issue — cf. mission : le récap ne doit pas
            perdre l'information visible avant l'envoi de la réponse. */}
        <Card p={p}>
          <p className="font-bold mb-2" style={{ fontSize: 14, color: p.text }}>{t('sl8_litiges.reply_customer_says_title')}</p>
          <div className="flex items-start gap-3 mb-2">
            <ProductThumb p={p} />
            <div className="min-w-0 flex-1">
              <p className="font-bold" style={{ fontSize: 14, color: p.text, lineHeight: 1.35 }}>« {dispute.reason_display} »</p>
              {dispute.description ? (
                <p className="mt-1" style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.4 }}>{dispute.description}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 12, color: p.textMuted, fontWeight: 600 }}>{t('sl8_litiges.reply_frozen_amount_label')}</span>
            <span className="font-black" style={{ fontSize: 16, color: p.red }}>{fmtXAF(dispute.vendor_escrow_amount)}</span>
          </div>
        </Card>

        <div style={{ height: 10 }} />
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
        <div className="flex items-start gap-3 mb-2">
          <ProductThumb p={p} />
          <div className="min-w-0 flex-1">
            <p className="font-bold" style={{ fontSize: 14, color: p.text, lineHeight: 1.35 }}>« {dispute.reason_display} »</p>
            {dispute.description ? (
              <p className="mt-1" style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.4 }}>{dispute.description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between mb-1" style={{ paddingTop: 6, borderTop: `1px solid ${p.border}` }}>
          <span style={{ fontSize: 12, color: p.textMuted, fontWeight: 600 }}>{t('sl8_litiges.reply_frozen_amount_label')}</span>
          <span className="font-black" style={{ fontSize: 16, color: p.red }}>{fmtXAF(dispute.vendor_escrow_amount)}</span>
        </div>
      </Card>

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

      {/* Aperçu de la conséquence — visible seulement pour ACCEPT (issue
          certaine). Pas d'aperçu pour CONTEST : l'issue dépend de la
          médiation (Repondre.jpg n'en montre pas non plus dans ce cas). */}
      {posture === 'ACCEPT' ? (
        <div
          className="rounded-xl mt-3"
          style={{ padding: '12px 14px', background: `${p.amber}14`, border: `1px solid ${p.amber}40` }}
        >
          <p className="font-bold mb-1.5" style={{ fontSize: 12.5, color: p.text }}>{t('sl8_litiges.reply_preview_accept_title')}</p>
          <p style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.6 }}>{t('sl8_litiges.reply_preview_accept_line1')}</p>
          <p style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.6 }}>{t('sl8_litiges.reply_preview_accept_line2')}</p>
          <p style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.6 }}>{t('sl8_litiges.reply_preview_accept_line3')}</p>
        </div>
      ) : null}

      {posture === 'CONTEST' ? (
        <div style={{ marginTop: 14 }}>
          <label className="block font-semibold mb-1.5" style={{ fontSize: 12.5, color: p.text }}>
            {t('sl8_litiges.reply_text_label_contest')} *
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={t('sl8_litiges.reply_text_placeholder_contest')}
            className="w-full rounded-xl resize-none"
            style={{ padding: '11px 13px', fontSize: 13, color: p.text, background: p.cardAlt, border: `1px solid ${p.border}` }}
          />
          <p className="mt-1" style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic' }}>
            {t('sl8_litiges.reply_text_hint_contest')}
          </p>
        </div>
      ) : null}

      {posture === 'COMPROMISE' ? (
        <div style={{ marginTop: 14 }}>
          <div className="flex gap-2 mb-3">
            <CompromiseChip
              active={compromiseKind === 'replace'}
              onClick={() => setCompromiseKind('replace')}
              label={t('sl8_litiges.reply_compromise_kind_replace')}
              p={p}
            />
            <CompromiseChip
              active={compromiseKind === 'refund'}
              onClick={() => setCompromiseKind('refund')}
              label={t('sl8_litiges.reply_compromise_kind_refund')}
              p={p}
            />
          </div>

          <label className="block font-semibold mb-1.5" style={{ fontSize: 12.5, color: p.text }}>
            {t('sl8_litiges.reply_text_label_compromise')} *
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={t('sl8_litiges.reply_text_placeholder_compromise')}
            className="w-full rounded-xl resize-none"
            style={{ padding: '11px 13px', fontSize: 13, color: p.text, background: p.cardAlt, border: `1px solid ${p.border}` }}
          />
          <p
            className="mt-1"
            style={{ fontSize: 11, color: text.trim().length >= MIN_COMPROMISE_LENGTH ? p.green : p.textMuted }}
          >
            {t('sl8_litiges.reply_char_count', { count: text.trim().length })}
            {text.trim().length >= MIN_COMPROMISE_LENGTH ? ' ✓' : ''}
          </p>

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

          <div
            className="rounded-xl mt-3 flex items-start gap-2"
            style={{ padding: '11px 13px', background: `${p.amber}14`, border: `1px solid ${p.amber}40` }}
          >
            <Clock size={14} color={p.amber} style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 11.5, color: p.text, lineHeight: 1.5 }}>
              {compromiseKind === 'replace'
                ? t('sl8_litiges.reply_compromise_replace_note')
                : t('sl8_litiges.reply_compromise_refund_note')}
            </p>
          </div>
        </div>
      ) : null}

      {posture ? (
        <div style={{ marginTop: 16 }}>
          <Collapsible title={t('sl8_litiges.reply_evidence_title')} p={p} defaultOpen>
            {dispute.evidences.length === 0 && !pendingRequest ? (
              <p>{t('sl8_litiges.reply_evidence_empty')}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {dispute.evidences.map((ev) => <EvidenceTile key={ev.id} ev={ev} p={p} t={t} />)}
                {pendingRequest ? (
                  <UploadTile p={p} t={t} uploading={uploadingEvidence} onPick={handleEvidenceUpload} />
                ) : null}
              </div>
            )}
            {pendingRequest ? (
              <p className="mb-2" style={{ fontWeight: 600, color: p.text }}>
                {t('sl8_litiges.reply_evidence_request_label')} : {pendingRequest.instructions}
              </p>
            ) : null}
            {evidenceError ? <p style={{ color: p.red, marginBottom: 6 }}>{evidenceError}</p> : null}
            <p style={{ fontStyle: 'italic' }}>{t('sl8_litiges.reply_evidence_note')}</p>
          </Collapsible>
          <button
            type="button"
            onClick={() => navigate('/seller/v2/messagerie')}
            className="w-full text-left rounded-xl font-semibold mt-2"
            style={{ padding: '11px 13px', fontSize: 12.5, color: p.orange, border: `1px solid ${p.border}` }}
          >
            {t('sl8_litiges.reply_reread_messages')}
          </button>
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
      <p className="text-center mt-2" style={{ fontSize: 11, color: p.textMuted, lineHeight: 1.5 }}>
        {t('sl8_litiges.reply_footer_immutable')}{' '}
        {posture === 'ACCEPT' ? t('sl8_litiges.reply_footer_note_accept') : t('sl8_litiges.reply_footer_note_default')}
      </p>

      <div style={{ height: 14 }} />
      <Collapsible title={t('sl8_litiges.list_how_title')} p={p}>
        <p style={{ marginBottom: 6 }}>{t('sl8_litiges.list_how_body_1')}</p>
        <p style={{ marginBottom: 6 }}>{t('sl8_litiges.list_how_body_2')}</p>
        <p className="font-semibold" style={{ color: p.text }}>{t('sl8_litiges.list_how_body_silence')}</p>
      </Collapsible>
    </div>
  );
}

function CompromiseChip({
  active, onClick, label, p,
}: { active: boolean; onClick: () => void; label: string; p: VendorPalette }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full font-bold"
      style={{
        padding: '8px 14px',
        fontSize: 12.5,
        minHeight: 36,
        background: active ? p.text : p.cardAlt,
        color: active ? p.bg : p.textMuted,
        border: `1px solid ${active ? p.text : p.border}`,
      }}
    >
      {label}
    </button>
  );
}

/** Vignette de preuve — vraie image quand file_url pointe vers un fichier image, sinon lien générique. */
function EvidenceTile({ ev, p, t }: { ev: VendorDisputeEvidence; p: VendorPalette; t: (key: string) => string }) {
  const isImage = isImageUrl(ev.file_url);
  return (
    <a
      href={ev.file_url}
      target="_blank"
      rel="noreferrer"
      className="rounded-lg overflow-hidden flex flex-col items-center justify-center relative"
      style={{ aspectRatio: '1', border: `1px solid ${p.border}`, background: p.cardAlt }}
      title={ev.description || ev.uploaded_by_name}
    >
      {isImage ? (
        <img src={ev.file_url} alt={ev.description || t('sl8_litiges.reply_evidence_title')} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 p-1 text-center">
          <ImageIcon size={16} color={p.textMuted} />
          <span style={{ fontSize: 8.5, color: p.textMuted, lineHeight: 1.2 }}>{ev.description || ev.uploaded_by_name}</span>
        </div>
      )}
    </a>
  );
}

function UploadTile({
  p, t, uploading, onPick,
}: { p: VendorPalette; t: (key: string) => string; uploading: boolean; onPick: (file: File) => void }) {
  return (
    <label
      className="rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer"
      style={{ aspectRatio: '1', border: `1.5px dashed ${p.orange}`, color: p.orange, opacity: uploading ? 0.6 : 1 }}
    >
      <Camera size={16} />
      <span style={{ fontSize: 10, fontWeight: 700 }}>{uploading ? t('sl8_litiges.saving') : t('sl8_litiges.reply_evidence_add')}</span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}
