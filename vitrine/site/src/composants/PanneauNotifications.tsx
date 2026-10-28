// Panneau des notifications (dès 768 px, DISPOSITION-ECRANS.md § 3.8) : la cloche de l'en-tête de site l'ouvre
// (?pop=notifs), déroulant de 380 px ancré sous la cloche comme le menu du profil. En tête « Notifications » et
// « Tout marquer comme lu » ; les 6 dernières, avec la ligne de l'écran Notifications (LigneNotification) ; ouvrir
// une ligne la marque lue et mène au bon écran ; en bas « Voir toutes les notifications » et « Régler ».
// Sur téléphone, la cloche reste un lien vers la page. Aucune ligne ne montre de code de retrait.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { chemin } from '../config/pages'
import { source, type NotificationClient } from '../donnees/source'
import { grouperNotifications, LigneNotification } from '../pages/CL-10/LigneNotification'
import { usePreferences } from '../preferences'
import { useMajSession } from '../session'
import { oublierGarde } from './donneesCoque'
import { Icone } from './Icone'

const NOMBRE = 6

// Fermeture d'un déroulant ouvert par l'adresse (?pop=…) : le paramètre est retiré, sans nouvelle entrée.
export function useFermerPop() {
  const lieu = useLocation()
  const naviguer = useNavigate()
  return () => {
    const p = new URLSearchParams(lieu.search)
    p.delete('pop')
    naviguer({ pathname: lieu.pathname, search: p.toString() }, { replace: true })
  }
}

// Clavier d'un déroulant (rôle menu) : focus sur la première entrée à l'ouverture, flèches haut et bas d'une entrée
// à l'autre, Tab qui circule dans le menu, Échap qui ferme et rend le focus au bouton qui l'a ouvert.
export function useDeroulant(fermer: () => void, declencheur: string, actif = true) {
  const boite = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!actif) return
    const premier = boite.current?.querySelector<HTMLElement>('[role=menuitem], a[href], button')
    premier?.focus({ preventScroll: true })
    const echap = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      fermer()
      document.querySelector<HTMLElement>(declencheur)?.focus()
    }
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
    // À l'ouverture seulement (ou quand le menu devient actif : données arrivées, palier atteint).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actif])
  const clavier = (e: KeyboardEvent<HTMLElement>) => {
    if (!actif) return
    const liens = [...(boite.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])]
    if (!liens.length) return
    const i = liens.indexOf(document.activeElement as HTMLElement)
    let j = -1
    if (e.key === 'ArrowDown') j = (i + 1) % liens.length
    else if (e.key === 'ArrowUp') j = (i - 1 + liens.length) % liens.length
    else if (e.key === 'Tab') j = e.shiftKey ? (i <= 0 ? liens.length - 1 : -1) : i === liens.length - 1 ? 0 : -1
    if (j < 0) return
    e.preventDefault()
    liens[j].focus()
  }
  return { boite, clavier }
}

export function PanneauNotifications() {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const majSession = useMajSession()
  const fermer = useFermerPop()
  const [d, setD] = useState<{ notifications: NotificationClient[] } | null>(null)
  const [deplie, setDeplie] = useState<string | null>(null)
  const { boite, clavier } = useDeroulant(fermer, '.hs-cloche')
  const charger = () => source.notificationsClient().then(setD)
  useEffect(() => {
    charger()
  }, [])
  const ouvrir = async (g: NotificationClient[]) => {
    for (const x of g) await source.lireNotification(x.id)
    oublierGarde('menu')
    majSession(await source.session())
    naviguer(g[0].lien)
  }
  const toutLire = async () => {
    await source.lireNotification('toutes')
    oublierGarde('menu')
    majSession(await source.session())
    charger()
  }
  const groupes = d ? grouperNotifications(d.notifications).slice(0, NOMBRE) : []
  const nonLues = d ? d.notifications.filter((n) => !n.lu).length : 0
  return (
    <>
      <div className="pop-voile" onClick={fermer}></div>
      <div className="pop-pan pop-notifs" role="dialog" aria-label={t('Notifications')} ref={boite} onKeyDown={clavier}>
        <div className="pop-hd">
          <b>{t('Notifications')}</b>
          {nonLues > 0 && <span className="pill or">{tf(nonLues > 1 ? '{n} non lues' : '{n} non lue', { n: nonLues })}</span>}
          <span className="grow" />
          {nonLues > 0 && (
            <button type="button" className="btn ghost sm" onClick={toutLire}>
              <Icone nom="check" taille={16} />
              <span>{t('Tout marquer comme lu')}</span>
            </button>
          )}
        </div>
        <div className="pop-ls">
          {d && !groupes.length && <p className="pop-vide">{t('Rien de nouveau')}</p>}
          {groupes.map((g) => (
            <LigneNotification key={g[0].id} groupe={g} ouvert={deplie === g[0].id} ouvrir={ouvrir} deplier={setDeplie} />
          ))}
        </div>
        <div className="pop-bas">
          <Link to={chemin('notifications')}>{t('Voir toutes les notifications')}</Link>
          <Link to={chemin('notifs-reglages', { from: 'notifications' })}>
            <Icone nom="settings" taille={16} />
            {t('Régler')}
          </Link>
        </div>
      </div>
    </>
  )
}
