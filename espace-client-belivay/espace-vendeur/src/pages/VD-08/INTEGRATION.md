# VD-08 — changements à faire en vague d'intégration (fichiers communs, non touchés)

1. **`src/genere/pages.json`** (`npm run inventaire`) : les 10 routes de VD-08 sont « repris » dans
   `src/pages/VD-08/routes.ts`.
2. **`src/api/source-api.ts` (`ROUTES_ATTENDUES`)** — routes du contrat ajoutées par les domaines :
   - `produits` : `GET /offers · GET /offers/{id} · PUT /offers/{id} · POST /offers/{id}/duplicate · DELETE /offers/{id}
     (brouillon) · POST /offers/{id}/restore · GET /offers/export · POST /offers/import · GET /catalog/{id}/variants`
   - `offres` : `GET /config · GET /catalog/search · GET /catalog/barcode/{code} · POST /catalog/recognize · POST /offers ·
     PUT /offers/{id} · POST · DELETE /offers/{id}/photos · GET /offers/quote · GET /offers/{id}/price-advice ·
     POST /offers/{id}/publish · POST /offers/{id}/price · GET /offers/{id}/publication · GET · PUT /sheet-requests/draft ·
     POST /sheet-requests · POST /offers/{id}/description-proposal`
   Le contrat `backend-kit/openapi.yaml` doit porter : `Apercu` (kept, kept_share à une décimale, min_price,
   min_commission_ranges, start_cap), `Conseil` (recommended_price, kept_at_recommended, zones[{name, first,
   first_at_recommended}], market{count, min, max}, customer_saving, weekly_viewers, cheapest_share), `Publication`
   (best_price, perks, answer_before, queued).
3. **`tests/identique.spec.ts`** : les écrans repris de VD-08 sont enrichis (recherche, filtres, tri, photos, variantes,
   historique…) ; seul l'en-tête reste comparable au pixel. États du prototype : déclarer dans `CORRECTIONS` les montants
   recalculés (iPhone 335 324 F → barème seul ; « Ce mois » de l'iPhone), et accepter le nouveau contenu des états
   `produits`, `offre_detail*`, `offre1?q=*`, `fiche`, `dupliquer` (le prototype écrit des valeurs fixes).
4. **`src/demo/accueil.ts`** n'a pas changé ; il utilise toujours `gardeParVente` et `stocksBas()` de
   `src/demo/produits.ts` (mêmes signatures ; `stocksBas()` rend maintenant des `Produit` complets, `attention`
   remplace `alertes`). `src/demo/paliers.ts` utilise `produitsActifs()` (inchangé).
5. **Magasin de démonstration** : la clé `blv_v_demo_produits` change de forme (`forme: 2`) ; un état gardé de la
   vague 1 est oublié automatiquement (pas besoin de changer `VERSION` dans `src/demo/stockage.ts`).
6. **Dictionnaires** : `src/i18n/VD-08.en.json` contient des mots courants (« Tous », « Brouillon », « En pause »,
   « Supprimer », « Reprendre », « Changer », « Chargement… », « Escrow », « Retour 7j », variantes « blanc »,
   « rouge », catégories du barème, six états du produit). Si un autre groupe les a aussi, garder une seule clé
   (`tests/squelette.spec.ts` : aucune clé en double) — les déplacer dans `src/i18n/commun.en.json`.
7. **Composants communs souhaitables** (aujourd'hui dans `src/pages/VD-08/commun.tsx`, réutilisables par tous) :
   `Bouton`, `Interrupteur`, `useToast`, `useEnLigne`, `useApresFrappe`, `Reserve`, `Erreur`, `Chargement`,
   `HorsConnexion`, `FeuilleStock`, `ApercuClient`, `useDictee` ; à déplacer dans `src/composants/` si d'autres groupes
   en ont besoin.
8. **Paramètres** (`logique-metier/parametres-en-vigueur.json`, lu par `src/calculs/registre.ts`) : les valeurs VD-08
   sont aujourd'hui écrites dans `src/demo/offres.ts` (REGLAGES) avec leur code : `PHOTOS_MIN`, `PHOTOS_MAX`,
   `PHOTO_MIN_PX`, `COMPRESSION_COTE_PX`, `COMPRESSION_JPEG_Q`, `FICHE_DELAI_H`, `FICHE_PRIO_DELAI_H`, `FICHE_PRIO_PRIX_F`,
   `MODERATION_H`, `COLIS_SEUIL_POIDS_KG`, `COLIS_SEUIL_DIM_CM`, `DIVISEUR_VOLUMETRIQUE`, `GABARITS_COLIS`,
   `ETATS_PRODUIT`, `DELAI_PREPARATION_DEFAUT`, `RAPPEL_PRIX_J`, `PRIX_AUTO_BAISSE_MAX_PCT`, `SIMILARITE_DOUBLON`,
   `CENTILE_CONSEIL` ; à ajouter au registre en vigueur (et à `GET /config`).
9. **Liens vers d'autres groupes** : `visibilite?p=<offre>` (VD-10 doit lire `p` pour la vente flash), `litiges`
   (VD-07), `camera?…&retour=` (VD-08), `offre3?o=<offre>&focus=stock` depuis l'Accueil (VD-04 envoie aujourd'hui
   vers `offre_detail?p=`, qui fonctionne).
10. **Côté client (site/, plus tard)** : couper « Accepter le paiement au retrait » doit retirer « Payer au comptoir »
    de la fiche CL-06 pour ce produit (OFR-02) ; le partage d'une offre vise `/recherche?q=<titre>` du client.

## Vague d'intégration (6 oct.) — état de chaque point

- [x] 1. pages.json à jour.
- [x] 2. Routes et contrat : INTEGRATION-API.md §1 et §3.
- [x] 3. Écrans de VD-08 : en-tête seul dans identique.spec.ts (montants recalculés hors comparaison).
- [x] 4. / 5. Informatif : rien à faire.
- [x] 6. Mots courants réunis dans `commun.en.json`.
- [ ] 7. Composants communs : non déplacés — chaque groupe garde les siens ; seuls le réseau et la file hors connexion sont devenus communs (`src/donnees/fileHorsLigne.ts`).
- [x] 8. Valeurs de console au registre (DP-57 : `VD-PHOTOS`, `VD-FICHE-DELAI`, `VD-MODERATION`, `VD-COLIS`, `VD-ETATS-PRODUIT`, `VD-PREPARATION-DELAIS`, `VD-RAPPEL-PRIX`, `VD-PRIX-AUTO`, `VD-DOUBLON`, `VD-CONSEIL-PRIX`), lues par `lireConsole`.
- [ ] 9. `visibilite?p=` : non applicable — la vente flash porte sur l'offre récompensée (P-3), pas sur une offre choisie ; le lien ouvre l'écran. Les autres liens fonctionnent.
- [ ] 10. Côté client (paiement au comptoir, partage) : hors périmètre de cette vague (seuls les liens vers l'espace vendeur ont changé dans `site/`).

## DP-58 (6 oct.) — à reporter

- Serveur (backend-kit/apps/vendeur_catalogue) : `GET /catalog/search?code=` (+ `mesProduits`, `vendeurs`),
  `GET /catalog/suggest`, `POST /offers/new`, `POST /offers/{id}/attach`, `PUT /offers/{id}/photos {ids}` ; champs
  `prixBarre`, `finPromo`, `noteVendeur`, `titre`, `marque`, `categorie`, `description`, `prioritaire` au PATCH ; publication
  d'un produit nouveau (doublon rattaché à l'envoi, fiche écrite pendant la vérification) et contrôle OFR-05. Les routes
  `/sheet-requests` ne sont plus appelées par l'espace vendeur (connecteurs mis à jour dans `src/api/routes/offres.ts`).
- Registre : valeurs de départ `rechercheMin` 3, `promoRemiseMin` 10 %, `promoJoursMax` 30 j, `noteMax` 300 (dans
  `src/demo/offres.ts`, REGLAGES) à verser au registre en vigueur.
- Magasin de démonstration `blv_v_demo_produits` : forme 3 (l'état gardé d'une forme ancienne est oublié).
- Côté client (site/, plus tard) : prix barré, compte à rebours de la promotion et note du vendeur sur la fiche CL-06.

## Vague d'intégration DP-58 (6 oct.)

- [x] Routes serveur du Nouveau produit : `INTEGRATION-API.md` § 7.
- [x] Prix barré : une vente flash en cours (Promotions, ou offerte au mérite) prend la place du prix barré saisi
  (`vue()`, `src/demo/ventes-flash.ts`) ; une seule notion de promotion côté vendeur.
- [ ] Registre (`rechercheMin`, `promoRemiseMin`, `promoJoursMax`, `noteMax`) et côté client (site/) : hors de cette vague.
