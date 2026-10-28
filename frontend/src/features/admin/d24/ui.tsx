// frontend/src/features/admin/d24/ui.tsx
// Briques communes des pages d'administration minimum (feuille de route D24) : en-tête, tuiles de compteurs,
// sections et tableaux simples, aux couleurs de l'espace admin (useAdminTheme).

import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';

export function EnTete({ icon: Icon, titre, sousTitre, onRefresh, chargement }: {
  icon: React.ElementType; titre: string; sousTitre: string; onRefresh: () => void; chargement: boolean;
}) {
  const T = useAdminTheme();
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: T.redB, color: T.red }}>
          <Icon size={19} />
        </div>
        <div>
          <h1 className="text-xl font-black" style={{ color: T.text }}>{titre}</h1>
          <p className="text-sm" style={{ color: T.muted }}>{sousTitre}</p>
        </div>
      </div>
      <button onClick={onRefresh} disabled={chargement}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold"
        style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}>
        <RefreshCw size={14} className={chargement ? 'animate-spin' : ''} />
      </button>
    </div>
  );
}

export function Tuile({ libelle, valeur, alerte = false }: { libelle: string; valeur: number; alerte?: boolean }) {
  const T = useAdminTheme();
  const rouge = alerte && valeur > 0;
  return (
    <div className="rounded-2xl p-4" style={{ background: rouge ? T.redL : T.card, border: `1px solid ${rouge ? T.red : T.border}` }}>
      <div className="text-2xl font-black" style={{ color: rouge ? T.red : T.text }}>{valeur}</div>
      <div className="text-xs font-bold mt-1" style={{ color: T.muted }}>{libelle}</div>
    </div>
  );
}

export function Tuiles({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">{children}</div>;
}

export function Section({ titre, children }: { titre: string; children: ReactNode }) {
  const T = useAdminTheme();
  return (
    <section className="rounded-2xl mb-5 overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <h2 className="px-4 py-3 text-sm font-black" style={{ color: T.text, borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
        {titre}
      </h2>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

export function Tableau({ entetes, lignes, vide }: { entetes: string[]; lignes: ReactNode[][]; vide: string }) {
  const T = useAdminTheme();
  if (lignes.length === 0) {
    return <p className="px-4 py-4 text-sm" style={{ color: T.muted }}>{vide}</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          {entetes.map((e) => (
            <th key={e} className="text-left px-4 py-2 text-xs font-bold uppercase" style={{ color: T.muted }}>{e}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lignes.map((cellules, i) => (
          <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
            {cellules.map((c, j) => <td key={j} className="px-4 py-2.5" style={{ color: T.text }}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const dateCourte = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
