// Un PDF d'une page, sans bibliothèque : du texte en Helvetica (police standard du PDF, encodage WinAnsi pour
// les accents, « · », « × », « ’ »). Sert aux documents que la démonstration fabrique sur l'appareil (factures) ;
// l'API servira les vrais documents, émis par BelivaY (CCO-20).

export interface LignePdf {
  texte: string
  x?: number // en points depuis la gauche (A4 : 595 × 842)
  taille?: number
  gras?: boolean
  droite?: string // texte calé à droite sur la même ligne
  espace?: number // espace avant la ligne (points)
}

// Unicode → WinAnsi (CP1252) ; ce qui n'existe pas devient « ? ».
const SPECIAUX: Record<string, number> = { '’': 0x92, '‘': 0x91, '“': 0x93, '”': 0x94, '–': 0x96, '—': 0x97, '…': 0x85, '€': 0x80, '−': 0x2d, ' ': 0x20, ' ': 0x20 }
function octets(s: string): number[] {
  return [...s].map((c) => SPECIAUX[c] ?? (c.charCodeAt(0) < 256 ? c.charCodeAt(0) : 0x3f))
}
const echapper = (s: string) => s.replace(/[\\()]/g, (c) => '\\' + c)

// Largeur approchée d'un texte en Helvetica (pour caler à droite) : moyenne de 0,5 em, chiffres à 0,556 em.
const largeur = (s: string, taille: number) => [...s].reduce((n, c) => n + (/\d/.test(c) ? 0.556 : c === ' ' ? 0.278 : 0.5), 0) * taille

// Coupe un paragraphe en lignes qui tiennent dans la largeur donnée (en points).
export function couper(texte: string, largeurMax: number, taille = 11): string[] {
  const lignes: string[] = []
  let ligne = ''
  for (const mot of texte.split(' ')) {
    const essai = ligne ? ligne + ' ' + mot : mot
    if (ligne && largeur(essai, taille) > largeurMax) {
      lignes.push(ligne)
      ligne = mot
    } else ligne = essai
  }
  if (ligne) lignes.push(ligne)
  return lignes
}

export function pdfTexte(lignes: LignePdf[]): Blob {
  let y = 800
  const flux: string[] = []
  for (const l of lignes) {
    const taille = l.taille ?? 11
    y -= (l.espace ?? 0) + taille * 1.45
    const police = l.gras ? '/F2' : '/F1'
    flux.push(`BT ${police} ${taille} Tf ${l.x ?? 56} ${y.toFixed(1)} Td (${echapper(l.texte)}) Tj ET`)
    if (l.droite) flux.push(`BT ${police} ${taille} Tf ${(539 - largeur(l.droite, taille)).toFixed(1)} ${y.toFixed(1)} Td (${echapper(l.droite)}) Tj ET`)
  }
  const contenu = flux.join('\n')
  const objets = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    null, // le flux, écrit en octets
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ]
  const sortie: number[] = []
  const ecrire = (s: string | number[]) => sortie.push(...(typeof s === 'string' ? octets(s) : s))
  ecrire('%PDF-1.4\n')
  const positions: number[] = []
  objets.forEach((o, i) => {
    positions.push(sortie.length)
    if (o === null) {
      const corps = octets(contenu)
      ecrire(`${i + 1} 0 obj\n<< /Length ${corps.length} >>\nstream\n`)
      ecrire(corps)
      ecrire('\nendstream\nendobj\n')
    } else ecrire(`${i + 1} 0 obj\n${o}\nendobj\n`)
  })
  const xref = sortie.length
  ecrire(`xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`)
  for (const p of positions) ecrire(`${String(p).padStart(10, '0')} 00000 n \n`)
  ecrire(`trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  return new Blob([new Uint8Array(sortie)], { type: 'application/pdf' })
}

// Partager un fichier (feuille de partage du téléphone) ; sinon l'enregistrer.
export async function partagerFichier(blob: Blob, nom: string, titre: string): Promise<'partage' | 'enregistre'> {
  const fichier = new File([blob], nom, { type: blob.type })
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: titre })
      return 'partage'
    } catch {
      // Partage annulé : rien à faire.
      return 'partage'
    }
  }
  enregistrerFichier(blob, nom)
  return 'enregistre'
}

export function enregistrerFichier(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
