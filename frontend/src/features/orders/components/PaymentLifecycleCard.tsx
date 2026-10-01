// frontend/src/features/orders/components/PaymentLifecycleCard.tsx
//
// "Cycle de vie du paiement" — libellés corrigés pour l'écran de détail
// commande (point 7 de l'audit) :
//   - "Paiement initié" (qui n'apparaît dans aucune maquette) → début de
//     chronologie à "Commande payée".
//   - "Fonds sous séquestre" → "Argent bloqué chez BelivaY".
//   - "Libération au vendeur" → "Vendeur payé".
// Pour l'état "en litige" spécifiquement (point 5), les libellés ne doivent
// jamais présupposer une issue favorable au vendeur :
//   "Argent bloqué pendant le litige" / "Décision" au lieu des libellés
//   génériques ci-dessus.
//
// NB : ce composant est volontairement distinct de
// `features/payments/OrderPaymentPanel.tsx`, qui contient encore son propre
// bloc "Cycle de vie du paiement" avec les anciens libellés — cette page a
// reçu pour consigne de ne modifier que OrderDetailPage.tsx et les nouveaux
// composants de features/orders/components/, pas ce fichier partagé. Voir le
// rapport de fin de tâche pour le détail de cette limite.

import { CheckCircle2, Clock3, Circle, Lock, Scale } from "lucide-react";

type StepState = "done" | "current" | "pending";

interface LifecycleStep {
  key: string;
  title: string;
  desc: string;
  state: StepState;
}

function StepRow({ step, isLast }: { step: LifecycleStep; isLast: boolean }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
            step.state === "done"
              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              : step.state === "current"
                ? "bg-primary/15 text-primary"
                : "bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600"
          }`}
        >
          {step.state === "done" ? <CheckCircle2 size={16} /> : step.state === "current" ? <Clock3 size={15} /> : <Circle size={14} />}
        </div>
        {!isLast && <span className="mt-1 w-px flex-1 bg-gray-100 dark:bg-gray-800" style={{ minHeight: 18 }} />}
      </div>
      <div className="pb-4">
        <p className={`text-sm font-bold ${step.state === "pending" ? "text-gray-400 dark:text-gray-600" : "text-gray-900 dark:text-white"}`}>
          {step.title}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{step.desc}</p>
      </div>
    </div>
  );
}

interface PaymentLifecycleCardProps {
  /** "dispute" pour l'état en litige — libellés neutres, aucune issue présupposée. */
  variant: "default" | "dispute";
  isPaid: boolean;
  paidAmountLabel: string;
  paidDateLabel: string | null;
  isReleased: boolean;
  releasedDateLabel: string | null;
}

export function PaymentLifecycleCard({
  variant,
  isPaid,
  paidAmountLabel,
  paidDateLabel,
  isReleased,
  releasedDateLabel,
}: PaymentLifecycleCardProps) {
  const paidStep: LifecycleStep = {
    key: "paid",
    title: "Commande payée",
    desc: paidDateLabel ? `${paidAmountLabel} · ${paidDateLabel}` : isPaid ? paidAmountLabel : "En attente de paiement",
    state: isPaid ? "done" : "pending",
  };

  const steps: LifecycleStep[] =
    variant === "dispute"
      ? [
          paidStep,
          {
            key: "blocked",
            title: "Argent bloqué pendant le litige",
            desc: `${paidAmountLabel} · rien n'est versé au vendeur`,
            state: isPaid ? "current" : "pending",
          },
          {
            key: "decision",
            title: "Décision",
            desc: "Après examen du dossier par BelivaY",
            state: "pending",
          },
          {
            key: "outcome",
            title: "Remboursement ou paiement du vendeur",
            desc: "Selon la décision rendue",
            state: "pending",
          },
        ]
      : [
          paidStep,
          {
            key: "escrow",
            title: "Argent bloqué chez BelivaY",
            desc: "Jusqu'à ta confirmation de réception",
            state: isReleased ? "done" : isPaid ? "current" : "pending",
          },
          {
            key: "released",
            title: "Vendeur payé",
            desc: isReleased && releasedDateLabel ? releasedDateLabel : "Après ta confirmation ou la fin du délai de retour",
            state: isReleased ? "done" : "pending",
          },
        ];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-4 flex items-center gap-2">
        {variant === "dispute" ? (
          <Scale size={17} className="text-primary" />
        ) : (
          <Lock size={17} className="text-primary" />
        )}
        <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Cycle de vie du paiement</h3>
      </div>
      {steps.map((step, index) => (
        <StepRow key={step.key} step={step} isLast={index === steps.length - 1} />
      ))}
    </div>
  );
}
