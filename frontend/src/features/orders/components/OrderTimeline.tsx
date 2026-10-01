// frontend/src/features/orders/components/OrderTimeline.tsx
//
// "Chronologie" — liste d'événements réellement horodatés par l'API
// (transaction de paiement, ShipmentEvent, preuve de remise, ouverture de
// litige). Règle d'or reprise du fichier parent : aucune heure inventée.
// Quand une étape n'a pas de date réelle côté API (ex : l'emballage scellé
// chez le vendeur, qui n'est pas tracé avec horodatage exposé au client),
// l'entrée est affichée sans date plutôt qu'avec une date fabriquée.

import { CheckCircle2, Clock3, Circle } from "lucide-react";

export type TimelineEntryState = "done" | "current" | "pending";

export interface TimelineEntry {
  key: string;
  label: string;
  /** Date/heure déjà formatée à partir d'un horodatage réel, ou null si inconnu. */
  dateLabel: string | null;
  state: TimelineEntryState;
  /** Texte secondaire optionnel (ex: motif du litige, montant). */
  note?: string | null;
}

export function OrderTimeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-4">
        <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Chronologie</h3>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Chaque étape est datée et gardée.
        </p>
      </div>
      <div className="space-y-4">
        {entries.map((entry, index) => (
          <div key={entry.key} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                  entry.state === "done"
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : entry.state === "current"
                      ? "bg-primary/15 text-primary"
                      : "bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600"
                }`}
              >
                {entry.state === "done" ? (
                  <CheckCircle2 size={16} />
                ) : entry.state === "current" ? (
                  <Clock3 size={15} />
                ) : (
                  <Circle size={14} />
                )}
              </div>
              {index < entries.length - 1 && (
                <span className="mt-1 w-px flex-1 bg-gray-100 dark:bg-gray-800" style={{ minHeight: 18 }} />
              )}
            </div>
            <div className="pb-1">
              {entry.dateLabel ? (
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  {entry.dateLabel}
                </p>
              ) : entry.state === "pending" ? (
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">à venir</p>
              ) : null}
              <p
                className={`mt-0.5 text-sm font-bold ${
                  entry.state === "pending" ? "text-gray-400 dark:text-gray-600" : "text-gray-900 dark:text-white"
                }`}
              >
                {entry.label}
              </p>
              {entry.note && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{entry.note}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
