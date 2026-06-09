// frontend/src/features/admin/operations/CataloguePage.tsx
// Gestion du catalogue produits — admin BelivaY
// KPIs · Filtres actif/inactif/vendeur · Tableau/Cards · Actions toggle+delete

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Package,
  Search,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Filter,
  ChevronDown,
  X,
  Eye,
  Image as ImageIcon,
} from "lucide-react";
import {
  adminApi,
  type AdminProduct,
  type AdminProductDetail,
} from "@/services/api/admin";
import { productsApi, type Category } from "@/services/api/products";
import { useAdminTheme } from "@/hooks/useAdminTheme";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtXaf = (n: number) =>
  `${new Intl.NumberFormat("fr-FR").format(n)} FCFA`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type SortKey = "title" | "created_at" | "price_xaf" | "stock_quantity";
type SortDir = "asc" | "desc";
type StatusTab = "all" | "active" | "inactive" | "pending";
type DateFilter = "all" | "today" | "week" | "month";

const PAGE_SIZES = [10, 20, 50] as const;

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonRow({ T }: { T: ReturnType<typeof useAdminTheme> }) {
  return (
    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
      {[52, 120, 80, 60, 50, 50, 50, 40].map((w, i) => (
        <td key={i} style={{ padding: "14px 12px" }}>
          <div
            style={{
              height: 11,
              width: `${w}px`,
              borderRadius: 5,
              background: T.border,
              animation: "shimmer 1.4s ease-in-out infinite",
              backgroundImage: `linear-gradient(90deg,${T.border} 25%,${T.cardAlt} 50%,${T.border} 75%)`,
              backgroundSize: "200% 100%",
            }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CataloguePage() {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  const navigate = useNavigate();

  const [rejectTarget, setRejectTarget] = useState<AdminProduct | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detailItem, setDetailItem] = useState<AdminProduct | null>(null);
  const [detailData, setDetailData] = useState<AdminProductDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [dateF, setDateF] = useState<DateFilter>("all");
  const [search, setSearch] = useState("");
  const [categoryF, setCategoryF] = useState<number | "all">("all");
  const [subcategoryF, setSubcategoryF] = useState<number | "all">("all");
  const [sort, setSort] = useState<SortKey>("created_at");
  const [dir, setDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(20);
  const [openDrop, setOpenDrop] = useState<"date" | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Chargement ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: {
        is_active?: boolean;
        search?: string;
        vendor?: number;
        moderation_status?: string;
      } = {};
      if (statusTab === "active") filters.is_active = true;
      if (statusTab === "inactive") filters.is_active = false;
      if (statusTab === "pending") filters.moderation_status = "PENDING";
      const vendorId = searchParams.get("vendor");
      if (vendorId) filters.vendor = Number(vendorId);
      const data = await adminApi.listProducts(filters);
      setProducts(data);
    } catch {
      showToast("Erreur chargement du catalogue", "error");
    } finally {
      setLoading(false);
    }
  }, [statusTab, searchParams, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    productsApi
      .listCategories({ page_size: 100, is_active: true })
      .then((res) => setCategories(res.results ?? []))
      .catch(() => setCategories([]));
  }, []);

  // ── Filtrage local ────────────────────────────────────────────────────────
  const now = Date.now();
  const rootCategories = categories.filter((cat) => !cat.parent);
  const selectedRootCategory =
    categoryF === "all"
      ? null
      : (categories.find((cat) => cat.id === categoryF) ?? null);
  const subcategories = selectedRootCategory
    ? categories.filter((cat) => cat.parent === selectedRootCategory.id)
    : [];
  const categoryIdsForFilter = (() => {
    if (subcategoryF !== "all") return new Set([subcategoryF]);
    if (categoryF === "all") return null;
    return new Set([
      categoryF,
      ...categories
        .filter((cat) => cat.parent === categoryF)
        .map((cat) => cat.id),
    ]);
  })();
  const filtered = products.filter((p) => {
    const created = new Date(p.created_at).getTime();
    if (dateF === "today" && now - created > 86400_000) return false;
    if (dateF === "week" && now - created > 7 * 86400_000) return false;
    if (dateF === "month" && now - created > 30 * 86400_000) return false;
    if (categoryIdsForFilter && !categoryIdsForFilter.has(p.category))
      return false;
    if (search) {
      const q = search.toLowerCase();
      return [p.title, p.vendor_name, p.vendor_business, p.category_name].some(
        (v) => v?.toLowerCase().includes(q),
      );
    }
    return true;
  });

  // ── Tri ───────────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    const va =
      sort === "title"
        ? a.title
        : sort === "created_at"
          ? a.created_at
          : sort === "price_xaf"
            ? a.price_xaf
            : a.stock_quantity;
    const vb =
      sort === "title"
        ? b.title
        : sort === "created_at"
          ? b.created_at
          : sort === "price_xaf"
            ? b.price_xaf
            : b.stock_quantity;
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(k);
      setDir("desc");
    }
    setPage(1);
  };

  const handleSearch = (v: string) => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setSearch(v);
      setPage(1);
    }, 220);
  };

  const activeFilters = [
    dateF !== "all",
    categoryF !== "all",
    subcategoryF !== "all",
  ].filter(Boolean).length;

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = {
    total: products.length,
    active: products.filter((p) => p.is_active).length,
    inactive: products.filter((p) => !p.is_active).length,
    lowStock: products.filter((p) => p.stock_quantity <= 3 && p.is_active)
      .length,
    pending: products.filter((p) => p.moderation_status === "PENDING").length,
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleToggle = async (p: AdminProduct) => {
    const action = p.is_active ? "désactiver" : "activer";
    const ok = await confirm({
      title: `${p.is_active ? "Désactiver" : "Activer"} ce produit ?`,
      message: `"${p.title}" sera ${p.is_active ? "masqué du catalogue" : "visible sur le catalogue"}.`,
      type: p.is_active ? "warning" : "warning",
      confirmText: p.is_active ? "Désactiver" : "Activer",
      cancelText: "Annuler",
    });
    if (!ok) return;
    setActing(p.id);
    try {
      await adminApi.toggleProductStatus(p.id);
      showToast(
        `Produit ${action === "désactiver" ? "désactivé" : "activé"}`,
        "success",
      );
      await load();
    } catch {
      showToast("Erreur", "error");
    } finally {
      setActing(null);
    }
  };

  const handleApprove = async (p: AdminProduct) => {
    const ok = await confirm({
      title: "Approuver ce produit ?",
      message: `Rendre "${p.title}" visible côté acheteur ?`,
      type: "info",
    });
    if (!ok) return;
    try {
      setActing(p.id);
      await adminApi.approveProduct(p.id);
      showToast("Produit approuvé", "success");
      load();
    } catch {
      showToast("Erreur lors de l'approbation", "error");
    } finally {
      setActing(null);
    }
  };

  const handleReject = (p: AdminProduct) => {
    setRejectReason("");
    setRejectTarget(p);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    try {
      setActing(rejectTarget.id);
      await adminApi.rejectProduct(
        rejectTarget.id,
        rejectReason.trim() || undefined,
      );
      showToast("Produit rejeté — vendeur notifié", "success");
      setRejectTarget(null);
      load();
    } catch {
      showToast("Erreur lors du rejet", "error");
    } finally {
      setActing(null);
    }
  };

  const openDetail = async (p: AdminProduct) => {
    setDetailItem(p);
    setDetailData(null);
    setDetailLoading(true);
    try {
      setDetailData(await adminApi.getProductDetail(p.id));
    } catch {
      /* on garde au moins les infos de la ligne */
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (p: AdminProduct) => {
    const ok = await confirm({
      title: `Supprimer "${p.title}" ?`,
      message:
        "Cette action est irréversible. Le produit sera définitivement supprimé.",
      type: "danger",
      confirmText: "Supprimer",
      cancelText: "Annuler",
    });
    if (!ok) return;
    setActing(p.id);
    try {
      await adminApi.deleteProduct(p.id);
      showToast("Produit supprimé", "success");
      await load();
    } catch {
      showToast("Erreur lors de la suppression", "error");
    } finally {
      setActing(null);
    }
  };

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers =
      "ID;Titre;Vendeur;Boutique;Catégorie;Prix;Stock;Actif;Ajouté le";
    const rows = sorted.map((p) =>
      [
        p.id,
        p.title,
        p.vendor_name,
        p.vendor_business,
        p.category_name,
        p.price_xaf,
        p.stock_quantity,
        p.is_active ? "Oui" : "Non",
        fmtDate(p.created_at),
      ].join(";"),
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `belivay_catalogue_${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort !== k ? (
      <ArrowUpDown size={11} style={{ color: T.muted, opacity: 0.4 }} />
    ) : dir === "asc" ? (
      <ArrowUp size={11} style={{ color: T.red }} />
    ) : (
      <ArrowDown size={11} style={{ color: T.red }} />
    );

  const DropMenu = ({
    children,
    show,
  }: {
    children: React.ReactNode;
    show: boolean;
  }) =>
    show ? (
      <div
        className="absolute top-full left-0 mt-1 z-20 rounded-xl py-1 min-w-[160px]"
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
        }}
      >
        {children}
      </div>
    ) : null;

  const DropItem = ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={() => {
        onClick();
        setOpenDrop(null);
      }}
      className="w-full flex items-center gap-2 px-4 py-2 text-left text-[12px]"
      style={{
        color: active ? T.red : T.text,
        background: active ? T.red + "10" : "transparent",
        fontWeight: active ? 700 : 400,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: active ? T.red : "transparent",
          flexShrink: 0,
        }}
      />
      {label}
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5" onClick={() => setOpenDrop(null)}>
      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            style={{
              fontFamily: "'Syne',sans-serif",
              fontSize: 22,
              fontWeight: 800,
              color: T.text,
              marginBottom: 4,
            }}
          >
            Catalogue Produits
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {kpis.lowStock > 0 && (
              <span
                style={{ color: "#F59E0B", fontWeight: 700, marginRight: 6 }}
              >
                {kpis.lowStock} stock faible ·
              </span>
            )}
            {products.length.toLocaleString("fr-FR")} produits au total
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
            style={{
              background: T.cardAlt,
              color: T.muted,
              border: `1px solid ${T.border}`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = T.text)}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}
          >
            <Download size={13} />{" "}
            <span className="hidden sm:inline">Exporter CSV</span>
          </button>
          <button
            onClick={() => load()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
            style={{
              background: "rgba(220,38,38,0.1)",
              color: T.red,
              border: "1px solid rgba(220,38,38,0.25)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(220,38,38,0.18)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(220,38,38,0.1)")
            }
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>

        {/* MODAL REJET */}
      {rejectTarget && (
        <div onClick={() => setRejectTarget(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60,
                   display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, width: '100%', maxWidth: 460, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 6 }}>Rejeter le produit</h3>
            <p style={{ fontSize: 13, color: T.muted, marginBottom: 14 }}>
              « {rejectTarget.title} » — le vendeur sera notifié. Le motif est optionnel.
            </p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4}
              placeholder="Motif du rejet (optionnel) — ex : photos floues, prix incohérent…"
              style={{ width: '100%', background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10,
                       padding: '10px 12px', fontSize: 13, color: T.text, outline: 'none', resize: 'vertical' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setRejectTarget(null)}
                style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: T.cardAlt, color: T.text, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={confirmReject} disabled={acting === rejectTarget.id}
                style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER DÉTAIL */}
      {detailItem && (() => {
        const d = detailItem;
        return (
          <div onClick={() => setDetailItem(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: T.card, width: '100%', maxWidth: 440, height: '100%', overflowY: 'auto', borderLeft: `1px solid ${T.border}`, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Détail produit</h3>
                <button onClick={() => setDetailItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted }}><X size={18} /></button>
              </div>

              {detailData?.images?.[0]?.image && (
                <img src={detailData.images[0].image} alt={d.title}
                  style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12, marginBottom: 14 }} />
              )}

              <p style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{d.title}</p>
              <p style={{ fontSize: 13, color: T.muted, marginBottom: 12 }}>{fmtXaf(d.price_xaf)}</p>

              {([
                ['Statut',    d.moderation_status],
                ['Fiche',     d.master_title || '—'],
                ['Catégorie', d.category_name],
                ['Stock',     String(d.stock_quantity)],
                ['Actif',     d.is_active ? 'Oui' : 'Non'],
                ['Ajouté',    fmtDate(d.created_at)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 12.5, color: T.muted }}>{k}</span>
                  <span style={{ fontSize: 12.5, color: T.text, fontWeight: 600 }}>{v}</span>
                </div>
              ))}

              <div style={{ padding: '10px 0' }}>
                <span style={{ fontSize: 12.5, color: T.muted }}>Vendeur : </span>
                <button onClick={() => navigate(`/admin/customers/${d.vendor}`)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.red, fontWeight: 600, fontSize: 12.5, padding: 0 }}>
                  {d.vendor_name}
                </button>
                {d.vendor_profile_id && (
                  <button onClick={() => navigate(`/admin/vendors/${d.vendor_profile_id}`)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 12, marginLeft: 8, padding: 0 }}>
                    (boutique)
                  </button>
                )}
              </div>

              {d.moderation_status === 'REJECTED' && d.moderation_reason && (
                <div style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: 10, padding: 10, fontSize: 12.5, marginTop: 8 }}>
                  Motif du rejet : {d.moderation_reason}
                </div>
              )}

              {detailLoading && <p style={{ fontSize: 12, color: T.muted, marginTop: 10 }}>Chargement des détails…</p>}
              {detailData?.description && (
                <p style={{ fontSize: 12.5, color: T.text, marginTop: 12, whiteSpace: 'pre-wrap' }}>{detailData.description}</p>
              )}
            </div>
          </div>
        );
      })()}
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total",
            value: kpis.total,
            accent: T.text,
            onClick: () => setStatusTab("all"),
          },
          {
            label: "Actifs",
            value: kpis.active,
            accent: "#10B981",
            onClick: () => setStatusTab("active"),
          },
          {
            label: "Inactifs",
            value: kpis.inactive,
            accent: "#9CA3AF",
            onClick: () => setStatusTab("inactive"),
          },
          {
            label: "Stock ≤ 3",
            value: kpis.lowStock,
            accent: "#F59E0B",
            onClick: () => setStatusTab("active"),
          },
        ].map((k, i) => (
          <button
            key={i}
            onClick={() => {
              k.onClick();
              setPage(1);
            }}
            className="rounded-2xl p-4 text-left w-full transition-all"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = k.accent + "55")
            }
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.border)}
          >
            <p
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: T.muted,
                textTransform: "uppercase",
                letterSpacing: ".05em",
                marginBottom: 6,
              }}
            >
              {k.label}
            </p>
            <p
              style={{
                fontFamily: "'Syne',sans-serif",
                fontSize: 22,
                fontWeight: 800,
                color: T.text,
                lineHeight: 1,
              }}
            >
              {loading ? "—" : k.value.toLocaleString("fr-FR")}
            </p>
          </button>
        ))}
      </div>

      {/* ── Filtres ───────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: T.card, border: `1px solid ${T.border}` }}
      >
        {/* Tabs statut */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 flex-shrink-0">
            {(
              [
                {
                  key: "all" as StatusTab,
                  label: "Tous",
                  count: products.length,
                },
                {
                  key: "active" as StatusTab,
                  label: "Actifs",
                  count: kpis.active,
                },
                {
                  key: "inactive" as StatusTab,
                  label: "Inactifs",
                  count: kpis.inactive,
                },
              ] as { key: StatusTab; label: string; count: number }[]
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setStatusTab(t.key);
                  setPage(1);
                  load();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all"
                style={{
                  background: statusTab === t.key ? T.red : "transparent",
                  color: statusTab === t.key ? "#fff" : T.muted,
                }}
                onMouseEnter={(e) => {
                  if (statusTab !== t.key) e.currentTarget.style.color = T.text;
                }}
                onMouseLeave={(e) => {
                  if (statusTab !== t.key)
                    e.currentTarget.style.color = T.muted;
                }}
              >
                {t.label}
                <span
                  style={{
                    fontSize: 10,
                    padding: "1px 5px",
                    borderRadius: 999,
                    fontWeight: 700,
                    background:
                      statusTab === t.key
                        ? "rgba(255,255,255,0.25)"
                        : T.cardAlt,
                    color: statusTab === t.key ? "#fff" : T.muted,
                  }}
                >
                  {t.count}
                </span>
              </button>
            ))}

            <button
              onClick={() => {
                setStatusTab("pending");
                setPage(1);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                border: `1px solid ${statusTab === "pending" ? "#F59E0B" : T.border}`,
                background: statusTab === "pending" ? "#FEF3C7" : "transparent",
                color: statusTab === "pending" ? "#B45309" : "inherit",
              }}
            >
              En attente{kpis.pending ? ` (${kpis.pending})` : ""}
            </button>
          </div>

          <div className="flex-1 hidden sm:block" />

          {/* Recherche */}
          <div className="relative w-full sm:w-60 flex-shrink-0">
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: T.muted,
              }}
            />
            <input
              type="text"
              placeholder="Titre, vendeur, catégorie…"
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-[12.5px] outline-none"
              style={{
                background: T.input,
                color: T.text,
                border: `1px solid ${T.inputBorder}`,
              }}
              onFocus={(e) => (e.target.style.borderColor = T.red)}
              onBlur={(e) => (e.target.style.borderColor = T.inputBorder)}
            />
          </div>
        </div>

        {/* Ligne 2 : dropdown période */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} style={{ color: T.muted, flexShrink: 0 }} />
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setOpenDrop(openDrop === "date" ? null : "date")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap"
              style={{
                background: dateF !== "all" ? T.red + "18" : T.cardAlt,
                color: dateF !== "all" ? T.red : T.muted,
                border: `1px solid ${dateF !== "all" ? T.red + "40" : T.border}`,
              }}
            >
              {
                (
                  {
                    all: "Période",
                    today: "Aujourd'hui",
                    week: "Cette semaine",
                    month: "Ce mois",
                  } as Record<DateFilter, string>
                )[dateF]
              }{" "}
              <ChevronDown size={11} />
            </button>
            <DropMenu show={openDrop === "date"}>
              {(
                [
                  ["all", "Toutes périodes"],
                  ["today", "Aujourd'hui"],
                  ["week", "Cette semaine"],
                  ["month", "Ce mois"],
                ] as [DateFilter, string][]
              ).map(([k, l]) => (
                <DropItem
                  key={k}
                  label={l}
                  active={dateF === k}
                  onClick={() => {
                    setDateF(k);
                    setPage(1);
                  }}
                />
              ))}
            </DropMenu>
          </div>

          <select
            value={categoryF}
            onChange={(event) => {
              const value =
                event.target.value === "all"
                  ? "all"
                  : Number(event.target.value);
              setCategoryF(value);
              setSubcategoryF("all");
              setPage(1);
            }}
            className="rounded-lg px-3 py-1.5 text-[12px] font-semibold outline-none"
            style={{
              background: categoryF !== "all" ? T.red + "18" : T.cardAlt,
              color: categoryF !== "all" ? T.red : T.muted,
              border: `1px solid ${categoryF !== "all" ? T.red + "40" : T.border}`,
            }}
          >
            <option value="all">Toutes catégories</option>
            {(rootCategories.length ? rootCategories : categories).map(
              (cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ),
            )}
          </select>

          <select
            value={subcategoryF}
            onChange={(event) => {
              setSubcategoryF(
                event.target.value === "all"
                  ? "all"
                  : Number(event.target.value),
              );
              setPage(1);
            }}
            disabled={subcategories.length === 0}
            className="rounded-lg px-3 py-1.5 text-[12px] font-semibold outline-none disabled:opacity-50"
            style={{
              background: subcategoryF !== "all" ? T.red + "18" : T.cardAlt,
              color: subcategoryF !== "all" ? T.red : T.muted,
              border: `1px solid ${subcategoryF !== "all" ? T.red + "40" : T.border}`,
            }}
          >
            <option value="all">Sous-catégories</option>
            {subcategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {activeFilters > 0 && (
            <button
              onClick={() => {
                setDateF("all");
                setCategoryF("all");
                setSubcategoryF("all");
                setPage(1);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style={{
                background: T.red + "10",
                color: T.red,
                border: `1px solid ${T.red}30`,
              }}
            >
              <X size={11} /> Effacer
            </button>
          )}

          <p style={{ fontSize: 12, color: T.muted, marginLeft: "auto" }}>
            {sorted.length} produit{sorted.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── Tableau ───────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: T.card, border: `1px solid ${T.border}` }}
      >
        {/* Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom: `1px solid ${T.border}`,
                  background: T.cardAlt,
                }}
              >
                {(
                  [
                    { label: "Photo", k: null },
                    { label: "Produit", k: "title" as SortKey | null },
                    { label: "Vendeur", k: null },
                    { label: "Catégorie", k: null },
                    { label: "Prix", k: "price_xaf" as SortKey | null },
                    { label: "Stock", k: "stock_quantity" as SortKey | null },
                    { label: "Statut", k: null },
                    { label: "Ajouté", k: "created_at" as SortKey | null },
                    { label: "", k: null },
                  ] as { label: string; k: SortKey | null }[]
                ).map((col, i) => (
                  <th
                    key={i}
                    onClick={col.k ? () => toggleSort(col.k!) : undefined}
                    className={col.k ? "cursor-pointer select-none" : ""}
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: ".04em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      color: sort === col.k ? T.red : T.muted,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      {col.k && <SortIcon k={col.k} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} T={T} />
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{ padding: "60px 0", textAlign: "center" }}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Package size={28} style={{ color: T.muted }} />
                      <p style={{ fontSize: 14, color: T.muted }}>
                        Aucun produit trouvé
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom:
                        i < paginated.length - 1
                          ? `1px solid ${T.border}`
                          : "none",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = T.cardAlt)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* Photo */}
                    <td style={{ padding: "12px 12px" }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          overflow: "hidden",
                          background: T.cardAlt,
                          border: `1px solid ${T.border}`,
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ImageIcon size={16} style={{ color: T.muted }} />
                      </div>
                    </td>

                    {/* Produit */}
                    <td style={{ padding: "12px 12px" }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: T.text,
                          maxWidth: 200,
                        }}
                        className="truncate"
                      >
                        {p.title}
                      </p>
                      <p style={{ fontSize: 11, color: T.muted }}>#{p.id}</p>
                    </td>

                    {/* Vendeur */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => navigate(`/admin/customers/${p.vendor}`)}
                        className="text-left hover:underline"
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: T.text,
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                        }}
                      >
                        {p.vendor_name || "—"}
                      </button>
                      {p.vendor_business && p.vendor_business !== "N/A" && (
                        <button
                          onClick={() =>
                            p.vendor_profile_id &&
                            navigate(`/admin/vendors/${p.vendor_profile_id}`)
                          }
                          className="text-left hover:underline"
                          style={{
                            fontSize: 11,
                            color: T.muted,
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: p.vendor_profile_id ? "pointer" : "default",
                          }}
                        >
                          {p.vendor_business}
                        </button>
                      )}
                    </div>

                    {/* Catégorie */}
                    <td style={{ padding: "12px 12px" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: "rgba(59,130,246,0.1)",
                          color: "#3B82F6",
                        }}
                      >
                        {p.category_name}
                      </span>
                    </td>

                    {/* Prix */}
                    <td style={{ padding: "12px 12px" }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: T.text,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtXaf(p.price_xaf)}
                      </span>
                    </td>

                    {/* Stock */}
                    <td style={{ padding: "12px 12px" }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          color:
                            p.stock_quantity === 0
                              ? "#EF4444"
                              : p.stock_quantity <= 3
                                ? "#F59E0B"
                                : "#10B981",
                        }}
                      >
                        {p.stock_quantity}
                      </span>
                    </td>

                    {/* Statut */}
                    <td style={{ padding: "12px 12px" }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: 6,
                          whiteSpace: "nowrap",
                          background: p.is_active
                            ? "rgba(16,185,129,0.12)"
                            : "rgba(156,163,175,0.12)",
                          color: p.is_active ? "#10B981" : "#9CA3AF",
                          border: `1px solid ${p.is_active ? "rgba(16,185,129,0.25)" : "rgba(156,163,175,0.2)"}`,
                        }}
                      >
                        {p.is_active ? "Actif" : "Inactif"}
                      </span>

                      {p.moderation_status === "PENDING" && (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#FEF3C7",
                            color: "#B45309",
                          }}
                        >
                          En attente
                        </span>
                      )}
                      {p.moderation_status === "REJECTED" && (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#FEE2E2",
                            color: "#B91C1C",
                          }}
                        >
                          Rejeté
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td
                      style={{
                        padding: "12px 12px",
                        fontSize: 11.5,
                        color: T.muted,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtDate(p.created_at)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "12px 12px" }}>
                      <div className="flex items-center gap-1.5 justify-end">
                        {/* Toggle actif/inactif */}
                        <button
                          onClick={() => handleToggle(p)}
                          disabled={acting === p.id}
                          title={p.is_active ? "Désactiver" : "Activer"}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{
                            background: p.is_active
                              ? "rgba(16,185,129,0.1)"
                              : T.cardAlt,
                            color: p.is_active ? "#10B981" : T.muted,
                            border: `1px solid ${p.is_active ? "rgba(16,185,129,0.25)" : T.border}`,
                          }}
                        >
                          {acting === p.id ? (
                            <RefreshCw size={11} className="animate-spin" />
                          ) : p.is_active ? (
                            <ToggleRight size={12} />
                          ) : (
                            <ToggleLeft size={12} />
                          )}
                        </button>
                        <button
                          onClick={() => openDetail(p)}
                          title="Voir le détail"
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{
                            background: T.cardAlt,
                            color: T.text,
                            border: `1px solid ${T.border}`,
                          }}
                        >
                          <Eye size={13} />
                        </button>
                        {/* Supprimer */}
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={acting === p.id}
                          title="Supprimer"
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{
                            background: "rgba(239,68,68,0.08)",
                            color: "#EF4444",
                            border: "1px solid rgba(239,68,68,0.2)",
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                        {p.moderation_status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleApprove(p)}
                              disabled={acting === p.id}
                              title="Approuver"
                              style={{
                                padding: "6px 10px",
                                borderRadius: 8,
                                border: "none",
                                fontWeight: 600,
                                fontSize: 12,
                                cursor: "pointer",
                                background: "#DCFCE7",
                                color: "#15803D",
                              }}
                            >
                              Approuver
                            </button>
                            <button
                              onClick={() => handleReject(p)}
                              disabled={acting === p.id}
                              title="Rejeter"
                              style={{
                                padding: "6px 10px",
                                borderRadius: 8,
                                border: "none",
                                fontWeight: 600,
                                fontSize: 12,
                                cursor: "pointer",
                                background: "#FEE2E2",
                                color: "#B91C1C",
                              }}
                            >
                              Rejeter
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile — cards */}
        <div className="lg:hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: `3px solid ${T.border}`,
                  borderTopColor: T.red,
                  animation: "spin 0.8s linear infinite",
                }}
              />
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <Package size={28} style={{ color: T.muted }} />
              <p style={{ fontSize: 14, color: T.muted }}>Aucun produit</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: T.border }}>
              {paginated.map((p) => (
                <div key={p.id} className="p-4 flex items-start gap-3">
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      background: T.cardAlt,
                      border: `1px solid ${T.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <ImageIcon size={16} style={{ color: T.muted }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p
                        style={{ fontSize: 13, fontWeight: 600, color: T.text }}
                        className="truncate"
                      >
                        {p.title}
                      </p>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          padding: "2px 7px",
                          borderRadius: 6,
                          background: p.is_active
                            ? "rgba(16,185,129,0.12)"
                            : "rgba(156,163,175,0.12)",
                          color: p.is_active ? "#10B981" : "#9CA3AF",
                          flexShrink: 0,
                        }}
                      >
                        {p.is_active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        color: "#F47920",
                        marginBottom: 2,
                      }}
                    >
                      {p.vendor_business}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        style={{ fontSize: 12, fontWeight: 700, color: T.text }}
                      >
                        {fmtXaf(p.price_xaf)}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: p.stock_quantity <= 3 ? "#F59E0B" : T.muted,
                        }}
                      >
                        Stock: {p.stock_quantity}
                      </span>
                      <span style={{ fontSize: 11, color: T.muted }}>
                        {fmtDate(p.created_at)}
                      </span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(p)}
                      disabled={acting === p.id}
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: p.is_active
                          ? "rgba(16,185,129,0.1)"
                          : T.cardAlt,
                        color: p.is_active ? "#10B981" : T.muted,
                        border: `1px solid ${p.is_active ? "rgba(16,185,129,0.25)" : T.border}`,
                      }}
                    >
                      {p.is_active ? (
                        <ToggleRight size={13} />
                      ) : (
                        <ToggleLeft size={13} />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      disabled={acting === p.id}
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: "rgba(239,68,68,0.08)",
                        color: "#EF4444",
                        border: "1px solid rgba(239,68,68,0.2)",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && sorted.length > 0 && (
          <div
            className="flex items-center justify-between px-4 sm:px-5 py-3 flex-wrap gap-3"
            style={{ borderTop: `1px solid ${T.border}` }}
          >
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 12, color: T.muted }}>Lignes :</span>
              {PAGE_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setPageSize(s);
                    setPage(1);
                  }}
                  className="w-8 h-7 rounded-lg text-[12px] font-semibold"
                  style={{
                    background: pageSize === s ? T.red : T.cardAlt,
                    color: pageSize === s ? "#fff" : T.muted,
                    border: `1px solid ${pageSize === s ? T.red : T.border}`,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: T.muted }}>
              {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, sorted.length)} sur {sorted.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: T.cardAlt,
                  border: `1px solid ${T.border}`,
                  color: page === 1 ? T.muted : T.text,
                  opacity: page === 1 ? 0.4 : 1,
                }}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
                )
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1)
                    acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span
                      key={`e${i}`}
                      style={{ fontSize: 12, color: T.muted, padding: "0 4px" }}
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className="w-8 h-8 rounded-lg text-[12px] font-semibold flex items-center justify-center"
                      style={{
                        background: page === p ? T.red : T.cardAlt,
                        color: page === p ? "#fff" : T.muted,
                        border: `1px solid ${page === p ? T.red : T.border}`,
                      }}
                    >
                      {p}
                    </button>
                  ),
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: T.cardAlt,
                  border: `1px solid ${T.border}`,
                  color: page === totalPages ? T.muted : T.text,
                  opacity: page === totalPages ? 0.4 : 1,
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin    { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
