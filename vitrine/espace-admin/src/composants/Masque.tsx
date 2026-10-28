// Donnée personnelle masquée (logique-metier/visibilite-anonymat.json, colonne « Console » ; loi n° 2024/017 sur la
// protection des données) : la console montre d'abord la valeur masquée ; un rôle qui a le geste « demasquer »
// (Support pour le téléphone du client, par exemple) la démasque sur MOTIF écrit, journalisé par la source ; la valeur
// claire se masque d'elle-même après ADM-DEMASQUE-MIN. Une donnée « jamais en clair » (code de retrait) n'a pas de bouton.
import { useEffect, useId, useState } from 'react'
import visibilite from '../../../logique-metier/visibilite-anonymat.json' with { type: 'json' }
import { PARAMETRES } from '../calculs/registre'
import { usePreferences } from '../preferences'
import type { Role } from '../donnees/communs'
import { usePeut, useRole } from '../session'
import { Icone } from './Icone'

const CONSOLE: Record<string, string> = Object.fromEntries(visibilite.sections.flatMap((s) => s.tableaux.flatMap((t) => t.lignes.map((l) => [l.donnee, l.console]))))
/** Ce que la matrice dit de la console pour une donnée (« oui », « jamais en clair »…). */
export const regleConsole = (donnee: string): string | null => CONSOLE[donnee] ?? null

/**
 * `roles` : rôles qui démasquent CETTE donnée, plus étroits que le geste socle (téléphone du client : Support et
 * Direction seulement, ADM-P04R-03) ; les autres voient la valeur masquée, sans bouton. La source refuse de même.
 */
export function Masque({ donnee, masque, demasquer, roles }: { donnee: string; masque: string; demasquer: (motif: string) => Promise<{ ok: true; valeur: string } | { ok: false; raison: string }>; roles?: Role[] }) {
  const { t, tf } = usePreferences()
  const role = useRole()
  const peut = usePeut('demasquer') && (!roles || roles.includes(role))
  const id = useId()
  const [ouvert, setOuvert] = useState(false)
  const [motif, setMotif] = useState('')
  const [clair, setClair] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const jamais = /^jamais/.test(regleConsole(donnee) ?? '')
  useEffect(() => {
    if (!clair) return
    const x = setTimeout(() => setClair(null), PARAMETRES.console.demasqueMin * 60_000)
    return () => clearTimeout(x)
  }, [clair])
  const valider = async () => {
    const r = await demasquer(motif).catch(() => null)
    if (!r) return setErreur(t('Le démasquage n’a pas pu être fait. Réessayez.'))
    if (!r.ok) return setErreur(tf('Le motif doit compter au moins {n} caractères.', { n: PARAMETRES.console.motifMin }))
    setClair(r.valeur)
    setOuvert(false)
    setMotif('')
    setErreur(null)
  }
  return (
    <span className="e-masque">
      <span className="e-masque-v" aria-label={clair ? undefined : tf('{donnee}, masqué', { donnee: t(donnee) })}>
        {clair ?? masque}
      </span>
      {clair && (
        <span className="pill amber sm">
          <Icone nom="eye" taille={12} />
          {t('Démasqué, journalisé')}
        </span>
      )}
      {!clair && !jamais && peut && !ouvert && (
        <button type="button" className="btn sm ghost" onClick={() => setOuvert(true)}>
          <Icone nom="eye" taille={16} />
          <span>{t('Démasquer')}</span>
        </button>
      )}
      {ouvert && (
        <span className="e-masque-f">
          <label className="fld fld-l" htmlFor={id}>
            <span className="fld-t">{t('Motif du démasquage (journalisé)')}</span>
            <span className="inp">
              <input id={id} value={motif} onChange={(e) => setMotif(e.target.value)} />
            </span>
          </label>
          {erreur && (
            <span className="e-erreur" role="alert">
              {erreur}
            </span>
          )}
          <span className="btns">
            <button type="button" className="btn sm ghost" onClick={() => setOuvert(false)}>
              {t('Annuler')}
            </button>
            <button type="button" className="btn sm primary" onClick={() => void valider()}>
              {t('Démasquer')}
            </button>
          </span>
        </span>
      )}
    </span>
  )
}
