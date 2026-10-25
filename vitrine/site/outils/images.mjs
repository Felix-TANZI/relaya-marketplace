// Réécrit les images incluses (data:) des écrans construits dans src/assets/prototype/, sans toucher aux
// écrans : utile si le dossier a été vidé. Parcourt les états des routes de src/pages/CL-xx/construits.json.
//   node outils/images.mjs [CL-xx…]
import { chromium } from '@playwright/test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { exclu } from './adresses.mjs'
import { releverEtat, Transcripteur } from './transcription.mjs'

const PAGES = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))
const DOCS = new URL('../src/pages/', import.meta.url)
const demandes = process.argv.slice(2)
const docs = readdirSync(DOCS).filter((d) => existsSync(new URL(d + '/construits.json', DOCS)) && (!demandes.length || demandes.includes(d)))
const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } })
const tr = new Transcripteur()
for (const d of docs) {
  const { routes } = JSON.parse(readFileSync(new URL(d + '/construits.json', DOCS), 'utf-8'))
  for (const r of routes) {
    const p = PAGES.find((x) => x.route === r)
    for (const a of [...new Set(['#' + r, ...p.etats.map((e) => e.adresse)])].filter((x) => !exclu(x))) tr.jsx(await releverEtat(page, a), 0)
  }
  console.log(`${d} : ${tr.imports.size} images au total`)
}
await navigateur.close()
