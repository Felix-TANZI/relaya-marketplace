import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Home as HomeIcon,
  Monitor,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { productsApi, type Category } from "@/services/api/products";

type CategoryWithChildren = Category & {
  children: Category[];
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  "Téléphones & Tablettes": Smartphone,
  "Téléphones": Smartphone,
  "Électronique": Monitor,
  "Mode Femme": Shirt,
  "Mode Homme": Shirt,
  "Beauté & Santé": Sparkles,
  "Maison & Cuisine": HomeIcon,
  "Maison & Bureau": HomeIcon,
  "Supermarché": ShoppingBag,
};

export default function CategoriesPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await productsApi.listCategories();
        setCategories(response.results || []);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const groupedCategories = useMemo<CategoryWithChildren[]>(() => {
    const parents = categories.filter((category) => !category.parent);
    return parents.map((parent) => ({
      ...parent,
      children: categories.filter((category) => category.parent === parent.id),
    }));
  }, [categories]);

  return (
    <div className="min-h-screen bg-[#f8f5f1] py-10 dark:bg-gray-950">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-orange-100 dark:bg-gray-900 dark:ring-gray-800">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t('categories.breadcrumb')}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {t('categories.title')}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('categories.subtitle')}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton aspect-[1.1] rounded-[1.75rem]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {groupedCategories.map((category) => {
              const Icon = CATEGORY_ICONS[category.name] || ShoppingBag;

              return (
                <section
                  key={category.id}
                  className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-primary dark:bg-primary/10">
                      <Icon size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {category.name}
                      </h2>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        {category.children.length > 0
                          ? t('categories.subcategory_count_plural', { count: category.children.length })
                          : t('categories.main_category')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {category.children.length > 0 ? (
                      category.children.map((child) => (
                        <Link
                          key={child.id}
                          to={`/catalog?category=${child.id}`}
                          className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-orange-50 hover:text-primary dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          <span>{child.name}</span>
                          <span>›</span>
                        </Link>
                      ))
                    ) : (
                      <Link
                        to={`/catalog?category=${category.id}`}
                        className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-orange-50 hover:text-primary dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <span>{t('categories.explore')}</span>
                        <span>›</span>
                      </Link>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
