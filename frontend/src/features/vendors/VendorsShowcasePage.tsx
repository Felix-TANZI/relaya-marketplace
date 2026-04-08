import { Link } from "react-router-dom";
import { Award, Home, Monitor, ShieldCheck, Shirt, ShoppingBag, ShoppingCart, Sparkles, Star, Store, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const VENDORS: { id: number; name: string; category: string; city: string; rating: string; sales: string; products: string; badge: string; icon: LucideIcon; iconColor: string; description: string }[] = [
  {
    id: 1,
    name: "ModeAfrique",
    category: "Mode Femme",
    city: "Yaoundé",
    rating: "4.9",
    sales: "1 240",
    products: "87",
    badge: "Or",
    icon: Shirt,
    iconColor: "bg-pink-50 text-pink-600 dark:bg-pink-900/20",
    description:
      "Créations mode et wax premium, collections régulières et finitions soignées.",
  },
  {
    id: 2,
    name: "TechYaoundé",
    category: "Électronique",
    city: "Douala",
    rating: "4.8",
    sales: "980",
    products: "64",
    badge: "Certifié",
    icon: Monitor,
    iconColor: "bg-blue-50 text-blue-600 dark:bg-blue-900/20",
    description:
      "Produits tech, accessoires et appareils certifiés avec livraison suivie.",
  },
  {
    id: 3,
    name: "NaturaCMR",
    category: "Beauté & Santé",
    city: "Bafoussam",
    rating: "4.9",
    sales: "2 103",
    products: "142",
    badge: "Platinum",
    icon: Sparkles,
    iconColor: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20",
    description:
      "Cosmétique naturelle, huiles et soins locaux sélectionnés avec rigueur.",
  },
  {
    id: 4,
    name: "BioMarché237",
    category: "Supermarché",
    city: "Yaoundé",
    rating: "4.9",
    sales: "876",
    products: "203",
    badge: "Or",
    icon: ShoppingCart,
    iconColor: "bg-green-50 text-green-600 dark:bg-green-900/20",
    description:
      "Épicerie locale et produits du quotidien à forte rotation et livraison rapide.",
  },
  {
    id: 5,
    name: "ShoesDouala",
    category: "Chaussures",
    city: "Douala",
    rating: "4.7",
    sales: "312",
    products: "29",
    badge: "Argent",
    icon: ShoppingBag,
    iconColor: "bg-purple-50 text-purple-600 dark:bg-purple-900/20",
    description:
      "Chaussures et sneakers sélectionnées pour le confort et la durabilité.",
  },
  {
    id: 6,
    name: "DecoMaison237",
    category: "Maison",
    city: "Yaoundé",
    rating: "4.6",
    sales: "134",
    products: "31",
    badge: "Bronze",
    icon: Home,
    iconColor: "bg-amber-50 text-amber-600 dark:bg-amber-900/20",
    description:
      "Décoration, textile et accessoires maison avec un angle artisanal assumé.",
  },
];

export default function VendorsShowcasePage() {
  return (
    <div className="min-h-screen bg-[#f8f5f1] px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Vendeurs
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Vendeurs certifiés BelivaY
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
                Découvrez les boutiques les plus fiables de la marketplace, leur niveau de certification et leur spécialité.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#fff7ef] px-4 py-3 dark:bg-gray-800">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Vendeurs actifs</div>
                <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">3 200+</div>
              </div>
              <div className="rounded-2xl bg-[#fff7ef] px-4 py-3 dark:bg-gray-800">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Satisfaction</div>
                <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">98%</div>
              </div>
              <div className="rounded-2xl bg-[#fff7ef] px-4 py-3 dark:bg-gray-800">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Escrow</div>
                <div className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">Actif</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Certification BelivaY",
              text: "Chaque boutique affichée ici a passé un contrôle d’identité et de qualité.",
            },
            {
              icon: Star,
              title: "Notes publiques",
              text: "Les notes et volumes de vente aident à repérer les vendeurs les plus fiables.",
            },
            {
              icon: TrendingUp,
              title: "Performance suivie",
              text: "BelivaY surveille les délais, la satisfaction et les litiges sur toute la marketplace.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff7ef] text-primary dark:bg-gray-800">
                <Icon size={22} />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-gray-500 dark:text-gray-400">{text}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {VENDORS.map((vendor) => (
            <article
              key={vendor.id}
              className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center justify-center rounded-[1.25rem] bg-[#fff7ef] px-4 py-6 dark:bg-gray-800">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${vendor.iconColor}`}>
                  <vendor.icon size={32} />
                </div>
              </div>
              <div className="-mt-6 flex justify-center">
                <div className="rounded-full border-4 border-white bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary shadow-sm dark:border-gray-900 dark:bg-gray-900">
                  {vendor.badge}
                </div>
              </div>
              <div className="mt-4 text-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{vendor.name}</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {vendor.category} · {vendor.city}
                </p>
              </div>
              <p className="mt-4 text-sm leading-7 text-gray-500 dark:text-gray-400">
                {vendor.description}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-[#fffaf5] px-3 py-3 text-center dark:bg-gray-800">
                  <div className="text-sm font-semibold text-primary">{vendor.rating}</div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Note</div>
                </div>
                <div className="rounded-2xl bg-[#fffaf5] px-3 py-3 text-center dark:bg-gray-800">
                  <div className="text-sm font-semibold text-primary">{vendor.sales}</div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Ventes</div>
                </div>
                <div className="rounded-2xl bg-[#fffaf5] px-3 py-3 text-center dark:bg-gray-800">
                  <div className="text-sm font-semibold text-primary">{vendor.products}</div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Produits</div>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <Link
                  to="/catalog"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
                >
                  <Store size={16} />
                  Voir le catalogue
                </Link>
                <Link
                  to="/become-seller"
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-200"
                >
                  <Award size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
