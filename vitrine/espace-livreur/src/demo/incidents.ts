// DONNÉES DE DÉMONSTRATION — domaine « incidents » : catalogue des six familles (LIV-08-R13, LIV-RG-R172/R173), et
// l'entreprise et le système simulés (ce que feraient ENT-P14 et la console) :
// - Yafé Express reçoit l'incident aussitôt et décide DECISION_S secondes plus tard (démonstration) ; elle refuse
//   « Relais saturé » (le relais a encore de la place), valide le reste ; sans décision à l'échéance de
//   LIV-INCIDENT-VALID-MIN, l'opérateur de zone BelivaY décide (règle du serveur, gardée ici) ;
// - validé : « Boutique fermée » dissocie l'arrêt (le système, jamais le livreur) ; une panne avec des colis sous garde
//   ouvre le transfert au remplaçant (un colis repris toutes les REPRISE_S secondes, à chaque scan) ; une notification
//   « Sécurité et incidents » part au livreur.
// Photos exigées par type : paramètre incident_photos_required du paquet (1 pour un lieu fermé, 2 pour un colis abîmé
// ou un scellé rompu, 0 pour la sécurité) ; délai de route recalculé : estimation du serveur (donnée de démonstration).
import { PARAMETRES } from '../calculs/registre'
import type { CatalogueIncidents, DomaineIncidents, FamilleIncident, Incident, TypeIncident } from '../donnees/domaines/incidents'
import { demoDisponibilite } from './disponibilite'
import { REJOUEURS, demoHorsLigne, entier, journaliserEnvoye } from './horsligne'
import { maintenant } from './horloge'
import { COLIS, h } from './jeu-essai'
import { etatNotifications } from './notifications'
import { etatSession } from './session'
import { INCIDENTS_TERRAIN, etatTournee, leverIncident } from './tournee'
import { RELAIS_DEMO, evenementsDe, publier } from './pont'
import { magasin, repondre } from './stockage'

const DECISION_S = 30
const REPRISE_S = 20
const DELAI_ROUTE_MIN = 20
const ENTREPRISE = 'Yafé Express'
const REMPLACANT = { prenom: 'Junior', initiales: 'JM', vehicule: 'Moto' }

const ty = (id: string, titre: string, bloquant: boolean, photos: number, transfert = false): TypeIncident => ({ id, titre, bloquant, photos, transfert })

const FAMILLES: FamilleIncident[] = [
  {
    id: 'vendeur',
    titre: 'Chez le vendeur',
    icone: 'store',
    exemples: 'Pas prêt, absent, boutique fermée, colis abîmé, refus du contrôle',
    consequence: 'Relance ou dissociation par le système',
    prevenus: '{entreprise} et le vendeur, relancé aussitôt par une notification et un appel masqué.',
    tournee: 'Le système relance le vendeur, puis repasse ou dissocie l’arrêt : vous ne dissociez rien.',
    scores: 'Aucun effet sur votre Ponctualité : le retard du vendeur ne vous est pas compté.',
    route: null,
    types: [ty('pas_pret', 'Pas prêt', false, 1), ty('absent', 'Vendeur absent', false, 1), ty('boutique_fermee', 'Boutique fermée', true, 1), ty('colis_abime_vendeur', 'Colis abîmé', false, 2), ty('refus_controle', 'Refus du contrôle', false, 1), ty('code_bloque', 'Code de remise bloqué', true, 0), ty('adresse_introuvable', 'Adresse introuvable', false, 1)],
  },
  {
    id: 'route',
    titre: 'En route',
    icone: 'route',
    exemples: 'Panne, crevaison, accident, malaise, batterie vide, route coupée, pluie forte, contrôle routier',
    consequence: 'Délai recalculé, transfert possible',
    prevenus: '{entreprise} ; les clients, sous {min} min, si l’heure limite ne tient plus.',
    tournee: 'Le délai est recalculé ; avec des colis sur vous, {entreprise} désigne un remplaçant qui les reprend un par un, par scan.',
    scores: 'Un incident validé n’a aucun effet sur votre Ponctualité.',
    route: null,
    types: [
      ty('panne', 'Panne', true, 1, true),
      ty('crevaison', 'Crevaison', true, 1, true),
      ty('accident', 'Accident', true, 0, true),
      ty('malaise', 'Malaise', true, 0, true),
      ty('batterie_vide', 'Batterie vide', true, 1, true),
      ty('route_coupee', 'Route coupée', false, 1),
      ty('pluie_forte', 'Pluie forte', false, 0),
      ty('controle_routier', 'Contrôle routier', false, 1),
    ],
  },
  {
    id: 'relais',
    titre: 'Au relais',
    icone: 'warehouse',
    exemples: 'Relais fermé, gérant absent, relais saturé, scan impossible',
    consequence: 'Relais de secours ou retour au point de stockage',
    prevenus: '{entreprise}, le relais et le support BelivaY.',
    tournee: 'Le système désigne un relais de secours ou le retour au point de stockage ; les colis restent sous votre garde, pochettes fermées.',
    scores: 'Si le relais est en faute, l’incident compte sur son score, jamais sur le vôtre.',
    route: null,
    types: [ty('relais_ferme', 'Relais fermé', true, 1), ty('gerant_absent', 'Gérant absent', true, 1), ty('relais_sature', 'Relais saturé', true, 1), ty('scan_impossible', 'Scan impossible', true, 1)],
  },
  {
    id: 'domicile',
    titre: 'À domicile',
    icone: 'home',
    exemples: 'Client absent, injoignable, adresse introuvable, refus du colis',
    consequence: 'Suite prévue par l’échec de remise',
    prevenus: 'Le client, dans son application, et {entreprise}.',
    tournee: 'Le colis part au relais de la zone ; le client y reçoit son code de retrait.',
    scores: 'Aucun effet quand l’attente et les deux appels masqués sont faits.',
    route: 'echec-domicile',
    types: [],
  },
  {
    id: 'colis',
    titre: 'Sur le colis',
    icone: 'package',
    exemples: 'Colis manquant, scellé rompu, colis mouillé, étiquette arrachée, perdu, volé',
    consequence: 'Constat photo, responsabilité selon les preuves',
    prevenus: '{entreprise} et la console BelivaY ; perte ou vol : dossier ouvert aussitôt.',
    tournee: 'Les colis attendus sont recalculés ; s’il en manque un, le départ vers le relais attend la décision.',
    scores: 'La responsabilité suit les preuves : vos photos de contrôle vous protègent.',
    route: null,
    types: [ty('colis_manquant', 'Colis manquant', true, 1), ty('scelle_rompu', 'Scellé rompu', false, 2), ty('colis_mouille', 'Colis mouillé', false, 2), ty('etiquette_arrachee', 'Étiquette arrachée', false, 1), ty('perdu', 'Colis perdu', true, 0), ty('vole', 'Colis volé', true, 0), ty('emballage_manquant', 'Emballage manquant', false, 0)],
  },
  {
    id: 'securite',
    titre: 'Sécurité',
    icone: 'shield-alert',
    exemples: 'Agression, menace, lieu dangereux, accident avec blessé',
    consequence: 'SOS, aucune pression',
    prevenus: '{entreprise}, puis le support BelivaY ; dossier Sécurité ouvert à la console.',
    tournee: 'Aucune pression pour finir la tournée. Ne résistez jamais : aucun colis ne vaut votre sécurité.',
    scores: 'Aucune pénalité ; une perte se règle entre BelivaY, {entreprise} et son assurance, jamais sur vous.',
    route: null,
    types: [ty('agression', 'Agression', true, 0), ty('menace', 'Menace', true, 0), ty('lieu_dangereux', 'Lieu dangereux', true, 0), ty('accident_blesse', 'Accident avec blessé', true, 0)],
  },
]

const catalogue = (): CatalogueIncidents => ({
  familles: FAMILLES,
  noteMin: entier('LIV-INCIDENT-NOTE-MIN'),
  validationMin: entier('LIV-INCIDENT-VALID-MIN'),
  clientPrevenuMin: PARAMETRES.livreur.incidentNotificationMin,
  photoMaxKo: entier('LIV-PHOTO-POIDS-KO'),
  photosMax: 2,
})
const typeDe = (famille: string, type: string) => FAMILLES.find((f) => f.id === famille)?.types.find((x) => x.id === type) ?? null

type Garde = Omit<Incident, 'chronologie' | 'ajustement'> & { ajustement: Incident['ajustement']; gardeRendue: boolean }

const BASTOS = { lat: 3.8899, lng: 11.5121, precisionM: 9 }
export const etatIncidents = magasin<Garde[]>('incidents', () => [
  {
    id: 'IN-114',
    famille: 'route',
    type: 'pluie_forte',
    note: 'Forte pluie sur la montée de Bastos, je roule au pas avec les colis protégés.',
    photos: 0,
    cree: h(11, 48),
    recu: h(11, 48) + 3000,
    arret: null,
    position: BASTOS,
    bloquant: false,
    etat: 'enregistre',
    echeance: null,
    decision: null,
    ajustement: null,
    transfert: null,
    gardeRendue: true,
  },
  // Tournée du matin (PQ-Z1-261013-001) : vendeur pas prêt (attente courte, sans effet), puis gérante du relais absente
  // à l'arrivée (bloquant, validé par Yafé Express : dépôt fait au retour de la gérante).
  {
    id: 'IN-113',
    famille: 'relais',
    type: 'gerant_absent',
    note: 'Gérante partie à la banque, boutique ouverte par son neveu qui ne peut pas scanner. Elle revient dans 10 min.',
    photos: 1,
    cree: h(10, 41),
    recu: h(10, 41) + 4000,
    arret: { id: 'M3', ordre: 3, nom: RELAIS_DEMO.nom },
    position: { lat: 3.8842, lng: 11.5139, precisionM: 8 },
    bloquant: true,
    etat: 'valide',
    echeance: h(10, 56),
    decision: { par: 'entreprise', nom: 'Gaëlle · Yafé Express', a: h(10, 47), motif: 'Attendre la gérante : dépôt au relais à son retour.' },
    ajustement: null,
    transfert: null,
    gardeRendue: true,
  },
  {
    id: 'IN-111',
    famille: 'vendeur',
    type: 'pas_pret',
    note: 'Les deux colis ne sont pas encore emballés par la vendeuse, elle annonce 10 minutes.',
    photos: 0,
    cree: h(9, 34),
    recu: h(9, 34) + 3000,
    arret: { id: 'M2', ordre: 2, nom: 'Bastos Mode' },
    position: { lat: 3.8901, lng: 11.5131, precisionM: 11 },
    bloquant: false,
    etat: 'enregistre',
    echeance: null,
    decision: null,
    ajustement: null,
    transfert: null,
    gardeRendue: true,
  },
])

/** Avance l'entreprise simulée : décision, ajustement, transfert ; écrit seulement si quelque chose change. */
function avancer(t: number) {
  const liste = etatIncidents.lire()
  const aDecider = liste.filter((i) => i.etat === 'en_attente' && i.recu !== null && t >= Math.min(i.recu + DECISION_S * 1000, i.echeance ?? Infinity))
  const aTransferer = liste.filter((i) => i.transfert && !i.gardeRendue && i.transfert.colis.some((c) => c.reprisA === null && i.decision && t >= i.decision.a + (i.transfert!.colis.indexOf(c) + 1) * REPRISE_S * 1000))
  if (!aDecider.length && !aTransferer.length) return
  etatIncidents.ecrire((l) => {
    for (const i of l) {
      if (i.etat === 'en_attente' && i.recu !== null && t >= Math.min(i.recu + DECISION_S * 1000, i.echeance ?? Infinity)) decider(i, t)
      if (i.transfert && i.decision && !i.gardeRendue) {
        i.transfert.colis.forEach((c, k) => {
          if (c.reprisA === null && t >= i.decision!.a + (k + 1) * REPRISE_S * 1000) c.reprisA = i.decision!.a + (k + 1) * REPRISE_S * 1000
        })
        if (i.transfert.colis.every((c) => c.reprisA !== null)) {
          i.gardeRendue = true
          const n = i.transfert.colis.length
          etatSession.ecrire((s) => void (s.colisSousGarde = Math.max(0, s.colisSousGarde - n)))
        }
      }
    }
  })
}

/** Places libres du relais : la dernière occupation publiée par son application (pont), sinon celle du départ. */
function placesLibres(): number {
  const o = evenementsDe('relais').findLast((e) => e.type === 'relay.stock.updated')
  return o?.type === 'relay.stock.updated' ? Math.max(o.declarees - o.occupees, 0) : RELAIS_DEMO.placesLibresAuDebut
}

function decider(i: Garde, t: number) {
  const parOperateur = i.echeance !== null && t >= i.echeance && (i.recu ?? 0) + DECISION_S * 1000 > i.echeance
  const a = parOperateur ? i.echeance! : i.recu! + DECISION_S * 1000
  const refuse = i.type === 'relais_sature'
  i.decision = { par: parOperateur ? 'operateur' : 'entreprise', nom: parOperateur ? 'Opérateur de zone BelivaY' : ENTREPRISE, a, motif: refuse ? `Le ${RELAIS_DEMO.nom} a encore ${placesLibres()} places libres : déposez vos colis comme prévu.` : null }
  i.etat = refuse ? 'refuse' : 'valide'
  const tour = etatTournee.lire()
  const restants = tour ? tour.arrets.filter((x) => x.etat === 'a_faire' || x.etat === 'en_cours') : []
  const ty0 = typeDe(i.famille, i.type)
  // Incident ouvert par un écran de terrain (la tournée l'attend) : sa décision lève l'attente de la tournée.
  const deLaTournee = tour?.incident?.id === i.id
  if (!refuse && deLaTournee) {
    leverIncident(i.id)
    i.ajustement = { texte: 'Incident validé : le système a dissocié l’arrêt et recalculé les colis attendus. La tournée reprend.', arrets: [] }
  } else if (!refuse) {
    if (i.type === 'boutique_fermee' && i.arret) {
      i.ajustement = { texte: 'Boutique fermée confirmée : le système a dissocié l’arrêt. Continuez vers l’arrêt suivant.', arrets: restants.map((x) => ({ ordre: x.ordre, nom: x.nom, avant: x.avant, etat: x.id === i.arret!.id ? 'retire' : 'inchange' })) }
      etatTournee.ecrire((tt) => {
        if (!tt) return
        const x = tt.arrets.find((y) => y.id === i.arret!.id)
        if (x) x.etat = 'echec'
        tt.enCours = tt.arrets.find((y) => y.etat === 'a_faire' || y.etat === 'en_cours')?.id ?? null
      })
    } else if (ty0?.transfert && etatSession.lire().colisSousGarde > 0) {
      const n = etatSession.lire().colisSousGarde
      i.transfert = { remplacant: REMPLACANT, colis: COLIS.slice(0, n).map((c) => ({ id: c.id, reprisA: null })) }
      i.ajustement = { texte: 'Junior reprend vos colis un par un, par scan, puis la suite du paquet. Restez en pause jusqu’au dernier scan.', arrets: restants.map((x) => ({ ordre: x.ordre, nom: x.nom, avant: x.avant, etat: 'decale' })) }
      void demoDisponibilite.changer('en_pause', { cle: `pause-${i.id}`, heure: a, position: i.position }, { motif: 'Transfert en cours', minutes: 30 })
    } else if (i.famille === 'route') {
      i.ajustement = { texte: 'Délai recalculé par le système ; les clients concernés sont prévenus si l’heure limite ne tient plus.', arrets: restants.map((x) => ({ ordre: x.ordre, nom: x.nom, avant: x.avant + DELAI_ROUTE_MIN * 60_000, etat: 'decale' })) }
    } else if (i.famille === 'relais') {
      i.ajustement = { texte: 'Relais de secours désigné par le système : Relais Bastos Église. Les colis restent sous votre garde jusqu’au dépôt.', arrets: restants.map((x) => ({ ordre: x.ordre, nom: x.nom, avant: x.avant, etat: x.type === 'relais' ? 'decale' : 'inchange' })) }
    } else if (i.famille === 'colis') {
      i.ajustement = { texte: 'Colis attendus recalculés ; la console suit le dossier du colis.', arrets: [] }
    } else if (i.famille === 'securite') {
      i.ajustement = { texte: 'Tournée suspendue : Yafé Express organise la suite. Mettez-vous à l’abri.', arrets: [] }
    }
  }
  etatNotifications.ecrire((l) =>
    void l.unshift({ id: 'N-' + i.id, rubrique: 'securite', priorite: 'haute', titre: refuse ? 'Incident refusé' : 'Incident validé', texte: (ty0?.titre ?? '') + ' · ' + i.id, route: 'incident', params: { id: i.id }, quand: a, lue: false, lueA: null, rappeleeA: null }),
  )
}

function chronologie(i: Garde, t: number): Incident['chronologie'] {
  const c: Incident['chronologie'] = [{ a: i.cree, texte: 'Déclaré sur le téléphone' }]
  c.push({ a: i.recu, texte: i.recu === null ? 'En file : envoyé au retour du réseau' : 'Reçu par {entreprise}' })
  if (i.famille === 'vendeur' && i.recu !== null) c.push({ a: i.recu, texte: 'Vendeur relancé par le système' })
  if (i.bloquant) c.push({ a: i.decision?.a ?? null, texte: i.decision ? (i.etat === 'refuse' ? 'Refusé' : 'Validé') : 'Validation en cours' })
  if (i.ajustement || (i.bloquant && !i.decision)) c.push({ a: i.ajustement ? (i.decision?.a ?? null) : null, texte: 'Tournée ajustée par le système' })
  if (i.transfert) c.push({ a: i.gardeRendue ? Math.max(...i.transfert.colis.map((x) => x.reprisA ?? 0)) : null, texte: 'Transfert terminé' })
  void t
  return c
}

const vue = (i: Garde, t: number): Incident => {
  const { gardeRendue: _g, ...reste } = i
  void _g
  return { ...reste, chronologie: chronologie(i, t) }
}

// Incidents ouverts par les écrans de terrain (boutique fermée, code bloqué, relais fermé) : même dossier que LIV-P21.
// Numéros du serveur, les mêmes que dans le portail de l'entreprise (« IN-121 » : ses incidents vont jusqu'à IN-121).
const nouvelId = () => 'IN-' + String(etatIncidents.lire().length + 121)
/** L'entreprise reçoit l'incident (src/demo/pont.ts) : même numéro, à valider dans son portail. */
function annoncer(id: string, famille: string, type: string, note: string, arretId: string | null, bloquant: boolean, le: number) {
  const a = arretId ? etatTournee.lire()?.arrets.find((x) => x.id === arretId) : null
  publier({ type: 'incident', id, paquetId: a?.paquetId ?? etatTournee.lire()?.paquetId ?? null, lieu: a?.nom ?? null, famille, genre: type, note, bloquant }, 'incident-' + id, le)
}
INCIDENTS_TERRAIN.enregistrer = ({ famille, type, note, arretId }) => {
  const t = maintenant()
  const id = nouvelId()
  const a = arretId ? etatTournee.lire()?.arrets.find((x) => x.id === arretId) : null
  const bloquant = typeDe(famille, type)?.bloquant ?? true
  annoncer(id, famille, type, note, arretId, bloquant, t)
  etatIncidents.ecrire((l) =>
    void l.unshift({ id, famille: famille as Incident['famille'], type, note, photos: 0, cree: t, recu: t, arret: a ? { id: a.id, ordre: a.ordre, nom: a.nom } : null, position: null, bloquant, etat: bloquant ? 'en_attente' : 'enregistre', echeance: bloquant ? t + catalogue().validationMin * 60_000 : null, decision: null, ajustement: null, transfert: null, gardeRendue: false }),
  )
  return id
}
INCIDENTS_TERRAIN.valider = (id) => {
  const t = maintenant()
  etatIncidents.ecrire((l) => {
    const i = l.find((x) => x.id === id)
    if (!i || i.etat !== 'en_attente') return
    i.etat = 'valide'
    i.decision = { par: 'entreprise', nom: ENTREPRISE, a: t, motif: null }
    i.ajustement = { texte: 'Incident validé : le système a dissocié l’arrêt et recalculé les colis attendus. La tournée reprend.', arrets: [] }
  })
}

/** Décision prise dans le portail de l'entreprise (src/demo/pont-entreprise.ts) : elle remplace la simulation. */
export function leverIncidentTerrain(id: string, decision: 'valide' | 'refuse', motif: string | null, par: string, le: number) {
  etatIncidents.ecrire((l) => {
    const i = l.find((x) => x.id === id)
    if (!i || i.decision) return
    i.etat = decision
    i.decision = { par: 'entreprise', nom: par + ' · ' + ENTREPRISE, a: le, motif }
  })
  if (decision === 'valide' && etatTournee.lire()?.incident?.id === id) leverIncident(id)
}

// Rejoué au retour du réseau : le serveur reçoit l'incident (heure du serveur), l'échéance part de là.
REJOUEURS.incident = (id, _o, recu) => {
  etatIncidents.ecrire((l) => {
    const i = l.find((x) => x.id === id)
    if (!i || i.etat !== 'en_file') return
    i.recu = recu
    i.etat = i.bloquant ? 'en_attente' : 'enregistre'
    annoncer(i.id, i.famille, i.type, i.note, i.arret?.id ?? null, i.bloquant, recu)
    i.echeance = i.bloquant ? recu + catalogue().validationMin * 60_000 : null
  })
}

export const demoIncidents: DomaineIncidents = {
  catalogue: () => repondre(catalogue()),
  liste() {
    const t = maintenant()
    avancer(t)
    return repondre(etatIncidents.lire().map((i) => vue(i, t)))
  },
  incident(id) {
    const t = maintenant()
    avancer(t)
    const i = etatIncidents.lire().find((x) => x.id === id)
    return repondre(i ? vue(i, t) : null)
  },
  async declarer(d, origine, enLigne) {
    const c = catalogue()
    const ty0 = typeDe(d.famille, d.type)
    if (!ty0) return { ok: false as const, raison: 'type_inconnu' as const }
    if (d.note.trim().length < c.noteMin) return { ok: false as const, raison: 'note_trop_courte' as const }
    if (d.photos.length < ty0.photos) return { ok: false as const, raison: 'photos_manquantes' as const }
    const tour = etatTournee.lire()
    const a = d.arretId ? tour?.arrets.find((x) => x.id === d.arretId) : null
    const id = nouvelId()
    const recu = enLigne ? origine.heure : null
    etatIncidents.ecrire((l) =>
      void l.unshift({
        id,
        famille: d.famille,
        type: d.type,
        note: d.note.trim(),
        photos: d.photos.length,
        cree: origine.heure,
        recu,
        arret: a ? { id: a.id, ordre: a.ordre, nom: a.nom } : null,
        position: origine.position,
        bloquant: ty0.bloquant,
        etat: !enLigne ? 'en_file' : ty0.bloquant ? 'en_attente' : 'enregistre',
        echeance: enLigne && ty0.bloquant ? origine.heure + c.validationMin * 60_000 : null,
        decision: null,
        ajustement: null,
        transfert: null,
        gardeRendue: false,
      }),
    )
    const details = { photos: d.photos.length, poidsKo: d.photos.length * Math.round(c.photoMaxKo * 0.8) }
    if (enLigne) {
      journaliserEnvoye('incident', id, origine, details)
      annoncer(id, d.famille, d.type, d.note.trim(), a?.id ?? null, ty0.bloquant, origine.heure)
    }
    else await demoHorsLigne.mettreEnFile('incident', id, origine, details)
    return { ok: true as const, id }
  },
}
