import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { TRUST_BANNERS } from "@/data/v29Products";

export default function TrustBannersStrip() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrent((value) => (value + 1) % TRUST_BANNERS.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#f5d6bc] bg-[linear-gradient(135deg,#fff7ef,#fffdf9)] p-4 shadow-[0_14px_38px_rgba(244,121,32,.08)] dark:border-gray-800 dark:bg-[linear-gradient(180deg,#111827,#0f172a)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1e5] text-primary dark:bg-primary/10">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-primary">
              Protection acheteur
            </p>
            <h3 className="text-[18px] font-extrabold text-gray-900 dark:text-white">
              Achetez en toute securite
            </h3>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCurrent((value) => (value - 1 + TRUST_BANNERS.length) % TRUST_BANNERS.length)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f0d8c5] bg-white text-[#b86428] transition hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            aria-label="Carte précédente"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setCurrent((value) => (value + 1) % TRUST_BANNERS.length)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f0d8c5] bg-white text-[#b86428] transition hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            aria-label="Carte suivante"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px]">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {TRUST_BANNERS.map((banner, index) => (
            <article
              key={index}
              className="relative min-w-full overflow-hidden rounded-[24px]"
            >
              <div className="grid min-h-[220px] md:grid-cols-[1.15fr_0.85fr]">
                <div className="relative min-h-[220px]">
                  <img
                    src={banner.img}
                    alt={banner.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,24,39,.78),rgba(17,24,39,.18))]" />
                </div>
                <div className="flex flex-col justify-center gap-3 bg-[#fffaf5] px-5 py-6 dark:bg-gray-900">
                  <span className="inline-flex w-fit rounded-full bg-[#fff1e5] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary dark:bg-primary/10">
                    Garantie BelivaY
                  </span>
                  <h4 className="text-[24px] font-extrabold leading-tight text-gray-900 dark:text-white">
                    {banner.title}
                  </h4>
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
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {TRUST_BANNERS.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setCurrent(index)}
            className={`h-2.5 rounded-full transition-all ${
              current === index ? "w-8 bg-primary" : "w-2.5 bg-[#f0d8c5] dark:bg-gray-700"
            }`}
            aria-label={`Aller à la carte ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
