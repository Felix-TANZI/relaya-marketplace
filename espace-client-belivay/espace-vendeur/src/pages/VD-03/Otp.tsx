// Code de vérification de l'ouverture (VD-03, route otp ; OUV-01, OUV-03, VD03-R07, CNX-04, CNX-06) : le code parti
// par SMS au numéro de la boutique (POST /auth/otp), tapé ou collé, validé (POST /auth/verify) : la boutique existe,
// la barre passe à l'étape 2 et les produits peuvent être ajoutés en brouillon. « Changer de numéro » revient au
// formulaire, les champs remplis. Ensuite : Face ID ou l'empreinte, proposés une fois, puis les pièces (route kyc).
import { Link, useNavigate } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { Chargement, CodeSMS, ErreurLecture, Etapes, useEnLigne } from './commun'

export default function Otp() {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const enLigne = useEnLigne()
  const lecture = useLecture(async () => ({ envoi: await source.session.envoiOuverture() }), [])
  const envoi = lecture.donnees?.envoi ?? null
  const changer = (
    <Link to={chemin('ouvrir')} className="t13 b8 cor" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
      {t('Changer de numéro')}
    </Link>
  )
  return (
    <Ecran route="otp" retour={chemin('ouvrir')}>
      <Etapes cur={1} />
      <div className="center" style={{ paddingTop: '18px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '18px', margin: '0 auto', background: 'var(--or-soft)', color: 'var(--or-txt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icone nom="smartphone" taille={28} />
        </div>
        <h1 className="pg-t" style={{ marginTop: '12px' }}>
          {t('Entrez le code reçu par SMS')}
        </h1>
        {envoi && <p className="pg-s">{tf('Envoyé au {n}.', { n: envoi.destination })}</p>}
      </div>
      {lecture.erreur ? (
        <ErreurLecture relire={lecture.relire} />
      ) : !lecture.donnees ? (
        <Chargement />
      ) : !envoi ? (
        <>
          <div className="note ink" role="status">
            <Icone nom="info" taille={18} />
            <div>{t('Aucun code en cours : remplissez d’abord l’étape 1.')}</div>
          </div>
          <div className="mt12">
            <Link to={chemin('ouvrir')} className="btn primary">
              <Icone nom="store" taille={18} />
              <span>{t('Ouvrir ma boutique')}</span>
            </Link>
          </div>
        </>
      ) : (
        <CodeSMS
          envoi={envoi}
          enLigne={enLigne}
          valider={(c) => source.session.validerCodeOuverture(c)}
          renvoyer={() => source.session.renvoyerCodeOuverture()}
          reussi={() => naviguer(chemin('faceid', { nouveau: 1, next: chemin('kyc') }), { replace: true })}
          aCoteDuRenvoi={changer}
        />
      )}
      <p className="scrim-note">{t('Deux comptes au plus par téléphone. Au-delà, la création est refusée.')}</p>
    </Ecran>
  )
}
