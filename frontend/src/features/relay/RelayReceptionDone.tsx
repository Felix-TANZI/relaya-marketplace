/**
 * Étape 3 de la réception : ce qui vient de se passer.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UN ÉCRAN DE FIN QUI N'EST PAS UNE FÉLICITATION
 *
 * La coche verte dit que c'est enregistré. Le reste de l'écran dit ce que
 * ça a déclenché — parce qu'une réception validée n'est pas une fin : les
 * clients viennent d'être prévenus, le local a changé de taux d'occupation,
 * et le livreur est encore là avec des colis à emporter.
 *
 * Le troisième point est le seul actionnable, et c'est le seul qui porte un
 * chevron. Laisser repartir un livreur sans lui donner les sortants coûte
 * une tournée entière au relais suivant.
 */
import { Bell, Check, Layers, LayoutGrid, Lock, Truck } from "lucide-react";

const HEURE = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default function RelayReceptionDone({
  count,
  places,
  at,
  buyers,
  waiting,
  placesUsed,
  capacityMax,
  outbound,
  onOutbound,
  onNew,
}: {
  /** Colis effectivement entrés en stock. */
  count: number;
  /** Places qu'ils occupent. */
  places: number;
  /** Horodatage du transfert de garde. */
  at: string;
  /** Clients prévenus : un par commande du lot. */
  buyers: number;
  /** Clients dont la commande n'est pas complète : ils reçoivent un simple avis. */
  waiting: number;
  placesUsed: number;
  capacityMax: number;
  /** Colis que le livreur doit emporter en repartant. */
  outbound: number;
  onOutbound: () => void;
  onNew: () => void;
}) {
  const pct = capacityMax > 0 ? Math.round((placesUsed / capacityMax) * 100) : 0;
  const apres = Math.max(0, placesUsed - outbound);

  return (
    <div className="space-y-4">
      {/* ── C'est enregistré ─────────────────────────────────────────────── */}
      <section className="rounded-[18px] border border-slate-200/70 bg-white px-5 pb-6 pt-7 text-center shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
        <span className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#E8F6EC] text-[#2E7D4F] dark:bg-emerald-950 dark:text-emerald-300">
          <Check size={32} strokeWidth={3} />
        </span>
        <h2 className="mt-4 text-[22px] font-black tracking-[-0.015em] text-slate-900 dark:text-white">
          Lot reçu · {count} colis
        </h2>
        <p className="mt-2 text-[14px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
          Le livreur a confirmé sur son téléphone à {HEURE.format(new Date(at))}. La garde est sous
          votre responsabilité, horodatée.
        </p>
      </section>

      {/* ── Les trois conséquences ───────────────────────────────────────── */}
      <section className="rounded-[18px] border border-slate-200/70 bg-white px-5 pb-2 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[19px] font-black tracking-[-0.015em] text-slate-900 dark:text-white">
          Ce qui part maintenant
        </h3>

        <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
          <li className="flex items-start gap-3 py-3.5">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-[#EAF1FE] text-[#4F7DF3] dark:bg-blue-950 dark:text-blue-300">
              <Bell size={19} strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                Clients prévenus
              </span>
              <span className="mt-1 block text-[13px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
                {buyers} client{buyers > 1 ? "s" : ""} : avis d'arrivée puis code, en deux messages
                {waiting > 0
                  ? ` · ${waiting} client${waiting > 1 ? "s attendent" : " attend"} encore un colis : simple notification`
                  : ""}
              </span>
            </span>
          </li>

          <li className="flex items-start gap-3 py-3.5">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-[#FDF3DC] text-[#E0A020] dark:bg-amber-950 dark:text-amber-300">
              <Layers size={19} strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                Stock mis à jour
              </span>
              <span className="mt-1 block text-[13px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
                {placesUsed} / {capacityMax} places
                {outbound > 0 ? ` · ${apres} après la collecte` : ""}
                {pct >= 90 ? ". Au-dessus de 90 %, BelivaY suspend les nouveaux envois" : ""}
              </span>
            </span>
          </li>

          {/* Le seul point actionnable de l'ecran, et le seul a porter un
              chevron : le livreur est encore la. */}
          <li>
            <button
              type="button"
              onClick={onOutbound}
              disabled={outbound === 0}
              className="flex w-full items-start gap-3 py-3.5 text-left transition active:scale-[.99] disabled:cursor-default"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-[#FDEADC] text-[#E07B3C] dark:bg-orange-950 dark:text-orange-300">
                <Truck size={19} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                  Remettez au livreur
                </span>
                <span className="mt-1 block text-[13px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
                  {outbound > 0
                    ? `${outbound} colis sortant${outbound > 1 ? "s" : ""} avant qu'il reparte`
                    : "Rien à faire partir avec ce livreur"}
                </span>
              </span>
              {outbound > 0 ? (
                <svg
                  viewBox="0 0 24 24"
                  className="mt-1.5 h-[18px] w-[18px] flex-shrink-0 text-slate-300 dark:text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              ) : null}
            </button>
          </li>
        </ul>
      </section>

      <button
        type="button"
        onClick={onNew}
        className="flex w-full items-center justify-center gap-2.5 rounded-[12px] bg-gradient-to-r from-[#3B7BF0] to-[#1E3FBF] px-4 py-4 text-[17px] font-black text-white shadow-[0_4px_14px_rgba(30,63,191,.32)] transition active:scale-[.97]"
      >
        <LayoutGrid size={19} strokeWidth={2.4} /> Nouvelle réception
      </button>

      <div className="flex items-start gap-3 rounded-[14px] bg-[#EEF3FE] px-4 py-3.5 dark:bg-blue-950/40">
        <Lock size={18} strokeWidth={2.2} className="mt-0.5 flex-shrink-0 text-[#5B7FC7] dark:text-blue-300" />
        <p className="text-[13.5px] font-medium leading-[1.55] text-[#4A5E8A] dark:text-blue-100/80">
          Vous ne voyez jamais le vendeur ni le client : uniquement la référence BelivaY, la taille et
          l'emplacement.
        </p>
      </div>

      <p className="sr-only">{places} places occupées par ce lot.</p>
    </div>
  );
}
