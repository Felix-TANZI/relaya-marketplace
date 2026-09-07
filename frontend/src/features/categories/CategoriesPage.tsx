import { useMemo, useState, useEffect, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, ArrowRight, PackageSearch } from "lucide-react";
import { categoryIcon } from "@/components/home/CategorySidebar";
import { categoriesApi, type CategoryTreeNode } from "@/services/api/categories";
import { PfShellStyles } from "@/styles/pfShell";

const TILE_GRADIENTS = [
  "linear-gradient(135deg,#5bb8ff,#2563eb)",
  "linear-gradient(135deg,#ff86bb,#e11d74)",
  "linear-gradient(135deg,#ffa04d,#f4610f)",
  "linear-gradient(135deg,#34d399,#059669)",
  "linear-gradient(135deg,#ffd45c,#f59e0b)",
  "linear-gradient(135deg,#a78bfa,#7c3aed)",
];

const glass: CSSProperties = {
  background: "var(--pf-glass)",
  backdropFilter: "blur(20px) saturate(1.6)",
  WebkitBackdropFilter: "blur(20px) saturate(1.6)",
  border: "1px solid var(--pf-glass-border)",
  boxShadow: "var(--pf-shadow)",
};

export default function CategoriesPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategories(await categoriesApi.tree());
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const groupedCategories = useMemo(
    () => [...categories].sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name, "fr")),
    [categories],
  );

  const selected = groupedCategories.find((c) => c.id === selectedId) ?? groupedCategories[0] ?? null;
  const selectedIndex = selected ? groupedCategories.findIndex((c) => c.id === selected.id) : 0;
  const SelectedIcon = selected
    ? categoryIcon({ slug: selected.slug, name: selected.name, iconName: selected.icon_name })
    : null;

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
              {groupedCategories.map((category, index) => {
                const Icon = categoryIcon({ slug: category.slug, name: category.name, iconName: category.icon_name });
                const active = category.id === selected.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedId(category.id)}
                    className="flex flex-shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors lg:w-full"
                    style={{
                      minWidth: 172,
                      background: active ? "linear-gradient(135deg,rgba(255,138,61,.16),rgba(244,97,15,.10))" : "transparent",
                      border: `1px solid ${active ? "var(--pf-aring)" : "transparent"}`,
                    }}
                  >
                    <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", background: TILE_GRADIENTS[index % TILE_GRADIENTS.length] }}>
                      <Icon size={18} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: active ? 800 : 700, color: "var(--pf-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {category.name}
                      </span>
                      <span style={{ display: "block", fontSize: 10.5, color: "var(--pf-muted)" }}>
                        {category.children.length > 0
                          ? t("categories.subcategory_count_plural", { count: category.children.length })
                          : t("categories.main_category")}
                      </span>
                    </span>
                    <ChevronRight size={15} className="hidden lg:block" style={{ color: active ? "var(--pf-accent)" : "#c2b6bf", flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>

            {/* ── Panneau : détail du sélectionné ── */}
            <div className="pf-card">
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <span style={{ width: 50, height: 50, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", background: TILE_GRADIENTS[selectedIndex % TILE_GRADIENTS.length], boxShadow: "0 6px 16px rgba(0,0,0,.12)" }}>
                    {SelectedIcon ? <SelectedIcon size={24} /> : null}
                  </span>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: "var(--pf-text)" }}>{selected.name}</div>
                    <div style={{ fontSize: 12, color: "var(--pf-muted)" }}>
                      {selected.children.length > 0
                        ? t("categories.subcategory_count_plural", { count: selected.children.length })
                        : t("categories.main_category")}
                    </div>
                  </div>
                </div>
                <Link to={`/catalog?category=${selected.id}`} className="pf-btn-accent" style={{ textDecoration: "none" }}>
                  Voir tous les produits <ArrowRight size={15} />
                </Link>
              </div>

              {selected.children.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {selected.children.map((child) => {
                    const ChildIcon = categoryIcon({ slug: child.slug, name: child.name, iconName: child.icon_name });
                    return (
                      <Link
                        key={child.id}
                        to={`/catalog?category=${child.id}`}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all hover:-translate-y-0.5"
                        style={{ background: "var(--pf-s3)", border: "1px solid var(--pf-border)" }}
                      >
                        <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--pf-asoft)", color: "var(--pf-accent)" }}>
                          <ChildIcon size={16} />
                        </span>
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
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "36px 0", textAlign: "center" }}>
                  <PackageSearch size={30} style={{ color: "var(--pf-muted)" }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--pf-text)" }}>{t("categories.main_category")}</p>
                  <p style={{ fontSize: 12, color: "var(--pf-muted)", maxWidth: 360 }}>
                    Cet univers n'a pas de sous-catégories — explorez directement tous ses produits.
                  </p>
                  <Link to={`/catalog?category=${selected.id}`} className="pf-btn-accent" style={{ textDecoration: "none", marginTop: 6 }}>
                    {t("categories.explore")} <ArrowRight size={15} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
