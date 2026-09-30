// frontend/src/features/vendors/v2/accueil/SuspendedCard.tsx
// Écran "Compte suspendu" (SUS-01/02/03, VD-D05.A18). GET /account/status
// n'existe pas : VendorProfile.status ne porte que APPROVED/PENDING/REJECTED/
// SUSPENDED, sans niveau, motif, date ni appeal_id. Faute de ces champs, le
// motif et la date réels ne sont pas affichés (mieux vaut l'admettre qu'en
// inventer) ; seules les règles fixes (SUS-01) et l'action de contestation
// sont rendues. "Contester" ouvre le support WhatsApp (POST /account/appeal
// n'existe pas non plus) — décision de repli documentée dans le rapport final.

import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';

const SUPPORT_WHATSAPP_URL = 'https://wa.me/237689002812';

export default function SuspendedCard({ shopName }: { shopName: string }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);

  return (
    <div className="pt-4">
      <div
        className="rounded-[20px] p-4 mb-4"
        style={{ background: theme === 'dark' ? 'rgba(255,138,128,0.08)' : '#FEF2F2', border: `1px solid ${p.red}` }}
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={20} color={p.red} />
          <p className="font-black" style={{ fontSize: 15, color: p.red }}>{t('sl6_accueil.suspended_title')}</p>
        </div>
        <p className="mb-3" style={{ fontSize: 13, color: p.text }}>
          {t('sl6_accueil.suspended_intro', { shop: shopName })}
        </p>
        <p className="mb-4" style={{ fontSize: 12.5, color: p.textMuted }}>
          {t('sl6_accueil.suspended_reason_fallback')}
        </p>

        <p className="font-bold mb-1.5" style={{ fontSize: 12, color: p.text }}>
          {t('sl6_accueil.suspended_allowed_title')}
        </p>
        <ul className="mb-3 list-none space-y-1" style={{ fontSize: 12, color: p.textMuted }}>
          <li>• {t('sl6_accueil.suspended_allowed_1')}</li>
          <li>• {t('sl6_accueil.suspended_allowed_2')}</li>
        </ul>

        <p className="font-bold mb-1.5" style={{ fontSize: 12, color: p.text }}>
          {t('sl6_accueil.suspended_blocked_title')}
        </p>
        <ul className="mb-4 list-none space-y-1" style={{ fontSize: 12, color: p.textMuted }}>
          <li>• {t('sl6_accueil.suspended_blocked_1')}</li>
          <li>• {t('sl6_accueil.suspended_blocked_2')}</li>
        </ul>

        <a
          href={SUPPORT_WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-center rounded-2xl font-bold"
          style={{ minHeight: 44, fontSize: 14, background: '#fff', color: p.red, border: `1px solid ${p.red}` }}
        >
          {t('sl6_accueil.suspended_contest_action')}
        </a>
        <p className="mt-2 text-center" style={{ fontSize: 11, color: p.textMuted }}>
          {t('sl6_accueil.suspended_contest_hint')}
        </p>
      </div>
    </div>
  );
}
