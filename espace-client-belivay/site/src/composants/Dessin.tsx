// Dessin de la démonstration (portrait, plan, photo, produit), tel que le prototype le dessine : même balise
// <svg>, mêmes attributs, aux couleurs du thème (outils/transcrire.mjs l'a relevé en clair et en sombre).
// Photo du serveur : quand la donnée en porte une (`image` : produit, boutique, relais, bandeau…), elle est montrée à
// la place du dessin (srcset, chargement paresseux, texte alternatif) ; sans photo, ou si elle ne se charge pas, le
// dessin reste en repli. En démonstration, aucune donnée n'a de photo : rendu identique au prototype.
import { createElement, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { CHARGEURS } from 'virtual:dessins'
import type { PhotoServeur } from '../donnees/source'
import { usePreferences } from '../preferences'

interface D {
  attrs: Record<string, string>
  clair: string
  sombre?: string
}
// Un fichier par dessin (vite.config.ts, « dessins-a-la-demande ») : un écran ne charge que les dessins qu'il
// affiche ; un dessin déjà venu s'affiche aussitôt (gardé le temps de la visite).
const CHARGES = new Map<string, D | null>()
const EN_COURS = new Map<string, Promise<D | null>>()
function charger(id: string): Promise<D | null> {
  let p = EN_COURS.get(id)
  if (!p) {
    const f = CHARGEURS[id]
    p = (f ? f().then((m) => m.default as D | null) : Promise.resolve(null)).then(
      (d) => (CHARGES.set(id, d), d),
      (e: unknown) => {
        EN_COURS.delete(id) // réseau coupé : le prochain affichage réessaie
        throw e
      },
    )
    EN_COURS.set(id, p)
  }
  return p
}
// Le dessin en SVG autonome (clair), pour le dessiner hors de la page : image de statut d'une liste (ImageStatut).
// Les couleurs du thème (var(--…)) prennent leur valeur de repli, ou un gris neutre.
export async function svgDuDessin(id: string): Promise<string | null> {
  const d = id ? await charger(id).catch(() => null) : null
  if (!d) return null
  const attrs = Object.entries({ xmlns: 'http://www.w3.org/2000/svg', ...d.attrs, width: '400', height: '400' })
    .filter(([k]) => k !== 'class' && k !== 'style')
    .map(([k, v]) => `${k}="${v.replace(/&(?![a-z]+;|#\d+;)/gi, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')}"`)
    .join(' ')
  return `<svg ${attrs}>${d.clair}</svg>`.replace(/var\(--[\w-]+,\s*([^)]+)\)/g, '$1').replace(/var\(--[\w-]+\)/g, '#8F8A94').replace(/&nbsp;/g, '&#160;')
}
function useDessin(id: string): { pret: boolean; d: D | null } {
  const [, maj] = useState(0)
  const pret = CHARGES.has(id)
  useEffect(() => {
    if (pret) return
    let actif = true
    charger(id).then(
      () => actif && maj((n) => n + 1),
      () => undefined,
    )
    return () => {
      actif = false
    }
  }, [id, pret])
  return { pret, d: CHARGES.get(id) ?? null }
}

const camel = (k: string) => (k.startsWith('--') ? k : k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()))
function style(s: string): CSSProperties {
  return Object.fromEntries(
    s
      .split(';')
      .filter((d) => d.includes(':'))
      .map((d) => {
        const i = d.indexOf(':')
        return [camel(d.slice(0, i).trim()), d.slice(i + 1).trim()]
      }),
  ) as CSSProperties
}
function props(a: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(a).map(([k, v]) => {
      if (k === 'class') return ['className', v]
      if (k === 'style') return ['style', style(v)]
      if (k.startsWith('aria-') || k.startsWith('data-') || k === 'viewBox' || k === 'xmlns') return [k, v]
      return [camel(k), v]
    }),
  )
}

// Les textes d'un dessin (étiquettes d'un plan : « Maison », « Relais ») passent par t(), comme tout nœud de
// texte du prototype ; les entités HTML restent telles quelles.
const echappe = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const desechappe = (v: string) => v.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, '\u00A0').replace(/&amp;/g, '&')

// Données économes : rien ne se charge avant un toucher ; un toucher apporte ce dessin-là.
const vus = new Set<string>()
// Photos qui n'ont pas pu se charger (adresse morte, réseau) : le dessin les remplace le temps de la visite.
const echouees = new Set<string>()
// Largeur affichée par défaut d'une vignette (grille de deux colonnes sur téléphone, plus sur grand écran).
const TAILLES = '(min-width: 1200px) 25vw, (min-width: 768px) 33vw, 50vw'
const STYLE_PHOTO: CSSProperties = { display: 'block', width: '100%', height: '100%', objectFit: 'cover' }

export function Dessin({ id, image, alt, tailles }: { id: string; image?: PhotoServeur | null; alt?: string; tailles?: string }) {
  const [, setEchec] = useState(0)
  const photo = image?.url && !echouees.has(image.url) ? image : null
  if (photo) return <PhotoServie photo={photo} alt={alt} tailles={tailles} onEchec={() => (echouees.add(photo.url), setEchec((n) => n + 1))} />
  return id ? <DessinDemo id={id} /> : null // ni photo ni dessin (donnée du serveur sans image)
}
// Données économes : comme un dessin, la photo attend un toucher.
function PhotoServie({ photo, alt, tailles, onEchec }: { photo: PhotoServeur; alt?: string; tailles?: string; onEchec: () => void }) {
  const { donneesEconomes, t } = usePreferences()
  const [vu, setVu] = useState(vus.has(photo.url))
  if (donneesEconomes && !vu)
    return (
      <span
        role="button"
        tabIndex={0}
        aria-label={t('Afficher l’image')}
        className="dessin-eco"
        onClick={(e) => (e.preventDefault(), e.stopPropagation(), vus.add(photo.url), setVu(true))}
      />
    )
  return (
    <img
      key={photo.url}
      className="dessin-photo"
      src={photo.url}
      srcSet={photo.srcset || undefined}
      sizes={photo.srcset ? (tailles ?? TAILLES) : undefined}
      alt={photo.alt ?? (alt ? t(alt) : '')}
      loading="lazy"
      decoding="async"
      style={STYLE_PHOTO}
      onError={onEchec}
    />
  )
}
function DessinDemo({ id }: { id: string }) {
  const { donneesEconomes, t } = usePreferences()
  const [vu, setVu] = useState(vus.has(id))
  if (donneesEconomes && !vu && !CHARGES.has(id))
    return (
      <span
        role="button"
        tabIndex={0}
        aria-label={t('Afficher l’image')}
        className="dessin-eco"
        onClick={(e) => (e.preventDefault(), e.stopPropagation(), vus.add(id), setVu(true))}
      />
    )
  return <DessinCharge id={id} />
}
function DessinCharge({ id }: { id: string }) {
  const { theme, t } = usePreferences()
  const { pret, d } = useDessin(id)
  const brut = d ? (theme === 'dark' && d.sombre !== undefined ? d.sombre : d.clair) : ''
  const interieur = useMemo(() => brut.replace(/>([^<]*[A-Za-zÀ-ÿ][^<]*)</g, (_, v: string) => '>' + echappe(t(desechappe(v))) + '<'), [brut, t])
  if (!pret) return null
  if (!d) {
    console.error('[dessin absent]', id)
    return null
  }
  return createElement('svg', { ...props(d.attrs), dangerouslySetInnerHTML: { __html: interieur } })
}
