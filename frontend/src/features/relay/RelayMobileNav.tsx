/**
 * Le dock du portail point relais.
 *
 * Quatre destinations, celles du travail d'une journée : aujourd'hui,
 * réception, retrait, stock. Le reste du menu s'ouvre par l'icône du
 * bandeau, du même côté que le tiroir — un second point d'entrée en bas
 * dupliquerait le geste et volerait un cinquième de la barre.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI UNE PASTILLE QUI FLOTTE
 *
 * La maquette ne colle pas la barre au bord de l'écran : elle la pose
 * au-dessus de la page, 12 px des côtés et 30 px du bas. Collée, une barre
 * se lit comme la fin du document et le gérant arrête d'y chercher quelque
 * chose. Flottante et translucide, elle dit que le contenu continue
 * dessous.
 *
 * Le verre et l'onglet actif sont décrits dans `relayTheme.css`
 * (`.pr-glass`, `.pr-dock`, `.pr-dock-on`) : ce sont des matières, pas des
 * couleurs, et elles ne s'expriment pas en utilitaires.
 */
import { KeyRound, Layers, LayoutGrid, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RelayTab } from "./relayNav";

/** Les quatre onglets fixes, dans l'ordre du flux métier d'une journée. */
const PRIMARY: Array<{ id: RelayTab; icon: LucideIcon }> = [
  { id: "dashboard", icon: LayoutGrid },
  { id: "reception", icon: Package },
  { id: "retrait", icon: KeyRound },
  { id: "stock", icon: Layers },
];

/** Au-delà de 99 le badge déborderait la pastille : on plafonne. */
function formatBadge(count: number) {
  return count > 99 ? "99+" : String(count);
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
  /** Libellés courts : « Retrait » tient dans la barre, « Retrait acheteur » non. */
  labels: Record<RelayTab, string>;
  badges: Partial<Record<RelayTab, number>>;
  navLabel: string;
}) {
  return (
    <nav
      aria-label={navLabel}
      /* Sur tablette le dock se resserre au centre sur 520 px : étiré sur
         820 px, les quatre onglets se retrouveraient à 200 px l'un de
         l'autre et le pouce traverserait l'écran pour changer d'onglet. */
      className="safe-mb pr-glass pr-dock fixed bottom-[30px] left-3 right-3 z-[75] flex h-16 items-center px-1 md:bottom-[28px] md:left-1/2 md:right-auto md:h-[66px] md:w-[520px] md:-translate-x-1/2 lg:hidden"
    >
      {PRIMARY.map(({ id, icon: Icon }) => {
        const active = id === activeTab;
        const badge = badges[id] || 0;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={active ? "page" : undefined}
            className={`mx-0.5 flex h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-full transition active:scale-[.95] ${
              active ? "pr-dock-on" : ""
            }`}
          >
            <span className="relative flex">
              <Icon
                size={20}
                strokeWidth={active ? 2.1 : 1.9}
                className={active ? "text-blue-700 dark:text-blue-300" : "text-slate-500 dark:text-slate-400"}
              />
              {badge > 0 ? (
                <span
                  aria-hidden
                  /* Le badge sort de l'icône plutôt que de s'y poser : à
                     18 px il masquerait le dessin, et c'est le dessin qui
                     dit de quelle destination il s'agit. */
                  className="absolute -top-[7px] -right-3.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-orange-600 px-1 text-[10.5px] font-black leading-none text-white ring-2 ring-white dark:ring-slate-900"
                >
                  {formatBadge(badge)}
                </span>
              ) : null}
            </span>
            <span
              className={`max-w-full truncate text-[11px] leading-none ${
                active
                  ? "font-black text-blue-700 dark:text-blue-300"
                  : "font-semibold text-slate-500 dark:text-slate-400"
              }`}
            >
              {labels[id]}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
