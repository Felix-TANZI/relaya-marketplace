// Lecture des paramètres du registre (moteurs/belivay_moteurs/registre.py ; CCH-15 : aucune valeur dans le code).
// Source : logique-metier/parametres-en-vigueur.json, importé à la construction. Chaque valeur est lue avec une forme
// attendue précise : si la forme change, la lecture s'arrête (ParametreIllisible) au lieu de deviner un montant. En
// production, les mêmes codes viendront de la configuration versionnée du serveur (GET /config).
import donnees from '../../../logique-metier/parametres-en-vigueur.json' with { type: 'json' }
import { Dec } from './argent'
import { ParametreAbsent, ParametreIllisible } from './erreurs'

export type Registre = Record<string, string>

/** Code → valeur, telle qu'écrite dans le registre. */
export function chargerRegistre(d: { parametres: { code: string; valeur: string }[] } = donnees): Registre {
  return Object.fromEntries(d.parametres.map((p) => [p.code, p.valeur]))
}
export const REGISTRE: Registre = chargerRegistre()

const NOMBRE = '(\\d{1,3}(?:[\\s\\u00a0\\u202f]\\d{3})*|\\d+)'
const entier = (t: string) => Number(t.replace(/[\s  ]/g, ''))
const taux = (t: string) => Dec.de(t.replace(',', '.'))
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

// ── Commission (VD-02 p5-6, familles M01 ; DP-55 : Q-01 à Q-09) ──────────────────────────────────────────

export type Famille = 'A' | 'B' | 'C' | 'D' | 'E'
export type Palier = 'Bronze' | 'Argent' | 'Or' | 'Platine'
export const PALIERS: Palier[] = ['Bronze', 'Argent', 'Or', 'Platine']

export interface Tranche {
  borne: number | null // part du prix unitaire jusqu'à cette borne comprise ; null : au-delà
  tauxPourCent: Dec
}
export interface Plan {
  prixMensuel: number
  remisePourCent: Dec
}
export interface ParametresCommission {
  bareme: Record<Famille, Tranche[]>
  familles: Record<string, Famille> // catégorie → famille
  multiplicateurs: Record<Palier, Dec>
  pointsPetitPrix: Dec
  seuilPetitPrix: number
  pointsMadeInCameroon: Dec
  decouverteMult: Dec
  decouverteMois: number
  decouverteCommandes: number
  plancherCommande: number
  plancherTauxPourCent: Dec
  tvaPourCent: Dec
  prixMin: number
  plans: Record<'Boost' | 'Pro', Plan>
  annuelMoisPayes: number // VD-PLAN-ANNUEL : 10 mois payés pour 12 ; plafond mensuel = prix annuel ÷ 12 (A-3)
  essaiMois: number // VD-PLAN-ESSAI : 1 mois offert (A-2)
  essaiRappelJours: number // rappel 3 jours avant la fin de l'essai
  graceJours: number // VD-PLAN-GRACE : 7 jours après un paiement échoué, puis Free (PLN-02)
}

function lireBareme(r: Registre, f: Famille): [string[], Tranche[]] {
  const code = `VD-BAREME-${f}`
  const m = lire(r, code, '([^:]+) : (.+)')
  const categories = m[1].split(', ').map((c) => c.trim())
  const tranches: Tranche[] = []
  const morceaux = m[2].split(' · ')
  morceaux.forEach((morceau, i) => {
    const t = new RegExp('^(?:(\\d+(?:,\\d+)?) %|sans taux) (?:jusqu’à ' + NOMBRE + ' F|au-delà)$').exec(morceau)
    if (!t) throw new ParametreIllisible(`${code} : tranche « ${morceau} » illisible`)
    const dernier = i === morceaux.length - 1
    const borne = t[2] === undefined ? null : entier(t[2])
    if ((borne === null) !== dernier) throw new ParametreIllisible(`${code} : seule la dernière tranche va « au-delà »`)
    if (borne !== null && tranches.length && borne <= (tranches[tranches.length - 1].borne ?? 0)) throw new ParametreIllisible(`${code} : les bornes doivent croître`)
    let tx: Dec
    if (t[1] !== undefined) tx = taux(t[1])
    else if (tranches.length) tx = tranches[tranches.length - 1].tauxPourCent // Q-06 : le taux précédent continue
    else throw new ParametreIllisible(`${code} : la première tranche doit avoir un taux`)
    tranches.push({ borne, tauxPourCent: tx })
  })
  return [categories, tranches]
}

function enAttente(r: Registre, code: string, document: string) {
  if (valeur(r, code) !== `en attente de ${document}`) throw new ParametreIllisible(`${code} : règle ${document} fournie, à coder dans commission.ts avant de la lire`)
}

export function lireCommission(r: Registre): ParametresCommission {
  if (valeur(r, 'VD-COM-MODELE') !== 'VD-02, familles M01 : barème, puis palier, puis découverte ; un seul arrondi au franc, moitié vers le haut, à la fin')
    throw new ParametreIllisible('VD-COM-MODELE : seul le modèle VD-02 (DP-55) est pris en charge')
  if (valeur(r, 'VD-BAREME-SANS-TAUX') !== 'taux de la tranche précédente') throw new ParametreIllisible('VD-BAREME-SANS-TAUX : seule « taux de la tranche précédente » est prise en charge')
  const bareme = {} as Record<Famille, Tranche[]>
  const familles: Record<string, Famille> = {}
  for (const f of ['A', 'B', 'C', 'D', 'E'] as Famille[]) {
    const [categories, tranches] = lireBareme(r, f)
    bareme[f] = tranches
    for (const c of categories) {
      if (c in familles) throw new ParametreIllisible(`VD-BAREME-${f} : catégorie « ${c} » déjà dans la famille ${familles[c]}`)
      familles[c] = f
    }
  }
  const m = lire(r, 'VD-COM-PALIER', 'Bronze × (\\d+(?:,\\d+)?) · Argent × (\\d+(?:,\\d+)?) · Or × (\\d+(?:,\\d+)?) · Platine × (\\d+(?:,\\d+)?)')
  const multiplicateurs = Object.fromEntries(PALIERS.map((p, i) => [p, taux(m[i + 1])])) as Record<Palier, Dec>
  if (Object.values(multiplicateurs).some((v) => v.cmp(0) <= 0 || v.cmp(1) > 0)) throw new ParametreIllisible('VD-COM-PALIER : un multiplicateur doit être compris entre 0 (exclu) et 1')
  const pts = lire(r, 'VD-COM-POINTS', '\\+(\\d+(?:,\\d+)?) points si le prix unitaire est sous ' + NOMBRE + ' F · −(\\d+(?:,\\d+)?) points si Made in Cameroon')
  const decouverteMult = taux(lire(r, 'VD-DECOUV-MULT', '× (\\d+(?:,\\d+)?) sur la commission')[1])
  if (decouverteMult.cmp(0) <= 0 || decouverteMult.cmp(1) > 0) throw new ParametreIllisible('VD-DECOUV-MULT : une réduction doit être comprise entre 0 (exclu) et 1')
  const duree = lire(r, 'VD-DECOUV-DUREE', '(\\d+) mois ou (\\d+) commandes encaissées et non remboursées en totalité, la première limite atteinte')
  const tva = lire(r, 'VD-TVA', '(\\d+(?:,\\d+)?) % de la commission ; nouveau taux annoncé 30 jours avant')
  enAttente(r, 'VD-COM-M05', 'M05')
  enAttente(r, 'VD-COM-M06', 'M06')
  const plans = {} as Record<'Boost' | 'Pro', Plan>
  for (const nom of ['Boost', 'Pro'] as const) {
    const mp = lire(r, `VD-PLAN-${nom.toUpperCase()}`, NOMBRE + ' F par mois ; remise de (\\d+(?:,\\d+)?) % de la commission du mois')
    plans[nom] = { prixMensuel: entier(mp[1]), remisePourCent: taux(mp[2]) }
  }
  if (valeur(r, 'VD-PLAN-REMISE-PLAFOND') !== 'prix du plan, et jamais sous les commissions minimales') throw new ParametreIllisible('VD-PLAN-REMISE-PLAFOND : seul le plafond de DP-55 est pris en charge')
  const an = lire(r, 'VD-PLAN-ANNUEL', '(\\d+) mois payés pour 12 ; remise plafonnée chaque mois au prix annuel ÷ 12')
  const essai = lire(r, 'VD-PLAN-ESSAI', '(\\d+) mois offerts? ; rappel (\\d+) jours avant la fin ; sans premier paiement confirmé, retour à Free sans rien perdre')
  const grace = lire(r, 'VD-PLAN-GRACE', '(\\d+) jours après un paiement échoué, puis retour à Free sans rien perdre')
  if (valeur(r, 'VD-PLAN-TVA') !== 'au taux de VD-TVA, en plus du prix du plan ; la remise rend aussi la TVA de sa part de commission')
    throw new ParametreIllisible('VD-PLAN-TVA : seule la TVA en plus du prix du plan (audit C5) est prise en charge')
  return {
    bareme,
    familles,
    multiplicateurs,
    pointsPetitPrix: taux(pts[1]),
    seuilPetitPrix: entier(pts[2]),
    pointsMadeInCameroon: taux(pts[3]),
    decouverteMult,
    decouverteMois: Number(duree[1]),
    decouverteCommandes: Number(duree[2]),
    plancherCommande: entier(lire(r, 'VD-COM-MIN', NOMBRE + ' F par sous-commande')[1]),
    plancherTauxPourCent: taux(lire(r, 'VD-COM-MIN-TAUX', '(\\d+(?:,\\d+)?) % du prix des articles')[1]),
    tvaPourCent: taux(tva[1]),
    prixMin: entier(lire(r, 'VD-PRIX-MIN', NOMBRE + ' F ; publication refusée si le vendeur garderait moins de 0 F')[1]),
    plans,
    annuelMoisPayes: Number(an[1]),
    essaiMois: Number(essai[1]),
    essaiRappelJours: Number(essai[2]),
    graceJours: Number(grace[1]),
  }
}

// ── Versements (VD-02 p7, VD-09 ; DP-55 : Q-11 à Q-13, Q-58 à Q-60, Q-65) ─────────────────────────────────

export interface ParametresVersements {
  fenetreRetourJours: number
  libStandardJours: number
  libOrJours: number
  libCarteJours: number
  jourVersement: number // 4 = vendredi (lundi = 0)
  heureVersement: number // 12 : « avant 12 h »
  jourArrete: number // 3 = jeudi
  heureArrete: [number, number] // 23 h 59
  essais: number
  intervalleEssaisHeures: number
  revueNumeroJours: number
  repriseDemandeJours: number
  recouvrementJours: number // VD-REPRISE-IMPAYEE : recouvrement légal proposé 90 jours après la reprise (A-8)
  gelMotifHeures: number // VD-GEL-ANTIFRAUDE : motif écrit sous 48 h (GEL-02, Q-64)
}

export function lireVersements(r: Registre): ParametresVersements {
  const ver = lire(r, 'VD-VER-JOUR', '(\\w+), avant (\\d{1,2}) h, sans frais ni minimum')
  const arr = lire(r, 'VD-VER-ARRETE', '(\\w+) (\\d{1,2}) h (\\d{2})')
  for (const m of [ver, arr]) if (!JOURS.includes(m[1])) throw new ParametreIllisible(`jour inconnu : « ${m[1]} »`)
  if ((((JOURS.indexOf(ver[1]) - JOURS.indexOf(arr[1])) % 7) + 7) % 7 !== 1) throw new ParametreIllisible("VD-VER-ARRETE : l'arrêté est la veille du jour de versement")
  if (valeur(r, 'VD-VER-FERIE') !== 'versement maintenu') throw new ParametreIllisible('VD-VER-FERIE : seul « versement maintenu » est pris en charge (Q-13)')
  const ess = lire(r, 'VD-VER-ESSAIS', '(\\d+) essais à (\\d+) h d’intervalle, puis versements suspendus')
  const apres = (code: string) => Number(lire(r, code, '(\\d+) jours? après la fermeture du retour')[1])
  return {
    fenetreRetourJours: Number(lire(r, 'VD-RET-FENETRE', '(\\d+) jours après le retrait, ou plus tôt sur « Tout est en ordre »')[1]),
    libStandardJours: apres('VD-LIB-BRONZE-ARGENT'),
    libOrJours: apres('VD-LIB-OR-PLATINE'),
    libCarteJours: apres('VD-LIB-CARTE'),
    jourVersement: JOURS.indexOf(ver[1]),
    heureVersement: Number(ver[2]),
    jourArrete: JOURS.indexOf(arr[1]),
    heureArrete: [Number(arr[2]), Number(arr[3])],
    essais: Number(ess[1]),
    intervalleEssaisHeures: Number(ess[2]),
    revueNumeroJours: Number(lire(r, 'VD-NUM-REVUE', '(\\d+) jours, versements reportés')[1]),
    repriseDemandeJours: Number(lire(r, 'VD-REPRISE', 'déduite des versements suivants ; le reste est reporté ; demande Mobile Money après (\\d+) jours')[1]),
    recouvrementJours: Number(
      lire(r, 'VD-REPRISE-IMPAYEE', "ventes bloquées dès la demande Mobile Money jusqu'au règlement, avec relances ; recouvrement légal proposé (\\d+) jours après la reprise, décidé par une personne, contestable une fois")[1],
    ),
    gelMotifHeures: Number(lire(r, 'VD-GEL-ANTIFRAUDE', 'motif écrit sous (\\d+) h ; sans échéance')[1]),
  }
}

// ── Paliers et plafond de démarrage (PAL-01, C4, TRU-07, ACC-15 ; DP-21 ; Q-10, Q-14) ─────────────────────

export interface ConditionsPalier {
  trustScore: number
  commandesLivrees: number
  note: Dec
  visite: boolean
  audit: boolean
}
export interface ParametresPaliers {
  conditions: Record<'Argent' | 'Or' | 'Platine', ConditionsPalier>
  monteeJours: number
  descenteJours: number
  lancementMois: number
  lancementProduits: Record<'Argent' | 'Or' | 'Platine', number>
  plafondDemarrage: number
  demarrageCommandes: number
  alerteEcartPoints: number // VD-ALERTE-SEUIL : à 3 points ou moins d'un seuil (ACC-25 ; DP-57 A-5)
  alerteFrequenceJours: number // une fois par seuil et par semaine (SAN-02)
}

export function lirePaliers(r: Registre): ParametresPaliers {
  const conditions = {} as ParametresPaliers['conditions']
  for (const [nom, code] of [['Argent', 'VD-PAL-ARGENT'], ['Or', 'VD-PAL-OR'], ['Platine', 'VD-PAL-PLATINE']] as const) {
    const morceaux = valeur(r, code).split(' ; ')
    const m = /^Trust Score (\d+)$/.exec(morceaux[0])
    if (!m) throw new ParametreIllisible(`${code} : le Trust Score doit venir en premier`)
    const c: ConditionsPalier = { trustScore: Number(m[1]), commandesLivrees: 0, note: Dec.de(0), visite: false, audit: false }
    for (const morceau of morceaux.slice(1)) {
      let x: RegExpExecArray | null
      if ((x = /^(\d+) commandes livrées$/.exec(morceau))) c.commandesLivrees = Number(x[1])
      else if ((x = /^note (\d,\d)$/.exec(morceau))) c.note = taux(x[1])
      else if (morceau === 'visite physique') c.visite = true
      else if (morceau === 'audit trimestriel') c.audit = true
      else throw new ParametreIllisible(`${code} : condition « ${morceau} » inconnue`)
    }
    conditions[nom] = c
  }
  const seuils = Object.values(conditions).map((c) => c.trustScore)
  if (seuils.some((s, i) => i > 0 && s <= seuils[i - 1])) throw new ParametreIllisible('VD-PAL-ARGENT, OR, PLATINE : les seuils de Trust Score doivent croître')
  const lanc = lire(r, 'VD-PAL-LANCEMENT', '(\\d+) mois après la signature : Argent dès (\\d+) produits actifs, Or dès (\\d+), Platine dès (\\d+)')
  const dem = lire(r, 'VD-PLAFOND-DEMARRAGE', NOMBRE + ' F par sous-commande, jusqu’à (\\d+) commandes livrées sans incident')
  return {
    conditions,
    monteeJours: Number(lire(r, 'VD-PAL-MONTEE', 'conditions tenues (\\d+) jours de suite')[1]),
    descenteJours: Number(lire(r, 'VD-PAL-DESCENTE', 'Trust Score sous le seuil du palier (\\d+) jours de suite')[1]),
    lancementMois: Number(lanc[1]),
    lancementProduits: { Argent: Number(lanc[2]), Or: Number(lanc[3]), Platine: Number(lanc[4]) },
    plafondDemarrage: entier(dem[1]),
    demarrageCommandes: Number(dem[2]),
    alerteEcartPoints: Number(
      lire(r, 'VD-ALERTE-SEUIL', "à (\\d+) points ou moins d'un seuil \\(montée : seuil du palier suivant ; descente : seuil du palier\\) ; une fois par seuil et par semaine")[1],
    ),
    alerteFrequenceJours: 7, // « par semaine » (SAN-02)
  }
}

// ── Sanctions et contrôle au ramassage (SAN-01 à SAN-06, CTRL-RAMASSAGE ; DP-56 : Q-31 ; DP-57 : L-1) ─────

/** Valeurs de départ réglables en console (L-1). */
export interface ParametresSanctions {
  visibiliteJours: number // VD-SAN-VISIBILITE : niveau 2, visibilité réduite
  suspensionSousScore: number // VD-SAN-SUSPENSION : proposée sous 40…
  nonPreparations: number // … ou après 3 non-préparations…
  nonPreparationsJours: number // … en 30 jours glissants
  suspensionMaxJours: number // jusqu'à la décision humaine, 30 jours au plus
  probatoireCommandes: number // VD-PROBATOIRE : 20 commandes contrôlées à 100 %
  renforceSousScore: number // VD-CTRL-RENFORCE : 100 % sous 60…
  renforceBaissePoints: number // … ou après une baisse de 8 points en une semaine
  controlePremieres: number // CTRL-RAMASSAGE : 100 % des 5 premières commandes
  controleSousSeuil: number // puis 1 sur 20…
  controleSeuilScore: number // … sous un Trust Score de 70
  controleEnsuite: number // puis 1 sur 100
}

export function lireSanctions(r: Registre): ParametresSanctions {
  const sus = lire(r, 'VD-SAN-SUSPENSION', "proposée sous un Trust Score de (\\d+) ou après (\\d+) non-préparations en (\\d+) jours glissants ; jusqu'à la décision humaine, (\\d+) jours au plus")
  const ren = lire(r, 'VD-CTRL-RENFORCE', '100 % au ramassage si le Trust Score passe sous (\\d+) ou perd (\\d+) points en une semaine')
  const ctrl = lire(r, 'CTRL-RAMASSAGE', '100 % des (\\d+) premières commandes, puis 1 sur (\\d+) sous un Trust Score de (\\d+), puis 1 sur (\\d+)')
  return {
    visibiliteJours: Number(lire(r, 'VD-SAN-VISIBILITE', '(\\d+) jours')[1]),
    suspensionSousScore: Number(sus[1]),
    nonPreparations: Number(sus[2]),
    nonPreparationsJours: Number(sus[3]),
    suspensionMaxJours: Number(sus[4]),
    probatoireCommandes: Number(lire(r, 'VD-PROBATOIRE', '(\\d+) commandes contrôlées à 100 % au ramassage après une suspension')[1]),
    renforceSousScore: Number(ren[1]),
    renforceBaissePoints: Number(ren[2]),
    controlePremieres: Number(ctrl[1]),
    controleSousSeuil: Number(ctrl[2]),
    controleSeuilScore: Number(ctrl[3]),
    controleEnsuite: Number(ctrl[4]),
  }
}

// ── Litiges et retours, côté vendeur (registre client : LIT-*, RET-*, LIB-* ; DP-35, DP-56, DP-57) ─────────

export interface ParametresLitiges {
  autoStandard: number
  autoEleve: number
  vendeurHeures: number
  decisionHeures: number // après l'échéance du vendeur
  recoursHeures: number
  arrangementJours: number
  fenetreRetourJours: number
  defautCacheHeures: number
  viceCacheJours: number
  inspectionHeures: number
  trajetRetour: number
  remplacementHeuresOuvrees: number
  libStandardJours: number
  libOrJours: number
  libCarteJours: number
  // Libération et versement du vendeur : une seule source (versements.ts, VD-LIB-*, VD-VER-*), audit V3.
  versements: ParametresVersements
}

/** La libération du vendeur est une seule règle écrite sous deux codes (client : RET-FENETRE, LIB-* ; vendeur :
 * VD-RET-FENETRE, VD-LIB-*) : les valeurs doivent concorder, sinon on s'arrête (audit V3). */
function versementsConcordants(r: Registre): ParametresVersements {
  const v = lireVersements(r)
  const client = [
    Number(lire(r, 'RET-FENETRE', '(\\d+) jours après le retrait')[1]),
    Number(lire(r, 'LIB-STD', '(\\d+) j après fermeture du retour')[1]),
    Number(lire(r, 'LIB-OR', '(\\d+) j')[1]),
    Number(lire(r, 'LIB-CARTE', '(\\d+) j')[1]),
  ]
  const vendeur = [v.fenetreRetourJours, v.libStandardJours, v.libOrJours, v.libCarteJours]
  if (client.some((c, i) => c !== vendeur[i]))
    throw new ParametreIllisible('RET-FENETRE, LIB-STD, LIB-OR, LIB-CARTE et VD-RET-FENETRE, VD-LIB-* : une seule règle de libération, les valeurs doivent concorder (audit V3)')
  return v
}

export function lireLitiges(r: Registre): ParametresLitiges {
  if (valeur(r, 'RET-SANS-RETOUR') !== 'aucun : le client dépose toujours le colis au relais') throw new ParametreIllisible('RET-SANS-RETOUR : seul « aucun » est pris en charge (DP-10)')
  const rempl = lire(r, 'RET-REMPL-DELAI', '(\\d+) h ouvrées, dimanche non compté')
  const arr = lire(r, 'LIT-ARRANG-REPONSE-J', '(\\d+) jours ; sans réponse, le dossier revient en examen')
  const n = (code: string, motif = '(\\d+) h') => Number(lire(r, code, motif)[1])
  return {
    autoStandard: entier(lire(r, 'LIT-AUTO-STD', 'jusqu’à ' + NOMBRE + ' F')[1]),
    autoEleve: entier(lire(r, 'LIT-AUTO-ELEVE', 'jusqu’à ' + NOMBRE + ' F')[1]),
    vendeurHeures: n('LIT-VENDEUR-H'),
    decisionHeures: n('LIT-DECISION-H', "(\\d+) h après l'échéance du vendeur"),
    recoursHeures: n('LIT-RECOURS-H', 'un recours, sous (\\d+) h après la décision'),
    arrangementJours: Number(arr[1]),
    fenetreRetourJours: n('RET-FENETRE', '(\\d+) jours après le retrait'),
    defautCacheHeures: n('RET-DEFAUT-H', '(\\d+) h après le retrait'),
    viceCacheJours: n('RET-VICE', '(\\d+) jours après le retrait'),
    inspectionHeures: n('RET-INSPECT-H'),
    trajetRetour: entier(lire(r, 'RET-TRAJET', NOMBRE + ' F, à la charge de la partie en tort')[1]),
    remplacementHeuresOuvrees: Number(rempl[1]),
    libStandardJours: n('LIB-STD', '(\\d+) j après fermeture du retour'),
    libOrJours: n('LIB-OR', '(\\d+) j'),
    libCarteJours: n('LIB-CARTE', '(\\d+) j'),
    versements: versementsConcordants(r),
  }
}

/** Paramètres en vigueur, lus une fois au démarrage (une forme inattendue arrête l'application : rien n'est deviné). */
// ── Valeurs de console de l'espace vendeur (DP-57, vague d'intégration : versées au registre) ─────────────────────

export interface ParametresConsole {
  lienMotDePasseMinutes: number // VD-MDP-LIEN
  kyc: { autoMinutes: number; humainHeures: number; refusMax: number } // VD-KYC-DELAIS
  preavisJours: number // VD-RESILIATION-PREAVIS
  saisie: { premieresBoutiques: number; prixSession: number } // VD-SAISIE-ASSISTEE
  prixAnormal: { basPourCent: number; hautFois: number } // VD-PRIX-ANORMAL
  contestationHeures: number // VD-CONTESTATION-REPONSE (heures ouvrées, dimanche non compté)
  fileHeures: number // VD-FILE-HORS-LIGNE
  photos: { min: number; max: number; minPx: number; cotePx: number; qualite: number } // VD-PHOTOS
  fiche: { delaiH: number; prioDelaiH: number; prioPrix: number } // VD-FICHE-DELAI
  moderationH: number // VD-MODERATION
  colis: { diviseur: number; classes: { classe: string; kg: number; cm: number }[]; seuilKg: number; seuilCm: number } // VD-COLIS
  etatsProduit: string[] // VD-ETATS-PRODUIT
  preparation: { defautH: number; choixH: number[] } // VD-PREPARATION-DELAIS
  rappelPrixJours: number // VD-RAPPEL-PRIX
  prixAutoBaissePct: number // VD-PRIX-AUTO
  doublonPourCent: number // VD-DOUBLON
  conseilCentile: number // VD-CONSEIL-PRIX
  prefixes: { operateur: 'MTN' | 'Orange'; prefixes: string[] }[] // VD-PREFIXES-CM
  equipeMax: number // VD-EQUIPE-MAX
  agentPhotos: { prix: number; produits: number } // VD-SERVICES
  visibilite: { vitrineJours: number; meriteJours: number; scoreMin: number; remiseReluePct: number } // VD-VISIBILITE
  demande: { visiblesFree: number; jours: number } // VD-DEMANDE
  simulateur: { max: number; surMesureDes: number } // VD-SIMULATEUR
  visiteAgentHeures: number // VD-VISITE-AGENT
}

/** « 67, 68, 650 à 654 » → ['67', '68', '650', '651', '652', '653', '654']. */
function prefixesDe(t: string): string[] {
  return t.split(',').flatMap((x) => {
    const m = /^\s*(\d+)(?: à (\d+))?\s*$/.exec(x)
    if (!m) throw new ParametreIllisible(`VD-PREFIXES-CM : « ${x} » ne suit pas la forme attendue`)
    if (!m[2]) return [m[1]]
    const out: string[] = []
    for (let n = Number(m[1]); n <= Number(m[2]); n++) out.push(String(n))
    return out
  })
}

export function lireConsole(r: Registre): ParametresConsole {
  const kyc = lire(r, 'VD-KYC-DELAIS', 'vérification automatique en (\\d+) minutes au plus ; sinon une personne répond sous (\\d+) h ouvrées ; décision humaine après (\\d+) refus')
  const sai = lire(r, 'VD-SAISIE-ASSISTEE', `gratuite pour les (\\d+) premières boutiques de chaque zone exploitée ; ensuite ${NOMBRE} F la session`)
  const pa = lire(r, 'VD-PRIX-ANORMAL', 'sous (\\d+) % ou au-delà de (\\d+) fois le prix habituel de la catégorie : relu par une personne, jamais bloqué')
  const ph = lire(r, 'VD-PHOTOS', `(\\d+) au moins, (\\d+) au plus ; ${NOMBRE} px au moins de côté ; allégées à ${NOMBRE} px, qualité JPEG (\\d+) %`)
  const fi = lire(r, 'VD-FICHE-DELAI', `(\\d+) h ; (\\d+) h en prioritaire, pour ${NOMBRE} F la fiche`)
  const co = lire(r, 'VD-COLIS', `poids facturé = le plus grand du poids réel et du volume ÷ ${NOMBRE} ; (.+) · au-delà XXL ; mesures demandées au-delà de (\\d+) kg ou de (\\d+) cm`)
  const classes = co[2].split(' · ').map((x) => {
    const m = /^(S|M|L|XL) (\d+) kg et (\d+) cm$/.exec(x)
    if (!m) throw new ParametreIllisible(`VD-COLIS : « ${x} » ne suit pas la forme attendue`)
    return { classe: m[1], kg: Number(m[2]), cm: Number(m[3]) }
  })
  const pr = lire(r, 'VD-PREPARATION-DELAIS', '(\\d+) h par défaut ; au choix ((?:\\d+, )+\\d+) ou (\\d+) h')
  const pf = lire(r, 'VD-PREFIXES-CM', 'MTN : (.+) · Orange : (.+)')
  const ag = lire(r, 'VD-SERVICES', `photos par un agent : ${NOMBRE} F les (\\d+) produits`)
  const vi = lire(r, 'VD-VISIBILITE', "vitrine de (\\d+) jours et une vente flash le mois suivant, pour l'offre la moins chère livrée de sa zone (\\d+) jours de suite ; rien sous un Trust Score de (\\d+) ; remise de plus de (\\d+) % relue par la console")
  const de = lire(r, 'VD-DEMANDE', '(\\d+) recherches sans résultat visibles avec Free, toutes avec Boost ; (\\d+) jours glissants dans la zone')
  const si = lire(r, 'VD-SIMULATEUR', `curseur de 0 à ${NOMBRE} F de ventes par mois ; Sur-mesure dès ${NOMBRE} F`)
  return {
    lienMotDePasseMinutes: Number(lire(r, 'VD-MDP-LIEN', '(\\d+) minutes')[1]),
    kyc: { autoMinutes: Number(kyc[1]), humainHeures: Number(kyc[2]), refusMax: Number(kyc[3]) },
    preavisJours: Number(lire(r, 'VD-RESILIATION-PREAVIS', '(\\d+) jours')[1]),
    saisie: { premieresBoutiques: Number(sai[1]), prixSession: entier(sai[2]) },
    prixAnormal: { basPourCent: Number(pa[1]), hautFois: Number(pa[2]) },
    contestationHeures: Number(lire(r, 'VD-CONTESTATION-REPONSE', '(\\d+) h ouvrées, dimanche non compté')[1]),
    fileHeures: Number(lire(r, 'VD-FILE-HORS-LIGNE', '(\\d+) h')[1]),
    photos: { min: Number(ph[1]), max: Number(ph[2]), minPx: entier(ph[3]), cotePx: entier(ph[4]), qualite: Number(ph[5]) / 100 },
    fiche: { delaiH: Number(fi[1]), prioDelaiH: Number(fi[2]), prioPrix: entier(fi[3]) },
    moderationH: Number(lire(r, 'VD-MODERATION', '(\\d+) h')[1]),
    colis: { diviseur: entier(co[1]), classes, seuilKg: Number(co[3]), seuilCm: Number(co[4]) },
    etatsProduit: valeur(r, 'VD-ETATS-PRODUIT').split(',').map((x) => x.trim()),
    preparation: { defautH: Number(pr[1]), choixH: [...pr[2].split(',').map((x) => Number(x.trim())), Number(pr[3])] },
    rappelPrixJours: Number(lire(r, 'VD-RAPPEL-PRIX', '(\\d+) jours')[1]),
    prixAutoBaissePct: Number(lire(r, 'VD-PRIX-AUTO', 'baisse de (\\d+) % au plus à chaque fois, jamais sous le plancher choisi')[1]),
    doublonPourCent: Number(lire(r, 'VD-DOUBLON', '(\\d+) % de ressemblance')[1]),
    conseilCentile: Number(lire(r, 'VD-CONSEIL-PRIX', '(\\d+)e centile des prix pratiqués sur 30 jours')[1]),
    prefixes: [
      { operateur: 'MTN', prefixes: prefixesDe(pf[1]) },
      { operateur: 'Orange', prefixes: prefixesDe(pf[2]) },
    ],
    equipeMax: Number(lire(r, 'VD-EQUIPE-MAX', '(\\d+) accès employés par boutique, sur tous les plans')[1]),
    agentPhotos: { prix: entier(ag[1]), produits: Number(ag[2]) },
    visibilite: { vitrineJours: Number(vi[1]), meriteJours: Number(vi[2]), scoreMin: Number(vi[3]), remiseReluePct: Number(vi[4]) },
    demande: { visiblesFree: Number(de[1]), jours: Number(de[2]) },
    simulateur: { max: entier(si[1]), surMesureDes: entier(si[2]) },
    visiteAgentHeures: Number(lire(r, 'VD-VISITE-AGENT', '(\\d+) h ouvrées, sinon remboursement')[1]),
  }
}

export const PARAMETRES = {
  commission: lireCommission(REGISTRE),
  versements: lireVersements(REGISTRE),
  paliers: lirePaliers(REGISTRE),
  sanctions: lireSanctions(REGISTRE),
  litiges: lireLitiges(REGISTRE),
  console: lireConsole(REGISTRE),
}
