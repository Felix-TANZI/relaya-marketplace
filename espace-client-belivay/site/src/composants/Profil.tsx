// Le compte de la cliente tel qu'elle l'a réglé (DP-52) : solde du portefeuille masqué sur place, photo de
// profil à la place du portrait dessiné.
import type { MouseEvent, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { chemin } from '../config/pages'
import { usePreferences } from '../preferences'
import { useSession } from '../session'
import { Icone } from './Icone'

// Solde masqué : le choix de l'appareil, ou la page du portefeuille ouverte sur « ?vue=masque » (prototype).
export function useSoldeMasque(): boolean {
  const { soldeMasque } = usePreferences()
  const lieu = useLocation()
  return soldeMasque || (lieu.pathname === chemin('wallet') && new URLSearchParams(lieu.search).get('vue') === 'masque')
}

// L'œil de la carte du portefeuille : masque ou montre le solde sur place, sans changer d'écran. Le prototype
// passait par la page du portefeuille ; ici le choix vaut partout (compte, menu, portefeuille) et reste gardé.
export function OeilSolde() {
  const { t, setSoldeMasque } = usePreferences()
  const masque = useSoldeMasque()
  const lieu = useLocation()
  const naviguer = useNavigate()
  const basculer = (e: MouseEvent) => {
    e.preventDefault()
    setSoldeMasque(!masque)
    // Ouverte masquée par son adresse, la page du portefeuille la quitte en montrant le solde.
    if (masque && new URLSearchParams(lieu.search).get('vue') === 'masque') naviguer(chemin('wallet'), { replace: true })
  }
  return (
    <a
      href={masque ? chemin('wallet') : chemin('wallet', { vue: 'masque' })}
      role="button"
      aria-pressed={masque}
      aria-label={t(masque ? 'Afficher le solde' : 'Masquer le solde')}
      onClick={basculer}
    >
      <Icone nom={masque ? 'eye' : 'eye-off'} taille={17} />
    </a>
  )
}

// Chaque montant d'un texte devient « •• ••• » quand le solde est masqué (comme wlCard du prototype).
export const masquerMontants = (texte: string) => texte.replace(/\d+(?:[\s  ,.]\d{3})*(?:[,.]\d+)?/g, '•• •••')

// Montant du portefeuille : le solde (« 45 000 », suivi de <small>F</small>) ou une phrase qui en contient.
export function Montant({ children, solde }: { children: string; solde?: boolean }) {
  const masque = useSoldeMasque()
  if (!masque) return <>{children}</>
  return <>{masquerMontants(children) + (solde ? ' ' : '')}</>
}

// Photo choisie par la cliente, dans le cadre rond du portrait ; sans photo, le portrait dessiné.
export function PhotoClient({ children }: { children: ReactNode }) {
  const photo = useSession().client?.photo
  if (!photo) return <>{children}</>
  return <img src={photo} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
}

// Portrait rond complet (en-tête, menu) : la photo de la cliente, ou le dessin donné.
export function Portrait({ taille, children }: { taille: number; children: ReactNode }) {
  const client = useSession().client
  const photo = client?.photo
  // Sans photo : le dessin du prototype, nommé d'après le vrai client (le dessin porte un nom de démo).
  if (!photo)
    return client ? (
      <span role="img" aria-label={[client.prenom, client.nom].filter(Boolean).join(' ')} style={{ display: 'contents' }}>
        <span aria-hidden="true" style={{ display: 'contents' }}>
          {children}
        </span>
      </span>
    ) : (
      <>{children}</>
    )
  return (
    <span className="portrait" style={{ width: taille, height: taille }}>
      <PhotoClient>{null}</PhotoClient>
    </span>
  )
}
