# Suivi des règles, une à une

1669 règles tirées de `regles.json` (registre complet de CL-16). Remplacez ☐ par ☑ quand une étape est faite :

- **Revue** : règle lue et comprise, avec ce qu’elle demande à l’écran et au serveur ;
- **Écran** : appliquée dans le site (front React) ;
- **Serveur** : appliquée dans le serveur (back Django), quand elle le concerne ;
- **Test** : vérifiée par un test automatique ou par la recette.

Ce que demande chaque statut (CL-01, « Statuts des règles et des valeurs ») :

- **Décidé** et **Recommandé** : à implémenter tel quel ; une objection à une règle « Recommandé » passe par le porteur du produit, pas par le code ;
- **Proposé** : la valeur est lue dans un paramètre, modifiable dans la console sans redéploiement ;
- **À trancher** : la valeur proposée est lue dans un paramètre ; seule la mise en production attend la décision, à noter dans la colonne Décision (CCH-21).

## Sommaire

| Document | Règles | À trancher | Proposé | Recommandé | Décidé |
|---|---|---|---|---|---|
| [CL-01](#cl-01) | 115 | 1 | 0 | 19 | 95 |
| [CL-02](#cl-02) | 132 | 2 | 1 | 41 | 88 |
| [CL-03](#cl-03) | 87 | 1 | 0 | 34 | 52 |
| [CL-04](#cl-04) | 77 | 1 | 0 | 9 | 67 |
| [CL-05](#cl-05) | 66 | 0 | 0 | 14 | 52 |
| [CL-06](#cl-06) | 92 | 1 | 2 | 21 | 68 |
| [CL-07](#cl-07) | 98 | 3 | 0 | 21 | 74 |
| [CL-08](#cl-08) | 89 | 0 | 0 | 23 | 66 |
| [CL-09](#cl-09) | 116 | 1 | 1 | 26 | 88 |
| [CL-10](#cl-10) | 101 | 2 | 1 | 24 | 74 |
| [CL-11](#cl-11) | 129 | 9 | 0 | 17 | 103 |
| [CL-12](#cl-12) | 72 | 1 | 0 | 15 | 56 |
| [CL-13](#cl-13) | 88 | 1 | 3 | 26 | 58 |
| [CL-14](#cl-14) | 151 | 1 | 0 | 47 | 103 |
| [CL-15](#cl-15) | 154 | 7 | 36 | 47 | 64 |
| [CL-16](#cl-16) | 102 | 2 | 0 | 8 | 92 |
| **Total** | **1669** | **33** | **44** | **392** | **1200** |

## CL-01

| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |
|---|---|---|---|---|---|---|---|
| | | **Les principes non négociables** | | | | | |
| CCH-01 | Décidé | Argent bloqué jusqu’au retrait | | ☑ | ☐ | ☐ | ☐ |
| CCH-02 | Décidé | Retrait près de chez soi | | ☑ | ☐ | ☐ | ☐ |
| CCH-03 | Décidé | Délai ferme | | ☑ | ☐ | ☐ | ☐ |
| CCH-04 | Décidé | Prix livré réel | | ☑ | ☐ | ☐ | ☐ |
| CCH-05 | Décidé | Anonymat des boutiques | | ☑ | — | ☐ | ☐ |
| CCH-06 | Décidé | Aucun faux chiffre | | ☑ | ☐ | ☐ | ☐ |
| CCH-07 | Décidé | Zéro espèce | | ☑ | ☐ | ☐ | ☐ |
| CCH-08 | Décidé | Un seul service de tarification | | ☑ | — | ☐ | ☐ |
| CCH-09 | Décidé | Le code de retrait vaut le colis | | ☑ | ☐ | ☐ | ☐ |
| CCH-10 | Décidé | Aucun frais surprise | | ☑ | ☐ | ☐ | ☐ |
| CCH-11 | Décidé | L’IFA ne se montre jamais | | ☑ | ☐ | ☐ | ☐ |
| CCH-12 | Décidé | Canaux tracés | | ☑ | ☐ | ☐ | ☐ |
| | | **Les décisions qui priment** | | | | | |
| CCH-13 | Décidé | Quand deux textes se contredisent, la décision la plus récente l’emporte (tableau ci-dessus | | ☑ | — | — | ☐ |
| CCH-14 | Décidé | Si aucune source ne répond, la question va au porteur du produit | | ☑ | — | — | ☐ |
| CCH-15 | Décidé | Aucune valeur écrite dans le code | | ☑ | — | ☐ | ☐ |
| | | **Ordre de construction, lancement et après le lancement** | | | | | |
| CCH-16 | Décidé | Ordre de construction | | ☑ | — | — | ☐ |
| CCH-17 | Décidé | Lancement et après le lancement | | ☑ | ☐ | ☐ | ☐ |
| CCH-18 | Décidé | Interrupteur fermé : rien ne se voit | | ☑ | ☐ | ☐ | ☐ |
| CCH-19 | Recommandé | Un lien profond vers un module fermé ouvre l’état « Ce lien ne mène à aucune page » avec un seul bouton plein « Retour à l’accueil » | | ☑ | ☐ | — | ☐ |
| | | **Statuts des règles et des valeurs** | | | | | |
| CCH-20 | Décidé | Chaque règle et chaque valeur de ces documents porte un statut | | ☑ | — | ☐ | ☐ |
| CCH-21 | Décidé | Toutes les valeurs « À trancher » ont reçu une décision avant la mise en production (liste complète dans CL-16) | | ☑ | — | — | ☐ |
| | | **Charte de simplicité et d’écriture** | | | | | |
| CCH-22 | Décidé | Tutoiement partout | | ☑ | ☐ | — | ☐ |
| CCH-23 | Décidé | Une seule action principale | | ☑ | ☐ | — | ☐ |
| CCH-24 | Décidé | Des mots de tous les jours | | ☑ | ☐ | — | ☐ |
| CCH-25 | Décidé | L’essentiel en premier | | ☑ | ☐ | — | ☐ |
| CCH-26 | Décidé | Chaque information une seule fois par écran | | ☑ | ☐ | — | ☐ |
| CCH-27 | Décidé | États vides et d’erreur | | ☑ | ☐ | — | ☐ |
| CCH-28 | Décidé | Mêmes mots pour les mêmes choses | | ☑ | ☐ | — | ☐ |
| CCH-29 | Décidé | « Escrow BelivaY » ne s’écrit qu’aux endroits où la spec l’écrit | | ☑ | ☐ | — | ☐ |
| CCH-30 | Décidé | Casse et orthographe françaises | | ☑ | ☐ | — | ☐ |
| CCH-31 | Décidé | Montants | | ☑ | ☐ | — | ☐ |
| CCH-32 | Décidé | Dates et heures en mots | | ☑ | ☐ | — | ☐ |
| CCH-33 | Décidé | Numéros et identifiants | | ☑ | ☐ | ☐ | ☐ |
| CCH-34 | Décidé | Étiquettes et badges vrais | | ☑ | ☐ | ☐ | ☐ |
| CCH-35 | Recommandé | Icônes doublées de mots simples | | ☑ | ☐ | — | ☐ |
| CCH-36 | Décidé | Le temps prime sur la couleur | | ☑ | ☐ | — | ☐ |
| CCH-37 | Décidé | Notifications et SMS | | ☑ | — | ☐ | ☐ |
| | | **Interdits valables partout** | | | | | |
| CCH-38 | Décidé | Élément flottant | | ☑ | ☐ | — | ☐ |
| CCH-39 | Décidé | Pied de page | | ☑ | ☐ | — | ☐ |
| CCH-40 | Décidé | Compte à rebours artificiel, compteur de visiteurs, rareté simulée | | ☑ | ☐ | ☐ | ☐ |
| CCH-41 | Décidé | Tout chiffre non réel | | ☑ | ☐ | ☐ | ☐ |
| CCH-42 | Décidé | Nom, page, adresse, numéro, lien ou QR de boutique | | ☑ | ☐ | ☐ | ☐ |
| CCH-43 | Décidé | Prix barré sans remise réelle | | ☑ | ☐ | ☐ | ☐ |
| CCH-44 | Décidé | Placement payant ou produit sponsorisé dans la recherche | | ☑ | — | ☐ | ☐ |
| CCH-45 | Décidé | Suggestion commerciale au paiement ou juste après | | ☑ | ☐ | — | ☐ |
| CCH-46 | Décidé | « Reste à payer » | | ☑ | ☐ | — | ☐ |
| CCH-47 | Décidé | Espèces, pourboire, caution | | ☑ | ☐ | ☐ | ☐ |
| CCH-48 | Décidé | Code de retrait ou mot de passe à usage unique dans un push | | ☑ | ☐ | ☐ | ☐ |
| CCH-49 | Décidé | IFA, score, palier ou « niveau » du client affiché | | ☑ | ☐ | ☐ | ☐ |
| CCH-50 | Décidé | Carte du livreur en temps réel | | ☑ | ☐ | ☐ | ☐ |
| CCH-51 | Décidé | WhatsApp pour une commande, un panier, un paiement, un code, un litige, des photos ou des preuves | | ☑ | ☐ | ☐ | ☐ |
| CCH-52 | Décidé | Promotion par SMS | | ☑ | — | ☐ | ☐ |
| CCH-53 | Décidé | Promesse de retour sans motif | | ☑ | ☐ | — | ☐ |
| CCH-54 | Décidé | Écran blanc sans explication | | ☑ | ☐ | — | ☐ |
| | | **La coque : en-têtes, bandeau rotatif, barre du bas et badges** | | | | | |
| CNV-01 | Décidé | Barre du bas à cinq onglets | | ☑ | ☐ | — | ☐ |
| CNV-03 | Décidé | En-tête enfant | | ☑ | ☐ | — | ☐ |
| CNV-04 | Décidé | En-tête racine | | ☑ | ☐ | — | ☐ |
| CNV-05 | Décidé | Zones sûres iPhone | | ☑ | ☐ | — | ☐ |
| CNV-06 | Décidé | Cadre iPhone des captures | | ☑ | — | — | ☐ |
| CNV-07 | Recommandé | Badges | | ☑ | ☐ | ☐ | ☐ |
| CNV-08 | Recommandé | Écrans de tâche sans barre du bas | | ☑ | ☐ | — | ☐ |
| | | **Le Menu et le Plan du prototype** | | | | | |
| CNV-02 | Décidé | Le Menu est le vrai menu de l’application | | ☑ | ☐ | — | ☐ |
| CNV-09 | Recommandé | Plan du prototype, hors de l’application | | ☑ | — | — | ☐ |
| CNV-15 | Décidé | Chaque écran à sa place | | ☑ | ☐ | — | ☐ |
| | | **Feuilles du bas, retour arrière et liens profonds** | | | | | |
| CNV-10 | Recommandé | Retour arrière | | ☑ | ☐ | — | ☐ |
| CNV-11 | Recommandé | Feuilles du bas | | ☑ | ☐ | — | ☐ |
| CNV-12 | Décidé | Liens profonds | | ☑ | ☐ | ☐ | ☐ |
| CNV-13 | Recommandé | Un lien profond vers un écran qui demande un compte ouvre la connexion puis l’écran visé | | ☑ | ☐ | ☐ | ☐ |
| CNV-14 | Recommandé | États par paramètres | | ☑ | ☐ | — | ☐ |
| | | **Design system « Mandarine & Nuit »** | | | | | |
| CDS-01 | Décidé | Principe de la refonte du 25 septembre (décision du porteur du produit) | | ☑ | ☐ | — | ☐ |
| CDS-02 | Décidé | Verre dépoli | | ☑ | ☐ | — | ☐ |
| CDS-03 | Décidé | Thème sombre « Nuit » complet | | ☑ | ☐ | ☐ | ☐ |
| CDS-04 | Décidé | Vrai logo BelivaY | | ☑ | ☐ | — | ☐ |
| CDS-05 | Décidé | Produits en cartes, grille régulière | | ☑ | ☐ | — | ☐ |
| CDS-06 | Décidé | Montants en francs entiers, virgule décimale française | | ☑ | ☐ | — | ☐ |
| | | **Typographie, densité, rayons, ombres et verre** | | | | | |
| CDS-07 | Décidé | Plus Jakarta Sans | | ☑ | ☐ | — | ☐ |
| CDS-08 | Décidé | Rayons et ombres | | ☑ | ☐ | — | ☐ |
| | | **Icônes** | | | | | |
| CDS-09 | Décidé | Icônes Lucide au trait | | ☑ | ☐ | — | ☐ |
| | | **Composants du socle** | | | | | |
| CDS-10 | Décidé | Une seule carte clé (héros) par écran | | ☑ | ☐ | — | ☐ |
| CDS-11 | Décidé | Boutons | | ☑ | ☐ | — | ☐ |
| CDS-12 | Décidé | Couleurs d’état | | ☑ | ☐ | — | ☐ |
| CDS-13 | Décidé | Tout écran se construit avec les composants du socle | | ☑ | ☐ | — | ☐ |
| CDS-14 | Décidé | Vendeur anonyme | | ☑ | ☐ | ☐ | ☐ |
| CDS-15 | Décidé | Prix et prix livré | | ☑ | ☐ | ☐ | ☐ |
| CDS-16 | À trancher | Supplément de classe | | ☑ | ☐ | ☐ | ☐ |
| CDS-17 | Décidé | Pastilles d’état | | ☑ | ☐ | — | ☐ |
| CDS-18 | Décidé | Code de retrait | | ☑ | ☐ | — | ☐ |
| CDS-19 | Décidé | Jauge d’un colis | | ☑ | ☐ | — | ☐ |
| CDS-20 | Recommandé | Feuille du bas | | ☑ | ☐ | — | ☐ |
| CDS-21 | Recommandé | Rendu des messages | | ☑ | — | — | ☐ |
| CDS-22 | Décidé | Carte produit | | ☑ | ☐ | — | ☐ |
| CDS-23 | Décidé | Détails repliables et aide | | ☑ | ☐ | — | ☐ |
| CDS-24 | Décidé | Bandeau de réassurance | | ☑ | ☐ | — | ☐ |
| CDS-25 | Décidé | Carte de commande | | ☑ | ☐ | — | ☐ |
| CDS-26 | Recommandé | Composants hérités du vendeur | | ☑ | — | — | ☐ |
| CDS-27 | Décidé | Cartes teintées | | ☑ | ☐ | — | ☐ |
| CDS-28 | Décidé | Onglets segmentés et puces | | ☑ | ☐ | — | ☐ |
| CDS-29 | Décidé | Étapes | | ☑ | ☐ | — | ☐ |
| CDS-30 | Décidé | Titres de section à barre | | ☑ | ☐ | — | ☐ |
| CDS-31 | Décidé | Carte produit « Produits populaires » | | ☑ | ☐ | — | ☐ |
| | | **Illustrations, portraits et photos à produire** | | | | | |
| CDS-32 | Décidé | Images produit | | ☑ | — | — | ☐ |
| CDS-33 | Décidé | Portraits et scènes | | ☑ | — | — | ☐ |
| | | **Rendus : clair, sombre, anglais, pidgin, taille du texte, iPhone** | | | | | |
| CRD-01 | Décidé | Chaque écran existe en six rendus vérifiés | | ☑ | ☐ | — | ☐ |
| CRD-02 | Décidé | Français et anglais sur tous les écrans | | ☑ | ☐ | ☐ | ☐ |
| CRD-03 | Recommandé | Pidgin | | ☑ | ☐ | ☐ | ☐ |
| CRD-04 | Recommandé | Construction de l’anglais | | ☑ | ☐ | — | ☐ |
| CRD-05 | Recommandé | Taille du texte | | ☑ | ☐ | — | ☐ |
| | | **Accessibilité** | | | | | |
| CRD-06 | Décidé | Cibles tactiles d’au moins 44 px | | ☑ | ☐ | — | ☐ |
| CRD-07 | Décidé | Aucun texte sous 12 px | | ☑ | ☐ | — | ☐ |
| CRD-08 | Décidé | Contraste ≥ 4,5 : 1 | | ☑ | ☐ | — | ☐ |
| CRD-09 | Recommandé | Lecteurs d’écran | | ☑ | ☐ | — | ☐ |
| CRD-10 | Recommandé | Téléphones visés | | ☑ | ☐ | — | ☐ |
| | | **Mode dégradé, formatage et mode capture** | | | | | |
| CRD-11 | Décidé | Mode dégradé | | ☑ | ☐ | ☐ | ☐ |
| CRD-12 | Recommandé | Formatage | | ☑ | ☐ | ☐ | ☐ |
| CRD-13 | Recommandé | Mode capture du prototype | | ☑ | — | — | ☐ |

## CL-02

| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |
|---|---|---|---|---|---|---|---|
| | | **Le jeu d’essai** | | | | | |
| CDA-01 | Recommandé | Une seule source de chiffres pour les captures, les documents et la recette | | ☑ | — | — | ☐ |
| CDA-02 | Recommandé | Instant de référence | | ☑ | — | ☐ | ☐ |
| CDA-03 | Recommandé | Le jeu d’essai se charge en base comme jeu de recette (fixtures) | | ☑ | — | ☐ | ☐ |
| CDA-04 | Décidé | Les numéros de téléphone s’affichent masqués au milieu (« 6 77 ·· ·· 41 »), sauf dans le champ de saisie | | ☑ | — | ☐ | ☐ |
| CDA-05 | Décidé | Distance d’une carte produit = distance géodésique entre la boutique de l’offre attribuée et le relais sélectionné, en km arrondis à 0,1 | | ☑ | — | ☐ | ☐ |
| CDA-06 | Décidé | Un relais « En configuration » (KYC non validé) ou plein aujourd’hui n’est jamais proposé | | ☑ | — | ☐ | ☐ |
| | | **Le catalogue du jeu d’essai** | | | | | |
| CDA-07 | Décidé | Tout compteur affiché (univers, sous-catégorie, résultats, avis, ventes, recherches de la zone) est un COUNT réel renvoyé par le serveur | | ☑ | ☐ | ☐ | ☐ |
| CDA-08 | Décidé | Note affichée d’un produit maître = moyenne des notes vérifiées de tous ses vendeurs, à une décimale | | ☑ | — | ☐ | ☐ |
| CDA-09 | Décidé | Prix barré seulement si une remise est réellement pratiquée (P_barré > P) | | ☑ | — | ☐ | ☐ |
| CDA-10 | Recommandé | Couleurs de variantes du jeu d’essai | | ☑ | ☐ | ☐ | ☐ |
| | | **Le panier de référence (exemple 7.3) et ses variantes** | | | | | |
| CDA-11 | Décidé | Le panier de référence est l’exemple 7.3 de la spécification | | ☑ | — | — | ☐ |
| CDA-12 | Recommandé | Mixeur-blender et marmite sont des colis S | | ☑ | — | — | ☐ |
| CDA-13 | Recommandé | Chaque variante d’un écran (seuil, comptoir, XL, prix changé, carte) a son total recalculé par le service de tarification | | ☑ | — | ☐ | ☐ |
| | | **Les commandes de Carine** | | | | | |
| CDA-14 | Recommandé | Les huit commandes de Carine et la carte du paiement interrompu sont les seules de la liste « Mes commandes » | | ☑ | — | — | ☐ |
| CDA-15 | Recommandé | Le numéro de commande BLV-nnnnn est un identifiant opaque, jamais un compteur | | ☑ | ☐ | ☐ | ☐ |
| CDA-16 | Décidé | Un paiement interrompu n’est pas une commande | | ☑ | — | ☐ | ☐ |
| CDA-17 | Recommandé | Les badges sont renvoyés par le serveur | | ☑ | — | ☐ | ☐ |
| | | **Les valeurs ajoutées par les parties** | | | | | |
| CDA-18 | Recommandé | Les valeurs DX_clNN font partie du jeu d’essai commun | | ☑ | — | — | ☐ |
| CDA-19 | Recommandé | Une valeur « À trancher » montrée à l’écran (supplément M, L et XL, rangée minimale, fenêtre de notation, remboursement sans retour,… | | ☑ | — | — | ☐ |
| | | **Variantes, corrections de l’assemblage et points signalés** | | | | | |
| CDA-20 | Recommandé | Les écarts du jeu d’essai relevés par un document d’écran et corrigés à l’assemblage ne sont plus listés comme « à corriger » | | ☑ | — | — | ☐ |
| | | **Acteurs et cycle de vie** | | | | | |
| CCY-01 | Décidé | Sept acteurs | | ☑ | — | ☐ | ☐ |
| CCY-02 | Décidé | BelivaY n’affecte jamais un livreur | | ☑ | — | ☐ | ☐ |
| | | **Le cycle de vie d’une commande, étape par étape** | | | | | |
| CCY-03 | Décidé | L’ajout au panier ne réserve aucun stock | | ☑ | — | ☐ | ☐ |
| CCY-04 | Décidé | Une commande n’est « payée » qu’au webhook signé de l’agrégateur, escrow écrit dans la même transaction | | ☑ | — | ☐ | ☐ |
| CCY-05 | Décidé | Commande au comptoir | | ☑ | — | ☐ | ☐ |
| CCY-06 | Décidé | Le délai de préparation démarre à la confirmation du vendeur | | ☑ | — | ☐ | ☐ |
| CCY-07 | Décidé | La collecte (scan du livreur chez le vendeur, après contrôle en 2 photos, emballage et scellé) ferme l’annulation de la sous-commande | | ☑ | — | ☐ | ☐ |
| CCY-08 | Décidé | Chaque colis intermédiaire déclenche seulement le push gratuit C2a | | ☑ | — | ☐ | ☐ |
| CCY-09 | Décidé | Le retrait exige le code, le nombre de colis, la photo de remise et le paiement MoMo du montant dû | | ☑ | — | ☐ | ☐ |
| CCY-10 | Décidé | Fenêtre de retour | | ☑ | — | ☐ | ☐ |
| CCY-11 | Décidé | Avis | | ☑ | — | ☐ | ☐ |
| CCY-12 | Décidé | À domicile | | ☑ | ☐ | ☐ | ☐ |
| | | **Machines à états** | | | | | |
| CCY-13 | Recommandé | Commande | | ☑ | — | ☐ | ☐ |
| CCY-14 | Recommandé | Une commande est terminee quand toutes ses sous-commandes sont finies (remises avec fenêtre de retour fermée, renvoyées ou annulées,… | | ☑ | ☐ | ☐ | ☐ |
| | | **Machines à états : la sous-commande et le colis** | | | | | |
| CCY-15 | Décidé | Une sous-commande par boutique | | ☑ | — | ☐ | ☐ |
| CCY-16 | Recommandé | La sous-commande reste annulable par le client en payee, confirmee et prete | | ☑ | — | ☐ | ☐ |
| CCY-17 | Décidé | Un litige porte sur un colis (une sous-commande) | | ☑ | — | ☐ | ☐ |
| CCY-18 | Décidé | Jauge du colis en quatre segments (Préparation, Récupéré, Arrivé au relais, Retiré) | | ☑ | — | ☐ | ☐ |
| | | **Machines à états : paiement et escrow** | | | | | |
| CCY-19 | Décidé | Tentative | | ☑ | — | ☐ | ☐ |
| CCY-20 | Décidé | Le webhook signé est la seule source de vérité | | ☑ | — | ☐ | ☐ |
| CCY-21 | Décidé | L’escrow naît au webhook (ou au paiement sur place), est suspendu pendant un litige, devient libérable à la fermeture du retour, est… | | ☑ | — | ☐ | ☐ |
| | | **Machines à états : litige, retour et remplacement** | | | | | |
| CCY-22 | Décidé | Litige | | ☑ | ☐ | ☐ | ☐ |
| CCY-23 | Décidé | Sous le seuil automatique du palier du client, aucun dossier n’est instruit | | ☑ | — | ☐ | ☐ |
| CCY-24 | Décidé | Vendeur silencieux à l’échéance | | ☑ | — | ☐ | ☐ |
| CCY-25 | Décidé | Retour | | ☑ | — | ☐ | ☐ |
| CCY-26 | Décidé | Remplacement | | ☑ | — | ☐ | ☐ |
| CCY-27 | Recommandé | Les états du retour et du remplacement que la spécification ne nomme pas (accepte, collecte, recu, clos, sans_retour | | ☑ | — | ☐ | ☐ |
| | | **Libellés affichés au client** | | | | | |
| CCY-28 | Décidé | Libellés du colis, tels quels | | ☑ | ☐ | ☐ | ☐ |
| CCY-29 | Décidé | Chaque carte a une seule action | | ☑ | ☐ | — | ☐ |
| | | **Matrice de visibilité** | | | | | |
| CVI-01 | Décidé | Le client ne voit jamais le nom, la page, l’adresse ou le numéro d’une boutique | | ☑ | — | ☐ | ☐ |
| CVI-02 | Décidé | Le vendeur ne voit jamais l’identité, le quartier, le relais ni le numéro du client, ni les autres vendeurs de la commande, ni le total… | | ☑ | — | ☐ | ☐ |
| CVI-03 | Recommandé | Livreur | | ☑ | — | ☐ | ☐ |
| CVI-04 | Décidé | Aucun numéro personnel exposé | | ☑ | — | ☐ | ☐ |
| CVI-05 | Décidé | Le code de retrait n’est jamais visible du vendeur, du livreur ni en clair de la console | | ☑ | — | ☐ | ☐ |
| CVI-06 | Décidé | L’IFA n’est jamais montré à personne d’autre que la console | | ☑ | — | ☐ | ☐ |
| CVI-07 | Décidé | Le livreur n’apparaît au client que par son prénom, sa photo et l’heure estimée, quand il est en route | | ☑ | — | ☐ | ☐ |
| CVI-08 | Recommandé | Chaque réponse d’API est construite par un sérialiseur propre au rôle de l’appelant (client, vendeur, livreur, relais, console, payeur) | | ☑ | — | ☐ | ☐ |
| | | **Services communs et modèle de données** | | | | | |
| CDA-21 | Décidé | Un seul service de tarification calcule tous les montants, pour toutes les applications | | ☑ | — | ☐ | ☐ |
| CDA-22 | Décidé | Aucune valeur n’est écrite dans le code | | ☑ | — | ☐ | ☐ |
| CDA-23 | Recommandé | Les modules métier ne connaissent ni FCM ni l’agrégateur SMS | | ☑ | — | ☐ | ☐ |
| | | **Le modèle de données client** | | | | | |
| CDA-24 | Décidé | Objets et champs principaux de 2.6 | | ☑ | — | ☐ | ☐ |
| CDA-25 | Décidé | Le panier, la commande, l’application vendeur et les alertes utilisent toujours l’identifiant de la variante et de l’offre attribuée,… | | ☑ | — | ☐ | ☐ |
| CDA-26 | Décidé | Chaque commande porte la version des paramètres en vigueur à sa création | | ☑ | — | ☐ | ☐ |
| CDA-27 | Recommandé | Le code de retrait est gardé chiffré (clé du service, jamais en clair en base ni dans les journaux) avec une empreinte HMAC pour la… | | ☑ | — | ☐ | ☐ |
| CDA-28 | Recommandé | Les textes affichés (phrase d’état, rappel, notification) sont produits par le serveur dans la langue du profil au moment de l’envoi ou… | | ☑ | — | ☐ | ☐ |
| | | **Calculs** | | | | | |
| CAL-01 | Décidé | Prix livré affiché dès la carte et la fiche | | ☑ | — | ☐ | ☐ |
| CAL-02 | Décidé | Attribution | | ☑ | — | ☐ | ☐ |
| CAL-03 | Décidé | Prix d’une carte = le plus bas des prix livrés des variantes actives, précédé de « à partir de » si les variantes n’ont pas toutes le… | | ☑ | — | ☐ | ☐ |
| CAL-04 | Décidé | Distance = distance géodésique entre la boutique de l’offre attribuée et le relais sélectionné, arrondie à 0,1 km, recalculée au… | | ☑ | — | ☐ | ☐ |
| CAL-05 | Décidé | Retirable aujourd’hui ⇔ heure de fin de préparation + tournée ≤ fermeture du relais aujourd’hui, et classe ≤ L | | ☑ | — | ☐ | ☐ |
| | | **Calculs : moteur de frais du panier et paiement** | | | | | |
| CAL-06 | Décidé | Moteur de frais (7.3) | | ☑ | — | ☐ | ☐ |
| CAL-07 | Décidé | Économie affichée = Off (somme des montants barrés « offert »), jamais une estimation | | ☑ | — | ☐ | ☐ |
| CAL-08 | Décidé | Conseil « Changer d’offre » | | ☑ | — | ☐ | ☐ |
| CAL-09 | À trancher | Supplément de classe = tarif(classe) − tarif(S), jamais offert | | ☑ | — | ☐ | ☐ |
| CAL-10 | Décidé | Recalcul complet à chaque changement, jamais une soustraction de ligne | | ☑ | — | ☐ | ☐ |
| CAL-11 | Décidé | Au clic sur « Payer », le montant M est recalculé par le serveur, jamais reçu de l’application | | ☑ | — | ☐ | ☐ |
| CAL-12 | Décidé | Disponibilité = stock − réservations actives | | ☑ | — | ☐ | ☐ |
| | | **Calculs : comptoir, délais affichés et code** | | | | | |
| CAL-13 | Décidé | Paiement au comptoir | | ☑ | — | ☐ | ☐ |
| CAL-14 | Décidé | Compte à rebours du reçu | | ☑ | ☐ | ☐ | ☐ |
| CAL-15 | Décidé | « Retirable maintenant » quand tous les colis du groupe sont arrivés | | ☑ | — | ☐ | ☐ |
| CAL-16 | Décidé | Paiement interrompu | | ☑ | ☐ | ☐ | ☐ |
| CAL-17 | Recommandé | « Réponse sous X h » = ouverture du litige + 48 h − maintenant, en heures entières arrondies à l’inférieur (31 h pour LIT-3042) | | ☑ | — | ☐ | ☐ |
| CAL-18 | Décidé | Code | | ☑ | — | ☐ | ☐ |
| | | **Calculs : frais de garde et série de rappels S0 à S5** | | | | | |
| CAL-19 | Décidé | Garde (définitive, 24 sept.) | | ☑ | — | ☐ | ☐ |
| CAL-20 | Décidé | J0 = jour du premier accusé fort du message d’arrivée (application ouverte, SMS délivré) | | ☑ | — | ☐ | ☐ |
| CAL-21 | Décidé | Aucun jour n’est facturé pendant un litige, un groupage, une fermeture du relais, ni sur le trajet d’un transfert | | ☑ | — | ☐ | ☐ |
| CAL-22 | Décidé | Renvoi au vendeur le premier jour ouvert après le 7e jour | | ☑ | — | ☐ | ☐ |
| CAL-23 | Recommandé | Série de rappels | | ☑ | — | ☐ | ☐ |
| | | **Calculs : annulation, changement de relais et carte depuis l’étranger** | | | | | |
| CAL-24 | Décidé | Remboursement d’une annulation par boutique | | ☑ | — | ☐ | ☐ |
| CAL-25 | Décidé | Changement de relais gratuit tant qu’aucune sous-commande n’est collectée (toutes changent ensemble) | | ☑ | — | ☐ | ☐ |
| CAL-26 | Décidé | Carte depuis l’étranger | | ☑ | — | ☐ | ☐ |
| | | **Calculs : litiges, retours et libération** | | | | | |
| CAL-27 | Décidé | Remboursement automatique si le montant ≤ seuil du palier (3 000 F Standard, 10 000 F Élevé), vers le moyen d’origine, payé par BelivaY | | ☑ | — | ☐ | ☐ |
| CAL-28 | Décidé | Retour possible avec un motif (non conforme, abîmé, contrefaçon, défaut caché signalé sous 48 h), dans les 7 jours du retrait et tant… | | ☑ | — | ☐ | ☐ |
| CAL-29 | Décidé | Libération du vendeur = fermeture du retour + 3 jours (Or, Platine | | ☑ | — | ☐ | ☐ |
| | | **Calculs : notes, Trust Score affiché et arrondis** | | | | | |
| CAL-30 | Décidé | Le Trust Score et le palier affichés sont ceux du service Scores au moment de la réponse (entier de 0 à 100, palier Bronze, Argent, Or,… | | ☑ | — | ☐ | ☐ |
| CAL-31 | Décidé | Note affichée à une décimale, répartition à l’unité, borne basse de Wilson (z = 1,96) pour le départage et le Trust Score, jamais affichée | | ☑ | — | ☐ | ☐ |
| CAL-32 | Recommandé | Arrondis communs | | ☑ | — | ☐ | ☐ |
| | | **Calculs après le lancement et budget des messages** | | | | | |
| CAL-33 | Décidé | Remise groupée d’une liste d’envies = min(date cible, premier paiement + 21 jours) | | ☑ | — | ☐ | ☐ |
| CAL-34 | Proposé | Abonnement (module fermé) | | ☑ | — | ☐ | ☐ |
| CAL-35 | Décidé | Au plus 6 SMS payants par commande (paiement protégé, code, J+2, J+4, incident, remerciement), hors renvoi payant du code | | ☑ | — | ☐ | ☐ |
| | | **Catalogue des événements** | | | | | |
| CEV-01 | Décidé | Les dix événements de la spécification sont obligatoires | | ☑ | — | ☐ | ☐ |
| CEV-02 | Recommandé | Enveloppe commune | | ☑ | — | ☐ | ☐ |
| CEV-03 | Recommandé | Un événement n’est publié qu’après la validation de la transaction qui l’a causé (table d’envoi transactionnelle) | | ☑ | — | ☐ | ☐ |
| CEV-04 | Décidé | La charge utile respecte la matrice de visibilité de chaque abonné | | ☑ | — | ☐ | ☐ |
| CEV-05 | Décidé | Seul un accusé fort fixe J0 | | ☑ | — | ☐ | ☐ |
| CEV-06 | Recommandé | parcel.handed annule toutes les entrées S0–S5 en file du groupe | | ☑ | — | ☐ | ☐ |
| CEV-07 | Recommandé | Les événements ajoutés par les documents d’écrans (terms.accepted, message.thread_created, suborder.replaced, code.blocked,… | | ☑ | — | ☐ | ☐ |
| CEV-08 | Décidé | Les événements des modules après le lancement ne sont émis que si l’interrupteur du module est ouvert | | ☑ | — | ☐ | ☐ |
| | | **API de référence** | | | | | |
| CAP-01 | Recommandé | API REST JSON (Django REST), HTTPS seulement, préfixe versionné /api/v1 | | ☑ | — | ☐ | ☐ |
| CAP-02 | Recommandé | Authentification | | ☑ | — | ☐ | ☐ |
| CAP-03 | Décidé | Idempotence | | ☑ | — | ☐ | ☐ |
| CAP-04 | Recommandé | Erreurs | | ☑ | ☐ | ☐ | ☐ |
| CAP-05 | Recommandé | Pagination par curseur (cursor, next_cursor), jamais par numéro de page | | ☑ | — | ☐ | ☐ |
| CAP-06 | Recommandé | Montants | | ☑ | — | ☐ | ☐ |
| CAP-07 | Recommandé | Dates | | ☑ | — | ☐ | ☐ |
| CAP-08 | Recommandé | Langue | | ☑ | — | ☐ | ☐ |
| CAP-09 | Décidé | Tout montant renvoyé vient du service de tarification | | ☑ | — | ☐ | ☐ |
| CAP-10 | Décidé | Webhooks entrants (agrégateur, prestataire carte, WhatsApp) | | ☑ | — | ☐ | ☐ |
| CAP-11 | Recommandé | Liens publics courts | | ☑ | — | ☐ | ☐ |
| CAP-12 | Décidé | Hors ligne | | ☑ | ☐ | ☐ | ☐ |
| CAP-13 | Décidé | Modules après le lancement | | ☑ | ☐ | ☐ | ☐ |
| | | **Droits d’accès et sécurité** | | | | | |
| CAP-14 | À trancher | Vérification du numéro par un code à 6 chiffres avant la première commande, jamais avant la navigation | | ☑ | — | ☐ | ☐ |
| CAP-15 | Décidé | Changer de numéro exige un code sur l’ancien et un sur le nouveau | | ☑ | — | ☐ | ☐ |
| CAP-16 | Recommandé | Mot de passe (connexion par e-mail) | | ☑ | — | ☐ | ☐ |
| CAP-17 | Recommandé | Sessions | | ☑ | ☐ | ☐ | ☐ |
| CAP-18 | Décidé | Code de retrait | | ☑ | ☐ | ☐ | ☐ |
| CAP-19 | Décidé | Jamais de code de retrait, d’OTP, de commission ni de montant sensible dans un push, sur l’écran verrouillé ou dans le centre de… | | ☑ | — | ☐ | ☐ |
| CAP-20 | Recommandé | Limitation de débit par numéro, adresse e-mail, appareil et adresse IP sur l’OTP, la connexion, le renvoi du code, les liens publics et… | | ☑ | — | ☐ | ☐ |
| CAP-21 | Recommandé | Données personnelles | | ☑ | — | ☐ | ☐ |
| CAP-22 | Recommandé | Suppression du compte | | ☑ | — | ☐ | ☐ |
| CAP-23 | Décidé | Journal inaltérable | | ☑ | — | ☐ | ☐ |
| CAP-24 | Décidé | Le code secret Mobile Money n’existe jamais côté BelivaY | | ☑ | — | ☐ | ☐ |

## CL-03

| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |
|---|---|---|---|---|---|---|---|
| | | **Écrans « Premier lancement »** | | | | | |
| CIN-01 | Décidé | Premier lancement en trois écrans au plus | | ☑ | ☐ | — | ☐ |
| CIN-02 | Décidé | La promesse est lisible sans défiler | | ☑ | ☐ | — | ☐ |
| CIN-03 | Décidé | L’encart vert dit la promesse | | ☑ | ☐ | — | ☐ |
| CIN-04 | Recommandé | L’accroche s’écrit « Tout près de toi » | | ☑ | ☐ | — | ☐ |
| CIN-05 | Décidé | Repère « Retour gratuit · si problème validé » | | ☑ | ☐ | — | ☐ |
| CIN-06 | Décidé | Repère « MoMo · MTN, Orange » | | ☑ | ☐ | — | ☐ |
| CIN-07 | Recommandé | Repère de délai « Moins de 5 h · Livraison dans ta zone » à la place de « 24-72 h · Livraison » | | ☑ | ☐ | — | ☐ |
| CIN-08 | Décidé | Bilingue dès le premier écran | | ☑ | ☐ | — | ☐ |
| CIN-09 | Recommandé | Le pidgin est proposé comme troisième langue (demandé par le prototype, déjà présent chez le vendeur et le relais, absent de la v3) | | ☑ | ☐ | ☐ | ☐ |
| CIN-10 | Décidé | Centres d’intérêt facultatifs | | ☑ | ☐ | ☐ | ☐ |
| CIN-11 | Recommandé | Langue et centres d’intérêt restent sur l’appareil tant qu’il n’y a pas de compte, puis sont rattachés au compte à sa création | | ☑ | ☐ | — | ☐ |
| CIN-12 | Recommandé | Le lien « Déjà un compte ? Se connecter » de l’écran 1 mène droit à la connexion, sans l’écran des intérêts | | ☑ | ☐ | — | ☐ |
| | | **Écran « Connexion »** | | | | | |
| CIN-13 | Décidé | Trois choix | | ☑ | ☐ | — | ☐ |
| CIN-14 | Décidé | « Découvrir sans compte » | | ☑ | ☐ | ☐ | ☐ |
| CIN-15 | Décidé | Connexion Google | | ☑ | — | ☐ | ☐ |
| CIN-16 | Décidé | Un e-mail = un compte (contrainte unique en base) | | ☑ | — | ☐ | ☐ |
| CIN-17 | Recommandé | Le compte ouvert par Google garde son mot de passe | | ☑ | — | ☐ | ☐ |
| CIN-18 | Décidé | Connexion demandée au paiement | | ☑ | ☐ | ☐ | ☐ |
| CIN-19 | Recommandé | Bouton Google conforme à la charte de Google en production | | ☑ | ☐ | — | ☐ |
| CIN-20 | Décidé | À la création du compte, événement account.created (console | | ☑ | — | ☐ | ☐ |
| | | **Écrans « Connexion par e-mail » et « Mot de passe oublié »** | | | | | |
| CIN-21 | Décidé | E-mail et mot de passe | | ☑ | ☐ | — | ☐ |
| CIN-22 | Recommandé | Créer un compte demande le prénom, l’e-mail et le mot de passe, rien d’autre | | ☑ | ☐ | ☐ | ☐ |
| CIN-23 | Recommandé | Mot de passe de 8 caractères au moins, dont un chiffre (comme l’espace vendeur) | | ☑ | — | ☐ | ☐ |
| CIN-24 | Recommandé | Identifiants faux | | ☑ | ☐ | ☐ | ☐ |
| CIN-25 | Décidé | Adresse déjà inscrite à la création | | ☑ | ☐ | ☐ | ☐ |
| CIN-26 | Décidé | Mot de passe oublié | | ☑ | — | ☐ | ☐ |
| CIN-27 | Recommandé | La réponse est la même que l’adresse ait un compte ou non (« Si … a un compte BelivaY, un lien vient de partir ») | | ☑ | — | ☐ | ☐ |
| CIN-28 | Recommandé | Un compte créé avec Google n’a pas de mot de passe | | ☑ | ☐ | ☐ | ☐ |
| | | **Écran « Vérifier ton numéro »** | | | | | |
| CIN-29 | Décidé | Quelle que soit la méthode de connexion, le numéro est vérifié par code avant toute commande, jamais avant la navigation | | ☑ | — | ☐ | ☐ |
| CIN-30 | Décidé | Le numéro vérifié sert au débit Mobile Money, aux messages de retrait, à l’identification au comptoir, et à l’IFA (identité élargie | | ☑ | — | ☐ | ☐ |
| CIN-31 | Décidé | Aucun message sur un numéro non vérifié, sauf le code de vérification lui-même (seul message autorisé avant la vérification) | | ☑ | — | ☐ | ☐ |
| CIN-32 | Décidé | Opérateur détecté à la saisie (MTN, Orange) et affiché | | ☑ | ☐ | ☐ | ☐ |
| CIN-33 | À trancher | Code de 6 chiffres | | ☑ | — | ☐ | ☐ |
| CIN-34 | Décidé | Code faux | | ☑ | ☐ | ☐ | ☐ |
| CIN-35 | Décidé | Numéro déjà utilisé | | ☑ | — | ☐ | ☐ |
| CIN-36 | Décidé | Numéro vérifié | | ☑ | — | ☐ | ☐ |
| CIN-37 | Recommandé | Pendant un blocage, le panier est gardé et la navigation continue | | ☑ | ☐ | ☐ | ☐ |
| CIN-38 | Recommandé | Le code se remplit tout seul quand c’est possible | | ☑ | ☐ | — | ☐ |
| | | **Changer de numéro** | | | | | |
| CIN-39 | Décidé | Changer de numéro exige un code sur l’ancien, puis un code sur le nouveau | | ☑ | — | ☐ | ☐ |
| CIN-40 | Décidé | Au changement, les codes de retrait en cours sont régénérés | | ☑ | — | ☐ | ☐ |
| CIN-41 | Décidé | L’historique IFA est conservé | | ☑ | — | ☐ | ☐ |
| CIN-42 | Recommandé | Plus accès à l’ancien numéro | | ☑ | — | — | ☐ |
| CIN-43 | Recommandé | L’ancien numéro reste un moyen de paiement tant que le client ne le retire pas | | ☑ | — | ☐ | ☐ |
| CIN-44 | Recommandé | Pas de double authentification ni de liste des appareils au lancement | | ☑ | — | ☐ | ☐ |
| CIN-45 | Recommandé | Changer de numéro ou de mot de passe ferme les sessions des autres appareils | | ☑ | — | ☐ | ☐ |
| CIN-46 | Recommandé | Le numéro vérifié s’affiche en tête du Compte (CL-13), masqué au milieu, avec la pastille « Vérifié » et la méthode de connexion | | ☑ | ☐ | — | ☐ |
| | | **Écran « Choisir mon relais »** | | | | | |
| CPR-01 | Décidé | Le relais habituel est demandé à la première commande seulement | | ☑ | ☐ | ☐ | ☐ |
| CPR-02 | Décidé | Liste par distance, le plus proche en premier (pastille verte « Le plus proche ») | | ☑ | — | ☐ | ☐ |
| CPR-03 | Décidé | Un relais « En configuration », saturé ou fermé n’est jamais proposé | | ☑ | — | ☐ | ☐ |
| CPR-04 | Décidé | Chaque relais montre son gérant (nom et photo), le nom du point, la distance et le temps de trajet, les horaires du jour | | ☑ | ☐ | ☐ | ☐ |
| CPR-05 | Décidé | Un seul relais par zone au lancement (RELAIS-PAR-ZONE = 1) | | ☑ | — | ☐ | ☐ |
| CPR-06 | Décidé | Le relais choisi devient le relais habituel et fixe l’origine des distances et des prix livrés partout | | ☑ | — | ☐ | ☐ |
| CPR-07 | Recommandé | Changer de relais habituel ne déplace pas les commandes en cours | | ☑ | — | ☐ | ☐ |
| CPR-08 | Décidé | Hors des zones servies, le client est prévenu dès le choix du relais | | ☑ | ☐ | ☐ | ☐ |
| CPR-09 | Recommandé | Le délai hors zone s’écrit comme une date ferme calculée (« Commande passée aujourd’hui | | ☑ | — | ☐ | ☐ |
| CPR-10 | Décidé | Aucun relais ouvert dans la zone | | ☑ | — | ☐ | ☐ |
| CPR-11 | Recommandé | Position refusée | | ☑ | ☐ | — | ☐ |
| CPR-12 | Recommandé | Le visiteur sans compte voit les distances depuis le relais le plus proche de sa position | | ☑ | ☐ | ☐ | ☐ |
| CPR-13 | Recommandé | Tri par distance (3.4) | | ☑ | — | ☐ | ☐ |
| | | **Écran « Première commande »** | | | | | |
| CPR-14 | Décidé | L’adresse de livraison, le relais habituel et le moyen de paiement ne sont demandés qu’à la première commande | | ☑ | ☐ | ☐ | ☐ |
| CPR-15 | Recommandé | Un seul écran « Avant de payer » réunit le mode de remise et le numéro de paiement | | ☑ | ☐ | — | ☐ |
| CPR-16 | Décidé | Paiement | | ☑ | ☐ | ☐ | ☐ |
| CPR-17 | Recommandé | Un autre numéro MoMo peut payer | | ☑ | — | ☐ | ☐ |
| CPR-18 | Décidé | Mode domicile | | ☑ | ☐ | ☐ | ☐ |
| CPR-19 | Décidé | Le total vient du service de tarification et se recalcule à chaque changement de mode | | ☑ | — | ☐ | ☐ |
| CPR-20 | Décidé | Le XL et le hors gabarit n’ont que le mode domicile | | ☑ | ☐ | ☐ | ☐ |
| CPR-21 | Décidé | « Payer … F » lance la séquence serveur du chapitre 8 (recalcul, contrôle des prix, réservation, paiement en attente) | | ☑ | — | ☐ | ☐ |
| | | **Écran « Adresse par repères »** | | | | | |
| CPR-22 | Décidé | Adresse (si domicile) | | ☑ | ☐ | ☐ | ☐ |
| CPR-23 | Recommandé | C’est ce que le livreur utilise | | ☑ | — | ☐ | ☐ |
| CPR-24 | Recommandé | Quartier hors des zones servies | | ☑ | — | ☐ | ☐ |
| CPR-25 | Décidé | L’adresse enregistrée rejoint « Mon compte › Adresses » et est réutilisée aux commandes suivantes | | ☑ | — | ☐ | ☐ |
| | | **Feuille « Proposition des notifications »** | | | | | |
| CPR-26 | Décidé | Le réglage des notifications (canal de repli SMS, catégories) est proposé après la première commande, pas pendant l’inscription | | ☑ | ☐ | — | ☐ |
| CPR-27 | Recommandé | Moment | | ☑ | ☐ | — | ☐ |
| CPR-28 | Décidé | Valeurs par défaut | | ☑ | — | ☐ | ☐ |
| CPR-29 | Recommandé | « Activer les notifications » demande l’autorisation du système (Android 13 et plus, iOS) et enregistre le jeton FCM | | ☑ | ☐ | ☐ | ☐ |
| CPR-30 | Décidé | Le code de retrait n’apparaît jamais sur l’écran verrouillé ni dans une notification | | ☑ | — | ☐ | ☐ |
| CPR-31 | Décidé | Le réglage est porté par le compte, pas par l’appareil (PUT /me/notification-settings) | | ☑ | — | ☐ | ☐ |
| | | **Feuille « Conditions générales »** | | | | | |
| CCG-01 | Décidé | Pages légales | | ☑ | — | — | ☐ |
| CCG-02 | Décidé | Accessibles depuis le compte, le pied du paiement (pied de « Avant de payer ») et la page de retour | | ☑ | ☐ | — | ☐ |
| CCG-03 | Décidé | Pages versionnées | | ☑ | — | ☐ | ☐ |
| CCG-04 | Décidé | Aucune case à cocher dans le parcours d’achat | | ☑ | ☐ | ☐ | ☐ |
| CCG-05 | Décidé | Rédaction en langage simple, en français et en anglais | | ☑ | — | — | ☐ |
| CCG-06 | Recommandé | À l’inscription, l’acceptation est la ligne « En créant ton compte, tu acceptes nos conditions (version …) » sous les boutons Google et… | | ☑ | ☐ | ☐ | ☐ |
| CCG-07 | Recommandé | Nouvelle version majeure | | ☑ | ☐ | ☐ | ☐ |
| CCG-08 | Recommandé | Après la date d’entrée en vigueur, la feuille ne se ferme plus sans acceptation, mais ne cache jamais le code de retrait ni le suivi… | | ☑ | ☐ | — | ☐ |
| CCG-09 | Décidé | Les commandes déjà passées gardent les conditions et la version des paramètres du jour de la commande | | ☑ | — | ☐ | ☐ |
| CCG-10 | Recommandé | Une version mineure (correction, précision) ne demande pas de nouvelle acceptation | | ☑ | — | ☐ | ☐ |

## CL-04

| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |
|---|---|---|---|---|---|---|---|
| | | **Écran « Accueil » — l’accueil d’origine, avec un contenu vrai** | | | | | |
| CAC-01 | Décidé | L’accueil reprend l’accueil de l’application d’origine (IMG_2339 → 2355) | | ☑ | ☐ | — | ☐ |
| CAC-02 | Décidé | Ordre, identique pour tous les profils | | ☑ | ☐ | — | ☐ |
| CAC-03 | Décidé | La barre de recherche est toujours visible dans l’en-tête racine | | ☑ | ☐ | ☐ | ☐ |
| CAC-04 | Décidé | Reprise de parcours dans la barre flottante, à la place de la barre promo d’origine | | ☑ | ☐ | ☐ | ☐ |
| CAC-05 | Décidé | La barre reprend les horaires déclarés par le relais | | ☑ | ☐ | ☐ | ☐ |
| CAC-06 | Décidé | Le paiement interrompu n’a pas de case sur l’accueil d’origine | | ☑ | ☐ | — | ☐ |
| CAC-07 | Décidé | Carrousel de 6 bandes d’univers (Mode femme, Téléphones & tablettes, Maison & cuisine, Beauté & santé, Électronique, Supermarché) avec… | | ☑ | ☐ | ☐ | ☐ |
| CAC-08 | Décidé | Les catégories de l’accueil sont la rangée de pastilles d’origine | | ☑ | ☐ | — | ☐ |
| CAC-09 | Décidé | Rangées par univers (l’élément central), dans l’ordre d’origine | | ☑ | ☐ | ☐ | ☐ |
| CAC-10 | Décidé | « Près de ton relais » dans la case « À la une » | | ☑ | — | ☐ | ☐ |
| CAC-11 | Décidé | Nouveautés dans la case « Nouveaux arrivages » (sans pastille) | | ☑ | — | ☐ | ☐ |
| CAC-12 | Décidé | Top ventes dans la case « Produits populaires » | | ☑ | — | ☐ | ☐ |
| CAC-31 | Décidé | « Prix en baisse » à la place des Flash Deals | | ☑ | — | ☐ | ☐ |
| CAC-32 | Décidé | Les deux encarts d’origine gardent leur place avec un contenu BelivaY vrai | | ☑ | ☐ | ☐ | ☐ |
| CAC-33 | Décidé | « Pourquoi choisir BelivaY ? » ne porte que trois promesses vraies | | ☑ | ☐ | ☐ | ☐ |
| CAC-34 | Décidé | Carte « BelivaY · Tout près de toi » | | ☑ | ☐ | ☐ | ☐ |
| CAC-35 | Décidé | Pied de page | | ☑ | ☐ | — | ☐ |
| | | **Accueil — ce qui change selon le profil** | | | | | |
| CAC-13 | Décidé | Profil nouveau (aucune commande, aucun historique) | | ☑ | ☐ | ☐ | ☐ |
| CAC-14 | Décidé | Profil navigateur sans achat | | ☑ | ☐ | ☐ | ☐ |
| CAC-15 | Décidé | Profil acheteur fidèle | | ☑ | ☐ | ☐ | ☐ |
| CAC-16 | Décidé | L’ordre des cases est celui de l’accueil d’origine pour tous les profils | | ☑ | — | ☐ | ☐ |
| CAC-17 | Décidé | Rangées | | ☑ | ☐ | — | ☐ |
| CAC-18 | Décidé | Chaque carte | | ☑ | ☐ | ☐ | ☐ |
| CAC-19 | À trancher | Une rangée sous N produits n’est pas affichée | | ☑ | — | ☐ | ☐ |
| CAC-20 | Recommandé | Rangée personnelle (« Récemment consultés ») | | ☑ | — | ☐ | ☐ |
| CAC-21 | Décidé | 10 à 20 % des emplacements d’une rangée d’univers tournent sur les nouveaux produits, avec un score neutre, jamais zéro | | ☑ | — | ☐ | ☐ |
| | | **Accueil — réseau lent et hors ligne** | | | | | |
| CAC-22 | Décidé | Chaque case de produits (À la une, Récemment consultés, Produits populaires, Nouveaux arrivages, chaque rangée d’univers) charge ses… | | ☑ | ☐ | ☐ | ☐ |
| CAC-23 | Décidé | Les rangées se chargent progressivement au défilement (coût des données) | | ☑ | ☐ | ☐ | ☐ |
| CAC-24 | Décidé | Le seuil N, les quotas de rotation, le seuil de connexion lente et les montants des bannières sont lus dans les paramètres, jamais… | | ☑ | — | ☐ | ☐ |
| CAC-25 | Décidé | Hors ligne | | ☑ | ☐ | ☐ | ☐ |
| CAC-26 | Décidé | Aucun module après le lancement sur l’accueil | | ☑ | ☐ | ☐ | ☐ |
| CAC-27 | Décidé | Une boutique « Fermé aujourd’hui » voit ses offres retirées des rangées aussitôt (shop.closed_today) | | ☑ | — | ☐ | ☐ |
| CAC-28 | Décidé | La cloche de l’en-tête porte le nombre de non-lus (3 | | ☑ | ☐ | ☐ | ☐ |
| CAC-29 | Décidé | Visiteur sans compte | | ☑ | ☐ | ☐ | ☐ |
| CAC-30 | Recommandé | Client sans relais habituel (nouveau, visiteur) | | ☑ | — | ☐ | ☐ |
| | | **Écran « Index des catégories »** | | | | | |
| CCT-01 | Décidé | Écran « hub » | | ☑ | ☐ | — | ☐ |
| CCT-02 | Décidé | Pas de rechargement au changement d’univers | | ☑ | ☐ | — | ☐ |
| CCT-03 | Décidé | L’indicateur du rail reste visible pendant le défilement | | ☑ | ☐ | — | ☐ |
| CCT-04 | Décidé | Bannière | | ☑ | ☐ | ☐ | ☐ |
| CCT-05 | Décidé | Vignettes avec le nombre de produits | | ☑ | — | ☐ | ☐ |
| CCT-06 | Décidé | Toutes les cibles tactiles mesurent au moins 44 px (rail 68 px, vignettes, bouton de 40 px agrandi à 44 px) | | ☑ | ☐ | — | ☐ |
| CCT-07 | Décidé | Destination unique | | ☑ | ☐ | — | ☐ |
| CCT-08 | Décidé | Emplacements promotionnels | | ☑ | ☐ | ☐ | ☐ |
| CCT-09 | Décidé | Accroche « Tout près de toi » (la spec écrit « Tout près de vous » | | ☑ | ☐ | — | ☐ |
| CCT-10 | Décidé | Visuels | | ☑ | — | — | ☐ |
| CCT-11 | Recommandé | Ordre du rail | | ☑ | — | ☐ | ☐ |
| CCT-12 | Recommandé | Le rail garde la place de chaque univers | | ☑ | ☐ | — | ☐ |
| | | **Compteurs réels — partout** | | | | | |
| CCR-01 | Décidé | Aucun chiffre écrit en dur | | ☑ | ☐ | ☐ | ☐ |
| CCR-02 | Décidé | Index des catégories | | ☑ | — | ☐ | ☐ |
| CCR-03 | Décidé | Bannière d’univers | | ☑ | — | ☐ | ☐ |
| CCR-04 | Décidé | Vignette de sous-catégorie | | ☑ | — | ☐ | ☐ |
| CCR-05 | Décidé | Listing | | ☑ | — | ☐ | ☐ |
| CCR-06 | Décidé | Recherche | | ☑ | — | ☐ | ☐ |
| CCR-07 | Décidé | Fiche produit et cartes | | ☑ | — | ☐ | ☐ |
| CCR-08 | Décidé | Un produit compte s’il a au moins une offre publiée, active, d’une boutique ouverte | | ☑ | — | ☐ | ☐ |
| CCR-09 | Décidé | Compteurs par agrégation, en cache quelques minutes au plus, recalculés à chaque publication ou désactivation | | ☑ | — | ☐ | ☐ |
| CCR-10 | Recommandé | Un seul agrégat pour tous les écrans | | ☑ | — | ☐ | ☐ |
| CCR-11 | Décidé | Interdits | | ☑ | ☐ | ☐ | ☐ |
| | | **Écran « Listing » — la page catégorie unique** | | | | | |
| CLS-01 | Décidé | Une seule page, un seul comportement, quelle que soit l’entrée | | ☑ | ☐ | — | ☐ |
| CLS-02 | Décidé | Grille régulière de cartes dans toutes les catégories (arbitrage du 17 sept., fin du quinconce), défilement infini par curseur | | ☑ | ☐ | ☐ | ☐ |
| CLS-03 | Décidé | Recherche dans la catégorie sous le titre (ouvre la saisie de CL-05, limitée à la catégorie) | | ☑ | ☐ | — | ☐ |
| CLS-04 | Décidé | Puces | | ☑ | ☐ | — | ☐ |
| CLS-05 | Recommandé | Sous-rayons de l’univers en puces, avec leur nombre réel | | ☑ | ☐ | ☐ | ☐ |
| CLS-06 | Recommandé | Pertinence dans une catégorie | | ☑ | — | ☐ | ☐ |
| CLS-07 | Recommandé | « Prix » trie par prix livré croissant au premier tap, décroissant au second | | ☑ | ☐ | ☐ | ☐ |
| CLS-08 | Décidé | Caractéristiques clés sous le titre de la carte | | ☑ | ☐ | ☐ | ☐ |
| CLS-09 | Décidé | Prix livré de l’offre attribuée | | ☑ | — | ☐ | ☐ |
| CLS-10 | Décidé | Distance au relais et état | | ☑ | ☐ | ☐ | ☐ |
| CLS-11 | Décidé | Ajout rapide | | ☑ | ☐ | — | ☐ |
| CLS-12 | Décidé | La distance part du relais habituel du client (PostGIS), identique en recherche et sur la fiche | | ☑ | — | ☐ | ☐ |
| | | **Listing — gros colis, filtre de livrabilité, catégorie peu fournie** | | | | | |
| CLS-13 | Décidé | Catégorie peu fournie | | ☑ | — | ☐ | ☐ |
| CLS-14 | Décidé | Filtre de livrabilité « Retirable à mon relais » | | ☑ | — | ☐ | ☐ |
| CLS-15 | Décidé | Carte d’un XL ou hors gabarit | | ☑ | ☐ | ☐ | ☐ |
| CLS-16 | Décidé | Étiquettes | | ☑ | — | ☐ | ☐ |
| CLS-17 | Décidé | Un produit maître par carte, prix livré de l’offre attribuée | | ☑ | — | ☐ | ☐ |
| CLS-18 | Décidé | Réseau lent | | ☑ | ☐ | ☐ | ☐ |
| CLS-19 | Recommandé | Un filtre actif se retire d’un geste (puce ✕) | | ☑ | ☐ | — | ☐ |

## CL-05

| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |
|---|---|---|---|---|---|---|---|
| | | **Avant saisie** | | | | | |
| CRE-01 | Décidé | Au tap sur la barre de recherche, l’écran « avant saisie » s’ouvre champ actif et clavier affiché, avec « Rechercher un produit, une… | | ☑ | ☐ | — | ☐ |
| CRE-02 | Décidé | « Tes recherches » | | ☑ | ☐ | ☐ | ☐ |
| CRE-03 | Décidé | L’historique est porté par le compte | | ☑ | — | ☐ | ☐ |
| CRE-04 | Recommandé | « Effacer » agit sans demande de confirmation et affiche un message bref « Tes recherches sont effacées de ton compte | | ☑ | ☐ | ☐ | ☐ |
| CRE-05 | Décidé | Un nouveau client sans historique (ou après « Effacer ») ne voit pas « Tes recherches » | | ☑ | ☐ | — | ☐ |
| CRE-06 | Décidé | « Recherché dans ta zone cette semaine » | | ☑ | — | ☐ | ☐ |
| CRE-07 | Recommandé | Chaque puce de zone porte le nombre réel de produits livrables aujourd’hui à ce relais, expliqué une fois par la ligne d’aide | | ☑ | — | ☐ | ☐ |
| CRE-08 | Décidé | Une puce de zone ne s’affiche que si elle renvoie aujourd’hui au moins un produit livrable au relais du client (« climatiseur split »,… | | ☑ | — | ☐ | ☐ |
| CRE-09 | Décidé | « Parcourir » | | ☑ | ☐ | ☐ | ☐ |
| | | **En-tête, voix et suggestions** | | | | | |
| CRE-10 | Décidé | En-tête | | ☑ | ☐ | — | ☐ |
| CRE-11 | Décidé | Texte d’invite exact « Rechercher un produit, une marque… », en entier, sans troncature | | ☑ | ☐ | — | ☐ |
| CRE-12 | Recommandé | La loupe est dans le champ, à gauche | | ☑ | ☐ | — | ☐ |
| CRE-13 | Décidé | La recherche vocale lance directement la recherche, sans étape de confirmation | | ☑ | ☐ | — | ☐ |
| CRE-14 | Décidé | Suggestions dès la 2e lettre | | ☑ | ☐ | ☐ | ☐ |
| CRE-15 | Décidé | Partie tapée en normal, complétion en gras | | ☑ | ☐ | ☐ | ☐ |
| CRE-16 | Décidé | Une suggestion peut être une catégorie (exemple de la spec | | ☑ | ☐ | ☐ | ☐ |
| CRE-17 | Décidé | Requête connue sans produit | | ☑ | ☐ | ☐ | ☐ |
| | | **Sélecteur de relais** | | | | | |
| CRE-18 | Décidé | Le sélecteur reprend le relais habituel et propose les relais ouverts et non saturés, du plus proche au plus loin, avec distance et… | | ☑ | — | ☐ | ☐ |
| CRE-19 | Décidé | Toutes les distances et la livrabilité sont recalculées depuis le relais choisi | | ☑ | — | ☐ | ☐ |
| CRE-20 | Recommandé | Le relais choisi devient le relais habituel (même effet que le choix du relais, 3.4 | | ☑ | ☐ | ☐ | ☐ |
| | | **Résultats** | | | | | |
| CRE-21 | Décidé | Bandeau de correction « Résultats pour téléphone Samsung — corrigé depuis « telefone samsng » · 18 produits », seulement si la requête a… | | ☑ | ☐ | ☐ | ☐ |
| CRE-22 | Décidé | Puces | | ☑ | ☐ | — | ☐ |
| CRE-23 | Décidé | Un résultat par produit maître | | ☑ | — | ☐ | ☐ |
| CRE-24 | Recommandé | La ligne de livraison de la carte est celle du listing et de la fiche pour un achat seul (« Retrait offert » / « + 900 F de retrait » /… | | ☑ | ☐ | ☐ | ☐ |
| CRE-25 | Décidé | Repère panier « Déjà sur le trajet de ton panier — sans ramassage en plus », à la place de la ligne de livraison, seulement si l’offre… | | ☑ | — | ☐ | ☐ |
| CRE-26 | Décidé | Un produit épuisé chez tous les vendeurs reste visible avec « Épuisé » (photo atténuée, sans bouton d’ajout) mais ne remonte jamais en… | | ☑ | — | ☐ | ☐ |
| CRE-27 | Décidé | Colis XL ou hors gabarit | | ☑ | — | ☐ | ☐ |
| CRE-28 | Recommandé | Le jargon des classes de colis est expliqué une fois, sous la liste, dans un bloc replié « Colis M, L et XL », quand un colis M, L ou XL… | | ☑ | ☐ | — | ☐ |
| CRE-29 | Décidé | Bloc « Tu cherchais autre chose ? » en fin de liste | | ☑ | ☐ | — | ☐ |
| CRE-30 | Recommandé | Ce bloc propose la catégorie la plus probable (avec son nombre de produits) et « Modifier ma recherche » | | ☑ | ☐ | ☐ | ☐ |
| | | **Filtres** | | | | | |
| CRE-31 | Décidé | Quatre familles, pas plus (RECH-FAMILLES) | | ☑ | ☐ | ☐ | ☐ |
| CRE-32 | Décidé | Livrabilité | | ☑ | — | ☐ | ☐ |
| CRE-33 | Décidé | Disponibilité | | ☑ | — | ☐ | ☐ |
| CRE-34 | Décidé | Marque | | ☑ | — | ☐ | ☐ |
| CRE-35 | Décidé | « Tout effacer » en haut | | ☑ | ☐ | ☐ | ☐ |
| CRE-36 | Décidé | Un filtre qui ne renverrait aucun produit est grisé (compteur 0, bordure pointillée, non cliquable), jamais masqué | | ☑ | ☐ | ☐ | ☐ |
| CRE-37 | Décidé | Les filtres ne s’affichent qu’après une première recherche | | ☑ | ☐ | — | ☐ |
| CRE-38 | Recommandé | Compteur d’une option = nombre de résultats si on l’ajoute aux filtres actifs (ET entre familles et entre options de livrabilité, OU… | | ☑ | — | ☐ | ☐ |
| CRE-39 | Recommandé | « Retirable à mon relais » compte les classes S à L, stock ou non | | ☑ | — | ☐ | ☐ |
| CRE-40 | Recommandé | Ouvert depuis le listing d’une catégorie (puce « Filtres », 4.4), c’est le même écran à quatre familles | | ☑ | ☐ | ☐ | ☐ |
| | | **Moteur, attribution et classement** | | | | | |
| CRM-01 | Décidé | Le client cherche un produit, jamais un vendeur | | ☑ | — | ☐ | ☐ |
| CRM-02 | Décidé | L’offre montrée est celle au coût total livré le plus bas pour ce client (prix + livraison réelle jusqu’à son relais, panier en cours… | | ☑ | — | ☐ | ☐ |
| CRM-03 | Décidé | Rupture, lenteur ou refus du vendeur | | ☑ | — | ☐ | ☐ |
| CRM-04 | Décidé | Tolérance aux fautes | | ☑ | — | ☐ | ☐ |
| CRM-05 | Décidé | Sans accent | | ☑ | — | ☐ | ☐ |
| CRM-06 | Décidé | Bilingue français / anglais | | ☑ | — | ☐ | ☐ |
| CRM-07 | Décidé | Synonymes locaux | | ☑ | — | ☐ | ☐ |
| CRM-08 | Décidé | Sens | | ☑ | — | ☐ | ☐ |
| CRM-09 | Décidé | Meilisearch (pile technique) pour les fautes, les accents, les synonymes et les règles de classement | | ☑ | — | ☐ | ☐ |
| CRM-10 | Décidé | Index des produits maîtres | | ☑ | — | ☐ | ☐ |
| CRM-11 | Décidé | Mise à jour de l’index à chaque publication, changement de prix ou de stock, désactivation, « Fermé aujourd’hui » (chapitre 17) | | ☑ | — | ☐ | ☐ |
| CRM-12 | Décidé | Classement | | ☑ | — | ☐ | ☐ |
| CRM-13 | Décidé | Aucun placement payant ni produit sponsorisé dans les résultats | | ☑ | — | ☐ | ☐ |
| CRM-14 | Recommandé | Au critère 1, un produit XL ou hors gabarit livrable à domicile compte comme livrable | | ☑ | — | ☐ | ☐ |
| CRM-15 | Décidé | Chaque nombre montré (suggestion, puce de zone, résultats, compteur de filtre, univers) est un COUNT réel de produits maîtres livrables,… | | ☑ | — | ☐ | ☐ |
| | | **Zéro résultat utile et journal** | | | | | |
| CRZ-01 | Décidé | Ne jamais afficher une page vide | | ☑ | ☐ | ☐ | ☐ |
| CRZ-02 | Décidé | Une phrase honnête | | ☑ | ☐ | — | ☐ |
| CRZ-03 | Décidé | Produits proches par le sens (plongements), avec un lien vers leur recherche complète (« Voir les 7 ventilateurs ») | | ☑ | — | ☐ | ☐ |
| CRZ-04 | Décidé | « Préviens-moi quand ça arrive » | | ☑ | — | ☐ | ☐ |
| CRZ-05 | Recommandé | L’alerte créée s’affiche dans l’écran (encadré vert) avec « Annuler l’alerte » | | ☑ | ☐ | ☐ | ☐ |
| CRZ-06 | Décidé | « Voir la catégorie Téléphones » | | ☑ | — | ☐ | ☐ |
| CRZ-07 | Décidé | La ligne de preuve | | ☑ | — | ☐ | ☐ |
| CRZ-08 | Recommandé | La fin de la ligne de preuve est écrite « on te prévient le jour de la mise en ligne » | | ☑ | ☐ | — | ☐ |
| CRZ-09 | Décidé | Chaque recherche sans résultat est enregistrée | | ☑ | — | ☐ | ☐ |
| CRZ-10 | Décidé | Une requête connue sans produit apparaît dès la saisie avec « 0 · on cherche » et mène à cet écran | | ☑ | ☐ | ☐ | ☐ |
| CRZ-11 | Recommandé | Sans produit proche par le sens (cas rare), la page garde la phrase honnête, l’alerte, la ligne de preuve et « Parcourir » les univers | | ☑ | ☐ | ☐ | ☐ |

## CL-06

| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |
|---|---|---|---|---|---|---|---|
| | | **Fiche produit — haut de fiche** | | | | | |
| CFP-01 | Décidé | Le client choisit un produit, jamais un vendeur | | ☑ | — | ☐ | ☐ |
| CFP-02 | Décidé | Fil d’Ariane cliquable vers le listing unique | | ☑ | ☐ | — | ☐ |
| CFP-03 | Décidé | Trois badges, chacun un fait vrai | | ☑ | ☐ | ☐ | ☐ |
| CFP-04 | Décidé | Prix unitaire en grand | | ☑ | — | ☐ | ☐ |
| CFP-05 | Recommandé | Sous un prix barré, une ligne dit ce qu’il est | | ☑ | ☐ | ☐ | ☐ |
| CFP-06 | Décidé | Note, nombre d’avis vérifiés et ventes cumulés sur tout le produit maître, valeurs réelles (« 4,6 · 128 avis vérifiés », « 412 vendus ») | | ☑ | — | ☐ | ☐ |
| CFP-07 | Recommandé | Produit sans avis | | ☑ | ☐ | — | ☐ |
| CFP-08 | Décidé | Prix livré affiché tôt, juste sous le prix | | ☑ | ☐ | ☐ | ☐ |
| CFP-09 | Recommandé | Le prix livré se calcule sur prix × quantité, affiche le total livré quand le retrait est payant (« 19 400 F livré à ton relais ») et… | | ☑ | — | ☐ | ☐ |
| CFP-10 | Recommandé | Prix, prix livré, variantes et stock en haut | | ☑ | ☐ | — | ☐ |
| CFP-11 | Décidé | Bloc vendeur | | ☑ | — | ☐ | ☐ |
| CFP-12 | Recommandé | Le Trust Score est expliqué une fois (« sa note de fiabilité sur 100, calculée par BelivaY ») | | ☑ | ☐ | — | ☐ |
| CFP-59 | Recommandé | Un lien vers un produit inconnu ou retiré ouvre « Ce produit n’est pas au catalogue » et « Rechercher un produit » | | ☑ | ☐ | ☐ | ☐ |
| CFP-13 | Décidé | Distance affichée depuis le relais habituel du client, la même qu’en recherche et dans le listing | | ☑ | — | ☐ | ☐ |
| | | **Variantes, stock et quantité** | | | | | |
| CVA-01 | Décidé | Une ligne par type de variante déclaré (Couleur, Capacité, Taille), en puces | | ☑ | ☐ | — | ☐ |
| CVA-02 | Décidé | Choisir une variante met à jour, sans recharger, le prix, le stock, les photos P1–P4 et l’offre attribuée si elle change | | ☑ | ☐ | ☐ | ☐ |
| CVA-03 | Recommandé | Quand l’offre attribuée change avec la variante, un encadré le dit (« l’offre vient d’un autre vendeur certifié | | ☑ | ☐ | ☐ | ☐ |
| CVA-04 | Recommandé | Les puces de capacité affichent leur prix (« 128 Go · 139 000 F », « 256 Go · 150 699 F ») | | ☑ | ☐ | ☐ | ☐ |
| CVA-05 | Recommandé | La fiche s’ouvre sur la variante choisie dans la recherche ou la carte | | ☑ | — | ☐ | ☐ |
| CVA-06 | Décidé | Variante en rupture chez tous les vendeurs | | ☑ | ☐ | ☐ | ☐ |
| CVA-07 | Décidé | L’alerte porte sur la variante précise (couleur et capacité), jamais sur le produit entier | | ☑ | — | ☐ | ☐ |
| CVA-08 | Décidé | Pas de sélecteur si le produit n’a pas de variantes (pagne, ventilateur, téléviseur) | | ☑ | ☐ | — | ☐ |
| CVA-09 | Décidé | Au lancement, la plupart des fiches sont simples | | ☑ | — | — | ☐ |
| CVA-10 | Décidé | Modèle | | ☑ | — | ☐ | ☐ |
| CVA-11 | Décidé | Le panier, la commande, l’application vendeur et les alertes utilisent toujours l’identifiant de la variante et de l’offre attribuée | | ☑ | — | ☐ | ☐ |
| CVA-12 | Décidé | La variante suit tout le parcours | | ☑ | — | ☐ | ☐ |
| CVA-13 | Décidé | Variation de prix entre l’ajout et le paiement | | ☑ | — | ☐ | ☐ |
| CVA-14 | Décidé | Le cœur ajoute aux favoris la variante précise | | ☑ | — | ☐ | ☐ |
| CFP-14 | Décidé | Quantité bornée par le stock de l’offre attribuée | | ☑ | — | ☐ | ☐ |
| CFP-15 | Décidé | Total des articles recalculé à chaque changement, et prix livré avec lui | | ☑ | — | ☐ | ☐ |
| CFP-16 | Décidé | Stock | | ☑ | ☐ | ☐ | ☐ |
| CFP-17 | Recommandé | Jauge à échelle fixe | | ☑ | ☐ | — | ☐ |
| CFP-18 | Décidé | Trois actions | | ☑ | ☐ | — | ☐ |
| CFP-19 | Recommandé | « Tu en as déjà 1 dans ton panier » quand la variante choisie est déjà au panier (Camon 30 Gris titane · 256 Go, Ensemble wax M, Sac… | | ☑ | ☐ | ☐ | ☐ |
| CFP-58 | Recommandé | Aucune offre en stock, toutes variantes confondues | | ☑ | ☐ | ☐ | ☐ |
| | | **Livraison et classes de colis** | | | | | |
| CFP-20 | Décidé | Les deux modes affichent délai, tarif, seuil et supplément de classe | | ☑ | ☐ | ☐ | ☐ |
| CFP-21 | Décidé | Retrait au relais habituel du client (« Relais Mvog-Ada ») avec sa date et son tarif | | ☑ | ☐ | ☐ | ☐ |
| CFP-22 | Décidé | Livraison à domicile avec son délai et son tarif | | ☑ | ☐ | ☐ | ☐ |
| CFP-23 | Décidé | Seuils calculés sur le sous-total produits | | ☑ | — | ☐ | ☐ |
| CFP-24 | Décidé | Colis M ou L | | ☑ | ☐ | ☐ | ☐ |
| CFP-25 | Décidé | Colis XL ou hors gabarit | | ☑ | ☐ | ☐ | ☐ |
| CFP-26 | Décidé | Un délai est une heure ou une date ferme (« aujourd’hui dès 15 h », « aujourd’hui avant 17 h ») | | ☑ | — | ☐ | ☐ |
| CFP-27 | Décidé | Le délai de préparation de l’offre attribuée est dit une fois (« Préparé par le vendeur sous 4 h ») et entre dans les heures affichées | | ☑ | — | ☐ | ☐ |
| CFP-28 | Décidé | Relais saturé ou fermé | | ☑ | — | ☐ | ☐ |
| CFP-29 | À trancher | Supplément de classe XL | | ☑ | — | ☐ | ☐ |
| CFP-30 | Décidé | Le plafond de valeur des transporteurs (75 000 F Nouveau, 250 000 F Confirmé) n’a aucun effet visible, mais le délai affiché en tient… | | ☑ | — | ☐ | ☐ |
| | | **Garanties, onglets et barre d’achat** | | | | | |
| CFP-31 | Décidé | Quatre tuiles | | ☑ | ☐ | ☐ | ☐ |
| CFP-32 | Décidé | Onglets Description, Spécifications, Avis | | ☑ | ☐ | — | ☐ |
| CFP-33 | Recommandé | L’onglet Spécifications reprend la variante choisie et la classe de colis (« S (petit colis) ») | | ☑ | ☐ | ☐ | ☐ |
| CFP-34 | Décidé | La description est en français, avec les mots du vendeur | | ☑ | ☐ | ☐ | ☐ |
| CFP-35 | Décidé | « Similaires » et « Souvent achetés ensemble » sous le bloc d’achat, jamais à côté du bouton d’achat | | ☑ | ☐ | ☐ | ☐ |
| CFP-36 | Décidé | « Poser une question au vendeur » ouvre la messagerie interne (écran question) | | ☑ | ☐ | — | ☐ |
| CFP-37 | Décidé | Barre d’achat collante | | ☑ | ☐ | — | ☐ |
| CFP-38 | Recommandé | Quand la barre est visible, elle remplace le dock | | ☑ | ☐ | — | ☐ |
| CFP-39 | Décidé | Partager un article (bouton de l’en-tête) | | ☑ | ☐ | — | ☐ |
| CFP-40 | Recommandé | Pas de bouton flottant (assistant, retour en haut) sur la fiche | | ☑ | ☐ | — | ☐ |
| | | **Galerie** | | | | | |
| CFP-41 | Décidé | Galerie P1 à P4 (face, dos, trois-quarts, détail) | | ☑ | ☐ | — | ☐ |
| CFP-42 | Décidé | Photos réelles des avis ajoutées en fin de galerie, marquées « photo d’acheteur », avec la note, la date, la variante et le commentaire… | | ☑ | ☐ | ☐ | ☐ |
| CFP-43 | Décidé | Photos produit | | ☑ | — | — | ☐ |
| CFP-44 | Recommandé | Galerie sur fond nuit, fermeture en haut à gauche, compteur « 1 / 7 » | | ☑ | ☐ | — | ☐ |
| CFP-45 | Décidé | Chargement progressif et images compressées | | ☑ | ☐ | ☐ | ☐ |
| | | **Lire les avis** | | | | | |
| CLA-01 | Décidé | Onglet Avis de la fiche et écran « Avis » | | ☑ | ☐ | ☐ | ☐ |
| CLA-02 | Décidé | Avis cumulés sur le produit maître, quel que soit le vendeur attribué | | ☑ | — | ☐ | ☐ |
| CLA-03 | Décidé | Chaque avis | | ☑ | ☐ | ☐ | ☐ |
| CLA-04 | Décidé | Aucun avis sans commande payée et retirée | | ☑ | — | ☐ | ☐ |
| CLA-05 | Décidé | Photos réelles des avis mises en avant | | ☑ | ☐ | — | ☐ |
| CLA-06 | Décidé | Jamais le nom de la boutique dans un avis | | ☑ | — | ☐ | ☐ |
| CLA-07 | Recommandé | Chaque avis dit la variante achetée (« Noir · 128 Go ») | | ☑ | ☐ | ☐ | ☐ |
| CLA-08 | Décidé | La borne basse de Wilson sert au Trust Score et au départage de l’attribution, jamais à l’affichage | | ☑ | — | ☐ | ☐ |
| CLA-09 | Recommandé | Produit sans avis | | ☑ | ☐ | — | ☐ |
| CLA-10 | Décidé | Modération | | ☑ | — | ☐ | ☐ |
| CLA-11 | Recommandé | Tri « Les plus récents » et pagination par curseur (« Voir la suite · 123 avis ») | | ☑ | ☐ | ☐ | ☐ |
| | | **Question au vendeur** | | | | | |
| CQV-01 | Décidé | « Poser une question au vendeur » ouvre la messagerie interne anonymisée, jamais WhatsApp | | ☑ | ☐ | ☐ | ☐ |
| CQV-02 | Décidé | Le client voit « le vendeur » avec son palier et son Trust Score | | ☑ | — | ☐ | ☐ |
| CQV-03 | Décidé | Numéros, e-mails et identifiants sociaux masqués automatiquement, avant l’enregistrement et avant l’affichage, des deux côtés (« numéro… | | ☑ | — | ☐ | ☐ |
| CQV-04 | Recommandé | La question porte sur l’offre attribuée de la variante choisie | | ☑ | — | ☐ | ☐ |
| CQV-05 | Recommandé | Trois questions toutes prêtes pour le client pressé, adaptées au produit (téléphone | | ☑ | ☐ | — | ☐ |
| CQV-06 | Décidé | Fil tracé et gratuit | | ☑ | — | ☐ | ☐ |
| CQV-07 | Décidé | Un problème sur une commande passe par « Signaler un problème » (assistant de litige), jamais par un chat libre | | ☑ | ☐ | — | ☐ |
| CQV-08 | Décidé | Aucune photo ni preuve par WhatsApp | | ☑ | — | ☐ | ☐ |
| | | **Description et publication** | | | | | |
| CFP-46 | Décidé | La description est en français, rédigée avec les mots du vendeur | | ☑ | — | ☐ | ☐ |
| CFP-47 | Décidé | Contrôle de langue à la publication | | ☑ | — | ☐ | ☐ |
| CFP-48 | Décidé | Fiches suspectes de copie | | ☑ | — | ☐ | ☐ |
| CFP-49 | Décidé | Le vendeur cherche d’abord le produit dans le catalogue | | ☑ | — | ☐ | ☐ |
| CFP-50 | Décidé | Quand un nouveau vendeur ajoute son offre à un produit maître existant, la note, les avis et les ventes affichés restent ceux du produit… | | ☑ | — | ☐ | ☐ |
| | | **Après le lancement** | | | | | |
| CFP-51 | Décidé | Vente flash (FF-FLASH) | | ☑ | ☐ | ☐ | ☐ |
| CFP-52 | Proposé | Mettre de côté (FF-EX03) | | ☑ | ☐ | ☐ | ☐ |
| CFP-53 | Proposé | Reprise et troc (FF-EX04) | | ☑ | ☐ | ☐ | ☐ |
| CFP-54 | Décidé | Encart d’abonnement (FF-ABONNEMENT) | | ☑ | ☐ | ☐ | ☐ |
| | | **Pour le développeur** | | | | | |
| CFP-55 | Décidé | Aucune réponse d’API de la fiche ne contient le nom de la boutique attribuée | | ☑ | — | ☐ | ☐ |
| CFP-56 | Décidé | Tout montant de la fiche (prix, remise, prix livré, tarifs, seuils, suppléments, total) est calculé par le service de tarification,… | | ☑ | — | ☐ | ☐ |
| CFP-57 | Décidé | Événements | | ☑ | — | ☐ | ☐ |

## CL-07

| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |
|---|---|---|---|---|---|---|---|
| | | **Écran « Panier » — structure** | | | | | |
| CPN-01 | Décidé | Ordre imposé de haut en bas | | ☑ | ☐ | — | ☐ |
| CPN-02 | Décidé | Bandeau fixe, texte exact | | ☑ | ☐ | — | ☐ |
| CPN-03 | Décidé | Titre « Mon panier · N articles » (N = somme des quantités | | ☑ | ☐ | ☐ | ☐ |
| CPN-04 | Décidé | Encart diaspora, texte exact | | ☑ | ☐ | — | ☐ |
| CPN-05 | Décidé | Une section par boutique, générée automatiquement par le serveur | | ☑ | — | ☐ | ☐ |
| CPN-06 | Décidé | En-tête de section | | ☑ | ☐ | ☐ | ☐ |
| CPN-07 | Recommandé | Lettres, couleurs et numéros de colis suivent l’ordre des collectes fixé par le serveur et sont réattribués à chaque recalcul | | ☑ | ☐ | ☐ | ☐ |
| CPN-08 | Décidé | Boutique d’une autre zone que le relais | | ☑ | ☐ | ☐ | ☐ |
| CPN-09 | Décidé | Le client ne voit jamais le nom, la page, l’adresse ni le numéro d’une boutique, ni à l’écran ni dans une réponse d’API | | ☑ | — | ☐ | ☐ |
| CPN-10 | Décidé | Ligne d’article | | ☑ | ☐ | ☐ | ☐ |
| CPN-11 | Décidé | Sous les lignes | | ☑ | — | ☐ | ☐ |
| CPN-12 | Recommandé | Une suggestion n’est jamais un produit déjà au panier ni un colis M, L, XL ou hors gabarit | | ☑ | — | ☐ | ☐ |
| CPN-13 | Décidé | Conseil d’offre dans la section de la boutique hors zone, texte exact | | ☑ | ☐ | ☐ | ☐ |
| CPN-14 | Décidé | « Changer d’offre » remplace l’offre sans changer le produit (même variante, même quantité), puis recalcule tout | | ☑ | — | ☐ | ☐ |
| CPN-15 | Recommandé | Après « Changer d’offre », un encadré vert confirme avec le gain recalculé | | ☑ | ☐ | ☐ | ☐ |
| CPN-16 | Décidé | Pied de section | | ☑ | ☐ | — | ☐ |
| CPN-17 | Décidé | Sous les sections | | ☑ | ☐ | ☐ | ☐ |
| CPN-18 | Recommandé | Variantes de la phrase | | ☑ | ☐ | ☐ | ☐ |
| CPN-19 | Décidé | Pas de case à cocher par article | | ☑ | ☐ | — | ☐ |
| | | **Bas du panier — conseil, récapitulatif, paiement** | | | | | |
| CPN-20 | Décidé | En haut du bas de panier, un encart calcule le geste le plus rentable à cet instant | | ☑ | ☐ | ☐ | ☐ |
| CPN-21 | Recommandé | Quand il ne reste aucun ramassage à payer | | ☑ | ☐ | ☐ | ☐ |
| CPN-22 | Décidé | Barre de progression min(S / Seuil, 1), légende « 271 699 F d’articles · seuil 30 000 F atteint » (« · seuil 30 000 F » tant qu’il n’est… | | ☑ | ☐ | ☐ | ☐ |
| CPN-23 | Décidé | Récapitulatif, dans cet ordre | | ☑ | ☐ | ☐ | ☐ |
| CPN-24 | Recommandé | Libellé d’une ligne de ramassage | | ☑ | ☐ | ☐ | ☐ |
| CPN-25 | Décidé | « tu économises X F de livraison » n’apparaît que si Off > 0 et vaut exactement Off | | ☑ | ☐ | ☐ | ☐ |
| CPN-26 | Décidé | Moyens acceptés, dans la carte du récapitulatif | | ☑ | ☐ | ☐ | ☐ |
| CPN-27 | Décidé | Section « Sauvegardés » sous le récapitulatif | | ☑ | ☐ | ☐ | ☐ |
| CPN-28 | Recommandé | Carte « Escrow BelivaY » | | ☑ | ☐ | — | ☐ |
| CPN-29 | Décidé | Un seul bouton plein sur l’écran, avec le total exact | | ☑ | ☐ | ☐ | ☐ |
| CPN-30 | Recommandé | Juste sous le bouton, obligatoire | | ☑ | ☐ | ☐ | ☐ |
| CPN-31 | Décidé | Les délais affichés sont les vrais délais calculés par le serveur, jamais une fourchette | | ☑ | — | ☐ | ☐ |
| CPN-32 | Recommandé | Calcul | | ☑ | — | ☐ | ☐ |
| CPN-33 | Décidé | Destination de « Passer commande » | | ☑ | ☐ | ☐ | ☐ |
| CPN-34 | Décidé | « Payer au comptoir du relais » (bouton clair, sous la phrase de protection) n’apparaît que si le serveur déclare le panier éligible | | ☑ | — | ☐ | ☐ |
| CPN-35 | Décidé | Sinon, bouton absent et une ligne discrète l’explique | | ☑ | ☐ | ☐ | ☐ |
| CPN-36 | Recommandé | Autres motifs, dans cet ordre de priorité | | ☑ | ☐ | ☐ | ☐ |
| CPN-37 | Décidé | Sous le bouton comptoir | | ☑ | ☐ | ☐ | ☐ |
| CPN-38 | Recommandé | Panier éligible dont la livraison due est de 0 F (au-delà de 30 000 F avec un seul ramassage) | | ☑ | — | ☐ | ☐ |
| CPN-39 | Décidé | Tout encart d’abonnement (« Avec Prime… ») est masqué au lancement (FF-ABONNEMENT fermé), comme la proposition « Mettre de côté »… | | ☑ | ☐ | ☐ | ☐ |
| CPN-40 | Décidé | Le panier ne produit pas de facture | | ☑ | ☐ | — | ☐ |
| CPN-41 | Décidé | Au pied du paiement, lien « Conditions de vente et de paiement » vers les pages légales (CL-13, dont le paiement au comptoir et la carte) | | ☑ | ☐ | — | ☐ |
| | | **Le moteur de calcul des frais** | | | | | |
| CFR-01 | Décidé | Un seul service serveur (tarification) recalcule le panier depuis zéro à chaque changement | | ☑ | — | ☐ | ☐ |
| CFR-02 | Décidé | S = Σ P(v) × q, au prix actuel de l’offre attribuée | | ☑ | — | ☐ | ☐ |
| CFR-03 | Décidé | Ram = Σ_zones [ R + (n_z − 1) × R′ ] | | ☑ | — | ☐ | ☐ |
| CFR-04 | Décidé | R = 500 F | | ☑ | — | ☐ | ☐ |
| CFR-05 | Décidé | Rem = Rem_relais (400 F) ou Rem_dom (1 000 F) selon le mode de remise | | ☑ | — | ☐ | ☐ |
| CFR-06 | Décidé | S ≥ Seuil(mode) ⇒ Off = R + Rem, sinon 0 | | ☑ | — | ☐ | ☐ |
| CFR-07 | Décidé | Total = S + Ram + Rem + Σ suppl_classe − Off | | ☑ | — | ☐ | ☐ |
| CFR-08 | Recommandé | Le ramassage « offert » est le premier ramassage plein tarif dans l’ordre des collectes (A dans l’exemple) | | ☑ | — | ☐ | ☐ |
| CFR-09 | Décidé | Économie = Off = somme des montants barrés « offert » | | ☑ | — | ☐ | ☐ |
| CFR-10 | Décidé | Reste_ramassages = Ram − (Off > 0 ? R | | ☑ | — | ☐ | ☐ |
| CFR-11 | Décidé | Progression = min(S / Seuil, 1) | | ☑ | — | ☐ | ☐ |
| CFR-12 | Décidé | Gain_conseil = Total − Total_simulé, par recalcul complet du panier modifié | | ☑ | — | ☐ | ☐ |
| CFR-13 | Décidé | Livraison de base relais = 900 F = ramassage 500 F + remise 400 F (décision du 22 sept.) | | ☑ | — | ☐ | ☐ |
| CFR-14 | Décidé | Seuils | | ☑ | — | ☐ | ☐ |
| CFR-15 | Décidé | Remboursement partiel | | ☑ | — | ☐ | ☐ |
| CFR-16 | Décidé | Deux boutiques de zones différentes paient chacune R | | ☑ | — | ☐ | ☐ |
| CFR-17 | Décidé | À S = 29 999 F rien n’est offert | | ☑ | — | ☐ | ☐ |
| CFR-18 | À trancher | Suppléments de classe M et L | | ☑ | — | ☐ | ☐ |
| CFR-19 | À trancher | XL et hors gabarit ne vont jamais en relais | | ☑ | — | ☐ | ☐ |
| CFR-20 | À trancher | Domicile | | ☑ | — | ☐ | ☐ |
| CFR-21 | Décidé | Chaque ligne porte l’offre attribuée (coût total livré le plus bas pour ce client, panier en cours compris, Trust Score en départage) | | ☑ | — | ☐ | ☐ |
| CFR-22 | Décidé | Le prix payé est celui du moment du paiement | | ☑ | — | ☐ | ☐ |
| CFR-23 | Décidé | Tout montant renvoyé vient du service de tarification | | ☑ | — | ☐ | ☐ |
| CFR-24 | Décidé | BelivaY ne vend jamais à perte | | ☑ | — | ☐ | ☐ |
| CFR-25 | Décidé | Les formules retrouvent l’exemple au franc près | | ☑ | — | ☐ | ☐ |
| CFR-26 | Décidé | Aucune réservation de stock à l’ajout au panier | | ☑ | — | ☐ | ☐ |
| | | **Gestes utiles et actions** | | | | | |
| CPN-42 | Décidé | Balayage vers la gauche sur une ligne | | ☑ | ☐ | ☐ | ☐ |
| CPN-43 | Recommandé | Le geste a toujours un équivalent visible | | ☑ | ☐ | — | ☐ |
| CPN-44 | Décidé | Retrait (« Supprimer », corbeille) qui vide une section et casse un trajet partagé | | ☑ | ☐ | ☐ | ☐ |
| CPN-45 | Recommandé | Un retrait qui ne casse aucun trajet (autre article dans la même section, boutique seule dans sa zone) se fait sans feuille | | ☑ | ☐ | ☐ | ☐ |
| CPN-46 | Décidé | Partager le panier | | ☑ | ☐ | ☐ | ☐ |
| CPN-47 | Recommandé | 10.6 interdit « commande, panier … transmis par WhatsApp » alors que 7.4 prévoit l’envoi du panier par WhatsApp | | ☑ | — | ☐ | ☐ |
| CPN-48 | Décidé | La feuille dit ce que vivra le payeur | | ☑ | ☐ | ☐ | ☐ |
| CPN-49 | Décidé | Partager un article, pour demander un avis avant d’acheter | | ☑ | ☐ | — | ☐ |
| | | **États du panier** | | | | | |
| CPN-50 | Recommandé | Panier vide | | ☑ | ☐ | — | ☐ |
| CPN-51 | Décidé | Visiteur | | ☑ | ☐ | ☐ | ☐ |
| CPN-52 | Décidé | Colis XL ou hors gabarit en mode relais | | ☑ | ☐ | ☐ | ☐ |
| CPN-53 | Décidé | Produit désactivé ou supprimé | | ☑ | ☐ | ☐ | ☐ |
| CPN-54 | Décidé | Variante épuisée chez tous les vendeurs | | ☑ | ☐ | ☐ | ☐ |
| CPN-55 | Décidé | Hors ligne | | ☑ | ☐ | — | ☐ |
| CPN-56 | Recommandé | Le badge de l’onglet Panier compte les articles (somme des quantités) | | ☑ | ☐ | ☐ | ☐ |
| CPN-57 | Décidé | Après un paiement non abouti ou abandonné, « Retour au panier » retrouve le panier strictement identique | | ☑ | — | ☐ | ☐ |
| | | **Écran « Sauvegardés et favoris »** | | | | | |
| CSG-01 | Décidé | Favoris = une seule liste (décision du 21 sept.) | | ☑ | — | ☐ | ☐ |
| CSG-02 | Décidé | Sauvegarder depuis le panier sort l’article du total (recalcul complet) | | ☑ | — | ☐ | ☐ |
| CSG-03 | Décidé | Contenu d’un article | | ☑ | ☐ | ☐ | ☐ |
| CSG-04 | Décidé | Baisse de prix affichée | | ☑ | ☐ | ☐ | ☐ |
| CSG-05 | Décidé | Alertes baisse de prix et retour en stock sur chaque article sauvegardé | | ☑ | — | ☐ | ☐ |
| CSG-06 | Décidé | Ces pushs sont non critiques | | ☑ | — | ☐ | ☐ |
| CSG-07 | Décidé | Variante épuisée partout | | ☑ | ☐ | ☐ | ☐ |
| CSG-08 | Recommandé | Retour en stock | | ☑ | ☐ | ☐ | ☐ |
| CSG-09 | Recommandé | Cœur plein = dans la liste | | ☑ | ☐ | — | ☐ |
| CSG-10 | Décidé | « Remettre au panier » ajoute la variante sauvegardée | | ☑ | — | ☐ | ☐ |
| CSG-11 | Décidé | Au lancement, pas de listes nommées, de partage de liste ni de « Tout retirer » (FF-LISTE-ENVIES fermé) | | ☑ | ☐ | ☐ | ☐ |
| CSG-12 | Recommandé | Liste vide | | ☑ | ☐ | — | ☐ |
| CSG-13 | Recommandé | Accès | | ☑ | ☐ | — | ☐ |
| CSG-14 | Décidé | favorite.added nourrit le rayon « favoris de retour en stock » de l’accueil et les alertes prix | | ☑ | — | ☐ | ☐ |
| CSG-15 | Décidé | Chaque article sauvegardé se partage (lien de la fiche), pour demander un avis avant d’acheter | | ☑ | ☐ | — | ☐ |

## CL-08

| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |
|---|---|---|---|---|---|---|---|
| | | **Parcours « Payer »** | | | | | |
| CPY-01 | Décidé | Au clic sur « Payer », l’application n’envoie que le contenu du panier (articles, variantes, quantités, mode de remise, relais) | | ☑ | ☐ | ☐ | ☐ |
| CPY-02 | Décidé | Le serveur enchaîne dans cet ordre, dans une seule transaction | | ☑ | — | ☐ | ☐ |
| CPY-03 | Décidé | Recalcul depuis zéro | | ☑ | — | ☐ | ☐ |
| CPY-04 | Décidé | Stock réservé au clic sur « Payer », sur la variante précise, jamais à l’ajout au panier | | ☑ | — | ☐ | ☐ |
| CPY-05 | Décidé | Clé d’idempotence = id_commande + n° de tentative | | ☑ | — | ☐ | ☐ |
| CPY-06 | Décidé | Le prix payé est celui affiché au moment du paiement, jamais celui du moment de l’ajout au panier | | ☑ | — | ☐ | ☐ |
| CPY-07 | Décidé | Trois écrans distincts, reliés aux vrais états du paiement, qui ne se confondent jamais | | ☑ | ☐ | ☐ | ☐ |
| CPY-08 | Décidé | Agrégateur principal CamPay (certifié ANTIC, enregistré ART), secours Fapshi | | ☑ | — | ☐ | ☐ |
| CPY-09 | Décidé | Zéro espèce, nulle part, y compris au comptoir du relais | | ☑ | — | ☐ | ☐ |
| CPY-10 | Décidé | Toute action d’argent exige la connexion | | ☑ | ☐ | ☐ | ☐ |
| | | **Écran « Un prix a changé » — contrôle au clic sur « Payer »** | | | | | |
| CPY-11 | Décidé | Δ = M_serveur − M_affiché | | ☑ | — | ☐ | ☐ |
| CPY-12 | Décidé | Δ < 0 | | ☑ | — | ☐ | ☐ |
| CPY-13 | Recommandé | La baisse et la bascule vers le vendeur suivant n’arrêtent pas le paiement | | ☑ | ☐ | ☐ | ☐ |
| CPY-14 | Décidé | Produit désactivé ou supprimé | | ☑ | — | ☐ | ☐ |
| CPY-15 | Décidé | Article non réservable | | ☑ | — | ☐ | ☐ |
| CPY-16 | Recommandé | La bascule au paiement suit les garde-fous de la rupture après confirmation | | ☑ | — | ☐ | ☐ |
| CPY-17 | Recommandé | Produit retiré, ou article pris sans vendeur suivant | | ☑ | ☐ | ☐ | ☐ |
| CPY-18 | Recommandé | Article pris sans vendeur suivant | | ☑ | — | ☐ | ☐ |
| CPY-19 | Recommandé | Écran d’arrêt sans dock, « ‹ Panier » en haut à gauche, une phrase « Rien n’a été demandé à ton téléphone | | ☑ | ☐ | — | ☐ |
| | | **Écran « Paiement en attente »** | | | | | |
| CPY-20 | Décidé | Affiché dès que la demande est envoyée à l’agrégateur, et tant qu’elle n’est ni validée ni en échec définitif | | ☑ | ☐ | ☐ | ☐ |
| CPY-21 | Décidé | Contenu | | ☑ | ☐ | ☐ | ☐ |
| CPY-22 | Décidé | Un statut qui se rafraîchit seul, avec le temps restant avant expiration (t_exp = t_demande + T_val) | | ☑ | ☐ | ☐ | ☐ |
| CPY-23 | Décidé | Bloc « Si rien ne s’affiche sur ton écran » | | ☑ | ☐ | ☐ | ☐ |
| CPY-24 | Décidé | Deux boutons | | ☑ | ☐ | — | ☐ |
| CPY-25 | Décidé | En bas, la phrase de protection | | ☑ | ☐ | — | ☐ |
| CPY-26 | Décidé | Seule source de vérité | | ☑ | — | ☐ | ☐ |
| CPY-27 | Décidé | « Renvoyer la demande » | | ☑ | — | ☐ | ☐ |
| CPY-28 | Décidé | « Changer de numéro » | | ☑ | — | ☐ | ☐ |
| CPY-29 | Décidé | La réservation du stock dure exactement le temps de cet écran (PAY-RESA = fenêtre de validation) | | ☑ | — | ☐ | ☐ |
| CPY-30 | Décidé | L’écran ne passe jamais à « confirmée » sans webhook validé et escrow écrit | | ☑ | — | ☐ | ☐ |
| CPY-31 | Recommandé | À t_exp sans webhook de succès, le serveur interroge l’agrégateur avant de conclure | | ☑ | — | ☐ | ☐ |
| CPY-32 | Recommandé | « Annuler » annule aussi la tentative chez l’agrégateur et libère la réservation | | ☑ | — | ☐ | ☐ |
| CPY-33 | Recommandé | Numéro masqué « 6 77 ·· ·· 41 » (points médians du jeu d’essai) pour le « 6 77 41 » de la spécification | | ☑ | ☐ | ☐ | ☐ |
| CPY-34 | Recommandé | Écran sans dock | | ☑ | ☐ | ☐ | ☐ |
| CPY-35 | Recommandé | Lignes d’état en tête de l’écran pour le renvoi, le changement de numéro, le retour dans l’application, le gain, la bascule vendeur et… | | ☑ | ☐ | ☐ | ☐ |
| | | **Écran « Paiement non abouti »** | | | | | |
| CPY-36 | Décidé | Affiché sur échec définitif | | ☑ | — | ☐ | ☐ |
| CPY-37 | Décidé | La cause en clair, en une phrase, suivie de « Aucun montant n’a été débité » | | ☑ | — | ☐ | ☐ |
| CPY-38 | Décidé | Bloc « Ce que tu peux faire » | | ☑ | ☐ | — | ☐ |
| CPY-39 | Décidé | Bouton principal « Réessayer le paiement » (nouvelle tentative, recalcul complet selon CPY-02) | | ☑ | ☐ | ☐ | ☐ |
| CPY-40 | Décidé | Un encart | | ☑ | ☐ | — | ☐ |
| CPY-41 | Décidé | Réservations de la tentative libérées immédiatement | | ☑ | — | ☐ | ☐ |
| CPY-42 | Décidé | SMS d’échec seulement si le client a quitté l’application | | ☑ | — | ☐ | ☐ |
| CPY-43 | Recommandé | Ce SMS n’est pas dans la liste des six SMS de 10.3 | | ☑ | — | ☐ | ☐ |
| CPY-44 | Recommandé | L’ordre des trois conseils suit la cause | | ☑ | ☐ | ☐ | ☐ |
| | | **Feuille « Moyen de paiement »** | | | | | |
| CPY-45 | Décidé | Moyens proposés | | ☑ | ☐ | ☐ | ☐ |
| CPY-46 | Décidé | Autre numéro | | ☑ | — | ☐ | ☐ |
| CPY-47 | Décidé | Carte | | ☑ | — | ☐ | ☐ |
| CPY-48 | Décidé | Carte | | ☑ | ☐ | ☐ | ☐ |
| CPY-49 | Décidé | Jamais de carte pour une commande au comptoir (jamais de paiement au comptoir depuis l’étranger) | | ☑ | — | ☐ | ☐ |
| CPY-50 | Recommandé | Le bouton plein nomme le montant et le moyen (« Payer 272 579 F avec MTN MoMo », « Payer 19 788 F par carte ») | | ☑ | ☐ | ☐ | ☐ |
| | | **Portefeuille « Compte BelivaY » et dépôt manuel — supprimés** | | | | | |
| CPY-51 | Recommandé | Aucun porte-monnaie ni dépôt | | ☑ | — | ☐ | ☐ |
| | | **Écran « Commande confirmée » — le reçu** | | | | | |
| CRC-01 | Décidé | Affiché uniquement quand le webhook de paiement est validé et que l’escrow est écrit dans le registre (confirmée ⇔ webhook_valide ∧… | | ☑ | — | ☐ | ☐ |
| CRC-02 | Décidé | Une preuve, pas un accusé de réception | | ☑ | ☐ | — | ☐ |
| CRC-03 | Décidé | Contenu dans cet ordre exact | | ☑ | ☐ | — | ☐ |
| CRC-04 | Décidé | Le nom et la photo du gérant du relais choisi sont affichés (portrait G1) | | ☑ | ☐ | ☐ | ☐ |
| CRC-05 | Décidé | Délai | | ☑ | ☐ | ☐ | ☐ |
| CRC-06 | Décidé | Nombre de colis | | ☑ | ☐ | ☐ | ☐ |
| CRC-07 | Décidé | Une seule action principale, « Suivre ma commande » | | ☑ | ☐ | — | ☐ |
| CRC-08 | Décidé | Ligne de bas mot pour mot | | ☑ | ☐ | — | ☐ |
| CRC-09 | Décidé | « Partager la confirmation » ouvre le partage natif du téléphone (WhatsApp en premier) avec une image ou un texte | | ☑ | ☐ | — | ☐ |
| CRC-10 | Décidé | La preuve survit à la page | | ☑ | ☐ | ☐ | ☐ |
| CRC-11 | Décidé | Notification | | ☑ | — | ☐ | ☐ |
| CRC-12 | Recommandé | « Mme Ngo Bassong t’attend au Relais Mvog-Ada » | | ☑ | ☐ | ☐ | ☐ |
| CRC-13 | Recommandé | Protection écrite « Ton argent reste bloqué jusqu’à ton retrait | | ☑ | ☐ | — | ☐ |
| CRC-14 | Recommandé | Date de la preuve écrite en entier (« jeudi 24 sept | | ☑ | ☐ | ☐ | ☐ |
| CRC-15 | Recommandé | Contenu partagé (image et texte) | | ☑ | — | ☐ | ☐ |
| CRC-16 | Recommandé | Écran sans dock, fermé par « × » vers l’accueil | | ☑ | ☐ | — | ☐ |
| | | **Écran « Commande validée » — paiement au comptoir** | | | | | |
| CCP-01 | Décidé | Paiement au comptoir | | ☑ | — | ☐ | ☐ |
| CCP-02 | Décidé | Éligibilité calculée côté serveur | | ☑ | — | ☐ | ☐ |
| CCP-03 | Décidé | Jamais depuis l’étranger (carte), pour un gros colis (XL, hors gabarit) ni en express | | ☑ | — | ☐ | ☐ |
| CCP-04 | Décidé | Deux refus au comptoir | | ☑ | — | ☐ | ☐ |
| CCP-05 | Décidé | Le bouton « Payer au comptoir du relais » n’apparaît que si toutes les conditions sont réunies, calculées par le serveur | | ☑ | ☐ | ☐ | ☐ |
| CCP-06 | Décidé | La livraison est payée d’avance (900 F pour la robe de 24 000 F) et n’est pas remboursée en cas de refus au comptoir | | ☑ | — | ☐ | ☐ |
| CCP-07 | Décidé | Une commande au comptoir est « Validée », jamais « Payée » | | ☑ | ☐ | ☐ | ☐ |
| CCP-08 | Décidé | validée_comptoir ⇔ éligible(IFA, S, compte, mode) ∧ livraison_payée | | ☑ | — | ☐ | ☐ |
| CCP-09 | Décidé | Le vendeur prépare comme d’habitude | | ☑ | — | ☐ | ☐ |
| CCP-10 | Décidé | Au comptoir, le gérant voit « Montant dû (MoMo sur place) » calculé par le système (reste des articles + garde) | | ☑ | — | ☐ | ☐ |
| CCP-11 | Décidé | Refus au comptoir | | ☑ | — | ☐ | ☐ |
| CCP-12 | Recommandé | Avant de payer la livraison, « Paiement en attente » (mode comptoir) dit ce qui se paie maintenant (900 F), ce qui se paiera au retrait… | | ☑ | ☐ | — | ☐ |
| CCP-13 | Recommandé | L’écran « Commande validée » reprend la structure du reçu | | ☑ | ☐ | ☐ | ☐ |
| | | **Règles de calcul des montants** | | | | | |
| CPY-52 | Décidé | Tout montant est calculé côté serveur, au moment de l’affichage ou de l’envoi | | ☑ | — | ☐ | ☐ |
| CPY-53 | Décidé | Chaque changement déclenche un recalcul complet depuis zéro, jamais une soustraction de ligne | | ☑ | — | ☐ | ☐ |
| CPY-54 | Décidé | Un même montant apparaît à l’identique dans l’application, la notification et l’écran du gérant | | ☑ | — | ☐ | ☐ |
| CPY-55 | Décidé | M = S + Ram + Rem − Off (formules du chapitre 7, Rem_relais = 400 F, livraison de base relais 900 F = 500 + 400) | | ☑ | — | ☐ | ☐ |
| CPY-56 | Décidé | Tout montant renvoyé par l’API vient du service de tarification | | ☑ | — | ☐ | ☐ |
| CPY-57 | Recommandé | Montants en francs CFA, espace insécable des milliers, « F » | | ☑ | ☐ | — | ☐ |
| | | **Pour le développeur : API, événements, erreurs, paramètres** | | | | | |
| CPY-58 | Décidé | Notification du paiement | | ☑ | — | ☐ | ☐ |
| CPY-59 | Décidé | Un paiement réel de bout en bout est réalisé avec MTN MoMo et Orange Money, en succès puis en échec, avant la mise en production | | ☑ | — | — | ☐ |
| CPY-60 | Recommandé | Nouveau paramètre PAY-SONDAGE pour l’intervalle d’interrogation de l’état (3 s la première minute, puis 10 s) | | ☑ | — | ☐ | ☐ |

## CL-09

| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |
|---|---|---|---|---|---|---|---|
| | | **Écran « Mes commandes » · onglet En cours** | | | | | |
| CMC-01 | Décidé | Deux onglets | | ☑ | ☐ | ☐ | ☐ |
| CMC-02 | Décidé | Sous les onglets, des puces de filtre aux compteurs réels | | ☑ | ☐ | ☐ | ☐ |
| CMC-03 | Recommandé | L’ordre des cartes est fixé par le serveur | | ☑ | — | ☐ | ☐ |
| CMC-04 | Décidé | Une commande en litige reste dans « En cours » tant que le litige n’est pas clos | | ☑ | — | ☐ | ☐ |
| CMC-05 | Décidé | Une commande annulée va dans « Terminées », avec le motif en clair et le montant remboursé | | ☑ | ☐ | ☐ | ☐ |
| CMC-06 | Décidé | État vide | | ☑ | ☐ | — | ☐ |
| CMC-07 | Recommandé | Un nouveau client n’a pas encore de relais habituel (demandé à la première commande) | | ☑ | ☐ | — | ☐ |
| CMC-08 | Décidé | En bas de « En cours » | | ☑ | ☐ | ☐ | ☐ |
| CMC-09 | Décidé | Aucune commande non payée n’apparaît comme une commande | | ☑ | — | ☐ | ☐ |
| CMC-10 | Décidé | Encart « Paiement en attente » | | ☑ | ☐ | ☐ | ☐ |
| CMC-11 | Décidé | L’encart est en tête de « En cours », au-dessus des livraisons en cours, sans numéro BLV ni jauge | | ☑ | ☐ | — | ☐ |
| CMC-12 | Décidé | t_restant = t_exp − t_now | | ☑ | — | ☐ | ☐ |
| CMC-13 | Décidé | Le compte à rebours est la vraie fenêtre de validation Mobile Money (PAY-TVAL = PAY-RESA), jamais un compte à rebours artificiel | | ☑ | — | ☐ | ☐ |
| CMC-14 | Recommandé | « Reprendre le paiement » ouvre la feuille Paiement du panier réservé (commandes?sheet=payer) | | ☑ | ☐ | ☐ | ☐ |
| CMC-15 | Décidé | La mention « Reste à payer » n’existe nulle part | | ☑ | ☐ | — | ☐ |
| CMC-16 | Recommandé | Pastille des commandes = commandes qui demandent un geste (à retirer, à payer au retrait) | | ☑ | — | ☐ | ☐ |
| CMC-17 | Décidé | Hors ligne | | ☑ | ☐ | ☐ | ☐ |
| CMC-18 | Décidé | Lecture au pouce, sans défilement horizontal de la page (seule la rangée de puces défile) | | ☑ | ☐ | — | ☐ |
| CMC-48 | Décidé | Panneau « Livraisons en cours » | | ☑ | ☐ | ☐ | ☐ |
| CMC-49 | Décidé | « Plan indicatif » (liste, détail, suivi) | | ☑ | — | ☐ | ☐ |
| | | **Feuilles « Paiement » et « Annulation » de Mes commandes** | | | | | |
| CMC-50 | Décidé | Feuille Paiement du panier réservé | | ☑ | ☐ | ☐ | ☐ |
| CMC-51 | Recommandé | La même feuille paie un montant dû sans quitter la liste | | ☑ | ☐ | ☐ | ☐ |
| CMC-52 | Décidé | Feuille Annulation (commande payée seulement) | | ☑ | ☐ | ☐ | ☐ |
| CMC-53 | Recommandé | « Garder la commande » ferme la feuille sans rien changer | | ☑ | ☐ | — | ☐ |
| | | **Composant « Carte de commande »** | | | | | |
| CMC-19 | Décidé | Ordre de lecture de la carte | | ☑ | ☐ | — | ☐ |
| CMC-20 | Décidé | La phrase d’état répond à « quand ? » par une date ou une heure ferme | | ☑ | ☐ | ☐ | ☐ |
| CMC-21 | Recommandé | Date de la tête | | ☑ | ☐ | ☐ | ☐ |
| CMC-22 | Décidé | La couleur double l’état, jamais seule | | ☑ | ☐ | — | ☐ |
| CMC-23 | Décidé | Au plus une action principale (pleine) et une secondaire (contour), plus le lien « Détails », selon le tableau ci-dessus | | ☑ | ☐ | — | ☐ |
| CMC-24 | Recommandé | Carte en litige | | ☑ | ☐ | ☐ | ☐ |
| CMC-25 | Décidé | Chaque carte a au plus un bouton plein | | ☑ | ☐ | — | ☐ |
| CMC-26 | Décidé | La jauge par colis (4 segments = rang de l’état | | ☑ | ☐ | ☐ | ☐ |
| CMC-27 | Recommandé | Colis en litige ou annulé | | ☑ | ☐ | — | ☐ |
| CMC-28 | Décidé | X = max(t_estimé des colis non arrivés) − t_now, arrondi à l’heure | | ☑ | — | ☐ | ☐ |
| CMC-29 | Recommandé | X ≥ 24 h | | ☑ | — | ☐ | ☐ |
| CMC-30 | Décidé | « réponse sous X h » = t_ouverture + 48 h − t_now (arrondi à l’heure inférieure) | | ☑ | — | ☐ | ☐ |
| CMC-31 | Décidé | Ni Trust Score ni IFA du client | | ☑ | — | ☐ | ☐ |
| CMC-32 | Recommandé | La carte est un composant unique, utilisé par la liste et par chaque puce | | ☑ | ☐ | — | ☐ |
| | | **Onglet « Terminées » · racheter, avis, commande annulée** | | | | | |
| CMC-33 | Décidé | « Racheter » remet les articles au panier aux prix et stocks actuels (recalcul serveur) | | ☑ | — | ☐ | ☐ |
| CMC-34 | Recommandé | La feuille de rachat dit ce qui a été ajouté, le prix d’aujourd’hui et s’il a changé (« Même prix que le 19 sept | | ☑ | ☐ | ☐ | ☐ |
| CMC-35 | Décidé | « Facture » (bouton du résumé, commandes retirées) | | ☑ | — | ☐ | ☐ |
| CMC-36 | Recommandé | La facture est émise par BelivaY et ne porte aucun nom de boutique | | ☑ | — | ☐ | ☐ |
| CMC-37 | Décidé | Le panier ne produit pas de facture | | ☑ | ☐ | — | ☐ |
| CMC-38 | Recommandé | Commande annulée | | ☑ | ☐ | ☐ | ☐ |
| CMC-39 | Décidé | Les commandes de plus de 12 mois sont archivées | | ☑ | — | ☐ | ☐ |
| CMC-40 | Recommandé | Une ligne sous la liste le dit | | ☑ | ☐ | — | ☐ |
| CMC-41 | Décidé | Tant que la fenêtre de retour est ouverte, la carte le dit (« Retour possible jusqu’au sam | | ☑ | ☐ | ☐ | ☐ |
| | | **Écran « Détail d’une commande » · commandes en cours** | | | | | |
| CMC-42 | Décidé | Le détail garde les blocs des captures d’origine, dans cet ordre | | ☑ | ☐ | — | ☐ |
| CMC-43 | Recommandé | Le geste attendu est en tête, dans une carte nuit | | ☑ | ☐ | — | ☐ |
| CMC-44 | Recommandé | « Modifier ma commande » ouvre CL-12 (annuler une boutique, changer de relais) | | ☑ | ☐ | ☐ | ☐ |
| CMC-45 | Décidé | « Signaler un problème » (encart « Litige protégé ») ouvre l’assistant guidé (CL-11), jamais un chat libre | | ☑ | ☐ | ☐ | ☐ |
| CMC-46 | Décidé | Commande validée | | ☑ | ☐ | ☐ | ☐ |
| CMC-47 | Décidé | Montant dû du jour avec le palier suivant (« Montant dû | | ☑ | ☐ | ☐ | ☐ |
| | | **Détail d’une commande terminée · facture, annulée, close** | | | | | |
| CMC-54 | Décidé | Commande terminée | | ☑ | ☐ | — | ☐ |
| CMC-55 | Décidé | « Noter cet article » (détail) et « Donner mon avis » (carte) mènent à l’écran d’avis de CL-13, qui prend les deux notes séparées (le… | | ☑ | ☐ | ☐ | ☐ |
| CMC-56 | Recommandé | Commande close (fenêtre de retour fermée, vendeur payé) | | ☑ | ☐ | ☐ | ☐ |
| | | **Écran « Code de retrait »** | | | | | |
| CCD-01 | Décidé | Le porteur du code retire le colis sans justificatif | | ☑ | — | ☐ | ☐ |
| CCD-02 | Décidé | « Afficher mon code » | | ☑ | ☐ | — | ☐ |
| CCD-03 | Décidé | Le code se retrouve depuis l’accueil en un toucher | | ☑ | ☐ | — | ☐ |
| CCD-04 | Proposé | Biométrie | | ☑ | ☐ | ☐ | ☐ |
| CCD-05 | Décidé | Code ET QR | | ☑ | ☐ | — | ☐ |
| CCD-06 | Décidé | Accessible tant que le colis n’est pas retiré | | ☑ | — | ☐ | ☐ |
| CCD-07 | Décidé | Un seul code par groupe de remise | | ☑ | — | ☐ | ☐ |
| CCD-08 | Décidé | « Envoyer à quelqu’un » | | ☑ | ☐ | — | ☐ |
| CCD-09 | Recommandé | Colis de valeur | | ☑ | — | ☐ | ☐ |
| CCD-10 | Décidé | Renvoi payant par SMS pour un client sans application | | ☑ | — | ☐ | ☐ |
| CCD-11 | Décidé | Commande « Validée » | | ☑ | — | ☐ | ☐ |
| CCD-12 | Décidé | Trois codes faux au comptoir | | ☑ | — | ☐ | ☐ |
| CCD-13 | Décidé | Changement de relais ou de numéro | | ☑ | — | ☐ | ☐ |
| CCD-14 | Décidé | Capture d’écran autorisée | | ☑ | ☐ | — | ☐ |
| CCD-15 | Décidé | Une notification ne contient jamais le code (push, centre de notifications, écran verrouillé) | | ☑ | — | ☐ | ☐ |
| CCD-16 | Décidé | Hors ligne | | ☑ | ☐ | — | ☐ |
| CCD-17 | Décidé | Sous le code | | ☑ | ☐ | ☐ | ☐ |
| CCD-18 | Décidé | Le relais ne voit jamais le code en clair | | ☑ | — | ☐ | ☐ |
| CCD-19 | Recommandé | Luminosité de l’écran au maximum tant que le QR est affiché, rétablie en quittant | | ☑ | ☐ | — | ☐ |
| | | **Écran « Suivi de commande »** | | | | | |
| CSU-01 | Décidé | Le suivi existe pour empêcher un appel au support | | ☑ | ☐ | ☐ | ☐ |
| CSU-02 | Décidé | Le délai est une heure ou une date ferme, jamais une fourchette | | ☑ | — | ☐ | ☐ |
| CSU-03 | Recommandé | « En attente d’un colis » quand une partie du groupe est au relais et qu’il en manque au moins un | | ☑ | — | ☐ | ☐ |
| CSU-04 | Décidé | Sous le plan, le détail par colis | | ☑ | ☐ | ☐ | ☐ |
| CSU-05 | Décidé | Quatre états seulement, en langage client | | ☑ | ☐ | ☐ | ☐ |
| CSU-06 | Décidé | Le vocabulaire interne (paquet, tournée, affectation, plafond de valeur) reste dans les applications vendeur, livreur et entreprise | | ☑ | — | ☐ | ☐ |
| CSU-07 | Décidé | Anonymat | | ☑ | — | ☐ | ☐ |
| CSU-08 | Décidé | Aucune carte de suivi du livreur en temps réel | | ☑ | ☐ | ☐ | ☐ |
| CSU-09 | Décidé | Colis en retard nommé avant que le client le constate | | ☑ | — | ☐ | ☐ |
| CSU-10 | Décidé | Un incident détecté et non notifié sous 15 minutes (INC-NOTIF-MIN) est un défaut de gravité 1 | | ☑ | — | ☐ | ☐ |
| CSU-11 | Décidé | Un seul bouton « Signaler un problème », toujours visible (barre collante) | | ☑ | ☐ | — | ☐ |
| CSU-12 | Décidé | À « Arrivé au relais » | | ☑ | — | ☐ | ☐ |
| CSU-13 | Recommandé | « Modifier ma commande » reste proposé tant qu’une modification est possible (avant la collecte, ou relais après l’arrivée) | | ☑ | ☐ | ☐ | ☐ |
| | | **Écran « Montant dû » · payer au comptoir** | | | | | |
| CCM-01 | Décidé | montant_dû = frais_garde(t) + reste_validée, calculé par le service de tarification, identique dans l’application, le message et l’écran… | | ☑ | — | ☐ | ☐ |
| CCM-02 | Décidé | Payé en Mobile Money sur le téléphone du client (MTN MoMo ou Orange Money, numéro masqué) | | ☑ | — | ☐ | ☐ |
| CCM-03 | Décidé | 0 F le jour d’arrivée | | ☑ | ☐ | ☐ | ☐ |
| CCM-04 | Décidé | Commande « Validée » | | ☑ | — | ☐ | ☐ |
| CCM-05 | Décidé | États | | ☑ | ☐ | ☐ | ☐ |
| CCM-06 | Recommandé | Le montant est celui du jour | | ☑ | — | ☐ | ☐ |
| CCM-07 | Recommandé | Retrait par un proche | | ☑ | — | ☐ | ☐ |
| | | **Écran « Au comptoir » · le moment du retrait, côté client** | | | | | |
| CCM-08 | Décidé | Deux onglets | | ☑ | ☐ | — | ☐ |
| CCM-09 | Recommandé | Avant la remise | | ☑ | ☐ | — | ☐ |
| CCM-10 | Décidé | Après validation par le gérant | | ☑ | ☐ | ☐ | ☐ |
| CCM-11 | Décidé | Le client est notifié à l’instant du retrait | | ☑ | — | ☐ | ☐ |
| CCM-12 | Décidé | Contrôle poussé activement, avec le portrait de la gérante | | ☑ | ☐ | — | ☐ |
| CCM-13 | Décidé | « Un problème » ouvre un litige au comptoir (CL-11) | | ☑ | — | ☐ | ☐ |
| CCM-14 | Décidé | « Tout est en ordre » ferme la fenêtre de retour | | ☑ | — | ☐ | ☐ |
| CCM-15 | Décidé | Encart | | ☑ | ☐ | ☐ | ☐ |
| CCM-16 | Décidé | Notation en deux notes séparées (le vendeur | | ☑ | ☐ | ☐ | ☐ |
| CCM-17 | À trancher | Fenêtre de notation | | ☑ | — | ☐ | ☐ |
| CCM-18 | Décidé | Retourner un article | | ☑ | — | ☐ | ☐ |
| CCM-19 | Recommandé | L’application du client est la seule source de vérité de « Tout est en ordre » | | ☑ | — | ☐ | ☐ |
| CCM-20 | Décidé | Mode papier du gérant en panne | | ☑ | — | — | ☐ |
| | | **Au comptoir · ce que l’écran du gérant impose** | | | | | |
| CCM-21 | Décidé | Code du client saisi (6 chiffres) ou QR scanné | | ☑ | — | ☐ | ☐ |
| CCM-22 | Décidé | Nombre de colis | | ☑ | — | ☐ | ☐ |
| CCM-23 | Décidé | Montant dû calculé par le système (0 F le jour d’arrivée, garde ensuite, reste d’une commande « Validée »), affiché « Montant dû (MoMo… | | ☑ | — | ☐ | ☐ |
| CCM-24 | Décidé | Qui retire ? Nom du porteur si ce n’est pas le titulaire | | ☑ | — | ☐ | ☐ |
| CCM-25 | Décidé | Photo de remise obligatoire avant validation | | ☑ | — | ☐ | ☐ |
| CCM-26 | Décidé | « Le client signale un problème » ouvre le litige au comptoir | | ☑ | — | ☐ | ☐ |
| CCM-27 | Décidé | Validation bloquée tant que les colis ne sont pas sortis et la photo prise | | ☑ | — | ☐ | ☐ |
| CCM-28 | Décidé | Retrait en moins d’une minute | | ☑ | — | — | ☐ |

## CL-10

| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |
|---|---|---|---|---|---|---|---|
| | | **Centre de notifications** | | | | | |
| CNT-01 | Décidé | Le centre garde tout ce qui a été envoyé au compte, même non ouvert | | ☑ | — | ☐ | ☐ |
| CNT-02 | Décidé | Chaque ligne ouvre directement l’écran exact (lien profond), sans feuille intermédiaire | | ☑ | ☐ | ☐ | ☐ |
| CNT-03 | Décidé | Regroupement par commande | | ☑ | — | ☐ | ☐ |
| CNT-04 | Décidé | Accès par la cloche de l’en-tête d’accueil, avec le badge du nombre de non-lus (3 sur le jeu d’essai) | | ☑ | ☐ | ☐ | ☐ |
| CNT-05 | Décidé | Jamais de code de retrait, d’OTP ni de montant sensible dans une ligne | | ☑ | — | ☐ | ☐ |
| CNT-06 | Décidé | Un bouton vers le réglage des notifications | | ☑ | ☐ | — | ☐ |
| CNT-07 | Recommandé | Non lue | | ☑ | ☐ | ☐ | ☐ |
| CNT-08 | Recommandé | Chaque ligne porte l’icône et le nom de sa catégorie (celles du réglage), l’heure « 08 h 50 » (jamais à la seconde) et le texte complet,… | | ☑ | ☐ | — | ☐ |
| CNT-09 | Recommandé | Le centre garde aussi les SMS envoyés (S1, S2, C12…), marqués « Envoyé par SMS » | | ☑ | — | ☐ | ☐ |
| CNT-10 | Décidé | Hors ligne | | ☑ | ☐ | — | ☐ |
| CNT-11 | Recommandé | État vide | | ☑ | ☐ | — | ☐ |
| CNT-12 | Décidé | Textes du centre en français correct (accents) ou en anglais selon le profil | | ☑ | — | ☐ | ☐ |
| | | **Réglage des notifications** | | | | | |
| CNT-13 | Décidé | « Si l’application est fermée » | | ☑ | — | ☐ | ☐ |
| CNT-14 | Décidé | WhatsApp s’affiche « bientôt », non sélectionnable, tant que l’API n’est pas branchée (FF-WHATSAPP-CANAL fermé, WAP-API | | ☑ | ☐ | ☐ | ☐ |
| CNT-15 | Décidé | Consentement WhatsApp | | ☑ | — | ☐ | ☐ |
| CNT-16 | Décidé | Numéro de notification = celui du compte, masqué (6 77 ·· ·· 41), état « Vérifié » | | ☑ | — | ☐ | ☐ |
| CNT-17 | Décidé | « Ce que tu reçois » | | ☑ | — | ☐ | ☐ |
| CNT-18 | Décidé | Note | | ☑ | ☐ | — | ☐ |
| CNT-19 | Décidé | Le réglage est porté par le compte, pas par l’appareil | | ☑ | — | ☐ | ☐ |
| CNT-20 | Recommandé | Chaque interrupteur s’enregistre au toucher (pas de bouton « Enregistrer »), avec la confirmation « Enregistré sur ton compte » | | ☑ | ☐ | ☐ | ☐ |
| CNT-21 | Recommandé | Toucher une catégorie verrouillée ouvre l’explication (« « Retrait » reste activé »), jamais une désactivation | | ☑ | — | ☐ | ☐ |
| CNT-22 | Recommandé | Chaque message appartient à une catégorie selon le tableau ci-dessus | | ☑ | — | ☐ | ☐ |
| CNT-23 | Décidé | Le réglage est proposé après la première commande, jamais pendant l’inscription | | ☑ | ☐ | — | ☐ |
| | | **Aperçu des notifications push** | | | | | |
| CNT-24 | Décidé | Le push est toujours tenté en premier, pour tous les acteurs | | ☑ | — | ☐ | ☐ |
| CNT-25 | Recommandé | Exceptions de canal fixées par 10.3 et 10.4 | | ☑ | — | ☐ | ☐ |
| CNT-26 | Décidé | Jamais de donnée sensible dans un push | | ☑ | — | ☐ | ☐ |
| CNT-27 | Recommandé | Le texte d’un push peut s’afficher sur l’écran verrouillé | | ☑ | — | ☐ | ☐ |
| CNT-28 | Décidé | Un push de criticité 1 non ouvert sous 10 minutes déclenche le SMS (PUSH-REPLI-MIN) | | ☑ | — | ☐ | ☐ |
| CNT-29 | Recommandé | L’écran « Commande confirmée » affiché après le webhook vaut ouverture du C1 | | ☑ | — | ☐ | ☐ |
| CNT-30 | Décidé | Tout push ouvre l’écran exact concerné (lien profond avec la commande en paramètre) | | ☑ | — | ☐ | ☐ |
| CNT-31 | Décidé | Les messages de criticité 3 n’existent qu’en push | | ☑ | — | ☐ | ☐ |
| CNT-32 | Décidé | Titre 45 caractères au plus, corps 120 | | ☑ | — | ☐ | ☐ |
| CNT-33 | Décidé | Plafond non critique | | ☑ | — | ☐ | ☐ |
| CNT-34 | Décidé | Regroupement | | ☑ | — | ☐ | ☐ |
| CNT-35 | Recommandé | Mise en œuvre du regroupement | | ☑ | — | ☐ | ☐ |
| CNT-36 | Décidé | Nuit | | ☑ | — | ☐ | ☐ |
| CNT-37 | Décidé | Promotions | | ☑ | — | ☐ | ☐ |
| CNT-38 | Décidé | Jeton FCM au couple utilisateur + appareil | | ☑ | — | ☐ | ☐ |
| CNT-39 | Décidé | Déconnexion ou désinstallation | | ☑ | — | ☐ | ☐ |
| CNT-40 | Décidé | Trois accusés | | ☑ | — | ☐ | ☐ |
| | | **Aperçu des SMS et lien court** | | | | | |
| CSM-01 | Décidé | Un SMS ne part que si son absence coûte plus cher que son envoi | | ☑ | — | ☐ | ☐ |
| CSM-02 | Décidé | Au plus 6 SMS payants par commande (SMS-MAX-CMD) | | ☑ | — | ☐ | ☐ |
| CSM-03 | Décidé | C1 | | ☑ | — | ☐ | ☐ |
| CSM-04 | Décidé | C3 | | ☑ | — | ☐ | ☐ |
| CSM-05 | Recommandé | C3 | | ☑ | — | ☐ | ☐ |
| CSM-06 | Recommandé | C3 d’une commande « Validée » | | ☑ | — | ☐ | ☐ |
| CSM-07 | Décidé | S1 (J+2) et S2 (J+4) | | ☑ | — | ☐ | ☐ |
| CSM-08 | Décidé | C4 incident (retard, échec, rupture, dissociation | | ☑ | — | ☐ | ☐ |
| CSM-09 | Décidé | C12 | | ☑ | — | ☐ | ☐ |
| CSM-10 | Recommandé | C12 part au toucher de « Tout est en ordre », sinon 1 h après la remise (MSG-C12-DELAI) | | ☑ | — | ☐ | ☐ |
| CSM-11 | Décidé | Tout le reste (colis intermédiaire C2a, livreur en route, rappels S3 à S5, remboursement) part en push et reste dans le centre | | ☑ | — | ☐ | ☐ |
| CSM-12 | Décidé | Renvoi payant du code | | ☑ | — | ☐ | ☐ |
| CSM-13 | Décidé | Niveaux de criticité | | ☑ | — | ☐ | ☐ |
| CSM-14 | À trancher | Mode économique | | ☑ | — | ☐ | ☐ |
| CSM-15 | Décidé | Jamais de SMS de promotion, jamais de SMS de criticité 3, jamais plus de 6 SMS payants par commande | | ☑ | — | ☐ | ☐ |
| CSM-16 | Décidé | Aucun message vers un numéro non vérifié, sauf le code de vérification (OTP) | | ☑ | — | ☐ | ☐ |
| CSM-17 | Recommandé | Les SMS de criticité 2 (S1, S2, C12) partent entre 7 h et 21 h | | ☑ | — | ☐ | ☐ |
| CSM-18 | Recommandé | Lien court | | ☑ | — | ☐ | ☐ |
| CSM-19 | Décidé | WhatsApp reporté | | ☑ | — | ☐ | ☐ |
| | | **Ton colis t’attend (frais de garde)** | | | | | |
| CGA-01 | Décidé | Grille définitive (24 sept.) | | ☑ | — | ☐ | ☐ |
| CGA-02 | Décidé | L’écran et chaque rappel affichent le montant dû à l’instant T (en grand), le palier suivant avec sa date, la date limite de retrait et… | | ☑ | ☐ | ☐ | ☐ |
| CGA-03 | Décidé | J0 = date de l’accusé fort du message d’arrivée (application ouverte ou SMS délivré) | | ☑ | — | ☐ | ☐ |
| CGA-04 | Décidé | Rang compté en jours calendaires depuis J0 (J0 = rang 1) | | ☑ | — | ☐ | ☐ |
| CGA-05 | Proposé | Jours entiers, sans prorata (GARDE-PRORATA, proposé, paramétrable | | ☑ | — | ☐ | ☐ |
| CGA-06 | Décidé | Le compteur s’arrête au scan de retrait | | ☑ | — | ☐ | ☐ |
| CGA-07 | Décidé | Jamais au-delà de la valeur du colis | | ☑ | — | ☐ | ☐ |
| CGA-08 | Décidé | Un litige suspend le compteur et le renvoi | | ☑ | ☐ | ☐ | ☐ |
| CGA-09 | Recommandé | Un jour où un litige est ouvert, même en cours de journée, n’est pas facturé (lecture favorable au client du prédicat « pas de litige ») | | ☑ | — | ☐ | ☐ |
| CGA-10 | Décidé | Un groupage de liste d’envies ne coûte rien (après le lancement) | | ☑ | — | ☐ | ☐ |
| CGA-11 | Décidé | Zéro espèce | | ☑ | — | ☐ | ☐ |
| CGA-12 | Décidé | Le montant est identique dans l’application, le SMS et l’écran du gérant | | ☑ | — | ☐ | ☐ |
| CGA-13 | Recommandé | La grille s’applique par groupe de remise (un code) | | ☑ | — | ☐ | ☐ |
| CGA-14 | Décidé | Jour d’arrivée | | ☑ | ☐ | ☐ | ☐ |
| CGA-15 | Recommandé | Une seule action principale, « Afficher mon code » (le retrait arrête les frais) | | ☑ | ☐ | — | ☐ |
| CGA-16 | Recommandé | Date limite = dernier jour ouvert de rang ≤ 7 (« retrait avant samedi 26 au soir » quand le 7e jour est un dimanche) | | ☑ | — | ☐ | ☐ |
| CGA-17 | Décidé | Renvoi | | ☑ | — | ☐ | ☐ |
| CGA-18 | Décidé | Le gérant touche 100 F par jour facturé (RELAIS-GAIN-GARDE), versés le vendredi | | ☑ | — | ☐ | ☐ |
| CGA-19 | Décidé | F_client = 1 + bonus_abonnement, bonus = 0 au lancement | | ☑ | — | ☐ | ☐ |
| CGA-20 | Recommandé | Sans accusé fort, le colis n’est jamais facturé | | ☑ | — | ☐ | ☐ |
| CGA-21 | Décidé | Changement de relais | | ☑ | — | ☐ | ☐ |
| CGA-22 | Décidé | Colis en retour déposé au relais | | ☑ | — | ☐ | ☐ |
| CGA-23 | À trancher | Commande « Validée » | | ☑ | — | ☐ | ☐ |
| | | **Série de rappels S0–S5** | | | | | |
| CGA-24 | Décidé | Série | | ☑ | — | ☐ | ☐ |
| CGA-25 | Recommandé | Quand le rang 7 (J+6) tombe un jour fermé, S3 devient « Dernier jour » (le jour J+5 est le dernier jour de retrait) et S4 n’est pas envoyé | | ☑ | — | ☐ | ☐ |
| CGA-26 | Recommandé | Heures d’envoi | | ☑ | — | ☐ | ☐ |
| CGA-27 | Recommandé | Chaque texte est rédigé à partir des « montants affichés » de 10.4 et complété par la conséquence (règle d’en-tête de 10.4), en «… | | ☑ | — | ☐ | ☐ |
| CGA-28 | Décidé | S5 | | ☑ | — | ☐ | ☐ |
| | | **Service d’envoi et journal** | | | | | |
| CSM-20 | Décidé | Une seule couche d’abstraction | | ☑ | — | ☐ | ☐ |
| CSM-21 | Décidé | Responsabilités | | ☑ | — | ☐ | ☐ |
| CSM-22 | Décidé | File durable par criticité | | ☑ | — | ☐ | ☐ |
| CSM-23 | Décidé | Garde-fous | | ☑ | — | ☐ | ☐ |
| CSM-24 | Décidé | Recette en bac à sable | | ☑ | — | ☐ | ☐ |
| CSM-25 | Décidé | Idempotence | | ☑ | — | ☐ | ☐ |
| CSM-26 | Décidé | Événement rejoué | | ☑ | — | ☐ | ☐ |
| CSM-27 | Décidé | État changé entre la file et l’envoi | | ☑ | — | ☐ | ☐ |
| CSM-28 | Décidé | Budget SMS de la commande atteint | | ☑ | — | ☐ | ☐ |
| CSM-29 | Décidé | Message expiré en file | | ☑ | — | ☐ | ☐ |
| CSM-30 | Décidé | Contestation de frais | | ☑ | — | ☐ | ☐ |
| CSM-31 | Décidé | Panne du fournisseur SMS | | ☑ | — | ☐ | ☐ |
| CSM-32 | Décidé | Journal des envois | | ☑ | — | ☐ | ☐ |
| CSM-33 | Décidé | Accusés | | ☑ | — | ☐ | ☐ |

## CL-11

| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |
|---|---|---|---|---|---|---|---|
| | | **Parcours et machine à états** | | | | | |
| CLT-01 | Décidé | Toutes les entrées mènent à l’assistant ou au même dossier | | ☑ | ☐ | ☐ | ☐ |
| CLT-02 | Décidé | Le litige suit la machine à états ouvert → attente_vendeur → en_examen → decide, puis le retour retour_depose → retour_inspecte | | ☑ | — | ☐ | ☐ |
| CLT-03 | Décidé | Un litige porte sur un colis (une sous-commande, un vendeur), jamais sur une ligne d’article ni sur toute la commande | | ☑ | — | ☐ | ☐ |
| | | **Assistant · « Quel colis ? » et « Que s’est-il passé ? »** | | | | | |
| CLT-04 | Décidé | Quatre écrans, un seul choix par écran | | ☑ | ☐ | — | ☐ |
| CLT-05 | Décidé | Étape 1 « Quel colis ? » | | ☑ | ☐ | — | ☐ |
| CLT-06 | Décidé | Une commande à un seul colis démarre à l’étape 2 | | ☑ | ☐ | ☐ | ☐ |
| CLT-07 | Décidé | Étape 2 « Que s’est-il passé ? » | | ☑ | ☐ | — | ☐ |
| CLT-08 | Décidé | Un tap sélectionne et passe à l’étape suivante | | ☑ | ☐ | — | ☐ |
| CLT-09 | Recommandé | Au-delà de 7 jours après le retrait, le premier écran de l’assistant (étape 1, ou étape 2 pour un colis unique) dit que la fenêtre de… | | ☑ | ☐ | ☐ | ☐ |
| | | **Assistant · « Montre-moi »** | | | | | |
| CLT-10 | Décidé | Texte exact | | ☑ | ☐ | — | ☐ |
| CLT-11 | Décidé | Photo obligatoire, sauf pour « Jamais reçu » | | ☑ | ☐ | ☐ | ☐ |
| CLT-12 | Décidé | « Décris ce qui s’est passé » est facultatif et placé en dernier | | ☑ | ☐ | — | ☐ |
| CLT-13 | Décidé | Photos prises par l’API caméra de l’application, envoyées au dossier (POST /disputes/{id}/photos), horodatées côté serveur à la… | | ☑ | — | ☐ | ☐ |
| CLT-14 | Décidé | Aucun écran de l’assistant ne demande une preuve d’achat, la valeur du colis ou l’acceptation de conditions | | ☑ | ☐ | — | ☐ |
| | | **Assistant · « Que veux-tu ? » et signal** | | | | | |
| CLT-15 | Décidé | Trois choix | | ☑ | ☐ | ☐ | ☐ |
| CLT-16 | Décidé | Le dossier est créé à la validation de l’étape 4, avec le colis, le motif, les photos, la description et le souhait | | ☑ | — | ☐ | ☐ |
| CLT-17 | Décidé | Dès la création, l’escrow de la sous-commande est retenu | | ☑ | — | ☐ | ☐ |
| CLT-18 | Recommandé | « Je veux juste signaler » n’ouvre pas de dossier LIT-… | | ☑ | — | ☐ | ☐ |
| CLT-19 | Recommandé | Le remboursement automatique sous le seuil ne s’applique qu’au souhait « Être remboursé » | | ☑ | — | ☐ | ☐ |
| | | **Confirmation du litige** | | | | | |
| CLT-20 | Décidé | La confirmation affiche | | ☑ | ☐ | ☐ | ☐ |
| CLT-21 | Décidé | L’écran dit qu’une personne de BelivaY suit le dossier jusqu’à la décision et que le client est prévenu à chaque étape (notification… | | ☑ | — | ☐ | ☐ |
| CLT-22 | Recommandé | Défaut caché signalé après la fermeture de la fenêtre (vice caché, 100 jours) | | ☑ | — | ☐ | ☐ |
| | | **Remboursement automatique** | | | | | |
| CLT-23 | Décidé | Sous le seuil du palier, il n’y a pas d’écran de litige | | ☑ | ☐ | ☐ | ☐ |
| CLT-24 | Décidé | Seuils | | ☑ | — | ☐ | ☐ |
| CLT-25 | Décidé | Payé par BelivaY, vers le moyen d’origine | | ☑ | — | ☐ | ☐ |
| CLT-26 | Décidé | L’écran ne montre jamais le palier | | ☑ | — | ☐ | ☐ |
| CLT-27 | Recommandé | Le client n’a rien à rapporter | | ☑ | ☐ | ☐ | ☐ |
| CLT-28 | À trancher | [délai] est un délai ferme de versement Mobile Money | | ☑ | — | ☐ | ☐ |
| | | **Litige au comptoir** | | | | | |
| CLT-29 | Décidé | Le litige au comptoir est la voie à privilégier | | ☑ | — | — | ☐ |
| CLT-30 | Décidé | Le gérant constate dans son application, photographie le déballage et garde le colis au relais | | ☑ | — | ☐ | ☐ |
| CLT-31 | Décidé | L’escrow est retenu immédiatement | | ☑ | — | ☐ | ☐ |
| CLT-32 | Recommandé | L’écran client montre le dossier, l’argent retenu, le colis gardé sans frais, l’échéance du vendeur et le souhait du client noté par le… | | ☑ | ☐ | ☐ | ☐ |
| CLT-33 | Décidé | BelivaY répond à un constat du relais sous 48 h ouvrées | | ☑ | — | ☐ | ☐ |
| | | **Suivi du litige · pendant l’examen** | | | | | |
| CLT-34 | Décidé | Suivi en quatre états en langage simple | | ☑ | ☐ | ☐ | ☐ |
| CLT-35 | Décidé | Le compte à rebours du vendeur est visible | | ☑ | — | ☐ | ☐ |
| CLT-36 | Décidé | Dans Mes commandes, la carte dit « En litige · réponse sous X h » et porte le numéro de dossier | | ☑ | ☐ | ☐ | ☐ |
| CLT-37 | Décidé | Le vendeur a 48 h et trois réponses | | ☑ | — | ☐ | ☐ |
| CLT-38 | Décidé | Vendeur silencieux à 48 h | | ☑ | — | ☐ | ☐ |
| CLT-39 | À trancher | Délai ferme de la décision affiché pendant l’examen | | ☑ | — | ☐ | ☐ |
| CLT-40 | Décidé | Pendant tout le litige, l’argent reste bloqué (« rien n’est versé au vendeur ») et le colis gardé au relais ne coûte rien | | ☑ | — | ☐ | ☐ |
| CLT-41 | Décidé | Messagerie du dossier | | ☑ | — | ☐ | ☐ |
| CLT-42 | Décidé | La décision repose sur la chaîne de preuves, côte à côte en console | | ☑ | — | ☐ | ☐ |
| CLT-43 | Recommandé | Le client voit ses photos et celles du déballage, et la photo du colis scellé | | ☑ | — | ☐ | ☐ |
| | | **Suivi du litige · la décision** | | | | | |
| CLT-44 | Décidé | Jamais de refus sans motif écrit | | ☑ | — | ☐ | ☐ |
| CLT-45 | Décidé | Décisions possibles | | ☑ | — | ☐ | ☐ |
| CLT-46 | Décidé | Après une décision de remboursement, l’écran mène à « Retourner un article » | | ☑ | ☐ | — | ☐ |
| CLT-47 | Recommandé | Débouté | | ☑ | — | ☐ | ☐ |
| CLT-48 | Décidé | Coût du retour attribué après arbitrage (vendeur, transporteur ou client en tort), jamais à la demande | | ☑ | — | ☐ | ☐ |
| | | **Arrangement du vendeur** | | | | | |
| CLT-49 | Décidé | Un arrangement compte au moins 40 caractères | | ☑ | — | ☐ | ☐ |
| CLT-50 | Recommandé | Accepter clôt le litige aux conditions proposées (remboursement partiel vers le moyen d’origine, le reste du paiement versé au vendeur) | | ☑ | — | ☐ | ☐ |
| CLT-51 | À trancher | Délai de réponse du client à un arrangement | | ☑ | — | ☐ | ☐ |
| | | **Mes litiges** | | | | | |
| CLT-52 | Décidé | « Mes litiges », accessible depuis le compte | | ☑ | ☐ | ☐ | ☐ |
| CLT-53 | Recommandé | Les remboursements automatiques figurent dans « Terminés » avec leur montant et « sans enquête » | | ☑ | ☐ | ☐ | ☐ |
| CLT-54 | Décidé | Tant qu’un litige est en cours, « Supprimer mon compte » est refusé (CL-13) | | ☑ | — | ☐ | ☐ |
| | | **Règles d’arbitrage** | | | | | |
| CLT-55 | Décidé | Au-dessus du seuil du palier | | ☑ | — | ☐ | ☐ |
| CLT-56 | Décidé | Un litige perdu pèse sur le Trust Score du vendeur | | ☑ | — | ☐ | ☐ |
| CLT-57 | Décidé | Un litige imputable au transport (colis abîmé, scellé rompu) pèse sur le Trust Score de l’entreprise de livraison et de son livreur,… | | ☑ | — | ☐ | ☐ |
| CLT-58 | Décidé | Au-delà du plafond de valeur de l’entreprise de livraison (75 000 F Nouveau, 250 000 F Confirmé), la responsabilité revient au… | | ☑ | — | ☐ | ☐ |
| CLT-59 | Décidé | Tout remboursement va vers le moyen de paiement d’origine, jamais réorienté | | ☑ | — | ☐ | ☐ |
| CLT-60 | À trancher | Montant d’un litige = montant retenu de la sous-commande (articles) | | ☑ | — | ☐ | ☐ |
| CLT-61 | À trancher | Un montant partiel (LIT-2987 | | ☑ | — | ☐ | ☐ |
| | | **IFA (interne)** | | | | | |
| CIF-01 | Décidé | L’IFA (indice de fiabilité acheteur) est le score interne du client | | ☑ | — | ☐ | ☐ |
| CIF-02 | Décidé | Règle fondatrice | | ☑ | — | ☐ | ☐ |
| CIF-03 | Décidé | L’IFA est mesuré dès le premier jour (12 mois glissants) pour calibrer les seuils sur des données réelles | | ☑ | — | ☐ | ☐ |
| CIF-04 | Décidé | Compteur « litiges perdus après instruction » | | ☑ | — | ☐ | ☐ |
| CIF-05 | Décidé | Compteur « litiges retirés après demande de preuve » | | ☑ | — | ☐ | ☐ |
| CIF-06 | Décidé | Compteur « remboursés automatiquement, non instruits » | | ☑ | — | ☐ | ☐ |
| CIF-07 | Décidé | Compteur « annulations après préparation » | | ☑ | — | ☐ | ☐ |
| CIF-08 | Décidé | Compteur « colis non retirés » | | ☑ | — | ☐ | ☐ |
| CIF-09 | Décidé | Compteur « refus au comptoir d’une commande Validée » | | ☑ | — | ☐ | ☐ |
| CIF-10 | Décidé | Les commandes sans incident font remonter le score | | ☑ | — | ☐ | ☐ |
| CIF-11 | Décidé | Palier Élevé | | ☑ | — | ☐ | ☐ |
| CIF-12 | Décidé | Palier Standard | | ☑ | — | ☐ | ☐ |
| CIF-13 | Décidé | Palier À instruire | | ☑ | — | ☐ | ☐ |
| CIF-14 | Décidé | Palier Plafonné | | ☑ | — | ☐ | ☐ |
| CIF-15 | Décidé | Aucun palier négatif (À instruire, Plafonné) avant 5 commandes au total | | ☑ | — | ☐ | ☐ |
| CIF-16 | Décidé | Un seuil absolu de litiges perdus sur 12 mois (N_abs) propose une descente, en plus du ratio | | ☑ | — | ☐ | ☐ |
| CIF-17 | Décidé | Un plafond de remboursements non instruits sur 12 mois (N_auto) fait sortir de l’automatisme, même au palier Élevé | | ☑ | — | ☐ | ☐ |
| CIF-18 | Décidé | Le compteur de rétrogradations est permanent, jamais remis à zéro | | ☑ | — | ☐ | ☐ |
| CIF-19 | Décidé | Identité élargie | | ☑ | — | ☐ | ☐ |
| CIF-20 | Décidé | Toute descente croise d’abord le Trust Score des vendeurs concernés | | ☑ | — | ☐ | ☐ |
| CIF-21 | Décidé | Aucun palier ne rallonge le délai de traitement d’un litige | | ☑ | — | ☐ | ☐ |
| CIF-22 | Décidé | Rétrogradation toujours validée par un humain | | ☑ | — | ☐ | ☐ |
| CIF-23 | Décidé | Un litige gagné ne laisse aucune trace | | ☑ | — | ☐ | ☐ |
| CIF-24 | Décidé | Un litige imputable à BelivaY ou au transport ne fait jamais descendre le client | | ☑ | — | ☐ | ☐ |
| CIF-25 | Décidé | Jamais de bannissement | | ☑ | — | ☐ | ☐ |
| CIF-26 | Décidé | L’IFA est invisible | | ☑ | ☐ | ☐ | ☐ |
| CIF-27 | Décidé | Les compteurs tournent dès le lancement sans aucune décision automatique | | ☑ | — | ☐ | ☐ |
| CIF-28 | Décidé | L’éligibilité au paiement au comptoir lit l’IFA (neutre ou positif) côté serveur | | ☑ | — | ☐ | ☐ |
| | | **Retour · les quatre étapes** | | | | | |
| CRO-01 | Décidé | « Retourner un article » est le deuxième onglet de l’écran de retrait (« Au comptoir » / « Retourner un article ») | | ☑ | ☐ | — | ☐ |
| CRO-02 | Décidé | « Tu n’as rien à organiser » | | ☑ | ☐ | — | ☐ |
| CRO-03 | Décidé | Quatre étapes | | ☑ | ☐ | ☐ | ☐ |
| CRO-04 | Décidé | Encart « Tes [montant] F restent bloqués jusqu’à la clôture | | ☑ | ☐ | ☐ | ☐ |
| CRO-05 | Recommandé | Bouton « J’ai déposé le colis au relais » | | ☑ | — | ☐ | ☐ |
| CRO-06 | Décidé | Aucun frais de garde sur un colis en retour | | ☑ | — | ☐ | ☐ |
| CRO-07 | Décidé | Le trajet retour est une course normale de l’entreprise de livraison, publiée avec les paquets de la zone, avec sa rémunération | | ☑ | — | ☐ | ☐ |
| CRO-08 | Décidé | Le remboursement est déclenché à la réception physique et à l’inspection par le vendeur, jamais à la demande | | ☑ | — | ☐ | ☐ |
| CRO-09 | Décidé | Inspection sous 48 h après réception | | ☑ | — | ☐ | ☐ |
| CRO-10 | Décidé | Toujours vers le moyen de paiement d’origine | | ☑ | — | ☐ | ☐ |
| CRO-11 | Recommandé | Le colis gardé au relais depuis un constat n’est pas redéposé | | ☑ | — | ☐ | ☐ |
| CRO-12 | Décidé | La page « Règles des retours et des litiges » est accessible depuis l’écran de retour | | ☑ | ☐ | — | ☐ |
| | | **Retour · motifs, fenêtre et qui paie** | | | | | |
| CRO-13 | Décidé | Motifs recevables | | ☑ | — | ☐ | ☐ |
| CRO-14 | Décidé | Pas de retour sans motif (changement d’avis) au lancement | | ☑ | ☐ | ☐ | ☐ |
| CRO-15 | Décidé | Fenêtre | | ☑ | — | ☐ | ☐ |
| CRO-16 | Décidé | Vice caché | | ☑ | — | ☐ | ☐ |
| CRO-17 | Décidé | Hors fenêtre | | ☑ | ☐ | ☐ | ☐ |
| CRO-18 | Décidé | Voie à privilégier | | ☑ | — | — | ☐ |
| CRO-19 | Décidé | Carte diaspora | | ☑ | — | ☐ | ☐ |
| CRO-20 | Décidé | Qui paie le trajet | | ☑ | — | ☐ | ☐ |
| CRO-21 | Décidé | Tant que la décision n’est pas rendue, le client lit « Retour gratuit si le problème est validé » | | ☑ | ☐ | — | ☐ |
| CRO-22 | À trancher | Prix du trajet retour | | ☑ | — | ☐ | ☐ |
| CRO-23 | Décidé | Colis volumineux (XL, hors gabarit) | | ☑ | — | ☐ | ☐ |
| CRO-24 | À trancher | Sous un petit seuil, remboursement sans retour physique | | ☑ | — | ☐ | ☐ |
| CRO-25 | À trancher | Défaut caché découvert entre 48 h et 7 jours après le retrait (escrow encore bloqué) | | ☑ | — | ☐ | ☐ |
| | | **Remplacement** | | | | | |
| CRP-01 | Décidé | Le remplacement repart comme une nouvelle expédition, sans frais de livraison pour le client | | ☑ | — | ☐ | ☐ |
| CRP-02 | À trancher | Le vendeur a un délai ferme pour renvoyer, affiché en date et heure | | ☑ | — | ☐ | ☐ |
| CRP-03 | Décidé | Passé ce délai sans expédition, bascule automatique en remboursement (replacement.late), sans demande du client | | ☑ | — | ☐ | ☐ |
| CRP-04 | Décidé | S’il n’a plus l’article | | ☑ | — | ☐ | ☐ |
| CRP-05 | Décidé | L’escrow reste retenu jusqu’à la clôture | | ☑ | — | ☐ | ☐ |
| CRP-06 | Recommandé | Le colis de remplacement a son propre code de retrait, dans Mes commandes, jamais dans une notification | | ☑ | — | ☐ | ☐ |
| CRP-07 | Recommandé | L’article défectueux repart du relais vers le vendeur dans la tournée, sans action du client | | ☑ | — | ☐ | ☐ |
| CRP-08 | Recommandé | Le souhait « Être remplacé » vaut accord du client | | ☑ | — | ☐ | ☐ |
| | | **Textes d’aide, CGV et bandeau** | | | | | |
| CRO-26 | Décidé | Aucun texte de l’application (bandeau, FAQ, CGV, À propos) ne promet un retour ou un remboursement « sans question » ou « garanti » | | ☑ | — | — | ☐ |
| CRO-27 | Décidé | La page « Règles des retours et des litiges » est rédigée en langage simple, en français et en anglais, versionnée | | ☑ | — | — | ☐ |
| | | **API, événements, messages et routes** | | | | | |
| CLT-62 | Décidé | Aucune réponse d’API client ne contient l’IFA, le palier, le nom ou le numéro d’une boutique, ni ce que garde le vendeur | | ☑ | — | ☐ | ☐ |
| CLT-63 | Décidé | Tout montant (retenu, remboursé, écart, trajet) vient du service de tarification, identique dans l’application, la notification et… | | ☑ | — | ☐ | ☐ |
| CLT-64 | Recommandé | Les notifications de litige et de retour partent en push gratuit | | ☑ | — | ☐ | ☐ |
| | | **Valeurs, arbitrages et écarts** | | | | | |
| CRO-28 | Recommandé | Côté client, le vice caché (100 jours, hors escrow) et le défaut caché signalé sous 48 h s’appellent tous deux « défaut caché »,… | | ☑ | ☐ | — | ☐ |
| CLT-65 | Décidé | Tutoiement partout, y compris dans les messages | | ☑ | ☐ | — | ☐ |

## CL-12

| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |
|---|---|---|---|---|---|---|---|
| | | **Annuler une boutique** | | | | | |
| CAN-01 | Décidé | L’écran « Modifier ma commande » a trois onglets | | ☑ | ☐ | — | ☐ |
| CAN-02 | Décidé | Ce qui est possible dépend de l’état réel de chaque sous-commande, jamais d’un délai en minutes | | ☑ | — | ☐ | ☐ |
| CAN-03 | Décidé | Titre « Annuler ma commande », numéro et nombre de boutiques, puis « Tu peux annuler boutique par boutique — le reste de ta commande… | | ☑ | ☐ | — | ☐ |
| CAN-04 | Décidé | Une carte par boutique | | ☑ | ☐ | ☐ | ☐ |
| CAN-05 | Recommandé | Chaque carte annulable affiche, avant tout geste, le montant que le client récupère (« Si tu annules, tu récupères 84 380 F ») | | ☑ | — | ☐ | ☐ |
| CAN-06 | Décidé | Payée, vendeur pas confirmé (« Pas encore confirmée ») | | ☑ | ☐ | ☐ | ☐ |
| CAN-07 | Décidé | Confirmée ou prête, pas encore collectée | | ☑ | ☐ | ☐ | ☐ |
| CAN-08 | Recommandé | L’état « prête » (« Prêt dans X h ») reste annulable | | ☑ | — | ☐ | ☐ |
| CAN-09 | Décidé | Collectée (emballée et scellée par le livreur) ou arrivée au relais | | ☑ | ☐ | ☐ | ☐ |
| CAN-10 | Décidé | Encart « Remboursement immédiat » | | ☑ | — | ☐ | ☐ |
| CAN-11 | Décidé | F = Ram + Rem − Off | | ☑ | — | ☐ | ☐ |
| CAN-12 | Décidé | Remb = P_sc + max(0, F_avant − F_après) | | ☑ | — | ☐ | ☐ |
| CAN-13 | Décidé | Exemple BLV-52107 | | ☑ | — | ☐ | ☐ |
| CAN-14 | Recommandé | Le motif se choisit une seule fois, à l’étape 1 (feuille « Annulation » de Mes commandes, CL-09) | | ☑ | ☐ | ☐ | ☐ |
| CAN-15 | Décidé | Quantité | | ☑ | — | ☐ | ☐ |
| CAN-16 | Décidé | Après l’annulation | | ☑ | ☐ | ☐ | ☐ |
| CAN-17 | Décidé | Si toutes les boutiques sont annulées, la commande passe « annulée » et va dans « Terminées », avec le motif et le montant remboursé | | ☑ | — | ☐ | ☐ |
| CAN-18 | À trancher | Plafond d’annulations après confirmation (ANN-PLAFOND) | | ☑ | — | ☐ | ☐ |
| CAN-19 | Décidé | Effets en chaîne | | ☑ | — | ☐ | ☐ |
| | | **Annuler : cas limites** | | | | | |
| CAN-20 | Décidé | L’état est contrôlé côté serveur au clic | | ☑ | — | ☐ | ☐ |
| CAN-21 | Décidé | Hors ligne | | ☑ | ☐ | — | ☐ |
| CAN-22 | Décidé | Commande « Validée · à payer au retrait » déjà arrivée | | ☑ | — | ☐ | ☐ |
| CAN-23 | Recommandé | Commande déjà retirée (terminée ou en litige) | | ☑ | ☐ | ☐ | ☐ |
| | | **Annulation par le vendeur ou BelivaY** | | | | | |
| CAN-24 | Décidé | Rupture après confirmation | | ☑ | — | ☐ | ☐ |
| CAN-25 | Décidé | Sans vendeur suivant | | ☑ | — | ☐ | ☐ |
| CAN-26 | Décidé | La rupture pèse sur le Trust Score du vendeur défaillant | | ☑ | — | ☐ | ☐ |
| CAN-27 | Décidé | Annulation par BelivaY (fraude, vendeur suspendu, zone inaccessible, aucune entreprise de livraison) | | ☑ | — | ☐ | ☐ |
| CAN-28 | Décidé | Une annulation par BelivaY faute d’entreprise de livraison dans la zone est tracée en console (zones en alerte, chapitre 18) | | ☑ | — | ☐ | ☐ |
| | | **Changer de point relais** | | | | | |
| CRL-01 | Décidé | Onglet « Changer de relais », sous-titre « Gratuit tant que rien n’est collecté | | ☑ | ☐ | — | ☐ |
| CRL-02 | Décidé | Le relais actuel en tête | | ☑ | ☐ | ☐ | ☐ |
| CRL-03 | Décidé | Les autres relais par distance croissante | | ☑ | — | ☐ | ☐ |
| CRL-04 | Décidé | Encart « Ce qui change » | | ☑ | ☐ | — | ☐ |
| CRL-05 | Décidé | Avant collecte | | ☑ | — | ☐ | ☐ |
| CRL-06 | Décidé | Après collecte, en tournée | | ☑ | — | ☐ | ☐ |
| CRL-07 | Recommandé | Commande en partie collectée | | ☑ | — | ☐ | ☐ |
| CRL-08 | Recommandé | Un seul relais par zone | | ☑ | — | ☐ | ☐ |
| | | **Transfert d’un colis arrivé (400 F)** | | | | | |
| CRL-09 | Décidé | Colis arrivé au relais | | ☑ | — | ☐ | ☐ |
| CRL-10 | Recommandé | La garde déjà comptée au premier relais reste due et se paie avec le transfert, en une seule demande MoMo (BLV-52018 | | ☑ | — | ☐ | ☐ |
| CRL-11 | Décidé | La course de transfert est publiée à l’entreprise de livraison avec les paquets de la zone | | ☑ | — | ☐ | ☐ |
| CRL-12 | Décidé | Nouveau relais ⇒ nouveau code | | ☑ | — | ☐ | ☐ |
| CRL-13 | Décidé | J0 = accusé fort de l’arrivée au NOUVEAU relais | | ☑ | — | ☐ | ☐ |
| CRL-14 | Décidé | Le relais d’origine n’est jamais pénalisé | | ☑ | — | ☐ | ☐ |
| CRL-15 | Décidé | Interdit | | ☑ | — | ☐ | ☐ |
| | | **Adresse et autres modifications** | | | | | |
| CMO-01 | Décidé | Adresse à domicile | | ☑ | — | ☐ | ☐ |
| CMO-02 | Recommandé | Choix parmi les adresses par repères enregistrées, ou « Ajouter une adresse par repères » (CL-13) | | ☑ | ☐ | ☐ | ☐ |
| CMO-03 | Décidé | Colis récupéré, en route | | ☑ | — | ☐ | ☐ |
| CMO-04 | Décidé | Quantité | | ☑ | — | ☐ | ☐ |
| CMO-05 | Décidé | Résiliation d’abonnement avec une commande en cours | | ☑ | — | ☐ | ☐ |
| | | **Payer de l’étranger : côté client** | | | | | |
| CET-01 | Décidé | Onglet « Payer de l’étranger » | | ☑ | ☐ | — | ☐ |
| CET-02 | Décidé | Le panier part par le partage natif du téléphone du client (WhatsApp souvent en premier, SMS, e-mail, copier le lien) | | ☑ | ☐ | ☐ | ☐ |
| CET-03 | Recommandé | Avant de partager, le client voit si son panier dépasse le plafond de la carte (272 579 F > 150 000 F) | | ☑ | — | ☐ | ☐ |
| CET-04 | Recommandé | Le client voit qui a payé (« Payée par Hervé, depuis la France · par carte, aujourd’hui à 10 h 06 »), pas le montant débité sur la carte | | ☑ | — | ☐ | ☐ |
| CET-05 | Décidé | Le code de retrait va au bénéficiaire seul | | ☑ | — | ☐ | ☐ |
| | | **Page du payeur : carte et 3-D Secure** | | | | | |
| CET-06 | Recommandé | Page web sans compte, sans dock ni en-tête client | | ☑ | ☐ | — | ☐ |
| CET-07 | Décidé | « Tu offres « Ensemble pyjama satin » à Carine | | ☑ | ☐ | ☐ | ☐ |
| CET-08 | Décidé | Récapitulatif | | ☑ | — | ☐ | ☐ |
| CET-09 | Décidé | Les frais de service sont affichés avant le paiement, sur le récapitulatif et le bouton | | ☑ | ☐ | ☐ | ☐ |
| CET-10 | Décidé | Conversion en euros au taux fixe 655,957, au centime le plus proche | | ☑ | — | ☐ | ☐ |
| CET-11 | Décidé | Carte Visa ou Mastercard | | ☑ | — | ☐ | ☐ |
| CET-12 | Décidé | Encart « Tu seras remboursé, pas elle » | | ☑ | ☐ | ☐ | ☐ |
| CET-13 | Recommandé | Le payeur donne son prénom (montré au bénéficiaire) et son e-mail (reçu et repli des messages) | | ☑ | — | ☐ | ☐ |
| CET-14 | Décidé | Jamais de paiement au comptoir sur ce parcours | | ☑ | — | ☐ | ☐ |
| | | **Page du payeur : refus, plafond, confirmé** | | | | | |
| CET-15 | Décidé | Carte refusée | | ☑ | — | ☐ | ☐ |
| CET-16 | Recommandé | Plafond | | ☑ | — | ☐ | ☐ |
| CET-17 | Décidé | Paiement confirmé | | ☑ | ☐ | ☐ | ☐ |
| CET-18 | Décidé | Le vendeur est libéré à J+14 sur carte (au lieu de 3 jours après la fermeture du retour), pour couvrir la rétrofacturation (preuves… | | ☑ | — | ☐ | ☐ |
| | | **Messages au payeur** | | | | | |
| CET-19 | Décidé | Messages au payeur | | ☑ | — | ☐ | ☐ |
| CET-20 | Décidé | Aucun message entre 22 h et 7 h, heure locale du payeur, sauf criticité 1 | | ☑ | — | ☐ | ☐ |
| CET-21 | Décidé | Le payeur ne reçoit jamais le code de retrait | | ☑ | — | ☐ | ☐ |
| CET-22 | Décidé | Preuve de retrait | | ☑ | — | ☐ | ☐ |
| CET-23 | Recommandé | Incident | | ☑ | — | ☐ | ☐ |
| CET-24 | Recommandé | Frais de service carte en cas d’annulation | | ☑ | — | ☐ | ☐ |

## CL-13

| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |
|---|---|---|---|---|---|---|---|
| | | **Écran « Mon compte »** | | | | | |
| CCO-01 | Recommandé | Compte minimal | | ☑ | ☐ | — | ☐ |
| CCO-02 | Décidé | Avantages actifs écrits en clair avec leur plafond (« Remboursement immédiat jusqu’à 3 000 F », « Paiement au comptoir jusqu’à 50 000 F ») | | ☑ | ☐ | ☐ | ☐ |
| CCO-03 | Décidé | Les avantages et leurs plafonds viennent du serveur | | ☑ | — | ☐ | ☐ |
| CCO-04 | Recommandé | Compte neuf | | ☑ | — | ☐ | ☐ |
| CCO-05 | Décidé | Relais habituel affiché avec son gérant, ses horaires et « Changer » | | ☑ | ☐ | ☐ | ☐ |
| CCO-06 | Décidé | Numéro vérifié masqué au milieu (« 6 77 ·· ·· 41 ») avec « Vérifié » | | ☑ | — | ☐ | ☐ |
| CCO-07 | Décidé | Le compte est le point d’entrée de tout ce qui concerne la cliente | | ☑ | ☐ | ☐ | ☐ |
| CCO-08 | Décidé | Aucun encart « Prime · actif » ni aucun encart d’abonnement tant que FF-ABONNEMENT est fermé | | ☑ | ☐ | ☐ | ☐ |
| CCO-09 | Décidé | Relais, adresse et moyen de paiement ne sont demandés qu’à la première commande | | ☑ | ☐ | — | ☐ |
| | | **Écran « Mes adresses »** | | | | | |
| CCO-10 | Décidé | Adresse de livraison par repères | | ☑ | — | ☐ | ☐ |
| CCO-11 | Recommandé | Quartier hors des zones exploitées | | ☑ | — | ☐ | ☐ |
| CCO-12 | Recommandé | Ce que voit le livreur à domicile | | ☑ | — | ☐ | ☐ |
| CCO-13 | Décidé | Livraison à domicile au lancement | | ☑ | — | ☐ | ☐ |
| | | **Écran « Moyens de paiement »** | | | | | |
| CCO-14 | Décidé | Moyens de paiement | | ☑ | ☐ | ☐ | ☐ |
| CCO-15 | Recommandé | Un nouveau numéro de paiement est vérifié par un code SMS avant d’être enregistré | | ☑ | — | ☐ | ☐ |
| CCO-16 | Décidé | Remboursement toujours vers le moyen de paiement d’origine | | ☑ | — | ☐ | ☐ |
| CCO-17 | Décidé | La carte n’est pas un moyen enregistré de la cliente | | ☑ | ☐ | ☐ | ☐ |
| | | **Écran « Factures »** | | | | | |
| CCO-18 | Décidé | Une facture PDF par commande terminée, générée côté serveur, partageable | | ☑ | — | ☐ | ☐ |
| CCO-19 | Décidé | Commande annulée | | ☑ | ☐ | ☐ | ☐ |
| CCO-20 | Recommandé | La facture est émise par BelivaY et ne porte jamais le nom de la boutique (anonymat) | | ☑ | — | ☐ | ☐ |
| CCO-21 | Recommandé | Commandes de plus de 12 mois archivées | | ☑ | — | ☐ | ☐ |
| | | **Écran « Supprimer mon compte »** | | | | | |
| CCO-22 | Décidé | « Supprimer mon compte » est impossible tant qu’une commande ou un litige est en cours | | ☑ | — | ☐ | ☐ |
| CCO-23 | Recommandé | Suppression confirmée par un code SMS au numéro vérifié | | ☑ | — | ☐ | ☐ |
| CCO-24 | Décidé | Après le lancement | | ☑ | — | ☐ | ☐ |
| | | **Écrans actuels retirés : fidélité, parrainage, portefeuille** | | | | | |
| CCO-25 | Décidé | Ni points, ni niveaux client, ni parrainage, ni porte-monnaie au lancement | | ☑ | ☐ | ☐ | ☐ |
| | | **Écran « Donner mon avis »** | | | | | |
| CAV-01 | Décidé | La notation n’est demandée qu’après la validation du retrait | | ☑ | — | ☐ | ☐ |
| CAV-02 | Décidé | Deux onglets | | ☑ | ☐ | — | ☐ |
| CAV-03 | Décidé | Rappel de la commande | | ☑ | ☐ | — | ☐ |
| CAV-04 | Décidé | Le vendeur | | ☑ | ☐ | — | ☐ |
| CAV-05 | Décidé | Le gérant du relais, nommé | | ☑ | ☐ | — | ☐ |
| CAV-06 | Décidé | Deux notes séparées, jamais une note unique pour le vendeur et le relais | | ☑ | — | ☐ | ☐ |
| CAV-07 | Décidé | Commentaire facultatif et photo facultative | | ☑ | ☐ | ☐ | ☐ |
| CAV-08 | Décidé | Sous le bouton « Envoyer mes notes » | | ☑ | ☐ | — | ☐ |
| CAV-09 | Décidé | Acheteur vérifié uniquement | | ☑ | — | ☐ | ☐ |
| CAV-10 | À trancher | Fenêtre de notation limitée après le retrait (AVIS-FENETRE), puis fermée | | ☑ | — | ☐ | ☐ |
| CAV-11 | Décidé | Une note par (commande, cible), cible = vendeur ou relais | | ☑ | — | ☐ | ☐ |
| CAV-12 | Recommandé | Commande de plusieurs boutiques | | ☑ | — | ☐ | ☐ |
| CAV-13 | Proposé | Note ≤ AVIS-BAS (2 étoiles, proposé au registre mais rangé « à trancher » en 19.4) | | ☑ | ☐ | ☐ | ☐ |
| CAV-14 | Recommandé | Note en mots sous les étoiles | | ☑ | ☐ | — | ☐ |
| | | **Règles et calculs des avis** | | | | | |
| CAV-15 | Décidé | Pas de négociation | | ☑ | — | ☐ | ☐ |
| CAV-16 | Décidé | Modération | | ☑ | — | ☐ | ☐ |
| CAV-17 | Décidé | Avis cumulés sur tout le produit maître, quel que soit le vendeur attribué | | ☑ | — | ☐ | ☐ |
| CAV-18 | Décidé | Ce que les avis alimentent | | ☑ | — | ☐ | ☐ |
| CAV-19 | Décidé | La note « boutique » s’affiche « le vendeur » | | ☑ | — | ☐ | ☐ |
| CAV-20 | Décidé | Un relais qui passe sous le seuil est revu par Opérations zone, jamais suspendu automatiquement | | ☑ | — | ☐ | ☐ |
| CAV-21 | Décidé | Un avis bas causé par le transport ne pénalise pas le vendeur | | ☑ | — | ☐ | ☐ |
| CAV-22 | Décidé | Le gérant voit sa moyenne et ses derniers commentaires dans son application, jamais l’identité du client | | ☑ | — | ☐ | ☐ |
| CAV-23 | Décidé | La lecture des avis (onglet Avis de la fiche | | ☑ | — | — | ☐ |
| | | **Écran « Aide et support »** | | | | | |
| CSV-01 | Décidé | Aide en quatre canaux | | ☑ | ☐ | ☐ | ☐ |
| CSV-02 | Décidé | Table des canaux | | ☑ | ☐ | — | ☐ |
| CSV-03 | Décidé | WhatsApp | | ☑ | ☐ | ☐ | ☐ |
| CSV-04 | Proposé | Heures du support humain affichées (SUP-HORAIRES, 7 h – 21 h, 7 j/7 proposé) avec l’état ouvert ou fermé | | ☑ | ☐ | ☐ | ☐ |
| CSV-05 | Recommandé | Délai de première réponse affiché (SUP-DELAI, 4 h ouvrées proposé) | | ☑ | ☐ | ☐ | ☐ |
| CSV-06 | Recommandé | Avertissement permanent | | ☑ | ☐ | — | ☐ |
| CSV-07 | Recommandé | Espace vendeur | | ☑ | ☐ | — | ☐ |
| | | **Écran « Questions fréquentes »** | | | | | |
| CSV-08 | Décidé | Questions fréquentes par thème | | ☑ | ☐ | ☐ | ☐ |
| CSV-09 | Recommandé | Les montants et délais des réponses sont des paramètres du registre, jamais écrits en dur | | ☑ | — | ☐ | ☐ |
| CSV-10 | Recommandé | Chaque réponse finit, quand c’est utile, par un lien vers l’écran concerné | | ☑ | ☐ | — | ☐ |
| | | **Écrans « Messagerie » et fil de conversation** | | | | | |
| CSV-11 | Décidé | Messagerie interne | | ☑ | — | ☐ | ☐ |
| CSV-12 | Décidé | Anonymat dans les fils | | ☑ | — | ☐ | ☐ |
| CSV-13 | Décidé | BelivaY (console) ne lit une conversation client-vendeur que dans un dossier ouvert | | ☑ | — | ☐ | ☐ |
| CSV-14 | Recommandé | « Écrire au support » | | ☑ | ☐ | ☐ | ☐ |
| CSV-15 | Recommandé | Un fil de support peut être marqué « Résolue » par le support | | ☑ | — | ☐ | ☐ |
| | | **Feuille « Demander un rappel »** | | | | | |
| CSV-16 | Décidé | Appel | | ☑ | — | ☐ | ☐ |
| CSV-17 | Recommandé | Créneaux proposés dans les heures du support (SUP-HORAIRES) | | ☑ | — | ☐ | ☐ |
| | | **Pages légales** | | | | | |
| CLG-01 | Décidé | Textes | | ☑ | — | — | ☐ |
| CLG-02 | Décidé | Accessibles depuis le compte, le pied de l’écran de paiement et la page de retour | | ☑ | ☐ | — | ☐ |
| CLG-03 | Décidé | Chaque texte est versionné (numéro et date) | | ☑ | — | ☐ | ☐ |
| CLG-04 | Décidé | Aucune case à cocher dans le parcours d’achat | | ☑ | ☐ | ☐ | ☐ |
| CLG-05 | Décidé | Rédaction en langage simple, en français et en anglais | | ☑ | ☐ | ☐ | ☐ |
| CLG-06 | Recommandé | Le contenu reprend les règles de la spec (garde, retours, comptoir, carte, anonymat) | | ☑ | — | — | ☐ |
| CLG-07 | Recommandé | Un changement de tarif (grille de garde, frais) est annoncé avant d’entrer en vigueur et ne s’applique jamais à une commande déjà passée… | | ☑ | — | ☐ | ☐ |
| | | **Mode dégradé : réseau lent, hors ligne, 2G** | | | | | |
| CDM-01 | Décidé | Bannière « Connexion lente » (au-delà de NET-LENT, 3 s par requête) ou « Hors ligne », en haut de l’écran | | ☑ | ☐ | ☐ | ☐ |
| CDM-02 | Décidé | Pages déjà vues servies depuis le cache | | ☑ | ☐ | — | ☐ |
| CDM-03 | Proposé | Le code à 6 chiffres reste lisible hors ligne après un premier affichage (CACHE-CODE) | | ☑ | ☐ | — | ☐ |
| CDM-04 | Décidé | Images compressées et chargement progressif | | ☑ | ☐ | — | ☐ |
| CDM-05 | Décidé | Mode « données économes » | | ☑ | ☐ | — | ☐ |
| CDM-06 | Décidé | Toute action d’argent (payer, annuler, contester) exige la connexion | | ☑ | ☐ | — | ☐ |
| CDM-07 | Décidé | Le SMS de repli reste le canal du code quand l’application ne répond pas | | ☑ | — | ☐ | ☐ |
| CDM-08 | Décidé | Hors ligne au comptoir | | ☑ | — | ☐ | ☐ |
| | | **Écran « Réglages »** | | | | | |
| CRG-01 | Recommandé | Langue | | ☑ | ☐ | ☐ | ☐ |
| CRG-02 | Recommandé | Pidgin choisi | | ☑ | — | — | ☐ |
| CRG-03 | Décidé | Langue et thème sont portés par le compte (2.6) et suivent la cliente sur tous ses téléphones | | ☑ | — | ☐ | ☐ |
| CRG-04 | Décidé | Thème | | ☑ | ☐ | ☐ | ☐ |
| CRG-05 | Recommandé | Taille du texte | | ☑ | ☐ | — | ☐ |
| CRG-06 | Recommandé | Données économes | | ☑ | ☐ | — | ☐ |
| CRG-07 | Recommandé | Mesure d’audience | | ☑ | ☐ | ☐ | ☐ |
| CRG-08 | Recommandé | Les réglages s’appliquent au toucher, sans bouton « Enregistrer » | | ☑ | ☐ | — | ☐ |

## CL-14

| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |
|---|---|---|---|---|---|---|---|
| | | **Interrupteurs (32.1)** | | | | | |
| CFS-01 | Décidé | Six interrupteurs de fonctionnalité existent dès le lancement, tous fermés | | ☑ | ☐ | ☐ | ☐ |
| CFS-02 | Décidé | Interrupteur fermé = module invisible | | ☑ | ☐ | ☐ | ☐ |
| CFS-03 | Décidé | FF-ABONNEMENT masque aussi les encarts des autres chapitres | | ☑ | ☐ | ☐ | ☐ |
| CFS-04 | Recommandé | Un ancien lien vers un module fermé ouvre une page neutre, « Ce lien ne mène à aucune page », avec « Retour à l’accueil » | | ☑ | ☐ | — | ☐ |
| CFS-05 | Recommandé | L’interrupteur s’applique côté serveur | | ☑ | — | ☐ | ☐ |
| CFS-06 | Décidé | Tous les codes de paramètres des modules après lancement sont créés dans la même table que ceux du lancement, inactifs derrière… | | ☑ | — | ☐ | ☐ |
| CFS-07 | Décidé | Aucun module ne s’active avec une valeur « à trancher » | | ☑ | — | ☐ | ☐ |
| CFS-08 | Décidé | L’abonnement ouvre au 2e ou 3e trimestre d’exploitation (proposé à partir du 7e mois), Business en dernier, après mesure du panier moyen… | | ☑ | — | — | ☐ |
| CFS-09 | Recommandé | Tant qu’un interrupteur est fermé, le point relais et le vendeur masquent aussi ce qui en dépend | | ☑ | — | ☐ | ☐ |
| CFS-10 | Recommandé | La pastille « Après le lancement · interrupteur fermé » et le code FF-… affichés en tête des écrans du prototype sont des annotations | | ☑ | — | — | ☐ |
| CFS-11 | Décidé | FF-WHATSAPP-CANAL reste fermé | | ☑ | ☐ | ☐ | ☐ |
| | | **Abonnements** | | | | | |
| CAB-01 | Décidé | Cinq paliers | | ☑ | — | ☐ | ☐ |
| CAB-02 | Décidé | Ordre d’affichage imposé | | ☑ | ☐ | — | ☐ |
| CAB-03 | Recommandé | Sur mobile, les cartes s’empilent | | ☑ | ☐ | — | ☐ |
| CAB-04 | Décidé | Bascule annuelle activée par défaut | | ☑ | — | ☐ | ☐ |
| CAB-05 | Décidé | « Le plus choisi » n’apparaît que lorsque c’est vrai | | ☑ | ☐ | — | ☐ |
| CAB-06 | Recommandé | « Vrai » veut dire | | ☑ | — | ☐ | ☐ |
| CAB-07 | Décidé | Les cartes montrent les avantages du tableau 21.2 et rien d’autre | | ☑ | ☐ | ☐ | ☐ |
| CAB-08 | Décidé | « Illimité* » = usage normal, jusqu’à 30 commandes par mois (70 pour Business), écrit dans les conditions et en note sous les cartes | | ☑ | ☐ | ☐ | ☐ |
| CAB-09 | Décidé | Business est réservé aux revendeurs vérifiés (patente ou RCCM) et sort après les autres paliers | | ☑ | — | ☐ | ☐ |
| CAB-10 | Décidé | Encart « Ce qui n’est jamais restreint au palier gratuit » | | ☑ | ☐ | ☐ | ☐ |
| CAB-11 | Décidé | Seuils sans abonnement | | ☑ | — | ☐ | ☐ |
| CAB-12 | Décidé | Ce qui est offert, par le seuil comme par l’abonnement, est la livraison de base (premier ramassage + remise) au tarif d’un colis S | | ☑ | — | ☐ | ☐ |
| CAB-13 | Décidé | Le prix des produits est identique pour tous | | ☑ | — | ☐ | ☐ |
| CAB-14 | Décidé | Portes d’entrée affichées sous les cartes | | ☑ | ☐ | — | ☐ |
| CAB-15 | Recommandé | Aucune estimation personnelle avant la souscription (pas de simulateur) | | ☑ | — | ☐ | ☐ |
| | | **Déclencheur au panier** | | | | | |
| CAB-16 | Décidé | Déclencheur au paiement | | ☑ | — | ☐ | ☐ |
| CAB-17 | Décidé | Jamais sur l’écran de confirmation de commande (chapitre 8), ni sur l’attente de paiement Mobile Money | | ☑ | — | ☐ | ☐ |
| CAB-18 | Recommandé | Emplacement | | ☑ | ☐ | — | ☐ |
| CAB-19 | Décidé | Le déclencheur vise les clients occasionnels (2 commandes par mois ou moins), pas les gros acheteurs | | ☑ | — | ☐ | ☐ |
| CAB-20 | Recommandé | Conditions d’affichage, toutes vraies | | ☑ | — | ☐ | ☐ |
| CAB-21 | Recommandé | Le montant cité est la livraison de base réellement payée dans ce panier (ici 900 F = 500 + 400), recalculé par le service de… | | ☑ | — | ☐ | ☐ |
| | | **Souscrire** | | | | | |
| CAB-22 | Décidé | Souscription par prélèvement Mobile Money annoncé | | ☑ | — | ☐ | ☐ |
| CAB-23 | Décidé | Premier mois Prime à 1 500 F, une fois par compte ET par numéro MoMo | | ☑ | — | ☐ | ☐ |
| CAB-24 | Recommandé | L’essai se poursuit en Prime mensuel à 4 000 F, sauf résiliation, avec la même annonce par push avant le prélèvement | | ☑ | — | ☐ | ☐ |
| CAB-25 | Recommandé | Essai déjà utilisé par le compte ou par le numéro | | ☑ | — | ☐ | ☐ |
| CAB-26 | Décidé | Pass 7 jours à 1 500 F | | ☑ | — | ☐ | ☐ |
| CAB-27 | Recommandé | « Non renouvelable dans le mois » | | ☑ | — | ☐ | ☐ |
| CAB-28 | Décidé | Annuel | | ☑ | — | ☐ | ☐ |
| CAB-29 | Décidé | Conditions visibles avant de payer | | ☑ | ☐ | ☐ | ☐ |
| CAB-30 | Décidé | L’abonnement est lié au compte ET au numéro MoMo, non transférable, sauf Business et ses comptes déclarés | | ☑ | — | ☐ | ☐ |
| CAB-31 | Recommandé | Business s’active après vérification d’un justificatif (patente ou RCCM) envoyé en messagerie (CL-13) | | ☑ | — | ☐ | ☐ |
| | | **Mon abonnement, Résilier** | | | | | |
| CAB-32 | Décidé | Compteur d’économies dans le profil | | ☑ | — | ☐ | ☐ |
| CAB-33 | Recommandé | Le compteur ne compte que ce que l’abonnement a donné | | ☑ | — | ☐ | ☐ |
| CAB-34 | Recommandé | Les avantages s’appliquent aux commandes payées après le début de l’abonnement | | ☑ | — | ☐ | ☐ |
| CAB-35 | Décidé | Quotas mensuels non reportables | | ☑ | — | ☐ | ☐ |
| CAB-36 | Recommandé | Une commande dont la livraison est déjà offerte par le seuil ne consomme pas de quota et ne compte pas dans les 30 commandes de l’usage… | | ☑ | — | ☐ | ☐ |
| CAB-37 | Décidé | Tarif garanti tant que l’abonnement reste actif sans interruption, jamais « à vie » | | ☑ | — | ☐ | ☐ |
| CAB-38 | Recommandé | Reprendre un abonnement résilié avant son terme garde le tarif, sans nouvel essai | | ☑ | — | ☐ | ☐ |
| CAB-39 | Décidé | Renouvellement annoncé par push avant chaque prélèvement, jamais par SMS promotionnel | | ☑ | — | ☐ | ☐ |
| CAB-40 | Recommandé | Jours de garde gratuits des abonnés | | ☑ | — | ☐ | ☐ |
| CAB-41 | Recommandé | La grille de garde et le renvoi au vendeur se décalent du nombre de jours offerts | | ☑ | — | ☐ | ☐ |
| CAB-42 | Recommandé | L’annonce du renouvellement part 3 jours avant le prélèvement, comme pour le panier famille (FAM-RENOUV-PREAVIS) | | ☑ | — | ☐ | ☐ |
| CAB-43 | Décidé | Échec de prélèvement MoMo | | ☑ | — | ☐ | ☐ |
| CAB-44 | Recommandé | Pendant la grâce, l’abonnement reste actif et l’écran propose de payer (même numéro ou autre moyen) | | ☑ | — | ☐ | ☐ |
| CAB-45 | Décidé | Résiliation honnête | | ☑ | ☐ | ☐ | ☐ |
| CAB-46 | Recommandé | Dans la feuille, « Résilier Prime » est l’action principale et « Garder Prime » l’action secondaire | | ☑ | ☐ | — | ☐ |
| CAB-47 | Décidé | Résiliable en un tap | | ☑ | — | ☐ | ☐ |
| CAB-48 | Recommandé | Le mensuel et l’essai résiliés restent actifs jusqu’à la fin de la période payée | | ☑ | — | ☐ | ☐ |
| CAB-49 | Décidé | Résiliation avec commande en cours | | ☑ | — | ☐ | ☐ |
| | | **Ma cagnotte** | | | | | |
| CAB-50 | Décidé | Cagnotte de 2 % sur le sous-total produits (Prime, Prime Duo, Business), jamais sur la livraison | | ☑ | — | ☐ | ☐ |
| CAB-51 | Décidé | Une annulation partielle annule la cagnotte de la part annulée seulement | | ☑ | — | ☐ | ☐ |
| CAB-52 | Recommandé | La cagnotte se crédite par sous-commande, à la libération de chacune (un colis d’un vendeur Or est crédité avant celui d’un vendeur Argent) | | ☑ | — | ☐ | ☐ |
| CAB-53 | Recommandé | La cagnotte disponible se déduit d’une commande suivante, sur la ligne de remise du panier | | ☑ | — | ☐ | ☐ |
| CAB-54 | Recommandé | Chaque ligne affiche sa date de crédit et sa date d’expiration | | ☑ | ☐ | — | ☐ |
| | | **Parrainer un proche** | | | | | |
| CAB-55 | Décidé | Parrainage | | ☑ | — | ☐ | ☐ |
| CAB-56 | Recommandé | La récompense reporte d’un mois le prochain prélèvement (annuel | | ☑ | — | ☐ | ☐ |
| CAB-57 | Recommandé | Lien de parrainage neutre (ni nom ni numéro), partagé depuis le téléphone du client | | ☑ | — | ☐ | ☐ |
| CAB-58 | Recommandé | Le filleul n’a pas de récompense définie | | ☑ | ☐ | ☐ | ☐ |
| | | **Offrir un abonnement** | | | | | |
| CAB-59 | Décidé | Un payeur à l’étranger peut offrir un abonnement à son bénéficiaire | | ☑ | — | ☐ | ☐ |
| CAB-60 | Recommandé | Le bénéficiaire est désigné par son numéro BelivaY et confirmé par son prénom et l’initiale de son nom | | ☑ | — | ☐ | ☐ |
| CAB-61 | Recommandé | Abonnement offert | | ☑ | — | ☐ | ☐ |
| CAB-62 | Décidé | Carte | | ☑ | — | ☐ | ☐ |
| | | **Abonnement : économie et API** | | | | | |
| CAB-63 | Décidé | Tous les seuils et quotas sont des paramètres (ABO-*), versionnés et modifiables en console sans redéploiement | | ☑ | — | ☐ | ☐ |
| CAB-64 | Décidé | Aucune formule ne doit faire passer une commande sous le plancher de contribution | | ☑ | — | ☐ | ☐ |
| CAB-65 | Décidé | subscription.renewed est consommé par la cagnotte et les quotas | | ☑ | — | ☐ | ☐ |
| CAB-66 | Décidé | Les routes sont indicatives | | ☑ | — | ☐ | ☐ |
| CAB-67 | Recommandé | Seuil domicile des abonnés | | ☑ | — | ☐ | ☐ |
| | | **Mes listes, Nouvelle liste** | | | | | |
| CLE-01 | Décidé | Une liste par défaut (les favoris) et des listes nommées, vivantes | | ☑ | — | ☐ | ☐ |
| CLE-02 | Décidé | Favoris = liste par défaut = Sauvegardés | | ☑ | — | ☐ | ☐ |
| CLE-03 | Décidé | Les favoris sont une seule liste | | ☑ | — | ☐ | ☐ |
| CLE-04 | Décidé | Les favoris sont un signal d’intention qui nourrit le rayon « favoris de retour en stock » et les alertes prix | | ☑ | — | ☐ | ☐ |
| CLE-05 | Décidé | Alertes baisse de prix et retour en stock, sur la variante précise, par push gratuit | | ☑ | — | ☐ | ☐ |
| CLE-06 | Décidé | La liste est distincte du partage de panier (chapitre 7, CL-07) | | ☑ | — | ☐ | ☐ |
| CLE-07 | Décidé | Créer une liste | | ☑ | — | ☐ | ☐ |
| CLE-08 | Décidé | Mode groupé | | ☑ | — | ☐ | ☐ |
| CLE-09 | Décidé | Plafond absolu du groupage | | ☑ | — | ☐ | ☐ |
| CLE-10 | Décidé | Un relais saturé refuse les nouvelles listes groupées | | ☑ | — | ☐ | ☐ |
| | | **Ma liste** | | | | | |
| CLE-11 | Décidé | Contenu d’un article | | ☑ | — | ☐ | ☐ |
| CLE-12 | Décidé | Le propriétaire suit « 2 articles sur 4 offerts » et la date de remise | | ☑ | ☐ | — | ☐ |
| CLE-13 | Décidé | Pendant l’attente, il peut retirer un article non offert (instantané) | | ☑ | — | ☐ | ☐ |
| CLE-14 | Décidé | Un article déjà offert ne se retire jamais | | ☑ | — | ☐ | ☐ |
| CLE-15 | Décidé | « Démarrer la livraison maintenant » | | ☑ | — | ☐ | ☐ |
| CLE-16 | Décidé | Plusieurs contributeurs sont possibles, article par article | | ☑ | — | ☐ | ☐ |
| CLE-17 | Recommandé | Hors mode surprise, le propriétaire voit le prénom de celui qui a offert chaque article et l’état du colis | | ☑ | ☐ | — | ☐ |
| CLE-18 | Recommandé | Mode surprise côté propriétaire | | ☑ | ☐ | — | ☐ |
| | | **Envoyer ma liste** | | | | | |
| CLE-19 | Décidé | Trois choix d’adresse | | ☑ | — | ☐ | ☐ |
| CLE-20 | Décidé | « Avec mon adresse » est bloqué tant que le propriétaire n’a pas choisi de relais habituel | | ☑ | — | ☐ | ☐ |
| CLE-21 | Recommandé | Liste groupée | | ☑ | — | ☐ | ☐ |
| CLE-22 | Décidé | Une adresse tierce hors zone exploitée est signalée à l’envoi avec son délai réel, une date ferme | | ☑ | — | ☐ | ☐ |
| CLE-23 | Décidé | Mode surprise activé | | ☑ | — | ☐ | ☐ |
| CLE-24 | À trancher | Validité du lien | | ☑ | — | ☐ | ☐ |
| CLE-25 | Décidé | Canaux | | ☑ | — | ☐ | ☐ |
| CLE-26 | Recommandé | Dès qu’un cadeau est payé, l’adresse et le mode de remise d’une liste partagée ne changent plus | | ☑ | — | ☐ | ☐ |
| | | **Liste partagée** | | | | | |
| CLE-27 | Décidé | Celui qui offre voit les articles, leurs prix, leur disponibilité et le coût de livraison ligne par ligne | | ☑ | — | ☐ | ☐ |
| CLE-28 | Décidé | Il voit le quartier du relais de retrait, jamais l’adresse ni le numéro du propriétaire, ni ses autres commandes | | ☑ | — | ☐ | ☐ |
| CLE-29 | Décidé | Un article déjà offert est verrouillé et grisé pour tous | | ☑ | — | ☐ | ☐ |
| CLE-30 | Recommandé | Les prénoms des personnes qui ont offert ne sont jamais montrés aux autres visiteurs | | ☑ | ☐ | — | ☐ |
| CLE-31 | Décidé | Un article en rupture est attribué au vendeur suivant du même produit, au prix du moment | | ☑ | — | ☐ | ☐ |
| CLE-32 | Décidé | Les trois étapes sont écrites en clair | | ☑ | ☐ | — | ☐ |
| CLE-33 | Décidé | Lien expiré | | ☑ | ☐ | ☐ | ☐ |
| | | **Offrir un article, Cadeau payé** | | | | | |
| CLE-34 | Décidé | Qui paie | | ☑ | — | ☐ | ☐ |
| CLE-35 | Recommandé | Un invité donne son prénom (que le propriétaire verra, sauf en mode surprise), son moyen de paiement et un e-mail pour les messages | | ☑ | — | ☐ | ☐ |
| CLE-36 | Décidé | Où va le colis | | ☑ | — | ☐ | ☐ |
| CLE-37 | Décidé | Quel abonnement | | ☑ | — | ☐ | ☐ |
| CLE-38 | Décidé | Verrou au clic sur payer, en même temps que la réservation de stock | | ☑ | — | ☐ | ☐ |
| CLE-39 | Décidé | Prix modifié depuis le partage | | ☑ | — | ☐ | ☐ |
| CLE-40 | Décidé | Article retiré de la liste pendant un paiement | | ☑ | — | ☐ | ☐ |
| CLE-41 | Décidé | Transparence au moment d’offrir, en mode groupé | | ☑ | ☐ | — | ☐ |
| CLE-42 | Décidé | Escrow normal | | ☑ | — | ☐ | ☐ |
| CLE-43 | Décidé | Qui confirme et ouvre un litige | | ☑ | — | ☐ | ☐ |
| CLE-44 | Décidé | Remboursement au payeur, sur son moyen de paiement | | ☑ | — | ☐ | ☐ |
| CLE-45 | Décidé | À la remise, le payeur reçoit « [Prénom] a retiré ton cadeau aujourd’hui à [heure] » (« Aïcha a retiré ton cadeau aujourd’hui à 15 h 04 ») | | ☑ | ☐ | ☐ | ☐ |
| CLE-46 | Recommandé | Après le paiement du cadeau | | ☑ | ☐ | — | ☐ |
| | | **Remise groupée et API** | | | | | |
| CLE-47 | Décidé | Par défaut, au fil de l’eau | | ☑ | — | ☐ | ☐ |
| CLE-48 | Décidé | Les colis en attente de groupage ne sont jamais facturés au client et le relais n’est pas payé pour ces jours | | ☑ | — | ☐ | ☐ |
| CLE-49 | Décidé | Les colis en attente de groupage comptent dans la capacité déclarée du relais | | ☑ | — | ☐ | ☐ |
| CLE-50 | Recommandé | En mode groupé, le destinataire reçoit un seul message d’arrivée et un seul code, quand le groupe est complet ou à la date de remise | | ☑ | — | ☐ | ☐ |
| CLE-51 | Décidé | Les routes sont indicatives | | ☑ | — | ☐ | ☐ |
| | | **Ventes flash** | | | | | |
| CVF-01 | Décidé | Le compte à rebours correspond à la vraie fin de l’offre | | ☑ | — | ☐ | ☐ |
| CVF-02 | Décidé | La remise est calculée sur un prix réellement pratiqué | | ☑ | — | ☐ | ☐ |
| CVF-03 | Décidé | Une vente flash dure 48 h au plus | | ☑ | — | ☐ | ☐ |
| CVF-04 | Décidé | Offres géolocalisées | | ☑ | — | ☐ | ☐ |
| CVF-05 | Décidé | Aucune promotion par SMS | | ☑ | — | ☐ | ☐ |
| CVF-06 | Décidé | Une vente flash ne rend jamais une commande déficitaire (plancher de contribution) | | ☑ | — | ☐ | ☐ |
| CVF-07 | Décidé | Un calendrier guide les offres | | ☑ | — | ☐ | ☐ |
| CVF-08 | Recommandé | Chaque offre affiche son heure de fin en mots et le temps restant | | ☑ | ☐ | — | ☐ |
| CVF-09 | Recommandé | Offre terminée | | ☑ | — | ☐ | ☐ |
| CVF-10 | Recommandé | Le prix est recalculé au paiement | | ☑ | — | ☐ | ☐ |
| | | **Assistant, Confirmer** | | | | | |
| CIA-01 | Décidé | Orientation en trois niveaux | | ☑ | — | ☐ | ☐ |
| CIA-02 | Décidé | L’assistant propose | | ☑ | — | ☐ | ☐ |
| CIA-03 | Décidé | Passage à un humain sur demande (bouton casque, toujours visible) ou après 2 échecs | | ☑ | — | ☐ | ☐ |
| CIA-04 | Décidé | Jamais un « non » sec | | ☑ | — | ☐ | ☐ |
| CIA-05 | Décidé | Jamais le code de retrait dans une réponse | | ☑ | — | ☐ | ☐ |
| CIA-06 | Décidé | La protection (litige, suivi, code, remboursement) reste gratuite | | ☑ | — | ☐ | ☐ |
| CIA-07 | Recommandé | Aucun plafond chiffré n’existe dans la spécification | | ☑ | — | ☐ | ☐ |
| CIA-08 | Décidé | Propositions proactives utiles | | ☑ | — | ☐ | ☐ |
| CIA-09 | Décidé | Un problème sur une commande ouvre le formulaire de litige (quatre écrans, CL-11), jamais un chat libre | | ☑ | — | ☐ | ☐ |
| CIA-10 | Recommandé | Pas de bouton flottant sur les écrans | | ☑ | ☐ | — | ☐ |
| CIA-11 | Recommandé | Une action confirmée passe par le même service que l’écran de base (annulation 13.1, paiement 8) | | ☑ | — | ☐ | ☐ |
| CIA-12 | Décidé | Architecture 100 % par API, derrière une couche AIService instrumentée pour mesurer le coût | | ☑ | — | ☐ | ☐ |

## CL-15

| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |
|---|---|---|---|---|---|---|---|
| | | **EX-01 · Liste de rentrée scolaire** | | | | | |
| CRS-01 | Décidé | Module fermé au lancement (FF-EX01) | | ☑ | ☐ | ☐ | ☐ |
| CRS-02 | Décidé | Livrables | | ☑ | — | ☐ | ☐ |
| CRS-03 | Décidé | La confiance s’applique à toute la liste | | ☑ | — | ☐ | ☐ |
| CRS-04 | Décidé | Aucune rémunération de l’école, dans aucun sens | | ☑ | — | ☐ | ☐ |
| CRS-05 | Décidé | Aucune donnée d’élève | | ☑ | — | ☐ | ☐ |
| | | **Écran « Chercher l’école »** | | | | | |
| RNT-01 | Proposé | Seules les écoles vérifiées par la console publient une liste officielle | | ☑ | — | ☐ | ☐ |
| CRS-06 | Recommandé | Résultats | | ☑ | ☐ | — | ☐ |
| CRS-07 | Recommandé | Hors saison (avant RNT-OUVERTURE), l’écran annonce la date d’ouverture et garde l’accès à la liste papier | | ☑ | ☐ | — | ☐ |
| | | **Écran « Liste papier »** | | | | | |
| RNT-02 | Proposé | Liste papier photographiée | | ☑ | — | ☐ | ☐ |
| CRS-08 | Recommandé | Le délai s’affiche en heure ferme (heure d’envoi + RNT-SAISIE-H), jamais « sous 24 h » seul | | ☑ | ☐ | ☐ | ☐ |
| CRS-09 | Recommandé | Une liste papier saisie reste privée au parent qui l’a envoyée | | ☑ | — | ☐ | ☐ |
| | | **Écran « Choisir la classe »** | | | | | |
| CRS-10 | Décidé | Le prix affiché est celui de la liste complète, recalculé à l’affichage (offres attribuées du moment) | | ☑ | — | ☐ | ☐ |
| | | **Écran « La liste »** | | | | | |
| RNT-03 | Décidé | Chaque article est rattaché à un produit maître | | ☑ | — | ☐ | ☐ |
| RNT-04 | Décidé | Un article déjà possédé se décoche | | ☑ | — | ☐ | ☐ |
| RNT-05 | Proposé | Un équivalent n’est proposé que s’il correspond à la consigne de l’école | | ☑ | — | ☐ | ☐ |
| RNT-11 | Proposé | Liste modifiée après publication | | ☑ | — | ☐ | ☐ |
| CRS-11 | Recommandé | Chaque ligne montre la consigne de l’école quand elle existe | | ☑ | ☐ | — | ☐ |
| CRS-12 | Recommandé | Un article décoché retire aussi le ramassage de sa boutique si elle n’a plus d’article | | ☑ | — | ☐ | ☐ |
| CRS-13 | Recommandé | « Parents prévenus » (RNT-11) | | ☑ | — | ☐ | ☐ |
| | | **Écran « Panier de rentrée »** | | | | | |
| RNT-06 | Décidé | Livraison offerte dès 30 000 F | | ☑ | — | ☐ | ☐ |
| RNT-07 | Proposé | Toute la liste livrée ensemble, avec un seul code de retrait | | ☑ | — | ☐ | ☐ |
| RNT-08 | Proposé | La mise de côté (EX-03) est proposée pour la liste de rentrée | | ☑ | — | ☐ | ☐ |
| CRS-14 | Décidé | Le panier de rentrée reprend les règles du panier de base (sections boutique anonymes, palier et Trust Score, bandeau de réassurance,… | | ☑ | — | ☐ | ☐ |
| CRS-15 | Recommandé | Deux choix seulement, payer ou mettre de côté (25.4) | | ☑ | ☐ | ☐ | ☐ |
| CRS-16 | Recommandé | Pour la mise de côté, la liste compte comme un seul achat | | ☑ | — | ☐ | ☐ |
| | | **Écran « Suivi de la liste »** | | | | | |
| RNT-09 | Décidé | Un seul message et un seul code quand toute la liste est au relais | | ☑ | — | ☐ | ☐ |
| CRS-17 | Décidé | Groupage | | ☑ | — | ☐ | ☐ |
| CRS-18 | Recommandé | Au plafond de 21 jours, le groupage est rompu comme en 22.5 | | ☑ | — | ☐ | ☐ |
| CRS-19 | Recommandé | Le relais n’est pas rémunéré pour les jours de groupage (comme 22.5) | | ☑ | — | ☐ | ☐ |
| CRS-20 | Décidé | La capacité du relais est vérifiée avant d’accepter une liste groupée | | ☑ | — | ☐ | ☐ |
| CRS-21 | Décidé | Le message unique (push, et SMS de code dans le budget de six SMS) ne met jamais le code dans le push | | ☑ | — | ☐ | ☐ |
| | | **Écran « Espace école »** | | | | | |
| RNT-10 | Proposé | L’école publie gratuitement | | ☑ | — | ☐ | ☐ |
| CRS-22 | Recommandé | L’école saisit une liste en brouillon | | ☑ | — | ☐ | ☐ |
| | | **EX-02 · Cotisation pour un cadeau** | | | | | |
| CCZ-01 | Décidé | Module fermé au lancement (FF-EX02) | | ☑ | ☐ | ☐ | ☐ |
| CCZ-02 | Décidé | Livrables | | ☑ | — | ☐ | ☐ |
| CCZ-03 | Décidé | Ce n’est pas un compte d’épargne | | ☑ | — | ☐ | ☐ |
| CCZ-04 | À trancher | Les 2 % de frais de service couvrent les frais de paiement de chaque participation | | ☑ | — | ☐ | ☐ |
| | | **Écran « Créer une cotisation »** | | | | | |
| COT-01 | Proposé | Objectif = prix livré du cadeau + frais de service de 2 %, affiché avant la création | | ☑ | — | ☐ | ☐ |
| COT-02 | Proposé | Date limite de 30 jours au plus | | ☑ | — | ☐ | ☐ |
| COT-03 | Décidé | Le cadeau suit les règles de livraison de base | | ☑ | — | ☐ | ☐ |
| CCZ-05 | Recommandé | Le prix livré est calculé pour le relais du bénéficiaire (ou son domicile pour un XL) par le service de tarification, puis figé avec… | | ☑ | — | ☐ | ☐ |
| | | **Écran « Partager »** | | | | | |
| CCZ-06 | Recommandé | Partage par le partage natif du téléphone (WhatsApp, SMS, copier le lien), sans coût pour BelivaY | | ☑ | — | ☐ | ☐ |
| | | **Page « Participer » (page web du lien)** | | | | | |
| COT-04 | Proposé | Participation libre à partir de 1 000 F, en Mobile Money ou par carte (2 %) | | ☑ | — | ☐ | ☐ |
| COT-05 | Proposé | Participation discrète | | ☑ | — | ☐ | ☐ |
| COT-06 | Proposé | L’argent reste bloqué | | ☑ | — | ☐ | ☐ |
| CCZ-07 | Recommandé | Page web accessible sans compte (entrée légère, comme 22.3) | | ☑ | — | ☐ | ☐ |
| CCZ-08 | Recommandé | Une participation est plafonnée au montant qui manque | | ☑ | — | ☐ | ☐ |
| CCZ-09 | Décidé | Par carte | | ☑ | — | ☐ | ☐ |
| | | **Écran « Ma cotisation » (suivre)** | | | | | |
| COT-07 | Proposé | Jauge et participants visibles de tous, sauf les participations discrètes | | ☑ | — | ☐ | ☐ |
| CCZ-10 | Décidé | La jauge ne compte que les participations validées par webhook, jamais les tentatives | | ☑ | — | ☐ | ☐ |
| CCZ-11 | Recommandé | L’organisateur voit prénom, date, montant et mot de chaque participant | | ☑ | ☐ | ☐ | ☐ |
| | | **Écran « Objectif atteint »** | | | | | |
| COT-08 | Proposé | Objectif atteint | | ☑ | — | ☐ | ☐ |
| CCZ-12 | Recommandé | À l’objectif, la commande est créée automatiquement au nom de l’organisateur, payée par l’argent de la cotisation, vers le relais du… | | ☑ | — | ☐ | ☐ |
| CCZ-13 | Recommandé | Hausse | | ☑ | — | ☐ | ☐ |
| | | **Écran « Cotisation terminée » (échéance manquée)** | | | | | |
| COT-09 | Proposé | Date limite dépassée | | ☑ | — | ☐ | ☐ |
| CCZ-14 | Recommandé | Les remboursements partent le lendemain de la date limite, chacun vers le moyen d’origine (même carte, même numéro) | | ☑ | — | ☐ | ☐ |
| | | **EX-03 · Mettre de côté avec acompte** | | | | | |
| CMD-01 | Décidé | Module fermé au lancement (FF-EX03) | | ☑ | ☐ | ☐ | ☐ |
| CMD-02 | Décidé | Livrables | | ☑ | — | ☐ | ☐ |
| CMD-03 | Décidé | Ce n’est pas un crédit | | ☑ | — | ☐ | ☐ |
| CMD-04 | Recommandé | Une mise de côté n’est pas une commande | | ☑ | — | ☐ | ☐ |
| CMD-05 | Décidé | Rappels par push | | ☑ | — | ☐ | ☐ |
| | | **Feuille « Mettre de côté » (proposer)** | | | | | |
| MDC-01 | Décidé | Zéro intérêt, zéro frais de service | | ☑ | — | ☐ | ☐ |
| MDC-02 | Proposé | Acompte minimal à la réservation | | ☑ | — | ☐ | ☐ |
| MDC-03 | Proposé | Durée maximale de la mise de côté | | ☑ | — | ☐ | ☐ |
| CMD-06 | Recommandé | Le « prix » du chapitre 27 est le prix livré total au relais (articles + livraison + suppléments), calculé par le service de… | | ☑ | — | ☐ | ☐ |
| CMD-07 | Recommandé | Deux rythmes proposés | | ☑ | ☐ | — | ☐ |
| | | **Écran « Plan de versements »** | | | | | |
| MDC-04 | Proposé | Le stock est réservé chez le vendeur pendant toute la mise de côté | | ☑ | — | ☐ | ☐ |
| CMD-08 | Recommandé | La somme des versements égale exactement le prix | | ☑ | — | ☐ | ☐ |
| CMD-09 | Recommandé | Le plan annonce avant l’acompte | | ☑ | ☐ | ☐ | ☐ |
| | | **Écran « Mise de côté » (suivre)** | | | | | |
| MDC-05 | Proposé | Rappel 2 jours avant chaque échéance, puis le jour même | | ☑ | — | ☐ | ☐ |
| MDC-08 | Proposé | Sept jours de grâce après une échéance manquée, avant toute annulation | | ☑ | — | ☐ | ☐ |
| CMD-10 | Recommandé | À la fin de la grâce sans versement, la mise de côté est annulée automatiquement avec le calcul de MDC-09 | | ☑ | — | ☐ | ☐ |
| | | **Écran « Versement »** | | | | | |
| MDC-06 | Décidé | Chaque versement suit le parcours de paiement Mobile Money de base | | ☑ | — | ☐ | ☐ |
| CMD-11 | Recommandé | Un versement échoué ne compte pas | | ☑ | — | ☐ | ☐ |
| | | **Écran « Payé en entier » (terminé)** | | | | | |
| MDC-07 | Décidé | Au dernier versement, la commande suit le parcours normal | | ☑ | — | ☐ | ☐ |
| CMD-12 | Recommandé | Le colis n’est envoyé au relais qu’après le dernier versement | | ☑ | — | ☐ | ☐ |
| | | **Feuille « Annuler la mise de côté »** | | | | | |
| MDC-09 | Proposé | Annulation | | ☑ | — | ☐ | ☐ |
| CMD-13 | À trancher | Le forfait est reversé au vendeur, qui a gardé le stock | | ☑ | — | ☐ | ☐ |
| CMD-14 | Recommandé | Si c’est le vendeur (rupture, stock perdu) ou BelivaY qui ne peut pas honorer la réservation, tout est remboursé sans forfait, ou le… | | ☑ | — | ☐ | ☐ |
| CMD-15 | Décidé | Le remboursement va toujours au moyen d’origine de chaque versement, jamais en espèces | | ☑ | — | ☐ | ☐ |
| | | **EX-04 · Reprise et troc de téléphone** | | | | | |
| CTR-01 | Décidé | Module fermé au lancement (FF-EX04) | | ☑ | ☐ | ☐ | ☐ |
| CTR-02 | Décidé | Livrables | | ☑ | — | ☐ | ☐ |
| CTR-03 | Décidé | Pas de rachat par BelivaY, pas de recel | | ☑ | — | ☐ | ☐ |
| CTR-04 | Recommandé | Le libellé « Reste à payer » est interdit partout (9.1), y compris ici | | ☑ | — | ☐ | ☐ |
| | | **Écran « Estimer ma reprise »** | | | | | |
| TRC-01 | Proposé | Estimation par le reconditionneur partenaire, à partir du modèle et de l’état déclaré | | ☑ | — | ☐ | ☐ |
| TRC-02 | Proposé | Compte (Google, iCloud) et code retirés avant le dépôt | | ☑ | — | ☐ | ☐ |
| CTR-05 | Recommandé | Questions fermées (puces) | | ☑ | ☐ | — | ☐ |
| | | **Écran « Offre de troc »** | | | | | |
| TRC-03 | Proposé | BelivaY n’achète pas de téléphone d’occasion | | ☑ | — | ☐ | ☐ |
| TRC-09 | Proposé | Seule une fourchette est affichée avant l’inspection, jamais une valeur garantie | | ☑ | — | ☐ | ☐ |
| | | **Écran « Dépôt au relais »** | | | | | |
| TRC-05 | Proposé | Le gérant lit l’IMEI (*#06#) et vérifie qu’il n’est pas déclaré volé | | ☑ | — | ☐ | ☐ |
| TRC-06 | Proposé | Pièce d’identité vérifiée au dépôt | | ☑ | — | ☐ | ☐ |
| CTR-06 | Recommandé | Code de dépôt à 6 chiffres, distinct du code de retrait | | ☑ | — | ☐ | ☐ |
| CTR-07 | Recommandé | Dépôt refusé | | ☑ | — | ☐ | ☐ |
| CTR-08 | Décidé | La collecte vers le reconditionneur suit le circuit d’un colis | | ☑ | — | ☐ | ☐ |
| | | **Écran « Inspection »** | | | | | |
| TRC-07 | Proposé | Inspection sous 48 h | | ☑ | — | ☐ | ☐ |
| CTR-09 | Recommandé | Une valeur confirmée dans la fourchette (ou au-dessus) ouvre le paiement du neuf | | ☑ | — | ☐ | ☐ |
| CTR-10 | Recommandé | Inspection en retard | | ☑ | — | ☐ | ☐ |
| | | **Feuille « Contre-offre »** | | | | | |
| TRC-08 | Proposé | Contre-offre refusée | | ☑ | — | ☐ | ☐ |
| CTR-11 | Recommandé | Le téléphone rendu revient au relais d’origine comme un colis, avec un code de retrait | | ☑ | — | ☐ | ☐ |
| | | **Écran « Payer le neuf »** | | | | | |
| TRC-04 | Proposé | Le reste n’est payé qu’après confirmation de la valeur | | ☑ | — | ☐ | ☐ |
| CTR-12 | Recommandé | Le prix du neuf est recalculé au paiement (contrôle des prix de base, 8.1) | | ☑ | — | ☐ | ☐ |
| CTR-13 | Recommandé | Commande du neuf annulée ou remboursée | | ☑ | — | ☐ | ☐ |
| CTR-14 | Décidé | Le vendeur vend le neuf normalement et ne voit pas le troc | | ☑ | — | ☐ | ☐ |
| | | **EX-05 · Panier famille pour la diaspora** | | | | | |
| CFM-01 | Décidé | Module fermé au lancement (FF-EX05) | | ☑ | ☐ | ☐ | ☐ |
| CFM-02 | Décidé | Livrables | | ☑ | — | ☐ | ☐ |
| CFM-03 | Décidé | Messages au payeur | | ☑ | — | ☐ | ☐ |
| CFM-04 | Décidé | Libération du vendeur à J+14 sur carte (rétrofacturation) | | ☑ | — | ☐ | ☐ |
| | | **Écran « Panier famille » (choisir)** | | | | | |
| FAM-01 | Décidé | Colis S à L seulement | | ☑ | — | ☐ | ☐ |
| CFM-05 | Recommandé | Chaque panier prêt affiche son prix livré au relais | | ☑ | ☐ | — | ☐ |
| | | **Écran « Pour qui ? » (destinataire)** | | | | | |
| CFM-06 | Recommandé | Le payeur désigne le bénéficiaire par un « lien famille » envoyé depuis le compte du bénéficiaire (numéro vérifié) | | ☑ | — | ☐ | ☐ |
| CFM-07 | Décidé | Relais proposés | | ☑ | — | ☐ | ☐ |
| FAM-03 | Décidé | Le payeur ne reçoit jamais le code de retrait | | ☑ | — | ☐ | ☐ |
| | | **Écran « Payer par carte »** | | | | | |
| FAM-02 | Décidé | Paiement par carte | | ☑ | — | ☐ | ☐ |
| FAM-04 | Décidé | Remboursement sur la carte du payeur, jamais sur le Mobile Money de la famille | | ☑ | — | ☐ | ☐ |
| CFM-08 | Décidé | Récapitulatif avant de payer | | ☑ | — | ☐ | ☐ |
| | | **Écran « Chaque mois »** | | | | | |
| FAM-06 | Proposé | Renouvellement mensuel annoncé avant le débit, suspensible en un geste | | ☑ | — | ☐ | ☐ |
| FAM-07 | Proposé | Prix recalculés à chaque renouvellement | | ☑ | — | ☐ | ☐ |
| CFM-09 | Recommandé | Le débit se fait au montant annoncé au préavis | | ☑ | — | ☐ | ☐ |
| | | **Écran « Preuve de retrait »** | | | | | |
| FAM-05 | Décidé | Preuve de retrait au payeur | | ☑ | — | ☐ | ☐ |
| CFM-10 | Recommandé | La preuve dit qui a retiré (nom du porteur saisi au comptoir), où, et l’heure au relais et chez le payeur | | ☑ | — | ☐ | ☐ |
| | | **EX-06 · Commander sur WhatsApp avec l’IA** | | | | | |
| CWA-01 | Décidé | Module fermé au lancement (FF-EX06) | | ☑ | ☐ | ☐ | ☐ |
| CWA-02 | Décidé | Livrables | | ☑ | — | ☐ | ☐ |
| CWA-03 | Décidé | Doctrine de l’assistant (24.1) | | ☑ | — | ☐ | ☐ |
| CWA-04 | Décidé | Le fil WhatsApp est rattaché à la commande en console pour le support | | ☑ | — | ☐ | ☐ |
| | | **Conversation « Message » (texte ou vocal)** | | | | | |
| WAP-06 | Proposé | Messages vocaux conservés selon une durée à fixer, puis supprimés | | ☑ | — | ☐ | ☐ |
| CWA-05 | Recommandé | Premier vocal | | ☑ | — | ☐ | ☐ |
| | | **Conversation « Proposition »** | | | | | |
| WAP-04 | Décidé | Prix livrés calculés par le service de tarification, jamais par l’IA | | ☑ | — | ☐ | ☐ |
| WAP-05 | Proposé | Doute de l’IA | | ☑ | — | ☐ | ☐ |
| CWA-06 | Recommandé | La proposition reprend les produits maîtres et l’offre attribuée de base, le relais habituel du client et une heure ferme | | ☑ | — | ☐ | ☐ |
| CWA-07 | Proposé | Passage à un humain sur doute, sur demande ou après 2 échecs (IA-HUMAIN), dans le même fil | | ☑ | — | ☐ | ☐ |
| | | **Conversation « Confirmation » (« Réponds OUI »)** | | | | | |
| WAP-01 | Proposé | L’IA propose et attend un « OUI » explicite | | ☑ | — | ☐ | ☐ |
| CWA-08 | Recommandé | Seul « OUI » (casse et accents indifférents | | ☑ | — | ☐ | ☐ |
| | | **Conversation « Lien de paiement »** | | | | | |
| WAP-02 | Décidé | L’IA ne paie jamais | | ☑ | — | ☐ | ☐ |
| CWA-09 | Recommandé | Le lien court est signé, lié à la commande et au numéro vérifié du client | | ☑ | — | ☐ | ☐ |
| | | **Conversation « Suite »** | | | | | |
| WAP-03 | Décidé | Le code de retrait n’est jamais envoyé sur WhatsApp | | ☑ | — | ☐ | ☐ |
| CWA-10 | Décidé | Après paiement, les messages de la commande suivent la politique de base (push, SMS dans le budget) | | ☑ | — | ☐ | ☐ |
| | | **Réserve, points à voir et idées écartées** | | | | | |
| CRV-01 | Décidé | Gardée pour plus tard | | ☑ | — | — | ☐ |
| CRV-02 | Décidé | Gardée pour plus tard | | ☑ | — | — | ☐ |
| CRV-03 | Décidé | Gardée pour plus tard | | ☑ | — | — | ☐ |
| CRV-04 | Décidé | Gardée pour plus tard | | ☑ | — | — | ☐ |
| CRV-05 | À trancher | À voir avant de lancer EX-03 | | ☑ | — | — | ☐ |
| CRV-06 | À trancher | À voir avant de lancer EX-02 | | ☑ | — | — | ☐ |
| CRV-07 | À trancher | À voir avant de lancer EX-04 | | ☑ | — | — | ☐ |
| CRV-08 | À trancher | À voir avant de lancer EX-04 | | ☑ | — | — | ☐ |
| CRV-09 | À trancher | À voir avant de lancer EX-06 | | ☑ | — | — | ☐ |
| CRV-10 | Décidé | Écartée | | ☑ | — | ☐ | ☐ |
| CRV-11 | Décidé | Écartée | | ☑ | — | ☐ | ☐ |
| CRV-12 | Décidé | Écartée | | ☑ | — | ☐ | ☐ |
| CRV-13 | Décidé | Écartée | | ☑ | — | ☐ | ☐ |
| CRV-14 | Décidé | Écartée | | ☑ | — | ☐ | ☐ |
| | | **Registre des paramètres des nouveautés** | | | | | |
| CRV-15 | Décidé | Tous ces codes existent dans la même table que ceux du lancement, versionnés et modifiables en console, inactifs derrière l’interrupteur… | | ☑ | — | ☐ | ☐ |
| CRV-16 | Décidé | Aucun module ne s’active avec une valeur « à trancher » | | ☑ | — | ☐ | ☐ |
| CRV-17 | Recommandé | Ajouter au registre les cinq codes cités dans les chapitres mais absents de 32.5 | | ☑ | — | — | ☐ |
| CRV-18 | Décidé | Interrupteur fermé | | ☑ | ☐ | ☐ | ☐ |

## CL-16

| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |
|---|---|---|---|---|---|---|---|
| | | **Liaisons avec le point relais (16.1)** | | | | | |
| CLI-01 | Décidé | Choix du relais | | ☑ | — | ☐ | ☐ |
| CLI-02 | Décidé | Horaires, capacité et fermetures déclarés par le gérant alimentent directement le client | | ☑ | — | ☐ | ☐ |
| CLI-03 | Décidé | Réception | | ☑ | — | ☐ | ☐ |
| CLI-04 | Décidé | Capacité par classe | | ☑ | — | ☐ | ☐ |
| CLI-05 | Décidé | Garde | | ☑ | — | ☐ | ☐ |
| CLI-06 | Décidé | Le relais touche 100 F par jour facturé au client, jamais pour le jour gratuit, un jour fermé, un litige ou un groupage | | ☑ | — | ☐ | ☐ |
| CLI-07 | Décidé | Retrait | | ☑ | — | ☐ | ☐ |
| CLI-08 | Décidé | Trois codes faux de suite | | ☑ | — | ☐ | ☐ |
| CLI-09 | Décidé | Paiement sur place | | ☑ | — | ☐ | ☐ |
| CLI-10 | Décidé | Problème au comptoir | | ☑ | — | ☐ | ☐ |
| CLI-11 | Décidé | Retour | | ☑ | — | ☐ | ☐ |
| CLI-12 | Décidé | Renvoi | | ☑ | — | ☐ | ☐ |
| CLI-13 | Décidé | Avis | | ☑ | — | ☐ | ☐ |
| CLI-14 | Décidé | Rémunération du relais | | ☑ | — | ☐ | ☐ |
| | | **Liaisons avec le vendeur (16.2)** | | | | | |
| CLI-15 | Décidé | Catalogue | | ☑ | — | ☐ | ☐ |
| CLI-16 | Décidé | Attribution | | ☑ | — | ☐ | ☐ |
| CLI-17 | Décidé | Commande | | ☑ | — | ☐ | ☐ |
| CLI-18 | Décidé | Préparation | | ☑ | — | ☐ | ☐ |
| CLI-19 | Décidé | Litige | | ☑ | — | ☐ | ☐ |
| CLI-20 | Décidé | Retour | | ☑ | — | ☐ | ☐ |
| CLI-21 | Décidé | Argent | | ☑ | — | ☐ | ☐ |
| CLI-22 | Décidé | Avis | | ☑ | — | ☐ | ☐ |
| | | **Livraison, livreur et délais de service (16.3, 16.4)** | | | | | |
| CLI-23 | Décidé | Publication | | ☑ | — | ☐ | ☐ |
| CLI-24 | Décidé | Plafond de valeur par colis selon le palier du transporteur | | ☑ | — | ☐ | ☐ |
| CLI-25 | Décidé | Collecte | | ☑ | — | ☐ | ☐ |
| CLI-26 | Décidé | En route | | ☑ | — | ☐ | ☐ |
| CLI-27 | Décidé | Remise au relais | | ☑ | — | ☐ | ☐ |
| CLI-28 | Décidé | Domicile | | ☑ | — | ☐ | ☐ |
| CLI-29 | Décidé | Incident de transport (retard, échec) | | ☑ | — | ☐ | ☐ |
| CLI-30 | Décidé | Les six délais de service du lancement (tableau ci-dessus) sont des paramètres en console, suivis par zone | | ☑ | — | ☐ | ☐ |
| CLI-31 | Décidé | Chaque page du client déclenche l’événement attendu chez le bon acteur, et aucun acteur ne reçoit une donnée qu’il ne doit pas voir | | ☑ | — | ☐ | ☐ |
| | | **Vendeur, catalogue et espace vendeur (17)** | | | | | |
| CLI-32 | Recommandé | Ce que le client voit et reçoit suit la v3 client, la plus récente (1.3) | | ☑ | — | — | ☐ |
| CLI-33 | Décidé | Anonymat | | ☑ | — | ☐ | ☐ |
| CLI-34 | Décidé | Une offre n’est visible du client qu’après l’étape « Publier » (pièce d’identité, selfie avec preuve de vie, numéro de versement) validée | | ☑ | — | ☐ | ☐ |
| CLI-35 | Décidé | Catalogue | | ☑ | — | ☐ | ☐ |
| CLI-36 | Décidé | La classe du colis (S, M, L, XL, hors gabarit) est calculée à partir du poids et des dimensions de l’offre (poids facturé = max(réel | | ☑ | — | ☐ | ☐ |
| CLI-37 | Décidé | Saisie assistée | | ☑ | — | ☐ | ☐ |
| CLI-38 | Décidé | « C’est prêt » déclenche la collecte | | ☑ | — | ☐ | ☐ |
| CLI-39 | Décidé | « Rupture de stock » se signale en un geste | | ☑ | — | ☐ | ☐ |
| CLI-40 | Décidé | « Fermé aujourd’hui » retire immédiatement les offres de la boutique des résultats et des rangées (shop.closed_today) jusqu’à la… | | ☑ | — | ☐ | ☐ |
| CLI-41 | Décidé | Le vendeur voit la classe du colis, jamais le relais du client, son identité, son quartier, les autres vendeurs de la commande ni le… | | ☑ | — | ☐ | ☐ |
| CLI-42 | Décidé | WhatsApp reste le réflexe | | ☑ | — | — | ☐ |
| | | **Console d’administration (18)** | | | | | |
| CCN-01 | Décidé | Règle fondatrice | | ☑ | — | ☐ | ☐ |
| CCN-02 | Décidé | La file d’action est triée par temps restant avant l’échéance, puis par montant décroissant (48 h vendeur, 10 min pour un message de… | | ☑ | — | ☐ | ☐ |
| CCN-03 | Décidé | Six types de cartes | | ☑ | — | ☐ | ☐ |
| CCN-04 | Décidé | Vendeur silencieux à 48 h | | ☑ | — | ☐ | ☐ |
| CCN-05 | Décidé | Le dossier présente la décision proposée (niveau de confiance, justification en une phrase), la chaîne de preuves côte à côte, le… | | ☑ | — | ☐ | ☐ |
| CCN-06 | Décidé | Motif écrit obligatoire avant « Rembourser · montant », « Remplacer » ou « Débouter » | | ☑ | — | ☐ | ☐ |
| CCN-07 | Décidé | Message de criticité 1 non délivré (exemple | | ☑ | — | ☐ | ☐ |
| CCN-08 | Décidé | Indicateurs en bas de la file | | ☑ | — | ☐ | ☐ |
| | | **Console : zones, paramétrage, fraude, journal et partenaires (18.2 à 18.5)** | | | | | |
| CCN-09 | Décidé | Pilotage des zones | | ☑ | — | ☐ | ☐ |
| CCN-10 | Décidé | Les recherches sans résultat (search.no_result) et les adresses demandées hors couverture remontent du client vers la console | | ☑ | — | ☐ | ☐ |
| CCN-11 | À trancher | Score de zone, seuil d’alerte de remplissage (objectif 8 colis par tournée) et seuils d’alerte des zones | | ☑ | — | ☐ | ☐ |
| CCN-12 | Décidé | Paramétrage sans redéploiement | | ☑ | — | ☐ | ☐ |
| CCN-13 | Décidé | Chaque paramètre modifié crée une nouvelle version | | ☑ | — | ☐ | ☐ |
| CCN-14 | Décidé | Simulation obligatoire sur les 30 derniers jours avant « Appliquer » (commandes, marge par commande, marge totale, coût SMS, avant →… | | ☑ | — | ☐ | ☐ |
| CCN-15 | Décidé | Un paramètre appartient à un espace pays, jamais global | | ☑ | — | ☐ | ☐ |
| CCN-16 | Décidé | Détection des anneaux de fraude (part des litiges concentrée sur quelques clients, retraits par un tiers anormaux, comptes liés par le… | | ☑ | — | ☐ | ☐ |
| CCN-17 | Décidé | Un client ne passe « À instruire » qu’après validation humaine avec croisement | | ☑ | — | ☐ | ☐ |
| CCN-18 | Décidé | Journal d’audit | | ☑ | — | ☐ | ☐ |
| CCN-19 | Décidé | Double validation (quatre yeux) pour toute règle d’escrow, avant production, et pour tout versement exceptionnel | | ☑ | — | ☐ | ☐ |
| CCN-20 | Décidé | Rôles Support, Opérations zone, Finance, Direction (tableau ci-dessus) | | ☑ | — | ☐ | ☐ |
| CCN-21 | Décidé | Point relais | | ☑ | — | ☐ | ☐ |
| CCN-22 | Décidé | Entreprise de livraison | | ☑ | — | ☐ | ☐ |
| CCN-23 | Décidé | Aucune caution ni dépôt pour les relais et les entreprises de livraison (le plafond de valeur par palier remplace la caution des… | | ☑ | — | ☐ | ☐ |
| | | **Règles communes, paramètres et photos (19, 20, 32)** | | | | | |
| CTV-01 | Décidé | Le client ne voit jamais le nom, la page, l’adresse ou le numéro d’une boutique | | ☑ | — | ☐ | ☐ |
| CTV-02 | Décidé | Le vendeur ne voit jamais l’identité, le quartier ou le relais du client, ni les autres vendeurs de la commande, ni le total payé | | ☑ | — | ☐ | ☐ |
| CTV-03 | Recommandé | Le livreur voit le vendeur | | ☑ | — | ☐ | ☐ |
| CTV-04 | Décidé | Aucun numéro personnel exposé | | ☑ | — | ☐ | ☐ |
| CTV-05 | Décidé | Numéros, e-mails et identifiants sociaux sont masqués automatiquement dans tout fil entre deux acteurs externes, avant l’enregistrement… | | ☑ | — | ☐ | ☐ |
| CTV-06 | Décidé | L’anonymat s’applique côté serveur | | ☑ | — | ☐ | ☐ |
| CTV-07 | Décidé | Tout montant est calculé côté serveur, par le seul service de tarification, au moment de l’affichage ou de l’envoi | | ☑ | — | ☐ | ☐ |
| CTV-08 | Décidé | Un même montant apparaît à l’identique dans l’application, la notification, le SMS et l’écran du gérant | | ☑ | — | ☐ | ☐ |
| CTV-09 | Décidé | Zéro espèce, nulle part, jamais | | ☑ | — | ☐ | ☐ |
| CTV-10 | Décidé | BelivaY ne vend jamais à perte | | ☑ | — | ☐ | ☐ |
| CTV-11 | Décidé | Interdit partout | | ☑ | ☐ | ☐ | ☐ |
| CTV-12 | Décidé | Interdit partout | | ☑ | ☐ | ☐ | ☐ |
| CTV-13 | Décidé | Interdit partout | | ☑ | — | ☐ | ☐ |
| CTV-14 | Décidé | Interdit partout | | ☑ | ☐ | — | ☐ |
| CTV-15 | Décidé | Interdit partout | | ☑ | — | ☐ | ☐ |
| CTV-16 | Décidé | Interdit partout | | ☑ | — | ☐ | ☐ |
| CTV-17 | Décidé | Interdit partout | | ☑ | — | ☐ | ☐ |
| CTV-18 | Décidé | Interdit partout | | ☑ | — | ☐ | ☐ |
| | | **La table des paramètres : valeurs fixées, à trancher, arbitrages (19.4, 20, 32)** | | | | | |
| CTV-19 | Décidé | Tous les seuils, tarifs et délais sont des paramètres en base, versionnés, lisibles par tous les services et modifiables en console sans… | | ☑ | — | ☐ | ☐ |
| CTV-20 | Décidé | Chaque paramètre a un code, une valeur, une unité, la page qui l’utilise et un statut | | ☑ | — | ☐ | ☐ |
| CTV-21 | Décidé | Les valeurs « à trancher » sont chargées en recette avec la valeur proposée que montre le prototype, puis remplacées par une décision… | | ☑ | — | — | ☐ |
| CTV-22 | Décidé | Les paramètres « après le lancement » sont créés dès le départ dans la même table, inactifs derrière l’interrupteur de leur module (FF-…) | | ☑ | — | ☐ | ☐ |
| CTV-23 | Recommandé | Les codes cités par les chapitres mais absents des registres 20 et 32 (NOT-GROUPE, NOT-CONSERV, NOT-BADGE-MAX, SUP-WA, SUP-DELAI,… | | ☑ | — | — | ☐ |
| CTV-24 | Recommandé | CODE-BIO, GARDE-PRORATA et AVIS-BAS restent « Proposé » (valeur de départ réglable) comme dans le registre, mais 19.4 les range parmi… | | ☑ | — | — | ☐ |
| CTV-25 | Recommandé | Statuts hors de la convention 1.2 | | ☑ | — | — | ☐ |
| CTV-26 | Décidé | Les arbitrages rendus de 19.4 s’appliquent sur tous les écrans (tableau ci-dessus) | | ☑ | ☐ | ☐ | ☐ |
| | | **Les photos à produire (19.5)** | | | | | |
| CTV-27 | Décidé | Chaque emplacement d’image a une vraie photo avant le lancement | | ☑ | — | — | ☐ |
| CTV-28 | Décidé | Consigne des images produit | | ☑ | — | — | ☐ |
| CTV-29 | Décidé | Chaque maillon de la chaîne produit sa photo de preuve (collecte chez le vendeur, réception au relais, remise, dépôt d’un retour,… | | ☑ | — | ☐ | ☐ |
| CTV-30 | Recommandé | Les codes C1 à C3 ont quatre sens dans la spécification | | ☑ | — | ☐ | ☐ |
| CTV-31 | À trancher | Liste des produits interdits (19.4, valeur à trancher, code proposé CAT-INTERDITS) | | ☑ | — | ☐ | ☐ |
| | | **Où vit chaque écran (décisions du 26 sept.)** | | | | | |
| CTV-32 | Décidé | Le menu (☰) est le menu de l’application | | ☑ | ☐ | — | ☐ |
| CTV-33 | Décidé | Chaque écran a au moins un lien entrant depuis un endroit naturel, par un geste réel (hors menu, Plan et planche de composants) | | ☑ | ☐ | — | ☐ |
| CTV-34 | Décidé | Un module après le lancement n’a aucune entrée visible tant que son interrupteur est fermé | | ☑ | ☐ | ☐ | ☐ |
| | | **Tableau inter-espaces : client, point relais, vendeur** | | | | | |
| CLI-43 | Recommandé | Sur une règle commune aux trois espaces, la v3 client (25 septembre) l’emporte | | ☑ | — | — | ☐ |
| CLI-44 | Recommandé | Tant qu’un écart n’est pas corrigé, l’application client suit la v3 et les arbitrages des documents CL | | ☑ | ☐ | — | ☐ |
| CLI-45 | Décidé | Un montant commun (garde, montant dû, remboursement, trajet retour, gain du relais) n’a qu’une source, le service de tarification | | ☑ | — | ☐ | ☐ |
