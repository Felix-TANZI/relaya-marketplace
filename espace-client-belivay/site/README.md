# Site BelivaY — Espace client (React)

Squelette de l'étape 4 (voir `HANDOFF.md`, section 5) : Vite, React, TypeScript, Playwright.

**Règle du porteur (3 oct.)** : chaque page est identique au prototype du 1er octobre
(`02_Prototype_HTML/BelivaY_Espace_Client_mobile.html`), au pixel près. L'île BelivaY (Dynamic Island
animée) est réservée à l'application : elle n'est pas dans le site.

## Lancer

Node.js est installé dans `~/.local/node` (ajouté au `PATH` par `~/.zshrc`).

```bash
cd site
npm install                      # une fois : paquets dans site/node_modules (hors GitHub)
npx playwright install chromium  # une fois : navigateur des tests
npm run dev                      # http://localhost:5173
npm test                         # construit le site puis lance tous les tests
npm run donnees                  # régénère tout ce qui vient du prototype (après une mise à jour)
```

## Comment le site reste identique au prototype

Rien n'est recopié à la main : des outils lisent le prototype **en marche** (il se complète pendant son
exécution) et écrivent ce que le site utilise.

| Outil | Écrit | Contenu |
|---|---|---|
| `logique-metier/outils/site.py` | `src/genere/pages.json`, logo, chariot, `public/favicon.png` | Pages du site (inventaire), interrupteurs, règles d'étape 4 |
| `outils/styles.mjs` | `src/styles/prototype.css`, `src/styles/ecrans/`, `src/assets/polices/`, `src/assets/prototype/` | La feuille de styles du prototype, texte d'origine, sans le cadre du téléphone, la barre d'état dessinée, l'île ni le plan des états ; ses polices ; les styles insérés dans chaque écran et leurs images |
| `outils/prototype.mjs` | `src/genere/en.json`, `icones.json`, `navigation.json` | Dictionnaire anglais final (6 750 textes), icônes (310), navigation de chaque route : en-tête, parent du retour, élément de droite, barre du bas, marge haute, titres |
| `outils/demo.mjs` | `src/demo/illustrations.json` | Dessins du jeu d'essai (portrait, vignettes des univers, clair et sombre) |

Les composants (`src/composants/`) rendent exactement le balisage des fonctions du prototype (`C.*`,
`rootHeader`, `subHeader`, `dock`, `screen`) ; la feuille de styles du prototype s'applique donc telle
quelle. Les textes passent tous par `t()`, qui reprend `fixTypo` (espaces insécables) et, en anglais,
`applyLang` (dictionnaire puis conventions anglaises des nombres).

La seule adaptation : le prototype dessine une barre d'état de 50 px ; le site prend la zone sûre du
téléphone (`--sb`, CNV-05). Les tests la fixent à 50 px.

## Ce qui vient d'où

| Dossier | Contenu |
|---|---|
| `src/config/` | Interrupteurs FF-* (tous fermés au lancement), pages et navigation |
| `src/composants/` | Coque (en-têtes, barre du bas, écran) et socle (bouton, carte, ligne, feuille du bas…) |
| `src/donnees/` | Ce que l'interface lit du serveur (aucun chiffre écrit dans le code, CCH-15) |
| `src/demo/` | **Données de démonstration** (prototype et jeu d'essai de CL-02), à supprimer d'un bloc quand l'API existera (étape 5) |
| `src/pages/` | Menu (construit), « Ce lien ne mène à aucune page », pages provisoires |
| `src/i18n/` | Typographie, conversion anglaise, montants (`F()`) |

Le **mode prototype** de la démonstration (`localStorage.blv_demo_prototype = '1'`) ouvre tous les modules
et montre les repères de revue du prototype : il sert à comparer le site au prototype. Il disparaît avec
`src/demo/` ; la production ne l'a jamais.

## Tests

- `tests/identique.spec.ts` : chaque route ouverte est ouverte dans le prototype et dans le site, à
  390 × 844 ; l'en-tête et la barre du bas doivent être identiques au pixel près, en clair, sombre,
  anglais, texte grand et très grand ; les écrans construits (Menu) sont comparés entiers, déroulés.
- `tests/squelette.spec.ts` : comportement : chaque route sans erreur ni débordement de 360 à 430 px,
  aucun lien vers une adresse inconnue, modules fermés, parent du bouton retour, langue et thème.

Outils pour construire un écran à l'étape 6 : `node outils/releve.mjs <route> '#app main' sortie.html`
(balisage du prototype, icônes nommées) et `node outils/comparer.mjs <route> page prefixe light fr 1 1`
(où le site diffère du prototype, en images ; le site doit tourner avec `npx vite preview --port 4175`).
