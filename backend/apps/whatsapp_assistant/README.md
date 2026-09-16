# Assistant WhatsApp Belivay

Module détachable qui permet aux clients de découvrir le catalogue et de
commander depuis WhatsApp, et qui prévient les livreurs sur leur WhatsApp.

## Structure

```
whatsapp_assistant/
├── conf.py          Réglages lus dans le .env (rien dans settings.py)
├── providers/       Envoi / réception : Meta Cloud API (meta_cloud.py). Un autre
│                    fournisseur = une nouvelle classe WhatsAppProvider + PROVIDERS
├── webhooks.py      Point d'entrée public : vérification Meta (GET), messages (POST)
├── inbox.py         Enregistre contact + message (anti-doublon), appelle le cerveau
├── conversation/    Le « cerveau » :
│   ├── engine.py      routage (langue, boutons, mots-clés, recherche)
│   ├── screens.py     écrans (accueil, catégories, articles, fiche, aide)
│   ├── texts.py       tous les textes FR / EN
│   └── outbox.py      envois journalisés
├── bridge/          SEUL endroit qui lit/écrit dans le reste de Belivay
│   ├── catalog.py     porte d'entrée : choisit la source du catalogue
│   ├── sources/       local.py (base du serveur) · remote.py (API du site en ligne)
│   ├── tree.py        arbre des catégories + nombre d'articles par branche
│   └── types.py       CategoryItem, ProductItem, CatalogUnavailable
├── media.py         Conversion JPEG + dépôt des images chez le fournisseur
├── posters.py       Choix de l'affiche publicitaire (rotation, campagnes, délai)
├── models.py        WhatsAppContact (+ mémoire), WhatsAppMessage, WhatsAppPoster, WhatsAppMedia
├── admin.py         Consultation des échanges dans /django-admin/
└── tests/
```

## Activation (.env)

| Variable | Rôle |
|---|---|
| `WHATSAPP_ASSISTANT_ENABLED` | `1` pour activer. Sinon le webhook répond 404. |
| `WHATSAPP_VERIFY_TOKEN` | Phrase secrète choisie par nous, recopiée chez Meta (vérification du webhook). |
| `WHATSAPP_APP_SECRET` | Clé secrète de l'application Meta : sert à vérifier la signature de chaque message. |
| `WHATSAPP_ACCESS_TOKEN` | Jeton d'accès à l'API Meta (envoi des messages). |
| `WHATSAPP_PHONE_NUMBER_ID` | Identifiant du numéro WhatsApp chez Meta (pas le numéro lui-même). |
| `WHATSAPP_GRAPH_API_VERSION` | Facultatif, défaut `v23.0`. |
| `WHATSAPP_ASSISTANT_NAME` | Facultatif, défaut `Belivay`. |
| `WHATSAPP_SUPPORT_PHONE` / `WHATSAPP_SUPPORT_EMAIL` | Contacts affichés dans « Aide ». Défauts : +237 689 00 28 12, contact@belivay.com. |
| `WHATSAPP_POSTER_COOLDOWN_MINUTES` | Délai minimal entre deux affiches d'un même moment, pour un même client. Défaut : 60. |
| `WHATSAPP_CATALOG_SOURCE` | `local` (défaut) : base du serveur. `remote` : catalogue du site en ligne, lu par son API publique. |
| `WHATSAPP_CATALOG_API_URL` | Site lu en mode `remote`. Défaut : `https://belivay.com`. |
| `WHATSAPP_CATALOG_CACHE_SECONDS` | Fraîcheur du catalogue `remote` (cache Redis). Défaut : 60. |

## Catalogue

L'assistant présente **tout le catalogue**, comme le site : les catégories
actives de l'admin (les vides portent « Bientôt disponible ») et les articles
en vente. En développement, `remote` lui fait montrer le catalogue réel de
Belivay.com ; en production sur le même serveur, `local` suffit (même base).

## Images et affiches

- WhatsApp n'accepte que JPEG/PNG ; Belivay stocke du WebP. `media.py` convertit
  en JPEG, dépose l'image chez Meta et réutilise son identifiant 25 jours
  (table `WhatsAppMedia`). Aucune URL publique n'est nécessaire.
- Affiches publicitaires : `/django-admin/` → « Affiches WhatsApp ». Chaque affiche
  a un **moment** : « Accueil » (avant l'accueil, quand le client salue ou écrit
  pour la première fois), « Acheter » (avant la liste des catégories) ou
  « Recherche » (avant l'invite de recherche). Les
  affiches actives d'un même moment tournent, au plus une par délai de refroidissement.

URL du webhook à déclarer chez Meta : `https://<domaine>/api/whatsapp/webhook/`

## Retrait complet

1. `python manage.py migrate whatsapp_assistant zero` (supprime ses tables)
2. Retirer `"apps.whatsapp_assistant"` de `INSTALLED_APPS` (relaya/settings/base.py)
3. Retirer la ligne `api/whatsapp/` de `relaya/urls.py`
4. Supprimer ce dossier et les variables `WHATSAPP_*` du `.env`

Pour une simple mise en pause : `WHATSAPP_ASSISTANT_ENABLED=0`.

## Feuille de route

1. ✅ Compte Meta + numéro de test
2. ✅ Premier contact : réception sécurisée, accueil bilingue
3. ✅ Langue, menus, catégories et produits (recherche comprise), affiches
4. ⏳ Bouton « Acheter sur Belivay » sur chaque fiche (option B) : panier, livraison
   et paiement Mobile Money se font dans l'application. Le bouton n'apparaît
   que si la page du produit s'ouvre (fiche maître publiée) ; lien marqué
   utm_source=whatsapp pour les statistiques. (en cours de test)
5. Message au livreur à l'assignation (modèle validé par Meta)
6. Mise en production sur +237 687778427
