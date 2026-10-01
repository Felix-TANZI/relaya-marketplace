/**
 * Vos versements.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA QUESTION QUE SE POSE UN GÉRANT
 *
 * Pas « quel est mon chiffre d'affaires » — « combien, quand, et sur quel
 * numéro ». Trois réponses, dans cet ordre, et la carte orange les donne
 * toutes les trois avant qu'on ait fait défiler.
 *
 * Le tableau qui suit existe pour une seule raison : qu'un montant ne soit
 * jamais un chiffre tombé du ciel. Un gérant qui ne peut pas reconstituer sa
 * semaine appelle le support, ou pire, cesse de faire confiance.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * D'OÙ VIENNENT LES CHIFFRES
 *
 * Le total affiché est celui du serveur — `net_amount_xaf` du dernier relevé,
 * ou `due_xaf` tant qu'aucun relevé n'est clos. Les lignes du tableau sont
 * les lignes réelles de ce relevé, regroupées par composant. La somme des
 * lignes ÉGALE donc le total, toujours : c'est la seule façon qu'un tableau
 * de paie soit utile plutôt qu'inquiétant.
 *
 * Tant qu'aucun relevé n'existe, le tableau montre la grille tarifaire du
 * contrat — ce qui sera payé, plutôt qu'un tableau vide.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, CircleHelp, ShoppingCart, Smartphone, TriangleAlert } from "lucide-react";
import { http } from "@/services/api/http";
import {
  compteARebours,
  formatLong,
  formatPeriode,
  getRelayDue,
  getRelayTariff,
  humaniserBlocage,
  listRelayPayouts,
  listRelaySettlements,
  type RelayAmountDue,
  type RelayPayout,
  type RelaySettlement,
  type RelayTariffLine,
} from "@/services/api/relaySettlements";

const nf = (value: number) => value.toLocaleString("fr-FR");

/** Libellés des composants financiers, tels qu'ils se disent au gérant. */
const COMPOSANTS: Record<string, string> = {
  RELAY_HANDLING: "Colis remis",
  TRANSPORT: "Transport",
  GOODS: "Marchandise",
};

/** Couleurs des opérateurs Mobile Money du Cameroun. */
const OPERATEUR: Record<string, string> = {
  MTN: "bg-[#FFCC00] text-[#1B2540]",
  ORANGE: "bg-white text-[#E8590C]",
};

/**
 * Les termes du versement, tels que le contrat les fixe.
 *
 * Ce ne sont pas des données du serveur : aucun champ ne porte l'heure
 * d'arrêté, les frais ni le minimum. Ce sont des engagements de BelivaY, et
 * ils sont affichés ici parce que c'est la première chose qu'un gérant
 * vérifie avant de faire confiance à un versement automatique.
 */
const TERMES: Array<[string, string]> = [
  ["Arrêté", "jeudi minuit"],
  ["Frais", "aucun"],
  ["Minimum", "aucun"],
];

/** Les deux pannes de versement, et ce qu'il faut en faire. */
const SOUCIS: Array<{ id: string; icon: typeof Check; tone: string; title: string; body: string }> = [
  {
    id: "non-recu",
    icon: CircleHelp,
    tone: "bg-[#EAF1FE] text-[#4F7DF3] dark:bg-blue-950 dark:text-blue-300",
    title: "Versement non reçu",
    body: "Signalez-le avec la référence : réponse avant lundi midi",
  },
  {
    id: "refuse",
    icon: TriangleAlert,
    tone: "bg-[#FDECEC] text-[#E05B5B] dark:bg-red-950 dark:text-red-300",
    title: "Versement refusé",
    body:
      "Numéro au nom d'un tiers, compte plein ou préfixe qui ne correspond pas : 3 nouveaux essais "
      + "à 24 h d'intervalle, puis suspension et appel du support",
  },
];

/**
 * Le compte Mobile Money sur lequel BelivaY verse.
 *
 * Lu ici en lecture seule : le changement de numero a son propre parcours
 * (deux codes SMS puis verification humaine), porte par
 * `PayoutAccountVerificationCard` juste en dessous. Dupliquer ce parcours
 * ferait exister deux chemins pour la meme chose, et l'un des deux finirait
 * par diverger.
 */
interface PayoutAccount {
  id: number;
  operator: string;
  status: "PENDING_VERIFICATION" | "VERIFIED" | "DISABLED";
  is_primary: boolean;
  masked_phone: string;
  verified_at: string | null;
}

const OPERATEUR_COURT: Record<string, string> = {
  MTN_MOMO: "MTN",
  MTN: "MTN",
  ORANGE_MONEY: "Orange",
  ORANGE: "Orange",
};

const JOUR_MOIS = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

const MOIS = new Intl.DateTimeFormat("fr-FR", { month: "long" });
const JOUR_COURT = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric" });

export default function RelayPayouts({
  onSupport,
  onChangeNumber,
}: {
  onSupport: () => void;
  /** Deroule la carte de verification, seul endroit ou le numero se change. */
  onChangeNumber: () => void;
}) {
  const { t } = useTranslation();
  const [due, setDue] = useState<RelayAmountDue | null>(null);
  const [settlements, setSettlements] = useState<RelaySettlement[]>([]);
  const [payouts, setPayouts] = useState<RelayPayout[]>([]);
  const [grille, setGrille] = useState<RelayTariffLine[]>([]);
  const [compte, setCompte] = useState<PayoutAccount | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let monte = true;
    Promise.all([
      getRelayDue(),
      listRelaySettlements().catch(() => [] as RelaySettlement[]),
      listRelayPayouts().catch(() => [] as RelayPayout[]),
      getRelayTariff().catch(() => [] as RelayTariffLine[]),
      http<PayoutAccount[]>("/api/auth/payout-accounts/").catch(() => [] as PayoutAccount[]),
    ])
      .then(([d, r, v, g, c]) => {
        if (!monte) return;
        setDue(d);
        setSettlements(r);
        setPayouts(v);
        setGrille(g);
        // Le compte principal fait foi ; a defaut, le premier verifie.
        setCompte(c.find((item) => item.is_primary) ?? c.find((item) => item.status === "VERIFIED") ?? c[0] ?? null);
      })
      .catch((exc: unknown) => {
        if (monte) setErreur(exc instanceof Error ? exc.message : "Impossible de charger vos versements.");
      });
    return () => { monte = false; };
  }, []);

  // Le relevé le plus récent porte la semaine qu'on détaille.
  const releve = settlements[0] ?? null;
  const montant = releve ? releve.net_amount_xaf : due?.due_xaf ?? 0;

  // Le dernier numéro utilisé fait foi : c'est celui que le gérant reconnaît.
  const versement = payouts[0] ?? null;
  const operateur = (versement?.payee_operator || "").toUpperCase();

  /**
   * Les versements crédités ce mois-ci.
   *
   * On filtre sur `settled_at` et non sur la demande : ce qui compte pour le
   * gérant, c'est l'argent arrivé, pas l'ordre parti.
   */
  const maintenant = new Date();
  const duMois = payouts.filter((versement) => {
    if (!versement.settled_at) return false;
    const date = new Date(versement.settled_at);
    return (
      !Number.isNaN(date.getTime())
      && date.getMonth() === maintenant.getMonth()
      && date.getFullYear() === maintenant.getFullYear()
    );
  });
  const totalMois = duMois.reduce((somme, versement) => somme + versement.amount_xaf, 0);

  const blocage = due?.blockers?.[0];
  const quand = blocage
    ? humaniserBlocage(blocage, t)
    : due?.next_settlement_at
      ? `Prévu · ${formatLong(due.next_settlement_at)}`
      : due?.next_settlement_cycle || "Prochain versement";

  /**
   * Les lignes du relevé, regroupées par composant.
   *
   * Le tarif affiché est le montant unitaire quand toutes les lignes du
   * groupe portent le même ; sinon la moyenne, signalée par « ~ ». Annoncer
   * un tarif unique là où il varie ferait mentir la colonne.
   */
  const lignes = releve
    ? [...releve.lines.reduce((carte, ligne) => {
        const cle = ligne.component || "AUTRE";
        const groupe = carte.get(cle) ?? { qte: 0, total: 0, tarifs: new Set<number>() };
        groupe.qte += 1;
        groupe.total += ligne.net_xaf;
        groupe.tarifs.add(ligne.net_xaf);
        carte.set(cle, groupe);
        return carte;
      }, new Map<string, { qte: number; total: number; tarifs: Set<number> }>())]
      .map(([cle, groupe]) => ({
        libelle: COMPOSANTS[cle] || cle,
        qte: groupe.qte,
        tarif: groupe.tarifs.size === 1 ? `${nf([...groupe.tarifs][0])} F` : `~ ${nf(Math.round(groupe.total / groupe.qte))} F`,
        total: groupe.total,
      }))
    : [];

  return (
    <div className="space-y-4">
      <header className="pt-0.5">
        <h2 className="text-[27px] font-black leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white">
          Vos versements
        </h2>
        <p className="mt-1.5 text-[14.5px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
          Chaque vendredi avant 12 h, sans frais, sans rien demander.
        </p>
      </header>

      {erreur ? (
        <div className="rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[13.5px] font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {erreur}
        </div>
      ) : null}

      {/* ── Le prochain versement ────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[18px] bg-gradient-to-br from-[#F79020] via-[#F07E16] to-[#E85D04] px-5 pb-5 pt-4 text-white shadow-[0_8px_22px_rgba(232,93,4,.3)]">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12px] font-black uppercase leading-[1.3] tracking-[0.09em] text-white">
            {quand}
          </p>
          <ShoppingCart size={26} strokeWidth={2} className="flex-shrink-0 text-white/90" />
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-[42px] font-black leading-none tracking-[-0.025em]">{nf(montant)}</span>
          <span className="text-[15px] font-black uppercase tracking-[0.04em] text-white/90">FCFA</span>
        </div>

        {due?.next_settlement_at && !blocage ? (
          <p className="mt-1.5 text-[13px] font-semibold text-white/80">
            {compteARebours(due.next_settlement_at, t)}
          </p>
        ) : null}

        <div className="mt-6 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-white/75">
              Sera versé sur
            </p>
            <p className="mt-1 truncate font-mono text-[19px] font-black tracking-[0.06em]">
              {versement?.payee_msisdn_masked
                ? `${operateur || "MoMo"} ${versement.payee_msisdn_masked}`
                : "Numéro à configurer"}
            </p>
          </div>
          {operateur ? (
            <span
              className={`flex-shrink-0 rounded-[8px] px-3 py-1.5 text-[13px] font-black ${
                OPERATEUR[operateur] || "bg-white text-[#E8590C]"
              }`}
            >
              {operateur}
            </span>
          ) : null}
        </div>
      </section>

      {/* ── Le détail ────────────────────────────────────────────────────── */}
      <section className="rounded-[18px] border border-slate-200/70 bg-white px-5 pb-5 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[19px] font-black tracking-[-0.015em] text-slate-900 dark:text-white">
          Le détail de la semaine
        </h3>
        {releve ? (
          <p className="mt-0.5 text-[12.5px] font-medium text-slate-400 dark:text-slate-500">
            {formatPeriode(releve.period_start, releve.period_end, t)}
          </p>
        ) : null}

        {lignes.length > 0 ? (
          <table className="mt-3 w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="pb-2 text-left text-[11px] font-black uppercase tracking-[0.07em] text-slate-400">Ligne</th>
                <th className="pb-2 text-right text-[11px] font-black uppercase tracking-[0.07em] text-slate-400">Qté</th>
                <th className="pb-2 text-right text-[11px] font-black uppercase tracking-[0.07em] text-slate-400">Tarif</th>
                <th className="pb-2 text-right text-[11px] font-black uppercase tracking-[0.07em] text-slate-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne) => (
                <tr key={ligne.libelle} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-3 text-left text-[14.5px] font-medium text-slate-900 dark:text-white">{ligne.libelle}</td>
                  <td className="py-3 text-right text-[14.5px] font-medium text-slate-900 dark:text-white">{ligne.qte}</td>
                  <td className="py-3 text-right text-[14.5px] font-medium text-slate-900 dark:text-white">{ligne.tarif}</td>
                  <td className="py-3 text-right text-[14.5px] font-medium text-slate-900 dark:text-white">{nf(ligne.total)} F</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : grille.length > 0 ? (
          <>
            <p className="mt-3 text-[13px] font-medium leading-[1.5] text-slate-500 dark:text-slate-400">
              Aucun relevé clos pour l'instant. Voici ce que votre contrat prévoit par colis remis.
            </p>
            <table className="mt-3 w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-2 text-left text-[11px] font-black uppercase tracking-[0.07em] text-slate-400">Ligne</th>
                  <th className="pb-2 text-right text-[11px] font-black uppercase tracking-[0.07em] text-slate-400">Tarif</th>
                </tr>
              </thead>
              <tbody>
                {grille.map((ligne) => (
                  <tr key={ligne.parcel_size} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 text-left text-[14.5px] font-medium text-slate-900 dark:text-white">
                      {ligne.parcel_size_label}
                    </td>
                    <td className="py-3 text-right text-[14.5px] font-medium text-slate-900 dark:text-white">
                      {nf(ligne.amount_xaf)} F
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="mt-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">
            Votre grille tarifaire n'est pas encore configurée. Le support la met en place à
            l'activation du relais.
          </p>
        )}

        <div className="mt-3 flex items-baseline justify-between gap-3">
          <span className="text-[19px] font-black text-slate-900 dark:text-white">Total</span>
          <span className="text-[19px] font-black text-[#E8590C] dark:text-orange-400">{nf(montant)} F</span>
        </div>

        <p className="mt-2 text-[13px] font-medium leading-[1.5] text-slate-400 dark:text-slate-500">
          C'est BelivaY qui vous paie, même quand la livraison est offerte au client.
        </p>
      </section>
      {/* ── Les termes du contrat ────────────────────────────────────────
          Trois faits, cote a cote, qu'un gerant verifie une fois puis oublie.
          C'est justement pour ca qu'ils sont courts et toujours la : la
          confiance dans un versement automatique se construit avant le
          premier versement, pas apres. */}
      <div className="grid grid-cols-3 gap-2.5">
        {TERMES.map(([titre, valeur]) => (
          <div
            key={titre}
            className="rounded-[14px] border border-slate-200/70 bg-white px-2 py-3 text-center shadow-[0_2px_6px_rgba(15,23,42,.05)] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="text-[11px] font-black uppercase leading-none tracking-[0.08em] text-slate-400 dark:text-slate-500">
              {titre}
            </div>
            <div className="mt-2 text-[14.5px] font-black leading-tight text-slate-900 dark:text-white">
              {valeur}
            </div>
          </div>
        ))}
      </div>

      {/* ── Ce qui est arrivé ────────────────────────────────────────────── */}
      <section className="rounded-[18px] border border-slate-200/70 bg-white px-5 pb-5 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[19px] font-black capitalize tracking-[-0.015em] text-slate-900 dark:text-white">
            Reçus en {MOIS.format(maintenant)}
          </h3>
          <span className="flex-shrink-0 rounded-full border border-[#B7E0C4] bg-[#F1FAF3] px-3 py-[5px] text-[12.5px] font-bold text-[#2E7D4F] dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            {nf(totalMois)} F
          </span>
        </div>

        {duMois.length === 0 ? (
          <p className="py-5 text-[13.5px] font-medium text-slate-400 dark:text-slate-500">
            Aucun versement crédité ce mois-ci pour l'instant.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {duMois.map((versement) => (
              <li key={versement.reference} className="flex items-center gap-3 py-3.5">
                <Check size={19} strokeWidth={3} className="flex-shrink-0 text-[#2E7D4F] dark:text-emerald-400" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-black capitalize leading-tight text-slate-900 dark:text-white">
                    {JOUR_COURT.format(new Date(versement.settled_at as string))} · {versement.status_label.toLowerCase()}
                  </span>
                  <span className="mt-1 block truncate font-mono text-[12px] font-medium text-slate-400 dark:text-slate-500">
                    {versement.reference}
                  </span>
                </span>
                <span className="flex-shrink-0 text-[15px] font-black text-slate-900 dark:text-white">
                  {nf(versement.amount_xaf)} F
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[13px] font-medium leading-[1.5] text-slate-400 dark:text-slate-500">
          La référence est annoncée à l'arrêté du jeudi minuit et figure sur votre relevé MoMo :
          c'est votre preuve auprès de l'opérateur.
        </p>
      </section>

      {/* ── Quand ça coince ──────────────────────────────────────────────── */}
      <section className="rounded-[18px] border border-slate-200/70 bg-white px-5 pb-5 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[19px] font-black tracking-[-0.015em] text-slate-900 dark:text-white">
          Un souci de versement ?
        </h3>
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          {SOUCIS.map(({ id, icon: Icon, tone, title, body }) => (
            <li key={id}>
              <button
                type="button"
                onClick={onSupport}
                className="flex w-full items-start gap-3 py-3.5 text-left transition active:scale-[.99]"
              >
                <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] ${tone}`}>
                  <Icon size={18} strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                    {title}
                  </span>
                  <span className="mt-1 block text-[13px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
                    {body}
                  </span>
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className="mt-1 h-[18px] w-[18px] flex-shrink-0 text-slate-300 dark:text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] font-medium leading-[1.5] text-slate-400 dark:text-slate-500">
          Un versement est prévu, envoyé, crédité, refusé ou suspendu : son état s'affiche ici et
          dans les notifications.
        </p>
      </section>
      {/* ── Le numéro ────────────────────────────────────────────────────
          Dernier bloc de l'écran, et c'est voulu : on ne vient pas ici pour
          changer de numéro, on vient voir son argent. Mais quand un versement
          est refusé, c'est la première chose à vérifier — d'où sa présence
          sur la même page plutôt que dans les réglages. */}
      <section className="rounded-[18px] border border-slate-200/70 bg-white px-5 pb-5 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-[#E8F6EC] text-[#2E7D4F] dark:bg-emerald-950 dark:text-emerald-300">
            <Smartphone size={19} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-black leading-tight text-slate-900 dark:text-white">
              Numéro de versement
            </div>
            <p className="mt-1 text-[13px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
              {compte
                ? [
                    `${OPERATEUR_COURT[compte.operator] || compte.operator} ${compte.masked_phone}`,
                    compte.status === "VERIFIED" && compte.verified_at
                      ? `vérifié par code le ${JOUR_MOIS.format(new Date(compte.verified_at))}`
                      : compte.status === "PENDING_VERIFICATION"
                        ? "code de vérification en attente"
                        : "compte désactivé",
                  ].join(" · ")
                : "Aucun numéro enregistré — les versements sont suspendus tant qu'il manque."}
            </p>
          </div>
          {compte ? (
            <span
              className={`flex-shrink-0 rounded-full border px-3 py-[5px] text-[12.5px] font-bold ${
                compte.status === "VERIFIED"
                  ? "border-[#B7E0C4] bg-[#F1FAF3] text-[#2E7D4F] dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-[#F2D79B] bg-[#FDF6E3] text-[#B4791A] dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              {compte.status === "VERIFIED" ? "Vérifié" : compte.status === "DISABLED" ? "Désactivé" : "À vérifier"}
            </span>
          ) : null}
        </div>

        <p className="mt-4 text-[13px] font-medium leading-[1.5] text-slate-400 dark:text-slate-500">
          Un nouveau numéro se confirme par deux codes SMS, puis une personne le vérifie : versements
          suspendus 7 jours, rien n'est perdu.
        </p>

        <button
          type="button"
          onClick={onChangeNumber}
          className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-[12px] border border-slate-200 bg-white px-4 py-3.5 text-[16px] font-bold text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <Smartphone size={18} strokeWidth={2.2} /> Changer de numéro
        </button>
      </section>
    </div>
  );
}
