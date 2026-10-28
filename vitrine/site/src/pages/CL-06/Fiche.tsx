// Écran « Fiche produit » (CL-06), d'après la photo du porteur, avec le design du site (DP-54) :
// galerie (vignettes, zoom), fil d'Ariane, badges (Certifié, Escrow, Retour 7j), titre, prix et remise, note,
// avis et ventes, paramètres (couleur, capacité, taille, pointure ; indisponible barré), stock et jauge, vendeur
// certifié (score, distance au relais), retrait au relais et livraison à domicile (prix, seuils, délai),
// quantité et sous-total, l'offre attribuée par la meilleure offre (D8, v1.4 : une ligne de confiance, « Pourquoi ? »
// dépliable ; le client ne choisit plus son vendeur), blocs de confiance (livraison à domicile et retrait au relais
// au prix des règles D10, paiement sécurisé, retour 7 jours, vendeur certifié), « Poser une question au vendeur »,
// trois sections séparées (Description, Caractéristiques, Avis), puis la découverte sans fin (Decouverte.tsx) ;
// barre du bas (favori : un toucher le met en favori, un appui long ouvre « Ajouter à une liste » ; Ajouter,
// Acheter). Tout vient du catalogue (?p=…).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { TexteTraduisible } from '../../traduction/Traduisible'
import { noterVue } from '../../donnees/pourVous'
import { calculer, PARAMETRES } from '../../donnees/frais'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { auMoins, useEcran } from '../../composants/ecran'
import { FilAriane } from '../../composants/FilAriane'
import { Aside, Colonne, Gabarit, Zone } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { FeuilleAjoutListe } from '../../composants/AjoutListe'
import { useLieu, useVersPourQui } from '../../composants/PourQui'
import { Icone } from '../../composants/Icone'
import { Module } from '../../composants/Module'
import { chemin } from '../../config/pages'
import { source, type AvisProduit, type Produit } from '../../donnees/source'
import { jourSeul } from '../../i18n/dates'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useMajSession, useSession } from '../../session'
import { MentionDemo } from '../../composants/BandeauDemo'
import { DecouverteFiche } from './Decouverte'

const ETOILES = [1, 2, 3, 4, 5]

export function Fiche() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const ecran = useEcran()
  const tabL = auMoins(ecran, 'tab-l')
  const pc = auMoins(ecran, 'pc')
  const majSession = useMajSession()
  // Compte diaspora (DP-54) : distances, retrait et livraison sont ceux de son proche actif (« Pour qui ? »).
  const lieu = useLieu()
  const procheId = lieu.proche?.id
  const vers = useVersPourQui()
  const cle = params.get('p') ?? 'camon30'
  const [pr, setPr] = useState<Produit | null | undefined>(undefined)
  const [image, setImage] = useState(0)
  const piste = useRef<HTMLDivElement>(null)
  const [choix, setChoix] = useState<Record<string, string>>({})
  const [qte, setQte] = useState(1)
  const [favori, setFavori] = useState(false)
  const [liste, setListe] = useState(false) // feuille « Ajouter à une liste »
  const [pourquoi, setPourquoi] = useState(false) // « Pourquoi ? » de la meilleure offre
  const [toutLire, setToutLire] = useState(false) // description entière (téléphone)
  const [proposer, setProposer] = useState(false) // après un cœur : « Ajouter à une liste » proposé
  const { interrupteurs } = useSession()
  const listesOuvertes = interrupteurs['FF-LISTE-ENVIES']
  const [message, setMessage] = useState<string | null>(null)
  const [alerte, setAlerte] = useState(false)
  // Section Avis : les avis les plus utiles sous le résumé (deux au téléphone, trois sur ordinateur, § 5.4).
  const [apercu, setApercu] = useState<AvisProduit[] | null>(null)
  useEffect(() => {
    source.avisProduit(cle).then((d) => setApercu(d ? [...d.avis].sort((a, b) => b.utiles - a.utiles).slice(0, 3) : []))
  }, [cle])
  // Appui long sur le cœur (0,5 s) : « Ajouter à une liste » ; le clic qui suit n'est pas un toucher du cœur.
  const appui = useRef<{ minuteur: number; long: boolean }>({ minuteur: 0, long: false })
  useEffect(() => {
    setPr(undefined)
    setImage(0)
    setChoix({})
    setQte(1)
    setMessage(null)
    setPourquoi(false)
    setToutLire(false)
    setProposer(false)
    source.produit(cle).then((x) => {
      setPr(x)
      // Flux « Pour vous » de l'accueil : catégorie et produit vus (donnees/pourVous.ts).
      if (x) noterVue(x)
      if (x) setChoix(Object.fromEntries(x.options.map((o) => [o.nom, o.choisi])))
    })
    source.favoris().then((f) => setFavori(f.favoris.some((x) => x.p === cle)))
  }, [cle, procheId])
  if (pr === undefined) return null
  if (!pr)
    return (
      <Ecran route="fiche">
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="search" taille={26} />
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

  const prixOption = pr.options.reduce((x, o) => o.prix?.[choix[o.nom]] ?? x, pr.prix)
  const prix = prixOption
  const remise = pr.prixBarre && pr.prixBarre > prix ? Math.round((1 - prix / pr.prixBarre) * 100) : 0
  const note = Number((pr.note ?? '0').replace(',', '.'))
  const xl = pr.classe === 'XL' || pr.classe === 'HG'
  // L'offre attribuée (D8) : servie par la source (vendeur, prix) ; son prix livré au relais (D10, par expédition).
  const vd = pr.vendeur
  // Frais v2.0 (donnees/frais.ts) pour la quantité choisie : relais (900 F + format, offert dès 30 000 F ; jamais de
  // colis XL) et domicile (niveau + km + format, offerte jusqu'à 1 500 F dès 50 000 F ; hors gabarit sur devis).
  // Distance du domicile : celle de la boutique au relais du client (ou du proche), le relais étant près de chez lui.
  const expedition = [{ boutique: vd.boutique, zone: vd.zone, km: vd.km, articles: [{ prix, quantite: qte, classe: pr.classe }] }]
  const fraisRelais = calculer('relais', expedition).expeditions[0]
  const fraisDomicile = calculer('domicile', expedition).expeditions[0]
  const livreRelais = fraisRelais.client
  const epuise = pr.stock <= 0
  // Une vignette par photo ou par dessin (le plus grand des deux) : les 4 photos s'affichent même si le produit a moins de dessins.
  const dessins = Array.from({ length: Math.max(pr.dessins.length, pr.images?.length ?? 0) }, (_, i) => pr.dessins[i] ?? '')

  const ajouter = async (puisPayer: boolean) => {
    await source.ajouterProduit(pr.p, choix, qte)
    majSession(await source.session())
    if (puisPayer) return naviguer(chemin('panier'))
    setMessage(tf('« {p} » ajouté au panier.', { p: t(pr.titre) }))
  }
  const basculer = async () => {
    const f = await source.basculerFavori(pr.p)
    setFavori(f)
    setMessage(t(f ? 'Ajouté à tes favoris.' : 'Retiré de tes favoris.'))
    setProposer(f && listesOuvertes)
    majSession(await source.session())
  }
  // Le cœur : un toucher = favori ; un appui long = « Ajouter à une liste » (sans menu du navigateur).
  const lacher = () => window.clearTimeout(appui.current.minuteur)
  const coeur = (
    <button
      type="button"
      className={'fp-fav' + (favori ? ' on' : '')}
      aria-pressed={favori}
      aria-label={t(favori ? 'Retirer des favoris' : 'Ajouter aux favoris')}
      title={listesOuvertes ? t('Appui long : ajouter à une liste') : undefined}
      onPointerDown={() => {
        if (!listesOuvertes) return
        lacher()
        appui.current.long = false
        appui.current.minuteur = window.setTimeout(() => ((appui.current.long = true), setListe(true)), 500)
      }}
      onPointerUp={lacher}
      onPointerLeave={lacher}
      onPointerCancel={lacher}
      onContextMenu={(e) => listesOuvertes && e.preventDefault()}
      onClick={() => {
        if (appui.current.long) return void (appui.current.long = false)
        void basculer()
      }}
    >
      <Icone nom="heart" taille={20} style={favori ? { fill: 'currentColor' } : undefined} />
    </button>
  )
  const feuilleListe = listesOuvertes && (
    <FeuilleAjoutListe
      ouverte={liste}
      fermer={() => setListe(false)}
      articles={[{ p: pr.p, titre: pr.titre }]}
      fini={(m) => {
        setMessage(m)
        setProposer(false)
        source.favoris().then((f) => setFavori(f.favoris.some((x) => x.p === pr.p)))
      }}
    />
  )

  const barre = (
    <div className="fp-bar">
      {coeur}
      {epuise ? (
        <button type="button" className="btn primary" onClick={() => (setAlerte(true), setMessage(t('On te prévient dès son retour en stock.')))}>
          <Icone nom="bell" taille={18} />
          <span>{t(alerte ? 'Alerte activée' : 'Me prévenir du retour')}</span>
        </button>
      ) : (
        <>
          <button type="button" className="btn secondary" onClick={() => ajouter(false)}>
            <Icone nom="shopping-cart" taille={18} />
            <span>{t('Ajouter')}</span>
          </button>
          <button type="button" className="btn primary" onClick={() => ajouter(true)}>
            <span>{t('Acheter')}</span>
          </button>
        </>
      )}
    </div>
  )

  // Grand écran, souris : loupe au survol de l'image principale (le clic ouvre toujours la galerie).
  const loupe = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--zx', ((e.clientX - r.left) / r.width) * 100 + '%')
    e.currentTarget.style.setProperty('--zy', ((e.clientY - r.top) / r.height) * 100 + '%')
  }
  // Image principale : une piste de photos qui défile au doigt (accrochage photo par photo), points synchronisés avec
  // les vignettes ; à l'ordinateur, flèches au survol et touches ← →. Le badge « Certifié » est posé hors de la piste,
  // dans son propre calque absolu (Safari élargissait la pastille, enfant absolu d'un conteneur flex).
  const allerA = (i: number) => {
    const n = Math.max(0, Math.min(dessins.length - 1, i))
    setImage(n)
    const el = piste.current
    if (el) el.scrollTo({ left: n * el.clientWidth, behavior: document.documentElement.dataset.mouv === '1' ? 'smooth' : 'auto' })
  }
  const defiler = () => {
    const el = piste.current
    if (!el || !el.clientWidth) return
    const n = Math.round(el.scrollLeft / el.clientWidth)
    if (n !== image && n >= 0 && n < dessins.length) setImage(n)
  }
  const plusieurs = dessins.length > 1
  const galerie = (
    <>
      <div className="fp-gal card">
        <div className="fp-th">
          {dessins.map((d, i) => (
            <button key={d + i} type="button" className={i === image ? 'on' : ''} aria-label={tf('Photo {n}', { n: i + 1 })} aria-current={i === image ? 'true' : undefined} onClick={() => allerA(i)}>
              <Dessin id={d} image={pr.images?.[i]} alt={pr.titre} tailles="64px" />
            </button>
          ))}
        </div>
        <div className="fp-main" onMouseMove={tabL ? loupe : undefined}>
          <div
            ref={piste}
            className="fp-piste"
            role="region"
            aria-roledescription={t('carrousel')}
            aria-label={tf('Photos de {p}', { p: t(pr.titre) })}
            tabIndex={plusieurs ? 0 : undefined}
            onScroll={defiler}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') (e.preventDefault(), allerA(image + 1))
              else if (e.key === 'ArrowLeft') (e.preventDefault(), allerA(image - 1))
            }}
          >
            {dessins.map((d, i) => (
              <div key={d + i} className="fp-slide" aria-hidden={i === image ? undefined : true} data-n={i}>
                {(d || pr.images?.[i]) && <Dessin id={d} image={pr.images?.[i]} alt={pr.titre} tailles="(min-width: 1200px) 50vw, 100vw" prioritaire={i === 0} />}
              </div>
            ))}
          </div>
          <div className="fp-cert-l">
            <span className="pill green sm fp-cert">
              <Icone nom="check" taille={13} />
              {t('Certifié')}
            </span>
          </div>
          {plusieurs && (
            <>
              <button type="button" className="fp-fl g" aria-label={t('Photo précédente')} disabled={image === 0} onClick={() => allerA(image - 1)}>
                <Icone nom="chevron-left" taille={20} />
              </button>
              <button type="button" className="fp-fl d" aria-label={t('Photo suivante')} disabled={image === dessins.length - 1} onClick={() => allerA(image + 1)}>
                <Icone nom="chevron-right" taille={20} />
              </button>
              <div className="fp-pts" aria-hidden="true">
                {dessins.map((d, i) => (
                  <i key={d + i} className={i === image ? 'on' : ''} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
  const ariane = (
    <>
      <nav className="fp-ar" aria-label={t('Fil d’Ariane')}>
        <Link to={chemin('accueil')}>{t('Accueil')}</Link> › <Link to={chemin('categories', { u: pr.univers })}>{t(pr.universTitre)}</Link>
        {pr.sousCategorie && (
          <>
            {' › '}
            <Link to={chemin('liste', { u: pr.univers, sub: pr.sousCategorie })}>{t(pr.sousCategorie)}</Link>
          </>
        )}
      </nav>
    </>
  )
  const entete = (
    <>
      <div className="fp-bdg">
        <span className="pill green sm">
          <Icone nom="check" taille={12} /> {t('Certifié BelivaY')}
        </span>
        <span className="pill ink sm">{t('Escrow')}</span>
        <span className="pill ink sm">{t('Retour 7j')}</span>
        {pr.tags.map((x) => (
          <span key={x} className="pill ink sm">
            {t(x)}
          </span>
        ))}
      </div>
      <h1 className="fp-t">{t(pr.titre)}</h1>
      <div className="t13 c3">
        {pr.marque ? <Link to={chemin('recherche-resultats', { q: pr.marque })}>{tf('Marque {m}', { m: pr.marque })}</Link> : t('Sans marque')}
        {' · '}
        {lieu.r('à {k} km de ton relais ({r})', { k: String(vd.km).replace('.', ','), r: t(pr.relaisDistance ?? 'Relais Mvog-Ada') })}
      </div>
    </>
  )
  const prixCarte = (
    <>
      <div className="card fp-prix">
        <div className="row" style={{ alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <b className="fp-p">{F(prix)} F</b>
          {pr.prixBarre && pr.prixBarre > prix && <s className="t14 c3">{F(pr.prixBarre)} F</s>}
          {remise > 0 && <span className="pill red sm">−{remise} %</span>}
        </div>
        {pr.depuis && <div className="t12 c3">{tf('à partir de {m} F selon la variante', { m: F(pr.depuis) })}</div>}
        <Link to={chemin('avis', { p: pr.p })} className="fp-note">
          <span aria-hidden="true">
            {ETOILES.map((e) => (
              <Icone key={e} nom="star" taille={14} style={e <= Math.round(note) ? { fill: 'var(--or-m)', color: 'var(--or-m)' } : { color: 'var(--ink-4)' }} />
            ))}
          </span>
          <b>{pr.note}</b>
          <span className="t13 c3">{tf('{n} avis vérifiés · {v} vendus', { n: pr.avis, v: pr.ventes })}</span>
        </Link>
        <MentionDemo />
      </div>
    </>
  )
  const options = (
    <>
      {pr.options.map((o) => (
        <div key={o.nom} className="fp-opt">
          <div className="kick">{t(o.nom)}</div>
          <div className="chips">
            {o.valeurs.map((v) => {
              const indispo = o.indispo?.includes(v)
              return (
                <button
                  key={v}
                  type="button"
                  className={'chip' + (choix[o.nom] === v ? ' on' : '') + (indispo ? ' off' : '')}
                  aria-pressed={choix[o.nom] === v}
                  aria-disabled={indispo || undefined}
                  title={indispo ? t('Épuisé') : undefined}
                  onClick={() => (indispo ? setMessage(tf('{v} est épuisé : choisis une autre option, ou active l’alerte.', { v: t(v) })) : setChoix({ ...choix, [o.nom]: v }))}
                >
                  {indispo ? <s>{t(v)}</s> : t(v)}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
  const stock = (
    <>
      <div className="pan-st">
        <span className={'pill sm ' + (epuise ? 'red' : pr.stock > 3 ? 'green' : 'amber')}>{t(epuise ? 'Épuisé' : pr.stock > 3 ? 'En stock' : 'Bientôt épuisé')}</span>
        <span className="t12 c3">{tf('{n} disponibles', { n: pr.stock })}</span>
        <i className="jauge" aria-hidden="true">
          <b style={{ width: Math.min(100, pr.stock * 4) + '%' }} />
        </i>
      </div>
    </>
  )
  const vendeurCarte = (
    <>
      <div className="card fp-vd">
        <div className="row" style={{ gap: 12 }}>
          <span className="ic-sq green">
            <Icone nom="shield-check" taille={22} />
          </span>
          <span className="grow">
            <b className="t15 b8" style={{ display: 'block' }}>
              {t('Vendeur certifié')}
            </b>
            <span className="t12 c3">{t('Identité vérifiée · Escrow garanti · Retour 7j')}</span>
          </span>
          <span className="pill amber sm">{tf('Score {s}', { s: vd.score })}</span>
        </div>
        <div className="t13 fp-km">
          <Icone nom="map-pin" taille={14} /> {lieu.r('{z} · {k} km de ton relais', { z: t(vd.zone), k: String(vd.km).replace('.', ',') })}
        </div>
      </div>
    </>
  )
  // Blocs de confiance (comme les sites marchands) : deux blocs de livraison au prix D10, puis trois garanties
  // compactes. Dessous : changer de relais (ou de proche), la note diaspora et Prime.
  const fr = (m: number) => F(m) + '\u00A0F'
  const domicileRefus = lieu.diaspora && !lieu.proche?.domicile ? t('Pas acceptée pour l’instant') : fraisDomicile.refus ? t('Sur devis, 8 000 F au moins') : null
  const confiance = (
    <>
      <div className="fp-conf" aria-label={t('Livraison et garanties')} role="group">
        <div className="fp-ct liv">
          <span className="ic">
            <Icone nom="truck" taille={19} />
          </span>
          <span className="tx">
            <b>{lieu.diaspora ? tf('Livraison chez {p}', { p: lieu.p }) : t('Livraison à domicile')}</b>
            <span>{domicileRefus ?? t('Sous 24 à 72 h')}</span>
            {!domicileRefus && (
              <small className={fraisDomicile.client === 0 ? 'ok' : undefined}>
                {/* R12 : « Livraison dès X F », la course seule ; R07 : offerte jusqu'à 1 500 F dès 50 000 F d'achat. */}
                {fraisDomicile.client === 0
                  ? tf('Offerte (dès {s} d’achat)', { s: fr(PARAMETRES.seuilDomicile) })
                  : fraisDomicile.couverture > 0
                    ? tf('Offerte jusqu’à {c} · reste {m}', { c: fr(PARAMETRES.couvertureDomicile), m: fr(fraisDomicile.client) })
                    : tf('Dès {m} · offerte jusqu’à {c} dès {s} d’achat', { m: fr(fraisDomicile.course), c: fr(PARAMETRES.couvertureDomicile), s: fr(PARAMETRES.seuilDomicile) })}
              </small>
            )}
          </span>
        </div>
        {/* Un colis XL ne va jamais au relais (R10) : le bloc n'apparaît pas. */}
        {!xl && (
          <div className="fp-ct liv">
            <span className="ic">
              <Icone nom="store" taille={19} />
            </span>
            <span className="tx">
              <b>{t('Retrait au relais')}</b>
              <span>{tf('{r} · {d}', { r: lieu.diaspora ? lieu.pq : t(pr.relaisDistance ?? 'Relais Mvog-Ada'), d: t('demain') })}</span>
              <small className={fraisRelais.client === 0 ? 'ok' : undefined}>{fraisRelais.client === 0 ? tf('Offerte (dès {s} d’achat)', { s: fr(PARAMETRES.seuilRelais) }) : tf('Dès {m} · offerte dès {s} d’achat', { m: fr(fraisRelais.course), s: fr(PARAMETRES.seuilRelais) })}</small>
            </span>
          </div>
        )}
        <div className="fp-conf-r">
          {(
            [
              ['lock', 'Paiement sécurisé', lieu.diaspora ? 'Carte · Escrow' : 'Mobile Money · Escrow'],
              ['rotate-ccw', 'Retour 7 jours', 'Remboursé sous 72 h'],
              ['shield-check', 'Vendeur certifié', 'Identité vérifiée'],
            ] as const
          ).map(([i, a, b]) => (
            <div key={a} className="fp-ct mini">
              <Icone nom={i} taille={18} />
              <b>{t(a)}</b>
              <span>{t(b)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="fp-conf-pied">
        {!xl && !lieu.diaspora && (
          <Link to={chemin('relais-selecteur', { retour: 'fiche?p=' + pr.p })} className="t13 b7 fp-chg">
            <Icone nom="map-pin" taille={14} />
            {t('Changer de relais')}
          </Link>
        )}
        {lieu.diaspora && (
          <Link to={lieu.proche ? vers.to : chemin('proches')} state={lieu.proche ? vers.state : undefined} className="t13 b7 fp-chg">
            <Icone nom="users" taille={14} />
            {t(lieu.proche ? 'Changer de proche' : 'Relier un proche')}
          </Link>
        )}
        <span className="t12 c3">{lieu.diaspora ? tf('{p} retire avec son propre code ; tu reçois la preuve. Son adresse ne t’est jamais montrée.', { p: lieu.p }) : t('Tu choisis le relais ou le domicile en passant commande.')}</span>
      </div>
      {!lieu.diaspora && (
        <Module ff="FF-ABONNEMENT">
          <Link to={chemin('mon-abonnement')} className="note or fp-prime">
            <Icone nom="star" taille={16} />
            <div>{t('Avec Prime, ce retrait est offert dès 10 000 F — 4 000 F/mois')}</div>
          </Link>
        </Module>
      )}
    </>
  )
  const qteCarte = (
    <>
      <div className="card fp-qte">
        <span className="grow t15 b8">{t('Quantité')}</span>
        <div className="qte" role="group" aria-label={t('Quantité')}>
          <button type="button" aria-label={t('Moins')} disabled={qte <= 1} onClick={() => setQte(qte - 1)}>
            −
          </button>
          <span aria-live="polite">{qte}</span>
          <button type="button" aria-label={t('Plus')} disabled={qte >= Math.min(pr.stock, 10)} onClick={() => setQte(qte + 1)}>
            +
          </button>
        </div>
        <b className="fp-sub">{F(prix * qte)} F</b>
      </div>
    </>
  )
  const annonce = (
    <>
      {message && (
        <div className="note green" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>
            {message} {message.includes('panier') && <Link to={chemin('panier')}>{t('Voir le panier')}</Link>}
            {proposer && (
              <button type="button" className="fp-lnk" onClick={() => setListe(true)}>
                {t('Ajouter aussi à une liste')}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
  // Meilleure offre (D8, v1.4) : BelivaY attribue l'offre en course la mieux placée ; le client ne choisit pas. Une
  // ligne de confiance ; le détail sous « Pourquoi ? ».
  const autres = (
    <div className="fp-offre" data-offre-attribuee>
      <div className="fp-offre-l">
        <Icone nom="badge-check" taille={18} />
        <span className="grow">
          <b>{tf('Meilleure offre : {p} F livrés au relais', { p: F(prix * qte + livreRelais) })}</b>
        </span>
        <button type="button" className="fp-lnk" aria-expanded={pourquoi} onClick={() => setPourquoi(!pourquoi)}>
          {t('Pourquoi ?')}
        </button>
      </div>
      {pourquoi && (
        <p className="t12 c3">
          {t('BelivaY choisit pour toi l’offre la mieux placée : prix livré, Trust Score, délai, stock et avis. Elle reste la tienne au panier et au paiement tant qu’elle reste la mieux placée ; sinon, on te prévient avant de payer.')}
        </p>
      )}
    </div>
  )

  const cote = (
    <>
      {pr.prix >= 20000 && !lieu.diaspora && (
        <div className="btns">
          <Link to={chemin('cote', { p: pr.p })} className="btn soft">
            <Icone nom="calendar" taille={18} />
            <span>{t('Mettre de côté · payer en plusieurs fois')}</span>
          </Link>
        </div>
      )}
    </>
  )
  const question = (
    <>
      <div className="btns">
        <Link to={chemin('question', { p: pr.p })} className="btn secondary">
          <Icone nom="message-square-text" taille={18} />
          <span>{t('Poser une question au vendeur')}</span>
        </Link>
      </div>
      {listesOuvertes && (
        <div className="btns">
          <button type="button" className="btn secondary" onClick={() => setListe(true)}>
            <Icone nom="list-plus" taille={18} />
            <span>{t('Ajouter à une liste')}</span>
          </button>
        </div>
      )}
    </>
  )
  // Trois sections séparées, chacune sous son titre dans sa carte : Description (entière sur ordinateur ; repliée à
  // 6 lignes au téléphone, « Lire la suite »), Caractéristiques, Avis (résumé, avis les plus utiles, « Lire les avis »).
  const longue = pr.description.length > 320
  const avisVus = (apercu ?? []).slice(0, pc ? 3 : 2)
  const sections = (
    <div className="fp-secs">
      <section className="card fp-sec fp-sec-desc" aria-labelledby="fp-h-desc">
        <h2 id="fp-h-desc">
          <Icone nom="file-text" taille={18} />
          {t('Description')}
        </h2>
        <TexteTraduisible comme="p" classe={'t14 c2 fp-desc' + (longue && !toutLire && !pc ? ' court' : '')} texte={t(pr.description)} />
        {longue && !pc && (
          <button type="button" className="fp-lnk" aria-expanded={toutLire} onClick={() => setToutLire(!toutLire)}>
            {t(toutLire ? 'Réduire' : 'Lire la suite')}
          </button>
        )}
      </section>
      <section className="card fp-sec fp-sec-car" aria-labelledby="fp-h-car">
        <h2 id="fp-h-car">
          <Icone nom="list-checks" taille={18} />
          {t('Caractéristiques')}
        </h2>
        {pr.specs.map(([k, v]) => (
          <div key={k} className="kv">
            <span className="k">{t(k)}</span>
            <span className="v">{t(v)}</span>
          </div>
        ))}
      </section>
      <section className="card fp-sec fp-sec-avis" aria-labelledby="fp-h-avis">
        <h2 id="fp-h-avis">
          <Icone nom="star" taille={18} />
          {t('Avis')}
          <span className="n">{pr.avis}</span>
        </h2>
        <div className="row fp-avis-r" style={{ gap: 10 }}>
          <b className="t22">{pr.note}</b>
          <span className="t13 c3">{tf('sur 5 · {n} avis vérifiés, seulement après un retrait', { n: pr.avis })}</span>
        </div>
        <div className="fp-avis-l">
          {avisVus.map((a) => (
            <div key={a.id} className="fp-avi">
              <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                <span role="img" aria-label={tf('{n} sur 5', { n: a.note })}>
                  {ETOILES.map((e) => (
                    <Icone key={e} nom="star" taille={14} style={e <= a.note ? { fill: 'var(--or-m)', color: 'var(--or-m)' } : { color: 'var(--ink-4)' }} />
                  ))}
                </span>
                <span className="pill green sm">{t('Acheteur vérifié')}</span>
              </div>
              <div className="t12 c3 mt4">
                {a.auteur && <b className="c2">{a.auteur.prenom}</b>}
                {a.auteur && ' · ' + a.auteur.quartier + ' · '}
                {jourSeul(a.le, langue)}
                {a.variante && ' · ' + t(a.variante)}
              </div>
              <TexteTraduisible comme="p" classe="t14 c2" texte={t(a.texte)} />
            </div>
          ))}
        </div>
        <div className="btns">
          <Link to={chemin('avis', { p: pr.p })} className="btn secondary">
            <span>{t('Lire les avis')}</span>
          </Link>
        </div>
      </section>
    </div>
  )
  const decouverte = <DecouverteFiche key={pr.p} pr={pr} />

  // Téléphone et tablette portrait : le flux d'origine, une colonne, barre d'achat fixée en bas.
  if (!tabL)
    return (
      <Ecran
        route="fiche"
        largeur="large"
        fixes={
          <>
            {barre}
            {feuilleListe}
          </>
        }
      >
        {galerie}
        {ariane}
        {entete}
        {prixCarte}
        {options}
        {stock}
        {vendeurCarte}
        {confiance}
        {qteCarte}
        {annonce}
        {autres}
        {cote}
        {question}
        {sections}
        {decouverte}
        <div style={{ height: 90 }} />
      </Ecran>
    )

  // Dès 1024 px (DISPOSITION-ECRANS.md § 5.4) : galerie collante à gauche, informations, bloc d'achat (aside
  // collant dès 1200 ; sous les informations, dans la même colonne, en 1024–1199). La barre fixée en bas n'existe
  // plus : ses boutons sont dans le bloc d'achat. Les blocs de confiance suivent les informations. Dessous, pleine
  // largeur : les trois sections (Description et Caractéristiques côte à côte, Avis), puis la découverte.
  const fil = [
    { texte: 'Accueil', vers: chemin('accueil') },
    { texte: pr.universTitre, vers: chemin('categories', { u: pr.univers }) },
    ...(pr.sousCategorie ? [{ texte: pr.sousCategorie, vers: chemin('liste', { u: pr.univers, sub: pr.sousCategorie }) }] : []),
    { texte: pr.titre },
  ]
  return (
    <Ecran route="fiche" largeur="large" fixes={feuilleListe}>
      <Gabarit forme="colonnes" classe="fp-l">
        <Zone nom="haut">
          <FilAriane elements={fil} />
        </Zone>
        <Zone nom="visuel">{galerie}</Zone>
        <Colonne>
          {entete}
          {prixCarte}
          {options}
          {stock}
          {vendeurCarte}
          {confiance}
        </Colonne>
        <Aside titre="Acheter" classe="fp-achat">
          {pc && (
            <div className="card fp-rap">
              <b className="fp-p">{F(prix)} F</b>
              {pr.prixBarre && pr.prixBarre > prix && <s className="t14 c3">{F(pr.prixBarre)} F</s>}
              {remise > 0 && <span className="pill red sm">−{remise} %</span>}
            </div>
          )}
          {qteCarte}
          {autres}
          {annonce}
          <div className="fp-btns">
            {epuise ? (
              <button type="button" className="btn primary" onClick={() => (setAlerte(true), setMessage(t('On te prévient dès son retour en stock.')))}>
                <Icone nom="bell" taille={18} />
                <span>{t(alerte ? 'Alerte activée' : 'Me prévenir du retour')}</span>
              </button>
            ) : (
              <>
                <button type="button" className="btn secondary" onClick={() => ajouter(false)}>
                  <Icone nom="shopping-cart" taille={18} />
                  <span>{t('Ajouter au panier')}</span>
                </button>
                <button type="button" className="btn primary" onClick={() => ajouter(true)}>
                  <span>{t('Acheter')}</span>
                </button>
              </>
            )}
            {coeur}
          </div>
          <div className="fp-liens">
            {pr.prix >= 20000 && !lieu.diaspora && (
              <Link to={chemin('cote', { p: pr.p })}>
                <Icone nom="calendar" taille={16} />
                <span>{t('Mettre de côté · payer en plusieurs fois')}</span>
              </Link>
            )}
            <Link to={chemin('question', { p: pr.p })}>
              <Icone nom="message-square-text" taille={16} />
              <span>{t('Poser une question au vendeur')}</span>
            </Link>
            {listesOuvertes && (
              <button type="button" onClick={() => setListe(true)}>
                <Icone nom="list-plus" taille={16} />
                <span>{t('Ajouter à une liste')}</span>
              </button>
            )}
          </div>
        </Aside>
      </Gabarit>
      {/* Hors de la grille : la galerie et le bloc d'achat collants s'arrêtent avant ce qui suit. */}
      <div className="fp-l-bas">
        {sections}
        {decouverte}
      </div>
    </Ecran>
  )
}
