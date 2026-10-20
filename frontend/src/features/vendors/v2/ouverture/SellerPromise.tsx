// frontend/src/features/vendors/v2/ouverture/SellerPromise.tsx
// Carte « héros » sombre de l'écran Connexion — VD-D04.A03, corrigée sur
// Connexion.jpg : logo BelivaY + sélecteur de langue en haut, titre
// « Espace vendeur », phrase de promesse, puis les trois gestes (vous
// préparez · le livreur emballe et livre · versé le vendredi sans frais),
// le tout dans UNE SEULE carte à dégradé sombre (pas un logo séparé au-dessus
// d'une carte claire). Sélecteur de langue FR/EN/Pidgin — CNX-05 : choisie
// avant toute connexion, mémorisée.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, ChevronDown, Globe, PackageCheck, Wallet } from 'lucide-react';
import type { VendorPalette } from '../theme';
import { DarkCard, DARK_HERO_TEXT, DARK_HERO_TEXT_MUTED, DARK_HERO_TILE_BG } from './DarkCard';

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

/** Pilule « 🌐 Français ⌄ » — fond translucide clair sur la carte sombre
 * (Connexion.jpg), menu déroulant en carte claire normale par-dessus. */
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
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full"
        style={{ padding: '7px 12px', background: DARK_HERO_TILE_BG, border: '1px solid rgba(255,255,255,0.16)', minHeight: 32 }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe size={13} color={DARK_HERO_TEXT} />
        <span className="font-bold" style={{ fontSize: 11.5, color: DARK_HERO_TEXT }}>
          {options.find((o) => o.key === lang)?.label}
        </span>
        <ChevronDown size={12} color={DARK_HERO_TEXT_MUTED} />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute right-0 z-10 mt-1 rounded-xl overflow-hidden"
          style={{ background: p.card, border: `1px solid ${p.border}`, boxShadow: '0 12px 28px rgba(0,0,0,0.28)', minWidth: 130 }}
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
 * Une seule carte sombre : logo + langue, « Espace vendeur », phrase de
 * promesse, puis les trois gestes (ENT-01 client, repris ici pour le
 * vendeur) — vous préparez → le livreur emballe et livre → versé le
 * vendredi sans frais.
 */
export default function SellerPromise({ p }: { p: VendorPalette }) {
  const { t } = useTranslation();

  // Cles i18n (domaine.cle), pas des secrets — Gitleaks (generic-api-key) les
  // confond avec une cle API a cause de leur entropie ; voir gitleaks:allow
  // sur chaque ligne ci-dessous.
  const gestures = [
    { icon: Box, labelKey: 'sl9_ouverture.promise_gesture_prepare' }, // gitleaks:allow
    { icon: PackageCheck, labelKey: 'sl9_ouverture.promise_gesture_deliver' }, // gitleaks:allow
    { icon: Wallet, labelKey: 'sl9_ouverture.promise_gesture_payout' }, // gitleaks:allow
  ];

  return (
    <DarkCard className="p-4 mb-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <img src="/belivay-logo.png" alt="BelivaY" className="h-6 w-auto object-contain" />
        <LanguageButton p={p} />
      </div>

      <h1 className="font-black" style={{ fontSize: 21, color: DARK_HERO_TEXT, letterSpacing: '-0.01em' }}>
        {t('sl9_ouverture.hero_title')}
      </h1>
      <p className="mt-1 mb-4" style={{ fontSize: 12.5, color: DARK_HERO_TEXT_MUTED }}>
        {t('sl9_ouverture.promise_sentence')}
      </p>

      <div className="flex items-stretch gap-2">
        {gestures.map((g) => {
          const Icon = g.icon;
          return (
            <div key={g.labelKey} className="flex-1 flex flex-col items-center text-center gap-1.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: DARK_HERO_TILE_BG }}
              >
                <Icon size={17} color={p.orange} />
              </div>
              <span className="font-semibold leading-tight" style={{ fontSize: 10.5, color: DARK_HERO_TEXT_MUTED }}>
                {t(g.labelKey)}
              </span>
            </div>
          );
        })}
      </div>
    </DarkCard>
  );
}
