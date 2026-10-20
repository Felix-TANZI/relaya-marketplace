# Correspondance avec relaya-marketplace

Où et comment brancher les moteurs de `moteurs/` dans le serveur de BelivaY (`Felix-TANZI/relaya-marketplace`,
en production sur belivay.com). Document pour l'équipe de relaya-marketplace et pour le porteur.

- **Instantané lu** : commit `9546ffe` (branche principale, 3 oct. 2026), en lecture seule ; rien n'a été modifié
  dans relaya-marketplace.
- **Méthode** : trois lectures complètes (commandes, livraison et catalogue ; paiements ; comptes, vendeurs et
  réglages), puis vérification à la main des points qui engagent une décision (version de Python, motif de
  collecte des tests, remboursement des litiges, politique de libération, distance, réaffectation, garde).
- **Notation** : `R:` = `backend/apps/` de relaya-marketplace ; les numéros de ligne sont ceux de l'instantané.
- **Règle** : la spécification et les décisions du porteur (DP-xx) fixent la logique ; là où relaya-marketplace
  calcule autrement, c'est relaya-marketplace qui doit changer, sauf les points de la section 11, à arbitrer.

---

## 1. L'essentiel

1. **Le précédent existe** : `R:payments/domain/` est déjà une couche pure (francs entiers, `Decimal`, float
   interdit, objets immuables, arrondi HALF_UP, exceptions sans Django, test d'isolation par l'AST). Les moteurs
   suivent les mêmes conventions ; ils s'installent comme un paquet à côté (section 2).
2. **Python 3.11 en production** (`backend/Dockerfile.prod`, `FROM python:3.11-slim`) et en intégration continue ;
   3.12 seulement dans l'image de développement. Les moteurs sont testés sous 3.11 et 3.12.
3. **Pas de sous-commande** : relaya-marketplace a une commande par panier et un `Shipment` par vendeur ; les états
   de préparation sont portés par la commande entière. La spécification raisonne par sous-commande (une boutique =
   un colis, CCY-15). C'est le plus gros changement de modèle (section 4).
4. **Pas de classe de colis au panier** : `Product` n'a ni classe, ni poids, ni dimensions ; la taille (SMALL…
   BULKY) n'est déduite qu'à la réception au relais. Les frais (remise par classe, XL interdit en relais,
   supplément XL) en ont besoin dès le panier.
5. **Frais de livraison** : la formule de relaya-marketplace (base + vendeur suivant, majoration Vague 3) n'est pas
   celle de la spécification (ramassage par zone, remise par colis, livraison offerte, suppléments) ; sans règle en
   base, elle rend 0 F. `frais.calculer` la remplace.
6. **Garde** : 3 jours gratuits puis 200 F par jour (`R:shipping/models.py:432-459`) contre la grille DP-08 par
   rang ; au renvoi, relaya-marketplace retient aussi la livraison et rembourse sur le sous-total de toute la
   commande pour chaque colis (risque de remboursements multiples). `garde.renvoi` le remplace.
7. **Rien pour le comptoir, l'annulation par boutique, le changement de relais, la carte, les dollars, le
   portefeuille, le remplacement, les rappels S0 à S5** : ce sont des ajouts, pas des corrections.
8. **Paramètres** : `R:payments/config/` a un modèle versionné à quatre yeux (`VersionedConfig`,
   `ConfigChangeRequest`) ; c'est là que vit le registre (section 3). `PlatformSettings` n'est pas versionné.
9. **Distances** : relaya-marketplace utilise OpenStreetMap à l'écran (Leaflet, Nominatim) et une haversine en
   float côté serveur (sphère de 6 371 km) ; pas de PostGIS. `geo.py` donne la distance géodésique WGS 84 de
   CAL-04 (DP-49).
10. **Deux points de principe à arbitrer** (section 11) : le remboursement automatique des petits litiges, que
    relaya-marketplace refuse par prudence anti-fraude, et la formule de satisfaction (borne de Wilson brute ou
    lissée).

---

## 2. Conventions : brancher les moteurs sans rien casser

| Sujet | relaya-marketplace | Moteurs | À faire à l'intégration |
|---|---|---|---|
| Montants | `Money(amount:int, currency=XAF)` (`R:payments/domain/money.py:59-71`), champs `*_xaf` entiers | `int` en francs, `argent.py` | rien : mêmes valeurs ; `pourcentage_de` = `Money.percent` (272 579 × 2 % = 5 452 F dans les deux) |
| Float | `to_decimal` refuse float et bool (`money.py:33`) | `argent.decimal` refuse float et bool | rien |
| Erreurs | `DomainError`, `MoneyError/FloatForbidden`, `StateError/IllegalTransition`, `PolicyError/NoApplicablePolicy` (`R:payments/domain/exceptions.py:7-115`) | `ErreurMoteur`, `ValeurInterdite`, `TransitionRefusee`, `ParametreAbsent`, `PanierInvalide` | traduire dans la couche API : `TransitionRefusee` → 409 `state_changed` ; `PanierInvalide` → 422 |
| Machines à états | table état → cibles, sans événement ni garde (`R:payments/domain/state_machines.py:26-60`) | `etats.Machine` : événements et gardes déclaratives (`exige`, `interdit`) | remplacer les affectations libres de `status` (section 5) |
| Format d'affichage | `Money.format` : « 1 234 567 FCFA », espace ordinaire | `argent.ecrire` : « 273 379 F », U+00A0, vrai signe moins (CCH-31) | l'API envoie des entiers, l'écran met en forme |
| Fuseau | `TIME_ZONE="Africa/Douala"`, `USE_TZ=True` (stockage UTC) | heures avec fuseau obligatoire ; jours et mois civils à l'heure de Yaoundé | passer des `datetime` avec fuseau (les moteurs convertissent) |
| Tests | pytest, pytest-django, factory-boy, `--cov=apps` sans seuil | pytest, couverture exigée à 100 % (`--cov-fail-under=100`), ruff ; lancés sous 3.11 et 3.12 avec uv | ajouter `moteurs/tests` à la CI (3.11) ; voir l'anomalie A1 |
| Lint | aucun lint Python en CI | ruff, longueur 120 | facultatif côté relaya-marketplace |

**Installation proposée** : copier `belivay_moteurs/` tel quel dans `backend/belivay_moteurs/` (ou l'installer
comme paquet), ajouter le même test d'isolation que `payments/domain` (aucun import de Django), et ne l'appeler
que depuis des services.

---

## 3. Paramètres (CCH-15) et interrupteurs

Aujourd'hui, les moteurs lisent `logique-metier/parametres-en-vigueur.json` (`registre.charger_registre`) et
portent son empreinte (`#version`, sha256 sur 12 caractères) dans chaque résultat.

**Proposition, dans le style de relaya-marketplace** :
- un modèle `BusinessParameter(VersionedConfig)` (code, valeur en texte, sens, gouvernance) sous le même
  contrôle à quatre yeux que les autres réglages (`ConfigChangeRequest`, `R:payments/config/models.py:952-1063`) ;
  N3 pour les seuils d'argent (LIT-AUTO-*, PAY-CARTE-*, WALLET-*), N2 pour les délais ;
- une commande `seed_business_parameters` qui charge `parametres-en-vigueur.json`, comme
  `seed_financial_config` ;
- les lectures `registre.lire_*` reçoivent le dictionnaire code → valeur construit depuis la base (au lieu de
  `charger_registre`, qui lit le fichier) ; l'empreinte des paramètres devient
  l'identifiant de version figé dans la commande (`Order.version_parametres`, à créer ; aujourd'hui la commande ne fige que
  `commission_rate_snapshot`, et le séquestre ses délais dans `policy_snapshot`) et dans `PaymentIntent.config_snapshot` ;
- **interrupteurs FF-*** : même modèle, catégorie « interrupteur » ; route `GET /config/flags` ; une permission
  DRF qui répond 404 quand le module est fermé (CFS-02, CAP-13). Rien n'existe aujourd'hui.

Les règles qui ont déjà un modèle typé peuvent aussi y vivre :

| Codes | Modèle relaya-marketplace | Ajout nécessaire |
|---|---|---|
| PAY-CARTE-FRAIS (2 %) | `FeeRule` COLLECT, payé par l'acheteur | lever le refus d'un payeur autre que la plateforme (`R:payments/application/collect.py:502-519`) ; composant « frais de service » dans le plan de répartition (`confirm_payment` exige montant = séquestre + produits, `collect.py:443-449`) |
| PAY-CARTE-MAX (150 000 F) | `ProviderConfig.max_amount_xaf` du prestataire carte | le découpage reste `carte.payer_par_carte`, en amont |
| LIB-STD 3 j, LIB-OR 1 j, LIB-CARTE 14 j | `EscrowPolicy` (`filter_certification_tier`, `release_delay_hours`) | transmettre le palier à `resolve_policy_for` (aujourd'hui absent, `R:payments/escrow/services.py:100-103` et `:447`) ; filtre « moyen de paiement » ; délai compté depuis la fermeture du retour |
| Versement le vendredi (CAL-29) | `SettlementCycle.anchor_day=5` | l'appliquer dans `build_settlements` (lots construits chaque jour, `R:payments/tasks/jobs.py:99-104`) |
| Tout le reste (garde, comptoir, litiges, portefeuille, avis…) | — | `BusinessParameter` |

---

## 4. Entités de la spécification et modèles de relaya-marketplace

| Spécification (`modele-donnees.json`) | relaya-marketplace | Manque |
|---|---|---|
| Client | `auth.User` + `UserProfile` (`R:accounts/models.py:212`) ; clés entières, pas d'uuid | langue, thème, relais habituel, CGU (version, date), suppression ; bloc IFA (palier, compteurs 12 mois, rétrogradations) |
| Adresse | `Order.delivery_latitude/longitude`, ville, quartier | objet Adresse (nom, quartier = zone, repères, position) ; contrôle de zone (`geo.zone_exploitee`, 422 `zone_non_servie`) |
| Panier · LignePanier | `UserCart.items` en JSON, prix envoyés par le client (`R:accounts/serializers.py:300-309`) | panier serveur recalculé depuis zéro (`GET /cart`), offre attribuée par ligne, mode et relais |
| Reservation | aucune ; `Inventory.quantity` ni vérifié ni décrémenté | réservation par tentative (CAL-12), expiration |
| Commande | `Order` (`R:orders/models.py:33`) : sous-total, frais, total | `ref` BLV-nnnnn, montants figés (S, Ram, Rem, Suppl, Off), `version_parametres`, mode validée au comptoir |
| SousCommande | **absente** (`Shipment` par vendeur, états de préparation sur la commande) | entité complète : lettre, vendeur, zone, sous-total, état, classe, délai de préparation, prêt estimé, annulée par et motif |
| Colis · GroupeRemise | `Shipment` (`R:shipping/models.py:169`) + `RelayParcel` (`:384`) ; code de 6 caractères hexadécimaux | GroupeRemise (un code par groupe, J0, accusé fort, garde due, blocage, essais faux, renvois sur 24 h) ; code à 6 chiffres + QR |
| Paiement · Tentative | `PaymentIntent` (une intention pour N commandes) + `PaymentAttempt` | état `replaced` (changement de numéro), moyen de paiement (carte, Apple Pay, Google Pay), devise et taux figé |
| Escrow · Mouvement | `EscrowHold` par (intention × commande × bénéficiaire × composant) + `EscrowEvent`, registre en partie double | palier et moyen de paiement dans la politique ; date de fermeture du retour |
| Litige · Preuve | `Dispute` (`R:orders/models.py:351`), par article | `ref` LIT-nnnn, origine (app, comptoir), souhait, échéances, recours, arrangement, montant retenu ; un dossier par colis |
| Retour · Remplacement | `Return` (`R:orders/models.py:600`) ; **pas de Remplacement** | lien au litige, dépôt, collecte, échéance d'inspection, payeur du trajet ; modèle Remplacement complet |
| Avis | `ProductReview` (par article), `RelayPointReview` (sans route de création) | cible vendeur ou relais, fenêtre de 7 jours, photo, modération |
| JourDeGarde | aucun | une ligne par jour (rang, tarif, fermé, gelé, cumul) |
| Relais | `RelayPointProfile` (`R:accounts/models.py:166`) : horaires en texte libre, capacité (`storage_capacity`) | horaires structurés (jours, ouverture, fermeture, fermetures exceptionnelles) |
| Zone | `Zone` (`R:shipping/models.py:17`) | zones exploitées (DP-09) |
| Trust Score | `TrustScoreProfile` (`R:accounts/models.py:466`), service de calcul `R:accounts/trust_score.py` | rien côté moteurs : relaya-marketplace **est** le service Scores (CAL-30) ; les moteurs lisent `score` et `tier` |

---

## 5. Machines à états

Aujourd'hui, la plupart des statuts sont posés sans garde : méthodes de `Order` (`R:orders/models.py:237-307`),
événements de livraison qui acceptent tout statut (`R:shipping/serializers.py:763-775`), action d'un livreur sur
un colis qui change toute la commande (`R:shipping/serializers.py:820-860`), statut de litige libre (`R:vendors/views.py:5374`). Seule exception : le
vendeur suit une table de transitions (`VENDOR_TRANSITIONS`, `R:vendors/serializers.py:375-411`, refus en 400). À
l'intégration, chaque changement d'état passe par `etats.<MACHINE>.appliquer(etat, evenement, contexte)` ; un
refus devient 409 `state_changed`.

| Machine (etats.py) | Correspondance relaya-marketplace | Absent côté relaya-marketplace |
|---|---|---|
| COMMANDE | panier ≈ UserCart ; en_attente_paiement ≈ PENDING/CREATED ; payee ≈ PAID_IN_ESCROW ; terminee ≈ RELEASED_TO_VENDOR ; annulee ≈ CANCELLED/REFUNDED | validee_comptoir ; retour au panier après échec, expiration ou annulation du paiement |
| SOUS_COMMANDE | payee ≈ Shipment CREATED ; confirmee ≈ VENDOR_ACKNOWLEDGED/PREPARING ; prete ≈ READY_FOR_PICKUP ; collectee ≈ PICKED_UP ; arrivee_relais ≈ RelayParcel STORED ; en_livraison_domicile ≈ OUT_FOR_DELIVERY ; remise ≈ PICKED_UP/DELIVERED ; en_litige ≈ DISPUTED ; renvoyee_vendeur ≈ RETURNED_TO_VENDOR ; annulee ≈ CANCELLED | gardes de collecte (2 photos, scellé ; le code de remise vendeur → livreur existe déjà, `R:shipping/serializers.py:837-845`), de dépôt (code), de remise (montant dû, nombre de colis) ; rupture → vendeur suivant |
| TENTATIVE_PAIEMENT | pending ≈ INITIATED/PENDING ; verifying = re-interrogation (non stockée) ; succeeded ≈ SUCCESSFUL ; failed ≈ FAILED/TIMEOUT ; cancelled ≈ annulation de l'intention | replaced (aujourd'hui, une tentative ouverte est réutilisée et un nouveau numéro n'a pas d'effet, `collect.py:217-226`) |
| ESCROW | escrow_bloque ≈ HELD ; suspendu ≈ FROZEN ; escrow_liberable ≈ RELEASE_SCHEDULED/RELEASED ; verse ≈ versement PAID ; rembourse ≈ REFUNDED | granularité par sous-commande |
| LITIGE | ouvert ≈ OPEN ; attente_vendeur ≈ OPEN + vendeur contacté ; en_examen ≈ IN_PROGRESS ; decide ≈ RESOLVED | rembourse_automatiquement, recours, arrangement côté client (5 jours) |
| RETOUR | accepte ≈ APPROVED/AWAITING_DROPOFF ; recu ≈ RECEIVED ; clos ≈ REFUNDED/CLOSED_NO_REFUND | retour_depose, collecte, retour_inspecte, remboursement automatique à la fin de l'inspection (48 h) ; le retour naît d'un litige (pas de REQUESTED/REJECTED) |
| REMPLACEMENT | aucune | toute la machine |

États de relaya-marketplace sans équivalent dans la spécification (affectation manuelle, zone non couverte,
capacité, véhicule, plafond de valeur, incident, échec ; colis REFUSED, RETURN_REQUESTED, RETURNED_TO_BELIVAY) :
ce sont des états d'exploitation de la livraison ; ils restent côté relaya-marketplace et se ramènent à
SOUS_COMMANDE par une table de correspondance.

---

## 6. Brancher chaque moteur

### frais.py : frais du panier
- **Appel** : à la place de `_compute_delivery_price` (`R:orders/serializers.py:65-106`, appelé `:367`) et de
  `delivery_fee_xaf` (`R:payments/bridge/queries.py:39`) ; dans `GET /cart` (à créer) ; `verifier_au_paiement`
  dans la création de commande, avant `Order.objects.create` (`R:orders/serializers.py:415`), avec 409
  `price_changed` et `/checkout/confirm`.
- **Entrées** : mode ← `delivery_method` (PICKUP → relais, DELIVERY → domicile) ; boutique ← vendeur ; zone ←
  `VendorProfile.zone` ; prix ← prix de l'offre (attention : `Product.price_xaf` sans la remise, alors que le
  classement applique `discount`) ; quantité ; **classe : à ajouter au produit** ; distance boutique → domicile ←
  `geo.distance_km(position de la boutique, position de l'adresse)` (**position de la boutique à vérifier** :
  `VendorLocation`, `R:vendors/models.py:369`).
- **Sorties à figer sur la commande** : S, Ram, Rem, Suppl, Off, total, seuil, `version_parametres`.
- **Écart chiffré** : sans règle en base, relaya-marketplace facture 0 F (aucun barème n'est chargé) ; l'ancien
  commentaire du calcul (`R:orders/serializers.py:70-74`) annonce 500 F en relais, 1 000 F à domicile, +500 F par
  boutique de la même zone. La spécification : 900 F en relais (500 + 400), 1 500 F à domicile, +780 F (380 + 400).

### garde.py : garde et rappels S0 à S5
- **Appel** : `RelayParcelSerializer.get_garde_fee_due_xaf` (`R:shipping/serializers.py:422`) ;
  `GET /orders/{id}/storage` (à créer) ; `garde.renvoi` à la place de `_process_non_retrait`
  (`R:shipping/management/commands/process_relay_garde.py:43-58`) ; une tâche quotidienne pour `rappels` et
  `relance_non_vu` (aujourd'hui une notification à la création du code et une au renvoi).
- **Entrées** : valeur ← somme des lignes du groupe ; gros ← au moins un carton C1 ou C2 (GARDE-GROS-AJOUT ; XL et HG ne vont jamais en relais) ; J0 ← premier accusé fort (à créer,
  aujourd'hui `received_at`) ; horaires structurés du relais ; jours suspendus (litige, groupage, transfert) ;
  rappels non délivrés (statut de remise des notifications) ; montant payé du groupe (séquestre).
- **Différences** : grille par rang (DP-08) au lieu de 3 jours gratuits puis 200 F ; pas de prolongation
  (`extend-relay-garde` n'a pas d'équivalent) ; renvoi 500 F ; retenue jamais au-delà du payé (DP-24, DP-48) ;
  calcul par groupe de remise et non par colis.

### comptoir.py : paiement au comptoir et code
- Rien n'existe : `/cart/eligibility/counter`, `/checkout/counter`, `/orders/{id}/counter-payment`, refus du
  client au comptoir, encaissement au retrait.
- `CompteClient` : commandes retirées et sans incident ← colis retirés et litiges ; **refus au comptoir à créer**
  (`UserProfile.non_retrait_count` compte les non-retraits, autre chose) ; IFA négatif ← profil IFA (absent,
  section 11) ; refus du vendeur ← réglage vendeur à créer.
- Code : 6 chiffres et QR (aujourd'hui `secrets.token_hex(3)`) ; essais faux, blocage 24 h, renvois sur 24 h.

### annulation.py : annulation par boutique, changement de relais
- `POST /suborders/{id}/cancel` à créer à côté de `CancelOrderView` (`R:orders/views.py:231-330`, commande
  entière) ; entrées : commande regroupée par vendeur, collectée ← statut du colis, Off et encaissé ← séquestre,
  déjà remboursé ← remboursements de la commande (**`PaymentIntent.amount_refunded_xaf` n'est jamais tenu à jour**,
  anomalie A6).
- `PUT /orders/{id}/relais` et `POST /parcels/{id}/transfer` à créer ; `Shipment.relay_point` est un nom en
  texte, à remplacer par une clé vers le relais ; relais fermé (DP-42) à modéliser.

### carte.py : carte, Apple Pay, Google Pay, euros et dollars
- Rien n'existe : devise XAF seule, prestataires CamPay et MOCK. À créer : prestataire carte (PAY-CARTE-PSP :
  CinetPay, Flutterwave en secours), 3-D Secure, `/gift-links/{token}`, `/gift-payments`.
- `payer_par_carte` en amont de `checkout_v2.prepare_payment` (`R:payments/bridge/checkout_v2.py:68`) : une
  intention par transaction de 150 000 F au plus ; devise, montant en devise et taux du jour figés sur l'intention.
- `part_du_service` à l'annulation (CET-24) : champs « frais de service débités » et « déjà répartis », et
  l'auteur de l'annulation, sur le remboursement.

### catalogue.py : prix livré, offre attribuée, vendeur suivant, visibilité
- `prix_livre` et `prix_de_carte` dans les sérialiseurs produit et produit maître (`buy_box_price_xaf`,
  `R:catalog/serializers.py:1010`) : aujourd'hui seul le prix nu est exposé.
- `attribuer` à la place de `buy_box_offer` (`R:catalog/models.py:634`, `:974`) et de `ranked_offers`
  (`R:catalog/scoring.py:151`) : la spécification retient le **coût total livré dans le panier et le mode du
  client**, Trust Score en départage, pas un score pondéré.
- `vendeur_suivant` à la place de `find_reassignment_candidate` (`R:orders/reassignment.py:22-57`) : Trust Score
  ≥ 75, coût livré au plus 5 % au-dessus, écart payé par BelivaY, au plus 2 essais (DP-01), au lieu de « même
  zone, prix inférieur ou égal, écart remboursé après validation ».
- `visibilite` dans `ProductViewSet.get_queryset` (`R:catalog/views.py:136`) : le catalogue public **ne filtre pas
  sur le statut du vendeur** (DP-47 : pièce non validée → produits invisibles) ; état « Épuisé » en fin de liste.

### delais.py : délais affichés et dissociation
- `pret_dans` et `compte_a_rebours` à la place de `Shipment.estimated_availability_at`
  (`R:shipping/models.py:269-287`) ; `reponse_sous` sur `Dispute.vendor_reply_deadline` (existe).
- `dissociation` (DP-32) dans la génération du code : aujourd'hui le code n'est créé que quand **tous** les colis
  sont arrivés (`R:shipping/serializers.py:547-553`).

### geo.py : distances et relais (DP-49)
- `distance_km` à la place de `_haversine_km` (`R:shipping/views.py:67`, sphère, float, arrondi à 0,01 km) dans
  `RelayPointNearbyView` (`:197-254`) ; `relais_proches` y ajoute les filtres « ouvert aujourd'hui » et « non
  saturé » avec la ligne qui le dit (CRL-03) : la vue calcule déjà l'occupation et `has_space`
  (`:211-241`) sans filtrer, et ne connaît pas « fermé aujourd'hui ».
- `_estimate_shipment_distance_km` (`R:shipping/views.py:931`) est une pseudo-distance : à remplacer par
  `distance_m` sur les positions réelles.
- Fond de plan OpenStreetMap déjà en place à l'écran (`frontend/src/config/maps.ts`) ; en production, tuiles et
  géocodage par un serveur propre ou un fournisseur OSM (règles d'usage d'OpenStreetMap).

### litiges.py : litiges, retours, libération
- `remboursement_automatique` dans `OrderDisputeListCreateView.create` (`R:orders/views.py:535`) : **voir
  section 11** (principe opposé côté relaya-marketplace).
- `echeances`, `recours_possible`, `fin_reponse_arrangement` : champs d'échéance, de recours et d'arrangement à
  créer ; `admin_resolve_dispute` (`R:vendors/views.py:5465`) ne vérifie pas l'état courant (anomalie A8).
- `voie_de_retour`, `rembourser_retour`, `fin_inspection` : dans la création du retour (`R:orders/views.py:665`)
  et sa finalisation ; partie en tort et trajet de 500 F à modéliser ; fenêtre de retour de **7 jours**
  (RET-FENETRE) contre `litige_window_days=4` (`R:orders/models.py:730`).
- `fermeture_du_retour` et `liberation` dans `trigger_release` (`R:payments/escrow/services.py:148-192`) : palier,
  moyen de paiement, date de retrait, « Tout est en ordre », vendredi.

### notes.py : notes affichées
- `note_affichee` et `repartition` dans `ProductSerializer.get_rating_average` (`R:catalog/serializers.py:423-431`)
  et une route `/reviews/summary` : aujourd'hui `round()` de Python, arrondi au pair (4,25 → 4,2) contre HALF_UP
  (4,3) ; pas de répartition par étoile.
- `note_basse` et `fin_de_notation` dans la validation d'un avis (`R:catalog/serializers.py:226`).

### portefeuille.py
- Fermé au lancement (FF-WALLET). relaya-marketplace l'a écarté par choix réglementaire
  (`R:payments/config/models.py:493-496`) : cohérent avec un interrupteur fermé. Le moteur attend l'ouverture.

### etats.py
- Voir section 5.

---

## 7. Routes de l'API

| Spécification (`api.json`) | relaya-marketplace | État |
|---|---|---|
| `GET /cart`, `POST/PATCH/DELETE /cart/lines…`, `swap-offer` | `GET/PUT /api/auth/cart/` sans recalcul | à créer |
| `GET /cart/eligibility/counter`, `POST /checkout/counter`, `POST /orders/{id}/counter-payment` | — | à créer |
| `POST /checkout`, `/checkout/confirm` (Idempotency-Key, 409 `price_changed`) | `POST /api/orders/` (`R:orders/views.py:86`), sans contrôle de prix ni réservation | à reprendre |
| `GET /payments/{id}`, `POST /payments/{id}/resend|cancel|abandon` | `me/payments/<ref>/`, `<ref>/pay/`, `<ref>/check/` | en partie ; resend, cancel, abandon à créer |
| `POST /webhooks/campay` | `api/payments/webhooks/campay/` (7 couches, re-interrogation) | existe |
| `GET /me/orders`, `GET /orders/{id}`, `/tracking` | `my-orders/`, `<id>/`, `<id>/tracking/` | existe, à enrichir (état par colis) |
| `/orders/{id}/code/reveal|resend|renew`, `/storage`, `/all-good`, `/manage` | — | à créer |
| `POST /suborders/{id}/cancel`, `PUT /orders/{id}/relais`, `POST /parcels/{id}/transfer` | `POST <id>/cancel/` (commande entière) | à créer |
| `GET /relais?near=&open_today=1&not_full=1` | `GET /api/shipping/relay-points/nearby/` | existe, sans filtres |
| `/products/{maitre}?relais=` (offre attribuée, prix livré), `/reviews/summary` | `catalog/products`, `master-products`, `variants/<sku>` | à enrichir |
| `POST /disputes` (auto_refunded), `/me/disputes`, `/returns/{id}/inspection`, `/replacements/{id}` | `POST /api/orders/<id>/disputes/`, `/returns/` ; inspection par l'admin | en partie |
| `POST /orders/{id}/reviews` (403 `non_eligible`, 410 `fenetre_fermee`) | `add_review` par produit, 400 générique | à reprendre |
| `GET /config/flags` | — | à créer |
| `/gift-links/{token}`, `/gift-payments`, `/me/moyens-paiement` | — | à créer |

**Conventions** : pas de préfixe `/api/v1` (seul `payments/v2`) ; pas de format d'erreur commun (DRF
`{"detail": …}`, transitions refusées en 400) alors que CAP-04 demande `{error:{code,message,data}}` et 409 ;
pagination par numéro de page alors que CAP-05 demande un curseur ; en-tête Idempotency-Key non lu (CAP-03). Un
gestionnaire d'exceptions DRF et une pagination par curseur couvrent ces trois points d'un coup.

---

## 8. Écarts de règles : relaya-marketplace contre les décisions

| Sujet | relaya-marketplace | Spécification / décision |
|---|---|---|
| Frais de livraison | base + vendeur suivant, Vague 3 | Ram par zone, remise par colis, livraison offerte, suppléments (DP-07, DP-18, DP-19, DP-25) |
| Garde | 3 jours gratuits puis 200 F, prolongation 4 jours | grille par rang 0 · 100 · 100 · 100 · 200 · 500 · 1 000 F, +300 F gros colis, pas de prolongation (DP-08) |
| Retenue au non-retrait | garde + livraison | garde + 500 F de renvoi, jamais au-delà du payé, renvoi couvert d'abord (DP-24, DP-48) |
| Vendeur suivant | même zone, prix ≤, écart remboursé après validation | Trust ≥ 75, ≤ +5 %, écart payé par BelivaY, 2 essais (DP-01) |
| Offre mise en avant | score pondéré (prix 30, note 20…) | coût total livré le plus bas, Trust Score en départage (CAL-02) |
| Fenêtre de retour | 4 jours | 7 jours (RET-FENETRE) |
| Libération du vendeur | 24 h chargées par `seed_financial_config` (72 h par défaut dans les modèles), paliers non transmis, versement chaque jour | 3 j, 1 j (Or, Platine), 14 j (carte), versement le vendredi (CAL-29) |
| Paliers vendeur | trois systèmes (TrustScoreProfile, `certification_tier` BRONZE…DIAMOND, RewardAccount) | Bronze, Argent, Or, Platine du service Scores |
| Code de retrait | 6 caractères hexadécimaux, créé quand tous les colis sont arrivés | 6 chiffres + QR, dissociation après 24 h (DP-32) |
| Note affichée | arrondi au pair, sur float | HALF_UP au dixième |
| Visibilité | modération et catégories masquées | pièce du vendeur validée, liste interdite (CTV-31), épuisé en fin de liste |
| Distance | haversine, sphère, float | géodésique WGS 84 (CAL-04, DP-49) |

---

## 9. Anomalies relevées dans relaya-marketplace

À signaler à son équipe ; chacune est indépendante des moteurs.

| # | Où | Constat |
|---|---|---|
| A1 | `backend/pytest.ini` | `python_files = test_*.py *_tests.py` : les fichiers `apps/*/tests.py` (comptes 50 tests, commandes 15, livraison 58, vendeurs 13, common 19) ne sont pas collectés par pytest, donc pas lancés en CI (déduit du motif) |
| A2 | `R:shipping/management/commands/process_relay_garde.py:43-49` | remboursement calculé sur le sous-total de **toute** la commande pour **chaque** colis : une commande à plusieurs colis peut être remboursée plusieurs fois |
| A3 | `R:orders/serializers.py:102-106` | la ville n'est pas transmise au calcul des frais : les règles par ville ne s'appliquent jamais ; sans règle en base, les frais valent 0 F |
| A4 | `R:payments/escrow/services.py:100-103` | `resolve_policy_for` appelé sans palier : les politiques de libération par palier ne s'appliquent jamais |
| A5 | `R:payments/tasks/jobs.py:99-104` | lots de versement construits chaque jour ; `anchor_day` et `allowed_weekdays` non appliqués |
| A6 | `R:payments/settlements/services.py:871-877`, `:1071-1117` | `amount_refunded_xaf` et les statuts REFUNDED de l'intention jamais écrits ; plafond de remboursement sur le montant total, qui ignore les remboursements en attente d'approbation (plusieurs demandes passent chacune le plafond) ; soldes des séquestres par `update()` qui contourne la machine à états |
| A7 | `R:payments/application/collect.py:217-226` | une tentative ouverte est réutilisée : un nouveau numéro de paiement n'a pas d'effet |
| A8 | `R:vendors/views.py:5465` | résolution d'un litige sans contrôle de l'état courant : double résolution possible (à confirmer par un test) |
| A9 | `R:payments/domain/fees.py:283` | `split_fee` lit une clé jamais remplie : un partage de frais lève toujours une erreur (fonction non appelée) |
| A10 | `R:shipping/serializers.py:242-243` contre `R:shipping/views.py:904` | part du livreur : 75 % codés en dur d'un côté, règle de répartition de l'autre |
| A11 | `R:orders/models.py:755` | `minimum_order_amount_xaf` jamais appliqué au paiement |
| A12 | `R:catalog/models.py:1400-1403` | `stock_claimed` des campagnes jamais incrémenté |
| A13 | `R:payments/config/models.py:459-470` contre `seed_financial_config.py:157-158` ; `R:orders/views.py:538`, `:684` | délais par défaut du modèle (96 h, 72 h) différents des valeurs chargées (48 h, 24 h) ; fenêtre de litige 4 jours côté commandes (`PlatformSettings`) contre 7 jours dans la configuration financière chargée |
| A14 | `backend/requirements.txt:2` (`Django>=5.1,<5.2`) | Django 5.1 n'a plus de correctifs de sécurité depuis décembre 2025 (5.2 LTS jusqu'en 2028) |

---

## 10. Plan d'intégration, par lots

Chaque lot se livre avec ses migrations et ses tests ; les moteurs ne changent pas.

1. **Socle** : paquet `belivay_moteurs` dans le dépôt, test d'isolation, CI 3.11 ; `BusinessParameter` et le
   chargement du registre ; `version_parametres` figé sur la commande ; interrupteurs FF-* et `/config/flags` ;
   gestionnaire d'erreurs `{error:{code,message,data}}`.
2. **Catalogue et panier** : classe de colis sur le produit ; panier serveur (`/cart`), offre attribuée
   (`attribuer`), prix livré (`prix_livre`), visibilité ; positions des boutiques et des adresses, `geo`.
3. **Commande et sous-commande** : entité SousCommande, montants figés, `frais.calculer` et
   `verifier_au_paiement`, réservation de stock, machines COMMANDE et SOUS_COMMANDE.
4. **Paiement** : tentative `replaced`, carte et devises (`carte`), frais de service, comptoir (`comptoir`,
   intention « livraison seule » puis encaissement au retrait).
5. **Relais** : horaires structurés, GroupeRemise, code à 6 chiffres, `garde` (grille, renvoi, rappels S0 à S5,
   tâche quotidienne), `delais.dissociation`, changement de relais et transfert (`annulation.changer_de_relais`).
6. **Annulation et argent rendu** : annulation par boutique (`annulation.annuler`), tenue de
   `amount_refunded_xaf`, `part_du_service`.
7. **Litiges, retours, remplacement, avis** : champs et machines LITIGE, RETOUR, REMPLACEMENT ; `litiges` ;
   `vendeur_suivant` ; avis par cible ; `notes`.
8. **Libération et versements** : palier et moyen de paiement dans la politique, fermeture du retour, vendredi.
9. **Portefeuille** : seulement à l'ouverture de FF-WALLET, après validation juridique.

---

## 11. À arbitrer

1. **Remboursement automatique des petits litiges** (LIT-AUTO-STD 3 000 F, LIT-AUTO-ELEVE 10 000 F, CLT-24,
   CCY-23) : la spécification rembourse tout de suite, sans dossier, sous le seuil du palier IFA, payé par
   BelivaY. relaya-marketplace refuse tout remboursement sans approbation d'un tiers, contre la fraude par
   litige (`R:payments/bridge/events_in.py:630-650`). La spécification le limite déjà aux paliers IFA « Élevé » et
   « Standard » (CLT-24, `litiges.seuil_automatique`) ; une voie médiane ajouterait un plafond par jour et par
   client et un contrôle a posteriori. **Décision du porteur, avec l'équipe de relaya-marketplace.**
2. **Satisfaction du Trust Score** : relaya-marketplace lisse la borne de Wilson (a priori de 18 succès sur 20,
   demi-vie de 90 jours, `R:accounts/trust_score.py:118-134`) ; `notes.borne_wilson` est la borne brute à 95 %.
   CAL-30 confie le Trust Score au service Scores, c'est-à-dire à relaya-marketplace ; `notes.borne_wilson` ne
   sert alors qu'au départage des avis. **Proposition : garder leur formule pour le Trust Score, la nôtre pour
   les avis.**
3. **Paliers IFA** (Élevé, Standard, À instruire, Plafonné) : le profil IFA existe (`TrustScoreProfile`, rôle
   BUYER) mais n'a pas de règles de palier (`R:accounts/trust_score.py:63-77`) ; sans lui, ni le remboursement
   automatique, ni l'éligibilité au comptoir ne peuvent s'appliquer. Calibrage prévu après 3 mois (IFA-NABS,
   DP-35).
