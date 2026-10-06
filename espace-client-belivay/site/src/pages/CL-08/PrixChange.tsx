// Écran « Un prix a changé » (CL-08), forme d'origine du prototype rendue réelle (DP-54 ; CAL-11) : avant de payer,
// les prix du panier sont vérifiés : une hausse est bloquée et montrée (prix à l'ajout, prix maintenant, écart),
// une baisse est appliquée d'office ; un article retiré de la vente quitte le panier ; un article dont le dernier
// vient d'être pris ne part pas (gardé en favori). Le total que tu avais vu et le nouveau total (livraison
// comprise), les articles et colis restants, la boutique qui n'a plus rien à ramasser. Rien n'a encore été demandé
// au téléphone.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { calculer } from '../../donnees/frais'
import { source, type ChangementPanier, type DonneesPanier, type LignePanier } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'

const TITRES: Record<ChangementPanier['type'], [string, string, string]> = {
  hausse: ['Un prix a augmenté', 'Le vendeur a changé son prix depuis ton ajout au panier.', 'trending-up'],
  baisse: ['Un prix a baissé', 'La baisse est déjà appliquée à ton panier.', 'trending-down'],
  retire: ['Un article n’est plus vendu', 'Il a été retiré de la vente : on l’enlève de ton panier.', 'package-x'],
  pris: ['Cet article vient d’être pris', 'Le dernier a été acheté juste avant toi. Aucun autre vendeur ne le propose.', 'package-x'],
}

// Total du panier (articles et livraison) pour ces lignes.
const totalDe = (p: DonneesPanier, lignes: LignePanier[]) => {
  const boutiques = [...new Set(lignes.map((l) => l.boutique))]
  if (!boutiques.length) return 0
  return calculer(
    p.mode,
    boutiques.map((b) => ({ boutique: b, zone: p.boutiques[b]?.zone ?? 'Mvog-Ada', articles: lignes.filter((l) => l.boutique === b).map((l) => ({ prix: l.prix, quantite: l.qte, classe: l.classe })) })),
  ).total
}

export function PrixChange() {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const [d, setD] = useState<{ ch: ChangementPanier[]; panier: DonneesPanier } | null>(null)
  const [envoi, setEnvoi] = useState(false)
  useEffect(() => {
    source.verifierPanier().then((ch) => source.panier().then((panier) => setD({ ch, panier })))
  }, [])
  if (!d) return null
  const { ch, panier } = d
  const bloquants = ch.filter((c) => c.type !== 'baisse')
  // Une baisse se signale comme un gain (CPY-12).
  const gain = ch.filter((c) => c.type === 'baisse').reduce((n, c) => n + (c.avant - c.apres) * c.qte, 0)
  if (!bloquants.length)
    return (
      <Ecran route="prix-change" gabarit="centre">
        <div className="cl08-fill">
          <Link to={chemin('panier')} className="cl08-tl">
            {t('Panier')}
          </Link>
          <div className="cl08-hero">
            <div className="cl08-ring">
              <Icone nom="circle-check" taille={40} trait={1.8} />
            </div>
            <h1 className="cl08-h1">{t('Tous les prix sont à jour')}</h1>
            <p className="cl08-lead">{gain > 0 ? tf('Une baisse a été appliquée à ton panier : tu gagnes {g} F.', { g: F(gain) }) : t('Rien n’a changé depuis ton ajout au panier.')}</p>
          </div>
          <div className="btns mt16">
            <Link to={chemin('paiement-moyen')} className="btn primary">
              <span>{t('Continuer vers le paiement')}</span>
            </Link>
          </div>
        </div>
      </Ecran>
    )
  const tete = bloquants.length === 1 ? bloquants[0].type : null
  const hausse = bloquants.some((c) => c.type === 'hausse')
  // Lignes après acceptation : hausses appliquées, articles retirés ou pris enlevés.
  const apres = panier.lignes
    .filter((l) => !bloquants.some((c) => c.id === l.id && (c.type === 'retire' || c.type === 'pris')))
    .map((l) => {
      const h = bloquants.find((c) => c.id === l.id && c.type === 'hausse')
      return h ? { ...l, prix: h.apres } : l
    })
  const avant = totalDe(panier, panier.lignes)
  const nouveau = totalDe(panier, apres)
  const nbArticles = apres.reduce((n, l) => n + l.qte, 0)
  const nbColis = new Set(apres.map((l) => l.boutique)).size
  const videes = [...new Set(panier.lignes.map((l) => l.boutique))].filter((b) => !apres.some((l) => l.boutique === b))
  const accepter = async () => {
    if (envoi) return
    setEnvoi(true)
    await source.accepterChangements()
    naviguer(chemin('paiement-moyen'), { replace: true })
  }
  return (
    <Ecran route="prix-change" gabarit="centre">
      <div className="cl08-fill">
        <Link to={chemin('panier')} className="cl08-tl">
          {t('Panier')}
        </Link>
        <div className="cl08-hero">
          <div className={'cl08-ring ' + (tete === 'hausse' || (!tete && hausse) ? 'amber' : '')}>
            <Icone nom={tete ? TITRES[tete][2] : hausse ? 'trending-up' : 'package-x'} taille={40} trait={1.8} />
          </div>
          <h1 className="cl08-h1">{tete ? t(TITRES[tete][0]) : tf('{n} articles de ton panier ont changé', { n: bloquants.length })}</h1>
          <p className="cl08-lead">{tete ? t(TITRES[tete][1]) : t('Les vendeurs ont changé leur offre depuis ton ajout au panier.')}</p>
        </div>
        <div className="card cl08-todo">
          {ch.map((c, i) => (
            <div key={c.id + c.type}>
              {i > 0 && <div className="cl08-dash"></div>}
              <div className="cl08-item">
                <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
                  <Dessin id={c.dessin} />
                </span>
                <div className="grow">
                  <div className="t">
                    {t(c.titre)}
                    {c.qte > 1 ? ' × ' + c.qte : ''}
                  </div>
                  {c.variante && <div className="v">{t(c.variante)}</div>}
                  {(c.type === 'retire' || c.type === 'pris' || (!tete && c.type !== 'hausse')) && (
                    <div className="mt6">
                      <span className="pill ink sm">
                        {c.type === 'pris' ? <i className="d"></i> : <Icone nom={c.type === 'baisse' ? 'trending-down' : 'x'} taille={13} />}
                        {t(c.type === 'retire' ? 'Retiré de ton panier' : c.type === 'pris' ? 'Plus disponible' : 'Baisse appliquée')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {c.type === 'pris' && (
                <div className="cl08-line ">
                  <Icone nom="heart" taille={17} />
                  <span>{t('Il quitte cette commande et reste dans tes favoris.')}</span>
                </div>
              )}
              <div className="cl08-dash"></div>
              {c.type === 'hausse' || c.type === 'baisse' ? (
                <>
                  <div className="cl08-ln">
                    <span className="k">{t('Prix à l’ajout')}</span>
                    <span className="v">{F(c.avant)}&nbsp;F</span>
                  </div>
                  <div className="cl08-ln">
                    <span className="k">{t('Prix maintenant')}</span>
                    <span className="v">{F(c.apres)}&nbsp;F</span>
                  </div>
                  <div className="cl08-ln">
                    <span className="k">{t('Écart')}</span>
                    <span className="v cl08-delta">
                      {c.apres > c.avant ? '+ ' : '− '}
                      {F(Math.abs(c.apres - c.avant) * c.qte)}&nbsp;F
                    </span>
                  </div>
                </>
              ) : (
                <div className="cl08-ln">
                  <span className="k">{t(c.type === 'retire' ? 'Article retiré' : 'Article pris')}</span>
                  <span className="v">{F(c.avant * c.qte)}&nbsp;F</span>
                </div>
              )}
            </div>
          ))}
          <div className="cl08-dash"></div>
          <div className="cl08-ln">
            <span className="k">{t('Tu avais vu')}</span>
            <span className="v">{F(avant)}&nbsp;F</span>
          </div>
          <div className="cl08-ln">
            <span className="k">{t(hausse ? 'Nouveau total' : 'Sans ces articles')}</span>
            <span className="v">
              <span className="cl08-amt">{F(nouveau)}&nbsp;F</span>
            </span>
          </div>
          <div className="t13 c3 mt4">
            {tf(nbArticles > 1 ? '{a} articles' : '{a} article', { a: nbArticles })}
            {', '}
            {tf('{c} colis.', { c: nbColis })}
            {videes.map((b) => (
              <span key={b}> {tf('La boutique {b} n’a plus rien à ramasser.', { b: t(b) })}</span>
            ))}
          </div>
          <div className="t12 c3 mt4">{t('Livraison comprise ; la remise Prime et le moyen de paiement s’appliquent à l’étape suivante.')}</div>
          {gain > 0 && <div className="t12 c3 mt4">{tf('Une baisse est déjà appliquée : tu gagnes {g} F.', { g: F(gain) })}</div>}
        </div>
        <div className="card cl08-help mt12">
          <div className="cl08-kl">{t('Bon à savoir')}</div>
          <p>{t('Un prix ne change jamais sans ton accord : tant que tu n’as pas accepté, rien n’est demandé et ton panier reste tel quel.')}</p>
          <p>{t('Au panier, tu peux retirer un article ou choisir un autre vendeur du même produit.')}</p>
          {bloquants.some((c) => c.type === 'pris') && (
            <p>
              {t('L’article pris reste dans tes favoris : active son alerte de stock pour être prévenu de son retour. ')}
              <Link to={chemin('sauvegardes')} className="cor b7">
                {t('Voir mes favoris')}
              </Link>
            </p>
          )}
        </div>
        <div className="btns mt16">
          <button type="button" className={'btn primary' + (envoi || !apres.length ? ' off' : '')} onClick={() => apres.length && accepter()}>
            <span>{t(hausse ? 'Accepter et continuer vers le paiement' : 'Continuer sans ces articles')}</span>
          </button>
        </div>
        <div className="btns">
          <Link to={chemin('panier')} className="btn secondary cl08-out">
            <span>{t('Revenir au panier')}</span>
          </Link>
        </div>
        <p className="cl08-foot">{t('Rien n’a encore été demandé à ton téléphone.')}</p>
      </div>
    </Ecran>
  )
}
