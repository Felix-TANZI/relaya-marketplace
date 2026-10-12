/**
 * Historique — ce que le comptoir a fait, dans l'ordre où il l'a fait.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * À QUOI SERT CET ÉCRAN
 *
 * Il ne sert pas à consulter. Il sert à RÉPONDRE : un vendeur appelle, un
 * client conteste, le support demande. La question est toujours la même —
 * « à quelle heure, à qui, avec quelle preuve ». Tout l'écran est construit
 * pour qu'on y réponde sans quitter le comptoir.
 *
 * D'où la ligne de temps plutôt qu'un tableau : on retrouve une opération
 * par le moment où elle a eu lieu, parce que c'est ainsi qu'on s'en
 * souvient. « Ce matin, juste avant le livreur » se cherche mieux que
 * « BV-40231 ».
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA LIGNE DE TEMPS EST COMPOSÉE PAR LE SERVEUR
 *
 * Une journée mélange cinq natures d'événements qui vivent dans cinq
 * tables. `RelayPointHistoryView` les recoud là où les dates sont écrites ;
 * cet écran ne fait que grouper par jour et peindre.
 */
import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { http } from "@/services/api/http";

/** Les natures d'opération, telles que le serveur les nomme. */
export type HistoryKind = "reception" | "remise" | "depart" | "retour" | "constat";

export interface HistoryEntry {
  ref: string;
  slot: string;
  order_id: number;
  /** ISO 8601. */
  at: string;
  kind: HistoryKind;
  title: string;
  detail: string;
}

interface HistoryPayload {
  days: number;
  counts: { recus: number; remis: number; retours: number; constats: number; departs: number };
  entries: HistoryEntry[];
  /** Durées RÉELLES de conservation, lues de `PlatformSettings`. */
  retention: { evidence_days: number; dispute_days: number };
}

const PERIODES = [
  { days: 1, label: "Aujourd'hui" },
  { days: 7, label: "7 jours" },
  { days: 30, label: "30 jours" },
] as const;

/**
 * Les filtres, dans l'ordre d'une journée de comptoir.
 *
 * `null` d'abord : « Tous » n'est pas une nature, c'est l'absence de
 * filtre, et il doit rester le point de départ.
 */
const FILTRES: Array<{ key: HistoryKind | null; label: string }> = [
  { key: null, label: "Tous" },
  { key: "reception", label: "Réceptions" },
  { key: "remise", label: "Remises" },
  { key: "depart", label: "Départs" },
  { key: "retour", label: "Retours" },
  { key: "constat", label: "Constats" },
];

/**
 * La pastille de chaque nature.
 *
 * Les couleurs ne décorent pas, elles disent le SENS du mouvement : le vert
 * sort vers le client, le bleu entre au relais, le rouge repart vers le
 * vendeur, l'orange revient du client, l'or signale un dossier.
 */
const KIND_STYLE: Record<HistoryKind, { dot: string; pill: string; label: string }> = {
  reception: {
    dot: "border-[#2456D6] bg-[#EAF0FF]",
    pill: "border-[#C9D7FB] bg-[#EAF0FF] text-[#2456D6]",
    label: "Reçu",
  },
  remise: {
    dot: "border-[#1F7A4D] bg-[#E6F4EC]",
    pill: "border-[#BFE3CF] bg-[#E6F4EC] text-[#1F7A4D]",
    label: "Remis",
  },
  depart: {
    dot: "border-[#B42318] bg-[#FDECEA]",
    pill: "border-[#F4C3BE] bg-[#FDECEA] text-[#B42318]",
    label: "Départ",
  },
  retour: {
    dot: "border-[#EF6A00] bg-[#FFF1E2]",
    pill: "border-[#F0DA9C] bg-[#FFF4D6] text-[#B84A00]",
    label: "Retour",
  },
  constat: {
    dot: "border-[#8A5A00] bg-[#FFF4D6]",
    pill: "border-[#F0DA9C] bg-[#FFF4D6] text-[#8A5A00]",
    label: "Constat",
  },
};

const JOUR_LONG = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long", day: "numeric", month: "long",
});

/** « 09:42 » — l'heure locale, en deux chiffres, pour que la colonne s'aligne. */
function heure(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Échappe une cellule CSV : un détail contient des « · », parfois des virgules. */
function cellule(valeur: string | number) {
  const texte = String(valeur ?? "");
  return /[",;\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

export default function RelayHistory() {
  const [days, setDays] = useState<number>(7);
  const [kind, setKind] = useState<HistoryKind | null>(null);
  const [query, setQuery] = useState("");
  const [payload, setPayload] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * La période et la recherche se résolvent côté serveur.
   *
   * La recherche part en différé : au comptoir on tape un numéro complet,
   * et interroger à chaque touche enverrait huit requêtes pour une réponse.
   */
  useEffect(() => {
    let vivant = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ days: String(days) });
      if (query.trim()) params.set("q", query.trim());
      http<HistoryPayload>(`/api/shipping/relay-point/history/?${params}`)
        .then((data) => {
          if (vivant) setPayload(data);
        })
        .catch(() => {
          if (vivant) setPayload(null);
        })
        .finally(() => {
          if (vivant) setLoading(false);
        });
    }, query ? 350 : 0);
    return () => {
      vivant = false;
      window.clearTimeout(timer);
    };
  }, [days, query]);

  const entries = useMemo(
    () => (payload?.entries || []).filter((entry) => !kind || entry.kind === kind),
    [kind, payload],
  );

  /** Les opérations groupées par jour, du plus récent au plus ancien. */
  const journees = useMemo(() => {
    const groupes = new Map<string, { at: Date; lignes: HistoryEntry[] }>();
    entries.forEach((entry) => {
      const date = new Date(entry.at);
      if (Number.isNaN(date.getTime())) return;
      // Clé sur la date LOCALE : en UTC, une opération de 1 h du matin
      // basculerait dans la journée précédente.
      const cle = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const groupe = groupes.get(cle);
      if (groupe) groupe.lignes.push(entry);
      else groupes.set(cle, { at: date, lignes: [entry] });
    });
    return [...groupes.values()].sort((a, b) => b.at.getTime() - a.at.getTime());
  }, [entries]);

  /**
   * Export de la période, composé dans le navigateur.
   *
   * Il n'y a pas d'export serveur, et on n'en invente pas un : ce fichier
   * porte exactement ce que l'écran affiche, ni plus ni moins. Le gérant
   * ne peut donc pas exporter une preuve qu'il n'a pas vue.
   */
  const exporter = () => {
    if (entries.length === 0) return;
    const lignes = [
      ["Date", "Heure", "Nature", "Reference", "Emplacement", "Detail"].join(";"),
      ...entries.map((entry) => {
        const date = new Date(entry.at);
        return [
          cellule(date.toLocaleDateString("fr-FR")),
          cellule(heure(entry.at)),
          cellule(KIND_STYLE[entry.kind].label),
          cellule(entry.ref),
          cellule(entry.slot),
          cellule(entry.detail),
        ].join(";");
      }),
    ];
    // BOM UTF-8 : sans lui, Excel ouvre « reçu » en « reÃ§u ».
    const blob = new Blob(["﻿" + lignes.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = `historique-relais-${days}j.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  };

  const counts = payload?.counts;
  const retention = payload?.retention;

  return (
    <div className="space-y-4">
      {/* ── Recherche ──────────────────────────────────────────────────── */}
      <div className="relative">
        <Search
          size={19}
          strokeWidth={2.4}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2456D6] dark:text-blue-400"
          aria-hidden
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="N° de commande, de colis ou de retour"
          aria-label="Rechercher une opération"
          className="w-full rounded-[14px] border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-[14.5px] font-semibold text-slate-900 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[#2456D6] dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {/* ── Période ────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Période"
        className="grid grid-cols-3 gap-1 rounded-[14px] bg-[#E8EDF8] p-1 dark:bg-slate-800/70"
      >
        {PERIODES.map((periode) => {
          const on = periode.days === days;
          return (
            <button
              key={periode.days}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setDays(periode.days)}
              className={`rounded-[11px] px-2 py-2.5 text-[13.5px] font-bold leading-tight transition active:scale-[.96] ${
                on
                  ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(60,35,15,.14)] dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {periode.label}
            </button>
          );
        })}
      </div>

      {/* ── Les chiffres de la période ─────────────────────────────────────
          Ils ne bougent pas quand on cherche : ce sont ceux de la période,
          pas ceux du filtre. Les voir changer a la saisie donnerait
          l'impression que l'activite du relais se modifie. */}
      <div className="grid grid-cols-4 divide-x divide-slate-100 rounded-[14px] border border-slate-200 bg-white py-3.5 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {[
          { valeur: counts?.recus ?? 0, label: "reçus", ton: "text-[#2456D6] dark:text-blue-400" },
          { valeur: counts?.remis ?? 0, label: "remis", ton: "text-[#1F7A4D] dark:text-emerald-400" },
          { valeur: counts?.retours ?? 0, label: "retours", ton: "text-[#EF6A00] dark:text-orange-400" },
          { valeur: counts?.constats ?? 0, label: "constats", ton: "text-[#8A5A00] dark:text-amber-400" },
        ].map((bloc) => (
          <div key={bloc.label} className="px-1 text-center">
            <div className={`text-[23px] font-black leading-none tabular-nums ${bloc.ton}`}>{bloc.valeur}</div>
            <div className="mt-1.5 text-[12.5px] font-medium text-slate-500 dark:text-slate-400">{bloc.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filtres ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {FILTRES.map((filtre) => {
          const on = filtre.key === kind;
          return (
            <button
              key={filtre.label}
              type="button"
              aria-pressed={on}
              onClick={() => setKind(filtre.key)}
              className={`rounded-full px-3.5 py-[7px] text-[13px] font-bold transition active:scale-[.96] ${
                on
                  ? "bg-[#EAF0FF] text-[#2456D6] dark:bg-blue-950/60 dark:text-blue-300"
                  : "bg-white text-slate-500 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:bg-slate-900 dark:text-slate-400"
              }`}
            >
              {filtre.label}
            </button>
          );
        })}
      </div>

      {/* ── La ligne de temps ──────────────────────────────────────────── */}
      {loading && !payload ? (
        <section className="rounded-[14px] border border-slate-200 bg-white px-4 py-8 text-center shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[13.5px] font-medium text-slate-400 dark:text-slate-500">Lecture de l'historique…</p>
        </section>
      ) : journees.length === 0 ? (
        <section className="rounded-[14px] border border-slate-200 bg-white px-4 py-8 text-center shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[13.5px] font-medium text-slate-400 dark:text-slate-500">
            {query.trim()
              ? "Aucune opération ne porte cette référence sur la période."
              : "Aucune opération enregistrée sur la période."}
          </p>
        </section>
      ) : (
        journees.map((journee) => (
          <section
            key={journee.at.toISOString()}
            className="rounded-[14px] border border-slate-200 bg-white px-4 pb-3 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900"
          >
            <h3 className="text-[11.5px] font-black uppercase leading-none tracking-[0.1em] text-slate-400 dark:text-slate-500">
              {JOUR_LONG.format(journee.at)}
            </h3>

            <ul className="mt-3">
              {journee.lignes.map((entry, rang) => {
                const style = KIND_STYLE[entry.kind];
                const dernier = rang === journee.lignes.length - 1;
                return (
                  <li key={`${entry.kind}-${entry.ref}-${entry.at}`} className="flex gap-3">
                    <span className="w-[42px] flex-shrink-0 pt-[1px] text-right text-[12.5px] font-bold tabular-nums text-slate-500 dark:text-slate-400">
                      {heure(entry.at)}
                    </span>

                    {/* La pastille et son fil. Le fil s'arrête à la dernière
                        ligne : le prolonger ferait croire à une suite. */}
                    <span className="flex w-[14px] flex-shrink-0 flex-col items-center" aria-hidden>
                      <span className={`mt-[3px] h-[13px] w-[13px] flex-shrink-0 rounded-full border-[3px] ${style.dot}`} />
                      {dernier ? null : <span className="w-[2px] flex-1 bg-slate-100 dark:bg-slate-800" />}
                    </span>

                    <span className={`min-w-0 flex-1 ${dernier ? "pb-1" : "pb-5"}`}>
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0 flex-1 text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                          {entry.title}
                        </span>
                        <span
                          className={`flex-shrink-0 rounded-full border px-2.5 py-[4px] text-[12px] font-semibold ${style.pill}`}
                        >
                          {style.label}
                        </span>
                      </span>
                      {entry.detail ? (
                        <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                          {entry.detail}
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {/* ── Export ─────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={exporter}
        disabled={entries.length === 0}
        className="flex w-full items-center justify-center gap-2.5 rounded-[14px] border border-slate-200 bg-white px-4 py-4 text-[15px] font-black text-slate-700 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] transition active:scale-[.98] disabled:cursor-not-allowed disabled:text-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:disabled:text-slate-600"
      >
        <Download size={18} strokeWidth={2.4} /> Exporter la période
      </button>

      {/*
        Ce que le portail PROMET au gerant.

        Les durees viennent de `PlatformSettings` — jamais d'un nombre ecrit
        ici. Cette phrase l'engage : s'il croit disposer de six mois pour
        retrouver une photo alors que la purge passe a huit jours, il
        decouvrira la verite le jour ou un vendeur contestera.
      */}
      <p className="px-1 pb-1 text-center text-[12.5px] font-medium leading-[1.55] text-slate-400 dark:text-slate-500">
        {retention
          ? `Chaque opération garde ses preuves (heure, photo, emplacement, personne du guichet) pendant ${retention.evidence_days} jours, et ${retention.dispute_days} jours lorsqu'un dossier est ouvert. Vous pouvez les consulter et les exporter ; elles ne se modifient jamais.`
          : "Chaque opération garde ses preuves : heure, photo, emplacement, personne du guichet. Vous pouvez les consulter et les exporter ; elles ne se modifient jamais."}
      </p>
    </div>
  );
}
