// Routes du groupe PR-09 · Argent (seul fichier de routage que l'agent du groupe touche : METHODE.md). Pour brancher
// un écran repris : « charger » pointe vers lui et « statut » passe à 'repris', puis npm run transcrire (pages.json).
// Pages ajoutées : « releve » (toutes les semaines de versement et le relevé d'une semaine, ?v=) et « trust-journal »
// (journal des événements et des décisions du Trust Score, contestation). Toutes réservées au gérant (VER-06, ARL-06) :
// droit « argent » déclaré dans config/droits.ts.
import type { RoutesGroupe } from '../../config/routes'

const groupe: RoutesGroupe = {
  groupe: 'PR-09',
  routes: [
    { route: 'versements', ecran: 'Versements', titre: "Versements", entete: 'enfant', retour: 'menu', barre: true, statut: 'repris', charger: () => import('./Versements') },
    { route: 'releve', ecran: 'Versements', titre: "Relevés des versements", entete: 'enfant', retour: 'versements', barre: true, statut: 'repris', charger: () => import('./Releve') },
    { route: 'changer-momo', ecran: 'ChangerMoMo', titre: "Numéro de versement", entete: 'enfant', retour: 'versements', barre: true, statut: 'repris', charger: () => import('./ChangerMoMo') },
    { route: 'rapports', ecran: 'Rapports', titre: "Rapports", entete: 'enfant', retour: 'menu', barre: true, statut: 'repris', charger: () => import('./Rapports') },
    { route: 'trust', ecran: 'TrustScore', titre: "Trust Score", entete: 'enfant', retour: 'menu', barre: true, statut: 'repris', charger: () => import('./TrustScore') },
    { route: 'trust-journal', ecran: 'TrustScore', titre: "Journal du Trust Score", entete: 'enfant', retour: 'trust', barre: true, statut: 'repris', charger: () => import('./TrustJournal') },
    { route: 'paliers', ecran: 'Paliers', titre: "Paliers", entete: 'enfant', retour: 'trust', barre: true, statut: 'repris', charger: () => import('./Paliers') },
    { route: 'avis', ecran: 'Avis', titre: "Avis des clients", entete: 'enfant', retour: 'trust', barre: true, statut: 'repris', charger: () => import('./Avis') },
  ],
}
export default groupe
