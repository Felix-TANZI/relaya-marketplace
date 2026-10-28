// Exports de la console (motif M6, repris de l'entreprise) : PDF texte seul (Helvetica, codage WinAnsi, sans bibliothèque), CSV
// (séparateur « ; », BOM UTF-8 : ouvert tel quel par un tableur en français), téléchargement d'un fichier. Servent au
// dossier de preuves (ENT-P16R-03 : empreinte SHA-256, horodatages, positions ; export journalisé), aux relevés,
// règlements, rapports, colis, missions. En production, le serveur rend les mêmes fichiers, signés.
const WINANSI: Record<string, number> = { '’': 0x92, '‘': 0x91, '“': 0x93, '”': 0x94, '•': 0x95, '€': 0x80, '−': 0x2d, '«': 0xab, '»': 0xbb, '–': 0x96, '—': 0x97, '…': 0x85, '·': 0xb7, ' ': 0x20, ' ': 0x20 }
const octets = (s: string) => [...s].map((c) => WINANSI[c] ?? (c.charCodeAt(0) <= 0xff ? c.charCodeAt(0) : 0x3f))
const echapper = (s: string) => String.fromCharCode(...octets(s)).replace(/[\\()]/g, (c) => '\\' + c)

export interface LignePdf {
  texte: string
  taille?: number
  espace?: number
}

/** Pages A4 de texte (coupées à la largeur, nouvelle page quand la page est pleine). */
export function pdf(lignes: LignePdf[]): Blob {
  return new Blob([Uint8Array.from([...pdfBinaire(lignes)].map((c) => c.charCodeAt(0) & 0xff))], { type: 'application/pdf' })
}

/** Le même PDF en chaîne d'octets (un caractère par octet) : contenu d'un fichier rendu par la source. */
export function pdfBinaire(lignes: LignePdf[]): string {
  const largeur = 595
  const hauteur = 842
  const marge = 50
  const pages: string[][] = [[]]
  let y = hauteur - marge
  for (const l of lignes) {
    const taille = l.taille ?? 9
    const max = Math.floor((largeur - 2 * marge) / (taille * 0.5))
    const mots = l.texte.split(' ')
    const coupees: string[] = []
    let cur = ''
    for (const m of mots) {
      if ((cur + ' ' + m).trim().length > max && cur) {
        coupees.push(cur)
        cur = m
      } else cur = (cur + ' ' + m).trim()
    }
    coupees.push(cur)
    y -= l.espace ?? 0
    for (const c of coupees) {
      y -= taille * 1.4
      if (y < marge) {
        pages.push([])
        y = hauteur - marge - taille * 1.4
      }
      pages[pages.length - 1].push(`BT /F1 ${taille} Tf ${marge} ${y.toFixed(1)} Td (${echapper(c)}) Tj ET`)
    }
  }
  const objets: string[] = []
  const n = pages.length
  objets.push('<< /Type /Catalog /Pages 2 0 R >>')
  objets.push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + 2 * i} 0 R`).join(' ')}] /Count ${n} >>`)
  objets.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  pages.forEach((p, i) => {
    const flux = p.join('\n')
    objets.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${largeur} ${hauteur}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + 2 * i} 0 R >>`)
    objets.push(`<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`)
  })
  let sortie = '%PDF-1.4\n'
  const positions: number[] = []
  objets.forEach((o, i) => {
    positions.push(sortie.length)
    sortie += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = sortie.length
  sortie += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${positions.map((p) => String(p).padStart(10, '0') + ' 00000 n \n').join('')}`
  sortie += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return sortie
}

/** CSV : une ligne d'en-têtes puis les lignes ; « ; » comme séparateur, guillemets si besoin, BOM UTF-8. */
export function csv(entetes: string[], lignes: (string | number | null | undefined)[][]): string {
  const champ = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '\ufeff' + [entetes, ...lignes].map((l) => l.map(champ).join(';')).join('\r\n') + '\r\n'
}

/** Fichier rendu par la source (nom, contenu, type) : un PDF arrive en chaîne d'octets, le reste en texte. */
export function fichier(contenu: string, type: string): Blob {
  if (type.startsWith('application/pdf')) return new Blob([Uint8Array.from([...contenu].map((c) => c.charCodeAt(0) & 0xff))], { type })
  return new Blob([contenu], { type })
}

/** Empreinte SHA-256 (hexadécimal) d'un texte : celle de la photo en production. */
export async function empreinte(s: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function telecharger(b: Blob, nom: string) {
  const url = URL.createObjectURL(b)
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
