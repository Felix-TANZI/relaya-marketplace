/**
 * Le menu du portail point relais, sur téléphone.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * VINGT-ET-UNE DESTINATIONS, DEUX POIDS
 *
 * L'ancien menu listait les vingt-et-une destinations à plat, groupées mais
 * toutes de la même taille. Or quatre d'entre elles portent le travail de la
 * journée et dix-sept se consultent une fois par mois. Les afficher pareil
 * oblige à lire la liste entière pour retrouver « Réception ».
 *
 * D'où les deux traitements : les quatre destinations du guichet prennent une
 * grille de grandes cartes, atteignables au pouce sans viser ; tout le reste
 * descend en lignes compactes, groupées par métier. La grille n'est pas un
 * raccourci décoratif — c'est la reconnaissance que ces quatre-là sont
 * l'application, et que le reste est son administration.
 */
import {
  BarChart3,
  Bell,
  CalendarX,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  History,
  Layers,
  MessageCircle,
  Scale,
  ShieldCheck,
  Star,
  Store,
  Truck,
  User,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Boxes, ChevronLeft, Download, HelpCircle, KeyRound, LayoutGrid, Package, ScanLine, Settings2, Wifi } from "lucide-react";
import type { RelayTab } from "./relayNav";

/** Les quatre destinations du travail quotidien, en grille. */
const GUICHET: Array<{ id: RelayTab; icon: LucideIcon }> = [
  { id: "dashboard", icon: LayoutGrid },
  { id: "reception", icon: Package },
  { id: "retrait", icon: KeyRound },
  { id: "stock", icon: Boxes },
];

/**
 * Compteur d'une ligne.
 *
 * `info` compte des choses a faire, `alert` en reclame, `value` n'est pas un
 * compteur du tout — c'est une note. Un Trust Score dans une pastille orange
 * se lirait comme « 72 choses a traiter ».
 */
type BadgeTone = "info" | "alert" | "value";

interface MenuRow {
  id: RelayTab;
  icon: LucideIcon;
  /** Libellé propre au menu, quand celui des onglets ne dit pas la même chose. */
  label?: string;
  /** Compteur affiché, quand il ne vient pas du badge de l'onglet. */
  count?: "outbound" | "trust";
  tone?: BadgeTone;
  /** Entrée à déplier à l'arrivée, pour les écrans qui en regroupent plusieurs. */
  focus?: string;
}

/**
 * Les sections sous la grille, dans l'ordre où un gérant les ouvre : ce qui
 * bouge aujourd'hui, puis l'argent, puis sa réputation, puis les papiers.
 */
const SECTIONS: Array<{ title: string; rows: MenuRow[] }> = [
  {
    title: "Opérations",
    rows: [
      { id: "sortie", icon: Truck, label: "À faire partir", count: "outbound", tone: "info" },
      { id: "litiges", icon: Scale, label: "Constats et retours", tone: "alert" },
      { id: "historique", icon: History, label: "Historique" },
      { id: "notifications", icon: Bell, label: "Notifications", tone: "alert" },
      { id: "messagerie", icon: MessageCircle, label: "Messagerie", tone: "alert" },
    ],
  },
  {
    title: "Argent et performance",
    rows: [
      { id: "finances", icon: CreditCard, label: "Versements" },
      { id: "rapports", icon: BarChart3, label: "Rapports" },
      { id: "trust", icon: ShieldCheck, label: "Trust Score", count: "trust", tone: "value" },
      { id: "avis", icon: Star, label: "Avis des clients" },
      { id: "niveaux", icon: Layers, label: "Paliers" },
    ],
  },
  {
    title: "Mon relais",
    rows: [
      { id: "capacite", icon: Clock, label: "Capacité et horaires" },
      { id: "fermeture", icon: CalendarX, label: "Fermeture exceptionnelle" },
      { id: "kyc", icon: FileText, label: "Documents" },
      { id: "reseau", icon: User, label: "Mon équipe" },
      { id: "inscription", icon: Store, label: "Activation et partenariat" },
      { id: "formation", icon: GraduationCap, label: "Formation" },
    ],
  },
  {
    title: "Écrans d'état et d'accès",
    rows: [
      { id: "etats", icon: User, label: "Connexion", focus: "connexion" },
      { id: "etats", icon: UserPlus, label: "Invitation d'un employé", focus: "invitation" },
      { id: "etats", icon: LayoutGrid, label: "Relais neuf (écrans vides)", focus: "neuf" },
      { id: "etats", icon: Store, label: "Statut du relais", focus: "statut" },
      { id: "etats", icon: Wifi, label: "Hors connexion", focus: "offline" },
      { id: "etats", icon: AlertTriangle, label: "États d'erreur", focus: "erreur" },
      { id: "etats", icon: ScanLine, label: "Caméra", focus: "camera" },
      { id: "etats", icon: Download, label: "Installer l'application", focus: "install" },
    ],
  },
  {
    title: "Compte",
    rows: [
      { id: "aide", icon: HelpCircle, label: "Aide" },
      { id: "parametres", icon: Settings2, label: "Paramètres" },
      { id: "inscription", icon: Store, label: "Devenir point relais (nouveau gérant)" },
    ],
  },
];

const BADGE_TONE: Record<BadgeTone, string> = {
  info: "bg-[#E8EFFD] text-[#4F7DF3] dark:bg-blue-950 dark:text-blue-300",
  alert: "bg-[#FDF0DC] text-[#D98324] dark:bg-orange-950 dark:text-orange-300",
  value: "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

export interface RelayMenuProfile {
  name: string;
  city: string;
  manager: string;
  status: string;
  avatarUrl?: string;
}

export default function RelayMenu({
  labels,
  badges,
  profile,
  outbound,
  trust,
  onSelect,
  onClose,
  closeLabel,
  footer,
}: {
  labels: Record<RelayTab, string>;
  badges: Partial<Record<RelayTab, number>>;
  profile: RelayMenuProfile;
  /** Colis qui doivent quitter le local : le seul compteur absent des onglets. */
  outbound: number;
  /** Note publique du relais, affichée en valeur et non en compteur. */
  trust: number;
  onSelect: (tab: RelayTab, focus?: string) => void;
  onClose: () => void;
  closeLabel: string;
  footer: string[];
}) {
  const open = profile.status === "Ouvert";

  const countOf = (row: MenuRow) => {
    if (row.count === "outbound") return outbound;
    if (row.count === "trust") return trust;
    return badges[row.id] || 0;
  };

  return (
    <div className="min-h-full bg-[#F1EFEC] pb-2 dark:bg-slate-950">
      {/* Le menu est une page comme les autres : elle porte le meme bandeau
          que les sous-ecrans — retour, titre, marque. C'est ce qui dit qu'on
          y entre et qu'on en ressort, au lieu d'un panneau qu'on fait
          glisser. */}
      <header className="safe-pt-header sticky top-0 z-20 flex min-h-[44px] items-center gap-2 bg-white/95 px-4 pb-3.5 shadow-[0_1px_2px_rgba(15,23,42,.05)] backdrop-blur-xl dark:bg-slate-900/95 sm:px-6 sm:pb-4">
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="tap-target -ml-2 flex flex-shrink-0 items-center justify-center rounded-xl text-slate-800 transition active:scale-90 dark:text-slate-100"
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[18px] font-black tracking-[-0.01em] text-slate-900 dark:text-white">
          Menu
        </h1>
        <img
          src="/favicon-belivay-cart.png"
          alt="BelivaY"
          className="h-8 w-auto flex-shrink-0 object-contain dark:brightness-0 dark:invert"
        />
      </header>

      {/* ── Identité ───────────────────────────────────────────────────────
          Bandeau orange pleine largeur, collé en haut : le menu s'ouvre sur
          QUI l'on est et OÙ l'on travaille. Un gérant qui tient deux points
          de dépôt doit le vérifier avant de toucher quoi que ce soit. */}
      <header className="bg-gradient-to-br from-[#F79020] via-[#F07E16] to-[#E85D04] px-4 pb-4 pt-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#101C3D] text-[15px] font-black text-white ring-2 ring-white/70">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              profile.manager.slice(0, 2).toUpperCase()
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[19px] font-black leading-tight">
              {profile.name}
              {profile.city ? ` · ${profile.city}` : ""}
            </div>
            <div className="mt-0.5 truncate text-[14px] font-medium text-white/85">
              {profile.manager}, gérant
            </div>
          </div>

          <span
            className={`flex flex-shrink-0 items-center rounded-full px-3 py-[5px] text-[12.5px] font-bold ${
              open ? "bg-[#E8F7EE] text-[#2E7D4F]" : "bg-white/25 text-white"
            }`}
          >
            <span
              aria-hidden
              className={`mr-1.5 h-[6px] w-[6px] rounded-full ${open ? "bg-[#2E7D4F]" : "bg-white"}`}
            />
            {profile.status}
          </span>
        </div>
      </header>

      {/* ── Le guichet ─────────────────────────────────────────────────── */}
      <section className="px-4 pt-4">
        <h2 className="text-[12px] font-black uppercase leading-none tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Le guichet
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {GUICHET.map(({ id, icon: Icon }) => {
            const count = badges[id] || 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                className="relative flex flex-col items-start rounded-[14px] border border-slate-200/70 bg-white px-4 py-4 text-left shadow-[0_2px_8px_rgba(15,23,42,.06)] transition active:scale-[.97] dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#3B7BF0] to-[#1D4ED8] text-white shadow-[0_3px_10px_rgba(29,78,216,.3)]">
                  <Icon size={21} strokeWidth={2.2} />
                </span>
                <span className="mt-3.5 text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                  {labels[id]}
                </span>
                {count > 0 ? (
                  <span className="absolute right-3 top-3 flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-[#FDF0DC] px-1.5 text-[12.5px] font-black text-[#D98324] dark:bg-orange-950 dark:text-orange-300">
                    {count > 99 ? "99+" : count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Opérations et versements ───────────────────────────────────── */}
      {SECTIONS.map((section) => (
        <section key={section.title} className="px-4 pt-4">
          <div className="rounded-[16px] border border-slate-200/70 bg-white px-4 pb-1 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-[12px] font-black uppercase leading-none tracking-[0.1em] text-slate-500 dark:text-slate-400">
              {section.title}
            </h2>
            <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
              {section.rows.map((row) => {
                const count = countOf(row);
                const Icon = row.icon;
                return (
                  <li key={`${section.title}-${row.label || row.id}`}>
                    <button
                      type="button"
                      onClick={() => onSelect(row.id, row.focus)}
                      className="flex w-full items-center gap-3 py-3.5 text-left transition active:scale-[.99]"
                    >
                      <Icon size={20} strokeWidth={2.1} className="flex-shrink-0 text-[#E8590C]" />
                      <span className="min-w-0 flex-1 truncate text-[15.5px] font-bold text-slate-900 dark:text-white">
                        {row.label || labels[row.id]}
                      </span>
                      {count > 0 ? (
                        <span
                          className={`flex h-[26px] min-w-[26px] flex-shrink-0 items-center justify-center rounded-full px-1.5 text-[12.5px] font-black ${
                            BADGE_TONE[row.tone || "info"]
                          }`}
                        >
                          {count > 99 ? "99+" : count}
                        </span>
                      ) : null}
                      <ChevronRightThin />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ))}

      {/* Le menu se ferme sur la marque, pas sur un bouton rouge. Se
          deconnecter reste accessible — feuille compte, et « Connexion »
          dans les ecrans d'etat — mais ce n'est pas ce qu'on vient faire
          ici, et un bouton destructeur en bas de liste finit par etre
          touche par accident. */}
      <footer className="px-4 pb-3 pt-6 text-center">
        <img
          src="/belivay-logo.png"
          alt="BelivaY"
          className="mx-auto h-[30px] w-auto object-contain dark:brightness-0 dark:invert"
        />
        <div className="mt-4 space-y-0.5">
          {footer.map((line) => (
            <p key={line} className="text-[11.5px] font-medium leading-relaxed text-slate-400 dark:text-slate-500">
              {line}
            </p>
          ))}
        </div>
      </footer>
    </div>
  );
}

/** Chevron de ligne : fin et pâle, il indique sans attirer. */
function ChevronRightThin() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] flex-shrink-0 text-slate-300 dark:text-slate-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
