/**
 * La grille de garde, affichée au gérant — celle de la spécification v2.1 (R36.1), lue dans les réglages de l'admin
 * (t_garde) : le montant affiché est celui que le serveur calcule (apps/shipping/garde.py), jamais une autre grille.
 *
 * C'est la question qu'un client pose au comptoir : « ça me coûte combien si je viens jeudi ? ». La garde se compte
 * par colis (R36.4), plafonnée à la valeur du colis (R36.2), payée en espèces au retrait (R36.3) ; après le dernier
 * jour, le colis repart au vendeur (R37.2).
 */

import { useEffect, useState } from "react";

import { http } from "@/services/api/http";

type Jour = { jour: number; montant: number };

export default function RelayGardeGrid() {
  const [jours, setJours] = useState<Jour[]>([]);

  useEffect(() => {
    http<{ lignes: Jour[] }>("/api/regles/tables/t_garde/")
      .then((r) => setJours([...r.lignes].sort((a, b) => a.jour - b.jour)))
      .catch(() => setJours([]));
  }, []);

  const total = jours.reduce((s, j) => s + j.montant, 0);
  const dernier = jours.length;

  return (
    <section
      className="overflow-hidden rounded-[18px] px-[18px] py-[18px] text-white shadow-[0_6px_18px_rgba(14,27,56,.28)]"
      style={{
        backgroundImage:
          "radial-gradient(80% 120% at 96% -4%, rgba(143,176,255,.30) 0%, rgba(143,176,255,0) 62%),"
          + " linear-gradient(140deg, #0A1230 0%, #101E48 48%, #17296010 100%), linear-gradient(0deg, #101C43, #101C43)",
      }}
    >
      <p className="text-[12.5px] font-black uppercase leading-none tracking-[0.09em] text-[#E8A10E]">
        La grille de garde · garde par colis
      </p>

      <div className="mt-3 grid gap-1 rounded-[12px] bg-white/[.07] p-3" style={{ gridTemplateColumns: `repeat(${Math.max(dernier, 1)}, minmax(0, 1fr))` }}>
        {jours.map(({ jour, montant }) => (
          <div key={jour} className="text-center">
            <div className="text-[11.5px] font-semibold leading-none text-white/55">J{jour}</div>
            <div className={`mt-2 text-[15px] font-black leading-none ${montant === 0 ? "text-[#5EF2B5]" : "text-white"}`}>{montant} F</div>
          </div>
        ))}
      </div>

      {dernier > 0 && (
        <div className="mt-2 rounded-[12px] bg-white/[.07] px-3 py-3 text-center">
          <div className="text-[11.5px] font-semibold leading-none text-white/55">J{dernier + 1}</div>
          <div className="mt-2 text-[15px] font-black leading-none text-[#E8A10E]">le colis repart au vendeur</div>
        </div>
      )}

      <p className="mt-4 text-[13px] font-medium leading-[1.55] text-white/80">
        {total > 0 && <>Sur {dernier} jours : <strong className="font-black text-white">{total} F</strong> par colis au plus, jamais plus que la valeur du colis. </>}
        La garde se paie en espèces, en une fois, au retrait : confirmez l&apos;encaissement avant de remettre le colis.
        Rappels envoyés au client aux jours 3 et 5.
      </p>
    </section>
  );
}
