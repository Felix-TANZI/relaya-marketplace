// frontend/src/features/vendors/v2/ouverture/ContractCard.tsx
// Étape 3 « Publier et être payé » — contrat en cinq lignes (KYC-03, VD-D04.A13/A14).
// Signature actée localement faute de POST /contract/sign (voir api.ts) :
// jamais présentée comme une preuve légale, seulement comme un état d'écran.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { Collapsible, PrimaryButton, Toggle } from '../commandes/ui';
import type { VendorPalette } from '../theme';

export interface ContractCardProps {
  p: VendorPalette;
  onSign: (isRegistered: boolean, rccmNiu: string) => void;
  signing: boolean;
}

export default function ContractCard({ p, onSign, signing }: ContractCardProps) {
  const { t } = useTranslation();
  const [isRegistered, setIsRegistered] = useState(false);
  const [rccmNiu, setRccmNiu] = useState('');

  const lines = [
    t('sl9_ouverture.contract_line_retention'),
    t('sl9_ouverture.contract_line_minimum'),
    t('sl9_ouverture.contract_line_payout'),
    t('sl9_ouverture.contract_line_starter_cap'),
    t('sl9_ouverture.contract_line_termination'),
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.orange}1F` }}>
          <FileText size={20} color={p.orange} />
        </div>
        <div>
          <h1 className="font-black" style={{ fontSize: 16, color: p.text }}>{t('sl9_ouverture.contract_title')}</h1>
          <p style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl9_ouverture.contract_subtitle')}</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden mb-3" style={{ border: `1px solid ${p.border}` }}>
        {lines.map((line, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5"
            style={{ padding: '11px 14px', borderTop: i > 0 ? `1px solid ${p.border}` : undefined }}
          >
            <span className="font-black flex-shrink-0" style={{ fontSize: 11, color: p.orange, marginTop: 2 }}>{i + 1}</span>
            <span style={{ fontSize: 12.5, color: p.text, lineHeight: 1.5 }}>{line}</span>
          </div>
        ))}
      </div>

      <p className="mb-3" style={{ fontSize: 11.5, color: p.green, fontWeight: 700 }}>
        {t('sl9_ouverture.contract_no_deposit')}
      </p>

      <div className="mb-3">
        <a
          href="/documents/contrat-vendeur-belivay.pdf"
          target="_blank"
          rel="noreferrer"
          className="font-bold underline"
          style={{ fontSize: 12.5, color: p.orange }}
        >
          {t('sl9_ouverture.contract_read_full')}
        </a>
      </div>

      <div className="mb-3">
        <Collapsible title={t('sl9_ouverture.contract_why_amount')} p={p}>
          {t('sl9_ouverture.contract_why_amount_example')}
        </Collapsible>
      </div>

      <div
        className="rounded-2xl p-3.5 mb-3"
        style={{ background: `${p.amber}14`, border: `1px solid ${p.amber}44` }}
      >
        <p className="font-bold" style={{ fontSize: 12.5, color: p.text }}>{t('sl9_ouverture.discovery_offer_title')}</p>
        <p className="mt-1" style={{ fontSize: 11.5, color: p.textMuted, lineHeight: 1.5 }}>{t('sl9_ouverture.discovery_offer_body')}</p>
      </div>

      <div className="mb-3">
        <Toggle checked={isRegistered} onChange={setIsRegistered} label={t('sl9_ouverture.is_registered_toggle')} p={p} />
      </div>

      {isRegistered ? (
        <input
          type="text"
          value={rccmNiu}
          onChange={(e) => setRccmNiu(e.target.value)}
          placeholder={t('sl9_ouverture.rccm_niu_placeholder')}
          className="w-full rounded-xl outline-none mb-3"
          style={{ padding: '13px 14px', fontSize: 13.5, background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text }}
        />
      ) : null}

      <PrimaryButton p={p} onClick={() => onSign(isRegistered, rccmNiu)} disabled={signing || (isRegistered && rccmNiu.trim().length < 3)}>
        {signing ? t('sl9_ouverture.signing') : t('sl9_ouverture.contract_sign_submit')}
      </PrimaryButton>
    </div>
  );
}
