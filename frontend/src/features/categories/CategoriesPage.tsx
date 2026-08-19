import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { categoryIcon } from "@/components/home/CategorySidebar";
import { categoriesApi, type CategoryTreeNode } from "@/services/api/categories";

export default function CategoriesPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-[#f8f5f1] py-10 dark:bg-gray-950">
      <div className="container mx-auto max-w-6xl px-4">
        <header className="mb-8 border-b border-orange-100 pb-6 dark:border-gray-800">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t('categories.breadcrumb')}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {t('categories.title')}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('categories.subtitle')}
          </p>
        </header>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton h-64 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {groupedCategories.map((category) => {
              const Icon = categoryIcon({
                slug: category.slug,
                name: category.name,
                iconName: category.icon_name,
              });

              return (
                <section
                  key={category.id}
                  className="flex min-h-64 flex-col rounded-lg border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <Link to={`/catalog?category=${category.id}`} className="mb-3 flex flex-col items-center gap-2 text-center sm:flex-row sm:items-start sm:text-left sm:gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-primary dark:bg-primary/10">
                      <Icon size={26} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white sm:text-base">
                        {category.name}
                      </h2>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {category.children.length > 0
                          ? t('categories.subcategory_count_plural', { count: category.children.length })
                          : t('categories.main_category')}
                      </p>
                    </div>
                  </Link>

                  <div className="mt-auto space-y-2">
                    {category.children.length > 0 ? (
                      category.children.map((child) => (
                        <Link
                          key={child.id}
                          to={`/catalog?category=${child.id}`}
                          className="flex min-h-11 items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-orange-50 hover:text-primary dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          <span>{child.name}</span>
                          <span>›</span>
                        </Link>
                      ))
                    ) : (
                      <Link
                        to={`/catalog?category=${category.id}`}
                        className="flex min-h-11 items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-orange-50 hover:text-primary dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
