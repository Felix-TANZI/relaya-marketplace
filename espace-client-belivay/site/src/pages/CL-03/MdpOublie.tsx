// Écran « Mot de passe oublié » (CL-03, 3.2), balisage et logique du prototype du 1er octobre (route mdp-oublie),
// repris à la main et rendu logique (DP-53) : l'adresse (proposée par l'appareil, ou tapée) est vérifiée, puis le
// lien part par e-mail seulement, jamais par SMS ; la réponse est la même que l'adresse ait un compte ou non.
// « Renvoyer le lien » le redemande vraiment. « ?st=envoye » : l'état du prototype (démonstration).
// Ce qu'il faut au client (DP-54) : la règle du nouveau mot de passe (DP-04), ce qui se passe après (autres
// appareils déconnectés), « Changer d'adresse », et sans accès à l'e-mail la connexion par numéro ou l'aide.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { Partage, PhotoArrivee } from './Arrivee'

export function MdpOublie() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [propose, setPropose] = useState<string | null | undefined>(undefined)
  const [email, setEmail] = useState<string | null>(null) // null : l'adresse proposée par l'appareil
  const [envoye, setEnvoye] = useState<{ destination: string; valideMinutes: number } | null>(null)
  const [erreur, setErreur] = useState(false)
  const [renvoye, setRenvoye] = useState(false)
  useEffect(() => {
    Promise.all([source.compteRetenu(), source.compteConnu()]).then(([r, c]) => setPropose(r?.emailMasque ?? c?.emailMasque ?? null))
  }, [])
  if (propose === undefined) return null
  const valeur = email ?? propose ?? ''
  const demander = async () => {
    // Adresse proposée (masquée) : celle du compte de l'appareil.
    const adresse = email === null && propose ? null : valeur.trim()
    if (adresse !== null && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(adresse)) return setErreur(true)
    setEnvoye(await source.demanderLienMdp(adresse))
  }
  const fait = envoye ?? (params.get('st') === 'envoye' ? { destination: propose ?? 'c•••••@gmail.com', valideMinutes: 30 } : null)
  // Sans accès à cette adresse : la connexion par code au numéro vérifié, ou l'aide.
  const sansEmail = (
    <div className="card tight mt16">
      <Link to={chemin('numero', { from: 'connexion' })} className="li">
        <span className="ic">
          <Icone nom="smartphone" taille={20} />
        </span>
        <span className="grow">
          <span className="lt" style={{ display: 'block' }}>
            {t('Plus accès à cette adresse ?')}
          </span>
          <span className="ls">{t('Connecte-toi avec un code envoyé à ton numéro vérifié.')}</span>
        </span>
        <span className="chev">
          <Icone nom="chevron-right" taille={18} />
        </span>
      </Link>
      <Link to={chemin('aide')} className="li">
        <span className="ic">
          <Icone nom="headset" taille={20} />
        </span>
        <span className="grow">
          <span className="lt" style={{ display: 'block' }}>
            {t('Besoin d’aide ?')}
          </span>
          <span className="ls">{t('Le support répond de 7 h à 21 h, 7 jours sur 7.')}</span>
        </span>
        <span className="chev">
          <Icone nom="chevron-right" taille={18} />
        </span>
      </Link>
    </div>
  )

  if (fait)
    return (
      <Ecran route="mdp-oublie" parEtat etat="mdp-oublie?st=envoye" gabarit="arrivee">
        <Styles id="f16ded0d4c" />
        <Partage visuel={<PhotoArrivee />}>
          <div className="cl03-center">
            <div className="cl03-bigic green">
              <Icone nom="mail" taille={34} />
            </div>
            <h1 className="pg-t" style={{ marginTop: '14px' }}>
              {t('Regarde tes e-mails')}
            </h1>
            <p className="pg-s">
              {tf('Si {email} a un compte BelivaY, un lien vient de partir. Il marche {n} minutes.', { email: fait.destination, n: fait.valideMinutes })}
            </p>
          </div>
          <div className="mt16">
            <Link to={chemin('connexion-email')} className="btn primary">
              <Icone nom="log-in" taille={18} />
              <span>{t('Revenir à la connexion')}</span>
            </Link>
          </div>
          <p className="cl03-legal">
            {t('Rien reçu ? Regarde dans les courriers indésirables.')}
            <br />
            <a
              href={chemin('mdp-oublie', { st: 'envoye' })}
              className="cl03-link"
              onClick={async (e) => {
                e.preventDefault()
                if (envoye) await demander()
                setRenvoye(true)
              }}
            >
              {t('Renvoyer le lien')}
            </a>
            {' · '}
            <a
              href={chemin('mdp-oublie')}
              className="cl03-link"
              onClick={(e) => {
                e.preventDefault()
                setEnvoye(null)
                setRenvoye(false)
                setEmail('')
                naviguer(chemin('mdp-oublie'), { replace: true })
              }}
            >
              {t('Changer d’adresse')}
            </a>
          </p>
          {renvoye && (
            <div className="hint-l" role="status">
              <Icone nom="check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t('Un nouveau lien vient de partir ; l’ancien ne marche plus.')}</span>
            </div>
          )}
          <div className="hint-l">
            <Icone nom="key-round" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Le lien ouvre une page pour choisir ton nouveau mot de passe : 8 caractères au moins, dont un chiffre. Ensuite, tes autres appareils sont déconnectés.')}</span>
          </div>
          {sansEmail}
        </Partage>
      </Ecran>
    )

  return (
    <Ecran route="mdp-oublie" parEtat etat="mdp-oublie" gabarit="arrivee">
      <Styles id="f16ded0d4c" />
      <Partage visuel={<PhotoArrivee />}>
        <div className="pg">
          <h1 className="pg-t">{t('Nouveau mot de passe')}</h1>
          <p className="pg-s">{t('Entre ton adresse e-mail : on t’envoie un lien pour en choisir un.')}</p>
        </div>
        <div className="fld">
          <label htmlFor="mdp-email">{t('E-mail')}</label>
          <div className={'inp' + (erreur ? ' err' : ' focus')}>
            <Icone nom="mail" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
            <input
              id="mdp-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={valeur}
              onFocus={() => email === null && valeur.includes('•') && setEmail('')}
              onChange={(e) => (setEmail(e.target.value), setErreur(false))}
            />
          </div>
          {erreur && (
            <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
              {t('Cette adresse e-mail ne semble pas complète : vérifie-la.')}
            </div>
          )}
        </div>
        <div className="mt16">
          <a href={chemin('mdp-oublie', { st: 'envoye' })} className="btn primary" onClick={(e) => (e.preventDefault(), demander())}>
            <Icone nom="send" taille={18} />
            <span>{t('Recevoir le lien')}</span>
          </a>
        </div>
        <div className="hint-l">
          <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Le lien arrive par e-mail seulement, jamais par SMS.')}</span>
        </div>
        <div className="hint-l">
          <Icone nom="shield-alert" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('BelivaY ne te demande jamais ton mot de passe ni un code par téléphone.')}</span>
        </div>
        {sansEmail}
      </Partage>
    </Ecran>
  )
}
