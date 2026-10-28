// Installation de l'application (PWA-01 à 03, ARL-24). Le navigateur annonce « beforeinstallprompt » une fois, tôt :
// ce module l'écoute dès qu'il est chargé et garde l'événement pour le bouton « Installer » (Android, Chrome).
// Importé par main.tsx pour l'écouter dès le démarrage ; si l'invite n'a pas été gardée, l'écran donne le chemin du
// menu de Chrome.
import { useEffect, useState } from 'react'

interface InviteInstallation extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let invite: InviteInstallation | null = null
let installee = false
const ecouteurs = new Set<() => void>()
const prevenir = () => ecouteurs.forEach((f) => f())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    invite = e as InviteInstallation
    prevenir()
  })
  window.addEventListener('appinstalled', () => {
    installee = true
    invite = null
    prevenir()
  })
}

export type Plateforme = 'ios' | 'android'

/** iPhone, iPad (Safari, même déguisé en Mac) ; sinon Android et ordinateurs (Chrome, Edge). */
export function plateforme(): Plateforme {
  if (typeof navigator === 'undefined') return 'android'
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return ios ? 'ios' : 'android'
}

/** L'application s'ouvre-t-elle déjà depuis l'écran d'accueil ? */
export function dejaInstallee(): boolean {
  if (installee) return true
  try {
    return matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}

export function useInstallation() {
  const [, rafraichir] = useState(0)
  useEffect(() => {
    const f = () => rafraichir((n) => n + 1)
    ecouteurs.add(f)
    return () => void ecouteurs.delete(f)
  }, [])
  return {
    possible: !!invite,
    installee: dejaInstallee(),
    /** Ouvre l'invite du navigateur ; « acceptee », « refusee », ou « indisponible » sans invite gardée. */
    async installer(): Promise<'acceptee' | 'refusee' | 'indisponible'> {
      if (!invite) return 'indisponible'
      const i = invite
      await i.prompt()
      const choix = await i.userChoice
      invite = null
      if (choix.outcome === 'accepted') installee = true
      prevenir()
      return choix.outcome === 'accepted' ? 'acceptee' : 'refusee'
    },
  }
}
