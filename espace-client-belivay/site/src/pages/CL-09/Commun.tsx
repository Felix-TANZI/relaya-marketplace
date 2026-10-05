// Commandes (CL-09, CL-10) : ce que partagent la liste, le détail, le code, le suivi et le comptoir (DP-54).
import { useEffect, useState, type ReactNode } from 'react'
import type { Largeur } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { source, type CommandeClient, type Relais } from '../../donnees/source'
import { F } from '../../i18n/format'

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

// Garde (DP-08 ; moteurs/belivay_moteurs/garde.py) : grille du client par groupe de remise (un code, une garde pour
// tous ses colis), jour 1 à 7 : 0, 100, 100, 100, 200, 500, 1 000 F ; gros colis (carton C1 ou C2 dans le groupe) :
// + 300 F chaque jour dès le jour 1 (300, 400, 400, 400, 500, 800, 1 300 F). Un jour de fermeture du relais compte
// dans les 7 jours mais n'est jamais facturé ; la garde ne dépasse jamais la valeur des colis ; le 8e jour (premier
// jour ouvert), renvoi au vendeur (+ 500 F, GARDE-RENVOI), retenue jamais plus que ce qui a été payé (DP-24).
export const GRILLE_GARDE = [0, 100, 100, 100, 200, 500, 1000]
export const GARDE_GROS_AJOUT = 300
export const RENVOI_GARDE = 500
const JOURS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const jourSemaine = (ms: number) => new Date(ms + 3600e3).getUTCDay()
export interface JourGarde {
  j: number
  le: number
  frais: number
  cumul: number
  ferme: boolean
}
// Colis d'une commande encore à retirer, gros colis (C1, C2) et valeur (plafond de la garde).
export const colisActifs = (c: CommandeClient) => c.colis.filter((x) => !x.annule)
export const grosColis = (c: CommandeClient) => colisActifs(c).some((x) => x.gros)
export const valeurColis = (c: CommandeClient) => colisActifs(c).reduce((n, x) => n + x.prix * x.qte, 0)
// Tarif d'un jour de la grille (1 à 7) pour ce groupe : grille + 300 F si un gros colis.
export const tarifGarde = (j: number, gros: boolean) => (GRILLE_GARDE[j - 1] ?? 0) + (gros ? GARDE_GROS_AJOUT : 0)
// Au plus : 7 jours de la grille (2 000 F, 4 100 F avec un gros colis), + 500 F avec le renvoi.
export const plafondGarde = (gros: boolean) => GRILLE_GARDE.reduce((n, g) => n + g + (gros ? GARDE_GROS_AJOUT : 0), 0)
// Échéancier de la garde d'une commande arrivée : jours 1 à 7 datés depuis aujourd'hui (jour courant de la
// garde), frais et cumul (plafonné à la valeur des colis), jour de renvoi, dernier jour pour retirer (relais
// ouvert), retenue en cas de renvoi (jamais plus que le total payé).
export function echeancier(c: CommandeClient, maintenant: number, ferme: string | null) {
  const jour = c.garde?.jour ?? 1
  const n = Math.max(1, colisActifs(c).length)
  const gros = grosColis(c)
  const valeur = valeurColis(c) || Infinity
  let cumul = 0
  const jours: JourGarde[] = GRILLE_GARDE.map((_, i) => {
    const le = maintenant + (i + 1 - jour) * 864e5
    const f = !!ferme && JOURS_FR[jourSemaine(le)] === ferme
    const avant = cumul
    cumul = Math.min(valeur, cumul + (f ? 0 : tarifGarde(i + 1, gros)))
    return { j: i + 1, le, frais: cumul - avant, cumul, ferme: f }
  })
  let renvoi = maintenant + (8 - jour) * 864e5
  for (let k = 0; k < 7 && fermeLe(renvoi, ferme); k++) renvoi += 864e5
  const ouverts = jours.filter((x) => !x.ferme)
  const dernier = ouverts[ouverts.length - 1] ?? jours[6]
  const suivant = jours.find((x) => x.j > jour + 1 && x.frais > 0) ?? null
  const retenue = Math.min(jours[6].cumul + RENVOI_GARDE, c.total || Infinity)
  return { jour, n, gros, jours, renvoi, dernier, suivant, retenue }
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
  return { texte: 'Ouvert aujourd’hui jusqu’à {h}', v: { h: (r.horaires.split('–')[1] ?? r.horaires).trim() } }
}
export const fermeLe = (ms: number, ferme: string | null) => !!ferme && JOURS_FR[jourSemaine(ms)] === ferme

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
