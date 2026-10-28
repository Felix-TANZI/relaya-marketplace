// Moteur des alertes de fraude, copie fidèle de moteurs/belivay_moteurs/fraude.py (le serveur fait foi) : signaux
// calculés sur des faits (empreintes, jamais un numéro en clair), alertes seulement (FRAUDE-SEUILS, seuils lus au
// registre : registre-s6.ts), jamais d'action automatique. Comme le moteur, trois genres de lien SÉPARÉS : l'appareil,
// le numéro de versement d'un vendeur (« numero ») et le moyen de paiement d'un client (« moyen »).
// Seule différence de forme : la clé garde la signature en clair (le moteur la hache, sha256 sur 16 caractères).
export type TypeAlerte = 'anneau' | 'remboursements' | 'comptoir' | 'avis_croises' | 'retraits'
export type LienAnneau = 'appareil' | 'numero' | 'moyen'

export interface ParametresFraude {
  fenetreJ: number
  anneauComptes: number
  rembAuto: number
  refusComptoir: number
  avisNote: number
  retraitsN: number
  retraitsF: number
}

export interface Identifiants {
  compte: string
  appareils?: string[] // empreintes des appareils
  numeros?: string[] // numéros de versement d'une boutique (empreintes)
  moyens?: string[] // moyens de paiement d'un client (empreintes)
}

export interface AlerteCalculee {
  type: TypeAlerte
  cle: string // stable : type + signature des faits (le même signal ne lève pas deux alertes)
  comptes: string[]
  niveau: 'attention' | 'critique' // critique au double du seuil
  lien: LienAnneau | null
  identifiant: string | null // empreinte partagée (anneau)
  mesure: number
  seuil: number
  montant: number | null // retraits : cumul des 24 h
}

const JOUR = 86_400_000
const alerte = (type: TypeAlerte, signature: string, comptes: string[], mesure: number, seuil: number, x: Partial<AlerteCalculee> = {}): AlerteCalculee => ({
  type,
  cle: `${type}:${signature}`,
  comptes: [...comptes].sort(),
  niveau: mesure >= 2 * seuil ? 'critique' : 'attention',
  lien: null,
  identifiant: null,
  mesure,
  seuil,
  montant: null,
  ...x,
})

export function anneaux(comptes: Identifiants[], p: ParametresFraude): AlerteCalculee[] {
  const par = new Map<string, Set<string>>()
  for (const c of comptes)
    for (const [genre, valeurs] of [['appareil', c.appareils ?? []], ['numero', c.numeros ?? []], ['moyen', c.moyens ?? []]] as const)
      for (const v of valeurs) {
        const k = `${genre}|${v}`
        if (!par.has(k)) par.set(k, new Set())
        par.get(k)!.add(c.compte)
      }
  return [...par.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)) // ordre des points de code, comme sorted() du moteur
    .filter(([, l]) => l.size >= p.anneauComptes)
    .map(([k, l]) => {
      const [genre, v] = k.split('|') as [LienAnneau, string]
      return alerte('anneau', k, [...l], l.size, p.anneauComptes, { lien: genre, identifiant: v })
    })
}

const dansFenetre = (le: number, maintenant: number, jours: number) => maintenant - jours * JOUR <= le && le <= maintenant

export function remboursementsAuto(remb: { compte: string; le: number }[], maintenant: number, p: ParametresFraude): AlerteCalculee[] {
  const n = new Map<string, number>()
  for (const r of remb) if (dansFenetre(r.le, maintenant, p.fenetreJ)) n.set(r.compte, (n.get(r.compte) ?? 0) + 1)
  return [...n.entries()].sort().filter(([, k]) => k >= p.rembAuto).map(([c, k]) => alerte('remboursements', c, [c], k, p.rembAuto))
}

export function refusComptoir(refus: Record<string, number>, p: ParametresFraude): AlerteCalculee[] {
  return Object.entries(refus).sort().filter(([, k]) => k >= p.refusComptoir).map(([c, k]) => alerte('comptoir', c, [c], k, p.refusComptoir))
}

export function avisCroises(notes: { auteur: string; cible: string; etoiles: number }[], p: ParametresFraude): AlerteCalculee[] {
  const hautes = new Set(notes.filter((x) => x.etoiles >= p.avisNote && x.auteur !== x.cible).map((x) => `${x.auteur}|${x.cible}`))
  return [...hautes]
    .sort()
    .map((h) => h.split('|'))
    .filter(([a, c]) => a < c && hautes.has(`${c}|${a}`))
    .map(([a, c]) => alerte('avis_croises', `${a}|${c}`, [a, c], 2, 2))
}

export function retraits(ret: { compte: string; montant: number; le: number }[], maintenant: number, p: ParametresFraude): AlerteCalculee[] {
  const n = new Map<string, number>()
  const somme = new Map<string, number>()
  for (const r of ret)
    if (dansFenetre(r.le, maintenant, 1)) {
      n.set(r.compte, (n.get(r.compte) ?? 0) + 1)
      somme.set(r.compte, (somme.get(r.compte) ?? 0) + r.montant)
    }
  return [...n.keys()]
    .sort()
    .filter((c) => n.get(c)! >= p.retraitsN || somme.get(c)! >= p.retraitsF)
    .map((c) => {
      const parNombre = n.get(c)! / p.retraitsN >= somme.get(c)! / p.retraitsF
      return alerte('retraits', `${c}|${new Date(maintenant).toISOString().slice(0, 10)}`, [c], parNombre ? n.get(c)! : somme.get(c)!, parNombre ? p.retraitsN : p.retraitsF, { montant: somme.get(c)! })
    })
}

export interface Faits {
  identifiants: Identifiants[]
  remboursements: { compte: string; le: number }[]
  refus: Record<string, number>
  notes: { auteur: string; cible: string; etoiles: number }[]
  retraits: { compte: string; montant: number; le: number }[]
}

/** Toutes les alertes du moment, dans l'ordre des types. */
export const calculerAlertes = (f: Faits, maintenant: number, p: ParametresFraude): AlerteCalculee[] => [
  ...anneaux(f.identifiants, p),
  ...remboursementsAuto(f.remboursements, maintenant, p),
  ...refusComptoir(f.refus, p),
  ...avisCroises(f.notes, p),
  ...retraits(f.retraits, maintenant, p),
]
