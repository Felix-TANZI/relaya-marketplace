# Tailwind dans le site BelivaY

Le site garde ses feuilles de style (`src/styles/*.css`, tirées du prototype). Tailwind 3.4 y est ajouté pour
le code **nouveau**, avec la même pile que le front relaya (Tailwind + PostCSS + Autoprefixer). Les deux
cohabitent sans que le rendu actuel change.

## Comment c'est branché

- `tailwind.config.js` : jetons BelivaY, points de rupture, `preflight` coupé (aucune remise à zéro des styles
  du navigateur).
- `postcss.config.js` : Tailwind, puis Autoprefixer sur la seule feuille Tailwind (nos feuilles gardent leurs
  préfixes écrits à la main).
- `src/styles/tailwind.css` : `@tailwind base` (seulement les variables `--tw-*` des utilitaires, puisque
  preflight est coupé), `components`, `utilities`. Importée **en premier** dans `src/main.tsx` : à spécificité
  égale, nos feuilles gardent le dernier mot.

## Écrire du nouveau code

Utiliser les jetons BelivaY plutôt que la palette par défaut de Tailwind. Chacun renvoie à une variable CSS de
`src/styles/prototype.css` et suit donc le thème sombre tout seul (pas besoin de `dark:`).

```tsx
<div className="rounded-moyen bg-card p-4 shadow-card">
  <p className="text-15 font-semibold leading-m text-ink">Livraison offerte</p>
  <p className="text-13 text-ink-3">Dès 25 000 F au point relais</p>
  <button className="mt-3 rounded-grand bg-or px-4 py-2 text-14 font-bold text-white">Commander</button>
</div>
```

| Jeton | Classes | Variable |
|---|---|---|
| Texte | `text-ink`, `text-ink-2` … `text-ink-4` | `--ink…` |
| Fonds | `bg-sand`, `bg-sand-2` … `bg-sand-4`, `bg-card`, `bg-card-2` | `--sand…`, `--card…` |
| Lignes | `border-line`, `border-line-2` | `--line…` |
| Orange | `bg-or`, `text-or-txt`, `text-or-deep`, `bg-or-soft`, `bg-or-soft-2`, `border-or-line` | `--or…` |
| Braise | `bg-braise-1`, `bg-braise-2` | `--braise-…` |
| États | `text-green`, `bg-green-soft`, `border-green-line` ; idem `amber`, `red`, `violet` (+ `text-violet-txt`) | `--green…` … |
| Or, espresso | `text-gold`, `text-gold-l`, `bg-esp-1` … `bg-esp-3` | `--gold…`, `--esp-…` |
| Paliers | `text-bronze`, `text-argent`, `text-or-m`, `text-platine` ; dégradés `bg-grad-bronze`, `bg-grad-argent`, `bg-grad-or-m`, `bg-grad-platine` | |
| Divers | `bg-input-bg`, `border-input-line`, `bg-thumb`, `bg-thumb-or`, `bg-prod`, `bg-glass`, `bg-cap`, `bg-grad-logo`, `bg-halos` | |
| Tailles de texte | `text-11` … `text-44` (11, 12, 13, 14, 15, 17, 19, 23, 28, 34, 44) | `--fs-…` |
| Interlignes | `leading-t`, `leading-m`, `leading-b` | `--lh-…` |
| Rayons | `rounded-petit` (10), `rounded-moyen` (14), `rounded-grand` (20), `rounded-tres-grand` (28) | `--r-…` |
| Ombres | `shadow-card`, `shadow-pop`, `shadow-cap`, `shadow-glass` | `--shadow-…` |
| Police | `font-sans` (Plus Jakarta Sans), `font-mono` | |

Les couleurs par défaut de Tailwind (`red-500`, `gray-100`…) existent encore, mais ne suivent pas le thème :
les éviter dans l'interface. Les jetons étant des variables CSS, les modificateurs d'opacité (`bg-or/50`) ne
marchent pas ; écrire une variable ou une couleur dédiée si besoin.

## Points de rupture (DISPOSITION-ECRANS.md)

| Palier | Dès | Classes (nom BelivaY = nom Tailwind) |
|---|---|---|
| `tel` | 0 | sans préfixe : le téléphone d'abord |
| `tel-l` | 600 px | `tel-l:` = `sm:` |
| `tab` | 768 px | `tab:` = `md:` |
| `tab-l` | 1024 px | `tab-l:` = `lg:` |
| `pc` | 1200 px | `pc:` = `xl:` |
| `pc-xl` | 1600 px | `pc-xl:` = `2xl:` |

`sm`, `md`, `lg`, `xl`, `2xl` sont gardés pour le code repris de relaya, mais tombent sur **nos** paliers
(`sm` à 600 et non 640, `xl` à 1200 et non 1280, `2xl` à 1600 et non 1536).

## Thème sombre

Le thème est `html[data-theme=dark]` (`src/preferences.tsx`), pas la classe `dark` : `dark:` est réglé sur ce
sélecteur. Avec les jetons, il est rarement utile.

## Précautions

- **Noms réservés.** `grow` et `ring` sont des classes du prototype : Tailwind ne les génère pas
  (`blocklist`). Écrire `flex-grow`, `ring-1`, `ring-2`… Avant d'ajouter une classe à nos feuilles, vérifier
  qu'elle n'est pas un nom d'utilitaire Tailwind (`flex`, `hidden`, `block`, `border`…).
- **Pas de preflight.** Les éléments gardent les styles du navigateur et ceux de `prototype.css` (marges des
  titres, boutons…). Un bouton Tailwind doit poser lui-même `border-0`, sa police, etc.
- **Ne pas réécrire l'existant en Tailwind** sans repasser les tests au pixel (`tests/identique.spec.ts`).
- Après un changement de `tailwind.config.js`, relancer le serveur de développement.
