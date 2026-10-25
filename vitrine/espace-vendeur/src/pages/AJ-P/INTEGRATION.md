# AJ-P — Publicité du vendeur (DP-59) : intégration

Trois pages, réservées au propriétaire (droit `argent.voir` : masquées pour un employé, la source refuse) :
`publicite` (tableau de bord, Mes campagnes, garde-fous), `publicite_nouvelle` (création en trois gestes),
`publicite_solde` (recharge Mobile Money, historique, factures, export). Entrées : groupe « Croissance » de la
navigation, Menu (« Publicité »), fiche d'une offre (« Sponsoriser » → `publicite_nouvelle?p=<offre>`), Promotions
(candidature flash → `publicite_nouvelle?type=flash`).

- Règles : `src/calculs/publicite.ts`, portage fidèle de `moteurs/belivay_moteurs/publicite.py` et de
  `lire_publicite` (branche du moteur) ; `publicite.test.ts` rejoue `moteurs/tests/test_publicite.py` (21 cas).
- Domaine : `src/donnees/domaines/publicite.ts` ; démonstration `src/demo/publicite.ts` (12 campagnes, 3 par
  produit) ; connecteur `src/api/domaines/publicite.ts`, routes `src/api/routes/publicite.ts` (état « serveur »).
- Textes anglais : `src/i18n/AJ-P.en.json` (y compris ceux ajoutés au Menu, à la fiche d'offre et à Promotions).

## Fait à la fusion avec la branche du moteur

1. Registre : `PARAMETRES_PUBLICITE` lit les codes `VD-PUB-*` de `REGISTRE` (logique-metier/parametres-en-vigueur.json),
   la copie `REGISTRE_PUBLICITE` est supprimée ; le test « paramètres du registre » reste vert.
2. Serveur : les 13 connecteurs sont « branche » sur `backend-kit/apps/publicite` — `espace.py` rend les types de
   l'écran (tableau, campagnes, produits, mouvements, estimation, création, reprise, enchère au clic, recharge) et
   les refus en `{ ok: false, raison }` ; pause, arrêt et recharge passent par les routes de `services.py` (refus 422
   traduits par le connecteur). Campagne sponsorisée : `lieu` (recherche ou catégories) respecté par `/sponsored`.
3. À la une / carrousel : l'écran propose le tarif fixe ou l'enchère hebdomadaire (semaine suivante, plancher
   `uneEnchereMin` / `carrouselEnchereMin` du registre) ; rien n'est pris avant l'attribution
   (`services.attribuer_semaine`, démonstration : au début de la semaine), meilleure enchère perdante + 1 F.
4. Vente flash sur sélection : acceptée (console : `selectionner_flash` ; démonstration : 24 h avant le créneau), elle
   devient une vente flash de Promotions d'origine « selection » (`VenteFlash` du kit, `src/demo/ventes-flash.ts`),
   qui change le prix payé par le client pendant la fenêtre ; arrêtée d'un côté, elle s'arrête de l'autre.

## Reste à faire

- Notifications (candidature acceptée, enchère gagnée ou perdue, solde bas, diffusion suspendue) : domaine
  `notifications`.
- Estimation côté serveur : fourchettes d'audience (vues, clics) et aperçu de la liste à brancher sur les
  statistiques de recherche (le kit rend `[0, 0]` et une liste vide).
