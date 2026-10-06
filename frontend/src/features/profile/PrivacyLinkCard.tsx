// frontend/src/features/profile/PrivacyLinkCard.tsx
// Lien vers la politique de confidentialité (/privacy), accessible depuis
// l'app (App Store Review Guideline 5.1.1).

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ShieldCheck } from 'lucide-react';

export default function PrivacyLinkCard() {
  const { t } = useTranslation();

  return (
    <Link
      to="/privacy"
      className="flex items-center justify-between gap-3 rounded-[14px] border border-white/40 bg-white/40 p-[14px] backdrop-blur-md transition hover:border-[#F47920]/40 dark:border-white/10 dark:bg-white/[0.03]"
      style={{ textDecoration: 'none' }}
    >
      <div className="flex items-center gap-[11px]">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#60a5fa] to-[#2563eb] text-white shadow-[0_5px_14px_rgba(37,99,235,.35)]">
          <ShieldCheck size={17} />
        </span>
        <div>
          <div className="font-bold text-[#111827] dark:text-white">{t('cl8_privacy_link.title')}</div>
          <div className="text-[12px] text-[#9ca3af]">{t('cl8_privacy_link.subtitle')}</div>
        </div>
      </div>
      <ChevronRight size={18} className="flex-shrink-0 text-[#9ca3af]" />
    </Link>
  );
}
