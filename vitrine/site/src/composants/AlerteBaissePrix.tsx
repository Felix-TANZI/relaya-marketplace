// Alerte de baisse de prix (VAGUE-AMELIORATIONS.md n° 8, règle : donnees/baissePrix.ts), réutilisable : favoris,
// articles enregistrés pour plus tard, lignes du panier. « Prix baissé de 60 000 F (−8 %) depuis ton ajout. »
// Rien n'est affiché sous le seuil de la règle. Branchée sous le prix de chaque favori (CL-07/Sauvegardes.tsx).
import { baisseDePrix } from '../donnees/baissePrix'
import { F } from '../i18n/format'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

const DEPUIS = {
  ajout: 'depuis ton ajout',
  enregistrement: 'depuis que tu l’as enregistré',
} as const

export function AlerteBaissePrix({ avant, apres, depuis = 'ajout', fin, classe = 'pan-baisse' }: { avant: number | null | undefined; apres: number; depuis?: keyof typeof DEPUIS; fin?: string; classe?: string }) {
  const { t, tf } = usePreferences()
  const b = baisseDePrix(avant, apres)
  if (!b) return null
  return (
    <div className={classe} role="status" data-baisse={b.montant}>
      <Icone nom="trending-down" taille={14} />
      <span>
        {tf(b.pourcent ? 'Prix baissé de {m} F (−{p} %) {d}.' : 'Prix baissé de {m} F (moins de 1 %) {d}.', { m: F(b.montant), p: b.pourcent, d: t(DEPUIS[depuis]) })}
        {fin ? ' ' + fin : ''}
      </span>
    </div>
  )
}
