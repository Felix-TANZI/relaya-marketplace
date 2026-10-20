# Synthèse — Lot 2 : R2 (source), VD-00 (sommaire), VD-01 (fondations)

> Note méthodologique : dans ces documents, les **actions** (préfixe `.A`) sont des tâches à cocher, sans statut propre. Les **règles** portent un statut propre au corpus BelivaY — **Décidé** (fixé par la spécification ou le fondateur), **Recommandé** (arbitrage retenu, VD-12, valeur paramétrable), **Proposé** (valeur par défaut, réglable en console) — défini explicitement dans VD-00. Je recopie ce statut tel quel plutôt que de le forcer dans le schéma V/D/Δ/P demandé ; en équivalence approximative : Décidé≈Verrouillé/Décidé, Recommandé≈Déduit, Proposé≈Proposé.

---

## 1. R2 — REF-VD — Spécification développeur de l'espace vendeur (source)

**Code de suivi** : REF-D02 (actions REF-D02.A01…A64, questions REF-D02.Q01…Q24)
**Pages / parties / actions** : 140 pages / 10 parties / 64 actions
**Document d'origine** : `BelivaY_Vendeur_Specification_developpeur.pdf`, daté du 27 septembre 2026 (contenu réel arrêté au 24 septembre 2026)

### Résumé

R2 est **le document source unique** dont tous les VD-xx (00 à 12) ont été extraits/découpés : il couvre en 140 pages la totalité de l'espace vendeur, du système visuel (V01) jusqu'au registre de traçabilité (V15), en passant par la commission (V02), l'argent (V03-V04), la boutique (V05), l'accueil (V06), les commandes (V07), les litiges (V08), les retours (V09), l'ouverture de boutique (V10), le Trust Score (V11), le catalogue (V12), les plans (V13), les paramètres (V14) et un registre final d'arbitrages (V15). C'est un document **texte pur, sans capture ni figure** (toutes les 10 parties le confirment explicitly) — les visuels sont dans les paquets VD-xx correspondants. Le document porte la trace d'un travail de correction perpétuel : de nombreuses actions consistent à **retirer** des éléments d'une version antérieure du prototype (commission affichée, plans à 5 niveaux, palier « Diamant », boutique publique, bouton de retrait…) plutôt qu'à ajouter des écrans neufs. Il contient aussi **24 questions ouvertes** et une dizaine d'**incohérences chiffrées internes** explicitement signalées (calculs de palier faux, montants de maquette obsolètes, taux de commission contradictoires entre V02 et V12). Le document se positionne comme la source de vérité amont, mais reconnaît lui-même être daté par endroits face aux règles client REF-CL plus récentes (v2.0/v3, 25 septembre).

### Architecture générale de l'espace vendeur

#### Écrans annoncés (à recouper plus tard avec VD-03 à VD-11)

Le document annonce un **prototype de 58 écrans** (chiffre cité p.10, partie 01 — « prototype 58 écrans »), organisés par document V, avec route indicative. Liste complète recensée dans R2 :

| Document V (source) | Écrans / routes cités dans R2 |
|---|---|
| V01 Fondations | Menu (`menu`) ; Hors connexion (`horsligne`) |
| V02 Commission | (pas d'écran propre — logique de calcul affichée dans V03/V07/V12) |
| V03 Mon argent | Mon argent (`argent`) ; Se libère — quand (`se_libere`) ; Gelé — pourquoi (`gele`) ; Mes gains (`gains`) ; Relevé/reçu/facture (`documents`) |
| V04 Versements | Prochain versement / Versements (`versements`) ; Numéro de versement (`numero_versement`) ; Historique et incident (dans `versements`) |
| V05 Ma boutique | Identité (`boutique`) ; Horaires et fermetures (`horaires`) ; Emplacement (`emplacement`) ; Équipe (`equipe`) |
| V06 Accueil | À faire (`accueil`) ; Rien à faire (`accueil_calme`) ; Premier jour (`premier_jour`) |
| V07 Commandes | Commandes reçues (`commandes`) ; Commande à préparer (`commande`) ; Remise au livreur (`commande_prete`) ; Remis au livreur (`commande_remise`) ; Rupture (`rupture`) ; Besoin de plus de temps (`delai`) ; Bon de préparation (`bon`) ; Reçu vendeur (`recu`) |
| V08 Litiges reçus | Les litiges (`litiges`) ; Répondre (`litige`) ; Décision et suites (`litige_envoye`) |
| V09 Retours | En cours (`retours`) ; Inspection à la réception (`inspection`) ; Proposer un remplacement (`remplacement`) |
| V10 Ouvrir ma boutique | Ouvrir, deux minutes (`ouvrir`) ; OTP (`otp`) ; Publier et être payé / KYC (`kyc`) ; Saisie assistée (`saisie_assistee`) |
| V11 Trust Score et palier | Mon palier (`palier`) ; Mon score (`score`) ; Les paliers (`paliers`) ; Sanctions et contrôle au ramassage (`sanctions`) ; Contester (`contester`, à ajouter) |
| V12 Produits / nouvelle offre | Mes produits (`produits`) ; Une offre et sa modération (`offre_detail`) ; Nouvelle offre — produit/photos (`offre1`, `offre2`) ; « Ajouter un produit » (écran court) ; Prix, stock, récapitulatif (`offre3`, `offre4`) ; Prix conseillé (`offre3`/`offre_publiee`) ; Chercher avant de créer / demande de fiche (`fiche`) ; Dupliquer un produit (`dupliquer`, à ajouter) ; Refuser le paiement au comptoir (interrupteur dans le détail de l'offre, à ajouter) |
| V13 Plans, tarifs, croissance | Les plans (`plans_liste`) ; Le simulateur (`plans`) ; Catalogue de visibilité (`visibilite`) ; Services (`services`) ; Mes chiffres et la demande (`chiffres`, `demande`) |
| V14 Paramètres | Profil et Mobile Money (`parametres`) ; Sécurité, appareils, données (`connexion`, `securite`) ; Notifications (`notifications`) ; Avis et droit de réponse (`avis`) ; Messagerie (`messages`) |
| V15 (registre) — pages à ajouter | Contester une sanction/palier (`contester`) ; Compte suspendu (`suspendu`) ; Alerte avant un seuil (pas d'écran dédié, événement) ; Journal d'une commande (`journal`) |

Le document précise que la table de traçabilité (partie 10, p.135-137) relie chacune des **64 tâches** aux **15 documents V** et à un écran, et signale déjà une incohérence de rattachement (écran « Menu » classé sous V14 dans la traçabilité alors que V01 tâche 2 le décrit).

#### Modèle de données (partie 10, §68, p.132)

Entités listées : **Boutique**, **Membre** (rôle propriétaire/préparation, second facteur), **Fiche** (famille de barème, code-barres, gabarit), **Offre** (plancher privé, prix automatique, paiement au comptoir accepté), **Commande vendeur** (code de remise, montant gardé figé au paiement), **Remise** (photos produit et colis), **Litige**, **Retour**, **Mouvement d'argent** (états : en cours, se libère, à verser, gelé, versé, repris), **Versement** (référence agrégateur), **Score**, **Plan et visibilité**, **Notification**, **Message** (texte filtré), **Document**, **Journal** (avant/après).

#### Cycle de vie d'une commande côté vendeur (reconstitué à partir des parties 03-05)

1. **Payée** → entre dans la file de préparation (E3/V22 : payée ∨ (payable au retrait ∧ validée)) ; échéance = début + D (4 h ouvrées, ou délai déclaré, jusqu'à 7 j sur commande) ; échéance absolue ≤ début + 24 h pour un article en stock (E4/E10).
2. **À préparer** → apparaît dans « Commandes reçues » triée par temps restant ; le vendeur peut déclarer une **rupture** (→ réattribution à un vendeur suivant de Trust Score ≥ 75, écart de prix ≤ +5 % ; si aucun vendeur suivant, remboursement intégral le jour même, vendeur non facturé) ou demander **plus de temps** (+1 h, +2 h, demain à l'ouverture — options grisées au-delà de l'échéance absolue).
3. **Prête / remise au livreur** → le livreur contrôle et **fait le colis lui-même** (2 photos horodatées/géolocalisées, emballage BelivaY, scellé, étiquette) ; un **code de remise à 6 chiffres**, aléatoire, usage unique, sans QR, transfère la responsabilité à l'entreprise de livraison (perte/casse alors payée au vendeur par BelivaY) ; un **bon de préparation** et un **reçu vendeur** sont générés.
4. **En cours** → le montant gardé (commission déjà figée au paiement, jamais recalculée) est affiché en « En cours ».
5. **Se libère** → t_fermeture = min(confirmation client ; retrait + 7 jours) ; délai Δ après confirmation/retrait : **3 jours** (paliers Bronze, Argent), **1 jour** (Or, Platine), **14 jours** (paiement carte).
6. **Litige ou retour éventuel** → le gel « prime sur tout compte à rebours » (F5) : gain → libération immédiate, versement le vendredi suivant ; perte → remboursement client + **commission annulée**. Sans réponse du vendeur à 48 h, un arbitrage automatique en faveur du client s'applique (règle G1 — **contestée en interne**, voir contradictions). Retour : inspection à réception sous 48 h, sinon remboursement automatique.
7. **À verser** → nets libérés jusqu'au jeudi 23 h 59, regroupés dans un **versement du vendredi avant 12 h**, sans minimum, vers un Mobile Money vérifié, référence `BLV-VS-nnnn`.
8. **Versé** → état final ; historique consultable, incident signalable (« Signaler un versement non reçu »).
9. Cas particuliers : **vice caché tranché après libération** → ligne « reprise » négative datée, seule ligne négative autorisée, reprise sur les versements suivants (H7) ; **remboursement automatique** sous un seuil (3 000 F service Standard, 10 000 F service Élevé) payé par BelivaY sans toucher le score du vendeur (F8).

### Tableau des actions REF-D02.A01 à A64

| ID | Action (résumé) | Partie |
|---|---|---|
| REF-D02.A01 | Retirer les plans Gratuit/Starter/Pro/Business à 20/18/12/10/5 % et les réductions «−1,−2,−3 %» par palier | 01 |
| REF-D02.A02 | Supprimer toute ligne « Commission −X F » / onglet « Retenu » ; remplacer par « Vous gardez » | 01 |
| REF-D02.A03 | Corriger « Ce que vendre vous coûte » → « Ce que vous gardez » (Mon argent) | 01 |
| REF-D02.A04 | Supprimer toute mention disant que le palier ne change pas la commission | 01 |
| REF-D02.A05 | Remplacer « reversement », « acheteur », « escrow » et libellés sans accents (« anciennete », « dedie ») | 01 |
| REF-D02.A06 | Vérifier barre du bas à 4 onglets identiques partout, aucune flèche retour sur écran racine | 01 |
| REF-D02.A07 | Vérifier que chaque écran affiche exactement les chiffres du scénario de référence | 01 |
| REF-D02.A08 | Mettre à jour maquette Gelé/Mon argent : 700 600 → 688 488 F et 750 400 → 742 008 F | 02 |
| REF-D02.A09 | Retirer « Ce que vendre vous coûte », « Tout ce qui a été retenu » et toute ligne négative de commission | 02 |
| REF-D02.A10 | Retirer les cinq pages financières contradictoires et l'annonce « à verser » de commandes en litige | 02 |
| REF-D02.A11 | Retirer bouton « Retirer », montant à saisir, minimum, frais de retrait 1,5 %, page « Compte BelivaY » | 02 |
| REF-D02.A12 | Vérifier avertissement « changer de numéro bloque les versements 7 jours » + contrôle de préfixe | 02 |
| REF-D02.A13 | Vérifier écran refus de versement (3 motifs, 3 tentatives) | 02 |
| REF-D02.A14 | Retirer page boutique publique, bannière, description publique, lien, QR code, affiche | 03 |
| REF-D02.A15 | Retirer champ WhatsApp public et tout numéro visible des clients | 03 |
| REF-D02.A16 | Retirer quartier du client, relais de destination, mode de livraison de tous les documents vendeur | 03 |
| REF-D02.A17 | Retirer les six tuiles d'accueil, graphique/heatmap vides, objectif 500 K préréglé, « Clients uniques » ; remplacer par une ligne de synthèse | 03 |
| REF-D02.A18 | Retirer la ligne « Commission −2 160 F » de la carte commande | 03 |
| REF-D02.A19 | Vérifier qu'une carte d'accueil n'a qu'un bouton plein | 03 |
| REF-D02.A20 | Vérifier bouton « Enregistrer » en bas des formulaires Ma boutique | 03 |
| REF-D02.A21 | Retirer toute consigne d'emballage donnée au vendeur et code à écrire au marqueur | 04 |
| REF-D02.A22 | Retirer le décompte de commission du reçu vendeur | 04 |
| REF-D02.A23 | Retirer codes d'état internes et tuiles de comptage ; Exporter/Factures dans le menu « ⋮ » | 04 |
| REF-D02.A24 | Mettre à jour montant gelé écran Litiges : 684 000 → 670 648 F | 04 |
| REF-D02.A25 | Aligner l'échéance du litige BLV-00005 : « mer. 23 sept. 06h02 » vs calcul « mar. 22, 05h30 » | 04 |
| REF-D02.A26 | Vérifier que le code de remise ne s'affiche qu'avec nom et photo du livreur | 04 |
| REF-D02.A27 | Retirer page litige sans bouton de réponse, captures WhatsApp comme preuves, litiges bloqués étape 1 | 05 |
| REF-D02.A28 | Retirer page Retours vide, retour sans motif, remboursement à la demande avant inspection | 05 |
| REF-D02.A29 | Corriger exemple palier Argent : « 18 164 F au lieu de 17 840, soit 600 F de plus » (écart réel 324 F) | 05 |
| REF-D02.A30 | Corriger exemple iPhone : « 3 360 F de plus (15 680 F au lieu de 14 676 F) » — incohérent | 05 |
| REF-D02.A31 | Vérifier que la saisie assistée affiche les 4 contrôles et exige validation vendeur | 05 |
| REF-D02.A32 | Vérifier que l'inscription ne demande ni RCCM à un particulier ni caution | 05 |
| REF-D02.A33 | Supprimer partout le palier « Diamant » et le barème en points | 06 |
| REF-D02.A34 | Corriger libellés sans accents (« anciennete », « etoiles ») | 06 |
| REF-D02.A35 | Retirer toute présentation du palier comme sans effet sur la commission | 06 |
| REF-D02.A36 | Vérifier que la demande de fiche n'apparaît qu'après recherche + « Aucun de ces produits » | 06 |
| REF-D02.A37 | Vérifier champ prix avec exemple grisé et « vous gardez » en direct | 06 |
| REF-D02.A38 | Aligner net du chargeur à 5 000 F : « 4 150 F » (V12) vs « 4 300 F » (V02, commission 700 F) | 06 |
| REF-D02.A39 | Aligner part gardée iPhone 350 000 F : 95,8 % (V12) vs 94,6 % (V02 §9) | 06 |
| REF-D02.A40 | Purger le catalogue de démonstration de la base de production | 07 |
| REF-D02.A41 | Retirer création de fiche par le vendeur ; exemples grisés ; astérisque état ; supprimer tri alphabétique | 07 |
| REF-D02.A42 | Publier la liste des produits interdits dans l'aide avant lancement | 07 |
| REF-D02.A43 | Vérifier que le simulateur affiche « Free garde le plus » à 60 000 F | 07 |
| REF-D02.A44 | Vérifier que « Sponsorisé » n'apparaît jamais en recherche, ≤ 1 pour 6 cartes | 07 |
| REF-D02.A45 | Retirer plans Starter/Business, « Boost Buy Box », « Analytiques IA », « Boost & Pub » barrés, heatmap vide, « 2 mois offerts » sans prix annuel | 08 |
| REF-D02.A46 | Retirer 3 numéros confondus (garder 2 nommés), 141 lignes de connexion, cloche sans page, « Note boutique — », cartes de litige sans conversation, captures WhatsApp comme preuve | 08 |
| REF-D02.A47 | Côté client : « Retour 7 j sans discuter » → « retour gratuit si le problème est validé » | 08 |
| REF-D02.A48 | Côté client : supprimer « Autres vendeurs », afficher « Vendeur certifié [palier] · Trust Score » | 08 |
| REF-D02.A49 | Finaliser et publier la liste des produits interdits avant lancement | 08 |
| REF-D02.A50 | Stopper toute implémentation des tâches V1-V10 v1.1 (taux par plan, retrait à la demande) | 08 |
| REF-D02.A51 | Changer la couleur de l'état « Se libère » de bleu en orange | 09 |
| REF-D02.A52 | Remplacer « Vous gardez 3 points de plus » par le multiplicateur de palier (0,85/0,70/0,60) en francs | 09 |
| REF-D02.A53 | Ajouter la page « Dupliquer un produit » | 09 |
| REF-D02.A54 | Ajouter l'interrupteur « Accepter le paiement au comptoir » dans le détail de l'offre | 09 |
| REF-D02.A55 | Corriger « Besoin de plus de temps » (+1 h, +2 h, demain à l'ouverture) | 09 |
| REF-D02.A56 | Ajouter les pages « Contester », « Compte suspendu », « Alerte avant un seuil », « Journal d'une commande » | 09 |
| REF-D02.A57 | Mettre à jour règles client recopiées avec REF-CL v3 (mosaïque→grille régulière, « zone du vendeur »→« livrabilité », etc.) | 09 |
| REF-D02.A58 | Faire trancher la formation vendeur | 09 |
| REF-D02.A59 | Aligner CDE-21/NOT-01 sur REF-CL : pas d'API WhatsApp au lancement, push puis e-mail, SMS client | 10 |
| REF-D02.A60 | Aligner PBL-04 : photo obligatoire sauf « Jamais reçu » | 10 |
| REF-D02.A61 | Aligner CPT-03 : « 2 mois offerts » avec prix annuel en francs | 10 |
| REF-D02.A62 | Vérifier statuts « Recommandé » (CDE-08, CDE-13, CDE-17) à jour vs REF-CL (Proposé/Fixé) | 10 |
| REF-D02.A63 | Rattacher l'écran « Menu » à V01 (tâche 2) dans la table des écrans | 10 |
| REF-D02.A64 | Vérifier que chaque route existe dans le prototype (58 écrans) et que les pages à ajouter y sont créées | 10 |

### Règles métier et calculs clés (chiffres exacts), par partie

**Partie 01 — Fondations, Commission (V02)**
- Jetons : 11 tailles de texte, 3 interlignes (1,14 pour titres), 4 rayons, grille 2 px ; boutons 48 px / 40 px ; dégradé `#CC4A0B → #AE3B06` ; orange texte `#B8470A`, contour `#9C9088` ; police Plus Jakarta Sans.
- Navigation : **4 onglets** (Accueil, Commandes, Produits, Argent) ; écrans racines sans flèche retour ; Litiges et Retours **ne sont plus des onglets**.
- Hors connexion : file d'actions ≤ **72 h** (règle J5).
- Contrôles CI : contraste ≥ **4,5:1**, taille ≥ **11 px**, cible ≥ **40 px**.
- Commission V02 : part de la marge de référence par tranche de prix, **sans plafond** ; **plancher 700 F par commande**, **taux effectif minimum 2 %**, marge minimale BelivaY **200 F ou 0,5 % du panier** ; commission figée au paiement, jamais prélevée avant libération.
- Grille V02 (Bronze), par famille × tranche, taux d'entrée → taux effectif après multiplicateur 1/3 (ou 1/2 selon famille) : **A** Électronique/Électroménager 40/15/8/6 % → 13,5/5/2,5/2 % ; **B** Mode/Beauté 70/55/40 % → 23,5/18,5/13,5 % ; **C** Supermarché/Frais 15/12/10 % → 7,5/6/5 % ; **D** Maison/Sport/Bébé/Animaux 45/35/25 % → 15/11,5/8,5 % ; **E** Livres 25/18 % → 12,5/9 %. Tranches : 0-20 000 / 20 000-100 000 / 100 000-500 000 / au-delà (C et E : 0-10 000 / 10 000-50 000 / au-delà).
- Exemples famille A Bronze : 5 000 F → commission 700 F (garde 4 300) ; 20 000 → 2 667 ; 50 000 → 4 167 ; 150 000 → 7 950 ; 350 000 → 13 769 ; 1 000 000 → 39 631.
- Vérifications scénario : ITEL AC52 20 000 F → commission 2 160 F, garde 17 840 F ; iPhone 15 Pro Max 350 000 F → 14 676 F, garde 335 324 F ; pagne Vlisco 84 000 F → 16 400 F (19,5 %) ; panier supermarché 30 000 F → 2 011 F.
- Scénario de référence (21 sept. 2026, 09h48) : boutique Tonton PG, Franck Penga, particulier sans RCCM ; Bronze, **Trust Score 63 (62,7 exact)**, offre de découverte **−3 points jusqu'au 27 nov. ou 50 commandes** (compteur à 9) ; argent : à verser **17 840**, se libère **17 840**, en cours **17 840**, gelé **688 488**, en circulation **742 008 F**.

**Partie 02 — Mon argent, Versements**
- Libération : t_fermeture = min(confirmation client ; retrait + **7 j**) ; Δ après = **3 j** (Bronze, Argent), **1 j** (Or, Platine), **14 j** (carte).
- F5 : gel prime sur tout compte à rebours ; motif écrit sous **48 h** en cas de vérification anti-fraude.
- F8 : remboursement automatique sous seuil **3 000 F** (service Standard) / **10 000 F** (service Élevé), payé par BelivaY, Trust Score intact.
- H7/V40 : vice caché tranché après libération → ligne « reprise », panne signalée **≤ 48 h** après retrait.
- F10 : facture mensuelle des commissions émise le **1er du mois suivant**.
- F4 : versement = nets libérés jusqu'au **jeudi 23 h 59**, versé le **vendredi avant 12 h**, sans minimum ; **frais Mobile Money 0 F** (à charge de BelivaY, règle D7) ; référence `BLV-VS-nnnn`.
- F6 : changement de numéro = OTP + second facteur + titulaire identique → versements suspendus **7 j** + revue humaine.
- F7 : refus de versement → **3 tentatives à 24/48/72 h** puis suspension + support.
- PAN-17 : exemple 11 900 F + 2 % = **12 138 F** (≈18,50 €).
- Gelé recalculé = 335 324 + 335 324 + 17 840 = **688 488 F** ; en circulation = **742 008 F** (la maquette affichait encore 700 600 et 750 400 F).
- Préfixes Mobile Money : MTN **67X, 68X, 650-654** ; Orange **69X, 655-659**.

**Partie 03 — Ma boutique, Accueil, début Commandes**
- A1/A2/A3 : anonymat total dans les deux sens (aucun nom, numéro, adresse, quartier, mode de livraison, autre vendeur visible) ; messagerie interne anonyme, fermée à l'expiration du délai de litige.
- I3 : fermeture programmée annoncée **≥ 48 h** avant (proposition).
- Équipe : jusqu'à **3 accès employés** sur tous les plans (proposition) ; prix/argent/numéro réservés au propriétaire.
- A4 : attribution = argmin(prix + livraison réelle depuis la boutique), Trust Score en départage.
- B5 : palier de lancement (2 mois après signature) : **Platine ≥ 80 produits actifs**, **Or ≥ 40**, **Argent ≥ 15**, sinon Bronze.
- Accueil scénario : « 2 à préparer · 2 litiges · 1 retour » ; stock bas « ITEL AC52, 3 restants, seuil réglé à 5 ».

**Partie 04 — Commandes (calculs), Litiges reçus**
- E10 : échéance = début + D (**4 h ouvrées** ou délai déclaré, jusqu'à **7 j** sur commande) ; E4 : échéance absolue **≤ 24 h** pour article en stock.
- E6 : code de remise **6 chiffres**, aléatoire, usage unique ; **3 codes distincts** (remise, dépôt, retrait) ; **3 essais faux → blocage 24 h**.
- E8 : plafonds de valeur : **≤ 75 000 F** Nouveau ou mieux ; **≤ 250 000 F** Confirmé ou Or ; **> 250 000 F** Or seulement, sans plafond, assurée.
- Rupture : aucun vendeur suivant → remboursement intégral le jour même.
- Plus de temps : **+1 h, +2 h, demain à l'ouverture**.
- G1 : sans réponse à 48 h → arbitrage automatique en faveur du client (**voir contradiction ci-dessous**). G2 : arrangement **≥ 40 caractères**. H6 : remplacement **≤ 72 h ouvrées**. G3 : médiation **≤ 48 h** → médiateur senior **≤ 3 j** → tribunal. G6 : client silencieux **5 j** → clos en faveur du vendeur.
- Litige BLV-00005 (iPhone) : montant gelé « **670 648 FCFA** sur deux commandes » (maquette affichait 684 000).

**Partie 05 — Retours, Ouverture de boutique, début Trust Score**
- PBL-10 : fenêtre de retour **7 j**, fermée par « Tout est en ordre ». PBL-11 : défaut caché signalable **≤ 48 h**, vice caché **100 j**. PBL-13 : inspection **48 h** sinon remboursement automatique. PBL-14 : trajet retour **500 F** payé par la partie en tort.
- V10/B2 : vérification automatique **≤ 15 min**, revue humaine **≤ 48 h ouvrées** ; **≤ 2 comptes par appareil**. B4 : caution = **0**, dépôt = **0**. C10 : plafond de démarrage **500 000 F par commande** jusqu'à **10 livrées sans incident** (proposition).
- Contrat : vous gardez **79 à 95 %** selon catégorie et palier ; résiliation **30 j** de préavis.
- V11/C1 : score = **6 critères, pondérations 25/20/20/15/10/10** ; **C2 demi-vie 90 j** ; poids des échecs g1/g2/g3 = **1/2/4** ; sous-score lissé **µ = 50, k = 10** ; C7 Ancienneté = **50 × min(1 ; mois/12) + 50 × min(1 ; livrées/100)** (proposition) ; C5 baisse **≤ 8 points par recalcul**, veto → **score ≤ 39** ; inactivité **30 j** → gel, revue à **90 j**.
- Score scénario détaillé : Ponctualité 70→17,4 ; Qualité 64→12,7 ; Satisfaction 54→10,9 ; Litiges 64→9,5 ; Documents 100→10,0 ; Ancienneté 22→2,2 ; **total 62,7, affiché 63**.
- Palier Argent scénario : seuil **65** (actuel 63), **10 commandes livrées** (actuel 7), **note ≥ 4,0** (actuel 4,0), tenu **14 j**.

**Partie 06 — Trust Score (paliers, sanctions), Produits**
- Paliers : **Bronze** (KYC validé, J+3, support 24 h ouvrées) ; **Argent** (Trust ≥ 65, 10 livrées, note ≥ 4,0, +3 points gardés, J+3, support 4 h) ; **Or** (Trust ≥ 80, 50 commandes, note ≥ 4,3, visite physique, +3 points, J+1, support 2 h) ; **Platine** (Trust ≥ 90 tenu 6 mois, audit trimestriel, +2 points, J+1, responsable de compte). Palier « Diamant » **n'existe pas**.
- C4 : montée = seuil franchi tenu **14 j** ; descente = score < seuil−5 pendant **14 j** → validation humaine motivée.
- Sanctions : **1** avertissement, **2** visibilité réduite, **3** suspension (score gelé sous **40**), **4** exclusion (liste noire appareil + CNI + MoMo).
- C8 : contrôle au ramassage **100 % des 5 premières**, puis **1/20 si Trust < 70**, sinon **1/100** ; retour à 100 % si le score chute.
- V12 : modération de l'offre **≤ 48 h** ; photos **3 à 8**, **≥ 800×800 px** ; remise affichée **> 50 %** → vérification ; **prix minimum publiable 500 F** ; poids/dimensions obligatoires **> 5 kg ou 50 cm**, classe = max(poids ; volume ÷ 5 000).
- Demande de fiche : similarité **≥ 0,85** → rattachement automatique ; fiche rédigée par BelivaY **≤ 48 h** (**24 h** si fiche prioritaire payante).
- Parts gardées (exemples) : 20 000 F → **89,2 %** ; 150 000 F → **94,7 %** ; 350 000 F → **95,8 %** ; chargeur 4 900 F → commission **20 %** = 980 F, net **3 920 F** (« au lieu de 4 150 F à 5 000 F »).

**Partie 07 — Créer une offre, Prix conseillé, Plans**
- Objectif de saisie : **≤ 60 s** sur fiche existante, **≤ 2 min** nouvelle demande.
- Prix conseillé : `prix_gagnant(z) = meilleur prix livré concurrent − livraison − 100 F`, arrondi à la centaine inférieure ; `prix conseillé = min(prix saisi ; max(médiane des prix gagnants ; 10e centile ; 500 F ; plancher privé))` ; « Garder » → aucun rappel avant **7 j** ; relance ≤ **1/semaine** ; prix automatique : baisse seulement, **≤ −3 %/semaine** ; hausse **> 10 % en 7 j** → perte du badge et des ventes flash.
- Interdits : < **3 photos réelles** ; prix barré jamais pratiqué.
- K3 : **≤ 1 emplacement sponsorisé pour 6 cartes**, **10-20 % pour nouveaux vendeurs**.
- D8 : `bonus(plan) = MIN(commission Free × (1 − multiplicateur) ; prix du plan)`.
- Plans : **Free 0 F** ; **Boost 2 500 F** (+5 % de la commission, 2 mises en avant 24 h valeur 1 000 F) ; **Pro 7 500 F** (+10 %, 4 mises en avant + 1 boost catégorie 4 000 F + 1 campagne favoris) ; Sur-mesure dès **1 000 000 F/mois** ; essai **1 mois** ; annuel = **10 mois** ; **7 j de grâce** puis Free ; Boost rapporte **2 176 F de plus que Free à 60 000 F** ; Boost remboursé dès **≈ 463 000 F/mois**, Pro dès **≈ 694 000 F**.
- Simulateur (Bronze, découverte) : 60 000 F → Free **53 520** / Boost **51 344** / Pro **46 668** ; 500 000 F → 446 000 / 446 000 / 443 900 ; 700 000 F → 624 400 partout.
- Visibilité : mise en avant 24 h **500 F** ; boost catégorie 7 j **2 000 F** ; vitrine de quartier 7 j **1 500 F** (proposé) ; campagne favoris **25 F par client notifié** (proposé, ≤ **3/semaine/client**).
- Services : photos par agent **3 000 F les 10 produits** ; fiche prioritaire **1 000 F (24 h)** ; saisie assistée gratuite pour les premières boutiques puis **5 000 F la session**.
- Mes chiffres (30 j scénario) : 9 commandes, **820 000 F** ; panier moyen **102 500 F** ; **14 % de retour** ; **340 vues** ; conversion **2,4 %**.

**Partie 08 — Garde-fous, Paramètres, Registre V15**
- V13 garde-fous : remise d'abonnement **jamais supérieure à son prix** ; aucune visibilité en rupture ou sous **Trust 50**.
- V14 : mot de passe **≥ 8 caractères dont un chiffre** ; preuves conservées **180 j** ; clôture après solde, **30 j de préavis**.
- L3 : SMS seulement pour commande à préparer et litige ; jamais de promotion par SMS.
- Avis : Satisfaction = **20 % du Trust Score** ; **3 ★ neutre** ; réponse privée au support **≤ 30 j**.
- V15 tranché (résumé chiffré) : planchers **700 F / 2 % / 200 F ou 0,5 %** ; abonnements **Free / Boost 2 500 F (−1 pt) / Pro 7 500 F (−2 pts)** ; libération **3 j** (14 j carte ; Or/Platine 1 j) ; plafonds **75 000 / 250 000 F** / Or assurée ; Trust Score **25/20/20/15/10/10**, paliers **65/80/90**.
- V15 proposé : limites de générosité **≤ 25 % puis 15 % de la contribution brute** (M05) ; heure limite **jeudi minuit** ; écart rupture **≤ 5 %** ; trajet retour **500 F** ; délais support **24 h / 4 h / 2 h / responsable** ; fermeture annoncée **48 h** ; préavis **N3 = 30 j non rétroactif** ; plafond de démarrage **500 000 F** ; échec de prélèvement **7 j**.

**Partie 09 — Points ouverts, décisions arrêtées, pages à ajouter, règles client**
- Décisions datées : MoMo principal jamais d'espèces (v2.0) ; libération **3 j / 1 j / 14 j carte** (21 sept.) ; versement vendredi pour tous (21 sept.) ; carte 3D Secure **150 000 F**, provision **1,5 %**, **2 % payeur** (22 sept.) ; **10 % de marge de sécurité** pour BelivaY (19 et 22 sept.).
- Pages à ajouter avec endpoint (voir section API) : Dupliquer un produit, Refuser le paiement au comptoir, Contester une sanction/palier, Compte suspendu, Alerte avant un seuil, Journal d'une commande.
- Correction palier : « 3 points de plus » → **multiplicateur Argent 0,85, Or 0,70, Platine 0,60**, exprimé en francs gardés.

**Partie 10 — Règles du client (fin), référence technique, traçabilité**
- CDE-15 : franchise **+2 j** Plus, **+4 j** Prime/Duo/Business. CDE-17 : transfert **400 F**. CDE-18/19 : annulation par boutique **84 380 F** (exemple/plafond cité). CPT-04 : prix des abonnements client **2 500/4 000/7 000/15 000 F**. CPT-05 : Pass 7 j **1 500 F**. CPT-10/11 : cagnotte **2 %, 90 j**. CPT-12 : parrainage **1 mois, 3/mois**.
- Traçabilité : **15 documents V, 64 tâches**, prototype **58 écrans**.

### Endpoints API et événements émis

Endpoints listés « pages à ajouter » (partie 09) :
- `POST /offers/{id}/duplicate` — Dupliquer un produit (stock 0, prix vide, repasse par la recherche)
- `PUT /offers/{id}` — champ `cod_allowed` (paiement au comptoir, vrai par défaut)
- `POST /score/appeal` — Contester une sanction/un palier (réponse humaine 72 h ouvrées, une fois)
- `GET /account/status` — Compte suspendu
- Événement `score.threshold_near` — alerte avant un seuil (1 fois par seuil et par semaine)
- `GET /orders/{id}/journal` — Journal d'une commande

Liste complète des appels serveur recensés (partie 10, §133-134) :
`/money/summary`, `/money/earnings`, `/documents`, `/payouts`, `/payouts/{id}/incident`, `/payout-number`, `/shop`, `/shop/hours`, `/shop/closed-today`, `/shop/location`, `/shop/members`, `/seller/today`, `/seller/onboarding`, `/orders?state=`, `/orders/{id}`, `/ready`, `/stockout`, `/extend`, `/slip`, `/receipt`, `/disputes`, `/disputes/{id}/answer`, `/returns`, `/inspection`, `/replacement`, `/shops`, `/auth/otp`, `/auth/verify`, `/shops/{id}/kyc`, `/contract/sign`, `/assisted-entry`, `/score`, `/tiers`, `/score/appeal`, `/offers`, `/catalog/search`, `/offers/{id}/price-advice`, `/sheet-requests`, `/plans`, `/plans/simulate`, `/plans/subscribe`, `/visibility`, `/services`, `/stats`, `/demand`, `/me`, `/auth/login`, `/auth/2fa`, `/devices`, `/notifications`, `/reviews`, `/reviews/{id}/private-reply`, `/threads`.

Référence de versement format `BLV-VS-nnnn` ; référence de commande format `BLV-000nn`.

### Questions ouvertes à trancher (REF-D02.Q01 à Q24)

- **Q01** (p.01) : plancher (700 F) supérieur au prix d'un article à 600 F → net −100 F, mord sous ≈ 3 043 F : prix minimum par sous-commande ou commission plafonnée en % ? — à trancher.
- **Q02** : arrondi au franc le plus proche (proposé).
- **Q03** : le plancher de 700 F s'applique-t-il après réduction au prorata sur un remboursement partiel ?
- **Q04** : plafond de remise d'abonnement — compter les commandes payées du mois et restituer si remboursée.
- **Q05** : les commandes non encaissées/annulées/remboursées comptent-elles dans les 50 de l'offre de découverte ?
- **Q06** : grille « proposée » à remplacer par l'annexe 1 dès qu'elle est fournie.
- **Q07** (partie 02) : aucune nouvelle question ; chiffres de maquette à aligner.
- **Q08** (partie 03) : délai d'annonce de fermeture (48 h) et nombre d'accès employés (3) seulement proposés.
- **Q09** (partie 04) : « arbitrage client appliqué automatiquement à 48 h » (G1) contredit REF-CL v2.0 (« décision humaine motivée, pas d'automatisme ») — à trancher, le plus récent l'emporte.
- **Q10** : effets G1 (rupture, délai) seulement proposés.
- **Q11** (partie 05) : PBL-14 « trajet retour 500 F » vs REF-CL ch. 12 (course normale sans montant fixé) — confirmer le tarif.
- **Q12** : exemples de gains au palier Argent incohérents — recalculer avec le barème M01.
- **Q13** : ancienneté (C7) et plafond de démarrage (C10) seulement proposés.
- **Q14** (partie 06) : « le vendeur ne crée jamais une fiche lui-même » vs écran court « description écrite par le vendeur » et REF-CL 17.2 — préciser qui rédige la fiche maître.
- **Q15** : effets g1/g2 v1.2 et libellés d'états produit seulement proposés.
- **Q16** (partie 07) : bande « Sponsorisé » payante par les vendeurs (V13) vs REF-CL ch. 4.3 (« contenu BelivaY uniquement, jamais de publicité tierce ») — à préciser.
- **Q17** : vitrine de quartier, boost, campagne favoris, vente flash, photos/fiche prioritaire : prix seulement proposés.
- **Q18** (partie 08) : bonus des plans V13 (« 5 %/10 % de la commission ») vs V15 (« Boost −1 pt, Pro −2 pts ») — unifier.
- **Q19** : V15 « silence = arbitrage en faveur du client » — même divergence que Q09 avec REF-CL.
- **Q20** : liste des produits interdits non finalisée.
- **Q21** (partie 09) : CCA-04 « colis L doublé » (garde) n'apparaît pas dans REF-CL — confirmer si la garde d'un colis L est doublée.
- **Q22** : CDS-05/DEC-07 (quinconce, hauteurs variables) contredisent l'arbitrage du 17 sept. (grille régulière) repris dans REF-CL v3.
- **Q23** : points ouverts du modèle de règles (plancher, arrondi, prorata, compteur 50, gravité ≤ 2★) — propositions à valider.
- **Q24** (partie 10) : plusieurs règles client recopiées au 24 sept. divergent de REF-CL v3 du 25 sept. — appliquer la plus récente.

### Contradictions / incohérences internes signalées

1. **Commission chargeur 5 000 F** : « 4 150 F » (V12) vs « 4 300 F » avec commission 700 F (V02) — REF-D02.A38.
2. **Part gardée iPhone 350 000 F** : 95,8 % (V12) vs 94,6 % (V02 §9) — REF-D02.A39.
3. **Palier Argent, exemple ITEL** : annonce « 18 164 F au lieu de 17 840 F, soit 600 F de plus » alors que l'écart réel est de 324 F — REF-D02.A29.
4. **Palier Argent, exemple iPhone** : annonce « 3 360 F de plus » via « 15 680 F de commission au lieu de 14 676 F » — logiquement impossible (une commission plus élevée ne peut pas faire garder plus) — REF-D02.A30.
5. **Échéance litige BLV-00005** : texte affiché « mer. 23 sept. à 06h02 » vs calcul à partir de l'ouverture (dim. 20, 05h30 +48h) = « mar. 22 à 05h30 » — REF-D02.A25.
6. **Montants de maquette obsolètes** : Gelé 700 600 F / En circulation 750 400 F affichés au lieu de 688 488 F / 742 008 F recalculés (barème M01) — REF-D02.A08 ; Litiges 684 000 F affiché au lieu de 670 648 F — REF-D02.A24.
7. **G1 arbitrage automatique à 48 h** contredit REF-CL v2.0 (décision humaine motivée) — Q09/Q19.
8. **Bande Sponsorisée payante** (V13) vs interdiction de publicité tierce de REF-CL ch. 4.3 — Q16.
9. **Bonus des plans** exprimé en % de commission (V13) vs en points de Trust Score (V15) — Q18.
10. **Qui rédige la fiche produit** : BelivaY sous 48 h (règle générale) vs écran court affichant une description écrite par le vendeur vs REF-CL 17.2 (vendeur saisit lui-même) — Q14.
11. **Mise en page catalogue** : « mosaïque en quinconce, hauteurs variables » (DEC-07/CDS-05, règles client recopiées) contredit l'arbitrage du 17 sept. figé en « grille régulière » dans REF-CL v3 — Q22.
12. Le document affirme lui-même être potentiellement daté : plusieurs règles client recopiées au 24 sept. divergent de REF-CL v3 (25 sept.) — Q24. Cela signifie que **R2 contient des règles obsolètes par construction**, à valider systématiquement contre REF-CL avant implémentation.

---

## 2. VD-00 — Lisez-moi, sommaire et index

**Code de suivi** : VD-D01 (actions VD-D01.A01…A04, questions VD-D01.Q01…Q03)
**Pages / parties / actions** : 9 pages / 1 partie / 4 actions
**Document d'origine** : `VD-00_Lisez-moi_Sommaire_Index.pdf`, v1.0 du 24 septembre 2026

### Résumé

VD-00 est le document méta du paquet « Espace vendeur » : il liste le contenu du dossier (structure de fichiers : `01_Documents/`, `02_Prototype_HTML/`, `03_Captures/`, `04_Pages_HTML/`), l'ordre de lecture recommandé (VD-01/VD-02 d'abord, puis VD-03 à VD-11 dans l'ordre du parcours vendeur, puis VD-12 pour les arbitrages), et un **index des 99 captures** avec leur route. Il annonce un prototype de **66 écrans, 99 états**, en clair/sombre, français/anglais (pidgin prévu mais affiché en français), inspiré du style de l'espace point relais (Plus Jakarta Sans, verre dépoli, dock 4 onglets). Le point de départ du travail a été la lecture de **73 captures réelles** du portail vendeur actuel (`IMG_2238` à `IMG_2310`), entièrement redessinées — aucune image de l'existant n'a été réutilisée. Le document revendique qu'« aucune règle n'est laissée à confirmer », un seul point de calcul restant à valider (les trois valeurs de référence du moteur de commission, à rapprocher du barème publié) — affirmation que le document lui-même nuance ensuite en listant des divergences avec CL-16.

### Tableau des actions VD-D01.A01 à A04

| ID | Action (résumé) | Partie |
|---|---|---|
| VD-D01.A01 | Rapprocher du barème publié les trois valeurs de référence du moteur de commission — back-end | 01 |
| VD-D01.A02 | Mettre chaque écran à niveau selon la méthode (page HTML, tableau Retirer·Changer·Ajouter·Garder, route API VD-02, jeu d'essai Tonton PG, cocher VD-12) | 01 |
| VD-D01.A03 | Aligner le paquet vendeur (v1.0, 24 sept.) sur la v3 client (25 sept.) et le tableau inter-espaces CL-16 | 01 |
| VD-D01.A04 | Traduire les textes en pidgin avant d'activer la langue (le prototype affiche le français) | 01 |

### Règles métier et calculs clés (chiffres exacts)

- Statuts des règles (définition officielle) : **Décidé** (fixé par la spécification ou le fondateur, à implémenter tel quel) ; **Recommandé** (arbitrage retenu, VD-12, valeur paramétrable) ; **Proposé** (valeur par défaut, réglable en console d'administration).
- « Aucune règle n'est laissée à confirmer » ; un seul point de calcul remis au back-end (VD-02) : les trois valeurs de référence du moteur de commission.
- **139 règles du client** reprises dans VD-12, dont **48** citées explicitement dans les écrans vendeur ; **registre VD-12 : 345 règles vendeur** au total.
- Prototype : **66 écrans, 99 états**, clair et sombre (« Graphite pro »), français et anglais ; **99 captures × 3 variantes** ; **99 pages HTML**.
- Pagination des 13 documents (avec pages) : VD-00 (9), VD-01 Fondations/navigation/design (11), VD-02 Données/cycle/argent/API (13), VD-03 Accès et ouverture (23), VD-04 Accueil (24), VD-05 Commandes (24), VD-06 Remise/reçu/erreurs (18), VD-07 Litiges et retours (25), VD-08 Produits/nouvelle offre (35), VD-09 Argent/versements (32), VD-10 Trust Score/palier/croissance (37), VD-11 Boutique/compte/communication (39), VD-12 Registre/arbitrages/tests/lexique (38) ; **PDF complet 328 pages**.
- Point de départ : **73 captures réelles** du portail actuel (`IMG_2238` à `IMG_2310`), marquées « Actuel ».
- Style : palette vendeur = orange du logo, braise, nuit espresso, or, sable ; états vert/ambre/rouge ; **violet réservé au plan Pro** ; **aucun bleu**.

### Endpoints API et événements

Aucun endpoint propre listé dans VD-00 (document méta). Renvoi explicite à VD-02 pour « données, cycle de la commande, argent, calculs, droits et API » et pour la formule de commission à valider.

### Questions ouvertes à trancher (recopiées)

- **VD-D01.Q01** : « Aucune règle n'est laissée à confirmer » (affirmation de VD-00) alors que CL-16 liste des écarts vendeur à corriger (PAN-10, AVI-02, VIS-01 à VIS-06, CNO-02, CDE-21, DEC-15, CDS-05, DEC-07…).
- **VD-D01.Q02** : le Menu du prototype vendeur mène à tous les écrans — à distinguer de la décision client du 26 septembre (menu réel sans liste d'écrans) : confirmer si la même règle s'applique au vendeur.
- **VD-D01.Q03** : trois valeurs de référence de commission à rapprocher du barème publié.

### Contradictions / incohérences internes

- L'affirmation-titre « aucune règle n'est laissée à confirmer » est **directement contredite** par la propre section « Questions ouvertes » du même document, qui liste des écarts non résolus (Q01) — le document se contredit lui-même en une page.
- Divergence d'organisation entre espaces : l'en-tête vendeur affiche encore FR/EN + lune alors que, côté client, ces éléments ont été déplacés dans le Menu (décision du 26 sept.) ; VD-00 ne tranche pas si le vendeur doit suivre la même règle (renvoyé à VD-01, Q03 de VD-01).

---

## 3. VD-01 — Fondations, navigation et design

**Code de suivi** : VD-D02 (actions VD-D02.A01…A11, questions VD-D02.Q01…Q03)
**Pages / parties / actions** : 11 pages / 1 partie / 11 actions
**Document d'origine** : `VD-01_Fondations_Navigation_Design.pdf`, v1.0 du 24 septembre 2026

### Résumé

VD-01 fixe les fondations non négociables de l'espace vendeur : 12 principes généraux (GEN-01 à GEN-12, tous **Décidé**), une charte de simplicité en 11 points (SPL-01 à SPL-11, statut **Recommandé**), la carte de navigation (66 écrans, 99 états, dock à 4 onglets, règles NAV-01 à NAV-09), et le design system complet (jetons couleur/typo clair et thème sombre « Graphite pro », règles DS-01 à DS-14). Le document acte des ruptures fortes avec le portail actuel (`seller.belivay.com`) : suppression du tiroir de 20 entrées au profit d'un dock à 4 onglets + page Menu en 6 groupes, suppression de toute ligne de commission affichée au profit de « Vous gardez », suppression du flux de retrait manuel au profit d'un versement automatique du vendredi, suppression de la vitrine publique (storefront, QR, WhatsApp public). Le document impose aussi des contrôles d'accessibilité et de vocabulaire stricts, vérifiables en intégration continue (liste de mots interdits, interdiction du bleu hors documents contractuels).

### Tableau des actions VD-D02.A01 à A11

| ID | Action (résumé) | Partie |
|---|---|---|
| VD-D02.A01 | Monter un composant Dock unique (Accueil, Commandes, Produits, Argent) sur toutes les pages racines | 01 |
| VD-D02.A02 | Remplacer le tiroir de 20 entrées par la page Menu en six groupes (route `menu`, compteurs réels) | 01 |
| VD-D02.A03 | Créer les composants Header (racine) et SubHeader (enfant) | 01 |
| VD-D02.A04 | Retirer toute ligne de commission des écrans ; brancher le service unique V02 ; afficher « Vous gardez » | 01 |
| VD-D02.A05 | Supprimer le flux de retrait (bouton « Retirer », frais 1,5 %, minimum 1 000 F) ; versement automatique le vendredi | 01 |
| VD-D02.A06 | Supprimer le storefront (page boutique publique, QR, WhatsApp public) | 01 |
| VD-D02.A07 | Remplacer les statuts techniques par une table unique de libellés (FR, EN, pidgin) | 01 |
| VD-D02.A08 | Retirer violet et bleu hors du plan Pro ; jetons CSS ; contrôle automatique « aucun bleu » | 01 |
| VD-D02.A09 | Redéfinir les variables sous `[data-theme=dark]` (Graphite pro) | 01 |
| VD-D02.A10 | Ajouter le hors connexion : service worker, IndexedDB chiffrée, file d'actions signées (VD-02) | 01 |
| VD-D02.A11 | Mettre en CI les contrôles (contraste, taille, cibles, valeurs codées en dur, mots interdits, aucun bleu) | 01 |

### Règles métier et calculs clés (chiffres exacts)

**Principes non négociables (GEN, tous Décidé)**
- GEN-01 : anonymat dans les deux sens, filtrage côté serveur.
- GEN-02 : le vendeur voit ce qu'il garde, jamais ce que BelivaY prend (décision du 22 septembre).
- GEN-03 : montant jamais calculé dans l'application ; un seul service fige la commission au paiement (V02).
- GEN-04 : **zéro espèce, zéro demande de retrait** ; versement **chaque vendredi avant 12 h, sans frais ni minimum**, vers un MoMo vérifié au nom du titulaire ; arrêté **jeudi minuit**.
- GEN-05 : **aucune caution, aucun dépôt, aucun frais d'entrée**.
- GEN-06 : le vendeur ne fait pas le colis ; le livreur contrôle, **2 photos**, emballe, scelle, étiquette ; **code à 6 chiffres** transfère la responsabilité.
- GEN-07 : accueil = ce qu'il y a à faire, **un bouton plein par carte**, chiffres seulement si rien à faire.
- GEN-08 : canaux officiels = messagerie rattachée à la commande, filtrée ; WhatsApp du support pour l'aide seulement.
- GEN-09 : chaque action horodatée et signée.
- GEN-10 : **trois langues** français/English/pidgin ; clé manquante → français.
- GEN-11 : « versement » jamais « reversement » ; « client » jamais « acheteur » ; jamais « escrow » ; accents partout.
- GEN-12 : **pas de bleu** (décision du 23 septembre) ; violet réservé au plan Pro.

**Charte de simplicité (SPL-01 à 11, Recommandé)** : essentiel en premier ; une seule action principale ; mots simples (**12 mots en moyenne**, tutoiement « vous ») ; une idée par ligne ; replier sans supprimer ; montants « Vous gardez » en grand ; même mot partout (lexique VD-12) ; états vides en une ligne + un bouton ; **cibles 44 px**, **texte ≥ 13 px** (légendes **12 px**), **contraste ≥ 4,5:1** ; jetons seulement ; **aucun paramètre retiré**.

**Navigation (NAV-01 à 09, tous Décidé)**
- NAV-01 : dock identique partout, **4 onglets** (Accueil, Commandes, Produits, Argent), capsule orangée.
- NAV-02 : badges — Commandes = à préparer ; Argent = point rouge si gelé ; masqués à 0.
- NAV-03 : en-tête racine avec menu, logo, lune/soleil, FR/EN, cloche, avatar, « ESPACE VENDEUR · NOM INTERNE », **trois pastilles** (ouverture, palier/Trust Score, plan).
- NAV-04 : en-tête enfant = flèche retour, titre, chariot du logo ; jamais de flèche sur écran racine.
- NAV-05 : Litiges et Retours ne sont **pas des onglets**.
- NAV-06 : marge basse **≥ 136 px**.
- NAV-07 : zones sûres — **50 px** en haut, dock à **30 px** du bas, `env(safe-area-inset-*)` avec `viewport-fit=cover`.
- NAV-08 : bouton retour téléphone → écran précédent, état conservé en session.
- NAV-09 : **au plus trois pastilles**.

**Design system (DS-01 à 14, tous Décidé)**
- DS-01 : Plus Jakarta Sans 400-800 ; **11 tailles (11 à 44 px)** ; interlignes **1,14 / 1,36 / 1,5** ; rayons **10, 14, 20, 28** ; grille **2 px** ; aucun texte **< 12 px** (11 px pour chiffre de pastille).
- DS-02 : liquid glass — blanc **56 %**, `blur(24px) brightness(1.26) saturate(185%)` ; repli blanc **95-97 %**.
- DS-03 : dock détaché de **12 px**, **64 px** de haut.
- DS-05 : une seule carte clé par écran.
- DS-06 : boutons **principal 48 px** (dégradé `#CC4A0B → #AE3B06`), **secondaire 44 px**, **petit 40 px** (zone 44 px) ; un seul plein.
- DS-07 : cibles **44 px**, contraste **≥ 4,5:1**.
- DS-09 : « Graphite pro » — fond `#0F0F10`, cartes `#18181A`/`#1D1D20`, texte `#F3F2F0`/`#A9A5A0`, orange `#FF9549`, vert `#4FD08F`, ambre `#F0C04C`, rouge `#FF8A80`, verre `saturate 120% brightness 0,72`.
- DS-10 : typographie française côté serveur (espaces insécables U+00A0, apostrophe courbe, vrai signe moins) ; anglais avec virgule des milliers.
- DS-14 : tailles de texte Normale / Grande (**115 %**) / Très grande (**130 %**).

**Portail actuel vs nouvelle version** : `seller.belivay.com` affichait tiroir de **20 entrées**, commission (**10 %, 12 %, −42 000, −84 000**, cinq taux), bouton « Retirer » (**frais 1,5 %, minimum 1 000 F**), page boutique publique, QR, WhatsApp public, statuts techniques (`OUT_FOR_DELIVERY`, `BUYER_CONFIRMED`) — tout cela à retirer.

### Endpoints API et événements

Aucun endpoint listé dans ce document (document de design system/navigation, pas de données). Renvoi explicite à **VD-02** pour les données, la formule V02 et le mode hors connexion (service worker + IndexedDB chiffrée + file d'actions signées).

### Questions ouvertes à trancher (recopiées)

- **VD-D02.Q01** : le vendeur n'emploie jamais « escrow » ni « acheteur » (GEN-11) alors que le client affiche « Escrow BelivaY » et « acheteurs vérifiés » — question inter-espaces n° 78 déjà ouverte.
- **VD-D02.Q02** : GEN-08 prévoit un WhatsApp du support vendeur pour l'aide (le client aussi ; le relais n'a pas de WhatsApp) — cohérent avec CL-16 n° 79 (signalé comme cohérent, pas comme un conflit à trancher).
- **VD-D02.Q03** : en-tête vendeur garde FR/EN et la lune (NAV-03) alors que l'espace client les a déplacés dans le Menu (décision du 26 sept.) — choix propre à chaque espace à confirmer.

### Contradictions / incohérences internes

- **Vocabulaire « escrow »/« acheteur »** : interdit côté vendeur (GEN-11, Décidé) mais utilisé côté client (« Escrow BelivaY », « acheteurs vérifiés ») — incohérence de vocabulaire inter-espaces déjà signalée ailleurs (question n° 78) mais non résolue ici.
- **Emplacement des sélecteurs FR/EN et thème** : présents dans l'en-tête vendeur (NAV-03, Décidé) alors que le même élément a été retiré de l'en-tête client et déplacé dans le Menu (décision du 26 sept., postérieure au 24 sept. de VD-01) — VD-01 n'a pas absorbé cette décision plus récente.
- Le document affirme que « GEN-08 » (WhatsApp support vendeur) est cohérent avec CL-16 n°79, mais note aussi que **le point relais n'a pas de WhatsApp** — traitement différencié entre espaces à confirmer explicitement comme volontaire plutôt qu'un oubli.

---

*Fin de la synthèse du lot 2 (R2, VD-00, VD-01). Sources : `R2_guide.txt`, `VD-00_guide.txt`, `VD-01_guide.txt` (extraction pdftotext -layout, paquet « Espace vendeur », BelivaY, 27 septembre 2026).*
