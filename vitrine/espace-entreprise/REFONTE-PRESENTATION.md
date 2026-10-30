# Refonte de la présentation — espace entreprise
Base : la mise en page du prototype HTML (`02_Prototype_HTML`, `03_Captures`) : même ordre des blocs, même en-tête (date, titre, sous-titre, actions à droite), même tableau de bord. Elle est fusionnée avec les règles ci-dessous, avec les patterns du vendeur, du relais et du livreur, et avec la palette vert sapin DP-64.
**Défauts constatés** (captures 1440 et 390 px, clair et sombre, comparées au vendeur et au point relais) :
- Deux en-têtes par page sur 22 écrans (titre et actions de la coque, puis surtitre et sous-titre de `Tete`) : la date passe tantôt au-dessus, tantôt sous le titre, et l'action se retrouve alignée sur le titre seul. Au téléphone, le titre apparaît jusqu'à trois fois (Affecter un livreur).
- Tableau de bord : 35 tâches à la suite, avec les indicateurs repoussés à 2 500 px. Les boutons de ligne n'ont pas la même largeur, si bien que les échéances et les actions ne tombent pas en colonne.
- Plusieurs boutons principaux par vue (bandeaux de Livreurs). Les liens des panneaux sont orange alors que l'orange est réservé aux alertes. Les boutons des bandeaux sont soulignés comme des liens. Le fil d'Ariane de la barre du haut se chevauche quand il est long (« Paquets etPaquetsdisponibl… »).
- Barres d'outils : la recherche, les filtres et le tri passent à la ligne au hasard. Au téléphone, les filtres inactifs étaient masqués, donc ces actions étaient perdues.
- Zone du pouce : le bouton principal est tronqué (« Ajouter un livr… »). Bandeaux au téléphone : texte écrasé à côté du bouton. Zones des livreurs empilées une par ligne.
**Règles retenues** (`src/styles/presentation.css`, `composants/entete.ts`) :
1. Un seul en-tête : surtitre, titre, sous-titre (78 caractères au plus) à gauche, actions groupées à droite. Le bouton principal se place en dernier. `Tete` dépose son contenu dans l'en-tête de l'écran.
2. Une vue n'a qu'un bouton principal. Un bandeau porte une action secondaire à droite ; au téléphone, l'action passe en dessous, sur toute la largeur.
3. Barre d'outils : la recherche à gauche, puis les filtres ; le tri et les exports sont poussés à droite ; les puces sont sur leur propre ligne. Au téléphone, les filtres restent visibles.
4. Listes d'actions : l'échéance et le bouton sont en colonnes fixes. Sur ordinateur, la liste « À faire » garde une hauteur fixe et défile ; les indicateurs suivent en grille régulière.
5. Le quotidien en tête : sous l'en-tête du tableau de bord, quatre tuiles d'un geste (paquets à accepter, à affecter, missions en cours, incidents à valider), comme les tuiles du vendeur. Ensuite viennent « À faire », puis les indicateurs ; règlements, pièces et paramètres restent dans la barre latérale.
6. Fil d'Ariane : la page courante d'abord, les parents se replient avec des points de suspension. Zone du pouce : le bouton principal prend la place restante.
