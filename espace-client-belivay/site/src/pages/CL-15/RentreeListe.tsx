// Écran « Liste officielle » (CL-15 ; EX-01), forme d'origine du prototype rendue réelle (DP-54) : la liste d'une classe
// (?l=…) par groupe, avec les consignes de l'école ; décocher ce que l'enfant a déjà (le total est recalculé depuis
// zéro : un article seul de sa boutique emporte son ramassage) ; un équivalent conforme quand l'école le permet,
// choisi dans une feuille (jamais pour une édition exigée) ; la dernière modification de l'école et l'historique de
// la liste ; tout mettre au panier, ou mettre toute la liste de côté (acompte, versements avant la rentrée).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Feuille } from '../../composants/Feuille'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import type { ArticleRentree } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { calculListe, MettreListeDeCote, useRentree } from './Commun'
import { EtapesRentree, FfRentree } from './Rentree'

// La vignette d'un article de la liste : à défaut de photo, l'icône de son groupe.
export function VignetteRentree({ a }: { a: ArticleRentree }) {
  return (
    <span className="thumb" style={{ width: '44px', height: '44px', borderRadius: '11px' }}>
      {a.dessin ? <Dessin id={a.dessin} /> : <Icone nom={a.groupe === 'Livres' ? 'book-open' : a.groupe === 'Sac' ? 'backpack' : 'pencil'} taille={22} style={{ color: 'var(--ink-3)' }} />}
    </span>
  )
}

export function RentreeListe() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [d] = useRentree()
  const [exclus, setExclus] = useState<string[]>(params.get('exclus')?.split(',').filter(Boolean) ?? [])
  const [eq, setEq] = useState<string[]>(params.get('eq')?.split(',').filter(Boolean) ?? [])
  const [feuille, setFeuille] = useState<{ id: string; equivalent: boolean } | null>(null)
  if (!d) return null
  const l = d.listes.find((x) => x.id === params.get('l')) ?? d.listes.find((x) => x.classe === 'CE1')!
  const ecole = d.ecoles.find((x) => x.id === l.ecole)!
  const c = calculListe(l, exclus, eq)
  const groupes = [...new Set(l.articles.map((a) => a.groupe))]
  const modifiee = l.historique.length > 1 ? l.historique[0] : null
  // Les boutiques dont plus rien n'est pris : leur ramassage sort du total.
  const sorties = [...new Set(l.articles.map((a) => a.boutique))].filter((b) => !c.boutiques.includes(b))
  const exigees = l.articles.filter((a) => a.exigee)
  const article = feuille ? l.articles.find((a) => a.id === feuille.id)! : null
  const totalSi = (avec: boolean) => (article ? calculListe(l, exclus, avec ? [...new Set([...eq, article.id])] : eq.filter((x) => x !== article.id)).total : 0)
  const fixes = (
    <Feuille ouverte={!!article} fermer={() => setFeuille(null)} titre={t('Un équivalent conforme')}>
      {article && article.equivalent && feuille && (
        <>
          <h3 className="cl15-sht">{t('Un équivalent conforme')}</h3>
          <p className="cl15-shs">{tf('Consigne de l’école : « {c} ». Seul un article qui la respecte t’est proposé.', { c: t(article.consigne ?? article.titre).replace(/^./, (x) => x.toLowerCase()) })}</p>
          <a href="#" role="radio" aria-checked={!feuille.equivalent} className={'radio' + (!feuille.equivalent ? ' on' : '')} onClick={(e) => (e.preventDefault(), setFeuille({ ...feuille, equivalent: false }))}>
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ display: 'block' }}>
                {t(article.titre)}
              </span>
              <span className="rs" style={{ display: 'block' }}>
                {tf('Article de la liste · {p} F', { p: F(article.prixUnitaire * article.qte) })}
              </span>
            </span>
          </a>
          <a href="#" role="radio" aria-checked={feuille.equivalent} className={'radio' + (feuille.equivalent ? ' on' : '')} onClick={(e) => (e.preventDefault(), setFeuille({ ...feuille, equivalent: true }))}>
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ display: 'block' }}>
                {t(article.equivalent.titre)}
              </span>
              <span className="rs" style={{ display: 'block' }}>
                {tf('Conforme à la consigne · {p} F · {e} F de moins', { p: F(article.equivalent.prixUnitaire * article.qte), e: F((article.prixUnitaire - article.equivalent.prixUnitaire) * article.qte) })}
              </span>
            </span>
          </a>
          <div className="card cl15-sum flat">
            <div className="cl15-tot solo">
              <span className="l">{t('Nouveau total livré')}</span>
              <span className="rt">
                <span className="price">
                  {F(totalSi(feuille.equivalent))}
                  <small>{t(' F')}</small>
                </span>
              </span>
            </div>
          </div>
          <div className="btns">
            <button
              type="button"
              className="btn primary"
              onClick={() => (setEq(feuille.equivalent ? [...new Set([...eq, article.id])] : eq.filter((x) => x !== article.id)), setFeuille(null))}
            >
              <span>
                {feuille.equivalent
                  ? tf('Remplacer · −{e} F', { e: F((article.prixUnitaire - article.equivalent.prixUnitaire) * article.qte) })
                  : t('Garder l’article de la liste')}
              </span>
            </button>
          </div>
          <div className="btns">
            <button type="button" className="btn secondary" onClick={() => setFeuille(null)}>
              <span>{t('Annuler')}</span>
            </button>
          </div>
          {exigees.map((a) => (
            <div key={a.id} className="hint-l">
              <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{tf('Pas d’équivalent pour « {p} » : l’école exige cette édition.', { p: t(a.titre) })}</span>
            </div>
          ))}
        </>
      )}
    </Feuille>
  )
  return (
    <Ecran gabarit="colonnes" route="rentree-liste" titre={tf('Liste {c}', { c: l.classe })} fixes={fixes}>
      <Colonne>
      <Styles id="ddcb0e469a" />
      <EtapesRentree n={2} />
      <FfRentree />
      <div className="pg">
        <div className="pg-k">{tf('Liste officielle · {c}', { c: l.classe })}</div>
        <h1 className="pg-t">{tf('{n} articles demandés', { n: l.articles.length })}</h1>
        <p className="pg-s">
          {t(ecole.nom)} · {d.saison}
        </p>
      </div>
      {modifiee && (
        <div className="card amber cl15-box">
          <span className="bi">
            <Icone nom="file-clock" taille={20} />
          </span>
          <div className="grow">
            <b className="bt">{tf('Liste modifiée par l’école le {d}', { d: jourSeul(modifiee.le, langue) })}</b>
            <p>{tf('{x}. Les parents qui l’avaient ouverte ont été prévenus.', { x: t(modifiee.texte) })}</p>
          </div>
        </div>
      )}
      {l.historique.length > 0 && (
        <details className="more">
          <summary>
            <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Historique de la liste')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <div className="tl">
              {l.historique.map((h, i) => (
                <div key={h.le} className={'ti ' + (i === 0 && modifiee ? 'cur' : 'done')}>
                  <div className="tt">{jourSeul(h.le, langue)}</div>
                  <div className="td">{t(h.texte)}</div>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}
      <div className="hint-l">
        <Icone nom="list-checks" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Décoche ce que ton enfant a déjà : le total est recalculé depuis zéro.')}</span>
      </div>
      {groupes.map((g) => (
        <div key={g}>
          <div className="sec">
            <h2>{tf('{g} · {n}', { g: t(g), n: l.articles.filter((a) => a.groupe === g).length })}</h2>
          </div>
          <div className="card tight">
            {l.articles
              .filter((a) => a.groupe === g)
              .map((a) => {
                const on = !exclus.includes(a.id)
                const avecEq = !!(eq.includes(a.id) && a.equivalent)
                const pu = avecEq ? a.equivalent!.prixUnitaire : a.prixUnitaire
                const titre = t(avecEq ? a.equivalent!.titre : a.titre)
                const sous = [a.qte > 1 ? `${a.qte} × ${F(pu)} F` : null, a.consigne ? tf('Consigne : {c}', { c: t(a.consigne).replace(/^./, (x) => x.toLowerCase()) }) : null].filter(Boolean).join(' · ')
                const modif = modifiee && modifiee.texte.startsWith(a.titre) ? modifiee.texte.slice(a.titre.length).replace(/^\s*:\s*/, '') : null
                return (
                  <div key={a.id} className={'cl15-ln' + (on ? '' : ' cl15-off')}>
                    <a href="#" role="checkbox" aria-checked={on} aria-label={titre} className={'cb' + (on ? ' on' : '')} onClick={(e) => (e.preventDefault(), setExclus(on ? [...exclus, a.id] : exclus.filter((x) => x !== a.id)))}>
                      {on && <Icone nom="check" taille={14} trait={3} />}
                    </a>
                    <VignetteRentree a={a} />
                    <div className="grow">
                      <div className="cl15-lt">{titre}</div>
                      {sous && <div className="cl15-ls">{sous}</div>}
                      {modif && (
                        <div className="cl15-tag2" style={{ color: 'var(--or-txt)' }}>
                          <Icone nom="file-clock" taille={13} />
                          {tf('Modifié le {d} : {x}', { d: jourSeul(modifiee!.le, langue), x: modif })}
                        </div>
                      )}
                      {!on && (
                        <div className="cl15-tag2">
                          <Icone nom="check" taille={13} />
                          {t('Déjà possédé · sorti du total')}
                        </div>
                      )}
                      {on && a.equivalent && !a.exigee && (
                        <a href="#" className="cl15-eq" onClick={(e) => (e.preventDefault(), setFeuille({ id: a.id, equivalent: true }))}>
                          <Icone nom="refresh-cw" taille={14} />
                          {avecEq ? tf('Équivalent conforme choisi · {e} F de moins', { e: F((a.prixUnitaire - a.equivalent.prixUnitaire) * a.qte) }) : tf('Équivalent : {p} F', { p: F(a.equivalent.prixUnitaire * a.qte) })}
                        </a>
                      )}
                    </div>
                    <div className="cl15-lp">{F(pu * a.qte)}&nbsp;F</div>
                  </div>
                )
              })}
          </div>
        </div>
      ))}
      </Colonne>
      <Aside titre="Récapitulatif">
      <div className="card cl15-sum">
        <div className="cl15-k o">{t('Récapitulatif')}</div>
        <div className="cl15-r">
          <span className="lb">{tf('Articles cochés · {a} sur {n}', { a: c.pris.length, n: l.articles.length })}</span>
          <span className="v">{F(c.sousTotal)}&nbsp;F</span>
        </div>
        <div className="cl15-r">
          <span className="lb">{tf('Livraison au {r}', { r: t(d.relais ?? 'relais') })}</span>
          <span className="v">{c.livraison ? <>{F(c.livraison)}&nbsp;F</> : <span className="free">{t('offerte')}</span>}</span>
        </div>
        <div className="cl15-tot">
          <span className="l">{t('Total livré')}</span>
          <span className="rt">
            <span className="price">
              {F(c.total)}
              <small>{t(' F')}</small>
            </span>
          </span>
        </div>
        {sorties.map((b) => {
          const a = l.articles.filter((x) => x.boutique === b)
          return (
            <div key={b} className="hint-l">
              <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{a.length === 1 ? tf('{p} venait seul de sa boutique : son ramassage sort aussi du total.', { p: t(a[0].titre) }) : tf('Plus rien de {b} : son ramassage sort aussi du total.', { b: t(b) })}</span>
            </div>
          )
        })}
      </div>
      <div className="btns">
        <button
          type="button"
          className={'btn primary' + (c.pris.length && !feuille ? '' : ' off')}
          onClick={() => c.pris.length && naviguer(chemin('rentree-panier', { l: l.id, ...(exclus.length ? { exclus: exclus.join(',') } : {}), ...(eq.length ? { eq: eq.join(',') } : {}) }))}
        >
          <Icone nom="shopping-cart" taille={18} />
          <span>{tf('Tout mettre au panier · {m} F', { m: F(c.total) })}</span>
        </button>
      </div>
      {c.pris.length > 0 && <MettreListeDeCote l={l} exclus={exclus} eq={eq} total={c.total} rentreeLe={d.rentreeLe} maintenant={d.maintenant} />}
      </Aside>
    </Ecran>
  )
}
