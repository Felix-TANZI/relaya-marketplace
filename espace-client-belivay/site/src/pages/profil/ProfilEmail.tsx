// « Changer d’e-mail » (DP-52), sur le modèle de « Changer de numéro » (CIN-39) : deux codes, sinon rien ne
// change. Étape 1 : la nouvelle adresse ; étape 2 : un code par SMS au numéro vérifié (c'est bien la
// cliente) ; étape 3 : un code à la nouvelle adresse (elle est bien à elle) ; ?st=ok : l'adresse est changée,
// reçus et messages y partent désormais. Un e-mail = un compte (CIN-16) : le serveur refuse une adresse prise.
// Ce qu'il faut au client (DP-54) : l'adresse déjà prise refusée avant tout code, ce qui change et ce qui ne
// change pas, et « Garder mon adresse » qui arrête le parcours à chaque étape.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { SaisieCode, useEnvoiCode } from '../../composants/SaisieCode'
import { Bouton, Vide } from '../../composants/socle'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type EnvoiCode } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useMajClient, useSession } from '../../session'
import { EcranCompte } from '../CL-13/Larges'

const ETAT = 'blv_profil_email'
type Parcours = { email: string; envoi: EnvoiCode | null }
const lire = (): Parcours | null => {
  try {
    return JSON.parse(sessionStorage.getItem(ETAT) || 'null') as Parcours | null
  } catch {
    return null
  }
}
const garder = (v: Parcours | null) => {
  try {
    if (v) sessionStorage.setItem(ETAT, JSON.stringify(v))
    else sessionStorage.removeItem(ETAT)
  } catch {
    // Stockage refusé : le parcours vit le temps de l'écran.
  }
}
const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Barre d'étapes du prototype (« Changer de numéro »), suivie de son espace de 10 px.
function Etapes({ n }: { n: 1 | 2 | 3 }) {
  return (
    <>
      <div className="cl03-stepbar">
        <div className="steps">
          {[1, 2, 3].map((i) => (
            <i key={i} className={i < n ? 'on' : i === n ? 'cur' : ''} />
          ))}
        </div>
      </div>
      <div style={{ height: 10 }}></div>
    </>
  )
}

export function ProfilEmail() {
  const { t } = usePreferences()
  const client = useSession().client!
  const majClient = useMajClient()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const etape = params.get('etape')
  const st = params.get('st')
  const [parcours, setParcours] = useState<Parcours>(() => lire() ?? { email: '', envoi: null })
  const [vu, setVu] = useState(false)
  const [prise, setPrise] = useState<string | null>(null) // adresse refusée par le serveur (un e-mail = un compte)
  const envoyerCode = useEnvoiCode()
  const majParcours = (p: Parcours) => (setParcours(p), garder(p))

  // Une étape ouverte sans son code envoyé (lien gardé, onglet neuf) : retour à la première étape.
  useEffect(() => {
    if ((etape === '2' || etape === '3') && !parcours.envoi) naviguer(chemin('profil-email'), { replace: true })
  }, [etape, parcours.envoi, naviguer])

  const email = parcours.email.trim().toLowerCase()
  const erreur = !email
    ? 'Écris ta nouvelle adresse e-mail.'
    : !EMAIL_VALIDE.test(email)
      ? 'Cette adresse n’a pas la bonne forme (exemple : nom@domaine.com).'
      : email === client.email.toLowerCase()
        ? 'C’est déjà ton adresse e-mail.'
        : email === prise
          ? 'Cette adresse a déjà un compte BelivaY : choisis-en une autre.'
          : null

  const continuer = async () => {
    setVu(true)
    if (erreur) return
    const v = await source.verifierNouvelEmail(email)
    if (!v.ok) return setPrise(email)
    const envoi = await envoyerCode('email-sms', () => source.envoyerCode('email-sms'))
    if (!envoi) return
    majParcours({ email, envoi })
    naviguer(chemin('profil-email', { etape: '2' }))
  }

  // Garder mon adresse : le parcours s'arrête, rien n'a changé.
  const garderAdresse = (
    <div className="cl03-center">
      <a
        href={chemin('profil')}
        className="cl03-link"
        onClick={(e) => {
          e.preventDefault()
          garder(null)
          naviguer(chemin('profil'), { replace: true })
        }}
      >
        {t('Garder mon adresse actuelle')}
      </a>
    </div>
  )

  if (st === 'ok')
    return (
      <EcranCompte colonne={560} route="profil-email">
        <Styles id="0b0ccec1e3" />
        <Vide
          icone="check"
          titre={t('Ton e-mail est changé')}
          texte={t('Tes reçus et nos messages partent maintenant à ') + client.emailMasque + '.'}
        />
        <div className="mt16">
          <Bouton vers={chemin('profil')} icone="user-round">
            {t('Retour à mon profil')}
          </Bouton>
        </div>
        <div className="mt10">
          <Bouton vers={chemin('compte')} genre="secondary">
            {t('Retour à mon compte')}
          </Bouton>
        </div>
      </EcranCompte>
    )

  if (etape === '2' && parcours.envoi)
    return (
      <EcranCompte colonne={560} route="profil-email" sousTitre="Étape 2 sur 3">
        <Styles id="f16ded0d4c" />
        <Etapes n={2} />
        <SaisieCode
          key="sms"
          titre="D’abord, le code reçu par SMS"
          envoi={parcours.envoi}
          bouton="Continuer"
          valider={(code) => source.verifierCodeEmail(code)}
          renvoyer={async () => {
            const e = await source.envoyerCode('email-sms')
            majParcours({ ...parcours, envoi: e })
            return e
          }}
          reussi={async () => {
            const e = await source.envoyerCode('email-adresse', parcours.email)
            majParcours({ ...parcours, envoi: e })
            naviguer(chemin('profil-email', { etape: '3' }), { replace: true })
          }}
        />
        <div className="hint-l">
          <Icone nom="shield-check" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t('Ce code prouve que c’est bien toi qui changes ton adresse.')}</span>
        </div>
        {garderAdresse}
      </EcranCompte>
    )

  if (etape === '3' && parcours.envoi)
    return (
      <EcranCompte colonne={560} route="profil-email" sousTitre="Étape 3 sur 3">
        <Styles id="f16ded0d4c" />
        <Etapes n={3} />
        <SaisieCode
          key="email"
          titre="Puis, le code reçu par e-mail"
          envoi={parcours.envoi}
          modifier={
            <Link to={chemin('profil-email')} className="cl03-link">
              {t('Modifier')}
            </Link>
          }
          bouton="Changer mon e-mail"
          valider={(code) => source.confirmerEmail(parcours.email, code)}
          renvoyer={async () => {
            const e = await source.envoyerCode('email-adresse', parcours.email)
            majParcours({ ...parcours, envoi: e })
            return e
          }}
          reussi={(r) => {
            garder(null)
            majClient(r.client)
            naviguer(chemin('profil-email', { st: 'ok' }), { replace: true })
          }}
        />
        <div className="hint-l">
          <Icone nom="mail" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t('Pas reçu ? Regarde dans les courriers indésirables.')}</span>
        </div>
        {garderAdresse}
      </EcranCompte>
    )

  return (
    <EcranCompte colonne={560} route="profil-email" sousTitre="Étape 1 sur 3">
      <Styles id="f16ded0d4c" />
      <Etapes n={1} />
      <h1 className="pg-t">{t('Ta nouvelle adresse e-mail')}</h1>
      <p className="pg-s">{t('Aujourd’hui : ') + client.emailMasque + (client.connexion === 'google' ? ' · Google' : '') + '.'}</p>
      <div className="fld" style={{ marginTop: 14 }}>
        <label htmlFor="pf-email">{t('Nouvel e-mail')}</label>
        <div className={'inp' + (vu && erreur ? ' err' : '')}>
          <Icone nom="mail" taille={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          <input
            id="pf-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nom@domaine.com"
            value={parcours.email}
            onChange={(e) => (setParcours((p) => ({ ...p, email: e.target.value })), setPrise(null))}
            onKeyDown={(e) => e.key === 'Enter' && continuer()}
          />
        </div>
        <div className="hint" style={vu && erreur ? { color: 'var(--red)' } : undefined}>
          {t(vu && erreur ? erreur : 'Tes reçus et nos messages partiront à cette adresse.')}
        </div>
      </div>
      <div className="mt16">
        <Bouton icone="arrow-right" inactif={vu && !!erreur} onClick={continuer}>
          {t('Continuer')}
        </Bouton>
      </div>
      <div className="hint-l">
        <Icone nom="shield-check" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{t('Deux codes : un par SMS au ') + client.numeroMasque + t(', un à la nouvelle adresse. Sans les deux, rien ne change.')}</span>
      </div>
      {client.connexion === 'google' && (
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t('Tu peux toujours te connecter avec Google.')}</span>
        </div>
      )}
      <div className="sec">
        <h2>{t('Ce qui change')}</h2>
      </div>
      <div className="card tight">
        {[
          ['receipt', 'Tes reçus, tes factures et nos messages partent à la nouvelle adresse.'],
          ['log-in', 'Pour te connecter par e-mail, tu utilises la nouvelle adresse, avec ton mot de passe actuel.'],
          ['package', 'Tes commandes, ton portefeuille et ton numéro ne changent pas.'],
        ].map(([i, x]) => (
          <div key={x} className="li">
            <span className="ic">
              <Icone nom={i} taille={20} />
            </span>
            <span className="grow">
              <span className="ls" style={{ display: 'block' }}>
                {t(x)}
              </span>
            </span>
          </div>
        ))}
      </div>
      {garderAdresse}
    </EcranCompte>
  )
}
