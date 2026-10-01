// frontend/src/features/vendors/v2/ouverture/ContractCard.tsx
// Étape 3 « Publier et être payé » — contrat en cinq lignes (KYC-03, VD-D04.A13/A14).
// Signature actée localement faute de POST /contract/sign (voir api.ts) :
// jamais présentée comme une preuve légale, seulement comme un état d'écran.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, ChevronRight, FileText, Gauge, Signature, ShieldCheck, Wallet } from 'lucide-react';
import { Collapsible, PrimaryButton, Toggle } from '../commandes/ui';
import type { VendorPalette } from '../theme';
import { DarkCard, DARK_HERO_TEXT, DARK_HERO_TEXT_MUTED } from './DarkCard';

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
    { text: t('sl9_ouverture.contract_line_retention'), icon: Wallet },
    { text: t('sl9_ouverture.contract_line_minimum'), icon: Wallet },
    { text: t('sl9_ouverture.contract_line_payout'), icon: Wallet },
    { text: t('sl9_ouverture.contract_line_starter_cap'), icon: Gauge },
    { text: t('sl9_ouverture.contract_line_termination'), icon: CalendarClock },
  ];

  return (
    <div>
      <h1 className="font-black" style={{ fontSize: 20, color: p.text }}>{t('sl9_ouverture.contract_title')}</h1>
      <p className="mt-1 mb-4" style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl9_ouverture.contract_subtitle')}</p>

      <DarkCard className="mb-3">
        <p className="font-black uppercase" style={{ fontSize: 10.5, letterSpacing: '.08em', color: p.orange, padding: '14px 14px 8px' }}>
          {t('sl9_ouverture.contract_box_title')}
        </p>
        {lines.map((line, i) => {
          const Icon = line.icon;
          return (
            <div
              key={i}
              className="flex items-start gap-2.5"
              style={{ padding: '10px 14px', borderTop: `1px solid rgba(255,255,255,0.1)` }}
            >
              <Icon size={15} color={p.orange} className="flex-shrink-0" style={{ marginTop: 1 }} />
              <span style={{ fontSize: 12.5, color: DARK_HERO_TEXT, lineHeight: 1.5 }}>{line.text}</span>
            </div>
          );
        })}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <a
            href="/documents/contrat-vendeur-belivay.pdf"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between font-bold"
            style={{ padding: '13px 14px', fontSize: 12.5, color: DARK_HERO_TEXT }}
          >
            <span className="inline-flex items-center gap-2">
              <FileText size={15} />
              {t('sl9_ouverture.contract_read_full')}
            </span>
            <ChevronRight size={15} color={DARK_HERO_TEXT_MUTED} />
          </a>
        </div>
      </DarkCard>

      <p className="mb-3 flex items-center gap-1.5" style={{ fontSize: 11.5, color: p.green, fontWeight: 700 }}>
        <ShieldCheck size={14} />
        {t('sl9_ouverture.contract_no_deposit')}
      </p>

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
        <span className="inline-flex items-center justify-center gap-2">
          <Signature size={16} />
          {signing ? t('sl9_ouverture.signing') : t('sl9_ouverture.contract_sign_submit')}
        </span>
      </PrimaryButton>
    </div>
  );
}
