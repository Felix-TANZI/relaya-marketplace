import { Link } from "react-router-dom";
import {
  ArrowRight,
  Gem,
  Globe,
  Info,
  LifeBuoy,
  Lock,
  RotateCcw,
  ShoppingCart,
  Star,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getCategoryTheme } from "@/data/categoryThemes";

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

/** Raccourcis du bandeau marketplace, à droite. */
const MARKETPLACE_LINKS: { icon: LucideIcon; label: string; to: string }[] = [
  { icon: Info, label: "À propos", to: "/about" },
  { icon: ShoppingCart, label: "Explorer BelivaY", to: "/categorie/all" },
  { icon: LifeBuoy, label: "Aide", to: "/help" },
  { icon: Gem, label: "Premium", to: "/premium" },
];

const CEMAC_COUNTRIES = "CMR · Gabon · RCA · Tchad · Congo · Guinée Éq.";

export default function WhyBelivaySection() {
  /* Les volumes viennent du thème « Tout voir » : une seule source à maintenir. */
  const catalogue = getCategoryTheme("all");

  const marketplaceStats = [
    { value: catalogue?.count ?? "15 240", label: "Produits" },
    { value: catalogue?.vendors ?? "3 200", label: "Vendeurs" },
    { value: "50K+", label: "Clients" },
    { value: (catalogue?.rating ?? "4.8 / 5").split(" ")[0], label: "Satisfaction", star: true },
  ];

  return (
    <section className="rounded-[22px] border border-[#eef2f7] bg-[linear-gradient(180deg,#fbfcfe,#fff)] p-3 shadow-[0_12px_32px_rgba(15,23,42,.05)] sm:rounded-[28px] sm:p-5 dark:border-gray-800 dark:bg-[linear-gradient(180deg,#111827,#0f172a)]">
      <h2 className="mb-4 text-center text-[19px] font-extrabold text-gray-900 sm:text-[22px] dark:text-white">
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

      {/* ═══════════════ Bandeau BelivaY · Marketplace CEMAC ═══════════════ */}
      <div
        className="relative mt-3 overflow-hidden rounded-[18px] border border-[#f7e2c9] p-3.5 sm:mt-4 sm:rounded-[22px] sm:p-4"
        style={{ background: "linear-gradient(118deg,#FFF3E4 0%,#FFE7CE 52%,#FFF7EC 100%)" }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/45"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-promo-sweep bg-gradient-to-r from-transparent via-white/50 to-transparent"
        />

        {/*
          Une seule ligne dès `lg` : identité à gauche, chiffres au centre,
          raccourcis en 2 × 2 collés à droite. Les largeurs des blocs latéraux
          sont fixées — c'est ce qui garde le titre sur une ligne et empêche les
          raccourcis de se réorganiser en colonne quand la place se resserre.
          Sous `lg`, les trois blocs s'empilent.
        */}
        <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          {/* Identité */}
          <div className="flex min-w-0 items-center gap-3 lg:w-[300px] lg:flex-shrink-0">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-[0_6px_16px_rgba(244,121,32,.18)]">
              <ShoppingCart size={22} />
            </span>

            <div className="min-w-0">
              <p className="text-[14.5px] font-black leading-tight text-gray-900 sm:text-[16px] lg:whitespace-nowrap">
                BelivaY · Marketplace CEMAC
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-semibold leading-snug text-gray-500">
                <span className="rounded bg-primary/15 px-1 py-px text-[8.5px] font-black uppercase tracking-[0.1em] text-[#C85E14]">
                  CM
                </span>
                Made in Cameroon
                <span className="text-gray-300">·</span>
                <Globe size={11} className="text-primary" />
                {CEMAC_COUNTRIES}
              </p>
            </div>
          </div>

          {/* Chiffres — quatre pastilles alignées, à la suite de l'identité. */}
          <div className="grid grid-cols-4 gap-2 lg:flex lg:flex-1 lg:flex-nowrap lg:items-center">
            {marketplaceStats.map((stat) => (
              <article
                key={stat.label}
                className="rounded-[12px] bg-white px-3 py-2 text-center shadow-[0_4px_12px_rgba(180,83,9,.10)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                <p className="flex items-center justify-center gap-0.5 whitespace-nowrap text-[13px] font-black leading-none text-[#C85E14]">
                  {stat.value}
                  {stat.star ? (
                    <Star size={10} className="text-amber-500" fill="currentColor" />
                  ) : null}
                </p>
                <p className="mt-1 whitespace-nowrap text-[8.5px] font-black uppercase tracking-[0.12em] text-gray-400">
                  {stat.label}
                </p>
              </article>
            ))}
          </div>

          {/* Raccourcis — bloc 2 × 2 aligné à droite. */}
          <div className="grid grid-cols-2 gap-2 lg:ml-auto lg:w-[252px] lg:flex-shrink-0">
            {MARKETPLACE_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  to={link.to}
                  className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-[11.5px] font-bold text-gray-700 shadow-[0_4px_12px_rgba(180,83,9,.10)] transition-all duration-200 hover:-translate-y-0.5 hover:text-primary"
                >
                  <Icon size={12} className="flex-shrink-0 text-primary" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
