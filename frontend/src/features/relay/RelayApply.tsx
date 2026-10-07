/**
 * Devenir point relais — la candidature d'un commerçant.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UNE PAGE DE RECRUTEMENT ENGAGE PLUS QU'UN ÉCRAN INTERNE
 *
 * Celui qui la lit ne travaille pas encore pour BelivaY : il décide s'il va
 * le faire. Les montants annoncés ici sont ceux sur lesquels il acceptera —
 * ils sont donc lus de la grille tarifaire réelle, jamais écrits à la main.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CINQ ÉTAPES, UNE SEULE DEMANDE
 *
 * Le formulaire se remplit par morceaux et se garde sur le téléphone : un
 * commerçant renseigne son enseigne entre deux clients, pas d'une traite.
 * Rien ne part avant la dernière étape.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, FileText, GraduationCap, MapPin, Phone, Send, Smartphone, Store, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { http } from "@/services/api/http";
import { getRelayTariff, type RelayTariffLine } from "@/services/api/relaySettlements";

/** Garde gratuite puis facturée — `RelayParcel.GARDE_*` côté serveur. */
const GARDE_TARIF_JOUR = 200;

const ETAPES = ["Commerce", "Gérant", "Local", "Versement", "Convention"] as const;

const TYPES = ["Boutique", "Pharmacie", "Papeterie", "Salon", "Station", "Autre"];

const SUITE: Array<{ icon: LucideIcon; titre: string; detail: string }> = [
  { icon: Phone, titre: "Appel sous 48 h", detail: "Un agent confirme votre dossier" },
  { icon: MapPin, titre: "Visite du local", detail: "Rangement et comptoir contrôlés" },
  { icon: GraduationCap, titre: "Formation", detail: "Les modules obligatoires, sur téléphone" },
  { icon: Store, titre: "Ouverture", detail: "Votre relais apparaît sur la carte des clients" },
];

const STORAGE_KEY = "belivay.relay.candidature";

interface Brouillon {
  enseigne: string;
  type: string;
  quartier: string;
  repere: string;
  latitude: number | null;
  longitude: number | null;
  // Etape « Gerant »
  gerant: string;
  telephone: string;
  // Etape « Local »
  places: string;
  horaires: string;
  // Etape « Versement »
  operateur: string;
  momo: string;
  code: string;
}

/** Les pieces demandees a chaque etape. */
const PIECES_GERANT: Array<{ cle: string; icon: LucideIcon; label: string }> = [
  { cle: "cni", icon: FileText, label: "CNI recto verso" },
  { cle: "portrait", icon: User, label: "Votre portrait" },
];

const PHOTOS_LOCAL = ["Façade", "Rangement", "Comptoir"];

/**
 * Les prefixes camerounais par operateur.
 *
 * Verifies ICI pour arreter une faute de frappe tout de suite — le serveur
 * revalide de son cote (`PhoneValidationView`), c'est lui qui fait foi.
 */
const OPERATEURS: Array<{ cle: string; label: string; test: (n: string) => boolean }> = [
  {
    cle: "MTN",
    label: "MTN MoMo",
    test: (n) => /^6[78]/.test(n) || /^65[0-4]/.test(n),
  },
  {
    cle: "ORANGE",
    label: "Orange Money",
    test: (n) => /^69/.test(n) || /^65[5-9]/.test(n),
  },
];

const VIDE: Brouillon = {
  enseigne: "",
  type: TYPES[0],
  quartier: "",
  repere: "",
  latitude: null,
  longitude: null,
  gerant: "",
  telephone: "",
  places: "",
  horaires: "",
  operateur: OPERATEURS[0].cle,
  momo: "",
  code: "",
};

function lireBrouillon(): Brouillon {
  try {
    const brut = window.localStorage.getItem(STORAGE_KEY);
    return brut ? { ...VIDE, ...JSON.parse(brut) } : VIDE;
  } catch {
    // Stockage bloque : on repart d'un formulaire vide, l'ecran marche.
    return VIDE;
  }
}

const nf = (n: number) => n.toLocaleString("fr-FR");

export default function RelayApply({ onOpenTraining }: { onOpenTraining: () => void }) {
  const [etape, setEtape] = useState(0);
  const [brouillon, setBrouillon] = useState<Brouillon>(lireBrouillon);
  const [grille, setGrille] = useState<RelayTariffLine[]>([]);
  const [position, setPosition] = useState<"idle" | "cherche" | "erreur">("idle");
  /**
   * Les fichiers restent en memoire, pas dans le brouillon.
   *
   * `localStorage` ne garde que du texte : y ranger une photo la perdrait,
   * ou ferait deborder le quota. Le commercant les reprend s'il quitte.
   */
  const [fichiers, setFichiers] = useState<Record<string, File>>({});
  const [accepte, setAccepte] = useState(false);
  const [signe, setSigne] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [busy, setBusy] = useState(false);
  const signature = useRef<HTMLCanvasElement | null>(null);
  const trace = useRef(false);

  /** Le doigt dessine : un trait continu tant qu'il reste posé. */
  const dessiner = (event: React.PointerEvent<HTMLCanvasElement>, debut: boolean) => {
    const toile = signature.current;
    if (!toile) return;
    if (debut) {
      trace.current = true;
      toile.setPointerCapture(event.pointerId);
    }
    if (!trace.current) return;
    const zone = toile.getBoundingClientRect();
    const ctx = toile.getContext("2d");
    if (!ctx) return;
    // La toile est en pixels reels, le doigt en pixels CSS : sans ce
    // rapport, le trait se decale de plus en plus vers le bas a droite.
    const x = ((event.clientX - zone.left) / zone.width) * toile.width;
    const y = ((event.clientY - zone.top) / zone.height) * toile.height;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0F172A";
    if (debut) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      return;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
    setSigne(true);
  };

  const effacerSignature = () => {
    const toile = signature.current;
    const ctx = toile?.getContext("2d");
    if (toile && ctx) ctx.clearRect(0, 0, toile.width, toile.height);
    setSigne(false);
  };

  /**
   * La candidature part au support.
   *
   * Aucun endpoint de candidature n'existe : `/api/contact/` est le seul
   * canal. Les PHOTOS ne partent pas avec — il ne porte qu'un texte. L'agent
   * les redemandera lors de l'appel, et l'ecran le dit.
   */
  const envoyer = async () => {
    setBusy(true);
    try {
      await http("/api/contact/", {
        method: "POST",
        body: JSON.stringify({
          name: brouillon.gerant || brouillon.enseigne,
          email: "candidature@belivay.test",
          phone: `+237${brouillon.momo || brouillon.telephone}`,
          subject: `[Candidature point relais] ${brouillon.enseigne}`,
          message: [
            `Commerce : ${brouillon.enseigne} (${brouillon.type})`,
            `Quartier : ${brouillon.quartier}`,
            brouillon.repere ? `Repere : ${brouillon.repere}` : "",
            brouillon.latitude !== null
              ? `Position : ${brouillon.latitude}, ${brouillon.longitude}`
              : "",
            `Gerant : ${brouillon.gerant} · +237${brouillon.telephone}`,
            `Local : ${brouillon.places} places · ${brouillon.horaires}`,
            `Versement : ${brouillon.operateur} +237${brouillon.momo}`,
            `Photos prises : ${Object.keys(fichiers).join(", ") || "aucune"} (a redemander)`,
            "Convention acceptee et signee dans l'application.",
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });
      setEnvoye(true);
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* Sans stockage, il n'y avait rien a nettoyer. */
      }
    } catch {
      setEnvoye(false);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let vivant = true;
    getRelayTariff()
      .then((lignes) => {
        if (vivant) setGrille(Array.isArray(lignes) ? lignes : []);
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);

  /** Le brouillon suit la saisie : on ne perd pas une enseigne à moitié tapée. */
  const modifier = (champ: keyof Brouillon, valeur: string | number | null) => {
    setBrouillon((actuel) => {
      const suite = { ...actuel, [champ]: valeur };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(suite));
      } catch {
        /* Sans stockage, la saisie vit seulement le temps de l'ecran. */
      }
      return suite;
    });
  };

  /**
   * La promesse de revenu, composée de la grille réelle.
   *
   * Un montant écrit à la main dans une page de recrutement devient une
   * phrase sur laquelle quelqu'un s'engage. Si le contrat change, celle-ci
   * suit.
   */
  const promesse = useMemo(() => {
    const petit = grille.find((ligne) => ligne.parcel_size === "SMALL");
    const remise = petit ? `${nf(petit.amount_xaf)} F par petit colis remis` : "une somme par colis remis";
    return (
      `Un revenu en plus dans votre commerce, sans rien avancer : ${remise}, `
      + `${nf(GARDE_TARIF_JOUR)} F par jour de garde facturé, payés par BelivaY chaque vendredi.`
    );
  }, [grille]);

  /** « 200 / 250 / 400 F par colis » — depuis la grille, jamais a la main. */
  const remuneration = useMemo(() => {
    const ordre = ["SMALL", "STANDARD", "BULKY"];
    const montants = ordre
      .map((taille) => grille.find((ligne) => ligne.parcel_size === taille)?.amount_xaf)
      .filter((montant): montant is number => typeof montant === "number");
    return montants.length > 0 ? `${montants.map(nf).join(" / ")} F par colis` : "selon la taille du colis";
  }, [grille]);

  /** La géolocalisation du navigateur : pas une carte, mais un point vrai. */
  const placer = () => {
    if (!navigator.geolocation) {
      setPosition("erreur");
      return;
    }
    setPosition("cherche");
    navigator.geolocation.getCurrentPosition(
      (coords) => {
        modifier("latitude", coords.coords.latitude);
        modifier("longitude", coords.coords.longitude);
        setPosition("idle");
      },
      () => setPosition("erreur"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  /** Ce qu'il faut avoir rempli pour passer a l'etape suivante. */
  const pret = [
    brouillon.enseigne.trim().length > 1 && brouillon.quartier.trim().length > 1,
    brouillon.gerant.trim().length > 2 && brouillon.telephone.replace(/\D/g, "").length === 9,
    Number(brouillon.places) > 0 && brouillon.horaires.trim().length > 2,
    brouillon.momo.length === 9 && brouillon.code.length === 6,
    accepte && signe,
  ][etape];

  const champ =
    "mt-2 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-[#EF6A00] placeholder:font-medium placeholder:text-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
  const etiquette =
    "mt-4 block text-[11.5px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400";

  return (
    <div className="space-y-4">
      {/* ── La promesse ────────────────────────────────────────────────── */}
      <section
        className="overflow-hidden rounded-[18px] px-5 pb-5 pt-5 text-white shadow-[0_8px_22px_rgba(217,80,0,.28)]"
        style={{
          backgroundImage:
            "radial-gradient(120% 90% at 82% 8%, rgba(255,200,69,.5) 0%, rgba(255,200,69,0) 58%),"
            + " linear-gradient(158deg, #F79A2B 0%, #F0801A 46%, #D95000 100%)",
        }}
      >
        <img
          src="/belivay-logo.png"
          alt="BelivaY"
          className="h-7 w-auto object-contain brightness-0 invert"
        />
        <h2 className="mt-3 text-[23px] font-black leading-[1.14] tracking-[-0.03em]">
          Devenez point relais BelivaY
        </h2>
        <p className="mt-2.5 text-[14px] font-medium leading-[1.55] text-white/95">{promesse}</p>
        <div className="mt-3.5 flex flex-wrap gap-2">
          {["Zéro caution", "Matériel fourni", "Réponse sous 48 h"].map((pastille) => (
            <span
              key={pastille}
              className="rounded-full bg-white/25 px-3.5 py-[6px] text-[12.5px] font-bold leading-none"
            >
              {pastille}
            </span>
          ))}
        </div>
      </section>

      {/* ── L'avancement ──────────────────────────────────────────────────
          Cinq segments plutot qu'un compteur : on voit d'un coup ce qui
          reste, et chaque etape porte son nom. */}
      <div>
        <div className="grid grid-cols-5 gap-1.5" aria-hidden>
          {ETAPES.map((nom, rang) => (
            <span
              key={nom}
              className={`h-[5px] rounded-full ${
                envoye || rang <= etape
                  ? "bg-gradient-to-r from-[#3A6BEA] to-[#EF6A00]"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-5 gap-1.5">
          {ETAPES.map((nom, rang) => (
            <span
              key={nom}
              className={`text-[11px] font-semibold leading-tight ${
                envoye || rang <= etape
                  ? "text-slate-700 dark:text-slate-200"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {nom}
            </span>
          ))}
        </div>
      </div>

      {/* ── Demande envoyée ─────────────────────────────────────────────
          Le formulaire disparaît : il n'y a plus rien à y faire, et le
          laisser inviterait à renvoyer une seconde candidature. */}
      {envoye ? (
        <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-5 pt-6 text-center shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
          <span className="mx-auto flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#E6F4EC] text-[#1F7A4D] dark:bg-emerald-950/50 dark:text-emerald-300">
            <Check size={30} strokeWidth={3} />
          </span>
          <h3 className="mt-4 text-[23px] font-black tracking-[-0.03em] text-slate-900 dark:text-white">
            Demande envoyée
          </h3>
          <p className="mt-2 text-[13.5px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
            Un agent BelivaY vous appelle sous 48 h pour fixer la visite. Pendant ce temps,
            commencez la formation : des modules courts, sur votre téléphone.
          </p>

          <button
            type="button"
            onClick={onOpenTraining}
            className="pr-btn mt-4 flex w-full items-center justify-center gap-2.5 rounded-[12px] px-4 py-3.5 text-[16px] font-black text-white transition active:scale-[.97]"
          >
            <GraduationCap size={19} strokeWidth={2.2} /> Commencer la formation
          </button>
          <button
            type="button"
            onClick={() => {
              // On rouvre le formulaire a la derniere etape, sans effacer :
              // « revoir » n'est pas « recommencer ».
              setEnvoye(false);
              setEtape(ETAPES.length - 1);
            }}
            className="mt-2.5 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3.5 text-[16px] font-bold text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            Revoir ma demande
          </button>
        </section>
      ) : null}

      {/* ── L'étape courante ───────────────────────────────────────────── */}
      <section
        className={`rounded-[14px] border border-slate-200 bg-white px-5 pb-5 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900 ${
          envoye ? "hidden" : ""
        }`}
      >
        <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
          {["Votre commerce", "Le gérant", "Votre local", "Votre versement", "La convention"][etape]}
        </h3>

      {etape === 0 ? (
        <>

        <label className="mt-4 block text-[11.5px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
          Nom du commerce
        </label>
        <input
          value={brouillon.enseigne}
          onChange={(event) => modifier("enseigne", event.target.value)}
          placeholder="Ex. Boutique Mama René"
          aria-label="Nom du commerce"
          className="mt-2 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-[#EF6A00] placeholder:font-medium placeholder:text-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />

        <label className="mt-4 block text-[11.5px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
          Type
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {TYPES.map((type) => {
            const on = type === brouillon.type;
            return (
              <button
                key={type}
                type="button"
                aria-pressed={on}
                onClick={() => modifier("type", type)}
                className={`rounded-full border px-3.5 py-[7px] text-[13px] font-bold transition active:scale-[.96] ${
                  on
                    ? "border-[#C9D7FB] bg-[#EAF0FF] text-[#2456D6] dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                    : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>

        <label className="mt-4 block text-[11.5px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
          Quartier
        </label>
        <input
          value={brouillon.quartier}
          onChange={(event) => modifier("quartier", event.target.value)}
          placeholder="Ex. Mvog-Ada"
          aria-label="Quartier"
          className="mt-2 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-[#EF6A00] placeholder:font-medium placeholder:text-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />

        <label className="mt-4 block text-[11.5px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
          Repère
        </label>
        <input
          value={brouillon.repere}
          onChange={(event) => modifier("repere", event.target.value)}
          placeholder="Ex. face pharmacie, enseigne jaune"
          aria-label="Repère"
          className="mt-2 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-[#EF6A00] placeholder:font-medium placeholder:text-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />

        {/*
          Pas une carte : la position du telephone.
          Le commercant est DANS son commerce quand il remplit ce formulaire —
          relever ses coordonnees est plus juste, et plus rapide, que de lui
          faire deplacer une epingle sur un fond de carte.
        */}
        <button
          type="button"
          onClick={placer}
          className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-[12px] border border-slate-200 bg-white px-4 py-3.5 text-[15px] font-bold text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <MapPin size={18} strokeWidth={2.2} />
          {brouillon.latitude !== null
            ? "Position enregistrée · corriger"
            : position === "cherche"
              ? "Localisation…"
              : "Placer mon commerce sur la carte"}
        </button>
        {position === "erreur" ? (
          <p className="mt-2 text-[12.5px] font-medium text-[#8A5A00] dark:text-amber-400">
            Localisation refusée. Le repère ci-dessus suffira à l'agent qui vous appellera.
          </p>
        ) : null}

        </>
      ) : null}

      {/* ── Étape 2 : le gérant ────────────────────────────────────────── */}
      {etape === 1 ? (
        <>
          <label className={etiquette}>Nom et prénom</label>
          <input
            value={brouillon.gerant}
            onChange={(event) => modifier("gerant", event.target.value)}
            placeholder="Tel que sur la pièce"
            aria-label="Nom et prénom"
            className={champ}
          />

          <label className={etiquette}>Téléphone</label>
          <div className="mt-2 flex items-center gap-3 rounded-[12px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
            <span className="text-[15px] font-bold text-slate-500 dark:text-slate-400">+237</span>
            <input
              value={brouillon.telephone}
              onChange={(event) => modifier("telephone", event.target.value.replace(/\D/g, "").slice(0, 9))}
              inputMode="numeric"
              placeholder="6XX XX XX XX"
              aria-label="Téléphone"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold tracking-wide text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-300 dark:text-white"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {PIECES_GERANT.map((piece) => {
              const pose = Boolean(fichiers[piece.cle]);
              return (
                <label
                  key={piece.cle}
                  className={`flex h-[104px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed transition active:scale-[.97] ${
                    pose
                      ? "border-[#BFE3CF] bg-[#E6F4EC] text-[#1F7A4D] dark:border-emerald-800 dark:bg-emerald-950/30"
                      : "border-[#C9D7FB] bg-[#EAF0FF] text-[#2456D6] dark:border-blue-800 dark:bg-blue-950/30"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(event) => {
                      const fichier = event.target.files?.[0];
                      if (fichier) setFichiers((actuels) => ({ ...actuels, [piece.cle]: fichier }));
                    }}
                  />
                  <piece.icon size={22} strokeWidth={2.2} />
                  <span className="px-2 text-center text-[13px] font-bold leading-tight">
                    {pose ? "Photo prise" : piece.label}
                  </span>
                </label>
              );
            })}
          </div>

          {/*
            La maquette annonce une « verification automatique en quelques
            minutes ». Aucun controle automatique de piece d'identite n'existe
            dans ce projet : c'est un agent qui regarde, et l'etape « Appel
            sous 48 h » ci-dessous le dit deja.
          */}
          <p className="mt-3 text-[13px] font-medium leading-[1.5] text-slate-400 dark:text-slate-500">
            Un agent vérifie votre pièce lors de l'appel. Elle n'est jamais montrée : les clients
            voient votre prénom et votre portrait, pour vous reconnaître au comptoir.
          </p>
        </>
      ) : null}

      {/* ── Étape 3 : le local ─────────────────────────────────────────── */}
      {etape === 2 ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {PHOTOS_LOCAL.map((vue) => {
              const pose = Boolean(fichiers[vue]);
              return (
                <label
                  key={vue}
                  className={`flex h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed transition active:scale-[.97] ${
                    pose
                      ? "border-[#BFE3CF] bg-[#E6F4EC] text-[#1F7A4D] dark:border-emerald-800 dark:bg-emerald-950/30"
                      : "border-[#F6CFA8] bg-[#FFF1E2] text-[#EF6A00] dark:border-orange-800 dark:bg-orange-950/20"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(event) => {
                      const fichier = event.target.files?.[0];
                      if (fichier) setFichiers((actuels) => ({ ...actuels, [vue]: fichier }));
                    }}
                  />
                  <Camera size={20} strokeWidth={2.2} />
                  <span className="text-center text-[12.5px] font-bold leading-tight">
                    {pose ? "Prise" : vue}
                  </span>
                </label>
              );
            })}
          </div>

          <label className={etiquette}>Places estimées</label>
          <input
            value={brouillon.places}
            onChange={(event) => modifier("places", event.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="30"
            aria-label="Places estimées"
            className={champ}
          />

          <label className={etiquette}>Horaires habituels</label>
          <input
            value={brouillon.horaires}
            onChange={(event) => modifier("horaires", event.target.value)}
            placeholder="Ex. 8 h – 19 h, lun. à sam."
            aria-label="Horaires habituels"
            className={champ}
          />

          <p className="mt-3 text-[13px] font-medium leading-[1.5] text-slate-400 dark:text-slate-500">
            Il faut un coin sec, à l'abri des regards, et un comptoir où remettre. La photo de la
            façade aide les clients à trouver le relais. BelivaY vérifie lors de la visite.
          </p>
        </>
      ) : null}

      {/* ── Étape 4 : le versement ─────────────────────────────────────── */}
      {etape === 3 ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {OPERATEURS.map((op) => {
              const on = op.cle === brouillon.operateur;
              return (
                <button
                  key={op.cle}
                  type="button"
                  aria-pressed={on}
                  onClick={() => modifier("operateur", op.cle)}
                  className={`rounded-full border px-3.5 py-[7px] text-[13px] font-bold transition active:scale-[.96] ${
                    on
                      ? "border-[#C9D7FB] bg-[#EAF0FF] text-[#2456D6] dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                      : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {op.label}
                </button>
              );
            })}
          </div>

          <label className={etiquette}>Numéro de versement</label>
          <div className="mt-2 flex items-center gap-3 rounded-[12px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
            <span className="text-[15px] font-bold text-slate-500 dark:text-slate-400">+237</span>
            <input
              value={brouillon.momo}
              onChange={(event) => modifier("momo", event.target.value.replace(/\D/g, "").slice(0, 9))}
              inputMode="numeric"
              placeholder="6XX XX XX XX"
              aria-label="Numéro de versement"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold tracking-wide text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-300 dark:text-white"
            />
          </div>

          {/* Le prefixe est verifie tout de suite : une faute de frappe
              decouverte au premier versement coute une semaine. */}
          {brouillon.momo.length >= 3
            && !OPERATEURS.find((op) => op.cle === brouillon.operateur)?.test(brouillon.momo) ? (
            <p className="mt-2 text-[12.5px] font-semibold text-[#B42318]">
              Ce numéro ne correspond pas à l'opérateur choisi.
            </p>
          ) : null}

          <button
            type="button"
            className="mt-3.5 flex w-full items-center justify-center gap-2.5 rounded-[12px] bg-[#2456D6] px-4 py-3.5 text-[16px] font-black text-white shadow-[0_4px_14px_rgba(36,86,214,.35)] transition active:scale-[.97] disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
            disabled={brouillon.momo.length !== 9}
          >
            <Smartphone size={18} strokeWidth={2.2} /> Recevoir le code
          </button>

          <label className={etiquette}>Code reçu</label>
          <input
            value={brouillon.code}
            onChange={(event) => modifier("code", event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="000000"
            aria-label="Code reçu"
            className="mt-2 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-center text-[20px] font-black tracking-[0.3em] text-slate-900 outline-none transition focus:border-[#EF6A00] placeholder:text-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />

          <p className="mt-3 text-[13px] font-medium leading-[1.5] text-slate-400 dark:text-slate-500">
            Le numéro doit être au nom du gérant. Préfixe vérifié : MTN 67X, 68X, 650 à 654 · Orange
            69X, 655 à 659. Un seul numéro actif à la fois.
          </p>
        </>
      ) : null}

      {/* ── Étape 5 : la convention ────────────────────────────────────── */}
      {etape === 4 ? (
        <>
          <dl className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {[
              ["Caution", "aucune", true],
              ["Frais d'entrée", "aucun", true],
              ["Rémunération", remuneration, false],
              ["Garde", `${nf(GARDE_TARIF_JOUR)} F par jour facturé`, false],
              ["Versement", "chaque vendredi", false],
              ["Exclusivité (50 premiers)", "300 m · 6 mois", false],
            ].map(([terme, valeur, vert]) => (
              <div key={String(terme)} className="flex items-start justify-between gap-4 py-3">
                <dt className="text-[14px] font-medium text-slate-500 dark:text-slate-400">{terme}</dt>
                <dd
                  className={`text-right text-[14px] font-black ${
                    vert ? "text-[#1F7A4D] dark:text-emerald-400" : "text-slate-900 dark:text-white"
                  }`}
                >
                  {valeur}
                </dd>
              </div>
            ))}
          </dl>

          <button
            type="button"
            role="switch"
            aria-checked={accepte}
            onClick={() => setAccepte((actuel) => !actuel)}
            className="mt-3 flex w-full items-center gap-3 text-left"
          >
            <span
              className={`relative h-[31px] w-[52px] flex-shrink-0 rounded-full transition ${
                accepte ? "bg-[#1F7A4D]" : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-[3px] h-[25px] w-[25px] rounded-full bg-white shadow-[0_1px_3px_rgba(60,35,15,.3)] transition-all ${
                  accepte ? "left-[24px]" : "left-[3px]"
                }`}
              />
            </span>
            <span className="text-[14.5px] font-semibold text-slate-700 dark:text-slate-200">
              J'ai lu la convention et je l'accepte
            </span>
          </button>

          <div className="mt-3.5 overflow-hidden rounded-[12px] border-2 border-dashed border-[#C9D7FB] dark:border-blue-900">
            <canvas
              ref={signature}
              width={600}
              height={220}
              onPointerDown={(event) => dessiner(event, true)}
              onPointerMove={(event) => dessiner(event, false)}
              onPointerUp={() => {
                trace.current = false;
              }}
              onPointerLeave={() => {
                trace.current = false;
              }}
              className="h-[150px] w-full touch-none bg-white dark:bg-slate-950"
              aria-label="Zone de signature"
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="text-[12.5px] font-medium text-slate-400 dark:text-slate-500">
              {signe ? "Signature enregistrée" : "Signez ici avec le doigt"}
            </span>
            {signe ? (
              <button
                type="button"
                onClick={effacerSignature}
                className="text-[12.5px] font-bold text-[#2456D6] dark:text-blue-400"
              >
                Effacer
              </button>
            ) : null}
          </div>

          {/*
            Aucun endpoint de candidature n'existe : la demande part au
            support par `/api/contact/`, qui ne porte qu'un texte. Les photos
            prises aux etapes precedentes NE PARTENT PAS — le dire evite que
            quelqu'un croie son dossier complet.
          */}
          <p className="mt-3 text-[13px] font-medium leading-[1.5] text-slate-400 dark:text-slate-500">
            Votre demande part au support avec vos réponses. Les photos vous seront redemandées lors
            de l'appel.
          </p>

        </>
      ) : null}

        {/* ── Avancer, ou revenir ─────────────────────────────────────── */}
        <div className={`mt-4 ${etape > 0 ? "grid grid-cols-[1fr_1.6fr] gap-2.5" : ""}`}>
          {etape > 0 ? (
            <button
              type="button"
              onClick={() => setEtape((rang) => Math.max(0, rang - 1))}
              className="rounded-[12px] border border-slate-200 bg-white px-4 py-3.5 text-[16px] font-bold text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              Retour
            </button>
          ) : null}
          <button
            type="button"
            onClick={() =>
              etape === ETAPES.length - 1
                ? void envoyer()
                : setEtape((rang) => Math.min(ETAPES.length - 1, rang + 1))
            }
            disabled={!pret || busy || envoye}
            className="pr-btn flex w-full items-center justify-center gap-2.5 rounded-[12px] px-4 py-3.5 text-[16px] font-black text-white transition active:scale-[.97] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700"
          >
            {etape === ETAPES.length - 1 ? (
              <>
                <Send size={18} strokeWidth={2.4} />
                {busy ? "Envoi…" : envoye ? "Demande envoyée" : "Envoyer ma demande"}
              </>
            ) : (
              "Continuer"
            )}
          </button>
        </div>
      </section>

      {/* ── Après votre demande ────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-4 pb-2 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="px-1 text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
          Après votre demande
        </h3>
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          {SUITE.map((ligne) => (
            <li key={ligne.titre} className="flex items-start gap-3 px-1 py-3.5">
              <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] bg-[#EAF0FF] text-[#2456D6] dark:bg-blue-950/50 dark:text-blue-300">
                <ligne.icon size={19} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                  {ligne.titre}
                </span>
                <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                  {ligne.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
