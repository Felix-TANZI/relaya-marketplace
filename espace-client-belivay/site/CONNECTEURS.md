# Connecteurs : du site au serveur

Ce document dit, pour chaque donnée du site, d'où elle viendra quand la démonstration sera retirée : la route du
serveur **relaya-marketplace** (Django 5.1, DRF, simplejwt, en production sur belivay.com) qui la sert déjà, ou
celle qu'il faut créer. Il liste aussi les services externes (SMS, paiement, cartes…), qui les fournit et leurs
variables d'environnement.

- **Instantané lu** : relaya-marketplace, commit `9546ffe` (3 oct. 2026), en lecture seule.
- **Routes à créer** : noms de la spécification (`logique-metier/api.json`, CL-02), sous `/api/`.
- **Règles de calcul** : côté serveur, dans `../moteurs/` (voir `../moteurs/CORRESPONDANCE-RELAYA.md`).

## 1. Basculer de la démonstration au serveur

| Variable | Démonstration (défaut) | Serveur |
|---|---|---|
| `VITE_SOURCE` | `demo` (ou absente) | `api` |
| `VITE_API_URL` | inutile | `https://belivay.com/api` (ou `/api` derrière un mandataire, même origine) |

Rien d'autre ne change : les pages appellent `source` (`src/donnees/source.ts`), qui est la démonstration
(`src/demo/source-demo.ts`) ou le serveur (`src/api/source-api.ts`) selon `VITE_SOURCE`. Une valeur invalide, ou
`api` sans adresse, arrête le démarrage avec un message clair (`src/config/env.ts`). Toutes les variables sont
dans `.env.example`.

```
pages ──► source (interface Source, ~190 méthodes)
             ├─ demo : src/demo/source-demo.ts (localStorage)
             └─ api  : src/api/source-api.ts (assemblage) ──► domaines (src/api/domaines/*.ts) ──► adaptateurs (src/api/adaptateurs.ts)
                                              └─► client HTTP (src/api/client.ts) ──► relaya-marketplace
```

Réponses spéciales du serveur, traitées pareil quel que soit l'écran (`src/api/reponses-speciales.ts`,
`src/composants/AvisErreurs.tsx`) : 409 `price_changed` au paiement → écran « Un prix a changé » ; 422
`action_requise` → page de la banque (3-D Secure, `data.redirection` en https) ; 401 → session fermée, connexion puis
retour à la page ; 429 → « réessaie dans X s » (`Retry-After`) ; hors ligne → message réseau. Vérifié contre le vrai
serveur (projet d'essai du kit) par `npx playwright test -c pw-api.config.ts` (`backend-kit/REPRISE-BACKEND.md` § 9).

Une méthode sans route côté serveur lève `NonDisponible('methode', 'route attendue')` : l'écran le sait, le message
dit quoi créer. Le registre `src/api/routes.ts` est la seule vérité : il écrit le tableau de la section 3
(`node outils/connecteurs.mjs`) et le test `tests/connecteurs.spec.ts` vérifie que chaque méthode de `Source` y est,
et que « branché » dans le registre veut bien dire « appel réel » dans le code. Une méthode ajoutée à `Source` sans
connecteur ne compile pas.

## 2. Client HTTP et conventions

| Sujet | Le site (`src/api/client.ts`) | relaya-marketplace aujourd'hui | À faire côté serveur |
|---|---|---|---|
| Connexion | `POST /api/auth/login/ {username, password}` (e-mail, nom ou numéro) | `TwoFactorTokenObtainPairView` ; `{access, refresh}` ou `{2fa_required}` | Essais restants et blocage de 15 min (CIN, CAP-16) ; limite actuelle 5/min par IP |
| Jetons | `Authorization: Bearer <accès>` ; sur un 401, **un seul** `POST /api/auth/refresh/ {refresh}` à la fois, puis la requête est rejouée une fois ; refus → jetons effacés, événement `blv:session-perdue` | simplejwt : accès 1 h, rafraîchissement 7 j, rotation (`ROTATE_REFRESH_TOKENS`) ; la route est `/api/auth/refresh/`, pas `/api/token/refresh/` | `rest_framework_simplejwt.token_blacklist` n'est pas dans `INSTALLED_APPS` alors que `logout_view`, `revoke_session` et `revoke_all_sessions` l'utilisent : **à vérifier** (risque de 500 ; le site ignore l'erreur à la déconnexion) |
| Stockage des jetons | `localStorage` avec « Se souvenir de moi », sinon `sessionStorage` | — | Décision 1 (section 5) |
| Idempotence | `Idempotency-Key` sur les paiements et actions d'argent (option `idempotence`), jamais de nouvelle tentative automatique sur une écriture | en-tête non lu (seul Campay reçoit `external_reference`) | Middleware : même clé → même réponse (CAP-03) |
| Nouvelles tentatives | GET seulement : panne réseau, délai, 502/503/504, 429 avec `Retry-After` ≤ 5 s ; `VITE_API_TENTATIVES` (2) | — | — |
| Délai | `VITE_API_DELAI_MS` (15 s) par requête | — | — |
| Erreurs | Classes typées : `ErreurReseau`, `ErreurDelai`, `ErreurNonAuthentifie` (401), `ErreurInterdit` (403), `ErreurIntrouvable` (404), `ErreurConflit` (409), `ErreurValidation` (400/422, erreurs **par champ**), `ErreurTropDeRequetes` (429), `ErreurServeur` (5xx), `NonDisponible` | format DRF : `{"detail": …}` ou `{"champ": [...]}` en 400 ; transitions refusées en 400 | `{error: {code, message, data}}` et 409 pour les conflits (CAP-04) ; le site comprend déjà les deux formats |
| Langue | `Accept-Language` : `fr`, ou `en, fr;q=0.8` (langue de la page) | `LANGUAGE_CODE = "fr"` ; notifications traduites selon `Accept-Language` | Traduire tous les textes renvoyés (CAP-08) |
| Appareil | `X-Device-Id` (identifiant tiré une fois, gardé sur l'appareil), envoyé seulement quand le site et l'API ont la même origine | non lu | Panier d'un visiteur (CAP-02) |
| CORS | — | `django-cors-headers`, origines : `FRONTEND_URL`, belivay.com, localhost:5173-5179 ; en-têtes permis (relevé le 4 oct. 2026) : `accept, authorization, content-type, user-agent, x-csrftoken, x-requested-with` ; une autre origine (ex. la démo sur Vercel) n'est pas permise | Si le site n'est pas servi depuis belivay.com : ajouter son origine **et** `idempotency-key`, `x-device-id` à `CORS_ALLOW_HEADERS`, sinon le navigateur bloque la requête (décision 2) |
| Pagination | lit une liste ou une page DRF (`results`) | numéros de page (catalogue : 20, `page_size` ≤ 100) ; la plupart des listes ne sont pas paginées | Curseur (CAP-05) |
| Préfixe | `VITE_API_URL` contient `/api` | `/api/…`, sans version (sauf `payments/v2`) | `/api/v1` recommandé (CAP-01), à trancher |
| Journal | hors production : `[api] GET /auth/me/ → 200 (84 ms)` (jamais les corps ni les jetons) | — | — |

Identifiants : une commande relaya a un identifiant entier ; le site l'affiche `BLV-<id>` et le relit dans l'adresse
(`refCommande`, `idCommande`). Un produit est désigné par son identifiant (`/api/catalog/products/{id}/`) en
attendant le produit maître (`/api/products/{maitre}`).

## 3. Méthodes de la source, par domaine

États : **branché** (appel réel, format converti sans perte) ; **branché, partiel** (appel réel, mais des champs
de l'écran n'existent pas encore côté serveur : ils reçoivent une valeur neutre, 0, vide ou faux, listée dans la
note) ; **à créer côté serveur** (la méthode lève `NonDisponible`) ; **à finir côté site** (la route existe, il
manque un SDK ou un réglage de l'appareil) ; **démonstration seulement** (simulation sans objet en production).

<!-- connecteurs:debut -->

222 méthodes : **207 branchées**, **11 branchées en partie** (champs manquants côté serveur), **0 à créer côté serveur**, 4 à finir côté site, 0 propre à la démonstration.

### Session, menu et compte (4/4 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `session` | branché, partiel | GET /api/auth/me/ · GET /api/auth/notifications/ · GET /api/cart · GET /api/orders/my-orders/ · GET /api/config/flags · GET /api/me | → Session | Interrupteurs : GET /api/config/flags (kit) ; relais habituel : GET /api/me (kit). Manquent : horaire du jour en mots du relais, chiffres du bandeau (quartiers exploités, seuil de retrait offert), type de compte, devise et proche actif (diaspora). À terme un seul GET /api/me (CL-02). |
| `menu` | branché | GET /api/me/menu | → DonneesMenu (promotions, univers et compteurs réels, portefeuille, commandes, litiges, messages, heures du support) |  |
| `entete` | branché | aucune | → null | Provisoire : en production chaque écran lit son titre dans ses propres données (« Ma commande · BLV-… »). |
| `compte` | branché | GET /api/me | → DonneesCompte (compteurs, portefeuille, palier, relais, adresse principale, moyens, avis à donner, boutique) | Kit : apps/client_accounts (donnees_compte). Le scénario « nouveau » est propre à la démonstration. |

### Connexion et inscription (8/9 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `connecter` | à finir côté site | POST /api/auth/google/ {credential} · POST /api/auth/apple/ {identity_token, authorization_code} | → {access, refresh, created} ou {2fa_required} | Routes existantes. Manque côté site : Google Identity Services (VITE_GOOGLE_CLIENT_ID) et Sign in with Apple JS (VITE_APPLE_CLIENT_ID) pour obtenir le jeton. |
| `compteConnu` | branché | aucune (mémoire de l'appareil) | → prénom et e-mail masqué du dernier compte retenu | Google One Tap (FedCM) pourra le compléter. |
| `compteRetenu` | branché | aucune (mémoire de l'appareil) | → {emailMasque} si un jeton de rafraîchissement est gardé |  |
| `reprendreCompte` | branché | POST /api/auth/refresh/ {refresh} | → {access, refresh} puis session() |  |
| `connecterEmail` | branché | POST /api/auth/login/ {username: e-mail, password} | → {access, refresh} ; 401 → incorrect ; 429 → bloqué | Le serveur ne renvoie pas les essais restants (CIN : 5 essais puis 15 min) ; limite actuelle 5/min par IP. La 2FA par e-mail (2fa_required) n'a pas d'écran. |
| `inscrire` | branché | POST /api/auth/register/ {username, email, password, password2, first_name} puis POST /api/auth/login/ | → 201 utilisateur, puis jetons | Spécification : POST /auth/email {mode: signup} (409 e-mail pris). |
| `deconnecter` | branché | POST /api/auth/logout/ {refresh} | → 200 | Révoquer aussi le jeton de notifications (DELETE /api/devices, CAP-17). |
| `demanderLienMdp` | branché | POST /api/auth/password/forgot {email} | → 202 {destination, valideMinutes} | Toujours 202, que le compte existe ou non (CAP-16) ; lien à usage unique (MDP-LIEN), envoyé par e-mail (/mdp-nouveau?jeton=…). email null : le compte retenu sur l’appareil. |
| `nouveauMotDePasse` | branché | POST /api/auth/password/reset {jeton, mot_de_passe} | → 200 {ok, email masqué} \| 422 regle \| 410 expire (lien utilisé, remplacé ou expiré) \| 404 invalide | Page /mdp-nouveau du lien reçu par e-mail. Jeton à usage unique, 30 min ; règle DP-04 (8 caractères dont un chiffre) refaite côté serveur ; succès : les autres sessions sont révoquées. |

### Profil, numéro et codes (10/10 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `envoyerCode` | branché | POST /api/auth/otp/send {purpose, destination?, canal: sms\|whatsapp} | → 202 EnvoiCode (destination masquée, valideMinutes, renvoiSecondes) | purpose = l’objet du site (profil, email-sms, email-adresse, numero-ancien, numero-nouveau, moyen, suppression) ; sans destination : le numéro vérifié du compte. Prestataire SMS : console dans le kit (à désigner). |
| `verifierPremierNumero` | branché | POST /api/auth/otp/verify {numero, code} | → ResultatCode (client \| essaisRestants \| bloqueJusqua) \| 409 utilise | relaya : POST /api/auth/phone/validate/ normalise le numéro sans le vérifier. |
| `verifierNouvelEmail` | branché | POST /api/me/email/check {email} | → 200 \| 409 pris \| 422 meme |  |
| `confirmerProfil` | branché | PATCH /api/me {prenom, nom, photo, code} | → client | relaya : PATCH /api/auth/profile/update/ et POST /api/auth/profile/avatar/ existent, sans code SMS (DP-52 en exige un). |
| `verifierCodeEmail` | branché | POST /api/auth/otp/verify {purpose: email-sms, code} |  |  |
| `confirmerEmail` | branché | PUT /api/me/email {email, code} | → client |  |
| `verifierCodeNumeroAncien` | branché | POST /api/auth/otp/verify {purpose: numero-ancien, code} |  |  |
| `verifierNouveauNumero` | branché | POST /api/me/phone/check {numero} | → 200 \| 409 utilise \| 422 meme |  |
| `confirmerNumero` | branché | PUT /api/me/phone {numero, code} | → client ; codes de retrait régénérés, autres sessions fermées (CAP-15) |  |
| `changementNumero` | branché | GET /api/me/phone/last-change | → ChangementNumero \| 204 |  |

### Sécurité, confidentialité, suppression (11/13 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `securite` | branché, partiel | GET /api/auth/me/ · GET /api/auth/sessions/ · GET /api/me | → DonneesSecurite | Numéro vérifié : GET /api/me (kit). Manquent : date de vérification, comptes Google/Apple liés, historique des connexions, lieu, biométrie, seuil CODE-BIO, alerte de connexion (écrite par PATCH /api/me/security, pas encore relue). |
| `lierMethode` | à finir côté site | POST /api/me/identities {provider: google\|apple, jeton} | → 200 \| 409 pris | Route du kit écrite (apps/client_accounts) ; manquent côté site les SDK Google Identity Services (VITE_GOOGLE_CLIENT_ID) et Sign in with Apple JS (VITE_APPLE_CLIENT_ID) pour obtenir le jeton. |
| `delierMethode` | branché | DELETE /api/me/identities/{provider} | → 200 \| 409 derniere |  |
| `changerMotDePasse` | branché | POST /api/auth/change-password/ {old_password, new_password, new_password2} | → 200 \| 400 old_password → ancien \| 400 new_password → regle | Premier mot de passe (compte Google ou Apple, ancien = null) : route à créer POST /api/auth/password/set. Fermer les autres sessions (CAP-17). |
| `deconnecterAppareil` | branché | DELETE /api/auth/sessions/{jti}/revoke/ |  |  |
| `deconnecterAutres` | branché | POST /api/auth/sessions/revoke-all/ |  |  |
| `reglerBiometrie` | à finir côté site | aucune (réglage de l'appareil) | WebAuthn (passkey) sur le site ; FaceID/empreinte dans l’application | Réglage local de chaque téléphone ; à brancher avec WebAuthn. |
| `reglerAlerteConnexion` | branché | PATCH /api/me/security {alerte_connexion} |  |  |
| `confidentialite` | branché | GET /api/me/privacy | → personnalisation, nom au retrait, historique (recherches, vus) |  |
| `reglerConfidentialite` | branché | PATCH /api/me/privacy {personnalisation?, nom_retrait?} |  |  |
| `effacerHistorique` | branché | DELETE /api/me/search-history · DELETE /api/me/viewed | quoi = recherches \| vus \| tout |  |
| `suppression` | branché | GET /api/me/deletion | → commandes en cours, solde, numéro masqué, ce qui est perdu, durée de garde |  |
| `supprimerCompte` | branché | DELETE /api/me {code} | → 202 \| 409 compte_en_cours | Kit : code SMS (objet suppression), pseudonymisation, données légales gardées ; succès : jetons et compte retenu effacés de l’appareil. relaya : DELETE /api/auth/me/ {password} reste pour ses autres clients. |

### Notifications (7/7 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `notificationsClient` | branché, partiel | GET /api/auth/notifications/ | → [{id, title, message, notification_type, action_url, is_read, created_at}] | Manquent : catégorie « Retrait » distincte, envoi par SMS (sms), pagination par curseur (30 par page, CAP-05). |
| `lireNotification` | branché | POST /api/auth/notifications/{id}/read/ · POST /api/auth/notifications/read-all/ |  |  |
| `notifications` | branché | GET /api/me/notification-settings | → numéro, canal, choix, heures calmes | relaya : sms_notifications et newsletter_subscribed sur le profil seulement. |
| `reglerNotification` | branché | PUT /api/me/notification-settings {cle, actif} | → choix ; 422 category_locked |  |
| `reglerCanal` | branché | PUT /api/me/notification-settings {canal} · POST /api/me/consents | WhatsApp : consentement horodaté |  |
| `reglerCalme` | branché | PUT /api/me/notification-settings {calme: {actif, debut, fin}} |  |  |
| `enregistrerAbonnementPush` | branché | POST /api/devices {type: webpush, abonnement} · DELETE /api/devices/{id} | → {ok} | Spécification : POST · DELETE /devices (jeton par appareil, révoqué à la déconnexion, CAP-17). Envoi : Web Push (VAPID) ou FCM côté serveur. |

### Relais, adresses, intérêts (8/8 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `relaisListe` | branché, partiel | GET /api/shipping/relay-points/nearby/?city=&lat=&lng= · GET /api/me | → [{id, name, address, city, opening_hours, has_space, distance_km}] ; relais habituel : nom lu dans le compte du kit | Route authentifiée (un visiteur ne voit pas les relais). Manquent : gérant, horaire du jour en mots, jour de fermeture ; filtres open_today et not_full (spécification : GET /api/relais?near=). |
| `choisirRelais` | branché | PUT /api/me/relais-habituel {relais} |  |  |
| `adresses` | branché | GET /api/me/adresses | → DonneesAdresses |  |
| `enregistrerAdresse` | branché | POST /api/me/adresses {a} · PUT /api/me/adresses/{id} {a} | → {ok, adresse} \| 422 zone_non_servie {ville} | Adresse chiffrée au repos (CAP-21) ; zone : geo.zone_exploitee. relaya garde aussi l’adresse saisie à chaque commande. |
| `supprimerAdresse` | branché | DELETE /api/me/adresses/{id} |  |  |
| `adresseParDefaut` | branché | PUT /api/me/adresses/{id} {principale: true} |  |  |
| `interets` | branché | GET /api/me/interets | → univers choisis |  |
| `choisirInterets` | branché | PUT /api/me/interets {univers} |  |  |

### Catalogue, fiche et avis produit (5/5 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `produits` | branché, partiel | GET /api/catalog/products/?page_size=100 | → {results: [ProductSerializer]} | Manquent : classe de colis, variantes et options, vendeur (palier, Trust Score, km), autres offres, distance au relais, caractéristiques, univers. Spécification : GET /api/listing/{cat} et GET /api/search (curseur). |
| `produit` | branché, partiel | GET /api/catalog/products/{id}/ | → ProductSerializer | Mêmes manques ; spécification : GET /api/products/{maitre}?relais=&variante= (offre attribuée, prix livré). relaya a aussi /api/catalog/master-products/{id\|slug}/. |
| `avisProduit` | branché, partiel | GET /api/catalog/products/{id}/reviews/ | → [{id, rating, comment, created_at, is_verified_purchase}] | Manquent : répartition des notes (GET /reviews/summary), variante, photo, votes « utile », réponse du vendeur. |
| `voterAvis` | branché | POST /api/reviews/{id}/vote {action: utile\|signaler} |  |  |
| `ajouterProduit` | branché | POST /api/cart/lines {produit, options, qte, boutique?} | → {ok, id} ; le serveur recalcule le panier (offre, frais) |  |

### Contenus et photos (1/1 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `contenuAccueil` | branché | GET /api/content/home | → ContenuAccueil (carrousel, catégories, textes flash, bandeau de confiance, fond d’arrivée) | Kit : apps/contenus (éditable dans l’admin, photos téléversées par POST /api/admin/media). Route en échec → contenu par défaut (donnees/contenus.ts). |

### Favoris (7/7 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `favoris` | branché, partiel | GET /api/auth/favorites/ | → [{id, product, created_at}] | Manquent : variante, prix à l’ajout, prix livré au relais, état du stock (retour), alertes. |
| `basculerFavori` | branché | GET /api/auth/favorites/ puis POST /api/auth/favorites/ {product_id} ou DELETE /api/auth/favorites/{id}/ | → vrai si ajouté |  |
| `retirerFavori` | branché | DELETE /api/auth/favorites/{id}/ |  |  |
| `remettreFavori` | branché | POST /api/auth/favorites/ {product_id} |  |  |
| `reglerAlerteFavori` | branché | PATCH /api/me/favorites/{id} {alertes: {prix?, stock?}} |  |  |
| `favoriAuPanier` | branché | POST /api/cart/lines {favori} |  |  |
| `mettreEnFavori` | branché | POST /api/cart/lines/{id}/save |  |  |

### Panier et panier partagé (15/15 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `panier` | branché | GET /api/cart · GET /api/auth/favorites/ | → panier recalculé depuis zéro (lignes, boutiques, relais, adresse, plafond du comptoir, numéro vérifié) ; favoris de relaya sous le panier | Kit : apps/cart (frais du moteur, comptoir, changements CAL-11). Panier d’un visiteur par X-Device-Id : à faire (D18). |
| `verifierPanier` | branché | GET /api/cart | → changements[] : baisses déjà appliquées, hausses, retraits et pris à accepter |  |
| `accepterChangements` | branché | POST /api/checkout/confirm |  |  |
| `changerQuantite` | branché | PATCH /api/cart/lines/{id} {qte} |  |  |
| `retirerLigne` | branché | DELETE /api/cart/lines/{id} |  |  |
| `remettreLigne` | branché | POST /api/cart/lines {ligne, position} |  |  |
| `ajouterAuPanier` | branché | POST /api/cart/lines {produit, boutique} |  |  |
| `changerOption` | branché | PATCH /api/cart/lines/{id} {nom, valeur} |  |  |
| `choisirVendeur` | branché | POST /api/cart/lines/{id}/swap-offer {boutique} | → refusé si le gain n’est plus positif |  |
| `choisirModePanier` | branché | PATCH /api/cart {mode: relais\|domicile} |  |  |
| `partagerPanier` | branché | POST /api/carts/{id}/share {lignes?} | → PanierPartage (lien de paiement pour un proche) ; {id} = me |  |
| `panierPartage` | branché | GET /api/gift-links/{token} | → PanierPartage (sans adresse ni numéro) |  |
| `paniersPartages` | branché | GET /api/me/gift-links |  |  |
| `payerPanierPartage` | branché | POST /api/gift-payments {token, prenom, email, carte_jeton, devise} (Idempotency-Key) | → 3-D Secure ; 402 card_declined, 422 over_cap | Carte : jeton du prestataire (src/connecteurs/paiementCarte.ts), jamais le numéro ni le CVC (CAP-24). |
| `choisirRemplacement` | branché | POST /api/orders/{id}/replacement {autre_vendeur} |  |  |

### Paiement (8/8 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `passerCommande` | branché | POST /api/checkout (Idempotency-Key) | → 202 {commande, paiement, expires_at} ; 409 price_changed | Kit : apps/cart (prix recontrôlés, montants figés, sous-commandes, lignes réservées). Clé d’idempotence par intention : reprise après une coupure = même clé. À finir chez relaya : création de la commande par son circuit (D8), Mobile Money par collect et webhooks (D9). |
| `commandePassee` | branché | GET /api/orders/{id}/receipt | → CommandePassee (reçu) |  |
| `paiementsEnAttente` | branché | GET /api/me/pending-payments | → CommandePassee[] : demandes Mobile Money non validées, non expirées | Kit : apps/cart (paiement.en_attente). |
| `confirmerPaiement` | branché | GET /api/orders/{id}/receipt (sondage 3 s puis 10 s) | → CommandePassee : attente \| payee \| echec | Le serveur seul confirme (webhook de l’agrégateur → paiement.confirmer_paiement) ; le site relit le reçu jusqu’à la fin de la demande. |
| `echouerPaiement` | branché | POST /api/payments/{id}/abandon {cause} | → 204 : demande abandonnée, rien n’est débité, articles rendus au panier | L’écran déclare l’échec (délai écoulé, solde insuffisant) ; l’échec venu de l’agrégateur passe par son webhook. |
| `relancerPaiement` | branché | POST /api/payments/{id}/resend {numero?} (Idempotency-Key) |  | Kit : la demande précédente est remplacée, le délai repart. |
| `annulerPaiement` | branché | POST /api/payments/{id}/cancel |  |  |
| `payerAuComptoir` | branché | POST /api/orders/{id}/counter-payment (Idempotency-Key) | → demande Mobile Money du montant dû |  |

### Commandes, retrait et modification (8/8 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `commandes` | branché, partiel | GET /api/orders/my-orders/ | → [OrderDetailSerializer] | Avec le champ « espace_client » (pickup.services.vue_commande_client du kit, décision D14) : colis par boutique, code de retrait, garde, comptoir, étapes, fenêtre de retour, au format du site (vérifié contre le serveur d'essai). Sans lui : colis par article, sans code ni garde (relaya a une commande par panier, sans sous-commande). |
| `commandeClient` | branché, partiel | GET /api/orders/{id}/ | → OrderDetailSerializer (+ espace_client) | Même champ « espace_client » ; suivi : GET /api/orders/{id}/tracking/ existe. |
| `racheter` | branché | POST /api/orders/{id}/rebuy | → nombre d’articles remis au panier |  |
| `confirmerRetrait` | branché | POST /api/orders/{id}/confirm-receipt/ |  | Spécification : POST /api/orders/{id}/all-good (ferme la fenêtre de retour). |
| `deleguerRetrait` | branché | PUT /api/orders/{id}/delegation {prenom, numero \| null} |  | relaya : authorized_pickup_name et authorized_pickup_phone existent sur la commande, sans route pour les changer. |
| `apercuAnnulation` | branché | GET /api/orders/{id}/manage | → sous-commandes, remboursement si annulée |  |
| `annulerColis` | branché | POST /api/suborders/{id}/cancel {motif} (Idempotency-Key) | → montant remboursé ; 409 state_changed | relaya : POST /api/orders/{id}/cancel/ annule la commande entière seulement. |
| `changerLieu` | branché | PUT /api/orders/{id}/relais {lieu, frais} · PUT /api/orders/{id}/address {lieu, frais} · POST /api/parcels/{id}/transfer {lieu, frais} | → 409 price_changed \| collected \| state_changed | Le site lit le mode de la commande (GET /api/orders/{id}/) : relais → /relais (colis arrivés transférés par le serveur, transfert et garde due), domicile → /address (lieu : identifiant ou libellé « Nom · Quartier »). |

### Litiges et retours (9/9 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `litiges` | branché | GET /api/me/disputes | → dossiers | relaya : GET /api/orders/{id}/disputes/ par commande seulement. |
| `litige` | branché | GET /api/disputes/{id} | → états, compte à rebours, réponse du vendeur, décision et motif |  |
| `commandeLitige` | branché | GET /api/orders/{id}?for=dispute | → colis et relais de la commande |  |
| `ouvrirLitige` | branché | POST /api/disputes {ref, colis, pb, description, souhait, photos, origine?} (Idempotency-Key) | → dossier (remboursé d’office sous le seuil) ; 409 deja : le site rend le dossier déjà ouvert | relaya : POST /api/orders/{id}/disputes/ {order_item, reason, description} existe, sans photos, souhait ni remboursement automatique. |
| `ajouterPreuve` | branché | POST /api/disputes/{id}/photos {photo} (data: URL ou multipart) |  | relaya : POST /api/orders/evidence-requests/{id}/respond/ répond à une demande de preuve. |
| `repondreArrangement` | branché | POST /api/disputes/{id}/arrangement {accepte} |  |  |
| `contesterDecision` | branché | POST /api/disputes/{id}/appeal {motif} | → une fois, sous 48 h (DP-35) |  |
| `retirerLitige` | branché | POST /api/disputes/{id}/withdraw |  |  |
| `deposerRetour` | branché | POST /api/returns/{id}/deposit |  | relaya : POST /api/orders/{id}/returns/ crée le retour ; le dépôt est scanné par le relais. |

### Avis sur une commande (2/2 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `avis` | branché | GET /api/orders/{id}/reviews | → commande à noter, fenêtre (7 jours) |  |
| `envoyerAvis` | branché | POST · PUT /api/orders/{id}/reviews {notes[], commentaire, photo} | → 403 non_eligible \| 410 fenetre_fermee | relaya : POST /api/catalog/products/{id}/add_review/ note un produit, pas le vendeur et le relais. |

### Messagerie, aide et rappel (11/11 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `conversations` | branché | GET /api/me/threads | → conversations | relaya : GET /api/shipping/orders/{id}/messages/ par commande seulement. |
| `conversation` | branché | GET /api/me/threads/{id} | → la marque lue |  |
| `envoyerMessage` | branché | POST /api/me/threads/{id}/messages {texte?, photo?} | → {masked[]} (numéros, e-mails, liens retirés côté serveur) |  |
| `marquerToutLu` | branché | POST /api/me/threads/read |  |  |
| `poserQuestion` | branché | POST /api/messages/threads {produit, texte} | → {id, masked[]} |  |
| `ecrireSupport` | branché, partiel | POST /api/contact/ {name, email, phone, subject, message} | → {id} | Formulaire de contact de relaya : pas de fil de conversation, ni photo, ni commande liée, ni masquage. Spécification : POST /api/support/threads. |
| `faq` | branché | GET /api/help/faq?lang=&q= |  |  |
| `aide` | branché | GET /api/help | → dossier en cours, conversations, changement des conditions |  |
| `rappel` | branché | GET /api/support/callback |  |  |
| `demanderRappel` | branché | POST /api/support/callback {sujet, commande, creneau, precision} | → Rappel (aujourd’hui ou demain) |  |
| `annulerRappel` | branché | DELETE /api/support/callback |  |  |

### Légal (2/2 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `legal` | branché | GET /api/legal/{doc}?lang= · GET /api/me/legal | → version, date, essentiel, PDF ; versions acceptées |  |
| `accepterConditions` | branché | POST /api/me/legal/accept {doc, version} |  |  |

### Portefeuille, moyens de paiement, factures (14/14 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `factures` | branché | GET /api/me/factures · GET /api/orders/{id}/invoice.pdf | → factures (toutes les pages du curseur) et commandes annulées ; PDF généré par le serveur, montants figés |  |
| `portefeuille` | branché | GET /api/me/wallet | → solde, mouvements, plafonds (FF-WALLET) | Kit : apps/wallet, derrière FF-WALLET (404 si fermé). relaya : GET /api/payments/v2/me/refunds/ liste les remboursements. |
| `recharger` | branché | POST /api/me/wallet/topups {montant, moyen} (Idempotency-Key) |  |  |
| `fraisRetrait` | branché | GET /api/me/wallet/withdrawal-fee?montant= |  |  |
| `retirer` | branché | POST /api/me/wallet/withdrawals {montant, moyen} (Idempotency-Key) |  |  |
| `moyensPaiement` | branché | GET /api/me/moyens-paiement | → numéros Mobile Money | relaya : /api/auth/payout-accounts/ sert aux versements des partenaires, pas aux paiements du client. |
| `ajouterMoyen` | branché | POST /api/me/moyens-paiement {numero} | → {ok, envoi: EnvoiCode} (le code part avec la réponse) \| 409 deja ; 422 numero_invalide, operateur_non_accepte | Un seul envoi : le site n’appelle pas envoyerCode après ; « Renvoyer le code » le fait (envoyerCode(moyen, numéro)), après renvoiSecondes (sinon 429 trop_tot). |
| `confirmerMoyen` | branché | POST /api/me/moyens-paiement/{id}/verify {code} | → ResultatCode ; {id} : le numéro saisi (ou l’identifiant du moyen) |  |
| `moyenParDefaut` | branché | PATCH /api/me/moyens-paiement/{id} {par_defaut: true} |  |  |
| `retirerMoyen` | branché | DELETE /api/me/moyens-paiement/{id} |  |  |
| `cartes` | branché | GET /api/me/cartes | → cartes enregistrées chez le prestataire (jamais le numéro) |  |
| `ajouterCarte` | branché | POST /api/me/cartes {jeton, titulaire} | → carte (marque, 4 derniers chiffres, expiration lus chez le prestataire) \| 409 deja | Le numéro et le CVC sont tokenisés dans le navigateur (src/connecteurs/paiementCarte.ts), jamais envoyés à BelivaY (CAP-24). |
| `retirerCarte` | branché | DELETE /api/me/cartes/{id} |  |  |
| `carteParDefaut` | branché | PATCH /api/me/cartes/{id} {par_defaut: true} |  |  |

### Abonnement et cagnotte (8/8 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `prime` | branché | GET /api/me/subscription | → palier, formule, prélèvements, cagnotte, parrainage (FF-ABONNEMENT) | relaya : abonnements des vendeurs seulement (/api/vendors/plans/). |
| `payerAbonnement` | branché | POST /api/me/subscription/pay {moyen} (Idempotency-Key) |  |  |
| `changerMoyenAbonnement` | branché | PATCH /api/me/subscription {moyen} |  |  |
| `souscrire` | branché | POST /api/me/subscription {palier, formule, moyen} (Idempotency-Key) | → 409 trial_used |  |
| `resilierAbonnement` | branché | POST /api/me/subscription/cancel |  |  |
| `reprendreAbonnement` | branché | POST /api/me/subscription/resume |  |  |
| `offrirAbonnement` | branché | POST /api/subscription-gifts {numero, prenom, palier, mois, message, carte} (Idempotency-Key) | → {ok, …} \| {ok: false, raison: inconnu} ; 422 action_requise (3-D Secure), carte_refusee, plafond_carte | Carte : jeton du prestataire (src/connecteurs/paiementCarte.ts), jamais le numéro ni le CVC (CAP-24). |
| `verserCagnotte` | branché | POST /api/me/cagnotte/payout | → montant versé |  |

### Devenir vendeur (3/3 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `boutique` | branché | GET /api/me/shop | → boutique ouverte depuis le compte \| 204 | Route du kit (client_accounts). relaya : GET /api/vendors/profile/ existe (profil vendeur) ; champs à aligner (code, pièce). |
| `ouvrirBoutique` | branché | POST /api/me/shop {nom, categorie, type} | → boutique \| 409 nom_pris | Route du kit (client_accounts : VendorProfile EN ATTENTE par le pont). relaya : POST /api/vendors/apply/ existe ; champs à aligner. |
| `demanderBusiness` | branché | POST /api/me/business {piece} |  |  |

### Diaspora et proches (19/20 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `envoyerCodeDiaspora` | branché | POST /api/auth/otp/send {purpose: diaspora \| diaspora-renforce, canal: sms\|email, destination?} |  | Inscription : sans compte, à la destination donnée. Vérification renforcée d’une commande pour un proche (numéro masqué du compte) : diaspora-renforce, au numéro étranger vérifié du compte. |
| `verifierCodeDiaspora` | branché | POST /api/auth/otp/verify {purpose: diaspora, destination, code} | → 200 \| 422 code |  |
| `identiteFournisseur` | à finir côté site | POST /api/auth/social/lookup {provider: google\|apple, credential \| identity_token} | → {jeton, prenom, nom, email, compte: null\|standard\|diaspora} | Jeton obtenu par Google Identity Services (VITE_GOOGLE_CLIENT_ID) ou Sign in with Apple JS (VITE_APPLE_CLIENT_ID) ; le serveur le vérifie et ne crée rien. |
| `inscrireDiaspora` | branché | POST /api/auth/diaspora/register {prenom, nom, email, motDePasse, codeEmail, naissance, pays, ville, indicatif, numero, code} · POST /api/auth/social/diaspora {fournisseur: google\|apple\|numero, jeton?, convertir?, prenom, nom, email, naissance, pays, ville, indicatif, numero, code} | → session \| 409 existe \| 422 code, codeEmail, age, pays, numero, jeton | Communs : prénom, nom, naissance (18 ans), pays accepté et son indicatif, numéro de ce pays (jamais +237) vérifié par code SMS. Google/Apple : e-mail repris du jeton (déjà vérifié), ni mot de passe ni code e-mail ; convertir=true passe le compte existant en diaspora. Numéro : e-mail facultatif. |
| `liensFamille` | branché | GET /api/me/family-links |  |  |
| `creerCodeFamille` | branché | POST /api/me/family-links/code |  |  |
| `lierParCode` | branché | POST /api/me/family-links {code} |  |  |
| `inviterProche` | branché | POST /api/me/family-links/invite {prenom, numero} |  |  |
| `repondreLien` | branché | POST /api/me/family-links/{id}/answer {accepte, relais?} |  |  |
| `retirerLien` | branché | DELETE /api/me/family-links/{id} |  |  |
| `commanderPour` | branché | POST /api/family-links/{id}/orders {carte, bin, paysCarte, devise, mot, titulaire, codeSms?, livraison, moyen, demande?, supplementPar?} (Idempotency-Key) | → 3-D Secure ou Apple Pay / Google Pay ; contrôle de cohérence pays/BIN côté serveur ; 422 domicile, demande, garantie | Règle donnees/echanges.ts (totalDiaspora, supplementAuProche) refaite côté serveur ; l’adresse du proche ne sort jamais. Carte : jeton du prestataire (src/connecteurs/paiementCarte.ts), jamais le numéro ni le CVC (CAP-24). Le BIN (6 à 8 chiffres, permis par PCI DSS) sert au contrôle de cohérence. |
| `reglerDevise` | branché | PATCH /api/me/preferences {devise: XAF\|EUR\|USD} | → 403 hors compte diaspora | Taux du dollar : celui du prestataire, figé au paiement ; euro : parité fixe 655,957. |
| `choisirProche` | branché | PUT /api/me/active-relative {lien} | → 403 hors compte diaspora, 404 lien non actif | La session porte ensuite proche {id, prenom, quartier, ville, domicile, autres} ; les distances, délais et « retirable aujourd’hui » du catalogue partent du relais de ce proche (jamais son adresse ni son code). |
| `lienInvitation` | branché | POST /api/me/family-links/invitation | → {type: famille\|invitation, code, jusqua} (lien partageable, QR) |  |
| `accepterInvitation` | branché | POST /api/me/family-links/invitation/{code}/accept {relais} | → lien \| 404 code, 409 deja, 422 max, 403 type |  |
| `reglerLivraisonLien` | branché | PATCH /api/me/family-links/{id}/delivery {relais, domicile, prefere} | côté proche au Cameroun ; l’adresse reste dans son compte |  |
| `demandesProches` | branché | GET /api/me/family-requests | → paniers envoyés et reçus entre proches reliés |  |
| `envoyerPanierAuProche` | branché | POST /api/me/family-links/{id}/requests {mot, livraison, lignes?} | → demande \| 409 deja, 422 vide, plafond, domicile |  |
| `refuserDemande` | branché | POST /api/me/family-requests/{id}/decline {mot} |  |  |
| `annulerDemande` | branché | DELETE /api/me/family-requests/{id} |  |  |

### Listes d'envies (14/14 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `listes` | branché | GET /api/me/wishlists |  |  |
| `creerListe` | branché | POST /api/me/wishlists {nom, mode, remiseLe, surprise, occasion?, hotes?, cagnotte?} | → 201 ListeEnvies |  |
| `ajouterArticleListe` | branché | POST /api/me/wishlists/{id}/items {produit} |  |  |
| `retirerArticleListe` | branché | DELETE /api/me/wishlists/{id}/items/{produit} | → refusé pour un article offert |  |
| `reglerListe` | branché | PATCH /api/me/wishlists/{id} |  |  |
| `partagerListe` | branché | POST /api/me/wishlists/{id}/share |  |  |
| `arreterPartage` | branché | DELETE /api/me/wishlists/{id}/share |  |  |
| `demarrerListe` | branché | POST /api/me/wishlists/{id}/start |  |  |
| `listePublique` | branché | GET /api/wishlists/{code} | lien public l/ (CAP-11) |  |
| `offrirArticleListe` | branché | POST /api/wishlists/{code}/gifts {produit, prenom, email, moyen, jeton, prix_vu, qui, livraison, devise, carte: {bin, pays_carte, pays, code_email}} (Idempotency-Key) | → 409 price_changed (CLE-39) ; 422 plafond, domicile, coherence (avec le contrôle), verification | À créer. Sans compte, depuis n’importe où : relais du destinataire ou chez lui (adresse jamais renvoyée) ; carte : plafonds et contrôle de cohérence du compte diaspora, historique par e-mail. |
| `envoyerCodeCadeau` | branché | POST /api/wishlists/{code}/gifts/otp {email} | → destination masquée, validité | À créer. Vérification renforcée d’un cadeau payé par carte (contrôle de cohérence « renforcé »). |
| `suiviCadeau` | branché | GET /api/wishlists/{code}/gifts/{ref} | → étapes, preuve de remise, merci | À créer. Public pour qui a offert (lien de l’e-mail de suivi) : jamais l’adresse, le code ni le numéro du destinataire. |
| `partagerStatutListe` | branché | POST /api/me/wishlists/{id}/status-shares {canal} | → code et validité du lien | À créer. Crée le lien au besoin (comme /share) et compte les mises en statut par canal. |
| `participerCagnotteListe` | branché | POST /api/wishlists/{code}/fund {prenom, montant, moyen, mot, discret} (Idempotency-Key) | → montant réuni ; refus ferme, montant | À créer. Cagnotte d’une liste (mariage : voyage de noces) : dès 1 000 F, bloquée chez BelivaY puis versée au portefeuille des hôtes à la date de l’événement. |

### Échanges entre clients (14/14 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `echanges` | branché | GET /api/me/exchanges | → proches, listes suivies, envois, remerciements, colis payés par l’un pour l’autre | À créer. Proches : comptes BelivaY trouvés par numéro ou liés (family-links) ; jamais l’adresse ni le numéro complet. |
| `chercherProche` | branché | POST /api/me/contacts/lookup {numero} | → prénom et quartier du relais, ou inconnu | À créer. Limiter les recherches (anti-annuaire) : 20 par jour. |
| `envoyerAuxProches` | branché | POST /api/me/exchanges/send {type, id, proches[]} | → nombre de notifications envoyées | À créer. Une notification dans l’application du proche, une fois par objet. |
| `rappelerInvites` | branché | POST /api/me/wishlists/{id}/remind | → 429 too_early {prochain} ; un rappel tous les 3 jours au plus | À créer. Seulement les invités BelivaY qui n’ont rien offert ; BelivaY ne relance jamais de lui-même. |
| `suivreListe` | branché | PUT /api/me/followed-wishlists/{code} {suivre, rappel} |  | À créer. Rappel push N jours avant la date de remise, à qui l’a demandé. |
| `remercier` | branché | POST /api/me/thanks {ref, texte} |  | À créer. Message à qui a offert (e-mail pour un invité sans compte). |
| `repondreColis` | branché | POST /api/me/incoming-parcels/{id}/answer {accepte} | → colis ; refus : retenue (retenueRefus) et remboursement du payeur | À créer. Sans frais avant l’expédition (règle 6). |
| `cotiserArticleListe` | branché | POST /api/wishlists/{code}/items/{produit}/pool | → code de la cotisation (créée au besoin) | À créer. Articles de 15 000 F et plus. |
| `envoyerPanierA` | branché | POST /api/cart/send-to {prenom, proche?, relais, qui_paie_livraison, moyen, mot} (Idempotency-Key) | → référence ; refus « garantie » si le destinataire ne peut pas payer la livraison | À créer. Contrôle destinatairePeutPayer refait côté serveur. |
| `recus` | branché | GET /api/me/inbox | → envois reçus (à traiter d’abord) et envoyés, avec les réponses ; nombre à traiter | À créer. Un envoi par destinataire (compte trouvé par numéro vérifié ou e-mail) ; sans compte, seul le lien public existe. Jamais l’adresse ni le numéro complet de l’autre. |
| `recu` | branché | GET /api/me/inbox/{id} | → envoi, sens (reçu, envoyé), moyens du compte (Mobile Money, cartes, portefeuille ; diaspora : cartes) | À créer. Lu seulement par l’envoyeur et le destinataire. |
| `executerRecu` | branché | POST /api/me/inbox/{id}/actions {action, p?, montant?, moyen, qui?, mot?, discret?, relais?} (Idempotency-Key) | → envoi mis à jour, commande née, montant payé ; 409 traite, 410 expire, 422 garantie, montant, solde, moyen, diaspora | À créer. Règle donnees/echanges.ts refaite côté serveur : articles payés et bloqués avant l’envoi au vendeur ; « destinataire paie » seulement si la garantie couvre le pire cas ; refus sans frais avant l’expédition ; compte diaspora : carte seulement. |
| `remercierRecu` | branché | POST /api/me/inbox/{id}/thanks {texte} |  | À créer. Le bénéficiaire remercie qui a payé (e-mail pour un invité sans compte). |
| `envoyerRecu` | branché | POST /api/me/outbox {type, a, prenom, titre, …} | → envoi ; dansLApplication si le destinataire a un compte ; refus numero, moi, vide | À créer. Anti-annuaire : on ne dit pas si un numéro a un compte avant l’envoi (20 recherches par jour). |

### Cotisations (5/5 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `cotisations` | branché | GET /api/me/pools |  |  |
| `creerCotisation` | branché | POST /api/me/pools |  |  |
| `cotisationPublique` | branché | GET /api/pools/{code} | lien public c/ ; noms discrets masqués |  |
| `participer` | branché | POST /api/pools/{code}/contributions {prenom, montant, discret, mot, moyen, jeton?, carte} (Idempotency-Key) |  | Carte : jeton du prestataire (src/connecteurs/paiementCarte.ts), jamais le numéro ni le CVC (CAP-24). |
| `deciderHausse` | branché | POST /api/me/pools/{id}/price-rise {choix, moyen?} |  |  |

### Mises de côté (5/5 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `misesDeCote` | branché | GET /api/me/layaways |  |  |
| `creerMiseDeCote` | branché | POST /api/me/layaways {produit, rythme, moyen} (Idempotency-Key) | → acompte payé |  |
| `creerMiseDeCoteListe` | branché | POST /api/me/layaways {liste, exclus, equivalents, rythme, moyen} (Idempotency-Key) |  |  |
| `payerVersement` | branché | POST /api/me/layaways/{id}/installments {moyen} (Idempotency-Key) |  |  |
| `annulerMiseDeCote` | branché | POST /api/me/layaways/{id}/cancel |  |  |

### Ventes flash (3/3 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `ventesFlash` | branché | GET /api/flash-deals | → offres, alerte, relais | relaya : GET /api/catalog/promotions/active/ et is_flash_deal sur le produit existent ; stock et fin de l’offre à exposer. |
| `ajouterFlash` | branché | POST /api/cart/lines {produit, flash: true} | → ok si l’offre court et qu’il reste du stock |  |
| `alerteFlash` | branché | PUT /api/me/notification-settings {flash} |  |  |

### Rentrée scolaire (4/4 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `rentree` | branché | GET /api/school-lists |  |  |
| `commanderRentree` | branché | POST /api/school-lists/{id}/order {exclus, equivalents, moyen} (Idempotency-Key) | → référence de commande |  |
| `envoyerListePapier` | branché | POST /api/school-lists/photo (multipart) {classe, photo} |  |  |
| `publierListe` | branché | POST /api/school-lists/{id}/publish |  |  |

### Panier famille (5/5 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `famille` | branché | GET /api/me/family-baskets |  |  |
| `enregistrerPanierFamille` | branché | POST /api/me/family-baskets · PUT /api/me/family-baskets/{id} |  |  |
| `lierDestinataire` | branché | POST /api/me/family-baskets/recipient {prenom, numero, relais} |  |  |
| `payerPanierFamille` | branché | POST /api/me/family-baskets/{id}/pay {carte_jeton, email, mensuel, jour} (Idempotency-Key) |  | Carte : jeton du prestataire (src/connecteurs/paiementCarte.ts), jamais le numéro ni le CVC (CAP-24). |
| `suspendrePanierFamille` | branché | PATCH /api/me/family-baskets/{id} {suspendu} |  |  |

### Troc (6/6 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `trocs` | branché | GET /api/me/trades |  |  |
| `creerTroc` | branché | POST /api/me/trades {produit, modele, declare} |  |  |
| `repondreTroc` | branché | POST /api/me/trades/{id}/answer {accepte} |  |  |
| `contesterTroc` | branché | POST /api/me/trades/{id}/contest {texte} |  |  |
| `payerTroc` | branché | POST /api/me/trades/{id}/pay {moyen} (Idempotency-Key) |  |  |
| `annulerTroc` | branché | DELETE /api/me/trades/{id} |  |  |

### WhatsApp (2/2 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `whatsapp` | branché | GET /api/whatsapp/conversation |  | Appel écrit côté site ; le kit répond 501 a_finir tant que l’API WhatsApp Business n’est pas en service (FF-EX06). relaya : module whatsapp_assistant (webhook entrant seulement). |
| `repondreWhatsapp` | branché | POST /api/whatsapp/conversation/messages {texte} |  |  |

<!-- connecteurs:fin -->

## 4. Services externes

| Service | Fourni par | Aujourd'hui | Variables |
|---|---|---|---|
| **SMS et codes (OTP)** : premier numéro, changement de numéro, moyens de paiement, suppression du compte, SMS de repli des notifications | serveur | **Rien dans relaya** : la seule double authentification part par e-mail (`/api/auth/2fa/…`) ; `phone/validate/` normalise le numéro sans l'envoyer | serveur, à créer : `SMS_FOURNISSEUR`, `SMS_CLE_API`, `SMS_EXPEDITEUR` (prestataire à choisir : agrégateur local, Orange SMS API, Twilio…). Site : aucune |
| **WhatsApp** (codes au choix, canal de repli) | serveur | `apps.whatsapp_assistant` : webhook entrant (`/api/whatsapp/webhook/`), module détachable | serveur : celles de `apps/whatsapp_assistant/README.md` ; site : aucune |
| **MTN MoMo et Orange Money** | serveur, par l'agrégateur **Campay** | Existe : `/api/payments/v2/me/payments/{ref}/pay/` et `/check/`, webhook `/api/payments/webhooks/campay/` (signature, dédoublonnage, re-interrogation) | serveur : `CAMPAY_TOKEN_SANDBOX`, `CAMPAY_TOKEN_LIVE` (ou `CAMPAY_TOKEN`), `CAMPAY_WEBHOOK_KEY`, `PAYMENTS_ENCRYPTION_KEY`, `PAYMENTS_ENCRYPTION_KEY_OLD`, `PAYMENTS_FINGERPRINT_SALT`, `BELIVAY_SIMULATE_PAYMENT` (jamais en production). Site : aucune (il envoie le numéro et l'opérateur) |
| **Carte bancaire (3-D Secure)** : payeur à l'étranger, cartes enregistrées, panier famille, diaspora | serveur + tokenisation dans le navigateur (`src/connecteurs/paiementCarte.ts`) | Jeton simulé (démonstration) ; SDK CinetPay / Flutterwave chargé à la demande, appel de tokenisation à brancher | Serveur : `CARTE_CLE_SECRETE`, `CARTE_SECRET_WEBHOOK` ; site : `VITE_CARTE_FOURNISSEUR` (`demo`, `cinetpay`, `flutterwave`), `VITE_CARTE_CLE_PUBLIQUE` (clé publiable seulement : le numéro de carte et le CVC ne passent jamais par BelivaY, seul le jeton) |
| **Apple Pay, Google Pay** | prestataire carte (bouton de paiement du navigateur) | **Rien** | site : `VITE_APPLE_PAY_MARCHAND`, `VITE_GOOGLE_PAY_MARCHAND` ; Apple Pay demande aussi le fichier de vérification du domaine (`/.well-known/apple-developer-merchantid-domain-association`) fourni par le prestataire |
| **Connexion Google et Apple** | serveur (vérifie le jeton) + SDK sur le site (obtient le jeton) | Serveur : `/api/auth/google/`, `/api/auth/apple/` existent. Site : SDK pas encore chargés (`connecter` lève `NonDisponible`) | serveur : `GOOGLE_CLIENT_ID` (+ identifiants des applications natives), `APPLE_CLIENT_IDS`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` ou `APPLE_PRIVATE_KEY_PATH` ; site : `VITE_GOOGLE_CLIENT_ID`, `VITE_APPLE_CLIENT_ID` |
| **Cartes et géocodage** | site (`src/connecteurs/cartes.ts`) | OpenStreetMap et Nominatim par défaut ; Google Maps (Maps JavaScript, Places, Geocoding) si la clé est posée, repli sur OpenStreetMap. Distances géodésiques (`src/donnees/geo.ts`). Serveur : distance au relais (`relay-points/nearby/`), assistant d'adresse (`/api/ai/location-assistant/`) ; zones servies à créer (`422 zone_non_servie`) | site : `VITE_MAPS` (`osm` ou `google`), `VITE_GOOGLE_MAPS_KEY` (clé limitée aux domaines du site), `VITE_GOOGLE_MAPS_MAP_ID` |
| **Notifications push** | site (abonnement, `src/connecteurs/push.ts`, `public/sw.js`) + serveur (envoi) | Site prêt (Web Push, VAPID) ; serveur : notifications dans l'application seulement (`UserNotification`), **aucun envoi push** ni route `/api/devices` | site : `VITE_VAPID_PUBLIC_KEY` ; serveur, à créer : `VAPID_CLE_PRIVEE`, `VAPID_SUJET` (mailto:), et pour les applications Capacitor `FCM_COMPTE_SERVICE` |
| **E-mail** (lien de mot de passe, codes, factures) | serveur | SMTP par Celery (Redis) ; console par défaut | serveur : `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `SMTP_GMAIL_EMAIL`, `SMTP_GMAIL_APP_PASSWORD`, `CELERY_BROKER_URL`, `REDIS_HOST`, `REDIS_PORT`. La spécification prévoit Brevo |
| **Stockage des photos** (avatar, preuves de litige, liste papier, produits) | serveur | Cloudflare R2 par `django-storages` (S3) ; disque local sinon. Le site envoie les photos en `multipart/form-data` (le client accepte `FormData`) | serveur : `USE_R2_STORAGE`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_ENDPOINT_URL`, `AWS_S3_REGION_NAME`, `AWS_S3_ADDRESSING_STYLE`, `AWS_QUERYSTRING_EXPIRE`, `MEDIA_ROOT` |
| **PDF des factures** | serveur (`GET /api/orders/{id}/invoice.pdf`, montants figés, CCO-20) | **Rien** (aucune bibliothèque PDF dans `requirements.txt`) ; le site fabrique un PDF pour la démonstration seulement (`src/donnees/pdf.ts`) | aucune (bibliothèque à ajouter côté serveur) |
| **Mesure d'audience** | site (`src/connecteurs/suivi.ts`), avec l'accord du client | Prêt ; sans adresse, rien ne part | site : `VITE_MESURE_URL` |
| **Suivi d'erreurs** | site (`src/connecteurs/suivi.ts`) ; serveur à part | Site prêt (POST JSON, compatible avec un relais vers Sentry ou GlitchTip) ; serveur : rien (pas de `sentry-sdk`) | site : `VITE_ERREURS_URL`, `VITE_VERSION` ; serveur, à créer : `SENTRY_DSN` |
| Traduction (notifications, catalogue) | serveur | Google Translate | serveur : `GOOGLE_TRANSLATE_API_KEY` |
| Assistants IA (catalogue, adresse) | serveur | OpenRouter | serveur : `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_*` |

## 5. Décisions à prendre

1. **Où garder les jetons.** Aujourd'hui `localStorage` (« Se souvenir de moi ») ou `sessionStorage` : simple, mais
   lisible par un script injecté. Plus sûr : jeton de rafraîchissement en cookie `HttpOnly; Secure; SameSite`
   posé par le serveur (relaya a déjà `CORS_ALLOW_CREDENTIALS = True`), jeton d'accès en mémoire. Le client n'a
   qu'un objet `StockageJetons` à remplacer.
2. **Même origine ou CORS.** Servir l'API sous la même origine que le site (`/api` réécrit vers belivay.com par
   Vercel ou nginx) évite tout réglage CORS. Sinon, ajouter l'origine du site et les en-têtes `idempotency-key`,
   `x-device-id` côté serveur.
3. **Noms des routes.** Garder ceux de relaya (`/api/auth/…`, `/api/orders/my-orders/`) ou adopter ceux de la
   spécification (`/api/me`, `/api/cart`, `/api/v1`) ; le site s'adapte dans le domaine concerné (`src/api/domaines/*.ts`).
4. **Format d'erreur (CAP-04), pagination par curseur (CAP-05), clé d'idempotence (CAP-03)** : un gestionnaire
   d'exceptions DRF, une pagination et un middleware règlent les trois d'un coup.
5. **Sous-commandes.** relaya a une commande par panier et un envoi par vendeur ; la spécification raisonne par
   colis (une boutique = un colis). C'est le plus gros changement (annulation par boutique, code de retrait, garde).
6. **Prestataires** : SMS, carte bancaire (et Apple Pay, Google Pay), envoi des notifications push (Web Push avec
   VAPID, ou FCM pour les applications).
7. **Images.** Le serveur renvoie des adresses d'images ; les écrans affichent aujourd'hui les dessins de la
   démonstration (`Dessin`, par clé). Il faut qu'ils affichent une image servie (`Illustration` ou une balise
   `<img>`) quand la valeur est une adresse.
8. **Identifiant d'un produit** : offre (`Product.id`) ou produit maître (`MasterProduct.slug`), à fixer avant de
   brancher la fiche, le panier et les favoris.

## 6. Ajouter ou finir un connecteur

1. Créer la route côté serveur (relaya-marketplace), avec les règles de `../moteurs/`.
2. Dans `src/api/routes.ts`, passer la méthode à `branche` (ou `partiel`) et écrire la route réelle.
3. Dans le domaine `src/api/domaines/<domaine>.ts`, écrire la méthode (appel + adaptateur dans
   `src/api/adaptateurs.ts`) ; `src/api/source-api.ts` ne fait qu'assembler les domaines, une méthode n'a qu'une
   implémentation (vérifié par `tests/connecteurs.spec.ts`).
4. `node outils/connecteurs.mjs` (réécrit la section 3), puis `npx tsc -b` et
   `npx playwright test tests/connecteurs.spec.ts`.

## 7. Connecteurs du site : cartes, push, suivi, passage en production

Tous lisent leurs variables dans `src/config/env.ts` (`connecteurs`, validées au démarrage) ; aucune clé n'est
écrite dans le code. Une variable absente ne casse rien : chaque connecteur a un repli.

### Cartes et géocodage — `src/connecteurs/cartes.ts`

- **Interface unique** : `afficherCarte(el, {centre, titre, marqueurs})`, `rechercherAdresse(texte)`,
  `geocoderInverse(point)`, `distance(a, b)` (haversine, `src/donnees/geo.ts`), `lienCarte(point)`,
  `lienItineraire(lieu)`. Les écrans passent par `src/composants/Position.tsx` : `CartePosition` (carte, lien,
  partage, « Près de … » par géocodage inverse), `RechercheLieu` (chercher un carrefour, une école… quand le GPS
  manque), `quartierProche` (quartier servi le plus proche, ou celui que le fournisseur nomme).
- **OpenStreetMap** (défaut) : carte intégrée `openstreetmap.org/export/embed.html` (marqueur principal),
  Nominatim pour la recherche et le géocodage inverse, une requête par seconde au plus, réponses gardées pendant
  la visite (politique d'usage OSMF). Pour un fort trafic : instance Nominatim à soi ou Google.
- **Google Maps** (`VITE_MAPS=google` + `VITE_GOOGLE_MAPS_KEY`) : script chargé à la première carte ou recherche
  seulement ; Places **nouveau** (`AutocompleteSuggestion`, jeton de session : une session facturée de la frappe
  au choix), `Geocoder`, marqueurs avancés si `VITE_GOOGLE_MAPS_MAP_ID` (sinon `Marker`). Tous les relais proches
  s'affichent sur la carte du choix du relais. APIs à activer dans la console Google : Maps JavaScript API, Places
  API (New), Geocoding API ; clé restreinte aux référents HTTP du site.
- **Repli** : clé absente, script qui n'arrive pas (12 s), clé refusée (`gm_authFailure`) ou appel en erreur →
  OpenStreetMap pour le reste de la visite, sans message d'erreur au client.
- Écrans branchés : adresse de la première commande (CL-03), Mes adresses (CL-13), choix du relais (CL-03),
  lien court (CL-10, « Itinéraire »).

### Notifications push — `src/connecteurs/push.ts`, `public/sw.js`

- L'autorisation n'est demandée qu'au toucher du client : « Activer les notifications » de l'écran
  `notifs-proposition` (après la commande) ou des réglages des notifications. Jamais à l'ouverture du site.
- Autorisation donnée → service worker `/sw.js` (aucun cache, aucune interception de requête), abonnement
  `pushManager.subscribe` avec `VITE_VAPID_PUBLIC_KEY`, envoi par `source.enregistrerAbonnementPush(abonnement)`.
  Au démarrage, si l'autorisation existe déjà, l'abonnement est renvoyé au repos (il peut avoir changé).
- Sans clé VAPID (démonstration) : une notification locale « Notifications activées » prouve que tout marche.
- Charge utile attendue du serveur : `{"titre", "corps", "lien": "/commande?ref=…", "tag"}` ; le toucher ouvre
  le lien dans l'onglet BelivaY déjà ouvert, sinon un nouvel onglet. Refus : le SMS prend le relais (écrans).

### Paiement par carte — `src/connecteurs/paiementCarte.ts`

- **Règle (CAP-24, PCI DSS)** : le numéro complet et le code au dos (CVC) ne quittent jamais le navigateur vers
  BelivaY et n'entrent jamais dans `source`. Chaque écran qui saisit une carte (ajout d'une carte, offrir un
  abonnement, payeur à l'étranger, commande diaspora, offrir un article d'une liste, participer à une cotisation,
  panier famille) appelle `tokeniser({numero, expire, cvc})` au moment de payer, puis ne transmet que le résultat
  `CarteJeton` (`src/donnees/source.ts`) : `jeton`, `marque`, `derniers` (4 chiffres), `expire`, `bin` (6 à 8
  premiers chiffres, permis par PCI DSS, pour le contrôle de cohérence diaspora), `pays` quand le prestataire le
  donne. Apple Pay et Google Pay : `jetonExpress('apple' | 'google')`, même forme, sans chiffres ni BIN.
- **Démonstration** (`VITE_CARTE_FOURNISSEUR=demo`, défaut) : jeton simulé `tok_demo_…`, empreinte non réversible
  du numéro et de l'expiration calculée dans le navigateur (la même carte donne le même jeton : « déjà
  enregistrée » se reconnaît au jeton).
- **Prestataire réel** (`VITE_CARTE_FOURNISSEUR=cinetpay` ou `flutterwave` + `VITE_CARTE_CLE_PUBLIQUE`, clé
  PUBLIABLE ; une clé secrète reconnue arrête le démarrage) : le SDK est chargé à la demande, au premier paiement
  par carte. **À brancher** avec le compte marchand : l'appel de tokenisation du SDK (champ sécurisé ou chiffrement
  côté navigateur) dans `PRESTATAIRES[…].tokeniser`, et `jetonExpress` (Payment Request API). En attendant,
  `tokeniser` lève `ErreurCarte('indisponible')` : l'écran dit « rien n'a été débité ».
- Serveur : le jeton seul suffit pour enregistrer (`POST /api/me/cartes {jeton, titulaire}`) ou payer
  (`carte_jeton`) ; marque, 4 chiffres et pays d'émission se relisent chez le prestataire (CinetPay, Flutterwave en
  secours : `CARTE_CLE_SECRETE`, `CARTE_SECRET_WEBHOOK`).

### Suivi d'erreurs et mesure d'audience — `src/connecteurs/suivi.ts`, `src/composants/Garde.tsx`

- Erreurs de script, promesses rejetées et écrans qui plantent → `POST VITE_ERREURS_URL` (JSON : genre, nom,
  message, pile, adresse **sans paramètres**, langue, navigateur, version, date), une fois par message, 20 au plus
  par visite. Sans adresse : console en développement, rien en production. Pour Sentry ou GlitchTip, un petit
  relais côté serveur transforme ce JSON en événement (le DSN reste sur le serveur).
- Un écran qui plante affiche « Quelque chose s'est mal passé » (Recharger, Aide, Accueil) au lieu d'une page
  blanche ; ouvrir une autre adresse réessaie. Un fichier de page manquant après une mise en ligne recharge le
  site (`vite:preloadError`).
- Mesure d'audience : seulement si le client l'a allumée (Réglages, « Mesure d'audience », éteinte par défaut) et
  si `VITE_MESURE_URL` est posée. Une page vue = route sans paramètres, langue, largeur d'écran arrondie, version.
  Ni cookie, ni identifiant. `mesurerEvenement(nom, valeurs)` est prête pour les gestes qui comptent.

### Passage en production

- **Page inconnue** : « Ce lien ne mène à aucune page » (adresse demandée, retour à l'accueil, recherche,
  commandes, aide), onglet « Page introuvable ».
- **Application installable (PWA)** : `public/manifest.webmanifest` (nom, couleurs, raccourcis Commandes et
  Panier), icônes 192, 512 et 512 « maskable », `apple-touch-icon.png` 180, toutes tirées du chariot du favicon
  (`src/assets/chariot-belivay.png`, 125 px : un logo vectoriel donnerait des icônes plus nettes). Méta
  description, Open Graph (l'image `og:image` est relative : la passer en adresse absolue une fois le domaine fixé).
- **En-têtes (`vercel.json`)** : Content-Security-Policy (scripts du site et de Google Maps, styles en ligne
  permis — les écrans en posent —, images `https:`, connexions vers le site, `belivay.com`, Nominatim et Google,
  cadre OpenStreetMap seulement, `frame-ancestors 'none'`), Permissions-Policy (géolocalisation, caméra, micro de
  la dictée, paiement : le site seulement ; le reste coupé), HSTS, COOP. **Si l'API, la collecte d'erreurs ou la
  mesure sont sur un autre domaine que `belivay.com`, l'ajouter à `connect-src`.** `vite preview` applique les
  mêmes en-têtes (vite.config.ts) pour vérifier en local.
- **Performance** : dessins de la démonstration en un fichier par dessin, chargé par l'écran qui l'affiche
  (plugin `dessins-a-la-demande` de vite.config.ts) au lieu d'un seul fichier de 1,1 Mo ; point d'entrée découpé
  (React et routeur, états du prototype, données de démonstration : morceaux parallèles, gardés en cache d'une
  mise en ligne à l'autre) ; préchargement du document d'une page au toucher ou au survol d'un lien, puis des
  onglets de la barre au repos (pas en données économes).
