# Site réel BelivaY : adresses et mise en service (DEV-SRV-01, T04 / T05 / T11)

Le même dépôt déploie deux choses différentes. Seule la configuration change :

| | Vitrine (démonstration) | Site réel |
|---|---|---|
| Fichier Docker | `docker-compose.prod.yml` (par défaut) | `docker-compose.reel.yml` |
| nginx | `nginx/nginx.conf` | `nginx/reel.conf` |
| Réglage dans `.env.prod` | `BELIVAY_COMPOSE` vide | `BELIVAY_COMPOSE=docker-compose.reel.yml` |
| Contenu | vitrine + comptes Neon + ancien site | API + 6 portails, **sans vitrine** (règles R1, R2) |

`deploy.sh` et `backup.sh` lisent `BELIVAY_COMPOSE` et choisissent le bon fichier. Sans ce réglage, ils font exactement ce qu'ils faisaient avant.

## Les adresses du site réel

| Adresse | Rôle |
|---|---|
| `api.belivay.com` | **La seule porte vers le serveur** : `/api/`, `/django-admin/`, `/static/`, `/media/` |
| `seller.belivay.com` | espace vendeur |
| `admin.belivay.com` | administration |
| `relay.belivay.com` | point relais |
| `driver.belivay.com` | livreur |
| `delivery.belivay.com` | entreprise de livraison |
| `shop.belivay.com` | espace client ; `belivay.com` le 14 décembre (T21) |

- **Comment les portails parlent au serveur.** Tous appellent `https://api.belivay.com`. Les écrans y sont construits avec `VITE_API_URL=https://api.belivay.com`. C'est la décision du porteur du 2026-11-08, conforme à T10 : « le site réel n'appelle que api.belivay.com ».
- **Anciennes adresses.** Elles sont redirigées pour toujours, en gardant le reste du lien :
  - `courier.belivay.com` → `driver.belivay.com` ;
  - `relay-point.belivay.com` → `relay.belivay.com` ;
  - `delivery-org.belivay.com` → `delivery.belivay.com`.

## Mise en service sur un serveur (MAIN 2)

### 1. DNS (Cloudflare ou le registrar)

Créer un enregistrement **A** vers l'adresse IP de MAIN 2 pour :

- les 7 adresses : `api`, `seller`, `admin`, `relay`, `driver`, `delivery`, `shop` ;
- les 3 anciennes, le jour où elles quitteront MAIN 1 : `courier`, `relay-point`, `delivery-org`.

Avec Cloudflare, laisser le nuage **gris** (« DNS only ») le temps d'obtenir le certificat.

### 2. Certificat HTTPS (une seule fois sur le serveur)

Un seul certificat, nommé `belivay.com`, doit couvrir toutes les adresses servies. C'est celui que lit `nginx/reel.conf`. Sur le serveur, avant le premier démarrage de nginx :

```sh
docker run --rm -p 80:80 -v "$PWD/certbot/conf:/etc/letsencrypt" certbot/certbot certonly --standalone \
  --cert-name belivay.com -d api.belivay.com -d shop.belivay.com -d seller.belivay.com -d admin.belivay.com \
  -d relay.belivay.com -d driver.belivay.com -d delivery.belivay.com
```

Ajouter `-d courier.belivay.com -d relay-point.belivay.com -d delivery-org.belivay.com` quand ces adresses pointeront sur ce serveur. Le service `certbot` du compose renouvelle ensuite le certificat seul.

### 3. Réglages GitHub (environnement du serveur)

| Nom | Type | Valeur pour le site réel |
|---|---|---|
| `BELIVAY_COMPOSE` | variable | `docker-compose.reel.yml` |
| `ALLOWED_HOSTS` | variable | `api.belivay.com` |
| `CORS_ALLOWED_ORIGINS` | variable | `https://seller.belivay.com,https://admin.belivay.com,https://relay.belivay.com,https://driver.belivay.com,https://delivery.belivay.com,https://shop.belivay.com` |
| `CSRF_TRUSTED_ORIGINS` | variable | `https://api.belivay.com` |
| `VITE_API_URL` | variable | `https://api.belivay.com` (valeur par défaut du compose réel) |
| `VITE_SITE_URL` | variable | `https://shop.belivay.com`, puis `https://belivay.com` le 14/12 |
| `FRONTEND_URL` | variable | `https://shop.belivay.com` : liens des e-mails, plans du site |
| `VITE_SUPPORT_WHATSAPP` | variable, facultative | le numéro WhatsApp du support, en chiffres avec l'indicatif (`2376XXXXXXXX`). Sans elle, celui de `docker-compose.reel.yml`. |
| `DJANGO_SECRET_KEY` | secret | obligatoire : en production, le serveur refuse de démarrer sans elle (R5) |
| `WHATSAPP_VENDOR_APP_URL`, `WHATSAPP_COURIER_APP_URL`, `WHATSAPP_RELAY_APP_URL` | variables, facultatives | par défaut, les nouvelles adresses |

Les applications mobiles (T12) gardent leurs origines propres (`https://localhost`, `capacitor://localhost`). Elles sont déjà autorisées.

### 4. Déployer, puis vérifier (5 minutes)

- `curl -s https://api.belivay.com/api/auth/health/` répond `"status": "ok"`.
- Les six portails s'ouvrent. Dans l'outil de développement du navigateur (onglet **Réseau**), **chaque appel part vers `api.belivay.com`**. C'est le contrôle T10.
- `curl -sI https://courier.belivay.com/x` répond `301` vers `https://driver.belivay.com/x`.
- `curl -s https://api.belivay.com/` répond `404` : seule l'API est servie.

## Ce qui n'est pas encore là

- **Un déploiement automatique vers MAIN 2.** `deploy.yml` déploie un seul serveur, celui de l'environnement GitHub **Belivay Prod**. Il faudra un second environnement, pointant vers MAIN 2, avec ses propres `SSH_HOST` et réglages, et décider quelle branche y part. Ce sera l'objet d'une prochaine étape.
- **La vitrine sous ses adresses françaises** (`boutique`, `vendeur`, `relais`, `livreur`, `livraison`). C'est T08 / T13.
