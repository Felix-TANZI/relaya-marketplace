// Sécurité du compte (AJ-E, motif M20) : ouverte depuis Mon entreprise (Profil) et la Connexion. Elle réunit ce qui
// protège l'accès, sans doublon avec les Paramètres (mot de passe : lien vers eux) ; l'équipe et les rôles sont dans
// Rôles et accès (Roles.tsx, ORGANISATION.md) :
// - mon accès : code SMS, durée de session, blocage après des échecs (limites lues dans le registre) ;
// - appareils connectés : chacun se déconnecte à part, l'appareil actuel est marqué ;
// - lien vers Rôles et accès (membres, rôles, droits).
import './aje.css'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PARAMETRES } from '../../calculs/registre'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Kv, Li, Note, Panel, Pill, Vide } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useRouteOuverte, useSession } from '../../session'
import { Chargement, ErreurLecture, useDates } from '../ENT-03/outils'

const A = PARAMETRES.acces

export default function Securite() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const ouverte = useRouteOuverte()
  const { dateHeure } = useDates()
  const appareils = useLecture(() => source.parametres.appareils(), [])
  const equipe = useLecture(() => source.parametres.utilisateurs(), [s.utilisateur?.role])
  const [avis, setAvis] = useState<string | null>(null)
  const moi = equipe.donnees?.find((u) => u.moi)
  const deconnecter = async (id: string, nom: string) => {
    await source.parametres.deconnecterAppareil(id)
    appareils.relire()
    setAvis(tf('{appareil} est déconnecté : il devra se reconnecter avec le mot de passe et le code SMS.', { appareil: t(nom) }))
  }
  return (
    <Ecran route="securite">
      {avis && (
        <Note ton="green" icone="circle-check" className="mt10" role="status">
          {avis}
        </Note>
      )}
      <div className="g g2 mt14">
        <Panel titre={t('Mon accès')} icone="key-round">
          <Kv k={t('Code SMS à la connexion')} v={moi ? t(moi.codeSms ? 'à chaque connexion' : 'au changement d’appareil') : '…'} />
          <Kv k={t('Durée d’une session')} v={tf('{h} heures, puis reconnexion', { h: A.sessionHeures })} />
          <Kv k={t('Après des essais manqués')} v={tf('{n} échecs : accès bloqué {m} min', { n: A.echecsAvantBlocage, m: A.blocageMinutes })} />
          <Kv k={t('Code renvoyé')} v={tf('après {s} s, {n} fois au plus, puis le support', { s: A.renvoiCodeSecondes, n: A.renvoisAvantSupport })} />
          {ouverte('parametres') && (
            <div className="btns mt12">
              <Link className="btn secondary" to={chemin('parametres') + '#securite'}>
                <Icone nom="key-round" taille={16} />
                <span>{t('Changer le mot de passe')}</span>
              </Link>
            </div>
          )}
        </Panel>
        <Panel titre={t('Appareils connectés')} icone="smartphone">
          {appareils.erreur && <ErreurLecture erreur={appareils.erreur} relire={appareils.relire} />}
          {!appareils.donnees && !appareils.erreur && <Chargement lignes={1} />}
          {appareils.donnees?.length === 0 && <Vide icone="smartphone" t={t('Aucun appareil connecté')} />}
          {appareils.donnees?.map((a) => (
            <Li
              key={a.id}
              icone={/android|iphone|téléphone/i.test(a.nom) ? 'smartphone' : 'monitor'}
              ton={a.actuel ? 'acc' : 'ink'}
              t={a.actuel ? tf('{n} (cet appareil)', { n: t(a.nom) }) : t(a.nom)}
              s={`${a.lieu} · ${dateHeure(a.vuLe)}`}
              droite={
                a.actuel ? (
                  <Pill sm ton="green" dot>
                    {t('Actuel')}
                  </Pill>
                ) : (
                  <button type="button" className="btn sm ghost" onClick={() => void deconnecter(a.id, a.nom)} aria-label={tf('Déconnecter {appareil}', { appareil: t(a.nom) })}>
                    <Icone nom="log-out" taille={16} />
                    <span>{t('Déconnecter')}</span>
                  </button>
                )
              }
            />
          ))}
          <p className="t12 c3 mt10">{t('Un appareil que vous ne reconnaissez pas ? Déconnectez-le, puis changez le mot de passe.')}</p>
        </Panel>
      </div>

      <Panel titre={t('Rôles et accès')} icone="shield-check" className="mt14">
        <Li icone="users" ton="acc" t={t('Membres, rôles et droits')} s={t('Qui a accès à l’espace, et ce que chaque rôle peut faire')} to={chemin('roles')} />
      </Panel>
    </Ecran>
  )
}
