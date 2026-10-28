// Refus d'une méthode sans route au kit (« serveur ») ou propre à la démonstration (« demo ») : la raison et la route
// attendue viennent du registre (src/api/routes.ts), une seule vérité avec CONNECTEURS-ADMIN.md.
import { NonDisponible } from '@client/api/erreurs'
import { NonBranche } from './outils'
import { CONNECTEURS_ADMIN, type MethodeAdmin } from './routes'

/** Fonction de remplacement d'une méthode non branchée : rejette NonBranche (ou NonDisponible pour la démonstration). */
export function refuse(cle: MethodeAdmin) {
  return (..._args: unknown[]): Promise<never> => {
    const x = CONNECTEURS_ADMIN[cle]
    return Promise.reject(x.etat === 'demo' ? new NonDisponible(cle, x.route) : new NonBranche(cle, x.route, x.note ?? 'pas de route au kit'))
  }
}
