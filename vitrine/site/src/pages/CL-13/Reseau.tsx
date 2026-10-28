// Écran « Connexion et données » (CL-13), forme d'origine du prototype rendue réelle (DP-54) : l'état du réseau en direct (en
// ligne ou non, type de connexion du téléphone) ; « Données économes » (les images attendent un toucher ; par
// défaut, le réglage d'économie du téléphone) ; ce qui marche sans réseau et ce qui en demande (l'argent) ; les
// codes de retrait déjà affichés, gardés sur le téléphone ; la place prise ; le SMS de retrait en secours.
// États d'origine rendus réels : connexion lente (bandeau, lien vers les données économes) ; hors ligne (bandeau,
// tes commandes telles qu'à la dernière lecture, avec leur code, leur suivi ou leur dossier ; ton panier gardé,
// le paiement attend le réseau) ; le code gardé et le comptoir hors ligne vivent sur l'écran du code (CL-09).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { calculer } from '../../donnees/frais'
import { source, type CommandeClient, type DonneesPanier } from '../../donnees/source'
import { heureSeule } from '../../i18n/dates'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { enCours, etapeDe, etatDe } from '../CL-09/Commun'
import { Bloc, EcranCompte } from './Larges'

type Connexion = { effectiveType?: string; downlink?: number; saveData?: boolean; addEventListener?: (e: string, f: () => void) => void; removeEventListener?: (e: string, f: () => void) => void }
const cnx = () => (navigator as Navigator & { connection?: Connexion }).connection

function useReseau() {
  const lire = () => ({ enLigne: navigator.onLine, type: cnx()?.effectiveType ?? null, debit: cnx()?.downlink ?? null })
  const [r, setR] = useState(lire)
  useEffect(() => {
    const maj = () => setR(lire())
    window.addEventListener('online', maj)
    window.addEventListener('offline', maj)
    cnx()?.addEventListener?.('change', maj)
    return () => {
      window.removeEventListener('online', maj)
      window.removeEventListener('offline', maj)
      cnx()?.removeEventListener?.('change', maj)
    }
  }, [])
  return r
}

function place(): number {
  try {
    let n = 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!
      n += k.length + (localStorage.getItem(k)?.length ?? 0)
    }
    return Math.round((n * 2) / 1024)
  } catch {
    return 0
  }
}

export function Reseau() {
  const { t, tf, langue, donneesEconomes, setDonneesEconomes } = usePreferences()
  const r = useReseau()
  const naviguer = useNavigate()
  const [commandes, setCommandes] = useState<{ liste: CommandeClient[]; lue: number } | null>(null)
  const [panier, setPanier] = useState<DonneesPanier | null>(null)
  useEffect(() => {
    source.commandes().then((d) => setCommandes({ liste: d.commandes, lue: d.maintenant }))
    source.panier().then(setPanier)
  }, [])
  const codes = (commandes?.liste ?? []).filter((c) => c.etat === 'retirable' && c.code)
  const lent = r.type === 'slow-2g' || r.type === '2g'
  const enAttente = (commandes?.liste ?? []).filter(enCours)

  // Panier gardé sur le téléphone (état « argent » du prototype) : mêmes frais que le panier.
  const lignes = panier?.lignes ?? []
  const frais = panier
    ? calculer(
        'relais',
        [...new Set(lignes.map((l) => l.boutique))].map((b) => ({
          boutique: b,
          zone: panier.boutiques[b]?.zone ?? '',
          articles: lignes.filter((l) => l.boutique === b).map((l) => ({ prix: l.prix, quantite: l.qte, classe: l.classe })),
        })),
      )
    : null
  const nb = lignes.reduce((n, l) => n + l.qte, 0)
  const nbColis = new Set(lignes.map((l) => l.boutique)).size

  return (
    <EcranCompte route="reseau">
      {/* Hors ligne : le bandeau « Hors ligne » de la coque est déjà en haut de l'écran. */}
      {r.enLigne && lent ? (
        <div className="offline-banner" role="status">
          <Icone nom="signal-low" taille={18} />
          <span>
            <b>{t('Connexion lente')}</b>
            {t(' : le texte d’abord, les photos suivent. ')}
            {!donneesEconomes && (
              <a href={chemin('reseau')} style={{ textDecoration: 'underline', fontWeight: '800' }} onClick={(e) => (e.preventDefault(), setDonneesEconomes(true))}>
                {t('Données économes')}
              </a>
            )}
          </span>
        </div>
      ) : null}
      {!r.enLigne && enAttente.length > 0 && (
        <>
          <div className="pg">
            <h1 className="pg-t">{t('Mes commandes')}</h1>
          </div>
          {commandes && (
            <div className="hint-l" style={{ marginTop: 0 }}>
              <Icone nom="wifi-off" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{tf('Tes commandes telles qu’à {h}.', { h: heureSeule(commandes.lue, langue) })}</span>
            </div>
          )}
          {enAttente.map((c) => {
            const e = etatDe(c)
            const colis = c.colis.filter((x) => !x.annule)
            const etape = etapeDe(c)
            return (
              <div key={c.ref} className="card">
                <div className="oc">
                  <span className="thumb" style={{ width: '64px', height: '64px', borderRadius: '16px' }}>
                    {colis[0] && <Dessin id={colis[0].dessin} />}
                  </span>
                  <div className="grow">
                    <div className={'ost ' + (e.ton === 'ok' ? 'acc' : 'neu')}>{e.v ? tf(e.texte, e.v) : t(e.texte)}</div>
                    <div className="od">
                      {tf('{n} colis au ', { n: colis.length })}
                      <span className="nw">{t(c.lieu)}</span>
                      {c.garde?.du ? tf(' · dû {m} F aujourd’hui', { m: F(c.garde.du) }) : ''}
                    </div>
                    {c.etat !== 'litige' && (
                      <div className="gauge">
                        {[0, 1, 2, 3].map((i) => (
                          <i key={i} className={(i <= etape ? 'on' : '') + (i === etape ? ' cur' : '')}></i>
                        ))}
                      </div>
                    )}
                    <div className="onum">{c.ref}</div>
                  </div>
                </div>
                <div className="btns">
                  {c.etat === 'retirable' && c.code ? (
                    <Link to={chemin('code', { ref: c.ref })} className="btn primary">
                      <Icone nom="qr-code" taille={18} />
                      <span>{t('Afficher mon code')}</span>
                    </Link>
                  ) : c.etat === 'litige' && c.litige ? (
                    <Link to={chemin('litige-suivi', { id: c.litige })} className="btn secondary">
                      <span>{t('Voir le dossier')}</span>
                    </Link>
                  ) : (
                    <Link to={chemin('suivi', { ref: c.ref })} className="btn secondary">
                      <span>{t('Suivre ma commande')}</span>
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
          <div className="lock-row" style={{ justifyContent: 'center' }}>
            <Icone nom="lock" taille={15} />
            <span>{t('Payer, annuler et contester attendent le réseau.')}</span>
          </div>
        </>
      )}
      {!r.enLigne && lignes.length > 0 && frais && (
        <>
          <div className="pg">
            <h1 className="pg-t">{tf('Mon panier · {n} articles', { n: nb })}</h1>
          </div>
          <div className="card ">
            {lignes.map((l) => (
              <div key={l.id} className="cl">
                <span className="thumb" style={{ width: '52px', height: '52px', borderRadius: '13px' }}>
                  <Dessin id={l.dessin} />
                </span>
                <div className="grow">
                  <div className="cn">{t(l.titre)}</div>
                  <div className="cv">{l.variante ? t(l.variante) : ''}</div>
                </div>
                <span className="price">
                  {F(l.prix * l.qte)}
                  <small>{t(' F')}</small>
                </span>
              </div>
            ))}
          </div>
          <div className="card recap">
            <div className="kv">
              <span className="k">{t('Articles')}</span>
              <span className="v ">{F(frais.sousTotal) + '\u00A0F'}</span>
            </div>
            <div className="kv">
              <span className="k">{tf('Livraison · {n} colis', { n: nbColis })}</span>
              <span className="v ">{F(frais.total - frais.sousTotal) + '\u00A0F'}</span>
            </div>
            <div className="total">
              <span className="tl2">{t('Total')}</span>
              <span className="price big">
                {F(frais.total)}
                <small>{t(' F')}</small>
              </span>
            </div>
          </div>
          <div className="btns mt16">
            <button type="button" className={'btn primary' + (r.enLigne ? '' : ' off')} disabled={!r.enLigne} onClick={() => naviguer(chemin('panier'))}>
              <Icone nom="lock" taille={18} />
              <span>{tf('Passer commande · {m} F', { m: F(frais.total) })}</span>
            </button>
          </div>
          <div className="lock-row" style={{ justifyContent: 'center' }}>
            <Icone nom="wifi-off" taille={15} />
            <span>{t('Il faut du réseau pour payer. Le bouton revient avec la connexion.')}</span>
          </div>
          <div className="note ink">
            <Icone nom="lock" taille={18} />
            <div>
              {t('Même règle pour ')}
              <b>{t('annuler une boutique')}</b>
              {t(' ou ')}
              <b>{t('signaler un problème')}</b>
              {t(' : ces gestes touchent ton argent, ils attendent le réseau.')}
            </div>
          </div>
        </>
      )}
      <Bloc classe="c13-g2">
      <Bloc classe="c13-k">
      <p className="cl13-intro">{t('En 2G ou sans réseau, l’application reste utilisable.')}</p>
      {r.enLigne && !lent && (
        <div className="note green" role="status">
          <Icone nom="wifi" taille={18} />
          <div>
            {t('En ligne.')}
            {r.type && ' ' + tf('Réseau du téléphone : {t}{d}.', { t: r.type.toUpperCase(), d: r.debit ? tf(', environ {n} Mb/s', { n: String(r.debit).replace('.', ',') }) : '' })}
          </div>
        </div>
      )}
      <div className="card ">
        <div className="row">
          <span className="ic-sq">
            <Icone nom="image-off" taille={20} />
          </span>
          <span className="grow">
            <b className="t15 b8" style={{ display: 'block' }}>
              {t('Données économes')}
            </b>
            <span className="t13 c3">{t('Des vignettes à la place des photos : les images ne se chargent qu’au toucher. Le texte, les prix et tes commandes restent complets.')}</span>
          </span>
          <button type="button" className={'tg' + (donneesEconomes ? ' on' : '')} role="switch" aria-checked={donneesEconomes} aria-label={t('Données économes')} onClick={() => setDonneesEconomes(!donneesEconomes)}></button>
        </div>
        {donneesEconomes && (
          <div className="links" style={{ justifyContent: 'flex-start', marginTop: '6px' }}>
            <Link to={chemin('accueil')}>
              {t('Voir l’accueil en données économes')}
              <Icone nom="chevron-right" taille={15} />
            </Link>
          </div>
        )}
      </div>
      </Bloc>
      <Bloc classe="c13-k">
      <div className="kick cl13-gk">{t('Sans réseau, tu peux encore')}</div>
      <div className="card ">
        {['Voir tes commandes, telles qu’à ta dernière connexion', 'Afficher un code de retrait déjà affiché une fois', 'Retrouver ton panier, gardé sur ton téléphone'].map((x) => (
          <div key={x} className="cl13-nl">
            <Icone nom="check" taille={17} trait={2.6} style={{ color: 'var(--green)' }} />
            <span>{t(x)}</span>
          </div>
        ))}
      </div>
      {codes.length > 0 && (
        <div className="card tight">
          {codes.map((c) => (
            <Link key={c.ref} to={chemin('code', { ref: c.ref })} className="li">
              <span className="ic">
                <Icone nom="qr-code" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {tf('Code de retrait · {ref}', { ref: c.ref })}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Gardé sur ton téléphone : il s’affiche même sans réseau')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          ))}
        </div>
      )}
      <div className="kick cl13-gk">{t('Il faut du réseau pour')}</div>
      <div className="card ">
        <div className="cl13-nl">
          <Icone nom="lock" taille={17} style={{ color: 'var(--ink-3)' }} />
          <span>{t('Payer, annuler une boutique, signaler un problème : ces gestes touchent ton argent')}</span>
        </div>
      </div>
      <div className="card">
        <div className="kv">
          <span className="k">{t('Gardé sur ce téléphone')}</span>
          <span className="v">{tf('{n} Ko', { n: place() })}</span>
        </div>
        <p className="t12 c3">{t('Ton panier, tes réglages et ce qui sert sans réseau. Rien de tout cela ne quitte le téléphone.')}</p>
      </div>
      </Bloc>
      </Bloc>
      <div className="note ink">
        <Icone nom="message-circle" taille={18} />
        <div>
          {t('L’application ne répond pas ? Le ')}
          <b>{t('SMS de retrait')}</b>
          {t(' t’apporte ton code et le lien du QR.')} <Link to={chemin('sms')}>{t('Voir les SMS')}</Link>
        </div>
      </div>
      {/* DP-54 : où régler le secours par SMS, et à qui demander de l'aide quand le réseau manque. */}
      <div className="card tight mt12">
        <Link to={chemin('notifs-reglages')} className="li">
          <span className="ic">
            <Icone nom="bell" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Messages de secours par SMS')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Quand l’application est fermée : arrivée du colis, code, incident')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        <Link to={chemin('reglages')} className="li">
          <span className="ic">
            <Icone nom="settings" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Réglages')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Langue, thème, taille du texte, données')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        <Link to={chemin('aide')} className="li">
          <span className="ic">
            <Icone nom="life-buoy" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Un souci de connexion')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Questions fréquentes, WhatsApp, rappel')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
      </div>
    </EcranCompte>
  )
}
