/**
 * Barre d'onglets mobile du portail organisation de livraison.
 *
 * Remplace le ruban de 13 pastilles a defilement horizontal : sur telephone on
 * expose les quatre destinations du travail quotidien d'un dispatcher —
 * pilotage, missions a affecter, colis suivis, flotte. C'est le schema des
 * applications mobiles actuelles : la barre reste fixe, le pouce atteint tout,
 * et rien ne se cache derriere un scroll lateral.
 *
 * Le reste du menu n'a pas sa place ici : il s'ouvre par l'icone du bandeau,
 * du meme cote que le tiroir. Un second point d'entree en bas dupliquait le
 * geste et volait un cinquieme de la barre aux destinations du quotidien.
 */
import { Gauge, PackageSearch, Truck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { OrgTab } from "./deliveryNav";

/** Les quatre onglets fixes, dans l'ordre du flux metier d'une journee. */
const PRIMARY: Array<{ id: OrgTab; icon: LucideIcon }> = [
  { id: "dashboard", icon: Gauge },
  { id: "missions", icon: Truck },
  { id: "parcels", icon: PackageSearch },
  { id: "fleet", icon: Users },
];

/** Les destinations que la barre du bas expose deja, badge compris. */
export const DELIVERY_TABBAR_IDS: OrgTab[] = PRIMARY.map((item) => item.id);

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

export default function DeliveryMobileNav({
  activeTab,
  onSelect,
  labels,
  badges,
  navLabel,
}: {
  activeTab: OrgTab;
  onSelect: (tab: OrgTab) => void;
  labels: Record<OrgTab, string>;
  badges: Partial<Record<OrgTab, number>>;
  navLabel: string;
}) {
  return (
    <nav
      aria-label={navLabel}
      className="safe-pb fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 lg:hidden"
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
                  d'un coup d'oeil, sans deplacer les libelles voisins. Le
                  `cyan-700` est celui que le portail utilise deja partout
                  (kickers, encarts, boutons). */}
              <span
                className={`relative flex h-8 w-12 items-center justify-center rounded-full transition duration-300 ${
                  active
                    ? "bg-cyan-700 text-white shadow-[0_4px_12px_rgba(14,116,144,.45)]"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {badge > 0 ? <Badge count={badge} /> : null}
              </span>
              <span
                className={`max-w-full truncate text-[10.5px] font-bold leading-none transition ${
                  active ? "text-cyan-700 dark:text-cyan-300" : "text-slate-500 dark:text-slate-400"
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
