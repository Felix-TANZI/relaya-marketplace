# Espace entreprise de livraison — méthode de reprise d'un écran

Application `espace-entreprise/`, servie sous `/entreprise/` (développement : port 5176 ; tests : 4177 ; `PORT_ENTREPRISE` pour une autre copie), même famille
que le client et le vendeur (alias `@client/*` vers `site/src`, mêmes animations, bulle de verre, retour mémorisé,
feuilles). Patron repris de `espace-vendeur/` ; le prototype n'est qu'un squelette (DP-60 : on fait mieux).

Lire d'abord : `logique-metier/decisions-porteur.md` (DP-60, DP-63 l'emportent), l'extraction
`logique-metier/livraison/extraction/01-03` (règles, paramètres, écrans ENT-P01 à P27, API `/api/company/*`).

## 1. Règles de fond

1. **Outil de travail d'un responsable de flotte, ORDINATEUR D'ABORD** (tableaux, carte, affectation) ; tablette et
   téléphone complets. Ordinateur : barre latérale groupée et barre du haut ; tablette : barre du haut, barre latérale
   en tiroir ; téléphone : barre du bas (Tableau, Paquets, Missions, Menu).
2. **DP-63** : BelivaY n'affecte jamais un livreur. Paquet publié à l'entreprise par zone (groupé vers les relais,
   une seule commande à domicile, aucun groupage à domicile au lancement) ; l'entreprise le prend et affecte son livreur.
   Domicile en moins de 5 h ; photo de preuve obligatoire à chaque changement de main, étape bloquée sans photo, file
   hors ligne ; code et QR uniques par colis ; position en direct ; versement chaque vendredi.
3. **Rôles** (ENT-RG-R25) : propriétaire (tout), répartiteur (paquets, affectation, suivi, incidents, flotte ; aucun
   montant détaillé), comptable (règlements, relevés ; ni acceptation, ni affectation, ni réponse aux litiges).
   Page réservée : `roles` dans la fiche de la route ; montant : `useMontantsVisibles()` ; geste : `usePeut([...])` ;
   la source refuse de toute façon (`AccesRefuse`, 403 ROLE_FORBIDDEN). Démonstration : `?role=repartiteur`.
4. **Aucune valeur dans le code** : délais, plafonds, seuils lus par `src/calculs/registre.ts` (PARAMETRES) dans
   le registre officiel (`logique-metier/parametres-en-vigueur.json`) ; un paramètre de l'extraction encore absent
   (`src/genere/parametres-manquants.json`) y entre d'abord par une décision du porteur. Les chiffres du jeu d'essai (`src/demo/jeu-essai.ts`) sont des données.
5. **Couleurs** : uniquement les jetons de `src/styles/jetons.css` (seul fichier où une couleur est écrite ; vert
   sapin, palette finale DP-64, orange BelivaY pour les alertes seulement, contrastes AA notés en tête).
6. FR / EN partout (`t()`, `tf()`), clair / sombre / automatique, taille du texte (rem + `--zoom`), aucun lien mort.
7. Ne jamais pousser ni fusionner sans le signal du porteur ; commits en français, un par écran ou par sujet.

## 2. Qui touche quoi (agents en parallèle)

| Fichier | Qui |
|---|---|
| `src/pages/ENT-xx/**` (écrans, `routes.ts`, composants propres) | l'agent du groupe seulement |
| `src/donnees/domaines/<domaine>.ts`, `src/demo/<domaine>.ts` | l'agent qui possède le domaine |
| `src/i18n/ENT-xx.en.json` (et `ENT-xx.fr.json` pour corriger un texte) | l'agent du groupe |
| `tests/ENT-xx.gestes.spec.ts` | l'agent du groupe |

| Groupe | Écrans | Domaines possédés |
|---|---|---|
| ENT-03 | connexion (P01), tableau (P02), contrat (P03), etat (P27) | session, compte, tableau, contrat |
| ENT-04 | zones (P04), flotte (P05), livreur (P06), ajout (P07), vehicules (P08) | zones, flotte, livreurs, vehicules |
| ENT-05 | sla (P09), paquets (P10), paquet (P11), affectation (P12) | prix, paquets, affectation |
| ENT-06 | missions (P13), incidents (P14), colis (P15), preuves (P16) | missions, carte, incidents, colis, preuves |
| ENT-07 | litiges (P17), reglements (P18), releves (P19), score (P20) | litiges, reglements, releves, score |
| ENT-08 | emballages (P21), messages (P22), notifications (P23), parametres (P24), rapports (P25), integrations (P26) | emballages, messages, notifications, parametres, rapports, integrations |

Fichiers communs (vague d'intégration seulement) : `src/composants/*`, `src/config/*`, `src/donnees/{source,communs,
useLecture}.ts`, `src/demo/{stockage,horloge,jeu-essai,acces,compteurs,source-demo,lectures}.ts`, `src/calculs/*`,
`src/styles/*`, `src/{App,main,session,preferences}.tsx`, `src/i18n/{dictionnaire.ts,commun.en.json}`,
`src/pages/{Provisoire,Introuvable}.tsx`, `src/pages/ENT-00/*`, `tests/{commun,squelette,boutons,retour,larges}.*`,
`outils/*`, `vite.config.ts`, `package.json`. Rien dans `site/` ni `espace-vendeur/`. `lectures.ts` regroupe les
démonstrations minimales du socle : un groupe qui reprend un domaine en sort le sien dans `src/demo/<domaine>.ts`.

## 3. Reprendre un écran, pas à pas

1. **Point de départ** : la page provisoire (`/entreprise/<route>`) montre ce que l'extraction attend de l'écran
   (`src/genere/ecrans.json` : états, éléments, actions et leurs destinations, en liens).
2. **Écrire** `src/pages/ENT-xx/<Écran>.tsx` (`export default function`) dans la coque :
   `<Ecran route="paquet" titre={…} actions={…}>…</Ecran>` (titre et parent viennent de la fiche de la route ;
   `titre` / `retour` seulement quand ils portent une donnée ; `actions` : boutons à droite du titre). La coque pose le
   titre de niveau 1 : l'écran commence ses sections en `h2`.
3. **Données** : `useLecture(() => source.<domaine>.<méthode>(), [clés])` ; jamais d'import de `src/demo/` dans un
   écran. Méthode manquante : type dans le domaine, démonstration dans `src/demo/<domaine>.ts` (état dans
   `magasin('<domaine>', …)`, valeurs du registre). Un geste écrit dans la source ; l'écran relit tout seul.
4. **Textes** : `t('texte français exact')`, `tf('Il reste {n} paquets', { n })` ; traduction dans
   `src/i18n/ENT-xx.en.json`. `node outils/textes.mjs` liste ce qui manque. Montants : `F(n)` de `@client/i18n/format`.
5. **États** : vide (icône, phrase, raison, action), chargement (`.chargement`), erreur (bandeau, données gardées,
   Réessayer), hors ligne (bandeau de la coque), rôle (réservé). Paramètre absent (`/paquet` sans `id`) : la liste.
6. **Brancher** : dans `src/pages/ENT-xx/routes.ts`, `composant: () => import('./Paquet')`, `statut: 'repris'` ;
   puis `npm run inventaire`.
7. **Tester** : `tests/ENT-xx.gestes.spec.ts` (gestes et règles) ; `BOUTONS_ROUTES=paquet npx playwright test
   tests/boutons.spec.ts` (aucun élément sans effet, aussi avec `BOUTONS_LARGEUR=1280`) ; `tests/squelette.spec.ts`.
8. **Vérifier trois fois** (règles et registre, tests verts, relecture), puis commit.

## 4. Socle disponible

- **Un seul kit du prototype** (BRIEF-PROTOTYPE, 11 oct. ; BRIEF-ENRICHISSEMENT, 12 oct.) : les briques du contenu en
  React, `src/composants/prototype.tsx` (`Px`, `Tete`, `Sec`, `Li`, `Kpi`, `Panel`, `Note`, `Banniere`, `Hint`, `Vide`,
  `Pill`/`St`, `Kv`, `Props`, `Table`, `Choix` (onglets, segments, puces), `Champ` (C.fld autour d'un vrai champ),
  `Tg`, `Barre`, `BarresH`, `Courbe`, `Anneau`, `Av`, `Qui`, `Frise`, `Plus`, `Divide`, `Rangee`, `Etape`, `Verrou`, et
  les enrichissements : `FileEnAttente`, `Rebours`/`useRestant`, `useAnnuler`, `Recherche`, `Tri`, `Puces`,
  `AucunResultat`, `Compte`, `Exports`/`exporterCsv`/`exporterPdf`, `Limite`, `Interdit`, `BarrePouce`) ;
  leurs styles, `src/styles/contenu.css` (`outils/contenu-prototype.mjs`, sous `.px`, jetons DP-64 seulement) et
  `src/styles/enrichi.css`. La coque
  pose `.px` sur `<main>` et sur les feuilles : tout écran est dans le kit. `src/styles/prototype.css`
  (`outils/styles.mjs`) ne garde que la COQUE du prototype (en-têtes, barre du bas, console, connexion, boutons) ;
  `ecarts.css` la corrige (DP-64, contraste, 44 px). Plus aucune classe `.ea-*` : ce qui manque au kit va dans la
  feuille du groupe (`ENT-03/ent.css` : carte des zones, fichier choisi, cases à cocher). Un écran garde les blocs du
  prototype dans leur ordre ; le contenu en plus va dans une page ajoutée.
- **Coque** (`src/composants/coque.tsx`, structure du prototype : rootHeader, subHeader, dock à trois onglets (le Menu s'ouvre par « ☰ »),
  sidebar, topbar, page()) : `Ecran` (`kicker`, `titre`, `sous`, `actions`, `entete`, `plein`), `CarteEntreprise`,
  `BarreDuBas`, `entreeActive`, `useNavigation`, `useAppareil` (html[data-device]), `useTexteEtat` ; Menu et Profil
  (`src/pages/ENT-00`, distincts : l'avatar ouvre le Profil), `PreferencesDuMenu`, `Garde` (`Reserve`),
  `Rognage` (photo ronde ou bandeau), `Icone` (icônes du prototype + vendeur, `src/genere/icones.json`),
  `BandeauHorsLigne`. Feuilles : `Feuille`, `useFeuille` de `@client/composants/Feuille`.
- **Navigation** : `src/config/navigation.ts` (groupes, compteurs), `src/config/pages.ts` (`chemin`, `ONGLETS`),
  `src/config/routes.ts` (fiches), `src/config/libelles.ts` (rôles, états du compte, paliers).
- **Session** (`src/session.tsx`) : `useSession`, `useRole`, `useMontantsVisibles`, `usePeut`, `useRouteOuverte`,
  `useHorloge`, `useSeDeconnecter`.
- **Source** (`src/donnees/source.ts`) : 27 domaines (session, compte, tableau, contrat, zones, flotte, livreurs, equipe,
  vehicules, prix, paquets, affectation, missions, carte, incidents, colis, preuves, litiges, reglements, releves,
  score, emballages, messages, notifications, parametres, rapports, integrations). `VITE_SOURCE=api` refuse chaque
  appel tant que les connecteurs `src/api/domaines/*` ne sont pas écrits (vague 3).
- **Calculs** (`src/calculs/`, `npm run calculs`) : `PARAMETRES.acces | delais | paliers | pilote | litiges`,
  `entier()`, `nombre()` (lecture typée, refus si la forme change) ; `plafondDe`, `sousPlafond`, `palierSuivant`.
  Un moteur porté de `moteurs/belivay_moteurs` lit `PARAMETRES`, jamais le JSON.
- **Outils** : `outils/inventaire.mjs` (`pages.json`, `ecrans.json`, `parametres.json` ; `--verifier`),
  `outils/prototype.mjs` (icônes du prototype), `outils/textes.mjs` (traductions manquantes).

## 5. Lancer

```bash
export PATH=~/.local/node/bin:$PATH
cd espace-entreprise
npm ci
npm run dev                          # http://localhost:5176/entreprise/
npm run calculs                      # registre et calculs (Vitest)
npx playwright test                  # construit puis teste (aperçu sur le port 4177)
PW_REUTILISER=1 npx playwright test  # contre un aperçu déjà lancé : npx vite preview --port 4177
npm run donnees                      # relit le prototype et l'extraction
```
