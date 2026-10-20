// frontend/src/features/vendors/v2/catalogue/steps/StepStockPrix.tsx
// Nouvelle offre · étape 3 (PRX-01 à PRX-09) : couleur, stock, état, puis le
// prix avec "Vous gardez X F" recalculé en direct (débounce 300 ms, A22) —
// jamais le mot commission. La carte "Pour vendre plus" (GET
// /offers/{id}/price-advice, A27) n'a pas d'endpoint : rendue en état honnête
// plutôt qu'avec un prix conseillé inventé (MANQUE BACKEND, voir helpers.ts).

import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import type { ProductCondition } from '@/services/api/vendors';
import type { CommissionTier } from '@/services/api/vendorsV2';
import type { VendorPalette } from '../../theme';
import { Card, Collapsible, KeepAmountBar } from '../ui';
import {
  fmtPercent1, fmtXAF, MIN_PUBLISHABLE_PRICE_XAF, oversizeFieldsRequired, parsePriceInput,
  previewKeep, useDebouncedValue,
} from '../helpers';
import type { NewOfferDraft } from '../types';

export default function StepStockPrix({
  draft, onChange, conditions, tier, p, t,
}: {
  draft: NewOfferDraft;
  onChange: (patch: Partial<NewOfferDraft>) => void;
  conditions: ProductCondition[];
  tier: CommissionTier;
  p: VendorPalette;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const priceValue = parsePriceInput(draft.priceXaf);
  const debouncedPrice = useDebouncedValue(priceValue, 300);
  const preview = useMemo(() => previewKeep(debouncedPrice || 0, tier), [debouncedPrice, tier]);

  const weightKg = parseFloat(draft.weightKg) || 0;
  const dimCm = parseFloat(draft.dimensionsCm) || 0;
  const needsDimensions = oversizeFieldsRequired(weightKg, dimCm);

  const priceTooLow = priceValue > 0 && priceValue < MIN_PUBLISHABLE_PRICE_XAF;

  return (
    <div>
      <p className="font-bold mb-3" style={{ fontSize: 15, color: p.text }}>{t('sl10_catalogue.step3_title')}</p>

      <Field label={t('sl10_catalogue.field_color')} p={p}>
        <input
          value={draft.color}
          onChange={(e) => onChange({ color: e.target.value })}
          placeholder={t('sl10_catalogue.field_color_example')}
          style={inputStyle(p)}
        />
      </Field>

      <Field label={t('sl10_catalogue.field_stock')} required p={p}>
        <input
          type="number"
          min={0}
          value={draft.stockQuantity}
          onChange={(e) => onChange({ stockQuantity: e.target.value })}
          placeholder={t('sl10_catalogue.field_stock_example')}
          style={inputStyle(p)}
        />
      </Field>

      <Field label={t('sl10_catalogue.field_condition')} required p={p}>
        <select
          value={draft.conditionId ?? ''}
          onChange={(e) => onChange({ conditionId: e.target.value ? Number(e.target.value) : null })}
          style={inputStyle(p)}
        >
          <option value="">{t('sl10_catalogue.field_condition_placeholder')}</option>
          {conditions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <div className="mb-3">
        <Collapsible title={t('sl10_catalogue.step3_other_settings')} p={p} defaultOpen={needsDimensions}>
          <div className="flex flex-col gap-3 pt-1">
            <Field label={t('sl10_catalogue.field_weight')} required={needsDimensions} p={p}>
              <input
                type="number"
                min={0}
                value={draft.weightKg}
                onChange={(e) => onChange({ weightKg: e.target.value })}
                placeholder={t('sl10_catalogue.field_weight_example')}
                style={inputStyle(p)}
              />
            </Field>
            <Field label={t('sl10_catalogue.field_dimensions')} required={needsDimensions} p={p}>
              <input
                value={draft.dimensionsCm}
                onChange={(e) => onChange({ dimensionsCm: e.target.value })}
                placeholder={t('sl10_catalogue.field_dimensions_example')}
                style={inputStyle(p)}
              />
            </Field>
          </div>
        </Collapsible>
        {needsDimensions ? (
          <p className="mt-1.5" style={{ fontSize: 11, color: p.amber }}>{t('sl10_catalogue.step3_oversize_notice')}</p>
        ) : null}
      </div>

      <Field label={t('sl10_catalogue.field_price')} required hint={t('sl10_catalogue.field_price_min', { min: fmtXAF(MIN_PUBLISHABLE_PRICE_XAF) })} p={p}>
        <input
          type="number"
          min={0}
          value={draft.priceXaf}
          onChange={(e) => onChange({ priceXaf: e.target.value })}
          placeholder={t('sl10_catalogue.field_price_example')}
          style={inputStyle(p)}
        />
      </Field>
      {priceTooLow ? (
        <p className="-mt-2 mb-3" style={{ fontSize: 11.5, color: p.red }}>
          {t('sl10_catalogue.field_price_too_low', { min: fmtXAF(MIN_PUBLISHABLE_PRICE_XAF) })}
        </p>
      ) : null}

      {priceValue >= MIN_PUBLISHABLE_PRICE_XAF ? (
        <div className="mb-3">
          <KeepAmountBar
            amount={fmtXAF(preview.kept_xaf)}
            label={t('sl10_catalogue.you_keep_live', { pct: fmtPercent1(preview.effective_rate ? 1 - preview.effective_rate : 0) })}
            p={p}
          />
        </div>
      ) : null}

      {/* "Pour vendre plus" (PRX-07) — pas de prix conseillé réel disponible aujourd'hui */}
      <Card p={p}>
        <div className="flex items-center gap-2 mb-1.5">
          <TrendingUp size={15} color={p.orange} />
          <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl10_catalogue.step3_sell_more_title')}</p>
        </div>
        <p style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.5 }}>{t('sl10_catalogue.step3_sell_more_unavailable')}</p>
      </Card>
    </div>
  );
}

function Field({
  label, required, hint, p, children,
}: { label: string; required?: boolean; hint?: string; p: VendorPalette; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="flex items-center gap-1 font-semibold mb-1.5" style={{ fontSize: 12, color: p.text }}>
        {label}{required ? <span style={{ color: p.red }}>*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1" style={{ fontSize: 11, color: p.textMuted }}>{hint}</p> : null}
    </div>
  );
}

function inputStyle(p: VendorPalette): React.CSSProperties {
  return {
    width: '100%', padding: '11px 12px', fontSize: 13.5, borderRadius: 12,
    background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text,
  };
}
