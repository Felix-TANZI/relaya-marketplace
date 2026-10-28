// Écran « Choisir la classe » (CL-15 ; EX-01), forme d'origine du prototype rendue réelle (DP-54) : l'école (?ecole=…)
// vérifiée par BelivaY, la date de publication de ses listes, ses sections (francophone, anglophone), chaque classe
// publiée avec son nombre d'articles et le prix livré de toute la liste au relais (calculé par le moteur) ; la classe
// de la liste en cours est marquée.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { calculListe, useRentree } from './Commun'
import { EtapesRentree, FfRentree } from './Rentree'

export function RentreeClasse() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const [d] = useRentree()
  const [choix, setSection] = useState<'fr' | 'en' | null>(null)
  // Dès 1024 px, les deux sections sont côte à côte, une colonne chacune : le choix de section n'a plus lieu d'être
  // (§ 5.13).
  const grand = useDes('tab-l')
  if (!d) return null
  const e = d.ecoles.find((x) => x.id === params.get('ecole')) ?? d.ecoles[0]
  const listes = d.listes.filter((l) => l.ecole === e.id && l.statut === 'publiee')
  const sections = [...new Set(listes.map((l) => l.section))]
  const section = choix ?? sections[0] ?? 'fr'
  const premiere = listes.reduce<number | null>((m, l) => (l.publieeLe && (!m || l.publieeLe < m) ? l.publieeLe : m), null)
  const enCours = d.enCours?.colis[0]?.produit.split(' · ')[0].replace(/^Liste /, '') ?? null
  const cote = grand && sections.length > 1
  const classes = (s: string) =>
    listes
      .filter((l) => l.section === s || sections.length < 2)
      .map((l) => {
        const on = l.classe === enCours
        return (
          <Link key={l.id} to={chemin('rentree-liste', { l: l.id })} className={'cl15-op' + (on ? ' on' : '')}>
            <span className={'ic-sq ' + (on ? 'or' : '') + ' cl15-cl'}>{l.classe}</span>
            <span className="tx">
              <b>{tf('{n} articles', { n: l.articles.length })}</b>
            </span>
            <span className="price">
              {F(calculListe(l, [], []).total)}
              <small>{t(' F')}</small>
            </span>
            <Icone nom="chevron-right" taille={18} />
          </Link>
        )
      })
  return (
    <Ecran route="rentree-classe" largeur="moyen">
      <Styles id="ddcb0e469a" />
      <EtapesRentree n={1} />
      <FfRentree />
      <div className="card ">
        <div className="row">
          <span className="ic-sq or">
            <Icone nom="school" taille={22} />
          </span>
          <div className="grow">
            <div className="t15 b8" style={{ lineHeight: '1.3' }}>
              {t(e.nom)}
            </div>
            <div className="t13 c3 mt4">{premiere ? tf('{q} · listes publiées le {d}', { q: t(e.quartier), d: jourSeul(premiere, langue) }) : tf('{q} · pas encore de liste publiée', { q: t(e.quartier) })}</div>
          </div>
        </div>
        {e.verifiee && (
          <div className="cl15-strip">
            <span className="pill green sm">
              <Icone nom="badge-check" taille={13} />
              {t('École vérifiée par BelivaY')}
            </span>
          </div>
        )}
      </div>
      {sections.length > 1 && !grand && (
        <div className="seg" role="radiogroup" aria-label={t('Section')}>
          {(['fr', 'en'] as const)
            .filter((s) => sections.includes(s))
            .map((s) => (
              <a key={s} href="#" role="radio" aria-checked={section === s} className={section === s ? 'on' : ''} onClick={(ev) => (ev.preventDefault(), setSection(s))}>
                {t(s === 'fr' ? 'Section francophone' : 'Section anglophone')}
              </a>
            ))}
        </div>
      )}
      <div className="hint-l">
        <Icone nom="map-pin" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{tf('Prix livré de toute la liste au {r}.', { r: t(d.relais ?? 'relais') })}</span>
      </div>
      {cote ? (
        <div className="g5-sections">
          {(['fr', 'en'] as const)
            .filter((x) => sections.includes(x))
            .map((x) => (
              <section key={x} aria-label={t(x === 'fr' ? 'Section francophone' : 'Section anglophone')}>
                <div className="sec">
                  <h2>{t(x === 'fr' ? 'Section francophone' : 'Section anglophone')}</h2>
                </div>
                {classes(x)}
              </section>
            ))}
        </div>
      ) : (
        classes(section)
      )}
      {!listes.length && (
        <div className="card ">
          <div className="empty">
            <h3>{t('Pas encore de liste pour cette école')}</h3>
            <p>{t('Photographie ta liste papier : un agent BelivaY la saisit sous 24 h.')}</p>
            <div className="btns">
              <Link to={chemin('rentree-liste-papier')} className="btn secondary">
                <Icone nom="camera" taille={18} />
                <span>{t('Liste papier ? Photographie-la')}</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </Ecran>
  )
}
