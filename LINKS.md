# 🔗 Belivay - Liens Utiles

Guide complet de tous les liens et endpoints disponibles dans l'application Belivay.

---

## 📑 Table des Matières

- [Environnement Local](#-environnement-local)
- [API Backend](#-api-backend)
- [Base de Données](#%EF%B8%8F-base-de-données)
- [Production](#-production)
- [Credentials](#-credentials)

---

## 🖥️ Environnement Local

### Frontend React (Port 5173)

#### Pages Publiques
| URL | Description |
|-----|-------------|
| http://localhost:5173/ | Page d'accueil |
| http://localhost:5173/catalog | Catalogue produits |
| http://localhost:5173/product/:id | Détail produit |
| http://localhost:5173/cart | Panier d'achat |
| http://localhost:5173/checkout | Paiement |
| http://localhost:5173/login | Connexion |
| http://localhost:5173/register | Inscription |
| http://localhost:5173/help | Aide |
| http://localhost:5173/contact | Contact |

#### Pages Utilisateur (Authentifié)
| URL | Description |
|-----|-------------|
| http://localhost:5173/profile | Profil utilisateur |
| http://localhost:5173/orders | Historique commandes |
| http://localhost:5173/orders/:id | Détail commande |

#### Espace Vendeur
| URL | Description |
|-----|-------------|
| http://localhost:5173/become-seller | Devenir vendeur |
| http://localhost:5173/seller/dashboard | Dashboard vendeur |
| http://localhost:5173/seller/products/new | Ajouter produit |
| http://localhost:5173/seller/products/:id/edit | Modifier produit |
| http://localhost:5173/seller/orders | Commandes vendeur |
| http://localhost:5173/seller/orders/:id | Détail commande vendeur |

#### Espace Admin
| URL | Description |
|-----|-------------|
| http://localhost:5173/admin | Redirect → dashboard |
| http://localhost:5173/admin/dashboard | Dashboard admin |
| http://localhost:5173/admin/products | Gestion produits |
| http://localhost:5173/admin/orders | Gestion commandes |
| http://localhost:5173/admin/orders/:id | Détail commande |
| http://localhost:5173/admin/users | Gestion utilisateurs |
| http://localhost:5173/admin/users/:id | Détail utilisateur |
| http://localhost:5173/admin/vendors | Gestion vendeurs |
| http://localhost:5173/admin/disputes | Gestion litiges |
| http://localhost:5173/admin/disputes/:id | Détail litige |
| http://localhost:5173/admin/settings | Paramètres |

---

## 🔧 API Backend

### Documentation
| URL | Description |
|-----|-------------|
| http://localhost:8000/api/docs/ | Swagger UI (Interactive) |
| http://localhost:8000/api/schema/ | OpenAPI Schema JSON |
| http://localhost:8000/admin/ | Django Admin Interface |

### Endpoints API

#### Authentification (`/api/auth/`)
| Endpoint | Méthode | Description | Auth |
|----------|---------|-------------|------|
| `/api/auth/register/` | POST | Inscription | ❌ |
| `/api/auth/login/` | POST | Connexion | ❌ |
| `/api/auth/logout/` | POST | Déconnexion | ✅ |
| `/api/auth/me/` | GET | Info utilisateur | ✅ |
| `/api/auth/refresh/` | POST | Refresh token | ✅ |
| `/api/auth/password/change/` | POST | Changer mot de passe | ✅ |
| `/api/auth/password/reset/` | POST | Reset mot de passe | ❌ |

#### Catalogue (`/api/catalog/`)
| Endpoint | Méthode | Description | Auth |
|----------|---------|-------------|------|
| `/api/catalog/products/` | GET | Liste produits | ❌ |
| `/api/catalog/products/{id}/` | GET | Détail produit | ❌ |
| `/api/catalog/products/{id}/similar/` | GET | Produits similaires | ❌ |
| `/api/catalog/categories/` | GET | Liste catégories | ❌ |
| `/api/catalog/categories/{id}/` | GET | Détail catégorie | ❌ |

#### Commandes (`/api/orders/`)
| Endpoint | Méthode | Description | Auth |
|----------|---------|-------------|------|
| `/api/orders/` | GET | Liste commandes user | ✅ |
| `/api/orders/` | POST | Créer commande | ✅ |
| `/api/orders/{id}/` | GET | Détail commande | ✅ |
| `/api/orders/{id}/cancel/` | POST | Annuler commande | ✅ |

#### Vendeurs (`/api/vendors/`)
| Endpoint | Méthode | Description | Auth |
|----------|---------|-------------|------|
| `/api/vendors/apply/` | POST | Devenir vendeur | ✅ |
| `/api/vendors/profile/` | GET | Profil vendeur | ✅ |
| `/api/vendors/stats/` | GET | Statistiques vendeur | ✅ |
| `/api/vendors/products/` | GET | Liste produits vendeur | ✅ |
| `/api/vendors/products/` | POST | Créer produit | ✅ |
| `/api/vendors/products/{id}/` | GET, PUT, DELETE | CRUD produit | ✅ |
| `/api/vendors/products/{id}/images/` | POST | Upload image | ✅ |
| `/api/vendors/products/{product_id}/images/{image_id}/` | DELETE | Supprimer image | ✅ |
| `/api/vendors/products/{product_id}/images/{image_id}/set-primary/` | POST | Définir image principale | ✅ |
| `/api/vendors/orders/` | GET | Commandes vendeur | ✅ |
| `/api/vendors/orders/{id}/` | GET | Détail commande | ✅ |
| `/api/vendors/orders/{id}/status/` | PATCH | Mettre à jour statut | ✅ |

#### Paiements (`/api/payments/`)
| Endpoint | Méthode | Description | Auth |
|----------|---------|-------------|------|
| `/api/payments/initiate/` | POST | Initier paiement | ✅ |
| `/api/payments/verify/` | POST | Vérifier paiement | ✅ |
| `/api/payments/webhook/mtn/` | POST | Webhook MTN MoMo | ❌ |
| `/api/payments/webhook/orange/` | POST | Webhook Orange Money | ❌ |

#### Livraison (`/api/shipping/`)
| Endpoint | Méthode | Description | Auth |
|----------|---------|-------------|------|
| `/api/shipping/rates/` | GET | Tarifs livraison | ❌ |
| `/api/shipping/track/{tracking_number}/` | GET | Suivi colis | ❌ |

#### Contact (`/api/contact/`)
| Endpoint | Méthode | Description | Auth |
|----------|---------|-------------|------|
| `/api/contact/` | POST | Envoyer message | ❌ |

### Fichiers Statiques
| URL | Description |
|-----|-------------|
| http://localhost:8000/static/ | CSS, JS, images admin |
| http://localhost:8000/media/ | Images produits uploadées |

---

## 🗄️ Base de Données

### PostgreSQL
```
Host: localhost
Port: 5433
Database: relaya
User: relaya
Password: relaya
```

**Connexion :**
```bash
docker exec -it relaya_postgres psql -U relaya -d relaya
```

### Redis
```
Host: localhost
Port: 6379
```

**Connexion :**
```bash
docker exec -it relaya_redis redis-cli
```

---

## 🌐 Production

### URLs Principales
| URL | Description |
|-----|-------------|
| https://belivay.com | Site web |
| https://belivay.com/django-admin/ | Django Admin |
| https://belivay.com/api/docs/ | Documentation API |
| https://belivay.com/api/ | API Root |

### Même Structure Endpoints
Tous les endpoints listés ci-dessus fonctionnent en production avec `https://belivay.com` comme base URL.

---

## 🔐 Credentials

### Django Admin (Local)
```
À créer avec : docker exec -it relaya_backend python manage.py createsuperuser

Username: [ton choix]
Email: [ton email]
Password: [ton mot de passe]
```

### Base de Données (Local)
```
User: relaya
Password: relaya
Database: relaya
```

### Production
> ⚠️ **NE JAMAIS COMMIT LES CREDENTIALS DE PRODUCTION**
> 
> Stockés dans `.env.prod` (git-ignored)

---

## 📊 Ports Utilisés

| Service | Port Local | Port Container |
|---------|------------|----------------|
| Frontend | 5173 | 5173 |
| Backend | 8000 | 8000 |
| PostgreSQL | 5433 | 5432 |
| Redis | 6379 | 6379 |
| Nginx (Prod) | 80, 443 | 80, 443 |

---

## 🔄 Workflow API

### Exemple : Créer une Commande
```bash
# 1. Login
POST http://localhost:8000/api/auth/login/
{
  "username": "user",
  "password": "pass"
}
→ Récupère access_token

# 2. Créer commande
POST http://localhost:8000/api/orders/
Headers: Authorization: Bearer {access_token}
{
  "items": [...],
  "shipping_address": {...}
}

# 3. Initier paiement
POST http://localhost:8000/api/payments/initiate/
Headers: Authorization: Bearer {access_token}
{
  "order_id": 123,
  "method": "mtn_momo"
}
```

---

**Dernière mise à jour : 2025-03-11**