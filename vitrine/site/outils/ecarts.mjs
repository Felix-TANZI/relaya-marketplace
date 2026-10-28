// Résume les écarts écrits par tests/identique.spec.ts (test-results/*/prototype.png, site.png, ecart.png) :
// tailles, puis bandes de pixels différents (outil de l'étape 6).
//   node outils/ecarts.mjs [filtre]
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const filtre = process.argv[2] || ''
const R = new URL('../test-results/', import.meta.url)
for (const d of readdirSync(R).filter((x) => x.includes(filtre)).sort()) {
  const f = (n) => new URL(`${d}/${n}`, R)
  if (!existsSync(f('prototype.png'))) continue
  const a = PNG.sync.read(readFileSync(f('prototype.png')))
  const b = PNG.sync.read(readFileSync(f('site.png')))
  const nom = d.replace(/^identique-écran-entier-ide-[0-9a-f]+-/, '')
  if (a.height !== b.height || a.width !== b.width) {
    console.log(`${nom} : hauteur prototype ${a.height}, site ${b.height} (${b.height - a.height > 0 ? '+' : ''}${b.height - a.height})`)
    continue
  }
  const e = PNG.sync.read(readFileSync(f('ecart.png')))
  const bandes = []
  for (let y = 0; y < e.height; y++) {
    let n = 0
    for (let x = 0; x < e.width; x++) {
      const i = (y * e.width + x) * 4
      if (e.data[i] === 255 && e.data[i + 1] < 60 && e.data[i + 2] < 60) n++
    }
    if (!n) continue
    const z = bandes.at(-1)
    if (z && y - z[1] <= 6) (z[1] = y), (z[2] += n)
    else bandes.push([y, y, n])
  }
  console.log(`${nom} : ${bandes.map(([a, b, n]) => `y${a}-${b} (${n})`).join(', ')}`)
}
