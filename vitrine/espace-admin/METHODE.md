# Console d'administration — méthode de reprise d'un écran

Application `espace-admin/`, servie sous `/admin/` (développement : port 5178 ; aperçu et tests : 4179 ; `PORT_ADMIN`
pour une autre copie), même famille que l'entreprise et le livreur (alias `@client/*` vers `site/src`, mêmes
animations, bulle de verre, retour mémorisé, feuilles). Patron repris de `espace-entreprise/` ; le prototype ADMIN
(`data-app="adm"`, 38 pages) n'est qu'un squelette (DP-60 : on fait mieux, tout relié aux cinq autres espaces).

Lire d'abord : `logique-metier/decisions-porteur.md` (DP-60 à DP-67), `logique-metier/admin/A-VALIDER.md` (décisions
prises en l'absence du porteur, toutes « Proposé »), le document de l'écran dans le paquet ADMIN (ADM-03 à ADM-13) et
la matrice des droits d'ADM-01 § 11.

## 1. Règles de fond

1. **Ordinateur d'abord** (1440 px) ; tablette et téléphone complets pour l'astreinte. Ordinateur : barre latérale
   groupée (carte « Espace pays »), barre du haut ; tablette : barre latérale en tiroir (`?pop=menu`) ; téléphone :
   barre du bas File, Litiges, Argent, Menu (onglets propres à chaque rôle : `config/pages.ts` `ONGLETS_ROLE`).
2. **Pastille rôle · périmètre** toujours visible dans l'en-tête (ADM-ROL-01). Les droits sont contrôlés par la
   source (403), jamais seulement masqués.
3. **Huit rôles** (A-01) : `superviseur` Direction, `finance`, `support` Support client, `mediation`, `operations`
   Opérations et logistique (ses zones), `verification` Vérification et modération, `audit` Conformité et audit,
   `terrain` Agent terrain. Un agent cumule des rôles et agit sous un seul (« Agir en tant que », ADM-ROL-02).
   - page : `src/config/droits.ts` (`oui | lecture | zone | part | aucun` + note) ; dans un écran `useDroit(route)` ;
   - geste transverse : `usePeut('demasquer' | 'contresigner' | 'exporter' | …)` ;
   - périmètre de zones : `usePerimetre()` (Opérations : Z1, Z2, Z3, Z6) ; la source filtre (`auPerimetre`).
4. **Toute décision passe par `DecisionMotivee`** (motif écrit ≥ `motif_min_caracteres`, preuves citées ; quatre yeux :
   un second validateur d'un AUTRE compte) ; la source journalise. **La console n'affecte jamais un livreur** et ne fait
   jamais le travail d'un espace (A-02, DP-63) : elle active, surveille, tranche, intervient en secours avec motif.
5. **Données personnelles masquées** (`visibilite-anonymat.json`, loi n° 2024/017) : `Masque` (démasquage motivé,
   journalisé, temporaire), `PieceIdentite` (lien court à durée limitée, filigrane). Aucun total client à qui n'a pas
   l'argent.
6. **Aucune valeur dans le code** : `src/calculs/registre.ts` (`PARAMETRES.console`, `zonesExploitees`, `mentions`) lit
   le registre officiel, complété par les paramètres PROPOSÉS (`src/config/parametres-proposes.ts`, A-VALIDER § 4).
7. **Couleurs** : seulement les jetons de `src/styles/jetons.css` (graphite #334155 ; orange BelivaY pour l'action et
   l'alerte seulement ; sombre quasi noir). Les noms `--e…` désignent l'accent de l'interface (graphite ici).
8. FR / EN partout (`t()`, `tf()`), clair / sombre / automatique, taille du texte sur 8 crans, aucun lien mort.
9. **Fonctions d'après lancement cachées** : une route avec `interrupteur: 'FF-…'` disparaît et renvoie à l'accueil tant
   que l'interrupteur est fermé (assistant IA : FF-IA, fermé).
10. Ne jamais pousser ni fusionner sans le signal du porteur ; commits en français, un par écran ou par sujet.

## 2. Qui touche quoi (six agents d'écran en parallèle)

| Groupe | Écrans (routes) | Domaines possédés (`src/donnees/domaines/<d>.ts`, `src/demo/<d>.ts`) |
|---|---|---|
| **S1** | ADM-00 (menu, profil), ADM-03 (connexion, file), ADM-04 (litige, commandes), `direct` (Vue d'ensemble), AJ-A `quatreyeux`, `recherche` | session, direct, files, quatreyeux, litiges, commandes |
| **S2** | ADM-05 (escrow, remboursements, versements, rapprochement), `commissions` (ADM-10), AJ-A `export` (export comptable) | argent ; dans pilotage : les commissions |
| **S3** | ADM-06 (kyc, vendeurs, paliers, sanctions), ADM-07 (catalogue, moderation, avis, clients) | acteurs, catalogue |
| **S4** | ADM-08 (relais, entreprises, livreurs, paquets), ADM-09 (zones, carte, emballages), AJ-A `candidatures` | logistique |
| **S5** | `parametrage`, `promotions` (ADM-10), ADM-11 (messagerie, panne, support), AJ-A `interrupteurs`, `modeles` (modèles SMS) | pilotage (hors commissions), communication ; dans systeme : les interrupteurs |
| **S6** | ADM-12 (fraude, journal, roles, pays, comptes), ADM-13 (rapports, sante, legal, assistant), AJ-A `taches`, `conservation` | gouvernance, systeme (hors interrupteurs) |

| Fichier | Qui |
|---|---|
| `src/pages/ADM-xx/**` (écrans, `routes.ts`, composants et feuille propres) | l'agent du groupe seulement |
| `src/pages/AJ-A/routes.ts` | chacun ne change QUE la ligne de sa page (une route par ligne, séparées) |
| `src/pages/AJ-A/<Page>.tsx` | l'agent qui tient la page (table ci-dessus) |
| `src/donnees/domaines/<d>.ts`, `src/demo/<d>.ts` | l'agent qui possède le domaine ; un domaine encore dans `src/demo/lectures.ts` en sort dans `src/demo/<d>.ts` et se branche dans `source-demo.ts` (une ligne) |
| `src/i18n/ADM-xx.en.json` (et `ADM-xx.fr.json` pour corriger un texte) | l'agent du groupe (aucune clé déjà dans un autre fichier) |
| `tests/ADM-xx.gestes.spec.ts` | l'agent du groupe |

**Fichiers communs (vague d'intégration seulement)** : `src/composants/*`, `src/config/*` (droits, navigation, pages,
routes, libellés, paramètres proposés), `src/donnees/{source,communs,useLecture,exports,fileHorsLigne}.ts`,
`src/demo/{stockage,horloge,pont,jeu-essai,acces,journal,compteurs,source-demo}.ts`, `src/calculs/*`, `src/styles/*`,
`src/{App,main,session,preferences}.tsx`, `src/i18n/{dictionnaire.ts,commun.en.json}`, `src/pages/{Provisoire,
Introuvable}.tsx`, `tests/{commun,squelette,boutons,retour,larges,lisibilite,transitions,roles}.*`, `outils/*`,
`vite.config.ts`, `package.json`. Un besoin dans un fichier commun : le noter dans `src/pages/ADM-xx/INTEGRATION.md`.
Rien dans `site/`, `espace-vendeur/`, `espace-entreprise/`, `espace-livreur/`, ni `backend-kit/`.

## 3. Reprendre un écran, pas à pas

1. **Point de départ** : la page provisoire (`/admin/<route>`) montre ce que le prototype montre de l'écran
   (`src/genere/ecrans.json` : page ADM-Pxx, états, sections et panneaux, dans l'ordre) et le droit du rôle connecté.
2. **Écrire** `src/pages/ADM-xx/<Écran>.tsx` (`export default function`) dans la coque :
   `<Ecran route="litige" titre={…} actions={…}>…</Ecran>`. La coque pose le h1 : l'écran commence en `h2`. Garder les
   blocs du prototype dans leur ordre ; le contenu en plus va dans une page ajoutée (AJ-A).
3. **Données** : `useLecture(() => source.<domaine>.<méthode>(), [clés])` ; jamais d'import de `src/demo/` dans un écran.
   Méthode manquante : type dans le domaine, démonstration dans `src/demo/<domaine>.ts` (état dans
   `magasin('<domaine>', …)`, `exigerPage(route)`, `exiger(permission)`, `auPerimetre(liste)`, `journaliser({…})`).
4. **Gestes** : `DecisionMotivee` pour toute décision (quatre yeux selon la règle du paquet), `CarteQuatreYeux` pour
   contresigner, `Masque` / `PieceIdentite` pour une donnée personnelle, `ExportSigne` pour un export, `Perimetre`
   en tête d'une liste limitée, `LigneJournal` pour l'historique d'un dossier.
5. **Textes** : `t('texte français exact')`, `tf('Il reste {n} cartes', { n })` ; traduction dans
   `src/i18n/ADM-xx.en.json` ; `node outils/textes.mjs` liste ce qui manque. Montants : `F(n)` de `@client/i18n/format`.
6. **États** : vide (icône, phrase, raison, action), chargement, erreur (bandeau, données gardées, Réessayer), hors
   ligne, rôle (« Réservé à d'autres rôles » : automatique), lecture seule (aucun bouton de geste).
7. **Brancher** : dans `routes.ts`, `composant: () => import('./Litige')`, `statut: 'repris'` ; puis `npm run inventaire`.
8. **Tester** : `tests/ADM-xx.gestes.spec.ts` (gestes, règles, chaque rôle concerné via `?role=`) ;
   `BOUTONS_ROUTES=litige npx playwright test tests/boutons.spec.ts` (et `BOUTONS_LARGEUR=1280`) ; `tests/squelette`,
   `tests/roles`, `tests/lisibilite` sur ses routes. **4 workers Playwright au plus** (`--workers=4`).
9. **Vérifier trois fois** (règles et registre, tests verts, relecture), puis commit.

## 4. Socle disponible

- **Coque** (`src/composants/coque.tsx`) : `Ecran` (`kicker`, `titre`, `sous`, `actions`, `entete`, `plein`),
  `CartePays`, `BarreDuBas`, `useOnglets`, `useTexteRole`, `entreeActive`, `useNavigation`, `useAppareil`,
  `idGroupe`, `Reglages` ; Menu et Profil (`src/pages/ADM-00`) ; `Garde` (`Reserve`), `Raccourcis` (« g » + f, v, l, c,
  a, k, p, j, q), recherche (`composants/recherche.ts` : pages du rôle, identifiants BLV-, PQ-, LT-, KYC-, RB-, QY-, SP-).
- **Kit du prototype** (`src/composants/prototype.tsx`, styles `contenu.css` générés sous `.px`, `enrichi.css`) : le
  même que l'entreprise (`Panel`, `Kpi`, `Li`, `Table`, `Choix`, `Champ`, `Tg`, `Rebours`, `Recherche`, `Exports`…) ;
  les classes propres de la console (`admA-`, `adme-`, `admk-`, `admlg-`, `admm-`, `admp-`) sont reprises.
- **Composants de la console** : `DecisionMotivee`, `CarteQuatreYeux`, `Masque` (+ `regleConsole`), `PieceIdentite`,
  `Perimetre`, `LigneJournal` (+ `Heure`), `ExportSigne` (+ `csvSigne`) ; styles `src/styles/console.css`.
- **Session** (`src/session.tsx`) : `useSession` (agent, rôle, pays, badges, interrupteurs), `useRole`, `useDroit`,
  `usePeut`, `usePerimetre`, `useRouteOuverte`, `useHorloge`, `useSeDeconnecter`, `useRelireSession`.
- **Source** (`src/donnees/source.ts`, `SourceAdmin`) : 14 domaines — session, direct, files, quatreyeux, litiges,
  commandes, argent, acteurs, catalogue, logistique, pilotage, communication, gouvernance, systeme. `VITE_SOURCE=api`
  refuse chaque appel tant que les connecteurs ne sont pas écrits (kit `backend-kit/apps/console`).
- **Démonstration** : horloge du mardi 13 oct. 2026 14 h 05 (Yaoundé), départ partagé avec l'entreprise et le livreur ;
  jeu d'essai des six espaces (`src/demo/jeu-essai.ts`) ; journal chaîné SHA-256 (`src/demo/journal.ts`, chaque geste y
  écrit) ; pont (`src/demo/pont.ts`, même mécanisme que l'entreprise et le livreur, `app: 'admin'`) : la File d'action
  lit le kit contesté, l'incident bloquant, le départ demandé ; la console publie déjà `livreur_suspendu`
  (`source.logistique.suspendreLivreur`) ; `livreur_retabli`, `kit_decide` et `depart_clos` (`par: 'admin'`) sont typés,
  à publier par S4.
- **Comptes de démonstration** (`?role=<code>`, ou Profil → « Se connecter comme ») : Direction Franck Penga (cumule
  Médiation), Finance Nadège Eyenga, Support Clarisse Mvondo, Médiation Mireille Ngo Bassong (désignation à confirmer),
  Opérations Yannick Owona (Z1, Z2, Z3, Z6), Vérification Armand Kouam, Audit Béatrice Essomba, Terrain Stéphane Tchoua
  (binôme Linda Abena). Mot de passe d'essai : celui des autres démonstrations.
- **Outils** : `outils/ecrans.mjs` (relit le prototype, Playwright), `outils/inventaire.mjs` (`--verifier`),
  `outils/prototype.mjs` (icônes), `outils/styles.mjs`, `outils/contenu-prototype.mjs`, `outils/textes.mjs`.

## 5. Lancer

```bash
export PATH=~/.local/node/bin:$PATH
cd espace-admin
npm run dev                          # http://localhost:5178/admin/   (?role=finance, ?role=operations…)
npm run calculs                      # droits, registre, règles de la démonstration (Vitest)
npx playwright test --workers=4      # construit puis teste (aperçu sur le port 4179)
PW_REUTILISER=1 npx playwright test --workers=4   # contre un aperçu déjà lancé : npx vite preview --port 4179
npm run donnees                      # relit le prototype (icônes, styles, écrans) et l'inventaire
```
