/**
 * Tiroir de navigation du portail organisation de livraison (telephone et
 * tablette).
 *
 * Ouvert par le bouton menu du bandeau, il glisse depuis la gauche et affiche
 * le meme menu que la colonne de bureau — via DeliverySidebarContent, pour
 * qu'une destination ajoutee un jour apparaisse partout sans retouche.
 */
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import {
  DELIVERY_SIDEBAR_SURFACE,
  DeliverySidebarContent,
  type DeliverySidebarProps,
} from "./DeliverySidebar";

export default function DeliveryDrawer({
  open,
  onClose,
  closeLabel,
  title,
  ...content
}: DeliverySidebarProps & {
  open: boolean;
  onClose: () => void;
  closeLabel: string;
  title: string;
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
      {/* Voile : se dissout au lieu de disparaitre d'un coup, pour que l'oeil
          suive le tiroir plutot que de subir un clignotement. */}
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label={closeLabel}
        onClick={onClose}
        className={`absolute inset-0 h-full w-full cursor-default bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal={open ? true : undefined}
        aria-label={title}
        /* Ferme, le panneau reste monte pour s'animer, mais `inert` le sort de
           l'ordre de tabulation : sans lui, les 13 destinations resteraient
           atteignables au clavier alors qu'elles sont hors de l'ecran. */
        inert={!open}
        className={`safe-pt safe-pb absolute inset-y-0 left-0 flex w-[86vw] max-w-[320px] flex-col overflow-y-auto p-4 text-white shadow-[8px_0_40px_rgba(8,51,68,.45)] transition-transform duration-300 ease-out [scrollbar-color:rgba(255,255,255,.25)_transparent] [scrollbar-width:thin] ${DELIVERY_SIDEBAR_SURFACE} ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="tap-target absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex items-center justify-center rounded-full bg-white/10 text-white/80 transition active:scale-90 hover:bg-white/20 hover:text-white"
        >
          <X size={18} />
        </button>

        <DeliverySidebarContent {...content} />
      </div>
    </div>
  );
}
