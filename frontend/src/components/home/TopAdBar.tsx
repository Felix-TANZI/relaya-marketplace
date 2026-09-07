import { BadgeCheck, Gift, Lock, ShieldCheck, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const MESSAGES: { icon: LucideIcon; grad: string; text: string }[] = [
  { icon: Gift,       grad: "linear-gradient(135deg,#ffa04d,#f4610f)", text: "Gagnez des points à chaque achat · Programme Fidélité" },
  { icon: Lock,       grad: "linear-gradient(135deg,#34d399,#059669)", text: "Paiement sécurisé via MoMo · Escrow BelivaY" },
  { icon: BadgeCheck, grad: "linear-gradient(135deg,#5bb8ff,#2563eb)", text: "3 200+ Vendeurs certifiés sur BelivaY" },
  { icon: Truck,      grad: "linear-gradient(135deg,#ffd45c,#f59e0b)", text: "Livraison 24–72h · Cameroun & CEMAC" },
  { icon: ShieldCheck,grad: "linear-gradient(135deg,#6ee7b7,#059669)", text: "Remboursement sous 7 jours · Sans question" },
];

/** Durée d'affichage par message (secondes). Cycle total = SLOT × nb messages. */
const SLOT = 4;
const CYCLE = SLOT * MESSAGES.length;

/* Animation injectée une seule fois (pas de dépendance Tailwind requise). */
const CSS = `
@keyframes tab-rot {
  0%   { opacity: 0; transform: translateY(7px); }
  3%   { opacity: 1; transform: translateY(0); }
  17%  { opacity: 1; transform: translateY(0); }
  20%  { opacity: 0; transform: translateY(-7px); }
  100% { opacity: 0; transform: translateY(-7px); }
}
@keyframes tab-pulse { 0%,100% { opacity:.5; transform:translateY(-50%) scale(1);} 50% { opacity:1; transform:translateY(-50%) scale(1.35);} }
.tab-msg {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  gap:9px; opacity:0; animation: tab-rot ${CYCLE}s infinite;
}
@media (prefers-reduced-motion: reduce) {
  .tab-msg { animation: none; opacity: 0; }
  .tab-msg:first-child { opacity: 1; }
  .tab-dot { animation: none !important; }
}
`;

/**
 * Ruban d'annonces fixé tout en haut de l'application, présent sur toutes les
 * pages client. Les messages pivotent au centre un par un (fondu vertical).
 * Hauteur h-8 (32 px), compensée par le décalage du header (top-8) dans AppLayout.
 */
export default function TopAdBar() {
  return (
    <div
      data-fixed-top-bar
      className="fixed inset-x-0 top-0 z-[60] h-8 overflow-hidden"
      style={{
        background:
          "radial-gradient(520px 130px at 50% 50%, rgba(244,97,15,.12), transparent 62%), linear-gradient(180deg,#0c1424,#0a0f1c)",
        boxShadow: "inset 0 2px 0 rgba(244,97,15,.55)",
      }}
    >
      <style>{CSS}</style>

      {/* Point orange qui pulse à gauche */}
      <span
        aria-hidden
        className="tab-dot"
        style={{
          position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
          width: 7, height: 7, borderRadius: "50%", background: "#f4610f",
          boxShadow: "0 0 8px rgba(244,97,15,.8)", animation: "tab-pulse 2s ease-in-out infinite",
        }}
      />

      <div style={{ position: "relative", height: "100%" }}>
        {MESSAGES.map((message, index) => {
          const Icon = message.icon;
          return (
            <div
              key={message.text}
              className="tab-msg"
              aria-hidden={index !== 0}
              style={{ animationDelay: `${index * SLOT}s` }}
            >
              <span
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: message.grad,
                }}
              >
                <Icon size={13} className="text-white" />
              </span>
              <span className="text-[12px] font-semibold text-gray-100 sm:text-[12.5px]" style={{ whiteSpace: "nowrap" }}>
                {message.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}