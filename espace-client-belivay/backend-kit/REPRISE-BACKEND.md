# Reprise du back-end — kit pour l'équipe relaya-marketplace

État au 5 octobre 2026. Ce kit permet à l'équipe de relaya-marketplace (serveur de production de BelivaY) de
**continuer le back-end de l'espace client exactement là où on s'arrête** : toutes les routes que le site client
(`site/`) appelle et qui n'existent pas encore chez vous sont décrites, et la plupart sont déjà écrites en applications
Django à copier dans `backend/apps/`, dans votre style, testées, et branchées sur les moteurs de calcul (`moteurs/`).

Rien n'a été modifié dans `Felix-TANZI/relaya-marketplace` : le kit a été écrit en lisant votre dépôt (commit
`9546ffe`, 3 oct. 2026) et vérifié dans un projet Django d'essai qui reprend vos versions et vos réglages.

---

## 0. En bref

| Quoi | Où |
|---|---|
| Contrat OpenAPI 3.1 des routes du site (à créer et existantes), validé | `backend-kit/openapi.yaml` |
| Table des routes (méthode, chemin, méthodes du site, idempotence, public) | `backend-kit/outils/routes.json` |
| Générateur du contrat (depuis `site/src/api/routes.ts` et `site/src/donnees/source.ts`) | `backend-kit/outils/generer-openapi.mts` |
| 13 applications Django à copier dans `backend/apps/` | `backend-kit/apps/*` |
| Projet Django d'essai (Python 3.11, Django 5.1, DRF 3.14, simplejwt) : migrations et tests | `backend-kit/_essai/` (pas pour la production) |

**État vérifié le 5 octobre 2026** (projet d'essai, Python 3.11.17, Django 5.1.15, DRF 3.14.0, simplejwt 5.x, SQLite) :

- **558 tests verts**, couverture 92 % du code du kit ; dont 179 tests de contrat : **chaque route « à créer » du
  contrat existe dans les URL et accepte sa méthode** (`apps/client_core/tests/test_contrat.py`).
- **176 routes à créer sur 178 sont écrites** ; 2 restent en `501 a_finir` (WhatsApp, FF-EX06 : API WhatsApp Business
  « non au lancement »). Les demandes Mobile Money en attente sont servies par le kit (`GET /api/me/pending-payments`), sans toucher à vos routes.
- `migrate` sur base vide : OK ; `makemigrations --check` : aucune différence ; chaque migration ne dépend que de
  `AUTH_USER_MODEL` ; `charger_parametres` charge les 207 paramètres et les relit avec les moteurs.
- `ruff check` et `ruff format --check` propres (`backend-kit/ruff.toml`) ; `openapi-spec-validator` : OK ;
  `manage.py spectacular` : 0 erreur (routes du kit exclues par le crochet, voir § 3.2).
- **Le site entier a tourné contre le kit** (serveur d'essai, § 9) : 11 parcours de bout en bout verts
  (`site/tests/api-bout-en-bout.spec.ts`) — inscription et code SMS, connexion, catalogue et fiche, panier, paiement
  Mobile Money confirmé par webhook, code de retrait et remise au relais, litige, avis, messagerie, liste d'envies et
  cadeau, cotisation reçue dans « Reçus » et payée, diaspora (inscription, lien, commande pour un proche avec
  vérification renforcée et 3-D Secure), photos servies (variantes WebP), prix changé, session expirée, 429.
- Ce qui n'est **pas** testé : vos vrais modèles (le projet d'essai utilise des bouchons avec les mêmes noms de
  champs, et imite vos routes existantes que le site appelle : `_essai/relaya_essai`), PostgreSQL, les prestataires
  réels (SMS, push, carte, Mobile Money : versions « console »).

---

## 1. Conventions du contrat

1. **Chemins** : ceux de la spécification (`logique-metier/api.json`, repris par `site/src/api/routes.ts`), sous
   `/api/`, **sans barre finale** (`/api/me/adresses`). Vos routes en ont une (`/api/orders/12/`) : les deux
   coexistent sans se masquer. Pas de préfixe `/api/v1` (CAP-01) : décision D15.
2. **Réponses** des routes à créer : **exactement les types de `site/src/donnees/source.ts`** que l'écran lit
   (composants `Reponse_<méthode>` du contrat), mêmes noms de champs (camelCase français), **dates en millisecondes**
   depuis 1970 (comme `Date.now()`), montants en **francs entiers** (CAP-06). Le site n'a alors presque rien à
   adapter (décision D1). Une méthode du site qui ne rend rien → `204` sans corps.
3. **Corps des requêtes** : les champs écrits dans `routes.ts` (`{numero, code}`…), lus par des sérialiseurs DRF.
4. **Erreurs** (CAP-04) : `{"error": {"code": "price_changed", "message": "…", "data": {…}}}` ; code stable en
   snake_case ; message rédigé pour le client ; `data` : ce que l'écran affiche (nouveau montant, essais restants,
   champs fautifs `data.fields`). Le site (`site/src/api/erreurs.ts`) lit aussi votre format DRF `{"detail": …}`.
   Seules les vues du kit utilisent ce format (`VueClient.get_exception_handler`) : vos routes ne changent pas
   (décision D7).
   Quand `routes.ts` nomme un statut (« 409 deja », « 422 zone_non_servie »), la route répond ce statut ; sinon un
   refus est un `200` avec l'objet union du site (`{"ok": false, "raison": "…"}`).
5. **Idempotence** (CAP-03) : en-tête `Idempotency-Key` exigé sur toute création et toute action d'argent
   (décorateur `@idempotent()`) ; même clé + même corps = même réponse rejouée (en-tête `Idempotent-Replayed`) ;
   autre corps = `422 idempotency_mismatch` ; seules les réponses 2xx sont gardées (24 h).
6. **Pagination par curseur** (CAP-05) : `?cursor=` et `next_cursor` dans la réponse (`client_core.pagination`).
7. **Interrupteurs** FF-* (CAP-13) : `GET /api/config/flags` ; un module fermé répond `404` sur ses routes.
8. **Aucune valeur métier dans le code** (CCH-15) : montants, délais, seuils viennent du registre des paramètres
   (`client_core.parametres`, table `ParametreMetier`, chargée par `manage.py charger_parametres`) et sont relus par
   les moteurs avec une forme stricte. Chaque commande garde la version des paramètres de son paiement.
9. **Calculs** : toujours par les moteurs purs `belivay_moteurs` (frais, garde, comptoir, annulation, carte,
   délais, catalogue, litiges, notes, portefeuille, géo, machines à états). Un refus de transition d'une machine
   devient `409 state_changed`.
10. **Aucun import de vos applications métier** dans le kit (votre principe P1 de `payments`) : produits, boutiques,
    relais et commandes sont lus par un seul module, `apps/client_core/pont.py` (`settings.BELIVAY_MODELES`) ; les
    tables du kit gardent des identifiants entiers (`product_id`, `order_id`…), pas de ForeignKey vers vos modèles
    (décision D2). Les migrations du kit ne dépendent donc que de `auth` et des autres applications du kit.
11. **Données personnelles** (CAP-21) : numéros et adresses chiffrés au repos par **votre** module
    `apps.payments.payees.crypto` (même clé `PAYMENTS_ENCRYPTION_KEY`, même rotation), recherche par empreinte
    HMAC, masquage à la sortie (`client_core.masquage`, mêmes formes que le site).

---

## 2. Les applications du kit

Chaque application suit le même plan : `models.py`, `services.py` (logique, appelle les moteurs), `regles.py`
(règles du site portées en Python pur, sans Django), `views.py` (`VueClient` / `VuePublique`), `urls.py`, `admin.py`,
`migrations/0001_initial.py`, `tests/`. « Prêt » = écrit et testé dans le projet d'essai ; « à finir » = ce qui
dépend de vous ou d'une décision.

### 2.1 Socle — `client_core`
- **Prêt** : format d'erreur CAP-04 (`erreurs.py`, traduit aussi les erreurs des moteurs), `@idempotent()`
  (`CleIdempotence`, 24 h), pagination par curseur, interrupteurs FF-* (`Interrupteur`, `GET /api/config/flags`,
  permission `module("FF-…")` → 404), registre des paramètres (`ParametreMetier`, `parametres.py`, commande
  `charger_parametres`), pont vers vos modèles (`pont.py`), masquage, chiffrement (votre `payments.payees.crypto`),
  `a_finir()`, crochet drf-spectacular, `urls_api.py` (toutes les routes du kit), fabriques de test (`tests/outils.py`
  : complètent seules les ForeignKey obligatoires de vos modèles, ex. `Product.category`).
- **À finir** : mettre `ParametreMetier` sous votre contrôle à quatre yeux (D5) ; garder l'historique des versions.

### 2.2 Codes et mots de passe — `otp` (4 routes)
- **Prêt** : `POST /api/auth/otp/send` (objets : premier numéro, ancien/nouveau numéro, profil, e-mail, moyen,
  suppression, diaspora, cadeau ; OTP-DUREE, OTP-ESSAIS, OTP-RENVOI ; codes jamais en clair), `/otp/verify`
  (409 utilise : un numéro vérifié = un compte, CIN-35), `/password/forgot` (toujours 202, lien unique MDP-LIEN),
  `/password/reset` (MDP-LONG, ferme toutes les sessions). Distinct de votre `accounts.OTPCode` (2FA e-mail).
- **À finir** : prestataire SMS ; page du site « nouveau mot de passe » (`BELIVAY_LIEN_MDP`).

### 2.3 Compte — `client_accounts` (32 routes)
- **Prêt** : `GET/PATCH/DELETE /api/me` (DonneesCompte ; profil après code SMS, DP-52 ; suppression : 409
  compte_en_cours, pseudonymisation, données légales gardées), `/me/menu`, e-mail et numéro (deux codes, CAP-15 : codes
  de retrait régénérés, autres sessions fermées par votre `UserSession`), sécurité, identités Google/Apple (votre
  vérification Apple, google-auth), confidentialité et historique, suppression, adresses (zone : `geo.zone_exploitee`,
  422 zone_non_servie ; adresse chiffrée), relais habituel, centres d'intérêt, textes légaux et acceptation
  horodatée (`charger_legal`, depuis `site/src/demo/legal.ts`), boutique, Business, devise (comptes diaspora),
  alertes de favori. `ProfilClient` porte le numéro vérifié (chiffré, unique), le relais habituel, le type de compte.
- **À finir** : ouverture de boutique branchée sur votre `POST /api/vendors/apply/` (aujourd'hui un `VendorProfile`
  PENDING minimal par le pont) ; photo de profil vers `UserProfile.avatar` ; palier IFA (D11).

### 2.4 Notifications — `notifications_client` (5 routes)
- **Prêt** : réglages (Commande, Retrait, Incident, Paiement verrouillés : 422 category_locked ; canal WhatsApp avec
  consentement horodaté et FF-WHATSAPP-CANAL ; heures calmes ; alerte flash), `POST/DELETE /api/devices`, service
  `envoyer_notification` (écrit dans votre `accounts.UserNotification`, push selon les choix, heures calmes sauf
  critique, CAP-19 vérifié, repli SMS pour le critique) et `notifier()` pour les autres applications.
- **À finir** : Web Push (VAPID) et FCM ; révoquer les appareils dans votre `logout_view` (`revoquer_appareils`, CAP-17).

### 2.5 Panier et paiement — `cart` (18 routes)
- **Prêt** : panier serveur recalculé (`GET /api/cart` : lignes, boutiques, **frais du moteur**, **éligibilité au
  comptoir**, changements de prix CAL-11 ; baisses appliquées, hausses à accepter), lignes (ajout, quantité, option,
  retrait annulable, favori, autre offre avec `frais.gain_conseil` : 409 no_gain), mode ;
  `POST /api/checkout` (idempotent : numéro vérifié, prix recontrôlés → 409 price_changed, frais
  `verifier_au_paiement`, carte : frais de service et plafond → 422 over_cap, comptoir : `comptoir.eligibilite` et
  `partage`, montants figés avec la version des paramètres, sous-commandes, lignes réservées puis rendues si le
  paiement échoue) ; reçu, relance, abandon, paiement au comptoir (`montant_du_au_retrait` + garde) ; panier partagé
  payé par un proche (lien base32 CAP-11, euro à parité fixe, dollar au taux du prestataire). `FicheLogistique` :
  classe de colis de chaque produit (D3). Prix flash pris dans `apps.extras`.
- **À finir** : création de commande par votre circuit (`BELIVAY_CREER_COMMANDE`, D8) ; Mobile Money par votre
  `collect` ; vos webhooks (CamPay, prestataire carte) appellent **un seul point d'entrée**,
  `apps.client_core.webhooks.confirmer_paiement_externe(reference, reussi, cause)`, qui retrouve l'application du kit
  (commande `BLV-<id>-<n>`, diaspora, listes, cotisations et mises de côté, recharge, retrait, abonnement, cadeau
  d'abonnement) et appelle `confirmer_paiement` / `echouer_paiement`… (D9 ; idempotent, testé) ;
  découpage d'un panier carte au-delà de 150 000 F (CET-16, D12) ; réservation de stock (CAL-12) ; panier d'un visiteur
  par `X-Device-Id` (CAP-02 : aujourd'hui compte obligatoire).
- **Tâche à planifier** : expiration des demandes Mobile Money (`echouer_paiement(…, "expire")` après PAY-TVAL).

### 2.6 Commande après paiement — `pickup` (7 routes)
- **Prêt** : `MontantsCommande` (S, Ram, Rem, Suppl, Off, total, frais de service, version des paramètres, cumul
  remboursé : votre anomalie A6), `SousCommande` (une boutique = un colis, machine SOUS_COMMANDE), `GroupeRemise`
  (code à 6 chiffres chiffré, essais faux `comptoir.code_faux`, régénération CAP-15), `HorairesRelais`, garde
  (`garde.etat` : grille DP-08, testée sur BLV-52018 : « 300 F · 500 F demain » le 4e jour) ; routes : aperçu et
  annulation d'une boutique (`annulation.annuler`, part des frais de service `carte.part_du_service`, 409 state_changed
  après collecte), changement de relais / d'adresse / transfert (`annulation.changer_de_relais`, 409 price_changed,
  409 collected), délégation (vos champs `authorized_pickup_*`), racheter. `vue_commande_client(order_id, user)` rend
  la `CommandeClient` complète du site (garde, code, comptoir, fenêtre de retour `litiges.fermeture_du_retour`).
- **Prêt aussi** : `apps/pickup/evenements.py` — `avancer(order_id, "seller.confirmed" | "suborder.ready" |
  "parcel.collected" | "parcel.received" | "home.departed", n=None)` par la machine SOUS_COMMANDE (accusé fort au
  dernier colis arrivé, notification « Ton colis est arrivé » sans le code) et `remettre_au_client(order_id, code)`
  (code saisi au comptoir, trois faux ⇒ blocage, fenêtre de retour ouverte).
- **À finir** : servir `vue_commande_client` (D14) : le site lit déjà le champ **`espace_client`** de
  `GET /api/orders/{id}/` et `/api/orders/my-orders/` (`site/src/api/adaptateurs.ts`, `versCommande`) — ajoutez
  `espace_client = vue_commande_client(order.id, request.user)` à `OrderDetailSerializer` ; appeler
  `pickup.evenements` depuis vos applications vendeur, livreur et relais ; tâche quotidienne des rappels
  S0 à S5 et du renvoi (`belivay_moteurs.garde.rappels`, `garde.renvoi`, à la place de votre `process_relay_garde`) ;
  dissociation DP-32 (`delais.dissociation`) ; relais fermé (DP-42) et relais saturé (409 relay_full).

### 2.7 Litiges, retours, avis — `aftersales` (14 routes)
- **Prêt** : `GET /api/me/disputes`, `POST /api/disputes` (idempotent ; un dossier par colis, 409 deja ; voie
  `litiges.voie_de_retour`, 422 fenetre_fermee ; échéances `litiges.echeances` ; remboursement automatique selon le
  palier IFA, aucun tant que `BELIVAY_PALIER_IFA_PAR_DEFAUT = "À instruire"`), photos (preuve horodatée par le
  serveur), arrangement, recours (une fois, `recours_possible`), retrait, dépôt du retour (machine RETOUR),
  `GET /api/orders/{id}?for=dispute`, remplacement (machine REMPLACEMENT), avis par commande (AVIS-FENETRE, 403
  non_eligible, 410 fenetre_fermee), votes sur vos avis produit. Fonctions de console sans route : réponse du vendeur,
  décision, avancée du retour (`rembourser_retour`), autre vendeur (`catalogue.vendeur_suivant`).
- **À finir** : le kit ne paie rien lui-même : brancher les signaux `litige_rembourse`, `autre_vendeur_accepte`,
  `litige_ouvert` (`aftersales/signaux.py`) sur votre escrow et vos remboursements ; écrans console et vendeur.

### 2.8 Messagerie et aide — `messaging` (10 routes)
- **Prêt** : conversations (dossier, vendeur, support), messages masqués avant l'enregistrement (numéros, e-mails,
  liens, CMS-04), question au vendeur depuis la fiche, aide (SUP-HORAIRES, SUP-DELAI, état des services), FAQ
  (`charger_faq`, 8 thèmes et 48 questions depuis `site/src/demo/faq.ts`, filtrée par les interrupteurs), rappel.
- **À finir** : côté vendeur et support (répondre) ; lien WhatsApp du support (SUP-WA « à publier »).

### 2.9 Argent — `wallet` (15 routes)
- **Prêt** : portefeuille derrière FF-WALLET (registre à écritures, `portefeuille.recharger`, `retirer`,
  `retirable`, frais de retrait), numéros Mobile Money (code SMS, MTN et Orange seulement, chiffrés), cartes (jeton du
  prestataire seulement, CAP-24), factures et `invoice.pdf` (générateur PDF sans dépendance). Services :
  `crediter_remboursement` (REMB-DESTINATION), `payer_par_solde`, `carte_par_defaut`, `numero_change`.
- **À finir** : `MobileMoneyRelaya` (vos `collect` et versements) ; dans `payments/webhooks/receiver.py`, appeler
  `confirmer_recharge` / `confirmer_retrait` (instructions en tête de `wallet/services.py`) ; numérotation légale des
  factures.

### 2.10 Abonnement et cagnotte — `subscriptions` (8 routes)
- **Prêt** : derrière FF-ABONNEMENT : souscrire (409 trial_used), payer après un refus (ABO-GRACE), changer de moyen,
  résilier, reprendre, offrir (carte), verser la cagnotte ; règles de `site/src/donnees/prime.ts` portées
  (`regles.py`, 17 cas du site) ; `remise_livraison` utilisée par le paiement.
  Abonnement offert par carte avec 3-D Secure : le cadeau attend la banque (`AbonnementOffert.paiement = action`,
  422 `action_requise` avec l'adresse de la banque), puis `confirmer_cadeau` (par le point d'entrée des webhooks)
  l'applique ; refusé, jamais.
- **À finir** : tâche `prelever_echeances()` ; `crediter_cagnotte(order_id)` à appeler quand le vendeur est payé ;
  webhook → `confirmer_paiement_externe` (→ `confirmer_prelevement`) ; **souscrire / payer par carte avec 3-D
  Secure** : aujourd'hui le refus `action_requise` annule la transaction (abonnement et prélèvement non gardés) ;
  il faut un état « en attente de la banque » de l'abonnement, confirmé par le webhook (décision : l'abonnement
  commence-t-il avant la confirmation ?).

### 2.11 Listes d'envies, cadeaux, échanges — `wishlists` (23 routes)
- **Prêt** : listes (FF-LISTE-ENVIES), partage (CAP-11, LST-VALIDITE, prix relevés CLE-39), mise en statut, rappels
  (429 too_early), liste publique sans adresse, cadeau (idempotent ; 409 price_changed ; plafonds et contrôle de
  cohérence diaspora pour la carte ; code de vérification renforcée), suivi public d'un cadeau, cotiser un article ;
  échanges entre clients (recherche d'un proche limitée à 20 par jour, envois, suivi, remerciements, colis payé pour
  un proche accepté ou refusé, panier envoyé à un proche). Règles de `site/src/donnees/echanges.ts` portées.
  Toutes les occasions (`occasion`, `hotes`) et la cagnotte d'une liste de mariage (`cagnotte`, modèle
  `ParticipationCagnotte`, `POST /api/wishlists/{code}/fund` sans compte : dès 1 000 F, au plus ce qui manque).
- **À finir** : webhook Mobile Money → `wishlists.services.confirmer_paiement`.

### 2.12 Diaspora — `diaspora` (18 routes)
- **Prêt** : inscription diaspora (deux codes, âge, pays accepté), liens famille (code 24 h, invitations), livraison
  réglée par le proche, paniers entre proches (7 jours), commande pour un proche (`controleDiaspora` porté, plafonds,
  vérification renforcée par SMS, 3-D Secure, euro/dollar, jamais l'adresse du proche). Inscription par Google,
  Apple ou le numéro seul (`POST /api/auth/social/lookup`, `POST /api/auth/social/diaspora`, jeton vérifié par
  `client_accounts.verifier_jeton_identite`) ; code SMS vérifié sans compte et sans être consommé
  (`POST /api/auth/otp/verify {purpose: diaspora}`) ; proche actif « Pour qui ? » (`PUT /api/me/active-relative`,
  `Session.proche`). Code de vérification renforcée : `POST /api/auth/otp/send {purpose: diaspora-renforce}` (compte
  diaspora connecté ; le code part au numéro étranger vérifié du compte). Retour de 3-D Secure :
  `diaspora.services.confirmer_paiement(reference, reussi)` (commande « 3-D Secure à valider » → payée, ou annulée).
- **À finir** : pays de la carte confirmé par le prestataire (aujourd'hui le pays déclaré, remboursé si le prestataire
  dit autre chose).

### 2.13 Modules CL-15 — `extras` (28 routes, dont 2 a_finir)
- **Prêt** : cotisations (FF-EX02), mises de côté (FF-EX03, `cote.ts`), ventes flash (FF-FLASH : votre
  `PromotionCampaign` FLASH par le pont, sinon `OffreFlash`), rentrée (FF-EX01), panier famille (FF-EX05 : 5 kg par
  article, jamais XL, FAM-MAX-TX), reprise / troc (FF-EX04, `troc.ts`). Liste d'école sur papier
  (`POST /api/school-lists/photo`, multipart, modèle `ListePapier` ; délai annoncé `BELIVAY_RENTREE_PAPIER_HEURES`,
  24 h par défaut, à porter au registre).
- **À finir** : WhatsApp (FF-EX06, `a_finir`) ; renouvellement mensuel du panier famille ; étapes du reconditionneur de
  la reprise ; webhook → `extras.services.confirmer_paiement`.

### 2.12 bis Boîte « Reçus » — `recus` (5 routes)
- **Prêt** : `GET /api/me/inbox`, `GET /api/me/inbox/{id}` (avec les moyens du compte), `POST /api/me/inbox/{id}/actions`
  (idempotent : offrir, participer, payer, accepter, refuser, retirer ; 409 traite, 410 expire, 422 offert, montant,
  garantie, solde, moyen, diaspora), `POST /api/me/inbox/{id}/thanks`, `POST /api/me/outbox` (numéro vérifié ou
  e-mail ; sans compte, le lien public ; prix des lignes relus dans le catalogue ; 20 envois par jour). Paiement par
  le portefeuille, Mobile Money ou carte enregistrée (`apps.wallet`) ; cagnottes et cotisations par les mêmes
  services que les pages publiques.
- **À finir** : créer les envois côté serveur quand les autres apps envoient (invitation diaspora, cotisation
  envoyée, abonnement offert, code de retrait confié) — aujourd'hui le site appelle `POST /api/me/outbox` ;
  rattacher à un compte créé plus tard les envois faits à son e-mail ou son numéro.

### 2.13 bis Photos et contenus — `contenus` (3 routes)
- **Prêt** : `GET /api/content/home` (public : carrousel, catégories mises en avant, textes des ventes flash, bandeau
  de confiance, fond d'arrivée ; valeurs initiales = contenu du site), `GET /api/content/pages/{slug}` (page
  éditoriale libre), `POST /api/admin/media` (téléversement, équipe seulement). Détail : § 8.
- **À finir** : stockage des photos en production (votre `MEDIA_ROOT` ou S3) ; servir `image` dans les routes du kit
  qui rendent un `dessin` (panier, listes, flash) à partir de `pont.image()`.

### 2.14 Paramètres absents du registre
Écrits en constantes nommées, marquées `# PARAMÈTRE À AJOUTER AU REGISTRE` dans le code, à créer dans le registre
(`logique-metier/parametres-en-vigueur.json`, puis `charger_parametres`) : ABO-DOM-QUOTA, ABO-DOM-REDUCTION,
ABO-BUSINESS-RELAIS, ABO-PARRAIN-MOIS, ABO-COMPTES, ABO-CAGNOTTE-PALIERS, ABO-PASS7-JOURS ; RET-DEPOT-J,
PHOTO-TAILLE-MAX ; DONNEES-GARDE-ANS, BOUT-NOM-LONG ; LST-COTISER-DES, LST-RAPPEL-ECART, LST-RAPPELS-JOURS,
ECH-RECHERCHES-JOUR, VILLE-SERVIE ; DIA-PAYS, DIA-AGE-MIN, DIA-PLAFOND-MOIS, DIA-LIENS-MAX, DIA-DEMANDE-J,
DIA-CODE-FAMILLE-H, DIA-INVITATION-J, DIA-COHERENCE ; COT-HAUSSE-MAX, MDC-VERSEMENT-MIN, MDC-AVANT-RENTREE-J,
FAM-CLASSES-POIDS, TRC-MIN-POUR-CENT (et les coefficients d'état de la reprise).

---

## 3. Installer le kit dans relaya-marketplace

### 3.1 Copier

```bash
# depuis la racine de PG-BelivaY
cp -R moteurs/belivay_moteurs   <relaya>/backend/belivay_moteurs      # moteurs purs (aucune dépendance)
cp -R moteurs/tests             <relaya>/backend/belivay_moteurs_tests # leurs 358 tests (facultatif, couverture 100 %)
for app in client_core otp client_accounts notifications_client cart pickup aftersales messaging \
           wallet subscriptions wishlists diaspora extras recus contenus; do
  cp -R backend-kit/apps/$app <relaya>/backend/apps/$app
done
```

Aucun nom d'application ne recouvre les vôtres (`accounts`, `catalog`, `common`, `contact`, `core`, `orders`,
`payments`, `shipping`, `vendors`, `whatsapp_assistant`). Les tests sont dans `apps/<app>/tests/test_*.py` : votre
`pytest.ini` les collecte (`python_files = test_*.py`), à condition que `belivay_moteurs` soit importable
(`backend/` est déjà dans `pythonpath`). Attention à votre anomalie A1 : vos `apps/*/tests.py` ne sont pas collectés.

### 3.2 Réglages à ajouter (`backend/relaya/settings/base.py`)

```python
INSTALLED_APPS += [
    "rest_framework_simplejwt.token_blacklist",   # votre logout_view appelle blacklist() : sans elle, 500 (le site l'ignore)
    "apps.client_core", "apps.otp", "apps.client_accounts", "apps.notifications_client",
    "apps.cart", "apps.pickup", "apps.aftersales", "apps.messaging",
    "apps.wallet", "apps.subscriptions", "apps.wishlists", "apps.diaspora", "apps.extras", "apps.recus", "apps.contenus",
]
SIMPLE_JWT["BLACKLIST_AFTER_ROTATION"] = True       # possible une fois token_blacklist installée

# CORS : le site sur Vercel (autre origine que l'API) + les deux en-têtes que le site envoie
from corsheaders.defaults import default_headers
CORS_ALLOWED_ORIGINS += [o for o in os.getenv("CORS_EXTRA_ORIGINS", "").split(",") if o]   # ex. https://<projet>.vercel.app
CORS_ALLOW_HEADERS = (*default_headers, "idempotency-key", "x-device-id")
CORS_EXPOSE_HEADERS = ["Retry-After", "Idempotent-Replayed"]

# Schéma drf-spectacular : les routes du kit sont décrites par backend-kit/openapi.yaml
SPECTACULAR_SETTINGS["PREPROCESSING_HOOKS"] = ["apps.client_core.schema.sans_routes_du_kit"]

# BelivaY
BELIVAY_PARAMETRES_JSON = BASE_DIR / "apps" / "client_core" / "donnees" / "parametres-en-vigueur.json"
BELIVAY_INTERRUPTEURS_JSON = BASE_DIR / "apps" / "client_core" / "donnees" / "interrupteurs.json"
BELIVAY_SITE_URL = os.getenv("BELIVAY_SITE_URL", "https://belivay.com")
BELIVAY_CLASSE_PAR_DEFAUT = None                     # décision D3
BELIVAY_CREER_COMMANDE = "apps.cart.commande.creer_commande_simple"   # à remplacer : décision D8
BELIVAY_SMS = "apps.otp.prestataires.SmsConsole"     # à remplacer par le prestataire SMS
BELIVAY_PUSH = "apps.notifications_client.prestataires.PushConsole"
BELIVAY_CARTE = "apps.wallet.prestataires.CarteConsole"
BELIVAY_MOBILE_MONEY = "apps.wallet.prestataires.MobileMoneyConsole"  # à brancher sur payments.collect : D9
```

`ROOT_URLCONF` (`backend/relaya/urls.py`), une ligne, n'importe où dans `urlpatterns` :

```python
path("api/", include("apps.client_core.urls_api")),
```

nginx route déjà `/api/` vers Django : rien à changer.

**Autre possibilité pour CORS** : servir le site et l'API depuis la même origine (réécriture Vercel
`/api/(.*)` → `https://belivay.com/api/$1`, ou le site derrière votre nginx). Le site envoie alors aussi
`X-Device-Id` (panier d'un visiteur) ; sur une autre origine, il ne l'envoie que si l'en-tête est permis.

### 3.3 Migrations et données de départ

```bash
python manage.py migrate                      # crée les tables du kit (aucune table existante n'est modifiée)
python manage.py charger_parametres --verifier   # lit le registre avec les moteurs, n'écrit rien
python manage.py charger_parametres           # remplit ParametreMetier (comme seed_financial_config)
python manage.py charger_contenus             # contenus de l'accueil (déjà faits par la migration contenus 0002)
```

Puis, dans l'admin Django : `Interrupteurs de module` (sinon les valeurs de `interrupteurs.json` : DP-50, tout
ouvert), `Fiches logistiques des produits` (classe de colis de chaque produit : décision D3), `Horaires des relais`
(décision D13). Tâches quotidiennes à planifier (cron ou Celery beat) : `manage.py purger_idempotence`, et les tâches
listées par domaine au § 2 (rappels de garde S0 à S5, expiration des demandes, échéances des litiges…).

Les migrations livrées ont été générées dans le projet d'essai. Si vous préférez, supprimez-les et lancez
`python manage.py makemigrations <app>` chez vous : elles seront identiques (aucune dépendance vers vos applications).

### 3.4 Variables d'environnement

| Variable | Rôle | Existe chez vous |
|---|---|---|
| `PAYMENTS_ENCRYPTION_KEY`, `PAYMENTS_ENCRYPTION_KEY_OLD`, `PAYMENTS_FINGERPRINT_SALT` | chiffrement des numéros et adresses du kit (même clé que les vôtres) | oui |
| `FRONTEND_URL`, **`CORS_EXTRA_ORIGINS`** | origine(s) du site client (Vercel) | `FRONTEND_URL` oui |
| **`BELIVAY_SITE_URL`** | liens envoyés par e-mail (mot de passe oublié, cadeaux, listes) | non |
| `EMAIL_*`, `DEFAULT_FROM_EMAIL` | codes et liens par e-mail | oui |
| **`SMS_FOURNISSEUR`, `SMS_CLE_API`, `SMS_EXPEDITEUR`** | codes à 6 chiffres, rappels de garde (prestataire « à désigner », SMS-SECOURS) | non |
| **`VAPID_CLE_PUBLIQUE`, `VAPID_CLE_PRIVEE`, `VAPID_SUJET`** ; **`FCM_CREDENTIALS`** | notifications push du site (Web Push) et de l'application (FCM) | non |
| **`CARTE_CLE_SECRETE`, `CARTE_SECRET_WEBHOOK`** | prestataire carte (PAY-CARTE-PSP : CinetPay, Flutterwave en secours), 3-D Secure, Apple Pay, Google Pay | non |
| `CAMPAY_TOKEN_*`, `CAMPAY_WEBHOOK_KEY` | Mobile Money (déjà chez vous : le kit passe par votre `payments`) | oui |
| `GOOGLE_CLIENT_ID`, `APPLE_*` | lier Google ou Apple à un compte (`/api/me/identities`) | oui |

### 3.5 Prestataires : ce qui reste « console »

Chaque prestataire est une petite interface avec une version « console » (développement, essais : rien ne part,
tout est journalisé sans jamais écrire un code) :

| Interface | Fichier | À écrire |
|---|---|---|
| SMS / WhatsApp (`Sms.envoyer`) | `apps/otp/prestataires.py` | le prestataire SMS choisi (SMS-SECOURS « à désigner ») |
| Push (`Push.envoyer`) | `apps/notifications_client/prestataires.py` | Web Push (pywebpush + VAPID) et FCM ; CAP-19 vérifié avant tout envoi |
| Carte (`Carte.enregistrer/payer/rembourser/taux_usd`) | `apps/wallet/prestataires.py` | CinetPay / Flutterwave : champ sécurisé côté site, jeton côté serveur, 3-D Secure, webhooks signés (CAP-10) |
| Mobile Money (`MobileMoney.demander/verser`) | `apps/wallet/prestataires.py` | **ne pas réécrire** : appeler votre `payments/application/collect.initiate_collect` et vos versements ; vos webhooks CamPay appellent les services du kit (`confirmer_paiement`, `echouer_paiement`, `confirmer_recharge`…) |

---

## 4. Basculer le site sur le serveur

Le site lit tout par `Source` (`site/src/donnees/source.ts`) ; `VITE_SOURCE` choisit la démonstration ou le serveur.

```bash
# site/.env.local, ou Vercel → Settings → Environment Variables
VITE_SOURCE=api
VITE_API_URL=https://belivay.com/api      # ou « /api » si même origine (réécriture)
```

1. Aujourd'hui, avec `VITE_SOURCE=api`, 218 méthodes sur 222 sont branchées (207 complètes, 11 « partielles » sur vos
   routes existantes) ; 4 lèvent `NonDisponible` (`site/CONNECTEURS.md`) : connexion et liaison Google / Apple,
   identité du fournisseur pour l'inscription diaspora (SDK Google Identity Services / Sign in with Apple côté site),
   biométrie (WebAuthn). Les routes WhatsApp (FF-EX06) répondent `501 a_finir`. Le site gère partout les réponses spéciales : 409
   `price_changed` au paiement → écran « Un prix a changé » ; 422 `action_requise` → page de la banque
   (`data.redirection`, https) ; 401 → session fermée, connexion puis retour à la page ; 429 → « réessaie dans X s »
   (en-tête `Retry-After`, posé aussi par le kit sur ses propres 429) ; hors ligne → message réseau
   (`site/src/api/reponses-speciales.ts`, `site/src/composants/AvisErreurs.tsx`).
2. Pour chaque route du kit mise en service, brancher la méthode dans son domaine (`site/src/api/domaines/*.ts`, assemblés par `source-api.ts`) : appel du chemin du contrat
   (réponse déjà au format du site), puis passer son état à `branche` dans `site/src/api/routes.ts` (le test
   `tests/connecteurs.spec.ts` le vérifie) et régénérer `CONNECTEURS.md` (`outils/connecteurs.mjs`).
3. Si `routes.ts` change, régénérer le contrat : `cd backend-kit/outils && npm install && node node_modules/.bin/tsx
   generer-openapi.mts` (sans Node : `uvx --from nodejs-wheel node …`), puis
   `uvx --from openapi-spec-validator openapi-spec-validator ../openapi.yaml`. Le test `test_contrat.py` dit alors
   quelles routes manquent côté serveur.

---

## 5. Ordre des chantiers

Chaque lot se livre avec ses migrations et ses tests ; les moteurs ne changent pas. (Même découpage que le plan
d'intégration de `moteurs/CORRESPONDANCE-RELAYA.md` § 10, appliqué au kit.)

1. **Socle** : copier `belivay_moteurs` et `client_core`, réglages du § 3.2 (dont `token_blacklist` et CORS),
   `migrate`, `charger_parametres`, ajouter `moteurs/tests` à la CI (3.11). Basculer `session()` du site sur
   `GET /api/config/flags`.
2. **Compte** : `otp`, `client_accounts`, `notifications_client` ; prestataire SMS ; Web Push. Le site peut alors
   brancher numéro, profil, adresses, sécurité, réglages (≈ 45 méthodes).
3. **Panier et commande** : `FicheLogistique` remplie (D3), `cart` et `pickup` ; remplacer
   `creer_commande_simple` par votre circuit (D8) ; brancher vos webhooks CamPay sur `confirmer_paiement` /
   `echouer_paiement` (D9) ; servir `vue_commande_client` (D14). C'est le lot qui remplace `_compute_delivery_price`.
4. **Retrait** : événements des livreurs et relais → sous-commandes et groupes de remise ; horaires structurés ; tâche
   des rappels et du renvoi (garde).
5. **Après-vente** : `aftersales`, `messaging` ; signaux de remboursement vers l'escrow ; console (décisions).
6. **Argent du client** : `wallet` (moyens, cartes, factures tout de suite ; portefeuille quand FF-WALLET s'ouvre,
   D4), prestataire carte (CinetPay / Flutterwave).
7. **Modules** dans l'ordre d'ouverture des interrupteurs : `wishlists` et `diaspora` (carte requise), `subscriptions`
   (ABO-ACTIVATION : 2e ou 3e trimestre), `extras`.

---

## 6. Décisions à prendre

Décisions prises dans le kit, à confirmer (porteur et équipe relaya). Chacune est réversible sans toucher aux moteurs.

| # | Sujet | Choix du kit | Autre possibilité |
|---|---|---|---|
| D1 | Format des réponses | types de `source.ts` tels quels (camelCase, dates en ms) | snake_case et ISO 8601 (CAP-07) : il faudrait des adaptateurs côté site |
| D2 | Liens vers vos modèles | identifiants entiers + `pont.py` (aucune migration dépendante) | ForeignKey vers `catalog.Product`, `orders.Order`… une fois stabilisé |
| D3 | Classe de colis | table `FicheLogistique` ; produit sans fiche refusé au panier (422) | champ sur `Product`, ou classe par défaut (`BELIVAY_CLASSE_PAR_DEFAUT`) |
| D4 | FF-WALLET au lancement | ouvert (DP-50, comme le site) | fermé côté serveur (votre choix réglementaire, `payments/config` 493-496) |
| D5 | Paramètres | `ParametreMetier` modifié dans l'admin, version figée par commande | sous `VersionedConfig` / `ConfigChangeRequest` (quatre yeux, N3 pour l'argent), avec historique pour recalculer à la version du paiement |
| D6 | Identifiant d'un colis dans les routes | « 52018-2 » (commande-numéro) | identifiant propre de la sous-commande |
| D7 | Format d'erreur CAP-04 | vues du kit seulement | partout (`REST_FRAMEWORK["EXCEPTION_HANDLER"]`), après accord de vos autres clients (vendeur, relais, livreur) |
| D8 | Création de la commande | `BELIVAY_CREER_COMMANDE` (par défaut : écriture directe d'Order et OrderItem) | votre `OrderCreateSerializer` + `checkout_v2.prepare_payment`, avec les montants du moteur |
| D9 | Mobile Money, remboursements | interfaces du kit ; à brancher sur `payments` (collect, refunds, webhooks) | — (ne pas dupliquer votre domaine financier) |
| D10 | Une commande = une sous-commande par boutique | tables du kit à côté d'Order | entité SousCommande chez vous (CORRESPONDANCE § 4) |
| D11 | Palier IFA acheteur | absent : aucun remboursement automatique, comptoir sans « IFA négatif » | règles de palier sur `TrustScoreProfile` (point 11.1 et 11.3 à arbitrer) |
| D12 | Panier carte > 150 000 F | refusé (422 over_cap) | découpage en plusieurs commandes (CET-16, `carte.payer_par_carte` le calcule déjà) |
| D13 | Horaires des relais | table `HorairesRelais` ; à défaut 8 h – 19 h tous les jours | horaires structurés sur `RelayPointProfile` |
| D14 | CommandeClient (`commandes()`) | `pickup.services.vue_commande_client` à servir | champ `espace_client` dans votre `OrderDetailSerializer`, ou nouvelle route `GET /api/me/orders` |
| D15 | Préfixe | `/api/` comme vous | `/api/v1` (CAP-01) |
| D16 | Version de Django | 5.1 (vos bornes) | 5.2 LTS : 5.1 n'a plus de correctifs de sécurité (votre anomalie A14) |
| D17 | Statut de `POST /api/checkout` | 200 avec la CommandePassee | 202 (routes.ts l'annonce) |
| D18 | Panier d'un visiteur | compte obligatoire | panier par `X-Device-Id` (CAP-02), fusionné à la connexion |

Décisions de détail prises par domaine (à relire avec le code ; chacune est commentée là où elle s'applique) :
- **Compte** : fenêtre des parcours à deux codes = 2 × OTP-DUREE ; suppression = pseudonymisation ; WhatsApp exige
  consentement et FF-WHATSAPP-CANAL ; heures calmes par défaut 22 h – 7 h (le site : 21 h) ; `DELETE /devices/{id}`
  accepte aussi le sha256 de l'adresse push ; boutique : seul « nom pris » est un 409.
- **Litiges** : retrait d'un dossier et retour du colis à « remise » ajoutés aux machines (absents de `etats.py`) ;
  remboursement automatique seulement pour le souhait « rembourse » ; « jamais reçu », « il manque », « pas
  commandé », « autre » traités comme « non conforme » ; `POST /orders/{id}/replacement` accepte aussi « LIT-… » ;
  `GET /orders/{id}` sans `?for=dispute` → 400.
- **Argent** : une recharge rend `ok` dès la demande (crédit à la confirmation) ; frais de retrait affichés 0 si le
  retrait serait refusé ; biométrie non vérifiée côté serveur ; `POST /me/moyens-paiement` envoie le code et rend
  `{ok, envoi}` (le site n'appelle plus `envoyerCode` après ; « Renvoyer le code » seulement) ; type `payePar.operateur` des factures à
  élargir côté site (Carte, Apple Pay…) ; le champ `carte` de `offrirAbonnement` doit devenir un jeton (le site envoie
  aujourd'hui un libellé).
- **Diaspora et listes** : pays de la carte = pays déclaré puis contrôlé ; codes FAM-/INV- à 4 caractères limités à
  10 essais par heure ; la commande d'un cadeau est au nom du destinataire ; un panier de proche se paie au prix du
  jour ; une hausse de cotisation jusqu'à 5 % est prise par BelivaY.
- **Site** : `ajouterCarte` envoie aujourd'hui le numéro de carte (`NouvelleCarte`) : il doit envoyer le jeton du
  champ sécurisé du prestataire (CAP-24), comme le contrat le demande.

---

## 7. Vérifier le kit soi-même

```bash
cd backend-kit/_essai
~/.local/bin/uv sync --python 3.11              # Django 5.1, DRF 3.14, simplejwt, drf-spectacular, Pillow (mêmes bornes que vous)
.venv/bin/python manage.py migrate              # SQLite, toutes les migrations du kit
./lancer-tests.sh -q                            # tous les tests du kit + le test du contrat
.venv/bin/python manage.py makemigrations --check --dry-run --noinput
cd .. && uvx ruff check apps && uvx --from openapi-spec-validator openapi-spec-validator openapi.yaml
```

`_essai/stubs/apps/` contient des bouchons de vos applications (mêmes étiquettes, seuls les champs que le kit lit,
avec leurs vrais noms) : ce n'est pas du code à copier.

---

## 8. Photos et contenus remplaçables

Le site garde le design du prototype (DP-54) ; l'équipe change **les photos et les textes éditoriaux sans toucher au
code**. Sans photo, ou si une photo ne se charge pas, l'écran montre le dessin du prototype : rien ne casse.

### 8.1 Ce qui se remplace, et où

| Quoi | Où le changer | Champ servi au site |
|---|---|---|
| Photos des produits | chez vous : `ProductImage` / `ProductMedia` (`is_primary` d'abord) | `images[]` du produit (`site/src/api/adaptateurs.ts`, `photosProduit`) : `image_url` ou `url`, `alt_text`, `srcset` s'il existe |
| Photo d'un relais, logo de boutique | chez vous (`RelayPointProfile.photo_url` ou `image_url`, profil vendeur) | `image` du relais / de la boutique |
| Carrousel de l'accueil (6 bandeaux) | admin → *Contenus et photos* → *Carrousel de l'accueil* | `carrousel[]` : `lien`, `titre`, `sous[]`, `produits`, `image` |
| Catégories mises en avant (pastilles) | admin → *Catégories mises en avant* (la 1re est active) | `categories[]` |
| Ventes flash (titre, sous-titre), titre du bandeau de confiance, fond de l'écran d'arrivée | admin → *Réglages de l'accueil* (une seule ligne) | `flash`, `confiance.question/marque`, `fondArrivee` |
| Bandeau « Pourquoi choisir BelivaY ? » | admin → *Bandeau de confiance* (icône Lucide, ton `""` ou `o`) | `confiance.cartes[]` |
| Page éditoriale libre (à propos, presse…) | admin → *Pages de contenu* (Markdown, langue, publiée) | `GET /api/content/pages/{slug}?lang=` |
| FAQ | admin → *Thèmes / questions FAQ* (`apps.messaging`, `charger_faq`) | `GET /api/help/faq` (déjà branché) |
| Textes légaux (CGU, confidentialité, retours) | admin → textes légaux (`apps.client_accounts`, `charger_legal`) | `GET /api/legal/{doc}` |

Désactiver une ligne (`actif`) la retire ; `ordre` les trie. **Une rubrique vide** (aucune ligne active) sert le
contenu d'origine (`apps/contenus/donnees/accueil.json`, copie de `site/src/donnees/contenus.ts`) ;
`manage.py charger_contenus --remplacer` revient au contenu d'origine. Le site lit `GET /api/content/home` une fois
par visite et, si la route échoue, garde le contenu d'origine (`site/src/api/domaines/contenus.ts`).

### 8.2 Téléverser une photo

- **Admin Django** → *Photos* → *Ajouter* : fichier **ou** adresse externe (CDN), texte alternatif. Puis choisir la
  photo dans le bandeau, la catégorie ou les réglages (champ `image`, recherche par texte alternatif).
- **API** (outil interne, console) : `POST /api/admin/media`, `multipart/form-data` (`fichier`, `alt`), compte
  `is_staff` (sinon 403) → `{id, url, srcset?, alt?}`. Refus : `422 photo_type` (autre que JPEG, PNG, WebP, AVIF),
  `422 photo_taille` (plus de 8 Mo).
- **Format servi** (toutes les photos, partout) : `{"url": "https://…/robe.jpg", "srcset": "…-320.webp 320w,
  …-640.webp 640w, …-960.webp 960w, …/robe.jpg 1600w", "alt": "Robe en wax"}` ; `srcset` et `alt` facultatifs ;
  adresses absolues.
- **Variantes (srcset)** : WebP 320, 640, 960 et 1600 px de large (jamais plus large que l'original), générées au
  téléversement **si Pillow est installé** (il l'est chez vous pour `ImageField`) ; sans Pillow, la photo seule.
  Le site affiche `<img loading="lazy" decoding="async" srcset sizes alt>` et revient au dessin en cas d'erreur.

### 8.3 Tailles conseillées

| Emplacement | Rapport | Taille de l'original | Poids visé |
|---|---|---|---|
| Bandeau du carrousel, bannière d'univers | 16:9 (recadré au centre) | 1600 × 900 px | < 250 Ko |
| Fond de l'écran d'arrivée (grand écran, moitié gauche) | portrait 3:4 | 1200 × 1600 px | < 300 Ko |
| Photo produit (fiche, galerie) | carré 1:1, fond clair | 1200 × 1200 px | < 200 Ko |
| Vignette de catégorie, pastille | carré 1:1 | 320 × 320 px | < 40 Ko |
| Photo de relais | 4:3 | 1200 × 900 px | < 200 Ko |

Le site recadre (`object-fit: cover`) : garder le sujet au centre. JPEG ou WebP qualité 80 ; pas de texte dans
l'image (il ne se traduit pas : le texte est dans les champs).

### 8.4 Cache

- `GET /api/content/home` et `/api/content/pages/{slug}` : `Cache-Control: public, max-age=300,
  stale-while-revalidate=3600` (navigateur et CDN). Un changement dans l'admin est visible **en 5 minutes au plus**
  (une nouvelle visite du site relit la route). Pour l'immédiat : purger `/api/content/*` au CDN.
- Photos : fichiers à nom unique (Django ajoute un suffixe si le nom existe) ; servez `MEDIA_URL` avec un cache long
  (`Cache-Control: public, max-age=31536000, immutable` dans nginx). **Pour remplacer une photo, téléversez-en une
  nouvelle** et choisissez-la : ne réécrivez pas un fichier existant (il resterait en cache).
- Réglages : `MEDIA_URL` / `MEDIA_ROOT` (déjà chez vous) ou un stockage S3 (`STORAGES["default"]`) ; le kit passe
  par `default_storage`.

---

## 9. Lancer le site contre le kit en local

Le **serveur d'essai** (`_essai/`, réglages `config.settings_serveur`) sert le site comme le ferait relaya avec le
kit installé : toutes les routes du kit, plus une **imitation de vos routes existantes** que le site appelle
(`_essai/relaya_essai` : `/api/auth/…`, `/api/catalog/products/…`, `/api/orders/…`, `/api/shipping/relay-points/…`,
`/api/contact/`, mêmes chemins et mêmes champs que vos sérialiseurs). Ce dossier n'est **pas à copier** : chez vous,
ces routes existent déjà. Base SQLite à part (`essai-serveur.sqlite3`), photos dans `_essai/mediafiles/`.

```bash
# 1. Serveur d'essai (port 8010) : migrations, paramètres, textes légaux, FAQ, contenus, jeu de démo, runserver
cd backend-kit/_essai
~/.local/bin/uv sync --python 3.11
./lancer-serveur.sh 8010
#   équivaut à :
#   export DJANGO_SETTINGS_MODULE=config.settings_serveur
#   .venv/bin/python manage.py migrate --noinput
#   .venv/bin/python manage.py charger_demo          # charger_parametres, charger_legal 1.0, charger_faq, charger_contenus
#   .venv/bin/python manage.py runserver 8010 --noreload

# 2. Le site en mode API (port 5180, à côté du serveur de la démonstration sur 5173)
cd site
VITE_SOURCE=api VITE_API_URL=http://localhost:8010/api npx vite --port 5180 --strictPort
#   → http://localhost:5180 ; comptes du jeu de démo : carine@gmail.com, bertrand.essomba@gmail.com,
#     herve.mbarga@gmail.com (diaspora, France, relié à Carine), equipe@belivay.test (is_staff : photos) ;
#     mot de passe : DEMO_MOT_DE_PASSE de _essai/relaya_essai/management/commands/charger_demo.py

# 3. Les parcours de bout en bout contre ce serveur (lance 1 et 2 s'ils ne tournent pas)
cd site && npx playwright test -c pw-api.config.ts
```

- **Jeu de démo** (`charger_demo`, idempotent) : les 30 produits de la démonstration (`site/src/demo/catalogue.ts`,
  exportés dans `_essai/relaya_essai/donnees/catalogue.json` par `npx tsx outils/catalogue-essai.mts` dans `site/`)
  avec prix, prix barré, stock, classe de colis (`FicheLogistique`), catégorie et boutique ; les relais Mvog-Ada,
  Essos, Bastos, Mokolo ; Carine (numéro vérifié, relais Mvog-Ada), Bertrand, Hervé (compte diaspora) ; deux photos
  dessinées par Pillow (premier bandeau de l'accueil avec ses variantes WebP, photo du Tecno Camon 30).
- **CORS** : `localhost` et `127.0.0.1` sur 5173, 5180, 4173, 4174 (+ `CORS_EXTRA_ORIGINS`), en-têtes
  `idempotency-key` et `x-device-id`, `Retry-After` exposé — les réglages du § 3.2.
- **Prestataires** : versions « console ». Ce qu'ils feraient pour de vrai passe par des **routes réservées à
  l'essai** (`BELIVAY_ESSAI_ROUTES = True`, jamais en production ; `_essai/relaya_essai/essai.py`) :

| Route d'essai | Ce qu'elle remplace |
|---|---|
| `GET /api/_essai/codes?destination=677112241` (ou une adresse e-mail) | le SMS ou l'e-mail reçu : dernier code envoyé |
| `GET /api/_essai/paiements` | les demandes vues par l'agrégateur Mobile Money et le prestataire carte |
| `POST /api/_essai/paiements/confirmer {reference \| commande, reussi}` | le webhook CamPay / carte → `client_core.webhooks.confirmer_paiement_externe` |
| `GET·POST /api/_essai/3ds/{reference}` | la page de la banque (3-D Secure) : « Valider » confirme puis revient au site (`BELIVAY_SITE_URL`) |
| `POST /api/_essai/commandes/{ref}/avancer {jusqua: confirmee\|prete\|collectee\|arrivee}` | vendeur, livreur, relais → `pickup.evenements.avancer` |
| `POST /api/_essai/commandes/{ref}/remettre {code}` | la remise au comptoir → `pickup.evenements.remettre_au_client` |
| `POST /api/_essai/produits/{id}/prix {prix}` | le vendeur qui change son prix (409 `price_changed` au paiement) |
| `POST /api/_essai/limites` | remise à zéro des compteurs de débit (cache) |

- La carte « console » demande 3-D Secure pour le jeton `tok_3ds` (adresse `https://3ds.exemple/<référence>` ; les
  tests la renvoient vers la page de banque d'essai) et refuse `tok_refus`.
- Le serveur garde ses données d'un lancement à l'autre ; pour repartir de zéro : supprimer
  `_essai/essai-serveur.sqlite3` (et `_essai/mediafiles/`), puis relancer `./lancer-serveur.sh`.

