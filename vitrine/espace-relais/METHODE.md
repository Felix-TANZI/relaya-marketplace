# Espace point relais — méthode de reprise d'un groupe d'écrans

Ce document dit comment un agent reprend un groupe d'écrans `PR-xx` **en parallèle des sept autres, sans les gêner**.
Le socle reprend le patron de l'espace livreur (`espace-livreur/METHODE.md`) ; ce qui diffère est dit ici.

Lire d'abord : `logique-metier/decisions-porteur.md` (DP-60 à DP-66 ; DP-08, DP-20, DP-24, DP-26),
`logique-metier/reference/Reste-a-faire-equipe-dev-v6.txt` D12 à D15 (**fait foi**), `logique-metier/relais/A-VALIDER.md`
(arbitrages ARL proposés), `logique-metier/relais/extraction/*.json` (règles, paramètres, écrans, API, textes imposés,
contradictions, questions du paquet), puis la page provisoire de chaque écran (le prototype transcrit).

## 1. Règles de fond

1. **Structure du prototype intacte, contenu enrichi** : l'écran repris part du balisage transcrit
   (`src/pages/PR-xx/provisoires/<Écran>.tsx` : mêmes blocs, même ordre, mêmes classes `p-…`) ; on remplace les données
   d'exemple par les vraies (source), on ajoute ce que les règles exigent ; ce qui ne tient pas dans l'écran devient une
   page ajoutée (route nouvelle dans le `routes.ts` du groupe). DP-60 : toutes les règles BelivaY, dites et cachées ;
   une règle qui semble ne pas fonctionner se signale avec une proposition (`logique-metier/relais/A-VALIDER.md`).
2. **Le gérant est un exécutant de terrain : le comptoir d'abord.** Recevoir, remettre, faire partir, constater : rapide,
   d'une main, une action principale par écran (56 px), dans la zone du pouce ; sons et vibrations (`signal()`).
3. **Le contractuel passe par BelivaY** (DP-66 appliquée au relais) : convention, commission et grille, horaires
   déclarés, capacité déclarée, suspension, sanctions, fin du partenariat : le gérant **voit** ou **demande**, il ne
   décide jamais (« le relais constate, BelivaY décide », GEN-06). Ses droits restent sous forme de demande : contester
   une décision une fois, demander ses données (loi n° 2024/017), demander la clôture (préavis), changer de numéro de
   versement (vérifié par une personne).
4. **v6** (D12 à D15) : garde 0/100/100/100/200/500/1 000 F (2 000 F sur 7 jours) payée **en espèces** au gérant au
   retrait, remise **bloquée** tant que l'encaissement n'est pas confirmé ; relais 100 F par jour, 1er jour payé par
   BelivaY ; renvoi après 7 jours ; commande à payer au comptoir en **Mobile Money** (jamais d'espèces), code jamais
   montré avant paiement ; photo à chaque changement de main, étape bloquée sans photo.
5. **Aucune valeur dans le code** : délais, essais, seuils, montants viennent du registre (`src/calculs/registre.ts`,
   `PARAMETRES.relais` ; codes absents : `src/genere/parametres-manquants.json`, provisoires) ou de la source. Les
   chiffres du jeu d'essai sont des données.
6. **Preuves** : photo obligatoire et bloquante aux étapes de PR-02 (GEN-04 ; ARL-11) ; constat = photos + motif.
7. **Hors ligne** : toute action métier part avec une `origine(maintenant)` (clé d'idempotence, heure) et passe par
   `geste()` (faite en ligne, sinon en file et rejouée au retour du réseau ; expirée au-delà de 72 h, jamais perdue en
   silence). Le paiement Mobile Money au comptoir exige le réseau (OFF-02).
8. **Anonymat** (GEN-01) : le relais ne voit jamais le nom, le téléphone ni l'adresse d'un client ou d'un vendeur ;
   le client se nomme « prénom et initiale » au plus ; seule exception : le nom du porteur désigné, pour sa pièce. Le
   gérant ne voit **jamais** le code de retrait : il saisit ou scanne ce que le client présente.
   `tests/squelette.spec.ts` vérifie les noms de champs des domaines.
9. **Droits** (PR-02, ARL-06) : propriétaire = tout ; employé de comptoir = recevoir, remettre (encaisser la garde),
   faire partir, constater, historique sans montants, fermeture du jour si le gérant le permet ; jamais l'argent du
   relais ni sa gestion. Déclarés dans `src/config/droits.ts` (`DROITS_ROUTE`, `DROITS_GESTE`) ; un écran masque un
   geste par `usePeut('…')` ; le serveur refait le contrôle.
10. **Pages logiques** (DP-53) : vraies saisies, vraies issues, aucun bouton mort, aucun lien « # » ; états vide,
    chargement, erreur, hors connexion, accès refusé.
11. **Couleurs** : jetons de `src/styles/jetons.css` seulement, aux **couleurs exactes du prototype** en clair et la nuit
    (ARL-172 : générées par `npm run transcrire` depuis ses styles en ligne et sa table DARK_MAP ; orange BelivaY du
    bouton principal et de la carte de tête, bleu #2456D6 des repères ; `--or*`, `--badge`, `--alerte-btn` pour
    l'urgence) ; aucune couleur écrite dans un écran.
12. **FR / EN** (`t()`, `tf()`), pas de pidgin (DP-13, DP-63) ; même famille que le client (verre, feuilles, sons,
    animations coupées en mouvement réduit : `mouvementLibre()`).
13. Ne jamais pousser ni fusionner sans le signal du porteur. Commits en français, un par écran ou par sujet.

## 2. Ce que chaque agent a le droit de toucher

| Fichier | Qui |
|---|---|
| `src/pages/PR-xx/**` (ses écrans, son `routes.ts`, ses composants et sa feuille `prxx.css` préfixée) | l'agent du groupe **seulement** (jamais `provisoires/`, généré) |
| `src/donnees/domaines/<domaine>.ts` et `src/demo/<domaine>.ts` | l'agent qui possède ce domaine (tableau ci-dessous) |
| `src/i18n/PR-xx.en.json` (anglais ajouté) ; `src/i18n/PR-xx.fr.json` (corrections du français) | l'agent du groupe |
| `tests/PR-xx.*.spec.ts` (gestes de ses écrans) | l'agent du groupe |

| Groupe | Écrans (route · écran du prototype) | Domaines possédés |
|---|---|---|
| PR-03 Accès | connexion, invitation, inscription, activation, statut-relais, installer | `session`, `acces` |
| PR-04 Guichet 1 | accueil (états `vide`, `hors-ligne`), reception, camera | `aujourdhui`, `reception` |
| PR-05 Guichet 2 | retrait, pin-remise, erreurs | `retrait` |
| PR-06 Stock | stock, colis (fiche), departs | `stock`, `departs` |
| PR-07 Incidents | litiges (constats, dépôts de retour, dossiers), fermeture, historique | `incidents`, `fermeture`, `historique` |
| PR-08 Communication | notifications, messagerie, aide | `notifications`, `messages`, `aide` |
| PR-09 Argent | versements, changer-momo, rapports, trust, avis, paliers | `argent`, `qualite` |
| PR-10 Mon relais | menu, capacite, equipe, documents, formation, parametres | `relais` |

Possédés par le **socle** (lus par tous, changés seulement en vague d'intégration) : le modèle central du colis
(`src/donnees/domaines/colis.ts`, `src/demo/colis.ts`, `src/calculs/{garde,cycle,capacite,comptoir}.ts`) et la file
hors connexion (`horsligne`). Un domaine utilisé par deux groupes appartient au premier ; l'autre le **lit** et demande
un ajout dans son compte rendu.

**Fichiers communs — à ne modifier qu'en vague d'intégration** (signaler le besoin dans le compte rendu) :
`src/composants/*` (coque, Garde, Icone, PageProvisoire, AccesReserve, signaux, TailleDuTexte), `src/config/*`
(routes, pages, navigation, droits), `src/donnees/{source,communs,useLecture,fileHorsLigne}.ts`,
`src/demo/{jeu-essai,stockage,horloge,pont,source-demo,scenario,colis}.ts`, `src/calculs/*`, `src/api/*`,
`src/preferences.tsx`, `src/session.tsx`, `src/App.tsx`, `src/main.tsx`, `src/styles/*` (jetons, prototype généré,
relais), `src/genere/*` (généré), `src/i18n/{dictionnaire,temps}.ts`, `src/i18n/commun.en.json`,
`tests/{commun,squelette,boutons,retour,accessibilite,transitions,effets}.*`, `outils/*`, `vite.config.ts`,
`package.json`. **Rien dans `site/`, `espace-livreur/`, `espace-entreprise/`, `espace-vendeur/`** : un fichier d'une autre
application à changer se note pour l'agent « connexions ».

## 3. Reprendre un écran, pas à pas

1. **Point de départ** : la page provisoire `src/pages/PR-xx/provisoires/<Écran>.tsx` (générée par
   `outils/transcription.mjs` ; ne jamais la modifier) : un composant par état du prototype (`EtatScan`, `EtatCheck`…),
   choisi par `?etat=` ; la fiche de l'écran (états, éléments, gestes, règles de l'extraction) sous le contenu.
2. **Créer l'écran** à côté : `src/pages/PR-xx/<Écran>.tsx`, `export default function`, dans `<Ecran route="…">`
   (en-tête, retour, barre viennent de la route ; `titre=` / `retour=` quand ils portent une donnée ; `entete=` /
   `barre=` pour un état qui change de coque ; `fixes=` pour les feuilles). Recopier le balisage de l'état voulu, garder
   ses classes `p-…` (styles/prototype.css), remplacer les textes d'exemple par les données. Classes du socle : `r-btn
   r-principal | r-second | r-alerte`, `r-carte`, `r-vide`, `r-kicker`, `r-pill r-ton-<vert|accent|alerte|ambre|rouge|
   neutre>`, `r-ref` (références en chasse fixe) ; l'enveloppe du contenu garde `r-pile` (deux colonnes sur tablette).
3. **Données** : `useLecture(() => source.<domaine>.<méthode>(), [clés])` ; jamais d'import de `src/demo/` dans un
   écran. Ajouter les méthodes manquantes dans le domaine (type) et sa démonstration (état dans
   `magasin('<domaine>', …)`, règles par `src/calculs`). Un geste écrit dans la source ; l'écran relit tout seul.
4. **Gestes** : `geste(enLigne, type, objet, origine(maintenant), (s) => s.<domaine>.<geste>(…))` ; `signal('succes' |
   'erreur' | 'alerte' | 'nouveau' | 'toucher')` ; animations du client sous `mouvementLibre()` ; droits par
   `usePeut('<geste>')` (config/droits.ts).
5. **Textes** : `t('texte français exact')`, `tf('{n} colis attendus', { n })` ; anglais dans `src/i18n/PR-xx.en.json`
   (le dictionnaire du prototype, `src/genere/en.json`, sert d'abord : ne pas y redoubler une clé). Heures et dates :
   `src/i18n/temps.ts`. Montants : `F()` de `@client/i18n/format`.
6. **Brancher** : dans `src/pages/PR-xx/routes.ts`, faire pointer `charger` vers l'écran repris et passer `statut` à
   `'repris'` (seul fichier de routage à toucher), puis `npm run transcrire` (met pages.json à jour ; routes.ts n'est
   jamais réécrit).
7. **Tester** : `tests/PR-xx.gestes.spec.ts` ; `BOUTONS_ROUTES=<routes> npx playwright test tests/boutons.spec.ts`
   (écran repris : aucun élément sans effet) ; `tests/effets.spec.ts` (effet réel) ; `tests/accessibilite.spec.ts`
   (écran repris : cibles, noms, clavier en plus des contrastes) ; `tests/squelette.spec.ts` ; `tests/retour.spec.ts`.
8. **Vérifier trois fois** : conformité aux règles (v6, DP, ARL, registre), tests verts, relecture ; puis commit.

## 4. Socle disponible

- **Coque** (`src/composants/coque.tsx`, classes `p-hd-*`, `p-hs-*`, `p-dock-*` relevées dans le prototype) : `Ecran`,
  `EnTeteRacine` (☰ → Menu, logo, thème, cloche, avatar → Paramètres « Mon compte », « POINT RELAIS · NOM, QUARTIER »,
  pastilles ouverture · places · Trust), `EnTeteEnfant` (retour mémorisé, titre, panier BelivaY → Aujourd'hui),
  `BarreDuBas` (Aujourd'hui, Réception, Retrait, Stock ; verre liquide du client ; compteurs NAV-02), `usePastilles`.
  Tablette et ordinateur de comptoir (PR-12) : deux colonnes (`r-pile`), barre centrée de 520 px, une colonne de
  540 px pour connexion, invitation et PIN de remise, appareil photo plein écran.
- **Session** (`src/session.tsx`) : `useSession` (membre et rôle, droits, relais : statut, ouverture, places, saturation,
  Trust ; compteurs), `useRelireSession`, `useHorloge`.
- **Droits** (`src/config/droits.ts`) : `usePeut`, `usePeutOuvrir`, `aLeDroit`, `peutOuvrir` ; route refusée →
  « Accès réservé au gérant » (composants/AccesReserve).
- **Source** (`src/donnees/source.ts`) : `SourceRelais` (un domaine par besoin, voir le tableau) ; démonstration en
  `localStorage` (`blv_r_demo_*`, empreinte de forme) partant du jeu d'essai (`src/demo/jeu-essai.ts` : Relais Bastos
  Carrefour, zone Z1 Centre-ville, gérante Rose Mbarga, un employé, Yafé Express et Serge A., mardi 13 octobre 2026 à
  14 h 05, même instant que le livreur et l'entreprise) ; scénarios `?demo=` (`src/demo/scenario.ts`). Source API :
  squelette `src/api/` (contrat `/api/relay/...`, méthodes « à brancher »).
- **Modèle du colis** (`src/donnees/domaines/colis.ts`) et **calculs** (`src/calculs/`, `npm run calculs`) : garde
  (grille, J1, jours non facturés, part du relais, renvoi, espèces), cycle (transitions et preuves), capacité (places,
  seuil, emplacement), comptoir ; mêmes exemples que les moteurs Python (`moteurs/belivay_moteurs/garde.py`).
- **Hors connexion** (`src/donnees/fileHorsLigne.ts`) : `origine`, `geste`, `useEnLigne`, `useFile`, `enAttente`,
  `envoyerLaFile` ; bandeau commun (un écran le remplace par son élément `[data-hors-ligne]`).
- **Pont de démonstration** (`src/demo/pont.ts`, le même fichier que le livreur et l'entreprise) : le relais lit déjà
  les événements du livreur (`arret`, `preuve`, `incident`) pour annoncer un lot ; les événements relais ↔ livreur
  seront branchés par l'agent « connexions ».
- **Outils** : `outils/prototype.mjs` (anglais et icônes du prototype), `outils/transcription.mjs` + `outils/ecran.mjs`
  (transcripteur : pages provisoires, prototype.css, coque.json, pages.json, fiches.json).

## 5. Lancer

```bash
export PATH=~/.local/node/bin:$PATH
cd espace-relais
npm run dev                          # http://localhost:5177/relais/
npm run calculs                      # tests des calculs (Vitest)
npx playwright test --workers=4      # construit puis teste (aperçu sur le port 4178 ; PORT_RELAIS pour un autre)
PW_REUTILISER=1 npx playwright test  # contre un aperçu déjà lancé : npx vite preview --port 4178
PW_MOUVEMENTS=1 npx playwright test  # avec les animations du vrai téléphone (attrape un observateur qui boucle)
npm run donnees                      # relit le prototype puis retranscrit (après une mise à jour du paquet)
```
