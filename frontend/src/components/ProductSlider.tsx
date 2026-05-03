import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { type Product } from "@/services/api/products";

interface ProductSliderProps {
  products: Product[];
  autoPlayMs?: number;
  showPromo?: boolean;
}

export default function ProductSlider({ products, autoPlayMs = 0, showPromo = false }: ProductSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const scrollBy = useCallback((dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = el.querySelector<HTMLElement>(":scope > div")?.offsetWidth ?? 260;
    el.scrollBy({ left: dir * (cardWidth + 16), behavior: "smooth" });
  }, []);

  // Auto-play
  useEffect(() => {
    if (autoPlayMs <= 0) return;
    const timer = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollBy(1);
      }
    }, autoPlayMs);
    return () => clearInterval(timer);
  }, [autoPlayMs, scrollBy]);

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

  return (
    <div className="group relative">
      {/* Left Arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scrollBy(-1)}
          className="absolute -left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl dark:bg-gray-800/90 dark:text-gray-200 sm:-left-4"
          aria-label="Précédent"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {/* Right Arrow */}
      {canScrollRight && (
        <button
          onClick={() => scrollBy(1)}
          className="absolute -right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl dark:bg-gray-800/90 dark:text-gray-200 sm:-right-4"
          aria-label="Suivant"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Track */}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 scrollbar-hide"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[220px] flex-shrink-0 sm:w-[240px] lg:w-[260px]"
            style={{ scrollSnapAlign: "start" }}
          >
            <ProductCard product={product} showPromo={showPromo} />
          </div>
        ))}
      </div>
    </div>
  );
}
