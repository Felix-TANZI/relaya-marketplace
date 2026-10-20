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

**Note** : DockNav pointe maintenant vers les vrais écrans v2 pour Accueil/Commandes/Produits ; "Argent" reste sur `/seller/wallet` (v1) tant que le Lot 3 frontend n'est pas construit.

## Lot 2 — Commission officielle (VD-02)
- [x] `backend/apps/vendors/commission.py` : `calculate_commission(price_xaf, family, tier, is_discovery_offer)`, barème M01 complet (familles A-E, tranches, multiplicateurs de palier, offre de découverte, plancher 700F/2%/marge). Vérifié manuellement (Django non installable dans ce sandbox) : reproduit exactement 17 840 F sur l'exemple canonique ITEL AC52 20 000F Bronze+découverte, et reproduit fidèlement l'écart connu du document source sur l'iPhone (12 950F au barème seul vs 14 676F de référence — point ouvert du paquet, non "corrigé" arbitrairement).
- [x] `backend/apps/vendors/test_commission.py` — 8 tests écrits (non exécutés faute de Django dans ce sandbox — à lancer en CI/environnement complet).
- [x] `frontend/src/services/api/vendorsV2.ts` — types + `vendorsV2Api.previewCommissionClientSide()` (même barème côté client, pour affichage immédiat pendant que l'écran de simulation backend n'existe pas).
- [ ] Endpoint backend de simulation `GET/POST commission-preview` (le calcul ne vit que côté client pour l'instant).
- [ ] Persistance famille produit + palier figés au paiement sur Order/OrderItem (seul `commission_rate_snapshot`, taux plat, existe aujourd'hui).
- [ ] Taux manquants pour les tranches hautes des familles B/D (>500 000F) et E (>50 000F) — reconduction du dernier taux documenté retenue par défaut, à faire valider.

## Lot 3 — Argent (VD-09)
- [x] `backend/apps/vendors/views_money_v2.py` — `GET /api/vendors/v2/money-summary/`, additif, calcule une approximation des 5 états (à verser/se libère/en cours/gelé/versé) et t_libération à partir des données existantes, sans migration.
- [ ] Vraie tâche planifiée de versement hebdomadaire (VER-01, table Payout/référence BLV-VS-nnnn) — approximée aujourd'hui via `WithdrawalRequest` (ancien système à la demande, avec frais — incompatible avec VD-09 qui est sans frais/minimum).
- [ ] Champ `Order.confirmed_at` dédié (t_fermeture utilise `updated_at` comme proxy) et branche "retrait + 7 jours".
- [ ] Champ moyen de paiement (carte vs Mobile Money) pour appliquer Δ=14j.
- [ ] Écrans frontend Mon argent / Se libère / Gelé / Mes gains / Documents / Versements / Numéro de versement — **pas construits cette session**, DockNav "Argent" reste sur `/seller/wallet` (v1).

## Lot 4 — Anonymat (VD-11)
- [x] Vérifié par grep sur tous les écrans construits cette session : aucune occurrence du mot "commission" affichée (uniquement en commentaires de code), identité client toujours masquée ("Identité masquée", pas de nom/quartier/relais).
- [ ] Écran Ma boutique / Horaires / Emplacement / Mon équipe — pas construits cette session (font partie du groupe "Ma boutique" de VD-11, non assigné).

## Lot 5 — Commandes (VD-04, VD-05, VD-06) — ✅ construit
- [x] Accueil (à faire / rien à faire / premier jour / hors connexion / compte suspendu) — `frontend/src/features/vendors/v2/accueil/` (14 fichiers), route `/seller/v2/accueil`, i18n `sl6`.
- [x] Commandes reçues / Commande à préparer / Rupture / Plus de temps / Bon de préparation / Journal — `frontend/src/features/vendors/v2/commandes/` (12 fichiers), i18n `sl7`.
- [x] Remise au livreur / Remis / Reçu vendeur / 6 cas d'erreur — mêmes fichiers (HandoverPage, HandoverDonePage, ReceiptPage, ErrorCard).

## Lot 6 — Litiges et retours (VD-07) — ✅ construit
- [x] Litiges reçus / Répondre (3 postures) / Décision et suites — décision humaine avec présomption client partout, **aucun texte d'arbitrage automatique**.
- [x] Retours en cours / Inspection à la réception (3 temps) / Proposer un remplacement.
- [x] `frontend/src/features/vendors/v2/litiges/` (9 fichiers), i18n `sl8`.

## Lot 7 — Ouverture en trois temps (VD-03) — ✅ construit
- [x] Connexion (réutilise Google/Apple existants) / Ouvrir ma boutique / Publier et être payé (KYC + contrat) / Saisie assistée / Installer l'app.
- [x] `frontend/src/features/vendors/v2/ouverture/` (13 fichiers), i18n `sl9`. Routes publiques `/vendeur/connexion`, `/vendeur/ouvrir-boutique`, `/vendeur/publier-et-etre-paye` (pas encore liées depuis nulle part dans l'UI — accessibles par URL directe pour test).
- [ ] Signature de contrat réelle (`POST /contract/sign`) — actée en `localStorage` pour l'instant, documenté comme non probant légalement.
- [ ] 2FA de connexion réellement par SMS (CNX-01) — le backend envoie par e-mail aujourd'hui (`AuthContext.verify2FA`), l'écran nomme honnêtement le canal réel.

## Lot 8 — Trust Score (VD-10) — ✅ construit (écrans), diff formel non fait
- [x] Mon palier / Mon score / Les paliers (Bronze/Argent/Or/Platine, jamais "Diamant") / Sanctions et contrôle / Contester / Les plans (Free/Boost/Pro/Sur-mesure) / Simulateur / Se faire voir.
- [x] `frontend/src/features/vendors/v2/compte/{trust-score,sanctions,plans,visibilite}/`, i18n `sl11`.
- [ ] **Diff ligne à ligne du moteur de score contre le V5.5 canonique — toujours pas fait.** `VendorProfile.certification_tier` garde l'ancien enum BRONZE/SILVER/GOLD/DIAMOND ; un mapping défensif (`mapLegacyTier`) traite DIAMOND comme Platine côté affichage seulement, question ouverte non tranchée.

## Lot 9 — Catalogue (VD-08) — ✅ construit
- [x] Mes produits / Une offre / Nouvelle offre (4 étapes, "vous gardez" en direct via `previewCommissionClientSide`) / Demander une fiche / Offre envoyée / Dupliquer.
- [x] `frontend/src/features/vendors/v2/catalogue/` (13 fichiers), i18n `sl10`. Prix minimum 500F appliqué, "recherche d'abord" respecté.
- [ ] Plusieurs éléments UI honnêtement désactivés faute d'endpoint (bande "moins cher ailleurs", statut de modération, `cod_allowed`, famille de commission par fiche — famille A prise par défaut) — repérables via `grep -rn "MANQUE BACKEND" frontend/src/features/vendors/v2/catalogue`.

## Lot 10 — Croissance et compte (VD-10, VD-11) — ✅ construit
- [x] Paramètres / Sécurité, appareils et données / Notifications / Avis et droit de réponse / Messagerie / Aide.
- [x] `frontend/src/features/vendors/v2/compte/{parametres,securite,notifications,avis,messagerie,aide}/`, i18n `sl11` (partagé avec Lot 8).
- [ ] Plusieurs écrans sont des coquilles avec état vide honnête faute d'endpoint (`GET /account/status`, `/account/decisions`, `/notifications`, `/reviews`, `/threads`, `/devices`, `POST /score/appeal`, `/me/export`, `/account/closure`).
- [ ] Horaires / Emplacement / Mon équipe (VD-11, groupe "Ma boutique") — pas construits, restent sur le placeholder `/seller/v2/:screen`.

---

## Questions ouvertes remontées par les agents (non tranchées, à valider)

- **Contradiction interne signalée mais non résolue** : `DIAMOND` existe encore dans `VendorProfile.certification_tier` alors que VD-D11.A01 supprime le palier "Diamant" — mappé défensivement à Platine côté affichage, migration de données non faite.
- **Simulateur de plans** : dépend de `commission_rate` renvoyé par `/api/vendors/plans/`, qui reflète peut-être encore l'ancienne grille (VD-D13.A02 demande de la retirer) plutôt que la formule bonus D8 — exactitude à revérifier une fois le backend des plans mis à niveau.
- **Pidgin (CNX-05/CIN-09)** : sélecteur affiché dans Paramètres mais désactivé (pas de 3ᵉ fichier i18n `pcm` enregistré) — cohérent avec la contradiction déjà notée dans la synthèse (arbitrage 12 de VD-12 vs règle client CIN-09).
- **Taux de tranches hautes non documentés** pour les familles B, D (>500 000F) et E (>50 000F) du barème de commission — reconduction du dernier taux retenue par défaut.
- **Classe de colis (S/M/L/XL)**, **paiement au comptoir (`cod_allowed`)**, **photos de remise** : aucun champ API dédié côté vendeur aujourd'hui — masqués/approximés plutôt qu'inventés, prêts à être branchés dès que les champs existeront.

## Prochaine étape immédiate

1. Faire tourner `backend/apps/vendors/test_commission.py` dans un environnement avec Django installé (ce sandbox ne l'a pas).
2. Construire le Lot 3 frontend (écrans Mon argent), qui manque encore — c'est le seul onglet du Dock qui pointe toujours vers une page v1.
3. Faire le diff formel Trust Score v2 vs V5.5 canonique avant de considérer le Lot 8 vraiment terminé.
4. Construire le reste de VD-11 "Ma boutique" (Horaires/Emplacement/Équipe) — actuellement sur placeholder.
5. Décider où brancher les nouvelles pages `/vendeur/connexion` etc. (remplacer l'entrée `/login` actuelle du portail vendeur, ou les laisser en parallèle ?).
