// Compression d'avance des fichiers texte de la vitrine (brotli et gzip), à la construction de l'image : le serveur
// (serveur/vitrine.mjs) envoie le .br ou le .gz selon Accept-Encoding, sans compresser à chaque requête.
//   node serveur/compresser.mjs <dist>
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const dist = process.argv[2]
if (!dist) throw new Error('usage : node serveur/compresser.mjs <dist>')
const TEXTE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.webmanifest', '.txt', '.xml', '.map'])

/** @param {string} d @returns {string[]} */
const fichiers = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? fichiers(join(d, n)) : [join(d, n)]))

let n = 0
for (const f of fichiers(dist)) {
  if (!TEXTE.has(extname(f)) || statSync(f).size < 1024) continue
  const brut = readFileSync(f)
  writeFileSync(f + '.br', brotliCompressSync(brut, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: brut.length } }))
  writeFileSync(f + '.gz', gzipSync(brut, { level: 9 }))
  n++
}
console.log(`compresser : ${n} fichiers (br, gz)`)
