// Regroupe les pixels différents d'une image d'écart en bandes horizontales et découpe les deux captures
// autour de chaque bande (utilisé par comparer.mjs).
import { readFileSync, writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'

export function bandes(base) {
  const ecart = PNG.sync.read(readFileSync(base + '-ecart.png'))
  const proto = PNG.sync.read(readFileSync(base + '-proto.png'))
  const site = PNG.sync.read(readFileSync(base + '-site.png'))
  // pixelmatch marque en rouge les pixels différents.
  const rouge = (x, y) => {
    const i = (y * ecart.width + x) * 4
    return ecart.data[i] === 255 && ecart.data[i + 1] < 60 && ecart.data[i + 2] < 60
  }
  const zones = []
  for (let y = 0; y < ecart.height; y++) {
    let n = 0
    let x0 = Infinity
    let x1 = -1
    for (let x = 0; x < ecart.width; x++)
      if (rouge(x, y)) {
        n++
        x0 = Math.min(x0, x)
        x1 = Math.max(x1, x)
      }
    if (!n) continue
    const z = zones.at(-1)
    if (z && y - z.y1 <= 12) Object.assign(z, { y1: y, n: z.n + n, x0: Math.min(z.x0, x0), x1: Math.max(z.x1, x1) })
    else zones.push({ y0: y, y1: y, n, x0, x1 })
  }
  const decoupe = (img, z) => {
    const y0 = Math.max(0, z.y0 - 20)
    const y1 = Math.min(img.height, z.y1 + 20)
    const o = new PNG({ width: img.width, height: y1 - y0 })
    PNG.bitblt(img, o, 0, y0, img.width, y1 - y0, 0, 0)
    return PNG.sync.write(o)
  }
  zones.forEach((z, i) => {
    console.log(`bande ${i} : y ${z.y0}-${z.y1} px (écran ${z.y0 / 2}-${z.y1 / 2}), x ${z.x0}-${z.x1}, ${z.n} pixels`)
    if (i < 8) {
      writeFileSync(`${base}-z${i}-proto.png`, decoupe(proto, z))
      writeFileSync(`${base}-z${i}-site.png`, decoupe(site, z))
    }
  })
}
