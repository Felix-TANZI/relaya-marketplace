// Briques communes des écrans ENT-05 (prix, paquets, affectation) et ENT-06 (missions, incidents, colis, preuves) :
// lecture avec heure des dernières données, états (chargement, vide, erreur : ENT-01-R17), anneau du compte à rebours
// (ENT-P10R-04 : rouge sous le seuil du registre, toujours doublé de « avant HH h MM », heure du serveur), libellés
// des valeurs de la source (traduits par t()), montants, interrupteur, QR unique d'un colis.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { qrMatrice } from '@client/composants/QrCode'
import { F } from '@client/i18n/format'
import { heureSeule, jourSeul } from '@client/i18n/dates'
import { Icone } from '../../composants/Icone'
import type { ClasseColis } from '../../donnees/communs'
import type { CodeLigne } from '../../donnees/domaines/prix'
import type { Arret, GenrePaquet, StatutPaquet } from '../../donnees/domaines/paquets'
import { useLecture, type Lecture } from '../../donnees/useLecture'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { REGLES } from '../../calculs/livraison/regles-ecrans'
import './livraison.css'

// ---------- Lecture ----------

/** useLecture + heure des dernières données reçues (bandeau d'erreur : données gardées, ENT-01-R17). */
export function useDonnees<T>(lire: () => Promise<T>, cles: readonly unknown[] = []): Lecture<T> & { derniere: number | null; echecs: number } {
  const l = useLecture(lire, cles)
  const [derniere, setDerniere] = useState<number | null>(null)
  const [echecs, setEchecs] = useState(0)
  useEffect(() => {
    if (l.donnees) setDerniere(Date.now())
  }, [l.donnees])
  useEffect(() => {
    if (l.erreur && l.erreur.name !== 'AccesRefuse') setEchecs((n) => n + 1)
    else if (!l.erreur) setEchecs(0)
  }, [l.erreur])
  if (l.erreur?.name === 'AccesRefuse') throw l.erreur // la garde montre « Réservé à d'autres rôles »
  return { ...l, derniere, echecs }
}

export function useHeure() {
  const { langue } = usePreferences()
  return (ms: number) => heureSeule(ms, langue)
}
export function useJour() {
  const { langue } = usePreferences()
  return (ms: number) => jourSeul(ms, langue)
}
/** Durée en minutes : « 45 min », « 1 h 30 », « 2 h ». */
export function useDuree() {
  const { tf } = usePreferences()
  return (min: number) => {
    const m = Math.max(0, Math.round(Math.abs(min)))
    if (m < 60) return tf('{m} min', { m })
    const h = Math.floor(m / 60)
    const r = m % 60
    return r ? tf('{h} h {m}', { h, m: String(r).padStart(2, '0') }) : tf('{h} h', { h })
  }
}

// ---------- États ----------

export function Chargement({ n = 3, hauteur }: { n?: number; hauteur?: number }) {
  const { t } = usePreferences()
  return (
    <div className="lv-charge" aria-busy="true" aria-label={t('Chargement')}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="chargement" style={hauteur ? { height: hauteur } : undefined}></div>
      ))}
    </div>
  )
}

/** Erreur de chargement : bandeau rouge, heure des dernières données, Réessayer ; support si l'erreur persiste. */
export function BandeauErreur({ erreur, relire, derniere, echecs }: { erreur: Error | null; relire(): void; derniere: number | null; echecs: number }) {
  const { t, tf } = usePreferences()
  const h = useHeure()
  if (!erreur) return null
  return (
    <div className="bandeau rouge lv-err" role="alert">
      <Icone nom="cloud-off" taille={18} />
      <span className="grow">
        <b>{t('Impossible de charger les données.')}</b> {derniere ? tf('Dernières données reçues à {h}, gardées à l’écran.', { h: h(derniere) }) : t('Aucune donnée reçue pour l’instant.')}
        {echecs > 1 && <> {t('Si l’erreur persiste, contactez le support BelivaY depuis Messages.')}</>}
      </span>
      <button type="button" className="btn sm secondary" onClick={relire}>
        <Icone nom="rotate-cw" taille={16} />
        {t('Réessayer')}
      </button>
    </div>
  )
}

/** État vide : icône, phrase, raison, action (jamais « 0 / 0 »). */
export function Vide({ icone, titre, raison, children }: { icone: string; titre: string; raison: string; children?: ReactNode }) {
  return (
    <div className="vide">
      <div className="ei">
        <Icone nom={icone} taille={26} />
      </div>
      <h3>{titre}</h3>
      <p>{raison}</p>
      {children && <div className="btns mt10" style={{ justifyContent: 'center' }}>{children}</div>}
    </div>
  )
}

/** Message d'un geste (réussi ou refusé), annoncé aux lecteurs d'écran. */
export function Retour({ ton, children }: { ton: 'ok' | 'rouge' | 'ambre'; children: ReactNode }) {
  return (
    <div className={'lv-retour ' + ton} role={ton === 'rouge' ? 'alert' : 'status'}>
      <Icone nom={ton === 'ok' ? 'circle-check' : 'circle-alert'} taille={18} />
      <span>{children}</span>
    </div>
  )
}

// ---------- Compte à rebours ----------

/**
 * Anneau d'acceptation (ENT-P10R-04) : temps restant jusqu'à `fin` sur la durée `debut` → `fin`, à l'heure du serveur
 * (useHorloge) ; rouge sous le seuil du registre, orange sinon ; toujours doublé du texte « avant HH h MM ».
 */
export function Anneau({ debut, fin, taille = 56, texte = true }: { debut: number; fin: number; taille?: number; texte?: boolean }) {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const n = useHorloge(1000)
  const reste = Math.max(0, fin - n)
  const part = Math.min(1, reste / Math.max(1, fin - debut))
  const min = Math.floor(reste / 60_000)
  const sec = Math.floor((reste % 60_000) / 1000)
  const rouge = reste <= REGLES.anneauRougeMin * 60_000
  const r = 22
  const tour = 2 * Math.PI * r
  return (
    <div className={'lv-anneau' + (rouge ? ' rouge' : '')}>
      <svg width={taille} height={taille} viewBox="0 0 50 50" role="img" aria-label={reste ? tf('{m} min {s} s restantes', { m: min, s: sec }) : t('Délai passé')}>
        <circle cx="25" cy="25" r={r} className="fond" />
        <circle cx="25" cy="25" r={r} className="arc" strokeDasharray={tour} strokeDashoffset={tour * (1 - part)} transform="rotate(-90 25 25)" />
        <text x="25" y="25" textAnchor="middle" dominantBaseline="central" className="num">
          {reste ? `${min}:${String(sec).padStart(2, '0')}` : '0:00'}
        </text>
      </svg>
      {texte && <span className="lv-avant">{tf('avant {h}', { h: h(fin) })}</span>}
    </div>
  )
}

// ---------- Libellés ----------

export { NOM_GENRE } from '../../config/libelles'
export const ICONE_GENRE: Record<GenrePaquet, string> = { tournee_relais: 'route', domicile: 'house', collecte: 'warehouse', retour: 'undo-2', transfert: 'arrow-left-right', mixte: 'split' }
export const NOM_STATUT: Record<StatutPaquet, string> = {
  publie: 'Publié',
  accepte: 'Accepté, à affecter',
  affecte: 'Affecté',
  en_cours: 'En cours',
  incident: 'Incident',
  depose: 'Déposé ou remis',
  clos: 'Clos',
  rendu: 'Rendu',
  expire: 'Délai passé',
  pris: 'Déjà pris',
  ignore: 'Ignoré',
}
export function nomArret(a: Pick<Arret, 'type' | 'sens'>): string {
  if (a.type === 'boutique') return a.sens === 'remise' ? 'Remise au vendeur' : 'Ramassage chez le vendeur'
  if (a.type === 'relais') return a.sens === 'ramassage' ? 'Collecte au relais' : 'Dépôt au relais'
  if (a.type === 'domicile') return 'Remise à domicile'
  return 'Point de stockage'
}
export const NOM_LIGNE: Record<CodeLigne, string> = {
  relais_1_4: 'Tournée relais, 1 à 4 colis',
  relais_5_9: 'Tournée relais, 5 à 9 colis',
  relais_10: 'Tournée relais, 10 colis et plus',
  relais_autre_zone: 'Relais dans une autre zone',
  carton_c2: 'Carton C2',
  domicile_zones: 'Course à domicile entre Z2, Z3 et Z6',
  domicile_z1: 'Course à domicile depuis ou vers Z1',
  collecte: 'Collecte au relais',
  retour: 'Course de retour au vendeur',
  transfert_sm: 'Transfert entre relais, S et M',
  transfert_l: 'Transfert entre relais, L',
}
export const NOM_CLASSE: Record<ClasseColis, string> = { S: 'S', M: 'M', L: 'L', XL: 'XL', HG: 'Hors gabarit' }

/** « 4 S, 2 M » : classes comptées dans l'ordre. */
export function classesEnTexte(cs: ClasseColis[]): string {
  const ordre: ClasseColis[] = ['S', 'M', 'L', 'XL', 'HG']
  return ordre
    .map((c) => [c, cs.filter((x) => x === c).length] as const)
    .filter(([, n]) => n)
    .map(([c, n]) => `${n} ${c}`)
    .join(', ')
}

/** Montant en francs CFA : « 3 600 F ». */
export const Montant = ({ n, signe }: { n: number; signe?: boolean }) => <span className="num nw">{(signe && n > 0 ? '+' : '') + F(n)} F</span>

// ---------- Contrôles ----------

export function Interrupteur({ on, changer, libelle, desactive }: { on: boolean; changer(v: boolean): void; libelle: string; desactive?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={libelle} className={'lv-int' + (on ? ' on' : '')} onClick={() => changer(!on)} disabled={desactive}>
      <i></i>
    </button>
  )
}

/** QR unique d'un colis (ISO/IEC 18004, sans réseau) : le livreur et le gérant le scannent à chaque changement de main. */
export function Qr({ texte, taille = 120, libelle }: { texte: string; taille?: number; libelle: string }) {
  const m = useRef<boolean[][] | null>(null)
  m.current ??= qrMatrice(texte)
  const n = m.current.length
  const chemin = m.current.flatMap((ligne, y) => ligne.map((v, x) => (v ? `M${x + 4} ${y + 4}h1v1h-1z` : '')).filter(Boolean)).join('')
  return (
    <svg className="lv-qr" width={taille} height={taille} viewBox={`0 0 ${n + 8} ${n + 8}`} role="img" aria-label={libelle} shapeRendering="crispEdges">
      <rect width={n + 8} height={n + 8} className="lv-qr-f" />
      <path d={chemin} className="lv-qr-m" />
    </svg>
  )
}

/** Initiales d'un livreur dans une pastille ronde (aucune photo de démonstration). */
export const Avatar = ({ initiales, petit }: { initiales: string; petit?: boolean }) => <span className={'lv-av' + (petit ? ' p' : '')} aria-hidden="true">{initiales}</span>


// ---------- Enrichissements (ENT-05) ----------

/**
 * Chiffre qui défile jusqu'à sa nouvelle valeur (M9) : une dizaine de pas, sans animation si l'appareil demande moins
 * de mouvement ; la valeur finale seule est lue par les lecteurs d'écran.
 */
export function ChiffreAnime({ n, rendu = (v) => F(v) }: { n: number; rendu?: (v: number) => ReactNode }) {
  const [v, setV] = useState(n)
  const de = useRef(n)
  useEffect(() => {
    const depart = de.current
    if (depart === n) return
    const calme = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    const pas = calme ? 1 : 12
    let i = 0
    let minuteur = 0
    const suivant = () => {
      i++
      const k = 1 - (1 - i / pas) ** 3
      const x = i >= pas ? n : Math.round(depart + (n - depart) * k)
      de.current = x
      setV(x)
      if (i < pas) minuteur = window.setTimeout(suivant, 28)
    }
    suivant()
    return () => window.clearTimeout(minuteur)
  }, [n])
  return (
    <span className="lv-anime">
      <span aria-hidden="true">{rendu(v)}</span>
      <span className="vh">{rendu(n)}</span>
    </span>
  )
}

/**
 * Seuils d'alerte avant échéance réglés dans Prix et délais (ENT-P09), en millisecondes : les comptes à rebours des
 * paquets passent en ambre à ce seuil, en rouge au seuil de l'anneau (registre). Relus à chaque enregistrement
 * (événement blv:alertes-delais) et après l'envoi de la file hors connexion (blv:file).
 */
export function useSeuils() {
  const [cle, setCle] = useState(0)
  useEffect(() => {
    const f = () => setCle((k) => k + 1)
    window.addEventListener('blv:alertes-delais', f)
    window.addEventListener('blv:file', f)
    return () => (window.removeEventListener('blv:alertes-delais', f), window.removeEventListener('blv:file', f))
  }, [])
  const l = useLecture(() => source.prix.alertesDelais(), [cle])
  const a = l.donnees
  return {
    critique: REGLES.anneauRougeMin * 60_000,
    acceptation: (a?.acceptationMin ?? REGLES.margeAlerteMin) * 60_000,
    ramassage: (a?.ramassageMin ?? REGLES.margeAlerteMin) * 60_000,
  }
}
