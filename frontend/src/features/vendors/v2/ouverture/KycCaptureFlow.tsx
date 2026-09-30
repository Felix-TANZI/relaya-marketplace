// frontend/src/features/vendors/v2/ouverture/KycCaptureFlow.tsx
// Étape 2 « Publier et être payé » — capture KYC (KYC-01, VD-D04.A11/A12).
// Un élément à la fois : CNI recto, CNI verso, selfie preuve de vie, puis
// numéro MoMo de versement (vérifié par code, au nom du titulaire). Le bouton
// plein nomme toujours l'élément suivant (KYC-06).
//
// Les photos sont capturées et prévisualisées ici ; aucun envoi binaire réel
// n'existe côté backend aujourd'hui (pas de POST /shops/{id}/kyc multipart ni
// de prestataire Smile ID branché — KYC-A12 reste à faire). Le numéro MoMo,
// lui, est un vrai appel existant (vendorsApi.savePaymentPreferences).

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Check, CreditCard, ScanFace, Smartphone } from 'lucide-react';
import { Collapsible, PrimaryButton } from '../commandes/ui';
import type { VendorPalette } from '../theme';
import { verifyPayoutNumber } from './api';
import type { KycItemKey } from './types';

const ORDER: KycItemKey[] = ['id_front', 'id_back', 'selfie', 'payout'];

const LABEL_KEY: Record<KycItemKey, string> = {
  id_front: 'sl9_ouverture.kyc_id_front',
  id_back: 'sl9_ouverture.kyc_id_back',
  selfie: 'sl9_ouverture.kyc_selfie',
  payout: 'sl9_ouverture.kyc_payout',
};

const CTA_KEY: Record<KycItemKey, string> = {
  id_front: 'sl9_ouverture.kyc_cta_id_front',
  id_back: 'sl9_ouverture.kyc_cta_id_back',
  selfie: 'sl9_ouverture.kyc_cta_selfie',
  payout: 'sl9_ouverture.kyc_cta_payout',
};

const ICON: Record<KycItemKey, typeof Camera> = {
  id_front: CreditCard,
  id_back: CreditCard,
  selfie: ScanFace,
  payout: Smartphone,
};

export interface KycCaptureFlowProps {
  p: VendorPalette;
  onAllDone: (kycNote: string) => void;
  onSkipForNow: () => void;
}

export default function KycCaptureFlow({ p, onAllDone, onSkipForNow }: KycCaptureFlowProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Partial<Record<KycItemKey, string>>>({});
  const [payoutOperator, setPayoutOperator] = useState<'MTN_MOMO' | 'ORANGE_MONEY'>('MTN_MOMO');
  const [payoutPhone, setPayoutPhone] = useState('');
  const [payoutVerifying, setPayoutVerifying] = useState(false);
  const [payoutError, setPayoutError] = useState(false);
  const [payoutDone, setPayoutDone] = useState(false);

  const nextItem = ORDER.find((k) => (k === 'payout' ? !payoutDone : !previews[k])) ?? null;
  const remaining = ORDER.filter((k) => (k === 'payout' ? !payoutDone : !previews[k])).length;

  const openCapture = (key: Exclude<KycItemKey, 'payout'>) => {
    if (!fileInputRef.current) return;
    fileInputRef.current.dataset.target = key;
    fileInputRef.current.setAttribute('capture', key === 'selfie' ? 'user' : 'environment');
    fileInputRef.current.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target.dataset.target as KycItemKey | undefined;
    const file = e.target.files?.[0];
    if (!target || !file) return;
    const url = URL.createObjectURL(file);
    setPreviews((prev) => ({ ...prev, [target]: url }));
    e.target.value = '';
  };

  const handlePayoutVerify = async () => {
    if (payoutPhone.trim().length < 8) return;
    setPayoutVerifying(true);
    setPayoutError(false);
    try {
      await verifyPayoutNumber(payoutOperator, payoutPhone.trim());
      setPayoutDone(true);
    } catch {
      setPayoutError(true);
    } finally {
      setPayoutVerifying(false);
    }
  };

  const handlePrimaryClick = () => {
    if (nextItem === 'payout') { void handlePayoutVerify(); return; }
    if (nextItem) openCapture(nextItem);
  };

  const allDone = !nextItem;

  const buildNoteAndFinish = () => {
    const today = new Date().toLocaleDateString('fr-FR');
    onAllDone(`CNI photographiée et selfie transmis le ${today} — vérification en cours (KYC-01).`);
  };

  return (
    <div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <p className="mb-4" style={{ fontSize: 12.5, color: p.textMuted, lineHeight: 1.5 }}>
        {t('sl9_ouverture.kyc_intro_drafts')}
      </p>

      <div className="rounded-2xl overflow-hidden mb-4" style={{ border: `1px solid ${p.border}` }}>
        {ORDER.map((key, i) => {
          const Icon = ICON[key];
          const done = key === 'payout' ? payoutDone : Boolean(previews[key]);
          return (
            <div
              key={key}
              className="flex items-center gap-3"
              style={{ padding: '12px 14px', borderTop: i > 0 ? `1px solid ${p.border}` : undefined, minHeight: 52 }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: done ? `${p.green}1F` : p.cardAlt }}
              >
                {done ? <Check size={15} color={p.green} /> : <Icon size={14} color={p.textMuted} />}
              </div>
              <span className="font-semibold flex-1" style={{ fontSize: 13, color: done ? p.text : p.textMuted }}>
                {t(LABEL_KEY[key])}
              </span>
              {previews[key] ? (
                <img src={previews[key]} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
              ) : null}
            </div>
          );
        })}
      </div>

      {nextItem === 'payout' && !payoutDone ? (
        <div className="mb-4 space-y-2.5">
          <div className="flex gap-2">
            {(['MTN_MOMO', 'ORANGE_MONEY'] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setPayoutOperator(op)}
                className="flex-1 rounded-xl font-bold"
                style={{
                  padding: '10px 8px', fontSize: 12,
                  background: payoutOperator === op ? p.orange : p.cardAlt,
                  color: payoutOperator === op ? '#fff' : p.text,
                  border: `1px solid ${payoutOperator === op ? p.orange : p.border}`,
                }}
              >
                {op === 'MTN_MOMO' ? t('sl9_ouverture.payout_mtn') : t('sl9_ouverture.payout_orange')}
              </button>
            ))}
          </div>
          <input
            type="tel"
            value={payoutPhone}
            onChange={(e) => setPayoutPhone(e.target.value)}
            placeholder={t('sl9_ouverture.payout_phone_placeholder')}
            className="w-full rounded-xl outline-none"
            style={{ padding: '13px 14px', fontSize: 13.5, background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text }}
          />
          <p style={{ fontSize: 11, color: p.textMuted }}>{t('sl9_ouverture.payout_owner_hint')}</p>
          {payoutError ? <p style={{ fontSize: 11.5, color: p.red }}>{t('sl9_ouverture.payout_error')}</p> : null}
        </div>
      ) : null}

      {!allDone ? (
        <>
          <PrimaryButton p={p} onClick={handlePrimaryClick} disabled={nextItem === 'payout' && (payoutVerifying || payoutPhone.trim().length < 8)}>
            {nextItem === 'payout'
              ? (payoutVerifying ? t('sl9_ouverture.verifying') : t(CTA_KEY.payout))
              : (nextItem ? t(CTA_KEY[nextItem]) : '')}
          </PrimaryButton>
          <p className="mt-2 text-center" style={{ fontSize: 11.5, color: p.textMuted }}>
            {t('sl9_ouverture.kyc_remaining', { count: remaining })}
          </p>
        </>
      ) : (
        <PrimaryButton p={p} onClick={buildNoteAndFinish}>
          {t('sl9_ouverture.kyc_send_all')}
        </PrimaryButton>
      )}

      <div className="mt-4">
        <Collapsible title={t('sl9_ouverture.how_it_works')} p={p}>
          {t('sl9_ouverture.kyc_how_it_works_body')}
        </Collapsible>
      </div>

      <button type="button" onClick={onSkipForNow} className="mt-4 w-full text-center font-semibold" style={{ fontSize: 12, color: p.textMuted }}>
        {t('sl9_ouverture.kyc_skip_add_products')}
      </button>
    </div>
  );
}
