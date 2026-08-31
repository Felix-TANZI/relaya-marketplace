// frontend/src/features/payments/admin/payees/PayeesPage.tsx
// Beneficiaires — qui peut etre paye, et qui ne peut pas.
//
// ─────────────────────────────────────────────────────────────────────────
// LES BLOCAGES SONT LE SUJET
//
// Un partenaire bloque attend son argent sans savoir pourquoi. Cet ecran
// dit ce qui manque — KYC, refroidissement de 72 h apres changement de
// numero, suspension administrative — pour qu'un operateur puisse le
// debloquer plutot que de le decouvrir a l'echec du versement.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';

import { adminFinanceApi } from '../../api/admin-finance.api';
import type { ListParams } from '../../api/admin-finance.api';
import { useAsync } from '../../hooks/useAsync';
import EmptyState from '../../shared/EmptyState';
import FilterTabs from '../../shared/FilterTabs';
import type { FilterTab } from '../../shared/FilterTabs';
import Pagination from '../../shared/Pagination';
import SearchBar from '../../shared/SearchBar';
import { FT } from '../../shared/tokens';
import type { AdminPayee, Paginated } from '../../model/finance.types';
import AdminCard from '../components/AdminCard';
import AdminPageShell from '../components/AdminPageShell';

interface PayeesPageProps {
  basePath?: string;
}

const TYPES: Record<string, string> = {
  vendors: 'VENDOR',
  delivery: 'DELIVERY_COMPANY',
  relay: 'RELAY_POINT',
  all: '',
};

export default function PayeesPage({
  basePath = '/admin/finance',
}: PayeesPageProps) {
  const [filtre, setFiltre] = useState('all');
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);

  const requete = useMemo<ListParams>(() => {
    const params: ListParams = { page };
    const genre = TYPES[filtre] ?? '';
    if (genre) params.payee_type = genre;
    if (recherche) params.q = recherche;
    return params;
  }, [filtre, recherche, page]);

  const { data, loading, error } = useAsync<Paginated<AdminPayee>>(
    () => adminFinanceApi.payees(requete), [JSON.stringify(requete)],
  );

  const lignes = data?.results ?? [];

  const onglets: FilterTab[] = [
    { key: 'all', label: 'Tous' },
    { key: 'vendors', label: 'Vendeurs' },
    { key: 'delivery', label: 'Livraison' },
    { key: 'relay', label: 'Points relais' },
  ];

  return (
    <AdminPageShell
      title="Bénéficiaires"
      subtitle={`${data?.count ?? 0} compte${(data?.count ?? 0) > 1 ? 's' : ''}`}
      backTo={basePath}
      actions={(
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <SearchBar
            value={recherche}
            onChange={(valeur) => { setRecherche(valeur); setPage(1); }}
            placeholder="Nom, code, numéro…"
          />
          <FilterTabs
            tabs={onglets}
            active={filtre}
            onChange={(cle) => { setFiltre(cle); setPage(1); }}
          />
        </div>
      )}
    >
      <AdminCard>
        {loading && (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: FT.faint }}>Chargement…</span>
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon="alert-circle"
            title="Impossible d'afficher les bénéficiaires"
            description={error}
          />
        )}

        {!loading && !error && lignes.length === 0 && (
          <EmptyState icon="users" title="Aucun bénéficiaire" />
        )}

        {!loading && !error && lignes.map((compte, index) => {
          const bloque = compte.blockers.length > 0;
          return (
            <div
              key={compte.payee_code}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 1.25rem',
                borderBottom: index < lignes.length - 1
                  ? `0.5px solid ${FT.border}` : 'none',
              }}
            >
              <span aria-hidden="true" style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                marginTop: 6,
                background: bloque
                  ? FT.amber : compte.is_active ? FT.green : FT.faint,
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13.5, margin: 0,
                  color: 'var(--text-primary, #1A1209)',
                }}>
                  {compte.display_label || compte.payee_code}
                  <span style={{ fontSize: 11.5, color: FT.faint }}>
                    {' · '}{compte.payee_type_label}
                  </span>
                </p>
                <p style={{ fontSize: 11.5, margin: '2px 0 0', color: FT.faint }}>
                  {compte.payee_code}
                  {compte.momo_number_masked
                    && ` · ${compte.momo_number_masked} ${compte.momo_operator}`}
                </p>
                {/* Ce qui empeche le versement, en clair. */}
                {compte.blockers.map((blocage) => (
                  <p
                    key={blocage}
                    style={{
                      fontSize: 12, margin: '4px 0 0', lineHeight: 1.5,
                      color: FT.amberD,
                    }}
                  >
                    {blocage}
                  </p>
                ))}
              </div>

              <span style={{
                fontSize: 11.5, width: 96, textAlign: 'right', color: FT.muted,
              }}>
                {bloque ? 'bloqué' : compte.is_active ? 'actif' : 'inactif'}
              </span>
            </div>
          );
        })}

        {data && (
          <Pagination
            page={data.page}
            pages={data.pages}
            count={data.count}
            onChange={setPage}
            label="bénéficiaire"
          />
        )}
      </AdminCard>
    </AdminPageShell>
  );
}