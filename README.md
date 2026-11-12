# 🛍️ Belivay - Marketplace Cameroun

Marketplace e-commerce moderne pour le Cameroun avec support multi-vendeurs, paiements mobiles (MTN MoMo / Orange Money) et livraison sécurisée.

[![Production](https://img.shields.io/badge/Production-belivay.com-orange)](https://belivay.com)
[![Django](https://img.shields.io/badge/Django-5.1-green)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](https://www.docker.com/)

---

## 📋 Table des Matières

- [Technologies](#-technologies)
- [Fonctionnalités](#-fonctionnalités)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#%EF%B8%8F-configuration)
- [Lancement](#-lancement)
- [Structure du Projet](#-structure-du-projet)
- [API Documentation](#-api-documentation)
- [Déploiement](#-déploiement)
- [Commandes Utiles](#-commandes-utiles)
- [Contribution](#-contribution)

---

## 🚀 Technologies

### Backend
- **Django 5.1** - Framework Python
- **Django REST Framework** - API REST
- **PostgreSQL 16** - Base de données
- **Redis 7** - Cache & sessions
- **JWT** - Authentification
- **Swagger/OpenAPI** - Documentation API
- **Gunicorn** - Serveur WSGI production

### Frontend
- **React 18** - Framework JavaScript
- **TypeScript** - Typage statique
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **i18next** - Internationalisation (FR/EN)

### Infrastructure
- **Docker & Docker Compose** - Containerisation
- **Nginx** - Reverse proxy
- **Let's Encrypt** - Certificats SSL
- **Hetzner** - Hébergement

---

## ✨ Fonctionnalités

### Pour les Clients
- ✅ Navigation catalogue produits avec filtres avancés
- ✅ Recherche intelligente
- ✅ Panier d'achat persistant
- ✅ Système de commande complet
- ✅ Historique des commandes
- ✅ Paiements sécurisés (MTN MoMo / Orange Money)
- ✅ Suivi de livraison
- ✅ Support multilingue (FR/EN)
- ✅ Mode sombre/clair

### Pour les Vendeurs
- ✅ Dashboard vendeur
- ✅ Gestion des produits (CRUD)
- ✅ Upload d'images produits
- ✅ Gestion des commandes
- ✅ Statistiques de vente
- ✅ KYC (Know Your Customer)

### Pour les Administrateurs
- ✅ Dashboard admin complet
- ✅ Gestion utilisateurs
- ✅ Gestion vendeurs
- ✅ Modération produits
- ✅ Gestion litiges
- ✅ Statistiques globales
- ✅ Paramètres plateforme

---

## 📦 Prérequis

- **Docker Desktop** >= 20.10
- **Git**
- **VS Code** (recommandé)
- **Connexion internet stable** (pour build initial)

### Ports Requis (dev)
- `5173` - Frontend React
- `8000` - Backend Django
- `5433` - PostgreSQL
- `6379` - Redis

---

## 🔧 Installation

### 1. Cloner le Projet
```bash
git clone https://github.com/Felix-TANZI/relaya-marketplace.git
cd relaya-marketplace
```

### 2. Créer les Fichiers d'Environnement

#### **À la racine : `.env`**
```bash
# GENERAL
ENV=dev
DJANGO_DEBUG=1
DJANGO_SECRET_KEY=

# DB
POSTGRES_DB=relaya
POSTGRES_USER=relaya
POSTGRES_PASSWORD=relaya
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# REDIS
REDIS_HOST=redis
REDIS_PORT=6379

# URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000

# EMAIL CONFIGURATION
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=votre-email@gmail.com
EMAIL_HOST_PASSWORD=votre-app-password
DEFAULT_FROM_EMAIL=Belivay <votre-email@gmail.com>
```

#### **Dans `frontend/.env`**
```bash
# URL de l'API Backend
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Placer les Images (Optionnel)

Place tes images PNG dans `frontend/public/images/` :
```
frontend/public/images/
├── hero-woman.png
├── feature-shopping.png
├── feature-mobile.png
├── feature-delivery.png
├── category-phones.png
├── category-electronics.png
├── category-fashion.png
├── category-home.png
├── delivery-man.png
├── icon-security.png
├── icon-verified.png
├── icon-truck.png
└── icon-support.png
```

---

## ⚙️ Configuration

### Variables d'Environnement

| Variable | Description | Dev | Production |
|----------|-------------|-----|------------|
| `ENV` | Environnement | `dev` | `production` |
| `DJANGO_DEBUG` | Mode debug Django | `1` | `0` |
| `DJANGO_SECRET_KEY` | Clé secrète Django | Dev key | Strong key (50+ chars) |
| `POSTGRES_DB` | Nom BDD | `relaya` | `relaya_prod` |
| `POSTGRES_USER` | User BDD | `relaya` | `relaya_user` |
| `POSTGRES_PASSWORD` | Password BDD | `relaya` | Strong password |
| `FRONTEND_URL` | URL frontend | `http://localhost:5173` | `https://belivay.com` |
| `BACKEND_URL` | URL backend | `http://localhost:8000` | `https://belivay.com` |

---

## 🎯 Lancement

### Première Fois
```bash
# 1. Build et démarrer tous les services
docker-compose up --build

# 2. Dans un NOUVEAU terminal : Créer un superuser
docker exec -it relaya_backend python manage.py createsuperuser

# 3. Accéder à l'application
# Frontend : http://localhost:5173
# Backend API : http://localhost:8000/api/docs/
# Django Admin : http://localhost:8000/django-admin/
```

### Démarrages Suivants
```bash
# Démarrer
docker-compose up

# Ou en arrière-plan
docker-compose up -d

# Arrêter
docker-compose down
```

---

## 📂 Structure du Projet
```
relaya-marketplace/
├── backend/                    # Django Backend
│   ├── apps/                   # Applications Django
│   │   ├── accounts/          # Authentification, utilisateurs
│   │   ├── catalog/           # Produits, catégories
│   │   ├── orders/            # Commandes
│   │   ├── payments/          # Paiements (MTN/Orange)
│   │   ├── shipping/          # Livraison
│   │   ├── vendors/           # Gestion vendeurs
│   │   └── contact/           # Contact support
│   ├── relaya/                # Config projet Django
│   │   └── settings/          # Settings (base.py, dev.py, prod.py)
│   ├── Dockerfile             # Dev
│   ├── Dockerfile.prod        # Production
│   └── requirements.txt       # Dépendances Python
│
├── frontend/                   # React Frontend
│   ├── public/                # Fichiers statiques
│   │   └── images/           # Images du site
│   ├── src/
│   │   ├── app/              # Config app (layout, routes)
│   │   ├── components/       # Composants réutilisables
│   │   ├── context/          # React Context (Auth, Cart, Theme, Toast)
│   │   ├── features/         # Features (home, catalog, auth, orders, etc.)
│   │   ├── i18n/             # Traductions FR/EN
│   │   └── services/         # API clients
│   ├── Dockerfile            # Dev
│   ├── Dockerfile.prod       # Production
│   └── package.json          # Dépendances Node
│
├── vitrine/                   # Vitrine de démonstration (six espaces, PR-VITRINE.md)
├── config/                    # Modèles de réglages : vitrine.env.example, reel.env.example
├── ops/                       # Guides et scripts d'exploitation (sauvegardes, transfert, applis…)
├── nginx/                     # nginx.conf (vitrine), reel.conf.template (site réel), maintenance/
├── certbot/                   # Certificats SSL
├── docker-compose.yml         # Dev environment
├── docker-compose.prod.yml    # Production : vitrine
├── docker-compose.reel.yml    # Production : site réel seul
├── deploy.sh                  # Script déploiement
├── .env                       # Variables d'environnement (racine)
├── .env.prod                  # Variables prod (racine)
└── README.md                  # Ce fichier
```

---

## 📚 API Documentation

### Accès Local

- **Swagger UI** : http://localhost:8000/api/docs/
- **OpenAPI Schema** : http://localhost:8000/api/schema/

### Endpoints Principaux

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/auth/login/` | POST | Connexion |
| `/api/auth/register/` | POST | Inscription |
| `/api/auth/me/` | GET | Informations utilisateur |
| `/api/catalog/products/` | GET | Liste produits |
| `/api/catalog/products/{id}/` | GET | Détail produit |
| `/api/catalog/categories/` | GET | Liste catégories |
| `/api/orders/` | GET, POST | Gestion commandes |
| `/api/vendors/apply/` | POST | Devenir vendeur |
| `/api/vendors/products/` | GET, POST | Produits vendeur |
| `/api/payments/initiate/` | POST | Initier paiement |
| `/api/shipping/rates/` | GET | Tarifs livraison |

**Voir `LINKS.md` pour la liste complète des endpoints.**

---

## 🚀 Déploiement : vitrine ou site réel

Un seul dépôt déploie deux versions qui ne se mélangent jamais (ordre de mission DEV-SRV-01, règles R1 à R8). **Seule la configuration change.**

| | Vitrine (démonstration) | Site réel |
|---|---|---|
| Docker | `docker-compose.prod.yml` | `docker-compose.reel.yml` |
| nginx | `nginx/nginx.conf` | `nginx/reel.conf.template` |
| Écrans | `vitrine/` (six espaces de démonstration) | `frontend/` (six portails, un par `VITE_PORTAL_ROLE`) |
| API | `belivay.com/api`, puis `api-demo.belivay.com` | `api.belivay.com` |
| Données | jeux de démonstration (`charger_demonstration`) | réelles, référence seule à la création (`charger_reference`) |
| Modèle de réglages | `config/vitrine.env.example` | `config/reel.env.example` |
| Sélecteur | `BELIVAY_COMPOSE` vide | `BELIVAY_COMPOSE=docker-compose.reel.yml` |

### Comment un déploiement se fait

1. Les réglages se renseignent dans **GitHub → Settings → Environments** (environnement du serveur), d'après le modèle `config/*.env.example`. **Rien ne s'édite à la main sur le serveur.**
2. Une PR est fusionnée dans `main`. Le CI (`ci.yml`) doit être vert, puis `deploy.yml` démarre après l'approbation de l'environnement. Il :
   - génère `.env.prod` ;
   - met le serveur sur le commit testé ;
   - lance `deploy.sh`.
3. `deploy.sh` lit `BELIVAY_COMPOSE`. Il :
   - sauvegarde la base (`backup.sh`) ;
   - garde la version en service pour un retour arrière ;
   - construit les images une par une ;
   - bascule ;
   - applique les migrations ;
   - vérifie la santé : `belivay.com` pour la vitrine, `api.belivay.com` pour le site réel ;
   - **revient automatiquement à la version précédente** si la santé échoue.

Un clone propre se déploie dans l'une ou l'autre version en changeant uniquement `BELIVAY_COMPOSE` et les réglages de l'environnement.

### Créer une base neuve

```sh
python manage.py migrate
python manage.py charger_reference        # zones, catégories, plans, configuration — aucun compte, aucune activité
python manage.py createsuperuser          # puis les autres comptes depuis l'admin, rattachés à leurs groupes
python manage.py compter_tables           # « Base vide » : la capture à transmettre (T02)

# Vitrine seulement, jamais sur le site réel :
DONNEES_DEMO_AUTORISEES=1 python manage.py charger_demonstration
```

### Guides d'exploitation (`ops/`)

| Guide | Contenu |
|---|---|
| `ops/SITE-REEL.md` | Adresses du site réel, DNS, certificat, réglages, vérifications |
| `ops/sauvegarde/LISEZMOI.md` | Sauvegardes chiffrées sur R2, test de restauration (T06) |
| `ops/transfert/PROCEDURE-TRANSFERT.md` | Transfert du site réel MAIN 2 → MAIN 1, répétition, retour arrière (T14-T18) |
| `ops/lancement/LANCEMENT-14-DECEMBRE.md` | Lancement public : belivay.com, CamPay en production, retrait de la vitrine (T21-T25) |
| `ops/APPLIS-MOBILES.md` | Construire les six applis vers la bonne API (T12) |
| `ops/CONTROLE-APPELS.md` | Vérifier que chaque écran n'appelle que la bonne API (T10) |

### Branches

- `main` : seule branche déployée. **Elle est protégée** : on n'y pousse jamais directement, elle reçoit des PR relues avec le CI vert.
- `dev` : branche d'intégration. Le travail arrive par PR depuis des branches de travail (`mission/…`, `feat/…`, `fix/…`).

Pour protéger `main` (propriétaire du dépôt) : **Settings → Branches → Add branch ruleset**, cible `main`, puis cocher :

- *Require a pull request before merging* ;
- *Require status checks to pass* : `Backend (Django)`, `Frontend (React / Vite)`, `Gitleaks` ;
- *Block force pushes*.

## 🛠️ Commandes Utiles

### Docker
```bash
# Voir les conteneurs actifs
docker-compose ps

# Logs
docker-compose logs -f                    # Tous les services
docker-compose logs -f backend            # Backend uniquement
docker-compose logs -f frontend           # Frontend uniquement

# Redémarrer un service
docker-compose restart backend
docker-compose restart frontend

# Rebuild après changement dépendances
docker-compose up --build

# Nettoyer tout
docker-compose down -v                    # ⚠️ Supprime la BDD !
```

### Django (Backend)
```bash
# Shell Django
docker exec -it relaya_backend python manage.py shell

# Migrations
docker exec -it relaya_backend python manage.py makemigrations
docker exec -it relaya_backend python manage.py migrate

# Créer superuser
docker exec -it relaya_backend python manage.py createsuperuser

# Collecter fichiers statiques
docker exec -it relaya_backend python manage.py collectstatic

# Accéder au conteneur
docker exec -it relaya_backend sh
```

### PostgreSQL
```bash
# Connexion psql
docker exec -it relaya_postgres psql -U relaya -d relaya

# Backup
docker exec relaya_postgres pg_dump -U relaya relaya > backup.sql

# Restore
docker exec -i relaya_postgres psql -U relaya relaya < backup.sql
```

### Redis
```bash
# Connexion Redis CLI
docker exec -it relaya_redis redis-cli

# Vider le cache
docker exec -it relaya_redis redis-cli FLUSHALL
```

---

## 🤝 Contribution

### Workflow Git
```bash
# 1. Créer une branche
git checkout -b feature/ma-fonctionnalite

# 2. Faire des commits
git add .
git commit -m "feat: ajouter fonctionnalité X"

# 3. Pousser
git push origin feature/ma-fonctionnalite

# 4. Créer une Pull Request sur GitHub
```

### Standards de Code

- **Backend** : PEP 8 (Python)
- **Frontend** : ESLint + Prettier
- **Commits** : Convention Conventional Commits
  - `feat:` nouvelle fonctionnalité
  - `fix:` correction bug
  - `docs:` documentation
  - `style:` formatting
  - `refactor:` refactoring
  - `test:` ajout tests
  - `chore:` tâches maintenance

---

## 📞 Support

- **Email** : tanzifelix@gmail.com
- **GitHub Issues** : [Créer un ticket](https://github.com/Felix-TANZI/relaya-marketplace/issues)
- **Documentation API** : https://belivay.com/api/docs/

---

## 📄 Licence

Propriétaire - © 2025 Belivay. Tous droits réservés.

---

## 👥 Équipe

- **Développement** : Felix TANZI
- **Design** : Felix TANZI
- **Product Owner** : 

---

## 🗺️ Roadmap

- [x] Authentification JWT
- [x] Catalogue produits
- [x] Panier d'achat
- [x] Système de commandes
- [x] Espace vendeur
- [x] Dashboard admin
- [ ] Paiements mobiles (MTN/Orange) - En cours
- [ ] Notifications push
- [ ] Application mobile
- [ ] IA - Recommandations produits
- [ ] Chat vendeur-client
- [ ] Programme fidélité