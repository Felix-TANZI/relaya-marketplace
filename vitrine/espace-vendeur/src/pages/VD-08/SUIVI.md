# VD-08 — Produits et nouvelle offre : suivi des 12 sous-tâches

Branche `vendeur/VD-08`. Domaines possédés : `produits`, `offres` (types `src/donnees/domaines/{produits,offres}.ts`,
démonstration `src/demo/{produits,offres}.ts` : un seul magasin d'offres, brouillons compris). Tests :
`tests/VD-08.gestes.spec.ts` (27 gestes avec VD-04, tous verts), squelette filtré sur les 10 routes (clair FR 360/430,
sombre EN 390) vert, `tests/boutons.spec.ts` sur les 10 routes (et leurs états du prototype) vert.

Sous-tâches (METHODE.md §3) : 1 balisage du prototype et t() · 2 source démo, montants par src/calculs · 3 règles du
registre, états vide / chargement / erreur / hors connexion · 4 vraies saisies et issues, aucun bouton mort · 5 ajouts ·
6 rôle Préparation, anonymat · 7 liens vers les autres interfaces · 8 animations et sons · 9 photos réelles et
remplaçables · 10 clair / sombre, FR / EN, 360–430 px, défauts du prototype · 11 test de gestes, test boutons, statut
« repris » · 12 vérification.

| Écran | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Mes produits (`produits`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Une offre (`offre_detail`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Étape 1 : le produit (`offre1`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Demander une fiche (`fiche`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Étape 2 : photos réelles (`offre2`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Caméra (`camera`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Étape 3 : stock et prix (`offre3`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Étape 4 : récapitulatif (`offre4`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Offre envoyée (`offre_publiee`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Dupliquer (`dupliquer`) | x | x | x | x | x | x | x | x | x | x | x | x |

Aucun écran retiré : les dix ont une utilité réelle.

## Règles appliquées (registre-vendeur.json, enonce_final)

PRD-01 à PRD-07, VD08-R01 à R33, OFR-01 à OFR-05, NOF-01 à NOF-05, FCH-01, FCH-02, PHO-01 à PHO-04, PRX-01 à PRX-09,
REC-01, REC-02, PUB-01, DUP-01 à DUP-04, VD11-R41/R45/R49 (alertes), REFVD-R223 à R269 ; décisions DP-55 (BelivaY ne
perd jamais : prix minimum publiable, plancher, un seul arrondi), DP-56 Q-34 (description proposée, relue par
BelivaY), Q-35 (stock et prix par variante), Q-36 (prix conseillé = médiane − 100 F, jamais sous le 10e centile, jamais
au-dessus du prix tapé), Q-40 (fiche prioritaire USSD, remboursée), Q-44 (pas de pidgin), Q-90 (tri attention,
plancher privé du prix automatique), Q-93 (hors connexion), Q-96 (doublons à 0,85), DP-57 A-4 (plages exactes de la
commission minimale), PRX-09 (plafond de démarrage), DP-09/DP-44 (zones lues dans le registre : 4 zones exploitées).

Montants : uniquement `src/calculs` (calculerCommission, prixMinimumPubliable, plagesCommissionMinimale,
plafondDeDemarrage, decouverteActive) dans la démonstration ; l'écran affiche. Recette T8 (VD-12 p9) rejouée : 21 000 F →
18 800 F (89,5 %), conseil 18 900 F → 16 859 F (89,2 %), publié en vérification sous 48 h, « Meilleur prix ».

## Défauts du prototype corrigés

- Défaut 3 (majeur) : `offre_detail` lit `?p=` (la carte iPhone ouvre l'iPhone).
- Défaut 9 : liens construits par `chemin()` (plus d'espace brute dans `fiche` → `offre1?q=`).
- « 6 zones » écrit en dur : nombre lu dans les données (DP-09, DP-44).
- Iphone « 335 324 F » du prototype : montant recalculé (barème seul, M05/M06 en attente).
- Valeurs fixes du prototype (« 3 ventes », « 53 520 F », dates, « 14 fois ») : toutes calculées ou lues dans la source.

## Ajouts (enrichissement, au-delà du prototype)

Mes produits : recherche, filtres par état avec nombres (puces), tri (urgent, stock le plus bas, le plus vendu — jamais
A-Z), stock rapide en feuille (−/+/+5/+10/+20, accès Préparation), brouillons à reprendre ou supprimer avec « Annuler »,
menu ⋮ Exporter (CSV) / Importer (stocks), bande « refusée » et « fiche demandée », message de retour (pause, demande),
états vide / recherche vide / erreur / hors connexion (dernière liste et son heure).
Une offre : aperçu client (fiche CL-06 : galerie de photos réelles, badges, prix, stock, « Payer au comptoir »), photos
réelles avec heure et lieu et ajout par la caméra, variantes de la fiche avec leur état et « Ajouter » (Q-35),
proposition de correction de la fiche (Q-34, coordonnées refusées), historique de l'offre, partage du lien client,
plancher privé du prix automatique, « Annuler » après le réglage du paiement au retrait, remise en vente, suppression
d'un brouillon, états pause / refusée / brouillon / introuvable.
Nouvelle offre : brouillon gardé à chaque saisie, offre en cours à reprendre, recherches récentes, dictée (Web Speech
FR/EN), code-barres (BarcodeDetector ou saisie des chiffres), reconnaissance par photo, liens entre étapes,
choix dans la galerie, retrait d'une photo, poids allégé réel, colis (poids facturé, classe), Made in Cameroon en direct,
plages exactes de la commission minimale, plafond de démarrage, modification d'une offre existante (« Modifier »,
« Réapprovisionner », « Ajuster », « Corriger »), « Ce que verra le client » au récapitulatif, erreurs de publication
avec le lien qui règle le problème, « Voir l'offre » et « Un autre produit » après l'envoi.
Caméra : vraie caméra (getUserMedia), repli sur l'appareil photo du système, recadrage carré (glisser, molette, zoom,
clavier) ou photo entière, contrôle 800 × 800 px, allègement 1 600 px JPEG 0,8, lieu de la prise (géolocalisation),
lampe (torche), ligne de visée animée.
Dupliquer : choix de l'offre source, variante « Autre… » vers la demande de fiche pré-remplie, photos de la copie.

Animations et sons (famille du client) : cartes en cascade, pastille des sélecteurs `.seg`, puces, feuilles du client
(`Feuille`), coche animée `.blv-succes` sur « Offre envoyée », chiffres qui défilent, sons `interrupteur`, `copie`,
`retrait`, `code`, `message`, `fin`, `erreur` ; tout coupé en mouvement réduit et sous navigateur piloté.

## Questions

- Grille des classes de colis et tarifs (M03) : valeurs de démonstration en attendant le document (VD08-R22, Proposé).
- Prix pratiqués (10e centile) : la démonstration prend les prix pratiqués sur 30 jours ; le serveur dira sa base.
- « Cherché N fois » : compteur de zone sur 30 jours, tenu par le serveur (Q-96) ; démonstration : valeurs fixes.

## Vague 4 · retrait de l'inutile

- Mes produits, catalogue vide : le second bouton « Nouvelle offre » (dans la carte « Pas encore de produit ») est
  retiré ; c'était un doublon exact de celui du prototype, affiché juste au-dessus dans le même cas.

## DP-58 (6 oct.) · « Nouveau produit » sur une seule page, comme l'interface réelle

- `offre1` devient la page unique « Nouveau produit » (interface réelle seller.belivay.com, captures 08 et 09 du
  porteur) : panneau **Produit** (recherche obligatoire : texte, code-barres, photo, dictée ; liste du catalogue avec
  photo, catégorie, prix du marché, nombre de vendeurs, « Vous gardez X % à Y F », « Je vends ce produit » ; « Vous le
  vendez déjà » : modifier le stock, ajouter une variante ; « Mon produit n'est pas dans la liste — créer un nouveau
  produit » visible dès l'ouverture, grisé avec sa raison, actif après 3 caractères ou un scan ; nom pré-rempli,
  catégorie et marque proposées, description à compléter relue par BelivaY, doublon signalé « Je vends celui-ci »),
  **Photos réelles** (3 à 8, ordre, principale), **Prix et stock** (prix et « vous gardez » en direct, prix conseillé,
  prix barré + fin de promotion OFR-05, stock, seuil, état, note vendeur), autres réglages, aperçu client, publier.
  Téléphone : une colonne ; dès 768 px : deux colonnes (`nouveau.css`).
- `fiche`, `offre2`, `offre4` n'ont plus d'écran : leurs adresses mènent à `offre1` (`?b=` / `?q=` gardés). `offre3`
  reste « Modifier une offre » (offre existante). Produit nouveau publié : en vérification (fiche écrite par BelivaY,
  48 h, 24 h en prioritaire), doublon rattaché à l'envoi (FCH-02).
- Règles gardées : PHO-01 (3 photos au moins, registre), NOF-01 (aucun produit nouveau sans recherche), DP-55 (prix
  minimum publiable, plafond de démarrage), OFR-05 (prix barré : 10 % au moins, fin sous 30 jours — valeur de départ
  proposée —, ancien prix vérifié par BelivaY), GEN-01 (note et description sans coordonnées).
- Captures pour le porteur : `captures/` (390 et 768 px).
