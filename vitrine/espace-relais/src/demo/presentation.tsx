// DONNÉES DE DÉMONSTRATION — le mode présentation (« ?presentation=1 », VAGUE-AMELIORATIONS.md n° 1) : la commande
// témoin du 13 octobre (Carine M. achète le défroisseur de Boutique B au Relais Bastos Carrefour, Yafé Express affecte
// Serge A., Rose M. reçoit puis remet le colis) rejouée en neuf étapes dans les cinq applications ouvertes côte à côte
// (même origine : le pont commun, src/demo/pont.ts). Chaque étape est jouée par l'application de son acteur, avec ses
// propres règles (src/demo/presentation-app.ts : les gestes réels des domaines de la démonstration, jamais un état
// écrit à la main) ; les quatre autres la voient arriver par le pont. Un bandeau commun dit l'étape (n/9) et porte
// Pause, Suivant et Recommencer ; Recommencer remet les cinq applications à zéro (le jeu d'essai, préférences gardées).
// L'étape suivante part seule quelques secondes après la fin de la précédente, sauf en pause ; une étape dont
// l'application n'est pas ouverte attend qu'on l'ouvre. « ?presentation=0 » (ou la croix) quitte le mode.
// Ce fichier est LE MÊME, octet pour octet, dans les cinq applications (test : espace-relais/src/demo/pont.test.ts) ;
// seul src/demo/presentation-app.ts (« ACTEUR ») diffère.
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { APP, appliOuverte, evenementsPour, type AppPont } from './pont'
import { ACTEUR } from './presentation-app'

export interface ActeurPresentation {
  /** Les gestes de cette application pour l'étape n (déjà faits : rien) ; une erreur dit ce qui manque. */
  executer(n: number): Promise<void>
  /** Ce que les autres applications ont publié, appliqué ici (comme à l'ouverture d'un écran). */
  synchroniser(): void
  /** L'écran à montrer à l'étape n (adresse dans l'application), ou null : l'écran ouvert reste. */
  ecran(n: number, faite: boolean): string | null
}

type Texte = [fr: string, en: string]
export interface EtapePresentation {
  n: number
  app: AppPont
  titre: Texte
  texte: Texte
}

/** Les neuf étapes de la commande témoin (CAHIER-CONNECTIVITE.md, étapes 2 à 6), dans l'ordre. */
export const ETAPES: EtapePresentation[] = [
  { n: 1, app: 'client', titre: ['Carine commande et paie', 'Carine orders and pays'], texte: ['Le défroisseur vapeur de Boutique B (65 000 F), retrait au Relais Bastos Carrefour, payé en MTN MoMo : 66 300 F avec les frais.', 'Boutique B’s steamer (65,000 F), pickup at Relais Bastos Carrefour, paid with MTN MoMo: 66,300 F with fees.'] },
  { n: 2, app: 'vendeur', titre: ['Boutique B prépare : « C’est prêt »', 'Boutique B prepares: “Ready”'], texte: ['Bon ouvert, colis emballé et photographié : le paquet part vers les entreprises de la zone.', 'Slip opened, parcel packed and photographed: the package goes to the zone’s delivery companies.'] },
  { n: 3, app: 'entreprise', titre: ['Yafé Express accepte et affecte Serge A.', 'Yafé Express accepts and assigns Serge A.'], texte: ['Le paquet est accepté puis affecté : le vendeur, Carine et le relais voient le livreur.', 'The package is accepted then assigned: the seller, Carine and the relay see the courier.'] },
  { n: 4, app: 'livreur', titre: ['Serge part et arrive chez Boutique B', 'Serge sets off and reaches Boutique B'], texte: ['Tournée démarrée ; « Votre livreur est là » chez le vendeur.', 'Round started; “Your courier is here” for the seller.'] },
  { n: 5, app: 'livreur', titre: ['Ramassage : contrôle, scellé, code de remise', 'Pickup: check, seal, handover code'], texte: ['Six contrôles et photos, étiquette liée, colis scellé, code du vendeur : Carine voit « Ramassé ».', 'Six checks and photos, label linked, parcel sealed, seller’s code: Carine sees “Picked up”.'] },
  { n: 6, app: 'livreur', titre: ['Serge arrive au Relais Bastos Carrefour', 'Serge reaches Relais Bastos Carrefour'], texte: ['Rose M. l’a vu en approche ; il présente son code de dépôt.', 'Rose M. saw him coming; he shows his drop-off code.'] },
  { n: 7, app: 'relais', titre: ['Rose M. reçoit et valide le lot', 'Rose M. receives and validates the batch'], texte: ['Code de dépôt vérifié, colis contrôlé (scellé intact), photo du lot et PIN.', 'Drop-off code checked, parcel checked (seal intact), batch photo and PIN.'] },
  { n: 8, app: 'livreur', titre: ['Serge confirme : la garde passe au relais', 'Serge confirms: custody moves to the relay'], texte: ['Carine reçoit l’avis d’arrivée puis son code de retrait : « Prêt au retrait ».', 'Carine gets the arrival notice then her pickup code: “Ready for pickup”.'] },
  { n: 9, app: 'relais', titre: ['Carine retire son colis', 'Carine collects her parcel'], texte: ['Code vérifié au comptoir, « Tout est en ordre », photo et PIN : « Retirée » partout.', 'Code checked at the counter, “All in order”, photo and PIN: “Collected” everywhere.'] },
]
export const DERNIERE = ETAPES.length
export const APPS_PRESENTATION: AppPont[] = ['client', 'vendeur', 'entreprise', 'livreur', 'relais']
export const ADRESSES: Record<AppPont, string> = { client: '/', vendeur: '/vendeur/', entreprise: '/entreprise/', livreur: '/livreur/', relais: '/relais/' }
const NOMS: Record<AppPont, Texte> = {
  client: ['Client · Carine M.', 'Customer · Carine M.'],
  vendeur: ['Vendeur · Boutique B', 'Seller · Boutique B'],
  entreprise: ['Entreprise · Yafé Express', 'Company · Yafé Express'],
  livreur: ['Livreur · Serge A.', 'Courier · Serge A.'],
  relais: ['Relais · Rose M.', 'Relay · Rose M.'],
}

// ---------- L'état partagé (localStorage, même origine) ----------

export interface EtatPresentation {
  cycle: number // une présentation (Recommencer en ouvre une nouvelle)
  phase: 'reinitialisation' | 'prete'
  etape: number // 0 : prête à démarrer ; 1 à 9 : l'étape montrée
  faites: number[]
  pause: boolean
  enCours: number | null // étape que son application est en train de jouer
  erreur: { etape: number; texte: string } | null
}
const CLE = 'blv_presentation'
/** L'étape suivante part seule ce délai après la fin de la précédente (sauf en pause). */
export const DELAI_SUITE_MS = 7000
/** Recommencer : les autres onglets cessent d'écrire, puis les données de démonstration sont effacées. */
const ATTENTE_REMISE_MS = 1200

export function lirePresentation(): EtatPresentation | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) ?? 'null') as EtatPresentation | null
    return v && typeof v.cycle === 'number' ? v : null
  } catch {
    return null
  }
}
function ecrire(e: EtatPresentation | null) {
  try {
    if (e) localStorage.setItem(CLE, JSON.stringify(e))
    else localStorage.removeItem(CLE)
  } catch {
    /* stockage refusé : pas de présentation */
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('blv:presentation'))
}
function modifier(f: (e: EtatPresentation) => EtatPresentation) {
  const e = lirePresentation()
  if (e) ecrire(f(e))
}
/** Vrai pendant une présentation prête (le bandeau est affiché, les étapes se jouent). */
export const presentationActive = (): boolean => lirePresentation()?.phase === 'prete'

/**
 * Données de démonstration des cinq applications (le pont, chaque domaine, les files hors ligne, les brouillons) ;
 * les préférences (thème, langue, taille du texte), l'accueil déjà vu et le battement de présence restent.
 */
const A_EFFACER = /^blv_(pont(?!_presence_)|demo_(?!bandeau$|prototype$)|[cvelr]_demo_|[cvelr]_file|[cvelr]_brouillon|pub_)/
export function effacerDonneesDemo() {
  for (const s of [localStorage, sessionStorage])
    try {
      for (const k of Object.keys(s)) if (A_EFFACER.test(k)) s.removeItem(k)
    } catch {
      /* rien */
    }
}

let arrete = false // l'onglet n'écrit plus rien : la remise à zéro est en cours
/** Recommencer (ou entrer en présentation) : remise à zéro des cinq applications, étape 0. */
export function recommencer() {
  // Un numéro neuf (jamais celui d'avant, même sous une horloge figée) : chaque onglet sait qu'il doit se recharger.
  const avant = lirePresentation()?.cycle ?? 0
  let cycle = avant
  while (cycle === avant) cycle = 1 + Math.floor(Math.random() * 2 ** 30)
  ecrire({ cycle, phase: 'reinitialisation', etape: 0, faites: [], pause: false, enCours: null, erreur: null })
  arrete = true
  effacerDonneesDemo()
  window.setTimeout(() => {
    effacerDonneesDemo()
    ecrire({ cycle, phase: 'prete', etape: 0, faites: [], pause: false, enCours: null, erreur: null })
    location.reload()
  }, ATTENTE_REMISE_MS)
}
export function quitter() {
  ecrire(null)
}
/** Suivant : l'étape montrée est faite (ou passée), la suivante commence. */
export function suivant(passer = false) {
  modifier((e) => {
    if (e.etape >= DERNIERE) return e
    if (e.etape > 0 && !e.faites.includes(e.etape) && !passer) return e
    return { ...e, etape: e.etape + 1, faites: passer && !e.faites.includes(e.etape) ? [...e.faites, e.etape] : e.faites, erreur: null, enCours: null }
  })
}
export const basculerPause = () => modifier((e) => ({ ...e, pause: !e.pause }))
export const reessayer = () => modifier((e) => ({ ...e, erreur: null }))

// ---------- Les références de la commande témoin, lues au journal du pont ----------

/** La commande témoin : la dernière commande payée publiée par le client. */
export function refTemoin(): string | null {
  const e = evenementsPour('admin').filter((x) => x.type === 'order.paid').pop()
  return e && e.type === 'order.paid' ? e.commande : null
}
/** Le paquet publié pour le colis de la commande témoin. */
export function paquetTemoin(): string | null {
  const ref = refTemoin()
  if (!ref) return null
  const e = evenementsPour('admin').filter((x) => x.type === 'package.published' && x.colis.includes(ref + '-1')).pop()
  return e && e.type === 'package.published' ? e.paquet : null
}
/** Attend qu'une condition soit vraie (ce qu'une autre application publie arrive par le pont). */
export async function attendre(f: () => boolean | Promise<boolean>, texte: string, ms = 15_000) {
  for (let t = 0; t < ms; t += 250) {
    if (await f()) return
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(texte)
}
let geste = 0
/** Heure et clé d'un geste joué par la présentation (une clé neuve par geste, comme un toucher). */
export const origineGeste = (heure: number) => ({ cle: `presentation-${lirePresentation()?.cycle ?? 0}-${APP}-${++geste}`, heure, position: null })
/** Photo de démonstration (1 × 1 pixel), comme la photo simulée des écrans sans appareil photo. */
export const PHOTO_DEMO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

// ---------- Le pilote : chaque onglet joue les étapes de son application ----------

const CYCLE_VU = typeof window !== 'undefined' ? (lirePresentation()?.cycle ?? null) : null
let ici = false // une étape se joue dans cet onglet
let suite: string | null = null // étape dont la suite automatique est programmée dans cet onglet

async function jouer(n: number) {
  ici = true
  modifier((e) => ({ ...e, enCours: n }))
  try {
    await ACTEUR.executer(n)
    modifier((e) => ({ ...e, enCours: null, erreur: null, faites: e.faites.includes(n) ? e.faites : [...e.faites, n] }))
    window.dispatchEvent(new CustomEvent('blv:donnees', { detail: { domaine: 'presentation' } }))
  } catch (x) {
    modifier((e) => ({ ...e, enCours: null, erreur: { etape: n, texte: x instanceof Error ? x.message : String(x) } }))
  } finally {
    ici = false
  }
}

function tic() {
  const e = lirePresentation()
  if (!e || e.phase !== 'prete' || arrete || e.cycle !== CYCLE_VU) return
  try {
    ACTEUR.synchroniser()
  } catch {
    /* une lecture qui échoue n'arrête pas la présentation */
  }
  const n = e.etape
  const etape = ETAPES[n - 1]
  if (etape && etape.app === APP && !e.faites.includes(n) && e.enCours === null && !ici && e.erreur?.etape !== n) void jouer(n)
  const cle = `${e.cycle}:${n}`
  if (n > 0 && n < DERNIERE && e.faites.includes(n) && !e.pause && suite !== cle) {
    suite = cle
    window.setTimeout(() => {
      const x = lirePresentation()
      if (!x || x.pause || x.etape !== n) return void (suite = null)
      if (x.faites.includes(n)) suivant()
    }, DELAI_SUITE_MS)
  }
  window.dispatchEvent(new CustomEvent('blv:presentation'))
}

if (typeof window !== 'undefined') {
  // Entrée par l'adresse : ?presentation=1 démarre (ou rejoint) la présentation, ?presentation=0 la quitte.
  const demande = new URLSearchParams(location.search).get('presentation')
  const e = lirePresentation()
  if (demande === '0' && e) quitter()
  else if (demande === '1' && !e) recommencer()
  else if (e?.phase === 'reinitialisation') arrete = true
  window.addEventListener('storage', (ev) => {
    if (ev.key !== CLE && ev.key !== null) return
    const x = lirePresentation()
    if (x?.phase === 'reinitialisation') arrete = true
    else if (x && x.cycle !== CYCLE_VU) location.reload()
    else window.dispatchEvent(new CustomEvent('blv:presentation'))
  })
  window.setInterval(tic, 1000)
  window.setTimeout(tic, 300)
  Object.defineProperty(window, '__blvPresentation', { configurable: true, value: { lire: lirePresentation, suivant, recommencer, basculerPause, quitter } })
}

// ---------- Le bandeau ----------

const STYLE = `
.blvp{position:fixed;z-index:10000;top:calc(8px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(560px,calc(100vw - 16px));box-sizing:border-box;background:var(--card,#fff);color:var(--ink,#1c1917);border:1px solid var(--line,#e5e5e5);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:10px 12px;font-size:13px;line-height:1.35;font-family:inherit;text-align:left}
.blvp *{box-sizing:border-box}
.blvp p{font-size:13px;line-height:1.35;letter-spacing:normal}
.blvp-l1{display:flex;align-items:center;gap:8px;flex-wrap:nowrap;min-width:0}
.blvp-tag{flex:none;font-weight:800;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--or-txt,var(--or,#c2530f))}
.blvp-n{flex:none;white-space:nowrap;font-weight:800;font-variant-numeric:tabular-nums}
.blvp-app{min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;border:1px solid var(--line,#e5e5e5);color:var(--ink-3,#5f5853);white-space:nowrap}
.blvp-app.ici{background:var(--or,#f07a2e);border-color:transparent;color:#fff}
.blvp .blvp-t{font-weight:800;font-size:15px;margin:4px 0 2px}
.blvp-x{color:var(--ink-3,#5f5853);margin:0}
.blvp-s{margin:6px 0 0;font-weight:600}
.blvp-s.err{color:var(--red,#b42318)}
.blvp-prog{display:flex;gap:3px;margin:8px 0}
.blvp-prog i{flex:1;height:4px;border-radius:2px;background:var(--line-2,var(--line,#ddd))}
.blvp-prog i.f{background:var(--green,#1b7a4b)}
.blvp-prog i.c{background:var(--or,#f07a2e)}
.blvp-b{display:flex;gap:6px;flex-wrap:wrap}
.blvp-b button,.blvp-b a{appearance:none;border:1px solid var(--line-2,var(--line,#ddd));background:var(--card-2,var(--card,#fff));color:var(--ink,#1c1917);border-radius:10px;min-height:36px;padding:0 12px;font:inherit;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
.blvp-b button.p{background:var(--or,#f07a2e);border-color:transparent;color:#fff}
.blvp-b button:disabled{opacity:.5;cursor:default}
.blvp-icones{margin-left:auto;display:flex;gap:2px;flex:none}
.blvp-icones button{appearance:none;border:0;background:none;color:var(--ink-3,#5f5853);width:32px;height:32px;border-radius:8px;font:inherit;font-size:16px;font-weight:800;cursor:pointer}
.blvp-icones button:hover{background:var(--line,#eee)}
@media (max-width:599px){.blvp{padding:8px 10px}.blvp .blvp-x{font-size:12px}.blvp .blvp-t{font-size:14px}}
.blvp-apps{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.blvp-apps a{font-size:12px;font-weight:700;color:var(--or-txt,var(--or,#c2530f));text-decoration:none;border:1px solid var(--line,#e5e5e5);border-radius:999px;padding:3px 9px}
.blvp-apps a.ok{color:var(--green,#1b7a4b)}
.blvp-mini{position:fixed;z-index:10000;top:calc(8px + env(safe-area-inset-top));right:8px;appearance:none;border:1px solid var(--line,#e5e5e5);background:var(--card,#fff);color:var(--ink,#1c1917);border-radius:999px;padding:6px 12px;font:inherit;font-weight:800;box-shadow:0 6px 20px rgba(0,0,0,.16);cursor:pointer}
`

const en = () => typeof document !== 'undefined' && document.documentElement.lang === 'en'
const t = (x: Texte) => (en() ? x[1] : x[0])

/** Le bandeau de la présentation, monté une fois par application (main.tsx), dans le routeur. */
export function BandeauPresentation() {
  const [, setN] = useState(0)
  const [reduit, setReduit] = useState(false)
  const nav = useNavigate()
  const lieu = useLocation()
  const vu = useRef<string | null>(null)
  useEffect(() => {
    const f = () => setN((x) => x + 1)
    window.addEventListener('blv:presentation', f)
    return () => window.removeEventListener('blv:presentation', f)
  }, [])
  const e = lirePresentation()
  const n = e?.etape ?? 0
  const faite = !!e?.faites.includes(n)
  // L'écran de l'étape, une fois à chaque étape (et quand elle est faite) : chacun voit ce qui vient d'arriver.
  const cle = e && e.phase === 'prete' && e.cycle === CYCLE_VU ? `${e.cycle}:${n}:${faite}` : null
  useEffect(() => {
    if (!cle || vu.current === cle) return
    vu.current = cle
    const c = ACTEUR.ecran(n, faite)
    if (c && c !== lieu.pathname + lieu.search) nav(c)
  })
  if (!e) return null
  if (e.phase !== 'prete')
    return (
      <div className="blvp" role="status">
        <style>{STYLE}</style>
        <span className="blvp-tag">{t(['Présentation', 'Presentation'])}</span>
        <p className="blvp-t">{t(['Remise à zéro des cinq applications…', 'Resetting the five apps…'])}</p>
        <div className="blvp-b">
          <button type="button" onClick={recommencer}>
            {t(['Recommencer', 'Restart'])}
          </button>
        </div>
      </div>
    )
  const etape = ETAPES[n - 1] ?? null
  const ouverte = (a: AppPont) => a === APP || appliOuverte(a)
  const auteur = etape?.app ?? null
  let statut: { texte: string; erreur?: boolean } | null = null
  if (e.erreur?.etape === n) statut = { texte: t(['Bloquée : ', 'Blocked: ']) + e.erreur.texte, erreur: true }
  else if (!etape) statut = { texte: t(['Ouvrez les cinq applications (liens ci-dessous), puis Démarrer.', 'Open the five apps (links below), then Start.']) }
  else if (faite) statut = { texte: n === DERNIERE ? t(['Présentation terminée : la commande est « Retirée » partout.', 'Presentation finished: the order is “Collected” everywhere.']) : e.pause ? t(['En pause.', 'Paused.']) : t(['Faite. L’étape suivante part dans quelques secondes.', 'Done. The next step starts in a few seconds.']) }
  else if (auteur && !ouverte(auteur)) statut = { texte: t(['En attente : ouvrez l’application ', 'Waiting: open the app ']) + t(NOMS[auteur]) + '.', erreur: true }
  else statut = { texte: auteur === APP ? t(['Ici, maintenant : les gestes se font…', 'Here, now: the steps are being done…']) : t(['En cours dans l’application ', 'In progress in the app ']) + t(NOMS[auteur!]) + '…' }
  if (reduit)
    return (
      <>
        <style>{STYLE}</style>
        <button type="button" className="blvp-mini" aria-label={t(['Ouvrir le bandeau de la présentation', 'Open the presentation banner'])} onClick={() => setReduit(false)}>
          ▶ {n}/{DERNIERE}
        </button>
      </>
    )
  return (
    <div className="blvp" role="region" aria-label={t(['Présentation', 'Presentation'])} data-presentation-etape={n} data-presentation-faite={faite ? '1' : '0'}>
      <style>{STYLE}</style>
      <div className="blvp-l1">
        <span className="blvp-tag">{t(['Présentation', 'Presentation'])}</span>
        <span className="blvp-n">
          {t(['Étape', 'Step'])} {n}/{DERNIERE}
        </span>
        {auteur && <span className={'blvp-app' + (auteur === APP ? ' ici' : '')}>{t(NOMS[auteur])}</span>}
        <span className="blvp-icones">
          <button type="button" aria-label={t(['Réduire le bandeau', 'Minimise the banner'])} onClick={() => setReduit(true)}>
            –
          </button>
          <button type="button" aria-label={t(['Quitter la présentation', 'Leave the presentation'])} onClick={quitter}>
            ✕
          </button>
        </span>
      </div>
      <p className="blvp-t">{etape ? t(etape.titre) : t(['La commande témoin du 13 octobre', 'The 13 October reference order'])}</p>
      <p className="blvp-x">{etape ? t(etape.texte) : t(['Carine M., Boutique B, Yafé Express, Serge A. et Rose M. : la même commande, de la fiche au retrait.', 'Carine M., Boutique B, Yafé Express, Serge A. and Rose M.: the same order, from product page to pickup.'])}</p>
      {statut && <p className={'blvp-s' + (statut.erreur ? ' err' : '')} role="status">{statut.texte}</p>}
      <div className="blvp-prog" aria-hidden="true">
        {ETAPES.map((x) => (
          <i key={x.n} className={e.faites.includes(x.n) ? 'f' : x.n === n ? 'c' : ''} />
        ))}
      </div>
      {(!etape || (auteur && !ouverte(auteur))) && (
        <div className="blvp-apps">
          {APPS_PRESENTATION.map((a) => (
            <a key={a} className={ouverte(a) ? 'ok' : ''} href={ADRESSES[a] + '?presentation=1'} target={a === APP ? undefined : '_blank'} rel="noreferrer">
              {ouverte(a) ? '✓ ' : ''}
              {t(NOMS[a])}
            </a>
          ))}
        </div>
      )}
      <div className="blvp-b" style={{ marginTop: 8 }}>
        {etape && n < DERNIERE && (
          <button type="button" onClick={basculerPause} aria-pressed={e.pause}>
            {e.pause ? t(['Reprendre', 'Resume']) : t(['Pause', 'Pause'])}
          </button>
        )}
        {n < DERNIERE && (
          <button type="button" className="p" disabled={!!etape && !faite} onClick={() => suivant()}>
            {etape ? t(['Suivant', 'Next']) : t(['Démarrer', 'Start'])}
          </button>
        )}
        {e.erreur?.etape === n && (
          <>
            <button type="button" onClick={reessayer}>
              {t(['Réessayer', 'Retry'])}
            </button>
            <button type="button" onClick={() => suivant(true)}>
              {t(['Passer', 'Skip'])}
            </button>
          </>
        )}
        <button type="button" onClick={recommencer}>
          {t(['Recommencer', 'Restart'])}
        </button>
      </div>
    </div>
  )
}
