// Routes du groupe VD-03 : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// statut « provisoire » : page générée (balisage du prototype) ; « repris » : écran repris, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'VD-03',
  routes: [
    { route: 'connexion', statut: 'repris', ecran: () => import('./Connexion') },
    { route: 'ouvrir', statut: 'repris', ecran: () => import('./Ouvrir') },
    { route: 'otp', statut: 'repris', ecran: () => import('./Otp') },
    { route: 'kyc', statut: 'repris', ecran: () => import('./Kyc') },
    { route: 'saisie_assistee', statut: 'repris', ecran: () => import('./SaisieAssistee') },
    { route: 'installer', statut: 'repris', ecran: () => import('./Installer') },
    { route: 'lancement', statut: 'repris', ecran: () => import('./Lancement') },
    { route: 'faceid', statut: 'repris', ecran: () => import('./Faceid') },
    { route: 'bienvenue_client', statut: 'repris', ecran: () => import('./BienvenueClient') },
  ],
} satisfies RoutesGroupe
