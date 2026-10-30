// Choix d'un fichier avec aperçu obligatoire (ENT-P03R-01, ENT-RG-R77) : photo ou PDF, aperçu affiché avant l'envoi,
// envoi impossible tant que l'aperçu n'est pas lisible. Lisible : le fichier s'ouvre (image décodée, PDF qui commence
// par « %PDF »), il ne dépasse pas taille_max_piece Mo, et une photo a au moins ENT-PIECE-RESOLUTION-MIN pixels sur son petit
// côté (seuil technique de lecture d'une pièce, proposé au registre : INTEGRATION.md). Le fichier ne part pas d'ici :
// l'écran transmet sa description à la source, le serveur le reçoit en multipart et le vérifie à son tour.
import { useEffect, useRef, useState } from 'react'
import { Icone } from '../../composants/Icone'
import { PARAMETRES } from '../../calculs/registre'
import { usePreferences } from '../../preferences'


export interface Fichier {
  nom: string
  taille: number
  type: string
  url: string
  lisible: boolean
  raison: 'taille' | 'format' | 'flou' | 'illisible' | null
}

async function examiner(f: File): Promise<Fichier> {
  const url = URL.createObjectURL(f)
  const base = { nom: f.name, taille: f.size, type: f.type, url }
  if (f.size > PARAMETRES.acces.tailleMaxPieceMo * 1024 * 1024) return { ...base, lisible: false, raison: 'taille' }
  if (f.type === 'application/pdf') {
    const tete = new TextDecoder().decode(await f.slice(0, 5).arrayBuffer())
    return { ...base, lisible: tete === '%PDF-', raison: tete === '%PDF-' ? null : 'illisible' }
  }
  if (!f.type.startsWith('image/')) return { ...base, lisible: false, raison: 'format' }
  const img = new Image()
  const ok = await new Promise<boolean>((r) => {
    img.onload = () => r(true)
    img.onerror = () => r(false)
    img.src = url
  })
  if (!ok) return { ...base, lisible: false, raison: 'illisible' }
  const petit = Math.min(img.naturalWidth, img.naturalHeight)
  return { ...base, lisible: petit >= PARAMETRES.acces.resolutionPiecePx, raison: petit >= PARAMETRES.acces.resolutionPiecePx ? null : 'flou' }
}

export function ChoixFichier({ accepte, fichier, choisir, libelle }: { accepte: string; fichier: Fichier | null; choisir: (f: Fichier | null) => void; libelle: string }) {
  const { t, tf } = usePreferences()
  const champ = useRef<HTMLInputElement>(null)
  const [examen, setExamen] = useState(false)
  useEffect(() => () => void (fichier && URL.revokeObjectURL(fichier.url)), [fichier])
  const raison = {
    taille: tf('Fichier trop lourd : {n} Mo au plus.', { n: PARAMETRES.acces.tailleMaxPieceMo }),
    format: t('Format refusé : une photo ou un PDF.'),
    flou: t('Photo trop petite pour être lue : reprenez-la de plus près, bien éclairée.'),
    illisible: t('Ce fichier ne s’ouvre pas : choisissez-en un autre.'),
  }
  return (
    <div className="e-fichier">
      <input
        ref={champ}
        type="file"
        accept={accepte}
        aria-label={libelle}
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return choisir(null)
          setExamen(true)
          choisir(await examiner(f))
          setExamen(false)
        }}
      />
      {examen && <span className="aide">{t('Lecture de l’aperçu…')}</span>}
      {fichier && (
        <>
          {fichier.type === 'application/pdf' ? fichier.lisible && <iframe src={fichier.url} title={tf('Aperçu de {nom}', { nom: fichier.nom })} /> : fichier.raison !== 'illisible' && fichier.raison !== 'format' && <img src={fichier.url} alt={tf('Aperçu de {nom}', { nom: fichier.nom })} />}
          <span className="nom">
            <Icone nom={fichier.lisible ? 'circle-check' : 'circle-x'} taille={16} />
            {`${fichier.nom} · ${(fichier.taille / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`}
          </span>
          {fichier.lisible ? <span className="aide">{t('Aperçu lisible : vous pouvez l’envoyer.')}</span> : <span className="err">{raison[fichier.raison ?? 'illisible']}</span>}
        </>
      )}
    </div>
  )
}
