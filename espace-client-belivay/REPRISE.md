# BelivaY — point d'entrée pour reprendre le travail

Ce dépôt contient l'espace client de BelivaY (site web), les règles de calcul côté serveur et un kit prêt à brancher
dans le serveur de production **relaya-marketplace** (Django). Tout est écrit dans les langages et versions de
l'équipe relaya, pour qu'elle reprenne le travail sans rien convertir.

## Ce qu'il y a, et dans quel langage

| Dossier | Contenu | Langage et versions (alignés sur relaya-marketplace) |
|---|---|---|
| `site/` | Espace client complet : téléphone, tablette, ordinateur ; animations, sons, diaspora, listes, « Reçus »… | TypeScript 5.9, React 19.2, React Router 7, Vite 7, i18next 25 (FR/EN), Tailwind 3.4 (cohabite avec le CSS existant) |
| `moteurs/` | Règles de calcul pures (frais, garde, comptoir, annulation, carte et devises, litiges, notes, portefeuille, états) | Python 3.11 (production relaya) et 3.12 ; aucune dépendance ; conventions de leur domaine `payments` (francs en `int`, taux en `Decimal`, arrondi HALF_UP, trace) |
| `backend-kit/` | Contrat d'API `openapi.yaml` (OpenAPI 3.1) + 13 applications Django REST prêtes à copier dans `backend/apps/` + projet d'essai | Python 3.11, Django 5.1, Django REST Framework 3.14, simplejwt, drf-spectacular (comme relaya) |

## Par où commencer

1. **Équipe back-end** : `backend-kit/REPRISE-BACKEND.md` — ordre des chantiers, réglages (`token_blacklist`,
   CORS pour le site, variables d'environnement, prestataires SMS / Mobile Money / carte / push), décisions à prendre.
   Le contrat est `backend-kit/openapi.yaml` ; les calculs passent par `moteurs/` (`moteurs/README.md`,
   `moteurs/CORRESPONDANCE-RELAYA.md`).
2. **Équipe front-end** : `site/README.md`, puis :
   - `site/CONNECTEURS.md` — chaque fonction du site, la route serveur qui lui correspond (branchée ou à créer) et
     les services externes ; bascule démo → serveur : `VITE_SOURCE=api`, `VITE_API_URL` (voir `site/.env.example`) ;
   - `site/DISPOSITION-ECRANS.md` — dispositions téléphone / tablette / ordinateur, page par page ;
   - `site/TAILWIND.md` — écrire du nouveau code en Tailwind avec les jetons BelivaY.
3. **Historique et décisions du porteur** : `HANDOFF.md` et `logique-metier/decisions-porteur.md`.

## Lancer et vérifier

```bash
# Site (Node ≥ 20.19)
cd site && npm ci && npm run dev           # http://localhost:5173 (données de démonstration)
npx tsc -b && npm run build                 # types et build de production
npx playwright test                          # toutes les suites (téléphone, pixel, grands écrans, boutons…)

# Règles de calcul
cd moteurs && uv run --python 3.11 pytest   # couverture 100 % exigée

# Kit back-end (projet d'essai SQLite)
cd backend-kit/_essai && ./lancer-tests.sh

# Le site contre le vrai serveur (kit + imitation des routes existantes de relaya), en local
cd backend-kit/_essai && ./lancer-serveur.sh 8010                                   # serveur d'essai + jeu de démo
cd site && VITE_SOURCE=api VITE_API_URL=http://localhost:8010/api npx vite --port 5180   # http://localhost:5180
cd site && npx playwright test -c pw-api.config.ts                                   # parcours de bout en bout
```

Détails (comptes de démo, routes réservées à l'essai : codes SMS, webhooks, livreurs et relais, banque 3-D Secure) :
`backend-kit/REPRISE-BACKEND.md` § 9.

## État au 5 octobre 2026

- Site : données de démonstration par défaut ; en mode serveur (`VITE_SOURCE=api`), 218 fonctions sur 222 sont
  branchées (routes du kit et routes existantes de relaya), une implémentation par fonction dans
  `site/src/api/domaines/` ; les 4 autres attendent les SDK Google / Apple et WebAuthn (`CONNECTEURS.md`).
- **Vérifié contre un vrai serveur** : le site en mode API a parcouru 11 parcours de bout en bout contre le projet
  d'essai du kit (inscription et code SMS, connexion, catalogue, panier, paiement Mobile Money par webhook, code de
  retrait et remise, litige, avis, messagerie, liste d'envies et cadeau, cotisation via « Reçus », diaspora avec
  vérification renforcée et 3-D Secure, photos et variantes WebP, prix changé, session expirée, 429) :
  `site/tests/api-bout-en-bout.spec.ts`. Kit : 558 tests verts.
- Cartes : OpenStreetMap aujourd'hui ; Google Maps par simple réglage (`VITE_MAPS=google`, `VITE_GOOGLE_MAPS_KEY`).
- Carte bancaire : le site ne transmet jamais le numéro ni le CVC, seulement un jeton du prestataire
  (`site/src/connecteurs/paiementCarte.ts`) ; le prestataire réel reste à brancher avec le compte marchand.
- Ce qui reste à l'équipe relaya : installer le kit (§ 3), brancher les prestataires réels (SMS, push, carte,
  `collect` Mobile Money) et leurs webhooks sur `client_core.webhooks.confirmer_paiement_externe`, servir
  `espace_client` dans `OrderDetailSerializer` (D14), appeler `pickup.evenements` depuis les applications livreur et
  relais ; liste détaillée dans `backend-kit/REPRISE-BACKEND.md` (§ 2 « À finir », § 5, § 6).
