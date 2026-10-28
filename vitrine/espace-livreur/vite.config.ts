// Espace livreur : application Vite distincte servie sous /livreur/ (même patron que l'espace vendeur, même origine
// que l'espace client). Le code neutre du client est partagé sans être déplacé ni modifié :
// - alias « @client/* » → ../site/src/* ;
// - redirections : quand un fichier du client importe un module lié à l'espace client (préférences et dictionnaire,
//   icônes, routes, source de données), c'est le module équivalent du livreur qui est servi. Les composants neutres du
//   client (Animations, Sons, BarreBas, Feuille…) tournent ainsi avec les textes, icônes et onglets du livreur. La
//   liste est fermée (REDIRECTIONS) : tout autre import du client reste celui du client.
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const ICI = dirname(fileURLToPath(import.meta.url))
const CLIENT = resolve(ICI, '../site/src')
const LIVREUR = resolve(ICI, 'src')

// Module du client (sans extension) → module du livreur qui le remplace pour le code du client réutilisé.
export const REDIRECTIONS: Record<string, string> = {
  [resolve(CLIENT, 'preferences')]: resolve(LIVREUR, 'preferences.tsx'),
  [resolve(CLIENT, 'composants/Icone')]: resolve(LIVREUR, 'composants/Icone.tsx'),
  [resolve(CLIENT, 'composants/marque-sonore')]: resolve(LIVREUR, 'composants/marque-sonore.ts'),
  [resolve(CLIENT, 'config/pages')]: resolve(LIVREUR, 'config/pages.ts'),
  [resolve(CLIENT, 'donnees/source')]: resolve(LIVREUR, 'client-relais/source-client.ts'),
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

// Poids du paquet principal : les fichiers JSON relevés gardent, à l'exécution, ce que l'application lit (les tests
// et les outils lisent toujours les fichiers entiers) :
// - registre des paramètres (logique-metier/parametres-en-vigueur.json) : le code et la valeur seulement ;
// - montants recalculés du CLIENT (site/src/demo/recalculs.json, lus par site/src/i18n/texte.ts) : le livreur n'en a
//   aucun (il n'emploie de texte.ts que cle, typographie et versAnglais).
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

// L'accueil (Aujourd'hui) est la racine du routeur : avec un paramètre, son adresse s'écrit « /livreur?pop=profil »
// (base du routeur sans barre finale). Le serveur de développement et l'aperçu la ramènent à « /livreur/?… » au lieu
// d'un 404 (un rechargement sur l'accueil marche toujours) ; l'hébergement de production fait la même réécriture.
function barreFinale(): Plugin {
  const rediriger = (req: { url?: string }, res: { statusCode: number; setHeader(k: string, v: string): void; end(): void }, suite: () => void) => {
    const m = /^\/livreur(\?.*)?$/.exec(req.url ?? '')
    if (!m) return suite()
    res.statusCode = 302
    res.setHeader('Location', '/livreur/' + (m[1] ?? ''))
    res.end()
  }
  return {
    name: 'barre-finale',
    configureServer: (s) => void s.middlewares.use(rediriger),
    configurePreviewServer: (s) => void s.middlewares.use(rediriger),
  }
}

export default defineConfig({
  base: '/livreur/',
  // Numéro de version lu dans la construction (Réglages) : celui de package.json.
  define: { 'import.meta.env.VITE_VERSION_LIVREUR': JSON.stringify(process.env.VITE_VERSION_LIVREUR ?? (JSON.parse(readFileSync(resolve(ICI, 'package.json'), 'utf-8')) as { version: string }).version) },
  plugins: [barreFinale(), redirectionsClient(), allegerJson(), react()],
  resolve: {
    alias: { '@client': CLIENT },
    // Une seule copie de React, du routeur et d'i18next pour le code du livreur et celui du client.
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'i18next', 'react-i18next'],
  },
  server: { port: 5175, strictPort: true, fs: { allow: [ICI, CLIENT, resolve(ICI, '../logique-metier')] } },
  preview: { port: 4176 },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Une page d'un groupe garde le nom de son dossier : « LIV-06-<empreinte>.js ».
        chunkFileNames(chunk) {
          const dossier = /[\\/]src[\\/]pages[\\/](LIV-\d\d|AJ-L)[\\/]/.exec(chunk.facadeModuleId ?? '')?.[1]
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
