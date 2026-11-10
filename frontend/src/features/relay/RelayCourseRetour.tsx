// frontend/src/features/relay/RelayCourseRetour.tsx
// R69.1, décision du porteur (revue du 29/10, C4) : la course de retour due par un client en tort se paie avant sa
// prochaine commande, dans l'application ou ici, au comptoir, par Mobile Money sur son téléphone — jamais en espèces
// (R01). Le gérant saisit le numéro du client ; le serveur dit seulement s'il y a une somme due et l'encaisse.

import { useState } from "react";
import i18n from "@/i18n";
import { http } from "@/services/api/http";

export default function RelayCourseRetour({ onError }: { onError: (error: unknown) => void }) {
  const [numero, setNumero] = useState("");
  const [operateur, setOperateur] = useState("MTN");
  const [message, setMessage] = useState("");
  const [enCours, setEnCours] = useState(false);

  const encaisser = async () => {
    setEnCours(true);
    setMessage("");
    try {
      const r = await http<{ message: string; montant_xaf: number }>("/api/shipping/relay-point/comptoir/course-retour/", {
        method: "POST",
        body: JSON.stringify({ payer_msisdn: numero.replace(/\s/g, ""), payer_operator: operateur }),
      });
      setMessage(`${r.montant_xaf.toLocaleString("fr-FR")} F : ${r.message || "le client valide sur son téléphone."}`);
    } catch (error) {
      onError(error);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <details className="mt-4 rounded-[14px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <summary className="cursor-pointer text-[14px] font-black text-slate-800 dark:text-white">
        Encaisser une course de retour (Mobile Money)
      </summary>
      <p className="mt-2 text-[13px] text-slate-500">
        Un client dont le retour n'a pas été validé doit la course de retour avant sa prochaine commande. Jamais en
        espèces : la demande de paiement part sur son téléphone.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input className="rounded-lg border px-3 py-2" inputMode="tel" placeholder={i18n.t("rl3.numero_du_client")} value={numero}
          onChange={(e) => setNumero(e.target.value)} />
        <select className="rounded-lg border px-3 py-2" value={operateur} onChange={(e) => setOperateur(e.target.value)}>
          <option value="MTN">MTN MoMo</option>
          <option value="ORANGE">Orange Money</option>
        </select>
        <button type="button" disabled={enCours || numero.replace(/\D/g, "").length < 9}
          onClick={() => void encaisser()}
          className="rounded-full bg-[#2456D6] px-4 py-2 text-[14px] font-black text-white disabled:opacity-40">
          Encaisser
        </button>
      </div>
      {message && <p className="mt-2 text-[13px] font-semibold text-emerald-700">{message}</p>}
    </details>
  );
}
