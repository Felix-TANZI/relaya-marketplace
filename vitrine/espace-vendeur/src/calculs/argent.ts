// Montants et arrondis (moteurs/belivay_moteurs/argent.py) : francs entiers ; un taux ou un multiplicateur se calcule
// sans virgule flottante (le float est interdit dans un calcul d'argent, comme dans relaya-marketplace) ; un seul
// arrondi, au franc, moitié vers le haut. Les nombres décimaux sont des fractions exactes (BigInt), l'équivalent du
// Decimal de Python : 13,5 % × 0,85 × 0,80 de 20 000 F donne exactement 1 836 F.

/** Fraction exacte n / d (d > 0), toujours réduite. */
export class Dec {
  readonly n: bigint
  readonly d: bigint
  // Écriture d'origine d'un nombre lu dans le registre (« 0.80 ») : les traces l'écrivent telle quelle, comme Decimal.
  readonly ecrit: string | null
  private constructor(n: bigint, d: bigint, ecrit: string | null = null) {
    this.ecrit = ecrit
    if (d === 0n) throw new RangeError('division par zéro')
    if (d < 0n) {
      n = -n
      d = -d
    }
    const g = pgcd(n < 0n ? -n : n, d)
    this.n = n / g
    this.d = d / g
  }
  /** Entier, ou écriture décimale exacte (« 13.5 », « 13,5 », « 0.85 ») ; jamais un nombre à virgule. */
  static de(v: number | bigint | string | Dec): Dec {
    if (v instanceof Dec) return v
    if (typeof v === 'bigint') return new Dec(v, 1n)
    if (typeof v === 'number') {
      if (!Number.isInteger(v)) throw new TypeError(`nombre à virgule interdit dans un calcul d'argent : ${v} (écrire « ${v} » en texte)`)
      return new Dec(BigInt(v), 1n)
    }
    const m = /^(-?)(\d+)(?:[.,](\d+))?$/.exec(v.trim())
    if (!m) throw new TypeError(`écriture décimale illisible : « ${v} »`)
    const frac = m[3] ?? ''
    const n = BigInt(m[2] + frac) * (m[1] ? -1n : 1n)
    return new Dec(n, 10n ** BigInt(frac.length), (m[1] + m[2] + (m[3] !== undefined ? '.' + frac : '')))
  }
  plus(o: Dec | number): Dec {
    const b = Dec.de(o)
    return new Dec(this.n * b.d + b.n * this.d, this.d * b.d)
  }
  moins(o: Dec | number): Dec {
    const b = Dec.de(o)
    return new Dec(this.n * b.d - b.n * this.d, this.d * b.d)
  }
  fois(o: Dec | number): Dec {
    const b = Dec.de(o)
    return new Dec(this.n * b.n, this.d * b.d)
  }
  sur(o: Dec | number): Dec {
    const b = Dec.de(o)
    return new Dec(this.n * b.d, this.d * b.n)
  }
  cmp(o: Dec | number): number {
    const b = Dec.de(o)
    const x = this.n * b.d - b.n * this.d
    return x < 0n ? -1 : x > 0n ? 1 : 0
  }
  eq(o: Dec | number): boolean {
    return this.cmp(o) === 0
  }
  /** Arrondi au franc, moitié vers le haut (ROUND_HALF_UP : la moitié s'éloigne de zéro). */
  francs(): number {
    const a = this.n < 0n ? -this.n : this.n
    const q = (2n * a + this.d) / (2n * this.d)
    return Number(this.n < 0n ? -q : q)
  }
  /** Arrondi à l'entier supérieur (ROUND_CEILING). */
  plafond(): number {
    const q = this.n / this.d
    return Number(this.n % this.d !== 0n && this.n > 0n ? q + 1n : q)
  }
  /** Écriture décimale exacte quand elle existe (traces), sinon approchée à 6 chiffres. */
  texte(): string {
    if (this.ecrit !== null) return this.ecrit
    let d = this.d
    let k = 0
    while (d % 10n === 0n) {
      d /= 10n
      k++
    }
    let d2 = d
    let deux = 0
    let cinq = 0
    while (d2 % 2n === 0n) {
      d2 /= 2n
      deux++
    }
    while (d2 % 5n === 0n) {
      d2 /= 5n
      cinq++
    }
    if (d2 !== 1n) return (Number(this.n) / Number(this.d)).toFixed(6)
    const ch = Math.max(deux, cinq) + k
    const n = (this.n * 10n ** BigInt(ch)) / this.d
    const s = (n < 0n ? -n : n).toString().padStart(ch + 1, '0')
    const ent = s.slice(0, s.length - ch) || '0'
    const dec = s.slice(s.length - ch).replace(/0+$/, '')
    return (n < 0n ? '-' : '') + ent + (dec ? '.' + dec : '')
  }
}
function pgcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b]
  return a || 1n
}

export const max = (...v: Dec[]) => v.reduce((a, b) => (b.cmp(a) > 0 ? b : a))
export const min = (...v: Dec[]) => v.reduce((a, b) => (b.cmp(a) < 0 ? b : a))

/** « 2 % × 272 579 = 5 451,58 → 5 452 F ». */
export const pourcentageDe = (montant: number, tauxPourCent: Dec) => Dec.de(montant).fois(tauxPourCent).sur(100).francs()

/** Pourcentage affiché à l'unité, moitié vers le haut (« barre 62 % »). */
export function pourCentAffiche(partie: number, total: number): number {
  if (total <= 0) throw new RangeError('total nul ou négatif')
  return Dec.de(partie).fois(100).sur(total).francs()
}

/** Écriture d'un montant pour les traces, comme à l'écran : « 17 840 F », « −900 F » (espaces insécables). */
export function ecrire(montant: number): string {
  const s = Math.abs(montant).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return (montant < 0 ? '−' : '') + s + ' F'
}
