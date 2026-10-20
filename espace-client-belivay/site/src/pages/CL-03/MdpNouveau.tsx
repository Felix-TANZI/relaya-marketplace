// Page « Nouveau mot de passe » (CL-03, suite de « Mot de passe oublié ») : la page qu'ouvre le lien reçu par e-mail
// (/mdp-nouveau?jeton=…), propre au site, dans le style des pages d'arrivée (gabarit arrivee, photo à côté en
// large). Le client choisit son mot de passe selon la règle DP-04 (8 caractères au moins, dont un chiffre, cochés
// pendant la saisie), le confirme, peut l'afficher (œil) ; le serveur vérifie le jeton (usage unique, 30 min) :
// lien périmé ou invalide → un nouveau lien ; succès → les autres appareils sont déconnectés, puis la connexion.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { Partage, PhotoArrivee } from './Arrivee'

// Règle DP-04, la même que « Numéro et connexion » et l'inscription (le serveur la refait).
const REGLE: [(m: string) => boolean, string][] = [
  [(m) => m.length >= 8, '8 caractères'],
  [(m) => /\d/.test(m), 'un chiffre'],
]
const jetonBienForme = (j: string | null) => !!j && /^[A-Za-z0-9_-]{8,}$/.test(j)

export function MdpNouveau() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const jeton = params.get('jeton')
  const [mdp, setMdp] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [voir, setVoir] = useState(false)
  const [vu, setVu] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [issue, setIssue] = useState<'expire' | 'invalide' | { email: string } | null>(jetonBienForme(jeton) ? null : 'invalide')
  const [regleServeur, setRegleServeur] = useState(false)

  const regleOk = REGLE.every(([ok]) => ok(mdp))
  const erreurMdp = vu && !regleOk ? 'Ton mot de passe : 8 caractères au moins, dont un chiffre.' : regleServeur ? 'Ton mot de passe : 8 caractères au moins, dont un chiffre.' : null
  const erreurConf = vu && regleOk && confirmation !== mdp ? 'Les deux mots de passe ne sont pas les mêmes.' : null

  const enregistrer = async () => {
    setVu(true)
    if (!regleOk || confirmation !== mdp || envoi || !jeton) return
    setEnvoi(true)
    const r = await source.nouveauMotDePasse(jeton, mdp)
    setEnvoi(false)
    if (r.ok) return setIssue({ email: r.email })
    if (r.raison === 'regle') return setRegleServeur(true)
    setIssue(r.raison)
  }

  const oeil = (
    <span className="suf">
      <span
        role="button"
        tabIndex={0}
        aria-label={t(voir ? 'Cacher le mot de passe' : 'Afficher le mot de passe')}
        aria-pressed={voir}
        onClick={() => setVoir(!voir)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setVoir(!voir))}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', marginRight: '-10px' }}
      >
        <Icone nom={voir ? 'eye-off' : 'eye'} taille={18} />
      </span>
    </span>
  )

  // Lien périmé ou invalide : rien n'a changé, un nouveau lien se demande en un geste.
  if (issue === 'expire' || issue === 'invalide')
    return (
      <Ecran route="mdp-nouveau" gabarit="arrivee">
        <Styles id="f16ded0d4c" />
        <Partage visuel={<PhotoArrivee />}>
          <div className="cl03-center">
            <div className="cl03-bigic">
              <Icone nom={issue === 'expire' ? 'clock' : 'link'} taille={34} />
            </div>
            <h1 className="pg-t" style={{ marginTop: '14px' }}>
              {t(issue === 'expire' ? 'Ce lien a expiré' : 'Ce lien ne marche pas')}
            </h1>
            <p className="pg-s">
              {t(
                issue === 'expire'
                  ? 'Un lien sert 30 minutes, une seule fois. Ton mot de passe n’a pas changé : demande un nouveau lien.'
                  : 'Il a peut-être déjà servi, ou il est incomplet. Ton mot de passe n’a pas changé : demande un nouveau lien.',
              )}
            </p>
          </div>
          <div className="mt16">
            <Link to={chemin('mdp-oublie')} className="btn primary">
              <Icone nom="send" taille={18} />
              <span>{t('Recevoir un nouveau lien')}</span>
            </Link>
          </div>
          <div className="mt10">
            <Link to={chemin('connexion-email')} className="btn ghost">
              <span>{t('Revenir à la connexion')}</span>
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Ouvre toujours le dernier e-mail reçu : chaque nouveau lien remplace l’ancien.')}</span>
          </div>
        </Partage>
      </Ecran>
    )

  // Succès : les autres appareils sont déconnectés ; la connexion se fait avec le nouveau mot de passe.
  if (issue)
    return (
      <Ecran route="mdp-nouveau" gabarit="arrivee">
        <Styles id="f16ded0d4c" />
        <Partage visuel={<PhotoArrivee />}>
          <div className="cl03-center">
            <div className="cl03-bigic green">
              <Icone nom="circle-check" taille={34} />
            </div>
            <h1 className="pg-t" style={{ marginTop: '14px' }}>
              {t('Mot de passe changé')}
            </h1>
            <p className="pg-s">{tf('Connecte-toi avec {email} et ton nouveau mot de passe.', { email: issue.email })}</p>
          </div>
          <div className="mt16">
            <Link to={chemin('connexion-email')} className="btn primary" replace>
              <Icone nom="log-in" taille={18} />
              <span>{t('Me connecter')}</span>
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="log-out" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Tes autres appareils sont déconnectés : reconnecte-les avec ce mot de passe.')}</span>
          </div>
        </Partage>
      </Ecran>
    )

  return (
    <Ecran route="mdp-nouveau" gabarit="arrivee">
      <Styles id="f16ded0d4c" />
      <Partage visuel={<PhotoArrivee />}>
        <div className="pg">
          <h1 className="pg-t">{t('Choisis ton nouveau mot de passe')}</h1>
          <p className="pg-s">{t('Il remplace l’ancien sur tous tes appareils.')}</p>
        </div>
        <div className="fld">
          <label htmlFor="mn-mdp">{t('Nouveau mot de passe')}</label>
          <div className={'inp' + (erreurMdp ? ' err' : ' focus')}>
            <Icone nom="key-round" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
            <input
              id="mn-mdp"
              type={voir ? 'text' : 'password'}
              autoComplete="new-password"
              value={mdp}
              onChange={(e) => (setMdp(e.target.value), setRegleServeur(false))}
              onKeyDown={(e) => e.key === 'Enter' && enregistrer()}
            />
            {oeil}
          </div>
          {erreurMdp ? (
            <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
              {t(erreurMdp)}
            </div>
          ) : (
            <div className="hint">
              {REGLE.map(([ok, x]) => (
                <span key={x} style={{ color: ok(mdp) ? 'var(--green)' : 'var(--ink-3)', marginRight: 10 }}>
                  <Icone nom={ok(mdp) ? 'circle-check' : 'circle'} taille={13} style={{ verticalAlign: '-2px', marginRight: 3 }} />
                  {t(x)}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="fld">
          <label htmlFor="mn-conf">{t('Confirme le mot de passe')}</label>
          <div className={'inp' + (erreurConf ? ' err' : '')}>
            <Icone nom="lock" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
            <input
              id="mn-conf"
              type={voir ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enregistrer()}
            />
          </div>
          {erreurConf && (
            <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
              {t(erreurConf)}
            </div>
          )}
        </div>
        <div className="mt16">
          <button type="button" className={'btn primary' + (envoi ? ' off' : '')} onClick={enregistrer}>
            <Icone nom="check" taille={18} />
            <span>{t('Enregistrer mon mot de passe')}</span>
          </button>
        </div>
        <div className="hint-l">
          <Icone nom="log-out" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Une fois enregistré, tes autres appareils sont déconnectés.')}</span>
        </div>
        <div className="hint-l">
          <Icone nom="shield-alert" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('BelivaY ne te demande jamais ton mot de passe ni un code par téléphone.')}</span>
        </div>
      </Partage>
    </Ecran>
  )
}
