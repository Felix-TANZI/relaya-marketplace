// Console d'administration : application Vite distincte servie sous /admin/ (même patron que l'entreprise de
// livraison, espace-entreprise/vite.config.ts), même origine que les autres espaces. Le code neutre du client est
// partagé sans être déplacé ni modifié :
// - alias « @client/* » → ../site/src/* ;
// - redirections : quand un fichier du client importe un module lié à l'espace client (préférences et dictionnaire,
//   icônes, routes, source de données), c'est le module équivalent de la console qui est servi. Les composants
//   neutres du client (Animations, Sons, BarreBas, Feuille, RetourMemoire…) tournent ainsi avec les textes, icônes et
//   onglets de la console. La liste est fermée (REDIRECTIONS) : tout autre import du client reste celui du client.
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const ICI = dirname(fileURLToPath(import.meta.url))
const CLIENT = resolve(ICI, '../site/src')
const ADMIN = resolve(ICI, 'src')

// Module du client (sans extension) → module de la console qui le remplace pour le code du client réutilisé.
export const REDIRECTIONS: Record<string, string> = {
  [resolve(CLIENT, 'preferences')]: resolve(ADMIN, 'preferences.tsx'),
  [resolve(CLIENT, 'composants/Icone')]: resolve(ADMIN, 'composants/Icone.tsx'),
  [resolve(CLIENT, 'composants/marque-sonore')]: resolve(ADMIN, 'composants/marque-sonore.ts'),
  [resolve(CLIENT, 'config/pages')]: resolve(ADMIN, 'config/pages.ts'),
  [resolve(CLIENT, 'donnees/source')]: resolve(ADMIN, 'client-relais/source-client.ts'),
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

// Montants recalculés du CLIENT (site/src/demo/recalculs.json, lus par site/src/i18n/texte.ts) : la console n'en
// a aucun (elle n'emploie de texte.ts que cle, typographie et versAnglais) ; le fichier est vidé à la construction.
// Registre officiel (logique-metier/parametres-en-vigueur.json) : à l'exécution, registre.ts ne lit que le code, la
// valeur et l'unité (le sens, le statut et la décision servent aux documents et aux tests).
function allegerJson(): Plugin {
  const vider = resolve(CLIENT, 'demo/recalculs.json')
  const parametres = resolve(ICI, '../logique-metier/parametres-en-vigueur.json')
  return {
    name: 'alleger-json',
    enforce: 'pre',
    apply: 'build',
    transform(code, id) {
      const f = id.split('?')[0]
      if (f === vider) return { code: '[]', map: null }
      if (f === parametres) {
        const d = JSON.parse(code) as { parametres: { code: string; valeur: string; unite?: string | null }[] }
        return { code: JSON.stringify({ parametres: d.parametres.map(({ code, valeur, unite }) => ({ code, valeur, unite: unite ?? null })) }), map: null }
      }
      return null
    },
  }
}

export default defineConfig({
  base: '/admin/',
  // Numéro de version lu dans la construction (Menu) : celui de package.json.
  define: { 'import.meta.env.VITE_VERSION_ADMIN': JSON.stringify(process.env.VITE_VERSION_ADMIN ?? (JSON.parse(readFileSync(resolve(ICI, 'package.json'), 'utf-8')) as { version: string }).version) },
  plugins: [redirectionsClient(), allegerJson(), react()],
  resolve: {
    alias: { '@client': CLIENT },
    // Une seule copie de React, du routeur et d'i18next pour le code de la console et celui du client.
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'i18next', 'react-i18next'],
  },
  server: { port: 5178, strictPort: true, fs: { allow: [ICI, CLIENT, resolve(ICI, '../logique-metier')] } },
  preview: { port: 4179 },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Une page d'un groupe garde le nom de son dossier : « ADM-05-<empreinte>.js ».
        chunkFileNames(chunk) {
          const dossier = /[\\/]src[\\/]pages[\\/](ADM-\d\d|AJ-A)[\\/]/.exec(chunk.facadeModuleId ?? '')?.[1]
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
