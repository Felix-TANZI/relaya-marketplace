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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f4ff_0%,#fff_14%,#f8fafc_100%)] dark:bg-gray-950">
      <div className="mx-auto max-w-[860px] px-3 pb-16 pt-8 sm:px-4">
        {/* ═══════════════════════════ Hero ═══════════════════════════ */}
        <section className="animate-page-in text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-black text-white shadow-[0_8px_22px_rgba(124,58,237,.35)]"
            style={{ background: "linear-gradient(135deg,#4C1D95,#7C3AED)" }}
          >
            <Sparkles size={13} className="animate-gem-sparkle text-amber-200" fill="currentColor" />
            BelivaY+ Premium
          </span>

          <h1 className="mx-auto mt-4 max-w-[520px] bg-[linear-gradient(135deg,#6D28D9,#8B5CF6_55%,#A78BFA)] bg-clip-text text-[30px] font-black leading-[1.15] text-transparent sm:text-[38px]">
            Vivez une expérience shopping premium
          </h1>

          <p className="mx-auto mt-3 max-w-[420px] text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
            Un seul plan. Tous les avantages. Annulable à tout moment, sans frais caché.
          </p>
        </section>

        {/* ═════════════════ Carte membre actif (si connecté) ═════════════════ */}
        {isAuthenticated ? (
          <section
            className="relative mt-8 overflow-hidden rounded-[20px] p-5 text-white shadow-[0_14px_34px_rgba(16,185,129,.24)] sm:p-6"
            style={{ background: "linear-gradient(135deg,#065F46,#10B981)" }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/10"
            />

            <div className="relative z-10">
              <p className="flex items-center gap-2 text-[15px] font-black">
                <BadgeCheck size={18} className="text-white" />
                Vous êtes membre BelivaY+
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5">
                <div>
                  <dt className="text-[9.5px] font-black uppercase tracking-[0.14em] text-white/70">
                    Membre depuis
                  </dt>
                  <dd className="mt-0.5 text-[13px] font-extrabold">{memberSince ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[9.5px] font-black uppercase tracking-[0.14em] text-white/70">
                    Plan
                  </dt>
                  <dd className="mt-0.5 text-[13px] font-extrabold">Mensuel</dd>
                </div>
                <div>
                  <dt className="text-[9.5px] font-black uppercase tracking-[0.14em] text-white/70">
                    Prochain prélèvement
                  </dt>
                  <dd className="mt-0.5 text-[13px] font-extrabold">{nextDebit ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[9.5px] font-black uppercase tracking-[0.14em] text-white/70">
                    Économies ce mois
                  </dt>
                  <dd className="mt-0.5 text-[13px] font-extrabold">
                    {fmt(savings.perMonth)} FCFA
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        ) : null}

        {/* ═══════════════════════ Carte du plan unique ═══════════════════════ */}
        <section className="relative mt-9">
          <span className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-[linear-gradient(135deg,#F59E0B,#FBBF24)] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-950 shadow-[0_6px_18px_rgba(245,158,11,.4)]">
            <Star size={10} className="mr-1 inline animate-gem-sparkle" fill="currentColor" />
            Le plus populaire
          </span>

          <div
            className="relative overflow-hidden rounded-[22px] p-5 pt-8 shadow-[0_20px_46px_rgba(76,29,149,.38)] ring-1 ring-violet-500/30 sm:p-7 sm:pt-9"
            style={{ background: "linear-gradient(145deg,#1E0A3C,#2E1065,#3B1F72)" }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-violet-500/20"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-promo-sweep bg-gradient-to-r from-transparent via-white/12 to-transparent"
            />

            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black text-white ring-1 ring-white/15 backdrop-blur-sm">
                <Gem size={12} className="animate-gem-sparkle text-amber-300" fill="currentColor" />
                Plan Unique · Tout Inclus
              </span>

              <p className="mt-4 flex flex-wrap items-baseline gap-2 text-white">
                <span className="text-[40px] font-black leading-none sm:text-[46px]">
                  {fmt(PRICE_MONTHLY)}
                </span>
                <span className="text-[15px] font-bold text-white/75">FCFA/mois</span>
              </p>

              <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-white/60">
                ou{" "}
                <span className="font-extrabold text-amber-300">
                  {fmt(PRICE_YEARLY)} FCFA/an
                </span>
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-200 ring-1 ring-amber-300/30">
                  2 mois offerts
                </span>
              </p>

              {/* Les 10 avantages, deux colonnes */}
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {PLAN_FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <li
                      key={feature.label}
                      className="flex items-center gap-2.5 rounded-[12px] bg-white/[0.06] px-3 py-2.5 text-[11.5px] font-bold text-white ring-1 ring-white/10 transition-colors duration-200 hover:bg-white/[0.12]"
                    >
                      <Icon size={14} className={`flex-shrink-0 ${feature.tone}`} />
                      {feature.label}
                    </li>
                  );
                })}
              </ul>

              {/* Pied de carte : statut membre ou double CTA */}
              {isAuthenticated ? (
                <p className="mt-5 flex items-center justify-center gap-2 rounded-[12px] bg-emerald-400/15 px-4 py-3 text-center text-[12px] font-extrabold text-emerald-200 ring-1 ring-emerald-300/25">
                  <BadgeCheck size={14} />
                  Vous êtes membre BelivaY+ · Actif jusqu'au {nextDebit ?? "—"}
                </p>
              ) : (
                <div className="mt-5 flex flex-col gap-2.5">
                  <Link
                    to="/register"
                    className="flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-[13px] font-black text-[#4C1D95] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-amber-100"
                  >
                    <Gift size={15} />
                    Essayer 7 jours gratuits
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center justify-center gap-2 rounded-full border border-white/25 px-5 py-3 text-[12.5px] font-bold text-white/85 transition-colors duration-200 hover:bg-white/10"
                  >
                    Ou payer à l'année · {fmt(PRICE_YEARLY)} FCFA
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═════════════════════ Calculatrice d'économies ═════════════════════ */}
        <section
          className="mt-6 rounded-[20px] p-5 shadow-[0_12px_30px_rgba(245,158,11,.18)] sm:p-6"
          style={{ background: "linear-gradient(135deg,#FEF3C7,#FDE68A)" }}
        >
          <h2 className="flex items-center gap-2 text-[15px] font-black text-amber-950">
            <Calculator size={17} className="text-amber-700" />
            Calculez vos économies
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="premium-orders"
                className="text-[11.5px] font-bold text-amber-900"
              >
                Commandes par mois
              </label>
              <input
                id="premium-orders"
                type="range"
                min={1}
                max={20}
                step={1}
                value={orders}
                onChange={(event) => setOrders(Number(event.target.value))}
                className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-amber-600/25 accent-[#D97706]"
              />
              <p className="mt-2 text-center text-[12px] font-black text-amber-900">
                {orders} cmd/mois
              </p>
            </div>

            <div>
              <label htmlFor="premium-cart" className="text-[11.5px] font-bold text-amber-900">
                Panier moyen (FCFA)
              </label>
              <input
                id="premium-cart"
                type="range"
                min={5000}
                max={100000}
                step={5000}
                value={cart}
                onChange={(event) => setCart(Number(event.target.value))}
                className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-amber-600/25 accent-[#D97706]"
              />
              <p className="mt-2 text-center text-[12px] font-black text-amber-900">
                {fmt(cart)} FCFA
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[14px] bg-white p-4 text-center shadow-[0_6px_18px_rgba(180,83,9,.12)]">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
              Vos économies estimées
            </p>
            <p className="mt-1.5 text-[30px] font-black leading-none text-emerald-600 sm:text-[34px]">
              {fmt(savings.perMonth)} FCFA
              <span className="ml-1 text-[14px] font-bold text-emerald-600/70">/mois</span>
            </p>
            <p className="mt-2 text-[11.5px] font-semibold text-gray-500">
              soit <strong className="text-gray-700">{fmt(savings.perYear)} FCFA</strong> par an ·
              ROI <strong className="text-gray-700">×{savings.roi}</strong> sur votre abonnement
            </p>
          </div>
        </section>

        {/* ═══════════════════ Tous les avantages Premium ═══════════════════ */}
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-[17px] font-black text-gray-900 dark:text-white">
            <Gift size={18} className="text-[#F47920]" />
            Tous les avantages Premium
          </h2>

          <div className="mt-3 rounded-[18px] border border-gray-100 bg-white px-4 shadow-[0_10px_28px_rgba(15,23,42,.05)] dark:border-gray-800 dark:bg-gray-900">
            {ADVANTAGES.map((advantage, index) => {
              const Icon = advantage.icon;
              return (
                <article
                  key={advantage.title}
                  className={`flex gap-3.5 py-4 transition-transform duration-200 hover:translate-x-1 ${
                    index > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""
                  }`}
                >
                  <Icon size={20} className={`mt-0.5 flex-shrink-0 ${advantage.tone}`} />
                  <div>
                    <h3 className="text-[13.5px] font-extrabold text-gray-900 dark:text-white">
                      {advantage.title}
                    </h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">
                      {advantage.text}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ═══════════════════════ Gratuit vs BelivaY+ ═══════════════════════ */}
        <section className="mt-8 rounded-[18px] border border-gray-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,.05)] sm:p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="flex items-center gap-2 text-[16px] font-black text-gray-900 dark:text-white">
            <BarChart3 size={17} className="text-[#7C3AED]" />
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
                  <th className="py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#7C3AED]">
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
                    <td className="py-3 text-[12px] font-bold text-[#7C3AED] dark:text-violet-300">
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
          <section className="mt-6 rounded-[18px] border border-gray-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,.05)] sm:p-5 dark:border-gray-800 dark:bg-gray-900">
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
        <section
          className="mt-6 rounded-[18px] border border-pink-100 p-4 sm:p-5 dark:border-pink-500/20"
          style={{ background: "linear-gradient(135deg,#FDF2F8,#FCE7F3)" }}
        >
          <h2 className="flex items-center gap-2 text-[15px] font-black text-gray-900">
            <Gift size={17} className="text-[#F47920]" />
            Parrainez et gagnez 1 mois offert
          </h2>

          <p className="mt-2 text-[12px] leading-relaxed text-gray-600">
            Invitez vos amis sur BelivaY+. Pour chaque ami qui souscrit, vous gagnez{" "}
            <strong className="text-gray-800">1 mois gratuit</strong> et lui aussi.
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-pink-200/70 bg-white px-4 py-3">
            <div>
              <p className="text-[9.5px] font-black uppercase tracking-[0.14em] text-pink-500">
                Votre code parrainage
              </p>
              <p className="mt-0.5 font-mono text-[15px] font-black tracking-wide text-gray-900">
                {referralCode}
              </p>
            </div>

            <button
              type="button"
              onClick={copyReferral}
              className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#DB2777,#EC4899)] px-4 py-2 text-[12px] font-black text-white transition-transform duration-200 hover:-translate-y-0.5"
            >
              {codeCopied ? <Check size={13} /> : <Copy size={13} />}
              {codeCopied ? "Copié" : "Copier"}
            </button>
          </div>

          <p className="mt-2.5 text-[11px] text-gray-500">
            <strong className="text-gray-700">0 ami parrainé</strong> · 1 mois offert par ami
          </p>
        </section>

        {/* ═════════════════════════ Témoignages ═════════════════════════ */}
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-[17px] font-black text-gray-900 dark:text-white">
            <MessageSquareQuote size={18} className="text-[#F47920]" />
            Ils ont choisi BelivaY+
          </h2>

          <div className="mt-3 flex flex-col gap-3">
            {TESTIMONIALS.map((testimonial) => (
              <article
                key={testimonial.name}
                className="rounded-[16px] border border-gray-100 bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(124,58,237,.12)] dark:border-gray-800 dark:bg-gray-900"
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

          <div className="mt-3 rounded-[18px] border border-gray-100 bg-white px-4 shadow-[0_10px_28px_rgba(15,23,42,.05)] dark:border-gray-800 dark:bg-gray-900">
            {FAQ.map((item, index) => (
              <article
                key={item.q}
                className={`py-4 ${
                  index > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""
                }`}
              >
                <h3 className="flex items-start gap-2 text-[12.5px] font-extrabold text-gray-900 dark:text-white">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rotate-45 bg-[#F47920]" />
                  {item.q}
                </h3>
                <p className="mt-1.5 pl-3.5 text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">
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
