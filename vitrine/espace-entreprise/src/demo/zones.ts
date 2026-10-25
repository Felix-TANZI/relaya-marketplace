// DONNÉES DE DÉMONSTRATION — domaine « zones » (ENT-P04) : les douze zones BelivaY de Yaoundé (Z1, Z2, Z3, Z6
// exploitées au lancement, ZONES-EXPLOITEES, DP-70 ; les autres « vente seulement »), Yafé Express déclarée sur les
// quatre (110 colis par jour : 20 + 40 + 30 + 20, ENT-02-R04). Polygones : le fichier des zones de Yaoundé
// (calculs/zones.ts : carte du 23 oct. 2026 dans l'emprise urbaine réelle ; en production, polygones versionnés par la
// console, ENT-ZON-08). Livreurs rattachés = livreurs dont la fiche porte la
// zone (une seule vérité). État calculé à la lecture comme le serveur (ENT-04-R02) : une zone ouverte sans livreur
// disponible (actif, véhicule proposé) est « bloquée » avec sa raison. Une zone non exploitée se déclare
// (ENT-RG-R53, ENT-P04R-04) mais ne reçoit aucun paquet avant son ouverture logistique (DED-23).
import type { DeclarationZone, DomaineZones, Quartier, ZoneCarte, ZoneEntreprise } from '../donnees/domaines/zones'
import type { CodeZone } from '../donnees/communs'
import { PARAMETRES_FLOTTE, delaiTenu } from '../calculs/flotte'
import { ZONES_YAOUNDE } from '../calculs/zones'
import { maintenant } from './horloge'
import { exiger } from './acces'
import { signer } from './journal'
import { livreurDisponible, livreursDemo } from './livreurs'
import { RELAIS_DEMO } from './pont'
import { magasin, repondre } from './stockage'

const P = PARAMETRES_FLOTTE

// Exploitée au lancement (ZONES-EXPLOITEES, DP-70) et relais de chaque zone (démonstration) ; code, nom, centre et polygone : le fichier
// des zones (calculs/zones.ts).
const LANCEMENT: Partial<Record<CodeZone, { nom: string; fermeture: string }>> = {
  // Z1 : le relais de démonstration commun aux trois applications (src/demo/pont.ts), fermeture du mardi.
  Z1: { nom: RELAIS_DEMO.nom, fermeture: RELAIS_DEMO.horaires[1].fermeture!.replace(/^0?(\d+):00$/, '$1 h') },
  Z2: { nom: 'Relais Obili · Chez Mireille', fermeture: '19 h' },
  Z3: { nom: 'Relais Mokolo · Agence Yafé Express', fermeture: '19 h' },
  Z6: { nom: 'Relais Biyem-Assi · Chez Tantine Aline', fermeture: '19 h 30' },
}
/** Les douze zones : code, nom, centre et polygone (WGS 84), exploitée au lancement, relais de la zone. */
export const DOUZE = ZONES_YAOUNDE.map((z) => ({ ...z, exploitee: !!LANCEMENT[z.code], relais: LANCEMENT[z.code] ?? null }))

const SANTE: Record<string, { dansLeDelai: number; remis: number; litiges: number }> = {
  Z1: { dansLeDelai: 5, remis: 5, litiges: 0 },
  Z2: { dansLeDelai: 7, remis: 9, litiges: 0 },
  Z3: { dansLeDelai: 11, remis: 12, litiges: 1 },
  Z6: { dansLeDelai: 4, remis: 4, litiges: 0 },
}
const DECLAREES: Record<string, [number, number]> = { Z1: [20, 4], Z2: [40, 6], Z3: [30, 11], Z6: [20, 3] } // capacité, acceptés du jour

export const zonesDemo = magasin('zones', () => ({
  zones: DOUZE.filter((z) => DECLAREES[z.code]).map(
    (z): ZoneEntreprise => ({
      code: z.code,
      nom: z.nom,
      exploitee: z.exploitee,
      declaree: true,
      etat: 'ouverte',
      capacite: DECLAREES[z.code][0],
      acceptes: DECLAREES[z.code][1],
      delaiTenu: null,
      horaires: { debut: P.service.debut, fin: P.service.fin },
      relais: z.relais,
      sante: SANTE[z.code],
    }),
  ),
}))

const rattaches = (code: CodeZone) => livreursDemo.lire().livreurs.filter((l) => l.zones.includes(code) && l.statut !== 'retire')

/** La zone vue par le serveur : livreurs rattachés, délai tenu, état recalculé (bloquée et sa raison). */
export function zoneVue(z: ZoneEntreprise): ZoneEntreprise {
  const ls = rattaches(z.code)
  const dispo = ls.filter((l) => livreurDisponible(l.id))
  const actifs = ls.filter((l) => ['actif', 'en_ligne', 'en_mission'].includes(l.statut))
  const bloquee = z.etat === 'ouverte' && dispo.length === 0
  const s = z.sante ?? { dansLeDelai: 0, remis: 0, litiges: 0 }
  return {
    ...z,
    etat: bloquee ? 'bloquee' : z.etat,
    raisonBlocage: bloquee ? (actifs.length ? 'piece' : 'aucun_livreur') : null,
    livreurs: ls.map((l) => l.id),
    delaiTenu: delaiTenu(s.dansLeDelai, s.remis)?.pct ?? null,
  }
}
export const zonesVues = () => zonesDemo.lire().zones.map(zoneVue)

// Table quartier → zone (logique-metier/livraison/quartiers-zones.json, carte du 23 oct. 2026) ; Elobi et Jouvence,
// absents de la table, suivent leur voisin (Mokolo, Biyem-Assi) : à vérifier sur le terrain.
const QUARTIERS: Quartier[] = [
  { nom: 'Bastos', zone: 'Z1', alias: ['Quartier des ambassades'] },
  { nom: 'Nlongkak', zone: 'Z1', alias: [] },
  { nom: 'Etoa-Meki', zone: 'Z1', alias: ['Étoa Méki'] },
  { nom: 'Etoudi', zone: 'Z1', alias: [] },
  { nom: 'Centre administratif', zone: 'Z2', alias: ['Quartier administratif'] },
  { nom: 'Nsam', zone: 'Z2', alias: ['Nsam Efoulan'] },
  { nom: 'Ngoa-Ekellé', zone: 'Z2', alias: ['Ngoa Ekelle', 'Université'] },
  { nom: 'Obili', zone: 'Z2', alias: [] },
  { nom: 'Mokolo', zone: 'Z3', alias: ['Marché Mokolo'] },
  { nom: 'Elobi', zone: 'Z3', alias: ['Mokolo-Elobi'] },
  { nom: 'Briqueterie', zone: 'Z3', alias: [] },
  { nom: 'Madagascar', zone: 'Z3', alias: [] },
  { nom: 'Tsinga', zone: 'Z3', alias: [] },
  { nom: 'Melen', zone: 'Z6', alias: ['Carrefour Melen'] },
  { nom: 'Biyem-Assi', zone: 'Z6', alias: ['Biyem Assi'] },
  { nom: 'Etoug-Ebe', zone: 'Z6', alias: [] },
  { nom: 'Jouvence', zone: 'Z6', alias: ['Acacias'] },
  { nom: 'Mendong', zone: 'Z7', alias: [] },
  { nom: 'Simbock', zone: 'Z7', alias: [] },
  { nom: 'Mvog-Ada', zone: 'Z9', alias: [] },
  { nom: 'Essos', zone: 'Z9', alias: [] },
  { nom: 'Mvog-Mbi', zone: 'Z10', alias: [] },
  { nom: 'Mimboman', zone: 'Z10', alias: [] },
  { nom: 'Odza', zone: 'Z11', alias: [] },
  { nom: 'Emana', zone: 'Z12', alias: [] },
]

const ok = { ok: true as const }
const non = <R extends string>(raison: R) => repondre({ ok: false as const, raison })

/** Contrôle commun d'une déclaration (création ou modification). */
function controler(d: DeclarationZone, acceptes: number) {
  if (!Number.isInteger(d.debut) || !Number.isInteger(d.fin) || d.debut < P.service.debut || d.fin > P.service.fin || d.debut >= d.fin) return 'horaires' as const
  const choisis = livreursDemo.lire().livreurs.filter((l) => d.livreurs.includes(l.id))
  const actifs = choisis.filter((l) => livreurDisponible(l.id))
  if (!actifs.length) return 'aucun_livreur' as const // 422 : au moins un livreur actif (ENT-P04R-01)
  // Capacité honnête (ENT-RG-R54) : jamais au-delà de ce que les livreurs actifs cochés peuvent tenir, jamais sous les acceptés.
  const tenable = actifs.reduce((n, l) => n + (l.capacite ?? 0), 0)
  if (!Number.isInteger(d.capacite) || d.capacite < Math.max(1, acceptes) || d.capacite > tenable) return 'capacite' as const
  return null
}

/** Rattache exactement les livreurs choisis à la zone (fiches des livreurs, journal, notification au livreur). */
function rattacher(code: CodeZone, ids: string[]) {
  for (const l of livreursDemo.lire().livreurs) {
    const avait = l.zones.includes(code)
    const veut = ids.includes(l.id)
    if (avait === veut) continue
    const zones = veut ? [...l.zones, code] : l.zones.filter((z) => z !== code)
    livreursDemo.ecrire((s) => {
      const x = s.livreurs.find((y) => y.id === l.id)!
      x.zones = zones
      x.notifications = [{ le: maintenant(), texte: veut ? `Vous êtes rattaché à la zone ${code}.` : `Vous n’êtes plus rattaché à la zone ${code}.` }, ...(x.notifications ?? [])]
    })
    signer('rider.updated', 'livreur:' + l.id, 'zones', l.zones.join(', '), zones.join(', '))
  }
}

export const demoZones: DomaineZones = {
  async zones() {
    return repondre(zonesVues())
  },
  async carte() {
    const declarees = zonesVues()
    return repondre(
      DOUZE.map((z): ZoneCarte => {
        const d = declarees.find((x) => x.code === z.code)
        return { code: z.code, nom: z.nom, exploitee: z.exploitee, declaree: !!d, etat: d?.etat ?? null, polygone: z.polygone, centre: z.centre, etiquette: z.etiquette, relais: z.relais?.nom ?? null }
      }),
    )
  },
  async quartiers() {
    return repondre(QUARTIERS)
  },
  async declarer(code, d) {
    exiger(['proprietaire', 'repartiteur'], 'Déclarer une zone')
    const z = DOUZE.find((x) => x.code === code)
    if (!z) return non('inconnue')
    if (zonesDemo.lire().zones.some((x) => x.code === code)) return non('deja')
    const refus = controler(d, 0)
    if (refus) return non(refus)
    const zone: ZoneEntreprise = { code, nom: z.nom, exploitee: z.exploitee, declaree: true, etat: 'ouverte', capacite: d.capacite, acceptes: 0, delaiTenu: null, horaires: { debut: d.debut, fin: d.fin }, relais: z.relais, sante: { dansLeDelai: 0, remis: 0, litiges: 0 } }
    zonesDemo.ecrire((s) => void s.zones.push(zone))
    rattacher(code, d.livreurs)
    signer('zone.declared', 'zone:' + code, 'déclaration', '', `${d.capacite} colis/jour, ${d.debut} h–${d.fin} h`)
    return repondre({ ...ok, zone: zoneVue(zone) })
  },
  async modifier(code, d) {
    exiger(['proprietaire', 'repartiteur'], 'Modifier une zone')
    const z = zonesDemo.lire().zones.find((x) => x.code === code)
    if (!z) return non('inconnue')
    const refus = controler(d, z.acceptes)
    if (refus) return non(refus)
    zonesDemo.ecrire((s) => {
      const x = s.zones.find((y) => y.code === code)!
      x.capacite = d.capacite
      x.horaires = { debut: d.debut, fin: d.fin }
    })
    rattacher(code, d.livreurs)
    if (z.capacite !== d.capacite) signer('zone.updated', 'zone:' + code, 'capacité', String(z.capacite), String(d.capacite))
    if (z.horaires?.debut !== d.debut || z.horaires?.fin !== d.fin) signer('zone.updated', 'zone:' + code, 'horaires', `${z.horaires?.debut} h–${z.horaires?.fin} h`, `${d.debut} h–${d.fin} h`)
    return repondre({ ...ok, zone: zoneVue(zonesDemo.lire().zones.find((x) => x.code === code)!) })
  },
  async mettreEnPause(code, pause) {
    exiger(['proprietaire', 'repartiteur'], 'Mettre une zone en pause')
    const z = zonesDemo.lire().zones.find((x) => x.code === code)
    if (!z) return non('inconnue')
    zonesDemo.ecrire((s) => void (s.zones.find((y) => y.code === code)!.etat = pause ? 'pause' : 'ouverte'))
    signer('zone.state_changed', 'zone:' + code, 'état', z.etat, pause ? 'pause' : 'ouverte')
    return repondre(ok)
  },
}
