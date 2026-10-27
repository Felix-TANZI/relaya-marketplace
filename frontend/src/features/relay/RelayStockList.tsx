/**
 * La liste des colis en stock, filtrée par ce qui presse.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUATRE ONGLETS, PAS UN TRI
 *
 * Le plan des étagères dit OÙ. Cette liste dit DANS QUEL ORDRE. Les quatre
 * onglets ne sont pas des filtres de confort : ce sont les quatre décisions
 * différentes qu'un gérant prend dans sa journée.
 *
 *   Urgents  → ça part aujourd'hui, ou ça repart au vendeur
 *   Payants  → le client paiera à la remise, prévenez-le
 *   Groupage → n'y touchez pas, ils partent ensemble
 *   Gratuits → rien à faire, c'est la réserve tranquille
 *
 * « Urgents » ouvre par défaut parce que c'est le seul onglet dont
 * l'inaction coûte quelque chose.
 */
import { useMemo, useState } from "react";
import {
  CELL_STYLE,
  STATE_LABEL,
  ZONE_SHORT,
  groupedPickupCodes,
  stateOf,
  zoneOf,
  type CellState,
  type ShelfParcel,
} from "./relayShelf";

const nf = (value: number) => value.toLocaleString("fr-FR");

/** Les quatre familles, et les états qu'elles rassemblent. */
const TABS: Array<{ key: string; label: string; states: CellState[] }> = [
  { key: "urgent", label: "Urgents", states: ["return", "lastDay"] },
  { key: "paid", label: "Payants", states: ["paid"] },
  { key: "grouped", label: "Groupage", states: ["grouped"] },
  { key: "free", label: "Gratuits", states: ["free"] },
];

/** « 1er jour », « 8e jour » — l'âge du colis sous le toit du gérant. */
function dayLabel(receivedAt: string | null): string {
  if (!receivedAt) return "";
  const recu = new Date(receivedAt);
  if (Number.isNaN(recu.getTime())) return "";
  recu.setHours(0, 0, 0, 0);
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const jours = Math.floor((aujourdhui.getTime() - recu.getTime()) / 86_400_000) + 1;
  if (jours < 1) return "";
  return jours === 1 ? "1er jour" : `${jours}e jour`;
}

export default function RelayStockList({
  parcels,
  onOpenParcel,
}: {
  parcels: ShelfParcel[];
  onOpenParcel?: (parcel: ShelfParcel) => void;
}) {
  const [active, setActive] = useState(TABS[0].key);

  const groupedCodes = useMemo(() => groupedPickupCodes(parcels), [parcels]);

  /**
   * Un colis n'appartient qu'à un seul onglet : son état est déjà arbitré par
   * `stateOf`, qui tranche du plus contraignant au plus anodin. Compter deux
   * fois le même colis ferait mentir les totaux affichés sur les onglets.
   */
  const parBonglet = useMemo(() => {
    const groupes: Record<string, ShelfParcel[]> = Object.fromEntries(TABS.map((tab) => [tab.key, []]));
    parcels.forEach((parcel) => {
      const state = stateOf(parcel, groupedCodes);
      const tab = TABS.find((candidate) => candidate.states.includes(state));
      if (tab) groupes[tab.key].push(parcel);
    });
    // Le plus vieux d'abord : c'est lui dont l'échéance tombe en premier.
    Object.values(groupes).forEach((liste) =>
      liste.sort((a, b) => (a.receivedAt || "").localeCompare(b.receivedAt || "")),
    );
    return groupes;
  }, [groupedCodes, parcels]);

  const visibles = parBonglet[active] ?? [];

  return (
    <div className="space-y-3">
      {/* Barre segmentee : l'onglet actif est une plaque blanche posee sur le
          fond de page, les autres n'ont pas de fond du tout. Un seul relief
          par barre — c'est ce qui rend la position lisible sans lire. */}
      <div role="tablist" aria-label="Colis en stock" className="grid grid-cols-4 gap-1.5">
        {TABS.map((tab) => {
          const on = tab.key === active;
          const count = (parBonglet[tab.key] ?? []).length;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(tab.key)}
              className={`rounded-[10px] px-2 py-2.5 text-[13.5px] font-bold leading-tight transition active:scale-[.96] ${
                on
                  ? "bg-white text-slate-900 shadow-[0_2px_8px_rgba(60,35,15,.10)] dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {tab.label} {count}
            </button>
          );
        })}
      </div>

      <section className="rounded-[14px] border border-slate-200 bg-white px-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        {visibles.length === 0 ? (
          <p className="py-6 text-center text-[13.5px] font-medium text-slate-400 dark:text-slate-500">
            Aucun colis dans cette catégorie.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibles.map((parcel) => {
              const state = stateOf(parcel, groupedCodes);
              const age = dayLabel(parcel.receivedAt);
              // Ce qui doit partir n'a pas de frais a annoncer : il a une
              // destination. Le reste a un montant, ou rien.
              const fin =
                state === "return"
                  ? "à remettre au livreur"
                  : parcel.gardeFeeXaf > 0
                    ? `${nf(parcel.gardeFeeXaf)} F`
                    : "sans frais";
              return (
                <li key={parcel.id}>
                  <button
                    type="button"
                    onClick={() => onOpenParcel?.(parcel)}
                    className="flex w-full items-center gap-3 py-3.5 text-left transition active:scale-[.99]"
                  >
                    {/* Le casier d'abord : c'est la premiere chose que le
                        gerant fait, aller le chercher. */}
                    <span className="flex h-[38px] w-[46px] flex-shrink-0 items-center justify-center rounded-[10px] bg-[#0E1B38] text-[12px] font-black text-[#E8A10E]">
                      {parcel.slot || "—"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                        {parcel.ref}
                      </span>
                      <span className="mt-1 block truncate text-[13px] font-medium text-slate-500 dark:text-slate-400">
                        {[ZONE_SHORT[zoneOf(parcel.size)], age, fin].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span
                      className={`flex-shrink-0 rounded-full border px-3 py-[5px] text-[12.5px] font-semibold ${CELL_STYLE[state]}`}
                    >
                      {STATE_LABEL[state]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
