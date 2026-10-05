# Passation — Espace client BelivaY

État au 3 octobre 2026, vérifié contre les documents du paquet (« 00 — À lire en premier »,
« 00 — Liste complète des actions », l'index général des 6 paquets et CL-01).
Ce document dit **ce qui a été fait**, **comment ça a été vérifié**, **ce qui reste ouvert**
et **les étapes à suivre**, une par une, jusqu'au site en ligne.

---

## 0. En bref

- **Dépôt** : `pengafranck12-code/PG-BelivaY` (privé), branche **`espace-client`**, à jour sur GitHub.
- **Dans la branche** : le paquet Espace client complet — documents d'entrée `00 — …`, les
  **173 PDF de `01_Documents`** (21 documents, 1 711 pages), le prototype mobile vérifié et corrigé,
  les pages HTML CL-00 à CL-16 et leurs figures, les 1 500 captures — plus la logique métier en
  données (`logique-metier/`) et le suivi des 1 669 règles et des 840 actions.
- **Source de référence sur le Mac** : `~/Documents/2 — BelivaY Espace client — paquet développeur/`.
  La branche lui est identique octet par octet, sauf les 3 fichiers corrigés (2.3).
- **Hors branche, à cause de sa taille** : la spécification complète en un PDF (135 Mo, au-delà de la
  limite de 100 Mo de GitHub). Ses 1 339 pages correspondent aux 17 documents CL-00 à CL-16
  (1 711 − 372 pages de R1 à R4), tous présents séparément (voir 4.1).
- **Hors branche, volontairement** : les vidéos et le dossier `05_Propositions_animations`.
- **Technologies prévues** (CL-00) : React pour le site, Django pour le serveur.
- **Étape 2 terminée** : inventaire des 147 pages dans `logique-metier/pages.md` (2.8).
- **Étape 3 terminée** : les 1 669 règles des 16 documents sont revues (2.9) ; 52 décisions du porteur enregistrées (2.10).
- **Étape 4 terminée et revérifiée (3 oct.)** : squelette React dans `site/`, **identique au prototype du
  1er octobre au pixel près** (décision du porteur) : feuille de styles, polices, icônes et navigation du
  prototype reprises par des outils ; 142 routes (89 ouvertes au lancement, 53 derrière un interrupteur, toutes
  ouvertes depuis DP-50) ;
  1 032 tests Playwright verts, dont 350 comparaisons au pixel avec le prototype (section 5).
- **Étape 5 terminée (3 oct.)** : le serveur de BelivaY existe déjà (`Felix-TANZI/relaya-marketplace`, en production) ;
  décision DP-45 : les calculs de la spécification sont écrits en Python pur dans `moteurs/`, puis intégrés à ce
  serveur. Moteurs écrits : frais, garde, comptoir, annulation, carte, délais, catalogue, litiges, notes,
  portefeuille, machines à états ; 358 tests verts sous Python 3.11 et 3.12, couverture 100 %.

---

## 1. Le projet et ses sources

### 1.1 Les six paquets BelivaY

L'index général (`Work définitif pro — 6 interfaces/00 — Index général des 6 paquets BelivaY.pdf`,
27 sept. 2026) décrit **six paquets autonomes**, un par interface :

| Paquet | Documents | Pages | Actions | Dans la branche |
|---|---|---|---|---|
| 1 — Administrateur (console : paramètres, arbitrage, argent, sanctions) | 20 | 1 314 | 689 | Non |
| **2 — Espace client** | **21** | **1 711** | **840** | **Oui** (sauf animations et spécification en un PDF, voir 1.2) |
| 3 — Espace vendeur | 17 | 700 | 409 | Non |
| 4 — Point relais | 22 | 581 | 376 | Non |
| 5 — Entreprise de livraison | 20 | 991 | 522 | Non |
| 6 — Livreur | 17 | 899 | 585 | Non |

Ordre conseillé par l'index : **l'Administrateur d'abord** (la console fixe les paramètres et arbitre),
puis les applications des acteurs. Pour l'espace client, cela compte : toutes les valeurs
« Proposé » et « À trancher » sont des **paramètres réglés dans la console**.

Les cinq autres paquets sont dans le dossier principal du dépôt (`PG BelivaY/Work définitif pro —
6 interfaces/`), non suivis par git. Cette passation ne couvre que l'espace client.

### 1.2 Le paquet Espace client

Contenu complet, d'après « 00 — À lire en premier » :

| Élément | Contenu | Dans la branche |
|---|---|---|
| `00 — À lire en premier — Guide du paquet` (9 p.) | Ordre de lecture, statuts, description des 21 documents | Oui |
| `00 — Liste complète des actions` (101 p.) | 840 actions numérotées (`REF-D01.A01`, `CL-D03.A04`…), plan d'exécution et questions ouvertes de chaque document | Oui (extraite aussi dans `logique-metier/actions.json`) |
| `00 — Lisez-moi d'origine du paquet` (37 p.) | Lisez-moi de la spécification | Oui |
| `00 — OUVRIR ICI.html` | Sommaire cliquable (201 liens, dont 195 vers `01_Documents`) | Oui (200 liens sur 201 ; celui de la spécification en un PDF n'aboutit pas sur GitHub) |
| `01_Documents/` (174 PDF, 613 Mo) | Pour chacun des 21 documents : **guide développeur**, document d'origine complet, parties découpées (14 pages au plus) ; les 4 références communes R1 à R4 ; la spécification complète en un PDF (1 339 p., 135 Mo) | Oui, sauf la spécification en un PDF (173 PDF, 478 Mo) |
| `02_Prototype_HTML/` | Prototype (147 écrans, 497 états), seule référence (DP-47), 17 images sources | Oui |
| `03_Captures/` | 3 × 500 captures (le guide en annonce 456 par thème : le dossier a été complété depuis) | Oui |
| `04_Pages_HTML/` | 17 documents CL en pages web, `index.html`, 1 096 fichiers (conforme au guide) | Oui |
| `05_Propositions_animations/` | Vidéos et pub | Non, volontairement |

Les 21 documents : **R1** REF-CL (spécification client d'origine), **R2** REF-VD (spécification
vendeur), **R3** REF-PRODUIT (référence produit), **R4** REF-COMMISSION (commission officielle V02),
puis **CL-00** à **CL-16**. Ordre de lecture du guide : thème 0 (références, à consulter quand un
document y renvoie), 1 Commencer ici (CL-00, CL-01), 2 Données et API (CL-02), 3 Écrans (CL-03 à
CL-15), 4 Registre et recette (CL-16). **Pour chaque document, on ouvre d'abord son guide développeur.**

Consigne du guide : ne pas renommer ni déplacer `02_Prototype_HTML`, `03_Captures` et
`04_Pages_HTML` (les pages s'appellent par chemin relatif).

### 1.3 Les statuts des règles (CL-01, CCH-20 et CCH-21)

| Statut | Ce que fait le développeur |
|---|---|
| **Décidé** | Implémente tel quel |
| **Recommandé** | Implémente tel quel ; une objection passe par le porteur du produit, pas par le code |
| **Proposé** | Lit la valeur dans un paramètre, modifiable dans la console sans redéploiement |
| **À trancher** | Lit la valeur proposée dans un paramètre ; **la mise en production attend la décision** |

Le développement n'attend donc aucune décision : seules les 33 règles « À trancher » doivent être
décidées **avant la mise en production** (CCH-21). Le guide du paquet emploie aussi une grille
générale (Verrouillé, Décidé, Déduit, Proposé) ; pour l'espace client, c'est la grille de CL-01
ci-dessus qui s'applique aux 1 669 règles.

---

## 2. Ce qui a été fait

### 2.1 Mise en place

1. **GitHub CLI** installé dans `~/.local/bin/gh` (v2.102.0, empreinte vérifiée), dossier ajouté au
   `PATH` dans `~/.zshrc`. Connecté au compte **pengafranck12-code** ; git utilise ces identifiants.
2. **Branche `espace-client`** créée à partir des deux commits du prototype.
3. `.gitignore` : `.DS_Store` et `.claude/`.

### 2.2 Le prototype mobile — vérifié état par état

Chaque écran ouvert sur un téléphone de 375 × 812 px : à l'œil chapitre par chapitre (CL-01, CL-03,
CL-04 validés avec le porteur, les suivants validés automatiquement à sa demande), puis contrôle
automatique de **tous les états du Plan du prototype**.

| Contrôle (sur chaque état) | Prototype complet | Version simple |
|---|---|---|
| États testés | 497, en clair/français **et** en sombre/anglais | 484 |
| Erreurs JavaScript | 0 | 0 |
| Écran vide, texte « undefined », « NaN », « null » | 0 | 0 |
| Images cassées, débordement en largeur | 0 | 0 |
| Fenêtre du bas (« sheet ») coupée ou qui dépasse | 0 après correction | 0 après correction |
| Liens internes (chaque lien mène à un écran existant) | 7 225, aucun cassé | 6 991, aucun cassé |

Examinés et jugés **conformes** : prix 150 699 F du Tecno Camon 30 256 Go (donnée voulue,
cohérente) ; « Recherche » et « Recherche · suggestions » identiques sans saisie ; panneau « Plan du
prototype » resté ouvert après un test ; notification « Paiement accepté » qui disparaît seule ;
Dynamic Island agrandie sur « Commande confirmée » (370 px, rebond à +2 %) qui dépasse de 5 px pendant
~0,3 s sur un écran de 375 px : elle appartient au cadre iPhone 390 × 844 des captures, et **CNV-06**
dit qu'en production l'application n'en dessine aucune — **ne pas la reproduire sur le site**.

### 2.3 Les corrections (3 fichiers dans la branche)

| # | Fichier | Défaut | Correction | Commit |
|---|---|---|---|---|
| 1 | `BelivaY_Espace_Client_mobile.html` | Feuille « Moyen de paiement » (CL-08) de 918 à 1 254 px sur un écran de 812 à 844 px, sans défilement : titre, montant, Wallet inaccessibles (7 états) | Règle `.sheet.long` (hauteur max = écran − 60 px, défilement, pleine hauteur en mode capture), reprise de `cl14-long` déjà prévue pour CL-14 ; appliquée à cette seule feuille | `47fcdac` |
| 2 | `version simple  BelivaY_Espace_Client_mobile.html` | Même défaut, mêmes 7 états | Même correction ; fichier retiré de la branche le 3 oct. (DP-47 : seule référence, le prototype complet) | `47fcdac` |
| 3 | `CL-16_Registre_Liaisons_Recette_Lexique.html` | Colonne « Source » en `nowrap` : 89 textes sous les pastilles de statut, page débordant de 328 px | `white-space: normal; overflow-wrap: anywhere` (ligne 41) ; vérifié dans Google Chrome | `fe1726c` |

Deux pages des animations ont été corrigées puis retirées avec le dossier ; les originaux sont intacts.
Contrôle final : les 2 792 fichiers du paquet dans la branche (tout le paquet sauf les animations et
la spécification en un PDF) sont identiques octet par octet au paquet du Mac, sauf les 3 fichiers
corrigés.

### 2.3 bis Les documents PDF du paquet

Ajoutés depuis `~/Documents/2 — BelivaY Espace client — paquet développeur/` : un commit pour les
documents d'entrée, puis un par thème ou par document (`47702a7` à `6536a34`), pour rester sous la
durée d'envoi acceptée par GitHub :

| Contrôle | Résultat |
|---|---|
| Fichiers copiés | 4 documents d'entrée `00 — …` + 173 PDF de `01_Documents` |
| Identiques aux originaux (MD5), dans le dossier **et** dans la version enregistrée par git | 177 sur 177 |
| PDF qui s'ouvrent (PDFKit de macOS) | 176 sur 176 |
| Pages du document d'origine, par document, contre le guide du paquet | 21 sur 21 conformes, total 1 711 |
| Somme des parties découpées = document d'origine ; chaque partie a le nombre de pages de son titre | 21 sur 21 |
| Liens de « OUVRIR ICI » | 201, aucun cassé sur le Mac ; un seul vise la spécification en un PDF |

`3e6cc3b` : `.gitattributes` déclare les PDF, images et vidéos comme binaires. Avec la seule règle
`* text=auto`, git prenait certains PDF pour du texte ; aucun fichier n'avait été altéré.

### 2.4 Les pages CL-00 à CL-16

Un commit par document avec ses seules figures (`0869746` à `8fdd896`) ; 662 images chargées, aucune
cassée ; 679 références vérifiées dans la version enregistrée ; aucun débordement à 1 280 px.
`5b2bb06` : 461 `.json` de dimensions des figures, 43 photos `cur/IMG_*`, une figure non utilisée.
`f561c3c` : les 17 images sources du prototype.

### 2.5 Les captures

`a5d56aa`, `11233db`, `d8e594f` : 3 × 500 JPEG complets et lisibles, mêmes 500 écrans dans les trois
dossiers, un même écran vérifié à l'œil dans les trois versions.

### 2.6 La logique métier en données — `logique-metier/`

Extraction **mot pour mot**, détail dans [`logique-metier/README.md`](logique-metier/README.md).

| Fichier | Contenu | Vérification |
|---|---|---|
| `regles.json` | 1 669 règles (1 200 Décidé, 392 Recommandé, 44 Proposé, 33 À trancher) | Comptes par document et par statut identiques au récapitulatif de CL-16 ; aucun doublon |
| `parametres.json` | 181 paramètres, dont 19 codes proposés par CL | — |
| `a-trancher.json`, `arbitrages.json` | 29 + 8 valeurs à trancher ; décisions du porteur et arbitrages | — |
| `machines-a-etats.json`, `calculs.json`, `api.json` (80 routes), `evenements.json`, `modele-donnees.json`… | Le contenu de CL-02 par thème | Chaque règle citée par CL-02 existe dans le registre |
| `actions.json` | **840 actions** et **331 questions ouvertes**, avec plan d'exécution, règles et liens de chaque document | Chaque document retrouve le nombre d'actions du guide ; 331 questions = 331 identifiants du PDF ; une page contrôlée à l'image |
| `suivi-regles.md` | Une ligne par règle : Revue, Écran, Serveur, Test | — |
| `suivi-actions.md` | Une case par action, une colonne Décision par question ouverte | — |
| `tableaux/` | Les 224 tableaux de CL-02 et CL-16 bruts | Chaque mot présent |

Sur les 469 identifiants de règles client cités dans les actions, 460 sont au registre ; les 9 autres
sont d'anciennes règles client remplacées (CCA, CNO, CDE, CPT) ou des règles d'autres interfaces
(ADM-CON-07, CAL-36 du point relais).

Particularité du PDF des actions : le texte de **CL-D03.A16** contient « partie 02 » dans la colonne
Action ; sa partie réelle (colonne de droite) est 03. L'extraction garde le texte tel quel.

---

### 2.7 Contrôle complet avant l'étape 2 (3 octobre 2026)

Fait sur la version **en ligne** de la branche, avant de passer à l'étape 2 :

| Contrôle | Résultat |
|---|---|
| Chaque fichier du paquet du Mac comparé à GitHub (empreinte git) | 2 789 identiques, 3 différents (les 3 corrections de 2.3, et rien d'autre), 0 manquant, 0 en trop ; 113 exclus volontairement (112 animations + la spécification en un PDF) |
| Liens et images des 21 pages HTML, résolus dans l'arborescence GitHub | 967 références, une seule absente : la spécification en un PDF (4.1). Le prototype contient ses 17 images en interne |
| Logique métier régénérée (`extraire.py`, `organiser.py`, `actions.py` depuis le PDF de la branche) | Aucune différence ; 16 JSON valides ; 1 669 règles, 840 actions, 331 questions |
| Prototype complet, 497 états à 375 × 812, clair, français | 0 erreur JS, 0 écran vide, 0 texte suspect, 0 image cassée, 0 feuille coupée, 0 lien inconnu ; seul écart : la Dynamic Island (2.2) |
| Version simple, 484 états | Mêmes contrôles, 0 défaut |

### 2.8 L'inventaire des pages (étape 2)

`logique-metier/pages.json` (complet) et `pages.md` (lisible), générés par `outils/pages.py` ;
`outils/extraire.py` extrait désormais les tableaux des 17 documents (1 080 tableaux, tous retrouvés,
aucun mot perdu ; CL-02 et CL-16 inchangés).

Pour chaque route : titre, onglet, menu, document, phase (lancement / après le lancement), états,
sections qui la décrivent, captures (clair, sombre, anglais), **règles** (avec un premier classement
serveur / écran et les règles de calcul repérées), **calculs** (formules exactes), paramètres, états
et erreurs, routes d'API, et renvoi vers les **règles transverses** de son document. Les règles
transverses (sections sans écran propre : principes, machines à états, moteurs, services, calculs
de CL-02) sont listées à part, section par section, avec leurs calculs : c'est le socle du serveur.

| Contrôle (refait à chaque génération) | Résultat |
|---|---|
| États du Plan rattachés à leur route | 497 sur 497 |
| Figures rattachées à leur état | 451 par la légende exacte, 4 par le titre de l'écran, 5 planches du design system (sans état) |
| Captures rattachées | 485 sur 500 |
| Règles des documents CL-01 à CL-15 rattachées (page ou section transverse) | 1 567 sur 1 567 |
| Registre des routes de CL-01 | 134 routes sur 134 présentes, même titre, même document |
| Résultat identique d'une exécution à l'autre | Oui |

**Ce que l'inventaire révèle :**

1. **9 pages du prototype n'ont aucune règle écrite** : `selection` (Sélection Premium), `promotions`,
   `diaspora`, `wallet` (Wallet BelivaY), `devenir-vendeur`, `ouverture`, `lancement`, `faceid`,
   `xp-pay` (paiement express Apple Pay / Google Pay). Ajoutées au prototype après les documents,
   absentes du registre des routes de CL-01. **À documenter (règles) avant de les construire**, ou à
   écarter. **Contradiction à trancher** : la page `wallet` (solde, « Recharger », « Retirer vers
   Mobile Money ») va contre **CCO-25** (Décidé : « ni porte-monnaie au lancement ; l'argent du client
   n'existe qu'en escrow lié à une commande et revient au moyen d'origine ») et **CPY-51**
   (Recommandé : aucun porte-monnaie ni dépôt). Décision du porteur nécessaire.
2. **4 routes simulent le téléphone** (`telephone`, `verrouille`, `android`, `ile`) et le Plan du
   prototype (`plan`) est un outil : **hors site** (CNV-06 : l'application ne dessine ni barre
   d'état ni Dynamic Island ; les notifications sont celles du téléphone).
3. **15 captures** montrent des états ajoutés au prototype après les documents (Apple Pay, Google Pay,
   code par WhatsApp, pays du numéro, paiement en dollars, menu du profil…) ; leurs règles ne sont
   pas écrites non plus.
4. Le classement serveur / écran est **automatique** : 184 rattachements de règles restent « non
   classés » ; tout se confirme à la revue de l'étape 3 (case Revue de `suivi-regles.md`).

### 2.9 La revue des règles (étape 3, en cours)

Une revue par document, écrite règle par règle dans `logique-metier/revue/CL-XX.json` : côté
(serveur, serveur et écran, écran, hors code, prototype seulement), nature (calcul, donnée et
sécurité, architecture, comportement, navigation, texte et format, design, contenu, organisation),
étape de construction, valeurs de démonstration, note. Les actions du document y sont triées
(vérification faite avec preuve, correction de la spécification, jeu d'essai, construction,
décision, contenu) et chaque question ouverte reçoit ce que disent les données.

`outils/revue.py` contrôle que chaque règle, action et question est couverte une fois, relève les
valeurs chiffrées sans paramètre (CCH-15), écrit `revue/CL-XX.md`, `revue/decisions.md` (ce qui
attend le porteur) et `revue/corrections-specification.md`, et coche les fiches de suivi (Revue ☑ ;
« — » dans Écran ou Serveur quand la règle ne les concerne pas). Deuxième exécution sans effet.

| Document | Règles | Serveur · les deux · écran · hors code / prototype | Actions faites ou triées | Questions pour le porteur |
|---|---|---|---|---|
| CL-01 | 115 | 7 · 34 · 63 · 11 | 33 (7 vérifications faites) | 13 sur 22 |
| CL-02 | 132 | 110 · 14 · 1 · 7 | 31 (4 vérifications faites, 8 du jeu d'essai) | 12 sur 21 |
| CL-03 | 87 | 39 · 24 · 21 · 3 | 26 (9 corrections de la spécification, 7 constructions) | 5 sur 16 |
| CL-04 | 77 | 29 · 29 · 18 · 1 | 14 (2 vérifications faites, 6 décisions) | 5 sur 10 |
| CL-05 | 66 | 35 · 19 · 12 · 0 | 13 (4 vérifications faites : paramètres de recherche déjà au registre) | 1 sur 6 |
| CL-06 | 92 | 39 · 31 · 20 · 2 | 18 (2 vérifications faites, 6 corrections de la spécification) | 4 sur 13 |
| CL-07 | 98 | 43 · 39 · 16 · 0 | 17 (moteur de frais : 41 calculs ; 10 cas de test au franc près) | 5 sur 10 |
| CL-08 | 89 | 48 · 26 · 14 · 1 | 25 (2 vérifications faites, 10 constructions, 7 corrections) | 3 sur 13 |
| CL-09 | 116 | 50 · 36 · 28 · 2 | 56 (6 vérifications faites, 26 constructions) | 9 sur 22 |
| CL-10 | 101 | 86 · 8 · 7 · 0 | 43 (6 vérifications faites, 25 constructions : service d'envoi) | 2 sur 14 |
| CL-11 | 129 | 93 · 18 · 14 · 4 | 56 (26 constructions, 16 décisions) | 11 sur 18 |
| CL-12 | 72 | 51 · 14 · 7 · 0 | 32 (19 constructions, 5 réglées par une décision) | 1 sur 9 |
| CL-13 | 88 | 41 · 22 · 21 · 4 | 50 (7 vérifications faites, 26 constructions) | 4 sur 16 |
| CL-14 | 151 | 120 · 12 · 17 · 2 | 54 (modules d'après le lancement ; 5 vérifications faites) | 5 sur 16 |
| CL-15 | 154 | 127 · 11 · 6 · 10 | 61 (nouveautés EX-01 à EX-06 ; codes du registre vérifiés) | 4 sur 17 |
| CL-16 | 102 | 85 · 4 · 4 · 9 | 121 (synthèse : 23 réglées par une décision, 32 corrections pour les autres paquets) | 4 sur 42 |
| **Total** | **1 669** | | **840 actions triées** | |

Constats : le masquage des numéros se fait au serveur (CDA-04) ; les plafonds de garde 1 400 F et
1 900 F sont des sommes de la grille, à calculer ; la conservation des preuves de carte (120 à 180
jours, CAP-21) et la longueur du mot de passe (CAP-16) n'ont pas de code de paramètre ; les alias
d'API `/legal/current`, `/me/terms-acceptance`, `/relays?near` sont à écarter (une route par action).

### 2.10 Les décisions du porteur

Un état « proposée » marque une valeur choisie par Claude sur délégation du porteur : elle est appliquée
avec le statut Proposé (réglable en console) et reste à valider. Les règles ajoutées après les documents
(portefeuille) sont dans `regles-ajoutees.json` et `.md`.

`logique-metier/decisions-porteur.json` garde chaque décision écrite du porteur : ses mots exacts, la
décision, les règles et paramètres touchés, son état (décidée ou à préciser). `revue.py` les
applique : `parametres-en-vigueur.json` (registre de CL-16 + décisions, ancienne valeur conservée :
c'est ce registre que le serveur charge), `decisions-porteur.md` (version lisible), questions et
actions réglées retirées de `revue/decisions.md` et reportées dans `suivi-actions.md`.

Décisions du 3 octobre 2026 :

| Réf. | Sujet | Décision | État |
|---|---|---|---|
| DP-01 | Rupture de stock | Vendeur suivant, 2 tentatives au plus, sinon remboursement (RUPTURE-TENTATIVES) | décidée |
| DP-02 | Code de retrait | Chiffré + empreinte HMAC (CDA-27) | décidée |
| DP-03 | Prestataires | CamPay (Fapshi en secours) ; carte : CinetPay (Flutterwave en secours) ; SMS Africa's Talking, e-mail Brevo, push FCM ; WhatsApp ensuite | décidée (SMS de secours à désigner) |
| DP-04 | Mot de passe | 8 caractères au moins (MDP-LONG) | décidée |
| DP-05 | Code du numéro (OTP) | 10 min ; 5 essais puis 15 min ; 60 s et 3 par heure | décidée |
| DP-06 | Wallet | Gardé, plafond 2 500 000 F ; remboursements au Wallet, sauf carte depuis l'étranger (même carte) | décidée (règles du Wallet à écrire ; réglementation CEMAC à vérifier) |
| DP-07 | Livraison | Moteur inchangé (900 F, 380 F même zone), aucun supplément M ou L ; XL 1 500 / 2 000 / 3 000 F (< 5 km, 5-10 km, > 10 km) | décidée |
| DP-09 | Zones | Z1 Bastos, Z3 Mokolo, Z6 Melen, Z7 Biyem-Assi au lancement | décidée |
| DP-10 | Retours | Toujours un dépôt au relais : plus de remboursement sans renvoi | décidée |
| DP-11 | Accueil, listing | Rangée dès 3 produits ; 1 place pour un nouveau produit dès 3 cartes ; 12 produits par page | décidée |
| DP-12 | Support | 7 h – 21 h, 7 j/7 ; première réponse sous 2 h | décidée |
| DP-13 | Pidgin | Non : français et anglais | décidée |
| DP-14 | Mise en avant vendeur | Jamais de « Sponsorisé » côté client ; inscription des vendeurs à simplifier (paquet Espace vendeur) | décidée |
| DP-15 | Remplacement, avis, annulations | 72 h ouvrées ; 7 jours ; 3 annulations sur 30 jours (valeurs de bon sens, sur délégation) | proposée |
| DP-18 | Remise au relais | 400 F **par colis** (jamais à perte) ; l'offert couvre un seul colis — panier de référence : 273 379 F au lieu de 272 579 F, exemples à recalculer | décidée |
| DP-19 | Remise à domicile | 1 000 F par colis | décidée |
| DP-20 | Refus de colis | Un relais ne refuse jamais un colis S, M ou L (CAP-07 du relais écarté) | décidée |
| DP-21 | Palier vendeur | Perdu après 14 jours sous le seuil (console), pas 6 mois | décidée |
| DP-22 | Vocabulaire | Chaque espace garde ses mots ; le lexique de CL-16 fait la correspondance | décidée |
| DP-23 | Carte | Ouverte aussi aux clients locaux (mêmes règles : 2 %, 3-D Secure, 150 000 F, J+14) | décidée |
| DP-24 | Refus au comptoir | Garde retenue sur la livraison payée, jamais au-delà | décidée |
| DP-25 | Remise relais colis L | 600 F par colis L (400 F S et M) | décidée |
| DP-26 | Code bloqué | Nouveau code dans l'application après 24 h (CCD-12) | décidée |
| DP-27 | Vice caché | Couvert 100 jours, même après « Tout est en ordre » | décidée |
| DP-28 | « Tout est en ordre » | Par l'application du client seulement | décidée |
| DP-29 | Biométrie, garde | CODE-BIO 50 000 F ; garde au jour entier | décidée |
| DP-30 | Fond de plan | Google Maps, attribution visible | remplacée par DP-49 (OpenStreetMap) |
| DP-31 | SMS économique | Sous 10 000 F de panier, seuls C3 et C4 en SMS | décidée |
| DP-32 | Dissociation | Un colis à 24 h de retard : les autres deviennent retirables sans lui | décidée |
| DP-33 | Notifications | Conservées 12 mois (juriste à consulter) | décidée |
| DP-34 | Textes des messages | Validés (`textes-messages.md`, rappels S0-S2 recalculés) | décidée |
| DP-35 | Litiges et retours | Décision BelivaY 24 h ; recours sous 48 h ; arrangement 5 jours ; livraison remboursée si tort ; trajet 500 F ; remboursement MoMo 1 h (à vérifier avec CamPay) ; IFA calibré après 3 mois | décidée |
| DP-36 | Annulation par le client | Notification seulement, pas de SMS | décidée |
| DP-37 | Transfert entre relais | 400 F (S, M), 600 F (L) | décidée |
| DP-38 | Domaine | belivay.com partout | décidée |
| DP-39 | Réponse du gérant | Réponse privée à un avis, dans la messagerie du client | décidée |
| DP-40 | Légal, WhatsApp | Entreprise créée (mentions à fournir) ; numéro WhatsApp plus tard | à préciser |
| DP-41 | Modules d'après le lancement | Abonnés honorés si le module ferme ; prix fixés à l'ouverture ; liste 30 jours ; garde d'un cadeau retenue au payeur | décidée (budget flash à fixer) |
| DP-42 | Valeurs du lancement | Escrow validé par Finance + Direction ; liste des produits interdits (`produits-interdits.md`, juriste) ; score et alertes de zone ; fraude en alertes seulement ; budget SMS après 2 semaines ; pas de paiement d'avance automatique après deux non-retraits ; relais fermé : choix du client, sinon transfert à 24 h ; score du relais non affiché | décidée |
| DP-43 | Site identique au prototype | Le prototype complet du 1er octobre est la référence visuelle, au pixel près ; l'île BelivaY est réservée à l'application | décidée |
| DP-44 | Écarts prototype et spécification | La spécification l'emporte sur six points (retour de la planche, braise des boutons, 12 px au moins, zones de toucher de 44 px, anglicismes, pidgin) ; le nombre de quartiers reste lu dans les données | décidée |
| DP-45 | Serveur | Moteurs de calcul en Python pur dans `moteurs/`, intégrés ensuite au serveur existant (relaya-marketplace) ; site client à part pour l'instant | décidée |
| DP-46 | Colis et supplément XL | Classe d'un colis = la plus grande de ses articles ; distance du supplément XL : boutique → domicile | décidée |
| DP-47 | Référence unique | Le prototype complet du 1er octobre est la seule référence (version simple retirée) ; tout y est repris sauf l'île ; ses décisions propres (euro ou dollar US, Apple Pay et Google Pay, devenir vendeur) sont ajoutées ; les décisions du porteur priment sur ses montants | décidée |
| DP-48 | Moteurs | Neuf points de calcul non fixés par la spécification : supplément rendu à l'annulation, refus au comptoir (garde seule), avance 0 F si livraison offerte, renvoi couvert d'abord, période de CSM-30, SMS-ECO sur S, ordre du portefeuille, frais de service d'une annulation partielle, dissociation depuis le premier colis | décidée |
| DP-49 | Fond de plan | OpenStreetMap à la place de Google Maps (tuiles OSM, Nominatim, OSRM pour le trajet à pied), comme relaya-marketplace ; distances toujours géodésiques (WGS 84) | décidée |
| DP-50 | Tout le prototype | Tous les écrans visibles sur le site, portefeuille et modules d'après le lancement (CL-14, CL-15) compris ; tous les interrupteurs ouverts, le mécanisme reste (un module se referme par son interrupteur) ; l'île reste hors site | décidée |
| DP-51 | Barre d'onglets du panier | La barre d'onglets restait sous le panier ouvert ; annulée le même jour : le panier reste comme le prototype | annulée |
| DP-52 | Compte logique | Œil du portefeuille sur place (compte, menu, portefeuille) ; « Modifier mon profil » (photo, prénom, nom) confirmé par code SMS ; e-mail changé avec deux codes ; remplace « ni formulaire de profil » (CCO-01) | décidée |
| DP-54 | Plus de référence au prototype | Le prototype a donné le squelette ; chaque page est complétée pour l'usage réel, sans identité au pixel ; cartes et position : OpenStreetMap et GPS | décidée |
| DP-17 | Portefeuille fermé | Tout développé, mais fermé par FF-WALLET jusqu'à validation ; en attendant, remboursements vers le moyen d'origine | décidée, modifiée par DP-50 (FF-WALLET ouvert) |
| DP-16 | Règles du portefeuille | CWL-01 à CWL-12 (`regles-ajoutees.md`) : recharge gratuite, paiement avec le solde, retrait vers le numéro vérifié, 1 retrait gratuit par mois puis 1 %, anti-fraude, conformité CEMAC | proposée |
| DP-08 | Garde | Client 0, 100, 100, 100, 200, 500, 1 000 F ; cartons C1, C2 : + 300 F par jour dès le jour 1 ; relais 100 F (300 F gros colis) par jour facturé | décidée |

**À reporter dans les documents** : les règles CCO-25, CPY-51, CCH-01, CCY-06, CCY-21, CAL-19,
CAL-21, CAL-22, CAL-24, CAL-26, CAL-27, CDS-16, CAL-09, CAP-14, CAP-16 et CDA-27 sont changées par
ces décisions ; leur texte dans les documents CL reste l'ancien. Le Wallet n'a encore aucune règle
écrite.

### 2.11 Ce qui reste à décider (au 3 octobre 2026)

Sur les 37 valeurs « À trancher » du registre de départ, **10 restent** (`parametres-en-vigueur.json`) ;
DP-42 a réglé `ESCROW-VALIDEURS`, `ZONE-*`, `FRAUDE-SEUILS` et fixé la méthode de `SMS-BUDGET-JOUR` et
de `CAT-INTERDITS` :

- **Avant le lancement (2)** : `SMS-SECOURS` (fournisseur SMS de secours), `SUP-WA` (numéro WhatsApp
  du support, fourni plus tard). À compléter aussi : la valeur de `SMS-BUDGET-JOUR` après 2 semaines de
  trafic, et la validation de `produits-interdits.md` par le juriste (alcool, tabac, produits sous licence).
- **Avant l'ouverture de chaque module (8)** : `FLASH-BUDGET`, `IA-COUT-MAX`, `COT-FRAIS`,
  `MDC-FORFAIT` (juriste), `TRC-PARTENAIRE`, `TRC-IMEI-SOURCE`, `WAP-COUT`, `WAP-VOCAL-CONSERV`.

Autres points ouverts : le bonus Premium du relais (+ 25 F, paquet Point relais) ; les textes
du juriste (8 pages légales, mentions légales de l'entreprise, mention du vendeur sur la facture,
validation du portefeuille et de la conservation des notifications) ; paramètres à créer relevés dans
les revues (conservation des preuves de carte 180 jours, nuit du payeur 22 h – 7 h, table des préfixes
MTN / Orange, valeurs des modules à leur ouverture) ; les exemples chiffrés des documents à recalculer
avec la remise par colis (DP-18) avant de servir de tests.

## 3. Comment refaire les vérifications

| Besoin | Comment |
|---|---|
| Servir les pages en local | `python3 -m http.server 8765 --bind 127.0.0.1` depuis la racine du dépôt |
| Ouvrir un état du prototype | Ajouter `#route?paramètres` à l'adresse ; tous les états sont dans `PLAN`, les routes dans `ROUTES` |
| Tester tous les états | Pour chaque entrée de `PLAN` : `history.replaceState(null,'','#'+route)` puis `render()` (29 ms par écran) ; contrôles : erreurs, texte vide ou suspect, images, `scrollWidth` > `clientWidth`, `.sheet` qui sort de `#app`, liens absents de `ROUTES`. **Par tranches d'une centaine, une à la fois** |
| Mode sombre, anglais | `setTheme('dark')`, `setLang('en')` dans la console de la page |
| Régénérer la page des textes à valider | `python3 logique-metier/outils/textes.py` (après `revue.py`) |
| Régénérer la revue et cocher les fiches | `python3 logique-metier/outils/revue.py` (après avoir écrit ou corrigé `revue/CL-XX.json`) |
| Régénérer la logique métier et l'inventaire | `python3 logique-metier/outils/extraire.py && python3 logique-metier/outils/organiser.py && python3 logique-metier/outils/pages.py` (s'arrête en cas d'écart) |
| Régénérer les actions (macOS) | `python3 logique-metier/outils/actions.py [chemin du PDF]` — **efface les coches** de `suivi-actions.md` |
| Régénérer le suivi des règles | `python3 logique-metier/outils/suivi.py` — **efface les coches** de `suivi-regles.md` |

Pièges : le navigateur intégré à l'application dessine en noir des lignes de CL-16 (page de 1,4 Mo),
absent dans Chrome et présent aussi sur l'original — vérifier les pages longues dans Chrome ; ne
jamais lancer deux balayages en même temps ; éviter `sed` sur les fichiers aux lignes très longues
(préférer Python et contrôler par `git diff`).

---

## 4. Points ouverts et réserves

1. **Spécification complète en un PDF absente de GitHub** (135 Mo, limite GitHub : 100 Mo). Elle
   reste dans `~/Documents/2 — BelivaY Espace client — paquet développeur/01_Documents/6 — …`.
   Ses 1 339 pages = les 17 documents CL-00 à CL-16 de la branche (compte de pages, contenu non
   comparé page à page) ; seul son lien dans
   « OUVRIR ICI » n'aboutit pas depuis la branche. Si besoin : Git LFS, ou la découper en deux.
2. **Captures** : 500 par thème contre 456 annoncées par le guide ; elles datent d'avant les
   corrections (celles de « Moyen de paiement » ne sont pas touchées, le mode capture montrant la
   feuille entière).
3. **Doublon** : `Work définitif pro — 6 interfaces/old version BelivaY_Espace_Client_mobile.html`
   était identique à la « version simple » ; le porteur a retiré ces deux copies le 3 oct. (DP-47).
4. **CL-16 en fenêtre étroite** (825 px) : la pastille « Recommandé » dépasse de 5 px ; rien à 1 280 px.
5. **Les cinq autres paquets** ne sont pas dans la branche ; l'espace client dépend de la console
   (paramètres) et des liaisons avec relais, vendeur, livraison (CL-16).
6. **Branche non fusionnée** dans `main`.
7. **Copie de travail** : une copie des animations reste dans `.claude/worktrees/github-connexion-6bcc75/`,
   non suivie par git ; l'original est intact.
8. **Décisions attendues** : 33 règles « À trancher », 37 valeurs à trancher, 331 questions ouvertes.

---

## 5. Ce qu'il reste à faire, étape par étape

Chaque étape a un objectif, des actions, un livrable et une **définition de terminé**. On ne passe à
la suivante que lorsqu'elle est terminée et vérifiée. Les numéros d'actions sont ceux de
`suivi-actions.md` ; le détail de chacune est dans le **guide développeur** de son document.

### Étape 1 bis — Compléter le paquet dans la branche — **TERMINÉE** (voir 2.3 bis)

1. Ajouter `00 — À lire en premier`, `00 — Liste complète des actions`, `00 — Lisez-moi d'origine`,
   `00 — OUVRIR ICI.html` et `01_Documents/` (sauf la spécification en un PDF, ou avec Git LFS).
2. Vérifier : les 195 liens de « OUVRIR ICI » vers `01_Documents` ouvrent un fichier ; chaque PDF
   s'ouvre ; nombre de pages par document conforme au guide (R1 158, R2 140… CL-16 130, total 1 711).

**Terminé quand** : le paquet de la branche correspond au paquet complet (hors animations et fichier
de 135 Mo), un commit par thème, envoyé sur GitHub.

### Étape 2 — Inventaire des pages du site — **TERMINÉE** (voir 2.8)

1. Lister les 147 routes (`ROUTES`) et leurs 497 états (`PLAN`) : CL-01 2 · CL-03 15 · CL-04 5 ·
   CL-05 6 · CL-06 4 · CL-07 3 · CL-08 7 · CL-09 7 · CL-10 10 · CL-11 9 · CL-12 8 · CL-13 18 ·
   CL-14 17 · CL-15 35 · hors application 1 (`plan`).
2. Pour chaque route : titre, onglet, parent, états, document CL, captures, figures, **règles liées**,
   routes d'API (`api.json`), **actions et questions** du document (`actions.json`).
   **Priorité : les règles de calcul et de comportement de chaque page**, séparées en ce qui se
   calcule côté serveur et ce qui se fait côté écran. Les chiffres affichés sont relevés seulement
   comme données de démonstration, à remplacer (voir section 6).
3. Extraire les tableaux de CL-03 à CL-15 (`extraire.py`, liste `DOCUMENTS`).
4. Séparer lancement (CL-01 à CL-13) et après le lancement (CL-14, CL-15, interrupteurs `FF-*`).

**Livrable** : `logique-metier/pages.json` et `pages.md`.
**Terminé quand** : 147 routes et 497 états présents, chacun rattaché à un document, des captures et
ses actions, contrôlé par un script.

### Étape 3 — Lire les documents et traiter les actions de cohérence — **TERMINÉE** (voir 2.9 et 2.10)

Les 840 actions mêlent deux natures : des **corrections de la spécification et du jeu d'essai**
(aligner, unifier, documenter, trancher — par exemple CL-D03.A07 à A16) et des **tâches
d'implémentation**. Les premières se font avant de coder l'écran concerné.

1. Pour chaque document, dans l'ordre du guide (R1 à R4 au besoin, CL-00, CL-01, CL-02, CL-03…
   CL-16) : lire le **guide développeur**, suivre son **plan d'exécution**, cocher la case **Revue**
   des règles du document dans `suivi-regles.md`.
2. Réaliser les actions de correction et cocher leurs cases dans `suivi-actions.md`.
3. Faire trancher par le porteur les **331 questions ouvertes** (colonne Décision), en priorité celles
   qui touchent l'argent et la sécurité, par exemple : CL-D03.Q12 (code de retrait haché ou chiffré
   + HMAC), CL-D03.Q14 (prestataire carte, SMS de secours), CL-D03.Q20 (mot de passe 8 ou 12
   caractères), CL-D03.Q11 (remboursement de rupture).
4. Faire trancher les **33 règles « À trancher »** et les **37 valeurs** de `a-trancher.json` ; elles
   ne bloquent pas le développement (lues en paramètres) mais **bloquent la mise en production**.

**Terminé quand** : toutes les cases Revue cochées, les actions de correction faites, les questions
ouvertes décidées par écrit et reportées dans les documents liés.

### Étape 4 — Squelette du site (React) — **TERMINÉE** (3 oct.), revérifiée le même jour

**Décision du porteur (3 oct.)** : chaque page du site est **exactement** celle du prototype
`BelivaY_Espace_Client_mobile.html` (version complète du 1er octobre), au pixel près, toutes les sections
et tous les détails. L'île BelivaY (Dynamic Island animée) est gardée pour l'application : le site n'y
touche pas. La « version simple » du 30 septembre n'est pas la référence.

**Installé** : Node.js 24 LTS dans `~/.local/node` (somme SHA-256 vérifiée, `PATH` dans `~/.zshrc`) ;
dans `site/node_modules` (hors GitHub) : Vite, React 19, React Router, TypeScript, Playwright et son
Chromium, pixelmatch. Mode d'emploi : `site/README.md`.

**Méthode** : rien n'est recopié à la main. Des outils lisent le prototype **en marche** (il se complète
pendant son exécution : 6 750 traductions au lieu de 6 374 dans le texte du fichier, 310 icônes au lieu
de 273) et écrivent ce que le site utilise : feuille de styles d'origine (177 ko, 13 feuilles, sans cadre
de téléphone, barre d'état dessinée, île ni plan des états), ses 5 polices, les styles insérés dans les
écrans et leurs images, le dictionnaire anglais, les icônes, la navigation de chaque route (en-tête,
parent du retour, élément de droite, barre du bas, marge haute, titres). Les composants rendent le
balisage exact des fonctions du prototype ; `t()` reprend sa typographie et sa conversion anglaise.

**Fait** :
1. Coque identique au prototype sur les 89 routes ouvertes : en-tête racine (bandeau rotatif, « Tout près
   de toi » en italique dégradé souligné, cloche, panier, portrait), en-tête enfant (retour vers le parent
   naturel, panier ou chariot du logo ou action de l'écran, en-tête du panier avec son bandeau),
   barre du bas (badges, mode sans badge du nouveau client), marges.
2. **Menu** construit, identique au prototype écran entier, en clair, sombre, anglais, texte grand et très
   grand ; au lancement, Flash Deals, BelivaY Premium, le Wallet et les « Services BelivaY » (repère de
   revue) n'y sont pas (interrupteurs fermés).
3. « Ce lien ne mène à aucune page » pour toute adresse inconnue ou module fermé (CCH-19).
4. Données de démonstration isolées dans `site/src/demo/` (valeurs du prototype et du jeu d'essai) ; le
   **mode prototype** de la démonstration ouvre tous les modules pour comparer au prototype.
5. **1 032 tests verts** : 350 comparaisons au pixel avec le prototype (coque de chaque route et Menu, cinq
   rendus) et 682 contrôles de comportement (chaque route sans erreur ni débordement de 360 à 430 px,
   liens, modules fermés, parent du retour, langue et thème).

**Écarts entre le prototype et la spécification, tranchés par le porteur (DP-44, 3 oct.)** : la
spécification l'emporte pour six points, appliqués sur le site et, pour la comparaison, au prototype
(`site/outils/corrections.mjs`) :
1. la planche de composants revient à l'accueil, jamais au Menu (CNV-10) ;
2. boutons pleins, pastilles et badges en braise `#C9500E → #B0430A` (CDS-11, CRD-08) ;
3. aucun texte sous 12 px : 30 tailles de police du prototype portées à 12 px (CRD-07) ;
4. bouton retour et avatar : 40 px visibles, 44 px de zone de toucher (CRD-06) ;
5. aucun anglicisme en français : « Ventes flash », « Portefeuille », sans « CURATED » ni « SPONSO »
   (CCH-30, DP-14) ;
6. le pidgin n'est plus cité dans les réglages (DP-13).
Le 7e point reste tel quel : le nombre de quartiers du bandeau est lu dans les données (CAC-34).
Reste à contrôler à l'étape 6 : d'autres surfaces orange du prototype (héros, bandeaux de l'accueil)
portent du texte blanc sur un orange clair ; un test de contraste automatique les relèvera écran par écran.

**Reporté, avec son étape** :
- chaque page : contenu identique au prototype, état par état, vérifié par comparaison au pixel
  (`site/outils/releve.mjs`, `site/outils/comparer.mjs`, `tests/identique.spec.ts`) — étape 6 ;
- en-têtes propres à certains écrans (recherche, pages publiques des modules) et éléments fixes (feuilles
  ouvertes, barres d'achat) : avec leur écran — étape 6 ;
- « Connexion lente » (NET-LENT) et lecture de `GET /config/flags` : avec le client d'API — étape 5.

### Étape 5 — Calculs du serveur — **TERMINÉE** (3 oct.)

**Ce qu'on a trouvé** : le serveur de BelivaY existe et tourne en production (`Felix-TANZI/relaya-marketplace`,
maintenu par jacks524 et Felix-TANZI) : Django 5.1, Django REST Framework, PostgreSQL 16, Redis 7, JWT,
OpenAPI, Gunicorn, Docker, hébergement Hetzner ; frontend React (19.2 dans le code, « 18 » dans le README),
Tailwind, i18next, applications Android par rôle. Son domaine financier est déjà pur et versionné ; son
calcul de livraison ne suit pas encore la spécification (pas de remise par colis, DP-18 et DP-25).
Remarques pour l'équipe : Django 5.1 n'a plus de correctifs de sécurité depuis décembre 2025 (5.2 LTS,
suivie jusqu'en 2028) ; l'intégration continue et la production tournent en Python 3.11 (`Dockerfile.prod`), le développement en 3.12.

**Décision DP-45** : les calculs de la spécification sont écrits ici, dans `moteurs/`, en Python pur, aux
conventions du domaine existant, testés sous Python 3.11 et 3.12 ; l'équipe de relaya-marketplace les
branche ensuite dans son serveur. Mode d'emploi : `moteurs/README.md`.

**Fait** :
1. Python 3.12 et 3.11 installés par `uv` dans le dossier de l'utilisateur (somme SHA-256 vérifiée), pytest.
2. Lecture du registre (`registre.py`) : chaque paramètre a sa forme attendue, aucune valeur dans le code.
3. **Moteur de frais du panier** (`frais.py`, CAL-06 à CAL-11, DP-07, DP-18, DP-19, DP-25) : sous-total,
   ramassages par zone, remise par colis, livraison offerte, suppléments, total, économie, reste de
   ramassages, progression vers le seuil, gain d'un conseil, vérification au paiement ; trace de chaque
   calcul. Les exemples du jeu d'essai recalculés (panier de référence : 273 379 F au lieu de 272 579 F).
4. **Garde et rappels S0 à S5** (`garde.py`, DP-08, DP-24, DP-29, DP-46), **comptoir** (`comptoir.py`),
   **annulation et changement de relais** (`annulation.py`, DP-37, DP-42), **carte, euros et dollars US,
   Apple Pay et Google Pay** (`carte.py`, CET-24, DP-47), **délais affichés et dissociation** (`delais.py`,
   DP-32), **catalogue et vendeur suivant** (`catalogue.py`, DP-01), **litiges et retours** (`litiges.py`,
   DP-10, DP-27, DP-35), **notes** (`notes.py`), **portefeuille** (`portefeuille.py`, fermé au lancement),
   **machines à états** (`etats.py`, un test par transition et par garde).
5. Paramètres versionnés : chaque lecture du registre porte son empreinte (CCH-15), le moteur de frais la
   rend avec son résultat.
6. Deux audits (revue critique et conformité) puis une revue indépendante, corrigés ; 358 tests verts, couverture 100 %, ruff propre,
   sous Python 3.11 et 3.12.

**Tranché par le porteur (DP-48)** : neuf points que la spécification ne fixait pas (annulation,
comptoir, renvoi, CSM-30, SMS-ECO, portefeuille, frais de service, dissociation), listés dans
`moteurs/README.md`.

**Tranché par le porteur (DP-46)** : la classe d'un colis est la plus grande de ses articles ; le
supplément XL se calcule sur la distance boutique → domicile.

**Correspondance avec relaya-marketplace** : `moteurs/CORRESPONDANCE-RELAYA.md` (instantané `9546ffe`, lu sans
rien modifier, vérifié par une relecture indépendante) : conventions, paramètres et interrupteurs, entités, machines
à états, branchement de chaque moteur, routes, écarts de règles, 14 anomalies à signaler à leur équipe, plan
d'intégration en 9 lots, 3 points à arbitrer (remboursement automatique des petits litiges, formule de
satisfaction, paliers IFA). Production en Python 3.11 (`Dockerfile.prod`).

**Plan et distances (DP-49)** : OpenStreetMap remplace Google Maps ; `geo.py` (distance géodésique WGS 84,
relais proposés, zones exploitées).

**Terminé quand** : chaque calcul et chaque transition a son test, tous verts sous Python 3.11 et 3.12.

### Étape 6 — Construction des pages, une par une — **EN COURS** (3 oct.)

**Ordre** : CL-01 → CL-03 → CL-04 → CL-05 → CL-06 → CL-07 → CL-08 → CL-09 → CL-10 → CL-11 → CL-12
→ CL-13 → CL-14 → CL-15 (DP-50 : tout est visible, interrupteurs ouverts, `site/src/config/interrupteurs.json`).

**Méthode (outils de `site/outils/`)** :
1. `etats.mjs` relève, pour chaque état de chaque route ouverte (adresses de `pages.json`, plus l'adresse nue ;
   571 états avec DP-50 et les états atteints par un lien),
   ce que le prototype affiche autour du contenu : en-tête, titre, retour, barre du bas, marges, classes, blocs de
   styles (`src/genere/etats.json`). `styles.mjs` écrit les blocs de styles de tous les états.
2. `ecran.mjs CL-xx` écrit les écrans du document depuis le prototype en marche : un rendu par état, mêmes
   balises, mêmes classes, même ordre, chaque nœud de texte par `t()`, icônes nommées, dessins à part
   (`src/demo/dessins.json`, clair et sombre), images extraites, blocs de styles à leur place ; corrections du
   porteur appliquées (pidgin retiré, DP-13 ; étiquettes anglaises, DP-44 ; montants recalculés,
   `src/demo/recalculs.json`, DP-47). `Ecran parEtat` suit le relevé de l'état. Un écran déjà écrit n'est pas
   réécrit sans `--ecraser` (il a pu être repris à la main). `transcrire.mjs` transcrit un état pour le lire.
3. `tests/identique.spec.ts` compare **chaque état** des écrans construits, en clair, sombre, anglais, texte grand
   et très grand ; un état écarté l'est dans `src/pages/CL-xx/construits.json`, avec sa raison.
4. Passe suivante, sous la garde de ces tests : les données écrites passent par la source (démonstration, puis
   API) ; les blocs d'un module fermé au lancement suivent leur interrupteur (CCH-18) ; les comportements
   (choix de langue, minuteries) sont repris à la main.
5. Cocher **Écran** dans `suivi-regles.md` et les actions dans `suivi-actions.md` ; commit par document.

**Fait** :
- **CL-01** : Menu.
- **CL-04 à CL-13** (73 écrans, 352 adresses) : écrits par `ecran.mjs`, identiques au prototype dans tous leurs états
  et les 5 rendus (2 001 comparaisons sur 2 010 ; restent l'en-tête de « Devenir vendeur », photo à remplacer, et
  deux écarts passagers de rendu). Repris à la main : blocs des modules fermés au lancement dans `<Module>`
  (12 écrans : ventes flash, abonnement, portefeuille, extensions ; ils suivent leur interrupteur, CCH-18 ;
  tous ouverts depuis DP-50), comptes à
  rebours vivants, choix de langue, de thème et de taille qui suivent les préférences, résumé des réglages,
  langue des pages légales, aperçu de taille (&txt=), pidgin retiré des réglages (DP-13).
- Outils ajoutés : `anglais.mjs` (textes que le prototype écrit en anglais sans dictionnaire, et entrées fausses
  du dictionnaire : `src/genere/en-etats.json`), `ecarts.mjs` et `bande.mjs` (lire un écart), `module.py` et
  `modules_restants.py` (blocs des modules fermés), `preferences_actives.py`, `images.mjs`. Les feuilles de styles
  qu'un écran n'ajoute qu'à son premier affichage sont reprises (`styles.mjs`) et ajoutées au prototype comparé.
- **CL-03** (15 écrans, 51 adresses) : identiques au prototype dans tous leurs états, 5 rendus ; repris à la main :
  choix de langue actif, animation d'ouverture (largeur du nom mesurée police chargée, puis l'écran d'ouverture ;
  « Rejouer » en mode prototype seulement). Écartés de la comparaison : l'animation d'ouverture (le prototype coupe
  le mot) et la feuille des conditions posée sur l'accueil (`#cgu`, à composer avec l'écran d'accueil de CL-04).

- **Portefeuille, CL-14 et CL-15** (DP-50 : tout le prototype visible, île exceptée) : l'écran du portefeuille
  (CL-13), les 17 écrans de CL-14 et les 35 de CL-15, écrits par `ecran.mjs` et comparés comme les autres, dans
  tous leurs états (110 adresses). Leurs liens vers un autre module suivent l'interrupteur de ce module.
- **CL-01** : la planche de composants (`kit`, CDS-01 à CDS-06), écrite par `ecran.mjs`.
- **États atteints par un lien** : `outils/etats-lies.mjs` relève les adresses que le prototype n'atteint que par
  un lien (absentes de son plan, ex. `#kit?st=feuille`) et qui s'affichent autrement que l'adresse nue ; elles
  s'ajoutent aux états de leur route (`logique-metier/etats-lies.json`, fusionné par `logique-metier/outils/site.py`).
- **Montants et structures recalculés** (DP-47) : 171 entrées dans `src/demo/recalculs.json` (montant, passage
  exact ou nœud entier, limités à des routes, des états ou un bloc) et 11 dans `src/demo/structures.json` (une
  remise par colis, suppléments M et L retirés, grille de garde…), d'après l'audit des montants par les moteurs.
  La même correction (`outils/corriger-page.mjs`) sert à la génération et à la comparaison ; `recalculer.py`
  l'applique aux écrans écrits ; `structures.mjs` écrit leurs textes anglais.
- **Reprises rejouables** : `outils/reprises.py` refait chaque reprise à la main après une régénération
  (`ecran.mjs --ecraser`) ; une régénération suivie des reprises redonne les mêmes écrans.
- **Chargement par document** : chaque document est un fichier à part, chargé à l'ouverture de son premier
  écran ; celui de l'adresse ouverte est chargé avant le premier affichage (`src/pages/registre.ts`).

- **Alignés sur DP-10** (confirmé par le porteur, 3 oct.) : la feuille « Nos conditions changent » ne promet
  plus de remboursement sans retour (`recalculs.json`) ; l'état `retour?st=sans-retour` est retiré du site,
  comme le pidgin (`outils/adresses.mjs`), son adresse montre le retour.
- **DP-51**, annulée le même jour par le porteur : le panier ouvert reste comme le prototype, sans barre d'onglets.

- **DP-52** : pages propres au site, hors prototype : `src/pages/profil/` (« Modifier mon profil »,
  « Changer d’e-mail », déclarées dans `config/pages.ts`, listées par `pages-site.json`) ; source de données
  (`donnees/source.ts` : codes, profil), session modifiable, œil du solde (`composants/Profil.tsx`), saisie de
  code (`composants/SaisieCode.tsx`) ; tests de gestes.

**Questions ouvertes pour le porteur** : la photo du héros de « Devenir vendeur » est à fournir ; le litige
réglé d'office (`litige-auto`, CLT-27 : « Tu n'as rien à rapporter ») rembourse un petit montant sans
retour de l'article : à garder (mécanisme de litige distinct du retour) ou à aligner sur DP-10 ?

**Terminé quand** : toutes les pages validées (lancement et, avec DP-50, d'après le lancement), leurs règles et
actions cochées.

### Étape 7 — Raccordement et services externes

Site branché au serveur, puis Mobile Money (MTN, Orange), carte (prestataire à trancher : Flutterwave
ou CinetPay, CL-D03.A20), SMS et fournisseur de secours, WhatsApp, connexion Google et Apple,
notifications ; chaque service d'abord en mode test, avec ses cas d'échec.
Liaisons avec le point relais, le vendeur, la livraison et la console décrites dans CL-16 (16.1 à 18.5).

**Terminé quand** : commande → paiement → retrait → litige fonctionne de bout en bout en mode test.

### Étape 8 — Recette complète

1. Les **220 critères** de la liste de contrôle de CL-16.
2. Les **15 scénarios de bout en bout** de CL-16 (110 étapes).
3. Les **139 anciennes règles client** (correspondance de CL-16).
4. Toutes les cases **Test** de `suivi-regles.md` et toutes les actions de `suivi-actions.md` cochées.
5. Les contrôles automatiques du prototype sur tout le site, clair et sombre, français et anglais.

### Étape 9 — Mise en production

Règles « À trancher » toutes décidées (CCH-21), captures refaites, fusion de `espace-client` dans
`main` par une pull request relue, mise en ligne.

---

## 6. Règles de travail à garder

- **La perfection avant la vitesse** : une étape à la fois, vérifiée, validée, puis enregistrée.
- **Un commit par page ou par sujet**, envoyé sur GitHub aussitôt validé.
- **Ne jamais toucher aux vidéos** ni au dossier des animations.
- **Les règles comptent, pas les chiffres** (consigne du porteur, 3 oct. 2026) : les prix, montants,
  noms, commandes et références du prototype et de `jeu-essai.json` sont des **données de
  démonstration (mock data)**. On démarre avec elles, puis elles seront **retirées et remplacées par
  les données réelles** une fois le site en place. Ce qui doit être exact et complet, ce sont les
  **règles de calcul et de comportement**, côté serveur (backend) et côté écran (front-end).
  Conséquences :
  - les données de démonstration vivent **à part** (fichiers de démonstration / fixtures), jamais
    écrites dans le code des écrans ni des calculs, pour pouvoir les retirer d'un bloc ;
  - un calcul ne dépend jamais d'une valeur de démonstration : il prend ses entrées (prix, poids,
    zone, dates…) et ses paramètres (`parametres.json`, réglés dans la console) ;
  - les tests vérifient la **règle** (formule, arrondi, cas limites, transitions), avec le jeu
    d'essai comme premier exemple, pas comme vérité définitive ;
  - un écart de chiffre entre deux écrans n'est un défaut que s'il révèle une **règle** mal appliquée.
- **Ne rien inventer dans les règles** : toute règle vient des documents ou d'une décision écrite
  du porteur.
- **Toute correction** est décrite dans son commit (défaut, cause, correction, vérification).
- **Ne pas déplacer** `02_Prototype_HTML`, `03_Captures`, `04_Pages_HTML` (chemins relatifs).

---

## 7. Annexes

### Commits de la branche `espace-client`

| Commit | Contenu |
|---|---|
| `4dac898`, `ac6ed25` | Prototype (version simple, version complète) — commits d'origine |
| `47fcdac` | Correction de la feuille « Moyen de paiement » (deux prototypes) + `.gitignore` |
| `0869746` → `fe1726c` | CL-00 à CL-16, un commit par document (correction de CL-16 incluse) |
| `8fdd896` | `index.html` des documents |
| `5b2bb06` | Fichiers d'accompagnement des figures |
| `f561c3c` | Images sources du prototype |
| `a5d56aa`, `11233db`, `d8e594f` | Captures fond clair, fond sombre, anglais |
| `3429e50` | Logique métier en JSON |
| `8b58ed5`, `36854e6` | Passation, suivi des règles et des 840 actions |
| `47702a7` → `6536a34` | Documents PDF du paquet : entrée, R1 à R4, CL-00 et CL-01, CL-02, puis un commit par document de CL-03 à CL-16 |
| `3e6cc3b` | `.gitattributes` : fichiers binaires |

### Les 33 règles « À trancher »

CDS-16, CAL-09, CFP-29, CFR-18, CFR-19, CFR-20 (suppléments de classe M, L, XL, domicile) ·
CAP-14, CIN-33 (code de vérification du numéro) · CAC-19 (rangées d'accueil) · CCM-17, CAV-10
(fenêtre de notation) · CSM-14 (SMS économiques) · CGA-23 (commande « Validée » non retirée) ·
CLT-28, CLT-39, CLT-51, CLT-60, CLT-61 (délais et montants des litiges) · CRO-22, CRO-24, CRO-25
(retours) · CRP-02 (délai de remplacement) · CAN-18 (plafond d'annulations) · CLE-24 (lien de liste
d'envies) · CCZ-04, CMD-13, CRV-05 à CRV-09 (modules EX-02 à EX-06) · CCN-11 (score de zone) ·
CTV-31 (produits interdits).

### Actions et questions par document

| N° | Document | Pages | Actions | Questions ouvertes |
|---|---|---|---|---|
| R1 | REF-CL | 158 | 81 | 20 |
| R2 | REF-VD | 140 | 64 | 24 |
| R3 | REF-PRODUIT | 67 | 29 | 8 |
| R4 | REF-COMMISSION | 7 | 5 | 2 |
| 01 | CL-00 | 37 | 11 | 12 |
| 02 | CL-01 | 87 | 33 | 22 |
| 03 | CL-02 | 75 | 31 | 21 |
| 04 | CL-03 | 79 | 26 | 16 |
| 05 | CL-04 | 49 | 14 | 10 |
| 06 | CL-05 | 41 | 13 | 6 |
| 07 | CL-06 | 54 | 18 | 13 |
| 08 | CL-07 | 52 | 17 | 10 |
| 09 | CL-08 | 55 | 25 | 13 |
| 10 | CL-09 | 107 | 56 | 22 |
| 11 | CL-10 | 78 | 43 | 14 |
| 12 | CL-11 | 100 | 56 | 18 |
| 13 | CL-12 | 69 | 32 | 9 |
| 14 | CL-13 | 99 | 50 | 16 |
| 15 | CL-14 | 117 | 54 | 16 |
| 16 | CL-15 | 110 | 61 | 17 |
| 17 | CL-16 | 130 | 121 | 42 |
| | **Total** | **1 711** | **840** | **331** |

### Commandes utiles

```bash
gh auth status
```

```bash
git log --oneline main..espace-client
```

```bash
python3 logique-metier/outils/extraire.py && python3 logique-metier/outils/organiser.py
```
