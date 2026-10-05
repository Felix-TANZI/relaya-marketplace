// Écran « Face ID ou empreinte » (CL-03), forme d'origine du prototype rendue réelle (DP-54) : proposé après
// l'ouverture du compte (?nouveau=1 : « C'est fait, {prénom} ! ») : se reconnecter d'un regard (iPhone) ou d'un
// doigt (Android) ; il déverrouille aussi les paiements de 50 000 F et plus et le code de retrait ; le visage ou
// l'empreinte reste dans le téléphone ; « Activer » règle la sécurité du compte, « Plus tard » passe ; déjà activé :
// « Continuer » ; ensuite, l'écran demandé (« next »), sinon l'accueil. En bas : comment faire sans biométrie.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { adresseDuSite, chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Partage, PhotoArrivee } from './Arrivee'

export function Faceid() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const session = useSession()
  const nouveau = params.get('nouveau') === '1'
  const android = params.get('os') === 'android' || /android/i.test(navigator.userAgent)
  const next = params.get('next')
  const suite = next ? (next.startsWith('#') ? adresseDuSite(next) : next) : chemin('accueil')
  const [deja, setDeja] = useState(false)
  const [attente, setAttente] = useState(false)
  useEffect(() => {
    source
      .securite()
      .then((s) => setDeja(s.biometrie))
      .catch(() => {})
  }, [])
  const activer = async () => {
    if (attente) return
    setAttente(true)
    await new Promise((r) => setTimeout(r, 600))
    await source.reglerBiometrie(true)
    naviguer(suite, { replace: true })
  }
  const prenom = session.client?.prenom
  const icone = android ? 'fingerprint' : 'scan-face'
  return (
    <Ecran route="faceid" gabarit="arrivee">
      <Styles id="bf169d62ab" />
      <Partage visuel={<PhotoArrivee />}>
        <div className="ax">
          <div className="ax-fid">
            <Icone nom={icone} taille={50} trait={1.6} />
          </div>
          <h1 style={{ textAlign: 'center' }}>
            {nouveau && prenom && (
              <>
                {tf('C’est fait, {p} !', { p: prenom })}
                <br />
              </>
            )}
            {t(android ? 'Reconnecte-toi avec ton empreinte' : 'Reconnecte-toi en un regard')}
          </h1>
          <div className="ax-pts">
            <div>
              <Icone nom="circle-check" taille={20} />
              <span>{t('Plus besoin de code ni de mot de passe à chaque ouverture.')}</span>
            </div>
            <div>
              <Icone nom="circle-check" taille={20} />
              <span>{t(android ? 'Tes paiements au-delà de 50 000 F et ton code de retrait se déverrouillent avec ton doigt.' : 'Tes paiements au-delà de 50 000 F et ton code de retrait se déverrouillent avec ton visage.')}</span>
            </div>
            <div>
              <Icone nom="circle-check" taille={20} />
              <span>{t(android ? 'Ton empreinte reste dans ton téléphone. BelivaY ne la voit jamais.' : 'Ton visage reste dans ton téléphone. BelivaY ne le voit jamais.')}</span>
            </div>
          </div>
          <div className="ax-foot">
            {deja ? (
              <div className="note green">
                <Icone nom="circle-check" taille={18} />
                <div>{t('Déjà activé sur ce compte.')}</div>
              </div>
            ) : (
              <div className="btns">
                <button type="button" className={'btn primary' + (attente ? ' off' : '')} onClick={activer}>
                  <Icone nom={icone} taille={18} />
                  <span>{t(attente ? 'Vérification…' : android ? 'Activer l’empreinte' : 'Activer Face ID')}</span>
                </button>
              </div>
            )}
            <div className="btns">
              <Link to={suite} replace className="btn ghost">
                <span>{t(deja ? 'Continuer' : 'Plus tard')}</span>
              </Link>
            </div>
            <p className="ax-legal">
              {t('Sans Face ID ni empreinte sur ton téléphone, tu te reconnectes avec un code reçu par SMS ou ton mot de passe, et ton téléphone demande son propre code pour les gros paiements.')}
            </p>
            <p className="ax-legal">
              {t('Tu peux changer ce choix dans ')}
              <Link to={chemin('securite')}>{t('Réglages › Sécurité')}</Link>
              {t('.')}
            </p>
          </div>
        </div>
      </Partage>
    </Ecran>
  )
}
