// Équipe (l'entreprise employeur de ses livreurs, DP-66, DP-67) : le registre du personnel. Les décisions d'emploi se
// prennent dans l'onglet « Emploi » de la fiche du livreur (EQUIPE/Emploi.tsx, branché par ENT-04/Livreur.tsx).
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'EQUIPE',
  routes: [{ route: 'equipe', ecran: 'AJ-E', titre: 'Registre du personnel', statut: 'repris', composant: () => import('./Equipe'), parent: 'flotte' }],
} satisfies RoutesGroupe
