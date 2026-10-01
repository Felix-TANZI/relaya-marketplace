// frontend/src/features/vendors/v2/litiges/ReturnInspectionPage.tsx
// Écran « Inspection à la réception » — VD-07 §INP-01 à 03 (VD-D08.A12).
// Trois temps : constater (scellé/numéro de série), photographier (2 photos
// min., horodatées/localisées), répondre (le défaut décrit est-il là ?).
//
// Bridge : POST /returns/{id}/inspection n'existe pas côté backend. Le
// verdict est envoyé via vendorsApi.reviewReturn(id, 'APPROVED'|'REJECTED',
// note) — la note texte consigne les constats et le verdict, en attendant un
// vrai endpoint d'inspection structuré. Aucune upload de photo n'existe pour
// les retours (uploadDisputeEvidence est scopé aux litiges) : les fichiers
// choisis restent en mémoire le temps de valider leur présence (INP-01),
// volontairement non envoyés plutôt que prétendre les avoir persistés.
//
// Règle produit non négociable : l'échéance des 48 h après réception est
// présentée comme « présomption en faveur du client — BelivaY décide »,
// jamais comme un remboursement automatique déclenché par le système
// (contrairement à VD-D08.A12 / tâche planifiée H5 du document source).
// La maquette Inspection.jpg écrit littéralement « Passé ce délai, le client
// est remboursé automatiquement » sous le titre : ce n'est PAS repris tel
// quel (règle produit ci-dessus, non négociable) — le bandeau existant
// (inspection_deadline_prefix/expired) reste la seule formulation utilisée.
//
// Alignement visuel : ajout de la carte « reçu » (vignette produit générique
// — OrderReturn n'a pas d'URL image —, motif, description réelle du client
// citée, date de réception) qui manquait entièrement entre l'en-tête et
// l'étape 1, alors que la maquette la place juste après le bandeau d'échéance.

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Camera, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi } from '@/services/api/vendors';
import { palette } from '../theme';
import {
  Banner, Card, CenterState, PageHeader, PrimaryButton, ProductThumb, RadioOption, SecondaryButton,
} from './ui';
import {
  fmtDateTime, returnReasonLabel, useCountdownFromDeadline, useReturnById,
} from './helpers';

const MIN_PHOTOS = 2;

export default function ReturnInspectionPage() {
  const { id } = useParams<{ id: string }>();
  const returnId = Number(id);
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('en') ? 'en' : 'fr';
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();

  const { item, loading, error } = useReturnById(returnId);

  const [sealOk, setSealOk] = useState(false);
  const [serialOk, setSerialOk] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [verdict, setVerdict] = useState<'yes' | 'no' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mediationSent, setMediationSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const inspectionDeadline = item?.received_at
    ? new Date(new Date(item.received_at).getTime() + 48 * 3600_000).toISOString()
    : null;
  const countdown = useCountdownFromDeadline(inspectionDeadline);

  if (loading) {
    return <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl8_litiges.loading')} p={p} />;
  }
  if (error || !item) {
    return <CenterState icon={<AlertTriangle size={22} color={p.red} />} title={error ?? t('sl8_litiges.inspection_not_found')} p={p} />;
  }

  const photosOk = photoCount >= MIN_PHOTOS;
  const canContinue = sealOk && serialOk && photosOk && verdict !== null && !submitting;

  function noteSummary() {
    const checks = [
      sealOk ? 'scellé intact' : 'scellé non vérifié',
      serialOk ? 'numéro de série correspond' : 'numéro de série non vérifié',
      `${photoCount} photo(s)`,
    ].join(' · ');
    return `Inspection à réception — ${checks} — défaut confirmé : ${verdict === 'yes' ? 'oui' : 'non'}`;
  }

  async function handleContinue() {
    if (!canContinue || !verdict) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (verdict === 'yes') {
        await vendorsApi.reviewReturn(returnId, 'APPROVED', noteSummary());
        navigate(`/seller/v2/retours/${returnId}/remplacement`);
      } else {
        await vendorsApi.reviewReturn(returnId, 'REJECTED', noteSummary());
        setMediationSent(true);
      }
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (mediationSent) {
    return (
      <div className="pb-24 pt-2">
        <PageHeader
          title={t('sl8_litiges.inspection_title')}
          onBack={() => navigate('/seller/v2/retours')}
          backLabel={t('sl8_litiges.common_back')}
          p={p}
        />
        <Card p={p}>
          <p className="font-bold mb-1" style={{ fontSize: 14, color: p.text }}>{t('sl8_litiges.inspection_sent_mediation')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-2">
      <PageHeader
        title={t('sl8_litiges.inspection_title')}
        subtitle={item.order_item_title}
        onBack={() => navigate('/seller/v2/retours')}
        backLabel={t('sl8_litiges.common_back')}
        p={p}
      />

      <Banner tone={countdown.expired ? 'red' : 'amber'} p={p}>
        {countdown.expired
          ? t('sl8_litiges.inspection_deadline_expired')
          : `${t('sl8_litiges.inspection_deadline_prefix')} ${
            countdown.hours > 0
              ? t('sl8_litiges.countdown_hm', { h: countdown.hours, m: countdown.minutes })
              : t('sl8_litiges.countdown_m', { m: countdown.minutes })
          }`}
      </Banner>

      <Card p={p}>
        <div className="flex items-start gap-3 mb-2">
          <ProductThumb p={p} />
          <div className="min-w-0 flex-1">
            <p className="font-bold" style={{ fontSize: 13.5, color: p.text, lineHeight: 1.3 }}>{item.order_item_title}</p>
            <p style={{ fontSize: 12, color: p.textMuted, marginTop: 2, lineHeight: 1.4 }}>
              {returnReasonLabel(t, item.reason)}
              {item.description ? ` · « ${item.description} »` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between" style={{ paddingTop: 8, borderTop: `1px solid ${p.border}` }}>
          <span style={{ fontSize: 12, color: p.textMuted }}>{t('sl8_litiges.inspection_received_label')}</span>
          <span style={{ fontSize: 12.5, color: p.text, fontWeight: 700 }}>{fmtDateTime(item.received_at, lang)}</span>
        </div>
      </Card>

      <div style={{ height: 12 }} />
      <Card p={p}>
        <p className="font-bold mb-3" style={{ fontSize: 13.5, color: p.text }}>{t('sl8_litiges.inspection_step1_title')}</p>
        <div className="flex flex-col gap-2">
          <Checkbox checked={sealOk} onChange={setSealOk} label={t('sl8_litiges.inspection_check_seal')} p={p} />
          <Checkbox checked={serialOk} onChange={setSerialOk} label={t('sl8_litiges.inspection_check_serial')} p={p} />
        </div>
      </Card>

      <div style={{ height: 12 }} />
      <Card p={p}>
        <p className="font-bold mb-1" style={{ fontSize: 13.5, color: p.text }}>{t('sl8_litiges.inspection_step2_title')}</p>
        <p style={{ fontSize: 12, color: p.textMuted, marginBottom: 10 }}>{t('sl8_litiges.inspection_photos_hint')}</p>
        <label
          className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold cursor-pointer"
          style={{ padding: '12px 14px', fontSize: 13, color: p.orange, border: `1.5px dashed ${p.orange}` }}
        >
          <Camera size={16} />
          {t('sl8_litiges.inspection_photos_add')}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => setPhotoCount(e.target.files?.length ?? 0)}
          />
        </label>
        {photoCount > 0 ? (
          <p className="mt-2" style={{ fontSize: 11.5, color: photosOk ? p.green : p.textMuted }}>
            {t('sl8_litiges.inspection_photos_count', { count: photoCount })}
          </p>
        ) : (
          <p className="mt-2" style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl8_litiges.inspection_photos_missing')}</p>
        )}
      </Card>

      <div style={{ height: 12 }} />
      <Card p={p}>
        <p className="font-bold mb-3" style={{ fontSize: 13.5, color: p.text }}>{t('sl8_litiges.inspection_step3_title')}</p>
        <p style={{ fontSize: 12.5, color: p.text, marginBottom: 10, fontWeight: 600 }}>{t('sl8_litiges.inspection_question')}</p>
        <div className="flex flex-col gap-2">
          <RadioOption
            selected={verdict === 'yes'}
            onSelect={() => setVerdict('yes')}
            title={t('sl8_litiges.inspection_verdict_yes')}
            detail={t('sl8_litiges.inspection_continue')}
            p={p}
          />
          <RadioOption
            selected={verdict === 'no'}
            onSelect={() => setVerdict('no')}
            title={t('sl8_litiges.inspection_verdict_no')}
            detail={t('sl8_litiges.inspection_send_mediation')}
            p={p}
          />
        </div>
      </Card>

      <div style={{ height: 16 }} />
      {submitError ? <p className="text-center mb-2" style={{ fontSize: 12, color: p.red }}>{submitError}</p> : null}
      {verdict === 'yes' ? (
        <PrimaryButton onClick={handleContinue} disabled={!canContinue} p={p}>
          {submitting ? t('sl8_litiges.saving') : t('sl8_litiges.inspection_continue')}
        </PrimaryButton>
      ) : verdict === 'no' ? (
        <SecondaryButton onClick={handleContinue} disabled={!canContinue} p={p} danger>
          {submitting ? t('sl8_litiges.saving') : t('sl8_litiges.inspection_send_mediation')}
        </SecondaryButton>
      ) : (
        <PrimaryButton disabled p={p}>{t('sl8_litiges.inspection_continue')}</PrimaryButton>
      )}
    </div>
  );
}

function Checkbox({ checked, onChange, label, p }: { checked: boolean; onChange: (v: boolean) => void; label: string; p: ReturnType<typeof palette> }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-2.5 rounded-xl text-left"
      style={{ padding: '11px 13px', background: p.cardAlt, border: `1px solid ${p.border}` }}
    >
      <span
        className="flex-shrink-0 rounded-md flex items-center justify-center"
        style={{ width: 18, height: 18, background: checked ? p.orange : 'transparent', border: `1.5px solid ${checked ? p.orange : p.border}` }}
      >
        {checked ? <span style={{ width: 8, height: 8, background: '#fff', borderRadius: 2 }} /> : null}
      </span>
      <span className="font-semibold" style={{ fontSize: 13, color: p.text }}>{label}</span>
    </button>
  );
}
