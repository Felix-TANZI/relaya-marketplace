/**
 * Rapports — ce que le relais a gagné, et ce qu'il a fait pour le gagner.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DEUX QUESTIONS, DANS CET ORDRE
 *
 * Un gérant ouvre cet écran pour savoir combien il a touché. Le reste —
 * colis reçus, remis, retirés à temps — n'arrive qu'ensuite, et seulement
 * parce que ces chiffres EXPLIQUENT le montant. D'où la carte sombre en
 * premier, seule à porter de la couleur, et la grille de quatre en dessous.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * D'OÙ VIENNENT LES CHIFFRES
 *
 * L'argent vient des règlements (`listRelaySettlements`) : ce sont les
 * sommes réellement arrêtées, pas une estimation refaite à partir d'une
 * grille tarifaire. Un calcul maison finirait par diverger du versement
 * reçu, et c'est le versement qui fait foi.
 *
 * Les volumes viennent des colis du relais. « À temps » se mesure sur la
 * garde gratuite contractuelle — sept jours entre la réception et le
 * retrait — et non sur une appréciation.
 */
import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { http } from "@/services/api/http";
import { listRelaySettlements, type RelaySettlement } from "@/services/api/relaySettlements";

/** Fenêtre de garde gratuite avant renvoi, en jours (règle §7). */
const GARDE_JOURS = 7;

/**
 * Les tranches de garde, telles que le CODE les facture.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ATTENTION — LA MAQUETTE DIT AUTRE CHOSE
 *
 * `RelayParcel.garde_fee_due()` applique : gratuit jusqu'a J+3
 * (`GARDE_FREE_DAYS = 3`), puis 200 F par jour jusqu'a J+7
 * (`GARDE_DAILY_FEE_XAF = 200`, `GARDE_DEADLINE_DAYS = 7`).
 *
 * La maquette annonce : 1er jour offert, 100 F les 2e et 3e jours, 200 a
 * 400 F du 4e au 7e. Ce n'est pas la meme grille, et il s'agit d'argent.
 * On affiche donc ce que le serveur facture reellement — un gerant qui lit
 * « 100 F par jour » et recoit 200 F de garde sur sa fiche ne sait plus
 * quel chiffre croire.
 *
 * Les quatre tranches gardent la decoupe et les couleurs de la maquette :
 * c'est le LIBELLE qui dit la verite, pas la forme.
 */
const TRANCHES: Array<{
  cle: string;
  label: string;
  max: number | null;
  barre: string;
  texte: string;
}> = [
  { cle: "j01", label: "Le 1er jour · offert", max: 1, barre: "bg-[#1F7A4D]", texte: "text-[#1F7A4D] dark:text-emerald-400" },
  { cle: "j23", label: "2e ou 3e jour · offert", max: 3, barre: "bg-[#E8A10E]", texte: "text-[#8A5A00] dark:text-amber-400" },
  { cle: "j47", label: "Du 4e au 7e jour · 200 F par jour", max: 7, barre: "bg-[#EF6A00]", texte: "text-[#EF6A00] dark:text-orange-400" },
  { cle: "renvoi", label: "Renvoyés", max: null, barre: "bg-[#B42318]", texte: "text-[#B42318] dark:text-red-400" },
];

/** Montant facture au client par jour de garde, au-dela de la gratuite. */
const GARDE_TARIF_JOUR = 200;

interface ReportParcel {
  id: number;
  received_at: string | null;
  picked_up_at: string | null;
  returned_at: string | null;
}

type PeriodKey = "mois" | "trimestre" | "ouverture";

const PERIODES: Array<{ key: PeriodKey; label: string }> = [
  { key: "mois", label: "Ce mois" },
  { key: "trimestre", label: "Trimestre" },
  { key: "ouverture", label: "Depuis l'ouverture" },
];

const MOIS = new Intl.DateTimeFormat("fr-FR", { month: "long" });
const nf = (n: number) => n.toLocaleString("fr-FR");

/** « 13,7 k » au-dessus d'une barre : la précision au franc n'y tient pas. */
function court(montant: number) {
  if (montant >= 1000) {
    const milliers = montant / 1000;
    return `${milliers.toFixed(milliers >= 100 ? 0 : 1).replace(".", ",")} k`;
  }
  return nf(montant);
}

/** Début de la fenêtre choisie. `null` = depuis l'ouverture, donc pas de borne. */
function debutDe(periode: PeriodKey, maintenant: Date): Date | null {
  if (periode === "mois") return new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  if (periode === "trimestre") {
    const premierMoisDuTrimestre = Math.floor(maintenant.getMonth() / 3) * 3;
    return new Date(maintenant.getFullYear(), premierMoisDuTrimestre, 1);
  }
  return null;
}

/** Le titre de la carte sombre suit la fenêtre, pas l'inverse. */
function titreDe(periode: PeriodKey, maintenant: Date) {
  if (periode === "mois") return `Gagné en ${MOIS.format(maintenant)}`;
  if (periode === "trimestre") return "Gagné ce trimestre";
  return "Gagné depuis l'ouverture";
}

function dansLaFenetre(valeur: string | null, debut: Date | null) {
  if (!valeur) return false;
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return false;
  return debut === null || date >= debut;
}

export default function RelayReportsMobile({ onError }: { onError?: (error: unknown) => void }) {
  const [periode, setPeriode] = useState<PeriodKey>("mois");
  const [parcels, setParcels] = useState<ReportParcel[]>([]);
  const [settlements, setSettlements] = useState<RelaySettlement[]>([]);
  const [loading, setLoading] = useState(true);

  // Figé au montage : « ce mois » ne doit pas changer de sens entre deux
  // rendus parce que minuit est passé pendant la consultation.
  const [maintenant] = useState(() => new Date());

  useEffect(() => {
    let vivant = true;
    Promise.all([
      http<ReportParcel[]>("/api/shipping/relay-point/parcels/"),
      listRelaySettlements().catch(() => [] as RelaySettlement[]),
    ])
      .then(([colis, reglements]) => {
        if (!vivant) return;
        setParcels(Array.isArray(colis) ? colis : []);
        setSettlements(Array.isArray(reglements) ? reglements : []);
      })
      .catch((erreur) => {
        if (vivant) onError?.(erreur);
      })
      .finally(() => {
        if (vivant) setLoading(false);
      });
    return () => {
      vivant = false;
    };
  }, [onError]);

  const debut = useMemo(() => debutDe(periode, maintenant), [maintenant, periode]);

  /**
   * Les barres du diagramme : un règlement, une barre.
   *
   * On ne recoupe pas les montants en semaines calendaires. Un règlement
   * PORTE déjà sa période (`period_start` → `period_end`), et c'est elle que
   * le gérant retrouve sur son relevé. Inventer un autre découpage ferait
   * deux vérités pour le même argent.
   */
  const barres = useMemo(() => {
    const retenus = settlements
      .filter((reglement) => dansLaFenetre(reglement.period_start, debut))
      .sort((a, b) => a.period_start.localeCompare(b.period_start));

    // Au-dela d'une dizaine de barres, le diagramme ne se lit plus sur un
    // telephone : on garde les plus recentes, qui sont celles qui comptent.
    const fenetre = retenus.slice(-8);

    return fenetre.map((reglement) => {
      const depart = new Date(reglement.period_start);
      const fin = new Date(reglement.period_end);
      const lisible = (date: Date) => (Number.isNaN(date.getTime()) ? "?" : String(date.getDate()));
      return {
        cle: reglement.reference,
        montant: Math.max(0, reglement.net_amount_xaf),
        label: `${lisible(depart)}–${lisible(fin)}`,
      };
    });
  }, [debut, settlements]);

  const totalGagne = useMemo(
    () =>
      settlements
        .filter((reglement) => dansLaFenetre(reglement.period_start, debut))
        .reduce((somme, reglement) => somme + Math.max(0, reglement.net_amount_xaf), 0),
    [debut, settlements],
  );

  /** Les volumes, et ce qu'ils disent de la tenue du comptoir. */
  const volumes = useMemo(() => {
    const recus = parcels.filter((parcel) => dansLaFenetre(parcel.received_at, debut));
    const remis = parcels.filter((parcel) => dansLaFenetre(parcel.picked_up_at, debut));
    const renvoyes = parcels.filter((parcel) => dansLaFenetre(parcel.returned_at, debut));

    // « A temps » se mesure sur la garde gratuite : un colis retire le
    // huitieme jour a coute au client, meme s'il est parti.
    const aTemps = remis.filter((parcel) => {
      if (!parcel.received_at || !parcel.picked_up_at) return false;
      const recu = new Date(parcel.received_at);
      const retire = new Date(parcel.picked_up_at);
      if (Number.isNaN(recu.getTime()) || Number.isNaN(retire.getTime())) return false;
      return (retire.getTime() - recu.getTime()) / 86_400_000 <= GARDE_JOURS;
    }).length;

    // Le denominateur est ce qui est SORTI, remis ou renvoye : rapporter les
    // retards aux seuls colis remis masquerait les renvois, qui sont
    // precisement les retards les plus longs.
    const sortis = remis.length + renvoyes.length;

    return {
      recus: recus.length,
      remis: remis.length,
      renvoyes: renvoyes.length,
      aTempsPct: sortis > 0 ? Math.round((aTemps / sortis) * 100) : null,
      renvoyesPct: sortis > 0 ? Math.round((renvoyes.length / sortis) * 100) : null,
    };
  }, [debut, parcels]);

  /**
   * Combien de jours chaque colis est reste, et dans quelle tranche.
   *
   * On compte les colis SORTIS — remis ou renvoyes. Un colis encore en rayon
   * n'a pas fini sa garde : l'inclure ferait baisser toutes les tranches
   * basses a mesure que le stock monte, sans qu'aucun comportement n'ait
   * change.
   */
  const repartition = useMemo(() => {
    const jours = (depart: string | null, parcel: ReportParcel) => {
      if (!depart || !parcel.received_at) return null;
      const recu = new Date(parcel.received_at);
      const sorti = new Date(depart);
      if (Number.isNaN(recu.getTime()) || Number.isNaN(sorti.getTime())) return null;
      return Math.floor((sorti.getTime() - recu.getTime()) / 86_400_000);
    };

    const compte: Record<string, number> = { j01: 0, j23: 0, j47: 0, renvoi: 0 };
    let total = 0;

    parcels.forEach((parcel) => {
      if (dansLaFenetre(parcel.returned_at, debut)) {
        compte.renvoi += 1;
        total += 1;
        return;
      }
      if (!dansLaFenetre(parcel.picked_up_at, debut)) return;
      const passes = jours(parcel.picked_up_at, parcel);
      if (passes === null) return;
      total += 1;
      if (passes <= 1) compte.j01 += 1;
      else if (passes <= 3) compte.j23 += 1;
      else compte.j47 += 1;
    });

    return {
      total,
      parts: TRANCHES.map((tranche) => ({
        ...tranche,
        nombre: compte[tranche.cle] ?? 0,
        pct: total > 0 ? Math.round(((compte[tranche.cle] ?? 0) / total) * 100) : null,
      })),
    };
  }, [debut, parcels]);

  /**
   * Le relevé d'activité, en CSV.
   *
   * Composé dans le navigateur à partir des colis déjà chargés : il ne porte
   * donc rien que l'écran n'ait pu montrer. Pas d'export serveur à inventer,
   * et pas de ligne exportée que le gérant n'aurait pas vue.
   */
  const telechargerCsv = () => {
    const retenus = parcels.filter(
      (parcel) =>
        dansLaFenetre(parcel.received_at, debut)
        || dansLaFenetre(parcel.picked_up_at, debut)
        || dansLaFenetre(parcel.returned_at, debut),
    );
    if (retenus.length === 0) return;

    const jour = (valeur: string | null) => {
      if (!valeur) return "";
      const date = new Date(valeur);
      return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("fr-FR");
    };
    const lignes = [
      ["Colis", "Recu le", "Remis le", "Reparti le", "Jours de garde"].join(";"),
      ...retenus.map((parcel) => {
        const sortie = parcel.picked_up_at || parcel.returned_at;
        let passes = "";
        if (sortie && parcel.received_at) {
          const recu = new Date(parcel.received_at);
          const fin = new Date(sortie);
          if (!Number.isNaN(recu.getTime()) && !Number.isNaN(fin.getTime())) {
            passes = String(Math.floor((fin.getTime() - recu.getTime()) / 86_400_000));
          }
        }
        return [
          `BV-${parcel.id}`,
          jour(parcel.received_at),
          jour(parcel.picked_up_at),
          jour(parcel.returned_at),
          passes,
        ].join(";");
      }),
    ];
    // BOM UTF-8 : sans lui, Excel ouvre « reçu » en « reÃ§u ».
    const blob = new Blob(["\ufeff" + lignes.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = `activite-relais-${periode}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Le relevé mensuel, en PDF.
   *
   * Il n'existe aucun générateur de PDF côté serveur pour le point relais, et
   * aucune bibliothèque PDF n'est embarquée — en ajouter une pour une page
   * alourdirait l'application installée. On ouvre donc une page imprimable et
   * on laisse le téléphone produire le PDF : c'est la fonction « Enregistrer
   * au format PDF » du système, et le fichier obtenu est un vrai PDF.
   */
  const telechargerPdf = () => {
    const fenetre = window.open("", "_blank");
    if (!fenetre) return;
    const lignes = repartition.parts
      .map(
        (part) =>
          `<tr><td>${part.label}</td><td style="text-align:right">${
            part.pct === null ? "—" : `${part.pct} %`
          }</td><td style="text-align:right">${nf(part.nombre)}</td></tr>`,
      )
      .join("");
    fenetre.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Relevé ${titreDe(periode, maintenant)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 32px; color: #0F172A; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .total { font-size: 32px; font-weight: 800; margin: 16px 0 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
  th, td { padding: 8px 0; border-bottom: 1px solid #E2E8F0; text-align: left; }
  .note { margin-top: 24px; font-size: 12px; color: #64748B; line-height: 1.6; }
</style></head><body>
<h1>${titreDe(periode, maintenant)}</h1>
<div class="total">${nf(totalGagne)} FCFA</div>
<table>
  <tr><th>Colis reçus</th><td style="text-align:right">${nf(volumes.recus)}</td><td></td></tr>
  <tr><th>Colis remis</th><td style="text-align:right">${nf(volumes.remis)}</td><td></td></tr>
  <tr><th>Repartis</th><td style="text-align:right">${nf(volumes.renvoyes)}</td><td></td></tr>
</table>
<table>
  <tr><th>Délai de retrait</th><th style="text-align:right">Part</th><th style="text-align:right">Colis</th></tr>
  ${lignes}
</table>
<p class="note">Garde gratuite jusqu'au 3e jour, puis ${nf(GARDE_TARIF_JOUR)} F par jour
jusqu'au 7e. Montants issus des règlements arrêtés par BelivaY.</p>
</body></html>`);
    fenetre.document.close();
    fenetre.focus();
    fenetre.print();
  };

  const sommet = Math.max(...barres.map((barre) => barre.montant), 1);
  const periodeLabel = PERIODES.find((p) => p.key === periode)?.label.toLowerCase() ?? "";

  return (
    <div className="space-y-4">
      {/* ── L'échelle de temps ─────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Période du rapport"
        className="grid grid-cols-3 gap-1 rounded-[14px] bg-[#E8EDF8] p-1 dark:bg-slate-800/70"
      >
        {PERIODES.map((item) => {
          const on = item.key === periode;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setPeriode(item.key)}
              className={`rounded-[11px] px-2 py-2.5 text-[13.5px] font-bold leading-tight transition active:scale-[.96] ${
                on
                  ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(60,35,15,.14)] dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ── L'argent ───────────────────────────────────────────────────── */}
      <section
        className="overflow-hidden rounded-[18px] px-[18px] pb-[18px] pt-4 text-white shadow-[0_6px_18px_rgba(14,27,56,.28)]"
        style={{
          backgroundImage:
            "radial-gradient(80% 120% at 96% -4%, rgba(239,106,0,.28) 0%, rgba(239,106,0,0) 62%),"
            + " linear-gradient(158deg, #0A1230 0%, #101E48 48%, #17296B 100%)",
        }}
      >
        <p className="text-[12.5px] font-black uppercase leading-none tracking-[0.09em] text-[#8FB0FF]">
          {titreDe(periode, maintenant)}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[34px] font-black leading-none tabular-nums">{nf(totalGagne)}</span>
          <span className="text-[15px] font-bold text-white/55">FCFA</span>
        </div>

        {barres.length === 0 ? (
          <p className="mt-5 text-[13.5px] font-medium text-white/60">
            {loading ? "Lecture de vos règlements…" : `Aucun règlement arrêté sur ${periodeLabel}.`}
          </p>
        ) : (
          <>
            {/* Les barres. La hauteur est proportionnelle au plus haut
                montant de la fenetre : c'est une comparaison entre semaines,
                pas une mesure absolue. */}
            <div className="mt-5 flex items-end justify-between gap-2.5" style={{ height: 150 }}>
              {barres.map((barre) => (
                <div key={barre.cle} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                  <span className="mb-1.5 text-center text-[11.5px] font-black tabular-nums text-white">
                    {court(barre.montant)}
                  </span>
                  <div
                    className="w-full rounded-[7px]"
                    style={{
                      // La barre se fond dans le bleu nuit par le bas : elle
                      // se lit comme une montee de chaleur, et n'ajoute pas
                      // une deuxieme ligne de base a celle de l'axe.
                      height: `${Math.max(6, (barre.montant / sommet) * 100)}%`,
                      backgroundImage:
                        "linear-gradient(180deg, #E8A10E 0%, #F2801B 38%, #9A6BA0 72%, #3B4F9E 100%)",
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between gap-2.5">
              {barres.map((barre) => (
                <span
                  key={barre.cle}
                  className="min-w-0 flex-1 text-center text-[11.5px] font-semibold tabular-nums text-white/60"
                >
                  {barre.label}
                </span>
              ))}
            </div>

            <p className="mt-4 text-[13px] font-medium leading-[1.5] text-white/55">
              Chaque colonne est un règlement arrêté, aux dates qui figurent sur votre relevé.
            </p>
          </>
        )}
      </section>

      {/* ── Les volumes ────────────────────────────────────────────────── */}
      <div className="pr-span grid grid-cols-2 gap-3">
        <Carte
          titre="Colis reçus"
          valeur={nf(volumes.recus)}
          detail={periode === "mois" ? `en ${MOIS.format(maintenant)}` : `sur ${periodeLabel}`}
        />
        <Carte
          titre="Colis remis"
          valeur={nf(volumes.remis)}
          detail={volumes.renvoyes > 0 ? `+ ${nf(volumes.renvoyes)} repartis` : "remis au client"}
        />
        <Carte
          titre="À temps"
          /* Sans colis sorti, le pourcentage n'existe pas. « 0 % » se lirait
             comme un echec, alors qu'il n'y a simplement rien a mesurer. */
          valeur={volumes.aTempsPct === null ? "—" : `${volumes.aTempsPct} %`}
          detail={`retirés en ${GARDE_JOURS} jours`}
          ton="text-[#1F7A4D] dark:text-emerald-400"
        />
        <Carte
          titre="Renvoyés"
          valeur={volumes.renvoyesPct === null ? "—" : `${volumes.renvoyesPct} %`}
          detail={`non retirés en ${GARDE_JOURS} jours`}
          ton="text-[#B42318] dark:text-red-400"
        />
      </div>

      {/* ── Délai de retrait ─────────────────────────────────────────────
          Ce que le temps de garde coûte au client, et rapporte au relais.
          La barre d'abord : une proportion se lit avant un tableau. */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-4 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
          Délai de retrait
        </h3>

        {repartition.total === 0 ? (
          <p className="py-6 text-center text-[13.5px] font-medium text-slate-400 dark:text-slate-500">
            Aucun colis n'est encore sorti sur {periodeLabel}.
          </p>
        ) : (
          <>
            <div className="mt-3 flex h-[11px] overflow-hidden rounded-full" aria-hidden>
              {repartition.parts.map((part) =>
                part.nombre > 0 ? (
                  <span
                    key={part.cle}
                    className={part.barre}
                    style={{ width: `${(part.nombre / repartition.total) * 100}%` }}
                  />
                ) : null,
              )}
            </div>

            <dl className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {repartition.parts.map((part) => (
                <div key={part.cle} className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-[14px] font-medium text-slate-500 dark:text-slate-400">{part.label}</dt>
                  <dd className={`text-right text-[14px] font-black tabular-nums ${part.texte}`}>
                    {part.pct === null ? "—" : `${part.pct} %`}
                  </dd>
                </div>
              ))}
            </dl>

            {/*
              Le montant vient du code de facturation, pas de la maquette.
              `RelayParcel.GARDE_DAILY_FEE_XAF` vaut 200 F, et la gratuite
              court jusqu'a J+3. Annoncer autre chose ferait deux verites sur
              la meme ligne de facture.
            */}
            <p className="mt-2 text-[13px] font-medium leading-[1.5] text-slate-400 dark:text-slate-500">
              Plus un colis part tôt, plus votre place tourne. La garde est offerte jusqu'au 3e jour,
              puis facturée {nf(GARDE_TARIF_JOUR)} F par jour au client jusqu'au 7e.
            </p>
          </>
        )}
      </section>

      {/* ── Télécharger ──────────────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-2 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
          Télécharger
        </h3>
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          <LigneExport
            icon={FileText}
            titre="Relevé mensuel · PDF"
            detail="Montants, colis et garde, pour votre comptabilité"
            onClick={telechargerPdf}
          />
          <LigneExport
            icon={FileSpreadsheet}
            titre="Relevé d'activité · CSV"
            detail="Chaque réception, remise et retour"
            onClick={telechargerCsv}
          />
        </ul>
      </section>
    </div>
  );
}

/** Une ligne de téléchargement : icône pêche, libellé, flèche à droite. */
function LigneExport({
  icon: Icon,
  titre,
  detail,
  onClick,
}: {
  icon: typeof FileText;
  titre: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 py-3.5 text-left transition active:scale-[.99]"
      >
        <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] bg-[#FFF1E2] text-[#EF6A00] dark:bg-orange-950/50 dark:text-orange-300">
          <Icon size={19} strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
            {titre}
          </span>
          <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
            {detail}
          </span>
        </span>
        <Download size={19} strokeWidth={2.2} className="flex-shrink-0 text-[#EF6A00] dark:text-orange-400" />
      </button>
    </li>
  );
}

function Carte({
  titre,
  valeur,
  detail,
  ton = "text-slate-900 dark:text-white",
}: {
  titre: string;
  valeur: string;
  detail: string;
  ton?: string;
}) {
  return (
    <div className="rounded-[14px] border border-slate-200 bg-white px-4 pb-4 pt-3.5 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
      <div className="text-[11.5px] font-black uppercase leading-none tracking-[0.08em] text-slate-400 dark:text-slate-500">
        {titre}
      </div>
      <div className={`mt-2.5 text-[27px] font-black leading-none tabular-nums ${ton}`}>{valeur}</div>
      <div className="mt-2 text-[12.5px] font-medium leading-snug text-slate-500 dark:text-slate-400">
        {detail}
      </div>
    </div>
  );
}
