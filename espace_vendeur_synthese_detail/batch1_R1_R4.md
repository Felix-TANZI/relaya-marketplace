# Synthèse batch 1 — R1 (REF-CL) & R4 (REF-COMMISSION)

Documents source : guides développeur BelivaY, extraits pdftotext -layout, package « Références communes », BelivaY · 27 septembre 2026.

---

## 1. R1 — REF-CL — Spécification complète de l'espace client (source)

**Code de suivi des actions :** REF-D01 (actions REF-D01.A01…, questions REF-D01.Q01…)
**Document d'origine :** `BelivaY_Client_Specification_Complete.pdf`, 158 pages
**Découpage :** 12 parties (≤14 pages chacune)
**Actions :** 81 (REF-D01.A01 à REF-D01.A81)
**Questions ouvertes :** 20 (REF-D01.Q01 à REF-D01.Q20)

### 1.1 Résumé

REF-CL est la spécification complète de l'espace client BelivaY (v3, 25 sept. 2026 — 32 chapitres, 169 sections, 211 tableaux), présentée comme remplaçant 17 anciens documents client et le dossier EX-00 à EX-07. Elle couvre tout le parcours client : inscription, accueil/recherche/fiche produit, panier, paiement (MoMo, carte diaspora, comptoir), suivi de commande, code de retrait, garde en relais, notifications, litige (IFA), retour/remplacement, annulation, changement de relais, paiement depuis l'étranger, avis/notation, pages de service, puis les règles transverses (anonymat, registre de paramètres) et les nouveautés post-lancement (abonnement, liste d'envies, ventes flash, assistant IA, et 7 modules EX-01 à EX-07 : rentrée scolaire, cotisation cadeau, mise de côté avec acompte, troc de téléphone, panier famille diaspora, commande WhatsApp IA, réserve). Le document définit aussi les liaisons du client avec point relais / vendeur / entreprise de livraison / livreur, l'onboarding vendeur (aperçu), et la console d'administration. Il sert de référence transverse : pas de prototype ni de captures propres, les écrans réels vivent dans les paquets des interfaces concernées (CL-xx, VD-xx, PR-xx, ADM-xx, ENT/LIV).

### 1.2 Tableau des actions (REF-D01.A01 – A81)

| ID | Description courte | Partie | Statut / réf. |
|---|---|---|---|
| REF-D01.A01 | Supprimer « 3 jours gratuits » de garde ; appliquer grille 0/100/100/200/200/400/400 F + 500 F de renvoi (max 1 400/1 900 F) | 01 | décision 24 sept. (qui prime) |
| REF-D01.A02 | Vérifier que le choix du relais ne propose que le relais de la zone, délais visés < 5 h | 01 | décision 25 sept. |
| REF-D01.A03 | Vérifier que le regroupement ne s'applique qu'aux colis relais ; domicile part seul | 01 | décision 25 sept. |
| REF-D01.A04 | Vérifier la mention des emballages S, M, L, C1, C2 et du scellé par le livreur dès J1 | 01 | décision 25 sept. |
| REF-D01.A05 | Vérifier que les nouveautés (rentrée, cotisation, mise de côté, troc, panier famille, WhatsApp IA) sont derrière interrupteur « après lancement » | 01 | décision 24 sept. |
| REF-D01.A06 | Vérifier livraison relais 900 F (500+400), gratuité dès 30 000 F relais / 50 000 F domicile, 2 % carte | 01 | décision 22 sept. |
| REF-D01.A07 | Vérifier « Autres vendeurs » supprimé et plafond 5-6 SMS/commande | 01 | décision 17 sept. |
| REF-D01.A08 | Vérifier la conformité des machines à états (commande, colis, escrow) avec CL-02 et ADM-02 | 01 | cohérence inter-interfaces |
| REF-D01.A09 | Remplacer « Retour 7 j · Sans discuter » par « Retour gratuit · si problème validé » | 02 | décision 21 sept. |
| REF-D01.A10 | Vérifier que le 1er lancement tient en ≤ 3 écrans, FR/EN, « centres d'intérêt » passable | 02 | décision 20 sept. |
| REF-D01.A11 | Mot de passe oublié par e-mail (jamais SMS) ; changement de numéro exige 2 OTP + régénère les codes de retrait | 02 | — |
| REF-D01.A12 | Masquer l'encart « Retrait offert dès 10 000 F · Prime » sur l'accueil au lancement | 02 | ch. 21 |
| REF-D01.A13 | Supprimer tout compteur écrit en dur (ex. « 3 400 produits »), brancher sur la base | 02 | défaut connu |
| REF-D01.A14 | Vérifier grille régulière unique (plus de quinconce), tri par défaut « Pertinence » | 02 | arbitrage 17 sept. |
| REF-D01.A15 | Vérifier qu'aucune carte ne montre nom ou choix de vendeur | 02 | anonymat/attribution |
| REF-D01.A16 | Vérifier la matrice de visibilité face aux docs VD, LIV, PR, ADM | 02 | cohérence inter-interfaces |
| REF-D01.A17 | Supprimer la section « Autres vendeurs » et les boutons « Choisir » | 03 | décision 17 sept. |
| REF-D01.A18 | Retirer l'encart « Avec Prime… » et le badge « Retour 7 jours · remboursé sous 72 h » de la fiche | 03 | ch. 21 + décision 21 sept. |
| REF-D01.A19 | Ajouter/vérifier le sélecteur de variantes (rupture grisée, barrée, alerte) | 03 | — |
| REF-D01.A20 | Afficher sur la fiche les 2 modes avec délai/tarif/seuil/supplément classe (900 F/30 000 F ; 1 500 F/50 000 F) | 03 | décision 22 sept. |
| REF-D01.A21 | Remplacer le filtre « Zone du vendeur » par « Livrabilité » | 03 | — |
| REF-D01.A22 | Vérifier que les filtres vides sont grisés et n'apparaissent qu'après recherche | 03 | — |
| REF-D01.A23 | Vérifier que « Poser une question au vendeur » ouvre la messagerie interne, jamais WhatsApp | 03 | — |
| REF-D01.A24 | Vérifier le bloc « Tu cherchais autre chose ? » et la journalisation search.no_result | 03 | — |
| REF-D01.A25 | Vérifier l'écran de publication vendeur : contrôle langue FR, message « Décris le produit avec tes mots… » | 03 | — |
| REF-D01.A26 | Remplacer partout remise relais 900 F/base 1 400 F par Rem_relais 400 F/base 900 F | 04 | décision 22 sept. |
| REF-D01.A27 | Supprimer toute mention du seuil unique 45 000 F | 04 | décision 22 sept. |
| REF-D01.A28 | Libeller les boutiques « Boutique A, B, C » sans nom | 04 | anonymat |
| REF-D01.A29 | Vérifier bouton « Payer au comptoir » absent si non éligible, avec ligne explicative | 04 | — |
| REF-D01.A30 | Vérifier que le reçu ne contient ni code, ni nom de boutique, ni détail des frais, ni suggestion, ni demande de note | 04 | — |
| REF-D01.A31 | Vérifier le mot « Validée » (jamais « payé ») pour le reste dû au comptoir | 04 | — |
| REF-D01.A32 | Masquer tout encart « Avec Prime… » dans le panier | 04 | ch. 21 |
| REF-D01.A33 | Supprimer notion de caisse/plafond de caisse/espèces côté relais ; afficher « Montant dû (MoMo sur place) » | 05 | v2.0 |
| REF-D01.A34 | Supprimer « Reste à payer », les 6 filtres et la carte du livreur en temps réel dans Mes commandes | 05 | défauts relevés |
| REF-D01.A35 | Vérifier texte garde « Gratuit aujourd'hui, 100 F/j dès demain » et série S0-S5 avec montants exacts | 05 | décision 24 sept. |
| REF-D01.A36 | MAJ photo « SMS de repli » : « 400 F dès le 6e jour, retrait avant le 26 sept. » | 05 | — |
| REF-D01.A37 | Remplacer « WhatsApp forcé » par SMS + lien court ; WhatsApp affiché « bientôt » | 05 | — |
| REF-D01.A38 | Masquer l'encart « Prime · actif » du compte au lancement | 05 | — |
| REF-D01.A39 | Vérifier que l'écran gérant bloque la validation sans photo de remise ni sortie de tous les colis | 05 | — |
| REF-D01.A40 | Retirer tout remboursement auto à l'échéance des 48 h ; silence vendeur ⇒ file d'arbitrage prioritaire | 06 | v2.0 |
| REF-D01.A41 | Supprimer toute promesse de retour sans motif, compteur « retours sans motif » et liste d'exclusions | 06 | décision 21 sept. |
| REF-D01.A42 | Afficher « Retour gratuit si le problème est validé » tant que l'arbitrage n'est pas rendu | 06 | — |
| REF-D01.A43 | Vérifier étape 3 (photo obligatoire sauf « Jamais reçu ») et l'absence de demande de preuve d'achat/valeur | 06 | — |
| REF-D01.A44 | Vérifier que la console impose un motif écrit et affiche la chaîne de preuves côte à côte | 06 | — |
| REF-D01.A45 | Vérifier le libellé « Annulation impossible » dès la collecte et le recalcul du remboursement (ex. 84 380 F) | 06 | — |
| REF-D01.A46 | Vérifier le transfert de relais à 400 F et les règles carte (2 %, 150 000 F, J+14) | 06 | — |
| REF-D01.A47 | Vérifier l'écran « Changer de relais » (gratuit avant collecte, impossible en tournée, 400 F après arrivée, nouveau code, garde au jour 1) | 07 | — |
| REF-D01.A48 | Vérifier l'écran « Payer de l'étranger » (2 % affiché avant débit, ≈ € au centime, « Tu seras remboursé, pas elle ») | 07 | — |
| REF-D01.A49 | Vérifier 2 notes séparées et l'absence du nom de boutique dans les avis | 07 | — |
| REF-D01.A50 | Vérifier que la note gérant apparaît côté relais sans identité client | 07 | — |
| REF-D01.A51 | Vérifier qu'aucune case de conditions n'est à cocher au paiement, pages légales versionnées FR/EN | 07 | — |
| REF-D01.A52 | Vérifier le mode dégradé (bannière, code hors ligne après 1er affichage, actions d'argent grisées) | 07 | — |
| REF-D01.A53 | Supprimer page boutique publique et QR de boutique | 08 | anonymat |
| REF-D01.A54 | Vérifier « Vous gardez X F » sans aucune ligne de commission | 08 | décision 22 sept. |
| REF-D01.A55 | Vérifier l'inscription vendeur en 3 temps (fiches avant pièce d'identité) | 08 | — |
| REF-D01.A56 | Vérifier « Demander une nouvelle fiche » accessible seulement après recherche sans résultat + prix conseillé | 08 | décision 23 sept. |
| REF-D01.A57 | Supprimer le type/carte « Caisse » de la console, ajouter « Relais » et « Livraison » | 08 | — |
| REF-D01.A58 | Vérifier la gestion des partenaires (relais « En configuration », 2 transporteurs/zone, réattribution de paquet, jamais d'affectation directe de livreur) | 08 | — |
| REF-D01.A59 | Vérifier la simulation bloquante (contribution ≥ plancher) et le versionnement des paramètres | 08 | — |
| REF-D01.A60 | Vérifier les pondérations des Trust Scores relais et entreprise | 08 | — |
| REF-D01.A61 | Vérifier que tous les codes du registre ch. 20 figurent dans le registre du paquet client actuel avec le même statut | 09 | cohérence registre |
| REF-D01.A62 | Faire trancher toutes les valeurs « à trancher » de 19.4 avant production et les inscrire au registre | 09 | — |
| REF-D01.A63 | Remplacer les images de maquette par les photos réelles (P1-P4, H1-H9, B1-B2, S1-S3, C1-C3, M1-M5, V1-V2, G1, L1) | 09 | 19.5 |
| REF-D01.A64 | Vérifier que le masquage auto des numéros/e-mails s'applique dans toutes les messageries entre acteurs externes | 09 | — |
| REF-D01.A65 | Vérifier que les encarts « Avec Prime… » (docs 03-06) dépendent de l'interrupteur abonnement et sont masqués | 09 | ch. 21 |
| REF-D01.A66 | Vérifier la grille de garde abonnés (+2/+4 j avant le jour 2), relais payé seulement sur jours facturés | 09 | — |
| REF-D01.A67 | Corriger la formule F_client : incohérence « 3 + bonus » (ch. 21) vs « 1 + bonus » (ch. 10) | 10 | incohérence interne REF-CL |
| REF-D01.A68 | Vérifier que les favoris sont une seule liste partout, pas de « boutiques suivies » | 10 | — |
| REF-D01.A69 | Vérifier le remboursement au payeur (jamais au bénéficiaire) et le plafond de groupage 21 j sans garde | 10 | — |
| REF-D01.A70 | Vérifier que les ventes flash n'utilisent ni SMS ni faux compte à rebours, vendeur accepte la remise en voyant ce qu'il garde | 10 | — |
| REF-D01.A71 | Vérifier que les nouveautés EX-01/EX-02 sont derrière interrupteur « après lancement » | 10 | — |
| REF-D01.A72 | Vérifier que CL-15 reprend les règles COT/MDC/TRC/FAM/WAP avec les mêmes statuts et paramètres | 11 | cohérence source/paquet |
| REF-D01.A73 | Faire valider par un juriste le forfait d'annulation MDC (5 %, 5 000 F max) avant lancement | 11 | EX-07 |
| REF-D01.A74 | Confirmer les 2 % de frais de cotisation avec les vrais frais de paiement | 11 | EX-07 |
| REF-D01.A75 | Identifier la source de la liste des téléphones volés et contractualiser un reconditionneur | 11 | EX-07 |
| REF-D01.A76 | Vérifier côté relais le dépôt de téléphone (lecture IMEI, pièce d'identité, rémunération comme un colis) | 11 | — |
| REF-D01.A77 | Vérifier qu'aucune nouveauté n'envoie de code par WhatsApp ou au payeur | 11 | — |
| REF-D01.A78 | Ajouter au registre après lancement TRC-IMEI-SOURCE, FAM-MAX-TX et RNT-GROUPAGE-J (absents du ch. 32) | 12 | cohérence registre |
| REF-D01.A79 | Ajouter des critères de recette pour ch. 23 (ventes flash) et ch. 24 (assistant IA) | 12 | liste incomplète |
| REF-D01.A80 | Vérifier que les interrupteurs FF-* existent et sont fermés au lancement ; FF-ABONNEMENT masque tous les encarts « Prime » | 12 | — |
| REF-D01.A81 | Reporter la liste de contrôle de recette dans le paquet client actuel si elle n'y est pas intégralement | 12 | — |

*Note : le document R1 n'assigne pas de lettre de statut V/D/Δ/P directement à chaque action (ces lettres sont utilisées pour les règles citées, ex. « V1 », « D5 », « COT-01 (P) » — voir §1.3). La colonne « Statut / réf. » ci-dessus reprend la date de décision ou le motif donné en synthèse par le document.*

### 1.3 Règles métier et calculs clés (chiffres exacts)

**Garde en relais (grille officielle, décision 24 sept., Fixé) :**
GARDE-J1 gratuit ; GARDE-J2-3 = **100 F/j** ; GARDE-J4-5 = **200 F/j** ; GARDE-J6-7 = **400 F/j** ; GARDE-RENVOI = **500 F** ; plafond garde seule **1 400 F**, avec renvoi **1 900 F** ; GARDE-FERME (jour de fermeture) jamais facturé ; GARDE-PRORATA = jour entier (Proposé, non tranché). Série de rappels : S0 J+1 push 100 F ; S1 J+2 SMS 200 F ; S2 J+4 SMS 600 F ; S3 J+5 push 1 000 F ; S4 J+6 push 1 400 F ; S5 J+7 renvoi = retenue garde + 500 F (≤ 1 900 F). Exemple : arrivée lundi 21 sept. → 1 500 F retenus le lundi 28 (dimanche 27 fermé, non facturé). Relais touche 100 F par jour de garde facturé.

**Livraison / panier :**
LIV-R = **500 F** ; LIV-DELTA = **24 %** (R′ = **380 F**) ; LIV-REM-RELAIS = **400 F** ; LIV-REM-DOM = **1 000 F** ; base relais LIV-RELAIS-BASE = **900 F** (= 500+400) ; base domicile LIV-DOM-BASE = **1 500 F** (= 500+1 000) ; seuil offert relais LIV-SEUIL-RELAIS = **30 000 F** ; seuil offert domicile LIV-SEUIL-DOM = **50 000 F** ; offert = tarif d'un colis S ; XL/hors gabarit jamais en relais ; LIV-POIDS-VOL = volume ÷ 5 000 ; pas de livraison groupée à domicile. Ancien seuil unique 45 000 F (17 sept.) abandonné ; ancienne remise relais 900 F/base 1 400 F corrigée en 400 F/900 F (22 sept.).
Formules : S = Σ P×q ; Ram = Σ_zones [R + (n_z−1)×R′] ; Off = R + Rem si S ≥ Seuil ; Total = S + Ram + Rem + Σ suppl − Off. Exemple chiffré : 150 699 + 84 000 + 37 000 = **271 699 F** ; Ram **1 380 F** ; Rem **400 F** ; Off **900 F** ; Total **272 579 F** ; économie **900 F** ; reste **880 F**.
Relais touche **200 F** (petit colis) / **250 F** (moyen) / **400 F** (encombrant) par colis remis, versés le vendredi, plus 100 F/j de garde facturé.

**Paiement / comptoir (v2.0, zéro espèce) :**
PAY-CPT-NOUV (avance/plafond nouveau compte) = **15 000 F** ; PAY-CPT-STD = **50 000 F** ; PAY-CPT-FID (après 5 commandes sans incident) = **100 000 F** ; PAY-CPT-REFUS = **2** (⇒ avance obligatoire définitive) ; jamais depuis l'étranger, gros colis ou express. Carte diaspora : 3-D Secure, PAY-CARTE-MAX **150 000 F**, PAY-CARTE-FRAIS **2 %**, arrondi au centime, libération **J+14** (fenêtre rétrofacturation 120-180 j). Exemple étranger : 11 000 + 900 + 238 (2 %) = **12 138 F ≈ 18,50 €** (÷655,957).

**Code / retrait :** CODE-LONG = **6 chiffres + QR** ; CODE-BIO seuil biométrie **50 000 F** (Proposé) ; CODE-RENVOI **3** par commande/24 h ; CODE-ESSAIS **3** ⇒ blocage 24 h. Libération escrow : LIB-STD **3 j** (Bronze/Argent), LIB-OR **1 j** (Or/Platine), LIB-CARTE **14 j** ; VERSEMENT-JOUR = vendredi. SLA-ZONE-H **< 5 h**.

**Litige / IFA :** LIT-VENDEUR-H = **48 h** (accepter/contester/arrangement ≥ **40 caractères**) ; LIT-AUTO-STD = **3 000 F**, LIT-AUTO-ELEVE = **10 000 F** (remboursement auto payé par BelivaY, Trust Score vendeur intact, aucun automatisme aux paliers « À instruire »/« Plafonné ») ; LIT-CONSTAT-H = **48 h ouvrées** ; IFA-MIN-CMD = **5**. Couche 3 exemple : taux_échec = 50 commandes / 5 perdus = **10 %**. v2.0 : suppression du remboursement automatique à l'échéance des 48 h — silence vendeur passe désormais en file d'arbitrage.

**Retour :** RET-FENETRE **7 j**, RET-DEFAUT-H **48 h**, RET-VICE **100 j**, RET-INSPECT-H **48 h** ; RET-SANS-RETOUR **3 000-5 000 F** (à trancher). Retour sans motif supprimé (décision 21 sept.). Relais payé **200/250/400 F** par retour déposé.

**Annulation :** libre si payée/confirmée ; impossible dès collecte. Rupture ⇒ vendeur suivant (Trust Score ≥ **75**, prix livré ≤ **+5 %**, écart payé par BelivaY) sinon remboursement intégral le jour même. Transfert entre relais = **400 F**. Exemple : F_avant **880 F** ; annulation d'une sous-commande de 84 000 F ⇒ F_après **500 F** ; remboursement **84 380 F**.

**Avis / Trust Score :** 2 notes séparées (vendeur, gérant) sur 5 étoiles ; score public = borne basse de Wilson (**z = 1,96**) ; note vendeur/gérant alimente le critère Satisfaction (**20 pts**) du Trust Score. Trust Score relais : ponctualité **25**, sécurité **25**, satisfaction **20**, litiges **15**, ancienneté **15**. Trust Score entreprise : ponctualité **30**, qualité **25**, litiges **20**, ancienneté **15**, formation **10**. Contrôle qualité ramassage : 100 % des 5 premières commandes d'un nouveau vendeur, puis **1/20** tant que Trust Score < **70**, puis **1/100**.

**Abonnement client (post-lancement) :** Gratuit / Plus **2 500 F/mois** (25 000 F/an) / Prime **4 000 F** (40 000 F/an) / Prime Duo **7 000 F** (70 000 F/an) / Business **15 000 F** (150 000 F/an, 10 mois facturés/an). Pass 7 jours = **1 500 F** (relais dès 10 000 F, 4 commandes max) ; 1er mois Prime = **1 500 F** (1×/compte/MoMo). Cagnotte **2 %** × S, expire à **90 j**. Garde +**2 j** (Plus) / +**4 j** (Prime, Duo, Business). Grâce d'échec de prélèvement **7 j** puis retour gratuit. Illimité* = **30 commandes/mois** (Business **70**). Hypothèse : commission moyenne **15 %** (12 % défavorable) ; exemple client Prime : 4×15 000 F → **6 300 F** d'économies pour **4 000 F** payés ; BelivaY net **+5 500 F** (pire cas +26 900 F, défavorable +1 700 F) ; seuil de rentabilité client ≥ **3 commandes/mois**.

**Nouveautés (EX-01 à EX-07), chiffres retenus :** RNT-GROUPAGE-J **21 j** (Fixé) ; RNT-OUVERTURE **1er juillet** (Proposé) ; rentrée offerte dès **30 000 F**, 380 F même zone. Cotisation : COT-FRAIS **2 %** (à confirmer), COT-DUREE-MAX **30 j**, COT-PART-MIN **1 000 F**. Mise de côté MDC : MDC-ACOMPTE **20 %**, MDC-DUREE **60 j**, MDC-GRACE **7 j**, MDC-PRIX-MIN **20 000 F**, MDC-FORFAIT annulation = **5 %** (**≤ 5 000 F**) reversé au vendeur (à valider juriste). Troc : TRC-INSPECT-H **48 h**. Panier famille diaspora : FAM-POIDS-MAX **5 kg**, FAM-MAX-TX **150 000 F** (Fixé), provision rétrofacturation **1,5 %**, carte 2 %. WhatsApp IA : WAP-API non disponible au lancement (Fixé).

**Anonymat (Fixé) :** identité client jamais montrée au vendeur (nom de boutique jamais montré non plus, « Boutique A, B, C ») ; livreur = prénom seul à domicile, rien en relais ; total payé jamais visible au vendeur ; code de retrait jamais en clair côté relais/console ; téléphone masqué livreur/relais ; IFA jamais visible pour aucun acteur externe, console seulement.

### 1.4 Endpoints indicatifs et événements émis (extraits, par domaine)

- **Auth/compte** : `/auth/google`, `/auth/email`, `/auth/otp/send`, `/auth/otp/verify`, `/relais?near=`, `/me/relais-habituel`, `/me/adresses` — événements `account.created`, `phone.verified`, `relay.chosen`.
- **Accueil/recherche** : `/home?profil=auto`, `/categories`, `/listing/{cat}?cursor=`, `/search/suggest`, `/search`, `/search/trending`, `DELETE /me/search-history/{id}`, `POST /search/alerts` — événements `home.viewed`, `product.published`, `shop.closed_today`, `search.no_result`.
- **Fiche/panier** : `GET /products/{maitre}?relais=`, `/reviews`, `POST /me/favorites`, `/cart/lines`, `/messages/threads`, `/cart?mode=&relais=`, `PATCH /cart/lines/{id}`, `/save`, `/swap-offer`, `/cart/eligibility/counter` — événements `product.viewed`, `favorite.added`, `cart.updated`, `cart.shared`.
- **Paiement** : `/checkout`, `/payments/{id}`, `/resend`, `/webhooks/campay`, `/checkout/counter`, `/orders/{id}/counter-payment` — événements `order.paid`, `payment.failed`, `order.validated`.
- **Commandes/suivi/notifications** : `/me/orders?tab=`, `/orders/{id}/tracking`, `/code/reveal`, `/code/resend`, `/all-good`, `/invoice.pdf`, `/rebuy`, `/me/notifications`, `/me/notification-settings`, `/devices`, `/orders/{id}/storage` — événements `parcel.received`, `parcel.handed`, `return.closed`, `code.blocked`, `storage.day`, `message.sent/delivered/opened`.
- **Litige/retour/annulation** : `/disputes`, `/photos`, `/messages`, `/relay/disputes`, `/returns`, `/relay/returns/{id}/deposit`, `/returns/{id}/inspection`, `/suborders/{id}/cancel`, `PUT /orders/{id}/relais`, `/parcels/{id}/transfer`, `/gift-payments` — événements `order.paid`, `suborder.ready`, `parcel.collected`, `parcel.received`, `parcel.handed`, `return.closed`, `dispute.opened`, `dispute.auto_refunded`, `dispute.decided`, `return.deposited`, `return.inspected`, `replacement.late`, `suborder.cancelled`, `relay.changed`, `gift.paid`, `payout.friday`.
- **Avis** : `/orders/{id}/reviews`, `/products/{maitre}/reviews/summary` — événements `review.created`, `review.low`.
- **Abonnement/listes/nouveautés** : `/subscriptions/plans`, `POST/DELETE /subscriptions`, `/lists`, `/share`, `/lists/public/{token}`, `/gift` — événements `subscription.renewed`, `subscription.failed`, `gift.paid`, `group.released`.

### 1.5 Questions ouvertes à trancher (REF-D01.Q01 – Q20, texte reproduit)

- **Q01** (p.01) : REF-CL v3 (25 sept.) se dit « seule référence » et remplace les 17 documents client, alors que le handoff traite le paquet actuel (CL-00 à CL-16) comme plus récent : dater les deux pour appliquer « le plus récent l'emporte ».
- **Q02** (p.01) : Remboursement automatique « 3 000 / 10 000 F » : seuils à préciser (plafond selon quoi ?).
- **Q03** (p.02) : Paramètres OTP (durée, essais, renvoi), seuil N des rangées et seuil_écran : non fixés.
- **Q04** (p.02) : Premier écran « 24-72 h · Livraison » alors que la décision du 25 sept. vise < 5 h par zone : libellé à aligner.
- **Q05** (p.03) : ACC-RANGEE-MIN non fixé ; RECH-HIST seulement proposé.
- **Q06** (p.03) : Délai domicile « 24-72 h » sur la fiche vs objectif < 5 h par zone (décision 25 sept.).
- **Q07** (p.04) : LIV-SUPPL-M / L non fixé.
- **Q08** (p.04) : T_val (fenêtre de validation agrégateur) non chiffrée.
- **Q09** (p.05) : CODE-BIO et GARDE-PRORATA seulement proposés ; seuil du mode économique SMS à trancher ; fournisseur SMS secondaire à désigner.
- **Q10** (p.05) : Le budget « 5 à 6 SMS » liste 6 codes (C1, C3, S1, S2, C4, C12) : confirmer que 6 est le plafond strict.
- **Q11** (p.06) : IFA-NABS, IFA-NAUTO, RET-SANS-RETOUR, RET-REMPL-DELAI, plafond d'annulations après confirmation : non fixés.
- **Q12** (p.07) : Prestataire carte (Flutterwave ou CinetPay), AVIS-FENETRE, ANN-PLAFOND, SUP-WA non fixés.
- **Q13** (p.08) : Formule et pondérations du score de zone « à définir ».
- **Q14** (p.08) : Rémunération « Or sans plafond avec assurance » : conditions d'assurance non précisées.
- **Q15** (p.09) : 18 valeurs « à trancher » listées en 19.4 bloquent la production.
- **Q16** (p.09) : Seuil de dissociation d'une commande (messages d'arrivée) : cité seulement ici, sans définition.
- **Q17** (p.10) : F_client « 3 + bonus » (ch. 21) contredit « 1 + bonus » (ch. 10) : à trancher (le plus récent / la grille du 24 sept. donne 1).
- **Q18** (p.10) : Validité par défaut du lien de liste, FLASH-BUDGET, IA-COUT-MAX non fixés.
- **Q19** (p.11) : Paramètres « à trancher » : TRC-PARTENAIRE, TRC-IMEI-SOURCE, WAP-COUT, WAP-VOCAL-CONSERV ; MDC-FORFAIT à valider.
- **Q20** (p.12) : Paramètres « à trancher » à décider avant chaque activation de module : LST-VALIDITE, FLASH-BUDGET, IA-COUT-MAX, TRC-PARTENAIRE, WAP-COUT, WAP-VOCAL-CONSERV ; COT-FRAIS à confirmer ; MDC-FORFAIT à valider.

### 1.6 Contradictions internes ou avec le bon sens (signalées, non résolues)

1. **F_client incohérent** : le chapitre 21 (abonnement) écrit F_client = « 3 + bonus », alors que la grille de base au chapitre 10 (garde) n'a qu'un seul jour gratuit, soit « 1 + bonus » — signalé explicitement dans le document comme « incohérence interne REF-CL » (Q17, action A67).
2. **Statut du document contesté** : REF-CL v3 se proclame « seule référence » remplaçant 17 documents, mais le handoff traite le paquet CL-00→CL-16 comme la version qui fait foi — deux sources potentiellement divergentes sans règle de préséance datée claire (Q01).
3. **Délai affiché vs délai cible** : plusieurs écrans (premier lancement, fiche produit) affichent encore « 24-72 h » de livraison alors que la décision du 25 septembre fixe l'objectif à < 5 h par zone (Q04, Q06) — risque de décalage visible pour l'utilisateur si non corrigé avant recette.
4. **18 valeurs bloquantes non tranchées** en §19.4 (Q15) — le document reconnaît lui-même que la production ne peut pas démarrer tant que ces valeurs ne sont pas fixées, bien qu'il indique par ailleurs (règle de lecture générale) que les questions ouvertes « ne bloquent pas le développement ».
5. **Registre incomplet** : le registre après-lancement (ch. 32) omet TRC-IMEI-SOURCE, FAM-MAX-TX et RNT-GROUPAGE-J alors que ces paramètres sont utilisés ailleurs dans le même document (ch. 25, 28, 29) — incohérence de registre signalée en A78.
6. **Sécurité coordonnées vs support humain** : le support WhatsApp Business est déclaré « humain » et autorisé, alors que la doctrine générale interdit tout échange de commande/paiement/photo hors messagerie interne — zone grise sur ce que le support humain peut réellement voir/transmettre.

### 1.7 Ce qui concerne l'espace vendeur (à retenir pour VD-xx)

Un développeur de l'espace vendeur doit connaître ces éléments issus de REF-CL, car les documents VD-xx en dépendent :

- **Cycle de vie commande/sous-commande/colis** (ch. 2.2-2.3) : commande en 15 étapes (recherche → avis) ; états commande = `panier, en_attente_paiement, validee_comptoir, payee, terminee, annulee` (échec paiement → `échouée`, panier intact) ; états sous-commande/colis = `payee, confirmee, prete, collectee, arrivee_relais, en_livraison_domicile, remise, en_litige, retour_en_cours, renvoyee_vendeur, annulee`. Une **sous-commande = un vendeur** (le client peut avoir plusieurs sous-commandes dans une même commande, chacune trackée séparément).
- **Modèle escrow** : `tentative → reussi (webhook signé, seule vérité) → escrow_bloque → escrow_liberable → verse → rembourse (toujours vers le moyen d'origine)`. Libération : **J+3** standard (Bronze/Argent), **J+1** (Or/Platine), **J+14** carte diaspora ; versement au vendeur **chaque vendredi**, sans demande, sans frais ni minimum.
- **Ce que le vendeur voit côté argent** : jamais de ligne « commission » — uniquement « Vous gardez X F » (décision 22 sept., action A54, A08 dans REF-COMMISSION). Le montant exact dépend de la formule R4 (voir §2).
- **Anonymat vendeur** : le vendeur ne voit jamais l'identité, le quartier ni le relais du client, ni les autres vendeurs d'une commande, ni le total payé par le client. Le client ne voit jamais le nom du vendeur ni de boutique (« Boutique A, B, C » uniquement), ni de page boutique publique ni de QR de boutique (A53). Ces règles doivent être respectées par tout écran vendeur qui affiche des données de commande.
- **Onboarding vendeur** (ch. 17, aperçu — détail dans le paquet VD-xx qui fait foi) : inscription en 3 temps — 1. Ouvrir (nom, numéro vérifié, point sur carte, ~2 min) → brouillons ; 2. Publier (pièce recto-verso, selfie preuve de vie, n° MoMo) ; 3. Être payé (contrat signé électroniquement, MoMo au nom du titulaire, RCCM/NIU si pro). KYC via Smile ID < 15 min + revue humaine 48 h ouvrées. Principe : « chercher dans le catalogue avant de demander une fiche » (prix conseillé à la baisse, décision 23 sept.) — « Demander une nouvelle fiche » n'est accessible qu'après une recherche sans résultat.
- **Contrôle qualité au ramassage** : 100 % des 5 premières commandes d'un nouveau vendeur contrôlées, puis 1/20 tant que Trust Score < 70, puis 1/100. Rupture signalée avant échéance = faute de ponctualité mineure (g1) ; absence au passage du livreur = g2 (plus grave). Objectif logistique : 8 colis par tournée livreur.
- **Rupture de stock / remplacement** : en cas de rupture après confirmation, BelivaY tente un vendeur suivant avec Trust Score ≥ 75 et prix livré ≤ +5 % (écart à la charge de BelivaY), sinon remboursement intégral au client le jour même ; l'incident pèse sur le Trust Score du vendeur défaillant.
- **Litige côté vendeur** : le vendeur a 48 h pour répondre (accepter / contester / proposer un arrangement ≥ 40 caractères) ; en cas de silence, le dossier part en file d'arbitrage prioritaire côté console avec présomption favorable au client (v2.0 — l'ancien remboursement automatique à 48 h a été supprimé). Le vendeur doit fournir un motif écrit en cas de décision défavorable. Chaîne de preuves attendue côté vendeur : le livreur photographie le produit puis le colis scellé chez le vendeur au moment de la collecte.
- **Retour** : coût du retour toujours attribué après arbitrage, jamais à la simple demande du client (décision 17 sept.) ; fenêtre de retour 7 jours après retrait, motif obligatoire (plus de « retour sans motif »).
- **Annulation** : le vendeur (ou BelivaY) peut annuler avant collecte ; impossible dès la collecte ; annulation par BelivaY (fraude, vendeur suspendu, zone inaccessible, aucune entreprise disponible) = remboursement intégral client, aucun impact sur l'IFA/Trust Score du vendeur.
- **Ventes flash** : le vendeur doit accepter la remise offre par offre en voyant explicitement ce qu'il garde ; jamais de remise financée par le relais/transporteur — remise portée par le vendeur ou un budget de croissance BelivaY ; jamais de commande rendue déficitaire (simulation bloquante côté paramétrage).
- **Commission et « familles »** : REF-CL renvoie explicitement à REF-COMMISSION pour les « familles C, k = 1/2 » (supermarché) — donc R4 fait foi pour tout calcul de commission affiché côté vendeur (voir §2, y compris le conflit de formule non résolu avec REF-VD/V15).
- **Paiement au comptoir côté vendeur** : le vendeur peut refuser produit par produit une commande à paiement au comptoir ; le montant dû au comptoir est calculé côté serveur et affiché au gérant relais comme « Montant dû (MoMo sur place) », jamais en espèces.

---

## 2. R4 — REF-COMMISSION — Commission officielle V02 (source)

**Code de suivi des actions :** REF-D04 (actions REF-D04.A01…, questions REF-D04.Q01…)
**Document d'origine :** `V02_Commission_officielle.pdf`, 7 pages
**Découpage :** 1 partie (pages 1 à 7)
**Actions :** 5 (REF-D04.A01 à REF-D04.A05)
**Questions ouvertes :** 2 (REF-D04.Q01, REF-D04.Q02)

### 2.1 Résumé

R4 est le document officiel V02 qui fixe la grille et la formule de commission BelivaY côté vendeur : priorité 2 sur 15, marqué **bloquant**. Il définit un service backend unique de calcul de commission, une formule à taux dégressif par tranches de prix (coefficients multiplicateurs), une grille de taux par univers de produits × palier vendeur (Bronze/Argent/Or/Platine), un plancher de commission par commande, une offre de découverte (−3 points pendant une période limitée), le figement des paramètres au moment du paiement, et l'affichage côté vendeur uniquement de ce qu'il garde (jamais ce que BelivaY prélève). Le document signale lui-même un conflit non résolu avec une autre formule de commission (barème M01 par familles de marge) présente dans REF-VD/V15, avec des montants différents pour les mêmes scénarios de test.

### 2.2 Tableau des actions (REF-D04.A01 – A05)

| ID | Description courte | Partie | Statut / réf. |
|---|---|---|---|
| REF-D04.A01 | Retirer les plans Gratuit/Starter/Pro/Business à 20/18/12/10/5 %, les réductions « −1,−2,−3 % » par palier, tout taux codé en dur, toute mention « le palier ne change pas la commission », toute ligne « Commission −X F » ou « Retenu » (tous écrans argent, plans, palier — VD) | 01 | V02 |
| REF-D04.A02 | Trancher quelle formule fait foi : ce document (taux catégorie × palier, coefficients 1/0,5/0,25/0,12 ; ITEL → 16 600 F gardés) ou le barème M01 par familles de marge repris dans REF-VD/V15 (ITEL → 17 840 F gardés) ; aligner tous les montants (Mon argent, Mes gains, versements, simulateur, captures) | 01 | deux formules incompatibles |
| REF-D04.A03 | Charger la grille complète depuis l'annexe 1 du contrat vendeur dès sa transmission et remplacer les lignes « Proposé » | 01 | V02 |
| REF-D04.A04 | Vérifier que « vous gardez X F par vente » se calcule en direct à la saisie, y compris sous 5 000 F et avec le plancher | 01 | V49 |
| REF-D04.A05 | Afficher l'offre de découverte avec date de fin, compteur de commandes et « vous gardez 3 points de plus » | 01 | V02 |

### 2.3 Règles métier et calculs clés (chiffres exacts)

**Principes structurants (règles citées) :**
V1 = un seul service backend calcule la commission ; V2 = formule par tranches dégressives, sans plafond, plancher par commande ; V3 = figement au paiement ; V4-V6 = offre de découverte, TVA paramétrée, suppression des grilles de production (anciens plans Gratuit/Starter/Pro/Business) ; V7/V49/V50 = afficher ce que le vendeur garde.

**Grille de taux (Bronze / Argent / Or / Platine), en % :**
- Téléphones & accessoires : **20 / 17 / 14 / 12** (Établi)
- Autre électronique : **20 / 17 / 14 / 12** (Proposé)
- Mode : **21 / 18 / 15 / 13** (Établi)
- Beauté : **21 / 18 / 15 / 13** (Proposé)
- Électroménager : **16 / 13 / 10 / 8** (Proposé)
- Maison & Déco : **20 / 17 / 14 / 12** (Proposé)
- Supermarché, Frais & Premium : **12 / 9 / 6 / 5** (Proposé)
- Bébé, Sport, Animaux : **18 / 15 / 12 / 10** (Proposé)
- Livres : **15 / 12 / 9 / 7** (Proposé)
- Structure des paliers : Argent = Bronze **−3** pts, Or = Bronze **−6** pts, Platine = Bronze **−8** pts, jamais sous **5 %**.
- **Annexe 1 du contrat vendeur (source de la grille définitive) non transmise** — la grille ci-dessus est donc en grande partie « Proposé », pas contractuelle.

**Barème par tranches (coefficient dégressif appliqué à la commission calculée) :**
×**1** jusqu'à **25 000 F** ; ×**0,5** de 25 000 à **100 000 F** ; ×**0,25** de 100 000 à **250 000 F** ; ×**0,12** au-delà.

**Formule complète :**
`taux = MAX(5 % ; t(cat, palier) + 3 pts si prix < 5 000 F − r_abo (Boost 1 pt, Pro 2 pts) − 2 pts si Made in Cameroon − 3 pts si offre de découverte)`
`com_commande = MAX(700 F ; Σ com_article)` par commande et par vendeur.
TVA τ = **0 %** puis **19,25 %**, annoncée **30 j avant** (règle V6).
`net = prix − com − TVA` (D7 : aucun frais de versement).
D8 : remise d'abonnement ≤ prix de l'abonnement.
Offre de découverte : **−3 pts** jusqu'à **min(3 mois ; 50 commandes)**, compteur démarré à la 1ʳᵉ commande payée.
D5 : figé au paiement (palier, catégorie, plan, offre, taux, base).
D4 : commission prélevée à la libération, annulée si remboursement total, prorata si partiel.
F9 : remise Flash ⇒ commission calculée sur le prix payé ; remise de fidélité BelivaY jamais déduite du net vendeur.
Décision du 22 sept. : **aucun écran ne montre ce que BelivaY prend** — uniquement « vous gardez ».

**Exemples chiffrés (taux à 17 %) :**
5 000 F → commission **850 F** (garde **4 150 F**) ; 20 000 F → **3 400 F** (**16 600 F**) ; 50 000 F → **6 375 F** (**43 625 F**) ; 150 000 F → **12 750 F** (**137 250 F**) ; 350 000 F → **19 040 F** (**330 960 F**, soit **94,6 %** gardé) ; 1 000 000 F → **32 300 F** (**967 700 F**).
Comparaison iPhone 350 000 F : ancien plafond de commission **8 000 F** ; taux plein (sans barème) **59 500 F** ; barème dégressif réel **19 040 F** (soit **2,4×** l'ancien plafond).

**Part gardée par le vendeur, par univers et palier (Bronze/Argent/Or/Platine), en % :**
Électronique **80/83/86/88** ; Mode, Beauté **79/82/85/87** ; Électroménager **84/87/90/92** ; Maison **80/83/86/88** ; Supermarché/Frais **88/91/94/95** ; Bébé/Sport/Animaux **82/85/88/90** ; Livres **85/88/91/93** ; **+3 points** pendant l'offre de découverte.

**Scénario complet (Bronze, en période de découverte) :**
ITEL AC52 20 000 F → commission **3 400 F**, net **16 600 F** ; iPhone 350 000 F → **19 040 F**, net **330 960 F** ; article à 150 000 F → **12 750 F** ; article à 50 000 F → **6 375 F** ; chargeur 5 000 F → **850 F** (net **4 150 F**) ; chargeur 4 900 F → 20 % = **980 F** (net **3 920 F**) ; article seul à 3 000 F → 600 F relevé au **plancher 700 F** (net **2 300 F**) ; ITEL × 3 = **49 800 F** gardés sur **60 000 F**.

### 2.4 Endpoints API et événements

Ce document est une référence transverse (source) et ne liste pas d'endpoint ni d'événement propre — le calcul de commission est décrit comme rendu par « un seul service backend » (règle V1), consommé par les écrans VD-02 (argent/calculs), VD-08, VD-09, VD-10 et par ADM-10 (paramétrage des commissions). Aucun code d'endpoint indicatif n'est donné dans ce document ; se référer au paquet VD-xx pour les endpoints réels de simulation/affichage.

### 2.5 Questions ouvertes à trancher (texte reproduit)

- **REF-D04.Q01** (partie 01) : Deux modèles de commission coexistent (catégorie × palier + coefficients ici ; familles de marge M01 dans REF-VD) avec des montants différents pour le même scénario (**16 600 F vs 17 840 F** pour l'ITEL ; **330 960 F vs 335 324 F** pour l'iPhone) : à trancher, le plus récent l'emporte.
- **REF-D04.Q02** (partie 01) : Cas limites : plancher 700 F > prix (net négatif sous ≈ **3 043 F**), arrondi au franc, plancher après remboursement partiel, base du plafond de remise d'abonnement, compteur des 50 commandes.

### 2.6 Contradictions internes ou avec le bon sens (signalées, non résolues)

1. **Deux formules de commission incompatibles en circulation** — c'est le point le plus critique de tout le batch : REF-COMMISSION (catégorie × palier + coefficients dégressifs) donne **16 600 F** gardés pour l'ITEL AC52 à 20 000 F, tandis que le barème M01 par familles de marge cité dans REF-VD (partie 08, V15 « commission par tranches M01/M06 ») donne **17 840 F** pour le même article, et **330 960 F vs 335 324 F** pour l'iPhone à 350 000 F. Le document dit seulement « le plus récent l'emporte », sans trancher lui-même. Tant que cela n'est pas résolu, **tout écran vendeur montrant « vous gardez X F » (Mon argent, Mes gains, simulateur, versements) affichera un montant potentiellement faux** selon la formule implémentée.
2. **Grille non contractuelle** : la grille de taux détaillée (9 univers × 4 paliers) est presque entièrement au statut « Proposé », car « l'annexe 1 du contrat vendeur » censée la fixer définitivement **n'a pas été transmise**. Construire l'espace vendeur sur ces taux revient à coder en dur des valeurs non encore validées contractuellement.
3. **Plancher 700 F peut produire un net négatif** : pour un article dont le prix est inférieur à environ **3 043 F**, le plancher de commission de 700 F par commande dépasserait la commission calculée au taux normal, ce qui peut rendre le net vendeur négatif ou incohérent — cas limite reconnu par le document lui-même (Q02) mais non résolu (pas de règle de plafonnement explicite pour ce cas).
4. **Cohérence avec REF-CL** : REF-CL (partie 08, décision 22 sept.) exige « Vous gardez X F » sans aucune ligne de commission visible — cohérent avec R4 — mais si les deux formules de R4/REF-VD ne sont pas alignées, cet affichage « vous gardez » sera lui-même la source du montant incohérent remonté au client (indirectement, via le prix) et au vendeur.

---

## Synthèse croisée (à retenir avant de lire les documents VD-xx)

Le point le plus structurant pour le développeur espace vendeur : **il existe deux moteurs de calcul de commission concurrents et non réconciliés** (REF-COMMISSION vs REF-VD/V15 « M01 »), avec des écarts de plusieurs milliers de francs sur des scénarios identiques. Aucun écran d'argent vendeur (Mon argent, Mes gains, simulateur d'ajout d'offre, historique de versements) ne peut être considéré comme fiable tant que REF-D04.Q01 n'est pas tranché explicitement et que la grille définitive (annexe 1 du contrat vendeur) n'est pas chargée. À traiter en priorité, avant tout code de calcul de commission côté vendeur.
