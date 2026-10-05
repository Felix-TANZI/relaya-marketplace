# Logique métier de l'espace client BelivaY

Ce dossier rassemble, sous forme de données (JSON), les règles, paramètres, états,
calculs et routes d'API décrits dans les documents **CL-02** (données, cycle de la
commande, calculs, événements et API) et **CL-16** (registre, liaisons, recette et lexique).

Rien n'est réécrit : chaque valeur est le texte exact du document, rangé sous le nom
de sa colonne. Les documents CL restent la référence ; ces fichiers servent à construire
le site (React côté écran, Django côté serveur) sans recopier les règles à la main.

## Les fichiers

| Fichier | Contenu | Source |
|---|---|---|
| `regles.json` | Les **1 669 règles** de l'espace client, avec identifiant, document, groupe, texte, source et statut | CL-16, registre complet |
| `parametres.json` | Les **181 paramètres** (codes, sens, valeur, statut, écrans concernés) ; `code_propose` signale les 19 codes inventés par CL faute de code dans la spécification | CL-16, registre des paramètres |
| `a-trancher.json` | Les valeurs **à décider** : 29 avant la mise en production, 8 avant d'ouvrir un module après le lancement | CL-16 |
| `arbitrages.json` | Les décisions du porteur du produit (26 sept. 2026) et les arbitrages transverses | CL-16 |
| `machines-a-etats.json` | Les états et transitions : commande, sous-commande et colis, paiement et escrow, litige, retour et remplacement | CL-02 |
| `calculs.json` | Les formules : prix livré, moteur de frais du panier, comptoir, frais de garde et rappels S0 à S5, annulation, litiges, notes et arrondis | CL-02 |
| `api.json` | Les conventions et les **80 routes** de l'API (méthode, chemin, rôle, écran, document) | CL-02 |
| `evenements.json` | Le catalogue des événements (émetteur, charge utile, abonnés, effet visible) | CL-02 |
| `modele-donnees.json` | Les objets du modèle de données client, leurs champs et contraintes | CL-02 |
| `libelles-client.json` | Les libellés affichés au client selon l'état serveur | CL-02 |
| `visibilite-anonymat.json` | Qui voit quoi (client, vendeur, livreur, relais) | CL-02 |
| `droits-acces.json` | Ce qu'un visiteur et un client connecté peuvent faire | CL-02 |
| `services-communs.json` | Les services partagés et leurs responsabilités | CL-02 |
| `acteurs-et-cycle.json` | Les acteurs et le cycle de vie d'une commande, étape par étape | CL-02 |
| `jeu-essai.json` | Le jeu d'essai : journée de référence, catalogue, panier 7.3, commandes de Carine | CL-02 |
| `suivi-regles.md` | La fiche de suivi des 1 669 règles, une ligne par règle, avec les cases Revue, Écran, Serveur et Test (générée par `outils/suivi.py`, qui efface les coches si on le relance) | `regles.json` |
| `actions.json` | Les **840 actions** et les **331 questions ouvertes** du paquet, document par document, avec le plan d'exécution, les règles et valeurs de référence et les liens de chaque document | « 00 — Liste complète des actions — Espace client » |
| `suivi-actions.md` | La fiche de suivi des 840 actions (une case par action) et des 331 questions ouvertes (une colonne Décision) | `actions.json` |
| `pages.json`, `pages.md` | L'**inventaire des pages du site** : pour chacune des 147 routes du prototype, ses états, les sections des documents qui la décrivent, ses captures, ses règles (premier classement serveur / écran, règles de calcul repérées), ses calculs, paramètres, cas d'erreur et routes d'API, et un renvoi vers les **règles transverses** de son document (services serveur, moteurs, principes). `pages.md` est la version lisible (générés par `outils/pages.py`) | Prototype, CL-01 à CL-15, `regles.json`, `api.json`, `actions.json` |
| `tableaux/` | L'extraction brute de **tous** les tableaux des 17 documents CL-00 à CL-16 (1 080 tableaux), section par section | CL-00 à CL-16 |

Dans les fichiers tirés de CL-02, chaque section liste dans `regles` les identifiants
des règles qui s'y appliquent ; leur texte complet est dans `regles.json`.

## Statuts des règles

Le sens officiel est fixé par CL-01 (« Statuts des règles et des valeurs », règles CCH-20 et CCH-21).

| Statut | Nombre | Ce que fait le développeur |
|---|---|---|
| Décidé | 1 200 | Implémente tel quel |
| Recommandé | 392 | Implémente tel quel ; une objection passe par le porteur du produit, pas par le code (chacun est justifié dans CL-16) |
| Proposé | 44 | Lit la valeur dans un paramètre, modifiable dans la console sans redéploiement |
| À trancher | 33 | Lit la valeur proposée dans un paramètre ; la **mise en production** attend la décision (le développement, lui, n'attend pas) |

## Mettre à jour

Si un document CL ou le prototype change, relancez les outils depuis la racine du dépôt :

```bash
python3 logique-metier/outils/extraire.py && python3 logique-metier/outils/organiser.py && python3 logique-metier/outils/pages.py
```

`pages.py` rattache une figure à son état du Plan par sa légende, qui est le libellé exact de l'état
(451 figures sur 460 ; 4 par le titre de l'écran ; 5 planches du design system sans état), puis une
capture à sa figure par son nom. Il vérifie les 134 routes du registre de CL-01 (même titre, même
document) et s'arrête en cas d'écart. Le classement **serveur / écran** des règles est automatique
(mots-clés ; une règle avec formule, montant, taux, délai ou borne est marquée « calcul », côté
serveur) : c'est un point de départ pour la revue, pas une décision.

**Chiffres = données de démonstration** : prix, montants, noms et commandes du prototype et du jeu
d'essai seront remplacés par des données réelles ; ce sont les règles qui doivent être exactes.

Les actions se régénèrent sur macOS, à partir du PDF de la liste des actions (chemin par défaut : le paquet Espace client du dépôt) :

```bash
python3 logique-metier/outils/actions.py
```

`actions.py` s'appuie sur `pdftexte.swift` (PDFKit) et vérifie que chaque document retrouve le nombre d'actions annoncé par le guide « À lire en premier » ; il efface les coches de `suivi-actions.md`.

`extraire.py` relit les pages HTML ; `organiser.py` reconstruit les fichiers et
vérifie au passage que le nombre de règles par document et par statut correspond
au tableau récapitulatif de CL-16, qu'aucun identifiant n'est en double et que
chaque règle citée dans CL-02 existe dans le registre. Il s'arrête en cas d'écart.
