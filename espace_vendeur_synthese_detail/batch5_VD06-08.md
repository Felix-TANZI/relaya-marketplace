# Synthèse — Batch 5 : VD-06, VD-07, VD-08 (Espace vendeur)

Documents source (guides développeur, pré-digérés depuis PDF, captures retirées) :
- VD-06 — Remise, reçu et erreurs (18 p. / 2 parties / 13 actions, VD-D07.A01+)
- VD-07 — Litiges et retours (25 p. / 2 parties / 17 actions, VD-D08.A01+)
- VD-08 — Produits et nouvelle offre (35 p. / 3 parties / 33 actions, VD-D09.A01+)

Tous datés 27 septembre 2026, version document 1.0 du 24 septembre 2026.

---

## 1. VD-06 — Remise, reçu et erreurs

- **Titre** : VD-06 — Remise, reçu et erreurs
- **Code de suivi des actions** : VD-D07 (actions VD-D07.A01…, questions VD-D07.Q01…)
- **Pages** : 18 · **Parties** : 2 (Partie 01 p.1-9, Partie 02 p.10-18) · **Actions** : 13 (A01 à A13)
- **Règles citées** : 11 (partie 01) + 10 (partie 02) = 21 ; **valeurs clés** : 4 (partie 01) + 9 (partie 02) = 13

### 1.1 Écrans couverts

| Écran | Objectif (1 phrase) | Éléments/composants UI principaux | Actions utilisateur |
|---|---|---|---|
| **Remise au livreur** | Remettre l'article au bon livreur, et à lui seul, en vérifiant son visage avant d'afficher le code. | Pastilles « Prête à 10 h 05 », « Colis S » ; carte nuit « Livreur du créneau » (photo, nom, entreprise, créneau) ; code masqué (2 groupes de 3 points) ; encadré rouge d'avertissement ; bloc replié « Comment ça marche ». | Afficher le code / Masquer le code (une seule action à la fois) ; « Écrire au support ». |
| **Remis au livreur** | Confirmer la remise, rassurer sur la couverture, dire ce qui est gardé et quand c'est versé, garder les 2 photos comme preuve. | Coche verte de confirmation ; carte clé liseré vert « Vous êtes couvert » + montant gardé ; frise repliée « Comment ça marche » ; deux photos légendées (horodatées, géolocalisées). | Terminer ; Voir le reçu. |
| **Reçu vendeur** | Fournir une preuve de vente simple et partageable, sans aucune donnée du client. | En-tête « REÇU VENDEUR » ; lignes article/classe/client (« Identité masquée »)/encaissé par/prix de vente ; montant gardé en grand ; mention « pas une facture fiscale ». | Partager le reçu ; Voir mes documents. |
| **États d'erreur à la remise** | Montrer exactement ce que voit le vendeur quand la remise bloque, avec un seul bouton d'action. | Composant `ErrorCard` unique (titre, 1-2 lignes, un bouton, « Pourquoi ? » replié) ; six cas (livreur absent, remise bloquée, annulée, délai dépassé, pas de réseau, plafond de valeur). | Un bouton par cas (voir tableau des 6 cas) ; « Écrire au support » sur certains cas. |

### 1.2 Tableau de toutes les actions numérotées

| ID | Description courte | Partie | Statut |
|---|---|---|---|
| VD-D07.A01 | Afficher le livreur du créneau en tête (photo, nom, entreprise, créneau) dès l'attribution | 01 | — |
| VD-D07.A02 | Ajouter le code de remise à 6 chiffres masqué par défaut, affiché au toucher, chiffré en cache hors connexion | 01 | — |
| VD-D07.A03 | Supprimer toute consigne d'emballage/code côté vendeur ; gestes du livreur repliés dans « Comment ça marche » | 01 | — |
| VD-D07.A04 | Écrire le transfert de responsabilité et journaliser `handover.completed` | 01 | — |
| VD-D07.A05 | Supprimer le bouton « Le livreur est là » ; passage seul à « Remis au livreur » sur `handover.completed` | 01 | — |
| VD-D07.A06 | Vérifier le code côté serveur à la saisie du livreur ; journaliser `handover_code.viewed` | 01 | — |
| VD-D07.A07 | « Écrire au support » ouvre la Messagerie (fil « Support BelivaY »), jamais WhatsApp | 01 | — |
| VD-D07.A08 | Ajouter l'écran « Remis au livreur » : « Vous êtes couvert », kept_amount figé, frise repliée, 2 photos légendées | 01 | — |
| VD-D07.A09 | Remplacer la « Facture » par commande par le reçu à partager (GET /orders/{id}/receipt) ; commission sur facture mensuelle | 02 | — |
| VD-D07.A10 | Retirer ville et nom du client du document ; « Identité masquée » ; filtrage côté serveur | 02 | — |
| VD-D07.A11 | Remplacer les bandeaux génériques par le composant ErrorCard (six cas, teinte selon gravité) | 02 | — |
| VD-D07.A12 | Retirer les codes d'état et de règle de l'écran ; détail technique dans les journaux (Sentry/GlitchTip) | 02 | — |
| VD-D07.A13 | « Écrire au support » ouvre la Messagerie, fil « Support BelivaY », avec la référence | 02 | — |

*Note : le document ne donne pas de statut V/D/Δ/P explicite pour les actions elles-mêmes (uniquement des cases à cocher) ; le statut V/D/Δ/P n'est attaché qu'aux règles (REM-xx, RCU-xx, ERR-xx, voir 1.3).*

### 1.3 Règles métier et statuts

| ID | Règle | Statut |
|---|---|---|
| REM-01 | Code de remise affiché au toucher seulement, en grand, masqué en quittant l'écran | Décidé |
| REM-02 | Jamais de code sans le nom et la photo du livreur | Décidé |
| REM-03 | Le livreur contrôle, deux photos (à découvert, colis fermé étiqueté), emballage BelivaY, scelle, étiquette ; volumineux dans leur carton d'origine filmé | Décidé |
| REM-04 | À la remise, responsabilité transférée à l'entreprise de livraison ; colis perdu/abîmé ensuite payé au vendeur (E7) | Décidé |
| REM-05 | Le code marche sans réseau | Décidé |
| REM-06 | Photos du contrôle versées automatiquement au dossier, horodatées et géolocalisées (V31) | Décidé |
| REM-07 | Frise de libération selon le palier (3 j Bronze/Argent, 1 j Or/Platine) | Décidé |
| REM-08 | Une seule action à la fois ; remise enregistrée par la saisie du livreur, passage seul à « Remis » | Recommandé |
| REM-09 | Code en deux groupes de trois chiffres (ex. 481 729) | Recommandé |
| CEX-02 (client) | Le livreur contrôle, emballe et scelle chez le vendeur, photos à l'appui | Décidé |
| RCU-01 | Reçu : prix de vente et « Vous gardez » ; aucune ligne de commission | Décidé |
| RCU-02 | Commission sur la facture mensuelle (Documents), là où la loi l'exige | Décidé |
| RCU-03 | Ni nom, ni numéro, ni adresse du client, ni relais | Décidé |
| RCU-04 | « Mandataire » expliqué sur place : « c'est-à-dire pour votre compte » | Recommandé |
| ERR-01 | Structure unique (titre, 1-2 lignes, un bouton plein, au plus un lien, « Pourquoi ? » replié) ; rouge bloquant, ambre temporaire, encre information | Décidé |
| ERR-02 | Jamais de code technique ni de texte non traduit | Décidé |
| ERR-03 | Aucun code de règle (E9, g2, V11…) à l'écran | Recommandé |
| ERR-04 | Chaque bouton mène à l'écran où l'action se fait | Recommandé |
| CDE-18 (client) | Annulation par boutique ; bouton grisé dès la collecte | Décidé |

### 1.4 Règles métier et calculs clés (chiffres exacts)

- Code de remise : **6 chiffres**, aléatoire, à usage unique ; **trois codes distincts** dans la chaîne (remise, dépôt, retrait) ; **pas de QR** (E6).
- **3 essais faux** ⇒ **blocage 24 h**, BelivaY prévenu ; déblocage automatique 24 h après (non précisé qui débloque manuellement — support ?).
- Plafonds de valeur par entreprise de livraison : **≤ 75 000 F** ⇒ Nouveau ou mieux ; **≤ 250 000 F** ⇒ Confirmé ou Or ; **> 250 000 F** ⇒ **Or seulement** (sans plafond, assuré ; délai calculé depuis l'annonce du créneau, E8). Exemple concret dans Fig. 10 : iPhone 15 Pro Max **350 000 F**.
- Livreur absent ⇒ délai suspendu jusqu'au créneau suivant, sans effet pour le vendeur (E9).
- Frise de libération : **3 jours** au palier Bronze/Argent, **1 jour** Or/Platine ; versement **le vendredi** suivant, sans frais (ex. Fig. 3 : vendeur garde **17 840 F**).
- Fig. 1/Fig. 2 : livreur exemple « Serge M., Wink Express », créneau « aujourd'hui 14 h-16 h » ; code exemple **481 729**.
- Fig. 4 (reçu) : référence BLV-00008, encaissé lun. 21 sept. 2026 à 08 h 42, prix de vente **20 000 F**, vendeur garde **17 840 F**.
- Fig. 6 : remise bloquée 24 h, débloquée « demain (mardi 22) à 14 h 35 ».
- Fig. 8 : délai dépassé, commande devait être prête avant **12 h 42** ; chaque minute compte sur la Ponctualité.

### 1.5 Endpoints API et événements

- `GET /orders/{id}` → `courier{name, photo_url, company, slot}`
- `GET /orders/{id}/handover-code` (affichage au toucher, chiffré en cache local)
- Événements : `handover_code.viewed`, `handover.completed` (webhook avec `photos[]`)
- `GET /orders/{id}/receipt`
- Composant `ErrorCard{tone, icon, title, detail, facts[≤2], action{label, href}, link?, why}` ; table unique de messages serveur (FR/EN) ; journaux Sentry / GlitchTip.

### 1.6 Erreurs et cas limites (section dédiée : six cas d'erreur à la remise)

1. **Livreur absent** (E9, ambre) : « Le livreur n'est pas venu » ; repasse au créneau suivant ; délai suspendu, aucun effet pour le vendeur.
2. **Remise bloquée** (E6, rouge) : 3 codes faux, BelivaY prévenu, déblocage 24 h après.
3. **Commande annulée** (V11, ambre) : annulée par le client avant ramassage ; stock rendu ; **aucun effet sur le Trust Score**.
4. **Délai dépassé** (C3, rouge) : chaque minute de retard compte sur la Ponctualité.
5. **Pas de réseau** (V01, ambre) : le code fonctionne quand même ; action mise en file, part au retour du réseau avec son heure d'origine.
6. **Plafond de valeur** (E8, encre) : colis > 250 000 F, seule une entreprise Or assurée peut le prendre.

### 1.7 Questions ouvertes à trancher (recopiées)

- **VD-D07.Q01** (partie 01) : Nom des codes : « code de remise » (vendeur → livreur) ici, alors que le glossaire client v3 appelle « code de remise » le code du livreur au relais (inter-espaces n° 18, déjà ouvert).
- **VD-D07.Q02** (partie 01) : Blocage 24 h après 3 codes faux à la remise : qui débloque (support ?) — non précisé.
- **VD-D07.Q03** (partie 02) : Remise bloquée : déblocage automatique 24 h après (Fig. 6) — cohérent avec la chaîne ; à aligner avec l'application du livreur (LIV).

### 1.8 Contradictions internes / incohérences apparentes

- Nommage ambigu du « code de remise » selon l'espace (vendeur→livreur ici vs livreur→relais côté glossaire client v3) — même terme, deux référents différents.
- Aucune autorité claire de déblocage manuel après le blocage 24 h (support non explicitement mandaté).

---

## 2. VD-07 — Litiges et retours

- **Titre** : VD-07 — Litiges et retours
- **Code de suivi** : VD-D08 (actions VD-D08.A01…, questions VD-D08.Q01…)
- **Pages** : 25 · **Parties** : 2 (Partie 01 p.1-11, Partie 02 p.12-25) · **Actions** : 17 (A01 à A17)
- **Règles citées** : 13 (partie 01) + 21 (partie 02) = 34 ; **valeurs clés** : 7 (partie 01) + 9 (partie 02) = 16

### 2.1 Écrans couverts

| Écran | Objectif (1 phrase) | Éléments/composants UI principaux | Actions utilisateur |
|---|---|---|---|
| **Litiges reçus** | Dire d'un coup d'œil l'argent gelé, le délai de 48 h, et pour chaque litige l'heure limite et le bouton Répondre. | Carte nuit « Argent gelé » (montant en rouge, pastille « N litiges ») ; filtres À répondre/En médiation/Clos ; carte par litige (compte à rebours, montant gelé) ; blocs repliés « Comment ça marche », « Éviter les litiges ». | Répondre (bouton plein sur le plus urgent). |
| **Répondre** | Répondre en un écran parmi trois postures, chacune expliquée en une ligne, photos/preuves repliées. | Surtitre compte à rebours ; carte « Ce que dit le client » (motif, montant gelé, photos client repliées) ; 3 boutons radio (j'accepte / je conteste / arrangement) ; bloc conditionnel selon choix ; compteur de caractères (arrangement). | Envoyer ma réponse (verrouillée après envoi) ; Relire les messages de la commande ; Voir les photos du client. |
| **Décision et suites** | Dire l'issue en tête (somme, destination), le motif écrit et l'effet sur le Trust Score. | Carte clé selon issue (médiation en cours / gagné vert / perdu rouge / clos) ; frise « Où en est votre litige » ; carte « Motif écrit de la décision ». | Retour aux litiges (seul bouton plein) ; Contester la décision (litige perdu seulement, une fois). |
| **Retours en cours** | Distinguer le retour du litige, suivre chaque article qui revient (arrivée, échéance d'inspection, montant gelé). | Filtres À décider/En route/Clos ; carte en trois lignes (arrivée, échéance inspection, montant gelé) ; bloc replié « Voir le détail » et « Comment ça marche ». | Préparer l'inspection. |
| **Inspection à la réception** | Une liste en trois temps (constater, photographier, répondre) sous 48 h après réception. | Cases à cocher (scellé intact, numéro de série) ; ajout de photos (2 min.) ; question radio « Le défaut décrit est-il là ? ». | Continuer : remplacer ou rembourser (si conforme) ; Envoyer mes preuves en médiation (si non conforme). |
| **Proposer un remplacement** | Après défaut confirmé, choisir entre remplacer (client accepte/refuse) et rembourser. | Deux boutons radio (Proposer un remplacement / Rembourser le client) ; carte article neuf en stock ; carte « Dans les deux cas, défaut confirmé » (coût, effet Trust Score). | Proposer le remplacement / Rembourser le client. |

### 2.2 Tableau de toutes les actions numérotées

| ID | Description courte | Partie |
|---|---|---|
| VD-D08.A01 | Afficher le total gelé renvoyé par GET /disputes (670 648 F, barème par tranches) au lieu de 616 000 F | 01 |
| VD-D08.A02 | Remplacer « Contestations acheteurs » par « Litiges reçus » ; jamais « acheteur » (V82) | 01 |
| VD-D08.A03 | Ajouter compte à rebours de 48 h, heure limite en mots simples et bouton « Répondre » (plein pour le plus urgent) | 01 |
| VD-D08.A04 | Ranger une seule frise dans « Comment ça marche » ; remplacer le bloc « droits et obligations » par deux blocs repliés | 01 |
| VD-D08.A05 | Remplacer « 3 messages » par le lien « Relire les messages de la commande » vers le fil rattaché | 01 |
| VD-D08.A06 | Retirer les captures WhatsApp des preuves acceptées | 01 |
| VD-D08.A07 | Créer l'écran « Répondre » (POST /disputes/{id}/answer, 3 postures, preuves automatiques, compteur 40 caractères) | 01 |
| VD-D08.A08 | Aligner la règle du silence : v3 impose présomption + décision BelivaY sans remboursement auto, VD applique arbitrage automatique par tâche planifiée (G1) | 01 |
| VD-D08.A09 | Ajouter l'écran d'issue (webhook dispute.decided → notification) et l'issue « Litige clos » après acceptation | 02 |
| VD-D08.A10 | Ajouter la liste des retours distincte des litiges (GET /returns?state=…) avec carte 3 lignes et règles repliées | 02 |
| VD-D08.A11 | Traiter le colis non retiré sans ligne de retour, sans montant gelé ni événement Trust Score (parcel.unclaimed) ; vocabulaire sans « échec »/« pénalité »/« refusé » | 02 |
| VD-D08.A12 | Ajouter l'inspection en trois temps (POST /returns/{id}/inspection) et le remboursement automatique à 48 h (tâche planifiée H5) | 02 |
| VD-D08.A13 | Ajouter « Remplacer ou rembourser » (POST /returns/{id}/replacement), bascule en remboursement à 72 h ouvrées | 02 |
| VD-D08.A14 | Aligner avec la v3 la chronologie (médiation 48 h, senior 3 j, client silencieux 5 j, contestation) | 02 |
| VD-D08.A15 | Aligner la règle du défaut caché après « Tout est en ordre » (vice caché plutôt que retour, ou corriger 12.6) | 02 |
| VD-D08.A16 | Afficher côté console la correspondance des 4 motifs vendeur/relais avec les 5 motifs client | 02 |
| VD-D08.A17 | Aligner RMP-02 (le client accepte ou refuse) avec la v3 : le souhait « Être remplacé » vaut accord | 02 |

*Note : comme pour VD-06, ces actions n'ont pas de statut V/D/Δ/P propre — le statut est attaché aux règles (LIT-xx, REP-xx, DCS-xx, RET-xx, INP-xx, RMP-xx ci-dessous). Plusieurs actions (A08, A14, A15, A16, A17) sont explicitement des demandes d'arbitrage/alignement entre VD et le glossaire client v3 — ce sont des signaux forts de contradiction interne au corpus (voir §2.8).*

### 2.3 Règles citées et statuts

| ID | Règle | Statut |
|---|---|---|
| LIT-01 | Argent gelé en tête, en rouge, sans date de versement | Décidé |
| LIT-02 | Conséquence du silence écrite une fois : « sans réponse, décision en faveur du client » ; heure limite par carte | Décidé |
| LIT-03 | Un litige en cours n'a aucun effet sur le Trust Score ; il ne compte qu'une fois tranché (C2) | Décidé |
| LIT-04 | Un seul bouton plein : « Répondre » du plus urgent | Décidé |
| LIT-05 | Explications repliées (« Comment ça marche », « Éviter les litiges ») | Décidé |
| PBL-01/06/07/08/05, CDE-10 (client) | Voir §2.4 (paliers, présomption, litige au comptoir) | Décidé |
| REP-01 | Trois postures : j'accepte (remboursement, clos aujourd'hui) · je conteste (preuves, médiation) · arrangement (≥ 40 caractères) | Décidé |
| REP-02 | Réponse envoyée non modifiable ; médiation sous 48 h | Décidé |
| REP-03 | Capture WhatsApp ≠ preuve ; le fil de la messagerie BelivaY l'est | Décidé |
| REP-04 | Répondre demande le réseau | Décidé |
| REP-05 | Chaque réponse expliquée en une ligne ; la suite écrite sous le bouton | Décidé |
| REP-06 | Photos du client repliées ; « Vos preuves » ouvert (conteste), replié (arrangement), absent (accepte) | Décidé |
| DCS-01 | Issue, somme et destination en tête | Décidé |
| DCS-02 | Gagné : aucun effet sur le score ; perdu : critère Litiges g1 (mineur) ou g3 (grave) | Décidé |
| DCS-03 | Contestation une fois, devant un médiateur senior, sous 3 jours | Décidé |
| DCS-04 | Un seul bouton plein « Retour aux litiges » ; « Contester la décision » clair, litige perdu seulement | Décidé |
| RET-01 | Aucun retour sans motif : non conforme, abîmé, contrefaçon, défaut caché | Décidé |
| RET-02 | Fenêtre 7 jours, fermée plus tôt par « Tout est en ordre » ; défaut caché signalable 48 h même après confirmation | Décidé |
| RET-03 | Remboursement à la réception et à l'inspection, jamais à la demande | Décidé |
| RET-04 | Trajet retour 500 F à la charge de la partie en tort (vendeur, transporteur ou client) | Décidé |
| RET-05 | Dépôt au relais par défaut, ramassage pour les volumineux ; aucun frais de stockage sur un colis en retour | Décidé |
| RET-06 | Vice caché jusqu'à 100 jours ; après libération : reprise datée ligne par ligne dans Mes gains | Décidé |
| RET-07 | Carte : arrivée, échéance d'inspection, montant gelé visibles ; reste replié | Décidé |
| RET-08 | Colis non retiré : 7 jours au relais puis renvoyé au vendeur sans frais pour lui (500 F à la charge du client), sans effet Trust Score ; ni inspection ni argent gelé ; remis en stock | Décidé |
| PBL-09/10/11/13/14, ENT-02, CEX-04 (client) | Règles liées non détaillées individuellement dans ce document | Décidé |
| INP-01 | Deux photos au moins, heure et lieu | Décidé |
| INP-02 | Non conforme : preuves en médiation ; si le vendeur a raison, le client paie le trajet | Décidé |
| INP-03 | La présence du défaut est la question de l'étape 3 (verdict conforme / non conforme) | Décidé |
| RMP-01 | Remplacement expédié sous 72 h ouvrées après l'accord, sinon remboursement automatique (H6) | Décidé |
| RMP-02 | Le client accepte ou refuse ; s'il refuse, il est remboursé et l'article défectueux reste au vendeur | Décidé |
| RMP-03 | Coût du défaut confirmé (500 F, g3 sur la Qualité) affiché pour les deux choix ; « Vous gardez » seulement pour le remplacement | Décidé |

### 2.4 Règles métier et calculs clés (chiffres exacts)

- **Délai de réponse au litige** : `t_limite = ouverture + 48 h`. Exemple : BLV-00005 ouvert dim. 20 à 05 h 30 ⇒ échéance mar. 22 à 05 h 30 (reste 19 h 42 à 09 h 48 dans l'exemple) ; BLV-00006 : 44 h 14 restant (échéance mer. 23 sept. à 06 h 02).
- **Sans réponse** (`t_now ≥ t_limite`) ⇒ arbitrage automatique en faveur du client, appliqué par **tâche planifiée (G1)**.
- **Arrangement** : texte ≥ **40 caractères** (G2) — exemple 103 caractères dans Fig. 3.
- **Remplacement accepté** : expédition ≤ **72 h ouvrées**, sinon remboursement automatique (H6).
- **Montant gelé exemple** : 670 648 F (total, 2 litiges) ; 335 324 F (un litige, iPhone 15 Pro Max).
- **Ancien barème (actuel)** : 616 000 FCFA bloqués — à remplacer.
- **Chronologie de décision** : médiation ≤ **48 h** → médiateur senior ≤ **3 jours** → tribunal (motif écrit, G3) ; **client silencieux 5 jours** après ouverture ⇒ clos en faveur du vendeur (G6).
- **Seuil de remboursement automatique** : montant ≤ **3 000 F** (palier Standard) ou ≤ **10 000 F** (palier Élevé, « client très fiable ») ⇒ BelivaY rembourse directement, vendeur payé, score non touché (F8).
- **Taux de litiges anormal** ⇒ revue humaine, **jamais de sanction automatique** (G5).
- **Fenêtre de retour** : **7 jours**, fermée plus tôt par « Tout est en ordre » ; **défaut caché signalable 48 h** même après confirmation.
- **Trajet retour** : **500 F** à la charge de la partie en tort (vendeur, transporteur ou client).
- **Vice caché** : recevable jusqu'à **100 jours**.
- **Inspection à réception** : `t_limite = réception + 48 h`. Exemple : BLV-00004 reçue mar. 22 (14 h-16 h) ⇒ échéance jeu. 24 à 16 h. Sans décision ⇒ remboursement automatique (**tâche planifiée H5**).
- **Colis non retiré** : gardé **7 jours** au relais puis renvoyé au vendeur **sans frais**, **500 F à la charge du client**, sans effet sur le Trust Score du vendeur, remis en stock.
- **Défaut confirmé (exemple)** : coût 500 F (trajet), effet Trust Score « **g3** — Échec grave sur la Qualité ».
- **Litige perdu (exemple)** : effet Trust Score « **g1** — Échec léger sur le critère Litiges ».
- **Recevabilité d'un signalement** : exemple Fig. 8, retirée sam. 19 sept. à 10 h, défaut signalé dim. 20 sept. à 16 h, **30 h après le retrait** : jugé recevable (dans la fenêtre 48 h).

### 2.5 Endpoints API et événements

- `GET /disputes?state=to_answer|mediation|closed` (total gelé = Σ kept_amount gelés, tri deadline_at)
- `GET /disputes/{id}` → `opened_at, customer_photos[]`
- `POST /disputes/{id}/answer {posture, text, proposal, evidence[]}`
- Webhook `dispute.decided`
- Routes : `#litige?ref=BLV-00005&pos=conteste|accepte|arrangement`, `#litige_envoye?ref=…&issue=accepte|attente|gagne|perdu`, `#contester` (VD-10)
- `GET /returns?state=to_decide|on_the_way|closed` → `received_window, inspection_due_at, kept_amount, collected_at, reported_at`
- Événement `parcel.unclaimed`
- `POST /returns/{id}/inspection {checks{seal, serial}, photos[], verdict}`
- `POST /returns/{id}/replacement`
- Routes `#inspection?d=conforme|non`, `#remplacement?c=rembourser`

### 2.6 Erreurs et cas limites

- « Contestation utilisée le … » (contestation déjà consommée — une seule autorisée).
- « BLV-… n'a pas été retiré : il vous revient, sans frais ni effet sur votre Trust Score ».
- « Ajoutez au moins deux photos ».
- « Remboursé automatiquement le … ».
- « Plus en stock » (remplacement impossible).
- « X caractères · 40 au moins » (arrangement trop court).
- « Répondre à un litige demande le réseau ».
- « Le délai est passé : décision en faveur du client ».

### 2.7 Questions ouvertes à trancher (recopiées)

- **VD-D08.Q01** (partie 01) : Silence du vendeur : arbitrage automatique en faveur du client (VD : tâche planifiée, critère « s'applique réellement ») contre décision humaine motivée sans remboursement automatique (v3 CLI-19, CCN-04) : à trancher, **écart majeur**.
- **VD-D08.Q02** (partie 01) : « J'accepte » : « l'article revient par le relais » — qui paie le trajet et comment le retour est organisé (lien avec retour partie 02).
- **VD-D08.Q03** (partie 02) : Client silencieux 5 jours ⇒ clos en faveur du vendeur ; contestation devant un médiateur senior sous 3 jours ; « tribunal » : absents de la v3 client (aucun recours, CLT-47 ; pas de délai de réponse, CLT-51) — déjà ouvert (n° 33).
- **VD-D08.Q04** (partie 02) : Délai de la médiation : « avant mercredi 23 sept. à 09 h 48 » (48 h après la réponse) contre « au plus tard 24 h après l'échéance du vendeur » côté client (CLT-39).
- **VD-D08.Q05** (partie 02) : Défaut caché signalable 48 h même après « Tout est en ordre » (RET-02) contre fenêtre fermée côté v3 (n° 21).
- **VD-D08.Q06** (partie 02) : Motifs : quatre (VD/PR) contre cinq (client) (n° 30).
- **VD-D08.Q07** (partie 02) : Colis non retiré : trajet 500 F à la charge du client (RET-08) — cohérent avec GARDE-RENVOI.

### 2.8 Contradictions internes / incohérences apparentes

- **Écart majeur (Q01/A08)** : VD applique un **arbitrage automatique** en faveur du client à l'échéance de 48 h (tâche planifiée G1), alors que le glossaire client v3 (CLI-19, CCN-04) impose une **présomption en faveur du client mais une décision humaine motivée**, « jamais de remboursement automatique à l'échéance ». C'est une divergence structurelle sur le mécanisme même de décision.
- **Chronologie de médiation incohérente** (Q03/Q04) : VD parle de médiation ≤ 48 h → médiateur senior ≤ 3 j → « tribunal » (terme absent du glossaire client v3, qui ne prévoit ni recours (CLT-47) ni délai de réponse (CLT-51)) ; le délai de décision annoncé (« avant mercredi 23 sept. à 09 h 48 », soit 48 h après la réponse) diffère du délai côté client (« au plus tard 24 h après l'échéance du vendeur », CLT-39).
- **Défaut caché / fenêtre de retour** (Q05) : RET-02 autorise un signalement de défaut caché 48 h même après confirmation « Tout est en ordre », alors que la v3 semble fermer cette fenêtre plus tôt (n° 21) — VD-D08.A15 demande explicitement de trancher entre « vice caché plutôt que retour » ou corriger la référence 12.6.
- **Nombre de motifs de litige/retour incohérent** (Q06) : 4 motifs côté vendeur/relais (VD/PR) contre 5 motifs côté client.
- **RMP-02 vs v3 sur le remplacement** (A17) : VD dit « le client accepte ou refuse » un remplacement proposé, mais la v3 semble considérer que le souhait initial « Être remplacé » vaut déjà accord — pas de second acquiescement prévu côté client dans ce cas selon v3.

### 2.9 Pertinence pour les décisions BelivaY déjà actées (mémoire)

Le document ne mentionne ni « J+3 = délai de règlement depuis l'événement de libération » ni « garde-au-relais 200F/jour puis retour J+7 » tels que formulés dans les décisions internes BelivaY (Addendum Décisions v1.0 / Gros morceaux). Les éléments les plus proches trouvés dans VD-07 sont :
- **RET-08** : colis de retour non retiré au relais → gardé **7 jours**, puis **renvoyé sans frais au vendeur** (500 F facturé au client), **sans montant gelé et sans effet Trust Score**. Ceci ressemble structurellement au modèle « garde-au-relais puis retour à J+7 », mais **aucun tarif de garde journalier (200F/jour) n'est mentionné** dans ce document — le document ne prévoit pas de facturation de garde progressive, seulement un forfait de trajet retour à 500 F.
- **RET-06** : la libération/versement du vendeur après un vice caché se traduit par une « reprise datée ligne par ligne dans Mes gains » — pas de formule explicite de type « J+3 depuis événement de libération », mais le principe d'un ajustement après coup (plutôt qu'un blocage total) est cohérent avec l'esprit « pas de clawback global, ajustement documenté ».
- **DCS-02/F5-D4** : « perdu ⇒ remboursement, commission annulée » suggère un mécanisme d'annulation ciblée plutôt qu'un retrait rétroactif massif, cohérent avec l'esprit « pas de clawback » — mais ce n'est pas énoncé comme règle générale de temporisation J+3.
- **Aucune mention explicite** d'un tarif de 200F/jour de garde, ni d'un délai de J+3 formulé comme « délai de règlement depuis l'événement de libération ». À vérifier/reporter dans le document de synthèse transverse : ce guide VD-07 ne semble pas encore aligné (ou n'aborde simplement pas) le modèle de garde tarifée par jour décidé en interne.

---

## 3. VD-08 — Produits et nouvelle offre

- **Titre** : VD-08 — Produits et nouvelle offre
- **Code de suivi** : VD-D09 (actions VD-D09.A01…, questions VD-D09.Q01…)
- **Pages** : 35 · **Parties** : 3 (Partie 01 p.1-10, Partie 02 p.11-22, Partie 03 p.23-35) · **Actions** : 33 (A01 à A33)
- **Règles citées** : 15 (partie 01) + 13 (partie 02) + 19 (partie 03) = 47 ; **valeurs clés** : 6 + 9 + 7 = 22

### 3.1 Écrans couverts

| Écran | Objectif (1 phrase) | Éléments/composants UI principaux | Actions utilisateur |
|---|---|---|---|
| **Mes produits** | Montrer d'un coup d'œil ce qui se vend, ce qui attend vérification, ce qui demande une action, le plus urgent en haut. | Ligne de synthèse (N produits · n en vente · n en vérification) ; carte par produit avec liseré d'état, bandes d'attention (stock bas, moins cher, vérification, litige) chacune avec son action ; lien « Dupliquer ». | Nouvelle offre ; Réapprovisionner / Ajuster / Voir (selon bande) ; Dupliquer ; Importer/Exporter (menu ⋮). |
| **Une offre** | Montrer où l'offre passe en premier et quel prix gagne plus, puis distinguer offre (vendeur) et fiche (BelivaY). | Carte clé « Où les clients vous voient » (zones gagnées/perdues, prix qui gagne plus) ; carte « Votre offre » (ligne cadenas pour fiche BelivaY, interrupteurs cod_allowed / prix automatique) ; carte modération (en vérification). | Modifier le prix ; Modifier l'offre ; Faire une promotion ; Dupliquer ; Mettre en pause. |
| **Nouvelle offre · étape 1 (le produit)** | Chercher d'abord (nom/code-barres/photo) avant de proposer une demande de fiche. | Barre de progression 4 étapes ; champ recherche + raccourcis (Code-barres, Photo, Dicter) ; résultats avec « Vous gardez X % à Y F » ; lien « Aucun de ces produits » (après résultats seulement). | C'est celui-là ; Demander une fiche (si aucun résultat). |
| **Demander une fiche** | Demander à BelivaY d'écrire la fiche catalogue, pré-remplie, pendant que l'offre attend en brouillon. | Champs pré-remplis (recherche, marque, catégorie, photo) ; interrupteur « Fiche prioritaire · 1 000 F » ; bloc replié « Comment ça marche ». | Envoyer la demande. |
| **Nouvelle offre · étape 2 (photos + caméra)** | Prendre 3 à 8 photos réelles, allégées avant l'envoi ; scanner un code-barres. | Grille de photos avec compteur ; caméra mode code-barres (cadre or) et mode photo réelle (heure/lieu affichés). | Prendre (photo) ; Continuer ; Terminé · n. |
| **Nouvelle offre · étape 3 (stock et prix conseillé)** | Saisir stock/état puis le prix en voyant en direct ce qu'on garde ; conseil de prix avec deux boutons qui terminent l'étape. | Champs Couleur/Stock*/État* ; bloc replié « Autres réglages » ; champ prix avec montant gardé en direct ; carte « Pour vendre plus » (prix conseillé, zones gagnées) ; repli « Pourquoi ce prix ? ». | Ajuster [au prix conseillé] ; Rester [au prix saisi]. |
| **Nouvelle offre · étape 4 (récapitulatif)** | Tout relire avant de publier : produit, prix, montant gardé en tête. | Carte récapitulative unique ; bloc replié « Quand l'argent arrive, en 4 temps ». | Publier · vérification sous 48 h ; Garder en brouillon. |
| **Offre envoyée** | Confirmer l'envoi avec la date de réponse et valoriser le meilleur prix (trafic en plus). | Confirmation avec date de réponse ; carte « Meilleur prix » (si applicable) avec récompenses du mois. | Voir mes produits ; Ajouter une autre couleur. |
| **Dupliquer un produit** | Ajouter une variante (couleur/taille) sans ressaisir la fiche ; stock et prix se font une seule fois à l'étape 3. | Choix de variante (puces + « Autre… ») ; liste « Déjà créées » ; photos réelles de la variante (jamais copiées) ; repli « Ce qui est repris ». | Créer le brouillon. |

### 3.2 Tableau de toutes les actions numérotées

| ID | Description courte | Partie |
|---|---|---|
| VD-D09.A01 | Remplacer les quatre tuiles par une ligne de synthèse (compteurs GET /offers) | 01 |
| VD-D09.A02 | Trier côté serveur par urgence (stock sous seuil, vérification, attention, brouillon, reste) | 01 |
| VD-D09.A03 | Afficher « Vous gardez » par vente et « ce mois » par produit (kept_per_sale, kept_this_month) ; ventes gelées exclues | 01 |
| VD-D09.A04 | Ajouter les bandes d'attention avec action et le liseré d'état | 01 |
| VD-D09.A05 | Purger les produits de démonstration de la base de production | 01 |
| VD-D09.A06 | Déplacer Importer/Exporter dans le menu ⋮ (moins de 50 produits) ; lien « Dupliquer » libellé | 01 |
| VD-D09.A07 | Séparer Fiche (BelivaY) et Offre (vendeur) en base ; ligne cadenas dans « Votre offre » | 01 |
| VD-D09.A08 | Ajouter l'interrupteur « Accepter le paiement au retrait » par produit (PUT /offers/{id} {cod_allowed}) | 01 |
| VD-D09.A09 | Ajouter la carte clé « Où les clients vous voient » (GET /offers/{id}/price-advice) sans nom ni quartier des autres offres | 01 |
| VD-D09.A10 | Afficher la modération avec « Réponse avant … », date d'envoi, motif | 01 |
| VD-D09.A11 | Retirer prix barré, fin de promotion et « Flash Deal » libres ; promotion via vente flash seulement | 01 |
| VD-D09.A12 | Masquer « Faire une promotion » (vente flash) tant que FF-FLASH est fermé au lancement | 01 |
| VD-D09.A13 | Verrouiller la demande de fiche derrière la recherche (aucun raccourci « Créer un nouveau produit ») | 02 |
| VD-D09.A14 | Ajouter code-barres, photo (reconnaissance côté serveur) et dictée FR/EN/pidgin | 02 |
| VD-D09.A15 | Afficher « Vous gardez X % à Y F » calculé par le service de commission, à gauche de « C'est celui-là » | 02 |
| VD-D09.A16 | Ajouter la progression nommée commune (offerSteps) aux quatre étapes | 02 |
| VD-D09.A17 | Rattacher automatiquement les doublons (similarité ≥ 0,85) | 02 |
| VD-D09.A18 | Remplacer le formulaire de fiche complet par la demande courte pré-remplie (POST /sheet-requests), option prioritaire 1 000 F | 02 |
| VD-D09.A19 | Porter les photos à 3 minimum, 8 maximum, 800×800 px ; compression canvas ; EXIF heure/lieu ; file hors connexion | 02 |
| VD-D09.A20 | Ajouter « Terminé · n » dans la caméra et les consignes sur voile sombre | 02 |
| VD-D09.A21 | Mesurer en production la médiane de création (≤ 60 s fiche existante, ≤ 2 min demande) avec alerte | 02 |
| VD-D09.A22 | Remplacer « Commission BelivaY (12 %) · Vous recevez » par « Vous gardez X F par vente » en direct (débouncé 300 ms) | 03 |
| VD-D09.A23 | Retirer prix barré et fin de promotion libres ; prix barré tiré de l'historique ; remise > 50 % ⇒ vérification | 03 |
| VD-D09.A24 | Remplacer les valeurs grisées par des exemples « Ex. : » | 03 |
| VD-D09.A25 | Replier « Autres réglages · déjà remplis » ; ouverture automatique si obligatoire/erreur | 03 |
| VD-D09.A26 | Ajouter la variante (couleur) avec son stock propre | 03 |
| VD-D09.A27 | Ajouter la carte « Pour vendre plus » (GET /offers/{id}/price-advice) et ses deux boutons qui terminent l'étape | 03 |
| VD-D09.A28 | Rendre poids et dimensions obligatoires au-delà de 5 kg ou 50 cm ; tarif affiché (M03) | 03 |
| VD-D09.A29 | Vérifier le plafond de démarrage à l'étape 3 (start_cap) | 03 |
| VD-D09.A30 | Publier par POST /offers {publish: true} avec « Vous gardez » en tête du récapitulatif | 03 |
| VD-D09.A31 | Ajouter l'écran « Offre envoyée » (best_price, perks, answer_before) ; carte « Meilleur prix » seulement si vraie | 03 |
| VD-D09.A32 | Remplacer « Copie de … » par un brouillon de variante (POST /offers/{id}/duplicate) ; stock/prix à l'étape 3 ; rattachement si la variante existe | 03 |
| VD-D09.A33 | Retirer la vente flash offerte au meilleur prix tant que FF-FLASH est fermé au lancement | 03 |

*Note : statut V/D/Δ/P non attaché aux actions elles-mêmes (cases à cocher) — voir règles ci-dessous pour les statuts.*

### 3.3 Règles citées et statuts

| ID | Règle | Statut |
|---|---|---|
| PRD-01 | Ligne de synthèse « N produits · n en vente · n en vérification » | Décidé |
| PRD-02 | Tri par ce qui demande attention, jamais A à Z | Décidé |
| PRD-03 | Carte : photo, prix, vous gardez par vente, rapporté ce mois, stock, état | Décidé |
| PRD-04 | Une vente gelée n'est pas comptée dans « ce mois » | Décidé |
| PRD-05 | Une bande par sujet d'attention (stock bas, moins cher, vérification, litige) avec son action | Décidé |
| PRD-06 | Liseré : vert en vente, ambre en vérification, gris brouillon ou pause | Décidé |
| PRD-07 | « Dupliquer » sur chaque carte et dans le détail | Décidé |
| FIC-03 (client) | « Autres vendeurs » supprimé ; palier et Trust Score | Décidé |
| DEC-08 (client) | Tri « Pertinence » par défaut | Décidé |
| OFR-01 | Le vendeur contrôle prix, stock, état, photos réelles, délai, paiement au comptoir ; BelivaY contrôle titre, description, photos de référence | Décidé |
| OFR-02 | Refus du paiement au comptoir par produit ; commande validée jamais annulée par ce réglage | Décidé |
| OFR-03 | Vérification ≤ 48 h, motif toujours écrit | Décidé |
| OFR-04 | Carte clé : zones où l'offre passe en premier, noms, prix qui gagne plus (toujours égal ou plus bas, PRX-01) ; détail replié | Décidé |
| OFR-05 | Promotion seulement par vente flash : remise réelle ≥ 10 %, prix barré seulement s'il a été pratiqué | Recommandé |
| PAN-19 (client) | Comptoir : jamais pour l'étranger, gros colis, express ; refus par produit | Décidé |
| FIC-01 (client) | Badges « Certifié BelivaY », « Escrow », « Retour si problème validé » seulement s'ils sont vrais | Décidé |
| NOF-01 | Chercher d'abord ; la demande de fiche seulement après les résultats | Décidé |
| NOF-02 | Chaque résultat a son bouton « C'est celui-là » | Décidé |
| NOF-03 | Le vendeur ne crée jamais une fiche maître lui-même | Décidé |
| NOF-04 | « Étape n sur 4 », barre, noms (Produit, Photos, Prix, Publier), une question | Décidé |
| NOF-05 | Chaque résultat affiche « Vous gardez X % à Y F » au milieu du prix du marché ; prix de référence toujours écrit | Décidé |
| FCH-01 | Demande non servie de la zone signalée (« cherché 14 fois près de chez vous ») | Décidé |
| FCH-02 | Produit existant : offre rattachée, vendeur prévenu, rien perdu | Décidé |
| PHO-01 | Photos réelles 3 à 8, 800×800 px au moins (J2) | Décidé |
| PHO-02 | Compression sur le téléphone avant l'envoi | Décidé |
| PHO-03 | Heure et lieu de la prise conservés | Décidé |
| PHO-04 | Consignes de la caméra sur voile sombre | Décidé |
| PRX-01 | BelivaY ne conseille jamais d'augmenter un prix | Décidé |
| PRX-02 | Message : nombre d'offres, prix le plus bas, fourchette ; jamais nom, quartier ni Trust Score d'un autre vendeur | Décidé |
| PRX-03 | Prix minimum publiable 500 F | Décidé |
| PRX-04 | Exemples grisés « Ex. : 12 », jamais une valeur qui ressemble à une saisie ; astérisque sur l'état | Décidé |
| PRX-05 | Six états : neuf · neuf sans emballage · reconditionné · occasion comme neuf · occasion bon état · occasion état correct | **Proposé** |
| PRX-06 | Stock et état avant le prix ; les deux boutons du conseil terminent l'étape | Décidé |
| PRX-07 | Carte du conseil : prix conseillé, gardé à ce prix, zones gagnées ; reste replié | Décidé |
| PRX-08 | Barre verte : montant gardé + « soit N % » à une décimale | Décidé |
| PRX-09 | Plafond de démarrage 500 000 F par commande jusqu'à 10 commandes livrées sans incident ; brouillon gardé | **Proposé** |
| CEX-01 (client) | Le prix conseillé ne monte jamais ; attribution au coût total livré | Décidé |
| REC-01 | « Publier » envoie en vérification (≤ 48 h) ; « Garder en brouillon » ne publie rien | Décidé |
| REC-02 | Hors connexion, offre gardée, part au retour du réseau | Décidé |
| PUB-01 | Avantages du meilleur prix réels et vérifiables | Décidé |
| DUP-01 | Copie : fiche, photos de référence, catégorie, gabarit, poids, dimensions, délai, paiement au retrait ; à saisir : variante, prix, stock, photos réelles | Décidé |
| DUP-02 | La copie passe par la recherche | Décidé |
| DUP-03 | L'écran ne demande que la variante et ses photos ; stock et prix une seule fois à l'étape 3 | Décidé |
| DUP-04 | Variantes déjà créées citées avec leur état, non proposées | Décidé |

### 3.4 Règles métier et calculs clés (chiffres exacts)

**Attribution / affichage des offres**
- `attribution = argmin(prix + livraison réelle depuis la boutique)`, **Trust Score en départage** ; montré zone par zone sans autres offres (A4).
- Fig. 1/2 : « **2 zones sur 6** » (Mvog-Ada, Mvog-Mbi) — mais Fig. 10/12 mentionnent « **5 zones sur 6** » selon le prix ; Q02 relève une incohérence avec « **12 zones à Yaoundé, 4 exploitées** » côté console.

**Commission / part gardée**
- `part gardée = arrondi(100 × gardé ÷ p)`, avec `p` = milieu du prix du marché arrondi aux 500 F supérieurs.
- `commission = max(barème × 0,80 ; 700 F)` — **plancher minimum 700 F** par commande.
- Barème famille A : **13,5 % jusqu'à 20 000 F**, puis **5 %** au-delà ; **+3 points** sous **5 000 F**.
- Exemples : ITEL AC52 « Vous gardez 89 % à 20 000 F » ; 64 Go « 90 % à 24 000 F » ; coque « 65 % à 2 000 F (minimum 700 F) » ; chargeur « 83 % à 4 000 F » ; écouteurs « 72 % à 2 500 F ».
- Étape 3, exemple : prix saisi **21 000 F** ⇒ gardé **18 800 F** (89,5 %) ; prix ajusté **18 900 F** ⇒ gardé **16 859 F** (89,2 %).
- Service de commission appelé **à chaque frappe**, **débouncé 300 ms**.

**Prix conseillé**
- `prix_gagnant(zone) = meilleur prix livré concurrent − livraison − 100 F`, arrondi à la centaine inférieure (ex. 19 000 ⇒ 18 900).
- `prix conseillé = min(prix saisi ; max(médiane des prix gagnants ; 10e centile ; 500 F ; plancher privé))`.
- **Prix minimum publiable : 500 F.**
- « Rester » [au prix saisi] ⇒ aucun rappel avant **7 jours**.
- Baisse de prix automatique : seulement à la baisse, **≤ −3 %/semaine**, jamais sous le plancher privé.
- Remise > **50 %** ⇒ déclenche vérification (J3, F9) ; promotion valide seulement si remise réelle ≥ **10 %**.
- Exemple Fig. 10 : 3 offres concurrentes de 19 000 à 20 500 F ; le client économise 1 500 F ; 340 clients cette semaine ; 9 commandes sur 10 vont aux moins chers.

**Photos**
- **3 minimum, 8 maximum**, **800×800 px minimum** ; compression côté téléphone : côté long **1 600 px**, JPEG qualité **0,8**, EXIF (heure/lieu) conservé. Exemple : 6,3 Mo → 540 Ko.

**Fiches produit**
- Similarité **≥ 0,85** ⇒ rattachement automatique du doublon.
- Fiche rédigée par BelivaY sous **48 h** (**24 h en option prioritaire, 1 000 F**).
- Titre 20 à 100 caractères, description ≥ 100 mots.
- Objectifs de rapidité : offre ≤ **60 s** (sur fiche existante), demande de fiche ≤ **2 min**.

**Classe de colis / logistique**
- `classe = max(poids ; volume ÷ 5000)` et plus grande dimension ; sous-déclaration facturée au vendeur (M03).
- Poids/dimensions obligatoires au-delà de **5 kg ou 50 cm**.

**Plafond de démarrage**
- `start_cap` : **500 000 F** par commande jusqu'à **10 commandes livrées sans incident**.

**Récompenses meilleur prix**
- Offre au meilleur prix ⇒ badge « Meilleur prix » + **une vente flash** et **une vitrine de quartier offertes par mois**.
- Hausse > **10 % en 7 jours** ⇒ perte du badge et des ventes flash.

### 3.5 Endpoints API et événements

- `GET /offers` → `{counts, items:[{offer_id, title, variant, price, kept_per_sale, kept_this_month, frozen_this_month, stock, alert_threshold, state, moderation{since, answer_before}, price_advice, attention[]}]}`, `attention[]{type: low_stock|cheaper|moderation|dispute, action}`
- `GET /offers/{id}/price-advice` → `recommended_price, kept_at_recommended, zones_first, market{count, min, max}, reasons, zones[{name, first}], zones_first_at_recommended`
- `PUT /offers/{id} {cod_allowed}`
- `POST /offers/{id}/duplicate {variant, photo_ids}`
- `POST /offers {…, publish: true}` → `{best_price, perks, answer_before}`
- `GET /catalog/search?q=&barcode=&image_id=` → `{sheet_id, title, category, keep_share, keep_ref_price, variants, market_range}`
- `POST /sheet-requests {query, brand, category, photo_ids, priority}`
- Composant `offerSteps` (progression 4 étapes) ; `price_history` ; `start_cap{amount: 500000, delivered_ok, needed: 10}`
- Routes : `#offre3`, `#offre4?keep=1`, `#litiges`, `#dupliquer`, `#visibilite`

### 3.6 Erreurs et cas limites

- « Pas encore de produit » ; « Vos produits ne s'affichent pas » ; « 6 zones sur 6 … rien à changer » (déjà au meilleur prix partout).
- Offre refusée : « Corriger l'offre » ; « En pause », « Invisible des clients », « Remettre en vente ».
- « 10 % au moins » (remise refusée sous ce seuil).
- « Encore n photos » ; « Moins de 800×800 px : reprenez-la ».
- Code-barres inconnu → retour étape 1 avec le nom lu.
- « Ce produit existe déjà : votre offre y est rattachée » (doublon détecté).
- « Vous êtes déjà le prix le plus bas pour les clients : rien à changer. »
- « 500 F minimum » (prix trop bas) ; « Indiquez votre stock ».
- Poids/dimensions obligatoires si > 5 kg ou 50 cm.
- « Plus en stock » (remplacement impossible côté litiges/retours, mentionné en lien avec cette section produit).

### 3.7 Questions ouvertes à trancher (recopiées)

- **VD-D09.Q01** (partie 01) : Vente flash offerte au vendeur (OFR-05, VD-10) alors que FF-FLASH est fermé au lancement côté client (déjà ouvert, n° 64-75).
- **VD-D09.Q02** (partie 01) : « 6 zones » dans la carte clé contre « 12 zones à Yaoundé, 4 exploitées » (console) : nombre de zones à harmoniser (déjà ouvert).
- **VD-D09.Q03** (partie 02) : Formule de la part gardée « max(barème × 0,80 ; 700 F) » : ne mentionne pas les autres planchers de VD-02 (2 % du prix, marge minimale BelivaY) — vérifier qu'elle est exacte hors offre de découverte.
- **VD-D09.Q04** (partie 02) : Photos : 800×800 px minimum ici, compression côté long 1 600 px : jugé cohérent par le document lui-même.
- **VD-D09.Q05** (partie 03) : « Une vente flash offerte par mois » au meilleur prix alors que FF-FLASH est fermé au lancement (déjà ouvert).
- **VD-D09.Q06** (partie 03) : Vitrine de quartier offerte : lien avec la bande « Sponsorisé » / mise en avant (inter-espaces n° 72, déjà ouvert).
- **VD-D09.Q07** (partie 03) : PRX-05 : six états « Proposé » (libellés à valider).

### 3.8 Contradictions internes / incohérences apparentes

- **Vente flash / vitrine offertes alors que FF-FLASH est fermé au lancement** (Q01, Q05, actions A12 et A33) : le document VD-08 propose plusieurs mécaniques (« Faire une promotion », « une vente flash offerte par mois » au meilleur prix, vitrine de quartier) qui dépendent d'une fonctionnalité (FF-FLASH) explicitement fermée au lancement côté client — à neutraliser tant que le feature flag reste fermé.
- **Nombre de zones incohérent** (Q02) : « 6 zones » (carte clé vendeur, Fig. 1/2) vs « 12 zones à Yaoundé, 4 exploitées » (console admin) — deux référentiels de zonage différents cités dans le même corpus.
- **Formule de commission possiblement incomplète** (Q03) : la formule `max(barème × 0,80 ; 700 F)` citée dans VD-08 ne mentionne pas d'autres planchers présents dans VD-02 (2 % du prix, marge minimale BelivaY) — à vérifier pour cohérence hors offre de découverte.
- **PRX-05 et PRX-09 marqués « Proposé »** (non « Décidé ») : les six états de condition du produit et le plafond de démarrage (500 000 F / 10 commandes) ne sont pas encore verrouillés, à la différence de la quasi-totalité des autres règles du document qui sont « Décidé ».

---

## Récapitulatif transverse (à reporter dans la synthèse générale du paquet)

- **Total actions de ce batch** : VD-06 = 13, VD-07 = 17, VD-08 = 33 → **63 actions** à cocher.
- **Statuts non « Décidé » relevés** : REM-08, REM-09, RCU-04, ERR-03, ERR-04, OFR-05 (Recommandé) ; PRX-05, PRX-09 (Proposé) — points à valider avant implémentation ferme.
- **Écarts VD vs glossaire client v3 déjà signalés comme ouverts ailleurs dans le paquet** : arbitrage automatique du silence (n° 32), chronologie médiation/tribunal (n° 33), défaut caché après confirmation (n° 21), nombre de motifs (n° 30), remplacement/accord implicite (n° 41), vente flash fermée (n° 64-75), nombre de zones (déjà ouvert), vitrine « Sponsorisé » (n° 72).
- **Lien avec les décisions BelivaY déjà actées (mémoire projet)** : VD-07/RET-08 (colis non retiré, garde 7 jours puis retour sans frais) est structurellement proche du modèle « garde-au-relais puis retour à J+7 », mais **sans le tarif de garde journalier de 200F/jour** ni la formulation « J+3 = délai de règlement depuis l'événement de libération » — aucune des deux formulations exactes de la décision interne n'apparaît dans ce document ; à vérifier si elles sont couvertes ailleurs (VD-09 versements, VD-04) ou restent un point à faire remonter aux auteurs du paquet.
