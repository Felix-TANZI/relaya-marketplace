// Écran « Espace école » (CL-15 ; EX-01), forme d'origine du prototype rendue réelle (DP-54) : pour une école vérifiée
// (depuis quand ; publier est gratuit) : ses listes de la saison par section, publiées (modifiées, voir la liste) ou en
// brouillon, publier un brouillon ; la date de publication ; ce que voient les parents (chaque article rattaché à un
// produit au prix livré, aucune donnée d'élève) ; chaque modification gardée dans l'historique et annoncée aux
// parents qui ont ouvert la liste.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useRentree } from './Commun'
import { Bloc } from '../CL-14/Commun'
import { FfRentree } from './Rentree'

export function Ecole() {
  const { t, tf, langue } = usePreferences()
  const [d, recharger] = useRentree()
  if (!d) return null
  const e = d.ecoles[0]
  const listes = d.listes.filter((l) => l.ecole === e.id)
  const brouillons = listes.filter((l) => l.statut !== 'publiee')
  const premiere = listes.reduce<number | null>((m, l) => (l.publieeLe && (!m || l.publieeLe < m) ? l.publieeLe : m), null)
  const publier = async (id: string) => (await source.publierListe(id), recharger())
  return (
    <Ecran route="ecole" largeur="moyen" sousTitre={tf('Rentrée {s}', { s: d.saison })}>
      <Styles id="ddcb0e469a" />
      <FfRentree />
      <div className="pg">
        <div className="pg-k">{t('Espace école')}</div>
        <h1 className="pg-t">{t(e.nom)}</h1>
        <p className="pg-s">{tf('Listes de la rentrée {s}', { s: d.saison })}</p>
      </div>
      {e.verifiee && (
        <div className="card green cl15-box">
          <span className="bi">
            <Icone nom="badge-check" taille={20} />
          </span>
          <div className="grow">
            <b className="bt">{t('Compte vérifié par BelivaY')}</b>
            <p>{tf('Depuis le {d}. Publier est gratuit : BelivaY ne te verse rien et ne te demande rien.', { d: jourSeul(e.depuis, langue) })}</p>
          </div>
        </div>
      )}
      <Bloc classe="g5-ecole">
      {(['fr', 'en'] as const).map((s) => {
        const ls = listes.filter((l) => l.section === s)
        if (!ls.length) return null
        return (
          <div key={s}>
            <div className="sec">
              <h2>{tf(ls.filter((l) => l.statut === 'publiee').length > 1 ? '{s} · {n} publiées' : '{s} · {n} publiée', { s: t(s === 'fr' ? 'Section francophone' : 'Section anglophone'), n: ls.filter((l) => l.statut === 'publiee').length })}</h2>
            </div>
            <div className="card tight">
              {ls.map((l) =>
                l.statut === 'publiee' ? (
                  <Link key={l.id} to={chemin('rentree-liste', { l: l.id })} className="li">
                    <span className="ic green">
                      <Icone nom="file-check" taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt" style={{ display: 'block' }}>
                        {l.classe}
                      </span>
                      <span className="ls" style={{ display: 'block' }}>
                        {l.historique.length > 1
                          ? tf('{n} articles · modifiée le {d}', { n: l.articles.length, d: jourSeul(l.historique[0].le, langue) })
                          : l.publieeLe && l.publieeLe !== premiere
                            ? tf('{n} articles · publiée le {d}', { n: l.articles.length, d: jourSeul(l.publieeLe, langue) })
                            : tf('{n} articles', { n: l.articles.length })}
                      </span>
                    </span>
                    <span className="chev">
                      <Icone nom="chevron-right" taille={18} />
                    </span>
                  </Link>
                ) : (
                  <div key={l.id} className="li">
                    <span className="ic amber">
                      <Icone nom="file-pen" taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt" style={{ display: 'block' }}>
                        {l.classe}
                      </span>
                      <span className="ls" style={{ display: 'block' }}>
                        {tf('{n} articles · pas encore publiée', { n: l.articles.length })}
                      </span>
                    </span>
                    <span className="pill amber sm">{t('Brouillon')}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        )
      })}
      </Bloc>
      {premiere && (
        <div className="hint-l">
          <Icone nom="calendar-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Listes publiées le {d}, dès l’ouverture de la saison.', { d: jourSeul(premiere, langue) })}</span>
        </div>
      )}
      {brouillons.map((l) => (
        <div key={l.id} className="btns">
          <button type="button" className="btn primary" onClick={() => publier(l.id)}>
            <Icone nom="upload" taille={18} />
            <span>{tf('Publier la liste {c}', { c: l.classe })}</span>
          </button>
        </div>
      ))}
      <details className="more">
        <summary>
          <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Modifier une liste, ce que voient les parents')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Chaque modification est gardée dans l’historique de la liste. Les parents qui l’ont ouverte sont prévenus du changement.')}</p>
          <p>{t('Chaque article est rattaché à un produit, au prix livré à leur relais. Ils décochent ce qu’ils ont déjà. Aucune donnée d’élève : ils choisissent seulement la classe.')}</p>
        </div>
      </details>
    </Ecran>
  )
}
