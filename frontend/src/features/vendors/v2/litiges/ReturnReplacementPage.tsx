// frontend/src/features/vendors/v2/litiges/ReturnReplacementPage.tsx
// Écran « Proposer un remplacement » — VD-07 §RMP-01 à 03 (VD-D08.A13/A17).
// Atteint depuis l'inspection une fois le défaut confirmé (« conforme »).
// Le client garde la main pour accepter/refuser un remplacement proposé
// (RMP-02, aligné v3 : un souhait explicite du client vaut déjà accord,
// mais ce dernier mot revient au client, pas au vendeur) — hors de portée de
// cet écran vendeur.
//
// Bridge : POST /returns/{id}/replacement n'existe pas côté backend. Les deux
// choix (remplacer / rembourser) sont envoyés via vendorsApi.reviewReturn(id,
// 'APPROVED', note) — la note texte consigne le remède choisi. Le coût du
// défaut confirmé (RMP-03 : 500 F de trajet, effet Trust Score) est un
// rappel informatif issu de la spec, pas une valeur recalculée dynamiquement
// (aucun champ dédié exposé aujourd'hui par l'API).

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi } from '@/services/api/vendors';
import { palette } from '../theme';
import { Card, CenterState, PageHeader, PrimaryButton, RadioOption } from './ui';
import { fmtXAF, useReturnById } from './helpers';

type Choice = 'replace' | 'refund';

export default function ReturnReplacementPage() {
  const { id } = useParams<{ id: string }>();
  const returnId = Number(id);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();

  const { item, loading, error } = useReturnById(returnId);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Choice | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (loading) {
    return <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl8_litiges.loading')} p={p} />;
  }
  if (error || !item) {
    return <CenterState icon={<AlertTriangle size={22} color={p.red} />} title={error ?? t('sl8_litiges.inspection_not_found')} p={p} />;
  }

  async function handleConfirm() {
    if (!choice) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const note = choice === 'replace'
        ? 'Remplacement proposé au client (défaut confirmé)'
        : 'Remboursement du client choisi par le vendeur (défaut confirmé)';
      await vendorsApi.reviewReturn(returnId, 'APPROVED', note);
      setDone(choice);
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="pb-24 pt-2">
        <PageHeader title={t('sl8_litiges.replacement_title')} p={p} backLabel={t('sl8_litiges.common_back')} />
        <Card p={p}>
          <p className="font-bold" style={{ fontSize: 14, color: p.text }}>
            {done === 'replace' ? t('sl8_litiges.replacement_sent_replace') : t('sl8_litiges.replacement_sent_refund')}
          </p>
        </Card>
        <div style={{ height: 14 }} />
        <PrimaryButton onClick={() => navigate('/seller/v2/retours')} p={p}>
          {t('sl8_litiges.replacement_back')}
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-2">
      <PageHeader
        title={t('sl8_litiges.replacement_title')}
        subtitle={item.order_item_title}
        onBack={() => navigate(`/seller/v2/retours/${returnId}`)}
        backLabel={t('sl8_litiges.common_back')}
        p={p}
      />

      <p style={{ fontSize: 12.5, color: p.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
        {t('sl8_litiges.replacement_intro')}
      </p>

      <div className="flex flex-col gap-2">
        <RadioOption
          selected={choice === 'replace'}
          onSelect={() => setChoice('replace')}
          title={t('sl8_litiges.replacement_option_replace_title')}
          detail={t('sl8_litiges.replacement_option_replace_detail')}
          p={p}
        />
        <RadioOption
          selected={choice === 'refund'}
          onSelect={() => setChoice('refund')}
          title={t('sl8_litiges.replacement_option_refund_title')}
          detail={t('sl8_litiges.replacement_option_refund_detail')}
          p={p}
        />
      </div>
      <p className="mt-2" style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic' }}>
        {t('sl8_litiges.replacement_stock_hint')}
      </p>

      <div style={{ height: 14 }} />
      <Card p={p}>
        <p className="font-bold mb-2" style={{ fontSize: 13, color: p.text }}>{t('sl8_litiges.replacement_cost_title')}</p>
        <div className="flex items-center justify-between mb-1.5">
          <span style={{ fontSize: 12, color: p.textMuted }}>{t('sl8_litiges.replacement_cost_transport')}</span>
          <span style={{ fontSize: 13, color: p.text, fontWeight: 700 }}>{fmtXAF(500)}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 12, color: p.textMuted }}>{t('sl8_litiges.replacement_cost_trust')}</span>
        </div>
        <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${p.border}` }}>
          <span style={{ fontSize: 12.5, color: p.textMuted, fontWeight: 600 }}>{t('sl8_litiges.replacement_you_keep')}</span>
          <span className="font-black" style={{ fontSize: 15, color: choice === 'replace' ? p.green : p.textMuted }}>
            {choice === 'replace' ? fmtXAF(Math.max(0, (item.refund_amount_xaf ?? 0))) : t('sl8_litiges.replacement_you_keep_na')}
          </span>
        </div>
      </Card>

      <div style={{ height: 18 }} />
      {submitError ? <p className="text-center mb-2" style={{ fontSize: 12, color: p.red }}>{submitError}</p> : null}
      <PrimaryButton onClick={handleConfirm} disabled={!choice || submitting} p={p}>
        {submitting
          ? t('sl8_litiges.saving')
          : choice === 'refund'
            ? t('sl8_litiges.replacement_confirm_refund')
            : t('sl8_litiges.replacement_confirm_replace')}
      </PrimaryButton>
    </div>
  );
}
