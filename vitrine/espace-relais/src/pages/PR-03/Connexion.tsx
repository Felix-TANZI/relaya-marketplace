// Connexion (PR-03 § 1 ; écran plein, sans en-tête ni barre : ARL-27). Le serveur dit où en est CET appareil
// (session.ecranConnexion) ; l'écran ne garde que la saisie en cours. Parcours :
// - numéro (+237) → appareil connu : PIN ; nouvel appareil : code SMS à 6 chiffres d'abord (PAR-02, CNX-02) ;
// - code SMS (nouvel appareil ou PIN oublié) : valable OTP-DUREE, renvoi après OTP-RENVOI, sms_essais_code essais ;
// - PIN à PIN-LONGUEUR chiffres (ARL-12) : « Bonjour Rose », pavé, PIN-ESSAIS faux de suite → blocage
//   PR-PIN-BLOCAGE-MIN minutes avec le temps restant (PR03-R03), le gérant est prévenu (CNX-03) ;
// - nouveau PIN (premier appareil sans PIN, PIN oublié) : deux saisies, codes trop simples refusés (INV-02) ;
// - session close après PR-SESSION-J jours sans ouvrir l'application (CNX-04, ARL-141) : l'appareil reste lié, le PIN
//   suffit à reprendre, l'écran le dit. Pas d'empreinte digitale : le paquet ne la prévoit que pour le client (RET-07).
// Numéro inconnu : « Ce numéro n'est lié à aucun relais » et « Devenir point relais » (critère 1) ; numéro d'une
// candidature : son espace s'ouvre à l'activation (ARL-50). Liens visibles sans être connecté (CNX-05).
// Présentation (refonte du 25 oct. 2026, ACCES-REFERENCES.md) : cadre d'accès commun (compte/acces.tsx) ; en tête de la
// carte, « Se connecter » et « Devenir point relais » (Inscription) ; l'invitation d'un membre en lien discret. Numéro :
// champ +237, « Continuer », rappel de la double vérification ; PIN : salut, points, pavé, « Changer de numéro » et
// « PIN oublié ? », « Se connecter » ; code SMS et nouveau PIN : mode compact au téléphone. Démonstration : Rose M.
// Comptes réels (source « hybride », site/COMPTES-REELS.md) : le même écran numéro → PIN, branché par l'adaptateur
// (session-hybride.ts : le numéro lie l'appareil, le PIN ouvre la session réelle, pas de SMS) ; un relais « en attente
// de validation » voit AccesAttente au lieu d'entrer ; le lien « mot de passe oublié » (?reinitialiser=) ouvre
// ReinitialiserReel. Le compte réel ouvre la démonstration sous son nom.
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { env } from '@client/config/env'
import { ConnexionCompte } from '@client/compte/Connexion'
import { Kit } from '@client/compte/socle'
import logo from '../../assets/logo-belivay.png'
import { cleCompte, departMembre, membreDeLAppareil, ouvrirParCompte } from '../../demo/session'
import { Ecran } from '../../composants/coque'
import { signal } from '../../composants/signaux'
import { ACCUEIL, chemin } from '../../config/pages'
import type { EcranConnexion, RefusCode, RefusConnexion } from '../../donnees/domaines/session'
import { origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useRelireSession, useSession } from '../../session'
import { Chargement, ErreurLecture, Note, Pave, PiedRelais, Points, ecrireNumero, mmss, useMaintenant, useSaisie, useSecondes, type Ton } from './commun'
import { ACCES, CONNEXION } from './parametres'
import './pr03.css'
import { Acces, AccesCadre, AccesChemins, AccesDemo, AccesLiens, AccesTitre } from '@client/compte/acces'
import type { SessionReelle } from '@client/comptes-reels/client'
import { hybride, sessionReelle } from '@client/comptes-reels/hybride'
import { AccesAttente, ReinitialiserReel } from '@client/compte/acces-reel'

type Message = { ton: Ton; texte: string } | null

export default function Connexion() {
  const prefs = usePreferences()
  const { t } = prefs
  const lecture = useLecture(() => source.session.ecranConnexion(), [])
  const session = useSession()
  const relireSession = useRelireSession()
  const naviguer = useNavigate()
  const [params, setParams] = useSearchParams()
  const parEmail = params.get('par') === 'email'
  // Comptes réels (hybride seulement) : lien de réinitialisation, compte en attente de validation.
  const jetonReinit = hybride ? params.get('reinitialiser') : null
  const [attente, setAttente] = useState<SessionReelle | null>(null)
  useEffect(() => {
    if (!hybride || !session.connecte) return
    let vivant = true
    void sessionReelle('relais').then((r) => vivant && r?.user.statut === 'en_attente' && setAttente(r))
    return () => {
      vivant = false
    }
  }, [session.connecte])

  // La page demandée avant la connexion (App.tsx) ; jamais une adresse hors de l'application.
  const next = params.get('next')
  const ouvrir = async () => {
    // Compte réel ouvert par le PIN mais pas encore validé par BelivaY : on le dit, au lieu d'entrer.
    if (hybride) {
      const reel = await sessionReelle('relais')
      if (reel?.user.statut === 'en_attente') return setAttente(reel)
    }
    signal('succes')
    const s = await source.session.session()
    await relireSession()
    // Relais pas encore actif (candidat, en configuration) : ses étapes d'activation d'abord (ARL-27).
    const actif = s.relais && s.relais.statut !== 'candidat' && s.relais.statut !== 'en_configuration'
    const vers = !actif ? chemin('activation') : next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/connexion') ? next : chemin(ACCUEIL)
    naviguer(vers, { replace: true })
  }

  // Écran d'entrée : numéro (accroche et photo), e-mail, et le PIN du téléphone lié tant qu'il n'est pas bloqué
  // (compact au téléphone, comme le code SMS et le nouveau PIN).
  const e = lecture.donnees
  const enCours = !!e && (e.etape === 'code' || e.etape === 'nouveau_pin')
  const versEmail = parEmail && !!e && !enCours
  const entree = !jetonReinit && !attente && !!e && !enCours && (versEmail || e.etape !== 'pin' || !e.pin.bloqueJusqua)
  const vitrine = entree && (versEmail || e!.etape !== 'pin')
  // En attendant la validation : la démonstration sous le nom du compte réel (session-hybride.ts), puis le guichet.
  const decouvrir = async () => {
    const m = await import('../../demo/session')
    m.ouvrirParCompte(m.membreDeLAppareil())
    signal('succes')
    await relireSession()
    naviguer(chemin(ACCUEIL), { replace: true })
  }
  if (jetonReinit || attente)
    return (
      <Ecran route="connexion">
        <AccesCadre acteur="relais" logo={logo} espace={t('Espace point relais')} reglages={prefs} compact pied={<PiedRelais />}>
          {jetonReinit ? (
            <ReinitialiserReel espace="relais" jeton={jetonReinit} codeAccepte versConnexion={() => setParams({}, { replace: true })} />
          ) : (
            <AccesAttente
              qui={attente!.user.organisation || t('votre point relais')}
              email={attente!.user.email}
              continuer={() => (setAttente(null), void decouvrir())}
              deconnecter={async () => {
                await source.session.deconnecter()
                await relireSession()
                setAttente(null)
              }}
            />
          )}
        </AccesCadre>
      </Ecran>
    )
  return (
    <Ecran route="connexion">
      <AccesCadre acteur="relais" logo={logo} espace={t('Espace point relais')} reglages={prefs} compact={!vitrine} pied={<PiedRelais />}>
        <Acces>
          <div className="pr3 pr3-pile">
            {entree && (
              <AccesChemins
                actif="connexion"
                label={t('Se connecter ou devenir point relais')}
                connexion={
                  <Link to={chemin('connexion')} replace>
                    {t('Se connecter')}
                  </Link>
                }
                inscription={<Link to={chemin('inscription')}>{t('Devenir point relais')}</Link>}
              />
            )}
            {session.connecte && (
              <Note ton="accent">
                {t('Vous êtes déjà connecté·e sur ce téléphone.')}{' '}
                <Link to={chemin(ACCUEIL)} className="pr3-lien">
                  {t('Revenir au guichet')}
                </Link>
              </Note>
            )}
            {lecture.erreur ? (
              <ErreurLecture relire={lecture.relire} />
            ) : !e ? (
              <Chargement />
            ) : versEmail ? (
              <div>
                <Kit couleur="#B24F00" texte="var(--acc-txt)">
                  <ConnexionCompte
                    app={cleCompte(membreDeLAppareil())}
                    depart={departMembre(membreDeLAppareil())}
                    ouvrir={() => {
                      ouvrirParCompte(membreDeLAppareil())
                      void ouvrir()
                    }}
                  />
                </Kit>
                <AccesLiens label={t('Autres façons d’entrer')}>
                  <button type="button" onClick={() => setParams({}, { replace: true })}>
                    {t('Revenir au numéro')}
                  </button>
                </AccesLiens>
              </div>
            ) : (
              <>
                <Parcours e={e} relire={lecture.relire} ouvrir={ouvrir} />
                {(e.etape === 'numero' || e.etape === 'pin') && (
                  <AccesLiens label={t('Autres façons d’entrer')}>
                    {/* Connexion par e-mail, lien ou Google : kit « compte » de la démonstration ; le serveur ne l'offre pas au relais. */}
                    {env.source !== 'api' && (
                      <button type="button" data-ck="par-email" onClick={() => setParams({ par: 'email' }, { replace: true })}>
                        {t('Se connecter avec un e-mail')}
                      </button>
                    )}
                    {e.etape === 'numero' && <Link to={chemin('invitation')}>{t('J’ai reçu une invitation')}</Link>}
                  </AccesLiens>
                )}
              </>
            )}
            {env.source !== 'api' && e && (
              <AccesDemo
                qui={t('Rose M. · gérante · Relais Bastos Carrefour')}
                connecter={async () => {
                  // Démonstration seulement : le PIN d'essai de Rose M., vérifié comme une saisie (src/demo/personnage.ts).
                  const { connecterPersonnage, REFUS_PERSONNAGE } = await import('../../demo/personnage')
                  const r = await connecterPersonnage()
                  if (r.ok) {
                    await ouvrir()
                    return null
                  }
                  return t(REFUS_PERSONNAGE)
                }}
              />
            )}
          </div>
        </Acces>
      </AccesCadre>
    </Ecran>
  )
}

function Parcours({ e, relire, ouvrir }: { e: EcranConnexion; relire: () => void; ouvrir: () => void }) {
  if (e.etape === 'code') return <CodeSms e={e} relire={relire} />
  if (e.etape === 'nouveau_pin') return <NouveauPin e={e} ouvrir={ouvrir} />
  if (e.etape === 'pin') return <Pin e={e} relire={relire} ouvrir={ouvrir} />
  return <Numero relire={relire} />
}

// ---------- Numéro ----------

function Numero({ relire }: { relire: () => void }) {
  const { t, tf } = usePreferences()
  const enLigne = useEnLigne()
  const maintenant = useMaintenant()
  const [numero, setNumero] = useState('')
  const [refus, setRefus] = useState<RefusConnexion | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const continuer = async () => {
    if (envoi) return
    const n = numero.replace(/\D/g, '')
    if (!/^6\d{8}$/.test(n)) {
      setRefus('numero_invalide')
      return signal('erreur')
    }
    if (!enLigne) return setRefus(null)
    setEnvoi(true)
    try {
      const r = await source.session.commencer(n, origine(maintenant()))
      if (!r.ok) {
        setRefus(r.raison)
        return signal('erreur')
      }
      signal('toucher')
      relire()
    } finally {
      setEnvoi(false)
    }
  }
  const message: Message = !enLigne
    ? { ton: 'ambre', texte: t('Hors connexion : la connexion d’un numéro demande le réseau (code SMS). Réessayez dès que le réseau revient.') }
    : refus === 'numero_invalide'
      ? { ton: 'rouge', texte: t('Entrez un numéro mobile camerounais de 9 chiffres, commençant par 6.') }
      : refus === 'inconnu'
        ? { ton: 'rouge', texte: t('Ce numéro n’est lié à aucun relais') }
        : refus === 'acces_retire'
          ? { ton: 'rouge', texte: t('Votre accès à ce relais a été retiré par le gérant. Demandez-lui une nouvelle invitation.') }
          : refus === 'candidature_en_cours'
            ? { ton: 'accent', texte: tf('Votre demande pour devenir point relais est à l’étude. Votre espace s’ouvre après l’appel de l’agent (sous {h} h) : un SMS vous invite alors à créer votre code PIN.', { h: ACCES.appelCandidatHeures }) }
            : null
  return (
    <>
      <div className="p-yi6rkz">
        <AccesTitre titre={t('Votre numéro')} phrase={t('Entrez le numéro de téléphone enregistré pour votre relais (gérant ou employé).')} />
        <label className="p-ky12xr">
          {t('NUMÉRO DE TÉLÉPHONE')}
          <div className="p-ko4uav">
            <span className="p-im8mop">{'+237'}</span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={ecrireNumero(numero)}
              onChange={(x) => (setNumero(x.target.value.replace(/\D/g, '').replace(/^237/, '').slice(0, 9)), setRefus(null))}
              onKeyDown={(x) => x.key === 'Enter' && void continuer()}
              placeholder={t('6XX XX XX XX')}
              aria-label={t('Numéro')}
              aria-describedby={message ? 'pr3-msg-numero' : undefined}
              aria-invalid={refus === 'numero_invalide' || refus === 'inconnu' || undefined}
              className="p-im8rz3"
            />
          </div>
        </label>
        {message && (
          <Note ton={message.ton} id="pr3-msg-numero">
            {message.texte}
            {refus === 'candidature_en_cours' && (
              <>
                {' '}
                <Link to={chemin('inscription')} className="pr3-lien">
                  {t('Voir ma demande')}
                </Link>
              </>
            )}
          </Note>
        )}
        <button type="button" className="p-ncx7qc" onClick={() => void continuer()} aria-busy={envoi || undefined}>
          {t('Continuer')}
        </button>
      </div>
    </>
  )
}

// ---------- Code SMS (nouvel appareil, PIN oublié) ----------

const TEXTE_CODE: Record<RefusCode, string> = {
  code_faux: 'Code incorrect.',
  expire: 'Ce code a expiré : demandez-en un nouveau.',
  bloque: 'Trop de codes faux : demandez un nouveau code.',
  trop_tot: 'Patientez avant de redemander un code.',
  trop_d_envois: 'Trop de codes envoyés cette heure-ci : réessayez plus tard.',
}

function CodeSms({ e, relire }: { e: EcranConnexion; relire: () => void }) {
  const { t, tf } = usePreferences()
  const maintenant = useMaintenant()
  const enLigne = useEnLigne()
  const c = e.code!
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState<Message>(null)
  const renvoi = useSecondes(c.renvoiA, maintenant)
  const verifier = async (v = code) => {
    if (v.length !== CONNEXION.codeSmsLongueur) {
      setMsg({ ton: 'rouge', texte: tf('Le code a {n} chiffres.', { n: CONNEXION.codeSmsLongueur }) })
      return signal('erreur')
    }
    if (!enLigne) return setMsg({ ton: 'ambre', texte: t('Hors connexion : le code se vérifie avec le réseau.') })
    const r = await source.session.verifierCode(v, origine(maintenant()))
    if (!r.ok) {
      signal('erreur')
      setCode('')
      const reste = c.essaisRestants - 1
      setMsg({ ton: 'rouge', texte: r.raison === 'code_faux' ? t(TEXTE_CODE.code_faux) + ' ' + tf('Il reste {n} essai(s).', { n: Math.max(reste, 0) }) : t(TEXTE_CODE[r.raison]) })
      return relire()
    }
    signal('succes')
    relire()
  }
  const renvoyer = async () => {
    const r = await source.session.renvoyerCode(origine(maintenant()))
    setMsg(r.ok ? { ton: 'vert', texte: tf('Nouveau code envoyé au {numero}.', { numero: c.vers }) } : { ton: 'ambre', texte: t(TEXTE_CODE[r.raison]) })
    relire()
  }
  const retour = async () => {
    await source.session.changerNumero()
    relire()
  }
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h1 className="p-9j1bbu">{c.motif === 'oubli' ? t('PIN oublié') : t('Nouveau téléphone')}</h1>
      </div>
      <div className="p-ug5qrn">{tf('Code envoyé au {numero}, valable {min} minutes.', { numero: c.vers, min: CONNEXION.codeSmsDureeMin })}</div>
      <label className="p-ky12xr">
        {t('CODE REÇU PAR SMS')}
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CONNEXION.codeSmsLongueur}
          placeholder={t('000000')}
          value={code}
          onChange={(x) => {
            const v = x.target.value.replace(/\D/g, '').slice(0, CONNEXION.codeSmsLongueur)
            setCode(v)
            setMsg(null)
            if (v.length === CONNEXION.codeSmsLongueur) void verifier(v)
          }}
          aria-describedby={msg ? 'pr3-msg-code' : undefined}
          className="p-9dfvp5"
        />
      </label>
      {msg && (
        <Note ton={msg.ton} id="pr3-msg-code">
          {msg.texte}
        </Note>
      )}
      <button type="button" className="p-ncx7qc" onClick={() => void verifier()}>
        {c.motif === 'oubli' ? t('Créer un nouveau PIN') : t('Vérifier le code')}
      </button>
      {c.renvoiA !== null && renvoi > 0 ? (
        <button type="button" className="p-rbzobc" disabled aria-describedby="pr3-renvoi">
          {t('Renvoyer le code')}
        </button>
      ) : (
        <button type="button" className="p-rbzobc" onClick={() => void renvoyer()} disabled={c.renvoiA === null}>
          {t('Renvoyer le code')}
        </button>
      )}
      <div id="pr3-renvoi" className="p-16950n">
        {c.renvoiA === null ? t('Trop de codes envoyés cette heure-ci : réessayez plus tard.') : renvoi > 0 ? tf('Nouveau code possible dans {t}.', { t: mmss(renvoi) }) : t('Pas reçu ? Vérifiez le réseau, puis renvoyez le code.')}
      </div>
      <button type="button" className="p-rbzobc" onClick={() => void retour()}>
        {t('Retour')}
      </button>
    </div>
  )
}

// ---------- PIN ----------

function Pin({ e, relire, ouvrir }: { e: EcranConnexion; relire: () => void; ouvrir: () => void }) {
  const { t, tf } = usePreferences()
  const maintenant = useMaintenant()
  const [msg, setMsg] = useState<Message>(null)
  const [erreur, setErreur] = useState(false)
  const bloque = useSecondes(e.pin.bloqueJusqua, maintenant)
  const valider = useCallback(
    async (pin: string) => {
      const r = await source.session.connecter(pin, origine(maintenant()))
      if (r.ok) return ouvrir()
      signal('erreur')
      setErreur(true)
      vider()
      setMsg(
        r.raison === 'bloque'
          ? null
          : r.raison === 'pin_faux'
            ? { ton: 'rouge', texte: tf('PIN incorrect : il reste {n} essai(s) avant le blocage.', { n: Math.max(e.pin.essaisRestants - 1, 0) }) }
            : { ton: 'rouge', texte: t('Votre accès à ce relais a été retiré par le gérant. Demandez-lui une nouvelle invitation.') },
      )
      relire()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [e.pin.essaisRestants],
  )
  const { v, ajouter, effacer, vider } = useSaisie(CONNEXION.pinLongueur, (x) => void valider(x))
  useEffect(() => {
    if (v) setErreur(false)
  }, [v])
  const oublie = async () => {
    const r = await source.session.pinOublie(origine(maintenant()))
    if (!r.ok) setMsg({ ton: 'ambre', texte: t(TEXTE_CODE[r.raison]) })
    relire()
  }
  const changer = async () => {
    await source.session.changerNumero()
    relire()
  }
  const estBloque = e.pin.bloqueJusqua !== null && bloque > 0
  return (
    <>
      <div className="p-txto41">
        <h1 className="p-fdt7cn">{e.prenom ? tf('Bonjour {prenom}', { prenom: e.prenom }) : t('Bonjour')}</h1>
        <div className="p-ietgpj">{e.numero ? tf('Numéro du compte : {numero}.', { numero: e.numero }) : tf('Entrez votre code PIN à {n} chiffres', { n: CONNEXION.pinLongueur })}</div>
      </div>
      {e.sessionExpiree && (
        <Note ton="ambre">{tf('Session fermée : l’application n’a pas été ouverte depuis plus de {j} jours. Entrez votre PIN pour reprendre ; ce téléphone reste lié à votre compte.', { j: e.sessionExpiree.jours })}</Note>
      )}
      <Points n={v.length} total={CONNEXION.pinLongueur} erreur={erreur} />
      {estBloque && (
        <Note ton="rouge">
          {tf('Connexion bloquée après {n} PIN faux : réessayez dans {t}. Le gérant est prévenu.', { n: CONNEXION.pinEssais, t: mmss(bloque) })}
        </Note>
      )}
      {msg && <Note ton={msg.ton}>{msg.texte}</Note>}
      <Pave ajouter={ajouter} effacer={effacer} actif={!estBloque} saisis={v.length} />
      <div className="p-h6lji0">
        <button type="button" className="p-3b809k" onClick={() => void changer()}>
          {t('Changer de numéro')}
        </button>
        <button type="button" className="p-hw1nv0" onClick={() => void oublie()}>
          {t('PIN oublié ?')}
        </button>
      </div>
      <button type="button" className="p-ncx7qc" disabled={estBloque || v.length !== CONNEXION.pinLongueur} onClick={() => void valider(v)}>
        {t('Se connecter')}
      </button>
    </>
  )
}

// ---------- Nouveau PIN ----------

function NouveauPin({ e, ouvrir }: { e: EcranConnexion; ouvrir: () => void }) {
  const { t, tf } = usePreferences()
  const maintenant = useMaintenant()
  const [premier, setPremier] = useState<string | null>(null)
  const [msg, setMsg] = useState<Message>(null)
  const valider = useCallback(
    async (pin: string) => {
      if (premier === null) {
        setPremier(pin)
        setMsg(null)
        return vider()
      }
      if (pin !== premier) {
        signal('erreur')
        setPremier(null)
        vider()
        return setMsg({ ton: 'rouge', texte: t('Les deux saisies ne sont pas identiques : recommencez.') })
      }
      const r = await source.session.creerPin(pin, origine(maintenant()))
      if (r.ok) return ouvrir()
      signal('erreur')
      setPremier(null)
      vider()
      setMsg({ ton: 'rouge', texte: r.raison === 'pin_trop_simple' ? t('PIN trop simple : évitez les suites et les chiffres répétés.') : t('Ce code a expiré : demandez-en un nouveau.') })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [premier],
  )
  const { v, ajouter, effacer, vider } = useSaisie(CONNEXION.pinLongueur, (x) => void valider(x))
  return (
    <>
      <div className="p-txto41">
        <h1 className="p-fdt7cn">{premier === null ? (e.prenom ? tf('{prenom}, créez votre code PIN', { prenom: e.prenom }) : t('Créez votre code PIN')) : t('Confirmez votre code PIN')}</h1>
        <div className="p-ietgpj">{tf('{n} chiffres, à ne donner à personne. Il signe vos opérations.', { n: CONNEXION.pinLongueur })}</div>
      </div>
      <Points n={v.length} total={CONNEXION.pinLongueur} />
      {msg && <Note ton={msg.ton}>{msg.texte}</Note>}
      <Pave ajouter={ajouter} effacer={effacer} saisis={v.length} />
      <button type="button" className="p-ncx7qc" disabled={v.length !== CONNEXION.pinLongueur} onClick={() => void valider(v)}>
        {premier === null ? t('Continuer') : t('Confirmer le PIN')}
      </button>
    </>
  )
}
