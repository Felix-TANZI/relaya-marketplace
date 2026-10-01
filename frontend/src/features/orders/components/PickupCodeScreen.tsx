// frontend/src/features/orders/components/PickupCodeScreen.tsx
//
// Écran dédié "Code de retrait", ouvert explicitement depuis un bouton
// "Afficher mon code" sur l'écran de commande prête au retrait. C'est le
// geste explicite exigé par la règle de sécurité CL-09 : le code n'est
// jamais affiché par défaut, il faut l'ouvrir volontairement — et cet écran
// se ferme (démonte) dès qu'on quitte, donc rien ne reste affiché derrière.

import { X, Eye, EyeOff, Store } from "lucide-react";
import { useState } from "react";

interface PickupCodeScreenProps {
  orderLabel: string;
  code: string;
  relayPointName: string;
  qrDataUrl: string | null;
  /** Montant réellement dû au comptoir (frais de garde), si applicable. */
  amountDueXaf?: number | null;
  onClose: () => void;
}

export function PickupCodeScreen({
  orderLabel,
  code,
  relayPointName,
  qrDataUrl,
  amountDueXaf,
  onClose,
}: PickupCodeScreenProps) {
  // Même si l'écran est ouvert volontairement, on garde un cran de
  // confirmation supplémentaire avant d'afficher le code en clair — cohérent
  // avec le masquage par défaut déjà en place sur l'écran principal.
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="fixed inset-0 z-[1300] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="flex w-full max-w-lg flex-col rounded-t-[2rem] bg-white shadow-2xl dark:bg-gray-900 sm:max-h-[90vh] sm:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Code de retrait</h2>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{orderLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="rounded-[1.75rem] bg-gradient-to-br from-primary to-[#ff9d4d] p-6 text-center text-white">
            <p className="text-xs font-black uppercase tracking-[0.18em] opacity-90">
              {relayPointName ? `À montrer à ${relayPointName}` : "À montrer au point relais"}
            </p>

            {revealed ? (
              <>
                {qrDataUrl && (
                  <div className="mx-auto mt-5 inline-block rounded-2xl bg-white p-3">
                    <img src={qrDataUrl} alt="QR code de retrait" className="h-48 w-48" />
                  </div>
                )}
                <div className="mt-5 flex items-center justify-center gap-2">
                  {code.split("").map((digit, index) => (
                    <span
                      key={`${digit}-${index}`}
                      className="flex h-12 w-9 items-center justify-center rounded-xl bg-white/20 text-2xl font-black"
                    >
                      {digit}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setRevealed(false)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
                >
                  <EyeOff size={12} /> Masquer
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="mx-auto mt-5 flex items-center gap-2 rounded-2xl bg-white/20 px-5 py-4 text-sm font-bold"
              >
                <Eye size={18} /> Toucher pour afficher le code
              </button>
            )}
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <EyeOff size={13} className="shrink-0" />
            Masqué dès que tu quittes cet écran.
          </p>

          {typeof amountDueXaf === "number" && amountDueXaf > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                Montant dû au comptoir
              </p>
              <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
                {amountDueXaf.toLocaleString("fr-FR")} FCFA
              </p>
            </div>
          )}

          {relayPointName && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-primary dark:bg-primary/10">
                <Store size={18} />
              </div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{relayPointName}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
