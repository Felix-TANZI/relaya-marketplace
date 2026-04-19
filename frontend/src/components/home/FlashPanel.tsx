import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Zap } from "lucide-react";
import { FLASH_DEALS } from "@/data/v29Products";

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

export default function FlashPanel() {
  const navigate = useNavigate();
  const cd = useCountdown(6 * 3600 + 16 * 60 + 2);

  return (
    <aside className="hidden flex-shrink-0 flex-col overflow-y-auto border-l border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 lg:flex"
      style={{
        width: 280,
        position: "fixed",
        right: 0,
        top: "var(--belivay-fixed-top, 100px)",
        height: "calc(100vh - var(--belivay-fixed-top, 100px))",
        zIndex: 30,
        boxShadow: "-2px 0 12px rgba(0,0,0,.06)",
      }}>
      {/* Header */}
      <div className="mb-2 flex items-center gap-2 border-b border-gray-100 pb-2 dark:border-gray-800">
        <div className="h-5 w-1 rounded bg-gradient-to-b from-primary to-orange-400 shadow-sm shadow-primary/20" />
        <Zap size={14} className="text-primary" fill="currentColor" />
        <h3 className="text-[15px] font-extrabold tracking-tight text-gray-900 dark:text-white">Flash Deals</h3>
      </div>

      {/* Countdown */}
      <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 p-2 shadow-inner">
        <span className="text-[10px] font-bold uppercase tracking-wide text-white/60">Expire</span>
        {[cd.h, cd.m, cd.s].map((v, i) => (
          <span key={i} className="contents">
            {i > 0 && <span className="text-[14px] font-black text-primary">:</span>}
            <span className="rounded border border-primary/20 bg-primary/15 px-2 py-1 font-mono text-[14px] font-extrabold text-primary">
              {v}
            </span>
          </span>
        ))}
      </div>

      {/* Flash deals list */}
      <div className="flex flex-col">
        {FLASH_DEALS.map((deal, i) => (
          <div
            key={i}
            onClick={() => navigate("/catalog?promo=1")}
            className="group -mx-1 flex cursor-pointer items-center gap-2 rounded-lg border-b border-gray-100 px-2 py-2.5 transition-all hover:translate-x-0.5 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-50/30 dark:border-gray-800 dark:hover:from-primary/10 dark:hover:to-primary/5"
          >
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 transition-colors group-hover:border-primary/20 dark:border-gray-700">
              <img src={deal.img} alt={deal.name} loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute right-0.5 top-0.5 rounded bg-red-500 px-1 py-0.5 text-[7.5px] font-extrabold leading-tight text-white">
                -{Math.round(((parseInt(deal.old.replace(/\s/g, '')) - parseInt(deal.price.replace(/\s/g, ''))) / parseInt(deal.old.replace(/\s/g, ''))) * 100)}%
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[11px] font-bold leading-tight text-gray-900 dark:text-white">{deal.name}</p>
              <p className="mt-0.5 text-[12px] font-extrabold text-primary">{deal.price} FCFA</p>
              {/* Stock bar */}
              <div className="mt-1 h-[3px] overflow-hidden rounded bg-gray-100 dark:bg-gray-700">
                <div className="h-full rounded bg-gradient-to-r from-primary to-red-500" style={{ width: `${100 - deal.stock * 4}%` }} />
              </div>
            </div>
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-primary">
              <ChevronRight size={11} className="text-white" />
            </div>
          </div>
        ))}
      </div>

      {/* Featured grid */}
      <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">À la une</p>
        <div className="grid grid-cols-2 gap-1.5">
          {FLASH_DEALS.slice(0, 4).map((d, i) => (
            <div key={i} onClick={() => navigate("/catalog")} className="cursor-pointer overflow-hidden rounded-lg border border-gray-200 transition-all hover:border-primary dark:border-gray-700">
              <div className="aspect-square overflow-hidden bg-gray-50">
                <img src={d.img} alt={d.name} loading="lazy" className="h-full w-full object-cover transition-transform hover:scale-110" />
              </div>
              <div className="bg-white p-1.5 dark:bg-gray-800">
                <p className="line-clamp-2 text-[9.5px] font-bold leading-tight text-gray-700 dark:text-gray-300">{d.name}</p>
                <p className="mt-0.5 text-[10px] font-extrabold text-primary">{d.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guarantees compact */}
      <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-2 text-center dark:border-green-900/40 dark:bg-green-900/10">
        <p className="text-[10px] font-bold leading-relaxed text-green-700 dark:text-green-300">
          🔒 Escrow · ✅ Vérifiés · ↩️ Retour 7j · 💬 7j/7
        </p>
      </div>

      {/* Premium CTA */}
      <div
        onClick={() => navigate("/about")}
        className="mt-2 cursor-pointer overflow-hidden rounded-xl bg-gradient-to-br from-violet-700 to-violet-500 p-3 text-center shadow-lg shadow-violet-500/20"
      >
        <p className="mb-2 text-xs font-extrabold text-white">💎 BelivaY Premium</p>
        <button className="w-full rounded-md border border-white/30 bg-white/15 py-1.5 text-[10px] font-extrabold text-white transition-colors hover:bg-white/25">
          Voir les plans →
        </button>
      </div>
    </aside>
  );
}
