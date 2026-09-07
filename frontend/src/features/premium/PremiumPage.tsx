import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  BarChart3,
  Bell,
  Calculator,
  Check,
  Copy,
  CreditCard,
  FileText,
  Gem,
  Gift,
  Globe,
  Map,
  MessageSquareQuote,
  Palette,
  PauseCircle,
  Phone,
  Sparkles,
  Star,
  Ticket,
  Truck,
  XCircle,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PfShellStyles } from "@/styles/pfShell";

/* ─────────────────────────── Données de la page ─────────────────────────── */

const PRICE_MONTHLY = 2500;
const PRICE_YEARLY = 25000;

/** Les 10 avantages listés dans la carte du plan, en deux colonnes. */
const PLAN_FEATURES: { icon: LucideIcon; label: string; tone: string }[] = [
  { icon: Palette, label: "Thème violet premium exclusif", tone: "text-violet-300" },
  { icon: Map, label: "Carte livreur temps réel", tone: "text-sky-300" },
  { icon: Truck, label: "Livraison gratuite toutes commandes", tone: "text-orange-300" },
  { icon: Zap, label: "Flash Sales 1h avant tout le monde", tone: "text-amber-300" },
  { icon: CreditCard, label: "Points fidélité ×3 accélérés", tone: "text-emerald-300" },
  { icon: Ticket, label: "Coupons exclusifs chaque mois", tone: "text-pink-300" },
  { icon: Bell, label: "Alertes baisse de prix instantanées", tone: "text-amber-200" },
  { icon: BarChart3, label: "Recommandations IA personnalisées", tone: "text-indigo-300" },
  { icon: Phone, label: "Support 24h/7j ligne dédiée", tone: "text-emerald-200" },
  { icon: Globe, label: "Accès boutiques sélection CEMAC", tone: "text-sky-200" },
];

/** Le détail long, sous la calculatrice. */
const ADVANTAGES: { icon: LucideIcon; tone: string; title: string; text: string }[] = [
  {
    icon: Truck,
    tone: "text-orange-500",
    title: "Livraison gratuite illimitée",
    text: "Plus aucun frais de livraison, sur toutes vos commandes, dans toute la zone CEMAC. Économie moyenne : 2 500 FCFA par commande.",
  },
  {
    icon: Zap,
    tone: "text-amber-500",
    title: "Accès Flash Sales en avant-première",
    text: "Les meilleures offres flash vous sont réservées 1h avant tout le monde. Plus de produits ratés.",
  },
  {
    icon: CreditCard,
    tone: "text-emerald-600",
    title: "Points fidélité multipliés par 3",
    text: "Chaque achat rapporte 3× plus de points. Atteignez Argent, Or et Platine beaucoup plus vite.",
  },
  {
    icon: Map,
    tone: "text-sky-600",
    title: "Carte livreur en temps réel",
    text: "Suivez votre livreur sur la carte avec position mise à jour toutes les 30 secondes.",
  },
  {
    icon: Gift,
    tone: "text-pink-500",
    title: "Coupons exclusifs mensuels",
    text: "Recevez chaque mois 3 à 5 coupons personnalisés (jusqu'à −30 %) sur vos catégories favorites.",
  },
  {
    icon: Bell,
    tone: "text-amber-500",
    title: "Alertes baisse de prix",
    text: "Soyez prévenu instantanément quand un article de votre wishlist baisse de prix.",
  },
  {
    icon: BarChart3,
    tone: "text-indigo-500",
    title: "Recommandations IA",
    text: "Notre IA analyse vos achats pour vous suggérer les meilleurs produits adaptés à vos goûts.",
  },
  {
    icon: Phone,
    tone: "text-emerald-600",
    title: "Support prioritaire 24h/7j",
    text: "Ligne dédiée WhatsApp et téléphone. Réponse en moins de 15 minutes en moyenne.",
  },
  {
    icon: Palette,
    tone: "text-violet-500",
    title: "Thème violet premium",
    text: "Interface exclusive aux membres Premium : couleurs, animations et logo violet.",
  },
  {
    icon: Globe,
    tone: "text-sky-600",
    title: "Accès boutiques sélection",
    text: "Découvrez des boutiques certifiées Or et Platine non visibles aux membres standards.",
  },
];

/** Tableau comparatif Gratuit / BelivaY+. */
const COMPARISON: { label: string; free: string; plus: string; icon?: string }[] = [
  { label: "Suivi commande", free: "Statuts texte", plus: "Carte livreur live", icon: "map" },
  { label: "Livraison gratuite", free: "Dès 30 000 FCFA", plus: "Toutes les commandes" },
  { label: "Flash Sales", free: "Accès standard", plus: "1h avant tout le monde", icon: "zap" },
  { label: "Points fidélité", free: "×1 normal", plus: "×3 accéléré" },
  { label: "Coupons mensuels", free: "Aucun", plus: "3 à 5 personnalisés" },
  { label: "Alertes prix", free: "Manuelles", plus: "Instantanées push" },
  { label: "Recommandations", free: "Standard", plus: "IA personnalisée" },
  { label: "Thème interface", free: "Orange standard", plus: "Violet premium", icon: "sparkle" },
  { label: "Support", free: "Email · 48h", plus: "24h/7j ligne dédiée" },
];

const TESTIMONIALS = [
  {
    name: "Felix N.",
    meta: "Yaoundé · Membre depuis 8 mois",
    quote:
      "Depuis BelivaY+, je commande 3 fois plus. La livraison gratuite et les flash deals me font économiser facilement 15 000 FCFA par mois.",
  },
  {
    name: "Karine M.",
    meta: "Douala · Membre depuis 4 mois",
    quote:
      "Le support 24/7 m'a sauvé pour un cadeau urgent. La carte livreur en temps réel est géniale, je ne perds plus mon temps à attendre.",
  },
  {
    name: "Paul T.",
    meta: "Bafoussam · Membre depuis 1 an",
    quote:
      "Les coupons mensuels couvrent largement l'abonnement. J'ai déjà parrainé 3 amis, donc c'est gratuit pour moi maintenant.",
  },
];

const FAQ = [
  {
    q: "Puis-je annuler à tout moment ?",
    a: "Oui, depuis vos paramètres de compte ou la section « Gestion » de cette page. Votre accès reste actif jusqu'à la fin de la période payée. Aucun frais d'annulation.",
  },
  {
    q: "Comment fonctionnent les 7 jours gratuits ?",
    a: "Aucune carte bancaire requise. Vous êtes prélevé via Mobile Money uniquement si vous choisissez de continuer après l'essai. Notification 24h avant.",
  },
  {
    q: "La carte livreur est-elle vraiment en temps réel ?",
    a: "Oui, pour les commandes en statut « En livraison ». Position du livreur mise à jour toutes les 30 secondes via GPS.",
  },
  {
    q: "Le plan annuel est-il remboursable ?",
    a: "Oui, au prorata des mois restants en cas d'annulation. Remboursement sur la méthode de paiement d'origine sous 7 jours.",
  },
  {
    q: "Puis-je suspendre temporairement ?",
    a: "Oui, jusqu'à 3 mois consécutifs maximum. Aucun prélèvement pendant la suspension, votre accès est gelé.",
  },
  {
    q: "Comment fonctionne le parrainage ?",
    a: "Partagez votre code unique. Pour chaque ami qui souscrit (mensuel ou annuel), vous recevez 1 mois gratuit ajouté à votre abonnement.",
  },
  {
    q: "Les avantages sont-ils valables hors Cameroun ?",
    a: "Oui, dans toute la zone CEMAC : Cameroun, Gabon, Congo, RCA, Tchad, Guinée Équatoriale.",
  },
];

/* ─────────────────────────────── Utilitaires ────────────────────────────── */

const MONTHS_SHORT = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

/** « 15 Mar 2026 » — format court utilisé partout sur la page. */
function formatShortDate(date: Date): string {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/** Séparateur d'espace insécable remplacé par une espace simple, plus lisible. */
function fmt(value: number): string {
  return Math.round(value).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ");
}

/* ────────────────────────────────── Page ────────────────────────────────── */

/**
 * L'horloge est une source externe mutable : on la lit via useSyncExternalStore
 * plutot que pendant le rendu, pour respecter les regles de purete de React.
 * Le jour courant suffit, il ne change pas pendant une session de navigation.
 */
const subscribeToClock = () => () => {};
const getTodayKey = () => new Date().toDateString();
const getServerTodayKey = () => "";

export default function PremiumPage() {
  const { user, isAuthenticated } = useAuth();

  /* Calculatrice d'économies — mêmes coefficients que la maquette. */
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [orders, setOrders] = useState(6);
  const [cart, setCart] = useState(25000);

  const [codeCopied, setCodeCopied] = useState(false);

  /* Prochain prélèvement : même jour, mois suivant. */
  const todayKey = useSyncExternalStore(subscribeToClock, getTodayKey, getServerTodayKey);
  const nextDebit = useMemo(() => {
    if (!todayKey) return null;
    const now = new Date(todayKey);
    return formatShortDate(new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()));
  }, [todayKey]);

  useEffect(() => {
    if (!codeCopied) return;
    const timer = window.setTimeout(() => setCodeCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [codeCopied]);

  const savings = useMemo(() => {
    const delivery = orders * 2500;
    const deals = orders * cart * 0.05;
    const points = orders * cart * 0.03;
    const perMonth = delivery + deals + points;
    return {
      perMonth,
      perYear: perMonth * 12,
      roi: Math.round(perMonth / PRICE_MONTHLY),
    };
  }, [orders, cart]);

  const memberSince = user?.date_joined ? formatShortDate(new Date(user.date_joined)) : null;

  const referralCode = user
    ? `${(user.first_name || user.username).toUpperCase().replace(/\s+/g, "")}-PREMIUM`
    : "BELIVAY-PREMIUM";

  const copyReferral = () => {
    navigator.clipboard?.writeText(referralCode).then(
      () => setCodeCopied(true),
      () => setCodeCopied(false)
    );
  };

  return (
    <div className="pf-root" style={{ minHeight: "100vh" }}>
      <PfShellStyles />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 16px 64px" }}>
        {/* ═══ Hero ═══ */}
        <section className="pf-anim" style={{ textAlign: "center", marginBottom: 6 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 13px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "var(--pf-accent)", background: "var(--pf-asoft)", border: "1px solid var(--pf-aring)" }}>
            <Gem size={12} fill="currentColor" /> BelivaY+ Premium
          </span>
          <h1 style={{ margin: "10px 0 4px", fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", color: "var(--pf-text)" }}>
            Une expérience shopping premium
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--pf-text2)" }}>
            Un seul plan, tous les avantages. Annulable à tout moment.
          </p>
        </section>

        {/* ═══ Membre actif (glass) ═══ */}
        {isAuthenticated ? (
          <section className="pf-card pf-anim" style={{ marginTop: 16 }}>
            <p style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 800, color: "var(--pf-text)" }}>
              <span style={{ display: "inline-flex", width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#34d399,#059669)", color: "#fff", boxShadow: "0 5px 14px rgba(5,150,105,.35)" }}>
                <BadgeCheck size={18} />
              </span>
              Vous êtes membre BelivaY+
            </p>
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "14px 16px" }} className="sm:grid-cols-4">
              {[
                ["Membre depuis", memberSince ?? "—"],
                ["Plan", billing === "monthly" ? "Mensuel" : "Annuel"],
                ["Prochain prélèvement", nextDebit ?? "—"],
                ["Économies ce mois", `${fmt(savings.perMonth)} FCFA`],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--pf-muted)" }}>{k}</div>
                  <div style={{ marginTop: 2, fontSize: 13, fontWeight: 800, color: "var(--pf-text)" }}>{v}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ═══ 2 colonnes : plan | calculateur + gains ═══ */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.12fr_0.88fr]" style={{ marginTop: 18, alignItems: "start" }}>

          {/* PLAN — verre, orange en accent */}
          <div className="pf-anim" style={{ position: "relative", overflow: "hidden", borderRadius: 20, padding: 20, background: "var(--pf-glass)", backdropFilter: "blur(22px) saturate(1.6)", WebkitBackdropFilter: "blur(22px) saturate(1.6)", border: "1px solid var(--pf-glass-border)", boxShadow: "0 10px 40px rgba(244,97,15,.08),0 2px 10px rgba(20,10,5,.04)" }}>
            <span aria-hidden style={{ position: "absolute", top: -40, right: -30, width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle,rgba(244,97,15,.10),transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 999, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--pf-accent)", background: "var(--pf-asoft)", border: "1px solid var(--pf-aring)" }}>
                  <Star size={10} fill="currentColor" /> Le plus populaire
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--pf-text)" }}>BelivaY+</span>
              </div>

              {/* Bascule mensuel / annuel */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: 3, borderRadius: 999, background: "var(--pf-s3)", border: "1px solid var(--pf-border)", marginBottom: 14 }}>
                {(["monthly", "yearly"] as const).map((key) => {
                  const on = billing === key;
                  return (
                    <button key={key} type="button" onClick={() => setBilling(key)}
                      style={{ padding: "6px 14px", borderRadius: 999, fontSize: "11.5px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: "none",
                        ...(on
                          ? { color: "#fff", background: "linear-gradient(135deg,var(--pf-accent2),var(--pf-accent))", boxShadow: "0 4px 12px rgba(244,97,15,.28)" }
                          : { color: "var(--pf-text2)", background: "transparent" }) }}>
                      {key === "monthly" ? "Mensuel" : <>Annuel <span style={{ color: "#16a34a", fontWeight: 800 }}>−17%</span></>}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1, color: "var(--pf-accent)" }}>
                  {fmt(billing === "monthly" ? PRICE_MONTHLY : PRICE_YEARLY)}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--pf-text2)" }}>
                  {billing === "monthly" ? "F/mois" : "F/an"}
                </span>
              </div>
              <p style={{ fontSize: "11.5px", color: "var(--pf-muted)", margin: "0 0 16px" }}>
                {billing === "monthly"
                  ? `ou ${fmt(PRICE_YEARLY)} F/an — 2 mois offerts`
                  : `soit ~${fmt(Math.round(PRICE_YEARLY / 12))} F/mois`}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px 14px", marginBottom: 18 }}>
                {PLAN_FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <span key={feature.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "11.5px", color: "var(--pf-text)" }}>
                      <Icon size={14} style={{ flexShrink: 0, color: "var(--pf-accent)" }} />
                      {feature.label}
                    </span>
                  );
                })}
              </div>

              {isAuthenticated ? (
                <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.28)", padding: "12px", fontSize: 12, fontWeight: 800, color: "#059669" }}>
                  <BadgeCheck size={14} /> Membre actif · jusqu'au {nextDebit ?? "—"}
                </p>
              ) : (
                <>
                  <Link to="/register" className="pf-btn-accent" style={{ width: "100%", justifyContent: "center", padding: "13px", fontSize: 13.5, textDecoration: "none" }}>
                    <Gift size={15} /> {billing === "monthly" ? "Essayer 7 jours gratuits" : `S'abonner à l'année · ${fmt(PRICE_YEARLY)} F`}
                  </Link>
                  <p style={{ textAlign: "center", fontSize: 11, color: "var(--pf-muted)", margin: "8px 0 0" }}>
                    Sans engagement · annulable à tout moment
                  </p>
                </>
              )}
            </div>
          </div>

          {/* COLONNE DROITE : calculateur + gains */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="pf-card pf-anim">
              <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 800, color: "var(--pf-text)", marginBottom: 12 }}>
                <Calculator size={16} style={{ color: "var(--pf-accent)" }} /> Calculez vos économies
              </h2>

              <label htmlFor="premium-orders" style={{ fontSize: 11, fontWeight: 600, color: "var(--pf-text2)" }}>Commandes / mois</label>
              <input id="premium-orders" type="range" min={1} max={20} step={1} value={orders}
                onChange={(e) => setOrders(Number(e.target.value))}
                className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[#f4610f]"
                style={{ background: "var(--pf-s3)" }} />
              <p style={{ textAlign: "center", fontSize: 11.5, fontWeight: 800, color: "var(--pf-accent)", margin: "6px 0 10px" }}>{orders} cmd/mois</p>

              <label htmlFor="premium-cart" style={{ fontSize: 11, fontWeight: 600, color: "var(--pf-text2)" }}>Panier moyen (FCFA)</label>
              <input id="premium-cart" type="range" min={5000} max={100000} step={5000} value={cart}
                onChange={(e) => setCart(Number(e.target.value))}
                className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[#f4610f]"
                style={{ background: "var(--pf-s3)" }} />
              <p style={{ textAlign: "center", fontSize: 11.5, fontWeight: 800, color: "var(--pf-accent)", margin: "6px 0 12px" }}>{fmt(cart)} FCFA</p>

              <div style={{ borderRadius: 14, padding: 14, textAlign: "center", background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.22)" }}>
                <p style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--pf-muted)", margin: 0 }}>Économies estimées</p>
                <p style={{ fontSize: 26, fontWeight: 800, color: "#059669", lineHeight: 1, margin: "5px 0 0" }}>
                  {fmt(savings.perMonth)} <span style={{ fontSize: 12, fontWeight: 700, color: "var(--pf-text2)" }}>F/mois</span>
                </p>
                <p style={{ fontSize: 10.5, color: "var(--pf-muted)", margin: "4px 0 0" }}>
                  soit {fmt(savings.perYear)} F/an · ROI ×{savings.roi}
                </p>
              </div>
            </div>

            <div className="pf-card pf-anim" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {[
                { icon: Truck, grad: "linear-gradient(135deg,#ffa04d,#f4610f)", label: "Livraison gratuite illimitée" },
                { icon: CreditCard, grad: "linear-gradient(135deg,#34d399,#059669)", label: "Points fidélité ×3" },
                { icon: Phone, grad: "linear-gradient(135deg,#5bb8ff,#2563eb)", label: "Support 24/7 prioritaire" },
              ].map((g) => {
                const Icon = g.icon;
                return (
                  <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", background: g.grad }}>
                      <Icon size={17} />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--pf-text)" }}>{g.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══════════════════ Tous les avantages Premium ═══════════════════ */}
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-[17px] font-black text-gray-900 dark:text-white">
            <Gift size={18} className="text-[#F47920]" />
            Tous les avantages Premium
          </h2>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ADVANTAGES.map((advantage) => {
              const Icon = advantage.icon;
              return (
                <article key={advantage.title} className="pf-card">
                  <Icon size={22} className={`flex-shrink-0 ${advantage.tone}`} />
                  <h3 style={{ fontSize: 13.5, fontWeight: 800, color: "var(--pf-text)", marginTop: 10 }}>
                    {advantage.title}
                  </h3>
                  <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--pf-text2)", marginTop: 4 }}>
                    {advantage.text}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ═══════════════════════ Gratuit vs BelivaY+ ═══════════════════════ */}
        <section className="pf-card pf-anim" style={{ marginTop: 24 }}>
          <h2 className="flex items-center gap-2 text-[16px] font-black text-gray-900 dark:text-white">
            <BarChart3 size={17} className="text-[#f4610f]" />
            Gratuit vs BelivaY+
          </h2>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[440px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="py-2.5 pr-3" />
                  <th className="py-2.5 pr-3 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                    Gratuit
                  </th>
                  <th className="py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#f4610f]">
                    BelivaY+
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-gray-50 transition-colors duration-150 last:border-0 hover:bg-violet-50/60 dark:border-gray-800/60 dark:hover:bg-violet-500/5"
                  >
                    <td className="py-3 pr-3 text-[12.5px] font-extrabold text-gray-800 dark:text-gray-200">
                      {row.label}
                    </td>
                    <td className="py-3 pr-3 text-[12px] text-gray-500 dark:text-gray-400">
                      {row.free}
                    </td>
                    <td className="py-3 text-[12px] font-bold text-[#f4610f] dark:text-[#ff8a3d]">
                      <span className="inline-flex items-center gap-1.5">
                        {row.plus}
                        {row.icon === "map" ? <Map size={12} className="text-sky-500" /> : null}
                        {row.icon === "zap" ? <Zap size={12} className="text-amber-500" /> : null}
                        {row.icon === "sparkle" ? (
                          <Sparkles
                            size={12}
                            className="animate-gem-sparkle text-amber-400"
                            fill="currentColor"
                          />
                        ) : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ═════════════ Gestion de l'abonnement (membres connectés) ═════════════ */}
        {isAuthenticated ? (
          <section className="pf-card pf-anim" style={{ marginTop: 24 }}>
            <h2 className="flex items-center gap-2 text-[16px] font-black text-gray-900 dark:text-white">
              <CreditCard size={17} className="text-gray-500" />
              Gestion de votre abonnement
            </h2>

            {/* Méthode de paiement */}
            <div className="mt-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">
                  Méthode de paiement
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] font-extrabold text-gray-800 dark:text-gray-200">
                  <CreditCard size={13} className="text-[#F47920]" />
                  MTN MoMo · ••••6789
                </p>
              </div>
              <Link
                to="/profile"
                className="rounded-lg border border-gray-200 px-3.5 py-2 text-[12px] font-bold text-gray-600 transition-colors duration-200 hover:border-[#F47920] hover:text-[#F47920] dark:border-gray-700 dark:text-gray-300"
              >
                Modifier
              </Link>
            </div>

            {/* Auto-renouvellement */}
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-4 dark:border-gray-800">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">
                  Auto-renouvellement
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-700 dark:text-gray-300">
                  <BadgeCheck size={13} className="text-emerald-500" />
                  Activé · Prochain prélèvement le {nextDebit ?? "—"}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-3.5 py-2 text-[12px] font-bold text-gray-600 transition-colors duration-200 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300"
              >
                Désactiver
              </button>
            </div>

            {/* Historique des factures */}
            <div className="py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">
                Historique des factures
              </p>

              <ul className="mt-2.5 flex flex-col gap-2.5">
                {[
                  { ref: "INV-2026-02-15", date: nextDebit },
                  { ref: "INV-2026-01-15", date: memberSince },
                ].map((invoice) => (
                  <li
                    key={invoice.ref}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 pb-2.5 last:border-0 dark:border-gray-800/60"
                  >
                    <span className="text-[11.5px] text-gray-500 dark:text-gray-400">
                      <code className="font-mono font-bold text-gray-700 dark:text-gray-300">
                        {invoice.ref}
                      </code>{" "}
                      · {invoice.date ?? "—"}
                    </span>
                    <span className="flex items-center gap-2">
                      <strong className="text-[12px] text-gray-800 dark:text-gray-200">
                        {fmt(PRICE_MONTHLY)} FCFA
                      </strong>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:bg-emerald-500/15">
                        <BadgeCheck size={10} />
                        Payé
                      </span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10.5px] font-bold text-gray-600 transition-colors duration-200 hover:border-[#F47920] hover:text-[#F47920] dark:border-gray-700 dark:text-gray-300"
                      >
                        <FileText size={10} />
                        PDF
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-[12.5px] font-bold text-gray-600 transition-colors duration-200 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300"
              >
                <PauseCircle size={14} />
                Suspendre temporairement (3 mois max)
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-[12.5px] font-bold text-red-500 transition-colors duration-200 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
              >
                <XCircle size={14} />
                Annuler mon abonnement
              </button>
            </div>
          </section>
        ) : null}

        {/* ══════════════════════════ Parrainage ══════════════════════════ */}
        <section className="pf-card pf-anim" style={{ marginTop: 24 }}>
          <h2 className="flex items-center gap-2 text-[15px] font-black" style={{ color: "var(--pf-text)" }}>
            <Gift size={17} style={{ color: "var(--pf-accent)" }} />
            Parrainez et gagnez 1 mois offert
          </h2>

          <p className="mt-2 text-[12px] leading-relaxed" style={{ color: "var(--pf-text2)" }}>
            Invitez vos amis sur BelivaY+. Pour chaque ami qui souscrit, vous gagnez{" "}
            <strong style={{ color: "var(--pf-text)" }}>1 mois gratuit</strong> et lui aussi.
          </p>

          <div
            className="mt-3 flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            style={{ borderRadius: 14, background: "var(--pf-s3)", border: "1px solid var(--pf-border)" }}
          >
            <div>
              <p className="text-[9.5px] font-black uppercase tracking-[0.14em]" style={{ color: "var(--pf-accent)" }}>
                Votre code parrainage
              </p>
              <p className="mt-0.5 font-mono text-[15px] font-black tracking-wide" style={{ color: "var(--pf-text)" }}>
                {referralCode}
              </p>
            </div>

            <button
              type="button"
              onClick={copyReferral}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-black text-white transition-transform duration-200 hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg,var(--pf-accent2),var(--pf-accent))" }}
            >
              {codeCopied ? <Check size={13} /> : <Copy size={13} />}
              {codeCopied ? "Copié" : "Copier"}
            </button>
          </div>

          <p className="mt-2.5 text-[11px]" style={{ color: "var(--pf-muted)" }}>
            <strong style={{ color: "var(--pf-text2)" }}>0 ami parrainé</strong> · 1 mois offert par ami
          </p>
        </section>

        {/* ═════════════════════════ Témoignages ═════════════════════════ */}
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-[17px] font-black text-gray-900 dark:text-white">
            <MessageSquareQuote size={18} className="text-[#F47920]" />
            Ils ont choisi BelivaY+
          </h2>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <article
                key={testimonial.name}
                className="pf-card"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F8A45E,#F47920)] text-[13px] font-black text-white">
                      {testimonial.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-[13px] font-extrabold text-gray-900 dark:text-white">
                        {testimonial.name}
                      </p>
                      <p className="text-[11px] text-gray-400">{testimonial.meta}</p>
                    </div>
                  </div>

                  <span className="flex flex-shrink-0 gap-0.5">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} size={11} className="text-amber-400" fill="currentColor" />
                    ))}
                  </span>
                </div>

                <p className="mt-3 text-[12px] italic leading-relaxed text-gray-600 dark:text-gray-400">
                  « {testimonial.quote} »
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ═════════════════════ Questions fréquentes ═════════════════════ */}
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-[17px] font-black text-gray-900 dark:text-white">
            <Sparkles size={18} className="text-[#F47920]" />
            Questions fréquentes
          </h2>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FAQ.map((item) => (
              <article key={item.q} className="pf-card">
                <h3 style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, fontWeight: 800, color: "var(--pf-text)" }}>
                  <span style={{ marginTop: 6, width: 6, height: 6, flexShrink: 0, transform: "rotate(45deg)", background: "var(--pf-accent)" }} />
                  {item.q}
                </h3>
                <p style={{ marginTop: 6, paddingLeft: 14, fontSize: 12, lineHeight: 1.6, color: "var(--pf-text2)" }}>
                  {item.a}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
