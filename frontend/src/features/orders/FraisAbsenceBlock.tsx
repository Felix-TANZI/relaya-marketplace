// frontend/src/features/orders/FraisAbsenceBlock.tsx
// Frais d'absence — spec v2.1, R51.3 à R51.5 : le client absent à la livraison retrouve son colis au relais de sa
// zone ; il paie les frais d'absence (Mobile Money, frais compris) avant le retrait, ici ou au comptoir. Le code de
// retrait lui parvient dès le paiement confirmé.

import { useState } from "react";
import { http } from "@/services/api/http";
import type { Order } from "@/types/order";

export default function FraisAbsenceBlock({ order }: { order: Order }) {
  const [message, setMessage] = useState("");
  const [enCours, setEnCours] = useState(false);
  if (!order.frais_absence_xaf || order.frais_absence_paye_le) return null;
  const total = order.frais_absence_xaf + (order.frais_momo_absence_xaf || 0);

  const payer = async () => {
    setEnCours(true);
    try {
      const r = await http<{ message: string }>(`/api/orders/${order.id}/frais-absence/payer/`, {
        method: "POST",
        body: JSON.stringify({ payer_msisdn: order.customer_phone }),
      });
      setMessage(r.message || "Validez le paiement sur votre téléphone.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Paiement impossible pour le moment.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <section className="pf-card pf-anim" style={{ borderColor: "#f59e0b" }}>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Frais d'absence à payer avant le retrait</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Vous étiez absent à la livraison : votre colis vous attend au relais {order.relay_point_name || ""}. Frais
        d'absence : {order.frais_absence_xaf.toLocaleString("fr-FR")} F (+ {(order.frais_momo_absence_xaf || 0).toLocaleString("fr-FR")} F de
        frais Mobile Money). Vous pouvez aussi les payer au comptoir.
      </p>
      <button type="button" disabled={enCours} onClick={() => void payer()}
        className="mt-3 rounded-full bg-primary px-5 py-2 font-bold text-white disabled:opacity-50">
        Payer {total.toLocaleString("fr-FR")} F par Mobile Money
      </button>
      {message && <p className="mt-2 text-sm font-semibold">{message}</p>}
    </section>
  );
}
