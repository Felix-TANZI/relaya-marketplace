// Écran « Liste partagée » (CL-14), forme d'origine du prototype rendue réelle (DP-54) : la page web que voit un
// proche qui ouvre le lien (?l=code), sans compte : en-tête web (paiement protégé, langue, adresse du lien), l'initiale
// et le prénom, le nom de la liste, le quartier du relais (jamais l'adresse ni le numéro), la validité du lien, les
// articles déjà offerts (nombre et barre, sans dire par qui), la remise (groupée à une date ou au fil de l'eau),
// « Comment ça marche », les articles au prix du jour avec leur retrait (« Offrir cet article »), ceux déjà offerts
// verrouillés, l'argent protégé. Prix au partage (CLE-39) : à côté du prix du jour, l'écart depuis le partage
// (hausse ou baisse) et la règle : on paie le prix du jour, une hausse est acceptée avant de payer. Un lien expiré ou arrêté : « Cette liste n'est plus partagée », sans rien sur la
// personne.
// Échanges (DP-54) : le compte à rebours jusqu'à la remise ; « Suivre la liste » (avec un compte : rappel 1, 3 ou
// 7 jours avant) ; un article cher (COTISER_DES) s'offre aussi à plusieurs : la participation bascule en cotisation,
// dont la jauge se remplit ici ; un article en cotisation ne s'offre plus seul.
// Depuis n'importe où (DP-54) : n'importe qui, avec ou sans compte, offre ou participe ; un visiteur à l'étranger
// choisit la devise d'affichage (F CFA, euro à taux fixe, dollar US au taux du jour) : les prix s'y affichent en
// plus du franc CFA, la devise suit jusqu'au paiement par carte ; la livraison chez le destinataire est signalée
// quand il l'accepte (la ville seulement) ; « Toi aussi, crée ta liste ».
// Occasions (DP-54, 5 oct.) : la liste d'un mariage, d'une dot, d'une baby shower ou d'une crémaillère nomme ses
// hôtes (« Liste de mariage de Mireille & Paul ») ; la cagnotte « voyage de noces » se remplit ici, avec ou sans
// compte (prénom, montant dès 1 000 F, Mobile Money). Un invité qui a un compte la retrouve aussi dans ses Reçus.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import img_be926f70d2b8_png from '../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne, Zone } from '../../composants/Gabarits'
import { PiedWeb } from '../../composants/PiedWeb'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { NAVIGATION, chemin } from '../../config/pages'
import { COTISER_DES, RAPPELS_JOURS } from '../../donnees/echanges'
import { source, type ListePublique as Liste, type ListeSuivie, type Produit } from '../../donnees/source'
import { F, deviseAffichee, enDevise, type Devise } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { chiffres, espacer } from '../../donnees/numeros'
import { EcartPartage, ecartPartage } from './Commun'
import { joursAvant } from './Echanges'

// Page web : l'écran écrit son en-tête (pas d'en-tête de l'application, pas de barre du bas).
const NAV = { ...NAVIGATION['liste-publique'], entete: 'propre' as const, barre: false }

// Devise d'affichage du visiteur (page publique d'une liste) : ?devise=, sinon son dernier choix sur cet appareil,
// sinon celle de son compte diaspora, sinon le franc CFA. Elle suit jusqu'au paiement par carte (liste-offrir).
const CLE_DEVISE = 'blv_devise_liste'
export function deviseVisiteur(param: string | null): Devise {
  if (param === 'EUR' || param === 'USD' || param === 'XAF') return param
  try {
    const v = localStorage.getItem(CLE_DEVISE)
    if (v === 'EUR' || v === 'USD' || v === 'XAF') return v
  } catch {
    // stockage indisponible
  }
  return deviseAffichee()
}
const garderDevise = (d: Devise) => {
  try {
    localStorage.setItem(CLE_DEVISE, d)
  } catch {
    // stockage indisponible : le choix vaut pour cette page
  }
}

export function ListePublique() {
  const { t, tf, langue, setLangue } = usePreferences()
  const [params] = useSearchParams()
  const code = params.get('l') ?? 'k7Q2mX'
  const [l, setL] = useState<Liste | null | undefined>(undefined)
  const [produits, setProduits] = useState<Record<string, Produit>>({})
  const session = useSession()
  const naviguer = useNavigate()
  const [suivie, setSuivie] = useState<ListeSuivie | null>(null)
  const [mienne, setMienne] = useState(true)
  const [refusCot, setRefusCot] = useState<string | null>(null)
  const [devise, setDevise] = useState<Devise>(() => deviseVisiteur(params.get('devise')))
  const tabL = useDes('tab-l')
  const choisirDevise = (d: Devise) => (setDevise(d), garderDevise(d))
  const avecDevise = (q: Record<string, string>) => (devise === 'XAF' ? q : { ...q, devise })
  const enPlus = (n: number) => (devise === 'XAF' ? null : <span className="t13 c3 b7 blv-devise">{'≈ ' + enDevise(n, devise)}</span>)
  const lireSuivi = () =>
    source.echanges().then((e) => {
      setSuivie(e.suivies.find((x) => x.code === code) ?? null)
      setMaintenant(e.maintenant)
    })
  const [maintenant, setMaintenant] = useState(0)
  useEffect(() => {
    if (session.connecte) (lireSuivi(), source.listes().then((x) => setMienne(x.listes.some((y) => y.partage?.code === code))))
  }, [code, session.connecte])
  useEffect(() => {
    source.listePublique(code).then(setL)
    source.produits().then((x) => setProduits(Object.fromEntries(x.map((y) => [y.p, y]))))
  }, [code])
  if (l === undefined) return null
  const entete = (
    <header className="hd glass cl14-web">
      <div className="hd-strip">
        <Icone nom="shield-check" taille={14} />
        <span>{t('Paiement protégé : le vendeur est payé après le retrait')}</span>
      </div>
      <div className="hd-sub">
        <img src={img_be926f70d2b8_png} alt="BelivaY" />
        <span className="hd-sp"></span>
        <button type="button" className="lang" aria-label={t('Langue')} onClick={() => setLangue(langue === 'en' ? 'fr' : 'en')}>
          {langue === 'en' ? 'EN' : 'FR'}
        </button>
      </div>
      <div className="cl14-url">
        <Icone nom="lock" taille={12} />
        {'belivay.com/l/' + code}
      </div>
    </header>
  )
  const bandeau = !INTERRUPTEURS_DU_LANCEMENT['FF-LISTE-ENVIES'] && (
    <div className="cl14-top">
      <span className="cl14-ff">
        <Icone nom="lock" taille={13} />
        {t('Après le lancement · interrupteur fermé')}
      </span>
      <span className="cl14-ffc">{t('FF-LISTE-ENVIES')}</span>
    </div>
  )
  if (!l)
    return (
      <Ecran route="liste-publique" navigation={NAV} avant={entete}>
        <Styles id="02f3dac5cd" />
        {bandeau}
        <div className="empty">
          <div className="ei">
            <Icone nom="link" taille={26} />
          </div>
          <h3>{t('Cette liste n’est plus partagée')}</h3>
          <p>{t('Son lien a expiré ou a été retiré. Demande un nouveau lien à la personne qui te l’a envoyé.')}</p>
          <div className="btns" style={{ justifyContent: 'center' }}>
            <Link to={chemin('accueil')} className="btn secondary">
              <span>{t('Découvrir BelivaY')}</span>
            </Link>
          </div>
        </div>
        <div className="hint-l">
          <Icone nom="eye-off" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Aucune information sur la personne ni sur sa liste.')}</span>
        </div>
      </Ecran>
    )
  const nOff = l.articles.filter((a) => a.offert).length
  const groupe = l.mode === 'groupe' && !!l.remiseLe
  const remise = l.remiseLe ? jourSeul(l.remiseLe, langue) : ''
  // Les articles à offrir d'abord, ceux déjà offerts ensuite.
  const articles = [...l.articles.filter((a) => !a.offert), ...l.articles.filter((a) => a.offert)]
  const bouges = l.articles.filter((a) => !a.offert && ecartPartage(a) !== 0).length
  const suivre = async (on: boolean, rappel: number | null) => (await source.suivreListe(code, on, rappel), lireSuivi())
  const cotiser = async (p: string) => {
    const x = await source.cotiserArticleListe(code, p)
    if (x.ok) naviguer(chemin('cotisation-participer', avecDevise({ c: x.code })))
    else setRefusCot(x.raison === 'offert' ? 'Cet article vient d’être offert.' : x.raison === 'petit' ? 'Cet article s’offre seul : pas besoin de cotiser.' : 'Cette liste n’est plus partagée.')
  }
  // Dès 1024 px, page web publique (§ 4.7, 5.12) : les articles en grille à gauche, avec « Offrir » sur chaque carte ;
  // à droite, dans l'aside collant, le suivi, les articles déjà offerts, « Comment ça marche » et l'argent protégé.
  // Déplacés, jamais dupliqués : sur téléphone, l'ordre reste le même.
  const aPropos = (
    <>
        {session.connecte && !mienne && (
          <div className="card flat blv-suivre">
            <div className="row" style={{ gap: 12 }}>
              <span className="grow">
                <b className="t14" style={{ display: 'block' }}>
                  {tf('Suivre la liste de {p}', { p: l.prenom })}
                </b>
                <span className="t13 c3">{suivie ? (suivie.rappel ? tf(suivie.rappel > 1 ? 'Rappel {n} jours avant la date, dans ton application.' : 'Rappel {n} jour avant la date, dans ton application.', { n: suivie.rappel }) : t('Tu la retrouves dans Mes listes, sans rappel.')) : t('Elle reste dans Mes listes ; un rappel avant la date si tu veux.')}</span>
              </span>
              <button type="button" className={'tg' + (suivie ? ' on' : '')} role="switch" aria-checked={!!suivie} aria-label={tf('Suivre la liste de {p}', { p: l.prenom })} onClick={() => suivre(!suivie, suivie?.rappel ?? (l.remiseLe ? 3 : null))}></button>
            </div>
            {suivie && l.remiseLe && (
              <div className="chips mt8" role="radiogroup" aria-label={t('Rappel avant la date')}>
                {RAPPELS_JOURS.map((j) => (
                  <a key={j} href="#" role="radio" aria-checked={suivie.rappel === j} className={'chip' + (suivie.rappel === j ? ' on' : '')} onClick={(e) => (e.preventDefault(), suivre(true, j))}>
                    {tf(j > 1 ? '{n} jours avant' : '{n} jour avant', { n: j })}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="card ">
          <div className="cl14-num">
            {tf('{o} sur {n}', { o: nOff, n: l.articles.length })}
            <small>{t('articles déjà offerts')}</small>
          </div>
          {l.articles.length > 0 && (
            <div className="cl14-q" style={{ gridTemplateColumns: `repeat(${l.articles.length},1fr)` }}>
              {l.articles.map((a, i) => (
                <i key={a.p} className={i < nOff ? 'on' : ''}></i>
              ))}
            </div>
          )}
          <div className="note amber">
            <Icone nom={groupe ? 'clock' : 'package'} taille={18} />
            {groupe ? (
              <div>
                <b>{t('Liste groupée.')}</b>
                {t(' Ton cadeau sera remis avec les autres, le ')}
                <b>{remise}</b>
                {tf(' au plus tard. {p} peut aussi demander la remise plus tôt.', { p: l.prenom })}
              </div>
            ) : (
              <div>
                <b>{t('Au fil de l’eau.')}</b>
                {t(' Ton cadeau part dès qu’il est payé, avec son propre code.')}
              </div>
            )}
          </div>
          {l.domicile && !groupe && (
            <div className="hint-l">
              <Icone nom="house" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{tf('Livraison chez {p} possible, à {v} : son adresse ne t’est jamais montrée, le livreur l’appelle.', { p: l.prenom, v: t(l.domicile.ville) })}</span>
            </div>
          )}
        </div>
        <details className="more">
          <summary>
            <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Comment ça marche')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <ol className="cl14-ol" style={{ marginTop: '0' }}>
              <li>
                <b>1</b>
                <span>{t('Tu choisis un article et tu le paies, sans compte, d’où tu es : Mobile Money au Cameroun, ou carte, Apple Pay ou Google Pay depuis l’étranger.')}</span>
              </li>
              <li>
                <b>2</b>
                <span>
                  {l.destination === 'offrant'
                    ? t('Tu choisis où le colis est livré : chez toi ou chez quelqu’un d’autre. Pas besoin de compte.')
                    : l.domicile
                      ? tf('Le colis part au relais de {p}, à {q}, ou chez {p} à {v} si tu le choisis. Tu n’as besoin ni de son adresse, ni d’un compte.', { p: l.prenom, q: t(l.quartier), v: t(l.domicile.ville) })
                      : tf('Le colis part au relais de {p}, à {q}. Tu n’as besoin ni de son adresse, ni d’un compte.', { p: l.prenom, q: t(l.quartier) })}
                </span>
              </li>
              <li>
                <b>3</b>
                <span>{tf('{p} le retire à son relais. Un e-mail te prévient à chaque étape ; si rien n’arrive, ton argent te revient.', { p: l.prenom })}</span>
              </li>
            </ol>
            <p className="t13 c2 mt8">{tf('Les prix affichés sont ceux d’aujourd’hui. Un prix qui a changé depuis le partage du {d} est signalé : une baisse te profite, une hausse t’est demandée avant de payer.', { d: jourSeul(l.partageLe, langue) })}</p>
          </div>
        </details>
    </>
  )
  const confiance = (
    <>
        <div className="card green">
          <div className="t15 b8 cg">{t('Ton argent est protégé')}</div>
          <div className="t13 mt6" style={{ lineHeight: '1.45', color: 'var(--ink-2)' }}>
            {t('Le vendeur n’est payé qu’après la remise. En cas de problème, c’est à ')}
            <b>{t('toi')}</b>
            {tf(' que l’argent revient, sur le moyen de paiement utilisé. Jamais à {p}.', { p: l.prenom })}
          </div>
        </div>
        <div className="note ink">
          <Icone nom="lock" taille={18} />
          <div>{tf('Tu ne vois ni l’adresse, ni le numéro, ni les autres commandes de {p}. {p} ne verra que ton prénom.', { p: l.prenom })}</div>
        </div>
        {(!session.connecte || !mienne) && (
          <div className="links">
            <Link to={chemin(session.connecte ? 'liste-creer' : 'listes')}>{t('Toi aussi, crée ta liste d’envies')}</Link>
          </div>
        )}
    </>
  )
  const cartes = (
    <>
        {articles.map((a) => {
          const pr = produits[a.p]
          if (a.offert)
            return (
              <div key={a.p} className="card cl14-it">
                <div className="row" style={{ alignItems: 'flex-start', gap: '12px' }}>
                  <span className="cl14-lk">
                    <span className="thumb" style={{ width: '72px', height: '72px', borderRadius: '18px' }}>
                      <Dessin id={a.dessin} />
                    </span>
                  </span>
                  <div className="grow">
                    <div className="cn c3">{t(a.titre)}</div>
                  </div>
                </div>
                <div className="cl14-gone" style={{ background: 'var(--sand-2)', boxShadow: 'inset 0 0 0 1px var(--line-2)', color: 'var(--ink-3)' }}>
                  <Icone nom="lock" taille={16} />
                  {t('Déjà offert par quelqu’un')}
                </div>
              </div>
            )
          return (
            <div key={a.p} className="card cl14-it">
              <div className="row" style={{ alignItems: 'flex-start', gap: '12px' }}>
                <span>
                  <span className="thumb" style={{ width: '72px', height: '72px', borderRadius: '18px' }}>
                    <Dessin id={a.dessin} />
                  </span>
                </span>
                <div className="grow">
                  <div className="cn">{t(a.titre)}</div>
                  {pr?.variante && <div className="cv">{t(pr.variante)}</div>}
                  <div className="mt6 cl14-po">
                    <span className="price">
                      {F(a.prix)}
                      <small>{t(' F')}</small>
                    </span>{' '}
                    {enPlus(a.prix)}
                  </div>
                  <EcartPartage a={a} le={l.partageLe} />
                  <div className="cl14-meta">
                    <span className="dl">{a.livraison ? tf('+ {m} F de retrait', { m: F(a.livraison) }) : t('Retrait offert')}</span>
                    {pr?.distance && (
                      <span>
                        <Icone nom="map-pin" taille={13} />
                        {t(pr.distance)}
                      </span>
                    )}
                    {pr && <span>{t(pr.stock > 0 ? 'Disponible' : 'Épuisé')}</span>}
                  </div>
                  <div className="cl14-am">
                    <Icone nom={groupe ? 'boxes' : 'package'} taille={15} />
                    <span>{groupe ? tf('Remis avec les autres colis, le {d} au plus tard', { d: remise }) : t('Part dès qu’il est payé, avec son propre code')}</span>
                  </div>
                </div>
              </div>
              {a.cotisation ? (
                <>
                  <div className="mt12 t13 b7">{tf('Offert à plusieurs : {r} F réunis sur {o} F', { r: F(a.cotisation.reuni), o: F(a.cotisation.objectif) })}</div>
                  <div className="bar mt4">
                    <i style={{ width: `${Math.min(100, Math.round((a.cotisation.reuni / a.cotisation.objectif) * 100))}%` }}></i>
                  </div>
                  <div className="btns mt12">
                    <Link to={chemin('cotisation-participer', avecDevise({ c: a.cotisation.code }))} className="btn soft">
                      <Icone nom="hand-coins" taille={18} />
                      <span>{t('Participer à la cotisation')}</span>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="btns mt12">
                    <Link to={chemin('liste-offrir', avecDevise({ l: l.code, p: a.p }))} className={'btn soft' + (pr && pr.stock <= 0 ? ' off' : '')}>
                      <Icone nom="gift" taille={18} />
                      <span>{t('Offrir cet article')}</span>
                    </Link>
                  </div>
                  {a.prix >= COTISER_DES && (
                    <div className="links">
                      <a href="#" onClick={(e) => (e.preventDefault(), cotiser(a.p))}>
                        {t('Trop cher seul ? Cotiser à plusieurs')}
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
    </>
  )
  return (
    <Ecran route="liste-publique" navigation={NAV} avant={entete} gabarit="web">
      <Styles id="02f3dac5cd" />
      <Zone nom="haut">
        {bandeau}
        <div className="cl14-av" aria-hidden="true">
          {l.prenom.charAt(0).toUpperCase()}
        </div>
        <div className="cl14-center">
          <div className="pg">
            <h1 className="pg-t">{l.hotes && l.hotes.length > 1 ? tf(l.occasion === 'mariage' || l.occasion === 'dot' ? 'Liste de mariage de {p}' : 'La liste de {p}', { p: l.hotes.join(' & ') }) : tf('La liste de {p}', { p: l.prenom })}</h1>
            <p className="pg-s">{tf('{l} · {n} article(s) · retrait à {q}, Yaoundé', { l: t(l.nom), n: l.articles.length, q: t(l.quartier) })}</p>
          </div>
        </div>
        <div className="t13 c3 cl14-center mt4">{tf('Lien valable jusqu’au {d} inclus', { d: jourSeul(l.jusqua, langue) })}</div>
        {l.remiseLe && maintenant > 0 && l.remiseLe > maintenant && (
          <div className="t13 b7 cor cl14-center mt4 blv-rebours">
            <Icone nom="calendar-clock" taille={14} /> {tf('J-{n} avant la remise du {d}', { n: joursAvant(l.remiseLe, maintenant), d: remise })}
          </div>
        )}
        <Styles id="10d630a833" />
        <div className="dev-seg blv-devises" role="group" aria-label={t('Devise d’affichage des prix')}>
          <span className="lb">{t('Prix affichés en')}</span>
          <span className="ch">
            {(['XAF', 'EUR', 'USD'] as const).map((x) => (
              <a key={x} href="#" className={devise === x ? 'on' : ''} aria-pressed={devise === x} onClick={(e) => (e.preventDefault(), choisirDevise(x))}>
                <b>{x === 'XAF' ? 'F' : x === 'EUR' ? '€' : '$'}</b>
                {t(x === 'XAF' ? 'F CFA' : x === 'EUR' ? 'Euro' : 'Dollar US')}
              </a>
            ))}
          </span>
          <span className="rt">{t(devise === 'XAF' ? 'Au Cameroun : Mobile Money. À l’étranger : carte, Apple Pay ou Google Pay.' : devise === 'EUR' ? '1 € = 655,957 F · taux fixe. La commande reste en francs CFA.' : 'Dollar US : taux du jour, figé au paiement. La commande reste en francs CFA.')}</span>
        </div>
      </Zone>
      <Colonne>
        {!tabL && aPropos}
        {bouges > 0 && (
          <div className="hint-l">
            <Icone nom="refresh-cw" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('{n} prix ont changé depuis le partage du {d} : tu paies toujours le prix du jour, affiché en grand.', { n: bouges, d: jourSeul(l.partageLe, langue) })}</span>
          </div>
        )}
        {tabL ? <div className="d13-articles">{cartes}</div> : cartes}
        {l.cagnotte && <CagnotteListe code={code} c={l.cagnotte} hotes={l.hotes && l.hotes.length ? l.hotes.join(' & ') : l.prenom} prenom={session.client?.prenom ?? ''} relire={() => source.listePublique(code).then(setL)} />}
        {refusCot && (
          <div className="note amber" role="alert">
            <Icone nom="circle-alert" taille={18} />
            <div>{t(refusCot)}</div>
          </div>
        )}
        {!tabL && confiance}
      </Colonne>
      {tabL && (
        <Aside titre="La liste">
          {aPropos}
          {confiance}
        </Aside>
      )}
      <Zone nom="bas">
        <PiedWeb />
      </Zone>
    </Ecran>
  )
}

// La cagnotte d'une liste (mariage : « voyage de noces ») : ce qui est réuni, puis participer sans compte (prénom,
// montant dès 1 000 F au plus ce qui manque, discret, un mot, Mobile Money validé sur le téléphone).
function CagnotteListe({ code, c, hotes, prenom: p0, relire }: { code: string; c: NonNullable<Liste['cagnotte']>; hotes: string; prenom: string; relire: () => void }) {
  const { t, tf } = usePreferences()
  const [ouvert, setOuvert] = useState(false)
  const [prenom, setPrenom] = useState(p0)
  const [montant, setMontant] = useState(0)
  const [numero, setNumero] = useState('')
  const [mot, setMot] = useState('')
  const [discret, setDiscret] = useState(false)
  const [valider, setValider] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [merci, setMerci] = useState<number | null>(null)
  const manque = Math.max(0, c.objectif - c.reuni)
  const plancher = Math.min(1000, manque)
  const verifier = () => {
    if (!prenom.trim()) return setErreur('Donne ton prénom.')
    if (montant < plancher || montant > manque) return setErreur(tf('Dès {a} F, au plus ce qui manque ({m} F).', { a: F(plancher), m: F(manque) }))
    if (!/^6\d{8}$/.test(chiffres(numero))) return setErreur('Entre un numéro MTN ou Orange à 9 chiffres.')
    setErreur(null)
    setValider(true)
  }
  const payer = async () => {
    const r = await source.participerCagnotteListe(code, { prenom, montant, moyen: 'Mobile Money · ' + numero, mot, discret })
    setValider(false)
    if (!r.ok) return setErreur(r.raison === 'ferme' ? 'La cagnotte est complète ou fermée : rien n’a été débité.' : 'Ce montant n’est pas possible : rien n’a été débité.')
    setMerci(montant)
    setOuvert(false)
    relire()
  }
  return (
    <div className="card blv-cagnotte">
      <div className="row" style={{ gap: 10 }}>
        <span className="ic or">
          <Icone nom="piggy-bank" taille={20} />
        </span>
        <span className="grow">
          <b className="t15" style={{ display: 'block' }}>
            {t(c.titre)}
          </b>
          <span className="t13 c3">{tf('La cagnotte de {p} : chacun met ce qu’il veut, dès 1 000 F. Versée à {p} le jour J.', { p: hotes })}</span>
        </span>
      </div>
      <div className="row mt8" style={{ justifyContent: 'space-between', gap: 8 }}>
        <b className="t15">{F(c.reuni)}&nbsp;F</b>
        <span className="t13 c3">{tf('sur {o} F · {n} participant(s)', { o: F(c.objectif), n: c.participants })}</span>
      </div>
      <div className="bar mt6" role="progressbar" aria-valuemin={0} aria-valuemax={c.objectif} aria-valuenow={c.reuni} aria-label={t('Ce qui est réuni')}>
        <i style={{ width: `${Math.min(100, Math.round((c.reuni / Math.max(1, c.objectif)) * 100))}%` }}></i>
      </div>
      {merci !== null && (
        <div className="note green blv-succes mt8" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>{tf('Merci {p} ! Ta participation de {m} F est enregistrée. Elle reste bloquée chez BelivaY jusqu’au jour J.', { p: prenom.trim(), m: F(merci) })}</div>
        </div>
      )}
      {manque > 0 && !ouvert && (
        <div className="btns">
          <button type="button" className="btn secondary" onClick={() => (setOuvert(true), setMerci(null))}>
            <span>{t('Participer à la cagnotte')}</span>
          </button>
        </div>
      )}
      {ouvert && !valider && (
        <>
          <div className="chips mt8">
            {[2000, 5000, 10000]
              .filter((n) => n < manque)
              .map((n) => (
                <button key={n} type="button" className={'chip' + (montant === n ? ' on' : '')} aria-pressed={montant === n} onClick={() => setMontant(n)}>
                  {F(n)} F
                </button>
              ))}
          </div>
          <div className="fld">
            <label htmlFor="cg-montant">{t('Montant (F)')}</label>
            <div className="inp">
              <input id="cg-montant" className="grow" inputMode="numeric" value={montant || ''} onChange={(e) => setMontant(Number(e.target.value.replace(/\D/g, '')) || 0)} />
            </div>
          </div>
          <div className="fld">
            <label htmlFor="cg-prenom">{t('Ton prénom')}</label>
            <div className="inp">
              <input id="cg-prenom" className="grow" value={prenom} maxLength={30} onChange={(e) => setPrenom(e.target.value)} />
            </div>
          </div>
          <div className="fld">
            <label htmlFor="cg-numero">{t('Ton numéro MTN ou Orange')}</label>
            <div className="inp">
              <b className="t15">+237</b>
              <input id="cg-numero" className="grow" type="tel" inputMode="tel" placeholder="6XX XX XX XX" value={numero} onChange={(e) => setNumero(espacer(e.target.value))} />
            </div>
          </div>
          <div className="fld">
            <label htmlFor="cg-mot">{tf('Un mot pour {p} (facultatif)', { p: hotes })}</label>
            <div className="inp">
              <input id="cg-mot" className="grow" value={mot} maxLength={120} onChange={(e) => setMot(e.target.value)} />
            </div>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <span className="grow t14">{t('Participer discrètement')}</span>
            <button type="button" className={'tg' + (discret ? ' on' : '')} role="switch" aria-checked={discret} aria-label={t('Participer discrètement')} onClick={() => setDiscret(!discret)}></button>
          </div>
          {erreur && (
            <div className="note red" role="alert">
              <Icone nom="circle-alert" taille={18} />
              <div>{t(erreur)}</div>
            </div>
          )}
          <div className="btns">
            <button type="button" className="btn primary" onClick={verifier}>
              <span>{montant ? tf('Participer · {m} F', { m: F(montant) }) : t('Participer')}</span>
            </button>
            <button type="button" className="btn secondary" onClick={() => setOuvert(false)}>
              <span>{t('Annuler')}</span>
            </button>
          </div>
        </>
      )}
      {valider && (
        <>
          <div className="cl08-wait mt8">
            <span className="cl08-spin"></span>
            <div className="grow">
              <b>{t('Valide la demande sur ton téléphone')}</b>
              <span className="s">{tf('{m} F · {o}', { m: F(montant), o: numero })}</span>
            </div>
          </div>
          <div className="btns">
            <button type="button" className="btn primary" onClick={payer}>
              <span>{t('J’ai validé sur mon téléphone')}</span>
            </button>
            <button type="button" className="btn secondary" onClick={() => setValider(false)}>
              <span>{t('Modifier')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
