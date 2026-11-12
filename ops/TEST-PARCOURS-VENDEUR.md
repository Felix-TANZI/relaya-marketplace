# Test des trois parcours vendeur, dans les deux langues

DEV-SRV-01 v1.8 : **C08** (condition avant le passage de `dev` à `main`) et **T03** (avant l'ouverture du terrain).
Qui : NZIKO. Où : sur MAIN 2 dès qu'il porte le site réel, sinon en local (`docker compose up`).
Chaque parcours se fait **deux fois** : une fois en français, une fois en anglais (sélecteur de langue en haut de page).
À chaque écran, vérifier aussi qu'**aucun texte ne reste dans l'autre langue**.

Tant que l'opérateur SMS n'est pas branché, les codes arrivent dans le journal du serveur :
`docker compose logs backend | grep "SMS (console)"` (le code y est masqué : le lire dans l'admin Django, table des codes, ou demander à l'équipe).

## Avant de commencer

- Un compte admin rattaché au groupe **agents-terrain** (admin Django → Utilisateurs → Groupes).
- Deux numéros de téléphone libres, un MTN et un Orange, et une photo de pièce d'identité (recto et verso).

## Parcours 1 — Inscription par un agent (ouvre en premier)

| # | Geste | Résultat attendu | FR | EN |
|---|---|---|---|---|
| 1.1 | Admin → `/admin/terrain` → « Inscrire un vendeur » | Le formulaire de l'agent s'ouvre | ☐ | ☐ |
| 1.2 | Nom de la boutique, numéro, quartier, photo de la pièce, numéro Mobile Money | Le compte est créé ; un mot de passe provisoire s'affiche une seule fois | ☐ | ☐ |
| 1.3 | `/admin/terrain/<id>` | La fiche montre la boutique « en attente de validation » et ce qui manque pour publier | ☐ | ☐ |
| 1.4 | Le vendeur se connecte avec le mot de passe provisoire | Il est envoyé vers `/mot-de-passe-provisoire` et doit en choisir un (8 caractères, dont un chiffre) | ☐ | ☐ |
| 1.5 | Après 72 h sans changement (ou en avançant la date en local) | Le mot de passe provisoire ne marche plus | ☐ | ☐ |

## Parcours 2 — Inscription seule (ouvre quand le SMS est testé)

| # | Geste | Résultat attendu | FR | EN |
|---|---|---|---|---|
| 2.1 | `/vendeur/ouvrir-boutique` sans être connecté | Nom de la boutique, numéro, quartier | ☐ | ☐ |
| 2.2 | « Recevoir le code », puis saisir le code reçu | Le numéro est vérifié, le compte est créé | ☐ | ☐ |
| 2.3 | Redemander un code plusieurs fois de suite | Le serveur finit par refuser (limite anti-abus) | ☐ | ☐ |
| 2.4 | Un client déjà connecté ouvre `/vendeur/ouvrir-boutique` | La boutique s'ouvre sur son compte existant, sans nouveau compte | ☐ | ☐ |
| 2.5 | `/forgot-password` avec ce numéro | Un lien de nouveau mot de passe arrive ; `/mdp-nouveau` le change | ☐ | ☐ |

## Parcours 3 — Publier puis être payé (pour les vendeurs des parcours 1 et 2)

| # | Geste | Résultat attendu | FR | EN |
|---|---|---|---|---|
| 3.1 | `/seller/v2/produits/nouveau` sans pièce d'identité validée | La publication est refusée, le site dit ce qui manque (pièce, numéro Mobile Money) | ☐ | ☐ |
| 3.2 | Prix sous le minimum publiable | Refusé, avec le minimum lu sur le serveur (1 000 F), pas une valeur écrite dans l'écran | ☐ | ☐ |
| 3.3 | Admin → `/admin/vendors/kyc` → valider la pièce | Le vendeur est prévenu qu'il peut publier ; le produit passe | ☐ | ☐ |
| 3.4 | `/seller/v2/argent/numero` → nouveau numéro → code | Le numéro n'est enregistré qu'après le code ; un mauvais code est refusé | ☐ | ☐ |
| 3.5 | `/seller/v2/argent` | Aucun montant inventé : seulement les vrais chiffres du compte | ☐ | ☐ |

## Résultat

- Tout coché : NZIKO l'écrit dans le groupe, avec des captures **et** une démonstration en direct le jeudi (C09). Le passage `dev` → `main` peut se faire.
- Une case non cochée : noter le numéro de la ligne, la langue et une capture ; la correction passe avant `main`.

Ce que les tests automatiques couvrent déjà (verts sur `dev`, 1 940 tests serveur) :
`backend/apps/vendors/test_agent_terrain.py`, `backend/apps/vendors/test_inscription_seule.py`,
`backend/tests/test_d19_identite_vendeur.py`, `backend/apps/otp/tests/test_oubli.py`,
`frontend/src/i18n/__tests__/deuxLangues.test.ts`. Cette fiche vérifie ce qu'ils ne voient pas : les vrais écrans, les vrais SMS, les deux langues à l'œil.
