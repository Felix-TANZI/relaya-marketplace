# VD-10 — changements à faire en vague d'intégration (fichiers communs ou d'autres groupes)

Rien de ce qui suit n'a été modifié par le groupe VD-10.

## 1. Session (domaine `session`, VD-03) — `src/demo/session.ts`

- La pastille « Free · découverte » de l'en-tête lit `BOUTIQUE.plan` (fixe) : un essai ou un plan payé ne s'y voit pas.
  Remplacer `plan: BOUTIQUE.plan` par `plan: planCourant()` (export de `src/demo/plans.ts`).
- Même chose pour le palier et le score si le service Scores change (aujourd'hui `BOUTIQUE.palier` et
  `BOUTIQUE.trustScore`, aussi lus par `demo/paliers.ts` et `demo/trust.ts`).
- `etat: 'suspendue'` n'est jamais produit : le scénario « Compte suspendu » (VD-04) peut lire
  `decisionEnCours()` de `src/demo/trust.ts` (scénario `?cas=suspension`, décision `DEC-2026-0918-S3`, exportée par
  `DECISION_DU_CAS.suspension`).

## 2. Liens entrants vers « Contester » (VD-04, VD-07, VD-11)

- `contester` lit la décision dans l'adresse : `chemin('contester', { d: <decision_id>, depuis: '<route d'origine>' })`
  (origines permises : palier, sanctions, suspendu, litige_envoye, litige, notifications). Sans `d`, l'écran propose
  les décisions contestables (ou « Aucune décision à contester »).
- **VD-04 Compte suspendu** : « Contester » → `chemin('contester', { d: 'DEC-2026-0918-S3', depuis: 'suspendu' })`
  (lire l'identifiant dans `source.trust.statut().enCours.id`) ; masquer le bouton quand `enCours.contestation` existe
  (VD-D05.A18).
- **VD-07 Décision d'un litige** : « Contester la décision » → `chemin('contester', { ref, depuis: 'litige_envoye' })` ;
  l'écran appelle `source.litiges.contester(ref, texte)` quand `issue` vaut `gagne` ou `perdu` (sinon il dit que le
  litige n'est pas encore tranché). Le domaine litiges ne prend pas encore les preuves de la contestation.
- **VD-11 Notifications** : les types `sanction` et `palier` doivent porter `lien: 'contester?d=<id>&depuis=notifications'`.

## 3. Accueil (VD-04) — alerte avant un seuil

`demo/accueil.ts` calcule son alerte à la main ; `alerteDeSeuil` (src/calculs/paliers.ts) est maintenant utilisé par
`demo/paliers.ts` (`monPalier().alerte`) : l'accueil peut lire `source.paliers.monPalier()` pour la même alerte
(montée et descente au seuil du palier, A-5), et la masquer une fois par seuil et par semaine (`alerteAEnvoyer`).

## 4. Interface des domaines possédés par VD-10 (changements à reporter dans l'API, vague 3)

- `trust` : `score()` (champs ajoutés : `calculeA`, `cle` et `detail` des critères, `ref` et `critere` des événements,
  `bareme`, `historique`) ; nouveaux `statut()` (GET /account/status), `decisions()`, `decision(id)` (GET
  /account/decisions) ; `contester()` rend `reponseAvant` et refuse `trop_long` / `introuvable`.
- `paliers` : `monPalier()` porte tout GET /tiers (VD10-R08) : conditions avec valeur et manque, `commandesAFaire`,
  projection, montée, descente proposée, alerte, référence et exemple (null pour l'accès Préparation), lignes de
  paliers, libération, support, découverte.
- `plans` : `acheterVisibilite` est **retiré** (DP-14, Q-32 : aucune visibilité payante) ; ajoutés `etat()`,
  `souscrire()`, `paiement()`, `annulerPaiement()`, `arreter()`, `visibilite()`, `utiliserRecompense()`,
  `programmerVenteFlash()`, `services()`, `stats()`, `demande()` ; `simuler(ventes?, facturation?)` rend une
  `Simulation` complète ; `essayer()` rend aussi `rappelLe`. Les méthodes d'argent refusent l'accès Préparation
  (`ReserveAuProprietaire`). `ROUTES_ATTENDUES.plans` (src/api/source-api.ts) : ajouter GET /rewards, POST
  /rewards/{id}/use, POST /flash-sales, GET /services, GET /stats, GET /demand ; retirer POST /visibility.

## 5. Tests communs — `tests/identique.spec.ts`

- En-têtes : identiques au prototype sur les 11 routes, FR / sombre / EN (33/33).
- Écran entier au pixel : les 11 écrans diffèrent du prototype par décision (enrichissement demandé ; DP-14 retire la
  visibilité payante de « Se faire voir » ; DP-21 / A-5, Q-47, Q-03 corrigent des textes ; montants recalculés :
  iPhone 1 554 F au lieu de 2 201 F, seuils 480 000 / 700 000 F, 8 commandes de découverte au lieu de 9). Les
  déclarer comme écrans enrichis (comparaison de l'en-tête seule) ou ajouter leurs `CORRECTIONS`.

## 6. Calculs (src/calculs)

Les calculs DP-57 nécessaires sont présents depuis la fusion de `espace-vendeur` (plans.ts, paliers.ts, sanctions.ts)
et sont utilisés. Reste hors calculs, à porter si la console doit les régler : le délai de 72 h ouvrées (calendrier
BelivaY, dimanche non compté : `apresHeuresOuvrees` dans `src/demo/trust.ts`), les prix des services, la durée de la
vitrine, la remise relue au-delà de 50 % et les autres valeurs de console regroupées dans `CONSOLE` et `SERVICES`
(`src/demo/plans.ts`) : aucun code au registre vendeur pour elles.

## 7. Pages et inventaire

`npm run inventaire` : passer les 11 routes VD-10 au statut « repris » dans `src/genere/pages.json`.

## Vague d'intégration (6 oct.) — état de chaque point

- [x] 1. Pastille du plan : `planCourant()` ; `suspendue` produit par une suspension en cours (trust). [ ] Palier et score : restent ceux du jeu d'essai (service Scores en vague 3).
- [x] 2. VD-04 Compte suspendu → `contester?d=…&depuis=suspendu`, bouton masqué une fois contesté ; VD-11 notifications : `contester?d=…&depuis=notifications` ; [ ] VD-07 garde sa feuille de contestation (voir VD-07 §5).
- [x] 3. Alerte de l'accueil par `alerteDeSeuil` / `alerteAEnvoyer`.
- [x] 4. INTEGRATION-API.md §1 et §3 (dont retrait de `POST /visibility`).
- [x] 5. Écrans de VD-10 : en-tête seul.
- [x] 6. Valeurs de `CONSOLE` et `SERVICES` au registre (`VD-SIMULATEUR`, `VD-VISIBILITE`, `VD-DEMANDE`, `VD-VISITE-AGENT`, `VD-SERVICES`, `VD-CONTESTATION-REPONSE`) ; la part « dépendance à un produit » (60 %) reste une lecture des chiffres.
- [x] 7. pages.json à jour.
