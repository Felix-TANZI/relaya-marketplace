/**
 * Tiroir de navigation du portail point relais (telephone et tablette).
 *
 * Ouvert par le bouton menu du bandeau, il glisse depuis la gauche et occupe
 * tout l'ecran : le menu n'est pas un panneau posé À CÔTÉ de l'application,
 * c'est une page à part entière, avec sa propre identité en tête.
 *
 * La barre d'onglets du bas reste visible et active par-dessus — c'est la
 * seconde sortie, et elle evite que le menu ne devienne un cul-de-sac.
 */
import { useEffect, useRef } from "react";
import RelayMenu, { type RelayMenuProfile } from "./RelayMenu";
import type { RelayTab } from "./relayNav";

export default function RelayDrawer({
  open,
  onClose,
  closeLabel,
  title,
  labels,
  badges,
  profile,
  outbound,
  trust,
  onSelect,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  closeLabel: string;
  title: string;
  labels: Record<RelayTab, string>;
  badges: Partial<Record<RelayTab, number>>;
  profile: RelayMenuProfile;
  outbound: number;
  trust: number;
  onSelect: (tab: RelayTab, focus?: string) => void;
  footer: string[];
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Echap ferme le tiroir, et le fond ne defile plus derriere lui : sans ce
  // verrou, le geste de scroll « traverse » le tiroir sur iOS et Android.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // A chaque ouverture le tiroir repart de son sommet, sinon il conserve le
  // defilement de la visite precedente et s'ouvre au milieu de la liste.
  useEffect(() => {
    if (open) panelRef.current?.scrollTo({ top: 0 });
  }, [open]);

  return (
    <div
      className={`fixed inset-0 z-[70] lg:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={open ? undefined : true}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={open ? true : undefined}
        aria-label={title}
        /* Ferme, le panneau reste monte pour s'animer, mais `inert` le sort de
           l'ordre de tabulation : sans lui, les 21 destinations resteraient
           atteignables au clavier alors qu'elles sont hors de l'ecran. */
        inert={!open}
        className={`pb-tabbar pb-tabbar-tall absolute inset-0 overflow-y-auto shadow-[8px_0_40px_rgba(14,27,56,.45)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <RelayMenu
          labels={labels}
          badges={badges}
          profile={profile}
          outbound={outbound}
          trust={trust}
          onSelect={onSelect}
          onClose={onClose}
          closeLabel={closeLabel}
          footer={footer}
        />
      </div>
    </div>
  );
}
