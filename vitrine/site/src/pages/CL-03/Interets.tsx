// Écran « Centres d'intérêt » (CL-03), forme d'origine du prototype rendue réelle (DP-54) : à l'arrivée, la photo
// « Mode, maison, téléphones, beauté… », puis le client touche les univers qui l'intéressent (avec le nombre réel
// de produits) ; le choix est gardé et range l'accueil et les catégories ; « Passer » ou « Continuer » mènent à la
// connexion du lancement (étape 2 sur 3). Sous les tuiles : ce que devient le choix (jamais montré aux vendeurs)
// et ce qui vient ensuite.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import img_8e2e582c56b3_jpg from '../../assets/prototype/8e2e582c56b3.jpg'
import { UNIVERS } from '../../composants/Catalogue'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { Partage } from './Arrivee'

export function Interets() {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const [choix, setChoix] = useState<string[]>([])
  const [nb, setNb] = useState<Record<string, number>>({})
  const [envoi, setEnvoi] = useState(false)
  useEffect(() => {
    source.interets().then(setChoix)
    source.produits().then((ps) => setNb(ps.reduce<Record<string, number>>((m, p) => ((m[p.univers] = (m[p.univers] ?? 0) + 1), m), {})))
  }, [])
  const suite = chemin('connexion', { lancement: '1' })
  const continuer = async () => {
    if (envoi) return
    setEnvoi(true)
    await source.choisirInterets(choix)
    naviguer(suite)
  }
  return (
    <Ecran route="interets" gabarit="arrivee">
      <Styles id="f16ded0d4c" />
      <Partage
        haut={
          <div className="cl03-top">
            <Link to={chemin('bienvenue')} className="cl03-back" aria-label={t('Revenir')}>
              <span>
                <Icone nom="chevron-left" taille={22} />
              </span>
            </Link>
            <Link to={suite} className="btn soft sm">
              <span>{t('Passer')}</span>
            </Link>
          </div>
        }
        visuel={
          <>
            <Styles id="1c3d953197" />
            <div className="ph-ban" style={{ backgroundImage: `url(${img_8e2e582c56b3_jpg})` }} role="img" aria-label={t('Mode, maison, téléphones, beauté…')}>
              <span className="tx">
                <b>{t('Mode, maison, téléphones, beauté…')}</b>
                <span>{t('Tout ce dont tu as besoin, au même endroit.')}</span>
              </span>
            </div>
          </>
        }
      >
        <div className="pg">
          <h1 className="pg-t">{t('Qu’est-ce qui t’intéresse ?')}</h1>
          <p className="pg-s">{t('Touche quelques catégories. On s’en sert seulement pour ranger ton accueil.')}</p>
        </div>
        <div className="cl03-tiles">
          {UNIVERS.map((u) => {
            const on = choix.includes(u.id)
            return (
              <a
                key={u.id}
                href="#"
                className={'cl03-tile' + (on ? ' on' : '')}
                role="checkbox"
                aria-checked={on}
                onClick={(e) => (e.preventDefault(), setChoix(on ? choix.filter((x) => x !== u.id) : [...choix, u.id]))}
              >
                <span className="ti">
                  <Icone nom={u.icone} taille={21} />
                </span>
                <b>{t(u.titre)}</b>
                <small>
                  <span>{nb[u.id] ?? 0}</span>
                  {t((nb[u.id] ?? 0) > 1 ? ' produits' : ' produit')}
                </small>
                {on && (
                  <span className="ck">
                    <Icone nom="check" taille={14} trait={3} />
                  </span>
                )}
              </a>
            )
          })}
        </div>
        <div className="hint-l">
          <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>
            {t('Ton choix reste sur ton compte : il n’est jamais montré aux vendeurs. ')}
            <Link to={chemin('legal-doc', { d: 'confidentialite' })}>{t('Politique de confidentialité')}</Link>
          </span>
        </div>
        <div className="hint-l">
          <Icone nom="arrow-right" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Ensuite : ton compte, en un geste. Tu peux aussi regarder les produits sans compte.')}</span>
        </div>
        <div className="mt16">
          <button type="button" className={'btn primary' + (envoi ? ' off' : '')} onClick={continuer}>
            <Icone nom="arrow-right" taille={18} />
            <span>{choix.length ? tf(choix.length > 1 ? 'Continuer · {n} choisies' : 'Continuer · {n} choisie', { n: choix.length }) : t('Continuer')}</span>
          </button>
        </div>
        <div className="row" style={{ gap: '10px', marginTop: '10px' }}>
          <div className="grow">
            <div className="steps" style={{ marginTop: '0' }}>
              <i className="on"></i>
              <i className="cur"></i>
              <i className=""></i>
            </div>
          </div>
          <span className="t12 b8 c3 nw">{t('2 / 3')}</span>
        </div>
      </Partage>
    </Ecran>
  )
}
