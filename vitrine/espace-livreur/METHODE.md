# Espace livreur — méthode de reprise d'un écran

Ce document dit comment un agent reprend un groupe d'écrans `LIV-xx` **en parallèle des autres, sans les gêner**.
Le socle reprend le patron éprouvé de l'espace vendeur (`espace-vendeur/METHODE.md`) ; ce qui diffère est dit ici.

Lire d'abord : `logique-metier/decisions-porteur.md` (DP-60 surtout, puis DP-53, DP-54, DP-58, DP-59),
`logique-metier/livreur/extraction/*.json` (règles, paramètres, écrans, API, textes imposés, contradictions, questions
du paquet livreur), et le prototype (`outils/proto.mjs` dit où il est) — **squelette seulement**.

## 1. Règles de fond

1. **DP-60** : on ne recopie pas le prototype, on applique **toutes** les règles BelivaY, dites et cachées (celles qui
   découlent des autres interfaces, des DP et du cycle de la commande). Chaque page est complète, finie, reliée aux cinq
   autres applications, et l'administrateur doit pouvoir suivre et contrôler chaque règle. Une règle qui semble ne pas
   fonctionner, même décidée, se signale avec une proposition.
2. **Téléphone d'abord** : le livreur est sur la route, souvent d'une main, en plein soleil ou de nuit. Cibles de
   48 px au moins (56 px pour les boutons principaux et la barre du bas), textes courts, une action principale par
   écran, sons et vibrations (`signal()`), sombre automatique la nuit. Tablette correcte, ordinateur simple (même
   application, centrée).
3. **Hors connexion prioritaire** : toute action métier part avec une **origine** (`origine(maintenant)` : clé
   d'idempotence, heure et position du téléphone) et passe par `geste()` (faite en ligne, sinon mise en file et
   rejouée au retour du réseau). Rien de fait sur la route ne se perd (la Garde ne vide jamais la file).
4. **Ce que le livreur ne voit jamais** : contenu ni prix d'un colis, identité ou numéro du client, données d'un autre
   livreur, numéro de téléphone (appels masqués), compte de versement. Aucun type de `src/donnees/domaines/` ne porte
   ces champs (`tests/squelette.spec.ts` le vérifie).
5. **Aucune valeur dans le code** : délais, essais, seuils et montants viennent du registre
   (`src/calculs/registre.ts`, `PARAMETRES.livreur`) ou de la source. Un paramètre du paquet absent du registre
   (`src/genere/parametres-manquants.json`) s'y ajoute d'abord. Les chiffres du jeu d'essai sont des données.
6. **Pages logiques** (DP-53) : vraies saisies, vraies issues, aucun bouton mort, aucun lien « # », aucun état écrit
   d'avance ; états vide, chargement, erreur, hors connexion.
7. **Identité verte légère** (DP-60) : jetons de `src/styles/livreur.css` seulement (`--acc*` vert, `--or*` et
   `--alerte-btn*` orange BelivaY pour les alertes et l'urgence) ; contrastes AA en clair et en sombre.
8. **FR / EN** partout (`t()`, `tf()`), pas de pidgin (DP-13) ; même famille que le client (bulle de verre, feuilles,
   sons, animations coupées en mouvement réduit).
9. Ne jamais pousser ni fusionner sans le signal du porteur. Commits en français, un par écran ou par sujet.

## 2. Ce que chaque agent a le droit de toucher

| Fichier | Qui |
|---|---|
| `src/pages/LIV-xx/**` (ses écrans, son `routes.ts`, ses composants et sa feuille propres) | l'agent du groupe **seulement** |
| `src/donnees/domaines/<domaine>.ts` et `src/demo/<domaine>.ts` | l'agent qui possède ce domaine (tableau ci-dessous) |
| `src/i18n/LIV-xx.en.json` (anglais ajouté) ; `src/i18n/LIV-xx.fr.json` (corrections du français) | l'agent du groupe |
| `tests/LIV-xx.*.spec.ts` (gestes de ses écrans) | l'agent du groupe |

| Groupe | Écrans (route · page du paquet) | Domaines possédés |
|---|---|---|
| LIV-03 Accès | connexion P01, activation P02, certification P03, compte P32 | `session`, `acces` |
| LIV-04 Journée | aujourdhui P04, statut P05, paquet P06, kit P07 | `aujourdhui`, `disponibilite`, `paquets`, `kit` |
| LIV-05 Tournée | tournee P08, navigation P09 | `tournee` |
| LIV-06 Ramassage | arrivee P10, controle P11, audit P12, emballage P13, code-remise P14, refus P15 | `ramassage` |
| LIV-07 Remises | depot-relais P16, domicile P17, echec-domicile P18, collecte P19, retour-vendeur P20 | `remises` |
| LIV-08 Incidents et journée | incident P21, synchronisation P22, cloture P23 | `incidents`, `horsligne`, `journee` |
| LIV-09 Résultats | historique P24, activite P25, trust P26 | `historique`, `activite`, `trust` |
| LIV-10 Compte | messages P27, notifications P28, moi P29, aide P30, reglages P31 | `messages`, `notifications`, `moi`, `aide` |

Un domaine utilisé par deux groupes appartient au premier ; l'autre le **lit** et demande un ajout dans son compte
rendu.

**Fichiers communs — à ne modifier qu'en vague d'intégration** (signaler le besoin dans le compte rendu) :
`src/composants/*` (coque, Menu du profil, signaux, Garde, Icone, Rognage, PageProvisoire), `src/config/*`,
`src/donnees/{source,communs,useLecture,fileHorsLigne}.ts`, `src/demo/{jeu-essai,stockage,horloge,source-demo}.ts`,
`src/calculs/*`, `src/preferences.tsx`, `src/session.tsx`, `src/App.tsx`, `src/main.tsx`, `src/styles/*`,
`src/genere/*` (généré), `src/i18n/{dictionnaire,temps}.ts`, `src/i18n/commun.en.json`,
`tests/{commun,squelette,boutons,retour}.*`, `outils/*`, `vite.config.ts`, `package.json`.
**Rien dans `site/` ni `espace-vendeur/`** : un fichier d'une autre application à changer se note pour plus tard.

## 3. Reprendre un écran, pas à pas

1. **Point de départ** : la page provisoire `src/pages/LIV-xx/provisoires/<Écran>.tsx` (générée, ne jamais la
   modifier) montre la vraie coque et la fiche de l'écran (états, éléments, gestes du paquet).
2. **Créer l'écran** à côté : `src/pages/LIV-xx/<Écran>.tsx`, `export default function`, dans
   `<Ecran route="…">` (en-tête, retour, barre et menu du profil viennent de la route ; `titre=` / `retour=` quand ils
   portent une donnée ; `fixes=` pour les feuilles). Classes du socle : `l-carte`, `l-btn l-principal | l-second |
   l-alerte`, `l-vide`, `l-kicker`, `l-pill` ; une feuille propre au groupe (`src/pages/LIV-xx/livxx.css`) préfixée.
3. **Données** : `useLecture(() => source.<domaine>.<méthode>(), [clés])` ; jamais d'import de `src/demo/` dans un
   écran. Ajouter les méthodes manquantes dans le domaine (type) et sa démonstration (état dans
   `magasin('<domaine>', …)`, règles par `src/calculs`). Un geste écrit dans la source ; l'écran relit tout seul.
4. **Gestes** : `geste(enLigne, type, objet, origine(maintenant), () => source.…)` ; `signal('succes' | 'erreur' |
   'alerte' | 'nouveau' | 'toucher')` ; animations du client sous `mouvementLibre()`.
5. **Textes** : `t('texte français exact')`, `tf('Il reste {n} arrêts', { n })` ; anglais dans
   `src/i18n/LIV-xx.en.json` (le dictionnaire du prototype, `src/genere/en.json`, sert d'abord : ne pas y redoubler une
   clé). Heures et durées : `src/i18n/temps.ts`. Montants : `F()` de `@client/i18n/format`.
6. **Brancher** : dans `src/pages/LIV-xx/routes.ts`, faire pointer la route vers l'écran repris et passer son statut à
   `'repris'` (seul fichier de routage à toucher), puis `npm run inventaire`.
7. **Tester** : `tests/LIV-xx.gestes.spec.ts` ; `BOUTONS_ROUTES=<routes> npx playwright test tests/boutons.spec.ts`
   (écran repris : aucun élément sans effet ; provisoire : la coque seule est exigée) ; `tests/squelette.spec.ts` ;
   `tests/retour.spec.ts`.
8. **Vérifier trois fois** : conformité aux règles et au registre, tests verts, relecture ; puis commit.

## 4. Socle disponible

- **Coque** (`src/composants/coque.tsx`) : `Ecran`, `EnTeteRacine` (logo, thème, incident, cloche, avatar, pastilles
  disponibilité · colis sous garde · Trust), `EnTeteEnfant` (retour mémorisé, titre, incident), `BarreDuBas`
  (Aujourd'hui, Tournée, Messages, Moi ; bulle de verre du client), `usePastilles` ; `MenuProfil` (navigation groupée
  de `config/navigation.ts`, langue, thème, taille du texte, déconnexion) ; `Icone` (icônes du prototype) ; `Rognage`
  (photo ronde ou bandeau) ; `Feuille` et `useFeuille` du client (`@client/composants/Feuille`).
- **Session** (`src/session.tsx`) : `useSession` (livreur, état du compte, disponibilité, colis sous garde, Trust,
  badges), `useRelireSession`, `useHorloge`.
- **Source** (`src/donnees/source.ts`) : `SourceLivreur`, 19 domaines (`session`, `acces`, `aujourdhui`,
  `disponibilite`, `paquets`, `kit`, `tournee`, `ramassage`, `remises`, `incidents`, `horsligne`, `journee`,
  `historique`, `activite`, `trust`, `messages`, `notifications`, `moi`, `aide`) ; démonstration en `localStorage`
  (`blv_l_demo_*`, empreinte de forme : un état d'une forme ancienne est oublié). Source API : vague 3 (contrat
  `/api/courier/…` de l'extraction).
- **Hors connexion** (`src/donnees/fileHorsLigne.ts`) : `origine`, `geste`, `useEnLigne`, `useFile`, `enAttente`,
  `envoyerLaFile`, `noterPosition` ; bandeau commun (un écran le remplace par son élément `[data-hors-ligne]`).
- **Calculs** (`src/calculs/`, `npm run calculs`) : `PARAMETRES.livreur` (CODE-ESSAIS, SLA-ZONE-H, INC-NOTIF-MIN,
  RUPTURE-TENTATIVES), `lire()` pour un code nouveau ; un moteur = un fichier + ses tests.
- **Signaux** (`src/composants/signaux.ts`) : son du client + vibration propre ; réglages respectés.
- **Outils** : `outils/prototype.mjs` (icônes et anglais du prototype), `outils/inventaire.mjs` (pages.json,
  fiches.json, pages provisoires, paramètres absents du registre).

## 5. Lancer

```bash
export PATH=~/.local/node/bin:$PATH
cd espace-livreur
npm ci
npm run dev                          # http://localhost:5175/livreur/
npm run calculs                      # tests des calculs (Vitest)
npx playwright test                  # construit puis teste (aperçu sur le port 4176)
PW_REUTILISER=1 npx playwright test  # contre un aperçu déjà lancé : npx vite preview --port 4176
npm run donnees                      # relit le prototype et l'extraction (après une mise à jour du paquet)
```

Démonstration : PIN `240913`, code SMS `481920` (`src/demo/jeu-essai.ts`).
