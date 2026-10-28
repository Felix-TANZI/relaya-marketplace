// Routes des pages AJOUTÉES du livreur (AJ-L, ENRICHISSEMENTS.md partie 3) : ce qui n'a pas de bloc dans les écrans du
// prototype, comme AJ-A / AJ-B / AJ-P du vendeur. Chaque page porte le code de l'écran du paquet d'où elle s'ouvre.
// DP-66 (une page par besoin) : recherche, profil, sécurité, limites, apprendre et relevés ont rejoint la page qui
// reprend leur besoin (config/routes.ts, REDIRECTIONS) ; reste le planning, en lecture, avec « Prévenir d'une absence ».
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'AJ-L',
  routes: [
    { route: 'planning', page: 'LIV-P05', titre: 'Mon planning', entete: 'enfant', retour: 'aujourdhui', onglet: 'aujourdhui', statut: 'repris', ecran: () => import('./Planning') },
  ],
} satisfies RoutesGroupe
