// frontend/src/features/payments/shared/EmptyState.tsx
// Un espace vide, pas une erreur.
//
// Le premier jour, tout est a zero. Un partenaire fraichement approuve n'a
// aucun reglement — le lui dire comme un probleme serait decourageant.

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
}

export default function EmptyState({
  title, description, icon = 'wallet',
}: EmptyStateProps) {
  return (
    <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
      <i
        className={`ti ti-${icon}`}
        aria-hidden="true"
        style={{ fontSize: 28, color: 'var(--text-muted, #B4B2A9)' }}
      />
      <p style={{
        fontSize: 14, margin: '12px 0 0',
        color: 'var(--text-primary, #1A1209)',
      }}>
        {title}
      </p>
      {description && (
        <p style={{
          fontSize: 12.5, margin: '5px auto 0', maxWidth: 340,
          lineHeight: 1.6, color: 'var(--text-secondary, #7C6E5A)',
        }}>
          {description}
        </p>
      )}
    </div>
  );
}