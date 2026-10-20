// frontend/src/features/vendors/v2/ouverture/InstallerApplicationPage.tsx
// Écran « Installer l'application » — VD-03 §1.1 (VD-D04.A17, INS-01 à INS-03).
// Onglets iPhone/Android (44 px, celui détecté par défaut) ; bouton natif
// Android uniquement si `beforeinstallprompt` est disponible ; sinon guide
// manuel en 3 gestes pour les deux plateformes.

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronRight, Download, Menu as MenuIcon, ShoppingCart, Share, SquarePlus, Wifi, Zap } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette, primaryGradient, type VendorPalette } from '../theme';
import { Collapsible } from '../commandes/ui';
import { DarkCard, DARK_HERO_TEXT, DARK_HERO_TEXT_MUTED } from './DarkCard';
import type { InstallPlatform } from './types';

function detectPlatform(): InstallPlatform {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iphone';
  return 'android';
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function StepRow({ index, icon: Icon, label, p }: { index: number; icon: typeof Share; label: string; p: VendorPalette }) {
  return (
    <div className="flex items-center gap-3" style={{ padding: '12px 0' }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center font-black flex-shrink-0" style={{ background: `${p.orange}1F`, color: p.orange, fontSize: 13 }}>
        {index}
      </div>
      <Icon size={16} color={p.textMuted} className="flex-shrink-0" />
      <span className="flex-1" style={{ fontSize: 13, color: p.text, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

export default function InstallerApplicationPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);

  const [tab, setTab] = useState<InstallPlatform>(detectPlatform());
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    setInstalling(true);
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } finally {
      setInstalling(false);
      setInstallPrompt(null);
    }
  };

  return (
    <div className="pb-24 pt-2">
      <h1 className="font-black mb-1" style={{ fontSize: 18, color: p.text }}>{t('sl9_ouverture.install_title')}</h1>
      <p className="mb-5" style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl9_ouverture.install_subtitle')}</p>

      <div className="flex rounded-2xl overflow-hidden mb-5" style={{ border: `1px solid ${p.border}` }}>
        {(['iphone', 'android'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className="flex-1 flex items-center justify-center font-bold"
            style={{
              height: 44, fontSize: 13,
              background: tab === key ? primaryGradient(p) : p.card,
              color: tab === key ? '#fff' : p.textMuted,
            }}
          >
            {key === 'iphone' ? t('sl9_ouverture.tab_iphone') : t('sl9_ouverture.tab_android')}
          </button>
        ))}
      </div>

      <DarkCard className="p-4 mb-5 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-white">
          <ShoppingCart size={20} color={p.orange} />
        </div>
        <div className="min-w-0">
          <p className="font-bold truncate" style={{ fontSize: 13.5, color: DARK_HERO_TEXT }}>{t('sl9_ouverture.app_name')}</p>
          <p style={{ fontSize: 11.5, color: DARK_HERO_TEXT_MUTED }}>seller.belivay.com</p>
        </div>
      </DarkCard>

      {tab === 'android' && installPrompt ? (
        <button
          type="button"
          onClick={() => void handleInstall()}
          disabled={installing}
          className="w-full rounded-2xl font-bold text-white mb-5 disabled:opacity-60"
          style={{ padding: '14px 18px', fontSize: 14.5, minHeight: 48, background: primaryGradient(p) }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Download size={16} />
            {installing ? t('sl9_ouverture.installing') : t('sl9_ouverture.install_button')}
          </span>
        </button>
      ) : null}
      {tab === 'android' && !installPrompt ? (
        <p className="mb-5 flex items-start gap-1.5" style={{ fontSize: 11.5, color: p.textMuted }}>
          {t('sl9_ouverture.install_button_chrome_note')}
        </p>
      ) : null}

      <p className="font-black uppercase mb-2" style={{ fontSize: 10.5, letterSpacing: '.08em', color: p.textMuted }}>
        {tab === 'android' && installPrompt ? t('sl9_ouverture.install_steps_otherwise_label') : t('sl9_ouverture.install_steps_label')}
      </p>
      <div className="rounded-2xl px-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        {tab === 'iphone' ? (
          <>
            <StepRow index={1} icon={Share} label={t('sl9_ouverture.iphone_step_1')} p={p} />
            <div style={{ borderTop: `1px solid ${p.border}` }} />
            <StepRow index={2} icon={ChevronRight} label={t('sl9_ouverture.iphone_step_2')} p={p} />
            <div style={{ borderTop: `1px solid ${p.border}` }} />
            <StepRow index={3} icon={SquarePlus} label={t('sl9_ouverture.iphone_step_3')} p={p} />
          </>
        ) : (
          <>
            <StepRow index={1} icon={MenuIcon} label={t('sl9_ouverture.android_step_1')} p={p} />
            <div style={{ borderTop: `1px solid ${p.border}` }} />
            <StepRow index={2} icon={SquarePlus} label={t('sl9_ouverture.android_step_2')} p={p} />
            <div style={{ borderTop: `1px solid ${p.border}` }} />
            <StepRow index={3} icon={ChevronRight} label={t('sl9_ouverture.android_step_3')} p={p} />
          </>
        )}
      </div>

      <div className="mt-5">
        <Collapsible title={t('sl9_ouverture.install_why')} p={p}>
          <div className="flex items-start gap-2 mb-1.5">
            <Zap size={13} className="flex-shrink-0 mt-0.5" />
            <span>{t('sl9_ouverture.install_why_fast')}</span>
          </div>
          <div className="flex items-start gap-2 mb-1.5">
            <Wifi size={13} className="flex-shrink-0 mt-0.5" />
            <span>{t('sl9_ouverture.install_why_offline')}</span>
          </div>
          <div className="flex items-start gap-2">
            <Bell size={13} className="flex-shrink-0 mt-0.5" />
            <span>{t('sl9_ouverture.install_why_notifications')}</span>
          </div>
        </Collapsible>
      </div>
    </div>
  );
}
