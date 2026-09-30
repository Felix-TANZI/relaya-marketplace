# Synthèse — Lot 3 : R3 (REF-PRODUIT) et VD-02

> Méthode : lecture intégrale des deux guides développeur (texte extrait, captures/maquettes exclues). Les chiffres sont recopiés à l'identique des sources, jamais reformulés. Les statuts « Verrouillé/Décidé/Déduit/Proposé » ne sont recopiés que là où le document les indique explicitement ; ailleurs c'est signalé.

---

## 1. R3 — REF-PRODUIT — Référence produit, version courte (source)

**Code de suivi des actions :** REF-D03 (actions REF-D03.A01…A29, questions REF-D03.Q01…Q08)
**Document d'origine :** `BelivaY_Reference_Produit_Petit.pdf`, 67 pages, normatif, 28 sections + annexe (22 maquettes), v1.0 du 19 septembre 2026.
**Découpage :** 5 parties de 14 pages max (Partie 01 p.1-13, Partie 02 p.14-27, Partie 03 p.28-40, Partie 04 p.41-54, Partie 05 p.55-67).
**Nombre d'actions :** 29 (REF-D03.A01 à A29). **Questions ouvertes :** 8 (Q01 à Q08).

### Résumé

REF-PRODUIT est un document **d'archive transverse** (« référence produit v1.0 », datée du 19 septembre 2026) qui couvre l'ensemble du produit BelivaY, pas seulement l'espace vendeur : inscription, découverte/accueil, recherche, fiche produit, panier, confirmation, suivi, retrait au relais, litige, Trust Score client, mes commandes, espace vendeur v1.0, onboarding vendeur, terrain camerounais, notifications push, SMS/WhatsApp, avis, abonnement client, application livreur, annulation, variantes, retour/remplacement, application point relais, console d'administration, liste d'envies, règles transverses, et un inventaire de « manques et arbitrages ». Le guide développeur signale que ce document v1.0 est **antérieur** à une série de décisions plus récentes (REF-CL v3 du 25 septembre, arbitrages des 17/19/21/22/24 septembre) et que la quasi-totalité des 29 actions consistent donc à **vérifier ou corriger** le texte v1.0 contre ces décisions plus récentes, plutôt qu'à l'appliquer tel quel. Le fil rouge : anonymat des sous-commandes vendeur, argent bloqué en escrow jusqu'à réception, contrôle systématique (jamais de saisie manuelle de montant), silence du vendeur qui ne bloque jamais le client, et un design pensé pour le terrain camerounais (illettrisme, réseau instable, WhatsApp contraint).

### Tableau des actions (REF-D03.A01 à A29)

| ID | Description courte | Partie | Statut |
|---|---|---|---|
| REF-D03.A01 | Ne pas reprendre la mosaïque en quinconce (v1.0) ; appliquer la grille régulière arbitrée le 17 sept. | 01 | ☐ (à faire) |
| REF-D03.A02 | Ne pas reprendre le filtre « zone du vendeur » ni le quartier du vendeur sur les cartes ; remplacer par « livrabilité » + distance au relais sans nom | 01 | ☐ |
| REF-D03.A03 | Ne pas refaire la section « autres vendeurs » (v1.0), supprimée depuis le 17 sept. | 01 | ☐ |
| REF-D03.A04 | Vérifier que le classement suit REF-CL (disponibilité/livrabilité → pertinence → coût livré → Trust Score en départage) et non la pondération v1.0 40/20/15/15/10 | 01 | ☐ |
| REF-D03.A05 | Reprendre dans CL-05 les exigences techniques v1.0 si absentes (< 300 ms, < 30 ko, anti-rebond 250 ms, blocs de 20, description non indexée, tolérance 2 caractères) | 01 | ☐ |
| REF-D03.A06 | Ne pas afficher le nom de la boutique dans les sections du panier (v1.0) ; libellé neutre « Boutique A, B, C » | 02 | ☐ |
| REF-D03.A07 | Retirer mention Prime « retrait offert dès 10 000 F », badge « retour 7 jours », mention « paiement à la livraison » | 02 | ☐ |
| REF-D03.A08 | Corriger écarts panier : sections par boutique + code couleur, détail des ramassages, phrase « N colis, un seul code », levée de peur sous le bouton, seuils 30 000/50 000 F | 02 | ☐ |
| REF-D03.A09 | Remplacer « Vendeur nommé et certifié par ligne » par « Vendeur certifié [palier] · Trust Score » sans nom | 02 | ☐ |
| REF-D03.A10 | Vérifier la règle « litige : sans réponse à 48 h » : décision humaine avec présomption client (pas d'arbitrage automatique) | 02 | ☐ |
| REF-D03.A11 | Vérifier que le registre papier en panne (vérification d'identité, régularisation) est décrit côté relais | 02 | ☐ |
| REF-D03.A12 | Ne pas reprendre l'affichage « commission retenue, net » de l'espace vendeur v1.0 ; montrer « vous gardez » | 03 | ☐ |
| REF-D03.A13 | Ne pas reprendre les canaux « WhatsApp forcé » (C2, C3) ni le repli WhatsApp v1.0 ; SMS avec code + lien court, WhatsApp « bientôt » | 03 | ☐ |
| REF-D03.A14 | Remplacer la série de stockage générique v1.0 (franchise, X/Y/W) par la grille du 24 sept. (S0-S5 chiffrés) | 03 | ☐ |
| REF-D03.A15 | Vérifier que le message C10 « avertissement avant libération automatique de l'escrow » existe dans le paquet actuel | 03 | ☐ |
| REF-D03.A16 | Documenter la procédure de diffusion de panne hors système (déclencheur, gabarit, liste exportée, test trimestriel) | 03 | ☐ |
| REF-D03.A17 | Vérifier la règle « vendeur : exception WhatsApp pour escalade » face à V14 (SMS seulement pour commande à préparer et litige) | 03 | ☐ |
| REF-D03.A18 | Supprimer la règle v1.0 « retour sans motif sous 7 jours conservé », son compteur et sa liste d'exclusions | 04 | ☐ |
| REF-D03.A19 | Vérifier que la page Abonnements « en production » est masquée au lancement (interrupteur FF-ABONNEMENT) | 04 | ☐ |
| REF-D03.A20 | Vérifier « ≤ 3 messages payants par commande et par 24 h » face au plafond « 6 SMS par commande » de REF-CL | 04 | ☐ |
| REF-D03.A21 | Vérifier que l'application livreur bloque le départ si le compte de colis est faux, dissociation décidée par le système | 04 | ☐ |
| REF-D03.A22 | Vérifier que le Trust Score livreur est défini (manque v1.0) | 04 | ☐ |
| REF-D03.A23 | Vérifier C2/C3 déclenchés au dernier colis du groupe, et C2a pour les intermédiaires | 04 | ☐ |
| REF-D03.A24 | Ne pas reprendre l'écran « Caisse » ni les plafonds de caisse/reversement (v1.0) ; remplacer par « Montant dû (MoMo sur place) » et « Gains », zéro espèce | 05 | ☐ |
| REF-D03.A25 | Remplacer dans la console les alertes « écarts de caisse / plafonds de caisse » par le type « Relais » (capacité, colis non conforme, fermeture, écart de colis) | 05 | ☐ |
| REF-D03.A26 | Ajouter aux photos à produire les codes W1-W4, A1-A4 et R1 absents de la liste REF-CL 19.5 | 05 | ☐ |
| REF-D03.A27 | Marquer comme tranchés les arbitrages v1.0 désormais décidés (grille de garde 24 sept., encaissement BelivaY, transfert 400 F, Trust Score relais et livreur, retour sans motif supprimé) | 05 | ☐ |
| REF-D03.A28 | Vérifier la structure « espace pays » de tous les paramètres (CEMAC) | 05 | ☐ |
| REF-D03.A29 | Corriger la double numérotation « Section 27 » (règles transverses et manques) | 05 | ☐ |

*Note : le document n'assigne pas de statut V/D/Δ/P propre à chaque action (seule une case à cocher ☐ « non fait » est indiquée) ; les statuts V/D/Δ/P ne sont donnés qu'au niveau des règles citées (ci-dessous), et de façon inégale selon les parties.*

### Règles métier et calculs clés (chiffres exacts)

**Partie 01 — Contexte, inscription, découverte, recherche, fiche**
- Modèle logistique : même zone = part fixe pleine à chaque arrêt + part trajet dégressive ; zones différentes = plein tarif ; gratuité sur la livraison **de base seulement**.
- Recherche v1.0 : tolérance aux fautes **≤ 2 caractères d'écart sur mot > 4 lettres** ; suggestions dès la **2ᵉ lettre** ; formule de classement indicative : **texte 40 %, proximité 20 %, disponibilité 15 %, Trust Score 15 %, preuve sociale 10 %** ; règle dure « prix > 3 × médiane rétrogradé ».
- Contraintes techniques recherche : suggestions **< 300 ms** en 3G, **< 30 ko**, anti-rebond **250 ms**, blocs de **20**, tolérance **2 caractères**, description **non indexée**.
- Panier réel médian cité : **18 000 F**. Un même panier peut coûter **1 000 F ou 3 500 F** selon la dispersion des vendeurs.

**Partie 02 — Fiche, panier, confirmation, suivi, retrait, litige, Trust Score client (début)**
- Seuils livraison offerte (fiche après refonte) : **900 F offert dès 30 000 F**, **1 500 F offert dès 50 000 F**.
- Coût réel d'une remise relais **1 000 F** (v1.0, avec marge) — signalé comme dépassé (voir contradictions).
- Confirmation : délai compte à rebours **< 24 h** sinon date ferme.
- Suivi : 4 états (préparation → récupéré → arrivé → retiré) ; incident non notifié sous **15 min** = gravité 1.
- Litige v1.0 : **48 h** vendeur, « sans réponse, arbitrage en faveur du client » (automatique) ; remboursement auto sous seuil.
- Renvoi de code payant : limité à **3 par commande et par 24 h**.

**Partie 03 — Trust Score client (fin), Mes commandes, Espace vendeur v1.0, Onboarding, Terrain, Push, SMS/WhatsApp**
- Onboarding vendeur en **3 temps** : (1) Ouvrir — nom boutique, numéro vérifié, quartier, **2 minutes** ; (2) Publier — pièce d'identité + numéro MoMo ; (3) Être payé — documents commerciaux complets.
- Catalogue vendeur : ajout produit **< 2 minutes** depuis un téléphone (photos, titre, prix, stock, catégorie).
- Litige côté vendeur : **48 h** de réponse, sinon décision en faveur du client.
- Push : titre **≤ 45** caractères, corps **≤ 120** ; fréquence **5/24 h**, regroupement **10 min**, nuit **21 h-7 h**, promotions **≤ 3/semaine 9 h-20 h** ; criticité 1 non accusée à **10 min** ⇒ repli payant ; indicateur d'alerte livraison **< 95 % sur 1 h** ; délai médian **> 30 s** = alerte.
- Exemple chiffré : commande de **3 000 F** ⇒ commission ≈ **450 F** ; 5 messages payants en consomment le tiers.
- Meta / WhatsApp : à partir du **1er octobre 2026**, messages service/utility hors fenêtre de 24 h deviennent payants.

**Partie 04 — Messagerie (fin), Avis, Abonnement, Livreur, Annulation, Variantes, Retour**
- Messagerie : rafale **≤ 3 messages payants par commande et par 24 h** (hors retrait et OTP) ; validité **C1 6 h, C2 4 h, C3 1 h**.
- Avis : demandés **après le retrait uniquement**, **2 notes séparées** (vendeur / relais), acheteur vérifié, fenêtre de notation limitée.
- Abonnement client (identique REF-CL ch.21) : coût livraison domicile **1 500 F (1 650 F avec marge de sécurité de 10 %)** ; coût livraison relais **900 F (1 000 F avec marge de 10 %)** ; commission moyenne **15 % (12 % en cas défavorable)** ; TVA **19,25 %** ; **5 paliers** ; vérifications chiffrées : **6 300 F / 4 000 F ; +5 500 F ; +26 900 F ; +1 700 F** ; seuil de fréquence **≥ 3 commandes/mois**.
- Seuils sans abonnement : point relais **livraison offerte dès 30 000 F d'achats** (sinon 900 F) ; domicile **dès 50 000 F** (sinon 1 500 F) — écart de **20 000 F**.
- Retour v1.0 (supprimé le 21 sept.) : « retour sans motif sous **7 jours** conservé », trajet gratuit payé par BelivaY, exclusions (alimentaire frais, hygiène/cosmétique ouverte, sur-mesure) ; au-delà de 7 j, celui qui a tort paie.
- Remplacement : délai ferme pour renvoyer, sinon bascule automatique en remboursement ; escrow retenu jusqu'à clôture.
- Changement de relais : gratuit avant collecte ; impossible en tournée ; transfert si déjà arrivé = facturé « au tarif d'une remise relais » (donné ailleurs comme **400 F**, voir plus bas).

**Partie 05 — Application relais (fin), Console, Liste d'envies, Règles transverses, Manques**
- Relais v1.0 (écran Caisse, remplacé) : alerte au plafond de caisse — plafonds non chiffrés dans le texte extrait.
- Console : rôles = **4** (Support, Opérations zone, Finance, Direction) ; paramétrage avec simulation **30 jours** avant application.
- Liste d'envies : mode groupé — date cible obligatoire, **plafond absolu 21 jours après le premier cadeau payé** ; aucun frais de stockage pendant le groupage ; validité du lien **7, 30 ou 90 jours**.
- Transfert de colis vers un nouveau relais : « transfert **400 F** » cité dans l'action A27 comme arbitrage désormais tranché (le prix exact n'apparaît que là, pas dans le corps de la partie 05 elle-même).
- Arbitrages en attente listés : **28** ; manques développeurs : **5**.
- Codes d'image d'annexe : **P1-P4, H1-H9, S1-S3, C1-C3, W1-W4, M1-M5, V1-V2, A1-A4, G1, L1, R1, B1-B2** ; marge **10 %**.

### Endpoints API et événements mentionnés

Ce document est un référentiel **produit/UX**, pas une spécification technique : **aucun endpoint REST ni nom d'événement système n'est cité dans le texte extrait**. Les seuls identifiants techniques présents sont des noms de règles/catégories internes (ex. C1, C2, C2a, C3, C4, C10, C11, S1-S5, A1-A4, FF-ABONNEMENT comme interrupteur de fonctionnalité) — pas des routes API.

### Questions ouvertes à trancher (recopiées)

- **REF-D03.Q01** (partie 01) : REF-PRODUIT v1.0 (19 sept.) est antérieur à REF-CL v3 (25 sept.) : appliquer les décisions plus récentes (grille, livrabilité, « autres vendeurs » supprimé).
- **REF-D03.Q02** (partie 01) : Indexation de la description : v1.0 « non indexée » vs REF-CL 5.5 « indexer titre, description… » — à trancher.
- **REF-D03.Q03** (partie 02) : Coût d'une remise relais « 1 000 F » (v1.0, avec marge) vs remise relais 400 F / base 900 F (REF-CL 22 sept.) : v1.0 dépassé.
- **REF-D03.Q04** (partie 02) : Paiement « à la livraison » (v1.0) vs paiement au comptoir électronique « Validée », zéro espèce (v2.0).
- **REF-D03.Q05** (partie 03) : Préavis Meta (1er oct. 2026) : impact sur le support WhatsApp humain « gratuit au lancement » (REF-CL 15.2) à réévaluer.
- **REF-D03.Q06** (partie 04) : Retour sans motif : v1.0 (19 sept.) le conserve, REF-CL/REF-VD (21 sept.) le suppriment — appliquer le 21 sept.
- **REF-D03.Q07** (partie 04) : Plafond de messages payants : 3 par 24 h (v1.0) vs 6 par commande (REF-CL) — à unifier.
- **REF-D03.Q08** (partie 05) : Canal de la liste d'envies « WhatsApp en premier » (v1.0) : partage depuis le téléphone du client, compatible avec « pas d'API WhatsApp » — à confirmer dans CL-14.

### Contradictions internes ou incohérences apparentes

- Toutes les questions ouvertes Q01-Q08 ci-dessus sont, par construction, des contradictions **entre la v1.0 de ce document et des décisions plus récentes** (REF-CL v3, arbitrages datés).
- **Litige silence vendeur** : la partie 02 décrit une règle v1.0 « sans réponse, **arbitrage en faveur du client** » présentée comme automatique, alors que l'action REF-D03.A10 (même document) demande de vérifier qu'il s'agit d'une **décision humaine avec présomption client, jamais d'arbitrage automatique** — contradiction interne non résolue par le guide lui-même, seulement signalée comme action de vérification.
- **Numérotation** : la « Section 27 » apparaît deux fois (Règles transverses, puis Manques et arbitrages) — reconnu comme défaut de l'archive (action A29), pas corrigé dans le corps du texte.
- **Abonnement** : chiffres identiques à REF-CL cités deux fois avec deux variantes de commission (15 % vs « 12 % en cas défavorable ») sans préciser dans le texte extrait ce qui déclenche le cas défavorable.
- Le guide qualifie REF-PRODUIT de « document d'archive, pour mémoire » (action A29) tout en listant 29 actions dessus : à traiter comme un audit de conformité plutôt que comme une spécification à implémenter telle quelle.

---

## 2. VD-02 — Données, argent, calculs, droits et API

**Code de suivi des actions :** VD-D03 (actions VD-D03.A01…A09, questions VD-D03.Q01…Q05)
**Document d'origine :** `VD-02_Donnees_Argent_Calculs_Droits_API.pdf`, 13 pages, v1.0 du 24 septembre 2026, 8 sections.
**Découpage :** 1 seule partie (Partie 01, pages 1 à 13).
**Nombre d'actions :** 9 (VD-D03.A01 à A09). **Questions ouvertes :** 5 (Q01 à Q05).

### Résumé

VD-02 est le **socle technique commun** de tout l'espace vendeur : il fixe le jeu d'essai de référence (boutique « Tonton PG »), le modèle de données, le cycle de vie d'une commande côté vendeur, la formule complète de calcul de la commission officielle et du montant gardé par le vendeur, les délais de libération et de versement de l'argent, les droits d'accès par rôle (propriétaire vs préparation), les règles de notifications et de fonctionnement hors connexion, la liste exhaustive des paramètres de console modifiables sans redéploiement (avec leur statut Décidé/Proposé/Recommandé), et un référentiel d'endpoints API REST. C'est le document le plus dense en chiffres exacts et en identifiants techniques des deux traités ici. Il porte un point ouvert explicite pour le back-end : trois valeurs de commission du jeu d'essai ne sont pas reproductibles par le barème documenté seul, et cinq questions non bloquantes opposent des règles « Décidées » côté vendeur à des règles encore « à trancher » côté client (silence du vendeur, trajet retour, délai de remplacement, délais de support par palier).

### Tableau des actions (VD-D03.A01 à A09)

| ID | Description courte | Statut |
|---|---|---|
| VD-D03.A01 | Valider le service de commission sur les 9 valeurs de référence avant production ; retrouver les 3 valeurs M01/M06 non reproduites par le barème seul (iPhone 12 950/10 360 F au lieu de 14 676 F ; pagne 16 540 F au lieu de 16 400 F ; panier 1 950 F au lieu de 2 011 F) — point ouvert p6 | ☐ (à faire) |
| VD-D03.A02 | Figer au paiement le montant gardé (palier, catégorie, plan, offre) et prélever la commission à la libération (prorata si partiel) | ☐ |
| VD-D03.A03 | Ne jamais exposer de champ d'identité du client dans l'API vendeur | ☐ |
| VD-D03.A04 | Calculer et contrôler « en circulation » ; alerte en cas d'écart | ☐ |
| VD-D03.A05 | Implémenter la file hors connexion (72 h, heure et lieu d'origine, expiration) | ☐ |
| VD-D03.A06 | Aligner la règle « silence du vendeur ⇒ arbitrage en faveur du client » sur la v3 : « présomption en faveur du client ; BelivaY décide » | ☐ |
| VD-D03.A07 | Aligner la chronologie du litige (médiation 48 h, senior 3 j, contestation) avec la décision attendue côté client | ☐ |
| VD-D03.A08 | Trancher la « mise en avant 500 F » (bande « Sponsorisé ») avec la v3 client | ☐ |
| VD-D03.A09 | Corriger les écrans selon V11 : +324 F (Argent), +2 201 F (iPhone), 71 360 F, « Se libère » en orange | ☐ |

*Note : comme pour R3, les actions elles-mêmes ne portent qu'une case ☐ ; les statuts V/D/Δ/P sont donnés au niveau des règles (voir ci-dessous), où VD-02 est nettement plus systématique que R3 : presque chaque règle et chaque paramètre de console porte un tag explicite (Décidé / Proposé / Recommandé / Δ implicite).*

### Règles métier et calculs clés (chiffres exacts)

**Commission (Décidé, barème Proposé en console)**
- `com_article = Σ tranches (taux × part du prix)`.
- Tranches familles A, B, D : **0-20 000 / 20 000-100 000 / 100 000-500 000 / au-delà**. Tranches familles C, E : **0-10 000 / 10 000-50 000 / au-delà**. Sans plafond.
- Taux par tranche (palier Bronze) : famille A **13,5 % · 5 % · 2,5 % · 2 %** ; famille B **23,5 % · 18,5 % · 13,5 %** ; famille C **7,5 % · 6 % · 5 %** ; famille D **15 % · 11,5 % · 8,5 %** ; famille E **12,5 % · 9 %**.
- Familles : A Gros tickets (Électronique, Électroménager, avec un jeu de taux distinct cité **40 % · 15 % · 8 % · 6 %**) ; B Marges larges (Mode, Beauté) ; C Fréquence (Supermarché, Frais & Premium) ; D Marges moyennes (Maison, Sport, Bébé, Animaux) ; E Petits prix (Livres & Médias).
- Multiplicateurs de palier (Décidé) : **Bronze × 1 · Argent × 0,85 · Or × 0,70 · Platine × 0,60**.
- Offre de découverte (Recommandé) : **× 0,80** pendant **min(3 mois ; 50 commandes encaissées et non remboursées)**, dès la première commande payée.
- Plans (Décidé) : **Boost −1 point**, **Pro −2 points** ; remise du mois **≤ prix du plan** (D8).
- Bonus/malus points : prix **< 5 000 F ⇒ +3 points** ; « Made in Cameroon » **⇒ −2 points**.
- `com_commande = MAX(700 F ; 2 % du prix ; marge minimale BelivaY ; Σ com_article)` ; marge minimale **200 F ou 0,5 % du panier** (livraison offerte).
- TVA `= τ × com_commande`, **τ = 0 % puis 19,25 %** (bascule annoncée **30 jours** avant, jamais rétroactive).
- `gardé = prix − com − TVA`, arrondi au franc, **figé au paiement** ; commission prélevée **à la libération** ; annulée si remboursement total, **au prorata** si partiel ; le plancher de 700 F **n'est pas appliqué** après remboursement partiel.

**Vérification chiffrée sur le jeu d'essai**
- ITEL AC52 **20 000 F → commission 2 160 F (10,8 %) → gardé 17 840 F**.
- 21 000 F → **2 200 F**, gardé **18 800 F**. 18 900 F → **2 041 F**, gardé **16 859 F**. Palier Argent → **1 836 F**, gardé **18 164 F**.
- Téléphone **150 000 F → 7 950 F (5,3 %) → 142 050 F**.
- Chargeur **5 000 F → plancher 700 F (14 %) → 4 300 F**.
- iPhone 15 Pro Max **350 000 F → 14 676 F (4,2 %) → 335 324 F** (référence M01/M06).
- Pagne **84 000 F → 16 400 F (19,5 %) → 67 600 F** (référence M01).
- Panier Supermarché **30 000 F → 2 011 F (6,7 %) → 27 989 F**.
- **Point ouvert p6 (back-end)** : le barème seul, appliqué à ces mêmes valeurs, donne **12 950 F ou 10 360 F** (au lieu de 14 676 F pour l'iPhone), **16 540 F** (au lieu de 16 400 F pour le pagne) et **1 950 F** (au lieu de 2 011 F pour le panier) — écart non expliqué, à instruire avant mise en production (action A01).
- Corrections reportées de V11 : Argent = **+ 324 F** par ITEL (pas 600 F) ; iPhone **+ 2 201 F** (pas 3 360 F) ; « Gagné » **71 360 F** (pas 66 400 F) ; libellé « Se libère » en **orange**, pas en bleu.

**Délais, libération, versement (Décidé)**
- Échéance de préparation = début **+ 4 h ouvrées** (ou délai de fiche, jusqu'à **7 jours** sur commande) ; début = paiement ou ouverture suivante (E10) ; **échéance absolue 24 h** (E4).
- `t_fermeture = min(confirmation client ; retrait + 7 jours)`.
- Libération après fermeture : **+ 3 jours** (Bronze, Argent) ; **+ 1 jour** (Or, Platine) ; **+ 14 jours** (paiement par carte).
- Exemple : BLV-00007 confirmée vendredi 18 à 18 h ⇒ libérée **lundi 21 à 18 h**.
- Versement = Σ des montants libérés non versés avec `t_libération ≤ jeudi 23 h 59` ; **versé le vendredi avant 12 h** ; en cas de refus : **3 essais à 24 h d'intervalle**, puis passage au support.
- Contrôle « en circulation » = à verser + se libère + en cours + gelé ; tout écart ⇒ **alerte**, jamais de chiffre faux affiché.

**Litige et retour (Décidé)**
- Litige : limite = ouverture **+ 48 h** ; silence du vendeur ⇒ **arbitrage en faveur du client** ; médiation **≤ 48 h**, escalade senior **≤ 3 jours**, contestation **une fois**.
- Retour : inspection **≤ réception + 48 h**, sinon remboursement automatique ; remplacement **≤ 72 h ouvrées** après l'accord.

**Droits d'accès (Décidé)**
- Rôle **préparation** : peut préparer, voir le code de remise, le stock et les photos, répondre aux litiges, inspecter, fermer la boutique pour la journée.
- Rôle **propriétaire seul** : prix/publication, argent, numéro de versement (**second facteur** requis), gestion des accès (**second facteur**), horaires, emplacement, plans, visibilité, paramètres.

**Notifications (Décidé)**
- SMS payant réservé à : **commande à préparer** et **litige** uniquement. Jamais de promotion par SMS. Jamais de code ni de montant sensible dans un push. Rien envoyé entre **22 h et 7 h**, sauf urgence.

**Hors connexion (Décidé)**
- Cache chiffré **IndexedDB**, file signée (heure et lieu d'origine), **72 h au plus** puis expirée.

**Paramètres de console — valeurs et statuts explicites**
- Planchers de commission **700 F · 2 % · marge 200 F ou 0,5 %** — statut **(D)**.
- Barème de commission — statut **(P)**. Multiplicateurs de palier — **(D)**. Offre de découverte — **(R)**. Libération — **(D)**.
- Délai de préparation **4 h · 24 h · 7 j** — **(D)**. Litige/retour **48 h · 48 h · 72 h ouvrées · 500 F trajet** — **(D)**.
- Remboursement automatique **3 000 / 10 000 F** — **(D)**. Plafond de valeur **75 000 / 250 000 F, Or sans plafond** — **(D)**.
- Plafond de démarrage **500 000 F jusqu'à 10 commandes livrées sans incident** — **(P)**.
- Plans : **Boost 2 500 F**, **Pro 7 500 F**, **annuel = 10 mois**, **grâce 7 jours** — **(D)**.
- Visibilité : **mise en avant 500 F**, **boost catégorie 2 000 F**, **vitrine 1 500 F**, **favoris 25 F** — **(P)**.
- **3 accès employés** — **(P)**. Fermeture programmée annoncée **48 h** — **(P)**. Préavis de changement **30 jours, jamais rétroactif** — **(D)**.
- Gabarits : **5 classes**, poids facturé = `max(poids ; volume ÷ 5 000)` — **(P)**.
- Prix conseillé **≤ prix tapé** ; **1 rappel/semaine** ; ajustement auto **−3 %/semaine max**, jamais sous le plancher — **(P)**.
- Générosité **≤ 25 % puis 15 %** de la contribution brute (M05) — **(P)**.
- Ancienneté (score) = `50 × min(1 ; mois ÷ 12) + 50 × min(1 ; livrées ÷ 100)` — **(P)**.
- Écart de prix en rupture **5 %** payé par BelivaY — **(P)**.
- Remise d'abonnement : **Boost 5 %**, **Pro 10 % plafonnée au prix** — **(R, VD-12 arbitrage n°14)**.
- Échec de paiement d'un plan : **7 jours** puis rétrogradation vers Free — **(P)**.
- Contrôle qualité au ramassage : **100 % des 5 premières commandes** ; puis **1/20 si Trust Score < 70**, **1/100 sinon** ; retour à **100 %** en cas de chute — **(D)**.
- Alerte de score : **3 points avant un seuil**, **une fois par seuil et par semaine** — **(P)**.
- Délais de support par palier : **24 h ouvrées (Bronze) · 4 h (Argent) · 2 h (Or) · responsable de compte dédié (Platine)** — **(P)**.
- **Six états** de produit d'occasion/condition (neuf, neuf sans emballage, reconditionné, occasion comme neuf, bon état, état correct) — **(P)**.

### Modèle de données (entités évoquées)

Le texte extrait ne contient **pas** le détail complet du schéma « entités Django / PostgreSQL » annoncé en page 3 (probablement un diagramme/tableau fourni en capture, stripé de l'extraction). Les entités et champs suivants sont néanmoins reconstituables à partir du jeu d'essai et des sections adjacentes :

| Entité (déduite) | Champs / attributs cités dans le texte |
|---|---|
| **Boutique / vendeur** | nom interne, nom d'utilisateur (`@Penga12`), statut (« particulier sans RCCM »), zone (Z4), quartiers (Mvog-Mbi / Mvog-Ada), repère textuel (« face à la pharmacie du carrefour »), coordonnées GPS (3,652° N · 11,517° E), horaires d'ouverture (lun-ven 08 h-18 h, sam 08 h-14 h, dim fermé), créneau livreur (lun-ven 14 h-16 h, sam 11 h-13 h), palier (Bronze), Trust Score (63 / 62,7 précis), plan (Free), statut offre découverte (date de fin ou nombre de commandes), numéro de versement MoMo (masqué, « ···· 4217 »), date de vérification du versement |
| **Équipe / membre** | nom, rôle (propriétaire / préparation) — ex. Franck Penga (propriétaire), Aïcha N. (préparation) |
| **Commande** (identifiant `BLV-nnnnn`) | statut (payée, payable au retrait, à préparer, chez le livreur, livrée, litige-gelé, en retour-gelé, annulée), montant, montant gardé, échéance, motif de litige (ex. `wrong_product`, `damaged`), date limite de traitement, livreur assigné |
| **Argent / solde vendeur** | montant « à verser », « se libère », « en cours », « gelé », « en circulation » (somme des 4), montant « versé » |
| **Versement** (identifiant `BLV-VS-nnnn`) | statut (prévu, envoyé, crédité, refusé, suspendu) |
| **Alerte** | identifiant (`/seller/alerts/{id}`), type, seuil de score (`score.threshold_near`) |
| **Stock** | référence produit, quantité en stock, seuil bas (ex. `o_itel_nr 3 / seuil 5`) |

### Cycle de vie d'une commande côté vendeur

D'après les statuts listés en section « États de l'argent »/« Statuts » (couleurs incluses), l'ordre logique reconstitué est :

1. **Payée** (vert) — ou *Payable au retrait* (ambre) si paiement au comptoir (cas E3)
2. **À préparer** (orange)
3. **Chez le livreur** (encre)
4. **Livrée** (vert)
5. *Branches d'exception, à tout moment après paiement :* **Litige — gelé** (rouge) · **En retour — gelé** (rouge) · **Annulée** (encre)

En parallèle, l'état de l'**argent** associé à la commande suit : **En cours** (ambre) → **Se libère** (orange) → **À verser** (vert) → **Versé** ; avec état dérivé **Gelé** (rouge) en cas de litige/retour, et **Repris** (rouge) en cas de remboursement après libération.
Règle d'entrée dans l'espace vendeur (Décidé) : une commande n'apparaît que **payée**, ou **validée pour un paiement au comptoir** (cas E3). Une annulation client avant ramassage n'a **aucun effet sur le Trust Score**.

### Endpoints API et événements mentionnés

**Endpoints REST cités (Django REST) :**
`/auth/*`, `/shops`, `/shops/{id}/kyc`, `/contract/sign`, `/assisted-entry`, `/seller/today`, `/seller/onboarding`, `/account/status`, `/orders…`, `/disputes…`, `/returns…`, `/offers…`, `/catalog/search`, `/sheet-requests`, `/money/*`, `/documents`, `/payouts?period=3|12|tout`, `/payouts/{id}/incident`, `/payout-number`, `/seller/alerts/{id}/dismiss`, `/account/decisions`, `/score`, `/tiers`, `/score/appeal`, `/plans`, `/plans/simulate`, `/plans/subscribe {plan, trial}`, `/visibility`, `/services/request`, `/services`, `/stats`, `/demand`, `/shop…`, `/shop/closed-today`, `/shop/closures`, `/shop/location`, `/shop/members`, `/me`, `/devices`, `/notifications`, `/reviews`, `/reviews/{id}/private-reply`, `/threads`, `/threads/{id}/messages`, `/me/password`, `/me/export`, `/me/corrections`, `/account/close`.

**Événements / clés non-REST cités :** `payment.confirmed`, `score.threshold_near`.

**Fuseau horaire de référence :** `Africa/Douala`.

**Exemple documenté — `GET /seller/today`** (extrait du jeu d'essai) :
- `open until 18:00` ; `courier 14:00-16:00` ; `bronze 63 free discovery` ; compteurs `prepare 2, disputes 2, returns 1, total 5`.
- `BLV-00008` due 12:42, 174 min, ITEL AC52 NOIR·S, 20 000 F, gardé 17 840 F, livreur Serge M.
- `BLV-00009` due 13:05, cod (paiement au comptoir).
- `BLV-00005` limite 22 sept. 05:30, gelé 335 324 F, motif `wrong_product`.
- `BLV-00006` limite 23 sept. 06:02, motif `damaged`.
- `BLV-00004` retour, arrivée prévue 22 sept. 14:00/16:00, gelé 17 840 F.
- Stock bas : `o_itel_nr` 3 unités / seuil 5.

### Questions ouvertes à trancher (recopiées)

- **VD-D03.Q01** (partie 01) : Silence du vendeur : « arbitrage en faveur du client » (VD) contre « présomption, BelivaY décide » (v3).
- **VD-D03.Q02** (partie 01) : Trajet retour 500 F « Décidé » côté vendeur, « À trancher » côté client (RET-TRAJET).
- **VD-D03.Q03** (partie 01) : Remplacement 72 h ouvrées « Décidé » côté vendeur, « À trancher » côté client (RET-REMPL-DELAI).
- **VD-D03.Q04** (partie 01) : Délais du support vendeur par palier (24 h / 4 h / 2 h) contre 4 h ouvrées côté client.
- **VD-D03.Q05** (partie 01) : Trois valeurs de référence de commission non retrouvées par le barème.

### Contradictions internes ou incohérences apparentes

- **Q01-Q04** ci-dessus sont des contradictions explicites **entre la version vendeur (VD) et la version client (v3)** du même sujet : silence du vendeur (arbitrage automatique vs présomption + décision BelivaY), trajet retour 500 F (Décidé vs à trancher), délai de remplacement 72 h ouvrées (Décidé vs à trancher), délais de support (paliers vendeur 24h/4h/2h vs 4h ouvrées uniforme côté client).
- **Q05 / action A01** : incohérence arithmétique non résolue entre le barème documenté et 3 des 9 valeurs de vérification du jeu d'essai (écarts de l'ordre de **1 700 à 3 600 F** selon l'article) — signalé comme point ouvert pour le back-end, pas comme bug déjà résolu.
- **Commission famille A** : deux jeux de taux différents apparaissent pour la même famille « A Gros tickets » — un jeu générique **40 % · 15 % · 8 % · 6 %** dans le résumé des familles, et un jeu détaillé par tranche pour le palier Bronze **13,5 % · 5 % · 2,5 % · 2 %** dans le tableau des taux par tranche. Le document ne précise pas explicitement le lien entre ces deux séries de chiffres (le premier pourrait être un taux plafond nominal, le second le taux réellement appliqué par tranche) — à clarifier avant implémentation du barème.
- **Corrections V11 non appliquées** (action A09) : les écrans actuels afficheraient encore des valeurs erronées (+600 F au lieu de +324 F pour Argent, +3 360 F au lieu de +2 201 F pour iPhone, 66 400 F au lieu de 71 360 F pour « Gagné », couleur bleue au lieu d'orange pour « Se libère ») — écart entre le front actuel et les calculs validés.
- Le lien avec CL-16 n°32/33/72 et VD-12 arbitrage n°14 indique que plusieurs paramètres « Décidés » côté vendeur restent en réalité **conditionnés à un arbitrage transverse non encore acté** au moment de la rédaction du guide.

---

## Synthèse croisée R3 / VD-02

- Les deux documents partagent une tension identique : une **version « vendeur » figée** (VD-02, ou l'espace vendeur v1.0 dans R3) qui n'est pas toujours alignée avec la **version « client » plus récente** (v3 / REF-CL). Les deux guides listent des paires de règles « Décidé côté X, à trancher côté Y » sur les mêmes sujets : silence du vendeur en litige, délai de remplacement/trajet retour, plafond de messages payants.
- R3 est un document produit/UX daté du **19 septembre**, largement dépassé par des arbitrages du **17 au 25 septembre** ; VD-02 est daté du **24 septembre** et se positionne déjà par rapport à une **« v3 »** plus récente sur les mêmes points de litige — suggérant que la chronologie exacte des versions (v1.0 → 17/19/21/22/24 sept. → v3 du 25 sept.) doit être reconstituée avant tout arbitrage définitif.
- VD-02 est le document qui porte la charge technique (API, modèle de données, formules) pour l'espace vendeur ; R3 ne contient aucun endpoint ni événement système — il est purement normatif/produit.
