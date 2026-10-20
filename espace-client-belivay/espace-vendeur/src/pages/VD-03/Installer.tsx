// Installer l'application (VD-03 ; INS-01 à 03, VD03-R16 ; DP-56 Q-50) : l'espace vendeur est une application web
// installable, servie sous belivay.com/vendeur/. L'onglet du système du téléphone est choisi d'office (iPhone ou
// Android) ; sur Android, l'invite du navigateur (beforeinstallprompt) devient le bouton plein « Installer
// l'application » quand le navigateur le permet, sinon les trois étapes suffisent. Déjà installée (ouverte depuis
// l'écran d'accueil) : on le dit. L'adresse se copie ou se partage (un membre de l'équipe, un autre téléphone).
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import icone from '../../assets/prototype/0718fddbf299.png'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Comment } from './commun'

interface InviteInstallation extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
type FenetreInvite = Window & { __blvInvite?: InviteInstallation | null }

const ADRESSE = () => `${location.host}${import.meta.env.BASE_URL.replace(/\/$/, '')}`
const installee = () => (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) || (navigator as Navigator & { standalone?: boolean }).standalone === true

export default function Installer() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const s = useSession()
  const os = params.get('os') === 'and' ? 'and' : params.get('os') === 'ios' ? 'ios' : /Android/i.test(navigator.userAgent) ? 'and' : 'ios'
  const [invite, setInvite] = useState<InviteInstallation | null>(() => (window as FenetreInvite).__blvInvite ?? null)
  const [fait, setFait] = useState(installee)
  const [copie, setCopie] = useState(false)
  useEffect(() => {
    const garder = (e: Event) => {
      e.preventDefault()
      setInvite(e as InviteInstallation)
    }
    const installe = () => (setFait(true), setInvite(null))
    window.addEventListener('beforeinstallprompt', garder)
    window.addEventListener('appinstalled', installe)
    return () => (window.removeEventListener('beforeinstallprompt', garder), window.removeEventListener('appinstalled', installe))
  }, [])
  const installer = async () => {
    if (!invite) return
    await invite.prompt()
    const r = await invite.userChoice
    if (r.outcome === 'accepted') {
      setFait(true)
      jouer('fin')
    }
    setInvite(null)
    ;(window as FenetreInvite).__blvInvite = null
  }
  const adresse = ADRESSE()
  const partager = async () => {
    const url = `${location.protocol}//${adresse}/`
    try {
      if (navigator.share) await navigator.share({ title: 'BelivaY Vendeur', url })
      else {
        await navigator.clipboard.writeText(url)
        setCopie(true)
        jouer('copie')
      }
    } catch {
      /* partage annulé */
    }
  }
  const etapes =
    os === 'ios'
      ? [
          ['globe', tf('Ouvrez {a} dans Safari', { a: adresse }), 'Connecté à votre compte vendeur'],
          ['share', 'Touchez Partager', 'En bas de l’écran'],
          ['square-plus', '« Sur l’écran d’accueil »', 'Puis « Ajouter »'],
        ]
      : [
          ['globe', tf('Ouvrez {a} dans Chrome', { a: adresse }), 'Connecté à votre compte vendeur'],
          ['ellipsis-vertical', 'Touchez le menu ⋮', 'En haut à droite'],
          ['download', '« Installer l’application »', 'Puis « Installer »'],
        ]
  return (
    <Ecran route="installer" retour={s.connecte ? chemin('parametres') : chemin('connexion')}>
      <div className="pg">
        <h1 className="pg-t">{t('Installer l’application')}</h1>
        <p className="pg-s">{t('Une icône sur votre écran d’accueil : l’espace vendeur s’ouvre d’un geste.')}</p>
      </div>
      <div className="seg" role="tablist">
        <Link to={chemin('installer', { os: 'ios' })} replace role="tab" aria-selected={os === 'ios'} style={{ height: '44px' }} className={os === 'ios' ? 'on' : ''}>
          {t('iPhone')}
        </Link>
        <Link to={chemin('installer', { os: 'and' })} replace role="tab" aria-selected={os === 'and'} style={{ height: '44px' }} className={os === 'and' ? 'on' : ''}>
          {t('Android')}
        </Link>
      </div>
      <div className="hero night row" style={{ padding: '14px 16px', gap: '14px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', boxShadow: '0 8px 18px -10px rgba(0,0,0,.6)' }}>
          <img src={icone} alt="" style={{ width: '40px' }} />
        </div>
        <div className="grow">
          <div className="b8 t17">{t('BelivaY Vendeur')}</div>
          <div className="t13 mt4" style={{ color: 'rgba(255,255,255,.75)' }}>
            {adresse}
          </div>
        </div>
      </div>
      {fait ? (
        <div className="note green blv-succes" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>
            <b>{t('L’application est installée.')}</b> {t('Elle s’ouvre sur votre accueil et garde votre session.')}
          </div>
        </div>
      ) : (
        os === 'and' &&
        invite && (
          <>
            <div className="mt16">
              <button type="button" className="btn primary" onClick={() => void installer()}>
                <Icone nom="download" taille={18} />
                <span>{t('Installer l’application')}</span>
              </button>
            </div>
            <div className="hint-l">
              <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t('Ce bouton apparaît seulement si Chrome le permet.')}</span>
            </div>
          </>
        )
      )}
      <div className="divider-t">{t(os === 'and' && invite && !fait ? 'Sinon, en trois étapes' : 'En trois étapes')}</div>
      <div className="card tight" style={{ marginTop: '0' }}>
        {etapes.map(([ic, titre, sous], i) => (
          <div key={ic} className="li">
            <span className="ic or" style={{ borderRadius: '50%' }}>
              <b>{t(String(i + 1))}</b>
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(titre)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t(sous)}
              </span>
            </span>
            <span style={{ color: 'var(--or-txt)' }}>
              <Icone nom={ic} taille={22} />
            </span>
          </div>
        ))}
      </div>
      <div className="btns mt12">
        <button type="button" className="btn secondary" onClick={() => void partager()}>
          <Icone nom={copie ? 'check' : 'share'} taille={18} />
          <span>{t(copie ? 'Adresse copiée' : 'Partager l’adresse')}</span>
        </button>
      </div>
      <Comment titre="Pourquoi ?">
        {(
          [
            ['zap', 'Plus rapide', 'Elle s’ouvre directement sur votre accueil'],
            ['wifi-off', 'Marche hors connexion', 'Commandes et code de remise lisibles sans réseau'],
            ['bell', 'Notifications', 'Une commande à préparer ne vous échappe plus'],
          ] as const
        ).map(([ic, titre, sous]) => (
          <div key={ic} className="li">
            <span className="ic or">
              <Icone nom={ic} taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(titre)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t(sous)}
              </span>
            </span>
          </div>
        ))}
      </Comment>
    </Ecran>
  )
}
