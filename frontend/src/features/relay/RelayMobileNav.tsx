/**
 * Barre d'onglets mobile du portail point relais.
 *
 * Remplace le ruban de 22 pastilles a defilement horizontal : sur telephone on
 * expose les quatre destinations du travail quotidien (aujourd'hui, reception,
 * retrait, stock). C'est le schema des applications mobiles actuelles — la
 * barre reste fixe, le pouce atteint tout, et rien ne se cache derriere un
 * scroll lateral.
 *
 * Le reste du menu n'a pas sa place ici : il s'ouvre par l'icone du bandeau,
 * du meme cote que le tiroir. Un second point d'entree en bas dupliquait le
 * geste et volait un cinquieme de la barre aux destinations du quotidien.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE VERRE
 *
 * La barre ne pose pas un fond opaque sur la page : elle la laisse
 * transparaitre, floutee et saturee. Ce n'est pas un effet gratuit — c'est ce
 * qui dit, sans un mot, que le contenu continue DESSOUS et qu'il faut
 * continuer a faire defiler. Une barre opaque collee au bord se lit comme la
 * fin de la page ; le gerant s'arrete d'y chercher quelque chose.
 *
 * Les trois couches qui font le verre, du fond vers la surface :
 *   1. `backdrop-blur` + `backdrop-saturate` — la page vue a travers ;
 *   2. un degrade blanc translucide — l'epaisseur du materiau ;
 *   3. un liseré clair en haut (`inset 0 1px`) — la lumiere qui accroche
 *      l'arete superieure, seule chose qui empeche la barre de paraitre plate.
 */
import { KeyRound, Layers, LayoutGrid, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RelayTab } from "./relayNav";

/** Les quatre onglets fixes, dans l'ordre du flux metier d'une journee. */
const PRIMARY: Array<{ id: RelayTab; icon: LucideIcon }> = [
  { id: "dashboard", icon: LayoutGrid },
  { id: "reception", icon: Package },
  { id: "retrait", icon: KeyRound },
  { id: "stock", icon: Layers },
];

/** Au-dela de 99 le badge deborderait la pastille : on plafonne. */
function formatBadge(count: number) {
  return count > 99 ? "99+" : String(count);
}

function Badge({ count }: { count: number }) {
  return (
    <span
      className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 px-1 text-[10px] font-black leading-none text-white shadow-[0_2px_6px_rgba(194,65,12,.45)] ring-2 ring-white dark:ring-slate-900"
      aria-hidden
    >
      {formatBadge(count)}
    </span>
  );
}

export default function RelayMobileNav({
  activeTab,
  onSelect,
  labels,
  badges,
  navLabel,
}: {
  activeTab: RelayTab;
  onSelect: (tab: RelayTab) => void;
  /** Libelles courts : « Retrait » tient dans la barre, « Retrait acheteur » non. */
  labels: Record<RelayTab, string>;
  badges: Partial<Record<RelayTab, number>>;
  navLabel: string;
}) {
  return (
    <nav
      aria-label={navLabel}
      className="safe-mb pointer-events-none fixed inset-x-0 bottom-0 z-[75] px-3 pb-2.5 lg:hidden"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-stretch justify-around rounded-[30px] border border-white/70 bg-gradient-to-b from-white/85 to-white/65 p-1.5 shadow-[0_10px_34px_rgba(15,23,42,.18),0_2px_8px_rgba(15,23,42,.06),inset_0_1px_0_rgba(255,255,255,.95)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:from-slate-900/85 dark:to-slate-900/70 dark:shadow-[0_10px_34px_rgba(0,0,0,.55),inset_0_1px_0_rgba(255,255,255,.12)]">
        {PRIMARY.map(({ id, icon: Icon }) => {
          const active = id === activeTab;
          const badge = badges[id] || 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-current={active ? "page" : undefined}
              className={`group relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-[24px] px-1 py-2 transition duration-300 active:scale-[.93] ${
                active
                  ? "bg-blue-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,.8)] dark:bg-blue-500/20"
                  : ""
              }`}
            >
              {/* L'onglet actif porte une plaque bleue pleine largeur plutot
                  qu'une pastille sous l'icone : le libelle entre dedans, donc
                  le repere de position reste lisible d'un coup d'oeil. */}
              <span className="relative flex items-center justify-center">
                <Icon
                  size={21}
                  strokeWidth={active ? 2.5 : 2}
                  className={active ? "text-blue-600 dark:text-blue-300" : "text-slate-400 dark:text-slate-500"}
                />
                {badge > 0 ? <Badge count={badge} /> : null}
              </span>
              <span
                className={`max-w-full truncate text-[10.5px] font-bold leading-none transition ${
                  active ? "text-blue-700 dark:text-blue-200" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {labels[id]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
