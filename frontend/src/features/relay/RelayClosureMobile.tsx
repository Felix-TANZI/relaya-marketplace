/**
 * Fermeture exceptionnelle — prévenir avant de baisser le rideau.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI CET ÉCRAN EXISTE
 *
 * Un relais fermé sans préavis, ce sont des clients devant une porte close
 * et des colis que personne ne peut remettre. Déclarer ne protège pas
 * BelivaY : ça protège le gérant. C'est la déclaration qui déclenche le
 * transfert des colis et l'information des clients — sans elle, les colis
 * restent à son nom, et la garde continue de courir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE CALENDRIER, PLUS LARGE QUE LA MAQUETTE
 *
 * La maquette montre sept jours figés. Sept jours ne suffisent pas : un
 * congé se pose des semaines à l'avance, et le préavis de 48 h du motif
 * « Congé » suppose justement qu'on regarde plus loin que la semaine.
 *
 * La bande court donc sur huit semaines, défile, affiche le changement de
 * mois, et se prend en deux touches — un début, une fin. Les jours passés
 * sont éteints : on ne ferme pas hier.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUE LE SERVEUR SAIT FAIRE, ET CE QU'IL NE SAIT PAS
 *
 * Il n'existe aucun modèle de fermeture : pas de table, pas d'endpoint, pas
 * de transfert automatique. La déclaration part donc en message au support
 * (`/api/contact/`), horodatée et complète, et c'est une personne qui agit.
 * L'écran le dit — promettre un transfert automatique ferait partir un
 * gérant tranquille sur une mécanique qui n'existe pas.
 */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, CalendarX2, Check, Clock3, Truck, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { http } from "@/services/api/http";

interface ClosureParcel {
  status: string;
}

export interface RelayClosureMobileProps {
  onError: (error: unknown) => void;
  /** Identité du déclarant, reprise du profil relais de la page parente. */
  relay: { name: string; email: string; phone: string };
}

interface Motif {
  key: string;
  icon: LucideIcon;
  label: string;
  rule: string;
  /** Préavis minimum en heures avant le début. 0 = déclarable le jour même. */
  noticeHours: number;
  /** Justificatif attendu après coup. */
  proof: string;
}

/**
 * Les quatre motifs du contrat.
 *
 * Le préavis distingue le congé — qui se prévoit — des trois autres, qui
 * tombent sans prévenir. C'est la seule règle que l'écran fait respecter :
 * un congé posé pour demain est refusé avant l'envoi, pas après.
 */
const MOTIFS: Motif[] = [
  {
    key: "conge",
    icon: CalendarDays,
    label: "Congé",
    rule: "À déclarer 48 h avant · aucun justificatif",
    noticeHours: 48,
    proof: "Aucun justificatif requis.",
  },
  {
    key: "maladie",
    icon: AlertTriangle,
    label: "Maladie",
    rule: "Le jour même · justificatif sous 48 h",
    noticeHours: 0,
    proof: "Certificat médical à téléverser sous 48 h dans Documents KYC.",
  },
  {
    key: "famille",
    icon: User,
    label: "Urgence familiale",
    rule: "Le jour même · justificatif sous 7 jours",
    noticeHours: 0,
    proof: "Justificatif à téléverser sous 7 jours dans Documents KYC.",
  },
  {
    key: "force-majeure",
    icon: AlertTriangle,
    label: "Force majeure",
    rule: "Coupure, inondation, sinistre",
    noticeHours: 0,
    proof: "Déclaration de sinistre ou dépôt de plainte à joindre au dossier.",
  },
];

/**
 * Les trois tranches de durée, et ce qu'elles déclenchent.
 *
 * La tranche n'est pas un choix indépendant des dates : elle les SUIT, et
 * la toucher les ajuste. Deux réglages qui disent chacun une durée
 * différente, c'est une déclaration dont personne ne sait ce qu'elle couvre.
 */
interface Tranche {
  key: string;
  label: string;
  /** Durée maximale de la tranche, en jours pleins. */
  maxJours: number;
  /** Nombre de jours posé quand on touche la tranche. */
  jours: number;
  icon: LucideIcon;
  /** Résumé court, pour la liste des fermetures passées. */
  impact: string;
  boite: string;
  texte: string;
  corps: string;
}

const TRANCHES: Tranche[] = [
  {
    key: "court",
    label: "< 24 h",
    maxJours: 1,
    jours: 1,
    icon: Clock3,
    impact: "Sans impact",
    boite: "border-[#BFE3CF] bg-[#E6F4EC] dark:border-emerald-800 dark:bg-emerald-950/30",
    texte: "text-[#1F7A4D] dark:text-emerald-300",
    corps:
      "Rien ne bouge : vous gardez les colis. Les clients voient « rouvre demain », les livreurs ne passent pas.",
  },
  {
    key: "moyen",
    label: "1 à 3 jours",
    maxJours: 3,
    jours: 3,
    icon: Truck,
    impact: "Transfert",
    boite: "border-[#C9D7FB] bg-[#EAF0FF] dark:border-blue-800 dark:bg-blue-950/30",
    texte: "text-[#2456D6] dark:text-blue-300",
    corps:
      "Plus aucun nouveau colis dès la veille. Vos colis partent au relais partenaire le plus proche avec la dernière collecte ; les clients reçoivent la nouvelle adresse et un nouveau code, et leurs jours offerts repartent de zéro.",
  },
  {
    key: "long",
    label: "> 3 jours",
    maxJours: Infinity,
    jours: 7,
    icon: AlertTriangle,
    impact: "Relais masqué",
    boite: "border-[#F0DA9C] bg-[#FFF4D6] dark:border-amber-800 dark:bg-amber-950/30",
    texte: "text-[#8A5A00] dark:text-amber-300",
    corps:
      "Idem, et votre relais est masqué du choix des clients jusqu'à votre retour. Au-delà de 14 jours, BelivaY vous appelle pour faire le point.",
  },
];

/**
 * Les fermetures déjà déclarées.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ELLES VIVENT DANS CE TÉLÉPHONE, PAS SUR LE SERVEUR
 *
 * Aucun modèle de fermeture n'existe : la déclaration part en message au
 * support, qui n'en renvoie pas de liste. L'historique est donc local — il
 * disparaît si le gérant change d'appareil ou vide ses données, et un autre
 * employé ne le verra pas. C'est un pense-bête, pas un registre, et l'écran
 * le dit.
 */
const STORAGE_KEY = "belivay.relay.closures";

interface ClosureDeclaration {
  id: string;
  reasonLabel: string;
  from: string;
  to: string;
  jours: number;
  impact: string;
  /** Préavis effectivement donné, en jours. */
  preavisJours: number;
  declaredAt: string;
}

function lireFermetures(): ClosureDeclaration[] {
  try {
    const brut = window.localStorage.getItem(STORAGE_KEY);
    const lu = brut ? JSON.parse(brut) : [];
    return Array.isArray(lu) ? lu.filter((item) => item && item.from && item.to) : [];
  } catch {
    // Mode prive, stockage bloque, JSON abime : l'ecran marche sans historique.
    return [];
  }
}

/** Huit semaines : un congé se pose plus loin que la semaine en cours. */
const JOURS_AFFICHES = 56;

const JOUR_COURT = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const JOUR_LONG = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const MOIS = new Intl.DateTimeFormat("fr-FR", { month: "long" });
const JOUR_COURT_MOIS = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

/** Clé stable d'un jour, indépendante du fuseau. */
const cle = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function RelayClosureMobile({ onError, relay }: RelayClosureMobileProps) {
  // Minuit d'aujourd'hui, figé au montage : la bande ne doit pas se décaler
  // sous les doigts si la page vit jusqu'au lendemain.
  const [aujourdhui] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const [debut, setDebut] = useState<string | null>(null);
  const [fin, setFin] = useState<string | null>(null);
  const [motifKey, setMotifKey] = useState(MOTIFS[0].key);
  const [stock, setStock] = useState(0);
  const [busy, setBusy] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [passees, setPassees] = useState<ClosureDeclaration[]>(lireFermetures);

  useEffect(() => {
    let vivant = true;
    http<ClosureParcel[]>("/api/shipping/relay-point/parcels/")
      .then((colis) => {
        if (!vivant) return;
        setStock(
          (Array.isArray(colis) ? colis : []).filter((parcel) =>
            ["RECEIVED", "STORED"].includes(parcel.status),
          ).length,
        );
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);

  const jours = useMemo(
    () =>
      Array.from({ length: JOURS_AFFICHES }, (_, index) => {
        const date = new Date(aujourdhui);
        date.setDate(date.getDate() + index);
        return date;
      }),
    [aujourdhui],
  );

  const motif = MOTIFS.find((item) => item.key === motifKey) ?? MOTIFS[0];

  /**
   * Une touche pose le début, la suivante pose la fin.
   *
   * Toucher un jour ANTÉRIEUR au début en cours repart de ce jour plutôt que
   * de créer une plage à l'envers : au comptoir on corrige en re-touchant,
   * on ne vient pas chercher un bouton « recommencer ».
   */
  const choisir = (date: Date) => {
    const valeur = cle(date);
    if (!debut || (debut && fin)) {
      setDebut(valeur);
      setFin(null);
      return;
    }
    if (valeur < debut) {
      setDebut(valeur);
      return;
    }
    setFin(valeur);
  };

  const dans = (date: Date) => {
    const valeur = cle(date);
    if (!debut) return false;
    if (!fin) return valeur === debut;
    return valeur >= debut && valeur <= fin;
  };

  // Memoisees sur les CHAINES : un `new Date()` recree a chaque rendu rendrait
  // instables les dependances des calculs qui suivent, et chaque rendu
  // recalculerait la duree, la consigne et le preavis pour rien.
  const dateDebut = useMemo(() => (debut ? new Date(`${debut}T00:00:00`) : null), [debut]);
  const dateFin = useMemo(
    () => (fin ? new Date(`${fin}T00:00:00`) : dateDebut),
    [dateDebut, fin],
  );

  /** Le jour de réouverture : le lendemain du dernier jour fermé. */
  const reouverture = useMemo(() => {
    if (!dateFin) return null;
    const date = new Date(dateFin);
    date.setDate(date.getDate() + 1);
    return date;
  }, [dateFin]);

  const heures = useMemo(() => {
    if (!dateDebut || !dateFin) return 0;
    // Bornes incluses : fermer « du 2 au 4 » couvre trois journées.
    return ((dateFin.getTime() - dateDebut.getTime()) / 3_600_000) + 24;
  }, [dateDebut, dateFin]);

  /** Jours pleins couverts par la fermeture, bornes incluses. */
  const joursFermes = Math.max(0, Math.round(heures / 24));

  /**
   * La tranche SUIT les dates.
   *
   * Tant qu'aucune date n'est posee, on affiche la premiere sans rien
   * affirmer : une tranche surlignee sur un calendrier vide laisserait
   * croire qu'une duree est deja choisie.
   */
  const tranche = useMemo(
    () => TRANCHES.find((item) => joursFermes <= item.maxJours) ?? TRANCHES[TRANCHES.length - 1],
    [joursFermes],
  );

  /**
   * Toucher une tranche pose la fin a partir du debut.
   *
   * Sans debut, on part d'aujourd'hui : le gerant qui attaque par la duree
   * veut fermer maintenant, pas choisir une date d'abord.
   */
  const choisirTranche = (item: Tranche) => {
    const depart = dateDebut ?? aujourdhui;
    const arrivee = new Date(depart);
    arrivee.setDate(arrivee.getDate() + item.jours - 1);
    setDebut(cle(depart));
    setFin(cle(arrivee));
  };

  /** Préavis réellement disponible entre maintenant et le premier jour fermé. */
  const preavisManquant = useMemo(() => {
    if (!dateDebut || motif.noticeHours === 0) return 0;
    const disponible = (dateDebut.getTime() - aujourdhui.getTime()) / 3_600_000;
    return Math.max(0, motif.noticeHours - disponible);
  }, [aujourdhui, dateDebut, motif.noticeHours]);

  const pret = Boolean(dateDebut && dateFin) && preavisManquant === 0;

  const envoyer = async () => {
    if (!pret || !dateDebut || !dateFin) return;
    setBusy(true);
    try {
      await http("/api/contact/", {
        method: "POST",
        body: JSON.stringify({
          name: relay.name,
          email: relay.email,
          phone: relay.phone,
          subject: `[Point relais] Fermeture exceptionnelle — ${motif.label}`,
          message: [
            `Point relais : ${relay.name}`,
            `Motif : ${motif.label}`,
            `Du ${JOUR_LONG.format(dateDebut)} au ${JOUR_LONG.format(dateFin)}`,
            reouverture ? `Réouverture : ${JOUR_LONG.format(reouverture)}` : "",
            `Colis en stock à la déclaration : ${stock}`,
            `Duree : ${joursFermes} jour${joursFermes > 1 ? "s" : ""} (${tranche.label})`,
            `Consequence : ${tranche.corps}`,
            `Justificatif : ${motif.proof}`,
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });
      // Pense-bete local : le serveur ne renvoie pas de liste des fermetures.
      const preavisJours = Math.max(
        0,
        Math.round((dateDebut.getTime() - aujourdhui.getTime()) / 86_400_000),
      );
      const declaration: ClosureDeclaration = {
        id: `${Date.now()}`,
        reasonLabel: motif.label,
        from: cle(dateDebut),
        to: cle(dateFin),
        jours: joursFermes,
        impact: tranche.impact,
        preavisJours,
        declaredAt: new Date().toISOString(),
      };
      const suite = [declaration, ...passees].slice(0, 20);
      setPassees(suite);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(suite));
      } catch {
        /* Stockage indisponible : la declaration est partie, c'est l'essentiel. */
      }
      setEnvoye(true);
    } catch (erreur) {
      onError(erreur);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="pt-0.5">
        <h2 className="text-[27px] font-black leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white">
          Fermeture exceptionnelle
        </h2>
        <p className="mt-1.5 text-[14.5px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
          Prévenez BelivaY : on s'occupe des colis et des clients.
        </p>
      </header>

      {/* ── Quand ? ────────────────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-5 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
          Quand ?
        </h3>

        {/* La bande défile : huit semaines ne tiennent pas en largeur, et un
            congé se pose au-delà de la semaine en cours. */}
        <div className="-mx-5 mt-3 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2">
            {jours.map((date, index) => {
              const actif = dans(date);
              const premier = debut === cle(date);
              const dernier = (fin ?? debut) === cle(date);
              // Le changement de mois se signale au premier jour du mois, et
              // au tout premier de la bande : sans ce repere, « 1 » apres
              // « 30 » ne dit pas lequel.
              const nouveauMois = index === 0 || date.getDate() === 1;
              return (
                <div key={cle(date)} className="flex flex-col items-center">
                  <span
                    className={`mb-1 h-[13px] text-[10px] font-black uppercase leading-none tracking-[0.06em] ${
                      nouveauMois ? "text-[#EF6A00] dark:text-orange-400" : "text-transparent"
                    }`}
                  >
                    {nouveauMois ? MOIS.format(date).slice(0, 4) : "."}
                  </span>
                  <button
                    type="button"
                    onClick={() => choisir(date)}
                    aria-pressed={actif}
                    aria-label={JOUR_LONG.format(date)}
                    className={`flex h-[62px] w-[52px] flex-col items-center justify-center gap-0.5 rounded-[12px] border transition active:scale-[.94] ${
                      actif
                        ? "border-transparent bg-[#2456D6] text-white shadow-[0_2px_8px_rgba(36,86,214,.35)]"
                        : "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    } ${premier || dernier ? "ring-2 ring-[#2456D6]/30" : ""}`}
                  >
                    <span className={`text-[11px] font-semibold ${actif ? "text-white/80" : "text-slate-400"}`}>
                      {JOUR_COURT.format(date)}
                    </span>
                    <span className="text-[17px] font-black leading-none tabular-nums">{date.getDate()}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <dl className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="text-[14px] font-medium text-slate-500 dark:text-slate-400">Du</dt>
            <dd className="text-right text-[14px] font-black text-slate-900 dark:text-white">
              {dateDebut ? JOUR_LONG.format(dateDebut) : "touchez un jour"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="text-[14px] font-medium text-slate-500 dark:text-slate-400">Au</dt>
            <dd className="text-right text-[14px] font-black text-slate-900 dark:text-white">
              {dateFin ? (
                <>
                  {JOUR_LONG.format(dateFin)}
                  {reouverture ? (
                    <span className="font-bold text-slate-500 dark:text-slate-400">
                      {" · réouverture "}
                      {JOUR_LONG.format(reouverture).replace(/ \d+ \w+$/, (m) => m)}
                    </span>
                  ) : null}
                </>
              ) : (
                "touchez un second jour"
              )}
            </dd>
          </div>
        </dl>
      </section>

      {/* ── Motif ──────────────────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-4 pb-4 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="px-1 text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
          Motif
        </h3>
        <div className="mt-3 space-y-2.5">
          {MOTIFS.map((item) => {
            const Icon = item.icon;
            const on = item.key === motifKey;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setMotifKey(item.key)}
                aria-pressed={on}
                className={`flex w-full items-start gap-3 rounded-[14px] border px-3.5 py-3 text-left transition active:scale-[.98] ${
                  on
                    ? "border-[#EF6A00] bg-[#FFF1E2] dark:border-orange-600 dark:bg-orange-950/30"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50"
                }`}
              >
                <Icon
                  size={19}
                  strokeWidth={2.2}
                  className={`mt-[2px] flex-shrink-0 ${
                    on ? "text-[#EF6A00] dark:text-orange-400" : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                    {item.rule}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Le preavis est la SEULE regle que l'ecran fait respecter avant
            l'envoi : un conge pose pour demain partirait sinon au support,
            qui le refuserait — un aller-retour pour rien. */}
        {preavisManquant > 0 ? (
          <p className="mt-3 rounded-[12px] border border-[#F0DA9C] bg-[#FFF4D6] px-3.5 py-3 text-[13px] font-semibold leading-snug text-[#8A5A00] dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            « {motif.label} » demande {motif.noticeHours} h de préavis. Il manque{" "}
            {Math.ceil(preavisManquant)} h : choisissez un début plus tardif, ou un autre motif.
          </p>
        ) : null}
      </section>

      {/* ── Durée ──────────────────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-4 pb-4 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="px-1 text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
          Durée
        </h3>

        {/* Les trois tranches SUIVENT les dates, et les ajustent quand on les
            touche. Un selecteur independant du calendrier laisserait deux
            durees contradictoires sur le meme ecran. */}
        <div
          role="tablist"
          aria-label="Durée de la fermeture"
          className="mt-3 grid grid-cols-3 gap-1 rounded-[14px] bg-[#E8EDF8] p-1 dark:bg-slate-800/70"
        >
          {TRANCHES.map((item) => {
            const on = dateDebut !== null && item.key === tranche.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => choisirTranche(item)}
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

        {dateDebut ? (
          <p
            className={`mt-3 flex items-start gap-2.5 rounded-[12px] border px-3.5 py-3 text-[13.5px] font-semibold leading-[1.5] ${tranche.boite} ${tranche.texte}`}
          >
            <tranche.icon size={18} strokeWidth={2.2} className="mt-[2px] flex-shrink-0" />
            <span>
              {/* Le nombre de colis vient du stock reel, pas d'un exemple :
                  c'est lui qui dit au gerant l'ampleur du transfert. */}
              {tranche.key === "moyen"
                ? tranche.corps.replace("Vos colis partent", `Vos ${stock} colis partent`)
                : tranche.corps}
            </span>
          </p>
        ) : (
          <p className="mt-3 text-[13.5px] font-medium text-slate-400 dark:text-slate-500">
            Choisissez une durée, ou touchez des jours dans le calendrier.
          </p>
        )}

        <p className="mt-3 px-1 text-[13px] font-medium leading-[1.5] text-slate-400 dark:text-slate-500">
          Les jours de fermeture ne sont jamais facturés au client, et le transfert ne vous coûte
          rien. Un employé peut déclarer une fermeture imprévue pour aujourd'hui ; les fermetures
          programmées restent réservées au gérant.
        </p>

        {/*
          Aucun modele de fermeture n'existe cote serveur : ni table, ni
          endpoint, ni transfert automatique. La declaration part en message au
          support, et c'est une personne qui agit. Le taire laisserait partir
          un gerant tranquille sur une mecanique inexistante.
        */}
        {dateDebut ? (
          <p className="mt-2 px-1 text-[13px] font-medium leading-[1.5] text-slate-400 dark:text-slate-500">
            Votre déclaration part au support, horodatée. Le transfert est organisé par une
            personne — il n'est pas automatique. {motif.proof}
          </p>
        ) : null}
      </section>

      {/* ── Déclarer ───────────────────────────────────────────────────── */}
      {envoye ? (
        <p className="flex items-start gap-2.5 rounded-[14px] border border-[#BFE3CF] bg-[#E6F4EC] px-4 py-3.5 text-[13.5px] font-semibold leading-snug text-[#1F7A4D] dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Check size={18} strokeWidth={3} className="mt-[1px] flex-shrink-0" />
          Déclaration transmise. Le support vous confirme la prise en charge des colis.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void envoyer()}
          disabled={!pret || busy}
          className="pr-btn flex w-full items-center justify-center gap-2.5 rounded-[12px] px-4 py-4 text-[17px] font-black text-white transition active:scale-[.97] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700"
        >
          <CalendarX2 size={19} strokeWidth={2.4} /> {busy ? "Envoi…" : "Déclarer la fermeture"}
        </button>
      )}

      {/* ── Fermetures passées ─────────────────────────────────────────── */}
      {passees.length > 0 ? (
        <section className="rounded-[14px] border border-slate-200 bg-white px-4 pb-2 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
          <h3 className="px-1 text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
            Fermetures passées
          </h3>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {passees.map((item) => {
              const depart = new Date(`${item.from}T00:00:00`);
              return (
                <li key={item.id} className="flex items-start gap-3 px-1 py-3.5">
                  <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] bg-[#E6F4EC] text-[#1F7A4D] dark:bg-emerald-950/50 dark:text-emerald-300">
                    <CalendarDays size={19} strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                      {JOUR_COURT_MOIS.format(depart)} · {item.jours} jour{item.jours > 1 ? "s" : ""}
                    </span>
                    <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                      {item.reasonLabel} ·{" "}
                      {item.preavisJours > 0
                        ? `déclaré ${item.preavisJours} jour${item.preavisJours > 1 ? "s" : ""} avant`
                        : "déclaré le jour même"}
                    </span>
                  </span>
                  <span className="flex-shrink-0 rounded-full border border-[#BFE3CF] bg-[#E6F4EC] px-3 py-[5px] text-[12.5px] font-semibold text-[#1F7A4D] dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {item.impact}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="px-1 pb-2 pt-1 text-[12.5px] font-medium leading-[1.5] text-slate-400 dark:text-slate-500">
            Cette liste est gardée sur cet appareil. Elle ne remplace pas le suivi du support.
          </p>
        </section>
      ) : null}

    </div>
  );
}
