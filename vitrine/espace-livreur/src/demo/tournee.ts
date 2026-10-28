// DONNÉES DE DÉMONSTRATION — domaine « tournee » : la journée de Serge (mardi 13 oct. 2026), trois paquets enchaînés
// dans l'ordre des heures limites :
//   PQ-Z1-261013-003 tournée relais Z1 Centre-ville : A1 Tech Bastos (fait), A2 Maison Ngono (en route), A3 dépôt au Relais Bastos
//           Carrefour, A4 départs du même relais (un passage sert dans les deux sens, LIV-PAQ-03) ;
//   PQ-Z1-261013-006 course de retour : A5 Tech Bastos (les colis repris en A4) ;
//   PQ-Z1-261013-008 course à domicile (un seul client, LIV-PAQ-02) : A6 Afrik Déco (Nlongkak), A7 Solange · Bastos.
// Ce fichier est aussi le « serveur » commun des trois groupes de la tournée (LIV-05, 06, 07) : avancement de l'ordre
// imposé, garde, incidents en validation, preuves, appels masqués, journal signé des gestes (pour l'administrateur).
// Les paramètres viennent du registre seul (logique-metier/parametres-en-vigueur.json, src/calculs) ; aucun n'est
// écrit ici. Les chiffres de la journée (heures, coordonnées, codes) sont des DONNÉES.
import { ParametreAbsent, ParametreIllisible } from '../calculs/erreurs'
import { PARAMETRES, REGISTRE, lire } from '../calculs/registre'
import type { Origine, TypeArret } from '../donnees/communs'
import type { Appel, Arret, DomaineTournee, Joignable, LieuArret, PointCarte, ReglesLivreur, Tournee } from '../donnees/domaines/tournee'
import { maintenant } from './horloge'
import { h } from './jeu-essai'
import { etatSession } from './session'
import { RELAIS_DEMO, gerantVu, lotDeLArret, publier } from './pont'
import { lotPont, objetsPont } from './objets-pont'
import { scenario } from './scenario'
import { magasin, repondre } from './stockage'
import { zoneYaounde } from '../calculs/zones'

export const MINUTE_MS = 60_000
/** Distance géodésique (haversine), en mètres. */
export function distanceM(a: PointCarte, b: PointCarte): number {
  const R = 6_371_000
  const rad = (x: number) => (x * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// ---------- Paramètres ----------

// Paramètres de la tournée : registre officiel (DP-62), lus une fois avec leur forme exacte.
const parametresPaquet = async (): Promise<Record<string, string>> => REGISTRE
function nombre(p: Record<string, string>, code: string, motif = '(\\d+)'): number {
  if (!(code in p)) throw new ParametreAbsent(code)
  const m = new RegExp('^(?:' + motif + ')$').exec(p[code].trim())
  if (!m) throw new ParametreIllisible(`${code} : « ${p[code]} » ne suit pas la forme attendue`)
  return Number(m[1].replace(/[\s  ]/g, ''))
}

let regles: Promise<ReglesLivreur> | null = null
export const reglesDemo = (): Promise<ReglesLivreur> =>
  (regles ??= parametresPaquet().then((p) => {
    const places = /S (\d+) · M (\d+) · L (\d+)/.exec(p['RELAIS-PLACES'] ?? '')
    if (!places) throw new ParametreIllisible('RELAIS-PLACES')
    const c1 = /^(\d+) à (\d+)$/.exec(p['CONTROLE-C1-S'] ?? '')
    if (!c1) throw new ParametreIllisible('CONTROLE-C1-S')
    return {
      codeLongueur: nombre(p, 'CODE-LONGUEUR'),
      codeEssais: PARAMETRES.livreur.codeRemise.essais,
      codeBlocageH: PARAMETRES.livreur.codeRemise.blocageHeures,
      resteAmbreMin: nombre(p, 'TOURNEE-AMBRE-MIN'),
      resteRougeMin: nombre(p, 'TOURNEE-ROUGE-MIN'),
      attenteVendeurMin: nombre(p, 'ATTENTE-VENDEUR-MIN'),
      ecartArriveeM: nombre(p, 'ARRIVEE-ECART-M'),
      ecartRemiseM: nombre(p, 'VALIDATION-ECART-M'),
      noteMin: nombre(p, 'REFUS-NOTE-MIN'),
      depotConfirmMin: nombre(p, 'DEPOT-CONFIRM-MIN'),
      absentAttenteMin: nombre(p, 'ABSENT-ATTENTE-MIN'),
      absentAppels: nombre(p, 'ABSENT-APPELS'),
      absentIntervalleMin: nombre(p, 'ABSENT-INTERVALLE-MIN'),
      positionClienteEffaceeMin: nombre(p, 'POSITION-CLIENT-EFFACEE-MIN'),
      inspectionRetourH: Number(lire(REGISTRE, 'RET-INSPECT-H', '(\\d+) h')[1]),
      collecteAlerteH: nombre(p, 'LIV-COLLECTE-ALERTE-H'),
      routeCoupeeH: nombre(p, 'ROUTE-COUPEE-H'),
      auditMaxMin: nombre(p, 'AUDIT-C4-MIN'),
      controleS: [Number(c1[1]), Number(c1[2])],
      photoMaxKo: nombre(p, 'PHOTO-MAX-KO'),
      netteteSeuil: nombre(p, 'PHOTO-NETTETE-SEUIL'),
      plafondColis: nombre(p, 'PLAFOND-NOUVEAU', '(\\d[\\d\\s\\u202f\\u00a0]*)'),
      delaiZoneH: PARAMETRES.livreur.delaiZoneHeures,
      placesParClasse: { S: Number(places[1]), M: Number(places[2]), L: Number(places[3]) },
    }
  }))

// ---------- Lieux de la journée (données) ----------

const lieu = (lat: number, lng: number, precisionM: number, repere: string | null, plusCode: string | null, posePar: LieuArret['posePar']): LieuArret => ({ lat, lng, precisionM, repere, plusCode, posePar })
const lieuRelais = () => lieu(RELAIS_DEMO.position.lat, RELAIS_DEMO.position.lng, 10, RELAIS_DEMO.repere, RELAIS_DEMO.position.plusCode, 'relais')
export const LIEUX: Record<string, LieuArret> = {
  A1: lieu(3.8915, 11.5108, 15, 'Rue 1.750, à côté de la pharmacie Bastos', '6FR5VGR6+J8', 'vendeur'),
  A2: lieu(3.8869, 11.5162, 20, 'Face à l’ambassade de Chine, portail vert', '6FR5VGQ8+QF', 'vendeur'),
  // Le relais : position et repère du relais de démonstration commun (src/demo/pont.ts, RELAIS_DEMO).
  A3: lieuRelais(),
  A4: lieuRelais(),
  A5: lieu(3.8915, 11.5108, 15, 'Rue 1.750, à côté de la pharmacie Bastos', '6FR5VGR6+J8', 'vendeur'),
  A6: lieu(3.885, 11.517, 25, 'Nlongkak, face à la station, boutique rouge', '6FR5VGHC+2J', 'vendeur'),
  A7: lieu(3.8925, 11.5205, 120, 'Portail bleu après la boulangerie, deuxième maison à gauche', '6FR5VGVC+2C', 'client'),
  // Arrêt ajouté par le système après un échec (dépôt au relais de la zone).
  A8: lieuRelais(),
}
/** Lieu d'un arrêt : celui du jeu d'essai, sinon celui d'un paquet venu d'une commande du client (src/demo/objets-pont.ts). */
export function lieuArret(id: string): LieuArret {
  if (LIEUX[id]) return LIEUX[id]
  const l = objetsPont.lire().lieux[id]
  if (!l) return lieuRelais()
  return l.type === 'relais' ? lieuRelais() : lieu(l.lat, l.lng, 20, l.repere, null, l.type === 'domicile' ? 'client' : 'vendeur')
}
/** Le lot que dépose un arrêt de relais : celui du jeu d'essai, sinon le numéro du paquet venu du pont. */
export const lotDe = (arretId: string): string | null => lotDeLArret(arretId) ?? lotPont(arretId)
/** Contour de la zone Z1 Centre-ville (carte des zones, servi avec le paquet hors connexion). */
export const ZONES: { nom: string; contour: PointCarte[] }[] = [{ nom: 'Z1 Centre-ville', contour: zoneYaounde('Z1')!.contour }]
const DEPART: PointCarte = { lat: 3.8931, lng: 11.5079 }
// Trajet précalculé (OSRM, au départ) : points de passage entre deux arrêts.
const VIA: Record<string, PointCarte[]> = {
  A1: [{ lat: 3.8925, lng: 11.5092 }],
  A2: [{ lat: 3.8902, lng: 11.5121 }, { lat: 3.8884, lng: 11.5149 }],
  A3: [{ lat: 3.8855, lng: 11.5155 }],
  A4: [],
  A5: [{ lat: 3.8873, lng: 11.5118 }, { lat: 3.8899, lng: 11.5103 }],
  A6: [{ lat: 3.8878, lng: 11.5141 }, { lat: 3.8829, lng: 11.5178 }],
  A7: [{ lat: 3.8853, lng: 11.5199 }, { lat: 3.8902, lng: 11.5212 }],
  A8: [{ lat: 3.8889, lng: 11.5181 }],
}

// ---------- État ----------

type ArretEtat = Omit<Arret, 'lieu' | 'colis' | 'classes'> & { colis: number; classes: Arret['classes'] }
interface EtatTournee {
  id: string
  paquetId: string
  arrets: ArretEtat[]
  enCours: string | null
  paquets: Tournee['paquets']
  incident: Tournee['incident']
  modification: Tournee['modification']
  jour: Tournee['jour']
  remisesA: Record<string, number> // arrêt à domicile → heure de remise (purge de la position)
  routes: { note: string; jusqua: number }[]
  preuves: number
  appels: Appel[]
  journal: { quand: number; geste: string; objet: string; cle: string; heureTel: number; position: PointCarte | null }[]
}

const arret = (id: string, ordre: number, paquetId: string, type: TypeArret, nom: string, avant: number, etat: Arret['etat'], colis: number, classes: Arret['classes'], pretDepuis: number | null): ArretEtat => ({
  id,
  ordre,
  paquetId,
  type,
  nom,
  quartier: 'Bastos',
  zone: 'Z1 Centre-ville',
  avant,
  etat,
  phase: etat === 'en_cours' ? 'en_route' : null,
  arriveeA: etat === 'fait' ? h(13, 38) : null,
  colis,
  classes,
  pretDepuis,
  etape: etat === 'fait' ? 4 : 0,
})

export const etatTournee = magasin<EtatTournee>('tournee', () => tourneeDuJour())
function tourneeDuJour(): EtatTournee {
  const t = tourneeInitiale()
  // Journée sans paquet (?demo=aucun_paquet) : la tournée du jour est finie, rien n'est en cours.
  if (scenario() !== 'aucun_paquet') return t
  return { ...t, enCours: null, paquets: t.paquets.map((p) => ({ ...p, etat: 'termine' })), arrets: t.arrets.map((a) => ({ ...a, etat: 'fait', phase: null, etape: 4, arriveeA: a.arriveeA ?? a.avant })) }
}
const tourneeInitiale = (): EtatTournee => ({
  id: 'T-0412',
  paquetId: 'PQ-Z1-261013-003',
  enCours: 'A2',
  paquets: [
    { id: 'PQ-Z1-261013-003', nature: 'relais', heureLimite: h(16, 20), colisTotal: 4, etat: 'en_cours' },
    { id: 'PQ-Z1-261013-006', nature: 'retour', heureLimite: h(17, 30), colisTotal: 2, etat: 'a_venir' },
    { id: 'PQ-Z1-261013-008', nature: 'domicile', heureLimite: h(18, 0), colisTotal: 1, etat: 'a_venir' },
  ],
  arrets: [
    arret('A1', 1, 'PQ-Z1-261013-003', 'ramassage', 'Tech Bastos', h(13, 30), 'fait', 2, { S: 1, M: 1 }, h(11, 20)),
    arret('A2', 2, 'PQ-Z1-261013-003', 'ramassage', 'Maison Ngono', h(14, 30), 'en_cours', 2, { S: 1, M: 1 }, h(13, 53)),
    arret('A3', 3, 'PQ-Z1-261013-003', 'relais', RELAIS_DEMO.nom, h(15, 15), 'a_faire', 4, { S: 2, M: 2 }, null),
    arret('A4', 4, 'PQ-Z1-261013-003', 'collecte', RELAIS_DEMO.nom, h(15, 25), 'a_faire', 2, { S: 1, M: 1 }, null),
    arret('A5', 5, 'PQ-Z1-261013-006', 'retour', 'Tech Bastos', h(16, 0), 'a_faire', 2, { S: 1, M: 1 }, null),
    arret('A6', 6, 'PQ-Z1-261013-008', 'ramassage', 'Afrik Déco', h(16, 40), 'a_faire', 1, { M: 1 }, h(14, 0)),
    arret('A7', 7, 'PQ-Z1-261013-008', 'domicile', 'Solange', h(17, 20), 'a_faire', 1, { M: 1 }, null),
  ],
  incident: null,
  modification: null,
  jour: { paquetsTermines: 2, colisRemis: 4 }, // PQ-Z1-261013-001 (4 colis déposés au relais) et -010 (retour rendu)
  remisesA: {},
  routes: [],
  preuves: 0,
  appels: [],
  journal: [],
})

/** Journal signé des gestes (clé d'idempotence, heure serveur, heure et position du téléphone) : l'administrateur
 * le contrôle ; rejouer une clé n'a aucun effet (la clé déjà vue est ignorée). */
export function journaliser(geste: string, objet: string, o: Origine): boolean {
  if (etatTournee.lire().journal.some((j) => j.cle === o.cle)) return false
  etatTournee.ecrire((t) => void t.journal.push({ quand: maintenant(), geste, objet, cle: o.cle, heureTel: o.heure, position: o.position ? { lat: o.position.lat, lng: o.position.lng } : null }))
  return true
}

/** Colis sous la garde du livreur : la session (pastille de l'en-tête) en est la seule valeur. */
export const garde = () => etatSession.lire().colisSousGarde
export const changerGarde = (delta: number) => etatSession.ecrire((s) => void (s.colisSousGarde = Math.max(0, s.colisSousGarde + delta)))

export const arretDe = (id: string) => etatTournee.lire().arrets.find((a) => a.id === id) ?? null
export function etape(arretId: string, n: number) {
  etatTournee.ecrire((t) => {
    const a = t.arrets.find((x) => x.id === arretId)
    if (a && a.etape < n) a.etape = n
  })
}
export function modifier(texte: string, valeurs: Record<string, string | number> = {}) {
  etatTournee.ecrire((t) => void (t.modification = { texte, valeurs, quand: maintenant() }))
}
export function changerColis(arretId: string, delta: number) {
  etatTournee.ecrire((t) => {
    const a = t.arrets.find((x) => x.id === arretId)
    if (a) a.colis = Math.max(0, a.colis + delta)
  })
}

/** L'arrêt est terminé (fait, en échec ou dissocié) : l'ordre imposé passe au suivant, le paquet se ferme au besoin. */
export function terminerArret(arretId: string, etat: 'fait' | 'echec' | 'dissocie', colisRemis = 0) {
  // L'entreprise suit l'arrêt dans ses missions (src/demo/pont.ts).
  const paquetId = etatTournee.lire().arrets.find((x) => x.id === arretId)?.paquetId
  if (paquetId) publier({ type: 'arret', paquetId, arretId, etat }, `arret-${arretId}-${etat}`, maintenant())
  etatTournee.ecrire((t) => {
    const a = t.arrets.find((x) => x.id === arretId)
    if (!a) return
    a.etat = etat
    a.phase = null
    if (etat === 'fait') a.etape = Math.max(a.etape, 4)
    if (a.type === 'domicile') t.remisesA[a.id] = maintenant()
    t.jour.colisRemis += colisRemis
    // Une remise à domicile dont le ramassage n'a rien donné est retirée par le système.
    for (const d of t.arrets.filter((x) => x.type === 'domicile' && x.etat === 'a_faire')) {
      const ramasse = t.arrets.find((x) => x.paquetId === d.paquetId && x.type === 'ramassage')
      if (ramasse && (ramasse.etat === 'echec' || ramasse.etat === 'dissocie')) {
        d.etat = 'dissocie'
        t.modification = { texte: 'La remise à domicile est retirée : le colis n’a pas été ramassé. La cliente est prévenue par BelivaY.', valeurs: {}, quand: maintenant() }
      }
    }
    for (const p of t.paquets) {
      const restants = t.arrets.filter((x) => x.paquetId === p.id && (x.etat === 'a_faire' || x.etat === 'en_cours'))
      if (p.etat === 'en_cours' && restants.length === 0) {
        p.etat = 'termine'
        t.jour.paquetsTermines += 1
      }
    }
    const prochain = t.arrets.find((x) => x.etat === 'a_faire') ?? null
    t.enCours = prochain?.id ?? null
    if (prochain) {
      prochain.etat = 'en_cours'
      prochain.phase = 'en_route'
      t.paquetId = prochain.paquetId
      const p = t.paquets.find((x) => x.id === prochain.paquetId)
      if (p && p.etat === 'a_venir') p.etat = 'en_cours'
    }
  })
  // Le relais voit le livreur en approche dès que l'arrêt qui précède son dépôt est fini (heure estimée : celle de l'arrêt).
  const suivant = arretDe(etatTournee.lire().enCours ?? '')
  const lot = suivant?.type === 'relais' ? lotDe(suivant.id) : null
  if (suivant && lot) publier({ type: 'courier.approaching', lot, arretId: suivant.id, arriveeEstimee: suivant.avant }, `courier.approaching-${suivant.id}`, maintenant())
}

/**
 * Un paquet affecté depuis une commande du client (pont commun) entre dans la tournée quand le livreur part : ses arrêts
 * suivent ceux du jour, dans l'ordre ; s'il n'y a plus rien en cours, son premier arrêt devient l'arrêt en cours.
 */
export function ajouterPaquetPont(p: { id: string; nature: Tournee['paquets'][number]['nature']; heureLimite: number }, arrets: { id: string; type: TypeArret; nom: string; quartier: string; colis: number; classes: Arret['classes']; pretDepuis: number | null; trajetMin: number }[]) {
  etatTournee.ecrire((t) => {
    if (t.paquets.some((x) => x.id === p.id)) return
    const libre = !t.enCours
    t.paquets.push({ id: p.id, nature: p.nature, heureLimite: p.heureLimite, colisTotal: arrets.find((a) => a.type === 'ramassage')?.colis ?? arrets[0]?.colis ?? 0, etat: libre ? 'en_cours' : 'a_venir' })
    let quand = maintenant()
    for (const a of arrets) {
      quand += a.trajetMin * MINUTE_MS
      t.arrets.push({ ...arret(a.id, t.arrets.length + 1, p.id, a.type, a.nom, quand, 'a_faire', a.colis, a.classes, a.pretDepuis), quartier: a.quartier })
    }
    if (libre) {
      const premier = t.arrets.find((x) => x.paquetId === p.id)!
      Object.assign(premier, { etat: 'en_cours', phase: 'en_route' })
      t.enCours = premier.id
      t.paquetId = p.id
    }
  })
}

/** Le système ajoute un dépôt au relais de la zone (échec à domicile, retour impossible) : aucun colis ne reste sur
 * le livreur. L'arrêt A8 prend la suite dans l'ordre imposé. */
export function ajouterDepotRelais(paquetId: string, colis: number, classes: Arret['classes']) {
  etatTournee.ecrire((t) => {
    if (t.arrets.some((a) => a.id === 'A8')) return
    t.arrets.push({ ...arret('A8', t.arrets.length + 1, paquetId, 'relais', RELAIS_DEMO.nom, maintenant(), 'a_faire', colis, classes, null), etape: 0 })
  })
}

/** Incident ouvert par un écran de terrain : enregistré aussi au domaine « incidents » (un seul dossier, même numéro,
 * suivi dans LIV-P21) ; les deux fonctions sont posées par src/demo/incidents.ts (pas d'import croisé). */
export const INCIDENTS_TERRAIN: {
  enregistrer: ((x: { famille: string; type: string; note: string; arretId: string | null }) => string) | null
  valider: ((id: string) => void) | null
} = { enregistrer: null, valider: null }

/** Incident bloquant : la tournée attend la décision de l'entreprise (à défaut, l'opérateur de zone). */
export function ouvrirIncident(titre: string, consequence: string, valeurs: Record<string, string | number>, arretId: string | null, nature?: { famille: string; type: string }) {
  const id = (nature && INCIDENTS_TERRAIN.enregistrer?.({ ...nature, note: titre, arretId })) || 'IN-' + String(etatTournee.lire().journal.length + 200)
  etatTournee.ecrire((t) => void (t.incident = { id, titre, consequence: { texte: consequence, valeurs }, depuis: maintenant(), arretId }))
}

/** Décision de l'entreprise sur l'incident de la tournée : levé, arrêt dissocié, la tournée reprend. */
export function leverIncident(id: string) {
  const t = etatTournee.lire()
  if (!t.incident || t.incident.id !== id) return
  const arretId = t.incident.arretId
  etatTournee.ecrire((x) => {
    x.incident = null
    x.modification = { texte: 'Incident validé par {entreprise} : l’arrêt est dissocié, les colis attendus sont recalculés. La tournée reprend.', valeurs: { entreprise: 'Yafé Express' }, quand: maintenant() }
  })
  if (arretId) {
    const a = arretDe(arretId)
    if (a && (a.etat === 'en_cours' || a.etat === 'echec')) {
      etatTournee.ecrire((x) => void (x.arrets.find((y) => y.id === arretId)!.etat = 'en_cours'))
      terminerArret(arretId, 'dissocie')
    }
  }
}

/** Arrêts qui doivent précéder un dépôt : les ramassages de son paquet (relais, domicile) ; pour un retour, les
 * collectes qui le précèdent (les colis repris au relais). Un ramassage ou une collecte n'attend rien. */
export function prealables(arrets: Pick<Arret, 'id' | 'ordre' | 'type' | 'paquetId' | 'etat' | 'nom'>[], a: Pick<Arret, 'ordre' | 'type' | 'paquetId'>) {
  if (a.type === 'ramassage' || a.type === 'collecte') return []
  return arrets.filter((x) => x.ordre < a.ordre && (a.type === 'retour' ? x.type === 'collecte' : x.type === 'ramassage' && x.paquetId === a.paquetId))
}

export function positionSimulee(t: EtatTournee): PointCarte {
  const en = t.arrets.find((a) => a.id === t.enCours)
  if (en?.phase === 'sur_place') return lieuArret(en.id)
  const faits = t.arrets.filter((a) => a.etat !== 'a_faire' && a.etat !== 'en_cours')
  return faits.length ? lieuArret(faits[faits.length - 1].id) : DEPART
}

function trajetDe(t: EtatTournee): PointCarte[] {
  const pts: PointCarte[] = [DEPART]
  for (const a of t.arrets) pts.push(...(VIA[a.id] ?? []), lieuArret(a.id))
  return pts
}

const routeDe: Record<TypeArret, string> = { ramassage: 'arrivee', relais: 'depot-relais', collecte: 'collecte', domicile: 'domicile', retour: 'retour-vendeur' }
export const ecranArret = (type: TypeArret) => routeDe[type]

const ouvertA = (t: EtatTournee, type: TypeArret[]) => {
  const a = t.arrets.find((x) => x.id === t.enCours)
  return a && type.includes(a.type) ? a : null
}

export const demoTournee: DomaineTournee = {
  courante() {
    const t = etatTournee.lire()
    const now = maintenant()
    return reglesDemo().then((r) => {
      // Domicile : la position de remise n'est servie que pendant l'arrêt en cours, puis jusqu'à la purge qui suit la remise.
      const servi = (a: ArretEtat) => a.type !== 'domicile' || a.id === t.enCours || (t.remisesA[a.id] !== undefined && now - t.remisesA[a.id] < r.positionClienteEffaceeMin * MINUTE_MS)
      const v: Tournee = {
        id: t.id,
        paquetId: t.paquetId,
        paquets: t.paquets,
        enCours: t.enCours,
        etat: t.incident ? 'bloquee' : t.enCours ? 'en_cours' : 'terminee',
        incident: t.incident,
        modification: t.modification,
        colisSousGarde: garde(),
        plafondColis: r.plafondColis,
        entreprise: 'Yafé Express',
        telechargeeA: h(12, 58),
        trajet: trajetDe(t),
        zones: ZONES,
        position: { ...positionSimulee(t), precisionM: 12 },
        jour: t.jour,
        arrets: t.arrets.map((a) => ({ ...a, lieu: servi(a) ? lieuArret(a.id) : null })),
      }
      return repondre(v)
    })
  },
  regles: () => reglesDemo().then(repondre),
  itineraire(arretId) {
    const t = etatTournee.lire()
    if (arretId !== t.enCours) return repondre(null)
    const de = positionSimulee(t)
    const trajet = [de, ...(t.arrets.find((a) => a.id === arretId)?.phase === 'sur_place' ? [] : (VIA[arretId] ?? [])), lieuArret(arretId)]
    let d = 0
    for (let i = 1; i < trajet.length; i++) d += distanceM(trajet[i - 1], trajet[i])
    // Vitesse moyenne d'une moto en ville retenue par le calcul d'itinéraire de la démonstration (OSRM en production).
    const VITESSE_MS = 6
    const dureeS = Math.round(d / VITESSE_MS)
    // En route vers la cliente d'une commande du pont : elle suit le livreur en direct (heure estimée, appel masqué).
    const a = t.arrets.find((x) => x.id === arretId)
    const l = objetsPont.lire().lieux[arretId]
    if (a && l?.type === 'domicile' && a.phase !== 'sur_place') {
      const colis = Object.entries(objetsPont.lire().colis).filter(([, c]) => c.paquetId === a.paquetId).map(([id]) => id)
      publier({ type: 'home.departed', paquet: a.paquetId, colis, arriveeEstimee: maintenant() + dureeS * 1000 }, 'home.departed-' + arretId, maintenant())
    }
    return repondre({ arretId, distanceM: Math.round(d), dureeS, trajet })
  },
  async arriver(arretId, o, confirme) {
    const t = etatTournee.lire()
    const r = await reglesDemo()
    if (arretId !== t.enCours) return repondre({ ok: false as const, raison: 'ordre_impose' as const })
    const a = t.arrets.find((x) => x.id === arretId)!
    if (a.phase === 'sur_place') return repondre({ ok: true as const, route: ecranArret(a.type) })
    if ((a.type === 'relais' || a.type === 'collecte') && t.arrets.some((x) => x.paquetId === a.paquetId && x.type === 'ramassage' && x.etat === 'echec'))
      return repondre({ ok: false as const, raison: 'colis_manquants' as const })
    const ecart = o.position ? Math.round(distanceM(o.position, lieuArret(arretId))) : null
    if (ecart !== null && ecart > r.ecartArriveeM && !confirme) return repondre({ ok: false as const, raison: 'ecart_position' as const, ecartM: ecart })
    if (!journaliser('arrivee', arretId, o)) return repondre({ ok: true as const, route: ecranArret(a.type) })
    etatTournee.ecrire((x) => {
      const b = x.arrets.find((y) => y.id === arretId)!
      b.phase = 'sur_place'
      b.arriveeA = maintenant()
      b.etape = Math.max(b.etape, 1)
    })
    window.dispatchEvent(new CustomEvent('blv:arrivee', { detail: { arretId } }))
    // Arrêt d'un paquet venu d'une commande du client : le vendeur voit « Votre livreur est là », l'entreprise la position.
    const o2 = objetsPont.lire()
    if (a.type === 'ramassage' && o2.lieux[arretId])
      publier({ type: 'courier.arrived', paquet: a.paquetId, arret: arretId, colis: Object.entries(o2.colis).filter(([, c]) => c.paquetId === a.paquetId).map(([id]) => id) }, 'courier.arrived-' + arretId, maintenant())
    return repondre({ ok: true as const, route: ecranArret(a.type), ...(ecart !== null && ecart > r.ecartArriveeM ? { ecartM: ecart } : {}) })
  },
  async signalerRoute(note, o) {
    const r = await reglesDemo()
    if (note.trim().length < r.noteMin) return repondre({ ok: false as const, raison: 'note_trop_courte' as const })
    const jusqua = maintenant() + r.routeCoupeeH * 60 * MINUTE_MS
    journaliser('route_coupee', note.trim(), o)
    etatTournee.ecrire((t) => void t.routes.push({ note: note.trim(), jusqua }))
    return repondre({ ok: true as const, jusqua })
  },
  async deposerPreuve(p, o) {
    const r = await reglesDemo()
    if (!p.nette) return repondre({ ok: false as const, raison: 'floue' as const })
    if (p.octets > r.photoMaxKo * 1024) return repondre({ ok: false as const, raison: 'trop_lourde' as const })
    if (journaliser('preuve:' + p.nature, p.objet, o)) publier({ type: 'preuve', paquetId: etatTournee.lire().paquetId, objet: p.objet, nature: p.nature }, 'preuve-' + o.cle, o.heure)
    const e = etatTournee.ecrire((t) => void (t.preuves += 1))
    return repondre({ ok: true as const, id: 'PH-' + String(e.preuves).padStart(4, '0') })
  },
  joignables() {
    const t = etatTournee.lire()
    const vendeur = ouvertA(t, ['ramassage', 'retour'])
    const relais = ouvertA(t, ['relais', 'collecte'])
    const client = ouvertA(t, ['domicile'])
    const j: Joignable[] = [
      { correspondant: 'client', nom: client ? client.nom + ' · ' + client.quartier : 'Client', arretId: client?.id ?? null, ouvert: !!client },
      { correspondant: 'vendeur', nom: vendeur?.nom ?? 'Vendeur', arretId: vendeur?.id ?? null, ouvert: !!vendeur },
      { correspondant: 'relais', nom: relais ? gerantVu() + ' · ' + relais.nom : 'Point relais', arretId: relais?.id ?? null, ouvert: !!relais },
      { correspondant: 'entreprise', nom: 'Yafé Express · répartition', arretId: null, ouvert: true },
      { correspondant: 'support', nom: 'Support livreur BelivaY', arretId: null, ouvert: true },
    ]
    return repondre(j)
  },
  appels: () => repondre([...etatTournee.lire().appels].reverse()),
  async appeler(correspondant, mode, o, modele) {
    const j = (await demoTournee.joignables()).find((x) => x.correspondant === correspondant)
    if (!j?.ouvert) return repondre({ ok: false as const, raison: 'hors_mission' as const })
    const ecrit = mode === 'sms' || mode === 'whatsapp'
    const appel: Appel = { id: 'AP-' + o.cle.slice(0, 8), correspondant, nom: j.nom, arretId: j.arretId, mode, debut: maintenant(), fin: ecrit ? maintenant() : null, modele: ecrit ? (modele ?? null) : null }
    if (!journaliser('appel:' + mode, correspondant, o)) return repondre({ ok: true as const, appel })
    etatTournee.ecrire((t) => {
      for (const a of t.appels) if (a.fin === null) a.fin = maintenant()
      t.appels.push(appel)
    })
    return repondre({ ok: true as const, appel })
  },
  raccrocher(appelId, o) {
    journaliser('raccrocher', appelId, o)
    etatTournee.ecrire((t) => {
      const a = t.appels.find((x) => x.id === appelId)
      if (a && a.fin === null) a.fin = maintenant()
    })
    return repondre({ ok: true as const })
  },
  async prioriser(arretId, o) {
    const t = etatTournee.lire()
    const a = t.arrets.find((x) => x.id === arretId)
    const cour = t.arrets.find((x) => x.id === t.enCours)
    if (!a || (a.etat !== 'a_faire' && a.etat !== 'en_cours')) return repondre({ ok: false as const, raison: 'termine' as const })
    if (a.id === t.enCours) return repondre({ ok: false as const, raison: 'deja_en_cours' as const })
    if (cour?.phase === 'sur_place') return repondre({ ok: false as const, raison: 'sur_place' as const, avant: cour.nom })
    const manque = prealables(t.arrets, a).find((x) => x.etat === 'a_faire' || x.etat === 'en_cours')
    if (manque) return repondre({ ok: false as const, raison: 'ramassage_avant' as const, avant: manque.nom })
    if (journaliser('ordre', arretId, o)) {
      etatTournee.ecrire((x) => {
        const b = x.arrets.find((y) => y.id === arretId)!
        const c = x.arrets.find((y) => y.id === x.enCours)
        const reste = x.arrets.filter((y) => y.id !== arretId)
        const i = c ? reste.indexOf(c) : reste.findIndex((y) => y.etat === 'a_faire')
        reste.splice(i < 0 ? reste.length : i, 0, b)
        reste.forEach((y, k) => void (y.ordre = k + 1))
        x.arrets = reste
        if (c) Object.assign(c, { etat: 'a_faire', phase: null })
        Object.assign(b, { etat: 'en_cours', phase: 'en_route' })
        x.enCours = b.id
        x.paquetId = b.paquetId
        const p = x.paquets.find((q) => q.id === b.paquetId)
        if (p && p.etat === 'a_venir') p.etat = 'en_cours'
        x.modification = { texte: 'Ordre changé : {nom} d’abord. {entreprise} est prévenue ; les autres arrêts suivent.', valeurs: { nom: b.type === 'domicile' ? b.quartier : b.nom, entreprise: 'Yafé Express' }, quand: maintenant() }
      })
      publier({ type: 'ordre', paquetId: a.paquetId, arretId, ordre: etatTournee.lire().arrets.map((x) => x.id) }, 'ordre-' + o.cle, maintenant())
    }
    return repondre({ ok: true as const, ordre: etatTournee.lire().arrets.map((x) => x.id) })
  },
  async annoncerRetard(arretId, minutes, o) {
    const t = etatTournee.lire()
    const a = t.arrets.find((x) => x.id === arretId)
    if (!a || arretId !== t.enCours) return repondre({ ok: false as const, raison: 'hors_mission' as const })
    const arriveeEstimee = Math.max(a.avant, maintenant()) + minutes * MINUTE_MS
    if (journaliser('retard', arretId, o)) {
      etatTournee.ecrire((x) => void (x.arrets.find((y) => y.id === arretId)!.avant = arriveeEstimee))
      publier({ type: 'retard', paquetId: a.paquetId, arretId, minutes, arriveeEstimee }, 'retard-' + o.cle, maintenant())
      // Client d'une commande à domicile : sa nouvelle heure d'arrivée (« En route », suivi en direct).
      if (a.type === 'domicile') {
        const colis = Object.entries(objetsPont.lire().colis).filter(([, c]) => c.paquetId === a.paquetId).map(([id]) => id)
        publier({ type: 'home.departed', paquet: a.paquetId, colis, arriveeEstimee }, 'home.delayed-' + o.cle, maintenant())
      }
    }
    return repondre({ ok: true as const, arriveeEstimee })
  },
  async simulerValidationIncident() {
    const id = etatTournee.lire().incident?.id
    if (!id) return
    leverIncident(id)
    INCIDENTS_TERRAIN.valider?.(id)
  },
}
