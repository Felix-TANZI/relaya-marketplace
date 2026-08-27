import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlarmClock, Clock, Flame, Heart, Zap } from "lucide-react";
import {
  type FlashDeal,
  dealHref,
  discountOf,
  soldRatio,
  useFlashCountdown,
  useFlashDeals,
} from "@/data/flashDeals";

/**
 * Défilement automatique du bandeau du haut. Le ruban avance d'une carte toutes les
 * 3 s et revient au début en bout de course ; il se met en pause au survol pour
 * laisser le temps de cliquer.
 */
function useAutoScroll(itemCount: number) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (itemCount < 2) return;

    const timer = window.setInterval(() => {
      const track = trackRef.current;
      if (!track || pausedRef.current) return;

      const step = track.firstElementChild?.getBoundingClientRect().width ?? 220;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
      track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + step + 12, behavior: "smooth" });
    }, 3000);

    return () => window.clearInterval(timer);
  }, [itemCount]);

  return {
    trackRef,
    onMouseEnter: () => {
      pausedRef.current = true;
    },
    onMouseLeave: () => {
      pausedRef.current = false;
    },
  };
}

export default function FlashDealsPage() {
  const navigate = useNavigate();
  const deals = useFlashDeals();
  const [favorites, setFavorites] = useState<number[]>([]);
  const remaining = useFlashCountdown(deals);
  const { trackRef, onMouseEnter, onMouseLeave } = useAutoScroll(deals.length);

  /* Le ruban du haut met en avant les remises les plus fortes. */
  const highlighted = useMemo(
    () => [...deals].sort((a, b) => discountOf(b) - discountOf(a)).slice(0, 10),
    [deals],
  );

  const openDeal = (deal: FlashDeal) => navigate(dealHref(deal));

  const toggleFavorite = (id: number) =>
    setFavorites((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ef_0%,#fff_16%,#f8fafc_100%)] px-3 pb-20 pt-4 sm:px-4 sm:pt-6 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_22%,#020617_100%)]">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* ═══ Bandeau haut : titre, compte à rebours et ruban défilant ═══ */}
        <section className="overflow-hidden rounded-[26px] bg-[linear-gradient(120deg,#c2410c_0%,#ea580c_45%,#f59e0b_100%)] p-4 shadow-[0_20px_50px_rgba(194,65,12,.28)] sm:rounded-[32px] sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
            <div className="flex items-center gap-2.5">
              <Zap size={26} className="animate-flame-flicker text-amber-300" fill="currentColor" />
              <h1 className="text-[24px] font-black tracking-tight text-white sm:text-[30px]">Flash Deals</h1>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-[12px] font-bold text-white backdrop-blur-sm sm:text-[13px]">
              <Clock size={14} className="text-amber-200" />
              Expire dans <span className="tabular-nums tracking-wide">{remaining}</span>
            </span>
          </div>

          <div
            ref={trackRef}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"
          >
            {highlighted.map((deal, index) => {
              const discount = discountOf(deal);
              const sold = soldRatio(deal);
              const isFavorite = favorites.includes(deal.id);

              return (
                <article
                  key={`${deal.id}-${index}`}
                  className="relative flex w-[196px] flex-shrink-0 flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_10px_24px_rgba(15,23,42,.12)] dark:bg-gray-900"
                >
                  <button
                    type="button"
                    onClick={() => openDeal(deal)}
                    className="relative block h-[168px] w-full overflow-hidden bg-[#f1f5f9] dark:bg-gray-800"
                    aria-label={`Ouvrir l'offre ${deal.name}`}
                  >
                    <img src={deal.img} alt={deal.name} loading="lazy" className="h-full w-full object-cover" />
                    {discount > 0 ? (
                      <span className="absolute left-2.5 top-2.5 rounded-lg bg-red-500 px-2 py-1 text-[11px] font-black text-white">
                        −{discount}%
                      </span>
                    ) : null}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleFavorite(deal.id)}
                    aria-label={isFavorite ? `Retirer ${deal.name} des favoris` : `Ajouter ${deal.name} aux favoris`}
                    aria-pressed={isFavorite}
                    className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-primary shadow-sm transition hover:bg-white"
                  >
                    <Heart size={15} fill={isFavorite ? "currentColor" : "none"} />
                  </button>

                  <div className="flex flex-1 flex-col gap-1.5 p-3">
                    <p className="line-clamp-2 text-[13px] font-bold leading-tight text-gray-900 dark:text-gray-100">
                      {deal.name}
                    </p>

                    <div className="flex items-baseline gap-2">
                      <span className="text-[16px] font-black text-primary">{deal.price.toLocaleString("fr-FR")}</span>
                      <span className="text-[12px] font-semibold text-gray-400 line-through">
                        {deal.old.toLocaleString("fr-FR")}
                      </span>
                    </div>

                    <div className="mt-auto">
                      <div className="h-[5px] overflow-hidden rounded-full bg-[#f1f5f9] dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#f97316,#dc2626)]"
                          style={{ width: `${sold}%` }}
                        />
                      </div>
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                        <Flame size={11} className="text-orange-500" />
                        {sold}% vendus
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ═══ Toutes les offres flash ═══ */}
        <section>
          <div className="mb-3 flex items-center gap-2.5">
            <Flame size={18} className="text-orange-500" fill="currentColor" />
            <h2 className="text-[18px] font-black tracking-tight text-gray-900 sm:text-[20px] dark:text-white">
              Tous les Flash Deals
            </h2>
            <span className="rounded-full bg-[#fff1e5] px-2.5 py-1 text-[11px] font-bold text-primary dark:bg-primary/10">
              {deals.length} offre{deals.length > 1 ? "s" : ""}
            </span>
          </div>

          {deals.length === 0 ? (
            <p className="rounded-[20px] border border-dashed border-[#f1d2bb] bg-white px-4 py-10 text-center text-[13px] font-semibold text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Aucune offre flash en cours. Revenez très vite, elles changent chaque jour.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {deals.map((deal, index) => {
                const discount = discountOf(deal);

                return (
                  <button
                    key={`all-${deal.id}-${index}`}
                    type="button"
                    onClick={() => openDeal(deal)}
                    className="group overflow-hidden rounded-[18px] bg-white text-left shadow-[0_10px_26px_rgba(15,23,42,.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,.14)] dark:bg-gray-900"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-[#f1f5f9] dark:bg-gray-800">
                      <img
                        src={deal.img}
                        alt={deal.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      {discount > 0 ? (
                        <span className="absolute left-2.5 top-2.5 rounded-lg bg-red-500 px-2 py-1 text-[11px] font-black text-white">
                          −{discount}%
                        </span>
                      ) : null}

                      <p className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-[linear-gradient(180deg,transparent,rgba(17,24,39,.85))] px-2.5 pb-2.5 pt-8 text-[11px] font-bold text-white">
                        <AlarmClock size={12} className="text-amber-300" />
                        Offre limitée · stock réduit
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 p-3">
                      <p className="line-clamp-2 text-[12.5px] font-bold leading-tight text-gray-900 dark:text-gray-100">
                        {deal.name}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[14px] font-black text-primary">
                          {deal.price.toLocaleString("fr-FR")} FCFA
                        </span>
                        <span className="text-[11px] font-semibold text-gray-400 line-through">
                          {deal.old.toLocaleString("fr-FR")}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
