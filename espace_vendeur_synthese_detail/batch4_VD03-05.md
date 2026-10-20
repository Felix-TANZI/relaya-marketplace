# Synthèse — Batch 4 : VD-03, VD-04, VD-05 (Espace vendeur)

---

# 1. VD-03 — Accès et ouverture de la boutique

- **Titre** : VD-03 — Accès et ouverture de la boutique
- **Code de suivi des actions** : VD-D04 (actions VD-D04.A01…, questions VD-D04.Q01…)
- **Pages / parties / actions** : 23 pages, 2 parties, 17 actions (VD-D04.A01 à A17)
  - Partie 01 — pages 1 à 11 : Connexion · Ouvrir ma boutique (étape 1/3)
  - Partie 02 — pages 12 à 23 : Publier et être payé (étapes 2-3) · Saisie assistée · Installer l'application

## 1.1 Écrans couverts

### Écran « Connexion »
- **Objectif** : faire entrer le vendeur en quelques secondes, avec un second facteur seulement sur appareil inconnu et la langue choisie avant toute saisie.
- **Éléments UI principaux** : carte nuit compacte, logo, bouton de langue (Français/English/Pidgin), composant SellerPromise (une phrase + trois gestes : vous préparez · le livreur emballe et livre · versé le vendredi sans frais), boutons Google/Apple, champ identifiant/e-mail + mot de passe (œil pour afficher), lien « Mot de passe oublié ? », bouton plein « Se connecter », aide « Nouveau téléphone ? Un code SMS vous sera demandé. », carte-lien « Pas encore vendeur ? Ouvrir ma boutique en deux minutes ». Écran secondaire « nouvel appareil » : 6 cases de code SMS, minuteur de renvoi, info appareil connectant (modèle/navigateur/ville/heure). Écran « mot de passe oublié » : identifiant/e-mail/téléphone, bouton « Recevoir le lien », bloc replié « Comment ça marche », lien « Contacter le support ».
- **Actions utilisateur** : se connecter (Google, Apple, identifiant+mdp) ; demander un code SMS et le valider (auto-actif au 6e chiffre, collage automatique) ; changer de numéro ; demander réinitialisation du mot de passe ; contacter le support ; aller vers l'ouverture de boutique.

### Écran « Ouvrir ma boutique » — étape 1 sur 3
- **Objectif** : ouvrir une boutique en deux minutes sans aucun papier.
- **Éléments UI principaux** : barre des trois étapes (Ouvrir → Publier → Être payé) via composant `OnboardingSteps(cur)` ; trois champs seulement (nom de boutique interne jamais montré au client, numéro vérifié par SMS, point de la boutique sur carte OpenStreetMap avec bouton « Me localiser » + zone calculée serveur, ex. Z4 · Mvog-Mbi/Mvog-Ada) ; bouton plein « Ouvrir ma boutique » ; bloc replié « Comment ça marche » ; lien « Se connecter ». Écran code de vérification identique à celui de connexion (numéro masqué, minuteur, « Changer de numéro », rappel « deux comptes au plus par téléphone »).
- **Actions utilisateur** : saisir nom/numéro/position ; localiser automatiquement ; valider le code SMS ; changer de numéro.

### Écran « Publier et être payé » — étapes 2 et 3
- **Objectif** : collecter les pièces KYC au moment où le vendeur est motivé (produits déjà en brouillon), un élément à la fois, puis faire signer un contrat de cinq lignes.
- **Éléments UI principaux (étape 2)** : barre d'étapes, message « Vos 12 produits en brouillon passent en ligne dès l'accord », trois lignes d'état (CNI recto, CNI verso, selfie preuve de vie, numéro MoMo de versement vérifié — au nom du titulaire), bouton plein qui nomme l'élément suivant (« Prendre le verso de la CNI »), compteur d'éléments restants, bloc replié « Comment ça marche », lien « Pas maintenant ? Ajouter d'autres produits ». Écran « vérification en cours » : délai annoncé (< 15 min en général, au plus tard 48 h ouvrées avec date/heure précise), récap des pièces envoyées, carte « produits en brouillon ». **Éléments UI (étape 3 — contrat)** : carte contrat en cinq lignes (taux de rétention 76,5 à 98 %, minimum 700 F/commande, versement vendredi sans frais, plafond de démarrage 500 000 F/commande jusqu'à 10 livraisons sans incident, résiliation 30 jours de préavis, aucune caution), lien « Lire le contrat complet », bloc replié « Pourquoi ce montant ? » (exemple chiffré), offre de découverte, interrupteur « Je suis immatriculé » (affiche RCCM/NIU seulement si activé), bouton plein « Signer le contrat ».
- **Actions utilisateur** : envoyer CNI recto/verso, selfie vidéo, vérifier numéro de versement ; ajouter d'autres produits pendant l'attente ; lire le contrat complet ; activer/désactiver « immatriculé » ; signer électroniquement.

### Écran « Saisie assistée »
- **Objectif** : mettre en ligne le catalogue des premières boutiques via un agent BelivaY qui photographie/saisit les produits, le vendeur validant ensuite.
- **Éléments UI principaux** : sous-en-tête avec retour vers « Mes produits », titre « N produits saisis pour vous » + phrase (agent, zone, date), trois groupes : **Prêts** (pastille « 4 contrôles sur 4 réussis », ligne produit avec vignette/prix/stock/crayon Modifier, bouton plein « Valider les N produits prêts »), **À vérifier** (carte produit avec pastilles, encadré ambre avec la raison, ex. prix 38 % sous le marché, boutons Valider/Modifier), **Doublon** (carte avec pastille « Rattachée à la fiche existante », Valider/Modifier) ; bloc replié « Comment ça marche » (visite agent, 4 contrôles, tarif).
- **Actions utilisateur** : valider en masse les produits « prêts » ; valider ou modifier un produit « à vérifier » ou « doublon » individuellement.

### Écran « Installer l'application »
- **Objectif** : installer l'espace vendeur sur l'écran d'accueil, en trois gestes ou en un bouton natif sur Android.
- **Éléments UI principaux** : titre + phrase, onglets iPhone/Android (44 px, celui du téléphone détecté par défaut), carte nuit compacte (icône, nom « BelivaY Vendeur », adresse seller.belivay.com), sur Android uniquement bouton plein « Installer l'application » (affiché seulement si `beforeinstallprompt` disponible) + aide, trois étapes numérotées avec icône de geste. Bloc replié « Pourquoi ? » (rapidité, hors connexion, notifications).
- **Actions utilisateur** : basculer entre onglets iPhone/Android ; déclencher l'installation native (Android) ; suivre les 3 étapes manuelles (Partager → Sur l'écran d'accueil pour iPhone ; Chrome ⋮ → Installer pour Android sans invite).

## 1.2 Tableau des actions numérotées (VD-D04.A01 à A17)

| ID | Description courte | Statut |
|---|---|---|
| VD-D04.A01 | Garder l'API d'authentification ; ajouter Apple (bouton noir/blanc selon thème) après Google ; identifiant ou e-mail ; un seul bouton plein « Se connecter » | — |
| VD-D04.A02 | Supprimer Facebook et « Se souvenir de moi » ; session longue par défaut ; POST /auth/2fa sur appareil inconnu (V14) | — |
| VD-D04.A03 | Remplacer la bannière par le composant SellerPromise (une phrase, trois gestes, bouton de langue FR/EN/Pidgin) | — |
| VD-D04.A04 | Remplacer « S'inscrire » par la carte-lien « Pas encore vendeur ? Ouvrir ma boutique en deux minutes » | — |
| VD-D04.A05 | Ajouter l'écran « Entrez le code reçu par SMS » (device_known=false), bouton actif au 6e chiffre, collage/remplissage auto | — |
| VD-D04.A06 | Ajouter le lien « Contacter le support » ; aucune réinitialisation sans vérification | — |
| VD-D04.A07 | Découper l'inscription en 3 étapes : POST /shops, POST /shops/{id}/kyc, POST /contract/sign ; composant OnboardingSteps(cur) | — |
| VD-D04.A08 | Ajouter le point de la boutique sur la carte (OpenStreetMap, « Me localiser »), zone calculée côté serveur | — |
| VD-D04.A09 | Contrôler côté serveur la limite de deux comptes par téléphone à POST /auth/otp | — |
| VD-D04.A10 | Ajouter le bloc replié « Comment ça marche » (fermé par défaut) | — |
| VD-D04.A11 | Vérifier le numéro de versement à l'étape 2 (réutiliser la vérification par code, au nom du titulaire de la CNI) au lieu de Paramètres | — |
| VD-D04.A12 | Brancher le prestataire KYC Smile ID (recoupement ANTIC, réponse < 15 min) ; CNI recto/verso puis selfie un par un | — |
| VD-D04.A13 | Ajouter le contrat en 5 lignes (dont plafond de démarrage), lien « Lire le contrat complet », signature électronique POST /contract/sign | — |
| VD-D04.A14 | Ne demander RCCM et NIU qu'aux professionnels (is_registered) | — |
| VD-D04.A15 | Lire le plafond de démarrage dans la console (starter_cap) et ne pas attribuer de commande > 500 000 F avant 10 livraisons sans incident | — |
| VD-D04.A16 | Créer l'écran Saisie assistée (GET /assisted-entry, groupes prêts/à vérifier/doublon, contrôles serveur) ; application agent séparée | — |
| VD-D04.A17 | Remplacer la ligne « Install the app » par l'écran guidé iPhone/Android (FR/EN/pidgin) ; bouton natif seulement si beforeinstallprompt existe | — |

*(Le document ne porte pas de statut V/D/Δ/P sur les actions elles-mêmes — ce statut n'existe que sur les règles CNX/OUV/KYC/SAI/INS listées ci-dessous.)*

### Règles citées avec statut (identifiant → statut)

| ID | Règle | Statut |
|---|---|---|
| CNX-01 | Second facteur : appareil inconnu, changement du numéro de versement, ajout d'un accès employé, changement de mot de passe (toujours) ; ouverture ordinaire (jamais) | Décidé |
| CNX-02 | Mot de passe ≥ 8 caractères dont un chiffre | Décidé |
| CNX-03 | 5 mots de passe faux : blocage 15 min, notification au propriétaire | Proposé |
| CNX-04 | Code SMS 6 chiffres, 10 minutes, 3 renvois par heure au plus | Proposé |
| CNX-05 | Français/English/Pidgin choisis avant la connexion, mémorisés | Décidé |
| CNX-06 | « Valider le code » inactif avant 6 chiffres | Proposé |
| CNX-07 | Lien « Contacter le support » toujours visible pour qui n'a plus son numéro | Proposé |
| ENT-01 (client) | La promesse en grand | Décidé |
| ENT-03 (client) | Google en premier, e-mail en second | Décidé |
| OUV-01 | Étape 1 = nom, numéro vérifié, point sur la carte ; rien d'autre | Décidé |
| OUV-02 | Nom de boutique interne, jamais montré au client (A1) | Décidé |
| OUV-03 | Deux comptes au plus par appareil (B2) | Décidé |
| OUV-04 | Aucune caution, aucun dépôt, aucun frais d'entrée (B4) | Décidé |
| OUV-05 | Même barre des trois étapes sur chaque écran du parcours, un seul bouton plein | Proposé |
| KYC-01 | Étape 2 : CNI recto/verso, selfie preuve de vie, numéro MoMo de versement vérifié par code, au nom du titulaire | Décidé |
| KYC-02 | Brouillons en ligne dès l'accord, sans autre geste | Décidé |
| KYC-03 | Étape 3 : contrat signé électroniquement ; RCCM/NIU seulement si immatriculé | Décidé |
| KYC-04 | Premier versement le vendredi qui suit la libération de la première vente | Décidé |
| KYC-05 | Offre de découverte : 3 points gardés en plus pendant 3 mois ou 50 commandes, dès la première commande payée | Décidé |
| KYC-06 | Le bouton plein nomme l'élément suivant ; « Envoyer pour vérification » seulement quand tout est fourni | Proposé |
| KYC-07 | Contrat complet lisible avant la signature | Proposé |
| KYC-08 | On peut quitter l'étape 2 pour ajouter des produits ; éléments reçus acquis | Proposé |
| KYC-09 | Plafond de démarrage 500 000 F par commande jusqu'à 10 commandes livrées sans incident, écrit dans le contrat (C10) | Proposé |
| SAI-01 | Fiche saisie par un agent publiée seulement après validation du vendeur | Décidé |
| SAI-02 | Quatre contrôles : photo, doublon, prix aberrant, description copiée | Décidé |
| SAI-03 | Gratuit pour les premières boutiques, puis 5 000 F la session | Proposé |
| SAI-04 | Produits aux 4 contrôles réussis validés en une fois ; les autres un par un avec la raison | Proposé |
| INS-01 | Onglet du système choisi par défaut | Décidé |
| INS-02 | Une fois installée, s'ouvre sur l'accueil et garde la session | Décidé |
| INS-03 | Android : invite native en bouton plein si le navigateur le permet, sinon masqué | Décidé |

## 1.3 Règles métier et calculs clés (chiffres exacts)

- Mot de passe : **≥ 8 caractères dont un chiffre**.
- Blocage après **5 mots de passe faux** : **15 minutes**, notification au propriétaire.
- Code SMS : **6 chiffres**, valable **10 minutes**, **3 renvois par heure** au plus.
- Lien « mot de passe oublié » : valable **15 minutes** (côté vendeur).
- Limite de **2 comptes au plus par téléphone** (contrôlée à `POST /auth/otp`).
- KYC : réponse automatique **< 15 minutes** en général ; en cas de doute, revue humaine **≤ 48 heures ouvrées** (exemple concret : réponse au plus tard « mercredi 23 sept. à 18 h »).
- Rétention vendeur (contrat) : **de 76,5 % à 98 %** selon catégorie, prix et palier ; **minimum 700 F par commande** sur les petits prix.
- Versement : **le vendredi**, **sans frais**.
- **Plafond de démarrage : 500 000 F par commande**, jusqu'à **10 commandes livrées sans incident** (`starter_cap: {amount: 500000, orders: 10}`, compteur `delivered_clean`).
- Résiliation avec **30 jours de préavis** ; **aucune caution**.
- Exemple de calcul du contrat : ITEL AC52 vendu **20 000 F → le vendeur garde 17 840 F**.
- Offre de découverte : **3 points gardés en plus**, pendant **3 mois ou 50 commandes**, dès la première commande payée.
- Palier de lancement des 2 premiers mois (selon produits actifs) : **Argent ≥ 15**, **Or ≥ 40**, **Platine ≥ 80** produits actifs.
- Saisie assistée : **gratuit pour les premières boutiques**, puis **5 000 F la session** (nombre de « premières boutiques » non chiffré — cf. questions ouvertes).
- Couleur de la marque PWA : **#F7F3EE** ; nom de l'app « BelivaY Vendeur ».

## 1.4 Endpoints API et événements

- `POST /auth/login` → `{token}` ou `{need_2fa: true, challenge_id}`
- `POST /auth/2fa {challenge_id, code}`
- `POST /auth/otp`
- `POST /auth/verify`
- `POST /shops {name, phone, lat, lng}` → `{shop_id, zone}` (étape 1)
- `POST /shops/{id}/kyc` multipart `{id_front, id_back, selfie_video, payout_msisdn}` → `{status: pending, answer_before}` (étape 2)
- Webhook KYC → notification + SMS
- `POST /contract/sign` (version, horodatage, IP, appareil ; PDF archivé dans Documents) (étape 3)
- `GET /assisted-entry`, `POST /assisted-entry/{id}/approve`, `POST /assisted-entry/approve`
- Composants front : `SellerPromise`, `OnboardingSteps(cur)`, carte OpenStreetMap, `inputmode="numeric"`, `autocomplete="one-time-code"`
- Champs serveur notables : `starter_cap`, `delivered_clean`, `is_registered`

## 1.5 Erreurs et cas limites mentionnés

- « Identifiant ou mot de passe incorrect · encore n essais »
- « Code incorrect »
- « Connexion bloquée 15 min. Un message a été envoyé au propriétaire. »
- « Deux comptes au plus par téléphone. »
- « Posez le point à la main sur la carte. »
- « Photo difficile à lire : reprenez-la à plat, sans reflet. »
- « Nous n'avons pas pu vous reconnaître : réessayez à la lumière du jour. »
- « Ce numéro n'est pas à votre nom : il doit correspondre à votre pièce d'identité. »

## 1.6 Questions ouvertes à trancher (recopiées)

- **VD-D04.Q01** (partie 01) : Lien « mot de passe oublié » : 15 minutes côté vendeur, 30 minutes côté client (CAP-16) — harmoniser ?
- **VD-D04.Q02** (partie 01) : OUV-03 « deux comptes par appareil » contre libellé « deux comptes par téléphone » et contrôle au numéro (POST /auth/otp) : appareil ou numéro ?
- **VD-D04.Q03** (partie 02) : Plafond de démarrage 500 000 F : « Proposition (C10) » — valeur Proposée à confirmer ; C10 ici = proposition du dossier vendeur (distinct du C10 client non défini).
- **VD-D04.Q04** (partie 02) : Palier des 2 premiers mois selon le nombre de produits actifs (Argent ≥ 15, Or ≥ 40, Platine ≥ 80) : absent des documents client/relais — vérifier cohérence avec VD-10.
- **VD-D04.Q05** (partie 02) : Tarif de la saisie assistée (5 000 F la session après les premières boutiques) : « premières boutiques » non chiffré.

## 1.7 Contradictions internes ou incohérences apparentes (signalées, non résolues)

- Délai « mot de passe oublié » : **15 min** (vendeur, CNX/Fig.3) vs **30 min** (client, CAP-16).
- OUV-03 parle de limite « par appareil » dans son intitulé (B2), mais le libellé produit et le contrôle serveur (`POST /auth/otp`) portent sur le **numéro de téléphone** — ambiguïté appareil vs numéro non résolue.
- Le plafond de démarrage de 500 000 F est étiqueté « C10 » mais ce C10 (vendeur) est distinct d'un C10 côté client non défini ailleurs — risque de confusion d'identifiants entre documents.
- Le palier de lancement basé sur le nombre de produits actifs (Argent ≥ 15 / Or ≥ 40 / Platine ≥ 80) n'apparaît dans aucun document client ou relais — cohérence à vérifier avec VD-10.
- Le tarif de saisie assistée (5 000 F/session) s'applique « après les premières boutiques », un seuil numérique non précisé dans le document.

---

# 2. VD-04 — Accueil, à faire et états

- **Titre** : VD-04 — Accueil, à faire et états
- **Code de suivi des actions** : VD-D05 (actions VD-D05.A01…, questions VD-D05.Q01…)
- **Pages / parties / actions** : 24 pages, 2 parties, 18 actions (VD-D05.A01 à A18)
  - Partie 01 — pages 1 à 12 : Accueil (« ce qu'il y a à faire »)
  - Partie 02 — pages 13 à 24 : Rien à faire · Premier jour · États du compte (hors connexion, compte suspendu)

## 2.1 Écrans couverts

### Écran « Accueil » — ce qu'il y a à faire
- **Objectif** : dire au vendeur en une seconde ce qu'il doit faire maintenant, si sa boutique est ouverte, et ce qu'il garde — sans aucun graphique ni tuile de chiffres au-dessus du travail.
- **Éléments UI principaux** : en-tête en verre (menu, logo, thème, langue, cloche, avatar, pastilles état ouverture/palier-score/plan) ; carte d'une ligne « Boutique ouverte · jusqu'à 18 h » + bouton « Fermer aujourd'hui » ; titre « N choses à faire » trié par temps restant (à préparer, litiges, retours) ; **une seule carte héros orange** pour la commande la plus urgente (délai relatif, article, échéance, créneau livreur, montant « Vous gardez », bouton plein « C'est prêt », liens Rupture/Plus de temps/Détail de 44 px) ; cartes payable-au-retrait (bande ambre « Vous garderez… rien n'est encaissé ») ; cartes litige (motif, échéance, « Gelé jusqu'à la décision · montant », bouton « Répondre ») ; carte retour (« Gelé jusqu'à l'inspection · montant », « Voir le retour ») ; ligne discrète stock bas tout en bas. Variantes : « fermé aujourd'hui » (pastille rouge, bouton « Rouvrir maintenant »), « alerte avant un seuil » (carte ambre calme sans bouton plein, ex. « Votre score approche de 65 »), « accès Préparation » (mêmes cartes mais sans aucun montant, ligne « montants et versements réservés au propriétaire »).
- **Actions utilisateur** : marquer une commande prête (« C'est prêt ») ; signaler rupture ; demander plus de temps ; voir détail ; fermer/rouvrir la boutique pour la journée ; répondre à un litige ; voir un retour ; réapprovisionner (ouvre l'offre) ; masquer une alerte de seuil ; voir son palier.

### Écran « Rien à faire »
- **Objectif** : quand la file est vide (et seulement alors), montrer ce que le vendeur a gagné et son prochain versement, et proposer une seule action : ajouter un produit demandé.
- **Éléments UI principaux** : carte d'état boutique ouverte ; titre « Rien à faire pour l'instant » ; carte clé nuit « Gagné avec BelivaY » (montant cumulé, montant à venir ce soir, prochain versement daté avec détail) ; unique action pleine « Une idée pour vendre plus » → « Ajouter ce produit » ; récap mensuel (montant gardé/ventes libérées, nb commandes, 0 F d'impayés, 0 F de transport) ; lien produit le plus rentable ; lien progrès palier.
- **Actions utilisateur** : ajouter le produit suggéré (pré-rempli) ; consulter le détail du mois ; voir palier.

### Écran « Premier jour »
- **Objectif** : accompagner le vendeur qui vient de signer, via trois gestes pour recevoir ses premières commandes.
- **Éléments UI principaux** : titre « Bienvenue [prénom] · jour 1 » ; carte « Trois gestes pour commencer » (le geste suivant non fait porte le seul bouton plein, ex. « Ajouter un produit » ; les autres en lignes cliquables ; geste fait coché vert) ; carte « Plus vous publiez, plus vous gardez » (médaille palier de lancement, produits en vente / seuil suivant, barre de progression, bloc replié « Comment ça marche » avec les 4 paliers) ; carte « Offre de découverte » ; bloc « Besoin d'aide ? » (saisie assistée, support WhatsApp).
- **Actions utilisateur** : effectuer le geste suivant mis en avant (ajouter produit, régler horaires, vérifier numéro de versement) ; consulter le détail des paliers ; accéder à la saisie assistée ou au support.

### États du compte — hors connexion et compte suspendu
- **Objectif** : dire clairement ce qui se passe sans réseau ou en cas de suspension, et l'action possible ensuite.
- **Éléments UI principaux (hors connexion)** : bandeau nuit « Pas de connexion. Données de HH:MM. » ; commande à préparer avec bouton « C'est prêt » et « Code de remise » actifs ; carte « N actions en attente » avec bouton « Réessayer » et détail heure/lieu de chaque action ; bloc replié « Comment ça marche ». **Éléments UI (compte suspendu)** : carte rouge « Compte suspendu · niveau N », date/heure, mention « Proposée par le système, validée par un membre de l'équipe BelivaY », motif écrit, bouton blanc unique « Contester cette décision » (masqué si déjà contesté), sections « Ce que vous pouvez encore faire » / « Ce qui est bloqué », bloc replié (période probatoire, 4 niveaux, lien sanctions).
- **Actions utilisateur** : préparer/valider une commande hors connexion, donner le code de remise, relancer l'envoi des actions en attente ; contester une suspension (une seule fois).

## 2.2 Tableau des actions numérotées (VD-D05.A01 à A18)

| ID | Description courte |
|---|---|
| VD-D05.A01 | Supprimer les StatTile de l'accueil (CA mensuel, Commandes, Clients uniques, Note boutique) ; « Clients uniques » disparaît partout (anonymat) |
| VD-D05.A02 | Supprimer graphique de revenus, heatmap, « Performance rapide » (chiffres déplacés dans « Mes chiffres », VD-10) |
| VD-D05.A03 | Retirer la bannière « Plan Pro » et l'objectif mensuel de l'accueil (plans déplacés dans « Plans & tarifs ») |
| VD-D05.A04 | Remplacer « Dernières commandes » par la file « à faire » (GET /seller/today, TodoCard par type, keep_amount/frozen_amount serveur) |
| VD-D05.A05 | Remplacer « Alertes stock » par une ligne LowStockRow discrète en bas |
| VD-D05.A06 | Ajouter la carte d'état « Boutique ouverte · jusqu'à 18 h » avec « Fermer aujourd'hui » (POST /shop/closed-today) et pastille d'état |
| VD-D05.A07 | Mettre « C'est prêt » directement dans la carte (POST /orders/{id}/ready) + liens Rupture/Plus de temps/Détail de 44 px |
| VD-D05.A08 | Ajouter la carte d'alerte avant un seuil (score.threshold_near, recalcul de nuit, dédoublonnage 7 jours, « Masquer ») |
| VD-D05.A09 | Servir l'accès Préparation sans montants ni alertes côté serveur (rôle lu en session) ; signer chaque action (actor_id) |
| VD-D05.A10 | Remplacer « Sans réponse, la décision est prise en faveur du client » par la formule v3 « présomption en faveur du client ; BelivaY décide » |
| VD-D05.A11 | Supprimer les états vides des composants statistiques (tuiles à 0, « Aucune vente enregistrée », « Top produits » vide) |
| VD-D05.A12 | Ajouter le compteur « Gagné avec BelivaY » et le prochain versement (GET /money/earnings?scope=lifetime, GET /payouts/next) |
| VD-D05.A13 | Ajouter « Une idée pour vendre plus » (GET /demand?limit=1) ouvrant « Nouvelle offre » pré-remplie, seul bouton plein |
| VD-D05.A14 | Corriger le montant du palier : 324 F (et non 600 F de V11) |
| VD-D05.A15 | Remplacer les badges de progression par OnboardingSteps (GET /seller/onboarding) ; bouton plein sur le premier done=false ; seuils lus du serveur |
| VD-D05.A16 | Ajouter le lien vers la saisie assistée sous « Besoin d'aide ? » |
| VD-D05.A17 | Ajouter le cache chiffré et la file d'actions signées (service worker, IndexedDB, origin_time, origin_geo, expiration 72 h) |
| VD-D05.A18 | Ajouter l'écran « Compte suspendu » à la place de l'accueil (GET /account/status), bouton « Contester » masqué si appeal_id existe |

### Règles citées avec statut

| ID | Règle | Statut |
|---|---|---|
| ACC-01 | File des choses à faire triée par temps restant ; aucun chiffre ni graphique au-dessus | Décidé |
| ACC-02 | Une carte = un fait, un délai, un bouton plein ; liens Rupture · Plus de temps · Détail de 44 px | Décidé |
| ACC-03 | Une seule carte héros orange (DS-06) | Décidé |
| ACC-04 | Payable au retrait : bande ambre « Vous garderez » + « Rien n'est encaissé… Un refus ou un non-retrait ne vous coûte rien. » | Décidé |
| ACC-05 | Litige : motif, temps restant, « Gelé jusqu'à la décision », « Sans réponse, la décision est prise en faveur du client. » | Décidé |
| ACC-06 | Stock bas tout en bas, discret | Décidé |
| ACC-07 | « Fermer aujourd'hui » suspend immédiatement l'attribution jusqu'au lendemain à l'ouverture ; aussi dans Horaires (VD-11) | Décidé |
| ACC-08 | Toujours « Vous gardez », jamais une commission (V02, 22 sept.) | Décidé |
| ACC-09 | Pastilles et badges = même valeur que la file au même instant | Décidé |
| ACC-10 | Chiffres de l'accueil seulement si la file est vide | Décidé |
| ACC-11 | Jamais de graphique ni de heatmap vide | Décidé |
| ACC-12 | « Zéro impayé » et « 0 F de transport » affichés comme bénéfices réels | Recommandé |
| ACC-13 | Progrès dit en francs gardés (ex. « vous garderez 324 F de plus par ITEL ») | Décidé |
| ACC-14 | « Premier jour » remplace l'accueil tant que les 3 gestes ne sont pas faits et qu'aucune commande n'est arrivée | Recommandé |
| ACC-15 | Palier de lancement selon les produits actifs pendant 2 mois après la signature | Décidé |
| ACC-16 | Geste fait coché vert, reste visible | Proposé |
| ACC-17 | Un seul montant par carte, libellé à gauche, montant à droite | Décidé |
| ACC-18 | Délai relatif en haut à droite, heure en clair dans le corps | Décidé |
| ACC-19 | Cibles ≥ 44 px ; texte ≥ 13 px, légendes ≥ 12 px ; contraste ≥ 4,5:1 | Décidé |
| ACC-20 | État calme : un seul bouton plein « Ajouter ce produit » sous la carte clé ; montant non répété | Décidé |
| ACC-21 | Premier geste non fait = seul bouton plein ; seuils des paliers repliés | Décidé |
| ACC-22 | Avant chaque seuil de palier/sanction : notification + carte « Votre score approche de N » avec gain en francs et 2-3 gestes (V11) | Décidé |
| ACC-23 | Carte d'alerte calme (ambre, sans bouton plein), après les cartes datées, avant « Stock bas » ; une seule à la fois ; « Voir mon palier », « Masquer » | Recommandé |
| ACC-24 | score.threshold_near une fois par seuil et par semaine ; « Masquer » jusqu'au prochain envoi ; notification « Palier », jamais en SMS | Décidé |
| ACC-25 | Alerte à 3 points ou moins du seuil (montée : sous le seuil suivant ; descente : au-dessus de seuil − 5) | Proposé |
| ACC-26 | Accès Préparation : même file, mêmes délais/actions, aucun montant ni alerte ; ligne « montants et versements réservés au propriétaire » | Décidé |
| ACC-27 | Accès Préparation peut marquer prêt, rupture, délai, répondre litige, ouvrir retour, stock, « Fermer aujourd'hui » ; actions signées | Recommandé |
| DEC-04 (client) | 10 à 20 % des emplacements de l'accueil pour les nouveaux produits-vendeurs, au score neutre | Décidé |
| OFF-01 | Sans réseau : commandes à préparer et code de remise | Décidé |
| OFF-02 | En file : marquer prêt, photo, stock ; montants datés | Décidé |
| OFF-03 | Attend le réseau : numéro de versement, litige, publication | Décidé |
| OFF-04 | Action de plus de 72 h expirée, non envoyée (J5) | Décidé |
| OFF-05 | Hors connexion : la commande à préparer en premier avec « C'est prêt » | Décidé |
| SUS-01 | Suspension : prépare les commandes reçues, voit son argent ; plus de commandes ni de publication | Décidé |
| SUS-02 | Date, motif écrit, lien de contestation | Décidé |
| SUS-03 | « Contester cette décision » seul bouton plein, « une seule fois », réponse sous 72 h ouvrées | Décidé |
| Règles client liées | PAN-20 (comptoir : « Validée », jamais « Payée » ; escrow au paiement sur place), CDE-20 (rupture : vendeur suivant Trust Score ≥ 75, ≤ +5 %, écart payé par BelivaY, sinon remboursement le jour même), CDR-01 (anonymat) | Décidé |

## 2.3 Règles métier et calculs clés (chiffres exacts)

- File d'accueil = commandes à préparer + litiges ouverts + retours à inspecter, **triée par (t_échéance − t_now)** ; exemple : 2 + 2 + 1 = **5 choses à faire**.
- Stock bas si **stock ≤ seuil_alerte** (exemple : 3 restants pour un seuil de 5).
- Exemple de délai de préparation : commande payée **08 h 42 → prête avant 12 h 42** (soit **4 heures ouvrées**).
- Alerte de seuil : exemple **65 − 62,7 = 2,3 points ⇒ « Plus que 2 points » (affiché arrondi : 65 − 63)**.
- Descente de palier : passage sous le seuil Argent (**60**) pendant **14 jours** ⇒ repasse Bronze (validé par un humain).
- Gain de palier chiffré : **18 164 − 17 840 = 324 F** de plus par article (et non 600 F comme dans une version antérieure V11 — **correction explicite**).
- Alerte de seuil déclenchée à **3 points ou moins** du seuil ; hystérésis : descente confirmée seulement **au-dessus de seuil − 5** (proposé).
- Alerte de seuil : envoyée **au plus une fois par seuil et par semaine**, jamais par SMS.
- Offre de découverte (Premier jour) : **3 points de plus (3 % du prix)** sur chaque vente, **dès la première commande payée**, pendant **3 mois ou 50 commandes**.
- Palier de lancement (2 premiers mois après signature) : **Bronze** par défaut, **Argent ≥ 15** produits actifs, **Or ≥ 40**, **Platine ≥ 80** ; ensuite le Trust Score décide.
- Exemple « Rien à faire » : **53 520 FCFA** gagnés (3 × 17 840 F) à 09 h 48 ; **71 360 F prévus à 18 h** quand une commande se libère ; prochain versement **vendredi 25 sept. : 35 680 F** (17 840 F déjà prêts + 17 840 F libérés le soir) ; mois de septembre : **53 520 F gardés sur 60 000 F de ventes libérées**, **9 commandes**, **0 F d'impayés**, **0 F de transport**.
- Hors connexion : file d'actions signées avec `origin_time`/`origin_geo`, **expiration à 72 heures** (règle J5).
- Suspension : contestation possible **une seule fois**, réponse humaine sous **72 heures ouvrées** ; suspension de **niveau 3** ⇒ **score gelé sous 40** et **période probatoire = 100 % des commandes contrôlées au ramassage** ; **4 niveaux de sanction** au total.
- Accessibilité : cibles tactiles **≥ 44 px**, texte **≥ 13 px**, légendes **≥ 12 px**, contraste **≥ 4,5:1**.

## 2.4 Endpoints API et événements

- `GET /seller/today` → `keep_amount`/`frozen_amount`, `alerts[] {id, type, direction, threshold: 65, target_tier: "argent", points_to_go: 2, keep_gain: 324, product, gestures}`
- `POST /orders/{id}/ready`
- `POST /shop/closed-today {closed: true, until: "2026-09-22T08:00"}`
- `POST /seller/alerts/{id}/dismiss`
- `GET /money/earnings?scope=lifetime`
- `GET /payouts/next` (`next_release_amount`, `next_release_at`)
- `GET /demand?limit=1`
- `GET /seller/onboarding` → `{steps:[{key, done}], launch_tier:{current, active_products, thresholds:[15,40,80], ends_at}}` (seuils lus en console, V15)
- `GET /account/status` → `{status, level, reason, since, allowed, blocked, appeal_id}`
- Événement `score.threshold_near` ; route `accueil?alerte=1` ; route `accueil?role=prep`
- Composants front : `TodoCard`, `LowStockRow`, `OnboardingSteps`
- Champ `actor_id` pour signer les actions de l'accès Préparation

## 2.5 Erreurs et cas limites mentionnés

- « Pas de connexion · données de 09 h 14 »
- « Le livreur est en route : fermez après sa remise. »
- 403 « Votre accès a été retiré par le propriétaire. »
- « Cette action n'a pas pu partir à temps : refaites-la. »
- Conflit de stock modifié entre-temps : **la valeur la plus récente est gardée, avec l'heure**.

## 2.6 Questions ouvertes à trancher (recopiées)

- **VD-D05.Q01** (partie 01) : ACC-05 : « la décision est prise en faveur du client » contre la présomption v3 (déjà ouvert).
- **VD-D05.Q02** (partie 01) : Numérotation ACC : saut de ACC-09 à ACC-17 et de ACC-19 à ACC-22 dans ce morceau (ACC-10 à 16, 20, 21 à retrouver dans la suite du document).
- **VD-D05.Q03** (partie 02) : Offre de découverte : « 3 points de plus (3 % du prix) » alors que la formule VD-02 est × 0,80 sur la commission (≈ 2,7 points pour un taux de 13,5 %) : libellé à préciser (« environ 3 points »).

## 2.7 Contradictions internes ou incohérences apparentes (signalées, non résolues)

- **ACC-05** formule « Sans réponse, la décision est prise en faveur du client » contredit la « présomption v3 » évoquée ailleurs (« présomption en faveur du client ; BelivaY décide ») — l'action VD-D05.A10 corrige déjà ce texte, mais la question reste listée comme ouverte.
- **Numérotation ACC non contiguë** dans le document : ACC-09 saute directement à ACC-17, et ACC-19 à ACC-22 — signe que des règles (ACC-10 à 16, 20, 21) sont définies ailleurs dans le document (confirmé, elles apparaissent bien en partie 02) mais la rupture de séquence dans la partie 01 est explicitement signalée comme suspecte par le document lui-même.
- **Offre de découverte** : le texte utilisateur dit « 3 points de plus (3 % du prix) » mais le calcul réel selon VD-02 (×0,80 sur la commission) donnerait environ **2,7 points** pour un taux de 13,5 % — écart entre le libellé arrondi et la formule exacte.
- **Montant du palier corrigé** : le document signale lui-même une erreur antérieure (V11 affichait 600 F au lieu de 324 F) — déjà traitée par l'action A14, mais illustre un historique de chiffres erronés à surveiller.

---

# 3. VD-05 — Commandes et préparation

- **Titre** : VD-05 — Commandes et préparation
- **Code de suivi des actions** : VD-D06 (actions VD-D06.A01…, questions VD-D06.Q01…)
- **Pages / parties / actions** : 24 pages, 2 parties, 18 actions (VD-D06.A01 à A18)
  - Partie 01 — pages 1 à 14 : Commandes reçues · Commande à préparer
  - Partie 02 — pages 15 à 24 : Rupture · Besoin de plus de temps · Bon de préparation · Journal de la commande

## 3.1 Écrans couverts

### Écran « Commandes reçues »
- **Objectif** : ranger toutes les commandes dans l'ordre du travail, avec état, échéance et montant gardé lisibles d'un coup d'œil, via une phrase d'état qui fait toujours la somme.
- **Éléments UI principaux** : phrase d'état récapitulative (ex. « 9 commandes · 2 à préparer · 2 en litige · 1 en retour · 4 terminées ») ; quatre filtres avec compteur (À préparer par défaut, En cours, Terminées, Problèmes) ; carte commande (échéance/délai relatif en haut, article en gros, classe de colis S/M/L/XL, référence, heure de paiement, montant « Vous gardez » en vert, livreur du créneau, bouton plein « C'est prêt » sur la commande la plus urgente uniquement, liens Rupture/Plus de temps/Bon de préparation) ; carte payable-au-retrait (étiquette ambre, bouton doux) ; carte terminée (état de l'argent : « Se libère aujourd'hui à 18 h », « À verser vendredi… », « Versé le… ») ; carte problème (étiquette rouge « Litige — gelé » ou « En retour — gelé », montant gelé, « Répondre au litige » / « Voir le retour ») ; menu ⋮ (Exporter, Factures) ; règle d'anonymat rappelée sous les cartes.
- **Actions utilisateur** : filtrer par état ; ouvrir une commande (toucher le haut de la carte) ; marquer prête ; exporter ; consulter factures ; répondre à un litige ; voir un retour.

### Écran « Commande à préparer »
- **Objectif** : dire en une carte quoi préparer, avant quelle heure, avec un seul bouton pour dire « c'est prêt » — le vendeur ne fait pas le colis lui-même.
- **Éléments UI principaux** : pastilles d'état (« À préparer », « Payée » ou « Payable au retrait ») ; carte clé (délai relatif, barre de progression réelle, heure de paiement + fenêtre de préparation, article en gros avec référence, rappel « Mettez de côté : chargeur/câble/boîte », bouton plein « C'est prêt ») ; montant « Vous gardez » + prix de vente ; bloc « Ramassage chez vous » (livreur nommé/photo/entreprise, créneau, « Vous ne faites pas le colis », bloc replié « Comment ça marche ») ; « Autres actions » en liste (Plus de temps, Rupture, Bon de préparation, Journal) ; règle d'anonymat.
- **Actions utilisateur** : marquer prête ; demander plus de temps ; signaler rupture ; ouvrir le bon de préparation ; consulter le journal.

### Écran « Rupture »
- **Objectif** : signaler en un geste l'indisponibilité de l'article, en lisant d'abord les conséquences, une par ligne.
- **Éléments UI principaux** : titre + phrase « signaler tôt coûte peu, se taire coûte cher » ; rappel commande ; liste « Ce qui va se passer » (vendeur suivant, sinon remboursement aujourd'hui, aucun frais, effet léger sur la Ponctualité) ; bloc replié « Comment ça marche » (seuils du vendeur suivant, effets exacts g1/g3, dissociation multi-vendeurs) ; interrupteur « Mettre le stock à 0 » (activé par défaut) ; boutons « Signaler la rupture » / « Annuler ».
- **Actions utilisateur** : activer/désactiver la mise à 0 du stock ; confirmer ou annuler la rupture.

### Écran « Besoin de plus de temps »
- **Objectif** : choisir une nouvelle heure de préparation une seule fois, en prévenant automatiquement client et livreur, sans jamais dépasser l'échéance absolue.
- **Éléments UI principaux** : rappel heure/délai actuel ; trois choix de nouvelle heure (+1h, +2h, demain à l'ouverture), chacun avec son effet sur le passage du livreur ; aide d'une ligne indiquant la limite absolue (choix au-delà grisés) ; liste « Ce qui va se passer » ; bloc replié « Pourquoi ? » ; bouton « Demander [durée] de plus ».
- **Actions utilisateur** : choisir une des trois options de report ; confirmer la demande.

### Écran « Bon de préparation »
- **Objectif** : fiche imprimable/partageable pour préparer sans erreur, sans aucune donnée client.
- **Éléments UI principaux** : en-tête (référence, classe de colis, heure de paiement, heure limite) ; article en très gros (modèle/variante/état/quantité/référence) ; liste de quatre cases « À vérifier avant l'arrivée du livreur » (bon modèle/couleur, neuf et testé, chargeur et câble mis de côté, boîte d'origine) ; rappel « Ne fermez rien » ; bloc « Ramassage chez vous » (livreur, créneau, consigne du code de remise) ; montant « Vous gardez » et délai de libération ; boutons « Imprimer » / « Partager en PDF ».
- **Actions utilisateur** : cocher les 4 vérifications ; imprimer ; partager en PDF.

### Écran « Journal de la commande »
- **Objectif** : montrer qui a fait quoi et quand sur la commande — preuve en cas de litige.
- **Éléments UI principaux** : titre + phrase « Chaque action est signée » ; fil chronologique inversé (action, auteur/rôle, heure, valeurs avant → après en pastilles) ; note « personne ne peut modifier ni effacer ce journal ».
- **Actions utilisateur** : consultation seule (aucune action de modification possible — table en ajout seul).

## 3.2 Tableau des actions numérotées (VD-D06.A01 à A18)

| ID | Description courte |
|---|---|
| VD-D06.A01 | Supprimer les six tuiles ; phrase d'état et compteurs par filtre renvoyés par GET /orders?state= |
| VD-D06.A02 | Retirer « Brut · commission 12 % · −42 000 » ; afficher kept_amount figé au paiement (V02) |
| VD-D06.A03 | Filtrer côté serveur state ∈ {paid, validated_cod} : aucune commande non payée ni non validée (E3) |
| VD-D06.A04 | Remplacer les filtres par À préparer · En cours · Terminées · Problèmes (state=prep/in_progress/done/problems) |
| VD-D06.A05 | Table unique de huit libellés côté serveur ; retirer la ville du client (« YAOUNDÉ ») ; money_state + date pour les terminées |
| VD-D06.A06 | Déplacer « Exporter » et « Factures » dans le menu ⋮ ; zone haute de la carte = lien #commande?ref= (remplace « Détails ») |
| VD-D06.A07 | Afficher échéance, temps restant (heures d'ouverture) et classe du colis (parcel_class, due_at, left_hours_open) |
| VD-D06.A08 | Retirer le stepper et « Confirmer » (confirmation automatique au paiement) ; ne garder que POST /orders/{id}/ready |
| VD-D06.A09 | Afficher le livreur du créneau (nom, photo, entreprise) dès l'attribution et « Vous ne faites pas le colis » avec « Comment ça marche » replié |
| VD-D06.A10 | Regrouper Plus de temps, Rupture, Bon, Journal dans « Autres actions » ; retirer « Plus de temps » après une prolongation |
| VD-D06.A11 | Ajouter « 100 000 F après 5 commandes sans incident » à PAN-10 cité ici |
| VD-D06.A12 | Ajouter l'écran de rupture (POST /orders/{id}/stockout, quatre conséquences, détail replié, interrupteur stock à 0) |
| VD-D06.A13 | Retirer l'annulation par le vendeur : la rupture la remplace |
| VD-D06.A14 | Afficher le texte de dissociation hors du bloc replié si la commande contient d'autres articles |
| VD-D06.A15 | Ajouter l'écran « Besoin de plus de temps » avec +1h, +2h, demain à l'ouverture (POST /orders/{id}/extend ; refus serveur au-delà de l'échéance absolue) |
| VD-D06.A16 | Remplacer l'encadré « Échéance absolue » et le tableau g1/g2 par une aide d'une ligne et un bloc « Pourquoi ? » replié |
| VD-D06.A17 | Ajouter le bon de préparation imprimable (GET /orders/{id}/slip), une seule liste de quatre cases, « Ne fermez rien », sans donnée client ni code |
| VD-D06.A18 | Ajouter « Journal de la commande » dans « Autres actions » (GET /orders/{id}/journal, table en ajout seul) |

### Règles citées avec statut

| ID | Règle | Statut |
|---|---|---|
| CMD-01 | Quatre filtres dans l'ordre du travail ; « À préparer » par défaut | Décidé |
| CMD-02 | La phrase d'état fait toujours la somme | Décidé |
| CMD-03 | « Vous gardez » en grand ; aucune ligne « Commission −X F » | Décidé |
| CMD-04 | Classe du colis (S, M, L, XL) sur la commande et le bon : fixe véhicule et tarif | Décidé |
| CMD-05 | Payable au retrait se prépare pareil ; refus ou non-retrait ne coûte rien | Décidé |
| CMD-06 | Le vendeur ne voit ni nom, ni numéro, ni quartier, ni relais du client, ni autres vendeurs | Décidé |
| CMD-07 | Commande en litige reste dans « Problèmes » jusqu'à la clôture | Décidé |
| CMD-08 | Seule la plus urgente porte « C'est prêt » en plein ; les autres en doux | Décidé |
| CMD-09 | Chaque carte commence par l'échéance / l'état de l'argent / l'état gelé | Décidé |
| CMD-10 | Haut d'une carte à préparer → commande ; carte terminée → reçu ; carte problème → litige ou retour | Décidé |
| Règles client liées | CDE-02 (commande en litige reste « En cours »), PAN-10 (comptoir : client fiable ; nouveau compte paiement d'avance ou 15 000 F ; panier ≤ 50 000 F), PAN-19 (jamais pour l'étranger, un gros colis ni l'express ; refus par produit), PAN-20 (« Validée », jamais « Payée ») | Décidé |
| PRE-01 | Un seul bouton plein « C'est prêt » | Décidé |
| PRE-02 | Le vendeur ne fait pas le colis : aucune consigne d'emballage ni code au marqueur | Décidé |
| PRE-03 | Livreur du créneau affiché (nom, photo) dès l'attribution | Décidé |
| PRE-04 | Barre de progression réelle : (maintenant − début) ÷ (échéance − début), en heures d'ouverture | Décidé |
| PRE-05 | Carte clé = échéance + article + « C'est prêt », visible sans défiler | Décidé |
| PRE-06 | Plus de temps, Rupture, Bon, Journal groupés dans « Autres actions » en lignes | Décidé |
| RUP-01 | Rupture en un geste, effets écrits avant la confirmation | Décidé |
| RUP-02 | Commande multi-vendeurs dissociée ; vendeur prévenu sans voir les autres vendeurs | Décidé |
| RUP-03 | Rupture signalée avant l'échéance : échec léger g1 ; non-préparation : g3 et sanction de niveau 2 | Proposé |
| RUP-04 | Conséquences en une ligne ; seuils, g1/g3, dissociation dans « Comment ça marche » | Décidé |
| CDE-20 (client) | Vendeur suivant (Trust ≥ 75, prix livré ≤ +5 %, écart payé par BelivaY), sinon remboursement intégral le jour même | Décidé |
| DEL-01 | Une seule prolongation par commande | Décidé |
| DEL-02 | Client et livreur prévenus automatiquement | Décidé |
| DEL-03 | Aucun choix au-delà de l'échéance absolue (24 h après paiement, article en stock) | Décidé |
| DEL-04 | Conséquences en une ligne ; g1 et g2 dans « Pourquoi ? » | Décidé |
| BON-01 | Aucune donnée du client ni lieu de retrait sur le bon | Décidé |
| BON-02 | Le code de remise ne figure jamais sur le bon | Décidé |
| JRN-01 | Chaque action signée et horodatée | Décidé |
| JRN-02 | Journal non modifiable, non effaçable, rejouable | Décidé |

## 3.3 Règles métier et calculs clés (chiffres exacts)

- Une commande **entre dans la liste vendeur** ⇔ **payée** OU (**payable au retrait ET validée**) (règle E3, V22).
- Exemple total : 2 (à préparer) + 2 (litige) + 1 (retour) + 4 (terminées) = **9 commandes**.
- Échéance de préparation = **début + 4 heures ouvrées**, ou le délai de la fiche produit (jusqu'à **7 jours sur commande**).
- **Échéance absolue : 24 heures** après le paiement (règle E4) — exemple : payée mardi à 08 h 42 ⇒ limite absolue mardi suivant 08 h 42.
- Huit libellés d'état commande : **Payée** (vert), **À préparer** (orange), **Chez le livreur** (encre), **Livrée** (vert), **Litige — gelé** (rouge), **En retour — gelé** (rouge), **Payable au retrait** (ambre), **Annulée** (encre) ; états d'argent : **Se libère** (orange), **À verser** (vert), **Versé le** (encre).
- Barre de progression de préparation = **(maintenant − début) ÷ (échéance − début)**, calculée en **heures d'ouverture**.
- Exemple : commande payée à **08 h 42 ⇒ prête avant 12 h 42** (4 h ouvrées) ; à 09 h 48, il reste **2 h 54**.
- **PAN-10** (client, cité ici) : panier client **≤ 50 000 F** au comptoir pour un client fiable ; nouveau compte : paiement d'avance ou **15 000 F** ; **+ 100 000 F après 5 commandes sans incident** (ajouté par l'action A11).
- **Rupture** : vendeur suivant si **Trust Score ≥ 75** et **prix livré ≤ +5 %** du prix initial (écart payé par BelivaY, jamais par le client) ; sinon **remboursement intégral le jour même**, vendeur non facturé ; effet **g1** si signalée avant l'échéance ; **g3 + sanction de niveau 2** si non préparée (proposition v1.2).
- **Prolongation (« Besoin de plus de temps »)** : **une seule fois par commande** ; options **+1 h**, **+2 h**, **demain à l'ouverture** ; jamais au-delà de l'échéance absolue (24 h après paiement) ; effet **g1** si le délai est tenu, **g2** si retard sans prévenir (proposition v1.2). *(Historique : un ancien prototype proposait +2 h / +4 h / demain 10 h — corrigé en V07.)*
- Bon de préparation : libération des fonds **3 jours après la confirmation** du client ; format **A4 ou ticket 80 mm**.
- Exemple chiffré récurrent : ITEL AC52 vendu **20 000 F → vendeur garde 17 840 F**.

## 3.4 Endpoints API et événements

- `GET /orders?state=prep|in_progress|done|problems` → `{counts, total, items}` avec par item : `ref`, `paid_at`/`validated_at`, `cod`, `due_at`, `left_open_minutes`, `article{name, variant, condition, qty, sku}`, `parcel_class`, `sale_price`, `kept_amount`, `courier{name, photo_url, company, slot}`, `delivered_at`, `money_state` (`releasing`/`to_pay`/`paid`), `money_date`, `payout_ref`
- `GET /orders/{id}`
- `POST /orders/{id}/ready`
- `POST /orders/{id}/stockout {set_stock_zero: true}`
- `POST /orders/{id}/extend {choice}` (choice = `1`, `2` ou `d`)
- `GET /orders/{id}/slip` (HTML et PDF)
- `GET /orders/{id}/journal` (table en ajout seul / append-only)

## 3.5 Erreurs et cas limites mentionnés

- Aucune section « Erreurs » dédiée n'apparaît explicitement dans ces deux parties (contrairement à VD-03/VD-04). Cas limites relevés dans le texte :
  - Refus serveur d'une prolongation au-delà de l'échéance absolue (choix grisé côté UI, refus côté serveur).
  - Dissociation obligatoire d'une commande multi-vendeurs lors d'une rupture (le vendeur en rupture ne voit jamais les autres vendeurs concernés).
  - Filtrage strict côté serveur : aucune commande non payée ni non validée ne doit apparaître dans la liste (E3).

## 3.6 Questions ouvertes à trancher (recopiées)

- **VD-D06.Q01** (partie 01) : PAN-10 cité sans le palier de 100 000 F (inter-espaces n° 25, déjà ouvert).
- **VD-D06.Q02** (partie 01) : Le vendeur voit l'entreprise du livreur (Wink Express) ; le client ne la voit jamais (CLI-26) : cohérent, à garder côté serveur.
- **VD-D06.Q03** (partie 02) : RUP-03 : non-préparation = g3 + sanction de niveau 2 (Proposé), alors que CL-16 CLI-39 dit « fermeture non annoncée au passage du livreur : g2 » et VD-02 « fermeture non annoncée : échec moyen » — vérifier la correspondance g1/g2/g3 dans VD-10.

## 3.7 Contradictions internes ou incohérences apparentes (signalées, non résolues)

- **RUP-03** (non-préparation ⇒ g3 + sanction niveau 2, Proposé) semble en tension directe avec deux autres sources : CL-16/CLI-39 (« fermeture non annoncée au passage du livreur : g2 ») et VD-02 (« fermeture non annoncée : échec moyen ») — la correspondance exacte g1/g2/g3 entre documents n'est pas établie, et le document le signale lui-même comme à vérifier dans VD-10.
- Asymétrie de visibilité assumée : le vendeur voit l'identité de l'entreprise de livraison (« Serge M. · Wink Express ») alors que le client ne la voit jamais (CLI-26) — présentée comme volontaire/cohérente mais mérite d'être confirmée comme choix produit définitif.
- PAN-10 est cité dans ce document sans son palier complémentaire de 100 000 F (déjà objet d'une question ouverte inter-espaces n° 25 ailleurs dans le corpus), ce qui suggère une version partiellement obsolète de la règle recopiée ici.
