import { Link } from "react-router-dom";
import { ArrowRight, Lock, RotateCcw, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Pillar {
  icon: LucideIcon;
  title: string;
  text: string;
  cta: string;
  to: string;
  tint: string;
  color: string;
}

const PILLARS: Pillar[] = [
  {
    icon: Lock,
    title: "Paiement Sécurisé",
    text: "Escrow BelivaY · MoMo, Orange & Visa protégés",
    cta: "En savoir plus",
    to: "/help",
    tint: "#e7f8ee",
    color: "#059669",
  },
  {
    icon: Truck,
    title: "Livraison 24–72h",
    text: "Partout au Cameroun & en zone CEMAC",
    cta: "Découvrir",
    to: "/help",
    tint: "#e8eefc",
    color: "#2563EB",
  },
  {
    icon: RotateCcw,
    title: "Satisfait ou Remboursé",
    text: "7 jours pour changer d'avis · Sans question",
    cta: "Notre engagement",
    to: "/about",
    tint: "#e8f1fe",
    color: "#3B82F6",
  },
];

export default function WhyBelivaySection() {
  return (
    <section className="rounded-[22px] border border-[#eef2f7] bg-[linear-gradient(180deg,#fbfcfe,#fff)] p-4 shadow-[0_12px_32px_rgba(15,23,42,.05)] sm:rounded-[28px] sm:p-6 dark:border-gray-800 dark:bg-[linear-gradient(180deg,#111827,#0f172a)]">
      <h2 className="mb-5 text-center text-[19px] font-extrabold text-gray-900 sm:text-[22px] dark:text-white">
        Pourquoi choisir <span className="text-primary">BelivaY</span> ?
      </h2>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <Link
              key={pillar.title}
              to={pillar.to}
              className="group flex flex-col rounded-[18px] border border-[#eef2f7] bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_14px_34px_rgba(15,23,42,.09)] sm:rounded-[22px] sm:p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: pillar.tint, color: pillar.color }}
              >
                <Icon size={22} />
              </span>

              <h3 className="mt-4 text-[15px] font-extrabold text-gray-900 dark:text-white">
                {pillar.title}
              </h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-500 dark:text-gray-400">
                {pillar.text}
              </p>

              <span className="mt-4 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-gray-400 transition-colors group-hover:text-primary">
                {pillar.cta}
                <ArrowRight
                  size={13}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
