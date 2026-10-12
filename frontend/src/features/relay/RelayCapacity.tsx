/**
 * Capacité et horaires.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE SEUL ÉCRAN OÙ LE GÉRANT ENGAGE SON LOCAL
 *
 * Tout le reste du portail constate. Ici, il promet : le nombre déclaré est
 * ce sur quoi BelivaY s'appuie pour lui envoyer des colis. Déclarer trop,
 * c'est accepter des tournées qu'on ne peut pas ranger et finir par refuser
 * au contrôle — ce qui abîme le Trust Score. Déclarer trop peu, c'est se
 * priver de revenu.
 *
 * D'où le pas à pas plutôt qu'un champ libre : on ajuste une place à la
 * fois, en regardant la barre d'occupation monter. Un champ vide invite à
 * taper un chiffre rond ; le pas à pas fait réfléchir à la place suivante.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PLACES, PAS COLIS
 *
 * Même convention que le plan des étagères : un encombrant vaut cinq
 * petits. Les vignettes du milieu ne sont pas décoratives, elles disent le
 * taux de change — sans elles, « 40 places » ne veut rien dire.
 */
import { useState } from "react";
import { Box, CalendarX, Check, Clock, Minus, Plus, X } from "lucide-react";
import {
  DAY_END,
  DAY_LABELS,
  DAY_START,
  formatOpeningHours,
  parseLunchBreak,
  parseOpeningHours,
  todayIndex,
  type DaySchedule,
  type LunchBreak,
} from "./relayHours";

/** Ce qu'une catégorie coûte en places. Aligné sur `relayShelf.ts`. */
const TARIF_PLACES: Array<{ places: number; label: string }> = [
  { places: 1, label: "petit (S)" },
  { places: 2, label: "moyen (M)" },
  { places: 5, label: "encombrant (L)" },
];

/** Au-delà, BelivaY cesse d'orienter de nouveaux colis vers ce relais. */
const SEUIL_SATURATION = 90;

export default function RelayCapacity({
  capacity,
  used,
  hours,
  acceptsBulky,
  busy,
  onSave,
  onOpenClosure,
}: {
  /** Places déclarées, telles qu'enregistrées côté serveur. */
  capacity: number;
  /** Places réellement occupées, calculées sur les colis en stock. */
  used: number;
  hours: string;
  /** Le relais prend-il les encombrants ? Question de place, pas de tarif. */
  acceptsBulky: boolean;
  busy: boolean;
  /** Une seule écriture pour tout l'écran : capacité, horaires et encombrants partent ensemble. */
  onSave: (payload: {
    storage_capacity: number;
    opening_hours: string;
    accepts_bulky: boolean;
  }) => void;
  /** Sortie vers la déclaration de fermeture exceptionnelle. */
  onOpenClosure: () => void;
}) {
  const [draft, setDraft] = useState(capacity);
  const [week, setWeek] = useState<DaySchedule[]>(() => parseOpeningHours(hours));
  /** Jour dont le reglage est ouvert : un seul a la fois, la carte est deja dense. */
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [lunch, setLunch] = useState<LunchBreak>(() => parseLunchBreak(hours));
  const [lunchOpen, setLunchOpen] = useState(false);

  // Les valeurs enregistrées peuvent changer sous nos pieds (rechargement
  // après sauvegarde) : on suit le serveur tant que le gérant n'a rien touché.
  const [bulky, setBulky] = useState(acceptsBulky);
  const [seenBulky, setSeenBulky] = useState(acceptsBulky);
  if (acceptsBulky !== seenBulky) {
    setSeenBulky(acceptsBulky);
    setBulky(acceptsBulky);
  }

  const [seenCapacity, setSeenCapacity] = useState(capacity);
  if (capacity !== seenCapacity) {
    setSeenCapacity(capacity);
    setDraft(capacity);
  }
  const [seenHours, setSeenHours] = useState(hours);
  if (hours !== seenHours) {
    setSeenHours(hours);
    setWeek(parseOpeningHours(hours));
    setLunch(parseLunchBreak(hours));
  }

  const today = todayIndex();
  const nextHours = formatOpeningHours(week, lunch);

  const setDay = (index: number, patch: Partial<DaySchedule>) =>
    setWeek((current) =>
      current.map((jour, i) => {
        if (i !== index) return jour;
        const next = { ...jour, ...patch };
        // La fermeture reste après l'ouverture : une plage inversée ne veut
        // rien dire, et le serveur la stockerait telle quelle.
        if (next.to <= next.from) next.to = Math.min(DAY_END, next.from + 1);
        return next;
      }),
    );

  const pct = draft > 0 ? Math.round((used / draft) * 100) : 0;
  const sature = pct >= SEUIL_SATURATION;
  // Un seul drapeau pour tout l'ecran : le bouton unique doit s'allumer
  // des qu'une valeur, quelle qu'elle soit, s'ecarte du serveur.
  const dirty = draft !== capacity || nextHours !== hours || bulky !== acceptsBulky;
  // On ne descend pas sous ce qui est déjà rangé : la promesse serait fausse
  // dès l'instant où elle est faite.
  const plancher = Math.max(1, used);

  return (
    <div className="space-y-4">
      <header className="pt-0.5">
        <h2 className="text-[27px] font-black leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white">
          Capacité et horaires
        </h2>
        <p className="mt-1.5 text-[14.5px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
          Ce que vous déclarez ici décide des colis qu'on vous envoie.
        </p>
      </header>

      {/* ── Places de stockage ───────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-5 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[12px] font-black uppercase leading-none tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Places de stockage
        </h3>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setDraft((current) => Math.max(plancher, current - 1))}
            disabled={draft <= plancher || busy}
            aria-label="Retirer une place"
            className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition active:scale-90 disabled:opacity-35 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <Minus size={22} strokeWidth={2.4} />
          </button>

          <div className="min-w-0 text-center">
            <div className="text-[64px] font-black leading-[0.85] tracking-[-0.03em] text-[#EF6A00]">
              {draft}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDraft((current) => current + 1)}
            disabled={busy}
            aria-label="Ajouter une place"
            className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center pr-sunrise rounded-full shadow-[0_4px_12px_rgba(217,80,0,.35)] transition active:scale-90 disabled:opacity-50"
          >
            <Plus size={24} strokeWidth={2.6} />
          </button>
        </div>

        <p className="mt-2 text-center text-[13px] font-medium text-slate-500 dark:text-slate-400">
          places déclarées · {used} occupées
        </p>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              sature
                ? "bg-gradient-to-r from-[#EF6A00] to-[#B84A00]"
                : "bg-gradient-to-r from-[#E8A10E] to-[#EF6A00]"
            }`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>

        {/* ── Le taux de change ──────────────────────────────────────────── */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {TARIF_PLACES.map(({ places, label }) => (
            <div
              key={label}
              className="rounded-[12px] bg-[#FFF1E2] px-1 py-2.5 text-center dark:bg-orange-950/50"
            >
              <div className="text-[17px] font-black leading-none text-[#EF6A00] dark:text-orange-300">
                {places}
              </div>
              <div className="mt-1.5 text-[11px] font-semibold leading-tight text-[#B84A00] dark:text-orange-200/80">
                {label}
              </div>
            </div>
          ))}
          {/* Le XL n'est pas une categorie de BelivaY : il n'existe pas de
              gabarit au-dela de l'encombrant. La vignette le dit plutot que
              de laisser le gerant se demander ou il passerait. */}
          <div className="rounded-[12px] bg-slate-100 px-1 py-2.5 text-center dark:bg-slate-800">
            <div className="flex justify-center text-slate-400 dark:text-slate-500">
              <X size={17} strokeWidth={2.6} />
            </div>
            <div className="mt-1.5 text-[11px] font-semibold leading-tight text-slate-400 dark:text-slate-500">
              XL, hors gabarit
            </div>
          </div>
        </div>

        <p className="mt-4 text-[13px] font-medium leading-[1.55] text-slate-400 dark:text-slate-500">
          Au-delà de {SEUIL_SATURATION} %, les nouveaux clients sont orientés vers un autre relais. Les
          retours déposés ne comptent pas dans vos places. Toute hausse de places est vérifiée lors
          d'une visite.
        </p>

        {/* ── Encombrants ────────────────────────────────────────────────── */}
        <div className="mt-5 flex items-start gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-[#FFF1E2] text-[#EF6A00] dark:bg-orange-950 dark:text-orange-300">
            <Box size={19} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-black leading-tight text-slate-900 dark:text-white">
              Accepter les encombrants
            </div>
            <p className="mt-1 text-[12.5px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
              {bulky
                ? "Un encombrant occupe cinq places. Si votre arrière-boutique ne suit plus, refusez-les : ils seront signalés dès la commande et ne vous seront plus attribués."
                : "Les encombrants sont refusés : ils sont signalés dès la commande et ne vous sont jamais attribués. Votre grille tarifaire, elle, ne change pas."}
            </p>
          </div>
          {/* Le bouton bascule tout de suite et part avec l'enregistrement
              du bas, comme la capacite et les horaires : un ecran, une
              ecriture. Basculer et sauver seul laisserait croire que les deux
              autres reglages sont partis aussi. */}
          <button
            type="button"
            role="switch"
            aria-checked={bulky}
            aria-label="Accepter les encombrants"
            disabled={busy}
            onClick={() => setBulky((on) => !on)}
            className={`mt-0.5 flex h-[30px] w-[52px] flex-shrink-0 items-center rounded-full px-[3px] transition active:scale-95 disabled:opacity-60 ${
              bulky ? "bg-[#2456D6]" : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <span
              className={`h-6 w-6 rounded-full bg-white shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] transition-transform ${
                bulky ? "translate-x-[22px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </section>

      {/* ── Horaires ─────────────────────────────────────────────────────
          Une réglette par jour plutôt qu'une phrase. Un samedi qui ferme plus
          tôt se voyait mal dans « Lun-Sam 8h-19h » ; ici il est court, et ça
          se voit sans lire. La barre est à l'échelle 6 h → 22 h, la même pour
          les sept jours : c'est la comparaison entre les lignes qui informe. */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-5 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
          Horaires d'ouverture
        </h3>

        {/* Réglette : calée sur la colonne des barres, pas sur la carte. */}
        <div className="mt-3 grid grid-cols-[46px_1fr_56px] items-center">
          <span />
          <div className="relative h-4">
            {[6, 12, 18, 22].map((heure) => (
              <span
                key={heure}
                className="absolute -translate-x-1/2 text-[11px] font-medium text-slate-400 dark:text-slate-500"
                style={{ left: `${((heure - DAY_START) / (DAY_END - DAY_START)) * 100}%` }}
              >
                {heure} h
              </span>
            ))}
          </div>
          <span />
        </div>

        <ul className="mt-1">
          {week.map((jour, index) => {
            const left = ((jour.from - DAY_START) / (DAY_END - DAY_START)) * 100;
            const width = ((jour.to - jour.from) / (DAY_END - DAY_START)) * 100;
            return (
              <li
                key={DAY_LABELS[index]}
                className={`-mx-2 rounded-[12px] px-2 py-2 ${
                  index === today ? "bg-[#EAF0FF] dark:bg-blue-950/40" : ""
                }`}
              >
                <div className="grid grid-cols-[46px_1fr_56px] items-center gap-2">
                  <span
                    className={`text-[15px] font-black ${
                      index === today ? "text-[#2456D6] dark:text-blue-300" : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {DAY_LABELS[index]}
                  </span>

                  {/* La barre est un bouton : la toucher ouvre le réglage du
                      jour. Rien ne se déplace au doigt — à cette largeur, un
                      glissement coûterait une heure de travail par erreur. */}
                  <button
                    type="button"
                    onClick={() => jour.open && setOpenDay(openDay === index ? null : index)}
                    disabled={!jour.open}
                    aria-label={`Horaires du ${DAY_LABELS[index]}`}
                    className="relative h-[34px] w-full overflow-hidden rounded-full border border-slate-200 bg-white transition enabled:active:scale-[.98] dark:border-slate-700 dark:bg-slate-950"
                  >
                    {jour.open ? (
                      <span
                        className="absolute inset-y-[3px] flex items-center justify-center rounded-full bg-gradient-to-r from-[#3A6BEA] to-[#173C9E] px-2 text-[12.5px] font-black text-white"
                        style={{ left: `calc(${left}% + 3px)`, width: `calc(${width}% - 6px)` }}
                      >
                        <span className="truncate">
                          {jour.from} h – {jour.to} h
                        </span>
                      </span>
                    ) : (
                      <span className="flex h-full items-center pl-4 text-[13.5px] font-medium text-slate-400 dark:text-slate-500">
                        Fermé
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={jour.open}
                    aria-label={`Ouvrir le ${DAY_LABELS[index]}`}
                    onClick={() => setDay(index, { open: !jour.open })}
                    className={`ml-auto flex h-[30px] w-[52px] flex-shrink-0 items-center rounded-full px-[3px] transition ${
                      jour.open ? "bg-[#2456D6]" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`h-6 w-6 rounded-full bg-white shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] transition-transform duration-200 ${
                        jour.open ? "translate-x-[22px]" : ""
                      }`}
                    />
                  </button>
                </div>

                {openDay === index && jour.open ? (
                  <div className="mt-2 flex items-center gap-2 pl-[46px]">
                    {([["from", "Ouvre"], ["to", "Ferme"]] as const).map(([champ, libelle]) => (
                      <label key={champ} className="flex flex-1 items-center gap-2">
                        <span className="text-[12.5px] font-semibold text-slate-500 dark:text-slate-400">
                          {libelle}
                        </span>
                        <select
                          value={jour[champ]}
                          onChange={(event) => setDay(index, { [champ]: Number(event.target.value) })}
                          className="min-w-0 flex-1 rounded-[10px] border border-slate-200 bg-white px-2 py-1.5 text-[13.5px] font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                          {Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i).map((heure) => (
                            <option key={heure} value={heure}>
                              {heure} h
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-[13px] font-medium leading-[1.55] text-slate-400 dark:text-slate-500">
          Ces horaires s'affichent quand les clients choisissent leur relais, et les livreurs
          planifient dessus. Un écart constaté fait baisser la Ponctualité.
        </p>

      </section>
      {/* ── Pause déjeuner ───────────────────────────────────────────────
          Ce n'est pas un confort : un livreur envoyé pendant la coupure
          trouve porte close, et c'est la Ponctualité du relais qui en paie
          le prix. Déclarée, la pause sort le créneau des tournées. */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-5 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
          Pause déjeuner
        </h3>

        <div className="mt-3 flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-[#FFF1E2] text-[#EF6A00] dark:bg-orange-950 dark:text-orange-300">
            <Clock size={19} strokeWidth={2.2} />
          </span>

          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => lunch.on && setLunchOpen((current) => !current)}
              disabled={!lunch.on}
              className="block text-left text-[15px] font-black leading-tight text-slate-900 transition enabled:active:scale-[.98] disabled:text-slate-400 dark:text-white dark:disabled:text-slate-500"
            >
              {lunch.on ? `${lunch.from} h – ${lunch.to} h` : "Aucune pause déclarée"}
            </button>
            <p className="mt-1 text-[12.5px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
              Les clients la voient ; aucun livreur n'est envoyé à ce moment
            </p>

            {lunchOpen && lunch.on ? (
              <div className="mt-2 flex items-center gap-2">
                {([["from", "Début"], ["to", "Fin"]] as const).map(([champ, libelle]) => (
                  <label key={champ} className="flex flex-1 items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-slate-500 dark:text-slate-400">
                      {libelle}
                    </span>
                    <select
                      value={lunch[champ]}
                      onChange={(event) =>
                        setLunch((current) => {
                          const next = { ...current, [champ]: Number(event.target.value) };
                          if (next.to <= next.from) next.to = Math.min(DAY_END, next.from + 1);
                          return next;
                        })
                      }
                      className="min-w-0 flex-1 rounded-[10px] border border-slate-200 bg-white px-2 py-1.5 text-[13.5px] font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      {Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i).map((heure) => (
                        <option key={heure} value={heure}>
                          {heure} h
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={lunch.on}
            aria-label="Déclarer une pause déjeuner"
            onClick={() => setLunch((current) => ({ ...current, on: !current.on }))}
            className={`mt-0.5 flex h-[30px] w-[52px] flex-shrink-0 items-center rounded-full px-[3px] transition ${
              lunch.on ? "bg-[#2456D6]" : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <span
              className={`h-6 w-6 rounded-full bg-white shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] transition-transform duration-200 ${
                lunch.on ? "translate-x-[22px]" : ""
              }`}
            />
          </button>
        </div>
      </section>

      {/* Une seule écriture pour tout l'écran. Trois boutons de sauvegarde
          laissaient le gérant croire qu'il avait enregistré alors qu'il
          n'avait validé qu'un tiers de ses changements. */}
      <button
        type="button"
        onClick={() => onSave({ storage_capacity: draft, opening_hours: nextHours, accepts_bulky: bulky })}
        disabled={!dirty || busy}
        className="pr-btn flex w-full items-center justify-center gap-2.5 rounded-[12px] px-4 py-4 text-[17px] font-black text-white transition active:scale-[.97] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700"
      >
        <Check size={19} strokeWidth={3} /> {busy ? "Enregistrement..." : "Enregistrer"}
      </button>

      {/* La fermeture exceptionnelle n'est pas un horaire : c'est un
          événement daté, avec son propre écran et ses conséquences sur les
          colis déjà en route. D'où le bouton sobre, à l'écart du reste. */}
      <button
        type="button"
        onClick={onOpenClosure}
        className="flex w-full items-center justify-center gap-2.5 rounded-[12px] border border-slate-200 bg-white px-4 py-3.5 text-[16px] font-bold text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        <CalendarX size={18} strokeWidth={2.2} /> Fermer exceptionnellement
      </button>
    </div>
  );
}
