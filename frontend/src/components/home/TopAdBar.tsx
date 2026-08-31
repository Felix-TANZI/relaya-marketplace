import { BadgeCheck, Gift, Lock, ShieldCheck, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const MESSAGES: { icon: LucideIcon; text: string }[] = [
  { icon: Gift, text: "Gagnez des points à chaque achat · Programme Fidélité" },
  { icon: Lock, text: "Paiement sécurisé via MoMo · Escrow BelivaY" },
  { icon: BadgeCheck, text: "3 200+ Vendeurs certifiés" },
  { icon: Truck, text: "Livraison 24–72h Cameroun & CEMAC" },
  { icon: ShieldCheck, text: "Remboursement sous 7 jours · Sans question" },
];

/**
 * Ruban d'annonces fixé tout en haut de l'application, au-dessus du header et
 * présent sur toutes les pages client. Sa hauteur (h-8) est compensée par le
 * décalage du header (top-8) et le padding haut du main, dans AppLayout.
 *
 * La liste est rendue deux fois : l'animation
 * translate de 0 à −50 %, si bien que la seconde copie prend exactement la place
 * de la première et le défilement paraît sans fin.
 */
export default function TopAdBar() {
  return (
    <div data-fixed-top-bar className="fixed inset-x-0 top-0 z-[60] h-8 overflow-hidden bg-[#0b1220] dark:bg-black">
      {/* Estompage des deux bords, pour que les messages n'apparaissent pas net. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#0b1220] to-transparent dark:from-black"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#0b1220] to-transparent dark:from-black"
      />

      <div className="flex h-full w-max animate-marquee items-center">
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} className="flex items-center">
            {MESSAGES.map((message) => {
              const Icon = message.icon;
              return (
                <div key={`${copy}-${message.text}`} className="flex items-center">
                  <span className="flex items-center gap-2 px-5 text-[11.5px] font-bold text-gray-200 sm:text-[12px]">
                    <Icon size={14} className="flex-shrink-0 text-primary" />
                    {message.text}
                  </span>
                  <span aria-hidden className="h-3.5 w-px flex-shrink-0 bg-white/15" />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
