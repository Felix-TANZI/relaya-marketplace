// Écran « Paiement express » (CL-08 : Apple Pay, Google Pay), forme d'origine du prototype rendue réelle (DP-54) :
// la feuille de paiement du téléphone, posée sur l'écran d'où l'on vient (?back=…, par défaut « Passer
// commande » : le panier et sa feuille) ; partagée par tous les parcours (achat, abonnement, cotisation, liste,
// payeur) : ?m=apple|google, ?t=montant, ?back=retour, ?ok=destination (adresse du prototype « #route?… » ou du
// site), ?ref=commande à confirmer. Carte du téléphone, marchand, livraison de la commande, montant (≈ en euros) ;
// « Confirmer avec Face ID / l'empreinte » : vérification, « Paiement accepté », puis la destination ; « Fermer »
// revient en arrière sans rien débiter.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useContext, useEffect, useMemo, useState } from 'react'
import { Link, UNSAFE_LocationContext, useNavigate, useSearchParams, type Location } from 'react-router-dom'
import { Ecran, FeuillePosee } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { PAGES, adresseDuSite, chemin } from '../../config/pages'
import { source, type Carte, type CommandePassee } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { ECRANS } from '../registre'
import { EURO } from '../CL-12/Diaspora'
import { ActionPartagerPanier } from '../CL-07/Panier'

const versSite = (a: string | null, defaut: string) => (!a ? defaut : a.startsWith('#') ? adresseDuSite(a) : a.startsWith('/') ? a : '/' + a)

export function XpPay() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const lieu = useContext(UNSAFE_LocationContext)
  const dessus = useContext(FeuillePosee)
  const google = params.get('m') === 'google'
  const montant = Number(params.get('t') || 0)
  const retour = versSite(params.get('back'), chemin('paiement-moyen'))
  const ok = versSite(params.get('ok'), chemin('confirmee'))
  const ref = params.get('ref')
  const [carte, setCarte] = useState<Carte | null>(null)
  const [commande, setCommande] = useState<CommandePassee | null>(null)
  const [etape, setEtape] = useState<'feuille' | 'verif' | 'fait'>(params.get('st') === 'fait' ? 'fait' : 'feuille')
  useEffect(() => {
    source.cartes().then((c) => setCarte(c.find((x) => x.parDefaut) ?? c[0] ?? null))
    if (ref) source.commandePassee(ref).then(setCommande)
  }, [ref])
  const confirmer = async () => {
    if (etape !== 'feuille') return
    setEtape('verif')
    await new Promise((r) => setTimeout(r, 900))
    if (ref) await source.confirmerPaiement(ref)
    setEtape('fait')
  }
  // Fermer avant de confirmer : la demande est abandonnée (rien n'est débité, le panier n'a pas été touché).
  const abandonner = () => {
    if (ref && etape === 'feuille') source.annulerPaiement(ref)
  }
  // L'écran de dessous : celui d'où l'on vient, avec son adresse (ses paramètres), sous la feuille du téléphone.
  const dessous = useMemo(() => {
    const u = new URL(retour, 'http://belivay.local')
    const page = PAGES.find((p) => chemin(p.route) === u.pathname)
    const Comp = page && page.route !== 'xp-pay' ? ECRANS[page.route] : undefined
    const location: Location = { pathname: u.pathname, search: u.search, hash: '', state: null, key: 'dessous' }
    return { Comp, location }
  }, [retour])
  const feuille = (
    <>
      <div className="veil" onClick={() => etape === 'feuille' && (abandonner(), naviguer(retour, { replace: true }))}></div>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t(google ? 'Google Pay' : 'Apple Pay')}>
        <div className="grab"></div>
        <Styles id="b472efbe3c" />
        <div className="xp-sheet">
          <i className="cl14-mk"></i>
          <div className="hd">
            <b>
              <Icone nom={google ? 'gpay-g' : 'apple'} taille={24} />
              <span>{t('Pay')}</span>
            </b>
            {etape !== 'verif' && (
              <Link to={etape === 'fait' ? ok : retour} replace className="cl08-x" aria-label={t('Fermer')} onClick={abandonner}>
                <Icone nom="x" taille={22} />
              </Link>
            )}
          </div>
          {etape === 'fait' ? (
            <>
              <div className="xp-fid" style={{ margin: '18px 0 10px' }}>
                <Icone nom="circle-check" taille={54} trait={1.6} />
                <b style={{ fontSize: '18px', color: 'var(--ink)' }}>{t('Paiement accepté')}</b>
                <span>{tf('{m} F · BelivaY', { m: F(montant) })}</span>
              </div>
              <p className="xp-note" style={{ textAlign: 'center' }}>
                {t(commande ? 'Ton reçu t’attend à l’écran suivant, et dans Mes commandes. L’argent reste bloqué jusqu’au retrait.' : 'Ton reçu t’attend à l’écran suivant.')}
              </p>
              <div className="btns mt12">
                <Link to={ok} replace className="btn primary">
                  <Icone nom="arrow-right" taille={18} />
                  <span>{t('Continuer')}</span>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="ln">
                <span>{t('Carte')}</span>
                <span className="cardr">
                  <span className="mini"></span>
                  <b>{carte ? `${carte.marque} ···· ${carte.derniers}` : t('Carte du téléphone')}</b>
                </span>
              </div>
              <div className="ln">
                <span>{t('Marchand')}</span>
                <b>{t('BelivaY · Yaoundé')}</b>
              </div>
              {commande && (
                <>
                  <div className="ln">
                    <span>{t('Commande')}</span>
                    <b>{commande.ref}</b>
                  </div>
                  <div className="ln">
                    <span>{t('Livraison')}</span>
                    <b>{t(commande.lieu)}</b>
                  </div>
                  {commande.frais > 0 && (
                    <div className="ln">
                      <span>{t('Dont frais de service carte (2 %)')}</span>
                      <b>{F(commande.frais)}&nbsp;F</b>
                    </div>
                  )}
                </>
              )}
              <div className="tot">
                <span className="t14 c3">{t('Payer BelivaY')}</span>
                <b>{F(montant)}&nbsp;F</b>
              </div>
              <div className="t12 c3" style={{ textAlign: 'right' }}>
                {tf('≈ {e} €', { e: (montant / EURO).toFixed(2).replace('.', ',') })}
              </div>
              <button type="button" className={'xp-b wide mt14 ' + (google ? 'gpay' : 'apple') + (etape === 'verif' ? ' off' : '')} onClick={confirmer} style={{ border: 0, width: '100%' }}>
                <Icone nom={google ? 'fingerprint' : 'scan-face'} taille={22} />
                <span style={{ fontSize: '16px', marginLeft: '6px' }}>{t(etape === 'verif' ? 'Vérification…' : google ? 'Confirmer avec ton empreinte' : 'Confirmer avec Face ID')}</span>
              </button>
              <p className="xp-note" style={{ textAlign: 'center' }}>
                {t('L’argent reste bloqué chez BelivaY jusqu’au retrait. 3-D Secure seulement si ta banque le demande.')}
              </p>
              <p className="xp-note" style={{ textAlign: 'center' }}>
                {t(commande ? 'Tu changes d’avis ? Ferme : rien n’est débité et ton panier reste intact.' : 'Tu changes d’avis ? Ferme : rien n’est débité.')}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
  const Dessous = dessous.Comp
  if (!Dessous)
    return (
      <Ecran route="xp-pay" fixes={feuille} action={<ActionPartagerPanier />}>
        <div style={{ minHeight: 300 }} />
      </Ecran>
    )
  return (
    <FeuillePosee.Provider value={{ fixes: <>{dessus?.fixes}{feuille}</>, classes: ['fixed', ...(dessus?.classes ?? [])] }}>
      <UNSAFE_LocationContext.Provider value={{ ...lieu, location: dessous.location }}>
        <Dessous />
      </UNSAFE_LocationContext.Provider>
    </FeuillePosee.Provider>
  )
}
