// Tailwind (même pile que le front relaya), en cohabitation avec nos feuilles de style : voir TAILWIND.md.
// - preflight coupé : aucune remise à zéro des styles du navigateur, le rendu actuel ne bouge pas ;
// - jetons BelivaY : chaque couleur, rayon, ombre ou taille renvoie à la variable CSS de src/styles/prototype.css,
//   donc suit le thème sombre (html[data-theme=dark]) sans variante « dark: » ;
// - points de rupture de DISPOSITION-ECRANS.md (600 / 768 / 1024 / 1200 / 1600), avec les noms habituels de
//   Tailwind (sm, md, lg, xl, 2xl) pour le code repris de relaya.

const v = (nom) => `var(--${nom})`

/** @type {import('tailwindcss').Config} */
export default {
  // Chemins relatifs à ce fichier (le serveur de développement peut être lancé depuis le dossier parent).
  content: { relative: true, files: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'] },
  corePlugins: { preflight: false },
  // Thème sombre de l'application : html[data-theme=dark] (préférences.tsx), et non la classe « dark ».
  darkMode: ['selector', '[data-theme="dark"]'],
  // Noms déjà pris par nos feuilles de style (.grow, .ring du prototype) : Tailwind ne les génère jamais.
  // Écrire « flex-grow » ou « ring-1 », « ring-2 »… à la place.
  blocklist: ['grow', 'ring'],
  theme: {
    screens: {
      sm: '600px',
      'tel-l': '600px',
      md: '768px',
      tab: '768px',
      lg: '1024px',
      'tab-l': '1024px',
      xl: '1200px',
      pc: '1200px',
      '2xl': '1600px',
      'pc-xl': '1600px',
    },
    extend: {
      colors: {
        ink: { DEFAULT: v('ink'), 2: v('ink-2'), 3: v('ink-3'), 4: v('ink-4') },
        sand: { DEFAULT: v('sand'), 2: v('sand-2'), 3: v('sand-3'), 4: v('sand-4') },
        card: { DEFAULT: v('card'), 2: v('card-2') },
        line: { DEFAULT: v('line'), 2: v('line-2') },
        or: {
          DEFAULT: v('or'),
          txt: v('or-txt'),
          deep: v('or-deep'),
          soft: v('or-soft'),
          'soft-2': v('or-soft-2'),
          line: v('or-line'),
        },
        braise: { 1: v('braise-1'), 2: v('braise-2') },
        gold: { DEFAULT: v('gold'), l: v('gold-l') },
        esp: { 1: v('esp-1'), 2: v('esp-2'), 3: v('esp-3') },
        green: { DEFAULT: v('green'), soft: v('green-soft'), line: v('green-line') },
        amber: { DEFAULT: v('amber'), soft: v('amber-soft'), line: v('amber-line') },
        red: { DEFAULT: v('red'), soft: v('red-soft'), line: v('red-line') },
        violet: { DEFAULT: v('violet'), txt: v('violet-txt'), soft: v('violet-soft'), line: v('violet-line') },
        bronze: v('bronze'),
        argent: v('argent'),
        'or-m': v('or-m'),
        platine: v('platine'),
        input: { bg: v('input-bg'), line: v('input-line') },
        thumb: { DEFAULT: v('thumb-bg'), or: v('thumb-bg-or') },
        prod: v('prod-bg'),
        glass: v('glass-bg'),
        cap: v('cap-bg'),
      },
      // Dégradés : « bg-grad-bronze » (et non « bg-bronze », qui est déjà la couleur).
      backgroundImage: {
        'grad-logo': v('logo-grad'),
        'grad-bronze': v('bronze-bg'),
        'grad-argent': v('argent-bg'),
        'grad-or-m': v('or-m-bg'),
        'grad-platine': v('platine-bg'),
        halos: v('page-halos'),
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        11: v('fs-11'),
        12: v('fs-12'),
        13: v('fs-13'),
        14: v('fs-14'),
        15: v('fs-15'),
        17: v('fs-17'),
        19: v('fs-19'),
        23: v('fs-23'),
        28: v('fs-28'),
        34: v('fs-34'),
        44: v('fs-44'),
      },
      lineHeight: { t: v('lh-t'), m: v('lh-m'), b: v('lh-b') },
      // Noms en français : « rounded-s » et « rounded-e » sont déjà des coins logiques de Tailwind.
      borderRadius: { petit: v('r-s'), moyen: v('r-m'), grand: v('r-l'), 'tres-grand': v('r-xl') },
      boxShadow: { card: v('shadow-card'), pop: v('shadow-pop'), cap: v('cap-halo'), glass: v('glass-edge') },
    },
  },
  plugins: [],
}
