// Espace vendeur : application Vite distincte servie sous /vendeur/ (PLAN-VENDEUR.md, architecture), même origine
// que l'espace client (même session). Le code neutre du client est partagé sans être déplacé ni modifié :
// - alias « @client/* » → ../site/src/* ;
// - redirections : quand un fichier du client importe un module lié à l'espace client (préférences et dictionnaire,
//   icônes, routes, source de données), c'est le module équivalent du vendeur qui est servi. Les composants neutres du
//   client (Animations, Sons, BarreBas, Feuille, SaisieCode…) tournent ainsi avec les textes, icônes et onglets du
//   vendeur. La liste est fermée (REDIRECTIONS) : tout autre import du client reste celui du client.
import react from '@vitejs/plugin-react'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const ICI = dirname(fileURLToPath(import.meta.url))
const CLIENT = resolve(ICI, '../site/src')
const VENDEUR = resolve(ICI, 'src')

// Module du client (sans extension) → module du vendeur qui le remplace pour le code du client réutilisé.
export const REDIRECTIONS: Record<string, string> = {
  [resolve(CLIENT, 'preferences')]: resolve(VENDEUR, 'preferences.tsx'),
  [resolve(CLIENT, 'composants/Icone')]: resolve(VENDEUR, 'composants/Icone.tsx'),
  [resolve(CLIENT, 'composants/marque-sonore')]: resolve(VENDEUR, 'composants/marque-sonore.ts'),
  [resolve(CLIENT, 'config/pages')]: resolve(VENDEUR, 'config/pages.ts'),
  [resolve(CLIENT, 'donnees/source')]: resolve(VENDEUR, 'client-relais/source-client.ts'),
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

// Poids du paquet principal (vague 4) : les fichiers JSON relevés gardent, à l'exécution, ce que l'application lit
// (les tests et les outils lisent toujours les fichiers entiers) :
// - registre des paramètres (logique-metier/parametres-en-vigueur.json) : le code et la valeur (registre.ts ne lit
//   rien d'autre ; le sens, la source et les écrans servent aux documents) ;
// - montants recalculés du CLIENT (site/src/demo/recalculs.json, lus par site/src/i18n/texte.ts) : le vendeur n'en
//   a aucun (il n'emploie de texte.ts que cle, typographie et versAnglais) ;
// - états relevés du prototype (src/genere/etats.json) : la coque de chaque route (son état par défaut), plus tous
//   les états des routes dont un écran repris montre encore un scénario du prototype (<Ecran parEtat>) ; sans
//   l'adresse ni les feuilles de style relevées (outils) ;
// - inventaire des routes (src/genere/pages.json) : sans la liste des états du prototype (tests et outils).
const PAGES_DIR = resolve(VENDEUR, 'pages')
function routesParEtat(): Set<string> {
  const routes = new Set<string>()
  const parcourir = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name !== 'provisoires') parcourir(resolve(d, e.name))
      } else if (/\.tsx$/.test(e.name)) {
        const src = readFileSync(resolve(d, e.name), 'utf-8')
        if (/\bparEtat=\{/.test(src)) for (const m of src.matchAll(/<Ecran\s[^>]*?route="([\w-]+)"/g)) routes.add(m[1])
      }
    }
  }
  parcourir(PAGES_DIR)
  return routes
}
function allegerJson(): Plugin {
  const fichiers: Record<string, (d: unknown) => unknown> = {
    [resolve(ICI, '../logique-metier/parametres-en-vigueur.json')]: (d) => ({ parametres: (d as { parametres: { code: string; valeur: string }[] }).parametres.map(({ code, valeur }) => ({ code, valeur })) }),
    [resolve(CLIENT, 'demo/recalculs.json')]: () => [],
    [resolve(VENDEUR, 'genere/etats.json')]: (d) => {
      const garder = routesParEtat()
      return Object.fromEntries(
        Object.entries(d as Record<string, { route: string; adresse?: string; styles?: unknown }>)
          .filter(([cle, e]) => cle === e.route || garder.has(e.route))
          .map(([cle, e]) => {
            const { adresse: _a, styles: _s, ...reste } = e
            return [cle, reste]
          }),
      )
    },
    [resolve(VENDEUR, 'genere/pages.json')]: (d) => (d as { etats?: unknown }[]).map(({ etats: _e, ...p }) => ({ ...p, etats: [] })),
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

export default defineConfig({
  base: '/vendeur/',
  // Numéro de version lu dans la construction (Menu, Q-79) : celui de package.json.
  define: { 'import.meta.env.VITE_VERSION_VENDEUR': JSON.stringify(process.env.VITE_VERSION_VENDEUR ?? (JSON.parse(readFileSync(resolve(ICI, 'package.json'), 'utf-8')) as { version: string }).version) },
  plugins: [redirectionsClient(), allegerJson(), react()],
  resolve: {
    alias: { '@client': CLIENT },
    // Une seule copie de React, du routeur et d'i18next pour le code du vendeur et celui du client.
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'i18next', 'react-i18next'],
  },
  server: { port: 5174, strictPort: true, fs: { allow: [ICI, CLIENT, resolve(ICI, '../logique-metier')] } },
  preview: { port: 4175 },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Une page d'un groupe garde le nom de son dossier : « VD-05-<empreinte>.js ».
        chunkFileNames(chunk) {
          const dossier = /[\\/]src[\\/]pages[\\/](VD-\d\d)[\\/]/.exec(chunk.facadeModuleId ?? '')?.[1]
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
