# Disposition des écrans : tablette et ordinateur

Spécification décidée, 4 octobre 2026. Elle dit où va chaque bloc et chaque bouton du site client BelivaY quand
l'écran est plus large qu'un téléphone. Elle ne change ni le contenu, ni les règles de calcul, ni le style : couleurs,
jetons (`--or`, `--card`, `--sand`…), composants, thème clair et sombre et dessins d'en-tête de page restent ceux du site.
Seules changent la place et la largeur des blocs.

Sources lues :
- les 32 captures du dossier officiel `Work définitif pro — 6 interfaces/2 — BelivaY Espace client — paquet
  développeur/capture dekstop inspiration ` (le nom finit par une espace) : les 30 du 4 octobre (23 h 29 à
  23 h 34), qui montrent le belivay.com actuel en ordinateur, plus `Screenshot 2026-09-29 at 8.40.10 AM.png` et
  `Screenshot 2026-10-03 at 6.26.47 PM.png`. Elles donnent le squelette ;
- la coque (`src/composants/coque.tsx`, `BarreBas.tsx`, `MenuProfil.tsx`, `Feuille.tsx`, `BandeauDemo.tsx`,
  `Animations.tsx`), les routes (`src/config/pages.ts`, `src/pages/*/construits.json`, `pages-site.json`), les
  141 écrans (`src/pages/CL-xx/*.tsx`, `diaspora/`, `profil/`, `Menu.tsx`), les styles (`prototype.css`,
  `site.css`, `animations.css`, `styles/ecrans/*.css`) et `PAGES-LISTE.md`.

---

## 0. Les décisions en bref

1. **Cinq paliers.** Téléphone < 600, grand téléphone 600–767, tablette portrait 768–1023, tablette paysage et
   petit ordinateur 1024–1199, ordinateur 1200–1599, grand écran ≥ 1600.
2. **Un seul en-tête de site dès 768 px.** Il est collant et regroupe le logo, la recherche (un vrai champ),
   les notifications, le panier, les favoris et le compte. Les en-têtes enfants deviennent une **barre de titre de
   page** dans le contenu, avec le même balisage `.hd-sub` et un fil d'Ariane.
3. **La barre du bas en verre reste jusqu'à 1023 px** : c'est une tablette tenue en main. Elle devient une capsule
   flottante centrée de 520 px au plus. **Dès 1024 px, elle laisse la place à une barre de navigation sous
   l'en-tête.** La bulle de verre y devient la capsule qui glisse d'un lien à l'autre.
4. **Gabarits.** Sept gabarits de page, posés par l'écran : catalogue (colonne Catégories, contenu, colonne
   droite), compte (menu latéral), maître-détail, contenu et aside collant, centré étroit, arrivée, page web
   publique.
5. **Les feuilles du bas deviennent des modales centrées** dès 768 px, ou des **tiroirs latéraux** (filtres,
   relais) dès 1024 px. Elles gardent la même adresse (`?sheet=`), le même contenu, Échap et le voile.
6. **Grilles produits par largeur de colonne**, avec des requêtes de conteneur : 2, 3, 4, 5 puis 6 colonnes, quelle
   que soit la présence des colonnes latérales.
7. **Récapitulatifs et actions d'achat collants à droite.** Concerne le panier, le paiement, la fiche produit, le
   détail d'une commande et le suivi d'un litige. Les barres fixées en bas de l'écran (`.fp-bar`, `.cl07-bar`,
   `.cl09-bar`, `.cl11-bar`, `.buybar`) disparaissent dès 1024 px, car leur bouton est dans l'aside.
8. **Maître-détail.** Commandes, messagerie, factures, listes d'envies, pages légales, paniers des proches.
9. **Pied de page dès 768 px**, absent sur téléphone, comme aujourd'hui.
10. **Rien ne disparaît.** Chaque fonction du téléphone a sa place à chaque palier. Pas de second site : mêmes
    écrans, mêmes classes, des media queries, un fichier de styles en plus et quelques variantes de coque.

---

## 1. Ce que montrent les captures : le squelette, page par page

Les captures montrent le belivay.com actuel, en sombre, à environ 2 000 px de large. On n'en garde que
l'emplacement des blocs.

| Capture | Page | Squelette relevé |
|---|---|---|
| 11.29.17, 11.30.39, 11.30.48 | Accueil (visiteur) | **Bandeau de confiance** d'une ligne en tête, centré, avec un message qui tourne (remboursement 7 jours, points fidélité, vendeurs certifiés, livraison 24–72 h). **En-tête** : logo à gauche, recherche large (entonnoir, champ, micro, loupe orange), puis langue FR, thème, cloche, panier, favoris avec pastille, « Guide », « Vendre sur BelivaY », « Se connecter » et le bouton plein « S'inscrire ». **Barre de navigation** en dessous : Accueil (souligné orange), Promos (pastille −25 %), Commandes, Favoris, Compte, Sélection, Abonnements, À propos. **Trois colonnes** : à gauche « Catégories » (≈ 280 px, repliable par « « », liste d'univers avec icône et nombre, « Tout voir » allumé) ; au centre le carrousel (photo, étiquette d'univers, titre, sous-titre, flèches, points), puis les pastilles d'univers défilantes, la rangée de chiffres, la bannière promo à compte à rebours et « Disponible près de vous » (rail avec flèches) ; à droite (≈ 320 px) « Flash Deals » (compte à rebours, carte produit en carrousel, prix flash, jauge, « Voir le produit » et flèches), puis quatre garanties en 2 × 2 (Escrow, Retour, Support, Premium). Bouton rond de l'assistant en bas à droite. |
| 11.30.48, 11.30.52 | Accueil, suite | « Trier : Pertinence » ; « Produits populaires » en **rail horizontal de 6 cartes** sur 2 rangées avec barre de défilement ; « Nouveaux Arrivages » (rail) ; « Catalogue de l'accueil » en grille de 4. Bouton « remonter » rond au-dessus de l'assistant. Les colonnes gauche et droite restent collantes. |
| 11.30.55, 11.30.58 | Accueil, bas | Grille de 4 cartes, bannières pleine largeur intercalées (Premium violet, Sélection Premium dorée), « Voir plus d'articles » centré à la fin (pas de défilement infini sans fin). |
| 11.31.12 | Promotions | Pas de colonnes latérales. Bannière « Promotions du moment » pleine largeur avec compte à rebours, bandeau du code de bienvenue (« Copier »), quatre tuiles d'offres en ligne, pastilles d'univers, « Produits en promotion » en grille. Largeur ≈ 1 730 px. |
| 11.31.40 → 11.31.56 | Mes commandes (connecté) | L'en-tête remplace les boutons de connexion par l'avatar, le nom et un chevron. Contenu centré ≈ 1 360 px : carte de titre « Mes commandes » (10 commandes, 8 à payer), bandeau orange « Paiement en attente », « Livraisons en cours » en **deux colonnes** (carte à gauche, liste des commandes en livraison à droite avec « Suivre en détail »), onglets filtres comptés, puis une carte pleine largeur par commande : articles, « Reste à payer » à gauche et Annuler, Reprendre le paiement, Détails à droite. |
| 11.32.04 → 11.32.22 | Détail d'une commande | « ← Retour à mes commandes », carte de titre (« Suivi de commande », numéro, date, pastilles d'état à droite). **Deux colonnes** (≈ 8/12 et 4/12) : à gauche le suivi (carte, chronologie), trois cartes « Preuves », « Point relais », « Litige protégé », « Contacter le livreur », puis « Articles commandés » ; à droite la carte orange « Reste à payer » avec jauge, « Reprendre le paiement », « Cycle de vie du paiement », la note d'annulation automatique, « Résumé », « Livraison », « Paiement sécurisé ». **Pied de page** en 4 colonnes (marque et réseaux, liens rapides, support, contact avec WhatsApp), puis la ligne des droits et des liens légaux. |
| 11.32.34, 11.32.44 | Annulation | **Modale centrée** (≈ 560 px) sur fond flouté : motifs en grandes lignes, « Garder la commande », puis l'écran de réassurance et « Continuer l'annulation ». |
| 11.32.54, 11.32.57 | Compte | Carte de profil pleine largeur (avatar, nom, e-mail, membre depuis, ville, palier, « Modifier »). **Menu latéral** à gauche (≈ 280 px) : Principal (Vue d'ensemble, Commandes, Favoris, Messages, Fidélité), Compte (Profil, Adresses, Paiements, Historique, Parrainage, Sécurité, Compte BelivaY, Réglages), Espace vendeur, Déconnexion, puis un encadré Accessibilité (apparence, taille du texte, mode daltonien). À droite, « Bonjour, Franck » : suivi de la commande en cours avec étapes, 4 compteurs, fidélité et notifications sur 2 colonnes, commandes récentes, support, panier, adresse, profil à compléter. |
| 11.33.19 → 11.33.24 | Abonnements | Titre centré, carte « Vous êtes membre » (2 colonnes de faits), puis **deux colonnes** : offre (mensuel ou annuel, prix, avantages sur 2 colonnes) et calculateur d'économies. « Tous les avantages » en grille de 3, comparatif en tableau pleine largeur, gestion de l'abonnement (moyen, renouvellement : bouton à droite de chaque ligne). |
| 11.33.28 → 11.33.32 | À propos | Bannière centrée, 4 chiffres en ligne, mission et escrow en 2 colonnes, valeurs en 3 colonnes, présence en 6 colonnes, documents légaux en accordéons, « Contactez-nous » centré avec trois boutons. |
| 11.33.41, 11.33.46 | Menu du profil | **Menu déroulant** sous l'avatar (≈ 350 px), en-tête orange (photo, nom, e-mail), entrées groupées (compte, mon activité, paramètres, plus) avec pastilles et chevrons, défilement interne, « Déconnexion » en rouge collé en bas. |
| 29 sept. 8.40.10 | Accueil connecté, menu du profil ouvert | Même squelette en trois colonnes. La colonne Catégories montre **un nombre sur chaque univers et sur « Tout voir »**. Le menu du profil se déroule **par-dessus la colonne droite** sans la pousser. Le carrousel porte un message de confiance (« Achetez en toute confiance… », pays CEMAC). Sous la bannière promo : « Produits en vedette » avec son sous-titre. Nous retenons : les nombres dans la colonne (seulement s'ils sont vrais) et le menu posé par-dessus, sans voile. |
| 3 oct. 6.26.47 | **Notre site actuel** dans une fenêtre large (localhost) | Le site est aujourd'hui une colonne de téléphone (≈ 490 px) centrée, avec deux grands vides de chaque côté. On y voit l'en-tête racine (bandeau, menu, logo « Tout près de toi », cloche, panier, avatar, recherche), le carrousel, les pastilles, **le rail « Ventes flash » dans le flux** (compte à rebours, vraie fin, vrai stock), « À la une · Près de ton relais », la carte flottante « 3 colis t'attendent au relais · Mon code », le bouton remonter et la barre du bas à 5 onglets. C'est le point de départ. Chaque bloc listé a sa place décidée au § 5.1, et le rail Ventes flash devient le bloc Flash Deals de la colonne droite dès `pc`. |
| 11.34.18 | Accueil, colonne repliée | La colonne Catégories devient un **rail d'icônes** (≈ 72 px, « » » pour la rouvrir) ; le contenu central s'élargit. |

Ce que nous en retenons :
- trois niveaux en tête : bandeau de confiance, en-tête, navigation ;
- colonnes latérales collantes sur les pages de catalogue seulement ;
- contenu centré sur les pages de tâche ;
- deux colonnes avec aside à droite sur les détails ;
- menu latéral sur le compte ;
- modales centrées ;
- menu déroulant du profil ;
- pied de page.

Ce que nous écartons, parce que nos règles le refusent :
- l'entonnoir dans la recherche, qui ne s'ouvre qu'après une recherche (CRE-37) ;
- les chiffres décoratifs (15 240 produits…), car seuls les chiffres vrais sont affichés ;
- « CURATED » et « SPONSO » (DP-44) ;
- « Mode daltonien », absent de nos réglages : on n'invente pas de fonction.

---

## 2. Paliers, largeurs, marges, grilles

### 2.1 Points de rupture

| Nom | Largeur | Appareil type | Navigation | Coque |
|---|---|---|---|---|
| `tel` | < 600 | téléphone | barre du bas en verre | telle qu'aujourd'hui (colonne de 430 px au plus, centrée) |
| `tel-l` | 600–767 | grand téléphone, petite tablette, fenêtre étroite | barre du bas en verre | coque du téléphone en pleine largeur ; contenu centré à 640 px au plus |
| `tab` | 768–1023 | tablette portrait | barre du bas en verre, capsule centrée de 520 px au plus | en-tête de site compact (une ligne), barre de titre de page, pied de page |
| `tab-l` | 1024–1199 | tablette paysage, petit portable | barre de navigation sous l'en-tête ; plus de barre du bas | en-tête de site complet, gabarits à colonnes, colonne Catégories en rail |
| `pc` | 1200–1599 | ordinateur | barre de navigation | tout ; colonne droite de l'accueil |
| `pc-xl` | ≥ 1600 | grand écran | barre de navigation | tout ; colonne Catégories dépliée par défaut, conteneurs élargis |

Dans le code, les valeurs sont écrites une fois, en tête de `src/styles/larges.css`. Le hook `useEcran()`
(`src/composants/ecran.ts`, `matchMedia`) renvoie le palier, et `html[data-ecran="tel|tel-l|tab|tab-l|pc|pc-xl"]`
le pose pour le CSS. Les media queries s'écrivent toujours en `min-width`, du plus petit au plus grand.

Hauteur : sous 700 px de haut (portable 1 366 × 650, tablette paysage), le bandeau de confiance se masque dès que
la page défile. Les asides collants passent en `position:static` si leur contenu dépasse la hauteur visible :
on mesure, on ne coupe jamais.

### 2.2 Conteneurs (largeur maximale du contenu)

| Conteneur | Classe | `tab` | `tab-l` | `pc` | `pc-xl` | Usage |
|---|---|---|---|---|---|---|
| Large | `.l-large` | 100 % | 100 % | 1 440 | 1 760 | accueil, catégories, listes, recherche, promotions, sélection, ventes flash |
| Moyen | `.l-moyen` | 100 % | 100 % | 1 200 | 1 280 | commandes, détail, compte, abonnements, listes d'envies, diaspora, modules |
| Étroit | `.l-etroit` | 640 | 680 | 720 | 720 | parcours d'une tâche : états de paiement, annulation, code, signalement, formulaires |
| Lecture | `.l-lecture` | 680 | 720 | 760 | 760 | textes longs : légal, FAQ, « tout savoir », conditions |

Le bandeau de confiance, l'en-tête, la barre de navigation et le pied de page s'étirent sur toute la largeur.
Leur contenu est aligné sur le conteneur large (1 440 / 1 760).

### 2.3 Marges latérales (gouttières de page)

| Palier | Marge | Écart entre colonnes | Écart entre cartes d'une grille |
|---|---|---|---|
| `tel`, `tel-l` | 16 (inchangé) | — | 10 (inchangé) |
| `tab` | 24 | 20 | 14 |
| `tab-l` | 28 | 24 | 16 |
| `pc` | 32 | 24 | 18 |
| `pc-xl` | 48 | 32 | 20 |

Espacement vertical entre sections : 16 (téléphone, inchangé), 24 (tablette), 32 (ordinateur).

### 2.4 Grille de mise en page

Grille de 12 colonnes (`.l-grille`) dès `tab-l`, avec l'écart de colonnes du tableau. Les gabarits (§ 4) sont
des gabarits nommés (`grid-template-areas`) avec des largeurs fixes pour les colonnes latérales et `minmax(0,1fr)`
pour le centre. Une colonne centrale ne descend jamais sous 560 px : si elle descendait plus bas, la colonne
latérale la moins utile se replie (§ 4.1).

### 2.5 Grilles de produits (cartes `.h0-c`, `.cl04-*`, cartes du catalogue)

Le nombre de colonnes dépend de **la largeur de la colonne qui contient la grille**, pas de celle de la fenêtre.
On utilise une requête de conteneur : `container-type:inline-size` sur la colonne centrale de chaque gabarit.

| Largeur de la colonne | Colonnes | Cible de carte |
|---|---|---|
| < 560 | 2 | inchangé (téléphone) |
| 560–799 | 3 | ≈ 180–260 |
| 800–1 039 | 4 | ≈ 190–255 |
| 1 040–1 279 | 5 | ≈ 200–250 |
| ≥ 1 280 | 6 | ≈ 205–240 |

Les rails horizontaux (`.h0-row`, `.defile`) gardent le défilement horizontal avec accroche (`scroll-snap`). Ils
montrent le même nombre de cartes que la grille, plus un quart de carte qui dépasse pour signaler la suite. Dès
`tab-l`, ils ont des flèches précédent et suivant aux bords. Les flèches apparaissent au survol et restent
atteignables au clavier. La barre de défilement est fine et visible.

---

## 3. La coque, appareil par appareil

### 3.1 Principe technique de la coque

- `#app` : `max-width:430px` disparaît dès `tel-l` (100 %). Le fond de page (`--sand` et `--page-halos`) couvre
  toute la fenêtre.
- **`main` reste l'unique zone qui défile, à tous les paliers.** Le défilement à tirer, le bouton « remonter »
  (`data-act=top`), le jet au panier (`Animations.tsx`), l'arrêt du défilement sous une feuille et les tests
  reposent tous sur `#app main`. On n'y touche pas. Ce qui change dès `tab` :
  - la barre de défilement devient visible et fine (`scrollbar-width:thin`) ;
  - `main` reçoit `tabindex="-1"` et le focus à chaque changement de route, pour que Espace, Page suivante et les
    flèches fassent défiler la page.
- La marge haute de `main` est aujourd'hui écrite en ligne (`calc(var(--sb) + ${margeHaute}px)`). Elle devient
  `calc(var(--sb) + var(--hd-h, ${margeHaute}px))`. Dès `tab`, `larges.css` fixe `--hd-h` à la hauteur de
  l'en-tête de site, soit 64 en `tab` et 156 dès `tab-l` (bandeau 32, ligne 68, navigation 56 : capsule de verre de 46). Il n'y a
  rien à changer écran par écran.
- Les barres et éléments posés en `position:absolute` sur le bas de `#app` restent à leur place : `#app` fait la
  hauteur de la fenêtre. Ils reçoivent une largeur et un alignement par palier (§ 3.12). Concerne `.fp-bar`,
  `.buybar`, `.cl07-bar`, `.cl09-bar`, `.cl11-bar`, `.h0-float`, `.h0-up`, les toasts, `.veil`, `.sheet` et
  `.dock`.
- La coque garde trois formes d'en-tête : `racine`, `enfant` et `aucun`/`propre`. Dès `tab`, `racine` et
  `enfant` affichent tous deux **l'en-tête de site** (§ 3.2) ; `enfant` ajoute en plus la barre de titre de page
  (§ 3.4). `aucun` (lancement, ouverture, galerie) et `propre` (pages web publiques) gardent leur forme (§ 5.14).

### 3.2 En-tête de site (dès `tab`)

Nouveau composant `EnTeteSite` dans `coque.tsx`. Il réutilise les éléments de `EnTeteRacine` (`.hd-strip`,
`.hd-brand`, `.ibtn`, `.bdg`, `.hd-av`, `.srch`), avec leurs classes, leurs icônes, leurs badges et leur verre
`.glass`. Il est collant en haut de `#app`, au-dessus de `main` (z-index 30, comme aujourd'hui).

**Ordre exact, de gauche à droite.**

Rangée 1, le bandeau de confiance `.hd-strip` (dès `tab-l`, 32 px) : les cinq messages vrais de CDS-24 qui tournent
(paiement sécurisé MoMo et escrow, vendeur payé après le retrait, relais dans N quartiers, retrait offert dès N F,
retour gratuit si problème validé), centrés. Ce sont les messages actuels, sans changement. En `tab`, il n'y a pas
de bandeau : la ligne serait trop chargée et les messages passent dans le pied de page.

Rangée 2, la ligne principale (68 px dès `tab-l`, 64 en `tab`) :
1. **Logo** `.hd-brand` (logo et « Tout près de toi »), vers l'accueil. 168 px de large réservés.
2. **Recherche** `.srch`. C'est un **vrai champ** dès `tab` (sur téléphone, c'est un lien vers `/recherche`). Il
   prend la place libre, entre 360 et 640 px. Il contient la loupe, le champ « Rechercher un produit, une
   marque… », le micro (recherche vocale, si le navigateur la permet) et le bouton orange « Rechercher ». Pas
   d'entonnoir (CRE-37). Le comportement est décrit au § 5.3.
3. Espace flexible.
4. **Langue** FR · EN : bouton texte avec un globe, même action que `set-lang`. Dès `pc` seulement ; en dessous,
   la langue est dans le menu du profil et dans le pied de page.
5. **Thème** : soleil ou lune, même action que `data-act=theme`. Dès `pc`.
6. **Notifications** : cloche et badge, qui ouvre le **panneau des notifications** (§ 3.8). Sans compte, le lien
   mène à la connexion.
7. **Panier** : chariot et badge, vers `/panier`. C'est la cible du jet au panier (§ 6.6).
8. **Favoris** : cœur et badge, vers `/sauvegardes`. Dès `tab-l`. Sur tablette portrait, il est dans la barre du bas.
   (Ordre panier puis favoris : celui des captures, voir l'encadré « Les captures priment » ci-dessous.)
9. **Compte**. Connecté : **avatar de 36 px, prénom et chevron** (le prénom dès `pc`, l'avatar seul en dessous),
   qui ouvre le menu du profil (§ 3.7). Visiteur : dès `pc`, lien texte « Vendre sur BelivaY » ; puis lien texte
   « Se connecter » et bouton plein « Créer un compte », tous deux vers `/connexion` (le second avec
   `?mode=inscription`) ; en `tab`, l'icône `user-round` seule (`.hd-av.guest`).

> **Les captures priment (décision du porteur, 5 octobre 2026).** Sur ordinateur, l'ordre général des captures
> d'inspiration l'emporte sur ce document, amélioré avec notre design sans le changer : Catégories listées dans la
> colonne de gauche (dépliée par défaut, § 3.5), Flash Deals dans la colonne de droite (§ 3.6), barre de
> navigation dans l'ordre des captures (§ 3.3), icônes de l'en-tête dans l'ordre des captures (panier puis favoris),
> « Vendre sur BelivaY » dans l'en-tête pour un visiteur, pages du compte en carte d'identité pleine largeur puis
> menu à gauche groupé comme sur les captures (§ 5.11). Les points de ce document qui s'en écartaient ont été
> corrigés le 5 octobre (§ 3.2, 3.3, 3.5, 5.11).

Le lien « Menu » (hamburger, `/menu`) disparaît de l'en-tête dès `tab-l` : tout ce qu'il ouvre est dans la barre de
navigation, le menu du profil et le pied de page. En `tab`, il reste, à gauche du logo.

« Vendre sur BelivaY » va dans l'en-tête pour un visiteur, comme sur les captures (dès `pc`) ; pour un client
connecté, il est à droite de la barre de navigation (§ 3.3), parce que c'est une action secondaire pour un acheteur. « Guide » devient « Aide », dans le pied de page et le menu du profil, et
« Comment ça marche » va dans la navigation de l'accueil (§ 5.1).

Rangée 3, la barre de navigation : voir § 3.3.

Sur un compte diaspora (DP-54), la devise d'affichage s'ajoute à côté de la langue (« EUR »), avec la même action
que dans Réglages.

### 3.3 Navigation principale

**Décision : barre du bas jusqu'à 1023 px, puis barre de navigation horizontale sous l'en-tête. Pas de rail latéral.**

Pourquoi :
- sur une tablette tenue en main (portrait), le pouce atteint le bas, et la barre du bas est le geste appris sur
  le téléphone ; on la garde, flottante et centrée ;
- dès 1024 px, la souris et le clavier dominent ; une barre du bas sur un grand écran éloigne la navigation du
  contenu et du regard ;
- un rail latéral gauche entrerait en conflit avec la colonne Catégories et le menu du compte, qui occupent déjà
  la gauche. La barre horizontale est aussi le modèle relevé sur les captures, donc celui que les clients
  connaissent.

**`tab` (768–1023) : barre du bas.** `nav.dock` garde son balisage, ses cinq onglets, ses badges et sa bulle de
verre. Elle devient une capsule flottante : `left:50%`, translation de −50 %, largeur `min(520px, 100% - 48px)`, à
20 px du bas plus la zone sûre, avec le rayon de capsule du prototype. Les onglets s'élargissent, et la bulle se
mesure toute seule (`mesurer()` lit les `offsetLeft`).

**Dès `tab-l` (≥ 1024) : barre de navigation `nav.hd-nav`**, sous la ligne principale, 48 px, liens icône et
texte, ordre des captures (Accueil, Promos, Commandes, Favoris, Compte, Sélection, Abonnements), avec nos liens en
plus (« À propos » des captures n'a pas de page chez nous : il n'est pas inventé) :
1. Accueil (`house`)
2. Catégories (`layout-grid`) ; la flèche voisine ouvre le **méga-menu** (§ 6.4), le survol l'ouvre après 150 ms ;
   le clic sur le lien mène à `/categories`
3. Promotions (`tag`), avec une pastille de la plus forte remise vraie (« −34 % »), calculée comme dans Promotions
4. Mes commandes (`package`), avec un badge si un paiement attend
5. Sauvegardés (`heart`), vers `/sauvegardes` (« Favoris » des captures)
6. Compte (`user-round`), vers `/compte` (allumé sur les pages du compte)
7. Sélection (`star`)
8. Premium (`gem`), vers `/abonnements` (ou `/mon-abonnement` pour un abonné), si FF-ABONNEMENT est ouvert
9. Ventes flash (`zap`), si FF-FLASH est ouvert, avec une pastille du compte à rebours le plus proche
10. Listes d'envies (`gift`), si FF-LISTE-ENVIES est ouvert ; Espace diaspora (`globe`) à la place, pour un compte
    diaspora

Espace flexible, puis à droite :

11. **Pastille du relais** `.rly` : « Retrait à Mvog-Ada · Changer ». Elle est déjà dans le balisage du site et
    ouvre le choix du relais. Sous 1600 px, elle ne garde que l'icône et le quartier.
12. « Vendre sur BelivaY », lien texte vers `/devenir-vendeur` (client connecté ; un visiteur l'a dans l'en-tête).

Correspondance avec les onglets du téléphone : Accueil (1), Catégories (2), Sauvegardés (5) et Compte (6) ont leur
lien ; Panier et Sauvegardés sont aussi des icônes de l'en-tête. Le compte passe aussi par l'avatar et son menu. Un module fermé (CFS-02) n'a pas de lien, comme sur le téléphone. Le lien actif porte
`aria-current="page"` et l'indicateur de verre (§ 6.5).

Dès 1600 px, toute la barre tient sur une ligne. De 1024 à 1199, les libellés trop longs se raccourcissent :
« Listes d'envies » devient « Listes », « Mes commandes » devient « Commandes ». Si la barre déborde encore, les
derniers liens passent dans un bouton « Plus ▾ » (repli mesuré, jamais coupé) : ce sont nos liens en plus (Ventes
flash, Listes d'envies) et, au besoin, Premium et Sélection.

### 3.4 Barre de titre de page (en-têtes enfants, dès `tab`)

Les écrans à en-tête `enfant` affichent l'en-tête de site, puis, **en tête du contenu** (premier enfant de
`main`, non fixé), leur barre de titre :
- **Fil d'Ariane** (dès `tab-l`), 13 px, couleur `--ink-3`. Il est construit avec la chaîne des parents
  (`NAVIGATION[route].retour`, en remontant), par exemple « Accueil › Mon compte › Mes adresses ». Le dernier
  élément n'est pas un lien. Un `nav` avec `aria-label="Fil d'Ariane"`.
- **Ligne de titre** `.hd-sub`, avec le même balisage : le lien retour (chevron et nom du parent écrit dès
  `tab-l`, « ‹ Mes commandes »), le `h1` et son `small` (sous-titre), puis à droite l'élément de droite. Le chariot
  vers l'accueil (`droite: 'accueil'`) est masqué dès `tab`, car le logo de l'en-tête de site joue ce rôle. Le
  panier (`droite: 'panier'`) est masqué dès `tab`, car il est dans l'en-tête. Une action propre à l'écran
  (`droite: 'propre'`, le bouton FR · EN, un réglage…) reste à droite du titre.
- La barre prend la largeur du conteneur de la page. Elle n'a pas de verre : elle est sur le fond de page.

Le panier (`cl07-hd`) garde son bandeau de réassurance (`BandeauPanier`), placé au-dessus du titre, dans la
largeur de la page.

Les **dessins d'en-tête de page** restent intouchables : bandeaux de nuit de CL-14, photos d'arrivée de CL-03,
bannières de catégories, carte orange du paiement en attente, `.card.vedette`… Ils ne changent ni de forme, ni de
couleur, ni de typographie. Ils prennent la largeur du conteneur. Leur hauteur peut croître, au plus jusqu'à 1,4
fois la hauteur du téléphone, pour que les photos ne s'étirent pas. Leur texte reste dans une colonne de 640 px
au plus.

### 3.5 Colonne Catégories (gauche)

Elle n'existe que dans le **gabarit catalogue** (§ 4.1) : accueil, catégories, liste d'un univers, résultats de
recherche, promotions, sélection, ventes flash.

| Palier | État |
|---|---|
| `tel` → `tab` | absente (pastilles d'univers `.h0-pills` dans la page, comme aujourd'hui) |
| `tab-l` | rail de 72 px : icônes des univers, info-bulle au survol et au focus, bouton « » » pour déplier en panneau par-dessus le contenu, fermé par Échap ou un clic dehors |
| `pc` | **dépliée en 264 px par défaut, comme sur les captures**, repliable en rail de 72 px (« « ») ; si le contenu passait sous 560 px (1 200 px avec la colonne droite), elle reste en rail, et dépliée à la main elle se pose par-dessus |
| `pc-xl` | dépliée en 264 px par défaut, repliable en rail |

Le choix déplié ou replié est gardé dans `localStorage` (`blv-colonne-cat`), dans un try/catch, comme confort.
Contenu, de haut en bas :
1. le titre « Catégories » (`.kick`) et le bouton plier/déplier « « » ;
2. « Tout voir » (allumé sur l'accueil) ;
3. les **dix univers**, ceux choisis à l'arrivée d'abord (Intérêts, CL-03), avec icône, nom et nombre réel de
   produits (lu dans le catalogue, masqué à 0). Le survol d'un univers (déplié) montre ses sous-catégories dans un
   panneau flottant à droite, comme le méga-menu (§ 6.4). Un clic ouvre l'univers (`/categories?u=…` depuis
   l'accueil, `/liste?cat=…` depuis une liste) ;
4. séparateur, puis **« Mon relais »** : nom, quartier, ouvert jusqu'à…, « Changer » ;
5. le rappel du **retrait offert** : seuil et prix calculés par la formule du panier, comme dans Catégories.

La colonne est collante (16 px sous le haut du contenu de `main`, c'est-à-dire sous l'en-tête : `top: var(--colle)`), avec un défilement interne si elle dépasse. C'est un `aside`
avec `aria-label="Catégories"`. Sur la page Catégories elle-même, elle **est** la liste des univers de la page,
non dupliquée (§ 5.2).

### 3.6 Colonne droite contextuelle

Elle n'existe que sur l'**accueil**, dès `pc` : 296 px en `pc`, 320 en `pc-xl`. Elle est collante. Contenu, de
haut en bas, déplacé et non dupliqué :
1. **« Tes colis au relais »** : le contenu de `.h0-float` (« 3 colis t'attendent au relais », relais, horaire,
   « Mon code »), en carte `.card.vedette`. Absent s'il n'y a pas de colis, et absent pour un compte diaspora,
   comme aujourd'hui.
2. **Flash Deals** (FF-FLASH ouvert) : le titre, « Tout voir », le compte à rebours vivant (`CompteARebours`) et
   une carte produit en carrousel (flèches, points, « Voir le produit », jauge de stock) lus dans les offres en
   cours. Ce bloc est retiré du flux central à ce palier : c'est le panneau `.h0-flash` de l'accueil, déplacé.
   Module fermé : la Sélection Premium prend la place.
3. **Garanties** en 2 × 2, tuiles compactes reprises du bloc « Pourquoi choisir » sans le retirer du centre :
   « Argent bloqué jusqu'au retrait », « Retour gratuit si problème validé », « Support 7 h – 21 h », « Retrait
   offert dès N F ». Textes vrais (CDS-24, DP-12).

Partout ailleurs, il n'y a pas de colonne droite générique. Les pages à aside ont leur propre aside, défini dans
leur gabarit (§ 4.4).

### 3.7 Menu du profil

`MenuProfil.tsx` garde son contenu, l'ordre de ses entrées, ses chiffres et ses modules masqués quand ils sont
fermés. Il est toujours ouvert par `?pop=profil`.
- `tel`, `tel-l` : inchangé (bulle sous l'avatar et voile).
- **Dès `tab` : menu déroulant ancré** sous l'avatar, aligné à droite, 340 px de large, ombre `--shadow-pop`,
  rayon 20. La carte d'identité (photo, prénom, e-mail) est en tête, sur le dégradé orange actuel. Le défilement
  est interne (`max-height: calc(100vh - var(--hd-h) - 32px)`) et « Déconnexion » reste collé en bas.
  - Pas de voile sombre : on ferme par un clic dehors, Échap ou le choix d'une entrée.
  - Le focus va sur la première entrée et Tab circule dans le menu ; les flèches haut et bas passent d'une entrée
    à l'autre (rôle `menu`).
  - En `tab` seulement, s'y ajoutent Langue, Thème et Favoris, que l'en-tête n'affiche pas à ce palier.

### 3.8 Panneau des notifications (dès `tab`)

La cloche ouvre un déroulant de 380 px, ancré comme le menu du profil :
- en-tête : « Notifications », « Tout marquer comme lu » ;
- les 6 dernières, avec le même rendu de ligne que l'écran Notifications (`CL-10/Notifications.tsx`, extrait en
  composant `LigneNotification`) ; ouvrir une ligne la marque lue et mène au bon écran ;
- en bas : « Voir toutes les notifications » (`/notifications`) et « Régler » (`/notifs-reglages`).
Sur téléphone, la cloche reste un lien vers la page. Aucune ligne ne montre de code de retrait : la règle est
inchangée.

### 3.9 Feuilles → modales et tiroirs

`Feuille.tsx` garde son adresse (`?sheet=`), son voile, Échap et son retour. Il reçoit une prop
`forme?: 'modale' | 'large' | 'tiroir'` (`modale` par défaut) qui ne joue que dès `tab` :

| Forme | `tab` | dès `tab-l` | Écrans |
|---|---|---|---|
| `modale` | centrée, 560 px au plus, rayon 24 sur les quatre coins, `max-height: 86vh`, défilement interne, poignée masquée, bouton « Fermer » (×) en haut à droite | idem | annulation (motifs, réassurance), confirmations (déconnexion, retrait d'un article, suppression), partage, code partagé, CodePartage, ListeCreer, ListeEnvoyer, AbonnementResilier, AnnulerConfirmer, AvisBas, Rappel, NotifsProposition, LitigeArrangement, CoteAnnuler, TrocContreOffre, connexion posée sur le panier |
| `large` | modale de 720 px au plus | 920 px au plus, en deux colonnes (choix à gauche, récapitulatif collant à droite) | « Passer commande » (PaiementMoyen), Mettre de côté (Cote), Souscrire posé sur une page |
| `tiroir` | modale (comme `modale`) | panneau à droite de 440 px, pleine hauteur sous l'en-tête de site, qui glisse de la droite | filtres et marque d'une liste, relais (RelaisSelecteur, choix du relais du panier, ChangerRelais), adresses (ChangerAdresse) |

Le voile couvre toute la fenêtre. Le focus est enfermé dans la feuille, revient au déclencheur à la fermeture,
et la feuille garde `aria-modal`. Les feuilles « posées sur un écran » (`FeuillePosee`) gardent l'écran de
dessous, visible sous le voile, dans sa disposition large.

### 3.10 Toasts

`.cl05-toast`, `.cl09-toast`, `.cl10-toast` et `AvisErreurs` :
- `tel`, `tel-l` : inchangés ;
- `tab` : centrés au-dessus de la barre du bas, 480 px au plus ;
- dès `tab-l` : **en bas à gauche**, 24 px des bords, 420 px au plus, empilés vers le haut. Avec le lecteur
  d'écran, `role="status"`.

### 3.11 Bouton « remonter » (`.h0-up`, `data-act=top`)

- `tab` : à droite, au-dessus de la capsule de navigation ;
- dès `tab-l` : en bas à droite, à 24 px des bords. Il n'apparaît qu'après un défilement de 1,5 hauteur de
  fenêtre (le seuil se mesure sur `main.scrollTop`). Il existe sur toutes les pages longues : accueil, listes,
  recherche, promotions, ventes flash, commandes, FAQ, légal, catégories.

Si l'assistant (FF-IA) est ouvert, son bouton rond se pose dès `pc` en bas à droite et le bouton « remonter »
s'empile au-dessus, comme sur les captures. Il mène à `/assistant`. Sans module, il n'y a pas de bouton.

### 3.12 Barres d'action fixées en bas (téléphone) sur grand écran

| Barre | `tab` | dès `tab-l` |
|---|---|---|
| `.fp-bar` (fiche) | fixée, centrée sur la largeur du contenu (`max-width` du conteneur) | masquée : le bloc d'achat est dans l'aside collant (§ 5.4) |
| `.cl07-bar` (panier) | fixée, centrée, 640 px au plus | masquée : le récapitulatif collant porte « Passer commande » |
| `.cl09-bar`, `.cl11-bar` (commande, litige) | fixées, centrées | masquées : le bouton passe dans l'aside ou en fin d'étape |
| `.buybar` (CL-15 et autres) | fixée, centrée | dans l'aside du gabarit |
| `.h0-float` (colis au relais) | flottante, centrée, 520 px au plus, au-dessus de la capsule | carte en tête de la colonne droite en `pc` ; en `tab-l`, carte en tête du contenu de l'accueil |

Règle générale : dès `tab-l`, **aucun bouton principal n'est fixé en bas de la fenêtre**. Il est dans l'aside
collant à droite, ou en fin de formulaire, aligné à droite.

### 3.13 Bandeau de démonstration (`BandeauDemo.tsx`)

- `tel` → `tab` : inchangé (au-dessus de la barre du bas) ;
- dès `tab-l` : carte en bas à gauche, 420 px, au-dessus de la pile des toasts (`bottom: 24px`, toasts décalés de
  sa hauteur tant qu'il est ouvert). Fermé d'un geste, il ne revient pas : la règle est inchangée.

### 3.14 Pied de page (dès `tab`)

Nouveau composant `PiedDePage.tsx`, dernier enfant de `main` (il défile avec la page), sur le fond `--card` du
thème, avec une bordure haute `--line`. Il est absent sur téléphone, comme aujourd'hui. Il est absent aussi des
écrans `aucun` et des parcours de paiement en cours (attente, 3-D Secure, XpPay), pour ne pas distraire.

Quatre colonnes dès `tab-l`, deux en `tab` :
1. **BelivaY** : logo, « Tout près de toi », une phrase sur l'escrow et le relais, réseaux (icônes 40 px,
   liens réels sinon masqués) ;
2. **Acheter** : Catégories, Promotions, Ventes flash*, Sélection, Premium*, Listes d'envies*, Panier famille*,
   Rentrée* (* : si le module est ouvert) ;
3. **Aide** : Aide et support, Questions fréquentes, Comment ça marche, Retourner un article (`/retour`), Mes
   litiges, Être rappelé, Connexion et données (`/reseau`) ;
4. **BelivaY et toi** : Devenir vendeur, Comptes diaspora : tout savoir, Offrir un abonnement*, Parrainer un
   proche*, Pages légales, contact (ville, téléphone et WhatsApp du support, lus dans les données de l'aide).

Ligne basse : « © 2026 BelivaY », puis à droite les liens Conditions, Confidentialité, Mentions légales (vers
`/legal-doc?d=…`), le sélecteur de langue et le sélecteur de thème (même action que dans Réglages). En `tab`, les
messages du bandeau de confiance s'y ajoutent, en une ligne d'icônes.

### 3.15 Accès rapide

En tête de `#app`, un lien « Aller au contenu » visible au focus seulement, vers `main`. L'en-tête de site est un
`header` (bannière), la navigation un `nav` (« Navigation principale »), chaque colonne latérale un `aside` nommé,
le pied de page un `footer`.

---

## 4. Gabarits de page

Ils sont posés par une prop de `Ecran` (`gabarit?: …`) et mis en page par `larges.css`. Ils ne jouent que dès le
palier indiqué : en dessous, l'écran garde son flux de téléphone, inchangé. Ils sont écrits dans
`src/composants/Gabarits.tsx` (`<Gabarit>`, `<Colonne>`, `<Aside>`) : une `div` de grille et ses zones nommées.
Les blocs de chaque écran y sont rangés **sans être réécrits**.

### 4.1 `catalogue` (dès `tab-l`)

`[Catégories 72|264] [contenu 1fr] [droite 296|320 (accueil, dès pc)]`, conteneur `.l-large`. Le contenu porte
`container-type:inline-size`. Si le contenu passe sous 560 px, la colonne Catégories se replie d'office en rail.

### 4.2 `compte` (dès `tab-l`)

`[menu du compte 264] [contenu 1fr]`, conteneur `.l-moyen`, avec au-dessus la **carte d'identité** pleine
largeur (§ 5.11). Le menu du compte est collant. Sur `tab`, pas de menu latéral : la page Mon compte joue ce
rôle, comme sur le téléphone.

### 4.3 `maitre-detail` (dès `pc`, sauf indication)

`[liste 380–420] [détail 1fr]`, conteneur `.l-moyen`. La sélection est dans l'adresse (`?ref=`, `?id=`, `?d=`) :
un lien profond ouvre la liste avec le bon détail. Le clic sur une ligne remplace le paramètre (`replace`), sans
nouvelle entrée d'historique. La ligne choisie porte `aria-current="true"` et le style `.on`. La liste et le détail
défilent séparément, chacun collant sous l'en-tête. Sous le palier, la liste et le détail restent deux écrans,
comme aujourd'hui.

### 4.4 `colonnes` (contenu + aside collant, dès `tab-l`)

`[contenu 8/12] [aside 4/12, 320–400]`, conteneur `.l-moyen`. L'aside est collant (`top: var(--colle)`, 16 px sous l'en-tête). Il
reçoit le récapitulatif, l'argent et les actions principales. Ordre de lecture du DOM : contenu, puis aside. Sur
`tab`, l'aside passe sous le contenu, ou en tête si l'écran le dit (`asideEnTete`, pour les montants à payer).

### 4.5 `centre` (dès `tab`)

Une colonne `.l-etroit` centrée, sur le fond de page, sans aside. Pour les états d'une tâche et les formulaires
courts. Les boutons principaux sont en fin de colonne, alignés à droite dès `tab-l` : bouton secondaire à gauche,
principal à droite, 200 px au moins chacun.

### 4.6 `arrivee` (dès `tab`)

L'accueil des nouveaux et la connexion (CL-03) :
- `tab` : carte centrée de 520 px sur le fond de page à halos ;
- dès `pc` : **écran partagé**. À gauche, la **photo ou l'illustration de tête de l'écran** (celle qui existe
  déjà : photo de connexion, « Mode, maison… » d'Intérêts, plan du relais), en pleine hauteur, couverte à
  `object-fit:cover`, avec le logo. À droite, la colonne de 480 px avec le reste de l'écran. Proportions 1fr / 480
  à 560.

### 4.7 `web` (pages web publiques, `entete: 'propre'`, dès `tab`)

Liste publique, offrir un article, cadeau offert, payer depuis l'étranger, suivi du cadeau, participer à une
cotisation, offrir un abonnement, lien court du SMS. Ces pages gardent **leur propre en-tête web** (paiement
protégé, langue, adresse du lien), étiré sur toute la largeur : pas d'en-tête de site, pas de navigation, pas de
barre du bas. Dès `tab-l` : `[ce qu'on offre ou paie 7/12] [paiement 5/12 collant]` dans `.l-moyen`, puis un pied
de page réduit (légal et contact seulement). La barre Safari imitée (`.cl12-safari`) est masquée dès `tab` : le
vrai navigateur est là.

---

## 5. Écran par écran

Notation : **T** = tablette portrait (`tab`), **TL** = tablette paysage et petit portable (`tab-l`), **O** =
ordinateur (`pc`, `pc-xl`). Ce qui n'est pas dit reste comme sur le téléphone. « Aside » = colonne droite collante
du gabarit `colonnes`.

### 5.1 Accueil (`/`, CL-04 `Accueil.tsx`)

Gabarit `catalogue` dès TL, colonne droite dès O.

| Bloc (ordre du téléphone) | T | TL | O |
|---|---|---|---|
| Carte « Pour mes proches » (diaspora) | pleine largeur | pleine largeur du centre | idem |
| Carrousel `.h0-hero` (bandes d'univers) | hauteur 300, flèches aux bords | hauteur 340, flèches, points dessous | 360 (O), 400 (`pc-xl`) ; défilement automatique 6 s, arrêté au survol et au focus |
| Pastilles `.h0-pills` (Explorer, Tout voir, univers) | défilement horizontal | idem (doublon assumé du rail : raccourci visuel avec photos) | idem |
| « À la une · Près de ton relais » (`.h0-row plain`) | rail, 3,25 cartes | rail fléché, cartes selon le conteneur | idem |
| Récemment consultés | rail | rail fléché | idem |
| Bannière promo flash `.h0-ban promo` | pleine largeur | idem, hauteur 96 | idem |
| Trier : Pertinence `.h0-sort` | à droite du titre de la section suivante | idem | idem |
| Produits populaires `.h0-g3` | grille 3 colonnes | grille selon le conteneur, 2 rangées, puis « Voir plus » | idem |
| Bannière Premium `.h0-ban prem` | pleine largeur | idem | idem |
| Nouveaux arrivages (`.h0-newb` et rail) | bande à gauche, rail à droite | idem | idem |
| Sections par univers (Mode femme, Électronique…) | rail par univers, « Tout voir » à droite du titre | rail fléché | idem ; à partir du 4ᵉ univers, deux univers côte à côte (2 colonnes de rails, 3 cartes chacun) |
| Bannière Sélection `.h0-ban sel` | pleine largeur | idem | idem |
| Pourquoi choisir `.h0-why` | 2 colonnes | 4 colonnes | 4 colonnes (la version compacte est aussi dans la colonne droite) |
| `.h0-float` (colis au relais) | flottant centré | carte en tête du centre | en tête de la colonne droite |
| Flash Deals `.h0-flash` | dans le flux | dans le flux | **déplacé dans la colonne droite** |
| `.h0-up` | § 3.11 | idem | idem |

Le bas de l'accueil n'est jamais un défilement infini sans fin. Après la dernière section vient le pied de page.
« Voir plus d'articles » mène à `/liste` (tout le catalogue).

États de l'accueil (8 adresses : visiteur, nouveau client, connexion lente, hors ligne…) : même disposition. Le
bandeau hors ligne et la connexion lente se placent en tête du centre, sur toute sa largeur.

### 5.2 Catégories (`/categories`, CL-04 `Categories.tsx`)

- **T** : la liste des univers devient une rangée de pastilles collantes sous la barre de titre. Le contenu de
  l'univers prend toute la largeur. Sous-catégories en grille de 4.
- **TL / O** : gabarit `catalogue`. **La colonne gauche est la liste des univers de la page** (le choix `?u=`),
  dépliée en 264 dès TL : sur cette page, elle ne se replie pas. Au centre :
  1. la bannière de l'univers (dessin d'en-tête intouchable, largeur du centre, 260 de haut) ;
  2. la recherche dans l'univers, sous la bannière, 560 px au plus ;
  3. les raccourcis de l'univers (retirable aujourd'hui, en promotion, marques comptées) en ligne de pastilles ;
  4. les sous-catégories en grille : 4 colonnes en TL, 5 en O et 6 en `pc-xl`. Chaque tuile montre son nombre de
     produits et son prix le plus bas ;
  5. les produits de chaque sous-catégorie en rail fléché ;
  6. « À découvrir » en 4 tuiles côte à côte ;
  7. le rappel du retrait offert, en bas.
- Pas de colonne droite.

### 5.3 Recherche (CL-05 : `recherche`, `recherche-saisie`, `recherche-resultats`, `recherche-zero`, `recherche-filtres`, `relais-selecteur`)

**Le champ de l'en-tête de site est la recherche** dès `tab`.
- **Focus dans le champ** (clic, ou « / » au clavier) : un **panneau déroulant** s'ouvre sous le champ, de la
  largeur du champ et de 720 px au plus, `max-height: 70vh`. Il reprend le contenu de l'accueil de la recherche
  (`CL-05/Commun.tsx`) :
  - sans texte : tes recherches (effaçables une à une, « Tout effacer » avec confirmation sur place), recherches
    populaires comptées, univers ;
  - dès deux lettres : les suggestions (recherches complétées et leur nombre, sous-catégories, produits et leur
    prix), navigables aux flèches, Entrée pour choisir, Échap pour fermer.
  « Rechercher » ou Entrée ouvre `/recherche-resultats?q=…`. Le micro ouvre la feuille « Je t'écoute… » en modale.
- **`/recherche` et `/recherche-saisie`** restent des routes (liens profonds). Dès `tab`, elles affichent l'accueil
  de la recherche en page, dans `.l-moyen`, avec le focus mis dans le champ de l'en-tête. La disposition est en
  3 colonnes dès TL : tes recherches | populaires | univers.
- **Résultats** (`recherche-resultats`), gabarit `catalogue` dès TL, mais **la colonne gauche devient le panneau
  de filtres** (§ 5.3.1) à la place de la liste des univers.
  - En tête du centre, la barre de résultats : « N produits pour “…” » (et « Corrigé depuis … »), les pastilles des
    filtres actifs (retirables, « Tout effacer »), « Retirable aujourd'hui » (interrupteur), le tri (menu
    déroulant : pertinence, au plus proche, prix croissant, prix décroissant, note) et la pastille du relais
    d'origine des distances.
  - Les résultats passent de **lignes produit** (téléphone) à une **grille** dès TL, avec les cartes du catalogue
    et le nombre de colonnes du conteneur. Un bouton « Liste | Grille » permet de revenir aux lignes. Le choix est
    gardé en `localStorage`.
  - Chargement : défilement infini, puis un bouton « Voir plus » après 3 chargements automatiques (le pied de page
    reste atteignable).
  - Après un changement de relais, la note « ce qui a été recalculé » s'affiche en tête des résultats.
- **Rien trouvé** (`recherche-zero`), gabarit `centre` élargi (`.l-moyen`) : le message et l'alerte « Préviens-moi »
  en haut, centrés ; « ce qui s'en approche » en grille ; la catégorie la plus proche et les recherches populaires
  en deux colonnes.
- **Filtres** (`recherche-filtres`) : dès TL, l'adresse ouvre les résultats avec le panneau de filtres (`?q=` gardé ;
  sans recherche : l'invitation à chercher, en page `centre`). En T, c'est un tiroir.
- **Choix du relais** (`relais-selecteur`) : tiroir de 440 px dès TL. La liste des relais est en haut. Dès O, une
  petite carte des relais s'ajoute au-dessus (Google ou OSM, comme ailleurs). « Garder mon relais » est en bas du
  tiroir.

#### 5.3.1 Panneau de filtres (listes et résultats, dès TL)

`aside` de 280 px, collant, avec un défilement interne. Il remplace les feuilles « Filtres » et « Marque » de la
vue de liste. Mêmes contrôles, même ordre que la feuille du téléphone :
- en tête : « Filtres », nombre choisi, « Tout effacer » ;
- prix (de… à…, plafonds rapides) ;
- livrabilité (retirable à mon relais, livrable à domicile, retrait aujourd'hui), avec leur nombre ;
- relais et adresse ;
- disponibilité ;
- retrait offert ;
- en promotion ;
- distance ;
- note ;
- univers et sous-catégories comptées ;
- marque (comptée, grisée à zéro ; les 8 premières, puis « Voir toutes les marques », qui déplie).

Chaque changement **s'applique aussitôt** dès TL : pas de bouton « Voir les N résultats », car le nombre se met à
jour en tête des résultats. Sur T et téléphone, la feuille et son bouton restent.

### 5.4 Fiche produit (`/fiche`, CL-06 `Fiche.tsx`)

- **T** : une colonne, comme le téléphone, mais la galerie fait 480 de haut avec les vignettes en colonne à gauche
  (`.fp-gal`, déjà en ligne). Garanties en 4 colonnes. `.fp-bar` fixée et centrée.
- **TL** : deux colonnes 6/12 et 6/12 dans `.l-large` (1 280 au plus) :
  - gauche, collante : la galerie (vignettes verticales 64 px, image principale carrée, zoom au survol en loupe et
    au clic vers la galerie) ;
  - droite : fil d'Ariane (au-dessus des deux colonnes), badges, titre, prix et remise, note et avis, ventes,
    paramètres (couleur, capacité, taille, pointure), stock et jauge, vendeur certifié, retrait au relais et
    livraison, quantité et sous-total, puis **le bloc d'achat** à la place de `.fp-bar` : favori (cœur 48 px),
    « Ajouter au panier » (secondaire), « Acheter » (principal), côte à côte, pleine largeur de la colonne ; puis
    « Mettre de côté » et « Poser une question au vendeur » en liens.
- **O** : trois colonnes dans `.l-large` (1 440 au plus) : **galerie 5/12** (collante) | **informations 4/12**
  (titre, prix, note, badges, paramètres, stock, vendeur, description courte) | **bloc d'achat 3/12**, carte
  collante. Le bloc d'achat contient :
  - prix et remise rappelés ;
  - retrait au relais : nom, prix, délai, « Changer de relais » ;
  - livraison à domicile : prix, seuil, délai ;
  - quantité ;
  - sous-total ;
  - « Ajouter au panier » et « Acheter » empilés, pleine largeur ;
  - favori ;
  - « Mettre de côté · payer en plusieurs fois » ;
  - garanties en 3 lignes (Certifié, Escrow, Retour 7 j) ;
  - stock épuisé : « On te prévient dès son retour en stock » à la place des boutons.
- Sous les colonnes, pleine largeur du conteneur, dès TL :
  1. **Autres vendeurs** : 3 cartes côte à côte (le plus proche, le mieux noté, le moins cher), « Choisir » ;
  2. **Garanties** : 4 tuiles en ligne ;
  3. **Onglets** Description / Caractéristiques / Avis (`.fp-tabs`). Dès O, Description et Caractéristiques sont
     côte à côte (7/12 et 5/12) sous l'onglet « Détails », et l'onglet Avis montre le résumé des avis et 3 avis avec
     « Lire les avis » ;
  4. **Produits semblables** en rail fléché.
- Le jet au panier part de l'image principale vers l'icône panier de l'en-tête (§ 6.6).

### 5.5 Galerie, avis, question (CL-06)

- **Galerie** (`/galerie`, `entete: aucun`) : dès T, **visionneuse plein écran** sur fond `#0f0d12` (clair et
  sombre), image centrée contenue, flèches gauche et droite de 56 px aux bords, vignettes en bande de 72 px en bas
  (photos du vendeur, séparateur, photos d'acheteurs), légende en bas à gauche (vue du vendeur ou note, date,
  « Lire son avis »), prix et « Revenir à la fiche » en haut à droite, × en haut à droite. Clavier : flèches, Échap.
  Double-clic ou molette avec Ctrl : zoom.
- **Avis** (`/avis`), gabarit `colonnes` inversé dès TL : **aside à gauche** de 320 px, collant, avec la note
  moyenne, la répartition (barres cliquables qui filtrent), les filtres (tous, avec photo, par étoiles, avec leur
  nombre), le tri (menu) et « Donner mon avis » ou la raison. **Liste à droite** : chaque avis (« Utile »,
  « Signaler », réponse du vendeur, photos qui ouvrent la galerie), puis « Poser une question au vendeur ». La
  carte du produit (vignette, titre, prix, lien vers la fiche) est en tête de l'aside.
- **Question** (`/question`), gabarit `colonnes` dès TL : à gauche le formulaire (questions rapides en pastilles,
  champ, conversation déjà ouverte au-dessus), « Envoyer » en fin de formulaire, aligné à droite ; à droite (aside)
  le produit, le vendeur (palier, Trust Score, distance) et le délai de réponse.

### 5.6 Panier (CL-07 : `panier`, `sauvegardes`, `panier-retrait`)

**Panier** (`/panier`), gabarit `colonnes` dès TL, conteneur `.l-moyen` :
- **Barre de titre** : « Mon panier · n articles », avec le bandeau de réassurance au-dessus. « Pour qui ? »
  (mes proches) est à droite du titre.
- **Contenu (8/12)** : une section par boutique (un colis), avec son en-tête (boutique, zone, délai), ses
  articles (photo 96 px, titre, paramètres modifiables sur place, stock, quantité, prix ; actions en ligne :
  favori, retirer, avec annulation), « Autres vendeurs » du même produit (3 cartes en ligne), « Ajouter de cette
  boutique » (`.cl07-mc` : 4 cartes en TL, 5 en O) et le sous-total de la boutique.
- **Aside (4/12), collant** :
  1. le relais ou l'adresse de retrait (« Changer » ouvre le tiroir des relais) ;
  2. le **récapitulatif** : sous-totaux, frais calculés par le moteur (`src/donnees/frais.ts`), livraison offerte
     et ce qui manque pour l'avoir, remise Prime, « Total à payer » ;
  3. **« Passer commande »**, bouton principal pleine largeur (c'est l'action de `.cl07-bar`) ;
  4. « Payer au comptoir du relais » si c'est possible ;
  5. moyens acceptés (logos) et Escrow BelivaY ;
  6. « Conditions de vente et de paiement ».
- **Sous les deux colonnes** : « Favoris » en rail fléché, « Tout voir ».
- `.cl07-bar` masquée dès TL. Panier vide : gabarit `centre`, illustration et « Découvrir les produits », puis les
  favoris en grille.
- **T** : une colonne ; le récapitulatif reste en bas et `.cl07-bar` est fixée, centrée, 640 px au plus.

**Sauvegardés et favoris** (`/sauvegardes`), `.l-large`, sans colonnes latérales :
- barre d'outils : tri, filtres en pastilles, « Tout mettre au panier » avec son total (à droite, bouton principal) ;
- favoris en grille selon le conteneur. Chaque carte garde prix vérifié, baisse, retrait, stock, alerte, partage
  et retrait ;
- après le lancement : les listes d'envies et de rentrée en bandeau sous la barre d'outils.

**Retirer un article** (`/panier-retrait`, prototype) : modale posée sur le panier.

### 5.7 Paiement et confirmations (CL-08)

- **Passer commande** (`/paiement-moyen`, feuille posée sur le panier) : feuille `large`.
  - T : modale de 720 px, une colonne.
  - Dès TL : modale de 920 px en deux colonnes :
    - à gauche les trois choix numérotés : 1. Livraison (relais habituel ou autre, avec le tiroir des relais ;
      domicile, avec l'adresse) ; 2. Quand payer (maintenant ou au comptoir, avec le plafond) ; 3. Moyen (Wallet,
      MTN MoMo, Orange Money, autre numéro, paiement express, carte, devise pour la diaspora) ;
    - à droite le récapitulatif collant (articles et livraison, détail des frais repliable, frais de carte, total
      débité) et le bouton **« Payer N F »**, puis « Et après le paiement ? » replié.
  Le panier reste visible sous le voile.
- **Paiement express** (`/xp-pay`) : modale de 420 px qui imite la feuille de paiement du téléphone, centrée.
- **En attente de validation** (`/paiement-attente`), **Paiement non abouti** (`/paiement-echec`), **Un prix a
  changé** (`/prix-change`) : gabarit `centre` (720).
  - Attente : compte à rebours en grand, récapitulatif en carte, puis « J'ai validé » (principal, à droite) et
    « Renvoyer la demande » ; « Changer de moyen » en lien.
  - Prix changé : tableau ancien prix, nouveau prix, écart, en une vraie table dès TL. Les deux totaux sont côte à
    côte.
- **Commande confirmée** (`/confirmee`) et **Commande validée, payer au comptoir** (`/validee`) : gabarit
  `colonnes` dès TL. À gauche le reçu (numéro, montant, moyen, date, articles, livraison, remise, frais) et
  « L'argent est bloqué jusqu'au retrait ». À droite (aside) le relais (gérant, distance, horaires), l'heure où
  c'est prêt, les colis, **« Suivre ma commande »** (principal) et « Partager la confirmation » (modale).

### 5.8 Commandes et suivi (CL-09, CL-10 `garde`)

**Mes commandes** (`/commandes`) :
- **T** : une colonne de 720. « Livraisons en cours » en deux colonnes (plan indicatif | liste des commandes en
  livraison et « Suivre en détail »), comme sur la capture.
- **TL** : `.l-moyen`, une colonne de contenu :
  1. carte de titre (nombre de commandes, nombre à payer) ;
  2. **bandeau orange « Paiement en attente »** pleine largeur (délai, « Reprendre le paiement » et
     « Abandonner » à droite du texte) ;
  3. « Livraisons en cours » en deux colonnes (7/12 plan, 5/12 liste) ;
  4. onglets En cours / Terminées et filtres comptés, sur une ligne ;
  5. **cartes de commande en grille de 2**. Chaque carte : en-tête (numéro, date, mode, quartier, pastilles d'état
     à droite), articles, puis montant à gauche et actions à droite (selon l'état : Mon code, Payer au comptoir,
     Annuler, Suivre, Suivre mon litige, Donner mon avis, Racheter, Détails) ;
  6. « Ton relais habituel » en bas.
- **O** : gabarit **`maitre-detail`**. La liste (420) contient le bandeau du paiement en attente en version
  compacte, les onglets et filtres, puis des cartes compactes (numéro, date, état, montant, 2 actions au plus). Le
  **détail** (1fr) affiche la commande choisie (`?ref=`, sinon la plus récente en cours), avec le corps de
  `Commande.tsx` dans sa disposition à aside (ci-dessous, réduite à 2 colonnes internes 7/5). « Livraisons en
  cours » se place en tête du détail quand aucune commande n'est choisie. `/commande?ref=` reste une page
  complète, pour les liens profonds et le partage.

**Ma commande** (`/commande`), gabarit `colonnes` dès TL, comme la capture :
- en tête, pleine largeur : « ‹ Mes commandes », titre « Commande BLV-… », date, retrait prévu, pastilles d'état et
  de mode à droite ;
- **bandeau d'action** (code de retrait, montant à payer au comptoir, dossier de litige) : en tête de l'**aside**,
  en carte orange `.card.vedette` avec son bouton (« Mon code », « Payer », « Suivre ») ;
- **contenu (8/12)** : suivi (plan, étape, relais, colis par colis), chronologie datée, puis **trois cartes en
  ligne** (Preuves, Point relais avec « Changer de relais », Litige protégé avec « Signaler »), le constat au
  comptoir, puis **Articles** (étagère, annulés et remboursés, « Noter ») ;
- **aside (4/12)**, collant : bandeau d'action, cycle de vie du paiement, résumé (garde, comptoir,
  remboursements), facture (« Partager », « PDF »), livraison et contact du relais, « Modifier ma commande ».
- `.cl09-bar` masquée dès TL.

**Code de retrait** (`/code`), gabarit `centre` en T, `colonnes` dès TL : à gauche, en grand, le **QR (280 px) et
les 6 chiffres**, cachés jusqu'au clic, avec le déverrouillage demandé au-delà de 50 000 F ; à droite, le relais
du jour, le montant dû et ses paliers, « Je suis au comptoir », « Envoyer à quelqu'un » (modale), « Recevoir par
SMS ». Sur ordinateur, le texte indique que le code se montre depuis le téléphone ou l'écran, et le QR reste
lisible à l'écran.

**Envoyer à quelqu'un** (`/code-partage`) : modale.

**Suivi** (`/suivi`), `colonnes` dès TL : à gauche « Quand puis-je y aller ? » en tête, plan indicatif (16/9),
étape de la commande en barre horizontale de 4 étapes, puis les étapes datées ; à droite les colis un par un
(boutique, état, jauge), le montant dû, le code, le reçu, « Modifier » et « Signaler un problème ».

**Au comptoir** (`/comptoir`) et **Payer au comptoir** (`/comptoir-payer`) : gabarit `centre` (720). Les 4 gestes
du comptoir passent en grille de 2 × 2 dès TL. Le bouton « Le gérant m'a remis mes colis » est en fin de colonne,
pleine largeur de la colonne : c'est une action unique et forte.

**Frais de garde** (`/garde`), `colonnes` dès TL : à gauche la barre des 7 jours (pleine largeur, jours datés),
« Montant dû aujourd'hui, demain, palier suivant », la date limite et « Et si je retire… » ; à droite le tableau jour
par jour (vraie table), le relais et « Faire retirer par quelqu'un ».

### 5.9 Notifications (CL-10)

- **Notifications** (`/notifications`), dès TL : `.l-moyen`. À gauche, un `aside` de 240 px avec les filtres (tous,
  suivi, paiement, retrait, incident, messages, avec leur nombre), « Tout marquer comme lu », « Régler mes
  notifications » et « Mes SMS BelivaY ». À droite la liste, 760 au plus, groupée par jour, avec les groupes
  dépliables. Voir aussi le panneau de l'en-tête (§ 3.8).
- **Réglage des notifications** (`/notifs-reglages`) : gabarit `compte` dès TL ; contenu en 2 colonnes (les
  interrupteurs | le canal de repli et le message d'essai).
- **Écran verrouillé** (`/push`) et **SMS** (`/sms`) : ce sont des imitations du téléphone. Dès T, ils s'affichent
  dans un **cadre de téléphone** de 390 × 780 centré, sur le fond de page, avec à côté (dès TL) une colonne
  d'explication de 360 px (« Ce que tu reçois et quand »). Même contenu.
- **Lien court** (`/lien-court`) : gabarit `web`.

### 5.10 Litiges et modifications de commande (CL-11, CL-12)

- **Mes litiges** (`/litiges`) : `.l-moyen`. Dès TL, cartes de dossier en grille de 2 (état, délai du vendeur qui
  se décompte, montant bloqué, étapes). Dès O, gabarit `maitre-detail` : la liste à gauche, le **suivi du litige**
  à droite.
- **Signaler un problème** (`/litige`) : gabarit `centre` (720), avec le **stepper horizontal** des 4 étapes en tête
  (colis, problème, preuves, souhait). Les preuves sont en grille de 4 vignettes. « Continuer » est en fin d'étape,
  à droite, avec « Retour » à gauche. `.cl11-bar` est masquée dès TL.
- **Suivi du litige** (`/litige-suivi`), `colonnes` dès TL : à gauche l'état du dossier, problème et souhait,
  preuves (et « Ajouter »), chronologie, écrire dans le dossier ; à droite (aside) l'**argent bloqué**, le délai qui
  se décompte, la suite (retour, remplacement), le motif et « Contester » (48 h), « Retirer mon signalement ».
- **Litige ouvert, Remboursé, Constat au comptoir** (`litige-confirme`, `litige-auto`, `litige-comptoir`) : `centre`.
- **Arrangement proposé** (`litige-arrangement`) : modale `large` dès TL, avec « Accepter » et « Refuser » côte à
  côte. Le dossier reste visible derrière.
- **Retourner un article, Remplacement** (`retour`, `remplacement`) : `colonnes` dès TL (étapes à gauche, argent et
  relais à droite).
- **Modifier ma commande** (`/modifier`) : `centre` (720). Les trois onglets (`nav.seg.cl12-seg`) sont centrés
  en tête.
- **Annuler** (`/annuler`) : `centre`, une carte par boutique ; **Confirmer l'annulation** : modale (capture
  11.32.34 : motifs en grandes lignes, « Garder la commande » en secondaire pleine largeur, puis l'écran de
  réassurance, « Continuer l'annulation » en rouge).
- **Changer de point relais** (`/changer-relais`), `colonnes` dès TL : la liste des relais à gauche, et à droite la
  carte avec les relais, le détail du relais choisi et « Ce qui change » avec le bouton de confirmation.
- **Changer d'adresse** : tiroir dès TL.
- **Un proche paie pour toi** (`/diaspora`, CL-12) : `colonnes` (articles à offrir à gauche, lien et partage à
  droite) ; les paniers envoyés en liste sous les colonnes.
- **Payer depuis l'étranger** (`/payeur`) et **Suivi du cadeau** (`/payeur-preuve`) : gabarit `web`.

### 5.11 Mon compte et ses sous-pages (CL-13, `profil/`, `diaspora/espace-diaspora`)

**Gabarit `compte` dès TL** pour : compte, profil, profil-email, securite, confidentialite, numero-changer,
adresses, moyens-paiement, wallet, factures, avis-donner, messagerie, fil, aide, faq, rappel, reglages,
notifs-reglages, reseau, legal, legal-doc, devenir-vendeur, supprimer, cagnotte, parrainage, mon-abonnement,
listes, proches, espace-diaspora, paniers-proches, litiges. Pour un visiteur, les pages publiques de cette liste
(aide, faq, legal, legal-doc, reglages, reseau, devenir-vendeur) sont en gabarit `moyen` sans menu latéral.

**Carte d'identité** (en tête, pleine largeur, dès TL ; seulement sur `/compte` et ses sous-pages directes) :
portrait de 64 px, prénom et nom, e-mail, membre depuis, quartier du relais, puis à droite le **palier** (pastille)
et « Modifier mon profil » (secondaire). Sur les autres pages du gabarit, elle se réduit à une ligne de 56 px,
pour ne pas pousser le contenu.

**Menu du compte** (gauche, 264, collant), les entrées de la page Mon compte du téléphone, rien de plus, rangées
dans l'ordre des captures (capture 11.32.54 : Principal, Compte, Espace vendeur, Déconnexion, Accessibilité) :
- **Principal** : Vue d'ensemble (`/compte`), Mes commandes, Sauvegardés, Messagerie (badge des non-lus), Mes
  litiges, Factures, Avis à donner (badge) ;
- **Compte** : Mon profil, Adresses, Moyens de paiement, Wallet BelivaY (solde affiché), Cagnotte*, Parrainage*,
  Numéro et connexion, Confidentialité et données, Réglages des notifications, Réglages ;
- **Mes services BelivaY** : Premium*, Listes d'envies*, Mes proches et Espace diaspora (diaspora), Panier
  famille*, Cotisation*, Mise de côté*, Rentrée*, Assistant*, WhatsApp* (* : module ouvert) ;
- **Aide** : Aide et support, Être rappelé, Pages légales ;
- puis : Devenir vendeur (ou Espace vendeur), **Se déconnecter** (rouge, confirmation en modale) ;
- en bas, **Préférences rapides** (« Accessibilité » des captures) : langue, thème (Automatique, Clair, Sombre),
  taille du texte (A−, A, A+). Ce sont les réglages qui existent déjà ; aucun n'est ajouté (pas de « Mode
  daltonien »).

L'entrée active porte `aria-current="page"` et le fond `--or-soft`. La recherche « Chercher dans mon compte »
(code, argent, relais, facture…) est en tête du menu.

**Vue d'ensemble** (`/compte`, contenu, dès TL), en grille de 12 :
1. si une commande est en cours, la carte de suivi (étapes horizontales, « Suivre ») sur 12 ;
2. compteurs Commandes, Litiges, Messages, Sauvegardés : 4 tuiles sur 12 (masquées à 0, CNV-07) ;
3. **Wallet BelivaY** (solde, Recharger, Payer, Retirer, Historique) sur 7, et **Tes avantages actifs** (palier,
   avantages en clair) sur 5 ;
4. **Mon relais habituel** (« Changer ») sur 6, adresse principale sur 6 ;
5. « Mes achats » (Factures, Avis à donner) et « Mes services » en tuiles, 3 colonnes ;
6. « Deviens vendeur » sur 12, en bannière.
Le compte neuf (`?st=nouveau`) suit la même grille, avec les cartes « à faire » en tête.

**Sous-pages** (contenu du gabarit `compte`) :

| Page | Disposition du contenu dès TL |
|---|---|
| Mon profil `/profil` | 2 colonnes : photo (recadrage `.pf-rog` en modale) à gauche, 240 ; champs à droite, 480 au plus ; « Enregistrer » en fin, à droite |
| Changer d'e-mail, Changer de numéro | une colonne de 560, stepper de 3 étapes en tête |
| Numéro et connexion `/securite` | 2 colonnes de cartes : façons de se connecter, mot de passe | appareils connectés, dernières connexions, biométrie |
| Confidentialité `/confidentialite` | 2 colonnes de cartes ; « Télécharger mes données » et l'historique pleine largeur en bas |
| Adresses `/adresses` | cartes d'adresse en grille de 2 (TL) ou 3 (O), la principale en premier ; « Ajouter » (principal) à droite du titre ; le formulaire (nom, quartier, repères, carte) s'ouvre en **modale large** (champs à gauche, carte à droite) |
| Moyens de paiement `/moyens-paiement` | 2 colonnes : Mobile Money (numéros) | autres moyens (carte, Wallet, comptoir, proche qui paie) ; actions d'un numéro en menu déroulant ⋯ |
| Wallet `/wallet` | `colonnes` internes : à gauche, la carte de solde (œil), la cagnotte, « Recharger » et « Retirer » (formulaires en modale) ; à droite, l'**historique** en vraie table (date, libellé, montant, état) avec filtres |
| Factures `/factures` | **maître-détail** : la liste des factures (420) | l'aperçu (`?st=apercu&ref=`) avec les lignes, le total, « Partager » et « PDF » |
| Donner mon avis `/avis-donner` | une colonne de 640 ; une carte par vendeur et une pour le relais ; « Envoyer mes notes » à droite. Tes notes sont envoyées (`avis-bas`) : modale |
| Messagerie `/messagerie` et Conversation `/fil` | **maître-détail dès TL** : les conversations (360, recherche en tête, « Tout marquer comme lu ») | le fil (`?id=`), avec les messages groupés par jour et la zone d'écriture collée en bas du panneau ; vide : « Choisis une conversation ». « Écrire au support » en tête de la liste |
| Aide et support `/aide` | 2 colonnes : à gauche, la recherche (qui ouvre la FAQ), le dossier en cours et les thèmes en grille de 3 ; à droite, une carte « Nous joindre » (ouvert ou fermé selon l'heure, messagerie, « Être rappelé », WhatsApp, délais) |
| Questions fréquentes `/faq` | 2 colonnes : thèmes (240, liste verticale, avec leur nombre de questions) | recherche et réponses en accordéons (760 au plus) ; « Pas trouvé ta réponse ? » en bas |
| Être rappelé `/rappel` | modale posée sur l'aide |
| Réglages `/reglages` | 2 colonnes de cartes : Langue, Thème, Taille du texte, Animations | Données économes, mesure d'audience, devise (diaspora) |
| Connexion et données `/reseau` | 2 colonnes : état du réseau et données économes | ce qui marche sans réseau, place prise |
| Pages légales `/legal` et `/legal-doc` | **maître-détail** : les dix documents (version, date) | le document (`?d=`) en colonne de lecture (760), avec un sommaire collant à droite dès O si le document a des titres |
| Devenir vendeur `/devenir-vendeur` | `colonnes` : le formulaire ou les étapes à gauche, « Ce que tu gagnes » et les règles à droite |
| Supprimer mon compte `/supprimer` | une colonne de 640 ; refus et raisons en carte, code en fin |

### 5.12 Abonnements, Prime et ventes (CL-14)

- **Abonnements** (`/abonnements`), `.l-moyen`, sans colonnes latérales, comme la capture :
  1. bannière Premium (dessin intouchable), pleine largeur ;
  2. accroche et choix Mensuel / Annuel centrés ;
  3. **paliers en grille** : 4 colonnes dès O (Prime mis en avant, plus haut de 12 px avec la bordure `--or-line` ;
     Prime Duo, Plus, Business) et 2 × 2 en TL. Chaque carte : prix, avantages, bouton en bas aligné sur toutes les
     cartes ;
  4. « Quand Prime devient rentable » sur 7, avec « Autres formules » (Pass 7 jours, se faire offrir, parrainer)
     sur 5 ;
  5. « Comparer les paliers » : le détail replié devient une **vraie table** pleine largeur, dépliée dès O (une
     ligne par avantage, une colonne par palier) ;
  6. « Ce que l'abonnement ne couvre jamais » et les conditions en bas.
  Abonné : son palier est en tête (bandeau), le reste est inchangé.
- **Souscrire** (`/abonnement-souscrire`), `colonnes` : à gauche le palier, la formule, la date et le numéro Mobile
  Money ; à droite le récapitulatif (aujourd'hui, ensuite, prochain prélèvement) et « Payer ».
- **Mon abonnement** (`/mon-abonnement`), gabarit `compte`, contenu en `colonnes` internes : à gauche le bandeau de
  nuit, tes économies et ce mois-ci (quotas) ; à droite la gestion (numéro, renouvellement, « Changer de palier »,
  « Résilier » en lien rouge). **Résilier** : modale.
- **Offrir un abonnement** (`/abonnement-offrir`) : gabarit `web`.
- **Ventes flash** (`/ventes-flash`), gabarit `catalogue` (sans colonne droite) : l'en-tête avec le compte à rebours
  est pleine largeur du centre ; le rail des Flash Deals devient une **grille de grandes cartes** (3 en TL, 4 en
  O), chacune avec sa barre de temps et son stock ; puis « Tous les Flash Deals » avec les filtres par univers en
  pastilles et la grille selon le conteneur.
- **Promotions** (`/promotions`), `catalogue` : l'en-tête (nombre de promos, plus forte remise) et l'accès aux Flash
  Deals sont en tête ; puis le tri à droite, le filtre par univers en pastilles et la grille.
- **Sélection Premium** (`/selection`), `catalogue` : le bandeau des critères en tête, les univers en pastilles, le
  tri et les filtres comptés sur une ligne, la grille, puis « Comment on choisit » en 3 colonnes.
- **Ma cagnotte** (`/cagnotte`), gabarit `compte` : bandeau de nuit (en attente, disponible) pleine largeur, puis les
  commandes en cartes (grille de 2 dès O), « Déjà versé » et « Comment ça marche » en aside.
- **Parrainer un proche** (`/parrainage`), gabarit `compte`, `colonnes` internes : à gauche le lien à copier et les
  boutons de partage en ligne ; à droite les récompenses du mois.
- **Listes d'envies** (`/listes`, `/liste-envies`) : gabarit `compte`, **maître-détail dès TL**. Les puces des
  listes deviennent la liste verticale de gauche (300) : liste par défaut (favoris), puis listes nommées avec leur
  nombre d'articles, puis « Nouvelle liste » (modale). Le détail (`?id=`) affiche l'en-tête de la liste (partage,
  offerts et barre, remise), les articles en grille selon le conteneur, et les actions « Envoyer ma liste »
  (modale), « Mettre en statut » et « Partager ».
- **Mettre en statut** (`/liste-statut`), `colonnes` : l'aperçu 9:16 (360 de large) à gauche, et à droite le QR,
  le lien court, « Télécharger l'image » et « Partager ».
- **Liste publique, Offrir, Cadeau offert** (`liste-publique`, `liste-offrir`, `liste-offert`) : gabarit `web`. La
  liste publique montre les articles en grille, avec « Offrir » sur chaque carte. Offrir : l'article à gauche, le
  paiement à droite.
- **Assistant** (`/assistant`), dès TL : la conversation dans une colonne de 760 centrée, avec la barre de saisie
  collée en bas de la colonne (pas de la fenêtre). Dès O, les raccourcis passent dans un aside droit de 280 (« Je
  peux t'aider à… »). Les propositions (produits) s'affichent en grille de 3 dans la bulle. **Confirmer la
  proposition** : modale.

### 5.13 Modules après le lancement (CL-15)

Règle commune : les parcours en étapes sont en `centre` avec un **stepper horizontal** en tête. Les écrans
« argent » sont en `colonnes`, avec le montant, l'échéance et le bouton de paiement dans l'aside.

| Écrans | Disposition dès TL |
|---|---|
| Mettre de côté `/cote` | la page du produit (galerie et titre) à gauche ; la feuille « Mettre de côté » en **modale large** dès TL (acompte, rythme, versements, récapitulatif collant à droite) |
| Plan `/cote-plan`, Suivre `/cote-suivre`, Versement `/cote-versement` | `colonnes` : progression et versements datés (table) à gauche ; prochain versement, montant et « Payer » à droite |
| Payé en entier `/cote-fini` | `centre` |
| Annuler la mise de côté `/cote-annuler` | modale |
| Offrir à plusieurs `/cotisation` (2 étapes) | `centre` élargi (880) : le formulaire à gauche (7/12) et l'objectif calculé à droite (5/12, collant) |
| Cotisation créée, Suivre | `colonnes` : à gauche, ce qui est réuni (barre), les participants (table) et la relance ; à droite, le lien (copier, QR, partager) et la date limite |
| Participer `/cotisation-participer` | gabarit `web` |
| Objectif atteint ou non atteint | `centre` |
| Rentrée `/rentree` | `.l-moyen` : la liste en cours en bandeau ; la recherche d'école en tête, avec les écoles en grille de 3 ; « Photographie ta liste » et « Comment ça marche » en 2 colonnes |
| Choisir la classe | sections côte à côte (francophone, anglophone), une colonne chacune, les classes en lignes avec leur prix |
| Liste officielle `/rentree-liste` | `colonnes` : groupes et articles cochables à gauche ; total recalculé et « Mettre au panier », « Mettre de côté » à droite |
| Photographie ta liste | `centre`, avec le cadre photo de 480 |
| Panier de la liste `/rentree-panier` | comme le Panier (§ 5.6) |
| Suivi de la liste | comme le Suivi (§ 5.8) |
| Espace école `/ecole` | `.l-moyen`, les listes par section en table (classe, état, date, actions) |
| Reprise `/troc` | `colonnes` : le neuf choisi et l'ancien (modèle, état) à gauche ; l'estimation collante à droite |
| Reprise estimée, Dépôt, Inspection, Ton téléphone neuf | `colonnes` : le texte et les étapes à gauche ; le montant et l'action à droite ; Dépôt : le code de dépôt en grand dans l'aside |
| Contre-offre | modale large |
| Panier famille `/famille` | comme le Panier : paniers prêts en pastilles en tête, articles à gauche, récapitulatif à droite (≈ euros) |
| Qui retire, Chaque mois, Payer, Preuve | `colonnes` ; Payer : récapitulatif et devise à droite |
| Commander par WhatsApp (`wa`, `wa-proposition`, `wa-confirmer`, `wa-lien`, `wa-suite`) | le décor de conversation garde sa forme de téléphone : colonne de 480 centrée, cadre arrondi, sur le fond de page. Dès O, une colonne d'explication de 360 à gauche (« Comment ça marche », étape en cours). Les bulles et la saisie ne changent pas |

### 5.14 Diaspora (`src/pages/diaspora/`)

- **Espace diaspora** (`/espace-diaspora`), gabarit `compte`. Tableau de bord en grille :
  - le compte et les plafonds restants en 3 tuiles (par paiement, ce mois-ci, proches reliés) ;
  - « À payer pour mes proches » (nombre et premier panier) sur 6, et « Mes proches » (pastilles) sur 6 ;
  - commandes envoyées en table (proche, relais, étape, montant) ;
  - la devise d'affichage, avec un lien vers Réglages.
- **Mes proches** (`/proches`) : les proches en grille de cartes (2 en TL, 3 en O), avec leur prénom, le quartier
  de leur relais et leurs actions. « Relier un proche » (code famille ou numéro) est dans un aside droit de 360.
  Le partage d'un code (QR, WhatsApp, SMS, copier) se fait dans une modale.
- **Commander pour un proche** (`/commander-pour`) : comme le paiement (§ 5.7) mais en page. Gabarit `colonnes` :
  à gauche le proche, les articles et le mot ; à droite le total en francs et en euros ou dollars, les frais de
  carte, la carte et « Payer ».
- **À payer pour mes proches** (`/paniers-proches`) : `maitre-detail` dès TL (les paniers reçus, en attente d'abord |
  le détail du panier avec « Payer » et « Refuser avec un mot »).
- **Envoyer au proche** (composant `EnvoyerAuProche`) : modale large.
- **Comptes diaspora : tout savoir** (`/diaspora-infos`) : colonne de lecture (760), avec un sommaire collant à
  gauche (220) dès O.
- **S'inscrire depuis l'étranger** (`/inscription-diaspora`) : gabarit `arrivee`.

### 5.15 Arrivée (CL-03)

| Écran | Disposition dès T (carte centrée) ; dès O (écran partagé, § 4.6) |
|---|---|
| Lancement `/lancement`, Ouverture `/ouverture` | plein écran, animation centrée, avec la même échelle que sur le téléphone, ×1,25 dès TL. Pas d'écran partagé |
| Bienvenue `/bienvenue` | écran partagé : à gauche l'illustration et le choix de langue ; à droite « Comment ça marche en 3 temps » et le bouton |
| Centres d'intérêt `/interets` | à gauche, la photo « Mode, maison… » ; à droite, les tuiles d'univers en grille de 3 (au lieu de 2), puis « Passer » et « Continuer » |
| Connexion `/connexion` | à gauche, la photo d'accueil, le logo, le relais habituel et sa distance ; à droite, Google, Apple, e-mail, numéro, « Découvrir sans compte », conditions. Posée sur le panier (`?next=/panier`) : modale |
| Connexion e-mail, Mot de passe oublié, Ton numéro, Changer de numéro, Conditions, Face ID | colonne de 480 à droite ; à gauche, la même photo que la connexion (un seul visuel, cohérent dans le parcours). Conditions : colonne de lecture |
| Choisir mon relais `/relais-choix` | `colonnes` dès TL : à gauche, le relais habituel et la liste des autres relais ; à droite, la carte (OSM ou Google) collante, avec les relais en repères. Le clic sur un repère choisit le relais dans la liste |
| Adresse de livraison `/adresse` | modale large : les champs à gauche, la carte à droite |
| Avant de payer, première commande `/premiere-commande` | comme Passer commande (§ 5.7), en page : les choix à gauche, le récapitulatif et « Payer » à droite |
| Proposition de notifications | modale posée sur la carte de la commande |

### 5.16 Autres écrans

- **Menu** (`/menu`) : dès TL, c'est une **page « Plan du site »** dans `.l-moyen`. Les blocs de `Menu.tsx` sont
  rangés en 3 colonnes de cartes, dans le même ordre (Espace diaspora, À découvrir, Catégories, Wallet, Mes achats,
  Deviens vendeur, Services, Aide et contact, Préférences, Pages légales et À propos). Le lien reste dans le pied
  de page.
- **Kit des composants** (`/kit`) : `.l-moyen`, composants en grille de 2.
- **Introuvable** et **Quelque chose s'est mal passé** (`Garde.tsx`) : `centre`, avec l'en-tête de site et le pied
  de page.
- **Page provisoire** : `centre`.

---

## 6. Règles d'interaction sur ordinateur

### 6.1 Survol (souris seulement, `@media (hover:hover) and (pointer:fine)`)

- **Carte produit** : élévation de 2 px, ombre `--shadow-pop`, image zoomée à 1,03 (transition 180 ms). Le bouton
  d'ajout est toujours visible : on ne cache rien au survol, parce que le clavier et le tactile doivent tout voir.
- Liens de navigation : couleur `--or-txt`. Lignes de liste : fond `--sand-2`. Boutons : teinte plus soutenue
  (`filter: brightness(1.05)`) et curseur main.
- Info-bulles (rail des catégories, icônes de l'en-tête) : après 400 ms, `role="tooltip"`. Elles apparaissent
  aussi au focus du clavier.
- Rien d'essentiel n'apparaît **seulement** au survol.

### 6.2 Focus du clavier

- L'anneau actuel (`site.css`, `outline: 2px solid var(--or-txt)`) s'applique à tout. Dans les zones sombres
  (bandeau de nuit, carte orange), l'anneau devient blanc.
- Ordre de tabulation : lien d'évitement, en-tête (logo, recherche, icônes, compte), navigation, colonne gauche,
  contenu, aside, pied de page.
- Modales, tiroirs et menus déroulants : focus enfermé, retour au déclencheur à la fermeture.

### 6.3 Raccourcis

| Touche | Effet | Où |
|---|---|---|
| `/` | met le focus dans la recherche de l'en-tête | partout, sauf dans un champ |
| `Échap` | ferme la feuille, la modale, le tiroir, le menu ou le panneau de recherche | partout |
| `←` `→` | photo précédente et suivante | galerie, carrousel focalisé, rails focalisés |
| `↑` `↓` puis `Entrée` | parcourir et choisir | suggestions de recherche, menus déroulants, méga-menu |
| `Alt` + `↑` | remonter en haut | partout (même action que `data-act=top`) |

Pas d'autre raccourci : on ne surcharge pas. Les raccourcis sont listés dans l'aide (« Raccourcis clavier »).

### 6.4 Menus déroulants et méga-menu

- **Ouverture au clic** pour le menu du profil, les notifications, le tri et « Plus ». Pas d'ouverture au survol :
  on évite les menus qui s'ouvrent par accident.
- **Méga-menu « Catégories »** (navigation, dès TL) : il s'ouvre au clic, ou au survol après 150 ms avec une marge
  de tolérance en diagonale. Il se ferme 300 ms après la sortie, ou par Échap. Sa disposition :
  - largeur du conteneur, panneau sous la barre de navigation ;
  - **à gauche**, les 10 univers (240) ;
  - **au centre**, les sous-catégories de l'univers survolé ou focalisé, en 3 colonnes, avec leur nombre ;
  - **à droite** (280), la bannière de l'univers et son « Tout voir », puis « En promotion dans cet univers ».
  Les nombres sont réels et lus dans le catalogue.
- Le tri des listes devient un **menu déroulant natif stylé** (`select` ou bouton et liste avec le rôle
  `listbox`).

### 6.5 Navigation active et bulle de verre

- Sur la barre du bas (jusqu'à 1023 px), la bulle de verre est inchangée (glisser, loupe, ressort, flèches du
  clavier, version simple quand les animations sont réduites).
- Dès TL, sur la barre de navigation, **la capsule de verre** est l'équivalent de bureau. C'est une pastille
  `.glass` aux mêmes effets visuels (reflet en haut, liseré irisé fin, clair et sombre) posée sous le lien actif.
  - Au **survol** d'un autre lien, elle s'y étire et y glisse avec le ressort de `BarreBas.tsx` (mêmes constantes,
    durée raccourcie à 260 ms). Elle revient au lien actif à la sortie de la barre.
  - Au clic, elle s'y pose et la page s'ouvre.
  - Au clavier, elle suit le focus.
  - Animations réduites : pas de glisse, elle se pose directement.
  - Implémentation : `useBulle` reçoit un mode `survol` (pas de saisie au doigt, pas de loupe).

### 6.6 Animations

- Durées : celles du téléphone (`animations.css`, déjà raccourcies de 15 %). On n'ajoute aucune animation de
  page entière (pas de fondu entre pages).
- **Jet au panier** : depuis l'image du produit vers l'icône panier de l'en-tête de site, qui est la cible
  visible quand le dock est masqué. `ciblesPanier()` trouve déjà `header.hd a[href="/panier"]` ; il faut ajouter
  le nouvel en-tête au sélecteur (`header.hd-site`). Le rebond du badge est inchangé.
- Carrousels : défilement automatique arrêté au survol, au focus et quand les animations sont réduites.
- Colonnes qui se plient ou se déplient : 200 ms sur la largeur de la grille. Le contenu ne bouge pas pendant
  l'animation (pas de saut de défilement).
- `prefers-reduced-motion` et `html[data-anim=reduites]` : tout ce qui précède se coupe, comme aujourd'hui.

### 6.7 Fil d'Ariane

Il est présent dès TL sur la fiche produit, la liste d'un univers, les résultats de recherche, les catégories et
toutes les pages enfants (§ 3.4). La chaîne vient de `NAVIGATION[route].retour`. Pour la fiche, c'est univers ›
sous-catégorie › produit (le fil existe déjà dans `Fiche.tsx`). Il est absent de l'accueil et des pages `web`.

### 6.8 Pagination et défilement infini

- Listes de produits (liste d'un univers, résultats, promotions, sélection, ventes flash) : **défilement infini,
  puis le bouton « Voir plus » après 3 chargements automatiques**. On reste sur la même page, et le pied de page
  reste atteignable. Le nombre affiché et le nombre total sont indiqués sous la grille (« 72 sur 283 produits »).
- Commandes, notifications, factures, historique du Wallet, litiges : « Voir plus » simple (pas d'infini). C'est
  déjà le comportement de « Voir les notifications plus anciennes ».
- Pas de pagination numérotée : elle est inutile pour ces volumes et étrangère à l'application.

### 6.9 Tailles de cible

- Tablette (`tab`, `tab-l`) : 44 × 44 au moins (tactile).
- Ordinateur avec pointeur fin : 32 × 32 au moins, et 40 pour les icônes de l'en-tête. Le texte cliquable a
  8 px de marge de clic verticale.
- Les boutons principaux font 48 de haut (inchangé) et 200 de large au moins dès TL. Ils ne s'étirent jamais
  au-delà de 360, sauf dans un aside, où ils prennent toute sa largeur.

---

## 7. Principes

1. **Rien ne disparaît.** Toute fonction du téléphone existe à chaque palier, au même nombre de gestes ou moins.
   Quand un bloc change de place (Flash Deals, colis au relais, barres d'achat), il est **déplacé, jamais
   dupliqué** : la version affichée est choisie par `useEcran()`, ou par CSS quand il suffit de cacher la
   réplique. Chaque déplacement est listé dans ce document.
2. **Un seul site.** Mêmes routes, mêmes écrans, mêmes composants, mêmes classes du prototype. Les ajouts sont
   peu nombreux : `larges.css`, `ecran.ts`, `Gabarits.tsx`, `EnTeteSite`, `PiedDePage.tsx`, la prop `forme` de
   `Feuille`, la prop `gabarit` de `Ecran` et le mode `survol` de `useBulle`. Les écrans reçoivent au plus une
   prop de gabarit et le rangement de leurs blocs en zones.
3. **Le téléphone d'abord, intact.** Aucune règle de `larges.css` ne s'applique sous 600 px. Entre 600 et 767 px,
   seules jouent la largeur de `#app`, celle du contenu et celle des grilles. Les tests au pixel
   (`identique.spec.ts`) et le squelette (`squelette.spec.ts`, de 360 à 430 px) restent inchangés et verts.
4. **Le contenu, les chiffres et les règles ne changent pas.** Les chiffres viennent des mêmes sources (données
   de démonstration à remplacer, mêmes formules).
5. **Le dessin d'origine est respecté.** Les en-têtes de page dessinés, les cartes, les couleurs, les rayons et le
   verre gardent leur style. On n'ajoute pas de décor qui n'existe pas sur le téléphone.
6. **Accessibilité.**
   - Repères (`header`, `nav`, `main`, `aside` nommés, `footer`) et lien d'évitement.
   - Ordre du DOM égal à l'ordre de lecture (l'aside après le contenu, sauf quand c'est décidé).
   - Focus visible et enfermé dans les modales, `aria-current` et `aria-expanded`.
   - Contraste AA en clair et en sombre (les jetons existants le tiennent ; à vérifier sur les nouvelles
     surfaces : pied de page, menus).
   - Taille du texte (85 à 140 %) respectée : à 140 %, les gabarits à 3 colonnes passent à 2 (la colonne droite
     se replie sous le contenu).
   - Lecteur d'écran : le panneau de recherche est une `combobox` avec `aria-activedescendant`.
7. **Performances.**
   - Pas de JavaScript de plus sur téléphone : `EnTeteSite`, `PiedDePage` et les colonnes ne sont montés que
     dès leur palier.
   - CSS de grand écran dans un seul fichier, environ 15 Ko au plus non compressé.
   - Images : `srcset` et `sizes` sur les bannières et les cartes, pour que le grand écran charge la bonne
     définition et le téléphone pas plus qu'aujourd'hui. Chargement différé hors de l'écran (déjà en place) ;
     données économes respectées.
   - Pas de mise en page qui saute : les colonnes ont une largeur réservée dès le premier rendu (palier lu de
     façon synchrone au démarrage avec `matchMedia`).
8. **Clair et sombre** : chaque nouvelle surface (en-tête de site, barre de navigation, menus, pied de page, rail,
   modales) n'utilise que les jetons du thème, sans couleur écrite en dur.

---

## 8. Plan d'implémentation par lots

Chaque lot est indépendant une fois le lot 0 fait. Chaque lot se commite seul, après les trois vérifications
(logique, visuel, tests). Les lots 1 à 4 viennent avant les lots d'écrans ; les lots 5 à 14 sont indépendants
entre eux.

| Lot | Contenu | Fichiers |
|---|---|---|
| **0. Fondations** | Paliers et variables (`--hd-h`, marges, conteneurs) ; `useEcran()` et `html[data-ecran]` ; `#app` sans 430 px dès 600 ; `main` avec barre fine, `tabindex` et focus à chaque route ; marge haute en `var(--hd-h, …)` ; conteneurs `.l-*` et requêtes de conteneur des grilles produits ; largeur et alignement des barres absolues | `src/styles/larges.css` (nouveau, importé dans `main.tsx` après `site.css`), `src/composants/ecran.ts` (nouveau), `src/composants/coque.tsx` (`Ecran`), `src/main.tsx` |
| **1. En-tête et navigation** | `EnTeteSite` (bandeau, ligne principale, recherche en vrai champ et panneau, raccourci `/`), barre de navigation et capsule de verre, méga-menu Catégories, barre de titre de page et fil d'Ariane, dock en capsule centrée (`tab`), dock masqué dès `tab-l` | `coque.tsx`, `BarreBas.tsx` (mode `survol`), `src/composants/MegaMenu.tsx` (nouveau), `src/composants/FilAriane.tsx` (nouveau), `CL-05/Commun.tsx` (accueil de recherche et suggestions extraits en composants réutilisables), `larges.css` |
| **2. Menus, panneaux, pied de page** | Menu du profil déroulant ; panneau des notifications ; `PiedDePage` ; toasts, bouton remonter, assistant flottant, bandeau démo ; lien d'évitement | `MenuProfil.tsx`, `CL-10/Notifications.tsx` (extraire `LigneNotification`), `src/composants/PiedDePage.tsx` (nouveau), `BandeauDemo.tsx`, `AvisErreurs.tsx`, `larges.css` |
| **3. Feuilles** | Prop `forme` (`modale`, `large`, `tiroir`), bouton fermer, focus enfermé, forme de chaque feuille du tableau § 3.9 | `Feuille.tsx`, écrans qui appellent `Feuille` (une prop chacun), `prototype.css` intouché, `larges.css` |
| **4. Gabarits** | `Gabarit`, `Colonne`, `Aside` ; les sept gabarits ; colonne Catégories (rail et dépliée, gardée) ; colonne droite ; carte d'identité et menu du compte | `src/composants/Gabarits.tsx` (nouveau), `src/composants/ColonneCategories.tsx` (nouveau), `src/composants/MenuCompte.tsx` (nouveau, lit les mêmes données que `CL-13/Compte.tsx`), `coque.tsx` (prop `gabarit`), `larges.css` |
| **5. Accueil et catégories** | § 5.1, 5.2 ; déplacement de Flash Deals et de `.h0-float` | `CL-04/Accueil.tsx` (attention : écran généré, retouche minimale par zones), `CL-04/Categories.tsx`, `styles/ecrans/57f763a2e1.css` et `1c3d953197.css` lus, non modifiés |
| **6. Listes et recherche** | § 5.3, 5.3.1 ; panneau de filtres en place ; grille ou lignes ; « Voir plus » | `CL-04/VueListe.tsx`, `Liste.tsx`, `Promotions.tsx`, `Selection.tsx`, `CL-05/*.tsx`, `Catalogue.tsx`, `CL-14/VentesFlash.tsx` |
| **7. Fiche produit** | § 5.4, 5.5 | `CL-06/Fiche.tsx`, `Galerie.tsx`, `Avis.tsx`, `Question.tsx`, `site.css` (règles `.fp-*` existantes intouchées ; ajouts dans `larges.css`) |
| **8. Panier et paiement** | § 5.6, 5.7 | `CL-07/Panier.tsx`, `Sauvegardes.tsx`, `CL-08/*.tsx`, `CL-03/PremiereCommande.tsx` |
| **9. Commandes, notifications, litiges** | § 5.8, 5.9, 5.10 ; maître-détail des commandes et des litiges | `CL-09/*.tsx`, `CL-10/*.tsx`, `CL-11/*.tsx`, `CL-12/*.tsx` |
| **10. Compte** | § 5.11 ; gabarit `compte` sur toutes ses pages ; messagerie, factures et légal en maître-détail | `CL-13/*.tsx`, `src/pages/profil/*.tsx` |
| **11. Abonnements, listes, assistant** | § 5.12 | `CL-14/*.tsx` |
| **12. Modules CL-15 et WhatsApp** | § 5.13 | `CL-15/*.tsx` |
| **13. Diaspora et pages web publiques** | § 5.14, gabarit `web` ; `.cl12-safari` masquée | `src/pages/diaspora/*.tsx`, `CL-12/Payeur.tsx`, `PayeurPreuve.tsx`, `CL-14/ListePublique.tsx`, `ListeOffrir.tsx`, `ListeOffert.tsx`, `AbonnementOffrir.tsx`, `CL-15/CotisationParticiper.tsx`, `CL-10/LienCourt.tsx` |
| **14. Arrivée** | § 5.15, gabarit `arrivee` | `CL-03/*.tsx` |
| **15. Menu, kit, erreurs** | § 5.16 | `pages/Menu.tsx`, `CL-01/Kit.tsx`, `Introuvable.tsx`, `PageProvisoire.tsx`, `Garde.tsx` |
| **16. Tests de grand écran** | § 9 | `tests/larges.spec.ts` (nouveau), `tests/fichiers/` (captures de référence, après validation du porteur) |

Ordre conseillé : 0, 1, 2, 3, 4, puis 5 (le plus visible), 6, 7, 8, 9, 10, puis 11 à 15 dans n'importe quel
ordre ; le lot 16 grandit à chaque lot (chaque lot ajoute ses routes à la spec).

---

## 9. Stratégie de test

1. **Les tests de téléphone ne bougent pas.** `identique.spec.ts` (au pixel, 375 px) et `squelette.spec.ts` (360 à
   430 px, clair, sombre, anglais, grande et très grande taille) tournent sans changement et restent verts après
   chaque lot. Un échec à cet endroit bloque le lot.
2. **Nouvelle spec `tests/larges.spec.ts`**, sur toutes les routes ouvertes (même inventaire que le squelette :
   `genere/pages.json` et `pages-site.json`), aux tailles **768 × 1024, 1024 × 768, 1280 × 800, 1440 × 900 et
   1920 × 1080**, plus 600 × 960 pour le palier `tel-l`. Contrôles :
   - **aucun défilement horizontal** : `document.documentElement.scrollWidth <= innerWidth` et
     `main.scrollWidth <= main.clientWidth` ; aucun élément visible dont `getBoundingClientRect().right` dépasse
     la fenêtre de plus d'un pixel ;
   - **coque attendue** : un seul `header` de site ; `nav.dock` visible si et seulement si la largeur est sous
     1024 ; `nav.hd-nav` visible si et seulement si elle est d'au moins 1024 ; pied de page présent dès 768 (sauf
     les écrans `aucun` et les paiements en cours) ; colonne Catégories présente sur les routes du gabarit
     catalogue dès 1024 ;
   - **pas de barre fixée en bas** dès 1024 (`.fp-bar`, `.cl07-bar`, `.cl09-bar`, `.cl11-bar`, `.buybar` sont
     masquées) et le bouton principal correspondant est visible dans l'aside ;
   - **feuilles** : ouvrir une feuille de chaque forme (`?sheet=`), puis vérifier qu'elle est centrée (modale) ou
     à droite (tiroir), que le focus est dedans et qu'Échap la ferme ;
   - **aside collant** : après un défilement de 1 000 px, l'aside du panier, de la fiche et de la commande est
     encore dans la fenêtre ;
   - **raccourci `/`** : le focus arrive dans le champ de recherche ;
   - **liens** : aucun lien vers une adresse inconnue (même contrôle que le squelette) ;
   - **rendus** : clair et sombre à 1440 ; anglais à 1280 ; très grande taille du texte à 1280 (aucun débordement).
3. **Captures** : chaque route, à chaque taille, en clair, et à 1440 en sombre, enregistrée dans
   `test-results/larges/<route>-<largeur>[-sombre].png` pour la revue du porteur. Une fois une page validée, sa
   capture entre dans `tests/fichiers/larges/` et devient une comparaison au pixel (même mécanique que
   `identique.spec.ts`, avec le même `retries: 1` pour les flous).
4. **Vérification en trois étapes** à chaque lot : logique (rien ne disparaît : la liste des actions de l'écran est
   comparée entre 375 et 1440), visuel (captures relues à côté des captures d'inspiration), tests (les trois specs
   vertes). Le lot n'est commité qu'ensuite.
5. **Contrôle à la main** avant de fermer un lot : clavier seul (Tab, `/`, Échap, flèches) sur les écrans du lot,
   à 1280 ; tablette réelle ou simulée à 768 et 1024 en tactile (`hasTouch`) ; zoom du navigateur à 200 %
   (doit retomber proprement au palier inférieur).
