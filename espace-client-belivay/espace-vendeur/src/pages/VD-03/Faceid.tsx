// Face ID ou empreinte (VD-03 ; DP-56 Q-41 V4/V10 ; DP-57 S-1) : proposé une seule fois, après l'ouverture de la
// boutique (?nouveau=1 : « Boutique ouverte ! ») ou après une première connexion sur un téléphone qui en a.
// Il ouvre seulement l'application sur ce téléphone, déjà reconnu : il ne remplace JAMAIS un code SMS (nouvel
// appareil, numéro de versement, accès d'équipe, mot de passe). Le visage ou l'empreinte restent dans le téléphone.
// iPhone : Face ID ; Android (?os=android, ou le téléphone lui-même) : l'empreinte. « Activer » règle la sécurité,
// « Plus tard » passe ; déjà activé : « Continuer ». Ensuite : la page demandée (?next=, « #kyc » du prototype
// compris), sinon l'accueil. Le choix se change dans Sécurité.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { mouvementLibre } from '@client/composants/Animations'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { adresseDuSite, chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Chargement, ErreurLecture } from './commun'

export default function Faceid() {
  const { t } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const s = useSession()
  const lecture = useLecture(() => source.session.biometrie(), [])
  const [scan, setScan] = useState(false)
  const nouveau = params.get('nouveau') === '1'
  const android = params.get('os') === 'android' || (params.get('os') !== 'ios' && /Android/i.test(navigator.userAgent))
  const next = params.get('next')
  const suite = next ? (next.startsWith('#') ? adresseDuSite(next) : next.startsWith('/') && !next.startsWith('//') ? next : chemin('accueil')) : chemin('accueil')
  const icone = android ? 'fingerprint' : 'scan-face'
  const b = lecture.donnees
  const choisir = async (active: boolean) => {
    if (scan) return
    if (active) {
      setScan(true)
      if (mouvementLibre()) await new Promise((r) => setTimeout(r, 700))
    }
    await source.session.reglerBiometrie(active)
    if (active) jouer('code')
    naviguer(suite, { replace: true })
  }
  const points = android
    ? ['Plus de code ni de mot de passe à chaque ouverture.', 'Seulement pour ouvrir l’application sur ce téléphone : un nouvel appareil ou un nouveau numéro de versement demandent toujours un code SMS.', 'Votre empreinte reste dans votre téléphone. BelivaY ne la voit jamais.']
    : ['Plus de code ni de mot de passe à chaque ouverture.', 'Seulement pour ouvrir l’application sur ce téléphone : un nouvel appareil ou un nouveau numéro de versement demandent toujours un code SMS.', 'Votre visage reste dans votre téléphone. BelivaY ne le voit jamais.']
  return (
    <Ecran route="faceid">
      <div className={'vx-fid' + (scan ? ' scan' : '')}>
        <Icone nom={scan ? 'check' : icone} taille={50} trait={1.6} />
      </div>
      <h1 className="pg-t" style={{ textAlign: 'center' }}>
        {nouveau && (
          <>
            {t('Boutique ouverte !')}
            <br />
          </>
        )}
        {t(android ? 'Ouvrez votre espace avec votre empreinte' : 'Ouvrez votre espace en un regard')}
      </h1>
      <div className="vx-pts">
        {points.map((p) => (
          <div key={p}>
            <Icone nom="circle-check" taille={20} />
            <span>{t(p)}</span>
          </div>
        ))}
      </div>
      {lecture.erreur ? (
        <ErreurLecture relire={lecture.relire} />
      ) : !b ? (
        <Chargement />
      ) : !s.connecte ? (
        <>
          <div className="note ink">
            <Icone nom="lock" taille={18} />
            <div>{t('Connectez-vous d’abord : Face ID et l’empreinte se règlent sur un téléphone reconnu.')}</div>
          </div>
          <div className="mt16">
            <Link to={chemin('connexion', { next: chemin('faceid') })} className="btn primary">
              <Icone nom="log-in" taille={18} />
              <span>{t('Me connecter')}</span>
            </Link>
          </div>
        </>
      ) : b.active ? (
        <>
          <div className="note green" role="status">
            <Icone nom="circle-check" taille={18} />
            <div>{t(android ? 'L’empreinte est déjà activée sur ce téléphone.' : 'Face ID est déjà activé sur ce téléphone.')}</div>
          </div>
          <div className="mt16">
            <button type="button" className="btn primary" onClick={() => naviguer(suite, { replace: true })}>
              <Icone nom="arrow-right" taille={18} />
              <span>{t('Continuer')}</span>
            </button>
          </div>
          <div className="mt8">
            <button type="button" className="btn ghost" onClick={() => void choisir(false)}>
              <span>{t('Désactiver')}</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mt16">
            <button type="button" className={'btn primary' + (scan ? ' off' : '')} onClick={() => void choisir(true)}>
              <Icone nom={icone} taille={18} />
              <span>{t(scan ? 'Activation…' : android ? 'Activer l’empreinte' : 'Activer Face ID')}</span>
            </button>
          </div>
          <div className="mt8">
            <button type="button" className="btn ghost" onClick={() => void choisir(false)}>
              <span>{t('Plus tard')}</span>
            </button>
          </div>
        </>
      )}
      <p className="scrim-note">{t('Proposé une seule fois. Vous pouvez changer ce choix dans Sécurité.')}</p>
      {s.connecte && (
        <p className="scrim-note" style={{ marginTop: '4px' }}>
          <Link to={chemin('securite')} className="t13 b8 cor" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
            {t('Ouvrir Sécurité')}
          </Link>
        </p>
      )}
    </Ecran>
  )
}
