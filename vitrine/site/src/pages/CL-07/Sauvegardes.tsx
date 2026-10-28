// Écran « Favoris » (ex-« Sauvegardés », CL-07 ; DP-54), repris pour l'usage réel : les favoris viennent des
// données ; pour chacun : prix vérifié (baisse depuis l'ajout), coût de retrait, stock (retour, épuisé), alertes
// gratuites sur la variante exacte, remise au panier, partage, retrait (avec annulation) ; tri et filtres ;
// total si tout passe au panier, « Tout mettre au panier » ; après le lancement : listes d'envies et de rentrée.
// Pour chacun aussi : marque et distance de la boutique au relais du client (tri « Plus proche ») ; épuisé :
// lien vers les articles semblables de sa catégorie.
// Manipulation simplifiée (consigne du porteur) : le cœur retire ; « Ajouter à une liste » (une liste existante ou
// « Nouvelle liste ») en un toucher ; une case sur chaque carte pour la sélection multiple, et une barre d'actions en
// bas : vers une liste (ou déplacer), envoyer à un proche, mettre au panier, retirer (annulable).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { FeuilleAjoutListe, type ArticleAAjouter } from '../../composants/AjoutListe'
import { Feuille } from '../../composants/Feuille'
import { AlerteBaissePrix } from '../../composants/AlerteBaissePrix'
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
import { useMajSession, useSession } from '../../session'

type Tri = 'recent' | 'prix-bas' | 'prix-haut' | 'baisse' | 'proche'
type Filtre = 'tout' | 'baisse' | 'stock' | 'epuise'

function Carte({ f, pr, agir, choisi, choisir, versListe }: { f: Favori; pr?: Produit; agir: (quoi: 'retirer' | 'panier' | 'prix' | 'stock') => void; choisi: boolean; choisir: () => void; versListe: (() => void) | null }) {
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
    <div className={'card cl07-fv' + (choisi ? ' choisi' : '')}>
      <div className="row" style={{ alignItems: 'flex-start', gap: '12px' }}>
        <span className="cl07-vg">
          <Link to={chemin('fiche', { p: f.p })} aria-label={t(f.titre)}>
            <span className="thumb" style={{ width: '76px', height: '76px', borderRadius: '19px' }}>
              <Dessin id={f.dessin} image={f.image} alt={f.titre} tailles="96px" />
            </span>
          </Link>
          <button type="button" className="cl07-ck" role="checkbox" aria-checked={choisi} aria-label={tf('Sélectionner « {p} »', { p: t(f.titre) })} onClick={choisir}>
            {choisi && <Icone nom="check" taille={15} trait={3} />}
          </button>
        </span>
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
          <AlerteBaissePrix avant={f.prixAvant} apres={f.prix} />
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
        {versListe && (
          <button type="button" className="cl07-sq" aria-label={t('Ajouter à une liste')} title={t('Ajouter à une liste')} onClick={versListe}>
            <Icone nom="list-plus" taille={19} />
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
  const [annuler, setAnnuler] = useState<Favori[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [choix, setChoix] = useState<Set<string>>(new Set()) // favoris sélectionnés (id)
  const [versListe, setVersListe] = useState<{ articles: ArticleAAjouter[]; deplacer: boolean } | null>(null)
  const [envoi, setEnvoi] = useState(false) // feuille « Envoyer à un proche »
  const { interrupteurs } = useSession()
  const listesOuvertes = interrupteurs['FF-LISTE-ENVIES']
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
      setAnnuler([f])
      setMessage(null)
      setChoix((c) => (c.has(f.id) ? new Set([...c].filter((x) => x !== f.id)) : c))
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

  // Sélection multiple : une case par carte ; la barre d'actions agit sur les cases cochées.
  const choisis = d.favoris.filter((f) => choix.has(f.id))
  const basculerChoix = (id: string) =>
    setChoix((c) => {
      const n = new Set(c)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const articlesDe = (l: Favori[]): ArticleAAjouter[] => l.map((f) => ({ p: f.p, titre: f.titre, favori: f.id }))
  const retirerChoix = async () => {
    for (const f of choisis) await source.retirerFavori(f.id)
    setAnnuler(choisis)
    setMessage(null)
    setChoix(new Set())
    maj()
  }
  const panierChoix = async () => {
    const ok = choisis.filter((f) => f.stock !== 'rupture')
    for (const f of ok) await source.favoriAuPanier(f.id)
    const reste = choisis.length - ok.length
    setAnnuler(null)
    setMessage(
      (ok.length > 1 ? tf('{n} articles mis au panier.', { n: ok.length }) : ok.length ? tf('« {p} » est dans ton panier.', { p: t(ok[0].titre) }) : t('Rien à mettre au panier : ces articles sont épuisés.')) +
        (reste && ok.length ? ' ' + tf(reste > 1 ? '{n} épuisés restent en favori.' : '{n} épuisé reste en favori.', { n: reste }) : ''),
    )
    setChoix(new Set())
    maj()
  }
  const texteEnvoi = choisis.map((f) => `${t(f.titre)} · ${F(f.prix)} F\n${location.origin + chemin('fiche', { p: f.p })}`).join('\n\n')
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texteEnvoi)
      setMessage(t('Liens copiés : colle-les dans un message à ton proche.'))
    } catch {
      setMessage(t('Copie refusée par le navigateur : utilise WhatsApp ou le SMS.'))
    }
    setEnvoi(false)
  }
  const partagerChoix = async () => {
    try {
      await navigator.share({ title: t('Mes favoris BelivaY'), text: texteEnvoi })
      setEnvoi(false)
    } catch {
      // Partage annulé.
    }
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

  const annulation = annuler && annuler.length > 0 && (
    <div className="cl10-toast" role="status">
      <span>{annuler.length > 1 ? tf('{n} articles retirés des favoris.', { n: annuler.length }) : tf('« {p} » retiré des favoris.', { p: t(annuler[0].titre) })}</span>
      <button
        type="button"
        style={{ background: 'none', border: 0, color: 'inherit', font: 'inherit', fontWeight: 800, textDecoration: 'underline' }}
        onClick={async () => {
          for (const f of annuler) await source.remettreFavori(f)
          setAnnuler(null)
          maj()
        }}
      >
        {t('Annuler')}
      </button>
    </div>
  )
  // Barre d'actions de la sélection (en bas, à la place de la barre d'onglets au téléphone), et les deux feuilles.
  const barreChoix = choisis.length > 0 && (
    <div className="sv-sel" role="toolbar" aria-label={t('Actions sur la sélection')}>
      <div className="sv-sel-h">
        <b>{tf(choisis.length > 1 ? '{n} articles sélectionnés' : '{n} article sélectionné', { n: choisis.length })}</b>
        <button type="button" className="fp-lnk" onClick={() => setChoix(new Set())}>
          {t('Annuler')}
        </button>
      </div>
      <div className="sv-sel-a">
        {listesOuvertes && (
          <button type="button" onClick={() => setVersListe({ articles: articlesDe(choisis), deplacer: true })}>
            <Icone nom="list-plus" taille={20} />
            <span>{t('Vers une liste')}</span>
          </button>
        )}
        <button type="button" onClick={() => setEnvoi(true)}>
          <Icone nom="send" taille={20} />
          <span>{t('Envoyer')}</span>
        </button>
        <button type="button" onClick={panierChoix}>
          <Icone nom="shopping-cart" taille={20} />
          <span>{t('Au panier')}</span>
        </button>
        <button type="button" className="rouge" onClick={retirerChoix}>
          <Icone nom="trash-2" taille={20} />
          <span>{t('Retirer')}</span>
        </button>
      </div>
    </div>
  )
  const feuilles = (
    <>
      {listesOuvertes && (
        <FeuilleAjoutListe
          ouverte={!!versListe}
          fermer={() => setVersListe(null)}
          articles={versListe?.articles ?? []}
          deplacer={versListe?.deplacer}
          fini={(m) => {
            setMessage(m)
            setAnnuler(null)
            setChoix(new Set())
            maj()
          }}
        />
      )}
      <Feuille ouverte={envoi} fermer={() => setEnvoi(false)} titre={t('Envoyer à un proche')}>
        <h3 className="al-t">{t('Envoyer à un proche')}</h3>
        <p className="al-s">{tf(choisis.length > 1 ? '{n} articles : ton proche reçoit les liens, avec le prix du jour.' : '{n} article : ton proche reçoit le lien, avec le prix du jour.', { n: choisis.length })}</p>
        <div className="sv-env">
          <a className="btn secondary" href={'https://wa.me/?text=' + encodeURIComponent(texteEnvoi)} target="_blank" rel="noopener noreferrer">
            <Icone nom="message-circle" taille={18} />
            <span>{t('WhatsApp')}</span>
          </a>
          <a className="btn secondary" href={'sms:?&body=' + encodeURIComponent(texteEnvoi)}>
            <Icone nom="message-square" taille={18} />
            <span>{t('SMS')}</span>
          </a>
          <button type="button" className="btn secondary" onClick={copier}>
            <Icone nom="copy" taille={18} />
            <span>{t('Copier les liens')}</span>
          </button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button type="button" className="btn secondary" onClick={partagerChoix}>
              <Icone nom="share-2" taille={18} />
              <span>{t('Autres applications')}</span>
            </button>
          )}
        </div>
        {listesOuvertes && (
          <p className="t13 c3 mt10">
            {t('Pour qu’on te les offre :')}{' '}
            <button type="button" className="fp-lnk" onClick={() => (setEnvoi(false), setVersListe({ articles: articlesDe(choisis), deplacer: false }))}>
              {t('les mettre dans une liste à partager')}
            </button>
          </p>
        )}
      </Feuille>
    </>
  )
  const fixes = (
    <>
      {annulation}
      {barreChoix}
      {feuilles}
    </>
  )

  if (!d.favoris.length)
    return (
      <Ecran route="sauvegardes" fixes={fixes}>
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
              {message} {/panier|cart/i.test(message) && <Link to={chemin('panier')}>{t('Voir le panier')}</Link>}
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
  const tousChoisis = liste.length > 0 && liste.every((f) => choix.has(f.id))
  const enTeteChoix = liste.length > 1 && (
    <div className="sv-selh">
      <button type="button" className={'chip' + (tousChoisis ? ' on' : '')} aria-pressed={tousChoisis} onClick={() => setChoix(tousChoisis ? new Set() : new Set(liste.map((f) => f.id)))}>
        <Icone nom={tousChoisis ? 'square-check' : 'square'} taille={16} />
        {t(tousChoisis ? 'Tout désélectionner' : 'Tout sélectionner')}
      </button>
      <span className="t12 c3">{t('Coche des articles pour agir sur plusieurs à la fois.')}</span>
    </div>
  )
  const cartes = (
    <>
      {liste.map((f) => (
        <Carte
          key={f.id}
          f={f}
          pr={produits[f.p]}
          agir={agir(f)}
          choisi={choix.has(f.id)}
          choisir={() => basculerChoix(f.id)}
          versListe={listesOuvertes ? () => setVersListe({ articles: articlesDe([f]), deplacer: false }) : null}
        />
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
      <Ecran route="sauvegardes" fixes={fixes} largeur="large">
        <div className="pg">
          <h1 className="pg-t">{t('Favoris')}</h1>
          <p className="pg-s">{tf('{n} articles · prix et stock vérifiés à {h}', { n: d.favoris.length, h: heureSeule(d.verifieLe, langue) })}</p>
        </div>
        {message && (
          <div className="note green">
            <Icone nom="circle-check" taille={18} />
            <div>
              {message} {/panier|cart/i.test(message) && <Link to={chemin('panier')}>{t('Voir le panier')}</Link>}
            </div>
          </div>
        )}
        <div className="sv-outils">
          {filtres}
          {triage}
          {vedette}
        </div>
        {modules}
        {enTeteChoix}
        <div className="sv-grille">{cartes}</div>
        {alertes}
      </Ecran>
    )

  return (
    <Ecran route="sauvegardes" fixes={fixes}>
      <div className="pg">
        <h1 className="pg-t">{t('Favoris')}</h1>
        <p className="pg-s">{tf('{n} articles · prix et stock vérifiés à {h}', { n: d.favoris.length, h: heureSeule(d.verifieLe, langue) })}</p>
      </div>
      {message && (
        <div className="note green">
          <Icone nom="circle-check" taille={18} />
          <div>
            {message} {/panier|cart/i.test(message) && <Link to={chemin('panier')}>{t('Voir le panier')}</Link>}
          </div>
        </div>
      )}
      {vedette}
      {filtres}
      {triage}
      {enTeteChoix}
      {cartes}
      {alertes}
      {modules}
    </Ecran>
  )
}
