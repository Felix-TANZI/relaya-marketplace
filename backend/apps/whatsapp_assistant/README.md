# Assistant WhatsApp BelivaY

Quatre des six métiers de BelivaY parlent désormais WhatsApp : le **client**
découvre le catalogue et suit sa commande, le **vendeur** est prévenu d'une
commande payée et la prépare, le **livreur** reçoit ses missions et les accepte,
le **point relais** réceptionne ses colis et les remet. Et quand le robot ne
suffit pas, un **conseiller** prend la main dans la même conversation.

Le module est **détachable**. Il n'ajoute que deux lignes au projet
(`INSTALLED_APPS` et `urls.py`) et ne touche à aucune table du cœur : il écoute
par signaux et appelle le code métier existant.

---

## Le principe qui gouverne tout le module

**Aucune règle métier n'est réécrite ici.** Chaque action appelle le code que
les portails web utilisent déjà. Une règle dupliquée deviendrait une seconde
source de vérité, qui divergerait en silence.

| Action WhatsApp | Le code du cœur qui décide |
|---|---|
| Le livreur accepte une mission | `shipping.serializers.CourierShipmentActionSerializer` |
| Le vendeur confirme / déclare le colis prêt | `vendors.serializers.UpdateFulfillmentStatusSerializer` et sa table `VENDOR_TRANSITIONS` |
| Le point relais réceptionne | `shipping.serializers.RelayParcelReceiveSerializer` |
| Le point relais remet au client | `shipping.serializers.RelayParcelPickupSerializer` |
| Le client demande un conseiller | `contact.models.ContactMessage` + `contact.utils.send_contact_emails` |

Les règles de confidentialité sont reprises telles quelles : l'acheteur reste
« Acheteur #4821 » pour le vendeur, le livreur reste « BV-L-007 » pour le
relais, et **aucun code de remise ou de réception ne circule par message**.

Les garde-fous qui vivent dans les *vues* (propriété de l'objet, compte actif,
verrou concurrent) sont, eux, réimplémentés dans `bridge/` — ils ne sont pas
dans les serializers.

---

## Structure

```
whatsapp_assistant/
├── conf.py              Réglages lus dans le .env (rien dans settings.py)
├── apps.py              Branche les signaux du cœur (ready())
├── webhooks.py          Point d'entrée public : vérification Meta (GET), messages (POST)
├── inbox.py             Enregistre contact + message (anti-doublon), appelle le cerveau
├── message_templates.py Modèles soumis à Meta (obligatoires pour écrire le premier)
├── media.py             Conversion JPEG + dépôt des images chez le fournisseur
├── posters.py           Choix de l'affiche publicitaire (rotation, campagnes, délai)
│
├── providers/           Envoi / réception. meta_cloud.py aujourd'hui ; un autre
│                        fournisseur = une nouvelle classe WhatsAppProvider
│
├── conversation/        Le « cerveau »
│   ├── engine.py          aiguillage : conseiller, relais, livreur, vendeur, client
│   ├── screens.py         écrans client (accueil, catégories, articles, aide)
│   ├── orders.py          le client suit sa commande
│   ├── vendor.py          le vendeur prépare ses commandes
│   ├── courier.py         le livreur reçoit et accepte ses missions
│   ├── relay.py           le point relais réceptionne et remet
│   ├── support.py         parler à un humain, et le silence qui suit
│   ├── texts.py           TOUS les textes, FR et EN (217+ clés, strictement symétriques)
│   └── outbox.py          envois journalisés (un échec n'interrompt jamais rien)
│
├── bridge/              SEUL endroit qui lit ou écrit dans le reste de BelivaY
│   ├── catalog.py         porte d'entrée du catalogue
│   ├── sources/           local.py (base du serveur) · remote.py (site en ligne)
│   ├── orders.py          commandes d'un client, par son numéro
│   ├── vendor_orders.py   commandes d'un vendeur + signal de paiement
│   ├── deliveries.py      colis d'un livreur + signal d'assignation
│   ├── relay.py           colis d'un relais + signal de ramassage
│   ├── support.py         dépôt d'une demande d'aide
│   └── types.py           CategoryItem, ProductItem, CatalogUnavailable
│
├── management/commands/ whatsapp_templates · whatsapp_courier_test
│                        whatsapp_vendor_test · whatsapp_relay_test
├── models.py            Mémoire du module (aucune table du cœur modifiée)
├── admin.py             Consultation dans /django-admin/
└── tests/               128 tests, sur PostgreSQL
```

### Ce qu'il mémorise

| Table | Rôle |
|---|---|
| `WhatsAppContact` | Qui nous écrit : numéro, langue, état de la conversation. **Aucun lien vers `auth.User`** — l'appariement se fait par numéro de téléphone. |
| `WhatsAppMessage` | Journal de tous les échanges (anti-doublon sur les messages reçus). |
| `WhatsAppPoster` | Affiches publicitaires, par moment. |
| `WhatsAppMedia` | Images déjà déposées chez Meta (réutilisées 25 jours). |
| `CourierNotification` · `VendorNotification` · `RelayNotification` | Un envoi = une ligne. Contrainte d'unicité : personne n'est prévenu deux fois pour le même événement. |

---

## Comment un message est aiguillé

`conversation/engine.py`, dans cet ordre strict :

1. **Un conseiller a la main** → l'assistant se tait, quel que soit le type de
   message (texte, photo, vocal). Sans ce silence, le robot parlerait par-dessus
   l'agent humain.
2. **Point relais** → un gérant en train de saisir un code de retrait peut taper
   n'importe quoi ; cela ne doit jamais devenir une recherche d'articles.
3. **Livreur**, puis **suivi de commande**, puis **vendeur** — chacun ne reconnaît
   que ce qui le concerne et rend la main sinon.
4. **Langue** pas encore choisie → 🇫🇷 / 🇬🇧.
5. Boutons, mots-clés, puis **recherche d'articles** pour tout le reste.

Les rôles se reconnaissent **au numéro de téléphone**, jamais à un compte. Les
mots-clés sont volontairement distincts pour qu'une même personne puisse être
cliente *et* vendeuse :

| Rôle | Ce qu'il écrit |
|---|---|
| Client | `ma commande`, `mes commandes`, `suivi`, `mon colis` |
| Vendeur | `mes ventes`, `à préparer`, `ma boutique` |
| Livreur | `missions`, `livraison`, `tournée` |
| Point relais | `mes colis`, `mon relais` |
| Conseiller | `humain`, `conseiller`, `agent`, `réclamation` (mot déclencheur dans une phrase courte) |

⚠️ **Les numéros sont saisis à la main dans BelivaY**, sous quatre formes
différentes (`+237XXXXXXXXX`, `+237 6 XX XX`, 9 chiffres, vide). Tous les ponts
comparent donc des numéros **normalisés**, jamais les chaînes brutes. Normaliser
au checkout simplifierait tout cela.

---

## Les modèles Meta

WhatsApp interdit d'écrire le premier à quelqu'un sans un **modèle approuvé** :
un texte figé à trous, relu par Meta. La fenêtre de service client de 24 heures
ne s'ouvre qu'après un message de la personne.

| Modèle | Destinataire | Envoyé quand |
|---|---|---|
| `belivay_nouvelle_mission` | Livreur | Un colis lui est assigné |
| `belivay_recap_tournee` | Livreur | Sa tournée est complète |
| `belivay_nouvelle_commande` | Vendeur | Une commande est payée |
| `belivay_colis_relais` | Point relais | Le colis est ramassé chez le vendeur |

```bash
python manage.py whatsapp_templates            # état des modèles chez Meta
python manage.py whatsapp_templates --submit   # soumettre les manquants
python manage.py whatsapp_templates --force    # resoumettre après un changement de texte
```

La commande **alerte si le texte chez Meta ne correspond plus au texte local** —
un modèle validé ne se corrige qu'en le resoumettant, avec une nouvelle attente.

> **En développement**, on peut tout tester sans modèle : il suffit que la
> personne **écrive en premier** (`missions`, `mes ventes`, `mes colis`), ce qui
> ouvre la fenêtre de 24 heures.

---

## Réglages (.env)

### Indispensables

| Variable | Rôle |
|---|---|
| `WHATSAPP_ASSISTANT_ENABLED` | `1` pour activer. Sinon le webhook répond 404 et aucun envoi ne part. |
| `WHATSAPP_VERIFY_TOKEN` | Phrase secrète, recopiée chez Meta (vérification du webhook). |
| `WHATSAPP_APP_SECRET` | Clé de l'application Meta : vérifie la signature de chaque message reçu. |
| `WHATSAPP_ACCESS_TOKEN` | Jeton d'accès. **Doit être un jeton d'utilisateur système** — celui du tableau de bord expire en 24 h. |
| `WHATSAPP_PHONE_NUMBER_ID` | Identifiant du numéro chez Meta (pas le numéro lui-même). |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Compte WhatsApp Business. Indispensable pour les modèles. |

### Catalogue et liens

| Variable | Défaut | Rôle |
|---|---|---|
| `WHATSAPP_CATALOG_SOURCE` | `local` | `local` : base du serveur. `remote` : le catalogue du site en ligne. |
| `WHATSAPP_CATALOG_API_URL` | `https://belivay.com` | Site lu en mode `remote`. |
| `WHATSAPP_CATALOG_CACHE_SECONDS` | `60` | Fraîcheur du catalogue `remote` (cache Redis). |
| `WHATSAPP_SITE_URL` | *= catalog_api_url* | Site vers lequel pointent les liens envoyés au client. **Doit être en HTTPS** : WhatsApp refuse tout autre lien sur un bouton. |

### Par métier

| Variable | Défaut | Rôle |
|---|---|---|
| `WHATSAPP_COURIER_NOTIFICATIONS` | `1` | Prévenir les livreurs à l'assignation. |
| `WHATSAPP_VENDOR_NOTIFICATIONS` | `1` | Prévenir les vendeurs au paiement. |
| `WHATSAPP_RELAY_NOTIFICATIONS` | `1` | Prévenir les points relais au ramassage. |
| `WHATSAPP_COURIER_APP_URL` | `https://courier.belivay.com/courier` | Bouton du modèle livreur. |
| `WHATSAPP_VENDOR_APP_URL` | `https://seller.belivay.com/seller` | Bouton du modèle vendeur. |
| `WHATSAPP_RELAY_APP_URL` | `https://relay-point.belivay.com/relay-point` | Bouton du modèle relais. |
| `WHATSAPP_*_NOTIFY_OVERRIDE` | *(vide)* | **Développement uniquement** : dérouter tous les messages d'un métier vers un seul numéro d'essai. |
| `WHATSAPP_HUMAN_HANDOVER_HOURS` | `6` | Durée du silence de l'assistant après le passage à un conseiller. |

### Présentation

| Variable | Défaut |
|---|---|
| `WHATSAPP_ASSISTANT_NAME` | `BelivaY` |
| `WHATSAPP_SUPPORT_PHONE` | `+237 689 00 28 12` |
| `WHATSAPP_SUPPORT_EMAIL` | `contact@belivay.com` |
| `WHATSAPP_POSTER_COOLDOWN_MINUTES` | `60` |
| `WHATSAPP_GRAPH_API_VERSION` | `v23.0` |
| `WHATSAPP_PROVIDER` | `meta` |

URL du webhook à déclarer chez Meta : `https://<domaine>/api/whatsapp/webhook/`

---

## Affiches publicitaires

`/django-admin/` → **Affiches WhatsApp**. Chaque affiche a un **moment** :
accueil, « Acheter » (avant les catégories) ou recherche. Les affiches actives
d'un même moment tournent d'un client à l'autre, au plus une par délai de
refroidissement.

WhatsApp n'accepte que JPEG/PNG alors que BelivaY stocke du WebP : `media.py`
convertit, dépose l'image chez Meta et réutilise son identifiant 25 jours.

---

## Tester

```bash
# La suite complète — sur PostgreSQL, pas SQLite
docker compose exec backend python -m pytest apps/whatsapp_assistant -q \
  -o addopts="" -p no:cacheprovider --reuse-db
```

⚠️ **SQLite ne convient pas** : plusieurs actions utilisent `select_for_update()`,
que SQLite refuse. Et sans `--reuse-db`, la création de la base prend cinq minutes.

### Essais de bout en bout

Chaque commande emprunte le **vrai chemin** des portails, donc déclenche le vrai
signal et le vrai message.

```bash
python manage.py whatsapp_courier_test --list
python manage.py whatsapp_courier_test --shipment 38 --courier 3   # assigne un colis

python manage.py whatsapp_vendor_test --list
python manage.py whatsapp_vendor_test --order 53                   # fait payer une commande

python manage.py whatsapp_relay_test --list
python manage.py whatsapp_relay_test --shipment 31                 # fait ramasser un colis
```

Les échecs d'envoi sont visibles dans `/django-admin/` : « Messages livreurs »,
« Messages vendeurs », « Messages points relais ».

---

## Mettre en pause, ou retirer

**Pause** : `WHATSAPP_ASSISTANT_ENABLED=0`. Ou par métier :
`WHATSAPP_COURIER_NOTIFICATIONS=0`, etc. Les réglages sont relus à chaque
message — **aucun redémarrage nécessaire**.

**Retrait complet** :

1. `python manage.py migrate whatsapp_assistant zero` — supprime ses tables
2. Retirer `"apps.whatsapp_assistant"` de `INSTALLED_APPS` (`relaya/settings/base.py`)
3. Retirer la ligne `api/whatsapp/` de `relaya/urls.py`
4. Supprimer ce dossier et les variables `WHATSAPP_*` du `.env`

Rien d'autre à défaire : aucune table du cœur n'a été modifiée.

---

## Avant la mise en production

- [ ] **Vérifier l'entreprise** chez Meta, puis enregistrer le numéro BelivaY
      (`+237 687 77 84 27`). Le numéro d'essai `+1 555…` ne peut écrire qu'à
      5 destinataires et ne porte pas votre identité.
- [ ] Le numéro choisi doit être **vierge de tout compte WhatsApp**, et ne pourra
      plus servir dans l'application WhatsApp une fois passé sur l'API.
- [ ] Mettre à jour `WHATSAPP_PHONE_NUMBER_ID` (et `WHATSAPP_BUSINESS_ACCOUNT_ID`
      si un nouveau compte de production est créé — **les modèles sont alors à
      resoumettre**).
- [ ] Vider les `WHATSAPP_*_NOTIFY_OVERRIDE`.
- [ ] **Restaurer les numéros de démonstration** modifiés pour les essais :
      `VendorProfile` id=2 `whatsapp_phone` → `+237690112233`,
      `RelayPointProfile` id=1 `phone` → `+237690000004`.
- [ ] Vérifier les modèles : `python manage.py whatsapp_templates` — tous `APPROVED`.
- [ ] Basculer `WHATSAPP_CATALOG_SOURCE=local` si l'assistant tourne sur le même
      serveur que le site.

### Points ouverts côté cœur

Découverts en construisant le module, à traiter séparément :

- **Trois adresses de support divergent** : `settings.SUPPORT_EMAIL`
  (`support@belivay.com`), `PlatformSettings.support_email` (`support@belivay.cm`
  — c'est elle qui l'emporte) et le réglage WhatsApp (`contact@belivay.com`).
- **Le vendeur est notifié à la création de la commande**, donc avant paiement
  (`orders/serializers.py`). Il peut préparer un colis qui ne sera jamais payé.
  Le canal WhatsApp, lui, attend le paiement.
- **`Order.vendor_acknowledge()` et `Order.start_preparing()` ne sont appelées
  nulle part** : ce sont des méthodes mortes, le chemin réel passe par le
  serializer.
- **Le checkout ne normalise pas les téléphones** — quatre formats coexistent.
- Des commandes de démonstration ont un livreur assigné alors que
  `payment_status` n'est pas `PAID`.
