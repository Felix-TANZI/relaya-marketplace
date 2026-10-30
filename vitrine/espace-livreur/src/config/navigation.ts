// Navigation groupée de l'espace livreur : une seule liste, lue par le menu du profil (téléphone) et par la colonne
// de l'ordinateur. Ordre : ce que le livreur fait sur la route d'abord, ses résultats ensuite, son compte enfin.
// Les incidents et l'aide (SOS) restent à un geste de partout (bouton d'incident de l'en-tête, LIV-UIX-03). DP-66 : une
// entrée par besoin, aucun doublon ; ce qui est contractuel (planning, kit, départ) se voit ou se demande.
export interface EntreeNav {
  route: string
  titre: string
  icone: string
}
export interface GroupeNav {
  titre: string
  entrees: EntreeNav[]
}

export const NAVIGATION: GroupeNav[] = [
  {
    titre: 'Ma journée',
    entrees: [
      { route: 'aujourdhui', titre: 'Aujourd’hui', icone: 'house' },
      { route: 'statut', titre: 'Disponibilité', icone: 'circle-pause' },
      { route: 'planning', titre: 'Mon planning et mes absences', icone: 'calendar-days' },
      { route: 'kit', titre: 'Mon kit d’emballage', icone: 'box' },
      { route: 'cloture', titre: 'Clôture de journée', icone: 'calendar-check' },
    ],
  },
  {
    titre: 'Sur la route',
    entrees: [
      { route: 'tournee', titre: 'Ma tournée', icone: 'route' },
      { route: 'navigation', titre: 'Navigation', icone: 'navigation' },
      { route: 'appel', titre: 'Appel masqué', icone: 'phone-call' },
      { route: 'incident', titre: 'Signaler un incident', icone: 'triangle-alert' },
      { route: 'synchronisation', titre: 'Synchronisation', icone: 'cloud-upload' },
    ],
  },
  {
    titre: 'Mes résultats',
    entrees: [
      { route: 'historique', titre: 'Historique et preuves', icone: 'history' },
      { route: 'activite', titre: 'Mes gains', icone: 'chart-column' },
      { route: 'trust', titre: 'Mon Trust Score', icone: 'award' },
    ],
  },
  {
    titre: 'Mon compte',
    entrees: [
      { route: 'moi', titre: 'Ma fiche, pièces et véhicule', icone: 'id-card' },
      { route: 'notifications', titre: 'Notifications', icone: 'bell' },
      { route: 'reglages', titre: 'Réglages', icone: 'settings' },
      { route: 'aide', titre: 'Aide et SOS', icone: 'life-buoy' },
    ],
  },
]
