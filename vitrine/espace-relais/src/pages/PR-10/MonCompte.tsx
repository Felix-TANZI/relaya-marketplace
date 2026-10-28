// Mon compte (page ajoutée, ouverte depuis Paramètres) : le kit « compte » partagé par les quatre applications
// (site/src/compte), aux couleurs du point relais. Chaque membre règle son propre compte : photo (la même que celle
// de l'en-tête et de Mon équipe, enregistrée par le relais), nom, numéro (code SMS au nouveau numéro), e-mail (code à la
// nouvelle adresse), mot de passe, compte Google. Le gérant ajoute la couverture du point relais (en tête des
// Paramètres). Désactiver son accès : discret, avec le mot de passe ; la convention, elle, se termine par sa demande.
// Avec le serveur (VITE_SOURCE=api) : CompteApi, ce que le kit sert pour un membre du relais (photo, numéro, appareils).
import { useNavigate } from 'react-router-dom'
import { SectionsCompte } from '@client/compte/Compte'
import { env } from '@client/config/env'
import { Kit } from '@client/compte/socle'
import { Ecran } from '../../composants/coque'
import { chemin } from '../../config/pages'
import { cleCompte, departMembre } from '../../demo/session'
import { origine } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useSession } from '../../session'
import CompteApi from './CompteApi'

export default function MonCompte() {
  const s = useSession()
  const naviguer = useNavigate()
  const m = s.membre
  if (!m) return <Ecran route="mon-compte" />
  const gerant = m.role === 'proprietaire'
  return (
    <Ecran route="mon-compte">
      <div style={{ padding: '4px 16px 24px' }}>
        <Kit couleur="#B24F00" texte="var(--acc-txt)">
          {env.source === 'api' ? (
            <CompteApi />
          ) : (
            <SectionsCompte
              app={cleCompte(m.id)}
              depart={departMembre(m.id)}
              couverture={
                gerant
                  ? {
                      aide: 'Elle s’affiche en tête des Paramètres du relais, recadrée en bandeau.',
                    }
                  : undefined
              }
              photoVuePar="Votre photo se voit dans l’en-tête, le Menu et Mon équipe ; jamais des clients."
              enregistrerPhoto={async (photo) => void (await source.relais.changerPhoto(photo, origine(Date.now())))}
              fin={{
                genre: 'desactiver',
                consequence: gerant
                  ? 'Votre accès se ferme sur tous vos appareils ; le relais, ses colis et la convention restent (la fin de convention se demande à part).'
                  : 'Votre accès se ferme sur tous vos appareils ; le gérant est prévenu et peut vous réinviter.',
              }}
              apresFin={() => void source.session.deconnecter().then(() => naviguer(chemin('connexion'), { replace: true }))}
            />
          )}
        </Kit>
      </div>
    </Ecran>
  )
}
