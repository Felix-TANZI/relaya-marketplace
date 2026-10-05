// Écran « Photographie ta liste » (CL-15 ; EX-01), forme d'origine du prototype rendue réelle (DP-54) : le cadre de la
// photo (toute la liste, une photo par page, à plat ; la photo prise s'y affiche), la classe (seulement : ni nom, ni
// âge, ni photo de l'élève) ; prendre la photo et envoyer ; un agent BelivaY la saisit sous 24 h. Envoyée : la date
// de saisie, la classe, la photo, aucune donnée de l'élève ; elle reste la tienne, jamais publiée comme liste
// officielle.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { reduirePhoto, TYPES_PHOTO } from '../../donnees/photo'
import { source } from '../../donnees/source'
import { dateA, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useRentree } from './Commun'
import { FfRentree } from './Rentree'

const CLASSES = ['SIL', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '5e', '4e', '3e']

export function RentreeListePapier() {
  const { t, tf, langue } = usePreferences()
  const [d, recharger] = useRentree()
  const [classe, setClasse] = useState<string | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [envoyee, setEnvoyee] = useState(false)
  const [vu, setVu] = useState(false)
  const fichier = useRef<HTMLInputElement>(null)
  const apres = useRef(false) // « Prendre la photo et envoyer » : l'envoi suit la photo
  if (!d) return null
  const envoyer = async (c: string, p: string) => (await source.envoyerListePapier(c, p), recharger(), setEnvoyee(true))
  if (envoyee && d.papier[0])
    return (
      <Ecran route="rentree-liste-papier" gabarit="centre">
        <Styles id="ddcb0e469a" />
        <FfRentree />
        <div className="card cl15-dn">
          <div className="cl15-dh">
            <span className="cl15-di green">
              <Icone nom="file-check" taille={30} trait={2.2} />
            </span>
            <h2>{t('Liste reçue')}</h2>
            <div className="s">{tf('Saisie avant le {d}', { d: dateA(d.papier[0].pretLe, langue) })}</div>
            <p className="cl15-p">{t('Un agent BelivaY recopie ta liste et rattache chaque article à un produit. Tu reçois un message dès qu’elle est prête.')}</p>
          </div>
          <div className="cl15-db">
            <div className="cl15-kv">
              <span className="k">{t('Classe')}</span>
              <span className="v">{d.papier[0].classe}</span>
            </div>
            <div className="cl15-kv">
              <span className="k">{t('Photo')}</span>
              <span className="v">{tf('1 page · envoyée {d}', { d: quand(d.papier[0].le, d.maintenant, langue) })}</span>
            </div>
            <div className="cl15-kv">
              <span className="k">{t('Données de l’élève')}</span>
              <span className="v">{t('aucune')}</span>
            </div>
          </div>
        </div>
        <div className="cl15-inf">
          <Icone nom="info" taille={17} />
          <span>{t('Cette liste reste la tienne : elle n’est pas publiée comme liste officielle de l’école.')}</span>
        </div>
        <div className="btns">
          <Link to={chemin('rentree')} className="btn primary">
            <span>{t('Revenir à la rentrée')}</span>
          </Link>
        </div>
      </Ecran>
    )
  return (
    <Ecran route="rentree-liste-papier" gabarit="centre">
      <Styles id="ddcb0e469a" />
      <FfRentree />
      <div className="pg">
        <h1 className="pg-t">{t('Photographie ta liste')}</h1>
        <p className="pg-s">{t('Un agent BelivaY la saisit sous 24 h. Tu cocheras ensuite ce que tu as déjà.')}</p>
      </div>
      <input
        ref={fichier}
        type="file"
        accept={TYPES_PHOTO.join(',')}
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return (apres.current = false)
          const p = await reduirePhoto(f)
          setPhoto(p)
          if (apres.current && classe) await envoyer(classe, p)
          apres.current = false
        }}
      />
      <div className="cl15-cam" role="button" tabIndex={0} aria-label={t(photo ? 'Reprendre la photo' : 'Prendre ou choisir la photo')} style={{ cursor: 'pointer' }} onClick={() => fichier.current?.click()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fichier.current?.click()}>
        <i className="c c1"></i>
        <i className="c c2"></i>
        <i className="c c3"></i>
        <i className="c c4"></i>
        {photo ? (
          <img src={photo} alt={t('Ta liste')} style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', display: 'block', margin: '0 auto' }} />
        ) : (
          <>
            <Icone nom="file-text" taille={34} />
            <div>
              <b>{t('Place toute la liste dans le cadre')}</b>
              <br />
              {t('Une photo par page, bien à plat, à la lumière.')}
            </div>
          </>
        )}
      </div>
      <div className="sec">
        <h2>{t('Classe')}</h2>
      </div>
      <div className="chips" role="radiogroup" aria-label={t('Classe')}>
        {CLASSES.map((c) => (
          <a key={c} href="#" role="radio" aria-checked={classe === c} className={'chip' + (classe === c ? ' on' : '')} onClick={(e) => (e.preventDefault(), setClasse(c))}>
            {c}
          </a>
        ))}
      </div>
      {vu && !classe && (
        <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
          {t('Choisis la classe.')}
        </div>
      )}
      <div className="cl15-inf">
        <Icone nom="shield-check" taille={17} />
        <span>{t('On ne te demande que la classe : ni nom, ni âge, ni photo de l’élève.')}</span>
      </div>
      <div className="btns">
        <button
          type="button"
          className="btn primary"
          onClick={async () => {
            setVu(true)
            if (!classe) return
            if (!photo) return ((apres.current = true), fichier.current?.click())
            await envoyer(classe, photo)
          }}
        >
          <Icone nom={photo ? 'send' : 'camera'} taille={18} />
          <span>{t(photo ? 'Envoyer ma liste' : 'Prendre la photo et envoyer')}</span>
        </button>
      </div>
      {photo && (
        <div className="links cl15-lk">
          <a href="#" role="button" onClick={(e) => (e.preventDefault(), fichier.current?.click())}>
            {t('Reprendre la photo')}
          </a>
        </div>
      )}
    </Ecran>
  )
}
