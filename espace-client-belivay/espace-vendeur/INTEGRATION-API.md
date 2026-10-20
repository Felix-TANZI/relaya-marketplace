# Espace vendeur — ce que la vague d'intégration demande au serveur et à la source API

Écrit à la vague d'intégration de la vague 2 (6 oct.), pour l'agent qui possède `espace-vendeur/src/api/**` et
`backend-kit/**`. Rien ici n'a été modifié dans ces dossiers (seule écriture sous `backend-kit` : la recopie de
`logique-metier/parametres-en-vigueur.json` dans `backend-kit/apps/client_core/donnees/`). Chaque point dit la route,
les champs du contrat et l'écran ou la règle qui en a besoin. Source : les `INTEGRATION.md` des groupes VD-03 à VD-11
et `src/calculs/INTEGRATION.md`.

## 1. `ROUTES_ATTENDUES` (`src/api/source-api.ts`) — à compléter

| Domaine | Routes à ajouter (en plus de celles déjà écrites) | Demandé par |
|---|---|---|
| `session` | `POST /auth/otp · POST /auth/verify · POST /auth/password-reset · POST /shops · POST /shops/{id}/kyc · POST /contract/sign · GET /assisted-entry · POST /assisted-entry/approve · PUT /assisted-entry/{id} · DELETE /devices/current` (oublier l'appareil) | VD-03 (domaine `session`) |
| `accueil` | `GET /money/earnings?scope=lifetime · GET /payouts/next · GET /demand?limit=1 · GET /seller/onboarding · GET /account/status` | VD-04 §9 |
| `commandes` | `GET /orders?state=` rend `counts`, `detail`, `total` | VD-05 §10 |
| `preparation` | `GET /orders/{id}/extend-options · PUT /orders/{id}/slip/checks/{i} · POST /orders/{id}/reference-check · POST /orders/{id}/slip/opened` | VD-05 §10 |
| `remise` | `POST /orders/{id}/handover-code/renew` (DP-56) · `GET /orders?receipt=1` (ou `GET /documents?type=receipt`) | VD-06 §6 |
| `litiges` | `GET /disputes?state= · GET /disputes/{id} · POST /disputes/{id}/answer · POST · DELETE /disputes/{id}/evidence · POST /disputes/{id}/appeal · GET /config` | VD-07 §6 |
| `retours` | `GET /returns?state= · GET /returns/{id} · POST /returns/{id}/received · POST · DELETE /returns/{id}/photos · POST /returns/{id}/inspection · POST /returns/{id}/replacement · POST /returns/{id}/replacement/ready` | VD-07 §6 |
| `produits` | `GET /offers/{id} · DELETE /offers/{id}` (brouillon) `· POST /offers/{id}/restore · GET /offers/export · POST /offers/import · GET /catalog/{id}/variants` | VD-08 §2 |
| `offres` | `GET /config · GET /catalog/barcode/{code} · POST /catalog/recognize · PUT /offers/{id} · POST · DELETE /offers/{id}/photos · GET /offers/quote · POST /offers/{id}/publish · POST /offers/{id}/price · GET /offers/{id}/publication · GET · PUT /sheet-requests/draft · POST /offers/{id}/description-proposal` | VD-08 §2 |
| `argent` | `GET /money/releasing · GET /documents · GET /documents/{type}/{period}?format=pdf\|csv` | VD-09 |
| `versements` | `GET /payouts/next · GET /payouts?period=3m\|12m\|all · POST /payout-number/codes · POST /payout-number/codes/resend` | VD-09 |
| `trust` | `GET /account/status · GET /account/decisions · GET /account/decisions/{id}` | VD-10 §4 |
| `plans` | **ajouter** `GET /rewards · POST /rewards/{id}/use · POST /flash-sales · GET /services · GET /stats · GET /demand` ; **retirer** `POST /visibility` (DP-14, Q-32 : aucune visibilité payante) | VD-10 §4 |
| `boutique` | `POST /shop/pause · PATCH · DELETE /shop/closures · GET /reviews · POST /reviews/{id}/private-reply` | VD-11 §4 |
| `compte` | `POST /me/email · POST /me/phone · GET /account/status · POST · DELETE /account/closure · POST /auth/otp` | VD-11 §4 |
| `equipe` | `POST /shop/members/{id}/resend` | VD-11 §4 |
| `messages` | `POST /threads/{id}/read · POST /threads/support · GET /quick-replies` ; **nouveau** `POST /threads {order_id}` (ouvre ou crée la conversation d'une commande, `ouvrirFil`) | VD-11 §4 ; intégration (REP-03) |
| `notifications` | `POST /notifications/{id}/read · POST /notifications/read-all · GET · PUT /notifications/settings` | VD-11 §4 |
| `aide` | `GET /help · GET /help/forbidden-products · GET /help/contacts · GET /help/tip` (remplace « à définir ») | VD-11 §4 |

## 2. Méthodes et champs ajoutés aux domaines à la vague d'intégration (à porter dans `src/api/domaines/*`)

- `messages.ouvrirFil(ref): Promise<{ fil } | null>` — **nouvelle méthode de `DomaineMessages`** : un branchement API
  du domaine messages ne compile pas sans elle. Route : `POST /threads {order_id}` → `{ id }`.
- `commandes` : `Commande.remplacementDe: ReferenceCommande | null` (sous-commande de remplacement d'un retour,
  REFCL-R080 : même parcours que toute commande, `garde: null`, `argent: null`). Le serveur crée la sous-commande à
  `POST /returns/{id}/replacement` ; `GET /orders` porte `replacement_of`. Un litige ou un retour **clos** quitte
  « Problèmes » et l'argent gelé (CMD-07) : `state` et `frozen_amount` le disent côté serveur.
- `commandes` : `argent.etat` suit `etatDeLArgent` (VD09-R04 : libération passée = « à verser »).
- `accueil` : `ElementAFaire` `preparer` porte `ramassage {debut, fin}` (créneau qui suit l'échéance, P-6) et
  `calendrier` (CalendrierBoutique : décompte en heures d'ouverture, REFVD-R134) ; `litige` porte `article`
  (ArticleVendu) ; `retour` porte `inspectionH` (RET-INSPECT-H). `alerteScore` porte `sens` (`montee`|`descente`),
  `points` (affichés, A-5) et `palier` (Palier). `Suspension.decision` = identifiant de la décision (`contester?d=`).
- `preparation.cestPret(ref, at?)` : `POST /orders/{id}/ready {at}` garde l'heure d'origine d'un geste rejoué
  hors connexion (origin_time, VD04-R14) ; même chose pour `stock` (`PUT /offers/{id} {stock, at}`) et
  `fermer` / `rouvrir` (`POST /shop/closed-today {at}`).
- `session` : `BoutiqueSession.plan` = plan courant (essai ou payé), `etat` vaut `en_pause` pendant une pause (Q-39)
  et `suspendue` pendant une suspension ; un membre retiré de l'équipe perd sa session (révocation du jeton,
  EQU-04, VD11-R22).
- `notifications` : type `securite` ajouté (connexion bloquée au 5e mot de passe faux, CNX-03) ; le serveur produit
  aussi les rappels 24 h et 6 h avant l'échéance d'un litige, la décision (`litige_envoye?ref=`), le retour arrivé
  (`inspection?ref=`), le remboursement automatique, le colis non retiré, la sanction ou descente avec
  `contester: 'contester?d=<id>&depuis=notifications'`, l'action refusée au rejeu hors connexion (avec son motif).
- `compte.demanderModification` : la demande de statut « entreprise » porte RCCM et NIU (forme vérifiée :
  `FORME_RCCM`, `FORME_NIU` de `src/donnees/communs.ts`) ; le support vérifie les pièces (DOC-01).
- `retours` / `litiges` : `livraisonDuColis: Francs | null` (part de livraison d'un colis, calculée par le moteur
  des frais du client, `annulation.py` ; le vendeur ne voit pas la commande entière, GEN-01) dans `Litige` et
  `Retour.couts` (`src/calculs/INTEGRATION.md`, VD-07 §1.3).

## 3. Contrat `backend-kit/openapi.yaml`

- `GET /orders` : `counts`, `detail` (prep, cours, litiges, retours, terminees, annulees), `total` ; l'item porte
  `shop_calendar`, `pickup_slot`, `cancellation{reason, at}`, `problem`, `frozen_amount` (null pour l'accès
  Préparation), `replacement_of` ; `GET /orders/{id}/journal` rend `detail`, `before`, `after` (VD-05 §10).
- `Apercu` (kept, kept_share à une décimale, min_price, min_commission_ranges, start_cap), `Conseil`
  (recommended_price, kept_at_recommended, zones[{name, first, first_at_recommended}], market{count, min, max},
  customer_saving, weekly_viewers, cheapest_share), `Publication` (best_price, perks, answer_before, queued)
  (VD-08 §2).
- `GET /tiers` : tout ce que porte `monPalier()` (conditions avec valeur et manque, commandes à faire, projection,
  montée, descente proposée, alerte, référence et exemple — null pour l'accès Préparation —, lignes de paliers,
  libération, support, découverte) ; `GET /score` : `calculeA`, `cle` et `detail` des critères, `ref` et `critere`
  des événements, `bareme`, `historique` ; `POST /score/appeal` rend `reponseAvant`, refuse `trop_long` et
  `introuvable` (VD-10 §4).
- Les méthodes d'argent des domaines `plans`, `argent`, `versements` répondent 403 `owner_only` à l'accès Préparation.

## 4. Configuration (`GET /config`) — paramètres créés par DP-57 à la vague d'intégration

Versés au registre (`logique-metier/decisions-porteur.json` → `parametres-en-vigueur.json`, recopié dans
`backend-kit/apps/client_core/donnees/`) et lus par `src/calculs/registre.ts` (`lireConsole`) : `VD-MDP-LIEN`,
`VD-KYC-DELAIS`, `VD-RESILIATION-PREAVIS`, `VD-SAISIE-ASSISTEE`, `VD-PRIX-ANORMAL`, `VD-CONTESTATION-REPONSE`,
`VD-FILE-HORS-LIGNE`, `VD-PHOTOS`, `VD-FICHE-DELAI`, `VD-MODERATION`, `VD-COLIS`, `VD-ETATS-PRODUIT`,
`VD-PREPARATION-DELAIS`, `VD-RAPPEL-PRIX`, `VD-PRIX-AUTO`, `VD-DOUBLON`, `VD-CONSEIL-PRIX`, `VD-PREFIXES-CM`,
`VD-EQUIPE-MAX`, `VD-SERVICES`, `VD-VISIBILITE`, `VD-DEMANDE`, `VD-SIMULATEUR`, `VD-VISITE-AGENT`. Le serveur les
sert dans `GET /config` (mêmes codes) et les applique (délais, plafonds, contrôles).

## 5. Hors connexion

La file hors connexion vit sur l'appareil (`src/donnees/fileHorsLigne.ts`, domaine `accueil`) : pas de route
dédiée ; chaque action est rejouée vers sa route avec `origin_time` et `origin_geo` ; une action de plus de
`VD-FILE-HORS-LIGNE` (72 h) expire. Le service worker (`public/sw.js`, portée `/vendeur/`) ne met aucune réponse de
l'API en cache.

## 6. Tableau de bord « Votre activité » (vague 4)

Calculé dans l'écran (`src/pages/VD-04/Activite.tsx`) sur les commandes des quatre filtres, les produits et les avis :
aucune route nouvelle n'est nécessaire tant que `GET /orders?state=` rend toutes les commandes. À prévoir côté serveur :
- `GET /seller/activity?period=7d|30d|12m` (montants gardés par jour ou par mois, carte de chaleur jour × heure), dès
  que l'historique dépasse une page de commandes ;
- `PUT /seller/goal {amount}` : l'objectif du mois, aujourd'hui gardé sur l'appareil (`blv_v_objectif`).

## 7. Pages ajoutées (DP-58 : AJ-A, AJ-B, Nouveau produit) — routes serveur manquantes

**Fait au kit (6 oct.)** : toutes les routes ci-dessous existent (préfixe `/api/vendors/`), au contrat
(`backend-kit/openapi.yaml`) et au registre (`src/api/routes/pages.ts`, AJ-A appelé en mode API ; AJ-B : connecteurs
prêts dans `src/api/pages/source.ts`, l'écran lit encore la démonstration). Ajouts : `PATCH /me {bio}` (sans code) et
`{couverture}` ; `GET /search?q=`, `GET /shop/activity` ; `GET · PUT /learning/progress/{fiche}`, `DELETE` pour
recommencer ; « Votre activité » : `GET /seller/activity?period=`, `GET · PUT /seller/goal {amount}` (§ 6). La vente flash
offerte au mérite (`POST /flash-sales`) crée sa ligne dans la même table que Promotions. Les routes `sheet-requests`
(ancienne demande de fiche) sont retirées : le produit nouveau passe par `POST /offers/new` puis la publication.

- **Stock (AJ-A)** : `GET /stock`, `GET /stock/movements`, `POST /stock/{offre}/adjust`, `PUT /stock/{offre}/threshold`,
  `GET /stock/export` (accès Préparation autorisé, gestes signés ; aucun prix pour lui).
- **Ventes flash (AJ-A + VD-10, un seul domaine)** : `GET /promotions` (champ `origin: seller|merit`), `GET
  /promotions/rules`, `GET /promotions/offers`, `POST /promotions/quote`, `POST /promotions`, `POST
  /promotions/{id}/stop`. `POST /plans/rewards/{id}/flash` (vente offerte au mérite) crée une ligne de la même table
  (`origin: merit`, créneau choisi par BelivaY). Pendant la fenêtre d'une vente en cours, le serveur sert le prix
  remisé comme prix de l'offre (prix payé, commission calculée dessus : F9), le prix de référence comme prix barré et
  la fin comme `finPromo` (démonstration : `src/demo/ventes-flash.ts`, `vue()` de `src/demo/produits.ts`).
- **Questions des clients (AJ-A)** : `GET /questions`, `POST /questions/filter`, `POST /questions/{id}/answer`,
  `POST /questions/{id}/report`, `GET · POST · DELETE /questions/templates`.
- **Livraison et colis (AJ-A)** : `GET · PUT /delivery-settings`, `PUT /offers/{id}/delivery`, `PUT
  /delivery-settings/slots/{id}`, `PUT /delivery-settings/relays/{id}` ; les défauts de la boutique (délai, colis,
  paiement au retrait) s'appliquent à toute offre créée (`POST /offers/new`).
- **AJ-B** : `GET · PUT /learning/progress` (Apprendre), champ `bio` de `PUT /me` (Mon profil), `GET
  /pickups?from=&to=` (Ramassages, au lieu de relire toutes les remises). Rechercher, Activité et Mes ajustements lisent
  des routes existantes (commandes, journal, `argent.gains`) ; plus tard, `GET /search?q=` et `GET /shop/activity`
  éviteraient de tout relire (jamais de donnée du client ; jamais de ligne « commission » : GAI-01).
- **Nouveau produit (VD-08, DP-58)** : `GET /catalog/search?code=`, `GET /catalog/suggest`, `POST /offers/new`,
  `POST /offers/{id}/attach`, `PUT /offers/{id}/photos {ids}` ; champs `prixBarre`, `finPromo`, `noteVendeur` au PATCH.

## 8. Sécurité de la boutique, emplacements, droits des employés, échanges (vague « équipe », 6 oct.)

**Fait au kit (6 oct.)** : routes, droits par employé (`backend-kit/apps/vendeur_core/droits.py`, règle par route,
403 `forbidden_right`), emplacements et demandes (`vendeur_boutique/lieux.py`), flux des événements
(`vendeur_core/echanges.py` ; SSE : un passage par requête, reprise par `Last-Event-ID`), `not-ready` ; connecteurs
`branche`. Console à brancher : `lieux.verifier_lieu`, `lieux.decider_demande`. Préfixe `/api/vendors/`.

- **Droits par employé** (`src/donnees/droits.ts`) : `Membre.droits` et `Membre.profil` dans la session (`GET /me`,
  jeton) ; `PUT /shop/members/{id}/rights {droits, code}`, `POST /shop/members/{id}/code {motif}`,
  `POST /shop/members/{id}/suspend`, `POST /shop/members/{id}/reactivate {code}`, `DELETE
  /shop/members/invitations/{id}`, `GET /shop/members/{id}/journal`, champ `droits` de `POST /shop/members`. Le
  serveur retire d'office les droits interdits (argent, prix, réponse aux litiges, équipe) et répond **403
  `forbidden_right`** (traité comme `owner_only` par l'écran : « Réservé ») à toute route hors des droits du membre :
  `GET /orders*` (commandes.voir), `POST /orders/{id}/ready|out-of-stock|extend|slip…` (commandes.preparer),
  `GET /orders/{id}/handover-code`, `…/renew` (commandes.remettre), `GET /disputes*` (litiges.voir),
  `POST · DELETE /disputes/{id}/evidence` (litiges.preuves), `POST /returns/{id}/received|photos|inspection`
  (retours.inspecter), `GET /threads*` (messages.voir), `POST /threads/{id}/messages` (messages.repondre),
  `GET /offers*`, `GET /stock` (produits.voir), `PUT /offers/{id} {stock}`, `POST /stock/{offre}/adjust`
  (produits.stock), `POST /shop/closed-today` (boutique.fermer). Suspendre ou supprimer révoque les jetons du membre
  tout de suite (EQU-04).
- **Emplacements** : `GET · POST /shop/locations`, `PATCH · DELETE /shop/locations/{id}`, `PUT
  /shop/locations/{id}/point {lat, lon}` (au-delà de 200 m : `a_verifier`, l'ancien point sert, agent prévenu,
  relance 72 h, Q-91), `POST /shop/locations/principal-code`, `POST /shop/locations/{id}/principal {code}` (lieu
  vérifié seulement ; change l'origine du ramassage et la zone), `GET /hubs` (relais et centres des zones exploitées,
  joints à `GET /shop/locations`). `PUT /shop/location` reste l'alias du lieu principal. Paramètre proposé
  `VD-LIEUX-MAX` = 5 (console).
- **Demandes de modification** : `GET · POST /shop/change-requests {champ, valeur, rccm?, niu?, motif, pieces, code}`,
  `POST /shop/change-requests/code`, `DELETE /shop/change-requests/{id}` ; la console les décide sous 72 h ouvrées
  (`VD-CONTESTATION-REPONSE`) avec un motif écrit. Pièces : `POST /uploads` existant (extrait RCCM, attestation NIU,
  pièce d'identité). Le numéro de versement garde son parcours (`/payout-number/codes`, deux codes, 7 jours, Q-19).
- **Échanges avec les autres interfaces** (`INTERFACES.md`) : **nouveau** flux `GET /events?depuis=` et
  `GET /events/stream` (SSE) ; **nouveau** `POST /orders/{id}/not-ready {raison}` (colis pas prêt au passage du
  livreur : ramassage au créneau suivant, P-6). Côté console : `POST /admin/change-requests/{id}/decide`,
  `POST /admin/locations/{id}/verify`, lecture de l'équipe d'une boutique.
