// Routes du groupe PR-05 · Guichet 2 (seul fichier de routage que l'agent du groupe touche : METHODE.md). Pour brancher
// un écran repris : « charger » pointe vers lui et « statut » passe à 'repris', puis npm run transcrire (pages.json).
import type { RoutesGroupe } from '../../config/routes'

const groupe: RoutesGroupe = {
  groupe: 'PR-05',
  routes: [
    { route: 'retrait', ecran: 'Retrait', titre: "Retrait par le client", entete: 'racine', barre: true, onglet: 'retrait', statut: 'repris', charger: () => import('./Retrait') },
    // VAGUE n° 7 : la file du comptoir (clients attendus, colis dans l'ordre des étagères, scan rapide).
    { route: 'file', ecran: 'File', titre: "File du comptoir", entete: 'enfant', retour: 'retrait', barre: true, onglet: 'retrait', statut: 'repris', charger: () => import('./File') },
    { route: 'pin-remise', ecran: 'PinRemise', titre: "PIN de remise", entete: 'enfant', retour: 'retrait', barre: true, statut: 'repris', charger: () => import('./PinRemise') },
    { route: 'erreurs', ecran: 'Erreurs', titre: "États d’erreur", entete: 'enfant', retour: 'retrait', barre: true, statut: 'repris', charger: () => import('./Erreurs') },
  ],
}
export default groupe
