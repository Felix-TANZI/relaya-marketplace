// Commandes (CL-09, CL-10) : ce que partagent la liste, le détail, le code, le suivi et le comptoir (DP-54).
import { useEffect, useState, type ReactNode } from 'react'
import type { Largeur } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { source, type CommandeClient, type Relais } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateRenvoi, debutDuJour, gardeCommande, GARDE_CUMUL, jourDeGarde, plafondColis, tarifDuJour, type Fermeture } from '../../calculs/garde'

// Grands écrans : enveloppe un groupe de blocs (grille, rangée) seulement quand « si » est vrai ; sinon les blocs
// passent tels quels (le téléphone garde son DOM, au pixel).
export const Groupe = ({ si, classe, children }: { si: boolean; classe: string; children: ReactNode }) => (si ? <div className={classe}>{children}</div> : <>{children}</>)

// Écrans en colonnes (contenu et aside collant) dès 1024 ; en tablette portrait, la colonne étroite du téléphone.
export function useColonnes() {
  const colonnes = useDes('tab-l')
  return { colonnes, largeur: (colonnes ? 'moyen' : 'etroit') as Largeur }
}

export const EN_COURS = ['paiement', 'preparation', 'route', 'retirable', 'comptoir', 'litige']
export const enCours = (c: CommandeClient) => EN_COURS.includes(c.etat)
export const nbArticles = (c: CommandeClient) => c.colis.reduce((n, x) => n + x.qte, 0)

// État en clair (pastille de la liste et du détail).
export function etatDe(c: CommandeClient): { texte: string; v?: Record<string, string | number>; ton: 'neu' | 'calm' | 'warn' | 'bad' | 'ok' } {
  switch (c.etat) {
    case 'paiement':
      return { texte: 'En attente de paiement', ton: 'warn' }
    case 'preparation':
      return { texte: 'En préparation', ton: 'neu' }
    case 'route':
      return { texte: 'En route vers le relais', ton: 'neu' }
    case 'retirable':
      return { texte: c.garde?.du ? 'Retirable · {g} F de garde' : 'Retirable maintenant', v: { g: F(c.garde?.du ?? 0) }, ton: 'ok' }
    case 'comptoir':
      return { texte: 'À payer au retrait · {m} F', v: { m: F(c.comptoir?.du ?? 0) }, ton: 'warn' }
    case 'litige':
      return { texte: 'En litige · {l}', v: { l: c.litige ?? '' }, ton: 'bad' }
    case 'retiree':
      return { texte: 'Retirée', ton: 'calm' }
    case 'annulee':
      return { texte: 'Annulée · remboursée', ton: 'calm' }
  }
}

// Étape atteinte (barre du suivi) : 0 à 3.
export const etapeDe = (c: CommandeClient) => Math.max(0, c.etapes.filter((e) => e.le !== null).length - 1)

// Relais de la commande (nom, gérant, horaires, jour de fermeture, distance), lu dans la liste des relais.
export function useRelais(nom: string | null | undefined): Relais | null {
  const [r, setR] = useState<Relais | null>(null)
  useEffect(() => {
    if (!nom) return
    source.relaisListe().then((x) => setR(x.relais.find((y) => y.nom === nom) ?? null))
  }, [nom])
  return r
}
// Distance du relais : « 350 m » ou « 1,2 km » ; à pied, 1 km en 17 min environ.
export const distance = (km: number) => (km < 1 ? Math.round(km * 1000) + ' m' : String(km).replace('.', ',') + ' km')
export const minutesAPied = (km: number) => Math.max(1, Math.round(km * 17))

// Garde (R36, R37 ; calculs/garde.ts) : par colis, cumul 0, 100, 200, 300, 500, 1 000, 2 000 F du jour 1 au jour 7,
// jamais plus que la valeur du colis ; jours de 24 h depuis l'arrivée du dernier colis. Une fermeture du relais
// (jour de fermeture de ses horaires ou fermeture déclarée) arrête le compteur et recule le renvoi d'autant : le
// colis a toujours 7 jours de garde. Au renvoi, la garde de chaque colis est retenue, sans autre frais (R39).
export const GRILLE_GARDE = GARDE_CUMUL.map((_, i) => tarifDuJour(i + 1))
export const GARDE_GROS_AJOUT = 0 // R36 : quel que soit le format
export const RENVOI_GARDE = 0 // R39 : sans autre frais
const JOURS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const H = 3600e3
const jourSemaine = (ms: number) => new Date(ms + H).getUTCDay()
const minuitYaounde = (ms: number) => Math.floor((ms + H) / 864e5) * 864e5 - H
const isoYaounde = (ms: number) => new Date(ms + H).toISOString().slice(0, 10)
export interface JourGarde {
  j: number
  le: number // début du jour de garde
  frais: number
  cumul: number
  ferme: boolean // le relais est fermé ce jour-là (calendrier)
}
// Colis d'une commande encore à retirer et valeur de chacun (plafond de sa garde).
export const colisActifs = (c: CommandeClient) => c.colis.filter((x) => !x.annule)
export const grosColis = (c: CommandeClient) => colisActifs(c).some((x) => x.gros)
export const valeurColis = (c: CommandeClient) => colisActifs(c).reduce((n, x) => n + x.prix * x.qte, 0)
const valeursColis = (c: CommandeClient) => colisActifs(c).map((x) => x.prix * x.qte || Infinity)
// Ce qu'un jour de plus coûte pour un colis (le gros colis ne change plus rien, R36).
export const tarifGarde = (j: number, _gros?: boolean) => GRILLE_GARDE[j - 1] ?? 0
// Au plus, par colis : 2 000 F sur 7 jours.
export const plafondGarde = (_gros?: boolean) => plafondColis()
// Le relais est-il fermé ce jour (jour de fermeture de ses horaires ou fermeture déclarée) ?
export const fermeLe = (ms: number, relais: Relais | null) =>
  !!relais && (JOURS_FR[jourSemaine(ms)] === relais.ferme || (relais.fermetures ?? []).some((f) => f.du <= isoYaounde(ms) && isoYaounde(ms) <= f.au))
// Fermetures du relais en intervalles, du jour de l'arrivée à 60 jours (R37).
export function fermeturesDe(relais: Relais | null, depuis: number): Fermeture[] {
  const r: Fermeture[] = []
  if (!relais) return r
  for (let k = 0, d = minuitYaounde(depuis); k < 60; k++, d += 864e5) if (fermeLe(d + 12 * H, relais)) r.push({ debut: d, fin: d + 864e5 })
  return r
}
// Échéancier de la garde d'une commande arrivée : jours 1 à 7 datés depuis l'arrivée, frais et cumul (somme des
// colis, chacun plafonné à sa valeur), renvoi (fin des 7 jours, au premier jour ouvert), dernier jour pour retirer,
// retenue en cas de renvoi (jamais plus que le total payé).
export function echeancier(c: CommandeClient, maintenant: number, relais: Relais | null) {
  const fermetures = fermeturesDe(relais, c.arriveeLe ?? maintenant)
  const arrivee = c.arriveeLe ?? maintenant
  const jour = c.garde?.jour ?? jourDeGarde(arrivee, maintenant, fermetures)
  const valeurs = valeursColis(c)
  const n = Math.max(1, valeurs.length)
  let avant = 0
  const jours: JourGarde[] = GARDE_CUMUL.map((_, i) => {
    const le = debutDuJour(arrivee, i + 1, fermetures)
    const cumul = valeurs.length ? gardeCommande(i + 1, valeurs) : GARDE_CUMUL[i]
    const x = { j: i + 1, le, frais: cumul - avant, cumul, ferme: fermeLe(le, relais) }
    avant = cumul
    return x
  })
  let renvoi = dateRenvoi(arrivee, fermetures)
  for (let k = 0; k < 7 && fermeLe(renvoi, relais); k++) renvoi = minuitYaounde(renvoi) + 864e5 + 8 * H
  // Fermetures qui arrêtent le compteur entre l'arrivée et le renvoi (lignes « garde arrêtée »).
  const arrets = fermetures.filter((f) => f.fin > arrivee && f.debut < renvoi).map((f) => f.debut)
  const ouverts = jours.filter((x) => !x.ferme)
  const dernier = ouverts[ouverts.length - 1] ?? jours[6]
  const suivant = jours.find((x) => x.j > jour + 1 && x.frais > 0) ?? null
  const retenue = Math.min(jours[6].cumul + RENVOI_GARDE, c.total || Infinity)
  return { jour, n, gros: false, jours, renvoi, dernier, suivant, retenue, arrets }
}

// QR du code (dessin déterministe : le vrai QR vient du serveur, signé).
export function Qr({ texte }: { texte: string }) {
  const n = 21
  let h = 0
  for (const c of texte) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const cases: [number, number][] = []
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const coin = (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8)
      if (coin) {
        const a = x < 7 ? x : x - (n - 7)
        const b = y < 7 ? y : y - (n - 7)
        if (a === 0 || a === 6 || b === 0 || b === 6 || (a > 1 && a < 5 && b > 1 && b < 5)) cases.push([x, y])
        continue
      }
      h = (h * 1103515245 + 12345) >>> 0
      if ((h >> 16) & 1) cases.push([x, y])
    }
  return (
    <svg viewBox={`0 0 ${n} ${n}`} role="img" aria-label="QR">
      {cases.map(([x, y]) => (
        <rect key={x + '-' + y} x={x} y={y} width="1" height="1" fill="#111" />
      ))}
    </svg>
  )
}

// Les 6 chiffres du code (masqués : des points).
/** Un code et un QR par colis (v6 D12, D14 ; REPRISES-FIN § 3.9) : le code de chaque colis non annulé, tel que le
 * serveur le sert (colis[].code) ; un serveur qui ne sert encore que le code de la commande : ce code, pour la commande. */
export interface CodeDuColis {
  n: number | null // numéro du colis ; null : code de la commande (serveur sans code par colis)
  produit: string | null
  code: string
}
export function codesDesColis(c: CommandeClient): CodeDuColis[] {
  const parColis = c.colis.filter((x) => !x.annule && !!x.code).map((x) => ({ n: x.n, produit: x.produit, code: x.code! }))
  if (parColis.length) return parColis
  return c.code ? [{ n: null, produit: null, code: c.code }] : []
}
/** Contenu du QR d'un colis : le format que lit le relais (« BLV1. » puis le code du colis). */
export const texteQr = (x: CodeDuColis) => `BLV1.${x.code}`

export function Code6({ code, masque }: { code: string; masque?: boolean }) {
  return (
    <div className={'code6' + (masque ? ' mask' : '')} aria-label={masque ? undefined : code.split('').join(' ')}>
      {code.split('').map((x, i) => (
        <span key={i} className="nofmt">
          {masque ? '•' : x}
        </span>
      ))}
    </div>
  )
}

// Le relais aujourd'hui : fermé (jour de fermeture) ou ouvert jusqu'à l'heure de fermeture de ses horaires.
export function ouvertureDuJour(r: Relais, maintenant: number): { texte: string; v: Record<string, string> } {
  if (JOURS_FR[jourSemaine(maintenant)] === r.ferme) return { texte: 'Fermé aujourd’hui ({f})', v: { f: r.ferme } }
  if (fermeLe(maintenant, r)) return { texte: 'Fermé aujourd’hui', v: {} }
  return { texte: 'Ouvert aujourd’hui jusqu’à {h}', v: { h: (r.horaires.split('–')[1] ?? r.horaires).trim() } }
}

// Réseau du téléphone : hors ligne, le code reste lisible ; un paiement ne peut pas partir.
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

// Jeton du lien court (8 caractères), tiré de la commande : le vrai jeton vient du serveur avec le SMS.
export function jeton(ref: string) {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let h = 2166136261
  for (const c of ref) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0
  let s = ''
  for (let i = 0; i < 8; i++) {
    s += A[h % A.length]
    h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0
  }
  return s
}
