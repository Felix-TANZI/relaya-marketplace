// Abonnements (CL-14 ; FF-ABONNEMENT ; DP-54) : ce que partagent les écrans de Prime.
import { useEffect, useState, type ReactNode } from 'react'
import { useDes } from '../../composants/ecran'
import type { Palier } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { source, type DonneesPrime, type ListeEnvies } from '../../donnees/source'
import { palier } from '../../donnees/prime'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'

export function usePrime(): [DonneesPrime | null, () => void] {
  const [d, setD] = useState<DonneesPrime | null>(null)
  const [v, setV] = useState(0)
  useEffect(() => {
    source.prime().then(setD)
  }, [v])
  return [d, () => setV((x) => x + 1)]
}
export const nomPalier = (id: string) => (id === 'pass' ? 'Pass 7 jours' : (palier(id)?.nom ?? id))
// Ce que chaque palier apporte, en clair et traduit (page Abonnements, Business, résiliation).
type Tf = (m: string, v: Record<string, string | number>) => string
export function avantages(id: string, tf: Tf): string[] {
  const p = palier(id)
  if (!p) return []
  const k = (n: number) => (n / 1000).toLocaleString('fr-FR') + '\u00A0000'
  const r = p.relais.reduction ? tf('Relais : −{r} % dès {d} F, illimité*', { r: p.relais.reduction * 100, d: k(p.relais.des) }) : p.relais.offerts ? tf('Relais : {n} offerts par mois dès {d} F', { n: p.relais.offerts, d: k(p.relais.des) }) : tf('Relais offert dès {d} F, illimité*', { d: k(p.relais.des) })
  const d = p.domicile.offerts ? tf('Domicile : {n} offerts dès {d} F, puis −{r} %', { n: p.domicile.offerts, d: k(p.domicile.des), r: p.domicile.ensuite * 100 }) : tf('Domicile : −{r} %', { r: p.domicile.ensuite * 100 })
  return [r, d, ...(p.cagnotte ? [tf('Cagnotte : {n} % de tes achats', { n: p.cagnotte * 100 })] : []), tf('Garde au relais : +{n} jours gratuits', { n: p.gardeBonus }), tf('Support {s}', { s: tf(p.support, {}) }), ...(p.comptes > 1 ? [tf('{n} comptes', { n: p.comptes })] : [])]
}

// Listes d'envies : la liste lue dans les données, rechargeable après un geste.
export function useListes(): [{ listes: ListeEnvies[]; relais: string | null; maintenant: number } | null, () => void] {
  const [d, setD] = useState<{ listes: ListeEnvies[]; relais: string | null; maintenant: number } | null>(null)
  const [v, setV] = useState(0)
  useEffect(() => {
    source.listes().then(setD)
  }, [v])
  return [d, () => setV((x) => x + 1)]
}
export const offerts = (l: ListeEnvies) => l.articles.filter((a) => a.offert).length

// Prix au partage (CLE-39) : les prix d'une liste sont relevés quand elle est partagée (ou quand un article est
// ajouté à une liste déjà partagée). Celui qui offre paie toujours le prix du jour : une hausse lui est montrée et
// il l'accepte avant de payer ; une baisse lui profite. Écart = prix du jour − prix au partage.
export const ecartPartage = (a: { prix: number; prixPartage: number | null }) => (a.prixPartage === null ? 0 : a.prix - a.prixPartage)

// La pastille de l'écart, avec le prix d'alors : « +400 F depuis le partage · 9 500 F le lun. 21 sept. ».
export function EcartPartage({ a, le }: { a: { prix: number; prixPartage: number | null }; le: number | null }) {
  const { t, tf, langue } = usePreferences()
  const e = ecartPartage(a)
  if (!e || a.prixPartage === null) return null
  return (
    <div className="mt6">
      <span className={'pill sm ' + (e > 0 ? 'amber' : 'green')}>
        <Icone nom={e > 0 ? 'trending-up' : 'trending-down'} taille={13} />
        {tf(e > 0 ? '+{m} F depuis le partage' : '−{m} F depuis le partage', { m: F(Math.abs(e)) })}
      </span>
      <div className="t12 c3 mt4">
        <s className="was">{F(a.prixPartage)}&nbsp;F</s> {le ? tf('au partage, le {d}', { d: jourSeul(le, langue) }) : t('au partage')}
      </div>
    </div>
  )
}

// Grands écrans (DISPOSITION-ECRANS.md § 5.12, 5.13 ; lots 11 et 12) : regroupe des blocs dans une grille dès le
// palier donné (classe de larges.css, section « Lots 11 et 12 »). Sous ce palier, rien n'est enveloppé : le flux
// du téléphone reste au pixel.
export function Bloc({ classe, des = 'tab-l', etiquette, children }: { classe: string; des?: Palier; etiquette?: string; children: ReactNode }) {
  const actif = useDes(des)
  if (!actif) return <>{children}</>
  if (etiquette) return <aside className={classe} aria-label={etiquette}>{children}</aside>
  return <div className={classe}>{children}</div>
}
