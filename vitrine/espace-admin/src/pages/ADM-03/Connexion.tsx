// Connexion et second facteur (ADM-P01) : écran plein, sans barre latérale ; aucune page de la console ne s'ouvre sans
// second facteur (un lien direct renvoie ici puis y ramène). Cadre d'accès commun (25 oct. 2026 : accroche et photo de
// l'équipe, onglets « Se connecter » / « Activer mon accès », étapes compactes au téléphone), boîte d'étape 1 (identifiant nominatif, mot de passe), étape 2 (code à 6 chiffres, SMS de secours),
// arrivée (rôle et périmètre rappelés, nouvel appareil, session, quatre yeux, journal), blocage (anneau, heure du nouvel
// essai, alerte Direction), erreur (saisie conservée, Réessayer). Règles lues : echecs_avant_blocage, duree_blocage,
// duree_session, ADM-SESSION-INACTIF-MIN, ADM-BRIS-GLACE-H ; trois codes faux ramènent à l'étape 1.
// Démonstration : un seul compte, celui de la Direction (« Essayer avec le compte de démonstration »).
import { env } from '@client/config/env'
import { LienParEmail, RetourMemorise, SeSouvenir, useMemoire } from '../../composants/ConnexionPlus'
import { codesSecoursAMontrer, defiEnCours, enrolementEnCours } from '../../donnees/session-hybride'
import { hybride } from '@client/comptes-reels/hybride'
import { ReinitialiserReel } from '@client/compte/acces-reel'
import { Acces, AccesCadre, AccesChemins, AccesDemo, AccesEtapes, AccesLiens, AccesMessage, AccesNote, AccesOu } from '@client/compte/acces'
import { Portrait } from '../../composants/Portrait'
import { connecterParLien, reinitialiserParLien } from '../../demo/session'
import { demanderReinitialisation, envoyerLienConnexion, ouvrirLienConnexion, reinitialiserMotDePasse, retouchesDe } from '../../donnees/mon-compte'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import logo from '../../assets/logo-belivay.png'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Heure } from '../../composants/LigneJournal'
import { Anneau, Kv, Li, Note, Pill } from '../../composants/prototype'
import { NOM_ROLE, PERIMETRE_ROLE } from '../../config/libelles'
import { ACCUEIL_ROLE, chemin } from '../../config/pages'
import { EQUIPES, NOM_NIVEAU } from '../../config/acces-console'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { PARAMETRES } from '../../calculs/registre'
import { usePreferences } from '../../preferences'
import { useHorloge, useRelireSession, useSession } from '../../session'
import { REGLES_S1 } from './regles'
import './s1.css'

type Etape = 'identifiants' | 'code' | 'arrivee' | 'bloque' | 'erreur' | 'oubli'
const P = PARAMETRES.console

function Etapes({ n }: { n: 1 | 2 }) {
  const { t, tf } = usePreferences()
  // Gabarit d'accès commun : « Étape n sur 2 · libellé » puis la barre.
  return <AccesEtapes etapes={[t('Identifiant et mot de passe'), t('Second facteur')]} actuelle={n} libelle={(x, total) => tf('Étape {n} sur {total}', { n: x, total })} />
}

/** Démonstration : un seul compte, celui de la Direction (Franck, tous les droits), par le changement d'agent du jeu d'essai. */
function Demo({ suite }: { suite: string | null }) {
  const { t } = usePreferences()
  const naviguer = useNavigate()
  const comptes = useLecture(() => source.session.comptesDemo(), [])
  const c = (comptes.donnees ?? []).find((x) => x.agentId === 'a-franck') ?? (comptes.donnees ?? [])[0]
  if (!c) return null
  return (
    <AccesDemo
      qui={`${c.nom} · ${t(NOM_NIVEAU[c.niveau])} · ${t(EQUIPES[c.equipe].nom)}`}
      connecter={async () => {
        const r = await source.session.changerAgent(c.agentId)
        if (!r.ok) return t('Compte suspendu ou fermé : aucune session ne s’ouvre. Voyez Accès et personnel.')
        naviguer(suite ?? chemin(ACCUEIL_ROLE[c.role]), { replace: true })
        return null
      }}
    />
  )
}

/** Cadre d'accès de la console (connexion, activation) : l'équipe BelivaY, sans les autres espaces. */
export function CadreConsole({ actif, compact, children }: { actif: 'connexion' | 'inscription'; compact?: boolean; children: ReactNode }) {
  const prefs = usePreferences()
  const { t, tf } = prefs
  // L'écran « plein » de la console n'a pas de marge : la gouttière de 16 px du téléphone est posée ici.
  return (
    <div style={{ padding: '0 16px' }}>
    <AccesCadre
      acteur="admin"
      compact={compact}
      logo={logo}
      espace={t('Console d’administration')}
      phrase={t('Vérifier, paramétrer, arbitrer et payer chaque vendredi, avec une trace inaltérable de chaque action.')}
      reglages={prefs}
      pied={
        <p className="acc-legal">
          {tf('admin.belivay.com · HTTPS · session de {h} h au plus · aucune page indexable', { h: P.sessionHeures })}
          <br />
          {`${PARAMETRES.mentions.denomination} · RCCM ${PARAMETRES.mentions.rccm} · ${t('accès réservé à l’équipe BelivaY')}`}
        </p>
      }
    >
      <AccesChemins
        actif={actif}
        label={t('Se connecter ou activer son accès')}
        connexion={<Link to={chemin('connexion')}>{t('Se connecter')}</Link>}
        inscription={<Link to={chemin('activation')}>{t('Activer mon accès')}</Link>}
      />
      {children}
    </AccesCadre>
    </div>
  )
}

export default function Connexion() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const relire = useRelireSession()
  const naviguer = useNavigate()
  const n = useHorloge(1000)
  const [params] = useSearchParams()
  const suite = params.get('next')?.startsWith('/') ? params.get('next')! : null
  // Kit (mode API) : lien de connexion (« ?lien= ») et lien « mot de passe oublié » (« ?reinit= ») reçus par e-mail.
  const api = env.source === 'api'
  const jetonLien = api ? params.get('lien') : null
  const jetonReinit = api ? params.get('reinit') : null
  const [etape, setEtape] = useState<Etape>(s.connecte ? 'arrivee' : jetonReinit ? 'oubli' : 'identifiants')
  const memoire = useMemoire()
  const [identifiant, setIdentifiant] = useState(() => memoire.memo?.email ?? '')
  const [oubli, setOubli] = useState<{ envoye: string | null; ouvert: boolean; nouveau: string }>(jetonReinit ? { envoye: '', ouvert: true, nouveau: '' } : { envoye: null, ouvert: false, nouveau: '' })
  const [mdp, setMdp] = useState('')
  const [voir, setVoir] = useState(false)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [agent, setAgent] = useState<{ id?: string; prenom: string; nom: string; initiales: string; identifiant: string } | null>(null)
  const [bloqueJusqua, setBloque] = useState<number | null>(null)
  const [nouvelAppareil, setNouvel] = useState(false)
  const [arriveeLe, setArriveeLe] = useState<number | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [sms, setSms] = useState<string | null>(null)
  // Comptes réels (source hybride) : enrôlement du premier accès, code de secours, codes de secours à noter, lien
  // « mot de passe oublié » reçu par e-mail (?reinitialiser=).
  const [enrolement, setEnrolement] = useState<{ qr: string; secret: string } | null>(null)
  const [secours, setSecours] = useState(false)
  const [codesSecours, setCodesSecours] = useState<string[] | null>(null)
  const jetonReinitReel = hybride ? params.get('reinitialiser') : null
  const quatre = useLecture(() => (s.connecte ? source.quatreyeux.enAttente().catch(() => []) : Promise.resolve([])), [s.connecte, s.role])
  // Second facteur accepté : la session est relue (au kit, le temps d'un aller-retour) ; l'arrivée attend qu'elle soit ouverte.
  const [attenteSession, setAttenteSession] = useState(false)
  useEffect(() => {
    if (s.connecte) setAttenteSession(false)
    else if (etape === 'arrivee' && !attenteSession) setEtape('identifiants')
  }, [s.connecte, etape, attenteSession])
  useEffect(() => {
    if (jetonLien && !s.connecte) void seConnecter(undefined, undefined, jetonLien)
    // Une seule fois, à l'ouverture du lien.
  }, [])
  useEffect(() => {
    if (s.connecte) return
    void source.session.blocage().then((b) => {
      if (b.jusqua) {
        setBloque(b.jusqua)
        setEtape('bloque')
      }
    })
  }, [s.connecte])
  useEffect(() => {
    if (etape === 'bloque' && bloqueJusqua && n >= bloqueJusqua) {
      setEtape('identifiants')
      setBloque(null)
    }
  }, [etape, bloqueJusqua, n])
  const essayer = async <T,>(f: () => Promise<T>): Promise<T | null> => {
    setEnvoi(true)
    try {
      return await f()
    } catch {
      setEtape('erreur')
      return null
    } finally {
      setEnvoi(false)
    }
  }
  const seConnecter = async (e?: FormEvent, lien?: string, jeton?: string) => {
    e?.preventDefault()
    if (lien) setIdentifiant(lien)
    const r = await essayer(() => (jeton ? ouvrirLienConnexion(jeton) : lien ? connecterParLien(lien) : source.session.connecter(identifiant, mdp)))
    if (!r) return
    if (r.ok) {
      setAgent(r.agent)
      setMessage(null)
      setCode('')
      setSecours(false)
      setEnrolement(null)
      // Comptes réels : premier accès → enrôlement de l'application d'authentification (QR et secret) avant le code.
      const e = hybride ? enrolementEnCours() : null
      if (e) setEnrolement({ qr: e.qr, secret: e.secret })
      setEtape('code')
    } else if (r.raison === 'bloque') {
      setBloque(r.jusqua)
      setEtape('bloque')
    } else if (r.raison === 'suspendu') {
      setEtape('identifiants')
      setMessage(t('Compte suspendu ou fermé : aucune session ne s’ouvre. Voyez Accès et personnel.'))
    } else if (r.raison === 'lien_expire') {
      setEtape('identifiants')
      setMessage(t('Ce lien de connexion a expiré ou a déjà servi : demandez-en un nouveau.'))
    } else if (r.raison === 'indisponible') {
      setEtape('identifiants')
      setMessage(r.message)
    } else {
      setEtape('identifiants')
      setMessage(tf('Identifiant ou mot de passe incorrect. Encore {n} essai(s) avant le blocage.', { n: r.restants }))
    }
  }
  const valider = async (e?: FormEvent) => {
    e?.preventDefault()
    const r = await essayer(() => source.session.verifierCode(code, 'application'))
    if (!r) return
    if (r.ok) {
      // « Se souvenir de cet appareil » : l'e-mail seulement (jamais le mot de passe), le prénom et la photo du retour.
      if (agent) memoire.retenir({ email: agent.identifiant, prenom: agent.prenom, initiales: agent.initiales, photo: agent.id ? (retouchesDe(agent.id).photo ?? null) : null })
      setNouvel(r.nouvelAppareil)
      setCodesSecours(hybride ? codesSecoursAMontrer() : null)
      setArriveeLe(Date.now())
      setAttenteSession(true)
      setEtape('arrivee')
      relire()
    } else if (r.raison === 'faux') {
      setCode('')
      setMessage(tf('Code incorrect. Encore {n} essai(s), puis retour à l’étape 1.', { n: r.restants }))
    } else {
      setEtape('identifiants')
      setMdp('')
      setMessage(r.raison === 'expire' ? t('L’étape 1 a expiré : reprenez la connexion.') : t('Trois codes incorrects : reprenez à l’étape 1.'))
    }
  }
  const demanderSms = async () => {
    const r = await essayer(() => source.session.envoyerCodeSms())
    if (r?.ok) setSms(r.telephone)
    else if (r && r.raison === 'application_obligatoire') setMessage(t('Votre équipe utilise l’application d’authentification seulement : pas de code par SMS.'))
  }
  const ouvrir = () => naviguer(suite ?? chemin(ACCUEIL_ROLE[s.role]), { replace: true })

  const boite = (() => {
    if (jetonReinitReel) return <ReinitialiserReel espace="console" jeton={jetonReinitReel} versConnexion={() => naviguer(chemin('connexion'), { replace: true })} />
    if (etape === 'arrivee' && codesSecours)
      return (
        <>
          <h1 className="admA-h">{t('Vos codes de secours')}</h1>
          <div className="s">{t('Si vous perdez votre téléphone, chacun de ces codes ouvre la console une seule fois. Notez-les maintenant et gardez-les hors ligne : ils ne seront plus montrés.')}</div>
          <ul className="s1-secours mt10" aria-label={t('Codes de secours')}>
            {codesSecours.map((c) => (
              <li key={c}>
                <code>{c}</code>
              </li>
            ))}
          </ul>
          <button type="button" className="btn primary mt14" onClick={() => setCodesSecours(null)}>
            <Icone nom="check" taille={18} />
            <span>{t('J’ai noté mes codes')}</span>
          </button>
        </>
      )
    if (etape === 'arrivee' && s.connecte && s.agent) {
      const enAttente = (quatre.donnees ?? []).filter((d) => d.rolesSecond.includes(s.role) && d.premier.agentId !== s.agent?.id).length
      return (
        <>
          <div className="row" style={{ gap: 12 }}>
            <span className="ic green" style={{ width: 48, height: 48, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icone nom="circle-check" taille={26} />
            </span>
            <div className="grow">
              <div className="pg-k" style={{ margin: 0 }}>
                {t('Connexion réussie')} {arriveeLe && <>· <Heure le={s.maintenant} /></>}
              </div>
              <h2 style={{ margin: '2px 0 0' }}>{tf('Bonjour {prenom}', { prenom: s.agent.prenom })}</h2>
            </div>
          </div>
          <div className="hero night mt14" style={{ padding: 16 }}>
            <div className="hk">{t('Votre rôle et votre périmètre')}</div>
            <div className="ht">{`${t(NOM_ROLE[s.role])} · ${s.agent.zones ? s.agent.zones.join(', ') : t(PERIMETRE_ROLE[s.role])}`}</div>
            <div className="hs">{tf('Espace pays {pays} ({devise}) · {ville} · {n} zones exploitées sur {total}. Ce rappel reste affiché en permanence dans l’en-tête.', { pays: t(s.pays.nom), devise: s.pays.devise, ville: s.pays.ville, n: s.pays.zonesExploitees.length, total: s.pays.zonesTotal })}</div>
            {s.agent.roles.length > 1 && (
              <div className="row wrap mt10" style={{ gap: 6 }}>
                {s.agent.roles.map((r) => (
                  <Pill key={r} ton="dk" sm>
                    {t(NOM_ROLE[r])}
                  </Pill>
                ))}
              </div>
            )}
          </div>
          {nouvelAppareil && (
            <Note ton="amber" icone="monitor-smartphone" className="mt10">
              <b>{t('Nouvel appareil')}</b> · {t('Un e-mail vous a été envoyé ; la connexion est visible des comptes Direction.')}
            </Note>
          )}
          <div className="admA-kvs mt8">
            <Kv k={t('Session')} v={s.expire ? <>{t('jusqu’à')} <Heure le={s.expire} /> {tf('au plus · fermée après {m} min d’inactivité', { m: REGLES_S1.inactifMin })}</> : '—'} />
            <Kv k={t('Quatre yeux')} v={enAttente ? tf('{n} décision(s) à contresigner', { n: enAttente }) : t('aucune décision à contresigner')} />
            <Kv k={t('Journal')} v={t('connexion enregistrée (adresse, appareil)')} />
          </div>
          <button type="button" className="btn primary" onClick={ouvrir}>
            <Icone nom="inbox" taille={18} />
            <span>{suite ? t('Reprendre la page demandée') : t('Ouvrir la file d’action')}</span>
          </button>
        </>
      )
    }
    if (etape === 'oubli')
      return (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (oubli.envoye === null) {
              const r = await (api ? demanderReinitialisation(identifiant) : envoyerLienConnexion(identifiant))
              if (!r.ok) return setMessage(t('Saisie invalide : vérifiez le format.'))
              setMessage(null)
              return setOubli({ ...oubli, envoye: r.vers })
            }
            const r = await (jetonReinit ? reinitialiserMotDePasse(jetonReinit, oubli.nouveau) : reinitialiserParLien(identifiant, oubli.nouveau))
            if (!r.ok && r.raison === 'lien_expire') {
              setEtape('identifiants')
              return setMessage(t('Ce lien a expiré ou a déjà servi : demandez-en un nouveau.'))
            }
            if (!r.ok) return setMessage(t('8 caractères au moins, dont un chiffre.'))
            setMdp('')
            setEtape('identifiants')
            setMessage(t('Mot de passe changé : connectez-vous ; le second facteur reste demandé.'))
          }}
        >
          <AccesEtapes etapes={[t('Identifiant'), t('Lien et nouveau mot de passe')]} actuelle={oubli.envoye === null ? 1 : 2} libelle={(x, total) => tf('Étape {n} sur {total}', { n: x, total })} />
          <h1 className="admA-h">{t('Mot de passe oublié')}</h1>
          <div className="s">{t('Un lien de réinitialisation part à votre e-mail nominatif, s’il existe. Il vaut 15 minutes ; le second facteur reste demandé ensuite.')}</div>
          {oubli.envoye === null ? (
            <label className="champ">
              <span>{t('Identifiant nominatif')}</span>
              <input type="email" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} autoComplete="username" placeholder="prenom@belivay.com" />
            </label>
          ) : (
            <>
              {!jetonReinit && (
                <p className="t13 mt10" role="status">
                  {tf('Si un accès existe, un lien est parti à {v}. Il vaut 15 minutes.', { v: oubli.envoye })}
                </p>
              )}
              {env.source !== 'api' && !oubli.ouvert && (
                <button type="button" className="btn secondary sm" onClick={() => setOubli({ ...oubli, ouvert: true })}>
                  {t('Ouvrir le lien (démonstration)')}
                </button>
              )}
              {oubli.ouvert && (
                <label className="champ">
                  <span>{t('Nouveau mot de passe')}</span>
                  <input type="password" value={oubli.nouveau} onChange={(e) => setOubli({ ...oubli, nouveau: e.target.value })} autoComplete="new-password" />
                </label>
              )}
            </>
          )}
          {message && <AccesMessage>{message}</AccesMessage>}
          {(oubli.envoye === null || oubli.ouvert) && (
            <button type="submit" className="btn primary" style={{ marginTop: 14 }} disabled={oubli.envoye !== null ? !oubli.nouveau : !identifiant}>
              <span>{oubli.envoye !== null ? t('Enregistrer le mot de passe') : t('Envoyer le lien')}</span>
            </button>
          )}
          <AccesNote>{t('Jamais de mot de passe ni de code par téléphone : l’équipe BelivaY ne vous les demandera pas.')}</AccesNote>
          <AccesLiens label={t('Autres liens')}>
            <button type="button" onClick={() => (setMessage(null), setEtape('identifiants'))}>
              {t('Retour à la connexion')}
            </button>
          </AccesLiens>
        </form>
      )
    if (etape === 'bloque' && bloqueJusqua) {
      const reste = Math.max(0, bloqueJusqua - n)
      const min = Math.ceil(reste / 60_000)
      return (
        <div className="center" role="alert">
          <span className="ic red" style={{ width: 56, height: 56, borderRadius: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icone nom="lock" taille={28} />
          </span>
          <h2>{tf('Accès bloqué pendant {m} minutes', { m: P.blocageMinutes })}</h2>
          <div className="s">
            {tf('{n} échecs consécutifs. Nouvel essai possible à partir de', { n: P.echecsAvantBlocage })} <Heure le={bloqueJusqua} />.
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
            <Anneau v={min} max={P.blocageMinutes} couleur="var(--red)" taille={104} libelle={<span className="admA-ringl" style={{ fontSize: 20 }}>{tf('{m} min', { m: min })}</span>} aria={tf('{m} minutes restantes', { m: min })} />
          </div>
          <div className="t12 c3 b7 mt6">{tf('restantes sur {m}', { m: P.blocageMinutes })}</div>
          <Note ton="red" icone="bell-ring" className="mt10">
            {t('Les comptes Direction ont été alertés. L’adresse et l’appareil de chaque tentative sont au journal d’audit.')}
          </Note>
          <div className="btns">
            <button type="button" className="btn secondary" disabled title={t('Inactif pendant le blocage')}>
              <Icone nom="rotate-cw" taille={18} />
              <span>{t('Réessayer')}</span>
            </button>
            <a className="btn secondary" href="mailto:direction@belivay.com?subject=Console%20%E2%80%94%20acc%C3%A8s%20bloqu%C3%A9">
              <Icone nom="headset" taille={18} />
              <span>{t('Contacter la Direction')}</span>
            </a>
          </div>
          <div className="admA-sub">{t('Aucun contournement : ni code de secours ni autre compte. La Direction peut lever le blocage après vérification.')}</div>
        </div>
      )
    }
    if (etape === 'code' && agent)
      return (
        <form onSubmit={(e) => void valider(e)}>
          <Etapes n={2} />
          <div className="admA-idchip">
            <span className="avatar" style={{ width: 36, height: 36, marginLeft: 0 }} aria-hidden="true">
              <Portrait id={agent.id} initiales={agent.initiales} />
            </span>
            <span className="grow">
              <b>{`${agent.prenom} ${agent.nom}`}</b>
              <span className="c3 t12">{`${agent.identifiant} · ${t('mot de passe vérifié')}`}</span>
            </span>
            <Icone nom="circle-check" taille={20} style={{ color: 'var(--green)' }} />
          </div>
          <h1 className="admA-h">{t('Second facteur')}</h1>
          <div className="s">{t('Saisissez le code à 6 chiffres affiché par votre application d’authentification. Aucune exception, y compris pour la Direction.')}</div>
          {enrolement && (
            <div className="s1-enrol mt10">
              <img src={enrolement.qr} alt={t('QR code à scanner avec votre application d’authentification')} width={176} height={176} />
              <div>
                <div className="t13 c2">{t('Scannez ce QR code avec votre application d’authentification, ou saisissez cette clé :')}</div>
                <div className="s1-cle mt6" aria-label={t('Clé du second facteur')}>
                  <code>{enrolement.secret}</code>
                </div>
              </div>
            </div>
          )}
          {secours ? (
            <label className="fld fld-l mt10">
              <span className="fld-t">{t('Code de secours (8 caractères)')}</span>
              <span className="inp">
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-7-]/g, '').slice(0, 9))} autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} placeholder="ABCD-EFGH" autoFocus />
              </span>
            </label>
          ) : (
            <div className="s1-code">
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" aria-label={t('Code à 6 chiffres')} maxLength={6} autoFocus />
            </div>
          )}
          {message && (
            <p className="e-erreur mt10" role="alert">
              <Icone nom="triangle-alert" taille={16} />
              {message}
            </p>
          )}
          <button type="submit" className="btn primary" disabled={(secours ? code.replace('-', '').length !== 8 : code.length !== 6) || envoi} aria-describedby="s1-actif">
            <Icone nom="shield-check" taille={18} />
            <span>{t('Valider')}</span>
          </button>
          <div className="admA-sub center" id="s1-actif">
            {t('Le bouton s’active au sixième chiffre.')}
          </div>
          {hybride && defiEnCours() ? (
            !enrolement && (
              <button type="button" className="btn ghost" onClick={() => (setSecours(!secours), setCode(''))}>
                <Icone nom="key-round" taille={16} />
                <span>{secours ? t('Utiliser le code de l’application') : t('Utiliser un code de secours')}</span>
              </button>
            )
          ) : (
            <button type="button" className="btn ghost" onClick={() => void demanderSms()}>
              <Icone nom="message-square" taille={16} />
              <span>{t('Recevoir un code par SMS (secours)')}</span>
            </button>
          )}
          {sms && (
            <p className="t13 c3 mt6" role="status">
              {tf('Code envoyé par SMS au {tel}.', { tel: sms })}
            </p>
          )}
          <Note ton="acc" icone="shield-check" className="mt10">
            {t('Aucune page de la console ne s’ouvre sans second facteur : un lien direct renvoie ici.')}
          </Note>
          {!api && !(hybride && defiEnCours()) && <p className="t12 c3 mt6">{t('Démonstration : le code de l’application est 246810.')}</p>}
        </form>
      )
    return (
      <form onSubmit={(e) => void seConnecter(e)}>
        <Etapes n={1} />
        <h1 className="admA-h">{t('Connexion à la console')}</h1>
        {etape === 'erreur' ? (
          <Note ton="red" icone="cloud-off" className="mt10" role="alert">
            <b>{t('Connexion impossible pour le moment.')}</b> {t('Le service d’authentification ne répond pas. Votre saisie est conservée : rien n’est perdu.')}
          </Note>
        ) : (
          <div className="s">{t('Accès réservé à l’équipe BelivaY : identifiant nominatif et mot de passe, puis second facteur à chaque connexion.')}</div>
        )}
        {memoire.memo && identifiant === memoire.memo.email ? (
          <RetourMemorise memo={memoire.memo} oublier={() => (memoire.oublier(), setIdentifiant(''))} />
        ) : (
          <label className="fld fld-l mt14">
            <span className="fld-t">{t('Identifiant nominatif')}</span>
            <span className="inp">
              <Icone nom="user-round" taille={18} />
              <input type="email" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} autoComplete="username" placeholder="prenom@belivay.com" required />
            </span>
          </label>
        )}
        <label className="fld fld-l mt10">
          <span className="fld-t">{t('Mot de passe')}</span>
          <span className="inp">
            <Icone nom="lock-keyhole" taille={18} />
            <input type={voir ? 'text' : 'password'} value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="current-password" required />
            <button type="button" className="btn ghost sm s1-oeil" aria-label={voir ? t('Masquer le mot de passe') : t('Afficher le mot de passe')} aria-pressed={voir} onClick={() => setVoir(!voir)}>
              <Icone nom={voir ? 'eye-off' : 'eye'} taille={18} />
            </button>
          </span>
        </label>
        <SeSouvenir valeur={memoire.souvenir} changer={memoire.setSouvenir} />
        {message && <AccesMessage>{message}</AccesMessage>}
        <button type="submit" className="btn primary" disabled={envoi || !identifiant || !mdp} title={!identifiant || !mdp ? t('Saisissez l’identifiant et le mot de passe') : undefined}>
          <Icone nom={etape === 'erreur' ? 'rotate-cw' : 'log-in'} taille={18} />
          <span>{etape === 'erreur' ? t('Réessayer') : envoi ? t('Connexion…') : t('Se connecter')}</span>
        </button>
        <AccesOu texte={t('ou')} />
        <LienParEmail email={identifiant} ouvrirDemo={env.source !== 'api' ? (e) => void seConnecter(undefined, e) : undefined} />
        <AccesLiens label={t('Autres liens')}>
          <button type="button" onClick={() => (setMessage(null), setOubli({ envoye: null, ouvert: false, nouveau: '' }), setEtape('oubli'))}>
            {t('Mot de passe oublié ?')}
          </button>
        </AccesLiens>
        {/* Aide repliée : l'écran garde son objectif (se connecter) ; l'activation a son onglet. */}
        <details className="acc-plus">
          <summary>{t('Un problème pour vous connecter ?')}</summary>
          <Li icone="smartphone" ton="acc" t={t('Second facteur perdu')} s={t('Réinitialisation par un compte Direction, à quatre yeux, après vérification d’identité hors ligne.')} />
          <Li icone="siren" ton="red" t={t('Accès d’urgence (bris de glace)')} s={tf('Direction seulement · {h} h au plus · signalé à tous les comptes Direction et journalisé.', { h: REGLES_S1.brisDeGlaceH })} />
          <p className="t13 c3">{tf('{n} échecs consécutifs : blocage de {m} minutes et alerte aux comptes Direction. Jamais depuis un appareil public, jamais un compte partagé.', { n: P.echecsAvantBlocage, m: P.blocageMinutes })}</p>
        </details>
      </form>
    )
  })()

  return (
    <Ecran route="connexion" plein>
      <CadreConsole actif="connexion" compact={etape !== 'identifiants' && etape !== 'erreur'}>
        {etape !== 'identifiants' && etape !== 'code' && etape !== 'oubli' && etape !== 'erreur' && <h1 className="vh">{t('Connexion à la console')}</h1>}
        <Acces>{boite}</Acces>
        {!s.connecte && !api && <Demo suite={suite} />}
      </CadreConsole>
    </Ecran>
  )
}
