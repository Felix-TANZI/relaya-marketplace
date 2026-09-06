/**
 * Barre d'onglets mobile du portail point relais.
 *
 * Remplace le ruban de 22 pastilles a defilement horizontal : sur telephone on
 * expose les quatre destinations du travail quotidien (pilotage, reception,
 * retrait, stock). C'est le schema des applications mobiles actuelles — la
 * barre reste fixe, le pouce atteint tout, et rien ne se cache derriere un
 * scroll lateral.
 *
 * Le reste du menu n'a pas sa place ici : il s'ouvre par l'icone du bandeau,
 * du meme cote que le tiroir. Un second point d'entree en bas dupliquait le
 * geste et volait un cinquieme de la barre aux destinations du quotidien.
 */
import { Boxes, KeyRound, LayoutDashboard, PackagePlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RelayTab } from "./relayNav";

/** Les quatre onglets fixes, dans l'ordre du flux metier d'une journee. */
const PRIMARY: Array<{ id: RelayTab; icon: LucideIcon }> = [
  { id: "dashboard", icon: LayoutDashboard },
  { id: "reception", icon: PackagePlus },
  { id: "retrait", icon: KeyRound },
  { id: "stock", icon: Boxes },
];

/** Au-dela de 99 le badge deborderait la pastille : on plafonne. */
function formatBadge(count: number) {
  return count > 99 ? "99+" : String(count);
}

function Badge({ count }: { count: number }) {
  return (
    <span
      className="absolute -right-2.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 px-1 text-[10px] font-black leading-none text-white shadow-[0_2px_6px_rgba(190,18,60,.5)] ring-2 ring-white dark:ring-slate-900"
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
  labels: Record<RelayTab, string>;
  badges: Partial<Record<RelayTab, number>>;
  navLabel: string;
}) {
  return (
    <nav
      aria-label={navLabel}
      className="safe-pb fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900 lg:hidden"
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-1">
        {PRIMARY.map(({ id, icon: Icon }) => {
          const active = id === activeTab;
          const badge = badges[id] || 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-current={active ? "page" : undefined}
              className="tap-target group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 pb-1.5 pt-2 transition active:scale-[.93]"
            >
              {/* Pastille pleine sous l'icone active : repere de position lisible
                  d'un coup d'oeil, sans deplacer les libelles voisins. Le bleu
                  reprend celui du menu lateral et des titres d'ecran, pour que
                  la barre du bas et le tiroir se lisent comme une seule
                  interface. */}
              <span
                className={`relative flex h-8 w-12 items-center justify-center rounded-full transition duration-300 ${
                  active
                    ? "bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_4px_14px_rgba(37,99,235,.5)]"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {badge > 0 ? <Badge count={badge} /> : null}
              </span>
              <span
                className={`max-w-full truncate text-[10.5px] font-bold leading-none transition ${
                  active ? "text-blue-700 dark:text-blue-300" : "text-slate-500 dark:text-slate-400"
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
