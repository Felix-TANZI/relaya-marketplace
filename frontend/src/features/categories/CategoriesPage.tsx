import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, ArrowRight, PackageSearch } from "lucide-react";
import { categoryIcon } from "@/data/categoryIcon";
import useStorefrontCategories from "@/hooks/useStorefrontCategories";
import { PfShellStyles } from "@/styles/pfShell";

const glass: CSSProperties = {
  background: "var(--pf-glass)",
  backdropFilter: "blur(20px) saturate(1.6)",
  WebkitBackdropFilter: "blur(20px) saturate(1.6)",
  border: "1px solid var(--pf-glass-border)",
  boxShadow: "var(--pf-shadow)",
};

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { categories, loading } = useStorefrontCategories();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Univers = catégories racines créées par l'admin (« Tout voir » n'en est pas un).
  const universes = categories.filter((category) => category.node);
  const selected = universes.find((c) => c.slug === selectedSlug) ?? universes[0] ?? null;
  const children = selected?.node?.children ?? [];

  return (
    <div className="pf-root" style={{ minHeight: "100vh" }}>
      <PfShellStyles />
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px 64px" }}>

        {/* En-tête */}
        <header style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--pf-accent)" }}>
            {t("categories.breadcrumb")}
          </p>
          <h1 style={{ marginTop: 6, fontSize: 27, fontWeight: 800, letterSpacing: "-.02em", color: "var(--pf-text)" }}>
            {t("categories.title")}
          </h1>
          <p style={{ marginTop: 3, fontSize: 13, color: "var(--pf-text2)" }}>
            {t("categories.subtitle")}
          </p>
        </header>

        {loading ? (
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[270px_1fr]">
            <div className="skeleton h-[420px] rounded-[18px]" />
            <div className="skeleton h-[420px] rounded-[18px]" />
          </div>
        ) : !selected ? (
          <div className="pf-card" style={{ textAlign: "center", padding: 40, color: "var(--pf-muted)" }}>
            Aucune catégorie disponible pour le moment.
          </div>
        ) : (
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[270px_1fr] lg:items-start">

            {/* ── Rail : univers (vertical sur PC, chips horizontales en mobile) ── */}
            <div
              className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0"
              style={{ ...glass, borderRadius: 18, padding: 8 }}
            >
              {universes.map((category) => {
                const Icon = category.icon;
                const active = category.slug === selected.slug;
                return (
                  <button
                    key={category.slug}
                    type="button"
                    onClick={() => setSelectedSlug(category.slug)}
                    className="flex flex-shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors lg:w-full"
                    style={{
                      minWidth: 172,
                      background: active ? "linear-gradient(135deg,rgba(255,138,61,.16),rgba(244,97,15,.10))" : "transparent",
                      border: `1px solid ${active ? "var(--pf-aring)" : "transparent"}`,
                    }}
                  >
                    {category.thumb ? (
                      <img
                        src={category.thumb}
                        alt=""
                        loading="lazy"
                        style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", background: category.accent }}>
                        <Icon size={18} />
                      </span>
                    )}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: active ? 800 : 700, color: "var(--pf-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {category.name}
                      </span>
                      <span style={{ display: "block", fontSize: 10.5, color: "var(--pf-muted)" }}>
                        {(category.node?.children.length ?? 0) > 0
                          ? t("categories.subcategory_count_plural", { count: category.node?.children.length })
                          : t("categories.main_category")}
                      </span>
                    </span>
                    <ChevronRight size={15} className="hidden lg:block" style={{ color: active ? "var(--pf-accent)" : "#c2b6bf", flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>

            {/* ── Panneau : bannière de l'univers puis ses sous-catégories ── */}
            <div className="pf-card" style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  position: "relative", minHeight: 150, display: "flex", alignItems: "flex-end",
                  background: selected.image
                    ? `url(${selected.image}) center/cover`
                    : `linear-gradient(135deg, ${selected.accent}, ${selected.accent}bb)`,
                }}
              >
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.62), rgba(0,0,0,.08))" }} />
                <div style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12, width: "100%", padding: "18px 18px 16px", color: "#fff" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.01em" }}>{selected.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>{selected.subtitle}</div>
                    {selected.description ? (
                      <p style={{ marginTop: 6, maxWidth: 560, fontSize: 12.5, lineHeight: 1.5, opacity: 0.85 }}>
                        {selected.description}
                      </p>
                    ) : null}
                  </div>
                  <Link to={`/categorie/${selected.slug}`} className="pf-btn-accent" style={{ textDecoration: "none" }}>
                    Voir tous les produits <ArrowRight size={15} />
                  </Link>
                </div>
              </div>

              <div style={{ padding: 16 }}>
                {children.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {children.map((child) => {
                      const ChildIcon = categoryIcon({ slug: child.slug, name: child.name, iconName: child.icon_name });
                      return (
                        <Link
                          key={child.id}
                          to={`/categorie/${child.slug}`}
                          className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all hover:-translate-y-0.5"
                          style={{ background: "var(--pf-s3)", border: "1px solid var(--pf-border)" }}
                        >
                          {child.image_url ? (
                            <img
                              src={child.image_url}
                              alt=""
                              loading="lazy"
                              style={{ width: 42, height: 42, flexShrink: 0, borderRadius: "50%", objectFit: "cover", boxShadow: "0 0 0 2px #fff, 0 2px 8px rgba(0,0,0,.12)" }}
                            />
                          ) : (
                            <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--pf-asoft)", color: "var(--pf-accent)" }}>
                              <ChildIcon size={18} />
                            </span>
                          )}
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--pf-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {child.name}
                            </span>
                            {child.children.length > 0 ? (
                              <span style={{ display: "block", fontSize: 10.5, color: "var(--pf-muted)" }}>
                                {t("categories.subcategory_count_plural", { count: child.children.length })}
                              </span>
                            ) : null}
                          </span>
                          <ChevronRight size={15} style={{ color: "#c2b6bf", flexShrink: 0 }} />
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "28px 0", textAlign: "center" }}>
                    <PackageSearch size={30} style={{ color: "var(--pf-muted)" }} />
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--pf-text)" }}>{t("categories.main_category")}</p>
                    <p style={{ fontSize: 12, color: "var(--pf-muted)", maxWidth: 360 }}>
                      Cet univers n'a pas de sous-catégories — explorez directement tous ses produits.
                    </p>
                    <Link to={`/categorie/${selected.slug}`} className="pf-btn-accent" style={{ textDecoration: "none", marginTop: 6 }}>
                      {t("categories.explore")} <ArrowRight size={15} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
