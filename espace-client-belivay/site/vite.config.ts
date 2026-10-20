import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

// Dessins de la démonstration (src/demo/dessins.json, ~1,2 Mo) : un fichier par dessin, chargé à la demande par
// l'écran ou le produit qui l'affiche (composants/Dessin.tsx). « virtual:dessins » donne, pour chaque identifiant,
// la fonction qui charge son dessin ; « virtual:dessin/<id> » est le dessin lui-même.
const DESSINS = fileURLToPath(new URL('./src/demo/dessins.json', import.meta.url))
function dessinsALaDemande(): Plugin {
  const lire = () => JSON.parse(readFileSync(DESSINS, 'utf8')) as Record<string, unknown>
  return {
    name: 'dessins-a-la-demande',
    resolveId(id) {
      if (id === 'virtual:dessins' || id.startsWith('virtual:dessin/')) return '\0' + id
    },
    load(id) {
      if (id === '\0virtual:dessins') {
        this.addWatchFile(DESSINS)
        const ids = Object.keys(lire())
        return `export const CHARGEURS = {${ids.map((k) => `${JSON.stringify(k)}: () => import(${JSON.stringify('virtual:dessin/' + k)})`).join(',\n')}}`
      }
      if (id.startsWith('\0virtual:dessin/')) {
        this.addWatchFile(DESSINS)
        const k = id.slice('\0virtual:dessin/'.length)
        return `export default ${JSON.stringify(lire()[k] ?? null)}`
      }
    },
  }
}

// Aperçu du build (vite preview) avec les en-têtes de vercel.json (CSP, Permissions-Policy…), pour vérifier
// localement que rien ne casse ; sauf HSTS et upgrade-insecure-requests, qui n'ont pas de sens en http local.
function entetesVercel(): Record<string, string> {
  const v = JSON.parse(readFileSync(fileURLToPath(new URL('./vercel.json', import.meta.url)), 'utf8')) as { headers: { source: string; headers: { key: string; value: string }[] }[] }
  const tous = v.headers.find((h) => h.source === '/(.*)')?.headers ?? []
  return Object.fromEntries(
    tous
      .filter((h) => h.key !== 'Strict-Transport-Security')
      .map((h) => [h.key, h.key === 'Content-Security-Policy' ? h.value.replace(/;\s*upgrade-insecure-requests/, '') : h.value]),
  )
}

export default defineConfig({
  plugins: [react(), dessinsALaDemande()],
  preview: { headers: entetesVercel() },
  // Le dictionnaire anglais (~500 ko) est un morceau à part, chargé seulement quand l'anglais est choisi.
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Le point d'entrée est découpé en morceaux chargés en parallèle (préchargés par index.html) et gardés en
        // cache d'une mise en ligne à l'autre tant qu'ils ne changent pas : React, le routeur et i18next, les états
        // relevés du prototype, les données de démonstration.
        // Un module de pages (src/pages/CL-08/index.ts) garde le nom de son dossier : « CL-08-<empreinte>.js ».
        chunkFileNames(chunk) {
          const dossier = /[\\/]src[\\/]pages[\\/]([^\\/]+)[\\/]index\.ts$/.exec(chunk.facadeModuleId ?? '')?.[1]
          return `assets/${dossier ?? '[name]'}-[hash].js`
        },
        manualChunks(id) {
          if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|cookie|set-cookie-parser|i18next|react-i18next|use-sync-external-store)[\\/]/.test(id)) return 'react'
          if (/src[\\/]genere[\\/](etats|pages|navigation|icones)\.json$/.test(id)) return 'etats'
          if (/src[\\/]demo[\\/](source-demo|magasin|catalogue|commandes|faq|legal|rentree|horloge)\.ts$/.test(id)) return 'demo'
        },
      },
    },
  },
})
