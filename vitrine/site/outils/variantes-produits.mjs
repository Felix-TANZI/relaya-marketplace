// Vignettes des photos de produits de la démonstration (src/assets/produits/<nom>.webp|jpg|png, 512 à 617 px) :
// src/assets/produits/petites/<nom>.webp, 360 px de large, et src/genere/produits-petites.json (largeur de chaque
// originale). Les cartes des listes (96 à 200 px affichés) prennent la vignette par srcset ; la fiche produit et les
// écrans très denses gardent l'originale. À relancer après avoir déposé une photo : node outils/variantes-produits.mjs
// Au passage au réel, le serveur sert ses propres tailles (champ srcset des photos) : ce dossier part avec src/demo.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const LARGEUR = 360
const QUALITE = 0.78
const dossier = fileURLToPath(new URL('../src/assets/produits', import.meta.url))
const sortie = join(dossier, 'petites')
const liste = fileURLToPath(new URL('../src/genere/produits-petites.json', import.meta.url))
if (!existsSync(sortie)) mkdirSync(sortie)

const photos = readdirSync(dossier).filter((f) => /\.(webp|jpe?g|png)$/i.test(f))
const navigateur = await chromium.launch()
const page = await navigateur.newPage()
await page.goto('about:blank')
const originaux = {}
for (const f of photos) {
  const nom = f.replace(/\.\w+$/, '')
  const type = /\.webp$/i.test(f) ? 'image/webp' : /\.png$/i.test(f) ? 'image/png' : 'image/jpeg'
  const data = readFileSync(join(dossier, f)).toString('base64')
  const { b64, largeur } = await page.evaluate(
    async ({ data, type, largeur, qualite }) => {
      const img = new Image()
      img.src = `data:${type};base64,${data}`
      await img.decode()
      const l = Math.min(largeur, img.naturalWidth)
      const h = Math.round((img.naturalHeight * l) / img.naturalWidth)
      const c = document.createElement('canvas')
      c.width = l
      c.height = h
      const ctx = c.getContext('2d')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, l, h)
      return { b64: c.toDataURL('image/webp', qualite).split(',')[1], largeur: img.naturalWidth }
    },
    { data, type, largeur: LARGEUR, qualite: QUALITE },
  )
  if (largeur <= LARGEUR) continue // déjà petite : rien à gagner
  writeFileSync(join(sortie, nom + '.webp'), Buffer.from(b64, 'base64'))
  originaux[nom] = largeur
}
await navigateur.close()
const tries = Object.fromEntries(Object.entries(originaux).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(liste, JSON.stringify({ largeur: LARGEUR, originaux: tries }, null, 1) + '\n')
console.log(`${Object.keys(tries).length} vignette(s) de ${LARGEUR} px`)
