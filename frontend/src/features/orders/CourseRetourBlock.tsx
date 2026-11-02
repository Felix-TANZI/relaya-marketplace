// frontend/src/features/orders/CourseRetourBlock.tsx
// Course de retour — spec v2.1, R69.1 : quand l'inspection ne valide pas le problème signalé, la course de retour
// (r_retour) est à la charge du client ; il la paie ici par Mobile Money, frais compris (R02.6). Le montant vient du
// serveur ; rien n'est calculé dans le navigateur.

import { useState } from "react";
import { http } from "@/services/api/http";
import type { OrderReturn } from "@/services/api/customer";

export default function CourseRetourBlock({ ret, orderId, phone }: { ret: OrderReturn; orderId: number; phone: string }) {
  const [message, setMessage] = useState("");
  const [enCours, setEnCours] = useState(false);
  if (!ret.course_retour_due_xaf) return null;

  const payer = async () => {
    setEnCours(true);
    try {
      const r = await http<{ message: string }>(`/api/orders/${orderId}/returns/${ret.id}/course-retour/payer/`, {
        method: "POST",
        body: JSON.stringify({ payer_msisdn: phone }),
      });
      setMessage(r.message || "Validez le paiement sur votre téléphone.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Paiement impossible pour le moment.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/40">
      <p className="text-gray-700 dark:text-gray-200">
        Le problème signalé n'a pas été validé à l'inspection : la course de retour reste à votre charge
        ({ret.course_retour_due_xaf.toLocaleString("fr-FR")} F, frais Mobile Money compris).
      </p>
      <button type="button" disabled={enCours} onClick={() => void payer()}
        className="mt-2 rounded-full bg-primary px-4 py-1.5 font-bold text-white disabled:opacity-50">
        Payer {ret.course_retour_due_xaf.toLocaleString("fr-FR")} F par Mobile Money
      </button>
      {message && <p className="mt-2 font-semibold">{message}</p>}
    </div>
  );
}
