// frontend/src/features/vendors/v2/catalogue/DemanderFicheScreen.tsx
// Écran "Demander une fiche" — VD-08 §3.1 (NOF-03, A18).
// POST /sheet-requests {query, brand, category, photo_ids, priority} n'existe
// pas côté backend (MANQUE BACKEND, aucune trace dans backend/apps/vendors) :
// le formulaire est entièrement fonctionnel côté client (validation, aperçu
// photo, bascule prioritaire) mais la demande n'est PAS envoyée au serveur —
// elle ne fait que confirmer localement, en attendant que l'endpoint existe.
// Rien n'est fabriqué côté API pour ne pas donner une fausse impression au
// vendeur ; le texte affiché reste honnête ("nous avons bien noté votre
// recherche" plutôt que "votre demande est en file").

import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { palette } from '../theme';
import { Collapsible, PageHeader, PrimaryButton, Toggle } from './ui';

export default function DemanderFicheScreen({
  initialQuery, onSubmitted, onBack, theme, t,
}: {
  initialQuery: string;
  onSubmitted: () => void;
  onBack: () => void;
  theme: 'light' | 'dark';
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const p = palette(theme);
  const [name, setName] = useState(initialQuery);
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState(false);
  const [photo, setPhoto] = useState<{ file: File; previewUrl: string } | null>(null);
  const [sending, setSending] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  function pickPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setPhoto({ file, previewUrl: URL.createObjectURL(file) });
  }

  async function submit() {
    // MANQUE BACKEND : pas d'appel réseau tant que POST /sheet-requests n'existe pas.
    setSending(true);
    await new Promise((r) => window.setTimeout(r, 400));
    setSending(false);
    onSubmitted();
  }

  return (
    <div className="pb-24 pt-2">
      <PageHeader title={t('sl10_catalogue.sheet_request_title')} onBack={onBack} backLabel={t('sl10_catalogue.back')} p={p} />

      <Field label={t('sl10_catalogue.sheet_field_name')} required p={p}>
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle(p)} />
      </Field>
      <Field label={t('sl10_catalogue.sheet_field_brand')} p={p}>
        <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={t('sl10_catalogue.sheet_field_brand_example')} style={inputStyle(p)} />
      </Field>
      <Field label={t('sl10_catalogue.sheet_field_category')} p={p}>
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t('sl10_catalogue.sheet_field_category_example')} style={inputStyle(p)} />
      </Field>

      <div className="mb-3">
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files)} />
        {photo ? (
          <div className="w-20 h-20 rounded-xl overflow-hidden" style={{ border: `1px solid ${p.border}` }}>
            <img src={photo.previewUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="flex items-center gap-2 rounded-xl font-semibold"
            style={{ padding: '10px 14px', fontSize: 12.5, color: p.textMuted, background: p.cardAlt, border: `1px solid ${p.border}` }}
          >
            <Camera size={14} /> {t('sl10_catalogue.sheet_field_photo')}
          </button>
        )}
      </div>

      <Toggle checked={priority} onChange={setPriority} label={t('sl10_catalogue.sheet_priority_toggle')} p={p} />

      <div className="mt-4">
        <Collapsible title={t('sl10_catalogue.how_it_works')} p={p}>
          {t('sl10_catalogue.sheet_how_it_works_detail')}
        </Collapsible>
      </div>

      <div className="mt-4">
        <PrimaryButton p={p} disabled={!name.trim() || sending} onClick={submit}>
          {sending ? t('sl10_catalogue.saving') : t('sl10_catalogue.sheet_cta_send')}
        </PrimaryButton>
      </div>
    </div>
  );
}

function Field({ label, required, p, children }: { label: string; required?: boolean; p: ReturnType<typeof palette>; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="flex items-center gap-1 font-semibold mb-1.5" style={{ fontSize: 12, color: p.text }}>
        {label}{required ? <span style={{ color: p.red }}>*</span> : null}
      </label>
      {children}
    </div>
  );
}

function inputStyle(p: ReturnType<typeof palette>): React.CSSProperties {
  return {
    width: '100%', padding: '11px 12px', fontSize: 13.5, borderRadius: 12,
    background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text,
  };
}
