// Montre une bande d'un écart (test-results) : prototype au-dessus, site en dessous, agrandis ×2.
//   node outils/bande.mjs <filtre du dossier> <y0> <y1> <sortie.png>
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const [filtre, y0, y1, sortie] = process.argv.slice(2)
const R = new URL('../test-results/', import.meta.url)
const d = readdirSync(R).find((x) => x.includes(filtre) && existsSync(new URL(x + '/prototype.png', R)))
const lire = (n) => PNG.sync.read(readFileSync(new URL(`${d}/${n}`, R)))
const [a, b] = [lire('prototype.png'), lire('site.png')]
const h = Math.min(+y1, a.height, b.height) - +y0
const o = new PNG({ width: a.width * 2, height: h * 4 + 4 })
for (const [img, dy] of [[a, 0], [b, h * 2 + 4]])
  for (let y = 0; y < h; y++)
    for (let x = 0; x < a.width; x++)
      for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const i = ((+y0 + y) * img.width + x) * 4
        const j = ((dy + y * 2 + oy) * o.width + x * 2 + ox) * 4
        for (let k = 0; k < 4; k++) o.data[j + k] = img.data[i + k]
      }
writeFileSync(sortie, PNG.sync.write(o))
console.log(d)
