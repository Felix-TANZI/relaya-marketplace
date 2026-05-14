import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  LifeBuoy,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { FLASH_DEALS, V29_PRODUCTS } from "@/data/v29Products";

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : seconds)), 1000);
    return () => clearInterval(id);
  }, [seconds]);
  return {
    h: String(Math.floor(left / 3600)).padStart(2, "0"),
    m: String(Math.floor((left % 3600) / 60)).padStart(2, "0"),
    s: String(left % 60).padStart(2, "0"),
  };
}

interface FlashPanelProps {
  trackTop: number;
  trackHeight: number;
  topOffset: number;
}

export default function FlashPanel({
  trackTop,
  trackHeight,
  topOffset,
}: FlashPanelProps) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLElement | null>(null);
  const cd = useCountdown(6 * 3600 + 16 * 60 + 2);
  const [current, setCurrent] = useState(0);
  const [mode, setMode] = useState<"start" | "fixed" | "end">("start");
  const [endTop, setEndTop] = useState(0);

  const linkedProduct = useMemo(() => {
    const exactMap: Record<string, number> = {
      "Ensemble Wax 3 Pièces": 9,
      "Laptop HP Intel i5": 10,
      "Coffret Beauté Naturelle": 3,
      "Chaussures Sport Running": 18,
      "Pagne Hollandais Vlisco": 28,
    };

    const explicitId = exactMap[FLASH_DEALS[current]?.name];
    if (explicitId) {
      return V29_PRODUCTS.find((product) => product.id === explicitId) ?? null;
    }

    const normalize = (value: string) =>
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    const name = normalize(FLASH_DEALS[current]?.name ?? "");
    return (
      V29_PRODUCTS.find((product) => {
        const title = normalize(product.title);
        return title.includes(name) || name.includes(title);
      }) ?? null
    );
  }, [current]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrent((value) => (value + 1) % FLASH_DEALS.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      const panel = panelRef.current;
      if (!panel) return;

      const panelHeight = panel.getBoundingClientRect().height;
      const maxTop = Math.max(0, trackHeight - panelHeight);
      const fixedStart = Math.max(0, trackTop - topOffset);
      const fixedEnd = fixedStart + maxTop;
      const y = window.scrollY;

      if (y < fixedStart) {
        setMode("start");
        setEndTop(0);
      } else if (y >= fixedEnd) {
        setMode("end");
        setEndTop(maxTop);
      } else {
        setMode("fixed");
        setEndTop(0);
      }
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [trackTop, trackHeight, topOffset]);

  const deal = FLASH_DEALS[current];
  const discount = Math.round(
    ((parseInt(deal.old.replace(/\s/g, "")) - parseInt(deal.price.replace(/\s/g, ""))) /
      parseInt(deal.old.replace(/\s/g, ""))) *
      100,
  );
  const openDeal = () => {
    if (linkedProduct) {
      navigate(`/product/${linkedProduct.id}?mock=1`);
      return;
    }
    navigate("/promotions");
  };

  return (
    <div
      className="hidden w-[296px] flex-shrink-0 xl:block"
      style={{ position: "relative", height: trackHeight || "auto" }}
    >
      <aside
        ref={panelRef}
        style={{
          position: mode === "fixed" ? "fixed" : "absolute",
          right: mode === "fixed" ? "max(12px, calc((100vw - 1760px) / 2 + 12px))" : 0,
          top: mode === "fixed" ? topOffset : endTop,
          width: "296px",
          zIndex: 35,
        }}
      >
        <div className="overflow-hidden rounded-[28px] border border-[#f2d1bc] bg-[linear-gradient(180deg,#fff,#fff7f0)] p-4 shadow-[0_20px_50px_rgba(15,23,42,.08)] dark:border-gray-800 dark:bg-[linear-gradient(180deg,#111827,#0f172a)]">
          <div className="mb-3 flex items-center gap-2 border-b border-[#f5e3d7] pb-3 dark:border-gray-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#fff0e6] text-primary dark:bg-primary/10">
              <Zap size={16} fill="currentColor" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Offres rapides</p>
              <h3 className="text-[16px] font-extrabold tracking-tight text-gray-900 dark:text-white">Flash Deals</h3>
            </div>
          </div>

          <div className="mb-4 rounded-[22px] bg-[linear-gradient(135deg,#111827,#2b3446)] p-3 shadow-inner">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wide text-white/60">Expire dans</span>
              <span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-bold text-white/80">Stock limité</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[cd.h, cd.m, cd.s].map((v, i) => (
                <span key={i} className="contents">
                  {i > 0 && <span className="text-[14px] font-black text-primary">:</span>}
                  <span className="rounded-xl border border-primary/20 bg-primary/15 px-2.5 py-2 font-mono text-[15px] font-extrabold text-primary">
                    {v}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[#f2e2d7] bg-white dark:bg-gray-950">
            <div
              role="button"
              tabIndex={0}
              onClick={openDeal}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openDeal();
                }
              }}
              className="group block w-full text-left"
              aria-label={`Ouvrir le produit ${deal.name}`}
            >
              <div className="relative aspect-[1.08] overflow-hidden bg-[#f8fafc] dark:bg-gray-800">
                <img src={deal.img} alt={deal.name} loading="lazy" className="h-full w-full object-cover" />
                <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2 py-1 text-[10px] font-black text-white">
                  -{discount}%
                </span>
                <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(17,24,39,.82))] p-4">
                  <p className="line-clamp-2 text-[15px] font-extrabold leading-tight text-white">{deal.name}</p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-end gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b96c2d] dark:text-orange-300">Prix flash</p>
                  <p className="text-[18px] font-black text-primary">{deal.price} FCFA</p>
                </div>
                <p className="text-[12px] font-semibold text-gray-400 line-through dark:text-gray-500">{deal.old} FCFA</p>
              </div>

              <div className="mt-3 h-[5px] overflow-hidden rounded bg-[#f3f4f6] dark:bg-gray-800">
                <div className="h-full rounded bg-[linear-gradient(90deg,#f47920,#ef4444)]" style={{ width: `${100 - deal.stock * 4}%` }} />
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCurrent((value) => (value - 1 + FLASH_DEALS.length) % FLASH_DEALS.length)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f0d8c5] bg-white text-[#b86428] transition hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  aria-label="Deal précédent"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={openDeal}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-4 py-3 text-[12px] font-bold text-white transition hover:bg-primary-dark"
                >
                  Voir le produit
                </button>
                <button
                  type="button"
                  onClick={() => setCurrent((value) => (value + 1) % FLASH_DEALS.length)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f0d8c5] bg-white text-[#b86428] transition hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  aria-label="Deal suivant"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="mt-4 flex justify-center gap-2">
                {FLASH_DEALS.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrent(index)}
                    className={`h-2.5 rounded-full transition-all ${current === index ? "w-7 bg-primary" : "w-2.5 bg-[#f0d8c5] dark:bg-gray-700"}`}
                    aria-label={`Aller au deal ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { icon: ShieldCheck, label: "Escrow", text: "Paiement sécurisé" },
              { icon: RotateCcw, label: "Retour", text: "Fenêtre 7 jours" },
              { icon: LifeBuoy, label: "Support", text: "Assistance 7j/7" },
              { icon: Sparkles, label: "Premium", text: "Sélection BelivaY" },
            ].map((item) => (
              <div key={item.label} className="rounded-[18px] border border-[#f2e2d7] bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-950">
                <item.icon size={16} className="text-primary" />
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#b96c2d] dark:text-orange-300">{item.label}</p>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-gray-600 dark:text-gray-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
