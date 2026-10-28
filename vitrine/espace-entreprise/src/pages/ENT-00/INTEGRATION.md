# ENT-00 — Menu et Profil

- `Menu.tsx` : la page Menu du prototype (defaultMenu) : surtitre, titre, groupes de navigation en cartes de lignes
  (compteurs à droite), mention de BelivaY. Navigation filtrée par rôle (`useNavigation` de la coque).
- `Profil.tsx` (page ajoutée, ouverte par l'avatar) : la personne connectée — identité et coordonnées, ce que le rôle
  permet, raccourcis du compte (Paramètres, sécurité, notifications, messages, état du compte, aide), préférences de
  l'appareil, démonstration « voir l'espace comme », Se déconnecter, version. Distinct du Menu, comme le prototype.
- L'ancien menu sous l'avatar (`composants/MenuProfil.tsx`) est retiré : l'avatar ouvre le Profil.

## Enrichissement (BRIEF-ENRICHISSEMENT, 12 oct.)
- Menu : recherche en tête (→ Rechercher partout), groupes ancrés (`#g-…`, cible du fil d'Ariane), « Outils » (planning,
  activité, apprendre, sécurité et équipe). Le Menu n'est plus un onglet de la barre du bas : « ☰ » l'ouvre et s'allume.
- Profil : droits ET interdits du rôle avec leur raison (`config/droits.ts`) ; réglages regroupés simplement — mon
  compte (sécurité et équipe, mot de passe, mes notifications, équipe et rôles, paramètres), préférences de l'appareil
  (langue, thème, taille du texte, animations réduites, sons, vibrations, données économes), préférences de travail
  (activité, apprendre, raccourcis du clavier), et où chaque réglage est gardé.
