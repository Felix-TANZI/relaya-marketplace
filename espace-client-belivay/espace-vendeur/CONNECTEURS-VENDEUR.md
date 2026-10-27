# Connecteurs de l'espace vendeur : du site au serveur

Ce document dit, pour chaque méthode de la source de l'espace vendeur (`src/donnees/source.ts`, vingt domaines), la
route du serveur qui la sert. Toutes les routes sont celles du kit (`backend-kit/apps/vendeur_*`), sous **`/api/vendors/`**
(préfixe de relaya-marketplace, Q-51 ; noms du paquet, table `logique-metier/vendeur/api-vendeur.json`), **sans barre
finale** : elles coexistent avec les routes existantes de relaya (`/api/vendors/orders/`, avec barre) sans les masquer.
Contrat : `backend-kit/openapi.yaml`, étiquette « Espace vendeur » (schémas `Vendeur_<domaine>_<Type>`).

## 1. Basculer de la démonstration au serveur

| Variable | Démonstration (défaut) | Serveur |
|---|---|---|
| `VITE_SOURCE` | `demo` (ou absente) | `api` |
| `VITE_API_URL` | inutile | `https://belivay.com/api` (ou `/api` derrière un mandataire, même origine) |

Mêmes variables que le site client (`site/src/config/env.ts`, partagé) : l'espace vendeur est servi sous `/vendeur/`,
même domaine, **même jeton** (simplejwt de relaya). Rien d'autre ne change : les écrans appellent `source.<domaine>.<méthode>()`.

```
écrans ──► source (SourceVendeur, 20 domaines)
             ├─ demo : src/demo/source-demo.ts (localStorage)
             └─ api  : src/api/source-api.ts ──► src/api/domaines/<domaine>.ts ──► client HTTP du client (site/src/api/client.ts)
                                                                                    └──► /api/vendors/… (kit vendeur_*)
```

## 2. Conventions

- Réponses : exactement les types des domaines (`src/donnees/domaines/*.ts`) : champs camelCase, dates en ms, montants
  en francs entiers, calculés par les moteurs (`moteurs/belivay_moteurs`) au serveur.
- Un refus attendu par l'écran (`Resultat`, `{ ok: false, raison }`) est un `200` ; « T | null » introuvable : `404` → null.
- **Accès employé** : `403 owner_only` sur l'argent, les versements, les plans, l'équipe, les prix, la publication ;
  `403 forbidden_right` hors des droits cochés pour cet employé (`backend-kit/apps/vendeur_core/droits.py`, même
  catalogue que `src/donnees/droits.ts`) → `ReserveAuProprietaire` (src/api/outils.ts) ; ailleurs, les montants
  arrivent à `null`.
- **Anonymat** : aucune réponse ne porte le client (nom, numéro, adresse, quartier, relais, mode, total payé) : vérifié
  route par route sur la boutique de démonstration (`backend-kit/apps/vendeur_core/tests/test_contrat_vendeur.py`).
- `Idempotency-Key` sur les créations et les actions d'argent (le connecteur envoie `idempotence: true`).
- Méthodes « démonstration seulement » : gestes d'une autre interface (le livreur saisit le code, le client annule, le
  prestataire répond au KYC, changer de membre) ; sur le serveur d'essai, ils passent par `/api/_essai/…`
  (`backend-kit/_essai/relaya_essai/essai_vendeur.py`).

## 3. Méthodes de la source, par domaine

Tableau écrit par `node ../backend-kit/outils/node_modules/.bin/tsx outils/connecteurs.mjs` depuis `src/api/routes.ts` (ne pas modifier à la main).

<!-- connecteurs:debut -->

239 méthodes : **232 branchées**, 1 branchées en partie, **0 à créer côté serveur**, 2 à finir côté site, 4 propres à la démonstration (gestes d'une autre interface : livreur, prestataire, client, changer de membre).

### Session (33/36 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `session.session` | branché | GET /api/vendors/session | → SessionVendeur | sans jeton : connecte false ; compte avec un dossier sans boutique : connecte true, boutique null |
| `session.connecter` | branché | POST /api/vendors/auth/login {identifiant, motDePasse, seSouvenir?, appareil} | → ResultatConnexion + jetons {access, refresh} | identifiants faux : 200 {ok: false, raison: identifiants} (VD03-R03) ; 5 faux : 15 min, propriétaire prévenu (CNX-03) |
| `session.connecterAvec` | à finir côté site | SDK Google / Apple (OAuth) puis POST /api/vendors/auth/login |  | comme l’espace client : à brancher côté site |
| `session.validerDeuxiemeFacteur` | branché | POST /api/vendors/auth/2fa {code, appareil, challenge_id?} | → ResultatCode + jetons | appareil reconnu ensuite |
| `session.defiEnCours` | branché | GET /api/vendors/auth/2fa?appareil= | → DefiConnexion ; 404 → null |  |
| `session.renvoyerDeuxiemeFacteur` | branché | POST /api/vendors/auth/2fa/resend {appareil} | → ResultatRenvoi |  |
| `session.demanderCodeNumero` | branché | POST /api/vendors/auth/otp {telephone, canal: sms\|whatsapp, seSouvenir?, appareil} | → ResultatCodeNumero ; 400 appareil |  |
| `session.envoiNumero` | branché | GET /api/vendors/auth/otp?appareil= | → EnvoiCode ; 404 → null |  |
| `session.validerCodeNumero` | branché | POST /api/vendors/auth/verify {code, appareil} | → ResultatCode + jetons |  |
| `session.renvoyerCodeNumero` | branché | POST /api/vendors/auth/otp/resend {canal, appareil} | → ResultatRenvoi |  |
| `session.demanderLienMotDePasse` | branché | POST /api/vendors/auth/password-reset {identifiant} | → {ok, lien} \| {ok: false, raison: vide} | même réponse que le compte existe ou non ; lien 15 min par SMS (et e-mail) |
| `session.ouvrirLienMotDePasse` | branché | POST /api/vendors/auth/password-reset/open {jeton} | → {ok, nouveau} \| {ok: false, raison: expire} | code SMS au titulaire |
| `session.choisirMotDePasse` | branché | POST /api/vendors/auth/password-reset/confirm {jeton, code, motDePasse} | → ResultatCode \| {ok: false, raison: faible} | MDP-LONG et validateurs Django |
| `session.deconnecter` | branché | POST /api/vendors/auth/logout {refresh} | → SessionVendeur | jetons effacés sur l’appareil quoi qu’il arrive |
| `session.changerMembre` | démonstration seulement | démonstration : changer de membre |  | en production, chaque membre se connecte avec son compte |
| `session.oublierAppareil` | branché | POST /api/vendors/auth/devices/forget {appareil} | → {ok} |  |
| `session.categories` | branché | GET /api/vendors/categories | → string[] | familles du barème |
| `session.zoneDuPoint` | branché | GET /api/vendors/zone?lat=&lon= | → Zone ; 404 → null (hors zone) | zones exploitées (ZONES-EXPLOITEES) |
| `session.ouverture` | branché | GET /api/vendors/shops/current?appareil= | → DossierOuverture ; 404 → null |  |
| `session.demarrerOuverture` | branché | POST /api/vendors/shops {nom, categorie, statut, telephone, point, appareil} (Idempotency-Key) | → {ok, envoi} \| {ok: false, raison: nom\|categorie\|numero\|point\|hors_zone\|deux_comptes} ; 409 dossier_en_cours ; 429 trop_d_envois |  |
| `session.envoiOuverture` | branché | GET /api/vendors/shops/current/code?appareil= | → EnvoiCode ; 404 → null |  |
| `session.validerCodeOuverture` | branché | POST /api/vendors/shops/current/verify {code, appareil} | → ResultatCode + jetons | le compte vendeur existe (un numéro = un compte) |
| `session.renvoyerCodeOuverture` | branché | POST /api/vendors/shops/current/resend {appareil} | → ResultatRenvoi |  |
| `session.envoyerPiece` | branché | POST /api/vendors/shops/{id}/kyc {piece: recto\|verso\|selfie, image} | → {ok, dossier} \| {ok: false, raison: illisible\|visage} ; 404 not_found | {id} = current ou la référence ; image en data: URL ou multipart ; fichiers privés |
| `session.demanderCodeVersement` | branché | POST /api/vendors/shops/{id}/payout-number {telephone} | → {ok, envoi} \| {ok: false, raison: numero\|operateur} |  |
| `session.validerCodeVersement` | branché | POST /api/vendors/shops/{id}/payout-number/verify {code} | → ResultatCode |  |
| `session.envoyerPourVerification` | branché | POST /api/vendors/shops/{id}/submit (Idempotency-Key) | → {ok, dossier} \| {ok: false, raison: incomplet} | réponse avant : 48 h ouvrées |
| `session.reponseVerificationDemo` | démonstration seulement | prestataire de vérification |  | serveur d’essai : vendeur_session.ouverture.repondre_verification(ref, accord, motif) |
| `session.signerContrat` | branché | POST /api/vendors/contract/sign {immatricule, rccm?, niu?} (Idempotency-Key) | → {ok, dossier} \| {ok: false, raison: rccm\|niu\|etape} | version, horodatage, IP, appareil |
| `session.arriveeClient` | branché | GET /api/vendors/shops/from-client | → ArriveeClient ; 404 → null | compte client connecté, numéro déjà vérifié |
| `session.confirmerArriveeClient` | branché | POST /api/vendors/shops/from-client {point, appareil} (Idempotency-Key) | → {ok, dossier} \| {ok: false, raison: point\|hors_zone} |  |
| `session.biometrie` | branché | GET /api/vendors/me/biometrics | → Biometrie |  |
| `session.reglerBiometrie` | branché | PUT /api/vendors/me/biometrics {active} | → Biometrie | n’ouvre que l’application, jamais à la place d’un code (DP-57 S-1) |
| `session.saisieAssistee` | branché | GET /api/vendors/assisted-entry | → SaisieAssistee | accès Préparation : aucune fiche, prixSession null |
| `session.validerFiches` | branché | POST /api/vendors/assisted-entry/approve {ids} (Idempotency-Key) | → SaisieAssistee ; 403 owner_only | offres créées « en vérification » |
| `session.modifierFiche` | branché | PUT /api/vendors/assisted-entry/{id} {prix, stock} | → {ok, saisie} \| {ok: false, raison: prix\|stock} ; 404 not_found ; 403 owner_only |  |

### Accueil (10/10 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `accueil.aujourdhui` | branché | GET /api/vendors/seller/today | → Aujourdhui | préparer, puis litiges, puis retours, chacun par échéance ; alerte avant un seuil (paliers.alerte_de_seuil) propriétaire seulement ; montants null pour l’accès Préparation |
| `accueil.masquerAlerte` | branché | POST /api/vendors/seller/today/hide-alert | → 204 | une fois par seuil et par semaine (alerte_a_envoyer) |
| `accueil.calme` | branché | GET /api/vendors/seller/calm | → Calme | argent null pour l’accès Préparation ; idée du jour lue dans vendeur_croissance |
| `accueil.premierJour` | branché | GET /api/vendors/seller/onboarding | → PremierJour | palier de lancement (paliers.palier_de_lancement) ; offre de découverte |
| `accueil.suspension` | branché | GET /api/vendors/seller/suspension?example= | → Suspension ; 404 → null | lue dans vendeur_croissance ; example=1 sur une boutique non suspendue : exemple marqué exemple: true (valeurs du registre) |
| `accueil.file` | branché | GET /api/vendors/offline-queue | → FileHorsLigne | une action de plus de 72 h est « expiree » |
| `accueil.noterReseau` | branché | PUT /api/vendors/offline-queue/network {horsLigneDepuis} | → 204 |  |
| `accueil.mettreEnFile` | branché | POST /api/vendors/offline-queue {type, objet, detail?, origine?, lieu?} (Idempotency-Key) | → ActionEnFile ; 400 invalid | origine : heure d’origine du geste (ms), jamais dans le futur |
| `accueil.envoyerFile` | branché | POST /api/vendors/offline-queue/send (Idempotency-Key) | → FileHorsLigne.dernierEnvoi | rejouée dans l’ordre : « C’est prêt » par vendeur_commandes, stock, masquer, fermer, rouvrir ; refus notifié avec son motif |
| `accueil.retirer` | branché | DELETE /api/vendors/offline-queue/{id} | → 204 ; 404 not_found |  |

### Commandes (5/5 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `commandes.vue` | branché | GET /api/vendors/orders?state= | → VueCommandes ; 422 invalid | prep \| cours \| fin \| pb ; compteurs, detail et items de la même lecture (CMD-02) ; montants null pour l’accès Préparation |
| `commandes.liste` | branché | GET /api/vendors/orders?state= | → VueCommandes.items |  |
| `commandes.compteurs` | branché | GET /api/vendors/orders?state=prep | → VueCommandes.compteurs |  |
| `commandes.detail` | branché | GET /api/vendors/orders/{id} | → Commande ; 404 → null | statut et argent dérivés des faits (retrait, Tout est en ordre, litige, retour, recours) ; versé : référence BLV-VS |
| `commandes.journal` | branché | GET /api/vendors/orders/{id}/journal | → EntreeJournal[] ; 404 not_found | du plus récent au plus ancien (JRN-02) |

### Préparation (8/8 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `preparation.cestPret` | branché | POST /api/vendors/orders/{id}/ready {a?} (Idempotency-Key) | → Resultat<{preteA}, deja_prete\|annulee\|introuvable> ; 422 action_expiree | a : heure d’origine d’une action hors connexion (72 h au plus) ; avance le colis du client, génère le code de remise |
| `preparation.signalerRupture` | branché | POST /api/vendors/orders/{id}/stockout {stockAZero} (Idempotency-Key) | → Resultat<{}, introuvable\|deja_prete> | vendeur suivant (au plus 2 tentatives, DP-01), sinon remboursement intégral du colis |
| `preparation.optionsDelai` | branché | GET /api/vendors/orders/{id}/extend | → OptionsDelai ; 404 → null |  |
| `preparation.demanderDelai` | branché | POST /api/vendors/orders/{id}/extend {choix: +1h\|+2h\|demain} | → Resultat<{echeance}, deja_prolongee\|au_dela_de_24h\|deja_prete\|introuvable> | une fois ; le ramassage suit (P-6) |
| `preparation.bon` | branché | GET /api/vendors/orders/{id}/slip | → BonPreparation ; 404 → null | aucune donnée du client, jamais le code |
| `preparation.ouvrirBon` | branché | POST /api/vendors/orders/{id}/slip/open | → 204 ; 404 not_found | journal une fois par membre et par jour |
| `preparation.cocher` | branché | POST /api/vendors/orders/{id}/slip/checks {i, fait} | → BonPreparation ; 404 → null |  |
| `preparation.verifierReference` | branché | POST /api/vendors/orders/{id}/slip/verify {lu} | → Resultat<{bon}, autre_reference\|introuvable> | SKU scanné ou tapé ; coche « bon modèle » |

### Remise (7/9 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `remise.remise` | branché | GET /api/vendors/orders/{id}/handover | → Remise ; 404 → null | sans le code ; montants et suite null pour l’accès Préparation |
| `remise.aRemettre` | branché | GET /api/vendors/handovers?state=a_remettre | → Remise[] |  |
| `remise.toutes` | branché | GET /api/vendors/handovers | → Remise[] | la plus récente d’abord |
| `remise.afficherCode` | branché | GET /api/vendors/orders/{id}/handover-code | → Resultat<{code}, pas_prete\|bloquee\|remise\|annulee\|introuvable> | au toucher seulement ; journalisé (handover_code.viewed) |
| `remise.nouveauCode` | branché | POST /api/vendors/orders/{id}/handover-code/renew (Idempotency-Key) | → Resultat<{marcheA}, pas_bloquee\|introuvable> | annule l’ancien code (DP-56, Q-20) |
| `remise.saisieLivreur` | démonstration seulement | application du livreur (handover.completed) |  | serveur d’essai : vendeur_commandes.services.saisie_livreur(ref, code) |
| `remise.simuler` | démonstration seulement | application du livreur · annulation du client |  | serveur d’essai : services.livreur_absent(ref) · services.annulation_client(ref) |
| `remise.recu` | branché | GET /api/vendors/orders/{id}/receipt | → Recu ; 404 → null ; 403 owner_only |  |
| `remise.recus` | branché | GET /api/vendors/receipts | → RecuResume[] ; 403 owner_only |  |

### Litiges (9/9 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `litiges.regles` | branché | GET /api/vendors/disputes/rules | → ReglesLitiges | lues au registre (LIT-*, RET-*) |
| `litiges.liste` | branché | GET /api/vendors/disputes?state= | → Litige[] | a_repondre \| en_mediation \| clos ; triés par échéance |
| `litiges.compteurs` | branché | GET /api/vendors/disputes/counts | → CompteursLitiges | gele null pour l’accès Préparation |
| `litiges.detail` | branché | GET /api/vendors/disputes/{id} | → Litige ; 404 → null | anonyme : ni le client, ni son relais, ni son palier ; gele, trajetRetour et livraisonRetour (moteur des frais) null pour l’accès Préparation |
| `litiges.ajouterPreuve` | branché | POST /api/vendors/disputes/{id}/evidence {photo} (Idempotency-Key) | → Resultat<{piece}, clos\|introuvable> ; 400 photo_invalide | propriétaire ou Préparation (Q-17) ; horodatée par le serveur |
| `litiges.retirerPreuve` | branché | DELETE /api/vendors/disputes/{id}/evidence/{pieceId} | → Resultat<{}, deja_repondu\|introuvable> |  |
| `litiges.garderBrouillon` | branché | PUT /api/vendors/disputes/{id}/draft {brouillon} | → 204 | gardé LIT-BROUILLON-H ; null efface |
| `litiges.repondre` | branché | POST /api/vendors/disputes/{id}/answer {posture: accepte\|conteste\|arrangement, texte, arrangement?} (Idempotency-Key) | → Resultat<{issue}, RefusReponse> | propriétaire seulement (raison reserve_proprietaire) ; branche apps.aftersales.reponse_du_vendeur |
| `litiges.contester` | branché | POST /api/vendors/disputes/{id}/appeal {texte} (Idempotency-Key) | → Resultat<{}, RefusRecours> | recours du vendeur, une fois, sous LIT-RECOURS-H |

### Retours (10/10 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `retours.liste` | branché | GET /api/vendors/returns?state= | → Retour[] | a_decider \| en_route \| clos |
| `retours.compteurs` | branché | GET /api/vendors/returns/counts | → CompteursRetours |  |
| `retours.detail` | branché | GET /api/vendors/returns/{id} | → Retour ; 404 → null | couts.livraisonRetour : part de livraison du colis (moteur des frais) ; gele et couts null pour l’accès Préparation |
| `retours.recevoir` | branché | POST /api/vendors/returns/{id}/receive (Idempotency-Key) | → Resultat<{inspecterAvant}, deja_recu\|introuvable> | heure réelle de la remise : lance RET-INSPECT-H (Q-72) |
| `retours.ajouterPhoto` | branché | POST /api/vendors/returns/{id}/photos {photo} (Idempotency-Key) | → Resultat<{piece}, deja_inspecte\|introuvable> ; 400 photo_invalide |  |
| `retours.retirerPhoto` | branché | DELETE /api/vendors/returns/{id}/photos/{photoId} | → 204 |  |
| `retours.garderBrouillon` | branché | PUT /api/vendors/returns/{id}/draft {controles, verdict} | → 204 |  |
| `retours.inspecter` | branché | POST /api/vendors/returns/{id}/inspection {verdict: conforme\|non_conforme, controles} (Idempotency-Key) | → Resultat<{}, RefusInspection> | 2 photos au moins (INP-01) ; non conforme : médiation |
| `retours.proposer` | branché | POST /api/vendors/returns/{id}/replacement {choix: remplacer\|rembourser} (Idempotency-Key) | → Resultat<{expedierAvant?}, RefusChoix> | propriétaire (raison reserve_proprietaire) ; remplacer réserve une unité du stock |
| `retours.remplacementPret` | branché | POST /api/vendors/returns/{id}/replacement/ready (Idempotency-Key) | → Resultat<{}, introuvable> |  |

### Produits (11/11 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `produits.liste` | branché | GET /api/vendors/offers | → ListeProduits | tri PRD-02 ; gardé par vente du moteur (garde_par_vente) ; ventes, gardé et litiges du mois depuis les commandes ; montants null pour l’accès Préparation |
| `produits.detail` | branché | GET /api/vendors/offers/{id} | → Produit ; 404 → null | photos réelles {image, srcset} |
| `produits.changerStock` | branché | PUT /api/vendors/offers/{id}/stock {stock} | → Resultat<{produit}, stock> | accès Préparation compris ; Product de relaya mis à jour |
| `produits.pause` | branché | POST /api/vendors/offers/{id}/pause {enPause} | → Produit ; 404 → null ; 403 owner_only | Product de relaya inactif pendant la pause |
| `produits.regler` | branché | PUT /api/vendors/offers/{id} {paiementAuRetrait?, prixAuto?, plancherPrive?, seuilAlerte?} | → Resultat<{produit}, plancher\|seuil\|reserve> | Préparation : raison reserve |
| `produits.dupliquer` | branché | POST /api/vendors/offers/{id}/duplicate {variante} (Idempotency-Key) | → Resultat<{brouillonId, rattache}, variante\|existe\|fiche> ; 403 owner_only | photos prises pour « copie:<offre> » rattachées au brouillon |
| `produits.supprimer` | branché | DELETE /api/vendors/offers/{id} | → Resultat<{}, etat> | brouillon seulement ; annulable |
| `produits.restaurer` | branché | POST /api/vendors/offers/{id}/restore | → 204 |  |
| `produits.variantes` | branché | GET /api/vendors/sheets/{id}/variants | → VarianteDeFiche[] |  |
| `produits.exporter` | branché | GET /api/vendors/offers/export | → text/csv | identifiant;produit;variante;etat;prix;stock;seuil (prix vide pour l’accès Préparation) |
| `produits.importer` | branché | POST /api/vendors/offers/import {csv} | → Resultat<{lignes, ignorees}, vide\|format> | stock et seuil par identifiant |

### Nouveau produit (20/20 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `offres.reglages` | branché | GET /api/vendors/config | → Reglages | registre (PHOTOS_MIN…, à ajouter au registre en vigueur) ; libération des paliers ; plafond de démarrage PRX-09 ; versement null pour l’accès Préparation |
| `offres.rechercher` | branché | GET /api/vendors/catalog/search?q=&code= | → Recherche | « cherché N fois » : recherches sans résultat de la zone, 30 jours glissants ; code-barres lu : sa fiche ou rien ; mesProduits : mes offres qui correspondent |
| `offres.suggerer` | branché | GET /api/vendors/catalog/suggest?q= | → Suggestion | DP-58 : catégorie du barème et marque proposées d’après le nom, description à compléter, doublon (similarité ≥ SIMILARITE_DOUBLON) |
| `offres.creer` | branché | POST /api/vendors/offers/new {nom, code} (Idempotency-Key) | → Resultat<{brouillonId}, recherche\|reserve> ; 403 owner_only | DP-58 : produit nouveau seulement après une recherche (3 caractères ou un code-barres) |
| `offres.rattacher` | branché | POST /api/vendors/offers/{id}/attach {ficheId} | → Resultat<{brouillonId}, fiche\|etat> | FCH-02 : le brouillon passe sur la fiche existante, photos et saisies gardées |
| `offres.ordonnerPhotos` | branché | PUT /api/vendors/offers/{id}/photos {ids} | → 204 | la première photo est la principale |
| `offres.parCodeBarres` | branché | GET /api/vendors/catalog/barcode/{code} | → FicheCatalogue ; 404 → null |  |
| `offres.reconnaitre` | branché, partiel | POST /api/vendors/catalog/recognize {image, prise, largeur, hauteur, position?} | → FicheCatalogue[] | sans prestataire de reconnaissance : fiches déjà vendues par la boutique puis les plus vendues de sa zone |
| `offres.commencer` | branché | POST /api/vendors/offers {ficheId, variante?} (Idempotency-Key) | → Resultat<{brouillonId}, fiche\|reserve> |  |
| `offres.brouillon` | branché | GET /api/vendors/offers/draft?id= | → Produit ; 404 → null | sans id : le brouillon le plus récent |
| `offres.modifier` | branché | PATCH /api/vendors/offers/{id} {variante?, etatArticle?, stock?, seuilAlerte?, delaiPreparationH?, paiementAuRetrait?, madeInCameroon?, prix?, poidsKg?, dimensionsCm?, plancherPrive?, prixBarre?, finPromo?, noteVendeur?, titre?, marque?, categorie?, description?, prioritaire?} | → Resultat<{produit}, stock\|prix\|seuil\|variante\|colis\|plancher\|nom\|categorie\|description\|promo\|note> ; 404 → null | classe de colis calculée (poids facturé, plus grande dimension) ; Préparation : prix refusé ; prix barré, fin de promotion (contrôlés à la publication), note du vendeur sans coordonnées, champs du produit nouveau (DP-58) |
| `offres.photos` | branché | GET /api/vendors/offers/{id}/photos | → PhotoReelle[] ; 404 | cible : offre, « demande » ou « copie:<offre> » ; srcset WebP 320/640/960/1600 |
| `offres.ajouterPhoto` | branché | POST /api/vendors/offers/{id}/photos {image, prise, largeur, hauteur, octetsAvant, octetsApres, position} (Idempotency-Key) | → Resultat<{photo, nombre}, max\|petite> ; 400 invalid | data: URL, adresse https ou multipart « fichier » ; taille réelle lue par Pillow |
| `offres.retirerPhoto` | branché | DELETE /api/vendors/offers/{id}/photos/{photoId} | → 204 |  |
| `offres.apercu` | branché | GET /api/vendors/offers/quote?offre=&prix=&mic= | → Apercu ; 403 owner_only | moteur de commission : gardé, prix minimum publiable, plages exactes de la commission minimale (+ messageMinimale), plafond |
| `offres.conseil` | branché | GET /api/vendors/offers/{id}/price-advice?prix= | → Conseil ; 404 → null ; 403 owner_only | médiane − 100 F des offres en vente de la fiche, jamais sous le 10e centile (DP-56, Q-36) |
| `offres.publier` | branché | POST /api/vendors/offers/{id}/publish {rester, horsLigne} (Idempotency-Key) | → Resultat<Publication, photos\|prix_minimum\|stock\|plafond\|prix\|fiche\|etat\|nom\|categorie\|description\|promo\|note> ; 403 owner_only | en vérification, réponse avant MODERATION_H ; la console BelivaY décide (vendeur_catalogue.services.moderer) ; produit nouveau (DP-58) : doublon rattaché à l’envoi, sinon fiche écrite pendant la vérification ; prix barré : remise réelle ≥ FLASH-REMISE-MIN, fin sous 30 jours (OFR-05) |
| `offres.changerPrix` | branché | PUT /api/vendors/offers/{id}/price {prix, rester} | → Resultat<{produit}, prix_minimum\|plafond\|prix> ; 403 owner_only | Product de relaya mis à jour |
| `offres.publication` | branché | GET /api/vendors/offers/{id}/publication · GET /api/vendors/offers/publication | → Publication ; 404 → null | sans id : la dernière publication |
| `offres.proposerDescription` | branché | POST /api/vendors/offers/{id}/description-proposal {texte} | → Resultat<{reponseAvant}, court\|coordonnees\|long> ; 404 ; 403 owner_only | coordonnées refusées (client_core.masquage.nettoyer_message) |

### Argent (6/6 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `argent.resume` | branché | GET /api/vendors/money/summary | → ResumeArgent ; 403 owner_only | cinq états du moteur argent_vendeur (gardé figé au paiement) ; en circulation = à verser + se libère + en cours + gelé ; arrêté du jeudi exécuté avant la lecture |
| `argent.seLibere` | branché | GET /api/vendors/money/releasing | → SeLibere ; 403 owner_only | palier du Trust Score ; carte, Apple, Google, USD, EUR : délai carte (VD-LIB-CARTE) |
| `argent.gele` | branché | GET /api/vendors/money/frozen | → Gele ; 403 owner_only | litige, retour, recours ; remboursement automatique lu au registre (LIT-AUTO-*) |
| `argent.gains` | branché | GET /api/vendors/money/earnings?month= | → Gains ; 400 invalid ; 403 owner_only | month = AAAA-MM ; reprises en lignes négatives |
| `argent.documents` | branché | GET /api/vendors/documents | → Documents ; 403 owner_only | factures d’abonnement et de visibilité lues dans vendeur_croissance |
| `argent.document` | branché | GET /api/vendors/documents/content?type=&periode= | → ContenuDocument ; 400 invalid ; 403 owner_only | type = releve \| facture (periode AAAA-MM) \| contrat \| versements (periode 3 \| 12 \| tout) ; même contenu en PDF et CSV (DOC-02) |

### Versements (8/8 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `versements.prochain` | branché | GET /api/vendors/payouts/next | → Prochain ; 404 → null ; 403 owner_only | versement arrêté en cours (envoyé, refusé, suspendu) sinon celui du vendredi qui vient ; reporté pendant la revue du numéro |
| `versements.historique` | branché | GET /api/vendors/payouts?period= | → Historique ; 400 invalid ; 403 owner_only | period = 3 \| 12 \| tout |
| `versements.signalerNonRecu` | branché | POST /api/vendors/payouts/{id}/incident (Idempotency-Key) | → Resultat<{reponseAvant}, inconnu\|deja> ; 403 owner_only | réponse du support avant le lundi suivant 12 h |
| `versements.numero` | branché | GET /api/vendors/payout-number | → NumeroVersement ; 403 owner_only | préfixes par opérateur lus au registre (VD-PREFIXES-CM, à ajouter ; sinon constante du serveur) |
| `versements.demanderCodes` | branché | POST /api/vendors/payout-number/codes {operateur, numero} (Idempotency-Key) | → Resultat<{destination, renvoiSecondes}, prefixe\|longueur\|meme_numero\|operateur\|trop_tot> ; 400 invalid ; 403 owner_only | un code au nouveau numéro, un au téléphone personnel du propriétaire (apps.otp) ; jamais de codeDemo |
| `versements.renvoyerCode` | branché | POST /api/vendors/payout-number/codes/resend {quel: nouveau\|personnel} (Idempotency-Key) | → Resultat<{renvoiSecondes}, trop_tot\|expire> ; 403 owner_only |  |
| `versements.confirmerNumero` | branché | PUT /api/vendors/payout-number {codeNouveau, codePersonnel} (Idempotency-Key) | → Resultat<{revueJusqua, premierVersement}, code_nouveau\|code_personnel\|expire\|bloque> ; 403 owner_only | revue humaine VD-NUM-REVUE ; le numéro devient actuel à la fin de la revue |
| `versements.annulerSaisie` | branché | DELETE /api/vendors/payout-number/codes | → 204 ; 403 owner_only |  |

### Trust Score (5/5 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `trust.score` | branché | GET /api/vendors/score | → Score | valeur exacte du service Scores (Q-37), critères, journal immuable, barème, 30 nuits |
| `trust.statut` | branché | GET /api/vendors/account/status | → StatutCompte | contrôle au ramassage par le moteur des sanctions ; aussi lu par l’accueil (suspension) |
| `trust.decisions` | branché | GET /api/vendors/account/decisions | → Decision[] | la plus récente en tête |
| `trust.decision` | branché | GET /api/vendors/account/decisions/{id} | → Decision ; 404 → null |  |
| `trust.contester` | branché | POST /api/vendors/score/appeal {decision, texte, preuves} (Idempotency-Key) | → { ok: true, reponseAvant } \| { ok: false, raison: deja_contestee \| trop_court \| trop_long \| introuvable } | une fois par décision ; réponse sous 72 h ouvrées, dimanche non compté |

### Paliers (1/1 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `paliers.monPalier` | branché | GET /api/vendors/tiers | → MonPalier | montants à null pour l’accès Préparation (DP-55) |

### Plans et croissance (15/15 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `plans.plans` | branché | GET /api/vendors/plans | → OffrePlan[] ; 403 owner_only |  |
| `plans.etat` | branché | GET /api/vendors/plans/state | → EtatPlan ; 403 owner_only | échéances de l’essai, de la grâce et de l’arrêt appliquées à la lecture (moteur plans) |
| `plans.simuler` | branché | GET /api/vendors/plans/simulate?sales=&billing= | → Simulation ; 400 invalid ; 403 owner_only | moteur commission : simuler_plans |
| `plans.essayer` | branché | POST /api/vendors/plans/subscribe {plan, trial} (Idempotency-Key) | → { ok: true, finEssai, rappelLe } \| { ok: false, raison: deja_essaye \| deja_actif } ; 403 owner_only | un essai par plan, 0 F aujourd’hui |
| `plans.souscrire` | branché | POST /api/vendors/plans/subscribe {plan, facturation: mensuelle\|annuelle} (Idempotency-Key) | → { ok: true, demande: DemandePaiement } \| { ok: false, raison: deja_actif } ; 403 owner_only | le plan s’active à la confirmation Mobile Money |
| `plans.paiement` | branché | GET /api/vendors/payments/{id} | → DemandePaiement ; 404 → null ; 403 owner_only |  |
| `plans.annulerPaiement` | branché | DELETE /api/vendors/payments/{id} | → 204 ; 403 owner_only |  |
| `plans.arreter` | branché | POST /api/vendors/plans/stop {arret} | → EtatPlan ; 403 owner_only | retour à Free à la fin de la période |
| `plans.visibilite` | branché | GET /api/vendors/visibility | → Visibilite ; 403 owner_only | récompenses au mérite seulement (DP-14) |
| `plans.utiliserRecompense` | branché | POST /api/vendors/rewards/{id}/use (Idempotency-Key) | → { ok: true, jusqua } \| { ok: false, raison: deja_utilisee \| score_trop_bas \| rupture } ; 403 owner_only |  |
| `plans.programmerVenteFlash` | branché | POST /api/vendors/flash-sales {id, remisePourCent} (Idempotency-Key) | → { ok: true, etat } \| { ok: false, raison: remise_trop_basse \| remise_trop_haute \| deja_utilisee \| ferme \| score_trop_bas \| rupture } ; 403 owner_only | au-delà de 50 %, relue sous 24 h (FF-FLASH) |
| `plans.services` | branché | GET /api/vendors/services | → Services ; 403 owner_only |  |
| `plans.demanderService` | branché | POST /api/vendors/services/request {service} (Idempotency-Key) | → { ok: true, demande: DemandePaiement } \| { ok: false, raison: deja_demande \| gratuit_ailleurs } ; 403 owner_only |  |
| `plans.stats` | branché | GET /api/vendors/stats?period=30d | → Stats ; 400 invalid ; 403 owner_only | lu dans les commandes reçues |
| `plans.demande` | branché | GET /api/vendors/demand | → Demande | Free : 3 recherches visibles ; ouvert à l’accès Préparation (freins sans montant) |

### Boutique (24/24 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `boutique.boutique` | branché | GET /api/vendors/shop | → Boutique | apercuClient : palier et Trust Score seulement (VD11-R07) ; vitrine interne |
| `boutique.fermerAujourdhui` | branché | POST /api/vendors/shop/closed-today {fermee} | → Boutique ; 403 owner_only | jusqu’à la prochaine ouverture réelle (Q-39) ; Préparation : fermer, et rouvrir le jour même (Q-18) |
| `boutique.changerHoraires` | branché | PUT /api/vendors/shop/hours {horaires} | → Resultat ordre ; 403 owner_only ; 400 invalid |  |
| `boutique.mettreEnPause` | branché | POST /api/vendors/shop/pause {jours} | → Resultat duree ; 403 owner_only | 30 jours au plus |
| `boutique.reprendre` | branché | POST /api/vendors/shop/resume | → Boutique ; 403 owner_only |  |
| `boutique.programmerFermeture` | branché | POST /api/vendors/shop/closures {du, au, motif} (Idempotency-Key) | → Resultat preavis_48h \| dates \| chevauche ; 403 owner_only |  |
| `boutique.ecourterFermeture` | branché | PATCH /api/vendors/shop/closures/{id} {au} | → Resultat dates ; 403 owner_only |  |
| `boutique.annulerFermeture` | branché | DELETE /api/vendors/shop/closures/{id} | → Boutique ; 403 owner_only |  |
| `boutique.replacer` | branché | PUT /api/vendors/shop/location {lat, lon} | → {ok, boutique, nouvelleVerification, metres, a} ; 403 owner_only ; 400 invalid | distance géodésique (moteur geo) ; au-delà de 200 m : point en attente de l’agent de zone, l’ancien sert (Q-91) |
| `boutique.changerRepere` | branché | PUT /api/vendors/shop/landmark {repere} | → Resultat vide \| long ; 403 owner_only |  |
| `boutique.modifierVitrine` | branché | PATCH /api/vendors/shop/showcase {photo?, logo?, description?} | → Resultat long ; 403 owner_only | vitrine interne, jamais montrée au client (VD11-R11) |
| `boutique.avis` | branché | GET /api/vendors/reviews | → ResumeAvis | notes par colis (aftersales.AvisCommande) ; achat vérifié ; commentaire filtré ; jamais le client |
| `boutique.repondreAvis` | branché | POST /api/vendors/reviews/{id}/private-reply {texte} (Idempotency-Key) | → Resultat trop_court \| delai_depasse \| deja_repondu \| coordonnees ; 403 owner_only | passée par la conversation Support BelivaY, 30 jours (VD11-R56) |
| `boutique.lieux` | branché | GET /api/vendors/shop/locations | → Lieux ; 403 owner_only (lecture permise à l’employé) | principal d’abord ; centres BelivaY (relais, centres des zones exploitées) joints, comme GET /hubs |
| `boutique.ajouterLieu` | branché | POST /api/vendors/shop/locations {nom, type, adresse, repere, horaires, position, precision, centre} (Idempotency-Key) | → Resultat plein \| nom \| repere \| position \| hors_zone \| ordre ; 403 owner_only | zone calculée du point ; point GPS : « À vérifier » jusqu’à l’agent de zone ; centre BelivaY : vérifié d’office |
| `boutique.modifierLieu` | branché | PATCH /api/vendors/shop/locations/{id} {nom?, adresse?, repere?, horaires?} | → Resultat nom \| repere \| ordre \| introuvable ; 403 owner_only | sans nouvelle vérification (EMP-02) |
| `boutique.replacerLieu` | branché | PUT /api/vendors/shop/locations/{id}/point {lat, lon} | → Resultat introuvable ; 403 owner_only | au-delà de 200 m : « À vérifier », l’ancien point sert, agent prévenu, relance après 72 h (Q-91) |
| `boutique.demanderCodePrincipal` | branché | POST /api/vendors/shop/locations/principal-code | → {masque} ; 403 owner_only |  |
| `boutique.rendrePrincipal` | branché | POST /api/vendors/shop/locations/{id}/principal {code} | → Resultat code \| a_verifier \| introuvable ; 403 owner_only | lieu vérifié seulement ; change l’origine du ramassage et la zone (attribution au coût total livré) |
| `boutique.retirerLieu` | branché | DELETE /api/vendors/shop/locations/{id} | → Resultat principal \| introuvable ; 403 owner_only |  |
| `boutique.demandes` | branché | GET /api/vendors/shop/change-requests | → DemandeModification[] ; 403 owner_only |  |
| `boutique.demanderCodeModification` | branché | POST /api/vendors/shop/change-requests/code | → {masque} ; 403 owner_only |  |
| `boutique.demanderModification` | branché | POST /api/vendors/shop/change-requests {champ, valeur, rccm?, niu?, motif, pieces, code} (Idempotency-Key) | → Resultat code \| valeur \| motif \| pieces \| deja \| rccm \| niu ; 403 owner_only | examinée par la console (administration) sous 72 h ouvrées ; acceptée ou refusée avec motif écrit |
| `boutique.annulerDemande` | branché | DELETE /api/vendors/shop/change-requests/{id} | → Resultat introuvable \| etat ; 403 owner_only |  |

### Compte (18/18 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `compte.profil` | branché | GET /api/vendors/me | → Profil |  |
| `compte.demanderCode` | branché | POST /api/vendors/me/codes {motif} | → Resultat trop_tot ; 400 invalid | code SMS au téléphone personnel (apps.otp) ; jamais renvoyé par l’API |
| `compte.modifierProfil` | branché | PATCH /api/vendors/me {prenom?, nom?, photo?, couverture?, code} | → Resultat nom \| code \| titulaire ; 400 invalid | photo et couverture rognées en data: ou fichier (multipart) ; le nom du titulaire change par le support (PAR-01) |
| `compte.demanderCodeEmail` | branché | POST /api/vendors/me/email/code {email} | → Resultat email \| pris \| meme | code envoyé à la nouvelle adresse |
| `compte.confirmerEmail` | branché | POST /api/vendors/me/email/confirm {codeSms, codeEmail} | → Resultat code | deux codes consommés ensemble |
| `compte.demanderCodesNumero` | branché | POST /api/vendors/me/phone/codes {numero} | → Resultat prefixe \| pris \| meme | codes à l’ancien et au nouveau numéro (CIN-39) |
| `compte.confirmerNumero` | branché | PUT /api/vendors/me/phone {codeAncien, codeNouveau} | → Resultat code |  |
| `compte.appareils` | branché | GET /api/vendors/devices | → Appareil[] | appareil actuel par X-Device-Id ; ville, jamais l’adresse IP (SEC-01) |
| `compte.deconnecterAppareil` | branché | DELETE /api/vendors/devices/{id} | → Appareil[] | jeton en liste noire ; jamais l’appareil actuel |
| `compte.deconnecterAutres` | branché | POST /api/vendors/devices/revoke-others | → Appareil[] |  |
| `compte.changerMotDePasse` | branché | PUT /api/vendors/me/password {ancien, nouveau, code} | → Resultat ancien \| faible \| code \| identique | les autres sessions se ferment (CAP-15) |
| `compte.securite` | branché | GET /api/vendors/me/security | → Securite |  |
| `compte.reglerFaceId` | branché | PUT /api/vendors/me/security/face-id {actif} | → Securite |  |
| `compte.statut` | branché | GET /api/vendors/account/summary | → StatutCompte ; 403 owner_only | grille au palier du jour (registre de commission) ; « account/status » est la route du domaine trust |
| `compte.exporterDonnees` | branché | POST /api/vendors/me/export {code} (Idempotency-Key) | → Resultat code \| deja | fichier par e-mail sous 48 h |
| `compte.cloturer` | branché | POST /api/vendors/account/closure {code, motif?} (Idempotency-Key) | → Resultat code \| deja ; 403 owner_only | 30 jours de préavis ; clôture effective seulement sans commandes en cours, argent à verser ni litiges |
| `compte.annulerCloture` | branché | DELETE /api/vendors/account/closure | → Securite ; 403 owner_only |  |
| `compte.demanderModification` | branché | POST /api/vendors/me/corrections {quoi, ref?} (Idempotency-Key) | → {fil} ; 400 invalid | écrit dans la conversation Support BelivaY |

### Équipe (12/12 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `equipe.membres` | branché | GET /api/vendors/shop/members | → Equipe ; 403 owner_only |  |
| `equipe.inviter` | branché | POST /api/vendors/shop/members {prenomNom, telephone, droits?} (Idempotency-Key) | → Resultat plein \| nom \| telephone \| deja \| droits ; 403 owner_only | droits cochés (rôle Préparation par défaut ; interdits retirés d’office) ; code SMS au propriétaire ; rien n’est créé avant le code |
| `equipe.confirmerInvitation` | branché | POST /api/vendors/shop/members/invitations/{id}/confirm {code} (Idempotency-Key) | → Resultat code \| expire ; 403 owner_only | compte du membre créé sans mot de passe (ou compte client du même numéro) ; SMS d’installation |
| `equipe.renvoyerInvitation` | branché | POST /api/vendors/shop/members/{id}/resend | → Resultat trop_tot ; 403 owner_only |  |
| `equipe.demanderCodeRetrait` | branché | POST /api/vendors/shop/members/{id}/removal-code | → {masque} ; 403 owner_only |  |
| `equipe.annulerInvitation` | branché | DELETE /api/vendors/shop/members/invitations/{id} | → Resultat introuvable ; 403 owner_only | sans code : rien n’est encore ouvert |
| `equipe.demanderCodeMembre` | branché | POST /api/vendors/shop/members/{id}/code {motif} | → {masque} ; 403 owner_only | motif : retrait \| droits \| reactivation ; code au téléphone personnel du propriétaire |
| `equipe.changerDroits` | branché | PUT /api/vendors/shop/members/{id}/rights {droits, code} | → Resultat code \| proprietaire \| droits ; 403 owner_only | le serveur retire les droits interdits (argent, prix, réponse aux litiges, équipe) ; jetons du membre rafraîchis |
| `equipe.suspendre` | branché | POST /api/vendors/shop/members/{id}/suspend | → Resultat proprietaire \| etat ; 403 owner_only | sessions coupées tout de suite, compte gardé |
| `equipe.reactiver` | branché | POST /api/vendors/shop/members/{id}/reactivate {code} | → Resultat code \| proprietaire \| etat ; 403 owner_only |  |
| `equipe.journal` | branché | GET /api/vendors/shop/members/{id}/journal | → ActionMembre[] ; 403 owner_only | actions signées (EQU-03) : journaux des commandes, stock, boutique, connexions |
| `equipe.retirer` | branché | DELETE /api/vendors/shop/members/{id} {code} | → Resultat code \| proprietaire ; 403 owner_only | sessions et appareils coupés tout de suite ; actions passées signées (EQU-04) |

### Messages (7/8 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `messages.fils` | branché | GET /api/vendors/threads | → Fil[] | questions des clients rattachées à la commande ; « Client de BLV-… », jamais le client |
| `messages.fil` | branché | GET /api/vendors/threads/{id} | → {fil, messages} ; 404 → null |  |
| `messages.envoyer` | branché | POST /api/vendors/threads/{id}/messages {texte} (Idempotency-Key) | → Message ; 409 ferme ; 400 vide ; 404 not_found | filtré avant l’enregistrement (CMS-04), signé par le membre ; le client lit « Le vendeur » |
| `messages.lire` | branché | POST /api/vendors/threads/{id}/read | → 204 ; 404 not_found |  |
| `messages.filtrer` | à finir côté site | — | → {propre, filtre} | même règle que apps.client_core.masquage.nettoyer_message |
| `messages.ecrireAuSupport` | branché | POST /api/vendors/threads/support {texte, ref?} (Idempotency-Key) | → {fil} ; 400 vide | accusé de réception du support (Q-47) |
| `messages.reponsesRapides` | branché | GET /api/vendors/quick-replies?type= | → string[] |  |
| `messages.ouvrirFil` | branché | POST /api/vendors/threads {order_id} | → {fil} ; 404 → null | conversation de la commande (question du client sur ce produit), créée au besoin (REP-03) |

### Notifications (7/7 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `notifications.liste` | branché | GET /api/vendors/notifications?filter= | → Notification[] | tout \| urgent \| argent ; argent masquées pour l’accès Préparation ; 12 mois |
| `notifications.compteurs` | branché | GET /api/vendors/notifications/counts | → {tout, urgent, argent, nonLues} |  |
| `notifications.nonLues` | branché | GET /api/vendors/notifications/unread-count | → {nonLues} |  |
| `notifications.marquerLue` | branché | POST /api/vendors/notifications/{id}/read {lue?} | → 204 ; 404 not_found | lue par membre |
| `notifications.toutMarquerLu` | branché | POST /api/vendors/notifications/read-all | → 204 |  |
| `notifications.reglages` | branché | GET /api/vendors/notifications/settings | → ReglagesNotifications |  |
| `notifications.regler` | branché | PUT /api/vendors/notifications/settings {versements?, avis?, conseils?, sonDistinct?} | → ReglagesNotifications | versements : propriétaire seulement |

### Aide (4/4 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `aide.questions` | branché | GET /api/vendors/help/questions?q= | → QuestionAide[] | montants calculés par le moteur de commission ; sans l’argent pour l’accès Préparation |
| `aide.produitsInterdits` | branché | GET /api/vendors/help/forbidden-products | → string[] |  |
| `aide.contacts` | branché | GET /api/vendors/help/contacts | → ContactsAide | registre (CONTACT-*, SUP-WA, SUP-HORAIRES, SUP-DELAI) sinon coordonnées officielles |
| `aide.conseil` | branché | GET /api/vendors/help/tip | → {titre, texte, publieLe} |  |

### Publicité (13/13 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `publicite.tableau` | branché | GET /api/vendors/ads/dashboard | → TableauPub ; 403 owner_only | sélections flash : deux prochains samedis 08 h (au moins 24 h avant) ; règles VD-PUB-* du registre |
| `publicite.campagnes` | branché | GET /api/vendors/ads/campaigns | → Campagne[] ; 403 owner_only | coût du clic au second prix face aux autres boutiques ; enchère hebdomadaire en attente : candidature |
| `publicite.produits` | branché | GET /api/vendors/ads/products | → ProduitAnnoncable[] (seuil de qualité) |  |
| `publicite.mouvements` | branché | GET /api/vendors/ads/ledger | → MouvementPub[] (solde prépayé, facture du mois) |  |
| `publicite.estimer` | branché | POST /api/vendors/ads/quote {emplacement, offreId, enchere?, budgetJour?, mode?, semaines?, debut?, remisePourCent?} | → Estimation | même calcul que la confirmation ; fourchettes d’audience à brancher sur les statistiques de recherche |
| `publicite.creer` | branché | POST /api/vendors/ads/campaigns/new {emplacement, offreId, enchere?, budgetJour?, mode?, semaines?, debut?, remisePourCent?} (Idempotency-Key) | → Resultat<{campagne}, RefusCampagne> | forfait débité à la confirmation ; enchère hebdomadaire : rien avant l’attribution (services.attribuer_semaine) ; candidature flash : acceptée par la console (selectionner_flash), elle rejoint Promotions |
| `publicite.pause` | branché | POST /api/vendors/ads/campaigns/{id}/pause {pause: true} | → Campagne du kit ; 422 state_changed → Resultat etat |  |
| `publicite.reprendre` | branché | POST /api/vendors/ads/campaigns/{id}/resume | → Resultat<object, etat\|RaisonInelegible\|solde_insuffisant> |  |
| `publicite.arreter` | branché | POST /api/vendors/ads/campaigns/{id}/stop (Idempotency-Key) | → { rembourse } ; 422 state_changed → Resultat etat | heures non diffusées rendues au solde ; vente flash sélectionnée : sa vente flash de Promotions s’arrête |
| `publicite.enchere` | branché | POST /api/vendors/ads/campaigns/{id}/bid {enchere, budgetJour} | → Resultat<object, etat\|sous_plancher\|budget_min> |  |
| `publicite.recharger` | branché | POST /api/vendors/ads/top-up {montant} (Idempotency-Key) | → Mouvement { id, montant, a, statut } ; 422 annonce_refusee → Resultat montant |  |
| `publicite.recharge` | branché | GET /api/vendors/ads/top-up/{id} | → Recharge ; 404 → null |  |
| `publicite.annulerRecharge` | branché | DELETE /api/vendors/ads/top-up/{id} | → 204 |  |

### Pages ajoutées et domaines hors de la source

36 méthodes (types : `src/pages/AJ-A/donnees/types.ts`, `src/api/pages/types.ts`) : AJ-A les appelle déjà en mode API (`src/pages/AJ-A/donnees/source.ts`) ; les autres ont leur connecteur dans `src/api/pages/source.ts`, prêt pour l’écran qui lit encore la démonstration (« partiel »).

#### Stock (5/5 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `stock.inventaire` | branché | GET /api/vendors/stock | → Inventaire ; 403 forbidden_right | droit produits.voir ; valeur et prix null pour un employé (ACC-26) ; conseil de réapprovisionnement sur 14 jours |
| `stock.mouvements` | branché | GET /api/vendors/stock/movements?offer= | → Mouvement[] ; 403 forbidden_right | mouvements signés et ventes des commandes ; le plus récent d’abord |
| `stock.ajuster` | branché | POST /api/vendors/stock/{id}/adjust {nouveau, type, note?} (Idempotency-Key) | → Resultat stock \| introuvable \| note ; 403 forbidden_right | droit produits.stock ; geste signé (VD02-DR03) |
| `stock.regler` | branché | PUT /api/vendors/stock/{id}/threshold {seuil} | → Resultat seuil \| reserve | propriétaire (VD11-R49) |
| `stock.exporter` | branché | GET /api/vendors/stock/export | → CSV | sans prix pour un employé |

#### Promotions (6/6 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `promotions.regles` | branché | GET /api/vendors/promotions/rules | → ReglesPromotion ; 403 owner_only | FF-FLASH, FLASH-REMISE-MIN, FLASH-DUREE-MAX, VD-VISIBILITE |
| `promotions.liste` | branché | GET /api/vendors/promotions | → Promotion[] ; 403 owner_only | une seule notion : origine vendeur ou mérite (vente flash offerte, VD-10) |
| `promotions.offres` | branché | GET /api/vendors/promotions/offers | → OffrePromouvable[] ; 403 owner_only | prix de référence : le plus bas pratiqué sur 30 jours (OFR-05) |
| `promotions.apercu` | branché | POST /api/vendors/promotions/quote {offreId, type, valeur, debut, fin} | → ApercuPromotion ; 403 owner_only | moteur de commission sur le prix payé (F9) ; refus si la vente serait refusée (DP-55) |
| `promotions.creer` | branché | POST /api/vendors/promotions {offreId, type, valeur, debut, fin} (Idempotency-Key) | → Resultat RefusPromotion ; 403 owner_only | pendant la fenêtre, le prix payé est le prix remisé (Product de relaya mis à jour) |
| `promotions.arreter` | branché | POST /api/vendors/promotions/{id}/stop | → Resultat etat ; 404 → etat ; 403 owner_only |  |

#### Questions (7/7 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `questions.liste` | branché | GET /api/vendors/questions | → ListeQuestions ; 403 forbidden_right | droit messages.voir ; client anonyme (GEN-01) |
| `questions.filtrer` | branché | POST /api/vendors/questions/filter {texte} | → {propre, filtre} | même filtre que la messagerie (VD11-R59) |
| `questions.repondre` | branché | POST /api/vendors/questions/{id}/answer {texte} (Idempotency-Key) | → Resultat court \| long \| coordonnees \| deja \| reserve | réponse publique : propriétaire (Q-17) |
| `questions.signaler` | branché | POST /api/vendors/questions/{id}/report {motif} | → Resultat deja \| motif | relue sous 48 h (VD-MODERATION) |
| `questions.modeles` | branché | GET /api/vendors/questions/templates | → ModeleReponse[] |  |
| `questions.enregistrerModele` | branché | POST /api/vendors/questions/templates {titre, texte} | → Resultat titre \| court \| coordonnees \| max \| reserve |  |
| `questions.supprimerModele` | branché | DELETE /api/vendors/questions/templates/{id} | → 204 |  |

#### Livraison (5/5 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `livraison.reglages` | branché | GET /api/vendors/delivery-settings | → ReglagesLivraison | employé : lecture seule (peutRegler false) |
| `livraison.regler` | branché | PUT /api/vendors/delivery-settings {colis?, delaiH?, paiementAuRetrait?} | → Resultat reserve \| delai | défauts appliqués à toute offre créée (OFR-02) |
| `livraison.reglerProduit` | branché | PUT /api/vendors/offers/{id}/delivery {colis?, poidsKg?, dimensionsCm?, delaiPreparationH?, paiementAuRetrait?} | → Resultat reserve \| mesures \| delai \| introuvable | classe calculée par les mesures au-delà de S et M (VD08-R22) |
| `livraison.creneau` | branché | PUT /api/vendors/delivery-settings/slots/{id} {prefere} | → Resultat reserve \| dernier |  |
| `livraison.relais` | branché | PUT /api/vendors/delivery-settings/relays/{id} {prefere} | → Resultat reserve \| max |  |

#### Boutique (1/1 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `centres.liste` | branché, partiel | GET /api/vendors/hubs | → CentreBelivay[] | les mêmes centres sont joints à GET /shop/locations (boutique.lieux), que l’écran lit |

#### Pages AJ-B (10/10 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `apprendre.faites` | branché, partiel | GET /api/vendors/learning/progress | → string[] | connecteur prêt ; l’écran lit encore pages/AJ-B/donnees-ajb.ts |
| `apprendre.cocher` | branché, partiel | PUT /api/vendors/learning/progress/{fiche} {etape, fait} | → string[] ; 400 invalid | connecteur prêt ; l’écran lit encore pages/AJ-B/donnees-ajb.ts |
| `apprendre.recommencer` | branché, partiel | DELETE /api/vendors/learning/progress/{fiche} | → string[] | connecteur prêt ; l’écran lit encore pages/AJ-B/donnees-ajb.ts |
| `profilAJB.changerBio` | branché, partiel | PATCH /api/vendors/me {bio} | → Resultat long \| coordonnees | sans code ; connecteur prêt ; l’écran lit encore pages/AJ-B/donnees-ajb.ts |
| `recherche.chercher` | branché, partiel | GET /api/vendors/search?q= | → {q, resultats} | connecteur prêt ; l’écran lit encore les listes des domaines |
| `activite.journal` | branché, partiel | GET /api/vendors/shop/activity | → LigneActivite[] ; 403 forbidden_right | droit commandes.voir ; connecteur prêt ; l’écran lit encore commandes.journal de chaque commande |
| `activite.ramassages` | branché, partiel | GET /api/vendors/pickups?from=&to= | → Remise[] ; 403 forbidden_right | connecteur prêt ; l’écran lit encore remise.toutes() |
| `activite.tableau` | branché, partiel | GET /api/vendors/seller/activity?period= | → TableauActivite ; 403 owner_only | montants figés au paiement ; connecteur prêt ; l’écran lit encore les commandes (VD-04 Activite.tsx) |
| `activite.objectif` | branché, partiel | GET /api/vendors/seller/goal | → ObjectifDuMois ; 403 owner_only | connecteur prêt ; l’écran lit encore l’appareil (blv_v_objectif) |
| `activite.fixerObjectif` | branché, partiel | PUT /api/vendors/seller/goal {amount} | → Resultat montant ; 403 owner_only | connecteur prêt ; l’écran lit encore l’appareil (blv_v_objectif) |

#### Échanges (2/2 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `echanges.evenements` | branché, partiel | GET /api/vendors/events?depuis= · GET /api/vendors/events/stream | → {evenements, curseur} | flux SSE : un passage par requête, reprise par Last-Event-ID ; selon les droits ; montant null pour un employé |
| `echanges.colisNonPret` | branché, partiel | POST /api/vendors/orders/{id}/not-ready {raison} | → Resultat etat ; 403 forbidden_right | droit commandes.remettre ; ramassage au créneau suivant (P-6) ; aucun écran encore |

<!-- connecteurs:fin -->

## 4. Ajouter un connecteur

1. La méthode dans le type du domaine (`src/donnees/domaines/<domaine>.ts`) et sa démonstration (`src/demo/<domaine>.ts`).
2. La route dans l'application du kit (`backend-kit/apps/vendeur_*`, tests), puis son connecteur
   (`src/api/domaines/<domaine>.ts`) et son entrée du registre (`src/api/routes/<domaine>.ts`) ; `npx vitest run src/api`
   vérifie qu'aucune méthode n'est oubliée.
3. Régénérer : `node ../backend-kit/outils/node_modules/.bin/tsx outils/connecteurs.mjs` (ce document) et `cd backend-kit/outils && node node_modules/.bin/tsx
   generer-openapi.mts` (contrat), puis le validateur.

## 5. Bout en bout contre le kit

`npx playwright test -c pw-api.config.ts` : serveur d'essai sur 8020 (base `essai-vendeur.sqlite3`, horloge d'essai),
espace vendeur en mode API sur 5190 (`tests/api-bout-en-bout.spec.ts`). Comptes de la boutique de démonstration
« Tonton PG » : `franck.penga@belivay.test` (propriétaire, aussi `@Penga12`), `aicha.n@belivay.test` (Préparation),
mot de passe `Essai-BelivaY-2026`.
