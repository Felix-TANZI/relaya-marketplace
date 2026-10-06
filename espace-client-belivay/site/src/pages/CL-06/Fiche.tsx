// Écran « Fiche produit » (CL-06), d'après la photo du porteur, avec le design du site (DP-54) :
// galerie (vignettes, zoom), fil d'Ariane, badges (Certifié, Escrow, Retour 7j), titre, prix et remise, note,
// avis et ventes, paramètres (couleur, capacité, taille, pointure ; indisponible barré), stock et jauge, vendeur
// certifié (score, distance au relais), retrait au relais et livraison à domicile (prix, seuils, délai),
// quantité et sous-total, « Autres vendeurs » (le plus proche, mieux noté, moins cher : « Choisir »), garanties,
// « Poser une question au vendeur », onglets Description / Caractéristiques / Avis, barre du bas (favori,
// Ajouter, Acheter). Tout vient du catalogue (?p=…).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { auMoins, useEcran } from '../../composants/ecran'
import { FilAriane } from '../../composants/FilAriane'
import { Aside, Colonne, Gabarit, Zone } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { useLieu, useVersPourQui } from '../../composants/PourQui'
import { Icone } from '../../composants/Icone'
import { Module } from '../../composants/Module'
import { chemin } from '../../config/pages'
import { source, type AvisProduit, type Produit } from '../../donnees/source'
import { jourSeul } from '../../i18n/dates'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useMajSession } from '../../session'

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
  const [choix, setChoix] = useState<Record<string, string>>({})
  const [qte, setQte] = useState(1)
  const [vendeur, setVendeur] = useState<string | null>(null)
  const [onglet, setOnglet] = useState<'description' | 'specs' | 'avis'>('description')
  const [favori, setFavori] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [alerte, setAlerte] = useState(false)
  // Ordinateur : l'onglet Avis montre trois avis (les plus utiles) sous le résumé (§ 5.4).
  const [apercu, setApercu] = useState<AvisProduit[] | null>(null)
  useEffect(() => {
    if (!pc) return
    source.avisProduit(cle).then((d) => setApercu(d ? [...d.avis].sort((a, b) => b.utiles - a.utiles).slice(0, 3) : []))
  }, [cle, pc])
  useEffect(() => {
    setPr(undefined)
    setImage(0)
    setChoix({})
    setQte(1)
    setVendeur(null)
    setMessage(null)
    source.produit(cle).then((x) => {
      setPr(x)
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

  const autre = vendeur ? pr.autres.find((a) => a.boutique === vendeur) : null
  const prixOption = pr.options.reduce((x, o) => o.prix?.[choix[o.nom]] ?? x, pr.prix)
  const prix = autre ? autre.prix : prixOption
  const remise = pr.prixBarre && pr.prixBarre > prix ? Math.round((1 - prix / pr.prixBarre) * 100) : 0
  const note = Number((pr.note ?? '0').replace(',', '.'))
  const xl = pr.classe === 'XL' || pr.classe === 'HG'
  const vd = autre ? { boutique: autre.boutique, zone: autre.zone, score: autre.score, km: autre.km } : pr.vendeur
  const epuise = pr.stock <= 0
  const tri = [...pr.autres]
  const proche = [...tri].sort((a, b) => a.km - b.km)[0]?.boutique
  const mieux = [...tri].sort((a, b) => b.score - a.score)[0]?.boutique
  const moins = [...tri].sort((a, b) => a.prix - b.prix)[0]?.boutique
  const etiquette = (b: string) => (b === proche ? 'Le plus proche' : b === mieux ? 'Mieux noté' : b === moins ? 'Moins cher' : null)
  const dessins = pr.dessins.length ? pr.dessins : (pr.images ?? []).map(() => '') // photos du serveur sans dessin

  const ajouter = async (puisPayer: boolean) => {
    await source.ajouterProduit(pr.p, choix, qte, vendeur ?? undefined)
    majSession(await source.session())
    if (puisPayer) return naviguer(chemin('panier'))
    setMessage(tf('« {p} » ajouté au panier.', { p: t(pr.titre) }))
  }
  const basculer = async () => {
    const f = await source.basculerFavori(pr.p)
    setFavori(f)
    setMessage(t(f ? 'Ajouté à tes favoris.' : 'Retiré de tes favoris.'))
    majSession(await source.session())
  }

  const barre = (
    <div className="fp-bar">
      <button type="button" className={'fp-fav' + (favori ? ' on' : '')} aria-pressed={favori} aria-label={t(favori ? 'Retirer des favoris' : 'Ajouter aux favoris')} onClick={basculer}>
        <Icone nom="heart" taille={20} style={favori ? { fill: 'currentColor' } : undefined} />
      </button>
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
  const loupe = (e: MouseEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--zx', ((e.clientX - r.left) / r.width) * 100 + '%')
    e.currentTarget.style.setProperty('--zy', ((e.clientY - r.top) / r.height) * 100 + '%')
  }
  const galerie = (
    <>
      <div className="fp-gal card">
        <div className="fp-th">
          {dessins.map((d, i) => (
            <button key={d + i} type="button" className={i === image ? 'on' : ''} aria-label={tf('Photo {n}', { n: i + 1 })} onClick={() => setImage(i)}>
              <Dessin id={d} image={pr.images?.[i]} alt={pr.titre} tailles="64px" />
            </button>
          ))}
        </div>
        <Link to={chemin('galerie', { p: pr.p, i: String(image) })} className="fp-main" aria-label={t('Agrandir la photo')} onMouseMove={tabL ? loupe : undefined}>
          {(dessins[image] || pr.images?.[image]) && <Dessin id={dessins[image] ?? ''} image={pr.images?.[image]} alt={pr.titre} tailles="(min-width: 1200px) 50vw, 100vw" />}
          <span className="pill green sm fp-cert">
            <Icone nom="check" taille={13} />
            {t('Certifié')}
          </span>
          <span className="fp-zoom">
            <Icone nom="zoom-in" taille={18} />
          </span>
        </Link>
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
        {pr.depuis && !autre && <div className="t12 c3">{tf('à partir de {m} F selon la variante', { m: F(pr.depuis) })}</div>}
        <Link to={chemin('avis', { p: pr.p })} className="fp-note">
          <span aria-hidden="true">
            {ETOILES.map((e) => (
              <Icone key={e} nom="star" taille={14} style={e <= Math.round(note) ? { fill: 'var(--or-m)', color: 'var(--or-m)' } : { color: 'var(--ink-4)' }} />
            ))}
          </span>
          <b>{pr.note}</b>
          <span className="t13 c3">{tf('{n} avis vérifiés · {v} vendus', { n: pr.avis, v: pr.ventes })}</span>
        </Link>
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
              {t(autre ? tf('{b} · vendeur certifié', { b: vd.boutique }) : 'Vendeur certifié BelivaY')}
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
  const livCarte = (
    <>
      <div className="card fp-liv">
        <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
          <Icone nom="truck" taille={20} style={{ color: 'var(--or)' }} />
          <span className="grow">
            <b>{xl ? t('Retrait au relais : pas pour ce colis XL') : lieu.diaspora ? tf('Retrait au relais de {p} · {d}', { p: lieu.pq, d: t('demain') }) : tf('Retrait au relais Mvog-Ada · {d}', { d: t('demain') })}</b>
            <span className="t12 c3" style={{ display: 'block' }}>
              {t('900 F — offert dès 30 000 F d’articles')}
            </span>
            {tabL && !xl && !lieu.diaspora && (
              <Link to={chemin('relais-selecteur', { retour: 'fiche?p=' + pr.p })} className="t13 b7 fp-chg">
                {t('Changer de relais')}
              </Link>
            )}
            {lieu.diaspora && (
              <Link to={lieu.proche ? vers.to : chemin('proches')} state={lieu.proche ? vers.state : undefined} className="t13 b7 fp-chg">
                {t(lieu.proche ? 'Changer de proche' : 'Relier un proche')}
              </Link>
            )}
          </span>
        </div>
        <div className="row mt8" style={{ gap: 10, alignItems: 'flex-start' }}>
          <Icone nom="house" taille={20} style={{ color: 'var(--ink-2)' }} />
          <span className="grow">
            <b>{lieu.diaspora ? (lieu.proche?.domicile ? tf('Livraison chez {p} · 24–72 h', { p: lieu.p }) : tf('Livraison chez {p} : pas acceptée pour l’instant', { p: lieu.p })) : t('Livraison à domicile · 24–72 h')}</b>
            <span className="t12 c3" style={{ display: 'block' }}>
              {t('1 500 F — offerte dès 50 000 F d’articles')}
            </span>
          </span>
        </div>
        <p className="t12 c3" style={{ margin: '8px 0 0' }}>
          {lieu.diaspora ? tf('{p} retire avec son propre code ; tu reçois la preuve. Son adresse ne t’est jamais montrée.', { p: lieu.p }) : t('Tu choisis le relais ou le domicile en passant commande.')}
        </p>
        {!lieu.diaspora && (
        <Module ff="FF-ABONNEMENT">
          <Link to={chemin('mon-abonnement')} className="note or" style={{ display: 'flex', marginTop: 8 }}>
            <Icone nom="star" taille={16} />
            <div>{t('Avec Prime, ce retrait est offert dès 10 000 F — 4 000 F/mois')}</div>
          </Link>
        </Module>
        )}
      </div>
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
          </div>
        </div>
      )}
    </>
  )
  const autres = (
    <>
      {pr.autres.length > 0 && (
        <>
          <div className="sec">
            <h2>
              {t('Autres vendeurs')} <span style={{ color: 'var(--or)' }}>({pr.autres.length})</span>
            </h2>
            <span className="t12 c3">{t('glisser →')}</span>
          </div>
          <div className="defile">
            {pr.autres.map((a) => (
              <div key={a.boutique} className={'mini card fp-av' + (vendeur === a.boutique ? ' on' : '')}>
                {etiquette(a.boutique) && <span className="pill green sm">{t(etiquette(a.boutique)!)}</span>}
                <b className="t17" style={{ color: 'var(--or-txt)' }}>
                  {F(a.prix)} F
                </b>
                <span className="t12 c3">
                  <Icone nom="map-pin" taille={12} /> {t(a.zone)}
                </span>
                <span className="t12 b7" style={{ color: 'var(--green)' }}>
                  {tf('{k} km', { k: String(a.km).replace('.', ',') })}
                </span>
                <span className="t12 c3">{tf('Score {s} · {v} ventes', { s: a.score, v: a.ventes })}</span>
                <button type="button" className="btn secondary sm" aria-pressed={vendeur === a.boutique} onClick={() => setVendeur(vendeur === a.boutique ? null : a.boutique)}>
                  <span>{t(vendeur === a.boutique ? 'Choisi' : 'Choisir')}</span>
                </button>
              </div>
            ))}
          </div>
          {vendeur && (
            <p className="t13 c3">
              {tf('Tu achètes chez {b}.', { b: t(vendeur) })}{' '}
              <a href="#" onClick={(e) => (e.preventDefault(), setVendeur(null))}>
                {t('Revenir au vendeur conseillé')}
              </a>
            </p>
          )}
        </>
      )}
    </>
  )
  const garanties = (
    <>
      <div className="fp-gar">
        {[
          ['lock', 'Paiement sécurisé', lieu.diaspora ? 'Carte · Apple Pay · Google Pay' : 'MoMo · Orange · Visa'],
          ['shield', 'Escrow BelivaY', 'Bloqué jusqu’à réception'],
          ['rotate-ccw', 'Retour 7 jours', 'Remboursé sous 72 h'],
          ['messages-square', 'Support 7j/7', 'Dans l’app · WhatsApp'],
        ].map(([i, a, b]) => (
          <div key={a} className="card">
            <Icone nom={i} taille={20} style={{ color: 'var(--or)' }} />
            <b className="t14" style={{ display: 'block', marginTop: 6 }}>
              {t(a)}
            </b>
            <span className="t12 c3">{t(b)}</span>
          </div>
        ))}
      </div>
    </>
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
    </>
  )
  const ongletVu = pc && onglet === 'specs' ? 'description' : onglet
  const onglets = (
    <>
      <div className="fp-tabs" role="tablist">
        {
          // Ordinateur : Description et Caractéristiques côte à côte, sous l'onglet « Détails ».
          (
            (pc
              ? [
                  ['description', 'Détails'],
                  ['avis', `Avis (${pr.avis})`],
                ]
              : [
                  ['description', 'Description'],
                  ['specs', 'Caractéristiques'],
                  ['avis', `Avis (${pr.avis})`],
                ]) as ['description' | 'specs' | 'avis', string][]
          ).map(([k, x]) => (
            <button key={k} type="button" role="tab" aria-selected={ongletVu === k} className={ongletVu === k ? 'on' : ''} onClick={() => setOnglet(k)}>
              {t(x)}
            </button>
          ))
        }
      </div>
    </>
  )
  const panneau = (
    <>
      <div className="fp-tab" role="tabpanel">
        {pc && ongletVu === 'description' && (
          <div className="fp-det">
            <div>
              <div className="kick">{t('Description')}</div>
              <p className="t14 c2" style={{ lineHeight: 1.55 }}>
                {t(pr.description)}
              </p>
            </div>
            <div>
              <div className="kick">{t('Caractéristiques')}</div>
              {pr.specs.map(([k, v]) => (
                <div key={k} className="kv">
                  <span className="k">{t(k)}</span>
                  <span className="v">{t(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {!pc && onglet === 'description' && (
          <p className="t14 c2" style={{ lineHeight: 1.55 }}>
            {t(pr.description)}
          </p>
        )}
        {!pc && onglet === 'specs' && (
          <div>
            {pr.specs.map(([k, v]) => (
              <div key={k} className="kv">
                <span className="k">{t(k)}</span>
                <span className="v">{t(v)}</span>
              </div>
            ))}
          </div>
        )}
        {onglet === 'avis' && (
          <div>
            <div className="row" style={{ gap: 10 }}>
              <b className="t22">{pr.note}</b>
              <span className="t13 c3">{tf('sur 5 · {n} avis vérifiés, seulement après un retrait', { n: pr.avis })}</span>
            </div>
            {pc &&
              apercu?.map((a) => (
                <div key={a.id} className="card fp-avi">
                  <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                    <span role="img" aria-label={tf('{n} sur 5', { n: a.note })}>
                      {ETOILES.map((e) => (
                        <Icone key={e} nom="star" taille={14} style={e <= a.note ? { fill: 'var(--or-m)', color: 'var(--or-m)' } : { color: 'var(--ink-4)' }} />
                      ))}
                    </span>
                    <span className="pill green sm">{t('Acheteur vérifié')}</span>
                  </div>
                  <div className="t12 c3 mt4">
                    {jourSeul(a.le, langue)}
                    {a.variante && ' · ' + t(a.variante)}
                  </div>
                  <p className="t14 c2">{t(a.texte)}</p>
                </div>
              ))}
            <div className="btns">
              <Link to={chemin('avis', { p: pr.p })} className="btn secondary">
                <span>{t('Lire les avis')}</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )

  // Téléphone et tablette portrait : le flux d'origine, une colonne, barre d'achat fixée en bas.
  if (!tabL)
    return (
      <Ecran route="fiche" largeur="large" fixes={barre}>
        {galerie}
        {ariane}
        {entete}
        {prixCarte}
        {options}
        {stock}
        {vendeurCarte}
        {livCarte}
        {qteCarte}
        {annonce}
        {autres}
        {garanties}
        {cote}
        {question}
        {onglets}
        {panneau}
        <div style={{ height: 90 }} />
      </Ecran>
    )

  // Dès 1024 px (DISPOSITION-ECRANS.md § 5.4) : galerie collante à gauche, informations, bloc d'achat (aside
  // collant dès 1200 ; sous les informations, dans la même colonne, en 1024–1199). La barre fixée en bas n'existe
  // plus : ses boutons sont dans le bloc d'achat. Dessous, pleine largeur : autres vendeurs, garanties, onglets.
  const fil = [
    { texte: 'Accueil', vers: chemin('accueil') },
    { texte: pr.universTitre, vers: chemin('categories', { u: pr.univers }) },
    ...(pr.sousCategorie ? [{ texte: pr.sousCategorie, vers: chemin('liste', { u: pr.univers, sub: pr.sousCategorie }) }] : []),
    { texte: pr.titre },
  ]
  return (
    <Ecran route="fiche" largeur="large">
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
        </Colonne>
        <Aside titre="Acheter" classe="fp-achat">
          {pc && (
            <div className="card fp-rap">
              <b className="fp-p">{F(prix)} F</b>
              {pr.prixBarre && pr.prixBarre > prix && <s className="t14 c3">{F(pr.prixBarre)} F</s>}
              {remise > 0 && <span className="pill red sm">−{remise} %</span>}
            </div>
          )}
          {livCarte}
          {qteCarte}
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
            <button type="button" className={'fp-fav' + (favori ? ' on' : '')} aria-pressed={favori} aria-label={t(favori ? 'Retirer des favoris' : 'Ajouter aux favoris')} onClick={basculer}>
              <Icone nom="heart" taille={20} style={favori ? { fill: 'currentColor' } : undefined} />
            </button>
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
          </div>
          {pc && (
            <ul className="fp-gl">
              {[
                ['shield-check', 'Certifié BelivaY', 'Identité vérifiée · Escrow garanti · Retour 7j'],
                ['shield', 'Escrow BelivaY', 'Bloqué jusqu’à réception'],
                ['rotate-ccw', 'Retour 7 jours', 'Remboursé sous 72 h'],
              ].map(([i, a, b]) => (
                <li key={a} title={t(b)}>
                  <Icone nom={i} taille={16} />
                  <b>{t(a)}</b>
                </li>
              ))}
            </ul>
          )}
        </Aside>
      </Gabarit>
      {/* Hors de la grille : la galerie et le bloc d'achat collants s'arrêtent avant ce qui suit. */}
      <div className="fp-l-bas">
        {autres}
        {garanties}
        {onglets}
        {panneau}
      </div>
    </Ecran>
  )
}
