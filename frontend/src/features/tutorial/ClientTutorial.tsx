import { useEffect, useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui";
import { CLIENT_TUTORIAL_STEPS } from "./tutorialSteps";

const STORAGE_KEY = "belivay-client-tutorial-seen";

export default function ClientTutorial() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = CLIENT_TUTORIAL_STEPS[stepIndex];

  useEffect(() => {
    const openTutorial = () => {
      setStepIndex(0);
      setIsOpen(true);
    };

    const hasSeenTutorial = localStorage.getItem(STORAGE_KEY) === "true";
    const timer = window.setTimeout(() => {
      if (!hasSeenTutorial) {
        openTutorial();
      }
    }, 700);

    window.addEventListener("belivay-open-tutorial", openTutorial as EventListener);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("belivay-open-tutorial", openTutorial as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !step) return;
    if (location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [isOpen, step, location.pathname, navigate]);

  useEffect(() => {
    if (!isOpen || !step || location.pathname !== step.route) {
      return;
    }

    let frameId = 0;

    const updateRect = () => {
      const element = document.querySelector(step.selector);
      if (!element) {
        setTargetRect(null);
        frameId = window.requestAnimationFrame(updateRect);
        return;
      }

      setTargetRect(element.getBoundingClientRect());
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isOpen, step, location.pathname]);

  const tooltipStyle = useMemo(() => {
    if (!targetRect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const maxWidth = 340;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const left = Math.min(
      Math.max(targetRect.left, 16),
      viewportWidth - maxWidth - 16,
    );

    const shouldPlaceAbove = targetRect.bottom + 220 > viewportHeight;
    const top = shouldPlaceAbove
      ? Math.max(16, targetRect.top - 220)
      : Math.min(viewportHeight - 180, targetRect.bottom + 16);

    return {
      top,
      left,
      transform: "none",
    };
  }, [targetRect]);

  const displayRect =
    isOpen && step && location.pathname === step.route ? targetRect : null;

  const finishTutorial = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
    setStepIndex(0);
    navigate("/");
  };

  if (!isOpen || !step) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/55" />

      {displayRect && (
        <div
          className="absolute rounded-[1.75rem] border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-all"
          style={{
            top: displayRect.top - 8,
            left: displayRect.left - 8,
            width: displayRect.width + 16,
            height: displayRect.height + 16,
          }}
        />
      )}

      <div
        className="pointer-events-auto absolute w-[min(340px,calc(100vw-2rem))] rounded-[2rem] border border-orange-100 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        style={tooltipStyle}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <Sparkles size={14} />
              {t('tutorial.label')}
            </p>
            <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
              {step.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={finishTutorial}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
          {step.description}
        </p>

        {!displayRect && (
          <p className="mt-3 text-xs text-gray-400">
            {t('tutorial.loading_step')}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-gray-400">
            {t('tutorial.step', { current: stepIndex + 1, total: CLIENT_TUTORIAL_STEPS.length })}
          </span>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStepIndex((previous) => Math.max(0, previous - 1))}
              disabled={stepIndex === 0}
            >
              <ChevronLeft size={16} />
              {t('tutorial.previous')}
            </Button>

            {stepIndex === CLIENT_TUTORIAL_STEPS.length - 1 ? (
              <Button variant="gradient" size="sm" onClick={finishTutorial}>
                {t('tutorial.finish')}
              </Button>
            ) : (
              <Button
                variant="gradient"
                size="sm"
                onClick={() =>
                  setStepIndex((previous) =>
                    Math.min(CLIENT_TUTORIAL_STEPS.length - 1, previous + 1),
                  )
                }
              >
                {t('tutorial.next')}
                <ChevronRight size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
