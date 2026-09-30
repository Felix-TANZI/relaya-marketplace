# Plan de construction — Espace vendeur v2

> Suivi de l'implémentation du paquet développeur "Espace vendeur" (voir `ESPACE_VENDEUR_SYNTHESE.md` et `espace_vendeur_synthese_detail/`). Ordre des 10 lots repris de VD-12 §B. Ce fichier est mis à jour à chaque session de travail — c'est la mémoire de reprise si le travail est interrompu.

Branche : `feat/espace-vendeur-v2`.

**Décisions prises pour lever les 3 blocages (§2 de la synthèse) sans attendre un arbitrage humain**, puisqu'il a été demandé de reproduire directement — à corriger si une décision contraire arrive :
- **Commission** : barème M01 (VD-02/familles A-E par tranches) retenu, car c'est le seul utilisé dans tous les scénarios de test des 9 documents d'écrans. La grille R4 (catégorie×palier) est ignorée tant que l'annexe 1 du contrat n'existe pas.
- **Litiges** : décision humaine avec présomption client (règle la plus récente, v3 client) — PAS d'arbitrage automatique à 48h. VD-07/VD-02/T6 corrigés en conséquence.
- **Argent** : t_libération = t_fermeture + Δ (Δ = 3j Bronze/Argent, 1j Or/Platine, 14j carte), t_fermeture = min(confirmation, retrait+7j) — repris tel quel de VD-09, à vérifier plus tard contre le Référentiel unique.

Existant à remplacer (repéré dans le code actuel) : `frontend/src/features/vendors/*` (~20 pages, navigation sidebar 20 entrées + 4 onglets mobile actuels ≠ dock spec), `frontend/src/app/layout/SellerLayout.tsx`, `frontend/src/services/api/vendors.ts` (modèle "retrait manuel + escrow" à remplacer par "versement automatique du vendredi"), `backend/apps/vendors/*`.

---

## Lot 1 — Fondations (VD-01, VD-02)
- [x] Tokens design system (couleurs clair/sombre "Graphite pro", typographie, rayons) — `frontend/src/features/vendors/v2/theme.ts`
- [x] Composant Dock 4 onglets (Accueil · Commandes · Produits · Argent) — `frontend/src/features/vendors/v2/DockNav.tsx`
- [x] Écran Menu (7 groupes) — `frontend/src/features/vendors/v2/MenuPage.tsx`
- [x] Placeholders des écrans pas encore construits — `frontend/src/features/vendors/v2/V2ComingSoonPage.tsx` + `comingSoonScreens.ts`, route `/seller/v2/:screen`
- [x] SellerLayout : burger mobile → écran Menu (`/seller/menu`), ancien tiroir + barre à 4 onglets remplacés par `<DockNav />`. Sidebar desktop (20 entrées) gardée telle quelle pour l'instant — à revoir une fois plus d'écrans v2 construits, remplacement complet risqué en un seul lot.
- [x] i18n domaine `sl5` (fondations v2) fr/en, branché dans `i18n/index.ts`
- [x] Vérifié : `tsc --noEmit` propre, `eslint` propre sur les fichiers touchés, `vitest run` 18/18, `npm run build:seller` OK
- [ ] Service de commission unique (VD-02, barème M01) côté backend — `backend/apps/vendors/commission.py`
- [ ] Modèle de données argent (5 états : à verser/se libère/en cours/gelé/versé) côté backend

**Note** : les 4 onglets du Dock et les items du Menu pointent pour l'instant vers les pages existantes (`/seller/dashboard`, `/seller/orders`, `/seller/products`, `/seller/wallet`, etc.) — c'est un pont, pas la version finale. Ils seront rebranchés vers les vrais écrans v2 au fur et à mesure des lots 3/5/9.

## Lot 2 — Commission officielle (VD-02)
- [ ] Endpoint `GET /api/vendors/offers/{id}/price-advice`
- [ ] Champ `kept_amount` figé au paiement sur la commande

## Lot 3 — Argent (VD-09)
- [ ] `GET /money/summary`, `/money/frozen`, `/money/earnings`
- [ ] Tâche planifiée : versement automatique chaque vendredi avant 12h
- [ ] Écrans Mon argent / Se libère / Gelé / Mes gains / Documents / Versements / Numéro de versement

## Lot 4 — Anonymat (VD-11)
- [ ] Filtrage serveur systématique identité client↔vendeur
- [ ] Écran Ma boutique / Horaires / Emplacement / Mon équipe

## Lot 5 — Commandes (VD-04, VD-05, VD-06)
- [ ] Accueil (à faire / rien à faire / premier jour / états)
- [ ] Commandes reçues / Commande à préparer / Rupture / Plus de temps / Bon de préparation / Journal
- [ ] Remise au livreur / Remis / Reçu vendeur / Erreurs

## Lot 6 — Litiges et retours (VD-07)
- [ ] Litiges reçus / Répondre / Décision (décision humaine, pas d'auto-arbitrage)
- [ ] Retours en cours / Inspection / Remplacement

## Lot 7 — Ouverture en trois temps (VD-03)
- [ ] Connexion / Ouvrir ma boutique / Publier et être payé / Saisie assistée / Installer l'app

## Lot 8 — Trust Score (VD-10)
- [ ] Moteur de score vendeur — diff ligne à ligne contre le V5.5 canonique avant implémentation
- [ ] Mon palier / Mon score / Les paliers / Sanctions / Contester / Plans / Simulateur / Visibilité / Services / Mes chiffres / La demande

## Lot 9 — Catalogue (VD-08)
- [ ] Mes produits / Une offre / Nouvelle offre (4 étapes) / Demander une fiche / Dupliquer

## Lot 10 — Croissance et compte (VD-10, VD-11)
- [ ] Paramètres / Sécurité / Notifications / Avis / Messagerie / Aide

---

**Prochaine étape immédiate** : finir le Lot 1 (écran Menu, branchement dans SellerLayout, i18n).
