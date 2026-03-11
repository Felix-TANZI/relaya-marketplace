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
DJANGO_SECRET_KEY=relaya_dev_super_secret_key_2025_very_long_and_secure_12345678

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
# Django Admin : http://localhost:8000/admin/
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
├── nginx/                     # Config Nginx production
├── certbot/                   # Certificats SSL
├── docker-compose.yml         # Dev environment
├── docker-compose.prod.yml    # Production environment
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

## 🚀 Déploiement

### Production
```bash
# 1. Configuration
cp .env .env.prod
# Éditer .env.prod avec les vraies valeurs

# 2. Déploiement
./deploy.sh

# Ou manuellement :
docker-compose -f docker-compose.prod.yml up --build -d
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### SSL (Let's Encrypt)
```bash
# Obtenir certificat
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d belivay.com -d www.belivay.com

# Renouvellement automatique (via cron dans le conteneur certbot)
```

---

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