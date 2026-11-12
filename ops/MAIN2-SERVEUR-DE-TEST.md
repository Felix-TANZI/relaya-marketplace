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

3. **Adresses du serveur de test (C02 de la v1.8).** MAIN 2 répond sous ses propres adresses ; plus aucun test sous les adresses du site réel. Les noms de nginx viennent du réglage `BELIVAY_DOMAINE` (modèle `nginx/reel.conf.template`).

   | Adresse de test | Pour |
   |---|---|
   | `api.test.belivay.com` | le back-end |
   | `shop.test.belivay.com` | l'espace client |
   | `seller.test.belivay.com` | l'espace vendeur |
   | `admin.test.belivay.com` | l'administration |
   | `relay.test.belivay.com` | le point relais |
   | `driver.test.belivay.com` | le livreur |
   | `delivery.test.belivay.com` | l'entreprise de livraison |

   - **Cloudflare** (OWEN) : ces sept noms en enregistrements A vers l'IP de MAIN 2 (nuage gris le temps du certificat). Pour tester la bascule de belivay.com et les redirections (T21, T22) : ajouter `test.belivay.com`, `www.test.belivay.com`, et `boutique.`, `vendeur.`, `relais.`, `livreur.`, `livraison.`, `api-demo.test.belivay.com`.
   - **Certificat**, sur MAIN 2, nommé comme le domaine :

     ```sh
     docker run --rm -p 80:80 -v "$PWD/certbot/conf:/etc/letsencrypt" certbot/certbot certonly --standalone        --cert-name test.belivay.com -d api.test.belivay.com -d shop.test.belivay.com -d seller.test.belivay.com        -d admin.test.belivay.com -d relay.test.belivay.com -d driver.test.belivay.com -d delivery.test.belivay.com
     ```

   - **Variables de « Belivay Test »** : `BELIVAY_DOMAINE` = `test.belivay.com` ; `ALLOWED_HOSTS` = `api.test.belivay.com` ; `CORS_ALLOWED_ORIGINS` et `CSRF_TRUSTED_ORIGINS` = les six portails en `https://….test.belivay.com` ; `VITE_API_URL` = `https://api.test.belivay.com` ; `VITE_SITE_URL` et `FRONTEND_URL` = `https://shop.test.belivay.com`.
   - **Rien à changer pour la production** : sans `BELIVAY_DOMAINE` (ou avec `belivay.com`), nginx produit exactement la configuration d'avant (vérifié : identique à l'ancienne `nginx/reel.conf.template`, hors commentaires).
   - `ops/lancement/activer.sh` prend lui aussi le domaine du serveur : sur MAIN 2, `activer.sh belivay-com` sert `test.belivay.com` avec le certificat `test.belivay.com`.

4. **Activer la chaîne** : variable de dépôt `MAIN2_ACTIF` = `1` (Settings > Secrets and variables > Actions > **Variables**, onglet *Repository*).

5. **Contrôle** : pousser un petit commit sur `main`, puis vérifier dans l'onglet *Actions* que « CD - Chaîne MAIN 2 puis MAIN 1 » déploie MAIN 2, puis MAIN 1. Envoyer la capture : **T20 est terminée**.

## Revenir en arrière

Vider `MAIN2_ACTIF` : la production se déploie de nouveau seule, sans passer par MAIN 2. Rien d'autre à défaire.

## Déployer un seul serveur à la main

Onglet *Actions* > « CD - Déploiement Production » > *Run workflow* > choisir « Belivay Test » ou « Belivay Prod ».
