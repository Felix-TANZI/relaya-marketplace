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
//
// Alignement visuel sur Remplacement.jpg : vignette produit (générique —
// pas d'URL image exposée par OrderReturn) au-dessus de la carte de coût, et
// scission en deux cartes (le rappel « expédition/ramassage » n'a de sens que
// si le choix est « remplacement »). Écart volontaire : la maquette affiche
// une pastille « En stock : 3 » — aucun champ de stock n'est exposé sur
// OrderReturn, ce chiffre serait inventé, donc omis. La maquette écrit aussi
// « Passé ce délai → Remboursement automatique » ; on garde la mécanique
// (le vendeur s'est engagé sur un délai d'expédition, ce n'est pas la
// décision d'un litige) mais sans le mot « automatique », par la même
// prudence que sur l'écran Répondre — voir replacement_ship_deadline_value.

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi } from '@/services/api/vendors';
import { palette } from '../theme';
import {
  Card, CenterState, PageHeader, PrimaryButton, ProductThumb, RadioOption,
} from './ui';
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

      <div className="flex items-center gap-3 mb-4">
        <ProductThumb p={p} />
        <p className="font-bold" style={{ fontSize: 13.5, color: p.text, lineHeight: 1.3 }}>
          {item.order_item_title} {t('sl8_litiges.replacement_new_suffix')}
        </p>
      </div>

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
      {choice === 'refund' ? (
        <p className="mt-2" style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic' }}>
          {t('sl8_litiges.replacement_stock_hint')}
        </p>
      ) : null}

      {choice === 'replace' ? (
        <>
          <div style={{ height: 14 }} />
          <Card p={p}>
            <Row label={t('sl8_litiges.replacement_ship_expedition_label')} value={t('sl8_litiges.replacement_ship_expedition_value')} p={p} />
            <div style={{ height: 8 }} />
            <Row label={t('sl8_litiges.replacement_ship_pickup_label')} value={t('sl8_litiges.replacement_ship_pickup_value')} p={p} />
            <div style={{ height: 8 }} />
            <Row label={t('sl8_litiges.replacement_ship_deadline_label')} value={t('sl8_litiges.replacement_ship_deadline_value')} p={p} />
            <div
              className="rounded-xl flex items-center justify-between mt-3"
              style={{ padding: '10px 13px', background: `${p.green}14` }}
            >
              <span style={{ fontSize: 12.5, color: p.text, fontWeight: 600 }}>{t('sl8_litiges.replacement_you_keep')}</span>
              <span className="font-black" style={{ fontSize: 17, color: p.green }}>
                {fmtXAF(Math.max(0, (item.refund_amount_xaf ?? 0)))}
              </span>
            </div>
            <p className="mt-2" style={{ fontSize: 11, color: p.textMuted, lineHeight: 1.4 }}>
              {t('sl8_litiges.replacement_ship_note')}
            </p>
          </Card>
        </>
      ) : null}

      <div style={{ height: 12 }} />
      <Card p={p}>
        <p className="font-bold mb-2" style={{ fontSize: 13, color: p.text }}>{t('sl8_litiges.replacement_cost_title')}</p>
        <Row label={t('sl8_litiges.replacement_cost_transport')} value={fmtXAF(500)} p={p} />
        <div style={{ height: 8 }} />
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 12, color: p.textMuted }}>{t('sl8_litiges.replacement_cost_trust')}</span>
        </div>
        {choice !== 'replace' ? (
          <div className="flex items-center justify-between pt-2 mt-2" style={{ borderTop: `1px solid ${p.border}` }}>
            <span style={{ fontSize: 12.5, color: p.textMuted, fontWeight: 600 }}>{t('sl8_litiges.replacement_you_keep')}</span>
            <span className="font-black" style={{ fontSize: 15, color: p.textMuted }}>{t('sl8_litiges.replacement_you_keep_na')}</span>
          </div>
        ) : null}
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
      {choice === 'replace' ? (
        <p className="text-center mt-2" style={{ fontSize: 11, color: p.textMuted, lineHeight: 1.5 }}>
          {t('sl8_litiges.replacement_refuse_note')}
        </p>
      ) : null}
    </div>
  );
}

function Row({ label, value, p }: { label: string; value: string; p: ReturnType<typeof palette> }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 12, color: p.textMuted }}>{label}</span>
      <span style={{ fontSize: 12.5, color: p.text, fontWeight: 700 }}>{value}</span>
    </div>
  );
}
