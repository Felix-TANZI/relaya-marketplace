// frontend/src/features/payments/shared/Pagination.tsx
// Navigation entre les pages d'une liste.
//
// Le TOTAL est toujours affiche : savoir qu'il y a 412 versements en
// attente change la lecture, meme si on n'en voit que 25.

import { useTranslation } from 'react-i18next';

import { FT } from './tokens';

interface PaginationProps {
  page: number;
  pages: number;
  count: number;
  onChange: (page: number) => void;
  label?: string;
}

export default function Pagination({
  page, pages, count, onChange, label,
}: PaginationProps) {
  const { t } = useTranslation();

  if (count === 0) return null;

  const libelle = label
    ?? t(count > 1 ? 'pm2_shared_pagination.result_plural' : 'pm2_shared_pagination.result', { count });

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', padding: '0.85rem 1.25rem',
      borderTop: `0.5px solid ${FT.border}`, gap: 12, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 12, color: FT.faint }}>
        {count} {libelle}
        {pages > 1 && ` · ${t('pm2_shared_pagination.page_of', { page, pages })}`}
      </span>

      {pages > 1 && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            style={{
              fontSize: 12, padding: '5px 11px',
              opacity: page <= 1 ? 0.45 : 1,
            }}
          >
            {t('pm2_shared_pagination.previous')}
          </button>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => onChange(page + 1)}
            style={{
              fontSize: 12, padding: '5px 11px',
              opacity: page >= pages ? 0.45 : 1,
            }}
          >
            {t('pm2_shared_pagination.next')}
          </button>
        </div>
      )}
    </div>
  );
}