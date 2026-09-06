import { LogOut } from "lucide-react";
import { ORG_GROUP_ORDER, ORG_NAV_ITEMS, type OrgNavGroup, type OrgTab } from "./deliveryNav";

/**
 * Fond du menu, partage par la colonne de bureau et le tiroir mobile.
 *
 * Degrade turquoise historique du portail organisation. Les deux surfaces le
 * lisent depuis cette seule constante, sinon la couleur derive des qu'on
 * retouche l'une des deux.
 */
export const DELIVERY_SIDEBAR_SURFACE = "bg-[linear-gradient(185deg,#083344,#0E7490_58%,#155E75)]";

export interface DeliverySidebarProps {
  activeTab: OrgTab;
  onSelect: (tab: OrgTab) => void;
  onLogout: () => void;
  labels: Record<OrgTab, string>;
  groupLabels: Record<OrgNavGroup, string>;
  badges: Partial<Record<OrgTab, number>>;
  brandKicker: string;
  logoutLabel: string;
  organization: { name: string; manager: string; city: string; contract: string; status: string; avatarUrl?: string };
  statusLabel: string;
  footer: string[];
}

/**
 * Corps du menu organisation : logo, carte de l'entreprise, destinations
 * groupees et mentions legales.
 *
 * Extrait de l'`aside` pour que le tiroir mobile (DeliveryDrawer) affiche
 * exactement le meme menu que la colonne de bureau — un seul rendu a maintenir,
 * donc aucune derive possible entre les deux tailles d'ecran.
 */
export function DeliverySidebarContent({
  activeTab,
  onSelect,
  onLogout,
  labels,
  groupLabels,
  badges,
  brandKicker,
  logoutLabel,
  organization,
  statusLabel,
  footer,
}: DeliverySidebarProps) {
  return (
    <>
      <div className="rounded-[22px] border border-cyan-100/15 bg-[linear-gradient(145deg,rgba(103,232,249,.18),rgba(255,255,255,.04))] p-4 shadow-[0_18px_40px_rgba(8,51,68,.35)]">
        <div className="flex min-h-16 items-center justify-center">
          <img
            src="/belivay-logo-delivery-org.png"
            alt="BelivaY"
            className="h-14 w-full object-contain drop-shadow-[0_10px_24px_rgba(103,232,249,.18)]"
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 px-1">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/65">{brandKicker}</span>
          <span className="rounded-full bg-cyan-100/15 px-2 py-1 text-[10px] font-black text-cyan-50">{organization.status}</span>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.08] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cyan-100/15 ring-1 ring-white/15">
            {organization.avatarUrl ? (
              <img src={organization.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-base font-black text-white">{organization.name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate font-black text-white">{organization.name}</div>
            <div className="mt-0.5 truncate text-xs text-cyan-100/70">
              {organization.manager} · {organization.city}
            </div>
          </div>
        </div>
        <div className="mt-1 truncate text-xs text-cyan-100/55">{organization.contract}</div>
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
          <span className="text-cyan-100/70">{statusLabel}</span>
          <strong>{organization.status}</strong>
        </div>
      </div>

      <nav className="mt-5 flex-1 space-y-4">
        {ORG_GROUP_ORDER.map((group) => {
          const items = ORG_NAV_ITEMS.filter((item) => item.group === group);
          return (
            <div key={group}>
              <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/40">
                {groupLabels[group]}
              </div>
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = item.id === activeTab;
                  const badge = badges[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item.id)}
                      aria-current={active ? "page" : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                        active ? "bg-white/[.18] text-white" : "text-cyan-50/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon size={17} className="flex-shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{labels[item.id]}</span>
                      {badge ? (
                        <span
                          className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br ${item.accent} px-1.5 text-[10px] font-black text-white shadow-[0_2px_8px_rgba(8,51,68,.45)] ring-1 ring-white/25`}
                        >
                          {badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {group === "support" ? (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-200 transition hover:bg-rose-500/15 hover:text-white"
                  >
                    <LogOut size={17} className="flex-shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{logoutLabel}</span>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-white/10 pt-4 text-[10px] leading-5 text-cyan-100/40">
        {footer.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </>
  );
}

export default function DeliverySidebar(props: DeliverySidebarProps) {
  return (
    <aside
      className={`sticky top-0 hidden h-screen w-[288px] flex-shrink-0 flex-col overflow-y-auto p-4 text-white [scrollbar-color:rgba(255,255,255,.25)_transparent] [scrollbar-width:thin] lg:flex ${DELIVERY_SIDEBAR_SURFACE}`}
    >
      <DeliverySidebarContent {...props} />
    </aside>
  );
}
