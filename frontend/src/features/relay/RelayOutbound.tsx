/**
 * À faire partir — ce que le livreur emporte en quittant le relais.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE SEUL ÉCRAN OÙ LE GÉRANT SE DÉCHARGE
 *
 * Tant qu'un colis est chez lui, il en répond. La sortie est donc le moment
 * exact où la garde change de mains, et le seul geste de la journée qui
 * allège sa responsabilité au lieu de l'augmenter.
 *
 * D'où la case à cocher par colis, et non un bouton « tout remettre » : on
 * coche en TENDANT le colis, pas avant. Un lot validé d'avance puis remis à
 * moitié laisse deux colis chez le gérant que le système croit partis — et
 * c'est lui qui les paiera.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUI EXISTE, ET CE QUI N'EXISTE PAS
 *
 * Les sorties réelles passent par `/relay-point/return/`, qui renvoie un
 * colis au vendeur ou à BelivaY. C'est ce que fait « Valider la sortie ».
 *
 * Le transfert vers un autre relais n'a pas d'équivalent côté serveur : il
 * figure dans le tableau des motifs, en bas, parce que le gérant doit savoir
 * qu'il existe — mais aucun colis ne peut porter ce motif aujourd'hui.
 */
import { useMemo, useState } from "react";
import { Check, Layers, Truck } from "lucide-react";

/** Pourquoi un colis quitte le relais. */
export type OutboundReason = "renvoi" | "retour" | "refus" | "transfert";

/**
 * Un passage annonce au comptoir, tel que `/relay-point/collections/` le rend.
 *
 * Un passage n'a pas d'HEURE mais un CRENEAU : les tournees sont datees par
 * `slot_date` + `period`, et la regle n°5.1 ne fixe que deux fenetres par
 * zone. D'ou les deux bornes plutot qu'un instant.
 */
export interface CollectionPassage {
  tournee_id: number;
  /** « 2026-10-01 ». */
  slot_date: string;
  period: "MORNING" | "AFTERNOON";
  /** « 13:00:00 ». */
  slot_start: string;
  slot_end: string;
  /** Entreprise de livraison, vide tant que la tournee n'est pas revendiquee. */
  company: string;
  /** Colis de CE relais que ce passage doit deposer. */
  drop_count: number;
  status: string;
}

export interface RelayCollectionSchedule {
  passages: CollectionPassage[];
  pending_pickup_count: number;
}

export interface OutboundParcel {
  id: number;
  ref: string;
  slot: string;
  reason: OutboundReason;
  /** Ligne d'explication : « non retiré (J8) → vendeur ». */
  detail: string;
  /** Renseignée quand le colis est déjà parti. */
  returnedAt: string | null;
}

const REASON_STYLE: Record<OutboundReason, string> = {
  renvoi: "border-[#F2B8B8] bg-[#FDECEC] text-[#D84B4B]",
  retour: "border-[#B7E0C4] bg-[#F1FAF3] text-[#2E7D4F]",
  refus: "border-[#F2D79B] bg-[#FDF6E3] text-[#B4791A]",
  transfert: "border-[#C3CCF5] bg-[#EEF1FD] text-[#5B6BD6]",
};

const REASON_LABEL: Record<OutboundReason, string> = {
  renvoi: "Renvoi",
  retour: "Retour",
  refus: "Refus",
  transfert: "Transfert",
};

/**
 * Les motifs de sortie, tels que le contrat les prévoit.
 *
 * Tableau de référence, pas de données : il répond à « pourquoi celui-là
 * part-il ? » sans que le gérant ait à appeler le support.
 */
const REASONS: Array<[string, string]> = [
  ["Non retiré en 7 jours (J8)", "renvoi, 500 F client"],
  ["Retour validé déposé", "vers le vendeur"],
  ["Client change de relais", "transfert, 400 F client"],
  ["Refus au comptoir", "après constat ou annulation"],
  ["Fermeture déclarée", "vers le relais voisin"],
];

/** « mar. 22 » — assez pour se reperer dans la semaine, sans la surcharger. */
const JOUR_COURT = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" });

/** « 13:00:00 » → « 13 h », « 09:30:00 » → « 9 h 30 ». */
function heureCourte(valeur: string) {
  const [h, m] = (valeur || "").split(":");
  if (h === undefined) return "";
  return m && m !== "00" ? `${Number(h)} h ${m}` : `${Number(h)} h`;
}

/**
 * « Aujourd'hui », « Demain », sinon « mar. 22 ».
 *
 * Les deux premiers jours portent un nom parce que c'est sur eux que le
 * gerant decide quelque chose ; au-dela, la date suffit.
 */
function jourRelatif(date: Date, maintenant: Date) {
  const aJour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const ecart = Math.round((aJour(date) - aJour(maintenant)) / 86_400_000);
  if (ecart === 0) return "Aujourd'hui";
  if (ecart === 1) return "Demain";
  return JOUR_COURT.format(date);
}

const TABS = [
  { key: "todo", label: "À remettre" },
  { key: "batches", label: "Collectes" },
  { key: "gone", label: "Partis" },
] as const;

export default function RelayOutbound({
  pending,
  departed,
  courierRef,
  passages,
  busy,
  onValidate,
}: {
  /** Colis encore chez le gérant, qui doivent sortir. */
  pending: OutboundParcel[];
  /** Colis déjà partis, les plus récents d'abord. */
  departed: OutboundParcel[];
  /**
   * Référence du transporteur déjà annoncé au relais, vide s'il n'y en a pas.
   *
   * C'est une référence anonymisée (« BV-L-007 »), jamais un nom : le point
   * relais ne doit pas connaître l'identité du livreur
   * (`RelayParcelSerializer.get_courier_ref`).
   */
  courierRef: string;
  /** Passages annonces, du plus proche au plus lointain. */
  passages: CollectionPassage[];
  busy: boolean;
  onValidate: (ids: number[]) => Promise<boolean>;
}) {
  const [active, setActive] = useState<string>(TABS[0].key);
  const [checked, setChecked] = useState<number[]>([]);
  /**
   * Repère temporel figé au montage.
   *
   * Lire l'heure pendant le rendu rendrait le composant impur : deux rendus
   * voisins pourraient classer la même ligne « aujourd'hui » puis « hier ».
   * L'initialiseur paresseux de `useState` ne s'exécute qu'une fois.
   */
  const [maintenant] = useState(() => new Date());

  const toggle = (id: number) =>
    setChecked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  /**
   * Les départs de la semaine, regroupés par passage.
   *
   * Un lot validé au comptoir produit plusieurs `returned_at` à quelques
   * secondes d'intervalle : les regrouper par heure reconstitue le passage
   * tel qu'il a eu lieu, au lieu d'aligner des colis isolés que le gérant ne
   * reconnaîtrait pas.
   *
   * La clé est construite sur l'heure LOCALE. En UTC, un passage de 1 h du
   * matin se scinderait en deux groupes selon le fuseau.
   */
  const partis = useMemo(() => {
    const limite = maintenant.getTime() - 7 * 86_400_000;
    const groupes = new Map<string, { at: Date; colis: OutboundParcel[] }>();
    departed.forEach((parcel) => {
      if (!parcel.returnedAt) return;
      const date = new Date(parcel.returnedAt);
      if (Number.isNaN(date.getTime()) || date.getTime() < limite) return;
      const cle = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
      const groupe = groupes.get(cle);
      if (groupe) groupe.colis.push(parcel);
      else groupes.set(cle, { at: date, colis: [parcel] });
    });
    return [...groupes.values()].sort((a, b) => b.at.getTime() - a.at.getTime());
  }, [departed, maintenant]);

  /**
   * Ce qu'on peut honnêtement annoncer de la prochaine collecte.
   *
   * ─────────────────────────────────────────────────────────────────────────
   * POURQUOI PAS D'HEURE
   *
   * Les créneaux existent bien — `Zone.morning_slot()` / `afternoon_slot()`
   * cadencent la composition des tournées — mais aucun d'eux n'est exposé au
   * point relais : `RelayParcelSerializer` ne renvoie ni la zone, ni le
   * créneau, ni la tournée. Annoncer « aujourd'hui · 14 h » serait donc une
   * heure inventée, et le gérant organiserait sa journée dessus.
   *
   * On dit donc ce qui est vrai : combien de colis attendent, et si un
   * transporteur est déjà annoncé. Le reste viendra quand le serveur publiera
   * un planning de collecte.
   */
  const collecte = useMemo(() => {
    if (pending.length === 0) {
      return {
        titre: "Rien à faire partir",
        detail: "Aucun colis n'attend de sortir de votre local.",
      };
    }
    const colis = `${pending.length} colis à remettre`;
    return {
      titre: "Au prochain passage",
      // `courierRef` ne vaut que pour un livreur deja en route vers le relais :
      // c'est lui qui repartira avec les sorties, il n'y a pas deux passages.
      detail: courierRef ? `${courierRef} en route · ${colis}` : `${colis} · aucun livreur annoncé`,
    };
  }, [courierRef, pending.length]);

  const validate = async () => {
    if (checked.length === 0) return;
    const ok = await onValidate(checked);
    if (ok) setChecked([]);
  };

  return (
    <div className="space-y-4">
      <header className="pt-0.5">
        <h2 className="text-[27px] font-black leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white">
          À faire partir
        </h2>
        <p className="mt-1.5 text-[14.5px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
          Ce que le livreur emporte : renvois, retours, transferts, refus.
        </p>
      </header>

      {/* ── Prochaine collecte ───────────────────────────────────────────── */}
      <section
        className="overflow-hidden rounded-[18px] px-[18px] py-[18px] text-white shadow-[0_6px_18px_rgba(8,14,31,.28)]"
        style={{
          backgroundImage:
            "radial-gradient(80% 120% at 96% -4%, rgba(214,116,62,.30) 0%, rgba(214,116,62,0) 62%),"
            + " linear-gradient(140deg, #0A1230 0%, #101E48 48%, #17296B 100%)",
        }}
      >
        <Truck size={26} strokeWidth={2.2} className="text-[#E9A93A]" />
        <p className="mt-3.5 text-[12.5px] font-black uppercase leading-none tracking-[0.09em] text-[#7B9BE8]">
          Prochaine collecte
        </p>
        <div className="mt-2 text-[22px] font-black leading-tight">{collecte.titre}</div>
        <p className="mt-1.5 text-[13.5px] font-medium text-white/70">{collecte.detail}</p>
      </section>

      {/* ── Onglets ──────────────────────────────────────────────────────────
          Un seul bandeau gris, dans lequel l'onglet courant est une pastille
          blanche en relief. La gouttiere grise entre les trois est ce qui dit
          qu'ils forment un choix unique : sans elle, trois boutons flottants
          se lisent comme trois actions independantes. */}
      <div
        role="tablist"
        aria-label="Sorties"
        className="grid grid-cols-3 gap-1 rounded-[14px] bg-[#E9EBF2] p-1 dark:bg-slate-800/70"
      >
        {TABS.map((tab) => {
          const on = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(tab.key)}
              className={`rounded-[11px] px-2 py-2.5 text-[13.5px] font-bold leading-tight transition active:scale-[.96] ${
                on
                  ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,.14)] dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {tab.label}
              {tab.key === "todo" && pending.length > 0 ? ` ${pending.length}` : ""}
            </button>
          );
        })}
      </div>

      {/* ── À remettre ───────────────────────────────────────────────────── */}
      {active === "todo" ? (
        <section className="rounded-[18px] border border-slate-200/70 bg-white px-4 pb-4 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[19px] font-black tracking-[-0.015em] text-slate-900 dark:text-white">
              Scannez en sortie
            </h3>
            <span className="text-[15px] font-black text-[#1D4ED8] dark:text-blue-400">
              {checked.length} / {pending.length}
            </span>
          </div>

          {pending.length === 0 ? (
            <p className="py-6 text-center text-[13.5px] font-medium text-slate-400 dark:text-slate-500">
              Aucun colis à faire partir.
            </p>
          ) : (
            <>
              <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                {pending.map((parcel) => {
                  const on = checked.includes(parcel.id);
                  return (
                    <li key={parcel.id}>
                      <button
                        type="button"
                        onClick={() => toggle(parcel.id)}
                        aria-pressed={on}
                        className="flex w-full items-center gap-3 py-3.5 text-left transition active:scale-[.99]"
                      >
                        {/* Case pointillee tant qu'elle est vide : elle se lit
                            comme une place a remplir, pas comme un reglage. */}
                        <span
                          className={`flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] border-2 transition ${
                            on
                              ? "border-[#B7E0C4] bg-[#E8F6EC] text-[#2E7D4F]"
                              : "border-dashed border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {on ? <Check size={17} strokeWidth={3} /> : null}
                        </span>

                        <span className="flex h-[34px] w-[46px] flex-shrink-0 items-center justify-center rounded-[10px] bg-[#0F1C3F] text-[12px] font-black tabular-nums text-[#E9A93A]">
                          {parcel.slot || "—"}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-black leading-tight tabular-nums text-slate-900 dark:text-white">
                            {parcel.ref}
                          </span>
                          {/* Le motif s'enroule au lieu d'etre coupe : « client a
                              change de relais -> Nkolbisson » perd tout son sens
                              ampute de sa destination. */}
                          <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                            {parcel.detail}
                          </span>
                        </span>

                        <span
                          className={`flex-shrink-0 rounded-full border px-3 py-[5px] text-[12.5px] font-semibold ${REASON_STYLE[parcel.reason]}`}
                        >
                          {REASON_LABEL[parcel.reason]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-3 text-[13px] font-medium leading-[1.5] text-slate-500 dark:text-slate-400">
                Touchez chaque colis en le tendant au livreur. Il confirme sur son téléphone : la garde
                lui passe.
              </p>

              <button
                type="button"
                disabled={checked.length === 0 || busy}
                onClick={() => void validate()}
                className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-[12px] bg-gradient-to-r from-[#F58A1F] to-[#E8590C] px-4 py-4 text-[17px] font-black text-white shadow-[0_4px_14px_rgba(232,89,12,.38)] transition active:scale-[.97] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700"
              >
                <Check size={19} strokeWidth={3} /> {busy ? "Validation..." : "Valider la sortie"}
              </button>
            </>
          )}
        </section>
      ) : null}

      {/* ── Collectes et livraisons prévues ──────────────────────────────── */}
      {active === "batches" ? (
        <section className="rounded-[18px] border border-slate-200/70 bg-white px-4 pb-4 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-[19px] font-black tracking-[-0.015em] text-slate-900 dark:text-white">
            Collectes et livraisons prévues
          </h3>

          {passages.length === 0 ? (
            <p className="py-6 text-center text-[13.5px] font-medium text-slate-400 dark:text-slate-500">
              Aucun passage annoncé pour l'instant.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {passages.map((passage, rang) => {
                const date = new Date(`${passage.slot_date}T00:00:00`);
                const creneau = `${heureCourte(passage.slot_start)} – ${heureCourte(passage.slot_end)}`;
                const quand = Number.isNaN(date.getTime())
                  ? creneau
                  : `${jourRelatif(date, maintenant)} ${creneau}`;

                // Les sorties ne s'accrochent qu'au PREMIER passage : c'est lui
                // qui les emportera, les annoncer sur chaque ligne ferait croire
                // a autant de reprises qu'il y a de passages.
                const reprise = rang === 0 && pending.length > 0 ? `reprend ${pending.length} colis` : "";
                const depot = passage.drop_count > 0 ? `Dépose ${passage.drop_count} colis` : "Aucun dépôt prévu";

                return (
                  <li key={passage.tournee_id} className="flex items-start gap-3 py-3.5">
                    <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] bg-[#E8EFFC] text-[#2F6BD8] dark:bg-blue-950/60 dark:text-blue-300">
                      <Truck size={19} strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                        {quand}
                        {/* Une tournee pas encore revendiquee n'a pas d'entreprise :
                            on le dit, plutot que de laisser un « · » orphelin. */}
                        {passage.company ? ` · ${passage.company}` : " · entreprise à désigner"}
                      </span>
                      <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                        {reprise ? `${depot} · ${reprise}` : depot}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* ── Pourquoi le gérant ne commande pas d'enlèvement ─────────────
              Sans cette phrase, un passage qui ne vide pas tout passe pour une
              panne. C'est le fonctionnement normal : BelivaY greffe les sorties
              sur des tournees que les entreprises ont choisies. */}
          <div className="mt-3 flex items-start gap-2.5 rounded-[12px] bg-[#E8EEFC] px-3.5 py-3 dark:bg-blue-950/40">
            <Layers size={18} strokeWidth={2.2} className="mt-[1px] flex-shrink-0 text-[#2F6BD8] dark:text-blue-300" />
            <p className="text-[13px] font-medium leading-[1.5] text-[#3558B8] dark:text-blue-200">
              Les entreprises de livraison choisissent leurs tournées ; BelivaY groupe les colis pour
              qu'un passage serve à la fois à déposer et à reprendre.
            </p>
          </div>
        </section>
      ) : null}

      {/* ── Partis cette semaine ─────────────────────────────────────────── */}
      {active === "gone" ? (
        <section className="rounded-[18px] border border-slate-200/70 bg-white px-4 pb-2 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-[19px] font-black tracking-[-0.015em] text-slate-900 dark:text-white">
            Partis cette semaine
          </h3>
          {partis.length === 0 ? (
            <p className="py-6 text-center text-[13.5px] font-medium text-slate-400 dark:text-slate-500">
              Aucun colis n'est sorti de votre relais ces sept derniers jours.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {partis.map((groupe) => (
                <li key={groupe.at.toISOString()} className="flex items-start gap-3 py-3.5">
                  <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] border-2 border-[#B7E0C4] bg-[#E8F6EC] text-[#2E7D4F] dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <Check size={17} strokeWidth={3} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                      {jourRelatif(groupe.at, maintenant)} · {heureCourte(
                        `${String(groupe.at.getHours()).padStart(2, "0")}:${String(groupe.at.getMinutes()).padStart(2, "0")}`,
                      )} · {groupe.colis.length} colis
                    </span>
                    {/* Les references, chacune avec son motif : c'est ce que le
                        gerant recherche quand un vendeur l'appelle pour savoir
                        ou est passe son colis. */}
                    <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                      {groupe.colis
                        .map((parcel) => `${parcel.ref} ${REASON_LABEL[parcel.reason].toLowerCase()}`)
                        .join(" · ")}
                    </span>
                  </span>

                  {/*
                    « Enregistre », et non « Signe ».

                    La sortie n'inscrit que `returned_at` et une note de preuve
                    redigee par le relais lui-meme (`RelayParcelReturnSerializer`).
                    Le livreur ne contresigne rien : afficher « Signe » ferait
                    croire au gerant qu'il detient une preuve opposable du
                    transfert de responsabilite — exactement ce qu'il n'a pas.
                  */}
                  <span className="flex-shrink-0 rounded-full border border-[#B7E0C4] bg-[#F1FAF3] px-3 py-[5px] text-[12.5px] font-semibold text-[#2E7D4F] dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Enregistré
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* ── Pourquoi un colis part ───────────────────────────────────────── */}
      <section className="rounded-[18px] border border-slate-200/70 bg-white px-5 pb-4 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[19px] font-black tracking-[-0.015em] text-slate-900 dark:text-white">
          Pourquoi un colis part
        </h3>
        <dl className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {REASONS.map(([motif, suite]) => (
            <div key={motif} className="flex items-start justify-between gap-4 py-3">
              <dt className="text-[14px] font-medium text-slate-500 dark:text-slate-400">{motif}</dt>
              <dd className="text-right text-[14px] font-black text-slate-900 dark:text-white">{suite}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
