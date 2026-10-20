// PDF d'une page, texte seul (Helvetica, codage WinAnsi), sans bibliothèque : le bon de préparation à partager
// (VD05-R14 : « Partager en PDF », A4 ou ticket de 80 mm). En production, GET /orders/{id}/slip rend le même PDF.
export interface LignePdf {
  texte: string
  taille?: number // points (10 par défaut)
  gras?: boolean
  espace?: number // espace avant, en points
}

// Caractères hors Latin-1 du texte français, vers leur place dans WinAnsi.
const WINANSI: Record<string, number> = { '’': 0x92, '‘': 0x91, '“': 0x93, '”': 0x94, '–': 0x96, '—': 0x97, '…': 0x85, '•': 0x95, '€': 0x80, ' ': 0x20, ' ': 0x20 }

function octets(s: string): number[] {
  const r: number[] = []
  for (const c of s) {
    const n = WINANSI[c] ?? c.charCodeAt(0)
    r.push(n <= 0xff ? n : 0x3f)
  }
  return r
}
const echapper = (s: string) => s.replace(/[\\()]/g, (c) => '\\' + c)

/** Coupe une ligne trop longue pour la largeur (estimation Helvetica : 0,5 × taille par caractère). */
function couper(l: LignePdf, largeur: number): LignePdf[] {
  const taille = l.taille ?? 10
  const max = Math.max(12, Math.floor(largeur / (taille * 0.5)))
  if (l.texte.length <= max) return [l]
  const mots = l.texte.split(' ')
  const r: LignePdf[] = []
  let cur = ''
  for (const m of mots) {
    if ((cur + ' ' + m).trim().length > max && cur) {
      r.push({ ...l, texte: cur, espace: r.length ? 0 : l.espace })
      cur = m
    } else cur = (cur + ' ' + m).trim()
  }
  if (cur) r.push({ ...l, texte: cur, espace: r.length ? 0 : l.espace })
  return r
}

export function pdfTexte(lignes: LignePdf[], format: 'a4' | 'ticket'): Blob {
  const largeur = format === 'a4' ? 595 : 227
  const marge = format === 'a4' ? 56 : 14
  const toutes = lignes.flatMap((l) => couper(l, largeur - 2 * marge))
  const hauteurTexte = toutes.reduce((s, l) => s + (l.espace ?? 0) + (l.taille ?? 10) * 1.35, 0)
  const hauteur = format === 'a4' ? 842 : Math.ceil(hauteurTexte + 2 * marge)
  let y = hauteur - marge
  const flux: string[] = ['BT']
  for (const l of toutes) {
    const taille = l.taille ?? 10
    y -= (l.espace ?? 0) + taille * 1.35
    flux.push(`/${l.gras ? 'F2' : 'F1'} ${taille} Tf 1 0 0 1 ${marge} ${y.toFixed(1)} Tm (${echapper(String.fromCharCode(...octets(l.texte)))}) Tj`)
  }
  flux.push('ET')
  const contenu = flux.join('\n')
  const objets = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${largeur} ${hauteur}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${contenu.length} >>\nstream\n${contenu}\nendstream`,
  ]
  let corps = '%PDF-1.4\n'
  const positions: number[] = []
  objets.forEach((o, i) => {
    positions.push(corps.length)
    corps += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = corps.length
  corps += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n` + positions.map((p) => String(p).padStart(10, '0') + ' 00000 n \n').join('')
  corps += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  // Chaque caractère du corps est un octet (0-255) : longueurs et positions exactes.
  return new Blob([Uint8Array.from(corps, (c) => c.charCodeAt(0))], { type: 'application/pdf' })
}
