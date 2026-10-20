// Écran « Favoris » (ex-« Sauvegardés », CL-07 ; DP-54), repris pour l'usage réel : les favoris viennent des
// données ; pour chacun : prix vérifié (baisse depuis l'ajout), coût de retrait, stock (retour, épuisé), alertes
// gratuites sur la variante exacte, remise au panier, partage, retrait (avec annulation) ; tri et filtres ;
// total si tout passe au panier, « Tout mettre au panier » ; après le lancement : listes d'envies et de rentrée.
// Pour chacun aussi : marque et distance de la boutique au relais du client (tri « Plus proche ») ; épuisé :
// lien vers les articles semblables de sa catégorie.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { useLieu } from '../../composants/PourQui'
import { Module } from '../../composants/Module'
import { chemin } from '../../config/pages'
import { source, type Favori, type Produit } from '../../donnees/source'
import { F } from '../../i18n/format'
import { heureSeule } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useMajSession } from '../../session'

type Tri = 'recent' | 'prix-bas' | 'prix-haut' | 'baisse' | 'proche'
type Filtre = 'tout' | 'baisse' | 'stock' | 'epuise'

function Carte({ f, pr, agir }: { f: Favori; pr?: Produit; agir: (quoi: 'retirer' | 'panier' | 'prix' | 'stock') => void }) {
  const { t, tf } = usePreferences()
  const lieuR = useLieu()
  const epuise = f.stock === 'rupture'
  const partager = async () => {
    const url = location.origin + chemin('fiche', { p: f.p })
    try {
      if (navigator.share) await navigator.share({ title: f.titre, url })
      else await navigator.clipboard.writeText(url)
    } catch {
      // Partage annulé.
    }
  }
  return (
    <div className="card cl07-fv">
      <div className="row" style={{ alignItems: 'flex-start', gap: '12px' }}>
        <Link to={chemin('fiche', { p: f.p })} aria-label={t(f.titre)}>
          <span className="thumb" style={{ width: '76px', height: '76px', borderRadius: '19px' }}>
            <Dessin id={f.dessin} image={f.image} alt={f.titre} tailles="96px" />
          </span>
        </Link>
        <div className="grow">
          <Link to={chemin('fiche', { p: f.p })} className="cn">
            {t(f.titre)}
          </Link>
          {(f.variante || pr?.marque) && <div className="cv">{[f.variante && t(f.variante), pr?.marque].filter(Boolean).join(' · ')}</div>}
          <div className="pz">
            <b>{F(f.prix)} F</b>
            {f.prixAvant && f.prixAvant > f.prix && (
              <>
                {' '}
                <s>{F(f.prixAvant)} F</s>
                {' · '}
                <span>{tf('prix baissé de {m} F', { m: F(f.prixAvant - f.prix) })}</span>
              </>
            )}
            {f.stock === 'retour' && (
              <>
                {' · '}
                <span>{t('de retour en stock')}</span>
              </>
            )}
            {epuise && (
              <>
                {' · '}
                <span className="x">{t(f.variante ? `épuisé partout en ${f.variante.toLowerCase()}` : 'épuisé partout')}</span>
              </>
            )}
          </div>
          <div className="mt4">
            <span className="dl">{tf('+ {m} F de retrait', { m: F(f.retrait) })}</span>
          </div>
          {pr && (
            <div className="mt4">
              <span className="dl">
                <Icone nom="map-pin" taille={12} />
                {lieuR.r('{k} km de ton relais', { k: String(pr.vendeur.km).replace('.', ',') })}
              </span>
            </div>
          )}
          {epuise && pr && (
            <div className="mt4">
              <Link to={chemin('liste', pr.sousCategorie ? { cat: pr.univers, sub: pr.sousCategorie } : { cat: pr.univers })} className="t13 b8">
                {t('Voir des articles semblables')}
              </Link>
            </div>
          )}
        </div>
        <button type="button" className="cl07-hrt" aria-label={t('Retirer des favoris')} onClick={() => agir('retirer')} style={{ background: 'none', border: 0 }}>
          <Icone nom="heart" taille={21} style={{ fill: 'currentColor' }} />
        </button>
      </div>
      <div className="cl07-al">
        <span className="lab">
          <Icone nom="bell" taille={15} />
          <span>{t(f.variante ? `Alertes gratuites, ${f.variante.toLowerCase()}` : 'Alertes gratuites')}</span>
        </span>
        {(['prix', 'stock'] as const).map((k) => (
          <button
            key={k}
            type="button"
            className={'cl07-tgl' + (f.alertes[k] ? ' on' : '')}
            role="switch"
            aria-checked={f.alertes[k]}
            onClick={() => agir(k)}
            style={{ border: 0, font: 'inherit' }}
          >
            {f.alertes[k] && <Icone nom="check" taille={14} trait={2.6} />}
            {t(k === 'prix' ? 'Baisse de prix' : 'Retour en stock')}
          </button>
        ))}
      </div>
      <div className="cl07-fa">
        {epuise ? (
          <button type="button" className="btn secondary cl07-off" aria-disabled="true">
            <Icone nom="bell" taille={18} />
            <span>{t(f.alertes.stock ? 'Épuisé : on te prévient' : 'Épuisé')}</span>
          </button>
        ) : (
          <button type="button" className="btn soft" onClick={() => agir('panier')}>
            <Icone nom="shopping-cart" taille={18} />
            <span>{t('Mettre au panier')}</span>
          </button>
        )}
        <button type="button" className="cl07-sq" aria-label={t('Partager l’article')} onClick={partager}>
          <Icone nom="share-2" taille={19} />
        </button>
      </div>
    </div>
  )
}

export function Sauvegardes() {
  const { t, tf, langue } = usePreferences()
  const majSession = useMajSession()
  const [d, setD] = useState<{ favoris: Favori[]; verifieLe: number } | null>(null)
  const [produits, setProduits] = useState<Record<string, Produit>>({})
  const [tri, setTri] = useState<Tri>('recent')
  const [filtre, setFiltre] = useState<Filtre>('tout')
  const [annuler, setAnnuler] = useState<Favori | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const large = useDes('tab')
  const charger = () => source.favoris().then(setD)
  useEffect(() => {
    charger()
    // Marque et distance (depuis le relais du client) de chaque favori, lues dans le catalogue.
    source.produits().then((l) => setProduits(Object.fromEntries(l.map((x) => [x.p, x]))))
  }, [])
  if (!d) return null
  const maj = async () => (await charger(), majSession(await source.session()))

  const agir = (f: Favori) => async (quoi: 'retirer' | 'panier' | 'prix' | 'stock') => {
    if (quoi === 'retirer') {
      await source.retirerFavori(f.id)
      setAnnuler(f)
      setMessage(null)
    } else if (quoi === 'panier') {
      await source.favoriAuPanier(f.id)
      setAnnuler(null)
      setMessage(tf('« {p} » est dans ton panier.', { p: t(f.titre) }))
    } else await source.reglerAlerteFavori(f.id, quoi, !f.alertes[quoi])
    maj()
  }
  const toutAuPanier = async () => {
    const dispo = d.favoris.filter((f) => f.stock !== 'rupture')
    for (const f of dispo) await source.favoriAuPanier(f.id)
    setMessage(tf('{n} articles mis au panier.', { n: dispo.length }))
    maj()
  }

  const baisse = (f: Favori) => (f.prixAvant ?? f.prix) - f.prix
  const km = (f: Favori) => produits[f.p]?.vendeur.km ?? Infinity
  const liste = d.favoris
    .filter((f) => filtre === 'tout' || (filtre === 'baisse' ? baisse(f) > 0 : filtre === 'stock' ? f.stock !== 'rupture' : f.stock === 'rupture'))
    .sort((a, b) => (tri === 'prix-bas' ? a.prix - b.prix : tri === 'prix-haut' ? b.prix - a.prix : tri === 'baisse' ? baisse(b) - baisse(a) : tri === 'proche' ? km(a) - km(b) : b.ajouteLe - a.ajouteLe))
  const dispo = d.favoris.filter((f) => f.stock !== 'rupture')
  const total = dispo.reduce((s, f) => s + f.prix, 0)
  const economie = d.favoris.reduce((s, f) => s + Math.max(0, baisse(f)), 0)

  const modules = (
    <Module ff={['FF-LISTE-ENVIES', 'FF-EX01']}>
      <div className="card tight mt16">
        <Module ff="FF-LISTE-ENVIES">
          <Link to={chemin('listes')} className="li">
            <span className="ic ">
              <Icone nom="gift" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Listes d’envies')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Partager une liste, se faire offrir')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </Module>
        <Module ff="FF-EX01">
          <Link to={chemin('rentree')} className="li">
            <span className="ic ">
              <Icone nom="school" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Listes de rentrée')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('La liste de l’école, en un panier')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </Module>
      </div>
    </Module>
  )

  const annulation = annuler && (
    <div className="cl10-toast" role="status">
      <span>{tf('« {p} » retiré des favoris.', { p: t(annuler.titre) })}</span>
      <button
        type="button"
        style={{ background: 'none', border: 0, color: 'inherit', font: 'inherit', fontWeight: 800, textDecoration: 'underline' }}
        onClick={() => source.remettreFavori(annuler).then(() => (setAnnuler(null), maj()))}
      >
        {t('Annuler')}
      </button>
    </div>
  )

  if (!d.favoris.length)
    return (
      <Ecran route="sauvegardes" fixes={annulation}>
        <div className="pg">
          <h1 className="pg-t">{t('Favoris')}</h1>
        </div>
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="heart" taille={26} />
            </div>
            <h3>{t('Aucun favori pour l’instant')}</h3>
            <p>{t('Touche le cœur d’un produit, ou « Mettre en favori » dans le panier : il t’attend ici, avec son prix à jour.')}</p>
            <div className="btns">
              <Link to={chemin('categories')} className="btn primary">
                <span>{t('Découvrir les produits')}</span>
              </Link>
            </div>
          </div>
        </div>
        {message && (
          <div className="note green">
            <Icone nom="circle-check" taille={18} />
            <div>
              {message} <Link to={chemin('panier')}>{t('Voir le panier')}</Link>
            </div>
          </div>
        )}
        {modules}
      </Ecran>
    )

  const vedette = (
    <>
      <div className="card vedette">
        <div className="row">
          <span className="grow">
            <b className="t17 b8" style={{ display: 'block' }}>
              {tf('{m} F', { m: F(total) })}
            </b>
            <span className="t13 c3">
              {tf('pour les {n} articles disponibles, hors retrait', { n: dispo.length })}
              {economie > 0 && ' · ' + tf('{m} F de baisse depuis tes ajouts', { m: F(economie) })}
            </span>
          </span>
        </div>
        {dispo.length > 1 && (
          <div className="btns">
            <button type="button" className="btn primary" onClick={toutAuPanier}>
              <Icone nom="shopping-cart" taille={18} />
              <span>{t('Tout mettre au panier')}</span>
            </button>
          </div>
        )}
      </div>
    </>
  )
  const filtres = (
    <>
      <div className="chips" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
        {(
          [
            ['tout', 'Tous'],
            ['baisse', 'Prix en baisse'],
            ['stock', 'Disponibles'],
            ['epuise', 'Épuisés'],
          ] as const
        ).map(([k, x]) => (
          <a key={k} href="#" className={'chip' + (filtre === k ? ' on' : '')} aria-pressed={filtre === k} onClick={(e) => (e.preventDefault(), setFiltre(k))}>
            {t(x)}
          </a>
        ))}
      </div>
    </>
  )
  const triage = (
    <>
      <div className="fld" style={{ marginTop: 4 }}>
        <label htmlFor="fav-tri">{t('Trier')}</label>
        <div className="inp">
          <Icone nom="list-checks" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
          <select id="fav-tri" value={tri} onChange={(e) => setTri(e.target.value as Tri)} style={{ flex: 1, border: 0, background: 'transparent', font: 'inherit', color: 'inherit', outline: 'none' }}>
            <option value="recent">{t('Ajoutés récemment')}</option>
            <option value="baisse">{t('Plus grosse baisse')}</option>
            <option value="prix-bas">{t('Prix croissant')}</option>
            <option value="prix-haut">{t('Prix décroissant')}</option>
            <option value="proche">{t('Plus proche de mon relais')}</option>
          </select>
        </div>
      </div>
    </>
  )
  const cartes = (
    <>
      {liste.map((f) => (
        <Carte key={f.id} f={f} pr={produits[f.p]} agir={agir(f)} />
      ))}
      {!liste.length && <p className="t13 c3" style={{ textAlign: 'center' }}>{t('Aucun favori dans ce filtre.')}</p>}
    </>
  )
  const alertes = (
    <>
      <details className="more">
        <summary>
          <Icone nom="bell" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment marchent les alertes')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Une alerte suit la variante exacte (la pointure, la couleur), jamais le produit entier.')}</p>
          <p>{t('Elle arrive par notification, gratuite, jamais la nuit entre 21 h et 7 h.')}</p>
          <p>{t('Un prix n’est jamais figé : il est vérifié à chaque visite, et le panier le recalcule avant de payer.')}</p>
          <p>
            <Link to={chemin('notifs-reglages')}>{t('Régler mes notifications')}</Link>
          </p>
        </div>
      </details>
    </>
  )

  // Tablette et ordinateur (§ 5.6) : barre d'outils (filtres, tri, total et « Tout mettre au panier » à droite), les
  // listes d'envies et de rentrée en bandeau dessous, puis les favoris en grille selon la largeur.
  if (large)
    return (
      <Ecran route="sauvegardes" fixes={annulation} largeur="large">
        <div className="pg">
          <h1 className="pg-t">{t('Favoris')}</h1>
          <p className="pg-s">{tf('{n} articles · prix et stock vérifiés à {h}', { n: d.favoris.length, h: heureSeule(d.verifieLe, langue) })}</p>
        </div>
        {message && (
          <div className="note green">
            <Icone nom="circle-check" taille={18} />
            <div>
              {message} <Link to={chemin('panier')}>{t('Voir le panier')}</Link>
            </div>
          </div>
        )}
        <div className="sv-outils">
          {filtres}
          {triage}
          {vedette}
        </div>
        {modules}
        <div className="sv-grille">{cartes}</div>
        {alertes}
      </Ecran>
    )

  return (
    <Ecran route="sauvegardes" fixes={annulation}>
      <div className="pg">
        <h1 className="pg-t">{t('Favoris')}</h1>
        <p className="pg-s">{tf('{n} articles · prix et stock vérifiés à {h}', { n: d.favoris.length, h: heureSeule(d.verifieLe, langue) })}</p>
      </div>
      {message && (
        <div className="note green">
          <Icone nom="circle-check" taille={18} />
          <div>
            {message} <Link to={chemin('panier')}>{t('Voir le panier')}</Link>
          </div>
        </div>
      )}
      {vedette}
      {filtres}
      {triage}
      {cartes}
      {alertes}
      {modules}
    </Ecran>
  )
}
