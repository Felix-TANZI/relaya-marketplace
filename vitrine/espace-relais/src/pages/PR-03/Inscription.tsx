// Devenir point relais (PR-03 § 3 ; CT01 R05 ; ouvert sans session depuis la connexion, le Menu et le site public).
// Cinq étapes, barre en 5 segments, retour sans perte de saisie (INS-01 : brouillon gardé sur le téléphone) :
// 1. Commerce : nom, type, quartier (zone de lancement ou liste d'attente : INS-05, DP-09), repère, position (Plus Code) ;
// 2. Gérant : nom, téléphone, CNI recto et verso + selfie vidéo (ARL-18 : comme le vendeur, vérification automatique
//    puis revue humaine), NIU facultatif (ARL-34) ; la pièce n'est jamais montrée, le client voit « prénom et
//    initiale » (ARL-13, INS-06) ;
// 3. Local : trois photos (façade, rangement, comptoir : ARL-35), places estimées, horaires habituels ;
// 4. Versement : opérateur, numéro au nom du gérant, préfixe vérifié AVANT l'envoi du code (INS-03, PR03-R06), code ;
// 5. Convention : conditions (ACT-03, ARL-30 : montants lus au registre), « Lire la convention », case d'acceptation
//    et signature au doigt (horodatées et versionnées) ; « Envoyer ma demande » actif avec les deux (INS-02).
// Envoyée : relais « candidat » en console (PR03-R06), appel sous PR-APPEL-CANDIDAT-H (INS-04), suivi de la demande ;
// l'espace du gérant s'ouvre après l'appel par un SMS (ARL-50) : la formation se découvre, se suit ensuite.
// Présentation (refonte du 25 oct. 2026) : cadre d'accès commun (compte/acces.tsx), onglet « Devenir point relais » ;
// accroche et photo à l'étape 1 seulement (avec l'offre et « Après votre demande »), puis mode compact au téléphone :
// barre en 5 segments, l'étape (champs, puces, boutons photo, « Retour » et « Continuer »). Retour vers la connexion.
// Comptes réels (source « hybride », site/COMPTES-REELS.md) : à l'étape « Convention », l'e-mail du gérant, un mot de
// passe ou un code et le consentement ; « Envoyer ma demande » crée le compte (comptesReels.inscrire('relais')), qui
// naît « en attente de validation » (AccesAttente). En démonstration et avec l'API, rien ne change.
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Acces, AccesCadre, AccesChemins, AccesMessage, AccesTitre } from '@client/compte/acces'
import { comptesReels, type SessionReelle } from '@client/comptes-reels/client'
import { fixerSession, hybride, lierAppareil } from '@client/comptes-reels/hybride'
import { AccesAttente, messageRefus, motDePasseValide } from '@client/compte/acces-reel'
import { SecretReel, emailValide } from './AccesReel'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import logo from '../../assets/logo-belivay.png'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { Brouillon, Candidature, Operateur, PieceCandidat, QuartierCandidat, TypeCommerce } from '../../donnees/domaines/acces'
import { origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Chargement, ErreurLecture, Note, PiedRelais, Progression, ecrireNumero, useMaintenant } from './commun'
import { ACCES, CONNEXION, RELAIS_P, numeroValide, prefixeValide } from './parametres'
import { JOURS_SEMAINE, montant, texteOffre, textePrefixes } from './textes'
import './pr03.css'

const VIDE: Brouillon = {
  etape: 1,
  commerce: { nom: '', type: null, quartier: '', repere: '', position: null },
  gerant: { nom: '', telephone: '', niu: '' },
  local: { placesEstimees: '', horaires: '' },
  versement: { operateur: null, numero: '', verifie: false },
  convention: { acceptee: false, signature: null },
  pieces: {},
}
const TYPES: [TypeCommerce, string][] = [
  ['boutique', 'Boutique'],
  ['pharmacie', 'Pharmacie'],
  ['papeterie', 'Papeterie'],
  ['salon', 'Salon'],
  ['station', 'Station'],
  ['autre', 'Autre'],
]

/** Vignettes des photos prises pendant la visite (jamais gardées ailleurs que dans la mémoire de l'onglet). */
const VIGNETTES = new Map<string, string>()

export default function Inscription() {
  const prefs = usePreferences()
  const { t, tf } = prefs
  const lecture = useLecture(() => Promise.all([source.acces.candidature(), source.acces.brouillon(), source.acces.quartiers()]), [])
  // Étape affichée (remontée par le parcours) : l'accroche, la photo et l'offre à l'étape 1 seulement.
  const [etape, setEtape] = useState<number>(1)
  // Compte réel créé (hybride) : « en attente de validation ».
  const [attente, setAttente] = useState<SessionReelle | null>(null)
  const naviguer = useNavigate()
  const envoyee = !!lecture.donnees?.[0]
  const debut = !envoyee && !attente && etape === 1
  return (
    <Ecran route="inscription" entete="aucun">
      <AccesCadre
        acteur="relais"
        logo={logo}
        espace={t('Espace point relais')}
        phrase={debut ? tf('Zéro caution · matériel fourni · réponse sous {h} h', { h: ACCES.appelCandidatHeures }) : undefined}
        reglages={prefs}
        compact={!debut}
        pied={<PiedRelais />}
        debut={
          <Link to={chemin('connexion')} className="axc-retour" aria-label={t('Revenir')}>
            <Icone nom="r-chevron-gauche" taille={24} trait={2.2} />
          </Link>
        }
      >
        {attente ? (
          <AccesAttente
            qui={attente.user.organisation || t('votre point relais')}
            email={attente.user.email}
            delai={tf('appel sous {h} h', { h: ACCES.appelCandidatHeures })}
            continuer={async () => {
              // En attendant la validation : la démonstration sous le nom du compte réel (session-hybride.ts).
              const m = await import('../../demo/session')
              m.ouvrirParCompte(m.membreDeLAppareil())
              naviguer(chemin('connexion'), { replace: true })
            }}
            deconnecter={async () => {
              await source.session.deconnecter()
              setAttente(null)
              naviguer(chemin('connexion'), { replace: true })
            }}
          />
        ) : (
        <Acces>
          <div className="pr3 pr3-pile">
            {debut && (
              <AccesChemins
                actif="inscription"
                label={t('Se connecter ou devenir point relais')}
                connexion={<Link to={chemin('connexion')}>{t('Se connecter')}</Link>}
                inscription={
                  <Link to={chemin('inscription')} replace>
                    {t('Devenir point relais')}
                  </Link>
                }
              />
            )}
            {!envoyee && <AccesTitre titre={t('Devenez point relais BelivaY')} />}
            {lecture.erreur ? <ErreurLecture relire={lecture.relire} /> : !lecture.donnees ? <Chargement /> : lecture.donnees[0] ? <Envoyee c={lecture.donnees[0]} /> : <Parcours depart={lecture.donnees[1] ?? VIDE} quartiers={lecture.donnees[2]} relire={lecture.relire} signaler={setEtape} attendre={setAttente} />}
          </div>
        </Acces>
        )}
      </AccesCadre>
    </Ecran>
  )
}

// ---------- Parcours en 5 étapes ----------

/** Texte d'appoint replié derrière un lien discret (fermé par défaut). */
function Plus({ resume, children }: { resume: string; children: ReactNode }) {
  return (
    <details className="pr3-plus">
      <summary>{resume}</summary>
      <div className="pr3-plus-c">{children}</div>
    </details>
  )
}

function Parcours({ depart, quartiers, relire, signaler, attendre }: { depart: Brouillon; quartiers: QuartierCandidat[]; relire: () => void; signaler: (etape: number) => void; attendre: (r: SessionReelle) => void }) {
  const prefs = usePreferences()
  const { t } = prefs
  const [b, setB] = useState<Brouillon>(depart)
  useEffect(() => signaler(b.etape), [b.etape, signaler])
  const [manques, setManques] = useState<string[]>([])
  const haut = useRef<HTMLDivElement>(null)
  // Brouillon gardé sur le téléphone à chaque changement (INS-01 : retour sans perte de saisie, même après fermeture).
  const premier = useRef(true)
  useEffect(() => {
    if (premier.current) return void (premier.current = false)
    const id = setTimeout(() => void source.acces.enregistrerBrouillon(b), 250)
    return () => clearTimeout(id)
  }, [b])
  const maj = (f: (x: Brouillon) => void) =>
    setB((x) => {
      const y = structuredClone(x)
      f(y)
      return y
    })
  const aller = (etape: Brouillon['etape']) => {
    setManques([])
    maj((x) => void (x.etape = etape))
    haut.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }
  const continuer = (m: string[]) => {
    setManques(m)
    if (m.length) return signal('erreur')
    signal('toucher')
    aller((b.etape + 1) as Brouillon['etape'])
  }
  const etapes = [t('Commerce'), t('Gérant'), t('Local'), t('Versement'), t('Convention')]
  const props = { b, maj, manques, continuer, retour: () => aller((b.etape - 1) as Brouillon['etape']) }
  return (
    <>
      <div ref={haut}>
        <Progression etapes={etapes} actuelle={b.etape} />
      </div>
      {b.etape === 1 ? <Commerce {...props} quartiers={quartiers} /> : b.etape === 2 ? <Gerant {...props} /> : b.etape === 3 ? <Local {...props} /> : b.etape === 4 ? <Versement {...props} /> : <Convention {...props} relire={relire} attendre={attendre} />}
      {/* L'offre et ce qui suit la demande : repliés, à ouvrir au besoin (l'étape reste le seul objectif de l'écran). */}
      {b.etape === 1 && (
        <Plus resume={t('L’offre et la suite de votre demande')}>
          <div className="p-81u2s6">{texteOffre(prefs)}</div>
          <ApresDemande c={null} />
        </Plus>
      )}
    </>
  )
}

interface PropsEtape {
  b: Brouillon
  maj: (f: (x: Brouillon) => void) => void
  manques: string[]
  continuer: (manques: string[]) => void
  retour: () => void
}

function Manques({ manques }: { manques: string[] }) {
  const { t } = usePreferences()
  if (!manques.length) return null
  return (
    <Note ton="rouge" id="pr3-manques">
      {t('Pour continuer :')} {manques.join(' · ')}
    </Note>
  )
}

function Champ(p: { libelle: string; valeur: string; changer: (v: string) => void; exemple?: string; type?: string; mode?: 'numeric' | 'tel' | 'text'; auto?: string; invalide?: boolean; max?: number }) {
  return (
    <label className="p-ky12xr">
      {p.libelle}
      <input type={p.type ?? 'text'} inputMode={p.mode} autoComplete={p.auto} placeholder={p.exemple} value={p.valeur} maxLength={p.max} onChange={(e) => p.changer(e.target.value)} aria-invalid={p.invalide || undefined} className="p-afs6hh" />
    </label>
  )
}

/** Codage Open Location Code (Plus Code) d'une position : 10 caractères, environ 14 m. */
function plusCode(lat: number, lng: number): string {
  const A = '23456789CFGHJMPQRVWX'
  let la = Math.min(90 - 1e-9, Math.max(-90, lat)) + 90
  let lo = (((lng + 180) % 360) + 360) % 360
  let res = 20
  let code = ''
  for (let i = 0; i < 5; i++) {
    const dLa = Math.floor(la / res)
    const dLo = Math.floor(lo / res)
    code += A[dLa] + A[dLo]
    la -= dLa * res
    lo -= dLo * res
    res /= 20
    if (i === 3) code += '+'
  }
  return code
}

function Commerce({ b, maj, manques, continuer, quartiers }: PropsEtape & { quartiers: QuartierCandidat[] }) {
  const { t, tf } = usePreferences()
  const [position, setPosition] = useState<'attente' | 'refus' | null>(null)
  const q = quartiers.find((x) => x.quartier.toLowerCase() === b.commerce.quartier.trim().toLowerCase())
  const placer = () => {
    if (!navigator.geolocation) return setPosition('refus')
    setPosition('attente')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosition(null)
        signal('succes')
        maj((x) => void (x.commerce.position = { lat: p.coords.latitude, lng: p.coords.longitude, plusCode: plusCode(p.coords.latitude, p.coords.longitude) }))
      },
      () => setPosition('refus'),
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  }
  const verifier = () =>
    continuer(
      [b.commerce.nom.trim().length < 2 && t('le nom du commerce'), !b.commerce.type && t('le type'), !b.commerce.quartier.trim() && t('le quartier')].filter((x): x is string => !!x),
    )
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{t('Votre commerce')}</h2>
      </div>
      <Champ libelle={t('NOM DU COMMERCE')} exemple={t('Ex. Boutique Mama René')} valeur={b.commerce.nom} changer={(v) => maj((x) => void (x.commerce.nom = v))} auto="organization" invalide={manques.length > 0 && b.commerce.nom.trim().length < 2} max={60} />
      <div className="p-yscrc8" id="pr3-type">
        {t('TYPE')}
      </div>
      <div className="p-8dmjde" role="radiogroup" aria-labelledby="pr3-type">
        {TYPES.map(([id, nom]) => (
          <button key={id} type="button" role="radio" aria-checked={b.commerce.type === id} className={(b.commerce.type === id ? 'p-rpzy79' : 'p-6z26dm') + ' pr3-puce'} onClick={() => maj((x) => void (x.commerce.type = id))}>
            {t(nom)}
          </button>
        ))}
      </div>
      <label className="p-ky12xr">
        {t('QUARTIER')}
        <input type="text" list="pr3-quartiers" placeholder={t('Ex. Mvog-Ada')} value={b.commerce.quartier} onChange={(e) => maj((x) => void (x.commerce.quartier = e.target.value))} aria-describedby="pr3-zone" aria-invalid={(manques.length > 0 && !b.commerce.quartier.trim()) || undefined} className="p-afs6hh" />
        <datalist id="pr3-quartiers">
          {quartiers.map((x) => (
            <option key={x.quartier} value={x.quartier} />
          ))}
        </datalist>
      </label>
      <div id="pr3-zone">
        {b.commerce.quartier.trim() &&
          (q?.exploitee ? (
            <Note ton="vert">{q.placeLibre ? tf('{zone} : zone de lancement, votre demande est étudiée en priorité.', { zone: q.zone ?? '' }) : tf('{zone} : zone de lancement, déjà servie par un relais. BelivaY étudie votre demande et ouvre un second relais selon le remplissage.', { zone: q.zone ?? '' })}</Note>
          ) : (
            <Note ton="ambre">{q?.zone ? tf('{zone} n’est pas encore une zone de lancement ({zones}) : votre demande ira en liste d’attente, et BelivaY vous appelle à l’ouverture de la zone.', { zone: q.zone, zones: ACCES.zonesExploitees.join(', ') }) : tf('Ce quartier n’est pas dans une zone de lancement ({zones}) : votre demande ira en liste d’attente, et BelivaY vous appelle à l’ouverture de la zone.', { zones: ACCES.zonesExploitees.join(', ') })}</Note>
          ))}
      </div>
      <Champ libelle={t('REPÈRE')} exemple={t('Ex. face pharmacie, enseigne jaune')} valeur={b.commerce.repere} changer={(v) => maj((x) => void (x.commerce.repere = v))} max={120} />
      <button type="button" className="p-rbzobc" onClick={placer} aria-busy={position === 'attente' || undefined}>
        <Icone nom="r-lieu" taille={18} className="p-672m16" />
        {b.commerce.position ? tf('Position enregistrée · {code}', { code: b.commerce.position.plusCode }) : t('Placer mon commerce sur la carte')}
      </button>
      {position === 'refus' && <Note ton="ambre">{t('Position indisponible : le repère suffit, l’agent placera le commerce lors de la visite.')}</Note>}
      <Manques manques={manques} />
      <div className="p-lndmsc">
        <span />
        <button type="button" className="p-ncx7qc" onClick={verifier}>
          {t('Continuer')}
        </button>
      </div>
    </div>
  )
}

/** Bouton qui prend une photo (ou une courte vidéo) avec l'appareil du téléphone. */
function BoutonPiece({ piece, libelle, icone, b, maj, video, classe, pleine }: { piece: PieceCandidat; libelle: string; icone: string; b: Brouillon; maj: PropsEtape['maj']; video?: boolean; classe: string; pleine?: boolean }) {
  const { t } = usePreferences()
  const entree = useRef<HTMLInputElement>(null)
  const fait = !!b.pieces[piece]
  const vignette = fait ? VIGNETTES.get(b.pieces[piece]!) : undefined
  const prise = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const id = `ph-${piece}-${Date.now().toString(36)}`
    if (!video && typeof URL.createObjectURL === 'function') VIGNETTES.set(id, URL.createObjectURL(f))
    signal('succes')
    maj((x) => void (x.pieces[piece] = id))
    e.target.value = ''
  }
  return (
    <>
      <button type="button" className={classe + ' pr3-piece' + (fait ? ' a-fait' : '') + (pleine ? ' pr3-pleine' : '')} onClick={() => entree.current?.click()} aria-label={fait ? `${libelle} · ${t('prise, toucher pour refaire')}` : libelle}>
        {vignette ? <img src={vignette} alt="" /> : <Icone nom={fait ? 'check' : icone} taille={video ? 22 : 20} className="p-672m16" />}
        {libelle}
      </button>
      <input ref={entree} className="pr3-fichier" type="file" accept={video ? 'video/*' : 'image/*'} capture={video ? 'user' : 'environment'} onChange={prise} tabIndex={-1} aria-hidden="true" data-piece={piece} />
    </>
  )
}

function Gerant({ b, maj, manques, continuer, retour }: PropsEtape) {
  const { t, tf } = usePreferences()
  const tel = b.gerant.telephone
  const verifier = () =>
    continuer(
      [
        b.gerant.nom.trim().length < 3 && t('nom et prénom'),
        !numeroValide(tel) && t('un téléphone de 9 chiffres'),
        !b.pieces.cni_recto && t('CNI recto'),
        !b.pieces.cni_verso && t('CNI verso'),
        !b.pieces.selfie_video && t('selfie vidéo'),
      ].filter((x): x is string => !!x),
    )
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{t('Le gérant')}</h2>
      </div>
      <Champ libelle={t('NOM ET PRÉNOM')} exemple={t('Tel que sur la pièce')} valeur={b.gerant.nom} changer={(v) => maj((x) => void (x.gerant.nom = v))} auto="name" invalide={manques.length > 0 && b.gerant.nom.trim().length < 3} max={80} />
      <Champ libelle={t('TÉLÉPHONE')} exemple={t('6XX XX XX XX')} type="tel" mode="tel" auto="tel-national" valeur={ecrireNumero(tel)} changer={(v) => maj((x) => void (x.gerant.telephone = v.replace(/\D/g, '').replace(/^237/, '').slice(0, 9)))} invalide={manques.length > 0 && !numeroValide(tel)} />
      <div className="p-0cipe3">
        <BoutonPiece piece="cni_recto" libelle={t('CNI recto')} icone="r-document" b={b} maj={maj} classe="p-g9a5yq" />
        <BoutonPiece piece="cni_verso" libelle={t('CNI verso')} icone="r-document" b={b} maj={maj} classe="p-g9a5yq" />
        <BoutonPiece piece="selfie_video" libelle={t('Selfie vidéo · preuve de vie')} icone="r-personne" b={b} maj={maj} video classe="p-g9a5yq" pleine />
      </div>
      <Champ libelle={t('NIU (FACULTATIF)')} exemple={t('Numéro d’identifiant unique, si vous en avez un')} valeur={b.gerant.niu} changer={(v) => maj((x) => void (x.gerant.niu = v.toUpperCase().slice(0, 20)))} />
      <Plus resume={t('En savoir plus')}>
        <div className="p-81u2s6">
          {tf('Vérification automatique en {min} minutes au plus ; sinon une personne répond sous {h} h ouvrées. Votre pièce n’est jamais montrée. Les clients voient votre prénom et l’initiale de votre nom, jamais votre numéro.', { min: ACCES.kyc.autoMinutes, h: ACCES.kyc.humainHeures })}{' '}
          {t('Le téléphone sert à vous connecter et confirme chaque ajout d’employé (code SMS).')}
        </div>
      </Plus>
      <Manques manques={manques} />
      <div className="p-lndmsc">
        <button type="button" className="p-rbzobc" onClick={retour}>
          {t('Retour')}
        </button>
        <button type="button" className="p-ncx7qc" onClick={verifier}>
          {t('Continuer')}
        </button>
      </div>
    </div>
  )
}

function Local({ b, maj, manques, continuer, retour }: PropsEtape) {
  const { t } = usePreferences()
  const places = Number(b.local.placesEstimees)
  const verifier = () =>
    continuer(
      [
        !b.pieces.facade && t('photo de la façade'),
        !b.pieces.rangement && t('photo du rangement'),
        !b.pieces.comptoir && t('photo du comptoir'),
        !(Number.isInteger(places) && places > 0) && t('les places estimées'),
        !b.local.horaires.trim() && t('les horaires'),
      ].filter((x): x is string => !!x),
    )
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{t('Votre local')}</h2>
      </div>
      <div className="p-zmtdxo">
        <BoutonPiece piece="facade" libelle={t('Façade')} icone="r-appareil-photo" b={b} maj={maj} classe="p-3n03l6" />
        <BoutonPiece piece="rangement" libelle={t('Rangement')} icone="r-appareil-photo" b={b} maj={maj} classe="p-3n03l6" />
        <BoutonPiece piece="comptoir" libelle={t('Comptoir')} icone="r-appareil-photo" b={b} maj={maj} classe="p-3n03l6" />
      </div>
      <Champ libelle={t('PLACES ESTIMÉES')} exemple={t('Ex. 30')} mode="numeric" valeur={b.local.placesEstimees} changer={(v) => maj((x) => void (x.local.placesEstimees = v.replace(/\D/g, '').slice(0, 3)))} invalide={manques.length > 0 && !(places > 0)} />
      <Champ libelle={t('HORAIRES HABITUELS')} exemple={t('Ex. 8 h – 19 h, lun. à sam.')} valeur={b.local.horaires} changer={(v) => maj((x) => void (x.local.horaires = v))} invalide={manques.length > 0 && !b.local.horaires.trim()} max={80} />
      <Plus resume={t('En savoir plus')}>
        <div className="p-81u2s6">{t('Il faut un coin sec, à l’abri des regards, et un comptoir où remettre. La photo de la façade aide les clients à trouver le relais. BelivaY vérifie lors de la visite.')} {t('Une place = un petit colis ; un moyen en prend 2, un grand 5 : les places sont vérifiées à la visite.')}</div>
      </Plus>
      <Manques manques={manques} />
      <div className="p-lndmsc">
        <button type="button" className="p-rbzobc" onClick={retour}>
          {t('Retour')}
        </button>
        <button type="button" className="p-ncx7qc" onClick={verifier}>
          {t('Continuer')}
        </button>
      </div>
    </div>
  )
}

function Versement({ b, maj, manques, continuer, retour }: PropsEtape) {
  const { t, tf } = usePreferences()
  const enLigne = useEnLigne()
  const maintenant = useMaintenant()
  const [code, setCode] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [msg, setMsg] = useState<{ ton: 'rouge' | 'ambre' | 'vert'; texte: string } | null>(null)
  const v = b.versement
  const op = (o: Operateur) => maj((x) => void (x.versement = { ...x.versement, operateur: o, verifie: false }))
  const recevoir = async () => {
    if (!v.operateur) return setMsg({ ton: 'rouge', texte: t('Choisissez l’opérateur.') })
    if (!numeroValide(v.numero)) return setMsg({ ton: 'rouge', texte: t('Entrez un numéro mobile camerounais de 9 chiffres, commençant par 6.') })
    // Préfixe vérifié AVANT l'envoi du code (PR03-R06).
    if (!prefixeValide(v.operateur, v.numero)) {
      signal('erreur')
      return setMsg({ ton: 'rouge', texte: v.operateur === 'mtn' ? t('Ce numéro n’est pas un numéro MTN MoMo : vérifiez le préfixe ou l’opérateur.') : t('Ce numéro n’est pas un numéro Orange Money : vérifiez le préfixe ou l’opérateur.') })
    }
    if (!enLigne) return setMsg({ ton: 'ambre', texte: t('Hors connexion : le code part par SMS dès que le réseau revient. Réessayez.') })
    const r = await source.acces.envoyerCodeVersement(v.operateur, v.numero, origine(maintenant()))
    if (!r.ok) return setMsg({ ton: 'ambre', texte: r.raison === 'trop_tot' ? t('Patientez avant de redemander un code.') : t('Numéro refusé : vérifiez-le.') })
    signal('toucher')
    setEnvoye(true)
    maj((x) => void (x.versement.verifie = false))
    setMsg({ ton: 'vert', texte: tf('Code envoyé par SMS au {numero}, valable {min} minutes.', { numero: ecrireNumero(v.numero), min: CONNEXION.codeSmsDureeMin }) })
  }
  const verifierCode = async (c = code) => {
    const r = await source.acces.verifierCodeVersement(c, origine(maintenant()))
    if (!r.ok) {
      signal('erreur')
      setCode('')
      return setMsg({ ton: 'rouge', texte: r.raison === 'code_faux' ? t('Code incorrect.') : t('Ce code a expiré : demandez-en un nouveau.') })
    }
    signal('succes')
    maj((x) => void (x.versement.verifie = true))
    setMsg({ ton: 'vert', texte: t('Numéro de versement vérifié.') })
  }
  const suivant = () => continuer([!v.operateur && t('l’opérateur'), !numeroValide(v.numero) && t('le numéro'), !v.verifie && t('le code reçu par SMS')].filter((x): x is string => !!x))
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{t('Où recevoir vos gains')}</h2>
        {v.verifie && <span className="p-nax3x4">{t('Vérifié')}</span>}
      </div>
      <div className="p-mm2ujz" role="radiogroup" aria-label={t('Opérateur')}>
        {(
          [
            ['mtn', 'MTN MoMo'],
            ['orange', 'Orange Money'],
          ] as [Operateur, string][]
        ).map(([id, nom]) => (
          <button key={id} type="button" role="radio" aria-checked={v.operateur === id} className={(v.operateur === id ? 'p-rpzy79' : 'p-6z26dm') + ' pr3-puce'} onClick={() => op(id)}>
            {t(nom)}
          </button>
        ))}
      </div>
      <Champ libelle={t('NUMÉRO DE VERSEMENT')} exemple={t('6XX XX XX XX')} type="tel" mode="tel" valeur={ecrireNumero(v.numero)} changer={(n) => maj((x) => void (x.versement = { ...x.versement, numero: n.replace(/\D/g, '').replace(/^237/, '').slice(0, 9), verifie: false }))} invalide={manques.length > 0 && !numeroValide(v.numero)} />
      <button type="button" className="p-v96i0s" onClick={() => void recevoir()}>
        <Icone nom="r-telephone" taille={18} className="p-7dsggt" />
        {envoye ? t('Renvoyer le code') : t('Recevoir le code')}
      </button>
      <label className="p-ky12xr">
        {t('CODE REÇU')}
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder={t('000000')}
          value={code}
          disabled={v.verifie}
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, '').slice(0, CONNEXION.codeSmsLongueur)
            setCode(c)
            if (c.length === CONNEXION.codeSmsLongueur) void verifierCode(c)
          }}
          className="p-vust5v"
        />
      </label>
      {msg && <Note ton={msg.ton}>{msg.texte}</Note>}
      <Plus resume={t('En savoir plus')}>
        <div className="p-81u2s6">{tf('Le numéro doit être au nom du gérant. Préfixe vérifié : {prefixes}. Un seul numéro actif à la fois ; un changement ultérieur demande deux codes SMS et {j} jours de vérification.', { prefixes: textePrefixes(t), j: ACCES.changementNumeroJours })}</div>
      </Plus>
      <Manques manques={manques} />
      <div className="p-lndmsc">
        <button type="button" className="p-rbzobc" onClick={retour}>
          {t('Retour')}
        </button>
        <button type="button" className="p-ncx7qc" onClick={suivant}>
          {t('Continuer')}
        </button>
      </div>
    </div>
  )
}

/** Signature au doigt (horodatée et versionnée à l'envoi) ; au clavier : signer en tapant son nom. */
function Signature({ valeur, changer, nom }: { valeur: string | null; changer: (v: string | null) => void; nom: string }) {
  const { t } = usePreferences()
  const toile = useRef<HTMLCanvasElement>(null)
  const trace = useRef(false)
  const dessin = useRef(false)
  useEffect(() => {
    const c = toile.current
    if (!c) return
    const r = c.getBoundingClientRect()
    c.width = Math.max(1, Math.round(r.width * devicePixelRatio))
    c.height = Math.max(1, Math.round(r.height * devicePixelRatio))
    const x = c.getContext('2d')
    if (!x) return
    x.scale(devicePixelRatio, devicePixelRatio)
    x.lineWidth = 2.4
    x.lineCap = 'round'
    x.strokeStyle = getComputedStyle(c).color
    if (valeur?.startsWith('nom:')) {
      x.font = 'italic 700 22px serif'
      x.fillStyle = getComputedStyle(c).color
      x.fillText(valeur.slice(4), 16, r.height / 2 + 8)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valeur?.startsWith('nom:') ? valeur : null])
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top] as const
  }
  const effacer = () => {
    const c = toile.current
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height)
    dessin.current = false
    changer(null)
  }
  return (
    <>
      <div className={'p-c35ppc pr3-signature' + (valeur ? ' a-signe' : '')}>
        <canvas
          ref={toile}
          role="img"
          aria-label={valeur ? t('Signature posée') : t('Zone de signature')}
          onPointerDown={(e) => {
            trace.current = true
            e.currentTarget.setPointerCapture?.(e.pointerId)
            const x = e.currentTarget.getContext('2d')
            const [a, b] = point(e)
            x?.beginPath()
            x?.moveTo(a, b)
          }}
          onPointerMove={(e) => {
            if (!trace.current) return
            const x = e.currentTarget.getContext('2d')
            const [a, b] = point(e)
            x?.lineTo(a, b)
            x?.stroke()
            dessin.current = true
          }}
          onPointerUp={(e) => {
            trace.current = false
            if (dessin.current) changer(e.currentTarget.toDataURL('image/png'))
          }}
        />
        <span>{t('Signez ici avec le doigt')}</span>
      </div>
      <div className="pr3-ligne-action">
        <button type="button" className="p-rbzobc" onClick={() => changer('nom:' + (nom.trim() || '—'))}>
          <Icone nom="pen-line" taille={18} className="p-emic6i" />
          {t('Signer avec mon nom')}
        </button>
        <button type="button" className="p-rbzobc" onClick={effacer} disabled={!valeur}>
          {t('Effacer la signature')}
        </button>
      </div>
    </>
  )
}

function Convention({ b, maj, retour, relire, attendre }: PropsEtape & { relire: () => void; attendre: (r: SessionReelle) => void }) {
  const { t, tf, langue } = usePreferences()
  const enLigne = useEnLigne()
  const maintenant = useMaintenant()
  const [msg, setMsg] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  // Compte réel (hybride) : e-mail, mot de passe ou code, consentement ; refus du serveur focalisé près du bouton.
  const [email, setEmail] = useState('')
  const [secret, setSecret] = useState('')
  const [accepte, setAccepte] = useState(false)
  const [vu, setVu] = useState(false)
  const refMsg = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (msg && hybride) refMsg.current?.focus()
  }, [msg])
  const g = RELAIS_P.gainColis
  const pret = b.convention.acceptee && !!b.convention.signature
  const envoyerReel = async () => {
    setVu(true)
    setMsg(null)
    if (!emailValide(email) || !motDePasseValide(secret, true) || !accepte) {
      signal('erreur')
      const premier = !emailValide(email) ? '#pr3-reel-email' : !motDePasseValide(secret, true) ? '#pr3-reel-secret' : '.acr-case input'
      return document.querySelector<HTMLElement>(premier)?.focus()
    }
    setEnvoi(true)
    const [prenom, ...reste] = b.gerant.nom.trim().split(/\s+/)
    const r = await comptesReels.inscrire('relais', {
      email: email.trim(),
      motDePasse: secret,
      prenom,
      nom: reste.join(' '),
      telephone: '+237' + b.gerant.telephone,
      conditions: { acceptees: true, version: '1.0' },
      candidature: {
        nom: b.commerce.nom.trim(),
        type: b.commerce.type ?? '',
        quartier: b.commerce.quartier.trim(),
        repere: b.commerce.repere.trim(),
        position: b.commerce.position?.plusCode ?? '',
        places: Number(b.local.placesEstimees) || 0,
        horaires: b.local.horaires.trim(),
        operateur: b.versement.operateur ?? '',
        niu: b.gerant.niu,
        convention: '1.0',
      },
    })
    setEnvoi(false)
    if (!r.ok) {
      signal('erreur')
      setSecret('')
      return setMsg(r.code === 'pin_trop_simple' ? t('Ce code est trop simple : évitez 123456, 000000 et les suites.') : r.code === 'mot_de_passe_demo' ? t('Ce mot de passe est réservé à la démonstration : choisissez-en un autre.') : messageRefus(r))
    }
    fixerSession('relais', r)
    // L'appareil est lié au compte : la prochaine connexion passe par le PIN ou le mot de passe (session-hybride.ts).
    lierAppareil('relais', { identifiant: r.user.phone ?? r.user.email, prenom: r.user.first_name, nom: r.user.last_name, essaisRestants: 5, bloqueJusqua: null })
    signal('succes')
    attendre(r)
  }
  const envoyer = async () => {
    if (!pret || envoi) return
    if (hybride) return void envoyerReel()
    if (!enLigne) return setMsg(t('Hors connexion : la demande part avec ses photos dès que le réseau revient. Réessayez.'))
    setEnvoi(true)
    try {
      const r = await source.acces.candidater(b, origine(maintenant()))
      if (!r.ok) {
        signal('erreur')
        return setMsg(
          r.raison === 'deja_candidat'
            ? t('Une demande existe déjà pour ce téléphone.')
            : r.raison === 'versement_non_verifie'
              ? t('Le numéro de versement n’est pas vérifié : revenez à l’étape 4.')
              : r.raison === 'convention_non_signee'
                ? t('Acceptez la convention et signez.')
                : t('Il manque une information : revoyez les étapes.'),
        )
      }
      signal('succes')
      relire()
    } finally {
      setEnvoi(false)
    }
  }
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{t('La convention')}</h2>
      </div>
      <div className="p-mqmvkk">
        <span className="p-ytl255">{t('Caution')}</span>
        <span className="p-enqpyq">{t('aucune')}</span>
      </div>
      <div className="p-mqmvkk">
        <span className="p-ytl255">{t('Frais d’entrée')}</span>
        <span className="p-enqpyq">{t('aucun')}</span>
      </div>
      <div className="p-mqmvkk">
        <span className="p-ytl255">{t('Rémunération')}</span>
        <span className="p-2vq92h">{tf('{s} / {m} / {l} F par colis', { s: g.S, m: g.M, l: g.L })}</span>
      </div>
      <div className="p-mqmvkk">
        <span className="p-ytl255">{t('Garde')}</span>
        <span className="p-2vq92h">{RELAIS_P.garde.j1PayeParBelivay ? tf('{f} par jour, 1er jour compris', { f: montant(RELAIS_P.garde.gainRelaisJour) }) : tf('{f} par jour facturé', { f: montant(RELAIS_P.garde.gainRelaisJour) })}</span>
      </div>
      <div className="p-mqmvkk">
        <span className="p-ytl255">{t('Espèces de garde')}</span>
        <span className="p-2vq92h">{t('encaissées par vous, votre part gardée')}</span>
      </div>
      <div className="p-mqmvkk">
        <span className="p-ytl255">{t('Versement')}</span>
        <span className="p-2vq92h">{tf('chaque {jour}', { jour: t(JOURS_SEMAINE[RELAIS_P.versement.jourSemaine]) })}</span>
      </div>
      <div className="p-mqmvkk">
        <span className="p-ytl255">{tf('Exclusivité ({n} premiers)', { n: ACCES.fondateurs })}</span>
        <span className="p-2vq92h">{tf('{m} m · {mois} mois', { m: ACCES.exclusiviteRayonM, mois: ACCES.exclusiviteMois })}</span>
      </div>
      <Link to={chemin('convention')} className="p-rbzobc">
        <Icone nom="r-document" taille={18} className="p-emic6i" />
        {t('Lire la convention complète')}
      </Link>
      <div className="p-pfxfo4">
        <button type="button" role="switch" aria-checked={b.convention.acceptee} className="pr3-inter" onClick={() => maj((x) => void (x.convention.acceptee = !x.convention.acceptee))}>
          <span className="p-bgyo12">
            <span className="p-p91l1v" />
          </span>
          <span className="p-2qny0z">{t('J’ai lu la convention et je l’accepte')}</span>
        </button>
      </div>
      <Signature valeur={b.convention.signature} nom={b.gerant.nom} changer={(v) => maj((x) => void (x.convention.signature = v))} />
      {hybride && <SecretReel email={email} setEmail={setEmail} secret={secret} setSecret={setSecret} accepte={accepte} setAccepte={setAccepte} vu={vu} />}
      <Plus resume={t('En savoir plus')}>
        <div className="p-81u2s6">{tf('Version 1.0 · acceptation et signature horodatées le {quand}. Toute évolution de la convention vous est annoncée à l’avance et s’accepte dans l’application, jamais rétroactive.', { quand: jourLong(maintenant(), langue) })}</div>
      </Plus>
      {msg &&
        (hybride ? (
          <div ref={refMsg} tabIndex={-1} style={{ outline: 'none' }}>
            <AccesMessage>{msg}</AccesMessage>
          </div>
        ) : (
          <Note ton="rouge">{msg}</Note>
        ))}
      <div className="p-lndmsc">
        <button type="button" className="p-rbzobc" onClick={retour}>
          {t('Retour')}
        </button>
        <button type="button" className="p-ncx7qc" disabled={!pret} aria-describedby="pr3-envoi" aria-busy={envoi || undefined} onClick={() => void envoyer()}>
          {t('Envoyer ma demande')}
        </button>
      </div>
      {!pret && (
        <div id="pr3-envoi" className="p-16950n">
          {t('« Envoyer ma demande » s’active quand la convention est acceptée et signée.')}
        </div>
      )}
    </div>
  )
}

// ---------- Après l'envoi ----------

const SUIVI: Record<string, { icone: string; titre: string; texte: string }> = {
  appel: { icone: 'r-telephone', titre: 'Appel sous {h} h', texte: 'Un agent confirme votre dossier' },
  visite: { icone: 'r-lieu', titre: 'Visite du local', texte: 'Rangement et comptoir contrôlés, séance de pratique au comptoir ({pratique} h)' },
  formation: { icone: 'r-formation', titre: 'Formation', texte: '{n} modules, environ {min} min au total' },
  ouverture: { icone: 'r-boutique', titre: 'Ouverture', texte: 'Votre relais apparaît sur la carte des clients' },
}

function ApresDemande({ c }: { c: Candidature | null }) {
  const { t, tf } = usePreferences()
  const v = { h: ACCES.appelCandidatHeures, pratique: ACCES.visitePratiqueHeures, n: RELAIS_P.formationModules, min: ACCES.formationMinutes }
  const etat = (e: string) => c?.suivi.find((x) => x.etape === e)?.etat
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{c ? t('Suivi de votre demande') : t('Après votre demande')}</h2>
      </div>
      {(['appel', 'visite', 'formation', 'ouverture'] as const).map((e, i) => {
        const x = SUIVI[e]
        const s = etat(e)
        return (
          <div key={e}>
            {i > 0 && <div className="p-92xvtp" />}
            <div className="p-o24hsm">
              <div className={e === 'ouverture' ? 'p-tc472u' : 'p-toppw8'}>
                <Icone nom={x.icone} taille={20} className={e === 'ouverture' ? 'p-q7qjlz' : 'p-672m16'} />
              </div>
              <div className="p-rnqj8n">
                <div className="p-ife3a2">{tf(x.titre, v)}</div>
                <div className="p-dfa05r">{tf(x.texte, v)}</div>
              </div>
              {s === 'faite' ? <span className="p-nax3x4 pr3-etat">{t('Fait')}</span> : s === 'en_cours' ? <span className="p-rpzy79 pr3-etat">{t('En cours')}</span> : s ? <span className="p-6z26dm pr3-etat">{t('À venir')}</span> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Envoyee({ c }: { c: Candidature }) {
  const { t, tf, langue } = usePreferences()
  const session = useSession()
  const programme = useFeuille('programme')
  const demande = useFeuille('demande')
  const liste = useLecture(() => source.acces.programme(), [])
  const attente = c.etat === 'liste_attente'
  const etapes = useMemo(() => [t('Commerce'), t('Gérant'), t('Local'), t('Versement'), t('Convention')], [t])
  return (
    <>
      <Progression etapes={etapes} actuelle={5} />
      <div className="p-c1r1yj">
        <div className="p-vhxw8h">
          <Icone nom={attente ? 'hourglass' : 'check'} taille={32} trait={2.6} className="p-q7qjlz" />
        </div>
        <h1 className="p-fdt7cn">{attente ? t('Demande en liste d’attente') : t('Demande envoyée')}</h1>
        <div className="p-uzhe04">
          {attente
            ? tf('Votre quartier n’est pas encore une zone de lancement ({zones}). Votre demande {ref} est gardée : BelivaY vous appelle à l’ouverture de la zone.', { zones: ACCES.zonesExploitees.join(', '), ref: c.reference })
            : tf('Un agent BelivaY vous appelle avant le {quand} pour fixer la visite. Après son appel, un SMS ouvre votre espace : vous créez votre code PIN et suivez la formation, {n} modules courts sur votre téléphone.', { quand: echeance(c.appelAvant, session.maintenant, langue), n: RELAIS_P.formationModules })}
        </div>
        <button type="button" className="p-ncx7qc" onClick={programme.ouvrir}>
          <Icone nom="r-formation" taille={18} className="p-7dsggt" />
          {t('Découvrir la formation')}
        </button>
        <button type="button" className="p-rbzobc" onClick={demande.ouvrir}>
          {t('Revoir ma demande')}
        </button>
      </div>
      <ApresDemande c={c} />
      <Feuille ouverte={programme.ouverte} fermer={programme.fermer} titre={t('La formation')}>
        <div className="pr3-feuille pr3">
          <h2>{t('La formation')}</h2>
          <p>{tf('{n} modules obligatoires (≈ {min} min, quiz compris), puis une séance de pratique au comptoir ({pratique} h) lors de la visite. Vous les suivez sur ce téléphone dès l’ouverture de votre espace.', { n: RELAIS_P.formationModules, min: ACCES.formationMinutes, pratique: ACCES.visitePratiqueHeures })}</p>
          {liste.donnees?.map((m) => (
            <div key={m.id} className="p-o24hsm">
              <div className="p-toppw8">
                <Icone nom="r-formation" taille={20} className="p-672m16" />
              </div>
              <div className="p-rnqj8n">
                <div className="p-ife3a2">{t(m.titre)}</div>
                <div className="p-dfa05r">{m.obligatoire ? tf('{n} min', { n: m.minutes }) : tf('{n} min · facultatif', { n: m.minutes })}</div>
              </div>
            </div>
          ))}
          <button type="button" className="p-rbzobc" onClick={programme.fermer}>
            {t('Fermer')}
          </button>
        </div>
      </Feuille>
      <Feuille ouverte={demande.ouverte} fermer={demande.fermer} titre={t('Ma demande')}>
        <div className="pr3-feuille pr3">
          <h2>{tf('Demande {ref}', { ref: c.reference })}</h2>
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Envoyée le')}</span>
            <span className="p-2vq92h">{jourLong(c.envoyeeLe, langue)}</span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Commerce')}</span>
            <span className="p-2vq92h">{c.commerce}</span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Quartier')}</span>
            <span className="p-2vq92h">{c.zone ? `${c.quartier} · ${c.zone}` : c.quartier}</span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Pièce d’identité')}</span>
            <span className="p-2vq92h">{c.identite === 'verifiee' ? t('vérifiée') : c.identite === 'a_refaire' ? t('à refaire') : t('en vérification')}</span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('État')}</span>
            <span className="p-2vq92h">{attente ? t('liste d’attente') : t('à l’étude')}</span>
          </div>
          <p>{t('Vos données servent seulement au dossier ; vous pourrez les consulter, les corriger et les exporter depuis Paramètres › Mes données (loi n° 2024/017).')}</p>
          <button type="button" className="p-rbzobc" onClick={demande.fermer}>
            {t('Fermer')}
          </button>
        </div>
      </Feuille>
    </>
  )
}
