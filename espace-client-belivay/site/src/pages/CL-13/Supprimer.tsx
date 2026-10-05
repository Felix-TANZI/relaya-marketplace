// Écran « Supprimer mon compte » (CL-13, 9.5), balisage et logique du prototype du 1er octobre (route supprimer),
// repris à la main et rendu logique (DP-53) :
// - refusé tant qu'une commande ou un litige est en cours (liste lue dans les données), ou qu'il reste de l'argent
//   sur le portefeuille (DP-06 : il est au client, il le retire d'abord) ;
// - sinon : ce qui est effacé, ce qui est gardé (factures, journal des paiements), puis un code par SMS au numéro
//   du compte ; le compte est supprimé et l'appareil revient en visiteur ;
// - « ?st=possible » montre l'écran du prototype quand plus rien n'est en cours (démonstration).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { SaisieCode, useEnvoiCode } from '../../composants/SaisieCode'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type DonneesSuppression, type EnvoiCode } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { EcranCompte } from './Larges'

// « 4 commandes sont en cours, dont une en litige. »
function phraseEnCours(n: number, l: number): string {
  const debut = n === 1 ? 'Une commande est en cours' : '{n} commandes sont en cours'
  const litige = !l ? '' : l === 1 ? (n === 1 ? ', en litige' : ', dont une en litige') : ', dont {l} en litige'
  return debut + litige + '. Ton compte garde ton code, ton argent et tes remboursements jusqu’au bout.'
}

function Refus({ d }: { d: DonneesSuppression }) {
  const { t, tf } = usePreferences()
  const n = d.enCours.length
  const l = d.enCours.filter((c) => c.litige).length
  return (
    <>
      <div className="card">
        <div className="row">
          <span className="ic-sq">
            <Icone nom="lock" taille={22} />
          </span>
          <span className="grow">
            <b className="t17 b8" style={{ display: 'block' }}>
              {t('Pas possible pour l’instant')}
            </b>
            <span className="t13 c3">
              {n
                ? tf(phraseEnCours(n, l), { n, l })
                : tf('Il reste {solde} sur ton portefeuille. Retire-le d’abord vers Mobile Money : il est à toi.', { solde: F(d.solde) + ' F' })}
            </span>
          </span>
        </div>
      </div>
      <div className="card tight">
        {d.enCours.map((c) => (
          <Link key={c.ref} to={chemin('commande', { ref: c.ref })} className="li">
            <span className="thumb" style={{ width: '44px', height: '44px', borderRadius: '11px' }}>
              <Dessin id={c.dessin} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(c.libelle)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {c.ref}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        ))}
        {d.solde > 0 && (
          <Link to={chemin('wallet', { st: 'retirer' })} className="li">
            <span className="ic or">
              <Icone nom="wallet" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {tf('Ton portefeuille : {solde}', { solde: F(d.solde) + ' F' })}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Retire-le vers Mobile Money avant de partir.')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        )}
      </div>
      <div className="btns mt16">
        <Link to={chemin(n ? 'commandes' : 'wallet', n ? undefined : { st: 'retirer' })} className="btn primary">
          <Icone nom={n ? 'package' : 'wallet'} taille={18} />
          <span>{t(n ? 'Voir mes commandes' : 'Retirer mon solde')}</span>
        </Link>
      </div>
      <div className="btns">
        <button type="button" className="btn danger off" aria-disabled="true">
          <Icone nom="trash-2" taille={18} />
          <span>{t('Supprimer mon compte')}</span>
        </button>
      </div>
      <div className="lock-row" style={{ justifyContent: 'center' }}>
        <Icone nom="lock" taille={15} />
        <span>{t(n ? 'Possible quand plus rien n’est en cours : colis retirés, litige clos.' : 'Possible quand ton portefeuille est vide.')}</span>
      </div>
    </>
  )
}

function Possible({ d, demander }: { d: DonneesSuppression; demander: () => void }) {
  const { t, tf } = usePreferences()
  const p = d.perdu
  // DP-54 : tout ce qui part avec le compte, lu dans les données (boutique, abonnement, proches, favoris, cagnotte).
  const efface: string[] = [
    t('Ton profil : nom, photo, e-mail ; ton numéro est libéré'),
    t('Tes adresses et tes moyens de paiement'),
    p.favoris ? tf('Tes sauvegardés ({n}) et tes réglages', { n: p.favoris }) : t('Tes sauvegardés et tes réglages'),
    t('Tes conversations avec le support'),
    ...(p.proches ? [tf('Tes liens avec tes proches ({n}) : ils sont prévenus', { n: p.proches })] : []),
    ...(p.boutique ? [tf('Ta boutique « {b} » et ses produits', { b: p.boutique })] : []),
    ...(p.abonnement ? [t('Ton abonnement : il s’arrête, plus aucun prélèvement')] : []),
    ...(p.cagnotte ? [tf('Ta cagnotte en attente ({m} F) : elle n’est plus versée', { m: F(p.cagnotte) })] : []),
  ]
  return (
    <>
      <div className="pg">
        <h1 className="pg-t">{t('Supprimer ton compte ?')}</h1>
        <p className="pg-s">{t('Aucune commande ni aucun litige en cours : tu peux le supprimer.')}</p>
      </div>
      <div className="card">
        <h3>{t('Ce qui est effacé')}</h3>
        <div className="mt8">
          {efface.map((x) => (
            <div key={x} className="hint-l">
              <Icone nom="trash-2" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{x}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>{t('Ce qui est gardé')}</h3>
        <p className="t13 c2" style={{ margin: '8px 0 0', lineHeight: '1.5' }}>
          {tf('Les factures et le journal des paiements, {n} ans : la durée légale des pièces comptables. Ils ne servent à rien d’autre et ne sont plus dans l’application.', { n: d.gardeAns })}
        </p>
        <div className="hint-l">
          <Icone nom="download" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Télécharge tes factures avant : elles ne seront plus dans l’application.')}</span>
        </div>
        <div className="links" style={{ justifyContent: 'flex-start' }}>
          <Link to={chemin('factures')}>{t('Voir mes factures')}</Link>
        </div>
      </div>
      <div className="note red">
        <Icone nom="triangle-alert" taille={18} />
        <div>{t('C’est définitif : un compte supprimé ne se récupère pas. Tu pourras en ouvrir un nouveau plus tard, vide.')}</div>
      </div>
      <details className="more">
        <summary>
          <Icone nom="lightbulb" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Plutôt faire une pause ?')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <div className="links" style={{ justifyContent: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <Link to={chemin('notifs-reglages')}>{t('Couper les notifications')}</Link>
            <Link to={chemin('confidentialite')}>{t('Télécharger mes données')}</Link>
            <Link to={chemin('fil', { id: 'support', st: 'nouveau' })}>{t('Dire ce qui ne va pas au support')}</Link>
          </div>
        </div>
      </details>
      <div className="note ink">
        <Icone nom="message-circle" taille={18} />
        <div>
          {t('Pour confirmer, on envoie un code au ')}
          <span className="nw">{t(d.numero)}</span>
          {t('.')}
        </div>
      </div>
      <div className="btns mt16">
        <button type="button" className="btn danger" onClick={demander}>
          <Icone nom="trash-2" taille={18} />
          <span>{t('Recevoir le code et supprimer')}</span>
        </button>
      </div>
      <div className="btns">
        <Link to={chemin('compte')} className="btn secondary">
          <span>{t('Garder mon compte')}</span>
        </Link>
      </div>
    </>
  )
}

export function Supprimer() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [d, setD] = useState<DonneesSuppression | null>(null)
  const [envoi, setEnvoi] = useState<EnvoiCode | null>(null)
  const [fait, setFait] = useState(false)
  const envoyerCode = useEnvoiCode()
  useEffect(() => {
    source.suppression().then(setD)
  }, [])
  if (!d) return null
  const permis = !d.enCours.length && d.solde <= 0
  const possible = params.get('st') === 'possible' || permis
  // En démonstration (« ?st=possible » avec des commandes en cours), le serveur refuserait : l'écran du refus revient.
  const demander = async () => {
    if (!permis) return naviguer(chemin('supprimer'), { replace: true })
    const e = await envoyerCode('suppression', () => source.envoyerCode('suppression'))
    if (e) setEnvoi(e)
  }

  // Compte supprimé : l'appareil revient en visiteur (rechargement complet, comme la déconnexion).
  if (fait)
    return (
      <EcranCompte colonne={640} route="supprimer" parEtat etat="supprimer?st=possible">
        <div className="card">
          <div className="empty">
            <div className="ei" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
              <Icone nom="circle-check" taille={26} />
            </div>
            <h3>{t('Ton compte est supprimé')}</h3>
            <p>{tf('Tes données sont effacées. Les factures et le journal des paiements restent gardés {n} ans, comme la loi le demande.', { n: d.gardeAns })}</p>
            <div className="btns">
              <button type="button" className="btn primary" onClick={() => window.location.assign('/')}>
                <span>{t('Revenir à l’accueil')}</span>
              </button>
            </div>
          </div>
        </div>
      </EcranCompte>
    )

  if (envoi)
    return (
      <EcranCompte colonne={640} route="supprimer" parEtat etat="supprimer?st=possible">
        <Styles id="f16ded0d4c" />
        <Styles id="1c3d953197" />
        <div className="pg">
          <SaisieCode
            titre="Entre le code reçu par SMS"
            envoi={envoi}
            modifier={
              <a
                href={chemin('supprimer')}
                className="cl03-link"
                onClick={(e) => {
                  e.preventDefault()
                  setEnvoi(null)
                }}
              >
                {t('Garder mon compte')}
              </a>
            }
            bouton="Supprimer mon compte"
            valider={(code) => source.supprimerCompte(code)}
            renvoyer={() => source.envoyerCode('suppression')}
            reussi={() => setFait(true)}
          />
          <div className="hint-l">
            <Icone nom="shield-check" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{t('Ce code prouve que c’est bien toi : sans lui, ton compte reste ouvert.')}</span>
          </div>
        </div>
      </EcranCompte>
    )

  return (
    <EcranCompte colonne={640} route="supprimer" parEtat etat={possible ? 'supprimer?st=possible' : 'supprimer'}>
      {possible ? <Possible d={d} demander={demander} /> : <Refus d={d} />}
    </EcranCompte>
  )
}
