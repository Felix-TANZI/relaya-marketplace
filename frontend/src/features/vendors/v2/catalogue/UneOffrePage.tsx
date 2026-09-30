// frontend/src/features/vendors/v2/catalogue/UneOffrePage.tsx
// Écran "Une offre" — VD-08 §3.1 (OFR-01 à OFR-05).
// Pas de GET /offers/{id} ni GET /offers/{id}/price-advice côté backend :
// bridge sur vendorsApi.getProducts() (pas de "get by id" dédié, comme
// ProductFormPage.tsx) + listConditions(). La carte "Où les clients vous
// voient" (zones gagnées/perdues) n'a aucune donnée réelle à afficher tant
// que price-advice n'existe pas : rendue en état honnête "bientôt disponible"
// plutôt que fabriquée (MANQUE BACKEND, voir aussi Collapsible ci-dessous).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, MapPin, Package, Pause, Play, Pencil, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import {
  vendorsApi, type ProductCondition, type VendorProduct, type VendorProfile,
} from '@/services/api/vendors';
import { palette } from '../theme';
import {
  Card, CenterState, Collapsible, KeepAmountBar, PageHeader, Pill, PrimaryButton, SecondaryButton, Toggle,
} from './ui';
import { fmtXAF, keptPerSaleOf, primaryImageOf, tierToCommissionTier } from './helpers';

export default function UneOffrePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);

  const [product, setProduct] = useState<VendorProduct | null>(null);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [conditions, setConditions] = useState<ProductCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, prof, conds] = await Promise.all([
        vendorsApi.getProducts(),
        vendorsApi.getProfile().catch(() => null),
        vendorsApi.listConditions().catch(() => []),
      ]);
      setProduct(prods.find((prod) => prod.id === productId) ?? null);
      setProfile(prof);
      setConditions(conds);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const tier = tierToCommissionTier(profile?.certification_tier);
  const keptPerSale = useMemo(() => (product ? keptPerSaleOf(product, tier) : 0), [product, tier]);
  const conditionName = conditions.find((c) => c.id === product?.condition)?.name ?? null;

  async function togglePause() {
    if (!product) return;
    setBusy(true);
    try {
      const updated = await vendorsApi.updateProduct(product.id, { is_active: !product.is_active });
      setProduct(updated);
      showToast(updated.is_active ? t('sl10_catalogue.toast_resumed') : t('sl10_catalogue.toast_paused'), 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl10_catalogue.loading')} p={p} />;
  }
  if (!product) {
    return <CenterState icon={<Package size={22} color={p.red} />} title={t('sl10_catalogue.offer_not_found')} p={p} />;
  }

  const image = primaryImageOf(product);

  return (
    <div className="pb-24 pt-2">
      <PageHeader
        title={t('sl10_catalogue.offer_title')}
        onBack={() => navigate('/seller/v2/produits')}
        backLabel={t('sl10_catalogue.back')}
        p={p}
      />

      <Card p={p}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: p.cardAlt }}>
            {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <Package size={22} color={p.textMuted} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold truncate" style={{ fontSize: 15, color: p.text }}>{product.title}</p>
            <Pill
              label={product.is_active ? t('sl10_catalogue.state_selling') : t('sl10_catalogue.state_paused')}
              tone={product.is_active ? 'green' : 'muted'}
              p={p}
            />
          </div>
        </div>
        <KeepAmountBar amount={fmtXAF(keptPerSale)} label={t('sl10_catalogue.you_keep_per_sale')} p={p} />
      </Card>

      {/* Carte clé "Où les clients vous voient" (OFR-04) — pas de données réelles disponibles */}
      <div className="mt-3">
        <Card p={p}>
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={15} color={p.orange} />
            <p className="font-bold" style={{ fontSize: 13.5, color: p.text }}>{t('sl10_catalogue.zones_title')}</p>
          </div>
          <p style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.5 }}>{t('sl10_catalogue.zones_unavailable')}</p>
        </Card>
      </div>

      {/* "Votre offre" (OFR-01/02) */}
      <div className="mt-3 flex flex-col gap-3">
        <Card p={p}>
          <p className="font-bold mb-3" style={{ fontSize: 13.5, color: p.text }}>{t('sl10_catalogue.your_offer_title')}</p>
          <Row label={t('sl10_catalogue.field_price')} value={fmtXAF(product.price_xaf)} p={p} />
          <Row label={t('sl10_catalogue.field_stock')} value={String(product.stock_quantity)} p={p} />
          {conditionName ? <Row label={t('sl10_catalogue.field_condition')} value={conditionName} p={p} /> : null}
          {/* Ligne cadenas : la fiche (titre/description/photos de référence) appartient à BelivaY (OFR-01/A07) */}
          <div className="flex items-center justify-between mt-2" style={{ padding: '8px 0' }}>
            <span style={{ fontSize: 12, color: p.textMuted }}>{t('sl10_catalogue.field_sheet_locked')}</span>
            <span style={{ fontSize: 11, color: p.textMuted }}>🔒 BelivaY</span>
          </div>
        </Card>

        <Card p={p}>
          {/* PUT /offers/{id} {cod_allowed} n'existe pas côté backend (MANQUE BACKEND) */}
          <Toggle checked={false} onChange={() => showToast(t('sl10_catalogue.toast_soon'), 'info')} label={t('sl10_catalogue.toggle_cod')} p={p} disabled />
          <div className="h-2" />
          <Toggle checked={false} onChange={() => showToast(t('sl10_catalogue.toast_soon'), 'info')} label={t('sl10_catalogue.toggle_auto_price')} p={p} disabled />
        </Card>

        {!product.is_active ? (
          <Card p={p} accent={p.amber}>
            <p className="font-bold mb-1" style={{ fontSize: 13, color: p.text }}>{t('sl10_catalogue.moderation_title')}</p>
            <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl10_catalogue.moderation_detail')}</p>
          </Card>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <SecondaryButton p={p} onClick={() => navigate(`/seller/products/${product.id}/edit`)}>
          <span className="flex items-center justify-center gap-2"><Pencil size={14} /> {t('sl10_catalogue.cta_edit_price')}</span>
        </SecondaryButton>
        <SecondaryButton p={p} onClick={() => navigate(`/seller/products/${product.id}/edit`)}>
          {t('sl10_catalogue.cta_edit_offer')}
        </SecondaryButton>
        <SecondaryButton p={p} onClick={() => navigate(`/seller/v2/produits/dupliquer/${product.id}`)}>
          <span className="flex items-center justify-center gap-2"><Copy size={14} /> {t('sl10_catalogue.duplicate')}</span>
        </SecondaryButton>
        <PrimaryButton p={p} disabled={busy} onClick={togglePause}>
          <span className="flex items-center justify-center gap-2">
            {product.is_active ? <Pause size={14} /> : <Play size={14} />}
            {product.is_active ? t('sl10_catalogue.cta_pause') : t('sl10_catalogue.cta_resume')}
          </span>
        </PrimaryButton>
      </div>

      <div className="mt-4">
        <Collapsible title={t('sl10_catalogue.how_it_works')} p={p}>
          {t('sl10_catalogue.how_it_works_offer_detail')}
        </Collapsible>
      </div>
    </div>
  );
}

function Row({ label, value, p }: { label: string; value: string; p: ReturnType<typeof palette> }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '6px 0' }}>
      <span style={{ fontSize: 12.5, color: p.textMuted }}>{label}</span>
      <span className="font-semibold" style={{ fontSize: 12.5, color: p.text }}>{value}</span>
    </div>
  );
}
