// frontend/src/features/vendors/v2/ouverture/SellerPromise.tsx
// Composant SellerPromise — VD-D04.A03 : remplace la bannière de l'écran
// Connexion par une phrase + trois gestes (vous préparez · le livreur emballe
// et livre · versé le vendredi sans frais) et le bouton de langue FR/EN/Pidgin
// (CNX-05 : choisie avant toute connexion, mémorisée).

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Globe, PackageCheck, Wallet } from 'lucide-react';
import type { VendorPalette } from '../theme';

type AppLanguage = 'fr' | 'en' | 'pidgin';

const LANG_STORAGE_KEY = 'relaya.lang';
/** Pidgin n'a pas de dictionnaire dédié dans ce lot (seuls sl9.fr/sl9.en sont
 * livrés) : le choix est mémorisé pour honorer CNX-05, mais l'affichage
 * retombe sur l'anglais (le plus proche) tant qu'un domaine i18n pidgin
 * n'existe pas — décision assumée, voir le rapport de livraison. */
const PIDGIN_STORAGE_KEY = 'relaya.lang_display_pref';

function readStoredLanguage(): AppLanguage {
  try {
    const pref = window.localStorage.getItem(PIDGIN_STORAGE_KEY);
    if (pref === 'pidgin') return 'pidgin';
    const lng = window.localStorage.getItem(LANG_STORAGE_KEY);
    return lng === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

function useSellerLanguage() {
  const { i18n } = useTranslation();
  const [lang, setLangState] = useState<AppLanguage>(readStoredLanguage);

  const setLang = (next: AppLanguage) => {
    setLangState(next);
    try {
      window.localStorage.setItem(PIDGIN_STORAGE_KEY, next);
      window.localStorage.setItem(LANG_STORAGE_KEY, next === 'fr' ? 'fr' : 'en');
    } catch {
      // Navigation privée : le choix ne survivra pas au rechargement, sans
      // conséquence bloquante — l'écran reste utilisable.
    }
    void i18n.changeLanguage(next === 'fr' ? 'fr' : 'en');
  };

  return { lang, setLang };
}

function LanguageButton({ p }: { p: VendorPalette }) {
  const { t } = useTranslation();
  const { lang, setLang } = useSellerLanguage();
  const [open, setOpen] = useState(false);

  const options: { key: AppLanguage; label: string }[] = [
    { key: 'fr', label: t('sl9_ouverture.lang_fr') },
    { key: 'en', label: t('sl9_ouverture.lang_en') },
    { key: 'pidgin', label: t('sl9_ouverture.lang_pidgin') },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full"
        style={{ padding: '6px 12px', background: p.cardAlt, border: `1px solid ${p.border}`, minHeight: 32 }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe size={13} color={p.textMuted} />
        <span className="font-bold" style={{ fontSize: 11.5, color: p.text }}>
          {options.find((o) => o.key === lang)?.label}
        </span>
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute right-0 z-10 mt-1 rounded-xl overflow-hidden"
          style={{ background: p.card, border: `1px solid ${p.border}`, boxShadow: '0 12px 28px rgba(0,0,0,0.18)', minWidth: 130 }}
        >
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              role="option"
              aria-selected={o.key === lang}
              onClick={() => { setLang(o.key); setOpen(false); }}
              className="w-full text-left"
              style={{
                padding: '10px 12px',
                fontSize: 12.5,
                fontWeight: o.key === lang ? 800 : 600,
                color: o.key === lang ? p.orange : p.text,
                background: 'transparent',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Une phrase + trois gestes (ENT-01 client, repris ici pour le vendeur) :
 * vous préparez → le livreur emballe et livre → versé le vendredi sans frais.
 */
export default function SellerPromise({ p }: { p: VendorPalette }) {
  const { t } = useTranslation();

  const gestures = [
    { icon: Box, labelKey: 'sl9_ouverture.promise_gesture_prepare' },
    { icon: PackageCheck, labelKey: 'sl9_ouverture.promise_gesture_deliver' },
    { icon: Wallet, labelKey: 'sl9_ouverture.promise_gesture_payout' },
  ];

  return (
    <div
      className="rounded-2xl p-4 mb-5"
      style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="font-black leading-snug" style={{ fontSize: 14.5, color: p.text }}>
          {t('sl9_ouverture.promise_sentence')}
        </p>
        <LanguageButton p={p} />
      </div>
      <div className="flex items-stretch gap-2">
        {gestures.map((g, i) => {
          const Icon = g.icon;
          return (
            <div key={g.labelKey} className="flex-1 flex flex-col items-center text-center gap-1.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${p.orange}1F` }}
              >
                <Icon size={16} color={p.orange} />
              </div>
              <span className="font-semibold leading-tight" style={{ fontSize: 10.5, color: p.textMuted }}>
                {i + 1}. {t(g.labelKey)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
