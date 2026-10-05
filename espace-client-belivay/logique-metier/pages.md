# Inventaire des pages du site client

Généré par `outils/pages.py` à partir du prototype et des documents CL ; ne pas modifier à la main.
Détail complet (textes des calculs, états et erreurs, API) : `pages.json`.

> **Chiffres = données de démonstration.** Prix, montants, noms et commandes servent de départ et seront
> remplacés par des données réelles. Ce qui doit être exact : les **règles de calcul et de comportement**.
>
> **Côté serveur / écran** : premier classement automatique (mots-clés), à confirmer à l’étape 3.

## Contrôles

| Contrôle | Résultat |
|---|---|
| Routes | 147 |
| États du Plan rattachés | 497 sur 497 |
| Routes sans état / sans section / sans figure | 1 / 14 / 3 |
| Règles des documents d’écrans rattachées (page ou document) | 1567 sur 1567 |
| Captures rattachées à une figure | 485 sur 500 |
| Registre des routes de CL-01 : routes présentes dans le prototype, même titre et même document | 134 sur 134 |
| Routes du prototype absentes du registre de CL-01 | 13 (les pages non documentées et les simulations du téléphone) |
| Pages non documentées (ajoutées au prototype après les documents) | 9 |
| Routes hors site (outil du prototype, simulation du téléphone) | 5 |

**Pages sans règle écrite (à documenter avant de les construire)** (9) : `selection`, `diaspora`, `wallet`, `devenir-vendeur`, `promotions`, `ouverture`, `xp-pay`, `lancement`, `faceid`

**Routes hors site** (5) : `plan`, `telephone`, `verrouille`, `android`, `ile`

**Routes qu’aucune section ne montre** (14) : `plan`, `selection`, `diaspora`, `wallet`, `devenir-vendeur`, `promotions`, `ouverture`, `xp-pay`, `lancement`, `faceid`, `telephone`, `verrouille`, `android`, `ile`

**Routes sans figure** (3) : `plan`, `xp-pay`, `verrouille`

**Captures sans figure** (15) : `Apple_pay_feuille`, `Code_retrait_ile`, `Connexion_paiement_code`, `Connexion_paiement_pays`, `Connexion_par_numero`, `Google_pay_accepte`, `Menu_profil`, `Numero_etranger_WhatsApp`, `Numero_pays`, `Paiement_3DS_dollar`, `Paiement_apple_pay`, `Paiement_attente_ile`, `Paiement_wallet`, `Panier_prixchange`, `Payeur_dollar`

## Les pages

| Route | Titre | Doc. | Phase | États | Captures | Règles (serveur · écran · les deux · ?) | Calculs | API |
|---|---|---|---|---|---|---|---|---|
| [`plan`](#plan) | Plan du prototype |  | lancement | 0 | 0 | 0 (0 · 0 · 0 · 0) | 0 | 0 |
| [`menu`](#menu) | Menu | CL-01 | lancement | 1 | 1 | 3 (0 · 2 · 1 · 0) | 0 | 0 |
| [`kit`](#kit) | Composants | CL-01 | lancement | 1 | 1 | 6 (0 · 1 · 4 · 1) | 0 | 0 |
| [`bienvenue`](#bienvenue) | Bienvenue | CL-03 | lancement | 2 | 2 | 12 (1 · 6 · 5 · 0) | 0 | 0 |
| [`interets`](#interets) | Centres d’intérêt | CL-03 | lancement | 3 | 3 | 12 (1 · 6 · 5 · 0) | 0 | 0 |
| [`connexion`](#connexion) | Connexion | CL-03 | lancement | 7 | 5 | 8 (2 · 3 · 2 · 1) | 0 | 1 |
| [`connexion-email`](#connexion-email) | Connexion par e-mail | CL-03 | lancement | 4 | 4 | 8 (1 · 3 · 3 · 1) | 0 | 1 |
| [`mdp-oublie`](#mdp-oublie) | Mot de passe oublié | CL-03 | lancement | 2 | 2 | 8 (1 · 3 · 3 · 1) | 0 | 1 |
| [`numero`](#numero) | Ton numéro | CL-03 | lancement | 9 | 6 | 10 (1 · 3 · 3 · 3) | 4 | 3 |
| [`numero-changer`](#numero-changer) | Changer de numéro | CL-03 | lancement | 3 | 3 | 8 (0 · 3 · 0 · 5) | 0 | 2 |
| [`relais-choix`](#relais-choix) | Mon relais | CL-03 | lancement | 6 | 6 | 13 (3 · 7 · 2 · 1) | 4 | 2 |
| [`premiere-commande`](#premiere-commande) | Première commande | CL-03 | lancement | 3 | 3 | 8 (1 · 4 · 2 · 1) | 3 | 0 |
| [`adresse`](#adresse) | Adresse de livraison | CL-03 | lancement | 4 | 4 | 4 (0 · 3 · 0 · 1) | 0 | 1 |
| [`notifs-proposition`](#notifs-proposition) | Notifications | CL-03 | lancement | 2 | 2 | 6 (1 · 0 · 4 · 1) | 0 | 2 |
| [`cgu`](#cgu) | Conditions | CL-03 | lancement | 2 | 2 | 10 (2 · 5 · 1 · 2) | 0 | 1 |
| [`accueil`](#accueil) | Accueil | CL-04 | lancement | 10 | 9 | 40 (2 · 20 · 18 · 0) | 9 | 1 |
| [`categories`](#categories) | Catégories | CL-04 | lancement | 2 | 2 | 12 (0 · 9 · 2 · 1) | 2 | 1 |
| [`liste`](#liste) | Listing | CL-04 | lancement | 6 | 6 | 19 (1 · 7 · 10 · 1) | 6 | 1 |
| [`recherche`](#recherche) | Recherche | CL-05 | lancement | 3 | 3 | 17 (1 · 12 · 4 · 0) | 8 | 2 |
| [`recherche-saisie`](#recherche-saisie) | Recherche · suggestions | CL-05 | lancement | 3 | 3 | 8 (0 · 8 · 0 · 0) | 3 | 1 |
| [`recherche-resultats`](#recherche-resultats) | Résultats de recherche | CL-05 | lancement | 5 | 5 | 13 (1 · 8 · 4 · 0) | 7 | 1 |
| [`recherche-zero`](#recherche-zero) | Recherche sans résultat | CL-05 | lancement | 2 | 2 | 11 (1 · 9 · 1 · 0) | 3 | 2 |
| [`recherche-filtres`](#recherche-filtres) | Filtres de recherche | CL-05 | lancement | 2 | 2 | 10 (1 · 3 · 4 · 2) | 3 | 1 |
| [`relais-selecteur`](#relais-selecteur) | Relais de la recherche | CL-05 | lancement | 1 | 1 | 3 (0 · 0 · 3 · 0) | 3 | 1 |
| [`fiche`](#fiche) | Fiche produit | CL-06 | lancement | 15 | 15 | 60 (5 · 26 · 25 · 4) | 17 | 3 |
| [`galerie`](#galerie) | Galerie photo | CL-06 | lancement | 2 | 2 | 5 (0 · 3 · 1 · 1) | 0 | 1 |
| [`avis`](#avis) | Avis | CL-06 | lancement | 3 | 3 | 11 (1 · 9 · 0 · 1) | 5 | 1 |
| [`question`](#question) | Question au vendeur | CL-06 | lancement | 2 | 2 | 8 (1 · 4 · 1 · 2) | 0 | 1 |
| [`panier`](#panier) | Panier | CL-07 | lancement | 14 | 13 | 83 (14 · 16 · 49 · 4) | 12 | 7 |
| [`panier-retrait`](#panier-retrait) | Retirer un article | CL-07 | lancement | 1 | 1 | 8 (0 · 2 · 6 · 0) | 0 | 1 |
| [`sauvegardes`](#sauvegardes) | Sauvegardés | CL-07 | lancement | 3 | 3 | 15 (2 · 5 · 8 · 0) | 0 | 1 |
| [`paiement-attente`](#paiement-attente) | Paiement en attente | CL-08 | lancement | 6 | 5 | 25 (0 · 13 · 11 · 1) | 0 | 4 |
| [`prix-change`](#prix-change) | Un prix a changé | CL-08 | lancement | 3 | 3 | 9 (0 · 4 · 4 · 1) | 0 | 2 |
| [`paiement-echec`](#paiement-echec) | Paiement non abouti | CL-08 | lancement | 4 | 4 | 25 (1 · 10 · 13 · 1) | 0 | 0 |
| [`paiement-moyen`](#paiement-moyen) | Moyen de paiement | CL-08 | lancement | 6 | 3 | 6 (0 · 2 · 3 · 1) | 4 | 0 |
| [`confirmee`](#confirmee) | Commande confirmée | CL-08 | lancement | 3 | 3 | 16 (0 · 7 · 9 · 0) | 0 | 1 |
| [`validee`](#validee) | Commande validée | CL-08 | lancement | 1 | 1 | 13 (5 · 2 · 4 · 2) | 0 | 1 |
| [`commandes`](#commandes) | Mes commandes | CL-09 | lancement | 12 | 12 | 49 (1 · 20 · 26 · 2) | 6 | 3 |
| [`commande`](#commande) | Ma commande | CL-09 | lancement | 9 | 9 | 9 (0 · 8 · 1 · 0) | 0 | 2 |
| [`code`](#code) | Code de retrait | CL-09 | lancement | 9 | 8 | 19 (2 · 8 · 6 · 3) | 4 | 2 |
| [`code-partage`](#code-partage) | Envoyer mon code | CL-09 | lancement | 2 | 2 | 24 (2 · 11 · 8 · 3) | 4 | 1 |
| [`suivi`](#suivi) | Suivi de commande | CL-09 | lancement | 5 | 5 | 13 (3 · 4 · 5 · 1) | 3 | 1 |
| [`comptoir-payer`](#comptoir-payer) | Montant dû | CL-09 | lancement | 7 | 7 | 7 (0 · 2 · 3 · 2) | 3 | 1 |
| [`comptoir`](#comptoir) | Au comptoir | CL-09 | lancement | 6 | 6 | 13 (0 · 7 · 6 · 0) | 2 | 3 |
| [`notifications`](#notifications) | Notifications | CL-10 | lancement | 4 | 4 | 12 (0 · 7 · 5 · 0) | 0 | 1 |
| [`notifs-reglages`](#notifs-reglages) | Réglage des notifications | CL-10 | lancement | 5 | 5 | 11 (0 · 3 · 6 · 2) | 0 | 2 |
| [`garde`](#garde) | Frais de garde | CL-10 | lancement | 11 | 11 | 23 (4 · 7 · 8 · 4) | 10 | 1 |
| [`push`](#push) | Aperçu · notifications | CL-10 | lancement | 5 | 5 | 22 (12 · 1 · 9 · 0) | 0 | 0 |
| [`sms`](#sms) | Aperçu · SMS | CL-10 | lancement | 7 | 7 | 19 (6 · 1 · 10 · 2) | 0 | 0 |
| [`lien-court`](#lien-court) | Aperçu · lien court | CL-10 | lancement | 2 | 2 | 19 (6 · 1 · 10 · 2) | 0 | 1 |
| [`litige`](#litige) | Signaler un problème | CL-11 | lancement | 7 | 7 | 16 (2 · 8 · 5 · 1) | 0 | 2 |
| [`litige-confirme`](#litige-confirme) | Litige ouvert | CL-11 | lancement | 3 | 3 | 8 (1 · 1 · 5 · 1) | 2 | 1 |
| [`litige-auto`](#litige-auto) | Remboursé | CL-11 | lancement | 2 | 2 | 6 (0 · 1 · 5 · 0) | 3 | 1 |
| [`litige-comptoir`](#litige-comptoir) | Litige ouvert au comptoir | CL-11 | lancement | 2 | 2 | 5 (0 · 2 · 2 · 1) | 0 | 1 |
| [`litige-suivi`](#litige-suivi) | Suivi du litige | CL-11 | lancement | 10 | 10 | 18 (3 · 6 · 9 · 0) | 5 | 1 |
| [`litige-arrangement`](#litige-arrangement) | Arrangement proposé | CL-11 | lancement | 3 | 3 | 3 (0 · 0 · 3 · 0) | 1 | 1 |
| [`litiges`](#litiges) | Mes litiges | CL-11 | lancement | 2 | 2 | 3 (0 · 2 · 1 · 0) | 0 | 1 |
| [`retour`](#retour) | Retourner un article | CL-11 | lancement | 12 | 12 | 25 (5 · 8 · 7 · 5) | 5 | 2 |
| [`remplacement`](#remplacement) | Remplacement | CL-11 | lancement | 5 | 5 | 8 (1 · 4 · 3 · 0) | 2 | 1 |
| [`modifier`](#modifier) | Modifier ma commande | CL-12 | lancement | 5 | 5 | 29 (5 · 8 · 15 · 1) | 5 | 2 |
| [`annuler`](#annuler) | Annuler ma commande | CL-12 | lancement | 7 | 7 | 28 (5 · 8 · 15 · 0) | 5 | 1 |
| [`annuler-confirmer`](#annuler-confirmer) | Confirmer l’annulation | CL-12 | lancement | 2 | 2 | 19 (4 · 5 · 10 · 0) | 5 | 1 |
| [`changer-relais`](#changer-relais) | Changer de point relais | CL-12 | lancement | 6 | 6 | 15 (2 · 6 · 2 · 5) | 4 | 3 |
| [`changer-adresse`](#changer-adresse) | Changer d’adresse | CL-12 | lancement | 3 | 3 | 5 (1 · 2 · 1 · 1) | 0 | 1 |
| [`payeur`](#payeur) | Payer depuis l’étranger | CL-12 | lancement | 6 | 6 | 13 (1 · 4 · 7 · 1) | 4 | 1 |
| [`payeur-preuve`](#payeur-preuve) | Messages au payeur | CL-12 | lancement | 3 | 3 | 6 (2 · 0 · 3 · 1) | 0 | 1 |
| [`compte`](#compte) | Mon compte | CL-13 | lancement | 2 | 2 | 9 (0 · 4 · 3 · 2) | 0 | 2 |
| [`adresses`](#adresses) | Mes adresses | CL-13 | lancement | 4 | 4 | 4 (0 · 3 · 0 · 1) | 0 | 1 |
| [`moyens-paiement`](#moyens-paiement) | Moyens de paiement | CL-13 | lancement | 2 | 2 | 4 (2 · 1 · 1 · 0) | 0 | 1 |
| [`factures`](#factures) | Factures | CL-13 | lancement | 4 | 4 | 4 (3 · 0 · 0 · 1) | 3 | 1 |
| [`supprimer`](#supprimer) | Supprimer mon compte | CL-13 | lancement | 2 | 2 | 3 (0 · 2 · 1 · 0) | 1 | 1 |
| [`avis-donner`](#avis-donner) | Donner mon avis | CL-13 | lancement | 7 | 7 | 14 (1 · 6 · 3 · 4) | 0 | 1 |
| [`avis-bas`](#avis-bas) | Note basse | CL-13 | lancement | 1 | 1 | 14 (1 · 6 · 3 · 4) | 0 | 1 |
| [`aide`](#aide) | Aide et support | CL-13 | lancement | 3 | 3 | 7 (1 · 1 · 5 · 0) | 0 | 1 |
| [`faq`](#faq) | Questions fréquentes | CL-13 | lancement | 3 | 3 | 3 (1 · 1 · 1 · 0) | 0 | 1 |
| [`messagerie`](#messagerie) | Messagerie | CL-13 | lancement | 2 | 2 | 5 (1 · 4 · 0 · 0) | 0 | 1 |
| [`fil`](#fil) | Conversation | CL-13 | lancement | 6 | 6 | 5 (1 · 4 · 0 · 0) | 0 | 2 |
| [`rappel`](#rappel) | Demander un rappel | CL-13 | lancement | 2 | 2 | 2 (1 · 1 · 0 · 0) | 0 | 1 |
| [`legal`](#legal) | Pages légales | CL-13 | lancement | 1 | 1 | 7 (0 · 5 · 1 · 1) | 0 | 1 |
| [`legal-doc`](#legal-doc) | Document légal | CL-13 | lancement | 3 | 3 | 7 (0 · 5 · 1 · 1) | 0 | 1 |
| [`reseau`](#reseau) | Connexion et données | CL-13 | lancement | 8 | 8 | 8 (0 · 5 · 2 · 1) | 4 | 0 |
| [`reglages`](#reglages) | Réglages | CL-13 | lancement | 3 | 3 | 8 (0 · 4 · 3 · 1) | 0 | 1 |
| [`abonnements`](#abonnements) | Abonnements | CL-14 | après le lancement | 5 | 5 | 36 (7 · 9 · 16 · 4) | 0 | 0 |
| [`abonnement-souscrire`](#abonnement-souscrire) | Souscrire | CL-14 | après le lancement | 5 | 5 | 10 (3 · 3 · 2 · 2) | 0 | 0 |
| [`mon-abonnement`](#mon-abonnement) | Mon abonnement | CL-14 | après le lancement | 4 | 4 | 18 (8 · 2 · 2 · 6) | 7 | 0 |
| [`abonnement-resilier`](#abonnement-resilier) | Résilier | CL-14 | après le lancement | 1 | 1 | 18 (8 · 2 · 2 · 6) | 7 | 0 |
| [`cagnotte`](#cagnotte) | Ma cagnotte | CL-14 | après le lancement | 3 | 3 | 5 (2 · 0 · 1 · 2) | 5 | 0 |
| [`parrainage`](#parrainage) | Parrainer un proche | CL-14 | après le lancement | 3 | 3 | 4 (2 · 2 · 0 · 0) | 0 | 0 |
| [`abonnement-offrir`](#abonnement-offrir) | Offrir un abonnement | CL-14 | après le lancement | 2 | 2 | 4 (1 · 0 · 2 · 1) | 3 | 0 |
| [`listes`](#listes) | Mes listes d’envies | CL-14 | après le lancement | 3 | 3 | 21 (3 · 6 · 7 · 5) | 0 | 0 |
| [`liste-creer`](#liste-creer) | Nouvelle liste | CL-14 | après le lancement | 1 | 1 | 10 (3 · 2 · 2 · 3) | 0 | 0 |
| [`liste-envies`](#liste-envies) | Ma liste | CL-14 | après le lancement | 4 | 4 | 8 (0 · 2 · 1 · 5) | 0 | 0 |
| [`liste-envoyer`](#liste-envoyer) | Envoyer ma liste | CL-14 | après le lancement | 4 | 4 | 8 (1 · 4 · 2 · 1) | 3 | 0 |
| [`liste-publique`](#liste-publique) | Liste partagée | CL-14 | après le lancement | 2 | 2 | 7 (1 · 1 · 2 · 3) | 0 | 0 |
| [`liste-offrir`](#liste-offrir) | Offrir un article | CL-14 | après le lancement | 4 | 4 | 13 (3 · 0 · 4 · 6) | 4 | 0 |
| [`liste-offert`](#liste-offert) | Cadeau offert | CL-14 | après le lancement | 2 | 2 | 13 (3 · 0 · 4 · 6) | 4 | 0 |
| [`ventes-flash`](#ventes-flash) | Ventes flash | CL-14 | après le lancement | 3 | 3 | 10 (2 · 2 · 4 · 2) | 5 | 0 |
| [`assistant`](#assistant) | Assistant BelivaY | CL-14 | après le lancement | 5 | 5 | 12 (3 · 4 · 4 · 1) | 0 | 0 |
| [`assistant-confirmer`](#assistant-confirmer) | Confirmer | CL-14 | après le lancement | 2 | 2 | 12 (3 · 4 · 4 · 1) | 0 | 0 |
| [`rentree`](#rentree) | Liste de rentrée | CL-15 | après le lancement | 2 | 2 | 3 (0 · 1 · 2 · 0) | 0 | 0 |
| [`rentree-liste-papier`](#rentree-liste-papier) | Liste papier | CL-15 | après le lancement | 2 | 2 | 3 (2 · 0 · 1 · 0) | 0 | 0 |
| [`rentree-classe`](#rentree-classe) | Choisir la classe | CL-15 | après le lancement | 1 | 1 | 1 (0 · 0 · 1 · 0) | 1 | 0 |
| [`rentree-liste`](#rentree-liste) | Liste CE1 | CL-15 | après le lancement | 3 | 3 | 7 (2 · 1 · 1 · 3) | 2 | 0 |
| [`rentree-panier`](#rentree-panier) | Panier de rentrée | CL-15 | après le lancement | 1 | 1 | 6 (1 · 1 · 1 · 3) | 3 | 0 |
| [`rentree-suivi`](#rentree-suivi) | Suivi de la liste | CL-15 | après le lancement | 2 | 2 | 6 (2 · 0 · 1 · 3) | 0 | 0 |
| [`ecole`](#ecole) | Espace école | CL-15 | après le lancement | 1 | 1 | 2 (0 · 0 · 0 · 2) | 0 | 0 |
| [`cotisation`](#cotisation) | Cotisation | CL-15 | après le lancement | 1 | 1 | 4 (2 · 0 · 1 · 1) | 2 | 0 |
| [`cotisation-partager`](#cotisation-partager) | Partager | CL-15 | après le lancement | 1 | 1 | 1 (0 · 0 · 1 · 0) | 0 | 0 |
| [`cotisation-participer`](#cotisation-participer) | Participer | CL-15 | après le lancement | 2 | 2 | 6 (0 · 1 · 2 · 3) | 2 | 0 |
| [`cotisation-suivre`](#cotisation-suivre) | Ma cotisation | CL-15 | après le lancement | 1 | 1 | 3 (0 · 1 · 1 · 1) | 1 | 0 |
| [`cotisation-atteinte`](#cotisation-atteinte) | Objectif atteint | CL-15 | après le lancement | 2 | 2 | 3 (1 · 0 · 1 · 1) | 2 | 0 |
| [`cotisation-echue`](#cotisation-echue) | Cotisation terminée | CL-15 | après le lancement | 1 | 1 | 2 (1 · 0 · 1 · 0) | 1 | 0 |
| [`cote`](#cote) | Mettre de côté | CL-15 | après le lancement | 2 | 2 | 5 (2 · 0 · 2 · 1) | 3 | 0 |
| [`cote-plan`](#cote-plan) | Plan de versements | CL-15 | après le lancement | 1 | 1 | 3 (2 · 0 · 1 · 0) | 2 | 0 |
| [`cote-suivre`](#cote-suivre) | Mise de côté | CL-15 | après le lancement | 3 | 3 | 3 (1 · 0 · 1 · 1) | 0 | 0 |
| [`cote-versement`](#cote-versement) | Versement | CL-15 | après le lancement | 2 | 2 | 2 (1 · 0 · 1 · 0) | 0 | 0 |
| [`cote-fini`](#cote-fini) | Mise de côté | CL-15 | après le lancement | 1 | 1 | 2 (2 · 0 · 0 · 0) | 0 | 0 |
| [`cote-annuler`](#cote-annuler) | Mise de côté | CL-15 | après le lancement | 1 | 1 | 4 (4 · 0 · 0 · 0) | 1 | 0 |
| [`troc`](#troc) | Reprise et troc | CL-15 | après le lancement | 1 | 1 | 3 (0 · 1 · 0 · 2) | 0 | 0 |
| [`troc-offre`](#troc-offre) | Offre de troc | CL-15 | après le lancement | 1 | 1 | 2 (0 · 1 · 0 · 1) | 1 | 0 |
| [`troc-depot`](#troc-depot) | Dépôt au relais | CL-15 | après le lancement | 3 | 3 | 5 (1 · 0 · 1 · 3) | 0 | 0 |
| [`troc-inspection`](#troc-inspection) | Inspection | CL-15 | après le lancement | 2 | 2 | 3 (1 · 1 · 0 · 1) | 2 | 0 |
| [`troc-contre-offre`](#troc-contre-offre) | Inspection | CL-15 | après le lancement | 1 | 1 | 2 (0 · 0 · 0 · 2) | 0 | 0 |
| [`troc-payer`](#troc-payer) | Payer le neuf | CL-15 | après le lancement | 1 | 1 | 4 (1 · 0 · 1 · 2) | 1 | 0 |
| [`famille`](#famille) | Panier famille | CL-15 | après le lancement | 2 | 2 | 2 (0 · 0 · 1 · 1) | 2 | 0 |
| [`famille-destinataire`](#famille-destinataire) | Pour qui ? | CL-15 | après le lancement | 1 | 1 | 3 (0 · 1 · 0 · 2) | 0 | 0 |
| [`famille-payer`](#famille-payer) | Payer par carte | CL-15 | après le lancement | 2 | 2 | 3 (0 · 0 · 3 · 0) | 3 | 0 |
| [`famille-mensuel`](#famille-mensuel) | Chaque mois | CL-15 | après le lancement | 2 | 2 | 3 (1 · 1 · 0 · 1) | 2 | 0 |
| [`famille-preuve`](#famille-preuve) | Preuve de retrait | CL-15 | après le lancement | 1 | 1 | 2 (2 · 0 · 0 · 0) | 0 | 0 |
| [`wa`](#wa) | WhatsApp · message | CL-15 | après le lancement | 1 | 1 | 2 (0 · 0 · 1 · 1) | 0 | 0 |
| [`wa-proposition`](#wa-proposition) | WhatsApp · proposition | CL-15 | après le lancement | 2 | 2 | 4 (1 · 1 · 1 · 1) | 1 | 0 |
| [`wa-confirmer`](#wa-confirmer) | WhatsApp · confirmation | CL-15 | après le lancement | 1 | 1 | 2 (0 · 2 · 0 · 0) | 0 | 0 |
| [`wa-lien`](#wa-lien) | WhatsApp · paiement | CL-15 | après le lancement | 1 | 1 | 2 (1 · 0 · 1 · 0) | 0 | 0 |
| [`wa-suite`](#wa-suite) | WhatsApp · suite | CL-15 | après le lancement | 1 | 1 | 2 (1 · 0 · 1 · 0) | 0 | 0 |
| [`selection`](#selection) | Sélection Premium | CL-04 | lancement | 1 | 1 | 0 (0 · 0 · 0 · 0) | 0 | 0 |
| [`diaspora`](#diaspora) | Diaspora | CL-12 | lancement | 1 | 1 | 0 (0 · 0 · 0 · 0) | 0 | 0 |
| [`wallet`](#wallet) | Wallet BelivaY | CL-13 | lancement | 4 | 4 | 0 (0 · 0 · 0 · 0) | 0 | 0 |
| [`devenir-vendeur`](#devenir-vendeur) | Devenir vendeur | CL-13 | lancement | 6 | 5 | 0 (0 · 0 · 0 · 0) | 0 | 0 |
| [`promotions`](#promotions) | Promotions | CL-04 | lancement | 1 | 1 | 0 (0 · 0 · 0 · 0) | 0 | 0 |
| [`ouverture`](#ouverture) | Ouverture | CL-03 | lancement | 1 | 1 | 0 (0 · 0 · 0 · 0) | 0 | 0 |
| [`xp-pay`](#xp-pay) | Paiement express | CL-08 | lancement | 2 | 0 | 0 (0 · 0 · 0 · 0) | 0 | 0 |
| [`lancement`](#lancement) | Lancement de l’app | CL-03 | lancement | 1 | 1 | 0 (0 · 0 · 0 · 0) | 0 | 0 |
| [`faceid`](#faceid) | Face ID ou empreinte | CL-03 | lancement | 2 | 2 | 0 (0 · 0 · 0 · 0) | 0 | 0 |
| [`telephone`](#telephone) |  | CL-10 | lancement | 1 | 2 | 0 (0 · 0 · 0 · 0) | 0 | 0 |
| [`verrouille`](#verrouille) |  | CL-10 | lancement | 1 | 0 | 0 (0 · 0 · 0 · 0) | 0 | 0 |
| [`android`](#android) |  | CL-10 | lancement | 1 | 1 | 0 (0 · 0 · 0 · 0) | 0 | 0 |
| [`ile`](#ile) |  | CL-10 | lancement | 8 | 11 | 0 (0 · 0 · 0 · 0) | 0 | 0 |

<a id="plan"></a>
### `#plan` — Plan du prototype

 · lancement

**Documentation** : outil du prototype (Plan des états), hors site

<a id="menu"></a>
### `#menu` — Menu

CL-01 · lancement

**Documentation** : décrite dans CL-01

**Sections** : CL-01 « Le Menu de l’application et le Plan du prototype »

**Voir aussi, règles transverses** : « Les principes non négociables » ; « Les décisions qui priment » ; « Statuts des règles et des valeurs » ; « Interdits valables partout » ; « La coque : en-têtes, bandeau rotatif, barre du bas et badges » ; « Typographie, densité, rayons, ombres et verre » ; « Icônes » ; « Composants du socle » ; « Illustrations, portraits et photos à produire » ; « Accessibilité » ; « Mode dégradé, formatage et mode capture »

**États** : `#menu` Menu de l’application : compte, relais, catégories, achats, aide, préférences

**Captures** : CL-01 fig. 8 `Socle_Menu`

**Règles côté serveur et écran** (1) : CNV-15 Chaque écran à sa place

**Règles côté écran** (2) : CNV-02 Le Menu est le vrai menu de l’application · CNV-09 Plan du prototype, hors de l’application

<a id="kit"></a>
### `#kit` — Composants

CL-01 · lancement · menu : Accès et états de l’application › Planche de composants

**Documentation** : décrite dans CL-01

**Sections** : CL-01 « Design system « Mandarine & Nuit » »

**Voir aussi, règles transverses** : « Les principes non négociables » ; « Les décisions qui priment » ; « Statuts des règles et des valeurs » ; « Interdits valables partout » ; « La coque : en-têtes, bandeau rotatif, barre du bas et badges » ; « Typographie, densité, rayons, ombres et verre » ; « Icônes » ; « Composants du socle » ; « Illustrations, portraits et photos à produire » ; « Accessibilité » ; « Mode dégradé, formatage et mode capture »

**États** : `#kit` Planche de composants

**Captures** : CL-01 fig. 10 `Kit`

**Règles côté serveur et écran** (4) : CDS-01 Principe de la refonte du 25 septembre (décision du porteur du produit) · CDS-02 Verre dépoli *(calcul)* · CDS-03 Thème sombre « Nuit » complet · CDS-06 Montants en francs entiers, virgule décimale française

**Règles côté écran** (1) : CDS-04 Vrai logo BelivaY

**Règles non classées** (1) : CDS-05 Produits en cartes, grille régulière

<a id="bienvenue"></a>
### `#bienvenue` — Bienvenue

CL-03 · lancement · menu : Accès et états de l’application › Premier lancement · la promesse

**Documentation** : décrite dans CL-03

**Sections** : CL-03 « Écrans « Premier lancement » »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#bienvenue` Premier lancement · écran 1 sur 3, la promesse · `#bienvenue?langue=pcm` Premier lancement · écran 1 en pidgin

**Captures** : CL-03 fig. 1 `Bienvenue` · CL-03 fig. 2 `Bienvenue_pidgin`

**Règles côté serveur** (1) : CIN-11 Langue et centres d’intérêt restent sur l’appareil tant qu’il n’y a pas de compte, puis…

**Règles côté serveur et écran** (5) : CIN-01 Premier lancement en trois écrans au plus : la promesse, les centres d’intérêt… *(calcul)* · CIN-03 L’encart vert dit la promesse : « Ton argent est bloqué jusqu’à ce que tu aies le colis… · CIN-05 Repère « Retour gratuit · si problème validé ». *(calcul)* · CIN-07 Repère de délai « Moins de 5 h · Livraison dans ta zone » à la place de « 24-72 h ·… *(calcul)* · CIN-09 Le pidgin est proposé comme troisième langue (demandé par le prototype, déjà présent chez…

**Règles côté écran** (6) : CIN-02 La promesse est lisible sans défiler : logo, accroche, encart vert, repères, langue et… · CIN-04 L’accroche s’écrit « Tout près de toi » : la spec écrit « Tout près de vous » ; la charte… · CIN-06 Repère « MoMo · MTN, Orange ». · CIN-08 Bilingue dès le premier écran : le choix Français · English est sur l’écran 1 ; il change… · CIN-10 Centres d’intérêt facultatifs : les univers du catalogue avec leur compteur réel ; «… · CIN-12 Le lien « Déjà un compte ?

<a id="interets"></a>
### `#interets` — Centres d’intérêt

CL-03 · lancement · menu : Accès et états de l’application › Premier lancement · centres d’intérêt

**Documentation** : décrite dans CL-03

**Sections** : CL-03 « Écrans « Premier lancement » »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#interets` Premier lancement · écran 2, centres d’intérêt · `#interets?st=choix` Centres d’intérêt · trois catégories touchées · `#interets?langue=pcm` Centres d’intérêt · en pidgin

**Captures** : CL-03 fig. 3 `Interets` · CL-03 fig. 4 `Interets_choix` · CL-03 fig. 5 `Interets_pidgin`

**Règles côté serveur** (1) : CIN-11 Langue et centres d’intérêt restent sur l’appareil tant qu’il n’y a pas de compte, puis…

**Règles côté serveur et écran** (5) : CIN-01 Premier lancement en trois écrans au plus : la promesse, les centres d’intérêt… *(calcul)* · CIN-03 L’encart vert dit la promesse : « Ton argent est bloqué jusqu’à ce que tu aies le colis… · CIN-05 Repère « Retour gratuit · si problème validé ». *(calcul)* · CIN-07 Repère de délai « Moins de 5 h · Livraison dans ta zone » à la place de « 24-72 h ·… *(calcul)* · CIN-09 Le pidgin est proposé comme troisième langue (demandé par le prototype, déjà présent chez…

**Règles côté écran** (6) : CIN-02 La promesse est lisible sans défiler : logo, accroche, encart vert, repères, langue et… · CIN-04 L’accroche s’écrit « Tout près de toi » : la spec écrit « Tout près de vous » ; la charte… · CIN-06 Repère « MoMo · MTN, Orange ». · CIN-08 Bilingue dès le premier écran : le choix Français · English est sur l’écran 1 ; il change… · CIN-10 Centres d’intérêt facultatifs : les univers du catalogue avec leur compteur réel ; «… · CIN-12 Le lien « Déjà un compte ?

<a id="connexion"></a>
### `#connexion` — Connexion

CL-03 · lancement · menu : Accès et états de l’application › Connexion · Google, e-mail, sans compte

**Documentation** : décrite dans CL-03

**Sections** : CL-03 « Écran « Connexion » »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#connexion?lancement=1` Premier lancement · écran 3, connexion · `#connexion?lancement=1&langue=pcm` Connexion · écran 3 en pidgin · `#connexion?st=google&lancement=1` Connexion · feuille « Choisis un compte » Google · `#connexion?st=existant&lancement=1` Connexion Google · adresse déjà inscrite, compte ouvert · `#connexion?st=panier` Connexion demandée au paiement · panier gardé · `#connexion?st=panier&etape=code` Connexion au paiement · feuille, code reçu par WhatsApp · `#connexion?st=panier&choix=pays` Connexion au paiement · pays du numéro (diaspora)

**Captures** : CL-03 fig. 6 `Connexion` · CL-03 fig. 7 `Connexion_pidgin` · CL-03 fig. 8 `Connexion_google` · CL-03 fig. 9 `Connexion_existant` · CL-03 fig. 10 `Connexion_panier`

**Règles côté serveur** (2) : CIN-15 Connexion Google : jeton vérifié par le serveur (POST /auth/google) ; l’application ne… · CIN-20 À la création du compte, événement account.created (console : statistiques).

**Règles côté serveur et écran** (2) : CIN-16 Un e-mail = un compte (contrainte unique en base) : Google avec un e-mail déjà inscrit… *(calcul)* · CIN-18 Connexion demandée au paiement : « Connecte-toi pour payer », avec la carte du panier… *(calcul)*

**Règles côté écran** (3) : CIN-13 Trois choix : « Continuer avec Google » mis en avant (premier, un geste), « Continuer… · CIN-14 « Découvrir sans compte » : on navigue et on remplit son panier ; la connexion n’est… · CIN-19 Bouton Google conforme à la charte de Google en production : fond sombre en thème clair,…

**Règles non classées** (1) : CIN-17 Le compte ouvert par Google garde son mot de passe : les deux méthodes marchent ensuite.

**États et erreurs** : 4 cas (détail dans `pages.json`)

**API** : `POST /auth/google`

<a id="connexion-email"></a>
### `#connexion-email` — Connexion par e-mail

CL-03 · lancement · menu : Accès et états de l’application › Connexion par e-mail

**Documentation** : décrite dans CL-03

**Sections** : CL-03 « Écrans « Connexion par e-mail » et « Mot de passe oublié » »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#connexion-email` Connexion par e-mail · se connecter · `#connexion-email?st=inscription` Connexion par e-mail · créer un compte · `#connexion-email?st=erreur` Connexion par e-mail · identifiants incorrects · `#connexion-email?st=existe` Créer un compte · adresse déjà inscrite

**Captures** : CL-03 fig. 11 `Email` · CL-03 fig. 12 `Email_inscription` · CL-03 fig. 13 `Email_erreur` · CL-03 fig. 14 `Email_existe`

**Règles côté serveur** (1) : CIN-23 Mot de passe de 8 caractères au moins, dont un chiffre (comme l’espace vendeur) ; stocké… *(calcul)*

**Règles côté serveur et écran** (3) : CIN-24 Identifiants faux : un seul message, « E-mail ou mot de passe incorrect. *(calcul)* · CIN-26 Mot de passe oublié : lien par e-mail (Brevo), jamais par SMS. · CIN-27 La réponse est la même que l’adresse ait un compte ou non (« Si … a un compte BelivaY, un… *(calcul)*

**Règles côté écran** (3) : CIN-21 E-mail et mot de passe : méthode classique, proposée en second ; se connecter et créer un… · CIN-25 Adresse déjà inscrite à la création : pas de second compte ; connexion proposée avec… · CIN-28 Un compte créé avec Google n’a pas de mot de passe : l’écran le rappelle et renvoie vers…

**Règles non classées** (1) : CIN-22 Créer un compte demande le prénom, l’e-mail et le mot de passe, rien d’autre : le numéro,…

**États et erreurs** : 5 cas (détail dans `pages.json`)

**API** : `POST /auth/email`

<a id="mdp-oublie"></a>
### `#mdp-oublie` — Mot de passe oublié

CL-03 · lancement · menu : Accès et états de l’application › Mot de passe oublié

**Documentation** : décrite dans CL-03

**Sections** : CL-03 « Écrans « Connexion par e-mail » et « Mot de passe oublié » »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#mdp-oublie` Mot de passe oublié · saisie de l’e-mail · `#mdp-oublie?st=envoye` Mot de passe oublié · lien envoyé

**Captures** : CL-03 fig. 15 `Mdp` · CL-03 fig. 16 `Mdp_envoye`

**Règles côté serveur** (1) : CIN-23 Mot de passe de 8 caractères au moins, dont un chiffre (comme l’espace vendeur) ; stocké… *(calcul)*

**Règles côté serveur et écran** (3) : CIN-24 Identifiants faux : un seul message, « E-mail ou mot de passe incorrect. *(calcul)* · CIN-26 Mot de passe oublié : lien par e-mail (Brevo), jamais par SMS. · CIN-27 La réponse est la même que l’adresse ait un compte ou non (« Si … a un compte BelivaY, un… *(calcul)*

**Règles côté écran** (3) : CIN-21 E-mail et mot de passe : méthode classique, proposée en second ; se connecter et créer un… · CIN-25 Adresse déjà inscrite à la création : pas de second compte ; connexion proposée avec… · CIN-28 Un compte créé avec Google n’a pas de mot de passe : l’écran le rappelle et renvoie vers…

**Règles non classées** (1) : CIN-22 Créer un compte demande le prénom, l’e-mail et le mot de passe, rien d’autre : le numéro,…

**États et erreurs** : 5 cas (détail dans `pages.json`)

**API** : `POST /auth/password/forgot · /auth/password/reset`

<a id="numero"></a>
### `#numero` — Ton numéro

CL-03 · lancement · menu : Accès et états de l’application › Vérifier mon numéro

**Documentation** : décrite dans CL-03

**Sections** : CL-03 « Écran « Vérifier ton numéro » »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#numero?from=panier` Première commande · étape 1, saisie du numéro · `#numero?st=code&from=panier` Vérifier le numéro · code à 6 chiffres · `#numero?st=faux&from=panier` Vérifier le numéro · code faux · `#numero?st=bloque&from=panier` Vérifier le numéro · trop d’essais · `#numero?st=utilise&from=panier` Vérifier le numéro · déjà relié à un compte · `#numero?st=ok&from=panier` Vérifier le numéro · vérifié, droit de commander · `#numero?st=pays&from=panier` Vérifier le numéro · pays du numéro (diaspora) · `#numero?pays=fr&canal=whatsapp&from=panier` Vérifier le numéro · numéro français, code par WhatsApp · `#numero?from=connexion` Connexion par numéro · saisie du numéro

**Captures** : CL-03 fig. 17 `Numero` · CL-03 fig. 18 `Numero_code` · CL-03 fig. 19 `Numero_faux` · CL-03 fig. 20 `Numero_bloque` · CL-03 fig. 21 `Numero_utilise` · CL-03 fig. 22 `Numero_ok`

**Règles côté serveur** (1) : CIN-36 Numéro vérifié : événement phone.verified (paiement : droit de commander ; IFA : identité…

**Règles côté serveur et écran** (3) : CIN-32 Opérateur détecté à la saisie (MTN, Orange) et affiché ; il sert aux instructions de… · CIN-33 Code de 6 chiffres ; durée de validité, nombre d’essais et délai de renvoi sont des… *(calcul)* *(À trancher)* · CIN-38 Le code se remplit tout seul quand c’est possible : Android (API SMS Retriever, le SMS…

**Règles côté écran** (3) : CIN-29 Quelle que soit la méthode de connexion, le numéro est vérifié par code avant toute… · CIN-30 Le numéro vérifié sert au débit Mobile Money, aux messages de retrait, à l’identification… · CIN-34 Code faux : « Ce code ne correspond pas » ; nouvel essai avec le nombre d’essais restants…

**Règles non classées** (3) : CIN-31 Aucun message sur un numéro non vérifié, sauf le code de vérification lui-même (seul… · CIN-35 Numéro déjà utilisé : proposer la connexion au compte existant. · CIN-37 Pendant un blocage, le panier est gardé et la navigation continue ; seul le paiement…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| peut_commander ⇔ numéro_vérifié | Sinon écran de vérification au clic sur payer (3.4). |
| code : 6 chiffres ; validité, essais et renvoi paramétrables | Valeurs à trancher ; proposées : 10 min, 5 essais puis 15 min, renvoi après 60 s et 3 envois par heure (OTP-DUREE, OTP-ESSAIS, OTP-RENVOI). |
| heure de reprise = heure du 5e code faux + 15 min | Jeu d’essai : 10 h 15 + 15 min = « attends 10 h 30 ». |
| opérateur = préfixe(numéro) | Table des préfixes MTN et Orange tenue en paramètre ; 677 → MTN, 655 → Orange sur le jeu d’essai. |

**États et erreurs** : 6 cas (détail dans `pages.json`)

**API** : `POST /auth/otp/send` · `POST /auth/otp/verify` · `POST /payments/{id}/resend · /cancel · /abandon`

<a id="numero-changer"></a>
### `#numero-changer` — Changer de numéro

CL-03 · lancement · menu : Mon compte › Changer de numéro

**Documentation** : décrite dans CL-03

**Sections** : CL-03 « Écran « Changer de numéro » »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#numero-changer` Compte · changer de numéro, code sur l’ancien · `#numero-changer?etape=2` Changer de numéro · nouveau numéro · `#numero-changer?etape=4` Changer de numéro · codes de retrait renouvelés

**Captures** : CL-03 fig. 23 `Changer_ancien` · CL-03 fig. 24 `Changer_nouveau` · CL-03 fig. 25 `Changer_fini`

**Règles côté écran** (3) : CIN-40 Au changement, les codes de retrait en cours sont régénérés : l’ancien est refusé au… · CIN-43 L’ancien numéro reste un moyen de paiement tant que le client ne le retire pas ; il ne… · CIN-46 Le numéro vérifié s’affiche en tête du Compte (CL-13), masqué au milieu, avec la pastille…

**Règles non classées** (5) : CIN-39 Changer de numéro exige un code sur l’ancien, puis un code sur le nouveau :… · CIN-41 L’historique IFA est conservé : c’est le même compte, avec un nouveau numéro. · CIN-42 Plus accès à l’ancien numéro : le changement passe par le support (messagerie tracée),… · CIN-44 Pas de double authentification ni de liste des appareils au lancement : la connexion est… · CIN-45 Changer de numéro ou de mot de passe ferme les sessions des autres appareils.

**États et erreurs** : 4 cas (détail dans `pages.json`)

**API** : `POST /auth/otp/send` · `PUT /me/phone`

<a id="relais-choix"></a>
### `#relais-choix` — Mon relais

CL-03 · lancement · menu : Mon compte › Choisir mon relais

**Documentation** : décrite dans CL-03

**Sections** : CL-03 « Écran « Choisir mon relais » »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#relais-choix` Puce relais de l’en-tête · mon relais habituel · `#relais-choix?sel=Essos` Mon relais · autre relais choisi · `#relais-choix?st=premiere` Première commande · liste des relais · `#relais-choix?st=hors-zone` Choisir un relais · hors des zones servies · `#relais-choix?st=sans-relais` Choisir un relais · aucun relais ouvert dans la zone · `#relais-choix?st=position` Choisir un relais · position refusée

**Captures** : CL-03 fig. 26 `Relais` · CL-03 fig. 27 `Relais_autre` · CL-03 fig. 28 `Relais_premiere` · CL-03 fig. 29 `Relais_horszone` · CL-03 fig. 30 `Relais_sansrelais` · CL-03 fig. 31 `Relais_position`

**Règles côté serveur** (3) : CPR-05 Un seul relais par zone au lancement (RELAIS-PAR-ZONE = 1) : le relais de la zone est… *(calcul)* · CPR-06 Le relais choisi devient le relais habituel et fixe l’origine des distances et des prix… · CPR-10 Aucun relais ouvert dans la zone : proposer le relais le plus proche d’une autre zone,…

**Règles côté serveur et écran** (2) : CPR-09 Le délai hors zone s’écrit comme une date ferme calculée (« Commande passée aujourd’hui :… *(calcul)* · CPR-13 Tri par distance (3.4) ; l’API décrit un tri « par temps de trajet » (3.5) : on trie par…

**Règles côté écran** (7) : CPR-01 Le relais habituel est demandé à la première commande seulement ; ensuite il est… · CPR-02 Liste par distance, le plus proche en premier (pastille verte « Le plus proche ») : seuls… · CPR-03 Un relais « En configuration », saturé ou fermé n’est jamais proposé ; un relais saturé… · CPR-04 Chaque relais montre son gérant (nom et photo), le nom du point, la distance et le temps… · CPR-07 Changer de relais habituel ne déplace pas les commandes en cours ; changer le relais… · CPR-08 Hors des zones servies, le client est prévenu dès le choix du relais. · CPR-11 Position refusée : recherche par quartier ou repère ; la liste se range depuis ce point ;…

**Règles non classées** (1) : CPR-12 Le visiteur sans compte voit les distances depuis le relais le plus proche de sa position…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| relais proposés = relais ouverts (KYC validé ∧ capacité > 0 ∧ horaires définis) ∧ non saturés ∧ ouverts aujourd’hui, triés par distance ↑ | Depuis la position, ou depuis le quartier ou le repère saisi (3.4). Jeu d’essai : Mvog-Ada 350 m, Essos 2,4 km, Mvan 4,8 km, Bastos 6,1 km ; Melen (plein) exclu. |
| relais_habituel = choix du client | Origine des distances et des prix livrés partout (chapitres 5 à 7) ; relay.chosen. |
| zone(relais) ∉ zones servies ⇒ date_retrait = date calculée par la logistique | Affichée comme une date ferme (« retrait samedi 26 sept. »), jamais une fourchette. |
| aucun relais proposé dans la zone ⇒ relais le plus proche d’une autre zone + domicile | Chacun avec son délai réel (3.5). |

**États et erreurs** : 5 cas (détail dans `pages.json`)

**API** : `GET /relais?near=lat,lng · ?q= · &open_today=1&not_full=1` · `PUT /me/relais-habituel`

<a id="premiere-commande"></a>
### `#premiere-commande` — Première commande

CL-03 · lancement · menu : Accès et états de l’application › Première commande · relais et paiement

**Documentation** : décrite dans CL-03

**Sections** : CL-03 « Écran « Première commande » »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#premiere-commande` Première commande · étape 2, au relais · `#premiere-commande?st=domicile` Première commande · étape 2, à domicile · `#premiere-commande?st=paiement` Première commande · feuille « Avec quel numéro payer ? »

**Captures** : CL-03 fig. 32 `Commande1` · CL-03 fig. 33 `Commande1_domicile` · CL-03 fig. 34 `Commande1_numero`

**Règles côté serveur** (1) : CPR-17 Un autre numéro MoMo peut payer : opérateur détecté à la saisie, pas de code SMS (le code…

**Règles côté serveur et écran** (2) : CPR-19 Le total vient du service de tarification et se recalcule à chaque changement de mode ;… *(calcul)* · CPR-21 « Payer … F » lance la séquence serveur du chapitre 8 (recalcul, contrôle des prix,…

**Règles côté écran** (4) : CPR-15 Un seul écran « Avant de payer » réunit le mode de remise et le numéro de paiement ; aux… · CPR-16 Paiement : numéro Mobile Money prérempli avec le numéro vérifié, opérateur affiché. · CPR-18 Mode domicile : l’adresse par repères est demandée (écran suivant) ; la livraison part… · CPR-20 Le XL et le hors gabarit n’ont que le mode domicile : le segment « Au relais » est grisé…

**Règles non classées** (1) : CPR-14 L’adresse de livraison, le relais habituel et le moyen de paiement ne sont demandés qu’à…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| Relais : Total = 271 699 + 1 380 + 400 − 900 = 272 579 F | S ≥ 30 000 F ⇒ livraison de base relais offerte (500 + 400). Montants du service de tarification (7.3). |
| Domicile : Total = 271 699 + 1 380 + 1 000 − 1 500 = 272 579 F | S ≥ 50 000 F ⇒ livraison de base domicile offerte (500 + 1 000), au tarif d’un colis S. Le montant est recalculé à chaque changement de mode. |
| numéro_paiement(1re commande) = numéro vérifié | Ensuite, le dernier numéro utilisé. |

**États et erreurs** : 4 cas (détail dans `pages.json`)

<a id="adresse"></a>
### `#adresse` — Adresse de livraison

CL-03 · lancement · menu : Mon compte › Adresse par repères

**Documentation** : décrite dans CL-03

**Sections** : CL-03 « Écran « Adresse par repères » »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#adresse` Adresse par repères · point sur la carte · `#adresse?st=vide` Adresse par repères · formulaire vide · `#adresse?st=enregistree` Adresse par repères · enregistrée · `#adresse?st=hors-zone` Adresse par repères · quartier hors zone

**Captures** : CL-03 fig. 35 `Adresse` · CL-03 fig. 36 `Adresse_vide` · CL-03 fig. 37 `Adresse_ok` · CL-03 fig. 38 `Adresse_horszone`

**Règles côté écran** (3) : CPR-22 Adresse (si domicile) : nom, quartier, repères en texte libre (« carrefour Emana,… · CPR-23 C’est ce que le livreur utilise : il voit le prénom du client et l’adresse pendant la… · CPR-25 L’adresse enregistrée rejoint « Mon compte › Adresses » et est réutilisée aux commandes…

**Règles non classées** (1) : CPR-24 Quartier hors des zones servies : pas de livraison à domicile au lancement ; un relais…

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `POST · PUT · DELETE /me/adresses · /me/adresses/{id}`

<a id="notifs-proposition"></a>
### `#notifs-proposition` — Notifications

CL-03 · lancement · menu : Accès et états de l’application › Proposition des notifications

**Documentation** : décrite dans CL-03

**Sections** : CL-03 « Feuille « Proposition des notifications » »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#notifs-proposition` Après la première commande · proposition des notifications · `#notifs-proposition?st=sms` Proposition des notifications · « Plus tard », repli SMS

**Captures** : CL-03 fig. 39 `Notifs` · CL-03 fig. 40 `Notifs_sms`

**Règles côté serveur** (1) : CPR-26 Le réglage des notifications (canal de repli SMS, catégories) est proposé après la…

**Règles côté serveur et écran** (4) : CPR-27 Moment : une fois, à la première ouverture du suivi après la première commande (« Suivre… *(calcul)* · CPR-28 Valeurs par défaut : repli SMS au numéro vérifié ; aucun canal WhatsApp au lancement… · CPR-29 « Activer les notifications » demande l’autorisation du système (Android 13 et plus, iOS)… *(calcul)* · CPR-30 Le code de retrait n’apparaît jamais sur l’écran verrouillé ni dans une notification.

**Règles non classées** (1) : CPR-31 Le réglage est porté par le compte, pas par l’appareil (PUT /me/notification-settings).

**API** : `POST · DELETE /devices` · `GET · PUT /me/notification-settings`

<a id="cgu"></a>
### `#cgu` — Conditions

CL-03 · lancement · menu : Accès et états de l’application › Conditions · nouvelle version

**Documentation** : décrite dans CL-03

**Sections** : CL-03 « Feuille « Conditions générales » »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#cgu` Ouverture de l’application · nouvelle version des conditions · `#cgu?st=inscription` Connexion · « Les lire en bref », conditions acceptées

**Captures** : CL-03 fig. 41 `CGU` · CL-03 fig. 42 `CGU_inscription`

**Règles côté serveur** (2) : CCG-01 Pages légales : conditions générales d’utilisation et de vente, politique de… *(calcul)* · CCG-03 Pages versionnées ; la version acceptée est horodatée avec le compte.

**Règles côté serveur et écran** (1) : CCG-07 Nouvelle version majeure : feuille à l’ouverture de l’application, avec ce qui change en… *(calcul)*

**Règles côté écran** (5) : CCG-02 Accessibles depuis le compte, le pied du paiement (pied de « Avant de payer ») et la page… · CCG-04 Aucune case à cocher dans le parcours d’achat : l’acceptation se fait à l’inscription,… · CCG-06 À l’inscription, l’acceptation est la ligne « En créant ton compte, tu acceptes nos… · CCG-08 Après la date d’entrée en vigueur, la feuille ne se ferme plus sans acceptation, mais ne… · CCG-10 Une version mineure (correction, précision) ne demande pas de nouvelle acceptation ; sa…

**Règles non classées** (2) : CCG-05 Rédaction en langage simple, en français et en anglais. · CCG-09 Les commandes déjà passées gardent les conditions et la version des paramètres du jour de…

**API** : `GET · POST /legal/{doc}?lang= · /me/legal · /me/legal/accept`

<a id="accueil"></a>
### `#accueil` — Accueil

CL-04 · lancement · onglet accueil

**Documentation** : décrite dans CL-01, CL-04

**Sections** : CL-01 « Carte des écrans et navigation » ; CL-01 « Rendus : clair, sombre, anglais, pidgin, taille du texte, iPhone » ; CL-04 « Écran « Accueil » — l’accueil d’origine, avec un contenu vrai » ; CL-04 « Accueil — ce qui change selon le profil » ; CL-04 « Accueil — réseau lent et hors ligne »

**Voir aussi, règles transverses** : « Compteurs réels — partout » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#accueil` Écran racine · accueil · `#accueil?st=horsligne` Hors ligne · `#accueil` Accueil · version d’origine, acheteuse fidèle, 3 colis au relais · `#accueil?st=ferme` Accueil · relais fermé ce jour-là · `#accueil?profil=nouveau` Accueil · profil nouveau · `#accueil?profil=navigateur` Accueil · profil navigateur sans achat · `#accueil?profil=visiteur` Accueil · visiteur sans compte · `#accueil?st=lent` Accueil · connexion lente · `#accueil?st=horsligne` Accueil · hors ligne · `#accueil?pop=profil` Menu du profil · touche l’avatar de l’en-tête

**Captures** : CL-01 fig. 4 `Socle_Accueil` · CL-01 fig. 13 `Socle_Hors_ligne` · CL-04 fig. 1 `Accueil` · CL-04 fig. 2 `Accueil_relais_ferme` · CL-04 fig. 3 `Accueil_nouveau` · CL-04 fig. 4 `Accueil_navigateur` · CL-04 fig. 5 `Accueil_visiteur` · CL-04 fig. 6 `Accueil_lent` · CL-04 fig. 7 `Accueil_hors_ligne`

**Règles côté serveur** (2) : CAC-21 10 à 20 % des emplacements d’une rangée d’univers tournent sur les nouveaux produits,… *(calcul)* · CAC-24 Le seuil N, les quotas de rotation, le seuil de connexion lente et les montants des…

**Règles côté serveur et écran** (18) : CRD-02 Français et anglais sur tous les écrans · CRD-03 Pidgin · CRD-05 Taille du texte *(calcul)* · CAC-03 La barre de recherche est toujours visible dans l’en-tête racine : le champ ouvre… *(calcul)* · CAC-04 Reprise de parcours dans la barre flottante, à la place de la barre promo d’origine : « N… *(calcul)* · CAC-05 La barre reprend les horaires déclarés par le relais ; un relais fermé ce jour-là le dit… *(calcul)* · CAC-10 « Près de ton relais » dans la case « À la une » : pastille « Près de ton relais », les 8… *(calcul)* · CAC-11 Nouveautés dans la case « Nouveaux arrivages » (sans pastille) : les 5 derniers produits… · CAC-32 Les deux encarts d’origine gardent leur place avec un contenu BelivaY vrai : « Retrait… *(calcul)* · CAC-33 « Pourquoi choisir BelivaY ? *(calcul)* · CAC-34 Carte « BelivaY · Tout près de toi » : quatre compteurs vrais, lus dans l’agrégat et les… *(calcul)* · CAC-35 Pied de page : Liens rapides, Aide, Nous joindre (Yaoundé ; « Être rappelé · appel masqué… · CAC-16 L’ordre des cases est celui de l’accueil d’origine pour tous les profils. · CAC-19 Une rangée sous N produits n’est pas affichée : mieux vaut sept rangées pleines que huit… *(calcul)* *(À trancher)* · CAC-20 Rangée personnelle (« Récemment consultés ») : montrée seulement avec au moins N produits… *(calcul)* · CAC-23 Les rangées se chargent progressivement au défilement (coût des données). *(calcul)* · CAC-25 Hors ligne : bandeau avec l’heure d’enregistrement (reseau?st=cache) ; « Récemment… *(calcul)* · CAC-28 La cloche de l’en-tête porte le nombre de non-lus (3 ; 99+ au plus) ; sans non-lu, pas de… *(calcul)*

**Règles côté écran** (20) : CRD-01 Chaque écran existe en six rendus vérifiés · CRD-04 Construction de l’anglais · CAC-01 L’accueil reprend l’accueil de l’application d’origine (IMG_2339 → 2355) : mêmes blocs,… · CAC-02 Ordre, identique pour tous les profils : bandeau rotatif · en-tête et recherche ·… · CAC-06 Le paiement interrompu n’a pas de case sur l’accueil d’origine : il n’y figure plus. · CAC-07 Carrousel de 6 bandes d’univers (Mode femme, Téléphones & tablettes, Maison & cuisine,… · CAC-08 Les catégories de l’accueil sont la rangée de pastilles d’origine : Explorer (index… · CAC-09 Rangées par univers (l’élément central), dans l’ordre d’origine : Mode femme, bannière… · CAC-12 Top ventes dans la case « Produits populaires » : grille de 3 colonnes, les 6 produits… · CAC-31 « Prix en baisse » à la place des Flash Deals : seulement les produits dont le prix barré… · CAC-13 Profil nouveau (aucune commande, aucun historique) : pas de « Récemment consultés », pas… · CAC-14 Profil navigateur sans achat : « Récemment consultés » montre les produits des univers… · CAC-15 Profil acheteur fidèle : « Récemment consultés » (ses fiches vues) et barre de reprise… · CAC-17 Rangées : défilement horizontal, trois cartes compactes par largeur d’écran ; « Produits… · CAC-18 Chaque carte : photo, remise réelle et prix barré, cœur, nom, distance jusqu’au relais du… · CAC-22 Chaque case de produits (À la une, Récemment consultés, Produits populaires, Nouveaux… · CAC-26 Aucun module après le lancement sur l’accueil : Flash Deals remplacés par « Prix en… · CAC-27 Une boutique « Fermé aujourd’hui » voit ses offres retirées des rangées aussitôt… · CAC-29 Visiteur sans compte : navigation complète, panier gardé ; ligne « Tu navigues sans… · CAC-30 Client sans relais habituel (nouveau, visiteur) : distances et lignes livrées partent du…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| colis_en_attente = Σ colis (arrivee_relais ∨ validee_comptoir) non remis | 3 = 2 (BLV-52018) + 1 (BLV-51940). Barre « 3 colis t’attendent au relais » ; pas de barre si 0. |
| Prix en baisse = produits où P_barré > P, par remise décroissante | Baskets arrondi((34 900 − 29 900) / 34 900 × 100) = 14 % ; Galaxy A15 10 % ; Montre 8 %. |
| À la une = 8 produits hors XL, par distance croissante au relais | Du Pagne wax (0,5 km) au Beurre de karité (1,0 km) ; le Téléviseur 43″ (XL) n’y entre pas. |
| Produits populaires = 6 produits les plus commandés | Karité 1 120 ventes, chargeur 902, écouteurs 640, pagne 518, huile de coco 430, Camon 30 412. |
| Pastille d’une rangée = sous-catégorie au plus grand compteur | Pagnes & wax 112 ; Audio 41 ; Accessoires 64 ; Cheveux 61 ; Cuisine 52 ; Épicerie 72. |
| Carte BelivaY : produits = Σ univers ; univers = univers actifs | 1 387 produits ; 10 univers ; 12 quartiers = zones exploitées au lancement. |

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| rangée visible ⇔ n ≥ N | N = ACC-RANGEE-MIN (3 à l’écran). Récemment consultés de Carine : 5 ≥ 3 ⇒ affichée ; profil nouveau : 0 ⇒ absente. |
| part_nouveaux = ⌊0,2 × longueur⌋ emplacements, à partir de la 3e place | Téléphones & tablettes : 5 cartes ⇒ 1 emplacement : Tablette 8″ (55 ventes) passe 3e, devant le Galaxy A15 (301). Maison & cuisine : 4 cartes ⇒ 0. |
| Récemment consultés (navigateur) = univers vus, par ventes | Téléphones & tablettes (Chargeur 902, Camon 30 412, Galaxy A15 301, itel AC52 188, Tablette 8″ 55) puis Beauté & santé (karité 1 120) : 6 cartes. |

**Paramètres** : `ACC-RANGEE-MIN`, `ACC-NOUVEAUX`, `FF-ABONNEMENT`, `NET-LENT`, `CACHE-CODE`, `NOT-BADGE-MAX`, `FF-FLASH`, `FF-IA`

**États et erreurs** : 7 cas (détail dans `pages.json`)

**API** : `GET /home?profil=auto · /home/rows/{id}?cursor=`

<a id="categories"></a>
### `#categories` — Catégories

CL-04 · lancement · onglet categories · menu : Acheter › Catégories

**Documentation** : décrite dans CL-04

**Sections** : CL-04 « Écran « Index des catégories » »

**Voir aussi, règles transverses** : « Compteurs réels — partout » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#categories` Catégories · Téléphones & tablettes · `#categories?u=sport` Catégories · Sport & loisirs, vignette vide masquée

**Captures** : CL-04 fig. 8 `Categories` · CL-04 fig. 9 `Categories_sport`

**Règles côté serveur et écran** (2) : CCT-02 Pas de rechargement au changement d’univers : la liste légère des univers,… *(calcul)* · CCT-06 Toutes les cibles tactiles mesurent au moins 44 px (rail 68 px, vignettes, bouton de 40… *(calcul)*

**Règles côté écran** (9) : CCT-01 Écran « hub » : rail vertical des univers à gauche ; bannière de l’univers actif et… · CCT-03 L’indicateur du rail reste visible pendant le défilement : rail collant, univers actif… · CCT-04 Bannière : nom, nombre réel de sous-catégories et de produits (« 4 sous-catégories · 132… · CCT-05 Vignettes avec le nombre de produits ; une sous-catégorie à 0 produit n’est pas affichée… · CCT-07 Destination unique : bannière, « Tout voir » et vignettes ouvrent le même listing… · CCT-08 Emplacements promotionnels : contenu BelivaY uniquement, jamais de publicité tierce ni de… · CCT-09 Accroche « Tout près de toi » (la spec écrit « Tout près de vous » ; adaptée au… · CCT-10 Visuels : photos de vrais produits du catalogue avant le lancement ; taxonomie sans… · CCT-12 Le rail garde la place de chaque univers ; en très grande taille de texte, il passe…

**Règles non classées** (1) : CCT-11 Ordre du rail : celui de la taxonomie réglée en console ; l’index s’ouvre sur le premier…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| vignette visible ⇔ compteur(sous_cat) > 0 | Natation = 0 ⇒ masquée ; Sport & loisirs affiche 3 sous-catégories. |
| bannière = « Σ sous-catégories non vides · Σ produits » | Téléphones & tablettes : 4 · 38 + 21 + 9 + 64 = 132. |

**API** : `GET /categories`

<a id="liste"></a>
### `#liste` — Listing

CL-04 · lancement · onglet categories · menu : Acheter › Listing d’une catégorie

**Documentation** : décrite dans CL-04

**Sections** : CL-04 « Écran « Listing » — la page catégorie unique » ; CL-04 « Listing — gros colis, filtre de livrabilité, catégorie peu fournie »

**Voir aussi, règles transverses** : « Compteurs réels — partout » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#liste?cat=tel` Listing · Téléphones & tablettes, Pertinence · `#liste?tri=proche&from=accueil` Listing · tout le catalogue, Au plus proche · `#liste?cat=tel&sub=Smartphones&sheet=marque&sel=Samsung` Listing · Smartphones, feuille Marque · `#liste?cat=elec` Listing · Électronique, carte XL · `#liste?cat=elec&f=relais` Listing · filtre Retirable à mon relais · `#liste?cat=tel&sub=Tablettes&f=auj` Listing · catégorie peu fournie, Aussi dans

**Captures** : CL-04 fig. 10 `Liste` · CL-04 fig. 11 `Liste_proche` · CL-04 fig. 12 `Liste_marque` · CL-04 fig. 13 `Liste_XL` · CL-04 fig. 14 `Liste_retirable` · CL-04 fig. 15 `Liste_peu_fournie`

**Règles côté serveur** (1) : CLS-06 Pertinence dans une catégorie : disponible et livrable au relais d’abord, puis popularité… *(calcul)*

**Règles côté serveur et écran** (10) : CLS-01 Une seule page, un seul comportement, quelle que soit l’entrée : bande, tuile, « Voir… *(calcul)* · CLS-04 Puces : Filtres (nombre actif), Pertinence, Au plus proche, Prix, Marque. *(calcul)* · CLS-08 Caractéristiques clés sous le titre de la carte : trois au maximum, propres à la… *(calcul)* · CLS-09 Prix livré de l’offre attribuée ; « à partir de » quand les variantes n’ont pas le même… *(calcul)* · CLS-10 Distance au relais et état : « En stock » ; « Garantie 6 mois » pour un reconditionné ; «… *(calcul)* · CLS-11 Ajout rapide : bouton panier (« + ») et cœur sur chaque carte ; les favoris sont une… · CLS-12 La distance part du relais habituel du client (PostGIS), identique en recherche et sur la… · CLS-13 Catégorie peu fournie : quand n(c) < seuil_écran, compléter avec les sous-catégories… · CLS-16 Étiquettes : Officiel, Populaire, Reconditionné, Le plus proche, remise réelle — chacune… *(calcul)* · CLS-18 Réseau lent : produits chargés au défilement, images réduites, bande ambre… *(calcul)*

**Règles côté écran** (7) : CLS-02 Grille régulière de cartes dans toutes les catégories (arbitrage du 17 sept., fin du… · CLS-03 Recherche dans la catégorie sous le titre (ouvre la saisie de CL-05, limitée à la… · CLS-05 Sous-rayons de l’univers en puces, avec leur nombre réel ; « Tout » revient à l’univers. · CLS-07 « Prix » trie par prix livré croissant au premier tap, décroissant au second ; la puce… · CLS-14 Filtre de livrabilité « Retirable à mon relais » : exclut XL et hors gabarit ; le… · CLS-15 Carte d’un XL ou hors gabarit : « Livraison à domicile » à la place du retrait, état «… · CLS-19 Un filtre actif se retire d’un geste (puce ✕) ; l’onglet actif est celui du parcours…

**Règles non classées** (1) : CLS-17 Un produit maître par carte, prix livré de l’offre attribuée ; aucun nom de boutique,…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| prix_carte = min(P_livré(v)) sur les variantes actives | « à partir de » si les variantes n’ont pas toutes le même prix : Camon 30 128 Go 139 000 F, 256 Go 150 699 F. |
| remise % = arrondi((P_barré − P) / P_barré × 100) | Seulement si P_barré > P et réellement pratiqué. 140 000 → 126 000 = −10 % (spec) ; 99 900 → 89 900 = −10 % ; 34 900 → 29 900 = −14 % ; 29 900 → 27 500 = −8 %. |
| « Le plus proche » ⇔ distance = min(liste) | Une seule carte porte l’étiquette : Chargeur 33 W (0,6 km) dans Téléphones & tablettes, pagne (0,5 km) dans le catalogue. |
| compteur(listing) = COUNT(maître ∧ ∃ offre active ∧ filtres) | 132 ; 38 ; 9 marques Samsung. |

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| n(c) < seuil_écran ⇒ compléter « Aussi dans … » | seuil_écran = paramètre (6 recommandé). Tablettes avec le filtre : 1 < 6. |
| count(f = relais) = count − Σ XL et hors gabarit | Électronique : 98 − 7 = 91. |

**Paramètres** : `LIV-XL-RELAIS`, `LIV-OFFERT-CLASSE`, `LIV-SUPPL-M / L`, `LIV-RELAIS-BASE`, `LIV-SEUIL-RELAIS`, `seuil_écran (sans code)`

**États et erreurs** : 6 cas (détail dans `pages.json`)

**API** : `GET /listing/{cat}?sub=&tri=&f=&marque=&cursor=`

<a id="recherche"></a>
### `#recherche` — Recherche

CL-05 · lancement · onglet accueil · menu : Acheter › Recherche

**Documentation** : décrite dans CL-05

**Sections** : CL-05 « Écran « Avant saisie » » ; CL-05 « En-tête, voix et suggestions »

**Voir aussi, règles transverses** : « Moteur, attribution et classement » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#recherche` Barre de recherche de l’accueil · avant saisie · `#recherche?st=efface` Recherche · « Effacer » l’historique · `#recherche?st=voix` Micro de la barre · recherche vocale

**Captures** : CL-05 fig. 1 `Recherche_avant_saisie` · CL-05 fig. 2 `Recherche_efface` · CL-05 fig. 3 `Recherche_vocale`

**Règles côté serveur** (1) : CRE-07 Chaque puce de zone porte le nombre réel de produits livrables aujourd’hui à ce relais,… *(calcul)*

**Règles côté serveur et écran** (4) : CRE-03 L’historique est porté par le compte : la croix et « Effacer » le suppriment vraiment… · CRE-06 « Recherché dans ta zone cette semaine » : puces des recherches les plus fréquentes… *(calcul)* · CRE-08 Une puce de zone ne s’affiche que si elle renvoie aujourd’hui au moins un produit… *(calcul)* · CRE-09 « Parcourir » : les grands univers qui contiennent des produits, avec leur nombre réel ;…

**Règles côté écran** (12) : CRE-01 Au tap sur la barre de recherche, l’écran « avant saisie » s’ouvre champ actif et clavier… · CRE-02 « Tes recherches » : les dernières recherches, une par ligne, icône d’horloge et croix… · CRE-04 « Effacer » agit sans demande de confirmation et affiche un message bref « Tes recherches… · CRE-05 Un nouveau client sans historique (ou après « Effacer ») ne voit pas « Tes recherches » :… · CRE-10 En-tête : flèche de retour, champ, micro et loupe ; sous le champ, le sélecteur « Retrait… · CRE-11 Texte d’invite exact « Rechercher un produit, une marque… », en entier, sans troncature. · CRE-12 La loupe est dans le champ, à gauche ; le bouton orange accolé au champ et la touche «… · CRE-13 La recherche vocale lance directement la recherche, sans étape de confirmation : la… · CRE-14 Suggestions dès la 2e lettre : on évite la faute plutôt que de la corriger. · CRE-15 Partie tapée en normal, complétion en gras ; à droite, le nombre réel de produits maîtres… · CRE-16 Une suggestion peut être une catégorie (exemple de la spec : « samburu » · Mode Femme) :… · CRE-17 Requête connue sans produit : « 0 · on cherche » — le client sait que BelivaY y travaille…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| historique = N dernières requêtes, dédupliquées par norm(q) | La plus récente en premier. N = RECH-HIST (4, proposé). norm = minuscules, sans accent, espaces réduits. |
| × ⇒ supprimer la ligne ; « Effacer » ⇒ tout supprimer | Suppression réelle en base, pas un masquage local. |
| tendances(zone) = top k norm(q) sur 7 jours glissants | Zone du relais habituel. Tri par clients distincts, pas par nombre de recherches. k = 5 (recommandé). |
| puce affichée ⇔ n_résultats_livrables(q, relais) > 0 | Le nombre affiché sur la puce est ce n. Les requêtes sans résultat restent dans le journal de la console (chapitre 18). |
| univers affiché ⇔ compteur(univers) > 0 | Même compteur que l’index des catégories (chapitre 4). |

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| suggestions ⇔ len(q) ≥ 2 | Déclenchement à la 2e lettre (RECH-SUGG), après une courte pause de frappe (150 ms recommandés) ; toute réponse plus ancienne que la dernière frappe est ignorée. |
| compteur(suggestion) = n produits maîtres réels | « 0 · on cherche » si n = 0 et requête connue (déjà cherchée, dans la table des synonymes ou au catalogue à venir). |
| affichage = préfixe commun normal + reste en gras | Préfixe commun calculé sans accent ni casse : « chargeur tek » → « chargeur te » + cno. |

**Paramètres** : `RECH-HIST`, `RECH-TENDANCES (à créer)`, `RECH-SUGG`, `RECH-SUGG-MAX (à créer)`

**États et erreurs** : 7 cas (détail dans `pages.json`)

**API** : `GET /search/trending?zone=` · `GET · DELETE /me/search-history · /me/search-history/{id}`

<a id="recherche-saisie"></a>
### `#recherche-saisie` — Recherche · suggestions

CL-05 · lancement · onglet accueil · menu : Acheter › Recherche · suggestions

**Documentation** : décrite dans CL-05

**Sections** : CL-05 « En-tête, voix et suggestions »

**Voir aussi, règles transverses** : « Moteur, attribution et classement » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#recherche-saisie?q=ch` Recherche · suggestions dès la 2e lettre · `#recherche-saisie?q=chargeur+tek` Recherche · suggestion avant la faute · `#recherche-saisie?q=clim` Recherche · suggestion « 0 · on cherche »

**Captures** : CL-05 fig. 4 `Saisie_deux_lettres` · CL-05 fig. 5 `Saisie_faute_evitee` · CL-05 fig. 6 `Saisie_on_cherche`

**Règles côté écran** (8) : CRE-10 En-tête : flèche de retour, champ, micro et loupe ; sous le champ, le sélecteur « Retrait… · CRE-11 Texte d’invite exact « Rechercher un produit, une marque… », en entier, sans troncature. · CRE-12 La loupe est dans le champ, à gauche ; le bouton orange accolé au champ et la touche «… · CRE-13 La recherche vocale lance directement la recherche, sans étape de confirmation : la… · CRE-14 Suggestions dès la 2e lettre : on évite la faute plutôt que de la corriger. · CRE-15 Partie tapée en normal, complétion en gras ; à droite, le nombre réel de produits maîtres… · CRE-16 Une suggestion peut être une catégorie (exemple de la spec : « samburu » · Mode Femme) :… · CRE-17 Requête connue sans produit : « 0 · on cherche » — le client sait que BelivaY y travaille…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| suggestions ⇔ len(q) ≥ 2 | Déclenchement à la 2e lettre (RECH-SUGG), après une courte pause de frappe (150 ms recommandés) ; toute réponse plus ancienne que la dernière frappe est ignorée. |
| compteur(suggestion) = n produits maîtres réels | « 0 · on cherche » si n = 0 et requête connue (déjà cherchée, dans la table des synonymes ou au catalogue à venir). |
| affichage = préfixe commun normal + reste en gras | Préfixe commun calculé sans accent ni casse : « chargeur tek » → « chargeur te » + cno. |

**Paramètres** : `RECH-SUGG`, `RECH-SUGG-MAX (à créer)`

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `GET /search/suggest?q=`

<a id="recherche-resultats"></a>
### `#recherche-resultats` — Résultats de recherche

CL-05 · lancement · onglet accueil · menu : Acheter › Résultats de recherche

**Documentation** : décrite dans CL-05

**Sections** : CL-05 « Sélecteur de relais » ; CL-05 « Écran « Résultats » »

**Voir aussi, règles transverses** : « Moteur, attribution et classement » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#recherche-resultats?q=chargeur+tecno&relais=essos&tri=proche` Résultats · autre relais, « Au plus proche » · `#recherche-resultats?q=chargeur+tekno` Résultats · saisie corrigée, repère panier · `#recherche-resultats?q=chargeur+tecno&auj=1` Résultats · puce « Retirable aujourd’hui » · `#recherche-resultats?q=fer+à+repasser` Résultats · produit épuisé en fin de liste · `#recherche-resultats?q=téléviseur` Résultats · colis XL livrés à domicile

**Captures** : CL-05 fig. 8 `Resultats_relais_change` · CL-05 fig. 9 `Resultats_corriges` · CL-05 fig. 10 `Resultats_filtre_actif` · CL-05 fig. 11 `Resultats_epuise` · CL-05 fig. 12 `Resultats_domicile`

**Règles côté serveur** (1) : CRE-23 Un résultat par produit maître : photo, nom, prix livré de l’offre attribuée, distance au…

**Règles côté serveur et écran** (4) : CRE-18 Le sélecteur reprend le relais habituel et propose les relais ouverts et non saturés, du… *(calcul)* · CRE-19 Toutes les distances et la livrabilité sont recalculées depuis le relais choisi : changer… *(calcul)* · CRE-20 Le relais choisi devient le relais habituel (même effet que le choix du relais, 3.4 : PUT… · CRE-22 Puces : « Filtres » (nombre actif), « Pertinence » (défaut), « Au plus proche », «… *(calcul)*

**Règles côté écran** (8) : CRE-21 Bandeau de correction « Résultats pour téléphone Samsung — corrigé depuis « telefone… · CRE-24 La ligne de livraison de la carte est celle du listing et de la fiche pour un achat seul… · CRE-25 Repère panier « Déjà sur le trajet de ton panier — sans ramassage en plus », à la place… · CRE-26 Un produit épuisé chez tous les vendeurs reste visible avec « Épuisé » (photo atténuée,… · CRE-27 Colis XL ou hors gabarit : « Livraison à domicile » et « Trop volumineux pour un relais »… · CRE-28 Le jargon des classes de colis est expliqué une fois, sous la liste, dans un bloc replié… · CRE-29 Bloc « Tu cherchais autre chose ? · CRE-30 Ce bloc propose la catégorie la plus probable (avec son nombre de produits) et « Modifier…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| relais proposés = relais ouverts ∧ non saturés, triés par distance ↑ | Depuis la position ou l’adresse du client (3.4) ; relais « En configuration », saturé ou fermé aujourd’hui : absent. Un seul relais par zone au lancement (RELAIS-PAR-ZONE). |
| distance = ST_Distance(vendeur, relais_sélectionné) | Géodésique, en km, arrondie à 0,1. Recalculée si le relais change. |
| retirable_aujourd’hui ⇔ t_prêt + t_tournée ≤ fermeture_relais(aujourd’hui) ∧ classe ≤ L | Estimation serveur ; filtre et puce utilisent la même règle. Relais fermé ce jour-là : faux pour tous les produits. |

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| prix de la carte = P(offre attribuée) ; ligne de livraison = C.delivered (socle, CL-01) | « Retrait offert » si P ≥ 30 000 F (LIV-SEUIL-RELAIS), sinon « + 900 F de retrait » (LIV-RELAIS-BASE) ; puis « + 200 F colis M » ou « + 300 F colis L » ; XL et hors gabarit : « Livraison à domicile » et « Trop volumineux pour un relais », sans montant sur la carte, comme au listing (CL-04) ; la fiche (CL-06) montre le supplément XL proposé, 1 500 F (LIV-SUPPL-XL, à trancher). |
| supplément de classe = M : 200 F · L : 300 F (valeurs montrées) | LIV-SUPPL-M / L à trancher ; la livraison offerte couvre le tarif d’un colis S, le supplément reste dû (7.3). |
| repère panier ⇔ boutique(offre attribuée) ∈ boutiques(panier) | Remplace la ligne de livraison : ce produit n’ajoute aucun ramassage (Ram inchangé). |
| compteur = COUNT(produits maîtres ∧ filtres) | Nombre réel, jamais arrondi (4.2). |

**Paramètres** : `LIV-RELAIS-BASE`, `LIV-SEUIL-RELAIS`, `LIV-OFFERT-CLASSE`, `LIV-SUPPL-M / L`, `LIV-XL-RELAIS`, `LIV-SUPPL-XL`, `RECH-PAGE (à créer)`

**États et erreurs** : 7 cas (détail dans `pages.json`)

**API** : `GET /search?q=&filters=&relais=&tri=&cursor=`

<a id="recherche-zero"></a>
### `#recherche-zero` — Recherche sans résultat

CL-05 · lancement · onglet accueil · menu : Acheter › Recherche sans résultat

**Documentation** : décrite dans CL-05

**Sections** : CL-05 « Zéro résultat utile et journal »

**Voir aussi, règles transverses** : « Moteur, attribution et classement » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#recherche-zero?q=climatiseur+split` Recherche · zéro résultat utile · `#recherche-zero?q=climatiseur+split&st=alerte` Zéro résultat · alerte « Préviens-moi » créée

**Captures** : CL-05 fig. 15 `Zero_resultat` · CL-05 fig. 16 `Zero_alerte`

**Règles côté serveur** (1) : CRZ-09 Chaque recherche sans résultat est enregistrée ; la console en fait la liste par zone…

**Règles côté serveur et écran** (1) : CRZ-04 « Préviens-moi quand ça arrive » : alerte sur cette requête et cette zone ; push gratuit…

**Règles côté écran** (9) : CRZ-01 Ne jamais afficher une page vide : quand la requête ne donne rien de livrable, le bloc «… · CRZ-02 Une phrase honnête : « Aucun résultat pour « Samsung Fold » livrable à ton relais. · CRZ-03 Produits proches par le sens (plongements), avec un lien vers leur recherche complète («… · CRZ-05 L’alerte créée s’affiche dans l’écran (encadré vert) avec « Annuler l’alerte » ; une… · CRZ-06 « Voir la catégorie Téléphones » : la catégorie la plus probable de la requête (ici Petit… · CRZ-07 La ligne de preuve : « Tu es la 96e personne à chercher ça ce mois-ci. · CRZ-08 La fin de la ligne de preuve est écrite « on te prévient le jour de la mise en ligne » :… · CRZ-10 Une requête connue sans produit apparaît dès la saisie avec « 0 · on cherche » et mène à… · CRZ-11 Sans produit proche par le sens (cas rare), la page garde la phrase honnête, l’alerte, la…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| rang_personne = COUNT(DISTINCT clients ayant cherché norm(q) ce mois) | « Tu es la Ne personne » (ici 57e). |
| alerte(q, zone) ⇒ un push à la publication | Une seule notification par alerte, puis fermeture. Push gratuit, jamais un SMS (le SMS est réservé à ce qui protège la commande). |
| search.no_result ⇐ n_livrables(q, relais) = 0 | Émis à chaque recherche sans résultat livrable, avec la zone ; même quand des proches par le sens sont montrés. |

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `GET /search?q=&filters=&relais=&tri=&cursor=` · `POST /search/alerts`

<a id="recherche-filtres"></a>
### `#recherche-filtres` — Filtres de recherche

CL-05 · lancement · onglet accueil · menu : Acheter › Filtres de recherche

**Documentation** : décrite dans CL-05

**Sections** : CL-05 « Écran « Filtres » »

**Voir aussi, règles transverses** : « Moteur, attribution et classement » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#recherche-filtres?q=chargeur+tecno` Résultats · « Filtres », quatre familles · `#recherche-filtres?q=chargeur+tecno&auj=1` Filtres · compteur en direct, option grisée

**Captures** : CL-05 fig. 13 `Filtres` · CL-05 fig. 14 `Filtres_grise`

**Règles côté serveur** (1) : CRE-38 Compteur d’une option = nombre de résultats si on l’ajoute aux filtres actifs (ET entre… *(calcul)*

**Règles côté serveur et écran** (4) : CRE-32 Livrabilité : « Retirable à mon relais », « Livrable à domicile », « Retrait possible… · CRE-33 Disponibilité : « En stock uniquement », en interrupteur. · CRE-39 « Retirable à mon relais » compte les classes S à L, stock ou non ; « Retrait possible… · CRE-40 Ouvert depuis le listing d’une catégorie (puce « Filtres », 4.4), c’est le même écran à…

**Règles côté écran** (3) : CRE-35 « Tout effacer » en haut ; « Voir les N résultats » en bas, N mis à jour à chaque… · CRE-36 Un filtre qui ne renverrait aucun produit est grisé (compteur 0, bordure pointillée, non… · CRE-37 Les filtres ne s’affichent qu’après une première recherche : jamais dans la barre de…

**Règles non classées** (2) : CRE-31 Quatre familles, pas plus (RECH-FAMILLES) : prix (min et max), livrabilité,… · CRE-34 Marque : puces des marques présentes dans les résultats, avec leur nombre.

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| N_filtré = COUNT(résultats ∧ filtres) | Affiché dans « Voir les N résultats » ; N = 0 ⇒ option grisée. |
| compteur(option) = COUNT(résultats ∧ filtres actifs ∧ option) | Familles cumulées (ET) ; options de livrabilité cumulées (ET) ; marques alternatives (OU) : le compteur d’une marque ignore la marque déjà choisie. |
| Retirable à mon relais ⇔ classe ∈ {S, M, L} | XL et hors gabarit exclus ; « Retrait possible aujourd’hui » exige en plus le stock et une tournée avant la fermeture du relais. |

**Paramètres** : `RECH-FAMILLES`

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `GET /search?q=&filters=&relais=&tri=&cursor=`

<a id="relais-selecteur"></a>
### `#relais-selecteur` — Relais de la recherche

CL-05 · lancement · onglet accueil · menu : Acheter › Relais de la recherche

**Documentation** : décrite dans CL-05

**Sections** : CL-05 « Sélecteur de relais »

**Voir aussi, règles transverses** : « Moteur, attribution et classement » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#relais-selecteur?q=chargeur+tecno` Résultats · puce relais, choisir le relais

**Captures** : CL-05 fig. 7 `Relais_selecteur`

**Règles côté serveur et écran** (3) : CRE-18 Le sélecteur reprend le relais habituel et propose les relais ouverts et non saturés, du… *(calcul)* · CRE-19 Toutes les distances et la livrabilité sont recalculées depuis le relais choisi : changer… *(calcul)* · CRE-20 Le relais choisi devient le relais habituel (même effet que le choix du relais, 3.4 : PUT…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| relais proposés = relais ouverts ∧ non saturés, triés par distance ↑ | Depuis la position ou l’adresse du client (3.4) ; relais « En configuration », saturé ou fermé aujourd’hui : absent. Un seul relais par zone au lancement (RELAIS-PAR-ZONE). |
| distance = ST_Distance(vendeur, relais_sélectionné) | Géodésique, en km, arrondie à 0,1. Recalculée si le relais change. |
| retirable_aujourd’hui ⇔ t_prêt + t_tournée ≤ fermeture_relais(aujourd’hui) ∧ classe ≤ L | Estimation serveur ; filtre et puce utilisent la même règle. Relais fermé ce jour-là : faux pour tous les produits. |

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `GET /relais?near=lat,lng · ?q= · &open_today=1&not_full=1`

<a id="fiche"></a>
### `#fiche` — Fiche produit

CL-06 · lancement · onglet accueil · menu : Acheter › Fiche produit

**Documentation** : décrite dans CL-06

**Sections** : CL-06 « Écran « Fiche produit » — haut de fiche » ; CL-06 « Fiche produit — variantes, stock et quantité » ; CL-06 « Fiche produit — livraison, prix livré et classes de colis » ; CL-06 « Fiche produit — garanties, onglets, rangées et barre d’achat » ; CL-06 « Fiche produit — après le lancement (interrupteurs fermés) »

**Voir aussi, règles transverses** : « Description et publication de la fiche (6.3) » ; « Pour le développeur : API, événements, paramètres, erreurs »

**États** : `#fiche?p=camon30` Fiche produit · page entière (Tecno Camon 30) · `#fiche?p=galaxya15&vue=title` Fiche · remise réelle, prix barré · `#fiche?p=camon30&v=noir-128&vue=title` Fiche · variante choisie, autre vendeur · `#fiche?p=camon30&st=alerte&al=vert` Fiche · variante en rupture, « Préviens-moi » · `#fiche?p=camon30&st=alerte-ok&al=vert` Fiche · alerte de retour enregistrée · `#fiche?p=pagne&q=6&vue=act` Fiche · quantité bornée au stock · `#fiche?p=robewax&vue=title` Fiche · taille en rupture partout · `#fiche?p=ferceram&vue=title` Fiche · aucune offre en stock · `#fiche?p=pagne` Fiche · retrait payant (+ 900 F) · `#fiche?p=ventilo` Fiche · colis L, supplément · `#fiche?p=tv43&vue=liv` Fiche · colis XL, livraison à domicile seule · `#fiche?p=camon30&st=relais-plein` Fiche · relais plein aujourd’hui · `#fiche?p=camon30&t=spec&st=barre` Fiche · barre d’achat collante en défilant · `#fiche?p=camon30&st=lent` Fiche · connexion lente · `#fiche?p=camon30&st=apres` Fiche · blocs après le lancement, à leur place

**Captures** : CL-06 fig. 1 `Fiche` · CL-06 fig. 2 `Fiche_remise` · CL-06 fig. 3 `Fiche_variante` · CL-06 fig. 4 `Fiche_alerte` · CL-06 fig. 5 `Fiche_alerte_ok` · CL-06 fig. 6 `Fiche_stock` · CL-06 fig. 7 `Fiche_taille` · CL-06 fig. 8 `Fiche_sans_offre` · CL-06 fig. 9 `Fiche_relais_paye` · CL-06 fig. 10 `Fiche_colis_L` · CL-06 fig. 11 `Fiche_XL` · CL-06 fig. 12 `Fiche_relais_plein` · CL-06 fig. 13 `Fiche_barre` · CL-06 fig. 14 `Fiche_lent` · CL-06 fig. 22 `Fiche_apres`

**Règles côté serveur** (5) : CVA-02 Choisir une variante met à jour, sans recharger, le prix, le stock, les photos P1–P4 et… · CVA-10 Modèle : un produit maître, ses variantes (identifiant, attributs, photos) et les offres… · CFP-15 Total des articles recalculé à chaque changement, et prix livré avec lui : à 2 pagnes (37… *(calcul)* · CFP-23 Seuils calculés sur le sous-total produits ; tarifs et seuils lus dans les paramètres… *(calcul)* · CFP-51 Vente flash (FF-FLASH) : sous le prix, un vrai compte à rebours jusqu’à la fin réelle de… *(calcul)*

**Règles côté serveur et écran** (25) : CFP-01 Le client choisit un produit, jamais un vendeur : la fiche montre un produit maître et… *(calcul)* · CFP-03 Trois badges, chacun un fait vrai : « Certifié BelivaY » (vendeur vérifié), « Escrow »… *(calcul)* · CFP-09 Le prix livré se calcule sur prix × quantité, affiche le total livré quand le retrait est… *(calcul)* · CFP-10 Prix, prix livré, variantes et stock en haut ; quantité, total et actions sous la carte… *(calcul)* · CFP-11 Bloc vendeur : « Vendeur certifié [palier] · Trust Score », ce qui est vérifié (identité,… · CFP-12 Le Trust Score est expliqué une fois (« sa note de fiabilité sur 100, calculée par… · CFP-13 Distance affichée depuis le relais habituel du client, la même qu’en recherche et dans le… · CVA-05 La fiche s’ouvre sur la variante choisie dans la recherche ou la carte ; à défaut, sur la… · CVA-06 Variante en rupture chez tous les vendeurs : visible, grisée, barrée, non sélectionnable,… · CVA-07 L’alerte porte sur la variante précise (couleur et capacité), jamais sur le produit… · CVA-12 La variante suit tout le parcours : carte = prix livré de la variante la moins chère, « à… *(calcul)* · CVA-14 Le cœur ajoute aux favoris la variante précise ; les favoris alimentent les alertes de… · CFP-14 Quantité bornée par le stock de l’offre attribuée ; au-delà, bascule sur une seconde… *(calcul)* · CFP-16 Stock : « En stock · 23 disponibles » avec une jauge, valeur réelle, sans pression… · CFP-17 Jauge à échelle fixe : pleine à 50 unités (paramètre d’affichage), jamais relative à un «… · CFP-58 Aucune offre en stock, toutes variantes confondues : dernier prix pratiqué sans prix… · CFP-20 Les deux modes affichent délai, tarif, seuil et supplément de classe. · CFP-22 Livraison à domicile avec son délai et son tarif : « 1 500 F — offert dès 50 000 F ». · CFP-26 Un délai est une heure ou une date ferme (« aujourd’hui dès 15 h », « aujourd’hui avant… *(calcul)* · CFP-27 Le délai de préparation de l’offre attribuée est dit une fois (« Préparé par le vendeur… *(calcul)* · CFP-30 Le plafond de valeur des transporteurs (75 000 F Nouveau, 250 000 F Confirmé) n’a aucun… *(calcul)* · CFP-31 Quatre tuiles : paiement sécurisé, escrow (« Argent protégé » : ton argent reste bloqué… *(calcul)* · CFP-37 Barre d’achat collante : trois actions au maximum — cœur, « Ajouter », « Acheter » ; elle… *(calcul)* · CFP-38 Quand la barre est visible, elle remplace le dock ; le bouton principal porte le total («… *(calcul)* · CFP-52 Mettre de côté (FF-EX03) : proposé sous les boutons d’achat pour un article de 20 000 F… *(calcul)* *(Proposé)*

**Règles côté écran** (26) : CFP-02 Fil d’Ariane cliquable vers le listing unique : univers › sous-catégorie (« Téléphones &… · CFP-04 Prix unitaire en grand ; prix barré et remise seulement si la remise est réelle en base. · CFP-05 Sous un prix barré, une ligne dit ce qu’il est : « 99 900 F : prix réellement pratiqué… · CFP-06 Note, nombre d’avis vérifiés et ventes cumulés sur tout le produit maître, valeurs… · CFP-07 Produit sans avis : « Pas encore d’avis » (et « Nouveau au catalogue »), jamais « ★ 0,0… · CFP-08 Prix livré affiché tôt, juste sous le prix : « 150 699 F · retrait offert à ton relais »… · CFP-59 Un lien vers un produit inconnu ou retiré ouvre « Ce produit n’est pas au catalogue » et… · CVA-01 Une ligne par type de variante déclaré (Couleur, Capacité, Taille), en puces. · CVA-03 Quand l’offre attribuée change avec la variante, un encadré le dit (« l’offre vient d’un… · CVA-04 Les puces de capacité affichent leur prix (« 128 Go · 139 000 F », « 256 Go · 150 699 F… · CVA-13 Variation de prix entre l’ajout et le paiement : le prix payé est celui du paiement ; une… · CFP-18 Trois actions : cœur (dans l’image), « Ajouter au panier » (orange doux), « Acheter… · CFP-19 « Tu en as déjà 1 dans ton panier » quand la variante choisie est déjà au panier (Camon… · CFP-21 Retrait au relais habituel du client (« Relais Mvog-Ada ») avec sa date et son tarif : «… · CFP-24 Colis M ou L : le supplément de classe est affiché dès la fiche, avec les mêmes mots que… · CFP-25 Colis XL ou hors gabarit : seule la ligne domicile s’affiche, avec « trop volumineux pour… · CFP-28 Relais saturé ou fermé : la date bascule au jour suivant, avec « Plein aujourd’hui » et… · CFP-29 Supplément de classe XL : absent du registre ; le prototype affiche 1 500 F sur la… *(À trancher)* · CFP-32 Onglets Description, Spécifications, Avis ; les avis sont cumulés sur le produit maître. · CFP-33 L’onglet Spécifications reprend la variante choisie et la classe de colis (« S (petit… · CFP-34 La description est en français, avec les mots du vendeur : contrôlé à la publication… · CFP-35 « Similaires » et « Souvent achetés ensemble » sous le bloc d’achat, jamais à côté du… · CFP-36 « Poser une question au vendeur » ouvre la messagerie interne (écran question). · CFP-39 Partager un article (bouton de l’en-tête) : partage natif pour demander un avis avant… · CFP-40 Pas de bouton flottant (assistant, retour en haut) sur la fiche. · CFP-53 Reprise et troc (FF-EX04) : proposé sur un téléphone neuf ; seule une fourchette est… *(Proposé)*

**Règles non classées** (4) : CVA-08 Pas de sélecteur si le produit n’a pas de variantes (pagne, ventilateur, téléviseur). · CVA-09 Au lancement, la plupart des fiches sont simples : le sélecteur n’est pas obligatoire à… · CVA-11 Le panier, la commande, l’application vendeur et les alertes utilisent toujours… · CFP-54 Encart d’abonnement (FF-ABONNEMENT) : masqué jusqu’à l’activation du module ; ensuite,…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| remise % = arrondi((P_barré − P) ÷ P_barré × 100) | Absente si P_barré ≤ P. Galaxy A15 : (99 900 − 89 900) ÷ 99 900 = 10,0 % ⇒ « −10 % ». Exemple de la spec : 168 000 → 150 699 = −10 %. |
| note = moyenne(notes vérifiées du maître), 1 décimale | 590 ÷ 128 = 4,61 ⇒ « 4,6 · 128 avis vérifiés ». Cumulée sur tous les vendeurs du produit. |
| vendus = commandes retirées réelles du maître | « 412 vendus » (jeu d’essai ; la spec cite « 312 vendus » comme exemple). |
| prix_livré(relais) = P × q + (P × q ≥ 30 000 ? 0 : 900) + suppl(classe) | Calculé par le service de tarification ; 150 699 ⇒ offert ; 18 500 ⇒ 19 400 F ; ventilateur 24 500 + 900 + 300 = 25 700 F. |
| offre = argmin(prix + livraison réelle jusqu’au relais du client) | Trust Score en départage ; jamais affichée comme un choix. |

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| total = P(v) × q, 1 ≤ q ≤ dispo(offres de v) | Boutons grisés aux bornes ; recalcul à chaque changement : 6 × 18 500 = 111 000 F ; 2 × 150 699 = 301 398 F. |
| rupture_partout(o) ⇔ ∀ variante v contenant o : stock(v) = 0 | Vert émeraude : 128 Go 0 et 256 Go 0 ⇒ visible, grisée, barrée, non sélectionnable. |
| jauge = min(stock ÷ 50, 1) | 23 ⇒ 46 % ; 6 ⇒ 12 % ; jamais de couleur d’alerte (pas de pression artificielle). |
| changer de variante ⇒ prix, stock, photos, offre attribuée, q = 1 | Sans recharger la page ; une seule requête à l’API de la fiche avec la variante. |

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| LB(relais) = R + Rem_relais = 500 + 400 = 900 F | Tarif de base affiché, calculé par le service du panier (chapitre 7). |
| LB(domicile) = R + Rem_dom = 500 + 1 000 = 1 500 F | Offert dès 50 000 F de sous-total produits. |
| offert(mode) ⇔ sous-total produits ≥ seuil(mode) | 30 000 F relais, 50 000 F domicile ; sous-total = prix × quantité sur la fiche, tout le panier au panier. |
| supplément(classe) = tarif(classe) − tarif(S) | Affiché dès la fiche pour M et L (200 F et 300 F proposés) ; la livraison offerte ne couvre que le tarif S. XL : 1 500 F proposé par le prototype. |
| date_retrait = prochaine tournée utile du relais ouvert et non plein | Relais plein aujourd’hui ⇒ « demain ven. 25 sept. dès 9 h » ; fermé (dimanche) ⇒ premier jour d’ouverture. |
| relais : prêt (maintenant + préparation) + 45 min de tournée ; domicile : prêt + 2 h 45 ; aujourd’hui si avant la fermeture (19 h), sinon demain | 10 h 15 + 4 h ⇒ « aujourd’hui dès 15 h » / « aujourd’hui avant 17 h » ; + 6 h (Mvan) ⇒ « dès 17 h » / « avant 19 h » ; + 24 h (batterie) ⇒ « demain ven. 25 sept. dès 11 h » / « avant 13 h » ; colis XL ⇒ « demain ven. 25 sept. avant 12 h ». Sous SLA-ZONE-H ; le transporteur autorisé selon la valeur (CFP-30) est choisi par le service logistique. |

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| barre visible ⇔ bas du bloc quantité et actions au-dessus du haut de la zone visible | Observateur d’intersection sur le bloc ; seuil 0 ; tester sur Android et iOS. |
| libellé = « Acheter · » + total des articles | « Acheter · 150 699 F » ; suit la quantité (2 articles : « Acheter · 301 398 F »). |

**Paramètres** : `LIV-RELAIS-BASE`, `LIV-DOM-BASE`, `LIV-SEUIL-RELAIS`, `LIV-SEUIL-DOM`, `LIV-OFFERT-CLASSE`, `LIV-SUPPL-M / L`, `LIV-SUPPL-XL`, `LIV-XL-RELAIS`, `SLA-ZONE-H`, `SLA-PREP`, `FF-FLASH`, `FF-EX03`, `FF-EX04`, `FF-ABONNEMENT`, `FLASH-DUREE-MAX`, `FLASH-REMISE-MIN`, `MDC-ACOMPTE`, `MDC-DUREE`, `MDC-PRIX-MIN`

**États et erreurs** : 12 cas (détail dans `pages.json`)

**API** : `GET /products/{maitre}?relais=&variante=&q=` · `POST /me/alerts` · `POST /cart/lines`

<a id="galerie"></a>
### `#galerie` — Galerie photo

CL-06 · lancement · onglet accueil · menu : Acheter › Galerie photo

**Documentation** : décrite dans CL-06

**Sections** : CL-06 « Écran « Galerie » — photos du vendeur et photos d’acheteurs »

**Voir aussi, règles transverses** : « Description et publication de la fiche (6.3) » ; « Pour le développeur : API, événements, paramètres, erreurs »

**États** : `#galerie?p=camon30&i=1` Fiche · galerie plein écran, photo du vendeur · `#galerie?p=camon30&i=6` Galerie · photo d’acheteur

**Captures** : CL-06 fig. 15 `Galerie` · CL-06 fig. 16 `Galerie_acheteur`

**Règles côté serveur et écran** (1) : CFP-43 Photos produit : fond uniforme sombre, sans ombre dure, sans texte ni filigrane, un… *(calcul)*

**Règles côté écran** (3) : CFP-42 Photos réelles des avis ajoutées en fin de galerie, marquées « photo d’acheteur », avec… · CFP-44 Galerie sur fond nuit, fermeture en haut à gauche, compteur « 1 / 7 » ; les photos P1–P4… · CFP-45 Chargement progressif et images compressées ; mode « données économes » : vignettes au…

**Règles non classées** (1) : CFP-41 Galerie P1 à P4 (face, dos, trois-quarts, détail) : un tap sur une vignette change…

**API** : `GET /products/{maitre}?relais=&variante=&q=`

<a id="avis"></a>
### `#avis` — Avis

CL-06 · lancement · onglet accueil · menu : Acheter › Lire les avis

**Documentation** : décrite dans CL-06

**Sections** : CL-06 « Écran « Lire les avis » (14.2) »

**Voir aussi, règles transverses** : « Description et publication de la fiche (6.3) » ; « Pour le développeur : API, événements, paramètres, erreurs »

**États** : `#avis?p=camon30` Fiche · « 128 avis vérifiés », lire les avis · `#avis?p=ecouteurs` Avis · produit retiré, « Donner mon avis » · `#avis?p=coque30` Avis · produit sans avis (coque, nouveau)

**Captures** : CL-06 fig. 17 `Avis` · CL-06 fig. 18 `Avis_eligible` · CL-06 fig. 19 `Avis_vide`

**Règles côté serveur** (1) : CLA-10 Modération : suppression seulement pour insultes, coordonnées ou hors sujet, motif tracé…

**Règles côté écran** (9) : CLA-01 Onglet Avis de la fiche et écran « Avis » : note moyenne, nombre d’avis, répartition,… · CLA-02 Avis cumulés sur le produit maître, quel que soit le vendeur attribué : un nouveau… · CLA-03 Chaque avis : note, date, commentaire et photo éventuels, avec la pastille « Acheteur… · CLA-04 Aucun avis sans commande payée et retirée ; « Donner mon avis » n’existe que pour un… · CLA-05 Photos réelles des avis mises en avant : rangée « Photos d’acheteurs » en tête de… · CLA-06 Jamais le nom de la boutique dans un avis ; côté client, la note « boutique » est celle… · CLA-07 Chaque avis dit la variante achetée (« Noir · 128 Go ») : les avis sont cumulés, le… · CLA-09 Produit sans avis : « Pas encore d’avis », pourquoi, et l’action suivante (« Poser une… · CLA-11 Tri « Les plus récents » et pagination par curseur (« Voir la suite · 123 avis ») ; les…

**Règles non classées** (1) : CLA-08 La borne basse de Wilson sert au Trust Score et au départage de l’attribution, jamais à…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| note_affichée(maître) = moyenne(notes vendeur de tous les vendeurs du maître), 1 décimale | (5 × 92 + 4 × 27 + 3 × 5 + 2 × 3 + 1) ÷ 128 = 590 ÷ 128 = 4,61 ⇒ 4,6. |
| répartition(k) = COUNT(note = k) ÷ n, arrondie à l’unité | 92/128 = 71,9 ⇒ 72 % ; 27/128 ⇒ 21 % ; 5/128 ⇒ 4 % ; 3/128 ⇒ 2 % ; 1/128 ⇒ 1 %. |
| étoiles remplies = moyenne ÷ 5 | 4,6 ⇒ 92 % de la rangée d’étoiles. |
| peut_noter ⇔ payée ∧ retirée ∧ t_now ≤ t_retrait + fenêtre | Écouteurs : retirés sam. 19 sept., fenêtre 7 j proposée ⇒ jusqu’au sam. 26 sept. |
| p̂ = notes ≥ 4 ÷ n ; score = borne basse de Wilson (z = 1,96) | Pour le Trust Score et le départage seulement, jamais affiché : 3 avis à 5 ★ ne passent pas devant 200 avis à 4,7. |

**Paramètres** : `AVIS-FENETRE`, `AVIS-BAS`

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `GET /products/{maitre}/reviews?cursor= · /reviews/summary`

<a id="question"></a>
### `#question` — Question au vendeur

CL-06 · lancement · onglet accueil · menu : Acheter › Question au vendeur

**Documentation** : décrite dans CL-06

**Sections** : CL-06 « Écran « Poser une question au vendeur » »

**Voir aussi, règles transverses** : « Description et publication de la fiche (6.3) » ; « Pour le développeur : API, événements, paramètres, erreurs »

**États** : `#question?p=camon30` Fiche · « Poser une question au vendeur » · `#question?p=camon30&st=masque` Question envoyée · numéro masqué

**Captures** : CL-06 fig. 20 `Question` · CL-06 fig. 21 `Question_masque`

**Règles côté serveur** (1) : CQV-08 Aucune photo ni preuve par WhatsApp : ce qui s’échange reste horodaté et stocké dans le…

**Règles côté serveur et écran** (1) : CQV-01 « Poser une question au vendeur » ouvre la messagerie interne anonymisée, jamais WhatsApp.

**Règles côté écran** (4) : CQV-02 Le client voit « le vendeur » avec son palier et son Trust Score ; le vendeur voit « Un… · CQV-03 Numéros, e-mails et identifiants sociaux masqués automatiquement, avant l’enregistrement… · CQV-05 Trois questions toutes prêtes pour le client pressé, adaptées au produit (téléphone :… · CQV-07 Un problème sur une commande passe par « Signaler un problème » (assistant de litige),…

**Règles non classées** (2) : CQV-04 La question porte sur l’offre attribuée de la variante choisie : produit, variante et… · CQV-06 Fil tracé et gratuit ; la réponse arrive par notification et se retrouve dans la…

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `POST /messages/threads`

<a id="panier"></a>
### `#panier` — Panier

CL-07 · lancement · onglet panier · menu : Acheter › Panier

**Documentation** : décrite dans CL-07

**Sections** : CL-07 « Écran « Panier » — structure » ; CL-07 « Bas du panier — conseil, récapitulatif, paiement » ; CL-07 « Le moteur de calcul des frais » ; CL-07 « Gestes utiles et actions » ; CL-07 « États du panier »

**Voir aussi, règles transverses** : « Pour le développeur — API, événements, erreurs, paramètres »

**États** : `#panier` Panier · référence 272 579 F (3 boutiques, 4 articles) · `#panier?st=seuil` Panier · seuil de livraison offerte non atteint · `#panier?st=comptoir` Panier · paiement au comptoir proposé · `#panier?st=conseil` Panier · offre changée (même produit, zone du trajet) · `#panier?suppr=camon30` Panier · article retiré, trajet partagé perdu · `#panier?st=glisser` Panier · balayage d’un article · `#panier?st=partage` Panier · envoyer au payeur à l’étranger · `#panier?st=une` Panier · une seule boutique · `#panier?st=xl` Panier · colis XL livré à domicile · `#panier?st=retire` Panier · article retiré par le serveur · `#panier?prix=hausse` Panier · un prix a augmenté (Passer commande → contrôle des prix) · `#panier?st=horsligne` Panier · hors ligne · `#panier?st=invite&feuille=1` Panier · visiteur, connexion pour payer · `#panier?st=vide` Panier · vide

**Captures** : CL-07 fig. 1 `Panier` · CL-07 fig. 2 `Panier_seuil` · CL-07 fig. 3 `Panier_comptoir` · CL-07 fig. 4 `Panier_conseil` · CL-07 fig. 5 `Panier_trajetperdu` · CL-07 fig. 6 `Panier_glisser` · CL-07 fig. 8 `Panier_partage` · CL-07 fig. 9 `Panier_uneboutique` · CL-07 fig. 10 `Panier_xl` · CL-07 fig. 11 `Panier_retireserveur` · CL-07 fig. 12 `Panier_horsligne` · CL-07 fig. 13 `Panier_invite` · CL-07 fig. 14 `Panier_vide`

**Règles côté serveur** (14) : CFR-01 Un seul service serveur (tarification) recalcule le panier depuis zéro à chaque… · CFR-02 S = Σ P(v) × q, au prix actuel de l’offre attribuée ; base de tous les seuils, jamais… *(calcul)* · CFR-03 Ram = Σ_zones [ R + (n_z − 1) × R′ ] : une boutique au plein tarif par zone, les… *(calcul)* · CFR-04 R = 500 F ; δ = 24 % ; R′ = R × (1 − δ) = 380 F. *(calcul)* · CFR-05 Rem = Rem_relais (400 F) ou Rem_dom (1 000 F) selon le mode de remise. *(calcul)* · CFR-06 S ≥ Seuil(mode) ⇒ Off = R + Rem, sinon 0 : la livraison offerte couvre un ramassage plein… *(calcul)* · CFR-10 Reste_ramassages = Ram − (Off > 0 ? *(calcul)* · CFR-11 Progression = min(S / Seuil, 1) ; sous le seuil, X = Seuil − S. *(calcul)* · CFR-14 Seuils : offert dès 30 000 F en relais, 50 000 F à domicile, sur le sous-total produits… *(calcul)* · CFR-15 Remboursement partiel : Off inchangé ; repasser sous le seuil ne refacture jamais la… · CFR-17 À S = 29 999 F rien n’est offert ; à S = 30 000 F, R + Rem_relais sont offerts. *(calcul)* · CFR-22 Le prix payé est celui du moment du paiement : au clic, Δ = M_serveur − M_affiché ; Δ < 0… *(calcul)* · CFR-23 Tout montant renvoyé vient du service de tarification ; aucune réponse ne contient ce que… · CFR-25 Les formules retrouvent l’exemple au franc près : 272 579 F, 900 F d’économie, 880 F de…

**Règles côté serveur et écran** (49) : CPN-01 Ordre imposé de haut en bas : bandeau de réassurance ; titre et bouton de partage ;… · CPN-02 Bandeau fixe, texte exact : « Paiement sécurisé via MoMo · Escrow BelivaY ». · CPN-03 Titre « Mon panier · N articles » (N = somme des quantités ; « 1 article ») ; à droite,… *(calcul)* · CPN-05 Une section par boutique, générée automatiquement par le serveur : une carte distincte,… · CPN-06 En-tête de section : libellé neutre « Boutique A », pastille « Colis 1 », zone et délai «… *(calcul)* · CPN-07 Lettres, couleurs et numéros de colis suivent l’ordre des collectes fixé par le serveur… · CPN-08 Boutique d’une autre zone que le relais : sous-titre ambre « Mvan · zone différente ·… *(calcul)* · CPN-09 Le client ne voit jamais le nom, la page, l’adresse ni le numéro d’une boutique, ni à… · CPN-10 Ligne d’article : image, nom, variante en clair (« Gris titane · 256 Go »), prix de la… *(calcul)* · CPN-11 Sous les lignes : « Ajouter de cette boutique — sans ramassage en plus », deux produits… *(calcul)* · CPN-13 Conseil d’offre dans la section de la boutique hors zone, texte exact : « Ce produit… · CPN-14 « Changer d’offre » remplace l’offre sans changer le produit (même variante, même… · CPN-15 Après « Changer d’offre », un encadré vert confirme avec le gain recalculé : « Offre… · CPN-16 Pied de section : « Sous-total boutique » et « livraison calculée ci-dessous ». *(calcul)* · CPN-20 En haut du bas de panier, un encart calcule le geste le plus rentable à cet instant. · CPN-22 Barre de progression min(S / Seuil, 1), légende « 271 699 F d’articles · seuil 30 000 F… *(calcul)* · CPN-23 Récapitulatif, dans cet ordre : 1. *(calcul)* · CPN-24 Libellé d’une ligne de ramassage : barré et « offert » pour le ramassage plein tarif… *(calcul)* · CPN-26 Moyens acceptés, dans la carte du récapitulatif : pastilles MTN, Orange, VISA, Mastercard… *(calcul)* · CPN-27 Section « Sauvegardés » sous le récapitulatif : même liste que les favoris (CSG-01), prix… · CPN-28 Carte « Escrow BelivaY » : « Le vendeur n’est payé qu’après ton retrait au Relais… · CPN-29 Un seul bouton plein sur l’écran, avec le total exact : « Passer commande · 272 579 F ». *(calcul)* · CPN-30 Juste sous le bouton, obligatoire : « Ton argent reste bloqué jusqu’à ton retrait. *(calcul)* · CPN-31 Les délais affichés sont les vrais délais calculés par le serveur, jamais une fourchette. · CPN-32 Calcul : « prêts sous N h » = préparation la plus longue du panier (les colis se retirent… *(calcul)* · CPN-33 Destination de « Passer commande » : visiteur → connexion (CL-03 ; la connexion n’est… *(calcul)* · CPN-34 « Payer au comptoir du relais » (bouton clair, sous la phrase de protection) n’apparaît… *(calcul)* · CPN-37 Sous le bouton comptoir : « 900 F de livraison maintenant, 18 500 F au retrait en Mobile… *(calcul)* · CPN-39 Tout encart d’abonnement (« Avec Prime… ») est masqué au lancement (FF-ABONNEMENT fermé),… · CFR-07 Total = S + Ram + Rem + Σ suppl_classe − Off : le montant affiché est celui envoyé à… *(calcul)* · CFR-09 Économie = Off = somme des montants barrés « offert » ; jamais une estimation. *(calcul)* · CFR-12 Gain_conseil = Total − Total_simulé, par recalcul complet du panier modifié ; conseil… *(calcul)* · CFR-13 Livraison de base relais = 900 F = ramassage 500 F + remise 400 F (décision du 22 sept.)… *(calcul)* · CFR-18 Suppléments de classe M et L : ajoutés au total, jamais offerts, affichés dès la fiche… *(calcul)* *(À trancher)* · CFR-19 XL et hors gabarit ne vont jamais en relais : leur présence bascule le mode en domicile ;… *(calcul)* *(À trancher)* · CFR-21 Chaque ligne porte l’offre attribuée (coût total livré le plus bas pour ce client, panier… *(calcul)* · CFR-26 Aucune réservation de stock à l’ajout au panier : le stock se réserve au clic sur «… · CPN-42 Balayage vers la gauche sur une ligne : « Sauvegarder » d’abord, « Supprimer » ensuite. *(calcul)* · CPN-44 Retrait (« Supprimer », corbeille) qui vide une section et casse un trajet partagé :… *(calcul)* · CPN-45 Un retrait qui ne casse aucun trajet (autre article dans la même section, boutique seule… *(calcul)* · CPN-46 Partager le panier : un lien vers la page du payeur (CL-12) part par la feuille de… · CPN-47 10.6 interdit « commande, panier … transmis par WhatsApp » alors que 7.4 prévoit l’envoi… · CPN-48 La feuille dit ce que vivra le payeur : carte Visa ou Mastercard avec 3-D Secure ; 2 % de… *(calcul)* · CPN-52 Colis XL ou hors gabarit en mode relais : bascule obligatoire à domicile (Rem_dom, seuil… · CPN-53 Produit désactivé ou supprimé : retiré du panier par le serveur avec un message visible… *(calcul)* · CPN-54 Variante épuisée chez tous les vendeurs : la ligne reste visible, grisée, avec l’alerte… · CPN-55 Hors ligne : bannière « Hors ligne », panier du dernier calcul, modifications, partage,… · CPN-56 Le badge de l’onglet Panier compte les articles (somme des quantités) ; il disparaît… *(calcul)* · CPN-57 Après un paiement non abouti ou abandonné, « Retour au panier » retrouve le panier…

**Règles côté écran** (16) : CPN-04 Encart diaspora, texte exact : « Quelqu’un paie pour toi ? · CPN-12 Une suggestion n’est jamais un produit déjà au panier ni un colis M, L, XL ou hors… · CPN-17 Sous les sections : « Tes articles arrivent en 3 colis, retirables ensemble avec un seul… · CPN-18 Variantes de la phrase : un colis, « … en 1 colis, retirable avec un seul code. · CPN-19 Pas de case à cocher par article. · CPN-21 Quand il ne reste aucun ramassage à payer : « Aucun ramassage en plus à payer. · CPN-25 « tu économises X F de livraison » n’apparaît que si Off > 0 et vaut exactement Off. · CPN-35 Sinon, bouton absent et une ligne discrète l’explique : « Paiement au comptoir non… · CPN-36 Autres motifs, dans cet ordre de priorité : « … gros colis livré à domicile. · CPN-38 Panier éligible dont la livraison due est de 0 F (au-delà de 30 000 F avec un seul… · CPN-41 Au pied du paiement, lien « Conditions de vente et de paiement » vers les pages légales… · CFR-08 Le ramassage « offert » est le premier ramassage plein tarif dans l’ordre des collectes… · CFR-20 Domicile : livraison individuelle au lancement (LIV-GROUPE-DOM). *(À trancher)* · CPN-43 Le geste a toujours un équivalent visible : les icônes signet (« Sauvegarder ») et… · CPN-49 Partager un article, pour demander un avis avant d’acheter : lien de la fiche par le… · CPN-50 Panier vide : « Ton panier est vide », ce qu’on y trouve et « Découvrir les produits » ;…

**Règles non classées** (4) : CPN-40 Le panier ne produit pas de facture : le reçu se partage sur la confirmation. · CFR-16 Deux boutiques de zones différentes paient chacune R ; deux de la même zone paient R + R′. · CFR-24 BelivaY ne vend jamais à perte : la remise de 400 F couvre le relais (200 F par petit… · CPN-51 Visiteur : on remplit son panier sans compte ; la connexion n’est demandée qu’au paiement…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| S = Σ P(v) × q | Sous-total produits, prix actuel de l’offre attribuée. Base de tous les seuils, jamais frais inclus. |
| Ram = Σ_zones [ R + (n_z − 1) × R′ ] | Une boutique au plein tarif par zone, les suivantes au tarif réduit. Ordre des collectes fixé par le système. |
| Rem = Rem_relais ou Rem_dom | Selon le mode de remise. |
| S ≥ Seuil(mode) ⇒ Off = R + Rem, sinon 0 | Livraison de base offerte = un ramassage plein tarif + la remise, au tarif d’un colis S. Les autres ramassages et les suppléments de classe restent facturés. |
| Total = S + Ram + Rem + Σ suppl_classe − Off | Montant affiché et envoyé à l’agrégateur (M, 8.6). |
| Économie = Off | Somme des montants barrés « offert ». Jamais une estimation. |
| Reste_ramassages = Ram − (Off > 0 ? R : 0) | « Il te reste 880 F de ramassages ». |
| Progression = min(S / Seuil, 1) | Si S < Seuil : « Ajoute X F », X = Seuil − S. |
| Gain_conseil = Total − Total_simulé | Recalcul complet du panier modifié ; conseil affiché seulement si Gain > 0. |
| Remboursement partiel : Off inchangé | Repasser sous le seuil ne refacture jamais la livraison. |
| Comptoir : maintenant = Total − S ; au retrait = S | La livraison se paie d’avance, les articles au retrait (8.5). Exemple : 900 F + 18 500 F. |
| prêt_panier = max(prêt_boutique) ; retrait = t_now + prêt_panier + course | 6 h ⇒ dès 17 h ; 4 h ⇒ dès 15 h (CPN-32). |

**Paramètres** : `PAY-CPT-NOUV`, `PAY-CPT-STD`, `PAY-CPT-FID`, `PAY-CPT-REFUS`, `PAY-CARTE-FRAIS`, `SLA-ZONE-H`, `SLA-PREP`, `FF-ABONNEMENT`, `LIV-R`, `LIV-DELTA`, `LIV-REM-RELAIS`, `LIV-REM-DOM`, `LIV-RELAIS-BASE`, `LIV-DOM-BASE`, `LIV-SEUIL-RELAIS`, `LIV-SEUIL-DOM`, `LIV-OFFERT-CLASSE`, `LIV-SUPPL-M / L`, `LIV-SUPPL-XL`, `LIV-XL-RELAIS`, `LIV-POIDS-VOL`, `LIV-GROUPE-DOM`

**États et erreurs** : 15 cas (détail dans `pages.json`)

**API** : `GET /cart?mode=&relais=` · `POST /cart/lines` · `PATCH · DELETE /cart/lines/{id}` · `POST /cart/lines/{id}/save · /cart/lines/{id}/swap-offer` · `POST /cart/lines/{id}/save · /cart/lines/{id}/swap-offer` · `GET /cart/eligibility/counter` · `POST /carts/{id}/share`

<a id="panier-retrait"></a>
### `#panier-retrait` — Retirer un article

CL-07 · lancement · onglet panier · menu : Acheter › Panier · retrait qui casse un trajet

**Documentation** : décrite dans CL-07

**Sections** : CL-07 « Gestes utiles et actions »

**Voir aussi, règles transverses** : « Pour le développeur — API, événements, erreurs, paramètres »

**États** : `#panier-retrait?p=camon30` Panier · retrait qui casse un trajet (avertissement)

**Captures** : CL-07 fig. 7 `Panier_avertissement`

**Règles côté serveur et écran** (6) : CPN-42 Balayage vers la gauche sur une ligne : « Sauvegarder » d’abord, « Supprimer » ensuite. *(calcul)* · CPN-44 Retrait (« Supprimer », corbeille) qui vide une section et casse un trajet partagé :… *(calcul)* · CPN-45 Un retrait qui ne casse aucun trajet (autre article dans la même section, boutique seule… *(calcul)* · CPN-46 Partager le panier : un lien vers la page du payeur (CL-12) part par la feuille de… · CPN-47 10.6 interdit « commande, panier … transmis par WhatsApp » alors que 7.4 prévoit l’envoi… · CPN-48 La feuille dit ce que vivra le payeur : carte Visa ou Mastercard avec 3-D Secure ; 2 % de… *(calcul)*

**Règles côté écran** (2) : CPN-43 Le geste a toujours un équivalent visible : les icônes signet (« Sauvegarder ») et… · CPN-49 Partager un article, pour demander un avis avant d’acheter : lien de la fiche par le…

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `PATCH · DELETE /cart/lines/{id}`

<a id="sauvegardes"></a>
### `#sauvegardes` — Sauvegardés

CL-07 · lancement · onglet sauvegardes · menu : Mon compte › Sauvegardés et favoris

**Documentation** : décrite dans CL-07

**Sections** : CL-07 « Écran « Sauvegardés et favoris » »

**Voir aussi, règles transverses** : « Pour le développeur — API, événements, erreurs, paramètres »

**États** : `#sauvegardes` Sauvegardés · onglet, 2 articles avec alertes · `#sauvegardes?st=rupture` Sauvegardés · variante épuisée partout · `#sauvegardes?st=vide` Sauvegardés · vide

**Captures** : CL-07 fig. 15 `Sauvegardes` · CL-07 fig. 16 `Sauvegardes_rupture` · CL-07 fig. 17 `Sauvegardes_vide`

**Règles côté serveur** (2) : CSG-05 Alertes baisse de prix et retour en stock sur chaque article sauvegardé : push gratuit,… · CSG-06 Ces pushs sont non critiques : 5 au plus par 24 h (PUSH-MAX-24H), jamais de 21 h à 7 h… *(calcul)*

**Règles côté serveur et écran** (8) : CSG-01 Favoris = une seule liste (décision du 21 sept.) : la section « Sauvegardés » du panier,… *(calcul)* · CSG-02 Sauvegarder depuis le panier sort l’article du total (recalcul complet) ; « Remettre » le… *(calcul)* · CSG-03 Contenu d’un article : photo, variante, prix livré à jour, disponibilité réelle. *(calcul)* · CSG-07 Variante épuisée partout : carte visible, vignette grisée, variante barrée, « Épuisé… · CSG-08 Retour en stock : « de retour en stock » en vert, « Remettre au panier » actif ; la… · CSG-09 Cœur plein = dans la liste ; toucher le cœur retire l’article, sans confirmation ni… *(calcul)* · CSG-10 « Remettre au panier » ajoute la variante sauvegardée ; l’offre est ré-attribuée côté… · CSG-14 favorite.added nourrit le rayon « favoris de retour en stock » de l’accueil et les…

**Règles côté écran** (5) : CSG-04 Baisse de prix affichée : prix actuel, prix vu à la sauvegarde barré, « prix baissé de 2… · CSG-11 Au lancement, pas de listes nommées, de partage de liste ni de « Tout retirer »… · CSG-12 Liste vide : « Rien de sauvegardé pour l’instant », comment la remplir (cœur, balayage)… · CSG-13 Accès : onglet Sauvegardés de la barre du bas (écran racine, sans retour), « Tout voir »… · CSG-15 Chaque article sauvegardé se partage (lien de la fiche), pour demander un avis avant…

**Paramètres** : `PUSH-MAX-24H`, `PUSH-NUIT`, `FF-LISTE-ENVIES`

**API** : `GET · POST · PATCH · DELETE /me/favorites · /me/favorites/{id}`

<a id="paiement-attente"></a>
### `#paiement-attente` — Paiement en attente

CL-08 · lancement · onglet panier · menu : Acheter › Paiement en attente

**Documentation** : décrite dans CL-08

**Sections** : CL-08 « Écran « Un prix a changé » — contrôle au clic sur « Payer » » ; CL-08 « Écran « Paiement en attente » »

**Voir aussi, règles transverses** : « Parcours « Payer » » ; « Portefeuille « Compte BelivaY » et dépôt manuel — supprimés » ; « Règles de calcul des montants » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#paiement-attente?cas=baisse` Paiement en attente · un prix a baissé, « tu gagnes 1 500 F » · `#paiement-attente` Paiement en attente · MTN MoMo, « J’ai validé sur mon téléphone » · `#paiement-attente?st=numero` Paiement en attente · numéro changé, Orange Money · `#paiement-attente?st=verif` Paiement en attente · délai écoulé, vérification · `#paiement-attente?mode=comptoir` Paiement en attente · livraison d’une commande au comptoir · `#paiement-attente?dyn=deplie` Paiement en attente · île dépliée (montant, délai)

**Captures** : CL-08 fig. 4 `Prix_baisse` · CL-08 fig. 5 `Attente` · CL-08 fig. 6 `Attente_orange` · CL-08 fig. 7 `Attente_verif` · CL-08 fig. 8 `Attente_comptoir`

**Règles côté serveur et écran** (11) : CPY-11 Δ = M_serveur − M_affiché. *(calcul)* · CPY-15 Article non réservable : bascule automatique vers le vendeur suivant du même produit au… *(calcul)* · CPY-16 La bascule au paiement suit les garde-fous de la rupture après confirmation : Trust Score… *(calcul)* · CPY-17 Produit retiré, ou article pris sans vendeur suivant : même arrêt que la hausse, avec le… *(calcul)* · CPY-22 Un statut qui se rafraîchit seul, avec le temps restant avant expiration (t_exp =… *(calcul)* · CPY-26 Seule source de vérité : le webhook de l’agrégateur, signature vérifiée. · CPY-29 La réservation du stock dure exactement le temps de cet écran (PAY-RESA = fenêtre de… *(calcul)* · CPY-30 L’écran ne passe jamais à « confirmée » sans webhook validé et escrow écrit ; webhook en… · CPY-31 À t_exp sans webhook de succès, le serveur interroge l’agrégateur avant de conclure. · CPY-32 « Annuler » annule aussi la tentative chez l’agrégateur et libère la réservation. · CPY-34 Écran sans dock ; temps restant en minutes avec l’heure d’expiration ; interrogation de…

**Règles côté écran** (13) : CPY-12 Δ < 0 : le nouveau prix s’applique et se signale comme un gain : « tu gagnes |Δ| F ». · CPY-13 La baisse et la bascule vers le vendeur suivant n’arrêtent pas le paiement : leur ligne… · CPY-18 Article pris sans vendeur suivant : il reste dans le panier (« Ton panier ne change pas :… · CPY-19 Écran d’arrêt sans dock, « ‹ Panier » en haut à gauche, une phrase « Rien n’a été demandé… · CPY-20 Affiché dès que la demande est envoyée à l’agrégateur, et tant qu’elle n’est ni validée… · CPY-21 Contenu : titre d’action « Valide la demande sur ton téléphone » ; montant exact ; numéro… · CPY-23 Bloc « Si rien ne s’affiche sur ton écran » : *126# pour MTN, #150*50# pour Orange, selon… · CPY-24 Deux boutons : « Rien reçu ? · CPY-25 En bas, la phrase de protection : « Rien n’est débité tant que tu n’as pas validé. · CPY-27 « Renvoyer la demande » : nouvelle tentative rattachée à la même commande, nouvelle clé,… · CPY-28 « Changer de numéro » : autre numéro Mobile Money choisi dans la feuille « Moyen de… · CPY-33 Numéro masqué « 6 77 ·· ·· 41 » (points médians du jeu d’essai) pour le « 6 77 41 » de la… · CPY-35 Lignes d’état en tête de l’écran pour le renvoi, le changement de numéro, le retour dans…

**Règles non classées** (1) : CPY-14 Produit désactivé ou supprimé : retiré du panier avec un message visible, jamais en…

**États et erreurs** : 14 cas (détail dans `pages.json`)

**API** : `POST /checkout` · `POST /checkout/counter` · `GET /payments/{id}` · `POST /payments/{id}/resend · /cancel · /abandon`

<a id="prix-change"></a>
### `#prix-change` — Un prix a changé

CL-08 · lancement · onglet panier · menu : Acheter › Contrôle des prix au paiement

**Documentation** : décrite dans CL-08

**Sections** : CL-08 « Écran « Un prix a changé » — contrôle au clic sur « Payer » »

**Voir aussi, règles transverses** : « Parcours « Payer » » ; « Portefeuille « Compte BelivaY » et dépôt manuel — supprimés » ; « Règles de calcul des montants » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#prix-change?st=hausse` Contrôle des prix · hausse, confirmation · `#prix-change?st=retire` Contrôle des prix · produit désactivé · `#prix-change?st=pris` Contrôle des prix · article pris, aucun autre vendeur

**Captures** : CL-08 fig. 1 `Prix_hausse` · CL-08 fig. 2 `Prix_retire` · CL-08 fig. 3 `Prix_pris`

**Règles côté serveur et écran** (4) : CPY-11 Δ = M_serveur − M_affiché. *(calcul)* · CPY-15 Article non réservable : bascule automatique vers le vendeur suivant du même produit au… *(calcul)* · CPY-16 La bascule au paiement suit les garde-fous de la rupture après confirmation : Trust Score… *(calcul)* · CPY-17 Produit retiré, ou article pris sans vendeur suivant : même arrêt que la hausse, avec le… *(calcul)*

**Règles côté écran** (4) : CPY-12 Δ < 0 : le nouveau prix s’applique et se signale comme un gain : « tu gagnes |Δ| F ». · CPY-13 La baisse et la bascule vers le vendeur suivant n’arrêtent pas le paiement : leur ligne… · CPY-18 Article pris sans vendeur suivant : il reste dans le panier (« Ton panier ne change pas :… · CPY-19 Écran d’arrêt sans dock, « ‹ Panier » en haut à gauche, une phrase « Rien n’a été demandé…

**Règles non classées** (1) : CPY-14 Produit désactivé ou supprimé : retiré du panier avec un message visible, jamais en…

**États et erreurs** : 7 cas (détail dans `pages.json`)

**API** : `POST /checkout` · `POST /checkout/confirm`

<a id="paiement-echec"></a>
### `#paiement-echec` — Paiement non abouti

CL-08 · lancement · onglet panier · menu : Acheter › Paiement non abouti

**Documentation** : décrite dans CL-01, CL-08

**Sections** : CL-01 « Charte de simplicité et d’écriture » ; CL-08 « Écran « Paiement non abouti » »

**Voir aussi, règles transverses** : « Parcours « Payer » » ; « Portefeuille « Compte BelivaY » et dépôt manuel — supprimés » ; « Règles de calcul des montants » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#paiement-echec?cause=solde` État d’erreur · `#paiement-echec` Paiement non abouti · demande expirée · `#paiement-echec?cause=solde` Paiement non abouti · solde insuffisant · `#paiement-echec?cause=carte` Paiement non abouti · carte refusée

**Captures** : CL-01 fig. 3 `Socle_Erreur` · CL-08 fig. 9 `Echec` · CL-08 fig. 10 `Echec_solde` · CL-08 fig. 11 `Echec_carte`

**Règles côté serveur** (1) : CPY-43 Ce SMS n’est pas dans la liste des six SMS de 10.3 : il compte comme variante du SMS… *(calcul)*

**Règles côté serveur et écran** (13) : CCH-26 Chaque information une seule fois par écran · CCH-29 « Escrow BelivaY » ne s’écrit qu’aux endroits où la spec l’écrit : le message de… · CCH-30 Casse et orthographe françaises · CCH-31 Montants *(calcul)* · CCH-32 Dates et heures en mots *(calcul)* · CCH-34 Étiquettes et badges vrais *(calcul)* · CCH-35 Icônes doublées de mots simples · CCH-36 Le temps prime sur la couleur *(calcul)* · CCH-37 Notifications et SMS *(calcul)* · CPY-36 Affiché sur échec définitif : demande expirée, refusée, solde insuffisant, annulée par le… · CPY-39 Bouton principal « Réessayer le paiement » (nouvelle tentative, recalcul complet selon… · CPY-41 Réservations de la tentative libérées immédiatement ; aucun vendeur notifié, aucune… · CPY-42 SMS d’échec seulement si le client a quitté l’application ; il fait partie des SMS…

**Règles côté écran** (10) : CCH-22 Tutoiement partout · CCH-23 Une seule action principale · CCH-24 Des mots de tous les jours · CCH-25 L’essentiel en premier · CCH-27 États vides et d’erreur · CCH-28 Mêmes mots pour les mêmes choses · CCH-33 Numéros et identifiants · CPY-37 La cause en clair, en une phrase, suivie de « Aucun montant n’a été débité ». · CPY-38 Bloc « Ce que tu peux faire » : réessayer (panier intact), vérifier son solde MoMo, payer… · CPY-44 L’ordre des trois conseils suit la cause : solde → « Vérifier ton solde MoMo » d’abord ;…

**Règles non classées** (1) : CPY-40 Un encart : les articles sont toujours dans le panier et aucun vendeur n’a été notifié.

**États et erreurs** : 4 cas (détail dans `pages.json`)

<a id="paiement-moyen"></a>
### `#paiement-moyen` — Moyen de paiement

CL-08 · lancement · onglet panier · menu : Acheter › Moyen de paiement

**Documentation** : décrite dans CL-08

**Sections** : CL-08 « Feuille « Moyen de paiement » »

**Voir aussi, règles transverses** : « Parcours « Payer » » ; « Portefeuille « Compte BelivaY » et dépôt manuel — supprimés » ; « Règles de calcul des montants » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#paiement-moyen?cause=expire` Moyen de paiement · MTN, carte au-delà du plafond · `#paiement-moyen?choix=autre&cause=expire` Moyen de paiement · autre numéro · `#paiement-moyen?choix=carte&panier=seuil` Moyen de paiement · carte, 2 % affichés · `#paiement-moyen?montant=33780&choix=apple` Moyen de paiement · Apple Pay choisi · `#paiement-moyen?montant=33780&choix=wallet` Moyen de paiement · Wallet BelivaY choisi · `#paiement-moyen?choix=wallet` Moyen de paiement · Wallet insuffisant pour ce panier

**Captures** : CL-08 fig. 12 `Moyen` · CL-08 fig. 13 `Moyen_autre` · CL-08 fig. 14 `Moyen_carte`

**Règles côté serveur et écran** (3) : CPY-47 Carte : frais de service de 2 % affichés avant de payer, jamais cachés jusqu’au débit ;… *(calcul)* · CPY-48 Carte : 3-D Secure obligatoire ; 150 000 F au plus par transaction. *(calcul)* · CPY-50 Le bouton plein nomme le montant et le moyen (« Payer 272 579 F avec MTN MoMo », « Payer…

**Règles côté écran** (2) : CPY-45 Moyens proposés : MTN MoMo et Orange Money (le numéro vérifié du compte est choisi… · CPY-49 Jamais de carte pour une commande au comptoir (jamais de paiement au comptoir depuis…

**Règles non classées** (1) : CPY-46 Autre numéro : la demande Mobile Money part sur ce numéro, mais aucun message BelivaY n’y…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| frais_carte = arrondi(2 % × (S + livraison)) | 19 400 × 2 % = 388 F. Affichés avant le paiement (PAY-CARTE-FRAIS). |
| total_carte = S + livraison + frais_carte | 19 400 + 388 = 19 788 F. |
| montant_EUR = total ÷ 655,957, au centime | 30,166 → 30,17 € (PAY-CARTE-ARRONDI) ; autre devise : taux du prestataire figé au paiement. |
| carte proposée ⇔ total ≤ 150 000 F ∧ commande non « Validée » | 272 579 F : carte inactive avec l’explication ; commande au comptoir : carte inactive. |

**Paramètres** : `PAY-CARTE-FRAIS`, `PAY-CARTE-MAX`, `PAY-CARTE-ARRONDI`, `PAY-CARTE-PSP`

<a id="confirmee"></a>
### `#confirmee` — Commande confirmée

CL-08 · lancement · onglet commandes · menu : Acheter › Commande confirmée · le reçu

**Documentation** : décrite dans CL-08

**Sections** : CL-08 « Écran « Commande confirmée » — le reçu »

**Voir aussi, règles transverses** : « Parcours « Payer » » ; « Portefeuille « Compte BelivaY » et dépôt manuel — supprimés » ; « Règles de calcul des montants » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#confirmee` Commande confirmée · reçu BLV-52107 (depuis la notification) · `#confirmee?cas=panier&premiere=1` Commande confirmée · première commande payée à 10 h 15 (→ proposition des notifications) · `#confirmee?st=partage` Commande confirmée · partager la confirmation

**Captures** : CL-08 fig. 15 `Recu` · CL-08 fig. 16 `Recu_premiere` · CL-08 fig. 17 `Recu_partage`

**Règles côté serveur et écran** (9) : CRC-01 Affiché uniquement quand le webhook de paiement est validé et que l’escrow est écrit dans… · CRC-03 Contenu dans cet ordre exact : 1 preuve (numéro de commande, montant débité, numéro MoMo… · CRC-05 Délai : Δt = t_retrait_estimé − t_now. *(calcul)* · CRC-09 « Partager la confirmation » ouvre le partage natif du téléphone (WhatsApp en premier)… · CRC-11 Notification : push par défaut (C1 « paiement protégé », criticité 1) ; le SMS C1 ne part… *(calcul)* · CRC-13 Protection écrite « Ton argent reste bloqué jusqu’à ton retrait : le vendeur n’est payé… · CRC-14 Date de la preuve écrite en entier (« jeudi 24 sept. *(calcul)* · CRC-15 Contenu partagé (image et texte) : numéro de commande, montant payé, date et heure,… · CRC-16 Écran sans dock, fermé par « × » vers l’accueil ; titre « Commande confirmée » avec une… *(calcul)*

**Règles côté écran** (7) : CRC-02 Une preuve, pas un accusé de réception : tout le reçu tient en une seule capture, sans… · CRC-04 Le nom et la photo du gérant du relais choisi sont affichés (portrait G1). · CRC-06 Nombre de colis : « 3 colis, retirables ensemble avec un seul code ». · CRC-07 Une seule action principale, « Suivre ma commande » ; action secondaire « Partager la… · CRC-08 Ligne de bas mot pour mot : « Tu recevras une notification dès que tes colis seront au… · CRC-10 La preuve survit à la page : centre de notifications et « Mes commandes » ; retrouvable… · CRC-12 « Mme Ngo Bassong t’attend au Relais Mvog-Ada » : tutoiement de la phrase de la…

**API** : `GET /orders/{id}/receipt`

<a id="validee"></a>
### `#validee` — Commande validée

CL-08 · lancement · onglet commandes · menu : Acheter › Commande validée · paiement au comptoir

**Documentation** : décrite dans CL-08

**Sections** : CL-08 « Écran « Commande validée » — paiement au comptoir »

**Voir aussi, règles transverses** : « Parcours « Payer » » ; « Portefeuille « Compte BelivaY » et dépôt manuel — supprimés » ; « Règles de calcul des montants » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#validee` Commande validée · paiement au comptoir (BLV-51940)

**Captures** : CL-08 fig. 18 `Validee`

**Règles côté serveur** (5) : CCP-02 Éligibilité calculée côté serveur : IFA neutre ou positif ; nouveau compte : paiement… *(calcul)* · CCP-06 La livraison est payée d’avance (900 F pour la robe de 24 000 F) et n’est pas remboursée… · CCP-08 validée_comptoir ⇔ éligible(IFA, S, compte, mode) ∧ livraison_payée ; l’escrow naît au… · CCP-09 Le vendeur prépare comme d’habitude ; sa libération suit la règle normale après le… · CCP-11 Refus au comptoir : le colis repart par la course de retour normale (chapitre 12) ; la…

**Règles côté serveur et écran** (4) : CCP-05 Le bouton « Payer au comptoir du relais » n’apparaît que si toutes les conditions sont… · CCP-10 Au comptoir, le gérant voit « Montant dû (MoMo sur place) » calculé par le système (reste… *(calcul)* · CCP-12 Avant de payer la livraison, « Paiement en attente » (mode comptoir) dit ce qui se paie… · CCP-13 L’écran « Commande validée » reprend la structure du reçu : preuve de la livraison payée,…

**Règles côté écran** (2) : CCP-01 Paiement au comptoir : le client valide sa commande, paie la livraison d’avance, puis… · CCP-07 Une commande au comptoir est « Validée », jamais « Payée » : l’écran dit « Commande…

**Règles non classées** (2) : CCP-03 Jamais depuis l’étranger (carte), pour un gros colis (XL, hors gabarit) ni en express ;… · CCP-04 Deux refus au comptoir : paiement d’avance obligatoire, définitivement.

**API** : `POST /checkout/counter`

<a id="commandes"></a>
### `#commandes` — Mes commandes

CL-09 · lancement · onglet commandes

**Documentation** : décrite dans CL-01, CL-09

**Sections** : CL-01 « Charte de simplicité et d’écriture » ; CL-09 « Écran « Mes commandes » · onglet En cours » ; CL-09 « Feuilles « Paiement » et « Annulation » de Mes commandes » ; CL-09 « Onglet « Terminées » · racheter, avis, commande annulée »

**Voir aussi, règles transverses** : « Composant « Carte de commande » » ; « Au comptoir · ce que l’écran du gérant impose » ; « Pour le développeur · API, événements, paramètres, erreurs »

**États** : `#commandes?st=vide` État vide · `#commandes` Mes commandes · En cours : paiement en attente, livraisons en cours avec plan, cartes · `#commandes?st=expire` Mes commandes · réservation expirée à 10 h 27 · `#commandes?st=vide` Mes commandes · nouveau client, rien à afficher · `#commandes?onglet=terminees` Mes commandes · Terminées · `#commandes?onglet=terminees&st=rachat&ref=BLV-51702` Terminées · « Racheter » : articles remis au panier · `#commandes?sheet=payer` Mes commandes · feuille Paiement (MTN / Orange) pour reprendre le paiement · `#commandes?sheet=payer&ref=BLV-52018` Mes commandes · feuille Paiement des frais de garde (400 F) · `#commandes?sheet=annuler&ref=BLV-52107&motif=delai` Mes commandes · feuille Annulation, motif choisi · `#commandes?f=retirer` Mes commandes · puce « À retirer » · `#commandes?onglet=terminees&f=annulee` Mes commandes · Terminées, puce « Annulées » · `#commandes?st=horsligne` Mes commandes · hors ligne

**Captures** : CL-01 fig. 2 `Socle_Vide` · CL-09 fig. 1 `Commandes_encours` · CL-09 fig. 2 `Commandes_filtre` · CL-09 fig. 3 `Commandes_expire` · CL-09 fig. 4 `Commandes_horsligne` · CL-09 fig. 5 `Commandes_vide` · CL-09 fig. 6 `Commandes_payer` · CL-09 fig. 7 `Commandes_payer_garde` · CL-09 fig. 8 `Commandes_annuler` · CL-09 fig. 9 `Commandes_terminees` · CL-09 fig. 10 `Commandes_annulees` · CL-09 fig. 11 `Commandes_rachat`

**Règles côté serveur** (1) : CMC-13 Le compte à rebours est la vraie fenêtre de validation Mobile Money (PAY-TVAL =… *(calcul)*

**Règles côté serveur et écran** (26) : CCH-26 Chaque information une seule fois par écran · CCH-29 « Escrow BelivaY » ne s’écrit qu’aux endroits où la spec l’écrit : le message de… · CCH-30 Casse et orthographe françaises · CCH-31 Montants *(calcul)* · CCH-32 Dates et heures en mots *(calcul)* · CCH-34 Étiquettes et badges vrais *(calcul)* · CCH-35 Icônes doublées de mots simples · CCH-36 Le temps prime sur la couleur *(calcul)* · CCH-37 Notifications et SMS *(calcul)* · CMC-01 Deux onglets : « En cours » (par défaut) et « Terminées », chacun avec son compteur réel. *(calcul)* · CMC-03 L’ordre des cartes est fixé par le serveur : à retirer (retirable, validée), en… · CMC-05 Une commande annulée va dans « Terminées », avec le motif en clair et le montant… · CMC-10 Encart « Paiement en attente » : compte à rebours en mm:ss, montant (214 699 F), « Tes 2… *(calcul)* · CMC-12 t_restant = t_exp − t_now ; à 0 : réservation libérée, articles remis en stock, encart… *(calcul)* · CMC-14 « Reprendre le paiement » ouvre la feuille Paiement du panier réservé… *(calcul)* · CMC-16 Pastille des commandes = commandes qui demandent un geste (à retirer, à payer au retrait)… *(calcul)* · CMC-17 Hors ligne : la liste est servie depuis le téléphone avec l’heure de mise à jour («… *(calcul)* · CMC-48 Panneau « Livraisons en cours » : nombre de commandes en route, plan indicatif,… *(calcul)* · CMC-49 « Plan indicatif » (liste, détail, suivi) : la maison du client, son relais et le trajet… *(calcul)* · CMC-50 Feuille Paiement du panier réservé : montant de la réservation, « aucun montant débité… *(calcul)* · CMC-51 La même feuille paie un montant dû sans quitter la liste : frais de garde de BLV-52018… *(calcul)* · CMC-52 Feuille Annulation (commande payée seulement) : six motifs, un toucher chacun ; «… *(calcul)* · CMC-33 « Racheter » remet les articles au panier aux prix et stocks actuels (recalcul serveur) ;… · CMC-35 « Facture » (bouton du résumé, commandes retirées) : PDF généré côté serveur, partageable… · CMC-38 Commande annulée : motif en clair et montant remboursé (carte, détail « Pourquoi »,… · CMC-39 Les commandes de plus de 12 mois sont archivées : elles quittent « Terminées ». *(calcul)*

**Règles côté écran** (20) : CCH-22 Tutoiement partout · CCH-23 Une seule action principale · CCH-24 Des mots de tous les jours · CCH-25 L’essentiel en premier · CCH-27 États vides et d’erreur · CCH-28 Mêmes mots pour les mêmes choses · CCH-33 Numéros et identifiants · CMC-02 Sous les onglets, des puces de filtre aux compteurs réels : En cours → Toutes · À retirer… · CMC-04 Une commande en litige reste dans « En cours » tant que le litige n’est pas clos. · CMC-06 État vide : un nouveau client est ramené au catalogue (« Découvrir les produits » →… · CMC-07 Un nouveau client n’a pas encore de relais habituel (demandé à la première commande) : la… · CMC-08 En bas de « En cours » : le relais habituel avec le nom de la gérante et l’horaire du… · CMC-09 Aucune commande non payée n’apparaît comme une commande : ni carte de commande, ni numéro… · CMC-11 L’encart est en tête de « En cours », au-dessus des livraisons en cours, sans numéro BLV… · CMC-15 La mention « Reste à payer » n’existe nulle part ; « payé » n’est jamais employé pour un… · CMC-18 Lecture au pouce, sans défilement horizontal de la page (seule la rangée de puces défile)… · CMC-53 « Garder la commande » ferme la feuille sans rien changer ; une tentative non payée ne… · CMC-34 La feuille de rachat dit ce qui a été ajouté, le prix d’aujourd’hui et s’il a changé («… · CMC-37 Le panier ne produit pas de facture : le reçu se partage sur l’écran de confirmation… · CMC-41 Tant que la fenêtre de retour est ouverte, la carte le dit (« Retour possible jusqu’au…

**Règles non classées** (2) : CMC-36 La facture est émise par BelivaY et ne porte aucun nom de boutique. · CMC-40 Une ligne sous la liste le dit ; leurs factures restent dans Compte › Factures (CL-13).

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| t_restant = t_exp − t_now | Affiché en mm:ss (12:00 à 10 h 15 pour t_exp = 10 h 27). À 0 : encart retiré, ligne « Réservation expirée à 10 h 27 ». |
| t_exp = t_demande + T_val | T_val = fenêtre de validation de l’agrégateur (24 min dans le jeu d’essai : 10 h 03 → 10 h 27). |
| compteur total = #En cours + #Terminées | 4 + 4 = 8 ; la réservation n’y entre jamais. |
| puce(k) = #{commandes de l’onglet dont le filtre = k} | À retirer 2 (BLV-52018, BLV-51940) · En route 1 (BLV-52107) · En litige 1 (BLV-51877) ; Retirées 3 · Annulées 1. |
| pastille des commandes = #{commandes en cours dont un geste est attendu au comptoir} | 2 (BLV-52018, BLV-51940) ; jamais le paiement en attente. |
| trajet = distance et durée à pied entre l’adresse du client et le relais | 350 m · 6 min (Relais Mvog-Ada). |

**États et erreurs** : 12 cas (détail dans `pages.json`)

**API** : `POST /payments/{id}/resend · /cancel · /abandon` · `GET /me/orders?tab=cours|terminees` · `POST /orders/{id}/rebuy`

<a id="commande"></a>
### `#commande` — Ma commande

CL-09 · lancement · onglet commandes

**Documentation** : décrite dans CL-01, CL-09

**Sections** : CL-01 « Carte des écrans et navigation » ; CL-09 « Écran « Détail d’une commande » · commandes en cours » ; CL-09 « Détail d’une commande terminée · facture, annulée, close »

**Voir aussi, règles transverses** : « Composant « Carte de commande » » ; « Au comptoir · ce que l’écran du gérant impose » ; « Pour le développeur · API, événements, paramètres, erreurs »

**États** : `#commande?ref=BLV-52018` Écran enfant · commande · `#commande?ref=BLV-51388` Détail · BLV-51388 retirée et close · `#commande?ref=BLV-51702` Détail · BLV-51702 retirée, fenêtre de retour ouverte · `#commande?ref=BLV-51702&st=facture` Détail · facture PDF de BLV-51702 · `#commande?ref=BLV-51533` Détail · BLV-51533 annulée et remboursée · `#commande?ref=BLV-52018` Détail · BLV-52018 retirable maintenant · `#commande?ref=BLV-52107` Détail · BLV-52107 en préparation, 3 colis · `#commande?ref=BLV-51940` Détail · BLV-51940 validée, à payer au retrait · `#commande?ref=BLV-51877` Détail · BLV-51877 en litige (LIT-3042)

**Captures** : CL-01 fig. 5 `Socle_Enfant` · CL-09 fig. 12 `Commande_prete` · CL-09 fig. 13 `Commande_preparation` · CL-09 fig. 14 `Commande_validee` · CL-09 fig. 15 `Commande_litige` · CL-09 fig. 16 `Commande_terminee` · CL-09 fig. 17 `Commande_facture` · CL-09 fig. 18 `Commande_annulee` · CL-09 fig. 19 `Commande_close`

**Règles côté serveur et écran** (1) : CMC-47 Montant dû du jour avec le palier suivant (« Montant dû : 400 F », « 600 F demain ») et… *(calcul)*

**Règles côté écran** (8) : CMC-42 Le détail garde les blocs des captures d’origine, dans cet ordre : état, geste attendu,… · CMC-43 Le geste attendu est en tête, dans une carte nuit : « Mon code » (retirable), « Payer »… · CMC-44 « Modifier ma commande » ouvre CL-12 (annuler une boutique, changer de relais) ; «… · CMC-45 « Signaler un problème » (encart « Litige protégé ») ouvre l’assistant guidé (CL-11),… · CMC-46 Commande validée : livraison payée (900 F) et montant dû au retrait (24 000 F) séparés… · CMC-54 Commande terminée : ni carte nuit, ni « Voir colis par colis », ni « Modifier ma commande… · CMC-55 « Noter cet article » (détail) et « Donner mon avis » (carte) mènent à l’écran d’avis de… · CMC-56 Commande close (fenêtre de retour fermée, vendeur payé) : chronologie et cycle de vie…

**États et erreurs** : 5 cas (détail dans `pages.json`)

**API** : `GET /orders/{id}` · `GET /orders/{id}/invoice.pdf · /me/factures`

<a id="code"></a>
### `#code` — Code de retrait

CL-09 · lancement · onglet commandes · menu : Mes commandes › Code de retrait

**Documentation** : décrite dans CL-09

**Sections** : CL-09 « Écran « Code de retrait » »

**Voir aussi, règles transverses** : « Composant « Carte de commande » » ; « Au comptoir · ce que l’écran du gérant impose » ; « Pour le développeur · API, événements, paramètres, erreurs »

**États** : `#code?ref=BLV-52018` Code de retrait · plein écran, code et QR · `#code?ref=BLV-52107` Code de retrait · pas encore de code (3 colis en route) · `#code?ref=BLV-52107&st=bio` Code de retrait · déverrouillage au-delà de 50 000 F · `#code?ref=BLV-51940` Code de retrait · commande validée, code bloqué avant paiement · `#code?ref=BLV-52018&st=bloque` Code de retrait · bloqué 24 h après 3 codes faux · `#code?ref=BLV-52018&st=nouveau` Code de retrait · nouveau code, l’ancien refusé · `#code?ref=BLV-52018&st=horsligne` Code de retrait · hors ligne, lisible depuis le téléphone · `#code?ref=BLV-51702` Code de retrait · colis retiré, code disparu · `#code?ref=BLV-52018&dyn=deplie` Code de retrait · île dépliée (code et QR)

**Captures** : CL-09 fig. 20 `CodeRetrait_visible` · CL-09 fig. 21 `CodeRetrait_attente` · CL-09 fig. 22 `CodeRetrait_bio` · CL-09 fig. 23 `CodeRetrait_validee` · CL-09 fig. 24 `CodeRetrait_bloque` · CL-09 fig. 25 `CodeRetrait_nouveau` · CL-09 fig. 26 `CodeRetrait_horsligne` · CL-09 fig. 27 `CodeRetrait_retire`

**Règles côté serveur** (2) : CCD-04 Biométrie : si le montant de la commande ≥ CODE-BIO (50 000 F), déverrouillage du… *(Proposé)* · CCD-18 Le relais ne voit jamais le code en clair : il le tape ou le scanne ; le serveur ne…

**Règles côté serveur et écran** (6) : CCD-05 Code ET QR : les 6 chiffres restent toujours lisibles en texte à côté du QR (écran cassé,… · CCD-10 Renvoi payant par SMS pour un client sans application : 3 par commande et par 24 h… *(calcul)* · CCD-11 Commande « Validée » : code affiché seulement après le paiement sur place (webhook). · CCD-12 Trois codes faux au comptoir : code bloqué 24 h, client prévenu (push critique,… *(calcul)* · CCD-15 Une notification ne contient jamais le code (push, centre de notifications, écran… · CCD-19 Luminosité de l’écran au maximum tant que le QR est affiché, rétablie en quittant. *(calcul)*

**Règles côté écran** (8) : CCD-02 « Afficher mon code » : code et QR en plein écran, au toucher seulement ; masqués dès… · CCD-03 Le code se retrouve depuis l’accueil en un toucher : bouton « Mon code » de la barre… · CCD-06 Accessible tant que le colis n’est pas retiré ; disparaît après la validation du retrait… · CCD-07 Un seul code par groupe de remise ; il n’existe qu’à l’arrivée du dernier colis du groupe… · CCD-08 « Envoyer à quelqu’un » : partage natif depuis le téléphone, coût nul pour BelivaY ;… · CCD-14 Capture d’écran autorisée : le client doit pouvoir l’envoyer. · CCD-16 Hors ligne : un code déjà affiché une fois reste lisible depuis le téléphone (CACHE-CODE)… · CCD-17 Sous le code : le montant dû du jour, le palier suivant, « Payer », le lien vers le…

**Règles non classées** (3) : CCD-01 Le porteur du code retire le colis sans justificatif : le code vaut le colis. · CCD-09 Colis de valeur : porteur nommé, pièce vérifiée au comptoir ; nom facultatif en dessous… · CCD-13 Changement de relais ou de numéro : nouveau code ; l’ancien est refusé au comptoir.

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| biométrie ⇔ montant ≥ seuil_bio | seuil_bio = CODE-BIO (50 000 F proposé). BLV-52018 : 33 780 F → non ; BLV-52107 : 196 780 F → oui. |
| renvoi payant ⇔ renvois(24 h) < 3 | Journalisé ; au 3e : « Tu as utilisé tes 3 renvois : prochain possible à [heure] ». |
| codes_faux ≥ 3 ⇒ blocage 24 h | Alerte au client ; nouveau code sur demande ; l’ancien reste refusé. |
| code visible ⇔ groupe complet ∧ ¬retiré ∧ ¬bloqué ∧ (payée ∨ validée payée sur place) | Sinon l’écran d’état correspondant (attente, validée, bloqué, retiré). |

**États et erreurs** : 6 cas (détail dans `pages.json`)

**API** : `POST /orders/{id}/code/reveal · /code/resend · /code/renew` · `GET /orders/{id}/storage`

<a id="code-partage"></a>
### `#code-partage` — Envoyer mon code

CL-09 · lancement · onglet commandes · menu : Mes commandes › Envoyer mon code à quelqu’un

**Documentation** : décrite dans CL-01, CL-09

**Sections** : CL-01 « Feuilles du bas, retour arrière et liens profonds » ; CL-09 « Écran « Code de retrait » »

**Voir aussi, règles transverses** : « Composant « Carte de commande » » ; « Au comptoir · ce que l’écran du gérant impose » ; « Pour le développeur · API, événements, paramètres, erreurs »

**États** : `#code-partage?ref=BLV-52018` Feuille du bas · `#code-partage?ref=BLV-52018` Code de retrait · envoyer à quelqu’un

**Captures** : CL-01 fig. 9 `Socle_Feuille` · CL-09 fig. 28 `CodeRetrait_partage`

**Règles côté serveur** (2) : CCD-04 Biométrie : si le montant de la commande ≥ CODE-BIO (50 000 F), déverrouillage du… *(Proposé)* · CCD-18 Le relais ne voit jamais le code en clair : il le tape ou le scanne ; le serveur ne…

**Règles côté serveur et écran** (8) : CNV-11 Feuilles du bas *(calcul)* · CNV-12 Liens profonds · CCD-05 Code ET QR : les 6 chiffres restent toujours lisibles en texte à côté du QR (écran cassé,… · CCD-10 Renvoi payant par SMS pour un client sans application : 3 par commande et par 24 h… *(calcul)* · CCD-11 Commande « Validée » : code affiché seulement après le paiement sur place (webhook). · CCD-12 Trois codes faux au comptoir : code bloqué 24 h, client prévenu (push critique,… *(calcul)* · CCD-15 Une notification ne contient jamais le code (push, centre de notifications, écran… · CCD-19 Luminosité de l’écran au maximum tant que le QR est affiché, rétablie en quittant. *(calcul)*

**Règles côté écran** (11) : CNV-10 Retour arrière · CNV-13 Un lien profond vers un écran qui demande un compte ouvre la connexion puis l’écran visé… · CNV-14 États par paramètres · CCD-02 « Afficher mon code » : code et QR en plein écran, au toucher seulement ; masqués dès… · CCD-03 Le code se retrouve depuis l’accueil en un toucher : bouton « Mon code » de la barre… · CCD-06 Accessible tant que le colis n’est pas retiré ; disparaît après la validation du retrait… · CCD-07 Un seul code par groupe de remise ; il n’existe qu’à l’arrivée du dernier colis du groupe… · CCD-08 « Envoyer à quelqu’un » : partage natif depuis le téléphone, coût nul pour BelivaY ;… · CCD-14 Capture d’écran autorisée : le client doit pouvoir l’envoyer. · CCD-16 Hors ligne : un code déjà affiché une fois reste lisible depuis le téléphone (CACHE-CODE)… · CCD-17 Sous le code : le montant dû du jour, le palier suivant, « Payer », le lien vers le…

**Règles non classées** (3) : CCD-01 Le porteur du code retire le colis sans justificatif : le code vaut le colis. · CCD-09 Colis de valeur : porteur nommé, pièce vérifiée au comptoir ; nom facultatif en dessous… · CCD-13 Changement de relais ou de numéro : nouveau code ; l’ancien est refusé au comptoir.

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| biométrie ⇔ montant ≥ seuil_bio | seuil_bio = CODE-BIO (50 000 F proposé). BLV-52018 : 33 780 F → non ; BLV-52107 : 196 780 F → oui. |
| renvoi payant ⇔ renvois(24 h) < 3 | Journalisé ; au 3e : « Tu as utilisé tes 3 renvois : prochain possible à [heure] ». |
| codes_faux ≥ 3 ⇒ blocage 24 h | Alerte au client ; nouveau code sur demande ; l’ancien reste refusé. |
| code visible ⇔ groupe complet ∧ ¬retiré ∧ ¬bloqué ∧ (payée ∨ validée payée sur place) | Sinon l’écran d’état correspondant (attente, validée, bloqué, retiré). |

**États et erreurs** : 6 cas (détail dans `pages.json`)

**API** : `POST /orders/{id}/code/reveal · /code/resend · /code/renew`

<a id="suivi"></a>
### `#suivi` — Suivi de commande

CL-09 · lancement · onglet commandes · menu : Mes commandes › Suivi de commande

**Documentation** : décrite dans CL-09

**Sections** : CL-09 « Écran « Suivi de commande » »

**Voir aussi, règles transverses** : « Composant « Carte de commande » » ; « Au comptoir · ce que l’écran du gérant impose » ; « Pour le développeur · API, événements, paramètres, erreurs »

**États** : `#suivi?ref=BLV-52107` Suivi · réponse en tête et 3 colis · `#suivi?ref=BLV-52107&st=retard` Suivi · colis 2 en retard chez le vendeur · `#suivi?ref=BLV-52107&st=attente` Suivi · en attente d’un colis, livreur en route · `#suivi?ref=BLV-52018` Suivi · arrivé au relais, horaires et trajet · `#suivi?ref=BLV-52096` Suivi · livraison à domicile en route

**Captures** : CL-09 fig. 29 `SuiviCommande_preparation` · CL-09 fig. 30 `SuiviCommande_retard` · CL-09 fig. 31 `SuiviCommande_attente` · CL-09 fig. 32 `SuiviCommande_arrive` · CL-09 fig. 33 `SuiviCommande_domicile`

**Règles côté serveur** (3) : CSU-02 Le délai est une heure ou une date ferme, jamais une fourchette ; la cible est moins de 5… *(calcul)* · CSU-06 Le vocabulaire interne (paquet, tournée, affectation, plafond de valeur) reste dans les… *(calcul)* · CSU-10 Un incident détecté et non notifié sous 15 minutes (INC-NOTIF-MIN) est un défaut de… *(calcul)*

**Règles côté serveur et écran** (5) : CSU-01 Le suivi existe pour empêcher un appel au support : la première ligne répond à « quand… *(calcul)* · CSU-03 « En attente d’un colis » quand une partie du groupe est au relais et qu’il en manque au… *(calcul)* · CSU-08 Aucune carte de suivi du livreur en temps réel : le plan indicatif (CMC-49) ne montre que… *(calcul)* · CSU-09 Colis en retard nommé avant que le client le constate : « Colis 2 en retard chez le… · CSU-12 À « Arrivé au relais » : horaires du jour du relais et temps de trajet estimé depuis… *(calcul)*

**Règles côté écran** (4) : CSU-05 Quatre états seulement, en langage client : Préparation en cours → Récupéré par le… · CSU-07 Anonymat : « Colis 1 », « Boutique A ». · CSU-11 Un seul bouton « Signaler un problème », toujours visible (barre collante) : l’assistant… · CSU-13 « Modifier ma commande » reste proposé tant qu’une modification est possible (avant la…

**Règles non classées** (1) : CSU-04 Sous le plan, le détail par colis : chaque colis a son propre état ; un statut global est…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| answer = ready si ∀ colis arrivé ; waiting si ∃ arrivé ∧ ∃ non arrivé ; sinon at(max t_estimé) | Ready : « Retirable maintenant » + horaires et trajet ; waiting : « En attente d’un colis » + colis attendu ; at : « Retrait possible [jour] dès [heure] ». |
| retard ⇔ t_estimé_nouveau > t_estimé_promis | Message C4 à t_détection + 15 min au plus ; la réponse en tête prend la nouvelle heure (17 h). |
| trajet = durée à pied entre l’adresse du client et le relais | « 350 m · 6 min » sur le plan ; « 6 min à pied de chez toi (350 m) » dans la réponse. |

**États et erreurs** : 4 cas (détail dans `pages.json`)

**API** : `GET /orders/{id}/tracking`

<a id="comptoir-payer"></a>
### `#comptoir-payer` — Montant dû

CL-09 · lancement · onglet commandes · menu : Mes commandes › Payer au comptoir

**Documentation** : décrite dans CL-09

**Sections** : CL-09 « Écran « Montant dû » · payer au comptoir »

**Voir aussi, règles transverses** : « Composant « Carte de commande » » ; « Au comptoir · ce que l’écran du gérant impose » ; « Pour le développeur · API, événements, paramètres, erreurs »

**États** : `#comptoir-payer?ref=BLV-52018` Payer au comptoir · frais de garde 400 F · `#comptoir-payer?ref=BLV-51940` Payer au comptoir · commande validée 24 000 F · `#comptoir-payer?ref=BLV-51940&st=attente` Payer au comptoir · demande MoMo envoyée · `#comptoir-payer?ref=BLV-51940&st=paye` Payer au comptoir · paiement confirmé, code débloqué · `#comptoir-payer?ref=BLV-51940&st=echec` Payer au comptoir · échec, aucun débit · `#comptoir-payer?ref=BLV-52018&st=horsligne` Payer au comptoir · hors ligne · `#comptoir-payer?ref=BLV-52107&st=rien` Payer au comptoir · rien à payer le jour d’arrivée

**Captures** : CL-09 fig. 34 `ComptoirPayer_garde` · CL-09 fig. 35 `ComptoirPayer_validee` · CL-09 fig. 36 `ComptoirPayer_attente` · CL-09 fig. 37 `ComptoirPayer_ok` · CL-09 fig. 38 `ComptoirPayer_echec` · CL-09 fig. 39 `ComptoirPayer_horsligne` · CL-09 fig. 40 `ComptoirPayer_rien`

**Règles côté serveur et écran** (3) : CCM-01 montant_dû = frais_garde(t) + reste_validée, calculé par le service de tarification,… *(calcul)* · CCM-03 0 F le jour d’arrivée : « Rien à payer … Gratuit aujourd’hui, 100 F par jour dès demain »… *(calcul)* · CCM-04 Commande « Validée » : le paiement du reste débloque le code (webhook) ; la livraison…

**Règles côté écran** (2) : CCM-02 Payé en Mobile Money sur le téléphone du client (MTN MoMo ou Orange Money, numéro masqué)… · CCM-05 États : à payer → demande envoyée (code secret, aide USSD *126# pour MTN, « Renvoyer la…

**Règles non classées** (2) : CCM-06 Le montant est celui du jour : il se paie au moment du retrait (demain, il aura changé). · CCM-07 Retrait par un proche : la demande de paiement du montant dû arrive sur le téléphone du…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| montant_dû = frais_garde(t) + reste_validée | BLV-52018 : 400 + 0 = 400 F ; BLV-51940 : 0 + 24 000 = 24 000 F ; BLV-52107 le jour d’arrivée : 0 F. |
| frais_garde(t) = Σ tarif(rang) ; rang 1 = 0 ; 2–3 = 100 F ; 4–5 = 200 F ; 6–7 = 400 F | Jours fermés comptés dans le rang, jamais facturés ; maximum 1 400 F (1 900 F avec le renvoi) ; jamais au-delà de la valeur du colis. |
| clé = commande + n° de tentative | Un renvoi de la demande annule la précédente (8.6). |

**États et erreurs** : 5 cas (détail dans `pages.json`)

**API** : `POST /orders/{id}/counter-payment`

<a id="comptoir"></a>
### `#comptoir` — Au comptoir

CL-09 · lancement · onglet commandes · menu : Mes commandes › Au comptoir

**Documentation** : décrite dans CL-09

**Sections** : CL-09 « Écran « Au comptoir » · le moment du retrait, côté client »

**Voir aussi, règles transverses** : « Composant « Carte de commande » » ; « Au comptoir · ce que l’écran du gérant impose » ; « Pour le développeur · API, événements, paramètres, erreurs »

**États** : `#comptoir?ref=BLV-52018` Au comptoir · avant la remise · `#comptoir?ref=BLV-52018&st=remis` Au comptoir · colis remis, contrôle poussé, deux notes · `#comptoir?ref=BLV-52018&st=ok` Au comptoir · « Tout est en ordre », deux notes · `#comptoir?ref=BLV-52018&st=tiers` Au comptoir · retiré par un proche · `#comptoir?ref=BLV-51702` Au comptoir · retrait passé, pas encore confirmé · `#comptoir?ref=BLV-51877` Au comptoir · « Un problème » : litige ouvert, colis gardé

**Captures** : CL-09 fig. 41 `AuComptoir_avant` · CL-09 fig. 42 `AuComptoir_remis` · CL-09 fig. 43 `AuComptoir_ok` · CL-09 fig. 44 `AuComptoir_tiers` · CL-09 fig. 45 `AuComptoir_attente` · CL-09 fig. 46 `AuComptoir_litige`

**Règles côté serveur et écran** (6) : CCM-13 « Un problème » ouvre un litige au comptoir (CL-11) : photos prises par le gérant, colis… · CCM-14 « Tout est en ordre » ferme la fenêtre de retour : libération du vendeur 3 jours après (1… *(calcul)* · CCM-15 Encart : « Le vendeur n’est pas encore payé. *(calcul)* · CCM-17 Fenêtre de notation : le prototype montre 7 jours (valeur du relais, AVI-06). *(calcul)* *(À trancher)* · CCM-18 Retourner un article : avec un motif (non conforme, abîmé, contrefaçon, défaut caché… *(calcul)* · CCM-20 Mode papier du gérant en panne : registre, pièce d’identité, régularisation à la…

**Règles côté écran** (7) : CCM-08 Deux onglets : « Au comptoir » et « Retourner un article » (le second est l’écran retour… · CCM-09 Avant la remise : ce qui va se passer, en moins d’une minute (code, montant dû sur le… · CCM-10 Après validation par le gérant : « Colis remis », nombre de colis, relais, date et heure. · CCM-11 Le client est notifié à l’instant du retrait ; si un tiers retire, avec le nom saisi par… · CCM-12 Contrôle poussé activement, avec le portrait de la gérante : « Ouvre tes colis maintenant. · CCM-16 Notation en deux notes séparées (le vendeur ; la gérante nommée), commentaire facultatif,… · CCM-19 L’application du client est la seule source de vérité de « Tout est en ordre » ; l’écran…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| libération = fermeture_retour + 3 j (Or, Platine : 1 j ; carte : 14 j) | Fermeture = 7 jours après le retrait, ou « Tout est en ordre ». BLV-52018 : fermeture jeu. 24 sept. à 10 h 34 → libération au plus tard dim. 27 sept., versement le vendredi suivant. |
| date de l’encart = date du retrait + RET-FENETRE (7 j) | BLV-51702 : sam. 19 → sam. 26 sept. ; BLV-52018 : jeu. 24 sept. → jeu. 1er oct. |

**États et erreurs** : 4 cas (détail dans `pages.json`)

**API** : `GET /cart/eligibility/counter` · `POST /checkout/counter` · `POST /orders/{id}/all-good`

<a id="notifications"></a>
### `#notifications` — Notifications

CL-10 · lancement · onglet compte · menu : Aide et messages › Centre de notifications

**Documentation** : décrite dans CL-10

**Sections** : CL-10 « Écran « Centre de notifications » »

**Voir aussi, règles transverses** : « Le service d’envoi et le journal » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#notifications` Centre de notifications · 3 non lues · `#notifications?st=groupe` Centre · regroupement par commande déplié · `#notifications?st=horsligne` Centre · hors ligne, liste du cache · `#notifications?st=vide` Centre · aucune notification

**Captures** : CL-10 fig. 1 `Notifications` · CL-10 fig. 2 `Notifications_groupe` · CL-10 fig. 3 `Notifications_horsligne` · CL-10 fig. 4 `Notifications_vide`

**Règles côté serveur et écran** (5) : CNT-01 Le centre garde tout ce qui a été envoyé au compte, même non ouvert : liste chronologique… *(calcul)* · CNT-02 Chaque ligne ouvre directement l’écran exact (lien profond), sans feuille intermédiaire. *(calcul)* · CNT-03 Regroupement par commande : plusieurs événements d’une commande à moins de 10 minutes… *(calcul)* · CNT-08 Chaque ligne porte l’icône et le nom de sa catégorie (celles du réglage), l’heure « 08 h… *(calcul)* · CNT-09 Le centre garde aussi les SMS envoyés (S1, S2, C12…), marqués « Envoyé par SMS » ; le C3…

**Règles côté écran** (7) : CNT-04 Accès par la cloche de l’en-tête d’accueil, avec le badge du nombre de non-lus (3 sur le… · CNT-05 Jamais de code de retrait, d’OTP ni de montant sensible dans une ligne ; la ligne « Ton… · CNT-06 Un bouton vers le réglage des notifications : roue en haut à droite (et lien dans l’état… · CNT-07 Non lue : carte bordée d’orange, catégorie et point orange ; lue dès qu’on la touche ; «… · CNT-10 Hors ligne : bannière « Hors ligne » avec l’heure du cache ; les lignes ouvrent les… · CNT-11 État vide : ce qui arrivera ici, un seul bouton plein « Découvrir les produits », lien… · CNT-12 Textes du centre en français correct (accents) ou en anglais selon le profil ; aucune…

**Paramètres** : `NOT-GROUPE`, `NOT-CONSERV`, `NOT-BADGE-MAX`

**États et erreurs** : 4 cas (détail dans `pages.json`)

**API** : `GET · POST /me/notifications?cursor= · /me/notifications/read`

<a id="notifs-reglages"></a>
### `#notifs-reglages` — Réglage des notifications

CL-10 · lancement · onglet compte · menu : Mon compte › Réglage des notifications

**Documentation** : décrite dans CL-10

**Sections** : CL-10 « Écran « Réglage des notifications » »

**Voir aussi, règles transverses** : « Le service d’envoi et le journal » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#notifs-reglages` Réglage des notifications · `#notifs-reglages?st=verrou` Réglage · catégorie critique verrouillée · `#notifs-reglages?st=whatsapp` Réglage · WhatsApp « bientôt » · `#notifs-reglages?st=enregistre` Réglage · Suivi désactivé, enregistré · `#notifs-reglages?st=nonverifie` Réglage · numéro non vérifié

**Captures** : CL-10 fig. 5 `Notifs_reglages` · CL-10 fig. 6 `Reglages_verrou` · CL-10 fig. 7 `Reglages_whatsapp` · CL-10 fig. 8 `Reglages_enregistre` · CL-10 fig. 9 `Reglages_nonverifie`

**Règles côté serveur et écran** (6) : CNT-13 « Si l’application est fermée » : canal de repli SMS, coché par défaut, utilisé quand le… · CNT-14 WhatsApp s’affiche « bientôt », non sélectionnable, tant que l’API n’est pas branchée… · CNT-15 Consentement WhatsApp : « Non » par défaut ; recueilli le jour où le canal ouvre, avec le… · CNT-16 Numéro de notification = celui du compte, masqué (6 77 ·· ·· 41), état « Vérifié » ;… *(calcul)* · CNT-18 Note : « Les alertes critiques ne se désactivent pas, et ton code n’apparaît jamais sur… · CNT-21 Toucher une catégorie verrouillée ouvre l’explication (« « Retrait » reste activé »),…

**Règles côté écran** (3) : CNT-17 « Ce que tu reçois » : Commande, Retrait, Incident, Paiement activés et non désactivables… · CNT-20 Chaque interrupteur s’enregistre au toucher (pas de bouton « Enregistrer »), avec la… · CNT-22 Chaque message appartient à une catégorie selon le tableau ci-dessus ; la catégorie…

**Règles non classées** (2) : CNT-19 Le réglage est porté par le compte, pas par l’appareil : il suit Carine sur chaque… · CNT-23 Le réglage est proposé après la première commande, jamais pendant l’inscription ; il…

**Paramètres** : `FF-WHATSAPP-CANAL`, `WAP-API`, `PUSH-PROMO`

**États et erreurs** : 4 cas (détail dans `pages.json`)

**API** : `GET · PUT /me/notification-settings` · `POST /me/consents`

<a id="garde"></a>
### `#garde` — Frais de garde

CL-10 · lancement · onglet commandes · menu : Mes commandes › Frais de garde · BLV-52018

**Documentation** : décrite dans CL-10

**Sections** : CL-10 « Écran « Ton colis t’attend » (frais de garde) »

**Voir aussi, règles transverses** : « Le service d’envoi et le journal » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#garde?ref=BLV-52018` Frais de garde · jour 4, aujourd’hui · `#garde?ref=BLV-52018&j=1` Frais de garde · jour 1, gratuit · `#garde?ref=BLV-52018&j=2` Frais de garde · jour 2, 100 F · `#garde?ref=BLV-52018&j=5` Frais de garde · jour 5, 600 F · `#garde?ref=BLV-52018&j=6` Frais de garde · jour 6, dernier jour · `#garde?ref=BLV-52018&j=7` Frais de garde · jour 7, dimanche fermé · `#garde?ref=BLV-52018&j=ferme` Frais de garde · fermeture déclarée aujourd’hui · `#garde?ref=BLV-52018&j=renvoye` Frais de garde · renvoyé au vendeur · `#garde?ref=BLV-52018&j=litige` Frais de garde · litige, compteur gelé · `#garde?ref=BLV-52018&j=nonvu` Frais de garde · sans accusé fort · `#garde?ref=BLV-52018&j=groupage` Frais de garde · groupage (après le lancement)

**Captures** : CL-10 fig. 23 `Garde` · CL-10 fig. 24 `Garde_j1` · CL-10 fig. 25 `Garde_j2` · CL-10 fig. 26 `Garde_j5` · CL-10 fig. 27 `Garde_j6` · CL-10 fig. 28 `Garde_j7` · CL-10 fig. 29 `Garde_ferme` · CL-10 fig. 30 `Garde_renvoye` · CL-10 fig. 31 `Garde_litige` · CL-10 fig. 32 `Garde_nonvu` · CL-10 fig. 33 `Garde_groupage`

**Règles côté serveur** (4) : CGA-04 Rang compté en jours calendaires depuis J0 (J0 = rang 1) ; un jour de fermeture compte… *(calcul)* · CGA-07 Jamais au-delà de la valeur du colis ; maximum 1 400 F de garde, 1 900 F avec le renvoi. *(calcul)* · CGA-17 Renvoi : course de retour publiée à l’entreprise de livraison avec les paquets de la zone… *(calcul)* · CGA-21 Changement de relais : nouveau code ; le décompte repart au jour 1 au nouveau relais (J0… *(calcul)*

**Règles côté serveur et écran** (8) : CGA-01 Grille définitive (24 sept.) : jour 1 gratuit ; 100 F par jour aux jours 2 et 3 ; 200 F… *(calcul)* · CGA-03 J0 = date de l’accusé fort du message d’arrivée (application ouverte ou SMS délivré) ;… *(calcul)* · CGA-11 Zéro espèce : les frais sont encaissés par BelivaY en Mobile Money au retrait, sur le… · CGA-12 Le montant est identique dans l’application, le SMS et l’écran du gérant : un seul… · CGA-16 Date limite = dernier jour ouvert de rang ≤ 7 (« retrait avant samedi 26 au soir » quand… *(calcul)* · CGA-19 F_client = 1 + bonus_abonnement, bonus = 0 au lancement ; les jours d’abonné (+2 Plus, +4… *(calcul)* · CGA-20 Sans accusé fort, le colis n’est jamais facturé ; 48 h après l’arrivée sans accusé fort,… *(calcul)* · CGA-23 Commande « Validée » : montant dû = garde + reste à régler (BLV-51940 : 24 000 F le jour… *(calcul)* *(À trancher)*

**Règles côté écran** (7) : CGA-02 L’écran et chaque rappel affichent le montant dû à l’instant T (en grand), le palier… · CGA-08 Un litige suspend le compteur et le renvoi : l’écran le dit, les jours sont « Gelé », la… · CGA-09 Un jour où un litige est ouvert, même en cours de journée, n’est pas facturé (lecture… · CGA-10 Un groupage de liste d’envies ne coûte rien (après le lancement) : ni facturé au client,… · CGA-14 Jour d’arrivée : « Gratuit aujourd’hui, 100 F par jour dès demain ». · CGA-15 Une seule action principale, « Afficher mon code » (le retrait arrête les frais) ;… · CGA-18 Le gérant touche 100 F par jour facturé (RELAIS-GAIN-GARDE), versés le vendredi ; jamais…

**Règles non classées** (4) : CGA-05 Jours entiers, sans prorata (GARDE-PRORATA, proposé, paramétrable ; rangé parmi les… *(Proposé)* · CGA-06 Le compteur s’arrête au scan de retrait ; le retrait annule tous les messages de la série… · CGA-13 La grille s’applique par groupe de remise (un code) : 2 colis, une seule garde (BLV-52018… · CGA-22 Colis en retour déposé au relais : jamais de garde.

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| J0 = date de l’accusé fort du message d’arrivée | Application ouverte ou SMS délivré ; sans accusé fort, le compteur ne démarre jamais. BLV-52018 : SMS C3 délivré lun. 21 à 17 h 40. |
| F_client = 1 + bonus_abonnement | Un seul jour gratuit au lancement ; bonus = 0 (les jours d’abonné sont après le lancement). |
| rang(j) = j − J0 + 1, en jours calendaires | Un jour fermé compte dans le rang ; le compteur ne dépasse jamais le 7e jour. |
| tarif(rang) = 0 (1) ; 100 F (2, 3) ; 200 F (4, 5) ; 400 F (6, 7) | GARDE-J1 à GARDE-J6-7 ; un jour fermé, gelé (litige) ou en groupage vaut 0. |
| jours_fact(t) = #{ j ∈ ]J0 + F_client ; t] : relais ouvert ∧ pas de litige ∧ pas de groupage } | t s’arrête au scan de retrait ; un jour où un litige est ouvert n’est pas facturé (CGA-09). |
| frais(t) = min(Σ tarif(j), valeur_colis) | Au plus 1 400 F de garde, 1 900 F avec le renvoi. BLV-52018 : 0 + 100 + 100 + 200 = 400 F le jeudi 24 ; valeur 33 400 F. |
| montant_dû = frais(t) + reste_validée | Identique dans l’application, le SMS et l’écran du gérant ; payé en Mobile Money. BLV-51940 : 0 + 24 000 F le jour 1. |
| dernier_jour = dernier jour ouvert de rang ≤ 7 | BLV-52018 : dim. 27 fermé → samedi 26 au soir. |
| J_renvoi = premier jour ouvert après le 7e jour ; retenue = frais + 500 F ; Z = montant_payé − retenue | BLV-52018 : lundi 28 ; 1 000 + 500 = 1 500 F ; 33 780 − 1 500 = 32 280 F remboursés en S5. |
| gain_relais = 100 F × jours_fact | Versé le vendredi. BLV-52018 retiré aujourd’hui : 3 jours facturés (mar., mer., jeu.) = 300 F pour le relais. |

**Paramètres** : `GARDE-J1`, `GARDE-J2-3`, `GARDE-J4-5`, `GARDE-J6-7`, `GARDE-RENVOI`, `GARDE-FERME`, `GARDE-PRORATA`, `RELAIS-GAIN-GARDE`, `GARDE-NONVU-H`, `ABO-GARDE-BONUS`

**États et erreurs** : 5 cas (détail dans `pages.json`)

**API** : `GET /orders/{id}/storage`

<a id="push"></a>
### `#push` — Aperçu · notifications

CL-10 · lancement · menu : Aide et messages › Rendu des notifications push

**Documentation** : décrite dans CL-10

**Sections** : CL-10 « Aperçu « Notifications push » » ; CL-10 « La série de rappels S0 à S5 »

**Voir aussi, règles transverses** : « Le service d’envoi et le journal » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#push` Aperçu push · écran verrouillé (depuis le réglage) · `#push?st=banniere` Aperçu push · bannière du rappel S0 · `#push?st=groupe` Aperçu push · notification regroupée (récupéré + arrivé, BLV-51940) · `#push?st=nuit` Aperçu push · la nuit, sans son · `#push?st=serie` Aperçu push · série de rappels S0 à S5 (depuis les frais de garde)

**Captures** : CL-10 fig. 10 `Push_verrouille` · CL-10 fig. 11 `Push_banniere` · CL-10 fig. 12 `Push_groupe` · CL-10 fig. 13 `Push_nuit` · CL-10 fig. 34 `Push_serie`

**Règles côté serveur** (12) : CNT-24 Le push est toujours tenté en premier, pour tous les acteurs : gratuit, instantané ;… · CNT-25 Exceptions de canal fixées par 10.3 et 10.4 : C3 part en SMS avec le push C2 ; S1, S2 et… · CNT-26 Jamais de donnée sensible dans un push : ni code, ni OTP, ni montant de commission, ni… · CNT-28 Un push de criticité 1 non ouvert sous 10 minutes déclenche le SMS (PUSH-REPLI-MIN) :… *(calcul)* · CNT-31 Les messages de criticité 3 n’existent qu’en push. · CNT-33 Plafond non critique : 5 pushs par 24 h (PUSH-MAX-24H) ; au-delà, regroupement en un push… *(calcul)* · CNT-34 Regroupement : les événements d’une commande à moins de 10 min font un seul push. *(calcul)* · CNT-35 Mise en œuvre du regroupement : le second push remplace le premier (même étiquette), sans… · CNT-36 Nuit : pas de push sonore de 21 h à 7 h, sauf criticité 1 (PUSH-NUIT) ; les autres… *(calcul)* · CNT-37 Promotions : 3 par semaine au plus, entre 9 h et 20 h (PUSH-PROMO) ; catégorie désactivée… *(calcul)* · CNT-39 Déconnexion ou désinstallation : jeton révoqué. · CGA-24 Série : S0 J+1 push ; S1 J+2 SMS ; S2 J+4 SMS ; S3 J+5 push ; S4 J+6 push ; S5 jour du… *(calcul)*

**Règles côté serveur et écran** (9) : CNT-27 Le texte d’un push peut s’afficher sur l’écran verrouillé : il ne porte ni montant de… *(calcul)* · CNT-29 L’écran « Commande confirmée » affiché après le webhook vaut ouverture du C1 : avant… · CNT-30 Tout push ouvre l’écran exact concerné (lien profond avec la commande en paramètre) ;… · CNT-32 Titre 45 caractères au plus, corps 120 ; toujours actionnable ; français ou anglais selon… *(calcul)* · CNT-38 Jeton FCM au couple utilisateur + appareil ; jeton invalide supprimé ; plus aucun jeton :… · CNT-40 Trois accusés : envoyé, reçu, ouvert ; seul « ouvert » est un accusé fort ; un push «… · CGA-26 Heures d’envoi : S0, S1, S2 à 18 h 00, avant la fermeture du relais (comme le S1 du jeu… *(calcul)* · CGA-27 Chaque texte est rédigé à partir des « montants affichés » de 10.4 et complété par la… · CGA-28 S5 : « Frais retenus : [garde + 500] F (1 900 F au plus). *(calcul)*

**Règles côté écran** (1) : CGA-25 Quand le rang 7 (J+6) tombe un jour fermé, S3 devient « Dernier jour » (le jour J+5 est…

**Paramètres** : `PUSH-REPLI-MIN`, `PUSH-MAX-24H`, `PUSH-NUIT`, `PUSH-PROMO`, `NOT-GROUPE`, `GARDE-RAPPEL-H`

<a id="sms"></a>
### `#sms` — Aperçu · SMS

CL-10 · lancement · menu : Aide et messages › Rendu des SMS

**Documentation** : décrite dans CL-10

**Sections** : CL-10 « Aperçu « SMS » et page du lien court »

**Voir aussi, règles transverses** : « Le service d’envoi et le journal » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#sms` Aperçu SMS · C3 code de retrait · `#sms?st=c3v` Aperçu SMS · C3 d’une commande « Validée » · `#sms?st=c1` Aperçu SMS · C1 paiement protégé · `#sms?st=c4` Aperçu SMS · C4 incident · `#sms?st=c12` Aperçu SMS · C12 remerciement · `#sms?st=renvoi` Aperçu SMS · renvoi payant du code · `#sms?st=otp` Aperçu SMS · code de vérification

**Captures** : CL-10 fig. 14 `SMS_c3` · CL-10 fig. 15 `SMS_c3v` · CL-10 fig. 16 `SMS_c1` · CL-10 fig. 17 `SMS_c4` · CL-10 fig. 18 `SMS_c12` · CL-10 fig. 19 `SMS_renvoi` · CL-10 fig. 20 `SMS_otp`

**Règles côté serveur** (6) : CSM-02 Au plus 6 SMS payants par commande (SMS-MAX-CMD) : C1 paiement protégé, C3 code de… *(calcul)* · CSM-08 C4 incident (retard, échec, rupture, dissociation ; annulation par BelivaY) : criticité… *(calcul)* · CSM-11 Tout le reste (colis intermédiaire C2a, livreur en route, rappels S3 à S5, remboursement)… · CSM-13 Niveaux de criticité : 1 Vital (le parcours échoue sans ce message ; SMS en repli, alerte… · CSM-14 Mode économique : sous un seuil de panier (SMS-ECO, à trancher), seuls C3 et C4 partent… *(À trancher)* · CSM-15 Jamais de SMS de promotion, jamais de SMS de criticité 3, jamais plus de 6 SMS payants…

**Règles côté serveur et écran** (10) : CSM-01 Un SMS ne part que si son absence coûte plus cher que son envoi ; texte sans accents… *(calcul)* · CSM-03 C1 : paiement confirmé, si le push n’est pas ouvert à 10 minutes ; le texte ne porte pas… *(calcul)* · CSM-04 C3 : avec l’arrivée du dernier colis du groupe, en même temps que le push C2,… · CSM-05 C3 : le code est placé en fin de message, après le relais et la garde, pour que l’aperçu… · CSM-06 C3 d’une commande « Validée » : pas de code avant le paiement sur place ; le SMS… · CSM-10 C12 part au toucher de « Tout est en ordre », sinon 1 h après la remise (MSG-C12-DELAI) ;… *(calcul)* · CSM-12 Renvoi payant du code : à la demande d’un client sans application, 3 par commande et par… *(calcul)* · CSM-17 Les SMS de criticité 2 (S1, S2, C12) partent entre 7 h et 21 h ; la nuit, seuls la… *(calcul)* · CSM-18 Lien court : jeton aléatoire de 8 caractères (LIEN-COURT-LONG), page personnelle sans… · CSM-19 WhatsApp reporté : QR, photo du relais et preuve diaspora passent par SMS avec lien court…

**Règles côté écran** (1) : CSM-09 C12 : après le retrait, avec le lien de l’avis, jamais de promotion.

**Règles non classées** (2) : CSM-07 S1 (J+2) et S2 (J+4) : montant dû, passage à 200 F puis 400 F par jour, date limite, et… · CSM-16 Aucun message vers un numéro non vérifié, sauf le code de vérification (OTP) ; l’OTP est…

**Paramètres** : `SMS-MAX-CMD`, `SMS-ECO`, `CODE-RENVOI`, `INC-NOTIF-MIN`, `MSG-C12-DELAI`, `LIEN-COURT-LONG`

<a id="lien-court"></a>
### `#lien-court` — Aperçu · lien court

CL-10 · lancement · menu : Aide et messages › Page du lien court

**Documentation** : décrite dans CL-10

**Sections** : CL-10 « Aperçu « SMS » et page du lien court »

**Voir aussi, règles transverses** : « Le service d’envoi et le journal » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#lien-court` Aperçu · page du lien court · QR, code et relais · `#lien-court?st=retire` Aperçu · page du lien court · colis retiré

**Captures** : CL-10 fig. 21 `LienCourt` · CL-10 fig. 22 `LienCourt_retire`

**Règles côté serveur** (6) : CSM-02 Au plus 6 SMS payants par commande (SMS-MAX-CMD) : C1 paiement protégé, C3 code de… *(calcul)* · CSM-08 C4 incident (retard, échec, rupture, dissociation ; annulation par BelivaY) : criticité… *(calcul)* · CSM-11 Tout le reste (colis intermédiaire C2a, livreur en route, rappels S3 à S5, remboursement)… · CSM-13 Niveaux de criticité : 1 Vital (le parcours échoue sans ce message ; SMS en repli, alerte… · CSM-14 Mode économique : sous un seuil de panier (SMS-ECO, à trancher), seuls C3 et C4 partent… *(À trancher)* · CSM-15 Jamais de SMS de promotion, jamais de SMS de criticité 3, jamais plus de 6 SMS payants…

**Règles côté serveur et écran** (10) : CSM-01 Un SMS ne part que si son absence coûte plus cher que son envoi ; texte sans accents… *(calcul)* · CSM-03 C1 : paiement confirmé, si le push n’est pas ouvert à 10 minutes ; le texte ne porte pas… *(calcul)* · CSM-04 C3 : avec l’arrivée du dernier colis du groupe, en même temps que le push C2,… · CSM-05 C3 : le code est placé en fin de message, après le relais et la garde, pour que l’aperçu… · CSM-06 C3 d’une commande « Validée » : pas de code avant le paiement sur place ; le SMS… · CSM-10 C12 part au toucher de « Tout est en ordre », sinon 1 h après la remise (MSG-C12-DELAI) ;… *(calcul)* · CSM-12 Renvoi payant du code : à la demande d’un client sans application, 3 par commande et par… *(calcul)* · CSM-17 Les SMS de criticité 2 (S1, S2, C12) partent entre 7 h et 21 h ; la nuit, seuls la… *(calcul)* · CSM-18 Lien court : jeton aléatoire de 8 caractères (LIEN-COURT-LONG), page personnelle sans… · CSM-19 WhatsApp reporté : QR, photo du relais et preuve diaspora passent par SMS avec lien court…

**Règles côté écran** (1) : CSM-09 C12 : après le retrait, avec le lien de l’avis, jamais de promotion.

**Règles non classées** (2) : CSM-07 S1 (J+2) et S2 (J+4) : montant dû, passage à 200 F puis 400 F par jour, date limite, et… · CSM-16 Aucun message vers un numéro non vérifié, sauf le code de vérification (OTP) ; l’OTP est…

**Paramètres** : `SMS-MAX-CMD`, `SMS-ECO`, `CODE-RENVOI`, `INC-NOTIF-MIN`, `MSG-C12-DELAI`, `LIEN-COURT-LONG`

**API** : `GET /r/{token}`

<a id="litige"></a>
### `#litige` — Signaler un problème

CL-11 · lancement · onglet commandes · menu : Mes commandes › Signaler un problème

**Documentation** : décrite dans CL-11

**Sections** : CL-11 « Assistant de litige · étapes 1 et 2 » ; CL-11 « Assistant · étape 3 « Montre-moi » » ; CL-11 « Assistant · étape 4 « Que veux-tu ? » »

**Voir aussi, règles transverses** : « Le parcours du litige, du retour et du remplacement » ; « Règles d’arbitrage (serveur et console) » ; « IFA — indice de fiabilité acheteur (interne, jamais affiché) » ; « Textes d’aide et règles publiées : litiges et retours » ; « Pour le développeur : API, événements, messages et routes » ; « Valeurs du jeu d’essai, arbitrages et écarts relevés »

**États** : `#litige?ref=BLV-52018&etape=1` Litige · assistant, étape 1 « Quel colis ? » (2 colis) · `#litige?ref=BLV-51702` Litige · assistant, étape 2 « Que s’est-il passé ? » (1 colis) · `#litige?ref=BLV-51388` Litige · étape 2, retrait de plus de 7 jours (défaut caché) · `#litige?ref=BLV-51702&etape=3&pb=abime` Litige · étape 3 « Montre-moi », sans photo · `#litige?ref=BLV-51702&etape=3&pb=abime&st=photo` Litige · étape 3, photos prises · `#litige?ref=BLV-51702&etape=3&pb=jamais` Litige · étape 3, « Jamais reçu » (photo facultative) · `#litige?ref=BLV-51702&etape=4&pb=abime` Litige · étape 4 « Que veux-tu ? »

**Captures** : CL-11 fig. 1 `Litige_etape1` · CL-11 fig. 2 `Litige_etape2` · CL-11 fig. 3 `Litige_etape2_vice` · CL-11 fig. 4 `Litige_etape3` · CL-11 fig. 5 `Litige_etape3_photo` · CL-11 fig. 6 `Litige_etape3_jamais` · CL-11 fig. 7 `Litige_etape4`

**Règles côté serveur** (2) : CLT-13 Photos prises par l’API caméra de l’application, envoyées au dossier (POST… · CLT-17 Dès la création, l’escrow de la sous-commande est retenu ; la libération automatique,…

**Règles côté serveur et écran** (5) : CLT-09 Au-delà de 7 jours après le retrait, le premier écran de l’assistant (étape 1, ou étape 2… *(calcul)* · CLT-11 Photo obligatoire, sauf pour « Jamais reçu » : sans photo, « Continuer » reste désactivé… *(calcul)* · CLT-15 Trois choix : « Être remboursé » (sur le moyen de paiement d’origine), « Être remplacé »… · CLT-18 « Je veux juste signaler » n’ouvre pas de dossier LIT-… : ni argent retenu, ni délai du… · CLT-19 Le remboursement automatique sous le seuil ne s’applique qu’au souhait « Être remboursé »…

**Règles côté écran** (8) : CLT-04 Quatre écrans, un seul choix par écran ; barre de progression en quatre segments, flèche… · CLT-05 Étape 1 « Quel colis ? · CLT-06 Une commande à un seul colis démarre à l’étape 2 : l’étape 1 est sautée automatiquement… · CLT-07 Étape 2 « Que s’est-il passé ? · CLT-08 Un tap sélectionne et passe à l’étape suivante : l’étape 2 n’a pas de bouton « Continuer… · CLT-10 Texte exact : « Prends une photo de l’article et de son emballage. · CLT-12 « Décris ce qui s’est passé » est facultatif et placé en dernier. · CLT-14 Aucun écran de l’assistant ne demande une preuve d’achat, la valeur du colis ou…

**Règles non classées** (1) : CLT-16 Le dossier est créé à la validation de l’étape 4, avec le colis, le motif, les photos, la…

**États et erreurs** : 8 cas (détail dans `pages.json`)

**API** : `POST /disputes` · `POST /disputes/{id}/photos · /disputes/{id}/messages`

<a id="litige-confirme"></a>
### `#litige-confirme` — Litige ouvert

CL-11 · lancement · onglet commandes · menu : Mes commandes › Litige ouvert

**Documentation** : décrite dans CL-11

**Sections** : CL-11 « Assistant · étape 4 « Que veux-tu ? » » ; CL-11 « Écran « Litige ouvert » (confirmation) »

**Voir aussi, règles transverses** : « Le parcours du litige, du retour et du remplacement » ; « Règles d’arbitrage (serveur et console) » ; « IFA — indice de fiabilité acheteur (interne, jamais affiché) » ; « Textes d’aide et règles publiées : litiges et retours » ; « Pour le développeur : API, événements, messages et routes » ; « Valeurs du jeu d’essai, arbitrages et écarts relevés »

**États** : `#litige-confirme?ref=BLV-51702&souhait=signal` Litige · « Je veux juste signaler » envoyé · `#litige-confirme?ref=BLV-51702` Litige ouvert · LIT-3044, argent bloqué, délai ferme · `#litige-confirme?ref=BLV-51388&colis=1` Litige ouvert · défaut caché, vendeur déjà payé

**Captures** : CL-11 fig. 8 `Litige_signal` · CL-11 fig. 9 `Litige_confirme` · CL-11 fig. 10 `Litige_confirme_vice`

**Règles côté serveur** (1) : CLT-17 Dès la création, l’escrow de la sous-commande est retenu ; la libération automatique,…

**Règles côté serveur et écran** (5) : CLT-15 Trois choix : « Être remboursé » (sur le moyen de paiement d’origine), « Être remplacé »… · CLT-18 « Je veux juste signaler » n’ouvre pas de dossier LIT-… : ni argent retenu, ni délai du… · CLT-19 Le remboursement automatique sous le seuil ne s’applique qu’au souhait « Être remboursé »… · CLT-20 La confirmation affiche : 1) le numéro de dossier (« LIT-3044 ») ; 2) l’état de l’argent,… · CLT-22 Défaut caché signalé après la fermeture de la fenêtre (vice caché, 100 jours) : l’argent… *(calcul)*

**Règles côté écran** (1) : CLT-21 L’écran dit qu’une personne de BelivaY suit le dossier jusqu’à la décision et que le…

**Règles non classées** (1) : CLT-16 Le dossier est créé à la validation de l’étape 4, avec le colis, le motif, les photos, la…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| seller_deadline = opened_at + 48 h | LIT-3044 : jeu. 24 sept. 10 h 15 + 48 h = sam. 26 sept. 10 h 15. LIT-3042 : mer. 23 sept. 17 h 15 + 48 h = ven. 25 sept. 17 h 15. |
| amount_held = somme des articles de la sous-commande | BLV-51702 : 16 500 + 6 500 = 23 000 F ; BLV-51877 : 15 800 F. |

**États et erreurs** : 2 cas (détail dans `pages.json`)

**API** : `POST /disputes`

<a id="litige-auto"></a>
### `#litige-auto` — Remboursé

CL-11 · lancement · onglet commandes · menu : Mes commandes › Remboursement automatique

**Documentation** : décrite dans CL-11

**Sections** : CL-11 « Écran « Remboursé » (remboursement automatique sous le seuil) »

**Voir aussi, règles transverses** : « Le parcours du litige, du retour et du remplacement » ; « Règles d’arbitrage (serveur et console) » ; « IFA — indice de fiabilité acheteur (interne, jamais affiché) » ; « Textes d’aide et règles publiées : litiges et retours » ; « Pour le développeur : API, événements, messages et routes » ; « Valeurs du jeu d’essai, arbitrages et écarts relevés »

**États** : `#litige-auto` Remboursement automatique · palier Standard (3 000 F) · `#litige-auto?palier=eleve` Remboursement automatique · palier Élevé (4 800 F)

**Captures** : CL-11 fig. 11 `Litige_auto` · CL-11 fig. 12 `Litige_auto_eleve`

**Règles côté serveur et écran** (5) : CLT-23 Sous le seuil du palier, il n’y a pas d’écran de litige : « Remboursé. · CLT-24 Seuils : 3 000 F au palier Standard, 10 000 F au palier Élevé ; aucun remboursement… · CLT-25 Payé par BelivaY, vers le moyen d’origine ; le vendeur est payé normalement et son Trust… · CLT-26 L’écran ne montre jamais le palier : seulement le montant, le numéro masqué et le délai. · CLT-28 [délai] est un délai ferme de versement Mobile Money : « sous 1 h » dans le prototype. *(calcul)* *(À trancher)*

**Règles côté écran** (1) : CLT-27 Le client n’a rien à rapporter ; aucun suivi n’est ouvert.

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| montant ≤ seuil_auto(palier) ∧ souhait = rembourser ⇒ remboursement automatique | Vers le moyen d’origine ; compteur séparé « remboursés sans instruction » ; payé par BelivaY ; dispute.auto_refunded. |
| montant > seuil_auto(palier) ⇒ instruction | Dossier, escrow retenu, arbitrage humain ; dispute.opened. |
| remb_auto_12m ≥ N_auto ⇒ sortie de l’automatisme | Même au palier Élevé (CIF-17) : le litige suivant est instruit. |

**Paramètres** : `LIT-AUTO-STD`, `LIT-AUTO-ELEVE`, `(nouveau)`

**API** : `POST /disputes`

<a id="litige-comptoir"></a>
### `#litige-comptoir` — Litige ouvert au comptoir

CL-11 · lancement · onglet commandes · menu : Mes commandes › Litige ouvert au comptoir

**Documentation** : décrite dans CL-11

**Sections** : CL-11 « Écran « Litige ouvert au comptoir » »

**Voir aussi, règles transverses** : « Le parcours du litige, du retour et du remplacement » ; « Règles d’arbitrage (serveur et console) » ; « IFA — indice de fiabilité acheteur (interne, jamais affiché) » ; « Textes d’aide et règles publiées : litiges et retours » ; « Pour le développeur : API, événements, messages et routes » ; « Valeurs du jeu d’essai, arbitrages et écarts relevés »

**États** : `#litige-comptoir` Litige ouvert au comptoir · LIT-3042 (fer) · `#litige-comptoir?ref=BLV-52018` Litige ouvert au comptoir · LIT-3045, un colis sur deux

**Captures** : CL-11 fig. 13 `Litige_comptoir` · CL-11 fig. 14 `Litige_comptoir_2colis`

**Règles côté serveur et écran** (2) : CLT-31 L’escrow est retenu immédiatement ; la garde est suspendue et le relais n’est pas payé… · CLT-33 BelivaY répond à un constat du relais sous 48 h ouvrées ; ce délai est affiché dans le… *(calcul)*

**Règles côté écran** (2) : CLT-30 Le gérant constate dans son application, photographie le déballage et garde le colis au… · CLT-32 L’écran client montre le dossier, l’argent retenu, le colis gardé sans frais, l’échéance…

**Règles non classées** (1) : CLT-29 Le litige au comptoir est la voie à privilégier : colis en main, gérant témoin.

**Paramètres** : `LIT-CONSTAT-H`

**API** : `POST /relay/disputes`

<a id="litige-suivi"></a>
### `#litige-suivi` — Suivi du litige

CL-11 · lancement · onglet commandes · menu : Mes commandes › Suivi du litige

**Documentation** : décrite dans CL-11

**Sections** : CL-11 « Écran « Suivi du litige » · pendant l’examen » ; CL-11 « Écran « Suivi du litige » · la décision » ; CL-11 « Feuille « Arrangement proposé par le vendeur » »

**Voir aussi, règles transverses** : « Le parcours du litige, du retour et du remplacement » ; « Règles d’arbitrage (serveur et console) » ; « IFA — indice de fiabilité acheteur (interne, jamais affiché) » ; « Textes d’aide et règles publiées : litiges et retours » ; « Pour le développeur : API, événements, messages et routes » ; « Valeurs du jeu d’essai, arbitrages et écarts relevés »

**États** : `#litige-suivi?id=LIT-3042&st=recu` Suivi du litige · Reçu · `#litige-suivi?id=LIT-3042` Suivi du litige · le vendeur a 48 h (31 h restantes) · `#litige-suivi?id=LIT-3042&st=conteste` Suivi du litige · le vendeur conteste · `#litige-suivi?id=LIT-3042&st=silence` Suivi du litige · vendeur sans réponse à 48 h · `#litige-suivi?id=LIT-3042&st=examen` Suivi du litige · en examen, preuves côte à côte · `#litige-suivi?id=LIT-3042&st=accepte` Suivi du litige · le vendeur accepte (remplacement) · `#litige-suivi?id=LIT-3042&st=rembourse` Décision · remboursement accordé · `#litige-suivi?id=LIT-3042&st=remplace` Décision · remplacement accordé · `#litige-suivi?id=LIT-3042&st=refuse` Décision · demande non retenue, motif écrit · `#litige-suivi?id=LIT-3042&st=arrangement` Suivi du litige · arrangement proposé

**Captures** : CL-11 fig. 15 `Suivi_recu` · CL-11 fig. 16 `Suivi_vendeur` · CL-11 fig. 17 `Suivi_conteste` · CL-11 fig. 18 `Suivi_silence` · CL-11 fig. 19 `Suivi_examen` · CL-11 fig. 20 `Suivi_accepte` · CL-11 fig. 21 `Suivi_rembourse` · CL-11 fig. 22 `Suivi_remplace` · CL-11 fig. 23 `Suivi_refuse` · CL-11 fig. 24 `Suivi_arrangement`

**Règles côté serveur** (3) : CLT-34 Suivi en quatre états en langage simple : Reçu → Le vendeur a 48 h pour répondre → En… *(calcul)* · CLT-37 Le vendeur a 48 h et trois réponses : accepter, contester (avec preuves), proposer un… *(calcul)* · CLT-41 Messagerie du dossier : fil tracé et gratuit, rattaché au dossier, photos par l’appareil…

**Règles côté serveur et écran** (9) : CLT-35 Le compte à rebours du vendeur est visible : t_limite_vendeur = t_ouverture + 48 h,… *(calcul)* · CLT-38 Vendeur silencieux à 48 h : le dossier passe en file d’arbitrage prioritaire avec… *(calcul)* · CLT-39 Délai ferme de la décision affiché pendant l’examen : au plus tard 24 h après l’échéance… *(calcul)* *(À trancher)* · CLT-43 Le client voit ses photos et celles du déballage, et la photo du colis scellé ; aucune… · CLT-45 Décisions possibles : remboursement (moyen d’origine, après réception et inspection du… · CLT-46 Après une décision de remboursement, l’écran mène à « Retourner un article » ; après un… · CLT-49 Un arrangement compte au moins 40 caractères ; il est montré au client tel que le vendeur… *(calcul)* · CLT-50 Accepter clôt le litige aux conditions proposées (remboursement partiel vers le moyen… · CLT-51 Délai de réponse du client à un arrangement : absent de la v3 (5 jours chez le relais et… *(calcul)* *(À trancher)*

**Règles côté écran** (6) : CLT-36 Dans Mes commandes, la carte dit « En litige · réponse sous X h » et porte le numéro de… · CLT-40 Pendant tout le litige, l’argent reste bloqué (« rien n’est versé au vendeur ») et le… · CLT-42 La décision repose sur la chaîne de preuves, côte à côte en console : photos du livreur… · CLT-44 Jamais de refus sans motif écrit : le motif est obligatoire en console pour toute… · CLT-47 Débouté : le paiement est versé au vendeur, le colis gardé est rendu au client au… · CLT-48 Coût du retour attribué après arbitrage (vendeur, transporteur ou client en tort), jamais…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| heures_restantes = floor((t_limite − t_now) / 1 h) | LIT-3042 à jeu. 10 h 15 : ven. 17 h 15 − jeu. 10 h 15 = 31 h 00 → « 31 h », comme le libellé du jeu d’essai (« En litige · réponse sous 31 h », CL-02). |
| t_now ≥ t_limite ∧ aucune réponse ⇒ file d’arbitrage prioritaire | Présomption client ; décision humaine journalisée (chapitre 18) ; dispute.decided seulement à la validation humaine. |
| décision_au_plus_tard = t_limite_vendeur + 24 h (proposé) | Même délai pour tous les paliers (délai_traitement(palier) = constante). |
| litige ouvert ⇒ libération, C10 et garde suspendus | Pour la sous-commande concernée (chapitre 10). |

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| arrangement ⇒ len(texte) ≥ 40 | Proposé au client, qui accepte ou refuse (LIT-ARRANG-MIN). |

**Paramètres** : `LIT-VENDEUR-H`, `LIT-ARRANG-MIN`, `(nouveau)`

**États et erreurs** : 2 cas (détail dans `pages.json`)

**API** : `GET /disputes/{id} · /me/disputes`

<a id="litige-arrangement"></a>
### `#litige-arrangement` — Arrangement proposé

CL-11 · lancement · onglet commandes · menu : Mes commandes › Arrangement du vendeur

**Documentation** : décrite dans CL-11

**Sections** : CL-11 « Feuille « Arrangement proposé par le vendeur » »

**Voir aussi, règles transverses** : « Le parcours du litige, du retour et du remplacement » ; « Règles d’arbitrage (serveur et console) » ; « IFA — indice de fiabilité acheteur (interne, jamais affiché) » ; « Textes d’aide et règles publiées : litiges et retours » ; « Pour le développeur : API, événements, messages et routes » ; « Valeurs du jeu d’essai, arbitrages et écarts relevés »

**États** : `#litige-arrangement` Arrangement · feuille de la proposition du vendeur · `#litige-arrangement?st=accepte` Arrangement · accepté, litige clos · `#litige-arrangement?st=refuse` Arrangement · refusé, BelivaY examine

**Captures** : CL-11 fig. 25 `Arrangement` · CL-11 fig. 26 `Arrangement_accepte` · CL-11 fig. 27 `Arrangement_refuse`

**Règles côté serveur et écran** (3) : CLT-49 Un arrangement compte au moins 40 caractères ; il est montré au client tel que le vendeur… *(calcul)* · CLT-50 Accepter clôt le litige aux conditions proposées (remboursement partiel vers le moyen… · CLT-51 Délai de réponse du client à un arrangement : absent de la v3 (5 jours chez le relais et… *(calcul)* *(À trancher)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| arrangement ⇒ len(texte) ≥ 40 | Proposé au client, qui accepte ou refuse (LIT-ARRANG-MIN). |

**API** : `POST /disputes/{id}/photos · /disputes/{id}/messages`

<a id="litiges"></a>
### `#litiges` — Mes litiges

CL-11 · lancement · onglet commandes · menu : Mes commandes › Mes litiges

**Documentation** : décrite dans CL-11

**Sections** : CL-11 « Écran « Mes litiges » »

**Voir aussi, règles transverses** : « Le parcours du litige, du retour et du remplacement » ; « Règles d’arbitrage (serveur et console) » ; « IFA — indice de fiabilité acheteur (interne, jamais affiché) » ; « Textes d’aide et règles publiées : litiges et retours » ; « Pour le développeur : API, événements, messages et routes » ; « Valeurs du jeu d’essai, arbitrages et écarts relevés »

**États** : `#litiges` Mes litiges (depuis le Compte) · `#litiges?st=vide` Mes litiges · aucun litige

**Captures** : CL-11 fig. 28 `Litiges` · CL-11 fig. 29 `Litiges_vide`

**Règles côté serveur et écran** (1) : CLT-53 Les remboursements automatiques figurent dans « Terminés » avec leur montant et « sans…

**Règles côté écran** (2) : CLT-52 « Mes litiges », accessible depuis le compte : dossiers en cours puis terminés, chacun… · CLT-54 Tant qu’un litige est en cours, « Supprimer mon compte » est refusé (CL-13).

**API** : `GET /disputes/{id} · /me/disputes`

<a id="retour"></a>
### `#retour` — Retourner un article

CL-11 · lancement · onglet commandes · menu : Mes commandes › Retourner un article

**Documentation** : décrite dans CL-11

**Sections** : CL-11 « Écran « Retourner un article » · les quatre étapes » ; CL-11 « Retour · motifs, fenêtre, qui paie et cas particuliers »

**Voir aussi, règles transverses** : « Le parcours du litige, du retour et du remplacement » ; « Règles d’arbitrage (serveur et console) » ; « IFA — indice de fiabilité acheteur (interne, jamais affiché) » ; « Textes d’aide et règles publiées : litiges et retours » ; « Pour le développeur : API, événements, messages et routes » ; « Valeurs du jeu d’essai, arbitrages et écarts relevés »

**États** : `#retour?ref=BLV-52018` Retour · onglet de l’écran de retrait, aucun retour en cours · `#retour?ref=BLV-51702&st=depot` Retour · à déposer au relais · `#retour?ref=BLV-51702&st=depose` Retour · déposé et scanné au relais · `#retour?ref=BLV-51702&st=collecte` Retour · récupéré par le livreur · `#retour?ref=BLV-51702&st=inspection` Retour · inspection du vendeur (48 h) · `#retour?ref=BLV-51702&st=clos` Retour · clos et remboursé · `#retour?ref=BLV-51702&st=delai` Retour · vendeur sans réponse, remboursement automatique · `#retour?ref=BLV-51877&st=gratuit` Retour · colis déjà au relais, gratuit · `#retour?ref=BLV-51702&st=tort` Retour · trajet à la charge du client · `#retour?st=volumineux` Retour · colis XL collecté à domicile · `#retour?ref=BLV-51388&st=sans-retour` Retour · remboursé sans retour physique · `#retour?ref=BLV-51388&st=hors-delai` Retour · hors délai, défaut caché possible

**Captures** : CL-11 fig. 30 `Retour_aucun` · CL-11 fig. 31 `Retour_depot` · CL-11 fig. 32 `Retour_depose` · CL-11 fig. 33 `Retour_collecte` · CL-11 fig. 34 `Retour_inspection` · CL-11 fig. 35 `Retour_clos` · CL-11 fig. 36 `Retour_delai` · CL-11 fig. 37 `Retour_gratuit` · CL-11 fig. 38 `Retour_tort` · CL-11 fig. 39 `Retour_volumineux` · CL-11 fig. 40 `Retour_sans` · CL-11 fig. 41 `Retour_hors`

**Règles côté serveur** (5) : CRO-08 Le remboursement est déclenché à la réception physique et à l’inspection par le vendeur,… · CRO-09 Inspection sous 48 h après réception ; sans réponse du vendeur, remboursement automatique. *(calcul)* · CRO-13 Motifs recevables : non conforme, abîmé, contrefaçon, défaut caché signalé dans les 48 h… *(calcul)* · CRO-16 Vice caché : couvert 100 jours, hors escrow (le vendeur est déjà payé) ; traité comme un… *(calcul)* · CRO-18 Voie à privilégier : le constat au comptoir (chapitre 11), colis en main, gérant témoin.

**Règles côté serveur et écran** (7) : CRO-10 Toujours vers le moyen de paiement d’origine ; message au client (push) avec le montant… · CRO-15 Fenêtre : 7 jours après le retrait effectif, fermée plus tôt par « Tout est en ordre » au… *(calcul)* · CRO-17 Hors fenêtre : pas de retour ; l’écran le dit, avec la date de fermeture, et propose «… *(calcul)* · CRO-19 Carte diaspora : mêmes règles ; remboursement sur la carte du payeur. · CRO-20 Qui paie le trajet : attribué après arbitrage sur preuves — vendeur en tort : à sa charge… · CRO-24 Sous un petit seuil, remboursement sans retour physique : le trajet coûterait plus que… *(À trancher)* · CRO-25 Défaut caché découvert entre 48 h et 7 jours après le retrait (escrow encore bloqué) : la… *(calcul)* *(À trancher)*

**Règles côté écran** (8) : CRO-01 « Retourner un article » est le deuxième onglet de l’écran de retrait (« Au comptoir » /… · CRO-02 « Tu n’as rien à organiser » : le client rapporte le colis au relais ; le livreur le… · CRO-04 Encart « Tes [montant] F restent bloqués jusqu’à la clôture. · CRO-05 Bouton « J’ai déposé le colis au relais » ; il ne vaut pas preuve : l’étape 1 ne passe à… · CRO-12 La page « Règles des retours et des litiges » est accessible depuis l’écran de retour. · CRO-14 Pas de retour sans motif (changement d’avis) au lancement ; plus de compteur « retours… · CRO-21 Tant que la décision n’est pas rendue, le client lit « Retour gratuit si le problème est… · CRO-22 Prix du trajet retour : absent de la v3 ; le relais et le vendeur retiennent 500 F. *(À trancher)*

**Règles non classées** (5) : CRO-03 Quatre étapes : tu déposes le colis au relais (le gérant le scanne) → le livreur le… · CRO-06 Aucun frais de garde sur un colis en retour ; il ne compte pas dans la capacité déclarée… · CRO-07 Le trajet retour est une course normale de l’entreprise de livraison, publiée avec les… · CRO-11 Le colis gardé au relais depuis un constat n’est pas redéposé : l’étape 1 est déjà faite… · CRO-23 Colis volumineux (XL, hors gabarit) : collecte à domicile par l’entreprise de livraison…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| remboursement ⇐ réception ∧ inspection (≤ 48 h) | Sans réponse du vendeur à 48 h : automatique. BLV-51702 : reçu sam. 26 sept. 14 h 20 → échéance lun. 28 sept. 14 h 20. |
| garde(colis en retour) = 0 | Hors capacité déclarée du relais. |

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| retour_possible ⇔ motif ∈ {non conforme, abîmé, contrefaçon, défaut caché ≤ 48 h} ∧ t ≤ t_retrait + 7 j ∧ ¬tout_en_ordre | Vice caché : 100 jours, hors escrow. BLV-51388 : 28 août + 7 j = ven. 4 sept. ; + 100 j = dim. 6 déc. |
| payeur_trajet = partie en tort (arbitrage) | Client en tort : retenu sur le remboursement (23 000 − 500 = 22 500 F). |
| valeur ≤ seuil_sans_retour ⇒ remboursement sans retour | Seuil à fixer entre 3 000 et 5 000 F (4 800 F ≤ 5 000 F proposé). |

**Paramètres** : `RET-INSPECT-H`, `RET-FENETRE`, `RET-DEFAUT-H`, `RET-VICE`, `RET-SANS-RETOUR`, `LIV-XL-RELAIS`, `RELAIS-GAIN-COLIS`, `(nouveau)`

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `POST · GET /returns · /returns/{id} · /returns/{id}/inspection` · `POST /relay/returns/{id}/deposit`

<a id="remplacement"></a>
### `#remplacement` — Remplacement

CL-11 · lancement · onglet commandes · menu : Mes commandes › Remplacement

**Documentation** : décrite dans CL-11

**Sections** : CL-11 « Écran « Remplacement » »

**Voir aussi, règles transverses** : « Le parcours du litige, du retour et du remplacement » ; « Règles d’arbitrage (serveur et console) » ; « IFA — indice de fiabilité acheteur (interne, jamais affiché) » ; « Textes d’aide et règles publiées : litiges et retours » ; « Pour le développeur : API, événements, messages et routes » ; « Valeurs du jeu d’essai, arbitrages et écarts relevés »

**États** : `#remplacement` Remplacement · délai ferme du vendeur · `#remplacement?st=expedie` Remplacement · nouveau fer en route · `#remplacement?st=retard` Remplacement · délai dépassé, remboursement automatique · `#remplacement?st=autre` Remplacement · autre vendeur proposé · `#remplacement?st=remis` Remplacement · remis, dossier clos

**Captures** : CL-11 fig. 42 `Remplacement` · CL-11 fig. 43 `Remplacement_expedie` · CL-11 fig. 44 `Remplacement_retard` · CL-11 fig. 45 `Remplacement_autre` · CL-11 fig. 46 `Remplacement_remis`

**Règles côté serveur** (1) : CRP-05 L’escrow reste retenu jusqu’à la clôture : réception du retour, ou remise du remplacement.

**Règles côté serveur et écran** (3) : CRP-02 Le vendeur a un délai ferme pour renvoyer, affiché en date et heure : 72 h ouvrées… *(calcul)* *(À trancher)* · CRP-03 Passé ce délai sans expédition, bascule automatique en remboursement (replacement.late),… · CRP-04 S’il n’a plus l’article : proposition d’un autre vendeur du même produit (Trust Score ≥… *(calcul)*

**Règles côté écran** (4) : CRP-01 Le remplacement repart comme une nouvelle expédition, sans frais de livraison pour le… · CRP-06 Le colis de remplacement a son propre code de retrait, dans Mes commandes, jamais dans… · CRP-07 L’article défectueux repart du relais vers le vendeur dans la tournée, sans action du… · CRP-08 Le souhait « Être remplacé » vaut accord du client : le vendeur qui accepte expédie sans…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| t ≥ délai_remplacement ∧ non expédié ⇒ remboursement | Délai à trancher ; accord jeu. 24 sept. 09 h 40 + 72 h ouvrées (dimanche exclu) = lun. 28 sept. 09 h 40 ; décision sam. 26 sept. 11 h 20 → mer. 30 sept. 11 h 20. |
| écart = prix_livré(autre vendeur) − prix_livré(vendeur initial) | 16 400 − 15 800 = 600 F (3,8 % ≤ 5 %), payé par BelivaY. |

**Paramètres** : `RET-REMPL-DELAI`, `REMPL-TRUST-MIN`, `REMPL-ECART`

**États et erreurs** : 2 cas (détail dans `pages.json`)

**API** : `GET /replacements/{id}`

<a id="modifier"></a>
### `#modifier` — Modifier ma commande

CL-12 · lancement · onglet commandes · menu : Mes commandes › Modifier ma commande

**Documentation** : décrite dans CL-12

**Sections** : CL-12 « Écran « Annuler ma commande » et onglet « Annuler » » ; CL-12 « Changer l’adresse à domicile et autres modifications » ; CL-12 « Onglet « Payer de l’étranger » — côté client »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#modifier?ref=BLV-52107` Modifier ma commande · onglet Annuler (depuis la commande) · `#modifier?ref=BLV-52096&onglet=relais` Modifier · livraison à domicile (BLV-52096), onglet Changer d’adresse · `#modifier?ref=BLV-52107&onglet=etranger` Modifier · onglet Payer de l’étranger (client) · `#modifier?ref=BLV-52107&onglet=etranger&st=partager` Payer de l’étranger · envoyer son panier (partage du téléphone) · `#modifier?ref=BLV-52124&onglet=etranger` Payer de l’étranger · commande payée par un proche (BLV-52124)

**Captures** : CL-12 fig. 4 `Annuler_onglet` · CL-12 fig. 17 `Modifier_domicile` · CL-12 fig. 21 `Etranger` · CL-12 fig. 22 `Etranger_partager` · CL-12 fig. 23 `Etranger_paye_par`

**Règles côté serveur** (5) : CAN-02 Ce qui est possible dépend de l’état réel de chaque sous-commande, jamais d’un délai en… · CAN-11 F = Ram + Rem − Off ; F_après = F(commande sans la boutique), recalcul complet ; une… *(calcul)* · CAN-13 Exemple BLV-52107 : annuler B (84 000 F) → F_avant 880 F, F_après 500 F → 84 380 F… *(calcul)* · CAN-19 Effets en chaîne : escrow dénoué et remboursement Mobile Money sans validation humaine ;… · CMO-05 Résiliation d’abonnement avec une commande en cours : l’avantage reste acquis, jamais de…

**Règles côté serveur et écran** (15) : CAN-06 Payée, vendeur pas confirmé (« Pas encore confirmée ») : annulation libre, en un tap,… · CAN-07 Confirmée ou prête, pas encore collectée : annulation possible, après une feuille qui… · CAN-08 L’état « prête » (« Prêt dans X h ») reste annulable : l’annulation se ferme à la… · CAN-09 Collectée (emballée et scellée par le livreur) ou arrivée au relais : bloc grisé «… · CAN-10 Encart « Remboursement immédiat » : aucun frais, aucune validation ; frais recalculés… · CAN-12 Remb = P_sc + max(0, F_avant − F_après) : le client récupère toujours au moins le prix de… *(calcul)* · CAN-14 Le motif se choisit une seule fois, à l’étape 1 (feuille « Annulation » de Mes commandes,… · CAN-16 Après l’annulation : bandeau « Boutique B annulée · 84 380 F remboursés », boutiques… *(calcul)* · CAN-17 Si toutes les boutiques sont annulées, la commande passe « annulée » et va dans «… · CAN-18 Plafond d’annulations après confirmation (ANN-PLAFOND) : au-delà, le palier IFA « À… *(calcul)* *(À trancher)* · CMO-02 Choix parmi les adresses par repères enregistrées, ou « Ajouter une adresse par repères »… · CET-02 Le panier part par le partage natif du téléphone du client (WhatsApp souvent en premier,… · CET-03 Avant de partager, le client voit si son panier dépasse le plafond de la carte (272 579 F… *(calcul)* · CET-04 Le client voit qui a payé (« Payée par Hervé, depuis la France · par carte, aujourd’hui à… *(calcul)* · CET-05 Le code de retrait va au bénéficiaire seul ; tout remboursement va sur la carte du…

**Règles côté écran** (8) : CAN-01 L’écran « Modifier ma commande » a trois onglets : « Annuler », « Changer de relais », «… · CAN-03 Titre « Annuler ma commande », numéro et nombre de boutiques, puis « Tu peux annuler… · CAN-04 Une carte par boutique : libellé neutre (« Boutique B · Colis 2 »), barre de couleur du… · CAN-05 Chaque carte annulable affiche, avant tout geste, le montant que le client récupère (« Si… · CAN-15 Quantité : impossible à modifier après paiement ; la carte d’une boutique à plusieurs… · CMO-01 Adresse à domicile : modifiable avant la collecte seulement, gratuitement, même logique… · CMO-03 Colis récupéré, en route : adresse figée ; la feuille montre le livreur (prénom, photo,… · CET-01 Onglet « Payer de l’étranger » : phrase du panier (« Quelqu’un paie pour toi ?

**Règles non classées** (1) : CMO-04 Quantité : impossible après paiement ; annuler la sous-commande et recommander (rappel…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| annulable(sc) ⇔ état(sc) < collectée (payée, confirmée, prête) | Contrôlé côté serveur au clic ; parcel.collected ferme l’annulation (CAN-08). |
| F = Ram + Rem − Off | Ram : 500 F le premier ramassage d’une zone, 380 F les suivants de la même zone ; Rem 400 F (relais) ou 1 000 F (domicile) ; Off = livraison de base offerte (900 F relais dès 30 000 F, 1 500 F domicile dès 50 000 F). |
| F_après = F(commande sans sc), Off conservé | Recalcul complet, jamais une soustraction de ligne ; une livraison offerte au paiement le reste. |
| Remb = P_sc + max(0, F_avant − F_après) | Le client récupère toujours au moins le prix de la boutique ; vers le moyen d’origine. |
| annulations_après_confirmation ≥ ANN-PLAFOND ⇒ « À instruire » proposé | Plafond à trancher ; validation humaine ; aucun effet sur le vendeur ; invisible pour le client. |

**Paramètres** : `ANN-PLAFOND`, `LIV-R · LIV-DELTA`, `LIV-REM-RELAIS · LIV-REM-DOM`, `LIV-SEUIL-RELAIS · LIV-SEUIL-DOM`

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `POST /carts/{id}/share` · `GET /orders/{id}/manage`

<a id="annuler"></a>
### `#annuler` — Annuler ma commande

CL-12 · lancement · onglet commandes · menu : Mes commandes › Annuler une boutique

**Documentation** : décrite dans CL-12

**Sections** : CL-12 « Écran « Annuler ma commande » et onglet « Annuler » » ; CL-12 « Annuler : colis récupéré, état changé, hors ligne » ; CL-12 « Annulation par le vendeur ou par BelivaY »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#annuler?ref=BLV-52107&motif=avis` Annuler ma commande · étape 2 après le motif (depuis Mes commandes) · `#annuler?ref=BLV-52107&st=arrivee` Annuler · colis arrivés ou récupérés, annulation impossible · `#annuler?ref=BLV-52107&st=change` Annuler · état changé entre-temps · `#annuler?ref=BLV-52107&st=horsligne` Annuler · hors ligne, bouton remplacé · `#annuler?ref=BLV-52107&st=vendeur-suivant` Annuler · rupture, vendeur suivant · `#annuler?ref=BLV-51533` Commande annulée par le vendeur (BLV-51533) · `#annuler?ref=BLV-52107&st=belivay` Annuler · boutique C annulée par BelivaY

**Captures** : CL-12 fig. 1 `Annuler` · CL-12 fig. 5 `Annuler_impossible` · CL-12 fig. 6 `Annuler_etat_change` · CL-12 fig. 7 `Annuler_hors_ligne` · CL-12 fig. 8 `Annuler_vendeur_suivant` · CL-12 fig. 9 `Annuler_par_vendeur` · CL-12 fig. 10 `Annuler_par_BelivaY`

**Règles côté serveur** (5) : CAN-02 Ce qui est possible dépend de l’état réel de chaque sous-commande, jamais d’un délai en… · CAN-11 F = Ram + Rem − Off ; F_après = F(commande sans la boutique), recalcul complet ; une… *(calcul)* · CAN-13 Exemple BLV-52107 : annuler B (84 000 F) → F_avant 880 F, F_après 500 F → 84 380 F… *(calcul)* · CAN-19 Effets en chaîne : escrow dénoué et remboursement Mobile Money sans validation humaine ;… · CAN-28 Une annulation par BelivaY faute d’entreprise de livraison dans la zone est tracée en…

**Règles côté serveur et écran** (15) : CAN-06 Payée, vendeur pas confirmé (« Pas encore confirmée ») : annulation libre, en un tap,… · CAN-07 Confirmée ou prête, pas encore collectée : annulation possible, après une feuille qui… · CAN-08 L’état « prête » (« Prêt dans X h ») reste annulable : l’annulation se ferme à la… · CAN-09 Collectée (emballée et scellée par le livreur) ou arrivée au relais : bloc grisé «… · CAN-10 Encart « Remboursement immédiat » : aucun frais, aucune validation ; frais recalculés… · CAN-12 Remb = P_sc + max(0, F_avant − F_après) : le client récupère toujours au moins le prix de… *(calcul)* · CAN-14 Le motif se choisit une seule fois, à l’étape 1 (feuille « Annulation » de Mes commandes,… · CAN-16 Après l’annulation : bandeau « Boutique B annulée · 84 380 F remboursés », boutiques… *(calcul)* · CAN-17 Si toutes les boutiques sont annulées, la commande passe « annulée » et va dans «… · CAN-18 Plafond d’annulations après confirmation (ANN-PLAFOND) : au-delà, le palier IFA « À… *(calcul)* *(À trancher)* · CAN-20 L’état est contrôlé côté serveur au clic ; s’il a changé entre-temps, refus avec un… *(calcul)* · CAN-22 Commande « Validée · à payer au retrait » déjà arrivée : annulation impossible ; au… · CAN-24 Rupture après confirmation : d’abord le vendeur suivant du même produit (Trust Score ≥… *(calcul)* · CAN-25 Sans vendeur suivant : remboursement intégral le jour même, frais recalculés ; la… · CAN-27 Annulation par BelivaY (fraude, vendeur suspendu, zone inaccessible, aucune entreprise de…

**Règles côté écran** (8) : CAN-01 L’écran « Modifier ma commande » a trois onglets : « Annuler », « Changer de relais », «… · CAN-03 Titre « Annuler ma commande », numéro et nombre de boutiques, puis « Tu peux annuler… · CAN-04 Une carte par boutique : libellé neutre (« Boutique B · Colis 2 »), barre de couleur du… · CAN-05 Chaque carte annulable affiche, avant tout geste, le montant que le client récupère (« Si… · CAN-15 Quantité : impossible à modifier après paiement ; la carte d’une boutique à plusieurs… · CAN-21 Hors ligne : bannière « Hors ligne », cartes lues depuis le cache, action d’annulation… · CAN-23 Commande déjà retirée (terminée ou en litige) : « Plus rien à modifier » ; un souci passe… · CAN-26 La rupture pèse sur le Trust Score du vendeur défaillant ; jamais sur le client.

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| annulable(sc) ⇔ état(sc) < collectée (payée, confirmée, prête) | Contrôlé côté serveur au clic ; parcel.collected ferme l’annulation (CAN-08). |
| F = Ram + Rem − Off | Ram : 500 F le premier ramassage d’une zone, 380 F les suivants de la même zone ; Rem 400 F (relais) ou 1 000 F (domicile) ; Off = livraison de base offerte (900 F relais dès 30 000 F, 1 500 F domicile dès 50 000 F). |
| F_après = F(commande sans sc), Off conservé | Recalcul complet, jamais une soustraction de ligne ; une livraison offerte au paiement le reste. |
| Remb = P_sc + max(0, F_avant − F_après) | Le client récupère toujours au moins le prix de la boutique ; vers le moyen d’origine. |
| annulations_après_confirmation ≥ ANN-PLAFOND ⇒ « À instruire » proposé | Plafond à trancher ; validation humaine ; aucun effet sur le vendeur ; invisible pour le client. |

**Paramètres** : `ANN-PLAFOND`, `LIV-R · LIV-DELTA`, `LIV-REM-RELAIS · LIV-REM-DOM`, `LIV-SEUIL-RELAIS · LIV-SEUIL-DOM`, `REMPL-TRUST-MIN`, `REMPL-ECART`

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `GET /orders/{id}/manage`

<a id="annuler-confirmer"></a>
### `#annuler-confirmer` — Confirmer l’annulation

CL-12 · lancement · onglet commandes

**Documentation** : décrite dans CL-12

**Sections** : CL-12 « Écran « Annuler ma commande » et onglet « Annuler » »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#annuler-confirmer?ref=BLV-52107&boutique=B` Annuler · feuille de confirmation de la boutique B (calcul) · `#annuler-confirmer?ref=BLV-52107&boutique=B&st=fait` Annuler · boutique B annulée, remboursée

**Captures** : CL-12 fig. 2 `Annuler_confirmer` · CL-12 fig. 3 `Annuler_fait`

**Règles côté serveur** (4) : CAN-02 Ce qui est possible dépend de l’état réel de chaque sous-commande, jamais d’un délai en… · CAN-11 F = Ram + Rem − Off ; F_après = F(commande sans la boutique), recalcul complet ; une… *(calcul)* · CAN-13 Exemple BLV-52107 : annuler B (84 000 F) → F_avant 880 F, F_après 500 F → 84 380 F… *(calcul)* · CAN-19 Effets en chaîne : escrow dénoué et remboursement Mobile Money sans validation humaine ;…

**Règles côté serveur et écran** (10) : CAN-06 Payée, vendeur pas confirmé (« Pas encore confirmée ») : annulation libre, en un tap,… · CAN-07 Confirmée ou prête, pas encore collectée : annulation possible, après une feuille qui… · CAN-08 L’état « prête » (« Prêt dans X h ») reste annulable : l’annulation se ferme à la… · CAN-09 Collectée (emballée et scellée par le livreur) ou arrivée au relais : bloc grisé «… · CAN-10 Encart « Remboursement immédiat » : aucun frais, aucune validation ; frais recalculés… · CAN-12 Remb = P_sc + max(0, F_avant − F_après) : le client récupère toujours au moins le prix de… *(calcul)* · CAN-14 Le motif se choisit une seule fois, à l’étape 1 (feuille « Annulation » de Mes commandes,… · CAN-16 Après l’annulation : bandeau « Boutique B annulée · 84 380 F remboursés », boutiques… *(calcul)* · CAN-17 Si toutes les boutiques sont annulées, la commande passe « annulée » et va dans «… · CAN-18 Plafond d’annulations après confirmation (ANN-PLAFOND) : au-delà, le palier IFA « À… *(calcul)* *(À trancher)*

**Règles côté écran** (5) : CAN-01 L’écran « Modifier ma commande » a trois onglets : « Annuler », « Changer de relais », «… · CAN-03 Titre « Annuler ma commande », numéro et nombre de boutiques, puis « Tu peux annuler… · CAN-04 Une carte par boutique : libellé neutre (« Boutique B · Colis 2 »), barre de couleur du… · CAN-05 Chaque carte annulable affiche, avant tout geste, le montant que le client récupère (« Si… · CAN-15 Quantité : impossible à modifier après paiement ; la carte d’une boutique à plusieurs…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| annulable(sc) ⇔ état(sc) < collectée (payée, confirmée, prête) | Contrôlé côté serveur au clic ; parcel.collected ferme l’annulation (CAN-08). |
| F = Ram + Rem − Off | Ram : 500 F le premier ramassage d’une zone, 380 F les suivants de la même zone ; Rem 400 F (relais) ou 1 000 F (domicile) ; Off = livraison de base offerte (900 F relais dès 30 000 F, 1 500 F domicile dès 50 000 F). |
| F_après = F(commande sans sc), Off conservé | Recalcul complet, jamais une soustraction de ligne ; une livraison offerte au paiement le reste. |
| Remb = P_sc + max(0, F_avant − F_après) | Le client récupère toujours au moins le prix de la boutique ; vers le moyen d’origine. |
| annulations_après_confirmation ≥ ANN-PLAFOND ⇒ « À instruire » proposé | Plafond à trancher ; validation humaine ; aucun effet sur le vendeur ; invisible pour le client. |

**Paramètres** : `ANN-PLAFOND`, `LIV-R · LIV-DELTA`, `LIV-REM-RELAIS · LIV-REM-DOM`, `LIV-SEUIL-RELAIS · LIV-SEUIL-DOM`

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `POST /suborders/{id}/cancel`

<a id="changer-relais"></a>
### `#changer-relais` — Changer de point relais

CL-12 · lancement · onglet commandes · menu : Mes commandes › Changer de point relais

**Documentation** : décrite dans CL-12

**Sections** : CL-12 « Écran « Changer de point relais » — avant collecte et en tournée » ; CL-12 « Transfert d’un colis déjà arrivé (400 F) »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#changer-relais?ref=BLV-52107` Modifier · onglet Changer de relais, gratuit · `#changer-relais?ref=BLV-52107&st=choisi&relais=Essos` Changer de relais · confirmation (Essos) · `#changer-relais?ref=BLV-52107&st=tournee` Changer de relais · impossible pendant la tournée · `#changer-relais?ref=BLV-52018` Changer de relais · colis arrivés, transfert 400 F · `#changer-relais?ref=BLV-52018&st=payer&relais=Essos` Changer de relais · montant dû du transfert · `#changer-relais?ref=BLV-52018&st=fait&relais=Essos` Changer de relais · transfert demandé

**Captures** : CL-12 fig. 11 `Changer_relais` · CL-12 fig. 12 `Relais_confirmer` · CL-12 fig. 13 `Relais_tournee` · CL-12 fig. 14 `Relais_transfert` · CL-12 fig. 15 `Relais_transfert_payer` · CL-12 fig. 16 `Relais_fait`

**Règles côté serveur** (2) : CRL-10 La garde déjà comptée au premier relais reste due et se paie avec le transfert, en une… *(calcul)* · CRL-13 J0 = accusé fort de l’arrivée au NOUVEAU relais : le décompte de garde repart au jour 1. *(calcul)*

**Règles côté serveur et écran** (2) : CRL-08 Un seul relais par zone : les autres relais proposés sont dans d’autres zones ; l’heure… *(calcul)* · CRL-12 Nouveau relais ⇒ nouveau code ; l’ancien est refusé au comptoir dès la demande.

**Règles côté écran** (6) : CRL-01 Onglet « Changer de relais », sous-titre « Gratuit tant que rien n’est collecté. · CRL-04 Encart « Ce qui change » : nouveau code, l’ancien est invalidé ; le décompte de garde… · CRL-05 Avant collecte : changement gratuit, après une feuille de confirmation (quartier,… · CRL-06 Après collecte, en tournée : impossible — l’ordre des arrêts du paquet est imposé et… · CRL-07 Commande en partie collectée : les sous-commandes non collectées changent ensemble ; les… · CRL-09 Colis arrivé au relais : transfert à 400 F (TRANSFERT-RELAIS, tarif d’une remise relais),…

**Règles non classées** (5) : CRL-02 Le relais actuel en tête : portrait et nom du gérant, quartier, temps de trajet. · CRL-03 Les autres relais par distance croissante : nom du point (ou gérant), quartier, horaires… · CRL-11 La course de transfert est publiée à l’entreprise de livraison avec les paquets de la… · CRL-14 Le relais d’origine n’est jamais pénalisé ; le transfert (400 F) rémunère la course et la… · CRL-15 Interdit : changer la destination d’un colis en tournée.

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| changement gratuit ⇔ état < collecté | Toutes les sous-commandes non collectées changent ensemble (un seul relais, un seul code). |
| liste = relais actifs, non saturés, ouverts aujourd’hui, triés par distance ↑ | Distances depuis l’adresse du client ; horaires du jour affichés ; le premier est « le plus proche », en vert. |
| nouveau relais ⇒ nouveau code ; ancien invalidé | L’ancien code est refusé au comptoir dès la confirmation. |
| J0 = accusé fort de l’arrivée au NOUVEAU relais | Le décompte de garde repart au jour 1 (chapitre 10). |

**Paramètres** : `RELAIS-PAR-ZONE`, `SLA-ZONE-H`, `TRANSFERT-RELAIS`, `GARDE-J1 … GARDE-J6-7`

**API** : `GET /relais?near=lat,lng · ?q= · &open_today=1&not_full=1` · `PUT /orders/{id}/relais · /orders/{id}/address` · `POST /parcels/{id}/transfer`

<a id="changer-adresse"></a>
### `#changer-adresse` — Changer d’adresse

CL-12 · lancement · onglet commandes · menu : Mes commandes › Changer l’adresse à domicile

**Documentation** : décrite dans CL-12

**Sections** : CL-12 « Changer l’adresse à domicile et autres modifications »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#changer-adresse?ref=BLV-52096&st=avant` Changer d’adresse · feuille, avant collecte · `#changer-adresse?ref=BLV-52096&st=fait` Changer d’adresse · adresse changée · `#changer-adresse?ref=BLV-52096&st=impossible` Changer d’adresse · colis déjà en route

**Captures** : CL-12 fig. 18 `Changer_adresse` · CL-12 fig. 19 `Adresse_fait` · CL-12 fig. 20 `Adresse_impossible`

**Règles côté serveur** (1) : CMO-05 Résiliation d’abonnement avec une commande en cours : l’avantage reste acquis, jamais de…

**Règles côté serveur et écran** (1) : CMO-02 Choix parmi les adresses par repères enregistrées, ou « Ajouter une adresse par repères »…

**Règles côté écran** (2) : CMO-01 Adresse à domicile : modifiable avant la collecte seulement, gratuitement, même logique… · CMO-03 Colis récupéré, en route : adresse figée ; la feuille montre le livreur (prénom, photo,…

**Règles non classées** (1) : CMO-04 Quantité : impossible après paiement ; annuler la sous-commande et recommander (rappel…

**API** : `PUT /orders/{id}/relais · /orders/{id}/address`

<a id="payeur"></a>
### `#payeur` — Payer depuis l’étranger

CL-12 · lancement · menu : Acheter › Payer depuis l’étranger (page du payeur)

**Documentation** : décrite dans CL-12

**Sections** : CL-12 « Page web du payeur à l’étranger — récapitulatif, carte, 3-D Secure » ; CL-12 « Page du payeur — carte refusée, plafond, paiement confirmé »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#payeur` Page web du payeur · formulaire carte · `#payeur?st=3ds` Page du payeur · 3-D Secure · `#payeur?st=refusee` Page du payeur · carte refusée · `#payeur?st=plafond` Page du payeur · panier au-dessus de 150 000 F · `#payeur?st=sans-comptoir` Page du payeur · jamais au comptoir · `#payeur?st=paye` Page du payeur · paiement confirmé

**Captures** : CL-12 fig. 24 `Payeur` · CL-12 fig. 25 `Payeur_3DS` · CL-12 fig. 26 `Payeur_sans_comptoir` · CL-12 fig. 27 `Payeur_refusee` · CL-12 fig. 28 `Payeur_plafond` · CL-12 fig. 29 `Payeur_paye`

**Règles côté serveur** (1) : CET-10 Conversion en euros au taux fixe 655,957, au centime le plus proche ; autre devise : taux… *(calcul)*

**Règles côté serveur et écran** (7) : CET-08 Récapitulatif : article, retrait au relais, frais de service carte (2 %), total en FCFA… *(calcul)* · CET-09 Les frais de service sont affichés avant le paiement, sur le récapitulatif et le bouton ;… · CET-12 Encart « Tu seras remboursé, pas elle » : le remboursement revient sur cette carte ; le… · CET-15 Carte refusée : cause en clair, « Aucune somme débitée », puis réessayer, autre carte ou… *(calcul)* · CET-16 Plafond : montant_XAF ≤ 150 000 F par transaction, frais de service compris. *(calcul)* · CET-17 Paiement confirmé : montant en F et en devise, la suite en quatre étapes, réglage des… · CET-18 Le vendeur est libéré à J+14 sur carte (au lieu de 3 jours après la fermeture du retour),… *(calcul)*

**Règles côté écran** (4) : CET-06 Page web sans compte, sans dock ni en-tête client : en-tête BelivaY, « Paiement sécurisé… · CET-07 « Tu offres « Ensemble pyjama satin » à Carine. · CET-11 Carte Visa ou Mastercard ; 3-D Secure obligatoire ; rien n’est débité avant la validation. · CET-14 Jamais de paiement au comptoir sur ce parcours : ligne sous le bouton et feuille «…

**Règles non classées** (1) : CET-13 Le payeur donne son prénom (montré au bénéficiaire) et son e-mail (reçu et repli des…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| frais_service = arrondi(2 % × (S + livraison)) | 11 900 × 2 % = 238 F ; affiché avant le paiement (récapitulatif et bouton). |
| montant_EUR = montant_XAF ÷ 655,957, arrondi au centime le plus proche | 12 138 ÷ 655,957 = 18,504 → 18,50 €. |
| autre devise : taux du prestataire, figé au paiement | Aucun écart de change répercuté ensuite (ni au débit, ni au remboursement). |
| envoi payeur ⇔ 7 h ≤ heure_locale < 22 h ∨ criticité = 1 | Fuseau détecté au paiement et enregistré avec le profil du payeur (Paris). |

**Paramètres** : `PAY-CARTE-FRAIS`, `PAY-CARTE-ARRONDI`, `PAY-CARTE-MAX`, `PAY-CARTE-PSP`, `LIB-CARTE`

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `GET · POST /gift-links/{token} · /gift-payments`

<a id="payeur-preuve"></a>
### `#payeur-preuve` — Messages au payeur

CL-12 · lancement · menu : Aide et messages › Messages au payeur à l’étranger

**Documentation** : décrite dans CL-12

**Sections** : CL-12 « Messages au payeur — push d’abord, e-mail en repli »

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#payeur-preuve?st=paye` Payeur · e-mail de repli · `#payeur-preuve?st=incident` Payeur · notification d’incident et suivi · `#payeur-preuve?st=retire` Payeur · preuve de retrait

**Captures** : CL-12 fig. 30 `Preuve_email` · CL-12 fig. 31 `Preuve_incident` · CL-12 fig. 32 `Preuve_retrait`

**Règles côté serveur** (2) : CET-19 Messages au payeur : paiement confirmé, incident, preuve de retrait ; push d’abord… · CET-20 Aucun message entre 22 h et 7 h, heure locale du payeur, sauf criticité 1. *(calcul)*

**Règles côté serveur et écran** (3) : CET-22 Preuve de retrait : « Carine a retiré son colis aujourd’hui à 15 h 04 au Relais Mvog-Ada… *(calcul)* · CET-23 Incident : même contenu que le message C4 du client (« en retard chez le vendeur, nous le… · CET-24 Frais de service carte en cas d’annulation : annulation par le bénéficiaire →…

**Règles non classées** (1) : CET-21 Le payeur ne reçoit jamais le code de retrait : il paie, il ne retire pas.

**API** : `GET · POST /gift-links/{token} · /gift-payments`

<a id="compte"></a>
### `#compte` — Mon compte

CL-13 · lancement · onglet compte · menu : Mon compte › Mon compte

**Documentation** : décrite dans CL-13

**Sections** : CL-13 « Écran « Mon compte » »

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#compte` Mon compte · point d’entrée (tuiles, avantages, relais, rubriques) · `#compte?st=nouveau` Mon compte · compte neuf, numéro à vérifier

**Captures** : CL-13 fig. 1 `Compte` · CL-13 fig. 2 `Compte_nouveau`

**Règles côté serveur et écran** (3) : CCO-02 Avantages actifs écrits en clair avec leur plafond (« Remboursement immédiat jusqu’à 3… *(calcul)* · CCO-03 Les avantages et leurs plafonds viennent du serveur : LIT-AUTO-STD / LIT-AUTO-ELEVE selon… *(calcul)* · CCO-04 Compte neuf : palier Standard (aucun palier négatif avant 5 commandes) ; remboursement…

**Règles côté écran** (4) : CCO-05 Relais habituel affiché avec son gérant, ses horaires et « Changer » ; il est… · CCO-06 Numéro vérifié masqué au milieu (« 6 77 ·· ·· 41 ») avec « Vérifié » ; « Changer de… · CCO-07 Le compte est le point d’entrée de tout ce qui concerne la cliente : Mes commandes, Mes… · CCO-08 Aucun encart « Prime · actif » ni aucun encart d’abonnement tant que FF-ABONNEMENT est…

**Règles non classées** (2) : CCO-01 Compte minimal : identité (nom, numéro vérifié masqué, e-mail masqué), avantages actifs,… · CCO-09 Relais, adresse et moyen de paiement ne sont demandés qu’à la première commande ; le…

**Paramètres** : `LIT-AUTO-STD`, `LIT-AUTO-ELEVE`, `PAY-CPT-NOUV`, `PAY-CPT-STD`, `PAY-CPT-FID`, `IFA-MIN-CMD`, `FF-ABONNEMENT`

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `GET · PATCH · DELETE /me` · `POST · DELETE /devices`

<a id="adresses"></a>
### `#adresses` — Mes adresses

CL-13 · lancement · menu : Mon compte › Mes adresses

**Documentation** : décrite dans CL-13

**Sections** : CL-13 « Écran « Mes adresses » »

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#adresses` Mes adresses (depuis le Compte) · `#adresses?st=modifier` Adresses · modifier une adresse par repères · `#adresses?st=hors` Adresses · quartier hors zone servie · `#adresses?st=vide` Adresses · aucune adresse

**Captures** : CL-13 fig. 3 `Adresses` · CL-13 fig. 4 `Adresses_modifier` · CL-13 fig. 5 `Adresses_hors_zone` · CL-13 fig. 6 `Adresses_vide`

**Règles côté écran** (3) : CCO-10 Adresse de livraison par repères : nom, quartier (zone), repères écrits comme dans la… · CCO-11 Quartier hors des zones exploitées : adresse refusée avec « BelivaY ne livre pas encore à… · CCO-12 Ce que voit le livreur à domicile : le prénom et l’adresse par repères, au moment de la…

**Règles non classées** (1) : CCO-13 Livraison à domicile au lancement : 1 500 F (500 + 1 000), offerte dès 50 000 F…

**Paramètres** : `LIV-DOM-BASE`, `LIV-SEUIL-DOM`, `LIV-GROUPE-DOM`, `SLA-ZONE-H`

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `POST · PUT · DELETE /me/adresses · /me/adresses/{id}`

<a id="moyens-paiement"></a>
### `#moyens-paiement` — Moyens de paiement

CL-13 · lancement · menu : Mon compte › Moyens de paiement

**Documentation** : décrite dans CL-13

**Sections** : CL-13 « Écran « Moyens de paiement » »

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#moyens-paiement` Moyens de paiement (depuis le Compte) · `#moyens-paiement?st=ajout` Moyens de paiement · feuille d’ajout d’un numéro

**Captures** : CL-13 fig. 7 `Paiement_moyens` · CL-13 fig. 8 `Paiement_ajout`

**Règles côté serveur** (2) : CCO-15 Un nouveau numéro de paiement est vérifié par un code SMS avant d’être enregistré ; il… · CCO-16 Remboursement toujours vers le moyen de paiement d’origine ; zéro espèce, nulle part.

**Règles côté serveur et écran** (1) : CCO-17 La carte n’est pas un moyen enregistré de la cliente : elle sert au payeur à l’étranger,… *(calcul)*

**Règles côté écran** (1) : CCO-14 Moyens de paiement : MTN MoMo et Orange Money ; le numéro vérifié du compte est proposé à…

**Paramètres** : `PAY-CARTE-FRAIS`, `PAY-CARTE-MAX`, `PAY-AGREG`

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `GET · POST /me/moyens-paiement`

<a id="factures"></a>
### `#factures` — Factures

CL-13 · lancement · menu : Mon compte › Factures

**Documentation** : décrite dans CL-13

**Sections** : CL-13 « Écran « Factures » »

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#factures` Factures (depuis le Compte) · `#factures?st=apercu&ref=BLV-51702` Factures · aperçu du PDF BLV-51702 · `#factures?st=apercu&ref=BLV-51206` Factures · BLV-51206 remboursée en partie · `#factures?st=vide` Factures · aucune

**Captures** : CL-13 fig. 9 `Factures` · CL-13 fig. 10 `Factures_apercu` · CL-13 fig. 11 `Factures_apercu_rembourse` · CL-13 fig. 12 `Factures_vide`

**Règles côté serveur** (3) : CCO-18 Une facture PDF par commande terminée, générée côté serveur, partageable ; le panier ne… · CCO-19 Commande annulée : pas de facture ; la ligne dit le motif et le montant remboursé. · CCO-21 Commandes de plus de 12 mois archivées : leurs factures restent téléchargeables depuis… *(calcul)*

**Règles non classées** (1) : CCO-20 La facture est émise par BelivaY et ne porte jamais le nom de la boutique (anonymat) ; la…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| Total facture = Σ articles + Ram + Rem − Off | Montants du service de tarification, figés à la commande. BLV-51702 : 16 500 + 6 500 + 500 + 400 = 23 900 F (sous 30 000 F : livraison de base payée). |
| facture ⇔ commande terminée ∧ au moins un colis retiré | Commande annulée : pas de facture, motif et montant remboursé (BLV-51533 : 22 900 F). |
| Remboursement partiel après la facture | Ligne « … F remboursés (LIT-…) » sous la facture ; le PDF porte l’avoir (BLV-51206 : 3 000 F, LIT-2987). |

**États et erreurs** : 1 cas (détail dans `pages.json`)

**API** : `GET /orders/{id}/invoice.pdf · /me/factures`

<a id="supprimer"></a>
### `#supprimer` — Supprimer mon compte

CL-13 · lancement · menu : Mon compte › Supprimer mon compte

**Documentation** : décrite dans CL-13

**Sections** : CL-13 « Écran « Supprimer mon compte » »

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#supprimer` Supprimer mon compte · refusé (commandes en cours) · `#supprimer?st=possible` Supprimer mon compte · confirmation par code

**Captures** : CL-13 fig. 13 `Supprimer_bloque` · CL-13 fig. 14 `Supprimer_possible`

**Règles côté serveur et écran** (1) : CCO-23 Suppression confirmée par un code SMS au numéro vérifié ; l’écran dit ce qui est effacé…

**Règles côté écran** (2) : CCO-22 « Supprimer mon compte » est impossible tant qu’une commande ou un litige est en cours ;… · CCO-24 Après le lancement : la suppression invalide aussi tous les liens de liste partagés…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| suppression_possible ⇔ aucune commande ∈ {en attente, payée, validée, en litige} ∧ aucun litige ouvert | Contrôle serveur au clic ; la réponse de refus liste les commandes et dossiers en cours. |

**États et erreurs** : 2 cas (détail dans `pages.json`)

**API** : `GET · PATCH · DELETE /me`

<a id="avis-donner"></a>
### `#avis-donner` — Donner mon avis

CL-13 · lancement · menu : Mes commandes › Donner mon avis

**Documentation** : décrite dans CL-13

**Sections** : CL-13 « Écran « Donner mon avis » »

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#avis-donner?ref=BLV-51702` Avis · deux notes (depuis la commande ou le Compte) · `#avis-donner?ref=BLV-52018` Avis · deux colis, deux vendeurs · `#avis-donner?ref=BLV-51702&st=bas` Avis · note basse · `#avis-donner?ref=BLV-51702&st=envoye` Avis · notes envoyées · `#avis-donner?ref=BLV-51702&st=modifier` Avis · modifier ses notes · `#avis-donner?st=ferme` Avis · notation fermée (7 jours passés) · `#avis-donner?st=non` Avis · colis pas encore retiré

**Captures** : CL-13 fig. 15 `Avis_formulaire` · CL-13 fig. 16 `Avis_deux_colis` · CL-13 fig. 17 `Avis_note_basse` · CL-13 fig. 19 `Avis_envoye` · CL-13 fig. 20 `Avis_modifier` · CL-13 fig. 21 `Avis_fenetre_fermee` · CL-13 fig. 22 `Avis_non_eligible`

**Règles côté serveur** (1) : CAV-11 Une note par (commande, cible), cible = vendeur ou relais ; modifiable dans la fenêtre. *(calcul)*

**Règles côté serveur et écran** (3) : CAV-01 La notation n’est demandée qu’après la validation du retrait : push de retrait, SMS de… · CAV-08 Sous le bouton « Envoyer mes notes » : « La note seule suffit. · CAV-10 Fenêtre de notation limitée après le retrait (AVIS-FENETRE), puis fermée : hors fenêtre,… *(calcul)* *(À trancher)*

**Règles côté écran** (6) : CAV-02 Deux onglets : « Lire les avis » et « Donner mon avis ». · CAV-04 Le vendeur : cinq étoiles (« le produit, l’emballage, la conformité ») ; libellé « Le… · CAV-05 Le gérant du relais, nommé : cinq étoiles (« l’accueil, l’attente, la propreté du point… · CAV-09 Acheteur vérifié uniquement : pas d’avis sans commande payée et retirée ; le bouton… · CAV-13 Note ≤ AVIS-BAS (2 étoiles, proposé au registre mais rangé « à trancher » en 19.4) :… *(Proposé)* · CAV-14 Note en mots sous les étoiles : 1 Très mauvais, 2 Mauvais, 3 Moyen, 4 Bien, 5 Excellent…

**Règles non classées** (4) : CAV-03 Rappel de la commande : photo, article, date et relais de retrait. · CAV-06 Deux notes séparées, jamais une note unique pour le vendeur et le relais. · CAV-07 Commentaire facultatif et photo facultative ; la note seule suffit ; une seule des deux… · CAV-12 Commande de plusieurs boutiques : une note vendeur par colis (sous-commande), la note du…

**Paramètres** : `AVIS-FENETRE`, `AVIS-BAS`, `SMS-MAX-CMD`

**États et erreurs** : 4 cas (détail dans `pages.json`)

**API** : `POST · PUT /orders/{id}/reviews`

<a id="avis-bas"></a>
### `#avis-bas` — Note basse

CL-13 · lancement · menu : Mes commandes › Note basse : proposer un litige

**Documentation** : décrite dans CL-13

**Sections** : CL-13 « Écran « Donner mon avis » »

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#avis-bas?ref=BLV-51702` Avis · note basse, litige proposé

**Captures** : CL-13 fig. 18 `Avis_proposition_litige`

**Règles côté serveur** (1) : CAV-11 Une note par (commande, cible), cible = vendeur ou relais ; modifiable dans la fenêtre. *(calcul)*

**Règles côté serveur et écran** (3) : CAV-01 La notation n’est demandée qu’après la validation du retrait : push de retrait, SMS de… · CAV-08 Sous le bouton « Envoyer mes notes » : « La note seule suffit. · CAV-10 Fenêtre de notation limitée après le retrait (AVIS-FENETRE), puis fermée : hors fenêtre,… *(calcul)* *(À trancher)*

**Règles côté écran** (6) : CAV-02 Deux onglets : « Lire les avis » et « Donner mon avis ». · CAV-04 Le vendeur : cinq étoiles (« le produit, l’emballage, la conformité ») ; libellé « Le… · CAV-05 Le gérant du relais, nommé : cinq étoiles (« l’accueil, l’attente, la propreté du point… · CAV-09 Acheteur vérifié uniquement : pas d’avis sans commande payée et retirée ; le bouton… · CAV-13 Note ≤ AVIS-BAS (2 étoiles, proposé au registre mais rangé « à trancher » en 19.4) :… *(Proposé)* · CAV-14 Note en mots sous les étoiles : 1 Très mauvais, 2 Mauvais, 3 Moyen, 4 Bien, 5 Excellent…

**Règles non classées** (4) : CAV-03 Rappel de la commande : photo, article, date et relais de retrait. · CAV-06 Deux notes séparées, jamais une note unique pour le vendeur et le relais. · CAV-07 Commentaire facultatif et photo facultative ; la note seule suffit ; une seule des deux… · CAV-12 Commande de plusieurs boutiques : une note vendeur par colis (sous-commande), la note du…

**Paramètres** : `AVIS-FENETRE`, `AVIS-BAS`, `SMS-MAX-CMD`

**États et erreurs** : 4 cas (détail dans `pages.json`)

**API** : `POST · PUT /orders/{id}/reviews`

<a id="aide"></a>
### `#aide` — Aide et support

CL-13 · lancement · menu : Aide et messages › Aide et support

**Documentation** : décrite dans CL-13

**Sections** : CL-13 « Écran « Aide et support » »

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#aide` Aide et support (depuis le Compte) · `#aide?st=horsheures` Aide · hors heures (22 h 40) · `#aide?st=wa` Aide · feuille WhatsApp et ses interdits

**Captures** : CL-13 fig. 23 `Aide` · CL-13 fig. 24 `Aide_hors_heures` · CL-13 fig. 25 `Aide_whatsapp`

**Règles côté serveur** (1) : CSV-06 Avertissement permanent : BelivaY ne demande jamais le code secret Mobile Money (ni…

**Règles côté serveur et écran** (5) : CSV-01 Aide en quatre canaux : questions fréquentes par thème ; messagerie interne tracée,… · CSV-02 Table des canaux : question générale → FAQ puis messagerie ; problème sur une commande →… *(calcul)* · CSV-03 WhatsApp : porte d’entrée, jamais caisse — ni commande, ni paiement, ni photo de litige ;… · CSV-04 Heures du support humain affichées (SUP-HORAIRES, 7 h – 21 h, 7 j/7 proposé) avec l’état… *(calcul)* *(Proposé)* · CSV-05 Délai de première réponse affiché (SUP-DELAI, 4 h ouvrées proposé). *(calcul)*

**Règles côté écran** (1) : CSV-07 Espace vendeur : une ligne d’information en bas de l’aide ; aucune entrée vers l’espace…

**Paramètres** : `SUP-WA`, `SUP-DELAI`, `SUP-HORAIRES`, `LIT-CONSTAT-H`

**États et erreurs** : 2 cas (détail dans `pages.json`)

**API** : `GET /help · /help/faq?lang=&q=`

<a id="faq"></a>
### `#faq` — Questions fréquentes

CL-13 · lancement · menu : Aide et messages › Questions fréquentes

**Documentation** : décrite dans CL-13

**Sections** : CL-13 « Écran « Questions fréquentes » »

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#faq?t=garde&a=1` Questions fréquentes · thème Frais de garde · `#faq?q=code` Questions fréquentes · recherche « code » · `#faq?q=parrainage` Questions fréquentes · aucune réponse

**Captures** : CL-13 fig. 26 `FAQ_theme` · CL-13 fig. 27 `FAQ_recherche` · CL-13 fig. 28 `FAQ_zero`

**Règles côté serveur** (1) : CSV-09 Les montants et délais des réponses sont des paramètres du registre, jamais écrits en dur…

**Règles côté serveur et écran** (1) : CSV-10 Chaque réponse finit, quand c’est utile, par un lien vers l’écran concerné ; recherche…

**Règles côté écran** (1) : CSV-08 Questions fréquentes par thème : paiement, retrait, garde, litige, retour, compte ;…

**États et erreurs** : 1 cas (détail dans `pages.json`)

**API** : `GET /help · /help/faq?lang=&q=`

<a id="messagerie"></a>
### `#messagerie` — Messagerie

CL-13 · lancement · menu : Aide et messages › Messagerie

**Documentation** : décrite dans CL-13

**Sections** : CL-13 « Écrans « Messagerie » et fil de conversation »

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#messagerie` Messagerie (tuile Messages du Compte) · `#messagerie?st=vide` Messagerie · aucune conversation

**Captures** : CL-13 fig. 29 `Messagerie` · CL-13 fig. 30 `Messagerie_vide`

**Règles côté serveur** (1) : CSV-11 Messagerie interne : fil tracé, gratuit, rattaché à un dossier quand il y en a un ;…

**Règles côté écran** (4) : CSV-12 Anonymat dans les fils : le vendeur s’affiche « le vendeur » (jamais la boutique) ;… · CSV-13 BelivaY (console) ne lit une conversation client-vendeur que dans un dossier ouvert ; le… · CSV-14 « Écrire au support » : thème, commande facultative, message, photo ; un problème sur un… · CSV-15 Un fil de support peut être marqué « Résolue » par le support ; il reste ouvert à un…

**Paramètres** : `SUP-DELAI`

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `GET · POST /me/threads · /support/threads · /support/callback`

<a id="fil"></a>
### `#fil` — Conversation

CL-13 · lancement · menu : Aide et messages › Fil du dossier LIT-3042

**Documentation** : décrite dans CL-13

**Sections** : CL-13 « Écrans « Messagerie » et fil de conversation »

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#fil?id=LIT-3042` Fil du dossier LIT-3042 · `#fil?id=LIT-3042&st=photo` Fil du dossier · photo versée · `#fil?id=LIT-3044` Fil du dossier LIT-3044 (ouvert dans l’application) · `#fil?id=question` Fil · question au vendeur, numéro masqué · `#fil?id=support` Fil du support · résolu · `#fil?id=support&st=nouveau` Écrire au support

**Captures** : CL-13 fig. 31 `Fil_dossier` · CL-13 fig. 32 `Fil_photo` · CL-13 fig. 33 `Fil_litige_application` · CL-13 fig. 34 `Fil_vendeur_masque` · CL-13 fig. 35 `Fil_support` · CL-13 fig. 36 `Fil_nouveau`

**Règles côté serveur** (1) : CSV-11 Messagerie interne : fil tracé, gratuit, rattaché à un dossier quand il y en a un ;…

**Règles côté écran** (4) : CSV-12 Anonymat dans les fils : le vendeur s’affiche « le vendeur » (jamais la boutique) ;… · CSV-13 BelivaY (console) ne lit une conversation client-vendeur que dans un dossier ouvert ; le… · CSV-14 « Écrire au support » : thème, commande facultative, message, photo ; un problème sur un… · CSV-15 Un fil de support peut être marqué « Résolue » par le support ; il reste ouvert à un…

**Paramètres** : `SUP-DELAI`

**États et erreurs** : 3 cas (détail dans `pages.json`)

**API** : `POST /disputes/{id}/photos · /disputes/{id}/messages` · `GET · POST /me/threads · /support/threads · /support/callback`

<a id="rappel"></a>
### `#rappel` — Demander un rappel

CL-13 · lancement · menu : Aide et messages › Demander un rappel

**Documentation** : décrite dans CL-13

**Sections** : CL-13 « Feuille « Demander un rappel » »

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#rappel` Demander un rappel · feuille · `#rappel?st=envoye` Rappel demandé

**Captures** : CL-13 fig. 37 `Rappel` · CL-13 fig. 38 `Rappel_envoye`

**Règles côté serveur** (1) : CSV-17 Créneaux proposés dans les heures du support (SUP-HORAIRES) ; hors heures, les créneaux…

**Règles côté écran** (1) : CSV-16 Appel : rappel masqué uniquement ; jamais de numéro personnel exposé, ni celui du client…

**États et erreurs** : 2 cas (détail dans `pages.json`)

**API** : `GET · POST /me/threads · /support/threads · /support/callback`

<a id="legal"></a>
### `#legal` — Pages légales

CL-13 · lancement · menu : Mon compte › Pages légales

**Documentation** : décrite dans CL-13

**Sections** : CL-13 « Pages légales »

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#legal` Pages légales (depuis le Compte)

**Captures** : CL-13 fig. 39 `Legal`

**Règles côté serveur et écran** (1) : CLG-03 Chaque texte est versionné (numéro et date) ; la version acceptée est horodatée avec le…

**Règles côté écran** (5) : CLG-01 Textes : conditions générales d’utilisation et de vente, politique de confidentialité,… · CLG-02 Accessibles depuis le compte, le pied de l’écran de paiement et la page de retour. · CLG-04 Aucune case à cocher dans le parcours d’achat : acceptation à l’inscription, puis à… · CLG-05 Rédaction en langage simple, en français et en anglais ; bascule Français / English dans… · CLG-06 Le contenu reprend les règles de la spec (garde, retours, comptoir, carte, anonymat) ; le…

**Règles non classées** (1) : CLG-07 Un changement de tarif (grille de garde, frais) est annoncé avant d’entrer en vigueur et…

**États et erreurs** : 1 cas (détail dans `pages.json`)

**API** : `GET · POST /legal/{doc}?lang= · /me/legal · /me/legal/accept`

<a id="legal-doc"></a>
### `#legal-doc` — Document légal

CL-13 · lancement

**Documentation** : décrite dans CL-13

**Sections** : CL-13 « Pages légales »

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#legal-doc?d=cgv` Pages légales · CGV · `#legal-doc?d=cgu&lang=en` Pages légales · CGU en anglais · `#legal-doc?d=garde` Pages légales · politique de garde

**Captures** : CL-13 fig. 40 `Legal_CGV` · CL-13 fig. 41 `Legal_CGU_anglais` · CL-13 fig. 42 `Legal_garde`

**Règles côté serveur et écran** (1) : CLG-03 Chaque texte est versionné (numéro et date) ; la version acceptée est horodatée avec le…

**Règles côté écran** (5) : CLG-01 Textes : conditions générales d’utilisation et de vente, politique de confidentialité,… · CLG-02 Accessibles depuis le compte, le pied de l’écran de paiement et la page de retour. · CLG-04 Aucune case à cocher dans le parcours d’achat : acceptation à l’inscription, puis à… · CLG-05 Rédaction en langage simple, en français et en anglais ; bascule Français / English dans… · CLG-06 Le contenu reprend les règles de la spec (garde, retours, comptoir, carte, anonymat) ; le…

**Règles non classées** (1) : CLG-07 Un changement de tarif (grille de garde, frais) est annoncé avant d’entrer en vigueur et…

**États et erreurs** : 1 cas (détail dans `pages.json`)

**API** : `GET · POST /legal/{doc}?lang= · /me/legal · /me/legal/accept`

<a id="reseau"></a>
### `#reseau` — Connexion et données

CL-13 · lancement · menu : Accès et états de l’application › Mode dégradé : réseau lent, hors ligne

**Documentation** : décrite dans CL-13

**Sections** : CL-13 « Mode dégradé : réseau lent, hors ligne, 2G »

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#reseau` Connexion et données (depuis Réglages ou une bannière) · `#reseau?st=lent` Mode dégradé · accueil en connexion lente · `#reseau?st=horsligne` Mode dégradé · Mes commandes hors ligne · `#reseau?st=cache` Mode dégradé · code de retrait hors ligne · `#reseau?st=argent` Mode dégradé · panier hors ligne, paiement grisé · `#reseau?st=eco` Mode dégradé · accueil en données économes · `#reseau?st=sms` Mode dégradé · SMS de retrait de repli · `#reseau?st=comptoir` Mode dégradé · hors ligne au comptoir

**Captures** : CL-13 fig. 43 `Reseau_info` · CL-13 fig. 44 `Reseau_lent` · CL-13 fig. 45 `Reseau_hors_ligne` · CL-13 fig. 46 `Reseau_code_cache` · CL-13 fig. 47 `Reseau_argent_grise` · CL-13 fig. 48 `Reseau_donnees_economes` · CL-13 fig. 49 `Reseau_sms_repli` · CL-13 fig. 50 `Reseau_comptoir`

**Règles côté serveur et écran** (2) : CDM-03 Le code à 6 chiffres reste lisible hors ligne après un premier affichage (CACHE-CODE) ;… *(Proposé)* · CDM-07 Le SMS de repli reste le canal du code quand l’application ne répond pas : code en clair… *(calcul)*

**Règles côté écran** (5) : CDM-01 Bannière « Connexion lente » (au-delà de NET-LENT, 3 s par requête) ou « Hors ligne », en… · CDM-02 Pages déjà vues servies depuis le cache : accueil, commandes, reçu, code de retrait déjà… · CDM-04 Images compressées et chargement progressif : le texte, le prix et la livraison… · CDM-05 Mode « données économes » : vignettes à la place des images ; proposé dans la bannière «… · CDM-06 Toute action d’argent (payer, annuler, contester) exige la connexion : bouton grisé avec…

**Règles non classées** (1) : CDM-08 Hors ligne au comptoir : code lisible, paiement impossible sans réseau ; avec un montant…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| connexion_lente ⇔ durée d’une requête > NET-LENT (3 s) | La bannière apparaît à la première requête lente et disparaît après trois requêtes rapides (lissage recommandé). |
| hors_ligne ⇔ aucune réponse du serveur | Bannière « Hors ligne » ; l’écran affiche la dernière version en cache avec son heure. |
| code_hors_ligne ⇔ CACHE-CODE ∧ code déjà affiché une fois sur cet appareil ∧ colis non retiré | Stocké chiffré dans le téléphone, effacé au retrait, au changement de relais ou de numéro (nouveau code). |
| action_argent ∈ {payer, annuler, contester} ⇒ réseau requis | Bouton grisé avec l’explication ; jamais mise en file pour exécution automatique. |

**Paramètres** : `NET-LENT`, `CACHE-CODE`, `CODE-LONG`

**États et erreurs** : 2 cas (détail dans `pages.json`)

<a id="reglages"></a>
### `#reglages` — Réglages

CL-13 · lancement · menu : Mon compte › Réglages

**Documentation** : décrite dans CL-13

**Sections** : CL-13 « Écran « Réglages » »

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#reglages` Réglages (depuis le Compte) · `#reglages?pcm=1` Réglages · pidgin en relecture · `#reglages?txt=tres` Réglages · très grande taille de texte

**Captures** : CL-13 fig. 51 `Reglages` · CL-13 fig. 52 `Reglages_pidgin` · CL-13 fig. 53 `Reglages_tres_grand`

**Règles côté serveur et écran** (3) : CRG-02 Pidgin choisi : chaque texte s’affiche en pidgin s’il est traduit et validé (aujourd’hui… · CRG-03 Langue et thème sont portés par le compte (2.6) et suivent la cliente sur tous ses… · CRG-05 Taille du texte : Normale, Grande (115 %), Très grande (130 %) ; rien n’est tronqué, en… *(calcul)*

**Règles côté écran** (4) : CRG-01 Langue : français et anglais (spec) ; le pidgin, absent de la v3 client mais présent au… · CRG-04 Thème : Clair par défaut à l’ouverture (décision du porteur du 25 sept.) ; au choix… · CRG-07 Mesure d’audience : désactivée par défaut, activée seulement avec l’accord de la cliente… · CRG-08 Les réglages s’appliquent au toucher, sans bouton « Enregistrer » ; le réglage des…

**Règles non classées** (1) : CRG-06 Données économes : désactivées par défaut, réglage de l’appareil ; proposées quand la…

**API** : `GET · PATCH · DELETE /me`

<a id="abonnements"></a>
### `#abonnements` — Abonnements

CL-14 · après le lancement · menu : Après le lancement › Abonnements

**Documentation** : décrite dans CL-01, CL-14

**Sections** : CL-01 « Organisation, ordre de construction, lancement et après le lancement » ; CL-14 « Les interrupteurs de fonctionnalité » ; CL-14 « Écran « Abonnements » » ; CL-14 « Déclencheur au paiement (encart Prime du panier) »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#abonnements?st=ferme` Interrupteur fermé · `#abonnements?st=ferme` Abonnement · module fermé, ancien lien neutre · `#abonnements` Abonnements · paliers, annuel (depuis Compte) · `#abonnements?per=mois&choisi=1` Abonnements · paliers, mensuel, « le plus choisi » · `#abonnements?st=declencheur` Panier · « avec Prime, cette livraison était offerte »

**Captures** : CL-01 fig. 1 `Socle_Interrupteur` · CL-14 fig. 1 `Interrupteur_abonnement` · CL-14 fig. 3 `Abonnements` · CL-14 fig. 4 `Abonnements_mensuel` · CL-14 fig. 5 `Abo_declencheur`

**Règles côté serveur** (7) : CCH-17 Lancement et après le lancement · CAB-01 Cinq paliers : Gratuit, Plus, Prime ★, Prime Duo, Business. *(calcul)* · CAB-04 Bascule annuelle activée par défaut ; l’économie est écrite en clair : annuel = 10 mois,… *(calcul)* · CAB-11 Seuils sans abonnement : relais offert dès 30 000 F (sinon 900 F), domicile dès 50 000 F… *(calcul)* · CAB-12 Ce qui est offert, par le seuil comme par l’abonnement, est la livraison de base (premier… · CAB-13 Le prix des produits est identique pour tous ; seule la ligne de remise change (aucune… · CAB-21 Le montant cité est la livraison de base réellement payée dans ce panier (ici 900 F = 500… *(calcul)*

**Règles côté serveur et écran** (16) : CCH-16 Ordre de construction · CCH-18 Interrupteur fermé : rien ne se voit · CCH-19 Un lien profond vers un module fermé ouvre l’état « Ce lien ne mène à aucune page » avec… *(calcul)* · CFS-01 Six interrupteurs de fonctionnalité existent dès le lancement, tous fermés :… · CFS-02 Interrupteur fermé = module invisible : aucune route, aucune entrée de menu, aucun encart… *(calcul)* · CFS-03 FF-ABONNEMENT masque aussi les encarts des autres chapitres : « Retrait offert dès 10 000… · CFS-05 L’interrupteur s’applique côté serveur : les endpoints d’un module fermé répondent 404 et… · CFS-11 FF-WHATSAPP-CANAL reste fermé : WhatsApp n’est pas un canal de repli des messages ; il… · CAB-06 « Vrai » veut dire : Prime compte le plus d’abonnements actifs sur les 30 derniers jours,… · CAB-08 « Illimité* » = usage normal, jusqu’à 30 commandes par mois (70 pour Business), écrit… *(calcul)* · CAB-09 Business est réservé aux revendeurs vérifiés (patente ou RCCM) et sort après les autres… · CAB-10 Encart « Ce qui n’est jamais restreint au palier gratuit » : la protection du paiement,… · CAB-14 Portes d’entrée affichées sous les cartes : Pass 7 jours et premier mois Prime à 1 500 F… *(calcul)* · CAB-17 Jamais sur l’écran de confirmation de commande (chapitre 8), ni sur l’attente de paiement… · CAB-18 Emplacement : une seule ligne dans le récapitulatif du panier, sous le total, avant «… *(calcul)* · CAB-20 Conditions d’affichage, toutes vraies : FF-ABONNEMENT ouvert ∧ client non abonné ∧… *(calcul)*

**Règles côté écran** (9) : CFS-04 Un ancien lien vers un module fermé ouvre une page neutre, « Ce lien ne mène à aucune… · CFS-07 Aucun module ne s’active avec une valeur « à trancher » : LST-VALIDITE (liste d’envies),… · CFS-09 Tant qu’un interrupteur est fermé, le point relais et le vendeur masquent aussi ce qui en… · CFS-10 La pastille « Après le lancement · interrupteur fermé » et le code FF-… affichés en tête… · CAB-03 Sur mobile, les cartes s’empilent : Business (repliée : public, prix), Prime (ouverte et… · CAB-05 « Le plus choisi » n’apparaît que lorsque c’est vrai. · CAB-07 Les cartes montrent les avantages du tableau 21.2 et rien d’autre : relais, domicile,… · CAB-16 Déclencheur au paiement : un non-abonné qui paie une livraison relais voit « avec Prime,… · CAB-19 Le déclencheur vise les clients occasionnels (2 commandes par mois ou moins), pas les…

**Règles non classées** (4) : CFS-06 Tous les codes de paramètres des modules après lancement sont créés dans la même table… · CFS-08 L’abonnement ouvre au 2e ou 3e trimestre d’exploitation (proposé à partir du 7e mois),… · CAB-02 Ordre d’affichage imposé : Business en premier (ancre haute), Prime au centre et… · CAB-15 Aucune estimation personnelle avant la souscription (pas de simulateur) : les prix,…

**Paramètres** : `SLA-ZONE-H`, `RELAIS-PAR-ZONE`, `FF-ABONNEMENT`, `FF-LISTE-ENVIES`, `FF-FLASH`, `FF-IA`, `FF-EX01 … FF-EX06`, `FF-WHATSAPP-CANAL`, `ABO-PLUS`, `ABO-PRIME`, `ABO-DUO`, `ABO-BUSINESS`, `ABO-ILLIMITE`, `ABO-ACTIVATION`, `ABO-SEUIL-RELAIS`, `ABO-DECLENCHEUR-FREQ (à créer)`, `LIV-SEUIL-RELAIS`, `LIV-RELAIS-BASE`

**États et erreurs** : 7 cas (détail dans `pages.json`)

<a id="abonnement-souscrire"></a>
### `#abonnement-souscrire` — Souscrire

CL-14 · après le lancement

**Documentation** : décrite dans CL-14

**Sections** : CL-14 « Écran « Souscrire » »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#abonnement-souscrire` Souscrire · premier mois à 1 500 F · `#abonnement-souscrire?formule=annuel` Souscrire · Prime annuel, non remboursable · `#abonnement-souscrire?formule=pass7` Souscrire · Pass 7 jours · `#abonnement-souscrire?st=essai-utilise` Souscrire · essai déjà utilisé · `#abonnement-souscrire?palier=business` Souscrire · Business, justificatif revendeur

**Captures** : CL-14 fig. 6 `Abo_souscrire_essai` · CL-14 fig. 7 `Abo_souscrire_annuel` · CL-14 fig. 8 `Abo_souscrire_pass7` · CL-14 fig. 9 `Abo_souscrire_essai_utilise` · CL-14 fig. 10 `Abo_souscrire_business`

**Règles côté serveur** (3) : CAB-24 L’essai se poursuit en Prime mensuel à 4 000 F, sauf résiliation, avec la même annonce… · CAB-26 Pass 7 jours à 1 500 F : relais offert dès 10 000 F, 4 commandes au plus, non… *(calcul)* · CAB-28 Annuel : 10 mois payés pour 12 ; non remboursable, il reste actif jusqu’à son terme ; son… *(calcul)*

**Règles côté serveur et écran** (2) : CAB-22 Souscription par prélèvement Mobile Money annoncé : l’écran montre le montant du jour, la… · CAB-27 « Non renouvelable dans le mois » : pas de nouveau Pass pendant 30 jours à partir du… *(calcul)*

**Règles côté écran** (3) : CAB-25 Essai déjà utilisé par le compte ou par le numéro : l’écran le dit avec la date, et… · CAB-29 Conditions visibles avant de payer : usage normal 30 commandes par mois, tarif garanti… · CAB-31 Business s’active après vérification d’un justificatif (patente ou RCCM) envoyé en…

**Règles non classées** (2) : CAB-23 Premier mois Prime à 1 500 F, une fois par compte ET par numéro MoMo ; l’essai porte sur… · CAB-30 L’abonnement est lié au compte ET au numéro MoMo, non transférable, sauf Business et ses…

**Paramètres** : `ABO-PRIME`, `ABO-PASS7`, `ABO-ESSAI`, `ABO-ILLIMITE`, `ABO-PREAVIS (à créer)`, `ABO-PASS7-DELAI (à créer)`

**États et erreurs** : 4 cas (détail dans `pages.json`)

<a id="mon-abonnement"></a>
### `#mon-abonnement` — Mon abonnement

CL-14 · après le lancement · menu : Après le lancement › Mon abonnement

**Documentation** : décrite dans CL-14

**Sections** : CL-14 « Écrans « Mon abonnement » et « Résilier » »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#mon-abonnement` Mon abonnement · actif, économies, quotas (depuis Compte) · `#mon-abonnement?st=renouvellement` Mon abonnement · renouvellement annoncé par push · `#mon-abonnement?st=grace` Mon abonnement · prélèvement échoué, 7 jours de grâce · `#mon-abonnement?st=resilie` Mon abonnement · résilié, actif jusqu’au terme

**Captures** : CL-14 fig. 11 `Abo_mon_abonnement` · CL-14 fig. 12 `Abo_renouvellement` · CL-14 fig. 13 `Abo_grace` · CL-14 fig. 15 `Abo_resilie`

**Règles côté serveur** (8) : CAB-32 Compteur d’économies dans le profil : relais, domicile et cagnotte ; économies = Σ… *(calcul)* · CAB-33 Le compteur ne compte que ce que l’abonnement a donné : une livraison déjà offerte par le… · CAB-36 Une commande dont la livraison est déjà offerte par le seuil ne consomme pas de quota et… *(calcul)* · CAB-39 Renouvellement annoncé par push avant chaque prélèvement, jamais par SMS promotionnel. · CAB-42 L’annonce du renouvellement part 3 jours avant le prélèvement, comme pour le panier… *(calcul)* · CAB-43 Échec de prélèvement MoMo : 7 jours de grâce, puis retour au palier gratuit sans perte… *(calcul)* · CAB-47 Résiliable en un tap ; l’annuel n’est pas remboursable mais reste actif jusqu’à son terme. · CAB-48 Le mensuel et l’essai résiliés restent actifs jusqu’à la fin de la période payée ; aucun…

**Règles côté serveur et écran** (2) : CAB-40 Jours de garde gratuits des abonnés : ajoutés avant le jour 2 de la grille, Plus +2,… *(calcul)* · CAB-44 Pendant la grâce, l’abonnement reste actif et l’écran propose de payer (même numéro ou…

**Règles côté écran** (2) : CAB-37 Tarif garanti tant que l’abonnement reste actif sans interruption, jamais « à vie ». · CAB-46 Dans la feuille, « Résilier Prime » est l’action principale et « Garder Prime » l’action…

**Règles non classées** (6) : CAB-34 Les avantages s’appliquent aux commandes payées après le début de l’abonnement ; une… · CAB-35 Quotas mensuels non reportables ; ils repartent à zéro à chaque renouvellement… · CAB-38 Reprendre un abonnement résilié avant son terme garde le tarif, sans nouvel essai ; après… · CAB-41 La grille de garde et le renvoi au vendeur se décalent du nombre de jours offerts ; le… · CAB-45 Résiliation honnête : ce qui est perdu (avec la date), l’économie du mois, puis un tap. · CAB-49 Résiliation avec commande en cours : l’avantage reste acquis, jamais de refacturation ;…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| économies = Σ livraisons offertes + réductions + cagnotte créditée | Compteur du profil. Seules les remises dues à l’abonnement : une livraison offerte par le seuil de 30 000 F n’y entre pas (CAB-33). |
| éligible_relais_offert ⇔ S ≥ seuil_palier ∧ quota_restant > 0 | Plus : 3 par mois ; Prime : illimité dans la limite de 30 (Business 70). Une commande déjà offerte par le seuil ne consomme pas de quota (CAB-36). |
| offert(commande) = R + Rem(mode) au tarif S | Jamais les ramassages suivants ni les suppléments de classe. |
| F_client = 1 + bonus(palier) ; bonus = Plus 2 · Prime, Duo, Business 4 · sinon 0 | Jours gratuits ajoutés avant le jour 2 (Prime : jours 1 à 5 gratuits). 21.5 imprime « 3 + bonus » : erreur, voir CAB-40. |
| tarif(j) = grille(rang(j) − bonus) ; renvoi après le (7 + bonus)e jour | La grille 100 / 200 / 400 F et le renvoi se décalent du bonus ; garde plafonnée à 1 400 F (1 900 F avec le renvoi). |
| prochain_prélèvement = début + n × période (+ 1 mois par parrainage récompensé) | Annonce par push 3 jours avant (ABO-PREAVIS, à créer). |
| fin_grâce = échec + 7 j (ABO-GRACE) | Pendant la grâce, l’abonnement reste actif ; ensuite palier Gratuit, historique conservé. |

**Paramètres** : `ABO-QUOTA-PLUS`, `ABO-ILLIMITE`, `ABO-GARDE-BONUS`, `ABO-GRACE`, `ABO-PREAVIS (à créer)`, `GARDE-J1 … GARDE-RENVOI`

**États et erreurs** : 4 cas (détail dans `pages.json`)

<a id="abonnement-resilier"></a>
### `#abonnement-resilier` — Résilier

CL-14 · après le lancement

**Documentation** : décrite dans CL-14

**Sections** : CL-14 « Écrans « Mon abonnement » et « Résilier » »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#abonnement-resilier` Mon abonnement · feuille « Résilier Prime ? »

**Captures** : CL-14 fig. 14 `Abo_resilier`

**Règles côté serveur** (8) : CAB-32 Compteur d’économies dans le profil : relais, domicile et cagnotte ; économies = Σ… *(calcul)* · CAB-33 Le compteur ne compte que ce que l’abonnement a donné : une livraison déjà offerte par le… · CAB-36 Une commande dont la livraison est déjà offerte par le seuil ne consomme pas de quota et… *(calcul)* · CAB-39 Renouvellement annoncé par push avant chaque prélèvement, jamais par SMS promotionnel. · CAB-42 L’annonce du renouvellement part 3 jours avant le prélèvement, comme pour le panier… *(calcul)* · CAB-43 Échec de prélèvement MoMo : 7 jours de grâce, puis retour au palier gratuit sans perte… *(calcul)* · CAB-47 Résiliable en un tap ; l’annuel n’est pas remboursable mais reste actif jusqu’à son terme. · CAB-48 Le mensuel et l’essai résiliés restent actifs jusqu’à la fin de la période payée ; aucun…

**Règles côté serveur et écran** (2) : CAB-40 Jours de garde gratuits des abonnés : ajoutés avant le jour 2 de la grille, Plus +2,… *(calcul)* · CAB-44 Pendant la grâce, l’abonnement reste actif et l’écran propose de payer (même numéro ou…

**Règles côté écran** (2) : CAB-37 Tarif garanti tant que l’abonnement reste actif sans interruption, jamais « à vie ». · CAB-46 Dans la feuille, « Résilier Prime » est l’action principale et « Garder Prime » l’action…

**Règles non classées** (6) : CAB-34 Les avantages s’appliquent aux commandes payées après le début de l’abonnement ; une… · CAB-35 Quotas mensuels non reportables ; ils repartent à zéro à chaque renouvellement… · CAB-38 Reprendre un abonnement résilié avant son terme garde le tarif, sans nouvel essai ; après… · CAB-41 La grille de garde et le renvoi au vendeur se décalent du nombre de jours offerts ; le… · CAB-45 Résiliation honnête : ce qui est perdu (avec la date), l’économie du mois, puis un tap. · CAB-49 Résiliation avec commande en cours : l’avantage reste acquis, jamais de refacturation ;…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| économies = Σ livraisons offertes + réductions + cagnotte créditée | Compteur du profil. Seules les remises dues à l’abonnement : une livraison offerte par le seuil de 30 000 F n’y entre pas (CAB-33). |
| éligible_relais_offert ⇔ S ≥ seuil_palier ∧ quota_restant > 0 | Plus : 3 par mois ; Prime : illimité dans la limite de 30 (Business 70). Une commande déjà offerte par le seuil ne consomme pas de quota (CAB-36). |
| offert(commande) = R + Rem(mode) au tarif S | Jamais les ramassages suivants ni les suppléments de classe. |
| F_client = 1 + bonus(palier) ; bonus = Plus 2 · Prime, Duo, Business 4 · sinon 0 | Jours gratuits ajoutés avant le jour 2 (Prime : jours 1 à 5 gratuits). 21.5 imprime « 3 + bonus » : erreur, voir CAB-40. |
| tarif(j) = grille(rang(j) − bonus) ; renvoi après le (7 + bonus)e jour | La grille 100 / 200 / 400 F et le renvoi se décalent du bonus ; garde plafonnée à 1 400 F (1 900 F avec le renvoi). |
| prochain_prélèvement = début + n × période (+ 1 mois par parrainage récompensé) | Annonce par push 3 jours avant (ABO-PREAVIS, à créer). |
| fin_grâce = échec + 7 j (ABO-GRACE) | Pendant la grâce, l’abonnement reste actif ; ensuite palier Gratuit, historique conservé. |

**Paramètres** : `ABO-QUOTA-PLUS`, `ABO-ILLIMITE`, `ABO-GARDE-BONUS`, `ABO-GRACE`, `ABO-PREAVIS (à créer)`, `GARDE-J1 … GARDE-RENVOI`

**États et erreurs** : 4 cas (détail dans `pages.json`)

<a id="cagnotte"></a>
### `#cagnotte` — Ma cagnotte

CL-14 · après le lancement · menu : Après le lancement › Ma cagnotte

**Documentation** : décrite dans CL-14

**Sections** : CL-14 « Écran « Ma cagnotte » »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#cagnotte` Cagnotte · 3 918 F en attente · `#cagnotte?st=creditee` Cagnotte · créditée après libération · `#cagnotte?st=annulee` Cagnotte · part annulée (colis remboursé)

**Captures** : CL-14 fig. 16 `Abo_cagnotte` · CL-14 fig. 17 `Abo_cagnotte_creditee` · CL-14 fig. 18 `Abo_cagnotte_annulee`

**Règles côté serveur** (2) : CAB-50 Cagnotte de 2 % sur le sous-total produits (Prime, Prime Duo, Business), jamais sur la… *(calcul)* · CAB-52 La cagnotte se crédite par sous-commande, à la libération de chacune (un colis d’un…

**Règles côté serveur et écran** (1) : CAB-54 Chaque ligne affiche sa date de crédit et sa date d’expiration ; une ligne annulée reste…

**Règles non classées** (2) : CAB-51 Une annulation partielle annule la cagnotte de la part annulée seulement. · CAB-53 La cagnotte disponible se déduit d’une commande suivante, sur la ligne de remise du…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| cagnotte = 2 % × S, créditée à la libération | S = sous-total produits (jamais la livraison). Annulée si la commande est remboursée ; expire 90 jours après son crédit. |
| crédit(sous-commande) = 2 % × S_sous-commande, à la libération de cette sous-commande | Libération : 3 jours après la fermeture du retour (Or, Platine : 1 jour ; carte : 14 jours). |
| expiration = date de crédit + 90 j | Ven. 2 oct. + 90 j = jeu. 31 déc. ; dim. 4 oct. + 90 j = sam. 2 janv. |
| annulation partielle ⇒ cagnotte −= 2 % × S_annulé | Exemple 13.1 : Boutique B 84 000 F annulée → −1 680 F ; reste 2 238 F. |
| remise_cagnotte ≤ min(cagnotte_disponible, S) ∧ contribution(commande) ≥ plancher | Se déduit sur la ligne de remise du panier (CAB-53). |

**Paramètres** : `ABO-CAGNOTTE`

**États et erreurs** : 3 cas (détail dans `pages.json`)

<a id="parrainage"></a>
### `#parrainage` — Parrainer un proche

CL-14 · après le lancement · menu : Après le lancement › Parrainer un proche

**Documentation** : décrite dans CL-14

**Sections** : CL-14 « Écran « Parrainer un proche » »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#parrainage` Parrainage · lien, filleul en attente · `#parrainage?st=recompense` Parrainage · 1 mois offert · `#parrainage?st=limite` Parrainage · limite de 3 par mois atteinte

**Captures** : CL-14 fig. 19 `Abo_parrainage` · CL-14 fig. 20 `Abo_parrainage_recompense` · CL-14 fig. 21 `Abo_parrainage_limite`

**Règles côté serveur** (2) : CAB-55 Parrainage : 3 par mois au plus, déclenché après la première commande payée ET retirée du… *(calcul)* · CAB-56 La récompense reporte d’un mois le prochain prélèvement (annuel : terme prolongé d’un… *(calcul)*

**Règles côté écran** (2) : CAB-57 Lien de parrainage neutre (ni nom ni numéro), partagé depuis le téléphone du client ;… · CAB-58 Le filleul n’a pas de récompense définie : aucune n’est promise à l’écran.

**Paramètres** : `ABO-PARRAIN`

**États et erreurs** : 3 cas (détail dans `pages.json`)

<a id="abonnement-offrir"></a>
### `#abonnement-offrir` — Offrir un abonnement

CL-14 · après le lancement · menu : Après le lancement › Offrir un abonnement

**Documentation** : décrite dans CL-14

**Sections** : CL-14 « Page « Offrir un abonnement » (payeur à l’étranger) »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#abonnement-offrir` Offrir un abonnement · page web du payeur à l’étranger · `#abonnement-offrir?st=paye` Offrir un abonnement · payé par carte

**Captures** : CL-14 fig. 22 `Abo_offrir` · CL-14 fig. 23 `Abo_offrir_paye`

**Règles côté serveur** (1) : CAB-59 Un payeur à l’étranger peut offrir un abonnement à son bénéficiaire : carte, 2 % de frais… *(calcul)*

**Règles côté serveur et écran** (2) : CAB-61 Abonnement offert : durée fixe (1 ou 12 mois), sans prélèvement récurrent sur la carte ;… *(calcul)* · CAB-62 Carte : 3-D Secure obligatoire, frais de 2 % affichés avant de payer, équivalent en euros… *(calcul)*

**Règles non classées** (1) : CAB-60 Le bénéficiaire est désigné par son numéro BelivaY et confirmé par son prénom et…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| frais_service = arrondi(2 % × prix_abonnement) | 40 000 × 2 % = 800 F ; 4 000 × 2 % = 80 F. |
| montant_EUR = montant_XAF ÷ 655,957, arrondi au centime | 40 800 ÷ 655,957 = 62,199 → 62,20 € ; 4 080 ÷ 655,957 = 6,219 → 6,22 €. |
| montant_XAF ≤ 150 000 par transaction | Business annuel offert : 150 000 + 3 000 = 153 000 F, au-dessus du plafond ; Business n’est de toute façon pas offrable (CAB-61). |

**Paramètres** : `PAY-CARTE-FRAIS`, `PAY-CARTE-MAX`, `PAY-CARTE-ARRONDI`, `PAY-CARTE-PSP`

**États et erreurs** : 3 cas (détail dans `pages.json`)

<a id="listes"></a>
### `#listes` — Mes listes d’envies

CL-14 · après le lancement · menu : Après le lancement › Mes listes d’envies

**Documentation** : décrite dans CL-14

**Sections** : CL-14 « Les interrupteurs de fonctionnalité » ; CL-14 « Écrans « Mes listes d’envies » et « Nouvelle liste » »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#listes?st=ferme` Sauvegardés · listes d’envies fermées (une seule liste) · `#listes` Sauvegardés · mes listes d’envies (module ouvert) · `#listes?st=defaut` Sauvegardés · favoris seuls, aucune autre liste

**Captures** : CL-14 fig. 2 `Interrupteur_listes` · CL-14 fig. 24 `Listes` · CL-14 fig. 25 `Listes_defaut`

**Règles côté serveur** (3) : CLE-05 Alertes baisse de prix et retour en stock, sur la variante précise, par push gratuit. · CLE-06 La liste est distincte du partage de panier (chapitre 7, CL-07) : le panier fait payer… · CLE-09 Plafond absolu du groupage : 21 jours après le premier cadeau payé ; le groupage est… *(calcul)*

**Règles côté serveur et écran** (7) : CFS-01 Six interrupteurs de fonctionnalité existent dès le lancement, tous fermés :… · CFS-02 Interrupteur fermé = module invisible : aucune route, aucune entrée de menu, aucun encart… *(calcul)* · CFS-03 FF-ABONNEMENT masque aussi les encarts des autres chapitres : « Retrait offert dès 10 000… · CFS-05 L’interrupteur s’applique côté serveur : les endpoints d’un module fermé répondent 404 et… · CFS-11 FF-WHATSAPP-CANAL reste fermé : WhatsApp n’est pas un canal de repli des messages ; il… · CLE-02 Favoris = liste par défaut = Sauvegardés : le cœur des fiches, la section Sauvegardés du… *(calcul)* · CLE-04 Les favoris sont un signal d’intention qui nourrit le rayon « favoris de retour en stock…

**Règles côté écran** (6) : CFS-04 Un ancien lien vers un module fermé ouvre une page neutre, « Ce lien ne mène à aucune… · CFS-07 Aucun module ne s’active avec une valeur « à trancher » : LST-VALIDITE (liste d’envies),… · CFS-09 Tant qu’un interrupteur est fermé, le point relais et le vendeur masquent aussi ce qui en… · CFS-10 La pastille « Après le lancement · interrupteur fermé » et le code FF-… affichés en tête… · CLE-03 Les favoris sont une seule liste : pas de « boutiques suivies ». · CLE-07 Créer une liste : nom, occasion, mode de remise ; « au fil de l’eau » par défaut.

**Règles non classées** (5) : CFS-06 Tous les codes de paramètres des modules après lancement sont créés dans la même table… · CFS-08 L’abonnement ouvre au 2e ou 3e trimestre d’exploitation (proposé à partir du 7e mois),… · CLE-01 Une liste par défaut (les favoris) et des listes nommées, vivantes : rentrée, mariage,… · CLE-08 Mode groupé : date cible obligatoire, fixée à la création ; les colis partent à cette… · CLE-10 Un relais saturé refuse les nouvelles listes groupées : la capacité déclarée est vérifiée…

**Paramètres** : `FF-ABONNEMENT`, `FF-LISTE-ENVIES`, `FF-FLASH`, `FF-IA`, `FF-EX01 … FF-EX06`, `FF-WHATSAPP-CANAL`, `LST-GROUPE-MAX`, `LST-GARDE`

**États et erreurs** : 6 cas (détail dans `pages.json`)

<a id="liste-creer"></a>
### `#liste-creer` — Nouvelle liste

CL-14 · après le lancement

**Documentation** : décrite dans CL-14

**Sections** : CL-14 « Écrans « Mes listes d’envies » et « Nouvelle liste » »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#liste-creer?mode=groupe` Sauvegardés · feuille « Nouvelle liste » groupée

**Captures** : CL-14 fig. 26 `Liste_creer`

**Règles côté serveur** (3) : CLE-05 Alertes baisse de prix et retour en stock, sur la variante précise, par push gratuit. · CLE-06 La liste est distincte du partage de panier (chapitre 7, CL-07) : le panier fait payer… · CLE-09 Plafond absolu du groupage : 21 jours après le premier cadeau payé ; le groupage est… *(calcul)*

**Règles côté serveur et écran** (2) : CLE-02 Favoris = liste par défaut = Sauvegardés : le cœur des fiches, la section Sauvegardés du… *(calcul)* · CLE-04 Les favoris sont un signal d’intention qui nourrit le rayon « favoris de retour en stock…

**Règles côté écran** (2) : CLE-03 Les favoris sont une seule liste : pas de « boutiques suivies ». · CLE-07 Créer une liste : nom, occasion, mode de remise ; « au fil de l’eau » par défaut.

**Règles non classées** (3) : CLE-01 Une liste par défaut (les favoris) et des listes nommées, vivantes : rentrée, mariage,… · CLE-08 Mode groupé : date cible obligatoire, fixée à la création ; les colis partent à cette… · CLE-10 Un relais saturé refuse les nouvelles listes groupées : la capacité déclarée est vérifiée…

**Paramètres** : `LST-GROUPE-MAX`, `LST-GARDE`

**États et erreurs** : 3 cas (détail dans `pages.json`)

<a id="liste-envies"></a>
### `#liste-envies` — Ma liste

CL-14 · après le lancement

**Documentation** : décrite dans CL-14

**Sections** : CL-14 « Écran « Ma liste » (propriétaire) »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#liste-envies?id=anniv` Liste d’envies · groupée, 2 sur 4 offerts · `#liste-envies?id=favoris` Liste d’envies · favoris (liste par défaut) · `#liste-envies?id=anniv&st=surprise` Liste d’envies · mode surprise · `#liste-envies?id=anniv&st=demarrer` Liste d’envies · feuille « Démarrer la livraison maintenant »

**Captures** : CL-14 fig. 27 `Liste_anniversaire` · CL-14 fig. 28 `Liste_favoris` · CL-14 fig. 29 `Liste_surprise` · CL-14 fig. 30 `Liste_demarrer`

**Règles côté serveur et écran** (1) : CLE-15 « Démarrer la livraison maintenant » : ce qui est offert part, le reste forme un second… *(calcul)*

**Règles côté écran** (2) : CLE-12 Le propriétaire suit « 2 articles sur 4 offerts » et la date de remise. · CLE-17 Hors mode surprise, le propriétaire voit le prénom de celui qui a offert chaque article…

**Règles non classées** (5) : CLE-11 Contenu d’un article : photo, variante, prix livré à jour, disponibilité réelle ; jamais… · CLE-13 Pendant l’attente, il peut retirer un article non offert (instantané) ; si tout le reste… · CLE-14 Un article déjà offert ne se retire jamais. · CLE-16 Plusieurs contributeurs sont possibles, article par article. · CLE-18 Mode surprise côté propriétaire : il voit combien d’articles sont offerts, jamais…

**Paramètres** : `LST-GROUPE-MAX`, `LST-GARDE`

**États et erreurs** : 3 cas (détail dans `pages.json`)

<a id="liste-envoyer"></a>
### `#liste-envoyer` — Envoyer ma liste

CL-14 · après le lancement

**Documentation** : décrite dans CL-14

**Sections** : CL-14 « Écran « Envoyer ma liste » »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#liste-envoyer` Envoyer ma liste · avec mon adresse · `#liste-envoyer?id=mariage` Envoyer ma liste · groupée, relais d’un proche · `#liste-envoyer?st=hors-zone` Envoyer ma liste · adresse hors zone · `#liste-envoyer?st=sans-relais` Envoyer ma liste · sans relais habituel

**Captures** : CL-14 fig. 31 `Liste_envoyer` · CL-14 fig. 32 `Liste_envoyer_tierce` · CL-14 fig. 33 `Liste_envoyer_hors_zone` · CL-14 fig. 34 `Liste_envoyer_sans_relais`

**Règles côté serveur** (1) : CLE-22 Une adresse tierce hors zone exploitée est signalée à l’envoi avec son délai réel, une…

**Règles côté serveur et écran** (2) : CLE-24 Validité du lien : 7, 30 ou 90 jours ; sans expiration, on accumule des listes aux prix… *(calcul)* *(À trancher)* · CLE-25 Canaux : WhatsApp, SMS, copier le lien ; le partage part du téléphone du propriétaire…

**Règles côté écran** (4) : CLE-20 « Avec mon adresse » est bloqué tant que le propriétaire n’a pas choisi de relais… · CLE-21 Liste groupée : « sans adresse » est impossible (tous les colis doivent arriver au même… · CLE-23 Mode surprise activé : le destinataire reçoit « un colis t’attend », sans dire quoi ni de… · CLE-26 Dès qu’un cadeau est payé, l’adresse et le mode de remise d’une liste partagée ne…

**Règles non classées** (1) : CLE-19 Trois choix d’adresse : avec mon adresse (le colis va à mon relais — par défaut), sans…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| lien valide ⇔ t_now ≤ t_partage + validité | Aujourd’hui + 30 j = sam. 24 oct. ; + 7 j = jeu. 1er oct. ; + 90 j = mer. 23 déc. |
| « avec mon adresse » possible ⇔ relais_habituel ≠ ∅ | — |
| relais tiers possible (groupée) ⇔ capacité_déclarée − occupés − groupés > 0 | Relais Melen « Plein aujourd’hui » : refusé. |

**Paramètres** : `LST-VALIDITE`

**États et erreurs** : 3 cas (détail dans `pages.json`)

<a id="liste-publique"></a>
### `#liste-publique` — Liste partagée

CL-14 · après le lancement · menu : Après le lancement › Liste partagée

**Documentation** : décrite dans CL-14

**Sections** : CL-14 « Page « Liste partagée » (celui qui offre) »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#liste-publique` Liste partagée · page web de celui qui offre · `#liste-publique?st=expire` Liste partagée · lien expiré

**Captures** : CL-14 fig. 35 `Liste_publique` · CL-14 fig. 36 `Liste_publique_expiree`

**Règles côté serveur** (1) : CLE-28 Il voit le quartier du relais de retrait, jamais l’adresse ni le numéro du propriétaire,…

**Règles côté serveur et écran** (2) : CLE-29 Un article déjà offert est verrouillé et grisé pour tous. · CLE-33 Lien expiré : « Cette liste n’est plus partagée ».

**Règles côté écran** (1) : CLE-32 Les trois étapes sont écrites en clair : celui qui offre découvre souvent BelivaY par ce…

**Règles non classées** (3) : CLE-27 Celui qui offre voit les articles, leurs prix, leur disponibilité et le coût de livraison… · CLE-30 Les prénoms des personnes qui ont offert ne sont jamais montrés aux autres visiteurs. · CLE-31 Un article en rupture est attribué au vendeur suivant du même produit, au prix du moment…

**États et erreurs** : 3 cas (détail dans `pages.json`)

<a id="liste-offrir"></a>
### `#liste-offrir` — Offrir un article

CL-14 · après le lancement

**Documentation** : décrite dans CL-14

**Sections** : CL-14 « Pages « Offrir un article » et « Cadeau payé » »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#liste-offrir` Offrir un article · Mobile Money · `#liste-offrir?moyen=carte` Offrir un article · carte depuis l’étranger · `#liste-offrir?st=prix` Offrir un article · prix changé depuis le partage · `#liste-offrir?st=pris` Offrir un article · déjà offert par quelqu’un

**Captures** : CL-14 fig. 37 `Liste_offrir` · CL-14 fig. 38 `Liste_offrir_carte` · CL-14 fig. 39 `Liste_offrir_prix` · CL-14 fig. 40 `Liste_offrir_pris`

**Règles côté serveur** (3) : CLE-42 Escrow normal : le vendeur est payé après la remise ; en mode groupé, à la remise… *(calcul)* · CLE-43 Qui confirme et ouvre un litige : celui qui a le colis en main ; le payeur est notifié à… · CLE-44 Remboursement au payeur, sur son moyen de paiement ; jamais au bénéficiaire.

**Règles côté serveur et écran** (4) : CLE-34 Qui paie : celui qui offre, depuis son compte ou en invité ; MTN MoMo et Orange Money… *(calcul)* · CLE-38 Verrou au clic sur payer, en même temps que la réservation de stock ; le second payeur… · CLE-41 Transparence au moment d’offrir, en mode groupé : « remis avec les autres colis, le… *(calcul)* · CLE-45 À la remise, le payeur reçoit « [Prénom] a retiré ton cadeau aujourd’hui à [heure] » («… *(calcul)*

**Règles non classées** (6) : CLE-35 Un invité donne son prénom (que le propriétaire verra, sauf en mode surprise), son moyen… · CLE-36 Où va le colis : selon le choix d’adresse ; par défaut au relais du propriétaire ; le… · CLE-37 Quel abonnement : celui du destinataire du colis, puisque la remise se fait à son relais. · CLE-39 Prix modifié depuis le partage : prix du moment du paiement ; la hausse est signalée… · CLE-40 Article retiré de la liste pendant un paiement : paiement bloqué avant débit, message au… · CLE-46 Après le paiement du cadeau : aucune suggestion commerciale, aucune création de compte…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| verrou(article) au clic sur payer | En même temps que la réservation de stock ; levé si le paiement échoue ou expire. |
| total = prix_du_moment + livraison(destinataire) [+ 2 % carte] | Tapis : 9 900 + 900 = 10 800 F. Crème par carte : 6 900 + 900 = 7 800 ; 2 % = 156 ; 7 956 F ≈ 12,13 €. |
| livraison(destinataire) = tarif avec l’abonnement du destinataire du colis | Remise à son relais : son palier s’applique (ici aucun avantage sous 10 000 F). |
| remboursement → payeur, moyen d’origine | Jamais au bénéficiaire ; carte : sur la carte. |

**Paramètres** : `PAY-CARTE-FRAIS`, `PAY-CARTE-MAX`, `PAY-CARTE-ARRONDI`

**États et erreurs** : 5 cas (détail dans `pages.json`)

<a id="liste-offert"></a>
### `#liste-offert` — Cadeau offert

CL-14 · après le lancement

**Documentation** : décrite dans CL-14

**Sections** : CL-14 « Pages « Offrir un article » et « Cadeau payé » »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#liste-offert` Cadeau payé · confirmation à celui qui offre · `#liste-offert?st=retire` Cadeau remis · e-mail de remerciement

**Captures** : CL-14 fig. 41 `Liste_offert` · CL-14 fig. 42 `Liste_offert_remis`

**Règles côté serveur** (3) : CLE-42 Escrow normal : le vendeur est payé après la remise ; en mode groupé, à la remise… *(calcul)* · CLE-43 Qui confirme et ouvre un litige : celui qui a le colis en main ; le payeur est notifié à… · CLE-44 Remboursement au payeur, sur son moyen de paiement ; jamais au bénéficiaire.

**Règles côté serveur et écran** (4) : CLE-34 Qui paie : celui qui offre, depuis son compte ou en invité ; MTN MoMo et Orange Money… *(calcul)* · CLE-38 Verrou au clic sur payer, en même temps que la réservation de stock ; le second payeur… · CLE-41 Transparence au moment d’offrir, en mode groupé : « remis avec les autres colis, le… *(calcul)* · CLE-45 À la remise, le payeur reçoit « [Prénom] a retiré ton cadeau aujourd’hui à [heure] » («… *(calcul)*

**Règles non classées** (6) : CLE-35 Un invité donne son prénom (que le propriétaire verra, sauf en mode surprise), son moyen… · CLE-36 Où va le colis : selon le choix d’adresse ; par défaut au relais du propriétaire ; le… · CLE-37 Quel abonnement : celui du destinataire du colis, puisque la remise se fait à son relais. · CLE-39 Prix modifié depuis le partage : prix du moment du paiement ; la hausse est signalée… · CLE-40 Article retiré de la liste pendant un paiement : paiement bloqué avant débit, message au… · CLE-46 Après le paiement du cadeau : aucune suggestion commerciale, aucune création de compte…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| verrou(article) au clic sur payer | En même temps que la réservation de stock ; levé si le paiement échoue ou expire. |
| total = prix_du_moment + livraison(destinataire) [+ 2 % carte] | Tapis : 9 900 + 900 = 10 800 F. Crème par carte : 6 900 + 900 = 7 800 ; 2 % = 156 ; 7 956 F ≈ 12,13 €. |
| livraison(destinataire) = tarif avec l’abonnement du destinataire du colis | Remise à son relais : son palier s’applique (ici aucun avantage sous 10 000 F). |
| remboursement → payeur, moyen d’origine | Jamais au bénéficiaire ; carte : sur la carte. |

**Paramètres** : `PAY-CARTE-FRAIS`, `PAY-CARTE-MAX`, `PAY-CARTE-ARRONDI`

**États et erreurs** : 5 cas (détail dans `pages.json`)

<a id="ventes-flash"></a>
### `#ventes-flash` — Ventes flash

CL-14 · après le lancement · menu : Après le lancement › Ventes flash

**Documentation** : décrite dans CL-14

**Sections** : CL-14 « Écran « Ventes flash » »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#ventes-flash` Ventes flash · vraie fin, vrai stock (depuis la fiche) · `#ventes-flash?offre=cartable` Ventes flash · feuille d’une offre · `#ventes-flash?st=hors-zone` Ventes flash · aucune offre pour le relais

**Captures** : CL-14 fig. 43 `Flash` · CL-14 fig. 44 `Flash_offre` · CL-14 fig. 45 `Flash_hors_zone`

**Règles côté serveur** (2) : CVF-03 Une vente flash dure 48 h au plus. *(calcul)* · CVF-05 Aucune promotion par SMS ; push dans la catégorie Promotions (3 par semaine au plus, 9 h… *(calcul)*

**Règles côté serveur et écran** (4) : CVF-01 Le compte à rebours correspond à la vraie fin de l’offre ; le stock affiché est le stock… · CVF-02 La remise est calculée sur un prix réellement pratiqué ; « prix barré » seulement si… *(calcul)* · CVF-09 Offre terminée : prix habituel, sans prix barré ni compte à rebours ; stock de l’offre… · CVF-10 Le prix est recalculé au paiement : si l’offre a pris fin, le panier montre le prix…

**Règles côté écran** (2) : CVF-04 Offres géolocalisées : visibles des clients dont le relais est dans la zone d’une tournée… · CVF-08 Chaque offre affiche son heure de fin en mots et le temps restant ; la liste est triée…

**Règles non classées** (2) : CVF-06 Une vente flash ne rend jamais une commande déficitaire (plancher de contribution) ; la… · CVF-07 Un calendrier guide les offres : salaires de fin de mois, rentrée d’août-septembre, fêtes…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| remise = 1 − prix_flash ÷ prix_pratiqué ≥ FLASH-REMISE-MIN | Cartable : 1 − 10 900 ÷ 12 500 = 12,8 % → « −13 % » ; porte-bébé 12,1 % ; chargeur 15,4 %. |
| fin − début ≤ FLASH-DUREE-MAX | Cartable : mer. 23 sept. 20 h → jeu. 24 sept. 20 h (24 h) ; chargeur : mer. 23 à 12 h → ven. 25 à 12 h (48 h). |
| temps restant = fin − maintenant | À 10 h 15 : 9 h 45, 22 h 45, 25 h 45. |
| visible(offre, client) ⇔ zone(relais_client) ∈ zones_tournée_à_compléter | FLASH-ZONE. |
| contribution(commande avec remise flash) ≥ plancher | Sinon l’offre n’est pas publiée. |

**Paramètres** : `FLASH-DUREE-MAX`, `FLASH-REMISE-MIN`, `FLASH-ZONE`, `FLASH-BUDGET`, `PUSH-PROMO`

**États et erreurs** : 3 cas (détail dans `pages.json`)

<a id="assistant"></a>
### `#assistant` — Assistant BelivaY

CL-14 · après le lancement · menu : Après le lancement › Assistant BelivaY

**Documentation** : décrite dans CL-14

**Sections** : CL-14 « Écrans « Assistant BelivaY » et « Confirmer » »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#assistant` Assistant · réponse, code jamais écrit (depuis Aide) · `#assistant?st=alternative` Assistant · produit introuvable, alternative · `#assistant?st=humain` Assistant · passage à un conseiller · `#assistant?st=proactif` Assistant · propositions proactives · `#assistant?st=fait` Assistant · action faite après accord

**Captures** : CL-14 fig. 46 `IA_repondre` · CL-14 fig. 47 `IA_alternative` · CL-14 fig. 48 `IA_humain` · CL-14 fig. 49 `IA_proactif` · CL-14 fig. 52 `IA_fait`

**Règles côté serveur** (3) : CIA-06 La protection (litige, suivi, code, remboursement) reste gratuite ; les plafonds… *(calcul)* · CIA-07 Aucun plafond chiffré n’existe dans la spécification : tant qu’il n’est pas fixé, aucun… *(calcul)* · CIA-12 Architecture 100 % par API, derrière une couche AIService instrumentée pour mesurer le… *(calcul)*

**Règles côté serveur et écran** (4) : CIA-02 L’assistant propose ; le client décide. · CIA-08 Propositions proactives utiles : retour en stock, baisse de prix, colis à retirer ; elles… · CIA-09 Un problème sur une commande ouvre le formulaire de litige (quatre écrans, CL-11), jamais… · CIA-11 Une action confirmée passe par le même service que l’écran de base (annulation 13.1,…

**Règles côté écran** (4) : CIA-03 Passage à un humain sur demande (bouton casque, toujours visible) ou après 2 échecs ; le… · CIA-04 Jamais un « non » sec : toujours une alternative achetable ou une alerte (« Préviens-moi… · CIA-05 Jamais le code de retrait dans une réponse : l’assistant ouvre l’écran du code dans Mes… · CIA-10 Pas de bouton flottant sur les écrans : l’assistant s’ouvre depuis l’Aide.

**Règles non classées** (1) : CIA-01 Orientation en trois niveaux : répondre, proposer une alternative achetable, passer la…

**Paramètres** : `IA-COUT-MAX`, `IA-HUMAIN`, `SUP-DELAI`, `SUP-HORAIRES`

**États et erreurs** : 4 cas (détail dans `pages.json`)

<a id="assistant-confirmer"></a>
### `#assistant-confirmer` — Confirmer

CL-14 · après le lancement

**Documentation** : décrite dans CL-14

**Sections** : CL-14 « Écrans « Assistant BelivaY » et « Confirmer » »

**Voir aussi, règles transverses** : « Abonnement : hypothèses, vérification économique, règles et API » ; « Liste d’envies : remise groupée, escrow, liaisons et API » ; « Registre des paramètres après le lancement (32.1 à 32.4) »

**États** : `#assistant-confirmer` Assistant · confirmer une annulation proposée · `#assistant-confirmer?action=paiement` Assistant · confirmer un paiement proposé

**Captures** : CL-14 fig. 50 `IA_confirmer` · CL-14 fig. 51 `IA_confirmer_paiement`

**Règles côté serveur** (3) : CIA-06 La protection (litige, suivi, code, remboursement) reste gratuite ; les plafonds… *(calcul)* · CIA-07 Aucun plafond chiffré n’existe dans la spécification : tant qu’il n’est pas fixé, aucun… *(calcul)* · CIA-12 Architecture 100 % par API, derrière une couche AIService instrumentée pour mesurer le… *(calcul)*

**Règles côté serveur et écran** (4) : CIA-02 L’assistant propose ; le client décide. · CIA-08 Propositions proactives utiles : retour en stock, baisse de prix, colis à retirer ; elles… · CIA-09 Un problème sur une commande ouvre le formulaire de litige (quatre écrans, CL-11), jamais… · CIA-11 Une action confirmée passe par le même service que l’écran de base (annulation 13.1,…

**Règles côté écran** (4) : CIA-03 Passage à un humain sur demande (bouton casque, toujours visible) ou après 2 échecs ; le… · CIA-04 Jamais un « non » sec : toujours une alternative achetable ou une alerte (« Préviens-moi… · CIA-05 Jamais le code de retrait dans une réponse : l’assistant ouvre l’écran du code dans Mes… · CIA-10 Pas de bouton flottant sur les écrans : l’assistant s’ouvre depuis l’Aide.

**Règles non classées** (1) : CIA-01 Orientation en trois niveaux : répondre, proposer une alternative achetable, passer la…

**Paramètres** : `IA-COUT-MAX`, `IA-HUMAIN`, `SUP-DELAI`, `SUP-HORAIRES`

**États et erreurs** : 4 cas (détail dans `pages.json`)

<a id="rentree"></a>
### `#rentree` — Liste de rentrée

CL-15 · après le lancement · onglet sauvegardes · menu : Après le lancement › Liste de rentrée

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Chercher l’école » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#rentree` Rentrée · chercher l’école, liste en cours (depuis Sauvegardés) · `#rentree?st=hors-saison` Rentrée · hors saison

**Captures** : CL-15 fig. 1 `Rentree_ecoles` · CL-15 fig. 2 `Rentree_horssaison`

**Règles côté serveur et écran** (2) : CRS-06 Résultats : écoles vérifiées seulement, triées par distance au relais habituel du client… · CRS-07 Hors saison (avant RNT-OUVERTURE), l’écran annonce la date d’ouverture et garde l’accès à…

**Règles côté écran** (1) : RNT-01 Seules les écoles vérifiées par la console publient une liste officielle. *(Proposé)*

**États et erreurs** : 3 cas (détail dans `pages.json`)

<a id="rentree-liste-papier"></a>
### `#rentree-liste-papier` — Liste papier

CL-15 · après le lancement · onglet sauvegardes

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Liste papier » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#rentree-liste-papier` Rentrée · photographier la liste papier · `#rentree-liste-papier?st=envoyee` Rentrée · liste papier reçue

**Captures** : CL-15 fig. 3 `Rentree_papier` · CL-15 fig. 4 `Rentree_papier_envoyee`

**Règles côté serveur** (2) : RNT-02 Liste papier photographiée : saisie par un agent BelivaY sous 24 h. *(calcul)* *(Proposé)* · CRS-09 Une liste papier saisie reste privée au parent qui l’a envoyée : elle n’est jamais…

**Règles côté serveur et écran** (1) : CRS-08 Le délai s’affiche en heure ferme (heure d’envoi + RNT-SAISIE-H), jamais « sous 24 h »… *(calcul)*

**États et erreurs** : 2 cas (détail dans `pages.json`)

<a id="rentree-classe"></a>
### `#rentree-classe` — Choisir la classe

CL-15 · après le lancement · onglet sauvegardes

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Choisir la classe » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#rentree-classe` Rentrée · choisir la classe

**Captures** : CL-15 fig. 5 `Rentree_classe`

**Règles côté serveur et écran** (1) : CRS-10 Le prix affiché est celui de la liste complète, recalculé à l’affichage (offres…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| prix_livré(classe) = Σ articles + Σ ramassages + remise − offert | Service de tarification, liste complète, relais habituel du client. CE1 : 47 800 + (500 + 380 + 500) + 400 − 900 = 48 680 F. |

<a id="rentree-liste"></a>
### `#rentree-liste` — Liste CE1

CL-15 · après le lancement · onglet sauvegardes

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « La liste » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#rentree-liste?st=modifiee` Rentrée · la liste, modifiée par l’école · `#rentree-liste?st=possede` Rentrée · article déjà possédé décoché · `#rentree-liste?st=equivalent` Rentrée · feuille « équivalent conforme »

**Captures** : CL-15 fig. 6 `Rentree_liste_modifiee` · CL-15 fig. 7 `Rentree_liste_possede` · CL-15 fig. 8 `Rentree_liste_equivalent`

**Règles côté serveur** (2) : RNT-04 Un article déjà possédé se décoche ; le total est recalculé depuis zéro. *(calcul)* · CRS-12 Un article décoché retire aussi le ramassage de sa boutique si elle n’a plus d’article ;… *(calcul)*

**Règles côté serveur et écran** (1) : CRS-13 « Parents prévenus » (RNT-11) : ceux qui ont ouvert ou mis la liste au panier reçoivent…

**Règles côté écran** (1) : CRS-11 Chaque ligne montre la consigne de l’école quand elle existe ; une consigne « édition…

**Règles non classées** (3) : RNT-03 Chaque article est rattaché à un produit maître ; l’offre suit l’attribution normale. · RNT-05 Un équivalent n’est proposé que s’il correspond à la consigne de l’école. *(Proposé)* · RNT-11 Liste modifiée après publication : historique gardé, parents prévenus. *(Proposé)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| total = tarif(lignes cochées) | Recalcul complet à chaque case : 47 800 → 35 300 F d’articles, ramassages 1 380 → 880 F (la boutique C sort), total 48 680 → 35 680 F. |
| équivalent proposé ⇔ produit conforme à la consigne ∧ consigne ≠ « édition exigée » | Le nouveau total est affiché avant de remplacer : 48 680 − 400 = 48 280 F. |

**États et erreurs** : 2 cas (détail dans `pages.json`)

<a id="rentree-panier"></a>
### `#rentree-panier` — Panier de rentrée

CL-15 · après le lancement · onglet sauvegardes

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Panier de rentrée » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#rentree-panier` Rentrée · panier de rentrée, 3 boutiques

**Captures** : CL-15 fig. 9 `Rentree_panier`

**Règles côté serveur** (1) : CRS-16 Pour la mise de côté, la liste compte comme un seul achat : l’éligibilité (MDC-PRIX-MIN,… *(calcul)*

**Règles côté serveur et écran** (1) : CRS-14 Le panier de rentrée reprend les règles du panier de base (sections boutique anonymes,…

**Règles côté écran** (1) : CRS-15 Deux choix seulement, payer ou mettre de côté (25.4) : le paiement au comptoir n’est pas…

**Règles non classées** (3) : RNT-06 Livraison offerte dès 30 000 F ; ramassage suivant 380 F en même zone. · RNT-07 Toute la liste livrée ensemble, avec un seul code de retrait. *(Proposé)* · RNT-08 La mise de côté (EX-03) est proposée pour la liste de rentrée. *(Proposé)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| Ram = 500 (1re boutique) + 380 (suivante même zone) + 500 (zone différente) | A et B à Mvog-Ada : 500 + 380 = 880 F ; avec C (Essos) : 1 380 F. |
| offert = 500 + 400 si S ≥ 30 000 F | 35 300 ≥ 30 000 → −900 F ; total = 35 300 + 880 + 400 − 900 = 35 680 F. |
| acompte = 20 % × total, arrondi au franc supérieur | 0,2 × 35 680 = 7 136 F (liste complète : 0,2 × 48 680 = 9 736 F). |

**États et erreurs** : 2 cas (détail dans `pages.json`)

<a id="rentree-suivi"></a>
### `#rentree-suivi` — Suivi de la liste

CL-15 · après le lancement · onglet sauvegardes

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Suivi de la liste » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#rentree-suivi` Rentrée · suivi, 1 colis sur 2 arrivé · `#rentree-suivi?st=complete` Rentrée · toute la liste au relais, un seul code

**Captures** : CL-15 fig. 10 `Rentree_suivi` · CL-15 fig. 11 `Rentree_suivi_complete`

**Règles côté serveur** (2) : CRS-17 Groupage : les colis arrivés attendent les autres gratuitement, 21 jours au plus… *(calcul)* · CRS-18 Au plafond de 21 jours, le groupage est rompu comme en 22.5 : ce qui est au relais… *(calcul)*

**Règles côté serveur et écran** (1) : CRS-21 Le message unique (push, et SMS de code dans le budget de six SMS) ne met jamais le code…

**Règles non classées** (3) : RNT-09 Un seul message et un seul code quand toute la liste est au relais. · CRS-19 Le relais n’est pas rémunéré pour les jours de groupage (comme 22.5) ; il est payé à la… · CRS-20 La capacité du relais est vérifiée avant d’accepter une liste groupée ; un relais saturé…

<a id="ecole"></a>
### `#ecole` — Espace école

CL-15 · après le lancement · menu : Après le lancement › Espace école

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Espace école » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#ecole` Espace école · publier les listes (lien « Tu représentes une école ? »)

**Captures** : CL-15 fig. 12 `Ecole`

**Règles non classées** (2) : RNT-10 L’école publie gratuitement ; BelivaY ne lui verse rien et ne lui demande rien. *(Proposé)* · CRS-22 L’école saisit une liste en brouillon ; chaque ligne est rattachée à un produit maître…

<a id="cotisation"></a>
### `#cotisation` — Cotisation

CL-15 · après le lancement · onglet accueil · menu : Après le lancement › Cotisation pour un cadeau

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Créer une cotisation » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#cotisation` Cotisation · créer (depuis la fiche du cadeau)

**Captures** : CL-15 fig. 13 `Cotisation_creer`

**Règles côté serveur** (2) : COT-02 Date limite de 30 jours au plus. *(calcul)* *(Proposé)* · CCZ-05 Le prix livré est calculé pour le relais du bénéficiaire (ou son domicile pour un XL) par…

**Règles côté serveur et écran** (1) : COT-01 Objectif = prix livré du cadeau + frais de service de 2 %, affiché avant la création. *(calcul)* *(Proposé)*

**Règles non classées** (1) : COT-03 Le cadeau suit les règles de livraison de base ; XL jamais en relais.

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| objectif = prix_livré(cadeau, relais du bénéficiaire) + arrondi(2 % × prix_livré) | 27 500 + 900 = 28 400 ; 2 % = 568 ; objectif 28 968 F, figé à la création. |
| date_limite ≤ création + COT-DUREE-MAX | Créée le mar. 15 sept. : au plus tard le jeu. 15 oct. ; choisie : mer. 30 sept. |

<a id="cotisation-partager"></a>
### `#cotisation-partager` — Partager

CL-15 · après le lancement · onglet accueil

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Partager » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#cotisation-partager` Cotisation · créée, partager le lien

**Captures** : CL-15 fig. 14 `Cotisation_partager`

**Règles côté serveur et écran** (1) : CCZ-06 Partage par le partage natif du téléphone (WhatsApp, SMS, copier le lien), sans coût pour… *(calcul)*

<a id="cotisation-participer"></a>
### `#cotisation-participer` — Participer

CL-15 · après le lancement · menu : Après le lancement › Participer à une cotisation

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Page « Participer » (page web du lien) »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#cotisation-participer` Cotisation · page web ouverte par le lien · `#cotisation-participer?st=carte` Cotisation · participer discrètement, par carte

**Captures** : CL-15 fig. 15 `Cotisation_participer` · CL-15 fig. 16 `Cotisation_participer_carte`

**Règles côté serveur et écran** (2) : COT-04 Participation libre à partir de 1 000 F, en Mobile Money ou par carte (2 %). *(calcul)* *(Proposé)* · CCZ-09 Par carte : 3-D Secure, frais de service carte de 2 % ajoutés et affichés avant de payer,… *(calcul)*

**Règles côté écran** (1) : COT-05 Participation discrète : le nom n’apparaît pas aux autres. *(Proposé)*

**Règles non classées** (3) : COT-06 L’argent reste bloqué : il ne sert qu’au cadeau ou revient à chacun ; jamais de retrait… *(Proposé)* · CCZ-07 Page web accessible sans compte (entrée légère, comme 22.3) ; elle n’expose ni l’adresse,… · CCZ-08 Une participation est plafonnée au montant qui manque : la cotisation ne dépasse jamais…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| participation ∈ [COT-PART-MIN ; objectif − Σ participations] | 1 000 ≤ p ≤ 3 968 F. |
| carte : débit = p + arrondi(2 % × p) ; € = débit ÷ 655,957 | 3 968 + 79 = 4 047 F ; 6,17 €. |

**États et erreurs** : 3 cas (détail dans `pages.json`)

<a id="cotisation-suivre"></a>
### `#cotisation-suivre` — Ma cotisation

CL-15 · après le lancement · onglet commandes

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Ma cotisation » (suivre) »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#cotisation-suivre` Cotisation · suivre la jauge, issues à la date limite

**Captures** : CL-15 fig. 17 `Cotisation_suivre`

**Règles côté serveur et écran** (1) : CCZ-10 La jauge ne compte que les participations validées par webhook, jamais les tentatives ;…

**Règles côté écran** (1) : CCZ-11 L’organisateur voit prénom, date, montant et mot de chaque participant ; une…

**Règles non classées** (1) : COT-07 Jauge et participants visibles de tous, sauf les participations discrètes. *(Proposé)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| jauge = Σ participations validées ÷ objectif | 25 000 ÷ 28 968 = 86 % (arrondi inférieur : jamais 100 % avant l’objectif). |

<a id="cotisation-atteinte"></a>
### `#cotisation-atteinte` — Objectif atteint

CL-15 · après le lancement · onglet commandes

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Objectif atteint » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#cotisation-atteinte` Cotisation · objectif atteint, commande passée · `#cotisation-atteinte?st=hausse` Cotisation · objectif atteint, hausse de prix à trancher

**Captures** : CL-15 fig. 18 `Cotisation_atteinte` · CL-15 fig. 19 `Cotisation_hausse`

**Règles côté serveur** (1) : CCZ-13 Hausse : d’abord l’attribution normale au prix figé ; sinon BelivaY prend en charge une… *(calcul)*

**Règles côté serveur et écran** (1) : CCZ-12 À l’objectif, la commande est créée automatiquement au nom de l’organisateur, payée par… *(calcul)*

**Règles non classées** (1) : COT-08 Objectif atteint : la commande part au prix figé à la création ; hausse de prix absorbée… *(Proposé)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| hausse = prix_livré(maintenant) − prix_livré(figé) | (29 900 + 900) − 28 400 = 2 400 F ; 2 400 ÷ 28 400 = 8,5 %. |
| hausse ≤ 5 % → prise en charge par BelivaY ; sinon choix de l’organisateur | Même seuil que la bascule vers le vendeur suivant (13.1). |

<a id="cotisation-echue"></a>
### `#cotisation-echue` — Cotisation terminée

CL-15 · après le lancement · onglet commandes

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Cotisation terminée » (échéance manquée) »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#cotisation-echue` Cotisation · date limite dépassée, remboursements

**Captures** : CL-15 fig. 20 `Cotisation_echue`

**Règles côté serveur** (1) : COT-09 Date limite dépassée : chacun est remboursé sur son moyen de paiement, sans frais. *(Proposé)*

**Règles côté serveur et écran** (1) : CCZ-14 Les remboursements partent le lendemain de la date limite, chacun vers le moyen d’origine…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| remboursé(p) = débit(p), frais de carte compris | Hervé : 3 000 + 60 = 3 060 F ; total rendu 25 000 + 60 = 25 060 F. |

<a id="cote"></a>
### `#cote` — Mettre de côté

CL-15 · après le lancement · onglet accueil · menu : Après le lancement › Mettre de côté avec acompte

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Feuille « Mettre de côté » (proposer) »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#cote` Mise de côté · feuille sur la fiche du produit · `#cote?st=non` Mise de côté · article sous 20 000 F, non éligible

**Captures** : CL-15 fig. 21 `Cote_offre` · CL-15 fig. 22 `Cote_non`

**Règles côté serveur** (2) : MDC-01 Zéro intérêt, zéro frais de service. · MDC-02 Acompte minimal à la réservation. *(Proposé)*

**Règles côté serveur et écran** (2) : CMD-06 Le « prix » du chapitre 27 est le prix livré total au relais (articles + livraison +… *(calcul)* · CMD-07 Deux rythmes proposés : toutes les 2 semaines ou chaque mois, avec la date de fin… *(calcul)*

**Règles non classées** (1) : MDC-03 Durée maximale de la mise de côté. *(Proposé)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| éligible ⇔ prix de l’article ≥ MDC-PRIX-MIN | 150 699 ≥ 20 000 : oui ; 18 500 : non. Liste de rentrée : total de la liste (CRS-16). |
| acompte = MDC-ACOMPTE × prix livré, arrondi au franc supérieur | 0,2 × 150 699 = 30 139,8 → 30 140 F ; liste 35 680 → 7 136 F. |
| fin ≤ réservation + MDC-DUREE | Jeu. 24 sept. + 60 jours = lun. 23 nov. |

<a id="cote-plan"></a>
### `#cote-plan` — Plan de versements

CL-15 · après le lancement · onglet accueil

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Plan de versements » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#cote-plan` Mise de côté · plan de versements

**Captures** : CL-15 fig. 23 `Cote_plan`

**Règles côté serveur** (2) : MDC-04 Le stock est réservé chez le vendeur pendant toute la mise de côté. *(Proposé)* · CMD-09 Le plan annonce avant l’acompte : date de fin de réservation, rappels, grâce et forfait…

**Règles côté serveur et écran** (1) : CMD-08 La somme des versements égale exactement le prix : le dernier versement absorbe l’arrondi… *(calcul)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| v = (prix − acompte) ÷ n, arrondi au franc supérieur ; dernier = prix − acompte − (n − 1) × v | (150 699 − 30 140) ÷ 4 = 30 139,75 → 30 140 ; dernier 30 139 ; 30 140 + 3 × 30 140 + 30 139 = 150 699. |
| forfait = min(5 000 ; arrondi(5 % × prix)) | 5 % × 150 699 = 7 535 → 5 000 F (plafond) ; liste : 1 784 F. |

<a id="cote-suivre"></a>
### `#cote-suivre` — Mise de côté

CL-15 · après le lancement · onglet commandes · menu : Après le lancement › Ma mise de côté

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Mise de côté » (suivre) »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#cote-suivre` Mise de côté · versement du jour · `#cote-suivre?st=grace` Mise de côté · échéance manquée, délai de grâce · `#cote-suivre?st=ajour` Mise de côté · versement 2 payé, dernier à venir

**Captures** : CL-15 fig. 24 `Cote_suivre` · CL-15 fig. 25 `Cote_grace` · CL-15 fig. 26 `Cote_ajour`

**Règles côté serveur** (1) : MDC-05 Rappel 2 jours avant chaque échéance, puis le jour même. *(calcul)* *(Proposé)*

**Règles côté serveur et écran** (1) : CMD-10 À la fin de la grâce sans versement, la mise de côté est annulée automatiquement avec le…

**Règles non classées** (1) : MDC-08 Sept jours de grâce après une échéance manquée, avant toute annulation. *(Proposé)*

<a id="cote-versement"></a>
### `#cote-versement` — Versement

CL-15 · après le lancement · onglet commandes

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Versement » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#cote-versement` Mise de côté · payer le versement 2 · `#cote-versement?n=3` Mise de côté · payer le dernier versement

**Captures** : CL-15 fig. 27 `Cote_versement` · CL-15 fig. 28 `Cote_dernier`

**Règles côté serveur** (1) : MDC-06 Chaque versement suit le parcours de paiement Mobile Money de base.

**Règles côté serveur et écran** (1) : CMD-11 Un versement échoué ne compte pas ; le client réessaie ; la grâce ne commence qu’après la…

<a id="cote-fini"></a>
### `#cote-fini` — Mise de côté

CL-15 · après le lancement · onglet commandes

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Payé en entier » (terminé) »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#cote-fini` Mise de côté · payé en entier, commande vers le relais

**Captures** : CL-15 fig. 29 `Cote_fini`

**Règles côté serveur** (2) : MDC-07 Au dernier versement, la commande suit le parcours normal : argent bloqué jusqu’au… · CMD-12 Le colis n’est envoyé au relais qu’après le dernier versement ; la commande reprend le…

<a id="cote-annuler"></a>
### `#cote-annuler` — Mise de côté

CL-15 · après le lancement · onglet commandes

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Feuille « Annuler la mise de côté » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#cote-annuler` Mise de côté · feuille « Annuler », remboursement exact

**Captures** : CL-15 fig. 30 `Cote_annuler`

**Règles côté serveur** (4) : MDC-09 Annulation : versements remboursés moins un forfait de 5 % du prix, 5 000 F au plus,… *(calcul)* *(Proposé)* · CMD-13 Le forfait est reversé au vendeur, qui a gardé le stock ; sa nature d’arrhes doit être… *(À trancher)* · CMD-14 Si c’est le vendeur (rupture, stock perdu) ou BelivaY qui ne peut pas honorer la… · CMD-15 Le remboursement va toujours au moyen d’origine de chaque versement, jamais en espèces.

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| remboursé = Σ versements payés − min(5 000 ; arrondi(5 % × prix)) | 5 140 − 1 285 = 3 855 F. |

<a id="troc"></a>
### `#troc` — Reprise et troc

CL-15 · après le lancement · onglet accueil · menu : Après le lancement › Reprise et troc de téléphone

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Estimer ma reprise » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#troc` Troc · estimer l’ancien téléphone (depuis la fiche)

**Captures** : CL-15 fig. 31 `Troc_estimer`

**Règles côté écran** (1) : CTR-05 Questions fermées (puces) : fonctionnement, écran, batterie, coque ; l’estimation n’est…

**Règles non classées** (2) : TRC-01 Estimation par le reconditionneur partenaire, à partir du modèle et de l’état déclaré. *(Proposé)* · TRC-02 Compte (Google, iCloud) et code retirés avant le dépôt. *(Proposé)*

<a id="troc-offre"></a>
### `#troc-offre` — Offre de troc

CL-15 · après le lancement · onglet accueil

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Offre de troc » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#troc-offre` Troc · fourchette de reprise, reste estimé

**Captures** : CL-15 fig. 32 `Troc_offre`

**Règles côté écran** (1) : TRC-09 Seule une fourchette est affichée avant l’inspection, jamais une valeur garantie. *(Proposé)*

**Règles non classées** (1) : TRC-03 BelivaY n’achète pas de téléphone d’occasion : la reprise est payée par le… *(Proposé)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| montant estimé = [prix livré − haut ; prix livré − bas] | [150 699 − 41 000 ; 150 699 − 32 000] = [109 699 ; 118 699] F. |

<a id="troc-depot"></a>
### `#troc-depot` — Dépôt au relais

CL-15 · après le lancement · onglet commandes

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Dépôt au relais » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#troc-depot` Troc · code de dépôt au relais · `#troc-depot?st=depose` Troc · téléphone déposé, IMEI vérifié · `#troc-depot?st=refuse` Troc · dépôt refusé, téléphone signalé volé

**Captures** : CL-15 fig. 33 `Troc_depot` · CL-15 fig. 34 `Troc_depose` · CL-15 fig. 35 `Troc_refuse`

**Règles côté serveur** (1) : TRC-05 Le gérant lit l’IMEI (*#06#) et vérifie qu’il n’est pas déclaré volé ; téléphone signalé… *(calcul)* *(Proposé)*

**Règles côté serveur et écran** (1) : CTR-06 Code de dépôt à 6 chiffres, distinct du code de retrait ; aucun dépôt enregistré sans…

**Règles non classées** (3) : TRC-06 Pièce d’identité vérifiée au dépôt ; dépôt rémunéré au gérant comme un colis. *(Proposé)* · CTR-07 Dépôt refusé : le téléphone est rendu sur place, le troc est annulé, rien n’est payé ;… · CTR-08 La collecte vers le reconditionneur suit le circuit d’un colis : scellé, photo, code de…

**États et erreurs** : 3 cas (détail dans `pages.json`)

<a id="troc-inspection"></a>
### `#troc-inspection` — Inspection

CL-15 · après le lancement · onglet commandes · menu : Après le lancement › Suivi du troc

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Inspection » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#troc-inspection?st=encours` Troc · inspection en cours, deux issues · `#troc-inspection` Troc · valeur confirmée

**Captures** : CL-15 fig. 36 `Troc_inspection_encours` · CL-15 fig. 37 `Troc_inspection`

**Règles côté serveur** (1) : TRC-07 Inspection sous 48 h ; effacement certifié des données. *(calcul)* *(Proposé)*

**Règles côté écran** (1) : CTR-10 Inspection en retard : le client est prévenu avec une nouvelle heure ferme et peut…

**Règles non classées** (1) : CTR-09 Une valeur confirmée dans la fourchette (ou au-dessus) ouvre le paiement du neuf ; en…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| fin d’inspection = réception + TRC-INSPECT-H | Mer. 23 sept. 14 h 00 + 48 h = ven. 25 sept. à 14 h, affiché en heure ferme. |
| valeur ≥ bas de fourchette → valeur confirmée ; sinon contre-offre | 38 000 ≥ 32 000 : confirmée ; 27 000 < 32 000 : contre-offre. |

<a id="troc-contre-offre"></a>
### `#troc-contre-offre` — Inspection

CL-15 · après le lancement · onglet commandes

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Feuille « Contre-offre » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#troc-contre-offre` Troc · feuille « contre-offre du reconditionneur »

**Captures** : CL-15 fig. 38 `Troc_contreoffre`

**Règles non classées** (2) : TRC-08 Contre-offre refusée : téléphone rendu gratuitement au relais. *(Proposé)* · CTR-11 Le téléphone rendu revient au relais d’origine comme un colis, avec un code de retrait ;…

<a id="troc-payer"></a>
### `#troc-payer` — Payer le neuf

CL-15 · après le lancement · onglet commandes

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Payer le neuf » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#troc-payer` Troc · payer le téléphone neuf

**Captures** : CL-15 fig. 39 `Troc_payer`

**Règles côté serveur** (1) : CTR-12 Le prix du neuf est recalculé au paiement (contrôle des prix de base, 8.1) ; la valeur de…

**Règles côté serveur et écran** (1) : CTR-13 Commande du neuf annulée ou remboursée : la valeur de reprise revient au client sur son…

**Règles non classées** (2) : TRC-04 Le reste n’est payé qu’après confirmation de la valeur. *(Proposé)* · CTR-14 Le vendeur vend le neuf normalement et ne voit pas le troc.

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| montant à payer = prix_livré(neuf, maintenant) − valeur confirmée | 150 699 − 38 000 = 112 699 F ; après contre-offre : 123 699 F. |

<a id="famille"></a>
### `#famille` — Panier famille

CL-15 · après le lancement · onglet compte · menu : Après le lancement › Panier famille (diaspora)

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Panier famille » (choisir) »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#famille` Panier famille · choisir et modifier (depuis Compte) · `#famille?st=modifie` Panier famille · article de plus de 5 kg refusé

**Captures** : CL-15 fig. 40 `Famille_choisir` · CL-15 fig. 41 `Famille_trop_lourd`

**Règles côté serveur et écran** (1) : CFM-05 Chaque panier prêt affiche son prix livré au relais ; les articles se modifient…

**Règles non classées** (1) : FAM-01 Colis S à L seulement : sacs de 5 kg, jamais de colis XL (jamais en relais).

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| prix livré du panier = S + 500 + 400 − 900 (S ≥ 30 000) + supplément de classe | 34 200 + 300 = 34 500 F. |
| article autorisé ⇔ poids ≤ FAM-POIDS-MAX | Riz 25 kg refusé ; sac de 5 kg accepté. |

<a id="famille-destinataire"></a>
### `#famille-destinataire` — Pour qui ?

CL-15 · après le lancement · onglet compte

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Pour qui ? » (destinataire) »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#famille-destinataire` Panier famille · destinataire et relais

**Captures** : CL-15 fig. 42 `Famille_destinataire`

**Règles côté écran** (1) : CFM-06 Le payeur désigne le bénéficiaire par un « lien famille » envoyé depuis le compte du…

**Règles non classées** (2) : CFM-07 Relais proposés : ceux de la famille, ouverts et non saturés, le relais habituel du… · FAM-03 Le payeur ne reçoit jamais le code de retrait.

<a id="famille-payer"></a>
### `#famille-payer` — Payer par carte

CL-15 · après le lancement · onglet compte

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Payer par carte » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#famille-payer` Panier famille · payer par carte · `#famille-payer?st=3ds` Panier famille · 3-D Secure

**Captures** : CL-15 fig. 43 `Famille_payer` · CL-15 fig. 44 `Famille_3ds`

**Règles côté serveur et écran** (3) : FAM-02 Paiement par carte : 3-D Secure, 150 000 F par transaction, frais de service 2 %. *(calcul)* · FAM-04 Remboursement sur la carte du payeur, jamais sur le Mobile Money de la famille. · CFM-08 Récapitulatif avant de payer : articles, retrait, supplément de classe, frais de service… *(calcul)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| frais = arrondi(2 % × (S + livraison)) | 2 % × (34 200 + 300) = 690 F ; total 35 190 F. |
| € = total ÷ 655,957, au centime | 35 190 ÷ 655,957 = 53,6468 → 53,65 €. |
| total ≤ FAM-MAX-TX | 35 190 ≤ 150 000 ; au-delà : paiement en plusieurs commandes. |

**États et erreurs** : 3 cas (détail dans `pages.json`)

<a id="famille-mensuel"></a>
### `#famille-mensuel` — Chaque mois

CL-15 · après le lancement · onglet compte · menu : Après le lancement › Panier famille · chaque mois

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Chaque mois » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#famille-mensuel` Panier famille · chaque mois · `#famille-mensuel?st=preavis` Panier famille · préavis, hausse signalée

**Captures** : CL-15 fig. 45 `Famille_mensuel` · CL-15 fig. 46 `Famille_preavis`

**Règles côté serveur** (1) : FAM-07 Prix recalculés à chaque renouvellement ; hausse signalée avant le débit. *(Proposé)*

**Règles côté écran** (1) : FAM-06 Renouvellement mensuel annoncé avant le débit, suspensible en un geste. *(Proposé)*

**Règles non classées** (1) : CFM-09 Le débit se fait au montant annoncé au préavis ; si le prix monte encore entre le préavis…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| préavis = date de débit − FAM-RENOUV-PREAVIS | Mer. 21 oct. − 3 jours = dim. 18 oct. |
| montant = tarif(panier, jour du préavis) + 2 % | 34 600 + 300 = 34 900 ; 2 % = 698 ; 35 598 F = 54,27 € ; hausse 408 F. |

<a id="famille-preuve"></a>
### `#famille-preuve` — Preuve de retrait

CL-15 · après le lancement · onglet compte

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Écran « Preuve de retrait » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#famille-preuve` Panier famille · preuve de retrait au payeur

**Captures** : CL-15 fig. 47 `Famille_preuve`

**Règles côté serveur** (2) : FAM-05 Preuve de retrait au payeur : push, puis e-mail. · CFM-10 La preuve dit qui a retiré (nom du porteur saisi au comptoir), où, et l’heure au relais… *(calcul)*

<a id="wa"></a>
### `#wa` — WhatsApp · message

CL-15 · après le lancement · menu : Après le lancement › Commander sur WhatsApp avec l’IA

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Conversation « Message » (texte ou vocal) »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#wa` WhatsApp · message vocal, accord demandé (depuis Aide)

**Captures** : CL-15 fig. 48 `Wa_message`

**Règles côté serveur et écran** (1) : CWA-05 Premier vocal : consentement explicite avant tout traitement (texte, version, horodatage,…

**Règles non classées** (1) : WAP-06 Messages vocaux conservés selon une durée à fixer, puis supprimés. *(Proposé)*

<a id="wa-proposition"></a>
### `#wa-proposition` — WhatsApp · proposition

CL-15 · après le lancement

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Conversation « Proposition » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#wa-proposition` WhatsApp · proposition de l’IA au prix livré · `#wa-proposition?st=humain` WhatsApp · doute, passage à un humain

**Captures** : CL-15 fig. 49 `Wa_proposition` · CL-15 fig. 50 `Wa_humain`

**Règles côté serveur** (1) : WAP-04 Prix livrés calculés par le service de tarification, jamais par l’IA.

**Règles côté serveur et écran** (1) : CWA-06 La proposition reprend les produits maîtres et l’offre attribuée de base, le relais…

**Règles côté écran** (1) : CWA-07 Passage à un humain sur doute, sur demande ou après 2 échecs (IA-HUMAIN), dans le même… *(Proposé)*

**Règles non classées** (1) : WAP-05 Doute de l’IA : passage à un humain. *(Proposé)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| total = tarif(articles attribués, relais habituel) | 7 000 + 4 800 + 500 + 400 = 12 700 F (sous 30 000 F : retrait payant). |

<a id="wa-confirmer"></a>
### `#wa-confirmer` — WhatsApp · confirmation

CL-15 · après le lancement

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Conversation « Confirmation » (« Réponds OUI ») »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#wa-confirmer` WhatsApp · récapitulatif, « Réponds OUI »

**Captures** : CL-15 fig. 51 `Wa_confirmer`

**Règles côté écran** (2) : WAP-01 L’IA propose et attend un « OUI » explicite ; aucun achat sans confirmation. *(Proposé)* · CWA-08 Seul « OUI » (casse et accents indifférents ; « YES » pour une conversation en anglais)…

<a id="wa-lien"></a>
### `#wa-lien` — WhatsApp · paiement

CL-15 · après le lancement

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Conversation « Lien de paiement » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#wa-lien` WhatsApp · lien vers le paiement de base

**Captures** : CL-15 fig. 52 `Wa_lien`

**Règles côté serveur** (1) : WAP-02 L’IA ne paie jamais ; le paiement suit le parcours de base (webhook, escrow).

**Règles côté serveur et écran** (1) : CWA-09 Le lien court est signé, lié à la commande et au numéro vérifié du client ; il ouvre «…

<a id="wa-suite"></a>
### `#wa-suite` — WhatsApp · suite

CL-15 · après le lancement

**Documentation** : décrite dans CL-15

**Sections** : CL-15 « Conversation « Suite » »

**Voir aussi, règles transverses** : « Nouveauté EX-01 · Liste de rentrée scolaire » ; « Nouveauté EX-02 · Cotisation pour un cadeau » ; « Nouveauté EX-03 · Mettre de côté avec acompte » ; « Nouveauté EX-04 · Reprise et troc de téléphone » ; « Nouveauté EX-05 · Panier famille pour la diaspora » ; « Nouveauté EX-06 · Commander sur WhatsApp avec l’IA » ; « Réserve, points à voir et idées écartées (EX-07) » ; « Registre des paramètres des nouveautés (32.1 et 32.5) »

**États** : `#wa-suite` WhatsApp · paiement reçu, code jamais sur WhatsApp

**Captures** : CL-15 fig. 53 `Wa_suite`

**Règles côté serveur** (1) : WAP-03 Le code de retrait n’est jamais envoyé sur WhatsApp.

**Règles côté serveur et écran** (1) : CWA-10 Après paiement, les messages de la commande suivent la politique de base (push, SMS dans…

<a id="selection"></a>
### `#selection` — Sélection Premium

CL-04 · lancement

**Documentation** : absente des documents CL : écran ajouté au prototype après les documents, sans règle écrite

**Voir aussi, règles transverses** : « Compteurs réels — partout » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#selection` Sélection Premium · produits triés sur le volet (bandeau CURATED)

**Captures** : `Selection_premium` (par le nom, à vérifier)

<a id="diaspora"></a>
### `#diaspora` — Diaspora

CL-12 · lancement

**Documentation** : absente des documents CL : écran ajouté au prototype après les documents, sans règle écrite

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#diaspora` Diaspora · un proche paie pour toi (bandeau DIASPORA)

**Captures** : `Diaspora` (par le nom, à vérifier)

<a id="wallet"></a>
### `#wallet` — Wallet BelivaY

CL-13 · lancement

**Documentation** : absente des documents CL : écran ajouté au prototype après les documents, sans règle écrite

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#wallet` Wallet BelivaY · solde, actions, historique · `#wallet?st=recharger` Wallet · feuille « Recharger » · `#wallet?st=recharge&m=10000` Wallet · rechargé · `#wallet?st=retirer` Wallet · feuille « Retirer vers Mobile Money »

**Captures** : `Wallet` (par le nom, à vérifier) · `Wallet_recharge` (par le nom, à vérifier) · `Wallet_recharger` (par le nom, à vérifier) · `Wallet_retirer` (par le nom, à vérifier)

<a id="devenir-vendeur"></a>
### `#devenir-vendeur` — Devenir vendeur

CL-13 · lancement

**Documentation** : absente des documents CL : écran ajouté au prototype après les documents, sans règle écrite

**Voir aussi, règles transverses** : « Écrans actuels retirés : fidélité, parrainage, portefeuille » ; « Règles et calculs des avis » ; « Jeu d’essai, liens et points à trancher »

**États** : `#devenir-vendeur` Devenir vendeur · ouvrir sa boutique (sans pièce) · `#devenir-vendeur?st=envoyee` Devenir vendeur · boutique ouverte, produits en brouillon · `#devenir-vendeur?st=piece` Devenir vendeur · pièce envoyée, vérification en cours · `#devenir-vendeur?st=verifiee` Devenir vendeur · pièces vérifiées, ventes ouvertes · `#devenir-vendeur?st=refusee` Devenir vendeur · pièce refusée · `#devenir-vendeur?st=ouvrir` Devenir vendeur · ouverture de l’espace vendeur

**Captures** : `Devenir_vendeur` (par le nom, à vérifier) · `Devenir_vendeur_envoyee` (par le nom, à vérifier) · `Devenir_vendeur_piece` (par le nom, à vérifier) · `Devenir_vendeur_refusee` (par le nom, à vérifier) · `Devenir_vendeur_verifiee` (par le nom, à vérifier)

<a id="promotions"></a>
### `#promotions` — Promotions

CL-04 · lancement

**Documentation** : absente des documents CL : écran ajouté au prototype après les documents, sans règle écrite

**Voir aussi, règles transverses** : « Compteurs réels — partout » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#promotions` Promotions · toutes les baisses de prix (distinct de Flash Deals)

**Captures** : `Promotions` (par le nom, à vérifier)

<a id="ouverture"></a>
### `#ouverture` — Ouverture

CL-03 · lancement

**Documentation** : absente des documents CL : écran ajouté au prototype après les documents, sans règle écrite

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#ouverture` Écran d’ouverture · logo BelivaY (avant le premier lancement)

**Captures** : `Ouverture` (par le nom, à vérifier)

<a id="xp-pay"></a>
### `#xp-pay` — Paiement express

CL-08 · lancement

**Documentation** : absente des documents CL : écran ajouté au prototype après les documents, sans règle écrite

**Voir aussi, règles transverses** : « Parcours « Payer » » ; « Portefeuille « Compte BelivaY » et dépôt manuel — supprimés » ; « Règles de calcul des montants » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#xp-pay?m=apple&back=paiement-moyen%3Fmontant%3D33780%26choix%3Dapple&t=34456&ok=%23confirmee` Apple Pay · feuille du téléphone, Face ID · `#xp-pay?m=google&back=payeur&t=12138&ok=%23payeur%3Fst%3Dpaye&st=fait` Google Pay · paiement accepté (payeur à l’étranger)

<a id="lancement"></a>
### `#lancement` — Lancement de l’app

CL-03 · lancement

**Documentation** : absente des documents CL : écran ajouté au prototype après les documents, sans règle écrite

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#lancement` Lancement de l’app · animation du logo BelivaY (à chaque ouverture)

**Captures** : `Lancement_animation` (par le nom, à vérifier)

<a id="faceid"></a>
### `#faceid` — Face ID ou empreinte

CL-03 · lancement

**Documentation** : absente des documents CL : écran ajouté au prototype après les documents, sans règle écrite

**Voir aussi, règles transverses** : « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#faceid?nouveau=1` Compte créé · Face ID proposé une fois (iPhone) · `#faceid?nouveau=1&os=android` Compte créé · empreinte proposée une fois (Android)

**Captures** : `FaceID_Android` (par le nom, à vérifier) · `FaceID_iPhone` (par le nom, à vérifier)

<a id="telephone"></a>
### `#telephone` — 

CL-10 · lancement

**Documentation** : simulation du téléphone (écran d’accueil), hors site : CNV-06, le téléphone affiche lui-même ses notifications

**Voir aussi, règles transverses** : « Le service d’envoi et le journal » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#telephone` Écran d’accueil du téléphone · widget « Mes colis », île active

**Captures** : `Telephone_accueil` (par le nom, à vérifier) · `Telephone_verrouille` (par le nom, à vérifier)

<a id="verrouille"></a>
### `#verrouille` — 

CL-10 · lancement

**Documentation** : simulation du téléphone (écran verrouillé), hors site : CNV-06

**Voir aussi, règles transverses** : « Le service d’envoi et le journal » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#verrouille` Écran verrouillé · carte du code de retrait et notifications

<a id="android"></a>
### `#android` — 

CL-10 · lancement

**Documentation** : simulation du téléphone (notification Android), hors site : CNV-06

**Voir aussi, règles transverses** : « Le service d’envoi et le journal » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#android` Aperçu Android · puce, notification de progression, Now Bar

**Captures** : `Android_apercu` (par le nom, à vérifier)

<a id="ile"></a>
### `#ile` — 

CL-10 · lancement

**Documentation** : simulation de la Dynamic Island, hors site : CNV-06, l’application n’en dessine aucune

**Voir aussi, règles transverses** : « Le service d’envoi et le journal » ; « Pour le développeur : API, événements, erreurs, paramètres »

**États** : `#ile` L’île BelivaY · page de démonstration (île dynamique, téléphone, animations) · `#ile?go=momo&etat=deplie` Île dynamique · paiement MTN MoMo en attente, dépliée · `#ile?go=suivi&etat=deplie` Île dynamique · suivi jusqu’au relais, dépliée · `#ile?go=code&etat=deplie` Île dynamique · code de retrait, dépliée · `#ile?go=flash&etat=deplie` Île dynamique · rappel Flash Deal, dépliée · `#ile?go=cotis&etat=deplie` Île dynamique · cotisation, dépliée · `#ile?go=diaspora&etat=deplie` Île dynamique · cadeau payé depuis l’étranger, dépliée · `#ile?go=deux` Île dynamique · deux activités (bulle)

**Captures** : `Ile_code_retrait` (par le nom, à vérifier) · `Ile_compacte_suivi` (par le nom, à vérifier) · `Ile_cotisation` (par le nom, à vérifier) · `Ile_demo` (par le nom, à vérifier) · `Ile_deux_activites` (par le nom, à vérifier) · `Ile_diaspora` (par le nom, à vérifier) · `Ile_flash` (par le nom, à vérifier) · `Ile_paiement_MoMo` (par le nom, à vérifier) · `Ile_paiement_accepte` (par le nom, à vérifier) · `Ile_suivi_relais` (par le nom, à vérifier) · `Ile_wallet` (par le nom, à vérifier)

## Par document

| Doc. | Sections transverses | Règles transverses | Lignes de calcul transverses | API | Événements | Tableaux de données de démonstration | Actions | Questions |
|---|---|---|---|---|---|---|---|---|
| CL-01 | 11 | 76 | 0 | 0 | 0 | 2 | 33 (CL-D02) | 22 |
| CL-02 | 27 | 132 | 55 | 0 | 40 | 3 | 31 (CL-D03) | 21 |
| CL-03 | 1 | 0 | 0 | 12 | 4 | 0 | 26 (CL-D04) | 16 |
| CL-04 | 2 | 11 | 3 | 0 | 4 | 4 | 14 (CL-D05) | 10 |
| CL-05 | 2 | 15 | 3 | 8 | 2 | 2 | 13 (CL-D06) | 6 |
| CL-06 | 2 | 8 | 0 | 7 | 5 | 3 | 18 (CL-D07) | 13 |
| CL-07 | 1 | 0 | 0 | 12 | 4 | 3 | 17 (CL-D08) | 10 |
| CL-08 | 4 | 20 | 13 | 10 | 3 | 1 | 25 (CL-D09) | 13 |
| CL-09 | 3 | 22 | 4 | 14 | 10 | 0 | 56 (CL-D10) | 22 |
| CL-10 | 2 | 14 | 0 | 7 | 6 | 2 | 43 (CL-D11) | 14 |
| CL-11 | 6 | 45 | 15 | 10 | 7 | 1 | 56 (CL-D12) | 18 |
| CL-12 | 1 | 0 | 0 | 0 | 5 | 2 | 32 (CL-D13) | 9 |
| CL-13 | 3 | 10 | 8 | 0 | 0 | 1 | 50 (CL-D14) | 16 |
| CL-14 | 3 | 10 | 14 | 9 | 6 | 0 | 54 (CL-D15) | 16 |
| CL-15 | 8 | 44 | 20 | 0 | 0 | 1 | 61 (CL-D16) | 17 |

## Règles transverses (hors page)

Règles et calculs qui ne dépendent pas d’un écran : principes, services serveur, moteurs, machines à états,
calculs de CL-02. Ce sont souvent les règles de calcul côté serveur ; à construire à l’étape 5.

### CL-01 — Les principes non négociables

CCH-01 Argent bloqué jusqu’au retrait *(calcul)* · CCH-02 Retrait près de chez soi *(calcul)* · CCH-03 Délai ferme *(calcul)* · CCH-04 Prix livré réel *(calcul)* · CCH-05 Anonymat des boutiques · CCH-06 Aucun faux chiffre *(calcul)* · CCH-07 Zéro espèce · CCH-08 Un seul service de tarification · CCH-09 Le code de retrait vaut le colis *(calcul)* · CCH-10 Aucun frais surprise *(calcul)* · CCH-11 L’IFA ne se montre jamais · CCH-12 Canaux tracés

### CL-01 — Les décisions qui priment

CCH-13 Quand deux textes se contredisent, la décision la plus récente l’emporte (tableau… *(calcul)* · CCH-14 Si aucune source ne répond, la question va au porteur du produit ; en attendant, la… · CCH-15 Aucune valeur écrite dans le code *(calcul)*

### CL-01 — Statuts des règles et des valeurs

CCH-20 Chaque règle et chaque valeur de ces documents porte un statut : Décidé, Recommandé,… · CCH-21 Toutes les valeurs « À trancher » ont reçu une décision avant la mise en production…

### CL-01 — Interdits valables partout

CCH-38 Élément flottant · CCH-39 Pied de page · CCH-40 Compte à rebours artificiel, compteur de visiteurs, rareté simulée · CCH-41 Tout chiffre non réel *(calcul)* · CCH-42 Nom, page, adresse, numéro, lien ou QR de boutique · CCH-43 Prix barré sans remise réelle · CCH-44 Placement payant ou produit sponsorisé dans la recherche · CCH-45 Suggestion commerciale au paiement ou juste après · CCH-46 « Reste à payer » · CCH-47 Espèces, pourboire, caution · CCH-48 Code de retrait ou mot de passe à usage unique dans un push · CCH-49 IFA, score, palier ou « niveau » du client affiché · CCH-50 Carte du livreur en temps réel · CCH-51 WhatsApp pour une commande, un panier, un paiement, un code, un litige, des photos ou des preuves · CCH-52 Promotion par SMS · CCH-53 Promesse de retour sans motif *(calcul)* · CCH-54 Écran blanc sans explication

### CL-01 — La coque : en-têtes, bandeau rotatif, barre du bas et badges

CNV-01 Barre du bas à cinq onglets *(calcul)* · CNV-03 En-tête enfant · CNV-04 En-tête racine *(calcul)* · CNV-05 Zones sûres iPhone *(calcul)* · CNV-06 Cadre iPhone des captures *(calcul)* · CNV-07 Badges · CNV-08 Écrans de tâche sans barre du bas

### CL-01 — Typographie, densité, rayons, ombres et verre

CDS-07 Plus Jakarta Sans *(calcul)* · CDS-08 Rayons et ombres *(calcul)*

### CL-01 — Icônes

CDS-09 Icônes Lucide au trait *(calcul)*

### CL-01 — Composants du socle

CDS-10 Une seule carte clé (héros) par écran · CDS-11 Boutons *(calcul)* · CDS-12 Couleurs d’état *(calcul)* · CDS-13 Tout écran se construit avec les composants du socle · CDS-14 Vendeur anonyme · CDS-15 Prix et prix livré · CDS-16 Supplément de classe *(À trancher)* · CDS-17 Pastilles d’état · CDS-18 Code de retrait *(calcul)* · CDS-19 Jauge d’un colis · CDS-20 Feuille du bas · CDS-21 Rendu des messages · CDS-22 Carte produit *(calcul)* · CDS-23 Détails repliables et aide · CDS-24 Bandeau de réassurance · CDS-25 Carte de commande *(calcul)* · CDS-26 Composants hérités du vendeur · CDS-27 Cartes teintées · CDS-28 Onglets segmentés et puces *(calcul)* · CDS-29 Étapes · CDS-30 Titres de section à barre *(calcul)* · CDS-31 Carte produit « Produits populaires »

### CL-01 — Illustrations, portraits et photos à produire

CDS-32 Images produit *(calcul)* · CDS-33 Portraits et scènes

### CL-01 — Accessibilité

CRD-06 Cibles tactiles d’au moins 44 px *(calcul)* · CRD-07 Aucun texte sous 12 px · CRD-08 Contraste ≥ 4,5 : 1 · CRD-09 Lecteurs d’écran · CRD-10 Téléphones visés *(calcul)*

### CL-01 — Mode dégradé, formatage et mode capture

CRD-11 Mode dégradé · CRD-12 Formatage · CRD-13 Mode capture du prototype *(calcul)*

### CL-02 — Le jeu d’essai : la journée de référence

CDA-01 Une seule source de chiffres pour les captures, les documents et la recette : ce jeu… · CDA-02 Instant de référence : jeudi 24 septembre 2026, 10 h 15, heure de Yaoundé (Africa/Douala,… *(calcul)* · CDA-03 Le jeu d’essai se charge en base comme jeu de recette (fixtures) ; chaque écran ouvert… · CDA-04 Les numéros de téléphone s’affichent masqués au milieu (« 6 77 ·· ·· 41 »), sauf dans le… · CDA-05 Distance d’une carte produit = distance géodésique entre la boutique de l’offre attribuée… *(calcul)* · CDA-06 Un relais « En configuration » (KYC non validé) ou plein aujourd’hui n’est jamais proposé… *(calcul)*

### CL-02 — Le catalogue du jeu d’essai

CDA-07 Tout compteur affiché (univers, sous-catégorie, résultats, avis, ventes, recherches de la… · CDA-08 Note affichée d’un produit maître = moyenne des notes vérifiées de tous ses vendeurs, à… *(calcul)* · CDA-09 Prix barré seulement si une remise est réellement pratiquée (P_barré > P) ; remise % =… *(calcul)* · CDA-10 Couleurs de variantes du jeu d’essai : jamais de bleu ni de violet (CDS-01) ; une…

### CL-02 — Le panier de référence (exemple 7.3) et ses variantes

CDA-11 Le panier de référence est l’exemple 7.3 de la spécification : 271 699 F d’articles, 1… · CDA-12 Mixeur-blender et marmite sont des colis S ; l’offre du mixeur livrée depuis Mvog-Ada est… · CDA-13 Chaque variante d’un écran (seuil, comptoir, XL, prix changé, carte) a son total… *(calcul)*

### CL-02 — Les commandes de Carine

CDA-14 Les huit commandes de Carine et la carte du paiement interrompu sont les seules de la… · CDA-15 Le numéro de commande BLV-nnnnn est un identifiant opaque, jamais un compteur : aucun… · CDA-16 Un paiement interrompu n’est pas une commande : il n’a pas de numéro BLV, n’entre dans… · CDA-17 Les badges sont renvoyés par le serveur : Commandes = commandes en cours dont l’action… *(calcul)*

### CL-02 — Les valeurs ajoutées par les parties

CDA-18 Les valeurs DX_clNN font partie du jeu d’essai commun : elles s’intègrent à data.js et à… · CDA-19 Une valeur « À trancher » montrée à l’écran (supplément M, L et XL, rangée minimale,…

### CL-02 — Variantes, corrections de l’assemblage et points signalés

CDA-20 Les écarts du jeu d’essai relevés par un document d’écran et corrigés à l’assemblage ne…

### CL-02 — Acteurs et applications

CCY-01 Sept acteurs : client, vendeur, entreprise de livraison, livreur, point relais (gérant),… · CCY-02 BelivaY n’affecte jamais un livreur : les collectes d’une zone sont publiées en paquets… *(calcul)*

### CL-02 — Le cycle de vie d’une commande, étape par étape

CCY-03 L’ajout au panier ne réserve aucun stock. *(calcul)* · CCY-04 Une commande n’est « payée » qu’au webhook signé de l’agrégateur, escrow écrit dans la… · CCY-05 Commande au comptoir : la livraison est payée d’avance, la commande est « Validée »… · CCY-06 Le délai de préparation démarre à la confirmation du vendeur. *(calcul)* · CCY-07 La collecte (scan du livreur chez le vendeur, après contrôle en 2 photos, emballage et… · CCY-08 Chaque colis intermédiaire déclenche seulement le push gratuit C2a ; le dernier colis du… · CCY-09 Le retrait exige le code, le nombre de colis, la photo de remise et le paiement MoMo du… · CCY-10 Fenêtre de retour : 7 jours après le retrait, fermée plus tôt par « Tout est en ordre ». *(calcul)* · CCY-11 Avis : deux notes séparées, le vendeur et le gérant ; elles nourrissent les Trust Scores… · CCY-12 À domicile : pas de regroupement au lancement, chaque commande part seule (« En route »,… *(calcul)*

### CL-02 — Machines à états : la commande

CCY-13 Commande : panier → en_attente_paiement → payee → terminee | annulee ; panier →… · CCY-14 Une commande est terminee quand toutes ses sous-commandes sont finies (remises avec…

### CL-02 — Machines à états : la sous-commande et le colis

CCY-15 Une sous-commande par boutique ; elle devient un colis. · CCY-16 La sous-commande reste annulable par le client en payee, confirmee et prete ;… · CCY-17 Un litige porte sur un colis (une sous-commande) : les autres colis de la commande… · CCY-18 Jauge du colis en quatre segments (Préparation, Récupéré, Arrivé au relais, Retiré) : le…

### CL-02 — Machines à états : paiement et escrow

CCY-19 Tentative : clé d’idempotence = identifiant de commande + n° de tentative ; deux requêtes… *(calcul)* · CCY-20 Le webhook signé est la seule source de vérité : l’application interroge l’état côté… · CCY-21 L’escrow naît au webhook (ou au paiement sur place), est suspendu pendant un litige,…

### CL-02 — Machines à états : litige, retour et remplacement

CCY-22 Litige : ouvert → attente_vendeur (48 h ; accepter, contester, proposer un arrangement) →… *(calcul)* · CCY-23 Sous le seuil automatique du palier du client, aucun dossier n’est instruit :… · CCY-24 Vendeur silencieux à l’échéance : file d’arbitrage prioritaire avec présomption en faveur… · CCY-25 Retour : retour_depose (scan au relais, aucune garde) → retour_inspecte (48 h ; sans… *(calcul)* · CCY-26 Remplacement : passé le délai du vendeur sans expédition, replacement.late déclenche le… *(calcul)* · CCY-27 Les états du retour et du remplacement que la spécification ne nomme pas (accepte,… *(calcul)*

### CL-02 — Libellés affichés au client

CCY-28 Libellés du colis, tels quels : « Pas encore confirmée », « Préparation en cours », «… · CCY-29 Chaque carte a une seule action ; un seul bouton plein dans toute la liste (la commande…

### CL-02 — Matrice de visibilité (anonymat)

CVI-01 Le client ne voit jamais le nom, la page, l’adresse ou le numéro d’une boutique : « Colis… · CVI-02 Le vendeur ne voit jamais l’identité, le quartier, le relais ni le numéro du client, ni… *(calcul)* · CVI-03 Livreur : il voit le vendeur (il va chez lui) ; rien du client sur une remise au relais ;… · CVI-04 Aucun numéro personnel exposé : la voix passe par un rappel masqué, l’écrit par la… · CVI-05 Le code de retrait n’est jamais visible du vendeur, du livreur ni en clair de la console… · CVI-06 L’IFA n’est jamais montré à personne d’autre que la console : l’API client renvoie… · CVI-07 Le livreur n’apparaît au client que par son prénom, sa photo et l’heure estimée, quand il… · CVI-08 Chaque réponse d’API est construite par un sérialiseur propre au rôle de l’appelant…

### CL-02 — Les services communs

CDA-21 Un seul service de tarification calcule tous les montants, pour toutes les applications ;… · CDA-22 Aucune valeur n’est écrite dans le code : chaque tarif, seuil, délai ou plafond est un… *(calcul)* · CDA-23 Les modules métier ne connaissent ni FCM ni l’agrégateur SMS : ils appellent le service…

### CL-02 — Le modèle de données client

CDA-24 Objets et champs principaux de 2.6 : Client, Adresse, Panier / Ligne, Commande,… · CDA-25 Le panier, la commande, l’application vendeur et les alertes utilisent toujours… · CDA-26 Chaque commande porte la version des paramètres en vigueur à sa création : grille de… · CDA-27 Le code de retrait est gardé chiffré (clé du service, jamais en clair en base ni dans les… · CDA-28 Les textes affichés (phrase d’état, rappel, notification) sont produits par le serveur…

### CL-02 — Calculs : prix livré, attribution et délais de retrait

CAL-01 Prix livré affiché dès la carte et la fiche : prix de l’offre attribuée + livraison de… *(calcul)* · CAL-02 Attribution : l’offre au coût total livré le plus bas pour ce client (prix + livraison… *(calcul)* · CAL-03 Prix d’une carte = le plus bas des prix livrés des variantes actives, précédé de « à… *(calcul)* · CAL-04 Distance = distance géodésique entre la boutique de l’offre attribuée et le relais… *(calcul)* · CAL-05 Retirable aujourd’hui ⇔ heure de fin de préparation + tournée ≤ fermeture du relais… *(calcul)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| P_livré(relais) = P(v) + 900 F (500 + 400), sauf S ≥ 30 000 F | Carte et fiche : « + 900 F de retrait » ou « retrait offert » ; domicile « + 1 500 F » (500 + 1 000), offert dès 50 000 F. Itel AC52 : 20 000 F « + 900 F de retrait » ; Camon 30 : « retrait offert ». Détail : CL-04, CL-06. |
| supplément(classe) = tarif(classe) − tarif(S) | M : + 200 F ; L : + 300 F (proposés, À trancher) ; XL et hors gabarit : domicile seulement, + 1 500 F proposé. Jamais couvert par la livraison offerte. Détail : CL-06, CL-07. |
| offre(m) = argmin(prix + livraison réelle(vendeur → relais, panier)) | Trust Score en départage ; bascule au suivant si rupture, lenteur ou refus. Jamais affichée comme un choix. Détail : CL-05, CL-06. |
| prix_carte = min(P_livré(v)) sur les variantes actives | « à partir de » si les prix diffèrent : Tecno Camon 30 « dès 139 000 F » (128 Go). Détail : CL-04. |
| distance = ST_Distance(boutique, relais_sélectionné) | Géodésique, km arrondis à 0,1 ; recalculée si le relais change (CL-05). Détail : CL-05. |
| retirable_aujourd’hui ⇔ t_prêt + t_tournée ≤ fermeture_relais(aujourd’hui) ∧ classe ≤ L | Relais Mvog-Ada, fermeture 19 h : prêt sous 4 h → 10 h 15 + 4 h + 45 min = 15 h 00 → « dès 15 h » ; sous 6 h → 17 h ; sous 24 h → « demain ven. 25 sept. dès 11 h ». Détail : CL-05, CL-06. |

### CL-02 — Calculs : moteur de frais du panier et paiement

CAL-06 Moteur de frais (7.3) : S, Ram, Rem, Off, Total = S + Ram + Rem + Σ suppl_classe − Off ;… *(calcul)* · CAL-07 Économie affichée = Off (somme des montants barrés « offert »), jamais une estimation ;… *(calcul)* · CAL-08 Conseil « Changer d’offre » : gain = Total − Total simulé, recalcul complet ; affiché… *(calcul)* · CAL-09 Supplément de classe = tarif(classe) − tarif(S), jamais offert ; XL et hors gabarit ne… *(calcul)* *(À trancher)* · CAL-10 Recalcul complet à chaque changement, jamais une soustraction de ligne ; un remboursement… · CAL-11 Au clic sur « Payer », le montant M est recalculé par le serveur, jamais reçu de… *(calcul)* · CAL-12 Disponibilité = stock − réservations actives ; réservation si disponible pour chaque… *(calcul)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| S = Σ P(v) × q | Sous-total produits au prix actuel de l’offre attribuée ; base de tous les seuils, jamais frais inclus. Détail : CL-07. |
| Ram = Σ_zones [R + (n_z − 1) × R′] | R = 500 F, R′ = 380 F (−24 %) : une boutique au plein tarif par zone, les suivantes au tarif réduit ; ordre des collectes fixé par le système. Détail : CL-07. |
| Rem = Rem_relais (400 F) ou Rem_dom (1 000 F) | Selon le mode de remise. Détail : CL-07. |
| S ≥ Seuil(mode) ⇒ Off = R + Rem, sinon 0 | Seuil 30 000 F (relais), 50 000 F (domicile) ; au tarif d’un colis S : les autres ramassages et les suppléments restent dus. Détail : CL-07. |
| Total = S + Ram + Rem + Σ suppl_classe − Off | Montant affiché et envoyé à l’agrégateur. Exemple : 272 579 F. Détail : CL-07. |
| Économie = Off ; Reste_ramassages = Ram − (Off > 0 ? R : 0) ; Progression = min(S ÷ Seuil, 1) | 900 F ; 880 F ; seuil non atteint à 18 500 F : « Ajoute 11 500 F » (barre 62 %). Détail : CL-07. |
| Gain_conseil = Total − Total_simulé | Recalcul complet du panier modifié ; conseil affiché seulement si le gain > 0 : 500 F (mixeur livré par la boutique A) ; 120 F si la boutique A n’est plus au panier. Détail : CL-07. |
| M = S + Ram + Rem + Σ suppl − Off recalculé au clic sur « Payer » ; Δ = M_serveur − M_affiché | Δ = 0 : continuer ; Δ < 0 : appliquer, « tu gagnes \|Δ\| F » ; Δ > 0 : bloquer, montrer l’écart, confirmation explicite (274 579 F). Détail : CL-08. |
| dispo(v) = stock(v) − Σ réservations_actives(v) ; t_exp = t_demande + T_val | Réservation si dispo ≥ q, sinon vendeur suivant, sinon « cet article vient d’être pris ». Exemple : 10 h 03 + 24 min = 10 h 27. Détail : CL-08. |

### CL-02 — Calculs : comptoir, délais affichés et code

CAL-13 Paiement au comptoir : proposé seulement si l’IFA est neutre ou positif et que les… *(calcul)* · CAL-14 Compte à rebours du reçu : Δt = retrait estimé − maintenant ; Δt < 24 h → « X h YY »,… *(calcul)* · CAL-15 « Retirable maintenant » quand tous les colis du groupe sont arrivés ; sinon « Prêt dans… *(calcul)* · CAL-16 Paiement interrompu : temps restant = t_exp − maintenant, en mm:ss ; à 0, réservation… *(calcul)* · CAL-17 « Réponse sous X h » = ouverture du litige + 48 h − maintenant, en heures entières… *(calcul)* · CAL-18 Code : biométrie si le montant de la commande ≥ CODE-BIO (50 000 F proposé) ; renvoi… *(calcul)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| éligible_comptoir ⇔ IFA ≥ neutre ∧ S ≤ plafond(compte) ∧ relais | Plafond 15 000 F (nouveau compte), 50 000 F, puis 100 000 F après 5 commandes sans incident. Carine : 4 commandes → 50 000 F ; panier de référence refusé (« au-delà de 50 000 F »). Détail : CL-07, CL-08. |
| montant_dû = frais_garde(t) + reste_validée | BLV-51940 : 24 000 + 0 = 24 000 F ; BLV-52018 : 0 + 400 = 400 F. Payé en MoMo sur le téléphone du client ; identique pour l’application, le message et le gérant. Détail : CL-09. |
| refus_comptoir ≥ 2 ⇒ paiement d’avance obligatoire | Commande validée refusée sans motif : annulée, livraison non remboursée (PAY-CPT-REFUS). Détail : CL-08. |
| Δt = t_retrait_estimé − t_now | Reçu : Δt < 24 h → compte à rebours « 4 h 45 » (BLV-52107) ; Δt ≥ 24 h → date ferme (« jeudi 24 sept. dès 9 h », BLV-51940 validée le mar. 22 à 10 h 15). Détail : CL-08. |
| « Retirable maintenant » ⇔ ∀ colis du groupe : arrivé ; X = max(t_estimé des colis non arrivés) − t_now | Arrondi à l’heure : 15 h 00 − 10 h 15 = 4 h 45 → « Prêt dans 5 h » ; 17 h 00 − 10 h 15 → 7 h ; X ≥ 24 h : date ferme. Détail : CL-09. |
| t_restant = t_exp − t_now | Paiement interrompu en mm:ss : 12:00 à 10 h 15 ; à 0 : réservation libérée, carte retirée. Détail : CL-09. |
| réponse sous X h = t_ouverture + 48 h − t_now | Heures entières, arrondies à l’inférieur : mer. 17 h 15 + 48 h − jeu. 10 h 15 = 31 h. Détail : CL-09, CL-11. |
| biométrie ⇔ montant ≥ CODE-BIO ; renvoi ⇔ renvois(24 h) < 3 ; codes_faux ≥ 3 ⇒ blocage 24 h | BLV-52018 (33 780 F) : au toucher ; BLV-52107 (196 780 F) : empreinte ou visage. Blocage : nouveau code sur demande (281 947 dans le jeu d’essai). Détail : CL-09. |

### CL-02 — Calculs : frais de garde et série de rappels S0 à S5

CAL-19 Garde (définitive, 24 sept.) : jour d’arrivée gratuit ; 100 F par jour aux 2e et 3e… *(calcul)* · CAL-20 J0 = jour du premier accusé fort du message d’arrivée (application ouverte, SMS délivré)… *(calcul)* · CAL-21 Aucun jour n’est facturé pendant un litige, un groupage, une fermeture du relais, ni sur… · CAL-22 Renvoi au vendeur le premier jour ouvert après le 7e jour : retenue = garde + 500 F ;… *(calcul)* · CAL-23 Série de rappels : S0 (push) à la fin du 2e jour, S1 (SMS) à la fin du 3e, S2 (SMS) à la… *(calcul)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| J0 = date de l’accusé fort du message d’arrivée | Sans accusé fort, le compteur ne démarre jamais (relance par le canal de repli à 48 h, GARDE-NONVU-H recommandé). Détail : CL-10. |
| F_client = 1 + bonus_abonnement | Un seul jour gratuit au lancement (bonus = 0) ; après le lancement : Plus +2, Prime, Duo, Business +4. Détail : CL-10, CL-14. |
| jours_fact(t) = #{ j ∈ ]J0 + F_client ; t] : relais ouvert ∧ pas de litige ∧ pas de groupage } | Lecture retenue : J0 est le rang 1 ; avec F_client = 1, le premier jour facturé est le rang 2 (grille du 24 sept.). t s’arrête au scan de retrait ; un jour de fermeture compte dans le rang mais n’est jamais facturé (GARDE-FERME). Détail : CL-10. |
| tarif(j) = 0 (rang 1) ; 100 F (rangs 2-3) ; 200 F (4-5) ; 400 F (6-7) | Rang en jours calendaires depuis J0 (J0 = rang 1), jour entier (GARDE-PRORATA proposé), fuseau Africa/Douala, changement de jour à minuit. Détail : CL-10. |
| frais(t) = min(Σ tarif(j), valeur_colis) | Au plus 1 400 F de garde, 1 900 F avec le renvoi. Détail : CL-10. |
| J_renvoi = premier jour ouvert après le 7e jour ; retenue = frais + 500 F ; Z = montant_payé − retenue | Z remboursé avec S5, vers le moyen d’origine. Détail : CL-10. |
| gain_relais = 100 F × jours_fact | Versé le vendredi ; rien pendant un litige, un groupage, une fermeture, ni avant l’accusé fort. Détail : CL-10. |

### CL-02 — Calculs : annulation, changement de relais et carte depuis l’étranger

CAL-24 Remboursement d’une annulation par boutique : Remb = P_sc + max(0, F_avant − F_après), F… *(calcul)* · CAL-25 Changement de relais gratuit tant qu’aucune sous-commande n’est collectée (toutes… · CAL-26 Carte depuis l’étranger : frais de service = arrondi(2 % × (S + livraison)), affichés… *(calcul)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| annulable(sc) ⇔ état(sc) < collectée | Contrôlé côté serveur au clic ; état changé : 409 state_changed et feuille « L’état a changé ». Détail : CL-12. |
| F = Ram + Rem − Off ; F_après = F(commande sans sc), Off conservé | Recalcul complet ; une livraison offerte le reste même si S repasse sous le seuil. Détail : CL-12. |
| Remb = P_sc + max(0, F_avant − F_après) | BLV-52107, boutique B : F_avant = 1 380 + 400 − 900 = 880 ; sans B : 1 000 + 400 − 900 = 500 ; Remb = 84 000 + 380 = 84 380 F. Boutique A ensuite : 89 900 + 500 = 90 400 F (90 280 F avant l’annulation de B). Détail : CL-12. |
| changement_relais gratuit ⇔ état < collecté ; état = arrivé ⇒ transfert 400 F + garde due | Nouveau relais ⇒ nouveau code, ancien invalidé ; J0 = accusé fort au NOUVEAU relais (la garde repart au jour 1). Détail : CL-12. |
| frais_service = arrondi(2 % × (S + livraison)) | 11 900 × 2 % = 238 F ; 19 400 × 2 % = 388 F ; 272 579 × 2 % = 5 451,58 → 5 452 F. Détail : CL-08, CL-12. |
| montant_EUR = montant_XAF ÷ 655,957, au centime le plus proche | 12 138 F → 18,50 € ; autre devise : taux du prestataire figé au paiement. Détail : CL-12. |
| montant_XAF ≤ 150 000 par transaction | Au-delà : découpage en commandes complètes (chacune recalculée : ramassages, remise, livraison offerte) ; un article seul au-dessus reste au panier (Camon 30, 150 699 F). Détail : CL-12. |
| envoi payeur ⇔ 7 h ≤ heure_locale < 22 h ∨ criticité = 1 | Fuseau enregistré avec le profil du payeur (Paris = Yaoundé + 1 h en septembre). Détail : CL-12. |

### CL-02 — Calculs : litiges, retours et libération

CAL-27 Remboursement automatique si le montant ≤ seuil du palier (3 000 F Standard, 10 000 F… · CAL-28 Retour possible avec un motif (non conforme, abîmé, contrefaçon, défaut caché signalé… *(calcul)* · CAL-29 Libération du vendeur = fermeture du retour + 3 jours (Or, Platine : 1 jour ; carte : 14… *(calcul)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| montant ≤ seuil_auto(palier) ⇒ remboursement automatique | 3 000 F Standard, 10 000 F Élevé ; payé par BelivaY ; compteur séparé. Au-delà : instruction, escrow retenu. Détail : CL-11. |
| t_limite_vendeur = t_ouverture + 48 h | À l’échéance sans réponse : file d’arbitrage prioritaire, présomption client ; décision au plus tard 24 h après (proposé, délai constant pour tous les paliers). Détail : CL-11. |
| retour_possible ⇔ motif ∈ {non conforme, abîmé, contrefaçon, défaut caché ≤ 48 h} ∧ t ≤ t_retrait + 7 j ∧ ¬tout_en_ordre | Vice caché : 100 jours, hors escrow (BLV-51388 : jusqu’au dim. 6 déc.). Détail : CL-11. |
| valeur ≤ RET-SANS-RETOUR ⇒ remboursement sans retour | Seuil à trancher entre 3 000 et 5 000 F ; 5 000 F proposé (huile de coco 4 800 F). Détail : CL-11. |
| payeur_trajet = partie en tort | Client en tort : retenu sur le remboursement (500 F proposé : 23 000 − 500 = 22 500 F). Détail : CL-11. |
| remboursement ⇐ réception ∧ inspection (≤ 48 h) | Sans réponse du vendeur à 48 h : automatique. Détail : CL-11. |
| t ≥ délai_remplacement ∧ non expédié ⇒ remboursement | RET-REMPL-DELAI à trancher : 72 h ouvrées proposées, dimanche non compté. Détail : CL-11. |
| libération = fermeture_retour + 3 j (Or, Platine : 1 j ; carte : 14 j) | Fermeture = 7 jours après le retrait ou « Tout est en ordre » ; un litige suspend ; versement le vendredi. Détail : CL-09. |

### CL-02 — Calculs : notes, Trust Score affiché et arrondis

CAL-30 Le Trust Score et le palier affichés sont ceux du service Scores au moment de la réponse… *(calcul)* · CAL-31 Note affichée à une décimale, répartition à l’unité, borne basse de Wilson (z = 1,96)… *(calcul)* · CAL-32 Arrondis communs : francs entiers, pourcentage d’un montant arrondi au franc (moitié vers… *(calcul)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| Trust Score affiché = palier + score entier (0 à 100) du service Scores | « Vendeur certifié Or · Trust Score 91 » : lu tel quel, jamais recalculé dans l’application. Seuils de palier (VD-10) : Argent ≥ 65, Or ≥ 80, Platine ≥ 90. Détail : CL-06. |
| p̂ = notes ≥ 4 ÷ n ; score = borne basse de Wilson (z = 1,96) | Pour le Trust Score et le départage (3 avis à 5 étoiles ne passent pas devant 200 avis à 4,7) ; jamais affiché. Détail : CL-13. |
| note_affichée = moyenne(notes vérifiées), 1 décimale ; répartition(k) = COUNT(note = k) ÷ n, à l’unité | « 4,6 · 128 avis vérifiés » (Camon 30 : 590 ÷ 128 = 4,61). Détail : CL-06, CL-13. |
| remise % = arrondi((P_barré − P) ÷ P_barré × 100) | Seulement si P_barré > P et réellement pratiqué : 99 900 → 89 900 = −10 %. Détail : CL-04, CL-06. |
| Arrondis | Montants : francs entiers ; un pourcentage d’un montant s’arrondit au franc (moitié vers le haut) ; euros au centime le plus proche ; distances à 0,1 km ; notes à 0,1 ; pourcentages affichés à l’unité ; « Prêt dans X h » à l’heure la plus proche ; « réponse sous X h » à l’heure inférieure ; comptes à rebours à la minute (mm:ss pour le paiement). Détail : CL-01. |

### CL-02 — Calculs après le lancement et budget des messages

CAL-33 Remise groupée d’une liste d’envies = min(date cible, premier paiement + 21 jours) ;… *(calcul)* · CAL-34 Abonnement (module fermé) : livraison offerte = R + Rem au tarif S ; cagnotte = 2 % du… *(calcul)* *(Proposé)* · CAL-35 Au plus 6 SMS payants par commande (paiement protégé, code, J+2, J+4, incident,… *(calcul)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| remise_groupée = min(date_cible, t_premier_paiement + 21 j) | Liste « Mon anniversaire » : min(sam. 10 oct., lun. 21 sept. + 21 j = lun. 12 oct.) = sam. 10 oct. ; garde pendant le groupage = 0, relais non payé. Détail : CL-14. |
| offert(commande) = R + Rem(mode) au tarif S | Abonné : jamais les ramassages suivants ni les suppléments de classe ; seuil relais abonné dès 10 000 F (proposé). Détail : CL-14. |
| cagnotte = 2 % × S, créditée à la libération | Annulée si la commande est remboursée ; expire à 90 jours. BLV-52107 : 1 798 + 1 680 + 440 = 3 918 F. Détail : CL-14. |
| sms(commande) ≤ 6 ; repli ⇔ criticité 1 ∧ non ouvert à t + 10 min | Paiement protégé, code, J+2, J+4, incident, remerciement ; hors renvoi payant du code. Détail : CL-10. |

### CL-02 — Le catalogue des événements

CEV-01 Les dix événements de la spécification sont obligatoires : order.paid, suborder.ready,… · CEV-02 Enveloppe commune : id unique, type, occurred_at (ISO 8601, +01:00), producer, version,… *(calcul)* · CEV-03 Un événement n’est publié qu’après la validation de la transaction qui l’a causé (table… · CEV-04 La charge utile respecte la matrice de visibilité de chaque abonné : un événement… *(calcul)* · CEV-05 Seul un accusé fort fixe J0 : message.opened (application ouverte) ou message.delivered… · CEV-06 parcel.handed annule toutes les entrées S0–S5 en file du groupe ; dispute.opened les… · CEV-07 Les événements ajoutés par les documents d’écrans (terms.accepted,… · CEV-08 Les événements des modules après le lancement ne sont émis que si l’interrupteur du…

### CL-02 — API de référence : conventions

CAP-01 API REST JSON (Django REST), HTTPS seulement, préfixe versionné /api/v1 ; les noms de la… · CAP-02 Authentification : jeton de session porteur (Authorization: Bearer), long sur mobile,… · CAP-03 Idempotence : en-tête Idempotency-Key sur toute création et toute action d’argent… · CAP-04 Erreurs : statut HTTP + objet error {code, message, data} ; code stable en snake_case… · CAP-05 Pagination par curseur (cursor, next_cursor), jamais par numéro de page ; 20 éléments par… · CAP-06 Montants : entiers en francs CFA (integer), jamais de décimales ni de montant formaté ;… · CAP-07 Dates : ISO 8601 avec le décalage de Yaoundé (2026-09-24T10:15:00+01:00) ; jours sans… *(calcul)* · CAP-08 Langue : Accept-Language (fr, en, pcm accepté seulement quand les traductions existent,… · CAP-09 Tout montant renvoyé vient du service de tarification ; aucune réponse ne contient ce que… · CAP-10 Webhooks entrants (agrégateur, prestataire carte, WhatsApp) : signature vérifiée,… · CAP-11 Liens publics courts : domaine belivay.com, un préfixe par usage (r/ retrait, a/ avis, l/… · CAP-12 Hors ligne : l’application sert depuis son cache chiffré les réponses déjà reçues… · CAP-13 Modules après le lancement : GET /config/flags au démarrage ; tant qu’un interrupteur est…

### CL-02 — Droits d’accès et sécurité côté client

CAP-14 Vérification du numéro par un code à 6 chiffres avant la première commande, jamais avant… *(calcul)* *(À trancher)* · CAP-15 Changer de numéro exige un code sur l’ancien et un sur le nouveau ; les codes de retrait… · CAP-16 Mot de passe (connexion par e-mail) : 8 caractères au moins dont un chiffre, stocké haché… *(calcul)* · CAP-17 Sessions : un jeton long par appareil (une connexion réutilise la session de l’appareil)… · CAP-18 Code de retrait : masqué, affiché au toucher, biométrie au-delà de CODE-BIO, QR signé à… · CAP-19 Jamais de code de retrait, d’OTP, de commission ni de montant sensible dans un push, sur… · CAP-20 Limitation de débit par numéro, adresse e-mail, appareil et adresse IP sur l’OTP, la… · CAP-21 Données personnelles : numéros et adresses chiffrés au repos ; masquage à la sortie ;… *(calcul)* · CAP-22 Suppression du compte : refusée tant qu’une commande ou un litige est en cours (409… · CAP-23 Journal inaltérable : tentatives de paiement, envois de messages (avec coût),… · CAP-24 Le code secret Mobile Money n’existe jamais côté BelivaY : la validation se fait sur le…

### CL-03 — Pour le développeur : API, événements, erreurs, paramètres

### CL-04 — Compteurs réels — partout

CCR-01 Aucun chiffre écrit en dur : rechercher dans tout le code les chiffres en dur (15 240, 3… · CCR-02 Index des catégories : nombre d’univers actifs réels. · CCR-03 Bannière d’univers : « N sous-catégories · N produits » = sous-catégories non vides,… *(calcul)* · CCR-04 Vignette de sous-catégorie : nombre de produits ; 0 produit : la vignette ne s’affiche… · CCR-05 Listing : nombre réel, filtres compris ; avec un filtre, le total sans filtre est rappelé… *(calcul)* · CCR-06 Recherche : nombre réel de produits maîtres (CL-05), même agrégat. · CCR-07 Fiche produit et cartes : avis, note, ventes réels, cumulés sur le produit maître. · CCR-08 Un produit compte s’il a au moins une offre publiée, active, d’une boutique ouverte : «… *(calcul)* · CCR-09 Compteurs par agrégation, en cache quelques minutes au plus, recalculés à chaque… *(calcul)* · CCR-10 Un seul agrégat pour tous les écrans : sous-catégories → univers → catalogue ; l’accueil,… · CCR-11 Interdits : compteur artificiel de visiteurs ou de produits, nombre de vendeurs, de…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| compteur(c) = COUNT(maître ∧ ∃ offre active) | Recalculé à chaque publication ou désactivation ; cache court. |
| offre active ⇔ publiée ∧ active ∧ boutique ouverte aujourd’hui | « Fermé aujourd’hui » retire l’offre ; un maître sans autre offre sort du compteur. |
| compteur(univers) = Σ compteur(sous-catégories) | 10 univers ; Σ = 1 387. |

### CL-04 — Pour le développeur : API, événements, erreurs, paramètres

### CL-05 — Moteur, attribution et classement

CRM-01 Le client cherche un produit, jamais un vendeur : les offres de plusieurs vendeurs sont… · CRM-02 L’offre montrée est celle au coût total livré le plus bas pour ce client (prix +… *(calcul)* · CRM-03 Rupture, lenteur ou refus du vendeur : bascule automatique sur le vendeur suivant, sans… · CRM-04 Tolérance aux fautes : « telefone samsng » trouve « téléphone Samsung ». · CRM-05 Sans accent : « telephone » = « téléphone ». *(calcul)* · CRM-06 Bilingue français / anglais : « shoes » trouve « chaussures », et l’inverse. · CRM-07 Synonymes locaux : table maintenue en console (appellations locales, marques génériques,… · CRM-08 Sens : aucun résultat exact ⇒ produits proches par le sens (plongements), jamais une page… · CRM-09 Meilisearch (pile technique) pour les fautes, les accents, les synonymes et les règles de… · CRM-10 Index des produits maîtres : titre, description, catégorie, marque, variantes, mots-clés,… · CRM-11 Mise à jour de l’index à chaque publication, changement de prix ou de stock,… · CRM-12 Classement : 1. *(calcul)* · CRM-13 Aucun placement payant ni produit sponsorisé dans les résultats. · CRM-14 Au critère 1, un produit XL ou hors gabarit livrable à domicile compte comme livrable ;… · CRM-15 Chaque nombre montré (suggestion, puce de zone, résultats, compteur de filtre, univers)… *(calcul)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| rang = (dispo_livrable ↓, pertinence ↓, coût_livré ↑, trust ↓) | Tri lexicographique. « Au plus proche » remplace pertinence et coût par la distance, après le critère 1. |
| offre(m) = argmin(prix + livraison réelle(vendeur → relais, panier)) | Départage Trust Score. Bascule au suivant si rupture, lenteur ou refus. Livraison réelle = ramassage (0 si la boutique est déjà dans le panier, 380 F si sa zone y est déjà, 500 F sinon) + remise, moins la livraison offerte selon le panier (7.3). |
| distance = ST_Distance(vendeur, relais_sélectionné) | Géodésique, en km, arrondie à 0,1 ; la même valeur en recherche, au listing et sur la fiche. |

### CL-05 — Pour le développeur : API, événements, erreurs, paramètres

### CL-06 — Description et publication de la fiche (6.3)

CFP-46 La description est en français, rédigée avec les mots du vendeur ; une fiche copiée d’une… · CFP-47 Contrôle de langue à la publication ; message clair au vendeur : « Décris le produit avec… · CFP-48 Fiches suspectes de copie : file de modération de la console avant la mise en ligne. · CFP-49 Le vendeur cherche d’abord le produit dans le catalogue ; s’il existe, il ajoute… · CFP-50 Quand un nouveau vendeur ajoute son offre à un produit maître existant, la note, les avis…

### CL-06 — Pour le développeur : API, événements, paramètres, erreurs

CFP-55 Aucune réponse d’API de la fiche ne contient le nom de la boutique attribuée ; l’anonymat… · CFP-56 Tout montant de la fiche (prix, remise, prix livré, tarifs, seuils, suppléments, total)… *(calcul)* · CFP-57 Événements : product.viewed (recommandation) ; favorite.added (favoris de retour en…

### CL-07 — Pour le développeur — API, événements, erreurs, paramètres

### CL-08 — Parcours « Payer »

CPY-01 Au clic sur « Payer », l’application n’envoie que le contenu du panier (articles,… · CPY-02 Le serveur enchaîne dans cet ordre, dans une seule transaction : recalcul, contrôle des… · CPY-03 Recalcul depuis zéro : prix actuel de chaque variante, frais de chaque ramassage, remise… · CPY-04 Stock réservé au clic sur « Payer », sur la variante précise, jamais à l’ajout au panier… · CPY-05 Clé d’idempotence = id_commande + n° de tentative : deux clics, un double envoi réseau ou… *(calcul)* · CPY-06 Le prix payé est celui affiché au moment du paiement, jamais celui du moment de l’ajout… · CPY-07 Trois écrans distincts, reliés aux vrais états du paiement, qui ne se confondent jamais :… · CPY-08 Agrégateur principal CamPay (certifié ANTIC, enregistré ART), secours Fapshi ; rails MTN… · CPY-09 Zéro espèce, nulle part, y compris au comptoir du relais : Mobile Money et carte… · CPY-10 Toute action d’argent exige la connexion : hors ligne, les boutons de paiement sont…

### CL-08 — Portefeuille « Compte BelivaY » et dépôt manuel — supprimés

CPY-51 Aucun porte-monnaie ni dépôt : l’argent du client n’est détenu par BelivaY qu’en escrow,…

### CL-08 — Règles de calcul des montants

CPY-52 Tout montant est calculé côté serveur, au moment de l’affichage ou de l’envoi ; jamais… · CPY-53 Chaque changement déclenche un recalcul complet depuis zéro, jamais une soustraction de… · CPY-54 Un même montant apparaît à l’identique dans l’application, la notification et l’écran du… · CPY-55 M = S + Ram + Rem − Off (formules du chapitre 7, Rem_relais = 400 F, livraison de base… *(calcul)* · CPY-56 Tout montant renvoyé par l’API vient du service de tarification ; aucune réponse ne… · CPY-57 Montants en francs CFA, espace insécable des milliers, « F » ; l’anglais écrit « 272,579…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| M = S + Ram + Rem − Off | Montant demandé à l’agrégateur, recalculé au clic sur « Payer » avec les formules du chapitre 7 (Rem_relais = 400 F, livraison de base relais 900 F). Jamais le montant reçu de l’application. Exemple : 271 699 + 1 380 + 400 − 900 = 272 579 F ; BLV-52107 : 195 900 + 1 380 + 400 − 900 = 196 780 F. |
| Δ = M_serveur − M_affiché | Δ = 0 : continuer sans écran. Δ < 0 : appliquer, afficher « tu gagnes \|Δ\| F » (Ensemble wax 32 000 → 30 500 F : 271 079 F, « tu gagnes 1 500 F »). Δ > 0 : bloquer, afficher l’écart, confirmation explicite (Tecno Camon 30 150 699 → 152 699 F : « + 2 000 F », 274 579 F). |
| Produit désactivé : recalcul sans la ligne | Mixeur-blender retiré : S = 234 699 ; Ram = 500 + 380 = 880 (plus de ramassage à Mvan) ; + 400 − 900 = 235 079 F, 3 articles, 2 colis. Jamais « 272 579 − 37 000 ». |
| dispo(v) = stock(v) − Σ réservations_actives(v) | Réservation si dispo(v) ≥ q pour chaque ligne ; sinon vendeur suivant ; sinon « cet article vient d’être pris ». Verrou sur la variante. Sac cuir pris sans autre vendeur : S = 219 699 ; Ram inchangé 1 380 (la boutique B garde l’ensemble) → 220 579 F, 3 articles, 3 colis. |
| t_exp = t_demande + T_val | T_val = fenêtre de validation de l’agrégateur (PAY-TVAL). À t ≥ t_exp sans webhook de succès : réservation libérée, « Paiement non abouti ». Prototype : T_val = 24 min (exemple du jeu d’essai) ; demande de 10 h 14 → expire à 10 h 38 ; à 10 h 15, « 23 min ». |
| clé = id_commande + n° de tentative | Deux requêtes de même clé = une seule demande. Un renvoi incrémente la tentative et annule la précédente (renvoi à 10 h 15 : la demande de 10 h 09 est annulée). |
| confirmée ⇔ webhook_valide ∧ escrow_écrit | Sinon l’écran reste « en attente ». |
| validée_comptoir ⇔ éligible(IFA, S, compte, mode) ∧ livraison_payée | État « Validée » ; escrow créé au webhook du paiement sur place ; code débloqué à ce moment. BLV-51940 : robe 24 000 F ≤ 50 000 F, IFA Standard, 4 commandes sans incident → éligible ; livraison 900 F payée. |
| Δt = t_retrait_estimé − t_now | Δt < 24 h : compte à rebours. Reçu BLV-52107 à 10 h 15, retrait dès 15 h : 4 h 45. Δt ≥ 24 h : date ferme. BLV-51940 validée le mar. 22 à 10 h 15, retrait estimé jeu. 24 dès 9 h (46 h 45) : « jeudi 24 sept. dès 9 h ». Jamais une fourchette. |
| frais_carte = arrondi(2 % × (S + livraison)) | Affichés avant de payer. Panier « seuil » (Pagne wax 18 500 F + livraison 900 F = 19 400 F) : 388 F ; total 19 788 F. |
| montant_EUR = montant_XAF ÷ 655,957, au centime | 19 788 ÷ 655,957 = 30,166 → 30,17 €. Autre devise : taux du prestataire, figé au paiement. |
| montant_XAF ≤ 150 000 par transaction (carte) | 272 579 F > 150 000 F : la carte n’est pas proposée pour le panier de référence ; paiement en plusieurs commandes. |
| montant_dû_retrait = reste_validée + frais_garde(t) | Calculé par le service de tarification (CL-09). BLV-51940 : 24 000 + 0 le jour de l’arrivée = 24 000 F ; la garde s’ajoute à partir du 2e jour (100 F aux jours 2 et 3, 200 F aux jours 4 et 5, 400 F aux jours 6 et 7). |

### CL-08 — Pour le développeur : API, événements, erreurs, paramètres

CPY-58 Notification du paiement : un SMS « paiement protégé » (C1) fait partie des 5 à 6 SMS… · CPY-59 Un paiement réel de bout en bout est réalisé avec MTN MoMo et Orange Money, en succès… · CPY-60 Nouveau paramètre PAY-SONDAGE pour l’intervalle d’interrogation de l’état (3 s la…

### CL-09 — Composant « Carte de commande »

CMC-19 Ordre de lecture de la carte : tête (pictogramme, numéro, date, pastille) ; relais et… · CMC-20 La phrase d’état répond à « quand ? *(calcul)* · CMC-21 Date de la tête : « Payée le [jour date] » (ou « Payée aujourd’hui à 09 h 02 »), «… *(calcul)* · CMC-22 La couleur double l’état, jamais seule : vert (retirable, retirée), ambre (en… · CMC-23 Au plus une action principale (pleine) et une secondaire (contour), plus le lien «… *(calcul)* · CMC-24 Carte en litige : action « Suivre mon litige » vers le suivi du dossier (CL-11) ; montant… · CMC-25 Chaque carte a au plus un bouton plein ; la secondaire est en contour (« Payer 400 F », «… *(calcul)* · CMC-26 La jauge par colis (4 segments = rang de l’état : Préparation, Récupéré, Arrivé au… *(calcul)* · CMC-27 Colis en litige ou annulé : pas de jauge, son état en clair la remplace ; commande… · CMC-28 X = max(t_estimé des colis non arrivés) − t_now, arrondi à l’heure : « Prêt dans 2 h »… *(calcul)* · CMC-29 X ≥ 24 h : date ferme (« Prêt jeu. *(calcul)* · CMC-30 « réponse sous X h » = t_ouverture + 48 h − t_now (arrondi à l’heure inférieure) : 31 h… *(calcul)* · CMC-31 Ni Trust Score ni IFA du client ; le vendeur reste anonyme (« Boutique A », « Colis 1 »). · CMC-32 La carte est un composant unique, utilisé par la liste et par chaque puce ; la mini-carte…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| « Retirable » ⇔ ∀ colis du groupe : arrivé au relais | Sinon « En préparation » ou « En route », avec l’heure ferme du dernier colis. |
| X = max(t_estimé des colis non arrivés) − t_now | BLV-52107 : 15 h 00 − 10 h 15 = 4 h 45 → « dès 15 h » ; Colis 1 : « Prêt dans 2 h ». X ≥ 24 h → date ferme. |
| « réponse sous X h » = t_ouverture + 48 h − t_now | Mer. 23 sept. 17 h 15 + 48 h − jeu. 24 sept. 10 h 15 = 31 h ; échéance ven. 25 sept. 17 h 15. |
| articles affichés = 2 ; « + N autres » = nombre de lignes − 2 | BLV-52107 : 3 lignes → « + 1 autre article ». |

### CL-09 — Au comptoir · ce que l’écran du gérant impose

CCM-21 Code du client saisi (6 chiffres) ou QR scanné. · CCM-22 Nombre de colis : autant de colis remis qu’annoncés, avec l’étagère de chacun ; sinon… · CCM-23 Montant dû calculé par le système (0 F le jour d’arrivée, garde ensuite, reste d’une… *(calcul)* · CCM-24 Qui retire ? · CCM-25 Photo de remise obligatoire avant validation. · CCM-26 « Le client signale un problème » ouvre le litige au comptoir. · CCM-27 Validation bloquée tant que les colis ne sont pas sortis et la photo prise. · CCM-28 Retrait en moins d’une minute : toute étape en plus crée une file dans la boutique.

### CL-09 — Pour le développeur · API, événements, paramètres, erreurs

### CL-10 — Le service d’envoi et le journal

CSM-20 Une seule couche d’abstraction : aucun module n’appelle FCM, l’agrégateur SMS (Africa’s… · CSM-21 Responsabilités : canal, consentement, revérification de l’état métier juste avant… · CSM-22 File durable par criticité ; tentatives à 1, 5 et 15 minutes, puis repli (MSG-TENTATIVES). *(calcul)* · CSM-23 Garde-fous : budget journalier, plafond de SMS par commande, blocage des gabarits… *(calcul)* · CSM-24 Recette en bac à sable : aucun envoi réel hors d’une liste blanche de numéros et… · CSM-25 Idempotence : clé = code message + identifiant métier + discriminant + séquence, groupe… *(calcul)* · CSM-26 Événement rejoué : clé vérifiée avant la mise en file. · CSM-27 État changé entre la file et l’envoi : revérifier, sinon annulation journalisée (ex. · CSM-28 Budget SMS de la commande atteint : push seulement, sauf criticité 1. · CSM-29 Message expiré en file : criticité 1 après 6 h, 2 après 4 h, 3 après 1 h (MSG-VALIDITE «… *(calcul)* · CSM-30 Contestation de frais : un message non délivré annule les frais de garde de la période. · CSM-31 Panne du fournisseur SMS : bascule sur le secondaire ; sinon criticité 1 en appel vocal… · CSM-32 Journal des envois : table en ajout seul — clé, code, utilisateur, commande, canal,… · CSM-33 Accusés : message.sent, message.delivered, message.opened alimentent le journal et fixent…

### CL-10 — Pour le développeur : API, événements, erreurs, paramètres

### CL-11 — Le parcours du litige, du retour et du remplacement

CLT-01 Toutes les entrées mènent à l’assistant ou au même dossier : « Signaler un problème » du… · CLT-02 Le litige suit la machine à états ouvert → attente_vendeur → en_examen → decide, puis le… · CLT-03 Un litige porte sur un colis (une sous-commande, un vendeur), jamais sur une ligne…

### CL-11 — Règles d’arbitrage (serveur et console)

CLT-55 Au-dessus du seuil du palier : dossier, escrow retenu, arbitrage humain ; l’argent reste… · CLT-56 Un litige perdu pèse sur le Trust Score du vendeur ; gagné, il ne le pénalise pas. *(calcul)* · CLT-57 Un litige imputable au transport (colis abîmé, scellé rompu) pèse sur le Trust Score de… · CLT-58 Au-delà du plafond de valeur de l’entreprise de livraison (75 000 F Nouveau, 250 000 F… *(calcul)* · CLT-59 Tout remboursement va vers le moyen de paiement d’origine, jamais réorienté : Mobile… · CLT-60 Montant d’un litige = montant retenu de la sous-commande (articles). *(calcul)* *(À trancher)* · CLT-61 Un montant partiel (LIT-2987 : 3 000 F sur une chemise à 21 000 F) n’a pas de règle de… *(À trancher)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| montant ≤ seuil_auto(palier) ⇒ remboursement automatique | Vers le moyen d’origine ; compteur séparé « remboursés sans instruction » ; payé par BelivaY. |
| montant > seuil_auto(palier) ⇒ instruction | Dossier, escrow retenu, arbitrage humain. |
| t_limite_vendeur = t_ouverture + 48 h | Affiché en heures restantes, arrondi à l’heure inférieure. |
| t_now ≥ t_limite ∧ aucune réponse ⇒ file d’arbitrage prioritaire | Présomption client ; décision humaine journalisée (chapitre 18). |
| arrangement ⇒ len(texte) ≥ 40 | Proposé au client, qui accepte ou refuse. |
| litige ouvert ⇒ libération, C10 et garde suspendus | Pour la sous-commande concernée (chapitre 10). |
| remboursement → moyen de paiement d’origine | Jamais réorienté ; carte → carte. |
| ordre de la file console = temps restant avant échéance, puis montant ↓ | Échéances : 48 h vendeur, 48 h ouvrées constat relais (18.1). |

### CL-11 — IFA — indice de fiabilité acheteur (interne, jamais affiché)

CIF-01 L’IFA (indice de fiabilité acheteur) est le score interne du client : jamais montré au… · CIF-02 Règle fondatrice : on juge un client sur ses litiges perdus, jamais sur le nombre de ses… · CIF-03 L’IFA est mesuré dès le premier jour (12 mois glissants) pour calibrer les seuils sur des… *(calcul)* · CIF-04 Compteur « litiges perdus après instruction » : poids fort. · CIF-05 Compteur « litiges retirés après demande de preuve » : poids fort, le plus révélateur. · CIF-06 Compteur « remboursés automatiquement, non instruits » : poids moyen, compteur séparé. · CIF-07 Compteur « annulations après préparation » : poids faible, nul si la cause est BelivaY ou… · CIF-08 Compteur « colis non retirés » : poids faible, nul si la cause est légitime. · CIF-09 Compteur « refus au comptoir d’une commande Validée » : poids fort ; deux refus rendent… · CIF-10 Les commandes sans incident font remonter le score. · CIF-11 Palier Élevé : remboursement immédiat jusqu’à 10 000 F, plafonné en fréquence ; litige… · CIF-12 Palier Standard : remboursement automatique jusqu’à 3 000 F, instruction au-delà ;… *(calcul)* · CIF-13 Palier À instruire : plus d’automatisme, photos obligatoires, arbitrage humain ; délai… · CIF-14 Palier Plafonné : plafond de commande, pas de paiement au comptoir, pas de remboursement… *(calcul)* · CIF-15 Aucun palier négatif (À instruire, Plafonné) avant 5 commandes au total : avant, le… *(calcul)* · CIF-16 Un seuil absolu de litiges perdus sur 12 mois (N_abs) propose une descente, en plus du… *(calcul)* · CIF-17 Un plafond de remboursements non instruits sur 12 mois (N_auto) fait sortir de… *(calcul)* · CIF-18 Le compteur de rétrogradations est permanent, jamais remis à zéro ; à partir de 3, toute… · CIF-19 Identité élargie : compte + numéro MoMo + relais habituel ; un changement de numéro garde… · CIF-20 Toute descente croise d’abord le Trust Score des vendeurs concernés : litiges concentrés… · CIF-21 Aucun palier ne rallonge le délai de traitement d’un litige : délai_traitement(palier)… · CIF-22 Rétrogradation toujours validée par un humain ; recours possible pour le client. · CIF-23 Un litige gagné ne laisse aucune trace. · CIF-24 Un litige imputable à BelivaY ou au transport ne fait jamais descendre le client. · CIF-25 Jamais de bannissement : on plafonne. · CIF-26 L’IFA est invisible : le client voit ses avantages actifs en clair, jamais sa note ni son… · CIF-27 Les compteurs tournent dès le lancement sans aucune décision automatique : toute descente… · CIF-28 L’éligibilité au paiement au comptoir lit l’IFA (neutre ou positif) côté serveur ; le… *(calcul)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| taux_échec = litiges_perdus_12m / commandes_12m | 50 commandes et 5 perdus = 10 %. |
| palier négatif ⇔ commandes_total ≥ 5 | Avant, au minimum Standard. |
| litiges_perdus_12m ≥ N_abs ⇒ descente proposée | N_abs = paramètre (à calibrer). |
| remb_auto_12m ≥ N_auto ⇒ sortie de l’automatisme | Même au palier Élevé. |
| rétrogradations_total ≥ 3 ⇒ remontée sur validation humaine | Jamais remis à zéro. |
| descente ⇒ croisement vendeur + validation humaine | Litiges concentrés sur un vendeur : c’est lui qu’on examine. |
| délai_traitement(palier) = constante | Aucun palier ne rallonge le délai. |

### CL-11 — Textes d’aide et règles publiées : litiges et retours

CRO-26 Aucun texte de l’application (bandeau, FAQ, CGV, À propos) ne promet un retour ou un… · CRO-27 La page « Règles des retours et des litiges » est rédigée en langage simple, en français…

### CL-11 — Pour le développeur : API, événements, messages et routes

CLT-62 Aucune réponse d’API client ne contient l’IFA, le palier, le nom ou le numéro d’une… · CLT-63 Tout montant (retenu, remboursé, écart, trajet) vient du service de tarification,… · CLT-64 Les notifications de litige et de retour partent en push gratuit ; elles ne comptent pas…

### CL-11 — Valeurs du jeu d’essai, arbitrages et écarts relevés

CRO-28 Côté client, le vice caché (100 jours, hors escrow) et le défaut caché signalé sous 48 h… *(calcul)* · CLT-65 Tutoiement partout, y compris dans les messages ; les textes cités par la spécification…

### CL-12 — Pour le développeur : API, événements, erreurs, paramètres

### CL-13 — Écrans actuels retirés : fidélité, parrainage, portefeuille

CCO-25 Ni points, ni niveaux client, ni parrainage, ni porte-monnaie au lancement ; l’argent du…

### CL-13 — Règles et calculs des avis

CAV-15 Pas de négociation : un vendeur n’obtient jamais le retrait d’un avis contre un… · CAV-16 Modération : seulement insultes, coordonnées, hors sujet ; suppression dans ces cas… · CAV-17 Avis cumulés sur tout le produit maître, quel que soit le vendeur attribué ; photos… · CAV-18 Ce que les avis alimentent : le Trust Score du vendeur (note vendeur, par vendeur réel,… · CAV-19 La note « boutique » s’affiche « le vendeur » ; elle nourrit la Satisfaction (20 points)… *(calcul)* · CAV-20 Un relais qui passe sous le seuil est revu par Opérations zone, jamais suspendu… · CAV-21 Un avis bas causé par le transport ne pénalise pas le vendeur : l’arbitrage éventuel… · CAV-22 Le gérant voit sa moyenne et ses derniers commentaires dans son application, jamais… · CAV-23 La lecture des avis (onglet Avis de la fiche : moyenne, nombre, répartition, « acheteurs…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| peut_noter ⇔ payée ∧ retirée ∧ t_now ≤ t_retrait + fenêtre | fenêtre = AVIS-FENETRE (à trancher ; prototype 7 j). BLV-51702 : retirée sam. 19 sept. 11 h 32 → jusqu’au sam. 26 sept. 11 h 32. |
| une note par (commande, cible) | Cible = vendeur (par colis) ou relais. Modifiable dans la fenêtre. |
| note_affichée(maître) = moyenne(notes vendeur de tous les vendeurs du maître), 1 décimale | « 4,6 · 128 avis vérifiés » sur la fiche (lecture : CL-06). |
| répartition(k) = COUNT(note = k) ÷ n | Arrondie à l’unité. |
| note ≤ seuil_bas ⇒ proposer un litige | seuil_bas = AVIS-BAS (2 étoiles proposé). |
| p̂ = notes ≥ 4 ÷ n ; score = borne basse de Wilson (z = 1,96) | Trust Score et départage : 3 avis à 5 étoiles ne passent pas devant 200 avis à 4,7. |
| événement vendeur : note ≥ 4 = succès ; ≤ 2 = échec | Critère Satisfaction (20 points), décroissance à 90 jours. |
| suppression ⇒ motif ∈ {insulte, coordonnées, hors sujet} + journal | Jamais sur demande du vendeur. |

### CL-13 — Jeu d’essai, liens et points à trancher

### CL-14 — Abonnement : hypothèses, vérification économique, règles et API

CAB-63 Tous les seuils et quotas sont des paramètres (ABO-*), versionnés et modifiables en… · CAB-64 Aucune formule ne doit faire passer une commande sous le plancher de contribution : la… · CAB-65 subscription.renewed est consommé par la cagnotte et les quotas ; subscription.failed… *(calcul)* · CAB-66 Les routes sont indicatives ; tout montant renvoyé vient du service de tarification ;… · CAB-67 Seuil domicile des abonnés : 15 000 F pour Prime (imprimé) et, par cohérence, pour Prime… *(calcul)*

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| offert(commande) = R + Rem(mode) au tarif S | Jamais les ramassages suivants ni les suppléments de classe. |
| éligible_relais_offert ⇔ S ≥ seuil_palier ∧ quota_restant > 0 | Plus : 3 par mois ; Prime : illimité dans la limite de 30 (Business 70). |
| domicile : Plus −30 % ; Prime 3 offerts dès 15 000 F puis −50 % ; Duo 5 offerts puis −50 % ; Business 6 offerts puis −50 % | Sur la livraison de base domicile (1 500 F) au tarif S. Seuil de 15 000 F écrit pour Prime seulement : recommandé pour Duo et Business aussi (ABO-SEUIL-DOM, à créer). |
| Business relais = −50 % sur la livraison de base, dès 10 000 F | Seuil de 10 000 F recommandé comme pour les autres paliers. |
| cagnotte = 2 % × S, créditée à la libération | Annulée si la commande est remboursée ; expire à 90 jours. |
| F_client = 1 + bonus(palier) | Plus +2, Prime, Duo, Business +4 (la spec imprime « 3 + bonus » : voir CAB-40). |
| économies = Σ livraisons offertes + réductions + cagnotte créditée | Compteur du profil. |
| module visible ⇔ interrupteur « abonnement » activé | Masque aussi tous les encarts des autres documents. |
| contribution(commande) ≥ plancher, pour toute formule | La simulation de la console bloque toute valeur qui ferait passer une commande sous le plancher. |

### CL-14 — Liste d’envies : remise groupée, escrow, liaisons et API

CLE-47 Par défaut, au fil de l’eau : chaque article offert part immédiatement, avec son propre… · CLE-48 Les colis en attente de groupage ne sont jamais facturés au client et le relais n’est pas… · CLE-49 Les colis en attente de groupage comptent dans la capacité déclarée du relais. · CLE-50 En mode groupé, le destinataire reçoit un seul message d’arrivée et un seul code, quand… · CLE-51 Les routes sont indicatives ; tout montant renvoyé vient du service de tarification ;…

**Calculs — Calculs**

| Condition ou formule | Règle d’implémentation |
|---|---|
| remise_groupée = min(date_cible, t_premier_paiement + 21 j) | Rupture automatique du groupage à l’échéance. Jeu d’essai : min(sam. 10 oct., lun. 12 oct.) = sam. 10 oct. |
| garde(colis en groupage) = 0 | Ni facturée au client, ni payée au relais ; la garde normale ne commence qu’à la remise du groupe (J0 = accusé fort du message d’arrivée). |
| verrou(article) au clic sur payer | En même temps que la réservation de stock. |
| remboursement → payeur, moyen d’origine | Jamais au bénéficiaire. |
| lien valide ⇔ t_now ≤ t_partage + validité | Validité par défaut à trancher (7, 30 ou 90 jours). |

### CL-14 — Registre des paramètres après le lancement (32.1 à 32.4)

### CL-15 — Nouveauté EX-01 · Liste de rentrée scolaire

CRS-01 Module fermé au lancement (FF-EX01) : aucun point d’entrée « rentrée » sur un écran de… · CRS-02 Livrables : recherche d’une école et de sa liste officielle par classe ; ajout de toute… · CRS-03 La confiance s’applique à toute la liste : argent bloqué jusqu’au retrait, chaque vendeur… · CRS-04 Aucune rémunération de l’école, dans aucun sens : BelivaY ne lui verse rien, ne lui prend… · CRS-05 Aucune donnée d’élève : ni nom, ni âge, ni photo ; seule la classe est demandée, partout…

**Calculs — Indicateurs à suivre**

| Indicateur | Calcul (événements du module) |
|---|---|
| Listes publiées par les écoles | Nombre de school_list.published par saison, par zone. |
| Taux de conversion d’une liste consultée | Listes mises au panier puis payées ÷ listes ouvertes (school_list.viewed). |
| Panier moyen de rentrée | Total moyen des commandes source = school_list. |
| Part des listes payées en mise de côté | Listes réservées par EX-03 ÷ listes payées. |

### CL-15 — Nouveauté EX-02 · Cotisation pour un cadeau

CCZ-01 Module fermé au lancement (FF-EX02) ; aucun bouton « Offrir à plusieurs » sur une fiche… · CCZ-02 Livrables : créer une cotisation autour d’un cadeau ; partager le lien et participer,… · CCZ-03 Ce n’est pas un compte d’épargne : l’argent, bloqué comme un escrow, ne sert qu’au cadeau… *(calcul)* · CCZ-04 Les 2 % de frais de service couvrent les frais de paiement de chaque participation ; ils… *(calcul)* *(À trancher)*

**Calculs — Indicateurs à suivre**

| Indicateur | Calcul (événements du module) |
|---|---|
| Cotisations créées | pool.created par semaine. |
| Taux d’objectif atteint | pool.goal_reached ÷ cotisations arrivées à échéance ou atteintes. |
| Participants par cotisation | Moyenne des pool.contribution_paid par cotisation. |

### CL-15 — Nouveauté EX-03 · Mettre de côté avec acompte

CMD-01 Module fermé au lancement (FF-EX03) ; aucun bouton « Mettre de côté » sur une fiche ou un… · CMD-02 Livrables : la proposition sur la fiche et au panier ; le plan de versements ; les… · CMD-03 Ce n’est pas un crédit : aucun intérêt, et le produit n’est jamais remis avant le dernier… · CMD-04 Une mise de côté n’est pas une commande : tant que le dernier versement n’est pas payé,… · CMD-05 Rappels par push ; SMS seulement dans le budget de messages de la plateforme (six SMS au… *(calcul)*

**Calculs — Indicateurs à suivre**

| Indicateur | Calcul (événements du module) |
|---|---|
| Mises de côté ouvertes | Nombre de layaway.created actives. |
| Taux d’achèvement | layaway.completed ÷ mises de côté arrivées à terme. |
| Annulations | layaway.cancelled, par cause : client, fin de grâce, vendeur. |

### CL-15 — Nouveauté EX-04 · Reprise et troc de téléphone

CTR-01 Module fermé au lancement (FF-EX04) ; aucun bouton « Troc » sur une fiche de téléphone au… · CTR-02 Livrables : l’estimation honnête de l’ancien téléphone ; l’offre de troc (fourchette,… · CTR-03 Pas de rachat par BelivaY, pas de recel : l’IMEI et l’identité sont vérifiés à chaque… · CTR-04 Le libellé « Reste à payer » est interdit partout (9.1), y compris ici : on écrit «…

**Calculs — Indicateurs à suivre**

| Indicateur | Calcul (événements du module) |
|---|---|
| Estimations | tradein.estimated. |
| Dépôts | tradein.deposited (et refus tradein.deposit_refused par cause). |
| Écart estimation / valeur confirmée | Valeur confirmée − bas de fourchette, et part des contre-offres. |
| Trocs conclus | Commandes du neuf payées après une reprise confirmée. |

### CL-15 — Nouveauté EX-05 · Panier famille pour la diaspora

CFM-01 Module fermé au lancement (FF-EX05). · CFM-02 Livrables : paniers prêts (essentiels, rentrée, fêtes) modifiables ; paiement par carte… · CFM-03 Messages au payeur : push, puis e-mail en repli ; jamais entre 22 h et 7 h à l’heure du… *(calcul)* · CFM-04 Libération du vendeur à J+14 sur carte (rétrofacturation) ; preuves conservées 120 à 180… *(calcul)*

**Calculs — Indicateurs à suivre**

| Indicateur | Calcul (événements du module) |
|---|---|
| Paniers payés depuis l’étranger | family_basket.paid (carte étrangère). |
| Renouvellements | family_basket.renewed ÷ préavis envoyés ; suspensions. |
| Taux de retrait | Paniers retirés ÷ paniers arrivés (renvois au vendeur à part). |

### CL-15 — Nouveauté EX-06 · Commander sur WhatsApp avec l’IA

CWA-01 Module fermé au lancement (FF-EX06) ; pas d’API WhatsApp payante au lancement (WAP-API) ;… · CWA-02 Livrables : la réception d’un message écrit ou vocal ; la proposition de l’IA (articles,… · CWA-03 Doctrine de l’assistant (24.1) : l’IA propose, le client décide ; aucune action d’argent… · CWA-04 Le fil WhatsApp est rattaché à la commande en console pour le support ; aucune photo ni…

**Calculs — Indicateurs à suivre**

| Indicateur | Calcul (événements du module) |
|---|---|
| Conversations | wa.message_received (nouvelles conversations par jour). |
| Taux de « OUI » | wa.confirmed ÷ wa.proposal_sent. |
| Coût par commande | Coût API WhatsApp + IA (couche AIService) ÷ commandes payées (WAP-COUT). |

### CL-15 — Réserve, points à voir et idées écartées (EX-07)

CRV-01 Gardée pour plus tard : achat groupé de quartier (prix qui baisse avec le nombre… · CRV-02 Gardée pour plus tard : essayage au relais — quand les relais ont la place et le temps. · CRV-03 Gardée pour plus tard : protection du prix bas — après 6 mois de données de prix. *(calcul)* · CRV-04 Gardée pour plus tard : garantie casse — avec un assureur partenaire. · CRV-05 À voir avant de lancer EX-03 : forfait d’annulation de la mise de côté (5 %, 5 000 F au… *(calcul)* *(À trancher)* · CRV-06 À voir avant de lancer EX-02 : 2 % de frais de cotisation, à confirmer avec les vrais… *(calcul)* *(À trancher)* · CRV-07 À voir avant de lancer EX-04 : source de la liste des téléphones volés au Cameroun. *(À trancher)* · CRV-08 À voir avant de lancer EX-04 : contrat du reconditionneur. *(À trancher)* · CRV-09 À voir avant de lancer EX-06 : coût par commande de WhatsApp et de l’IA ; durée de… *(À trancher)* · CRV-10 Écartée : rémunérer les écoles — conflit d’intérêts. · CRV-11 Écartée : acompte avec intérêts — c’est un crédit. · CRV-12 Écartée : BelivaY rachète les téléphones — risque de recel, stock. · CRV-13 Écartée : retirer en espèces l’argent d’une cotisation — zéro espèce. · CRV-14 Écartée : l’IA commande seule — le client décide toujours.

### CL-15 — Registre des paramètres des nouveautés (32.1 et 32.5)

CRV-15 Tous ces codes existent dans la même table que ceux du lancement, versionnés et… · CRV-16 Aucun module ne s’active avec une valeur « à trancher » : EX-02 attend COT-FRAIS ; EX-03… · CRV-17 Ajouter au registre les cinq codes cités dans les chapitres mais absents de 32.5 :… · CRV-18 Interrupteur fermé : aucun élément du module n’apparaît sur un écran de lancement…

