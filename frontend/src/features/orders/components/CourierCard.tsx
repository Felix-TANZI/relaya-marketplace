// frontend/src/features/orders/components/CourierCard.tsx
//
// Carte livreur nommée, pour l'état "confirmée, livraison à domicile"
// uniquement. Anonymat strict (CL-09) : prénom seul (jamais le nom complet,
// jamais le numéro de téléphone — l'audit CDA-04 avait trouvé cette fuite
// ailleurs dans l'app, elle n'est pas réintroduite ici). Avatar générique
// (icône), pas de photo réelle exposée par l'API.

import { UserRound, ShieldCheck } from "lucide-react";

export function CourierCard({ firstName }: { firstName: string | null }) {
  if (!firstName) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-gray-200 p-4 text-sm font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
          <UserRound size={20} />
        </div>
        En attente d'assignation d'un livreur.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#f4f1ec] p-4 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <UserRound size={24} />
        </div>
        <div>
          <p className="text-base font-extrabold text-gray-900 dark:text-white">
            {firstName} t'apporte ton colis
          </p>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Il te remet le colis en main propre.
          </p>
        </div>
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" />
        Son numéro n'est jamais affiché : si besoin, il t'appelle par un numéro masqué.
      </p>
    </div>
  );
}
