// Blocs éditoriaux de l'accueil (CL-04), rendus depuis les contenus remplaçables (donnees/contenus.ts,
// GET /api/content/home) : même balisage que le prototype (Accueil.tsx l'avait écrit en dur dans chaque état).
// Une photo du serveur remplace le dessin de chaque bandeau ou catégorie ; le dessin reste en repli.
// Carrousel : sans photo du serveur, la photo déposée dans public/images/carrousel/<photo>.webp (ou .jpg) se pose
// sur le dessin, en fondu, une fois chargée ; absente, rien ne change (public/images/carrousel/LISEZMOI.md).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { useLieu } from '../../composants/PourQui'
import { useContenuAccueil } from '../../composants/contenus'
import { usePreferences } from '../../preferences'

// Photo déposée d'une bande : .webp, puis .jpg ; ce qui a été trouvé (ou non) est gardé le temps de la visite,
// pour ne pas redemander un fichier absent. Recadrée par le navigateur (object-fit: cover, sujet à droite), voile
// sombre en bas à gauche pour le texte ; chargement paresseux sauf la première bande.
const FORMATS = ['webp', 'jpg'] as const
const TROUVEES = new Map<string, string | null>()
export function PhotoBande({ nom, alt, premiere }: { nom: string; alt: string; premiere: boolean }) {
  const connue = TROUVEES.get(nom)
  const [essai, setEssai] = useState(0)
  const [chargee, setChargee] = useState(false)
  if (connue === null) return null
  const src = connue ?? `/images/carrousel/${nom}.${FORMATS[essai]}`
  return (
    <span className={'h0-ph' + (chargee ? ' on' : '')}>
      <img
        src={src}
        alt={alt}
        loading={premiere ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={premiere ? 'high' : 'low'}
        onLoad={() => (TROUVEES.set(nom, src), setChargee(true))}
        onError={() => (essai + 1 < FORMATS.length && connue === undefined ? setEssai(essai + 1) : (TROUVEES.set(nom, null), setChargee(false), setEssai(FORMATS.length)))}
      />
    </span>
  )
}

// Carrousel (h0-hero) et ses points.
export function CarrouselAccueil() {
  const { t } = usePreferences()
  const lieu = useLieu()
  const { carrousel } = useContenuAccueil()
  return (
    <>
      <div className="h0-hero">
        {carrousel.map((b, i) => (
          <Link key={b.lien + i} to={b.lien} className="h0-band">
            <span className="im">
              <Dessin id={b.dessin} image={b.image} alt={b.titre} tailles="100vw" />
              {!b.image && b.photo && <PhotoBande nom={b.photo} alt={t(b.titre)} premiere={i === 0} />}
            </span>
            <span className="sh"></span>
            <span className="bt">
              <span className="lb">{t(b.titre)}</span>
              <b>
                {b.sous.map((x, j) => [j > 0 && t(' · '), <span key={j}>{t(x)}</span>])}
              </b>
              <small>
                <span className="nw">
                  <span>{t(b.produits)}</span>
                  {t(' produits')}
                </span>
                {t(' · ')}
                <span>{lieu.r('retrait au Relais Mvog-Ada')}</span>
              </small>
            </span>
          </Link>
        ))}
      </div>
      <div className="h0-dots">
        {carrousel.map((b, i) => (
          <i key={b.lien + i} className={i === 0 ? 'on' : undefined}></i>
        ))}
      </div>
    </>
  )
}

// Catégories mises en avant (h0-pills) : « Explorer », puis les catégories (la première est active).
export function CategoriesAccueil() {
  const { t } = usePreferences()
  const { categories } = useContenuAccueil()
  return (
    <nav className="h0-pills" aria-label="Catégories">
      <Link to="/categories" className="ico">
        <Icone nom="layout-grid" taille={17} />
        {t('Explorer')}
      </Link>
      {categories.map((c, i) => (
        <Link key={c.lien + i} to={c.lien} className={i === 0 ? 'on' : undefined}>
          <span className="th">
            <Dessin id={c.dessin} image={c.image} alt={c.titre} tailles="40px" />
          </span>
          {t(c.titre)}
        </Link>
      ))}
    </nav>
  )
}

// Bandeau de confiance (h0-why) : « Pourquoi choisir BelivaY ? » et ses cartes.
export function ConfianceAccueil() {
  const { t } = usePreferences()
  const lieu = useLieu()
  const { confiance } = useContenuAccueil()
  return (
    <section className="h0-why">
      <h2>
        <span className="q">{t(confiance.question)}</span>{' '}
        <span>{t(confiance.marque)}</span>
        {t(' ?')}
      </h2>
      {confiance.cartes.map((c, i) => (
        <Link key={c.lien + i} to={c.lien}>
          <span className={'wi ' + c.ton}>
            <Icone nom={c.icone} taille={22} />
          </span>
          <b>{t(c.titre)}</b>
          <p>{lieu.r(c.texte)}</p>
          <em>
            {t(c.action)}
            <Icone nom="arrow-right" taille={14} />
          </em>
        </Link>
      ))}
    </section>
  )
}
