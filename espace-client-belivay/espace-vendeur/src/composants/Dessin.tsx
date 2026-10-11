// Dessins du prototype vendeur, sans marque :
// - <Dessin id> : un dessin relevé dans un état du prototype (pages provisoires, src/genere/dessins.json), même
//   balise <svg>, mêmes attributs, en clair ou en sombre ;
// - <Vignette nom taille> : l'illustration nommée d'un produit ou d'un portrait (ART du prototype : itel, flagship,
//   charger, pagne, coque, ecouteurs, person), dans sa vignette arrondie (thumb() du prototype) ;
// - <PhotoDessinee nom> : une photo dessinée de preuve (PHOTO : counter, box, relay, cracked).
// Une donnée qui porte une vraie photo (adresse ou data:) la montre à la place : les illustrations sont remplaçables.
import { createElement, useId, type CSSProperties } from 'react'
import dessins from '../genere/dessins.json'
import illustrations from '../genere/illustrations.json'
import { usePreferences } from '../preferences'

interface D {
  attrs: Record<string, string>
  clair: string
  sombre?: string
}
const DESSINS = dessins as Record<string, D>
const ART = illustrations.art as Record<string, string>
const PHOTOS = illustrations.photos as Record<string, string>
export const SVG_LANCEMENT = illustrations.lancement

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

export function Dessin({ id }: { id: string }) {
  const { theme } = usePreferences()
  const suffixe = useSuffixe()
  const d = DESSINS[id]
  if (!d) {
    console.error('[dessin absent]', id)
    return null
  }
  return createElement('svg', {
    'aria-hidden': 'true',
    focusable: 'false',
    ...props(d.attrs),
    dangerouslySetInnerHTML: { __html: unique(theme === 'dark' && d.sombre ? d.sombre : d.clair, suffixe) },
  })
}

// Accessibilité (vague 4) : un dessin est décoratif (aria-hidden) ; son sens est dit par le texte voisin ou par
// `alt` (Vignette). Les identifiants internes (dégradés « g », « wd », « sco »…) sont rendus uniques par dessin affiché :
// deux vignettes d'une même page ne partagent plus un id (WCAG 4.1.1 ; un url(#g) visait le premier dessin).
function unique(svg: string, suffixe: string): string {
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])
  let r = svg
  for (const id of ids)
    r = r
      .replaceAll(`id="${id}"`, `id="${id}-${suffixe}"`)
      .replaceAll(`url(#${id})`, `url(#${id}-${suffixe})`)
      .replaceAll(`href="#${id}"`, `href="#${id}-${suffixe}"`)
  return r
}
const masque = (svg: string) => (/^<svg\b[^>]*aria-hidden/.test(svg) ? svg : svg.replace(/^<svg\b/, '<svg aria-hidden="true" focusable="false"'))
const useSuffixe = () => useId().replace(/[^a-zA-Z0-9]/g, '')

const estPhoto = (s: string) => /^(data:|https?:|\/)/.test(s)

/** Vignette d'un produit (thumb() du prototype) : illustration nommée, ou vraie photo si la donnée en porte une. */
export function Vignette({ nom, taille = 56, alt = '' }: { nom: string; taille?: number; alt?: string }) {
  const suffixe = useSuffixe()
  const boite: CSSProperties = { width: taille + 'px', height: taille + 'px', borderRadius: Math.round(taille / 4) + 'px' }
  if (estPhoto(nom))
    return (
      <span className="thumb" style={boite}>
        <img src={nom} alt={alt} width={taille} height={taille} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </span>
    )
  const svg = unique(masque((ART[nom] ?? ART.itel).replace('width="56" height="56"', `width="${taille}" height="${taille}"`)), suffixe)
  // Une vignette décrite (alt) est une image nommée ; sinon le dessin est décoratif.
  return <span className="thumb" style={boite} role={alt ? 'img' : undefined} aria-label={alt || undefined} dangerouslySetInnerHTML={{ __html: svg }} />
}

/** Photo dessinée de preuve (photo() du prototype), avec son horodatage. */
export function PhotoDessinee({ nom, horodatage }: { nom: string; horodatage?: string }) {
  const suffixe = useSuffixe()
  return (
    <div className="photo">
      {estPhoto(nom) ? <img src={nom} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: unique(masque(PHOTOS[nom] ?? PHOTOS.box), suffixe) }} />}
      {horodatage && <span className="ts">{horodatage}</span>}
    </div>
  )
}
