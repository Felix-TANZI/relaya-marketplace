import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { dealHref, discountOf, useFlashCountdown, useFlashDeals } from "@/data/flashDeals";

/**
 * Ruban Flash Deals de l'accueil mobile : un bloc titre + chronomètre à gauche,
 * puis les offres en pastilles rondes qui défilent horizontalement. Compact par
 * construction — il remplace la grosse frame Flash qui mangeait un écran entier.
 *
 * Réservé aux petits écrans : à partir de `xl`, c'est le panneau Flash de la
 * colonne de droite (FlashPanel) qui prend le relais, et afficher les deux ferait
 * doublon. Le point de bascule est donc exactement celui du panneau.
 */
export default function MobileFlashStrip() {
  const deals = useFlashDeals();
  const remaining = useFlashCountdown(deals);

  if (deals.length === 0) return null;

  return (
    <section className="flex items-start gap-3 bg-[linear-gradient(180deg,#fff1ed,#fff7f4)] px-3 py-3 xl:hidden dark:bg-[linear-gradient(180deg,#1c1917,#0f172a)]">
      <Link to="/flash-deals" className="flex-shrink-0 pt-1" aria-label="Voir tous les Flash Deals">
        <p className="flex items-center gap-1 text-[12.5px] font-black text-primary">
          <Zap size={14} className="animate-flame-flicker" fill="currentColor" />
          Flash Deals
        </p>
        <p className="mt-1 font-mono text-[13px] font-black tabular-nums tracking-tight text-gray-900 dark:text-white">
          {remaining}
        </p>
      </Link>

      {/*
        `overflow-x: auto` rend aussi l'axe vertical scrollable, donc découpant :
        l'anneau rouge (ring + offset, 4 px hors de la vignette) et la pastille de
        remise (4 px sous la vignette) étaient rognés en haut et en bas. Le padding
        vertical leur réserve la place à l'intérieur de la zone de défilement.
      */}
      <div
        className="flex min-w-0 flex-1 gap-3 overflow-x-auto scrollbar-hide pb-2 pt-1.5"
        style={{ scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch" }}
      >
        {deals.map((deal, index) => {
          const discount = discountOf(deal);

          return (
            <Link
              key={`${deal.id}-${index}`}
              to={dealHref(deal)}
              className="flex w-[64px] flex-shrink-0 flex-col items-center gap-1"
              style={{ scrollSnapAlign: "start" }}
            >
              <span className="relative block h-[58px] w-[58px]">
                <img
                  src={deal.img}
                  alt={deal.name}
                  loading="lazy"
                  className="h-full w-full rounded-full object-cover ring-2 ring-red-400 ring-offset-2 ring-offset-[#fff4f1] dark:ring-offset-gray-900"
                />
                {discount > 0 ? (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-md bg-red-500 px-1.5 py-0.5 text-[9.5px] font-black leading-none text-white shadow-sm">
                    −{discount}%
                  </span>
                ) : null}
              </span>

              <span className="line-clamp-2 text-center text-[10px] font-bold leading-tight text-gray-700 dark:text-gray-300">
                {deal.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
