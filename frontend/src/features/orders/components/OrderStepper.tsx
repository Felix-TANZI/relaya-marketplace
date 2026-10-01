// frontend/src/features/orders/components/OrderStepper.tsx
//
// Remplace l'ancien gabarit unique (carte GPS générique affichée pour les 5
// états de commande) par deux éléments dédiés et réutilisables :
//
//  1. Un plan schématique STATIQUE (uniquement pour le retrait en relais) —
//     jamais une carte interactive avec position live du livreur. La spec
//     logistique CMC-49 est explicite : « plan indicatif, jamais position
//     livreur en direct ». On ne branche donc aucune donnée GPS ici.
//  2. Un stepper horizontal à 4 étapes, dont l'étape courante est déduite du
//     vrai statut de la commande (`fulfillment_status`), jamais d'un texte
//     en dur par écran.
//
// Les libellés changent selon le mode de livraison :
//   - Retrait en relais : Boutique → Emballé, scellé → Au relais → Retiré
//   - Livraison à domicile : Boutique → Emballé, scellé → En route → Livré

import type { FulfillmentStatus, DeliveryMethod } from "@/types/order";
import { Store, PackageCheck, Warehouse, Hand, Truck, CheckCircle2, Home } from "lucide-react";

// ── Mapping statut réel → étape (0 à 3) ────────────────────────────────────
// CANCELLED / REFUNDED n'appartiennent à aucune des 4 étapes de progression
// (la commande est sortie du cycle normal) : on renvoie -1 pour que l'appelant
// affiche un état neutre plutôt qu'une étape inventée.
const STEP_BUCKETS: Partial<Record<FulfillmentStatus, number>> = {
  CREATED: 0,
  PENDING: 0,
  PAID_IN_ESCROW: 0,
  VENDOR_ACKNOWLEDGED: 0,
  PREPARING: 1,
  PROCESSING: 1,
  READY_FOR_PICKUP: 2,
  DRIVER_ASSIGNED: 2,
  PICKED_UP: 2,
  OUT_FOR_DELIVERY: 2,
  SHIPPED: 2,
  DELIVERED: 3,
  BUYER_CONFIRMED: 3,
  AUTO_CONFIRMED: 3,
  RELEASED_TO_VENDOR: 3,
  DISPUTED: 3,
};

export function getOrderStepIndex(status: FulfillmentStatus): number {
  if (status === "CANCELLED" || status === "REFUNDED") return -1;
  return STEP_BUCKETS[status] ?? 0;
}

interface OrderStepperProps {
  deliveryMode?: DeliveryMethod;
  fulfillmentStatus: FulfillmentStatus;
  /** Nom réel du point relais, si connu — jamais inventé. */
  relayPointName?: string | null;
}

export function OrderStepper({ deliveryMode, fulfillmentStatus, relayPointName }: OrderStepperProps) {
  const isPickup = deliveryMode === "PICKUP";
  const stepIndex = getOrderStepIndex(fulfillmentStatus);
  const cancelled = stepIndex === -1;

  const steps = isPickup
    ? [
        { label: "Boutique", Icon: Store },
        { label: "Emballé, scellé", Icon: PackageCheck },
        { label: "Au relais", Icon: Warehouse },
        { label: "Retiré", Icon: Hand },
      ]
    : [
        { label: "Boutique", Icon: Store },
        { label: "Emballé, scellé", Icon: PackageCheck },
        { label: "En route", Icon: Truck },
        { label: "Livré", Icon: CheckCircle2 },
      ];

  return (
    <div className="mb-6 overflow-hidden rounded-[1.75rem] bg-white ring-1 ring-orange-100 dark:bg-gray-900 dark:ring-gray-800">
      {isPickup && (
        <div className="relative flex h-32 flex-col justify-between bg-gradient-to-br from-[#fff6ee] via-white to-[#f7f7f7] p-5 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm dark:bg-gray-800/90 dark:text-gray-200">
              <Home size={14} className="text-primary" /> Maison
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm dark:bg-gray-800/90 dark:text-gray-200">
              <Warehouse size={14} className="text-primary" />
              {relayPointName ? relayPointName : "Relais"}
            </span>
          </div>
          <div
            aria-hidden
            className="absolute left-10 right-10 top-1/2 border-t-2 border-dashed border-primary/30"
          />
          <p className="relative text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Plan indicatif
          </p>
        </div>
      )}

      <div className={`grid grid-cols-4 gap-2 ${isPickup ? "border-t border-orange-100 dark:border-gray-800" : ""} p-5`}>
        {steps.map((step, index) => {
          const state = cancelled ? "pending" : index < stepIndex ? "done" : index === stepIndex ? "current" : "pending";
          const Icon = step.Icon;
          return (
            <div key={step.label} className="flex flex-col items-center gap-2 text-center">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full ${
                  state === "done"
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : state === "current"
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600"
                }`}
              >
                {state === "done" ? <CheckCircle2 size={20} /> : <Icon size={18} />}
              </div>
              <span
                className={`text-[11px] font-bold leading-tight ${
                  state === "pending" ? "text-gray-400 dark:text-gray-600" : "text-gray-800 dark:text-gray-200"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {cancelled && (
        <p className="border-t border-gray-100 bg-gray-50 px-5 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-gray-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-500">
          Commande {fulfillmentStatus === "CANCELLED" ? "annulée" : "remboursée"}
        </p>
      )}
    </div>
  );
}
