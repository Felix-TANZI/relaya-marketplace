// Écran « Mes commandes » (CL-09), forme d'origine du prototype rendue réelle (DP-54) : le paiement en attente (avec
// son délai, reprendre ou abandonner), les livraisons en cours, les onglets En cours / Terminées et leurs filtres
// avec leurs nombres, une carte par commande selon son état (retrait et code, montant dû, payer au comptoir,
// annuler, suivre, litige, avis, racheter), le relais habituel. Tout vient des données.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTirerPourActualiser } from '../../composants/Animations'
import { Ecran } from '../../composants/coque'
import { Gabarit, Zone } from '../../composants/Gabarits'
import { auMoins, useEcran } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type CommandeClient, type CommandePassee, type Litige, type Relais } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useCompteDiaspora, useMajSession } from '../../session'
import { CommandesEnvoyees } from '../diaspora/Commun'
import { DispositionCommande, useCorpsCommande } from './Commande'
import { echeancier, enCours, Groupe, nbArticles, ouvertureDuJour } from './Commun'

const FILTRES = {
  encours: [
    ['retirer', 'À retirer', (c: CommandeClient) => c.etat === 'retirable' || c.etat === 'comptoir'],
    ['route', 'En route', (c: CommandeClient) => c.etat === 'preparation' || c.etat === 'route' || c.etat === 'paiement'],
    ['litige', 'En litige', (c: CommandeClient) => c.etat === 'litige'],
  ],
  terminees: [
    ['retiree', 'Retirées', (c: CommandeClient) => c.etat === 'retiree'],
    ['annulee', 'Annulées', (c: CommandeClient) => c.etat === 'annulee'],
  ],
} as const

export function Commandes() {
  // Compte diaspora (DP-54) : pas de commande à retirer pour lui ; celles payées pour ses proches.
  if (useCompteDiaspora()) return <CommandesEnvoyees />
  return <CommandesClient />
}

function CommandesClient() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const majSession = useMajSession()
  const [d, setD] = useState<{ commandes: CommandeClient[]; maintenant: number } | null>(null)
  const [attente, setAttente] = useState<CommandePassee[]>([])
  const [litiges, setLitiges] = useState<Litige[]>([])
  const [relais, setRelais] = useState<Relais | null>(null)
  const [tous, setTous] = useState<Relais[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [tic, setTic] = useState(Date.now())
  const [ecart, setEcart] = useState(0) // horloge de la source moins celle de l'appareil
  // Grands écrans (DISPOSITION-ECRANS.md § 5.8) : dès 1024, cartes en grille de 2 et filtres sur une ligne ; dès 1200,
  // maître-détail (la liste compacte à gauche, la commande choisie, ?ref=, à droite).
  const ecran = useEcran()
  const large = auMoins(ecran, 'tab')
  const tabL = auMoins(ecran, 'tab-l')
  const md = auMoins(ecran, 'pc')
  const charger = () => {
    source.commandes().then((x) => (setD(x), setEcart(x.maintenant - Date.now())))
    source.paiementsEnAttente().then(setAttente)
  }
  // Tirer la liste vers le bas l'actualise (Animations.tsx).
  useTirerPourActualiser(charger)
  useEffect(() => {
    charger()
    source.litiges().then((x) => setLitiges(x.litiges))
    source.relaisListe().then((r) => (setRelais(r.relais.find((x) => x.nom === r.habituel) ?? null), setTous(r.relais)))
    const i = setInterval(() => setTic(Date.now()), 1000)
    return () => clearInterval(i)
  }, [])
  if (!d) return null
  const onglet = params.get('onglet') === 'terminees' ? 'terminees' : 'encours'
  const f = params.get('f')
  const choisie = md ? params.get('ref') : null
  const aller = (o: string, filtre?: string | null) => naviguer(chemin('commandes', { ...(o === 'terminees' ? { onglet: o } : {}), ...(filtre ? { f: filtre } : {}), ...(choisie ? { ref: choisie } : {}) }), { replace: true })
  // Maître-détail : la commande choisie, sinon la plus récente en cours (sinon la plus récente).
  const parDate = [...d.commandes].sort((a, b) => b.payeeLe - a.payeeLe)
  const detail = choisie ?? (parDate.find(enCours) ?? parDate[0])?.ref ?? null
  const versDetail = (ref: string) => chemin('commandes', { ...(onglet === 'terminees' ? { onglet } : {}), ...(f ? { f } : {}), ref })
  const dans = d.commandes.filter((c) => (onglet === 'encours' ? enCours(c) : !enCours(c)))
  const filtre = FILTRES[onglet].find(([k]) => k === f)
  const liste = filtre ? dans.filter(filtre[2]) : dans
  const livraisons = d.commandes.filter((c) => c.etat === 'preparation' || c.etat === 'route')
  const p = attente[0]
  const reste = p ? Math.max(0, Math.floor((p.expire - (tic + ecart)) / 1000)) : 0
  const racheter = async (c: CommandeClient) => {
    const n = await source.racheter(c.ref)
    setMessage(tf('{n} article(s) remis au panier.', { n }))
    majSession(await source.session())
  }

  if (!d.commandes.length && !p)
    return (
      <Ecran route="commandes">
        <div className="cl09">
          <div className="c9-h">
            <h1>{t('Mes commandes')}</h1>
          </div>
          <div className="card mt16">
            <div className="empty">
              <div className="ei">
                <Icone nom="package" taille={26} />
              </div>
              <h3>{t('Pas encore de commande')}</h3>
              <p>{t('Tes commandes apparaissent ici dès qu’elles sont payées. Commence par les produits livrables près de chez toi.')}</p>
              <div className="btns">
                <Link to={chemin('categories')} className="btn primary">
                  <span>{t('Découvrir les produits')}</span>
                </Link>
              </div>
            </div>
          </div>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Ton relais habituel s’affichera ici après ta première commande.')}</span>
          </div>
        </div>
      </Ecran>
    )

  const carte = (c: CommandeClient, compacte = false) => {
    const l = c.litige ? litiges.find((x) => x.id === c.litige) : null
    const s = {
      retirable: { hi: 'g', ic: 'package-check', st: 'g', txt: 'Retirable' },
      comptoir: { hi: '', ic: 'wallet', st: 'or', txt: 'À payer au retrait' },
      preparation: { hi: '', ic: 'package', st: 'a', txt: 'En préparation' },
      route: { hi: '', ic: 'truck', st: 'a', txt: 'En route' },
      paiement: { hi: '', ic: 'clock', st: 'a', txt: 'En attente de paiement' },
      litige: { hi: 'r', ic: 'scale', st: 'r', txt: 'En litige' },
      retiree: { hi: 'g', ic: 'package-check', st: 'g', txt: 'Retirée' },
      annulee: { hi: 'n', ic: 'circle-x', st: 'n', txt: 'Annulée' },
    }[c.etat]
    const quand =
      c.etat === 'retiree' && c.retireeLe
        ? tf('Retirée le {d}', { d: jourSeul(c.retireeLe, langue) })
        : c.etat === 'annulee' && c.annulee
          ? tf('Annulée le {d}', { d: jourSeul(c.annulee.le, langue) })
          : tf(c.comptoir ? 'Validée le {d}' : 'Payée le {d}', { d: jourSeul(c.payeeLe, langue) })
    const lieu =
      c.etat === 'retirable'
        ? tf('Arrivés au relais le {d} · retire-les quand tu veux', { d: dateA(c.arriveeLe ?? c.payeeLe, langue) })
        : c.etat === 'comptoir'
          ? t('Arrivée au relais · ton code s’affiche après le paiement')
          : c.etat === 'preparation' || c.etat === 'route'
            ? c.pretLe
              ? tf('Retrait prévu vers le {d} · un seul code pour les {n} colis', { d: dateA(c.pretLe, langue), n: c.colis.length })
              : t('Un seul code pour tous les colis')
            : c.etat === 'litige'
              ? l
                ? tf('Dossier {id} · le vendeur répond au plus tard le {d}', { id: l.id, d: dateA(l.echeance, langue) })
                : tf('Dossier {id}', { id: c.litige ?? '' })
              : c.etat === 'annulee' && c.annulee
                ? tf('{m} F remboursés le jour même', { m: F(c.annulee.rembourse) })
                : c.retourJusqua && c.retourJusqua > d.maintenant
                  ? tf('Retour possible jusqu’au {d}', { d: jourSeul(c.retourJusqua, langue) })
                  : t('Commande close')
    const colis = c.colis.filter((x) => !x.annule)
    // À retirer : jusqu'à quand (avant le renvoi au vendeur) et le relais aujourd'hui (ouvert, fermé).
    const rl = tous.find((x) => x.nom === c.lieu) ?? null
    const ech = (c.etat === 'retirable' || c.etat === 'comptoir') && c.garde ? echeancier(c, d.maintenant, rl?.ferme ?? null) : null
    const ouv = rl ? ouvertureDuJour(rl, d.maintenant) : null
    const du =
      c.etat === 'retirable'
        ? { k: 'Montant dû', v: c.garde?.du ?? 0, s: tf('{m} F demain', { m: F(c.garde?.demain ?? 0) }) }
        : c.etat === 'comptoir'
          ? { k: 'Montant dû au retrait', v: c.comptoir?.du ?? 0, s: t('livraison déjà payée') }
          : c.etat === 'litige'
            ? { k: 'Paiement bloqué', v: l?.montant ?? c.total, s: t('rien n’est versé au vendeur') }
            : c.etat === 'annulee'
              ? { k: 'Remboursé', v: c.annulee?.rembourse ?? c.total, s: tf('{n} colis · {a} article(s)', { n: c.colis.length, a: nbArticles(c) }) }
              : { k: 'Total payé', v: c.total, s: tf('{n} colis · {a} article(s)', { n: colis.length, a: nbArticles(c) }) }
    return (
      <div key={c.ref} className={'c9-oc' + (c.etat === 'retirable' ? ' hl' : '') + (compacte ? ' c9-mini' : '') + (compacte && c.ref === detail ? ' on' : '')}>
        <Link to={compacte ? versDetail(c.ref) : chemin('commande', { ref: c.ref })} replace={compacte} className="hd1" aria-current={compacte && c.ref === detail ? 'true' : undefined}>
          <span className={'hi ' + s.hi}>
            <Icone nom={s.ic} taille={20} />
          </span>
          <span className="ti">
            <b>{c.ref}</b>
            <span>{quand}</span>
          </span>
          <span className="pl">
            <span className={'c9-st ' + s.st}>
              <Icone nom={s.ic === 'package' ? 'clock' : s.ic} taille={13} trait={2.4} />
              {t(s.txt)}
            </span>
          </span>
        </Link>
        {!compacte && (
          <>
        <div className="wh">
          <Icone nom={c.mode === 'relais' ? 'store' : 'house'} taille={14} />
          <span>
            <b>{tf(c.mode === 'relais' ? 'Retrait · {l}' : 'Livraison · {l}', { l: t(c.lieu) })}</b>
            <br />
            {lieu}
            {ech && (
              <>
                <br />
                {tf('Retire avant {d} au soir, sinon renvoi au vendeur', { d: jourSeul(ech.dernier.le, langue) })}
                {ouv ? ' · ' + tf(ouv.texte, ouv.v) : ''}
              </>
            )}
          </span>
        </div>
        <Link to={chemin('commande', { ref: c.ref })} className="its" style={{ display: 'block' }}>
          {colis.slice(0, 2).map((x) => (
            <div key={x.n}>
              <span>{t(x.produit)}</span>
              <b>×{x.qte}</b>
            </div>
          ))}
          {colis.length > 2 && (
            <div>
              <span className="c3">{tf('+ {n} autre(s) article(s)', { n: colis.length - 2 })}</span>
            </div>
          )}
        </Link>
          </>
        )}
        <div className="du">
          <div>
            <div className="k">{t(du.k)}</div>
            <div className="v">
              {F(du.v)}
              <small>F</small>
            </div>
          </div>
          <div className="s">{du.s}</div>
        </div>
        <div className="c9-acts">
          {c.etat === 'retirable' && (
            <>
              {(c.garde?.du ?? 0) > 0 && (
                <Link to={chemin('comptoir-payer', { ref: c.ref })} className="s">
                  {tf('Payer {m} F', { m: F(c.garde!.du) })}
                </Link>
              )}
              <Link to={chemin('code', { ref: c.ref })} className="p">
                <Icone nom="qr-code" taille={15} />
                {t('Mon code')}
              </Link>
            </>
          )}
          {c.etat === 'comptoir' && (
            <Link to={chemin('comptoir-payer', { ref: c.ref })} className="p">
              <Icone nom="smartphone" taille={15} />
              {t('Payer au comptoir')}
            </Link>
          )}
          {(c.etat === 'preparation' || c.etat === 'route') && (
            <>
              {c.etat === 'preparation' && (
                <Link to={chemin('annuler', { ref: c.ref })} className="s red">
                  {t('Annuler')}
                </Link>
              )}
              <Link to={chemin('suivi', { ref: c.ref })} className="p">
                <Icone nom="navigation" taille={15} />
                {t('Suivre')}
              </Link>
            </>
          )}
          {c.etat === 'litige' && c.litige && (
            <Link to={chemin('litige-suivi', { id: c.litige })} className="p">
              <Icone nom="scale" taille={15} />
              {t('Suivre mon litige')}
            </Link>
          )}
          {c.etat === 'retiree' && c.retourJusqua && c.retourJusqua > d.maintenant && (
            <Link to={chemin('avis-donner', { ref: c.ref })} className="s">
              <Icone nom="star" taille={15} />
              {t('Donner mon avis')}
            </Link>
          )}
          {(c.etat === 'retiree' || c.etat === 'annulee') && c.colis.some((x) => x.p) && (
            <a href="#" className="p" onClick={(e) => (e.preventDefault(), racheter(c))}>
              <Icone nom="repeat" taille={15} />
              {t('Racheter')}
            </a>
          )}
          {!compacte && (
            <Link to={chemin('commande', { ref: c.ref })} className="d">
              {t('Détails')}
            </Link>
          )}
        </div>
      </div>
    )
  }

  const bTitre = (
    <>
      <div className="c9-h">
        <h1>{t('Mes commandes')}</h1>
        <span>{tf('{n} commandes', { n: d.commandes.length })}</span>
      </div>
    </>
  )
  const bPay = (
    <>
      {p && reste > 0 && (
        <div className="c9-pay">
          <div className="k">
            <span>{t('Paiement en attente')}</span>
            <span>
              <Icone nom="clock" taille={14} style={{ verticalAlign: '-2px' }} /> {`${String(Math.floor(reste / 60)).padStart(2, '0')}:${String(reste % 60).padStart(2, '0')}`}
            </span>
          </div>
          <div className="a">
            {F(p.montant)}
            <small>F</small>
          </div>
          <p>{tf('Tes {n} articles restent réservés jusqu’à {h}. Ce n’est pas encore une commande : rien n’a été débité.', { n: p.articles, h: dateA(p.expire, langue).split(/ à | at /).pop() ?? '' })}</p>
          <div className="bt">
            <Link to={chemin('paiement-attente', { ref: p.ref })} className="w">
              <Icone nom="rotate-cw-sm" taille={16} />
              {t('Reprendre le paiement')}
            </Link>
            <a href="#" className="g" onClick={async (e) => (e.preventDefault(), await source.echouerPaiement(p.ref, 'expire'), charger())}>
              {t('Abandonner')}
            </a>
          </div>
        </div>
      )}
    </>
  )
  const bMessage = (
    <>
      {message && (
        <div className="note green" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>
            {message} <Link to={chemin('panier')}>{t('Voir le panier')}</Link>
          </div>
        </div>
      )}
    </>
  )
  const bLivraisons = (
    <>
      {livraisons.length > 0 && (
        <section className="c9-pan">
          <div className="ph">
            <span className="i">
              <Icone nom="truck" taille={17} />
            </span>
            <b>{t('Livraisons en cours')}</b>
            <span className="n">{livraisons.length}</span>
          </div>
          <div className="c9-live">
            <div className="c9-map" style={{ height: '160px' }}>
              <Dessin id="f7f01e8383b9" />
              <span className="at">{t('Plan indicatif')}</span>
            </div>
            <Groupe si={large} classe="c9-livl">
            {livraisons.map((c) => (
              <Link key={c.ref} to={chemin('suivi', { ref: c.ref })} className="mc">
                <span className="ic">
                  <Icone nom="package" taille={17} />
                </span>
                <b>{c.ref}</b>
                <span className="c9-st a">
                  <Icone nom="clock" taille={13} trait={2.4} />
                  {t(c.etat === 'route' ? 'En route' : 'En préparation')}
                </span>
                <span>{tf('{n} colis · {a} articles', { n: c.colis.length, a: nbArticles(c) })}</span>
                <span className="am">{F(c.total)}&nbsp;F</span>
                <span>
                  <Icone nom="map-pin" taille={12} style={{ verticalAlign: '-1px' }} /> {t(c.lieu.replace(/^Relais /, ''))}
                  {c.pretLe ? ' · ' + tf('dès le {d}', { d: dateA(c.pretLe, langue) }) : ''}
                </span>
              </Link>
            ))}
            </Groupe>
          </div>
          <div className="c9-follow">
            <Link to={chemin('suivi', { ref: livraisons[0].ref })}>
              <Icone nom="navigation" taille={15} />
              {t('Suivre en détail')}
            </Link>
          </div>
        </section>
      )}
    </>
  )
  const bTabs = (
    <>
      <nav className="c9-tabs" aria-label={t('Commandes')}>
        {(['encours', 'terminees'] as const).map((o) => (
          <a key={o} href="#" className={onglet === o ? 'on' : ''} aria-pressed={onglet === o} onClick={(e) => (e.preventDefault(), aller(o))}>
            {t(o === 'encours' ? 'En cours ' : 'Terminées ')}
            <span className="n">{d.commandes.filter((c) => (o === 'encours' ? enCours(c) : !enCours(c))).length}</span>
          </a>
        ))}
      </nav>
    </>
  )
  const bChips = (
    <>
      <nav className="c9-chips" aria-label={t('Filtrer')}>
        <a href="#" className={!filtre ? 'on' : ''} aria-pressed={!filtre} onClick={(e) => (e.preventDefault(), aller(onglet))}>
          {t('Toutes ')}
          <span className="n">{dans.length}</span>
        </a>
        {FILTRES[onglet].map(([k, x, test]) => (
          <a key={k} href="#" className={f === k ? 'on' : ''} aria-pressed={f === k} onClick={(e) => (e.preventDefault(), aller(onglet, k))}>
            {t(x + ' ')}
            <span className="n">{dans.filter(test).length}</span>
          </a>
        ))}
      </nav>
    </>
  )
  const bVide = (
    <>
      {!liste.length && (
        <p className="t13 c3" style={{ textAlign: 'center' }}>
          {t('Aucune commande ici.')}{' '}
          {filtre && (
            <a href="#" onClick={(e) => (e.preventDefault(), aller(onglet))}>
              {t('Voir toutes')}
            </a>
          )}
        </p>
      )}
    </>
  )
  const bRelais = (
    <>
      {relais && (
        <div className="c9-rly">
          <span className="portrait" style={{ width: '46px', height: '46px' }}>
            <Dessin id="625f59a1564e" />
          </span>
          <span className="grow">
            <span>{t('Ton relais habituel')}</span>
            <b>{t(relais.nom)}</b>
            <span>{tf('{g} · {h}', { g: t(relais.gerant), h: t(relais.horaires) })}</span>
          </span>
          <Link to={chemin('relais-choix', { retour: 'commandes' })}>{t('Changer')}</Link>
        </div>
      )}
    </>
  )
  const bAide = (
    <>
      <div className="card tight mt16">
        {[
          { vers: chemin('faq', { t: 'retrait' }), ic: 'qr-code', lt: 'Comment retirer mes colis', ls: 'Ton code suffit · horaires du relais · retrait par un proche' },
          { vers: chemin('faq', { t: 'garde' }), ic: 'clock', lt: 'Combien coûte la garde', ls: 'Jour d’arrivée gratuit, puis 100 F par jour ; renvoi au vendeur après 7 jours' },
          { vers: chemin('factures'), ic: 'file-text', lt: 'Mes factures', ls: 'Une facture par commande retirée' },
          { vers: chemin('litiges'), ic: 'scale', lt: 'Mes litiges', ls: 'Un article abîmé, manquant ou pas conforme' },
          { vers: chemin('fil', { id: 'support', st: 'nouveau' }), ic: 'message-circle', lt: 'Écrire au support', ls: '7 j/7 · ou demande à être rappelé' },
        ].map((x) => (
          <Link key={x.lt} to={x.vers} className="li">
            <span className="ic">
              <Icone nom={x.ic} taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(x.lt)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t(x.ls)}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        ))}
      </div>
    </>
  )

  // Dès 1200 : maître-détail. La liste (bandeau du paiement compact, onglets et filtres, cartes compactes) à gauche ;
  // à droite la commande choisie, dans la disposition à aside de « Ma commande », précédée des livraisons en cours
  // tant qu'aucune commande n'est choisie dans l'adresse.
  if (md)
    return (
      <Ecran route="commandes" largeur="moyen">
        <div className="cl09 c9-page">
          <Gabarit forme="maitre-detail" classe="c9-md">
            <Zone nom="haut">{bTitre}</Zone>
            <Zone nom="liste">
              {bPay}
              {bMessage}
              {bTabs}
              {bChips}
              {liste.map((c) => carte(c, true))}
              {bVide}
              {bRelais}
              {bAide}
            </Zone>
            <Zone nom="detail">
              {!choisie && bLivraisons}
              {detail && <DetailCommande key={detail} refCommande={detail} />}
            </Zone>
          </Gabarit>
        </div>
      </Ecran>
    )

  return (
    <Ecran route="commandes" largeur={tabL ? 'moyen' : undefined}>
      <div className="cl09 c9-page">
        {bTitre}
        {bPay}
        {bMessage}
        {bLivraisons}
        <Groupe si={tabL} classe="c9-filtres">
          {bTabs}
          {bChips}
        </Groupe>
        <Groupe si={tabL} classe="c9-grille">
          {liste.map((c) => carte(c))}
        </Groupe>
        {bVide}
        {bRelais}
        {bAide}
      </div>
    </Ecran>
  )
}

// Détail de la commande choisie (maître-détail, dès 1200) : le corps de « Ma commande », en 2 colonnes internes. La
// feuille de la facture se pose sur l'écran (hors de la zone qui défile), comme sur la page de la commande.
function DetailCommande({ refCommande }: { refCommande: string }) {
  const { t } = usePreferences()
  const corps = useCorpsCommande(refCommande)
  if (corps === undefined) return null
  if (!corps)
    return (
      <div className="card">
        <div className="empty">
          <h3>{t('Commande introuvable')}</h3>
        </div>
      </div>
    )
  const hote = document.getElementById('app')
  return (
    <>
      <DispositionCommande m={corps.morceaux} />
      {hote && corps.fixes ? createPortal(corps.fixes, hote) : null}
    </>
  )
}
