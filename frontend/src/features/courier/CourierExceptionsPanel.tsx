// frontend/src/features/courier/CourierExceptionsPanel.tsx
// Cas de livraison hors du chemin normal — spec v2.1 :
//   R51   client absent : 2 appels par « Appeler le client », 10 min d'attente, position et photo, puis le colis part au
//         relais de la zone du client (le serveur vérifie tout et choisit le relais) ;
//   R85.2 refus d'un colis conforme à la porte : jamais ouvert, il repart au vendeur ;
//   R85.3 déplacement inutile au ramassage (boutique fermée, produit non conforme) : facturé au vendeur.
// Ces actions touchent l'argent du client et du vendeur : elles ne se rejouent jamais hors ligne.

import { useState } from "react";
import { http } from "@/services/api/http";

interface Props {
  shipmentId: number;
  status: string;
  aDomicile: boolean;
  onDone: (message: string) => void;
}

const position = () =>
  new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Position indisponible sur cet appareil."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: Number(p.coords.latitude.toFixed(6)), longitude: Number(p.coords.longitude.toFixed(6)) }),
      () => reject(new Error("Autorisez la position pour déclarer l'absence (R51.1).")),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });

export default function CourierExceptionsPanel({ shipmentId, status, aDomicile, onDone }: Props) {
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const [motif, setMotif] = useState("");
  const [photoEnvoyee, setPhotoEnvoyee] = useState(false);

  const agir = async (corps: Record<string, unknown>, ok: string) => {
    setOccupe(true);
    setErreur("");
    try {
      await http(`/api/shipping/my-shipments/${shipmentId}/action/`, { method: "POST", body: JSON.stringify(corps) });
      onDone(ok);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action refusée.");
    } finally {
      setOccupe(false);
    }
  };

  const envoyerPhoto = async (fichier: File) => {
    setOccupe(true);
    setErreur("");
    try {
      const form = new FormData();
      form.append("stage", "CUSTOMER_ABSENT");
      form.append("file", fichier, fichier.name || "absence.jpg");
      await http(`/api/shipping/my-shipments/${shipmentId}/evidence/`, { method: "POST", body: form });
      setPhotoEnvoyee(true);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Photo non envoyée.");
    } finally {
      setOccupe(false);
    }
  };

  const declarerAbsence = async () => {
    try {
      const pos = await position();
      await agir({ action: "ABSENT", ...pos }, "Client absent : le colis part au relais de sa zone. Déposez-le avec le code de dépôt.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Position indisponible.");
    }
  };

  const enLivraison = aDomicile && ["OUT_FOR_DELIVERY", "IN_TRANSIT"].includes(status);
  const auRamassage = status === "ASSIGNED";
  if (!enLivraison && !auRamassage) return null;

  return (
    <div className="mt-4 rounded-[16px] border border-white/10 bg-white/5 p-4 text-[13px] text-white">
      {erreur && <p role="alert" className="mb-2 font-semibold text-red-300">{erreur}</p>}
      {enLivraison && (
        <>
          <p className="font-bold">Client absent (R51)</p>
          <p className="mt-1 text-white/70">Appelez 2 fois avec « Appeler le client », attendez 10 min, prenez la photo devant l'adresse.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-full border border-white/20 px-4 py-2 font-bold">
              {photoEnvoyee ? "Photo envoyée ✓" : "Photo devant l'adresse"}
              <input type="file" accept="image/*" capture="environment" className="hidden" disabled={occupe}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void envoyerPhoto(f); }} />
            </label>
            <button type="button" disabled={occupe || !photoEnvoyee} onClick={() => void declarerAbsence()}
              className="rounded-full bg-amber-500 px-4 py-2 font-bold text-black disabled:opacity-50">
              Déclarer le client absent
            </button>
          </div>
          <p className="mt-4 font-bold">Refus à la porte (R85.2)</p>
          <p className="mt-1 text-white/70">Le colis n'est jamais ouvert à la porte. S'il est refusé, il repart au vendeur.</p>
          <button type="button" disabled={occupe}
            onClick={() => { if (window.confirm("Le client refuse le colis : il repart au vendeur. Confirmer ?")) void agir({ action: "REFUS_PORTE", message: motif }, "Refus enregistré : le colis repart au vendeur."); }}
            className="mt-2 rounded-full border border-red-400/40 px-4 py-2 font-bold text-red-200 disabled:opacity-50">
            Le client refuse le colis
          </button>
        </>
      )}
      {auRamassage && (
        <>
          <p className="font-bold">Déplacement inutile (R85.3)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Boutique fermée, produit non conforme…"
              className="min-w-0 flex-1 rounded-full border border-white/20 bg-transparent px-4 py-2" />
            <button type="button" disabled={occupe || !motif.trim()}
              onClick={() => void agir({ action: "DEPLACEMENT_INUTILE", message: motif }, "Déplacement inutile enregistré.")}
              className="rounded-full border border-white/20 px-4 py-2 font-bold disabled:opacity-50">
              Déclarer
            </button>
          </div>
        </>
      )}
    </div>
  );
}
