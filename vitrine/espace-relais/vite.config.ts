// Espace point relais : application Vite distincte servie sous /relais/ (même patron que l'espace livreur, même
// origine que l'espace client). Le code neutre du client est partagé sans être déplacé ni modifié :
// - alias « @client/* » → ../site/src/* ;
// - redirections : quand un fichier du client importe un module lié à l'espace client (préférences et dictionnaire,
//   icônes, routes, source de données), c'est le module équivalent du relais qui est servi. Les composants neutres du
//   client (Animations, Sons, BarreBas, Feuille…) tournent ainsi avec les textes, icônes et onglets du relais. La
//   liste est fermée (REDIRECTIONS) : tout autre import du client reste celui du client.
// node_modules est un lien vers celui de l'espace livreur (mêmes dépendances) : le cache de Vite et les fichiers de
// compilation de TypeScript portent un nom propre au relais pour ne jamais se mêler à ceux du livreur.
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const ICI = dirname(fileURLToPath(import.meta.url))
const CLIENT = resolve(ICI, '../site/src')
const RELAIS = resolve(ICI, 'src')

// Module du client (sans extension) → module du relais qui le remplace pour le code du client réutilisé.
export const REDIRECTIONS: Record<string, string> = {
  [resolve(CLIENT, 'preferences')]: resolve(RELAIS, 'preferences.tsx'),
  [resolve(CLIENT, 'composants/Icone')]: resolve(RELAIS, 'composants/Icone.tsx'),
  [resolve(CLIENT, 'composants/marque-sonore')]: resolve(RELAIS, 'composants/marque-sonore.ts'),
  [resolve(CLIENT, 'config/pages')]: resolve(RELAIS, 'config/pages.ts'),
  [resolve(CLIENT, 'donnees/source')]: resolve(RELAIS, 'client-pont/source-client.ts'),
}

function redirectionsClient(): Plugin {
  return {
    name: 'redirections-client',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.') || !importer.startsWith(CLIENT)) return null
      const cible = resolve(dirname(importer), source).replace(/\.(tsx?|jsx?)$/, '')
      return REDIRECTIONS[cible] ?? null
    },
  }
}

// Poids du paquet principal : le registre des paramètres ne garde, à l'exécution, que le code et la valeur ; les
// montants recalculés du client (site/src/demo/recalculs.json) ne servent pas au relais.
function allegerJson(): Plugin {
  const fichiers: Record<string, (d: unknown) => unknown> = {
    [resolve(ICI, '../logique-metier/parametres-en-vigueur.json')]: (d) => ({ parametres: (d as { parametres: { code: string; valeur: string }[] }).parametres.map(({ code, valeur }) => ({ code, valeur })) }),
    [resolve(CLIENT, 'demo/recalculs.json')]: () => [],
  }
  return {
    name: 'alleger-json',
    enforce: 'pre',
    apply: 'build',
    transform(code, id) {
      const f = fichiers[id.split('?')[0]]
      return f ? { code: JSON.stringify(f(JSON.parse(code))), map: null } : null
    },
  }
}

// L'accueil (Aujourd'hui) est la racine du routeur : « /relais?etat=vide » est ramené à « /relais/?etat=vide » par le
// serveur de développement et l'aperçu (l'hébergement de production fait la même réécriture).
function barreFinale(): Plugin {
  const rediriger = (req: { url?: string }, res: { statusCode: number; setHeader(k: string, v: string): void; end(): void }, suite: () => void) => {
    const m = /^\/relais(\?.*)?$/.exec(req.url ?? '')
    if (!m) return suite()
    res.statusCode = 302
    res.setHeader('Location', '/relais/' + (m[1] ?? ''))
    res.end()
  }
  return {
    name: 'barre-finale',
    configureServer: (s) => void s.middlewares.use(rediriger),
    configurePreviewServer: (s) => void s.middlewares.use(rediriger),
  }
}

export default defineConfig({
  base: '/relais/',
  cacheDir: 'node_modules/.vite-relais',
  // Numéro de version lu dans la construction (Paramètres) : celui de package.json.
  define: { 'import.meta.env.VITE_VERSION_RELAIS': JSON.stringify(process.env.VITE_VERSION_RELAIS ?? (JSON.parse(readFileSync(resolve(ICI, 'package.json'), 'utf-8')) as { version: string }).version) },
  plugins: [barreFinale(), redirectionsClient(), allegerJson(), react()],
  resolve: {
    alias: { '@client': CLIENT },
    // Une seule copie de React, du routeur et d'i18next pour le code du relais et celui du client.
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'i18next', 'react-i18next'],
  },
  server: { port: 5177, strictPort: true, fs: { allow: [ICI, CLIENT, resolve(ICI, '../logique-metier')] } },
  preview: { port: 4178 },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Une page d'un groupe garde le nom de son dossier : « PR-04-<empreinte>.js ».
        chunkFileNames(chunk) {
          const dossier = /[\\/]src[\\/]pages[\\/](PR-\d\d)[\\/]/.exec(chunk.facadeModuleId ?? '')?.[1]
          return `assets/${dossier ? dossier + '-' : ''}[name]-[hash].js`
        },
        manualChunks(id) {
          if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|cookie|set-cookie-parser|i18next|react-i18next|use-sync-external-store)[\\/]/.test(id)) return 'react'
        },
      },
    },
  },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
} as import('vite').UserConfig)
