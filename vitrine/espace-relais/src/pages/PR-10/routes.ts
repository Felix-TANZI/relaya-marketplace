// Routes du groupe PR-10 · Mon relais (seul fichier de routage que l'agent du groupe touche : METHODE.md). Pour brancher
// un écran repris : « charger » pointe vers lui et « statut » passe à 'repris', puis npm run transcrire (pages.json).
import type { RoutesGroupe } from '../../config/routes'

const groupe: RoutesGroupe = {
  groupe: 'PR-10',
  routes: [
    { route: 'documents', ecran: 'Documents', titre: "Documents", entete: 'enfant', retour: 'menu', barre: true, statut: 'repris', charger: () => import('./Documents') },
    { route: 'formation', ecran: 'Formation', titre: "Formation", entete: 'enfant', retour: 'menu', barre: true, statut: 'repris', charger: () => import('./Formation') },
    { route: 'capacite', ecran: 'Capacite', titre: "Capacité et horaires", entete: 'enfant', retour: 'menu', barre: true, statut: 'repris', charger: () => import('./Capacite') },
    { route: 'equipe', ecran: 'Equipe', titre: "Mon équipe", entete: 'enfant', retour: 'parametres', barre: true, statut: 'repris', charger: () => import('./Equipe') },
    { route: 'parametres', ecran: 'Parametres', titre: "Paramètres", entete: 'enfant', retour: 'menu', barre: true, statut: 'repris', charger: () => import('./Parametres') },
    // Page ajoutée : la zone du relais sur une vraie carte (zones BelivaY de Yaoundé, fond OSM), ses horaires en vigueur
    // et ses fermetures à venir ; ouverte à tout membre.
    { route: 'zone', ecran: 'Parametres', titre: "Ma zone sur la carte", entete: 'enfant', retour: 'parametres', barre: true, statut: 'repris', charger: () => import('./Zone') },
    // Page ajoutée : le compte du membre (kit « compte » des quatre applications).
    { route: 'mon-compte', ecran: 'Parametres', titre: "Mon compte", entete: 'enfant', retour: 'parametres', barre: true, statut: 'repris', charger: () => import('./MonCompte') },
    { route: 'menu', ecran: 'Menu', titre: "Menu", entete: 'enfant', retour: 'accueil', barre: true, statut: 'repris', charger: () => import('./Menu') },
  ],
}
export default groupe
