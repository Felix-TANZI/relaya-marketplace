// Écran « Galerie » (CL-06), repris pour l'usage réel (DP-54) : les photos du produit (?p=…, ?i=… ou ?a=<avis>)
// lues dans le catalogue, puis les photos d'acheteurs vérifiés (lues dans les avis, après un séparateur) ;
// précédente et suivante (boutons, flèches du clavier), glisser du doigt, toucher deux fois pour zoomer ;
// vignettes ; légende (vue du vendeur, ou note et date de l'acheteur avec « Lire son avis ») ; prix et retour
// à la fiche pour choisir et acheter ; Échap ou fermer revient à la fiche ; produit introuvable.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type AvisProduit, type Produit } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useDes } from '../../composants/ecran'

const VUES = ['Face', 'Dos', 'Trois-quarts', 'Détail']

type Photo = { d: string; vue: string | null; avis: AvisProduit | null }

export function Galerie() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const souris = useDes('tab-l') && matchMedia('(hover: hover) and (pointer: fine)').matches
  const cle = params.get('p') ?? 'camon30'
  const [pr, setPr] = useState<Produit | null | undefined>(undefined)
  const [acheteurs, setAcheteurs] = useState<AvisProduit[]>([])
  const [i, setI] = useState(Number(params.get('i') || 0))
  const [zoom, setZoom] = useState(false)
  const debut = useRef<number | null>(null)
  useEffect(() => {
    Promise.all([source.produit(cle), source.avisProduit(cle)]).then(([p, x]) => {
      const avec = (x?.avis ?? []).filter((a) => a.photo)
      setPr(p)
      setAcheteurs(avec)
      // ?a=<avis> : ouvre sur la photo de cet acheteur (lien depuis les avis).
      const n = avec.findIndex((y) => y.id === params.get('a'))
      if (p && n >= 0) setI(p.dessins.length + n)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle])
  const photos: Photo[] = pr ? [...pr.dessins.map((d, j) => ({ d, vue: VUES[j] ?? 'Photo', avis: null })), ...acheteurs.map((a) => ({ d: a.photo!, vue: null, avis: a }))] : []
  const n = photos.length
  const k = n ? ((i % n) + n) % n : 0
  const aller = (d: number) => (setI(k + d), setZoom(false))
  const fermer = () => pr && naviguer(chemin('fiche', { p: pr.p }))
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') aller(1)
      else if (e.key === 'ArrowLeft') aller(-1)
      else if (e.key === 'Escape') fermer()
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  })
  // Ordinateur : Ctrl + molette zoome ou dézoome (le navigateur ne zoome pas la page à la place).
  const visionneuse = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = visionneuse.current
    if (!el) return
    const molette = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      setZoom(e.deltaY < 0)
    }
    el.addEventListener('wheel', molette, { passive: false })
    return () => el.removeEventListener('wheel', molette)
  })
  if (pr === undefined) return null
  if (!pr)
    return (
      <Ecran route="galerie">
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="image-off" taille={26} />
            </div>
            <h3>{t('Produit introuvable')}</h3>
            <p>{t('Il a peut-être été retiré de la vente. Cherche un produit proche.')}</p>
            <div className="btns">
              <Link to={chemin('recherche')} className="btn primary">
                <span>{t('Chercher un produit')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const ph = photos[k]
  const nVendeur = pr.dessins.length
  return (
    <Ecran route="galerie">
      <div className="cl06-vw">
        <div className="cl06-vt">
          <Link to={chemin('fiche', { p: pr.p })} className="ibtn" aria-label={t('Fermer')}>
            <Icone nom="x" taille={24} />
          </Link>
          <div className="grow">
            <b>{t(pr.titre)}</b>
            {pr.variante && <span>{t(pr.variante)}</span>}
          </div>
          {n > 0 && <span className="cl06-n">{tf('{a} / {b}', { a: k + 1, b: n })}</span>}
        </div>
        <div
          ref={visionneuse}
          className="cl06-vi"
          role="img"
          aria-label={ph ? (ph.avis ? tf('Photo {n} : photo d’acheteur', { n: k + 1 }) : tf('Photo {n} : {v}', { n: k + 1, v: t(ph.vue ?? 'Photo') })) : t('Pas encore de photo')}
          style={{ display: 'block', position: 'relative', overflow: 'hidden', touchAction: 'pan-y' }}
          onDoubleClick={() => setZoom(!zoom)}
          onPointerDown={(e) => (debut.current = e.clientX)}
          onPointerUp={(e) => {
            if (debut.current === null) return
            const dx = e.clientX - debut.current
            debut.current = null
            if (Math.abs(dx) > 40) aller(dx < 0 ? 1 : -1)
          }}
        >
          <div style={{ transform: zoom ? 'scale(2)' : 'none', transition: 'transform .2s', height: '100%' }}>{ph && <Dessin id={ph.d} />}</div>
          {n > 1 && (
            <>
              <button type="button" className="ibtn" aria-label={t('Photo précédente')} onClick={() => aller(-1)} style={{ position: 'absolute', left: 8, top: '45%' }}>
                <Icone nom="chevron-left" taille={22} />
              </button>
              <button type="button" className="ibtn" aria-label={t('Photo suivante')} onClick={() => aller(1)} style={{ position: 'absolute', right: 8, top: '45%' }}>
                <Icone nom="chevron-right" taille={22} />
              </button>
            </>
          )}
        </div>
        <div className="cl06-vc">
          {!ph ? (
            <b>{t('Pas encore de photo')}</b>
          ) : ph.avis ? (
            <>
              <b>{t('Photo d’acheteur vérifié')}</b>
              <div className="m">
                {tf('{n} sur 5', { n: ph.avis.note })} · {jourSeul(ph.avis.le, langue)}
                {ph.avis.variante && ' · ' + t(ph.avis.variante)}
              </div>
              <Link to={chemin('avis', { p: pr.p, f: 'photo' })} className="cl06-lk2">
                {t('Lire son avis')}
                <Icone nom="chevron-right" taille={15} />
              </Link>
            </>
          ) : (
            <b>{t('Photo du vendeur · ' + (ph.vue ?? 'Photo'))}</b>
          )}
        </div>
        <div className="hint-l">
          <Icone nom="zoom-in" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          {/* Souris et clavier (grands écrans) : les gestes du téléphone sont dits avec les mots de l'ordinateur. */}
          <span>{souris ? t(zoom ? 'Double-clic pour revenir.' : 'Flèches du clavier pour changer de photo ; double-clic pour zoomer.') : t(zoom ? 'Touche deux fois pour revenir.' : 'Glisse pour changer de photo ; touche deux fois pour zoomer.')}</span>
        </div>
        <div className="cl06-th scroll-x mt12">
          {photos.map((x, j) => (
            <span key={x.d + j} style={{ display: 'contents' }}>
              {j === nVendeur && j > 0 && <i className="sep" aria-hidden="true" />}
              <a href="#" className={(j === k ? 'on' : '') + (x.avis ? ' by' : '')} aria-label={x.avis ? t('Photo d’acheteur') : t(x.vue ?? 'Photo')} aria-current={j === k || undefined} onClick={(e) => (e.preventDefault(), setI(j), setZoom(false))}>
                <Dessin id={x.d} />
              </a>
            </span>
          ))}
        </div>
        {acheteurs.length > 0 && (
          <div className="hint-l">
            <Icone nom="user-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('{v} photos du vendeur, puis {a} photos d’acheteurs vérifiés.', { v: nVendeur, a: acheteurs.length })}</span>
          </div>
        )}
        <div className="btns mt16">
          <Link to={chemin('fiche', { p: pr.p })} className="btn primary">
            <Icone nom="shopping-cart" taille={18} />
            <span>{tf(pr.depuis ? 'Choisir et acheter · dès {m} F' : 'Choisir et acheter · {m} F', { m: F(pr.depuis ?? pr.prix) })}</span>
          </Link>
        </div>
      </div>
    </Ecran>
  )
}
