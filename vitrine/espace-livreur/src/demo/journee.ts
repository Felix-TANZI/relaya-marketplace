// DONNÉES DE DÉMONSTRATION — domaine « journee » (clôture) : contrôles et bilan calculés comme le serveur, à partir de
// la tournée, de la garde, de la file, des incidents et du kit (reçu le matin, déclaré à 07 h 50) ; distance par arrêt :
// données du jeu d'essai ; heure de proposition et jours de service lus dans le registre.
import { ajouterJours, debutDuJour, jourDe, jourSemaine } from '../calculs/temps'
import type { ComptageKit, ControleCloture, DomaineJournee, LigneKit } from '../donnees/domaines/journee'
import { demoDisponibilite } from './disponibilite'
import { REJOUEURS, demoHorsLigne, etatFile, journaliserEnvoye, parametre } from './horsligne'
import { etatIncidents } from './incidents'
import { maintenant } from './horloge'
import { h } from './jeu-essai'
import { kitVu } from './kit'
import { etatSession } from './session'
import { etatTournee } from './tournee'
import { magasin, repondre } from './stockage'

/** Distance mesurée par le serveur pour chaque arrêt fait (km, depuis l'arrêt précédent). */
export const KM_ARRETS: Record<string, number> = { A1: 6.4, A2: 1.2, A3: 2.1, A4: 3.5, A5: 2.8 }
const ENTREPRISE = 'Yafé Express'

/** État de la journée (lu par l'accueil : « Journée clôturée », LIV-P04). */
export const etatJournee = magasin('journee', () => ({
  etat: 'ouverte' as ControleCloture['etat'],
  clotureeA: null as number | null,
  comptage: [] as ComptageKit[],
  stockageA: null as number | null,
}))

/** Arrêts faits aujourd'hui, et distance du jour. */
export function faitsDuJour() {
  const t = etatTournee.lire()
  const faits = t ? t.arrets.filter((a) => a.etat === 'fait') : []
  return { faits, km: Math.round(faits.reduce((n, a) => n + (KM_ARRETS[a.id] ?? 0), 0) * 10) / 10, restants: t ? t.arrets.filter((a) => a.etat === 'a_faire' || a.etat === 'en_cours').length : 0, paquetId: t?.paquetId ?? null, total: t?.arrets.length ?? 0 }
}

/** Kit du jour par format (domaine « kit » : reçu le matin, étiquettes liées, pochettes abîmées) : ce qui doit
 * revenir au point de stockage le soir (LIV-08-R50). Un seul compte, celui du kit. */
function kit(): LigneKit[] {
  return kitVu().formats.map((f) => ({ format: f.format, recu: f.recu, utilise: f.lies + f.abimes, attendu: f.stock }))
}

function controle(): ControleCloture {
  const t = maintenant()
  const jour = jourDe(t)
  const e = etatJournee.lire()
  const { faits, km, restants } = faitsDuJour()
  const garde = etatSession.lire().colisSousGarde
  const file = etatFile.lire().actions.filter((a) => a.etat === 'en_attente').length
  const incidents = etatIncidents.lire().filter((i) => jourDe(i.cree) === jour)
  const ramasses = faits.filter((a) => a.type === 'ramassage').reduce((n, a) => n + a.colis, 0)
  const deposes = faits.filter((a) => a.type === 'relais').reduce((n, a) => n + a.colis, 0)
  const remis = faits.filter((a) => a.type === 'domicile').reduce((n, a) => n + a.colis, 0)
  const lk = kit()
  const retours = faits.filter((a) => a.type === 'collecte').reduce((n, a) => n + a.colis, 0) > 0 && garde > 0 ? garde : 0
  const fermee = e.etat !== 'ouverte'
  const blocages: ControleCloture['blocages'] = !fermee && garde > 0 ? [{ id: 'colis_sous_garde', nombre: garde }] : []
  const [, hh] = parametre('LIV-HEURES-SERVICE', 'lundi au samedi, (\\d+) h – (\\d+) h')
  let prochain = ajouterJours(jour, 1)
  while (jourSemaine(prochain) === 6) prochain = ajouterJours(prochain, 1)
  const deja: ControleCloture['deja'] = ([
    { a: h(7, 42), texte: 'Statut « Disponible »', valeurs: {} },
    { a: h(7, 50), texte: 'Kit déclaré : {pochettes} pochettes, {cartons} cartons', valeurs: { pochettes: lk.filter((l) => ['S', 'M', 'L'].includes(l.format)).reduce((n, l) => n + l.recu, 0), cartons: lk.filter((l) => l.format === 'C1' || l.format === 'C2').reduce((n, l) => n + l.recu, 0) } },
    { a: h(12, 41), texte: 'Paquet {paquet} affecté par {entreprise}', valeurs: { paquet: etatTournee.lire()?.paquetId ?? '', entreprise: ENTREPRISE } },
    ...faits.map((a) => ({ a: a.avant, texte: 'Arrêt {ordre} · {nom}', valeurs: { ordre: a.ordre, nom: a.nom } })),
    ...incidents.map((i) => ({ a: i.cree, texte: 'Incident {id} déclaré', valeurs: { id: i.id } })),
  ] as ControleCloture['deja']).sort((x, y) => x.a - y.a)
  return {
    possible: !fermee && blocages.length === 0,
    blocages,
    controles: [
      { id: 'garde', ton: garde > 0 ? 'rouge' : 'vert', nombre: garde },
      { id: 'file', ton: file > 0 ? 'ambre' : 'vert', nombre: file },
      { id: 'kit', ton: 'vert', nombre: lk.reduce((n, l) => n + l.recu, 0) },
      { id: 'retours', ton: retours > 0 ? 'rouge' : 'vert', nombre: retours },
    ],
    tourneeEnCours: restants > 0,
    bilan: { paquets: etatTournee.lire() ? 1 : 0, arrets: faits.length, km, ramasses, deposes, remis, incidents: incidents.length, preuves: ramasses * 2 + faits.filter((a) => a.type !== 'ramassage').length + incidents.reduce((n, i) => n + i.photos, 0), etiquettes: lk.reduce((n, l) => n + l.utilise, 0) },
    deja,
    kit: lk,
    proposeeA: debutDuJour(jour) + Number(parametre('LIV-CLOTURE-PROPOSEE-H', '(\\d+) h')[1]) * 3600_000,
    etat: e.etat,
    clotureeA: e.clotureeA,
    stockage: { nom: 'Point de stockage Yafé Express', quartier: 'Mokolo' },
    prochainService: debutDuJour(prochain) + Number(hh) * 3600_000,
    entreprise: ENTREPRISE,
  }
}

REJOUEURS.cloture = () => {
  etatJournee.ecrire((e) => void (e.etat === 'preuves_a_envoyer' && (e.etat = 'cloturee')))
}

export const demoJournee: DomaineJournee = {
  controle: () => repondre(controle()),
  async cloturer(comptage, origine, enLigne) {
    const c = controle()
    if (c.etat !== 'ouverte') return { ok: false as const, raison: 'deja_cloturee' as const }
    if (!c.possible) return { ok: false as const, raison: 'blocages' as const }
    for (const l of c.kit) {
      const x = comptage.find((y) => y.format === l.format)
      if (!x || x.compte === l.attendu) continue
      if (!x.motif) return { ok: false as const, raison: 'ecart_sans_motif' as const }
      if (x.motif === 'pochette_abimee' && !x.photo) return { ok: false as const, raison: 'photo_manquante' as const }
    }
    const photos = comptage.filter((x) => x.photo).length
    // La file sera vide après l'envoi de ce geste ? Non : une preuve encore en file garde « preuves à envoyer ».
    const resteEnFile = etatFile.lire().actions.some((a) => a.etat === 'en_attente')
    etatJournee.ecrire((e) => {
      e.etat = enLigne && !resteEnFile ? 'cloturee' : 'preuves_a_envoyer'
      e.clotureeA = origine.heure
      e.comptage = comptage
    })
    await demoDisponibilite.changer('hors_service', origine)
    if (enLigne) journaliserEnvoye('cloture', c.bilan.paquets ? 'PQ-Z1-261013-003' : 'journee', origine, { photos, poidsKo: photos * 200 })
    else await demoHorsLigne.mettreEnFile('cloture', 'journee', origine, { photos, poidsKo: photos * 200 })
    return { ok: true as const }
  },
  async deposerAuStockage(origine) {
    const n = etatSession.lire().colisSousGarde
    if (faitsDuJour().restants > 0) return { ok: false as const, raison: 'tournee_en_cours' as const }
    if (n === 0) return { ok: false as const, raison: 'rien_a_deposer' as const }
    etatSession.ecrire((s) => void (s.colisSousGarde = 0))
    etatJournee.ecrire((e) => void (e.stockageA = origine.heure))
    journaliserEnvoye('stockage', 'Point de stockage Yafé Express', origine)
    return { ok: true as const, colis: n }
  },
}
