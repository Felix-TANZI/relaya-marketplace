# Synthèse — Paquet développeur « Espace vendeur »

> Source : `/media/jacquy-ngonga4/9C109B2D109B0E00/3 — BelivaY Espace vendeur — paquet développeur/` (700 pages, 17 documents, 56 parties, 409 actions, daté du 27 septembre 2026).
> Méthode : lecture intégrale des 17 guides développeur (texte extrait des PDF, captures/maquettes retirées) par 7 agents en parallèle, puis compilation croisée. Le détail complet (tableaux d'actions, chiffres, endpoints, questions ouvertes littérales) est dans `espace_vendeur_synthese_detail/batch1_R1_R4.md` à `batch7_VD11-12.md`, à côté de ce fichier. Ce document est le résumé exécutif — les décisions à prendre avant de coder.

---

## 1. Ce qu'il faut retenir en premier

Le paquet est un travail sérieux et très détaillé (design system complet, 66 écrans, règles UX cohérentes à 90 %), mais **il n'est pas prêt à être implémenté tel quel sur trois zones précises** : l'argent (commission + libération), les litiges, et le Trust Score vendeur. Sur ces trois zones, le paquet contient plusieurs versions concurrentes de la même règle, et le document censé arbitrer (VD-12) ne les referme pas toutes. Le reste (navigation, design, écrans de commandes/produits/boutique) est solide et cohérent, avec un statut « Décidé » sur la quasi-totalité des règles.

**Recommandation** : ne pas commencer le code sur Mon argent / Mes gains / Litiges / Trust Score avant d'avoir tranché les 3 points de la section 2. Le reste (VD-01 fondations, VD-03 accès, VD-04 accueil, VD-05 commandes, VD-06 remise, VD-08 produits, VD-11 boutique/compte) peut démarrer dès maintenant, en gardant `kept_amount`/`keep_amount` comme un champ opaque renvoyé par le service de commission plutôt que de recalculer le montant côté frontend.

---

## 2. Les 3 zones à trancher avant de coder

### 2.1 Commission : trois formules incompatibles en circulation

Le paquet ne donne pas une formule de commission, mais **trois**, avec des écarts de plusieurs milliers de francs sur les mêmes scénarios de test :

| Source | ITEL AC52 20 000 F | iPhone 15 Pro Max 350 000 F |
|---|---|---|
| **R4 — REF-COMMISSION** (catégorie × palier, coefficients dégressifs 1/0,5/0,25/0,12) | vendeur garde **16 600 F** | garde **330 960 F** |
| **R2/VD-02 — barème « M01 »** (familles A-E × tranches, utilisé partout dans VD-03 à VD-12 comme jeu d'essai « Tonton PG ») | garde **17 840 F** | garde **335 324 F** |
| **Le barème M01 appliqué à lui-même** (VD-02, action A01, « point ouvert p6 ») | — | le calcul donne **12 950 F ou 10 360 F** de commission, pas 14 676 F — le barème ne reproduit pas ses propres exemples |

En plus de ça : R4 précise que sa propre grille par univers de produits (9 catégories × 4 paliers) est presque entièrement au statut « Proposé » car **l'annexe 1 du contrat vendeur, censée la fixer, n'a jamais été transmise**. Et le plancher de 700 F par commande peut rendre le net vendeur négatif ou incohérent sous ~3 043 F (cas reconnu mais non résolu).

**Conséquence concrète** : tout écran affichant « Vous gardez X F » (Mon argent, Mes gains, simulateur de plans, nouvelle offre, versements) est actuellement invérifiable — on ne sait pas quelle formule est censée être la bonne. C'est le point bloquant n°1 du paquet entier, signalé par les documents eux-mêmes sans être tranché.

**Ce qu'il faut faire** : obtenir l'annexe 1 du contrat vendeur (ou confirmer qu'elle n'existe pas encore) et choisir explicitement entre R4 et le barème M01 avant d'écrire le service de commission. Vu que M01 est celui utilisé dans absolument tous les scénarios de test des 9 documents VD-03 à VD-12, c'est probablement celui à retenir par défaut — mais ça doit être une décision, pas une supposition.

### 2.2 Litiges : arbitrage automatique vs décision humaine

Répété dans **au moins 5 documents indépendants** (R2 §Q09/Q19, VD-02 Q01, VD-05 Q01, VD-07 Q01 — qualifié d'« écart majeur » par le document lui-même —, et le scénario de test T6 de VD-12) :

- **Les documents VD (espace vendeur)** disent : sans réponse du vendeur sous 48 h, une **tâche planifiée applique automatiquement** un arbitrage en faveur du client (règle « G1 »).
- **Le glossaire client v3** (CLI-19, CCN-04, daté du 25 septembre — plus récent que la plupart des documents VD datés du 24) dit : présomption en faveur du client, mais **décision humaine motivée obligatoire**, « jamais de remboursement automatique à l'échéance ».

VD-12, le document censé arbitrer tout ça (« ce tableau fait foi »), **ne tranche pas cette question** dans sa liste de 20 arbitrages — elle reste ouverte telle quelle, alors même que le scénario de test T6 continue de décrire le mécanisme automatique.

**Ce qu'il faut faire** : trancher explicitement pour la décision humaine (c'est la règle la plus récente et la plus citée comme faisant autorité côté client), et corriger VD-07/VD-02/T6 en conséquence avant d'implémenter le moteur de litiges.

### 2.3 Argent : pas un J+3 simple, et Trust Score vendeur à diffuser contre le V5.5 canonique

**Libération des fonds** (VD-09) : la mémoire du projet retient « J+3 = délai de règlement depuis l'événement de libération, pas de clawback, pas de J+7 généralisé ». Le document réel dit autre chose de plus précis :

```
t_fermeture = min(confirmation client ; retrait + 7 jours)
t_libération = t_fermeture + Δ
Δ = 3 jours (Bronze/Argent) · 1 jour (Or/Platine) · 14 jours (paiement carte)
```

Le J+3 n'est donc vrai que pour les paliers Bronze/Argent ; Or/Platine descend à J+1, carte monte à J+14, et la clause « retrait + 7 jours » réintroduit une fenêtre de 7 jours qui n'apparaît pas dans le résumé de la règle interne. À rapprocher explicitement du Référentiel unique et de la décision « Gros morceaux » avant de coder le moteur de libération.

Sur le **retour de colis non retiré au relais** (VD-07 RET-08 : gardé 7 jours puis renvoyé gratuitement au vendeur, 500 F facturé au client, aucun effet Trust Score), la mécanique ressemble à la décision « garde-au-relais puis retour à J+7 », mais **aucun tarif de garde journalier de 200 F/jour n'apparaît nulle part** dans le paquet vendeur — seulement un forfait de trajet à 500 F.

**Trust Score vendeur** (VD-10, cite « V11, TS55 §15.2 ») : reprend bien µ=50 (cold start), Wilson, veto ≤ 39 — cohérent en apparence avec le [[project_belivay_trust_score_v55_spec]] canonique — mais ajoute des paramètres qui n'apparaissent pas dans le résumé disponible de la V5.5 : k=10, poids exacts par critère (25/20/20/15/10/10), demi-vie de 90 jours, plafond de baisse de 8 points par recalcul. Il faut un diff ligne à ligne entre VD-10 et le spec V5.5 réel avant d'implémenter le moteur de score vendeur. Le document contient aussi une incohérence non résolue en interne (gain Argent sur l'iPhone cité comme 2 201 F à un endroit et « corrigé » à 3 360 F à un autre) et deux échelles de seuils de palier incompatibles : 65/80/90 (Trust Score) vs 15/40/80 (« palier de lancement » selon le nombre de produits actifs, pendant les 2 premiers mois) — sans règle d'arbitrage entre les deux.

---

## 3. Ce qui est solide et peut être implémenté sans attendre

- **Design system et navigation (VD-01)** : dock à 4 onglets, palette, typographie, mode sombre « Graphite pro », charte de simplicité — quasiment tout est « Décidé », rupture nette et documentée avec le portail actuel (`seller.belivay.com`).
- **Règle transversale « Vous gardez X F », jamais « commission »** : répétée et cohérente dans tous les documents (VD-01 GEN-02, VD-02 ACC-08, VD-05 CMD-03…) — le montant exact dépendra de la décision §2.1, mais l'UX (aucune ligne de commission visible) ne fait aucun doute.
- **Anonymat vendeur ↔ client** : extrêmement cohérent sur les 17 documents — le vendeur ne voit jamais identité/quartier/relais/total payé du client ; le client ne voit jamais le nom du vendeur/boutique. Aucune contradiction relevée sur ce point.
- **Écrans d'accès et d'ouverture de boutique (VD-03)**, **accueil (VD-04)**, **commandes et préparation (VD-05)**, **remise au livreur (VD-06)**, **produits et nouvelle offre (VD-08)**, **boutique/compte/communication (VD-11)** : le flux, les composants UI et la plupart des endpoints indicatifs sont clairs et cohérents entre eux. Quelques incohérences mineures signalées (voir §4) mais rien qui bloque le développement de l'écran lui-même — traiter `kept_amount` comme une valeur opaque venant du serveur suffit pour découpler ce travail du chantier commission.
- **Zéro dépôt, zéro token, zéro espèce** : confirmé partout, cohérent avec le [[project_belivay_referentiel_unique]] verrouillé. La livraison reste toujours facturée au client — rien dans le paquet ne contredit cette règle.

---

## 4. Autres incohérences relevées (secondaires, à corriger mais non bloquantes)

- **Numérotation g1/g2/g3 des sanctions incohérente entre documents** : non-préparation d'une commande classée g3+sanction niveau 2 dans VD-05, mais g2/« échec moyen » dans VD-02 et le registre client (CLI-39) — à harmoniser dans VD-10.
- **Nombre de motifs de litige/retour** : 4 côté vendeur/relais vs 5 côté client.
- **VD-12 se contredit lui-même** : son arbitrage n°12 décide que le pidgin doit couvrir les SMS vendeur, puis sa propre action VD-D13.A08 demande d'annuler cet arbitrage pour respecter la règle client (SMS en français tant que la traduction n'est pas validée).
- **Bande « Sponsorisé » vendeur** (VD-10, catalogue de visibilité payante) vs interdiction de toute publicité tierce/bande sponsorisée au lancement côté client — écart qualifié de « majeur » par le document lui-même.
- **Vente flash et vitrine offertes** proposées dans VD-08/VD-10 alors que le feature-flag FF-FLASH est explicitement fermé au lancement côté client.
- **Deux échelles de zonage différentes** : « 6 zones » dans les écrans vendeur vs « 12 zones à Yaoundé, 4 exploitées » côté console admin.
- **Base de données client obsolète dans le registre** : VD-12 recopie les 139 anciennes règles client (pré-v3 du 25 sept.), dont au moins 11 sont déjà explicitement marquées comme remplacées dans le texte lui-même.
- **Chronologie de médiation incohérente** : VD parle de médiation ≤48h → médiateur senior ≤3j → « tribunal » (terme absent côté client, qui ne prévoit ni recours ni délai de réponse formalisé à ce niveau).
- **R2 (source unique censée alimenter tous les VD-xx) contient lui-même une exemple mathématiquement impossible** : un exemple de calcul y affirme qu'une commission plus élevée laisserait le vendeur avec plus d'argent — signalé mais pas corrigé dans le texte.
- **R3 (référence produit) est un document daté du 19 septembre**, très largement dépassé par les arbitrages du 17 au 25 septembre — à traiter comme un audit de conformité, pas comme une spec à implémenter telle quelle.

Le détail complet de chaque point (avec les identifiants de règles exacts, ex. `RUP-03`, `ACC-05`, `Q01`) est dans les 7 fichiers `espace_vendeur_synthese_detail/batchN_*.md`.

---

## 5. Carte des 17 documents

| Doc | Titre | Pages/Parties/Actions | Statut de fiabilité |
|---|---|---|---|
| R1 — REF-CL | Spécification complète espace client (source) | 158p/12/81 | Référence transverse, v3 du 25 sept. — fait autorité sur les points de désaccord avec les VD |
| R2 — REF-VD | Spécification développeur espace vendeur (source) | 140p/10/64 | Source « mère » des VD-xx, mais datée du 24 sept. — contient des règles déjà dépassées par R1 v3, et une incohérence de calcul interne |
| R3 — REF-PRODUIT | Référence produit, version courte (source) | 67p/5/29 | **Obsolète** (19 sept.) — à lire comme audit, pas comme spec |
| R4 — REF-COMMISSION | Commission officielle V02 (source) | 7p/1/5 | Bloquant — grille en grande partie non contractuelle (annexe manquante), formule concurrente de M01 |
| VD-00 | Lisez-moi, sommaire et index | 9p/1/4 | Méta — se contredit en une page (« aucune règle à confirmer » puis liste des écarts) |
| VD-01 | Fondations, navigation et design | 11p/1/11 | Solide, quasi tout « Décidé » |
| VD-02 | Données, argent, calculs, droits et API | 13p/1/9 | Socle technique — contient le point ouvert commission le plus critique |
| VD-03 | Accès et ouverture de la boutique | 23p/2/17 | Solide |
| VD-04 | Accueil, à faire et états | 24p/2/18 | Solide, une correction de bug déjà identifiée (gain palier 600F→324F) |
| VD-05 | Commandes et préparation | 24p/2/18 | Solide, incohérence mineure de gravité de sanction |
| VD-06 | Remise, reçu et erreurs | 18p/2/13 | Solide |
| VD-07 | Litiges et retours | 25p/2/17 | **Écart majeur** sur le mécanisme de décision (voir §2.2) |
| VD-08 | Produits et nouvelle offre | 35p/3/33 | Solide, dépend du moteur de commission pour les montants affichés |
| VD-09 | Argent et versements | 32p/3/24 | **Bloquant** — libération non uniforme (voir §2.3) |
| VD-10 | Trust Score, palier et croissance | 39p/3/25 | **À diffuser contre le V5.5 canonique** (voir §2.3) |
| VD-11 | Boutique, compte et communication | 37p/3/28 | Solide, quelques désaccords de vocabulaire/route mineurs |
| VD-12 | Registre, mise à niveau, tests et lexique | 38p/3/13 | Document d'acceptation — **ne referme qu'une partie des questions qu'il est censé trancher** |

---

## 6. Prochaine étape suggérée

1. Faire trancher par vous/l'équipe les 3 points de la section 2 (commission, litiges, argent/Trust Score) — ce sont des décisions produit, pas des décisions techniques.
2. Une fois tranché, je peux comparer chaque point contre le code actuel de l'espace vendeur dans ce repo pour établir l'écart réel avant d'écrire le moindre code (option « comparer au code existant » du menu initial, non faite dans cette passe).
3. Le plan de mise à niveau du paquet lui-même propose un ordre en 10 lots (VD-12, §B) : Fondations → Commission → Argent → Anonymat → Commandes → Litiges/Retours → Ouverture → Trust Score → Catalogue → Croissance/Compte — cohérent avec la logique ci-dessus (traiter les 3 zones à risque tôt, pas en dernier).

Fichiers détaillés : `espace_vendeur_synthese_detail/batch1_R1_R4.md`, `batch2_R2_VD00_VD01.md`, `batch3_R3_VD02.md`, `batch4_VD03-05.md`, `batch5_VD06-08.md`, `batch6_VD09-10.md`, `batch7_VD11-12.md`.
