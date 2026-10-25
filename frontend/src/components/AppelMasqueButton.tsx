// frontend/src/components/AppelMasqueButton.tsx
// Appel client-livreur avec numéro masqué — feuille de route D33.
// Le bouton ne compose aucun numéro : il demande au serveur de nous appeler, puis de nous relier à l'autre personne
// (POST /api/shipping/shipments/<id>/appel/). Chaque appel est journalisé (preuve du livreur, R51.1).

import { useState } from "react";
import { PhoneCall } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { http } from "@/services/api/http";

interface Props {
  shipmentId: number;
  libelle: string;
  className?: string;
}

export default function AppelMasqueButton({ shipmentId, libelle, className = "" }: Props) {
  const { showToast } = useToast();
  const [enCours, setEnCours] = useState(false);

  const appeler = async () => {
    setEnCours(true);
    try {
      const r = await http<{ ok: boolean; message: string }>(`/api/shipping/shipments/${shipmentId}/appel/`, {
        method: "POST",
      });
      showToast(r.message || "BelivaY vous appelle : décrochez pour être mis en relation.", r.ok ? "success" : "error");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Appel impossible pour le moment.", "error");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() => void appeler()}
      className={`inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary disabled:opacity-50 ${className}`}
    >
      <PhoneCall size={16} />
      {enCours ? "Mise en relation…" : libelle}
    </button>
  );
}
