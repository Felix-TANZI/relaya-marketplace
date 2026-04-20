import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { type Product } from "@/services/api/products";

interface HomeSectionProps {
  title: string;
  icon?: LucideIcon;
  badge?: string;
  badgeColor?: string;
  products: Product[];
  rows?: 1 | 2 | 3;
  onSeeMore?: () => void;
}

export default function HomeSection({
  title,
  icon: Icon,
  badge,
  badgeColor = "bg-red-50 text-red-600",
  products,
  rows = 1,
  onSeeMore,
}: HomeSectionProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const scroll = useCallback((dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(":scope > div");
    const w = card?.offsetWidth ?? 200;
    el.scrollBy({ left: dir * (w + 6) * 2, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, products]);

  if (!products.length) return null;

  const gridClass =
    rows === 3
      ? "grid grid-rows-3 grid-flow-col auto-cols-[calc((100%-24px)/4.5)]"
      : rows === 2
      ? "grid grid-rows-2 grid-flow-col auto-cols-[calc((100%-24px)/4.5)]"
      : "flex";

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-gray-100 bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,.03)] dark:border-gray-800 dark:bg-[linear-gradient(180deg,#111827,#0f172a)]">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-[18px] w-[3px] rounded bg-primary" />
          {Icon && <Icon size={15} className="text-primary" />}
          <h3 className="text-[13px] font-extrabold text-gray-900 dark:text-white">{title}</h3>
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        {onSeeMore && (
          <button
            onClick={onSeeMore}
            className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-bold text-orange-700 transition-all hover:bg-primary hover:text-white hover:border-primary dark:border-primary/20 dark:bg-primary/10 dark:text-primary"
          >
            Voir plus →
          </button>
        )}
      </div>

      {/* Scroll track */}
      <div className="group relative">
        {canLeft && (
          <button
            onClick={() => scroll(-1)}
            className="absolute -left-1 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-gray-600 shadow-lg transition-all hover:bg-white dark:bg-gray-800/95 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        {canRight && (
          <button
            onClick={() => scroll(1)}
            className="absolute -right-1 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-gray-600 shadow-lg transition-all hover:bg-white dark:bg-gray-800/95 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <ChevronRight size={16} />
          </button>
        )}

        <div
          ref={trackRef}
          className={`gap-1.5 overflow-x-auto scroll-smooth pb-1.5 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent ${gridClass}`}
          style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        >
          {products.map((p) => (
            <div
              key={p.id}
              className={`${rows === 1 ? "w-[calc((100%-24px)/4.5)] flex-shrink-0" : ""} min-w-0`}
              style={{ scrollSnapAlign: "start" }}
            >
              <ProductCard product={p} showPromo compact />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
