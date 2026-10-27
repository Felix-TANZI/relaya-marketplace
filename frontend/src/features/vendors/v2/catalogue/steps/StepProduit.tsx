// frontend/src/features/vendors/v2/catalogue/steps/StepProduit.tsx
// Nouvelle offre · étape 1 (NOF-01 à NOF-05) : chercher d'abord, la demande
// de fiche n'apparaît qu'après des résultats vides (verrouillé, A13).
// GET /catalog/search?q=&barcode=&image_id= (avec keep_share/keep_ref_price)
// n'existe pas : on utilise vendorsApi.searchMasters(), qui ne renvoie que
// titre/marque/catégorie — MANQUE BACKEND pour l'aperçu "Vous gardez X % à
// Y F" par résultat (NOF-05), volontairement omis plutôt qu'inventé.

import { useEffect, useRef, useState } from 'react';
import { Barcode, Camera, Mic, Search } from 'lucide-react';
import { vendorsApi, type MasterFiche } from '@/services/api/vendors';
import type { VendorPalette } from '../../theme';
import { CenterState, Pill } from '../ui';
import ScanBarcodeScreen from './ScanBarcodeScreen';

export default function StepProduit({
  query, onQueryChange, onSelectMaster, onRequestSheet, onShowToast, p, t,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onSelectMaster: (m: MasterFiche) => void;
  onRequestSheet: () => void;
  onShowToast: (msg: string) => void;
  p: VendorPalette;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const [results, setResults] = useState<MasterFiche[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query.trim();
    const handle = window.setTimeout(() => {
      if (q.length < 2) { setResults([]); setLoading(false); return; }
      setLoading(true);
      vendorsApi.searchMasters(q)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  const searched = query.trim().length >= 2;
  const noResults = searched && !loading && results.length === 0;

  return (
    <div>
      <p className="font-bold mb-3" style={{ fontSize: 15, color: p.text }}>{t('sl10_catalogue.step1_title')}</p>

      <div className="relative mb-2">
        <Search size={15} color={p.textMuted} className="absolute" style={{ left: 12, top: 13 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t('sl10_catalogue.step1_search_placeholder')}
          className="w-full rounded-xl"
          style={{
            padding: '11px 12px 11px 36px', fontSize: 13.5, background: p.cardAlt,
            border: `1px solid ${p.border}`, color: p.text,
          }}
        />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <ShortcutButton icon={<Barcode size={14} />} label={t('sl10_catalogue.step1_shortcut_barcode')} p={p} onClick={() => setScanOpen(true)} />
        <ShortcutButton icon={<Camera size={14} />} label={t('sl10_catalogue.step1_shortcut_photo')} p={p} onClick={() => onShowToast(t('sl10_catalogue.toast_soon'))} />
        <ShortcutButton icon={<Mic size={14} />} label={t('sl10_catalogue.step1_shortcut_dictate')} p={p} onClick={() => onShowToast(t('sl10_catalogue.toast_soon'))} />
      </div>

      {loading ? (
        <CenterState icon={<Search size={18} color={p.textMuted} />} title={t('sl10_catalogue.step1_searching')} p={p} />
      ) : results.length > 0 ? (
        <div className="rounded-2xl overflow-hidden mb-3" style={{ border: `1px solid ${p.border}` }}>
          {results.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectMaster(m)}
              className="w-full flex items-center justify-between text-left"
              style={{ padding: '12px 14px', borderBottom: `1px solid ${p.border}`, background: p.card }}
            >
              <div className="min-w-0">
                <p className="font-semibold truncate" style={{ fontSize: 13, color: p.text }}>{m.title}</p>
                <p style={{ fontSize: 11, color: p.textMuted }}>
                  {m.category_name}{m.brand ? ` · ${m.brand}` : ''}
                </p>
              </div>
              <Pill label={t('sl10_catalogue.step1_pick')} tone="orange" p={p} />
            </button>
          ))}
        </div>
      ) : null}

      {noResults ? (
        <div className="mt-2">
          <p className="mb-3" style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl10_catalogue.step1_no_results')}</p>
          <button
            type="button"
            onClick={onRequestSheet}
            className="w-full rounded-xl font-bold text-center"
            style={{ padding: '12px 14px', fontSize: 13, color: p.orange, border: `1.5px dashed ${p.orange}`, background: `${p.orange}0F` }}
          >
            {t('sl10_catalogue.step1_request_sheet')}
          </button>
        </div>
      ) : null}

      {scanOpen ? (
        <ScanBarcodeScreen
          p={p}
          t={t}
          onClose={() => setScanOpen(false)}
          onFound={(m) => { setScanOpen(false); onSelectMaster(m); }}
          onNotFound={() => { setScanOpen(false); onShowToast(t('sl10_catalogue.scan_not_found')); inputRef.current?.focus(); }}
        />
      ) : null}
    </div>
  );
}

function ShortcutButton({ icon, label, p, onClick }: { icon: React.ReactNode; label: string; p: VendorPalette; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full font-semibold"
      style={{ padding: '7px 12px', fontSize: 11.5, color: p.textMuted, background: p.cardAlt, border: `1px solid ${p.border}` }}
    >
      {icon} {label}
    </button>
  );
}
