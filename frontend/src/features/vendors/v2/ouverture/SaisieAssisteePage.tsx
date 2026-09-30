// frontend/src/features/vendors/v2/ouverture/SaisieAssisteePage.tsx
// Écran « Saisie assistée » — VD-03 §1.1 (VD-D04.A16, SAI-01 à SAI-04).
// Un agent BelivaY photographie/saisit les produits ; le vendeur valide en
// masse les « Prêts » (4 contrôles sur 4), ou un par un les « À vérifier » et
// « Doublon ». GET /api/vendors/assisted-entry/ n'existe pas encore côté
// backend — voir api.ts pour le principe de branchement.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Copy, Pencil, ShieldCheck } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette, type VendorPalette } from '../theme';
import { Card, CenterState, Collapsible, Pill, PrimaryButton } from '../commandes/ui';
import { fmtXAF } from '../commandes/helpers';
import { approveAssistedEntryBatch, approveAssistedEntryProduct, getAssistedEntryBatch } from './api';
import type { AssistedEntryBatch, AssistedEntryProduct } from './types';

function ProductThumb({ url, title, p }: { url: string | null; title: string; p: VendorPalette }) {
  if (url) return <img src={url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />;
  return (
    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black" style={{ background: p.cardAlt, color: p.textMuted, fontSize: 14 }}>
      {title.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function SaisieAssisteePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);

  const [batch, setBatch] = useState<AssistedEntryBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [validatedIds, setValidatedIds] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    getAssistedEntryBatch().then(setBatch).finally(() => setLoading(false));
  }, []);

  const setBusy = (id: number, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleApproveOne = async (product: AssistedEntryProduct) => {
    setBusy(product.id, true);
    try {
      await approveAssistedEntryProduct(product.id);
      setValidatedIds((prev) => new Set(prev).add(product.id));
    } catch {
      // Erreur silencieuse ponctuelle : la ligne reste cliquable pour réessayer.
    } finally {
      setBusy(product.id, false);
    }
  };

  const readyProducts = (batch?.products ?? []).filter((pr) => pr.group === 'ready' && !validatedIds.has(pr.id));
  const toCheckProducts = (batch?.products ?? []).filter((pr) => pr.group === 'to_check' && !validatedIds.has(pr.id));
  const duplicateProducts = (batch?.products ?? []).filter((pr) => pr.group === 'duplicate' && !validatedIds.has(pr.id));
  const total = readyProducts.length + toCheckProducts.length + duplicateProducts.length;

  const handleBulkApprove = async () => {
    setBulkBusy(true);
    try {
      await approveAssistedEntryBatch(readyProducts.map((pr) => pr.id));
      setValidatedIds((prev) => {
        const next = new Set(prev);
        readyProducts.forEach((pr) => next.add(pr.id));
        return next;
      });
    } catch {
      // Idem : erreur ponctuelle, l'action reste disponible pour réessayer.
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="pb-24 pt-2">
      <Link to="/seller/products" className="mb-3 inline-flex items-center gap-1 font-semibold" style={{ fontSize: 12.5, color: p.textMuted }}>
        <ChevronLeft size={14} /> {t('sl9_ouverture.back_to_my_products')}
      </Link>

      {loading ? (
        <div className="py-16 text-center" style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl9_ouverture.loading')}</div>
      ) : !batch || total === 0 ? (
        <CenterState
          icon={<ShieldCheck size={24} color={p.textMuted} />}
          title={t('sl9_ouverture.assisted_entry_empty_title')}
          detail={t('sl9_ouverture.assisted_entry_empty_detail')}
          p={p}
        />
      ) : (
        <>
          <h1 className="font-black mb-1" style={{ fontSize: 18, color: p.text }}>
            {t('sl9_ouverture.assisted_entry_title', { count: total })}
          </h1>
          <p className="mb-5" style={{ fontSize: 12.5, color: p.textMuted }}>
            {t('sl9_ouverture.assisted_entry_subtitle', { agent: batch.agentName, zone: batch.zoneLabel, date: batch.visitedAt })}
          </p>

          {readyProducts.length > 0 ? (
            <section className="mb-6">
              <p className="font-black uppercase mb-2" style={{ fontSize: 10.5, letterSpacing: '.1em', color: p.green }}>
                {t('sl9_ouverture.group_ready')} · {readyProducts.length}
              </p>
              <div className="space-y-2 mb-3">
                {readyProducts.map((pr) => (
                  <Card key={pr.id} p={p}>
                    <div className="flex items-center gap-3">
                      <ProductThumb url={pr.imageUrl} title={pr.title} p={p} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate" style={{ fontSize: 13, color: p.text }}>{pr.title}</p>
                        <p style={{ fontSize: 11.5, color: p.textMuted }}>{fmtXAF(pr.priceXaf)} · {t('sl9_ouverture.stock_label', { count: pr.stock })}</p>
                        <div className="mt-1"><Pill label={t('sl9_ouverture.checks_passed', { count: pr.checksPassed })} tone="green" p={p} /></div>
                      </div>
                      <Link to={`/seller/products/${pr.id}/edit`} aria-label={t('sl9_ouverture.edit')} className="flex-shrink-0">
                        <Pencil size={16} color={p.textMuted} />
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
              <PrimaryButton p={p} onClick={handleBulkApprove} disabled={bulkBusy}>
                {bulkBusy ? t('sl9_ouverture.validating') : t('sl9_ouverture.validate_ready_products', { count: readyProducts.length })}
              </PrimaryButton>
            </section>
          ) : null}

          {toCheckProducts.length > 0 ? (
            <section className="mb-6">
              <p className="font-black uppercase mb-2" style={{ fontSize: 10.5, letterSpacing: '.1em', color: p.amber }}>
                {t('sl9_ouverture.group_to_check')} · {toCheckProducts.length}
              </p>
              <div className="space-y-2">
                {toCheckProducts.map((pr) => (
                  <Card key={pr.id} p={p}>
                    <div className="flex items-center gap-3 mb-2">
                      <ProductThumb url={pr.imageUrl} title={pr.title} p={p} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate" style={{ fontSize: 13, color: p.text }}>{pr.title}</p>
                        <p style={{ fontSize: 11.5, color: p.textMuted }}>{fmtXAF(pr.priceXaf)} · {t('sl9_ouverture.stock_label', { count: pr.stock })}</p>
                      </div>
                    </div>
                    {pr.reasonLabel ? (
                      <div className="rounded-xl p-2.5 mb-2.5" style={{ background: `${p.amber}14`, border: `1px solid ${p.amber}44` }}>
                        <p style={{ fontSize: 12, color: p.text }}>{pr.reasonLabel}</p>
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <PrimaryButton p={p} onClick={() => handleApproveOne(pr)} disabled={busyIds.has(pr.id)}>
                          {busyIds.has(pr.id) ? t('sl9_ouverture.validating') : t('sl9_ouverture.validate')}
                        </PrimaryButton>
                      </div>
                      <Link
                        to={`/seller/products/${pr.id}/edit`}
                        className="flex items-center justify-center rounded-2xl font-bold"
                        style={{ padding: '14px 16px', fontSize: 13, background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text }}
                      >
                        {t('sl9_ouverture.edit')}
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {duplicateProducts.length > 0 ? (
            <section className="mb-6">
              <p className="font-black uppercase mb-2" style={{ fontSize: 10.5, letterSpacing: '.1em', color: p.textMuted }}>
                {t('sl9_ouverture.group_duplicate')} · {duplicateProducts.length}
              </p>
              <div className="space-y-2">
                {duplicateProducts.map((pr) => (
                  <Card key={pr.id} p={p}>
                    <div className="flex items-center gap-3 mb-2">
                      <ProductThumb url={pr.imageUrl} title={pr.title} p={p} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate" style={{ fontSize: 13, color: p.text }}>{pr.title}</p>
                        {pr.existingProductRef ? (
                          <div className="mt-1 flex items-center gap-1">
                            <Copy size={11} color={p.textMuted} />
                            <span style={{ fontSize: 11, color: p.textMuted }}>{t('sl9_ouverture.linked_to_existing', { ref: pr.existingProductRef })}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <PrimaryButton p={p} onClick={() => handleApproveOne(pr)} disabled={busyIds.has(pr.id)}>
                          {busyIds.has(pr.id) ? t('sl9_ouverture.validating') : t('sl9_ouverture.validate')}
                        </PrimaryButton>
                      </div>
                      <Link
                        to={`/seller/products/${pr.id}/edit`}
                        className="flex items-center justify-center rounded-2xl font-bold"
                        style={{ padding: '14px 16px', fontSize: 13, background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text }}
                      >
                        {t('sl9_ouverture.edit')}
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          <Collapsible title={t('sl9_ouverture.how_it_works')} p={p}>
            {t('sl9_ouverture.assisted_entry_how_it_works_body')}
          </Collapsible>
        </>
      )}
    </div>
  );
}
