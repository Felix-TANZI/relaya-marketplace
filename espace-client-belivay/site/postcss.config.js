// Tailwind puis Autoprefixer, comme le front relaya (postcss.config.cjs).
// Autoprefixer ne touche que la feuille Tailwind (src/styles/tailwind.css) : nos feuilles gardent leurs préfixes
// écrits à la main (-webkit-backdrop-filter pour Safari 17, ordre des -webkit-mask…), donc le rendu ne change pas.
// Il n'en retire aucun (remove: false) : Safari 17 a encore besoin de -webkit-backdrop-filter.
import autoprefixer from 'autoprefixer'
import postcss from 'postcss'
import { fileURLToPath } from 'node:url'
import tailwindcss from 'tailwindcss'

const prefixes = postcss([autoprefixer({ remove: false })])

/** @type {import('postcss').AcceptedPlugin} */
const autoprefixerTailwind = {
  postcssPlugin: 'autoprefixer-tailwind',
  async OnceExit(root) {
    if (/[\\/]src[\\/]styles[\\/]tailwind\.css$/.test(root.source?.input.file ?? '')) await prefixes.process(root, { from: root.source.input.file })
  },
}

export default {
  // Configuration désignée par son chemin : le serveur de développement peut être lancé depuis le dossier parent.
  plugins: [tailwindcss({ config: fileURLToPath(new URL('./tailwind.config.js', import.meta.url)) }), autoprefixerTailwind],
}
