import { LogOut } from "lucide-react";
import { RELAY_NAV_ITEMS, type RelayNavGroup, type RelayNavItem, type RelayTab } from "./relayNav";

const GROUP_ORDER: RelayNavGroup[] = ["pilotage", "operations", "qualite", "gestion", "risque", "compte"];

/**
 * Fond du menu, partage par la colonne de bureau et le tiroir mobile.
 *
 * Deux halos bleus poses sur un bleu nuit profond. Les teintes viennent de la
 * meme echelle que le bleu des ecrans (`blue-900` #1E3A8A, `blue-800` #1E40AF,
 * halos en `blue-400`/`blue-500`) : le menu et les titres des pages parlent
 * ainsi la meme langue chromatique. Les deux surfaces lisent cette seule
 * constante, sinon la couleur derive des qu'on retouche l'une des deux.
 */
export const RELAY_SIDEBAR_SURFACE =
  "bg-[radial-gradient(115%_55%_at_88%_8%,rgba(96,165,250,.22),transparent_62%),radial-gradient(85%_45%_at_6%_74%,rgba(59,130,246,.16),transparent_66%),linear-gradient(176deg,#0A1330_0%,#1E3A8A_54%,#1E40AF_100%)]";

/**
 * Icone du menu : trait fin lucide en blanc, pose sur un halo bleu.
 *
 * Le `drop-shadow` colore fait tout le travail — l'icone reste blanche (donc
 * lisible) mais parait s'allumer, comme sur les consoles de pilotage dont
 * s'inspire le portail.
 */
function NavIcon({ item, active }: { item: RelayNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <span
      aria-hidden
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center text-white transition duration-300 ease-out group-hover:scale-110 group-hover:drop-shadow-[0_0_12px_rgba(147,197,253,.95)] ${
        active
          ? "animate-nav-float drop-shadow-[0_0_14px_rgba(147,197,253,1)]"
          : "drop-shadow-[0_0_7px_rgba(147,197,253,.6)]"
      }`}
    >
      <Icon size={19} strokeWidth={1.7} />
    </span>
  );
}

export interface RelaySidebarProps {
  activeTab: RelayTab;
  onSelect: (tab: RelayTab) => void;
  onLogout: () => void;
  labels: Record<RelayTab, string>;
  groupLabels: Record<RelayNavGroup, string>;
  badges: Partial<Record<RelayTab, number>>;
  brandKicker: string;
  logoutLabel: string;
  profile: { name: string; status: string; city: string; trust: number; avatarUrl?: string };
  footer: string[];
}

/**
 * Corps du menu point relais : logo, carte du relais, destinations groupees et
 * mentions legales.
 *
 * Extrait de l'`aside` pour que le tiroir mobile (RelayDrawer) affiche
 * exactement le meme menu que la colonne de bureau — un seul rendu a maintenir,
 * donc aucune derive possible entre les deux tailles d'ecran.
 */
export function RelaySidebarContent({
  activeTab,
  onSelect,
  onLogout,
  labels,
  groupLabels,
  badges,
  brandKicker,
  logoutLabel,
  profile,
  footer,
}: RelaySidebarProps) {
  return (
    <>
      <div className="rounded-[22px] border border-blue-300/25 bg-[linear-gradient(145deg,rgba(96,165,250,.16),rgba(255,255,255,.03))] p-4 shadow-[0_18px_40px_rgba(2,18,29,.55)]">
        <div className="flex min-h-16 items-center justify-center">
          {/* `brightness-0 invert` ramene le panier et le mot BelivaY en blanc pur
              sur le bleu nuit, sans dependre d'un second fichier de logo. */}
          <img
            src="/belivay-logo-relay-point.png"
            alt="BelivaY"
            className="h-14 w-full object-contain brightness-0 invert drop-shadow-[0_0_18px_rgba(147,197,253,.5)]"
          />
        </div>
        <p className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.22em] text-blue-100">{brandKicker}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-blue-300/20 bg-white/[.06] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-400 to-blue-700 ring-1 ring-blue-200/30">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-base font-black text-white">{profile.name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate font-black text-white">{profile.name}</div>
            <div className="mt-0.5 truncate text-xs font-semibold text-blue-100/70">
              {profile.status} · {profile.city}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-blue-300/20 pt-3 text-xs">
          <span className="font-semibold uppercase tracking-[0.08em] text-blue-100/70">Trust Score PR</span>
          <span className="flex items-center gap-2 font-black text-white">
            {profile.trust}/100
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-blue-200 to-blue-400 shadow-[0_0_12px_rgba(147,197,253,1)]" />
          </span>
        </div>
      </div>

      <nav className="mt-5 flex-1 space-y-5">
        {GROUP_ORDER.map((group) => {
          const items = RELAY_NAV_ITEMS.filter((item) => item.group === group);
          return (
            <div key={group}>
              <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-300/75">
                {groupLabels[group]}
              </div>
              <div>
                {items.map((item) => {
                  const active = item.id === activeTab;
                  const badge = badges[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item.id)}
                      aria-current={active ? "page" : undefined}
                      /* Filet sous chaque entree : il structure la liste sans
                         cadre ni pastille, comme sur les consoles de pilotage. */
                      className={`group relative flex w-full items-center gap-3 border-b border-white/[.07] py-2.5 pl-2.5 pr-3 text-left transition duration-300 last:border-b-0 ${
                        active
                          ? "bg-[linear-gradient(90deg,rgba(96,165,250,.22),transparent)]"
                          : "hover:bg-blue-300/[.10]"
                      }`}
                    >
                      {active ? (
                        <span
                          aria-hidden
                          className="absolute -left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-blue-300 shadow-[0_0_14px_rgba(147,197,253,1)]"
                        />
                      ) : null}
                      <NavIcon item={item} active={active} />
                      <span
                        className={`min-w-0 flex-1 truncate text-[12.5px] font-semibold uppercase tracking-[0.07em] transition ${
                          active ? "text-blue-200 drop-shadow-[0_0_10px_rgba(147,197,253,.65)]" : "text-white"
                        }`}
                      >
                        {labels[item.id]}
                      </span>
                      {badge ? (
                        <span
                          className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br ${item.accent} px-1.5 text-[10px] font-black text-white shadow-[0_2px_10px_rgba(2,18,29,.6)] ring-1 ring-white/25`}
                        >
                          {badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {group === "compte" ? (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="group relative flex w-full items-center gap-3 py-2.5 pl-2.5 pr-3 text-left transition duration-300 hover:bg-rose-400/[.12]"
                  >
                    <span
                      aria-hidden
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-rose-200 drop-shadow-[0_0_7px_rgba(253,164,175,.6)] transition duration-300 ease-out group-hover:scale-110 group-hover:text-white group-hover:drop-shadow-[0_0_12px_rgba(253,164,175,.95)]"
                    >
                      <LogOut size={19} strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold uppercase tracking-[0.07em] text-rose-200 transition group-hover:text-white">
                      {logoutLabel}
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-blue-300/20 pt-4 text-[10px] leading-5 text-blue-100/35">
        {footer.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </>
  );
}

export default function RelaySidebar(props: RelaySidebarProps) {
  return (
    <aside
      className={`sticky top-0 hidden h-screen w-[288px] flex-shrink-0 flex-col overflow-y-auto border-r border-blue-300/15 p-4 text-white [scrollbar-color:rgba(147,197,253,.3)_transparent] [scrollbar-width:thin] lg:flex ${RELAY_SIDEBAR_SURFACE}`}
    >
      <RelaySidebarContent {...props} />
    </aside>
  );
}
