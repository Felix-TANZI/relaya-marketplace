// Chargement des listes de produits (listes d'un univers, résultats de recherche) : sur téléphone, la suite se
// charge en défilant, sans fin, comme aujourd'hui. Dès 768 px (DISPOSITION-ECRANS.md § 6.8), 24 produits par
// chargement, et après 3 chargements automatiques un bouton « Voir plus » : le pied de page reste atteignable ;
// le nombre affiché et le total sont écrits sous la grille (« 72 sur 283 produits »).
import { useEffect, useRef, useState } from 'react'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { usePreferences } from '../../preferences'

const PAS_LARGE = 24
const AUTOMATIQUES = 3

// cle : ce qui remet la liste à son début (les paramètres de l'adresse).
export function useChargement(total: number, pas: number, cle: string) {
  const large = useDes('tab')
  const p = large ? PAS_LARGE : pas
  const [vus, setVus] = useState(p)
  const [auto, setAuto] = useState(0)
  const suite = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setVus(p)
    setAuto(0)
  }, [cle, p])
  const reste = total > vus
  const enAttente = large && auto >= AUTOMATIQUES
  useEffect(() => {
    const el = suite.current
    if (!el || !reste || enAttente) return
    const o = new IntersectionObserver((e) => {
      if (!e.some((x) => x.isIntersecting)) return
      setVus((n) => n + p)
      setAuto((a) => a + 1)
    })
    o.observe(el)
    return () => o.disconnect()
  }, [reste, vus, enAttente, p])
  const plus = () => {
    setVus((n) => n + p)
    setAuto(0)
  }
  return { vus, suite, reste, enAttente, plus, large }
}

export function VoirPlus({ vus, total, plus }: { vus: number; total: number; plus: () => void }) {
  const { t, tf } = usePreferences()
  return (
    <div className="l-plus">
      <p>{tf('{v} sur {n} produits', { v: Math.min(vus, total), n: total })}</p>
      <button type="button" className="btn secondary" onClick={plus}>
        <Icone nom="chevron-down" taille={18} />
        <span>{t('Voir plus')}</span>
      </button>
    </div>
  )
}
