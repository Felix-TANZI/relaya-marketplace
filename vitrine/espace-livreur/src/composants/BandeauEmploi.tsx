// Décisions de l'employeur qui changent la journée du livreur (DP-66 : son employeur est l'entreprise ; il voit, il ne
// décide pas) : suspension en cours (« Suspendu par votre entreprise jusqu'au… », motif) et fin de contrat en préavis
// (date de fin). Posé par la coque en tête du contenu, comme les bandeaux de la console ; relu quand une autre
// application écrit dans le pont (« blv:donnees »). Sobre : une ligne, la couleur doublée d'un texte. En mode API,
// l'emploi est lu au kit (source.moi.emploi : GET /api/courier/me/employment), relu aux mêmes moments.
import { useEffect, useState } from 'react'
import { env } from '@client/config/env'
import { etatEmploi, suspensionEnCours } from '../demo/emploi'
import { maintenant } from '../demo/horloge'
import type { EmploiVu } from '../donnees/domaines/moi'
import { source } from '../donnees/source'
import { useLecture } from '../donnees/useLecture'
import { useSession } from '../session'
import { jourLong } from '../i18n/temps'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

export function BandeauEmploi() {
  return env.source === 'api' ? <BandeauKit /> : <BandeauDemo />
}

function BandeauDemo() {
  const [, relire] = useState(0)
  useEffect(() => {
    const f = () => relire((n) => n + 1)
    window.addEventListener('blv:donnees', f)
    const i = window.setInterval(f, 15_000)
    return () => (window.removeEventListener('blv:donnees', f), window.clearInterval(i))
  }, [])
  return <Bandeau s={suspensionEnCours(maintenant())} fin={etatEmploi.lire().finContrat} />
}

/** Mode API : l'emploi lu au kit, seulement avec une session ouverte (relu à chaque « blv:donnees »). */
function BandeauKit() {
  const connecte = useSession().connecte
  return connecte ? <BandeauLu /> : null
}
function BandeauLu() {
  const l = useLecture(() => source.moi.emploi(), [])
  const t = Date.now()
  const e = l.donnees
  if (!e) return null
  const s = e.suspension && (e.suspension.jusqua === null || e.suspension.jusqua > t) ? e.suspension : null
  return <Bandeau s={s} fin={e.finContrat} />
}

function Bandeau({ s, fin }: { s: EmploiVu['suspension']; fin: EmploiVu['finContrat'] }) {
  const { t, tf, langue } = usePreferences()
  if (!s && !fin) return null
  return (
    <>
      {s && (
        <div className="note red" role="status" data-emploi="suspension">
          <Icone nom="ban" taille={18} />
          <span>
            <b>{s.jusqua ? tf('Suspendu par votre entreprise jusqu’au {d}', { d: jourLong(s.jusqua, langue) }) : t('Suspendu par votre entreprise')}</b> · {s.motif} {t('Vous terminez vos missions en cours ; aucun nouveau paquet d’ici là.')}
          </span>
        </div>
      )}
      {fin && (
        <div className="note amber" role="status" data-emploi="fin">
          <Icone nom="door-open" taille={18} />
          <span>
            <b>{tf('Fin de contrat · préavis jusqu’au {d}', { d: jourLong(fin.preavisJusqua, langue) })}</b> · {t('Décidée par votre entreprise. Vous travaillez normalement jusqu’à la veille du dernier jour.')}
          </span>
        </div>
      )}
    </>
  )
}
