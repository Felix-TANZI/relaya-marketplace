// Bandeau de la version de démonstration en ligne (build avec VITE_DEMO=1, voir vercel.json) : le site tourne sur
// des données de démonstration gardées dans le navigateur ; aucun paiement ni aucune commande ne sont réels (seuls
// les comptes le sont, COMPTES-REELS.md).
// Fermé d'un toucher, il ne revient pas sur cet appareil.
import { useEffect, useRef, useState } from 'react'
import { usePreferences } from '../preferences'

const CLE = 'blv_demo_bandeau'

function lu(): boolean {
  try {
    return localStorage.getItem(CLE) === 'ferme'
  } catch {
    return false
  }
}

export function BandeauDemo() {
  const { t } = usePreferences()
  const [ferme, setFerme] = useState(lu)
  const visible = import.meta.env.VITE_DEMO === '1' && !ferme
  // Grands écrans : les toasts se posent au-dessus du bandeau tant qu'il est ouvert (--demo-h, larges.css).
  const boite = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = boite.current
    const h = document.documentElement
    if (!visible || !el || typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(() => h.style.setProperty('--demo-h', el.offsetHeight + 12 + 'px'))
    ro.observe(el)
    return () => {
      ro.disconnect()
      h.style.removeProperty('--demo-h')
    }
  }, [visible])
  if (!visible) return null
  const fermer = () => {
    try {
      localStorage.setItem(CLE, 'ferme')
    } catch {
      /* stockage indisponible : fermé pour cette visite seulement */
    }
    setFerme(true)
  }
  return (
    <div ref={boite} role="status" className="note amber bandeau-demo" style={{ position: 'fixed', left: '8px', right: '8px', bottom: 'calc(84px + env(safe-area-inset-bottom))', zIndex: 9999, margin: '0 auto', maxWidth: '420px', boxShadow: '0 6px 24px rgba(0,0,0,.18)' }}>
      <div className="grow">
        <b>{t('Version de démonstration')}</b>
        <div>{t('Les produits, les commandes et les paiements sont des exemples : rien n’est vendu ni débité. Les comptes, eux, sont réels. N’entre pas tes vraies informations bancaires : utilise la carte de test 4242 4242 4242 4242.')}</div>
      </div>
      <button type="button" className="btn sm" onClick={fermer}>
        {t('Compris')}
      </button>
    </div>
  )
}

// Mention discrète, là où l'on achète (fiche produit, panier, paiement) : sur le site public, seuls les comptes sont
// réels ; les produits, les commandes et les paiements sont de démonstration. Toujours visible (le bandeau, lui, se
// ferme) ; rien hors du déploiement de démonstration (VITE_DEMO=1).
export function MentionDemo({ texte = 'Démonstration : ce produit et sa commande sont des exemples. Rien n’est vendu ni débité.' }: { texte?: string }) {
  const { t } = usePreferences()
  if (import.meta.env.VITE_DEMO !== '1') return null
  return (
    <p className="mention-demo" data-mention-demo>
      {t(texte)}
    </p>
  )
}
