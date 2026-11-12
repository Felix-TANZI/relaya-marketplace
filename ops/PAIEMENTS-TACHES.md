# Les tâches de paiement : à planifier sur le serveur

Le module de paiement ne tourne pas tout seul. Ses tâches (libération des séquestres, versements, réconciliation)
sont lancées par la commande `payments_tick`, groupe par groupe (`backend/apps/payments/tasks/jobs.py`, `SCHEDULE`).
**Rien dans le dépôt ne les planifie encore** : sans les lignes ci-dessous, aucun séquestre n'est libéré et aucun
versement ne part. À poser par OWEN sur le serveur du site réel (MAIN 2, puis MAIN 1 après le transfert), et sur le
serveur de test.

## Les lignes de cron

`crontab -e` de l'utilisateur qui déploie, dans le dossier du projet (`/var/www/belivay`) :

```cron
# BelivaY — tâches de paiement (ops/PAIEMENTS-TACHES.md)
TICK="cd /var/www/belivay && docker compose -f docker-compose.reel.yml --env-file .env.prod exec -T backend python manage.py payments_tick"
*    * * * *  eval "$TICK --group fast"        >> /var/log/belivay-paiements.log 2>&1
*/15 * * * *  eval "$TICK --group regular"     >> /var/log/belivay-paiements.log 2>&1
5    * * * *  eval "$TICK --group hourly"      >> /var/log/belivay-paiements.log 2>&1
20   * * * *  eval "$TICK --group vendeurs"    >> /var/log/belivay-paiements.log 2>&1
30   2 * * *  eval "$TICK --group daily"       >> /var/log/belivay-paiements.log 2>&1
0    6 * * *  eval "$TICK --group settlement"  >> /var/log/belivay-paiements.log 2>&1
*/10 * * * *  eval "$TICK --group payout"      >> /var/log/belivay-paiements.log 2>&1
```

| Groupe | Quand | Ce qu'il fait |
|---|---|---|
| `fast` | chaque minute | détection des paiements, expiration des intentions |
| `regular` | toutes les 15 min | auto-confirmation (droit de retour fermé) et libération des séquestres |
| `hourly` | chaque heure | solvabilité, cohérence, issues inconnues |
| `vendeurs` | chaque heure | **C04** : versement des vendeurs, un par jour et par vendeur |
| `daily` | chaque nuit | intégrité du grand livre, Trust Score, purge |
| `settlement` | **une fois par jour, avant midi** | le vendredi : lots des points relais et des entreprises de livraison ; rappels DP-42 |
| `payout` | toutes les 10 min | envoi des versements approuvés (un seul processus) |

`settlement` ne doit tourner **qu'une fois par jour** : c'est lui qui prépare la semaine des relais le vendredi.

## La règle de paiement des vendeurs (C04 de la v1.8)

- Le client confirme lui-même la réception, dans son application (ou avec le code du livreur à domicile), après avoir
  ouvert le colis devant le gérant ou le livreur. Le comptoir enregistre l'ouverture, il ne confirme jamais.
- Le montant est versé **1 jour après la confirmation** (`r_versement_vendeur_j`), quel que soit le palier : la tâche
  `vendeurs` verse ce qui est libéré, une fois par jour et par vendeur, `r_versement` (1 %) à sa charge.
- Sans cas signalé, le système approuve le versement et il part. Cas signalés (premier versement, montant inhabituel,
  litige ouvert, forte baisse du Trust Score, changement de numéro, fraude confirmée) : il attend **un** opérateur de
  la Finance ou de la Direction (admin des paiements, validation du versement).
- Une fraude se confirme dans l'admin : *Paiements › Fraudes confirmées (vendeurs)*, par la Finance ou la Direction.
- Tous les délais et seuils sont des réglages `r_…` modifiables dans l'admin (*Règles › Réglages*).
