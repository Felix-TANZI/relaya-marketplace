# Connecteurs de l'espace entreprise : de l'écran au serveur

## État du branchement (24 oct. 2026, branche `l/carte`)

- **165 méthodes** de la source (`src/donnees/source.ts`, 26 domaines) : **163 branchées**, 0 partielle, **0 à créer côté
  serveur**, 2 propres à la démonstration (changer de rôle, scénario de la console). Avant ce chantier : 150 branchées,
  13 « serveur » (équipe × 12, `missions.noterAppel`), 2 démonstration.
- **Équipe** (droits d'employeur, DP-66, DP-67) : routes du kit `/api/company/staff…` à la forme de l'écran
  (`backend-kit/apps/entreprise_flotte/equipe.py`, `vues_equipe.py`), sur les modèles et services des droits d'employeur
  (`employeur.py` : contrat, essai, avertissements, congés, horaires, fin de contrat par le départ du socle). Ajouts au
  kit : prolongation de l'essai une fois (même durée), casier judiciaire (date de réception seulement), horaires par jour
  (`HoraireLivreur.creneaux`, suivis par le planning du livreur), annulation d'une fin de contrat pendant le préavis.
  Droits (moindre privilège, comme `src/config/droits.ts`) : décisions d'emploi au propriétaire et au gérant (motif
  écrit), horaires et zones aussi au répartiteur, attestation aussi au comptable ; aucun motif disciplinaire pour le
  répartiteur ni le comptable ; retenue du kit visible du propriétaire et du comptable seulement. Alignés au kit : fin
  de contrat ouverte au gérant (`droits.contrat.terminer`), le gérant a les droits du répartiteur sur les routes de
  l'exploitation (`livraison_core.acces`), comme l'écran (`rolePermis`).
- **Appel masqué** : `POST /api/company/calls/{id}/note` (note gardée à part, `entreprise_operations.NoteAppel`), rendue par
  `GET …/missions/{id}/calls`.
- **Mon compte** (`src/donnees/mon-compte.ts` → `src/api/mon-compte.ts`, kit `entreprise_session/mon_compte.py`) : photo de
  profil (≤ 300 Ko) et couverture de l'entreprise (propriétaire, ≤ 450 Ko), nom confirmé par un code SMS au numéro de
  l'accès, nouveau numéro et nouvelle adresse confirmés par un code envoyé au NOUVEAU canal (trois codes faux : perdu ;
  un code par minute : « trop_tot »), alertes de sécurité (l'ancien canal est prévenu ; mot de passe changé dans
  Paramètres), Google (prise prête : « indisponible » tant que le vérificateur d'identité du kit n'est pas configuré),
  appareil qui se souvient de la personne (gardé au serveur), lien de connexion par e-mail (usage unique, sans
  énumération ; il remplace le mot de passe, jamais le code SMS ; `?lien=` sur la page de connexion).
- **Temps réel** (`src/api/temps-reel.ts`) : canal « flotte » du kit (`POST /api/realtime/ticket`, flux SSE
  `GET /api/realtime/stream`, repli `GET /api/realtime/events`) ; un événement fait relire les écrans, au plus une fois
  par seconde. Après chaque écriture réussie, les écrans relisent aussi (`src/api/outils.ts`, « blv:donnees »).
- **Zones v2** : la table quartier → zone du kit est celle qui fait foi (`livraison_core/donnees/quartiers-zones.json`,
  copie de `logique-metier/livraison/quartiers-zones.json` : 117 quartiers, Z1–Z12) ; la carte des douze zones se lit
  aussi sans session (écran de connexion).
- **Vérifié** : tests du kit (`entreprise_flotte/tests/test_equipe.py`, `entreprise_session/tests/test_mon_compte.py`,
  `livraison_core/tests/test_zones.py`, note d'appel dans `entreprise_operations`) ; `src/api/connecteurs.test.ts` ;
  recette de bout en bout `npx playwright test -c pw-api.config.ts` (serveur d'essai 8030, base neuve
  `essai-entreprise.sqlite3`, monde Yafé Express `POST /api/_essai/entreprise/monde` ; appli 5200) : 12 parcours —
  connexion à l'écran (code SMS lu par `/api/_essai/codes`), toutes les pages pour les quatre rôles (aucun refus, aucun
  5xx, aucune méthode non branchée), paquet accepté et affecté à l'écran puis appel masqué noté, temps réel, équipe à
  l'écran (gérant), moindre privilège (répartiteur, comptable), Mon compte, lien de connexion, zones v2.

### Ce qui reste au fournisseur réel (hors du kit)

- **SMS et e-mails** : prestataire réel des codes et des liens (le serveur d'essai les garde en mémoire).
- **Téléphonie masquée** : prestataire de la ligne BelivaY (appel, durée) ; le kit en garde les métadonnées.
- **Google** (Mon compte) : vérificateur d'identité à configurer (`apps.client_accounts.identite`).
- **Stockage des fichiers** (photo, couverture, pièces du contrat) : stockage du kit (`client_core.stockage`), à régler en
  production ; relevés PDF : texte du serveur (pas encore un PDF mis en page).
- **Versements Mobile Money** : agrégateur (paiements hors du serveur sûr) ; le kit arrête les relevés et les montants.

### Routes à reporter dans `backend-kit/openapi.yaml` et les outils du kit

`openapi.yaml`, `outils/*` et `_essai/config/*` n'ont pas été modifiés ; `livraison_core/tests/test_contrat_livraison.py`
(chaque route au contrat) attend leur régénération.

- **Nouvelles** : `GET /api/company/staff`, `GET /api/company/staff/{id}`, `POST /api/company/staff/{id}/probation`,
  `POST /api/company/staff/{id}/warnings`, `PUT /api/company/staff/{id}/schedule`, `PUT /api/company/staff/{id}/zones`,
  `POST /api/company/staff/{id}/leaves`, `POST /api/company/staff/{id}/leaves/{conge}/cancel`,
  `PUT /api/company/staff/{id}/record-check`, `POST /api/company/staff/{id}/termination`,
  `POST /api/company/staff/{id}/termination/cancel`, `GET /api/company/staff/{id}/certificate` ;
  `POST /api/company/calls/{appel}/note` ; `GET /api/company/me/account`, `POST /api/company/me/account/name/code`,
  `POST /api/company/me/account/name`, `POST /api/company/me/account/phone/code`, `POST /api/company/me/account/email/code`,
  `POST /api/company/me/account/phone`, `POST /api/company/me/account/email`, `POST /api/company/me/account/photo`,
  `POST /api/company/me/account/google`, `POST /api/company/me/account/google/remove`,
  `POST /api/company/me/account/google/sync`, `POST /api/company/me/device`, `POST /api/company/profile/cover`,
  `POST /api/company/auth/link`, `POST /api/company/auth/link/open`, `GET /api/company/auth/device`,
  `POST /api/company/auth/device/forget` ; essai : `POST /api/_essai/entreprise/monde`, `POST /api/_essai/entreprise/paquets`,
  `POST /api/_essai/entreprise/conge`, `GET /api/_essai/entreprise/lien`.
- **Modifiées** : `GET /api/company/zones/map` (publique : sans session, aucune zone déclarée) ;
  `GET /api/company/zones/neighbourhoods` (117 quartiers de la carte v2) ; `GET /api/company/missions/{id}/calls` (champ
  `note`) ; `POST /api/company/couriers/{id}/contract/end` (gérant admis) ; routes de l'exploitation (gérant admis comme
  le répartiteur) ; `POST /api/company/me/password` (date et alerte de Mon compte).
- **Migrations** : `entreprise_flotte/0003_equipe`, `entreprise_operations/0002_note_appel`, `entreprise_session/0003_mon_compte`.

Ce document dit, pour chaque méthode de la source de l'espace entreprise (`src/donnees/source.ts`, 26 domaines), la route
du serveur qui la sert. Toutes les routes sont celles du kit (`backend-kit/apps/entreprise_*`, socle
`backend-kit/apps/livraison_core`), sous **`/api/company/`**, **sans barre finale** : elles remplacent
`/api/auth/delivery-organization/*` de relaya (RELAYA-EXISTANT.md § 6). Contrat : `backend-kit/openapi.yaml`, groupe
« Espace entreprise de livraison » (schémas `Entreprise_<domaine>_<Type>`).

## 1. Basculer de la démonstration au serveur

| Variable | Démonstration (défaut) | Serveur |
|---|---|---|
| `VITE_SOURCE` | `demo` (ou absente) | `api` |
| `VITE_API_URL` | inutile | `https://belivay.com/api` (ou `/api` derrière un mandataire, même origine) |

```
écrans ──► source (SourceEntreprise, 26 domaines)
             ├─ demo : src/demo/source-demo.ts
             └─ api  : src/api/source-api.ts ──► src/api/domaines/<domaine>.ts ──► client HTTP du site (site/src/api/client.ts)
                                                                                   └──► /api/company/… (kit entreprise_*)
```

## 2. Conventions

- Réponses : exactement les types des domaines (`src/donnees/domaines/*.ts`) : champs camelCase, instants en ms, montants
  en francs entiers calculés par les moteurs (`moteurs/belivay_moteurs` : livraison, paquets, trust_livraison).
- Connexion : identifiant (+237 ou e-mail) et mot de passe, code SMS (propriétaire et comptable toujours, répartiteur sur
  un appareil nouveau) ; les jetons simplejwt rendus à la connexion sont écrits par `domaines/session.ts` ; l'appareil
  (« blv_e_appareil ») est vérifié à chaque appel (session de duree_session heures, appareil déconnecté → 401).
- Rôles (ENT-RG-R25) : `403 role_forbidden {roles}` devient `AccesRefuse(quoi, roles)` (`src/api/outils.ts`) ; le
  répartiteur ne reçoit aucun montant (null). Un refus attendu (`Resultat`) est un `200 {ok: false, raison}` ; « T | null »
  introuvable : `404` → null. Créations : `Idempotency-Key`.
- Le paquet est publié à l'entreprise, qui l'accepte (premier arrivé) et l'affecte à SON livreur ; machine MISSION stricte
  (`409 state_changed`). Les appels vers un livreur passent par une ligne masquée (jamais un vrai numéro).
- Gestes de la console BelivaY et des autres interfaces sur le serveur d'essai : `/api/_essai/livraison/…`
  (REPRISE-BACKEND.md § 12).

## 3. Méthodes

<!-- connecteurs:debut -->

165 méthodes : **163 branchées**, 0 branchées en partie, **0 à créer côté serveur**, 0 à finir côté écran, 2 propres à la démonstration (gestes d'une autre interface ou de la console).

### Session (9/10 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `session.session` | branché | GET /api/company/session | → SessionEntreprise | sans jeton : connecte false ; badges réels (paquets visibles, missions, incidents, litiges, non lus) ; au-delà de duree_session : connecte false, expiree true |
| `session.connecter` | branché | POST /api/company/auth/login {identifiant, motDePasse, appareil} | → ResultatConnexion + jetons {access, refresh} | numéro +237 ou e-mail ; echecs_avant_blocage puis duree_blocage (propriétaire prévenu) ; code SMS : propriétaire et comptable toujours, répartiteur sur un appareil nouveau |
| `session.verifierCode` | branché | POST /api/company/auth/verify {defi, code} | → ResultatCode + jetons | ENT-CODE-SMS-LONGUEUR chiffres ; au bout des essais le défi tombe et la connexion se bloque |
| `session.renvoyerCode` | branché | POST /api/company/auth/verify/resend {defi} | → ResultatRenvoi | delai_renvoi_code_sms ; ENT-RENVOIS-AVANT-SUPPORT renvois puis support |
| `session.oublie` | branché | POST /api/company/auth/password/forgot {identifiant} | → EnvoiCode | même réponse que le compte existe ou non (un e-mail ne montre jamais de chiffres) |
| `session.reinitialiser` | branché | POST /api/company/auth/password/reset {defi, code, motDePasse} | → ResultatReinitialisation | MDP-LONG ; toutes les sessions révoquées |
| `session.invitation` | branché | GET /api/company/auth/invitations/{jeton} | → InvitationAcces ; 404 → null |  |
| `session.creerAcces` | branché | POST /api/company/auth/invitations/{jeton} {motDePasse, appareil} | → {ok, defi, destination, renvoiDans} \| {ok: false, raison: expiree\|utilisee\|mot_de_passe} | usage unique ; le code SMS confirme le numéro, verifierCode ouvre la session |
| `session.deconnecter` | branché | POST /api/company/auth/logout {refresh} | → {ok} | jetons effacés sur l’appareil quoi qu’il arrive |
| `session.changerRole` | démonstration seulement | démonstration : voir l’espace avec un autre rôle |  | en production, chaque utilisateur se connecte avec son accès nominatif |

### Compte (3/4 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `compte.etat` | branché | GET /api/company/account/state | → EtatDuCompte | motif, niveau, dates, effets (zones, plafond, publication), pilote, préavis, lecture seule, colis à terminer, journal account.state_changed |
| `compte.faireRecours` | branché | POST /api/company/account/appeal {texte} (Idempotency-Key) | → Resultat<object, non_permis\|deja_utilise\|texte> ; 403 role_forbidden | propriétaire ; une fois par décision (restreint, suspendu avec motif) ; fil ouvert avec BelivaY |
| `compte.activite` | branché | GET /api/company/activity | → LigneActivite[] | journal signé des gestes de l’entreprise (DED-17), le plus récent d’abord, sans montant |
| `compte.scenario` | démonstration seulement | démonstration : état posé par la console |  | serveur d’essai : entreprise_session.services.decider_etat(entreprise, etat, motif, niveau, jusqua, par) |

### Tableau (1/1 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `tableau.tableau` | branché | GET /api/company/dashboard | → TableauDeBord | à faire trié par échéance selon le rôle (rien pour le comptable) ; genres DP-66/67 : depart, depart_echu, absence, kit_a_constater (préavis échu, kit pas constaté, délai pas passé ; échéance constatJusqua), versement_a_faire (propriétaire ; départ clos, vendredi du versement arrivé, pas marqué fait), route livreur {id} ; aVerserVendredi null pour le répartiteur (relevé du vendredi) ; guide d’activation en configuration |

### Contrat (6/6 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `contrat.contrat` | branché | GET /api/company/contract | → {versions, pieces} | pièce d’identité du gérant rendue au propriétaire seulement ; assurance des véhicules calculée véhicule par véhicule |
| `contrat.accepter` | branché | POST /api/company/contract/{id}/accept (Idempotency-Key) | → Resultat<object, statut> ; 403 role_forbidden | propriétaire ; la version signée remplace la précédente du même genre |
| `contrat.fiche` | branché | GET /api/company/profile | → FicheEntreprise |  |
| `contrat.modifierFiche` | branché | PATCH /api/company/profile {nomLegal?, rccm?, niu?, responsable?, adresse?, agence?, stockageNuit?, telephone?} | → Resultat<{enVerification}, vide\|telephone> ; 403 role_forbidden | propriétaire ; nom légal, RCCM, NIU repassent en vérification (ENT-P03R-02) |
| `contrat.envoyerPiece` | branché | POST /api/company/compliance/pieces/{type} {nom, taille, type, lisible} (Idempotency-Key) | → Resultat<{piece}, illisible\|taille\|format\|statut> ; 403 role_forbidden | propriétaire ; PDF ou image ≤ taille_max_piece Mo ; revue avant delai_verification_humaine heures ouvrées |
| `contrat.activation` | branché | GET /api/company/compliance/activation | → EtapeActivation[] | six étapes (ENT-RG-R16), motif d’une pièce rejetée |

### Zones (6/6 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `zones.zones` | branché | GET /api/company/zones | → ZoneEntreprise[] | état recalculé à la lecture : bloquée (aucun livreur actif ou véhicule valide) et sa raison ; santé sur la fenêtre d’alerte_zone |
| `zones.carte` | branché | GET /api/company/zones/map | → ZoneCarte[] | les douze zones (polygone, centre, relais) ; exploitées : ZONES-EXPLOITEES |
| `zones.quartiers` | branché | GET /api/company/zones/neighbourhoods | → Quartier[] |  |
| `zones.declarer` | branché | POST /api/company/zones {code, capacite, debut, fin, livreurs} (Idempotency-Key) | → Resultat<{zone}, pas_ouverte\|deja\|aucun_livreur\|capacite\|horaires\|inconnue> ; 403 role_forbidden | propriétaire et répartiteur ; capacité honnête ; heures dans ENT-HEURES-SERVICE ; une zone non exploitée se déclare mais ne reçoit rien (DED-23) |
| `zones.modifier` | branché | PATCH /api/company/zones/{code} {capacite, debut, fin, livreurs} | → Resultat<{zone}, aucun_livreur\|capacite\|horaires\|inconnue> ; 403 role_forbidden | jamais sous les colis déjà acceptés ; livreurs rattachés = Livreur.zones (journal et notification) |
| `zones.mettreEnPause` | branché | POST /api/company/zones/{code}/pause {pause} | → Resultat<object, inconnue> ; 403 role_forbidden | les paquets acceptés restent dus |

### Flotte (6/6 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `flotte.resume` | branché | GET /api/company/fleet | → ResumeFlotte |  |
| `flotte.invitations` | branché | GET /api/company/courier-invitations | → Invitation[] | suivi lu sur le livreur créé (charte, pièces, certification, approbation) ; activées et abandonnées sorties du suivi |
| `flotte.inviter` | branché | POST /api/company/courier-invitations {nom, telephone, details?} (Idempotency-Key) | → Resultat<{invitation}, telephone\|doublon\|nom\|autre_entreprise\|refuse\|zones\|capacite\|plaque> ; 403 role_forbidden | SMS avec lien, valable expiration_invitation_livreur jours tant qu’il n’est pas ouvert ; liste noire : refus générique, console alertée |
| `flotte.renvoyer` | branché | POST /api/company/courier-invitations/{id}/resend | → Resultat<{invitation}, statut\|trop_tot> | après delai_renvoi_code_sms ; pièce refusée : le livreur est invité à la renvoyer |
| `flotte.abandonner` | branché | POST /api/company/courier-invitations/{id}/cancel | → Resultat<object, statut> |  |
| `flotte.approuver` | branché | POST /api/company/courier-invitations/{id}/approve | → Resultat<{livreurId}, pas_pret> | charte, pièces vérifiées par BelivaY et certification d’abord ; l’accès s’active aussitôt |

### Livreurs (22/22 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `livreurs.liste` | branché | GET /api/company/couriers?zone=&statut= | → Livreur[] | numéro masqué (appel masqué), jamais le nom complet ; alertes calculées (véhicule, pièce, certification) |
| `livreurs.fiche` | branché | GET /api/company/couriers/{id} | → FicheLivreur ; 404 → null | pièces : statut et date seulement ; note interne déchiffrée pour l’entreprise ; tarifMission null pour le répartiteur |
| `livreurs.suspendre` | branché | POST /api/company/couriers/{id}/suspend {motif, jusqua?} | → Resultat<object, motif\|date\|statut> ; 403 role_forbidden | propriétaire et gérant (employeur, DP-66) ; date de fin facultative (future) ; rattachement suspendu ; journal de la fiche et notification au livreur (emploi_suspendu) |
| `livreurs.lever` | branché | POST /api/company/couriers/{id}/reinstate {motif?} | → Resultat<object, belivay\|statut> ; 403 role_forbidden | propriétaire et gérant ; réintégration motivée (journal, livreur prévenu : emploi_retabli) ; une suspension de BelivaY ne se lève pas ici |
| `livreurs.retirer` | branché | POST /api/company/couriers/{id}/remove {motif} | → Resultat<{effetLe}, motif> | effet après les missions en cours |
| `livreurs.approuver` | branché | POST /api/company/couriers/{id}/approve | → Resultat<object, pas_pret> |  |
| `livreurs.modifier` | branché | PATCH /api/company/couriers/{id} {vehiculeId?, zones?, capacite?} | → Resultat<object, zones\|capacite\|vehicule> | journal {auteur, champ, avant, après} et notification au livreur |
| `livreurs.noter` | branché | PUT /api/company/couriers/{id}/note {note} | → Resultat | chiffrée au repos, jamais visible du livreur |
| `livreurs.tarif` | branché | PUT /api/company/couriers/{id}/rate {montant} | → Resultat<object, montant> ; 403 role_forbidden | propriétaire ; null : aucun tarif affiché |
| `livreurs.prevenir` | branché | POST /api/company/couriers/{id}/notify {sujet: piece\|certification\|vehicule} | → Resultat |  |
| `livreurs.controles` | branché | GET /api/company/couriers/documents/queue | → PieceAControler[] | pièces de la flotte à contrôler, refusées, expirées ou qui expirent avant l’alerte du registre |
| `livreurs.voirPiece` | branché | GET /api/company/couriers/{id}/documents/{type}/view | → Resultat<VuePiece, statut> ; 403 role_forbidden | liens signés de courte durée, image en filigrane ; consultation journalisée (rider.document_viewed) |
| `livreurs.controlerPiece` | branché | POST /api/company/couriers/{id}/documents/{type}/review {decision, motif?, expireLe?} (Idempotency-Key) | → Resultat<object, motif\|date\|statut> | refus avec motif envoyé au livreur ; validation avec date d’expiration (pièce d’identité, permis) ; journal de la fiche |
| `livreurs.relancerPiece` | branché | POST /api/company/couriers/{id}/documents/{type}/remind | → Resultat<object, statut> | rappel au livreur, gardé sur la pièce |
| `livreurs.demanderPhoto` | branché | POST /api/company/couriers/{id}/documents/selfie/reverify {motif} | → Resultat<{jusqua}, motif\|statut> ; 403 role_forbidden | DP-66, DP-67 : la photo est l’identité vérifiée ; statut « reverification », échéance PHOTO-REVERIF-J (il travaille pendant ce délai, ensuite plus de nouvelle mission jusqu’à la validation) ; motif envoyé au livreur, journal de la fiche |
| `livreurs.departs` | branché | GET /api/company/couriers/departures | → DemandeDepart[] ; 403 role_forbidden | DP-66, DP-67 : demandes ouvertes puis closes depuis moins de DEPART-VISIBLE-J jours ; conditions calculées (missions en cours, colis sous garde, kit constaté, litiges ouverts qui ne bloquent pas), préavis DEPART-PREAVIS-J et échu, affectationJusqua (0 h du dernier jour du préavis), kit (constat, délai constatJusqua, contestation), kitNonConteste, dernier versement (estimé pendant le préavis, figé à la clôture ; du et verse null pour le répartiteur) |
| `livreurs.constaterKit` | branché | POST /api/company/couriers/{id}/departure/kit {constat: restitue\|incomplet\|null, manquants?, montant?, photo?} | → Resultat<{retenue}, aucune_demande\|constat\|conteste\|photo\|manquants\|element\|delai\|montant> | DP-67 : restitué, ou incomplet (photo obligatoire, éléments manquants de KIT-VALEUR-F, montant au plus leur valeur, retenue plafonnée à KIT-VALEUR-F) au plus tard DEPART-KIT-CONSTAT-H après la fin du préavis (sinon delai ; « restitué » reste reçu) ; null : constat retiré ; conteste : le livreur a contesté, constat figé ; journal de la fiche, livreur prévenu, contestable par lui (examen BelivaY, montant mis de côté) |
| `livreurs.versementFait` | branché | POST /api/company/couriers/{id}/departure/paid (Idempotency-Key) | → Resultat<object, aucune_demande\|deja_fait> ; 403 role_forbidden | DP-67 : propriétaire ; dernier versement Mobile Money fait après la clôture ; SMS au livreur (numéro gardé), journal d’audit |
| `livreurs.cloturerDepart` | branché | POST /api/company/couriers/{id}/departure/close (Idempotency-Key) | → Resultat<{versementLe, kitNonConteste}, aucune_demande\|conditions> & {manquantes?} | DP-66, DP-67 : possible avant la fin du préavis (commun accord) ; refusée tant qu’une mission est en cours, un colis sous garde ou le kit non constaté ; dernier relevé figé, versement le vendredi suivant (Mobile Money), accès fermé, téléphone délié (numéro gardé pour les SMS), SMS au livreur avec la date, journal d’audit, administrateur prévenu |
| `livreurs.absences` | branché | GET /api/company/couriers/absences | → AbsenceLivreur[] ; 403 role_forbidden | absences prévenues par les livreurs, à venir ou en cours : motif de la liste, texte facultatif, imprevu, apresDebut |
| `livreurs.absenceVue` | branché | POST /api/company/couriers/absences/{id}/seen | → Resultat<object, inconnue> | le livreur voit que son entreprise a vu l’absence |
| `livreurs.joindreElements` | branché | POST /api/company/couriers/{id}/trust/events/{evenementId}/evidence {texte} (Idempotency-Key) | → Resultat<object, texte\|statut> | événement contesté, une fois |

### Équipe (12/12 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `equipe.registre` | branché | GET /api/company/staff | → LigneEquipe[] | registre du personnel ; nombre d’avertissements à 0 hors propriétaire et gérant |
| `equipe.dossier` | branché | GET /api/company/staff/{id} | → DossierEmploi ; 404 → null | vue selon le rôle (complete, exploitation, comptable) : aucun motif disciplinaire pour le répartiteur ni le comptable ; retenueKitMax (KIT-VALEUR-F) null sans droit aux montants |
| `equipe.conclureEssai` | branché | POST /api/company/staff/{id}/probation {decision: confirme\|prolonge\|rompu, motif} (Idempotency-Key) | → Resultat<{jusqua}, motif\|statut\|deja_prolonge> ; 403 role_forbidden | propriétaire et gérant ; motif écrit (facultatif pour confirmer) ; prolongation une fois, de la durée d’essai du contrat ; rupture : retrait après les missions en cours ; essai échu ou déjà décidé : statut |
| `equipe.avertir` | branché | POST /api/company/staff/{id}/warnings {motif} (Idempotency-Key) | → Resultat<{rang}, motif\|statut> ; 403 role_forbidden | propriétaire et gérant ; rang suivant ; le livreur le voit (GET /api/courier/warnings) et en accuse lecture |
| `equipe.fixerHoraires` | branché | PUT /api/company/staff/{id}/schedule {creneaux: [{jour 0-6, de, a}]} | → Resultat<object, creneaux\|statut> ; 403 role_forbidden | propriétaire, gérant, répartiteur ; un créneau par jour au plus, fin après début ; le planning du livreur suit ces créneaux (GET /api/courier/planning) |
| `equipe.fixerZones` | branché | PUT /api/company/staff/{id}/zones {zones, motif?} | → Resultat<object, zones\|statut> ; 403 role_forbidden | propriétaire, gérant, répartiteur ; zones déclarées de l’entreprise seulement ; en tournée, pour les paquets suivants ; livreur prévenu |
| `equipe.accorderConge` | branché | POST /api/company/staff/{id}/leaves {du, au, motif} (Idempotency-Key) | → Resultat<{congeId}, motif\|dates\|chevauchement\|statut> ; 403 role_forbidden | propriétaire et gérant ; pas dans le passé ; aucune affectation ces jours-là (raison conge) ; livreur prévenu |
| `equipe.annulerConge` | branché | POST /api/company/staff/{id}/leaves/{congeId}/cancel | → Resultat<object, inconnu\|statut> ; 403 role_forbidden | propriétaire et gérant ; avant le premier jour du congé (sinon statut) |
| `equipe.casier` | branché | PUT /api/company/staff/{id}/record-check {etat: recu\|a_demander\|non_exige} | → Resultat<object, statut> ; 403 role_forbidden | propriétaire et gérant ; l’extrait lui-même n’est pas conservé par BelivaY : seule la date de réception |
| `equipe.finContrat` | branché | POST /api/company/staff/{id}/termination {motif} (Idempotency-Key) | → Resultat<{preavisJusqua}, motif\|deja\|statut> ; 403 role_forbidden | propriétaire et gérant ; préavis DEPART-PREAVIS-J ; ouvre un départ « initiative entreprise » (file des départs : kit, dernier versement, clôture) ; événement fin_contrat |
| `equipe.annulerFinContrat` | branché | POST /api/company/staff/{id}/termination/cancel {motif} | → Resultat<object, motif\|inconnu> ; 403 role_forbidden | propriétaire et gérant ; pendant le préavis : le départ ouvert est annulé, le livreur reste et en est prévenu |
| `equipe.attestation` | branché | GET /api/company/staff/{id}/certificate | → Resultat<{nom, contenu, type}, statut> ; 403 role_forbidden | propriétaire, gérant, comptable ; PDF (un caractère par octet) sans rémunération ni motif disciplinaire ; délivrance journalisée |

### Véhicules (5/5 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `vehicules.liste` | branché | GET /api/company/vehicles | → Vehicule[] | statut calculé (assurance expirée, carte grise à vérifier, panne) et « proposé à l’affectation » |
| `vehicules.declarer` | branché | POST /api/company/vehicles {type, plaque, capacite, classes, livreurId, assuranceJusqua, photoPlaque, carteGrise} (Idempotency-Key) | → Resultat<{vehicule}, plaque\|doublon\|photo\|assurance\|classes\|capacite> ; 403 role_forbidden | plaque unique dans tout le système (doublon signalé à la console) ; classes_par_type_vehicule |
| `vehicules.rattacher` | branché | PUT /api/company/vehicles/{id}/rider {livreurId} | → Resultat<object, statut> | livreur habituel = fiche du livreur (journal) |
| `vehicules.mettreAJour` | branché | PUT /api/company/vehicles/{id}/documents/{assurance\|carte_grise} {jusqua} | → Resultat<object, date> | nouvelle carte grise : vérifiée par BelivaY |
| `vehicules.indisponible` | branché | PUT /api/company/vehicles/{id}/availability {panne, motif?} | → Resultat<object, motif> | le livreur habituel est prévenu |

### Prix (7/7 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `prix.grille` | branché | GET /api/company/price-grid | → Grille | grille d’achat en lecture seule ; chaque ligne contrôlée sous le plafond de sa classe (moteurs) : ok, ecrete, au_dessus ; propriétaire et comptable |
| `prix.delais` | branché | GET /api/company/sla | → Delais | registre ENT-* |
| `prix.supplements` | branché | GET /api/company/price-grid/supplements | → Supplement[] | propriétaire et comptable |
| `prix.paliers` | branché | GET /api/company/price-grid/tiers | → {actuel, plafonds} | plafond de valeur par palier (null : Or sans plafond), seuils du Trust Score |
| `prix.demanderRevision` | branché | POST /api/company/price-grid/revision-requests {texte} (Idempotency-Key) | → Resultat<{filId}, texte> | un fil de messages avec BelivaY (sujet grid_revision), jamais une écriture de la grille |
| `prix.alertesDelais` | branché | GET /api/company/sla/alerts | → AlertesDelais | alertes avant échéance (acceptation, ramassage) et leurs bornes lues au registre (seuil_anneau_rouge ≤ N ≤ ENT-T-ACCEPT ou délai de ramassage) ; tous les rôles |
| `prix.reglerAlertesDelais` | branché | PUT /api/company/sla/alerts {acceptationMin, ramassageMin} (Idempotency-Key) | → Resultat<{}, bornes> | propriétaire et répartiteur ; journalisé avec l’auteur (journal des paramètres) |

### Paquets (7/7 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `paquets.disponibles` | branché | GET /api/company/packages | → Disponibles | paquets publiés visibles (fenêtre de priorité du premier rang, zone, plafond du palier) ; capacités par zone ; rendus sur 7 jours ; remuneration null pour le répartiteur ; comptable : 403 role_forbidden |
| `paquets.paquet` | branché | GET /api/company/packages/{id} | → DetailPaquet ; 404 → null | nom de boutique null avant l’acceptation, jamais de nom à domicile ; lignes vides pour le répartiteur |
| `paquets.accepter` | branché | POST /api/company/packages/{id}/accept (Idempotency-Key) | → Resultat<{paquet}, pris\|expire\|capacite\|plafond\|aucun_livreur> ; 409 company_state | premier arrivé (verrou) ; rémunération figée |
| `paquets.ignorer` | branché | POST /api/company/packages/{id}/ignore | → Resultat |  |
| `paquets.rendre` | branché | POST /api/company/packages/{id}/return {motif?} | → Resultat<object, deja_ramasse\|statut> | avant tout ramassage ; pénalité propre au Trust Score |
| `paquets.alertes` | branché | GET /api/company/packages/alerts | → ReglageAlerte[] | propres à l’utilisateur, activées par défaut |
| `paquets.reglerAlerte` | branché | PATCH /api/company/packages/alerts {zone, quoi, on} | → 204 |  |

### Affectation (2/2 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `affectation.eligibles` | branché | GET /api/company/packages/{id}/eligible-couriers | → Eligibilite ; 404 | raisons de non-éligibilité (zone, véhicule, certification, suspendu, activation, en mission ; DP-67 : preavis à partir du dernier jour du préavis de départ, photo quand la nouvelle photo n’est pas validée dans PHOTO-REVERIF-J) ; distance depuis la dernière position connue ; kit manquant ; une distance inconnue jamais devant ; missionsDuJour (charge) et certifieJusqua de chaque éligible (champs à ajouter au serveur) |
| `affectation.affecter` | branché | POST /api/company/packages/{id}/assign {livreurId} (Idempotency-Key) | → Resultat<{creneau}, non_eligible\|conflit\|deja_ramasse> | affecter ou réaffecter avant le premier code de remise ; créneau annoncé au vendeur ; 422 COURIER_NOT_ELIGIBLE aussi pour preavis et photo (DP-67) |

### Missions (8/8 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `missions.liste` | branché | GET /api/company/missions?tab= | → Mission[] | a_affecter \| affectees \| en_cours \| deposees \| closes \| incidents ; marge = heure limite − heure estimée ; montant null pour le répartiteur |
| `missions.mission` | branché | GET /api/company/missions/{id} | → Mission ; 404 → null | MS-… ou PQ-… |
| `missions.compteurs` | branché | GET /api/company/missions/counts | → Record<OngletMissions, number> |  |
| `missions.appeler` | branché | POST /api/company/missions/{id}/calls {canal} (Idempotency-Key) | → Resultat<{appel}, ligne_fermee> | ligne masquée BelivaY, jamais le vrai numéro ; métadonnées journalisées |
| `missions.raccrocher` | branché | POST /api/company/calls/{id}/hangup | → 204 |  |
| `missions.noterAppel` | branché | POST /api/company/calls/{id}/note {note} | → 204 ; 404 | ce que l’entreprise retient de l’appel (≤ 500 caractères, vide : retirée), jamais son contenu ; rendue par GET …/calls (note) ; journalisée avec l’appel (call.noted) |
| `missions.appels` | branché | GET /api/company/missions/{id}/calls | → Appel[] |  |
| `missions.relancer` | branché | POST /api/company/missions/{id}/remind {sujet} | → Resultat<{envoyeLe}, trop_tot> | notification au livreur, une par sujet et par intervalle |

### Carte (2/2 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `carte.positions` | branché | GET /api/company/fleet/positions | → PositionLivreur[] | livreurs en mission active seulement (dernière position), jamais hors mission |
| `carte.fond` | branché | GET /api/company/fleet/map | → {zones, lieux} | zones déclarées (centre, rayon), relais et boutiques des paquets acceptés, point de stockage ; jamais le client |

### Incidents (4/4 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `incidents.liste` | branché | GET /api/company/incidents?status= | → Incident[] | types du livreur traduits (genre, famille) ; sécurité d’abord, puis l’échéance ; passé ENT-INCIDENT-DELAI : escalade |
| `incidents.decider` | branché | POST /api/company/incidents/{id}/decision {decision, motif} (Idempotency-Key) | → Resultat<object, motif\|deja_decide\|securite> | refus motivé (longueur_min_motif_refus) ; décision tardive refusée (l’opérateur de zone décide) |
| `incidents.transferer` | branché | POST /api/company/packages/{id}/transfer {versLivreurId} (Idempotency-Key) | → Resultat<{transfert}, non_eligible\|statut> | après ramassage ; garde transférée au dernier scan |
| `incidents.transferts` | branché | GET /api/company/transfers | → Transfert[] |  |

### Colis (3/3 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `colis.file` | branché | GET /api/company/parcels?queue= | → Colis[] | a_ramasser \| sous_garde \| remis (historique_remis jours) ; aucune donnée du client au-delà du quartier ; valeur déclarée null pour le comptable ; alertes garde_longue, introuvable |
| `colis.compteurs` | branché | GET /api/company/parcels/counts | → Record<FileColis, number> |  |
| `colis.relancer` | branché | POST /api/company/parcels/remind {cle} | → {envoyeLe} | étiquette ou paquet ; une relance par intervalle |

### Preuves (6/6 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `preuves.resume` | branché | GET /api/company/proofs/summary | → ResumePreuves | dossiers suivis, file de revue (illisible, manquante), taux par livreur |
| `preuves.dossier` | branché | GET /api/company/proofs?package= | → DossierPreuves ; 404 → null | par maillon (C1, transport, C2, domicile, clôture) ; heure de validation des codes, jamais leur valeur |
| `preuves.signaler` | branché | POST /api/company/proofs/{id}/flag {commentaire} (Idempotency-Key) | → Resultat<object, commentaire> | jamais supprimée ni remplacée ; journalisé |
| `preuves.completer` | branché | POST /api/company/proofs/{id}/complement {commentaire, photos} (Idempotency-Key) | → Resultat<object, commentaire> |  |
| `preuves.exporter` | branché | POST /api/company/proofs/export {paquetId} | → {le, par} | export journalisé, montré au dossier |
| `preuves.relancer` | branché | POST /api/company/proofs/remind {paquetId} | → {envoyeLe} |  |

### Litiges (5/5 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `litiges.liste` | branché | GET /api/company/disputes?stage= | → Litige[] | ouvert \| examen \| decide ; preuves de la mission jointes d’office ; montants null pour le répartiteur |
| `litiges.preparer` | branché | POST /api/company/disputes/{id}/draft {genre, texte, piece?} | → Resultat<object, RefusLitige> | répartiteur ou propriétaire (comptable : 403) |
| `litiges.repondre` | branché | POST /api/company/disputes/{id}/response {genre, texte, piece?} (Idempotency-Key) | → Resultat<object, RefusLitige> | propriétaire seul ; échéance passée : delai ; arrangement ≥ ENT-LITIGE-ARRANGEMENT-MIN caractères : sinon texte |
| `litiges.completer` | branché | POST /api/company/disputes/{id}/complement {texte} (Idempotency-Key) | → Resultat<object, RefusLitige> | pendant l’examen |
| `litiges.recours` | branché | POST /api/company/disputes/{id}/appeal {element} (Idempotency-Key) | → Resultat<object, RefusLitige> | propriétaire ; une fois, sous LIT-RECOURS-H, élément nouveau ; retenues suspendues |

### Règlements (6/6 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `reglements.prochain` | branché | GET /api/company/payouts/next | → VersementPrevu | arrêté jeudi 23 h 59, versé le vendredi avant 12 h ; minoration, retenues, report ; frais 0 ; propriétaire et comptable (répartiteur : 403) |
| `reglements.historique` | branché | GET /api/company/payouts | → Versement[] |  |
| `reglements.indicateurs` | branché | GET /api/company/payouts/indicators | → IndicateursArgent |  |
| `reglements.moyen` | branché | GET /api/company/payment-method | → MoyenReglement | numéro masqué « ···· 01 » |
| `reglements.demanderCode` | branché | POST /api/company/payment-method/code | → {defi, destination, codeDemo: null} ; 429 trop_tot | propriétaire seul ; code SMS au propriétaire (second facteur) |
| `reglements.changerMoyen` | branché | POST /api/company/payment-method {operateur, numero, auNomDeLEntreprise, defi, code} (Idempotency-Key) | → Resultat<object, numero\|titulaire\|code\|en_revue> | propriétaire seul ; jamais de code secret Mobile Money ; versements bloqués et revue humaine |

### Relevés (4/4 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `releves.liste` | branché | GET /api/company/statements?period= | → Releve[] | semaine (arrêtée le jeudi 23 h 59) \| mois ; provisoire puis définitif ; propriétaire et comptable |
| `releves.mentions` | branché | GET /api/company/statements/mentions | → MentionsReleve |  |
| `releves.fichier` | branché | GET /api/company/statements/{id}.pdf · GET /api/company/statements/{id}.csv | → Resultat<{nom, contenu, type}, provisoire> | CSV UTF-8 « ; » ; journalisé ; aucune donnée de client |
| `releves.televerserFacture` | branché | POST /api/company/statements/{id}/invoice {nom, taille, type} (Idempotency-Key) | → Resultat<object, provisoire\|format\|taille\|autofacturation> | PDF ≤ taille_max_piece Mo |

### Score (1/1 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `score.score` | branché | GET /api/company/trust | → ScoreEntreprise | Trust Score fixé par BelivaY (lecture seule) ; par livreur, par zone, événements, alerte de descente ; aucune mission close : score null |

### Emballages (5/5 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `emballages.etat` | branché | GET /api/company/packaging | → EtatEmballages | stock calculé depuis les mouvements ; écart du mois (ENT-EMB-ECART-MOIS) |
| `emballages.remettre` | branché | POST /api/company/packaging/handovers {livreurId, items, plage} (Idempotency-Key) | → Resultat<object, quantite\|plage\|chevauchement> ; 403 role_forbidden | en attente jusqu’à la confirmation du livreur ; la plage est coupée dans un rouleau du stockage |
| `emballages.commander` | branché | POST /api/company/packaging/orders {format, n, livraison} (Idempotency-Key) | → Resultat<object, au_dessus_du_seuil\|quantite> | seulement au seuil ENT-EMB-REAPPRO |
| `emballages.justifier` | branché | POST /api/company/packaging/discrepancies {format, n, motif, photo} (Idempotency-Key) | → Resultat<object, quantite\|motif\|photo> |  |
| `emballages.declarerPlagePerdue` | branché | POST /api/company/label-ranges/{id}/invalidate | → Resultat<object, plage> | plage invalidée : plus aucune étiquette liée |

### Messages (4/4 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `messages.fils` | branché | GET /api/company/threads?group= | → Fil[] | groupes belivay, livreurs, incidents ; jamais un client, un vendeur ni un gérant (ENT-ANO-01) |
| `messages.lire` | branché | POST /api/company/threads/{id}/read | → {ok} ; 404 |  |
| `messages.envoyer` | branché | POST /api/company/threads/{id}/messages {texte, piece} (Idempotency-Key) | → Resultat<{masque}, vide\|ferme\|piece> ; 404 | numéros et liens masqués à l’enregistrement ; le livreur est prévenu |
| `messages.nouveauSupport` | branché | POST /api/company/threads {sujet, ref, texte} (Idempotency-Key) | → Resultat<{id}, vide\|ref> | rattaché à un dossier de l’entreprise (litige, paquet, versement, relevé, compte) |

### Notifications (3/3 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `notifications.liste` | branché | GET /api/company/notifications | → Notification[] | celles de l’utilisateur connecté, les plus récentes d’abord |
| `notifications.lire` | branché | POST /api/company/notifications/{id}/read | → {ok} ; 404 |  |
| `notifications.marquerLues` | branché | POST /api/company/notifications/read-all | → {ok} |  |

### Paramètres (12/12 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `parametres.utilisateurs` | branché | GET /api/company/users | → UtilisateurInterne[] | un autre rôle ne voit que son accès ; numéros masqués sauf le sien |
| `parametres.inviter` | branché | POST /api/company/users {nom, telephone, email, role} (Idempotency-Key) | → Resultat<object, nom\|telephone\|email\|role\|limite\|doublon> ; 403 role_forbidden | propriétaire ; acces_internes_max accès ; SMS avec lien à usage unique (ENT-INVITATION-EXPIRE jours) |
| `parametres.retirer` | branché | DELETE /api/company/users/{id} | → Resultat<object, soi> ; 403 role_forbidden | propriétaire ; sessions révoquées sur le champ ; jamais soi-même |
| `parametres.reglages` | branché | GET /api/company/settings | → ReglagesEntreprise | journal des modifications signé (auteur, date) |
| `parametres.modifierStockage` | branché | PUT /api/company/settings/storage {adresse, consignes} | → Resultat<object, adresse> ; 403 role_forbidden | propriétaire |
| `parametres.appareils` | branché | GET /api/company/me/devices | → Appareil[] | alimentés à la connexion ; « actuel » : l’appareil du jeton |
| `parametres.deconnecterAppareil` | branché | DELETE /api/company/me/devices/{id} | → {ok} | jetons de cet appareil en liste noire |
| `parametres.changerMotDePasse` | branché | POST /api/company/me/password {actuel, nouveau} | → Resultat<object, mot_de_passe\|faible> | MDP-LONG ; autres appareils déconnectés |
| `parametres.notifications` | branché | GET /api/company/notification-preferences | → PreferencesNotifications |  |
| `parametres.reglerNotifications` | branché | PUT /api/company/notification-preferences {zones, matrice, resumeQuotidien, plageCalme} | → Resultat<object, adresse> | alertes verrouillées gardées (alertes_verrouillees) |
| `parametres.demanderExport` | branché | POST /api/company/me/export | → {defi, codeDemo: null} | code SMS au numéro de l’accès (DED-31) |
| `parametres.exporter` | branché | POST /api/company/me/export/confirm {defi, code} | → Resultat<{nom, contenu}, code> |  |

### Rapports (5/5 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `rapports.rapport` | branché | GET /api/company/reports?from=&to=&zone=&courier=&type= | → Rapport ; 400 invalid | période et période précédente ; par jour, zone, type, livreur ; montants null pour le répartiteur ; aucune donnée de client |
| `rapports.exporter` | branché | GET /api/company/reports.csv?from=&to= · GET /api/company/reports.pdf?from=&to= | → Resultat<{nom, contenu, type}, peu_de_donnees> | journalisé ; refusé sous ENT-RAPPORT-MIN-MISSIONS missions |
| `rapports.rapportPilote` | branché | GET /api/company/reports/pilot | → Resultat<{nom, contenu, type}, pilote_en_cours> | au dernier jour du pilote |
| `rapports.programme` | branché | GET /api/company/reports/schedule | → ProgrammeRapport | rapport du vendredi : actif, heure, format, destinataire interne, prochain envoi |
| `rapports.programmer` | branché | PUT /api/company/reports/schedule {active, hour, format, recipient} | → Resultat<{prochain}, heure \| destinataire \| role> | propriétaire et comptable ; journalisé ; envoi par e-mail chaque vendredi |

### Intégrations (9/9 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `integrations.etat` | branché | GET /api/company/integrations | → EtatIntegrations ; 403 role_forbidden | propriétaire ; fermées au lancement (integrations_actives), debit_par_cle, ENT-WEBHOOK-REESSAIS |
| `integrations.espace` | branché | GET /api/company/integrations/space | → EspaceIntegrations | clés masquées, rappels, journal des appels (test), débit par minute |
| `integrations.creerCle` | branché | POST /api/company/integrations/keys {env} | → Resultat<{valeur}, fermee \| existe> | production refusée tant que integrations_actives = non ; journalisé |
| `integrations.revelerCle` | branché | POST /api/company/integrations/keys/{id}/reveal | → Resultat<{valeur}, introuvable> | journalisé ; l’écran masque de nouveau |
| `integrations.regenererCle` | branché | POST /api/company/integrations/keys/{id}/rotate | → Resultat<{valeur}, introuvable> | l’ancienne valeur cesse aussitôt ; journalisé |
| `integrations.ajouterRappel` | branché | POST /api/company/integrations/webhooks {url, events} | → Resultat<{}, url \| evenements \| existe> | https seulement ; rappels signés |
| `integrations.retirerRappel` | branché | DELETE /api/company/integrations/webhooks/{id} | → Resultat<{}, introuvable> |  |
| `integrations.essayerRappel` | branché | POST /api/company/integrations/webhooks/{id}/test | → Resultat<{statut}, introuvable> | envoi signé d’essai, journalisé |
| `integrations.appelDeTest` | branché | POST /api/company/integrations/sandbox/call {path} | → Resultat<{statut}, sans_cle \| quota> | compte dans debit_par_cle ; 429 au-delà |

<!-- connecteurs:fin -->
