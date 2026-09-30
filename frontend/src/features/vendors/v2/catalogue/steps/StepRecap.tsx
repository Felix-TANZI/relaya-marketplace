// frontend/src/features/vendors/v2/catalogue/steps/StepRecap.tsx
// Nouvelle offre · étape 4 (REC-01/02) : tout relire, "Vous gardez" en tête,
// avant "Publier" (vérification ≤48h) ou "Garder en brouillon" (rien publié).

import { useMemo } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import type { ProductCondition } from '@/services/api/vendors';
import type { CommissionTier } from '@/services/api/vendorsV2';
import type { VendorPalette } from '../../theme';
import { Card, Collapsible, KeepAmountBar, PrimaryButton, SecondaryButton } from '../ui';
import { fmtXAF, parsePriceInput, previewKeep } from '../helpers';
import type { NewOfferDraft } from '../types';

export default function StepRecap({
  draft, conditions, tier, busy, onPublish, onSaveDraft, p, t,
}: {
  draft: NewOfferDraft;
  conditions: ProductCondition[];
  tier: CommissionTier;
  busy: boolean;
  onPublish: () => void;
  onSaveDraft: () => void;
  p: VendorPalette;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const priceValue = parsePriceInput(draft.priceXaf);
  const preview = useMemo(() => previewKeep(priceValue, tier), [priceValue, tier]);
  const conditionName = conditions.find((c) => c.id === draft.conditionId)?.name ?? '—';
  const title = draft.master?.title ?? t('sl10_catalogue.step4_untitled');

  return (
    <div>
      <p className="font-bold mb-3" style={{ fontSize: 15, color: p.text }}>{t('sl10_catalogue.step4_title')}</p>

      <Card p={p}>
        <KeepAmountBar amount={fmtXAF(preview.kept_xaf)} label={t('sl10_catalogue.you_keep_per_sale')} p={p} size={24} />
        <div className="mt-3 flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ border: `1px solid ${p.border}` }}>
            {draft.photos[0] ? (
              <img src={draft.photos[0].previewUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: p.cardAlt }}>
                <ImageIcon size={18} color={p.textMuted} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate" style={{ fontSize: 14, color: p.text }}>{title}</p>
            <p style={{ fontSize: 12, color: p.textMuted }}>{fmtXAF(priceValue)}</p>
          </div>
        </div>

        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${p.border}` }}>
          <SummaryRow label={t('sl10_catalogue.field_color')} value={draft.color || '—'} p={p} />
          <SummaryRow label={t('sl10_catalogue.field_stock')} value={String(draft.stockQuantity || 0)} p={p} />
          <SummaryRow label={t('sl10_catalogue.field_condition')} value={conditionName} p={p} />
          <SummaryRow label={t('sl10_catalogue.step4_photos_count')} value={String(draft.photos.length)} p={p} />
        </div>
      </Card>

      <div className="mt-3">
        <Collapsible title={t('sl10_catalogue.step4_when_money_arrives')} p={p}>
          {t('sl10_catalogue.step4_when_money_arrives_detail')}
        </Collapsible>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <PrimaryButton p={p} disabled={busy} onClick={onPublish}>
          {busy ? t('sl10_catalogue.saving') : t('sl10_catalogue.step4_cta_publish')}
        </PrimaryButton>
        <SecondaryButton p={p} disabled={busy} onClick={onSaveDraft}>
          {t('sl10_catalogue.step4_cta_draft')}
        </SecondaryButton>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, p }: { label: string; value: string; p: VendorPalette }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '5px 0' }}>
      <span style={{ fontSize: 12, color: p.textMuted }}>{label}</span>
      <span className="font-semibold" style={{ fontSize: 12, color: p.text }}>{value}</span>
    </div>
  );
}
