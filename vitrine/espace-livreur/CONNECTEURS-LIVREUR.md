# Connecteurs de l'espace livreur : de l'écran au serveur

## État du branchement (24 oct. 2026, branche `l/carte`)

- **137 méthodes** de la source (`src/donnees/source.ts`, 19 domaines) : **130 branchées**, 4 servies sur le téléphone
  (file hors connexion), **0 à créer côté serveur**, 0 partielle, 3 propres à la démonstration (gestes du relais et de
  l'entreprise simulés). Avant ce chantier : 136 méthodes — 125 branchées, 4 « serveur » (`tournee.prioriser`,
  `tournee.annoncerRetard`, `ramassage.recuperer`, `ramassage.colisManquant`), 4 téléphone, 3 démonstration.
- **Gestes de terrain** : les quatre routes existaient au kit (`livreur_tournee/gestes.py`) ; vérifiées et branchées
  (corps, refus, ordre imposé). **Contrôle C1** : le kit refusait « Non : sortir le produit » (boîte non scellée) que
  l'écran propose ; il accepte désormais les deux réponses et garde celle du livreur (`livraison_core/tournee.controler`).
- **Emploi** (DP-66) : `moi.emploi` → `GET /api/courier/me/employment` (suspension par l'entreprise, avertissements écrits,
  zones et horaires par jour, issue de l'essai, fin de contrat décidée par l'entreprise) ; le bandeau de la coque
  (`composants/BandeauEmploi.tsx`) le lit en mode API. Le livreur ne peut pas annuler une fin de contrat de son employeur
  (`decision_entreprise`). Les horaires fixés par l'entreprise (un créneau par jour) sont ceux de son planning.
- **Temps réel** (`src/api/temps-reel.ts`) : canal « notifications » de l'espace livreur (`POST /api/realtime/ticket`, flux
  SSE `GET /api/realtime/stream`, repli `GET /api/realtime/events`) ; un événement (paquet affecté, dépôt, décision)
  fait relire les écrans, au plus une fois par seconde. Après chaque écriture réussie (connexion comprise), les écrans
  relisent aussi (`src/api/outils.ts`, « blv:donnees »).
- **Zones v2** : noms des zones du livreur lus sur la carte des douze zones (registre pour les zones exploitées, carte v2
  sinon : `livreur_session/outils.nom_zone`).
- **Remise chez le vendeur** : un code par commande (le kit remet les colis de la commande dont le code est saisi) ;
  tant qu'un colis scellé de l'arrêt attend encore son code, l'écran du code revient (« n colis déjà remis ici »)
  au lieu d'afficher « Remise validée » (`pages/LIV-06/CodeRemise.tsx` ; un seul code par arrêt en démonstration :
  rien ne change pour elle).
- **Compte** : sécurité du compte branchée (PIN, biométrie, appareil unique, bascule de téléphone, données personnelles) ;
  en mode API, « Mon compte » montre le compte du serveur (nom, numéro masqué, entreprise) et mène aux réglages qui
  s'y font vraiment, sans aucune donnée de démonstration ; « Se connecter avec un e-mail » (kit « compte » de
  démonstration) n'est pas proposé : le numéro, le code SMS et le PIN sont la seule clé du livreur.
- **Vérifié** : tests du kit (`livreur_tournee`, `livreur_session`, `entreprise_flotte/tests/test_equipe.py` pour
  l'emploi vu du livreur) ; `src/api/connecteurs.test.ts` ; recette de bout en bout `npx playwright test -c pw-api.config.ts`
  (serveur d'essai 8040, base neuve `essai-livreur.sqlite3`, monde Yafé Express ; appli 5210 ; appareil photo simulé du
  navigateur) : 8 parcours — connexion à l'écran (code SMS lu par `/api/_essai/codes`, PIN créé), toutes les pages sans
  refus ni erreur, paquet affecté par l'entreprise arrivé par le temps réel, tournée à l'écran (démarrage, liste groupée
  photographiée, contrôle, audit s'il est tiré, étiquette, emballage, un code par commande), dépôt au relais (scan et
  résultats de la gérante, confirmation), gestes de terrain (retard, arrêt d'abord, colis pas prêt), emploi (bandeau,
  avertissement, fin de contrat non annulable par lui), zones v2 et compte.

### Ce qui reste au fournisseur réel (hors du kit) ou à un autre chantier

- **SMS** (codes de connexion), **téléphonie masquée** (appels), **cartographie** (trajets OSRM), **stockage des photos de
  preuve** : prestataires réels ; le serveur d'essai les simule.
- **« Mon compte »** (page ajoutée, `pages/LIV-10/MonCompte.tsx`) : il repose sur le kit « compte » partagé du site
  (`site/src/compte`, chantier du client), encore en démonstration : son adaptateur au serveur (photo, numéro, e-mail,
  lien de connexion par e-mail, Google) est à faire avec celui du client. La photo du livreur est son identité vérifiée
  (DP-67) : elle ne change que par une nouvelle photo demandée (`moi.envoyerPiece`, selfie).
- **Demande de congé par le livreur** (`/api/courier/holidays`, kit prêt) : aucun écran dans l'appli (le prototype a
  l'absence prévenue) ; les congés accordés par l'entreprise se lisent dans son planning (jour de repos).

### Routes à reporter dans `backend-kit/openapi.yaml` et les outils du kit

- **Nouvelle** : `GET /api/courier/me/employment`. **Modifiée** : `POST /api/courier/parcels/{id}/control` (boiteScellee
  vrai ou faux). Les routes de l'entreprise et de l'essai ajoutées par le même chantier : `espace-entreprise/CONNECTEURS-ENTREPRISE.md`.

Ce document dit, pour chaque méthode de la source de l'espace livreur (`src/donnees/source.ts`, 19 domaines), la route du
serveur qui la sert. Toutes les routes sont celles du kit (`backend-kit/apps/livreur_*`, socle
`backend-kit/apps/livraison_core`), sous **`/api/courier/`**, **sans barre finale** : elles remplacent `/api/shipping/*` de
relaya (aucune acceptation, aucun refus, aucune auto-affectation par le livreur ; transitions gardées ; aucun téléphone
exposé : RELAYA-EXISTANT.md § 6). Contrat : `backend-kit/openapi.yaml`, groupe « Espace livreur » (schémas
`Livreur_<domaine>_<Type>`).

## 1. Basculer de la démonstration au serveur

| Variable | Démonstration (défaut) | Serveur |
|---|---|---|
| `VITE_SOURCE` | `demo` (ou absente) | `api` |
| `VITE_API_URL` | inutile | `https://belivay.com/api` |

```
écrans ──► source (SourceLivreur, 19 domaines)
             ├─ demo : src/demo/source-demo.ts
             └─ api  : src/api/source-api.ts ──► src/api/domaines/<domaine>.ts ──► client HTTP du site
                                                                                   └──► /api/courier/… (kit livreur_*)
```

## 2. Conventions

- Connexion : numéro +237, code SMS, PIN (appareil unique, « blv_l_appareil ») ; jetons simplejwt écrits à l'ouverture.
- Chaque action métier porte son ORIGINE `{cle, heure, position}` (corps) et `Idempotency-Key = origine.cle` : la même
  action rejouée (double appui, file hors connexion) rend la même réponse sans refaire le geste ; l'heure du téléphone est
  gardée (jamais dans le futur ; après LIV-FILE-EXPIRATION-H, l'action est « tardive »).
- Hors connexion : la file vit sur le téléphone (`domaines/horsligne.ts`, localStorage) et part par
  `POST /api/courier/sync/batch` dans l'ordre de l'heure d'origine ; la version du serveur s'impose (conflits rendus). Une
  action mise en file par `geste()` sans son détail (code, étiquette, photo) est refusée au rejeu avec un motif lisible.
- Départ, absences, nouvelle photo (DP-67, moteurs `depart.py` et `absence.py`, portés dans `src/calculs/depart.ts` et
  `src/calculs/absence.ts`) : une absence faite sans réseau part par la file (`type: absence`), datée à la saisie ; le
  serveur juge le délai (PLANNING-PREVENIR-H, imprévus le jour même) sur `heure_de_saisie(origine.heure, réception,
  dernière synchronisation)`. `GET /me` rend la nouvelle photo (« reverification », `demandee.jusqua`, `photoBloquee`)
  et le départ (`affectationJusqua`, `kit`, `kitNonConteste`, `versement`), même accès fermé ; les deux SMS (clôture
  avec la date du dernier versement, versement fait) sont envoyés par le serveur, jamais par l'application.
- Preuves : la photo part d'abord (`POST /api/courier/media` : empreinte SHA-256, poids, netteté), l'action cite son
  identifiant ; preuve absente → `422 preuve_manquante`.
- Ordre des arrêts imposé, position refusée hors mission, lieu d'un domicile servi pour l'arrêt en cours seulement,
  jamais de code (vendeur, client) ni de valeur de colis ni de rémunération de l'entreprise.
- Gestes des autres interfaces (gérant du relais, agrégateur, entreprise, console) sur le serveur d'essai :
  `/api/_essai/livraison/…` (REPRISE-BACKEND.md § 12) ; dans l'application, ces méthodes `simuler…` sont « démonstration ».

## 3. Méthodes

<!-- connecteurs:debut -->

137 méthodes : **130 branchées**, 0 branchées en partie, 4 servies sur le téléphone, **0 à créer côté serveur**, 0 à finir côté écran, 3 propres à la démonstration (gestes d'une autre interface ou de la console).

### Session (14/14 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `session.session` | branché | GET /api/courier/session | → SessionLivreur | sans jeton : connecte false ; session de SESSION-H heures après la dernière ouverture |
| `session.ecranConnexion` | branché | GET /api/courier/auth/screen?appareil= | → EcranConnexion ; 400 appareil | identité si ce téléphone est lié à un compte ; jamais le numéro en clair |
| `session.saisirNumero` | branché | POST /api/courier/auth/phone {numero, appareil, origine} | → Resultat {bascule} numero_invalide \| sans_invitation \| autre_compte_sur_appareil \| refuse ; 400 appareil | compte sur un autre téléphone : avertissement d’abord, aucun code |
| `session.confirmerBascule` | branché | POST /api/courier/auth/switch {appareil, origine} | → Resultat rien_a_confirmer | code SMS ; au code bon, l’ancien téléphone est déconnecté et l’entreprise prévenue |
| `session.demanderCode` | branché | POST /api/courier/auth/otp/request {motif, appareil, origine} | → Resultat {renvoiPossibleA, envoisRestants} trop_tot \| trop_d_envois \| pas_de_numero | OTP-RENVOI : 60 s, 3 envois par heure |
| `session.verifierCode` | branché | POST /api/courier/auth/otp/verify {code, appareil, origine} | → Resultat {suite} code_faux \| code_annule \| code_expire \| aucun_code | sms_essais_code essais, puis le code est annulé |
| `session.creerPin` | branché | POST /api/courier/auth/pin {pin, appareil, origine} | → Resultat {suite} + jetons {access, refresh} pin_trop_simple \| code_requis | PIN haché par le serveur, jamais en clair |
| `session.verifierPin` | branché | POST /api/courier/auth/pin/verify {pin, appareil, origine} | → Resultat {suite} + jetons pin_faux \| bloque \| sms_obligatoire \| pas_de_session | PIN-ESSAIS faux : blocage PIN-BLOCAGE-MIN puis code SMS |
| `session.deverrouillerBiometrie` | branché | POST /api/courier/auth/biometric {appareil, origine} | → Resultat {suite} + jetons indisponible \| sms_obligatoire \| bloque | n’ouvre que l’application, jamais à la place d’un code |
| `session.securite` | branché | GET /api/courier/security | → Securite | appareil lié, 12 dernières ouvertures du journal d’authentification, empreinte ; jamais un PIN ni un code |
| `session.changerPin` | branché | POST /api/courier/auth/pin/change {ancien, nouveau, origine} (Idempotency-Key) | → Resultat pin_faux \| pin_trop_simple \| meme_pin \| bloque | l’ancien PIN compte dans PIN-ESSAIS ; nouveau PIN haché par le serveur |
| `session.reglerBiometrie` | branché | POST /api/courier/auth/biometric/setting {active, origine} (Idempotency-Key) | → Resultat | l’empreinte n’ouvre que l’application, jamais à la place d’un code SMS |
| `session.annulerCode` | branché | POST /api/courier/auth/otp/cancel {appareil} | → 204 |  |
| `session.deconnecter` | branché | POST /api/courier/logout {refresh, appareil} | → 204 | jetons effacés sur le téléphone quoi qu’il arrive |

### Accès (11/11 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `acces.activation` | branché | GET /api/courier/activation | → Activation ; 403 not_courier | pièces : statut et dates, jamais l’image |
| `acces.accepterCharte` | branché | POST /api/courier/activation/charter {version, origine} (Idempotency-Key) | → Resultat version_perimee | acceptation horodatée par le serveur |
| `acces.envoyerPiece` | branché | POST /api/courier/kyc/documents {piece, octets, controles, origine} (Idempotency-Key) | → Resultat qualite \| trop_lourde \| deja_verifiee ; 422 piece_inconnue | vérification automatique sous KYC-AUTO-MIN, revue humaine sous KYC-REVUE-H |
| `acces.certification` | branché | GET /api/courier/certification | → Certification | modules servis par le serveur ; la bonne réponse ne vient jamais au téléphone |
| `acces.lireCarte` | branché | POST /api/courier/certification/modules/{id}/cards {carte} | → 204 ; 404 not_found |  |
| `acces.terminerModule` | branché | POST /api/courier/certification/modules/{id}/done {origine} (Idempotency-Key) | → Resultat cartes_non_lues ; 404 not_found |  |
| `acces.reglerLectureVocale` | branché | PUT /api/courier/certification/voice {active} | → 204 | préférence du compte (lectureVocale) |
| `acces.commencerQuiz` | branché | POST /api/courier/certification/quiz/start {origine} (Idempotency-Key) | → Resultat {tentative} modules \| attente \| limite_jour \| certifie | CERT-QUIZ-N questions tirées au sort, réponses mélangées |
| `acces.envoyerQuiz` | branché | POST /api/courier/certification/quiz/{id}/submit {reponses, horsLigne, origine} (Idempotency-Key) | → Resultat {resultat} tentative_inconnue | corrigé par le serveur ; rendu hors connexion après son temps : en attente de validation |
| `acces.etatDuCompte` | branché | GET /api/courier/me/state | → EtatDuCompte |  |
| `acces.faireAppel` | branché | POST /api/courier/sanctions/{id}/appeal {texte, preuves, origine} (Idempotency-Key) | → Resultat {reponseAvant} hors_delai \| deja_fait \| sans_recours \| texte_trop_court \| numero_interdit | une fois, sous LIV-RECOURS-J jours |

### Aujourd’hui (1/1 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `aujourdhui.journee` | branché | GET /api/courier/today | → Journee ; 403 not_courier | maintenant, paquets du jour, tuiles (missions validées ; jamais un prix BelivaY → entreprise), alertes kit, pièces, certification ; la batterie est lue sur le téléphone |

### Disponibilité (5/5 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `disponibilite.lire` | branché | GET /api/courier/status | → EtatDisponibilite | preavisJusqua : départ demandé en cours, « hors service » sans point de Trust Score perdu (DP-67) |
| `disponibilite.planning` | branché | GET /api/courier/planning | → Planning | horaires prévus par l’entreprise sur 14 jours (lecture seule, DP-66), absences prévenues et règles (PLANNING-PREVENIR-H, ABSENCE-MAX-J, texte 120 caractères, imprévus) |
| `disponibilite.prevenirAbsence` | branché | POST /api/courier/absences {du, au, motif, texte, origine} (Idempotency-Key) | → Resultat {id, imprevu, apresDebut} date_passee \| dates_inversees \| motif \| trop_longue \| delai \| chevauche | une demande que l’entreprise voit (tâche et planning), jamais une modification du planning ; prévue PLANNING-PREVENIR-H avant le premier créneau, imprévu le jour même (après le début : acceptée, marquée) ; ABSENCE-MAX-J jours au plus ; hors connexion par la file, délai jugé sur l’heure de saisie (jamais dans le futur ni avant la dernière synchronisation) |
| `disponibilite.annulerAbsence` | branché | POST /api/courier/absences/{id}/cancel {origine} (Idempotency-Key) | → Resultat inconnue \| commencee |  |
| `disponibilite.changer` | branché | POST /api/courier/status {statut, pause?, origine} (Idempotency-Key) | → Resultat colis_sous_garde \| compte_non_actif ; 400 origine_requise ; 422 invalid | hors service refusé avec des colis sous garde (nombre) ; diffusé à l’entreprise (courier.status_changed) |

### Paquets (5/5 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `paquets.paquet` | branché | GET /api/courier/packages/{id} · GET /api/courier/packages/current | → Paquet ; 404 → null | sans id : le paquet en cours, sinon le prochain affecté ; valeur totale face au plafond du palier, jamais celle d’un colis |
| `paquets.marquerRelu` | branché | POST /api/courier/packages/{id}/read {version} | → 204 ; 404 not_found |  |
| `paquets.demarrer` | branché | POST /api/courier/packages/{id}/start {origine} (Idempotency-Key) | → Resultat kit_insuffisant \| deja_demarre \| a_relire \| autre_paquet_avant \| bloque \| retire ; 404 not_found |  |
| `paquets.impossible` | branché | POST /api/courier/packages/{id}/cannot-do {motif, origine} (Idempotency-Key) | → Resultat deja_ramasse \| non_rendable ; 422 invalid | avant le premier ramassage seulement : le paquet revient à l’entreprise ; après, incident |
| `paquets.telecharger` | branché | GET /api/courier/packages/{id}/offline-bundle | → Resultat {le} ; 404 not_found | jamais un code (vendeur, client) téléchargé |

### Kit (8/8 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `kit.lire` | branché | GET /api/courier/kit | → Kit | stock = reçu − lié − abîmé, jamais saisi ; couverture des paquets à venir |
| `kit.confirmerReception` | branché | POST /api/courier/kit/receipts {quantites, accessoires, premiereEtiquette, origine} (Idempotency-Key) | → Resultat plage_differente \| sans_remise ; 422 quantites | remise de l’entreprise confirmée ; un écart remonte à l’entreprise |
| `kit.demanderReassort` | branché | POST /api/courier/kit/restock-request {formats, paquetId, origine} (Idempotency-Key) | → Resultat deja_demande \| rien_a_demander |  |
| `kit.declarerAbimee` | branché | POST /api/courier/kit/damage {format, origine} (Idempotency-Key) | → Resultat plus_de_stock ; 422 format | au-delà de KIT-ABIME-SEUIL % dans la semaine : l’entreprise est alertée |
| `kit.declarerRouleauPerdu` | branché | POST /api/courier/kit/label-rolls/current/lost {origine} (Idempotency-Key) | → Resultat deja_perdu \| sans_rouleau | la plage est invalidée |
| `kit.lierEtiquette` | branché | POST /api/courier/kit/labels/{numero}/link {format, paquetId, origine} (Idempotency-Key) | → Resultat hors_plage \| deja_liee \| plage_perdue \| plus_de_stock ; 404 not_found | la liaison du ramassage à un colis est POST /api/courier/parcels/{id}/label |
| `kit.declarerRendu` | branché | POST /api/courier/kit/return {rendu, origine} (Idempotency-Key) | → Resultat ; 422 quantites |  |
| `kit.declarerMotifEcart` | branché | POST /api/courier/kit/gaps/{format} {motif, origine} (Idempotency-Key) | → Resultat sans_ecart ; 422 motif |  |

### Tournée (12/13 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `tournee.courante` | branché | GET /api/courier/rounds/current | → Tournee ; 404 → null | lieu d’un domicile servi pour l’arrêt en cours seulement, effacé POSITION-CLIENT-EFFACEE-MIN après la remise |
| `tournee.regles` | branché | GET /api/courier/rounds/rules | → ReglesLivreur | paramètres du registre |
| `tournee.itineraire` | branché | GET /api/courier/stops/{id}/route | → Itineraire ; 404 → null | arrêt en cours seulement |
| `tournee.arriver` | branché | POST /api/courier/stops/{id}/arrive {confirme?, origine} (Idempotency-Key) | → Resultat {route} ordre_impose \| ecart_position \| colis_manquants ; 409 state_changed |  |
| `tournee.signalerRoute` | branché | POST /api/courier/road-reports {note, origine} (Idempotency-Key) | → Resultat {jusqua} note_trop_courte | visible des livreurs de la zone pendant ROUTE-COUPEE-H ; numéros et liens retirés |
| `tournee.deposerPreuve` | branché | POST /api/courier/media {nature, objet, octets, empreinte, nette, origine} (Idempotency-Key) | → Resultat {id} floue \| trop_lourde ; 422 invalid | avant l’action qui la cite |
| `tournee.joignables` | branché | GET /api/courier/calls/contacts | → Joignable[] | parties de l’arrêt en cours, entreprise, support |
| `tournee.appels` | branché | GET /api/courier/calls | → Appel[] | métadonnées seulement, jamais un numéro |
| `tournee.appeler` | branché | POST /api/courier/calls {correspondant, mode, modele?, origine} (Idempotency-Key) | → Resultat {appel} hors_mission ; 422 invalid |  |
| `tournee.raccrocher` | branché | POST /api/courier/calls/{id}/hangup {origine} (Idempotency-Key) | → Resultat ; 404 not_found |  |
| `tournee.prioriser` | branché | POST /api/courier/stops/{id}/first {origine} (Idempotency-Key) | → Resultat {ordre} ramassage_avant \| sur_place \| deja_en_cours \| termine & {avant?} | terrain : l’arrêt passe en cours, les autres suivent ; jamais une remise avant le ramassage de ses colis ; l’entreprise est prévenue (stop.reordered) |
| `tournee.annoncerRetard` | branché | POST /api/courier/stops/{id}/delay {minutes, origine} (Idempotency-Key) | → Resultat {arriveeEstimee} hors_mission ; 422 invalid | arrêt en cours seulement ; nouvelle heure au client (domicile), au vendeur et à l’entreprise (stop.delayed) |
| `tournee.simulerValidationIncident` | démonstration seulement | portail de l’entreprise (incident.updated) |  | l’entreprise décide : POST /api/company/incidents/{id}/decision |

### Ramassage (14/14 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `ramassage.ramassage` | branché | GET /api/courier/stops/{id}/pickup | → Ramassage ; 404 → null | article tel que la fiche le décrit, jamais son prix |
| `ramassage.relancer` | branché | POST /api/courier/stops/{id}/remind {origine} (Idempotency-Key) | → Resultat deja_relance ; 409 order_imposed |  |
| `ramassage.pasPret` | branché | POST /api/courier/stops/{id}/not-ready {origine} (Idempotency-Key) | → Resultat trop_tot ; 409 order_imposed |  |
| `ramassage.boutiqueFermee` | branché | POST /api/courier/stops/{id}/shop-closed {photo, note, origine} (Idempotency-Key) | → Resultat note_trop_courte ; 422 preuve_manquante ; 409 order_imposed |  |
| `ramassage.controler` | branché | POST /api/courier/parcels/{id}/control {cases, boiteScellee, photo1, classeDepassee, serieIllisible, origine} (Idempotency-Key) | → Resultat {suite} cases_incompletes \| photo_manquante ; 409 arrivee_manquante |  |
| `ramassage.auditer` | branché | POST /api/courier/parcels/{id}/audit {verifs, photos, origine} (Idempotency-Key) | → Resultat {suite} incomplet ; 409 state_changed |  |
| `ramassage.lierEtiquette` | branché | POST /api/courier/parcels/{id}/label {numero, origine} (Idempotency-Key) | → Resultat {numero} deja_liee \| hors_plage \| illisible ; 409 state_changed |  |
| `ramassage.emballer` | branché | POST /api/courier/parcels/{id}/seal {format, motifFormat, scelle, photo2, origine} (Idempotency-Key) | → Resultat etiquette_manquante \| scelle_incomplet \| motif_manquant ; 422 preuve_manquante |  |
| `ramassage.emballageManquant` | branché | POST /api/courier/parcels/{id}/packaging-missing {origine} (Idempotency-Key) | → Resultat |  |
| `ramassage.validerCode` | branché | POST /api/courier/stops/{id}/handover-code {code, origine} (Idempotency-Key) | → Resultat {garde} code_faux \| bloque \| controle_incomplet ; 409 order_imposed | photo 1 ∧ photo 2 ∧ étiquette ∧ code : la garde passe à l’entreprise |
| `ramassage.refuser` | branché | POST /api/courier/parcels/{id}/refuse {motif, photo, note, origine} (Idempotency-Key) | → Resultat {dossier} note_trop_courte \| photo_manquante ; 422 invalid |  |
| `ramassage.corrigerSurPlace` | branché | POST /api/courier/parcels/{id}/correct {origine} (Idempotency-Key) | → Resultat ; 409 state_changed |  |
| `ramassage.recuperer` | branché | POST /api/courier/parcels/{id}/collected {par, photo, origine} (Idempotency-Key) | → Resultat photo_manquante \| inconnu ; 409 order_imposed ; 422 invalid | liste groupée du vendeur : une photo par colis gardée (R66), la première reste la preuve ; sur place à l’arrêt en cours (livreur_tournee.gestes.recuperer) |
| `ramassage.colisManquant` | branché | POST /api/courier/parcels/{id}/missing {choix, origine} (Idempotency-Key) | → Resultat {jusqua?} inconnu ; 409 order_imposed ; 422 invalid | attendre (ATTENTE-VENDEUR-MIN) ou partir avec les autres (colis retiré du paquet ; entreprise, vendeur et client prévenus ; BelivaY décide du repassage) |

### Remises (18/20 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `remises.depotRelais` | branché | GET /api/courier/stops/{id}/relay-drop | → DepotRelais ; 404 → null | qr : arrêt en cours, sur place, avant la confirmation |
| `remises.accepterConstat` | branché | POST /api/courier/stops/{id}/relay-drop/parcels/{colis}/accept-report {origine} (Idempotency-Key) | → Resultat ; 409 order_imposed |  |
| `remises.confirmerDepot` | branché | POST /api/courier/stops/{id}/relay-drop/confirm {origine} (Idempotency-Key) | → Resultat colis_sans_resultat \| non_scanne \| constat_a_accepter \| lot_non_valide ; 409 order_imposed |  |
| `remises.relaisFerme` | branché | POST /api/courier/stops/{id}/relay-closed {photo, origine} (Idempotency-Key) | → Resultat ; 422 preuve_manquante |  |
| `remises.registrePapier` | branché | POST /api/courier/stops/{id}/paper-register {photo, origine} (Idempotency-Key) | → Resultat ; 422 preuve_manquante |  |
| `remises.domicile` | branché | GET /api/courier/stops/{id}/home | → RemiseDomicile ; 404 → null | prénom et quartier ; repère pendant l’arrêt en cours ; jamais le code du client |
| `remises.livrerDomicile` | branché | POST /api/courier/stops/{id}/home/deliver {code, photo, porteur?, origine} (Idempotency-Key) | → Resultat {ecartM} code_faux \| bloque ; 422 preuve_manquante ; 409 order_imposed |  |
| `remises.constat` | branché | POST /api/courier/stops/{id}/home/report {photos, note, origine} (Idempotency-Key) | → Resultat note_trop_courte |  |
| `remises.preuvesEchec` | branché | GET /api/courier/stops/{id}/home/fail-proofs | → PreuvesEchec | mesurées par le serveur |
| `remises.echecDomicile` | branché | POST /api/courier/stops/{id}/home/fail {motif, photo, note, origine} (Idempotency-Key) | → Resultat {suite} preuves_incompletes \| note_trop_courte ; 422 invalid |  |
| `remises.collecte` | branché | GET /api/courier/stops/{id}/departures | → Collecte ; 404 → null |  |
| `remises.confirmerDepart` | branché | POST /api/courier/stops/{id}/departures/{colis}/confirm {origine} (Idempotency-Key) | → Resultat non_presente |  |
| `remises.photoScelle` | branché | POST /api/courier/stops/{id}/departures/{colis}/seal-photo {photo, origine} (Idempotency-Key) | → Resultat ; 422 preuve_manquante |  |
| `remises.departManquant` | branché | POST /api/courier/stops/{id}/departures/{colis}/missing {origine} (Idempotency-Key) | → Resultat |  |
| `remises.terminerCollecte` | branché | POST /api/courier/stops/{id}/departures/confirm {origine} (Idempotency-Key) | → Resultat colis_a_traiter |  |
| `remises.retour` | branché | GET /api/courier/stops/{id}/return | → RetourVendeur ; 404 → null | jamais le code de réception du vendeur |
| `remises.remettreRetour` | branché | POST /api/courier/stops/{id}/return/deliver {code, photo, origine} (Idempotency-Key) | → Resultat code_faux \| bloque ; 422 preuve_manquante |  |
| `remises.retourImpossible` | branché | POST /api/courier/stops/{id}/return/vendor-absent {raison, photo, origine} (Idempotency-Key) | → Resultat {relais} ; 422 preuve_manquante |  |
| `remises.simulerScanRelais` | démonstration seulement | application du relais (relay.drop.scanned, item_result) |  | serveur d’essai : livraison_core.tournee.relais_scanner(arret, code) · relais_resultat(arret, etiquette, resultat) |
| `remises.simulerPresentation` | démonstration seulement | application du relais (départs présentés) |  | serveur d’essai : livraison_core.tournee.relais_presenter(colis) |

### Incidents (4/4 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `incidents.catalogue` | branché | GET /api/courier/incidents/catalogue | → CatalogueIncidents |  |
| `incidents.liste` | branché | GET /api/courier/incidents | → Incident[] | plus les incidents en file sur le téléphone (état en_file) |
| `incidents.incident` | branché | GET /api/courier/incidents/{id} | → Incident ; 404 → null |  |
| `incidents.declarer` | branché | POST /api/courier/incidents {famille, type, note, photos, arretId, origine} (Idempotency-Key) | → Resultat {id} note_trop_courte \| photos_manquantes \| type_inconnu ; 409 hors_mission | photos : identifiants des preuves déposées d’abord par l’écran (POST media, nature incident). Hors connexion : photos et incident mis en file dans l’ordre, identifiants provisoires remplacés par le serveur |

### Hors connexion (7/7 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `horsligne.file` | sur le téléphone (sans route) | — | → FileHorsLigne | file locale du téléphone (localStorage), aucune route |
| `horsligne.regles` | branché | GET /api/courier/sync/rules | → ReglesEnvoi |  |
| `horsligne.mettreEnFile` | sur le téléphone (sans route) | — | → ActionEnFile | heure et position d’origine gardées ; la charge du geste devient sa requête exacte {chemin, corps}, envoyée par le lot ; jamais d’action « vider la file » |
| `horsligne.envoyerFile` | branché | POST /api/courier/sync/batch {actions: [{type, objet, origine, corps?, requete?}]} | → {a, envoyees, refusees, resultats, conflits, heureServeur} | ordre chronologique ; même service que la route du geste ; détail manquant : refusée avec un motif lisible ; la version du serveur s’impose |
| `horsligne.relancer` | branché | POST /api/courier/sync/batch {actions} | → Resultat hors_ligne \| introuvable | reçu « en retard », jamais effacé |
| `horsligne.conflitVu` | sur le téléphone (sans route) | — | → void | file locale du téléphone |
| `horsligne.noterReseau` | sur le téléphone (sans route) | — | → void | file locale du téléphone |

### Journée (3/3 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `journee.controle` | branché | GET /api/courier/day/closure-check | → ControleCloture | colis sous garde et incident bloquant : clôture refusée ; preuves manquantes : « preuves à envoyer » |
| `journee.cloturer` | branché | POST /api/courier/day/close {kit, enLigne, origine} (Idempotency-Key) | → Resultat blocages \| ecart_sans_motif \| photo_manquante \| deja_cloturee | kit rendu au point de stockage ; statut hors service ; bilan à l’entreprise |
| `journee.deposerAuStockage` | branché | POST /api/courier/custody/storage-drop {origine} (Idempotency-Key) | → Resultat {colis} tournee_en_cours \| rien_a_deposer |  |

### Historique (3/3 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `historique.liste` | branché | GET /api/courier/history?from=&to= | → Historique ; 422 jour | LIV-PREUVES-VISIBLES-J jours ; après la remise : numéro de commande et zone seulement |
| `historique.mission` | branché | GET /api/courier/history/{id} | → DetailMission ; 404 → null | étapes : heure du téléphone et heure du serveur ; dossier sans identité du client ni montant |
| `historique.rechercher` | branché | GET /api/courier/history/search?label= | → MissionResume[] | numéro complet ou ses 4 derniers chiffres |

### Activité (2/2 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `activite.activite` | branché | GET /api/courier/activity?period= | → Activite | gains = tarif par mission de l’entreprise s’il est fixé, sinon le compteur ; jamais le prix BelivaY → entreprise |
| `activite.releves` | branché | GET /api/courier/activity/statements | → Releves | semaines du samedi au vendredi (8 au plus), missions validées seulement ; gains seulement si l’entreprise affiche son tarif |

### Trust Score (2/2 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `trust.trust` | branché | GET /api/courier/trust | → TrustLivreur | jamais le score d’un autre livreur |
| `trust.contester` | branché | POST /api/courier/trust/events/{id}/contest {motif, note, enLigne, origine} (Idempotency-Key) | → Resultat hors_delai \| deja_conteste \| note_trop_courte \| non_contestable ; 422 motif | une fois, sous LIV-TSC-CONTESTATION-J jours ; effet suspendu dès la réception |

### Messages (7/7 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `messages.fils` | branché | GET /api/courier/threads | → Fil[] | fils de mission fermés LIV-FIL-FERMETURE-H après la mission ; jamais un nom de client |
| `messages.fil` | branché | GET /api/courier/threads/{id}/messages | → FilOuvert ; 404 → null |  |
| `messages.marquerLu` | branché | POST /api/courier/threads/{id}/read | → 204 |  |
| `messages.envoyer` | branché | POST /api/courier/threads/{id}/messages {texte, enLigne, origine} (Idempotency-Key) | → Resultat {masque} fil_ferme \| vide ; 404 not_found | numéros et liens masqués par le serveur ; heure d’origine gardée hors connexion |
| `messages.signaler` | branché | POST /api/courier/threads/{id}/report {messageId, origine} (Idempotency-Key) | → Resultat deja_signale ; 404 not_found | revue du support |
| `messages.appeler` | branché | POST /api/courier/threads/{id}/call {origine} (Idempotency-Key) | → Resultat {appel} fil_ferme \| pas_encore \| hors_horaires \| indisponible | {id} : le fil, ou « entreprise » / « support » ; jamais un numéro |
| `messages.raccrocher` | branché | POST /api/courier/threads/calls/{id}/end {fin} | → 204 |  |

### Notifications (3/3 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `notifications.liste` | branché | GET /api/courier/notifications | → Notification[] | rubriques dans l’ordre fixe sécurité, tournée, compte, messages ; jamais un code ni un numéro |
| `notifications.marquerLue` | branché | POST /api/courier/notifications/{id}/read | → 204 | accusé de lecture vu par l’entreprise |
| `notifications.toutMarquerLu` | branché | POST /api/courier/notifications/read-all | → 204 |  |

### Moi (10/10 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `moi.profil` | branché | GET /api/courier/me | → Profil | numéro du livreur masqué ; accès restreint si une pièce exigée ou la certification a expiré ; nouvelle photo demandée : état « reverification », demandee.jusqua (PHOTO-REVERIF-J), photoBloquee passé le délai ; départ : affectationJusqua, kit (constat, manquants, retenue, constatJusqua, contestation), kitNonConteste, versement (DernierVersement, estimé pendant le préavis, figé à la clôture) ; lisible même accès fermé |
| `moi.emploi` | branché | GET /api/courier/me/employment | → EmploiVu | DP-66 : suspension par son entreprise (motif, date de fin), avertissements écrits (rang, motif), zones et horaires de travail (un créneau par jour), issue de l’essai (confirmé, prolongé, rompu), fin de contrat décidée par l’entreprise (motif, préavis) ; il voit, il ne décide pas |
| `moi.envoyerPiece` | branché | POST /api/courier/documents/{id} {recto, verso, expireLe, origine} (Idempotency-Key) | → Resultat photo_manquante \| date_passee \| non_demandee ; 422 piece_inconnue | seulement une pièce renvoyable (refusée, demandée par l’entreprise, expirée ou bientôt) ; le selfie demandé passe par ici |
| `moi.preferences` | branché | GET /api/courier/me/preferences | → PreferencesCompte |  |
| `moi.reglerPreference` | branché | PATCH /api/courier/me/preferences {langue?, lectureVocale?, envoiPhotos?, enLigne, origine} (Idempotency-Key) | → Resultat ; 422 langue \| envoi_photos |  |
| `moi.demanderDepart` | branché | POST /api/courier/company/leave {motif, texte?, origine} (Idempotency-Key) | → Resultat {preavisJusqua} deja_demande \| motif_inconnu | aucun effet immédiat ; l’entreprise est prévenue (tâche, file « Départs ») ; préavis DEPART-PREAVIS-J : il travaille normalement, paquets jusqu’à la veille du dernier jour, hors service sans point de Trust Score perdu ; clôture par l’entreprise (même avant la fin du préavis, conditions remplies), ou l’administrateur après le préavis ; SMS à la clôture (date du dernier versement) et au versement fait |
| `moi.annulerDepart` | branché | POST /api/courier/company/leave/cancel {origine} (Idempotency-Key) | → Resultat aucune_demande \| deja_close |  |
| `moi.contesterKit` | branché | POST /api/courier/company/leave/kit-contest {motif, origine} (Idempotency-Key) | → Resultat aucune_retenue \| deja_contestee \| motif | retenue du kit incomplet (plafonnée à KIT-VALEUR-F) contestée pendant le préavis ou après la clôture, même accès fermé ; BelivaY décide, le montant est mis de côté d’ici là ; l’entreprise est prévenue |
| `moi.demanderCodeDonnees` | branché | POST /api/courier/privacy/code | → Resultat {renvoiPossibleA} trop_tot \| trop_d_envois |  |
| `moi.demanderDonnees` | branché | POST /api/courier/privacy/requests {type, code, origine} (Idempotency-Key) | → Resultat code_faux \| deja_demande | export ou effacement préparé par la console |

### Aide (5/5 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `aide.aide` | branché | GET /api/courier/help/articles | → Aide | numéros d’urgence du pays (emergency_numbers) ; support : SUP-WA, SUP-HORAIRES, SUP-DELAI |
| `aide.sosEnCours` | branché | GET /api/courier/sos | → EtatSOS ; 404 → null | arrêt automatique à la fin du partage (LIV-SOS-POSITION-MIN) |
| `aide.sos` | branché | POST /api/courier/sos {enLigne, origine} (Idempotency-Key) | → Resultat {id} deja_en_cours | entreprise appelée puis le support ; entreprise prévenue en priorité critique |
| `aide.positionSOS` | branché | POST /api/courier/sos/{id}/position {lat, lng, precisionM} | → 204 ; 404 not_found | une position toutes les SOS-POSITION-S secondes |
| `aide.arreterSOS` | branché | POST /api/courier/sos/{id}/stop {origine} (Idempotency-Key) | → Resultat deja_arrete ; 404 not_found |  |

<!-- connecteurs:fin -->
