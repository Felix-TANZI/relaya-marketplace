# Suivi des actions, une à une

840 actions et 331 questions ouvertes tirées de « 00 — Liste complète des actions — Espace client » (`actions.json`). Remplacez ☐ par ☑ quand une action est faite. Le détail de chaque action, ses règles et ses captures sont dans le guide développeur du document (`00 — Guide développeur — …`).

## Sommaire

| N° | Document | Actions | Questions ouvertes |
|---|---|---|---|
| R1 | [REF-CL](#r1--ref-cl) | 81 | 20 |
| R2 | [REF-VD](#r2--ref-vd) | 64 | 24 |
| R3 | [REF-PRODUIT](#r3--ref-produit) | 29 | 8 |
| R4 | [REF-COMMISSION](#r4--ref-commission) | 5 | 2 |
| 01 | [CL-00](#01--cl-00) | 11 | 12 |
| 02 | [CL-01](#02--cl-01) | 33 | 22 |
| 03 | [CL-02](#03--cl-02) | 31 | 21 |
| 04 | [CL-03](#04--cl-03) | 26 | 16 |
| 05 | [CL-04](#05--cl-04) | 14 | 10 |
| 06 | [CL-05](#06--cl-05) | 13 | 6 |
| 07 | [CL-06](#07--cl-06) | 18 | 13 |
| 08 | [CL-07](#08--cl-07) | 17 | 10 |
| 09 | [CL-08](#09--cl-08) | 25 | 13 |
| 10 | [CL-09](#10--cl-09) | 56 | 22 |
| 11 | [CL-10](#11--cl-10) | 43 | 14 |
| 12 | [CL-11](#12--cl-11) | 56 | 18 |
| 13 | [CL-12](#13--cl-12) | 32 | 9 |
| 14 | [CL-13](#14--cl-13) | 50 | 16 |
| 15 | [CL-14](#15--cl-14) | 54 | 16 |
| 16 | [CL-15](#16--cl-15) | 61 | 17 |
| 17 | [CL-16](#17--cl-16) | 121 | 42 |
| | **Total** | **840** | **331** |

## R1 · REF-CL

R1 — REF-CL — Spécification complète de l’espace client (source) — dossier : 01_Documents / 0 — Références communes (sources transverses, incluses dans chaque paquet) / R1 — REF-CL — Spécification complète de l’espace client (source)

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| REF-D01.A01 | 01 | Supprimer toute mention de « 3 jours gratuits » de garde et appliquer la grille 0/100/100/200/200/400/400 F + 500 F de renvoi (max 1 400 / 1 900 F) — tous documents, captures et prototypes client, relais, admin — décision 24 sept. qui prime. | ☐ |
| REF-D01.A02 | 01 | Vérifier que le choix du relais ne propose que le relais de la zone et que les délais affichés visent < 5 h — CL-03/CL-07/CL-08/CL-12 et prototype client — décision 25 sept. | ☐ |
| REF-D01.A03 | 01 | Vérifier que le regroupement ne s’applique qu’aux colis relais et que le domicile part seul — CL-02/CL-07, ENT, LIV — décision 25 sept. | ☐ |
| REF-D01.A04 | 01 | Vérifier la mention des emballages S, M, L, C1, C2 et du scellé par le livreur dès J1 — LIV, ENT, VD — décision 25 sept. | ☐ |
| REF-D01.A05 | 01 | Vérifier que les nouveautés (rentrée, cotisation, mise de côté, troc, panier famille, WhatsApp IA) sont derrière interrupteur « après lancement » — CL-14/CL-15 — décision 24 sept. | ☐ |
| REF-D01.A06 | 01 | Vérifier livraison relais 900 F (500 + 400), gratuité dès 30 000 F relais / 50 000 F domicile, 2 % carte — CL-06/CL-07/CL-08, captures panier/fiche/paiement — décision 22 sept. | ☐ |
| REF-D01.A07 | 01 | Vérifier « Autres vendeurs » supprimé et plafond 5-6 SMS par commande — CL-06, CL-10 — décision 17 sept. | ☐ |
| REF-D01.A08 | 01 | Vérifier la conformité des machines à états (commande, colis, escrow) avec CL-02 et ADM-02 — cohérence inter-interfaces. | ☐ |
| REF-D01.A09 | 02 | Remplacer tout repère « Retour 7 j · Sans discuter » par « Retour gratuit · si problème validé » — CL-03 premier lancement, captures et prototype client — décision 21 sept. | ☐ |
| REF-D01.A10 | 02 | Vérifier que le premier lancement tient en ≤ 3 écrans avec langue FR/EN et étape « centres d’intérêt » passable — CL-03 — décision 20 sept. | ☐ |
| REF-D01.A11 | 02 | Vérifier que le mot de passe oublié passe par e-mail (jamais SMS) et que le changement de numéro exige 2 OTP et régénère les codes de retrait — CL-03/CL-13. | ☐ |
| REF-D01.A12 | 02 | Masquer l’encart « Retrait offert dès 10 000 F · Prime » sur l’accueil au lancement — CL-04, captures accueil, prototype — ch. 21. | ☐ |
| REF-D01.A13 | 02 | Supprimer tout compteur écrit en dur (ex. « 3 400 produits ») et brancher les compteurs sur la base — CL-04 et captures — défaut connu. | ☐ |
| REF-D01.A14 | 02 | Vérifier grille régulière unique dans le listing (plus de quinconce) et tri par défaut « Pertinence » — CL-04, captures listing — arbitrage 17 sept. | ☐ |
| REF-D01.A15 | 02 | Vérifier qu’aucune carte ne montre nom ou choix de vendeur — CL-04/CL-05/CL-06 — anonymat et attribution. | ☐ |
| REF-D01.A16 | 02 | Vérifier la matrice de visibilité face aux documents VD, LIV, PR, ADM (ex. livreur = prénom seulement à domicile, rien en relais) — cohérence inter-interfaces. | ☐ |
| REF-D01.A17 | 03 | Supprimer la section « Autres vendeurs » et les boutons « Choisir » — CL-06, captures fiche, prototype — décision 17 sept. | ☐ |
| REF-D01.A18 | 03 | Retirer l’encart « Avec Prime… » et le badge/tuile « Retour 7 jours · remboursé sous 72 h » de la fiche — CL-06, captures — ch. 21 et décision 21 sept. | ☐ |
| REF-D01.A19 | 03 | Ajouter/vérifier le sélecteur de variantes (rupture grisée, barrée, alerte) — CL-06, prototype. | ☐ |
| REF-D01.A20 | 03 | Afficher sur la fiche les deux modes avec délai, tarif, seuil et supplément de classe (900 F/30 000 F ; 1 500 F/50 000 F) — CL-06 — décision 22 sept. | ☐ |
| REF-D01.A21 | 03 | Remplacer la famille de filtres « Zone du vendeur » par « Livrabilité » — CL-05, captures filtres. | ☐ |
| REF-D01.A22 | 03 | Vérifier que les filtres vides sont grisés et que les filtres n’apparaissent qu’après recherche — CL-05. | ☐ |
| REF-D01.A23 | 03 | Vérifier que « Poser une question au vendeur » ouvre la messagerie interne, jamais WhatsApp — CL-06/CL-10. | ☐ |
| REF-D01.A24 | 03 | Vérifier le bloc « Tu cherchais autre chose ? » et la journalisation search.no_result côté console — CL-05, ADM (journal recherche). | ☐ |
| REF-D01.A25 | 03 | Vérifier l’écran de publication vendeur : contrôle de langue FR et message « Décris le produit avec tes mots… » — VD-08, ADM-07 (modération). | ☐ |
| REF-D01.A26 | 04 | Remplacer partout la remise relais 900 F / base 1 400 F par Rem_relais 400 F / base 900 F — fiche, panier, notifications, écran du gérant (CL-06/07/08/10, PR-05, captures) — décision 22 sept. | ☐ |
| REF-D01.A27 | 04 | Supprimer toute mention du seuil unique 45 000 F — CL-07 et captures — décision 22 sept. | ☐ |
| REF-D01.A28 | 04 | Libeller les boutiques « Boutique A, B, C » sans nom — CL-07, captures panier — anonymat. | ☐ |
| REF-D01.A29 | 04 | Vérifier le bouton « Payer au comptoir » absent si non éligible avec la ligne explicative — CL-07/CL-08, prototype. | ☐ |
| REF-D01.A30 | 04 | Vérifier que le reçu ne contient ni code, ni noms de boutiques, ni détail des frais, ni suggestion, ni demande de note — CL-08, captures reçu. | ☐ |
| REF-D01.A31 | 04 | Vérifier le mot « Validée » (jamais « payé ») pour le reste dû au comptoir — CL-08/CL-09, PR-05. | ☐ |
| REF-D01.A32 | 04 | Masquer tout encart « Avec Prime… » dans le panier — CL-07 — ch. 21. | ☐ |
| REF-D01.A33 | 05 | Supprimer toute notion de caisse, plafond de caisse et espèces côté relais ; afficher « Montant dû (MoMo sur place) » — PR-05, PR-09, captures relais — v2.0. | ☐ |
| REF-D01.A34 | 05 | Supprimer « Reste à payer », les 6 filtres et la carte du livreur en temps réel dans Mes commandes — CL-09, captures — défauts relevés. | ☐ |
| REF-D01.A35 | 05 | Vérifier le texte de garde « Gratuit aujourd’hui, 100 F par jour dès demain » et la série S0-S5 avec montants exacts — CL-09/CL-10, PR, captures — décision 24 sept. | ☐ |
| REF-D01.A36 | 05 | Mettre à jour la photo « SMS de repli » : « 400 F dès le 6e jour, retrait avant le 26 sept. » — CL-10, captures. | ☐ |
| REF-D01.A37 | 05 | Remplacer les canaux « WhatsApp forcé » par SMS + lien court ; option WhatsApp affichée « bientôt » — CL-10, réglages profil. | ☐ |
| REF-D01.A38 | 05 | Masquer l’encart « Prime · actif » du compte au lancement — CL-13, captures compte. | ☐ |
| REF-D01.A39 | 05 | Vérifier que l’écran gérant bloque la validation sans photo de remise ni sortie de tous les colis — PR-05. | ☐ |
| REF-D01.A40 | 06 | Retirer tout remboursement automatique à l’échéance des 48 h ; silence vendeur ⇒ file d’arbitrage prioritaire — CL-11, VD-07, ADM-04 — v2.0. | ☐ |
| REF-D01.A41 | 06 | Supprimer toute promesse de retour sans motif, compteur « retours sans motif » et liste d’exclusions — CL-11, captures retour, VD-07 — décision 21 sept. | ☐ |
| REF-D01.A42 | 06 | Afficher « Retour gratuit si le problème est validé » tant que l’arbitrage n’est pas rendu — CL-11/CL-12. | ☐ |
| REF-D01.A43 | 06 | Vérifier l’étape 3 (photo obligatoire sauf « Jamais reçu ») et l’absence de demande de preuve d’achat/valeur — CL-11, prototype. | ☐ |
| REF-D01.A44 | 06 | Vérifier que la console impose un motif écrit et affiche la chaîne de preuves côte à côte — ADM-04. | ☐ |
| REF-D01.A45 | 06 | Vérifier le libellé « Annulation impossible » dès la collecte et le recalcul du remboursement (exemple 84 380 F) — CL-12. | ☐ |
| REF-D01.A46 | 06 | Vérifier le transfert de relais à 400 F et les règles carte (2 %, 150 000 F, J+14) — CL-12. | ☐ |
| REF-D01.A47 | 07 | Vérifier l’écran « Changer de relais » (gratuit avant collecte, impossible en tournée, 400 F après arrivée, nouveau code, garde au jour 1) — CL-12, captures, prototype. | ☐ |
| REF-D01.A48 | 07 | Vérifier l’écran « Payer de l’étranger » (2 % affiché avant débit, ≈ € au centime, « Tu seras remboursé, pas elle ») — CL-12. | ☐ |
| REF-D01.A49 | 07 | Vérifier 2 notes séparées et l’absence du nom de boutique dans les avis — CL-13, CL-06, captures avis. | ☐ |
| REF-D01.A50 | 07 | Vérifier que la note gérant apparaît côté relais sans identité client — PR-09 (performance). | ☐ |
| REF-D01.A51 | 07 | Vérifier qu’aucune case de conditions n’est à cocher au paiement et que les pages légales sont versionnées FR/EN — CL-08, CL-13. | ☐ |
| REF-D01.A52 | 07 | Vérifier le mode dégradé (bannière, code hors ligne après 1er affichage, actions d’argent grisées) — CL-13. | ☐ |
| REF-D01.A53 | 08 | Supprimer page boutique publique et QR de boutique — VD-11, captures boutique — anonymat. | ☐ |
| REF-D01.A54 | 08 | Vérifier « Vous gardez X F » sans aucune ligne de commission — VD-05, VD-09, captures — décision 22 sept. | ☐ |
| REF-D01.A55 | 08 | Vérifier l’inscription vendeur en 3 temps (fiches avant pièce d’identité) — VD-03. | ☐ |
| REF-D01.A56 | 08 | Vérifier « Demander une nouvelle fiche » accessible seulement après recherche sans résultat + prix conseillé — VD-08 — décision 23 sept. | ☐ |
| REF-D01.A57 | 08 | Supprimer le type/carte « Caisse » de la console et ajouter les types « Relais » et « Livraison » — ADM-03, captures ADM. | ☐ |
| REF-D01.A58 | 08 | Vérifier la gestion des partenaires (relais « En configuration », 2 transporteurs par zone, réattribution de paquet, jamais d’affectation directe de livreur) — ADM-08. | ☐ |
| REF-D01.A59 | 08 | Vérifier la simulation bloquante (contribution ≥ plancher) et le versionnement des paramètres — ADM-10. | ☐ |
| REF-D01.A60 | 08 | Vérifier les pondérations des Trust Scores relais et entreprise — ADM-06/ADM-08, PR-09, ENT-07. | ☐ |
| REF-D01.A61 | 09 | Vérifier que tous les codes du registre ch. 20 figurent dans le registre du paquet client actuel avec le même statut — CL-16 — cohérence registre. | ☐ |
| REF-D01.A62 | 09 | Faire trancher toutes les valeurs « à trancher » de 19.4 avant production et les inscrire au registre — CL-16, ADM-14, questions ouvertes. | ☐ |
| REF-D01.A63 | 09 | Remplacer les images de maquette par les photos réelles P1-P4, H1-H9, B1-B2, S1-S3, C1-C3, M1-M5, V1-V2, G1, L1 selon la consigne — captures et prototype client — 19.5. | ☐ |
| REF-D01.A64 | 09 | Vérifier que le masquage automatique des numéros/e-mails s’applique dans toutes les messageries entre acteurs externes — CL-10, VD-11, PR-08, LIV-10, ENT-08. | ☐ |
| REF-D01.A65 | 09 | Vérifier que les encarts « Avec Prime… » des documents 03-06 dépendent de l’interrupteur abonnement et sont masqués — CL-03 à CL-08, captures — ch. 21. | ☐ |
| REF-D01.A66 | 09 | Vérifier la grille de garde abonnés (+2/+4 j avant le jour 2) et que le relais n’est payé que sur jours facturés — CL-14, PR-09. | ☐ |
| REF-D01.A67 | 10 | Corriger la formule F_client : ch. 21 écrit « 3 + bonus » alors que la grille de base n’a qu’un jour gratuit (ch. 10 : F_client = 1 + bonus) — CL-14 et registre — incohérence interne REF-CL. | ☐ |
| REF-D01.A68 | 10 | Vérifier que les favoris sont une seule liste partout (panier « Sauvegardés », fiche, liste d’envies) et qu’il n’existe pas de « boutiques suivies » — CL-06/CL-07/CL-14. | ☐ |
| REF-D01.A69 | 10 | Vérifier le remboursement au payeur (jamais au bénéficiaire) et le plafond de groupage 21 j sans garde — CL-14, PR (capacité, gains). | ☐ |
| REF-D01.A70 | 10 | Vérifier que les ventes flash n’utilisent ni SMS, ni faux compte à rebours et que le vendeur accepte la remise offre par offre en voyant ce qu’il garde — CL-14, VD-10. | ☐ |
| REF-D01.A71 | 10 | Vérifier que les nouveautés EX-01/EX-02 sont derrière interrupteur « après lancement » — CL-15. | ☐ |
| REF-D01.A72 | 11 | Vérifier que CL-15 reprend les règles COT, MDC, TRC, FAM, WAP avec les mêmes statuts et paramètres — CL-15 — cohérence source/paquet. | ☐ |
| REF-D01.A73 | 11 | Faire valider par un juriste le forfait d’annulation MDC (5 %, 5 000 F max) avant lancement — CL-15, registre — EX-07. | ☐ |
| REF-D01.A74 | 11 | Confirmer les 2 % de frais de cotisation avec les vrais frais de paiement — CL-15 — EX-07. | ☐ |
| REF-D01.A75 | 11 | Identifier la source de la liste des téléphones volés et contractualiser un reconditionneur — CL-15, PR (dépôt IMEI) — EX-07. | ☐ |
| REF-D01.A76 | 11 | Vérifier côté relais le dépôt de téléphone (lecture IMEI, pièce d’identité, rémunération comme un colis) — PR-04/PR-06 si repris. | ☐ |
| REF-D01.A77 | 11 | Vérifier qu’aucune nouveauté n’envoie de code par WhatsApp ou au payeur — CL-15. | ☐ |
| REF-D01.A78 | 12 | Ajouter au registre après lancement TRC-IMEI-SOURCE, FAM-MAX-TX et RNT-GROUPAGE-J, cités dans les chapitres 25, 28 et 29 mais absents du ch. 32 — CL-16 (registre) — cohérence registre. | ☐ |
| REF-D01.A79 | 12 | Ajouter des critères de recette pour les ch. 23 (ventes flash) et 24 (assistant IA) — CL-16 (recette) — liste incomplète. | ☐ |
| REF-D01.A80 | 12 | Vérifier que les interrupteurs FF-* existent et sont fermés au lancement dans la console, et que FF-ABONNEMENT masque tous les encarts « Prime » — ADM-10, CL-14. | ☐ |
| REF-D01.A81 | 12 | Reporter la liste de contrôle de recette dans le paquet client actuel si elle n’y est pas intégralement — CL-16. | ☐ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| REF-D01.Q01 | 01 | REF-CL v3 (25 sept.) se dit « seule référence » et remplacer les 17 documents client, alors que le handoff traite le paquet actuel (CL-00 à CL-16) comme plus récent : dater les deux pour appliquer « le plus récent l’emporte ». | |
| REF-D01.Q02 | 01 | Remboursement automatique « 3 000 / 10 000 F » : seuils à préciser (plafond selon quoi ?). | |
| REF-D01.Q03 | 02 | Paramètres OTP (durée, essais, renvoi), seuil N des rangées et seuil_écran : non fixés. | |
| REF-D01.Q04 | 02 | Premier écran « 24-72 h · Livraison » alors que la décision du 25 sept. vise < 5 h par zone : libellé à aligner. | |
| REF-D01.Q05 | 03 | ACC-RANGEE-MIN non fixé ; RECH-HIST seulement proposé. | |
| REF-D01.Q06 | 03 | Délai domicile « 24-72 h » sur la fiche vs objectif < 5 h par zone (décision 25 sept.). | |
| REF-D01.Q07 | 04 | LIV-SUPPL-M / L non fixé. | |
| REF-D01.Q08 | 04 | T_val (fenêtre de validation agrégateur) non chiffrée. | |
| REF-D01.Q09 | 05 | CODE-BIO et GARDE-PRORATA seulement proposés ; seuil du mode économique SMS à trancher ; fournisseur SMS secondaire à désigner. | |
| REF-D01.Q10 | 05 | Le budget « 5 à 6 SMS » liste 6 codes (C1, C3, S1, S2, C4, C12) : confirmer que 6 est le plafond strict. | |
| REF-D01.Q11 | 06 | IFA-NABS, IFA-NAUTO, RET-SANS-RETOUR, RET-REMPL-DELAI, plafond d’annulations après confirmation : non fixés. | |
| REF-D01.Q12 | 07 | Prestataire carte (Flutterwave ou CinetPay), AVIS-FENETRE, ANNPLAFOND, SUP-WA non fixés. | |
| REF-D01.Q13 | 08 | Formule et pondérations du score de zone « à définir ». | |
| REF-D01.Q14 | 08 | Rémunération « Or sans plafond avec assurance » : conditions d’assurance non précisées. | |
| REF-D01.Q15 | 09 | 18 valeurs « à trancher » listées en 19.4 bloquent la production. | |
| REF-D01.Q16 | 09 | Seuil de dissociation d’une commande (messages d’arrivée) : cité seulement ici, sans définition. | |
| REF-D01.Q17 | 10 | F_client « 3 + bonus » (ch. 21) contredit « 1 + bonus » (ch. 10) : à trancher (le plus récent / la grille du 24 sept. donne 1). | |
| REF-D01.Q18 | 10 | Validité par défaut du lien de liste, FLASH-BUDGET, IA-COUT-MAX non fixés. | |
| REF-D01.Q19 | 11 | Paramètres « à trancher » : TRC-PARTENAIRE, TRC-IMEI-SOURCE, WAPCOUT, WAP-VOCAL-CONSERV ; MDC-FORFAIT à valider. | |
| REF-D01.Q20 | 12 | Paramètres « à trancher » à décider avant chaque activation de module : LST-VALIDITE, FLASH-BUDGET, IA-COUT-MAX, TRC-PARTENAIRE, WAP-COUT, WAP-VOCAL-CONSERV ; COT-FRAIS à confirmer ; MDC-FORFAIT à valider. 2.5 | |

## R2 · REF-VD

R2 — REF-VD — Spécification développeur de l’espace vendeur (source) — dossier : 01_Documents / 0 — Références communes (sources transverses, incluses dans chaque paquet) / R2 — REF-VD — Spécification développeur de l’espace vendeur (source)

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| REF-D02.A01 | 01 | Retirer les plans Gratuit, Starter, Pro, Business à 20/18/12/10/5 % et les réductions « −1, −2, −3 % » par palier — VD, captures, prototype — V02 à retirer de la production. | ☐ |
| REF-D02.A02 | 01 | Supprimer toute ligne « Commission −X F » ou onglet « Retenu » des écrans vendeur ; remplacer par « Vous gardez » — VD-05, VD-08, VD-09, captures — décision 22 sept. | ☐ |
| REF-D02.A03 | 01 | Corriger la maquette « Ce que vendre vous coûte » en « Ce que vous gardez » — Mon argent, VD-09, capture Argent — V03. | ☐ |
| REF-D02.A04 | 01 | Supprimer toute mention disant que le palier ne change pas la commission — VD-10 — V02. | ☐ |
| REF-D02.A05 | 01 | Remplacer « reversement », « acheteur », « escrow » et libellés sans accents (« anciennete », « dedie ») — tous écrans VD — V82/V70. | ☐ |
| REF-D02.A06 | 01 | Vérifier que la barre du bas a 4 onglets identiques partout et qu’aucun écran racine n’a de flèche retour — prototype VD — V01. | ☐ |
| REF-D02.A07 | 01 | Vérifier que chaque écran affiche exactement les chiffres du scénario de référence — captures VD — V93. | ☐ |
| REF-D02.A08 | 02 | Mettre à jour la maquette Gelé/Mon argent : 700 600 → 688 488 F et 750 400 → 742 008 F — captures Gele.jpg, Argent.jpg (Fond clair et sombre), prototype VD — barème M01. | ☐ |
| REF-D02.A09 | 02 | Retirer « Ce que vendre vous coûte », « Tout ce qui a été retenu » et toute ligne négative de commission — VD-09, captures — V03. | ☐ |
| REF-D02.A10 | 02 | Retirer les cinq pages financières contradictoires et l’annonce « à verser » de commandes en litige — VD-09, prototype — V03. | ☐ |
| REF-D02.A11 | 02 | Retirer le bouton « Retirer », le montant à saisir, le minimum, les frais de retrait de 1,5 % et la page « Compte BelivaY » — VD-09, captures Versements — V04. | ☐ |
| REF-D02.A12 | 02 | Vérifier l’avertissement « changer de numéro bloque les versements 7 jours » et le contrôle de préfixe — VD-09, captures Numero.jpg / Numero_code.jpg / Numero_ok.jpg. | ☐ |
| REF-D02.A13 | 02 | Vérifier l’écran refus de versement (3 motifs, 3 tentatives) — capture Versements_refus.jpg. | ☐ |
| REF-D02.A14 | 03 | Retirer la page boutique publique, bannière, description publique, lien, QR code et affiche — VD-11, captures Boutique.jpg — V05. | ☐ |
| REF-D02.A15 | 03 | Retirer le champ WhatsApp public et tout numéro visible des clients — VD-11 — V05. | ☐ |
| REF-D02.A16 | 03 | Retirer le quartier du client, le relais de destination et le mode de livraison de toutes les pages et documents vendeur (bon, reçu) — VD-05/VD-06, captures Bon.jpg, Recu.jpg — A2. | ☐ |
| REF-D02.A17 | 03 | Retirer de l’accueil les six écrans de tuiles, le graphique et la heatmap vides, l’objectif mensuel préréglé à 500 K, le compteur « Clients uniques » ; remplacer les tuiles par une ligne de synthèse — VD-04, captures Accueil*.jpg — V06. | ☐ |
| REF-D02.A18 | 03 | Retirer la ligne « Commission −2 160 F » de la carte commande — VD-05, capture Commande.jpg / Commandes.jpg — V07. | ☐ |
| REF-D02.A19 | 03 | Vérifier que chaque carte d’accueil n’a qu’un bouton plein — prototype VD, VD-04. | ☐ |
| REF-D02.A20 | 03 | Vérifier le bouton « Enregistrer » en bas de tous les formulaires Ma boutique — VD-11, captures Horaires/Emplacement/Equipe — V77. | ☐ |
| REF-D02.A21 | 04 | Retirer toute consigne d’emballage donnée au vendeur et tout code à écrire au marqueur — VD-05/VD-06, capture Bon.jpg — V07. | ☐ |
| REF-D02.A22 | 04 | Retirer le décompte de commission du reçu vendeur (reste sur la facture mensuelle) — VD-06, capture Recu.jpg — V07. | ☐ |
| REF-D02.A23 | 04 | Retirer codes d’état internes et tuiles de comptage ; passer Exporter et Factures dans le menu « ⋮ » — VD-05, captures Commandes*.jpg — V07. | ☐ |
| REF-D02.A24 | 04 | Mettre à jour le montant gelé de l’écran Litiges : 684 000 → 670 648 F — capture Litiges.jpg (clair/sombre), prototype — barème M01. | ☐ |
| REF-D02.A25 | 04 | Aligner l’échéance du litige BLV-00005 : texte « mer. 23 sept. à 06 h 02 » vs calcul « mar. 22 à 05 h 30 » — VD-07, capture Repondre.jpg — incohérence interne. | ☐ |
| REF-D02.A26 | 04 | Vérifier que le code de remise ne s’affiche qu’avec nom et photo du livreur — VD-06, capture Remise_code.jpg. | ☐ |
| REF-D02.A27 | 05 | Retirer la page litige sans bouton de réponse, les captures WhatsApp listées comme preuves et les litiges bloqués à l’étape 1 — VD-07, captures Litiges.jpg / Repondre*.jpg — V08. | ☐ |
| REF-D02.A28 | 05 | Retirer la page Retours vide, tout retour sans motif, tout remboursement à la demande avant inspection — VD-07, captures Retours.jpg — V09. | ☐ |
| REF-D02.A29 | 05 | Corriger l’exemple du palier Argent : « 18 164 F au lieu de 17 840 F, soit 600 F de plus » (écart réel 324 F) — VD-10, capture Palier.jpg — calcul incohérent. | ☐ |
| REF-D02.A30 | 05 | Corriger l’exemple iPhone : « 3 360 F de plus (15 680 F de commission au lieu de 14 676 F) » — une commission plus élevée ne peut pas faire garder plus — VD-10, capture Palier.jpg — calcul incohérent. | ☐ |
| REF-D02.A31 | 05 | Vérifier que la saisie assistée affiche les 4 contrôles et exige la validation du vendeur — VD-03/VD-08, capture SaisieAssistee.jpg. | ☐ |
| REF-D02.A32 | 05 | Vérifier que l’inscription ne demande ni RCCM à un particulier ni caution — VD-03, captures Ouvrir*.jpg. | ☐ |
| REF-D02.A33 | 06 | Supprimer partout le palier « Diamant » et le barème en points — VD-10, captures Paliers.jpg / Score.jpg — V11. | ☐ |
| REF-D02.A34 | 06 | Corriger les libellés sans accents (« anciennete », « etoiles ») — VD-10, captures — V11. | ☐ |
| REF-D02.A35 | 06 | Retirer toute présentation du palier comme sans effet sur la commission — VD-10 — V11. | ☐ |
| REF-D02.A36 | 06 | Vérifier que la demande de fiche n’apparaît qu’après la recherche et « Aucun de ces produits » — VD-08, captures Offre1*.jpg, Demande.jpg — V12 tâche 5. | ☐ |
| REF-D02.A37 | 06 | Vérifier le champ prix avec exemple grisé et « vous gardez » en direct — VD-08, captures Offre3.jpg. | ☐ |
| REF-D02.A38 | 06 | Aligner le net du chargeur à 5 000 F : « 4 150 F » (V12) contre « 4 300 F » (V02 : commission 700 F) — VD-08 — incohérence interne. | ☐ |
| REF-D02.A39 | 06 | Aligner la part gardée sur l’iPhone 350 000 F : 95,8 % (V12) contre 94,6 % (V02 §9) — VD-02/VD-08 — incohérence interne. | ☐ |
| REF-D02.A40 | 07 | Purger le catalogue de démonstration de la base de production — VD-08, ADM-07 — V12. | ☐ |
| REF-D02.A41 | 07 | Retirer la création de fiche par le vendeur ; mettre des exemples grisés qui ne ressemblent pas à des saisies et l’astérisque sur l’état ; supprimer le tri alphabétique — VD-08, captures Produits.jpg, Offre*.jpg — V12. | ☐ |
| REF-D02.A42 | 07 | Publier la liste des produits interdits dans l’aide avant le lancement — VD-11 (aide), ADM-07 — V12. | ☐ |
| REF-D02.A43 | 07 | Vérifier que le simulateur affiche « Free garde le plus » à 60 000 F — VD-10, capture Simulateur.jpg — V13. | ☐ |
| REF-D02.A44 | 07 | Vérifier que la bande « Sponsorisé » n’apparaît jamais dans les résultats de recherche et respecte ≤ 1 pour 6 cartes — CL-04/CL-05, VD-10 — K1/K3. | ☐ |
| REF-D02.A45 | 08 | Retirer les plans Starter et Business, le « Boost Buy Box », « Analytiques IA » et « Boost & Pub » barrés du menu, la heatmap/graphique vides, « 2 mois offerts » sans prix annuel en francs — VD-10, VD-01 (menu), captures Menu.jpg, Plans*.jpg — V13. | ☐ |
| REF-D02.A46 | 08 | Retirer les trois numéros confondus (n’en garder que deux, nommés), les 141 lignes de connexion, la cloche sans page, « Note boutique — », les cartes de litige comptant des messages sans conversation, les captures WhatsApp comme preuve — VD-11, captures Parametres.jpg, Securite.jpg, Notifications*.jpg, Messagerie*.jpg — V14. | ☐ |
| REF-D02.A47 | 08 | Appliquer côté client : « Retour 7 j · sans discuter » → « retour gratuit si le problème est validé » (documents client 02, 05, 11) — CL-03, CL-06, CL-11 — V15 corrections. | ☐ |
| REF-D02.A48 | 08 | Appliquer côté client : suppression « Autres vendeurs » et affichage « Vendeur certifié [palier] · Trust Score » partout (documents client 05, 06) — CL-06, CL-07 — V15. | ☐ |
| REF-D02.A49 | 08 | Finaliser et publier la liste des produits interdits dans l’aide avant lancement — VD-11, ADM-07 — V15 reste ouvert. | ☐ |
| REF-D02.A50 | 08 | Stopper toute implémentation des tâches V1-V10 v1.1 (taux par plan, retrait à la demande) — VD-12 (registre) — V15. | ☐ |
| REF-D02.A51 | 09 | Changer la couleur de l’état « Se libère » de bleu en orange — VD-09, captures Argent*.jpg — décision 23 sept. (aucun bleu). | ☐ |
| REF-D02.A52 | 09 | Remplacer « Vous gardez 3 points de plus » par le multiplicateur de palier (0,85 / 0,70 / 0,60) exprimé en francs gardés — VD-10, capture Paliers.jpg — V02. | ☐ |
| REF-D02.A53 | 09 | Ajouter la page « Dupliquer un produit » — VD-08, prototype (capture Dupliquer.jpg à vérifier) — V12. | ☐ |
| REF-D02.A54 | 09 | Ajouter l’interrupteur « Accepter le paiement au comptoir » dans le détail de l’offre — VD-08, prototype — v2.0. | ☐ |
| REF-D02.A55 | 09 | Corriger le prototype « Besoin de plus de temps » (+1 h, +2 h, demain à l’ouverture) — prototype VD, capture Delai.jpg — V07. | ☐ |
| REF-D02.A56 | 09 | Ajouter les pages « Contester », « Compte suspendu », « Alerte avant un seuil », « Journal d’une commande » — VD-10/VD-05, prototype (captures Contester.jpg, Suspendu.jpg, Journal.jpg à vérifier). | ☐ |
| REF-D02.A57 | 09 | Mettre à jour les règles client recopiées ici avec REF-CL v3 : DEC-07/CDS-05 mosaïque → grille régulière ; DEC-15 « zone du vendeur » → « livrabilité » ; CNO-02 WhatsApp « bientôt » ; DEC-02 rangées masquées sous N — VD-12 (registre), CL-01/CL-04/CL-05 — décision la plus récente. | ☐ |
| REF-D02.A58 | 09 | Faire trancher la formation vendeur — VD-12, ADM-14. | ☐ |
| REF-D02.A59 | 10 | Aligner CDE-21 et NOT-01 (« WhatsApp en repli ») sur REF-CL : pas d’API WhatsApp au lancement, push puis e-mail pour le payeur, SMS pour le client, option WhatsApp « bientôt » — VD-12 (règles client recopiées), CL-10/CL-12 — décision 17 sept. | ☐ |
| REF-D02.A60 | 10 | Aligner PBL-04 : photo obligatoire sauf « Jamais reçu » — VD-12, CL-11 — REF-CL ch. 11. | ☐ |
| REF-D02.A61 | 10 | Aligner CPT-03 : « 2 mois offerts » à accompagner du prix annuel en francs — CL-14 — V13 « à retirer : 2 mois offerts sans prix annuel en francs ». | ☐ |
| REF-D02.A62 | 10 | Vérifier que les statuts « Recommandé » (CDE-08, CDE-13, CDE-17) sont à jour : REF-CL les donne Proposé (CODE-BIO) et Fixé (TRANSFERT-RELAIS 400 F) — VD-12, CL-16. | ☐ |
| REF-D02.A63 | 10 | Rattacher l’écran « Menu » à V01 (tâche 2) dans la table des écrans — VD-12 (traçabilité) — cohérence. | ☐ |
| REF-D02.A64 | 10 | Vérifier que chaque route listée existe dans le prototype VD (58 écrans) et que les écrans des pages à ajouter y sont créés — prototype VD, VD-12. | ☐ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| REF-D02.Q01 | 01 | Plancher supérieur au prix (article à 600 F → commission 700 F, net −100 F ; mord sous ≈ 3 043 F) : prix minimum par sous-commande ou commission plafonnée en % ? (à trancher). | |
| REF-D02.Q02 | 01 | Arrondi : au franc le plus proche (proposé). | |
| REF-D02.Q03 | 01 | Remboursement partiel : le plancher de 700 F s’applique-t-il après réduction au prorata ? | |
| REF-D02.Q04 | 01 | Plafond de remise d’abonnement : compter la remise des commandes payées du mois et la restituer si remboursée. | |
| REF-D02.Q05 | 01 | Offre de découverte : les commandes non encaissées/annulées/remboursées comptent-elles dans les 50 ? | |
| REF-D02.Q06 | 01 | Grille « proposée » à remplacer par l’annexe 1 dès qu’elle est fournie. | |
| REF-D02.Q07 | 02 | Aucune nouvelle ; chiffres de maquette à aligner (voir modifications). | |
| REF-D02.Q08 | 03 | Délai d’annonce d’une fermeture programmée (48 h) et nombre d’accès employés (3) seulement proposés. | |
| REF-D02.Q09 | 04 | G1 « arbitrage client appliqué » automatiquement à 48 h (tâche planifiée) contredit REF-CL (v2.0) : « plus de remboursement automatique à l’échéance, décision humaine motivée » — à trancher (le plus récent l’emporte). | |
| REF-D02.Q10 | 04 | Effets g1 (rupture, délai) seulement proposés. | |
| REF-D02.Q11 | 05 | PBL-14 « trajet retour 500 F » : REF-CL ch. 12 décrit une course normale sans montant fixé — confirmer le tarif. | |
| REF-D02.Q12 | 05 | Exemples de gains au palier Argent incohérents (voir modifications) : recalculer avec le barème M01. | |
| REF-D02.Q13 | 05 | Ancienneté (C7) et plafond de démarrage (C10) seulement proposés. | |
| REF-D02.Q14 | 06 | REF-VD : « le vendeur ne crée jamais une fiche lui-même, BelivaY la rédige sous 48 h » vs écran court « description écrite par le vendeur » et REF-CL 17.2 (le vendeur saisit photos, titre, description) : préciser qui rédige la fiche maître. | |
| REF-D02.Q15 | 06 | Effets g1/g2 v1.2 et libellés d’états produit seulement proposés. | |
| REF-D02.Q16 | 07 | Bande « Sponsorisé » payante par les vendeurs (V13) vs REF-CL ch. 4.3 « emplacements promotionnels : contenu BelivaY uniquement, jamais de publicité tierce » : préciser si les mises en avant vendeurs sont admises sur l’accueil/catégories. | |
| REF-D02.Q17 | 07 | Vitrine de quartier, boost au résultat, campagne favoris, vente flash, photos/fiche prioritaire : prix seulement proposés. | |
| REF-D02.Q18 | 08 | Bonus des plans : V13 « vous gardez 5 % / 10 % de la commission en plus » vs V15 « Boost −1 pt, Pro −2 pts » : unifier la règle. | |
| REF-D02.Q19 | 08 | V15 « silence = arbitrage en faveur du client » : même divergence que partie 04 avec REF-CL (décision humaine motivée, pas d’automatisme). | |
| REF-D02.Q20 | 08 | Liste des produits interdits non finalisée. | |
| REF-D02.Q21 | 09 | CCA-04 « colis L doublé » (garde) n’apparaît pas dans REF-CL : confirmer si la garde d’un colis L est doublée. | |
| REF-D02.Q22 | 09 | CDS-05/DEC-07 (quinconce, hauteurs variables) contredisent l’arbitrage du 17 sept. (grille régulière) repris dans REF-CL v3. | |
| REF-D02.Q23 | 09 | Points ouverts du modèle de règles (plancher, arrondi, prorata, compteur 50, gravité ≤ 2 ★) : propositions à valider. | |
| REF-D02.Q24 | 10 | Plusieurs règles client recopiées au 24 sept. (WhatsApp en repli, photo toujours obligatoire, « 2 mois offerts ») divergent de REF-CL v3 du 25 sept. : appliquer la plus récente. 3.5 | |

## R3 · REF-PRODUIT

R3 — REF-PRODUIT — Référence produit, version courte (source) — dossier : 01_Documents / 0 — Références communes (sources transverses, incluses dans chaque paquet) / R3 — REF-PRODUIT — Référence produit, version courte (source)

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| REF-D03.A01 | 01 | Ne pas reprendre la mosaïque en quinconce (v1.0) : appliquer la grille régulière arbitrée le 17 sept. — CL-04, captures listing/accueil — REF-CL plus récent. | ☐ |
| REF-D03.A02 | 01 | Ne pas reprendre le filtre « zone du vendeur » ni le quartier du vendeur sur les cartes : remplacer par « livrabilité » et distance au relais sans nom — CL-04/CL-05 — REF-CL (décision 17 sept.). | ☐ |
| REF-D03.A03 | 01 | Ne pas refaire la section « autres vendeurs » (v1.0) : elle est supprimée depuis le 17 sept. — CL-06 — REF-CL. | ☐ |
| REF-D03.A04 | 01 | Vérifier que la formule de classement du paquet actuel suit REF-CL (disponibilité/livrabilité → pertinence → coût livré → Trust Score en départage) plutôt que la pondération v1.0 40/20/15/15/10 — CL-05 — divergence. | ☐ |
| REF-D03.A05 | 01 | Reprendre dans CL-05 les exigences techniques v1.0 si absentes (< 300 ms, < 30 ko, anti-rebond 250 ms, blocs de 20, description non indexée, tolérance 2 caractères) — CL-05. | ☐ |
| REF-D03.A06 | 02 | Ne pas afficher le nom de la boutique dans les sections du panier (v1.0) : libellé neutre « Boutique A, B, C » — CL-07, captures panier — arbitrage REF-CL 19.4. | ☐ |
| REF-D03.A07 | 02 | Retirer du panier et de la fiche la mention Prime « ce retrait est offert dès 10 000 F », le badge « retour 7 jours » et la mention « paiement à la livraison » — CL-06/CL-07, captures — décisions 21 sept., v2.0, ch. 21. | ☐ |
| REF-D03.A08 | 02 | Corriger les écarts panier encore ouverts : sections par boutique avec code couleur, détail des ramassages, phrase « N colis, un seul code », levée de peur sous le bouton, reste à atteindre calé sur 30 000/50 000 F — CL-07, captures, prototype — v1.0 §6.9. | ☐ |
| REF-D03.A09 | 02 | Remplacer « Vendeur nommé et certifié par ligne » (écart marqué CORRIGÉ en v1.0) par « Vendeur certifié [palier] · Trust Score » sans nom — CL-07. | ☐ |
| REF-D03.A10 | 02 | Vérifier la règle « litige : sans réponse à 48 h » : décision humaine avec présomption client (REF-CL v2.0), pas d’arbitrage automatique — CL-11, VD-07, ADM-04. | ☐ |
| REF-D03.A11 | 02 | Vérifier que le registre papier en panne (vérification d’identité, régularisation) est décrit côté relais — PR-05/PR-07. | ☐ |
| REF-D03.A12 | 03 | Ne pas reprendre l’affichage « commission retenue, net » de l’espace vendeur v1.0 : montrer « vous gardez » — VD-05/VD-09 — décision 22 sept. | ☐ |
| REF-D03.A13 | 03 | Ne pas reprendre les canaux « WhatsApp forcé » (C2, C3) ni le repli WhatsApp v1.0 : SMS avec code + lien court, WhatsApp « bientôt » — CL-10 — décision 17 sept. | ☐ |
| REF-D03.A14 | 03 | Remplacer la série de stockage générique v1.0 (franchise, X/Y/W) par la grille du 24 sept. (S0-S5 chiffrés) — CL-10, PR — décision 24 sept. | ☐ |
| REF-D03.A15 | 03 | Vérifier que le message C10 « avertissement avant libération automatique de l’escrow » existe dans le paquet actuel — CL-10, ADM-11 — REF-PRODUIT 17.5 (C10 cité aussi dans REF-CL litige). | ☐ |
| REF-D03.A16 | 03 | Documenter la procédure de diffusion de panne hors système (qui déclenche, gabarit, liste exportée, test trimestriel) — ADM-11, PR-08 — REF-PRODUIT 17.8. | ☐ |
| REF-D03.A17 | 03 | Vérifier la règle « vendeur : exception WhatsApp pour escalade » face à V14 (SMS seulement pour commande à préparer et litige) — VD-11, ADM-11. | ☐ |
| REF-D03.A18 | 04 | Supprimer la règle v1.0 « retour sans motif sous 7 jours conservé », le compteur « retours sans motif » et la liste d’exclusions — CL-11, CL-06 (fiche), VD-07 — décision du 21 sept. (supprimé au lancement). | ☐ |
| REF-D03.A19 | 04 | Vérifier que la page Abonnements « en production » est masquée au lancement (interrupteur FF-ABONNEMENT) — CL-14, prototype client — REF-CL ch. 21/32. | ☐ |
| REF-D03.A20 | 04 | Vérifier la règle « ≤ 3 messages payants par commande et par 24 h » face au plafond « 6 SMS par commande » de REF-CL — CL-10 — deux plafonds différents. | ☐ |
| REF-D03.A21 | 04 | Vérifier que l’application livreur bloque le départ si le compte de colis est faux et que la dissociation est décidée par le système — LIV-05/LIV-06/LIV-07. | ☐ |
| REF-D03.A22 | 04 | Vérifier que le Trust Score livreur est défini (manque v1.0) — LIV-09, ENT-07. | ☐ |
| REF-D03.A23 | 04 | Vérifier C2/C3 déclenchés au dernier colis du groupe et C2a pour les intermédiaires — PR-04, CL-10. | ☐ |
| REF-D03.A24 | 05 | Ne pas reprendre l’écran « Caisse » ni les plafonds de caisse / reversement (v1.0) : remplacés par « Montant dû (MoMo sur place) » et « Gains », zéro espèce — PR-05/PR-09, ADM-08, captures relais — v2.0. | ☐ |
| REF-D03.A25 | 05 | Remplacer dans la console les alertes « écarts de caisse / plafonds de caisse » par le type « Relais » (capacité, colis non conforme, fermeture, écart de colis) — ADM-03 — REF-CL ch. 18. | ☐ |
| REF-D03.A26 | 05 | Ajouter aux photos à produire les codes W1-W4, A1-A4 et R1 absents de la liste REF-CL 19.5 — CL-16 (photos), ADM (preuves) — cohérence. | ☐ |
| REF-D03.A27 | 05 | Marquer comme tranchés les arbitrages v1.0 désormais décidés (grille de garde 24 sept., encaissement par BelivaY, transfert 400 F, Trust Score relais et livreur, retour sans motif supprimé) — ADM-14/CL-16 (registres). | ☐ |
| REF-D03.A28 | 05 | Vérifier la structure « espace pays » de tous les paramètres (CEMAC) — ADM-12 (pays), ADM-10. | ☐ |
| REF-D03.A29 | 05 | Corriger la double numérotation « Section 27 » (règles transverses et manques) — REF-PRODUIT (document d’archive, pour mémoire). | ☐ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| REF-D03.Q01 | 01 | REF-PRODUIT v1.0 (19 sept.) est antérieur à REF-CL v3 (25 sept.) : appliquer les décisions plus récentes (grille, livrabilité, « autres vendeurs » supprimé). | |
| REF-D03.Q02 | 01 | Indexation de la description : v1.0 « non indexée » vs REF-CL 5.5 « indexer titre, description… » — à trancher. | |
| REF-D03.Q03 | 02 | Coût d’une remise relais « 1 000 F » (v1.0, avec marge) vs remise relais 400 F / base 900 F (REF-CL 22 sept.) : v1.0 dépassé. | |
| REF-D03.Q04 | 02 | Paiement « à la livraison » (v1.0) vs paiement au comptoir électronique « Validée », zéro espèce (v2.0). | |
| REF-D03.Q05 | 03 | Préavis Meta (1er oct. 2026) : impact sur le support WhatsApp humain « gratuit au lancement » (REF-CL 15.2) à réévaluer. | |
| REF-D03.Q06 | 04 | Retour sans motif : v1.0 (19 sept.) le conserve, REF-CL/REF-VD (21 sept.) le suppriment — appliquer le 21 sept. | |
| REF-D03.Q07 | 04 | Plafond de messages payants : 3 par 24 h (v1.0) vs 6 par commande (REF-CL) — à unifier. | |
| REF-D03.Q08 | 05 | Canal de la liste d’envies « WhatsApp en premier » (v1.0) : partage depuis le téléphone du client, compatible avec « pas d’API WhatsApp » — à confirmer dans CL-14. 4.5 | |

## R4 · REF-COMMISSION

R4 — REF-COMMISSION — Commission officielle V02 (source) — dossier : 01_Documents / 0 — Références communes (sources transverses, incluses dans chaque paquet) / R4 — REF-COMMISSION — Commission officielle V02 (source)

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| REF-D04.A01 | 01 | Retirer les plans Gratuit, Starter, Pro, Business à 20/18/12/10/5 %, les réductions « −1, −2, −3 % » par palier, tout taux codé en dur, toute mention « le palier ne change pas la commission », toute ligne « Commission −X F » ou « Retenu » — VD (tous écrans argent, plans, palier), captures, prototype — V02. | ☐ |
| REF-D04.A02 | 01 | Trancher quelle formule fait foi : ce document (taux catégorie × palier, coefficients 1/0,5/0,25/0,12 ; ITEL → 16 600 F gardés) ou le barème M01 par familles de marge repris dans REF-VD/V15 (ITEL → 17 840 F gardés) ; puis aligner tous les montants du scénario (Mon argent, Mes gains, versements, simulateur, captures) — VD-02, VD-09, VD-10, captures — deux formules incompatibles. | ☐ |
| REF-D04.A03 | 01 | Charger la grille complète depuis l’annexe 1 du contrat vendeur dès sa transmission et remplacer les lignes « Proposé » — VD-02, ADM-10 — V02. | ☐ |
| REF-D04.A04 | 01 | Vérifier que « vous gardez X F par vente » se calcule en direct à la saisie, y compris sous 5 000 F et avec le plancher — VD-08 — V49. | ☐ |
| REF-D04.A05 | 01 | Afficher l’offre de découverte avec date de fin, compteur de commandes et « vous gardez 3 points de plus » — VD-03/VD-09 — V02. | ☐ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| REF-D04.Q01 | 01 | Deux modèles de commission coexistent (catégorie × palier + coefficients ici ; familles de marge M01 dans REF-VD) avec des montants différents pour le même scénario (16 600 F vs 17 840 F pour l’ITEL ; 330 960 F vs 335 324 F pour l’iPhone) : à trancher, le plus récent l’emporte. | |
| REF-D04.Q02 | 01 | Cas limites : plancher 700 F > prix (net négatif sous ≈ 3 043 F), arrondi au franc, plancher après remboursement partiel, base du plafond de remise d’abonnement, compteur des 50 commandes. 5.5 | |

## 01 · CL-00

01 — CL-00 — Lisez-moi, sommaire et index — dossier : 01_Documents / 1 — Commencer ici (règles, lisez-moi, fondations) / 01 — CL-00 — Lisez-moi, sommaire et index

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D01.A01 | 01 | Vérifier que les relais du jeu d’essai client (Mvog-Ada, Essos) existent dans les 4 zones exploitées (Z1 Bastos, Z3 Mokolo, Z6 Melen, Z7 Biyem-Assi) ou aligner le jeu d’essai — CL-00 / CL-02 jeu d’essai — ADM-ZON-01/02 : un relais par zone | ☐ |
| CL-D01.A02 | 01 | Aligner la date du jeu d’essai client (jeudi 24 sept. 10 h 15) avec le jeu d’essai commun (samedi 26 sept.) ou documenter l’écart — CL-00 / CL-02 — cohérence inter-interfaces | ☐ |
| CL-D01.A03 | 01 | Harmoniser la numérotation des commandes (BLV-52018 côté client vs BLV-00005/00008 côté console) — CL-02 / ADM — identifiants exacts | ☐ |
| CL-D01.A04 | 01 | Corriger la table des documents (colonnes pages/titres décalées pour CL-02/CL-03 et CL-11/CL-12/CL-14) — CL-00 p2-3 — lisibilité | ☐ |
| CL-D01.A05 | 01 | Mettre à jour la priorité « 12 · Moyenne » des avis (numérotation 1-8 puis 12 sans 9-11) ou l’expliquer — CL-00 p4 — cohérence | ☐ |
| CL-D01.A06 | 02 | Corriger le libellé « Litige_auto_eleve · palier Élevé (4 800 F) » : préciser qu’il s’agit du montant remboursé (seuil Élevé = 10 000 F) pour éviter la confusion avec le seuil Standard 3 000 F — CL-00 index / CL-11 fig. 12 — ADM-ARG-06 | ☐ |
| CL-D01.A07 | 02 | Harmoniser les identifiants de litige (« LIT3042 » vs « LIT-3042 ») — CL-00 index / CL-11 — identifiants exacts | ☐ |
| CL-D01.A08 | 02 | Harmoniser les références de commande sans tiret (« BLV52018 », « BLV51940 ») avec « BLV-52018 » — CL-00 index — identifiants exacts | ☐ |
| CL-D01.A09 | 03 | Vérifier la cohérence du parrainage « 1 mois offert » (Prime) avec ADM-P26R-12 (récompense en remise directe, dans le plafond fidélité 3,5 %) — CL-14 fig. 20 / ADM-P26 — règle console | ☐ |
| CL-D01.A10 | 03 | Remettre les figures CL-12 dans l’ordre (fig. 26 Payeur_sans_comptoir listé après fig. 27-28) — CL-00 index p27 — lisibilité | ☐ |
| CL-D01.A11 | 03 | Harmoniser les références sans tiret (« BLV52096 », « BLV52124 », « BLV51206 », « LIT3042 ») — CL-00 index — identifiants exacts | ☐ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D01.Q01 | 01 | Relais Mvog-Ada / Essos (client) vs Relais Biyem-Assi, Melen · Chez Mireille (console, relais uniques par zone). | |
| CL-D01.Q02 | 01 | Cliente « Carine Mballa » (client) vs « Carine M. » (console, BLV-00005) : même personne ? | |
| CL-D01.Q03 | 01 | Jeu d’essai client du 24 sept. vs jeu d’essai commun du 26 sept. | |
| CL-D01.Q04 | 01 | Documents datés 25 septembre alors qu’une décision du 26 septembre y est intégrée (version 1.0 · 25 septembre). | |
| CL-D01.Q05 | 01 | Pas de « Prime au lancement » alors que CL-14 décrit un abonnement client après lancement (interrupteur fermé) — cohérent si fermé. | |
| CL-D01.Q06 | 02 | Garde « jour 7, dimanche fermé » : le dimanche est-il facturé ? (ADMTAR-02 : jamais pendant une fermeture). | |
| CL-D01.Q07 | 02 | LIT-3042 : dossier du fer au comptoir (Litige_comptoir) mais aussi BLV51877 « en litige (LIT3042) » — vérifier que c’est la même commande. | |
| CL-D01.Q08 | 02 | Numérotation litiges côté client (LIT-3042) vs console (LIT-0005). | |
| CL-D01.Q09 | 03 | Prime / abonnement client présent dans le prototype alors que « pas de Prime au lancement » (CL-00 p5) : confirmé fermé par interrupteur (Interrupteur_abonnement). | |
| CL-D01.Q10 | 03 | « Cotisation · hausse de prix à trancher » : qui tranche (cf. CL-16) ? | |
| CL-D01.Q11 | 03 | Parrainage : récompense « 1 mois offert » vs remise directe (ADM-P26R12). | |
| CL-D01.Q12 | 03 | Changer de relais vers « Essos » : relais hors des 4 zones exploitées (ADM-ZON-01/02). 6.5 | |

## 02 · CL-01

02 — CL-01 — Fondations, navigation et design — dossier : 01_Documents / 1 — Commencer ici (règles, lisez-moi, fondations) / 02 — CL-01 — Fondations, navigation et design

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D02.A01 | 01 | Corriger l’introduction du chapitre 19 de la spécification (« cinq arbitrages ») : le tableau p. 107 en compte huit — spécification client v3 §19.4 — CL-01 p7 | ☐ |
| CL-D02.A02 | 01 | Remplacer dans la spécification les exemples « 24-72 h » (3.1 p. 17, 6.2 p. 34) par des délais fermes — spécification v3 — CCH-03 | ☐ |
| CL-D02.A03 | 01 | Préciser « Paiement au comptoir jusqu’à 50 000 F » : 15 000 F pour un nouveau compte (ADM-P16R-07, K-21) — CCH-11 / CL-13 — cohérence console | ☐ |
| CL-D02.A04 | 01 | Remplacer le relais du jeu d’essai (Mvog-Ada) par un relais des zones exploitées ou ajouter Mvog-Ada aux zones — CCH-02 / CL-02 — ADM-ZON-01/02 | ☑ |
| CL-D02.A05 | 01 | Vérifier que le code de paramètre CODE-BIO (seuil biométrie 50 000 F) figure au registre CL-16 — CCH-09 — CCH-15 | ☑ |
| CL-D02.A06 | 02 | Mettre en place les contrôles CI sur fichiers de langue et réponses d’API (mots interdits, champs shop_name/seller_name/seller_phone, code dans push) — CI / back Django — CCH-42, CCH-46, CCH-48 | ☐ |
| CL-D02.A07 | 02 | Vérifier que « 12 quartiers » de la carte d’accueil correspond aux 12 zones (4 exploitées + 8 vente seulement) — CL-04 accueil — ADM-P21R-01, CCH-06 | ☑ |
| CL-D02.A08 | 02 | Vérifier que « aide 7 j/7 » est cohérent avec les heures d’ouverture du support (hors heures 22 h 40, délai 2 h) — accueil / CL-13 — CCH-34 étiquettes vraies | ☑ |
| CL-D02.A09 | 03 | Retirer du code de production le champ menu:{…} des routes (sans effet) — prototype / front — CNV-09 | ☐ |
| CL-D02.A10 | 03 | Vérifier l’horaire « Ouvert jusqu’à 19 h » du relais face aux heures de service logistique 8 h-18 h — barre flottante, Menu — ADM-ZON-05 | ☑ |
| CL-D02.A11 | 03 | Vérifier le seuil « nom du retirant obligatoire dès 100 000 F » dans le registre des paramètres (code et statut) et côté relais — CL-09 / CL-16 / PR — CCH-15 | ☑ |
| CL-D02.A12 | 04 | Retirer les jetons –violet, –violet-txt, –violet-soft, –violet-line et supprimer leurs usages restants (–violet-txt 5, –violet-soft 4, –violet-line 2 utilisations alors que dits « inutilisés ») — proto/src/styles.css / écrans — CDS-01 | ☐ |
| CL-D02.A13 | 04 | Faire ouvrir le prototype en clair quand aucun choix n’est mémorisé (au lieu de suivre le réglage du téléphone) — prototype — CDS-03 | ☐ |
| CL-D02.A14 | 04 | Supprimer ou justifier les jetons à 0 utilisation (–logo-grad, –thumb-bg, –thumb-bg-or, –bronze, –platine) — styles.css — propreté du design system | ☐ |
| CL-D02.A15 | 04 | Vérifier le libellé « + 200 F colis M » de la planche avec la grille du moteur de frais — CL-07 — CCH-08 | ☑ |
| CL-D02.A16 | 05 | Foncer le premier arrêt du dégradé du héros orange en sombre (#C4560F → #BF530E, 4,71 : 1) — styles.css — CDS-06 / CRD-08 | ☐ |
| CL-D02.A17 | 05 | Interdire –ink-4 sur le fond de page en clair (4,39 : 1) ; le garder sur carte seulement — styles.css / revue — CDS-06 / CRD-08 | ☐ |
| CL-D02.A18 | 05 | Harmoniser le rayon du bouton principal (13 dans CDS-11 et le tableau densité vs 14 dans CDS-08) — styles.css / CL-01 — cohérence du socle | ☐ |
| CL-D02.A19 | 05 | Annuler dans le socle l’effet de la classe .bar sur .sec.bar (hauteur, fond, débordement) — styles.css — CDS-30 | ☐ |
| CL-D02.A20 | 05 | Trancher LIV-SUPPL-M / L (+ 200 F / + 300 F) avant la mise en production — registre CL-16 / porteur — CDS-16, CCH-21 | ☑ |
| CL-D02.A21 | 05 | Faire de « + Panier » un vrai bouton hors du lien de la carte en production — composant PCard React — CDS-31 | ☐ |
| CL-D02.A22 | 05 | Retirer le jeton hérité –fs-11 et les composants C.ring, C.keep, C.medal, .hero.violet du code de production — styles.css / core.js — CDS-26, CRD-07 | ☐ |
| CL-D02.A23 | 05 | Ajouter en CI la détection d’une icône manquante (pas de repli sur un cercle) — CI — CDS-09 | ☐ |
| CL-D02.A24 | 06 | Produire les vraies photos P1-P4, H1-H9, B1-B2, S1-S3, C1-C3, M1-M5, V1-V2 et les portraits G1, L1 selon la consigne 19.5 — production / contenu — CDS-32, CDS-33 | ☐ |
| CL-D02.A25 | 06 | Faire confirmer par le porteur l’ajout du pidgin à la spécification et faire valider les traductions au-delà des 3 écrans du premier lancement — spécification v3 / CL-13 — CRD-03 | ☑ |
| CL-D02.A26 | 06 | Passer –ink-4 à #6E6974 en production (4,87 : 1 sur fond de page) ou maintenir l’interdiction sur fond de page — styles.css — CRD-08 | ☐ |
| CL-D02.A27 | 06 | Donner une zone de toucher de 44 px au bouton ↑ (42 px), au cœur, au « + » et aux boutons de quantité (36 px) — composants production — CRD-06 | ☐ |
| CL-D02.A28 | 06 | Placer la césure avant le point médian dans « Code de retrait · 2 colis » en Très grande taille — CL-09 écran code — CRD-05 | ☐ |
| CL-D02.A29 | 06 | Faire lire au premier lancement le choix mémorisé avant prefers-color-scheme et ouvrir en clair par défaut (cohérence CDS-03 vs encadré « prefers-color-scheme ») — front — CDS-03, CRD-13 | ☐ |
| CL-D02.A30 | 06 | Retirer de l’application actuelle tous les éléments listés « Retirer » (bandeau faux, compteurs, Wallet, points, modules visibles, violet/bleu, numéro en clair, « RESTE À PAYER ») — application / CL-01 mise à niveau — CCH-03, CCH-41, CCH-46, CCH-49, CDS-01 | ☐ |
| CL-D02.A31 | 07 | Corriger la ligne 19.0-7 de la spécification (« cinq arbitrages ») : huit arbitrages sont rendus (19.4-2 à 19.4-9) — spécification v3 §19.0 — cohérence | ☐ |
| CL-D02.A32 | 07 | Corriger le glossaire 1.4-15 de la spécification (« reste à payer ») en « Montant dû » pour respecter le lexique imposé — spécification v3 §1.4 — CCH-46 | ☐ |
| CL-D02.A33 | 07 | Vérifier que les photos V1-V2 (produits côté vendeur, 19.5-7) sont bien produites côté espace vendeur — VD — CDS-32 | ☐ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D02.Q01 | 01 | Relais Mvog-Ada (quartier non listé parmi Z1 Bastos, Z3 Mokolo, Z6 Melen, Z7 Biyem-Assi). | DP-09 : décidée (decisions-porteur.md) |
| CL-D02.Q02 | 01 | « Relais 900 F = 500 + 400 » : décomposition 500 F (transport) + 400 F (relais) alors que le gérant touche 200/250/400 F selon la taille (ADM-TAR-02). | à décider (revue/decisions.md) |
| CL-D02.Q03 | 01 | Plafond comptoir 50 000 F affiché comme avantage vs niveau 15 000 F nouveau compte. | à décider (revue/decisions.md) |
| CL-D02.Q04 | 01 | Priorité 12 · Moyenne pour CL-13 alors que la page dit aussi « Priorité haute — ce qui évite l’appel au support ». | à décider (revue/decisions.md) |
| CL-D02.Q05 | 02 | « Aide 7 j/7 » sur l’accueil vs service logistique lundi-samedi 8 h-18 h (ADM-ZON-05) et support aux heures d’ouverture (ADM-P29R-04). | DP-12 : décidée (decisions-porteur.md) |
| CL-D02.Q06 | 02 | Relais « Ouvert jusqu’à 19 h » vs service logistique jusqu’à 18 h. | à décider (revue/decisions.md) |
| CL-D02.Q07 | 02 | Ramassage B facturé 380 F au client alors que la remise au relais est offerte : cohérent avec ADM-REN-03, à confirmer côté moteur de frais (CL-07). | répondu par les données (revue/CL-01.md) |
| CL-D02.Q08 | 03 | « Paiement en attente · 214 699 F » (Fig. 6) vs panier de référence 272 579 F : quelle commande ? à vérifier dans CL-09. | répondu par les données (revue/CL-01.md) |
| CL-D02.Q09 | 03 | Badge Compte « 2 » compte BLV-51940 (à payer au retrait) mais la barre flottante dit « 3 colis » : comptes différents (colis vs commandes), à expliciter. | répondu par les données (revue/CL-01.md) |
| CL-D02.Q10 | 03 | Relais fermé « Rouvre demain à 8 h » : cohérent avec service 8 h ; horaire de fermeture 19 h à confirmer. | répondu par les données (revue/CL-01.md) |
| CL-D02.Q11 | 04 | Jetons violets « inutilisés » mais comptés 5/4/2 utilisations. | répondu par les données (revue/CL-01.md) |
| CL-D02.Q12 | 04 | Supplément « + 200 F colis M » : présent sur la planche, à confirmer dans la grille tarifaire (CL-02/CL-07). | à décider (revue/decisions.md) |
| CL-D02.Q13 | 04 | « Liste CE1 » comme titre de route rentree-liste : titre générique attendu (dépend de la classe choisie). | à décider (revue/decisions.md) |
| CL-D02.Q14 | 05 | LIV-SUPPL-M / L à trancher : + 200 F / + 300 F. | DP-07 : décidée (decisions-porteur.md) |
| CL-D02.Q15 | 05 | Rayon du bouton principal : 13 vs 14 px. | à décider (revue/decisions.md) |
| CL-D02.Q16 | 05 | Montant clé : « 34 px au plus (28 px en carte) » vs C.price « big 30 px ». | à décider (revue/decisions.md) |
| CL-D02.Q17 | 05 | Contraste blanc sur #C9500E à 4,53 : 1, juste au-dessus du seuil : marge faible. | répondu par les données (revue/CL-01.md) |
| CL-D02.Q18 | 06 | Encadré développeur : « Premier lancement : prefers-color-scheme, puis choix mémorisé » vs CDS-03 « l’application s’ouvre en clair » (cette règle l’emporte). | répondu par les données (revue/CL-01.md) |
| CL-D02.Q19 | 06 | Pidgin absent de la v3 : à confirmer par le porteur. | DP-13 : décidée (decisions-porteur.md) |
| CL-D02.Q20 | 06 | CODE-BIO 50 000 F (Proposé) : seuil de biométrie ; cohérence avec le seuil de pièce d’identité à 100 000 F. | DP-29 : décidée (decisions-porteur.md) |
| CL-D02.Q21 | 07 | 19.4-5 : option « 1 400 F » de livraison de base écartée au profit de 900 F (22 sept.) — confirmer qu’aucun autre document ne garde 1 400 F comme tarif de base (1 400 F = plafond de garde). | répondu par les données (revue/CL-01.md) |
| CL-D02.Q22 | 07 | 1.4-15 utilise « reste à payer », mot interdit par CCH-46. | répondu par les données (revue/CL-01.md) |

## 03 · CL-02

03 — CL-02 — Données, cycle, calculs et API — dossier : 01_Documents / 2 — Données, calculs et API / 03 — CL-02 — Données, cycle, calculs et API

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D03.A01 | 01 | Corriger les distances d’une même boutique (Or · 91 : 1,2 / 2,4 / 5,2 km ; Argent · 78 : 0,5 / 0,7 / 1,4 / 3,6 km ; Bronze · 64 : 2,7 / 4,8 km) pour respecter une position unique — data.js / DX_cl06, DX_cl07 — CDA-05 (écart signalé ✗ par le document) | ☐ |
| CL-D03.A02 | 01 | Aligner la gérante du Relais Melen (Mme Eyenga côté client) avec « Relais Melen · Chez Mireille » côté console — jeu d’essai commun CL-02 / ADM — identifiants exacts | ☐ |
| CL-D03.A03 | 01 | Aligner le statut du Relais Biyem-Assi (« En configuration, KYC non validé » côté client) avec la console (retrait de BLV-00005 au Relais Biyem-Assi le 24 sept.) — CL-02 / ADM-14 S1 — cohérence du jeu d’essai | ☐ |
| CL-D03.A04 | 01 | Créer le paramètre LIV-SUPPL-XL (1 500 F domicile) au registre et trancher sa valeur — registre CL-16 — CCH-15, CCH-21 | ☑ |
| CL-D03.A05 | 01 | Trancher LIV-SUPPL-M / L (+ 200 / + 300 F) — registre CL-16 — CDS-16 | ☑ |
| CL-D03.A06 | 01 | Documenter que Mvog-Ada, Essos, Mvan sont des zones « vente seulement » ou les rattacher aux zones exploitées (relais habituel du jeu d’essai hors Z1/Z3/Z6/Z7) — CL-02 / ADM-ZON-01 — cohérence territoire | ☑ |
| CL-D03.A07 | 02 | Aligner les distances de D.p sur une position par boutique (Galaxy A15 et TV 43″ à 1,2 km ; pagne, robe, chemise à 0,7 km ; marmite à 4,8 km) — src/data.js, DX_cl06, DX_cl07 — CDA-05 (point signalé) | ☐ |
| CL-D03.A08 | 02 | Donner à l’offre de la marmite un délai de 4 h (SLA-PREP) pour que BLV-52107 affiche « dès 15 h » partout — DX_cl06.prod.marmite.prep / CL-09 — point signalé | ☐ |
| CL-D03.A09 | 02 | Unifier l’heure de dernière synchronisation hors ligne à 10 h 12 (CL-13 dit 10 h 02, centre de notifications 10 h 15) — DX_cl13.cacheAt, cl10_messages.js — point signalé | ☐ |
| CL-D03.A10 | 02 | Unifier RET-SANS-RETOUR à 5 000 F (CL-03 montre 3 000 F) — docs/content/cl03.py — point signalé, CDA-19 | ☐ |
| CL-D03.A11 | 02 | Unifier les liens publics sur belivay.com avec un préfixe par usage (r/, a/, l/, p/, c/, w/) et un jeton de 8 caractères base32 majuscule — DX_cl14, DX_cl15 — CAP-11 | ☐ |
| CL-D03.A12 | 02 | Donner une autre fin de carte à Éric (ex. 5307) et le même masquage « •••• » partout — DX_cl15.family.card / cl12_modifier.js — point signalé | ☐ |
| CL-D03.A13 | 02 | Garder une seule route par usage : GET /legal/{doc}, POST /me/legal/accept, GET /relais ; aligner avec l’API relais (POST /relay/claims vs /relay/disputes ; /relay/returns/drop vs /relay/returns/{id}/deposit) — CL-03, CL-12, CL-13, PR-02, CL-16 — CAP-02 | ☐ |
| CL-D03.A14 | 02 | Aligner le délai de réponse du support hors heures (« 7 h + 4 h ouvrées ») avec ADM-P29R-04 (2 h pendant les heures d’ouverture) — CL-13 / ADM-P29 — cohérence | ☑ |
| CL-D03.A15 | 02 | Trancher ACC-RANGEE-MIN, AVIS-FENETRE, RET-SANS-RETOUR, délai de remplacement, trajet retour avant production — registre CL-16 — CCH-21 | ☑ |
| CL-D03.A16 | 03 | Unifier le nom de la route du constat au comptoir (POST /relay/disputes ici vs POST /relay/claims côté API relais) et du dépôt de retour (/relay/returns/{id}/deposit vs /relay/returns/drop) — CL-02 / PR-02 / CL-16 — point signalé partie 02 | ☐ |
| CL-D03.A17 | 03 | Faire passer la double validation (quatre yeux) sur toute règle d’escrow avant production — console ADM-4YE-01 — CCY-21 | ☐ |
| CL-D03.A18 | 03 | Documenter la cohérence des délais de rupture (vendeur suivant Trust ≥ 75, ≤ +5 %) avec la console (ADM-P06R-02 : remboursement intégral le jour même) — CL-02 / ADM — cohérence | ☑ |
| CL-D03.A19 | 04 | Remplacer « code de retrait haché » par « chiffré + empreinte HMAC » dans la spécification client et harmoniser avec la console (ADM-PRV-03 : « stocké haché et n’est lisible par personne ») — spec v3 §2.6/§9.2, ADM-PRV-03 — CDA-27 || ☐ |
| CL-D03.A20 | 04 | Choisir le prestataire carte (Flutterwave ou CinetPay) et le fournisseur SMS de secours — services communs / CL-16 — à trancher | ☑ |
| CL-D03.A21 | 04 | Mettre en place le test d’API vérifiant l’absence de shop_name/shop_id/position/numéro sur chaque route client — back / CI — CVI-01 | ☐ |
| CL-D03.A22 | 04 | Trancher le supplément XL (1 500 F) et les suppléments M/L — registre CL-16 — CAL-09 | ☑ |
| CL-D03.A23 | 05 | Trancher RET-SANS-RETOUR (5 000 F proposé), RET-REMPL-DELAI (72 h ouvrées), ANN-PLAFOND, LIV-SUPPL-M/L/XL — registre CL-16 / porteur — CCH-21 | ☑ |
| CL-D03.A24 | 05 | Créer au registre le paramètre LIV-SUPPL-XL (« à créer ») — registre — CDA-22 | ☑ |
| CL-D03.A25 | 05 | Vérifier la cohérence de la part relais (100 F par jour facturé) avec la console (ADM-TAR-02) et la garde doublée du colis L (ADM-TAR-04 : 0/200/200/400/400/800/800 F) absente de la grille client — CL-02 / CL-10 / ADM-TAR-04 — cohérence | ☑ |
| CL-D03.A26 | 05 | Ajouter subscription.cancelled et referral.rewarded au catalogue des événements (« à ajouter ») — CL-02 / CL-14 — CEV-07 | ☑ |
| CL-D03.A27 | 06 | Remplacer dans CL-12 GET /relays?near= par GET /relais?near= et dans CL-03 GET /legal/current + POST /me/terms-acceptance par GET /legal/{doc} + POST /me/legal/accept — CL-03, CL-12 — CAP-01 (tableau des alias) | ☐ |
| CL-D03.A28 | 06 | Aligner les routes relais côté client (POST /relay/disputes, POST /relay/returns/{id}/deposit) avec l’API relais (POST /relay/claims, POST /relay/returns/drop) — CL-02 / PR-02 / CL-16 — une action = une route | ☐ |
| CL-D03.A29 | 06 | Vérifier l’expires_at de l’exemple POST /checkout (09:24 pour une demande de 09 h 02 = 22 min) face à T_val = 24 min — exemple API CL-02 p63 — cohérence du jeu d’essai | ☑ |
| CL-D03.A30 | 06 | Trancher les paramètres OTP (10 min, 5 essais, 15 min, 60 s, 3/h) — registre CL-16 — CAP-14 | ☑ |
| CL-D03.A31 | 06 | Fixer la durée de conservation des messages vocaux (après lancement) — CL-15 / registre — CAP-21 | ☐ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D03.Q01 | 01 | Positions multiples pour une même boutique (écarts ✗ signalés par le document). | répondu par les données (revue/CL-02.md) |
| CL-D03.Q02 | 01 | Relais Melen : Mme Eyenga (client) vs Mireille (console) ; Relais Bastos M. Nkodo (client) ; Biyem-Assi en configuration (client) vs relais actif (console). | répondu par les données (revue/CL-02.md) |
| CL-D03.Q03 | 01 | Seuils de palier vendeur VD-10 (Argent ≥ 65, Or ≥ 80, Platine ≥ 90) vs seuils cités ailleurs (ADM : descente sous 60 pour Argent, seuil 65) — à rapprocher. | à décider (revue/decisions.md) |
| CL-D03.Q04 | 01 | Mixeur à « 4,8 km ; 1,2 km » : deux offres affichées dans la même cellule. | répondu par les données (revue/CL-02.md) |
| CL-D03.Q05 | 02 | 5 écarts du bilan (distances Or · 91, Argent · 78, Bronze · 64 ; heure hors ligne ; RET-SANS-RETOUR 3 000 vs 5 000 F). | répondu par les données (revue/CL-02.md) |
| CL-D03.Q06 | 02 | Délai de préparation de la marmite (6 h boutique Mvan) vs « dès 15 h ». | répondu par les données (revue/CL-02.md) |
| CL-D03.Q07 | 02 | Support : « 4 h ouvrées » vs 2 h (ADM-P29R-04). | DP-12 : décidée (decisions-porteur.md) |
| CL-D03.Q08 | 02 | Même carte Visa •••• 4821 pour Hervé et Éric. | répondu par les données (revue/CL-02.md) |
| CL-D03.Q09 | 02 | Routes relais divergentes entre spécification client et API relais. | à décider (revue/decisions.md) |
| CL-D03.Q10 | 03 | Routes relais divergentes (disputes/claims, deposit/drop). | à décider (revue/decisions.md) |
| CL-D03.Q11 | 03 | Remboursement de rupture : ADM-P06R-02 « jour même » sans mention du vendeur suivant ; CCY-06 prévoit d’abord le vendeur suivant. | DP-01 : décidée (decisions-porteur.md) |
| CL-D03.Q12 | 04 | Code de retrait : « haché » (spec, ADM-PRV-03) vs « chiffré + HMAC » (CDA-27) — le réaffichage au client impose le chiffrement. | DP-02 : décidée (decisions-porteur.md) |
| CL-D03.Q13 | 04 | Arrondis différents : « Prêt dans X h » arrondi à l’heure (4 h 45 → 5 h) vs « réponse sous X h » arrondi à l’inférieur. | répondu par les données (revue/CL-02.md) |
| CL-D03.Q14 | 04 | Prestataire carte et SMS de secours non désignés. | DP-03 : décidée (decisions-porteur.md) |
| CL-D03.Q15 | 05 | Garde doublée du colis L (console ADM-TAR-04 / K-24, relais CAL-03) non reprise dans la grille client CAL-19. | DP-08 : décidée (decisions-porteur.md) |
| CL-D03.Q16 | 05 | Paliers vendeur VD-10 (65/80/90) à rapprocher des seuils console. | répondu par les données (revue/CL-02.md) |
| CL-D03.Q17 | 05 | Événement zone.alert marqué « (proposé) » avec émetteur ambigu. | à décider (revue/decisions.md) |
| CL-D03.Q18 | 06 | Routes relais divergentes entre documents client et API relais. | à décider (revue/decisions.md) |
| CL-D03.Q19 | 06 | Exemple POST /checkout : expires_at 09:24 (22 min) vs fenêtre de 24 min. | répondu par les données (revue/CL-02.md) |
| CL-D03.Q20 | 06 | Mot de passe client ≥ 8 caractères vs console ≥ 12 caractères (espaces différents, à confirmer). | DP-04 : décidée (decisions-porteur.md) |
| CL-D03.Q21 | 06 | CAP-14 À trancher (paramètres OTP). | DP-05 : décidée (decisions-porteur.md) |

## 04 · CL-03

04 — CL-03 — Premier lancement, inscription et première commande — dossier : 01_Documents / 3 — Écrans, un document par groupe d’écrans / 04 — CL-03 — Premier lancement, inscription et première commande

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D04.A01 | 01 | Faire relire les textes pidgin par un traducteur camerounais avant production — CL-03 / CL-13 — CIN-09, CRG-02 | ☐ |
| CL-D04.A02 | 01 | Remplacer dans la spécification « Tout près de vous » par « Tout près de toi » et « 24-72 h · Livraison » par « Moins de 5 h » — spec v3 §3.1 — CIN-04, CIN-07 | ☐ |
| CL-D04.A03 | 01 | Ajouter au jeu d’essai commun la référence BLV-52131 (première commande) comme variante signalée (hors des 8 commandes de Carine) — CL-02 variantes — CDA-14 | ☐ |
| CL-D04.A04 | 01 | Trancher les paramètres OTP (10 min, 5 essais, 15 min, 60 s) montrés comme valeurs proposées — registre CL-16 — CAP-14 | ☑ |
| CL-D04.A05 | 01 | Aligner le statut du Relais Biyem-Assi (« En configuration ») avec la console (relais actif) — CL-02 / ADM — cohérence du jeu d’essai | ☐ |
| CL-D04.A06 | 02 | Corriger la mise à niveau qui dit « bouton Google 52 px » alors que la densité du 26 sept. fixe 46 px — CL-03 mise à niveau Connexion — CDS-11 / simplifications du 26 sept. | ☐ |
| CL-D04.A07 | 02 | Remplacer le G monochrome du prototype par le logo Google officiel en production — front — CIN-19 | ☐ |
| CL-D04.A08 | 02 | Aligner les horaires du support (SUP-HORAIRES 7 h – 21 h) avec l’accueil « aide 7 j/7 » et le délai de réponse hors heures (réponse avant 11 h pour un message de 22 h 40) — CL-04 / CL-13 / ADM-P29R-04 — cohérence | ☑ |
| CL-D04.A09 | 02 | Faire traduire en pidgin les feuilles Google et « compte existant » (restées en français) ou le signaler — CL-03 — CIN-09 | ☐ |
| CL-D04.A10 | 03 | Trancher OTP-DUREE, OTP-ESSAIS, OTP-RENVOI (valeurs proposées 10 min, 5 essais + 15 min, 60 s, 3/h) — registre CL-16 — CIN-33, CAP-14 | ☑ |
| CL-D04.A11 | 03 | Tenir en paramètre la table des préfixes MTN/Orange (et la mettre à jour avec les nouveaux préfixes) — console / registre — CIN-32 | ☐ |
| CL-D04.A12 | 03 | Faire répondre l’API de paiement « numéro non vérifié » pour tout compte sans numéro vérifié — back / CL-08 — CIN-29 (critère 1) | ☐ |
| CL-D04.A13 | 03 | Vérifier dans le journal des messages qu’aucun autre SMS que le code ne part vers un numéro non vérifié — back / QA — CIN-31 | ☐ |
| CL-D04.A14 | 04 | Remplacer « l’ancien haché supprimé » par le stockage retenu (chiffré + HMAC, CDA-27) dans le déroulé du changement de numéro — CL-03 déroulé étape 4 — CDA-27 | ☐ |
| CL-D04.A15 | 04 | Aligner le statut du Relais Biyem-Assi (« aucun relais ouvert » côté client) avec la console (Relais Biyem-Assi actif, retrait BLV-00005 le 24 sept.) — CL-02 / CL-03 / ADM — cohérence du jeu d’essai | ☐ |
| CL-D04.A16 | 04 | Vérifier que Mvog-Ada, Essos, Mvan, Soa sont bien des zones du découpage (12 zones) et la liste des zones exploitées (Z1 Bastos, Z3 Mokolo, Z6 Melen, Z7 Biyem-Assi) — CL-03 / ADM-ZON-01 — cohérence territoire | ☑ |
| CL-D04.A17 | 04 | Définir la procédure support de changement de numéro sans accès à l’ancien (vérification d’identité humaine) — CL-13 / ADM support — CIN-42 | ☐ |
| CL-D04.A18 | 05 | Corriger la spec 3.5 (tri « par temps de trajet ») ou 3.4 (tri par distance) pour une seule règle, en gardant l’affichage des deux — spec v3 §3.4/§3.5 — CPR-13 | ☐ |
| CL-D04.A19 | 05 | Corriger la spec 19.1 (« prénom et quartier seulement » pour le livreur) pour inclure l’adresse par repères pendant la livraison à domicile — spec v3 §19.1 — CPR-23, CVI-03 | ☐ |
| CL-D04.A20 | 05 | Vérifier que l’API ne renvoie jamais un relais « En configuration », plein ou fermé — back GET /relais — CPR-03 (critère 3) | ☐ |
| CL-D04.A21 | 06 | Aligner l’exemple de la feuille v2.0 (« moins de 3 000 F ») sur RET-SANS-RETOUR proposé 5 000 F (CL-11) — docs/content/cl03.py — point signalé CL-02, CDA-19 | ☐ |
| CL-D04.A22 | 06 | Remplacer GET /legal/current + POST /me/terms-acceptance par GET /legal/{doc} + POST /me/legal/accept (routes retenues) — CL-03 « Pour le développeur » / feuille CGU — CAP-01, alias CL-02 | ☐ |
| CL-D04.A23 | 06 | Corriger le critère « Les six pages légales » en « huit pages légales » (liste CL-13) — CL-03 critères CCG — CCG-01 | ☐ |
| CL-D04.A24 | 06 | Inscrire OTP-DUREE, OTP-ESSAIS, OTP-RENVOI, MDP-LIEN, MDP-ESSAIS au registre 19.4 de la spécification — spec v3 §19.4 / CL-16 — CIN-33 | ☐ |
| CL-D04.A25 | 06 | Supprimer la mention « Numéroté 15 » (3.0) de la spécification — spec v3 §3.0 — écart relevé | ☐ |
| CL-D04.A26 | 06 | Ajouter terms_version et terms_accepted_at au modèle Client de la spec 2.6 — spec v3 §2.6 — CCG-03 | ☐ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D04.Q01 | 01 | Référence BLV-52131 non listée dans les variantes de CL-02. | répondu par les données (revue/CL-03.md) |
| CL-D04.Q02 | 01 | Pidgin absent de la v3 : à confirmer par le porteur. | DP-13 : décidée (decisions-porteur.md) |
| CL-D04.Q03 | 01 | Biyem-Assi « En configuration » côté client vs relais actif côté console. | répondu par les données (revue/CL-03.md) |
| CL-D04.Q04 | 02 | Bouton Google 46 px (figure, simplification) vs 52 px (mise à niveau). | répondu par les données (revue/CL-03.md) |
| CL-D04.Q05 | 02 | Support 7 h – 21 h vs « aide 7 j/7 » (accueil) : jours d’ouverture à préciser. | DP-12 : décidée (decisions-porteur.md) |
| CL-D04.Q06 | 03 | CIN-33 À trancher (paramètres OTP). | DP-05 : décidée (decisions-porteur.md) |
| CL-D04.Q07 | 03 | « 3 envois par heure » cité dans les calculs mais absent de la règle CIN-33. | répondu par les données (revue/CL-03.md) |
| CL-D04.Q08 | 04 | Biyem-Assi : zone exploitée Z7 côté console mais sans relais ouvert côté client. | répondu par les données (revue/CL-03.md) |
| CL-D04.Q09 | 04 | Quartiers du jeu d’essai client (Mvog-Ada, Essos, Mvan) hors des zones exploitées citées par la console. | DP-09 : décidée (decisions-porteur.md) |
| CL-D04.Q10 | 04 | Code de retrait « haché » vs « chiffré » (CDA-27). | DP-02 : décidée (decisions-porteur.md) |
| CL-D04.Q11 | 05 | Tri relais : distance (3.4) vs temps de trajet (3.5). | répondu par les données (revue/CL-03.md) |
| CL-D04.Q12 | 05 | Livreur : « prénom et quartier » (19.1) vs adresse complète (2.4, 9.5). | répondu par les données (revue/CL-03.md) |
| CL-D04.Q13 | 06 | RET-SANS-RETOUR : 3 000 F montré ici vs 5 000 F proposé (CL-11). | DP-10 : décidée (decisions-porteur.md) |
| CL-D04.Q14 | 06 | « Six » vs « huit » pages légales. | répondu par les données (revue/CL-03.md) |
| CL-D04.Q15 | 06 | Routes légales divergentes (current/terms-acceptance vs {doc}/legal/accept). | répondu par les données (revue/CL-03.md) |
| CL-D04.Q16 | 06 | NOT-CONSERV 12 mois (Proposé) à valider juridiquement. | DP-33 : décidée (decisions-porteur.md) |

## 05 · CL-04

05 — CL-04 — Accueil, catégories et listing — dossier : 01_Documents / 3 — Écrans, un document par groupe d’écrans / 05 — CL-04 — Accueil, catégories et listing

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D05.A01 | 01 | Corriger « 12 quartiers = zones exploitées au lancement » : 12 zones définies dont 4 exploitées (Z1, Z3, Z6, Z7), 8 en vente seulement — carte BelivaY, bandeau rotatif « Retrait au relais dans 12 quartiers » — ADM-ZON-01, ADM-P21R-01, CCH-06 | ☐ |
| CL-D05.A02 | 01 | Vérifier « aide 7 j/7 » face aux horaires du support (7 h – 21 h, SUP-HORAIRES) et jours d’ouverture — carte BelivaY / CL-13 — CCH-34 | ☑ |
| CL-D05.A03 | 01 | Éviter la troncature « rouvre dema… » de la barre flottante (texte ou mise en page) — accueil?st=ferme — CRD-01 (rien de tronqué) | ☐ |
| CL-D05.A04 | 01 | Trancher LIV-SUPPL-M / L et le supplément XL affichés sur les cartes — registre CL-16 — CDS-16 | ☑ |
| CL-D05.A05 | 02 | Trancher ACC-RANGEE-MIN (3 montré ; seuil d’écran 6 cartes cité dans CL-02) — registre CL-16 — CAC-19 | ☑ |
| CL-D05.A06 | 02 | Vérifier pourquoi les rangées ne s’affichaient pas dans l’application actuelle (requête par catégorie, pagination, chargement différé) avant de coder — back/front — CAC-22 | ☐ |
| CL-D05.A07 | 02 | Préciser la règle ACC-NOUVEAUX « 10 à 20 % » vs formule appliquée ⌊0,2 × longueur⌋ (0 place pour 4 cartes, alors que « jamais zéro » est annoncé) — CL-04 / registre — CAC-21 | ☑ |
| CL-D05.A08 | 03 | Trancher côté vendeur l’écart « Mise en avant 24 h » vendue dans une bande « Sponsorisé » (VD-10) alors que la v3 interdit toute bande « Sponsorisé » côté client (et ADM-P25R-06 : jamais dans la recherche) — VD-10 / CL-16 liaisons (ligne 72) / ADM-P25R-06 — CCT-08 | ☑ |
| CL-D05.A09 | 03 | Rechercher et supprimer dans tout le code les chiffres en dur (15 240, 3 400, 3 200, 50K+, 4.8, 102…) — front/back — CCR-01 | ☐ |
| CL-D05.A10 | 03 | Unifier les libellés de taxonomie (un seul nom par catégorie : pas de « BEAUTÉ & SOINS », « TÉLÉPHONIE », « références ») — console taxonomie — CCT-10 | ☐ |
| CL-D05.A11 | 04 | Corriger les renvois de figures de la couverture (hub « figures 7 et 8 » → 8 et 9 ; listing « figures 9 à 14 » → 10 à 15) — CL-04 couverture p49 — cohérence du document | ☐ |
| CL-D05.A12 | 04 | Créer un code de paramètre pour seuil_écran (6, sans code aujourd’hui) — registre CL-16 — CCH-15, CDA-22 | ☑ |
| CL-D05.A13 | 04 | Trancher LIV-SUPPL-M / L — registre CL-16 — CLS-10 | ☑ |
| CL-D05.A14 | 04 | Fixer la taille de page du curseur (12 cartes proposées) en paramètre — API / registre — CAP-05 (20 résultats) vs 12 : à harmoniser | ☑ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D05.Q01 | 01 | « 12 quartiers exploités » vs 4 zones exploitées côté console. | DP-09 : décidée (decisions-porteur.md) |
| CL-D05.Q02 | 01 | « Aide 7 j/7 » vs support 7 h – 21 h. | répondu par les données (revue/CL-04.md) |
| CL-D05.Q03 | 01 | Règle 4.1 de la spécification écartée par décision du porteur (écart assumé). | répondu par les données (revue/CL-04.md) |
| CL-D05.Q04 | 02 | ACC-RANGEE-MIN À trancher (3 montré vs seuil d’écran 6 dans CL-02). | DP-11 : décidée (decisions-porteur.md) |
| CL-D05.Q05 | 02 | « Jamais zéro » nouveaux produits (CAC-21) vs 0 emplacement pour une rangée de 4 cartes (calcul). | DP-11 : décidée (decisions-porteur.md) |
| CL-D05.Q06 | 03 | Bande « Sponsorisé » de la mise en avant vendeur (VD-10) interdite côté client. | DP-14 : décidée (decisions-porteur.md) |
| CL-D05.Q07 | 03 | « 18 produits » (recherche) cité comme exemple de compteur : à rapprocher des 23 résultats du jeu « chargeur tecno ». | répondu par les données (revue/CL-04.md) |
| CL-D05.Q08 | 04 | Taille de page : 12 cartes (listing, proposé) vs 20 éléments (CAP-05). | DP-11 : décidée (decisions-porteur.md) |
| CL-D05.Q09 | 04 | Renvois de figures décalés dans la couverture. | répondu par les données (revue/CL-04.md) |
| CL-D05.Q10 | 04 | seuil_écran sans code de paramètre. 10.5 | répondu par les données (revue/CL-04.md) |

## 06 · CL-05

06 — CL-05 — Recherche — dossier : 01_Documents / 3 — Écrans, un document par groupe d’écrans / 06 — CL-05 — Recherche

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D06.A01 | 01 | Corriger CRE-17 : l’explication de « on cherche » n’est plus un encadré en tête de liste (retiré le 26 sept.) mais une ligne d’aide sous la liste — CL-05 règle CRE-17 — simplification du 26 sept. | ☐ |
| CL-D06.A02 | 01 | Créer les paramètres RECH-TENDANCES (k = 5, 7 jours) et RECH-SUGG-MAX (6, 150 ms) au registre — registre CL-16 — CCH-15 | ☑ |
| CL-D06.A03 | 01 | Retirer la puce « Produits demo » et toute catégorie de test en production — taxonomie / données — ADM-PRI-06, ADM-LAN-04 | ☐ |
| CL-D06.A04 | 01 | Retirer le bouton filtre (entonnoir) de la barre commune — socle — CRE-37 | ☐ |
| CL-D06.A05 | 02 | Retirer de la composition des filtres (point 5) la mention « l’encadré nuit sur le choix grisé », supprimé à la refonte du 26 sept. — CL-05 composition Filtres — simplifications du 26 sept. | ☐ |
| CL-D06.A06 | 02 | Harmoniser la taille de page : 20 résultats (RECH-PAGE, CAP-05) vs 12 cartes (listing CL-04) — CL-04 / CL-05 / API — cohérence | ☑ |
| CL-D06.A07 | 02 | Créer RECH-PAGE et LIV-SUPPL-XL au registre et trancher LIV-SUPPL-M/L/XL — registre CL-16 — CCH-15, CCH-21 | ☑ |
| CL-D06.A08 | 02 | Vérifier la cohérence des marques « chargeur tecno » (Tecno 9, Oraimo 6, Sans marque 5, itel 3 = 23) avec le jeu d’essai CL-02 (23 produits = 7 détaillés + 16 autres) — CL-02 / CL-05 — CDA-01 | ☐ |
| CL-D06.A09 | 03 | Mettre à jour la règle vendeur DEC-15 (« prix, zone du vendeur, disponibilité, marque ») : remplacer « zone du vendeur » par la livrabilité — VD (DEC-15) / règles partagées écart 71 — CRE-32 | ☐ |
| CL-D06.A10 | 03 | Trancher l’écart 72 : la bande « Sponsorisé » payante de l’espace vendeur (accueil, catégorie) n’entre jamais dans la recherche et est interdite côté client — VD / produit / CL-16 — CRM-13, CCT-08 | ☑ |
| CL-D06.A11 | 03 | Créer RECH-TENDANCES, RECH-SUGG-MAX, RECH-PAGE au registre — registre CL-16 — CCH-15 | ☑ |
| CL-D06.A12 | 03 | Mettre en place la table des synonymes locaux et la validation de l’appariement IA en console — ADM (catalogue, ADM-P13R-04) — CRM-01, CRM-07 | ☐ |
| CL-D06.A13 | 03 | Intégrer les 13 produits de DX_cl05 au jeu d’essai commun (D.p, JEU_ESSAI.md) — CL-02 / data.js — CDA-18 | ☐ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D06.Q01 | 01 | CRE-17 renvoie à un encadré supprimé. | répondu par les données (revue/CL-05.md) |
| CL-D06.Q02 | 01 | Paramètres RECH-TENDANCES et RECH-SUGG-MAX « à créer ». | répondu par les données (revue/CL-05.md) |
| CL-D06.Q03 | 02 | Encadré du choix grisé : retiré (Fig. 13) mais encore cité dans la composition. | répondu par les données (revue/CL-05.md) |
| CL-D06.Q04 | 02 | Pages de 20 (recherche) vs 12 (listing). | répondu par les données (revue/CL-05.md) |
| CL-D06.Q05 | 03 | Écart 71 (DEC-15 vendeur) et écart 72 (bande « Sponsorisé ») à trancher côté produit. | à décider (revue/decisions.md) |
| CL-D06.Q06 | 03 | Rang de la ligne de preuve : 57e (jeu d’essai) vs 96e (exemple de la spec) — valeur d’exemple. 11.5 | répondu par les données (revue/CL-05.md) |

## 07 · CL-06

07 — CL-06 — Fiche produit et avis — dossier : 01_Documents / 3 — Écrans, un document par groupe d’écrans / 07 — CL-06 — Fiche produit et avis

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D07.A01 | 01 | Aligner les stocks de la fiche avec le jeu d’essai CL-02 (Camon 30 : « 23 disponibles » vs stock 52 ; Galaxy A15 : « 12 disponibles » vs 19) ou préciser qu’il s’agit du stock de la variante — CL-06 / CL-02 DX_cl06 — CDA-01, CDA-18 | ☐ |
| CL-D07.A02 | 01 | Vérifier la garantie « support 7 j/7 » face aux horaires du support (7 h – 21 h) — tuiles de garantie — CCH-34 | ☑ |
| CL-D07.A03 | 01 | Faire répondre l’API de la fiche sans nom de boutique (test automatique) — back — CFP-11, CVI-01 | ☐ |
| CL-D07.A04 | 01 | Trancher le supplément XL (1 500 F) et M/L (200/300 F) affichés sur la fiche — registre CL-16 — CDS-16, CAL-09 | ☑ |
| CL-D07.A05 | 02 | Trancher l’écart relais v2.0 CAP-07 (refus possible des colis L « signalés au client dès la commande ») absent de la v3 ; si retenu, afficher « ce relais n’accepte pas les colis L » et proposer le domicile — PR (CAP-07) / CL-06 / CL-16 — cohérence relais-client | ☑ |
| CL-D07.A06 | 02 | Créer LIV-SUPPL-XL au registre et trancher sa valeur (1 500 F affiché) — registre CL-16 — CFP-29 | ☑ |
| CL-D07.A07 | 02 | Remplacer dans la spec 6.2 la fourchette « 24-72 h » par une heure/date ferme — spec v3 §6.2 — CFP-26 | ☐ |
| CL-D07.A08 | 02 | Vérifier que la remise au relais vaut 400 F partout (fiche, panier, notification, écran du gérant) — tarification / PR — critère 4, CCH-08 | ☑ |
| CL-D07.A09 | 03 | Corriger la tuile « support 7 j/7 » : le fait retenu est « support 7 h – 21 h » (préciser jours et heures) — fiche, tuiles de garantie — CFP-31, CCH-34 | ☐ |
| CL-D07.A10 | 03 | Trancher AVIS-FENETRE (7 jours proposés) — registre CL-16 — CLA-04 | ☑ |
| CL-D07.A11 | 03 | Harmoniser le vocabulaire « acheteur(s) vérifié(s) », « photo d’acheteur » (v3 client) avec les espaces vendeur et relais qui évitent « escrow » et « acheteur » — VD / PR / CL-16 — écart relevé | ☑ |
| CL-D07.A12 | 03 | Imputer au transporteur un avis bas causé par le transport (boîte abîmée, retard) sans pénaliser le vendeur — ADM arbitrage / Trust Score — liaisons CLA | ☐ |
| CL-D07.A13 | 04 | Ajouter à la v3 la règle vendeur MSG-02 (fil fermé à la fin du délai de litige ; « Client de BLV-… » après commande) — spec v3 / CL-16 liaisons vendeur — CQV-06 | ☐ |
| CL-D07.A14 | 04 | Retirer de la section 6.3 la mention « Écrit par le vendeur, en français, avec ses mots. » (retirée à la refonte du 26 sept.) — CL-06 §6.3 — CFP-34 | ☐ |
| CL-D07.A15 | 04 | Aligner le message de refus vendeur (vouvoiement « Décrivez… ») avec la charte ou documenter l’écart — VD-08 / CL-16 — CFP-47 | ☐ |
| CL-D07.A16 | 04 | Ajouter la route POST /me/alerts et l’événement alert.created à la spec 6.5 — spec v3 §6.5 — CVA-07 | ☐ |
| CL-D07.A17 | 04 | Corriger dans la spec 6.4 « Titane naturel · 256 Go » en « Gris titane · 256 Go » et « 312 vendus » en 412 (jeu d’essai) — spec v3 §6.4 — cohérence du jeu d’essai | ☐ |
| CL-D07.A18 | 04 | Trancher l’écart relais CAP-07 (refus des colis L) — PR / CL-16 — écart relevé | ☑ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D07.Q01 | 01 | Stock Camon 30 : 23 (fiche) vs 52 (CL-02) ; Galaxy A15 : 12 vs 19. | répondu par les données (revue/CL-06.md) |
| CL-D07.Q02 | 01 | « Support 7 j/7 » (tuile de garantie) vs support 7 h – 21 h. | DP-12 : décidée (decisions-porteur.md) |
| CL-D07.Q03 | 01 | « Platine 90 tenu 6 mois » : durée à rapprocher de l’hystérésis 14 jours de la console (ADM-TSC-03). | DP-21 : décidée (decisions-porteur.md) |
| CL-D07.Q04 | 02 | Écart CAP-07 relais (refus des colis L) vs v3. | DP-20 : décidée (decisions-porteur.md) |
| CL-D07.Q05 | 02 | LIV-SUPPL-M/L/XL à trancher. | DP-07 : décidée (decisions-porteur.md) |
| CL-D07.Q06 | 02 | Vendeur « Argent · 77 » (Noir 128 Go) absent du jeu d’essai CL-02. | répondu par les données (revue/CL-06.md) |
| CL-D07.Q07 | 03 | « Support 7 j/7 » vs « support 7 h – 21 h ». | DP-12 : décidée (decisions-porteur.md) |
| CL-D07.Q08 | 03 | Vocabulaire « acheteur/escrow » différent entre client et vendeur/relais. | DP-22 : décidée (decisions-porteur.md) |
| CL-D07.Q09 | 03 | AVIS-FENETRE à trancher. | DP-15 : proposée (decisions-porteur.md) |
| CL-D07.Q10 | 04 | Stock Camon 30 : résolu — 52 (CL-02) = 23 + 14 + 9 + 6 (stocks par variante) ; la fiche affiche le stock de la variante (23). | répondu par les données (revue/CL-06.md) |
| CL-D07.Q11 | 04 | « Support 7 j/7 » : SUP-HORAIRES = 7 h – 21 h, 7 j/7 (Proposé) — cohérent si retenu ; à valider face au délai « 4 h ouvrées » cité dans CL-02. | DP-12 : décidée (decisions-porteur.md) |
| CL-D07.Q12 | 04 | Colis L refusés par un relais (CAP-07) : à trancher. | DP-20 : décidée (decisions-porteur.md) |
| CL-D07.Q13 | 04 | Supplément XL : à trancher. 12.5 | DP-07 : décidée (decisions-porteur.md) |

## 08 · CL-07

08 — CL-07 — Panier et frais — dossier : 01_Documents / 3 — Écrans, un document par groupe d’écrans / 08 — CL-07 — Panier et frais

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D08.A01 | 01 | Vérifier l’usage de –or (orange du logo « jamais un texte ») comme couleur de section A et de barre — styles / CPN-07 — CRD-08 (–or décor seulement, OK si barre non textuelle) | ☑ |
| CL-D08.A02 | 01 | Retirer le champ « Ajouter un code promotionnel » (aucun code promo au lancement, ADM-P26R-11 désactivé) — panier — CPN (mise à niveau) | ☐ |
| CL-D08.A03 | 01 | Tester qu’aucune réponse d’API du panier ne contient de nom de boutique — back / CI — CPN-09 | ☐ |
| CL-D08.A04 | 02 | Vérifier CFR-24 : la remise de 400 F par groupe ne couvre pas la part relais quand le groupe a plusieurs colis (3 colis × 200 F = 600 F au Relais Mvog-Ada pour BLV-52107 ou le panier de référence) — tarification / ADM-TAR-02 / ADM-MOD-06 — jamais à perte | ☑ |
| CL-D08.A05 | 02 | Trancher CFR-20 : Rem_dom dû une fois ou par colis pour un panier multi-boutiques livré à domicile — registre CL-16 / porteur — CFR-20 | ☑ |
| CL-D08.A06 | 02 | Trancher LIV-SUPPL-M/L et le supplément XL — registre CL-16 — CFR-18, CFR-19 | ☑ |
| CL-D08.A07 | 02 | Remplacer dans la spec 7.2 la phrase « Tu ne paies rien tant que les vendeurs n’ont pas confirmé… retrait dès demain » (fausse) par la phrase CPN-30 — spec v3 §7.2 — CPN-30 | ☐ |
| CL-D08.A08 | 02 | Garantir qu’un double clic sur « Passer commande » ne crée qu’une demande (idempotence) — back / CL-08 — CPN-33, CAP-03 | ☐ |
| CL-D08.A09 | 03 | Corriger la spec 10.6 (interdit « panier transmis par WhatsApp ») ou 7.4 (envoi du panier par WhatsApp) pour préciser que seul BelivaY n’envoie rien, le client partageant un lien étant permis — spec v3 §10.6 / §7.4 — CPN-47 | ☐ |
| CL-D08.A10 | 03 | Revoir la répartition de la remise de 400 F quand un groupe compte plusieurs colis (relais payé par colis) — tarification / PR / ADM — CFR-24 (écart signalé dans partie 02) | ☑ |
| CL-D08.A11 | 03 | Trancher l’écart CAP-07 (refus des colis L par un relais) et appliquer le même encadré et la même bascule que pour l’XL si retenu — PR / CL-16 — liaisons CL-07 | ☑ |
| CL-D08.A12 | 03 | Mettre en place les tests automatiques de chaque ligne du tableau des états et le test « service de tarification coupé » — QA / back — CFR-25, critère 4 | ☐ |
| CL-D08.A13 | 04 | Corriger JEU_ESSAI.md : « Colis prêts sous 6 h, retrait dès aujourd’hui 17 h » pour le panier de référence (15 h seulement après « Changer d’offre ») — JEU_ESSAI.md / CL-02 — écart relevé | ☐ |
| CL-D08.A14 | 04 | Fixer l’expiration du lien de paiement partagé (comme la réservation du panier partagé) avec le chapitre 13 — CL-12 / CL-07 — à fixer | ☐ |
| CL-D08.A15 | 04 | Traiter l’article seul au-dessus du plafond carte (Camon 30 150 699 F > 150 000 F) dans la spec 13.6 (« plusieurs commandes » ne suffit pas) — spec v3 §13.6 / CL-12 — écart relevé | ☐ |
| CL-D08.A16 | 04 | Trancher CFR-19 (XL) et CFR-20 (domicile multi-boutiques) — registre CL-16 — À trancher | ☐ |
| CL-D08.A17 | 04 | Rendre les routes favoris proposées (GET/PATCH/DELETE /me/favorites) officielles dans la spec — spec v3 §6.5/§7.5 — CSG | ☐ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D08.Q01 | 01 | Couleur de la section A = –or (orange du logo, réservé au décor) : acceptable pour une barre, jamais pour un texte. | répondu par les données (revue/CL-07.md) |
| CL-D08.Q02 | 02 | Remise relais 400 F par groupe vs rémunération relais 200 F × nombre de colis (CFR-24). | DP-18 : décidée (decisions-porteur.md) |
| CL-D08.Q03 | 02 | Rem_dom multi-colis (CFR-20) non tranché. | DP-19 : décidée (decisions-porteur.md) |
| CL-D08.Q04 | 02 | Ancienne remise 900 F / base 1 400 F corrigée : vérifier qu’aucun document ne la garde. | répondu par les données (revue/CL-07.md) |
| CL-D08.Q05 | 03 | Contradiction 10.6 / 7.4 sur le partage par WhatsApp (arbitrée par CPN47). | répondu par les données (revue/CL-07.md) |
| CL-D08.Q06 | 03 | Remise relais 400 F vs rémunération par colis. | DP-18 : décidée (decisions-porteur.md) |
| CL-D08.Q07 | 03 | CAP-07 relais. | DP-20 : décidée (decisions-porteur.md) |
| CL-D08.Q08 | 04 | JEU_ESSAI.md « dès 15 h » vs calcul 17 h. | répondu par les données (revue/CL-07.md) |
| CL-D08.Q09 | 04 | Expiration du lien de paiement partagé non fixée. | à décider (revue/decisions.md) |
| CL-D08.Q10 | 04 | Article seul au-dessus de 150 000 F payé par carte. 13.5 | répondu par les données (revue/CL-07.md) |

## 09 · CL-08

09 — CL-08 — Paiement et confirmation — dossier : 01_Documents / 3 — Écrans, un document par groupe d’écrans / 09 — CL-08 — Paiement et confirmation

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D09.A01 | 01 | Supprimer l’affichage d’une « commande » (numéro, suivi, « Montant à payer ») avant le webhook de succès dans l’application actuelle — application / back — CPY-07 | ☐ |
| CL-D09.A02 | 01 | Mettre en place les codes 409 price_changed, item_taken, item_removed et la route POST /checkout/confirm — back — CPY-11, CPY-15 | ☐ |
| CL-D09.A03 | 01 | Vérifier la cohérence de l’exemple POST /checkout de CL-02 (expires_at 09:24 pour une demande à 09 h 02) avec T_val 24 min (ici 10 h 14 → 10 h 38) — CL-02 / CL-08 — PAY-TVAL | ☐ |
| CL-D09.A04 | 01 | Faire passer toute règle d’escrow par la double validation console — ADM-4YE-01 — liaisons CL-08 | ☐ |
| CL-D09.A05 | 02 | Clarifier si la carte est réservée au payeur de l’étranger (ADM-CON-07 « carte (diaspora) », section « DEPUIS L’ÉTRANGER ») ou ouverte à la cliente locale (Fig. 11/14 : Carine paie par carte le panier seuil) — CL-08 / CL-12 / ADM-CON-07 — cohérence | ☑ |
| CL-D09.A06 | 02 | Ajouter le SMS d’échec de paiement à la liste des SMS de 10.3 ou confirmer qu’il est une variante de C4 comptée dans SMS-MAX-CMD — spec v3 §10.3 / CL-10 — CPY-43 | ☑ |
| CL-D09.A07 | 02 | Remplacer le masque « 6 77 41 » de la spécification par « 6 77 ·· ·· 41 » — spec v3 §8.2 — CPY-33 | ☐ |
| CL-D09.A08 | 02 | Tenir en console la table de correspondance des codes CamPay/Fapshi et l’alerte sur réponse inconnue — ADM / console — CPY-37 | ☐ |
| CL-D09.A09 | 02 | Rembourser automatiquement un webhook de succès tardif sur tentative annulée quand les articles ne sont plus réservables — back / escrow — CPY-32 | ☐ |
| CL-D09.A10 | 03 | Supprimer la route, la tuile « Wallet » et les endpoints de solde / dépôt, et le numéro « +237 655 000 000 · Compte officiel BelivaY » — application client / back — CPY-51 (monnaie électronique, fraude) | ☐ |
| CL-D09.A11 | 03 | Supprimer toute validation manuelle de dépôt (« Crédit sous 24–72h ») — console / back — CPY-26 | ☐ |
| CL-D09.A12 | 03 | Tenir en console la table des préfixes par opérateur — ADM / console — CPY-45 | ☐ |
| CL-D09.A13 | 03 | Trancher le prestataire carte PAY-CARTE-PSP (Flutterwave ou CinetPay) — registre — À trancher | ☑ |
| CL-D09.A14 | 03 | Créer l’écran reçu (GET /orders/{id}/receipt, partage natif, cache hors ligne) — application client — CRC-01, CRC-02, 15.4 | ☐ |
| CL-D09.A15 | 03 | Harmoniser « 12 zones de Yaoundé au lancement » avec les 4 zones exploitées de la console — CL-08 p32 / ADM — cohérence (déjà relevé) | ☐ |
| CL-D09.A16 | 03 | Corriger le renvoi « voir Fig. 17 » pour la date ferme (« Retrait possible le jeudi 24 sept. dès 9 h ») : la Fig. 17 montre le partage, pas cette variante — CL-08 composition point 5 — cohérence du document | ☐ |
| CL-D09.A17 | 04 | Choisir un terme commun entre « Validée » (client) et « Payable au retrait » (relais K10, K40 ; vendeur ACC-04) — CL-08 / PR / VD — cohérence vocabulaire | ☑ |
| CL-D09.A18 | 04 | Aligner la civilité/nom du gérant : v3 « Mme Ngo Bassong vous attend » vs relais INS-06 (prénom du gérant) — spec v3 §8.4 / PR INS-06 — CRC-12 | ☐ |
| CL-D09.A19 | 04 | Remplacer le masque « 6 77 ** ** 41 » de la v3 par « 6 77 ·· ·· 41 » — spec v3 — CPY-33 | ☐ |
| CL-D09.A20 | 04 | Trancher avec le relais comment la garde est encaissée en cas de refus au comptoir (colis non retiré) — spec v3 §8.5 / PR — CCP-11 | ☑ |
| CL-D09.A21 | 04 | Corriger dans la v3 la phrase « Tu ne paies rien tant que les vendeurs n’ont pas confirmé » (7.2) qui contredit le débit au paiement — spec v3 §7.2 — cohérence | ☐ |
| CL-D09.A22 | 04 | Ajouter PAY-SONDAGE (3 s puis 10 s) au registre des paramètres — registre / ADM — CPY-60 | ☑ |
| CL-D09.A23 | 04 | Ajouter les routes recommandées POST /checkout/confirm, POST /payments/{id}/cancel, GET /orders/{id}/receipt à la spécification API — spec §8.7 — complétude | ☐ |
| CL-D09.A24 | 04 | Réaliser un paiement réel de bout en bout MTN MoMo et Orange Money (succès puis échec) avant la production — recette — CPY-59 | ☐ |
| CL-D09.A25 | 04 | Ajouter aux garde-fous de la bascule au paiement (8.1) REMPL-TRUST-MIN 75 et REMPL-ECART ≤ 5 % — spec v3 §8.1 — CPY-16 | ☐ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D09.Q01 | 01 | expires_at de l’exemple API CL-02 (22 min) vs fenêtre de 24 min. | répondu par les données (revue/CL-08.md) |
| CL-D09.Q02 | 01 | CPY-16 (garde-fous de bascule au paiement) : Recommandé, repris de 13.2. | répondu par les données (revue/CL-08.md) |
| CL-D09.Q03 | 02 | Carte : paiement local possible (prototype) vs « depuis l’étranger / diaspora » (spec, console). | DP-23 : décidée (decisions-porteur.md) |
| CL-D09.Q04 | 02 | SMS d’échec hors de la liste des 6 SMS (arbitré CPY-43). | répondu par les données (revue/CL-08.md) |
| CL-D09.Q05 | 03 | Retrait « dès 15 h » (Fig. 15) vs « dès 17 h » (Fig. 16, boutique C à Mvan) : cohérent selon le cas, mais à rapprocher du JEU_ESSAI (dès 15 h vs 17 h déjà relevé). | répondu par les données (revue/CL-08.md) |
| CL-D09.Q06 | 03 | Carte « pour payer depuis l’étranger » (CPY-45) vs utilisation locale au panier seuil (Fig. 14/11). | DP-23 : décidée (decisions-porteur.md) |
| CL-D09.Q07 | 03 | Renvoi « voir Fig. 17 » erroné pour la date ferme. | répondu par les données (revue/CL-08.md) |
| CL-D09.Q08 | 03 | PAY-CARTE-PSP à trancher. | DP-03 : décidée (decisions-porteur.md) |
| CL-D09.Q09 | 04 | Terme « Validée » vs « Payable au retrait ». | DP-22 : décidée (decisions-porteur.md) |
| CL-D09.Q10 | 04 | Garde due en cas de refus au comptoir : modalité d’encaissement. | DP-24 : décidée (decisions-porteur.md) |
| CL-D09.Q11 | 04 | Nom du gérant (civilité + nom vs prénom). | répondu par les données (revue/CL-08.md) |
| CL-D09.Q12 | 04 | Libération escrow 14 jours sur carte : à rapprocher des règles de libération CL-09 et des délais vendeur. | répondu par les données (revue/CL-08.md) |
| CL-D09.Q13 | 04 | SMS C1 « 5 à 6 SMS » (CPY-58) vs SMS-MAX-CMD « 6 au plus ». 14.5 | répondu par les données (revue/CL-08.md) |

## 10 · CL-09

10 — CL-09 — Commandes, code, suivi et retrait — dossier : 01_Documents / 3 — Écrans, un document par groupe d’écrans / 10 — CL-09 — Commandes, code, suivi et retrait

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D10.A01 | 01 | Mettre à jour §9.1 de la spec v3 (« aucun filtre », « une seule action », « photo d’abord, numéro en dernier ») pour refléter la décision du porteur du 26 sept. (onglets, puces, deux actions, disposition d’origine) — spec v3 §9.1 — CMC-02, écarts assumés | ☐ |
| CL-D10.A02 | 01 | Retirer de l’API client toute position de livreur et toute coordonnée de boutique ; plan indicatif calculé depuis l’adresse client et la fiche relais — back / API client — 9.3, 9.6, 16.3, 19.1 | ☐ |
| CL-D10.A03 | 01 | Faire renvoyer par GET /me/orders les compteurs d’onglets et de puces, sans jamais compter une tentative non payée — back — CMC-09, CMC-02 | ☐ |
| CL-D10.A04 | 01 | Retirer bandeaux « 3 200+ », « Livraison 24–72h », « Programme Fidélité » et le robot IA de la page Commandes — application client — 19.3, FF-IA | ☐ |
| CL-D10.A05 | 01 | Choisir le fournisseur de fond de plan et sa mention d’attribution — produit — plan indicatif | ☑ |
| CL-D10.A06 | 02 | Masquer les numéros et placer chacun sous son opérateur dans la feuille Paiement ; retirer l’option carte de cette feuille — application client — CMC-50, CL-12 | ☐ |
| CL-D10.A07 | 02 | Réserver la feuille Annulation aux commandes payées ; supprimer son ouverture sur une tentative non payée (« Commande #14 ») — application client — CMC-52, CMC-53 | ☐ |
| CL-D10.A08 | 02 | Transmettre le motif à CL-12 (motif=prix/avis/delai/erreur/paiement/autre) — application client — CMC-52 | ☐ |
| CL-D10.A09 | 02 | Faire renvoyer par le serveur toutes les phrases des cartes (texte localisé, heure arrondie) — back — OrderCard | ☐ |
| CL-D10.A10 | 02 | Entériner dans la charte l’écart « un bouton plein par carte » (vs un par écran) — charte / CL-01 — CMC-25 | ☐ |
| CL-D10.A11 | 02 | Entériner dans la spec v3 §9.1 les écarts assumés (ordre de carte, couleur du litige, deux actions, pas de jauge sur la carte) — spec v3 §9.1 — CMC-19, CMC-22, CMC-23 | ☐ |
| CL-D10.A12 | 03 | Ajouter « Racheter » (POST /orders/{id}/rebuy) et la feuille de rachat — application client / back — CMC-33, CMC-34 | ☐ |
| CL-D10.A13 | 03 | Ajouter « Facture » PDF émise par BelivaY sans nom de boutique — back — CMC-35, CMC-36 | ☐ |
| CL-D10.A14 | 03 | Archiver les commandes > 12 mois hors « Terminées » — back — CMC-39 | ☐ |
| CL-D10.A15 | 03 | Supprimer « Contacter le livreur » après remise et le « Chat de litige » ; remplacer par l’assistant guidé — application client — 19.1, CL-11 | ☐ |
| CL-D10.A16 | 03 | Remplacer l’avis à 5 étoiles préremplies par deux notes séparées étoiles vides (écran avis-donner de CL-13) — application client — CCM-16 | ☐ |
| CL-D10.A17 | 03 | Retirer du détail l’ETA inventée, la carte GPS, le vocabulaire interne, l’adresse de test et les numéros en clair — application client — CMC-42, CMC-49 | ☐ |
| CL-D10.A18 | 03 | Harmoniser la phrase de garde « 1er jour gratuit, puis 100 F par jour » avec la grille à paliers (100 F j2-3, 200 F j4-5, 400 F j6-7 ; 400 F dus le j4, 600 F le j5) — CL-09 chronologie / CL-10 — cohérence | ☑ |
| CL-D10.A19 | 03 | Aligner la livraison à domicile (1 500 F, offerte dès 50 000 F) avec le registre LIV-* — registre / CL-07 — cohérence | ☑ |
| CL-D10.A20 | 04 | Générer la facture côté serveur (PDF, émise par BelivaY, sans boutique) avec l’état « Facture en préparation » — back — CMC-35, CMC-54 | ☐ |
| CL-D10.A21 | 04 | Créer l’écran « Code de retrait » plein écran (QR + 6 chiffres), avec états (pas encore, validée, bloqué, nouveau, hors ligne, retiré) et « Envoyer à quelqu’un » — application client — CCD-02 à CCD-17 | ☐ |
| CL-D10.A22 | 04 | Supprimer l’encart « POINT RELAIS · … code de retrait apparaîtra ici » du suivi — application client — CCD-02 | ☐ |
| CL-D10.A23 | 04 | Vérifier la cohérence « Livraison au relais 900 F » de la facture avec le résumé (ramassage 500 F + remise 400 F) : libellé unique — CL-09 facture / CL-08 — cohérence | ☑ |
| CL-D10.A24 | 05 | Aligner le déblocage après 3 codes faux : relais CAL-31 « seul le support débloque » vs v3/CCD-12 « nouveau code sur demande dans l’application » — PR CAL-31 / CL-09 — cohérence | ☑ |
| CL-D10.A25 | 05 | Trancher la valeur CODE-BIO (50 000 F proposé) — registre — CCD-04 | ☑ |
| CL-D10.A26 | 05 | Implémenter POST /orders/{id}/code/reveal avec preuve de déverrouillage et 409 typés ; QR = jeton signé — back — CCD-04, CCD-18 | ☐ |
| CL-D10.A27 | 05 | Confirmer le stockage du code par hachage seul côté serveur (vs chiffré + HMAC relevé ailleurs) — back / ADM — CCD-18, cohérence déjà relevée | ☑ |
| CL-D10.A28 | 05 | Remplacer le suivi actuel par réponse en tête + plan indicatif + état par colis ; supprimer ETA, carte GPS, vocabulaire interne — application client — CSU-01 à CSU-08 | ☐ |
| CL-D10.A29 | 05 | Mettre en place la détection de retard avec message C4 sous 15 min (INC-NOTIF-MIN) — back / notifications — CSU-09, CSU-10 | ☐ |
| CL-D10.A30 | 05 | Refuser une zone non couverte avant le paiement (au lieu du message « Aucune organisation… » avec coche verte) — back / CL-07 — incident | ☐ |
| CL-D10.A31 | 06 | Créer l’écran « Montant dû » (payer au comptoir en Mobile Money sur le téléphone du client) avec ses états — application client — CCM-01 à CCM-05 | ☐ |
| CL-D10.A32 | 06 | Afficher à l’écran du gérant le même montant dû et l’état de la demande (en attente / payé), sans saisie ni encaissement — PR — CCM-01, CCM-02 | ☐ |
| CL-D10.A33 | 06 | Remplacer la phrase de garde « 100 F par jour dès demain » par la grille à paliers (100 F j2-3, 200 F j4-5, 400 F j6-7) partout où elle apparaît — CL-09 (Fig. 14, 22, 23, 40, chronologie) / CL-10 — cohérence | ☑ |
| CL-D10.A34 | 06 | Préciser le montant du renvoi qui porte le plafond de garde de 1 400 F à 1 900 F (renvoi = 500 F ?) — CL-09 / registre — cohérence avec RET-SANS-RETOUR | ☑ |
| CL-D10.A35 | 06 | Confirmer la rémunération du gérant « 100 F par jour de garde facturé » avec les modèles de commission relais (ADM / PR) — registre — cohérence | ☑ |
| CL-D10.A36 | 06 | Inscrire CCM-07 (paiement du montant dû par le titulaire lors d’un retrait par un proche) dans la v3 — spec v3 §9.4 — silence de la v3 | ☐ |
| CL-D10.A37 | 06 | Supprimer le pied de page web et les bandeaux des écrans de paiement — application client — interdits | ☐ |
| CL-D10.A38 | 07 | Corriger côté relais : déblocage après 3 codes faux par nouveau code sur demande (et non « seul le support débloque ») — PR CAL-31 — CCD-12 | ☑ |
| CL-D10.A39 | 07 | Corriger côté relais : « Tout est en ordre » enregistré uniquement par l’application du client, pas sur l’appareil du gérant — PR RET-14 — CCM-19 | ☑ |
| CL-D10.A40 | 07 | Trancher le défaut caché signalable 48 h après « Tout est en ordre » (relais) vs v3 12.6 (non) vs « vice caché couvert 100 jours » (CCM-14) — PR / CL-11 / spec v3 §12.6 — cohérence | ☑ |
| CL-D10.A41 | 07 | Trancher AVIS-FENETRE (7 jours montrés, valeur relais AVI-06) — registre — CCM-17 | ☑ |
| CL-D10.A42 | 07 | Trancher GARDE-PRORATA (jour entier proposé) et CODE-BIO (19.4) — registre — À trancher | ☑ |
| CL-D10.A43 | 07 | Créer le paramètre « seuil du porteur nommé » 100 000 F (RET-07) — registre — CCD-09 | ☑ |
| CL-D10.A44 | 07 | Ajouter à la v3 les routes recommandées POST /orders/{id}/code/renew et POST /payments/{id}/abandon — spec API — complétude | ☐ |
| CL-D10.A45 | 07 | Rapprocher RELAIS-GAIN-COLIS (200/250/400 F) de la remise relais 400 F (LIV-REM-RELAIS, CFR-24) — registre / ADM — cohérence déjà relevée | ☑ |
| CL-D10.A46 | 07 | Imposer dans l’application relais : colis annoncés = remis avec étagère, photo de remise obligatoire, validation bloquée, montant dû calculé sans saisie — PR — CCM-21 à CCM-28 | ☐ |
| CL-D10.A47 | 08 | Reporter les valeurs DX_cl09 dans data.js et JEU_ESSAI.md — jeu d’essai — valeurs manquantes | ☐ |
| CL-D10.A48 | 08 | Unifier la formule d’estimation : « Retrait possible dans 4 h 45 » (reçu 8.6), « Prêt dans 2 h » (suivi 9.5), « dès 15 h » (carte) → une seule heure ferme partout — CL-08 / CL-09 — liaison | ☑ |
| CL-D10.A49 | 08 | Corriger la liaison CL-13 : l’écran avis-donner?ref=BLV-52018 doit afficher pagne et sandales retirés aujourd’hui à 10 h 32, notation jusqu’au jeu. 1er oct. (et non BLV-51702 du 19 sept.) — CL-13 — liaison | ☐ |
| CL-D10.A50 | 08 | Trancher CODE-BIO et GARDE-PRORATA avant la production (« Proposé » au registre mais « à trancher » en 19.4) — registre / spec §19.4 — cohérence | ☑ |
| CL-D10.A51 | 08 | Trancher le défaut caché après « Tout est en ordre » (12.6 exclut ; relais et vendeur : signalable 48 h ; écran : vice caché 100 jours) — spec §12.6 / PR / VD — cohérence | ☑ |
| CL-D10.A52 | 08 | Rédiger dans la v3 les textes : montant dû d’un porteur tiers, message « code bloqué », « nouveau code », « Colis remis » — spec v3 — textes manquants | ☐ |
| CL-D10.A53 | 08 | Corriger l’affichage des articles du détail sur une ligne (« Pointure 39 · Colis 2 · 1 × 14 900 F ») — prototype — mise en page | ☐ |
| CL-D10.A54 | 08 | Confirmer la phrase de l’encart du paiement interrompu (capture d’origine) ou revenir à celle de 9.1 — spec v3 §9.1 / CL-09 — à confirmer | ☑ |
| CL-D10.A55 | 08 | Prévoir bdg.compte dans le socle si la pastille doit être sur l’onglet « Compte » — CL-01 socle — cohérence | ☐ |
| CL-D10.A56 | 08 | Aligner côté relais CAL-31 (déblocage) et RET-14 (« Tout est en ordre ») — PR — arbitrages | ☑ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D10.Q01 | 01 | Écarts assumés à la spec 9.1 (filtres, deux actions, disposition) à faire entériner dans la v3. | répondu par les données (revue/CL-09.md) |
| CL-D10.Q02 | 01 | « Montant dû 400 F · 600 F demain » sur BLV-52018 arrivée lun. 21 sept. : cohérence avec la grille de garde (100 F j2-3, 200 F j4-5, 400 F j6-7) à vérifier dans le morceau calcul (cumul ou tarif journalier). | DP-08 : décidée (decisions-porteur.md) |
| CL-D10.Q03 | 02 | Écart à la charte « un seul bouton plein par écran ». | répondu par les données (revue/CL-09.md) |
| CL-D10.Q04 | 02 | Puce à compteur 0 cachée : seulement « recommandé ». | répondu par les données (revue/CL-09.md) |
| CL-D10.Q05 | 03 | Garde : formulation « 100 F par jour » vs grille à paliers. | DP-08 : décidée (decisions-porteur.md) |
| CL-D10.Q06 | 03 | « Sans réponse, BelivaY tranche en ta faveur » : à confirmer avec les règles de litige (CL-11 / ADM). | répondu par les données (revue/CL-09.md) |
| CL-D10.Q07 | 04 | Seuil pièce d’identité du porteur 100 000 F et seuil biométrie 50 000 F : à confirmer avec PR (règles du comptoir) et le registre. | DP-29 : décidée (decisions-porteur.md) |
| CL-D10.Q08 | 04 | « Jour 6 sur 7 » le 24 sept. pour un retrait le 19 sept. : convention de comptage (jour du retrait = jour 1) à fixer. | répondu par les données (revue/CL-09.md) |
| CL-D10.Q09 | 05 | Déblocage après 3 codes faux : support seul (PR) ou nouveau code self-service (CL). | DP-26 : décidée (decisions-porteur.md) |
| CL-D10.Q10 | 05 | CODE-BIO proposé : à valider. | DP-29 : décidée (decisions-porteur.md) |
| CL-D10.Q11 | 05 | Renvoi SMS payant « hors budget des 6 SMS » : à confirmer avec SMSMAX-CMD et coûts SMS ADM. | répondu par les données (revue/CL-09.md) |
| CL-D10.Q12 | 06 | Phrase « 100 F par jour » vs paliers (la grille donne 400 F le j4 cumulés, cohérent avec « 400 F · 600 F demain · 400 F par jour dès samedi »). | DP-08 : décidée (decisions-porteur.md) |
| CL-D10.Q13 | 06 | Plafond 1 900 F « avec le renvoi » : montant du renvoi non défini ici (RET-SANS-RETOUR 3 000 vs 5 000 F déjà relevé). | répondu par les données (revue/CL-09.md) |
| CL-D10.Q14 | 06 | Rémunération du gérant sur la garde. | DP-08 : décidée (decisions-porteur.md) |
| CL-D10.Q15 | 07 | Vice caché : 100 jours (CCM-14) vs défaut caché 48 h (relais) vs non (v3 12.6). | DP-27 : décidée (decisions-porteur.md) |
| CL-D10.Q16 | 07 | « Tout est en ordre » : appareil du client seul vs appareil du gérant. | DP-28 : décidée (decisions-porteur.md) |
| CL-D10.Q17 | 07 | Déblocage du code après blocage. | DP-26 : décidée (decisions-porteur.md) |
| CL-D10.Q18 | 07 | Rémunération relais : 200 F/colis vs remise relais 400 F. | DP-25 : décidée (decisions-porteur.md) |
| CL-D10.Q19 | 08 | Trois formules d’estimation pour la même heure. | répondu par les données (revue/CL-09.md) |
| CL-D10.Q20 | 08 | CODE-BIO / GARDE-PRORATA : Proposé vs à trancher. | DP-29 : décidée (decisions-porteur.md) |
| CL-D10.Q21 | 08 | Défaut caché après « Tout est en ordre ». | DP-27 : décidée (decisions-porteur.md) |
| CL-D10.Q22 | 08 | Phrase de l’encart du paiement interrompu. 15.5 | répondu par les données (revue/CL-09.md) |

## 11 · CL-10

11 — CL-10 — Notifications, messages et frais de garde — dossier : 01_Documents / 3 — Écrans, un document par groupe d’écrans / 11 — CL-10 — Notifications, messages et frais de garde

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D11.A01 | 01 | Implémenter GET /me/notifications (unread_count, deep_link, category, group) et POST /me/notifications/read — back — CNT-01 à CNT-08 | ☐ |
| CL-D11.A02 | 01 | Ajouter le badge des non-lus sur la cloche et l’icône d’application (99+) — application client — CNT-04 | ☐ |
| CL-D11.A03 | 01 | Supprimer le type « message livreur » (chat libre) et toute notification avant order.paid — back / notifications — CNT-12 | ☐ |
| CL-D11.A04 | 01 | Supprimer « Supprimer ce message » et la feuille « À RELIRE » ; purge automatique à 12 mois — application client / back — CNT-01, CNT-02 | ☐ |
| CL-D11.A05 | 01 | Contrôle automatique côté serveur : aucune ligne avec code à 6 chiffres, OTP ou commission — back / QA — CNT-05 | ☐ |
| CL-D11.A06 | 01 | Trancher NOT-CONSERV (12 mois) et NOT-BADGE-MAX (99+) — registre — Proposé | ☐ |
| CL-D11.A07 | 01 | Harmoniser l’onglet actif du dock pour le centre : « onglet Compte » (emplacement, Fig. 1) vs « Accueil » (composition point 1) — CL-10 — cohérence | ☑ |
| CL-D11.A08 | 01 | Aligner le texte du rappel S de BLV-52018 (« retrait avant sam. 26 au soir, sinon renvoi + 500 F ») avec la grille (400 F par jour dès sam. 26, dim. 27 fermé, renvoi lun. 28) — CL-10 / CL-09 — cohérence | ☐ |
| CL-D11.A09 | 02 | Supprimer le booléen sms_tracking ; ajouter fallback_channel (« sms ») et categories ; promotions = false à la création ; comptes existants : « désactivé » sauf accord explicite — back / migration — CNT-13, CNT-17 | ☐ |
| CL-D11.A10 | 02 | Supprimer la newsletter e-mail cochée d’office — application client — interdits | ☐ |
| CL-D11.A11 | 02 | Refuser côté serveur (422 category_locked) la désactivation des catégories critiques — back — CNT-21 | ☐ |
| CL-D11.A12 | 02 | Enregistrer chaque interrupteur au toucher (PUT) et retirer « Enregistrer les préférences » — application client — CNT-20 | ☐ |
| CL-D11.A13 | 02 | Régler avec CL-08 la place du SMS d’échec de paiement (hors des 6 SMS ou variante C4) — CL-08 / CL-10 — cohérence (CPY-43) | ☑ |
| CL-D11.A14 | 02 | Harmoniser l’en-tête du réglage : Fig. 5 (« Notifications », sous-titre « Réglages », refonte du 26 sept.) vs composition (« Réglages », sous-titre « Mon compte », titre « Notifications ») et l’onglet actif (« onglet Compte actif » vs « Pas d’onglet actif ») — CL-10 — cohérence | ☑ |
| CL-D11.A15 | 02 | Mettre en place les pushs FCM (lien profond, catégorie, criticité, regroupement, nuit, accusés, POST /devices) — back — service d’envoi | ☐ |
| CL-D11.A16 | 03 | Créer les gabarits SMS GSM-7 (C1, C3, C3 validée, S1, S2, C4, C12, renvoi, OTP) et le compteur de budget par commande (6 au plus) — back / service d’envoi — CSM-01, CSM-02 | ☐ |
| CL-D11.A17 | 03 | Créer la page publique du lien court GET /r/{token} (QR, code, montant dû, relais), désactivée au retrait — back / web — CSM-04 | ☐ |
| CL-D11.A18 | 03 | Annuler le SMS C1 si l’écran « Commande confirmée » a été affiché (revérification journalisée) — service d’envoi — CNT-29 | ☐ |
| CL-D11.A19 | 03 | Ajouter au registre MSG-C12-DELAI (1 h) s’il n’y figure pas — registre — CSM-10 | ☑ |
| CL-D11.A20 | 03 | Unifier la convention « jour d’arrivée » : J0 (CCM-03, 9.5) vs « jour 1 » (CSM-06, GARDE-J1) — CL-09 / CL-10 / registre — cohérence | ☑ |
| CL-D11.A21 | 03 | Ajouter « ferme dim. » au C3 de la commande validée (155/160 laisse la place) pour aligner avec le C3 standard — gabarit SMS — cohérence | ☐ |
| CL-D11.A22 | 03 | Supprimer les usages « WhatsApp forcé » de la v1 (arrivée, code, photo du relais) — back — CNT-14 | ☐ |
| CL-D11.A23 | 04 | Trancher SMS-ECO (seuil du mode économique) avant la production — registre — CSM-14 | ☑ |
| CL-D11.A24 | 04 | Implémenter le refus des SMS de criticité 2 au 6e SMS d’une commande et le passage de la criticité 1 — service d’envoi — CSM-28, CSM-02 | ☐ |
| CL-D11.A25 | 04 | Implémenter les horaires d’envoi des SMS de criticité 2 (7 h – 21 h) — service d’envoi — CSM-17 | ☐ |
| CL-D11.A26 | 04 | Désactiver le lien court au retrait, au renvoi et à chaque nouveau code ; noindex ; limitation de débit — back — CSM-18 | ☐ |
| CL-D11.A27 | 04 | Créer l’écran « Ton colis t’attend » (montant du jour, demain, palier, date limite, conséquence, grille jour par jour) avec ses états j=1…7, ferme, litige, groupage, nonvu, renvoye — application client — section 5 | ☐ |
| CL-D11.A28 | 04 | Préciser que le renvoi du code désactive l’ancien lien court (renvoi = même code 604318 ?) : contradiction apparente entre CSM-18 (« désactivé au renvoi ») et le SMS de renvoi qui redonne le même lien belivay.com/r/7KQ2MX4P — CL-10 — cohérence | ☑ |
| CL-D11.A29 | 05 | Aligner l’espace point relais sur la v3 : jour fermé compté dans le rang (CAL-04, FER-05), pas de garde doublée pour un colis L (CAL-03), jours d’abonnés non payés au relais (CAL-16), retenue sur remboursement au lieu de « avant la prochaine commande » (CAL-18) — PR — CGA-01, CGA-04, CGA-17, CGA-18 | ☐ |
| CL-D11.A30 | 05 | Trancher l’encaissement de la retenue d’une commande validée non retirée (garde + 500 F > 900 F payés) — spec v3 §8.5 / §9.5 — CGA-23 | ☑ |
| CL-D11.A31 | 05 | Trancher GARDE-PRORATA et ABO-GARDE-BONUS — registre — Proposé | ☑ |
| CL-D11.A32 | 05 | Ajouter l’alerte console « colis non vu » 48 h (GARDE-NONVU-H) et le rappel masqué du support — ADM / console — CGA-20 | ☐ |
| CL-D11.A33 | 05 | Implémenter GET /orders/{id}/storage, storage.day à 00:00, versionnage params_version — back — calculs | ☐ |
| CL-D11.A34 | 05 | Planifier S0-S5 avec revérification à l’envoi ; annulation au retrait, suspension en litige, recréation au changement de relais — service d’envoi — CGA-24 à CGA-26 | ☐ |
| CL-D11.A35 | 05 | Mettre à jour la FAQ (IMG_2474) avec la garde — CL-13 — mise à niveau | ☐ |
| CL-D11.A36 | 06 | Désigner le fournisseur SMS secondaire (SMS-SECOURS) — registre / ADM — À trancher | ☐ |
| CL-D11.A37 | 06 | Fixer le seuil de dissociation d’une commande (19.4) — registre — À trancher | ☑ |
| CL-D11.A38 | 06 | Renommer les niveaux de MSG-VALIDITE (« C1 6 h · C2 4 h · C3 1 h ») pour éviter la confusion avec les codes de messages C1, C2, C3 (écrire « criticité 1/2/3 ») — registre — ambiguïté | ☐ |
| CL-D11.A39 | 06 | Implémenter le service d’envoi unique (send(), file par criticité, tentatives 1/5/15 min, idempotence, budget, bac à sable, journal en ajout seul, appel vocal de secours) — back — CSM-20 à CSM-33 | ☐ |
| CL-D11.A40 | 06 | Afficher en console : alerte criticité 1 non délivrée, budget journalier, rapprochement mensuel, liste blanche, consultation du journal — ADM — liaisons | ☐ |
| CL-D11.A41 | 06 | Supprimer le composant de bandeau défilant sur toutes les pages ; réassurance statique seulement dans panier, fiche, paiement — application client — interdits | ☐ |
| CL-D11.A42 | 06 | Faire valider par le porteur le catalogue des textes (pushs, SMS) et le fichier anglais en_add/cl10_messages.json — produit — Recommandé | ☑ |
| CL-D11.A43 | 06 | Harmoniser « 12 zones de Yaoundé au lancement » avec les zones exploitées de la console — CL-10 / ADM — cohérence déjà relevée | ☐ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D11.Q01 | 01 | Onglet actif du dock (Compte vs Accueil). | répondu par les données (revue/CL-10.md) |
| CL-D11.Q02 | 01 | Date de renvoi dans le rappel (sam. 26 au soir vs lun. 28). | répondu par les données (revue/CL-10.md) |
| CL-D11.Q03 | 02 | En-tête et onglet actif du réglage (refonte du 26 sept. vs composition). | répondu par les données (revue/CL-10.md) |
| CL-D11.Q04 | 02 | Le rappel « retrait avant sam. 26 au soir » est cohérent avec la grille si le dim. 27 (fermé, rang 7) est le dernier jour et le renvoi le lun. 28 : à confirmer (lien avec partie 01). | répondu par les données (revue/CL-10.md) |
| CL-D11.Q05 | 03 | J0 vs jour 1 pour le jour d’arrivée. | répondu par les données (revue/CL-10.md) |
| CL-D11.Q06 | 03 | MSG-C12-DELAI : présent au registre ? | répondu par les données (revue/CL-10.md) |
| CL-D11.Q07 | 04 | SMS-ECO à trancher. | DP-31 : décidée (decisions-porteur.md) |
| CL-D11.Q08 | 04 | Lien court « désactivé au renvoi » vs renvoi qui redonne le même lien. | répondu par les données (revue/CL-10.md) |
| CL-D11.Q09 | 04 | Numérotation « jour 1 » (écran) vs J0 (CCM-03). | répondu par les données (revue/CL-10.md) |
| CL-D11.Q10 | 05 | CGA-23 (retenue commande validée non retirée). | DP-24 : décidée (decisions-porteur.md) |
| CL-D11.Q11 | 05 | Écarts relais CAL-03/04/16/18, FER-05. | répondu par les données (revue/CL-10.md) |
| CL-D11.Q12 | 05 | S4 « Dû : 1 400 F » de la spec suppose un 7e jour ouvert : non envoyé quand dimanche. | répondu par les données (revue/CL-10.md) |
| CL-D11.Q13 | 06 | SMS-SECOURS, SMS-ECO, seuil de dissociation à trancher. | à décider (revue/decisions.md) |
| CL-D11.Q14 | 06 | Ambiguïté des libellés C1/C2/C3 de MSG-VALIDITE. 16.5 | répondu par les données (revue/CL-10.md) |

## 12 · CL-11

12 — CL-11 — Litige, retour et remplacement — dossier : 01_Documents / 3 — Écrans, un document par groupe d’écrans / 12 — CL-11 — Litige, retour et remplacement

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D12.A01 | 01 | Supprimer le « Chat de litige » et le litige par article ; « Signaler un problème » ouvre l’assistant (#litige?ref=…) — application client — CLT-01, CLT-04 | ☐ |
| CL-D12.A02 | 01 | POST /disputes porte parcel_id (jamais une ligne d’article) — back — CLT-03 | ☐ |
| CL-D12.A03 | 01 | Proposer l’ouverture d’un litige sur une note basse (≤ 2 ★ proposé) sans condition — CL-13 / CL-11 — CLT-01 | ☐ |
| CL-D12.A04 | 01 | Ajouter sous la notation « Un avis ne peut pas être retiré contre un remboursement » — CL-13 — protection | ☐ |
| CL-D12.A05 | 01 | Rapprocher en console les trois taxonomies de motifs (client, constat relais, retour) — ADM / console — cohérence | ☐ |
| CL-D12.A06 | 01 | Fixer la durée de conservation d’un brouillon de litige abandonné (24 h proposé, absent de la spec) — registre — proposition | ☑ |
| CL-D12.A07 | 01 | Trancher la couverture « défaut caché » 100 jours hors escrow (CLT-09, CRO-16) avec la v3 12.6 et le relais (48 h) — spec / PR / VD — cohérence déjà relevée | ☑ |
| CL-D12.A08 | 02 | Implémenter POST /disputes (idempotence, un dossier par colis, calcul serveur du seuil IFA jamais transmis) — back — CLT-16, CLT-19, CLT-26 | ☐ |
| CL-D12.A09 | 02 | Trancher le délai de versement d’un remboursement Mobile Money (1 h proposé) et l’inscrire au registre — registre — CLT-28 | ☑ |
| CL-D12.A10 | 02 | Afficher dans le compte l’avantage en clair « Remboursement immédiat jusqu’à 3 000 F » sans nommer le palier — CL-13 — CLT-26 | ☐ |
| CL-D12.A11 | 02 | Mettre en place la reprise sur les prochains versements du vendeur en cas de défaut caché confirmé après paiement — back / VD — CLT-22 | ☐ |
| CL-D12.A12 | 02 | Permettre au gérant de saisir le souhait du client dans le constat (POST /relay/disputes, wish) — PR — CLT-32 | ☐ |
| CL-D12.A13 | 02 | Afficher côté relais « réponse BelivaY sous 48 h ouvrées » et côté console la file « Relais » — PR / ADM — CLT-33 | ☐ |
| CL-D12.A14 | 02 | Remplacer le bandeau « Remboursement sous 7 jours · Sans question » (promesse fausse) — application client — cohérence | ☐ |
| CL-D12.A15 | 03 | Trancher le délai de décision de BelivaY après l’échéance du vendeur (24 h proposé), constant pour tous les paliers — registre / spec §11.5 — CLT-39 | ☑ |
| CL-D12.A16 | 03 | Aligner la phrase de CL-09 « Sans réponse, BelivaY tranche en ta faveur » avec CLT-38 (présomption, mais décision humaine, jamais automatique) — CL-09 chronologie — cohérence | ☐ |
| CL-D12.A17 | 03 | Implémenter le masquage automatique des coordonnées dans la messagerie du dossier (deux côtés) — back — CLT-41 | ☐ |
| CL-D12.A18 | 03 | Recadrer côté serveur les photos montrées au client pour ne pas révéler la boutique — back — CLT-43 | ☐ |
| CL-D12.A19 | 03 | Mettre en place en console la vue « chaîne de preuves côte à côte » et la file prioritaire des vendeurs silencieux — ADM — CLT-38, CLT-42 | ☐ |
| CL-D12.A20 | 03 | Envoyer un push gratuit à chaque changement d’état du litige — service d’envoi — CLT-21 | ☐ |
| CL-D12.A21 | 04 | Rendre decision.reason obligatoire côté serveur pour toute décision défavorable et désactiver les boutons console sans motif — back / ADM — CLT-44 | ☐ |
| CL-D12.A22 | 04 | Trancher le recours sur un litige : absent de la v3, prévu par le relais et le vendeur — spec v3 §11 / PR / VD — CLT-47 | ☑ |
| CL-D12.A23 | 04 | Trancher le délai de réponse du client à un arrangement (5 jours chez relais et vendeur avec clôture en faveur du vendeur) — spec v3 §11.4 / PR / VD — CLT-51 | ☑ |
| CL-D12.A24 | 04 | Vérifier côté serveur la longueur ≥ 40 caractères de l’arrangement et masquer les coordonnées — back — CLT-49 | ☐ |
| CL-D12.A25 | 04 | Créer l’écran « Mes litiges » (GET /me/disputes) et retirer le filtre « Litiges » de la messagerie — application client — CLT-52 | ☐ |
| CL-D12.A26 | 04 | Harmoniser la couleur de l’état « En litige » : neutre soutenu (Mes litiges, 9.1) vs rouge (carte de commande CL-09, CMC-22) — CL-11 / CL-09 — cohérence | ☑ |
| CL-D12.A27 | 05 | Retirer l’affichage « Indice de confiance 70/100 », le niveau Bronze et « BelivaY Points » du compte — application client / CL-13 — CIF-01, CIF-26 | ☐ |
| CL-D12.A28 | 05 | Réécrire la CGU : pas de suspension sans préavis ; plafonnement, rétrogradation validée par un humain, recours — CL-13 / CGU — CIF-22, CIF-25 | ☐ |
| CL-D12.A29 | 05 | Trancher le remboursement des frais de livraison quand le vendeur ou le transporteur est en tort — spec v3 §11.2 / §8.6 — CLT-60 | ☑ |
| CL-D12.A30 | 05 | Définir la règle de calcul serveur d’un remboursement partiel — spec v3 §11 — CLT-61 | ☑ |
| CL-D12.A31 | 05 | Calibrer IFA-NABS, IFA-NAUTO et les plafonds de fréquence du palier Élevé — registre / ADM — À trancher | ☑ |
| CL-D12.A32 | 05 | Mettre en place en console : cartes « Score », croisement client × vendeur, comptes liés, part_top_k, rôles Support/Finance — ADM — CIF-20, CIF-27, 18.4, 18.5 | ☐ |
| CL-D12.A33 | 05 | Vérifier la cohérence des plafonds de valeur de l’entreprise de livraison (75 000 F Nouveau, 250 000 F Confirmé) avec ENT/LIV — ENT / registre — CLT-58 | ☐ |
| CL-D12.A34 | 06 | Trancher le prix du trajet retour (500 F proposé, retenu par relais et vendeur) et l’inscrire au registre — registre — CRO-22 | ☑ |
| CL-D12.A35 | 06 | Trancher RET-SANS-RETOUR (3 000 à 5 000 F ; 5 000 F proposé) — registre — CRO-24 (écart déjà relevé) | ☑ |
| CL-D12.A36 | 06 | Trancher le défaut caché entre 48 h et 7 jours et après « Tout est en ordre » (v3 12.6 vs relais/vendeur 48 h) — spec v3 §12 / PR / VD — CRO-25 | ☑ |
| CL-D12.A37 | 06 | Corriger la CGV « retour sous 7 jours, article dans son état d’origine » (retour sans motif implicite) — CGV / CL-13 — CRO-14 | ☐ |
| CL-D12.A38 | 06 | Implémenter le dépôt scanné au relais (POST /relay/returns/{id}/deposit) avec photo et rangement à part, hors capacité, rémunération de colis — PR — CRO-05, CRO-06 | ☐ |
| CL-D12.A39 | 06 | Publier le trajet retour comme course normale de la zone avec photo de collecte ; collecte à domicile pour XL — ENT / LIV — CRO-07, CRO-23 | ☐ |
| CL-D12.A40 | 06 | Imposer l’inspection vendeur sous 48 h avec remboursement automatique à l’échéance — VD / back — CRO-09 | ☐ |
| CL-D12.A41 | 06 | Ajouter la relance du client si le dépôt déclaré n’est pas scanné dans la journée (proposition) — service d’envoi — CRO-05 | ☐ |
| CL-D12.A42 | 07 | Trancher RET-REMPL-DELAI (72 h ouvrées proposé, valeur vendeur RMP-01) — registre — CRP-02 | ☑ |
| CL-D12.A43 | 07 | Trancher l’écran d’acceptation par le client d’un remplacement proposé par le vendeur (prévu vendeur/relais, absent de la v3) — spec v3 §12.5 / VD / PR — CRP-08 | ☑ |
| CL-D12.A44 | 07 | Marquer le colis de remplacement « Remplacement » au relais avec son propre code (REC-13) — PR — CRP-06 | ☐ |
| CL-D12.A45 | 07 | Retirer toutes les promesses « sans question », « garanti », « 7 jours pour changer d’avis » (bandeau, accueil, À propos, FAQ, CGV) — application client / CL-13 — CRO-26 | ☐ |
| CL-D12.A46 | 07 | Publier la page versionnée « Règles des retours et des litiges » (FR/EN) et les 8 questions de FAQ — CL-13 — CRO-27 | ☐ |
| CL-D12.A47 | 07 | Corriger la CGV « libérés 24 h après la confirmation » en « 3 jours après la fermeture du droit de retour (1 j Or/Platine, 14 j carte), versement le vendredi » — CGV / CL-13 — cohérence | ☐ |
| CL-D12.A48 | 07 | Ajouter GET /me/disputes, GET /returns/{id}, GET /replacements/{id} à la spec API — spec §11.7 / §12.6 — complétude | ☐ |
| CL-D12.A49 | 08 | Reporter les valeurs DX_cl11 dans data.js et JEU_ESSAI.md — jeu d’essai — valeurs ajoutées | ☐ |
| CL-D12.A50 | 08 | Corriger 11.2 / 11.3 de la v3 : « Je veux juste signaler » ne crée pas de dossier ni n’immobilise d’argent — spec v3 §11.2 — CLT-18 | ☐ |
| CL-D12.A51 | 08 | Écrire séparément dans la v3 les deux règles de silence du vendeur : décision humaine (litige) vs remboursement automatique (inspection de retour) — spec v3 §11.4 / §12.4 — CLT-38, CRO-09 | ☐ |
| CL-D12.A52 | 08 | Définir l’avertissement « C10 » cité en 2.3 et 11.2 mais absent du chapitre 10 (sens retenu : avertissement avant la libération du vendeur) — spec v3 §10 — lacune | ☐ |
| CL-D12.A53 | 08 | Ajouter à la v3 le délai de décision de BelivaY, le recours sur litige et le délai de réponse à un arrangement — spec v3 §11.3-11.4 — CLT-39, CLT-47, CLT-51 | ☐ |
| CL-D12.A54 | 08 | Aligner le relais sur la v3 pour le seuil sans retour (3 000 à 5 000 F) : le relais le confond avec les seuils de remboursement automatique (3 000 F Standard / 10 000 F Élevé) — PR — CRO-24 | ☐ |
| CL-D12.A55 | 08 | Trancher par le porteur « pas de retour sans motif au lancement » (sous-entend plus tard) vs suppression définitive chez relais et vendeur — produit / PR / VD — cohérence | ☑ |
| CL-D12.A56 | 08 | Employer côté client le seul terme « défaut caché » avec sa date limite — application client — CRO-28 | ☐ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D12.Q01 | 01 | Défaut caché 100 jours (hors escrow) : qui paie et comment, en l’absence d’escrow. | répondu par les données (revue/CL-11.md) |
| CL-D12.Q02 | 01 | Seuil « note basse » (≤ 2 ★ proposé). | DP-35 : décidée (decisions-porteur.md) |
| CL-D12.Q03 | 02 | Délai de versement MoMo non spécifié. | DP-35 : décidée (decisions-porteur.md) |
| CL-D12.Q04 | 02 | « 48 h ouvrées » (constat relais) vs « 48 h » calendaires (vendeur) : deux horloges à expliquer. | répondu par les données (revue/CL-11.md) |
| CL-D12.Q05 | 03 | Délai de décision après l’échéance (24 h proposé). | DP-35 : décidée (decisions-porteur.md) |
| CL-D12.Q06 | 03 | Formulation « tranche en ta faveur » (CL-09) vs présomption + vérification humaine. | répondu par les données (revue/CL-11.md) |
| CL-D12.Q07 | 04 | Recours sur litige (client) absent. | DP-35 : décidée (decisions-porteur.md) |
| CL-D12.Q08 | 04 | Délai de réponse à un arrangement. | DP-35 : décidée (decisions-porteur.md) |
| CL-D12.Q09 | 04 | Couleur de l’état « En litige ». | répondu par les données (revue/CL-11.md) |
| CL-D12.Q10 | 05 | Frais de livraison dans le remboursement en cas de tort. | DP-35 : décidée (decisions-porteur.md) |
| CL-D12.Q11 | 05 | Calcul des montants partiels. | DP-35 : décidée (decisions-porteur.md) |
| CL-D12.Q12 | 05 | Seuils IFA à calibrer. | DP-35 : décidée (decisions-porteur.md) |
| CL-D12.Q13 | 06 | Prix du trajet retour (500 F) ; seuil sans retour (3 000/5 000 F) ; défaut caché 48 h – 7 j. | DP-35 : décidée (decisions-porteur.md) |
| CL-D12.Q14 | 07 | Délai de renvoi d’un remplacement. | DP-15 : proposée (decisions-porteur.md) |
| CL-D12.Q15 | 07 | Acceptation client d’un remplacement proposé. | DP-35 : décidée (decisions-porteur.md) |
| CL-D12.Q16 | 08 | C10 non défini. | répondu par les données (revue/CL-11.md) |
| CL-D12.Q17 | 08 | Retour sans motif : « au lancement » vs définitivement. | DP-35 : décidée (decisions-porteur.md) |
| CL-D12.Q18 | 08 | Seuil sans retour côté relais confondu avec les seuils de remboursement automatique. 17.5 | DP-10 : décidée (decisions-porteur.md) |

## 13 · CL-12

13 — CL-12 — Annulation, changement de relais et paiement de l’étranger — dossier : 01_Documents / 3 — Écrans, un document par groupe d’écrans / 13 — CL-12 — Annulation, changement de relais et paiement de l’étranger

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D13.A01 | 01 | Implémenter l’annulation par sous-commande (POST /suborders/{id}/cancel, contrôle serveur état < collectée, remboursement immédiat) — back — CAN-06 à CAN-12 | ☐ |
| CL-D13.A02 | 01 | Renvoyer refund_if_cancelled par le service de tarification dans GET /orders/{id}/manage — back — CAN-05 | ☐ |
| CL-D13.A03 | 01 | Trancher ANN-PLAFOND — registre — CAN-18 | ☑ |
| CL-D13.A04 | 01 | Mettre la composition (point 5 : palier, Trust Score, heure de confirmation, pastille de zone) en cohérence avec la refonte du 26 sept. (éléments retirés de la carte) et avec CAN-04 — CL-12 — cohérence | ☐ |
| CL-D13.A05 | 01 | Vérifier que le SMS C4 « variante annulation » d’une annulation demandée par le client respecte CL-10 (C4 SMS réservé à l’annulation par incident / BelivaY) et le budget de 6 SMS — CL-10 / CL-12 — cohérence | ☑ |
| CL-D13.A06 | 01 | Retirer de la collecte la boutique annulée, ne pas payer l’entreprise pour l’arrêt supprimé, libérer la capacité du relais — ENT / LIV / PR — CAN-19 | ☐ |
| CL-D13.A07 | 01 | Supprimer l’annulation d’une tentative non payée et « RESTE À PAYER » du détail — application client — CL-09 | ☐ |
| CL-D13.A08 | 02 | Répondre 409 state_changed quand l’état a changé au clic et ne jamais annuler en silence — back — CAN-20 | ☐ |
| CL-D13.A09 | 02 | Désactiver l’annulation hors ligne (aucune mise en file) — application client — CAN-21 | ☐ |
| CL-D13.A10 | 02 | Implémenter la bascule au vendeur suivant (même produit maître et variante, trust ≥ 75, prix livré ≤ +5 %, écart à la charge de BelivaY) avant toute annulation — back — CAN-24 | ☐ |
| CL-D13.A11 | 02 | Coder les motifs d’annulation par BelivaY (fraud, seller_suspended, zone_unreachable, no_carrier) traduits en phrases ; zone.alert en console — back / ADM — CAN-27, CAN-28 | ☐ |
| CL-D13.A12 | 02 | Harmoniser l’auteur de l’annulation de BLV-51533 : « Annulée par le vendeur » (CL-12) vs « Annulée par BelivaY » (CL-09 Fig. 18) — CL-09 / CL-12 / jeu d’essai — cohérence | ☑ |
| CL-D13.A13 | 02 | Remplacer le message « Aucune organisation de livraison… » à coche verte par l’annulation motivée — application client — CAN-27 | ☐ |
| CL-D13.A14 | 03 | Implémenter PUT /orders/{id}/relais (gratuit avant collecte, 409 in_tour, deux groupes si partiel) et POST /parcels/{id}/transfer (400 F + garde due) — back — CRL-05 à CRL-10 | ☐ |
| CL-D13.A15 | 03 | Générer un nouveau code (haché) et invalider l’ancien au changement de relais ; SMS C3 à l’arrivée — back — CRL-12 | ☑ |
| CL-D13.A16 | 03 | Publier la course de transfert avec les paquets de la zone — ENT / LIV — CRL-11 | ☐ |
| CL-D13.A17 | 03 | Rapprocher la liste des relais du prototype (Mvog-Ada, Essos, Mvan, Bastos, Melen plein) de la liste de la console et du jeu d’essai (Mvog-Ada/Essos/Mvan/Soa, Melen, Biyem-Assi) — CL-12 / ADM / JEU_ESSAI — cohérence déjà relevée | ☐ |
| CL-D13.A18 | 03 | Ne jamais proposer un relais plein, fermé ou « en configuration » (GET /relays filtré) — back — interdits | ☐ |
| CL-D13.A19 | 03 | Remplacer l’adresse de test par le modèle Adresse par repères (nom, quartier, repères, GPS) — back / CL-13 — mise à niveau | ☐ |
| CL-D13.A20 | 04 | Implémenter PUT /orders/{id}/address (avant collecte uniquement) — back — CMO-01 | ☐ |
| CL-D13.A21 | 04 | Créer la page web du payeur (GET /gift-links, POST /gift-payments, 3-D Secure, frais 2 % affichés, devise par BIN) — web / back — CET-06 à CET-14 | ☐ |
| CL-D13.A22 | 04 | Trancher le prestataire carte PAY-CARTE-PSP (Flutterwave ou CinetPay) — registre — À trancher (déjà relevé) | ☑ |
| CL-D13.A23 | 04 | Remplacer « Aïcha » par le prénom du jeu d’essai (Carine) dans l’exemple 13.4 de la spec, ou l’inverse — spec v3 §13.4 — cohérence | ☐ |
| CL-D13.A24 | 04 | Rapprocher l’usage de la carte : ici réservée au payeur à l’étranger (page web) vs utilisable par la cliente dans la feuille « Moyen de paiement » de CL-08 (Fig. 14 panier seuil) — CL-08 / CL-12 — cohérence déjà relevée | ☑ |
| CL-D13.A25 | 04 | Afficher au client le prénom et le pays du payeur, jamais le montant débité sur la carte — application client — CET-04 | ☐ |
| CL-D13.A26 | 05 | Implémenter le découpage serveur au-delà de 150 000 F frais compris (422 over_cap, tri par montant, recalcul complet) et l’exclusion d’un article seul au-dessus — back — CET-16 | ☐ |
| CL-D13.A27 | 05 | Tenir la table des codes du prestataire carte → phrases (FR, EN) — back / ADM — CET-15 | ☐ |
| CL-D13.A28 | 05 | Mettre en place Web Push puis e-mail (Brevo) pour le payeur avec file 22 h – 7 h selon son fuseau — service d’envoi — CET-19, CET-20 | ☐ |
| CL-D13.A29 | 05 | Inscrire dans la v3 le sort des frais de service carte en cas d’annulation (238 F acquis si le bénéficiaire annule ; tout remboursé si vendeur/BelivaY) — spec v3 §13.4 — CET-24 | ☐ |
| CL-D13.A30 | 05 | Corriger la couverture de CL-12 : numéros de figures décalés (13.2 « Fig. 7 à 9 » = fig. 8-10 ; 13.3 « Fig. 10 à 15 » = fig. 11-16 ; 13.4 « Fig. 18 à 29 » = fig. 21-32 ; 13.5 « Fig. 16 et 17 » = fig. 17-20) — CL-12 — cohérence du document | ☐ |
| CL-D13.A31 | 05 | Reporter DX_cl12 dans data.js et JEU_ESSAI.md — jeu d’essai — valeurs ajoutées | ☐ |
| CL-D13.A32 | 05 | Trancher PAY-CARTE-PSP et ANN-PLAFOND — registre — À trancher | ☑ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D13.Q01 | 01 | ANN-PLAFOND. | DP-15 : proposée (decisions-porteur.md) |
| CL-D13.Q02 | 01 | SMS C4 pour une annulation à l’initiative du client. | DP-36 : décidée (decisions-porteur.md) |
| CL-D13.Q03 | 01 | Composition vs refonte du 26 sept. (éléments de carte). | répondu par les données (revue/CL-12.md) |
| CL-D13.Q04 | 02 | Auteur de l’annulation de BLV-51533 (vendeur ou BelivaY). | répondu par les données (revue/CL-12.md) |
| CL-D13.Q05 | 03 | Liste des relais (Bastos, Melen) vs console et jeu d’essai. | répondu par les données (revue/CL-12.md) |
| CL-D13.Q06 | 04 | Carte : diaspora seulement ou aussi cliente locale. | DP-23 : décidée (decisions-porteur.md) |
| CL-D13.Q07 | 04 | Prénom de l’exemple (Aïcha vs Carine). | répondu par les données (revue/CL-12.md) |
| CL-D13.Q08 | 05 | Frais de service carte à l’annulation (spec muette). | répondu par les données (revue/CL-12.md) |
| CL-D13.Q09 | 05 | Numérotation des figures dans la couverture. 18.5 | répondu par les données (revue/CL-12.md) |

## 14 · CL-13

14 — CL-13 — Compte, avis, aide, pages légales et mode dégradé — dossier : 01_Documents / 3 — Écrans, un document par groupe d’écrans / 14 — CL-13 — Compte, avis, aide, pages légales et mode dégradé

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D14.A01 | 01 | Réduire le compte au modèle minimal (profil, tuiles, avantages, relais, rubriques, suppression) et supprimer points, Wallet, jauge, pseudo, biographie, parrainage, carte panier — application client — CCO-01 | ☐ |
| CL-D14.A02 | 01 | Renvoyer advantages[] depuis GET /me sans IFA ni palier — back — CCO-02, CCO-03 | ☐ |
| CL-D14.A03 | 01 | Confirmer la lecture « nouveau compte » : 15 000 F jusqu’à la première commande retirée, puis 50 000 F (CCO-04) vs définition de PAY-CPT-NOUV en CL-08 — spec v3 §8.5 / registre — cohérence | ☑ |
| CL-D14.A04 | 01 | Harmoniser la barre du bas : 5 onglets (Accueil, Catégories, Panier, Sauvegardés, Compte) ici vs « dock à 4 onglets » cité en CL-10 (renvoi CL-01) — CL-01 / CL-10 / CL-13 — cohérence | ☑ |
| CL-D14.A05 | 01 | Afficher « réponse sous 4 h ouvrées » (SUP-DELAI) dans l’aide au lieu de « L’équipe BelivaY répond vite » — application client — SUP-DELAI | ☐ |
| CL-D14.A06 | 01 | Changement d’e-mail par le support seulement au lancement — produit / support — CCO-01 | ☑ |
| CL-D14.A07 | 02 | Refuser côté serveur un quartier hors zones exploitées (422 zone_non_servie) — back — CCO-11 | ☐ |
| CL-D14.A08 | 02 | Harmoniser « 12 zones de Yaoundé » avec les zones exploitées de la console (4 zones) — CL-13 / ADM — cohérence déjà relevée | ☐ |
| CL-D14.A09 | 02 | Inscrire dans la v3 l’arbitrage CCO-12 (livreur : prénom + adresse par repères, jamais le numéro) pour lever la contradiction 19.1 / 2.4 / 9.5 — spec v3 §19.1 — CCO-12 | ☐ |
| CL-D14.A10 | 02 | Stocker les moyens de paiement côté serveur avec OTP obligatoire à l’ajout — back — CCO-15 | ☐ |
| CL-D14.A11 | 02 | Trancher l’usage de la carte : réservée au payeur à l’étranger (CCO-17, CL-12) vs payable par la cliente dans la feuille « Moyen de paiement » (CL-08 Fig. 14) — CL-08 / CL-13 — cohérence déjà relevée | ☑ |
| CL-D14.A12 | 02 | Aligner « autre numéro » non vérifié pour un paiement ponctuel (CL-08 CPY-46, Fig. 13) avec « aucun numéro ajouté sans code » et « un numéro appartient à un seul compte » (CCO-15) — CL-08 / CL-13 — cohérence | ☑ |
| CL-D14.A13 | 03 | Créer l’écran « Factures » (GET /me/factures, PDF serveur, avoir de litige, archive > 12 mois) — application client / back — CCO-18 à CCO-21 | ☐ |
| CL-D14.A14 | 03 | Faire valider par le juriste la mention légale du vendeur sur la facture émise par BelivaY — juridique — CCO-20 | ☐ |
| CL-D14.A15 | 03 | Créer « Supprimer mon compte » (409 compte_en_cours, OTP, pseudonymisation des données légales) — back / application client — CCO-22, CCO-23 | ☐ |
| CL-D14.A16 | 03 | Corriger la politique de confidentialité qui promet la suppression « depuis votre espace personnel » sans écran existant (écran ajouté) — pages légales — cohérence | ☐ |
| CL-D14.A17 | 03 | Supprimer routes et tuiles Fidélité, Parrainage, Portefeuille, Sécurité, À propos, « Vous êtes déjà vendeur » — application client — CCO-25 | ☐ |
| CL-D14.A18 | 03 | Corriger côté serveur le bug de sessions multiples (une par connexion) — back — sécurité | ☐ |
| CL-D14.A19 | 03 | Ne jamais montrer au client les commissions vendeur (« 12 % à 23 % ») — application client — 17.4 | ☐ |
| CL-D14.A20 | 04 | Créer l’écran « Donner mon avis » (deux notes, une par colis vendeur, relais une fois, facultatifs, modification dans la fenêtre) — application client — CAV-01 à CAV-14 | ☐ |
| CL-D14.A21 | 04 | Trancher AVIS-FENETRE (7 jours proposés, valeur relais AVI-06) et AVIS-BAS (2 étoiles) — registre — CAV-10, CAV-13 | ☑ |
| CL-D14.A22 | 04 | Implémenter POST/PUT /orders/{id}/reviews avec 403 non_eligible et 410 fenetre_fermee — back — CAV-09, CAV-10 | ☐ |
| CL-D14.A23 | 04 | Afficher la proposition de litige seulement après la réponse 201 (jamais conditionnée) — application client — CAV-13 | ☐ |
| CL-D14.A24 | 04 | Brancher review.created sur le Trust Score vendeur et relais (critère Satisfaction 20 points) — back / VD / PR — liaisons | ☐ |
| CL-D14.A25 | 04 | Mettre en place la modération des commentaires et photos (masqué, motif tracé, note conservée) — ADM / back — états | ☐ |
| CL-D14.A26 | 05 | Retirer côté vendeur le « retrait d’un avis manifestement injuste par un médiateur » (AVI-02), contraire à CAV-16 — VD — cohérence | ☐ |
| CL-D14.A27 | 05 | Implémenter la modération tracée et le calcul de Wilson pour le départage — back / ADM — CAV-16, CAV-18 | ☐ |
| CL-D14.A28 | 05 | Publier SUP-WA et trancher SUP-DELAI / SUP-HORAIRES — registre / console — CSV-03 à CSV-05 | ☐ |
| CL-D14.A29 | 05 | Harmoniser les heures du support client (7 h – 21 h, WhatsApp) et relais (8 h – 20 h, sans WhatsApp, MSG-06) — ADM / PR — cohérence déjà relevée | ☐ |
| CL-D14.A30 | 05 | Supprimer « Appeler maintenant », l’e-mail et le numéro direct ; remplacer par le rappel masqué ; corriger le domaine .cm/.com — application client — CSV-01 | ☐ |
| CL-D14.A31 | 05 | Refaire la FAQ en six thèmes (paiement, retrait et code, garde, litige, retour, compte) avec les vraies règles — application client — CSV-02 | ☐ |
| CL-D14.A32 | 06 | Refaire la FAQ (27 questions) avec gabarits du registre résolus côté serveur, FR et EN — application client / back — CSV-08, CSV-09 | ☐ |
| CL-D14.A33 | 06 | Implémenter le filtre de masquage serveur avant écriture (texte original non stocké) — back — CSV-12 | ☐ |
| CL-D14.A34 | 06 | Inscrire dans la v3 le passage en lecture seule du fil de dossier à la clôture (règle vendeur MSG-02) — spec v3 §15.2 — CSV-15 | ☐ |
| CL-D14.A35 | 06 | Corriger la variante LIT-3045 : « pagne, 10 h 40 » (CL-13 Fig. 33) alors que CL-11 met en cause les sandales (Colis 2) et déclare le pagne en ordre — CL-11 / CL-13 — cohérence | ☐ |
| CL-D14.A36 | 06 | Suivre en console le délai SUP-DELAI et marquer les fils « Résolue » — ADM — CSV-05, CSV-15 | ☐ |
| CL-D14.A37 | 07 | Créer le rappel masqué (POST /support/callback, passerelle voix, numéro jamais affiché à l’agent) — back / support — CSV-16 | ☐ |
| CL-D14.A38 | 07 | Publier les huit textes légaux versionnés FR/EN avec « L’essentiel » et PDF ; enregistrer la version acceptée — pages légales / back — CLG-01 à CLG-05 | ☐ |
| CL-D14.A39 | 07 | Obtenir du juriste le texte complet et les mentions légales (raison sociale, RCCM, NIU, siège, directeur de publication, hébergeur) avant l’ouverture — juridique — CLG-06 | ☐ |
| CL-D14.A40 | 07 | Ajouter un réglage « Mesure d’audience » révocable (cookies) dans Réglages — application client — arbitrage CRG-07 | ☐ |
| CL-D14.A41 | 07 | Harmoniser les routes légales : GET /legal/{doc} et POST /me/legal/accept (CL-13) vs routes « current / terms-acceptance » relevées ailleurs — spec API / ADM — cohérence déjà relevée | ☑ |
| CL-D14.A42 | 07 | Corriger le domaine du contact (.cm vs .com) — pages légales — cohérence | ☑ |
| CL-D14.A43 | 07 | Figer la version des paramètres à la commande et annoncer tout changement de tarif avant vigueur — back / ADM — CLG-07 | ☐ |
| CL-D14.A44 | 08 | Implémenter l’état réseau global (intercepteur, bannières, cache chiffré, boutons d’argent grisés sans mise en file) — application client — CDM-01 à CDM-08 | ☐ |
| CL-D14.A45 | 08 | Ajouter au registre du chapitre 20 : SUP-WA, SUP-DELAI, SUP-HORAIRES, NET-LENT, CACHE-CODE — registre / spec §20 — lacune | ☑ |
| CL-D14.A46 | 08 | Décider (porteur) : pidgin en troisième langue, fenêtre de notation, numéro WhatsApp — produit — CRG-01, CAV-10, CSV-03 | ☐ |
| CL-D14.A47 | 08 | Harmoniser le thème par défaut : « Clair par défaut à l’ouverture » (CRG-04, décision du 25 sept.) vs « Suivre le téléphone au premier lancement » (mise à niveau) et Fig. 51 « Automatique : comme ton téléphone » — CL-13 / CL-01 — cohérence | ☑ |
| CL-D14.A48 | 08 | Aligner le SMS de repli de la Fig. 49 (121 caractères, lien belivay.com/r/K7Q2) sur le texte définitif du C3 de CL-10 (159 caractères, belivay.com/r/7KQ2MX4P) — CL-13 / CL-10 — cohérence | ☐ |
| CL-D14.A49 | 08 | Prévoir un emplacement pour la réponse privée du gérant à un avis (relais AVI-05), absente de la v3 (fil « Relais Mvog-Ada · réponse à ton avis ») — spec v3 / PR — lacune | ☑ |
| CL-D14.A50 | 08 | Ajouter le réglage « Mesure d’audience » (désactivé par défaut) conformément à la politique cookies — application client — CRG-07 | ☐ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D14.Q01 | 01 | Nombre d’onglets de la barre du bas. | répondu par les données (revue/CL-13.md) |
| CL-D14.Q02 | 01 | Définition de « nouveau compte » pour le plafond comptoir. | répondu par les données (revue/CL-13.md) |
| CL-D14.Q03 | 02 | Carte pour la cliente locale ? | DP-23 : décidée (decisions-porteur.md) |
| CL-D14.Q04 | 02 | Paiement ponctuel depuis un numéro non vérifié / appartenant à un autre compte. | répondu par les données (revue/CL-13.md) |
| CL-D14.Q05 | 03 | Mention légale du vendeur sur la facture (juriste). | à décider (revue/decisions.md) |
| CL-D14.Q06 | 04 | AVIS-FENETRE et AVIS-BAS à trancher. | DP-15 : proposée (decisions-porteur.md) |
| CL-D14.Q07 | 05 | Heures de support client vs relais. | répondu par les données (revue/CL-13.md) |
| CL-D14.Q08 | 05 | SUP-WA non publié. | à décider (revue/decisions.md) |
| CL-D14.Q09 | 05 | Domaine contact (.cm vs .com). | DP-38 : décidée (decisions-porteur.md) |
| CL-D14.Q10 | 06 | LIT-3045 variante application : pagne ou sandales. | répondu par les données (revue/CL-13.md) |
| CL-D14.Q11 | 06 | Lecture seule du fil à la clôture (absente de la v3). | répondu par les données (revue/CL-13.md) |
| CL-D14.Q12 | 07 | Mentions légales à fournir par le juriste. | DP-40 : à préciser (decisions-porteur.md) |
| CL-D14.Q13 | 07 | Routes légales divergentes entre documents. | répondu par les données (revue/CL-13.md) |
| CL-D14.Q14 | 08 | Thème par défaut (Clair vs Automatique). | répondu par les données (revue/CL-13.md) |
| CL-D14.Q15 | 08 | Pidgin, fenêtre de notation, WhatsApp (décisions du porteur). | DP-13 : décidée (decisions-porteur.md) |
| CL-D14.Q16 | 08 | Texte du SMS de repli. 19.5 | répondu par les données (revue/CL-13.md) |

## 15 · CL-14

15 — CL-14 — Après lancement — abonnement, listes, ventes flash et assistant — dossier : 01_Documents / 3 — Écrans, un document par groupe d’écrans / 15 — CL-14 — Après lancement — abonnement, listes, ventes flash et assistant

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D15.A01 | 01 | Créer les six interrupteurs (fermés) dans la table des paramètres, versionnés en console, et GET /config/flags — back / ADM — CFS-01, CFS-06 | ☐ |
| CL-D15.A02 | 01 | Refuser en console l’ouverture d’un module tant qu’une valeur « à trancher » (LST-VALIDITE, FLASH-BUDGET, IA-COUT-MAX) n’est pas décidée — ADM — CFS-07 | ☐ |
| CL-D15.A03 | 01 | Faire masquer par le relais et le vendeur ce qui dépend d’un module fermé (PR CAL-06, STK-08, EXT-07 ; VD VD-10, OFR-05) — PR / VD — CFS-09 | ☐ |
| CL-D15.A04 | 01 | Poser les liens d’entrée des modules dans CL-13 (Compte « Abonnement Prime », Aide « Assistant BelivaY ») et CL-07 (Sauvegardés « Listes d’envies ») — CL-13 / CL-07 — tableau d’emplacement | ☐ |
| CL-D15.A05 | 01 | Décider le sort des abonnements en cours si un interrupteur est refermé (recommandé : honorés jusqu’au terme) — spec §32 — hors périmètre | ☑ |
| CL-D15.A06 | 01 | Rapprocher VD-10 « récompense mensuelle vente flash offerte » (ici) de l’écart VD-10 « bande Sponsorisé » relevé ailleurs — VD — cohérence | ☐ |
| CL-D15.A07 | 02 | Créer l’écran « Abonnements » (ordre serveur, annuel par défaut, avantages 21.2 seulement, encart CAB-10, point mort) derrière FF-ABONNEMENT — application client — CAB-01 à CAB-15 | ☐ |
| CL-D15.A08 | 02 | Calculer côté serveur most_chosen et business_open — back — CAB-06, CAB-09 | ☐ |
| CL-D15.A09 | 02 | Créer ABO-DECLENCHEUR-FREQ (2 commandes / 30 jours) au registre — registre — CAB-20 | ☑ |
| CL-D15.A10 | 02 | Renvoyer subscription_trigger dans GET /cart seulement si toutes les conditions CAB-20 sont vraies ; aucun emplacement sur les écrans de paiement — back — CAB-16 à CAB-21 | ☐ |
| CL-D15.A11 | 02 | Supprimer les écrans d’abonnement actuels (Essentiel/Premium/BelivaY+) et leurs avantages inventés — application client — CAB-07, CAB-13 | ☐ |
| CL-D15.A12 | 02 | Trancher les prix ABO-* (Proposé) avant l’ouverture — registre — CAB-01 | ☑ |
| CL-D15.A13 | 03 | Implémenter POST /subscriptions (formules, 409 trial_used par compte OU numéro, écran d’attente standard CL-08) — back — CAB-22 à CAB-28 | ☐ |
| CL-D15.A14 | 03 | Créer au registre ABO-PREAVIS (3 jours) et ABO-PASS7-DELAI (30 jours) — registre — CAB-22, CAB-27 | ☑ |
| CL-D15.A15 | 03 | Définir la vérification du justificatif Business (patente ou RCCM) en console avant activation — ADM — CAB-31 | ☐ |
| CL-D15.A16 | 03 | Supprimer le prélèvement sur porte-monnaie et afficher les conditions avant paiement — application client — CAB-29 | ☐ |
| CL-D15.A17 | 03 | Trancher les prix ABO-PASS7, ABO-ESSAI (Proposé) — registre — CAB-23, CAB-26 | ☑ |
| CL-D15.A18 | 04 | Corriger la formule « 3 + bonus » imprimée en 21.5 en « 1 + bonus » (jours gratuits d’abonné) — spec v3 §21.5 — CAB-40 | ☐ |
| CL-D15.A19 | 04 | Retirer côté relais le paiement des jours de garde offerts aux abonnés (PR CAL-06, VER-11) — PR — CAB-41 | ☐ |
| CL-D15.A20 | 04 | Ajouter les événements subscription.cancelled et referral.rewarded — spec API / back — développeur | ☑ |
| CL-D15.A21 | 04 | Inscrire dans la v3 la dépense de la cagnotte (ligne de remise, jamais sous le plancher de contribution) — spec v3 §21.5 — CAB-53 | ☐ |
| CL-D15.A22 | 04 | Inscrire dans la v3 la forme de la récompense de parrainage (report d’un mois du prélèvement) — spec v3 §21.4 — CAB-56 | ☐ |
| CL-D15.A23 | 04 | Calculer la cagnotte par sous-commande à la libération, l’annuler au remboursement, l’expirer à 90 jours — back — CAB-50 à CAB-52 | ☐ |
| CL-D15.A24 | 04 | Trancher ABO-QUOTA-PLUS, ABO-GARDE-BONUS, ABO-GRACE, ABO-CAGNOTTE, ABO-PARRAIN (Proposé) — registre — paramètres | ☑ |
| CL-D15.A25 | 05 | Créer la page belivay.com/offrir (404 tant que FF-ABONNEMENT fermé) avec recherche du bénéficiaire par numéro (prénom + initiale seulement) — web / back — CAB-59 à CAB-62 | ☐ |
| CL-D15.A26 | 05 | Créer ABO-SEUIL-DOM (15 000 F) et fixer les seuils non imprimés de Duo et Business — registre / spec v3 §21.2 — CAB-67 | ☑ |
| CL-D15.A27 | 05 | Faire rejouer en console la vérification économique (21.3) avec les vraies valeurs avant toute activation ; bloquer toute formule sous le plancher — ADM — CAB-64 | ☐ |
| CL-D15.A28 | 05 | Mesurer coût réel de livraison et fréquence d’achat avant de figer les prix (21.1) — produit / ADM — hypothèses | ☐ |
| CL-D15.A29 | 05 | Corriger côté relais : l’abonnement appliqué à un colis de liste d’envies est celui du destinataire, pas du propriétaire (PR CAL-06) — PR — 22.4 | ☐ |
| CL-D15.A30 | 05 | Implémenter les listes (GET/POST /lists, groupé avec date obligatoire, capacité du relais vérifiée) — back — CLE-07 à CLE-10 | ☐ |
| CL-D15.A31 | 05 | Faire de favoris, Sauvegardés et cœur un seul objet avec un seul compteur — back / application client — CLE-02 | ☐ |
| CL-D15.A32 | 06 | Implémenter GET /lists/{id}, DELETE (409 already_gifted), POST /lists/{id}/release-now et POST /lists/{id}/share — back — CLE-11 à CLE-26 | ☐ |
| CL-D15.A33 | 06 | Trancher LST-VALIDITE (défaut 30 jours montré) avant l’ouverture du module — registre — CLE-24, CFS-07 | ☑ |
| CL-D15.A34 | 06 | Rapprocher Soa « hors des zones exploitées » (Fig. 33) de la console et du jeu d’essai où Soa est une zone exploitée, et Relais Melen / Bastos / Essos des listes de relais — CL-14 / ADM / JEU_ESSAI — cohérence déjà relevée | ☐ |
| CL-D15.A35 | 06 | Inscrire dans la v3 la précision du second groupe (plafond de 21 jours compté depuis son propre premier cadeau payé) — spec v3 §22.5 — CLE-15 | ☐ |
| CL-D15.A36 | 06 | Vérifier la capacité déclarée du relais tiers pour une liste groupée — PR / back — CLE-10, CLE-21 | ☐ |
| CL-D15.A37 | 06 | Interdire toute relance automatique et tout envoi depuis un numéro BelivaY — back / service d’envoi — interdits | ☐ |
| CL-D15.A38 | 07 | Créer la page publique belivay.com/l/… (GET /lists/public/{token}, 410, aucune donnée personnelle, aucun compteur) — web / back — CLE-27 à CLE-33 | ☐ |
| CL-D15.A39 | 07 | Implémenter POST /lists/{id}/items/{item}/gift avec verrou, réservation, 409 typés et paiement sans compte — back — CLE-34 à CLE-40 | ☐ |
| CL-D15.A40 | 07 | Appliquer l’abonnement du destinataire du colis (corriger le relais PR CAL-06 qui applique celui du propriétaire) — PR / back — CLE-37 | ☐ |
| CL-D15.A41 | 07 | Préciser qui supporte la garde retenue quand un colis de cadeau non retiré est renvoyé (le remboursement va au payeur) — spec v3 §22.4 — lacune | ☑ |
| CL-D15.A42 | 07 | Remplacer « Aïcha » par le prénom du jeu d’essai dans les exemples de la spec (22.4) — spec v3 — cohérence | ☐ |
| CL-D15.A43 | 08 | Corriger côté relais : abonnement du destinataire pour un colis de liste (PR CAL-06, STK-10, EXT-07) et affichage « en groupage » sans montant dû — PR — CLE-37, CLE-48 | ☐ |
| CL-D15.A44 | 08 | Trancher FLASH-BUDGET avant l’ouverture de FF-FLASH ; trancher FLASH-DUREE-MAX et FLASH-REMISE-MIN — registre — CFS-07, CVF-03, CVF-02 | ☐ |
| CL-D15.A45 | 08 | Contrôler en console à la publication d’une offre : durée, remise ≥ 10 % sur prix réellement pratiqué (historique), plancher de contribution, capacité du relais — ADM — CVF-01 à CVF-06 | ☐ |
| CL-D15.A46 | 08 | Supprimer les pages « Promotions du moment » / « Flash Deals », le code BIENVENUE10 et toute rareté simulée — application client — interdits | ☐ |
| CL-D15.A47 | 08 | Faire accepter la remise flash par le vendeur offre par offre avec affichage de ce qu’il garde — VD — liaisons | ☐ |
| CL-D15.A48 | 09 | Créer l’assistant derrière FF-IA (AIService 100 % API, feuilles de confirmation, passage à un humain, propositions in-app) et supprimer le robot flottant actuel — application client / back — CIA-01 à CIA-12 | ☐ |
| CL-D15.A49 | 09 | Fixer IA-COUT-MAX après 60 jours de mesure avant l’ouverture — registre / ADM — CFS-07, CIA-12 | ☐ |
| CL-D15.A50 | 09 | Ajouter FLASH-ZONE au registre 32.4 — spec v3 §32.4 — lacune | ☐ |
| CL-D15.A51 | 09 | Créer ABO-PREAVIS, ABO-DECLENCHEUR-FREQ, ABO-PASS7-DELAI, ABO-SEUIL-DOM, ABO-CHOISI-FENETRE — registre — codes recommandés | ☑ |
| CL-D15.A52 | 09 | Corriger 21.5 (« 3 + bonus » → « 1 + bonus ») et 21.3 (exemple : 4 relais + 1 domicile) dans la v3 — spec v3 — contradictions | ☐ |
| CL-D15.A53 | 09 | Trancher le supplément colis L (+ 300 F) cité dans l’alternative de l’assistant (LIV-SUPPL-L) — registre — cohérence déjà relevée | ☑ |
| CL-D15.A54 | 09 | Vérifier la cohérence du jeu d’essai : Carine abonnée à l’essai Prime à 08 h 41 (CL-14) et « Carine ne verrait pas le déclencheur, 5 commandes en septembre » — JEU_ESSAI — cohérence | ☐ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D15.Q01 | 01 | Interrupteur refermé avec abonnés en cours. | DP-41 : décidée (decisions-porteur.md) |
| CL-D15.Q02 | 01 | VD-10 (deux sens selon les documents). | répondu par les données (revue/CL-14.md) |
| CL-D15.Q03 | 02 | Prix des paliers (Proposé). | DP-41 : décidée (decisions-porteur.md) |
| CL-D15.Q04 | 02 | Carine « 5 commandes en septembre » (jeu d’essai) : cohérence avec la liste de ses commandes (4 en cours + 1 retirée en septembre). | répondu par les données (revue/CL-14.md) |
| CL-D15.Q05 | 03 | Vérification Business non décrite par la spec. | répondu par les données (revue/CL-14.md) |
| CL-D15.Q06 | 04 | « 3 + bonus » (21.5) vs « 1 + bonus ». | répondu par les données (revue/CL-14.md) |
| CL-D15.Q07 | 04 | Dépense de la cagnotte et récompense de parrainage non décrites par la spec. | répondu par les données (revue/CL-14.md) |
| CL-D15.Q08 | 05 | Seuils domicile/relais pour Duo et Business non imprimés. | répondu par les données (revue/CL-14.md) |
| CL-D15.Q09 | 05 | Abonnement appliqué aux colis de liste (destinataire vs propriétaire). | répondu par les données (revue/CL-14.md) |
| CL-D15.Q10 | 06 | LST-VALIDITE par défaut. | DP-41 : décidée (decisions-porteur.md) |
| CL-D15.Q11 | 06 | Soa hors zone ou exploitée. | DP-09 : décidée (decisions-porteur.md) |
| CL-D15.Q12 | 07 | Garde d’un cadeau non retiré : retenue sur le remboursement du payeur ? | DP-41 : décidée (decisions-porteur.md) |
| CL-D15.Q13 | 07 | Prénom de l’exemple (Aïcha vs Carine). | répondu par les données (revue/CL-14.md) |
| CL-D15.Q14 | 08 | FLASH-BUDGET, LST-VALIDITE à trancher. | à décider (revue/decisions.md) |
| CL-D15.Q15 | 09 | IA-COUT-MAX, FLASH-BUDGET, LST-VALIDITE à trancher. | répondu par les données (revue/CL-14.md) |
| CL-D15.Q16 | 09 | Supplément colis L. 20.5 | DP-07 : décidée (decisions-porteur.md) |

## 16 · CL-15

16 — CL-15 — Après lancement — nouveautés EX01 à EX06 — dossier : 01_Documents / 3 — Écrans, un document par groupe d’écrans / 16 — CL-15 — Après lancement — nouveautés EX01 à EX06

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D16.A01 | 01 | Construire les six modules derrière FF-EX01 … FF-EX06, sans aucun lien sur les écrans de lancement — application client — CRS-01, 32.1 | ☐ |
| CL-D16.A02 | 01 | Retirer « IMEI vérifiable avant expédition » des pages Téléphones de lancement — CL-05/CL-06 — TRC-05 | ☐ |
| CL-D16.A03 | 01 | Ajouter RNT-GROUPAGE-J (21 jours) au registre 32.5 — spec v3 §32.5 — lacune | ☐ |
| CL-D16.A04 | 01 | Poser les liens d’entrée dans CL-07, CL-06 et CL-13 (dont « Commander sur WhatsApp », seul écran sans lien entrant) — CL-06 / CL-07 / CL-13 — emplacements | ☐ |
| CL-D16.A05 | 01 | Harmoniser le domaine des liens : belivay.cm/c/7KQ2M (cotisation) vs belivay.com ailleurs — CL-15 / web — cohérence | ☑ |
| CL-D16.A06 | 01 | Reporter DX_cl15 dans CL-02 (jeu d’essai) sans modifier les listes du lancement — jeu d’essai — DX_cl15 | ☐ |
| CL-D16.A07 | 01 | Mettre en place en console la vérification des écoles et la saisie des listes papier sous 24 h — ADM — RNT-01, RNT-02 | ☐ |
| CL-D16.A08 | 02 | Implémenter liste papier (POST /paper-lists, délai en heure ferme, liste privée) — back / application client — RNT-02, CRS-08, CRS-09 | ☐ |
| CL-D16.A09 | 02 | Recalculer le total depuis zéro à chaque case cochée ou décochée (ramassages compris) et l’expliquer — back / application client — RNT-04, CRS-12 | ☐ |
| CL-D16.A10 | 02 | Gérer l’historique des listes modifiées et le push aux parents concernés — back — RNT-11, CRS-13 | ☐ |
| CL-D16.A11 | 02 | Appliquer l’éligibilité de la mise de côté au total de la liste (inscrire dans la v3) — spec v3 §27.5 — CRS-16 | ☐ |
| CL-D16.A12 | 02 | Refuser le paiement au comptoir pour une liste groupée (inscrire dans la v3) — spec v3 §25 — CRS-15 | ☐ |
| CL-D16.A13 | 02 | Vérifier la capacité du relais avant une liste groupée et proposer un autre relais de la zone s’il est saturé — back / PR — états | ☐ |
| CL-D16.A14 | 02 | Remplacer la phrase de garde « 100 F par jour dès demain » par la grille à paliers — CL-15 / CL-10 — cohérence déjà relevée | ☑ |
| CL-D16.A15 | 03 | Trancher COT-FRAIS (2 % à confirmer avec les vrais frais de paiement) avant l’ouverture — registre — CCZ-04 | ☐ |
| CL-D16.A16 | 03 | Vérifier le cumul de frais pour une participation par carte : 2 % de service inclus dans l’objectif + 2 % de frais carte ajoutés à la participation — CL-15 / registre — cohérence | ☐ |
| CL-D16.A17 | 03 | Implémenter l’escrow « cotisation » (jauge alimentée par le webhook, plafond au manque, remboursement sur moyen d’origine à l’échéance) — back — CCZ-03, CCZ-08 | ☐ |
| CL-D16.A18 | 03 | Créer l’espace école (brouillon, rattachement produit maître, historique, gratuité) — back / web — RNT-10, CRS-22 | ☐ |
| CL-D16.A19 | 03 | Harmoniser le domaine belivay.cm/c/… avec belivay.com — web — cohérence déjà relevée | ☑ |
| CL-D16.A20 | 03 | Rompre le groupage de la liste de rentrée au 21e jour comme en 22.5 (inscrire dans la v3) — spec v3 §25.5 — CRS-18 | ☐ |
| CL-D16.A21 | 04 | Implémenter la création automatique de la commande à l’objectif (au nom de l’organisateur, relais du bénéficiaire) et la gestion d’une hausse (≤ 5 % absorbée, sinon choix) — back — CCZ-12, CCZ-13 | ☐ |
| CL-D16.A22 | 04 | Rembourser chaque participant le lendemain de l’échéance, frais de carte compris — back — CCZ-14 | ☐ |
| CL-D16.A23 | 04 | Faire valider par le juriste le forfait d’annulation MDC-FORFAIT (assimilable à des arrhes) avant l’ouverture — juridique — MDC-FORFAIT | ☐ |
| CL-D16.A24 | 04 | Ajouter MDC-PRIX-MIN (20 000 F) au registre 32.5 — spec v3 §32.5 — lacune | ☐ |
| CL-D16.A25 | 04 | Implémenter la mise de côté (réservation longue, plan, rappels J−2/J0, carte à part sans BLV, commande au dernier versement) — back / application client — CMD-03 à CMD-09 | ☐ |
| CL-D16.A26 | 04 | Trancher LIV-SUPPL-M / L (L 300 F montré) — registre — cohérence déjà relevée | ☑ |
| CL-D16.A27 | 04 | Afficher côté vendeur « réservé · mise de côté » avec la date de fin et le forfait en cas d’annulation — VD — liaisons | ☐ |
| CL-D16.A28 | 05 | Faire valider par le juriste la nature d’arrhes du forfait d’annulation avant l’ouverture — juridique — CMD-13 | ☐ |
| CL-D16.A29 | 05 | Implémenter annulation automatique en fin de grâce avec messages (début, veille, annulation) — back / service d’envoi — CMD-10 | ☐ |
| CL-D16.A30 | 05 | Corriger 28.0 et 28.4 de la v3 : remplacer « Reste à payer » / « reste estimé » par « Montant à payer » / « Montant à payer estimé » — spec v3 §28 — CTR-04 | ☐ |
| CL-D16.A31 | 05 | Contractualiser le reconditionneur (TRC-PARTENAIRE) et identifier la source de la liste des téléphones volés (TRC-IMEI-SOURCE, à ajouter au registre 32.5) — produit / juridique / registre — À trancher | ☐ |
| CL-D16.A32 | 05 | Implémenter le dépôt au relais avec lecture IMEI, pièce d’identité, photo, refus sur place d’un téléphone signalé — PR / back — CTR-03 | ☐ |
| CL-D16.A33 | 05 | Retirer « IMEI vérifiable avant expédition » de la catégorie Téléphones au lancement — CL-05 / CL-06 — TRC-05 | ☐ |
| CL-D16.A34 | 06 | Implémenter le dépôt de troc côté relais (code de dépôt, *#06#, liste des volés, pièce, photo, refus sur place, rémunération comme un colis) — PR / back — TRC-05, TRC-06, CTR-06, CTR-07 | ☐ |
| CL-D16.A35 | 06 | Afficher l’IMEI masqué au client (4 derniers chiffres) — application client — CTR-06 | ☐ |
| CL-D16.A36 | 06 | Gérer contre-offre, retour gratuit du téléphone au relais d’origine et alerte en cas d’inspection en retard — back — CTR-10, CTR-11 | ☐ |
| CL-D16.A37 | 06 | Ajouter FAM-MAX-TX (150 000 F) au registre 32.5 — spec v3 §32.5 — lacune | ☐ |
| CL-D16.A38 | 06 | Implémenter le panier famille (paniers prêts, 5 kg max, carte tokenisée, préavis J−3 au prix recalculé, suspension en un geste, preuve au payeur) — back / web — CFM-01 à CFM-04 | ☐ |
| CL-D16.A39 | 06 | Rapprocher « familles C, commission k = 1/2 » des modèles de commission de la console et du vendeur — ADM / VD — cohérence déjà relevée | ☐ |
| CL-D16.A40 | 06 | Trancher PAY-CARTE-PSP et LIV-SUPPL-L — registre — À trancher | ☑ |
| CL-D16.A41 | 07 | Implémenter le « lien famille » (payeur ↔ bénéficiaire, sans adresse ni numéro) — back — CFM-06 | ☐ |
| CL-D16.A42 | 07 | Débiter au montant du préavis et redemander confirmation en cas de nouvelle hausse — back — CFM-09 | ☐ |
| CL-D16.A43 | 07 | Envoyer la preuve de retrait au payeur (push, e-mail si pas d’accusé fort sous 10 min) avec le nom saisi au comptoir — service d’envoi — CFM-10 | ☐ |
| CL-D16.A44 | 07 | Ajouter WAP-API au registre 32.5 ; trancher WAP-COUT et WAP-VOCAL-CONSERV (consentement, durée) — registre / juridique — CWA-01 | ☐ |
| CL-D16.A45 | 07 | Construire le module WhatsApp IA sur l’API payante (webhook, transcription, AIService, « OUI », lien court vers le paiement de base) sans jamais brancher de commande sur le numéro du support humain — back — CWA-01 à CWA-04 | ☐ |
| CL-D16.A46 | 07 | Rattacher le fil WhatsApp à la commande en console pour le support (WAP-05) — ADM — CWA-04 | ☐ |
| CL-D16.A47 | 08 | Fixer la durée de conservation des vocaux (WAP-VOCAL-CONSERV) et l’insérer dans le texte de consentement « supprimé après [durée à fixer] » — registre / texte Fig. 48 — WAP-06, CWA-05, CRV-09 | ☐ |
| CL-D16.A48 | 08 | Enregistrer le consentement vocal (texte, version, horodatage) et supprimer le vocal sans « OK » — back — CWA-05 | ☐ |
| CL-D16.A49 | 08 | Faire calculer la proposition par le service de tarification (produits maîtres, offre attribuée, relais habituel, heure ferme, validité jusqu’à fin de journée) — back — WAP-04, CWA-06 | ☐ |
| CL-D16.A50 | 08 | Corriger l’affichage du calcul Fig. 49 : le retrait est présenté à 900 F dans la proposition mais la formule écrit « 500 + 400 » — texte / maquette — cohérence tarif retrait | ☑ |
| CL-D16.A51 | 08 | Implémenter le passage à un humain (doute, demande, 2 échecs = IA-HUMAIN) dans le même fil, avec heure de réponse hors horaires — back / ADM — WAP-05, CWA-07 | ☐ |
| CL-D16.A52 | 08 | Accepter seulement « OUI »/« YES » (casse et accents indifférents) pour créer la commande en attente de paiement ; redemander ou passer à un humain sinon — back — WAP-01, CWA-08 | ☐ |
| CL-D16.A53 | 08 | Générer un lien court signé (commande + numéro vérifié) vers « Paiement en attente » ; lien expiré → nouveau lien au prix du moment — back — CWA-09 | ☐ |
| CL-D16.A54 | 08 | Confirmer le paiement sur WhatsApp uniquement depuis le webhook de paiement ; n’envoyer ni code, ni photo du relais, ni preuve — back — WAP-02, WAP-03, CWA-10 | ☐ |
| CL-D16.A55 | 08 | Ne créer aucun champ ni route permettant les idées écartées (intérêts, rachat BelivaY, retrait en espèces d’une cotisation, achat IA sans « OUI », rémunération des écoles) — back — CRV-10 à CRV-14 | ☐ |
| CL-D16.A56 | 08 | Consigner la réserve (achat groupé, essayage, protection prix bas, garantie casse) avec son moment de reprise — backlog — CRV-01 à CRV-04 | ☐ |
| CL-D16.A57 | 08 | Trancher COT-FRAIS, MDC-FORFAIT (juriste), TRC-PARTENAIRE, TRC-IMEI-SOURCE, WAP-COUT, WAP-VOCAL-CONSERV avant d’activer EX-02, EX-03, EX-04, EX-06 — registre / direction — CRV-05 à CRV-09, CRV-16 | ☐ |
| CL-D16.A58 | 08 | Bloquer l’activation d’un module tant qu’une de ses valeurs est « à trancher » — console ADM — CRV-16 | ☐ |
| CL-D16.A59 | 08 | Ajouter au tableau 32.5 RNT-GROUPAGE-J, MDC-PRIX-MIN, TRC-IMEI-SOURCE, FAM-MAX-TX, WAP-API — registre — CRV-17 | ☑ |
| CL-D16.A60 | 08 | Créer tous les codes des nouveautés dans la table des paramètres, versionnés, inactifs derrière FF-EX01…FF-EX06 — back / ADM — CRV-15 | ☐ |
| CL-D16.A61 | 08 | Interrupteur fermé : masquer tout élément du module (encart, « Mettre de côté », « Offrir à plusieurs », « Troc », menu, route) et refuser les appels API — front / back — CRV-18 | ☐ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D16.Q01 | 01 | Domaine .cm vs .com. | DP-38 : décidée (decisions-porteur.md) |
| CL-D16.Q02 | 01 | RNT-GROUPAGE-J absent du registre. | répondu par les données (revue/CL-15.md) |
| CL-D16.Q03 | 01 | Supplément colis L (300 F) à trancher. | DP-07 : décidée (decisions-porteur.md) |
| CL-D16.Q04 | 02 | Éligibilité de la mise de côté sur le total de la liste (non écrite dans la spec). | répondu par les données (revue/CL-15.md) |
| CL-D16.Q05 | 03 | COT-FRAIS à confirmer ; double frais carte. | à décider (revue/decisions.md) |
| CL-D16.Q06 | 04 | MDC-FORFAIT (juriste), MDC-PRIX-MIN absent du registre, supplément L. | à décider (revue/decisions.md) |
| CL-D16.Q07 | 05 | Forfait (juriste), reconditionneur, source IMEI. | à décider (revue/decisions.md) |
| CL-D16.Q08 | 05 | « Reste à payer » dans la spec 28.x. | répondu par les données (revue/CL-15.md) |
| CL-D16.Q09 | 06 | FAM-MAX-TX et TRC-IMEI-SOURCE absents du registre. | répondu par les données (revue/CL-15.md) |
| CL-D16.Q10 | 06 | Commission « k = 1/2 » des familles C. | répondu par les données (revue/CL-15.md) |
| CL-D16.Q11 | 07 | WAP-COUT, WAP-VOCAL-CONSERV à trancher ; WAP-API absent du registre. | à décider (revue/decisions.md) |
| CL-D16.Q12 | 08 | Fig. 49 : proposition « retrait 900 F » mais formule « 7 000 + 4 800 + 500 + 400 » — décomposition du retrait (500 + 400 ?) à expliciter. | répondu par les données (revue/CL-15.md) |
| CL-D16.Q13 | 08 | WAP-01 et WAP-05 au statut « Proposé » dans la spec alors que CWA08/CWA-07 les précisent (Recommandé/Proposé) : statut à harmoniser. | répondu par les données (revue/CL-15.md) |
| CL-D16.Q14 | 08 | Domaine du lien court belivay.cm (cf. question .cm / .com déjà ouverte). | DP-38 : décidée (decisions-porteur.md) |
| CL-D16.Q15 | 08 | Valeurs À trancher : COT-FRAIS, MDC-FORFAIT, TRC-PARTENAIRE, TRCIMEI-SOURCE, WAP-COUT, WAP-VOCAL-CONSERV. | répondu par les données (revue/CL-15.md) |
| CL-D16.Q16 | 08 | Cinq codes absents du tableau 32.5 (CRV-17). | répondu par les données (revue/CL-15.md) |
| CL-D16.Q17 | 08 | Couverture : CTR-04 signale une contradiction avec 9.1 ; interdit « Reste à payer » en 28.4 (déjà noté). 21.5 | répondu par les données (revue/CL-15.md) |

## 17 · CL-16

17 — CL-16 — Registre, liaisons, recette et lexique — dossier : 01_Documents / 4 — Registre, tests et lexique / 17 — CL-16 — Registre, liaisons, recette et lexique

| Action | Partie | Quoi — où — pourquoi | Fait |
|---|---|---|---|
| CL-D17.A01 | 01 | Exposer au client et au relais le même montant de garde via GET /orders/{id}/storage (jamais de calcul local) — back / CL / PR — CLI-05 | ☐ |
| CL-D17.A02 | 01 | Stocker le code de retrait haché ; vérifier le code tapé ou scanné côté serveur — back — CLI-08, interdits 18.5 | ☑ |
| CL-D17.A03 | 01 | Payer le relais 100 F par jour facturé seulement (jamais jour gratuit, fermé, litige, groupage) — finance — CLI-06 | ☐ |
| CL-D17.A04 | 01 | Rémunérer un retour déposé comme une remise, hors capacité, sans garde — back / PR — CLI-11, CLI-14 | ☐ |
| CL-D17.A05 | 01 | Filtrer côté serveur les réponses d’API (vendeur sans données client ; client sans nom de boutique ni numéro du livreur) — back — CLI-17, CLI-31, CLI-41 | ☐ |
| CL-D17.A06 | 01 | Remplacer les repères « 24-72 h » de 3.1 et 6.2 par une heure/date ferme calculée (préparation + tournée + horaires du relais) — CL / logistique — CLI-30 | ☐ |
| CL-D17.A07 | 01 | Paramétrer et suivre par zone les six délais de service (SLA(z)) en console — ADM — CLI-30, CCN-08 | ☐ |
| CL-D17.A08 | 01 | Tenir compte du plafond de valeur du transporteur dans le délai affiché — logistique — CLI-24 | ☐ |
| CL-D17.A09 | 01 | Mettre en file hors ligne horodatée les remises au relais — LIV / PR — CLI-27 | ☐ |
| CL-D17.A10 | 01 | Créer la carte « Message » à t + 10 min pour une criticité 1 non délivrée — ADM — CCN-07 | ☐ |
| CL-D17.A11 | 01 | Remplacer le type « Caisse » par « Relais » et « Livraison » dans la file d’action — ADM — CCN-03 | ☐ |
| CL-D17.A12 | 01 | Désactiver « Rembourser / Remplacer / Débouter » tant que le motif est vide ; émettre dispute.decided avec decision.reason — ADM — CCN-06 | ☐ |
| CL-D17.A13 | 01 | Définir formule et pondérations du score de zone, seuil de remplissage et seuils d’alerte — direction / ADM — CCN-11 | ☑ |
| CL-D17.A14 | 01 | Rendre la simulation 30 jours obligatoire et bloquante sous le plancher de contribution — ADM — CCN-14 | ☐ |
| CL-D17.A15 | 01 | Figer chaque commande sur la version de paramètres de sa création — back — CCN-13 | ☐ |
| CL-D17.A16 | 01 | Trancher les rôles des deux validateurs (quatre yeux) — direction — CCN-19 | ☑ |
| CL-D17.A17 | 01 | Ajouter TRANSP-PLAFOND (code proposé) au registre — registre — 18.3 | ☑ |
| CL-D17.A18 | 01 | Calibrer les seuils de détection de fraude sur données réelles — ADM — CCN-16 | ☑ |
| CL-D17.A19 | 02 | Filtrer par rôle dans les sérialiseurs DRF ; tests : aucune réponse client avec shop.name, shop.phone, courier.phone ; aucune réponse vendeur avec client.*, relay.*, order.total — back — CTV-01, CTV-02, CTV-06 | ☐ |
| CL-D17.A20 | 02 | Masquer numéros (+237, 6 ·· ·· ·· ··), e-mails et identifiants sociaux à l’écriture et à la lecture — back messagerie — CTV-05 | ☐ |
| CL-D17.A21 | 02 | Créer dans la table tous les codes (y compris CTV-23 et codes proposés : TRANSP-PLAFOND, MSG-DISSOC, IFA-FREQ-ELEVE, ZONE-SCORE, ZONE-ALERTE, FRAUDE-SEUILS, ESCROW-VALIDEURS, CAT-INTERDITS, RET-TRAJET) — registre — CTV-19, CTV-23 | ☐ |
| CL-D17.A22 | 02 | Trancher avant production les valeurs du tableau 19.4 (ACC-RANGEE-MIN, CODE-BIO, GARDE-PRORATA, SMS-ECO, SMS-SECOURS, MSG-DISSOC, LIV-SUPPL-M/L/XL, IFA-*, ANN-PLAFOND, RET-SANS-RETOUR, RET-REMPL-DELAI, ZONE-*, FRAUDE-SEUILS, AVIS-FENETRE, AVIS-BAS, LST-VALIDITE, PAY-CARTE-PSP, ESCROW-VALIDEURS, CAT-INTERDITS, OTP-*) — direction — CTV-21, CTV-24 | ☐ |
| CL-D17.A23 | 02 | Préfixer les quatre sens de C1-C3 dans le code (MSG-C1, crit_1, CARTON-C1, PHOTO-C1) — back — CTV-30 | ☐ |
| CL-D17.A24 | 02 | Produire les vraies photos P1-P4, H1-H9, B1-B2, S1-S3, C1-C3, M1-M5, V1-V2, G1, L1 selon la consigne — design / terrain — CTV-27, CTV-28 | ☐ |
| CL-D17.A25 | 02 | Publier CAT-INTERDITS dans l’Aide vendeur et bloquer publication/recherche/fiche — ADM / VD / CL — CTV-31 | ☐ |
| CL-D17.A26 | 02 | Construire le menu depuis les données du compte, sans liste d’écrans ; entrées de module selon feature_flags ; rejouer inbound.js avant chaque recette — front / back — CTV-32 à CTV-34 | ☐ |
| CL-D17.A27 | 02 | Relais : retirer le doublement de la garde des colis L — PR-02 CAL-03, CAL-08 ; PR-05 RET-15 ; PR-06 STK-09 ; PR-11 EXT-10 — inter-espaces n° 2 | ☐ |
| CL-D17.A28 | 02 | Relais : retirer « WhatsApp lu » du J0 ; remplacer la relance 48 h par alerte console + rappel du support (GARDE-NONVU-H) — PR-02 CAL-02 ; PR-04 REC-07 ; PR-06 STK-12 — n° 3 | ☐ |
| CL-D17.A29 | 02 | Relais : adopter le rang v3 des jours fermés (compté sans être facturé) — PR-02 CAL-04 ; PR-06 STK-12 ; PR-07 FER-05 — n° 4 | ☐ |
| CL-D17.A30 | 02 | Relais : reprendre S0 à S5 (heures, textes, canaux 10.3) — PR-04 ACC-06 ; PR-06 STK-05 ; PR-08 NTF-09 ; PR-11 EXT-04 ; PR-02 NOT-04 — n° 6, 7 | ☐ |
| CL-D17.A31 | 02 | Relais : ne plus payer les jours offerts aux abonnés ; masquer « gratuit jusqu’au » tant que FF-ABONNEMENT fermé — PR-02 CAL-06, CAL-07, CAL-16 ; PR-06 STK-10, STK-11 ; PR-09 VER-11 — n° 9 | ☐ |
| CL-D17.A32 | 02 | Relais : frais de non-retrait retenus sur le remboursement, rien au comptoir ; trancher « deux non-retraits ⇒ paiement d’avance » — PR-02 CAL-18, CAL-19 ; PR-11 EXT-12, EXT-13 — n° 10 | ☑ |
| CL-D17.A33 | 02 | Écrire le préavis de changement de grille (30 jours) dans les pages légales v3 — CL-13 — n° 12 | ☐ |
| CL-D17.A34 | 02 | Relais : trois codes faux → nouveau code dans l’application, support non requis — PR-02 CAL-31 — n° 14 | ☐ |
| CL-D17.A35 | 02 | Relais : C3 toujours en SMS même avec l’application — PR-04 REC-08 — n° 16 | ☐ |
| CL-D17.A36 | 02 | Trancher relais fermé plusieurs jours : transfert automatique ou choix du client (gratuit, C4, nouveau code, garde au jour 1) — v3 / PR-07 FER-03, FER-04 — n° 17 | ☑ |
| CL-D17.A37 | 02 | Corriger le glossaire v3 : « code de dépôt » (livreur → relais) ; « code de dépôt du téléphone » pour le troc — v3 / CL-15 — n° | ☐ |
| CL-D17.A38 | 02 | Relais : l’écran du gérant attend l’appui du client sur « Tout est en ordre » — PR-05 RET-14 ; PR-11 EXT-05 — n° 20 | ☐ |
| CL-D17.A39 | 02 | Relais et vendeur : défaut après confirmation = vice caché, pas retour (ou corriger 12.6) — PR-05 RET-14 ; PR-07 LIT-01 ; PR-11 EXT-06 ; VD-07 RET-02 — n° 21 | ☐ |
| CL-D17.A40 | 02 | Trancher prénom (relais) ou civilité + nom (v3) pour le gérant montré au client — CL / PR — n° 23 | ☑ |
| CL-D17.A41 | 02 | Relais : horaires toujours visibles ; trancher l’affichage du score du relais — PR-10 CAP-03 ; PR-09 TRU-04 — n° 24 | ☑ |
| CL-D17.A42 | 02 | Vendeur : ajouter « 100 000 F après 5 commandes sans incident » à PAN-10 — VD-05 — n° 25 | ☐ |
| CL-D17.A43 | 02 | Trancher un terme commun pour « Validée · à payer au retrait » / « Payable au retrait » — CL / PR-01 GEN-12 / VD-04 ACC-04 — n° 26 | ☑ |
| CL-D17.A44 | 02 | Relais : recherche par numéro renvoie la référence sans afficher le numéro — PR-02 CAL-05 ; PR-05 RET-08 — n° 27 | ☐ |
| CL-D17.A45 | 02 | v3 : distinguer refus motivé et refus sans motif ; dire comment la garde due est encaissée — CL-08 — n° 28 | ☐ |
| CL-D17.A46 | 02 | Console : table de correspondance motifs client ↔ motifs du constat — ADM / CL-11 — n° 30 | ☐ |
| CL-D17.A47 | 02 | Trancher RET-SANS-RETOUR, le reporter dans PR-07 LIT-10 et PR-11 EXT-14 ; aligner CL-03 sur CL-11 — registre / PR / CL — n° 31, 38 | ☑ |
| CL-D17.A48 | 02 | Relais et vendeur : écrire « présomption en faveur du client ; BelivaY décide » — PR-07 LIT-04 ; PR-11 EXT-15 ; VD-04 ACC-05 ; VD-07 LIT-02 — n° 32 | ☐ |
| CL-D17.A49 | 02 | Trancher délai de décision (24 h ou 48 h), recours du client, délai de réponse du client ; une seule chronologie — CL-11 / PR-07 LIT-08 / VD-07 — n° 33 | ☑ |
| CL-D17.A50 | 02 | Constat au comptoir : 48 h ouvrées depuis la réception par le serveur, des deux côtés — CL-11 / PR — n° 34 | ☐ |
| CL-D17.A51 | 02 | Trancher « au lancement » ou « définitive » pour la suppression du retour sans motif — trois espaces — n° 36 | ☑ |
| CL-D17.A52 | 02 | Ajouter RET-TRAJET = 500 F au registre v3 — registre — n° 37 | ☐ |
| CL-D17.A53 | 02 | Décider RET-REMPL-DELAI = 72 h ouvrées ; ajouter l’état « remplacement proposé par le vendeur » à la v3 et à remplacement — CL-11 — n° 41 | ☑ |
| CL-D17.A54 | 02 | Relais : passer le transfert 400 F en « Décidé » — PR-02 CAL-36 ; PR-05 RET-11 ; PR-06 DEP-01 ; PR-11 EXT-17 — n° 44 | ☑ |
| CL-D17.A55 | 02 | Reporter le seuil de 90 % d’occupation dans la v3 (« avec de la place ») — v3 — n° 45 | ☐ |
| CL-D17.A56 | 02 | Trancher le relais qui refuse les colis L ; si retenu, message fiche/panier et bascule domicile — CL-06, CL-07 / PR-10 CAP-07 — n° 46 | ☑ |
| CL-D17.A57 | 02 | Ajouter à la v3 (15.2) la fermeture du fil à la clôture du dossier — CL-13 — n° 51 | ☐ |
| CL-D17.A58 | 02 | v3 : ajouter le carton d’origine filmé pour les encombrants — v3 — emballages | ☐ |
| CL-D17.A59 | 02 | Trancher LIV-SUPPL-M / L / XL — registre — n° 54 | ☑ |
| CL-D17.A60 | 02 | Trancher le bonus Premium relais + 25 F — registre / PR-09 PAL-05 — n° 55 | ☐ |
| CL-D17.A61 | 02 | Relais : retirer l’option WhatsApp de repli ; VD-12 : marquer CNO-02 remplacée — PR-02 NOT-04 ; PR-04 REC-08 ; PR-08 NTF-09 ; PR-11 EXT-04 — n° 59 | ☐ |
| CL-D17.A62 | 02 | Relais : reprendre la liste des six SMS (C12 est un SMS) — PR-02 NOT-04 ; PR-11 EXT-04 — n° 60 | ☐ |
| CL-D17.A63 | 02 | VD-12 : marquer CDE-21 remplacée — VD — n° 63 | ☐ |
| CL-D17.A64 | 02 | Relais et vendeur : masquer franchise d’abonné, groupage de liste, vente flash tant que FF-ABONNEMENT, FF-LISTE-ENVIES, FF-FLASH fermés — PR-02 CAL-06 ; PR-06 STK-08 ; PR-11 EXT-07, EXT-10 ; VD-10 ; VD-08 OFR-05 — n° 64-75 | ☐ |
| CL-D17.A65 | 02 | Relais : abonnement du destinataire pour un colis de liste — PR-02 CAL-06 ; PR-06 STK-10 ; PR-11 EXT-07, EXT-10 — n° 65 | ☐ |
| CL-D17.A66 | 02 | Fixer AVIS-FENETRE = 7 jours dans la v3 — registre — n° 69 | ☑ |
| CL-D17.A67 | 02 | Vendeur : retirer AVI-02 ; trancher la réponse privée du relais à un avis — VD-11 / PR-09 AVI-05 — n° 70 | ☑ |
| CL-D17.A68 | 02 | Vendeur : retirer le filtre « zone du vendeur » — VD-11, VD-12 — n° 71 | ☐ |
| CL-D17.A69 | 02 | Décider la bande « Sponsorisé » (ajouter à la v3 ou retirer la mise en avant payante VD-10 VIS-01 à VIS-06) — produit — n° | ☑ |
| CL-D17.A70 | 02 | VD-12 : marquer CDS-05 et DEC-07 remplacées — VD — n° 73 | ☐ |
| CL-D17.A71 | 02 | v3 : ajouter le pidgin — v3 — n° 77 | ☑ |
| CL-D17.A72 | 02 | Trancher les mots « escrow » / « acheteurs » (recommandation : « argent bloqué », « clients vérifiés ») — trois espaces — n° 78 | ☑ |
| CL-D17.A73 | 02 | Harmoniser les heures du support (7 h – 21 h contre 8 h – 20 h) ou les assumer par acteur — CL / PR — n° 79 | ☑ |
| CL-D17.A74 | 02 | Fixer 180 jours de conservation des preuves dans la v3 — v3 — n° 80 | ☐ |
| CL-D17.A75 | 02 | v3 : définir C10 ; préciser le code de l’échec de paiement ; donner un seuil et un écran pour le porteur nommé — v3 — I4, I5, n° 19 | ☐ |
| CL-D17.A76 | 03 | Créer les tables parameter (code, valeur typée, unité, statut, pays, version, date d’effet) et parameter_history ; params_version sur chaque commande — back — registre, CTV-19, CTV-20 | ☐ |
| CL-D17.A77 | 03 | Charger les 181 codes du registre, y compris codes après lancement inactifs et codes proposés — back / ADM — registre | ☐ |
| CL-D17.A78 | 03 | Faire confirmer par le porteur les codes proposés (TRANSP-PLAFOND, RET-TRAJET, LIT-DECISION-H, REMB-MOMO-H, IFA-FREQ-ELEVE, MSG-DISSOC, CODE-PORTEUR, STOCK-JAUGE, LISTE-SEUIL-ECRAN, ZONE-*, FRAUDE-SEUILS, ESCROW-VALIDEURS, CAT-INTERDITS, SMS-BUDGET-JOUR, CTRL-RAMASSAGE, CONSOLE-SIM-J, CONSOLE-MEDIANE-J) avec leur valeur — direction — note développeur p30 | ☐ |
| CL-D17.A79 | 03 | Aligner RET-SANS-RETOUR : corriger la feuille « version 2.0 » de CL-03 (cl03_acces.js, « moins de 3 000 F ») sur la valeur retenue — CL-03 / CL-11 — points vérifiés à la main | ☐ |
| CL-D17.A80 | 03 | Trancher les 37 valeurs « À trancher » du registre avant production — direction — CTV-21 | ☐ |
| CL-D17.A81 | 03 | Appliquer les décisions du porteur du 26 sept. (accueil d’origine, Plan indicatif sans position du livreur, puces de filtre sans appel serveur, menu réel, entrées repliées) — front CL — arbitrages | ☐ |
| CL-D17.A82 | 03 | Afficher partout un délai ferme calculé par le serveur ; remplacer la phrase sous « Passer commande » — CL-07 — CPN-30 | ☐ |
| CL-D17.A83 | 03 | Ne jamais demander un paiement de 0 F (commande « Validée », « livraison offerte ») — CL-07 / back — CPN-38 | ☐ |
| CL-D17.A84 | 03 | Compter le SMS d’échec de paiement comme variante de C4 dans le plafond — service d’envoi — CPY-43, CSM-02 | ☐ |
| CL-D17.A85 | 03 | Annulation possible tant que état < collectée — back — CAN-08, CCY-16 | ☐ |
| CL-D17.A86 | 03 | Frais carte gardés si annulation par le bénéficiaire, tout rendu si annulation par vendeur/BelivaY — back paiement — CET-24 | ☐ |
| CL-D17.A87 | 03 | Unifier les formes des liens profonds (legal-doc?d=…, fil?id=…, liste?cat=&sub=, liste-envies?id=) — front — CCG-01, CLS-01, CNT-02 | ☐ |
| CL-D17.A88 | 03 | Trancher le cas du défaut signalé entre 48 h et 7 jours — produit — CRO-28 | ☑ |
| CL-D17.A89 | 03 | Confirmer l’ajout du pidgin à la spec ; faire relire les textes par un traducteur camerounais — porteur — CRG-01 | ☑ |
| CL-D17.A90 | 04 | Implémenter les 392 décisions « Recommandé » telles qu’écrites dans leurs documents CL (liste de référence générée au rendu) — dev CL — p35 | ☐ |
| CL-D17.A91 | 04 | Remplacer « code de retrait haché » par « chiffré + empreinte HMAC » dans la spec et dans CL-16 (CLI-08 note développeur, interdits 18.5) — spec / CL-16 — CDA-27 | ☐ |
| CL-D17.A92 | 04 | Trancher le domaine des liens courts (belivay.com dans CAP-11, belivay.cm dans d’autres écrans) et l’unifier — CL-02 / CL-10 / CL-15 — CAP-11 | ☑ |
| CL-D17.A93 | 04 | Construire toutes les réponses d’API par un sérialiseur propre au rôle (client, vendeur, livreur, relais, console, payeur) — back — CVI-08 | ☐ |
| CL-D17.A94 | 04 | Publier les événements via une table d’envoi transactionnelle ; consommateurs idempotents (dédoublonnage par id) — back — CEV-02, CEV-03 | ☐ |
| CL-D17.A95 | 04 | Ajouter au catalogue les événements terms.accepted, message.thread_created, suborder.replaced, code.blocked, account.deleted, support.callback.requested, zone.alert, subscription.cancelled, referral.rewarded — back — CEV-07 | ☑ |
| CL-D17.A96 | 04 | Charger le jeu d’essai (data.js + DX_clNN) comme fixtures de recette — back / QA — CDA-01, CDA-03, CDA-18 | ☐ |
| CL-D17.A97 | 04 | Retirer du code de production les composants vendeur inutilisés (C.ring, C.keep, C.medal, .hero.violet) et les repères de revue (Plan, pastilles « Après le lancement ») — front — CDS-26, CCH-19, CNV-09 | ☐ |
| CL-D17.A98 | 05 | Obtenir, pour chaque ligne du tableau « Lancement », la décision du décideur nommé et l’écrire dans la table des paramètres (statut → Décidé) — porteur / direction — p50-51 | ☐ |
| CL-D17.A99 | 05 | Décider les frais de remise à domicile d’un panier de plusieurs boutiques (absent du prototype) — porteur + finance — CL-07 CFR-20 | ☑ |
| CL-D17.A100 | 05 | Décider si les frais de livraison entrent dans le montant d’un litige et la règle de calcul d’un remboursement partiel — porteur + finance — CL-11 CLT-60, CLT-61 | ☑ |
| CL-D17.A101 | 05 | Décider la retenue maximale d’une commande « Validée » non retirée (ne pas dépasser le payé ?) — porteur + finance — CL-10 CGA-23 | ☑ |
| CL-D17.A102 | 05 | Obtenir avant l’ouverture de chaque module les décisions LST-VALIDITE, FLASH-BUDGET, IA-COUT-MAX, COT-FRAIS, MDC-FORFAIT, TRC-IMEI-SOURCE, TRC-PARTENAIRE, WAP-COUT, WAP-VOCAL-CONSERV — direction — p51 | ☐ |
| CL-D17.A103 | 05 | Ajouter un test automatique refusant tout gabarit de push/SMS contenant un motif à 6 chiffres (hors C3) — back — CAP-19 | ☐ |
| CL-D17.A104 | 05 | Garder le contrôle automatique du registre (1669 identifiants, sans doublon ni trou) dans la génération des documents — outillage doc — p52 | ☑ |
| CL-D17.A105 | 06 | Aucune action nouvelle : le registre reproduit les règles des documents CL-02 à CL-08 ; appliquer les actions consignées dans leurs fiches — dev CL — registre généré | ☑ |
| CL-D17.A106 | 06 | Trancher les quatre valeurs bloquantes rappelées ici (CIN-33 OTP ; ACC-RANGEE-MIN ; LIV-SUPPL-M/L/XL ; frais de remise domicile multi-boutiques CFR-20) — porteur — CL-16 « Valeurs à trancher » | ☑ |
| CL-D17.A107 | 07 | Aucune action nouvelle : appliquer les actions des fiches CL-08 à CL-12 ; le registre en est la copie générée — dev CL — registre | ☑ |
| CL-D17.A108 | 07 | Trancher les valeurs bloquantes rappelées ici (CGA-23, CLT-28, CLT-39, CLT-51, CLT-60, CLT-61, CRO-22, CRO-24, CRO-25, CRP-02, CAN-18, SMS-ECO, SMS-SECOURS, MSG-DISSOC) — porteur — CL-16 « Valeurs à trancher » | ☐ |
| CL-D17.A109 | 08 | Aucune action nouvelle : appliquer les actions des fiches CL-12 à CL-15 ; le registre en est la copie générée — dev CL — registre | ☑ |
| CL-D17.A110 | 08 | Trancher LST-VALIDITE, SUP-HORAIRES (confirmer 7 h – 21 h), RNT-OUVERTURE, COT-FRAIS, MDC-FORFAIT avant ouverture des modules concernés — porteur — CL-16 « Valeurs à trancher » | ☐ |
| CL-D17.A111 | 09 | Dérouler la recette des 220 critères sur l’application branchée sur le jeu d’essai, en FR/EN et clair/sombre, et cocher la dernière colonne — QA — p109 | ☐ |
| CL-D17.A112 | 09 | Rejouer inbound.js, sweep.js et linkcheck.js avant chaque recette ; faire échouer la recette si un écran n’a pas de lien entrant ou si un retour mène au Menu — QA / outillage — p109 | ☐ |
| CL-D17.A113 | 09 | Vérifier les critères serveur par l’API (réponses sans nom de boutique, masquage, service de tarification unique, table des paramètres) — QA back — critères 19.1-19.5, 20.1-20.3 | ☐ |
| CL-D17.A114 | 09 | Vérifier les critères du chapitre 17 dans l’espace vendeur (VD-03, VD-04, VD-05, VD-08, VD-09, VD-11) et du chapitre 18 dans la console — QA VD / ADM — ch. 17, 18 | ☐ |
| CL-D17.A115 | 09 | Mettre à jour la spec (critères 4.5 et ch. 9) pour refléter les écarts assumés du 26 sept. — spec — écarts assumés | ☐ |
| CL-D17.A116 | 09 | Définir des critères de recette pour les chapitres 23 (ventes flash) et 24 (assistant IA), absents de l’annexe — spec / QA — couverture recette | ☐ |
| CL-D17.A117 | 10 | Dans PR-01 à PR-11 et VD-01 à VD-12, remplacer chaque ancienne règle client citée par la nouvelle selon la table de correspondance (notamment CCA-04, CNO-02, CDE-21, DEC-03, DEC-07, CDS-05, DEC-15, CDE-13) — PR / VD — correspondance | ☐ |
| CL-D17.A118 | 10 | Attention aux homonymes : ne pas confondre les anciennes CNV-01 à 06 / CDS-01 à 06 avec celles de CL-01 dans les renvois — PR / VD — correspondance | ☐ |
| CL-D17.A119 | 10 | Automatiser les 15 scénarios en tests de bout en bout (application + API + messages), acteurs relais/vendeur/livreur simulés par l’API — QA — scénarios | ☐ |
| CL-D17.A120 | 10 | Charger le lexique (proto/src/en_add) comme source unique des traductions ; une seule traduction par texte français — front — lexique | ☐ |
| CL-D17.A121 | 10 | Unifier le domaine du lien court (belivay.com dans S14) avec les autres écrans — CL-10 / CL-02 — S14 | ☑ |

**Questions ouvertes**

| Question | Partie | Sujet | Décision |
|---|---|---|---|
| CL-D17.Q01 | 01 | CLI-08 : trois codes faux = blocage 24 h puis nouveau code dans l’application, alors que relais CAL-31 dit « seul le support débloque » (incohérence déjà ouverte). | DP-26 : décidée (decisions-porteur.md) |
| CL-D17.Q02 | 01 | CLI-01 « un seul relais par zone » alors que les écrans proposent plusieurs relais (Mvog-Ada, Essos, Mvan) : présentés comme relais d’autres zones — à vérifier dans le jeu d’essai. | répondu par les données (revue/CL-16.md) |
| CL-D17.Q03 | 01 | « 12 zones à Yaoundé, 4 exploitées » (CCN-09) : la console n’expose que 4 zones — confirmer (question déjà ouverte). | DP-09 : décidée (decisions-porteur.md) |
| CL-D17.Q04 | 01 | Retrait relais 900 F = 500 (ramassage) + 400 (remise) : confirme la formule « 500 + 400 » de CL-15 Fig. 49. | répondu par les données (revue/CL-16.md) |
| CL-D17.Q05 | 01 | TRANSP-PLAFOND n’est qu’un « code proposé ». | répondu par les données (revue/CL-16.md) |
| CL-D17.Q06 | 01 | CCN-11 et CCN-19 (rôles des validateurs) à trancher. | DP-42 : décidée (decisions-porteur.md) |
| CL-D17.Q07 | 02 | I1 : 21.5 « 3 + bonus » contre 10.6 « 1 + bonus » (déjà ouvert). | répondu par les données (revue/CL-16.md) |
| CL-D17.Q08 | 02 | I2 : « Reste à payer » dans 28.4 (déjà ouvert). | répondu par les données (revue/CL-16.md) |
| CL-D17.Q09 | 02 | I3, I9 : « 24-72 h », « retrait dès demain » contre délai < 5 h. | répondu par les données (revue/CL-16.md) |
| CL-D17.Q10 | 02 | I4 : échec de paiement hors liste des six SMS. | répondu par les données (revue/CL-16.md) |
| CL-D17.Q11 | 02 | I5 : C10 non défini. | répondu par les données (revue/CL-16.md) |
| CL-D17.Q12 | 02 | I7 : S4 un jour fermé. | répondu par les données (revue/CL-16.md) |
| CL-D17.Q13 | 02 | I8 : retour sans motif « au lancement » ou « définitif ». | DP-35 : décidée (decisions-porteur.md) |
| CL-D17.Q14 | 02 | I11 : livreur « prénom et quartier » contre adresse. | répondu par les données (revue/CL-16.md) |
| CL-D17.Q15 | 02 | I12 : CODE-BIO, GARDE-PRORATA, AVIS-BAS Proposé mais listés à trancher. | DP-29 : décidée (decisions-porteur.md) |
| CL-D17.Q16 | 02 | Les sujets inter-espaces « À trancher » : n° 10 (deux non-retraits), 12, 17, 23, 24, 26, 28, 33, 36, 41, 46, 54, 55, 70, 72, 78, 79. | DP-42 : décidée (decisions-porteur.md) |
| CL-D17.Q17 | 03 | RET-SANS-RETOUR : 3 000 F (CL-03) contre 5 000 F (CL-11). | DP-10 : décidée (decisions-porteur.md) |
| CL-D17.Q18 | 03 | Défaut caché entre 48 h et 7 jours non tranché (déjà ouvert). | DP-35 : décidée (decisions-porteur.md) |
| CL-D17.Q19 | 03 | Pidgin : ajout à la spec à confirmer par le porteur. | DP-13 : décidée (decisions-porteur.md) |
| CL-D17.Q20 | 03 | Décisions du porteur du 26 sept. en écart assumé avec 4.1 et 9.1 (accueil, puces de filtre) : spec à mettre à jour. | répondu par les données (revue/CL-16.md) |
| CL-D17.Q21 | 03 | 37 valeurs à trancher et codes proposés à confirmer. | à décider (revue/decisions.md) |
| CL-D17.Q22 | 04 | Code de retrait « haché » (spec 2.6, CL-16 CLI-08) contre « chiffré + HMAC » (CDA-27). | DP-02 : décidée (decisions-porteur.md) |
| CL-D17.Q23 | 04 | Domaine belivay.com (CAP-11) contre belivay.cm (déjà ouvert). | DP-38 : décidée (decisions-porteur.md) |
| CL-D17.Q24 | 04 | Pidgin (CRD-03, CIN-09) : ajout à la spec à confirmer par le porteur. | DP-13 : décidée (decisions-porteur.md) |
| CL-D17.Q25 | 04 | Décompte : les sous-totaux affichés jusqu’ici font 384 ; les 8 restantes (CL-16 première partie) et la fin de CL-15 sont au morceau suivant — vérifier le total de 392. | répondu par les données (revue/CL-16.md) |
| CL-D17.Q26 | 05 | Toutes les questions du tableau p50-51 (cf. valeurs ci-dessus) : 29 au lancement, 9 après le lancement. | répondu par les données (revue/CL-16.md) |
| CL-D17.Q27 | 05 | Total « Recommandé » : 384 (CL-01 à CL-15) + 8 (CL-16) = 392 : cohérent avec l’introduction. | répondu par les données (revue/CL-16.md) |
| CL-D17.Q28 | 05 | Délai de décision du litige : 24 h (client) contre 48 h (relais et vendeur) (déjà ouvert). | DP-35 : décidée (decisions-porteur.md) |
| CL-D17.Q29 | 06 | CIN-33, ACC-RANGEE-MIN, LIV-SUPPL-M/L/XL, CFR-20 (déjà ouverts). | répondu par les données (revue/CL-16.md) |
| CL-D17.Q30 | 06 | Aucune divergence relevée entre ce registre et les fiches des documents CL-03 à CL-08. | répondu par les données (revue/CL-16.md) |
| CL-D17.Q31 | 07 | Les À trancher de CL-09 à CL-12 listés ci-dessus (déjà ouverts dans leurs fiches et dans partie 05). | répondu par les données (revue/CL-16.md) |
| CL-D17.Q32 | 07 | Aucune divergence relevée entre ce registre et les fiches d’origine. | répondu par les données (revue/CL-16.md) |
| CL-D17.Q33 | 08 | Heures du support client 7 h – 21 h contre relais 8 h – 20 h (déjà ouvert). | DP-12 : décidée (decisions-porteur.md) |
| CL-D17.Q34 | 08 | Aucune divergence relevée entre ce registre et les fiches d’origine. | répondu par les données (revue/CL-16.md) |
| CL-D17.Q35 | 09 | Chapitres 23 et 24 sans critère de recette dans l’annexe : à compléter ? | répondu par les données (revue/CL-16.md) |
| CL-D17.Q36 | 09 | Écarts assumés du 26 sept. contre critères 4.5 et 9.x : la spec doit être mise à jour. | répondu par les données (revue/CL-16.md) |
| CL-D17.Q37 | 09 | CCN-11 et CTV-31 restent À trancher dans le registre CL-16. | DP-42 : décidée (decisions-porteur.md) |
| CL-D17.Q38 | 10 | S7 : « 100 F par jour dès demain » alors que la grille monte à 200 F puis 400 F (déjà ouvert). | DP-08 : décidée (decisions-porteur.md) |
| CL-D17.Q39 | 10 | S11 : BLV-51533 « annulée par le vendeur » (question BelivaY / vendeur déjà ouverte). | répondu par les données (revue/CL-16.md) |
| CL-D17.Q40 | 10 | Domaine des liens courts belivay.com (déjà ouvert). | DP-38 : décidée (decisions-porteur.md) |
| CL-D17.Q41 | 10 | PBL-14 : prix du trajet retour 500 F absent de la v3, à trancher (déjà ouvert). | DP-35 : décidée (decisions-porteur.md) |
| CL-D17.Q42 | 10 | Preuve au payeur (CDE-21 remplacée) : « rien entre 22 h et 7 h heure du payeur » contre PUSH-NUIT client 21 h – 7 h — préciser la plage applicable au payeur à l’étranger. 22.5 | répondu par les données (revue/CL-16.md) |
