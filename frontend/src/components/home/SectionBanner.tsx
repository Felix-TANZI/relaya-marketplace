import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SectionBannerProps {
  /** Destination du bandeau — il se comporte comme un grand bouton. */
  to: string;
  title: string;
  /** Pastille à droite du titre : SPONSO, CURATED… */
  badge?: string;
  /** Ligne du dessous : texte simple, ou nœud pour un chronomètre par exemple. */
  subtitle: ReactNode;
  icon: LucideIcon;
  /** Dégradé CSS de la frame. */
  gradient: string;
  /** Classe d'animation de l'icône (scintillement, vacillement…). */
  iconAnimation: string;
  /** Couleur de l'icône, en classes Tailwind. */
  iconClassName: string;
  /** Mots répétés en filigrane sur le fond. */
  watermark: string[];
  ariaLabel: string;
  /** Teinte de l'ombre portée, pour rester dans la couleur du bandeau. */
  shadow: string;
}

/**
 * Grande barre cliquable des sections de l'accueil — Promotions, BelivaY Premium,
 * Sélection Premium. Les trois partagent le même dispositif : dégradé, inscriptions
 * en filigrane, reflet qui balaie la frame et icône animée.
 */
export default function SectionBanner({
  to,
  title,
  badge,
  subtitle,
  icon: Icon,
  gradient,
  iconAnimation,
  iconClassName,
  watermark,
  ariaLabel,
  shadow,
}: SectionBannerProps) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      className="group relative block overflow-hidden rounded-[22px] transition-transform duration-200 hover:-translate-y-0.5 sm:rounded-[28px]"
      style={{ background: gradient, boxShadow: shadow }}
    >
      {/* Inscriptions en filigrane */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex select-none flex-wrap items-center gap-x-6 overflow-hidden px-4 text-[26px] font-black uppercase italic leading-none tracking-tight text-white/[0.07] sm:text-[34px]"
      >
        {watermark.concat(watermark).map((word, index) => (
          <span key={`${word}-${index}`}>{word}</span>
        ))}
      </div>

      {/* Reflet qui balaie la frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-promo-sweep bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />

      <div className="relative z-10 flex items-center gap-3 px-3.5 py-3 sm:px-5 sm:py-3.5">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
          <Icon size={22} className={`${iconAnimation} ${iconClassName}`} fill="currentColor" />
        </span>

        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[15px] font-black leading-tight text-white sm:text-[17px]">
            <span className="truncate">{title}</span>
            {badge ? (
              <span className="flex-shrink-0 rounded-full bg-amber-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-amber-950">
                {badge}
              </span>
            ) : null}
          </p>
          <div className="mt-1 text-[11.5px] font-bold text-white/85">{subtitle}</div>
        </div>

        <ChevronRight
          size={20}
          className="ml-auto flex-shrink-0 text-white/80 transition-transform duration-200 group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}
