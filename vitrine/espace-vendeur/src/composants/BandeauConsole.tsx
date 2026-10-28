// Bandeaux de la console d'administration (src/demo/pont-console.ts) : panne non rétablie, maintenance annoncée,
// suspension ou pièce à renvoyer décidées par BelivaY ; promotion de la plateforme en cours qui vise la boutique
// (pont : promotion ; tout le catalogue ou ses vitrines), en une ligne. Posés par la coque en tête du contenu de toutes les pages ;
// relus quand une autre application écrit dans le pont (« blv:donnees »).
import { useEffect, useState } from 'react'
import { bandeauxConsole, decisionsConsole, estMoi } from '../demo/pont-console'
import { maintenant } from '../demo/horloge'
import type { Evenement } from '../demo/pont'
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
  const { t, tf } = usePreferences()
  const l = bandeauxConsole('vendeur')
  const promos = promotionsQuiMeVisent()
  if (!l.length && !promos.length) return null
  return (
    <>
      {promos.map((p) => (
        <div key={p.id} className="note" role="status" data-console={'promotion-' + p.id}>
          <Icone nom="tag" taille={18} />
          <span>
            <b>{tf('Promotion BelivaY : {t}', { t: p.titre })}</b>
            {p.remise ? ` (${p.remise})` : ''} · {t('financée par BelivaY, votre net ne change pas.')}
          </span>
        </div>
      ))}
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

/** Promotions de la plateforme en cours qui visent la boutique : tout le catalogue, ou ses vitrines nommées. */
function promotionsQuiMeVisent() {
  const n = maintenant()
  const derniere = new Map<string, Extract<Evenement, { type: 'promotion' }>>()
  for (const e of decisionsConsole('vendeur')) if (e.type === 'promotion') derniere.set(e.id, e)
  return [...derniere.values()].filter((p) => (p.etat === 'programmee' || p.etat === 'en_cours') && p.debut <= n && n < p.fin && (p.cible === 'Tout le catalogue' || (p.cible.startsWith('Vitrines') && p.cible.slice(p.cible.indexOf(':') + 1).split(',').some((v) => estMoi(v.trim(), 'vendeur')))))
}
