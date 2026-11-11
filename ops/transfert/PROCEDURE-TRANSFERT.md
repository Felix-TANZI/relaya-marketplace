# Procédure de transfert du site réel : MAIN 2 → MAIN 1 (DEV-SRV-01, T14)

> T18 : « C'est la seule opération qui déplace toutes les données réelles. Elle suit la procédure répétée, sans improvisation. »
> Terminé quand **les comptages sont identiques sur MAIN 1 et MAIN 2** et **les tests passent**. La réouverture n'intervient qu'à cette condition.

| | |
|---|---|
| Transfert | nuit du **mercredi 18 novembre**, à partir de **22 h** |
| Nouvelle tentative si échec | nuit du **mercredi 25 novembre** |
| Rôles | **JUNIOR** : maintenance, export, configuration · **OWEN** : restauration, adresses · **NZIKO** : comptages, tests, feu vert |
| Fichiers sur R2 | **ne bougent pas** : photos et pièces d'identité restent dans les mêmes buckets |

Les scripts sont dans `ops/transfert/`. Ils lisent `.env.prod` comme `deploy.sh`. Sur les deux serveurs, `BELIVAY_COMPOSE=docker-compose.reel.yml` désigne le site réel.

| Script | Rôle |
|---|---|
| `maintenance.sh on\|off\|etat` | Fermer et rouvrir le site : nginx répond 503 et affiche la page de maintenance. Rien à redémarrer. |
| `exporter.sh` | Exporter la base, avec son empreinte et le comptage de chaque table. **Refuse si le site n'est pas en maintenance.** |
| `restaurer.sh <export> [base]` | Restaurer l'export. **Refuse si l'empreinte ne correspond pas ou si la base cible n'est pas vide.** |
| `comparer.sh <comptes export> <comptes restaurés>` | Comparer table par table. Code 0 = identiques, code 1 = écart. |

## Avant le jour J

| Quand | Qui | Quoi |
|---|---|---|
| lun. 16 | JUNIOR | Faire valider cette procédure par NZIKO dans le groupe (T14). |
| mar. 17 | JUNIOR + OWEN | **Répétition complète (T15)** : voir plus bas. Noter la durée de chaque étape dans le tableau final. |
| mar. 17 | JUNIOR | **Prévenir les inscrits (T16)** : message plus bas. |
| mar. 17 | OWEN | **DNS à 5 minutes (T17)** : durée de cache (TTL) des adresses du site réel ramenée à 300 s (`api`, `seller`, `admin`, `relay`, `driver`, `delivery`, `shop`). |
| mar. 17 | OWEN | MAIN 1 prêt pour le site réel : code déployé avec `BELIVAY_COMPOSE=docker-compose.reel.yml`, base réelle **vide**, certificat qui couvre les adresses du site réel (`ops/SITE-REEL.md`). La vitrine reste servie jusqu'au 14/12. |
| mer. 18, avant 22 h | tous | Même version du code sur MAIN 1 et MAIN 2 (`git log -1` identique) : l'export se restaure tel quel, sans migration. |

### Répétition (T15)

> « Copier MAIN 2 et la restaurer dans une base distincte sur MAIN 1, sans toucher aux adresses ni à la vitrine. »

```sh
# MAIN 2 — pendant le fonctionnement normal : la copie n'a pas besoin d'être figée pour une répétition
ops/transfert/exporter.sh --sans-maintenance
scp /var/backups/belivay/transfert/transfert_* <utilisateur>@<MAIN 1>:/var/backups/belivay/transfert/

# MAIN 1 — dans une base À PART : la base réelle, les adresses et la vitrine ne sont pas touchées
ops/transfert/restaurer.sh /var/backups/belivay/transfert/transfert_<date>.dump belivay_repetition
ops/transfert/comparer.sh /var/backups/belivay/transfert/transfert_<date>.comptes \
                          /var/backups/belivay/transfert/transfert_<date>.dump.comptes-restaures
# Puis retirer la base de répétition :
docker compose -f docker-compose.reel.yml --env-file .env.prod exec -T postgres dropdb -U <POSTGRES_USER> belivay_repetition
```

Chronométrer chaque étape, corriger chaque anomalie et mettre ce document à jour. **Le jour du transfert, aucune étape ne doit être nouvelle.**

Répétition sur un poste de développement, le 2026-11-09 : export (67 s, 207 tables) → restauration dans une base à part → comparaison « identiques ». Les garde-fous ont tous fonctionné :

- refus d'exporter sans maintenance ;
- refus de restaurer dans une base non vide ;
- écart signalé quand un comptage diffère.

### Message aux inscrits (T16)

> **BelivaY — maintenance mercredi 18 novembre**
> Nous déplaçons BelivaY sur un serveur plus puissant. Le site et les applications seront indisponibles le **mercredi 18 novembre de 22 h à minuit environ**. Vos comptes, boutiques, produits et commandes sont conservés : il n'y a rien à faire de votre côté. Merci de votre confiance.
> *BelivaY — maintenance on Wednesday 18 November, 10 pm to about midnight. Your accounts, shops and orders are kept; nothing to do on your side.*

Envoyer le message aux vendeurs, aux points relais et aux entreprises inscrits, et le confirmer dans le groupe : « chaque inscrit a reçu le message ».

## Le transfert, étape par étape (mer. 18)

| # | Heure | Qui | Où | Commande / geste | Durée (répétition) |
|---|---|---|---|---|---|
| 1 | 22:00 | JUNIOR | MAIN 2 | `ops/transfert/maintenance.sh on`, puis vérifier dans un navigateur : la page de maintenance s'affiche sur seller., admin., api.… | |
| 2 | 22:05 | JUNIOR | MAIN 2 | `ops/transfert/exporter.sh`, puis copier l'export **et la configuration** sur MAIN 1 : `scp /var/backups/belivay/transfert/transfert_* …` (la configuration, ce sont les réglages GitHub de l'environnement du site réel, déjà repris pour MAIN 1). | |
| 3 | | OWEN | MAIN 1 | `ops/transfert/restaurer.sh /var/backups/belivay/transfert/transfert_<date>.dump` (base réelle de `.env.prod`, **vide**) | |
| 4 | | NZIKO | MAIN 1 | `ops/transfert/comparer.sh …comptes …dump.comptes-restaures`, qui doit afficher **« identiques »**. Faire une capture. | |
| 5 | | OWEN | DNS | Faire pointer les adresses du site réel vers l'IP de MAIN 1 (TTL à 300 s : visible en 5 minutes). | |
| 6 | | NZIKO | navigateur | Tests : **connexion vendeur**, **connexion administration**, **affichage d'un produit**. Onglet Réseau : tous les appels vont vers `api.belivay.com` (`ops/CONTROLE-APPELS.md`). | |
| 7 | | OWEN | MAIN 1 | **Réouverture** : `ops/transfert/maintenance.sh off` sur MAIN 1, si et seulement si 4 et 6 sont bons. Annoncer la réouverture dans le groupe. | |

Les fichiers sur R2 ne bougent pas : MAIN 1 utilise les mêmes buckets (`AWS_*`, `BACKUP_R2_*`).

Vérifier que la maintenance n'est **pas** active sur MAIN 1 avant le basculement des adresses, et qu'elle reste active sur MAIN 2.

## Retour arrière

> « Si un comptage diffère ou si un test échoue, les adresses restent sur MAIN 2, le site rouvre sur MAIN 2 et une nouvelle tentative a lieu le mercredi 25. »

1. **Ne pas** basculer les adresses. Si elles ont déjà été basculées, les remettre sur l'IP de MAIN 2 : 5 minutes de cache.
2. Sur MAIN 2 : `ops/transfert/maintenance.sh off`. Le site rouvre sur MAIN 2, avec ses données intactes : l'export n'a rien modifié.
3. Sur MAIN 1, vider la base réelle avant la prochaine tentative, puisque `restaurer.sh` exige une base vide. Supprimer puis recréer la base, après accord de NZIKO.
4. Noter la cause de l'écart dans le groupe, corriger, et refaire une répétition avant le mercredi 25.

**Pendant toute l'opération, MAIN 2 n'est jamais modifié** : il ne fait qu'exporter. C'est ce qui rend le retour arrière immédiat.

## Après le transfert

- **Une semaine sans modification sur MAIN 2** : le retour arrière reste possible jusque-là. Ensuite, MAIN 2 devient le serveur de test (T20).
- Sauvegardes : sur MAIN 1, la sauvegarde de la nuit (`backup.sh`) et sa copie sur R2 tournent (`ops/sauvegarde/LISEZMOI.md`, étape E). Faire un test de restauration (étape F) dans la semaine.
- Retirer les exports du dossier `/var/backups/belivay/transfert/` des deux serveurs une fois la semaine écoulée : ils contiennent toutes les données réelles.

## Durées mesurées

| Étape | Répétition (mar. 17) | Transfert (mer. 18) |
|---|---|---|
| Export | | |
| Copie vers MAIN 1 | | |
| Restauration | | |
| Comparaison | | |
| Bascule des adresses (visible) | | |
| Tests | | |
| **Total, maintenance comprise** | | |
