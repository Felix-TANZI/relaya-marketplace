# Batch 6 — VD-09 (Argent et versements) & VD-10 (Trust Score, palier et croissance)

---

## VD-09 — Argent et versements

- **Titre exact** : VD-09 — Argent et versements
- **Code de suivi des actions** : VD-D10 (actions VD-D10.A01…, questions VD-D10.Q01…)
- **Document d'origine** : 01_Documents/VD-09_Argent_Versements.pdf, 32 pages, version 1.0 du 24 septembre 2026
- **Découpage** : 3 parties / 24 actions
  - Partie 01 — pages 1 à 11
  - Partie 02 — pages 12 à 21
  - Partie 03 — pages 22 à 32

### Écrans couverts

| Écran | Objectif | Éléments/composants UI principaux | Actions possibles de l'utilisateur |
|---|---|---|---|
| **Mon argent** (Fig.1, Fig.2) | Dire d'un coup d'œil combien part vendredi, sur quel numéro, et où est chaque autre franc (4 lignes dont la somme est affichée). | Onglets Résumé · Se libère · Gelé · Mes gains ; carte nuit « À verser vendredi » ; barre 4 couleurs (vert/orange/ambre/rouge) ; ligne « En circulation » ; bloc « Ce que vous gardez » ; rappel anti-fraude MoMo ; écran verrouillé pour accès Préparation (cadenas). | Toucher une des 4 lignes → détail ; voir le prochain versement ; (rôle prep) uniquement « Voir les commandes à préparer ». |
| **Se libère — quand** (Fig.3) | Dire quand la somme en attente devient « à verser » (barre réelle) et quand elle arrive. | Carte nuit par commande (BLV-00007) avec compte à rebours et barre de progression ; aide 1 ligne palier ; section « En cours » ; encadré rouge règle du gel ; bloc replié « Comment ça marche ». | Ouvrir la commande en cours ; consulter « Comment ça marche ». |
| **Gelé — pourquoi** (Fig.4) | Expliquer chaque montant gelé (motif + action), le plus urgent en premier. | Carte rouge héros « Gelé · N commandes » ; addition des montants ; bloc « À faire pour débloquer » ; une carte par commande gelée triée par échéance, avec horloge et bouton (plein sur la plus urgente, secondaire sinon) ; bloc replié « Comment ça marche ». | Répondre au litige / voir le retour (bouton par carte). |
| **Mes gains** (Fig.5) | Montrer ce que le vendeur a gardé, vente par vente et produit par produit ; compteur « Gagné avec BelivaY ». | Carte nuit mensuelle ; section « Par vente » (colonne « Vous gardez ») ; section « Par produit » ; bloc « Versé et à verser » ; tuiles Impayés/Transport ; bloc replié « Comment ça marche ». | Suivre le lien « Versements » ; ouvrir « Comment ça marche ». |
| **Documents** (Fig.6) | Ranger relevés, reçus, factures et contrat en trois groupes titrés. | Groupe « Relevés et reçus » (relevé en cours CSV, relevés mensuels PDF/CSV, reçus de commande) ; groupe « Factures » (commissions ; abonnement/visibilité, état vide expliqué sur Free) ; groupe « Contrat et données » (contrat signé, Mes données). | Télécharger un document (icône + format) ; ouvrir le détail RCCM/NIU. |
| **Versements** (Fig.7, Fig.8) | Montrer le prochain versement (montant, numéro, référence, commandes couvertes) puis l'historique, et la marche à suivre en cas de refus opérateur. | Carte nuit « Prochain versement » ; puces de période 3 mois/12 mois/Tout ; liste « Déjà reçus » ; bandeau rouge en cas de refus avec plan des essais ; bloc replié « Comment ça marche ». | Signaler un versement non reçu ; changer de numéro de versement ; écrire au support (en cas de refus). |
| **Numéro de versement** (Fig.9, Fig.10, Fig.11) | Changer en sécurité le seul numéro de versement, en 3 étapes visibles. | Carte « Numéro actuel » ; barre d'étapes 1·2·3 ; avertissement ambre ; sélection opérateur + saisie numéro avec contrôle de préfixe ; saisie des deux codes SMS ; carte « en revue ». | Recevoir le code ; valider le numéro ; écrire au support si « ce n'est pas vous ». |

### Tableau des actions (24/24)

| ID | Description courte | Statut |
|---|---|---|
| VD-D10.A01 | Fusionner les 5 pages financières en une seule (GET /money/summary) ; supprimer Paiements & Escrow, Mes règlements, Mes fonds en attente, Mes ajustements, Compte BelivaY | (action, non lettré V/D/Δ/P dans le tableau d'actions — règle liée ARG-01 = Décidé) |
| VD-D10.A02 | Supprimer le flux de retrait (bouton, montant, frais 1,5 %) côté client et serveur | (ARG-02 = Décidé) |
| VD-D10.A03 | Retirer les tuiles « Commission 10 % » et « Frais de retrait 1,5 % » ; afficher « Ce que vous gardez » | (ARG-03 = Décidé) |
| VD-D10.A04 | Remplacer « Escrow » par « Protégé »/« En cours » (V82) | (GEN-11) |
| VD-D10.A05 | Fixer les 4 couleurs par jetons (–green, –or, –gold, –red), « Se libère » en orange | (ARG-01 = Décidé) |
| VD-D10.A06 | Lignes touchables 56 px vers détail ; somme sous les 4 lignes ; contrôle de la somme avant affichage (V16) | (ARG-05 = Décidé) |
| VD-D10.A07 | Déplacer « Relevé CSV » et « Relevé mensuel » dans Documents via une ligne « Relevés et documents » | (DOC-03 = Décidé) |
| VD-D10.A08 | Renvoyer 403 owner_only pour le rôle prep sur toutes les routes de l'argent ; écran « Réservé au propriétaire » sans lire le cache | (ARG-04 = Décidé, ARG-07 = Recommandé) |
| VD-D10.A09 | Remplacer les délais figés (48 h, 24 h) par t_libération calculé serveur selon palier et moyen (progress, left) | (LIB-01, LIB-03 = Décidé) |
| VD-D10.A10 | Remplacer la tuile « Gelé (litige) 0 FCFA » par une carte par commande gelée (GET /money/frozen), triée par due_at, bouton plein sur la plus urgente | (GEL-01 à GEL-03 = Décidé) |
| VD-D10.A11 | Supprimer « Mes ajustements » et les lignes négatives de commission ; créer « Mes gains » (GET /money/earnings) | (GAI-01 = Décidé) |
| VD-D10.A12 | Remplacer la carte violette par la carte nuit espresso (violet réservé au plan Pro) | (GEN-12) |
| VD-D10.A13 | Écrire « Vous gardez » une fois en tête de colonne, montants en vert à droite | (GAI-01 = Décidé) |
| VD-D10.A14 | Créer la page Documents unique en 3 groupes (GET /documents) ; relevés figés le 1er ; factures abo/visibilité état vide sur Free | (DOC-01 à DOC-04 : DOC-01/02/03 = Décidé, DOC-04 = Recommandé) |
| VD-D10.A15 | Rôle prep : 403 owner_only ⇒ écran verrouillé | (ARG-07 = Recommandé) |
| VD-D10.A16 | Supprimer « Demander un retrait » (minimum, frais 1,5 %) ; tâche planifiée de versement chaque vendredi avant 12 h, frais à la charge de BelivaY | (VER-01 = Décidé) |
| VD-D10.A17 | Attribuer la référence BLV-VS-nnnn à l'arrêté du jeudi et l'annoncer avant le versement | (VER-02 = Décidé) |
| VD-D10.A18 | Implémenter la machine d'états refused → 3 essais → suspended, texte « À faire » selon le motif | (VER-04 = Décidé) |
| VD-D10.A19 | Filtrer l'historique par période (3 mois par défaut) sans toucher au prochain versement | (VER-05 = Recommandé) |
| VD-D10.A20 | Ajouter « Signaler un versement non reçu » (messagerie avec référence, réponse avant lundi midi) | (VER-03 = Recommandé) |
| VD-D10.A21 | Ajouter au changement de numéro : second facteur, contrôle du titulaire, 7 jours de revue humaine (PUT /payout-number, review, resume_at) | (NUM-01, NUM-06 = Décidé) |
| VD-D10.A22 | Contrôler le préfixe avant l'envoi (MTN 67X/68X/650-654 ; Orange 69X/655-659) | (question ouverte VD-D10.Q04 sur la validité des plages) |
| VD-D10.A23 | Ajouter la barre d'étapes 1·2·3 et la date du premier versement vers le nouveau numéro | (NUM-04 = Décidé) |
| VD-D10.A24 | Fusionner les 3 numéros en un seul champ payout_msisdn ; retirer le numéro de Paramètres | (NUM-01 = Décidé) |

*Note : le tableau d'actions §3.2 lui-même ne porte pas de lettre V/D/Δ/P par action ; le statut le plus proche est celui de la règle-mère citée en §4 (listé ci-dessus entre parenthèses).*

### Règles métier et calculs clés — CHIFFRES EXACTS

**Cinq états de l'argent** : Disponible (« À verser »), Se libère, En cours, Gelé, Versé.

**Formule de circulation** :
- en circulation = à verser + se libère + en cours + gelé = 17 840 + 17 840 + 17 840 + 688 488 = **742 008 F**
- gelé = 335 324 + 335 324 + 17 840 = **688 488 F**
- « Passe à » = à verser + se libère avant jeudi 23 h 59 = **35 680 F**
- Contrôle de somme obligatoire avant affichage : écart ⇒ alerte, **jamais de chiffre faux (règle V16)**

**Délai de libération (t_libération)** :
- t_fermeture = **min(confirmation client ; retrait + 7 jours)**
- t_libération = t_fermeture + Δ, avec **Δ = 3 jours (Bronze/Argent), 1 jour (Or/Platine), 14 jours (carte bancaire)**
- Exemple chiffré : BLV-00007, 63 h 48 sur 72 h = **89 %**, **8 h 12 restantes**
- « Votre palier Bronze : libéré **3 jours** après la confirmation du client » (cohérent avec Δ Bronze ci-dessus)
- **LIB-02** : un litige ou un retour gèle aussitôt la somme, **même pendant le compte à rebours** (règle F5) — priorité absolue du gel sur le décompte.
- **PAN-09 (règle client)** : argent bloqué jusqu'à la confirmation du client.

**Gel (Gelé — pourquoi)** :
- Ce qui peut geler : litige ouvert par le client, retour après un problème signalé, vérification anti-fraude.
- **GEL-02** : vérification anti-fraude → motif écrit **sous 48 h**.
- **Litige : 48 h pour répondre. Retour : 48 h pour inspecter le produit.**
- « Litige gagné : la somme se libère **aussitôt** et part **le vendredi suivant** ».
- Remboursement automatique sous seuil : **3 000 F (client Standard)**, **10 000 F (client Élevé)** — payé par BelivaY, vendeur payé quand même, **score non touché** (règle F8).
- Tri des cartes gelées : par **due_at croissant** (exemple : mar. 22 05h30 → mer. 23 06h02 → jeu. 24 16h).

**Mes gains** :
- gardé(mois) = 3 × 17 840 = **53 520 F**
- déjà versés + à verser = gagné : 35 680 + 17 840 = **53 520 F**
- « Gagné depuis l'inscription » : 53 520 F (09h48) → 71 360 F (18h) le même jour.
- Une ligne « reprise » (ligne négative) uniquement en cas de **vice caché jugé après libération** (règle H7) — daté et motivé.

**Documents** :
- **DOC-01** : facture des commissions émise **le 1er du mois suivant**.
- **DOC-03** : mois en cours en CSV « En cours » ; mois clos figés en PDF+CSV, émis **le 1er du mois suivant**.
- Contrat vendeur signé électroniquement le 7 mai 2026 (donnée de scénario).

**Versements (VER)** :
- **VER-01** : versement automatique **chaque vendredi avant 12 h**, **sans frais**, **sans minimum**. Formule : versement(V) = **Σ nets libérés non versés avec t_libération ≤ jeudi 23h59**, versé vendredi avant 12 h (règle F4).
- **Frais de versement : 0 F, à la charge de BelivaY** (règle D7) — remplace l'ancien retrait à 1,5 % à la charge du vendeur.
- **VER-02** : référence **BLV-VS-nnnn** attribuée à l'arrêté du jeudi, annoncée avant le versement.
- **VER-03** : versement non reçu → réponse avant **le lundi midi suivant**.
- **VER-04 (refus opérateur)** : essais à **t+24h, t+48h, t+72h**, puis **suspension** et appel du support (règle F7). Exemple scénario : refus vendredi → nouveaux essais samedi 26 (12h, 1/3), dimanche 27, lundi 28 ; « après 3 échecs, suspension + appel du support ».
- **VER-05** : historique filtré 3 mois (**défaut**), 12 mois, Tout ; le prochain versement n'est jamais filtré.
- Motifs de refus possibles : **{tiers, compte plein, préfixe}**.

**Numéro de versement (NUM)** :
- **NUM-01** : un seul numéro actif, au nom du titulaire ; tiers refusé avec motif écrit.
- **NUM-02** : BelivaY **ne demande jamais le code secret Mobile Money** (règle M4).
- **NUM-04** : 3 étapes visibles ; date de reprise + date du premier versement écrites.
- **NUM-06** : toujours 2 codes SMS (nouveau numéro + second facteur).
- **NUM-07** : second facteur toujours par SMS au téléphone personnel, **jamais par e-mail**.
- Préfixes : **MTN ⇔ 67X, 68X, 650 à 654** ; **Orange ⇔ 69X, 655 à 659**.
- Changement validé ⇒ **versements suspendus 7 jours** + revue humaine (règle F6).
- **Premier versement après changement = le premier vendredi après la revue.**
- Exemple : changement le 9 mai (ancien numéro) ; nouveau changement → suspension jusqu'au **lundi 28 septembre**, versement du 25 sept. (35 680 F) reporté au vendredi **2 octobre**.

### Endpoints API et événements mentionnés

- `GET /money/summary` → `{to_pay{amount, friday, tonight_amount}, releasing{amount, at, ref}, in_progress{amount, ref}, frozen{amount, disputes, returns}, in_circulation, payout_number, month{kept, sales}}`
- `GET /me` → `role owner|prep`
- 403 `{error: "owner_only", owner: "<nom>"}` sur `/money/*`, `/payouts`, `/documents`, `/payout-number` pour le rôle prep
- `GET /money/frozen`
- `GET /money/earnings`
- `GET /documents?type=statement|receipt|invoice|contract` → `[{type, kind, period, status, issued_at, available_at, formats, url}]` (kind: `commission|subscription|visibility` ; status: `open|issued`)
- `GET /plan`
- `GET /payouts?period=3m|12m|all` → `{next{date, amount, tonight_amount, reference, covers[], cutoff}, history[], totals{amount, count, fees}, incident{reason, attempt, next_attempts[]}}`
- `POST /payouts/{id}/incident`
- Machine d'états payout : `refused → retry ×3 → suspended`
- `POST /payout-number/codes {operator, msisdn}` (renvoie code_new)
- `POST /auth/2fa` (code_2fa)
- `PUT /payout-number {operator, msisdn, code_new, code_2fa}` → `{status: "review", resume_at, first_payout}`
- Erreur `422 {field}`
- Composant `C.more`

### Erreurs et cas limites mentionnés

- 403 `owner_only` pour rôle prep, écran « Réservé au propriétaire » sans lire le cache.
- 422 `{field}` sur le changement de numéro de versement.
- Écart de somme (contrôle de cohérence) ⇒ alerte, jamais de chiffre faux (V16).
- Refus opérateur (motif compte plein / tiers / préfixe) → cycle d'essais → suspension après 3 échecs.
- « Ce n'est pas vous ? Écrire au support » pendant la revue du nouveau numéro (NUM-05, Recommandé).

### Questions ouvertes à trancher (recopiées)

- **VD-D10.Q01** (partie 01) : Aucune nouvelle ; cohérent avec LIB-STD / LIB-OR / LIB-CARTE et VERSEMENT-JOUR.
- **VD-D10.Q02** (partie 02) : Aucune nouvelle.
- **VD-D10.Q03** (partie 03) : Exemple de calcul « refus aujourd'hui, essais demain, mercredi, jeudi à 12 h » alors que la capture montre samedi 26, dimanche 27, lundi 28 (refus du vendredi) : aligner l'exemple.
- **VD-D10.Q04** (partie 03) : Préfixes Orange « 69X, 655 à 659 » et MTN « 67X, 68X, 650 à 654 » : à valider avec les plans de numérotation en vigueur.

### Contradictions internes / incohérences apparentes (signalées, non résolues)

1. **VD-D10.Q03** ci-dessus : l'exemple textuel des essais de versement (« demain, mercredi, jeudi à 12 h ») ne correspond pas aux dates de la capture (samedi/dimanche/lundi) — le document le signale lui-même.
2. Les captures « actuel » montrent des délais figés contradictoires avec les valeurs nouvelles : ancien système annonçait **« Arrive sous 24 h »**, **« 48 h après livraison »**, **« 24 h de libération »**, **commission 10 %**, **frais de retrait 1,5 %**, **minimum de retrait 1 000 FCFA** — tous supprimés/remplacés par le système à délai calculé par palier (3 j / 1 j / 14 j) et versement hebdomadaire sans frais ni minimum. Le document présente cela comme une mise à niveau assumée, mais souligne l'ampleur de l'écart avec l'existant.
3. **Pertinent pour la règle métier verrouillée BelivaY (J+3 = délai de règlement compté depuis l'événement de libération, pas de clawback, pas de J+7 généralisé)** : ce document définit **t_fermeture = min(confirmation ; retrait + 7 jours)** puis **t_libération = t_fermeture + Δ** où Δ vaut **3 j (Bronze/Argent), 1 j (Or/Platine) ou 14 j (carte bancaire)**. Autrement dit, le document VD-09 ne fixe PAS un J+3 universel : le délai dépend du palier vendeur (Trust Score) et du moyen de paiement client, et le « retrait + 7 jours » réintroduit une notion de délai de rétractation client de 7 jours qui n'apparaît pas explicitement dans le résumé de la règle métier verrouillée fournie. Le J+3 canonique ne correspond qu'au cas Bronze/Argent ; Or/Platine descend à J+1, et paiement carte monte à J+14. **Cet écart de paramétrage par palier/moyen de paiement doit être vérifié contre le Référentiel unique et le rule set « Gros morceaux » (garde-au-relais/J+7).**
4. Le document ne mentionne aucun dépôt de garantie ni token — cohérent avec la règle verrouillée « no deposit, no tokens » — mais introduit un **plafond de remboursement automatique** payé par BelivaY (3 000 F / 10 000 F) qui pourrait avoir un impact sur le plafond GMV 3,5 % si ces montants sont fréquents ; aucun chiffrage de fréquence n'est donné pour évaluer l'impact sur le cap.

---

## VD-10 — Trust Score, palier et croissance

- **Titre exact** : VD-10 — Trust Score, palier et croissance
- **Code de suivi des actions** : VD-D11 (actions VD-D11.A01…, questions VD-D11.Q01…)
- **Document d'origine** : 01_Documents/VD-10_TrustScore_Palier_Croissance.pdf, 39 pages, version 1.0 du 24 septembre 2026
- **Découpage** : 3 parties / 25 actions
  - Partie 01 — pages 1 à 12
  - Partie 02 — pages 13 à 25
  - Partie 03 — pages 26 à 39

### Écrans couverts

| Écran | Objectif | Éléments/composants UI principaux | Actions possibles de l'utilisateur |
|---|---|---|---|
| **Mon palier** (Fig.1) | Répondre à « Où j'en suis et comment monter ? » : palier + Trust Score, prochain geste, gain en francs du palier suivant. | Carte nuit (médaille, score, barre vers seuil suivant) ; carte « Pour passer [palier] » (conditions tenues 14 j) ; carte « Ce que vous gagnez » (bande verte, gain en francs) ; ligne « Sanctions et contrôle » ; bloc replié « Comment ça marche ». | Bouton plein « Voir mes commandes à préparer » ; ouvrir « Pourquoi N commandes ? » ; accéder à Sanctions et contrôle. |
| **Mon score** (Fig.2) | Répondre à « Qu'est-ce qui fait bouger mon score ? » : score global + 6 critères détaillés. | Anneau de score ; 2 lignes « monte »/« baisse » ; carte « Vos six critères » (nom, part %, note/100, barre) ; bloc replié « Pourquoi 63 ? » ; bloc replié « Comment ça marche » (barème). | Ouvrir « Pourquoi 63 ? » ; consulter le barème des événements. |
| **Les paliers** (Fig.3) | Répondre à « Que m'apporte chaque palier ? » sur une carte unique. | Une ligne par palier (médaille, nom, conditions, vitesse de libération, support, montant gardé en vert). | Ouvrir « Il vous manque … » → Mon palier ; ouvrir « Comment ça marche ». |
| **Sanctions et contrôle** (Fig.4) | Répondre à « Est-ce que je risque quelque chose ? ». | Carte d'état (verte si RAS) ; bloc « contrôle au ramassage » avec fréquence actuelle ; 4 niveaux de sanction en une ligne chacun ; carte « Historique des décisions » (état vide défini). | Bouton secondaire « Contester une décision » ; ouvrir « Pourquoi 1 sur 20 ? ». |
| **Contester une décision** (Fig.5) | Contester une sanction/descente, une seule fois. | Carte « La décision » (type, date, motif) ; champ obligatoire explication ; zone preuves (photos + ajouter) ; bouton plein « Envoyer ma contestation ». | Rédiger l'explication ; joindre des preuves ; envoyer (une seule fois). |
| **Les plans** (Fig.6, Fig.7) | Répondre à « Quel plan me convient ? ». | Carte plan actuel (bord vert) avec offre de découverte (barre %, compteur) ; réponse du simulateur ; carte « Autres plans » (Boost, Pro, Sur-mesure) ; feuille de confirmation d'essai. | Bouton plein « Comparer avec mes ventes » ; bouton secondaire « Essayer un mois offert » ; confirmer/annuler l'essai. |
| **Le simulateur** (Fig.8) | Dire la vérité : ce que le vendeur garderait ce mois avec chaque plan. | Carte nuit curseur de ventes ; 3 colonnes Free/Boost/Pro avec meilleur cerclé de vert ; carte seuils de remboursement ; bloc replié « Voir le détail ». | Déplacer le curseur ; bouton plein « Rester en Free » → catalogue de visibilité. |
| **Se faire voir** (Fig.9) | Répondre à « Comment me faire voir ? » via un catalogue de visibilité payante toujours étiquetée « Sponsorisé ». | Carte « Offert ce mois » ; carte « Mise en avant 24 h » (bouton plein) ; liste « Autres emplacements » (prix à droite) ; feuille de confirmation de paiement ; bloc « Comment ça marche » / « Les garde-fous ». | Bouton plein « Mettre en avant … » ; payer via feuille de confirmation ; annuler. |
| **Les services qui lèvent les freins** (Fig.10) | Proposer en premier le service qui lève le frein relevé par La demande. | Carte clé (service du frein, prix, note ambre) ; liste « Autres services » ; feuille de confirmation de paiement. | Bouton plein « Demander un agent » ; ouvrir « Demander une fiche » / « Saisie assistée ». |
| **Mes chiffres** (Fig.11) | Lire les 30 derniers jours en une phrase et 4 chiffres expliqués. | Carte nuit (ventes, commandes) ; 4 chiffres en liste (panier moyen, retours, vues, conversion) ; graphique ventes/jour ; note de dépendance à un produit ; ligne cadenas vers plans. | Bouton plein « Voir la demande ». |
| **La demande** (Fig.12) | Montrer la demande non servie de la zone et les freins aux ventes. | Carte clé « Le plus cherché » ; liste « Autres recherches sans résultat » ; liste « Ce qui freine vos ventes » (chaque frein relié à sa solution). | Bouton plein « Ajouter ce produit » ; cliquer un frein → service/visibilité/avis. |

### Tableau des actions (25/25)

| ID | Description courte | Statut (règle-mère) |
|---|---|---|
| VD-D11.A01 | Supprimer le moteur de points et le palier « Diamant » ; moteur Trust Score 6 critères, paliers à **65, 80, 90** (V11, TS55 §15.2) | (PAL-01) |
| VD-D11.A02 | Remplacer « Commission −1 %, −2 % » par le multiplicateur du service de commission, affiché en francs gardés (« 324 F de plus par ITEL ») | (TRU-02 = Décidé) |
| VD-D11.A03 | Accentuer les libellés (fichiers de langue) | (GEN-11) |
| VD-D11.A04 | Afficher les conditions du palier suivant et le prochain geste (GET /tiers next.conditions, orders_to_go) ; bouton vers Commandes | (TRU-01 = Décidé, TRU-05 = Décidé) |
| VD-D11.A05 | Ajouter la ligne « Sanctions et contrôle » (GET /account/status) | (TRU-06 = Décidé) |
| VD-D11.A06 | Gérer la descente proposée (pending_downgrade, tier.downgrade_validated, notification « Palier » avec « Contester ») | (TRU-07 = Décidé) |
| VD-D11.A07 | Afficher la note de chaque critère sur 100 et les points dans « Pourquoi 63 ? » ; codes g1/g2/g3 internes | (SCO-05 = Décidé) |
| VD-D11.A08 | Afficher les paliers en une carte (TierRow) avec montants du service de commission pour l'article de référence | (PAL-04 = Décidé) |
| VD-D11.A09 | Créer l'écran « Sanctions et contrôle » (GET /account/status, texte fixe, historique GET /account/decisions) | (SAN-01 à SAN-06) |
| VD-D11.A10 | Notifier chaque sanction ou descente (sanction.validated, tier.downgrade_validated) avec « Contester » | (SAN-04 = Décidé) |
| VD-D11.A11 | Implémenter le contrôle au ramassage (100 % / 1 sur 20 / 1 sur 100) dans l'application livreur | (calcul C8) |
| VD-D11.A12 | Créer « Contester une décision » (POST /score/appeal, une seule fois, réponse humaine sous 72 h ouvrées) | (CON-01, CON-02 = Décidé) |
| VD-D11.A13 | Remplacer les plans Gratuit/Starter/Pro/Business (20,18,12,10,5 %) par Free/Boost/Pro/Sur-mesure, remise plafonnée (D8) | (PLN-01 = Décidé) |
| VD-D11.A14 | Afficher le prix annuel en francs (price_year) au lieu de « 2 mois offerts » | (PLN-01) |
| VD-D11.A15 | Afficher la réponse du simulateur sur la carte du plan actuel (GET /plans/simulate) + compteur découverte | (PLN-03 = Décidé, PLN-07 = Décidé) |
| VD-D11.A16 | Confirmer l'essai dans une feuille ; paiement MoMo par USSD, activation à payment.confirmed, facture Documents, rien déduit sans accord | (PLN-04 = Recommandé, PLN-05 = Recommandé) |
| VD-D11.A17 | Rappel 3 jours avant fin d'essai et avant chaque renouvellement (notification + SMS) | (PLN-06 = Proposé) |
| VD-D11.A18 | Remplacer le calculateur orienté Pro par le simulateur qui dit la vérité (GET /plans/simulate) | (SIM-01, SIM-02 = Décidé) |
| VD-D11.A19 | Ne pas implémenter « Boost Buy Box » : l'attribution ne s'achète pas | (VIS-01 = Décidé, calcul A4) |
| VD-D11.A20 | Créer le catalogue de visibilité (6 produits, VisibilityRow, POST /visibility, feuille de confirmation, activation à payment.confirmed) | (VIS-01 à VIS-06) |
| VD-D11.A21 | Garantir côté serveur : aucun contenu payé en recherche ; ≤ 1 sponsorisé sur 6 ; pas de visibilité sans stock ni sous 50 | (calculs K1, K3) |
| VD-D11.A22 | Créer l'écran des services (GET /services trié par frein, POST /services/request, remboursement si visite non faite) | (SRV-01 à SRV-03, SRV-03 = Recommandé) |
| VD-D11.A23 | Remplacer heatmap/graphiques vides par « Mes chiffres » (GET /stats?period=30d) et « La demande » (GET /demand) | (CHF-01 à CHF-04 = Décidé) |
| VD-D11.A24 | Trancher avec la v3 client la bande « Sponsorisé » de l'accueil et la mise en avant payante (ou les retirer) | (produit — CL-16 n° 72, question ouverte Q05) |
| VD-D11.A25 | Masquer vente flash offerte et produit vente flash tant que FF-FLASH est fermé au lancement | (VD — CL-16 n° 64-75, question ouverte Q06) |

### Règles métier et calculs clés — CHIFFRES EXACTS

**Paliers et seuils Trust Score (PAL-01)** :
- **Bronze** : KYC (pièce d'identité + selfie validés).
- **Argent** : Trust Score **≥ 65**, **10** commandes livrées, note **≥ 4,0**.
- **Or** : Trust Score **≥ 80**, **50** commandes, note **≥ 4,3**, visite de boutique.
- **Platine** : Trust Score **≥ 90** tenu **6 mois**, audit trimestriel.
- Montée ⇔ seuil franchi **et tenu 14 jours** (règle C4).
- Descente ⇔ score **< seuil − 5** pendant **14 jours** ⇒ validation humaine (descente d'abord « proposée », `pending_downgrade`), contestable **une fois**.
- Palier « Diamant » de l'ancien système **supprimé**.

**Vitesse de libération par palier (PAL-02, cohérent avec VD-09)** :
- **Bronze/Argent : libéré 3 jours** après confirmation client.
- **Or/Platine : libéré 1 jour** après confirmation client.

**Multiplicateurs par palier appliqués à la commission (exemple ITEL AC52 à 20 000 F)** :
- Bronze (référence) : **17 840 F** gardés.
- Argent : × **0,85** ⇒ **18 164 F** (+324 F).
- Or : × **0,70** ⇒ **18 488 F** (+648 F).
- Platine : × **0,60** ⇒ **18 704 F** (+864 F).
- Exemple iPhone à 350 000 F : gain Argent = 14 676 × 0,15 = **2 201 F de plus** (le document signale lui-même une « correction V11 : 3 360 F » — incohérence interne, voir plus bas).
- Formule des commandes restantes : **commandes à faire = max(livrées manquantes ; commandes qui amènent au seuil de score) = max(10−7 ; 3) = 3** (projection ≈ 66).

**Support par palier (PAL-03, statut Proposé)** : 24 h ouvrées (Bronze) → 4 h (Argent) → 2 h (Or) → responsable de compte dédié (Platine).

**Calcul du Trust Score (SCO)** :
- **score = Σ poids(critère) × sous_score(critère)**, six critères, poids : **Ponctualité 25 %, Qualité 20 %, Satisfaction 20 %, Litiges 15 %, Documents 10 %, Ancienneté 10 %** (règle C1).
- Pondération temporelle : **w(événement) = 0,5^(âge_jours ÷ 90)** → **demi-vie de 90 jours** (règle C2).
- Échec pondéré = **w × g**, avec **g ∈ {1, 2, 4}** = échec léger (g1) / moyen (g2) / grave (g3, poids 4).
- Formule du sous-score : **sous_score = (µ·k + 100·Σ w_succès) ÷ (k + Σ w_succès + Σ w·g_échecs)**, avec **µ = 50** (cold start) et **k = 10**.
- **Wilson** utilisé spécifiquement pour le critère **Satisfaction**.
- **Ancienneté = 50 × min(1 ; mois÷12) + 50 × min(1 ; livrées÷100)** — exemple : 18,75 + 3,5 ≈ **22**.
- **Baisse ≤ 8 points au plus par recalcul.**
- **Veto** (contrefaçon, produit interdit, faux document, auto-achat) ⇒ **score ≤ 39** (règle C5).
- Score recalculé **chaque nuit**, jamais modifiable à la main, journal immuable et rejouable (SCO-04).
- **SCO-01** : avis 4-5★ = succès ; 3★ = neutre ; 1-2★ = échec g1.
- **SCO-02** : litige en cours ne compte pas ; litige gagné = neutre ; litige perdu = g1 ou g3 (grave).
- **SCO-03** : inactivité 30 jours → critères gelés, revus à 90 jours.
- Exemple de détail (score 62,7 arrondi à 63) : Ponctualité 25% → note 69,6 → 17,4 pts ; Qualité 20% → 63,5 → 12,7 pts ; Satisfaction 20% → 54,5 → 10,9 pts ; Litiges 15% → 63,3 → 9,5 pts ; Documents 10% → 100 → 10,0 pts ; Ancienneté 10% → 22 → 2,2 pts. Total = **62,7**.
- **SCO-06** : barème affiché = barème V11, y compris « Document expiré » ramène le critère Documents **à zéro**.

**Contrôle au ramassage (SAN-03, calcul C8)** :
- **100 % des 5 premières commandes** contrôlées.
- Si Trust Score **< 70** : **1 commande sur 20** contrôlée.
- Sinon (Trust ≥ 70) : **1 sur 100**.
- **Retour à 100 % si le score chute.**
- Implémenté côté application livreur.

**Niveaux de sanction (4)** :
1. Avertissement (message + motif + gestes pour remonter).
2. Visibilité réduite (« Vos offres passent après celles des autres vendeurs »).
3. Suspension (plus de nouvelles commandes ; **score gelé sous 40**).
4. Exclusion (fraude, contrefaçon, faux document ; appareil, pièce d'identité et Mobile Money **bloqués**).
- **SAN-01** : rétrogradation ou sanction de niveau 2 à 4 **jamais sans validation humaine**.
- **SAN-02** : alerte avant chaque seuil, **une fois par seuil et par semaine** (score.threshold_near).

**Contestation (CON)** :
- **CON-01** : une seule contestation par décision ; réponse humaine **sous 72 h ouvrées**, motivée.

**Plans et tarifs (PLN)** :
- **PLN-01** : **Free** (0 F) · **Boost** 2 500 F/mois (−1 pt) ou 25 000 F/an (10 mois payés) · **Pro** 7 500 F/mois (−2 pts) ou 75 000 F/an · **Sur-mesure** (négocié, dès **1 000 000 F de ventes/mois**, responsable de compte, import catalogue) — remise **plafonnée au prix du plan**.
- Formule bonus : **bonus(plan) = MIN(commission Free × (1 − multiplicateur) ; prix du plan)** (règle D8).
- Seuils de remboursement du plan (simulateur) : **Boost remboursé dès ≈ 463 000 F de ventes/mois** ; **Pro dès ≈ 694 000 F** (catégorie téléphonie, palier Bronze).
- Exemple simulateur à 60 000 F de ventes : gardé Free **53 520 F** (garde le plus), Boost **51 344 F**, Pro **46 668 F** (« pas encore remboursé »).
- **PLN-02** : échec de prélèvement → **7 jours de grâce**, puis retour à **Free sans rien perdre** (statut Proposé).
- **PLN-05** : essai « Aujourd'hui : 0 F » puis prix normal ensuite ; sans confirmation du premier paiement → **retour automatique à Free**.
- **PLN-06** : rappel **3 jours avant** la fin de l'essai et avant chaque renouvellement.
- **PLN-07 / offre de découverte** : « 3 points de plus (3 % du prix) » sur chaque vente ; active tant que **commandes < 50 ET date ≤ 27 novembre** (`ends_on: 2026-11-27`) ; exemple : **9 commandes sur 50 = 18 %**. Fin à la première limite atteinte (commandes OU date).
- **CPT-08 (règle client)** : renouvellement annoncé ; échec = **7 jours de grâce** puis gratuit (cohérent avec PLN-02).

**Simulateur (SIM)** :
- Formule : **gardé(plan) = ventes − (commission Free − bonus) − prix du plan** (règle M01).

**Visibilité (VIS)** :
- **VIS-02** : aucune visibilité si offre en rupture de stock **ou** vendeur sous **50** de Trust Score.
- Condition d'affichage : **offre attribuée ∧ stock > 0 ∧ Trust ≥ 50** (règle A4).
- **K1** : résultats de recherche organiques ∩ contenu payé = **ensemble vide** (rien de payé dans les résultats).
- **≤ 1 emplacement sponsorisé pour 6 cartes** (au plus 1 sur 6).
- **K3** : **10 à 20 %** des emplacements réservés gratuitement aux nouveaux vendeurs.
- Tarifs du catalogue de visibilité (6 produits) : Mise en avant 24h = **500 F** ; boost de catégorie 7 jours = **2 000 F** ; vitrine de quartier 7 jours = **1 500 F** ; boost au résultat = **0 F d'avance**, payé uniquement en cas de vente, coût = **3 % du prix en moins** sur les ventes venues de l'emplacement (exemple : ITEL 20 000 F → **600 F de moins**, 0 F de risque) ; campagne « favoris » = **25 F par client** ; vente flash = gratuite si remise réelle **≥ 10 %**.
- **« Boost Buy Box » explicitement rejeté** : « l'attribution ne s'achète pas » (VIS-01/A4).

**Services qui lèvent les freins (SRV)** :
- Photos par un agent BelivaY : **3 000 F les 10 produits**.
- Fiche prioritaire : **1 000 F**, rédigée sous **24 h** (au lieu de 48 h).
- Saisie assistée : **gratuite** pour les premières boutiques, puis **5 000 F la session**.
- **SRV-03** : service payant par feuille de confirmation, payé comme un plan ; **remboursé si l'agent ne vient pas**.

**Mes chiffres / La demande (CHF)** :
- **CHF-01** : historique **30 jours en Free** ; **3 et 12 mois avec Boost** ; **par offre et par quartier avec Pro** (fonctionnalité verrouillée derrière le plan, ligne « cadenas »).
- Formules : **part(produit) = ventes(produit) ÷ ventes totales** = 700 000 ÷ 820 000 = **85 %** ; **panier moyen = ventes encaissées ÷ commandes encaissées** = 820 000 ÷ 8 = **102 500 F** ; **conversion = commandes encaissées ÷ vues** = 8 ÷ 340 = **2,4 %**.
- Exemple : 30 derniers jours = **820 000 FCFA**, **9 commandes** dont **8 encaissées** ; retours **14 %** ; vues **340**.
- **CHF-02** : aucun nom de client affiché dans La demande (anonymat).
- Free montre les **3 premières** recherches sans résultat ; Boost les montre **toutes**.

### Endpoints API et événements mentionnés

- `GET /tiers` → palier, score exact/arrondi, `next.conditions[{label, have, need, ok}]`, `next.orders_to_go`, `next.keep_gain`, `pending_downgrade{decision_id, to, reason, validated_by, effective_at, appeal_status}`, `tiers[{name, conditions, support}]`, `keep_itel`, `gain`, `release_days`
- Événement `tier.downgrade_validated`
- `GET /plans` → `current.discovery{orders_done, orders_max, ends_on}`, `price_year`
- `GET /score` → `criteria[{name, weight, subscore, points, events_text}]`
- `GET /account/status`
- Composants `C.more`, `TierRow`
- `GET /account/decisions` → `decisions[{id, kind sanction|tier_downgrade, level, decided_at, effective_at, reason, validated_by, appeal{sent_at, text, answer, answer_reason, outcome maintenue|annulée}}]`
- Événement `sanction.validated`
- `POST /score/appeal {decision_id, text, attachments[]}`
- `GET /plans/simulate?sales=` → `best_plan` (anti-rebond 300 ms)
- `POST /plans/subscribe {plan, trial}` → `{status: trial, trial_ends_on, reminder_on, price_month}`
- `payment_request{id, amount, purpose}`, événement `payment.confirmed`
- `POST /visibility {product: feature_24h, offer_id}` → `payment_request`
- Composant `VisibilityRow`
- `GET /services`, `POST /services/request {service: agent_photos, products: 10}`
- `GET /stats?period=30d`
- `GET /demand`
- Route `offre1?q=`

### Erreurs et cas limites mentionnés

- « Historique indisponible pour l'instant. Réessayez dans un moment. »
- « Expliquez en une phrase au moins. » (contestation)
- « Paiement non confirmé. Rien n'a été activé. »
- « Reprendre Boost »
- « Pas de connexion : réessayez dans un moment. »
- Une deuxième contestation sur la même décision est **refusée par le serveur** (une seule autorisée).
- Sans confirmation du premier paiement d'essai → retour automatique à Free.
- Échec de prélèvement → grâce 7 jours puis rétrogradation automatique à Free sans perte.

### Questions ouvertes à trancher (recopiées)

- **VD-D11.Q01** (partie 01) : Palier de lancement des 2 premiers mois selon les produits actifs (VD-03, VD-04 : **Argent ≥ 15, Or ≥ 40, Platine ≥ 80**) contre conditions Trust Score de PAL-01 (Argent 65, Or 80, Platine 90) : préciser l'articulation (le palier de lancement l'emporte-t-il pendant 2 mois ?).
- **VD-D11.Q02** (partie 01) : Support 24 h ouvrées (Bronze) côté vendeur contre première réponse sous 4 h ouvrées côté client (déjà ouvert).
- **VD-D11.Q03** (partie 02) : Notification de renouvellement de plan par SMS (PLN-06) contre la règle VD-02 « SMS payant seulement pour la commande à préparer et le litige » — contradiction à trancher.
- **VD-D11.Q04** (partie 02) : Offre de découverte « 3 points (3 % du prix) » contre × 0,80 sur la commission (déjà ouvert).
- **VD-D11.Q05** (partie 03) : Bande « Sponsorisé » de l'accueil et de la catégorie (VD) alors que la v3 client interdit toute bande sponsorisée au lancement (DEC-03 retirée, CCT-08) — écart majeur (n° 72, déjà ouvert).
- **VD-D11.Q06** (partie 03) : Ventes flash offertes/vendues au vendeur alors que FF-FLASH est fermé (déjà ouvert).
- **VD-D11.Q07** (partie 03) : « Vos ventes 30 jours » 820 000 F (iPhone en litige compris) contre « 53 520 F gardés sur 60 000 F de ventes libérées » : deux bases différentes, à expliciter à l'écran pour éviter la confusion.
- **VD-D11.Q08** (partie 03) : Frein « Bastos (1 500 F de livraison) » : tarif domicile cité pour un client de Bastos alors que le relais de zone coûte 900 F — vérifier l'exemple.

### Contradictions internes / incohérences apparentes (signalées, non résolues)

1. **Écart majeur vs Trust Score V5.5 canonique** : le document cite explicitement « **V11, TS55 §15.2** » et présente un moteur à **6 critères** (Ponctualité 25 %, Qualité 20 %, Satisfaction 20 %, Litiges 15 %, Documents 10 %, Ancienneté 10 %), avec **cold start µ = 50, k = 10**, **Wilson pour Satisfaction seulement**, **demi-vie 90 jours**, **baisse ≤ 8 pts/recalcul**, et **veto ⇒ score ≤ 39**. Ceci correspond largement au canon (µ=50, Wilson, veto≤39) mais avec des détails supplémentaires (poids exacts par critère, formule sous_score avec µ·k, demi-vie 90j, baisse plafonnée à 8 pts) qui **ne figurent pas explicitement dans le résumé disponible de la V5.5** — à comparer ligne à ligne avec le spec canonique pour confirmer la cohérence complète (poids, formule exacte, plafond de baisse).
2. **Seuils de paliers doublement définis et contradictoires** : PAL-01 fixe Argent/Or/Platine à **65/80/90** de Trust Score, mais la question Q01 révèle qu'un « palier de lancement » différent (VD-03/VD-04) utilise **Argent ≥ 15, Or ≥ 40, Platine ≥ 80** pour les 2 premiers mois — deux échelles de seuils incompatibles (65 vs 15, 80 vs 40, 90 vs 80) sans règle d'arbitrage énoncée.
3. **Incohérence chiffrée interne signalée par le document lui-même** : gain Argent sur un iPhone à 350 000 F calculé à **2 201 F** dans le corps du texte, mais une « correction V11 » mentionnée en marge indique **3 360 F** — écart non résolu dans le document source.
4. **Canaux SMS contradictoires** (Q03) : ce document prévoit un SMS de rappel d'essai/renouvellement de plan (PLN-06), alors que VD-02 réserverait le SMS payant vendeur uniquement à la commande à préparer et au litige.
5. **Visibilité sponsorisée vs interdiction côté client** (Q05) : ce document construit tout un catalogue de visibilité payante avec bande « Sponsorisé » sur l'accueil et la catégorie, alors que la v3 côté client interdirait toute bande sponsorisée au lancement (DEC-03 retirée, CCT-08) — écart qualifié de « majeur » par le document.
6. **Deux bases de calcul non réconciliées pour les chiffres vendeur** (Q07) : « ventes 30 jours » (820 000 F, inclut une vente en litige) vs « gardé sur ventes libérées » (53 520 F sur 60 000 F) — pas la même période ni le même périmètre (libéré vs brut), source de confusion potentielle à l'écran.
7. **Pertinent pour le Trust Score V5.5 canonique (cold start µ=50, Wilson, veto≤39)** : ce document vendeur applique en apparence les mêmes constantes (µ=50, veto ≤39) mais ajoute des paramètres non mentionnés dans le résumé canonique fourni (k=10, poids par critère 25/20/20/15/10/10, demi-vie 90 jours, plafond de baisse 8 pts/recalcul, Wilson limité au seul critère Satisfaction). Il faut vérifier si ces paramètres sont bien ceux du V5.5 complet ou une variante antérieure (le guide indique lui-même que le code actuel implémenterait une version plus ancienne, V5.4).

---

## Synthèse transversale (pour vérification ultérieure contre les règles verrouillées BelivaY)

- **Aucune mention de dépôt de garantie ni de tokens** dans les deux documents — cohérent avec la règle verrouillée « no deposit, no tokens (3.5% GMV cap) ». Cependant, aucun des deux documents ne mentionne explicitement le plafond de 3,5 % du GMV ; à vérifier si ce plafond s'applique bien aux montants de remboursement automatique (3 000 F / 10 000 F) et aux bonus de plan.
- **Le délai de libération de l'argent vendeur (VD-09) n'est PAS un J+3 unique** : il varie par palier (Bronze/Argent = 3 j, Or/Platine = 1 j, carte bancaire = 14 j) et intègre un délai potentiel de « retrait + 7 jours » avant le début du décompte — à rapprocher précisément de la règle verrouillée « J+3 = délai de règlement compté depuis l'événement de libération (pas de clawback, pas de J+7 généralisé) ».
- **Livraison toujours payée par le client** : aucun élément dans ces deux documents ne contredit directement cette règle ; les frais de versement (Mobile Money) sont en revanche explicitement mis à la charge de BelivaY (règle D7), ce qui est une charge différente (versement vendeur, pas livraison client).
