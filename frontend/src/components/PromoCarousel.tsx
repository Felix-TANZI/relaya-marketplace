import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Slide {
  label: string;
  title: string;
  subtitle: string;
  bg: string;
  labelBg?: string;
  action?: () => void;
}

interface PromoCarouselProps {
  slides: Slide[];
  autoPlayMs?: number;
}

export default function PromoCarousel({ slides, autoPlayMs = 5000 }: PromoCarouselProps) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const total = slides.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);
  const goTo = (i: number) => setCurrent(i);

  // Auto-play
  useEffect(() => {
    if (autoPlayMs <= 0) return;
    const timer = setInterval(next, autoPlayMs);
    return () => clearInterval(timer);
  }, [next, autoPlayMs]);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Track */}
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className="relative min-w-full cursor-pointer overflow-hidden"
            style={{ background: slide.bg, minHeight: 180 }}
            onClick={() => slide.action?.()}
          >
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6 text-white z-10">
              <span
                className="mb-2 inline-block w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: slide.labelBg || "rgba(244,121,32,0.9)" }}
              >
                {slide.label}
              </span>
              <h2 className="text-lg font-bold leading-tight sm:text-xl">{slide.title}</h2>
              <p className="mt-1 text-xs opacity-80 sm:text-sm">{slide.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Arrows */}
      {total > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all hover:bg-white/35"
            aria-label="Précédent"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all hover:bg-white/35"
            aria-label="Suivant"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Dots */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5 bg-white py-2 dark:bg-gray-900">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "w-5 bg-primary" : "w-1.5 bg-gray-200 dark:bg-gray-700"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
