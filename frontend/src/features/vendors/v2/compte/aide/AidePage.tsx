// frontend/src/features/vendors/v2/compte/aide/AidePage.tsx
// Écran "Aide" — VD-11 §AID, Fig.14.
// Un seul moyen de joindre une personne (support vendeur WhatsApp, AID-02),
// 10 questions fréquentes, alerte anti-fraude Mobile Money (NUM-02/M4).
//
// Numéro WhatsApp réel repris de app/layout/Header.tsx / Footer.tsx
// (https://wa.me/237689002812) — jamais un numéro inventé. Le délai de réponse
// dépend du palier (canonique VD-11 : 24h Bronze, 4h Argent, 2h Or, dédié
// Platine), lu via vendorsApi.getCertifications().

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, MessageCircleHeart, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type VendorProfile } from '@/services/api/vendors';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import { buildWhatsAppSupportLink, mapLegacyTier } from '../shared/format';

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];

const RESPONSE_DELAY: Record<string, string> = {
  BRONZE: 'aide_delay_bronze',
  SILVER: 'aide_delay_silver',
  GOLD: 'aide_delay_gold',
  PLATINUM: 'aide_delay_platinum',
};

export default function AidePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(FAQ_KEYS[0]);

  useEffect(() => {
    vendorsApi.getProfile().then(setProfile).catch(() => {});
  }, []);

  const tier = mapLegacyTier(profile?.certification_tier);
  const supportLink = buildWhatsAppSupportLink(
    t('sl11_compte.aide_whatsapp_message', { shop: profile?.business_name || '', id: profile?.id || '' }),
  );

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.aide_title')} />

      {/* Support vendeur WhatsApp */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: `${p.green}1A`, border: `1px solid ${p.green}55` }}>
        <div className="flex items-center gap-2 mb-1">
          <MessageCircleHeart size={18} color={p.green} />
          <p className="font-bold" style={{ fontSize: 14, color: p.green }}>{t('sl11_compte.aide_whatsapp_title')}</p>
        </div>
        <p className="mb-1" style={{ fontSize: 12, color: p.text }}>{t('sl11_compte.aide_hours')}</p>
        <p className="mb-3" style={{ fontSize: 12, color: p.textMuted }}>{t(`sl11_compte.${RESPONSE_DELAY[tier]}`)}</p>
        <a
          href={supportLink}
          target="_blank"
          rel="noreferrer"
          className="block w-full text-center rounded-xl font-bold text-white"
          style={{ padding: '12px', background: p.green, fontSize: 13.5 }}
        >
          {t('sl11_compte.aide_write_support')}
        </a>
      </div>

      {/* FAQ */}
      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        {FAQ_KEYS.map((key, i) => {
          const open = openFaq === key;
          return (
            <div key={key} style={{ borderTop: i > 0 ? `1px solid ${p.border}` : undefined }}>
              <button
                type="button"
                onClick={() => setOpenFaq(open ? null : key)}
                className="w-full flex items-center justify-between"
                style={{ padding: '13px 14px' }}
              >
                <span className="font-semibold text-left" style={{ fontSize: 12.5, color: p.text }}>{t(`sl11_compte.aide_${key}_q`)}</span>
                <ChevronDown size={15} color={p.textMuted} style={{ transform: open ? 'rotate(180deg)' : undefined, flexShrink: 0, marginLeft: 8 }} />
              </button>
              {open ? (
                <p style={{ padding: '0 14px 14px 14px', fontSize: 12, color: p.textMuted, lineHeight: 1.5 }}>
                  {t(`sl11_compte.aide_${key}_a`)}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Alerte anti-fraude */}
      <div className="rounded-2xl p-4 mb-4 flex items-start gap-2" style={{ background: `${p.red}12`, border: `1px solid ${p.red}44` }}>
        <AlertTriangle size={16} color={p.red} className="flex-shrink-0 mt-0.5" />
        <p style={{ fontSize: 11.5, color: p.text }}>{t('sl11_compte.aide_antifraud')}</p>
      </div>

      <div className="flex items-center justify-between rounded-2xl mb-2" style={{ padding: '13px 14px', background: p.card, border: `1px solid ${p.border}` }}>
        <span style={{ fontSize: 13, color: p.text, fontWeight: 600 }}>{t('sl11_compte.aide_my_contract')}</span>
      </div>
      <p className="text-center" style={{ fontSize: 11, color: p.textMuted }}>{t('sl11_compte.aide_tip_of_week')}</p>
    </div>
  );
}
