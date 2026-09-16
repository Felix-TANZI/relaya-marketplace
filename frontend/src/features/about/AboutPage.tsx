// frontend/src/features/about/AboutPage.tsx
// Page « À propos » : hero, mission, fonctionnement de l'Escrow, valeurs,
// présence CEMAC, chiffres clés, mentions légales et contact.

import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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

const STATS: { value: string; labelKey: string; bg: string; color: string; star?: boolean }[] = [
  { value: "3 200+", labelKey: "cl5_about.stat_sellers_label", bg: "#fff4ea", color: "#C85E14" },
  { value: "15K+", labelKey: "cl5_about.stat_products_label", bg: "#eafaf0", color: "#047857" },
  { value: "4", labelKey: "cl5_about.stat_countries_label", bg: "#eaf1fe", color: "#1D4ED8" },
  { value: "4.8", labelKey: "cl5_about.stat_satisfaction_label", bg: "#fff9e6", color: "#B45309", star: true },
];

const ESCROW_STEPS: { titleKey: string; textKey: string; bg: string; dot: string }[] = [
  {
    titleKey: "cl5_about.escrow_step1_title",
    textKey: "cl5_about.escrow_step1_text",
    bg: "#eafaf0",
    dot: "#047857",
  },
  {
    titleKey: "cl5_about.escrow_step2_title",
    textKey: "cl5_about.escrow_step2_text",
    bg: "#fff4ea",
    dot: "#EA580C",
  },
  {
    titleKey: "cl5_about.escrow_step3_title",
    textKey: "cl5_about.escrow_step3_text",
    bg: "#fff8ee",
    dot: "#F47920",
  },
  {
    titleKey: "cl5_about.escrow_step4_title",
    textKey: "cl5_about.escrow_step4_text",
    bg: "#fef2f2",
    dot: "#DC2626",
  },
  {
    titleKey: "cl5_about.escrow_step5_title",
    textKey: "cl5_about.escrow_step5_text",
    bg: "#eafaf0",
    dot: "#047857",
  },
];

const VALUES: { icon: LucideIcon; titleKey: string; textKey: string; bg: string; accent: string; color: string }[] = [
  {
    icon: Lock,
    titleKey: "cl5_about.value_trust_title",
    textKey: "cl5_about.value_trust_text",
    bg: "linear-gradient(135deg,#eafaf0,#f4fdf7)",
    accent: "#059669",
    color: "#F47920",
  },
  {
    icon: Globe,
    titleKey: "cl5_about.value_africa_title",
    textKey: "cl5_about.value_africa_text",
    bg: "linear-gradient(135deg,#eaf1fe,#f5f9ff)",
    accent: "#2563EB",
    color: "#2563EB",
  },
  {
    icon: Smartphone,
    titleKey: "cl5_about.value_mobile_title",
    textKey: "cl5_about.value_mobile_text",
    bg: "linear-gradient(135deg,#f1ecfe,#f8f5ff)",
    accent: "#7C3AED",
    color: "#F47920",
  },
  {
    icon: Star,
    titleKey: "cl5_about.value_quality_title",
    textKey: "cl5_about.value_quality_text",
    bg: "linear-gradient(135deg,#fff8e1,#fffdf2)",
    accent: "#F59E0B",
    color: "#F59E0B",
  },
  {
    icon: Rocket,
    titleKey: "cl5_about.value_innovation_title",
    textKey: "cl5_about.value_innovation_text",
    bg: "linear-gradient(135deg,#fff3e8,#fff9f4)",
    accent: "#EA580C",
    color: "#F47920",
  },
  {
    icon: Heart,
    titleKey: "cl5_about.value_social_title",
    textKey: "cl5_about.value_social_text",
    bg: "linear-gradient(135deg,#fdeef5,#fff5fa)",
    accent: "#DB2777",
    color: "#EF4444",
  },
];

const COUNTRIES = [
  { code: "CM", nameKey: "cl5_about.country_cameroon" },
  { code: "GA", nameKey: "cl5_about.country_gabon" },
  { code: "TD", nameKey: "cl5_about.country_chad" },
  { code: "CG", nameKey: "cl5_about.country_congo" },
  { code: "CF", nameKey: "cl5_about.country_car" },
  { code: "GQ", nameKey: "cl5_about.country_eq_guinea" },
];

const KEY_FIGURES: { icon: LucideIcon; labelKey: string; bg: string; color: string }[] = [
  { icon: ShieldCheck, labelKey: "cl5_about.key_figure_fraud", bg: "#eafaf0", color: "#047857" },
  { icon: Zap, labelKey: "cl5_about.key_figure_delivery", bg: "#fff4ea", color: "#C85E14" },
  { icon: Phone, labelKey: "cl5_about.key_figure_support", bg: "#eaf1fe", color: "#047857" },
  { icon: FileText, labelKey: "cl5_about.key_figure_return", bg: "#f1ecfe", color: "#7C3AED" },
];

const LEGAL: { icon: LucideIcon; titleKey: string; subKey: string; bg: string; color: string; bodyKey: string }[] = [
  {
    icon: FileText,
    titleKey: "cl5_about.legal_cgu_title",
    subKey: "cl5_about.legal_cgu_sub",
    bg: "#eaf1fe",
    color: "#2563EB",
    bodyKey: "cl5_about.legal_cgu_body",
  },
  {
    icon: ShoppingCart,
    titleKey: "cl5_about.legal_cgv_title",
    subKey: "cl5_about.legal_cgv_sub",
    bg: "#fff4ea",
    color: "#C85E14",
    bodyKey: "cl5_about.legal_cgv_body",
  },
  {
    icon: Lock,
    titleKey: "cl5_about.legal_privacy_title",
    subKey: "cl5_about.legal_privacy_sub",
    bg: "#eafaf0",
    color: "#047857",
    bodyKey: "cl5_about.legal_privacy_body",
  },
  {
    icon: Cookie,
    titleKey: "cl5_about.legal_cookies_title",
    subKey: "cl5_about.legal_cookies_sub",
    bg: "#fff9e6",
    color: "#B45309",
    bodyKey: "cl5_about.legal_cookies_body",
  },
  {
    icon: Scale,
    titleKey: "cl5_about.legal_notice_title",
    subKey: "cl5_about.legal_notice_sub",
    bg: "#eef2f7",
    color: "#334155",
    bodyKey: "cl5_about.legal_notice_body",
  },
];

/* ──────────────────────────────── Page ──────────────────────────────── */

export default function AboutPage() {
  const { t } = useTranslation();
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
              {t("cl5_about.hero_tagline")}
            </p>
            <p style={{ margin: "8px auto 0", maxWidth: 520, fontSize: 13, lineHeight: 1.6, color: "var(--pf-text2)" }}>
              {t("cl5_about.hero_subtitle")}
            </p>
            <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <Link to="/catalog" className="pf-btn-accent" style={{ textDecoration: "none" }}>
                <ShoppingCart size={15} /> {t("cl5_about.cta_buy")}
              </Link>
              <Link to="/become-seller" className="pf-btn-ghost" style={{ textDecoration: "none" }}>
                <Store size={15} /> {t("cl5_about.cta_sell")}
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════ Chiffres d'ouverture ═══════════════════════ */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STATS.map((item) => (
            <article key={item.labelKey} className="pf-stat pf-anim" style={{ flexDirection: "column", justifyContent: "center", textAlign: "center", gap: 4 }}>
              <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 26, fontWeight: 800, lineHeight: 1, color: item.color }}>
                {item.value}
                {item.star ? <Star size={20} className="text-amber-500" fill="currentColor" /> : null}
              </p>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--pf-text2)" }}>{t(item.labelKey)}</p>
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
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--pf-text)" }}>{t("cl5_about.mission_heading")}</h2>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--pf-text2)" }}>
              {t("cl5_about.mission_text_p1")}{" "}
              <strong style={{ color: "var(--pf-text)" }}>{t("cl5_about.mission_text_strong")}</strong> {t("cl5_about.mission_text_p2")}<strong style={{ color: "var(--pf-text)" }}>{t("cl5_about.mission_text_strong2")}</strong> {t("cl5_about.mission_text_p3")}
            </p>
          </section>

          <section className="pf-card pf-anim">
            <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 17, fontWeight: 800, color: "var(--pf-text)", marginBottom: 14 }}>
              <Lock size={19} style={{ color: "var(--pf-accent)" }} /> {t("cl5_about.escrow_heading")}
            </h2>
            <ol style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
              {ESCROW_STEPS.map((step, index) => (
                <li key={step.titleKey} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ display: "inline-flex", width: 28, height: 28, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: 12, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,var(--pf-accent2),var(--pf-accent))" }}>
                    {index + 1}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: "var(--pf-text)" }}>{t(step.titleKey)}</p>
                    <p style={{ marginTop: 2, fontSize: 12, lineHeight: 1.55, color: "var(--pf-text2)" }}>{t(step.textKey)}</p>
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
            {t("cl5_about.values_heading")}
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <article
                  key={value.titleKey}
                  className="rounded-[12px] p-4 transition-transform duration-200 hover:-translate-y-1"
                  style={{ background: "var(--pf-s3)", borderLeft: `4px solid ${value.accent}` }}
                >
                  <Icon size={24} style={{ color: value.color }} />
                  <h3 className="mt-3 text-[14px] font-extrabold" style={{ color: "var(--pf-text)" }}>{t(value.titleKey)}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: "var(--pf-text2)" }}>{t(value.textKey)}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ═══════════════════════ Présence CEMAC ═══════════════════════ */}
        <section className="pf-card pf-anim">
          <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 19, fontWeight: 800, color: "var(--pf-text)" }}>
            <Globe size={20} style={{ color: "#2563eb" }} />
            {t("cl5_about.presence_heading")}
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {COUNTRIES.map((country) => (
              <article
                key={country.code}
                className="rounded-[12px] px-3 py-4 text-center transition-transform duration-200 hover:-translate-y-1"
                style={{ background: "var(--pf-s3)", border: "1px solid var(--pf-border)" }}
              >
                <p className="text-[21px] font-black leading-none" style={{ color: "var(--pf-text)" }}>{country.code}</p>
                <p className="mt-1.5 text-[11.5px] font-semibold" style={{ color: "var(--pf-text2)" }}>{t(country.nameKey)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════ Chiffres clés ═══════════════════════════ */}
        <section className="pf-card pf-anim">
          <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 19, fontWeight: 800, color: "var(--pf-text)" }}>
            <BarChart3 size={20} style={{ color: "var(--pf-accent)" }} />
            {t("cl5_about.key_figures_heading")}
          </h2>

          <p className="mt-3 text-[13.5px] leading-relaxed" style={{ color: "var(--pf-text2)" }}>
            {t("cl5_about.key_figures_text_p1")} <strong style={{ color: "var(--pf-text)" }}>{t("cl5_about.key_figures_text_strong1")}</strong>{" "}
            {t("cl5_about.key_figures_text_p2")} <strong style={{ color: "var(--pf-text)" }}>{t("cl5_about.key_figures_text_strong2")}</strong>{t("cl5_about.key_figures_text_p3")}{" "}
            <strong style={{ color: "var(--pf-text)" }}>{t("cl5_about.key_figures_text_strong3")}</strong> {t("cl5_about.key_figures_text_p4")}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {KEY_FIGURES.map((figure) => {
              const Icon = figure.icon;
              return (
                <article
                  key={figure.labelKey}
                  className="rounded-[12px] p-4 text-center transition-transform duration-200 hover:-translate-y-1"
                  style={{ background: "var(--pf-s3)" }}
                >
                  <Icon size={20} className="mx-auto" style={{ color: figure.color }} />
                  <p className="mt-2 text-[12.5px] font-extrabold" style={{ color: "var(--pf-text)" }}>
                    {t(figure.labelKey)}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ═══════════════════ Mentions légales & Conditions ═══════════════════ */}
        <section className="pf-card pf-anim">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 text-[19px] font-black" style={{ color: "var(--pf-text)" }}>
              <FileText size={20} style={{ color: "var(--pf-accent)" }} />
              {t("cl5_about.legal_heading")}
            </h2>
            <span className="rounded-full px-3 py-1.5 text-[11.5px] font-semibold" style={{ background: "var(--pf-s3)", color: "var(--pf-text2)" }}>
              {t("cl5_about.legal_last_update")}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {LEGAL.map((item) => {
              const Icon = item.icon;
              const open = openLegal === item.titleKey;
              return (
                <article
                  key={item.titleKey}
                  className="overflow-hidden rounded-[12px]" style={{ border: "1px solid var(--pf-border)" }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenLegal(open ? null : item.titleKey)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors duration-200"
                  >
                    <span
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: item.bg, color: item.color }}
                    >
                      <Icon size={18} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-extrabold" style={{ color: "var(--pf-text)" }}>
                        {t(item.titleKey)}
                      </span>
                      <span className="block text-[12px]" style={{ color: "var(--pf-text2)" }}>{t(item.subKey)}</span>
                    </span>

                    <ChevronDown
                      size={17}
                      className={`flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                      style={{ color: "var(--pf-muted)" }}
                    />
                  </button>

                  {open ? (
                    <p className="px-4 py-4 text-[12.5px] leading-relaxed" style={{ borderTop: "1px solid var(--pf-border)", color: "var(--pf-text2)" }}>
                      {t(item.bodyKey)}
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

          <h2 style={{ marginTop: 12, fontSize: 24, fontWeight: 800, color: "var(--pf-text)" }}>{t("cl5_about.contact_heading")}</h2>
          <p style={{ marginTop: 6, fontSize: 13.5, color: "var(--pf-text2)" }}>
              {t("cl5_about.contact_text_p1")}{" "}
              <span style={{ color: "var(--pf-accent)", fontWeight: 700 }}>{t("cl5_about.contact_text_strong")}</span>.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("belivay-open-assistant"))}
                className="inline-flex items-center gap-2 rounded-full bg-[#F47920] px-6 py-3 text-[13px] font-black text-white shadow-[0_10px_26px_rgba(244,121,32,.35)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                <MessageCircle size={15} />
                {t("cl5_about.contact_chat_ai")}
              </button>

              <a
                href="https://wa.me/237689002812"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#22C55E] px-6 py-3 text-[13px] font-black text-white transition-transform duration-200 hover:-translate-y-0.5"
              >
                <MessageCircle size={15} />
                {t("cl5_about.contact_whatsapp")}
              </a>

              <a
                href="mailto:contact@belivay.cm"
                className="pf-btn-ghost" style={{ textDecoration: "none" }}
              >
                <Mail size={15} />
                {t("cl5_about.contact_email")}
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
                {t("cl5_about.contact_address")}
              </p>
            </div>
        </section>
      </div>
    </div>
  );
}
