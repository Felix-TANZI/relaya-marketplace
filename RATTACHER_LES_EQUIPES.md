# Rattacher les équipes avant le déploiement (revue du 29/10, E3)

**À qui s'adresse ce document :** au porteur et à la personne qui administre les comptes.
**Priorité :** P0. À faire la veille du déploiement sur main 2, puis à vérifier avant le premier vendredi.

## Pourquoi

Après le déploiement, deux choses changent :

- **Écrans du personnel (A2, étape 19).** Chaque écran de gestion est réservé à l'équipe qui en a la charge. Un membre du personnel sans groupe ne voit plus ses écrans. Seul un superutilisateur garde tout.
- **Versements du vendredi (DP-42).** La liste du vendredi exige deux validations : une par un membre de « finance-comptable », une par un membre de « direction ». Sans ces deux valideurs, aucun versement ne part.

## La veille du déploiement

1. **Prévenir le porteur** que le déploiement a lieu le lendemain et que les rattachements ci-dessous doivent être faits.
2. Dans l'administration Django (Utilisateurs, puis la fiche du membre, puis Groupes) :

| Qui | Groupe |
|---|---|
| Le comptable | `finance-comptable` |
| Le porteur | `direction` |
| L'équipe du support | `gestion-support` |
| Le suivi de la fraude | `gestion-fraude` |
| La logistique (livreurs, relais, colis) | `gestion-logistique` |
| La conformité (pièces KYC des vendeurs) | `gestion-conformite` |
| Les litiges, retours et remboursements automatiques | `gestion-litiges` |
| Le catalogue (catégories, fiches, modération, promotions) | `gestion-catalogue` |
| Les comptes vendeurs | `gestion-vendeurs` |
| Les comptes clients | `gestion-clients` |
| Le suivi des commandes | `gestion-commandes` |
| La finance (retraits, statistiques) | `finance` |
| Le pilotage (tableau de bord, journaux, réglages) | `gestion-pilotage` |

   Une même personne peut avoir plusieurs groupes. Les groupes sont créés par les migrations : il n'y a rien à créer à la main.
3. Vérifier : `python manage.py verifier_rattachements`.
   - La commande attendue se termine par **« OK : chaque membre du personnel a son groupe ; les valideurs DP-42 sont en place. »**
   - Sinon, elle liste chaque membre sans groupe et chaque rôle DP-42 vide (sortie 1). Il faut compléter puis relancer.

## Avant le premier vendredi

- Relancer `python manage.py verifier_rattachements`.
- Si le comptable ou le porteur est absent ce vendredi-là, la Direction peut accorder un valideur de secours pour au plus `r_secours_jours_max` jours, soit 7 jours (valeur de départ validée, section F). L'accord est tracé et révocable.
- Les rappels aux valideurs partent le vendredi à 7 h, puis à 10 h (`r_rappel_valideurs_h1`, `r_rappel_valideurs_h2`).

## Ce qui ne dépend pas de l'équipe de développement

Le choix de qui va dans quel groupe, et les rattachements eux-mêmes en production : c'est le porteur qui en décide.
