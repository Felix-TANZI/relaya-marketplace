// Bandeaux de la console d'administration (src/demo/pont-console.ts) : panne non rétablie, maintenance annoncée,
// suspension ou pièce à renvoyer décidées par BelivaY ; compte bloqué par BelivaY (acces_change, motif). Posés par la
// coque en tête du contenu de toutes les pages ;
// relus quand une autre application écrit dans le pont (« blv:donnees »).
import { useEffect, useState } from 'react'
import { bandeauxConsole } from '../demo/pont-console'
import { accesBloque } from '../demo/pilotage-console'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

export function BandeauConsole() {
  const [, relire] = useState(0)
  useEffect(() => {
    const f = () => relire((n) => n + 1)
    window.addEventListener('blv:donnees', f)
    const i = window.setInterval(f, 15_000)
    return () => (window.removeEventListener('blv:donnees', f), window.clearInterval(i))
  }, [])
  const { t } = usePreferences()
  const l = bandeauxConsole('client')
  const bloque = accesBloque()
  if (!l.length && !bloque) return null
  return (
    <>
      {bloque && (
        <div className="note red" role="status" data-console="acces">
          <Icone nom="lock" taille={18} />
          <span>
            <b>{t('Compte bloqué par BelivaY')}</b> · {bloque.motif} {t('Pour en parler, écris au service client.')}
          </span>
        </div>
      )}
      {l.map((b) => (
        <div key={b.id} className={'note ' + (b.ton === 'rouge' ? 'red' : 'amber')} role="status" data-console={b.id}>
          <Icone nom={b.ton === 'rouge' ? 'shield-alert' : 'triangle-alert'} taille={18} />
          <span>
            <b>{b.titre}</b> · {b.texte}
          </span>
        </div>
      ))}
    </>
  )
}
