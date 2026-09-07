import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronDown, Globe } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import PortalLoginCard from './PortalLoginCard';
import { usePortalLogin } from './usePortalLogin';
import type { PortalLoginContent } from './types';

const HANDWRITING = { fontFamily: "'Caveat', cursive" } as React.CSSProperties;

/** Marque BelivaY : « Beliva » dans la couleur du texte, « Y » en accent. */
function Wordmark({ accent, className }: { accent: string; className?: string }) {
  return (
    <span className={className}>
      Beliva<span style={{ color: accent }}>Y</span>
    </span>
  );
}

function CartMark({ accent, className }: { accent: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="8" cy="21" r="1.4" fill={accent} stroke="none" />
      <circle cx="18" cy="21" r="1.4" fill={accent} stroke="none" />
      <path d="M1 2h3l2.4 11.2a2 2 0 0 0 2 1.6h9.1a2 2 0 0 0 1.95-1.55L21.2 6H5.1" />
      <path d="M9.2 9.6h7.4" />
    </svg>
  );
}

/** Selecteur de langue : bascule fr ↔ en via i18next. */
function LanguageToggle({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = String(i18n.language || 'fr').split('-')[0];
  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(current === 'fr' ? 'en' : 'fr')}
      className={`flex shrink-0 items-center gap-1.5 text-sm font-medium ${className ?? ''}`}
    >
      <Globe size={16} />
      <span className="uppercase">{current}</span>
      <ChevronDown size={12} />
    </button>
  );
}

/**
 * Gabarit commun aux six portails de connexion.
 *
 * Desktop : photo plein cadre, voiles degradés, colonne de titre a gauche,
 * carte de connexion flottante a droite, barre de statistiques en pied.
 * Mobile : en-tete, titre, bande photo, puis la carte qui chevauche la photo.
 *
 * La photo suit le theme de l'application (ThemeContext) : prise de vue de
 * jour en theme clair, de nuit en theme sombre.
 */
export default function PortalLoginShell({ content }: { content: PortalLoginContent }) {
  const ctl = usePortalLogin();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const { accent, veil } = content.theme;
  const hero = content.hero;
  // Opacite du voile horizontal : certaines photos portent du texte (enseigne,
  // mur) juste sous la colonne de titre et demandent un voile plus dense.
  const veilScale = content.theme.veilScale ?? 1;
  const a = (value: number) => Math.min(value * veilScale, 0.99).toFixed(2);

  // ───────────────────────────────────────────────────────────────────────────
  // L'ESPACE CLIENT N'A PAS SON PROPRE EN-TETE
  //
  // /login est une route enfant d'AppLayout (voir router.tsx) : l'en-tete du
  // site — logo, selecteur de langue, bouton S'inscrire — est deja affiche
  // au-dessus. Le repeter ici faisait doublon, et poussait le bas de la
  // colonne de titre sous le pied de page du site.
  //
  // Les portails dedies servent la meme route mais sans ce chrome autour :
  // eux gardent leur en-tete.
  // ───────────────────────────────────────────────────────────────────────────
  const chrome = content.role !== 'client';

  const titleLines = content.title.map((line, index) => ({
    line,
    accented: dark ? index >= content.accentFrom : index === content.title.length - 1,
  }));

  return (
    <div className="belivay-portal relative min-h-screen overflow-hidden bg-white dark:bg-[#0B0F14]">
      {/* ─── Desktop ─────────────────────────────────────────────── */}
      <div className="relative hidden min-h-screen lg:block">
        <img
          src={dark ? hero.night : hero.day}
          alt={hero.alt}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, rgba(${veil},${a(0.95)}) 0%, rgba(${veil},${a(0.88)}) 26%, rgba(${veil},${a(0.6)}) 44%, rgba(${veil},${a(0.2)}) 60%, rgba(${veil},${a(0.34)}) 100%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(${veil},.9) 0%, rgba(${veil},.28) 16%, rgba(${veil},.04) 34%, rgba(${veil},.55) 82%, rgba(${veil},.95) 100%)`,
          }}
        />

        {chrome && (
          <header className="absolute inset-x-0 top-0 flex h-[13vh] max-h-28 items-center gap-8 px-9 text-white">
            <div className="flex shrink-0 items-center gap-3">
              <CartMark accent={accent} className="h-9 w-11" />
              <span className="flex flex-col leading-none">
                <Wordmark accent={accent} className="text-[1.8rem] font-bold tracking-tight" />
                <span className="mt-1 whitespace-nowrap text-[10px] text-white/75">
                  Tout ce qu'il vous faut, livré chez vous.
                </span>
              </span>
            </div>
            <LanguageToggle className="ml-auto text-white" />
            {content.navCta && (
              <button
                type="button"
                className="ml-4 h-9 shrink-0 whitespace-nowrap rounded-full px-5 text-[13px] font-semibold text-white"
                style={{ background: `linear-gradient(180deg, ${accent}, ${content.theme.accentDark})` }}
              >
                {content.navCta}
              </button>
            )}
          </header>
        )}

        <div className={`absolute left-14 w-[34rem] max-w-[46%] text-white ${chrome ? 'top-[19vh]' : 'top-[6vh]'}`}>
          <div className="flex items-center gap-3">
            <span className="h-[3px] w-7 shrink-0" style={{ background: accent }} />
            <span className="whitespace-nowrap text-[13px] font-semibold uppercase tracking-[.16em]" style={{ color: accent }}>
              {content.kicker}
            </span>
          </div>
          <h2 className="mt-4 text-[2.7rem] font-bold leading-[1.16] tracking-tight">
            {titleLines.map(({ line, accented }) => (
              <span key={line} className="block" style={accented ? { color: accent } : undefined}>
                {line}
              </span>
            ))}
          </h2>
          <p className="mt-5 text-[0.97rem] leading-[1.72] text-white/90">
            {content.intro.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
          {content.cta && (
            <button
              type="button"
              className="mt-5 inline-flex h-11 items-center gap-2.5 whitespace-nowrap rounded px-5 text-sm font-semibold text-white shadow-lg transition hover:brightness-95"
              style={{ background: `linear-gradient(180deg, ${accent}, ${content.theme.accentDark})` }}
            >
              {content.cta}
              <ArrowRight size={16} />
            </button>
          )}

          <ul className="mt-6 flex gap-7">
            {content.features.map(({ icon: Icon, label, hint }) => (
              <li key={label} className="flex w-[7.75rem] flex-col items-center gap-3 text-center">
                <span
                  className="flex items-center justify-center rounded-full border"
                  style={{
                    height: '3.25rem',
                    width: '3.25rem',
                    background: `${accent}24`,
                    borderColor: `${accent}8c`,
                    color: accent,
                  }}
                >
                  <Icon size={22} strokeWidth={1.6} />
                </span>
                <span className="text-[11.5px] font-medium leading-snug text-white/95">{label}</span>
                {hint && <span className="text-[10.5px] leading-snug text-white/70">{hint}</span>}
              </li>
            ))}
          </ul>

          <p className="mt-8 whitespace-nowrap text-[2rem] font-semibold leading-tight -rotate-[1.5deg]" style={HANDWRITING}>
            {content.signature[0]}
            <br />
            {content.signature[1]}
          </p>
        </div>

        {content.stats && (
        <footer
          className="absolute inset-x-0 bottom-0 flex h-[13.5vh] max-h-28 items-center gap-10 px-10 text-white"
          style={{ background: `linear-gradient(180deg, rgba(${veil},.72), rgba(${veil},.96))` }}
        >
          <ul className="ml-[9rem] flex items-center gap-10">
            {content.stats.map(({ icon: Icon, value, label }) => (
              <li key={label} className="flex items-center gap-3">
                <Icon size={25} strokeWidth={1.6} style={{ color: accent }} className="shrink-0" />
                <span className="flex flex-col gap-0.5">
                  <span className="whitespace-nowrap text-[15px] font-semibold leading-tight">{value}</span>
                  <span className="whitespace-nowrap text-xs leading-tight text-white/75">{label}</span>
                </span>
              </li>
            ))}
          </ul>
          {content.signatureEnd && (
            <p className="ml-auto whitespace-nowrap text-[1.6rem] font-semibold leading-tight -rotate-[1.5deg]" style={HANDWRITING}>
              {content.signatureEnd[0]}
              <br />
              {content.signatureEnd[1]}
            </p>
          )}
        </footer>
        )}

        <div className={`absolute right-[3rem] w-[23rem] max-w-[34%] ${chrome ? 'top-[14vh]' : 'top-[5vh]'}`}>
          <PortalLoginCard content={content} ctl={ctl} />
        </div>
      </div>

      {/* ─── Mobile et tablette ──────────────────────────────────── */}
      <div className="flex min-h-screen flex-col lg:hidden">
        {chrome && (
          <header className="safe-pt flex items-center justify-between gap-3 px-5 pt-6">
            <div className="flex items-center gap-2.5">
              <CartMark accent={accent} className="h-7 w-8" />
              <Wordmark accent={accent} className="text-[1.45rem] font-bold tracking-tight text-gray-900 dark:text-white" />
            </div>
            <LanguageToggle className="text-gray-500 dark:text-white/70" />
          </header>
        )}

        <h2 className={`px-5 text-[1.85rem] font-bold leading-[1.26] tracking-tight text-gray-900 dark:text-white ${chrome ? 'mt-6' : 'safe-pt mt-4'}`}>
          {titleLines.map(({ line, accented }) => (
            <span key={line} className="block" style={accented ? { color: accent } : undefined}>
              {line}
            </span>
          ))}
        </h2>
        <p className="mt-3.5 px-5 text-[12.5px] leading-[1.7] text-gray-500 dark:text-white/70">
          {content.introMobile}
        </p>

        <div className="relative mt-4 h-[19rem] w-full shrink-0 overflow-hidden">
          <img
            src={dark ? hero.nightPortrait : hero.dayPortrait}
            alt={hero.alt}
            className="h-full w-full object-cover"
            style={{ objectPosition: hero.portraitFocus ?? 'center 40%' }}
          />
          {dark && (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(180deg, rgba(${veil},.5) 0%, rgba(${veil},0) 28%, rgba(${veil},.4) 100%)` }}
            />
          )}
        </div>

        <div className="relative -mt-16 px-3">
          <PortalLoginCard content={content} ctl={ctl} />
        </div>

        <ul className="mt-5 grid grid-cols-4 gap-2 px-4">
          {content.features.map(({ icon: Icon, label }) => (
            <li key={label} className="flex flex-col items-center gap-1.5 text-center">
              <Icon size={22} strokeWidth={1.6} style={{ color: accent }} />
              <span className="text-[10.5px] font-medium leading-snug text-gray-600 dark:text-white/80">{label}</span>
            </li>
          ))}
        </ul>

        <p
          className="safe-pb mt-auto px-5 pb-7 pt-6 text-center text-[1.35rem] font-semibold leading-snug text-gray-900 dark:text-white"
          style={HANDWRITING}
        >
          {content.signature[0]}
          <br />
          {content.signature[1]}
        </p>
      </div>
    </div>
  );
}
