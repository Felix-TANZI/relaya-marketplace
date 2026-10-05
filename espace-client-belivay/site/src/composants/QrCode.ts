// Vrai QR code (ISO/IEC 18004), lisible par tout téléphone : mode octets (UTF-8), correction d'erreur M (15 %),
// versions 1 à 10 (jusqu'à 213 octets : un lien de liste en prend une quarantaine). Sert à l'image de statut d'une
// liste d'envies (ImageStatut.ts) : le QR mène à la page de la liste. Aucune bibliothèque, aucun réseau.
// Algorithme classique : données + Reed-Solomon par blocs entrelacés, motifs fixes (repères, alignement, cadence,
// version), placement en zigzag, masque choisi par la plus petite pénalité (règles 1, 2 et 4 de la norme).

const ECC_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26] // codes de correction par bloc (niveau M)
const BLOCS_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5] // nombre de blocs (niveau M)

function modulesBruts(v: number): number {
  let n = (16 * v + 128) * v + 64
  if (v >= 2) {
    const a = Math.floor(v / 7) + 2
    n -= (25 * a - 10) * a - 55
    if (v >= 7) n -= 36
  }
  return n
}
const motsDonnees = (v: number) => Math.floor(modulesBruts(v) / 8) - ECC_M[v] * BLOCS_M[v]

function mul(x: number, y: number): number {
  let z = 0
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z & 0xff
}
function diviseur(degre: number): number[] {
  const r = new Array<number>(degre).fill(0)
  r[degre - 1] = 1
  let racine = 1
  for (let i = 0; i < degre; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = mul(r[j], racine)
      if (j + 1 < r.length) r[j] ^= r[j + 1]
    }
    racine = mul(racine, 0x02)
  }
  return r
}
function reste(donnees: number[], div: number[]): number[] {
  const r = div.map(() => 0)
  for (const b of donnees) {
    const f = b ^ (r.shift() as number)
    r.push(0)
    div.forEach((c, i) => (r[i] ^= mul(c, f)))
  }
  return r
}

/** La matrice du QR code (true : module noir), sans la marge blanche (4 modules à ajouter autour). */
export function qrMatrice(texte: string): boolean[][] {
  const octets = [...new TextEncoder().encode(texte)]
  let v = 1
  for (; v <= 10; v++) if (4 + (v < 10 ? 8 : 16) + octets.length * 8 <= motsDonnees(v) * 8) break
  if (v > 10) throw new Error('QR : texte trop long')
  // Flux de bits : mode octets, longueur, octets, fin, remplissage.
  const bits: number[] = []
  const pousser = (val: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1)
  }
  pousser(4, 4)
  pousser(octets.length, v < 10 ? 8 : 16)
  octets.forEach((o) => pousser(o, 8))
  const cap = motsDonnees(v) * 8
  pousser(0, Math.min(4, cap - bits.length))
  pousser(0, (8 - (bits.length % 8)) % 8)
  for (let p = 0xec; bits.length < cap; p ^= 0xec ^ 0x11) pousser(p, 8)
  const donnees: number[] = []
  for (let i = 0; i < bits.length; i += 8) donnees.push(parseInt(bits.slice(i, i + 8).join(''), 2))
  // Correction d'erreur par blocs, puis entrelacement.
  const nb = BLOCS_M[v]
  const ecc = ECC_M[v]
  const brut = Math.floor(modulesBruts(v) / 8)
  const courts = nb - (brut % nb)
  const longCourt = Math.floor(brut / nb)
  const div = diviseur(ecc)
  const blocs: number[][] = []
  for (let i = 0, k = 0; i < nb; i++) {
    const d = donnees.slice(k, k + longCourt - ecc + (i < courts ? 0 : 1))
    k += d.length
    const e = reste(d, div)
    if (i < courts) d.push(0)
    blocs.push([...d, ...e])
  }
  const mots: number[] = []
  for (let i = 0; i < blocs[0].length; i++) blocs.forEach((b, j) => (i !== longCourt - ecc || j >= courts) && mots.push(b[i]))

  const n = v * 4 + 17
  const m: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false))
  const fixe: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false))
  const poser = (x: number, y: number, noir: boolean) => ((m[y][x] = noir), (fixe[y][x] = true))
  // Cadence, repères, alignement.
  for (let i = 0; i < n; i++) (poser(6, i, i % 2 === 0), poser(i, 6, i % 2 === 0))
  const repere = (x: number, y: number) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy))
        const xx = x + dx
        const yy = y + dy
        if (xx >= 0 && xx < n && yy >= 0 && yy < n) poser(xx, yy, d !== 2 && d !== 4)
      }
  }
  repere(3, 3)
  repere(n - 4, 3)
  repere(3, n - 4)
  if (v > 1) {
    const na = Math.floor(v / 7) + 2
    const pas = Math.ceil((v * 4 + 4) / (na * 2 - 2)) * 2
    const pos = [6]
    for (let p = n - 7; pos.length < na; p -= pas) pos.splice(1, 0, p)
    for (let i = 0; i < na; i++)
      for (let j = 0; j < na; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) poser(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
      }
  }
  const format = (masque: number) => {
    const d = (0 << 3) | masque // niveau M : 00
    let r = d
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537)
    const b = ((d << 10) | r) ^ 0x5412
    const bit = (i: number) => ((b >>> i) & 1) === 1
    for (let i = 0; i <= 5; i++) poser(8, i, bit(i))
    poser(8, 7, bit(6))
    poser(8, 8, bit(7))
    poser(7, 8, bit(8))
    for (let i = 9; i < 15; i++) poser(14 - i, 8, bit(i))
    for (let i = 0; i < 8; i++) poser(n - 1 - i, 8, bit(i))
    for (let i = 8; i < 15; i++) poser(8, n - 15 + i, bit(i))
    poser(8, n - 8, true)
  }
  format(0)
  if (v >= 7) {
    let r = v
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25)
    const b = (v << 12) | r
    for (let i = 0; i < 18; i++) {
      const noir = ((b >>> i) & 1) === 1
      const a = n - 11 + (i % 3)
      const c = Math.floor(i / 3)
      poser(a, c, noir)
      poser(c, a, noir)
    }
  }
  // Données en zigzag, de droite à gauche, deux colonnes à la fois.
  let i = 0
  for (let droite = n - 1; droite >= 1; droite -= 2) {
    if (droite === 6) droite = 5
    for (let vert = 0; vert < n; vert++)
      for (let j = 0; j < 2; j++) {
        const x = droite - j
        const y = ((droite + 1) & 2) === 0 ? n - 1 - vert : vert
        if (!fixe[y][x] && i < mots.length * 8) {
          m[y][x] = ((mots[i >>> 3] >>> (7 - (i & 7))) & 1) === 1
          i++
        }
      }
  }
  const masquer = (k: number) => {
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        if (fixe[y][x]) continue
        const inv = [(x + y) % 2 === 0, y % 2 === 0, x % 3 === 0, (x + y) % 3 === 0, (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, ((x * y) % 2) + ((x * y) % 3) === 0, (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (((x + y) % 2) + ((x * y) % 3)) % 2 === 0][k]
        if (inv) m[y][x] = !m[y][x]
      }
  }
  const penalite = () => {
    let p = 0
    for (let a = 0; a < 2; a++)
      for (let k = 0; k < n; k++) {
        let suite = 1
        for (let l = 1; l < n; l++) {
          const c = a ? m[l][k] : m[k][l]
          const prec = a ? m[l - 1][k] : m[k][l - 1]
          if (c === prec) suite++
          else (suite >= 5 && (p += suite - 2), (suite = 1))
        }
        if (suite >= 5) p += suite - 2
      }
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3
    const noirs = m.reduce((s, r) => s + r.filter(Boolean).length, 0)
    return p + Math.floor(Math.abs(noirs * 20 - n * n * 10) / (n * n)) * 10
  }
  let meilleur = 0
  let min = Infinity
  for (let k = 0; k < 8; k++) {
    masquer(k)
    format(k)
    const p = penalite()
    if (p < min) ((min = p), (meilleur = k))
    masquer(k)
  }
  masquer(meilleur)
  format(meilleur)
  return m
}
