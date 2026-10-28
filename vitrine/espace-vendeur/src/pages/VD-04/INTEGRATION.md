# VD-04 — changements demandés hors du groupe (vague d'intégration)

1. **Bandeau hors connexion commun (coque VD-01)** : VD04-R14 veut le bandeau « Pas de connexion. Données de HH h MM. »
   sur TOUS les écrans. Il est dans mes écrans (`BandeauHorsLigne`, `useReseau` dans `src/pages/VD-04/commun.tsx`) ;
   à monter dans `Ecran` (src/composants/coque.tsx) et `useReseau` (rejoue la file au retour du réseau) dans App.tsx,
   puis à retirer de mes écrans.
2. **En-tête racine (coque)** : `accueil_calme` et `premier_jour` diffèrent du prototype par les données seulement
   (cloche : 4 notifications réelles contre « — » / « 1 » ; pastille « Bronze · lancement » du prototype pour une
   boutique sans Trust Score). Si le porteur veut la pastille « {palier} · lancement » pendant le palier de lancement
   sans score, l'ajouter dans `usePastilles`. Sinon, déclarer ces deux en-têtes « données » dans identique.spec.ts.
3. **Écran entier identique** : `accueil*`, `accueil_calme*`, `premier_jour*`, `horsligne*`, `suspendu*` sont enrichis
   (filtres, « En attente du livreur », données réelles de la file et du premier jour) : à sortir de la comparaison
   écran entier.
4. **Domaines des autres groupes** : `boutique.fermerAujourdhui`, `produits.changerStock` et les photos (VD-08) doivent
   passer par `source.accueil.mettreEnFile({ type: 'stock' | 'photo', objet, detail })` quand le téléphone est hors
   connexion (Q-93) ; `envoyerFile` les rejoue (stock déjà rejoué ; photo : envoi à brancher par VD-08).
   `argent.resume().gagneDepuisInscription` (VD-09) compte aussi les ventes « se libère » ; l'accueil compte les
   ventes libérées seulement (VD04-R10) — à aligner.
5. **Notifications (VD-11)** : une action refusée au rejeu revient « avec son motif dans les notifications »
   (VD04-R14) ; aujourd'hui elle reste visible dans la file (Hors connexion).
6. **Demande de la zone (VD-10)** : « Une idée pour vendre plus » lit une donnée de `src/demo/accueil.ts` (`DEMANDE`) ;
   à lire du domaine de la demande quand il existe (GET /demand?limit=1).
7. **Contestation (VD-10)** : `Suspension.contestation` (appeal_id) doit venir de `trust` quand la contestation est
   envoyée depuis `contester`.
8. **Registre** : `VD-SAN-SUSPENSION` est lu pour le score gelé (40) ; `APPEAL_RESPONSE_H_OUVREES` (72) et la période
   probatoire (20 commandes, DP-57 L-1) sont des constantes commentées de `src/demo/accueil.ts`, à ajouter au registre.
9. **Connecteur API (vague 3)** : `accueil.calme()` (GET /money/earnings?scope=lifetime, /payouts/next, /demand),
   `premierJour()` (GET /seller/onboarding), `suspension()` (GET /account/status), la file hors connexion (IndexedDB
   chiffrée côté appareil : pas de route serveur, chaque action rejouée vers sa route avec origin_time et origin_geo).

## Vague d'intégration (6 oct.) — état de chaque point

- [x] 1. Bandeau commun monté par `Ecran` (`src/composants/BandeauHorsLigne.tsx`) ; `useReseauGlobal` dans `App.tsx` (heure notée, file rejouée) ; retiré des écrans de l'accueil ; une bannière propre à l'écran le remplace.
- [x] 2. En-têtes « Rien à faire » et « Premier jour » déclarés « données » dans identique.spec.ts (pastilles et cloche masquées des deux côtés, dessin comparé).
- [x] 3. Écrans de l'accueil sortis de la comparaison écran entier (tous les écrans repris).
- [x] 4. Stock (Mes produits, Une offre) et « Fermer aujourd'hui » (Horaires) en file hors connexion ; photo : gardée par le domaine offres (brouillon), le rejeu « photo » reste sans objet en démonstration. `gagneDepuisInscription` compte déjà les ventes libérées seulement (versé + à verser) : aligné.
- [x] 5. Action refusée au rejeu : notification avec son motif.
- [x] 6. « Une idée pour vendre plus » lue dans la demande de la zone (domaine plans, `rechercheLaPlusDemandee`).
- [x] 7. Contestation de la suspension lue dans trust (`decisionDe`) ; « Contester » → `contester?d=…&depuis=suspendu`.
- [x] 8. `VD-CONTESTATION-REPONSE` (72 h ouvrées) au registre ; période probatoire lue dans `VD-PROBATOIRE`.
- [x] 9. Routes du connecteur : INTEGRATION-API.md §1.
