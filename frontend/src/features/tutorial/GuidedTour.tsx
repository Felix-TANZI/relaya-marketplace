import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Sparkles,
  X,
} from "lucide-react";
import {
  CLIENT_TOUR_STORAGE_KEY,
  CLIENT_TUTORIAL_STEPS,
} from "./tutorialSteps";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getVisibleTarget(selector: string | null) {
  if (!selector) return null;
  const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  return elements.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }) ?? null;
}

export default function GuidedTour() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const rafRef = useRef<number | null>(null);

  const step = CLIENT_TUTORIAL_STEPS[stepIndex];
  const total = CLIENT_TUTORIAL_STEPS.length;
  const progress = ((stepIndex + 1) / total) * 100;

  // ── Open / Close ──
  const openTour = () => { setStepIndex(0); setIsOpen(true); };

  const closeTour = () => {
    localStorage.setItem(CLIENT_TOUR_STORAGE_KEY, "true");
    setIsOpen(false);
    setStepIndex(0);
    setTargetRect(null);
    setReady(false);
    setCelebrating(false);
    navigate("/");
  };

  const finishTour = () => {
    localStorage.setItem(CLIENT_TOUR_STORAGE_KEY, "true");
    setCelebrating(true);
    navigate("/");
    window.setTimeout(() => {
      setIsOpen(false);
      setStepIndex(0);
      setTargetRect(null);
      setReady(false);
      setCelebrating(false);
    }, 1800);
  };

  // Auto-start on first visit
  useEffect(() => {
    const seen = localStorage.getItem(CLIENT_TOUR_STORAGE_KEY) === "true";
    const timer = setTimeout(() => { if (!seen) openTour(); }, 700);
    const handler = () => openTour();
    window.addEventListener("belivay-open-tutorial", handler);
    return () => { clearTimeout(timer); window.removeEventListener("belivay-open-tutorial", handler); };
  }, []);

  // Navigate to step route
  useEffect(() => {
    if (!isOpen || !step?.route || location.pathname === step.route) return;
    navigate(step.route);
  }, [isOpen, step, location.pathname, navigate]);

  // Track target element
  useLayoutEffect(() => {
    if (!isOpen || !step) return;
    const selector = step.selector ?? null;
    if (!selector) { setTargetRect(null); setReady(true); return; }

    let attempts = 0;
    const sync = () => {
      const el = getVisibleTarget(selector);
      if (!el) {
        attempts++;
        setReady(false);
        if (attempts < 100) rafRef.current = requestAnimationFrame(sync);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: step.scrollBlock ?? "center", inline: "center" });
      const r = el.getBoundingClientRect();
      setTargetRect(r);
      setReady(r.width > 0 && r.height > 0);
    };

    const onResize = () => {
      const el = getVisibleTarget(selector);
      if (el) setTargetRect(el.getBoundingClientRect());
    };

    sync();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [isOpen, step, location.pathname]);

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeTour(); return; }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (stepIndex < total - 1) setStepIndex(s => s + 1);
        else finishTour();
      }
      if (e.key === "ArrowLeft") { e.preventDefault(); setStepIndex(s => Math.max(0, s - 1)); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, stepIndex, total]);

  // ── Tooltip positioning: prefer LEFT of target, fallback right/below ──
  const tooltipStyle = useMemo(() => {
    const tooltipW = Math.min(380, window.innerWidth - 32);
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Center if no target
    if (!targetRect || !ready) {
      return { position: "fixed" as const, top: "50%", left: "50%", width: tooltipW, transform: "translate(-50%, -50%)" };
    }

    const pad = 16;
    let top = 0;
    let left = 0;

    // Try LEFT of target
    if (targetRect.left - tooltipW - pad > 0) {
      left = targetRect.left - tooltipW - pad;
      top = clamp(targetRect.top + targetRect.height / 2 - 120, pad, vh - 280);
    }
    // Try RIGHT of target
    else if (targetRect.right + tooltipW + pad < vw) {
      left = targetRect.right + pad;
      top = clamp(targetRect.top + targetRect.height / 2 - 120, pad, vh - 280);
    }
    // Fallback BELOW
    else {
      top = clamp(targetRect.bottom + pad, pad, vh - 280);
      left = clamp(targetRect.left + targetRect.width / 2 - tooltipW / 2, pad, vw - tooltipW - pad);
    }

    return { position: "fixed" as const, top, left, width: tooltipW, transform: "none" };
  }, [targetRect, ready]);

  const spotlightStyle = useMemo(() => {
    if (!targetRect || !ready) return null;
    const p = window.innerWidth < 768 ? 8 : 12;
    return { top: targetRect.top - p, left: targetRect.left - p, width: targetRect.width + p * 2, height: targetRect.height + p * 2 };
  }, [targetRect, ready]);

  if (!isOpen || !step) return null;
  const isLastStep = stepIndex === total - 1;

  return (
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-label={t("tour.aria_label")}>
      {/* Overlay - click to close */}
      <div className="absolute inset-0 bg-black/60" onClick={closeTour} />

      {/* Spotlight */}
      {spotlightStyle && (
        <>
          <div
            className="absolute rounded-2xl animate-pulse"
            style={{ ...spotlightStyle, top: spotlightStyle.top - 4, left: spotlightStyle.left - 4, width: spotlightStyle.width + 8, height: spotlightStyle.height + 8, border: "2px solid rgba(244,121,32,0.4)", pointerEvents: "none" }}
          />
          <div
            className="absolute rounded-xl transition-all duration-500 ease-out"
            style={{ ...spotlightStyle, boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)", border: "2px solid rgba(244,121,32,0.8)", pointerEvents: "none", zIndex: 1 }}
          />
        </>
      )}

      {/* Tooltip */}
      {celebrating && (
        <div className="pointer-events-none fixed inset-0 z-[4] flex items-center justify-center bg-black/35">
          <div className="relative rounded-[28px] bg-white px-8 py-7 text-center shadow-2xl dark:bg-gray-900">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Let's start</div>
            <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">Bienvenue sur BelivaY</div>
          </div>
          {Array.from({ length: 34 }).map((_, index) => (
            <span
              key={index}
              className="absolute h-2.5 w-2.5 rounded-sm"
              style={{
                left: `${8 + ((index * 23) % 84)}%`,
                top: `${-8 - (index % 6) * 7}%`,
                background: ["#f47920", "#10b981", "#3b82f6", "#facc15", "#ef4444"][index % 5],
                animation: `tour-confetti ${1.2 + (index % 5) * 0.16}s ease-out ${index * 0.015}s forwards`,
                transform: `rotate(${index * 19}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div
        className="z-10 rounded-3xl bg-white shadow-2xl dark:bg-gray-900 border border-orange-100 dark:border-gray-700 transition-all duration-300"
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-1 rounded-t-3xl bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-orange-400 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
                <Compass size={13} />
                {t("tour.step_of", { current: stepIndex + 1, total })}
              </div>
              <h2 className="mt-3 text-xl font-bold text-gray-900 dark:text-white">{step.title}</h2>
              {step.routeLabel && <p className="mt-1 text-xs font-medium text-gray-400">{step.routeLabel}</p>}
            </div>
            {isLastStep ? (
              <button onClick={finishTour} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark">
                Continuer
              </button>
            ) : (
              <button onClick={closeTour} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800" aria-label={t("common.close")}>
                <X size={18} />
              </button>
            )}
          </div>

          {/* Content */}
          <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{step.description}</p>

          {step.helper && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-orange-50 px-3 py-2.5 text-xs text-primary dark:bg-primary/10">
              <Sparkles size={14} className="mt-0.5 shrink-0" />
              <span>{step.helper}</span>
            </div>
          )}

          {/* Step dots */}
          <div className="mt-4 flex items-center gap-1.5">
            {CLIENT_TUTORIAL_STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? "w-6 bg-primary" : i < stepIndex ? "w-1.5 bg-primary/40" : "w-1.5 bg-gray-200 dark:bg-gray-700"}`} />
            ))}
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center justify-between gap-3">
            <button onClick={closeTour} className="text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              {t("tour.skip")}
            </button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button onClick={() => setStepIndex(s => Math.max(0, s - 1))} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  <ArrowLeft size={16} /> {t("tour.previous")}
                </button>
              )}
              <button
                onClick={() => isLastStep ? finishTour() : setStepIndex(s => s + 1)}
                className="inline-flex items-center gap-1 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary-dark"
              >
                {isLastStep ? (<><Check size={16} /> Continuer</>) : (<>{t("tour.next")} <ArrowRight size={16} /></>)}
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes tour-confetti {
          0% { opacity: 0; transform: translate3d(0,-20px,0) rotate(0deg); }
          15% { opacity: 1; }
          100% { opacity: 0; transform: translate3d(${Math.random() > 0.5 ? 28 : -28}px,110vh,0) rotate(680deg); }
        }
      `}</style>
    </div>
  );
}
