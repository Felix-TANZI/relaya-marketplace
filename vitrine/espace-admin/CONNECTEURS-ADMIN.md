# Connecteurs de la console de l’administrateur : de l’écran au kit

## État du branchement (24 octobre 2026, branche l/carte)

- **245 méthodes** de la source de la console (`src/donnees/source.ts`, 16 domaines) : **branche 231**, **partiel 10**, **serveur 0**, **demo 4**.
  Avant ce chantier : 236 méthodes — partiel 52, serveur 101, demo 4, branche 79.
- **Plus aucune méthode « serveur »** : chaque méthode appelle une vraie route du kit (`backend-kit/apps/console`, sous
  `/api/console/`), vérifiée par `src/api/connecteurs.test.ts` (chaque route au catalogue `routes-console.json`, chaque
  méthode branchée fait au moins un appel réel).
- **« partiel » : seulement quand un champ ou un geste dépend d’un système hors du kit**, justifié dans la note :
  - `quatreyeux.decider` — gestes de l’appli traduits en actions du catalogue (src/api/domaines/quatreyeux.ts, GESTES) : relais, entreprises, livreurs (suspendre, activer, rétablir), départs, kits, paquets (élargir, priorité, prévenir), versements (contrôle, exception), remboursement, candidatures, journal, fraude, zones (placer, plan, saison), emballages (commander, facturer, justifier), étiquettes (attribuer, invalider). Restent sans action au kit : escrow.* (aucun geste manuel sur l’escrow : la règle libère seule), wallet.geler, remboursement.autre_numero, versement.plan_apurement, registre.regularisation (prestataire de paiement, hors du serveur sûr) ; relais.basculer, attendre, transferer, relancer, apurement, fin_convention (chantier du relais, branche l/relais) ; identifiant.accepter et refuser (aucune demande n’attend la console au kit) : NonBranche
  - `argent.wallet` — gel des retraits et gestes commerciaux du Wallet : prestataire de paiement (paiements hors du serveur sûr) ; finances.lire
  - `argent.remboursements` — décomposition livraison, retenues et frais rendus : registre du prestataire de paiement ; tentatives relevées chez l’opérateur ; vendeursEnControle []
  - `argent.versements` — frais par lot (R43, payés par le bénéficiaire) ; plan d’apurement : geste de paiement (prestataire) ; livreurs payés par leur entreprise
  - `argent.commissions` — commission et garde figées au paiement (vendeur_core.CommandeVendeur) ; frais de versement, remise du plan, essai et échec de paiement de l’abonnement du vendeur : prestataire de paiement (paiements hors du serveur sûr) ; relevés émis []
  - `acteurs.kyc` — visage, preuve de vie, contrôles automatiques et dédoublonnage : prestataire KYC (hors du kit, à brancher chez le fournisseur réel) ; complément demandé, conflit d’intérêts et historique servis
  - `catalogue.deciderAvis` — publicité : modération du kit ; avis produit (A…) : relaya garde l’avis, le masquer se fait chez relaya (à brancher sur catalog.ProductReview) → masquage_impossible
  - `logistique.relais` — relais de relaya (pont) : Trust Score, convention, bascule, secours, fermeture et constats du relais sont branchés par le chantier du relais (relais_core, branche l/relais) ; versement = dette d’espèces du vendredi
  - `logistique.relaisFiche` — KYC du gérant, visite, formation, photos, journée : chantier du relais (relais_core, branche l/relais)
  - `logistique.candidatures` — entreprises ; candidatures de relais : chantier du relais (relais_core, branche l/relais)
- **« demo »** : gestes propres à la démonstration (choisir un agent de démonstration, changer de rôle de démonstration).
- **Recette de bout en bout** contre le vrai serveur : `npx playwright test -c pw-api.config.ts` (base neuve, `charger_demo`
  puis `charger_demo_console` : vingt et un employés par rôle, mot de passe et clé d’authentification de
  `backend-kit/apps/console/demo.py`) : connexion d’un agent par les écrans (mot de passe puis code de l’application),
  files et délégation, décision à quatre yeux (blocage d’un accès contresigné par une autre Direction), les sept genres
  de poste, gouvernance et paramètres (proposition préparée, soumise, retirée), équipe et accès, sessions, voir comme le
  client, contenu du site, promotions, abonnements, Mon compte (codes lus par `/api/_essai/codes`), zones v2, et toutes
  les pages ouvertes sans erreur pour la Direction, la Finance, le Service client, les Opérations et l’Audit.

### Ce qui reste au fournisseur réel (hors du kit)

- **Prestataire KYC** : comparaison du visage, preuve de vie, contrôles automatiques et dédoublonnage des pièces.
- **Paiements** (hors du serveur sûr) : gel des retraits du Wallet et gestes commerciaux, décomposition d’un remboursement
  (livraison, retenues, frais rendus), autre numéro du même titulaire, plan d’apurement, régularisation au registre,
  paiement de l’abonnement des vendeurs ; aucun geste manuel sur l’escrow (la règle libère seule).
- **relaya** : masquer un avis produit (relaya garde `catalog.ProductReview`).
- **Chantier du relais** (branche l/relais, autre agent) : fiche complète du relais (Trust Score, convention, bascule,
  secours, fermeture, constats, KYC du gérant), candidatures de relais à la console, gestes du relais (basculer,
  attendre, transférer, relancer, apurement, fin de convention depuis la fiche de la console).
- **Google** (Mon compte) : la prise est prête ; sans vérificateur configuré, l’association rend « indisponible ».

### Routes nouvelles à reporter dans `backend-kit/openapi.yaml` et les outils du kit

Toutes figurent au catalogue `backend-kit/apps/console/donnees/routes-console.json` (résumé, permission, idempotence,
corps) ; `openapi.yaml`, `outils/*` et `_essai/config/*` n’ont pas été modifiés par ce chantier.

85 routes ajoutées sous `/api/console/` :

- **auth** : `GET /api/console/auth/blocage`, `POST /api/console/auth/login`, `POST /api/console/auth/code`, `POST /api/console/auth/code/sms`, `POST /api/console/auth/lien`, `POST /api/console/auth/lien/ouvrir`, `POST /api/console/auth/mot-de-passe/oubli`, `POST /api/console/auth/mot-de-passe`, `GET /api/console/auth/appareil`, `POST /api/console/auth/appareil`, `POST /api/console/auth/deconnexion`
- **vues** : `POST /api/console/vues/session/role`, `GET /api/console/vues/promotions`, `POST /api/console/vues/promotions/flash/{id}/{geste}`, `POST /api/console/vues/promotions/rabais/{id}/retirer`, `GET /api/console/vues/promotions-plateforme`, `POST /api/console/vues/promotions-plateforme`, `POST /api/console/vues/promotions-plateforme/{id}/{geste}`, `GET /api/console/vues/envois`, `POST /api/console/vues/envois/{id}/renvoyer`, `GET /api/console/vues/budget-sms`, `GET /api/console/vues/diffusions`, `POST /api/console/vues/diffusions`, `GET /api/console/vues/audience`, `GET /api/console/vues/modeles`, `POST /api/console/vues/modeles/{id}/publier`, `GET /api/console/vues/services`, `GET /api/console/vues/pannes`, `POST /api/console/vues/pannes`, `POST /api/console/vues/pannes/{id}/{geste}`, `GET /api/console/vues/tickets`, `POST /api/console/vues/tickets/{id}/{geste}`, `GET /api/console/vues/reponses-types`, `GET /api/console/vues/articles`, `POST /api/console/vues/articles/{id}`, `GET /api/console/vues/demandes-fiches`, `POST /api/console/vues/demandes-fiches/{id}/decider`, `GET /api/console/vues/fiches`, `POST /api/console/vues/fiches/{id}`, `GET /api/console/vues/appariements`, `POST /api/console/vues/appariements/{id}/decider`, `GET /api/console/vues/taxonomie`, `POST /api/console/vues/taxonomie`, `GET /api/console/vues/escrow`, `POST /api/console/vues/remboursements/{id}/relever`, `GET /api/console/vues/rapprochement`, `POST /api/console/vues/rapprochement/releve`, `POST /api/console/vues/cartes-finance`, `POST /api/console/vues/cloture/transmettre`, `GET /api/console/vues/paliers`, `POST /api/console/vues/paliers/{id}/decider`, `GET /api/console/vues/sanctions`, `POST /api/console/vues/sanctions`, `POST /api/console/vues/sanctions/{id}/decider`, `POST /api/console/vues/clients/{id}/ifa`, `GET /api/console/vues/acces/{espace}/{id}`, `POST /api/console/vues/acces`, `GET /api/console/vues/placements`, `GET /api/console/vues/changements`, `GET /api/console/vues/pilotage`, `POST /api/console/vues/livreurs/{id}/position`, `GET /api/console/vues/emballages`, `GET /api/console/vues/livreurs-activations`, `GET /api/console/vues/delegues`, `POST /api/console/vues/cartes-deleguer`, `GET /api/console/vues/rapports`, `POST /api/console/vues/journal/ecrire`, `POST /api/console/vues/fraude/{id}/identifiant`, `GET /api/console/vues/carte`
- **moi** : `POST /api/console/moi/appareil`, `GET /api/console/moi/compte`, `POST /api/console/moi/compte/nom/code`, `POST /api/console/moi/compte/nom`, `POST /api/console/moi/compte/{quoi}/code`, `POST /api/console/moi/compte/{quoi}`, `POST /api/console/moi/compte/mot-de-passe`, `POST /api/console/moi/compte/photo`, `POST /api/console/moi/compte/google`, `POST /api/console/moi/compte/google/retirer`, `POST /api/console/moi/compte/google/synchroniser`
- **photos** : `GET /api/console/photos`, `POST /api/console/photos`, `POST /api/console/photos/{cible}/{id}/retirer`
- **propositions** : `POST /api/console/propositions/{id}/soumettre`, `POST /api/console/propositions/{id}/retirer`

## 1. Basculer de la démonstration au kit

| Variable | Démonstration (défaut) | Kit |
|---|---|---|
| `VITE_SOURCE` | `demo` (ou absente) | `api` |
| `VITE_API_URL` | inutile | `https://belivay.com/api` (ou `/api` derrière un mandataire, même origine) |

```
écrans ──► source (SourceAdmin, 16 domaines)
             ├─ demo : src/demo/source-demo.ts (chargée à part, jamais dans le paquet d’une production api)
             └─ api  : src/api/source-api.ts ──► src/api/domaines/<domaine>.ts ──► client HTTP (src/api/client-console.ts)
                                                                                   └──► /api/console/… (kit apps.console)
```

## 2. Conventions

- **Formes** : les lectures `/api/console/vues/…` rendent exactement les types de `src/donnees/domaines/*.ts`. **Montants** :
  ceux des tables du kit (figés au paiement) ; un connecteur ne recalcule jamais un montant (la simulation d’un paramètre
  et le prix barré valable sont des règles de la page, `regles-s5.ts` et `calculs/regles.ts`, lues sur les données du kit).
- **Droits** : moindre privilège par permission du kit (`roles.PERMISSIONS`, alignées sur `src/config/droits.ts`) ;
  `403 console_forbidden {permission, roles}` devient `AccesRefuse` ; `403 hors_perimetre` : hors des zones de l’agent.
- **Décisions** : une porte, `POST /api/console/decisions {action, donnees, motif, preuves}` avec `Idempotency-Key`
  (201 appliquée, 202 à contre-signer) ; les gestes de l’appli sont traduits en actions du catalogue
  (`src/api/domaines/quatreyeux.ts`, `GESTES`) ; refus de règle → `{ok: false, raison}` ; 404 sur une fiche → `null`.
  Chaque geste est journalisé (journal signé, chaîne vérifiable).
- **Connexion des agents** : `/api/console/auth/*` (mot de passe, second facteur par application ou code SMS, lien de
  connexion, appareil retenu), limitée par adresse ; en essai, les codes envoyés se lisent par `/api/_essai/codes`.
- **Listes longues** : `?tout=1` (le client HTTP ne lit pas l’en-tête du curseur).
- **Refus** : `NonBranche` (aucune méthode à ce jour) ; `NonDisponible` pour les gestes « demo ». Jamais une donnée inventée.

## 3. Méthode par méthode

Total : 245 méthodes — branche 231, partiel 10, serveur 0, demo 4.

### session (Session)

| Méthode | État | Route | Échange | Note |
|---|---|---|---|---|
| `session` | branche | GET /api/console/vues/session?appareil= | → SessionAdmin | sans jeton, 401 (session fermée) ou 404 (compte qui n’est pas agent) : connecte false ; téléphone masqué, second facteur, appareils connus (courant : cet appareil), rôle affiché (agir en tant que), astreinte de la Direction, compteurs des files visibles |
| `blocage` | branche | GET /api/console/auth/blocage?appareil= | → {jusqua, echecs} | connexion des agents au kit (connexion_agent.py) : routes publiques limitées en débit par adresse IP ; l’appareil (identifiant opaque) part dans le corps ; identifiants essayés depuis cet appareil |
| `connecter` | branche | POST /api/console/auth/login {identifiant, motDePasse, appareil} | → ResultatIdentifiants (+ jeton d’étape gardé dans l’onglet) ; invalide (restants), bloque (jusqua), suspendu | connexion des agents au kit (connexion_agent.py) : routes publiques limitées en débit par adresse IP ; l’appareil (identifiant opaque) part dans le corps ; echecs_avant_blocage échecs → blocage duree_blocage minutes, journalisé |
| `verifierCode` | branche | POST /api/console/auth/code {etape, code, appareil} | → ResultatCode ; jetons {access, refresh} gardés par le client | connexion des agents au kit (connexion_agent.py) : routes publiques limitées en débit par adresse IP ; l’appareil (identifiant opaque) part dans le corps ; code de l’application d’authentification (TOTP) ou code de secours par SMS ; ADM-2FA-CODES-FAUX codes faux → retour à l’étape 1 ; nouvel appareil signalé (journal, e-mail, alerte) |
| `envoyerCodeSms` | branche | POST /api/console/auth/code/sms {etape} | → {ok, telephone} \| sans_etape_1 \| application_obligatoire | connexion des agents au kit (connexion_agent.py) : routes publiques limitées en débit par adresse IP ; l’appareil (identifiant opaque) part dans le corps ; Finance, Direction, Accès et personnel : application seulement ; le serveur d’essai relit le code par /api/_essai/codes |
| `deconnecter` | branche | POST /api/console/auth/deconnexion {refresh} | → void | session de l’appareil fermée (sid), jeton de rafraîchissement en liste noire ; journalisé ; jetons effacés sur l’appareil |
| `agirEnTantQue` | branche | POST /api/console/vues/session/role {role} | → {ok} \| role_non_tenu | ADM-ROL-02 : rôle affiché parmi les rôles effectifs de l’agent, gardé au kit et journalisé (console.agir_en_tant_que) |
| `changerRole` | demo | démonstration : se connecter comme l’agent d’un rôle |  | en production, chaque agent se connecte avec son accès nominatif |
| `agentsDemo` | demo | démonstration : agents proposés à la connexion |  |  |
| `changerAgent` | demo | démonstration : se connecter comme un employé précis |  | en production, chaque agent se connecte avec son accès nominatif |
| `comptesDemo` | demo | démonstration : employés proposés à la connexion, par équipe |  |  |
| `invitation` | branche | GET /api/console/activation/{jeton} | → ResultatInvitation | lien d’activation d’un employé invité (ADM-INVITATION-H) : lecture publique limitée en débit |
| `activer` | branche | POST /api/console/activation/{jeton} | → ResultatActivation | mot de passe (MDP-LONG), second facteur enrôlé, charte acceptée ; journalisé |

### direct (Vue d’ensemble)

| Méthode | État | Route | Échange | Note |
|---|---|---|---|---|
| `vue` | branche | GET /api/console/vues/direct | → VueDirecte | montant payé et escrow du moment : finances.lire seulement (ADM-ROL-04) ; zones[].commandes = colis du jour par zone de ramassage ; santé : superviseur, audit, opérations |
| `chercher` | branche | GET /api/console/vues/recherche?q= | → ResultatRecherche[] | commande (BLV-…), litige (LIT-…), paquet, étiquette, vendeur, relais, entreprise, livreur ; dans le périmètre de l’agent ; client, KYC, ticket : pas de recherche au kit |

### files (File d’action)

| Méthode | État | Route | Échange | Note |
|---|---|---|---|---|
| `file` | branche | GET /api/console/vues/cartes | → CarteAction[] (élément de file du kit, famille et écran posés par le connecteur) | identifiant « file:id » ; montant des cartes d’argent (remboursements, versements) ; « Confiée à » (délégation) |
| `indicateurs` | branche | GET /api/console/vues/indicateurs | → IndicateursFile | coût des SMS par commande (sms_prix_unitaire) ; escrow du moment, valeur et revenus du jour : finances.lire |
| `ouvrir` | branche | POST /api/console/vues/cartes/{file:id}/ouvrir | → {ok, verrou} \| {ok: false, raison: verrouillee} | verrou de ADM-VERROU-MIN minutes (15 par défaut), gardé dans le cache du serveur |
| `liberer` | branche | POST /api/console/vues/cartes/{file:id}/liberer | → {ok} |  |
| `delegues` | branche | GET /api/console/vues/delegues | → Delegue[] | agents actifs, autres que soi ; familles : files du kit que leur rôle voit (delegation.FAMILLE_DE_FILE) |
| `deleguer` | branche | POST /api/console/vues/cartes-deleguer {ids, agentId, motif} (Idempotency-Key) | → {ok, n} \| {ok: false, raison: motif_court \| inconnu} | seules les cartes de sa file que l’autre peut traiter ; « Confiée à » sur la carte ; journal carte.deleguee |

### quatreyeux (Quatre yeux)

| Méthode | État | Route | Échange | Note |
|---|---|---|---|---|
| `decider` | partiel | POST /api/console/decisions {action, donnees, motif, preuves} (Idempotency-Key) | → 201 appliquée \| 202 à contre-signer ; 400 motif_requis ; 409 state_changed ; 422 code de la règle | gestes de l’appli traduits en actions du catalogue (src/api/domaines/quatreyeux.ts, GESTES) : relais, entreprises, livreurs (suspendre, activer, rétablir), départs, kits, paquets (élargir, priorité, prévenir), versements (contrôle, exception), remboursement, candidatures, journal, fraude, zones (placer, plan, saison), emballages (commander, facturer, justifier), étiquettes (attribuer, invalider). Restent sans action au kit : escrow.* (aucun geste manuel sur l’escrow : la règle libère seule), wallet.geler, remboursement.autre_numero, versement.plan_apurement, registre.regularisation (prestataire de paiement, hors du serveur sûr) ; relais.basculer, attendre, transferer, relancer, apurement, fin_convention (chantier du relais, branche l/relais) ; identifiant.accepter et refuser (aucune demande n’attend la console au kit) : NonBranche |
| `enAttente` | branche | GET /api/console/vues/quatre-yeux?vue=attente | → DecisionQuatreYeux[] | celles de l’agent, celles qu’il peut contre-signer, celles dont il tient la permission |
| `historique` | branche | GET /api/console/vues/quatre-yeux?vue=historique | → DecisionQuatreYeux[] | 100 dernières ; une décision échue ou en échec est « refusee » (statut du kit dans « statut ») |
| `contresigner` | branche | POST /api/console/decisions/{id}/contresigner {accord: true, motif} (Idempotency-Key) | → {ok, etat} ; 422 meme_personne → meme_compte ; 422 role_insuffisant → role_non_permis ; 409 state_changed → deja_traitee |  |
| `refuser` | branche | POST /api/console/decisions/{id}/contresigner {accord: false, motif} (Idempotency-Key) | → {ok, etat: refusee} |  |

### litiges (Litiges)

| Méthode | État | Route | Échange | Note |
|---|---|---|---|---|
| `liste` | branche | GET /api/console/vues/litiges | → LitigeCourt[] | aftersales.Litige ; niveau 2 = recours du client ; litiges.contenu (pas la finance) |
| `litige` | branche | GET /api/console/vues/litiges/{id} | → LitigeDossier ; 404 → null | croisement des parties, proposition de la règle (vendeur qui accepte ou se tait), compléments demandés (poste) ; partager et transporteur : non permis (le catalogue du kit tranche rembourser, remplacer, débouter) |
| `decider` | branche | POST /api/console/decisions {action: litige-client, donnees: {litige, issue: rembourse\|remplace\|refuse}} (Idempotency-Key) | → {ok, etat, id} ; 202 au-delà de REMB-CONTROLE-SEUIL (quatre yeux) ; 409 state_changed → deja_decide | rembourser → rembourse, remplacer → remplace, debouter → refuse ; partager et transporteur → non_permise |
| `escalader` | branche | POST /api/console/decisions {action: litige-escalader, donnees: {litige}} (Idempotency-Key) | → {ok} ; 422 deja_niveau_2, deja_decide, lecture_seule | passe le litige en médiation (niveau 2) ; journalisé (dispute.escalated) |
| `demanderComplement` | branche | POST /api/console/decisions {action: litige-complement, donnees: {litige, partie}} (Idempotency-Key) | → {ok} | au client : le silence de LIT-CLIENT-SILENCE-J jours court depuis la demande (R70) ; la partie est prévenue |

### commandes (Commandes)

| Méthode | État | Route | Échange | Note |
|---|---|---|---|---|
| `liste` | branche | GET /api/console/vues/commandes | → CommandeCourte[] | pickup.MontantsCommande (montants figés), sous-commandes, colis, litige ; 300 dernières ; zones de l’agent |
| `commande` | branche | GET /api/console/vues/commandes/{ref} | → CommandeFiche ; 404 → null | argentDetail : finances.lire ; part du relais (RELAIS-GAIN-COLIS) et du transporteur (paquets) ; messages au client ; palier IFA ; annulable (commande-annuler) |
| `demasquer` | branche | POST /api/console/vues/demasquer {genre: commande, id, champ, motif} | → {ok, valeur} ; 400 motif_requis → motif_court | journalisé (pii.unmasked) ; donnees.demasquer |
| `annuler` | branche | POST /api/console/decisions {action: commande-annuler, donnees: {commande}} (Idempotency-Key) | → {ok, etat, id} ; 409 state_changed → non_annulable (un colis déjà collecté) ; 400 motif_court | pickup.services.annuler_commande (CAN-09) : remboursement décidé et enregistré, jamais exécuté par le kit ; au-delà de REMB-CONTROLE-SEUIL : quatre yeux (Finance ou Direction) ; frais de service selon CET-24 (part acquise, comme une annulation avant collecte) |

### argent (Argent)

| Méthode | État | Route | Échange | Note |
|---|---|---|---|---|
| `escrow` | branche | GET /api/console/vues/escrow | → VueEscrow | commandes payées (pickup.MontantsCommande), commissions figées (vendeur_core.CommandeVendeur), écritures du grand livre et soldes, versement ; l’argent ne bouge que par les règles (retrait, retour, litige, gel de fraude) : gestes manuels non offerts, raison écrite ; Opérations : ses zones |
| `wallet` | partiel | GET /api/console/vues/wallet | → VueWallet | gel des retraits et gestes commerciaux du Wallet : prestataire de paiement (paiements hors du serveur sûr) ; finances.lire |
| `remboursements` | partiel | GET /api/console/vues/remboursements | → VueRemboursements | décomposition livraison, retenues et frais rendus : registre du prestataire de paiement ; tentatives relevées chez l’opérateur ; vendeursEnControle [] |
| `releverStatut` | branche | POST /api/console/vues/remboursements/{id}/relever | → {ok, etat} ; 409 etat ; 404 inconnu | statut du remboursement chez l’opérateur (paiements.Remboursement, conclu par sa notification) ; Finance, Direction |
| `executer` | branche | POST /api/console/decisions {action: litige-client, donnees: {litige, issue: rembourse}} (Idempotency-Key) | → {ok, etat: decide \| a_contresigner} | motif écrit par le connecteur (« Remboursement exécuté depuis la console ») ; au-delà de REMB-CONTROLE-SEUIL : quatre yeux (202) |
| `versements` | partiel | GET /api/console/vues/versements | → VueVersements | frais par lot (R43, payés par le bénéficiaire) ; plan d’apurement : geste de paiement (prestataire) ; livreurs payés par leur entreprise |
| `rapprochement` | branche | GET /api/console/vues/rapprochement | → VueRapprochement | revenus (commissions figées, frais de livraison des commandes payées), rapprochements d’hier et du jour (finances.rapprocher), écarts, dernier relevé importé, clôture du mois précédent et ses exports (FIN-MIN-PERCEPTION), frais (PAY-CAMPAY-FRAIS), SMS du jour |
| `importerReleve` | branche | POST /api/console/vues/rapprochement/releve {nom, contenu} (Idempotency-Key) | → {ok, lignes, ecarts} \| vide, forme | relevé « reference;montant;statut » (entrées du jour) rapproché avec le registre ; journalisé |
| `ouvrirCarte` | branche | POST /api/console/vues/cartes-finance {objet, texte} (Idempotency-Key) | → {ok, id} \| deja | carte de la File d’action (file « cartes_finance ») |
| `transmettreComptable` | branche | POST /api/console/vues/cloture/transmettre {mois} (Idempotency-Key) | → {ok} \| deja | clôture du mois précédent, une fois ; journalisée |
| `commissions` | partiel | GET /api/console/vues/commissions | → VueCommissions | commission et garde figées au paiement (vendeur_core.CommandeVendeur) ; frais de versement, remise du plan, essai et échec de paiement de l’abonnement du vendeur : prestataire de paiement (paiements hors du serveur sûr) ; relevés émis [] |
| `grandLivre` | branche | GET /api/console/finances/export?du=&au=&sortie=jsonl | → LigneExport[] (lignes JSON Lines après l’en-tête) | export.comptable ; journalisé (accounting.exported) |

### acteurs (Acteurs)

| Méthode | État | Route | Échange | Note |
|---|---|---|---|---|
| `vendeurs` | branche | GET /api/console/vues/vendeurs | → VendeurCourt[] | seuil du palier (VD-PAL-*), plafond de démarrage (VD-PLAFOND-DEMARRAGE), agent qui tient la boutique (lieAgent, A-33), étiquettes : descente proposée, sanction proposée, lancement, conflit ; trustScore 0 tant qu’il n’est pas calculé |
| `vendeur` | branche | GET /api/console/vues/vendeurs/{id} | → FicheVendeur ; 404 → null | historique du Trust Score (relevés de la nuit), événements, sanctions (console et décisions de la boutique), journal ; commissions et versements : finances.lire ; litiges : litiges.contenu |
| `demasquerVendeur` | branche | POST /api/console/vues/demasquer {genre: vendeur, id, motif} | → {ok, valeur} ; 400 motif_requis → motif_court | numéro de versement de la boutique ; journalisé |
| `kyc` | partiel | GET /api/console/vues/kyc | → DossierKyc[] | visage, preuve de vie, contrôles automatiques et dédoublonnage : prestataire KYC (hors du kit, à brancher chez le fournisseur réel) ; complément demandé, conflit d’intérêts et historique servis |
| `ouvrirPiece` | branche | POST /api/console/pieces/{piece}/lien · GET /api/console/pieces/ouvrir/{jeton} | → {ok, lien: {url, expireLe, filigrane}} ; 410 lien_expire | pièces des livreurs et des entreprises ; pieces.consulter ; deux lignes au journal ; une boutique n’a pas de fichier de pièce au kit (NonBranche) |
| `deciderKyc` | branche | POST /api/console/decisions {action: kyc-vendeur \| piece-livreur \| piece-entreprise} (Idempotency-Key) | → {ok, etat, sanction: null} | approuver (motif « Pièces vérifiées et conformes ») et rejeter ; complément : kyc-complement (motif visible de l’acteur, délai de revue suspendu jusqu’à la nouvelle pièce) |
| `paliers` | branche | GET /api/console/vues/paliers | → PropositionPalier[] | descentes proposées par le Trust Score relevé (TS-HYST-J jours sous le seuil de descente) ; contestations des boutiques ; boutiques seulement (livreurs et entreprises : score lu, sans palier proposé) |
| `deciderPalier` | branche | POST /api/console/vues/paliers/{id}/decider {action, motif, evenements} (Idempotency-Key) | → {ok, etat} ; 422 sans_evenement, conflit_interets, meme_auteur ; 409 deja_traite ; 400 motif_court | confirmer : décision « descente » de la boutique (vendeur_croissance) ; recours : autre personne que l’auteur |
| `sanctions` | branche | GET /api/console/vues/sanctions | → Sanction[] | dossiers de la console et décisions des boutiques (recours) ; liste noire : [] (pas d’identifiants bloqués au kit) |
| `deciderSanction` | branche | POST /api/console/vues/sanctions/{id}/decider {action, motif} (Idempotency-Key) | → {ok, etat, quatreYeux} ; 409 deja_traite ; 422 conflit_interets, meme_auteur | niveau 4 : quatre yeux (sanction-exclure) ; effet par le service de l’espace (vendeur_croissance, livreur_session, activation, relais_core) |
| `proposerSanction` | branche | POST /api/console/vues/sanctions {acteurId, espace, niveau, motif, origine} (Idempotency-Key) | → {ok, id} ; 400 motif_court ; 404 inconnu | dossier ouvert (Support, Vérification : proposer) ; jamais décidé à l’ouverture |
| `clients` | branche | GET /api/console/vues/clients | → ClientCourt[] | masqués ; palier IFA décidé par la console (sinon défaut des réglages) ; aProposition : deux litiges perdus |
| `client` | branche | GET /api/console/vues/clients/{id} | → FicheClient ; 404 → null | compteurs (non-retraits, refus au comptoir, rétrogradations), composantes, proposition de rétrogradation, décision ; recours IFA : aucun au kit |
| `demasquerClient` | branche | POST /api/console/vues/demasquer {genre: client, id, motif} | → {ok, valeur} ; 400 motif_requis → motif_court | téléphone de la dernière commande ; journalisé |
| `deciderIfa` | branche | POST /api/console/vues/clients/{id}/ifa {action, motif} (Idempotency-Key) | → {ok, palier} ; 422 trop_tot ; 409 deja_traite | rétrogradation proposée après deux litiges perdus ; palier gardé par la console (relaya n’en tient pas encore) ; pas de recours IFA au kit (deja_traite) |
| `abonnements` | branche | GET /api/console/vues/abonnements | → {liste, plafondGeste} | zone de la dernière commande ; commandes du mois (subscriptions.services.usage) |
| `gesteAbonnement` | branche | POST /api/console/abonnements/{id}/geste {montant, motif} (Idempotency-Key) | → {ok} ; 422 montant, plafond ; 404 inconnu | au plus un mois du palier et le plafond du niveau de l’agent |
| `qualite` | branche | GET /api/console/qualite?acteur=vendeurs\|entreprises\|livreurs\|relais | → ActeurQualite[] | quatre lectures (relais : relais_core) ; historique sur 30 jours, veto, sanctions ouvertes |
| `accesActeur` | branche | GET /api/console/vues/acces/{espace}/{id} | → AccesActeur | état réel lu dans la table de l’espace (compte client, boutique suspendue, livreur, entreprise, relais) ; demande à contresigner ; historique |
| `changerAcces` | branche | POST /api/console/vues/acces {espace, acteurId, etat, motif} (Idempotency-Key) | → {ok, etat: appliquee \| a_contresigner, id} \| {ok: false, raison: sans_effet \| deja_demande} | client : aussitôt (compte et sessions) ; bloquer un autre acteur : quatre yeux (acces-bloquer, Direction) ; rétablir : aussitôt |

### catalogue (Catalogue)

| Méthode | État | Route | Échange | Note |
|---|---|---|---|---|
| `demandes` | branche | GET /api/console/vues/demandes-fiches | → DemandeCreation[] | vendeur_catalogue.DemandeFiche envoyées ; fiches proches par la similarité des titres ; produit interdit (liste CAT-INTERDITS et ajouts) ; photos et mesures de l’offre |
| `deciderDemande` | branche | POST /api/console/vues/demandes-fiches/{id}/decider {action, fiche, motif, signaler} (Idempotency-Key) | → {ok, etat} ; 422 lecture_seule, conflit_interets, sans_evenement ; 409 deja_traite ; 400 motif_court | rattacher : l’offre passe sur la fiche ; créer : nouveau maître ; refuser : l’offre est refusée avec le motif ; le vendeur est prévenu ; Direction et Vérification |
| `appariements` | branche | GET /api/console/vues/appariements | → Appariement[] | paires de fiches au-delà de VD-DOUBLON proposées une fois (l’IA propose, une personne décide) ; en tête au-delà de CAT-FUSION-TETE |
| `deciderAppariement` | branche | POST /api/console/vues/appariements/{id}/decider {action, motif} (Idempotency-Key) | → {ok, etat} ; 422 delai_depasse ; 409 deja_traite | fusionner : offres déplacées, double retiré du catalogue, réversible CAT-FUSION-RETOUR jours ; annuler : retour des offres |
| `fiches` | branche | GET /api/console/vues/fiches | → FicheMaitre[] | vendeur_core.FicheCatalogue publiées, leurs offres (attribuée : la moins chère en vente) ; avis des produits (catalog.ProductReview de relaya) |
| `modifierFiche` | branche | POST /api/console/vues/fiches/{id} {titre, motif} (Idempotency-Key) | → {ok} | le titre du site suit le maître ; jamais le prix ni le stock d’une offre |
| `taxonomie` | branche | GET /api/console/vues/taxonomie | → Categorie[] | familles et rayons des fiches maîtres, sous-catégories ajoutées par la console |
| `creerSousCategorie` | branche | POST /api/console/vues/taxonomie {parent, nom} (Idempotency-Key) | → {ok} \| doublon (existe), vide, lecture_seule | sans doublon (casse et accents ignorés) |
| `aModerer` | branche | GET /api/console/vues/offres | → OffreAModerer[] | offres en vérification ou refusées ; prix de l’offre sur 30 jours (rejoué), prix pratiqués sur le maître, prix conseillé (VD-CONSEIL-PRIX), conflit |
| `deciderOffre` | branche | POST /api/console/decisions {action: moderation, donnees: {genre: offre, id, decision}} (Idempotency-Key) | → {ok, etat} | valider → accepter ; correction et dépublier → refuser ; retirer_barre : prix barré retiré (barre_valide s’il a été pratiqué au moins 7 jours sur 30) puis accepter ; prix conseillé joint au motif ; recours : aucun au kit (le vendeur renvoie son offre) → deja_traite |
| `avis` | branche | GET /api/console/vues/avis | → Avis[] | avis produit signalés lus chez relaya (catalog.ProductReview : note, texte, client masqué, fiche et vendeur de l’offre) ; publicités signalées |
| `deciderAvis` | partiel | POST /api/console/decisions {action: moderation, donnees: {genre: publicite, id, decision}} (Idempotency-Key) | → {ok, etat} | publicité : modération du kit ; avis produit (A…) : relaya garde l’avis, le masquer se fait chez relaya (à brancher sur catalog.ProductReview) → masquage_impossible |

### logistique (Logistique)

| Méthode | État | Route | Échange | Note |
|---|---|---|---|---|
| `zones` | branche | GET /api/console/zones | → Zone[] (code, nom, exploitée) |  |
| `relais` | partiel | GET /api/console/vues/relais | → RelaisCourt[] | relais de relaya (pont) : Trust Score, convention, bascule, secours, fermeture et constats du relais sont branchés par le chantier du relais (relais_core, branche l/relais) ; versement = dette d’espèces du vendredi |
| `relaisFiche` | partiel | GET /api/console/vues/relais/{id} | → RelaisFiche ; 404 → null | KYC du gérant, visite, formation, photos, journée : chantier du relais (relais_core, branche l/relais) |
| `entreprises` | branche | GET /api/console/vues/entreprises | → EntrepriseCourte[] | délai moyen (acceptation → dépôt, 7 jours), pertes (incidents colis, 30 jours) |
| `entrepriseFiche` | branche | GET /api/console/vues/entreprises/{id} | → EntrepriseFiche ; 404 → null | grille d’achat (entreprise_argent.prix : prix, plafond, marge), rapport du pilote jour par jour |
| `couverture` | branche | GET /api/console/vues/couverture | → CouvertureZone[] |  |
| `placements` | branche | GET /api/console/vues/placements | → PlacementQuartier[] | quartiers écrits par les boutiques et les candidats relais, lus contre la table quartier → zone (zones v2) ; un quartier placé par la console est gardé par elle, à reporter dans logique-metier/livraison/quartiers-zones.json |
| `livreurs` | branche | GET /api/console/vues/livreurs | → LivreurCourt[] |  |
| `livreurFiche` | branche | GET /api/console/vues/livreurs/{id} | → LivreurFiche ; 404 → null | modules de la certification faits, dernier quiz soumis |
| `departs` | branche | GET /api/console/vues/departs | → Depart[] | livraison_core.DemandeDepart ; versement de départ figé à la clôture |
| `changements` | branche | GET /api/console/vues/changements | → ChangementIdentifiant[] | lus au journal de la livraison : bascule d’appareil faite par le livreur (code SMS), numéro changé par la console (livreur-numero), second compte refusé ; au kit, aucune demande n’attend la console (« a_decider » n’arrive pas) |
| `paquets` | branche | GET /api/console/vues/paquets | → PaquetCourt[] | 300 derniers ; paliers éligibles (ENT-PLAFOND-VALEUR) ; escalade : élargie, priorité relevée, prévenus |
| `paquetFiche` | branche | GET /api/console/vues/paquets/{id} | → PaquetFiche ; 404 → null | entreprises éligibles et raison ; part du relais (RELAIS-GAIN-COLIS) et achat à l’entreprise : finances.lire |
| `pilotage` | branche | GET /api/console/vues/pilotage | → ZonePilotage[] | ZONE-SCORE sur 7 jours (paquets, relais, entreprises, litiges) ; plan d’action et délai saisonnier tenus par la console ; recherches des clients : [] (pas de journal de recherche au kit) |
| `carte` | branche | GET /api/console/vues/carte | → PointCarte[] | relais, boutiques, points de stockage, paquets en cours, livreurs en mission (Direction et Opérations), alertes ; jamais l’adresse d’un client |
| `consulterPosition` | branche | POST /api/console/vues/livreurs/{id}/position | → {ok, le} \| {ok: false, raison: hors_mission} | pendant une mission seulement ; journalisée (console.position_viewed) ; Direction et Opérations de la zone |
| `emballages` | branche | GET /api/console/vues/emballages | → Emballages | stock avancé lu chez chaque entreprise (entreprise_flotte.emballages) ; stock du siège = commandes au fournisseur moins avances ; coût unitaire et stock initial du siège : donnees/logistique-console.json (provisoires) |
| `candidatures` | partiel | GET /api/console/vues/candidatures | → Candidature[] | entreprises ; candidatures de relais : chantier du relais (relais_core, branche l/relais) |
| `dossiersLivreurs` | branche | GET /api/console/vues/livreurs-activations | → DossierLivreur[] | livreurs en activation et activés depuis 7 jours ; « Activer » : livreur-activer (charte, pièces, certification, approbation de l’entreprise) |
| `verifier` | branche | GET /api/console/actions · GET /api/console/roles | → {ok, regle: {roles, quatreYeux, rolesSecond, route}, detail: null} ; inconnu | geste → action du catalogue (src/api/domaines/quatreyeux.ts) ; permission et double contrôle du kit ; le périmètre de zones est contrôlé par la décision (403 hors_perimetre) |
| `suspendreLivreur` | branche | POST /api/console/decisions {action: decision-livreur, donnees: {livreur, niveau: 3, dureeJours?}} (Idempotency-Key) | → {ok} ; motif_court |  |

### pilotage (Pilotage)

| Méthode | État | Route | Échange | Note |
|---|---|---|---|---|
| `parametres` | branche | GET /api/console/vues/parametres | → ParametreVu[] | statut et famille du registre en vigueur (parametres-en-vigueur.json) ; critique = gouvernance N3 |
| `propositions` | branche | GET /api/console/vues/propositions | → PropositionParametre[] | simulation : cas types et contrôles de la page (regles-s5.ts, simuler) ; la valeur est relue par les moteurs du kit (422 parametre_invalide) ; référence |
| `versions` | branche | GET /api/console/vues/versions?code= | → VersionParametre[] |  |
| `preparer` | branche | POST /api/console/parametres/{code}/propositions {valeur, motif, effetLe, brouillon: true, reference} (Idempotency-Key) | → {ok, id} ; 422 parametre_invalide → bloquee ; 404 → inconnu | préparée (simulee), rien n’est soumis ; texte en vigueur gardé, seul son nombre change ; relue par les moteurs |
| `soumettre` | branche | POST /api/console/propositions/{id}/soumettre (Idempotency-Key) | → {ok, etat} | par son auteur seulement (pas_demandeur) ; bloquee si la simulation échoue ; elle attend la décision d’une autre personne |
| `retirer` | branche | POST /api/console/propositions/{id}/retirer (Idempotency-Key) | → {ok} | par son auteur, préparée ou soumise, avant toute décision |
| `promotions` | branche | GET /api/console/vues/promotions | → VuePromotions | ventes flash des vendeurs (vendeur_croissance.VenteFlash : prix de référence le plus bas sur 30 jours, jamais saisi) ; une vente relue (remise au-delà de VD-VISIBILITE) attend la console : brouillon ; prix barrés (vendeur_core.Offre) et jours vraiment pratiqués (historique de l’offre) ; chiffres du mois (commandes des vendeurs, gestes) ; emplacements de l’accueil (publicité) ; disposition et fêtes : donnees/accueil-console.json |
| `simulerFlash` | branche | POST /api/console/vues/promotions/flash/{id}/simuler (Idempotency-Key) | → {ok} ; 409 etat | promotions.programmer (Direction) ; journal de la vente |
| `programmerFlash` | branche | POST /api/console/vues/promotions/flash/{id}/programmer (Idempotency-Key) | → {ok} ; 422 controle ; 409 etat, ferme, non_simulee | contrôles : prix barré pratiqué 7 jours, FLASH-REMISE-MIN, ADM-GENEROSITE-LANCEMENT, FLASH-DUREE-MAX, stock, ciblage, début futur ; la relecture levée, la vente part à son heure ; vendeur prévenu |
| `annulerFlash` | branche | POST /api/console/vues/promotions/flash/{id}/annuler {motif} (Idempotency-Key) | → {ok} ; 409 etat | avant son début seulement (vendeur_croissance.promotions.arreter) |
| `arreterFlash` | branche | POST /api/console/vues/promotions/flash/{id}/arreter {motif} (Idempotency-Key) | → {ok} ; 409 etat | Direction ou Service client ; les clients qui ont payé gardent leur prix |
| `retirerRabais` | branche | POST /api/console/vues/promotions/rabais/{id}/retirer {motif} (Idempotency-Key) | → {ok} ; 409 etat | prix barré remis à vide sur l’offre, publiée au site ; vendeur prévenu |
| `contenuSite` | branche | GET /api/console/contenu-site | → ContenuSite | le kit garde les réglages publiés ; titres et accroches des moments : site/src/donnees/moments.ts |
| `publierContenu` | branche | POST /api/console/contenu-site {moments, categories, motif} (Idempotency-Key) | → {version} ; 422 dates ; 409 moments_reserves ; 403 | lu par le site dans GET /api/content/home (momentsReglages, carrousel réordonné) |
| `modules` | branche | GET /api/console/interrupteurs · GET /api/console/vues/quatre-yeux?vue=attente | → InterrupteurVu[] | paramètres liés et leur statut ; bloqué si l’un est « À trancher » (module_bloque, avant la contre-signature) ; valeur du registre pour le site ; dix dernières bascules |
| `interrupteurs` | branche | GET /api/console/interrupteurs · GET /api/console/vues/quatre-yeux?vue=attente | → InterrupteurVu[] | comme modules |
| `demanderBascule` | branche | POST /api/console/decisions {action: interrupteur, donnees: {code, ouvert}} (Idempotency-Key) | → {ok, id} (202, toujours à quatre yeux) ; 422 interrupteur_inconnu → inconnu |  |
| `promotionsPlateforme` | branche | GET /api/console/vues/promotions-plateforme | → VuePromotionsPlateforme | catégories de l’accueil, zones exploitées, vitrines approuvées ; remise au plus ADM-GENEROSITE-LANCEMENT |
| `creerPromotion` | branche | POST /api/console/vues/promotions-plateforme {titre, remise, debut, fin, cible, motif} (Idempotency-Key) | → {ok, id} ; 422 titre, remise, cible, dates | Direction seule ; reflétée sur l’accueil du site pendant sa fenêtre (contenus.PromotionProgrammee) ; annoncée aux clients et aux vendeurs |
| `lancerPromotion` | branche | POST /api/console/vues/promotions-plateforme/{id}/lancer {motif} (Idempotency-Key) | → {ok} ; 409 etat |  |
| `arreterPromotion` | branche | POST /api/console/vues/promotions-plateforme/{id}/arreter {motif} (Idempotency-Key) | → {ok} ; 409 etat | Direction ou Service client ; les commandes payées gardent leur prix |
| `photos` | branche | GET /api/console/photos | → PhotoConsole[] | celles que le rôle voit (la pièce d’un dossier : rôles des pièces) |
| `remplacerPhoto` | branche | POST /api/console/photos {cible, id, libelle, photo, motif} (Idempotency-Key) | → {ok} ; 422 photo ; 404 inconnu | image réduite sur l’appareil ; photos publiées gardées par contenus (téléversement) ; la pièce d’un dossier reste dans la console |
| `retirerPhoto` | branche | POST /api/console/photos/{cible}/{id}/retirer {motif} (Idempotency-Key) | → {ok} ; 409 sans_effet | la photo d’origine revient |

### communication (Communication)

| Méthode | État | Route | Échange | Note |
|---|---|---|---|---|
| `envois` | branche | GET /api/console/vues/envois | → Envoi[] | console.EnvoiNotification : destinataire masqué, criticité et événement du catalogue (donnees/modeles-console-meta.json), coût d’un SMS délivré (sms_prix_unitaire), essais, renvois en 24 h, carte d’un critique non délivré (ADM-MSG-C1-MIN), texte rendu, code masqué ; la Finance n’en voit que les coûts |
| `renvoyer` | branche | POST /api/console/vues/envois/{id}/renvoyer (Idempotency-Key) | → {ok} ; 409 deja_delivre, quota ; 404 inconnu | même clé : jamais deux messages pour un événement |
| `budgetSms` | branche | GET /api/console/vues/budget-sms | → BudgetSms | SMS délivrés du mois par jour et par modèle × sms_prix_unitaire ; commandes payées (pickup) ; envois gratuits |
| `diffusions` | branche | GET /api/console/vues/diffusions | → Diffusion[] | une diffusion programmée part à son heure ; une décision refusée ou échue la refuse |
| `audience` | branche | GET /api/console/vues/audience?espaces=&zones=&promotion= | → number | comptes réels : clients du relais habituel de la zone (sans ceux qui refusent les promotions), boutiques, relais ouverts, entreprises, livreurs actifs |
| `diffuser` | branche | POST /api/console/vues/diffusions {objet, texte, espaces, zones, canaux, promotion, programmeeLe, motif} (Idempotency-Key) | → {ok, id, etat} ; 422 objet, vide, contenu, sms_promo, heures_promo, passe | au-delà de diffusion_quatre_yeux_seuil destinataires : décision « diffusion » à quatre yeux (Direction ou Finance) |
| `modeles` | branche | GET /api/console/vues/modeles | → ModeleMessage[] | modèles de la console (textes livrés, versions publiées FR et EN avec leur motif), envois en échec du jour |
| `publierModele` | branche | POST /api/console/vues/modeles/{id}/publier {fr, en, motif} (Idempotency-Key) | → {ok, version} ; 422 vide, numero, code, variable_inconnue, code_hors_modele, sms_promo, inchange | une version sur chaque canal du modèle ; journalisé (notification.template_published) |
| `services` | branche | GET /api/console/vues/services | → ServiceEtat[] | supervision du kit (base, registre, journal, tâches), SMS en échec, relais en ligne, états de l’aide |
| `incidents` | branche | GET /api/console/vues/pannes | → Incident[] | zones de l’agent ; remises : registre papier des relais (relais_core.LigneRegistre) ; un relais en papier sans ligne : « registre à ressaisir » |
| `declarer` | branche | POST /api/console/vues/pannes {service, zones, effets, consignes, detecteLe} (Idempotency-Key) | → {ok, id} ; 422 service, zones, perimetre, contenu ; 400 motif_court | panne.agir (Direction, Opérations dans ses zones) ; publié aux six espaces (journal signé) |
| `passerPapier` | branche | POST /api/console/vues/pannes/{id}/papier {relais} (Idempotency-Key) | → {ok} ; 409 etat ; 422 zones | relais_core : panne générale ouverte, relais en registre papier |
| `mettreAJour` | branche | POST /api/console/vues/pannes/{id}/consignes {consignes} (Idempotency-Key) | → {ok} ; 409 etat | panne.agir (Direction, Opérations dans ses zones) ; publié aux six espaces (journal signé) |
| `retablir` | branche | POST /api/console/vues/pannes/{id}/retablir (Idempotency-Key) | → {ok} ; 409 etat | panne générale fermée, registre à ressaisir (PR-PAPIER-SAISIE-H) |
| `relancerRessaisie` | branche | POST /api/console/vues/pannes/{id}/ressaisie {remise} (Idempotency-Key) | → {ok} ; 409 etat | le relais est relancé (journal vers le relais) |
| `ecrireRapport` | branche | POST /api/console/vues/pannes/{id}/rapport {cause, effets, change} (Idempotency-Key) | → {ok} ; 409 etat ; 400 motif_court | panne.agir (Direction, Opérations dans ses zones) ; publié aux six espaces (journal signé) |
| `clore` | branche | POST /api/console/vues/pannes/{id}/clore (Idempotency-Key) | → {ok} ; 409 non_retabli, registre, rapport, etat | service rétabli, registre ressaisi, rapport écrit |
| `tickets` | branche | GET /api/console/vues/tickets | → TicketSupport[] | demandes nées des conversations : client (messaging), vendeur (vendeur_boutique), entreprise (fil vers BelivaY) ; échéance SUP-DELAI aux heures SUP-HORAIRES ; rattachement proposé (dernière commande du client) |
| `rattacher` | branche | POST /api/console/vues/tickets/{id}/rattacher {ref} (Idempotency-Key) | → {ok} ; 422 non_rattache | support.agir (Service client) ; journalisé |
| `preparerReponse` | branche | POST /api/console/vues/tickets/{id}/brouillon {reponseType, texte} (Idempotency-Key) | → {ok} ; 422 vide, contenu ; 409 etat | support.agir (Service client) ; journalisé |
| `envoyerReponse` | branche | POST /api/console/vues/tickets/{id}/reponse (Idempotency-Key) | → {ok} ; 422 non_rattache, contenu ; 409 etat | versée dans la conversation de l’acteur (il est prévenu) |
| `resoudre` | branche | POST /api/console/vues/tickets/{id}/resoudre (Idempotency-Key) | → {ok} ; 422 non_rattache ; 409 etat | un nouveau message de l’acteur ouvre une nouvelle demande |
| `accorderGeste` | branche | POST /api/console/vues/tickets/{id}/geste {motif} (Idempotency-Key) | → {ok} ; 422 non_rattache, geste_depasse ; 409 deja_geste | SUP-GESTE, jamais au-delà de la commission perçue ni du plafond de l’agent ; enregistré pour la Finance (aucun argent ne bouge ici) |
| `reponsesTypes` | branche | GET /api/console/vues/reponses-types | → ReponseType[] | donnees/support-console.json ; usage sur 30 jours compté sur les demandes |
| `articles` | branche | GET /api/console/vues/articles | → ArticleAide[] | signalé quand une règle citée a une nouvelle version appliquée au registre |
| `mettreAJourArticle` | branche | POST /api/console/vues/articles/{id} (Idempotency-Key) | → {ok} ; 404 inconnu | aide.mettre_a_jour |

### gouvernance (Gouvernance)

| Méthode | État | Route | Échange | Note |
|---|---|---|---|---|
| `journal` | branche | GET /api/console/vues/journal?action=&objet=&limite= | → LigneJournal[] | sa part (journal.tout : audit, superviseur) ; zone de la ligne (livreur, entreprise ou objet) ; avant → après quand la ligne les porte |
| `verifierChaine` | branche | GET /api/console/journal/verification | → {ok, casseeA, lignes} |  |
| `ecrire` | branche | POST /api/console/vues/journal/ecrire {action, objet, motif?, avant?, apres?} | → LigneJournal ; 422 action_inconnue | liste fermée : export.csv (fichier signé dans le navigateur), appel.masque, appel.note ; tout autre geste est journalisé par le serveur lui-même |
| `agents` | branche | GET /api/console/vues/agents | → Agent[] | téléphone masqué, second facteur et appareils connus (connexion des agents) |
| `tableauJournal` | branche | GET /api/console/vues/journal/tableau?q=&agentId=&role=&action=&periode= | → TableauJournal | détail avant → après ; adresse et appareil : jamais gardés au journal signé (données minimales) ; 300 lignes |
| `consulterJournal` | branche | POST /api/console/vues/journal/consulter | → {ok} | une ligne journal.consulted par minute et par agent |
| `reconstituer` | branche | GET /api/console/vues/journal?objet=&limite=1000 | → Reconstitution | lignes de l’objet jusqu’à l’instant ; état : « après » de la dernière ligne qui en porte un |
| `lierExport` | branche | GET /api/console/decisions/{ref} | → void | la demande d’export est la décision « journal-export » (geste journal.exporter : portée {periode, du, au} ou {demande}) ; lier la relit |
| `exportsJournal` | branche | GET /api/console/vues/journal/exports?tout=1 | → ExportJournal[] | audit.exporter |
| `telechargerExport` | branche | GET /api/console/vues/journal/exports/{id} | → {entetes, lignes, nom} ; 409 pas_valide ; 404 inconnu | après la contre-signature seulement ; borné au journal du moment de la contre-signature ; journalisé (audit.export_downloaded) |
| `demandesDonnees` | branche | GET /api/console/vues/demandes-donnees?tout=1 | → DemandeDonnees[] | donnees.lire ; cinq espaces ; échéance ADM-ACCES-DONNEES-J |
| `enregistrerDemande` | branche | POST /api/console/vues/demandes-donnees {acteur, espace, type, motif} (Idempotency-Key) | → {ok, id} ; 400 motif_court ; 409 deja_ouverte | donnees.traiter ; acteur : identifiant du compte (les chiffres saisis, « user:12 » ou « Client ••• 0012 ») |
| `repondreDemande` | branche | POST /api/console/vues/demandes-donnees/{id}/reponse {motif} (Idempotency-Key) | → {entetes, lignes, nom} ; 409 deja_repondue ; 404 inconnu | donnees.repondre ; seules les lignes qui visent l’acteur, sans données de tiers ; une fois |
| `fraude` | branche | GET /api/console/vues/fraude | → TableauFraude | comptes (inscription, commandes, zone), identifiant partagé masqué, graphe comptes ↔ identifiant, gel conservatoire (fraude-gel) |
| `alerte` | branche | GET /api/console/vues/fraude | → AlerteFraude \| null | même lecture, une alerte |
| `ouvrirRevue` | branche | POST /api/console/decisions {action: fraude-decision, donnees: {alerte, decision: en_revue}} | → {ok} | motif écrit par le connecteur (« Revue ouverte ») |
| `classerAlerte` | branche | POST /api/console/decisions {action: fraude-decision, donnees: {alerte, decision: ecartee}} | → {ok} ; state_changed → deja_tranchee |  |
| `proposerSanction` | branche | POST /api/console/decisions {action: fraude-decision, donnees: {alerte, decision: confirmee}} | → {ok} ; state_changed → deja_tranchee |  |
| `lierGel` | branche | GET /api/console/decisions/{ref} | → void | la demande de gel est la décision « fraude-gel » à quatre yeux (geste fraude.geler) ; lier la relit |
| `leverGel` | branche | POST /api/console/decisions {action: fraude-gel-lever, donnees: {alerte}} (Idempotency-Key) | → {ok} ; 422 pas_de_gel | les versements retenus partent au vendredi suivant |
| `demasquerIdentifiant` | branche | POST /api/console/vues/fraude/{id}/identifiant {motif} | → {ok, valeur} \| {ok: false, raison: motif_court} ; 404 inconnu | identifiant partagé par les comptes de l’alerte : numéro relu chiffré (wallet, numéro de versement), appareil par son empreinte ; donnees.demasquer et fraude.lire ; journalisé (donnee.demasquer) |
| `comptes` | branche | GET /api/console/vues/comptes | → TableauComptes | agents.lire ; revue trimestrielle, bris de glace, durées de session : valeurs de la décision « Proposé » (A-VALIDER) tant que le registre ne les porte pas |
| `creerCompte` | branche | POST /api/console/comptes | → {ok, id, expireLe} | invitation d’un employé (lien d’activation, ADM-INVITATION-H) ; rôle Direction : action agent-inviter à quatre yeux |
| `lierCreationDirection` | branche | GET /api/console/decisions/{ref} | → void | création d’un compte Direction : décision « agent-inviter » à quatre yeux (l’invitation part à la contre-signature) ; lier la relit |
| `modifierCompte` | branche | POST /api/console/decisions {action: agent, donnees: {user, roles, zones, actif}} (Idempotency-Key) | → {ok} (à contre-signer) ; dernier_superviseur → direction_min |  |
| `fermerAcces` | branche | POST /api/console/decisions {action: agent, donnees: {user, roles, zones, actif}} (Idempotency-Key) (actif: false) | → {ok, reattribues: 0} (à contre-signer) | les cartes ne sont pas attribuées au kit : rien à réattribuer |
| `confirmerCompte` | branche | POST /api/console/comptes/{id}/confirmer | → {ok} | revue trimestrielle des accès |
| `suspendreCompte` | branche | POST /api/console/vues/comptes/{id}/suspendre {motif} (Idempotency-Key) | → {ok} ; 409 soi_meme, direction_quatre_yeux, direction_min, etat | sessions fermées tout de suite ; réactivable à quatre yeux |
| `renvoyerInvitation` | branche | POST /api/console/vues/comptes/{id}/inviter (Idempotency-Key) | → {ok} ; 409 etat | nouveau lien d’activation par e-mail ; l’ancien est annulé |
| `reactiverCompte` | branche | POST /api/console/decisions {action: agent, donnees: {user, roles, zones, actif}} (Idempotency-Key) (actif: true) | → {ok} (à contre-signer) |  |
| `pays` | branche | GET /api/console/vues/pays | → EspacePaysDetail[] | pays.gerer ; Cameroun ouvert (registre), copies en préparation (liste CEMAC), conditions constatées |
| `copierPays` | branche | POST /api/console/vues/pays {code, nom, motif} (Idempotency-Key) | → {ok} ; 409 existe ; 404 inconnu |  |
| `revoirParametre` | branche | POST /api/console/vues/pays/{code}/parametres {code, valeur} (Idempotency-Key) | → {ok} ; 422 vide, condition |  |
| `ouvrirPays` | branche | POST /api/console/decisions {action: pays-ouvrir, donnees: {pays}} (Idempotency-Key) | → {ok} ; 422 conditions |  |
| `terrain` | branche | GET /api/console/vues/terrain?tout=1 | → TableauTerrain | terrain.lire ; agents terrain, descentes du jour, fiches (numéro masqué), rendement par zone |
| `nouvelleFiche` | branche | POST /api/console/vues/terrain {genre, nom, zone, quartier, titulaire, numero} (Idempotency-Key) | → {ok, id} ; 422 incomplet, hors_zone | terrain.saisir ; numéro chiffré + empreinte |
| `envoyerLien` | branche | POST /api/console/vues/terrain/{id}/lien (Idempotency-Key) | → {ok} ; 409 etat |  |
| `relancer` | branche | POST /api/console/vues/terrain/{id}/relancer (Idempotency-Key) | → {ok} ; 409 etat |  |
| `controlerFiche` | branche | POST /api/console/decisions {action: terrain-controle, donnees: {fiche, conforme}} (Idempotency-Key) | → {ok} ; 422 meme_personne ; 409 etat | terrain.controler (Vérification) ; jamais l’auteur de la fiche |

### systeme (Système)

| Méthode | État | Route | Échange | Note |
|---|---|---|---|---|
| `interrupteurs` | branche | GET /api/console/interrupteurs | → Interrupteur[] | decision : référence de la dernière bascule, sinon l’état par défaut |
| `sante` | branche | GET /api/console/vues/sante | → ServiceSante[] | un contrôle de supervision par ligne (base, cache, registre, journal, tâches, notifications), durée mesurée |
| `taches` | branche | GET /api/console/vues/taches/courtes | → TachePlanifiee[] |  |
| `tableauSante` | branche | GET /api/console/vues/sante/tableau | → TableauSante | sante.lire ; supervision du kit, files, maintenances annoncées |
| `programmerMaintenance` | branche | POST /api/console/decisions {action: maintenance, donnees: {service, debut, dureeMin}} (Idempotency-Key) | → {ok, id} ; 422 preavis, creneau_interdit ; 409 chevauchement → creneau_interdit | préavis ADM-MAINTENANCE-PREAVIS-H ; annoncée aux six espaces |
| `annulerMaintenance` | branche | POST /api/console/decisions {action: maintenance-annuler, donnees: {maintenance}} (Idempotency-Key) | → {ok} ; 409 state_changed → inconnu |  |
| `tableauTaches` | branche | GET /api/console/vues/taches | → TacheDetail[] | prochaine = dernier succès + période attendue |
| `lancerTache` | branche | POST /api/console/taches/{nom}/lancer {motif} | → {ok} ; hors_periode → deja_faite ; 404 → inconnu | taches.lancer ; motif journalisé (task.run_by_console) |
| `conservation` | branche | GET /api/console/vues/conservation | → TableauConservation | politique du registre, dernière application (console.conservation), paquets gardés pour un litige ouvert, demandes de données des livreurs ouvertes, délai CONSOLE-CANDIDATURE-COMPLEMENT-J |
| `rapports` | branche | GET /api/console/vues/rapports?periode=jour\|7j\|30j&zone= | → TableauRapports | jour par jour (Yaoundé) sur les tables du kit : commandes payées, commissions figées, paquets, remises au relais, litiges, avis, SMS envoyés, emballages liés ; ratio masqué sous RAPPORT-ECHANTILLON-MIN ; Assistant IA : 0 (aucun appel instrumenté) ; rapport du lundi : tâche console.rapport_lundi |
| `legal` | branche | GET /api/console/vues/legal | → TableauLegal | legal.lire ; versions en vigueur, annonces, vocabulaire interdit, produits interdits |
| `proposerVersion` | branche | POST /api/console/decisions {action: texte-legal, donnees: {texte, resume, contenu, effet}} (Idempotency-Key) | → {ok, version} ; 422 preavis, vocabulaire ; 409 deja_annoncee | préavis avant l’effet ; annoncée aux espaces |
| `ajouterInterdit` | branche | POST /api/console/decisions {action: produit-interdit, donnees: {categorie, produit}} (Idempotency-Key) | → {ok} ; 422 vide ; 409 existe |  |

### equipe (Équipe et accès)

| Méthode | État | Route | Échange | Note |
|---|---|---|---|---|
| `tableau` | branche | GET /api/console/equipe | → TableauEquipe | membres par équipe, demandes à valider (quatre yeux), accès à revoir, temporaires qui finissent, alertes (§ 6) |
| `membre` | branche | GET /api/console/equipe/membres/{id} | → FicheMembre \| null | droits effectifs (matrice ∩ niveau ∩ périmètre), historique de ses accès, messages, gestes permis |
| `quiPeut` | branche | GET /api/console/equipe/qui-peut | → QuiPeut |  |
| `inviter` | branche | POST /api/console/equipe/inviter {prenom, nom, email, equipe, niveau, zones, motif} (Idempotency-Key) | → IssueAcces {etat: applique \| a_contresigner, qy} ; 400 motif_court, incomplet ; 403 console_forbidden ; 409 soi_meme, hors_equipe, hors_perimetre, reserve_acces, niveau_reserve, conflit, direction_min, direction_seule, etat, duree, deja | équipe à quatre yeux (Finance, Direction, Accès et personnel, Audit) : invitation envoyée à la contre-signature |
| `changerNiveau` | branche | POST /api/console/equipe/membres/{id}/niveau {niveau, motif} (Idempotency-Key) | → IssueAcces {etat: applique \| a_contresigner, qy} ; 400 motif_court, incomplet ; 403 console_forbidden ; 409 soi_meme, hors_equipe, hors_perimetre, reserve_acces, niveau_reserve, conflit, direction_min, direction_seule, etat, duree, deja |  |
| `changerPerimetre` | branche | POST /api/console/equipe/membres/{id}/perimetre {perimetre, motif} (Idempotency-Key) | → IssueAcces {etat: applique \| a_contresigner, qy} ; 400 motif_court, incomplet ; 403 console_forbidden ; 409 soi_meme, hors_equipe, hors_perimetre, reserve_acces, niveau_reserve, conflit, direction_min, direction_seule, etat, duree, deja | plafond au-dessus de REMB-CONTROLE-SEUIL : quatre yeux |
| `changerRole` | branche | POST /api/console/equipe/membres/{id}/role {role, motif} (Idempotency-Key) | → IssueAcces {etat: applique \| a_contresigner, qy} ; 400 motif_court, incomplet ; 403 console_forbidden ; 409 soi_meme, hors_equipe, hors_perimetre, reserve_acces, niveau_reserve, conflit, direction_min, direction_seule, etat, duree, deja | conflit (§ 4) refusé avec sa raison |
| `donnerTemporaire` | branche | POST /api/console/equipe/membres/{id}/temporaires {role, fin, motif} (Idempotency-Key) | → IssueAcces {etat: applique \| a_contresigner, qy} ; 400 motif_court, incomplet ; 403 console_forbidden ; 409 soi_meme, hors_equipe, hors_perimetre, reserve_acces, niveau_reserve, conflit, direction_min, direction_seule, etat, duree, deja | au-delà de ADM-ACCES-TEMP-QY-J : quatre yeux ; ADM-ACCES-TEMP-MAX-J au plus ; retiré tout seul à sa fin |
| `retirerTemporaire` | branche | POST /api/console/equipe/membres/{id}/temporaires/{t}/retirer {motif} (Idempotency-Key) | → IssueAcces {etat: applique \| a_contresigner, qy} ; 400 motif_court, incomplet ; 403 console_forbidden ; 409 soi_meme, hors_equipe, hors_perimetre, reserve_acces, niveau_reserve, conflit, direction_min, direction_seule, etat, duree, deja |  |
| `avertir` | branche | POST /api/console/equipe/avertissements {pour, genre, texte} (Idempotency-Key) | → {id, destinataires} |  |
| `suspendre` | branche | POST /api/console/equipe/membres/{id}/suspendre {motif} (Idempotency-Key) | → IssueAcces {etat: applique \| a_contresigner, qy} ; 400 motif_court, incomplet ; 403 console_forbidden ; 409 soi_meme, hors_equipe, hors_perimetre, reserve_acces, niveau_reserve, conflit, direction_min, direction_seule, etat, duree, deja | sessions fermées tout de suite (jetons émis avant refusés) |
| `reactiver` | branche | POST /api/console/equipe/membres/{id}/reactiver {motif} (Idempotency-Key) | → IssueAcces {etat: applique \| a_contresigner, qy} ; 400 motif_court, incomplet ; 403 console_forbidden ; 409 soi_meme, hors_equipe, hors_perimetre, reserve_acces, niveau_reserve, conflit, direction_min, direction_seule, etat, duree, deja | toujours à quatre yeux |
| `desactiver` | branche | POST /api/console/equipe/membres/{id}/desactiver {motif, repreneur} (Idempotency-Key) | → {reattribues} ; 409 dossiers_en_cours, direction_min |  |
| `revue` | branche | GET /api/console/equipe/revues/{equipe} | → RevueAcces |  |
| `revoir` | branche | POST /api/console/equipe/revues/lignes/{ligne} {decision, motif} (Idempotency-Key) | → IssueAcces {etat: applique \| a_contresigner, qy} ; 400 motif_court, incomplet ; 403 console_forbidden ; 409 soi_meme, hors_equipe, hors_perimetre, reserve_acces, niveau_reserve, conflit, direction_min, direction_seule, etat, duree, deja |  |
| `monEquipe` | branche | GET /api/console/equipe/mon-equipe | → MonEquipe | Responsable d’équipe seulement |
| `repartir` | branche | POST /api/console/equipe/dossiers/{id}/repartir {vers} (Idempotency-Key) | → {ok} |  |
| `mesMessages` | branche | GET /api/console/moi/messages | → MesMessages |  |
| `lireMessage` | branche | POST /api/console/moi/messages/{id}/lu | → void | accusé de lecture |
| `ouvrirUrgence` | branche | POST /api/console/urgence {motif, heures} (Idempotency-Key) | → {jusqua} ; 409 duree | Direction seulement, ADM-BRIS-GLACE-H au plus, revu le lendemain |
| `fermerUrgence` | branche | POST /api/console/urgence/fermer | → void |  |
| `revoirUrgence` | branche | POST /api/console/urgence/{id}/revoir {motif} (Idempotency-Key) | → {ok} ; 409 soi_meme |  |
| `descentes` | branche | GET /api/console/descentes | → TableauDescentes | ses zones pour les Opérations |
| `planifier` | branche | POST /api/console/descentes {type, zone, cible, lieu, repere, prevueLe, agentId} (Idempotency-Key) | → {id} ; 409 hors_perimetre | inspection d’un relais : événement relay.inspection.announced au relais |
| `assigner` | branche | POST /api/console/descentes/{id}/assigner {agent} (Idempotency-Key) | → {ok} |  |
| `annulerDescente` | branche | POST /api/console/descentes/{id}/annuler {motif} (Idempotency-Key) | → {ok} |  |
| `mesDescentes` | branche | GET /api/console/moi/descentes | → Descente[] | l’agent terrain ne voit que les siennes |
| `descente` | branche | GET /api/console/descentes/{id} | → Descente \| null |  |
| `avancer` | branche | POST /api/console/descentes/{id}/avancer {statut} (Idempotency-Key) | → {ok} |  |
| `mesSessions` | branche | GET /api/console/moi/sessions | → MesSessions | une ligne par appareil (sessions du kit), la courante repérée par son jeton ; essais refusés de son identifiant |
| `fermerAutresSessions` | branche | POST /api/console/moi/sessions/fermer-autres | → {fermees} (+ paire neuve gardée sur l’appareil) | jetons révoqués ; accès émis avant refusés (401 session_fermee) |
| `ouvrirVueClient` | branche | POST /api/console/vues/clients/{id}/apercu {motif} (Idempotency-Key) | → {jusqua} ; 400 motif_court ; 404 inconnu | lecture seule, journalisée (console.voir_comme_client), ADM-DEMASQUE-MIN |
| `vueClient` | branche | GET /api/console/vues/clients/{id}/apercu | → VueClient \| null | commandes du client (vendeurs, relais, total, paiement), zone, abonnement |
| `rapporter` | branche | POST /api/console/descentes/{id}/rapport {controles, photos, compteRendu, resultat} (Idempotency-Key) | → {ok} ; 400 incomplet | le résultat va au dossier lié (KYC, relais, litige) : journal à son nom |

### decisions (Décisions encadrées)

| Méthode | État | Route | Échange | Note |
|---|---|---|---|---|
| `file` | branche | GET /api/console/postes?genre=&tout=1 | → DossierCourt[] triés par échéance | sept genres : litige, kyc, remboursement, sanction, constat, kit, signalement ; lecture par genre (litiges.contenu, postes_genres.LIRE) ; tout=1 : la file entière (pages de 50 lues par le serveur) |
| `dossier` | branche | GET /api/console/postes/{genre}/{id} | → DossierPoste ; 404 → null | pièces (pont des preuves), contrôles calculés puis corrigés, issues permises, droits de l’agent |
| `controler` | branche | POST /api/console/postes/{genre}/{id}/controles {controle, etat} | → {ok} ; 422 code de refus du moteur (deja_decide, trop_tot, auteur, lie, hors_regle, lecture_seule…) ; motif_court → note_courte | journalisé |
| `noterAppel` | branche | POST /api/console/postes/{genre}/{id}/appels {avec, nom, resultat, resume, accord} | → {ok, id} ; 422 accord_hors_issues | l’appel devient une pièce |
| `decider` | branche | POST /api/console/postes/{genre}/{id}/decision {issue, montant, motif, note, message, appel} (Idempotency-Key) | → {ok, etat, id} (201 appliquée, 202 à contre-signer) ; 422 code de refus du moteur (deja_decide, trop_tot, auteur, lie, hors_regle, lecture_seule…) ; motif_court → note_courte | au-delà de REMB-CONTROLE-SEUIL : décision « poste-decision » à quatre yeux (Finance ou Direction) |
| `transmettre` | branche | POST /api/console/postes/{genre}/{id}/transmettre {raison, issueProposee} | → {ok, vers} |  |
| `prolonger` | branche | POST /api/console/postes/{genre}/{id}/prolonger {note} | → {ok, echeance} ; 409 prolongation_unique |  |
| `deciderLot` | branche | POST /api/console/postes/{genre}/lot {ids, issue, montant, motif, note, message} (Idempotency-Key) | → {ok, n} ; 422 lot_heterogene, lot_taille, lot_plafond | litiges identiques (même cause, même issue) |
| `ecarts` | branche | GET /api/console/postes/ecarts?tout=1 | → LigneEcart[] (Audit, Direction) | journal.tout |
