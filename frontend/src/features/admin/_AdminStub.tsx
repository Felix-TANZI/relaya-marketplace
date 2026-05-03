// frontend/src/features/admin/_AdminStub.tsx
// Composant stub réutilisable pour les pages admin "bientôt disponibles".
// Usage : <AdminStub title="Titre page" description="Ce que fera cette page." icon={IconComponent} />

import { Link } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';

interface AdminStubProps {
  title?:       string;   // prop principale
  titleKey?:    string;   // alias rétrocompat (App.tsx)
  description?: string;
  icon?:        React.ElementType;
  backHref?:    string;
  backLabel?:   string;
}

export default function AdminStub({
  title: titleProp,
  titleKey,
  description = 'Cette fonctionnalité est en cours de développement.',
  icon: Icon  = Construction,
  backHref    = '/admin/dashboard',
  backLabel   = 'Retour au dashboard',
}: AdminStubProps) {
  const title = titleProp || titleKey || 'Page';
  const T = useAdminTheme();

  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] px-4 text-center">

      {/* Icône animée */}
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{
          background: `linear-gradient(135deg, ${T.cardAlt}, ${T.card})`,
          border: `2px solid ${T.border}`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.15)`,
        }}
      >
        <Icon size={36} style={{ color: T.muted }} />
      </div>

      {/* Badge "Bientôt" */}
      <span
        className="inline-block px-3 py-1 rounded-full text-[11px] font-black tracking-widest uppercase mb-4"
        style={{
          background: 'rgba(220,38,38,0.12)',
          color: T.red,
          border: `1px solid rgba(220,38,38,0.25)`,
          letterSpacing: '.1em',
        }}
      >
        Bientôt
      </span>

      {/* Titre */}
      <h1 style={{
        fontFamily: "'Syne',sans-serif",
        fontSize: 26, fontWeight: 800,
        color: T.text, marginBottom: 12, lineHeight: 1.2,
      }}>
        {title}
      </h1>

      {/* Description */}
      <p style={{
        fontSize: 14, color: T.muted, maxWidth: 420,
        lineHeight: 1.7, marginBottom: 32,
      }}>
        {description}
      </p>

      {/* Bouton retour */}
      <Link
        to={backHref}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
        style={{
          background: T.card,
          color: T.text,
          border: `1px solid ${T.border}`,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = T.red;
          (e.currentTarget as HTMLElement).style.color = T.red;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = T.border;
          (e.currentTarget as HTMLElement).style.color = T.text;
        }}
      >
        <ArrowLeft size={15} />
        {backLabel}
      </Link>
    </div>
  );
}