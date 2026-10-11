# Disposition des écrans de l'espace vendeur : tablette et ordinateur

Vague 4, 6 octobre 2026. Ce document dit où va chaque bloc de l'espace vendeur quand l'écran est plus large qu'un
téléphone. Il suit la méthode du client (`site/DISPOSITION-ECRANS.md`) : mêmes paliers, même capsule de verre, mêmes
modales. Il ne change ni le contenu, ni les règles, ni les couleurs : seules la place et la largeur des blocs changent.
**Sous 768 px, rien ne bouge** (le téléphone reste identique au pixel : `tests/identique.spec.ts`).

**Ordinateur (≥ 1024 px), 6 oct.** : d'après l'interface vendeur réelle (`logique-metier/vendeur/INTERFACE-REELLE.md`,
captures du porteur), en plus simple et plus lisible : **barre latérale groupée** à gauche, **en-tête fin** à sa
droite, **contenu centré** à largeur maximale, **grilles** là où elles aident (§ 5). Mêmes règles que partout : pas de
retrait à la demande (versement du vendredi), pas de visibilité payante (« Se faire voir », au mérite), aucune
commission affichée par vente (GAI-01 : le vendeur voit ce qu'il garde).

Code : `src/composants/larges.tsx` (barre de titre, pied de page, tiroir, barre latérale), `src/config/navigation.ts`
(groupes, `ROUTES_LARGES`), `src/composants/coque.tsx` (`Ecran` : en-tête de site
dès 768 px), `src/styles/larges.css` (toutes les règles, en `min-width`), et du client, réutilisés tels quels :
`@client/composants/ecran` (`useDes`), `@client/composants/Feuille` (`FeuillesLarges`). Tests : `tests/larges.spec.ts`.

## 1. Les décisions

1. **Paliers du client.** `tel` < 600, `tel-l` 600–767, `tab` 768–1023, ordinateur (`tab-l`) dès 1024.
2. **En-tête de site dès 768 px.** Les éléments de l'en-tête racine du téléphone (menu, logo, « Espace vendeur ·
   boutique », pastilles d'état, thème, langue, cloche, avatar), mêmes classes et mêmes dessins, rangés sur une ligne
   de 960 px au plus, centrée. Sa hauteur est **mesurée** (`--hd-h` sur `#app`) : le contenu commence dessous, même
   quand les pastilles passent à la ligne (aucune pastille coupée). Sans session (ouverture de la boutique, code,
   pièces) : logo, libellé, thème et langue seulement, sans pied de page.
3. **Navigation : la barre du bas en verre**, en **capsule flottante centrée** de 520 px au plus, avec sa bulle de
   verre liquide, ses badges et le point « Argent gelé ».
4. **Pages enfants.** L'en-tête enfant du téléphone devient la **barre de titre** en tête du contenu (même balisage
   `.hd-sub`) : retour mémorisé (`RetourMemoire` du client), titre.
5. **Contenu : la colonne du téléphone, élargie à 640 px et centrée** (`--l-max`). Les cartes, listes et formulaires
   gardent leur ordre et leur pile de boutons.
6. **Feuilles → modales centrées** dès 768 px (560 px ; « large » 720), même adresse, même voile, Échap, bouton
   « Fermer ». **Menu du profil** ancré sous l'avatar, sans voile sombre. **Toasts et annonces** centrés sur le
   contenu, au-dessus de la capsule.
7. **Pied de page dès 768 px** : raccourcis du quotidien, de la boutique, aide, coordonnées et réseaux officiels de
   BelivaY (`@client/config/coordonnees` : +237 689 002 812, contact@belivay.com, Facebook, Instagram, TikTok), lien
   vers l'espace client. Le lien de la page ouverte porte `aria-current="page"`.
8. **En-têtes à design intouchables.** Cartes de tête (nuit, braise), photos, logo, motifs gardent forme, couleurs et
   typographie ; ils prennent la largeur de la colonne.
9. **Rien ne disparaît.** Chaque fonction du téléphone a sa place ; les écrans ne sont pas récrits : des media queries,
   un fichier de styles, une variante de la coque.

## 2. La coque, palier par palier

| Palier | En-tête | Navigation | Contenu | Pied |
|---|---|---|---|---|
| `tel` < 600 | en-tête du prototype (racine ou enfant) | barre du bas en verre | colonne de 430 px | — |
| `tel-l` 600–767 | idem | idem | colonne de 640 px centrée | — |
| `tab` 768–1023 | en-tête de site (une ligne de 960 px au plus ; pastilles sur 2 lignes au besoin) | barre du bas en capsule centrée (520 px) | colonne de 640 px centrée ; titre des pages enfants dans le contenu | oui |
| ordinateur ≥ 1024 (avec session) | en-tête fin à droite de la barre latérale : boutique et pastilles, thème, langue, cloche, avatar → Mon profil | barre latérale de 264 px (logo, carte de la boutique, groupes, « Tout le menu », « Retour au site ») ; ni barre du bas ni tiroir | 760 px centrés ; 1080 px pour les pages de listes et de tableaux | oui |

`main` reste l'unique zone qui défile ; dès 768 px il prend le focus à chaque changement de page (Espace, flèches)
et sa barre de défilement devient fine et visible.

## 3. Écran par écran

Légende : **C** = colonne de 640 px centrée, **T** = barre de titre dans le contenu (pages enfants), **S** = en-tête de
site sans session (logo, thème, langue).

| Groupe | Routes | Disposition dès 768 px |
|---|---|---|
| VD-03 Accès | `connexion`, `lancement`, `faceid` | Sans en-tête de site (leur en-tête propre, intouchable) ; C. |
| VD-03 Ouverture | `ouvrir`, `otp`, `kyc`, `saisie_assistee`, `installer`, `bienvenue_client` | S ; T ; C ; boutons en fin de colonne. |
| VD-04 Accueil | `accueil`, `accueil_calme`, `premier_jour`, `horsligne`, `suspendu` | En-tête de site avec pastilles ; C (la carte braise « à préparer » garde son dessin). |
| VD-05 Commandes | `commandes` | En-tête de site ; C ; la feuille « Exporter, factures » en modale. |
| VD-05 Préparation | `commande`, `rupture`, `delai`, `bon`, `journal` | T ; C. |
| VD-06 Remise | `commande_prete`, `commande_remise`, `recu`, `erreurs` | T ; C (code de remise et reçu lisibles d'un coup d'œil). |
| VD-07 Litiges | `litiges`, `litige`, `litige_envoye`, `retours`, `inspection`, `remplacement` | T ; C. |
| VD-08 Produits | `produits`, `offre_detail`, `offre1`, `fiche`, `offre2`, `offre3`, `offre4`, `offre_publiee`, `dupliquer` | T (sauf `produits` : en-tête de site) ; C. « Ajouter un produit » est refait par un autre agent : rien de propre à VD-08 ici. |
| VD-08 Caméra | `camera` | Sans en-tête (viseur du prototype) ; C. |
| VD-09 Argent | `argent`, `se_libere`, `gele`, `gains`, `documents`, `versements`, `numero_versement` | En-tête de site (`argent`) ou T ; C. |
| VD-10 Confiance et plans | `palier`, `score`, `paliers`, `sanctions`, `contester`, `plans_liste`, `plans`, `visibilite`, `services`, `chiffres`, `demande` | T ; C ; feuilles (plan, service, vitrine) en modales. |
| VD-11 Boutique et compte | `menu`, `boutique`, `horaires`, `emplacement`, `equipe`, `parametres`, `securite`, `notifications`, `avis`, `messages`, `aide` | T ; C. Le Menu reste la page qui rassemble tout. |
| Retirés | `telephone`, `verrouille`, `android`, `ile` | Démonstrations du téléphone (raison dans `src/genere/pages.json`). |

## 4 bis. Ordinateur, page par page (dès 1024 px)

- **Barre latérale** (`BarreLaterale`, même liste que le tiroir : `config/navigation.ts`) : Ventes (Tableau de bord,
  Commandes avec leur badge, Litiges, Retours, Ramassages, Messagerie, Questions des clients) · Catalogue (Mes
  produits, Stock et inventaire, Ajouter un produit) · Croissance (Mes chiffres, Promotions, La demande, Se faire
  voir) · Boutique (Ma boutique, Mon palier, Plans, Avis, Horaires, Livraison et colis, Activité, Mon équipe) · Mon
  compte (Mon argent, Versements, Fonds en attente, Relevés et factures, Paramètres, Sécurité, Aide) ; puis « Tout le
  menu et les préférences » et « Retour au site » (espace client). L'accès Préparation n'y voit aucune entrée de
  montants. Pas de « Passer au Pro » publicitaire ni de « Boost » : les plans restent une page, la visibilité se
  gagne.
- **Contenu large (1080 px)** : `accueil`, `commandes`, `litiges`, `retours`, `produits`, `offre1`, `stock`,
  `promotions`, `questions`, `argent`, `versements`, `documents`, `chiffres`, `demande`, `activite`, `ajustements`,
  `ramassages`, `recherche`, `avis`, `messages`. Les autres pages (détails, formulaires, réglages) : 760 px.
- **Tableau de bord** (`accueil`) : ce qu'il y a à faire à gauche (carte braise intouchable), à droite le livreur,
  les alertes, le stock bas et « Ajouter un produit » ; « Votre activité » en cartes (jalons et objectif sur la
  largeur, revenus et carte de chaleur côte à côte).
- **Compteurs en ligne** : Stock (quatre tuiles), filtres des listes sur une ligne ; **listes larges** : commandes,
  produits, litiges en lignes pleine largeur.
- **Nouveau produit** (`offre1`) : deux colonnes (produit et photos à gauche, prix et stock à droite, « vous gardez »
  en direct).
- **En-têtes à design** (cartes nuit et braise, photos, logo, motifs) : inchangés, à la largeur de leur colonne ; sur
  téléphone, rien ne bouge.

## 4. Vérifications

- `tests/larges.spec.ts` : toutes les routes ouvertes à 600, 768, 900, 1023 et 1280 px :
  aucune erreur, aucun défilement horizontal, aucun élément hors de la fenêtre, aucun texte rogné ; coque (un seul
  en-tête, en-tête de site dès 768, capsule centrée qui navigue, pied de page, contenu sous l'en-tête, liens connus) ;
  titre des pages enfants et retour mémorisé ; menu du profil ancré ; feuilles en modales ; rendus sombre, anglais et
  très grand texte à 768 px ; vue ordinateur à 1280 et 1440 px (barre latérale et ses groupes, en-tête fin, contenu
  après la barre, avatar → Mon profil, aucune erreur, aucun débordement).
- `BOUTONS_LARGEUR=768` et `BOUTONS_LARGEUR=1280 npx playwright test tests/boutons.spec.ts` : chaque élément cliquable
  de chaque route a un effet à ces largeurs aussi.
- `A11Y_LARGEUR=1280 npx playwright test tests/accessibilite.spec.ts` : mêmes contrôles d'accessibilité qu'à 375 px.
