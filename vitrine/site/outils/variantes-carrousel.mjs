// Variantes « téléphone » des photos du carrousel (public/images/carrousel/<nom>.webp|jpg, 2000 px de large) :
// public/images/carrousel/petites/<nom>.webp, 1080 px de large (une bande de 168 px de haut recadrée en « cover » sur un
// téléphone en double densité), et la liste dans src/genere/carrousel-petites.json. Le site ne propose la variante (srcset) qu'aux photos de cette liste : une
// photo déposée sans variante reste servie telle quelle. À relancer après avoir déposé ou changé une photo :
//   node outils/variantes-carrousel.mjs
// Encodage par le Chromium de Playwright (déjà installé pour les tests) : aucune dépendance de plus.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const LARGEUR = 1080
const QUALITE = 0.8
const dossier = fileURLToPath(new URL('../public/images/carrousel', import.meta.url))
const sortie = join(dossier, 'petites')
const liste = fileURLToPath(new URL('../src/genere/carrousel-petites.json', import.meta.url))
if (!existsSync(sortie)) mkdirSync(sortie)

const photos = readdirSync(dossier).filter((f) => /\.(webp|jpe?g)$/i.test(f))
const navigateur = await chromium.launch()
const page = await navigateur.newPage()
await page.goto('about:blank')
const noms = []
for (const f of photos) {
  const nom = f.replace(/\.\w+$/, '')
  const data = readFileSync(join(dossier, f)).toString('base64')
  const type = /\.webp$/i.test(f) ? 'image/webp' : 'image/jpeg'
  const b64 = await page.evaluate(
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
      return c.toDataURL('image/webp', qualite).split(',')[1]
    },
    { data, type, largeur: LARGEUR, qualite: QUALITE },
  )
  writeFileSync(join(sortie, nom + '.webp'), Buffer.from(b64, 'base64'))
  noms.push(nom)
}
await navigateur.close()
noms.sort()
writeFileSync(liste, JSON.stringify({ largeur: LARGEUR, noms }, null, 1) + '\n')
console.log(`${noms.length} variante(s) de ${LARGEUR} px : ${noms.join(', ')}`)
