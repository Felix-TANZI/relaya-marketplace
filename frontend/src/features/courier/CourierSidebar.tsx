import { LogOut } from "lucide-react";
import {
  COURIER_GROUP_LABELS,
  COURIER_GROUP_ORDER,
  COURIER_NAV_ITEMS,
  type CourierTab,
} from "./courierNav";

/**
 * Fond du menu, partage par la colonne de bureau et le tiroir mobile.
 *
 * Bleu nuit historique du portail livreur, sur lequel le vert BelivaY ressort.
 * Les deux surfaces le lisent depuis cette seule constante, sinon la couleur
 * derive des qu'on retouche l'une des deux.
 */
export const COURIER_SIDEBAR_SURFACE = "bg-[#0A1020]";

export interface CourierSidebarProps {
  activeTab: CourierTab;
  onSelect: (tab: CourierTab) => void;
  onLogout: () => void;
  badges: Partial<Record<CourierTab, number>>;
  courier: {
    name: string;
    city: string;
    vehicle: string;
    /** Ligne d'etat : « Disponible », « Hors ligne » ou « Demande a finaliser ». */
    status: string;
    online: boolean;
    avatarUrl?: string;
  };
  footer: string[];
}

/**
 * Corps du menu livreur : carte du livreur, destinations groupees et mentions
 * legales.
 *
 * Extrait de l'`aside` pour que le tiroir mobile (CourierDrawer) affiche
 * exactement le meme menu que la colonne de bureau — un seul rendu a maintenir,
 * donc aucune derive possible entre les deux tailles d'ecran.
 */
export function CourierSidebarContent({
  activeTab,
  onSelect,
  onLogout,
  badges,
  courier,
  footer,
}: CourierSidebarProps) {
  return (
    <>
      <div className="rounded-[14px] border border-emerald-500/15 bg-emerald-500/5 p-4">
        <div className="mb-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#10B981,#065F46)] text-lg font-extrabold text-white">
          {courier.avatarUrl ? (
            <img src={courier.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            courier.name.slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="truncate font-bold text-white">{courier.name}</div>
        <div className="mt-1 truncate text-[12px] text-emerald-300">
          {courier.city} · {courier.vehicle}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-emerald-500/15 pt-3 text-[11px]">
          <span className="text-[#8B949E]">Statut</span>
          <span className="flex items-center gap-2 font-bold text-white">
            {courier.status}
            {/* Pastille d'etat : verte en ligne, grise hors ligne. C'est le
                repere que le livreur cherche en premier en ouvrant le menu. */}
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${
                courier.online ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,.9)]" : "bg-[#8B949E]"
              }`}
            />
          </span>
        </div>
      </div>

      <nav className="mt-5 flex-1 space-y-4">
        {COURIER_GROUP_ORDER.map((group) => {
          const items = COURIER_NAV_ITEMS.filter((item) => item.group === group);
          return (
            <div key={group}>
              <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#8B949E]">
                {COURIER_GROUP_LABELS[group]}
              </div>
              <div>
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
                      className={`mb-1 flex w-full items-center gap-3 rounded-[12px] px-4 py-3 text-left text-[13px] font-semibold transition ${
                        active
                          ? "border-l-[3px] border-emerald-300 bg-emerald-500/10 text-emerald-300"
                          : "text-[#8B949E] hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon size={16} className="flex-shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {badge ? (
                        <span
                          className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br ${item.accent} px-1.5 text-[10px] font-black text-white shadow-[0_2px_8px_rgba(0,0,0,.45)] ring-1 ring-white/20`}
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
                    className="mb-1 flex w-full items-center gap-3 rounded-[12px] px-4 py-3 text-left text-[13px] font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                  >
                    <LogOut size={16} className="flex-shrink-0" />
                    <span className="min-w-0 flex-1 truncate">Se deconnecter</span>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-emerald-500/10 pt-4 text-[10px] leading-5 text-[#8B949E]">
        {footer.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </>
  );
}

export default function CourierSidebar(props: CourierSidebarProps) {
  return (
    <aside
      className={`fixed bottom-0 left-0 top-[59px] hidden w-[232px] flex-col overflow-y-auto border-r border-emerald-500/8 p-4 [scrollbar-color:rgba(16,185,129,.3)_transparent] [scrollbar-width:thin] lg:flex ${COURIER_SIDEBAR_SURFACE}`}
    >
      <CourierSidebarContent {...props} />
    </aside>
  );
}
