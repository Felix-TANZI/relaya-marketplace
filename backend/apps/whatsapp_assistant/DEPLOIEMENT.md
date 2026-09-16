# Mettre l'assistant WhatsApp en ligne

Ce document s'adresse à qui déploie BelivaY en production. Il suppose que vous
connaissez le dépôt et le déploiement GitHub Actions, mais pas l'assistant.

**Objectif :** après le déploiement, n'importe qui peut écrire au numéro WhatsApp
de BelivaY pour parcourir le catalogue et acheter, et les vendeurs, livreurs et
points relais enregistrés sur la plateforme sont prévenus automatiquement.

Le code est prêt et testé (142 tests). Tout ce qui reste est de la
**configuration** : des variables GitHub, et des démarches chez Meta.

> ⚠️ **Les démarches Meta prennent plusieurs jours.** Commencez par l'étape 1,
> le reste peut se préparer en parallèle.

---

## Étape 1 — Vérifier l'entreprise chez Meta

C'est le verrou. Tant qu'elle n'est pas faite, aucun vrai numéro ne peut être
enregistré, et l'assistant ne peut écrire qu'à 5 numéros d'essai.

1. **business.facebook.com** → Paramètres de l'entreprise → **Centre de sécurité**
2. Lancer la **vérification de l'entreprise**
3. Fournir les documents légaux au nom de BelivaY : registre de commerce,
   justificatif d'adresse, éventuellement un relevé bancaire

État actuel : `business_verification_status = not_verified`.

---

## Étape 2 — Le numéro de production

Le numéro prévu est **+237 687 77 84 27**.

**Trois conditions à vérifier avant de commencer :**

- Ce numéro ne doit **avoir aucun compte WhatsApp** (ni classique, ni Business).
  S'il en a un, le supprimer d'abord depuis l'application.
- Une fois passé sur l'API, **il ne pourra plus servir dans l'application
  WhatsApp**. Il devient une ligne dédiée à l'assistant.
- Il doit pouvoir recevoir un SMS ou un appel pour la vérification.

**La marche à suivre :**

1. Créer un **compte WhatsApp Business de production** dans le Business Manager.
   Celui qui existe aujourd'hui s'appelle « Test WhatsApp Business Account » :
   c'est celui que Meta crée pour les essais, un vrai numéro n'y est pas
   ajoutable.
2. Y ajouter le numéro, le vérifier par le code reçu.
3. Choisir le **nom affiché** (« BelivaY ») — Meta le relit, comptez un délai.
4. Relever les deux identifiants dans **WhatsApp → Configuration de l'API** :
   l'**identifiant du numéro de téléphone** et l'**identifiant du compte
   WhatsApp Business**.

> 💡 Les modèles de message appartiennent au **compte**, pas au numéro. Un
> nouveau compte de production implique de **resoumettre les modèles**
> (étape 5). C'est une commande, mais un délai d'approbation supplémentaire.

---

## Étape 3 — Le jeton d'accès

**N'utilisez pas le jeton du tableau de bord : il expire en 24 heures.**

Il faut un **jeton d'utilisateur système**, qui n'expire jamais :

1. business.facebook.com → Paramètres de l'entreprise → **Utilisateurs système**
2. Créer un utilisateur système, rôle administrateur
3. Lui donner accès à l'application et au compte WhatsApp Business
4. **Générer un jeton** avec les autorisations `whatsapp_business_messaging`
   et `whatsapp_business_management`
5. Le copier immédiatement — il n'est affiché qu'une fois

Pour vérifier qu'un jeton est bien permanent :
`https://developers.facebook.com/tools/debug/accesstoken/` — le champ
« Expire » doit indiquer **Jamais**.

---

## Étape 4 — Les variables GitHub

Le déploiement **génère `.env.prod` depuis GitHub**. Ne modifiez jamais ce
fichier sur le serveur : il est écrasé à chaque déploiement.

**GitHub → Settings → Environments → `production`**

### Secrets (valeurs confidentielles)

| Nom | Où le trouver |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Le jeton d'utilisateur système de l'étape 3 |
| `WHATSAPP_APP_SECRET` | Meta → l'application → Paramètres → Général → **Clé secrète** |
| `WHATSAPP_VERIFY_TOKEN` | **Une phrase que vous inventez.** Elle sert à prouver à Meta que le webhook est bien le nôtre. Générez-la au hasard (40 caractères), et recopiez-la à l'identique à l'étape 6. |

### Variables (valeurs non confidentielles)

| Nom | Valeur | Rôle |
|---|---|---|
| `WHATSAPP_ASSISTANT_ENABLED` | `1` | **Sans cette variable à 1, l'assistant est muet** et son webhook répond 404. |
| `WHATSAPP_PHONE_NUMBER_ID` | *(étape 2)* | Identifiant du numéro chez Meta — pas le numéro lui-même. |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | *(étape 2)* | Compte WhatsApp Business. Indispensable pour les modèles. |
| `WHATSAPP_CATALOG_SOURCE` | `local` | En production, l'assistant tourne sur le même serveur que le site : lire la base directement évite un aller-retour réseau. |
| `WHATSAPP_SITE_URL` | `https://belivay.com` | Site vers lequel pointent les liens envoyés au client. **Doit être en HTTPS** : WhatsApp refuse tout autre lien sur un bouton. |
| `WHATSAPP_SUPPORT_PHONE` | `+237 689 00 28 12` | Affiché dans l'écran d'aide. |
| `WHATSAPP_SUPPORT_EMAIL` | *(voir ci-dessous)* | Affiché dans l'écran d'aide. |

Les autres variables (`WHATSAPP_ASSISTANT_NAME`, les quatre
`WHATSAPP_*_NOTIFICATIONS`, `WHATSAPP_HUMAN_HANDOVER_HOURS`) peuvent rester
vides : le code applique alors ses valeurs par défaut, qui conviennent.

> ⚠️ **Trois adresses de support divergent** dans le projet :
> `settings.SUPPORT_EMAIL` (`support@belivay.com`),
> `PlatformSettings.support_email` en base (`support@belivay.cm`) et le réglage
> WhatsApp (`contact@belivay.com`). Les demandes d'aide partent vers celle de
> **PlatformSettings**. Vérifiez que c'est bien une boîte relevée, et alignez
> les trois.

---

## Étape 5 — Les modèles de message

WhatsApp interdit d'écrire le premier à quelqu'un sans un **modèle approuvé** :
un texte figé, relu par Meta. Cinq modèles sont nécessaires, en français et en
anglais — le message au livreur, le récapitulatif de tournée, la commande au
vendeur, le colis au point relais, et le suivi envoyé au client.

Une fois l'étape 4 faite et le déploiement passé, sur le serveur :

```bash
docker compose -f docker-compose.prod.yml exec backend \
  python manage.py whatsapp_templates --submit

# puis, pour suivre :
docker compose -f docker-compose.prod.yml exec backend \
  python manage.py whatsapp_templates
```

Attendez que **tous** affichent `APPROVED`. Meta annonce quelques minutes mais
s'autorise 24 heures. Un `REJECTED` affiche son motif.

**Tant qu'ils ne sont pas approuvés :** les clients peuvent écrire à l'assistant
et tout le parcours d'achat fonctionne — c'est le client qui parle en premier.
Seuls les messages que l'assistant envoie **de lui-même** (au vendeur, au
livreur, au point relais, au client à chaque étape) attendent l'approbation.

---

## Étape 6 — Le webhook

Meta → l'application → **WhatsApp → Configuration** → Webhook :

| Champ | Valeur |
|---|---|
| URL de rappel | `https://belivay.com/api/whatsapp/webhook/` |
| Jeton de vérification | La phrase choisie pour `WHATSAPP_VERIFY_TOKEN` |

Cliquer sur **Vérifier et enregistrer**. Meta appelle immédiatement l'URL ; si
elle répond, la configuration est acceptée.

Puis **s'abonner aux champs** : `messages` (indispensable) et `message_template_status_update`
(pour suivre l'approbation des modèles).

> Si la vérification échoue : le déploiement a-t-il bien eu lieu avec
> `WHATSAPP_ASSISTANT_ENABLED=1` ? Sans cela, l'URL répond 404.

---

## Étape 7 — Vérifier après le déploiement

```bash
# 1. L'assistant est-il actif et bien configuré ?
docker compose -f docker-compose.prod.yml exec backend python manage.py shell -c "
from apps.whatsapp_assistant.conf import get_config
c = get_config()
print('actif        :', c.enabled)
print('numero (id)  :', bool(c.phone_number_id))
print('compte (id)  :', bool(c.business_account_id))
print('jeton        :', bool(c.access_token))
print('catalogue    :', c.catalog_source)
print('site liens   :', c.site_url)
"

# 2. Les modèles sont-ils approuvés ?
docker compose -f docker-compose.prod.yml exec backend python manage.py whatsapp_templates
```

**Puis, depuis un téléphone**, écrire au numéro BelivaY :

1. « Bonjour » → l'assistant propose de choisir la langue
2. « Acheter » → les catégories du site apparaissent
3. Chercher un article → sa photo, son prix et le bouton **Acheter sur BelivaY**
4. « ma commande » → le suivi, si ce numéro a déjà commandé
5. « je veux parler à un conseiller » → la demande arrive dans
   **/django-admin/ → Contact → Messages de contact**

Les envois automatiques se vérifient dans `/django-admin/` :
« Messages clients », « Messages vendeurs », « Messages livreurs »,
« Messages points relais ». Chaque échec y porte son motif.

---

## Étape 8 — Les données de démonstration à restaurer

Des numéros ont été détournés pour les essais en développement. **S'ils sont
présents dans la base de production, remettez-les** :

| Objet | Valeur d'essai | À restaurer |
|---|---|---|
| `VendorProfile` id=2 — `whatsapp_phone` | `+237 6 99 95 53 24` | `+237690112233` |
| `RelayPointProfile` id=1 — `phone` | `+237 6 99 95 53 24` | `+237690000004` |

Vérifiez aussi qu'aucune variable `WHATSAPP_*_NOTIFY_OVERRIDE` n'est définie :
elle dérouterait tous les messages d'un métier vers un seul numéro.

---

## Ce qui échappe au déploiement

Deux limites tiennent au **catalogue**, pas à l'assistant :

- **Quatre produits n'ont aucune fiche maître** (Sac à Main Cuir Artisanal,
  Sandales Dorées Élégantes, Parfum Floral 50ml Premium, Robe Longue Bohème
  Wax). Sans fiche maître, un produit n'a pas de page sur belivay.com : le
  bouton « Acheter » ne peut pas s'afficher. À rattacher depuis l'admin.
- **ITEL AC52 n'a aucune photo** sur le site. L'assistant ne peut pas en
  inventer une.

Et un rappel sur les volumes : un numéro neuf démarre avec une limite de
**1 000 conversations initiées par l'entreprise sur 24 heures**. Les réponses
aux clients qui écrivent, elles, ne sont pas limitées. La limite monte
automatiquement avec l'usage et la qualité du numéro.

---

## Mettre en pause sans redéployer

Les réglages sont relus **à chaque message** : changer une variable et
redéployer suffit, aucun redémarrage manuel n'est nécessaire.

| Pour | Mettre |
|---|---|
| Tout couper | `WHATSAPP_ASSISTANT_ENABLED=0` |
| Ne plus écrire aux clients | `WHATSAPP_CUSTOMER_NOTIFICATIONS=0` |
| Ne plus écrire aux vendeurs | `WHATSAPP_VENDOR_NOTIFICATIONS=0` |
| Ne plus écrire aux livreurs | `WHATSAPP_COURIER_NOTIFICATIONS=0` |
| Ne plus écrire aux points relais | `WHATSAPP_RELAY_NOTIFICATIONS=0` |

Pour retirer complètement le module, voir la section « Mettre en pause, ou
retirer » du [README](README.md).
