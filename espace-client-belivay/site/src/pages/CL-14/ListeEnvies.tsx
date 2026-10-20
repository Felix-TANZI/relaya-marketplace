// Écran « Ma liste » (CL-14), forme d'origine du prototype rendue réelle (DP-54) : une liste (?id=…) avec les puces
// des listes ; en tête, son partage (pastille, lien valable jusqu'au…, envoyer à d'autres proches), ses articles
// offerts (nombre et barre), sa remise (groupée à une date, au fil de l'eau, démarrée) ; en mode surprise, le message
// d'arrivée (ni l'article ni la personne) ; les articles au prix du jour (prix d'avant, variante, retrait, distance,
// disponibilité), ceux offerts et par qui (verrouillés : un article offert ne se retire jamais), l'alerte baisse de
// prix et retour en stock (celle des favoris), ajouter des articles (recherche dans le catalogue), retirer un
// article pas encore offert ; « Démarrer la livraison maintenant » ouvre sa feuille ; « Envoyer ma liste ».
// La liste par défaut (les favoris) : ajouter au panier, baisse de prix depuis l'ajout.
// Échanges (DP-54 ; donnees/echanges.ts) : le compte à rebours jusqu'à la remise (anniversaire), les invités (qui a
// reçu la liste, qui a offert quoi, sauf en surprise), le rappel aux invités BelivaY (un tous les 3 jours, par le
// propriétaire seulement), remercier qui a offert, l'article cher offert à plusieurs (sa cotisation et sa jauge),
// le colis dont la livraison est à payer au retrait (accepter ou refuser).
// « Mettre ma liste en statut » (DP-54) : l'image de statut, son QR code et son lien court (ListeStatut).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Fragment, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import img_0718fddbf299_png from '../../assets/prototype/0718fddbf299.png'
import { norme } from '../../composants/Catalogue'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { useDes } from '../../composants/ecran'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type ArticleListe, type Favori, type ListeEnvies as Liste, type Merci, type Produit } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useMajSession } from '../../session'
import { Bloc, EcartPartage, offerts, useListes } from './Commun'
import { BandeauInterrupteur, MaitreListes, PucesListes, useFavoris } from './Listes'
import { CarteColis, Remercier, joursAvant, useEchanges } from './Echanges'

// Ce que la liste ne porte pas : variante, prix d'avant, distance, stock (catalogue) et alertes (favoris).
function useProduits(): Record<string, Produit> {
  const [p, setP] = useState<Record<string, Produit>>({})
  useEffect(() => {
    source.produits().then((x) => setP(Object.fromEntries(x.map((y) => [y.p, y]))))
  }, [])
  return p
}

type Gestes = { retirer: (a: ArticleListe) => void; alerte: (a: ArticleListe) => void; auPanier: (f: Favori) => void }

function CarteArticle({ a, l, pr, f, g, mercis, apres }: { a: ArticleListe; l: Liste; pr: Produit | undefined; f: Favori | undefined; g: Gestes; mercis?: Merci[]; apres?: () => void }) {
  const { t, tf, langue } = usePreferences()
  const offertVu = !!a.offert && !l.surprise
  const avant = f?.prixAvant ?? pr?.prixBarre ?? null
  const variante = f?.variante ?? pr?.variante ?? null
  const dispo = f ? (f.stock === 'ok' ? 'Disponible' : f.stock === 'retour' ? 'De retour en stock' : 'Épuisé') : pr ? (pr.stock > 0 ? 'Disponible' : 'Épuisé') : null
  const alerteOn = !!f && (f.alertes.prix || f.alertes.stock)
  const remiseGroupee = l.mode === 'groupe' && !l.demarree
  return (
    <div className="card cl14-it">
      {offertVu ? (
        <span className="cl14-bin dim" aria-label={t('Article offert : il ne se retire pas')}>
          <Icone nom="lock" taille={18} />
        </span>
      ) : (
        <button type="button" className="cl14-bin" aria-label={t('Retirer de la liste')} onClick={() => g.retirer(a)}>
          <Icone nom="trash-2" taille={19} />
        </button>
      )}
      <div className="row" style={{ alignItems: 'flex-start', gap: '12px' }}>
        <span>
          <span className="thumb" style={{ width: '72px', height: '72px', borderRadius: '18px' }}>
            <Dessin id={a.dessin} />
          </span>
        </span>
        <div className="grow">
          <div className="cn">{t(a.titre)}</div>
          {variante && <div className="cv">{t(variante)}</div>}
          <div className="mt6 cl14-po">
            <span className="price">
              {F(a.prix)}
              <small>{t(' F')}</small>
            </span>
            {avant !== null && avant > a.prix && (
              <>
                {' '}
                <s className="was">{F(avant)}&nbsp;F</s> <span className="off">−{Math.round((1 - a.prix / avant) * 100)}&nbsp;%</span>
              </>
            )}
          </div>
          <div className="cl14-meta">
            <span className="dl">{a.livraison ? tf('+ {m} F de retrait', { m: F(a.livraison) }) : t('Retrait offert')}</span>
            {pr?.distance && (
              <span>
                <Icone nom="map-pin" taille={13} />
                {t(pr.distance)}
              </span>
            )}
            {!offertVu && dispo && <span>{t(dispo)}</span>}
          </div>
          {!offertVu && <EcartPartage a={a} le={l.partage?.le ?? null} />}
          {f?.prixAvant != null && f.prixAvant > f.prix && (
            <div className="mt6">
              <span className="pill green sm">
                <Icone nom="trending-up" taille={13} />
                {tf('Baisse de prix : −{m} F', { m: F(f.prixAvant - f.prix) })}
              </span>
            </div>
          )}
          {offertVu && a.offert && (
            <>
              <div className="cl14-ok">
                <Icone nom="gift" taille={15} />
                {tf('Offert par {p}', { p: a.offert.par })}
              </div>
              <div className="t12 c3 mt4">
                {remiseGroupee
                  ? tf('Offert le {d} · remis avec les autres, gardé sans frais', { d: jourSeul(a.offert.le, langue) })
                  : tf('Offert le {d} · part avec son propre code', { d: jourSeul(a.offert.le, langue) })}
              </div>
              {a.offert.qui === 'destinataire' && <div className="t12 c3 mt4">{tf('Livraison à payer au retrait : {m} F', { m: F(a.livraison) })}</div>}
              {mercis && apres && <Remercier refCmd={a.offert.ref} pour={a.offert.par} merci={mercis.find((m) => m.ref === a.offert!.ref)} apres={apres} />}
            </>
          )}
          {!a.offert && a.cotisation && (
            <div className="mt8">
              <div className="t13 b7">{tf('Offert à plusieurs : {r} F sur {o} F', { r: F(a.cotisation.reuni), o: F(a.cotisation.objectif) })}</div>
              <div className="bar mt4">
                <i style={{ width: `${Math.min(100, Math.round((a.cotisation.reuni / a.cotisation.objectif) * 100))}%` }}></i>
              </div>
              <div className="links">
                <Link to={chemin('cotisation-participer', { c: a.cotisation.code })}>{t('Voir la cotisation')}</Link>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="btns mt12">
        {l.favoris && f ? (
          <button type="button" className="btn soft" onClick={() => g.auPanier(f)}>
            <Icone nom="shopping-cart" taille={18} />
            <span>{t('Ajouter au panier')}</span>
          </button>
        ) : (
          <Link to={chemin('fiche', { p: a.p })} className="btn soft">
            <span>{t('Voir l’article')}</span>
          </Link>
        )}
        {!offertVu && (
          <button
            type="button"
            className="btn secondary"
            aria-pressed={alerteOn}
            aria-label={t(alerteOn ? 'Alerte baisse de prix et retour en stock : activée' : 'Alerte baisse de prix et retour en stock : désactivée')}
            onClick={() => g.alerte(a)}
          >
            <Icone nom={alerteOn ? 'bell-ring' : 'bell'} taille={18} />
            <span>{t(alerteOn ? 'Alerte activée' : 'Activer l’alerte')}</span>
          </button>
        )}
      </div>
    </div>
  )
}

// Les gestes communs sur un article (retirer, alerte, panier), avec leur message.
function useGestes(id: string, recharger: () => void, setMessage: (m: string) => void, favoris: Favori[], rechargerFavoris: () => void): Gestes {
  const { t, tf } = usePreferences()
  const majSession = useMajSession()
  const fav = (p: string) => favoris.find((x) => x.p === p)
  return {
    retirer: async (a) => {
      const r = await source.retirerArticleListe(id, a.p)
      setMessage(r.ok ? tf('« {p} » retiré de la liste.', { p: t(a.titre) }) : t('Cet article est déjà offert : il ne se retire plus.'))
      recharger()
      rechargerFavoris()
      majSession(await source.session())
    },
    alerte: async (a) => {
      const f = fav(a.p)
      if (!f) {
        await source.basculerFavori(a.p)
        setMessage(tf('Alerte activée pour « {p} » : l’article est aussi dans tes favoris.', { p: t(a.titre) }))
        majSession(await source.session())
      } else {
        const on = !(f.alertes.prix || f.alertes.stock)
        await source.reglerAlerteFavori(f.id, 'prix', on)
        await source.reglerAlerteFavori(f.id, 'stock', on)
        setMessage(on ? tf('Alerte activée pour « {p} ».', { p: t(a.titre) }) : tf('Alerte désactivée pour « {p} ».', { p: t(a.titre) }))
      }
      rechargerFavoris()
      recharger()
    },
    auPanier: async (f) => {
      await source.favoriAuPanier(f.id)
      setMessage(tf('« {p} » ajouté au panier.', { p: t(f.titre) }))
      majSession(await source.session())
      rechargerFavoris()
      recharger()
    },
  }
}

// Les cartes des favoris seules (page « Mes listes », interrupteur fermé).
export function CartesFavoris() {
  const [d, recharger] = useListes()
  const [favoris, rechargerFavoris] = useFavoris()
  const produits = useProduits()
  const [message, setMessage] = useState<string | null>(null)
  const g = useGestes('favoris', recharger, setMessage, favoris, rechargerFavoris)
  const l = d?.listes.find((x) => x.favoris)
  if (!l) return null
  return (
    <>
      {message && (
        <div className="note green" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>{message}</div>
        </div>
      )}
      {l.articles.map((a) => (
        <CarteArticle key={a.p} a={a} l={l} pr={produits[a.p]} f={favoris.find((x) => x.p === a.p)} g={g} />
      ))}
    </>
  )
}

export function ListeEnvies() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const id = params.get('id') ?? 'favoris'
  const [d, recharger] = useListes()
  const [favoris, rechargerFavoris] = useFavoris()
  const produits = useProduits()
  const [ajout, setAjout] = useState(false)
  const [demarrer, setDemarrer] = useState(false)
  const [q, setQ] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const g = useGestes(id, recharger, setMessage, favoris, rechargerFavoris)
  const [e, rechargerE] = useEchanges()
  const [rappel, setRappel] = useState<string | null>(null)
  // Dès 1024, la barre de titre porte le nom de la liste ouverte (« Favoris › Mon anniversaire »).
  const grand = useDes('tab-l')
  if (!d) return null
  const l = d.listes.find((x) => x.id === id)
  if (!l)
    return (
      <Ecran route="liste-envies" gabarit="compte">
        <Styles id="02f3dac5cd" />
        <BandeauInterrupteur />
        <MaitreListes listes={d.listes} on={id}>
        <PucesListes listes={d.listes} on={id} />
        <div className="empty">
          <div className="ei">
            <Icone nom="list-checks" taille={26} />
          </div>
          <h3>{t('Liste introuvable')}</h3>
          <div className="btns" style={{ justifyContent: 'center' }}>
            <Link to={chemin('listes')} className="btn primary">
              <span>{t('Mes listes')}</span>
            </Link>
          </div>
        </div>
        </MaitreListes>
      </Ecran>
    )
  const nOff = offerts(l)
  const reste = l.articles.length - nOff
  const relais = t(l.relais ?? 'relais choisi')
  const remise = l.remiseLe ? jourSeul(l.remiseLe, langue) : ''
  const groupe = l.mode === 'groupe' && !!l.remiseLe
  const et = (xs: string[]) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + t(' et ') + xs[xs.length - 1] : (xs[0] ?? ''))
  const choix = Object.values(produits).filter((p) => !l.articles.some((a) => a.p === p.p) && (!q.trim() || norme(p.titre).includes(norme(q.trim()))))
  const destination = l.destination === 'tiers' && l.tiers ? tf('au relais de {p} ({r})', { p: l.tiers.prenom, r: t(l.tiers.relais) }) : l.destination === 'offrant' ? t('chez celui qui offre') : tf('avec ton adresse, au {r}', { r: relais })
  const fixes = (
    <>
      <Feuille ouverte={ajout} fermer={() => setAjout(false)} titre={t('Ajouter des articles')}>
        <div className="cl14-sheet-h">{t('Ajouter des articles')}</div>
        <div className="inp mt12">
          <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          <input type="search" aria-label={t('Chercher un produit')} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Chercher un produit')} />
        </div>
        <div style={{ maxHeight: '50vh', overflowY: 'auto', marginTop: 8 }}>
          {choix.slice(0, 30).map((p) => (
            <div key={p.p} className="row" style={{ gap: 10, padding: '8px 0' }}>
              <span className="thumb" style={{ width: 40, height: 40, borderRadius: 10 }}>
                <Dessin id={p.dessins[0] ?? ''} />
              </span>
              <span className="grow t13">
                {t(p.titre)}
                <span className="c3" style={{ display: 'block' }}>
                  {F(p.prix)} F
                </span>
              </span>
              <button type="button" className="btn soft sm" style={{ width: 'auto' }} aria-label={tf('Ajouter : {p}', { p: t(p.titre) })} onClick={async () => (await source.ajouterArticleListe(l.id, p.p), recharger(), rechargerFavoris(), setMessage(tf('« {p} » ajouté à la liste.', { p: t(p.titre) })))}>
                <Icone nom="plus" taille={16} />
              </button>
            </div>
          ))}
          {!choix.length && <p className="t13 c3">{t('Aucun produit ne correspond.')}</p>}
        </div>
      </Feuille>
      <Feuille ouverte={demarrer} fermer={() => setDemarrer(false)} titre={t('Démarrer la livraison maintenant ?')}>
        <div className="cl14-sheet-h">{t('Démarrer la livraison maintenant ?')}</div>
        <div className="cl14-note" style={{ fontSize: '14px', color: 'var(--ink-2)' }}>
          {tf('Les {n} cadeau(x) déjà offert(s), {l}, te sont remis dès qu’ils sont au {r}, avec un seul code.', { n: nOff, l: et(l.articles.filter((a) => a.offert).map((a) => t(a.titre))), r: relais })}
        </div>
        {reste > 0 && l.remiseLe && (
          <div className="cl14-note" style={{ fontSize: '14px', color: 'var(--ink-2)' }}>
            {tf('{l} formeront un second groupe, remis le ', { l: et(l.articles.filter((a) => !a.offert).map((a) => t(a.titre))) })}
            <b>{remise}</b>
            {t(' au plus tard.')}
          </div>
        )}
        <div className="btns mt16">
          <button type="button" className="btn primary" onClick={async () => (await source.demarrerListe(l.id), setDemarrer(false), recharger())}>
            <Icone nom="truck" taille={18} />
            <span>{t('Démarrer maintenant')}</span>
          </button>
        </div>
        {l.remiseLe && (
          <div className="btns">
            <button type="button" className="btn secondary" onClick={() => setDemarrer(false)}>
              <span>{tf('Attendre le {d}', { d: remise })}</span>
            </button>
          </div>
        )}
      </Feuille>
    </>
  )
  const pastille = l.favoris ? (
    <span className="pill ink sm">
      <Icone nom="heart" taille={13} />
      {t('Liste par défaut')}
    </span>
  ) : l.surprise ? (
    <span className="pill or sm">
      <Icone nom="gift" taille={13} />
      {t('Surprise')}
    </span>
  ) : l.partage ? (
    <span className="pill or sm">
      <Icone nom="link" taille={13} />
      {t('Partagée')}
    </span>
  ) : (
    <span className="pill ink sm">{t('Pas encore partagée')}</span>
  )
  const note = l.demarree ? (
    <div>{tf('Livraison démarrée : ce qui est offert part maintenant vers le {r} ; le reste forme un second groupe.', { r: relais })}</div>
  ) : l.surprise ? (
    groupe ? (
      <div>
        {t('Tu ne sais ni lesquels ni par qui : surprise au retrait, le ')}
        <b>{remise}</b>
        {tf(' au plus tard, au {r}.', { r: relais })}
      </div>
    ) : (
      <div>{t('Tu ne sais ni lesquels ni par qui : surprise au retrait.')}</div>
    )
  ) : groupe && l.relais ? (
    <div>
      {tf('Remis ensemble au {r} le ', { r: relais })}
      <b>{remise}</b>
      {t(' au plus tard, ou dès que tout est offert. Un seul code, aucun frais de garde.')}
    </div>
  ) : groupe ? (
    <div>
      {t('Les cadeaux seront remis ensemble le ')}
      <b>{remise}</b>
      {t(' au plus tard, au relais que tu choisiras en l’envoyant.')}
    </div>
  ) : (
    <div>{t('Au fil de l’eau : chaque cadeau part dès qu’il est payé, avec son propre code.')}</div>
  )
  return (
    <Ecran route="liste-envies" gabarit="compte" fixes={fixes} titre={grand ? l.nom : undefined} sousTitre={grand ? null : undefined}>
      <Styles id="02f3dac5cd" />
      <BandeauInterrupteur />
      <MaitreListes listes={d.listes} on={l.id}>
      <PucesListes listes={d.listes} on={l.id} />
      <div className="card">
        <div className="cl14-lh">
          {pastille}
          <span className="grow">{l.favoris ? t(l.partage ? 'Partagée' : 'Pas encore partagée') : groupe ? tf('Mode groupé · remise le {d}', { d: remise }) : t('Au fil de l’eau')}</span>
          {l.partage && (
            <Link to={chemin('liste-envoyer', { id: l.id })} className="cl14-sq" aria-label={t('Envoyer à d’autres proches')}>
              <Icone nom="share-2" taille={19} />
            </Link>
          )}
        </div>
        {l.favoris ? (
          <div className="t13 c2 mt8" style={{ lineHeight: '1.45' }}>
            {t('La même que tes Sauvegardés du panier : un cœur sur une fiche l’ajoute ici. Baisse de prix et retour en stock : un push gratuit, sur la variante exacte.')}
          </div>
        ) : (
          <>
            {l.articles.length > 0 && (
              <>
                <div className="cl14-num mt10">
                  {tf('{o} sur {n}', { o: nOff, n: l.articles.length })}
                  <small>{t('articles offerts')}</small>
                </div>
                <div className="cl14-q" style={{ gridTemplateColumns: `repeat(${l.articles.length},1fr)` }}>
                  {l.articles.map((a, i) => (
                    <i key={a.p} className={i < nOff ? 'on' : ''}></i>
                  ))}
                </div>
              </>
            )}
            <div className="note ink">
              <Icone nom="boxes" taille={18} />
              {note}
            </div>
            {l.remiseLe && !l.demarree && l.remiseLe > d.maintenant && (
              <div className="hint-l blv-rebours">
                <Icone nom="calendar-clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                <span>{tf('J-{n} : remise le {d}. Tes invités voient le compte à rebours sur ta liste.', { n: joursAvant(l.remiseLe, d.maintenant), d: remise })}</span>
              </div>
            )}
          </>
        )}
        {l.mode === 'groupe' && nOff > 0 && !l.demarree && !l.surprise && (
          <div className="btns mt12">
            <button type="button" className="btn primary" onClick={() => setDemarrer(true)}>
              <Icone nom="truck" taille={18} />
              <span>{t('Démarrer la livraison maintenant')}</span>
            </button>
          </div>
        )}
        {l.partage ? (
          <div className="hint-l">
            <Icone nom="link" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('Partagée le {a} · lien valable jusqu’au {b} · {c}', { a: jourSeul(l.partage.le, langue), b: jourSeul(l.partage.jusqua, langue), c: destination })}</span>
          </div>
        ) : (
          <div className="btns mt12">
            <Link to={chemin('liste-envoyer', { id: l.id })} className={'btn primary' + (l.articles.length ? '' : ' off')} aria-disabled={!l.articles.length}>
              <Icone nom="send" taille={18} />
              <span>{t('Envoyer ma liste')}</span>
            </Link>
          </div>
        )}
        {l.articles.some((a) => !a.offert) && (
          <div className="btns">
            <Link to={chemin('liste-statut', { id: l.id })} className="btn soft">
              <Icone nom="image" taille={18} />
              <span>{t('Mettre ma liste en statut')}</span>
            </Link>
          </div>
        )}
      </div>
      {l.surprise && (
        <>
          <div className="lock mt12">
            <div className="push">
              <span className="pi">
                <img src={img_0718fddbf299_png} alt="" />
              </span>
              <div className="grow">
                <div className="row" style={{ gap: '6px' }}>
                  <span className="pt">{t('BelivaY')}</span>
                  <span className="pw">{t('à la remise')}</span>
                </div>
                <div className="pb">{tf('Un colis t’attend au {r}. Ouvre BelivaY pour voir ton code de retrait.', { r: relais })}</div>
              </div>
            </div>
          </div>
          <div className="hint-l">
            <Icone nom="eye-off" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Message d’arrivée en mode surprise : ni l’article, ni la personne qui l’offre.')}</span>
          </div>
        </>
      )}
      {message && (
        <div className="note green" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>{message}</div>
        </div>
      )}
      {!l.favoris && e && (() => {
        const invites = e.envois.filter((x) => x.objet === 'liste' && x.id === l.id)
        if (!invites.length && !l.partage) return null
        const donne = (prenom: string) => l.articles.filter((a) => a.offert?.par === prenom)
        const dernier = Math.max(0, ...invites.map((x) => x.rappeleLe ?? 0))
        const rappeler = async () => {
          const x = await source.rappelerInvites(l.id)
          setRappel(x.ok && l.surprise ? t('Rappel envoyé à tes invités qui n’ont encore rien offert (sans te dire qui, surprise oblige).') : x.ok ? tf(x.n > 1 ? 'Rappel envoyé à {n} invités qui n’ont encore rien offert.' : 'Rappel envoyé à {n} invité qui n’a encore rien offert.', { n: x.n }) : x.raison === 'trop_tot' ? tf('Un rappel est déjà parti : le prochain est possible {q}.', { q: quand(x.prochain, e.maintenant, langue) }) : t(l.surprise ? 'Personne à rappeler pour l’instant.' : 'Tous tes invités BelivaY ont déjà offert : personne à rappeler.'))
          rechargerE()
        }
        return (
          <>
            <div className="sec">
              <h2>{tf('Tes invités · {n}', { n: invites.length })}</h2>
            </div>
            <div className="card tight blv-invites">
              {invites.map((x) => {
                const dons = l.surprise ? [] : donne(x.prenom)
                return (
                  <div key={x.proche} className="li">
                    <span className={'ic ' + (dons.length ? 'green' : '')}>
                      <Icone nom={dons.length ? 'gift' : 'user'} taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt" style={{ display: 'block' }}>
                        {x.prenom}
                      </span>
                      <span className="ls" style={{ display: 'block' }}>
                        {dons.length ? tf('a offert : {a}', { a: dons.map((a) => t(a.titre)).join(', ') }) : x.rappeleLe && !l.surprise ? tf('pas encore offert · rappelé {q}', { q: quand(x.rappeleLe, e.maintenant, langue) }) : tf('a reçu ta liste le {d}', { d: jourSeul(x.le, langue) })}
                      </span>
                    </span>
                  </div>
                )
              })}
              {!invites.length && (
                <div className="li">
                  <span className="ic ">
                    <Icone nom="users" taille={20} />
                  </span>
                  <span className="grow">
                    <span className="lt" style={{ display: 'block' }}>
                      {t('Tu n’as encore envoyé ta liste à aucun proche dans l’application.')}
                    </span>
                  </span>
                </div>
              )}
            </div>
            {rappel && (
              <div className="note ink" role="status">
                <Icone nom="bell-ring" taille={18} />
                <div>{rappel}</div>
              </div>
            )}
            {invites.length > 0 && (
              <div className="btns">
                <button type="button" className="btn soft" onClick={rappeler}>
                  <Icone nom="bell-ring" taille={18} />
                  <span>{t('Rappeler à mes invités')}</span>
                </button>
              </div>
            )}
            <div className="btns">
              <Link to={chemin('liste-envoyer', { id: l.id })} className="btn secondary">
                <Icone nom="user-plus" taille={18} />
                <span>{t('Inviter d’autres proches')}</span>
              </Link>
            </div>
            <div className="hint-l">
              <Icone nom="bell" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{dernier ? tf('Dernier rappel {q}. Un rappel tous les 3 jours au plus, seulement à ceux qui n’ont rien offert ; BelivaY ne relance jamais de lui-même.', { q: quand(dernier, e.maintenant, langue) }) : t('Un rappel tous les 3 jours au plus, seulement à ceux qui n’ont rien offert ; BelivaY ne relance jamais de lui-même.')}</span>
            </div>
          </>
        )
      })()}
      {/* Occasion (DP-54) : les mariés ou les hôtes, la cagnotte « voyage de noces » et qui y a participé. */}
      {((l.hotes?.length ?? 0) > 1 || l.cagnotte) && (
        <div className="card tight blv-occasion">
          {l.hotes && l.hotes.length > 1 && (
            <div className="kv">
              <span className="k">{t(l.occasion === 'mariage' || l.occasion === 'dot' ? 'Les mariés' : 'Les hôtes')}</span>
              <span className="v">{l.hotes.join(' & ')}</span>
            </div>
          )}
          {l.cagnotte && (
            <>
              <div className="kv">
                <span className="k">{t(l.cagnotte.titre)}</span>
                <span className="v">{tf('{r} F sur {o} F', { r: F(l.cagnotte.participations.reduce((n, x) => n + x.montant, 0)), o: F(l.cagnotte.objectif) })}</span>
              </div>
              <div className="bar mt6" aria-hidden="true">
                <i style={{ width: `${Math.min(100, Math.round((l.cagnotte.participations.reduce((n, x) => n + x.montant, 0) / l.cagnotte.objectif) * 100))}%` }}></i>
              </div>
              <p className="t12 c3 mt6">{l.cagnotte.participations.length ? l.cagnotte.participations.map((x) => (x.discret ? t('une participation discrète') : x.prenom + ' · ' + F(x.montant) + ' F')).join(' · ') : t('Pas encore de participation : envoie ta liste, la cagnotte part avec elle.')}</p>
            </>
          )}
        </div>
      )}
      <div className="sec">
        <h2>{t('Les articles')}</h2>
      </div>
      <Bloc classe="g5-art">
      {l.articles.map((a) => {
        const colis = e?.colis.find((c) => c.sens === 'recu' && c.ref === a.offert?.ref && c.etat === 'a_accepter')
        return (
          <Fragment key={a.p}>
            <CarteArticle a={a} l={l} pr={produits[a.p]} f={favoris.find((x) => x.p === a.p)} g={g} mercis={l.surprise ? undefined : e?.mercis} apres={rechargerE} />
            {colis && !l.surprise && <CarteColis c={colis} apres={() => (rechargerE(), recharger())} />}
          </Fragment>
        )
      })}
      </Bloc>
      {!l.articles.length && <p className="t13 c3">{t('Aucun article pour l’instant.')}</p>}
      <div className="btns">
        <button type="button" className="btn soft" onClick={() => setAjout(true)}>
          <Icone nom="plus" taille={18} />
          <span>{t('Ajouter des articles')}</span>
        </button>
      </div>
      {l.favoris ? (
        <>
          <div className="hint-l">
            <Icone nom="refresh-cw" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Les prix se mettent à jour à chaque visite : jamais un prix figé.')}</span>
          </div>
          <div className="links">
            <Link to={chemin('sauvegardes')}>{t('Gérer mes favoris et leurs alertes')}</Link>
          </div>
        </>
      ) : (
        <details className="more">
          <summary>
            <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Pendant l’attente')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <p>{t('Tu peux retirer un article pas encore offert, tout de suite. Un article offert ne se retire jamais.')}</p>
            {l.mode === 'groupe' && <p>{t('Si tout le reste est offert, la remise part aussitôt.')}</p>}
            {l.mode === 'groupe' && <p>{t('« Démarrer la livraison maintenant » : ce qui est offert part, le reste formera un second groupe.')}</p>}
            {l.surprise && <p>{t('En mode surprise, retirer un article déjà offert est refusé, sans dire par qui il a été offert.')}</p>}
            {l.partage && <p>{t('Les prix suivent le catalogue. Tes proches voient le prix relevé au partage et celui du jour : ils paient le prix du jour, et acceptent une hausse avant de payer.')}</p>}
          </div>
        </details>
      )}
      </MaitreListes>
    </Ecran>
  )
}
