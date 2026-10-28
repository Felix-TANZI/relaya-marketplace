// Paramètres de la livraison lus dans le registre en vigueur (logique-metier/parametres-en-vigueur.json), portage de
// lire_livraison, lire_paiement (transfert), lire_entreprise, lire_trust et lire_sanctions (contrôle) de
// moteurs/belivay_moteurs/registre.py. Même principe : une valeur de forme inattendue arrête la lecture (jamais un
// montant ni un délai deviné). Fichier identique dans espace-entreprise et espace-livreur (src/calculs/livraison/).
import donnees from '../../../../logique-metier/parametres-en-vigueur.json' with { type: 'json' }
import { ParametreAbsent, ParametreIllisible } from '../erreurs'

export type Registre = Record<string, string>
export type Classe = 'S' | 'M' | 'L' | 'XL' | 'HG'

/** Prestation impossible à acheter ou à payer (classe inconnue, montant négatif, colis XL au relais…). */
export class PrestationInvalide extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PrestationInvalide'
  }
}

export function chargerRegistre(d: { parametres: { code: string; valeur: string }[] } = donnees): Registre {
  return Object.fromEntries(d.parametres.map((p) => [p.code, p.valeur]))
}
export const REGISTRE: Registre = chargerRegistre()

const NOMBRE = '(\\d{1,3}(?:[\\s\\u00a0\\u202f]\\d{3})*|\\d+)'
const entier = (t: string) => Number(t.replace(/[\s  ]/g, ''))
const taux = (t: string) => Number(t.replace(',', '.'))
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

function valeur(r: Registre, code: string): string {
  if (!(code in r)) throw new ParametreAbsent(code)
  return r[code].trim()
}
function lire(r: Registre, code: string, motif: string): RegExpExecArray {
  const v = valeur(r, code)
  const m = new RegExp('^(?:' + motif + ')$').exec(v)
  if (!m) throw new ParametreIllisible(`${code} : « ${v} » ne suit pas la forme attendue`)
  return m
}
function exact(r: Registre, code: string, attendu: string): void {
  if (valeur(r, code) !== attendu) throw new ParametreIllisible(`${code} : seule la règle « ${attendu} » est prise en charge`)
}
function jour(code: string, nom: string): number {
  const i = JOURS.indexOf(nom)
  if (i < 0) throw new ParametreIllisible(`${code} : jour inconnu « ${nom} »`)
  return i
}

/** Grille client utile aux plafonds d'achat (CL-07, DP-07, DP-18, DP-19, DP-25, DP-37, DP-62, DP-65). */
export interface ParametresClient {
  ramassage: number // LIV-R
  ramassageSuivant: number // R′, même zone
  remiseRelais: Record<'S' | 'M' | 'L', number> // LIV-REM-RELAIS
  remiseDomicile: number // LIV-REM-DOM
  supplementML: number // LIV-SUPPL-M / L
  supplementXL: { borneKm: number | null; comprise: boolean; montant: number }[] // LIV-SUPPL-XL
  transfert: Record<'S' | 'M' | 'L', number> // TRANSFERT-RELAIS
}

export function lireClient(r: Registre): ParametresClient {
  const ramassage = entier(lire(r, 'LIV-R', NOMBRE + ' F')[1])
  const d = lire(r, 'LIV-DELTA', '(\\d+) % \\(R′ = ' + NOMBRE + ' F\\)')
  const rPrime = Math.floor((ramassage * (100 - Number(d[1])) + 50) / 100)
  if (rPrime !== entier(d[2])) throw new ParametreIllisible(`LIV-DELTA : R′ écrit ${d[2]} F, calculé ${rPrime} F`)
  const rel = lire(r, 'LIV-REM-RELAIS', NOMBRE + ' F par colis S, ' + NOMBRE + ' F par colis M, ' + NOMBRE + ' F par colis L')
  const xl = lire(
    r,
    'LIV-SUPPL-XL',
    NOMBRE + ' F \\(moins de (\\d+) km\\) · ' + NOMBRE + ' F \\((\\d+) à (\\d+) km\\) · ' + NOMBRE + ' F \\(plus de (\\d+) km\\), distance de la livraison à domicile',
  )
  if (!(xl[2] === xl[4] && xl[5] === xl[7])) throw new ParametreIllisible('LIV-SUPPL-XL : les paliers de distance ne se suivent pas')
  const tr = lire(r, 'TRANSFERT-RELAIS', NOMBRE + ' F par colis S ou M, ' + NOMBRE + ' F par colis L')
  return {
    ramassage,
    ramassageSuivant: rPrime,
    remiseRelais: { S: entier(rel[1]), M: entier(rel[2]), L: entier(rel[3]) },
    remiseDomicile: entier(lire(r, 'LIV-REM-DOM', NOMBRE + ' F par colis')[1]),
    supplementML: entier(lire(r, 'LIV-SUPPL-M / L', NOMBRE + ' F : aucun supplément de classe M ou L')[1]),
    supplementXL: [
      { borneKm: Number(xl[2]), comprise: false, montant: entier(xl[1]) },
      { borneKm: Number(xl[5]), comprise: true, montant: entier(xl[3]) },
      { borneKm: null, comprise: false, montant: entier(xl[6]) },
    ],
    transfert: { S: entier(tr[1]), M: entier(tr[1]), L: entier(tr[2]) },
  }
}

/** Trust Score du livreur et de l'entreprise (ENT-TRUST-*). */
export interface ParametresTrust {
  poids: Record<'Ponctualité' | 'Qualité' | 'Litiges' | 'Ancienneté' | 'Formation', number>
  neutre: number
  k: number
  demiVieJours: number
  gravites: { g1: number; g2: number; g3: number }
  vetoPlafond: number
  baisseMax: number
  gelJours: number
  anciennetePoints: number
  ancienneteMois: number
  ancienneteMissions: number
  seuils: { Confirmé: number; Or: number }
  tenueJours: number
  ecartDescenteEntreprise: number
  ecartDescenteLivreur: number
}

export function lireTrust(r: Registre): ParametresTrust {
  const p = lire(r, 'ENT-TRUST-POIDS', 'Ponctualité (\\d+) · Qualité (\\d+) · Litiges (\\d+) · Ancienneté (\\d+) · Formation (\\d+)')
  const poids = { Ponctualité: +p[1], Qualité: +p[2], Litiges: +p[3], Ancienneté: +p[4], Formation: +p[5] }
  if (Object.values(poids).reduce((a, b) => a + b, 0) !== 100) throw new ParametreIllisible('ENT-TRUST-POIDS : les poids font 100')
  const m = lire(
    r,
    'ENT-TRUST-MOTEUR',
    'neutre (\\d+) \\(k = (\\d+)\\) ; demi-vie (\\d+) jours ; gravité g1 = (\\d+), g2 = (\\d+), g3 = (\\d+) échecs ; veto : (\\d+) au plus ; baisse de (\\d+) points au plus par recalcul ; critères gelés après (\\d+) jours sans mission',
  )
  const a = lire(r, 'ENT-TRUST-ANCIENNETE', '(\\d+) × min\\(1 ; mois ÷ (\\d+)\\) \\+ (\\d+) × min\\(1 ; missions ÷ (\\d+)\\)')
  if (a[1] !== a[3] || 2 * +a[1] !== 100) throw new ParametreIllisible('ENT-TRUST-ANCIENNETE : deux moitiés de 50 points')
  const s = lire(
    r,
    'ENT-TRUST-PALIERS',
    'Confirmé (\\d+) · Or (\\d+), tenus (\\d+) jours ; descente proposée (\\d+) points sous le seuil pendant (\\d+) jours \\(entreprise\\) ou sous le seuil pendant (\\d+) jours \\(livreur\\), validée par une personne',
  )
  if (!(s[3] === s[5] && s[5] === s[6])) throw new ParametreIllisible('ENT-TRUST-PALIERS : une seule durée de tenue (14 jours)')
  const g = [+m[4], +m[5], +m[6]]
  if (!(g[0] >= 1 && g[0] <= g[1] && g[1] <= g[2])) throw new ParametreIllisible('ENT-TRUST-MOTEUR : gravités croissantes')
  return {
    poids,
    neutre: +m[1],
    k: +m[2],
    demiVieJours: +m[3],
    gravites: { g1: g[0], g2: g[1], g3: g[2] },
    vetoPlafond: +m[7],
    baisseMax: +m[8],
    gelJours: +m[9],
    anciennetePoints: +a[1],
    ancienneteMois: +a[2],
    ancienneteMissions: +a[4],
    seuils: { Confirmé: +s[1], Or: +s[2] },
    tenueJours: +s[3],
    ecartDescenteEntreprise: +s[4],
    ecartDescenteLivreur: 0,
  }
}

/** Entreprise de livraison : achat, paquets, délais, versement, retenues (ENT-*, RET-TRAJET, RELAIS-GAIN-COLIS). */
export interface ParametresEntreprise {
  margePourCent: number
  partRelais: Record<'S' | 'M' | 'L', number>
  trajetRetour: number
  plafondsValeur: { Nouveau: number; Confirmé: number; Or: null }
  joursService: number[] // 0 = lundi
  debutServiceH: number
  finServiceH: number
  delaiHeures: number
  margeFermetureMin: number
  heureReportH: number
  seuilPublication: number
  creneauPublication: number
  acceptationMin: number
  ramassageMin: number
  prioriteMin: number
  minorationPourCent: number
  jourVersement: number
  heureVersementH: number
  jourArrete: number
  heureArrete: { h: number; min: number }
  reportVendredis: number
  trust: ParametresTrust
}

export function lireEntreprise(r: Registre): ParametresEntreprise {
  const pl = lire(r, 'ENT-PLAFOND-ACHAT', '\\(prix client − part du relais\\) ÷ (\\d+),(\\d), arrondi à la dizaine inférieure ; chaque colis payé au plus le plafond de sa classe')
  if (pl[1] !== '1') throw new ParametreIllisible('ENT-PLAFOND-ACHAT : diviseur 1,x attendu')
  const part = lire(r, 'RELAIS-GAIN-COLIS', NOMBRE + ' F / ' + NOMBRE + ' F / ' + NOMBRE + ' F')
  const val = lire(
    r,
    'ENT-PLAFOND-VALEUR',
    'Nouveau ' + NOMBRE + ' F · Confirmé ' + NOMBRE + ' F · Or sans plafond, assurance marchandises obligatoire \\(assurance expirée : plafond de Confirmé\\)',
  )
  const srv = lire(r, 'ENT-SERVICE', '(\\S+) au (\\S+), (\\d{1,2}) h à (\\d{1,2}) h')
  const [debutJ, finJ] = [jour('ENT-SERVICE', srv[1]), jour('ENT-SERVICE', srv[2])]
  if (!(+srv[3] < +srv[4])) throw new ParametreIllisible('ENT-SERVICE : le service commence avant de finir')
  const sla = lire(r, 'SLA-ZONE-H', 'moins de (\\d+) h')
  const hl = lire(
    r,
    'ENT-HEURE-LIMITE',
    "« C'est prêt » le plus ancien \\+ (\\d+) h, au plus tard la fermeture du relais moins (\\d+) min ; au-delà de la fin de service, le jour de service suivant à (\\d{1,2}) h",
  )
  if (hl[1] !== sla[1]) throw new ParametreIllisible('ENT-HEURE-LIMITE : le délai est celui de SLA-ZONE-H')
  const pub = lire(
    r,
    'ENT-PUBLICATION',
    "paquet relais publié dès (\\d+) colis à son créneau, au (\\d+)e créneau quel que soit le nombre, toujours avant l'heure limite moins la durée estimée de la tournée ; domicile : chaque commande publiée seule, sans attendre",
  )
  const del = lire(r, 'ENT-DELAIS', "acceptation d'un paquet sous (\\d+) min ; ramassage sous (\\d+) h (\\d{2}) après l'acceptation ; priorité au premier rang pendant (\\d+) min")
  const mn = lire(r, 'ENT-MINORATION-RETARD', "(\\d+(?:,\\d+)?) % de moins sur chaque colis remis après son heure limite, sauf incident d'un tiers validé")
  const ver = lire(
    r,
    'ENT-VERSEMENT',
    '(\\S+) avant (\\d{1,2}) h, arrêté le (\\S+) (\\d{1,2}) h (\\d{2}) ; missions validées, preuves complètes et hors revue ; frais Mobile Money à la charge de BelivaY ; sans minimum',
  )
  const [jv, ja] = [jour('ENT-VERSEMENT', ver[1]), jour('ENT-VERSEMENT', ver[3])]
  if ((((jv - ja) % 7) + 7) % 7 !== 1) throw new ParametreIllisible("ENT-VERSEMENT : l'arrêté est la veille du jour de versement")
  const neg = lire(r, 'ENT-SOLDE-NEGATIF', "à verser 0 F ; reporté sur (\\d+) vendredis au plus, puis plan d'apurement ; jamais de caution")
  exact(r, 'ENT-RETENUE-TORT', 'article : valeur payée au vendeur, au plus le plafond de valeur du palier ; en lignes distinctes, sans plafond : livraison remboursée au client et trajet retour (RET-TRAJET)')
  exact(r, 'ENT-TRUST-ENTREPRISE', "moyenne des Trust Scores des livreurs actifs pondérée par leurs missions, moins les pénalités propres de l'entreprise (poids en console)")
  exact(r, 'LVR-GAINS', "tarif par mission fixé par l'entreprise, affiché s'il est configuré ; sinon compteur de missions validées")
  exact(r, 'LVR-CONTROLE', 'C1 (deux photos) sur chaque colis ; audit C4 au tirage selon CTRL-RAMASSAGE ou après un défaut ; vendeur en contrôle renforcé ou en période probatoire : bandeau « contrôle de chaque colis »')
  return {
    margePourCent: Number(pl[2]) * 10,
    partRelais: { S: entier(part[1]), M: entier(part[2]), L: entier(part[3]) },
    trajetRetour: entier(lire(r, 'RET-TRAJET', NOMBRE + ' F, à la charge de la partie en tort')[1]),
    plafondsValeur: { Nouveau: entier(val[1]), Confirmé: entier(val[2]), Or: null },
    joursService: Array.from({ length: finJ - debutJ + 1 }, (_, i) => debutJ + i),
    debutServiceH: +srv[3],
    finServiceH: +srv[4],
    delaiHeures: +sla[1],
    margeFermetureMin: +hl[2],
    heureReportH: +hl[3],
    seuilPublication: +pub[1],
    creneauPublication: +pub[2],
    acceptationMin: +del[1],
    ramassageMin: +del[2] * 60 + +del[3],
    prioriteMin: +del[4],
    minorationPourCent: taux(mn[1]),
    jourVersement: jv,
    heureVersementH: +ver[2],
    jourArrete: ja,
    heureArrete: { h: +ver[4], min: +ver[5] },
    reportVendredis: +neg[1],
    trust: lireTrust(r),
  }
}

/** Contrôle au ramassage (CTRL-RAMASSAGE). */
export interface ParametresControle {
  premieres: number
  sousSeuil: number
  seuilScore: number
  ensuite: number
}
export function lireControle(r: Registre): ParametresControle {
  const m = lire(r, 'CTRL-RAMASSAGE', '100 % des (\\d+) premières commandes, puis 1 sur (\\d+) sous un Trust Score de (\\d+), puis 1 sur (\\d+)')
  return { premieres: +m[1], sousSeuil: +m[2], seuilScore: +m[3], ensuite: +m[4] }
}

/** Paramètres en vigueur, lus une fois. */
export const LIVRAISON = {
  client: lireClient(REGISTRE),
  entreprise: lireEntreprise(REGISTRE),
  controle: lireControle(REGISTRE),
}
