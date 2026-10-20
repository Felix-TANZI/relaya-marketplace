// frontend/src/features/legal/PrivacyPage.tsx
// Politique de confidentialité — page publique dédiée (Apple App Store
// Review Guideline 5.1.1 : URL de politique de confidentialité qui
// fonctionne ET accessible depuis l'app). Volontairement hors de
// ProtectedRoute : un visiteur non connecté (ou le robot de revue
// d'Apple) doit pouvoir la charger sans compte.

import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { PfShellStyles } from "@/styles/pfShell";

const SECTION_KEYS = Array.from({ length: 11 }, (_, i) => i + 1);

export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <div className="pf-root" style={{ minHeight: "100vh" }}>
      <PfShellStyles />
      <div className="pf-shell" style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px 60px" }}>
        {/* En-tête en styles directs plutôt que .pf-ident : cette classe est
            pensée pour la barre d'identité d'un shell desktop et se masque
            sous 1024px (voir pfShell.tsx) — elle rendrait le titre invisible
            sur mobile, la cible principale d'une revue App Store. */}
        <section
          className="pf-anim"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "30px 24px",
            borderRadius: 22,
            background: "var(--pf-glass)",
            border: "1px solid var(--pf-glass-border)",
            boxShadow: "var(--pf-shadow)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 58,
              height: 58,
              borderRadius: 16,
              color: "#fff",
              background: "linear-gradient(135deg,var(--pf-accent2),var(--pf-accent))",
              boxShadow: "0 8px 22px rgba(244,97,15,.4)",
              marginBottom: 12,
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--pf-text)", margin: 0 }}>
            {t("cl8_privacy.page_title")}
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--pf-text2)", marginTop: 6 }}>{t("cl8_privacy.last_update")}</p>
          <p style={{ fontSize: 13.5, color: "var(--pf-text2)", lineHeight: 1.6, marginTop: 14, maxWidth: 560 }}>
            {t("cl8_privacy.intro")}
          </p>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          {SECTION_KEYS.map((n) => (
            <section key={n} className="pf-card pf-anim">
              <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--pf-text)", margin: "0 0 8px" }}>
                {t(`cl8_privacy.s${n}_title`)}
              </h2>
              <p style={{ fontSize: 13.5, color: "var(--pf-text2)", lineHeight: 1.65, margin: 0 }}>
                {t(`cl8_privacy.s${n}_body`)}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
