// frontend/src/features/about/AboutPage.tsx
// Page « À propos » : hero, mission, fonctionnement de l'Escrow, valeurs,
// présence CEMAC, chiffres clés, mentions légales et contact.

import { useState } from "react";
import { Link } from "react-router-dom";
import { PfShellStyles } from "@/styles/pfShell";
import {
  BarChart3,
  ChevronDown,
  Cookie,
  FileText,
  Gem,
  Globe,
  Heart,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Rocket,
  Scale,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Star,
  Store,
  Target,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ────────────────────────────── Données ────────────────────────────── */

const STATS: { value: string; label: string; bg: string; color: string; star?: boolean }[] = [
  { value: "3 200+", label: "Vendeurs certifiés", bg: "#fff4ea", color: "#C85E14" },
  { value: "15K+", label: "Produits", bg: "#eafaf0", color: "#047857" },
  { value: "4", label: "Pays CEMAC", bg: "#eaf1fe", color: "#1D4ED8" },
  { value: "4.8", label: "Satisfaction", bg: "#fff9e6", color: "#B45309", star: true },
];

const ESCROW_STEPS: { title: string; text: string; bg: string; dot: string }[] = [
  {
    title: "Achetez en toute confiance",
    text: "Payez via Mobile Money (MTN, Orange). Vos fonds sont sécurisés.",
    bg: "#eafaf0",
    dot: "#047857",
  },
  {
    title: "Fonds bloqués en Escrow",
    text: "Le vendeur ne reçoit rien tant que vous n'avez pas confirmé la réception.",
    bg: "#fff4ea",
    dot: "#EA580C",
  },
  {
    title: "Livraison suivie",
    text: "Suivi en temps réel. 24–72h au Cameroun, 5–7j zone CEMAC.",
    bg: "#fff8ee",
    dot: "#F47920",
  },
  {
    title: "Confirmez ou réclamez",
    text: "Satisfait ? Confirmez. Problème ? 7 jours pour ouvrir un litige. Remboursement garanti.",
    bg: "#fef2f2",
    dot: "#DC2626",
  },
  {
    title: "Vendeur payé",
    text: "24h après votre confirmation, les fonds sont libérés au vendeur. Tout le monde gagne !",
    bg: "#eafaf0",
    dot: "#047857",
  },
];

const VALUES: { icon: LucideIcon; title: string; text: string; bg: string; accent: string; color: string }[] = [
  {
    icon: Lock,
    title: "Confiance",
    text: "L'Escrow protège chaque transaction. Zéro risque pour l'acheteur.",
    bg: "linear-gradient(135deg,#eafaf0,#f4fdf7)",
    accent: "#059669",
    color: "#F47920",
  },
  {
    icon: Globe,
    title: "Made in Africa",
    text: "100% africaine. Conçue par des Camerounais pour l'Afrique Centrale.",
    bg: "linear-gradient(135deg,#eaf1fe,#f5f9ff)",
    accent: "#2563EB",
    color: "#2563EB",
  },
  {
    icon: Smartphone,
    title: "Mobile First",
    text: "Paiement MTN MoMo & Orange Money. Simple et rapide.",
    bg: "linear-gradient(135deg,#f1ecfe,#f8f5ff)",
    accent: "#7C3AED",
    color: "#F47920",
  },
  {
    icon: Star,
    title: "Qualité",
    text: "Vendeurs vérifiés Or ou Platinum. Sélection rigoureuse.",
    bg: "linear-gradient(135deg,#fff8e1,#fffdf2)",
    accent: "#F59E0B",
    color: "#F59E0B",
  },
  {
    icon: Rocket,
    title: "Innovation",
    text: "IA de recommandation, suivi GPS, chatbot intelligent.",
    bg: "linear-gradient(135deg,#fff3e8,#fff9f4)",
    accent: "#EA580C",
    color: "#F47920",
  },
  {
    icon: Heart,
    title: "Impact Social",
    text: "Priorité aux artisans et PME africaines. Commerce équitable.",
    bg: "linear-gradient(135deg,#fdeef5,#fff5fa)",
    accent: "#DB2777",
    color: "#EF4444",
  },
];

const COUNTRIES = [
  { code: "CM", name: "Cameroun" },
  { code: "GA", name: "Gabon" },
  { code: "TD", name: "Tchad" },
  { code: "CG", name: "Congo" },
  { code: "CF", name: "RCA" },
  { code: "GQ", name: "Guinée Éq." },
];

const KEY_FIGURES: { icon: LucideIcon; label: string; bg: string; color: string }[] = [
  { icon: ShieldCheck, label: "0% fraude", bg: "#eafaf0", color: "#047857" },
  { icon: Zap, label: "24h livraison", bg: "#fff4ea", color: "#C85E14" },
  { icon: Phone, label: "Support 7j/7", bg: "#eaf1fe", color: "#047857" },
  { icon: FileText, label: "Retour 7j", bg: "#f1ecfe", color: "#7C3AED" },
];

const LEGAL: { icon: LucideIcon; title: string; sub: string; bg: string; color: string; body: string }[] = [
  {
    icon: FileText,
    title: "Conditions Générales d'Utilisation (CGU)",
    sub: "Règles d'utilisation de la plateforme BelivaY",
    bg: "#eaf1fe",
    color: "#2563EB",
    body: "L'accès à BelivaY suppose un compte nominatif et l'acceptation des présentes règles. Chaque utilisateur répond de l'exactitude de ses informations et de la licéité des contenus qu'il publie. Les comptes présentant une activité frauduleuse, une usurpation d'identité ou des annonces trompeuses sont suspendus sans préavis.",
  },
  {
    icon: ShoppingCart,
    title: "Conditions Générales de Vente (CGV)",
    sub: "Achats, paiement, livraison, retour, garanties",
    bg: "#fff4ea",
    color: "#C85E14",
    body: "Toute commande payée est placée sous séquestre Escrow BelivaY. Les fonds ne sont libérés au vendeur que 24h après la confirmation de réception, ou automatiquement à l'issue du délai de contestation. Le retour est possible sous 7 jours après réception, l'article devant être complet et dans son état d'origine. Le remboursement intervient sur le moyen de paiement d'origine.",
  },
  {
    icon: Lock,
    title: "Politique de Confidentialité",
    sub: "Protection des données personnelles · Vos droits",
    bg: "#eafaf0",
    color: "#047857",
    body: "Nous collectons les seules données nécessaires à la commande, à la livraison et à la lutte contre la fraude. Elles ne sont ni vendues ni cédées à des tiers publicitaires. Vous disposez d'un droit d'accès, de rectification, d'export et de suppression de votre compte, exerçable depuis votre espace personnel ou par courriel.",
  },
  {
    icon: Cookie,
    title: "Politique de Cookies",
    sub: "Types de cookies utilisés · Gestion du consentement",
    bg: "#fff9e6",
    color: "#B45309",
    body: "Les cookies strictement nécessaires assurent la session, le panier et la sécurité : ils ne peuvent pas être désactivés. Les cookies de mesure d'audience et de personnalisation ne sont déposés qu'après votre consentement, révocable à tout moment depuis les paramètres de votre compte.",
  },
  {
    icon: Scale,
    title: "Mentions Légales",
    sub: "Éditeur · Hébergeur · Directeur de publication",
    bg: "#eef2f7",
    color: "#334155",
    body: "BelivaY SARL, société de droit camerounais, siège social à Yaoundé, Cameroun. Directeur de la publication : la direction générale de BelivaY. Hébergement des données assuré par un prestataire cloud disposant de centres de données certifiés. Contact : contact@belivay.cm.",
  },
];

/* ──────────────────────────────── Page ──────────────────────────────── */

export default function AboutPage() {
  const [openLegal, setOpenLegal] = useState<string | null>(null);

  return (
    <div className="pf-root" style={{ minHeight: "100vh" }}>
      <PfShellStyles />
      <div className="space-y-5" style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 64px" }}>

        {/* ═══ Hero (glass) ═══ */}
        <section className="pf-ident pf-anim" style={{ flexDirection: "column", justifyContent: "center", textAlign: "center", padding: "34px 24px" }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 62, height: 62, borderRadius: 18, color: "#fff", background: "linear-gradient(135deg,var(--pf-accent2),var(--pf-accent))", boxShadow: "0 8px 22px rgba(244,97,15,.4)", marginBottom: 12 }}>
              <ShoppingBag size={30} strokeWidth={1.8} />
            </div>
            <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", color: "var(--pf-text)" }}>BelivaY</h1>
            <p style={{ marginTop: 6, fontSize: 14.5, fontWeight: 800, color: "var(--pf-accent)" }}>
              La marketplace de confiance de l'Afrique Centrale
            </p>
            <p style={{ margin: "8px auto 0", maxWidth: 520, fontSize: 13, lineHeight: 1.6, color: "var(--pf-text2)" }}>
              Achetez et vendez en toute sécurité avec paiement Mobile Money et protection Escrow BelivaY.
            </p>
            <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <Link to="/catalog" className="pf-btn-accent" style={{ textDecoration: "none" }}>
                <ShoppingCart size={15} /> Commencer à acheter
              </Link>
              <Link to="/become-seller" className="pf-btn-ghost" style={{ textDecoration: "none" }}>
                <Store size={15} /> Devenir vendeur
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════ Chiffres d'ouverture ═══════════════════════ */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STATS.map((item) => (
            <article key={item.label} className="pf-stat pf-anim" style={{ flexDirection: "column", justifyContent: "center", textAlign: "center", gap: 4 }}>
              <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 26, fontWeight: 800, lineHeight: 1, color: item.color }}>
                {item.value}
                {item.star ? <Star size={20} className="text-amber-500" fill="currentColor" /> : null}
              </p>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--pf-text2)" }}>{item.label}</p>
            </article>
          ))}
        </section>

        {/* ═══ Mission + Escrow (2 colonnes) ═══ */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" style={{ alignItems: "start" }}>
          <section className="pf-card pf-anim">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ display: "inline-flex", width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", color: "#fff", background: "linear-gradient(135deg,var(--pf-accent2),var(--pf-accent))", boxShadow: "0 6px 16px rgba(244,97,15,.35)" }}>
                <Target size={20} />
              </span>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--pf-text)" }}>Notre Mission</h2>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--pf-text2)" }}>
              Démocratiser le commerce numérique en Afrique Centrale avec un environnement{" "}
              <strong style={{ color: "var(--pf-text)" }}>sûr, transparent et accessible</strong> à tous. BelivaY connecte vendeurs et acheteurs grâce à un système de confiance basé sur l'<strong style={{ color: "var(--pf-text)" }}>Escrow</strong> — vos fonds sont protégés jusqu'à la confirmation de réception.
            </p>
          </section>

          <section className="pf-card pf-anim">
            <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 17, fontWeight: 800, color: "var(--pf-text)", marginBottom: 14 }}>
              <Lock size={19} style={{ color: "var(--pf-accent)" }} /> L'Escrow BelivaY
            </h2>
            <ol style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
              {ESCROW_STEPS.map((step, index) => (
                <li key={step.title} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ display: "inline-flex", width: 28, height: 28, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: 12, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,var(--pf-accent2),var(--pf-accent))" }}>
                    {index + 1}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: "var(--pf-text)" }}>{step.title}</p>
                    <p style={{ marginTop: 2, fontSize: 12, lineHeight: 1.55, color: "var(--pf-text2)" }}>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* ═══════════════════════════ Valeurs ═══════════════════════════ */}
        <section className="pf-card pf-anim">
          <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 19, fontWeight: 800, color: "var(--pf-text)" }}>
            <Gem size={20} style={{ color: "var(--pf-accent)" }} fill="currentColor" />
            Nos Valeurs
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <article
                  key={value.title}
                  className="rounded-[12px] p-4 transition-transform duration-200 hover:-translate-y-1"
                  style={{ background: "var(--pf-s3)", borderLeft: `4px solid ${value.accent}` }}
                >
                  <Icon size={24} style={{ color: value.color }} />
                  <h3 className="mt-3 text-[14px] font-extrabold text-gray-900">{value.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-600">{value.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ═══════════════════════ Présence CEMAC ═══════════════════════ */}
        <section className="pf-card pf-anim">
          <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 19, fontWeight: 800, color: "var(--pf-text)" }}>
            <Globe size={20} style={{ color: "#2563eb" }} />
            Présence CEMAC
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {COUNTRIES.map((country) => (
              <article
                key={country.code}
                className="rounded-[12px] px-3 py-4 text-center transition-transform duration-200 hover:-translate-y-1"
                style={{ background: "var(--pf-s3)", border: "1px solid var(--pf-border)" }}
              >
                <p className="text-[21px] font-black leading-none" style={{ color: "var(--pf-text)" }}>{country.code}</p>
                <p className="mt-1.5 text-[11.5px] font-semibold text-gray-500">{country.name}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════ Chiffres clés ═══════════════════════════ */}
        <section className="pf-card pf-anim">
          <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 19, fontWeight: 800, color: "var(--pf-text)" }}>
            <BarChart3 size={20} style={{ color: "var(--pf-accent)" }} />
            Chiffres clés
          </h2>

          <p className="mt-3 text-[13.5px] leading-relaxed text-gray-600 dark:text-gray-400">
            BelivaY traite plus de <strong className="text-gray-900 dark:text-white">100M FCFA de GMV mensuel</strong>{" "}
            avec un taux de satisfaction de <strong className="text-gray-900 dark:text-white">98%</strong>. Les
            commissions vendeurs varient de{" "}
            <strong className="text-gray-900 dark:text-white">12% à 23%</strong> selon la catégorie, avec des
            réductions via les plans d'abonnement Premium.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {KEY_FIGURES.map((figure) => {
              const Icon = figure.icon;
              return (
                <article
                  key={figure.label}
                  className="rounded-[12px] p-4 text-center transition-transform duration-200 hover:-translate-y-1"
                  style={{ background: "var(--pf-s3)" }}
                >
                  <Icon size={20} className="mx-auto" style={{ color: figure.color }} />
                  <p className="mt-2 text-[12.5px] font-extrabold" style={{ color: figure.color }}>
                    {figure.label}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ═══════════════════ Mentions légales & Conditions ═══════════════════ */}
        <section className="pf-card pf-anim">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 text-[19px] font-black text-gray-900 dark:text-white">
              <FileText size={20} className="text-gray-400" />
              Mentions légales &amp; Conditions
            </h2>
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-[11.5px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Dernière mise à jour : 17 mai 2026
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {LEGAL.map((item) => {
              const Icon = item.icon;
              const open = openLegal === item.title;
              return (
                <article
                  key={item.title}
                  className="overflow-hidden rounded-[12px] border border-gray-100 dark:border-gray-800"
                >
                  <button
                    type="button"
                    onClick={() => setOpenLegal(open ? null : item.title)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <span
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: item.bg, color: item.color }}
                    >
                      <Icon size={18} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-extrabold text-gray-900 dark:text-white">
                        {item.title}
                      </span>
                      <span className="block text-[12px] text-gray-500 dark:text-gray-400">{item.sub}</span>
                    </span>

                    <ChevronDown
                      size={17}
                      className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    />
                  </button>

                  {open ? (
                    <p className="border-t border-gray-100 px-4 py-4 text-[12.5px] leading-relaxed text-gray-600 dark:border-gray-800 dark:text-gray-400">
                      {item.body}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        {/* ═══════════════════════════ Contact ═══════════════════════════ */}
        <section className="pf-card pf-anim" style={{ textAlign: "center", padding: 28 }}>
          <Phone size={34} style={{ margin: "0 auto", color: "#059669" }} />

          <h2 style={{ marginTop: 12, fontSize: 24, fontWeight: 800, color: "var(--pf-text)" }}>Contactez-nous</h2>
          <p style={{ marginTop: 6, fontSize: 13.5, color: "var(--pf-text2)" }}>
              Une question ? Notre équipe est disponible{" "}
              <span style={{ color: "var(--pf-accent)", fontWeight: 700 }}>7j/7</span>.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("belivay-open-assistant"))}
                className="inline-flex items-center gap-2 rounded-full bg-[#F47920] px-6 py-3 text-[13px] font-black text-white shadow-[0_10px_26px_rgba(244,121,32,.35)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                <MessageCircle size={15} />
                Chat IA
              </button>

              <a
                href="https://wa.me/237689002812"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#22C55E] px-6 py-3 text-[13px] font-black text-white transition-transform duration-200 hover:-translate-y-0.5"
              >
                <MessageCircle size={15} />
                WhatsApp
              </a>

              <a
                href="mailto:contact@belivay.cm"
                className="pf-btn-ghost" style={{ textDecoration: "none" }}
              >
                <Mail size={15} />
                Email
              </a>
            </div>

            <div className="mx-auto mt-8 max-w-[560px] border-t border-[color:var(--pf-border)] pt-5 text-[12.5px] text-[color:var(--pf-text2)]">
              <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={13} />
                  contact@belivay.cm
                </span>
                <span style={{ color: "var(--pf-muted)" }}>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={13} />
                  +237 689 002 812
                </span>
              </p>
              <p className="mt-1.5 inline-flex items-center gap-1.5">
                <MapPin size={13} className="text-[#f4610f]" />
                Yaoundé, Cameroun · CEMAC
              </p>
            </div>
        </section>
      </div>
    </div>
  );
}
