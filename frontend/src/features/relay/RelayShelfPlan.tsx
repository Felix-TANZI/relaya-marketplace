/**
 * Le plan des étagères du point relais.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI UN PLAN, ET PAS UNE LISTE
 *
 * Une liste de vingt-deux références répond à « qu'est-ce que j'ai ? ».
 * Le gérant, lui, pose deux autres questions, et elles sont physiques :
 * OÙ est ce colis, et EST-CE QUE J'AI ENCORE DE LA PLACE ? Une liste ne
 * répond ni à l'une ni à l'autre sans un effort de traduction mentale que
 * personne ne fait à 17 h avec trois clients au comptoir.
 *
 * Le plan répond aux deux d'un regard : chaque case est un emplacement
 * réel, sa couleur dit son urgence, et les trous disent la place restante.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LES PLACES NE SONT PAS LES COLIS
 *
 * Un encombrant mange la place de cinq petits. Compter les colis pour
 * mesurer un local revient à dire qu'un réfrigérateur et une enveloppe
 * s'équivalent — c'est ce qui fait accepter une tournée qu'on ne peut pas
 * stocker. Le plan compte donc des PLACES, et la capacité déclarée par le
 * gérant s'entend en places.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * D'OÙ VIENT LA DISPOSITION
 *
 * Le serveur ne connaît pas les étagères : il stocke une capacité totale et
 * un code d'emplacement libre. La répartition en trois zones est donc
 * calculée ici, à partir de la seule capacité, selon un partage fixe —
 * 40 % de places aux petits, 35 % aux moyens, le reste aux encombrants.
 * Sur 40 places cela donne exactement la maquette : 16 cases A, 7 cases B,
 * 2 cases C.
 *
 * Tant que le serveur n'a pas de modèle d'étagères, c'est une convention
 * d'affichage, pas une vérité : elle doit rester ici, lisible et modifiable
 * en un endroit.
 */
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  CELL_STYLE,
  LEGEND,
  STATE_LABEL,
  ZONES,
  formatJour,
  groupedPickupCodes,
  nf,
  stateOf,
  zoneOf,
  type CellState,
  type ShelfParcel,
  type ZoneKey,
} from "./relayShelf";

export type { ShelfParcel } from "./relayShelf";

export default function RelayShelfPlan({
  parcels,
  capacityPlaces,
  onOpenParcel,
}: {
  parcels: ShelfParcel[];
  /** Capacité déclarée par le gérant, comptée en places. */
  capacityPlaces: number;
  /** Ouvre l'écran de retrait sur ce colis, quand le gérant touche sa case. */
  onOpenParcel?: (parcel: ShelfParcel) => void;
}) {
  const [opened, setOpened] = useState<ShelfParcel | null>(null);

  // Un code de retrait partagé par plusieurs colis = une remise groupée. Le
  // serveur ne le marque pas, mais il le dit : §8.3, un code remet tous les
  // colis de la commande présents ici.
  const groupedCodes = useMemo(() => groupedPickupCodes(parcels), [parcels]);

  const plan = useMemo(() => {
    const total = Math.max(0, capacityPlaces);

    // Répartition des places, puis conversion en cases. Les encombrants
    // ramassent le reliquat : sans cela, arrondir trois fois ferait
    // disparaitre jusqu'a deux places du local.
    const placesA = Math.round(total * ZONES[0].share);
    const placesB = Math.round(total * ZONES[1].share);
    const placesC = Math.max(0, total - placesA - placesB);
    const counts: Record<ZoneKey, number> = {
      A: placesA,
      B: Math.floor(placesB / ZONES[1].places),
      C: Math.floor(placesC / ZONES[2].places),
    };

    // Placement. Un code d'emplacement deja attribue fait foi quand il
    // designe une case existante de la bonne zone ; sinon le colis prend la
    // premiere case libre de sa zone, pour qu'aucun colis ne soit invisible.
    const grilles: Record<ZoneKey, Array<ShelfParcel | null>> = {
      A: Array.from({ length: counts.A }, () => null),
      B: Array.from({ length: counts.B }, () => null),
      C: Array.from({ length: counts.C }, () => null),
    };
    const enAttente: ShelfParcel[] = [];

    parcels.forEach((parcel) => {
      const zone = zoneOf(parcel.size);
      const match = /^([ABC])-?(\d+)$/i.exec(parcel.slot.trim());
      const index = match && match[1].toUpperCase() === zone ? Number(match[2]) - 1 : -1;
      if (index >= 0 && index < grilles[zone].length && grilles[zone][index] === null) {
        grilles[zone][index] = parcel;
      } else {
        enAttente.push(parcel);
      }
    });

    enAttente.forEach((parcel) => {
      const zone = zoneOf(parcel.size);
      const libre = grilles[zone].findIndex((cell) => cell === null);
      if (libre >= 0) grilles[zone][libre] = parcel;
    });

    const placesUsed = parcels.reduce(
      (somme, parcel) => somme + ZONES.find((z) => z.key === zoneOf(parcel.size))!.places,
      0,
    );

    return { grilles, counts, placesUsed, total };
  }, [capacityPlaces, parcels]);

  const pct = plan.total > 0 ? Math.round((plan.placesUsed / plan.total) * 100) : 0;
  // Au-dela de 90 %, BelivaY coupe l'envoi : le chiffre passe alors en orange
  // pour que le gerant le voie venir au lieu de le subir.
  const pctTone = pct >= 90 ? "text-[#E8590C]" : "text-[#1D4ED8] dark:text-blue-400";

  return (
    <section className="rounded-[18px] border border-slate-200/70 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[19px] font-black tracking-[-0.015em] text-slate-900 dark:text-white">
          Plan des étagères
        </h3>
        <span className={`text-[22px] font-black leading-none ${pctTone}`}>{pct} %</span>
      </div>

      {ZONES.map((zone) => (
        <div key={zone.key} className="mt-4 first:mt-3">
          <p className="text-[11.5px] font-black uppercase leading-none tracking-[0.08em] text-slate-500 dark:text-slate-400">
            {zone.label} ({zone.places} place{zone.places > 1 ? "s" : ""})
          </p>
          {plan.counts[zone.key] === 0 ? (
            <p className="mt-2 text-[13px] font-medium text-slate-400 dark:text-slate-500">
              Aucune place déclarée pour cette zone.
            </p>
          ) : (
            <div className={`mt-2.5 grid gap-2 ${zone.cols}`}>
              {plan.grilles[zone.key].map((parcel, index) => {
                const state: CellState = parcel ? stateOf(parcel, groupedCodes) : "empty";
                const label = `${zone.key}${index + 1}`;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={!parcel}
                    onClick={() => parcel && setOpened(parcel)}
                    aria-label={parcel ? `${label} · ${parcel.ref} · ${STATE_LABEL[state]}` : `${label} · libre`}
                    className={`flex h-[34px] items-center justify-center rounded-[8px] border text-[12.5px] font-bold transition enabled:active:scale-[.94] disabled:cursor-default ${CELL_STYLE[state]}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <div className="mt-5 flex flex-wrap gap-2">
        {LEGEND.map(({ state, label }) => (
          <span
            key={state}
            className={`rounded-full border px-3 py-[5px] text-[12.5px] font-semibold ${CELL_STYLE[state]}`}
          >
            {label}
          </span>
        ))}
      </div>

      <p className="mt-4 text-[13px] font-medium leading-[1.5] text-slate-500 dark:text-slate-400">
        Touchez une case pour ouvrir le colis. À 90 %, BelivaY cesse d'envoyer de nouveaux colis ici.
      </p>

      {/* Fiche d'une case. Volontairement pauvre : le gerant n'a pas besoin de
          savoir QUI attend son colis, seulement ou il est et jusqu'a quand. */}
      {opened ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Colis ${opened.ref}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpened(null);
          }}
        >
          <div className="animate-sheet-up safe-pb w-full rounded-t-3xl border border-slate-200 bg-white p-5 shadow-[0_-8px_40px_rgba(2,6,23,.32)] dark:border-slate-800 dark:bg-slate-900 sm:animate-page-in sm:max-w-md sm:rounded-3xl">
            <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" aria-hidden />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                  Casier {opened.slot || "non attribué"}
                </p>
                <h4 className="mt-1 text-[20px] font-black text-slate-900 dark:text-white">{opened.ref}</h4>
              </div>
              <button
                type="button"
                onClick={() => setOpened(null)}
                aria-label="Fermer"
                className="rounded-full bg-red-50 p-1.5 text-red-600 transition hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
              >
                <X size={17} />
              </button>
            </div>

            <dl className="mt-4 divide-y divide-slate-100 text-[14px] dark:divide-slate-800">
              {[
                ["État", STATE_LABEL[stateOf(opened, groupedCodes)]],
                ["Taille", opened.sizeLabel],
                ["Acheteur", opened.buyerRef],
                ["Reçu le", formatJour(opened.receivedAt) || "—"],
                ["Garde gratuite jusqu'au", formatJour(opened.gardeFreeUntil) || "—"],
                ["À retirer avant le", formatJour(opened.gardeDeadline) || "—"],
                ["Frais de garde", opened.gardeFeeXaf > 0 ? `${nf(opened.gardeFeeXaf)} F` : "aucun"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="font-medium text-slate-500 dark:text-slate-400">{label}</dt>
                  <dd className="text-right font-black text-slate-900 dark:text-white">{value}</dd>
                </div>
              ))}
            </dl>

            {onOpenParcel ? (
              <button
                type="button"
                onClick={() => {
                  const parcel = opened;
                  setOpened(null);
                  onOpenParcel(parcel);
                }}
                className="mt-5 w-full rounded-[12px] bg-gradient-to-r from-[#F58A1F] to-[#E8590C] px-4 py-3.5 text-[16px] font-black text-white transition active:scale-[.97]"
              >
                Remettre ce colis
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
