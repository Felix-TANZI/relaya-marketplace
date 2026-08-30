/**
 * Barre d'onglets mobile du portail livreur.
 *
 * Sur telephone on expose les quatre destinations du travail quotidien d'un
 * livreur — pilotage, tournee, courses, scanner. C'est le schema des
 * applications mobiles actuelles : la barre reste fixe et le pouce atteint
 * tout.
 *
 * Le reste du menu n'a plus sa place ici : il s'ouvre par l'icone du bandeau,
 * du meme cote que le tiroir. L'ancien bouton « Plus » ouvrait une seconde
 * liste en bas d'ecran, ce qui donnait deux endroits ou chercher la meme
 * destination.
 */
import { Gauge, Package, Route, ScanLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TAB_LABELS, type CourierTab } from "./courierNav";

/** Les quatre onglets fixes, dans l'ordre du flux metier d'une journee. */
const PRIMARY: Array<{ id: CourierTab; icon: LucideIcon }> = [
  { id: "dashboard", icon: Gauge },
  { id: "tournee", icon: Route },
  { id: "courses", icon: Package },
  { id: "scanner", icon: ScanLine },
];

/** Les destinations que la barre du bas expose deja, badge compris. */
export const COURIER_TABBAR_IDS: CourierTab[] = PRIMARY.map((item) => item.id);

/** Au-dela de 99 le badge deborderait la pastille : on plafonne. */
function formatBadge(count: number) {
  return count > 99 ? "99+" : String(count);
}

function Badge({ count }: { count: number }) {
  return (
    <span
      className="absolute -right-2 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-black leading-none text-[#022c22] ring-2 ring-[#07130f]"
      aria-hidden
    >
      {formatBadge(count)}
    </span>
  );
}

export default function CourierMobileNav({
  activeTab,
  onSelect,
  badges,
}: {
  activeTab: CourierTab;
  onSelect: (tab: CourierTab) => void;
  badges: Partial<Record<CourierTab, number>>;
}) {
  return (
    <nav
      aria-label="Espace livreur"
      className="fixed bottom-0 left-0 right-0 z-[900] border-t border-emerald-500/10 bg-[#07130f]/95 shadow-[0_-8px_30px_rgba(0,0,0,.35)] backdrop-blur lg:hidden"
    >
      <div className="flex h-[58px] items-center px-2">
        {PRIMARY.map(({ id, icon: Icon }) => {
          const active = id === activeTab;
          const badge = badges[id] || 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-[3px] transition active:scale-[.93]"
            >
              <span
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition duration-300 ${
                  active ? "bg-emerald-500 text-[#022c22] shadow-[0_4px_12px_rgba(16,185,129,.45)]" : "text-[#8B949E]"
                }`}
              >
                <Icon size={17} strokeWidth={active ? 2.4 : 2} />
                {badge > 0 ? <Badge count={badge} /> : null}
              </span>
              <span className={`max-w-full truncate text-[9px] font-bold ${active ? "text-emerald-300" : "text-[#8B949E]"}`}>
                {TAB_LABELS[id]}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
