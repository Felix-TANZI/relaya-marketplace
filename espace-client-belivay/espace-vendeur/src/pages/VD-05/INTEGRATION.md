# VD-05 — changements demandés pour la vague d'intégration

Fichiers communs ou d'autres groupes que VD-05 n'a PAS modifiés ; changement exact à faire.

1. **Calendrier d'ouverture → `src/calculs/`** : déplacer les fonctions pures de `src/donnees/domaines/preparation.ts`
   (`plageDuJour`, `heuresOuvertes`, `ajouterOuvertes`, `ouvertureSuivante`, `ouverteA`, `ouvertureDuJourSuivant`,
   `passageSuivant`, `optionsDeDelai`) dans `src/calculs/ouverture.ts`, avec leurs tests
   (`src/pages/VD-05/calendrier.test.ts` → `src/calculs/ouverture.test.ts`) ; le domaine garde le type
   `CalendrierBoutique` et réexporte. Porter les mêmes fonctions dans `moteurs/` (Python) pour le serveur.
2. **Accueil (VD-04, `Accueil.tsx` et `src/demo/accueil.ts`)** : le temps restant d'une commande à préparer doit se
   compter en heures d'ouverture (REFVD-R134) : ajouter `calendrier: CalendrierBoutique` à l'élément `preparer` de
   `ElementAFaire` (lu dans `calendrier()` de `src/demo/commandes.ts`) et afficher
   `heuresOuvertes(maintenant, x.echeance, x.calendrier)` au lieu de `x.echeance - maintenant`. Le créneau du livreur
   doit suivre le ramassage de la commande (après « Plus de temps » au jour suivant, P-6) : remplacer
   `livreur: LIVREUR` par le `ramassage` de `vueCommande()`. `enAttenteEnvoi` doit compter la file hors connexion
   (point 3).
3. **File hors connexion (Q-93)** : la file « C'est prêt » de VD-05 vit dans `src/pages/VD-05/commun.tsx`
   (`mettreEnFile`, `envoyerFile`, `useEnLigne`, clé `blv_v_file_vd05`). La déplacer dans un module commun
   (`src/donnees/fileHorsLigne.ts`) pour l'Accueil (« n action(s) en attente d'envoi »), la remise et les autres
   gestes en file (photo, stock, masquer, « Fermer aujourd'hui »).
4. **Remise (VD-06, `src/demo/remise.ts`)** : à la saisie du bon code, poser aussi `x[ref].remiseA = maintenant()`
   dans `etatCommandes` (le domaine commandes le lit ; à défaut, il cherche « Remis au livreur » dans le journal).
   Les écrans de VD-06 devraient garder `?role=prep` dans leurs liens (comme `useLien()` de VD-05).
5. **Boutique (VD-11, `src/demo/boutique.ts`)** : `etatBoutique()` devrait rendre aussi `fermetures` (jours
   programmés) pour que `calendrier()` de `src/demo/commandes.ts` les compte (aujourd'hui : `fermetures: []`).
6. **Messages (VD-11)** : la commande ouvre la conversation par `messages?fil=<id du fil>` (ex. `fil=f-00008`) ;
   l'écran Messagerie repris doit lire ce paramètre.
7. **Montant gardé de l'iPhone 15 Pro Max** : `gardeFige()` (calculs communs) donne 339 640 F (350 000 F, Bronze,
   découverte comprise, Q-57) ; REFVD-R68 écrit 335 324 F. À trancher dans `src/calculs/commission.ts` ou dans le
   registre ; les écrans de VD-05 affichent le calcul et les tests ne figent pas ce montant.
8. **`tests/identique.spec.ts`, `CORRECTIONS`** (écran entier) : écarts voulus par les règles, à déclarer —
   `#delai*` : « Au plus tard mercredi 23 sept. à 12 h 42, 24 heures d'ouverture après le paiement » (DP-56 Q-38 ;
   le prototype écrit « mardi 22 sept. à 08 h 42, 24 h après le paiement ») ; `#rupture?ref=BLV-00009`,
   `#delai?ref=BLV-00009` : heures de BLV-00009 (défaut 4) ; `#commandes?role=prep`, `#commande?…&role=prep` : plus
   aucun montant (le prototype en montre) ; `#commandes?f=fin` : dates et versements lus dans le jeu d'essai
   (« Livrée le 17 sept. », BLV-VS-4085…) et sous-filtres ; `#bon` : cases non cochées tant que personne ne les
   coche (aucun état écrit d'avance), compteur « 0 sur 4 », bouton de scan, choix A4 / ticket ; `#commande` : carte
   des quatre cases et message du client ajoutés ; `#journal` : fil complet de la commande.
9. **`src/genere/pages.json`** : `npm run inventaire` (statut « repris » des six routes).
10. **Contrat d'API (`backend-kit/openapi.yaml`, vague 3)** : `GET /orders?state=` rend `counts`, `detail`
    (prep, cours, litiges, retours, terminees, annulees) et `total` ; l'item porte `shop_calendar`, `pickup_slot`,
    `cancellation{reason, at}`, `problem`, `frozen_amount` (null pour `preparation`) ; `POST /orders/{id}/ready`
    accepte `at` (heure d'origine d'une action gardée hors connexion) ; `GET /orders/{id}/extend-options` (trois
    choix, échéance absolue, effet sur le ramassage) ; `PUT /orders/{id}/slip/checks/{i}`,
    `POST /orders/{id}/reference-check`, `POST /orders/{id}/slip/opened` (signés au journal) ;
    `GET /orders/{id}/journal` rend `detail`, `before`, `after`.
11. **Feuille d'impression** : la règle `@media print` du bon vit dans `Bon.tsx` (balise `<style>`) ; elle peut passer
    dans `src/styles/vendeur.css` (classe `.vd05-bon`).
12. **Annulées dans « Terminées »** : `compterCommandes()` compte maintenant une commande annulée dans `fin` (elle
    quitte la file à préparer, reste visible avec son motif, Q-73) ; seul le badge « à préparer » est lu ailleurs.

## Vague d'intégration (6 oct.) — état de chaque point

- [x] 1. `src/calculs/ouverture.ts` (+ `ouverture.test.ts`), réexporté par le domaine ; porté dans `moteurs/belivay_moteurs/ouverture.py` (+ tests, couverture 100 %).
- [x] 2. Accueil : temps restant en heures d'ouverture (`calendrier` dans l'élément), créneau = ramassage qui suit l'échéance ; `enAttenteEnvoi` compte la file commune.
- [x] 3. File commune `src/donnees/fileHorsLigne.ts` (domaine accueil) ; `blv_v_file_vd05` retiré.
- [x] 4. `remiseA` posé par la remise ; `?role=prep` conservé de lien en lien pour toute l'application (`App.tsx`).
- [x] 5. `etatBoutique()` rend `fermetures` (programmées + pause) et `fermeeLe` ; le calendrier des commandes les compte.
- [x] 6. Messagerie : `messages?fil=` lu (et `fil=support`, `ref=`, `sujet=`).
- [ ] 7. iPhone 339 640 F / 335 324 F : non tranché — M05 / M06 attendus du porteur (DP-55, Q-02) ; aucun test ne fige ce montant.
- [x] 8. Écrans de VD-05 sortis de la comparaison écran entier (en-tête seul) : les écarts voulus n'ont plus à être déclarés.
- [x] 9. pages.json à jour.
- [x] 10. Contrat d'API : INTEGRATION-API.md §1 et §3.
- [ ] 11. Feuille d'impression : non applicable — `@page` dépend du format choisi (A4 ou ticket) : la règle reste dans `Bon.tsx`.
- [x] 12. Informatif (annulées dans « Terminées ») : rien à faire.
