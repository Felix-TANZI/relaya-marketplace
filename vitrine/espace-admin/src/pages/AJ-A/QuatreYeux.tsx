// Quatre yeux en attente (page ajoutée, S1) : les décisions qui attendent un second validateur. Trois parties :
// à contresigner par vous (un AUTRE compte, d'un rôle permis : jamais les vôtres) ; vos demandes, qui attendent un autre
// compte ; récemment tranchées (contresignées, refusées, échues). La source refuse de toute façon le même compte ou un
// rôle non permis ; contresigner applique la décision (remboursement, annulation, litige) dans son espace.
import { useSearchParams } from 'react-router-dom'
import { CarteQuatreYeux } from '../../composants/CarteQuatreYeux'
import { Ecran } from '../../composants/coque'
import { Perimetre } from '../../composants/Perimetre'
import { Note, Sec, Vide } from '../../composants/prototype'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { useFonctions } from './fonctions-page'
import { usePreferences } from '../../preferences'
import { usePeut, useSession } from '../../session'

export default function QuatreYeux() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const peut = usePeut('contresigner')
  const [params] = useSearchParams()
  const vise = params.get('id')
  const attente = useLecture(() => source.quatreyeux.enAttente(), [s.role, s.agent?.id])
  const histo = useLecture(() => source.quatreyeux.historique(), [s.role, s.agent?.id])
  const relire = () => {
    attente.relire()
    histo.relire()
  }
  const moi = s.agent?.id
  const toutes = attente.donnees ?? []
  const aSigner = toutes.filter((d) => d.premier.agentId !== moi && d.rolesSecond.includes(s.role)).sort((a, b) => (a.id === vise ? -1 : b.id === vise ? 1 : a.expireLe - b.expireLe))
  const miennes = toutes.filter((d) => d.premier.agentId === moi)
  const autres = toutes.filter((d) => d.premier.agentId !== moi && !d.rolesSecond.includes(s.role))
  const fonctions = useFonctions([
    peut && { verbe: 'Contresigner', n: aSigner.length, unite: ['décision', 'décisions'], icone: 'users-round', onClick: () => document.querySelector('.s1-res')?.scrollIntoView({ behavior: 'smooth' }), alerte: aSigner.some((d) => d.expireLe - Date.now() < 3_600_000) },
    { verbe: 'Suivre', n: miennes.length, unite: ['demande', 'demandes'], icone: 'hourglass', onClick: () => document.querySelectorAll('.s1-res')[1]?.scrollIntoView({ behavior: 'smooth' }) },
  ])
  return (
    <Ecran route="quatreyeux" fonctions={fonctions}>
      <Perimetre route="quatreyeux" />
      {(attente.erreur || histo.erreur) && (
        <Note ton="red" icone="circle-alert" role="alert">
          {t('La liste n’a pas pu être lue.')}{' '}
          <button type="button" className="btn sm secondary" onClick={relire}>
            {t('Réessayer')}
          </button>
        </Note>
      )}
      <Sec t={tf('À contresigner par vous · {n}', { n: aSigner.length })} />
      {!peut && (
        <Note ton="ink" icone="eye">
          {t('Votre rôle contrôle ces décisions mais ne les contresigne pas.')}
        </Note>
      )}
      {attente.donnees && aSigner.length === 0 && <Vide icone="check-check" t={t('Rien à contresigner')} />}
      <div className="s1-res">
        {aSigner.map((d) => (
          <CarteQuatreYeux key={d.id} d={d} apres={relire} />
        ))}
      </div>
      {miennes.length > 0 && (
        <>
          <Sec t={tf('Vos demandes, en attente d’un autre compte · {n}', { n: miennes.length })} />
          <div className="s1-res">
            {miennes.map((d) => (
              <CarteQuatreYeux key={d.id} d={d} apres={relire} />
            ))}
          </div>
        </>
      )}
      {autres.length > 0 && (
        <>
          <Sec t={tf('Autres décisions en attente · {n}', { n: autres.length })} />
          <div className="s1-res">
            {autres.map((d) => (
              <CarteQuatreYeux key={d.id} d={d} apres={relire} />
            ))}
          </div>
        </>
      )}
      {(histo.donnees?.length ?? 0) > 0 && (
        <>
          <Sec t={t('Récemment tranchées')} />
          <div className="s1-res">
            {histo.donnees!.slice(0, 10).map((d) => (
              <CarteQuatreYeux key={d.id} d={d} />
            ))}
          </div>
        </>
      )}
    </Ecran>
  )
}
