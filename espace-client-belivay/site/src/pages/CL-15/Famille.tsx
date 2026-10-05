// Écran « Panier famille » (CL-15 ; EX-05), forme d'origine du prototype rendue réelle (DP-54) : nourrir sa famille
// au Cameroun : partir d'un panier prêt (essentiels du mois, rentrée, fêtes) ou de son panier (?panier=…), changer
// les quantités, ajouter ou retirer ; 5 kg au plus par article (le sac de 25 kg est refusé dans une feuille, le sac
// de 5 kg proposé) ; le récapitulatif : poids, classe du colis, livraison selon le moteur (remise d'un colis L due),
// total livré ; puis qui retire. Mes paniers en tête.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { calculFamille, FAMILLE } from '../../donnees/famille'
import { PARAMETRES } from '../../donnees/frais'
import { source, type ArticleFamille } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useFamille } from './Commun'

// Les trois étapes du panier famille (panier, qui retire, paiement) : n = l'étape en cours.
export function EtapesFamille({ n }: { n: number }) {
  return (
    <div className="steps">
      {[0, 1, 2].map((i) => (
        <i key={i} className={i < n ? 'on' : i === n ? 'cur' : ''}></i>
      ))}
    </div>
  )
}
export function FfFamille() {
  const { t } = usePreferences()
  if (INTERRUPTEURS_DU_LANCEMENT['FF-EX05']) return null
  return (
    <div className="cl15-ff">
      <span className="cl15-pill">
        <Icone nom="lock" taille={13} />
        {t('Après le lancement · interrupteur fermé')}
      </span>
      <span className="cl15-ex">{t('EX-05')}</span>
    </div>
  )
}
// La vignette d'un article : son dessin, à défaut un panier.
export function VignetteFamille({ a, taille }: { a: ArticleFamille; taille: number }) {
  return (
    <span className="thumb" style={{ width: taille + 'px', height: taille + 'px', borderRadius: Math.round(taille / 4) + 'px' }}>
      {a.dessin ? <Dessin id={a.dessin} /> : <Icone nom="shopping-basket" taille={Math.round(taille / 2)} style={{ color: 'var(--ink-3)' }} />}
    </span>
  )
}
export const kg = (n: number) => String(n).replace('.', ',')

export function Famille() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [d] = useFamille()
  const [lignes, setLignes] = useState<{ id: string; qte: number }[] | null>(null)
  const [modele, setModele] = useState<string | null>(null)
  const [ajout, setAjout] = useState(false)
  const [lourd, setLourd] = useState<ArticleFamille | null>(null)
  const id = params.get('panier')
  useEffect(() => {
    if (!d || lignes) return
    const p = id ? d.paniers.find((x) => x.id === id) : null
    const m = d.modeles.find((x) => x.id === (params.get('modele') ?? 'essentiels'))!
    setLignes(p ? p.articles : m.articles)
    setModele(p ? null : m.id)
  }, [d, lignes, id, params])
  if (!d || !lignes) return null
  const c = calculFamille(d.articles, lignes)
  const qte = (a: string, n: number) => setLignes(n <= 0 ? lignes.filter((x) => x.id !== a) : lignes.some((x) => x.id === a) ? lignes.map((x) => (x.id === a ? { ...x, qte: n } : x)) : [...lignes, { id: a, qte: n }])
  const ajouter = (a: ArticleFamille) => {
    if (a.poids > FAMILLE.poidsArticle) return (setAjout(false), setLourd(a))
    qte(a.id, (lignes.find((x) => x.id === a.id)?.qte ?? 0) + 1)
  }
  const continuer = async () => {
    if (c.tropLourd || !c.lignes.length) return
    const p = await source.enregistrerPanierFamille({ id: id ?? undefined, articles: lignes, nom: id ? undefined : (d.modeles.find((x) => x.id === modele)?.nom ?? 'Panier famille') })
    naviguer(chemin('famille-destinataire', { panier: p.id }))
  }
  const panier = id ? d.paniers.find((x) => x.id === id) : null
  const nom = panier?.nom ?? d.modeles.find((x) => x.id === modele)?.nom ?? 'Panier famille'
  // Le même produit en plus petit (mêmes deux premiers mots), 5 kg au plus.
  const alternative = lourd ? d.articles.find((x) => x.id !== lourd.id && x.titre.split(' ').slice(0, 2).join(' ') === lourd.titre.split(' ').slice(0, 2).join(' ') && x.poids <= FAMILLE.poidsArticle) : null
  const fixes = (
    <>
      <Feuille ouverte={ajout} fermer={() => setAjout(false)} titre={t('Ajouter un article')}>
        <h3 className="cl15-sht">{t('Ajouter un article')}</h3>
        <div className="card tight flat">
          {d.articles.map((a) => (
            <div key={a.id} className="cl15-ln" style={{ alignItems: 'center' }}>
              <VignetteFamille a={a} taille={44} />
              <div className="grow">
                <div className="cl15-lt">{t(a.titre)}</div>
                <div className="cl15-lp" style={{ textAlign: 'left', paddingTop: '3px' }}>
                  {F(a.prix)}&nbsp;F · {kg(a.poids)}&nbsp;kg
                </div>
              </div>
              <span className="qty sm">
                <button type="button" aria-label={tf('Ajouter : {p}', { p: t(a.titre) })} onClick={() => ajouter(a)}>
                  <Icone nom="plus" taille={16} />
                </button>
              </span>
            </div>
          ))}
        </div>
      </Feuille>
      <Feuille ouverte={!!lourd} fermer={() => setLourd(null)} titre={t('Trop lourd pour un panier famille')}>
        {lourd && (
          <>
            <div className="row">
              <span className="ic-sq red">
                <Icone nom="weight" taille={22} />
              </span>
              <div className="grow">
                <h3 className="cl15-sht">{t('Trop lourd pour un panier famille')}</h3>
                <div className="t13 c3 mt4">
                  {t(lourd.titre)} · {F(lourd.prix)}&nbsp;F
                </div>
              </div>
            </div>
            <p className="t14" style={{ margin: '12px 0 0', lineHeight: '1.45' }}>
              {t('Chaque article pèse ')}
              <b>{t('5 kg au plus')}</b>
              {t(' : le panier part au relais en colis S, M ou L, jamais en XL.')}
            </p>
            {alternative && (
              <>
                <div className="card flat">
                  <div className="row">
                    <VignetteFamille a={alternative} taille={56} />
                    <div className="grow">
                      <div className="t15 b8" style={{ lineHeight: '1.3' }}>
                        {t(alternative.titre)}
                      </div>
                      <div className="t13 c3 mt4">{tf('{k} kg · même produit, en plus petit', { k: kg(alternative.poids) })}</div>
                    </div>
                    <span className="price">
                      {F(alternative.prix)}
                      <small>{t(' F')}</small>
                    </span>
                  </div>
                </div>
                <div className="btns">
                  <button type="button" className="btn primary" onClick={() => (qte(alternative.id, (lignes.find((x) => x.id === alternative.id)?.qte ?? 0) + 1), setLourd(null))}>
                    <Icone nom="plus" taille={18} />
                    <span>{tf('Ajouter {p}', { p: t(alternative.titre) })}</span>
                  </button>
                </div>
              </>
            )}
            <div className="btns">
              <button type="button" className="btn secondary" onClick={() => setLourd(null)}>
                <span>{t('Annuler')}</span>
              </button>
            </div>
          </>
        )}
      </Feuille>
    </>
  )
  return (
    <Ecran gabarit="colonnes" route="famille" fixes={fixes}>
      <Colonne>
      <Styles id="ddcb0e469a" />
      <EtapesFamille n={0} />
      <FfFamille />
      <div className="pg">
        <div className="pg-k">{t('Panier famille')}</div>
        <h1 className="pg-t">{t('Nourris ta famille au Cameroun')}</h1>
        <p className="pg-s">{t('Tu paies par carte, même depuis l’étranger. Ta famille retire au relais avec son code, et tu reçois la preuve.')}</p>
      </div>
      {d.paniers.some((p) => p.historique.length) && (
        <>
          <div className="sec">
            <h2>{t('Mes paniers')}</h2>
          </div>
          <div className="card tight">
            {d.paniers
              .filter((p) => p.historique.length)
              .map((p) => (
                <Link key={p.id} to={chemin('famille-mensuel', { panier: p.id })} className="li">
                  <span className="ic or">
                    <Icone nom="repeat" taille={20} />
                  </span>
                  <span className="grow">
                    <span className="lt" style={{ display: 'block' }}>
                      {t(p.nom)}
                    </span>
                    <span className="ls" style={{ display: 'block' }}>
                      {p.mensuel ? (p.suspendu ? t('Suspendu') : tf('Chaque mois, le {j} · pour {p}', { j: p.jour, p: p.destinataire?.prenom ?? '' })) : tf('Payé une fois · pour {p}', { p: p.destinataire?.prenom ?? '' })}
                    </span>
                  </span>
                  <span className="chev">
                    <Icone nom="chevron-right" taille={18} />
                  </span>
                </Link>
              ))}
          </div>
        </>
      )}
      {!id && (
        <>
          <div className="sec">
            <h2>{t('Paniers prêts')}</h2>
          </div>
          {d.modeles.map((m) => {
            const x = calculFamille(d.articles, m.articles)
            return (
              <a key={m.id} href={chemin('famille', { modele: m.id })} role="radio" aria-checked={modele === m.id} className={'radio' + (modele === m.id ? ' on' : '')} onClick={(e) => (e.preventDefault(), setModele(m.id), setLignes(m.articles))}>
                <span className="rd"></span>
                <span className="grow">
                  <span className="rt" style={{ display: 'block' }}>
                    {t(m.nom)}
                  </span>
                  <span className="rs" style={{ display: 'block' }}>
                    {tf('{n} articles · {m} F livré au relais', { n: m.articles.length, m: F(x.total) })}
                  </span>
                </span>
              </a>
            )
          })}
        </>
      )}
      <div className="sec">
        <h2>{tf('{n} · modifiable', { n: t(nom) })}</h2>
      </div>
      <div className="card tight">
        {c.lignes.map(({ a, qte: q }) => (
          <div key={a.id} className="cl15-ln" style={{ alignItems: 'center' }}>
            <VignetteFamille a={a} taille={44} />
            <div className="grow">
              <div className="cl15-lt">{t(a.titre)}</div>
              <div className="cl15-lp" style={{ textAlign: 'left', paddingTop: '3px' }}>
                {F(a.prix * q)}&nbsp;F · {kg(Math.round(a.poids * q * 10) / 10)}&nbsp;kg
              </div>
            </div>
            <span className="qty sm">
              <button type="button" aria-label={tf(q === 1 ? 'Retirer : {p}' : 'Moins : {p}', { p: t(a.titre) })} onClick={() => qte(a.id, q - 1)}>
                <Icone nom={q === 1 ? 'trash-2' : 'minus'} taille={16} />
              </button>
              <b>{q}</b>
              <button type="button" aria-label={tf('Plus : {p}', { p: t(a.titre) })} onClick={() => qte(a.id, q + 1)}>
                <Icone nom="plus" taille={16} />
              </button>
            </span>
          </div>
        ))}
        {!c.lignes.length && (
          <div className="cl15-ln">
            <span className="t13 c3">{t('Panier vide.')}</span>
          </div>
        )}
      </div>
      <div className="links cl15-lk">
        <a href={chemin('famille', id ? { panier: id } : modele ? { modele } : undefined)} role="button" onClick={(e) => (e.preventDefault(), setAjout(true))}>
          {t('+ Ajouter un article')}
        </a>
      </div>
      </Colonne>
      <Aside titre="Récapitulatif">
      <div className="card cl15-sum">
        <div className="cl15-k o">{t('Récapitulatif')}</div>
        <div className="cl15-r">
          <span className="lb">{t('Poids total')}</span>
          <span className="v">{tf('{p} kg sur {m} kg · 1 colis {c}', { p: kg(c.poids), m: FAMILLE.poidsMax, c: c.classe })}</span>
        </div>
        <div className="cl15-r">
          <span className="lb">{tf('Articles · {n}', { n: c.lignes.reduce((n, x) => n + x.qte, 0) })}</span>
          <span className="v">{F(c.sousTotal)}&nbsp;F</span>
        </div>
        <div className="cl15-r">
          <span className="lb">{t('Retrait au relais')}</span>
          <span className="v">
            {c.offert ? (
              <>
                <s>{F(c.montantOffert)}&nbsp;F</s>
                <span className="free">{t('offert')}</span>
              </>
            ) : (
              <>{F(c.livraison)}&nbsp;F</>
            )}
          </span>
        </div>
        {c.supplement > 0 && (
          <div className="cl15-r">
            <span className="lb">{tf('Remise du colis {c}, non couverte', { c: c.classe })}</span>
            <span className="v">{F(c.supplement)}&nbsp;F</span>
          </div>
        )}
        <div className="cl15-tot">
          <span className="l">{t('Total livré')}</span>
          <span className="rt">
            <span className="price">
              {F(c.total)}
              <small>{t(' F')}</small>
            </span>
          </span>
        </div>
        {c.tropLourd ? (
          <div className="hint-l" style={{ color: 'var(--red)' }}>
            <Icone nom="weight" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('Plus de {n} kg : retire des articles, ou fais deux paniers.', { n: FAMILLE.poidsMax })}</span>
          </div>
        ) : (
          <div className="hint-l">
            <Icone nom="weight" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('5 kg au plus par article : pour le riz, des sacs de 5 kg.')}</span>
          </div>
        )}
      </div>
      {/* DP-54 : ce que le client doit savoir avant de continuer : poids et colis, la suite, l'argent. */}
      <details className="more">
        <summary>
          <Icone nom="package" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Poids, colis et livraison')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{tf('Le panier part en un seul colis : S jusqu’à 5 kg, M jusqu’à 15 kg, L jusqu’à {m} kg. Jamais en XL : au-delà, fais deux paniers.', { m: FAMILLE.poidsMax })}</p>
          <p>{tf('{k} kg au plus par article, pour qu’une personne seule le porte depuis le relais.', { k: FAMILLE.poidsArticle })}</p>
          <p>{tf('Retrait offert dès {s} F d’articles ; pour un colis L, la remise au relais reste due ({l} F au lieu de {r} F).', { s: F(PARAMETRES.seuilRelais), l: F(PARAMETRES.remiseRelais.L), r: F(PARAMETRES.remiseRelais.S) })}</p>
        </div>
      </details>
      <details className="more">
        <summary>
          <Icone nom="circle-help" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment ça marche')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('1. Tu composes le panier. 2. Tu choisis qui le retire et à quel relais. 3. Tu paies par carte, frais de service de 2 % affichés avant.')}</p>
          <p>{t('La personne choisie reçoit seule le code de retrait ; toi, la preuve de retrait (heure, relais), par notification et par e-mail.')}</p>
          <p>{t('Chaque mois si tu veux : même panier, même jour ; tu le suspends ou le changes en un geste. Un problème : remboursé sur la carte qui a payé.')}</p>
        </div>
      </details>
      <div className="btns">
        <button type="button" className={'btn primary' + (c.tropLourd || !c.lignes.length ? ' off' : '')} onClick={continuer}>
          <span>{tf('Continuer · {m} F', { m: F(c.total) })}</span>
        </button>
      </div>
      </Aside>
    </Ecran>
  )
}
