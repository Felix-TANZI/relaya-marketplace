# Espace client — état des lieux et liste des endpoints

Livrable des tâches **D26** (état des lieux de l'interface client) et **D4** (liste des
endpoints), priorité 1 · section A de la feuille de route V2 Élite du 16 octobre 2026.

Établi le 16 octobre 2026 sur la branche `dev`.

---

## D4 — Où est la liste des endpoints

### L'API existante

Le schéma OpenAPI est généré automatiquement depuis le code, donc il ne peut pas mentir
ni vieillir :

| | |
|---|---|
| Liste lisible, à ouvrir dans un navigateur | `/api/docs/` |
| Schéma brut (OpenAPI 3) | `/api/schema/` |
| Nombre d'endpoints couverts | **572** |

Chaque endpoint y porte sa méthode, ses paramètres, le format de sa requête et celui de
sa réponse. C'est la référence pour retirer les *mock data*.

Pour le régénérer en fichier :

```bash
python backend/manage.py spectacular --file schema.yml
```

### CORS

Déjà autorisé, rien à demander :

- `https://belivay.com` et `https://www.belivay.com`
- `http://localhost:5173` à `5179` (développement)
- les origines Capacitor des applications mobiles
- tout domaine ajouté dans la variable d'environnement `CORS_EXTRA_ORIGINS`

En-têtes autorisés en plus des standards : `idempotency-key`, `x-device-id`.
En-têtes exposés : `Retry-After`, `Idempotent-Replayed`.

### Un piège à connaître : deux conventions de chemin coexistent

| Origine | Convention | Exemple |
|---|---|---|
| Routes Relaya | **avec** barre finale | `/api/orders/12/` |
| Routes du kit espace client | **sans** barre finale | `/api/me/adresses` |

Les deux cohabitent sans se masquer. Appeler une route Relaya sans sa barre finale
provoque une redirection, et une redirection perd le corps d'une requête `POST`.

### Pourquoi `/api/docs/` ne montre pas tout

Les routes du kit espace client sont **volontairement retirées** du schéma, voir
`backend/apps/client_core/schema.py` : leurs vues n'ont pas de sérialiseur de réponse et
feraient échouer la génération du schéma entier.

Leur contrat est dans un fichier séparé :
`espace-client-belivay/backend-kit/openapi.yaml` — **186 routes**.

Attention à ce que ce fichier est : il se décrit lui-même comme *« les routes existantes
de relaya-marketplace et toutes les routes à créer »*. **Ce n'est pas une description de
l'existant, c'est un contrat.** La section suivante dit ce qui, dedans, existe vraiment.

---

## D26 — État des lieux

### Le chiffre

Sur les **186 routes** que le site client appelle :

| | Routes | |
|---|---|---|
| Déjà servies par le back-end | **59** | fonctionnent aujourd'hui |
| Absentes du back-end | **127** | le site les appelle, elles répondent 404 |

### Ce que sont ces 127 routes absentes

**Les 127 sont déjà écrites.** Elles vivent dans onze applications Django livrées avec le
kit, dans `espace-client-belivay/backend-kit/apps/`, qui n'ont jamais été copiées dans
`backend/apps/` ni déclarées dans `INSTALLED_APPS`.

Ce n'est donc pas un travail de développement, c'est un travail d'intégration : copier,
installer, migrer, relier, tester.

| Application du kit | Routes | Modèles | Lignes | Migrations | Tâche |
|---|---|---|---|---|---|
| `cart` — panier et commande | 17 | 4 | 1 784 | 1 | D6 · P2 |
| `wallet` — portefeuille | 11 | 6 | 2 134 | 1 | D6 · P2, ouverture D16 · P4 |
| `aftersales` — SAV et litiges | 10 | 6 | 2 221 | 1 | D6 · P2, règles D18 · P3 |
| `messaging` — messagerie | 8 | 6 | 1 482 | 1 | D6 · P2 |
| `pickup` — retrait en relais | 7 | 7 | 1 514 | 1 | D6 · P2 |
| `recus` — reçus | 5 | 1 | 986 | 1 | D6 · P2 |
| `contenus` — pages légales et aide | 3 | 4 | 909 | 2 | D6 · P2 |
| | | | | | |
| `extras` | 22 | 17 | 3 072 | 2 | priorité 5 |
| `wishlists` — listes d'envies | 21 | 10 | 3 280 | 2 | priorité 5 |
| `diaspora` | 17 | 6 | 2 374 | 2 | priorité 5 |
| `subscriptions` — Premium | 6 | 7 | 1 990 | 2 | priorité 5 |
| **Total** | **127** | **74** | **21 746** | **16** | |

### La lecture qui compte

Les onze applications ne sont pas au même rang dans la feuille de route :

- **61 routes** relèvent de **D6, priorité 2** — panier, portefeuille, SAV, messagerie,
  retrait en relais, reçus, contenus. Ce sont celles dont le lancement a besoin. D6
  demande précisément d'*« activer les modules panier, retrait en relais, SAV, messagerie
  et reçus »* et de *« préparer le module portefeuille »*.
- **66 routes** relèvent de la **priorité 5** — listes d'envies, abonnements, diaspora,
  extras. Elles ne bloquent pas le lancement et peuvent rester désinstallées.

Autrement dit : **le trou de l'espace client, pour lancer, fait 61 routes, et le code des
61 existe déjà.**

### Applications du kit actuellement installées

Quatre seulement, sur quinze : `client_core`, `otp`, `client_accounts`,
`notifications_client`.

### Une réserve à garder en tête

« Servie » ci-dessus veut dire que l'URL existe et répond. Cela ne garantit pas que le
format de sa réponse corresponde à ce que le site attend. Le contrat précise que les
routes à créer répondent en `camelCase` avec les dates en millisecondes, là où les routes
Relaya existantes suivent la convention de Django REST Framework. Les 59 routes déjà
servies sont à vérifier une par une au branchement, champ par champ.

---

## Comment ces chiffres ont été obtenus

Ils ne sont pas estimés. Les routes réellement servies sont lues dans le résolveur d'URL
de Django, puis croisées avec les clés `paths:` de `openapi.yaml`, en normalisant les
paramètres (`<int:pk>` et `{id}` deviennent comparables) et les barres finales.

Trois contrôles manuels ont confirmé qu'il n'y a pas de faux « manquant » :

- `/api/whatsapp/conversation` — l'application WhatsApp n'expose que `webhook/` ;
- `/api/reviews/{id}/vote` — aucune route de vote d'avis dans `catalog` ;
- `/api/orders/{id}/receipt` — `confirm-receipt/` existe, mais c'est la confirmation de
  réception, pas le document du reçu.

---

## Ce qui reste à décider

1. **Installer les sept applications de D6 maintenant, ou après la mise en ligne de la
   vitrine ?** La priorité 1 est la vitrine, et la vitrine n'a besoin d'aucune des 127
   routes : en mode découverte il n'y a ni panier serveur, ni paiement, ni SAV. D6 est
   classé en priorité 2, donc *après*. Ce document ne propose pas d'anticiper.

2. **Le versement au vendeur, chaque vendredi ou à la demande ?** D20 écrit « verser chaque
   vendredi » ; une décision produit du 12 octobre a retenu le retrait à la demande, et le
   code applique cette dernière. Les versements du vendredi restent en vigueur pour les
   points relais (D13) et les entreprises de livraison (D11), qui sont des cycles
   distincts. À confirmer.
