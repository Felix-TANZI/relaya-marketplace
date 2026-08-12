// frontend/src/features/payments/hooks/useIsFinanceStaff.ts
// L'utilisateur est-il habilite a l'espace financier ?
//
// La verite reste cote SERVEUR : ce hook ne fait qu'eviter d'afficher un
// menu qui menerait a un 403. Masquer un lien n'est pas un controle
// d'acces — c'est de la courtoisie.

import { adminFinanceApi } from '../api/admin-finance.api';
import { useAsync } from './useAsync';

export function useIsFinanceStaff() {
  const { data, loading } = useAsync<boolean>(
    () => adminFinanceApi.taskHealth().then(() => true).catch(() => false),
    [],
  );
  return { allowed: data === true, loading };
}