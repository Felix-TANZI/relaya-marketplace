// Candidature d'une entreprise de livraison (sans session), ouverte depuis la connexion : « Pas encore partenaire ? ».
// Le compte entreprise n'existe pas avant BelivaY : la candidature (POST /api/delivery-partners/applications,
// logique-metier/livraison/FONDATIONS.md) porte la dénomination, le RCCM, le NIU, les zones exploitées, le responsable
// et son numéro +237 ; la console la vérifie et répond sous CONSOLE-CANDIDATURE-J heures ouvrées ; acceptée, le
// propriétaire reçoit son invitation par SMS (« Créer mon accès », Connexion). Démonstration : gardée sur l'appareil.
// Présentation : cadre d'accès commun (compte/acces.tsx), onglet « Devenir partenaire » ; un objectif, la candidature,
// en trois étapes courtes (Entreprise, Zones, Responsable), un bouton par étape ; l'accroche et la photo au dossier,
// le mode compact une fois la candidature reçue.
// Comptes réels (source « hybride », site/COMPTES-REELS.md) : la candidature crée le compte du responsable (e-mail
// professionnel, mot de passe, conditions acceptées) par comptesReels.inscrire('entreprise') ; le compte naît « en
// attente de validation » (AccesAttente). En démonstration et avec l'API, rien ne change.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { comptesReels, type SessionReelle } from '@client/comptes-reels/client'
import { fixerSession, hybride } from '@client/comptes-reels/hybride'
import { AccesAttente, AccesConsentement, ChampMotDePasse, messageRefus, motDePasseValide } from '@client/compte/acces-reel'
import { jouer } from '@client/composants/Sons'
import { Icone } from '../../composants/Icone'
import { Ecran } from '../../composants/coque'
import { Note } from '../../composants/prototype'
import { Acces, AccesCadre, AccesChemins, AccesEtapes, AccesLiens, AccesMessage, AccesTitre } from '@client/compte/acces'
import { PiedAcces } from './outils'
import { ZONES_YAOUNDE } from '../../calculs/zones'
import { ACCUEIL, chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { decisionCandidature, demanderActivation } from '../../demo/pont-console'
import { usePreferences } from '../../preferences'
import logo from '../../assets/logo-belivay.png'

const CLE = 'blv_e_candidatures'
const DELAI_HEURES = 120 // CONSOLE-CANDIDATURE-J (heures ouvrées)
const numeroValide = (n: string) => /^6\d{8}$/.test(n.replace(/\D/g, '').replace(/^237/, ''))
const niuValide = (n: string) => /^[A-Z]\d{12}[A-Z]$/.test(n.replace(/\s/g, '').toUpperCase())
const rccmValide = (r: string) => /^[A-Z]{2}[-\s]?[A-Z]{2,4}[-\s]?\d{2,4}[-\s]?[A-Z0-9]{1,4}[-\s]?\d{3,6}$/i.test(r.trim())

type Champs = 'denomination' | 'rccm' | 'niu' | 'responsable' | 'numero' | 'zones' | 'livreurs' | 'email' | 'mdp' | 'consentement'
/** Les champs de chaque étape (Entreprise, Zones, Responsable). */
const ETAPES: Champs[][] = [['denomination', 'rccm', 'niu'], ['zones', 'livreurs'], ['responsable', 'numero', 'email', 'mdp', 'consentement']]
const emailValide = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

function Champ(p: { id: Champs; libelle: string; icone: string; valeur: string; changer: (v: string) => void; erreur?: string; mode?: 'tel' | 'numeric' | 'text' | 'email'; type?: 'email'; auto?: string; aide?: string }) {
  return (
    <div className="fld">
      <label htmlFor={'cand-' + p.id}>{p.libelle}</label>
      <span className={'inp' + (p.erreur ? ' err' : '')}>
        <Icone nom={p.icone} taille={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
        <input id={'cand-' + p.id} type={p.type} value={p.valeur} onChange={(e) => p.changer(e.target.value)} inputMode={p.mode} autoComplete={p.auto} aria-invalid={!!p.erreur || undefined} aria-describedby={p.erreur ? 'cand-e-' + p.id : undefined} />
      </span>
      {p.erreur ? (
        <div className="hint err" id={'cand-e-' + p.id} role="alert">
          {p.erreur}
        </div>
      ) : (
        p.aide && <div className="hint">{p.aide}</div>
      )}
    </div>
  )
}

interface CandidatureGardee {
  ref: string
  denomination: string
  le: number
}
function candidaturesGardees(): CandidatureGardee[] {
  try {
    return (JSON.parse(localStorage.getItem(CLE) ?? '[]') as CandidatureGardee[]).filter((c) => c && c.ref)
  } catch {
    return []
  }
}

/** Suivi des candidatures envoyées depuis cet appareil : la décision de BelivaY redescend par le pont (kyc_decide). */
function Suivi({ refs }: { refs: CandidatureGardee[] }) {
  const { t, tf } = usePreferences()
  const [, relire] = useState(0)
  useEffect(() => {
    const f = () => relire((n) => n + 1)
    window.addEventListener('storage', f)
    window.addEventListener('focus', f)
    const id = window.setInterval(f, 4000)
    return () => (window.removeEventListener('storage', f), window.removeEventListener('focus', f), window.clearInterval(id))
  }, [])
  if (!refs.length) return null
  return (
    <div className="mt16" data-suivi-candidatures="">
      {refs.map((c) => {
        const d = decisionCandidature(c.ref, 'entreprise')
        const [ton, texte] = !d ? (['acc', t('Reçue · en vérification par BelivaY')] as const) : d.decision === 'approuve' ? (['acc', t('Acceptée : le responsable reçoit son invitation par SMS.')] as const) : d.decision === 'complement' ? (['amber', tf('Complément demandé : {m}', { m: d.motif ?? '' })] as const) : (['red', tf('Refusée : {m}', { m: d.motif ?? '' })] as const)
        return (
          <Note key={c.ref} ton={ton} icone={!d ? 'clock' : d.decision === 'approuve' ? 'check' : 'info'}>
            <b>{`${c.denomination} · ${c.ref}`}</b> {texte}
          </Note>
        )
      })}
    </div>
  )
}

export default function Candidature() {
  const prefs = usePreferences()
  const { t, tf } = prefs
  const [v, setV] = useState({ denomination: '', rccm: '', niu: '', responsable: '', numero: '', livreurs: '' })
  const [zones, setZones] = useState<string[]>([])
  const [erreurs, setErreurs] = useState<Partial<Record<Champs, string>>>({})
  const [reference, setReference] = useState<string | null>(null)
  const [etape, setEtape] = useState(0)
  const changer = (k: keyof typeof v) => (x: string) => (setV({ ...v, [k]: x }), setErreurs({ ...erreurs, [k]: undefined }))
  // Compte réel (hybride) : e-mail, mot de passe, consentement ; refus du serveur près du bouton ; compte en attente.
  const naviguer = useNavigate()
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [accepte, setAccepte] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [refus, setRefus] = useState<string | null>(null)
  const [attente, setAttente] = useState<SessionReelle | null>(null)
  const refRefus = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (refus) refRefus.current?.focus()
  }, [refus])

  const envoyer = (e: FormEvent) => {
    e.preventDefault()
    const err: Partial<Record<Champs, string>> = {}
    if (v.denomination.trim().length < 3) err.denomination = t('Indiquez la dénomination inscrite au registre du commerce.')
    if (!rccmValide(v.rccm)) err.rccm = t('Numéro RCCM incomplet : il figure sur votre extrait du registre du commerce.')
    if (!niuValide(v.niu)) err.niu = t('Le NIU compte 14 caractères : une lettre, 12 chiffres, une lettre.')
    if (v.responsable.trim().split(/\s+/).length < 2) err.responsable = t('Prénom et nom du responsable.')
    if (!numeroValide(v.numero)) err.numero = t('Numéro camerounais à 9 chiffres, commençant par 6.')
    if (!zones.length) err.zones = t('Choisissez au moins une zone exploitée.')
    const n = Number(v.livreurs)
    if (!Number.isInteger(n) || n < 1 || n > 500) err.livreurs = t('Nombre de livreurs entre 1 et 500.')
    if (hybride) {
      if (!emailValide(email)) err.email = t('Indiquez une adresse e-mail valable, par exemple contact@monentreprise.cm.')
      if (!motDePasseValide(mdp)) err.mdp = t('8 caractères au moins, avec une lettre et un chiffre.')
      if (!accepte) err.consentement = t('Acceptez les conditions pour envoyer la candidature.')
    }
    setRefus(null)
    // Étapes 1 et 2 : seulement leurs champs ; à l'envoi, tout (une erreur d'avant ramène à son étape).
    const aVoir = (k: string) => ETAPES.findIndex((l) => l.includes(k as Champs))
    const ici = etape < 2 ? Object.fromEntries(Object.entries(err).filter(([k]) => aVoir(k) === etape)) : err
    setErreurs(ici)
    if (Object.keys(ici).length) {
      jouer('erreur')
      const premier = Object.keys(ici)[0]
      const retour = aVoir(premier)
      if (retour !== etape) setEtape(retour)
      setTimeout(() => (premier === 'consentement' ? document.querySelector<HTMLInputElement>('.acr-case input') : document.getElementById('cand-' + premier))?.focus(), 0)
      return
    }
    if (etape < 2) {
      setEtape(etape + 1)
      setTimeout(() => document.getElementById(etape === 0 ? 'cand-zones' : 'cand-responsable')?.focus(), 0)
      return
    }
    if (hybride) return void inscrireReel(n)
    const ref = 'CAND-' + String(Date.now()).slice(-6)
    try {
      const liste = JSON.parse(localStorage.getItem(CLE) ?? '[]') as unknown[]
      liste.push({ ref, le: Date.now(), ...v, numero: v.numero.replace(/\D/g, '').replace(/^237/, ''), niu: v.niu.replace(/\s/g, '').toUpperCase(), zones, livreurs: n, etat: 'recue' })
      localStorage.setItem(CLE, JSON.stringify(liste))
    } catch {
      /* stockage indisponible : la référence reste affichée */
    }
    // Vers la console : la candidature arrive dans « Candidatures des partenaires » (vérification RCCM, NIU, zones).
    demanderActivation('entreprise', ref, ref, 2, Date.now(), { denomination: v.denomination.trim(), zones, livreurs: n })
    jouer('valide')
    setReference(ref)
  }

  // Compte réel : le responsable et son dossier ; le compte naît « en attente de validation ».
  const inscrireReel = async (n: number) => {
    if (envoi) return
    setEnvoi(true)
    const [prenom, ...reste] = v.responsable.trim().split(/\s+/)
    const r = await comptesReels.inscrire('entreprise', {
      email: email.trim(),
      motDePasse: mdp,
      prenom,
      nom: reste.join(' '),
      telephone: '+237' + v.numero.replace(/\D/g, '').replace(/^237/, ''),
      conditions: { acceptees: true, version: '1.0' },
      candidature: { nom: v.denomination.trim(), rccm: v.rccm.trim(), niu: v.niu.replace(/\s/g, '').toUpperCase(), zones, livreurs: n },
    })
    setEnvoi(false)
    if (!r.ok) {
      jouer('erreur')
      const champ = String(r.data?.champ ?? '')
      if (champ === 'email' || champ === 'username') setErreurs((x) => ({ ...x, email: t('Vérifiez cette adresse e-mail.') }))
      if (champ === 'password' || r.code === 'mot_de_passe' || r.code === 'mot_de_passe_demo') setErreurs((x) => ({ ...x, mdp: t('Choisissez un autre mot de passe.') }))
      return setRefus(r.code === 'mot_de_passe_demo' ? t('Ce mot de passe est réservé à la démonstration : choisissez-en un autre.') : messageRefus(r))
    }
    fixerSession('entreprise', r)
    jouer('valide')
    setMdp('')
    setAttente(r)
  }

  return (
    <Ecran route="candidature" plein>
      <AccesCadre acteur="entreprise" logo={logo} espace={t('Espace entreprise')} reglages={prefs} compact={!!reference || !!attente} pied={<PiedAcces />}>
        {attente ? (
          <AccesAttente
            qui={attente.user.organisation || v.denomination.trim()}
            email={attente.user.email}
            delai={tf('sous {h} heures ouvrées', { h: DELAI_HEURES })}
            continuer={async () => {
              // En attendant la validation : la démonstration (Yafé Express) sous le nom du compte réel.
              await source.session.changerRole('proprietaire')
              naviguer(chemin(ACCUEIL), { replace: true })
            }}
            deconnecter={async () => {
              await source.session.deconnecter()
              setAttente(null)
              naviguer(chemin('connexion'), { replace: true })
            }}
          />
        ) : (
        <Acces>
          <AccesChemins
            actif="inscription"
            label={t('Se connecter ou devenir partenaire')}
            connexion={<Link to={chemin('connexion')}>{t('Se connecter')}</Link>}
            inscription={<Link to={chemin('candidature')}>{t('Devenir partenaire')}</Link>}
          />
          {reference ? (
            <div data-candidature-recue="">
              <AccesTitre titre={t('Candidature reçue')} phrase={tf('Référence {r}. L’équipe BelivaY vérifie votre RCCM, votre NIU et vos zones, et vous répond par SMS sous {h} heures ouvrées.', { r: reference, h: DELAI_HEURES })} />
              <Suivi refs={candidaturesGardees().filter((c) => c.ref === reference)} />
              <Link to={chemin('connexion')} className="btn primary xl mt16">
                <Icone nom="log-in" taille={18} />
                <span>{t('Revenir à la connexion')}</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={envoyer} noValidate>
              <AccesEtapes etapes={[t('Entreprise'), t('Zones'), t('Responsable')]} actuelle={etape + 1} libelle={(n, total) => tf('Étape {n} sur {total}', { n, total })} />
              <AccesTitre titre={t('Candidature de votre entreprise')} phrase={etape === 0 ? t('Entreprise de livraison enregistrée au Cameroun : quelques informations, puis un rendez-vous avec BelivaY.') : undefined} />
              {etape === 0 && (
                <>
                  <Suivi refs={candidaturesGardees()} />
                  <Champ id="denomination" libelle={t('Dénomination')} icone="building-2" valeur={v.denomination} changer={changer('denomination')} erreur={erreurs.denomination} auto="organization" />
                  <Champ id="rccm" libelle={t('Numéro RCCM')} icone="file-text" valeur={v.rccm} changer={changer('rccm')} erreur={erreurs.rccm} aide={t('Exemple : CM-YAO-2024-B-01234')} />
                  <Champ id="niu" libelle={t('NIU (identifiant fiscal)')} icone="receipt" valeur={v.niu} changer={changer('niu')} erreur={erreurs.niu} aide={t('Exemple : M012345678901A')} />
                </>
              )}
              {etape === 1 && (
              <>
              <div className="fld" role="group" aria-labelledby="cand-zones-l">
                <span className="t13 b7" id="cand-zones-l">
                  {t('Zones exploitées à Yaoundé')}
                </span>
                <div className="chips" id="cand-zones" tabIndex={-1} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {ZONES_YAOUNDE.map((z) => {
                    const on = zones.includes(z.code)
                    return (
                      <button key={z.code} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => (setZones(on ? zones.filter((x) => x !== z.code) : [...zones, z.code]), setErreurs({ ...erreurs, zones: undefined }))}>
                        {`${z.code} · ${z.nom}`}
                      </button>
                    )
                  })}
                </div>
                {erreurs.zones && (
                  <div className="hint err" role="alert">
                    {erreurs.zones}
                  </div>
                )}
              </div>
              <Champ id="livreurs" libelle={t('Nombre de livreurs')} icone="users" valeur={v.livreurs} changer={changer('livreurs')} erreur={erreurs.livreurs} mode="numeric" />
              </>
              )}
              {etape === 2 && (
                <>
                  <Champ id="responsable" libelle={t('Responsable (prénom et nom)')} icone="user" valeur={v.responsable} changer={changer('responsable')} erreur={erreurs.responsable} auto="name" />
                  <Champ id="numero" libelle={t('Numéro du responsable (+237)')} icone="phone" valeur={v.numero} changer={changer('numero')} erreur={erreurs.numero} mode="tel" auto="tel-national" />
                </>
              )}
              {etape === 2 && hybride && (
                <>
                  <Champ id="email" libelle={t('E-mail professionnel du responsable')} icone="mail" type="email" mode="email" auto="email" valeur={email} changer={(x) => (setEmail(x), setErreurs({ ...erreurs, email: undefined }))} erreur={erreurs.email} aide={t('Votre identifiant de connexion ; la réponse de BelivaY y arrive.')} />
                  <ChampMotDePasse id="cand-mdp" libelle={t('Mot de passe de votre accès')} valeur={mdp} changer={(x) => (setMdp(x), setErreurs({ ...erreurs, mdp: undefined }))} aide={erreurs.mdp ?? t('8 caractères au moins, avec une lettre et un chiffre.')} erreur={!!erreurs.mdp} />
                  <AccesConsentement coche={accepte} changer={(x) => (setAccepte(x), setErreurs({ ...erreurs, consentement: undefined }))} conditions="/cgu" confidentialite="/legal-doc?d=confidentialite" erreur={!!erreurs.consentement} />
                </>
              )}
              {Object.keys(erreurs).some((k) => erreurs[k as Champs]) && (
                <AccesMessage annonce={false}>{tf('{n} champ(s) à corriger : le premier est sélectionné.', { n: Object.values(erreurs).filter(Boolean).length })}</AccesMessage>
              )}
              {refus && (
                <div ref={refRefus} tabIndex={-1} style={{ outline: 'none' }}>
                  <AccesMessage>{refus}</AccesMessage>
                </div>
              )}
              <button type="submit" className="btn primary xl mt16" aria-busy={envoi || undefined}>
                <Icone nom={etape < 2 ? 'arrow-right' : 'send'} taille={18} />
                <span>{etape < 2 ? t('Continuer') : t(envoi ? 'Envoi…' : 'Envoyer la candidature')}</span>
              </button>
              {etape > 0 && (
                <AccesLiens label={t('Autres liens')}>
                  <button type="button" onClick={() => (setErreurs({}), setEtape(etape - 1))}>
                    {t('Revenir à l’étape précédente')}
                  </button>
                </AccesLiens>
              )}
            </form>
          )}
        </Acces>
        )}
      </AccesCadre>
    </Ecran>
  )
}
