# VD-09 — changements demandés hors du groupe (vague d'intégration)

Aucun fichier commun n'a été modifié. Voici ce qui reste à faire ailleurs.

## Calculs (src/calculs)

- Les calculs de la fusion `espace-vendeur` (6 oct.) sont utilisés tels quels ; aucune fonction ne manque. `demo/argent.ts`
  passe bien `gel` dans chaque `Gain` (montantDu exclut l'argent gelé) et tire les cinq états de `etatDeLArgent` /
  `resume` ; `demo/versements.ts` prend la référence de `referenceDeVersement` et le statut de la machine `VERSEMENT`.
- Q-94 : ajouter au registre un paramètre des préfixes par opérateur (par exemple `VD-PREFIXES-CM` = « MTN : 67, 68,
  650 à 654 · Orange : 69, 655 à 659 ») et son lecteur dans `registre.ts`. En attendant, la démonstration du domaine
  `versements` les tient (constante `OPERATEURS`) et les donne à l'écran (`NumeroVersement.operateurs`) : l'écran n'en
  contient aucun.
- Facultatif : `jourMois`, `jourCourtMois`, `dateLongue`, `nomMois`… (dates de VD-09, `src/pages/VD-09/commun.tsx`) pourraient
  rejoindre `src/i18n/temps.ts` pour servir à tous.

## Domaine `commandes` (VD-05)

- `demo/commandes.ts` : exporter le résultat complet figé (`ResultatCommission`) en plus de `gardeFige`, pour que
  `demo/argent.ts` cesse de refaire le même calcul (`figee`, utilisé pour la facture des commissions).
- `vueCommande().argent.etat` lit encore l'étape écrite du jeu d'essai : il devrait prendre `etatDeLArgent` (une vente dont
  la libération est passée est « à verser », comme dans Mon argent).

## Coque et composants communs

- `src/composants/MenuProfil.tsx` : le montant « … F à verser » doit suivre l'œil (préférence `soldeMasque`) : écrire
  « •• ••• F » quand les montants sont masqués (DP-52 : l'œil vaut partout).
- `src/composants/Garde.tsx` : son en-tête annonce « Réservé au propriétaire » pour `ReserveAuProprietaire`, mais rend
  l'écran d'erreur. Les écrans de VD-09 gèrent eux-mêmes le cas (`Reserve` dans `commun.tsx`) ; ce composant pourrait
  être déplacé dans la coque pour les autres groupes.

## Messagerie (VD-11)

- Les écrans d'argent ouvrent `messages?fil=support&sujet=<référence>` (versement non reçu : `BLV-VS-…` ; vérification
  anti-fraude : `BLV-000…` ; changement de numéro contesté : `numero_versement`). La messagerie doit ouvrir le fil du
  support et préremplir le sujet (VER-03, NUM-05). Le signalement lui-même est déjà enregistré par
  `versements.signalerNonRecu` (POST /payouts/{id}/incident).

## Commandes (VD-05)

- Le verrou Préparation mène à `commandes?f=prep` (et garde `role=prep` dans la démonstration) : l'écran Commandes doit
  lire `f=prep` pour ouvrir le filtre « À préparer » (ARG-07).

## Reçu (VD-06)

- Mes gains et Documents ouvrent `recu?ref=BLV-…` : le reçu doit afficher la commande demandée.

## Boutique (VD-11)

- Documents mène à `boutique` par « Déclarer mon RCCM et mon NIU » (DOC-01) : la page Ma boutique doit proposer ces deux
  champs (statut particulier ou entreprise) et les envoyer à la source.

## Serveur (vague 3)

- Routes utilisées par les deux domaines : GET /money/summary, /money/releasing, /money/frozen, /money/earnings?month=,
  GET /documents et GET /documents/{type}/{period}?format=pdf|csv, GET /payouts/next, GET /payouts?period=3m|12m|all,
  POST /payouts/{id}/incident, POST /payout-number/codes, POST /payout-number/codes/resend, PUT /payout-number.
- La démonstration fabrique PDF et CSV sur l'appareil depuis `argent.document()` ; le serveur pourra rendre directement
  les fichiers (même contenu, DOC-02).

## pages.json

- `npm run inventaire` : les sept routes VD-09 passent « repris ».

## Vague d'intégration (6 oct.) — état de chaque point

- [x] Calculs : rien ne manquait ; Q-94 : `VD-PREFIXES-CM` au registre, lu par `lireConsole` (la démonstration ne tient plus les préfixes).
- [ ] Dates de VD-09 dans `temps.ts` : facultatif, non fait — aucun autre groupe ne les demande.
- [x] `commissionFigee` exportée par les commandes et relue par l'argent ; `argent.etat` par `etatDeLArgent`.
- [x] Menu du profil et Menu : « •• ••• F à verser » quand les montants sont masqués.
- [x] `GardeErreurs` : « Réservé au propriétaire » pour `ReserveAuProprietaire`.
- [x] Messagerie : `fil=support&sujet=` ouvre le support, sujet prérempli.
- [x] Commandes `f=prep` : déjà lu par l'écran Commandes.
- [x] Reçu `?ref=` : déjà lu par l'écran Reçu.
- [x] Ma boutique : RCCM et NIU (forme du contrat) ; « Déclarer mon RCCM et mon NIU » ouvre la demande sur le statut.
- [x] Serveur : INTEGRATION-API.md. - [x] pages.json.
