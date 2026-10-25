// Textes composés des écrans d'accès à partir du registre (aucun montant ni délai écrit dans un écran).
import { FCFA } from '@client/i18n/format'
import { ACCES, RELAIS_P } from './parametres'

/** « 1 000 F » : montant en francs CFA, milliers groupés. */
export const montant = (n: number) => FCFA(n) + ' F'

type T = (s: string) => string
type TF = (s: string, v: Record<string, string | number>) => string

/** Jours de la semaine, lundi = 0 (ordre du registre, VD-VER-JOUR). */
export const JOURS_SEMAINE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

/** Offre affichée au candidat (ARL-30), montants lus au registre (RELAIS-GAIN-COLIS, RELAIS-GAIN-GARDE, GARDE-GRILLE,
 * GARDE-J1-BELIVAY, VD-VER-JOUR). */
export function texteOffre({ t, tf }: { t: T; tf: TF }): string {
  const g = RELAIS_P.gainColis
  const jour = RELAIS_P.garde.gainRelaisJour
  const jours = RELAIS_P.garde.grille.length
  const garde = RELAIS_P.garde.j1PayeParBelivay
    ? tf('{f} par jour de garde, 1er jour compris (payé par BelivaY), jusqu’à {max} sur {n} jours', { f: montant(jour), max: montant(jour * jours), n: jours })
    : tf('{f} par jour de garde facturé', { f: montant(jour) })
  return tf('Un revenu en plus dans votre commerce, sans rien avancer : {s} par petit colis remis, {m} par moyen, {l} par grand · {garde} · vous encaissez la garde en espèces et gardez votre part, le reste revient à BelivaY au versement du {jour}.', {
    s: montant(g.S),
    m: montant(g.M),
    l: montant(g.L),
    garde,
    jour: t(JOURS_SEMAINE[RELAIS_P.versement.jourSemaine]),
  })
}

/** « MTN 67X, 68X, 650 à 654 · Orange 69X, 655 à 659 » (PR-PREFIXES-MOMO). */
export function textePrefixes(t: T): string {
  const ecrire = (l: string[]) => {
    const deux = l.filter((p) => p.length === 2).map((p) => p + 'X')
    const trois = l.filter((p) => p.length === 3).map(Number)
    const plages: string[] = []
    for (let i = 0; i < trois.length; ) {
      let j = i
      while (j + 1 < trois.length && trois[j + 1] === trois[j] + 1) j++
      plages.push(i === j ? String(trois[i]) : `${trois[i]} ${t('à')} ${trois[j]}`)
      i = j + 1
    }
    return [...deux, ...plages].join(', ')
  }
  return `MTN ${ecrire(ACCES.prefixes.mtn)} · Orange ${ecrire(ACCES.prefixes.orange)}`
}
