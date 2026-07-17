import { useEffect, useState } from "react";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { TRUST_BANNERS } from "@/data/v29Products";

const TRUST_BANNER_ICONS = [
  ShieldCheck,
  BadgeCheck,
  Truck,
  RotateCcw,
  MessageCircle,
];

export default function TrustBannersStrip() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrent((value) => (value + 1) % TRUST_BANNERS.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#f5d6bc] bg-[linear-gradient(135deg,#fff7ef,#fffdf9)] p-3 shadow-[0_14px_38px_rgba(244,121,32,.08)] sm:rounded-[28px] sm:p-4 dark:border-gray-800 dark:bg-[linear-gradient(180deg,#111827,#0f172a)]">
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#fff1e5] text-primary sm:h-11 sm:w-11 dark:bg-primary/10">
            <ShieldCheck size={18} className="sm:hidden" />
            <ShieldCheck size={20} className="hidden sm:block" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary sm:text-[11px] sm:tracking-[0.26em]">
              Protection acheteur
            </p>
            <h3 className="text-[15px] font-extrabold text-gray-900 sm:text-[18px] dark:text-white">
              Achetez en toute sécurité
            </h3>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCurrent((value) => (value - 1 + TRUST_BANNERS.length) % TRUST_BANNERS.length)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#f0d8c5] bg-white text-[#b86428] transition hover:border-primary hover:text-primary sm:h-10 sm:w-10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            aria-label="Carte précédente"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setCurrent((value) => (value + 1) % TRUST_BANNERS.length)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#f0d8c5] bg-white text-[#b86428] transition hover:border-primary hover:text-primary sm:h-10 sm:w-10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            aria-label="Carte suivante"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[18px] sm:rounded-[24px]">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {TRUST_BANNERS.map((banner, index) => {
            const BannerIcon = TRUST_BANNER_ICONS[index] ?? ShieldCheck;

            return (
              <article key={index} className="relative min-w-full overflow-hidden rounded-[18px] sm:rounded-[24px]">
                <div className="grid min-h-[132px] md:min-h-[220px] md:grid-cols-[1.15fr_0.85fr]">
                  <div className="relative min-h-[132px] md:min-h-[220px]">
                    <img
                      src={banner.img}
                      alt={banner.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(17,24,39,.82),rgba(17,24,39,.15))] md:bg-[linear-gradient(90deg,rgba(17,24,39,.78),rgba(17,24,39,.18))]" />

                    {/* Overlay compact — mobile uniquement */}
                    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3 md:hidden">
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                        <BannerIcon size={11} />
                        Garantie BelivaY
                      </span>
                      <h4 className="text-[15px] font-extrabold leading-tight text-white">
                        {banner.title}
                      </h4>
                      <p className="text-[11px] leading-snug text-white/85">
                        {banner.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Panneau texte — desktop / tablette (≥ md) */}
                  <div className="hidden bg-[#fffaf5] px-5 py-6 md:flex md:flex-col md:justify-center md:gap-3 dark:bg-gray-900">
                    <span className="inline-flex w-fit rounded-full bg-[#fff1e5] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary dark:bg-primary/10">
                      Garantie BelivaY
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1e5] text-primary dark:bg-primary/10">
                        <BannerIcon size={20} />
                      </div>
                      <h4 className="text-[24px] font-extrabold leading-tight text-gray-900 dark:text-white">
                        {banner.title}
                      </h4>
                    </div>
                    <p className="text-[14px] leading-7 text-gray-600 dark:text-gray-300">
                      {banner.subtitle}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {[
                        { icon: ShieldCheck, label: "Escrow sécurisé" },
                        { icon: Truck, label: "Suivi 24-72h" },
                        { icon: RotateCcw, label: "Retour simplifié" },
                      ].map((item) => (
                        <span
                          key={item.label}
                          className="inline-flex items-center gap-2 rounded-full border border-[#f2dfd0] bg-white px-3 py-1.5 text-[11px] font-bold text-[#7c4b27] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        >
                          <item.icon size={13} className="text-primary" />
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-2 sm:mt-4">
        {TRUST_BANNERS.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setCurrent(index)}
            className={`h-2 rounded-full transition-all sm:h-2.5 ${
              current === index ? "w-7 bg-primary sm:w-8" : "w-2 bg-[#f0d8c5] sm:w-2.5 dark:bg-gray-700"
            }`}
            aria-label={`Aller à la carte ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}