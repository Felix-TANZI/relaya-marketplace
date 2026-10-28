// « Écouter les sons » (réglages des cinq applications) : chaque son de l'application, avec les actions qui le jouent
// et son intention ; un toucher le fait entendre, même dans les heures calmes. Le porteur choisit ici. Réutilisé par
// l'alias : dans un espace, preferences et marque-sonore sont ceux de l'espace (sa couleur, ses actions, sa langue).
// Tableau complet : logique-metier/SONS.md.
import { useState } from 'react'
import { usePreferences } from '../preferences'
import { INTENTIONS, apercu, sonner, type Action } from './marque-sonore'

const ligne = { display: 'flex', gap: 10, alignItems: 'flex-start', width: '100%', minHeight: 44, padding: '9px 6px', background: 'none', border: 0, borderTop: '1px solid rgba(127,127,127,.2)', font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' } as const
const pastille = { flex: 'none', width: 28, height: 28, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'rgba(127,127,127,.15)' } as const

export function ApercuSons() {
  const { langue, sons, vibrations } = usePreferences()
  const en = langue === 'en'
  const [joue, setJoue] = useState<string | null>(null)
  const liste = apercu()
  const actif = sons || vibrations
  return (
    <details className="blv-apercu-sons" style={{ margin: '2px 0 6px' }}>
      <summary style={{ cursor: 'pointer', padding: '12px 14px', minHeight: 44, fontWeight: 600 }}>
        {en ? 'Listen to the sounds' : 'Écouter les sons'} <span style={{ fontWeight: 400, opacity: 0.7 }}>· {liste.length}</span>
      </summary>
      <p style={{ margin: '0 14px 8px', fontSize: 13, lineHeight: 1.45, opacity: 0.75 }} aria-live="polite">
        {!actif
          ? en
            ? 'Turn sounds or vibrations on to try them.'
            : 'Activez les sons ou les vibrations pour les essayer.'
          : en
            ? 'Tap a sound to hear it. Each sound carries one intention; the same family plays in every BelivaY app.'
            : 'Touchez un son pour l’entendre. Chaque son porte une intention ; la même famille sonne dans toutes les applications BelivaY.'}
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: '0 8px 8px' }}>
        {liste.map((x) => {
          const i = INTENTIONS[x.intention]
          return (
            <li key={x.son}>
              <button type="button" style={ligne} disabled={!actif} aria-pressed={joue === x.son} data-son={x.son} onClick={() => (setJoue(x.son), sonner(x.action as Action, true))}>
                <span aria-hidden="true" style={pastille}>
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <path d={joue === x.son ? 'M2 2h3v8H2zM7 2h3v8H7z' : 'M3 1.5v9l7.5-4.5z'} fill="currentColor" />
                  </svg>
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 600, overflowWrap: 'anywhere' }}>{x.actions.map((a) => (en ? a.en : a.fr)).join(' · ')}</span>
                  <span style={{ display: 'block', fontSize: 12, opacity: 0.72 }}>
                    {en ? i.en : i.fr} — {en ? i.detail.en : i.detail.fr}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
