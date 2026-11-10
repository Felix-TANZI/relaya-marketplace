# MAIN 2, serveur de test (DEV-SRV-01, T20)

> « Après une semaine sans modification (le retour arrière reste possible jusque-là), aligner MAIN 2 sur les versions
> de MAIN 1. ✓ Terminé quand MAIN 2 reçoit en premier chaque nouveau déploiement. »

Après le transfert final (T18, nuit du 18 novembre), le site réel tourne sur MAIN 1. MAIN 2 garde une semaine la copie d'avant le transfert : c'est le **retour arrière**. Ensuite, il devient le serveur de test. Chaque commit qui passe le CI sur `main` y est déployé **d'abord**. MAIN 1 ne reçoit ce commit que si MAIN 2 a réussi, test de santé de `deploy.sh` compris.

## Comment c'est construit

| Fichier | Rôle |
|---|---|
| `.github/workflows/deploy.yml` | Le déploiement, inchangé dans ses étapes. Il sait aussi être appelé pour un environnement GitHub donné (`workflow_call`), et se lancer à la main pour l'un ou l'autre (`workflow_dispatch`). |
| `.github/workflows/deploy-chaine.yml` | Après un CI vert sur `main` : `deploy.yml` pour **« Belivay Test »** (MAIN 2), puis, s'il a réussi, pour **« Belivay Prod »** (MAIN 1). Le même commit part sur les deux serveurs. |
| Variable de dépôt `MAIN2_ACTIF` | Vide : `deploy.yml` déploie seul la production, **comme aujourd'hui**, et la chaîne ne fait rien. À `1` : la chaîne prend le relais, et `deploy.yml` ne se déclenche plus seul sur le CI. |

> Cette procédure s'appuie sur des PR de la même mission : `BELIVAY_COMPOSE` et le site réel (#85), la sauvegarde
> `BACKUP_*` (#83), `charger_reference` et `charger_demonstration` (#84), le transfert et `DONNEES_DEMO_AUTORISEES` (#88).
> Elles doivent être fusionnées avant la mise en route.

## Avant de mettre `MAIN2_ACTIF` à 1 : ne jamais laisser de vraies données sur un serveur de test

Un serveur de test qui garderait la copie de la base réelle **enverrait de vrais messages à de vrais clients** : SMS, WhatsApp, e-mails, rappels de retrait. Avec des clés de production, il pourrait même toucher à l'argent. Dans l'ordre :

1. **Fin du retour arrière** (une semaine après T18, accord de NZIKO) : exporter une dernière fois la base de MAIN 2 pour l'archive (`ops/transfert/exporter.sh`), puis la **remettre à zéro**, comme en T02 :

   ```sh
   docker compose -f docker-compose.reel.yml --env-file .env.prod down
   docker volume rm <projet>_postgres_data
   ./deploy.sh
   docker compose -f docker-compose.reel.yml --env-file .env.prod exec backend python manage.py charger_reference
   ```

   Pour avoir de quoi tester, ajouter ensuite les données de démonstration. Elles ne sont permises que là, avec `DONNEES_DEMO_AUTORISEES=1` dans l'environnement « Belivay Test » :
   `python manage.py charger_demonstration`.

2. **Environnement GitHub « Belivay Test »** (Settings > Environments > New environment). Mêmes noms de secrets et de variables que « Belivay Prod », mais avec **ses propres valeurs** :

   | Réglage | Valeur pour MAIN 2 |
   |---|---|
   | `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `TARGET_PATH` | ceux de MAIN 2 |
   | `BELIVAY_COMPOSE` | `docker-compose.reel.yml` |
   | `DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD`, `PAYMENTS_ENCRYPTION_KEY`, `PAYMENTS_FINGERPRINT_SALT` | **neufs**, jamais ceux de la production |
   | `CAMPAY_TOKEN_LIVE` | **vide**. Le bac à sable seulement (`CAMPAY_TOKEN_SANDBOX`). |
   | Jetons WhatsApp, SMS, e-mail (`WHATSAPP_ACCESS_TOKEN`, `EMAIL_HOST_PASSWORD`…) | **vides**. Les messages restent alors dans le journal du serveur (mode console). |
   | Stockage R2 (`AWS_*`, `AWS_STORAGE_BUCKET_NAME`) | un **seau de test** distinct. Jamais celui des pièces d'identité réelles. |
   | `BACKUP_*` | vides : pas de copie de sauvegarde du serveur de test vers R2 |
   | `DONNEES_DEMO_AUTORISEES`, `COMPTES_DEMO_AUTORISES` | `1` |

   Mettre un **réviseur obligatoire** sur « Belivay Prod » seulement. Sur « Belivay Test », le déploiement part sans attendre.

3. **Adresses du serveur de test.** `nginx/reel.conf` répond aux noms du site réel (`api.belivay.com`, `seller.belivay.com`…), et le DNS de ces noms vise MAIN 1. Pour tester MAIN 2 :
   - **contrôles en ligne de commande** (T21-3, T22) : `curl --resolve api.belivay.com:443:<IP de MAIN 2> https://api.belivay.com/api/auth/health/` ;
   - **essais dans le navigateur** : sur l'ordinateur ou le téléphone du testeur, faire pointer ces noms vers l'IP de MAIN 2 (fichier `hosts`), le temps de l'essai ;
   - **certificat** : comme le DNS vise MAIN 1, il s'obtient par le défi DNS de Cloudflare (`certbot --dns-cloudflare`), pas par le défi HTTP.

   *Si l'équipe préfère des adresses de test propres* (`api.test.belivay.com`…), il faudra rendre les noms de `nginx/reel.conf` réglables : c'est une évolution à demander.

4. **Activer la chaîne** : variable de dépôt `MAIN2_ACTIF` = `1` (Settings > Secrets and variables > Actions > **Variables**, onglet *Repository*).

5. **Contrôle** : pousser un petit commit sur `main`, puis vérifier dans l'onglet *Actions* que « CD - Chaîne MAIN 2 puis MAIN 1 » déploie MAIN 2, puis MAIN 1. Envoyer la capture : **T20 est terminée**.

## Revenir en arrière

Vider `MAIN2_ACTIF` : la production se déploie de nouveau seule, sans passer par MAIN 2. Rien d'autre à défaire.

## Déployer un seul serveur à la main

Onglet *Actions* > « CD - Déploiement Production » > *Run workflow* > choisir « Belivay Test » ou « Belivay Prod ».
