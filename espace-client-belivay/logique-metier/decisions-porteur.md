# Décisions du porteur du produit

Généré par `outils/revue.py` depuis `decisions-porteur.json` ; ne pas modifier ce fichier à la main.
CCH-13 : la décision la plus récente l’emporte sur un texte plus ancien des documents.

## DP-01 — Rupture de stock (décidée, 2026-10-03)

> rupture de stock on passe au vendeur suivant 2 tentative si non reussi on rembourse le client

**Décision** : En cas de rupture, on passe au vendeur suivant, au plus 2 tentatives ; si aucune ne réussit, le client est remboursé.

**Règles touchées** : CCY-06, CPY-15, CPY-16, CAN-24, CAN-25 · **Références** : CL-D03.A18, CL-D03.Q11

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `RUPTURE-TENTATIVES` (nouveau) | 2 | — |

**À préciser** : Les conditions du vendeur suivant restent celles de CCY-06 (Trust Score ≥ 75, prix livré au plus +5 %, écart payé par BelivaY) et le remboursement reste intégral, le jour même.

## DP-02 — Sécurité du code de retrait (décidée, 2026-10-03)

> securiter du code de retrais oui je valide

**Décision** : Le code de retrait est gardé chiffré, avec une empreinte HMAC pour la vérification au comptoir (CDA-27), et non seulement haché.

**Règles touchées** : CDA-27, CIN-40, CCD-18, CRL-12, CLI-08 · **Références** : CL-D03.A19, CL-D03.Q12, CL-D04.A14, CL-D04.Q10, CL-D10.A27, CL-D13.A15, CL-D17.A02, CL-D17.A91, CL-D17.Q22

**À reporter dans les documents** : Spécification v3 §2.6 et §9.2 (« code de retrait haché ») et console (ADM-PRV-03).

## DP-03 — Prestataires de paiement et de messages (décidée, 2026-10-03)

> campay pour le moment et sms et whatsapp ensuite on auras nos propre API DE payement · les paiements se feront avec campay et Africaltalk pour les messages Vérifie les documents pour plus d'informations. · mets les deux cinet pay en avant et flutterwave au cas ou

**Décision** : Paiement Mobile Money par CamPay (Fapshi en secours, PAY-AGREG, Décidé). Messages : SMS par Africa's Talking (principal, déjà prévu par CL-02, CL-10, CL-16), e-mail par Brevo, push par FCM ; WhatsApp ensuite. BelivaY aura plus tard sa propre API de paiement. Carte depuis l'étranger : CinetPay en premier, Flutterwave en secours.

**Règles touchées** : CCH-07, CCH-12, CAL-26, CPY-08 · **Références** : CL-D03.A20, CL-D03.Q14, CL-D09.A13, CL-D09.Q08, CL-D13.A22

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `PAY-CARTE-PSP` | CinetPay (principal), Flutterwave (secours) | Flutterwave ou CinetPay |

**À préciser** : Fournisseur SMS de secours (SMS-SECOURS) à désigner.

## DP-04 — Mot de passe (décidée, 2026-10-03)

> mots de passe de 8 charactere minimum

**Décision** : Mot de passe de 8 caractères au moins (CAP-16 : dont un chiffre).

**Règles touchées** : CAP-16, CIN-23 · **Références** : CL-D03.Q20

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `MDP-LONG` (nouveau) | 8 caractères au moins, dont un chiffre | — |

## DP-05 — Code de vérification du numéro (OTP) (décidée, 2026-10-03)

> je suis d'accors avec le reste

**Décision** : Valeurs proposées retenues : code valable 10 minutes ; 5 essais puis 15 minutes d'attente ; 60 s entre deux envois et 3 envois par heure.

**Règles touchées** : CAP-14, CIN-33 · **Références** : CL-D03.A30, CL-D03.Q21, CL-D04.A04, CL-D04.A10, CL-D04.Q06

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `OTP-DUREE` | 10 minutes | 10 minutes (proposé) |
| `OTP-ESSAIS` | 5, puis 15 minutes d’attente | 5, puis 15 minutes d’attente (proposé) |
| `OTP-RENVOI` | 60 s entre deux envois, 3 envois par heure | 60 s entre deux envois, 3 envois par heure (proposé) |

## DP-06 — Wallet BelivaY (décidée, 2026-10-03)

> wallet on garde de l'argent sans soucis · (remboursements) Toujours au Wallet · depuis l'etranger ca vas vers le moyens de payement utiliser de depart · mets le plafond a 2,5million ou meilleur suggestion des document

**Décision** : La page Wallet est gardée : BelivaY garde de l'argent pour le client (solde, recharger, retirer vers Mobile Money), solde plafonné à 2 500 000 F (les documents ne proposent aucun plafond : le porte-monnaie y était supprimé). Tout remboursement crédite le Wallet, sauf un paiement par carte depuis l'étranger, remboursé sur la même carte (comme CAL-26 et CL-11). Remplace CCO-25, CPY-51 et « toujours vers le moyen d'origine » pour les paiements Mobile Money.

**Règles touchées** : CCO-25, CPY-51, CCH-01, CCY-21, CAL-22, CAL-24, CAL-26, CAL-27 · **Références** : page wallet (inventaire, 2.8)

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `REMB-DESTINATION` (nouveau) | Wallet BelivaY ; carte depuis l'étranger : la même carte | — |
| `WALLET-PLAFOND` (nouveau) | 2 500 000 F | — |

**À préciser** : Règles du Wallet à écrire (recharge, retrait vers Mobile Money, frais et délai de retrait, paiement d'une commande avec le solde). Garder de l'argent pour un client relève de la réglementation des paiements de la CEMAC (monnaie électronique) : à vérifier avec un juriste avant la mise en production.

## DP-07 — Suppléments de livraison par taille (décidée, 2026-10-03)

> s et m et l plus 500. pour plus gros c'est 1500f-3000 en fonctionde l a tourner ensemble ou separer et la distance · 900+350 pour boutique ajouter pout toutes les taille S M L · NON C'EST PLUTOT 380 DSL CA NE REMPLACE PAS OUBLIE LES 350 C'EST UNE ERREURE DE MA PART · (XL) Distance seulement · 3 paliers

**Décision** : Le moteur de frais ne change pas : 900 F au relais (ramassage LIV-R 500 F + remise 400 F), 380 F de ramassage pour une boutique en plus dans la même zone (LIV-DELTA), la même chose pour les tailles S, M et L : aucun supplément de classe M ou L. XL et hors gabarit (domicile seulement) : 1 500 F à moins de 5 km, 2 000 F de 5 à 10 km, 3 000 F au-delà de 10 km. Les « + 500 F » et « + 350 F » dits d'abord sont retirés par le porteur.

**Règles touchées** : CDS-16, CAL-01, CAL-06, CAL-09, CLS-10, CRE-24, CRE-28, CFP-09, CFP-20, CFP-24, CFP-29, CFR-18, CFR-19, CAB-12 · **Références** : CL-D02.A20, CL-D02.Q14, CL-D03.A05, CL-D03.A22, CL-D05.A04, CL-D05.A13, CL-D07.A04, CL-D07.A06, CL-D07.Q05, CL-D07.Q13, CL-D08.A06, CL-D15.A53, CL-D15.Q16, CL-D16.A26, CL-D16.A40, CL-D16.Q03, CL-D17.A59

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `LIV-SUPPL-M / L` | 0 F : aucun supplément de classe M ou L | à fixer · prototype : + 200 F colis M, + 300 F colis L, affichés sous le prix livré |
| `LIV-SUPPL-XL` | 1 500 F (moins de 5 km) · 2 000 F (5 à 10 km) · 3 000 F (plus de 10 km), distance de la livraison à domicile | à fixer · prototype : 1 500 F |

## DP-08 — Frais de garde des gros colis (décidée, 2026-10-03)

> on double les frais pour le client mais le point relais reste plafoner a 100 et a 300 pour les gros colis · 100F/JOUR, 300F GROS ET (0, 100, 100, 100, 200, 500, 1000) · C1 ET C2 · POUR LES GROS COLIS AJOUTES 300 DANS TOUTES LES FACTURATION DE PETIT COLIS MEME DES LE DEPART DONC 300, 400, 400, 400, 500, 800, 1300 ETC

**Décision** : Grille de garde du client, jour 1 à jour 7 : 0, 100, 100, 100, 200, 500, 1 000 F. Gros colis (cartons C1 et C2) : la même grille + 300 F chaque jour dès le premier jour : 300, 400, 400, 400, 500, 800, 1 300 F. Le point relais touche 100 F par jour facturé, 300 F par jour pour un gros colis. Renvoi au vendeur inchangé (GARDE-RENVOI 500 F). Remplace la grille du 24 sept. (CAL-19) et la garde doublée envisagée d'abord.

**Règles touchées** : CAL-19, CAL-21, CAL-22, CGA-07, CMC-47, CCM-03, CGA-01, CGA-07, CGA-14, CSM-04, CSM-07, CGA-28, CAB-41, CRS-17, CLI-06, CLI-12, CLI-14, CLI-44 · **Références** : CL-D03.A25, CL-D03.Q15, CL-D10.A18, CL-D10.A33, CL-D10.Q02, CL-D10.Q05, CL-D10.Q12, CL-D10.A35, CL-D10.Q14, CL-D16.A14, CL-D17.A27, CL-D17.Q38

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `GARDE-J1` | gratuit (0 F) | gratuit |
| `GARDE-J2-3` | 100 F par jour (jours 2 et 3) | 100 F par jour |
| `GARDE-J4-5` | 100 F le jour 4, 200 F le jour 5 | 200 F par jour |
| `GARDE-J6-7` | 500 F le jour 6, 1 000 F le jour 7 | 400 F par jour |
| `GARDE-GROS-AJOUT` (nouveau) | 300 | — |
| `RELAIS-GAIN-GARDE` | 100 F par jour facturé | 100 F |
| `RELAIS-GAIN-GARDE-GROS` (nouveau) | 300 F par jour facturé (cartons C1 et C2) | — |
| `GARDE-GRILLE` (nouveau) | 0, 100, 100, 100, 200, 500, 1000 | — |

**À préciser** : Les plafonds se déduisent de la grille : 2 000 F (4 100 F pour un gros colis), + 500 F avec le renvoi, et jamais au-delà de la valeur du colis (CAL-19). Les classes du client (S, M, L, XL) et les cartons du livreur (S, M, L, C1, C2) sont à rapprocher : quelle classe de produit va en carton C1 ou C2.

## DP-09 — Zones exploitées au lancement (décidée, 2026-10-03)

> On va commencer avec les zones. Une, trois, six, et sept.

**Décision** : Au lancement, BelivaY exploite les zones Z1 (Bastos), Z3 (Mokolo), Z6 (Melen) et Z7 (Biyem-Assi), comme la console. Les autres quartiers sont hors zone (CDA-06, CPR-08 à CPR-10 : relais d'une autre zone avec une date ferme, ou domicile). Le relais de démonstration Mvog-Ada, hors de ces zones, est une donnée de démonstration à remplacer.

**Règles touchées** : CCH-02, CDA-06, CPR-05, CPR-08, CAC-34, CCO-11, CCN-09 · **Références** : CL-D02.A04, CL-D02.Q01, CL-D03.A06, CL-D04.A16, CL-D04.Q09, CL-D05.Q01, CL-D09.A15, CL-D11.A43, CL-D14.A08, CL-D15.A34, CL-D15.Q11, CL-D17.Q03

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `ZONES-EXPLOITEES` (nouveau) | Z1 Bastos, Z3 Mokolo, Z6 Melen, Z7 Biyem-Assi | — |

## DP-10 — Retours : toujours un dépôt au relais (décidée, 2026-10-03)

> toujour demander au client de deposer le colis au point relais pour le renvoie

**Décision** : Un retour passe toujours par le dépôt du colis au point relais : plus de remboursement sans renvoi (RET-SANS-RETOUR supprimé).

**Règles touchées** : CCY-25, CAL-28, CRO-24 · **Références** : CL-D04.Q13, CL-D12.A35, CL-D12.A54, CL-D12.Q18, CL-D17.A47, CL-D17.Q17

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `RET-SANS-RETOUR` | aucun : le client dépose toujours le colis au relais | sous 3 000 à 5 000 F · prototype : 5 000 F (CL-11) ; CL-03 montre 3 000 F |

**À préciser** : Restent à fixer : délai de remplacement (RET-REMPL-DELAI, 72 h ouvrées proposé), fenêtre d'avis (AVIS-FENETRE, 7 jours proposé), plafond d'annulations (ANN-PLAFOND).

## DP-11 — Accueil et listing (décidée, 2026-10-03)

> oui, oui 12 produit

**Décision** : Une rangée de l'accueil s'affiche dès 3 produits (ACC-RANGEE-MIN = 3). Un nouveau produit a au moins 1 emplacement dès 3 cartes dans une rangée d'univers (précise CAC-21). Le listing charge 12 produits par page.

**Règles touchées** : CAC-19, CAC-20, CAC-21, CLS-02 · **Références** : CL-D05.A05, CL-D05.Q04, CL-D05.A07, CL-D05.Q05, CL-D05.A14, CL-D05.Q08

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `ACC-RANGEE-MIN` | 3 | à fixer · prototype : 3 |
| `ACC-NOUVEAUX-MIN` (nouveau) | 1 emplacement dès 3 cartes | — |
| `LISTE-PAGE` (nouveau) | 12 | — |

## DP-12 — Horaires du support (décidée, 2026-10-03)

> oui · 2h

**Décision** : Support humain de 7 h à 21 h, 7 jours sur 7 ; première réponse en messagerie sous 2 h pendant ces heures (comme la console, ADM-P29R-04).

**Règles touchées** : CAC-34, CFP-31, CSV-04, CSV-05 · **Références** : CL-D02.Q05, CL-D04.Q05, CL-D03.A14, CL-D03.Q07, CL-D04.A08, CL-D07.Q02, CL-D07.Q07, CL-D07.Q11, CL-D14.A05, CL-D17.A73, CL-D17.Q33

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `SUP-HORAIRES` | 7 h – 21 h, 7 j/7 | 7 h – 21 h, 7 j/7 |
| `SUP-DELAI` | 2 h pendant les heures du support | 4 h ouvrées |

## DP-13 — Pidgin (décidée, 2026-10-03)

> non

**Décision** : Pas de pidgin : le site est en français et en anglais. Remplace CRD-03 et CIN-09 (pidgin proposé en troisième langue) ; le choix « Pidgin » disparaît du Menu et de Réglages.

**Règles touchées** : CRD-03, CIN-09, CRD-01, CNV-02, CRG-01, CRG-02 · **Références** : CL-D02.A25, CL-D02.Q19, CL-D04.Q02, CL-D14.Q15, CL-D17.A71, CL-D17.A89, CL-D17.Q19, CL-D17.Q24

## DP-14 — Mise en avant des vendeurs (décidée, 2026-10-03)

> respecte les regle des document mais l'enregistrement doit seras simplifier · oui vendeur

**Décision** : On respecte les documents : jamais de bande « Sponsorisé » ni de placement payant côté client (CCT-08, CAC-32, CCH-44). L'inscription des vendeurs doit être simplifiée : à reporter dans le paquet Espace vendeur.

**Règles touchées** : CCT-08, CAC-32, CCH-44, CRM-13, CTV-13 · **Références** : CL-D05.A08, CL-D05.Q06, CL-D06.A10, CL-D17.A69

**À reporter dans les documents** : Paquet Espace vendeur : simplifier l'inscription des vendeurs ; remplacer la « Mise en avant 24 h » vendue dans une bande « Sponsorisé » (VD-10).

## DP-15 — Remplacement, avis, annulations (valeurs de bon sens) (proposée, 2026-10-03)

> utilise le common sense reflechis

**Décision** : Sur délégation du porteur : délai de renvoi d'un remplacement 72 h ouvrées, dimanche non compté (valeur du vendeur et du relais, CRP-02) ; fenêtre de notation 7 jours après le retrait, égale à la fenêtre de retour (valeur du relais, CAV-10) ; plafond d'annulations après confirmation : 3 sur 30 jours glissants, au-delà le palier IFA « À instruire » est proposé et validé par une personne, rien n'est montré au client (CAN-18).

**Règles touchées** : CRP-02, CAV-10, CCM-17, CAN-18, CLA-04, CCM-17, CRP-02, CAN-18, CAV-10 · **Références** : CL-D03.A15, CL-D03.A23, CL-D07.A10, CL-D07.Q09, CL-D10.A41, CL-D12.A42, CL-D12.Q14, CL-D13.A03, CL-D13.Q01, CL-D13.A32, CL-D14.A21, CL-D14.Q06, CL-D17.A66, CL-D17.A53

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `RET-REMPL-DELAI` | 72 h ouvrées, dimanche non compté | à fixer · prototype : 72 h ouvrées (valeur du relais et du vendeur) |
| `AVIS-FENETRE` | 7 jours après le retrait | à fixer · prototype : 7 jours (valeur du relais) |
| `ANN-PLAFOND` | 3 annulations après confirmation sur 30 jours glissants | à fixer |

## DP-16 — Règles du portefeuille (Wallet) (proposée, 2026-10-03)

> oui vas y on l'etablie pour que ca serve au mieux les interet de belivay

**Décision** : Douze règles CWL-01 à CWL-12 rédigées (regles-ajoutees.json) : recharge gratuite par Mobile Money, paiement d'une commande avec le solde, remboursements crédités dès la décision, retrait vers le numéro vérifié avec un retrait gratuit par mois, prudence anti-fraude, pas d'expiration, sécurité, fermeture du compte, conformité. Nom à l'écran : « Portefeuille BelivaY » (CCH-30 interdit « Wallet » en français). Revu le 3 oct. : l'argent venu d'un remboursement se retire toujours sans frais (un client remboursé ne doit rien payer pour récupérer son argent) ; les frais ne visent que l'argent rechargé.

**Règles touchées** : CCO-25, CPY-51, CCH-30

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `WALLET-RECHARGE-MIN` (nouveau) | 500 F | — |
| `WALLET-RETRAIT-MIN` (nouveau) | 1 000 F | — |
| `WALLET-RETRAIT-JOUR` (nouveau) | 500 000 F | — |
| `WALLET-RETRAIT-H` (nouveau) | 1 h | — |
| `WALLET-RETRAIT-GRATUIT` (nouveau) | 1 par mois civil | — |
| `WALLET-RETRAIT-FRAIS` (nouveau) | 1 %, 100 F au moins, sur l'argent rechargé seulement (jamais sur un remboursement) | — |
| `WALLET-RECHARGE-ATTENTE` (nouveau) | 72 h | — |
| `WALLET-NUMERO-ATTENTE` (nouveau) | 48 h | — |
| `REMB-MOMO-H` | 1 h vers Mobile Money tant que FF-WALLET est fermé ; ensuite immédiat, au portefeuille | à fixer · prototype : 1 h |

**À préciser** : Valider les douze règles et leurs valeurs ; faire vérifier la conformité par un juriste (CWL-12).

## DP-17 — Portefeuille fermé jusqu'à validation (décidée, 2026-10-03)

> on ne commence pas avec le wallet on vas faire valider avant de reelment metre l'ouvrire au public developre tous et je vais geler manuelement jusqu'a ce que ce sois

**Décision** : Le portefeuille (DP-06, DP-16) est entièrement développé mais fermé au lancement par l'interrupteur FF-WALLET, que le porteur ouvrira à la main après validation (CWL-12). Tant qu'il est fermé : aucune page, entrée de Menu, bouton ni texte ne le mentionne (CCH-18) ; tout remboursement va vers le moyen de paiement d'origine, comme le disent les documents (CCH-01, CCY-21, CL-11).

**Règles touchées** : CCH-17, CCH-18, CCH-01, CCY-21, CPY-51, CLT-15, CLT-25, CLT-59, CRO-10, CRO-19, CCO-16, CCO-25

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `FF-WALLET` (nouveau) | fermé (ouvert à la main par le porteur après validation juridique) | — |
| `REMB-DESTINATION` | moyen de paiement d'origine tant que FF-WALLET est fermé ; ensuite le portefeuille (carte depuis l'étranger : la même carte) | — |

## DP-18 — Remise au relais par colis (décidée, 2026-10-03)

> 1a jamais a perte

**Décision** : La remise au point relais (LIV-REM-RELAIS, 400 F) est facturée par colis, pas une fois par commande : Rem = 400 F × nombre de colis. La livraison offerte (dès 30 000 F) couvre toujours un ramassage plein tarif et la remise d'un seul colis S (Off = R + 400 F = 900 F). Ainsi la rémunération du relais par colis est toujours couverte (CFR-24 : jamais à perte).

**Règles touchées** : CFR-05, CFR-06, CFR-07, CFR-13, CFR-24, CPN-23, CAL-01, CAL-06 · **Références** : CL-D08.A04, CL-D08.A10, CL-D08.Q02, CL-D08.Q06

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `LIV-REM-RELAIS` | 400 F par colis | 400 F |

**À reporter dans les documents** : Les exemples des documents changent : panier de référence (3 colis) = 271 699 + 1 380 + 1 200 − 900 = 273 379 F au lieu de 272 579 F ; les 10 cas du tableau des états de CL-07 et les montants qui en découlent (CL-08, CL-09, CL-10, CL-16) sont à recalculer avant de servir de tests.

## DP-19 — Remise à domicile par colis (décidée, 2026-10-03)

> 2 par colis jamais a perte

**Décision** : Pour un panier de plusieurs boutiques livré à domicile, la remise à domicile (LIV-REM-DOM, 1 000 F) est due par colis ; la livraison offerte (dès 50 000 F) couvre un ramassage et la remise d'un seul colis.

**Règles touchées** : CFR-20, CFR-05, CAL-01 · **Références** : CL-D08.A05, CL-D08.Q03, CL-D17.A99, CL-D17.A106

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `LIV-REM-DOM` | 1 000 F par colis | 1 000 F |

## DP-20 — Aucun refus de colis par un relais (décidée, 2026-10-03)

> non le retreis n'est pas senser refuser le colis tous est penser pour que le colis puisse enttrer dans le retrais en question donc pas de refus autoriser

**Décision** : Un point relais ne refuse jamais un colis S, M ou L : le réseau est dimensionné pour que tout colis qui va en relais y entre. La règle CAP-07 du relais (refus des colis L) n'est pas retenue ; seuls XL et hors gabarit vont à domicile (LIV-XL-RELAIS).

**Règles touchées** : CFP-25, CPN-52, CPR-20 · **Références** : CL-D07.A05, CL-D07.A18, CL-D07.Q04, CL-D07.Q12, CL-D08.A11, CL-D08.Q07, CL-D17.A56

**À reporter dans les documents** : Paquet Point relais : retirer le refus des colis L (CAP-07).

## DP-21 — Maintien du palier vendeur (décidée, 2026-10-03)

> tu propose quoi pour nous le meilleur d;apres toi je le valide

**Décision** : Proposition de Claude, validée d'avance par le porteur : on suit la console (ADM-TSC-03). Un vendeur perd son palier quand son Trust Score reste sous le seuil 14 jours de suite (pas 6 mois). Raison : les paliers Or et Platine donnent une libération de l'argent à 1 jour (LIB-OR) ; les garder 6 mois après une baisse ferait courir un risque aux clients et à l'escrow, et la console est la source du Trust Score.

**Règles touchées** : CAL-30 · **Références** : CL-D07.Q03

**À reporter dans les documents** : CL-06 (« Platine 90 tenu 6 mois ») : remplacer par l'hystérésis de 14 jours de la console.

## DP-22 — Vocabulaire des trois espaces (décidée, 2026-10-03)

> on y vas sur ta proposition

**Décision** : Chaque espace garde ses mots : le client lit « acheteur vérifié » et « Escrow » seulement là où la spécification l'écrit (CCH-29, CFP-03, CLA-03) ; les espaces vendeur et relais gardent les leurs. Le lexique de CL-16 fait la correspondance ; aucun texte ne change.

**Règles touchées** : CCH-28, CCH-29, CTV-30 · **Références** : CL-D07.A11, CL-D07.Q08, CL-D09.A17, CL-D09.Q09, CL-D17.A72, CL-D17.A43

## DP-23 — Carte ouverte aux clients locaux (décidée, 2026-10-03)

> 1 oui

**Décision** : La carte Visa ou Mastercard est proposée à tous les clients, pas seulement au payeur à l'étranger. Mêmes règles : frais de service PAY-CARTE-FRAIS (2 %) affichés avant, 3-D Secure, PAY-CARTE-MAX (150 000 F) par paiement, libération du vendeur LIB-CARTE (14 j), remboursement sur la même carte, jamais pour une commande au comptoir (CPY-49).

**Règles touchées** : CPY-08, CPY-45, CCH-07, CET-11, CCO-17 · **Références** : CL-D09.A05, CL-D09.Q03, CL-D09.Q06, CL-D13.A24, CL-D13.Q06, CL-D14.A11, CL-D14.Q03

## DP-24 — Garde après un refus au comptoir (décidée, 2026-10-03)

> 2a

**Décision** : Quand un client refuse de payer au comptoir, la garde due est retenue sur la livraison qu'il a payée d'avance (CCP-06 : la livraison n'est pas remboursée). La retenue ne dépasse jamais la livraison payée : le surplus éventuel n'est pas réclamé au client. La même règle vaut pour une commande « Validée » non retirée : la retenue (garde + renvoi) ne dépasse jamais ce qui a été payé (CGA-23).

**Règles touchées** : CCP-06, CCP-11, CGA-23 · **Références** : CL-D09.A20, CL-D09.Q10, CL-D11.A30, CL-D11.Q10, CL-D17.A101

## DP-25 — Remise au relais d'un colis L (décidée, 2026-10-03)

> 1 ok

**Décision** : Remise au point relais : 400 F par colis S ou M, 600 F par colis L, pour que la course reste couverte après la part du relais (RELAIS-GAIN-COLIS 200 / 250 / 400 F ; CFR-24 : jamais à perte). La livraison offerte couvre toujours la remise d'un seul colis S (400 F).

**Règles touchées** : CFR-05, CFR-24, CAL-01 · **Références** : CL-D10.A45, CL-D10.Q18

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `LIV-REM-RELAIS` | 400 F par colis S ou M, 600 F par colis L | 400 F |

## DP-26 — Code bloqué après 3 codes faux (décidée, 2026-10-03)

> 2 ok

**Décision** : On garde CCD-12 : après 3 codes faux, le code est bloqué 24 h, le client est prévenu et demande lui-même un nouveau code dans l'application ; pas de passage obligé par le support.

**Règles touchées** : CCD-12, CAL-18 · **Références** : CL-D10.A24, CL-D10.A38, CL-D10.Q09, CL-D10.Q17, CL-D17.A34, CL-D17.Q01

**À reporter dans les documents** : Paquet Point relais : CAL-31 (« seul le support débloque ») à aligner.

## DP-27 — Vice caché après « Tout est en ordre » (décidée, 2026-10-03)

> 3 ok

**Décision** : Un vice caché reste couvert 100 jours après le retrait, même après « Tout est en ordre » (CCM-14) ; il se signale par l'assistant de litige, avec photos.

**Règles touchées** : CCM-14, CAL-28, CLT-09, CLT-22, CRO-16, CRO-17, CRO-28 · **Références** : CL-D10.A40, CL-D10.A51, CL-D10.Q15, CL-D10.Q21, CL-D12.A07

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `RET-VICE` | 100 jours après le retrait | 100 jours |

**À reporter dans les documents** : Spécification v3 §12.6 (« non ») et paquet Point relais (48 h) à aligner.

## DP-28 — « Tout est en ordre » par le client seulement (décidée, 2026-10-03)

> 4 oui

**Décision** : Seule l'application du client enregistre « Tout est en ordre » (CCM-19) : l'écran du gérant invite le client, il ne confirme jamais à sa place.

**Règles touchées** : CCM-19 · **Références** : CL-D10.A39, CL-D10.A56, CL-D10.Q16

**À reporter dans les documents** : Paquet Point relais : RET-14 à aligner.

## DP-29 — Biométrie et garde au jour entier (décidée, 2026-10-03)

> 5 oui

**Décision** : CODE-BIO confirmé à 50 000 F (biométrie avant d'afficher le code d'une commande de ce montant ou plus) ; GARDE-PRORATA : la garde se compte par jour entier.

**Règles touchées** : CCH-09, CAL-18, CCD-04 · **Références** : CL-D10.A25, CL-D10.A42, CL-D10.A50, CL-D10.Q07, CL-D10.Q10, CL-D10.Q20, CL-D02.Q20, CL-D11.A31, CL-D17.Q15

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `CODE-BIO` | 50 000 F | 50 000 F · à confirmer avant la production (19.4) |
| `GARDE-PRORATA` | jour entier | jour entier · à confirmer avant la production (19.4) |

## DP-30 — Fond de plan (décidée, 2026-10-03)

> 6 google map

**Décision** : Le plan indicatif (maison, relais, trajet à pied) utilise Google Maps, avec la mention d'attribution de Google visible. CMC-49 reste : jamais la position du livreur, ni la boutique, ni une route en direct.

**Règles touchées** : CMC-49, CSU-08, CSU-12 · **Références** : CL-D10.A05

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `CARTE-FOND` (nouveau) | Google Maps (attribution visible) | — |

**À préciser** : L'API Google Maps est payante au-delà du crédit mensuel gratuit : prévoir une clé limitée au domaine et un plafond de dépense.

## DP-31 — Mode SMS économique (décidée, 2026-10-03)

> 2 ok

**Décision** : Sous 10 000 F de panier, seuls les SMS essentiels partent (C3 code de retrait, C4 incident) ; les autres messages restent en notification gratuite.

**Règles touchées** : CSM-14 · **Références** : CL-D11.A23, CL-D11.Q07

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `SMS-ECO` | 10 000 F de panier | à fixer · prototype : BLV-52018 au-dessus du seuil |

**À préciser** : Avec CSM-30, un rappel non délivré annule les frais de garde de la période : sous 10 000 F, si le client n'ouvre pas la notification S1 ou S2, la garde de ces jours peut être perdue. C'est le prix de l'économie de SMS sur les petits paniers.

## DP-32 — Dissociation d'une commande (décidée, 2026-10-03)

> 3 ok

**Décision** : Les documents ne définissent pas la dissociation. Sens retenu avec le porteur : quand un colis d'un groupe de remise a 24 h de retard sur les autres, le groupe est dissocié ; les colis arrivés deviennent retirables sans l'attendre (nouveau code pour eux, message C4 au client).

**Règles touchées** : CSM-08, CCY-15 · **Références** : CL-D11.A37

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `MSG-DISSOC` | 24 h de retard d'un colis sur les autres colis du groupe | à fixer |

## DP-33 — Conservation des notifications (décidée, 2026-10-03)

> 4 ok

**Décision** : Les notifications restent 12 mois dans le centre, puis sont purgées automatiquement.

**Règles touchées** : CNT-01 · **Références** : CL-D04.Q16

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `NOT-CONSERV` | 12 mois | 12 mois |

**À préciser** : À faire valider par le juriste avec le portefeuille (CWL-12).

## DP-34 — Validation des textes des messages (décidée, 2026-10-03)

> 5 oui · ok continue avec CL-11

**Décision** : Les textes des notifications et des SMS de CL-10 sont validés par le porteur, avec les rappels S0, S1 et S2 recalculés sur la grille en vigueur et la phrase de C2 et C3 gardée (logique-metier/textes-messages.md). En production, le serveur remplace les données de démonstration par les vraies valeurs (CDA-28).

**Règles touchées** : CCH-37, CNT-32, CSM-01 · **Références** : CL-D11.A42

## DP-35 — Litiges et retours (CL-11) (décidée, 2026-10-03)

> ok pour tout, continue avec CL-12

**Décision** : Propositions de Claude acceptées par le porteur : BelivaY tranche un litige au plus 24 h après l'échéance du vendeur ; un recours du client, une fois, sous 48 h, examiné par une autre personne, l'argent restant bloqué ; 5 jours pour répondre à un arrangement, sans réponse le dossier revient en examen ; la livraison du colis est remboursée aussi quand le vendeur ou le transporteur est en tort, à sa charge ; un montant partiel est calculé par le serveur (prix des articles concernés, ou arrangement accepté) ; trajet retour 500 F à la charge de la partie en tort ; un défaut caché découvert entre 48 h et 7 jours est un litige normal ; pas de retour sans motif au lancement (à réévaluer) ; une note de 2 étoiles ou moins propose un litige ; remboursement Mobile Money sous 1 h ; brouillon de litige gardé 24 h ; seuils de l'IFA calibrés après 3 mois de données, sans décision automatique d'ici là.

**Règles touchées** : CLT-39, CLT-47, CLT-51, CLT-60, CLT-61, CRO-22, CRO-25, CRO-14, CLT-28, CIF-11, CIF-16, CIF-17, CRP-08, CLA-04, CAV-13 · **Références** : CL-D12.A06, CL-D12.A09, CL-D12.A15, CL-D12.A22, CL-D12.A23, CL-D12.A29, CL-D12.A30, CL-D12.A31, CL-D12.A34, CL-D12.A36, CL-D12.A43, CL-D12.A55, CL-D12.Q02, CL-D12.Q03, CL-D12.Q05, CL-D12.Q07, CL-D12.Q08, CL-D12.Q10, CL-D12.Q11, CL-D12.Q12, CL-D12.Q13, CL-D12.Q15, CL-D12.Q17, CL-D17.A100, CL-D17.A49, CL-D17.A51, CL-D17.A88, CL-D17.Q13, CL-D17.Q18, CL-D17.Q28, CL-D17.Q41

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `LIT-DECISION-H` | 24 h après l'échéance du vendeur | à fixer · prototype : 24 h |
| `RET-TRAJET` | 500 F, à la charge de la partie en tort | à fixer · prototype : 500 F (valeur du relais et du vendeur) |
| `AVIS-BAS` | 2 étoiles ou moins | 2 étoiles · à confirmer avant la production (19.4) |
| `REMB-MOMO-H` | 1 h vers Mobile Money tant que FF-WALLET est fermé ; ensuite immédiat, au portefeuille | à fixer · prototype : 1 h |
| `IFA-NABS` | calibré après 3 mois de données réelles ; aucune décision automatique avant | à calibrer |
| `IFA-NAUTO` | calibré après 3 mois de données réelles ; aucune décision automatique avant | à calibrer |
| `IFA-FREQ-ELEVE` | calibré après 3 mois de données réelles ; aucune décision automatique avant | à calibrer |
| `LIT-RECOURS-H` (nouveau) | un recours, sous 48 h après la décision | — |
| `LIT-ARRANG-REPONSE-J` (nouveau) | 5 jours ; sans réponse, le dossier revient en examen | — |
| `LIT-BROUILLON-H` (nouveau) | 24 h | — |

**À préciser** : « Sous 1 h » (REMB-MOMO-H) n'est affichable que si CamPay garantit un versement aussi rapide : à vérifier avec CamPay avant la production (CCH-06 : jamais un chiffre faux).

**À reporter dans les documents** : Paquets Point relais et Espace vendeur : le délai d'arrangement sans réponse ne clôt plus en faveur du vendeur ; recours ajouté à la v3 (§11).

## DP-36 — Pas de SMS après une annulation faite par le client (décidée, 2026-10-03)

> ok pour les deux

**Décision** : Quand le client annule lui-même une boutique dans l'application, la confirmation part en notification seulement, sans SMS. Le SMS C4 reste réservé aux incidents et aux annulations par le vendeur ou BelivaY (CSM-08). Remplace le « SMS C4 (variante annulation) » de CAN-16 pour ce cas.

**Règles touchées** : CAN-16, CSM-08 · **Références** : CL-D13.A05, CL-D13.Q02

## DP-37 — Prix du transfert entre relais (décidée, 2026-10-03)

> ok pour les deux

**Décision** : Le transfert d'un colis arrivé vers un autre relais coûte le prix de la remise au relais de ce colis : 400 F pour un colis S ou M, 600 F pour un colis L (DP-25).

**Règles touchées** : CRL-09, CRL-14, CAL-25 · **Références** : CL-D17.A54

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `TRANSFERT-RELAIS` | 400 F par colis S ou M, 600 F par colis L | 400 F |

## DP-38 — Domaine (décidée, 2026-10-03)

> ok belivay.com

**Décision** : Un seul domaine partout : belivay.com (site, liens courts, contact, pages légales).

**Règles touchées** : CAP-11, CSM-18 · **Références** : CL-D14.A42, CL-D14.Q09, CL-D16.A05, CL-D16.A19, CL-D16.Q01, CL-D16.Q14, CL-D17.A92, CL-D17.A121, CL-D17.Q23, CL-D17.Q40

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `DOMAINE` (nouveau) | belivay.com | — |

## DP-39 — Réponse du gérant à un avis (décidée, 2026-10-03)

> oui pour le gérant

**Décision** : Le gérant d'un relais peut répondre en privé à l'avis qu'il a reçu (règle du relais AVI-05) : la réponse arrive dans la messagerie du client (fil « Relais … · réponse à ton avis »), jamais publiée ; coordonnées masquées (CSV-12).

**Règles touchées** : CAV-22, CSV-12 · **Références** : CL-D14.A49, CL-D17.A67

## DP-40 — Structure légale et numéro WhatsApp (à préciser, 2026-10-03)

> le numero de telephone seras fournis ulterieurement · la structure legal a deja ete creer on a deja ceer l'entreprise

**Décision** : L'entreprise BelivaY est déjà créée : les mentions légales (raison sociale, RCCM, NIU, siège, directeur de la publication, hébergeur) seront remplies avec ses informations. Le numéro WhatsApp Business du support (SUP-WA) sera fourni plus tard.

**Règles touchées** : CLG-06, CSV-03 · **Références** : CL-D14.A39, CL-D14.Q12

**À préciser** : Fournir RCCM, NIU, siège, directeur de la publication, hébergeur, et le numéro SUP-WA ; faire rédiger les huit textes légaux et la mention du vendeur sur la facture.

## DP-41 — Modules d'après le lancement (CL-14) (décidée, 2026-10-03)

> ok pour tout, continue avec CL-15

**Décision** : Propositions acceptées : un abonnement en cours reste honoré jusqu'à son terme si le module est refermé ; les prix des abonnements (ABO-*) sont un point de départ, fixés à l'ouverture avec le panier moyen et la fréquence réels (CFS-08) ; un lien de liste d'envies vaut 30 jours ; la garde d'un cadeau non retiré est retenue sur le remboursement du payeur ; le budget des ventes flash (FLASH-BUDGET) sera fixé par le porteur avant d'ouvrir les ventes flash.

**Règles touchées** : CFS-07, CAB-01, CLE-24, CLE-44, CVF-06 · **Références** : CL-D15.A05, CL-D15.Q01, CL-D15.A12, CL-D15.A17, CL-D15.A24, CL-D15.Q03, CL-D15.A33, CL-D15.Q10, CL-D15.A41, CL-D15.Q12

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `LST-VALIDITE` | 30 jours | 7, 30 ou 90 jours (défaut à trancher) · prototype : 30 jours |
| `ABO-FERMETURE` (nouveau) | abonnements en cours honorés jusqu'à leur terme | — |

**À préciser** : FLASH-BUDGET à fixer avant d'ouvrir FF-FLASH ; IA-COUT-MAX après 60 jours de mesure.

## DP-42 — Valeurs du lancement restantes (CL-16) (décidée, 2026-10-03)

> ok pour tout, lance l'étape 4

**Décision** : Propositions acceptées : double validation de l'escrow par Finance et Direction, deux personnes différentes ; liste des produits interdits rédigée par Claude, à valider par le juriste (produits-interdits.md) ; score de zone sur 100 (délais tenus 40, remplissage 30, litiges 20, couverture 10), alerte sous 60 ou sous 5 colis par tournée en moyenne sur 7 jours, recalibré après 3 mois ; fraude : alertes seulement au début, seuils calibrés après 3 mois, jamais d'action automatique ; budget SMS du jour fixé après 2 semaines de trafic réel ; deux colis non retirés ne rendent pas le paiement d'avance automatique (compté dans l'IFA, décision humaine) ; relais fermé plusieurs jours : le client choisit un autre relais gratuitement, sans réponse sous 24 h transfert automatique au relais ouvert le plus proche (nouveau code, garde au jour 1) ; le score du relais n'est pas affiché au client.

**Règles touchées** : CCN-11, CCN-16, CCN-19, CTV-31, CIF-08, CIF-27, CLI-02 · **Références** : CL-D17.A13, CL-D17.A16, CL-D17.A18, CL-D17.A32, CL-D17.A36, CL-D17.A41, CL-D17.Q06, CL-D17.Q16, CL-D17.Q37

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `ESCROW-VALIDEURS` | Finance + Direction, deux personnes différentes | à désigner |
| `ZONE-SCORE` | sur 100 : délais tenus 40, remplissage 30, litiges 20, couverture vendeurs et relais 10 ; recalibré après 3 mois | à définir |
| `ZONE-REMPLISSAGE` | objectif 8 colis par tournée ; alerte sous 5 colis en moyenne sur 7 jours | objectif 8 colis par tournée ; seuil d’alerte à fixer |
| `ZONE-ALERTE` | score sous 60, ou remplissage sous le seuil, sur 7 jours glissants | à fixer |
| `FRAUDE-SEUILS` | alertes seulement au lancement (ex. 80 % des litiges d'un relais sur 3 clients) ; calibrés après 3 mois ; jamais d'action automatique | à calibrer (exemples : 80 % sur 3 clients d’un relais ; 61 % de retraits par un tiers contre 18 %) |
| `SMS-BUDGET-JOUR` | fixé après 2 semaines de trafic réel | à fixer |
| `CAT-INTERDITS` | liste de produits-interdits.md, à valider par le juriste | à publier avant le lancement |
| `RELAIS-FERME-TRANSFERT-H` (nouveau) | 24 h sans réponse du client : transfert automatique au relais ouvert le plus proche | — |

**À préciser** : Liste des produits interdits à valider par le juriste ; SMS-BUDGET-JOUR à fixer après mesure.

## DP-43 — Le site reprend le prototype du 1er octobre, au pixel près (décidée, 2026-10-03)

> je veut que toutes pages sois extement comme la version BelivaY_Espace_Client_mobile au millimetre pret. l'ile seras utiliser pour l'application donc n;y touche pas trop […] le reste doit etre identique toutes les page les section les detail aussi fin sois t'il

**Décision** : La référence visuelle du site est le prototype complet du 1er octobre (BelivaY_Espace_Client_mobile.html), pas la version simple du 30 septembre : chaque page, chaque section et chaque détail lui sont identiques, vérifiés par comparaison au pixel (site/tests/identique.spec.ts). L'île BelivaY (Dynamic Island animée) est réservée à l'application mobile et n'est pas dans le site. Les écarts où la spécification l'emporte sont fixés par DP-44.

**Règles touchées** : CDS-01, CDS-13, CRD-01, CNV-06

## DP-44 — Écarts entre le prototype et la spécification (décidée, 2026-10-03)

> 1 à 6 applique la spec, 7 ok, passe à l'étape 5

**Décision** : La spécification l'emporte sur le prototype pour six points : (1) la planche de composants revient à l'accueil, jamais au Menu (CNV-10) ; (2) les boutons pleins et les pastilles en braise passent au dégradé #C9500E → #B0430A (CDS-11, contraste 4,5 : 1, CRD-08) ; (3) aucun texte sous 12 px (CRD-07) : tout texte plus petit passe à 12 px ; (4) le bouton retour et l'avatar gardent 40 px visibles avec une zone de toucher de 44 px (CRD-06) ; (5) aucun anglicisme dans l'interface française (CCH-30) : « Flash Deals » devient « Ventes flash », « Wallet » devient « Portefeuille », l'étiquette « CURATED » est retirée et « SPONSO » aussi (DP-14 : aucun « Sponsorisé » côté client) ; (6) le pidgin n'est plus cité dans les réglages (DP-13). (7) Le nombre de quartiers du bandeau reste lu dans les données (CAC-34) : 12 dans la démonstration, le nombre de zones exploitées en production (DP-09).

**Règles touchées** : CNV-10, CDS-11, CRD-08, CRD-07, CRD-06, CCH-30, CRG-01, CAC-34

## DP-45 — Serveur : moteurs purs, puis intégration au serveur existant (décidée, 2026-10-03)

> Moteurs purs ici, puis intégration ; site client à part pour l'instant ; « rassure toi que tu utilise le bon language de programation »

**Décision** : Le serveur de BelivaY existe déjà (Felix-TANZI/relaya-marketplace, Django, en production sur belivay.com). Les calculs de la spécification sont écrits dans PG-BelivaY en Python pur (moteurs/), sans Django ni base de données, aux conventions du domaine financier existant (francs entiers, Decimal, float interdit, arrondi moitié vers le haut, trace), testés avec pytest sous Python 3.11 et 3.12 (intégration continue et production de relaya-marketplace), puis intégrés par l'équipe de relaya-marketplace. Le site client (site/) reste dans PG-BelivaY, identique au prototype, et parlera à l'API existante ; son entrée dans le frontend existant (Tailwind, i18next) sera décidée plus tard.

**Règles touchées** : CCH-15

## DP-46 — Classe d'un colis et distance du supplément XL (décidée, 2026-10-03)

> 1 oui 2 oui boutique → domicile

**Décision** : H1 confirmée : une boutique du panier fait un colis (CCY-15), dont la classe est la plus grande classe de ses articles (S < M < L < XL < hors gabarit). H2 confirmée : le supplément XL (LIV-SUPPL-XL) se calcule sur la distance de la boutique au domicile du client.

**Règles touchées** : CCY-15, CAL-09

## DP-47 — Le prototype complet, seule référence ; les décisions priment sur ses montants (décidée, 2026-10-03)

> rassure toi que tu utilise les logique de BelivaY_Espace_Client_mobile j'ai suprimer les deux autre voici la seul reference maintenant […] a apert l'ile […] tous e reste doit y etre present sans exception ; puis : « Mes décisions »

**Décision** : BelivaY_Espace_Client_mobile.html (1er octobre) est la seule référence ; la version simple est retirée de la branche (elle reste dans l'historique). Tout ce que le prototype contient est repris, sauf l'île (réservée à l'application) : règles, écrans, et ses décisions propres : paiement depuis l'étranger en euros (parité fixe 655,957 F) ou en dollars US (taux du jour du prestataire, figé au paiement, au centime), Apple Pay et Google Pay aux règles de la carte, devenir vendeur sans pièce (produits invisibles tant que la pièce n'est pas validée), connexion du 30 septembre. Là où une décision du porteur a changé une valeur après le prototype, la décision prime : DP-07 (suppléments), DP-08 (garde), DP-16 (plafond du portefeuille 2 500 000 F au lieu de 500 000 F), DP-18, DP-19, DP-25 (remises par colis), DP-37 (transfert par colis) ; les écrans montreront les montants recalculés.

**Règles touchées** : CDS-01, CCH-15, CAL-26

## DP-48 — Neuf points de calcul que la spécification ne fixait pas (moteurs de l'étape 5) (décidée, 2026-10-03)

> Réponses aux questions de l'étape 5 : les neuf options recommandées

**Décision** : 1. Annulation d'une boutique : son supplément de classe (XL à domicile) est rendu avec la différence de frais, bien que CAN-11 écrive F = Ram + Rem − Off. 2. Refus au comptoir (DP-24) : seule la garde due est retenue sur l'avance, jamais au-delà ; le trajet de renvoi n'est pas ajouté. 3. Commande au comptoir dont la livraison est offerte : avance de 0 F, tout se règle au retrait. 4. Renvoi au vendeur dont la retenue (garde + renvoi) dépasse le payé : le trajet de renvoi est couvert d'abord, la garde ensuite. 5. Rappel de garde non délivré (CSM-30) : aucun frais du jour du rappel manqué jusqu'au rappel suivant bien délivré (non compris), ou jusqu'au renvoi. 6. SMS-ECO (CSM-14) : le montant comparé au seuil est le sous-total S. 7. Portefeuille : un paiement prend d'abord l'argent rechargé (le plus ancien d'abord), un retrait d'abord l'argent remboursé. 8. Frais de service carte d'une annulation partielle (CET-24) : la part d'une boutique est 2 % du montant remboursé, la dernière boutique prend le reste ; rendue si le vendeur ou BelivaY annule, acquise si le bénéficiaire annule. 9. Dissociation (DP-32) : le délai de 24 h part du premier colis arrivé ; un colis devenu retirable le reste.

**Règles touchées** : CAN-11, CAN-12, CCP-06, CGA-23, CSM-30, CSM-14, CET-24 · **Références** : DP-24, DP-32, CWL-04 (règle ajoutée, regles-ajoutees.json)

## DP-49 — Fond de plan : OpenStreetMap à la place de Google Maps (décidée, 2026-10-03)

> ok continue avec open street map et tous le reste des truc dont tu a besoin

**Décision** : Le fond de plan est OpenStreetMap, comme dans relaya-marketplace : il remplace Google Maps (DP-30, sur ce point seulement). Tuiles OpenStreetMap avec la mention « © OpenStreetMap contributors » visible ; recherche d'un quartier ou d'un repère par Nominatim ; temps de trajet (« 350 m · 6 min à pied ») par un calcul d'itinéraire sur les données OpenStreetMap (OSRM, profil piéton). En production, les règles d'usage d'OpenStreetMap s'appliquent : pas de charge lourde sur tile.openstreetmap.org ni sur nominatim.openstreetmap.org, donc un serveur propre ou un fournisseur de tuiles et de géocodage OpenStreetMap. Inchangé : CMC-49 (jamais la position du livreur, ni la boutique, ni une route en direct) ; les distances affichées restent géodésiques (CAL-04, CDA-05), calculées sur l'ellipsoïde WGS 84, celui d'OpenStreetMap et de PostGIS.

**Règles touchées** : CMC-49, CAL-04, CDA-05, CPR-04, CPR-11, CPR-13, CPR-22, CRL-03 · **Références** : DP-30, DP-46

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `CARTE-FOND` | OpenStreetMap (attribution « © OpenStreetMap contributors » visible) | — |

## DP-50 — Tout le prototype visible sur le site, portefeuille et modules d'après le lancement compris (décidée, 2026-10-03)

> METS TOUS CE QU'IL RESTE LE WALLET ET TOUS LES PAGES PREVUE APRES LE LANCEMENT / je veut tous voir ce qu'il ya sur le prototype html sur le site reeel je veut tous voire sans exception

**Décision** : Tous les écrans du prototype sont construits et visibles sur le site : le portefeuille (FF-WALLET), l'abonnement, les listes d'envies, les ventes flash, l'assistant (CL-14) et les six extensions (CL-15). Tous les interrupteurs sont ouverts. Le mécanisme reste en place : un module se referme en remettant son interrupteur à « fermé », sans toucher aux écrans (CCH-18, CFS-02). Seule l'île reste hors du site, réservée à l'application (décision du 1er octobre). Rappel : DP-17 prévoyait l'ouverture du portefeuille après validation juridique ; avec FF-WALLET ouvert, les remboursements vont au portefeuille (REMB-DESTINATION).

**Règles touchées** : CCH-18, CFS-02, CTV-34 · **Références** : DP-17, DP-43

| Paramètre | Valeur décidée | Valeur du registre |
|---|---|---|
| `FF-ABONNEMENT` | ouvert (DP-50 : tout le prototype visible sur le site) | fermé |
| `FF-LISTE-ENVIES` | ouvert (DP-50 : tout le prototype visible sur le site) | fermé |
| `FF-FLASH` | ouvert (DP-50 : tout le prototype visible sur le site) | fermé |
| `FF-IA` | ouvert (DP-50 : tout le prototype visible sur le site) | fermé |
| `FF-EX01 … FF-EX06` | ouvert (DP-50 : tout le prototype visible sur le site) | fermé |
| `FF-WHATSAPP-CANAL` | ouvert (DP-50 : tout le prototype visible sur le site) | fermé (« bientôt ») |
| `FF-EX01` | ouvert (DP-50 : tout le prototype visible sur le site) | fermé |
| `FF-EX02` | ouvert (DP-50 : tout le prototype visible sur le site) | fermé |
| `FF-EX03` | ouvert (DP-50 : tout le prototype visible sur le site) | fermé |
| `FF-EX04` | ouvert (DP-50 : tout le prototype visible sur le site) | fermé |
| `FF-EX05` | ouvert (DP-50 : tout le prototype visible sur le site) | fermé |
| `FF-EX06` | ouvert (DP-50 : tout le prototype visible sur le site) | fermé |
| `FF-WALLET` | ouvert (DP-50 : tout le prototype visible sur le site) | — |

## DP-51 — Barre d'onglets visible sous le panier ouvert (annulée, 2026-10-03)

> corrige la pages pagner et la collone du bas quand panier est ouvert (réponse : barre d'onglets absente) ; puis : reverse la page pagnier

**Décision** : Quand le panier est ouvert, la barre d'onglets du bas reste affichée, onglet Panier allumé, son badge comptant les articles du panier ; la barre « Passer commande » se pose juste au-dessus d'elle. Le prototype masquait la barre d'onglets sur le panier ; le panier vide la montrait déjà. Annulée le même jour par le porteur (« reverse la page pagnier ») : le panier ouvert reste comme le prototype, sans barre d'onglets.

**Règles touchées** : CNV-01, CNV-07 · **Références** : DP-47

## DP-52 — Compte logique : solde masqué sur place, profil modifiable avec un code (décidée, 2026-10-03)

> la page compte doit etre logique wallet avec bouton flouteur de montant directement visible pas avoir a passer sur la page wallet en elle meme avent de pouvoir le faire / editer le profilts avec code de verification tous doit etr logique et les page apres ca doivent etre monter aussi on doit pouvoir ajouter la photo de profilts et toutes autre information necessaire

**Décision** : L'œil de la carte du portefeuille masque le solde sur place (compte, menu, portefeuille), choix gardé sur l'appareil. Le profil se modifie depuis le crayon du compte : photo (prendre, choisir, retirer), prénom (obligatoire), nom ; enregistré après un code par SMS au numéro vérifié. L'e-mail change avec deux codes (SMS, puis nouvelle adresse), comme le numéro (CIN-39). Codes : 6 chiffres, 10 minutes, 5 essais puis 15 minutes, renvoi après 60 s (CIN-33, CIN-34). Le nom et la photo changent partout aussitôt. Remplace, pour le profil et l'e-mail, « ni formulaire de profil ; l'e-mail ne se modifie pas dans le compte » (CCO-01) et « son crayon ouvre Changer de numéro » (CIN-46).

**Règles touchées** : CCO-01, CIN-46, CIN-33, CIN-34, CIN-39 · **Références** : DP-50

## DP-53 — Toutes les pages logiques et complètes : ajouter, déplacer, modifier, sans rien supprimer (décidée, 2026-10-03)

> toutes les pages doivent etre logique refais celle qui ne le sont pas, nenero et connexion et toutes les autres, ameliore profondement avec tous les paraetre que c'est senser aoire, analyse toute les pages une a une et tu mon autorisation pour ajouter les fonctionnaliter en dehors de acceuil (…) ajoute deplace modifie mais ne supprime pas, un check pour toutes les pages une à une en commençant avec les pages de mon compte

**Décision** : Chaque page, sauf l'accueil, doit fonctionner pour de vrai : champs saisissables et vérifiés, codes contrôlés par la source, montants et compteurs qui suivent les gestes, actions qui mènent au bon résultat selon ce qui est saisi, paramètres de la spécification appliqués. Claude peut ajouter, déplacer et modifier les fonctions et éléments d'une page sans demander, jamais supprimer un élément du prototype. Ordre : pages du compte d'abord, puis les autres, une à une, chacune vérifiée. Le prototype reste la référence d'apparence : un état qu'un ajout change est écarté de la comparaison au pixel avec sa raison.

**Règles touchées** :  · **Références** : DP-50, DP-52


### DP-54 — Le prototype n'est plus la référence (4 oct. 2026)

**Mots du porteur** : « on ne se base plus sur le prototype on a déjà dépassé ça. on est maintenant seul avec nos modifications et mises à jour » ; « fait le avec OpenStreetMap ».

**Décision** : Le prototype du 1er octobre a donné le squelette ; il n'est plus la référence. Chaque page est organisée et complétée pour l'usage réel (vraies saisies, vraies issues, tout ce dont elle a besoin), sans chercher l'identité au pixel. La comparaison au prototype (DP-43) ne vaut plus que pour les écrans pas encore repris ; un écran repris en sort. Les cartes et la position utilisent OpenStreetMap (DP-49) et le GPS du téléphone.

**Règles touchées** : DP-43, DP-53
