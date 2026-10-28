import { useState } from "react";
import { Panel } from "./RelayUi";

/**
 * Colis a payer au comptoir — feuille de route D14, spec v2.1 R42.4 et R42.5.
 *
 * Le client a paye une avance a la commande ; le reste se paie ici, par
 * Mobile Money, jamais en especes. Son code de retrait ne lui parvient
 * qu'apres ce paiement : ces colis ne passent donc pas par la saisie du code.
 * Le montant vient du serveur, l'ecran ne le recalcule pas.
 */
export interface ComptoirParcel {
  id: number;
  ref: string;
  slot: string;
  amountXaf: number;
  customerPhone: string;
}

const OPERATEURS = [
  { code: "MTN", label: "MTN MoMo" },
  { code: "ORANGE", label: "Orange Money" },
];

interface Props {
  parcels: ComptoirParcel[];
  busy: boolean;
  onCollect: (parcelId: number, phone: string, operator: string) => Promise<boolean>;
  onRefuse: (parcelId: number) => Promise<boolean>;
}

export default function RelayComptoir({ parcels, busy, onCollect, onRefuse }: Props) {
  const [phones, setPhones] = useState<Record<number, string>>({});
  const [operators, setOperators] = useState<Record<number, string>>({});
  if (parcels.length === 0) return null;

  return (
    <Panel kicker="Paiement au comptoir" title="Colis à payer avant la remise">
      <ul className="space-y-3">
        {parcels.map((parcel) => {
          const phone = phones[parcel.id] ?? parcel.customerPhone;
          const operator = operators[parcel.id] ?? OPERATEURS[0].code;
          return (
            <li key={parcel.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">
                  {parcel.ref} · casier {parcel.slot}
                </span>
                <span className="text-lg font-bold">{parcel.amountXaf.toLocaleString("fr-FR")} F</span>
              </div>
              <p className="mt-1 text-sm opacity-80">
                Mobile Money uniquement. Le code de retrait part au client dès que le paiement est confirmé.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  className="min-w-0 flex-1 rounded-xl border px-3 py-2"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhones({ ...phones, [parcel.id]: e.target.value })}
                  aria-label="Numéro Mobile Money du client"
                />
                <select
                  className="rounded-xl border px-3 py-2"
                  value={operator}
                  onChange={(e) => setOperators({ ...operators, [parcel.id]: e.target.value })}
                  aria-label="Opérateur"
                >
                  {OPERATEURS.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !phone.trim()}
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
                  onClick={() => onCollect(parcel.id, phone, operator)}
                >
                  Encaisser {parcel.amountXaf.toLocaleString("fr-FR")} F
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-xl border border-red-300 px-4 py-2 font-semibold text-red-700 disabled:opacity-50"
                  onClick={() => {
                    if (window.confirm("Le client refuse de payer : le colis repartira au vendeur. Confirmer ?")) {
                      void onRefuse(parcel.id);
                    }
                  }}
                >
                  Le client refuse
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
