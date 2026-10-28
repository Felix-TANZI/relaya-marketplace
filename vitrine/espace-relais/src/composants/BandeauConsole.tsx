// Bandeaux de la console d'administration (src/demo/pont-console.ts) : panne non rétablie, maintenance annoncée,
// suspension ou pièce à renvoyer décidées par BelivaY. Posés par la coque en tête du contenu de toutes les pages ;
// relus quand une autre application écrit dans le pont (« blv:donnees »).
import { useEffect, useState } from 'react'
import { bandeauxConsole } from '../demo/pont-console'
import { Icone } from './Icone'

export function BandeauConsole() {
  const [, relire] = useState(0)
  useEffect(() => {
    const f = () => relire((n) => n + 1)
    window.addEventListener('blv:donnees', f)
    const i = window.setInterval(f, 15_000)
    return () => (window.removeEventListener('blv:donnees', f), window.clearInterval(i))
  }, [])
  const l = bandeauxConsole('relais')
  if (!l.length) return null
  return (
    <>
      {l.map((b) => (
        <div key={b.id} className={'r-console ' + b.ton} role="status" data-console={b.id}>
          <Icone nom={b.ton === 'rouge' ? 'shield-alert' : 'triangle-alert'} taille={18} />
          <span>
            <b>{b.titre}</b> · {b.texte}
          </span>
        </div>
      ))}
    </>
  )
}
