/**
 * La colonne de navigation du portail point relais, sur grand écran.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI ELLE N'EST PLUS BLEU NUIT
 *
 * L'ancienne colonne était une console : fond bleu profond, icônes à halo,
 * libellés en capitales espacées. C'était cohérent avec elle-même, mais plus
 * du tout avec le reste du portail — le téléphone travaille sur un gris
 * clair, des cartes blanches, et ne réserve les couleurs pleines qu'à ce qui
 * presse. Un gérant qui passe du comptoir à son ordinateur changeait
 * d'application.
 *
 * La colonne reprend donc la même langue : surface blanche, une seule tache
 * orange pour l'identité, du bleu pour la position courante, du pêche pour
 * ce qui réclame. Rien n'y brille.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QU'ELLE GARDE DE L'ANCIENNE
 *
 * Les vingt-et-une destinations et leurs six groupes, lus depuis
 * `RELAY_NAV_ITEMS`. Sur un écran large on ne hiérarchise pas en cachant :
 * tout tient dans la colonne, et le groupe suffit à s'orienter. C'est le
 * téléphone qui a besoin d'une grille de quatre cartes, pas le bureau.
 */
import { LogOut } from "lucide-react";
import { RELAY_NAV_ITEMS, type RelayNavGroup, type RelayNavItem, type RelayTab } from "./relayNav";

const GROUP_ORDER: RelayNavGroup[] = ["pilotage", "operations", "qualite", "gestion", "risque", "compte"];

/** Circonference de l'anneau du Trust Score (r = 15.5 dans un viewBox de 36). */
const TRUST_RING = 2 * Math.PI * 15.5;

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
 * Une destination.
 *
 * L'icône est orange au repos, bleue quand on y est : la même règle que les
 * listes du téléphone. Pas de pastille sous l'icône au repos — une colonne
 * de vingt-et-une pastilles ne dit plus rien.
 */
function NavRow({
  item,
  active,
  label,
  badge,
  onSelect,
}: {
  item: RelayNavItem;
  active: boolean;
  label: string;
  badge?: number;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition ${
        active
          ? "bg-[#EAF0FF] dark:bg-blue-950/50"
          : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
      }`}
    >
      <Icon
        size={19}
        strokeWidth={2.2}
        className={`flex-shrink-0 ${
          active ? "text-[#2456D6] dark:text-blue-300" : "text-[#EF6A00] dark:text-orange-400"
        }`}
      />
      <span
        className={`min-w-0 flex-1 truncate text-[14px] font-bold ${
          active ? "text-[#2456D6] dark:text-blue-200" : "text-slate-700 dark:text-slate-200"
        }`}
      >
        {label}
      </span>
      {badge ? (
        <span className="flex h-[22px] min-w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-[#FFF1E2] px-1.5 text-[11.5px] font-black text-[#B84A00] dark:bg-orange-950 dark:text-orange-300">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}

export default function RelaySidebar({
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
  const trust = Math.min(100, Math.max(0, Math.round(profile.trust)));
  const ouvert = profile.status === "Ouvert";

  return (
    <aside className="sticky top-0 hidden h-screen w-[288px] flex-shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white [scrollbar-color:#CBD5E1_transparent] [scrollbar-width:thin] dark:border-slate-800 dark:bg-slate-900 lg:flex">
      {/* ── La marque ────────────────────────────────────────────────────
          Le logo orange sur blanc, comme dans le bandeau du telephone. Il ne
          se met plus en blanc sur bleu nuit : c'est la meme marque, elle a la
          meme couleur partout. */}
      <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
        <img
          src="/belivay-logo.png"
          alt="BelivaY"
          className="h-9 w-auto object-contain dark:brightness-0 dark:invert"
        />
        <p className="mt-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#2456D6] dark:text-blue-300">
          {brandKicker}
        </p>
      </div>

      {/* ── L'identité ───────────────────────────────────────────────────
          La seule surface pleine de la colonne, et elle dit OU l'on travaille.
          Meme carte orange que le menu du telephone. */}
      <div className="px-4 pt-4">
        <div className="pr-sunrise rounded-[16px] px-4 py-3.5 text-white shadow-[0_4px_14px_rgba(217,80,0,.25)]">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0E1B38] text-[14px] font-black text-white ring-2 ring-white/70">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                profile.name.slice(0, 2).toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-black leading-tight">{profile.name}</div>
              <div className="mt-0.5 truncate text-[12.5px] font-medium text-white/85">{profile.city}</div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/25 pt-3">
            <span
              className={`flex items-center rounded-full px-2.5 py-[4px] text-[12px] font-bold ${
                ouvert ? "bg-[#E6F4EC] text-[#1F7A4D]" : "bg-white/25 text-white"
              }`}
            >
              <span
                aria-hidden
                className={`mr-1.5 h-[6px] w-[6px] rounded-full ${ouvert ? "bg-[#1F7A4D]" : "bg-white"}`}
              />
              {profile.status}
            </span>

            {/* Le Trust Score en anneau, comme sur l'accueil : une proportion
                se lit avant un chiffre. */}
            <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center">
              <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" className="stroke-white/30" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="stroke-white transition-[stroke-dasharray] duration-700"
                  strokeDasharray={`${(trust / 100) * TRUST_RING} ${TRUST_RING}`}
                />
              </svg>
              <span className="text-[12px] font-black">{trust}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Les destinations ─────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 pt-4">
        {GROUP_ORDER.map((group) => {
          const items = RELAY_NAV_ITEMS.filter((item) => item.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-4">
              <div className="mb-1 px-3 text-[11px] font-black uppercase leading-none tracking-[0.1em] text-slate-400 dark:text-slate-500">
                {groupLabels[group]}
              </div>
              {items.map((item) => (
                <NavRow
                  key={item.id}
                  item={item}
                  active={item.id === activeTab}
                  label={labels[item.id]}
                  badge={badges[item.id]}
                  onSelect={() => onSelect(item.id)}
                />
              ))}
            </div>
          );
        })}
      </nav>

      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-red-100 bg-[#FDECEA] px-4 py-3 text-[14px] font-black text-[#B42318] transition active:scale-[.97] dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          <LogOut size={17} strokeWidth={2.4} /> {logoutLabel}
        </button>

        <div className="mt-4 space-y-0.5 border-t border-slate-100 pt-4 dark:border-slate-800">
          {footer.map((line) => (
            <p key={line} className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
              {line}
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
}
