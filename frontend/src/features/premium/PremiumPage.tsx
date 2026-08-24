import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Check,
  Gem,
  Headphones,
  PiggyBank,
  Sparkles,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Perk {
  icon: LucideIcon;
  title: string;
  text: string;
}

const PERKS: Perk[] = [
  {
    icon: PiggyBank,
    title: "Cashback 5 %",
    text: "Reversé sur votre portefeuille BelivaY à chaque commande livrée, sans plafond mensuel.",
  },
  {
    icon: Truck,
    title: "Livraison prioritaire 24h",
    text: "Vos colis passent en tête de file à Yaoundé et Douala, frais de port offerts dès 15 000 FCFA.",
  },
  {
    icon: BadgeCheck,
    title: "Retours étendus 30 jours",
    text: "Au lieu de 7 jours, et l'enlèvement du colis retour est pris en charge.",
  },
  {
    icon: Sparkles,
    title: "Ventes privées",
    text: "Accès aux ventes flash 24h avant tout le monde, sur les stocks réservés aux membres.",
  },
  {
    icon: Headphones,
    title: "Support dédié",
    text: "Une ligne WhatsApp prioritaire, réponse garantie sous 2h en journée.",
  },
  {
    icon: Gem,
    title: "Statut visible",
    text: "Badge Premium sur vos avis et vos échanges avec les vendeurs.",
  },
];

const PLANS = [
  {
    name: "Mensuel",
    price: "2 500",
    period: "par mois",
    note: "Sans engagement, résiliable à tout moment.",
    featured: false,
  },
  {
    name: "Annuel",
    price: "24 000",
    period: "par an",
    note: "Deux mois offerts par rapport à la formule mensuelle.",
    featured: true,
  },
];

const PLAN_LINES = ["Cashback 5 %", "Livraison prioritaire", "Retours 30 jours", "Ventes privées"];

export default function PremiumPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f3ff_0%,#fff_16%,#f8fafc_100%)] dark:bg-gray-950">
      <div className="mx-auto max-w-[1100px] px-3 pb-14 pt-4 sm:px-4">
        {/* ═══ Hero ═══ */}
        <section
          className="relative overflow-hidden rounded-[24px] p-6 text-white shadow-[0_18px_44px_rgba(124,58,237,.28)] sm:rounded-[30px] sm:p-10"
          style={{
            background:
              "linear-gradient(102deg,#5B21B6 0%,#7C3AED 34%,#8B5CF6 62%,#A78BFA 100%)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-promo-sweep bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur-sm">
              <Gem size={12} className="animate-gem-sparkle text-amber-200" fill="currentColor" />
              Programme d'abonnement
            </span>

            <h1 className="mt-3 text-[28px] font-black leading-tight sm:text-[40px]">
              BelivaY Premium
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/85 sm:text-[15px]">
              Cashback 5 %, livraison prioritaire 24h et retours étendus à 30 jours. Un abonnement
              pensé pour ceux qui commandent régulièrement au Cameroun et en zone CEMAC.
            </p>

            <a
              href="#offres"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13px] font-black text-[#5B21B6] transition hover:bg-amber-100"
            >
              <Gem size={15} fill="currentColor" />
              Choisir mon offre
            </a>
          </div>
        </section>

        {/* ═══ Avantages ═══ */}
        <section className="mt-4">
          <h2 className="mb-3 flex items-center gap-2 text-[17px] font-extrabold text-gray-900 dark:text-white">
            <span className="h-[18px] w-[3px] rounded bg-[#7C3AED]" />
            Ce que Premium change
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PERKS.map((perk) => {
              const Icon = perk.icon;
              return (
                <article
                  key={perk.title}
                  className="rounded-[18px] border border-[#e9e4fb] bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(124,58,237,.12)] dark:border-gray-800 dark:bg-gray-900"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3eeff] text-[#7C3AED] dark:bg-[#7C3AED]/20">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-3 text-[14px] font-extrabold text-gray-900 dark:text-white">
                    {perk.title}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-500 dark:text-gray-400">
                    {perk.text}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ═══ Offres ═══ */}
        <section id="offres" className="mt-6 scroll-mt-40">
          <h2 className="mb-3 flex items-center gap-2 text-[17px] font-extrabold text-gray-900 dark:text-white">
            <span className="h-[18px] w-[3px] rounded bg-[#7C3AED]" />
            Choisir une formule
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {PLANS.map((plan) => (
              <article
                key={plan.name}
                className={`relative flex flex-col rounded-[20px] border p-5 ${
                  plan.featured
                    ? "border-[#7C3AED] bg-[linear-gradient(180deg,#f8f5ff,#fff)] shadow-[0_14px_36px_rgba(124,58,237,.14)] dark:bg-[linear-gradient(180deg,#1e1b3a,#0f172a)]"
                    : "border-[#e9e4fb] bg-white dark:border-gray-800 dark:bg-gray-900"
                }`}
              >
                {plan.featured ? (
                  <span className="absolute right-4 top-4 rounded-full bg-amber-300 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-amber-950">
                    Le plus choisi
                  </span>
                ) : null}

                <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#7C3AED]">
                  {plan.name}
                </p>
                <p className="mt-2 text-[30px] font-black leading-none text-gray-900 dark:text-white">
                  {plan.price}
                  <span className="ml-1.5 text-[13px] font-bold text-gray-400">FCFA</span>
                </p>
                <p className="mt-1 text-[12px] font-semibold text-gray-500 dark:text-gray-400">
                  {plan.period}
                </p>
                <p className="mt-3 text-[12.5px] leading-relaxed text-gray-500 dark:text-gray-400">
                  {plan.note}
                </p>

                <ul className="mt-4 flex flex-col gap-2">
                  {PLAN_LINES.map((line) => (
                    <li
                      key={line}
                      className="flex items-center gap-2 text-[12.5px] font-semibold text-gray-700 dark:text-gray-300"
                    >
                      <Check size={14} className="flex-shrink-0 text-[#7C3AED]" />
                      {line}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`mt-5 flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-black transition ${
                    plan.featured
                      ? "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                      : "border border-[#7C3AED] text-[#7C3AED] hover:bg-[#f3eeff]"
                  }`}
                >
                  <Gem size={15} fill="currentColor" />
                  S'inscrire à Premium
                </Link>
              </article>
            ))}
          </div>

          <p className="mt-4 text-center text-[11.5px] text-gray-400">
            L'inscription passe par votre compte BelivaY. Le prélèvement Mobile Money démarre après
            confirmation, et reste résiliable depuis votre profil.
          </p>
        </section>
      </div>
    </div>
  );
}
