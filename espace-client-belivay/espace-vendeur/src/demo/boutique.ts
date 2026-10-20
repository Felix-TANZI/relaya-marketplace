// DONNÉES DE DÉMONSTRATION — domaine « boutique » : identité, vitrine interne, horaires, « Fermer aujourd'hui »
// jusqu'à la prochaine ouverture réelle, pause (30 jours au plus), fermetures programmées 48 h à l'avance et
// écourtables (Q-39), emplacement (200 m, Q-91), avis et réponse privée par le support (VD11-R56).
// Accès Préparation (Q-18) : « Fermer aujourd'hui » et rouvrir le jour même seulement (ReserveAuProprietaire sinon).
import type { Avis, Boutique, CentreBelivay, DemandeModification, DomaineBoutique, Fermeture, Horaire, Lieu, Lieux, Position, ResumeAvis, Vitrine } from '../donnees/domaines/boutique'
import { FORME_NIU, FORME_RCCM, ReserveAuProprietaire } from '../donnees/communs'
import { CENTRES } from '@client/donnees/geo'
import { HEURE, JOUR, ajouterJours, debutDuJour, jourDe, jourSemaine, yaounde } from '../calculs/temps'
import { maintenant } from './horloge'
import { BOUTIQUE, LIVREUR } from './jeu-essai'
import { demoMessages, filtrer } from './messages'
import { ZONES, estProprietaire, exigerDroit, zoneDe } from './session'
import { masquer } from './compte'
import { MEMBRES } from './jeu-essai'
import { magasin, repondre } from './stockage'

const PREAVIS_H = 48 // VD02-P07 (Q-39)
const PAUSE_MAX_JOURS = 30 // Q-39
const DEPLACEMENT_MAX_M = 200 // EMP-01
const REPONSE_AVIS_JOURS = 30 // VD11-R56, Q-88
const POIDS_SATISFACTION = 20 // part des avis dans le Trust Score (VD11-R57)
const LIEUX_MAX = 5 // proposé (VD-LIEUX-MAX, réglable en console) : principal + 4 autres lieux
const CODE_DEMO = '123456'
const REPONSE_DEMANDE_H = 72 // VD-CONTESTATION-REPONSE : 72 h ouvrées (dimanche non compté : approché ici à 3 jours)
// Zones exploitées (ramassages groupés) ; les autres sont servies sans tournée groupée.
const EXPLOITEES = ['Z1', 'Z3', 'Z4']

/** Centres BelivaY : un relais par quartier des zones servies, et le centre de chaque zone (GET /hubs). Calculés à la
 *  demande : ZONES vient de session.ts, qui importe ce fichier (import circulaire). */
const centresBelivay = (): CentreBelivay[] => ZONES.flatMap((z) =>
  z.centres
    .filter((q) => CENTRES[q])
    .map((q, i) => ({
      id: (i === 0 ? 'cz-' : 'r-') + q.toLowerCase().replace(/[^a-z]/g, ''),
      nom: i === 0 ? `Centre BelivaY ${z.code} · ${q}` : `Relais BelivaY · ${q}`,
      type: (i === 0 ? 'centre_zone' : 'relais') as CentreBelivay['type'],
      zone: z.code,
      quartier: q,
      position: { lat: CENTRES[q][0], lon: CENTRES[q][1] },
      horaires: i === 0 ? 'Lun – sam 07 h – 20 h' : 'Lun – sam 08 h – 19 h',
      exploitee: EXPLOITEES.includes(z.code),
    })),
)

const PRINCIPAL: Lieu = {
  id: 'l-principal',
  nom: 'Boutique de Mvog-Mbi',
  type: 'boutique',
  principal: true,
  position: BOUTIQUE.position,
  zone: BOUTIQUE.zone,
  quartier: BOUTIQUE.quartier,
  adresse: 'Carrefour Mvog-Mbi, rue de la pharmacie',
  repere: BOUTIQUE.repere,
  horaires: null,
  statut: 'verifie',
  point: { poseLe: '2026-05-07', verifieLe: '2026-05-09', enAttente: null },
  centre: null,
}

const initial = () => ({
  forme: 4,
  fermeeLe: null as string | null,
  fermeeJusqua: null as number | null,
  horaires: BOUTIQUE.horaires as Horaire[],
  fermetures: [{ id: 'f-noel', du: '2026-12-24', au: '2026-12-26', motif: 'Fêtes de fin d’année', annonceeLe: yaounde(2026, 9, 21, 9, 40) }] as Fermeture[],
  pause: null as { depuis: number; jusqua: number } | null,
  lieux: [
    PRINCIPAL,
    { id: 'l-entrepot', nom: 'Entrepôt d’Essos', type: 'entrepot', principal: false, position: { lat: 3.871, lon: 11.538 }, zone: 'Z3', quartier: 'Essos', adresse: 'Rue du marché d’Essos, magasin 12', repere: 'portail bleu après la boulangerie', horaires: null, statut: 'verifie', point: { poseLe: '2026-06-02', verifieLe: '2026-06-04', enAttente: null }, centre: null },
    { id: 'l-collecte', nom: 'Point de collecte de Nkolndongo', type: 'collecte', principal: false, position: { lat: 3.861, lon: 11.533 }, zone: 'Z4', quartier: 'Nkolndongo', adresse: 'Carrefour Nkolndongo, kiosque 3', repere: 'à côté de la station-service', horaires: null, statut: 'a_verifier', point: { poseLe: '2026-09-19', verifieLe: null, enAttente: null }, centre: null },
  ] as Lieu[],
  demandes: [
    {
      id: 'dm-1',
      champ: 'nom',
      avant: 'PG Phones',
      valeur: 'Tonton PG',
      motif: 'Nouveau nom de l’enseigne, peint sur la devanture.',
      pieces: [{ nom: 'devanture.jpg', taille: 412000 }],
      statut: 'acceptee',
      creeeLe: yaounde(2026, 5, 12, 10),
      reponseAvant: yaounde(2026, 5, 15, 10),
      historique: [
        { a: yaounde(2026, 5, 12, 10), texte: 'Demande envoyée', par: 'vous' },
        { a: yaounde(2026, 5, 13, 16, 30), texte: 'Acceptée : la devanture montre le nouveau nom.', par: 'belivay' },
      ],
      motifRefus: null,
    },
    {
      id: 'dm-2',
      champ: 'officiel',
      avant: 'Particulier · sans RCCM',
      valeur: 'Entreprise · RCCM RC/YAO/2026/B/1187',
      motif: 'La boutique est maintenant immatriculée au registre du commerce.',
      pieces: [{ nom: 'rccm.pdf', taille: 238000 }],
      statut: 'refusee',
      creeeLe: yaounde(2026, 8, 3, 11),
      reponseAvant: yaounde(2026, 8, 6, 11),
      historique: [
        { a: yaounde(2026, 8, 3, 11), texte: 'Demande envoyée', par: 'vous' },
        { a: yaounde(2026, 8, 5, 15, 10), texte: 'Refusée : le document est illisible.', par: 'belivay' },
      ],
      motifRefus: 'Le RCCM envoyé est illisible : renvoyez une photo nette des deux pages.',
    },
    {
      id: 'dm-3',
      champ: 'autre',
      avant: null,
      valeur: 'Ajouter « Mode Femme » aux catégories vendues',
      motif: 'Je vends aussi des pagnes wax depuis octobre.',
      pieces: [],
      statut: 'en_attente',
      creeeLe: yaounde(2026, 9, 19, 17, 30),
      reponseAvant: yaounde(2026, 9, 23, 17, 30),
      historique: [{ a: yaounde(2026, 9, 19, 17, 30), texte: 'Demande envoyée', par: 'vous' }],
      motifRefus: null,
    },
  ] as DemandeModification[],
  vitrine: { photo: null, logo: null, description: 'Téléphones et accessoires neufs : ITEL, iPhone, chargeurs ; pagnes wax.' } as Vitrine,
  reponses: { 'a-00002': { a: yaounde(2026, 9, 18, 12, 5), texte: 'Merci, la boîte sera mieux protégée.', fil: 'f-support' } } as Record<string, { a: number; texte: string; fil: string }>,
})
const etat = magasin('boutique', initial)
if ((etat.lire() as { forme?: number }).forme !== 4) etat.reinitialiser()

const proprietaire = (quoi: string) => {
  if (!estProprietaire()) throw new ReserveAuProprietaire(quoi)
}

const fermeLe = (j: string, f: Fermeture[]) => f.some((x) => x.du <= j && j <= x.au)

/** Prochaine ouverture réelle après aujourd'hui : jour ouvert, hors fermeture programmée (Q-39). */
function prochaineOuvertureApres(jour: string): { jour: string; heure: string; a: number } {
  const e = etat.lire()
  let j = ajouterJours(jour, 1)
  for (let i = 0; i < 400; i++) {
    const h = e.horaires.find((x) => x.jour === jourSemaine(j))
    if (h?.ouvert && !fermeLe(j, e.fermetures) && !(e.pause && debutDuJour(j) < e.pause.jusqua)) {
      const [hh, mm] = h.de.split(':').map(Number)
      return { jour: j, heure: h.de, a: debutDuJour(j) + (hh * 60 + mm) * 60000 }
    }
    j = ajouterJours(j, 1)
  }
  return { jour: j, heure: '08:00', a: debutDuJour(j) + 8 * HEURE }
}

/** État du jour, lu par la session (pastille d'en-tête) et l'accueil. */
export function etatBoutique() {
  const e = etat.lire()
  const now = maintenant()
  const jour = jourDe(now)
  const h = e.horaires.find((x) => x.jour === jourSemaine(jour))
  const enPause = !!e.pause && e.pause.jusqua > now
  const fermeeAujourdhui = (e.fermeeJusqua !== null && e.fermeeJusqua > now) || enPause || fermeLe(jour, e.fermetures)
  // Pour le calendrier de préparation (src/calculs/ouverture.ts) : « Fermer aujourd'hui », la pause et les fermetures
  // programmées comptent comme des jours fermés.
  const fermeeLe = e.fermeeJusqua !== null && e.fermeeJusqua > now ? jour : null
  const fermetures = [...e.fermetures.map((f) => ({ du: f.du, au: f.au })), ...(enPause ? [{ du: jour, au: jourDe(e.pause!.jusqua - 1) }] : [])]
  return { fermeeAujourdhui, enPause, fermeA: h?.ouvert ? h.a : '18:00', horaires: e.horaires, fermeeLe, fermetures, fermeeJusqua: e.fermeeJusqua !== null && e.fermeeJusqua > now ? e.fermeeJusqua : null }
}

/** Prochaine ouverture après aujourd'hui (« jusqu'à demain 08 h ») : jour civil et heure. */
export function prochaineOuverture(): { jour: string; heure: string } {
  const { jour, heure } = prochaineOuvertureApres(jourDe(maintenant()))
  return { jour, heure }
}

const AVIS: Omit<Avis, 'reponse' | 'limiteReponse'>[] = [
  {
    id: 'a-00016',
    ref: 'BLV-00016',
    note: 5,
    commentaire: 'Chargeurs d’origine, bien emballés. Je recommande.',
    a: yaounde(2026, 9, 13, 10, 20),
    verifie: true,
    journal: [
      { etape: 'prete', texte: '3 h avant l’échéance' },
      { etape: 'ramassage', texte: 'Contrôlé et scellé à 14 h 18 · 2 photos' },
      { etape: 'tournee', texte: 'Retirée au relais le lendemain' },
    ],
  },
  {
    id: 'a-h031',
    ref: 'BLV-H031',
    note: 4,
    commentaire: 'Bon produit, retrait au comptoir rapide.',
    a: yaounde(2026, 8, 9, 9, 15),
    verifie: true,
    journal: [{ etape: 'tournee', texte: 'Payée et retirée au comptoir du relais' }],
  },
  {
    id: 'a-h018',
    ref: 'BLV-H018',
    note: 4,
    commentaire: null,
    a: yaounde(2026, 3, 25, 18, 40),
    verifie: true,
    journal: [{ etape: 'tournee', texte: 'Payée et retirée au comptoir du relais' }],
  },
  {
    id: 'a-h029',
    ref: 'BLV-H029',
    note: 3,
    commentaire: 'Le pagne est beau mais un peu plus court que prévu.',
    a: yaounde(2026, 7, 17, 12, 0),
    verifie: true,
    journal: [{ etape: 'tournee', texte: 'Payée et retirée au comptoir du relais' }],
  },
  {
    id: 'a-00002',
    ref: 'BLV-00002',
    note: 3,
    commentaire: 'Bon téléphone, mais la boîte était un peu abîmée.',
    a: yaounde(2026, 9, 16, 18, 5),
    verifie: true,
    journal: [
      { etape: 'prete', texte: '1 h 50 avant l’échéance' },
      { etape: 'ramassage', texte: 'Contrôlé et scellé à 14 h 32 · 2 photos' },
      { etape: 'tournee', texte: 'Retirée au relais le lendemain' },
    ],
  },
  {
    id: 'a-00001',
    ref: 'BLV-00001',
    note: 5,
    commentaire: null,
    a: yaounde(2026, 8, 31, 17, 30),
    verifie: true,
    journal: [
      { etape: 'prete', texte: '2 h 10 avant l’échéance' },
      { etape: 'ramassage', texte: 'Contrôlé et scellé à 14 h 05 · 2 photos' },
      { etape: 'tournee', texte: 'Retirée au relais le jour même' },
    ],
  },
]

function lireAvis(): ResumeAvis {
  const r = etat.lire().reponses
  const liste = AVIS.map((a) => ({ ...a, reponse: r[a.id] ?? null, limiteReponse: a.a + REPONSE_AVIS_JOURS * JOUR })).sort((x, y) => y.a - x.a)
  const n = liste.length
  return { note: n ? Math.round((liste.reduce((s, a) => s + a.note, 0) / n) * 10) / 10 : null, nombre: n, poidsPourCent: POIDS_SATISFACTION, liste }
}

const principal = (): Lieu => etat.lire().lieux.find((l) => l.principal)!
const vueLieux = (): Lieux => ({ lieux: [...etat.lire().lieux].sort((a, b) => Number(b.principal) - Number(a.principal)), max: LIEUX_MAX, centres: centresBelivay() })
const metresEntre = (a: Position, b: Position) => Math.round(Math.hypot((b.lat - a.lat) * 111_320, (b.lon - a.lon) * 111_320 * Math.cos((a.lat * Math.PI) / 180)))
const ordreOk = (h: Horaire[] | null) => !h || !h.some((x) => x.ouvert && hm(x.a) <= hm(x.de))
const nomChamp: Record<DemandeModification['champ'], () => string | null> = {
  nom: () => BOUTIQUE.nom,
  titulaire: () => `${BOUTIQUE.titulaire.prenom} ${BOUTIQUE.titulaire.nom}`,
  officiel: () => (BOUTIQUE.statut === 'particulier' ? 'Particulier · sans RCCM' : null),
  autre: () => null,
}

/** Déplace le point d'un lieu : au-delà de 200 m, l'agent de zone vérifie et l'ancien point sert jusque-là (Q-91). */
function deplacer(id: string, position: Position): { lieu: Lieu; nouvelleVerification: boolean; metres: number; a: number } | null {
  const l = etat.lire().lieux.find((x) => x.id === id)
  if (!l) return null
  const metres = metresEntre(l.position, position)
  const nouvelleVerification = metres > DEPLACEMENT_MAX_M
  const a = maintenant()
  etat.ecrire((e) => {
    const x = e.lieux.find((y) => y.id === id)!
    if (nouvelleVerification) {
      x.point.enAttente = { ...position, a }
      x.statut = 'a_verifier'
    } else {
      x.position = position
      x.point = { ...x.point, poseLe: jourDe(a), enAttente: null }
    }
  })
  return { lieu: etat.lire().lieux.find((x) => x.id === id)!, nouvelleVerification, metres, a }
}

function lire(): Boutique {
  const e = etat.lire()
  const p = principal()
  const now = maintenant()
  const pause = e.pause && e.pause.jusqua > now ? e.pause : null
  const jusqua = e.fermeeJusqua !== null && e.fermeeJusqua > now ? e.fermeeJusqua : null
  return {
    nom: BOUTIQUE.nom,
    titulaire: `${BOUTIQUE.titulaire.prenom} ${BOUTIQUE.titulaire.nom}`,
    identifiant: BOUTIQUE.identifiant,
    statut: BOUTIQUE.statut,
    creeLe: '2026-05-07',
    approuveLe: '2026-05-09',
    zone: p.zone ?? BOUTIQUE.zone,
    quartier: p.quartier ?? BOUTIQUE.quartier,
    repere: p.repere,
    position: p.position,
    point: p.point,
    horaires: e.horaires,
    passageLivreur: BOUTIQUE.passageLivreur,
    societeLivraison: LIVREUR.societe,
    fermeeAujourdhui: etatBoutique().fermeeAujourdhui,
    fermeeJusqua: jusqua,
    fermeeLe: jusqua ? e.fermeeLe : null,
    pause,
    fermetures: e.fermetures.filter((f) => f.au >= jourDe(now)).sort((a, b) => a.du.localeCompare(b.du)),
    vitrine: e.vitrine,
    apercuClient: { palier: BOUTIQUE.palier, trustScore: BOUTIQUE.trustScore },
  }
}

const hm = (s: string) => {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}

export const demoBoutique: DomaineBoutique = {
  boutique: () => repondre(lire()),
  async fermerAujourdhui(fermee) {
    exigerDroit('boutique.fermer', 'fermer aujourd’hui')
    const jour = jourDe(maintenant())
    // L'accès Préparation ferme, et ne rouvre que le jour même (Q-18, Q-39).
    if (!fermee && !estProprietaire() && etat.lire().fermeeLe !== jour) throw new ReserveAuProprietaire('rouvrir la boutique')
    etat.ecrire((e) => {
      e.fermeeLe = fermee ? jour : null
      e.fermeeJusqua = fermee ? prochaineOuvertureApres(jour).a : null
    })
    return lire()
  },
  async changerHoraires(horaires) {
    proprietaire('horaires')
    if (horaires.some((h) => h.ouvert && hm(h.a) <= hm(h.de))) return { ok: false, raison: 'ordre' }
    etat.ecrire((e) => {
      e.horaires = horaires.map((h) => ({ ...h }))
    })
    return { ok: true, boutique: lire() }
  },
  async mettreEnPause(jours) {
    proprietaire('pause')
    if (!Number.isInteger(jours) || jours < 1 || jours > PAUSE_MAX_JOURS) return { ok: false, raison: 'duree' }
    const now = maintenant()
    etat.ecrire((e) => {
      e.pause = { depuis: now, jusqua: debutDuJour(ajouterJours(jourDe(now), jours)) }
    })
    return { ok: true, boutique: lire() }
  },
  async reprendre() {
    proprietaire('pause')
    etat.ecrire((e) => {
      e.pause = null
    })
    return lire()
  },
  async programmerFermeture(du, au, motif) {
    proprietaire('fermetures')
    if (!/^\d{4}-\d\d-\d\d$/.test(du) || !/^\d{4}-\d\d-\d\d$/.test(au) || au < du) return { ok: false, raison: 'dates' }
    if (debutDuJour(du) - maintenant() < PREAVIS_H * HEURE) return { ok: false, raison: 'preavis_48h' }
    if (etat.lire().fermetures.some((f) => f.du <= au && du <= f.au)) return { ok: false, raison: 'chevauche' }
    etat.ecrire((e) => {
      e.fermetures.push({ id: 'f-' + maintenant().toString(36) + Math.random().toString(36).slice(2, 5), du, au, motif: motif.trim().slice(0, 80), annonceeLe: maintenant() })
    })
    return { ok: true, boutique: lire() }
  },
  async ecourterFermeture(id, au) {
    proprietaire('fermetures')
    const f = etat.lire().fermetures.find((x) => x.id === id)
    if (!f || au < f.du || au >= f.au) return { ok: false, raison: 'dates' }
    etat.ecrire((e) => {
      const x = e.fermetures.find((y) => y.id === id)
      if (x) x.au = au
    })
    return { ok: true, boutique: lire() }
  },
  async annulerFermeture(id) {
    proprietaire('fermetures')
    etat.ecrire((e) => {
      e.fermetures = e.fermetures.filter((f) => f.id !== id)
    })
    return lire()
  },
  async replacer(position) {
    proprietaire('emplacement')
    const r = deplacer(principal().id, position)!
    return { ok: true, boutique: lire(), nouvelleVerification: r.nouvelleVerification, metres: r.metres, a: r.a }
  },
  async changerRepere(repere) {
    proprietaire('emplacement')
    const r = repere.trim()
    if (!r) return { ok: false, raison: 'vide' }
    if (r.length > 120) return { ok: false, raison: 'long' }
    const id = principal().id
    etat.ecrire((e) => {
      e.lieux.find((l) => l.id === id)!.repere = r
    })
    return { ok: true, boutique: lire() }
  },
  lieux: () => repondre(vueLieux()),
  async ajouterLieu(n) {
    proprietaire('emplacements')
    if (etat.lire().lieux.length >= LIEUX_MAX) return { ok: false, raison: 'plein' }
    const nom = n.nom.trim()
    if (nom.length < 3 || nom.length > 60) return { ok: false, raison: 'nom' }
    if (n.repere.trim().length > 120) return { ok: false, raison: 'repere' }
    if (!ordreOk(n.horaires)) return { ok: false, raison: 'ordre' }
    const centre = n.centre ? centresBelivay().find((c) => c.id === n.centre) ?? null : null
    if (!centre && (n.precision > 100 || !Number.isFinite(n.position.lat))) return { ok: false, raison: 'position' }
    const position = centre ? centre.position : n.position
    const z = centre ? { code: centre.zone, quartiers: centre.quartier } : zoneDe(position)
    if (!z) return { ok: false, raison: 'hors_zone' }
    const a = maintenant()
    const lieu: Lieu = {
      id: 'l-' + a.toString(36) + Math.random().toString(36).slice(2, 5),
      nom,
      type: centre ? 'collecte' : n.type,
      principal: false,
      position,
      zone: z.code,
      quartier: z.quartiers,
      adresse: n.adresse.trim() || (centre ? centre.nom : ''),
      repere: n.repere.trim(),
      horaires: n.horaires,
      // Un centre BelivaY est connu : vérifié d'office ; un point posé au GPS attend l'agent de zone.
      statut: centre ? 'verifie' : 'a_verifier',
      point: { poseLe: jourDe(a), verifieLe: centre ? jourDe(a) : null, enAttente: null },
      centre: centre?.id ?? null,
    }
    etat.ecrire((e) => {
      e.lieux.push(lieu)
    })
    return { ok: true, lieu }
  },
  async modifierLieu(id, champs) {
    proprietaire('emplacements')
    if (!etat.lire().lieux.some((l) => l.id === id)) return { ok: false, raison: 'introuvable' }
    if (champs.nom !== undefined && (champs.nom.trim().length < 3 || champs.nom.trim().length > 60)) return { ok: false, raison: 'nom' }
    if (champs.repere !== undefined && champs.repere.trim().length > 120) return { ok: false, raison: 'repere' }
    if (champs.horaires !== undefined && !ordreOk(champs.horaires)) return { ok: false, raison: 'ordre' }
    etat.ecrire((e) => {
      const l = e.lieux.find((x) => x.id === id)!
      if (champs.nom !== undefined) l.nom = champs.nom.trim()
      if (champs.adresse !== undefined) l.adresse = champs.adresse.trim()
      if (champs.repere !== undefined) l.repere = champs.repere.trim()
      if (champs.horaires !== undefined) l.horaires = champs.horaires
    })
    return { ok: true, lieu: etat.lire().lieux.find((x) => x.id === id)! }
  },
  async replacerLieu(id, position) {
    proprietaire('emplacements')
    const r = deplacer(id, position)
    return r ? { ok: true, lieu: r.lieu, nouvelleVerification: r.nouvelleVerification, metres: r.metres } : { ok: false, raison: 'introuvable' }
  },
  async demanderCodePrincipal() {
    proprietaire('emplacements')
    return { masque: masquer(MEMBRES.find((m) => m.role === 'proprietaire')!.telephone) }
  },
  async rendrePrincipal(id, code) {
    proprietaire('emplacements')
    const l = etat.lire().lieux.find((x) => x.id === id)
    if (!l) return { ok: false, raison: 'introuvable' }
    // Le point d'origine du ramassage doit être vérifié : jamais un point que personne n'a vu (BelivaY ne perd jamais).
    if (l.statut !== 'verifie' || l.point.enAttente) return { ok: false, raison: 'a_verifier' }
    if (code !== CODE_DEMO) return { ok: false, raison: 'code' }
    etat.ecrire((e) => {
      for (const x of e.lieux) x.principal = x.id === id
    })
    return { ok: true, lieux: vueLieux() }
  },
  async retirerLieu(id) {
    proprietaire('emplacements')
    const l = etat.lire().lieux.find((x) => x.id === id)
    if (!l) return { ok: false, raison: 'introuvable' }
    if (l.principal) return { ok: false, raison: 'principal' }
    etat.ecrire((e) => {
      e.lieux = e.lieux.filter((x) => x.id !== id)
    })
    return { ok: true, lieux: vueLieux() }
  },
  async demandes() {
    proprietaire('demandes')
    return [...etat.lire().demandes].sort((a, b) => b.creeeLe - a.creeeLe)
  },
  async demanderCodeModification() {
    proprietaire('demandes')
    return { masque: masquer(MEMBRES.find((m) => m.role === 'proprietaire')!.telephone) }
  },
  async demanderModification(d, code) {
    proprietaire('demandes')
    const valeur = d.champ === 'officiel' ? `RCCM ${(d.rccm ?? '').trim().toUpperCase()} · NIU ${(d.niu ?? '').trim().toUpperCase()}` : d.valeur.trim()
    if (d.champ === 'officiel') {
      if (!FORME_RCCM.test((d.rccm ?? '').trim())) return { ok: false, raison: 'rccm' }
      if (!FORME_NIU.test((d.niu ?? '').trim())) return { ok: false, raison: 'niu' }
    } else if (d.champ !== 'autre' && valeur.length < 3) return { ok: false, raison: 'valeur' }
    if (d.motif.trim().length < 10) return { ok: false, raison: 'motif' }
    // Pièces : extrait RCCM et attestation NIU, ou pièce d'identité du nouveau titulaire ; le nom n'en demande pas.
    if ((d.champ === 'officiel' || d.champ === 'titulaire') && d.pieces.length === 0) return { ok: false, raison: 'pieces' }
    if (etat.lire().demandes.some((x) => x.champ === d.champ && x.statut === 'en_attente')) return { ok: false, raison: 'deja' }
    if (code !== CODE_DEMO) return { ok: false, raison: 'code' }
    const a = maintenant()
    const demande: DemandeModification = {
      id: 'dm-' + a.toString(36),
      champ: d.champ,
      avant: nomChamp[d.champ](),
      valeur,
      motif: d.motif.trim(),
      pieces: d.pieces.slice(0, 5),
      statut: 'en_attente',
      creeeLe: a,
      reponseAvant: a + REPONSE_DEMANDE_H * HEURE,
      historique: [{ a, texte: 'Demande envoyée', par: 'vous' }],
      motifRefus: null,
    }
    etat.ecrire((e) => {
      e.demandes.push(demande)
    })
    // La console BelivaY (administration) la reçoit ; une trace part aussi dans la conversation « Support BelivaY ».
    await demoMessages.ecrireAuSupport(`Demande de modification · ${d.champ} : ${valeur} — ${d.motif.trim()}`, null)
    return { ok: true, demande }
  },
  async annulerDemande(id) {
    proprietaire('demandes')
    const d = etat.lire().demandes.find((x) => x.id === id)
    if (!d) return { ok: false, raison: 'introuvable' }
    if (d.statut !== 'en_attente') return { ok: false, raison: 'etat' }
    etat.ecrire((e) => {
      const x = e.demandes.find((y) => y.id === id)!
      x.statut = 'annulee'
      x.historique.push({ a: maintenant(), texte: 'Demande annulée', par: 'vous' })
    })
    return { ok: true, demande: etat.lire().demandes.find((x) => x.id === id)! }
  },
  async modifierVitrine(champs) {
    proprietaire('vitrine')
    if (champs.description !== undefined && champs.description.length > 300) return { ok: false, raison: 'long' }
    etat.ecrire((e) => {
      e.vitrine = { ...e.vitrine, ...champs, description: (champs.description ?? e.vitrine.description).trim() }
    })
    return { ok: true, boutique: lire() }
  },
  avis: () => repondre(lireAvis()),
  async repondreAvis(id, texte) {
    proprietaire('avis')
    const a = lireAvis().liste.find((x) => x.id === id)
    const t = texte.trim()
    if (!a) return { ok: false, raison: 'delai_depasse' }
    if (a.reponse) return { ok: false, raison: 'deja_repondu' }
    if (maintenant() > a.limiteReponse) return { ok: false, raison: 'delai_depasse' }
    if (t.length < 10) return { ok: false, raison: 'trop_court' }
    if (filtrer(t).filtre) return { ok: false, raison: 'coordonnees' }
    const { fil } = await demoMessages.ecrireAuSupport(`Réponse privée à l’avis, à transmettre sans le nom de ma boutique : « ${t} »`, a.ref)
    etat.ecrire((e) => {
      e.reponses[id] = { a: maintenant(), texte: t, fil }
    })
    return { ok: true, fil }
  },
}
