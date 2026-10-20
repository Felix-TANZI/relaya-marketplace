# AJ-A — pages ajoutées (DP-58) : intégration

Quatre pages nouvelles, téléphone et tablette d'abord : `stock`, `promotions`, `questions`, `livraison`
(`routes.ts`, statut « repris »). Coque : `coque.tsx` (`EcranAJ`) reprend `Ecran` pour des routes sans état du
prototype : en-tête enfant de verre intouchable, barre du bas, menu du profil ; dès 768 px en-tête de site, barre de
titre et pied de page. Données : `donnees/types.ts` (contrat), `donnees/source.ts` (démo ou API `/vendors/…`),
`donnees/demo.ts` (démonstration, montants par `src/calculs`), `donnees/defauts.ts` (réglages de livraison).
Textes anglais : `src/i18n/AJ-A.en.json`. Tests : `tests/AJ-A.gestes.spec.ts` (10 gestes). Captures 390 et 768 px :
`captures/`.

## Règles appliquées

- Stock : VD02-DR03 et ACC-27 (accès Préparation autorisé, gestes signés), ACC-26 (aucun prix pour lui), VD11-R49
  (seuil), VD02-H02 / OFF-02 (hors connexion : stock mis en file), Q-35 (stock par variante), PRD-01/05 (compteurs,
  alertes) ; présentation inspirée de « Mes produits » de l'interface réelle (INTERFACE-REELLE.md), en plus simple.
- Promotions : OFR-05, VD12-R38, DEC-17, VD10-R40 (vente flash seulement, remise réelle ≥ FLASH-REMISE-MIN, prix
  barré = prix le plus bas pratiqué sur 30 jours, jamais saisi), FLASH-DUREE-MAX, P-3 (relue au-delà de
  VD-VISIBILITE), VIS-02 / REFVD-R291 (score minimum, pas de rupture), F9 / VD08-R06 (commission sur le prix payé),
  DP-55 (refus si gardé < 0, planchers), DP-14 / Q-32 (gratuite, jamais « Sponsorisé »), FF-FLASH (VD08-R33).
- Questions : GEN-01 / VD11-R10 (client anonyme, boutique jamais nommée), VD11-R59 / REFCL-R006 (coordonnées
  refusées, même filtre que la messagerie), VD-MODERATION (signalement relu sous 48 h), Q-17 (réponse publique
  réservée au propriétaire).
- Livraison : OFR-02 (paiement au retrait par produit, vrai par défaut), VD08-R22 / VD-COLIS (classe calculée par
  les mesures au-delà de S et M), VD-PREPARATION-DELAIS, VD06-R04 (livreur absent : délai suspendu), PRE-02 /
  REM-03 / VD12-R12 (le vendeur ne fait pas le colis), DP-49 / DP-54 (OpenStreetMap), VD02-DR05/DR10 (Préparation :
  lecture seule).

## Ajouts hors du dossier (minimes, à relire en vague d'intégration)

1. `src/pages/VD-11/Menu.tsx` : « Questions des clients » (Messages et aide, pastille = questions sans réponse),
   « Stock et inventaire » (Mon catalogue, pastille = produits sous le seuil), « Promotions » (Vendre plus,
   propriétaire), « Livraison et colis » (Ma boutique). Lit `sourceAJA.questions.liste()`.
2. `src/pages/VD-04/Accueil.tsx` : la ligne « Stock bas » ouvre `stock?p=<offre>` (au lieu de la fiche de l'offre).
3. `src/pages/VD-08/OffreDetail.tsx` : « Faire une promotion » ouvre `promotions?p=<offre>` (au lieu de `visibilite`).
4. `src/demo/notifications.ts` : une notification (type `message`, déjà lue : compteurs de la cloche inchangés) par
   question sans réponse, lien `questions?q=<id>`.
5. `src/demo/offres.ts` : une nouvelle offre (commencer, demanderFiche) prend le délai, le paiement au retrait et le
   colis par défaut de « Livraison et colis » (`defautsLivraison()`).
6. `tests/VD-11.gestes.spec.ts` : « Tout 12 » → « Tout 14 » (les deux questions du jeu d'essai).
7. `tests/squelette.spec.ts` : les liens vers une route déclarée dans un `routes.ts` sont connus (pages.json n'est
   régénéré qu'en vague d'intégration).

## À faire en vague d'intégration

- `npm run inventaire` (pages.json : titres des quatre routes) ; ajouter les routes au fil d'Ariane et au pied de
  page (`larges.tsx`) si souhaité.
- Serveur (vague 3) : routes du contrat listées en tête de `donnees/types.ts` ; une promotion programmée doit
  changer le prix payé côté client pendant sa fenêtre (la démonstration ne touche pas au prix de l'offre).
- La vente flash offerte au mérite (VD-10, `plans.programmerVenteFlash`) et ces promotions suivent les mêmes règles :
  les réunir dans un seul domaine côté serveur.
- Valeurs proposées, à verser à la console : horizon de réapprovisionnement 14 jours, objectif de réponse 24 h,
  programmation 30 jours à l'avance, 3 relais préférés, 10 modèles de réponse.

## Vague d'intégration (6 oct.) — état de chaque point

- [x] `npm run inventaire` : les quatre routes sont dans `pages.json` (marquées `ajoutee`) et leur coque dans
  `etats.json` (titre, retour, onglet déclarés dans `routes.ts`) ; `EcranAJ` passe par la coque commune `Ecran`.
  Navigation groupée (`config/navigation.ts`) : Stock et inventaire, Promotions, Questions des clients, Livraison et colis.
- [x] Une vente flash en cours change le prix de l'offre en démonstration (prix payé, prix barré, fin ; ce que le
  vendeur garde suit) : `src/demo/ventes-flash.ts`, lu par `vue()` de `src/demo/produits.ts`.
- [x] Une seule notion : la vente flash offerte au mérite (VD-10) entre dans la même liste (origine « mérite »,
  pastille « Offerte au mérite » dans Promotions, lien « La suivre dans Promotions » sur Se faire voir).
- [x] Routes serveur : `INTEGRATION-API.md` § 7 (aucun travail serveur à cette vague).
- [ ] Valeurs proposées à verser à la console (horizon 14 j, objectif 24 h, 30 j, 3 relais, 10 modèles) : à la console.
