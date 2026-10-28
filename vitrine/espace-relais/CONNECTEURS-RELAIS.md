# Connecteurs de l'espace point relais : de l'écran au serveur

## État du branchement (24 oct. 2026, branche `l/carte`)

- **Fait** : les 17 domaines de la source (`src/donnees/source.ts`) sont branchés sur le kit (`src/api/domaines/*.ts`,
  client HTTP partagé du site). 151 méthodes : **141 branchées** sur `/api/relay/…`, 6 servies sur le téléphone (file
  hors connexion, brouillon de candidature), 4 propres à la démonstration. Plus aucune « à brancher ».
- **Vérifié** : `src/api/connecteurs.test.ts` (chaque méthode a son entrée et appelle sa route, origine et clé
  d'idempotence, X-Device-Id, pagination, droits, file hors connexion) ; test du kit
  `apps/relais_core/tests/test_contrat_relais.py` (chaque route du registre servie, chaque champ du corps lu) ;
  recette de bout en bout `pw-api.config.ts` + `tests/api-bout-en-bout.spec.ts` (12 parcours : connexion, réception,
  retrait avec code et garde, encaissement Mobile Money au comptoir, hors connexion, retour, versements, numéro de
  versement, compte, zones v2, toutes les pages en gérante et en employé).
- **Reste** (§ 5) : ce qui dépend d'un fournisseur réel (SMS, Mobile Money, stockage des photos de preuve, Google),
  et les routes à reporter dans `backend-kit/openapi.yaml` (§ 6).

Ce document dit, pour chaque méthode de la source de l'espace point relais (17 domaines), la route du serveur qui la
sert. Toutes les routes sont celles du kit (`backend-kit/apps/relais_compte`, `backend-kit/apps/relais_guichet`, socle
`backend-kit/apps/relais_core`), sous **`/api/relay/`**, **sans barre finale**. Contrat : `backend-kit/openapi.yaml`,
groupe « Espace point relais » (schémas `Relais_<domaine>_<Type>`).

## 1. Basculer de la démonstration au serveur

| Variable | Démonstration (défaut) | Serveur |
|---|---|---|
| `VITE_SOURCE` | `demo` (ou absente) | `api` |
| `VITE_API_URL` | inutile | `https://belivay.com/api` |

```
écrans ──► source (SourceRelais, 17 domaines)
             ├─ demo : src/demo/source-demo.ts (chargée à part, jamais dans le paquet servi avec l'API)
             └─ api  : src/api/source-api.ts ──► src/api/domaines/<domaine>.ts ──► client HTTP du site
                                                                                   └──► /api/relay/… (kit relais_*)
```

Lancer l'appli contre le serveur d'essai : `npx playwright test -c pw-api.config.ts` (serveur Django d'essai sur 8050,
base neuve `essai-relais.sqlite3`, appli en mode API sur 5220), ou à la main :

```
BELIVAY_ESSAI_BASE=essai-relais.sqlite3 CORS_EXTRA_ORIGINS=http://localhost:5220 sh ../backend-kit/_essai/lancer-serveur.sh 8050
curl -X POST http://localhost:8050/api/_essai/relais/monde     # Relais Mokolo Carrefour (Z3), Rose Mbarga et Paul Ndzana
VITE_SOURCE=api VITE_API_URL=http://localhost:8050/api npx vite --port 5220
```

## 2. Conventions

- **Appareil** : un identifiant tiré une fois (`blv_r_appareil`), envoyé par l'en-tête `X-Device-Id` à chaque requête
  (client du relais, `source-api.ts`) ; le serveur tient l'étape de connexion de cet appareil (numéro → code SMS sur un
  nouvel appareil → PIN). Le kit permet cet en-tête dans ses en-têtes CORS ; relaya ne le permet pas encore (à ajouter
  à `CORS_ALLOW_HEADERS`, ou servir l'appli sur la même origine que l'API).
- **Jetons** : ceux de relaya (simplejwt), rendus à l'ouverture (PIN bon, nouveau PIN, invitation acceptée) avec la clé
  des preuves hors connexion (`horsLigne.cle`, gardée sur le téléphone) ; rafraîchis par `/api/auth/refresh/`.
- **Origine** : chaque action métier porte `{cle, heure, position}` (corps) et `Idempotency-Key = origine.cle` : rejouée
  (double appui, file), elle rend la même réponse sans refaire le geste.
- **Refus** : un refus métier est un 200 `{ok: false, raison}` ; un 403 `droit_refuse` ou `owner_only` (le serveur refait
  les droits, ARL-06) devient `{ok: false, raison: 'droit_refuse'}` ; 404 → `null` pour une lecture « … | null ».
- **Listes longues** : le kit pagine (tableau + en-tête `X-Next-Cursor`, CAP-05) ; le client du relais suit l'en-tête et
  rend la liste entière (20 pages au plus).
- **Relecture** : après chaque écriture réussie, l'événement `blv:donnees` (comme la démonstration) ; un écran qui attend
  le geste d'un autre téléphone (le livreur confirme le lot, l'agrégateur confirme le paiement) relit toutes les 3 s
  (`useAttente`, `useRelire`).
- **Hors connexion** : la file vit sur le téléphone (`blv_r_file`) ; chaque élément porte sa charge
  `{domaine, methode, args}` sans PIN ; un geste signé porte `preuve = HMAC-SHA256(clé de l'appareil, origine.cle)` ; au
  retour du réseau, `POST /api/relay/sync/batch` rejoue chaque geste par sa route (motif du serveur mot pour mot). Le
  paiement Mobile Money au comptoir n'est jamais rejoué (`reseau_requis`).
- **Photos du serveur** : `/media/…` est rendu en adresse complète (`urlMedia`) quand l'appli vit sur une autre origine.
- **Gestes des autres interfaces** sur le serveur d'essai : `/api/_essai/relais/…` (`relaya_essai/essai_relais.py` :
  monde, dépôt du livreur et sa confirmation, codes de retrait lus par le client, garde, retour validé, versements),
  `/api/_essai/codes` (SMS reçus), `/api/_essai/paiements/confirmer` (webhook de l'agrégateur).

## 3. Écarts corrigés au branchement

| Écart | Où | Correction |
|---|---|---|
| Pagination `X-Next-Cursor` ignorée (50 éléments au plus) | appli | `fetchPagine` (source-api.ts) suit l'en-tête |
| `DELETE /account/closure` : `aucune` (accès) / `aucune_demande` (mon relais) | appli | `relais.annulerFin` traduit `aucune` → `aucune_demande` |
| `GET missions?status=announced` ne rend plus le lot une fois confirmé : « Lot reçu » jamais affiché | appli | `reception.lots` relit le lot vu sur ce téléphone et le garde s'il est reçu du jour |
| Session relue après la navigation : retour à la connexion après le PIN | appli | `session.tsx` : `relire()` rend une promesse, la connexion l'attend |
| Le livreur confirme sur son téléphone : l'écran restait « en attente » | appli | `useAttente` (relecture) |
| `FicheRelais.position` null (visite pas faite) : « Ma zone » plantait | appli | type `position | null`, carte sans repère |
| Connexion par e-mail (kit « compte » de démonstration) offerte avec le serveur | appli | masquée en mode API |
| Mon compte : tout en `localStorage` de démonstration | appli | `PR-10/CompteApi.tsx` : photo, numéro masqué, appareils |
| Remise refusée `controle_requis` sans « Tout est en ordre » du client (contraire à DP-28 et au registre) | kit | `guichet.remettre` : la remise se fait, journal « sans confirmation », fenêtre de retour ouverte |
| Nouveau numéro de versement effectif dès les deux codes (l'ancien perdu, changement non annulable) | kit | `argent.confirmer_numero` : le nouveau attend la revue dans la demande, l'ancien reste actif ; annulable ; `valider_numero` l'applique |

## 4. Méthodes

<!-- connecteurs:debut -->

151 méthodes : **141 branchées**, 6 servies sur le téléphone, 4 propres à la démonstration (gestes de l'application du client, de l'agrégateur ou de la console). Aucune « à brancher ».

### Session et PIN (10/10 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `session.session` | branché | GET /api/relay/me | → SessionRelais | profil, statut, capacité, trust, palier, compteurs de l’en-tête |
| `session.ecranConnexion` | branché | GET /api/relay/auth/state | → EcranConnexion | étape de cet appareil (en-tête X-Device-Id, CNX-04) ; numéro toujours masqué |
| `session.commencer` | branché | POST /api/relay/auth/start {phone, origine} | → Resultat {etape} inconnu \| acces_retire \| numero_invalide \| candidature_en_cours | PR-03 /auth/relay/start → needs_otp (PAR-02) |
| `session.verifierCode` | branché | POST /api/relay/auth/otp {code, origine} | → Resultat {etape} code_faux \| expire \| bloque | OTP-LONGUEUR, OTP-DUREE, sms_essais_code ; lie l’appareil |
| `session.renvoyerCode` | branché | POST /api/relay/auth/otp/resend {origine} | → Resultat trop_tot \| trop_d_envois | OTP-RENVOI |
| `session.connecter` | branché | POST /api/relay/auth/pin {pin, origine} | → Resultat pin_faux \| bloque \| acces_retire | PIN-ESSAIS faux : blocage PR-PIN-BLOCAGE-MIN, gérant prévenu (CNX-03) ; PIN haché Argon2 |
| `session.pinOublie` | branché | POST /api/relay/auth/pin/forgot {origine} | → Resultat trop_d_envois | code SMS au numéro du compte |
| `session.creerPin` | branché | POST /api/relay/auth/pin/new {pin, origine} | → Resultat pin_trop_simple \| code_requis | après un code SMS vérifié |
| `session.changerNumero` | branché | DELETE /api/relay/auth/device |  | délie cet appareil |
| `session.deconnecter` | branché | POST /api/relay/logout |  |  |

### Accès, candidature, activation (16/16 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `acces.invitation` | branché | GET /api/relay/invitations/{jeton} | → Invitation ; 404 → null |  |
| `acces.accepterInvitation` | branché | POST /api/relay/invitations/{jeton}/accept {pin, origine} (Idempotency-Key) | → Resultat expiree \| pin_trop_simple \| deja_utilisee \| retiree \| equipe_complete |  |
| `acces.redemanderInvitation` | branché | POST /api/relay/invitations/{jeton}/renew {origine} (Idempotency-Key) | → Resultat introuvable | le gérant est prévenu (INV-01) |
| `acces.formation` | branché | GET /api/relay/me/training | → FormationMembre |  |
| `acces.quartiers` | branché | GET /api/relay/applications/areas | → QuartierCandidat[] | table quartier → zone, ZONES-EXPLOITEES, RELAIS-PAR-ZONE |
| `acces.brouillon` | sur le téléphone (sans route) | — |  | brouillon gardé sur le téléphone, localStorage « blv_r_brouillon » (INS-01) ; part avec la candidature |
| `acces.enregistrerBrouillon` | sur le téléphone (sans route) | — |  | brouillon gardé sur le téléphone, localStorage « blv_r_brouillon » (INS-01) ; part avec la candidature |
| `acces.envoyerCodeVersement` | branché | POST /api/relay/applications/payout-number/otp {operateur, numero, origine} | → Resultat {expireA} prefixe \| numero_invalide \| trop_tot | PR-PREFIXES-MOMO (INS-03) |
| `acces.verifierCodeVersement` | branché | POST /api/relay/applications/payout-number/verify {code, origine} | → Resultat code_faux \| expire |  |
| `acces.candidater` | branché | POST /api/relay/applications {brouillon, pieces, signature, origine} (Idempotency-Key) | → Resultat {reference} deja_candidat \| incomplet \| versement_non_verifie \| convention_non_signee | crée un relais « candidat » en console (PR03-R06) ; hors zone : liste d’attente |
| `acces.candidature` | branché | GET /api/relay/applications/mine | → Candidature ; 404 → null |  |
| `acces.programme` | branché | GET /api/relay/training/program | → ModuleVu[] |  |
| `acces.activation` | branché | GET /api/relay/activation | → Activation |  |
| `acces.statut` | branché | GET /api/relay/status | → StatutDetail |  |
| `acces.contester` | branché | POST /api/relay/decisions/{id}/contest {texte, origine} (Idempotency-Key) | → Resultat {reponseAvant} deja_contestee \| non_contestable | une fois, PR-CONTEST-H (STA-03) |
| `acces.annulerFin` | branché | DELETE /api/relay/account/closure | → Resultat aucune \| deja_prononcee | ARL-26, DP-67 |

### Aujourd’hui (1/1 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `aujourdhui.aujourdhui` | branché | GET /api/relay/today | → Aujourdhui | gains et caisse à null pour un employé |

### Réception des lots (8/8 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `reception.lots` | branché | GET /api/relay/missions?status=announced | → Lot[] | lots annoncés ; un lot vu sur ce téléphone puis confirmé par le livreur est relu (GET missions/{id}) et gardé le jour même |
| `reception.lot` | branché | GET /api/relay/missions/{id} | → Lot ; 404 → null |  |
| `reception.regles` | branché | GET /api/relay/config/reception | → ReglesReception | lu dans la configuration versionnée (CODE-*, PIN-LONGUEUR, PR-LOT-CONFIRM-MIN, RELAIS-PLACES, PR-SATURATION, PHOTO-MAX-KO) |
| `reception.scannerEtiquette` | branché | POST /api/relay/missions/{id}/scan {etiquette, origine} (Idempotency-Key) | → IssueScan dans_le_lot \| deja_scanne \| pas_pour_ce_relais \| en_trop \| illisible | PR-RC-04 : étiquette d’un autre relais, incident « mauvais relais » côté entreprise |
| `reception.verifierCodeDepot` | branché | POST /api/relay/missions/verify-code {code, origine} (Idempotency-Key) | → Resultat {lot} code_faux \| bloque \| deja_valide | code de dépôt en 6 chiffres ou jeton du QR du livreur (DP-62) ; jamais renvoyé |
| `reception.resultat` | branché | POST /api/relay/missions/{id}/items/{parcel} {resultat, scelle, photos, note, motif, origine} (Idempotency-Key) | → Resultat photo_manquante \| transition_interdite |  |
| `reception.colisEnTrop` | branché | POST /api/relay/missions/{id}/items/{parcel} {resultat: "en_trop", classe, photos, origine} (Idempotency-Key) | → Resultat |  |
| `reception.validerLot` | branché | POST /api/relay/missions/{id}/validate {photo, pin, origine} (Idempotency-Key) | → Resultat {emplacements} colis_sans_resultat \| photo_manquante \| pin_requis | garde au relais à POST /api/courier/stops/{id}/relay-drop/confirm |

### Remise au client (12/15 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `retrait.verifierCode` | branché | POST /api/relay/handover/verify {methode, valeur, remise, origine} (Idempotency-Key) | → Resultat {remise} code_faux \| bloque \| trop_de_codes \| deja_remis \| non_remettable \| pas_au_relais \| etiquette | un code par colis (ARL-01) ; le code n’est jamais renvoyé ; detail : essais restants, fin du blocage, état |
| `retrait.rechercher` | branché | GET /api/relay/handover/search?ref=\|phone= | → Remise ; 404 → null | commande payable au retrait ; le numéro n’est jamais renvoyé (PR-RC-11) |
| `retrait.remise` | branché | GET /api/relay/handover/{id} | → Remise ; 404 → null | gain filtré pour l’employé (PR-RC-09) |
| `retrait.demanderPaiement` | branché | POST /api/relay/handover/{id}/payment {origine} (Idempotency-Key) | → Resultat reseau_requis | demande CamPay ; statut par webhook (PR-PAY-COMPTOIR-DELAI-MIN) ; jamais hors ligne (OFF-02) |
| `retrait.annulerPaiement` | branché | DELETE /api/relay/handover/{id}/payment {origine} (Idempotency-Key) | → Resultat transition_interdite | abandonne une demande non confirmée |
| `retrait.confirmerEncaissement` | branché | POST /api/relay/handover/{id}/cash {recu, origine} (Idempotency-Key) | → Resultat {monnaie} montant_insuffisant | espèces de garde, une fois par groupe (ARL-02) ; journal signé (ARL-32) ; storage.cash.collected |
| `retrait.inviterControle` | branché | POST /api/relay/handover/{id}/check-request {origine} (Idempotency-Key) | → Resultat reseau_requis | DP-28 : la confirmation vient de l’application du client (handover.all_in_order) |
| `retrait.nePasOuvrir` | branché | POST /api/relay/handover/{id}/check {controle: "sans_ouverture", origine} (Idempotency-Key) | → Resultat | ARL-36 : inscrit au journal, fenêtre de retour ouverte |
| `retrait.poserPreuve` | branché | POST /api/relay/handover/{id}/proof {photo, porteur, nomPorteur, pieceVerifiee, origine} (Idempotency-Key) | → Resultat photo_manquante \| porteur_requis \| porteur_non_autorise \| piece_non_verifiee |  |
| `retrait.remettre` | branché | POST /api/relay/handover/{id}/complete {pin, origine} (Idempotency-Key) | → Resultat {remise} encaissement_non_confirme \| paiement_requis \| photo_manquante \| pin_faux \| pin_bloque \| remise_annulee \| plafond_hors_ligne | handover.completed ; 3 PIN faux : handover.pin_cancelled + storage.cash.reversed (ARL-42) |
| `retrait.refusSansMotif` | branché | POST /api/relay/handover/{id}/refuse {pin, origine} (Idempotency-Key) | → Resultat | DP-24 : garde retenue sur la livraison payée |
| `retrait.abandonner` | branché | POST /api/relay/handover/{id}/cancel {motif, constat, origine} (Idempotency-Key) | → Resultat {especesRendues} | contre-écriture des espèces (PR-RC-31) |
| `retrait.presentables` | démonstration seulement | — |  | application du client (essai : /api/_essai/relais/…) |
| `retrait.simulerPresentation` | démonstration seulement | — |  | application du client (essai : /api/_essai/relais/…) |
| `retrait.simulerRefusPaiement` | démonstration seulement | — |  | agrégateur Mobile Money |

### Stock et plan (10/10 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `stock.stock` | branché | GET /api/relay/stock?filter=&q= | → Stock |  |
| `stock.fiche` | branché | GET /api/relay/parcels/{ref} | → ColisRelais ; 404 → null |  |
| `stock.plan` | branché | GET /api/relay/slots | → Case[] |  |
| `stock.deplacer` | branché | POST /api/relay/parcels/{ref}/move {emplacement, origine} (Idempotency-Key) | → Resultat case_pleine \| etagere_interdite |  |
| `stock.vue` | branché | GET /api/relay/stock?tab=&q=&class=&blocked=&counter=&slot= | → VueStock | part du relais à null pour l’employé (PR-RC-09) |
| `stock.ficheComplete` | branché | GET /api/relay/parcels/{ref}?detail=full | → FicheColis ; 404 → null | parcours, garde jour par jour, preuves, journal ; aucune donnée personnelle (FIC-01) |
| `stock.inventaire` | branché | GET /api/relay/inventory | → Inventaire \| null |  |
| `stock.commencerInventaire` | branché | POST /api/relay/inventory {origine} (Idempotency-Key) | → Resultat {id} inventaire_en_cours |  |
| `stock.pointer` | branché | POST /api/relay/inventory/{id}/check {colis, trouve_en, origine} (Idempotency-Key) | → Resultat {ecart} pas_au_relais \| deja_pointe | id « courant » : l’inventaire en cours (même chemin au rejeu hors connexion) |
| `stock.terminerInventaire` | branché | POST /api/relay/inventory/{id}/close {pin, origine} (Idempotency-Key) | → Resultat {bilan} pin_requis \| aucun_inventaire | id lu par GET /api/relay/inventory ; manquants signalés à la console (relay.inventory.missing) |

### Départs (7/7 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `departs.departs` | branché | GET /api/relay/departures | → Departs |  |
| `departs.regles` | branché | GET /api/relay/config?scope=departures | → ReglesDeparts | PIN-LONGUEUR, PR-DEP-ALERTE-H, TRANSFERT-RELAIS, GARDE-GRILLE, GARDE-RENVOI |
| `departs.scanner` | branché | POST /api/relay/departures/{id}/scan {colis, origine} (Idempotency-Key) | → Resultat |  |
| `departs.annulerScan` | branché | DELETE /api/relay/departures/{id}/scan/{colis} {origine} (Idempotency-Key) | → Resultat deja_validee |  |
| `departs.marquerAbsent` | branché | POST /api/relay/departures/{id}/scan {colis, absent: motif, origine} (Idempotency-Key) | → Resultat | DEP-02 : absent avec motif ; introuvable alerte le support |
| `departs.annulerAbsent` | branché | DELETE /api/relay/departures/{id}/absent/{colis} {origine} (Idempotency-Key) | → Resultat deja_validee |  |
| `departs.valider` | branché | POST /api/relay/departures/{id}/validate {photo, pin, origine} (Idempotency-Key) | → Resultat {partis} | pendant livreur : POST /api/courier/stops/{id}/departures/confirm |

### Constats et retours (10/10 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `incidents.dossiers` | branché | GET /api/relay/claims | → Dossier[] | étape et échéance calculées par le serveur (DP-35) ; retenue à null pour un employé |
| `incidents.dossier` | branché | GET /api/relay/claims/{id} | → Dossier ; 404 → null | fil lisible PR-PREUVES-CONSERV-J jours après la clôture (ARL-40) |
| `incidents.colisPourConstat` | branché | GET /api/relay/claims/parcel?ref= | → ColisPourConstat ; 404 → null |  |
| `incidents.ouvrirConstat` | branché | POST /api/relay/claims {colis, motif, photos, note, devantLeClient, pin, origine} (Idempotency-Key) | → Resultat {id} motif_requis \| photo_manquante \| non_constatable \| pin_faux \| bloque | délais depuis la réception par le serveur (OFF-01) ; événement claim.opened |
| `incidents.ajouterPhotos` | branché | POST /api/relay/claims/{id}/photos {photos, origine} (Idempotency-Key) | → Resultat clos | répond à claim.photo_requested |
| `incidents.ecrire` | branché | POST /api/relay/claims/{id}/messages {texte, photos, origine} (Idempotency-Key) | → Resultat {id} fil_ferme \| vide |  |
| `incidents.contester` | branché | POST /api/relay/claims/{id}/contest {motif, origine} (Idempotency-Key) | → Resultat non_contestable \| deja_contestee \| delai_depasse | gérant seulement (403 owner_only), une fois, PR-CONTESTATION-H |
| `incidents.retours` | branché | GET /api/relay/returns | → RetourVu[] |  |
| `incidents.verifierRetour` | branché | GET /api/relay/returns/{reference} | → Resultat {retour} non_valide \| deja_depose ; 404 → introuvable | LIT-05 : un retour non validé ne se prend pas |
| `incidents.deposerRetour` | branché | POST /api/relay/returns/drop {reference, scelle, photos, pin, origine} (Idempotency-Key) | → Resultat {emplacement} non_valide \| photo_manquante \| pin_faux | hors capacité, jamais facturé, payé comme une remise (ARL-39) |

### Fermetures (6/6 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `fermeture.fermetures` | branché | GET /api/relay/closures | → Fermeture[] |  |
| `fermeture.apercu` | branché | POST /api/relay/closures/preview {type, motif, du, au} | → ApercuFermeture | conséquence selon la durée (ARL-20, DP-42), colis concernés, refus éventuel |
| `fermeture.declarer` | branché | POST /api/relay/closures {type, motif, du, au, origine} (Idempotency-Key) | → Resultat {id, rouvreLe} droit_refuse \| preavis_insuffisant \| motif_interdit \| chevauchement \| dates_invalides | événement relay.closure.declared |
| `fermeture.annuler` | branché | DELETE /api/relay/closures/{id} | → Resultat deja_commencee \| droit_refuse |  |
| `fermeture.rouvrir` | branché | POST /api/relay/closures/{id}/reopen {origine} (Idempotency-Key) | → Resultat pas_en_cours |  |
| `fermeture.joindreJustificatif` | branché | POST /api/relay/closures/{id}/proof {photo, origine} (Idempotency-Key) | → Resultat non_demande |  |

### Historique (2/2 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `historique.historique` | branché | GET /api/relay/history?period=&type=&q= | → Historique | aucun montant pour un employé (HIS-03) |
| `historique.exporter` | branché | GET /api/relay/history/export?period=&type=&q= | → CSV ; 403 owner_only |  |

### Notifications (5/5 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `notifications.notifications` | branché | GET /api/relay/notifications | → Notification[] |  |
| `notifications.lire` | branché | POST /api/relay/notifications/{id}/read |  |  |
| `notifications.toutLire` | branché | POST /api/relay/notifications/read-all |  |  |
| `notifications.centre` | branché | GET /api/relay/notifications/center | → CentreNotifications | filtrées selon le rôle ; résumé du matin ; réglages du membre |
| `notifications.regler` | branché | PUT /api/relay/notifications/settings {push, approche, versements, heureResume, origine} | → Resultat {reglages} trop_tot \| trop_tard \| reserve_au_gerant | NTF-01 : jamais avant PR-NTF-RESUME-H |

### Messages (11/11 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `messages.fils` | branché | GET /api/relay/threads | → Fil[] |  |
| `messages.fil` | branché | GET /api/relay/threads/{id} | → Fil ; 404 → null |  |
| `messages.envoyer` | branché | POST /api/relay/threads/{id}/messages {texte, pieces, origine} (Idempotency-Key) | → Resultat {id} |  |
| `messages.demanderRappel` | branché | POST /api/relay/support/callback {motif, origine} (Idempotency-Key) | → Resultat {rappelAvant, programme} deja_demande |  |
| `messages.repondreVite` | branché | POST /api/relay/threads/{id}/quick-replies/{n} {origine} (Idempotency-Key) | → Resultat {id, rappelAvant?} ferme \| deja_demande | MSG-06 : seule écriture du fil logistique |
| `messages.ecrireAuSupport` | branché | POST /api/relay/support/requests {categorie, reference, texte, pieces, origine} (Idempotency-Key) | → Resultat {filId} reserve_au_gerant \| reference_invalide | AID-03 : crée un fil Support |
| `messages.support` | branché | GET /api/relay/support | → Support | SUP-HORAIRES, SUP-DELAI, moyenne 7 jours, rappel en attente |
| `messages.joignables` | branché | GET /api/relay/calls/reachable | → Joignable[] | DP-61 : livreur pendant sa mission, support pendant ses heures |
| `messages.appels` | branché | GET /api/relay/calls | → Appel[] | journal sans contenu |
| `messages.appeler` | branché | POST /api/relay/calls {cible, origine} (Idempotency-Key) | → Resultat {appel} ferme \| deja_en_cours | numéro masqué, jamais le vrai numéro |
| `messages.raccrocher` | branché | POST /api/relay/calls/{id}/end {origine} (Idempotency-Key) | → Resultat {appel} |  |

### Aide (4/4 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `aide.aide` | branché | GET /api/relay/help | → Aide | réponses éditées en console (AID-02), filtrées selon le rôle |
| `aide.fiche` | branché | GET /api/relay/help/sheets/{id} | → FicheAide ; 404 → null |  |
| `aide.registre` | branché | GET /api/relay/paper-register | → RegistrePapier |  |
| `aide.saisirLigne` | branché | POST /api/relay/paper-register/lines {panne, reference, code, heure, pieceVerifiee, signature, photo, pin, origine} (Idempotency-Key) | → Resultat {ligne} montant_du \| code_faux \| delai_depasse \| hors_panne | AID-04 : colis sans montant seulement, PR-PAPIER-SAISIE-H |

### Argent (gérant) (11/11 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `argent.argent` | branché | GET /api/relay/payouts/next | → Argent | gérant seul ; prochain versement (provisoire avant l’arrêté du jeudi minuit), caisse du jour, numéro, changement en cours, dette |
| `argent.versements` | branché | GET /api/relay/payouts | → Versement[] | relevé ligne par ligne, états prévu · envoyé · crédité · refusé · suspendu |
| `argent.versement` | branché | GET /api/relay/payouts/{id} | → Versement ; 404 → null |  |
| `argent.signalerNonRecu` | branché | POST /api/relay/payouts/{id}/not-received {origine} (Idempotency-Key) | → Resultat {reponseAvant} pas_encore_envoye \| deja_signale | VER-05 : réponse avant le lundi midi suivant, preuve de l’opérateur |
| `argent.changerNumero` | branché | POST /api/relay/payout-number {operateur, numero, origine} (Idempotency-Key) | → Resultat {codesEnvoyes, expireA} prefixe_inconnu \| prefixe_operateur \| meme_numero \| verification_en_cours | réseau obligatoire ; deux codes SMS (nouveau numéro, téléphone du gérant) |
| `argent.renvoyerCodes` | branché | POST /api/relay/payout-number/resend {origine} (Idempotency-Key) | → Resultat {expireA} trop_tot | OTP-RENVOI |
| `argent.confirmerNumero` | branché | POST /api/relay/payout-number/confirm {codes, origine} (Idempotency-Key) | → Resultat {suspendusJusqua, premierVersementLe} code_faux \| code_expire \| trop_essais | vérification par une personne (PR-NUM-VERIF-J) ; SMS « Ce n’est pas vous ? » à l’ancien numéro |
| `argent.annulerChangement` | branché | DELETE /api/relay/payout-number/pending {origine} | → Resultat aucune_demande |  |
| `argent.reverserDette` | branché | POST /api/relay/debt/pay {origine} (Idempotency-Key) | → Resultat {reference} aucune_dette \| deja_en_cours | ARL-05 : demande de paiement Mobile Money vers le numéro marchand BelivaY ; réseau obligatoire |
| `argent.rapport` | branché | GET /api/relay/reports?period=month\|quarter\|since_opening | → Rapport | RAP-01 à RAP-04 |
| `argent.releve` | branché | GET /api/relay/reports/statement?period=&format=pdf\|csv | → FichierReleve | RAP-03 |

### Qualité (6/6 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `qualite.trust` | branché | GET /api/relay/trust | → Trust | score, critères, tenue, alerte de seuil (ARL-15), journal des événements et des décisions |
| `qualite.avis` | branché | GET /api/relay/reviews | → Avis[] | anonymes (GEN-01) |
| `qualite.repondreAvis` | branché | POST /api/relay/reviews/{id}/reply {texte, origine} (Idempotency-Key) | → Resultat deja_repondu \| texte_vide | DP-39 : réponse privée dans la messagerie du client, jamais publiée |
| `qualite.signalerAvis` | branché | POST /api/relay/reviews/{id}/report {motif, origine} (Idempotency-Key) | → Resultat deja_signale | AVI-04 : insulte, donnée personnelle, hors-sujet |
| `qualite.paliers` | branché | GET /api/relay/tiers | → Palier[] |  |
| `qualite.contester` | branché | POST /api/relay/trust/{id}/contest {texte, origine} (Idempotency-Key) | → Resultat {reponseAvant} deja_contestee \| hors_delai \| non_contestable | TRU-07 : une fois, réponse sous PR-CONTESTATION-H |

### Mon relais (22/23 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `relais.relais` | branché | GET /api/relay/me/profile | → FicheRelais |  |
| `relais.demanderCapacite` | branché | POST /api/relay/capacity/requests {placesDeclarees, origine} (Idempotency-Key) | → Resultat {verification} sous_occupees \| identique \| deja_demandee | contractuel : demande à BelivaY (CAP-01, CAP-02, PAL-04 ; ARL-120) |
| `relais.annulerDemandeCapacite` | branché | DELETE /api/relay/capacity/requests/current {origine} | → Resultat aucune_demande |  |
| `relais.demanderHoraires` | branché | POST /api/relay/hours/requests {semaine, origine} (Idempotency-Key) | → Resultat deja_demandee \| invalide \| identique | contractuel : demande à BelivaY (ARL-121) |
| `relais.annulerDemandeHoraires` | branché | DELETE /api/relay/hours/requests/current {origine} | → Resultat aucune_demande |  |
| `relais.demanderCodeEquipe` | branché | POST /api/relay/members/otp {origine} (Idempotency-Key) | → Resultat {expireA} |  |
| `relais.ajouterEmploye` | branché | POST /api/relay/members {prenom, nom, telephone, droits, codeSms, origine} (Idempotency-Key) | → Resultat {id} equipe_complete \| code_faux \| invalide | SMS d’invitation valable PR-INVITATION-H |
| `relais.retirerEmploye` | branché | DELETE /api/relay/members/{id} {codeSms, origine} | → Resultat code_faux | jetons et appareils du membre révoqués (EQU-03) |
| `relais.reglerDroits` | branché | PUT /api/relay/members/{id}/rights {droits, origine} | → Resultat invalide |  |
| `relais.reinitialiserPin` | branché | POST /api/relay/members/{id}/pin-reset {origine} (Idempotency-Key) | → Resultat | SMS de création d’un nouveau PIN (EQU-04) |
| `relais.module` | branché | GET /api/relay/training/{module} | → ContenuModule ; 404 → null | sans les bonnes réponses |
| `relais.repondreQuiz` | branché | POST /api/relay/training/{module}/quiz {membre, reponses, origine} (Idempotency-Key) | → Resultat {score, reussi, fausses} | corrigé au serveur, seuil PR-FORMATION-QUIZ-PCT |
| `relais.reglerParametres` | branché | PUT /api/relay/settings {langue, origine} | → Resultat invalide | heure du résumé : notifications.regler (ARL-100) |
| `relais.deconnecterAppareil` | branché | DELETE /api/relay/account/devices/{id} | → Resultat |  |
| `relais.envoyerDocument` | branché | POST /api/relay/documents/{type} {photo, origine} (Idempotency-Key) | → Resultat non_demandee | seulement demandée, refusée, à fournir ou bientôt expirée (ARL-124) |
| `relais.contrat` | branché | GET /api/relay/agreement | → Contrat | convention signée, annexes, fiche d’ouverture |
| `relais.demanderModificationFiche` | branché | POST /api/relay/profile/requests {nom, repere, motif, origine} (Idempotency-Key) | → Resultat deja_demandee \| identique | PAR-03 : validation BelivaY |
| `relais.changerPin` | branché | POST /api/relay/auth/pin/change {ancien, nouveau, origine} (Idempotency-Key) | → Resultat pin_faux \| pin_trop_simple \| bloque \| identique |  |
| `relais.demanderDonnees` | branché | POST /api/relay/account/data-requests {origine} (Idempotency-Key) | → Resultat {pretLe} deja_demandee | loi n° 2024/017, PR-DONNEES-DELAI-J |
| `relais.demanderFin` | branché | POST /api/relay/account/closure {motif, origine} (Idempotency-Key) | → Resultat {effetLe} deja_demandee | BelivaY prononce la fin (ARL-26) ; même route que le client et le vendeur |
| `relais.annulerFin` | branché | DELETE /api/relay/account/closure {origine} | → Resultat aucune_demande | même route que acces.annulerFin : « aucune » du serveur devient « aucune_demande » |
| `relais.changerPhoto` | branché | POST /api/relay/me/avatar {photo\|null, origine} (Idempotency-Key) | → Resultat invalide | image carrée recadrée sur le téléphone ; relaya : POST /api/auth/profile/avatar/ existe |
| `relais.simulerAccord` | démonstration seulement | — |  | console BelivaY : accord d’une demande d’horaires ou de places |

### Hors connexion (6/6 branchées)

| Méthode | État | Route | Corps → réponse | Note |
|---|---|---|---|---|
| `horsligne.file` | sur le téléphone (sans route) | — |  | file sur le téléphone, localStorage « blv_r_file » ; actions expirées après PR-OFF-EXPIRATION-H (OFF-05) |
| `horsligne.regles` | branché | GET /api/relay/config?codes=PR-OFF-EXPIRATION-H,PHOTO-MAX-KO,PR-HL-REMISES,PR-PAPIER-SAISIE-H | → ReglesFile |  |
| `horsligne.mettreEnFile` | sur le téléphone (sans route) | — |  | charge {domaine, methode, args} sans PIN ; geste signé : preuve HMAC-SHA256(clé de l’appareil, origine.cle) |
| `horsligne.envoyerFile` | branché | POST /api/relay/sync/batch {actions} | → bilan | chaque action rejouée avec sa clé d’idempotence |
| `horsligne.noterReseau` | sur le téléphone (sans route) | — |  | heure de la perte du réseau |
| `horsligne.marquerRefaite` | sur le téléphone (sans route) | — |  | action expirée refaite : gardée au journal du téléphone |

<!-- connecteurs:fin -->

## 5. Ce qui reste au fournisseur réel (honnêtement)

- **SMS** (codes de connexion, d'équipe, du numéro de versement, alertes) : prestataire `apps.otp` « console » sur le
  serveur d'essai ; le vrai fournisseur SMS à brancher (MISE-EN-SERVICE.md).
- **Mobile Money** (paiement au comptoir, versements du vendredi, reversement d'une dette) : agrégateur « console » ;
  webhooks réels à brancher (`client_core.webhooks`).
- **Photos de preuve** (lot, remise, constats, retours, sorties, pièces d'activation) : l'appli envoie l'identifiant de
  la photo prise ; **aucune route du relais ne téléverse encore la photo elle-même** (le livreur a
  `POST /api/courier/media`). À créer : `POST /api/relay/media` (empreinte, poids ≤ PHOTO-MAX-KO, stockage S3 de
  `apps.prises`). La photo de profil, elle, est téléversée (`POST /api/relay/me/avatar`).
- **E-mail, lien de connexion par e-mail, compte Google** pour un membre du relais : le kit les sert pour le compte
  client (`apps.client_accounts`, `apps.otp`, prise Google `apps.prises`) en supposant un numéro vérifié du profil
  client ; rien n'est servi au membre d'un relais : non affichés en mode API.
- **Changer le numéro du compte d'un membre** : aucune route (l'employé est réinvité, le gérant passe par le support).
- **Temps réel** : relecture toutes les 3 s pendant une attente ; le flux `apps.temps_reel` (canal `relais`) reste à
  brancher pour pousser la confirmation du livreur ou du paiement.
- **Contrôle « Tout est en ordre »** : la demande part au client (`check-request`) ; l'application du client n'a pas
  encore de route pour répondre (`guichet.controle_client` sans vue).

## 6. À reporter dans le contrat (`backend-kit/openapi.yaml`, `backend-kit/outils/`)

- Registre `src/api/routes.ts` : les états deviennent `branche` · `telephone` · `demo` (plus de `a_brancher`) ; à
  régénérer (`outils/generer-openapi.mts` lit `CONNECTEURS_RELAIS`).
- `POST /api/relay/handover/{id}/complete` : `controle_requis` n'est plus un refus.
- `GET /api/relay/me/profile` : `position` peut être `null`.
- `POST /api/relay/payout-number/confirm` : le numéro reste l'ancien jusqu'à la revue ; `DELETE /api/relay/payout-number/pending` annule aussi un changement en revue.
- Routes d'essai `/api/_essai/relais/…` (hors contrat, `BELIVAY_ESSAI_ROUTES`).
- Route à créer : `POST /api/relay/media` (photos de preuve).
