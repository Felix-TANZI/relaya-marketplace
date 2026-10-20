// Écran « Un proche paie pour toi » (CL-12), forme d'origine du prototype rendue réelle (DP-54) : le client envoie
// son panier à un proche à l'étranger : il choisit les articles à offrir (tout ce qui tient dans un paiement par
// carte, par défaut), puis un lien figé (articles, relais, total, frais de carte 2 %) se partage par WhatsApp,
// SMS, e-mail ou se copie ; carte seulement, 150 000 F au plus par paiement ; la page que le proche reçoit ; les
// paniers envoyés et leur état (payé par qui, preuve de retrait) ; les autres façons de se faire aider.
// Le code de retrait reste au client. En bas : le compte diaspora (code famille) et tout savoir (/diaspora-infos).
// DP-54 : « Envoyer mon panier à mon proche à l'étranger » : à un proche diaspora relié, dans son application,
// sans lien (diaspora/EnvoyerAuProche.tsx). Un compte diaspora qui arrive ici est renvoyé vers son espace.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne, Zone } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { Module } from '../../composants/Module'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type LignePanier, type PanierPartage } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useCompteDiaspora } from '../../session'
import { EnvoyerAuProche } from '../diaspora/EnvoyerAuProche'
import { useColonnes } from '../CL-09/Commun'

export const PLAFOND_CARTE = 150000
export const EURO = 655.957

const ETAPES: [string, string][] = [
  ['Tu remplis ton panier', 'Les articles de ton choix, retirables à ton relais.'],
  ['Tu lui envoies le lien', 'Par WhatsApp, SMS ou e-mail. Il voit le total en francs, en euros ou en dollars.'],
  ['Il paie par carte', 'Visa ou Mastercard, 3-D Secure. 2 % de frais de carte, affichés avant de payer.'],
  ['Tu retires au relais', 'Il reçoit la preuve de retrait. S’il y a un remboursement, il revient sur sa carte.'],
]

export function Diaspora() {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const [pp, setPp] = useState<PanierPartage | null>(null)
  const [vide, setVide] = useState(false)
  const [copie, setCopie] = useState(false)
  const [envoyes, setEnvoyes] = useState<PanierPartage[]>([])
  const lg = useColonnes()
  const [lignes, setLignes] = useState<LignePanier[]>([])
  const [choisies, setChoisies] = useState<string[]>([])
  useEffect(() => {
    source.panier().then((p) => {
      setLignes(p.lignes)
      // Par défaut, tout ce qui tient dans un paiement par carte, dans l'ordre du panier.
      let s = 0
      setChoisies(p.lignes.filter((l) => s + l.prix * l.qte <= PLAFOND_CARTE * 0.95 && (s += l.prix * l.qte) > 0).map((l) => l.id))
    })
  }, [])
  const choix = lignes.filter((l) => choisies.includes(l.id))
  const articles = choix.reduce((n, l) => n + l.qte, 0)
  const sousTotal = choix.reduce((n, l) => n + l.prix * l.qte, 0)
  useEffect(() => {
    source.paniersPartages().then(setEnvoyes)
  }, [pp])
  const lien = pp ? `${location.origin}${chemin('payeur', { id: pp.id })}` : ''
  const texte = pp ? tf('{p} t’envoie son panier BelivaY ({m} F) : {l}', { p: pp.prenom, m: F(pp.total), l: lien }) : ''
  const envoyer = async () => {
    const r = await source.partagerPanier(choisies)
    if (!r) return setVide(true)
    // Le lien est prêt : la carte « Ton panier est prêt » s'affiche avec ses moyens d'envoi. Le partage du téléphone
    // n'est pas lancé ici : après l'attente du serveur, le téléphone ne le compte plus comme un toucher et le refuse
    // sans rien dire ; c'est le bouton « Partager » de la carte qui l'ouvre, d'un toucher direct.
    setPp(r)
    requestAnimationFrame(() => document.getElementById('panier-pret')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }
  const partager = () => {
    if (!pp) return
    if (navigator.share) navigator.share({ title: 'BelivaY', text: texte, url: lien }).catch(() => {})
    else {
      navigator.clipboard?.writeText(texte).catch(() => {})
      setCopie(true)
    }
  }
  const apercu = pp ?? envoyes.find((x) => !x.ref) ?? null
  // Pas encore de lien : « Voir la page qu'il reçoit » prépare d'abord le lien des articles choisis.
  const voir = async () => {
    const r = await source.partagerPanier(choisies)
    if (!r) return setVide(true)
    naviguer(chemin('payeur', { id: r.id }))
  }
  const preuve = envoyes.find((x) => x.ref)
  const compteDiaspora = useCompteDiaspora()
  const bStyles = (
    <>
      <Styles id="118b6d36f2" />
    </>
  )
  const bHero = (
    <>
      <section className="dx-hero dia">
        <span className="wm" aria-hidden="true">
          {t('DIASPORA')}
        </span>
        <span className="k">{t('DIASPORA')}</span>
        <h1>{t('Un proche paie pour toi')}</h1>
        <p>{t('Il est à l’étranger ? Il règle ton panier par carte bancaire, tu retires au relais, avec ton code, comme d’habitude.')}</p>
      </section>
    </>
  )
  const bCompte = (
    <>
      {compteDiaspora && (
        <div className="note ink">
          <Icone nom="globe" taille={18} />
          <div>
            {t('Ton compte est un compte diaspora : c’est toi qui paies pour tes proches. Les paniers qu’ils t’envoient sont dans ton espace.')} <Link to={chemin('espace-diaspora')}>{t('Espace diaspora')}</Link>
          </div>
        </div>
      )}
    </>
  )
  const bComment = (
    <>
      <div className="dx-h">
        <b>{t('Comment ça marche')}</b>
      </div>
      <div className="card ">
        <div className="dx-steps">
          {ETAPES.map(([a, b], i) => (
            <div key={a}>
              <i>{i + 1}</i>
              <p style={{ margin: '0' }}>
                <b>{t(a)}</b>
                <span>{t(b)}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

    </>
  )
  const bProche = (
    <>
      {!compteDiaspora && <EnvoyerAuProche articles={articles} lignes={choisies} />}
    </>
  )
  const bPanier = (
    <>
      {pp ? (
        <div className="card vedette" id="panier-pret">
          <h3 className="cl11-k">{tf('Ton panier est prêt à envoyer · {n} article(s)', { n: pp.lignes.reduce((n, l) => n + l.qte, 0) })}</h3>
          <div className="kv">
            <span className="k">{t('Total pour ton proche')}</span>
            <span className="v">
              <b>{F(pp.total)} F</b> · ≈ {(pp.total / EURO).toFixed(2).replace('.', ',')} €
            </span>
          </div>
          <p className="t12 c3" style={{ wordBreak: 'break-all' }}>
            {lien}
          </p>
          {pp.total > PLAFOND_CARTE && (
            <div className="note amber">
              <Icone nom="triangle-alert" taille={18} />
              <div>{tf('Par carte, c’est {m} F au plus par paiement, frais compris : retire des articles et envoie-les en deux paniers.', { m: F(PLAFOND_CARTE) })}</div>
            </div>
          )}
          <button type="button" className="btn primary mt12" onClick={partager}>
            <Icone nom="share-2" taille={18} />
            <span>{t(typeof navigator !== 'undefined' && 'share' in navigator ? 'Partager mon panier' : 'Copier le message à envoyer')}</span>
          </button>
          <div className="chips mt12">
            <a className="chip" href={'https://wa.me/?text=' + encodeURIComponent(texte)} target="_blank" rel="noreferrer">
              {t('WhatsApp')}
            </a>
            <a className="chip" href={'sms:?&body=' + encodeURIComponent(texte)}>
              {t('SMS')}
            </a>
            <a className="chip" href={'mailto:?subject=' + encodeURIComponent('BelivaY') + '&body=' + encodeURIComponent(texte)}>
              {t('E-mail')}
            </a>
            <a
              className="chip"
              href="#"
              onClick={(e) => {
                e.preventDefault()
                navigator.clipboard?.writeText(lien).catch(() => {})
                setCopie(true)
              }}
            >
              {t(copie ? 'Lien copié' : 'Copier le lien')}
            </a>
          </div>
        </div>
      ) : vide || !lignes.length ? (
        <div className="note ink">
          <Icone nom="shopping-cart" taille={18} />
          <div>
            {t('Ton panier est vide : ajoute d’abord les articles à offrir.')} <Link to={chemin('categories')}>{t('Découvrir les produits')}</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="dx-h">
            <b>{t('Les articles à offrir')}</b>
          </div>
          <div className="card tight">
            {lignes.map((l) => {
              const on = choisies.includes(l.id)
              return (
                <a key={l.id} href="#" role="checkbox" aria-checked={on} className={'li' + (on ? ' on' : '')} onClick={(e) => (e.preventDefault(), setChoisies(on ? choisies.filter((x) => x !== l.id) : [...choisies, l.id]))}>
                  <span className="thumb" style={{ width: 40, height: 40, borderRadius: 10 }}>
                    <Dessin id={l.dessin} />
                  </span>
                  <span className="grow">
                    <span className="lt" style={{ display: 'block' }}>
                      {t(l.titre)}
                      {l.qte > 1 ? ' × ' + l.qte : ''}
                    </span>
                    <span className="ls" style={{ display: 'block' }}>
                      {F(l.prix * l.qte)} F
                    </span>
                  </span>
                  <Icone nom={on ? 'circle-check' : 'circle'} taille={20} style={on ? { color: 'var(--or)' } : undefined} />
                </a>
              )
            })}
          </div>
          {sousTotal > PLAFOND_CARTE && (
            <div className="note amber">
              <Icone nom="triangle-alert" taille={18} />
              <div>{tf('Par carte, c’est {m} F au plus par paiement, frais compris : retire des articles et envoie-les en deux paniers.', { m: F(PLAFOND_CARTE) })}</div>
            </div>
          )}
          <div className="btns mt14">
            <button type="button" className={'btn primary' + (articles ? '' : ' off')} onClick={() => articles && envoyer()}>
              <Icone nom="send" taille={18} />
              <span>{tf('Envoyer mon panier à un proche · {n} article(s)', { n: articles })}</span>
            </button>
          </div>
        </>
      )}
    </>
  )
  const bApercu = (
    <>
      {apercu ? (
        <div className="btns">
          <Link to={chemin('payeur', { id: apercu.id })} className="btn secondary">
            <Icone nom="eye" taille={18} />
            <span>{t('Voir la page qu’il reçoit')}</span>
          </Link>
        </div>
      ) : (
        articles > 0 && (
          <div className="btns">
            <button type="button" className="btn secondary" onClick={voir}>
              <Icone nom="eye" taille={18} />
              <span>{t('Voir la page qu’il reçoit')}</span>
            </button>
          </div>
        )
      )}

    </>
  )
  const bEnvoyes = (
    <>
      {envoyes.length > 0 && (
        <>
          <div className="dx-h">
            <b>{t('Tes paniers envoyés')}</b>
          </div>
          <div className="card tight">
            {envoyes.map((x) => (
              <Link key={x.id} to={x.ref ? chemin('payeur-preuve', { id: x.id }) : chemin('payeur', { id: x.id })} className="li">
                <span className="ic">
                  <Icone nom={x.ref ? 'circle-check' : 'clock'} taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {tf('Panier {id} · {m} F', { id: x.id, m: F(x.total) })}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {x.payeur ? tf('Payé par {p} · {ref}', { p: x.payeur.prenom, ref: x.ref ?? '' }) : t('En attente de paiement')}
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

    </>
  )
  const bAutres = (
    <>
      <Module ff={['FF-EX05', 'FF-EX02', 'FF-LISTE-ENVIES']}>
        <div className="dx-h">
          <b>{t('Autres façons de se faire aider')}</b>
        </div>
        <div className="card tight">
          <Module ff="FF-EX05">
            <Link to={chemin('famille')} className="li">
              <span className="ic ">
                <Icone nom="users" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Panier famille chaque mois')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Ton proche paie les essentiels du mois, livrés au relais')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </Module>
          <Module ff="FF-EX02">
            <Link to={chemin('cotisation')} className="li">
              <span className="ic ">
                <Icone nom="coins" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Cotisation entre proches')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Plusieurs personnes participent à un cadeau')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </Module>
          <Module ff="FF-LISTE-ENVIES">
            <Link to={chemin('listes')} className="li">
              <span className="ic ">
                <Icone nom="gift" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Liste d’envies à offrir')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Tu partages ta liste, on t’offre un article')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </Module>
          {preuve && (
            <Link to={chemin('payeur-preuve', { id: preuve.id })} className="li">
              <span className="ic ">
                <Icone nom="badge-check" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Preuve de retrait')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Ce que reçoit ton proche quand tu as retiré')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          )}
        </div>
      </Module>
    </>
  )
  const bBon = (
    <>
      <details className="more">
        <summary>
          <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Bon à savoir')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p className="t13 c2" style={{ margin: '0' }}>
            {t('Ton proche n’a besoin ni de ton adresse ni de ton numéro. Le paiement au comptoir n’est pas proposé pour un paiement depuis l’étranger. Deux devises : l’euro (1 € = 655,957 F, taux fixe) et le dollar US (taux du jour, figé au paiement).')}
          </p>
        </div>
      </details>
    </>
  )
  const bLiens = (
    <>
      <div className="card tight">
        <Link to={chemin('proches')} className="li">
          <span className="ic ">
            <Icone nom="users" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Ton proche a un compte diaspora ?')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Donne-lui ton code famille : il commande pour toi quand il veut, sans lien à envoyer')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        <Link to={chemin('diaspora-infos')} className="li">
          <span className="ic ">
            <Icone nom="circle-help" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Diaspora : qui peut payer, comment, et tes droits')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Les deux sens : il paie ton panier, ou il commande pour toi')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
      </div>
    </>
  )
  return (
    <Ecran route="diaspora" avant={<Styles id="1c3d953197" />} gabarit="colonnes" largeur={lg.largeur}>
      {lg.colonnes ? (
        // Grands écrans (§ 5.10) : les articles à offrir (puis le panier prêt, son lien et son partage) à gauche ;
        // le proche relié et « Comment ça marche » à droite ; les paniers envoyés et le reste sous les colonnes.
        <>
          <Zone nom="haut">
            {bStyles}
            {bHero}
            {bCompte}
          </Zone>
          <Colonne>
            {bPanier}
            {bApercu}
          </Colonne>
          <Aside titre={t('Comment ça marche')}>
            {bProche}
            {bComment}
          </Aside>
          <Zone nom="bas">
            {bEnvoyes}
            {bAutres}
            {bBon}
            {bLiens}
          </Zone>
        </>
      ) : (
        <>
          {bStyles}
          {bHero}
          {bCompte}
          {bComment}
          {bProche}
          {bPanier}
          {bApercu}
          {bEnvoyes}
          {bAutres}
          {bBon}
          {bLiens}
        </>
      )}
    </Ecran>
  )
}
