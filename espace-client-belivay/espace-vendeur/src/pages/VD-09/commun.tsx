// Pièces communes des écrans d'argent (VD-09) : même famille que le portefeuille du client (CL-13, DP-52).
// - Montants : écrits par une seule fonction (F du client, « 17 840 F », « 17,840 F » en anglais), masqués sur place par
//   l'œil (« •• ••• F »), choix gardé sur l'appareil (préférence soldeMasque, comme le client) ;
// - Accès Préparation (ARG-04, ARG-07, VD09-R09) : chaque écran d'argent montre le même écran verrouillé, qui nomme le
//   propriétaire et mène aux commandes à préparer ; la source refuse de toute façon (ReserveAuProprietaire, 403) ;
// - États : chargement (squelettes du client), erreur (Réessayer), hors connexion (montants du cache avec leur heure,
//   VD09-R06 ; téléchargements et codes attendent le réseau, VD09-R25, NUM-03) ;
// - Dates en mots simples par rapport au jour courant (VD09-R13), à l'heure de Yaoundé, en français et en anglais ;
// - Documents : CSV et PDF fabriqués sur l'appareil à partir du contenu donné par la source (même contenu, DOC-02).
import './vd09.css'
import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { versAnglais } from '@client/i18n/texte'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { ReserveAuProprietaire } from '../../donnees/communs'
import type { ContenuDocument } from '../../donnees/domaines/argent'
import type { Lecture } from '../../donnees/useLecture'
import { DECALAGE_YAOUNDE_MS, jourDe } from '../../calculs/temps'
import { heure, type Langue } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles, useSession } from '../../session'

// ── Montants ────────────────────────────────────────────────────────────────────────────────────────────────────

export const MASQUE = '•• •••'

/** Montants de l'écran : « 17 840 F » (ou masqués), le nombre seul pour les grands chiffres des cartes nuit. */
export function useMontant() {
  const { langue, soldeMasque, setSoldeMasque } = usePreferences()
  const ecrire = (v: string) => (langue === 'en' ? versAnglais(v) : v)
  return {
    masque: soldeMasque,
    basculer: () => setSoldeMasque(!soldeMasque),
    /** « 17 840 F » ; « −17 840 F » pour une reprise. */
    f: (n: number) => (soldeMasque ? `${n < 0 ? '−' : ''}${MASQUE} F` : ecrire(`${F(n)} F`)),
    /** « 17 840 » (suivi de <small>FCFA</small>). */
    n: (n: number) => (soldeMasque ? MASQUE : ecrire(F(n))),
    /** Montant d'une règle (seuil, prix d'exemple) : jamais masqué. */
    brut: (n: number) => ecrire(`${F(n)} F`),
  }
}

/** L'œil du portefeuille (DP-52) : masque ou montre les montants sur place, sans changer d'écran. */
export function Oeil({ clair, style }: { clair?: boolean; style?: CSSProperties }) {
  const { t } = usePreferences()
  const m = useMontant()
  const clic = (e: MouseEvent) => {
    e.preventDefault()
    m.basculer()
    jouer('interrupteur')
  }
  return (
    <button
      type="button"
      className="vd9-oeil"
      aria-pressed={m.masque}
      aria-label={t(m.masque ? 'Afficher les montants' : 'Masquer les montants')}
      title={t(m.masque ? 'Afficher les montants' : 'Masquer les montants')}
      onClick={clic}
      style={{ color: clair ? 'rgba(255,255,255,.86)' : 'var(--ink-2)', ...style }}
    >
      <Icone nom={m.masque ? 'eye' : 'eye-off'} taille={18} />
    </button>
  )
}

/** Numéro masqué écrit comme le prototype : « ···· 4 217 ». */
export function numeroLisible(masque: string): string {
  const d = masque.replace(/\D/g, '')
  return '···· ' + (d.length === 4 ? `${d[0]} ${d.slice(1)}` : d)
}

/** Pastille de l'opérateur (couleurs de marque de l'opérateur, comme le prototype). */
export function PastilleOperateur({ operateur, taille = 40 }: { operateur: 'MTN' | 'Orange'; taille?: number }) {
  const { t } = usePreferences()
  const fond = operateur === 'MTN' ? { background: '#FFCB05', color: '#1A1A1A' } : { background: '#FF7900', color: '#FFFFFF' }
  return (
    <span style={{ width: taille + 'px', height: taille + 'px', borderRadius: Math.round(taille / 3.6) + 'px', ...fond, fontWeight: '800', fontSize: operateur === 'MTN' ? '12px' : '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0' }}>
      {t(operateur)}
    </span>
  )
}

// ── Dates (heure de Yaoundé) ────────────────────────────────────────────────────────────────────────────────────

const JOURS = { fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] }
const JOURS_COURTS = { fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }
const MOIS = { fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] }
const MOIS_COURTS = { fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'] }

/** Instant ou jour civil (« 2026-09-25 ») → date de Yaoundé. */
const local = (v: number | string) => (typeof v === 'string' ? new Date(v.length === 7 ? v + '-01T00:00:00Z' : v + 'T00:00:00Z') : new Date(v + DECALAGE_YAOUNDE_MS))
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const premier = (j: number, l: Langue) => (l === 'fr' && j === 1 ? '1er' : String(j))

/** « 20 sept. » · « 20 Sept » */
export const jourMois = (v: number | string, l: Langue) => {
  const d = local(v)
  return `${premier(d.getUTCDate(), l)} ${MOIS_COURTS[l][d.getUTCMonth()]}`
}
/** « ven. 18 sept. » · « Fri 18 Sept » */
export const jourCourtMois = (v: number | string, l: Langue) => {
  const d = local(v)
  return `${JOURS_COURTS[l][d.getUTCDay()]} ${d.getUTCDate()} ${MOIS_COURTS[l][d.getUTCMonth()]}`
}
/** « vendredi 25 sept. » · « Friday 25 Sept » */
export const jourLongMois = (v: number | string, l: Langue) => {
  const d = local(v)
  return `${JOURS[l][d.getUTCDay()]} ${d.getUTCDate()} ${MOIS_COURTS[l][d.getUTCMonth()]}`
}
/** « Vendredi 25 septembre » · « Friday 25 September » */
export const dateLongue = (v: number | string, l: Langue) => {
  const d = local(v)
  return majuscule(`${JOURS[l][d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[l][d.getUTCMonth()]}`)
}
/** « 1er octobre » · « 1 October » */
export const jourMoisLong = (v: number | string, l: Langue) => {
  const d = local(v)
  return `${premier(d.getUTCDate(), l)} ${MOIS[l][d.getUTCMonth()]}`
}
/** « 7 mai 2026 » · « 7 May 2026 » */
export const dateComplete = (v: number | string, l: Langue) => {
  const d = local(v)
  return `${premier(d.getUTCDate(), l)} ${MOIS[l][d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
/** « Septembre » · « September » ; avec l'année : « Août 2026 ». */
export const nomMois = (mois: string, l: Langue, annee = false) => {
  const d = local(mois)
  return majuscule(MOIS[l][d.getUTCMonth()]) + (annee ? ` ${d.getUTCFullYear()}` : '')
}
/** Mois court pour un axe : « sept. » · « Sept ». */
export const moisCourt = (mois: string, l: Langue) => MOIS_COURTS[l][local(mois).getUTCMonth()]

/** En mots simples (VD09-R13) : « aujourd'hui, 18 h », « ce soir à 18 h », « demain à 9 h », sinon « mer. 23 sept. à 6 h 02 ». */
export function quand(ms: number, maintenant: number, l: Langue, virgule = false): string {
  const j = jourDe(ms)
  const h = heure(ms, l)
  const sep = virgule ? ', ' : l === 'en' ? ' at ' : ' à '
  if (j === jourDe(maintenant)) return (l === 'en' ? 'today' : 'aujourd’hui') + sep + h
  if (j === jourDe(maintenant + 24 * 3600 * 1000)) return (l === 'en' ? 'tomorrow' : 'demain') + sep + h
  if (j === jourDe(maintenant - 24 * 3600 * 1000)) return (l === 'en' ? 'yesterday' : 'hier') + sep + h
  return jourCourtMois(ms, l) + sep + h
}

/** « 8 h 12 » restantes, à la minute supérieure ; « 2 j 4 h » au-delà d'un jour. */
export function reste(ms: number, l: Langue): string {
  const min = Math.max(0, Math.ceil(ms / 60000))
  const j = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = String(min % 60).padStart(2, '0')
  if (j > 0) return l === 'en' ? `${j} d ${h} h` : `${j} j ${h} h`
  return `${h} h ${m}`
}

// ── États de l'écran ────────────────────────────────────────────────────────────────────────────────────────────

/** Réseau du téléphone (comme le client, CL-09) : hors ligne, tout reste lisible ; un envoi attend. */
export function useEnLigne() {
  const [en, setEn] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const on = () => setEn(true)
    const off = () => setEn(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => (window.removeEventListener('online', on), window.removeEventListener('offline', off))
  }, [])
  return en
}

/** Hors connexion : les montants affichés sont ceux du dernier calcul, avec leur heure (VD09-R06). */
export function BandeauHorsLigne({ calculeA, texte }: { calculeA?: number; texte?: string }) {
  const { t, tf, langue } = usePreferences()
  if (useEnLigne()) return null
  return (
    <div className="note amber" role="status" data-hors-ligne="" style={{ marginTop: '12px' }}>
      <Icone nom="wifi-off" taille={18} />
      <div>
        <b>{t('Hors connexion.')}</b>
        {' '}
        {texte ? t(texte) : calculeA ? tf('Montants de {h}, mis à jour au retour du réseau.', { h: heure(calculeA, langue) }) : t('Les montants se mettent à jour au retour du réseau.')}
      </div>
    </div>
  )
}

/** Accès Préparation : écran verrouillé « Réservé au propriétaire » (ARG-07), le même sur chaque écran d'argent. */
export function Reserve({ route, titre }: { route: string; titre?: boolean }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const [params] = useSearchParams()
  const nom = s.proprietaire ? `${s.proprietaire.prenom} ${s.proprietaire.nom}` : ''
  return (
    <Ecran route={route}>
      {titre && (
        <div className="pg">
          <h1 className="pg-t">{t('Mon argent')}</h1>
        </div>
      )}
      <div className="card" style={titre ? undefined : { marginTop: '14px' }}>
        <div className="empty" style={{ padding: '18px 4px 4px' }}>
          <div className="ei" style={{ background: 'var(--sand-3)', color: 'var(--ink-2)' }}>
            <Icone nom="lock" taille={26} />
          </div>
          <h3>{t('Réservé au propriétaire')}</h3>
          <p>{tf('Les montants, versements et documents sont visibles par {nom} seulement.', { nom })}</p>
        </div>
        <div className="row t13 c2" style={{ gap: '9px', alignItems: 'flex-start', lineHeight: '1.45', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>
          <Icone nom="circle-check" taille={17} style={{ flexShrink: '0', marginTop: '1px', color: 'var(--green)' }} />
          <span>{t('Vous pouvez toujours préparer les commandes, les remettre au livreur, répondre aux litiges et inspecter les retours.')}</span>
        </div>
        <div className="mt14">
          <Link to={chemin('commandes', { f: 'prep', role: params.get('role') })} className="btn primary">
            <Icone nom="package" taille={18} />
            <span>{t('Voir les commandes à préparer')}</span>
          </Link>
        </div>
      </div>
    </Ecran>
  )
}

/** Squelettes pendant le chargement (conventions du client, Q-86). */
export function Chargement({ route }: { route: string }) {
  const { t } = usePreferences()
  return (
    <Ecran route={route}>
      <div className="vd9-sq" role="status" aria-label={t('Chargement')}>
        <i style={{ height: '28px', width: '55%', marginTop: '18px' }} />
        <i style={{ height: '150px', marginTop: '16px', borderRadius: '24px' }} />
        <i style={{ height: '220px', marginTop: '12px', borderRadius: '20px' }} />
      </div>
    </Ecran>
  )
}

/** Lecture refusée (réseau, serveur) : un message et « Réessayer », jamais un écran faux. */
export function Erreur({ route, relire }: { route: string; relire: () => void }) {
  const { t } = usePreferences()
  return (
    <Ecran route={route}>
      <div className="card" style={{ marginTop: '14px' }}>
        <div className="empty" role="alert" style={{ padding: '18px 4px 4px' }}>
          <div className="ei">
            <Icone nom="cloud-off" taille={26} />
          </div>
          <h3>{t('Impossible d’afficher vos montants')}</h3>
          <p>{t('Votre argent n’est pas touché. Vérifiez la connexion, puis réessayez.')}</p>
        </div>
        <div className="mt14">
          <button type="button" className="btn secondary" onClick={relire}>
            <Icone nom="rotate-cw" taille={18} />
            <span>{t('Réessayer')}</span>
          </button>
        </div>
      </div>
    </Ecran>
  )
}

/** Garde commune : rôle Préparation, chargement, erreur ; sinon l'écran avec ses données. */
export function AvecDonnees<T>({ route, lecture, titreReserve, children }: { route: string; lecture: Lecture<T>; titreReserve?: boolean; children: (d: T) => ReactNode }) {
  const montants = useMontantsVisibles()
  if (!montants || lecture.erreur instanceof ReserveAuProprietaire) return <Reserve route={route} titre={titreReserve} />
  if (lecture.erreur && !lecture.donnees) return <Erreur route={route} relire={lecture.relire} />
  if (!lecture.donnees) return <Chargement route={route} />
  return <>{children(lecture.donnees)}</>
}

// ── Morceaux du prototype ──────────────────────────────────────────────────────────────────────────────────────

/** Onglets Résumé · Se libère · Gelé · Mes gains (VD09-R07), 44 px ; la pastille glisse (Animations du client). */
export function Onglets({ actif }: { actif: 'argent' | 'se_libere' | 'gele' | 'gains' }) {
  const { t } = usePreferences()
  const o = (route: typeof actif, libelle: string) => (
    <Link to={chemin(route)} style={{ height: '44px' }} className={actif === route ? 'on' : ''} aria-current={actif === route ? 'page' : undefined}>
      {t(libelle)}
    </Link>
  )
  return (
    <div className="seg">
      {o('argent', 'Résumé')}
      {o('se_libere', 'Se libère')}
      {o('gele', 'Gelé')}
      {o('gains', 'Mes gains')}
    </div>
  )
}

/** Bloc replié « Comment ça marche » (C.more) : fermé par défaut, son état n'est pas mémorisé (VD09-R13). */
export function CommentCaMarche({ titre = 'Comment ça marche', plat, children }: { titre?: string; plat?: boolean; children: ReactNode }) {
  const { t } = usePreferences()
  return (
    <details className={'more' + (plat ? ' flat' : '')}>
      <summary>
        <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
        <span className="grow">{t(titre)}</span>
        <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
      </summary>
      <div className="more-b">{children}</div>
    </details>
  )
}

export function Aide({ icone = 'info', children }: { icone?: string; children: ReactNode }) {
  return (
    <div className="hint-l">
      <Icone nom={icone} taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
      <span>{children}</span>
    </div>
  )
}

/** Puces de choix (période) : compactes 40 px, zone tactile 44 px (VD09-R30). */
export function Puces<T extends string>({ choix, valeur, changer, etiquette }: { choix: { v: T; libelle: string }[]; valeur: T; changer: (v: T) => void; etiquette: string }) {
  const { t } = usePreferences()
  return (
    <div className="chips" role="radiogroup" aria-label={t(etiquette)}>
      {choix.map((c) => (
        <button key={c.v} type="button" role="radio" aria-checked={valeur === c.v} className={'chip' + (valeur === c.v ? ' on' : '')} onClick={() => changer(c.v)} style={{ minHeight: '44px' }}>
          {c.libelle}
        </button>
      ))}
    </div>
  )
}

/** Petit message qui s'efface (copié, téléchargé, signalé). */
export function useMessage(): [string | null, (m: string) => void] {
  const [m, setM] = useState<string | null>(null)
  useEffect(() => {
    if (!m) return
    const id = setTimeout(() => setM(null), 3500)
    return () => clearTimeout(id)
  }, [m])
  return [m, setM]
}
export function Message({ texte }: { texte: string | null }) {
  if (!texte) return null
  return (
    <div className="vd9-toast" role="status">
      <Icone nom="circle-check" taille={17} />
      <span>{texte}</span>
    </div>
  )
}

/** Copie un texte (référence de versement) ; vrai si le presse-papiers l'a pris. */
export async function copier(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte)
    return true
  } catch {
    return false
  }
}

// ── Documents à télécharger (CSV et PDF, même contenu) ──────────────────────────────────────────────────────────

export interface Traduction {
  t: (s: string) => string
  langue: Langue
}
const estJour = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

function cellule(v: string | number, tr: Traduction, montant: boolean): string {
  if (typeof v === 'number') return montant ? (tr.langue === 'en' ? versAnglais(`${F(v)} F`) : `${F(v)} F`) : String(v)
  if (estJour(v)) return jourMoisLong(v, tr.langue) + ' ' + v.slice(0, 4)
  return tr.t(v)
}

/** CSV : séparateur « ; » (tableurs en français), nombres sans espace pour être additionnés, UTF-8 avec BOM. */
export function versCsv(c: ContenuDocument, tr: Traduction): string {
  const champ = (v: string | number) => {
    const s = typeof v === 'number' ? String(v) : estJour(v) ? v : tr.t(v)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lignes = [c.colonnes.map((x) => champ(x)), ...c.lignes.map((l) => l.map(champ)), ...(c.totaux ? [c.totaux.map(champ)] : [])]
  return '﻿' + lignes.map((l) => l.join(';')).join('\r\n') + '\r\n'
}

// PDF d'une page A4 (texte seul, Helvetica, WinAnsi) : assez pour un relevé, une facture, la grille du contrat.
const WIN: Record<string, number> = { '’': 0x92, '‘': 0x91, '“': 0x93, '”': 0x94, '–': 0x96, '—': 0x97, '•': 0x95, '…': 0x85, '€': 0x80, '−': 0x2d, ' ': 0x20, ' ': 0x20 }
function octets(s: string): number[] {
  const out: number[] = []
  for (const ch of s) {
    const c = ch.codePointAt(0)!
    if (WIN[ch] !== undefined) out.push(WIN[ch])
    else if (c < 256) out.push(c)
    else out.push(0x3f)
  }
  return out
}
const echapPdf = (b: number[]) => b.map((c) => (c === 0x28 || c === 0x29 || c === 0x5c ? [0x5c, c] : [c])).flat()

export function versPdf(c: ContenuDocument, tr: Traduction): Uint8Array {
  const flux: number[][] = []
  const texte = (x: number, y: number, taille: number, s: string, gras = false) => flux.push([...octets(`BT /${gras ? 'F2' : 'F1'} ${taille} Tf ${x} ${y} Td (`), ...echapPdf(octets(s)), ...octets(') Tj ET\n')])
  const largeur = 495
  const n = c.colonnes.length
  const col = (i: number) => 50 + Math.round((largeur / n) * i)
  let y = 790
  texte(50, y, 9, 'BelivaY', true)
  y -= 28
  texte(50, y, 16, tr.t(c.titre), true)
  y -= 18
  texte(50, y, 10, tr.t(c.sousTitre))
  y -= 30
  c.colonnes.forEach((h, i) => texte(col(i), y, 9, tr.t(h), true))
  y -= 6
  flux.push(octets(`50 ${y} m 545 ${y} l S\n`))
  y -= 14
  const montant = (i: number) => /prix|gardez|montant|commission|tva|total/i.test(c.colonnes[i])
  for (const l of c.lignes) {
    if (y < 90) break
    l.forEach((v, i) => texte(col(i), y, 9, cellule(v, tr, montant(i)).slice(0, 34)))
    y -= 15
  }
  if (c.totaux) {
    flux.push(octets(`50 ${y + 9} m 545 ${y + 9} l S\n`))
    y -= 4
    c.totaux.forEach((v, i) => texte(col(i), y, 9, cellule(v, tr, montant(i)), true))
    y -= 24
  }
  for (const m of c.mentions) {
    texte(50, y, 8, tr.t(m))
    y -= 12
  }
  const contenu = flux.flat()
  const objets: number[][] = [
    octets('<< /Type /Catalog /Pages 2 0 R >>'),
    octets('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    octets('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>'),
    octets('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
    octets('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'),
    [...octets(`<< /Length ${contenu.length} >>\nstream\n`), ...contenu, ...octets('\nendstream')],
  ]
  const sortie: number[] = octets('%PDF-1.4\n')
  const positions: number[] = []
  objets.forEach((o, i) => {
    positions.push(sortie.length)
    sortie.push(...octets(`${i + 1} 0 obj\n`), ...o, ...octets('\nendobj\n'))
  })
  const xref = sortie.length
  sortie.push(...octets(`xref\n0 ${objets.length + 1}\n0000000000 65535 f \n` + positions.map((p) => String(p).padStart(10, '0') + ' 00000 n \n').join('')))
  sortie.push(...octets(`trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`))
  return new Uint8Array(sortie)
}

/** Donne le fichier au téléphone (téléchargement). */
export function telecharger(nom: string, donnees: string | Uint8Array, type: string) {
  const blob = new Blob([donnees as BlobPart], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
