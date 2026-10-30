# Organisation de l'espace entreprise de livraison

On range par **espaces de travail**, dans l'ordre d'une journée. Un espace correspond à un groupe de la barre latérale (ordinateur), à un bloc du Menu (téléphone) et au premier maillon du fil d'Ariane. Les adresses ne changent pas : seul le rangement change.

| Espace | Contenu (routes) | Accès |
|---|---|---|
| **Aujourd'hui** | Tableau de bord : quatre gros éléments « verbe + nombre » (Accepter, Affecter, Suivre, Traiter), « À faire » et la flotte, puis indicateurs, score et zones (`tableau`) | Onglet 1 · logo · barre latérale |
| **Paquets** | Paquets disponibles (`paquets`), fiche (`paquet`), affectation (`affectation`), colis (`colis`), preuves (`preuves`) | Onglet 2 · tuile du Menu |
| **Missions** | Tournées en direct et carte (`missions`), incidents à valider (`incidents`) | Onglet 3 · tuile du Menu |
| **Livreurs** | Flotte (`flotte`), fiche (`livreur`), ajout (`ajout`), pièces à contrôler (`pieces`), planning et absences (`planning`), véhicules (`vehicules`), emballages (`emballages`) | Onglet 4 · tuile du Menu |
| **Équipe** | Registre du personnel (`equipe`) : l'entreprise employeur (DP-66, DP-67) ; décisions dans l'onglet « Emploi » de la fiche (`livreur?t=emploi`) : contrat et essai, discipline, horaires et zones, congés, fin de contrat, attestation, historique ; pièces (`pieces`), planning (`planning`) | Barre latérale · Menu |
| **Argent** | Règlements du vendredi et retenues (`reglements`), relevés et factures (`releves`), rapports (`rapports`) | Tuile du Menu (Règlements) · Menu |
| **Qualité** | Trust Score (`score`), litiges (`litiges`) | Menu |
| **Mon entreprise** | Le Profil (`profil`) : identité, contrat et documents (`contrat`), état du compte (`etat`), zones et tarifs (`zones`, `sla`), **rôles et accès** (`roles`, nouvelle page : membres et droits), sécurité (`securite`), paramètres (`parametres`, journal, mes données), intégrations, activité de l'équipe | Avatar de l'en-tête · Menu |
| **Aide** | Messages et support (`messages`), Apprendre (`apprendre`), Rechercher partout (`recherche`) | En-tête (ordinateur) · Menu |

**En-tête, partout :** la recherche (ordinateur), les notifications (cloche) et l'avatar, qui ouvre Mon entreprise. Sur ordinateur s'ajoute un bouton Messages ; au téléphone, Messages est la première ligne de l'espace Aide du Menu, faute de place dans l'en-tête. Le panier BelivaY ramène à Aujourd'hui.
**Barre du bas (téléphone) :** Aujourd'hui (libellé « Tableau »), Paquets, Missions, Livreurs. « ☰ » ouvre le Menu.
**Menu :** six tuiles du quotidien avec leur compteur en tête : Paquets à accepter, À affecter, Missions en cours, Livreurs, Incidents, Règlements ; puis la recherche et la carte de l'entreprise (lien vers l'état du compte). Le reste suit en liste, rangé par espace (Paquets, Missions, Livreurs, Argent, Qualité, Mon entreprise, Aide).
**Mon entreprise (Profil) :** l'entreprise et la personne connectée, puis trois actions (Rôles et accès, Sécurité, Aide et support). Viennent ensuite des sections nommées : Entreprise et documents · Rôles et accès · Zones et tarifs · Paiement et versements · Sécurité · Préférences · Messages et aide.

**Ce qui change par rapport à l'existant**
- Les groupes de la barre latérale passent de cinq (Pilotage, Paquets et missions, Flotte, Argent et qualité, Entreprise) aux espaces ci-dessus. Le Planning et Rôles et accès y gagnent une entrée.
- Une nouvelle page, Rôles et accès, réunit les membres, leur rôle, leurs droits et leurs interdits. Avant, ces informations étaient éparpillées entre le Profil (la longue liste « Ce que mon rôle permet ») et Sécurité et équipe. La page Sécurité garde l'accès et les appareils, et s'intitule « Sécurité du compte ».
- Le Profil ne commence plus par une liste de coordonnées et de droits : il commence par l'identité et les priorités, chaque chose étant rangée dans sa section.
- Le Menu montre d'abord les tuiles prioritaires, puis la liste par espace.
- Chaque page commence par ce qu'on y fait : ni date, ni phrase d'explication sous le titre (LECONS-PROTOTYPES.md) ; seul un sous-titre de faits reste sur les fiches (paquet, livreur).
- Inchangés : la logique, les données, les routes existantes, l'API et la palette DP-64.
