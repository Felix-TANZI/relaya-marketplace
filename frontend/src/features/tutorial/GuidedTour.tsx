import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Compass,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui";
import {
  CLIENT_TOUR_STORAGE_KEY,
  CLIENT_TUTORIAL_STEPS,
  type TutorialStep,
} from "./tutorialSteps";

const ONBOARDING_ENDPOINT = "/api/user/onboarding/";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getFocusableSelector(step: TutorialStep) {
  return step.selector ?? null;
}

function getVisibleTarget(selector: string) {
  const elements = Array.from(
    document.querySelectorAll(selector),
  ) as HTMLElement[];

  return (
    elements.find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }) ?? null
  );
}

export default function GuidedTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isTargetReady, setIsTargetReady] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const rafRef = useRef<number | null>(null);
  const step = CLIENT_TUTORIAL_STEPS[stepIndex];
  const totalSteps = CLIENT_TUTORIAL_STEPS.length;

  const openTour = (startIndex = 0) => {
    setStepIndex(startIndex);
    setIsOpen(true);
  };

  const closeTour = () => {
    setIsOpen(false);
    setStepIndex(0);
    setTargetRect(null);
    setIsTargetReady(false);
  };

  const persistCompletion = async () => {
    localStorage.setItem(CLIENT_TOUR_STORAGE_KEY, "true");
    try {
      await fetch(ONBOARDING_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: true }),
      });
    } catch {
      // Optional sync. A local success is enough for the guided tour.
    }
  };

  const finishTour = async () => {
    setIsCompleting(true);
    await persistCompletion();
    setIsCompleting(false);
    closeTour();
  };

  useEffect(() => {
    const handleOpenTour = () => openTour(0);
    const shouldAutoStart =
      typeof window !== "undefined" &&
      localStorage.getItem(CLIENT_TOUR_STORAGE_KEY) !== "true";

    const timer = window.setTimeout(() => {
      if (shouldAutoStart) {
        openTour(0);
      }
    }, 550);

    window.addEventListener("belivay-open-tutorial", handleOpenTour as EventListener);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(
        "belivay-open-tutorial",
        handleOpenTour as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !step?.route || location.pathname === step.route) {
      return;
    }
    navigate(step.route);
  }, [isOpen, step, location.pathname, navigate]);

  useLayoutEffect(() => {
    if (!isOpen || !step) {
      return;
    }

    const selector = getFocusableSelector(step);
    if (!selector) {
      setTargetRect(null);
      setIsTargetReady(true);
      return;
    }

    let attempts = 0;

    const syncTarget = () => {
      const target = getVisibleTarget(selector);

      if (!target) {
        attempts += 1;
        setIsTargetReady(false);
        if (attempts < 120) {
          rafRef.current = window.requestAnimationFrame(syncTarget);
        }
        return;
      }

      target.scrollIntoView({
        behavior: "smooth",
        block: step.scrollBlock ?? "center",
        inline: "center",
      });

      const rect = target.getBoundingClientRect();
      setTargetRect(rect);
      setIsTargetReady(rect.width > 0 && rect.height > 0);
    };

    const onViewportChange = () => {
      if (!selector) return;
      const target = getVisibleTarget(selector);
      if (!target) return;
      setTargetRect(target.getBoundingClientRect());
    };

    syncTarget();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [isOpen, step, location.pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void finishTour();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (stepIndex === totalSteps - 1) {
          void finishTour();
        } else {
          setStepIndex((current) => current + 1);
        }
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setStepIndex((current) => Math.max(0, current - 1));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, stepIndex, totalSteps]);

  const tooltipStyle = useMemo(() => {
    const maxWidth = Math.min(420, window.innerWidth - 24);

    if (!targetRect || !isTargetReady) {
      return {
        top: "50%",
        left: "50%",
        width: maxWidth,
        transform: "translate(-50%, -50%)",
      };
    }

    const spaceBelow = window.innerHeight - targetRect.bottom;
    const placeAbove = spaceBelow < 300 && targetRect.top > 320;
    const top = placeAbove
      ? clamp(targetRect.top - 236, 16, window.innerHeight - 220)
      : clamp(targetRect.bottom + 24, 16, window.innerHeight - 220);
    const left = clamp(
      targetRect.left + targetRect.width / 2 - maxWidth / 2,
      12,
      window.innerWidth - maxWidth - 12,
    );

    return {
      top,
      left,
      width: maxWidth,
      transform: "none",
    };
  }, [targetRect, isTargetReady]);

  const spotlightStyle = useMemo(() => {
    if (!targetRect || !isTargetReady) {
      return null;
    }

    const padding = window.innerWidth < 768 ? 8 : 12;
    return {
      top: targetRect.top - padding,
      left: targetRect.left - padding,
      width: targetRect.width + padding * 2,
      height: targetRect.height + padding * 2,
    };
  }, [targetRect, isTargetReady]);

  if (!isOpen || !step) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90]" aria-live="polite">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]" />

      {spotlightStyle && (
        <div
          className="pointer-events-none absolute rounded-[28px] border border-white/70 bg-transparent shadow-[0_0_0_9999px_rgba(2,6,23,0.72)] transition-all duration-300"
          style={spotlightStyle}
        >
          <div className="absolute inset-0 rounded-[28px] ring-8 ring-primary/15" />
          <div className="absolute inset-0 animate-pulse rounded-[28px] border border-primary/60" />
        </div>
      )}

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-tour-title"
        className="absolute rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-[0_28px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl transition-all duration-300 dark:border-slate-700 dark:bg-slate-900/95"
        style={tooltipStyle}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              <Compass size={13} />
              Visite guidée
            </div>
            <h2
              id="guided-tour-title"
              className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white"
            >
              {step.title}
            </h2>
            {step.routeLabel ? (
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                {step.routeLabel}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => void finishTour()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-slate-700 dark:text-slate-300"
            aria-label="Fermer la visite guidée"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
          {step.description}
        </p>

        {step.helper ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-slate-100/80 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>{step.helper}</span>
          </div>
        ) : null}

        {!isTargetReady && step.selector ? (
          <p className="mt-4 text-xs font-medium text-slate-400">
            Repérage de la zone en cours...
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 h-1.5 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400 transition-all duration-300"
                style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Étape {stepIndex + 1} sur {totalSteps}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full px-4"
              onClick={() => void finishTour()}
            >
              Ignorer
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full px-4"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            >
              <ArrowLeft size={15} />
              Précédent
            </Button>

            {stepIndex === totalSteps - 1 ? (
              <Button
                type="button"
                variant="gradient"
                size="sm"
                className="rounded-full px-5"
                isLoading={isCompleting}
                onClick={() => void finishTour()}
              >
                <Check size={15} />
                Terminer
              </Button>
            ) : (
              <Button
                type="button"
                variant="gradient"
                size="sm"
                className="rounded-full px-5"
                onClick={() => setStepIndex((current) => current + 1)}
              >
                Suivant
                <ArrowRight size={15} />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <Bot size={13} />
          <span>
            Astuce: tu peux utiliser les flèches du clavier pour avancer ou reculer.
          </span>
        </div>
      </section>
    </div>
  );
}
